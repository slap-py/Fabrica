import manifest from './anatomyManifest';
import {muscleTemplates} from './muscleFacts';
import {baseId} from './references';
import {resolveAnatomicalTarget} from './relationships';
export const attachmentAudit=manifest.structures.filter(r=>r.tissue==='muscle').flatMap(r=>{
 const t=muscleTemplates[baseId(r.id)];
 return [...r.sourceAttachments.map(p=>({...p,previousStatus:'accepted' as const})),...r.unverifiedAttachmentPatches.map(p=>({...p,previousStatus:'withheld' as const}))].map(p=>{
  const targets=(p.end==='from'?t.originHosts:t.insertionHosts).map(host=>resolveAnatomicalTarget(host,r)).filter(Boolean);
  const supported=targets.includes(p.hostId);
  // No proximity candidate is promoted solely because its nearest bone is anatomically possible.
  const accepted=p.previousStatus==='accepted'&&supported;
  return {...p,structureId:r.id,status:accepted?'accepted':'withheld',anatomicalHostSupported:supported,reason:accepted?'Written attachment end and same-side host agree; existing source location review retained.':!supported?'Host or source end disagrees with written facts.':'Anatomical host is possible; source patch endpoint/location is not independently established.'};
 });
});
export const acceptedAttachmentPatches=attachmentAudit.filter(p=>p.status==='accepted');
