import { rebuildSoftTissues } from './softTissues';
import { rebuildSoftTissues as rebuildLeft } from './regions/left-lower-leg';
import { byId, colors } from './data';
import { packParts, unpackParts, transferBuffers, type PartData } from './softTissueTransfer';
import { disposeObject } from './viewerResources';
self.onmessage = (event: MessageEvent<{ region: string; parts: PartData[] }>) => {
  const parts = unpackParts(event.data.parts, id => ({ color: colors[byId[id].tissue], cartilage: byId[id].tissue === 'cartilage' }));
  const before = new Map([...parts].map(([id, part]) => [id, part.meshes[0]]));
  try {
    const report = event.data.region === 'left-lower-leg' ? rebuildLeft(parts) : rebuildSoftTissues(parts);
    const changed = new Map([...parts].filter(([id, part]) => part.meshes[0] !== before.get(id)));
    const output = packParts(changed, false);
    // The legacy left fitter also recomputes source normals during its two
    // reflections. Return those normals without replacing live skin materials.
    const normals = event.data.region === 'left-lower-leg' ? [...parts].filter(([id]) => !changed.has(id)).map(([id, part]) => ({ id, arrays: part.meshes.map(mesh => mesh.geometry.getAttribute('normal').array) })) : [];
    self.postMessage({ report, parts: output, normals }, { transfer: [...transferBuffers(output), ...normals.flatMap(part => part.arrays.map(array => array.buffer as ArrayBuffer))] });
  } catch (error) { self.postMessage({ error: String(error) }); }
  finally { for (const part of parts.values()) disposeObject(part.group); }
};
