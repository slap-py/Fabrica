"""Publish prepared source meshes and manifests through the established GLB pipeline."""
import bpy,json,hashlib
from collections import Counter
from pathlib import Path
globals().update(bpy.app.driver_namespace['muscle_map_arm_back_export'])
assert not failures, failures
out=ROOT/'public/models/arm-back';out.mkdir(parents=True,exist_ok=True)
exports=[]
for group,items in objects.items():
 bpy.ops.object.select_all(action='DESELECT')
 for obj in items:obj.hide_set(False);obj.select_set(True)
 bpy.context.view_layer.objects.active=items[0]
 path=out/f'{group}.glb'
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True,export_materials='NONE',export_animations=False,export_cameras=False,export_lights=False)
 exports.append({'group':group,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
manifest={**inventory,'structures':records,'failedImports':failures,'emptySourceParts':empty,'checkpoints':checkpoints,'exports':exports,'registration':{'datumSourceMeters':[0,0,0],'sourceWorldToBlenderRowMajor':[list(row) for row in transform],'sourceWorldToGLBRowMajor':[[0,-1,0,0],[0,0,1,0],[-1,0,0,0],[0,0,0,1]],'runtimeScale':1000},'axes':{'x':'anterior','y':'superior','z':'subject-right'},'units':'meters in GLB; millimeters at runtime','processing':['Complete source anatomy without region cuts or reflection','Bone/cartilage and muscle/tendon source material separation','Bone/muscle material seams capped; connective sheets retain source borders','Curves converted with source bevel depth and control-point radii','Triangle budgets: 8000 per bone/muscle, 12000 per other source object'],'limitations':['No scanned skin mesh or substitute envelope','Some named source muscles and nerves are absent; see gaps','Spinal cord is recorded in data only and excluded from all assets and controls','Source muscle action material labels and attachment patches provide limited metadata, not a complete clinical reference','Source meshes and sheets are static simplified anatomy, without biomechanics']}
manifest['attachmentValidation']={'acceptedFocusPatches':sum(len(r['sourceAttachments']) for r in records),'withheldCandidatePatches':sum(len(r['unverifiedAttachmentPatches']) for r in records),'references':__import__('arm_back_attachment_rules').REFERENCES,'scope':'Reviewed bone families only; illustrative focus footprints, not exhaustive clinical attachments'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
target=ROOT/'src/regions/arm-back'
(target/'manifest.json').write_text(json.dumps({'sourceRevision':inventory['sourceRevision'],'structures':records,'dataOnly':inventory['dataOnly'],'gaps':inventory['gaps'],'emptySourceParts':empty,'attachmentValidation':manifest['attachmentValidation']},indent=2))
for region in ['right-arm','back']:
 included=[r for r in records if region in r['regions']]
 (target/f'{region}-counts.json').write_text(json.dumps({'total':len(included),'byTissue':dict(Counter(r['tissue'] for r in included))},indent=2))
result={'exported':len(records),'exports':exports,'emptySourceParts':empty,'failedImports':failures}
