import manifest from './anatomyManifest';
export const digits=['first','second','third','fourth','fifth'] as const;
export const ribNames=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'] as const;
export const vertebraIds=['atlas-c1','axis-c2',...Array.from({length:5},(_,i)=>`vertebra-c${i+3}`),...Array.from({length:12},(_,i)=>`vertebra-t${i+1}`),...Array.from({length:5},(_,i)=>`vertebra-l${i+1}`),'sacrum'];
export const levelId=(level:string)=>level==='c1'?'atlas-c1':level==='c2'?'axis-c2':level==='s1'?'sacrum':'vertebra-'+level;
export interface JointPair{a:string;b:string;joint:string;}
const pairs:JointPair[]=[];
function joint(a:string,b:string,name:string){pairs.push({a,b,joint:name});}
/** Explicit bone-to-bone articulations; attachment relationships never populate this graph. */
joint('occipital-bone','atlas-c1','Atlanto-occipital joints');
for(let i=1;i<vertebraIds.length;i++)joint(vertebraIds[i-1],vertebraIds[i],i===1?'Median and lateral atlanto-axial joints':'Adjacent intervertebral body and facet joints');
joint('sacrum','coccyx','Sacrococcygeal joint');
for(const side of ['r','l']){
 joint('clavicle-'+side,'scapula-'+side,'Acromioclavicular joint');
 for(let n=1;n<=12;n++){
  joint(ribNames[n-1]+'-rib-'+side,`vertebra-t${n}`,'Costovertebral joint');
  if(n>=2&&n<=9)joint(ribNames[n-1]+'-rib-'+side,`vertebra-t${n-1}`,'Costovertebral joint');
  // Distinct joints can share a bone pair. Ribs 11–12 have no costotransverse joint.
  if(n<=10)joint(ribNames[n-1]+'-rib-'+side,`vertebra-t${n}`,'Costotransverse joint');
 }
}
joint('scapula-r','humerus-r','Glenohumeral joint');
joint('humerus-r','ulna-r','Humeroulnar joint');joint('humerus-r','radius-r','Humeroradial joint');
joint('radius-r','ulna-r','Proximal and distal radioulnar joints');
joint('radius-r','scaphoid-bone-r','Radiocarpal joint');joint('radius-r','lunate-bone-r','Radiocarpal joint');
for(const [a,b] of [
 ['scaphoid','lunate'],['scaphoid','trapezium'],['scaphoid','trapezoid'],['scaphoid','capitate'],
 ['lunate','triquetrum'],['lunate','capitate'],['lunate','hamate'],['triquetrum','hamate'],['triquetrum','pisiform'],
 ['trapezium','trapezoid'],['trapezoid','capitate'],['capitate','hamate'],
])joint(a+'-bone-r',b+'-bone-r',a==='pisiform'||b==='pisiform'?'Pisotriquetral joint':'Intercarpal / midcarpal joint');
for(const [carpal,digit] of [['trapezium','first'],['trapezium','second'],['trapezoid','second'],['capitate','second'],['capitate','third'],['capitate','fourth'],['hamate','fourth'],['hamate','fifth']])joint(carpal+'-bone-r',digit+'-metacarpal-bone-r','Carpometacarpal joint');
for(let i=1;i<4;i++)joint(digits[i]+'-metacarpal-bone-r',digits[i+1]+'-metacarpal-bone-r','Intermetacarpal joint');
for(const digit of digits){
 joint(digit+'-metacarpal-bone-r','proximal-phalanx-of-'+digit+'-finger-of-hand-r','Metacarpophalangeal joint');
 if(digit==='first')joint('proximal-phalanx-of-first-finger-of-hand-r','distal-phalanx-of-first-finger-of-hand-r','Thumb interphalangeal joint');
 else{joint('proximal-phalanx-of-'+digit+'-finger-of-hand-r','middle-phalanx-of-'+digit+'-finger-of-hand-r','Proximal interphalangeal joint');joint('middle-phalanx-of-'+digit+'-finger-of-hand-r','distal-phalanx-of-'+digit+'-finger-of-hand-r','Distal interphalangeal joint');}
}
// Apply the same authored joint graph to native left-side bones.
for(const pair of [...pairs]) if(pair.a.endsWith('-r') && pair.b.endsWith('-r'))
 if(!pairs.some(p=>p.a===pair.a.replace(/-r$/,'-l') && p.b===pair.b.replace(/-r$/,'-l') && p.joint===pair.joint))
  joint(pair.a.replace(/-r$/,'-l'),pair.b.replace(/-r$/,'-l'),pair.joint);
const ids=new Set(manifest.structures.filter(r=>r.tissue==='bone').map(r=>r.id));
export const boneJointPairs=pairs.filter(p=>ids.has(p.a)&&ids.has(p.b));
