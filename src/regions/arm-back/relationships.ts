import manifest from './anatomyManifest';
import {muscleTemplates} from './muscleFacts';
import {supportTemplates} from './supportFacts';
import {boneJointPairs,levelId} from './joints';
import {baseId,refs,type Reference} from './references';
type RecordEntry=(typeof manifest.structures)[number];
const byId=Object.fromEntries(manifest.structures.map(r=>[r.id,r]));
/** Resolve an authored anatomical ID to the same side; never substitute the opposite side. */
export function resolveAnatomicalTarget(target:string,record:RecordEntry):string|undefined{
 if(byId[target]&&/-[lr]$/.test(target))return target;
 if(byId[target])return byId[target].laterality==='midline'||byId[target].laterality===record.laterality?target:undefined;
 const side=record.laterality==='right'?'r':record.laterality==='left'?'l':undefined;
 const candidate=side?target.endsWith('-tendon')?target.replace(/-tendon$/,'-'+side+'-tendon'):target+'-'+side:target;
 return byId[candidate]?candidate:undefined;
}
export type RelationshipKind='origin'|'insertion'|'tendon'|'innervation'|'blood-supply'|'regional-connection'|'articulation'|'component'|'force-pathway';
export interface AnatomicalRelationship{from:string;to:string;kind:RelationshipKind;note:string;references:Reference[];}
const edges:AnatomicalRelationship[]=[];
export const unavailableRelationshipTargets:{structureId:string;target:string;kind:RelationshipKind}[]=[];
function connect(r:RecordEntry,target:string,kind:RelationshipKind,note:string,references:Reference[]){
 const id=resolveAnatomicalTarget(target,r);
 if(!id){unavailableRelationshipTargets.push({structureId:r.id,target,kind});return;}
 if(id!==r.id)edges.push({from:r.id,to:id,kind,note,references});
}
for(const r of manifest.structures){
 if(r.tissue==='muscle'){
  const t=muscleTemplates[baseId(r.id)];
  for(const target of t.originHosts)connect(r,target,baseId(r.id)==='latissimus-dorsi-muscle'&&target==='sacrum'?'force-pathway':'origin',t.origin,t.references);
  for(const target of t.insertionHosts)connect(r,target,'insertion',t.insertion,t.references);
  for(const target of t.nerveIds)connect(r,target,'innervation',t.innervation,t.references);
  for(const target of t.arteryIds)connect(r,target,'blood-supply',t.bloodSupply,t.references);
  if(byId[r.id+'-tendon'])connect(r,r.id+'-tendon','tendon','Tendon-material component of this muscle.',t.references);
 }else if(r.tissue==='tendon'){
  const t=muscleTemplates[baseId(r.id)];
  if(t)for(const target of [...t.originHosts,...t.insertionHosts])connect(r,target,'force-pathway','Parent-muscle force pathway; this tendon material group does not establish individual endpoints.',t.references);
 }else{
  const t=supportTemplates[baseId(r.id)];
  if(t)for(const target of t.targets)connect(r,target,'regional-connection',t.connection,t.references);
  if(r.id.endsWith('-cartilage'))connect(r,r.id.replace(/-cartilage$/,''),'component','Source cartilage-material host.',[refs.bones,refs.axial]);
  const disc=r.id.match(/^(intervertebral-disc|nucleus-pulposus)-([a-z]\d+)-([a-z]\d+)$/);
  if(disc){
   const [_,type,a,b]=disc;
   for(const level of [a,b])connect(r,levelId(level),'component','Intervertebral disc endplate host.',[refs.axial]);
   connect(r,(type==='nucleus-pulposus'?'intervertebral-disc':'nucleus-pulposus')+'-'+a+'-'+b,'component','Nucleus is the central disc component.',[refs.axial]);
  }
  if(baseId(r.id)==='glenoid-labrum')for(const target of ['scapula','long-head-of-biceps-brachii','articular-capsule-of-glenohumeral-joint'])connect(r,target,'regional-connection','Glenoid rim and superior biceps/capsular attachment.',[refs.joints]);
  if(r.tissue==='cartilage'&&r.id.includes('articular-disc-of-'))for(const target of r.id.includes('acromioclavicular')?['scapula','clavicle']:['clavicle'])connect(r,target,'regional-connection','Shoulder girdle joint disc.',[refs.joints]);
 }
}
for(const pair of boneJointPairs)edges.push({from:pair.a,to:pair.b,kind:'articulation',note:pair.joint,references:[refs.bones,refs.axial,refs.thorax,refs.connective]});
export const armBackRelationships=[...new Map(edges.map(e=>[e.kind+':'+e.from+':'+e.to+':'+e.note,e])).values()];
export function relationshipIds(id:string){return new Set(armBackRelationships.filter(e=>e.from===id||e.to===id).map(e=>e.from===id?e.to:e.from));}
export function articulationNames(id:string){
 const names=boneJointPairs.filter(p=>p.a===id||p.b===id).map(p=>`${byId[p.a===id?p.b:p.a].name} · ${p.joint}`);
 if(id.startsWith('clavicle-'))names.push('Sternum · Sternoclavicular joint (host outside this inventory)');
 if(id==='sacrum')names.push('Hip bones · Sacroiliac joints (hosts outside this inventory)');
 return names;
}
