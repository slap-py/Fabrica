import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import arm from '../src/regions/arm-back/rightArm';
import back from '../src/regions/arm-back/back';
import { combineRegionPacks } from '../src/regions/combine';
import { toggleRegion, normalizeRegionSelection } from '../src/regions/selection';
import { selectionAliases, restoreViewerSession, resolveStructureId, type ViewerSession } from '../src/viewerSession';
import { disposeObject } from '../src/viewerResources';
import inventory from '../src/regions/arm-back/inventory.json';
import manifest from '../src/regions/arm-back/manifest.json';

const shared='scapula-r';
const combined=combineRegionPacks([arm,back]);
async function scene(url:string) { const bytes=fs.readFileSync('public/'+url.replace(/^\//,'')); return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '')).scene; }
describe('right arm and bilateral back',()=>{
 it('resolves one anatomical identity with independent laterality and membership',()=>{
  expect(arm.byId[shared].laterality).toBe('right');
  expect(back.byId[shared]).toEqual(arm.byId[shared]);
  expect(back.byId['scapula-l'].laterality).toBe('left');
  expect(back.byId['iliocostalis-colli-muscle'].laterality).toBe('left');
  expect(arm.byId['scapula-l']).toBeUndefined();
  expect(combined.byId['z-anatomy:'+shared]).toBeDefined();
  expect(combined.structureAliases?.['right-arm:'+shared]).toBe(combined.structureAliases?.['back:'+shared]);
  expect(combined.atlasIds('back').has('z-anatomy:'+shared)).toBe(true);
  expect(combined.atlasIds('right-arm').has('z-anatomy:'+shared)).toBe(true);
  expect(combined.structures.length).toBe(manifest.structures.length);
 });
 it('records the source spinal cord without adding any selectable part or layer',()=>{
  expect(back.dataOnlyStructures?.[0].id).toBe('spinal-cord');
  expect(back.dataOnlyStructures?.[0].visualizationAvailable).toBe(false);
  expect(back.dataOnlyStructures?.[0].sourceObjects.length).toBe(3);
  expect(back.byId['spinal-cord']).toBeUndefined();
  expect(combined.dataOnlyStructures).toHaveLength(1);
  const model=combined.createAnkle();expect(model.parts.has('spinal-cord')).toBe(false);disposeObject(model.root);
 });
 it('reserves the left arm replacement rule while preserving Back and existing region order',()=>{
  expect(toggleRegion(['right-arm','back'],'left-arm')).toEqual(['back','left-arm']);
  expect(toggleRegion(['back','left-arm'],'right-arm')).toEqual(['back','right-arm']);
  expect(toggleRegion(['back'],'back')).toEqual([]);
  expect(normalizeRegionSelection(['back','right-arm','left-arm'])).toEqual(['back','left-arm']);
 });
 it('transfers shared selection between single and combined scenes',()=>{
  const session:ViewerSession={regionIds:['right-arm'],selectedAliases:selectionAliases(arm,shared),layers:['bone'],atlasTypes:['bone'],atlasRegion:'all',search:'scapula',onlyVisible:false,opacity:1,skinOpacity:1,neurovascularOpacity:1,labels:true,highlightConnections:false,view:'overview',overview:true};
  expect(restoreViewerSession(combined,session)?.selected).toBe('z-anatomy:'+shared);
  expect(restoreViewerSession(back,session)?.selected).toBe(shared);
  expect(resolveStructureId(back,'z-anatomy:'+shared)).toBe(shared);
 });
 it('accounts for every inventory entry as exported or an explicit empty source part',()=>{
  const ids=new Set([...manifest.structures,...manifest.emptySourceParts].map(r=>r.id));
  expect(ids.size).toBe(inventory.structures.length);
  expect(inventory.structures.every(r=>ids.has(r.id))).toBe(true);
  const disk=JSON.parse(fs.readFileSync('public/models/arm-back/manifest.json','utf8'));
  expect(disk.failedImports).toEqual([]);
  expect(disk.structures.map((r:{id:string})=>r.id)).toEqual(manifest.structures.map(r=>r.id));
  for(const asset of disk.exports) expect(createHash('sha256').update(fs.readFileSync(`public/models/arm-back/${asset.group}.glb`)).digest('hex')).toBe(asset.sha256);
  expect(inventory.gaps.every(g=>g.status==='missing-source')).toBe(true);
 });
 it('withholds incompatible proximity hosts instead of presenting them as anatomy facts',()=>{
  const latissimus=manifest.structures.find(r=>r.id==='latissimus-dorsi-muscle-r')!;
  expect(latissimus.sourceAttachments.some(p=>p.end==='to' && p.hostId==='scapula-r')).toBe(false);
  expect(latissimus.unverifiedAttachmentPatches.some(p=>p.end==='to' && p.hostId==='scapula-r')).toBe(true);
  expect(arm.byId[latissimus.id].insertion).toBeUndefined();
  expect(manifest.structures.find(r=>r.id==='long-head-of-biceps-brachii-r')!.sourceAttachments.some(p=>p.hostId==='scapula-r')).toBe(true);
 });
 it('loads real aligned assets, renders shared meshes once and keeps missing assets unavailable',async()=>{
  const model=combined.createAnkle();
  try {
   const bones=await combined.loaders.loadBoneAssets(model.parts,undefined,scene);
   const muscles=await combined.loaders.loadMuscleAssets(model.parts,undefined,scene);
   const neuro=await combined.loaders.loadNeurovascularAssets(model.parts,undefined,scene);
   expect([...bones.fallback,...muscles.fallback,...neuro.fallback]).toEqual([]);
   const part=model.parts.get('z-anatomy:'+shared)!;
   expect(part.meshes).toHaveLength(1);
   expect(part.meshes[0].userData.id).toBe('z-anatomy:'+shared);
   const visible:THREE.Mesh[]=[];model.root.traverseVisible(o=>{if(o instanceof THREE.Mesh && o.userData.id==='z-anatomy:'+shared)visible.push(o);});
   expect(visible).toHaveLength(1);
   const connections=combined.connectionsFor(model.parts,'z-anatomy:'+shared);
   const keys=connections.map(c=>c.record.structureId+':'+c.record.id.split(':').slice(1).join(':')+':'+c.end);
   expect(new Set(keys).size).toBe(keys.length);
   for(const r of manifest.structures){const part=model.parts.get(r.canonicalId)!;expect(part.meshes.length,r.id).toBeGreaterThan(0);const bounds=new THREE.Box3();part.meshes.forEach(m=>bounds.union(m.geometry.boundingBox!));for(let axis=0;axis<3;axis++){expect(bounds.min.getComponent(axis)).toBeCloseTo(r.boundsMm[0][axis],2);expect(bounds.max.getComponent(axis)).toBeCloseTo(r.boundsMm[1][axis],2);}}
  }finally{disposeObject(model.root);}
  const single=arm.createAnkle();try{const result=await arm.loaders.loadBoneAssets(single.parts,undefined,async()=>{throw new Error('offline');});expect(result.fallback.length).toBeGreaterThan(0);expect(single.parts.get(shared)?.group.userData.unavailable).toBe(true);expect(single.parts.get(shared)?.group.visible).toBe(false);}finally{disposeObject(single.root);}
 },30000);
});
