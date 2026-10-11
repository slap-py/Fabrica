"""Inventory the pinned source through the Blender MCP extension before import."""
import bpy, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'assets/source/Startup.blend'
pin = json.loads((ROOT / 'assets/source/source-manifest.json').read_text())
assert hashlib.sha256(source.read_bytes()).hexdigest() == next(f['sha256'] for f in pin['files'] if f['path'].endswith('Startup.blend'))
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
bpy.context.view_layer.update()
records = []
for obj in bpy.data.objects:
    if obj.type not in ['MESH', 'CURVE']: continue
    points = [obj.matrix_world @ Vector(v) for v in obj.bound_box]
    records.append({'name': obj.name, 'type': obj.type, 'collections': [c.name for c in obj.users_collection], 'materials': [m.name if m else '' for m in obj.data.materials], 'boundsSourceMeters': [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]})
out = ROOT / 'output/arm-back'
out.mkdir(parents=True, exist_ok=True)
(out / 'source-inventory.json').write_text(json.dumps({'sourceRevision': pin['revision'], 'objects': records}, indent=2))
result = {'objects': len(records), 'inventory': str(out / 'source-inventory.json'), 'collections': [c.name for c in bpy.data.collections]}
