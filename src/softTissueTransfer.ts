import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { AnatomyParts } from './softTissues';
import { enableMeshPicking } from './picking';

type AttributeData = { array: THREE.TypedArray; itemSize: number; normalized: boolean };
export interface MeshData {
  attributes: Record<string, AttributeData>; index?: Uint16Array | Uint32Array;
  userData: Record<string, unknown>; geometryData: Record<string, unknown>;
  bvh?: ReturnType<typeof MeshBVH.serialize>;
}
export interface PartData { id: string; anchor: number[]; meshes: MeshData[]; }

/** Copies input arrays before transfer: aborting a worker cannot detach live anatomy. */
export function packParts(parts: AnatomyParts, copy: boolean): PartData[] {
  return [...parts].map(([id, part]) => ({ id, anchor: part.anchor.toArray(), meshes: part.meshes.map(mesh => {
    const attributes: Record<string, AttributeData> = {};
    for (const [name, attribute] of Object.entries(mesh.geometry.attributes)) {
      if (attribute instanceof THREE.InterleavedBufferAttribute) throw new Error('Interleaved fitting geometry');
      attributes[name] = { array: copy ? attribute.array.slice() : attribute.array, itemSize: attribute.itemSize, normalized: attribute.normalized };
    }
    const index = mesh.geometry.index?.array as Uint16Array | Uint32Array | undefined;
    return { attributes, index: copy ? index?.slice() : index,
      // Source material references are viewer resources, not fitting inputs.
      userData: copy ? { id, atlasId: id, source: mesh.userData.source, fiber: mesh.userData.fiber } : mesh.userData,
      geometryData: mesh.geometry.userData,
      bvh: !copy && mesh.geometry.boundsTree ? MeshBVH.serialize(mesh.geometry.boundsTree as MeshBVH, { cloneBuffers: false }) : undefined };
  }) }));
}
export function transferBuffers(data: PartData[]): ArrayBuffer[] {
  const result = new Set<ArrayBuffer>();
  for (const part of data) for (const mesh of part.meshes) {
    for (const attribute of Object.values(mesh.attributes)) result.add(attribute.array.buffer as ArrayBuffer);
    if (mesh.index) result.add(mesh.index.buffer as ArrayBuffer);
    for (const root of mesh.bvh?.roots ?? []) result.add(root);
    if (mesh.bvh?.indirectBuffer) result.add(mesh.bvh.indirectBuffer.buffer as ArrayBuffer);
  }
  return [...result];
}
export function unpackParts(data: PartData[], tissueFor: (id: string) => { color: string; cartilage: boolean }): AnatomyParts {
  const parts: AnatomyParts = new Map();
  for (const record of data) {
    const group = new THREE.Group(), meshes: THREE.Mesh[] = [];
    for (const source of record.meshes) {
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(source.attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize, attribute.normalized));
      if (source.index) geometry.setIndex(new THREE.BufferAttribute(source.index, 1));
      geometry.userData = source.geometryData; geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const tissue = tissueFor(record.id);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: tissue.color, roughness: tissue.cartilage ? .36 : .68, side: THREE.DoubleSide }));
      mesh.name = record.id; mesh.userData = source.userData; mesh.castShadow = mesh.receiveShadow = true;
      if (source.bvh) geometry.boundsTree = MeshBVH.deserialize(source.bvh, geometry, { setIndex: false });
      enableMeshPicking(mesh); meshes.push(mesh); group.add(mesh);
    }
    parts.set(record.id, { id: record.id, group, meshes, anchor: new THREE.Vector3(...record.anchor) });
  }
  return parts;
}
