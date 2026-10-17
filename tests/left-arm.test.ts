import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import left from '../src/regions/arm-back/leftArm';
import right from '../src/regions/arm-back/rightArm';
import back from '../src/regions/arm-back/back';
import manifest from '../src/regions/arm-back/left-manifest.json';
import inventory from '../src/regions/arm-back/left-inventory.json';
import anatomy from '../src/regions/arm-back/anatomyManifest';
import original from '../src/regions/arm-back/manifest.json';
import {attachmentAudit,acceptedAttachmentPatches} from '../src/regions/arm-back/attachmentAudit';
import {combineRegionPacks} from '../src/regions/combine';
import {combinedTitleForIds} from '../src/regions/combinedTitle';
import {parseRoute,regionsHref} from '../src/router';
import {regionCatalog} from '../src/regions/catalog';
import {selectionAliases,resolveStructureId} from '../src/viewerSession';
import {disposeObject} from '../src/viewerResources';
const toLeft=(id:string)=>id.replace(/-r(?=$|-)/g,'-l');
const combined=combineRegionPacks([left,back,right]);
async function scene(url:string){const bytes=fs.readFileSync('public/'+url.replace(/^\//,''));return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;}

describe('native left arm and simultaneous upper-body regions',()=>{
 it('matches every right-arm structure and all educational fields, citations and notes',()=>{
  expect(left.structureCounts).toEqual(right.structureCounts);
  for(const source of right.structures){
   const target=left.byId[toLeft(source.id)];expect(target,source.id).toBeDefined();
   expect(target.laterality).toBe('left');expect(target.name).toBe(source.name.replace(/^Right /,'Left '));
   const {id,canonicalId,laterality,regionMembership,sourceObject,name,...information}=source;
   const {id:li,canonicalId:lc,laterality:ls,regionMembership:lr,sourceObject:lo,name:ln,...leftInformation}=target;
   expect(leftInformation,source.id).toEqual(information);
   expect([...left.relatedIds(target.id)].sort(),source.id).toEqual([...right.relatedIds(source.id)].map(toLeft).sort());
  }
  expect(left.byId['articular-disc-of-distal-radio-ulnar-joint-l'].educationalTissue).toBe('cartilage');
  expect(left.byId['humerus-l'].articulations).toEqual(right.byId['humerus-r'].articulations);
 });
 it('uses native left assets and preserves the original geometry and source patch audit',()=>{
  const ids=new Set([...manifest.structures,...manifest.emptySourceParts].map(r=>r.id));
  expect(ids.size).toBe(inventory.structures.length);
  expect(inventory.structures.every(r=>ids.has(r.id))).toBe(true);
  const disk=JSON.parse(fs.readFileSync('public/models/left-arm/manifest.json','utf8'));
  expect(disk.failedImports).toEqual([]);
  for(const asset of disk.exports)expect(createHash('sha256').update(fs.readFileSync(`public/models/left-arm/${asset.group}.glb`)).digest('hex')).toBe(asset.sha256);
  for(const r of original.structures){
   expect(anatomy.structures.find(n=>n.id===r.id)?.sourceAttachments).toEqual(r.sourceAttachments);
  }
  const oldIds=new Set(original.structures.map(r=>r.id));
  const originalAudit=attachmentAudit.filter(p=>oldIds.has(p.structureId));
  expect(originalAudit).toHaveLength(179);
  expect(originalAudit.filter(p=>p.status==='accepted')).toHaveLength(38);
  expect(acceptedAttachmentPatches.every(p=>p.anatomicalHostSupported)).toBe(true);
 });
 it('exposes left and both-arm combinations in routes, titles and catalog',async()=>{
  expect(await regionCatalog.find(r=>r.id==='left-arm')!.load()).toBe(left);
  const ids=['left-arm','back','right-arm'];
  expect(parseRoute(regionsHref(ids),regionCatalog.map(r=>r.id))).toEqual({kind:'regions',regionIds:[...ids].sort(),select:null});
  expect(combined.title).toBe('Both Arms & Back');
  expect(combinedTitleForIds(['left-arm','back'])).toBe('Left Arm & Back');
  expect(combinedTitleForIds(['left-arm','right-arm'])).toBe('Both Arms');
  for(const side of ['l','r']){
   const local='scapula-'+side,canonical='z-anatomy:'+local,arm=side==='l'?left:right;
   expect(arm.byId[local]).toEqual(back.byId[local]);
   expect(combined.structureRegions?.[canonical]).toEqual(expect.arrayContaining([arm.title,'Back']));
   for(const alias of selectionAliases(arm,local))expect(resolveStructureId(combined,alias)).toBe(canonical);
   expect(resolveStructureId(arm,canonical)).toBe(local);
  }
 });
 it('orients left medial/lateral views correctly in the common anatomical frame',()=>{
  for(const view of ['overview','medial','lateral']){
   const a=right.cameraViews[view],b=left.cameraViews[view];expect(b).toEqual([a[0],a[1],-a[2]]);
  }
  expect(left.directions.find(d=>d.id==='medial')!.v).toEqual([0,0,1]);
  expect(left.directions.find(d=>d.id==='lateral')!.v).toEqual([0,0,-1]);
 });
 it('loads native geometry, attachment focus and both arms with one mesh per shared source identity',async()=>{
  for(const pack of [left,combined]){
   const model=pack.createAnkle();
   try{
    const reports=[await pack.loaders.loadBoneAssets(model.parts,pack.assets.bones,scene),await pack.loaders.loadMuscleAssets(model.parts,pack.assets.muscles,scene),await pack.loaders.loadNeurovascularAssets(model.parts,pack.assets.neurovascular,scene)];
    expect(reports.flatMap(r=>r.fallback)).toEqual([]);
    for(const s of pack.structures){
     const part=model.parts.get(s.id)!;expect(part.meshes.length,s.id).toBeGreaterThan(0);
     const visible:THREE.Mesh[]=[];model.root.traverseVisible(o=>{if(o instanceof THREE.Mesh&&o.userData.id===s.id)visible.push(o);});
     expect(visible,s.id).toHaveLength(part.meshes.length);
    }
    for(const r of manifest.structures){
     const id=pack===left?r.id:r.canonicalId,part=model.parts.get(id)!;
     const expected=anatomy.structures.find(n=>n.id===r.id)!;
     const bounds=new THREE.Box3();part.meshes.forEach(m=>bounds.union(m.geometry.boundingBox!));
     for(let axis=0;axis<3;axis++){expect(bounds.min.getComponent(axis),id).toBeCloseTo(expected.boundsMm[0][axis],2);expect(bounds.max.getComponent(axis),id).toBeCloseTo(expected.boundsMm[1][axis],2);}
    }
    const connections=pack.structures.filter(s=>s.laterality==='left').flatMap(s=>pack.connectionsFor(model.parts,s.id));expect(connections.length).toBeGreaterThan(0);
    for(const connection of connections){expect(connection.record.structureId).toMatch(/-l$/);expect(connection.footprint.structureId).toMatch(/-l$/);expect(connection.footprint.centerMm.every(Number.isFinite)).toBe(true);const decal=pack.footprintDecal(model.parts,connection);expect(decal).toBeDefined();if(decal)disposeObject(decal);}
   }finally{disposeObject(model.root);}
  }
 },30000);
});
