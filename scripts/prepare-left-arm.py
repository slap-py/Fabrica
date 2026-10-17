"""Export the native left counterparts of the authored right-arm selection.
Run: blender --background --python scripts/prepare-left-arm.py
"""
import json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
inventory=json.loads((ROOT/'src/regions/arm-back/inventory.json').read_text())
source=json.loads((ROOT/'output/arm-back/source-inventory.json').read_text())
objects={o['name']:o for o in source['objects']}
records=[]; gaps=[]
for r in inventory['structures']:
 if 'right-arm' not in r['regions']: continue
 name=re.sub(r'\.r$', '.l', r['sourceObject'])
 obj=objects.get(name)
 if not obj:
  gaps.append({'sourceObject':name,'status':'missing-source','reason':'No native left counterpart in the pinned source.'})
  continue
 item={**r,'id':re.sub(r'-r(?=$|-)', '-l',r['id']),'sourceObject':name,'laterality':'left','regions':['left-arm']+(['back'] if 'back' in r['regions'] else []),'sourceCollections':obj['collections'],'sourceMaterials':obj['materials'],'sourceBoundsMeters':obj['boundsSourceMeters']}
 item['canonicalId']='z-anatomy:'+item['id']
 records.append(item)
left={**inventory,'structures':records,'dataOnly':[],'gaps':[g for g in inventory['gaps'] if g.get('structure')=='Skin']+gaps,'excludedSourceObjects':[]}
(ROOT/'src/regions/arm-back/left-inventory.json').write_text(json.dumps(left,indent=2))
(ROOT/'output/left-arm').mkdir(exist_ok=True)
namespace={'__file__':str(ROOT/'scripts/prepare-arm-back.py'),'inventoryPath':'src/regions/arm-back/left-inventory.json','outputName':'left-arm'}
exec(compile((ROOT/'scripts/prepare-arm-back.py').read_text(),namespace['__file__'],'exec'),namespace)
exec(compile((ROOT/'scripts/export-arm-back.py').read_text(),str(ROOT/'scripts/export-arm-back.py'),'exec'),namespace)
print(namespace['result'],flush=True)
