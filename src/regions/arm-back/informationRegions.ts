import type {Region} from '../../data';
import {baseId} from './references';

// Educational areas describe anatomy, independently of source mesh/view membership.
// Apply the same area to both sides and their tendon/cartilage components.
const areas: Record<string,Region> = {
 'ascending-part-of-trapezius-muscle':'Back',
 'descending-part-of-trapezius-muscle':'Neck',
 'transverse-part-of-trapezius-muscle':'Back',
 'latissimus-dorsi-muscle':'Back',
 'levator-scapulae':'Neck',
 'rhomboid-major-muscle':'Back',
 'rhomboid-minor-muscle':'Back',
 'clavicle':'Shoulder',
 'scapula':'Shoulder',
 'supraspinatus-muscle':'Shoulder',
 'infraspinatus-muscle':'Shoulder',
 'subscapularis-muscle':'Shoulder',
 'teres-major-muscle':'Shoulder',
 'teres-minor-muscle':'Shoulder',
 'transverse-cervical-artery':'Neck',
 'superficial-branch-of-transverse-cervical-artery':'Neck',
 'deep-branch-of-transverse-cervical-artery':'Shoulder',
 'circumflex-scapular-artery':'Shoulder',
 'circumflex-scapular-vein':'Shoulder',
 'dorsal-scapular-nerve':'Shoulder',
 'inferior-subscapular-nerve':'Shoulder',
 'superior-subscapular-nerve':'Shoulder',
 'subscapular-artery':'Shoulder',
 'subscapular-vein':'Shoulder',
 'suprascapular-artery':'Shoulder',
 'suprascapular-nerve':'Shoulder',
 'suprascapular-vein':'Shoulder',
 'thoracodorsal-artery':'Shoulder',
 'thoracodorsal-nerve':'Shoulder',
};
export function anatomicalArea(record: {id:string;area:string}): Region {
 return areas[baseId(record.id.replace(/-cartilage$/,''))] ?? record.area as Region;
}
