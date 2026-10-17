import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { refineAttachmentConnections } from '../src/attachmentConnections';
import type { Connection } from '../src/connections';
import type { AnatomyParts } from '../src/softTissues';
import type { AttachmentRecord } from '../src/attachments';

function part(parts: AnatomyParts, id: string, geometry: THREE.BufferGeometry) {
  geometry.boundsTree = new MeshBVH(geometry, { indirect: true });
  const mesh = new THREE.Mesh(geometry), group = new THREE.Group();
  group.add(mesh); parts.set(id, { id, group, meshes: [mesh], anchor: new THREE.Vector3() });
  return mesh;
}
function box(x: number, width = 2) {
  return new THREE.BoxGeometry(width, 2, 2).translate(x, 0, 0);
}
function candidate(id = 'site', x = 0, component = 'origin'): Connection {
  const endpoint = { structureId: 'bone', landmark: 'Host surface', seedMm: [x, 0, 0], radiusMm: 1, kind: 'surface' };
  const junction = { ...endpoint, structureId: 'muscle', kind: 'junction' };
  const record = { id, structureId: 'muscle', component, from: endpoint, to: junction } as unknown as AttachmentRecord;
  return { key: id + ':from', record, end: 'from', footprint: { structureId: 'bone', landmark: 'Host surface', centerMm: [x, 0, 0], normal: [1, 0, 0], radiusMm: 1, boundaryMm: [], meshIndex: 0, faceIndex: 0 } };
}
function fixture(muscleX: number) {
  const parts: AnatomyParts = new Map(); part(parts, 'bone', box(-1)); part(parts, 'muscle', box(muscleX)); return parts;
}
function dispose(parts: AnatomyParts) {
  for (const p of parts.values()) for (const m of p.meshes) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); }
}

describe('modeled attachment eligibility', () => {
  it('keeps direct contact even when layers are hidden, and rejects gaps and missing geometry', () => {
    const parts = fixture(1);
    try {
      parts.get('muscle')!.group.visible = false;
      expect(refineAttachmentConnections(parts, [candidate()])).toHaveLength(1);
      parts.get('muscle')!.meshes[0].geometry.translate(10, 0, 0);
      parts.get('muscle')!.meshes[0].geometry.boundsTree = new MeshBVH(parts.get('muscle')!.meshes[0].geometry, { indirect: true });
      expect(refineAttachmentConnections(parts, [candidate()])).toEqual([]);
      parts.get('muscle')!.group.userData.unavailable = true;
      expect(refineAttachmentConnections(parts, [candidate()])).toEqual([]);
    } finally { dispose(parts); }
  });
  it('withholds indirect source markers even when associated tendon material is nearby', () => {
    const parts = fixture(10); part(parts, 'muscle-tendon', box(5, 10));
    try { expect(refineAttachmentConnections(parts, [candidate()])).toEqual([]); }
    finally { dispose(parts); }
  });
  it('rejects disconnected proximal/distal tendon pieces and unrelated tendons', () => {
    const parts = fixture(10);
    const a = box(1).toNonIndexed(), b = box(9).toNonIndexed();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([...a.getAttribute('position').array, ...b.getAttribute('position').array], 3));
    a.dispose(); b.dispose(); part(parts, 'muscle-tendon', geometry);
    part(parts, 'other-tendon', box(5, 10));
    try { expect(refineAttachmentConnections(parts, [candidate()])).toEqual([]); }
    finally { dispose(parts); }
  });
  it('retains authored modeled paths, removes repeat sites and preserves distinct sites and roles', () => {
    const parts = fixture(10); parts.get('muscle')!.meshes[0].userData.attachmentId = 'a';
    const a = candidate('a'), duplicate = candidate('a', 0.2), distinct = candidate('a', 8), insertion = candidate('a', 0, 'insertion');
    try {
      expect(refineAttachmentConnections(parts, [a, duplicate, distinct, insertion]).map(c => [c.footprint.centerMm[0], c.record.component]))
        .toEqual([[0, 'origin'], [8, 'origin'], [0, 'insertion']]);
      expect(refineAttachmentConnections(parts, [{ ...a, footprint: { ...a.footprint, meshIndex: -1 } }])).toEqual([]);
    } finally { dispose(parts); }
  });
});
