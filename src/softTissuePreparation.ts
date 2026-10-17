import * as THREE from "three";
import type { AnatomyParts, SoftTissueReport } from './softTissues';
import { packParts, unpackParts, transferBuffers, type PartData } from './softTissueTransfer';
import { disposeObject, viewerDiagnostics } from './viewerResources';
import { byId, colors } from './data';

/** The existing fitting algorithm runs unchanged, against copies in a disposable worker. */
export async function prepareSoftTissues(region: string, parts: AnatomyParts, signal: AbortSignal,
  fallback: () => SoftTissueReport): Promise<SoftTissueReport> {
  signal.throwIfAborted();
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  try {
    worker = new Worker(new URL('./softTissue.worker.ts', import.meta.url), { type: 'module' });
    viewerDiagnostics.activeWorkers++;
    const input = packParts(parts, true);
    const result = await new Promise<{ report: SoftTissueReport; parts: PartData[]; normals: { id: string; arrays: THREE.TypedArray[] }[] }>((resolve, reject) => {
      cancel = () => reject(signal.reason);
      signal.addEventListener('abort', cancel, { once: true });
      timer = setTimeout(() => reject(new Error('Fitting worker timed out')), 60000);
      worker!.onerror = error => reject(new Error(error.message));
      worker!.onmessage = event => event.data.error ? reject(new Error(event.data.error)) : resolve(event.data);
      worker!.postMessage({ region, parts: input }, transferBuffers(input));
    });
    signal.throwIfAborted();
    const fitted = unpackParts(result.parts, id => ({ color: colors[byId[id].tissue], cartilage: byId[id].tissue === 'cartilage' }));
    for (const [id, next] of fitted) {
      const part = parts.get(id)!;
      for (const mesh of part.meshes) { mesh.removeFromParent(); disposeObject(mesh); }
      part.meshes.splice(0, part.meshes.length, ...next.meshes);
      part.group.add(...next.meshes); part.anchor.copy(next.anchor);
    }
    for (const record of result.normals) record.arrays.forEach((array, index) => {
      parts.get(record.id)!.meshes[index].geometry.setAttribute('normal', new THREE.BufferAttribute(array, 3));
    });
    return result.report;
  } catch (error) {
    signal.throwIfAborted();
    console.warn('Fitting worker unavailable; using the existing synchronous preparation.', error);
    return fallback();
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', cancel);
    if (worker) { worker.terminate(); viewerDiagnostics.activeWorkers--; }
  }
}
