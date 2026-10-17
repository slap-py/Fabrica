import type {Structure, Tissue} from '../../data';
import manifest from './anatomyManifest';
import {muscleTemplates} from './muscleFacts';
import {baseId, refs, uniqueReferences, type Reference} from './references';
import {ribNames} from './joints';

type SourceRecord = (typeof manifest.structures)[number];
type StudyNote = NonNullable<Structure['studyNotes']>[number];
const note = (label:string,text:string,references:Reference[]):StudyNote => ({label,text,references:uniqueReferences(references)});
const groupedId = /branches|arteries|veins|nerves|roots|ligaments|capsules|ganglion|anastomosis/;

/** Anatomical course of the named muscle's tendon, not an assertion of mesh segmentation. */
const tendonCourses:Record<string,[string,Reference[]]> = {
 'long-head-of-biceps-brachii':['The proximal tendon attaches at the supraglenoid/superior labral region, crosses the shoulder intracapsularly but extrasynovially and enters the intertubercular groove. Distally, biceps inserts on the radial tuberosity and sends an aponeurosis into forearm fascia.',[refs.axilla,refs.armMuscles]],
 'short-head-of-biceps-brachii':['The proximal tendon shares a coracoid origin region with coracobrachialis. Distally, biceps reaches the radial tuberosity and forearm fascia through its aponeurosis.',[refs.axilla,refs.armMuscles]],
 'extensor-pollicis-longus':['The tendon passes through dorsal compartment 3, turns around the dorsal radial tubercle and forms the ulnar boundary of the anatomical snuffbox before reaching the distal thumb phalanx.',[refs.forearm,refs.forearmLab]],
 'abductor-pollicis-longus':['The tendon shares dorsal compartment 1 with extensor pollicis brevis, forms the radial snuffbox boundary and reaches the first metacarpal base; accessory slips vary.',[refs.forearm,refs.forearmLab]],
 'extensor-pollicis-brevis':['The tendon shares dorsal compartment 1 with abductor pollicis longus and reaches the proximal thumb phalanx.',[refs.forearm,refs.forearmLab]],
 'extensor-carpi-radialis-longus':['The tendon passes through dorsal compartment 2 with brevis and inserts on the dorsal second metacarpal base.',[refs.forearm,refs.armMuscles]],
 'extensor-carpi-radialis-brevis':['The tendon passes through dorsal compartment 2 with longus and inserts on the dorsal third metacarpal base.',[refs.forearm,refs.armMuscles]],
 'extensor-digitorum':['Digital tendons pass through dorsal compartment 4 and join the extensor expansions of digits 2–5. Central slips reach middle phalanges; lateral bands reach distal phalanges.',[refs.forearmLab,refs.armMuscles]],
 'extensor-indicis':['The tendon passes through dorsal compartment 4 with extensor digitorum and joins the index extensor expansion.',[refs.forearm,refs.armMuscles]],
 'extensor-digiti-minimi':['The tendon passes through dorsal compartment 5 and joins the little-finger extensor expansion.',[refs.forearm,refs.armMuscles]],
 'flexor-carpi-radialis':['The tendon traverses its own canal in the radial flexor retinaculum, outside the carpal tunnel proper, to the second metacarpal base, commonly with a third-metacarpal slip.',[refs.hand,refs.forearm]],
 'palmaris-longus-muscle':['The tendon passes superficial to the flexor retinaculum and expands into the palmar aponeurosis. Presence and morphology vary.',[refs.hand]],
 'flexor-digitorum-profundus':['Tendons pass through the carpal tunnel and digital flexor sheaths, through the split superficialis tendons, to distal phalanges 2–5.',[refs.handTable,refs.forearmLab]],
 'flexor-pollicis-longus':['The tendon passes through the carpal tunnel and thumb flexor sheath to the distal thumb phalanx.',[refs.handTable,refs.armMuscles]],
};
for(const head of ['humeral','ulnar'])tendonCourses[head+'-head-of-flexor-carpi-ulnaris']=['The shared distal FCU tendon reaches the pisiform. Pisohamate and pisometacarpal ligaments continue its force pathway to the hamate and fifth metacarpal.',[refs.armMuscles,refs.connective]];
for(const head of ['humeral','ulnar'])tendonCourses[head+'-head-of-extensor-carpi-ulnaris']=['The shared distal ECU tendon travels through dorsal compartment 6 to the fifth metacarpal base.',[refs.forearm,refs.armMuscles]];
for(const head of ['humero-ulnar','radial'])tendonCourses[head+'-head-of-flexor-digitorum-superficialis']=['Tendons pass through the carpal tunnel; each divides in its digital sheath around profundus before attaching to the middle phalanx of digits 2–5.',[refs.handTable,refs.armMuscles]];
for(const id of ['supraspinatus-muscle','infraspinatus-muscle','subscapularis-muscle','teres-minor-muscle'])tendonCourses[id]=['The tendon blends with the shoulder capsule as part of the rotator cuff. Its named humeral attachment is given in the muscle insertion pathway.',[refs.joints,refs.armMuscles]];
for(const head of ['long','lateral','medial'])tendonCourses[head+'-head-of-triceps-brachii']=['The heads contribute to the shared triceps tendon at the olecranon; this source component does not identify a separate complete distal tendon.',[refs.armMuscles]];

function boneSurfaces(key:string,info:Partial<Structure>):string{
 const surfaces:Record<string,string>={
  humerus:'Head ↔ glenoid; trochlea ↔ ulnar trochlear notch; capitulum ↔ radial head.',
  radius:'Radial head ↔ humeral capitulum and ulnar radial notch; distal scaphoid/lunate facets ↔ proximal carpus; ulnar notch ↔ ulnar head.',
  ulna:'Trochlear notch ↔ humeral trochlea; radial notch ↔ radial head; distal head ↔ radial ulnar notch. The TFCC disc intervenes between ulna and carpus.',
  scapula:'Glenoid ↔ humeral head; acromial facet ↔ lateral clavicle. The scapulothoracic interface is not a cartilage-lined synovial joint.',
  clavicle:'Medial end ↔ sternoclavicular disc/manubrial-first-costal interface; lateral end ↔ acromion, with a variable AC disc.',
  'occipital-bone':'Occipital condyles ↔ superior articular facets of atlas.',
  'atlas-c1':'Superior lateral-mass facets ↔ occipital condyles; inferior facets ↔ axis; anterior arch facet ↔ dens. There is no C1–C2 intervertebral disc.',
  'axis-c2':'Dens and superior facets ↔ atlas; inferior facets ↔ C3; inferior body endplate ↔ C2–C3 disc.',
  sacrum:'Upper body endplate ↔ L5–S1 disc; superior facets ↔ L5; auricular surfaces ↔ ilia at the sacroiliac joints.',
 };
 if(surfaces[key])return surfaces[key];
 if(key.startsWith('vertebra-'))return 'Superior/inferior articular facets form synovial joints with neighboring vertebrae; body endplates border intervertebral discs. Disc endplate cartilage and facet articular cartilage have different relationships.';
 if(key.endsWith('-rib')){
  const n=ribNames.indexOf(key.replace('-rib','') as typeof ribNames[number])+1;
  return `Posterior head articulation at T${n}${n>=2&&n<=9?' and the vertebra above':''}${n<=10?'; tubercle articulation with the transverse process of T'+n:'; no costotransverse articulation'}. Anterior costal cartilage ${n<=7?'connects toward the sternum':n<=10?'joins the costal margin':'ends without a sternal connection'}. Rib 10 head facets vary.`;
 }
 if(key.includes('metacarpal'))return 'Base at its carpometacarpal joint; head at its metacarpophalangeal joint. Metacarpals 2–5 also have neighboring base articulations.';
 if(key.includes('phalanx'))return info.connection??'';
 return info.connection??'';
}

export function supportNoteMetadata(r:SourceRecord,info:Partial<Structure>,gap?:string):Partial<Structure>{
 const key=baseId(r.id),references=info.references??[];
 let informationScope:Structure['informationScope']=gap?'unresolved':groupedId.test(key)?'group':'individual';
 let studyNotes:StudyNote[]=[];
 let informationCaveat=gap;
 let educationalTissue:Tissue|undefined;
 if(info.facts){
  const [course,territory]=info.facts;
  const territoryReferences=[territory.source,...(['median-nerve','deep-branch-of-ulnar-nerve'].includes(key)?[refs.fpb]:[])];
  studyNotes=[note(r.tissue==='vein'?'Course':'Origin & course',course.text,[course.source]),note(r.tissue==='nerve'?'Motor & sensory distribution':r.tissue==='vein'?'Drainage & territory':'Supply territory',territory.text,territoryReferences)];
 }else if(r.tissue==='tendon'){
  const t=muscleTemplates[key];
  const course=tendonCourses[key];
  informationScope='parent-derived';
  informationCaveat='These attachments describe the named muscle’s anatomical pathway. The selected tendon material may group several ends or slips; its individual boundaries have not been established.';
  studyNotes=[note('Associated muscle',r.name,t.references),note('Muscle origin pathway',t.origin,t.references),note('Muscle insertion pathway',t.insertion,t.references)];
  if(course)studyNotes.push(note('Tendon course',course[0],course[1]));
 }else if(r.tissue==='bone'){
  studyNotes=[note('Joint surfaces',boneSurfaces(key,info),references)];
 }else if(r.tissue==='cartilage'&&r.id.endsWith('-cartilage')){
  const boneKey=baseId(r.id.replace(/-cartilage$/,''));
  informationScope='group';
  informationCaveat='This is a bone-associated cartilage material group. The anatomical surfaces below provide context; they do not establish which individual surfaces are included in the selected geometry.';
  studyNotes=[note('Associated bone',r.name,references),note('Regional cartilage relationships',boneSurfaces(boneKey,info),references)];
  if(boneKey.endsWith('-rib')){
   info.description=`Cartilage associated with the ${r.name.toLowerCase()}. Costal cartilage and cartilage at posterior rib joints have different locations and functions.`;
   info.role='Costal cartilage supports a resilient thoracic cage; articular cartilage at posterior joints facilitates movement.';
  }
 }else if(r.tissue==='cartilage'){
  studyNotes=[note(/nucleus/.test(r.id)?'Disc component & level':'Attachments & joint',info.connection??'',references)];
 }else{
  studyNotes=[note(r.tissue==='fascia'?'Attachments & continuity':'Attachments',info.connection??'',references)];
  if(key==='articular-disc-of-distal-radio-ulnar-joint')educationalTissue='cartilage';
 }
 return {informationScope,studyNotes,references:uniqueReferences([...references,...studyNotes.flatMap(n=>n.references)]),...(informationCaveat?{informationCaveat}:{}),...(educationalTissue?{educationalTissue}:{})};
}

/** Source taxonomy is retained for loading/layers; the inspector uses anatomical terminology. */
export function muscleNoteMetadata(id:string):Partial<Structure>{
 const key=baseId(id),t=muscleTemplates[key];
 const educationalTissue:Tissue|undefined=key==='superficial-transverse-metacarpal-ligament'||key==='extensor-retinaculum-of-wrist'?'fascia':key==='flexor-retinaculum-of-wrist'?'ligament':undefined;
 if(educationalTissue)return {educationalTissue,informationScope:'individual',studyNotes:[note('Attachments',t.origin+' ↔ '+t.insertion,t.references)],informationCaveat:'Noncontractile connective tissue. The original source layer classification is retained.'};
 return {informationScope:/interossei|interosseous|lumbrical|rotatores|interspinales|intertransversarii|digitorum/.test(key)?'group':'individual'};
}
