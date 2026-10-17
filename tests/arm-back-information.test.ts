import {describe,it,expect} from 'vitest';
import manifest from '../src/regions/arm-back/anatomyManifest';
import arm from '../src/regions/arm-back/rightArm';
import leftArm from '../src/regions/arm-back/leftArm';
import back from '../src/regions/arm-back/back';
import {combineRegionPacks} from '../src/regions/combine';
import {armBackMuscleFacts} from '../src/regions/arm-back/muscleFacts';
import {armBackSupportFacts,supportGaps} from '../src/regions/arm-back/supportFacts';
import {armBackRelationships,articulationNames} from '../src/regions/arm-back/relationships';
import {attachmentAudit,acceptedAttachmentPatches} from '../src/regions/arm-back/attachmentAudit';
import {baseId} from '../src/regions/arm-back/references';
import {lowerLegPack} from '../src/regions/lower-leg';
import leftLower from '../src/regions/left-lower-leg';
import rightUpper from '../src/regions/upper-leg/right';
import leftUpper from '../src/regions/upper-leg/left';
const combined=combineRegionPacks([arm,leftArm,back]);
describe('arm/back sourced educational information',()=>{
 it('covers every canonical source record once, with five reviewed muscle fields',()=>{
  expect(Object.keys(armBackMuscleFacts)).toHaveLength(manifest.structures.filter(r=>r.tissue==='muscle').length);expect(Object.keys(armBackSupportFacts)).toHaveLength(manifest.structures.filter(r=>r.tissue!=='muscle').length);
  for(const r of manifest.structures){const s=combined.byId[r.canonicalId];expect(s,r.id).toBeDefined();expect(s.description).not.toContain('adapted from source object');expect(s.references!.length,r.id).toBeGreaterThan(1);if(r.tissue==='muscle')for(const field of ['origin','insertion','action','innervation','bloodSupply'] as const)expect(s[field]?.length,r.id+':'+field).toBeGreaterThan(10);}
  expect(Object.keys(supportGaps).filter(id=>!id.endsWith('-l')).sort()).toEqual(['communicating-branch-of-median-nerve-with-ulnar-nerve-r','dorsal-ulnocarpal-ligament-r','palmar-scaphotriquetral-ligament-r','radiate-carpal-ligament-r','radiocapitate-ligament-r']);
 });
 it('uses anatomy descriptions and consistent bilateral areas rather than view membership',()=>{
  const bilateral=new Map<string,Array<(typeof combined.structures)[number]>>();
  for(const r of manifest.structures){
   const s=combined.byId[r.canonicalId],key=r.tissue+':'+baseId(r.id.replace(/-cartilage$/,''));
   const entries=bilateral.get(key)??[];entries.push(s);bilateral.set(key,entries);
   expect(s.description,r.id).not.toMatch(/Modeled (?:left|right|midline) component|source object|material surfaces separated/i);
   const pack=r.regions.includes('back')?back:r.laterality==='left'?leftArm:arm;
   expect(pack.atlasIds(s.region).has(r.id),r.id).toBe(true);
  }
  for(const entries of bilateral.values())if(entries.some(s=>s.laterality==='left')&&entries.some(s=>s.laterality==='right')){
   expect(new Set(entries.map(s=>s.region)).size,entries.map(s=>s.name).join(', ')).toBe(1);
   expect(new Set(entries.map(s=>s.description)).size,entries.map(s=>s.name).join(', ')).toBe(1);
   expect(new Set(entries.map(s=>s.group)).size).toBe(1);
  }
  for(const side of ['l','r'])expect(back.byId['ascending-part-of-trapezius-muscle-'+side].region).toBe('Back');
  for(const pack of [lowerLegPack,leftLower,rightUpper,leftUpper])for(const s of pack.structures)
   expect(s.description,s.id).not.toMatch(/Modeled (?:left|right|midline) component|model provenance|material surfaces separated/i);
 });
 it('keeps subdivision actions/origins and split grouped nerve territories distinct',()=>{
  expect(arm.byId['acromial-part-of-deltoid-muscle-r'].action).toContain('Abducts');expect(arm.byId['clavicular-part-of-deltoid-muscle-r'].action).toContain('Flexes');expect(arm.byId['scapular-spinal-part-of-deltoid-muscle-r'].action).toContain('Extends');
  expect(arm.byId['long-head-of-biceps-brachii-r'].origin).toContain('Supraglenoid');expect(arm.byId['short-head-of-biceps-brachii-r'].origin).toContain('coracoid');
  expect(arm.byId['extensor-carpi-radialis-longus-r'].innervation).toContain('before');expect(arm.byId['deep-head-of-flexor-pollicis-brevis-r'].innervation).toContain('ulnar');
  expect(arm.byId['flexor-digitorum-profundus-r'].innervation).toContain('digits 2–3');expect(arm.byId['lumbrical-muscles-of-hand-r'].innervation).toContain('3–4');
  expect(back.byId['dorsal-parts-of-lateral-intertransversarii-lumborum-muscles-r'].innervation).toContain('Ventral');expect(back.byId['dorsal-parts-of-lateral-intertransversarii-lumborum-muscles-r'].insertion).toContain('Accessory');
  expect(back.byId['iliocostalis-colli-muscle'].laterality).toBe('left');expect(back.byId['obliquus-inferior-capitis-muscle-r'].insertion).toContain('Atlas');
  for(const id of ['flexor-retinaculum-of-wrist-r','extensor-retinaculum-of-wrist-r','superficial-transverse-metacarpal-ligament-r'])expect(arm.byId[id].action).toContain('Noncontractile');
 });
 it('has sourced valid symmetric links and excludes attachment hosts from articulations',()=>{
  const ids=new Set(manifest.structures.map(r=>r.id));
  for(const e of armBackRelationships){expect(ids.has(e.from)&&ids.has(e.to),JSON.stringify(e)).toBe(true);expect(e.references.length).toBeGreaterThan(0);expect(combined.relatedIds('z-anatomy:'+e.from).has('z-anatomy:'+e.to),JSON.stringify(e)).toBe(true);}
  for(const pack of [arm,leftArm,back,combined])for(const s of pack.structures)for(const id of pack.relatedIds(s.id)){expect(pack.byId[id]).toBeDefined();expect(pack.relatedIds(id).has(s.id)).toBe(true);}
  expect(articulationNames('scapula-r').some(n=>n.includes('rib'))).toBe(false);expect(articulationNames('ulna-r').some(n=>/carpal|Scaphoid|Lunate/.test(n))).toBe(false);
  expect(articulationNames('humerus-r').some(n=>n.includes('Scapula'))).toBe(true);
  expect(arm.relatedIds('scapula-r').has('latissimus-dorsi-muscle-r')).toBe(false);
  expect(arm.relatedIds('humerus-r').has('latissimus-dorsi-muscle-r')).toBe(true);
 });
 it('retains identical shared information independent of region membership',()=>{
  for(const r of manifest.structures.filter(r=>r.regions.length>1)){const owner=r.laterality==='left'?leftArm:arm;expect(owner.byId[r.id]).toEqual(back.byId[r.id]);const s=combined.byId[r.canonicalId];for(const key of ['description','role','origin','insertion','innervation','bloodSupply','references','articulations'] as const)expect(s[key]).toEqual(owner.byId[r.id][key]);}
 });
 it('audits every patch, preserves complete written insertions, and never promotes mere proximity',()=>{
  expect(attachmentAudit.length).toBeGreaterThan(179);expect(acceptedAttachmentPatches.length).toBeGreaterThan(38);expect(acceptedAttachmentPatches.every(p=>p.status==='accepted')).toBe(true);
  expect(attachmentAudit.filter(p=>p.previousStatus==='withheld').every(p=>p.status==='withheld')).toBe(true);
  expect(acceptedAttachmentPatches.every(p=>p.anatomicalHostSupported)).toBe(true);
  expect(arm.byId['latissimus-dorsi-muscle-r'].insertion).toContain('humeral');
  expect(acceptedAttachmentPatches.some(p=>p.structureId==='latissimus-dorsi-muscle-r'&&p.end==='to'&&p.hostId==='scapula-r')).toBe(false);
 });
 it('gives every nerve and vessel two sourced facts and verifies reference syntax',()=>{
  for(const r of manifest.structures){const s=combined.byId[r.canonicalId];if(['nerve','artery','vein'].includes(r.tissue)){expect(s.facts,r.id).toHaveLength(2);for(const fact of s.facts!)expect(s.references!.some(ref=>ref.url===fact.source.url)).toBe(true);}for(const ref of s.references!){expect(new URL(ref.url).protocol).toBe('https:');expect(ref.title.length).toBeGreaterThan(5);}}
  expect(arm.byId['median-nerve-r'].clinical).toContain('carpal tunnel');expect(arm.byId['scaphoid-bone-r'].clinical).toContain('proximal');
 });
});
