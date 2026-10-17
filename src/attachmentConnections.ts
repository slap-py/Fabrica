import * as THREE from 'three';
import type { MeshBVH } from 'three-mesh-bvh';
import type { Connection } from './connections';
import type { AnatomyParts } from './softTissues';

// Allow only small export/seam offsets, not visible gaps between structures.
// These tolerances describe rendered geometry, not anatomical measurements.
const contactToleranceMm = 0.5;
const duplicateToleranceMm = 2;

function meshesFor(parts: AnatomyParts, id: string) {
  const part = parts.get(id);
  return part?.group.userData.unavailable ? [] :
    (part?.meshes ?? []).filter(mesh => !mesh.userData.fiber && mesh.geometry.boundsTree);
}

function hasModeledContact(parts: AnatomyParts, connection: Connection) {
  const { record, footprint } = connection;
  if (record.structureId === footprint.structureId || footprint.meshIndex < 0 || footprint.faceIndex < 0) return false;
  const owner = meshesFor(parts, record.structureId), host = meshesFor(parts, footprint.structureId);
  if (!owner.length || !host.length) return false;
  // These meshes are generated from this record's resolved endpoints and guides.
  // A generic associated tendon/material fragment is not an authored route.
  if (owner.some(mesh => mesh.userData.attachmentId === record.id)) return true;
  return [footprint.centerMm, ...footprint.boundaryMm].some(p => owner.some(mesh => {
    const hit = (mesh.geometry.boundsTree as MeshBVH).closestPointToPoint(new THREE.Vector3(...p), undefined, 0, contactToleranceMm);
    return !!hit && hit.distance <= contactToleranceMm;
  }));
}

const contactCache = new WeakMap<AnatomyParts, Map<string, { signature: unknown[]; accepted: boolean }>>();
function modeledContact(parts: AnatomyParts, connection: Connection) {
  let cache = contactCache.get(parts);
  if (!cache) { cache = new Map(); contactCache.set(parts, cache); }
  const { record, footprint } = connection;
  const signature: unknown[] = [record.structureId, footprint.structureId, footprint.meshIndex, footprint.faceIndex,
    footprint.centerMm.join(','), footprint.boundaryMm.map(p => p.join(',')).join(';')];
  for (const id of [record.structureId, footprint.structureId])
    for (const mesh of meshesFor(parts, id)) signature.push(mesh, mesh.geometry, mesh.geometry.boundsTree, mesh.userData.attachmentId);
  const previous = cache.get(connection.key);
  if (previous && previous.signature.length === signature.length && previous.signature.every((value, i) => value === signature[i]))
    return previous.accepted;
  const accepted = hasModeledContact(parts, connection);
  cache.set(connection.key, { signature, accepted });
  return accepted;
}

/** Use loaded geometry regardless of layer visibility. Collapse repeated cards
 * at the same site while keeping separate origins, insertions and footprints. */
export function refineAttachmentConnections(parts: AnatomyParts, candidates: readonly Connection[]): Connection[] {
  const accepted: Connection[] = [];
  const role = (c: Connection) => ['origin', 'insertion'].includes(c.record.component) ? c.record.component : c.record[c.end].kind;
  for (const connection of candidates) {
    if (!modeledContact(parts, connection)) continue;
    const duplicate = accepted.some(other => other.record.structureId === connection.record.structureId &&
      other.footprint.structureId === connection.footprint.structureId && role(other) === role(connection) &&
      new THREE.Vector3(...other.footprint.centerMm).distanceTo(new THREE.Vector3(...connection.footprint.centerMm)) <= duplicateToleranceMm &&
      new THREE.Vector3(...other.footprint.normal).dot(new THREE.Vector3(...connection.footprint.normal)) > 0.5);
    if (!duplicate) accepted.push(connection);
  }
  return accepted;
}
