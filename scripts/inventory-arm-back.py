"""Resolve canonical arm/back membership before importing any geometry."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
pin=json.loads((ROOT/'output/arm-back/source-inventory.json').read_text())
objects=pin['objects']; by_name={o['name']:o for o in objects}
slug=lambda s:re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
SHOULDER=['Scapula','Clavicle','Supraspinatus muscle','Infraspinatus muscle','Subscapularis muscle','Teres minor muscle','Teres major muscle','Levator scapulae','Rhomboid major muscle','Rhomboid minor muscle','Latissimus dorsi muscle','Ascending part of trapezius muscle','Descending part of trapezius muscle','Transverse part of trapezius muscle','Dorsal scapular nerve','Suprascapular nerve','Thoracodorsal nerve','Superior subscapular nerve','Inferior subscapular nerve','Circumflex scapular artery','Circumflex scapular vein','Subscapular artery','Subscapular vein','Suprascapular artery','Suprascapular vein','Thoracodorsal artery','Transverse cervical artery','(Deep branch of transverse cervical artery)','(Superficial branch of transverse cervical artery)']
BACK_EXTRA=['Nuchal ligament','Occipital bone','Interspinales thoracis muscles.l','Iliocostalis colli muscle','Spinal ganglion.l','Spinal ganglion.r','Posterior root of spinal nerve.l','Posterior root of spinal nerve.r','Anterior root of spinal nerve.l','Anterior root of spinal nerve.r']
BACK_NV=['Deep cervical artery','Vertebral artery','Vertebral vein','Posterior intercostal arteries','First posterior intercostal artery','Second posterior intercostal artery','Lumbar arteries','Lumbar veins','Lumbar branch of iliolumbar artery','Spinal branch of iliolumbar artery','Intercostal nerves','Lateral sacral veins']
expected=['Semispinalis capitis muscle.l','Semispinalis capitis muscle.r','Suboccipital nerve.l','Suboccipital nerve.r']
entries=[]; excluded=[]
for o in objects:
 n=o['name']; c=o['collections'];m=o['materials']; base=re.sub(r'\.[lr]$','',n)
 if not m or '2: Muscular insertions' in c or re.search(r'\.[ij]$',n): continue
 regions=[]
 if 'Right upper limb' in c and n.endswith('.r'): regions.append('right-arm')
 if 'Back' in c or n in BACK_EXTRA or base in BACK_NV or base in SHOULDER or (re.match(r'^\w+ rib\.[lr]$',n) and any(x.startswith('Bone') for x in m)): regions.append('back')
 if base in SHOULDER and n.endswith('.r') and 'right-arm' not in regions: regions.append('right-arm')
 if not regions: continue
 if any(x.startswith('Skin') for x in m) or 'Bursa' in m or 'sheath' in n.lower() or '6: Lymphoid organs' in c:
  excluded.append({'sourceObject':n,'reason':'Regional skin patches, bursae, tendon sheaths and lymphatic objects follow existing release exclusions.'});continue
 tissue='bone' if any(x.startswith('Bone') for x in m) and '1: Skeletal system' in c else 'muscle' if 'Muscles' in c else 'artery' if 'Artery' in m else 'vein' if 'Vein' in m else 'nerve' if any(x.startswith('Nerve') for x in m) else 'fascia' if 'Fascia' in m else 'cartilage' if 'Cartilage' in m and 'Ligament' not in m else 'ligament' if 'Ligament' in m or 'Articular capsule' in m else None
 if not tissue: excluded.append({'sourceObject':n,'reason':'Unsupported source tissue or non-anatomical annotation.'});continue
 side='right' if n.endswith('.r') else 'left' if n.endswith('.l') or n=='Iliocostalis colli muscle' else 'midline'
 area=('Shoulder' if base in SHOULDER or any(x in n.lower() for x in ['deltoid','glenohumeral','clavic','humeral ligament']) else 'Hand' if 'Right hand' in c or any(x in n.lower() for x in ['palmar','pollicis','digit','metacarp','hand','carpal','wrist']) else 'Forearm' if any(x in n.lower() for x in ['forearm','radial','ulnar','radius','ulna','carpi','pronator','supinator']) else 'Upper arm') if 'right-arm' in regions else ('Neck' if 'Neck' in c else 'Lower back' if any(x in n.lower() for x in ['lumbo','lumbar','sacrum','sacral','coccy','l1','l2','l3','l4','l5']) else 'Back')
 if 'right-arm' in regions and 'Elbow joint' in c: area='Elbow'
 if 'right-arm' in regions and ('Radiocarpal joint' in c or 'Distal radio-ulnar joint' in c or re.search(r'wrist|radiocarpal',n,re.I)): area='Wrist'
 for part in [tissue]+(['cartilage'] if tissue=='bone' and 'Cartilage' in m else [])+(['tendon'] if tissue=='muscle' and 'Tendon' in m else []):
  id=slug(n)+('-cartilage' if part=='cartilage' and tissue=='bone' else '-tendon' if part=='tendon' else '')
  entries.append({'id':id,'canonicalId':'z-anatomy:'+id,'name':re.sub(r'\.[lr]$','',n),'sourceObject':n,'tissue':part,'laterality':side,'regions':sorted(set(regions)),'area':area,'sourceCollections':c,'sourceMaterials':m,'sourceBoundsMeters':o['boundsSourceMeters'],'availability':'source-present','assetGroup':'neurovascular' if part in ['artery','vein','nerve'] else 'muscles' if part in ['muscle','tendon'] else 'bones','materialSeparation':'cartilage' if part=='cartilage' and tissue=='bone' else 'bone' if part=='bone' else 'tendon' if part=='tendon' else 'belly' if part=='muscle' else 'all'})
assert len({e['id'] for e in entries})==len(entries)
cord_names=['White matter of spinal cord','Anterior horn of spinal cord','Posterior horn of spinal cord']
cord={'id':'spinal-cord','canonicalId':'z-anatomy:spinal-cord','name':'Spinal cord','tissue':'nerve','laterality':'midline','regions':['back'],'sourceObjects':[n for n in cord_names if n in by_name],'sourceRevision':pin['sourceRevision'],'sourceReference':'https://github.com/Z-Anatomy/Models-of-human-anatomy/tree/'+pin['sourceRevision'],'visualizationAvailable':False,'availability':'data-only','reason':'Explicitly excluded from visualization in this release; source represents white matter and anterior/posterior horn components.'}
gaps=[{'sourceObject':n,'status':'missing-source','reason':'No named renderable source object in pinned dataset; not an import failure.'} for n in expected if n not in by_name]
gaps.append({'structure':'Skin','status':'missing-source','reason':'No continuous scanned skin mesh. Regional surface patches are excluded; no new skin envelope is invented.'})
manifest={'sourceRevision':pin['sourceRevision'],'sourceBlendSha256':json.loads((ROOT/'public/models/bones.manifest.json').read_text())['sourceBlendSha256'],'sourceUrl':cord['sourceReference'],'license':'CC-BY-SA-4.0','structures':entries,'dataOnly':[cord],'gaps':gaps,'excludedSourceObjects':excluded,'failedImports':[],'membershipPolicy':'Complete source meshes, no regional cuts. Back includes bilateral shoulder girdle, ribs and occipital attachment context. Shoulder/back structures have shared canonical identities, independently recorded laterality. Explicit collection omissions are resolved by source names and bounds.'}
out=ROOT/'src/regions/arm-back';out.mkdir(parents=True,exist_ok=True)
(out/'inventory.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'structures':len(entries),'right-arm':sum('right-arm' in e['regions'] for e in entries),'back':sum('back' in e['regions'] for e in entries),'shared':sum(len(e['regions'])>1 for e in entries),'gaps':gaps},indent=2))
