/* ------------------------------------------------------------------ *
 *  The kit: models from the asset packs (art-inbox/, converted by
 *  tools/kit.js into kitdata.js), made to belong here.
 *
 *  The packs' own flat bright colours are thrown away. Each triangle
 *  only says what it's made of (wood, iron, stone, clay, cloth...), and
 *  it's coloured here: dull, dirty, every vertex a little different, and
 *  darker toward the floor where the filth climbs. The game's ink
 *  material does the rest (grain, grime, the colour cap), as on
 *  everything else. The packs' flames are dropped: the game lights its own.
 *
 *  KitModels.geo(name, { h }) → a geometry with vertex colours, its feet
 *  on y = 0, centred, scaled to height h (shared: don't modify it).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const KM = DG.KitModels = {};

const PAL = { 0:0x3e3c3a, 1:0x4a3624, 2:0x382818, 3:0x2e2a28, 4:0x585450, 5:0x67625a, 6:0x56402e, 7:0x4a1a14, 8:0x000000, 9:0x1e2a26, 10:0x2a2a30 };
const DROP = { 8:true };                                           // flames

const b64 = s=>{ const bin = atob(s), a = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) a[i] = bin.charCodeAt(i); return a.buffer; };
const hash = (x, y, z)=>{ const h = Math.sin(x*127.1 + y*311.7 + z*74.7)*43758.5453; return h - Math.floor(h); };
const base = {}, sized = {};

KM.has = name=> !!(DG.KITDATA && DG.KITDATA.models[name]);

function decode(name){
  if(base[name]) return base[name];
  const d = DG.KITDATA.models[name], [hx, hh, hz] = d.box;
  const P = new Uint16Array(b64(d.p)), Q = new Int8Array(b64(d.q)), Mt = new Uint8Array(b64(d.m)), I = d.i32 ? new Uint32Array(b64(d.i)) : new Uint16Array(b64(d.i));
  const n = d.n, pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3), c = new THREE.Color();
  for(let i=0;i<n;i++){
    const x = (P[i*3]/65535*2 - 1)*hx, y = P[i*3 + 1]/65535*hh, z = (P[i*3 + 2]/65535*2 - 1)*hz;
    pos[i*3] = x; pos[i*3 + 1] = y; pos[i*3 + 2] = z;
    const nx = Q[i*3]/127, ny = Q[i*3 + 1]/127, nz = Q[i*3 + 2]/127, l = Math.hypot(nx, ny, nz) || 1;
    nor[i*3] = nx/l; nor[i*3 + 1] = ny/l; nor[i*3 + 2] = nz/l;
    // its stuff's colour, mottled, sunk in filth toward the floor
    c.setHex(PAL[Mt[i]] !== undefined ? PAL[Mt[i]] : PAL[0]);
    const k = (0.72 + hash(x*3.1, y*3.7, z*2.9)*0.5)*(0.62 + 0.38*Math.min(1, y/(hh*0.35 + 0.05)));
    col[i*3] = c.r*k; col[i*3 + 1] = c.g*k; col[i*3 + 2] = c.b*k;
  }
  // leave out the triangles of dropped stuff (the packs' flames)
  const keep = [];
  for(let t=0;t<I.length;t+=3) if(!DROP[Mt[I[t]]]) keep.push(I[t], I[t + 1], I[t + 2]);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n*2), 2));
  g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(keep, 1) : new THREE.Uint16BufferAttribute(keep, 1));
  g.userData.h = hh;
  return base[name] = g;
}
KM.geo = function(name, opts){
  if(!KM.has(name)) return null;
  const h = opts && opts.h, key = name + "@" + (h || 0);
  if(sized[key]) return sized[key];
  const g0 = decode(name);
  if(!h) return sized[key] = g0;
  const g = g0.clone(), s = h/g0.userData.h; g.scale(s, s, s); g.computeBoundingSphere();
  return sized[key] = g;
};
/* a part for a decor rig (baked with the rest by K.bake): white, so the vertex colours stand */
const WHITE = new THREE.MeshLambertMaterial({ color:0xffffff });
KM.part = function(parent, name, h, x, y, z, ry, s){
  const g = KM.geo(name, { h });
  if(!g) return null;
  const m = new THREE.Mesh(g.clone(), WHITE);
  m.position.set(x || 0, y || 0, z || 0); if(ry) m.rotation.y = ry; if(s) m.scale.setScalar(s);
  m.userData.part = true; parent.add(m);
  return m;
};

})();
