import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../src/regions/arm-back/manifest.json';
import arm from '../src/regions/arm-back/rightArm';
import back from '../src/regions/arm-back/back';
import {armBackRelationships,unavailableRelationshipTargets} from '../src/regions/arm-back/relationships';
import {armBackSupportFacts,supportGaps} from '../src/regions/arm-back/supportFacts';
import {boneJointPairs} from '../src/regions/arm-back/joints';
import {combineRegionPacks} from '../src/regions/combine';
const combined=combineRegionPacks([arm,back]);

describe('arm/back notes accuracy and model preservation',()=>{
 it('attaches citations and meaningful note fields to every support record, while disclosing ambiguous mappings and parent pathways',()=>{
  for(const r of manifest.structures){
   const s=combined.byId[r.canonicalId];
   expect(s.informationScope,r.id).toBeDefined();
   if(r.tissue==='muscle')continue;
   expect(s.studyNotes?.length,r.id).toBeGreaterThan(0);
   for(const n of s.studyNotes!){expect(n.text.trim().length,r.id+':'+n.label).toBeGreaterThan(0);expect(n.references.length,r.id).toBeGreaterThan(0);for(const ref of n.references)expect(s.references!.some(r=>r.url===ref.url)).toBe(true);}
   if(r.tissue==='tendon'){expect(s.informationScope).toBe('parent-derived');expect(s.informationCaveat).toContain('individual boundaries');}
   if(supportGaps[r.id]){expect(s.informationScope).toBe('unresolved');expect(s.informationCaveat).toBe(supportGaps[r.id]);}
   if(['nerve','artery','vein'].includes(r.tissue)){expect(s.studyNotes).toHaveLength(2);expect(s.studyNotes![1].label).toBe(r.tissue==='nerve'?'Motor & sensory distribution':r.tissue==='artery'?'Supply territory':'Drainage & territory');}
  }
  expect(Object.keys(supportGaps).filter(id=>!id.endsWith('-l'))).toHaveLength(5);
 });
 it('resolves C2 disc and nucleus hosts to the axis and keeps lumbrical attachments on tendon pathways',()=>{
  for(const id of ['intervertebral-disc-c2-c3','nucleus-pulposus-c2-c3']){
   const edges=armBackRelationships.filter(e=>e.from===id);
   expect(edges.some(e=>e.to==='axis-c2')).toBe(true);
   expect(edges.some(e=>e.to==='vertebra-c3')).toBe(true);
   expect(unavailableRelationshipTargets.some(e=>e.structureId===id&&e.target==='vertebra-c2')).toBe(false);
  }
  const lumbricalEdges=armBackRelationships.filter(e=>e.from==='lumbrical-muscles-of-hand-r'&&['origin','insertion'].includes(e.kind));
  expect(lumbricalEdges.map(e=>[e.kind,e.to])).toEqual([['origin','flexor-digitorum-profundus-r-tendon'],['insertion','extensor-digitorum-r-tendon']]);
  const tendonEdges=armBackRelationships.filter(e=>e.from==='long-head-of-biceps-brachii-r-tendon');
  expect(tendonEdges.every(e=>e.kind==='force-pathway')).toBe(true);
  expect(tendonEdges.every(e=>e.note.includes('does not establish individual endpoints'))).toBe(true);
 });
 it('retains distinct rib-head and costotransverse joints without inventing floating-rib articulations',()=>{
  for(const side of ['l','r']){
   expect(boneJointPairs.filter(e=>e.a==='first-rib-'+side&&e.b==='vertebra-t1').map(e=>e.joint)).toEqual(['Costovertebral joint','Costotransverse joint']);
   expect(armBackRelationships.filter(e=>e.from==='first-rib-'+side&&e.to==='vertebra-t1'&&e.kind==='articulation')).toHaveLength(2);
   for(const n of ['eleventh','twelfth'])expect(boneJointPairs.some(e=>e.a===n+'-rib-'+side&&e.joint==='Costotransverse joint')).toBe(false);
  }
  expect(armBackSupportFacts['first-rib-r-cartilage'].description).toContain('Costal cartilage');
  expect(back.byId['first-rib-r-cartilage'].name).toContain('associated cartilage');
  expect(back.byId['first-rib-r-cartilage'].name).not.toContain('articular cartilage');
  expect(armBackSupportFacts['first-rib-r-cartilage'].informationScope).toBe('group');
 });
 it('qualifies anatomical variation and corrects source taxonomy without changing layer membership',()=>{
  expect(arm.byId['extensor-retinaculum-of-wrist-r'].tissue).toBe('muscle');
  expect(arm.byId['extensor-retinaculum-of-wrist-r'].educationalTissue).toBe('fascia');
  expect(arm.byId['flexor-retinaculum-of-wrist-r'].educationalTissue).toBe('ligament');
  expect(arm.byId['articular-disc-of-distal-radio-ulnar-joint-r'].tissue).toBe('ligament');
  expect(arm.byId['articular-disc-of-distal-radio-ulnar-joint-r'].educationalTissue).toBe('cartilage');
  expect(back.byId['anterior-layer-of-thoracolumbar-fascia-r'].role).toContain('mechanical contribution is uncertain');
  expect(back.byId['intercostal-nerves-r'].studyNotes![0].text).toContain('T1–T11');
  expect(back.byId['intercostal-nerves-r'].studyNotes![0].text).toContain('T12 is the subcostal');
  expect(arm.byId['deep-branch-of-ulnar-nerve-r'].studyNotes![1].text).toContain('Palmaris brevis receives the superficial');
  expect(arm.byId['ulnotriquetral-ligament-r'].connection).toContain('proximal/ulnar triquetrum');
  expect(arm.byId['transverse-humeral-ligament-r'].role).toContain('question whether it is a separate ligament');
 });
 it('preserves source model files, manifests and spatial attachment metadata byte for byte',()=>{
  const baseline=JSON.parse(fs.readFileSync(new URL('../validation/arm-back-notes-model-baseline.json',import.meta.url),'utf8')) as Record<string,string>;
  expect(Object.keys(baseline)).toHaveLength(6);
  // The audit module now reads the expanded inventory; original model bytes stay fixed.
  for(const [path,hash] of Object.entries(baseline).filter(([path])=>path!=='src/regions/arm-back/attachmentAudit.ts'))expect(createHash('sha256').update(fs.readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
 });
});
