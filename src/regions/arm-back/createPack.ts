import * as THREE from 'three';
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { lowerLegPack } from '../lower-leg';
import { validateRegionPack, type RegionPack } from '..';
import { colors, tissueNames, type Region, type Structure, type Tissue } from '../../data';
import { createRegionAssetLoaders } from '../../assets';
import { resolveFootprint, type AnatomyParts } from '../../softTissues';
import { type AttachmentRecord, type MmPoint } from '../../attachments';
import { connectionCameraPose, connectionOccluders, type Connection } from '../../connections';
import manifest from './manifest.json';

type SourceRecord = (typeof manifest.structures)[number];
const source = { title: 'Z-Anatomy / BodyParts3D · pinned source', url: `https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/${manifest.sourceRevision}` };
const centerOf = (r: SourceRecord) => new THREE.Vector3(...r.boundsMm[0]).add(new THREE.Vector3(...r.boundsMm[1])).multiplyScalar(.5);
const roles: Partial<Record<Tissue,string>> = {
 bone: 'Provides skeletal support and muscle attachment surfaces.', tendon: 'Transfers muscle tension through the source tendon surfaces.',
 ligament: 'Connects and supports adjacent joint structures.', cartilage: 'Forms articular surfaces or fibrocartilaginous joint structures.',
 fascia: 'Surrounds or separates regional structures.', artery: 'Carries blood to regional tissues.', vein: 'Returns blood from regional tissues.', nerve: 'Conveys signals along its source anatomical course.',
};

/** Both packs select canonical objects from the same registered source bundle. */
export function createArmBackPack(id: 'right-arm' | 'back'): RegionPack {
 const title = id === 'right-arm' ? 'Right Arm' : 'Back';
 const records = manifest.structures.filter(r => r.regions.includes(id));
 const sourceById = Object.fromEntries(records.map(r => [r.id,r]));
 const structures: Structure[] = records.map(r => {
  const side = r.laterality === 'midline' ? '' : `${r.laterality === 'right' ? 'Right' : 'Left'} `;
  const tissue = r.tissue as Tissue;
  const name = side + r.name + (r.materialSeparation === 'cartilage' ? ' articular cartilage' : tissue === 'tendon' ? ' tendon' : '');
  const patches = r.sourceAttachments;
  return { id:r.id, canonicalId:r.canonicalId, laterality:r.laterality as Structure['laterality'], regionMembership:r.regions, sourceObject:r.sourceObject, visualizationAvailable:true,
   name, tissue, region:r.area as Region, group:tissue === 'muscle' ? `${r.area} muscles` : tissue === 'bone' ? 'Skeleton' : tissueNames[tissue],
   description:`${name}, adapted from source object “${r.sourceObject}”. ${r.regions.length > 1 ? 'This complete source structure belongs to both Right Arm and Back and appears once in their combined view.' : 'The complete source mesh is retained without a regional cut.'}`,
   role:roles[tissue] ?? 'Source muscle surface; use its attachments and related structures to explore its anatomy.',
   connection:patches.length ? 'Reviewed source patches provide partial attachment context; focus footprints are illustrative.' : 'No reviewed attachment focus card is available for this structure.',
   hint:'Use Focus, Isolate, tissue layers, labels and anatomical views to study this structure.',
   references:[source] };
 });
 const byId = Object.fromEntries(structures.map(s => [s.id,s]));
 const tissueKeys = lowerLegPack.tissueKeys.filter(t => structures.some(s => s.tissue === t));
 const structureCounts = {total:structures.length,byTissue:Object.fromEntries(tissueKeys.map(t=>[t,structures.filter(s=>s.tissue===t).length]))};
 const base=`${import.meta.env.BASE_URL}models/arm-back/`;
 const assets={bones:base+'bones.glb',muscles:base+'muscles.glb',neurovascular:base+'neurovascular.glb',exterior:base+'exterior.glb'};
 const idsFor=(group:string)=>records.filter(r=>r.assetGroup===group).map(r=>r.id);
 const assetLoaders=createRegionAssetLoaders(structures,{bones:idsFor('bones'),muscles:idsFor('muscles'),neurovascular:idsFor('neurovascular'),exterior:[]});
 // There is no continuous source skin mesh; an empty group does not request an invented exterior.
 const loaders={...assetLoaders,loadExteriorAssets:async()=>({loaded:[],fallback:[],warnings:[]})};
 const bounds=new THREE.Box3();records.forEach(r=>{bounds.expandByPoint(new THREE.Vector3(...r.boundsMm[0]));bounds.expandByPoint(new THREE.Vector3(...r.boundsMm[1]));});
 const target=bounds.getCenter(new THREE.Vector3());const distance=Math.max(700,bounds.getSize(new THREE.Vector3()).length()*1.65);
 const cameraViews:Record<string,[number,number,number]>={overview:id==='back'?[-1,.15,.55]:[1,.15,.6],anterior:[1,0,0],posterior:[-1,0,0],medial:[0,0,-1],lateral:[0,0,1],superior:[.01,1,0],inferior:[.01,-1,0]};
 const cameraPreset=(view:string,aspect:number)=>({target:target.clone(),position:target.clone().addScaledVector(new THREE.Vector3(...(cameraViews[view]??cameraViews.overview)).normalize(),distance*Math.max(1,.8/aspect))});
 const directions=lowerLegPack.directions.map(d=>({...d}));
 // Reuse the conventional axial compass supplied by the upper-leg packs, rather than foot surface directions.
 const axialDirections=[['anterior','A','Anterior · front',[1,0,0]],['posterior','P','Posterior · back',[-1,0,0]],['medial','M','Subject-left',[0,0,-1]],['lateral','L','Subject-right',[0,0,1]],['superior','S','Superior · up',[0,1,0]],['inferior','I','Inferior · down',[0,-1,0]]] as const;
 directions.splice(0,directions.length,...axialDirections.map(([id,short,label,v])=>({id,short:id==='medial'&&title==='Back'?'L':id==='lateral'&&title==='Back'?'R':short,label:id==='medial'&&title!=='Back'?'Medial · inner side':id==='lateral'&&title!=='Back'?'Lateral · outer side':label,v:[...v] as [number,number,number],color:'var(--compass-anterior)'})));
 const createAnkle=()=>{const root=new THREE.Group(),parts:AnatomyParts=new Map();for(const s of structures){const group=new THREE.Group();group.name=s.id;root.add(group);parts.set(s.id,{id:s.id,group,meshes:[],anchor:centerOf(sourceById[s.id])});}return {root,parts};};
 const attachmentRecords:AttachmentRecord[]=records.filter(r=>r.tissue==='muscle').flatMap(r=>r.sourceAttachments.filter(p=>byId[p.hostId]).map((p,index)=>{
  const seedMm=p.seedMm as MmPoint;
  const host={structureId:p.hostId,landmark:`Source attachment patch ${p.sourceObject}`,seedMm,radiusMm:5,kind:'surface' as const};
  const junction={structureId:r.id,landmark:'Source muscle surface',seedMm,radiusMm:4,kind:'junction' as const};
  return {id:`${r.id}:${p.end}:${index}`,structureId:r.id,component:p.end==='from'?'origin':'insertion',kind:'tendon' as const,from:p.end==='from'?host:junction,to:p.end==='to'?host:junction,guidePoints:[],widthMm:8,thicknessMm:2,normal:[1,0,0] as MmPoint,sourceIds:['armBackSource','armBackAttachments'],note:`Source patch ${p.sourceObject}, projected onto the nearby source bone. The host bone family is checked against an anatomy reference; the footprint is illustrative, not a measured boundary or exhaustive attachment account.`,coordinateStatus:'illustrative-surface-fit' as const};
 }));
 const relatedIds=(id:string)=>{const ids=new Set<string>();const add=(n:string)=>{if(n!==id&&byId[n])ids.add(n);};for(const a of attachmentRecords)if([a.structureId,a.from.structureId,a.to.structureId,a.structureId+'-tendon'].includes(id)){[a.structureId,a.from.structureId,a.to.structureId,a.structureId+'-tendon'].forEach(add);}if(id.endsWith('-cartilage'))add(id.replace(/-cartilage$/,''));else add(id+'-cartilage');if(id.endsWith('-tendon'))add(id.replace(/-tendon$/,''));else add(id+'-tendon');return ids;};
 const connectionsFor=(parts:AnatomyParts,id:string):Connection[]=>attachmentRecords.filter(r=>[r.structureId,r.from.structureId,r.to.structureId,r.structureId+'-tendon'].includes(id)).flatMap(record=>{
  const end=record.component==='origin'?'from':'to';return parts.get(record[end].structureId)?.meshes.length ? [{key:`${record.id}:${end}`,record,end,footprint:resolveFootprint(parts,record[end])}] : [];
 });
 const footprintDecal=(parts:AnatomyParts,c:Connection)=>{const f=c.footprint,bone=parts.get(f.structureId)?.meshes[f.meshIndex];if(!bone)return;bone.updateWorldMatrix(true,false);const orientation=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),new THREE.Vector3(...f.normal).normalize()));const mesh=new THREE.Mesh(new DecalGeometry(bone,new THREE.Vector3(...f.centerMm),orientation,new THREE.Vector3(f.radiusMm*2,f.radiusMm*2,f.radiusMm)),new THREE.MeshBasicMaterial({color:'#21bda8',transparent:true,opacity:.9,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,side:THREE.DoubleSide}));mesh.userData.connectionKey=c.key;mesh.renderOrder=5;return mesh;};
 const areas=[{id:'all',label:'All areas',group:''},...[...new Set(records.map(r=>r.area))].map(area=>({id:area,label:area,group:''}))];
 const overview=id==='right-arm'?'Explore the right shoulder, upper arm, elbow, forearm, wrist and hand.':'Explore both sides of the back from the posterior neck to the lower back and sacrum.';
 const anatomyPreset=lowerLegPack.presets.find(p=>p.id==='anatomy')!;
 const presets=lowerLegPack.presets.filter(p=>p.id!=='exterior').map(p=>({...p,tissues:p.tissues.filter(t=>tissueKeys.includes(t) && (p.id!=='anatomy'||t!=='fascia')),label:p.id==='anatomy'?'Anatomy':p.label}));
 return validateRegionPack({...lowerLegPack,id,title,description:overview,thumbnail:`${import.meta.env.BASE_URL}regions/${id}.png`,structures,byId,tissueKeys,colors,tissueNames,assets,assetUrls:assets,loaders,structureCounts,createAnkle,
  sceneBoundsMm:[bounds.min.toArray(),bounds.max.toArray()],canonicalStructureIds:Object.fromEntries(records.map(r=>[r.id,r.canonicalId])),structureRegions:Object.fromEntries(records.map(r=>[r.id,r.regions.map(id=>id==='back'?'Back':'Right Arm')])),
  structureAliases:Object.fromEntries(records.flatMap(r=>[[r.canonicalId,r.id],...r.regions.map(region=>[`${region}:${r.id}`,r.id])])),
  dataOnlyStructures:manifest.dataOnly.filter(r=>r.regions.includes(id)).map(r=>({...r,visualizationAvailable:false as const})),neurovascularSources:undefined,neurovascularCropYMaxMm:undefined,
  atlasAreas:areas,atlasTabs:areas,atlasIds:area=>new Set(records.filter(r=>area==='all'||r.area===area).map(r=>r.id)),relatedIds,directlyAttachedIds:id=>new Set([id,...relatedIds(id)]),connectionHighlightIds:id=>new Set([id,...relatedIds(id)]),connectionsFor,footprintDecal,connectionCameraPose,connectionOccluders,connectionClinicalPoints:{},
  rebuildSoftTissues:()=>({attachments:attachmentRecords.length,cartilagePatches:records.filter(r=>r.tissue==='cartilage').length,warnings:[]}),attachmentSources:{...lowerLegPack.attachmentSources,armBackSource:{...source,section:'Complete source objects and origin/insertion patches'},armBackAttachments:{title:'UAMS anatomy tables · reviewed bone families',url:manifest.attachmentValidation.references[0],section:'Upper limb and back muscle tables'}},
  presets,defaultMode:anatomyPreset.id,cameraViews,cameraPreset,directions,defaultView:'overview',viewPresets:['overview','anterior','posterior','medial','lateral'].map(view=>({id:view,label:id==='back'&&view==='medial'?'Left':id==='back'&&view==='lateral'?'Right':view[0].toUpperCase()+view.slice(1),direction:view==='overview'?(id==='back'?'posterior':'anterior'):view,preset:aspect=>cameraPreset(view,aspect)})),
  labelTier:Object.fromEntries(records.filter(r=>r.tissue!=='cartilage').map(r=>[r.id,(r.tissue==='bone'&&/scapula|humerus|radius|ulna|sacrum|vertebra-t1$|atlas-c1/.test(r.id)||r.tissue==='muscle'&&/trapezius|latissimus|biceps-brachii|deltoid/.test(r.id)?1:r.tissue==='bone'||r.tissue==='muscle'?2:3) as 1|2|3])),
  scene:{initialCamera:cameraPreset('overview',1).position,keyPosition:target.clone().add(new THREE.Vector3(900,900,700)),keyTarget:target.clone(),fillPosition:target.clone().add(new THREE.Vector3(-700,500,-600)),fillTarget:target.clone(),floorPosition:new THREE.Vector3(0,bounds.min.y-30,0)},
  about:{...lowerLegPack.about,title,overview,overviewHtml:`<p>${overview}</p><p class="stats">${structures.length} selectable source structures</p><p>Complete original source meshes use the same anatomical registration as the legs. Shared right shoulder structures appear once when Right Arm and Back are combined. Laterality is independent of region membership.</p><p>No continuous skin mesh is available. The spinal cord is recorded in anatomy data but unavailable for visualization. Some source material slots contain no faces; those parts are omitted. Source gaps and export details are recorded in the arm/back manifest.</p><p>Muscle attachment cards use source patches with reviewed bone-family associations. Unreviewed or incompatible proximity candidates are withheld and recorded in the manifest. Full clinical muscle facts are not available for all structures. Source sheets may have open borders; this static atlas makes no biomechanical predictions.</p>`,controlsHtml:lowerLegPack.about.controlsHtml.replace('Overview, dorsal, plantar, medial, lateral','Overview, anterior, posterior, medial, lateral')},
  assetFailureMessage:'Some source models could not load. Unavailable structures are hidden; reopen the region to retry.',
 });
}
