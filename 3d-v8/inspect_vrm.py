#!/usr/bin/env python3
from pathlib import Path
import json, struct, sys

p = Path(sys.argv[1])
b = p.read_bytes()
if len(b) < 20 or struct.unpack_from('<I', b, 0)[0] != 0x46546C67:
    raise SystemExit('not GLB/VRM')
off = 12
doc = None
while off < len(b):
    ln, typ = struct.unpack_from('<II', b, off)
    off += 8
    chunk = b[off:off + ln]
    off += ln
    if typ == 0x4E4F534A:
        doc = json.loads(chunk.decode('utf-8').rstrip(' \0'))
        break
if doc is None:
    raise SystemExit('missing JSON chunk')
extensions = doc.get('extensions', {})
vrm = extensions.get('VRM') or extensions.get('VRMC_vrm') or {}
meta = vrm.get('meta', {})
humanoid = vrm.get('humanoid', {})
blend = (vrm.get('blendShapeMaster', {}) or {}).get('blendShapeGroups', [])
report = {
    'file': p.name,
    'size_bytes': p.stat().st_size,
    'asset': doc.get('asset', {}),
    'extensionsUsed': doc.get('extensionsUsed', []),
    'meta': meta,
    'counts': {
        'nodes': len(doc.get('nodes', [])),
        'meshes': len(doc.get('meshes', [])),
        'skins': len(doc.get('skins', [])),
        'materials': len(doc.get('materials', [])),
        'textures': len(doc.get('textures', [])),
        'animations': len(doc.get('animations', [])),
    },
    'humanBones': humanoid.get('humanBones', []),
    'blendShapeGroups': [
        {'name': g.get('name'), 'presetName': g.get('presetName'), 'binds': len(g.get('binds', []))}
        for g in blend
    ],
    'nodeNames': [n.get('name', '') for n in doc.get('nodes', [])],
    'meshNames': [m.get('name', '') for m in doc.get('meshes', [])],
}
print(json.dumps(report, ensure_ascii=False, indent=2))
