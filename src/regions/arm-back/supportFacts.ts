import type { Structure } from '../../data';
import manifest from './anatomyManifest';
import {armBackMuscleFacts} from './muscleFacts';
import {baseId,refs,type Reference} from './references';
import {levelId} from './joints';
import {supportNoteMetadata} from './studyNotes';
export interface SupportTemplate {description:string;role:string;connection:string;targets:string[];references:Reference[];facts?:Structure['facts'];gap?:string;}
export const supportTemplates:Record<string,SupportTemplate>={};
function add(id:string,description:string,role:string,connection:string,targets:string[]=[],references:Reference[]=[refs.joints]){supportTemplates[id]={description,role,connection,targets,references};}
/** Neurovascular entries retain two cited facts, organized as course and territory. */
function nv(id:string,originCourse:string,distribution:string,targets:string[],reference:Reference){
 add(id,originCourse,distribution,originCourse,targets,[reference]);
 supportTemplates[id].facts=[{text:originCourse,source:reference},{text:distribution,source:reference}];
}
// Nerves: source branch groups remain grouped; a group does not imply every axon reaches every target.
nv('median-nerve','Formed by lateral and medial plexus cords; descends with the brachial artery, passes between pronator heads and through the carpal tunnel.','Motor to most forearm flexors, abductor pollicis brevis, opponens pollicis, usually superficial flexor pollicis brevis and lumbricals 1–2; sensory to the radial palm and lateral 3½ digits, including distal dorsal skin. Flexor pollicis brevis supply varies.',['roots-of-brachial-plexus','anterior-interosseous-nerve-of-forearm','muscular-branches-of-median-nerve','palmar-branch-of-median-nerve','common-palmar-digital-branches-of-median-nerve','flexor-retinaculum-of-wrist'],refs.nerves);
nv('ulnar-nerve','From the medial cord (chiefly C8–T1); passes behind the medial epicondyle, between flexor carpi ulnaris heads and into the hand superficial to the retinaculum.','Motor to flexor carpi ulnaris, medial profundus and most intrinsic hand muscles; sensory to medial hand and medial 1½ digits.',['humerus','deep-branch-of-ulnar-nerve','superficial-branch-of-ulnar-nerve','dorsal-branch-of-ulnar-nerve','muscular-branches-of-ulnar-nerve'],refs.nerves);
nv('radial-nerve','Posterior cord continuation, chiefly C5–T1; follows the humeral radial groove and divides near the lateral elbow.','Motor to posterior arm/forearm muscles and brachioradialis; sensory branches serve posterior limb and dorsolateral hand.',['posterior-cord-of-brachial-plexus','humerus','deep-branch-of-radial-nerve','superficial-branch-of-radial-nerve','muscular-branches-of-radial-nerve'],refs.nerves);
nv('musculocutaneous-nerve','Lateral cord branch (C5–C7) piercing coracobrachialis and passing between biceps and brachialis.','Motor to the anterior arm; continues as lateral forearm cutaneous nerve.',['coracobrachialis-muscle','brachialis-muscle','long-head-of-biceps-brachii','short-head-of-biceps-brachii','lateral-antebrachial-cutaneous-nerve'],refs.nerves);
nv('axillary-nerve','Posterior cord branch C5–C6 through the quadrangular space around the humeral surgical neck.','Motor to deltoid and teres minor; superior lateral cutaneous branch serves the proximal lateral arm.',['posterior-cord-of-brachial-plexus','humerus','superior-lateral-brachial-cutaneous-nerve','muscular-branches-of-axillary-nerve','posterior-circumflex-humeral-artery'],refs.nerves);
nv('anterior-interosseous-nerve-of-forearm','Median branch descending on the anterior interosseous membrane.','Motor to long thumb flexor, lateral profundus and pronator quadratus; articular sensory fibers, no cutaneous territory.',['median-nerve','interosseous-membrane-of-forearm','pronator-quadratus','flexor-pollicis-longus','flexor-digitorum-profundus'],refs.nerves);
nv('deep-branch-of-radial-nerve','Radial nerve branch winding through supinator around the proximal radius.','Supplies supinator and often extensor carpi radialis brevis; continues as posterior interosseous nerve. Brevis branching and deep-radial/posterior-interosseous terminology vary.',['radial-nerve','supinator','posterior-interosseous-nerve-of-forearm'],refs.radialStudy);
nv('posterior-interosseous-nerve-of-forearm','Continuation of deep radial nerve after supinator in this atlas convention.','Motor to posterior forearm extensors; terminal articular branches reach the wrist, without a skin territory.',['deep-branch-of-radial-nerve','posterior-interosseous-artery'],refs.radialStudy);
nv('superficial-branch-of-radial-nerve','Radial branch descending deep to brachioradialis then becoming subcutaneous at the distal forearm.','Cutaneous to dorsolateral wrist and hand and proximal dorsal lateral digits; palmar digital nerves serve nail beds.',['radial-nerve','brachioradialis-muscle','dorsal-digital-branches-of-radial-nerve'],refs.nerves);
nv('deep-branch-of-ulnar-nerve','Ulnar terminal branch passes through hypothenar muscles and crosses the deep palm with the deep arch.','Motor to abductor, flexor and opponens digiti minimi, interossei, adductor pollicis and lumbricals 3–4; deep flexor pollicis brevis can receive ulnar, median or dual supply. Palmaris brevis receives the superficial ulnar branch.',['ulnar-nerve','deep-palmar-arch'],refs.nerves);
nv('superficial-branch-of-ulnar-nerve','Ulnar terminal branch arising in the ulnar wrist canal (Guyon canal).','Mainly cutaneous to medial palm/digits; supplies palmaris brevis and gives digital branches.',['ulnar-nerve','common-palmar-digital-branches-of-ulnar-nerve'],refs.nerves);
nv('dorsal-branch-of-ulnar-nerve','Ulnar branch arising in the distal forearm and turning onto the dorsum of the hand.','Skin of dorsomedial hand and proximal medial 1½ digits.',['ulnar-nerve','dorsal-digital-branches-of-ulnar-nerve'],refs.nerves);
for(const parent of ['median','ulnar']){
 const territory=parent==='median'?'lateral 3½ digits':'medial 1½ digits';
 nv('common-palmar-digital-branches-of-'+parent+'-nerve',`Grouped ${parent} digital branches crossing the palm toward web spaces.`,`Divide into proper branches for ${territory}.${parent==='median'?' Some median digital branches also carry lumbrical motor fibers.':''}`,[parent==='median'?'median-nerve':'superficial-branch-of-ulnar-nerve','proper-palmar-digital-branches-of-'+parent+'-nerve'],refs.nerves);
 nv('proper-palmar-digital-branches-of-'+parent+'-nerve',`Grouped ${parent} branches along finger sides, arising directly or through common palmar digital nerves.`,`Sensation in ${territory}, including distal dorsal skin and nail beds; overlap and communications vary.`,['common-palmar-digital-branches-of-'+parent+'-nerve',parent==='median'?'median-nerve':'superficial-branch-of-ulnar-nerve'],refs.nerves);
 nv('palmar-branch-of-'+parent+'-nerve',`${parent} cutaneous branch arising proximal to the wrist and passing superficial to the flexor retinaculum.`,`Sensory to ${parent==='median'?'central/radial':'medial'} palmar skin; no skeletal muscle motor supply.`,[parent+'-nerve','flexor-retinaculum-of-wrist'],refs.nerves);
 nv('dorsal-digital-branches-of-'+(parent==='median'?'radial':parent)+'-nerve',`Grouped dorsal digital branches of ${parent==='median'?'superficial radial':'dorsal ulnar'} nerve on the hand.`,`Sensory to proximal dorsal ${territory}; palmar nerves supply the fingertip/nail-bed region.`,[parent==='median'?'superficial-branch-of-radial-nerve':'dorsal-branch-of-ulnar-nerve'],refs.nerves);
}
for(const [id,parent,course,area] of [
 ['lateral-antebrachial-cutaneous-nerve','musculocutaneous-nerve','Emerges lateral to biceps tendon','lateral forearm'],
 ['medial-antebrachial-cutaneous-nerve','roots-of-brachial-plexus','Medial cord branch descending beside basilic vein','medial forearm'],
 ['anterior-branch-of-medial-antebrachial-cutaneous-nerve','medial-antebrachial-cutaneous-nerve','Anterior terminal branch across the medial elbow','anteromedial forearm'],
 ['posterior-branch-of-medial-antebrachial-cutaneous-nerve','medial-antebrachial-cutaneous-nerve','Posterior terminal branch behind the medial elbow','posteromedial forearm'],
 ['posterior-antebrachial-cutaneous-nerve','radial-nerve','Radial branch passing posterior to the lateral epicondyle','posterior forearm'],
 ['medial-brachial-cutaneous-nerve','roots-of-brachial-plexus','Medial cord branch along the medial arm','medial arm'],
 ['inferior-lateral-brachial-cutaneous-nerve','radial-nerve','Radial branch emerging near the lateral intermuscular septum','distal lateral arm'],
 ['superior-lateral-brachial-cutaneous-nerve','axillary-nerve','Axillary branch emerging behind deltoid','proximal lateral arm'],
])nv(id,course+'.','Cutaneous sensory distribution to '+area+'; no skeletal muscle motor supply. Cutaneous nerves also convey sympathetic fibers to skin.',[parent],refs.nerves);
for(const [id,origin,course,target] of [
 ['dorsal-scapular-nerve','C5 root','pierces middle scalene and follows the medial scapular border','rhomboids and levator scapulae'],
 ['suprascapular-nerve','Superior trunk C5–C6','crosses beneath the superior transverse scapular ligament to the supra- and infraspinous fossae','supraspinatus and infraspinatus'],
 ['superior-subscapular-nerve','Posterior cord C5–C6','reaches the anterior subscapular surface','subscapularis'],
 ['inferior-subscapular-nerve','Posterior cord C5–C6','descends over subscapularis toward teres major','subscapularis and teres major'],
 ['thoracodorsal-nerve','Posterior cord C6–C8','descends with thoracodorsal vessels on the posterior axillary wall','latissimus dorsi'],
 ['long-thoracic-nerve','Ventral rami C5–C7','descends superficially on serratus anterior','serratus anterior'],
 ['subclavian-nerve','Superior trunk C5–C6','descends behind the clavicle','subclavius'],
 ['lateral-pectoral-nerve','Lateral cord C5–C7','crosses the axillary vessels through clavipectoral fascia','pectoralis major'],
 ['medial-pectoral-nerve','Medial cord C8–T1','usually pierces pectoralis minor','pectoralis minor and major'],
])nv(id,origin+'; '+course+'.','Motor supply to '+target+'; no named cutaneous territory.',[],refs.nerves);
for(const parent of ['median','ulnar','radial','axillary'])nv('muscular-branches-of-'+parent+'-nerve',`Grouped short motor branches leaving the ${parent} nerve along its regional course.`,`Serve the ${parent==='median'?'median-innervated forearm flexors':parent==='ulnar'?'ulnar wrist flexor and medial profundus':parent==='axillary'?'deltoid and teres minor':'radial-innervated arm and forearm muscles'}. Individual branch-to-belly mesh assignments are not resolved.`,[parent+'-nerve'],refs.nerves);
nv('communicating-branch-of-median-nerve-with-ulnar-nerve','A communicating branch between the median and ulnar nerves; its level and fiber direction vary.','Unresolved: the source object alone does not establish a Martin–Gruber, Riche–Cannieu or other named variant, nor its motor/sensory content.',['median-nerve','ulnar-nerve'],refs.nerves);
supportTemplates['communicating-branch-of-median-nerve-with-ulnar-nerve'].gap='Variant subtype, level and axon distribution need source-specific validation.';
nv('roots-of-brachial-plexus','Grouped ventral rami C5–T1, emerging between anterior and middle scalene.','Recombine into upper, middle and lower trunks; provide mixed upper-limb fibers.',['superior-trunk-of-brachial-plexus','middle-trunk-of-brachial-plexus','inferior-trunk-of-brachial-plexus'],refs.plexus);
for(const [level,roots] of [['superior','C5–C6'],['middle','C7'],['inferior','C8–T1']]){
 nv(level+'-trunk-of-brachial-plexus',`Plexus trunk formed from ${roots} ventral rami in the lower posterior neck.`,`Divides behind the clavicle into anterior and posterior divisions; carries mixed fibers rather than a single end-organ territory.`,['roots-of-brachial-plexus','anterior-division-of-'+level+'-trunk-of-brachial-plexus','posterior-division-of-'+level+'-trunk-of-brachial-plexus'],refs.plexus);
 for(const division of ['anterior','posterior'])nv(division+'-division-of-'+level+'-trunk-of-brachial-plexus',`${division} division of the ${level} trunk behind the clavicle.`,division==='posterior'?'Joins the other posterior divisions to form the posterior cord, routing mixed fibers to extensor territories.':level==='inferior'?'Continues into the medial cord, chiefly C8–T1 fibers.':'Joins the other upper/middle anterior division in the lateral cord.',[level+'-trunk-of-brachial-plexus',...(division==='posterior'?['posterior-cord-of-brachial-plexus']:[])],refs.plexus);
}
nv('posterior-cord-of-brachial-plexus','Union of all three posterior divisions behind the second part of the axillary artery.','Gives subscapular, thoracodorsal, axillary and radial nerves.',['posterior-division-of-superior-trunk-of-brachial-plexus','posterior-division-of-middle-trunk-of-brachial-plexus','posterior-division-of-inferior-trunk-of-brachial-plexus','radial-nerve','axillary-nerve','thoracodorsal-nerve','superior-subscapular-nerve','inferior-subscapular-nerve'],refs.plexus);
nv('anterior-root-of-spinal-nerve','Grouped ventral spinal roots leave the anterior cord and join dorsal roots distal to the ganglia.','Efferent fibers: somatic motor and, at appropriate levels, preganglionic autonomic fibers. The segmental roots are grouped together.',['posterior-root-of-spinal-nerve','spinal-ganglion'],refs.spinal);
nv('posterior-root-of-spinal-nerve','Grouped dorsal roots connect sensory ganglia to the spinal cord; central processes enter the cord dorsally.','Afferent somatic and visceral sensory fibers; distinct from mixed dorsal rami after nerve formation.',['anterior-root-of-spinal-nerve','spinal-ganglion'],refs.spinal);
nv('spinal-ganglion','Grouped dorsal root ganglia in or near intervertebral foramina.','Contain primary sensory neuron cell bodies; do not contain somatic motor neuron cell bodies.',['posterior-root-of-spinal-nerve'],refs.spinal);
nv('intercostal-nerves','Grouped anterior rami T1–T11 run in intercostal spaces, principally between internal and innermost intercostal muscles. T12 is the subcostal nerve.','Motor to intercostal and some thoracoabdominal muscles; sensory to thoracic/abdominal walls. T1 contributes to the plexus and T2 has an intercostobrachial branch.',['posterior-intercostal-arteries'],refs.thoraxNerves);
// Arteries: origin, course and supplied territory; bilateral rows reuse anatomical facts.
for(const [id,course,territory,parent] of [
 ['brachial-artery','Axillary continuation below teres major, along medial arm to the cubital fossa','Arm; divides into radial and ulnar arteries',''],
 ['radial-artery','Brachial branch through lateral forearm, anatomical snuffbox and first intermetacarpal space','Lateral forearm, dorsal carpal network and predominantly deep palmar arch','brachial-artery'],
 ['ulnar-artery','Brachial branch passing deep to pronator teres then along medial forearm and superficial to flexor retinaculum','Medial forearm and predominantly superficial palmar arch; gives common interosseous artery','brachial-artery'],
 ['deep-brachial-artery','Brachial branch accompanying radial nerve in the humeral radial groove','Posterior arm and radial/middle collateral branches','brachial-artery'],
 ['anterior-circumflex-humeral-artery','Third-part axillary branch encircling anterior surgical neck','Proximal humerus and adjacent shoulder tissues; joins posterior circumflex branches',''],
 ['posterior-circumflex-humeral-artery','Third-part axillary branch with axillary nerve through quadrangular space','Deltoid, teres minor and shoulder capsule',''],
 ['subscapular-artery','Third-part axillary branch down posterior axillary wall','Scapular/axillary tissues; divides into circumflex scapular and thoracodorsal branches',''],
 ['circumflex-scapular-artery','Subscapular branch through triangular space onto posterior scapula','Teres muscles and infraspinatus; joins scapular arterial anastomoses','subscapular-artery'],
 ['thoracodorsal-artery','Subscapular branch down posterior axillary wall with thoracodorsal nerve','Latissimus dorsi','subscapular-artery'],
 ['suprascapular-artery','Usually thyrocervical trunk branch toward superior scapula, generally above the transverse scapular ligament','Supra- and infraspinous fossae and scapular anastomosis',''],
 ['transverse-cervical-artery','Thyrocervical trunk branch crossing the posterior neck','Trapezius via superficial branch; deep branch can supply the dorsal scapular territory',''],
 ['superficial-branch-of-transverse-cervical-artery','Transverse cervical superficial branch deep to trapezius','Trapezius and adjacent posterior neck tissues','transverse-cervical-artery'],
 ['deep-branch-of-transverse-cervical-artery','Deep transverse cervical branch toward the medial scapular border','Rhomboids and levator scapulae; dorsal scapular artery may instead arise independently from subclavian','transverse-cervical-artery'],
 ['deep-cervical-artery','Costocervical trunk branch passes posteriorly near rib 1 into deep neck','Deep cervical muscles and segmental spinal branches',''],
 ['vertebral-artery','Subclavian branch typically enters C6 transverse foramen, ascends to C1 then curves into the foramen magnum','Posterior cranial circulation, upper spinal cord and deep neck branches',''],
 ['common-interosseous-artery','Short proximal ulnar branch toward the interosseous membrane','Divides into anterior and posterior interosseous arteries','ulnar-artery'],
 ['posterior-interosseous-artery','Common interosseous branch passing to posterior forearm through the proximal interosseous interval','Extensor compartment and dorsal carpal branches; gives recurrent interosseous branch','common-interosseous-artery'],
 ['recurrent-interosseous-artery','Posterior interosseous branch ascending behind the elbow','Anconeus and elbow anastomosis with middle collateral artery','posterior-interosseous-artery'],
 ['radial-collateral-artery','Deep brachial terminal branch descending toward the lateral elbow','Lateral arm and elbow; joins radial recurrent artery','deep-brachial-artery'],
 ['middle-collateral-artery','Deep brachial terminal branch descending behind the lateral elbow','Posterior elbow; joins recurrent interosseous artery','deep-brachial-artery'],
 ['superior-ulnar-collateral-artery','Brachial branch with ulnar nerve behind the medial epicondyle','Medial elbow network; joins posterior ulnar recurrent artery','brachial-artery'],
 ['inferior-ulnar-collateral-artery','Distal brachial branch toward the medial elbow','Medial elbow network; joins anterior ulnar recurrent artery','brachial-artery'],
 ['ulnar-recurrent-artery','Grouped recurrent ulnar branches ascending anterior/posterior to the medial elbow','Medial elbow and proximal flexors; anterior and posterior branches form an elbow anastomosis','ulnar-artery'],
 ['deep-palmar-arch','Mainly radial artery completed by deep ulnar branch across metacarpal bases','Deep palm; palmar metacarpal and perforating branches','radial-artery'],
 ['superficial-palmar-arch','Mainly ulnar artery, variably completed by superficial radial branch beneath palmar fascia','Superficial palm and common palmar digital branches','ulnar-artery'],
 ['common-palmar-digital-arteries','Grouped superficial arch branches crossing toward digital webs','Divide into proper digital vessels for adjacent finger sides','superficial-palmar-arch'],
 ['proper-palmar-digital-arteries','Grouped palmar finger vessels, commonly from common digital arteries; thumb/radial index supply also receives radial arterial branches','Palmar finger tissues and distal dorsal/nail-bed circulation','common-palmar-digital-arteries'],
 ['palmar-metacarpal-arteries','Grouped deep arch branches in intermetacarpal spaces','Deep palm and connections with common digital vessels','deep-palmar-arch'],
 ['palmar-carpal-branch-of-radial-artery','Distal radial branch crossing the palmar carpus','Palmar carpal arterial network and carpal bones','radial-artery'],
 ['dorsal-carpal-branch-of-ulnar-artery','Distal ulnar branch turning onto dorsal carpus','Dorsal carpal arterial network','ulnar-artery'],
 ['dorsal-carpal-anastomosis','Network joining radial, ulnar and interosseous branches on the dorsal wrist','Carpus and dorsal metacarpal branches',''],
 ['dorsal-metacarpal-arteries','Grouped dorsal metacarpal vessels: first usually from radial artery, second to fourth from the dorsal carpal network','Dorsal hand; divide into dorsal digital branches','dorsal-carpal-anastomosis'],
 ['dorsal-digital-arteries-of-hand','Grouped dorsal metacarpal terminal branches along dorsal finger margins','Proximal dorsal digits; distal tips predominantly supplied by palmar digital vessels','dorsal-metacarpal-arteries'],
 ['first-posterior-intercostal-artery','Supreme intercostal branch from costocervical trunk in intercostal space 1','Upper posterior chest wall and segmental back branches',''],
 ['second-posterior-intercostal-artery','Supreme intercostal branch in intercostal space 2','Second intercostal space and segmental dorsal branches',''],
 ['posterior-intercostal-arteries','Grouped descending thoracic aortic branches for intercostal spaces 3–11','Intercostal walls, vertebral/spinal branches and posterior muscles; first two levels have a different origin',''],
 ['lumbar-arteries','Grouped paired abdominal aortic branches around lumbar vertebral bodies','Posterior abdominal wall, deep back, vertebral and spinal branches',''],
 ['lumbar-branch-of-iliolumbar-artery','Iliolumbar branch, usually from posterior internal iliac division, ascending toward lumbar muscles','Psoas, quadratus lumborum and adjacent posterior wall',''],
 ['spinal-branch-of-iliolumbar-artery','Iliolumbar spinal branch approaching lumbosacral intervertebral foramina','Spinal canal coverings and adjacent neural tissues','lumbar-branch-of-iliolumbar-artery'],
])nv(id,course+'.',territory+'.',parent?[parent]:[],/iliolumbar/.test(id)?refs.pelvicArteries:/intercostal|lumbar|deep-cervical|vertebral|transverse-cervical/.test(id)?refs.backArteries:refs.arteries);
// Veins: source groups describe drainage, without inventing individual tributary mesh assignments.
for(const [id,course,drain,targets] of [
 ['cephalic-vein','From lateral dorsal hand network up lateral forearm and arm, through deltopectoral groove','Drains lateral superficial limb into axillary vein',['dorsal-venous-network-of-hand','axillary-vein','median-cubital-vein']],
 ['basilic-vein','From medial dorsal hand network up medial forearm, piercing arm fascia','Joins brachial veins near teres major to form axillary vein',['dorsal-venous-network-of-hand','brachial-veins','axillary-vein']],
 ['median-cubital-vein','Superficial oblique connection across the cubital fossa, usually superficial to bicipital aponeurosis','Usually shunts cephalic blood toward basilic; pattern varies',['cephalic-vein','basilic-vein']],
 ['median-antebrachial-vein','Superficial anterior forearm vein rising from palmar superficial tributaries','Drains variably to basilic or median cubital vein',['basilic-vein','median-cubital-vein']],
 ['axillary-vein','Union of basilic and brachial veins near inferior teres major, medial to axillary artery','Receives cephalic and regional veins; becomes subclavian at lateral rib 1',['brachial-veins','basilic-vein','cephalic-vein']],
 ['brachial-veins','Paired venae comitantes beside brachial artery','Receive forearm deep veins and join basilic to form axillary',['brachial-artery','ulnar-veins','axillary-vein']],
 ['ulnar-veins','Paired deep companions of ulnar artery','Drain medial forearm and deep hand toward brachial veins',['ulnar-artery','brachial-veins']],
 ['dorsal-venous-network-of-hand','Superficial network across dorsal metacarpal region receiving digital tributaries','Drains laterally to cephalic and medially to basilic',['dorsal-digital-veins-of-hand','cephalic-vein','basilic-vein']],
 ['dorsal-digital-veins-of-hand','Grouped superficial veins along dorsal digits','Return digital blood toward dorsal hand network',['dorsal-venous-network-of-hand']],
 ['palmar-digital-veins','Grouped veins along palmar finger sides','Drain to palmar venous arches and communicate with dorsal veins',['superficial-venous-palmar-arch','deep-venous-palmar-arch']],
 ['superficial-venous-palmar-arch','Superficial palmar venous network receiving finger tributaries','Drains via forearm superficial veins and communicates with deep veins',['palmar-digital-veins','median-antebrachial-vein']],
 ['deep-venous-palmar-arch','Deep companion venous network in the palm','Returns deep hand blood toward radial/ulnar venae comitantes',['palmar-digital-veins','ulnar-veins']],
 ['anterior-circumflex-humeral-vein','Companion of anterior circumflex humeral artery around anterior proximal humerus','Drains proximal humeral/shoulder tissues into axillary vein',['anterior-circumflex-humeral-artery','axillary-vein']],
 ['posterior-circumflex-humeral-vein','Companion of posterior circumflex humeral artery through quadrangular space','Returns deltoid and posterior shoulder blood to axillary vein',['posterior-circumflex-humeral-artery','axillary-vein']],
 ['subscapular-vein','Companion drainage on posterior axillary wall','Receives scapular and thoracodorsal tributaries, drains toward axillary vein',['subscapular-artery','circumflex-scapular-vein','axillary-vein']],
 ['circumflex-scapular-vein','Companion of circumflex scapular artery around lateral scapular border','Drains posterior scapular tissues into subscapular venous system',['circumflex-scapular-artery','subscapular-vein']],
 ['suprascapular-vein','Companion drainage from supra- and infraspinous fossae toward the lower neck','Drains the scapular region toward external jugular and subclavian venous drainage; individual termination varies',['suprascapular-artery']],
 ['vertebral-vein','Venous plexus accompanying vertebral artery through cervical transverse foramina','Deep neck and vertebral plexus blood drains toward brachiocephalic vein',['vertebral-artery']],
 ['lumbar-veins','Grouped segmental veins around lumbar vertebral bodies with ascending lumbar communications','Drain posterior wall to inferior vena cava and ascending lumbar/azygos pathways',[]],
 ['lateral-sacral-veins','Companion drainage beside sacrum communicating with sacral venous plexuses','Drain sacral tissues toward internal iliac veins',['sacrum']],
] as [string,string,string,string[]][])nv(id,course+'.',drain+'.',targets,id==='suprascapular-vein'?refs.neckVeins:id==='vertebral-vein'?refs.thoraxVeins:id==='lateral-sacral-veins'?refs.pelvicVeins:id==='lumbar-veins'?refs.vessels:refs.veins);
// Ligaments: distinct attachment/joint functions. Source nomenclature ambiguities are not silently merged.
for(const [id,attachments,role,hosts] of [
 ['acromioclavicular-ligament','Acromion to lateral clavicle; superior capsular reinforcement','Reinforces the AC capsule and contributes to acromioclavicular stability','scapula,clavicle'],
 ['conoid-ligament','Coracoid base to conoid tubercle of the clavicle','Medial coracoclavicular band limiting superior displacement of clavicle relative to scapula','scapula,clavicle'],
 ['trapezoid-ligament','Superior coracoid to trapezoid line of clavicle','Lateral coracoclavicular band contributing to suspension and alignment of the scapula relative to the clavicle','scapula,clavicle'],
 ['coraco-acromial-ligament','Coracoid process to acromion','Forms coracoacromial arch above the humeral head; not a bone articulation','scapula'],
 ['coracohumeral-ligament','Lateral coracoid base to greater/lesser humeral tubercle region','Reinforces the rotator interval and contributes to restraint of external rotation, particularly at low shoulder elevation','scapula,humerus'],
 ['superior-glenohumeral-ligament','Superior glenoid margin/labrum to proximal humerus near lesser tubercle','Reinforces the anterosuperior shoulder capsule; restraint depends on arm position','scapula,humerus,glenoid-labrum'],
 ['middle-glenohumeral-ligament','Anterior glenoid margin to anterior anatomical humeral neck','Reinforces the anterior shoulder capsule; size and presence vary','scapula,humerus,glenoid-labrum'],
 ['inferior-glenohumeral-ligament','Inferior glenoid/labrum to inferior humeral neck as an axillary pouch and bands','Reinforces the inferior shoulder capsule; its bands and axillary pouch contribute to stability with the arm abducted','scapula,humerus,glenoid-labrum'],
 ['transverse-humeral-ligament','Across greater and lesser tubercle region above the bicipital groove','Contributes to the roof over the long biceps tendon; cadaver studies question whether it is a separate ligament rather than continuous cuff/coracohumeral fibers','humerus,long-head-of-biceps-brachii'],
 ['superior-transverse-scapular-ligament','Across suprascapular notch','Creates passage beneath it for suprascapular nerve; artery generally passes above','scapula,suprascapular-nerve'],
 ['inferior-transverse-scapular-ligament','Scapular spine region across spinoglenoid notch','Bridges passage of suprascapular neurovascular structures toward infraspinatus','scapula,suprascapular-nerve'],
 ['anterior-sternoclavicular-ligament','Anterior medial clavicle to anterior manubrium/first costal cartilage region','Strengthens anterior SC capsule','clavicle,first-rib'],
 ['posterior-sternoclavicular-ligament','Posterior medial clavicle to posterior manubrium','Strengthens posterior SC capsule','clavicle'],
 ['interclavicular-ligament','Medial clavicle to opposite clavicle across superior manubrium','Limits excessive clavicular depression at SC joints','clavicle'],
 ['costoclavicular-ligament','First rib/costal cartilage to inferior medial clavicle','Anchors clavicle and limits excessive elevation at SC joint','clavicle,first-rib'],
 ['annular-ligament-of-radius','Anterior to posterior margins of ulnar radial notch, encircling radial head','Retains radial head during proximal radioulnar rotation','ulna,radius'],
 ['radial-collateral-ligament','Lateral humeral epicondyle to annular ligament complex','Lateral elbow capsular restraint; does not insert directly into a carpal bone','humerus,annular-ligament-of-radius'],
 ['ulnar-collateral-ligament','Medial humeral epicondyle to ulnar coronoid and olecranon','Resists valgus stress at elbow','humerus,ulna'],
 ['quadrate-ligament','Inferior ulnar radial notch to proximal radial neck','Stabilizes proximal radioulnar joint and limits terminal rotation','ulna,radius'],
 ['oblique-cord','Proximal ulna near tuberosity to radius below radial tuberosity','Proximal radioulnar fibrous link, with modest restraint to separation','ulna,radius'],
 ['interosseous-membrane-of-forearm','Radial to ulnar interosseous borders along shafts','Transfers load from radius to ulna, separates forearm compartments and provides muscular origins','radius,ulna'],
 ['radial-collateral-ligament-of-wrist-joint','Radial styloid to scaphoid/trapezial region','Limits ulnar deviation at wrist','radius,scaphoid-bone,trapezium-bone'],
 ['ulnar-collateral-ligament-of-wrist-joint','Ulnar styloid to triquetrum/pisiform region','Supports ulnar wrist and limits radial deviation','ulna,triquetrum-bone,pisiform-bone'],
 ['dorsal-radio-ulnar-ligament','Dorsal distal radial sigmoid-notch margin to ulnar foveal/styloid region','TFCC component stabilizing distal radioulnar joint during rotation','radius,ulna'],
 ['palmar-radio-ulnar-ligament','Palmar distal radial sigmoid-notch margin to ulnar foveal/styloid region','TFCC component stabilizing distal radioulnar joint during rotation','radius,ulna'],
 ['articular-disc-of-distal-radio-ulnar-joint','Ulnar notch of distal radius to ulnar fovea/styloid base','Fibrocartilaginous TFCC disc separates ulna from carpus and distributes load; source-classified as ligament','radius,ulna'],
 ['dorsal-radiocarpal-ligament','Dorsal distal radius toward dorsal triquetrum with carpal expansions','Guides radiocarpal motion and resists excessive volar translation','radius,triquetrum-bone'],
 ['radioscaphocapitate-ligament','Palmar distal radius across scaphoid to capitate','Supports palmar radial wrist and constrains scaphoid motion','radius,scaphoid-bone,capitate-bone'],
 ['pisohamate-ligament','Pisiform to hamate hook','Continuation of FCU force pathway and ulnar carpal support','pisiform-bone,hamate-bone'],
 ['pisometacarpal-ligament','Pisiform to base of metacarpal 5','Continuation of FCU force pathway and hypothenar support','pisiform-bone,fifth-metacarpal-bone'],
 ['pisotriquetral-ligament','Pisiform to triquetrum','Reinforces pisotriquetral capsule','pisiform-bone,triquetrum-bone'],
 ['scapholunate-interosseous-ligament','Scaphoid to lunate on dorsal, proximal and palmar aspects','Coordinates proximal carpal row; dorsal portion is a major stabilizer','scaphoid-bone,lunate-bone'],
 ['lunotriquetral-interosseous-ligament','Lunate to triquetrum','Maintains proximal-row alignment','lunate-bone,triquetrum-bone'],
 ['capitohamate-interosseous-ligament','Capitate to hamate between opposing surfaces','Binds distal-row carpal bones','capitate-bone,hamate-bone'],
 ['trapeziotrapezoidal-interosseous-ligament','Trapezium to trapezoid','Stabilizes the radial distal carpal row','trapezium-bone,trapezoid-bone'],
 ['trapezoideocapitate-interosseous-ligament','Trapezoid to capitate','Stabilizes central distal carpal row','trapezoid-bone,capitate-bone'],
 ['scaphocapitate-ligament','Palmar scaphoid to capitate','Supports midcarpal stability and scaphoid alignment','scaphoid-bone,capitate-bone'],
 ['scaphotrapeziotrapezoidal-ligament','Distal scaphoid to trapezium and trapezoid','Supports scaphotrapeziotrapezoidal complex','scaphoid-bone,trapezium-bone,trapezoid-bone'],
 ['triquetrocapitate-ligament','Palmar triquetrum to capitate','Supports ulnar midcarpal alignment','triquetrum-bone,capitate-bone'],
 ['triquetrohamate-ligament','Palmar triquetrum to hamate','Supports ulnar midcarpal alignment','triquetrum-bone,hamate-bone'],
 ['ulnocapitate-ligament','Ulnar foveal region, confluent with deep palmar radioulnar fibers, to ulnopalmar capitate','Supports ulnocarpal stability','ulna,capitate-bone'],
 ['ulnolunate-ligament','Palmar radioulnar ligament region to palmar lunate','Supports lunate on the ulnar side of wrist','ulna,lunate-bone'],
 ['ulnotriquetral-ligament','Mainly palmar radioulnar ligament, with ulnar styloid fibers, to proximal/ulnar triquetrum','Supports triquetrum and ulnocarpal stability','ulna,triquetrum-bone'],
])add(id,attachments+'.',role+'.',attachments+'.',hosts.split(','),[/carp|wrist|radio-ulnar|pis|capitate|triquetral|trapez/.test(id)?refs.wrist:refs.joints]);
for(const [id,a,b] of [['palmar-capitohamate-ligament','capitate','hamate'],['palmar-lunotriquetral-ligament','lunate','triquetrum'],['palmar-trapezoideocapitate-ligament','trapezoid','capitate'],['dorsal-scaphotriquetral-ligament','scaphoid','triquetrum'],['palmar-scaphotriquetral-ligament','scaphoid','triquetrum']])add(id,`${id.startsWith('dorsal')?'dorsal':'palmar'} band linking ${a} and ${b}.`,'Maintains intercarpal alignment during wrist movement.',`${a} ↔ ${b}.`,[a+'-bone',b+'-bone'],[refs.wrist]);
for(const [id,attachment,role] of [
 ['anterior-longitudinal-ligament','Anterior vertebral bodies and discs from cranial base to sacrum','Resists excessive spinal extension'],
 ['posterior-longitudinal-ligament','Posterior vertebral bodies/discs inside the canal from C2 to sacrum','Resists excessive flexion and supports posterior disc margins; continues cranially as tectorial membrane'],
 ['interspinous-ligaments','Between adjacent spinous processes','Limits excessive spinal flexion'],
 ['supraspinous-ligament','Spinous process tips from C7 toward sacrum','Limits excessive flexion and blends superiorly with nuchal ligament'],
 ['ligamenta-flava','Adjacent vertebral laminae, predominantly elastic tissue','Supports posterior canal wall and recoils after flexion'],
 ['nuchal-ligament','Occipital midline and posterior cervical spinous processes','Supports the head and provides cervical muscle origins'],
])add(id,attachment+'.',role+'.',attachment+'.',[],[refs.axial]);
for(const [id,joint,attachment,hosts] of [
 ['articular-capsule-of-acromioclavicular-joint','AC','Acromial and lateral clavicular articular margins','scapula,clavicle'],
 ['articular-capsule-of-sternoclavicular-joint','SC','Medial clavicle and manubrial/first costal articular margins','clavicle,first-rib'],
 ['articular-capsule-of-glenohumeral-joint','glenohumeral','Glenoid margin/labrum and humeral anatomical neck, with inferior redundancy','scapula,humerus,glenoid-labrum'],
 ['articular-capsule-of-elbow-joint','elbow','Humerus above articular fossae to ulnar coronoid/olecranon margins and annular ligament','humerus,ulna,annular-ligament-of-radius'],
 ['articular-capsule-of-radiocarpal-joint','radiocarpal','Distal radial/disc margins to proximal carpal row','radius,scaphoid-bone,lunate-bone,triquetrum-bone'],
])add(id,`Fibrous outer capsule of the ${joint} joint. ${attachment}.`,`Encloses the ${joint} synovial cavity and supports controlled movement.`,attachment+'.',hosts.split(','),[refs.joints,refs.wrist]);
const handBones=manifest.structures.filter(r=>r.tissue==='bone'&&/metacarpal|phalanx/.test(r.id)).map(r=>baseId(r.id));
for(const [id,attachment,role] of [
 ['collateral-metacarpophalangeal-ligaments','Sides of metacarpal heads to proximal phalangeal bases and palmar plates','Limits lateral MCP displacement; proper bands tighten in flexion'],
 ['collateral-interphalangeal-ligaments-of-hand','Sides of each IP joint: the head of its proximal member to the base of its distal member and palmar plate (PIP: proximal to middle phalanx; DIP: middle to distal; thumb: proximal to distal)','Limits lateral IP displacement'],
 ['palmar-interphalangeal-ligaments','Fibrocartilaginous palmar plates between phalangeal heads and more distal bases','Resists IP hyperextension and supports flexor tendon passage'],
 ['deep-transverse-metacarpal-ligament','Palmar plates of MCP joints 2–5, across metacarpal heads','Maintains distal metacarpal spacing; unlike superficial transverse band lies deep to digital neurovascular bundles'],
 ['dorsal-metacarpal-ligaments','Dorsal bases of adjacent metacarpals 2–5','Supports intermetacarpal base joints'],
 ['palmar-metacarpal-ligaments','Palmar bases of adjacent metacarpals 2–5','Supports intermetacarpal base joints'],
 ['interosseous-metacarpal-ligaments','Opposing base surfaces of metacarpals 2–5','Strongly binds adjacent metacarpal bases'],
 ['dorsal-carpometacarpal-ligaments','Dorsal distal carpal surfaces to metacarpal bases','Supports CMC joints; includes multiple dorsal bands'],
 ['palmar-carpometacarpal-ligaments','Palmar distal carpal surfaces to metacarpal bases','Supports CMC joints; thumb saddle joint has a distinct ligament arrangement'],
 ['dorsal-intercarpal-ligaments','Dorsal adjoining carpal surfaces across proximal and distal rows','Coordinates carpal movement and supports wrist stability'],
 ['articular-capsules-of-metacarpophalangeal-joints','Articular margins of metacarpal heads and proximal phalangeal bases','Encloses grouped MCP joints; palmar plates/collaterals reinforce them'],
 ['articular-capsules-of-proximal-interphalangeal-joints','Proximal phalangeal heads and middle phalangeal bases of digits 2–5','Encloses grouped PIP hinge joints'],
 ['articular-capsules-of-distal-interphalangeal-joints','Middle phalangeal heads and distal phalangeal bases of digits 2–5','Encloses grouped DIP hinge joints; thumb has a single IP joint'],
])add(id,attachment+'.',role+'.',attachment+'.',[],[refs.bones,refs.wrist]);
// Ambiguous source labels: provide known regional context and explicitly keep exact mapping unresolved.
for(const [id,context] of [
 ['radiocapitate-ligament','A source-named radial wrist band; correspondence with radioscaphocapitate or another component remains unresolved.'],
 ['radiate-carpal-ligament','A source-named radiating palmar carpal complex near the capitate; its constituent bands are not individually resolved.'],
 ['dorsal-ulnocarpal-ligament','A source-named dorsal ulnar wrist band; literature definitions and capsular boundaries differ.'],
 ['palmar-scaphotriquetral-ligament','A source-named palmar wrist band whose modern anatomical correspondence has not been established.'],
]){add(id,context,'Supports the named wrist region; a distinct band-specific stabilizing claim is withheld.','Unresolved: exact insertions and correspondence to modern ligament nomenclature require further anatomical review.',[],[refs.wrist]);supportTemplates[id].gap='Exact source-band attachment/modern nomenclature mapping unresolved.';}
// Fascia: anatomical layers are distinguished from muscle attachments and from exterior skin.
for(const [id,description,role,connection,hosts] of [
 ['brachial-fascia','Deep sleeve around the arm, continuous with shoulder and forearm fascia','Contains muscle compartments and gives off intermuscular septa','Shoulder fascia → humeral septa → antebrachial fascia','medial-intermuscular-septum-of-arm,lateral-intermuscular-septum-of-arm,antebrachial-fascia'],
 ['antebrachial-fascia','Deep forearm sleeve attaching to subcutaneous ulnar border and thickening near wrist retinacula','Separates/contains forearm compartments and provides muscular attachment','Brachial fascia → ulnar border → wrist retinacula','ulna,brachial-fascia,flexor-retinaculum-of-wrist,extensor-retinaculum-of-wrist'],
 ['deltoid-fascia','Deep fascia investing deltoid, attached to clavicle, acromion and scapular spine','Contains the deltoid and blends with arm fascia','Clavicle/acromion/scapular spine → brachial fascia','clavicle,scapula,brachial-fascia'],
 ['medial-intermuscular-septum-of-arm','Brachial fascial sheet attached to medial humeral ridge/epicondyle','Separates anterior and posterior arm compartments; pierced by ulnar nerve','Brachial fascia → medial humerus','brachial-fascia,humerus,ulnar-nerve'],
 ['lateral-intermuscular-septum-of-arm','Brachial fascial sheet attached to lateral humeral ridge/epicondyle','Separates arm compartments; radial nerve crosses it distally','Brachial fascia → lateral humerus','brachial-fascia,humerus,radial-nerve'],
 ['palmar-aponeurosis','Central triangular palmar fascia continuous proximally with palmaris longus/retinacular fascia','Anchors palmar skin and protects flexor tendons and digital neurovascular bundles','Proximal apex → four digital slips and fibrous flexor sheaths','palmaris-longus-muscle,flexor-retinaculum-of-wrist,superficial-transverse-metacarpal-ligament'],
 ['dorsal-fascia-of-hand','Thin dorsal hand fascia over extensor tendons, continuous with extensor retinaculum','Invests dorsal tendons and blends with metacarpal/interosseous fascia','Extensor retinaculum → dorsal hand/digital fascia','extensor-retinaculum-of-wrist,extensor-digitorum'],
])add(id,description+'.',role+'.',connection+'.',hosts.split(','),[refs.bones,refs.armMuscles]);
for(const [layer,description,connection,hosts] of [
 ['anterior','Thin layer anterior to quadratus lumborum in the traditional three-layer description','Lumbar transverse processes → rib 12 and iliac crest','vertebra-l1,vertebra-l2,vertebra-l3,vertebra-l4,vertebra-l5,twelfth-rib,quadratus-lumborum-muscle'],
 ['middle','Layer between quadratus lumborum and paraspinal muscles','Lumbar transverse process tips → rib 12 and iliac crest; lateral union with abdominal aponeurosis','vertebra-l1,vertebra-l2,vertebra-l3,vertebra-l4,vertebra-l5,twelfth-rib,quadratus-lumborum-muscle'],
 ['posterior','Multilaminar layer behind paraspinal muscles, continuous with latissimus and serratus posterior aponeuroses','Spinous processes/sacrum → lateral raphe and iliac crest','vertebra-l1,vertebra-l2,vertebra-l3,vertebra-l4,vertebra-l5,sacrum,latissimus-dorsi-muscle,serratus-posterior-inferior-muscle'],
])add(layer+'-layer-of-thoracolumbar-fascia',description+'.',layer==='anterior'?'Invests the anterior quadratus lumborum surface; this thin layer is often treated as transversalis fascia, and its mechanical contribution is uncertain.':'Contains regional muscles and participates in lumbopelvic tension transfer; layer definitions vary across authors.',connection+'.',hosts.split(','),[refs.fascia]);
// Bone landmarks; actual articulations are supplied by the independently reviewed joint graph.
for(const [id,description,role,connection] of [
 ['humerus','Arm long bone with head, greater/lesser tubercles, deltoid tuberosity, radial groove and distal trochlea/capitulum','Provides arm leverage and transfers loads from elbow to shoulder','Head ↔ glenoid; trochlea ↔ ulna; capitulum ↔ radius'],
 ['radius','Lateral forearm bone with disc-like head, radial tuberosity, distal styloid and ulnar notch','Rotates around ulna and transmits most wrist load proximally','Humerus and ulna proximally; ulna, scaphoid and lunate distally'],
 ['ulna','Medial forearm bone with olecranon, coronoid, trochlear/radial notches and distal head/styloid','Forms stable elbow hinge and supports forearm muscle attachments','Humeral trochlea and radius; distal ulna is separated from carpus by the TFCC disc'],
 ['clavicle','S-shaped shoulder-girdle strut with medial sternal and lateral acromial ends; inferior conoid/trapezoid attachment regions','Holds shoulder away from trunk and transfers limb load to axial skeleton','Sternum at SC joint; scapular acromion at AC joint'],
 ['scapula','Triangular shoulder blade with spine, acromion, coracoid, glenoid and supra-/infraspinous/subscapular fossae','Provides muscular leverage and glenoid socket','Humeral head at glenohumeral joint; clavicle at AC joint; scapulothoracic interface is functional, not a synovial articulation'],
 ['occipital-bone','Posteroinferior skull bone with foramen magnum, condyles and nuchal lines','Protects cranial contents and provides craniovertebral support and posterior neck attachments','Condyles ↔ atlas; adjacent skull bones lie outside this regional inventory'],
 ['atlas-c1','Ring-shaped C1 with anterior/posterior arches and lateral masses, lacking a typical body','Supports skull and permits craniovertebral movement','Occipital condyles above; axis below; anterior arch against dens'],
 ['axis-c2','C2 with dens projecting superiorly and a robust bifid spinous process','Provides pivot for head rotation and posterior muscle attachment','Atlas at median/lateral atlanto-axial joints; C3 inferiorly'],
 ['sacrum','Five fused sacral vertebrae with promontory, sacral canal, foramina and auricular surfaces','Transfers axial load to pelvis and supports deep back attachments','L5, paired ilia at sacroiliac joints, and coccyx'],
 ['coccyx','Small fused terminal vertebral segments inferior to the sacrum','Provides pelvic-floor and ligament attachments','Sacrococcygeal junction'],
])add(id,description+'.',role+'.',connection+'.',[],[/atlas|axis|sacrum|coccyx|occipital/.test(id)?refs.axial:refs.bones]);
for(const [id,description,role] of [
 ['scaphoid','Boat-shaped radial proximal-row carpal with a palmar tubercle','Bridges proximal and distal carpal rows and supports radial wrist loads'],
 ['lunate','Crescent-shaped central proximal-row carpal','Receives radial wrist load and participates in midcarpal motion'],
 ['triquetrum','Ulnar proximal-row carpal with palmar pisiform facet','Supports ulnar carpal motion; proximally contacts the articular disc rather than ulna directly'],
 ['pisiform','Pea-shaped sesamoid in flexor carpi ulnaris on the palmar triquetrum','Improves FCU leverage and anchors hypothenar/retinacular structures'],
 ['trapezium','Radial distal-row carpal with saddle surface for thumb and a palmar ridge','Supports mobile thumb CMC joint and retinacular attachments'],
 ['trapezoid','Small wedge-shaped distal-row carpal under metacarpal 2','Stabilizes the index ray'],
 ['capitate','Largest central carpal with a rounded proximal head','Central column support and midcarpal load transmission'],
 ['hamate','Ulnar distal-row carpal with a prominent palmar hook','Supports fourth/fifth rays and provides flexor retinacular/hypothenar attachments'],
])add(id+'-bone',description+'.',role+'.','See the articulations list for its joint partners.',[],[refs.bones]);
// Expand serial anatomy by level/digit; retain a distinct canonical information record for every source part.
for(const r of manifest.structures.filter(r=>r.tissue==='bone')){
 const key=baseId(r.id);
 if(supportTemplates[key])continue;
 if(key.startsWith('vertebra-')){
  const level=key.slice(9),area=level[0]==='c'?'cervical':level[0]==='t'?'thoracic':'lumbar';
  add(key,`${r.name} is a ${area} vertebra with body, arch, spinous/transverse processes and paired articular facets. ${area==='cervical'?'Transverse foramina and small body characterize this region; C7 has a prominent spinous process.':area==='thoracic'?'Costal facets support rib articulations; rib facets vary near T10–T12.':'Large body and mammillary/accessory processes support load and multifidus attachments.'}`,'Protects the spinal canal, transmits axial load and provides regional muscular/ligament attachment.','Adjacent vertebral body/disc and paired facet joints; thoracic vertebrae additionally articulate with ribs.',[],[refs.axial,refs.thorax]);
 }else if(key.endsWith('-rib')){
  const n=['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','eleventh','twelfth'].indexOf(key.replace('-rib',''))+1;
  add(key,`${r.name} is a curved thoracic bone with a head and shaft. ${n===1?'Short, broad and flat; scalene tubercle separates grooves for subclavian vessels.':n===2?'Has a serratus anterior attachment prominence.':n>=11?'Floating rib with a single head facet, no tubercle and no costotransverse articulation; neck and costal groove are absent or poorly developed.':'Head and tubercle articulate posteriorly; a costal groove shelters intercostal neurovascular structures.'}`,'Protects thoracic contents, provides muscular attachments and contributes to chest-wall movement.',`Posterior costovertebral articulation at T${n}${n>=2&&n<=9?' and the vertebra above':''}; ${n<=10?'costotransverse articulation at T'+n:'no costotransverse joint'}. Anterior ${n<=7?'costal cartilage reaches sternum':n<=10?'cartilage joins the costal margin':'end is free'}.`,[],[refs.thorax]);
 }else if(key.includes('-metacarpal-bone')){
  const digit=key.split('-')[0];add(key,`${r.name} forms the ${digit} hand ray, with proximal base, shaft and distal head. ${digit==='first'?'Short mobile thumb metacarpal with trapezial saddle base.':digit==='fifth'?'Its hamate base allows cupping of the ulnar palm.':'Its base contributes to the stable central palmar skeleton.'}`,'Provides a lever for digit movement and intrinsic muscle attachments.','Carpal bone at the base; proximal phalanx at MCP joint; adjacent base joints for metacarpals 2–5.',[],[refs.bones]);
 }else if(key.includes('phalanx')){
  const part=key.split('-')[0],digit=key.match(/of-(first|second|third|fourth|fifth)-finger/)![1];
  add(key,`${r.name}: ${part} segment of the ${digit} digit. ${part==='distal'?'Distal tuft supports the fingertip/nail bed; base receives long flexor/extensor insertions.':part==='middle'?'Middle segment of a three-phalangeal finger; receives superficialis insertion.':'Proximal base receives intrinsic muscle insertions; head supports the next IP joint.'}`,'Supports its digit and provides tendon leverage for precise hand movement.',part==='proximal'?'Metacarpal head proximally; '+(digit==='first'?'distal':'middle')+' phalanx distally.':part==='middle'?'Proximal and distal phalanges at PIP/DIP joints.':(digit==='first'?'Proximal':'Middle')+' phalanx at its IP joint.',[],[refs.bones]);
 }
}
add('sacrococcygeal-symphysis','Fibrocartilaginous junction between the sacral apex and first coccygeal segment.','Permits small coccygeal movement while transferring loads through the terminal vertebral column.','Sacral apex ↔ coccygeal base.', ['sacrum','coccyx'],[refs.axial,{title:'NCBI Bookshelf · Pelvic joints',url:'https://www.ncbi.nlm.nih.gov/books/NBK538523/'}]);
const spinalIds=manifest.structures.filter(r=>r.tissue==='bone'&&/^(atlas|axis|vertebra|sacrum)/.test(r.id)).map(r=>r.id);
for(const key of ['anterior-longitudinal-ligament','posterior-longitudinal-ligament','interspinous-ligaments','ligamenta-flava'])supportTemplates[key].targets=spinalIds.filter(id=>!id.startsWith('atlas'));
supportTemplates['supraspinous-ligament'].targets=spinalIds.filter(id=>id==='vertebra-c7'||/^vertebra-[tl]/.test(id)||id==='sacrum');
supportTemplates['nuchal-ligament'].targets=['occipital-bone','axis-c2','vertebra-c3','vertebra-c4','vertebra-c5','vertebra-c6','vertebra-c7'];
for(const [id,t] of Object.entries(supportTemplates)){
 if(!t.targets.length&&!t.gap&&/metacar|interphalangeal/.test(id))t.targets=handBones.filter(key=>id.includes('distal-interphalangeal')?!key.includes('metacarpal')&&!key.includes('proximal-phalanx')&&!key.includes('first-finger'):id.includes('proximal-interphalangeal')?!key.includes('metacarpal')&&!key.includes('distal-phalanx')&&!key.includes('first-finger'):id.includes('metacarpophalangeal')?key.includes('metacarpal')||key.includes('proximal-phalanx'):id.includes('interphalangeal')?key.includes('phalanx'):key.includes('metacarpal')&&!key.startsWith('first-'));
}
for(const key of ['dorsal-carpometacarpal-ligaments','palmar-carpometacarpal-ligaments'])supportTemplates[key].targets.push('trapezium-bone','trapezoid-bone','capitate-bone','hamate-bone');
supportTemplates['dorsal-intercarpal-ligaments'].targets=['scaphoid-bone','lunate-bone','triquetrum-bone','trapezium-bone','trapezoid-bone','capitate-bone','hamate-bone'];
supportTemplates['interclavicular-ligament'].targets=['clavicle-r','clavicle-l'];
// These destinations are known anatomy outside the selected source inventory, and stay non-clickable.
for(const [key,targets] of [['deep-cervical-artery',['costocervical-trunk']],['first-posterior-intercostal-artery',['supreme-intercostal-artery']],['second-posterior-intercostal-artery',['supreme-intercostal-artery']],['lumbar-arteries',['abdominal-aorta']],['lumbar-veins',['inferior-vena-cava','ascending-lumbar-vein']],['long-thoracic-nerve',['roots-of-brachial-plexus','serratus-anterior']],['subclavian-nerve',['superior-trunk-of-brachial-plexus','subclavius']],['lateral-pectoral-nerve',['lateral-cord-of-brachial-plexus','pectoralis-major']],['medial-pectoral-nerve',['medial-cord-of-brachial-plexus','pectoralis-major','pectoralis-minor']]] as [string,string[]][])supportTemplates[key].targets=targets;
const clinicalNotes:Record<string,string>={
 'median-nerve':'Compression of the median nerve in the carpal tunnel can affect lateral digital sensation and thenar strength. Its palmar cutaneous branch travels outside the tunnel, so central/thenar palmar sensation may be spared.',
 'axillary-nerve':'The axillary nerve lies close to the humeral surgical neck and is vulnerable in fractures or shoulder dislocation; its deltoid/teres minor and lateral cutaneous territories explain the possible deficits.',
 'scaphoid-bone':'Radial artery branches enter at the dorsal ridge near the waist and at the volar tubercle. The proximal pole relies primarily on retrograde intraosseous flow; a waist fracture can interrupt that supply and increase the risk of nonunion or avascular necrosis.',
};
supportTemplates['median-nerve'].references.push(refs.wrist);
supportTemplates['scaphoid-bone'].references.push(refs.wrist);
for(const key of ['scapula','clavicle'])supportTemplates[key].references.push(refs.girdle);
for(const [key,t] of Object.entries(supportTemplates))if(t.references.some(r=>r.url===refs.wrist.url)&&!t.gap)t.references.push(refs.hand,refs.wristAnatomy);
for(const id of ['anterior-root-of-spinal-nerve','posterior-root-of-spinal-nerve','spinal-ganglion']){
 const t=supportTemplates[id];t.references=[refs.backNerves];t.facts=t.facts?.map(f=>({...f,source:refs.backNerves}));
}
for(const id of ['median-nerve','deep-branch-of-ulnar-nerve'])supportTemplates[id].references.push(refs.fpb);
supportTemplates['transverse-humeral-ligament'].references=[refs.humeralRoof,refs.connective];
supportTemplates['coracohumeral-ligament'].references.push({title:'Primary cadaver study · Coracohumeral ligament strain',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3033355/'});
supportTemplates['scaphoid-bone'].references.push(refs.scaphoid);
for(const [id,t] of Object.entries(supportTemplates)){
 if(!t.facts&&!t.gap&&t.references.some(r=>r.url===refs.joints.url))t.references.push(refs.connective,refs.axilla);
 if(/^(ulnocapitate|ulnolunate|ulnotriquetral|dorsal-radio-ulnar|palmar-radio-ulnar|articular-disc-of-distal-radio-ulnar)/.test(id))t.references.push(refs.ulnocarpal);
 if(/^(dorsal-radiocarpal|radioscaphocapitate)/.test(id))t.references.push(refs.wristRadius);
 if(id==='scapholunate-interosseous-ligament')t.references.push(refs.wristMechanics);
 if(/fascia|intermuscular-septum/.test(id)&&!id.includes('thoracolumbar'))t.references=[/hand/.test(id)?refs.hand:refs.axilla,refs.forearmLab];
 if(id==='palmar-aponeurosis')t.references=[refs.hand,refs.handTable];
}
export const supportGaps:Record<string,string>={};
export const armBackSupportFacts:Record<string,Partial<Structure>>={};
for(const r of manifest.structures.filter(r=>r.tissue!=='muscle')){
 const key=baseId(r.id);let t=supportTemplates[key];
 if(r.tissue==='tendon'){
  const muscle=armBackMuscleFacts[r.id.replace(/-tendon$/,'')];
  if(muscle)t={description:`The tendon of ${r.name}, carrying tension from its muscle fibers to their attachment tissues.`,role:`Transfers force for: ${muscle.action}`,connection:`Origin: ${muscle.origin} Insertion: ${muscle.insertion}`,targets:[r.id.replace(/-tendon$/,'')],references:muscle.references};
 }else if(r.tissue==='cartilage'){
  if(r.id.endsWith('-cartilage')){
   const bone=r.id.replace(/-cartilage$/,'');const parent=supportTemplates[baseId(bone)];
   t={description:`Cartilage associated with the ${r.name.toLowerCase()}. Its anatomical relationships depend on the joint or surface.`,role:'Articular cartilage reduces friction and distributes compressive load across its associated joint surfaces.',connection:`Host: ${r.name}. ${parent?.connection??''} A whole-bone material group does not identify a single joint or imply a new articulation.`,targets:[bone],references:parent?.references??[refs.bones]};
  }else if(/^(intervertebral-disc|nucleus-pulposus)-/.test(r.id)){
   const [a,b]=r.id.replace(/^(intervertebral-disc|nucleus-pulposus)-/,'').split('-');const nucleus=r.id.startsWith('nucleus');
   const host=levelId;
   t={description:`${r.name}: ${nucleus?'gel-rich central component of the corresponding disc':'fibrocartilaginous annulus-containing disc between adjacent vertebral bodies'}.`,role:nucleus?'Redistributes compression through the containing annulus.':'Distributes axial loads and permits small intervertebral movements; the nucleus pulposus redistributes compression within the annulus.',connection:`${a.toUpperCase()} body endplate ↔ ${b.toUpperCase()} body endplate; ${nucleus?'contained by the annulus':'contains the nucleus pulposus'}.`,targets:[host(a),host(b),(nucleus?'intervertebral-disc-':'nucleus-pulposus-')+a+'-'+b],references:[refs.axial]};
  }else if(key==='glenoid-labrum')t={description:'Fibrocartilaginous rim attached to the scapular glenoid margin.',role:'Deepens the shoulder socket and anchors the capsule and long biceps tendon superiorly.',connection:'Glenoid rim ↔ shoulder capsule; superior labrum ↔ long biceps origin.',targets:['scapula-r','long-head-of-biceps-brachii-r'],references:[refs.joints]};
  else if(/articular-disc-of-(acromioclavicular|sternoclavicular)-joint/.test(r.id)){
   const sc=r.id.includes('sternoclavicular');t={description:sc?'Fibrocartilaginous SC disc between medial clavicle and manubrial/first-costal interface.':'Variable, often incomplete fibrocartilaginous AC disc between acromion and clavicle.',role:'Improves joint congruence and distributes loads through the shoulder girdle.',connection:sc?'Medial clavicle ↔ manubrium/first costal cartilage; attached to capsule.':'Acromion ↔ lateral clavicle; disc completeness varies.',targets:sc?['clavicle-r']:['clavicle-r','scapula-r'],references:[refs.joints]};
  }
 }
 if(!t){t={description:`${r.name} is retained as a distinct ${r.tissue} source object.`,role:'Educational information unresolved for this source-specific component.',connection:'Unresolved: individual attachments/course and function require anatomical source review.',targets:[],references:[],gap:'No reviewed structure-specific support template.'};}
 if(t.gap)supportGaps[r.id]=t.gap;
 armBackSupportFacts[r.id]={description:t.description[0].toUpperCase()+t.description.slice(1),role:t.role,connection:t.connection,references:t.references,...(clinicalNotes[key]?{clinical:clinicalNotes[key]}:{}),...(t.facts?{facts:t.facts}:{})};
 Object.assign(armBackSupportFacts[r.id],supportNoteMetadata(r,armBackSupportFacts[r.id],t.gap));
}
