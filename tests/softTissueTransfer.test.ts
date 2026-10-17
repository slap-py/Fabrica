import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createAnkle } from '../src/ankle';
import { byId, colors } from '../src/data';
import { rebuildSoftTissues } from '../src/softTissues';
import { packParts, unpackParts } from '../src/softTissueTransfer';
import { disposeObject } from '../src/viewerResources';
const tissue = (id: string) => ({color:colors[byId[id].tissue],cartilage:byId[id].tissue==='cartilage'});
it('preserves every fitted vertex, normal, index, footprint and BVH hit across worker transfer', () => {
 const original = createAnkle(), copied = unpackParts(packParts(original.parts,true),tissue);
 try {
  expect(rebuildSoftTissues(copied)).toEqual(rebuildSoftTissues(original.parts));
  const restored = unpackParts(packParts(copied,false),tissue);
  try {
   for(const [id,part] of original.parts) {
    const other = restored.get(id)!; expect(other.meshes.length,id).toBe(part.meshes.length);
    for(let i=0;i<part.meshes.length;i++) {
     const a=part.meshes[i],b=other.meshes[i];
     for(const name of ['position','normal']) expect(b.geometry.getAttribute(name)?.array,id+':'+name).toEqual(a.geometry.getAttribute(name)?.array);
     expect(b.geometry.index?.array,id).toEqual(a.geometry.index?.array);
     expect(b.geometry.userData,id).toEqual(a.geometry.userData);
     if(a.userData.source==='registered-surface-fit') expect(b.userData,id).toEqual(a.userData);
     expect(b.geometry.boundsTree).toBeDefined();
    }
   }
  } finally { for(const part of restored.values())disposeObject(part.group); }
 } finally { disposeObject(original.root);for(const part of copied.values())disposeObject(part.group); }
},30000);
