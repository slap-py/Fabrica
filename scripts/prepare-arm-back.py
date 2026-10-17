"""Prepare canonical, complete source meshes in documented Blender MCP checkpoints."""
import bpy,bmesh,json,hashlib,re
from pathlib import Path
from mathutils import Matrix,Vector
from mathutils.kdtree import KDTree
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'scripts'))
from arm_back_attachment_rules import validate_attachments
outputName=globals().get('outputName','arm-back')
inventory=json.loads((ROOT/globals().get('inventoryPath','src/regions/arm-back/inventory.json')).read_text())
SOURCE=ROOT/'assets/source/Startup.blend'
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest()==inventory['sourceBlendSha256']
bpy.ops.wm.open_mainfile(filepath=str(SOURCE),use_scripts=False)
bpy.context.view_layer.update()
# Same unscaled rotation as the existing pipeline, with the source-world origin.
transform=Matrix(((0,-1,0,0),(1,0,0,0),(0,0,1,0),(0,0,0,1)))
prepared=[]; missing=[]
bones=[r for r in inventory['structures'] if r['tissue']=='bone']
# Proximity generates candidates only; reviewed bone-family rules gate presentation cards.
kd_points=[]
for r in bones:
 obj=bpy.data.objects.get(r['sourceObject'])
 if obj:
  kd_points.extend((obj.matrix_world@v.co,r['id']) for v in obj.data.vertices)
kd=KDTree(len(kd_points))
for i,(p,_) in enumerate(kd_points):kd.insert(p,i)
kd.balance()
for r in inventory['structures']:
 src=bpy.data.objects.get(r['sourceObject'])
 if not src:missing.append({'id':r['id'],'sourceObject':r['sourceObject'],'status':'failed-import','reason':'Inventoried object disappeared before preparation.'});continue
 attachments=[]
 if r['tissue']=='muscle':
  side='r' if r['laterality']=='right' else 'l'
  base=re.sub(r'\.[lr]$','',src.name)
  for patch in bpy.data.objects:
   match=re.match(re.escape(base)+r'\.([oe])\d*'+side+r'$',patch.name)
   if not match or patch.type!='MESH' or not len(patch.data.vertices):continue
   center=sum((patch.matrix_world@v.co for v in patch.data.vertices),Vector())/len(patch.data.vertices)
   nearest,index,distance=kd.find(center)
   if distance>.025:continue
   p=transform@center
   attachments.append({'end':'from' if match[1]=='o' else 'to','sourceObject':patch.name,'hostId':kd_points[index][1],'seedMm':[p.x*1000,p.z*1000,-p.y*1000],'hostDistanceMm':distance*1000})
 accepted,rejected=validate_attachments(r,attachments)
 prepared.append({'record':r,'data':src.data.copy(),'world':src.matrix_world.copy(),'type':src.type,'sourceAttachments':accepted,'unverifiedAttachmentPatches':rejected})
bpy.data.batch_remove(ids=list(bpy.data.objects));bpy.data.batch_remove(ids=list(bpy.data.texts))
bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
collections={}
for name in ['01 Shared shoulder and arm bones','02 Arm muscles','03 Back bones and muscles','04 Connective tissue','05 Nerves and vessels']:
 c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);collections[name]=c
records=[];objects={};failures=[];empty=[];checkpoints=[]
def stage(r):
 if r['tissue'] in ['artery','vein','nerve']:return '05 Nerves and vessels'
 if r['tissue'] not in ['bone','muscle']:return '04 Connective tissue'
 arm=any(region in ['right-arm','left-arm'] for region in r['regions'])
 if r['tissue']=='bone' and arm or len(r['regions'])>1:return '01 Shared shoulder and arm bones'
 return '02 Arm muscles' if arm else '03 Back bones and muscles'
for checkpoint in collections:
 for item in [i for i in prepared if stage(i['record'])==checkpoint]:
  r=dict(item['record']);tmp=None
  try:
   data=item['data'];tmp=bpy.data.objects.new(r['id'],data);collections[checkpoint].objects.link(tmp)
   if item['type']=='CURVE':
    data.resolution_u=6;data.render_resolution_u=6;data.bevel_resolution=1;data.use_fill_caps=True
    bpy.context.view_layer.update();mesh=bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp,do_unlink=True);tmp=bpy.data.objects.new(r['id'],mesh);collections[checkpoint].objects.link(tmp)
   else:mesh=data
   mesh.transform(transform@item['world']);bm=bmesh.new();bm.from_mesh(mesh)
   mode=r['materialSeparation'];mats=r['sourceMaterials']
   if mode!='all':
    def keep(f):
     m=mats[f.material_index] if f.material_index<len(mats) else ''
     return ('Cartilage' not in m) if mode=='bone' else ('Cartilage' in m) if mode=='cartilage' else (m=='Tendon') if mode=='tendon' else (m!='Tendon')
    gone=[f for f in bm.faces if not keep(f)]
    if gone:bmesh.ops.delete(bm,geom=gone,context='FACES')
   loose=[v for v in bm.verts if not v.link_faces]
   if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
   if not bm.faces:
    bm.free();bpy.data.objects.remove(tmp,do_unlink=True);empty.append({'id':r['id'],'sourceObject':r['sourceObject'],'status':'empty-source-part','reason':'No source faces for the requested material part.'});continue
   # Material seams cap bone/muscle solids. Source sheets remain source sheets.
   if r['tissue'] in ['bone','muscle','tendon']:
    edges=[e for e in bm.edges if e.is_boundary]
    if edges:bmesh.ops.holes_fill(bm,edges=edges,sides=0)
   bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
   if r['tissue'] in ['bone','muscle','tendon'] and bm.calc_volume(signed=True)<0:bmesh.ops.reverse_faces(bm,faces=list(bm.faces))
   bm.to_mesh(mesh);bm.free();mesh.materials.clear();tmp.data=mesh
   mesh.calc_loop_triangles();limit=8000 if r['tissue'] in ['bone','muscle'] else 12000
   if len(mesh.loop_triangles)>limit:
    mod=tmp.modifiers.new('Source surface triangle budget','DECIMATE');mod.ratio=limit/len(mesh.loop_triangles);mod.use_collapse_triangulate=True
    bpy.context.view_layer.update();mesh=bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()));tmp.modifiers.clear();tmp.data=mesh
   bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.triangulate(bm,faces=list(bm.faces));boundary=sum(e.is_boundary for e in bm.edges);bm.to_mesh(mesh);bm.free()
   for f in mesh.polygons:f.use_smooth=True
   points=[Vector((v.co.x,v.co.z,-v.co.y))*1000 for v in mesh.vertices]
   r.update({'boundsMm':[[min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)]],'triangles':len(mesh.polygons),'boundaryEdges':boundary,'availability':'renderable','sourceAttachments':item['sourceAttachments'],'unverifiedAttachmentPatches':item['unverifiedAttachmentPatches'],'checkpoint':checkpoint})
   tmp['atlasId']=r['id'];tmp['canonicalId']=r['canonicalId'];tmp['sourceObject']=r['sourceObject'];tmp['tissue']=r['tissue'];tmp['laterality']=r['laterality'];tmp['source']='z-anatomy';tmp['license']='CC-BY-SA-4.0'
   records.append(r);objects.setdefault(r['assetGroup'],[]).append(tmp)
  except Exception as e:
   if tmp and tmp.name in bpy.data.objects:bpy.data.objects.remove(tmp,do_unlink=True)
   failures.append({'id':r['id'],'sourceObject':r['sourceObject'],'status':'failed-import','reason':str(e)})
 checkpoints.append({'name':checkpoint,'structures':sum(r['checkpoint']==checkpoint for r in records),'triangles':sum(r['triangles'] for r in records if r['checkpoint']==checkpoint),'failedImports':list(failures)})
 (ROOT/f'output/{outputName}/checkpoints.json').write_text(json.dumps(checkpoints,indent=2))
 print(checkpoint,checkpoints[-1]['structures'],flush=True)
bpy.app.driver_namespace['muscle_map_arm_back_export']={'ROOT':ROOT,'outputName':outputName,'inventory':inventory,'records':records,'objects':objects,'failures':failures+missing,'empty':empty,'checkpoints':checkpoints,'transform':transform}
result={'prepared':len(records),'failedImports':failures+missing,'emptySourceParts':empty,'checkpoints':checkpoints}
