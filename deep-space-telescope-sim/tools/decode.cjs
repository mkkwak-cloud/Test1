const fs = require('fs');
const DracoDecoderModule = require('/home/claude/three/t/examples/jsm/libs/draco/gltf/draco_decoder.js');
const file = process.argv[2], out = process.argv[3];
const b = fs.readFileSync(file);
const jl = b.readUInt32LE(12), J = JSON.parse(b.slice(20, 20 + jl).toString());
const bo = 20 + jl, bl = b.readUInt32LE(bo), BIN = b.slice(bo + 8, bo + 8 + bl);
// 노드 월드 행렬
const mul = (a, c) => { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * c[j * 4 + k]; return r; };
const local = n => {
  if (n.matrix) return n.matrix.slice();
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, (2 * (x * y + z * w)) * sx, (2 * (x * z - y * w)) * sx, 0,
          (2 * (x * y - z * w)) * sy, (1 - 2 * (x * x + z * z)) * sy, (2 * (y * z + x * w)) * sy, 0,
          (2 * (x * z + y * w)) * sz, (2 * (y * z - x * w)) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
};
const I = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
DracoDecoderModule().then(D => {
  const groups = {}; // material -> {pos:[], nor:[], idx:[]}
  const visit = (ni, M) => {
    const n = J.nodes[ni], W = mul(M, local(n));
    if (n.mesh !== undefined) for (const p of J.meshes[n.mesh].primitives) {
      const ext = p.extensions && p.extensions.KHR_draco_mesh_compression; if (!ext) { console.log('non-draco prim'); continue; }
      const bv = J.bufferViews[ext.bufferView], data = BIN.slice(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
      const dec = new D.Decoder(), buf = new D.DecoderBuffer(); buf.Init(new Int8Array(data.buffer, data.byteOffset, data.byteLength), data.byteLength);
      const mesh = new D.Mesh(); const st = dec.DecodeBufferToMesh(buf, mesh); if (!st.ok()) throw st.error_msg();
      const np = mesh.num_points(), nf = mesh.num_faces();
      const getA = id => { const a = dec.GetAttributeByUniqueId(mesh, id), arr = new D.DracoFloat32Array(); dec.GetAttributeFloatForAllPoints(mesh, a, arr); const o = new Float32Array(np * a.num_components()); for (let i = 0; i < o.length; i++) o[i] = arr.GetValue(i); D.destroy(arr); return o; };
      const P = getA(ext.attributes.POSITION), N = ext.attributes.NORMAL !== undefined ? getA(ext.attributes.NORMAL) : null;
      const ia = new D.DracoInt32Array(), idx = new Uint32Array(nf * 3);
      for (let f = 0; f < nf; f++) { dec.GetFaceFromMesh(mesh, f, ia); idx[f * 3] = ia.GetValue(0); idx[f * 3 + 1] = ia.GetValue(1); idx[f * 3 + 2] = ia.GetValue(2); }
      D.destroy(ia); D.destroy(mesh); D.destroy(buf); D.destroy(dec);
      const g = groups[p.material] ||= { pos: [], nor: [], idx: [], n: 0 };
      for (let i = 0; i < np; i++) {
        const x = P[i*3], y = P[i*3+1], z = P[i*3+2];
        g.pos.push(W[0]*x + W[4]*y + W[8]*z + W[12], W[1]*x + W[5]*y + W[9]*z + W[13], W[2]*x + W[6]*y + W[10]*z + W[14]);
        if (N) { const a = N[i*3], c = N[i*3+1], e = N[i*3+2]; let u = W[0]*a + W[4]*c + W[8]*e, v = W[1]*a + W[5]*c + W[9]*e, w = W[2]*a + W[6]*c + W[10]*e; const l = Math.hypot(u, v, w) || 1; g.nor.push(u/l, v/l, w/l); }
        else g.nor.push(0, 1, 0);
      }
      for (const k of idx) g.idx.push(k + g.n); g.n += np;
    }
    for (const c of n.children || []) visit(c, W);
  };
  for (const r of J.scenes[J.scene || 0].nodes) visit(r, I);
  let mn = [1e9,1e9,1e9], mx = [-1e9,-1e9,-1e9];
  for (const k in groups) { const p = groups[k].pos; for (let i = 0; i < p.length; i += 3) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], p[i+a]); mx[a] = Math.max(mx[a], p[i+a]); } }
  console.log('bbox', mn.map(v => v.toFixed(3)), mx.map(v => v.toFixed(3)));
  // 출력: 위치 Int16 양자화, 법선 Int8, 인덱스 Uint16/Uint32
  const parts = [], meta = { bmin: mn, bmax: mx, groups: [] }; let off = 0;
  const push = (ta) => { const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; } const bb = Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength); parts.push(bb); const o = off; off += bb.length; return o; };
  let tris = 0;
  for (const k of Object.keys(groups)) {
    const g = groups[k], m = J.materials[k] || {}, nv = g.pos.length / 3;
    const q = new Int16Array(g.pos.length); for (let i = 0; i < g.pos.length; i++) { const a = i % 3; q[i] = Math.round(((g.pos[i] - mn[a]) / (mx[a] - mn[a]) * 2 - 1) * 32767); }
    const nn = new Int8Array(g.nor.length); for (let i = 0; i < g.nor.length; i++) nn[i] = Math.round(g.nor[i] * 127);
    const ix = nv < 65536 ? Uint16Array.from(g.idx) : Uint32Array.from(g.idx);
    let cmn=[1e9,1e9,1e9],cmx=[-1e9,-1e9,-1e9]; for (let i=0;i<g.pos.length;i+=3) for (let a=0;a<3;a++){cmn[a]=Math.min(cmn[a],g.pos[i+a]);cmx[a]=Math.max(cmx[a],g.pos[i+a]);}
    meta.groups.push({ c: cmn.map((v,a)=>+((v+cmx[a])/2).toFixed(3)), size: cmn.map((v,a)=>+(cmx[a]-v).toFixed(3)), name: m.name || ('m' + k), color: (m.pbrMetallicRoughness || {}).baseColorFactor || [0.8,0.8,0.8,1], rough: (m.pbrMetallicRoughness || {}).roughnessFactor ?? 0.8, ds: !!m.doubleSided,
      nv, ni: ix.length, i32: !(nv < 65536), pos: push(q), nor: push(nn), idx: push(ix) });
    tris += ix.length / 3;
  }
  fs.writeFileSync(out + '.bin', Buffer.concat(parts)); fs.writeFileSync(out + '.json', JSON.stringify(meta));
  console.log('groups', meta.groups.length, 'tris', tris, 'bytes', off);
  for (const g of meta.groups) console.log(' ', g.name, g.nv, g.ni / 3);
});
