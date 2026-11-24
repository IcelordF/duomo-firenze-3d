# Alleggerisce il .glb del Duomo: ricomprime le texture (JPEG q80, PNG con alfa ridotte), max 1024 px,
# e svuota la foto aerea di Google Earth (materiale "Google Earth Snapshot1"), che non si può ridistribuire.
# Uso: python3 scripts/slim-glb.py in.glb out.glb [lato massimo texture, default 1024]
import json, struct, subprocess, sys, tempfile, os
src, dst = sys.argv[1], sys.argv[2]
MAXS = sys.argv[3] if len(sys.argv) > 3 else '1024'
d = open(src, 'rb').read()
clen = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + clen])
o = 20 + clen; blen = struct.unpack('<I', d[o:o + 4])[0]; binb = d[o + 8:o + 8 + blen]
views = [binb[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']] for v in j['bufferViews']]
ground_imgs = set()
for m in j['materials']:
    if (m.get('name') or '').startswith('Google Earth Snapshot'):
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t: ground_imgs.add(j['textures'][t['index']]['source'])
tmp = tempfile.mkdtemp()
for k, im in enumerate(j['images']):
    bv = im['bufferView']; raw = views[bv]; mime = im['mimeType']
    fi = os.path.join(tmp, f'i{k}' + ('.png' if 'png' in mime else '.jpg'))
    open(fi, 'wb').write(raw)
    if k in ground_imgs:
        fo = os.path.join(tmp, f'o{k}.jpg'); subprocess.run(['convert', fi, '-resize', '1x1!', fo], check=True); mime = 'image/jpeg'
    else:
        alpha = subprocess.run(['identify', '-format', '%[opaque]', fi], capture_output=True, text=True).stdout.strip().lower() == 'false'
        if alpha: fo = os.path.join(tmp, f'o{k}.png'); subprocess.run(['convert', fi, '-strip', '-resize', f'{MAXS}x{MAXS}>', '-define', 'png:compression-level=9', fo], check=True); mime = 'image/png'
        else: fo = os.path.join(tmp, f'o{k}.jpg'); subprocess.run(['convert', fi, '-strip', '-resize', f'{MAXS}x{MAXS}>', '-quality', '80', fo], check=True); mime = 'image/jpeg'
    new = open(fo, 'rb').read()
    if len(new) < len(raw) or k in ground_imgs: views[bv] = new; im['mimeType'] = mime
out = b''
for v, data in zip(j['bufferViews'], views):
    out += b'\0' * ((-len(out)) % 4); v['byteOffset'] = len(out); v['byteLength'] = len(data); v['buffer'] = 0; out += data
out += b'\0' * ((-len(out)) % 4)
j['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((-len(js)) % 4)
glb = struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<I4s', len(js), b'JSON') + js + struct.pack('<I4s', len(out), b'BIN\0') + out
open(dst, 'wb').write(glb); print(src, len(d), '->', dst, len(glb))
