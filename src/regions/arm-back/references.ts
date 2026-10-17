import type { Structure } from '../../data';
const table='https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/';
export const refs={
 neckVeins:{title:'Texas Tech · Neck venous drainage',url:'https://anatomy.ttuhscep.edu/nervous_system/antneck_tables.html'},
 thoraxVeins:{title:'UAMS · Selected veins of the thorax',url:table+'vein-tables/selected-veins-of-the-thorax/'},
 pelvicVeins:{title:'Texas Tech · Pelvic wall venous drainage',url:'https://anatomy.ttuhscep.edu/schemes/pelvicwall_ans.html'},

 backNerves:{title:'UAMS · Nerves of the back',url:table+'nerve-tables/nerves-of-the-back/'},
 thoraxNerves:{title:'UAMS · Nerves of the thorax',url:table+'nerve-tables/nerves-of-the-thorax/'},
 backArteries:{title:'UAMS · Arteries of the back',url:table+'artery-tables/arteries-of-the-back/'},
 pelvicArteries:{title:'UAMS · Arteries of the pelvis',url:table+'artery-tables/arteries-of-the-pelvis-and-perineum/'},
 abdomenMuscles:{title:'UAMS · Abdominal muscles',url:table+'muscle-tables/muscles-of-the-abdominal-region/'},
 axilla:{title:'Texas Tech · Shoulder and arm anatomy tables',url:'https://anatomy.ttuhscep.edu/musculoskeletal_system/axilla_tables.html'},
 forearm:{title:'Texas Tech · Forearm and wrist dissection',url:'https://anatomy.ttuhscep.edu/musculoskeletal_system/forearm_ans.html'},
 forearmLab:{title:'Texas Tech · Forearm tendon and fascia dissection',url:'https://anatomy.ttuhscep.edu/musculoskeletal_system/forearm.html'},
 handTable:{title:'Texas Tech · Hand anatomy tables',url:'https://anatomy.ttuhscep.edu/musculoskeletal_system/hand_tables.html'},
 connective:{title:'Texas Tech · Joints and ligaments',url:'https://anatomy.ttuhscep.edu/anatomytables/joints_alpha.html'},
 scaphoid:{title:'Gelberman and Menon · Cadaveric scaphoid vascularity',url:'https://pubmed.ncbi.nlm.nih.gov/7430591/'},
 humeralRoof:{title:'Gleason et al. · Cadaveric transverse humeral ligament study',url:'https://pubmed.ncbi.nlm.nih.gov/16170042/'},
 wristRadius:{title:'Primary cadaver study · Distal radius ligament attachments',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3826249/'},
 ulnocarpal:{title:'Anatomical investigation · Ulnocarpal ligament complex',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3699274/'},
 wristMechanics:{title:'Primary cadaver study · Wrist ligament biomechanics',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8355209/'},
 armMuscles:{title:'UAMS · Upper limb muscles',url:table+'muscle-tables/muscles-of-the-upper-limb/'},
 backMuscles:{title:'UAMS · Back muscles',url:table+'muscle-tables/muscles-of-the-back-region/'},
 back:{title:'NCBI Bookshelf · Back muscles and subdivisions',url:'https://www.ncbi.nlm.nih.gov/sites/books/NBK537074/?report=printable'},
 radialStudy:{title:'Primary cadaver study · Radial nerve branching',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7345276/'},
 nerves:{title:'UAMS · Upper limb nerves',url:table+'nerve-tables/nerves-of-the-upper-limb/'},
 arteries:{title:'UAMS · Upper limb arteries',url:table+'artery-tables/arteries-of-the-upper-limb/'},
 veins:{title:'UAMS · Upper limb veins',url:table+'vein-tables/selected-veins-of-the-upper-limb/'},
 axial:{title:'OpenStax · Vertebral column',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-3-the-vertebral-column'},
 thorax:{title:'OpenStax · Thoracic cage',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage'},
 girdle:{title:'OpenStax · Pectoral girdle',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-1-the-pectoral-girdle'},
 hand:{title:'Texas Tech · Hand dissection guide',url:'https://anatomy.ttuhscep.edu/musculoskeletal_system/hand_ans.html'},
 wristAnatomy:{title:'Primary anatomical study · Wrist joint',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC1233428/'},
 bones:{title:'OpenStax · Upper limb bones',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/8-2-bones-of-the-upper-limb'},
 joints:{title:'OpenStax · Selected synovial joints',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/9-6-anatomy-of-selected-synovial-joints'},
 wrist:{title:'NCBI Bookshelf · Wrist joint',url:'https://www.ncbi.nlm.nih.gov/books/NBK534779/'},
 fascia:{title:'Primary anatomical review · Thoracolumbar fascia',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC3512278/'},
 plexus:{title:'NCBI Bookshelf · Brachial plexus',url:'https://www.ncbi.nlm.nih.gov/books/NBK531473/'},
 spinal:{title:'OpenStax · Spinal cord and nerves',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/13-2-the-central-nervous-system'},
 vessels:{title:'OpenStax · Circulatory pathways',url:'https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways'},
 fpb:{title:'Primary dissection study · Flexor pollicis brevis',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC5721304/'},
};
export type Reference=NonNullable<Structure['references']>[number];
export const uniqueReferences=(values:Reference[])=>[...new Map(values.map(r=>[r.url,r])).values()];
/** The unsuffixed iliocostalis source object is left-sided. */
export const baseId=(id:string)=>id.replace(/-tendon$/,'').replace(/-[lr]$/,'');

