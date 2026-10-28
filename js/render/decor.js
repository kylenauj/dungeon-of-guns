/* ------------------------------------------------------------------ *
 *  Decor: the things that make a room feel died in.
 *
 *  The Forsaken Keep: the dead slumped against its walls, gibbets and
 *  hanging cages, chains, clusters of candles melted into pools of wax,
 *  iron braziers, banners rotted to rags, knights' statues in pieces,
 *  stakes. The Undercroft: sewer grates and culverts weeping, corpses
 *  half eaten by fungus. The Crypt: ossuary walls, burial niches, open
 *  graves, cold soul-candles. The Gloomwood and the Forest: dead trees
 *  hung with moss, the dead wrapped in mycelium with cordyceps bursting
 *  out of them, giant glowcaps.
 *
 *  A builder returns a Group of parts (kit.part) and lists of glows and
 *  lights. world.js flattens every room's decor into one baked mesh;
 *  parts marked `lit` glow by themselves and bake into one unlit mesh.
 *  Composite shapes (skulls, corpses) are built in a little group and
 *  flattened into the builder's group, so they still bake as one.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const Decor = DG.Decor = {};
Decor.torch = 0x7dff3a;   // the floor's torch colour (World sets it from the theme before building)
const P = K.part, PI = Math.PI;
const S = (r, w, h)=> new THREE.SphereGeometry(r, w || 10, h || 8);
const CY = (a, b, h, n, open)=> new THREE.CylinderGeometry(a, b, h, n || 10, 1, !!open);
const CO = (r, h, n)=> new THREE.ConeGeometry(r, h, n || 8);
const BX = (w, h, d)=> new THREE.BoxGeometry(w, h, d);
const TO = (r, t, a, rs, ts)=> new THREE.TorusGeometry(r, t, rs || 5, ts || 14, a || PI*2);

/* the palette of the dead */
const BONE = 0x7e7460, BONE2 = 0x665c4a, IRON = 0x26262a, IRON2 = 0x3a3a3e, RUST = 0x6a3a22, WAX = 0xd8ccae, WAX2 = 0xc8b890,
      BLOOD = 0x4a1410, LEATHER = 0x3a2a1e, WOOD = 0x3a2a1e, WOOD2 = 0x2e2218, STONE = 0x5a5650, MOULD = 0x4a5040, MYCEL = 0xc4c4b8,
      CORD = 0xa8683a, FLESH = 0x5e4c3e, BRASS = 0x8a6a30;
const CLOTHS = [0x4a1c18, 0x2a2e3a, 0x2e3424, 0x3a3028, 0x3a2a34];

/* out: { group, glows:[{x,y,z,c,s}], lights:[{x,y,z,c,i}], eyes:[...] } */
function make(){ return { group:new THREE.Group(), glows:[], lights:[], eyes:[] }; }
/* a part that glows by itself (baked unlit) */
function L(g, geo, col, x, y, z, rx, ry, rz, sx, sy, sz){ const m = P(g, geo, col, x, y, z, rx, ry, rz, sx, sy, sz); m.userData.lit = true; return m; }
/* build in a little group, then flatten it into g (so it bakes with g) */
const _m = new THREE.Matrix4();
function sub(g, x, y, z, rx, ry, rz, s, fn){
  const t = new THREE.Group(); t.position.set(x || 0, y || 0, z || 0); t.rotation.set(rx || 0, ry || 0, rz || 0, "YXZ"); t.scale.setScalar(s || 1);
  fn(t); t.updateMatrix();
  t.children.slice().forEach(m=>{ m.updateMatrix(); _m.multiplyMatrices(t.matrix, m.matrix); _m.decompose(m.position, m.quaternion, m.scale); g.add(m); });
}
/* a rod from a to b (bones, bars, legs), r at a, r2 at b */
const _up = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3();
function rod(g, a, b, r, col, r2, n){
  _d.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); const len = _d.length(); _d.normalize();
  const m = P(g, CY(r2 === undefined ? r : r2, r, len, n || 6), col, (a[0] + b[0])/2, (a[1] + b[1])/2, (a[2] + b[2])/2);
  m.quaternion.setFromUnitVectors(_up, _d);
  return m;
}
/* a bone: a rod with knobbly ends */
function bone(g, a, b, r, col){ col = col || BONE; rod(g, a, b, r, col); P(g, S(r*1.7, 6, 4), col, a[0], a[1], a[2]); P(g, S(r*1.6, 6, 4), col, b[0], b[1], b[2]); }
/* a skull: cranium, cheekbones, jaw, dark sockets; faces +z, sits on y */
function skull(g, x, y, z, r, ry, rx, col){
  col = col || BONE;
  sub(g, x, y, z, rx || 0, ry || 0, 0, 1, t=>{
    P(t, K.slathe([[0, 0], [r*0.55, r*0.1], [r*0.95, r*0.6], [r*1.0, r*1.15], [r*0.75, r*1.65], [0, r*1.8]], 10, 3), col, 0, r*0.05, -r*0.1, 0, 0, 0, 1, 1, 1.12);
    P(t, BX(r*1.2, r*0.55, r*0.8), col, 0, r*0.45, r*0.42);
    P(t, BX(r*0.95, r*0.32, r*0.7), col, 0, r*0.08, r*0.45, 0.25);
    [-1, 1].forEach(s=> P(t, S(r*0.27, 6, 4), 0x0c0908, s*r*0.36, r*0.95, r*0.78, 0, 0, 0, 1, 1.15, 0.6));
    P(t, CO(r*0.14, r*0.3, 3), 0x0c0908, 0, r*0.62, r*0.86, PI);
    for(let k=-2;k<=2;k++) P(t, BX(r*0.12, r*0.14, r*0.06), 0xd0c4a4, k*r*0.16, r*0.3, r*0.82);
  });
}
/* a sheet of cloth hanging from y=0 down, ragged at the bottom, rippled */
function rag(w, h, seed, holes){
  const g = new THREE.PlaneGeometry(w, h, 10, 12); g.translate(0, -h/2, 0);
  const a = g.attributes.position, rr = DG.RNG(Math.floor(seed*1e5) + 11).next, cuts = [];
  for(let i=0;i<=10;i++) cuts.push(-h*(0.55 + rr()*0.45));
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), col = Math.round((x/w + 0.5)*10), cut = cuts[col];
    let ny = y < cut ? cut + (y - cut)*0.08 : y;
    a.setY(i, ny); a.setZ(i, Math.sin(x*14 + seed*7)*0.025 + Math.sin(ny*6 + x*3)*0.015);
  }
  g.computeVertexNormals();
  return g;
}
/* a candle burnt down: wax drips down the side and a pool at its foot; the flame is lit */
function candle(o, g, x, z, h, r, col, flame, y0){
  y0 = y0 || 0;
  P(g, CY(r*0.9, r, h, 8), col || WAX, x, y0 + h/2, z);
  P(g, CY(r*1.05, r*0.85, 0.02, 8), col || WAX, x, y0 + h - 0.01, z);
  for(let k=0;k<2;k++){ const a = k*2.4 + x*13, dl = h*(0.3 + 0.3*k); P(g, CY(r*0.28, r*0.4, dl, 5), col || WAX, x + Math.cos(a)*r*0.95, y0 + h - dl/2, z + Math.sin(a)*r*0.95); P(g, S(r*0.38, 5, 4), col || WAX, x + Math.cos(a)*r*0.95, y0 + h - dl, z + Math.sin(a)*r*0.95); }
  P(g, CY(0.004, 0.004, 0.04, 3), 0x111111, x, y0 + h + 0.02, z);
  if(flame !== false){ L(g, CO(r*0.5, r*1.7 + 0.03, 5), flame || 0xffd890, x, y0 + h + 0.05, z); o.glows.push({ x, y:y0 + h + 0.07, z, c:flame ? flame : 0xffa850, s:0.32 }); }
}
/* a pool of old wax spread over the floor */
function waxpool(g, r, seed, col){ r *= 0.62; P(g, K.sculpt(new THREE.SphereGeometry(r, 14, 6, 0, PI*2, 0, PI/2), r*0.22, 5/r, seed*7), col || 0xa89a78, 0, 0, 0, 0, 0, 0, 1, 0.1, 1); }
/* a crate gone soft with age: dark planks, iron at the corners */
function crate(Pp, g, s, x, y, z, ry, wood){
  const dk = new THREE.Color(wood).multiplyScalar(0.62).getHex();
  P(g, BX(s, s*0.92, s), wood, x, y + s*0.46, z, 0, ry, 0);
  const c = Math.cos(ry), sn = Math.sin(ry), at = (u, v)=> [x + u*c + v*sn, z - u*sn + v*c];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v])=>{ const [px, pz] = at(u*s*0.48, v*s*0.48); P(g, BX(s*0.1, s*0.94, s*0.1), IRON, px, y + s*0.46, pz, 0, ry, 0); });
  [0.06, 0.86].forEach(k=> P(g, BX(s*1.02, s*0.08, s*1.02), dk, x, y + s*k, z, 0, ry, 0));
  for(let k=-1;k<=1;k++){ const [px, pz] = at(k*s*0.3, 0); P(g, BX(s*0.02, s*0.02, s*0.96), dk, px, y + s*0.925, pz, 0, ry, 0); }
  const [bx, bz] = at(0, s*0.51); P(g, BX(s*1.1, s*0.08, s*0.03), dk, bx, y + s*0.46, bz, 0, ry, 0.72);
}
/* a dead tree: a twisting trunk in three tapering lengths, roots flared
   into the floor, bare branches clawing up, dead moss hanging */
function deadTree(Pp, g, cx, cz, ht, rs, s){
  const rr = DG.RNG(Math.floor(s*1e6) + 7).next, bark = [0x2a2420, 0x2e2622, 0x262022][Math.floor(rr()*3)];
  const pts = []; let px = cx, pz = cz;
  for(let k=0;k<=6;k++){ pts.push([px, k/6*ht, pz]); px += (rr() - 0.5)*rs*1.6; pz += (rr() - 0.5)*rs*1.6; }
  [[0, 3, 1], [2, 5, 0.72], [4, 7, 0.48]].forEach(([a, b, k])=> P(g, K.tube(pts.slice(a, b), rs*k, 8, 7), bark));
  P(g, K.slathe([[rs*1.9, 0], [rs*1.25, 0.12], [rs*1.02, 0.35], [rs*0.98, 0.5]], 9, 3), bark, cx, 0, cz);
  for(let k=0;k<5;k++){
    const a = k/5*PI*2 + rr()*0.8, l = rs*(2.6 + rr()*2.4);
    P(g, K.tube([[cx + Math.cos(a)*rs*0.6, 0.35, cz + Math.sin(a)*rs*0.6], [cx + Math.cos(a)*l*0.5, 0.14, cz + Math.sin(a)*l*0.5], [cx + Math.cos(a)*l, 0.0, cz + Math.sin(a)*l]], rs*0.32, 6, 6), bark);
  }
  const tips = [];
  for(let k=0;k<3;k++){
    const i = 3 + Math.floor(rr()*3), o = pts[Math.min(6, i)], a = rr()*PI*2, l = ht*(0.3 + rr()*0.2);
    const m1 = [o[0] + Math.cos(a)*l*0.45, o[1] + l*0.2, o[2] + Math.sin(a)*l*0.45], e = [o[0] + Math.cos(a + 0.6)*l, o[1] + l*0.55, o[2] + Math.sin(a + 0.6)*l];
    P(g, K.tube([o, m1, e], rs*0.28, 6, 6), bark);
    const tw = [e[0] + Math.cos(a - 0.9)*l*0.35, e[1] + l*0.3, e[2] + Math.sin(a - 0.9)*l*0.35];
    P(g, K.tube([m1, [(m1[0] + tw[0])/2, m1[1] + l*0.2, (m1[2] + tw[2])/2], tw], rs*0.14, 4, 6), bark);
    tips.push(m1, e);
  }
  tips.forEach(t=>{ if(rr() < 0.6) for(let k=0;k<4;k++){ const l = 0.2 + rr()*0.45; P(g, CO(0.012 + rr()*0.01, l, 3), [0x22261e, 0x2a2c22][k % 2], t[0] + (rr() - 0.5)*0.16, t[1] - l/2, t[2] + (rr() - 0.5)*0.16, PI); } });
  return pts[6];
}
/* a giant glowcap: a pale fibrous stalk with a swollen foot and a torn ring,
   a dark lumpy bell of a cap, glowing at the gills and in veins over the top */
function glowcap(Pp, g, lit, cx, cz, ht, R, col, s){
  const rr = DG.RNG(Math.floor(s*1e6) + 3).next, lean = (rr() - 0.5)*0.25;
  const tx = cx - Math.sin(lean)*ht, top = ht*Math.cos(lean);
  P(g, K.sculpt(K.slathe([[R*0.5, 0], [R*0.4, R*0.12], [R*0.24, R*0.4], [R*0.19, ht*0.55], [R*0.22, ht + 0.02]], 10, 3), R*0.035, 6/R, s*9), 0x5e5a54, cx, 0, cz, 0, 0, lean);
  P(g, K.tatter(new THREE.CylinderGeometry(R*0.26, R*0.42, R*0.3, 16, 3, true), -R*0.04, 11, R*0.22, s*5), 0x6a665e, cx - Math.sin(lean)*ht*0.72, ht*0.72, cz);
  const capH = R*0.9, ry = rr()*6;
  const cap = K.sculpt(K.slathe([[R, 0], [R*0.94, R*0.22], [R*0.74, R*0.56], [R*0.42, R*0.82], [R*0.12, R*0.94], [0, R*0.96]], 14, 3), R*0.07, 3.2/R, s*13);
  const capCol = [0x34303c, 0x2e343a, 0x3a3036, 0x2e3634][Math.floor(rr()*4)];
  const y0 = top - R*0.08;
  P(g, cap, capCol, tx, y0, cz, 0, ry, 0, 1, 0.9, 1);
  // bioluminescent veins: thin, dim, uneven, wandering and forking down from wherever
  // they start (evenly spaced bright ribs made it a beach umbrella)
  const lc = new THREE.Color(col).multiplyScalar(0.45).getHex();
  const vein = (a, f0, f1, w)=>{
    const pts = []; let aa = a;
    for(let j=0;j<=4;j++){ const f = f0 + j/4*(f1 - f0), rad = R*Math.sin(f*PI/2)*1.005, hh = R*0.96*0.9*Math.cos(f*PI/2*0.98); aa += (rr() - 0.5)*0.35; pts.push([tx + Math.cos(aa)*rad, y0 + hh + 0.006, cz + Math.sin(aa)*rad]); }
    L(lit, K.tube(pts, R*w, 4, 3), lc);
    return aa;
  };
  for(let k=0;k<11;k++){
    const a = rr()*PI*2, f0 = 0.1 + rr()*0.45, f1 = Math.min(1, f0 + 0.25 + rr()*0.5);
    const end = vein(a, f0, f1, 0.006 + rr()*0.006);
    if(rr() < 0.4) vein(end + (rr() < 0.5 ? 0.3 : -0.3), f1 - 0.1, Math.min(1, f1 + 0.2), 0.004);
  }
  L(lit, TO(R*0.97, R*0.02, PI*2, 4, 28), new THREE.Color(col).multiplyScalar(0.6).getHex(), tx, y0, cz, PI/2);
  L(lit, CY(R*0.92, R*0.2, R*0.2, 20, true), new THREE.Color(col).multiplyScalar(0.7).getHex(), tx, y0 - R*0.1, cz);
  for(let k=0;k<6;k++){ const a = rr()*PI*2, l = 0.15 + rr()*0.45*R*2; P(g, CY(0.008, 0.003, l, 3), MYCEL, tx + Math.cos(a)*R*0.9, y0 - 0.02 - l/2, cz + Math.sin(a)*R*0.9); }
  return { x:tx, y:y0 - R*0.07, z:cz, h:capH };
}
Decor.skull = skull; Decor.crate = crate; Decor.deadTree = deadTree; Decor.glowcap = glowcap; Decor.rod = rod; Decor.bone = bone; Decor.sub = sub; Decor.rag = rag; Decor.candle = candle;

/* ---- the dead ----
   A body facing +z. pose: "slump" (sat against a wall at z=0), "lie" (on its
   back across the floor), "hang" (by the wrists from a chain at y=hy).
   What's left of it: bare bones; rags; rusted armour; mummified skin;
   fungus eating it; mycelium wrapping it; cordyceps bursting out of it. */
/* a pool of old blood under something: flat, dark, ragged */
function pool(g, r, rnd, x, z){
  const geo = new THREE.CircleGeometry(r, 14), a = geo.attributes.position;
  for(let i=1;i<a.count;i++){ const k = 0.7 + rnd()*0.45; a.setX(i, a.getX(i)*k); a.setY(i, a.getY(i)*k*0.85); }
  P(g, geo, 0x240806, x || 0, 0.006, z || 0, -PI/2, 0, rnd()*PI);
}
function corpse(o, g, rnd, opt){
  opt = opt || {};
  const col = opt.skin ? FLESH : (opt.col || BONE), lr = opt.skin ? 0.038 : 0.022, j = ()=> (rnd() - 0.5)*0.06;
  const pose = opt.pose || "slump", J = {};
  if(pose === "slump"){
    const bentL = rnd() < 0.5, bentR = rnd() < 0.5;
    J.pel = [0, 0.11, 0.17]; J.neck = [0.02, 0.56, 0.1]; J.head = [0.05 + j(), 0.6, 0.15]; J.headR = [0.7 + rnd()*0.4, (rnd() - 0.5)*0.8, (rnd() - 0.5)*0.6];
    J.spine = [[0, 0.12, 0.15], [0, 0.3, 0.09], [0.01, 0.46, 0.08], J.neck];
    J.sh = [[-0.15, 0.5, 0.09], [0.15, 0.5, 0.09]];
    J.el = [[-0.22, 0.28, 0.15 + j()], [0.22, 0.28, 0.15 + j()]];
    J.ha = [[-0.2 + j(), 0.06, 0.32 + j()*2], [0.24 + j(), 0.06, 0.3 + j()*2]];
    J.hip = [[-0.08, 0.1, 0.2], [0.08, 0.1, 0.2]];
    J.kn = [bentL ? [-0.12, 0.3, 0.42] : [-0.12, 0.07, 0.48], bentR ? [0.13, 0.3, 0.42] : [0.14, 0.07, 0.48]];
    J.an = [bentL ? [-0.13, 0.05, 0.62] : [-0.16, 0.05, 0.78], bentR ? [0.15, 0.05, 0.62] : [0.2, 0.05, 0.78]];
    J.ribY = [0.27, 0.33, 0.39, 0.45]; J.ribZ = 0.1; J.ribTilt = 0.35;
  } else if(pose === "lie"){
    const reach = rnd() < 0.5;
    J.pel = [0, 0.06, 0.1]; J.neck = [0, 0.07, -0.36]; J.head = [0.02, 0.0, -0.48]; J.headR = [-1.2, (rnd() - 0.5)*1.4, rnd() - 0.5];
    J.spine = [[0, 0.06, 0.08], [0, 0.08, -0.08], [0, 0.08, -0.24], J.neck];
    J.sh = [[-0.15, 0.06, -0.3], [0.15, 0.06, -0.3]];
    J.el = reach ? [[-0.24, 0.05, -0.55], [0.32, 0.04, -0.2]] : [[-0.26, 0.04, -0.12], [0.26, 0.04, -0.14]];
    J.ha = reach ? [[-0.2, 0.03, -0.82], [0.36, 0.03, 0.05]] : [[-0.24, 0.03, 0.1], [0.3, 0.03, 0.08]];
    J.hip = [[-0.08, 0.05, 0.12], [0.08, 0.05, 0.12]];
    J.kn = [[-0.12, 0.05, 0.45], [0.16, 0.12, 0.42]]; J.an = [[-0.13, 0.04, 0.8], [0.2, 0.04, 0.76]];
    J.ribY = null;
  } else {
    const hy = opt.hy || 1.5;
    J.sh = [[-0.14, hy - 0.42, 0.1], [0.14, hy - 0.42, 0.1]];
    J.el = [[-0.2, hy - 0.2, 0.08], [0.21, hy - 0.2, 0.08]]; J.ha = [[-0.17, hy, 0.06], [0.18, hy, 0.06]];
    J.neck = [0, hy - 0.4, 0.11]; J.head = [0.03, hy - 0.5, 0.17]; J.headR = [0.9, 0.3, 0.3];
    J.pel = [0, hy - 0.86, 0.1]; J.spine = [[0, hy - 0.84, 0.1], [0, hy - 0.66, 0.08], [0, hy - 0.5, 0.09], J.neck];
    J.hip = [[-0.08, hy - 0.87, 0.12], [0.08, hy - 0.87, 0.12]];
    J.kn = [[-0.09, hy - 1.2, 0.16], [0.1, hy - 1.18, 0.14]]; J.an = [[-0.09, hy - 1.52, 0.12], [0.11, hy - 1.5, 0.12]];
    J.ribY = [hy - 0.72, hy - 0.66, hy - 0.6, hy - 0.54]; J.ribZ = 0.1; J.ribTilt = 0.2;
  }
  // the bones
  P(g, K.tube(J.spine, lr*1.1, 8, 6), col);
  P(g, S(0.1, 8, 6), col, J.pel[0], J.pel[1], J.pel[2], 0, 0, 0, 1.15, 0.6, 0.8);
  [0, 1].forEach(i=>{
    bone(g, J.sh[i], J.el[i], lr, col); bone(g, J.el[i], J.ha[i], lr*0.85, col);
    bone(g, J.hip[i], J.kn[i], lr*1.25, col); bone(g, J.kn[i], J.an[i], lr*1.05, col);
    for(let k=-1;k<=1;k++) rod(g, J.ha[i], [J.ha[i][0] + k*0.025, J.ha[i][1] - 0.03, J.ha[i][2] + 0.06], 0.007, col);
    P(g, BX(0.07, 0.04, 0.14), col, J.an[i][0], Math.max(0.025, J.an[i][1] - 0.02), J.an[i][2] + 0.05);
  });
  rod(g, J.sh[0], J.sh[1], lr*0.8, col);
  if(J.ribY) J.ribY.forEach((y, k)=> P(g, TO(0.12 - Math.abs(k - 1.5)*0.012, 0.011, PI, 3, 10), col, 0, y, J.ribZ - 0.02, PI/2 + J.ribTilt, 0, 0, 1, 1, 0.9));
  else for(let k=0;k<4;k++) P(g, TO(0.12, 0.011, PI, 3, 10), col, 0, 0.07, -0.12 - k*0.06, 0, 0, 0, 1, 0.6, 1);
  if(!opt.helm) skull(g, J.head[0], J.head[1] - 0.06, J.head[2], 0.08, J.headR[1], J.headR[0], col === FLESH ? 0xa89a80 : col);
  // what's left on it
  if(opt.skin) for(let k=0;k<3;k++) P(g, K.lump(0.05, 1, 0.4, rnd()*9), FLESH, J.pel[0] + (rnd() - 0.5)*0.2, J.pel[1] + 0.05, J.pel[2], 0, 0, 0, 1.4, 0.6, 1);
  if(opt.cloth !== undefined){
    const c = CLOTHS[opt.cloth % CLOTHS.length];
    if(pose === "lie") P(g, K.sculpt(new THREE.SphereGeometry(0.2, 12, 6, 0, PI*2, 0, PI/2), 0.03, 9, rnd()*9), c, 0, 0.03, -0.1, 0, 0, 0, 1, 0.35, 1.7);
    else {
      const t = K.tatter(new THREE.CylinderGeometry(0.15, 0.2, 0.36, 12, 4, true), -0.08, 9, 0.14, rnd()*9);
      P(g, t, c, J.pel[0], (J.sh[0][1] + J.pel[1])/2 + 0.04, J.spine[1][2] + 0.02, pose === "slump" ? -0.25 : 0);
      if(rnd() < 0.6) P(g, K.sculpt(new THREE.SphereGeometry(0.11, 10, 6, 0, PI*2, 0, PI*0.6), 0.015, 12, rnd()*9), c, J.head[0], J.head[1] + 0.02, J.head[2] - 0.03, -0.5);
    }
  }
  if(opt.armour){
    P(g, K.slathe([[0.15, 0], [0.18, 0.1], [0.17, 0.24], [0.1, 0.3], [0, 0.31]], 10, 3), opt.armour, J.pel[0], J.sh[0][1] - 0.3, J.spine[2][2] + 0.01, pose === "slump" ? -0.15 : 0, 0, 0, 1.1, 1, 0.75);
    [0, 1].forEach(i=> P(g, S(0.07, 8, 5, 0, PI*2, 0, PI/2), opt.armour, J.sh[i][0]*1.05, J.sh[i][1] - 0.01, J.sh[i][2]));
    if(opt.helm){ P(g, K.slathe([[0.1, 0], [0.11, 0.08], [0.1, 0.17], [0.06, 0.22], [0, 0.23]], 10, 3), opt.armour, J.head[0], J.head[1] - 0.06, J.head[2], J.headR[0]*0.5 - 0.2, J.headR[1], 0); P(g, BX(0.14, 0.018, 0.03), 0x0a0a0a, J.head[0], J.head[1] + 0.05, J.head[2] + 0.1); }
  }
  // the Gloom's growths
  if(opt.fungus){
    for(let k=0;k<5;k++){ const p = [J.pel, J.sh[0], J.sh[1], J.kn[0], J.head][k]; P(g, K.lump(0.05 + rnd()*0.05, 1, 0.5, rnd()*9), MOULD, p[0] + j(), p[1] + 0.03, p[2] + j(), 0, 0, 0, 1.2, 0.7, 1.2); }
    for(let k=0;k<4;k++){ const p = [J.sh[1], J.pel, J.kn[1], J.head][k], sh = 0.08 + rnd()*0.12; P(g, CY(0.008, 0.012, sh, 4), 0xa8a490, p[0] + j(), p[1] + sh/2, p[2] + j()); P(g, CO(0.035, 0.05, 6), [0x6a6250, 0x8a7a5a][k % 2], p[0] + j()*0.2, p[1] + sh + 0.02, p[2]); }
  }
  if(opt.mycel){
    const ends = [J.head, J.sh[0], J.sh[1], J.ha[0], J.ha[1], J.kn[0], J.kn[1], J.an[0], J.an[1], J.pel];
    for(let k=0;k<9;k++){ const a = ends[Math.floor(rnd()*ends.length)], b = ends[Math.floor(rnd()*ends.length)], m = [(a[0] + b[0])/2 + j()*2, (a[1] + b[1])/2 + 0.04, (a[2] + b[2])/2 + j()*2]; P(g, K.tube([a, m, b], 0.006 + rnd()*0.006, 6, 3), MYCEL); }
    for(let k=0;k<3;k++){ const p = ends[Math.floor(rnd()*ends.length)]; P(g, K.sculpt(new THREE.SphereGeometry(0.07 + rnd()*0.05, 10, 6), 0.02, 18, rnd()*9), 0xb0b2a6, p[0], p[1], p[2], 0, 0, 0, 1.3, 0.6, 1.3); }
    for(let k=0;k<3;k++){ const p = ends[Math.floor(rnd()*ends.length)], c = 0x4ab8e8; P(g, CY(0.006, 0.008, 0.08, 4), 0xc8d0d4, p[0] + j(), p[1] + 0.04, p[2] + j()); L(g, new THREE.SphereGeometry(0.03, 8, 4, 0, PI*2, 0, PI/2), c, p[0] + j()*0.5, p[1] + 0.08, p[2]); o.glows.push({ x:p[0], y:p[1] + 0.1, z:p[2], c, s:0.2 }); }
  }
  if(opt.cord){
    const roots = [J.head, J.spine[2], J.sh[0], J.sh[1], J.pel];
    for(let k=0;k<7;k++){
      const p = roots[k % roots.length], a = rnd()*PI*2, l = 0.25 + rnd()*0.5, lean = 0.15 + rnd()*0.35;
      const tip = [p[0] + Math.cos(a)*l*lean, p[1] + l, p[2] + Math.sin(a)*l*lean + 0.05];
      P(g, K.tube([p, [p[0] + Math.cos(a)*l*lean*0.3 + j(), p[1] + l*0.5, p[2] + Math.sin(a)*l*lean*0.3 + 0.03], tip], 0.012 + rnd()*0.008, 6, 4), CORD);
      L(g, S(0.022, 6, 4), 0xffa860, tip[0], tip[1], tip[2], 0, 0, 0, 1, 1.6, 1);
      if(k % 2 === 0) o.glows.push({ x:tip[0], y:tip[1], z:tip[2], c:0xff7a2a, s:0.2 });
    }
  }
  return J;
}
Decor.corpse = corpse;

const B = {
  /* ---- on the floor: everywhere ---- */
  bones(o, rnd){ for(let i=0;i<5;i++){ const x = (rnd() - 0.5)*0.6, z = (rnd() - 0.5)*0.6, a = rnd()*6, l = 0.12 + rnd()*0.2; bone(o.group, [x - Math.cos(a)*l, 0.025, z - Math.sin(a)*l], [x + Math.cos(a)*l, 0.025, z + Math.sin(a)*l], 0.016, i % 2 ? BONE : BONE2); } skull(o.group, 0.1, 0, 0.08, 0.075, rnd()*6, (rnd() - 0.5)*0.6); for(let k=0;k<3;k++) P(o.group, TO(0.08, 0.009, PI, 3, 8), BONE2, -0.15 + k*0.05, 0.015, -0.12, PI/2, 0, 0.3); },
  skull(o, rnd){ skull(o.group, 0, 0, 0, 0.09, rnd()*6, (rnd() - 0.5)*0.5); bone(o.group, [-0.2, 0.02, 0.1], [0.12, 0.02, 0.22], 0.016); },
  skullpile(o, rnd){
    for(let i=0;i<7;i++){ const a = i*2.4 + rnd(), d = i ? 0.12 + rnd()*0.16 : 0; skull(o.group, Math.cos(a)*d, i ? 0 : 0.0, Math.sin(a)*d, 0.07 + rnd()*0.02, a + PI + (rnd() - 0.5), (rnd() - 0.5)*0.8); }
    for(let i=0;i<3;i++){ const a = rnd()*PI*2; skull(o.group, Math.cos(a)*0.06, 0.1, Math.sin(a)*0.06, 0.07, rnd()*6, (rnd() - 0.5)*0.8); }
    skull(o.group, 0, 0.2, 0, 0.075, rnd()*0.6 - 0.3, 0.2);
    for(let i=0;i<6;i++){ const a = rnd()*PI*2, l = 0.18; bone(o.group, [Math.cos(a)*0.1, 0.03, Math.sin(a)*0.1], [Math.cos(a)*0.1 + Math.cos(a + 1)*l, 0.03 + rnd()*0.08, Math.sin(a)*0.1 + Math.sin(a + 1)*l], 0.017, BONE2); }
  },
  rubble(o, rnd){ for(let i=0;i<6;i++){ const s = 0.06 + rnd()*0.12; P(o.group, BX(s*1.4, s, s*1.1), [STONE, 0x4a4640, 0x625e56][i % 3], (rnd() - 0.5)*0.6, s*0.4, (rnd() - 0.5)*0.6, rnd()*0.5, rnd()*6, rnd()*0.5); } for(let i=0;i<8;i++) P(o.group, new THREE.DodecahedronGeometry(0.02 + rnd()*0.03), 0x4a4640, (rnd() - 0.5)*0.8, 0.02, (rnd() - 0.5)*0.8, rnd(), rnd()); },
  candle(o, rnd){ waxpool(o.group, 0.14, rnd()); candle(o, o.group, 0, 0, 0.12 + rnd()*0.14, 0.04); o.lights.push({ x:0, y:0.4, z:0, c:0xff9a40, i:0.5 }); },
  candles(o, rnd){ B.candlecluster(o, rnd); },
  candlecluster(o, rnd){
    waxpool(o.group, 0.3 + rnd()*0.1, rnd());
    const n = 5 + Math.floor(rnd()*4);
    for(let i=0;i<n;i++){ const a = i*2.4 + rnd(), d = i ? 0.06 + rnd()*0.2 : 0, h = 0.06 + rnd()*(i ? 0.25 : 0.4); candle(o, o.group, Math.cos(a)*d, Math.sin(a)*d, h, 0.025 + rnd()*0.02, rnd() < 0.85 ? WAX : WAX2, rnd() < 0.18 ? false : undefined); }
    o.lights.push({ x:0, y:0.45, z:0, c:0xff9a40, i:0.75 });
  },
  soulcandles(o, rnd){
    waxpool(o.group, 0.28, rnd(), 0x9a9a98);
    for(let i=0;i<5;i++){ const a = i*2.4 + rnd(), d = i ? 0.08 + rnd()*0.16 : 0; candle(o, o.group, Math.cos(a)*d, Math.sin(a)*d, 0.08 + rnd()*0.26, 0.03, 0xb8b4a8, 0x8ad8ff); }
    skull(o.group, 0.12, 0, -0.14, 0.07, 0.4, 0);
    o.lights.push({ x:0, y:0.5, z:0, c:0x6ac8ff, i:0.8 });
  },
  sack(o, rnd){ P(o.group, K.sculpt(K.slathe([[0, 0], [0.24, 0.04], [0.27, 0.2], [0.18, 0.4], [0.07, 0.48], [0.06, 0.54], [0, 0.54]], 10, 3), 0.025, 9, rnd()*9), 0x4a3e2c, 0, 0, 0, (rnd() - 0.5)*0.4, rnd()*6, 0.25); P(o.group, TO(0.06, 0.012), 0x2a2218, 0, 0.47, 0, PI/2); P(o.group, new THREE.CircleGeometry(0.25, 9), 0x5a4c34, 0.22, 0.01, 0.12, -PI/2); },
  cobweb(o){ const w = new THREE.Mesh(new THREE.CircleGeometry(0.5, 6, 0, PI/2), new THREE.MeshBasicMaterial({ map:webTex(), transparent:true, opacity:0.4, depthWrite:false, side:THREE.DoubleSide, color:0xb8b8b0 })); w.rotation.x = -PI/2; w.position.y = 0.04; o.group.add(w); o.loose = true; },
  barrelstack(o, rnd){
    const KM = DG.KitModels;
    if(KM && KM.has("barrel")){
      // two standing, one laid across them
      KM.part(o.group, "barrel", 0.62, -0.22, 0, 0, rnd()*6); KM.part(o.group, "barrel", 0.62, 0.24, 0, 0.05, rnd()*6);
      const top = KM.part(o.group, "barrel", 0.62, 0, 0.86, 0.02); if(top){ top.rotation.set(0, 0.3, PI/2); }
      for(let k=0;k<3;k++) P(o.group, BX(0.05, 0.015, 0.36), 0x3a2a1c, 0.5 + k*0.06, 0.01, 0.3, 0, k*0.6, 0);
      return;
    }
    const barrel = (x, y, z, rx, ry)=> sub(o.group, x, y, z, rx, ry, 0, 1, t=>{ P(t, K.lathe([[0, -0.21], [0.17, -0.21], [0.2, 0], [0.17, 0.21], [0, 0.21]], 12), [0x3a2a1c, 0x34261a][Math.floor(rnd()*2)]); [-0.14, 0.14].forEach(y=> P(t, TO(0.185, 0.012), RUST, 0, y, 0, PI/2)); });
    barrel(-0.2, 0.21, 0, 0, 0); barrel(0.22, 0.21, 0.05, 0, 0); barrel(0, 0.62, 0.02, PI/2, 0.3);
    for(let k=0;k<3;k++) P(o.group, BX(0.05, 0.015, 0.36), 0x3a2a1c, 0.45 + k*0.06, 0.01, 0.3, 0, k*0.6, 0);
  },
  mushrooms(o, rnd){ for(let i=0;i<6;i++){ const x = (rnd() - 0.5)*0.4, z = (rnd() - 0.5)*0.4, h = 0.1 + rnd()*0.28, r = 0.03 + rnd()*0.04, lean = (rnd() - 0.5)*0.4; P(o.group, CY(0.008, 0.014, h, 5), 0xa8a490, x, h/2, z, 0, 0, lean); P(o.group, K.slathe([[r, 0], [r*0.9, r*0.5], [r*0.5, r*1.1], [0, r*1.4]], 8, 2), [0x6a6250, 0x7a6a4a, 0x5a5444][i % 3], x - Math.sin(lean)*h, h*Math.cos(lean) - r*0.2, z, 0, 0, lean); } },
  glowshroom(o, rnd){ B.glowcap(o, rnd); },
  moss(o, rnd){ P(o.group, K.sculpt(new THREE.SphereGeometry(0.4, 14, 5, 0, PI*2, 0, PI/2), 0.06, 7, rnd()*9), 0x2a3428, 0, 0, 0, 0, 0, 0, 1, 0.08, 1); },
  toadstools(o, rnd){
    // inkcaps: tall pale bells dissolving into black ink at the rim
    for(let i=0;i<4;i++){ const x = (rnd() - 0.5)*0.35, z = (rnd() - 0.5)*0.35, h = 0.18 + rnd()*0.25, lean = (rnd() - 0.5)*0.3;
      P(o.group, CY(0.012, 0.018, h, 5), 0xc0bcae, x, h/2, z, 0, 0, lean);
      const cx = x - Math.sin(lean)*h, cy = h*Math.cos(lean);
      P(o.group, K.slathe([[0.05, 0], [0.055, 0.06], [0.045, 0.13], [0.02, 0.17], [0, 0.18]], 8, 2), 0x8a847a, cx, cy - 0.12, z, 0, 0, lean);
      P(o.group, K.tatter(CY(0.052, 0.058, 0.05, 10, true), -0.005, 7, 0.06, rnd()*9), 0x141214, cx, cy - 0.12, z, 0, 0, lean); }
  },
  gravestone(o, rnd){
    const lean = (rnd() - 0.5)*0.3, tw = (rnd() - 0.5)*0.4;
    sub(o.group, 0, 0, 0, 0, tw, lean, 1, t=>{
      P(t, BX(0.48, 0.55, 0.12), 0x52525a, 0, 0.27, 0); P(t, CY(0.24, 0.24, 0.12, 14, false), 0x52525a, 0, 0.55, 0, PI/2);
      P(t, BX(0.04, 0.2, 0.02), 0x1a1a1e, 0, 0.42, 0.065); P(t, BX(0.14, 0.04, 0.02), 0x1a1a1e, 0, 0.46, 0.065);
      P(t, BX(0.02, 0.3, 0.01), 0x101012, 0.1, 0.3, 0.062, 0, 0, 0.4);
    });
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.3, 10, 5, 0, PI*2, 0, PI/2), 0.05, 8, rnd()*9), 0x2a2420, 0, 0, 0.3, 0, 0, 0, 1, 0.25, 1.4);
    for(let k=0;k<4;k++) P(o.group, CO(0.02, 0.1 + rnd()*0.1, 3), 0x3a4232, (rnd() - 0.5)*0.4, 0.05, 0.06 + rnd()*0.1, (rnd() - 0.5)*0.5, 0, (rnd() - 0.5)*0.5);
  },
  opengrave(o, rnd){
    // a grave dug and left open: a black pit, the spoil heaped beside it, bones thrown out
    P(o.group, BX(0.62, 0.02, 1.2), 0x050404, 0, 0.012, 0);
    [-1, 1].forEach(s=>{ P(o.group, BX(0.06, 0.06, 1.28), 0x2a2420, s*0.34, 0.03, 0); });
    [-1, 1].forEach(s=> P(o.group, BX(0.74, 0.06, 0.06), 0x2a2420, 0, 0.03, s*0.63));
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.42, 12, 6, 0, PI*2, 0, PI/2), 0.06, 7, rnd()*9), 0x2e2620, 0.7, 0, 0.1, 0, 0, 0, 0.7, 0.45, 1.3);
    rod(o.group, [0.62, 0.05, -0.35], [0.85, 0.75, -0.2], 0.015, WOOD); P(o.group, BX(0.12, 0.02, 0.16), IRON2, 0.6, 0.02, -0.4, 0, 0.5, 0);
    skull(o.group, 0.55, 0.18, 0.3, 0.07, -0.8, 0.3); bone(o.group, [0.42, 0.12, 0.45], [0.7, 0.2, 0.55], 0.016, BONE2);
  },
  urns(o, rnd){ for(let i=0;i<3;i++){ const x = (i - 1)*0.2 + (rnd() - 0.5)*0.05, h = 0.22 + rnd()*0.16; P(o.group, K.slathe([[0, 0], [0.06, 0], [0.1, h*0.4], [0.07, h*0.85], [0.05, h], [0.07, h*1.05], [0, h*1.05]], 10, 3), [0x5a4a3a, 0x4a4a4e, BRASS][i], x, 0, (rnd() - 0.5)*0.1); } P(o.group, CY(0.08, 0.1, 0.03, 8), 0x3a3a3e, 0.36, 0.015, 0.1, 0.2, 0, 1.4); },
  /* ---- the keep ---- */
  brazier(o, rnd){
    for(let k=0;k<3;k++){ const a = k/3*PI*2; rod(o.group, [Math.cos(a)*0.24, 0.0, Math.sin(a)*0.24], [Math.cos(a)*0.1, 0.6, Math.sin(a)*0.1], 0.02, IRON); P(o.group, BX(0.07, 0.02, 0.07), IRON, Math.cos(a)*0.24, 0.01, Math.sin(a)*0.24); }
    P(o.group, TO(0.12, 0.015), IRON, 0, 0.32, 0, PI/2);
    P(o.group, K.lathe([[0.06, 0], [0.22, 0.05], [0.28, 0.16], [0.26, 0.18], [0.2, 0.08], [0.05, 0.03]], 12), IRON, 0, 0.6, 0);
    for(let k=0;k<8;k++){ const a = k/8*PI*2; P(o.group, CO(0.02, 0.08, 4), IRON, Math.cos(a)*0.28, 0.8, Math.sin(a)*0.28); }
    // it burns the floor's light, like the torches (Decor.torch: the mood's torch colour)
    const fire = Decor.torch, tone = (k, w)=> new THREE.Color(fire).multiplyScalar(k).lerp(new THREE.Color(0xffffff), w || 0).getHex();
    for(let k=0;k<7;k++){ const a = rnd()*PI*2, d = rnd()*0.14; L(o.group, K.lump(0.045 + rnd()*0.03, 0, 0.5, rnd()*9), [fire, tone(0.6), tone(0.25)][k % 3], Math.cos(a)*d, 0.74 + rnd()*0.03, Math.sin(a)*d); }
    L(o.group, CO(0.1, 0.24, 6), tone(1, 0.2), 0, 0.88, 0); L(o.group, CO(0.06, 0.32, 5), tone(1, 0.8), 0.03, 0.9, -0.02, 0, 0, 0.15);
    o.glows.push({ x:0, y:0.86, z:0, c:fire, s:1.4 }, { x:0, y:1.05, z:0, c:tone(1, 0.5), s:0.6 });
    o.lights.push({ x:0, y:1.2, z:0, c:fire, i:1.5 });
  },
  candelabra(o, rnd){
    P(o.group, CY(0.12, 0.17, 0.05, 8), IRON, 0, 0.025, 0); for(let k=0;k<3;k++){ const a = k/3*PI*2; P(o.group, CO(0.03, 0.1, 4), IRON, Math.cos(a)*0.15, 0.04, Math.sin(a)*0.15, PI/2, 0, 0); }
    P(o.group, CY(0.018, 0.026, 1.05, 6), IRON, 0, 0.55, 0); P(o.group, TO(0.035, 0.012), IRON2, 0, 0.5, 0, PI/2);
    P(o.group, TO(0.2, 0.014, PI, 4, 12), IRON, 0, 1.06, 0, 0, 0, PI);
    [-0.2, 0, 0.2].forEach((x, i)=>{ const y = i === 1 ? 1.11 : 1.07; P(o.group, CY(0.04, 0.03, 0.03, 8), IRON, x, y - 0.01, 0); candle(o, o.group, x, 0, 0.06 + rnd()*0.16, 0.028, WAX, undefined, y); });
    for(let k=0;k<5;k++) P(o.group, S(0.02, 5, 4), WAX, (rnd() - 0.5)*0.4, 0.01, (rnd() - 0.5)*0.3, 0, 0, 0, 1.5, 0.3, 1.5);
    o.lights.push({ x:0, y:1.3, z:0, c:0xff9a40, i:0.85 });
  },
  armour(o, rnd){ corpse(o, o.group, rnd, { pose:rnd() < 0.5 ? "lie" : "slump", armour:[0x4a443e, 0x5a4a3a][Math.floor(rnd()*2)], helm:true, cloth:0 }); },
  deadknight(o, rnd){ B.armour(o, rnd); P(o.group, BX(0.06, 0.02, 0.8), 0x4a4a4e, 0.32, 0.02, 0.4, 0, 0.3, 0); P(o.group, BX(0.2, 0.03, 0.04), IRON, 0.25, 0.03, 0.02, 0, 0.3, 0); },
  /* ---- from the dungeon prop pack (kitmodels.js): the instruments, and what's left in them ---- */
  stocks(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("stocks")) return B.bones(o, rnd);
    pool(o.group, 0.55, rnd, 0, 0.3);
    KM.part(o.group, "stocks", 0.9, 0, 0, 0);
    // whoever was left in them: the skull still in the hole, the rest in a heap below
    skull(o.group, 0, 0.6, 0.06, 0.075, rnd()*0.6 - 0.3, 0.4);
    B.bones(o, rnd);
  },
  guillotine(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("guillotine")) return B.brokenstatue(o, rnd);
    pool(o.group, 0.75, rnd, 0, 0.35);
    KM.part(o.group, "guillotine", 2.5, 0, 0, 0);
    // the basket, and what's in it
    P(o.group, K.lathe([[0, 0], [0.16, 0], [0.2, 0.18], [0.21, 0.2], [0, 0.2]], 10), 0x2e2218, 0, 0, 0.62);
    skull(o.group, 0.03, 0.2, 0.62, 0.075, rnd()*6, 0.3);
  },
  xstocks(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("xstocks")) return B.shackled(o, rnd);
    pool(o.group, 0.6, rnd, 0, 0.2);
    KM.part(o.group, "xstocks", 1.65, 0, 0, 0);
    corpse(o, o.group, rnd, { pose:"slump", col:BONE });
  },
  gallows(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("gallows")) return B.cage(o, rnd);
    KM.part(o.group, "gallows", 2.3, 0, 0, 0);
    pool(o.group, 0.4, rnd, 0.3, 0);
  },
  /* on a wall: a board of iron spikes, stained; a plank of shackles */
  spikewall(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("spikeboard")) return B.chains(o, rnd);
    const m = KM.part(o.group, "spikeboard", 1.05, 0, 0.35, 0.03); if(m) m.rotation.x = -0.05;
  },
  shacklewall(o, rnd){
    const KM = DG.KitModels; if(!KM || !KM.has("shackles")) return B.chains(o, rnd);
    KM.part(o.group, "shackles", 0.5, 0, 1.2, 0.04);
    B.slumped(o, rnd);
  },
  weaponrack(o, rnd){
    if(DG.KitModels && DG.KitModels.has("weaponrack")){ DG.KitModels.part(o.group, "weaponrack", 0.92, 0, 0, 0); return; }
    P(o.group, BX(0.8, 0.06, 0.18), WOOD, 0, 0.1, 0); P(o.group, BX(0.06, 0.95, 0.06), WOOD, -0.37, 0.48, 0); P(o.group, BX(0.06, 0.6, 0.06), WOOD, 0.37, 0.3, 0, 0, 0, 0.1);
    P(o.group, BX(0.5, 0.05, 0.1), WOOD2, -0.12, 0.88, -0.02, 0, 0, -0.08);
    [-0.25, -0.05].forEach((x, i)=>{ rod(o.group, [x, 0.12, 0], [x + 0.02, 1.0, 0], 0.014, WOOD2); P(o.group, i ? CO(0.04, 0.2, 4) : BX(0.12, 0.2, 0.015), 0x5a5652, x + 0.02, 1.1, 0); });
    // the rest of it on the floor: a fallen spear, a rusted blade
    rod(o.group, [0.0, 0.03, 0.35], [0.85, 0.03, 0.1], 0.014, WOOD2); P(o.group, CO(0.04, 0.2, 4), 0x5a5652, 0.95, 0.03, 0.07, 0, 0, -PI/2);
    P(o.group, BX(0.07, 0.015, 0.6), RUST, 0.25, 0.015, 0.3, 0, 1.1, 0);
  },
  brokenstatue(o, rnd){
    // a knight's statue, toppled: the torso on its side, the helm rolled away, the plinth cracked
    const sc = 0x6a6660;
    P(o.group, BX(0.7, 0.35, 0.7), 0x56524c, -0.5, 0.17, 0, 0, 0.2, 0); P(o.group, BX(0.12, 0.3, 0.14), sc, -0.42, 0.45, 0.1, 0, 0, 0.3); P(o.group, BX(0.12, 0.25, 0.14), sc, -0.6, 0.42, -0.05, 0, 0, -0.2);
    sub(o.group, 0.2, 0.24, 0, 0, 0.3, PI/2 - 0.1, 1, t=>{
      P(t, K.slathe([[0.2, 0], [0.25, 0.12], [0.27, 0.32], [0.3, 0.45], [0.12, 0.55], [0, 0.56]], 10, 3), sc, 0, 0, 0, 0, 0, 0, 1, 1, 0.75);
      P(t, S(0.12, 8, 6), sc, 0.3, 0.45, 0, 0, 0, 0, 1, 0.8, 1); P(t, CY(0.06, 0.05, 0.3, 7), sc, -0.3, 0.32, 0.08, 0.5, 0, 0.6);
    });
    P(o.group, K.slathe([[0.14, 0], [0.16, 0.12], [0.15, 0.26], [0.1, 0.33], [0, 0.35]], 10, 3), sc, 0.75, 0.14, 0.35, 1.3, 0.4, 0); P(o.group, BX(0.2, 0.025, 0.04), 0x101012, 0.8, 0.18, 0.45, 0, 0.4, 0);
    for(let k=0;k<5;k++){ const s = 0.05 + rnd()*0.08; P(o.group, BX(s*1.3, s, s), sc, (rnd() - 0.5)*1.2, s*0.4, (rnd() - 0.5)*0.8, rnd(), rnd()*6, rnd()); }
  },
  spikes(o, rnd){
    // stakes driven into a frame; one of them wears a skull
    P(o.group, BX(0.7, 0.08, 0.16), WOOD, 0, 0.04, 0, 0, rnd()*0.4, 0);
    const n = 4, tops = [];
    for(let k=0;k<n;k++){ const x = (k - (n - 1)/2)*0.17, h = 0.55 + rnd()*0.35, lean = (rnd() - 0.5)*0.35, lz = (rnd() - 0.5)*0.3; rod(o.group, [x, 0.02, 0], [x + Math.sin(lean)*h, h, Math.sin(lz)*h], 0.022, IRON, 0.004); tops.push([x + Math.sin(lean)*h, h, Math.sin(lz)*h]); }
    const t = tops[Math.floor(rnd()*n)]; skull(o.group, t[0], t[1] - 0.17, t[2], 0.08, rnd() - 0.5, 0.2);
    P(o.group, CY(0.03, 0.06, 0.4, 5), BLOOD, t[0], t[1] - 0.45, t[2], 0, 0, 0, 1, 1, 0.5);
  },
  cage(o, rnd){
    // a gibbet cage, cut down and burst open, its prisoner still inside
    sub(o.group, 0, 0, 0, 0, 0, 1.25, 1, t=>{
      for(let k=0;k<9;k++){ const a = k/9*PI*2; if(k === 2) continue; rod(t, [Math.cos(a)*0.24, 0, Math.sin(a)*0.24], [Math.cos(a)*0.24, 0.75, Math.sin(a)*0.24], 0.012, IRON); }
      [0.02, 0.38, 0.74].forEach(y=> P(t, TO(0.24, 0.014, PI*2, 4, 18), IRON, 0, y, 0, PI/2));
      P(t, CO(0.25, 0.22, 9, true), IRON, 0, 0.86, 0);
    });
    corpse(o, o.group, rnd, { pose:"lie", col:BONE2 });
  },
  /* ---- the Undercroft ---- */
  drain(o, rnd){
    P(o.group, CY(0.32, 0.34, 0.04, 16), IRON2, 0, 0.02, 0); P(o.group, CY(0.27, 0.27, 0.02, 16), 0x050505, 0, 0.035, 0);
    for(let k=-2;k<=2;k++) P(o.group, BX(0.035, 0.03, 0.56 - Math.abs(k)*0.08), IRON, k*0.1, 0.05, 0);
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.4, 12, 5, 0, PI*2, 0, PI/2), 0.05, 7, rnd()*9), 0x2a3422, 0.1, 0, 0.15, 0, 0, 0, 1, 0.06, 1);
  },
  fungalcorpse(o, rnd){ corpse(o, o.group, rnd, { pose:rnd() < 0.6 ? "slump" : "lie", cloth:Math.floor(rnd()*5), fungus:true, col:BONE2 }); },
  rotpod(o, rnd){ for(let i=0;i<3;i++){ const r = 0.1 + rnd()*0.1, x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.5; P(o.group, K.lump(r, 2, 0.35, rnd()*9), [0x3a2430, 0x4a2a34][i % 2], x, r*0.6, z, 0, 0, 0, 1, 0.75, 1); P(o.group, S(r*0.3, 6, 4), 0x1a0a10, x, r*1.2, z); o.glows.push({ x, y:r*1.25, z, c:i % 2 ? 0xc83a8a : 0x8acc3a, s:0.22 }); } P(o.group, new THREE.CircleGeometry(0.45, 10), 0x1e0e18, 0, 0.012, 0, -PI/2); o.lights.push({ x:0, y:0.4, z:0, c:0x8acc3a, i:0.3 }); },
  ratnest(o, rnd){ for(let i=0;i<14;i++) P(o.group, BX(0.012, 0.012, 0.15 + rnd()*0.12), 0x6a5a38, (rnd() - 0.5)*0.4, 0.02 + rnd()*0.05, (rnd() - 0.5)*0.4, rnd()*0.3, rnd()*6, 0); B.bones(o, rnd); },
  /* ---- the Gloom ---- */
  roots(o, rnd){ for(let i=0;i<5;i++){ const a = i*1.3 + rnd(); P(o.group, K.tube([[0, 0.06, 0], [Math.cos(a)*0.3, 0.2, Math.sin(a)*0.3], [Math.cos(a)*0.7, 0.01, Math.sin(a)*0.7]], 0.05 - i*0.006, 10, 6), 0x2a201a); } P(o.group, K.lump(0.16, 1, 0.3, rnd()*9), 0x2a201a, 0, 0.08, 0, 0, 0, 0, 1, 0.6, 1); },
  glowcap(o, rnd){
    const c = [0x7dff3a, 0x5aff8a, 0x9cff4a][Math.floor(rnd()*3)], n = 1 + Math.floor(rnd()*3);
    for(let i=0;i<n;i++){ const a = rnd()*PI*2, d = i ? 0.2 + rnd()*0.15 : 0, R = i ? 0.1 + rnd()*0.08 : 0.2 + rnd()*0.12;
      const t = glowcap(P, o.group, o.group, Math.cos(a)*d, Math.sin(a)*d, R*3 + rnd()*0.3, R, c, rnd()); o.glows.push({ x:t.x, y:t.y, z:t.z, c, s:R*5 }); }
    o.lights.push({ x:0, y:0.8, z:0, c, i:0.8 });
  },
  fern(o, rnd){ for(let i=0;i<14;i++){ const a = rnd()*PI*2, l = 0.15 + rnd()*0.25, lean = 0.3 + rnd()*0.6; P(o.group, CO(0.012, l, 3), [0x3a3424, 0x4a4030, 0x2e2a1e][i % 3], Math.cos(a)*0.06 + Math.cos(a)*Math.sin(lean)*l/2, Math.cos(lean)*l/2, Math.sin(a)*0.06 + Math.sin(a)*Math.sin(lean)*l/2, Math.sin(a)*lean, 0, -Math.cos(a)*lean); } },
  log(o, rnd){
    P(o.group, K.sculpt(CY(0.2, 0.23, 1.3, 12), 0.03, 6, rnd()*9), 0x2e2420, 0, 0.2, 0, 0, 0, PI/2); P(o.group, CY(0.17, 0.17, 0.02, 12), 0x5a4a3a, 0.66, 0.2, 0, 0, 0, PI/2); P(o.group, CY(0.1, 0.1, 0.03, 10), 0x0e0a08, 0.665, 0.2, 0, 0, 0, PI/2);
    for(let i=0;i<3;i++){ const x = -0.45 + i*0.3 + (rnd() - 0.5)*0.12, r = 0.05 + rnd()*0.06, y = 0.28 + rnd()*0.12; P(o.group, K.lump(r, 1, 0.4, rnd()*9), 0x4a4238, x, y, 0.17, 0.3, 0, 0, 1.4, 0.3, 0.9); L(o.group, TO(r*1.1, 0.007, PI, 3, 10), 0x3ab8e8, x, y - 0.01, 0.17, PI/2 + 0.3, 0, PI); }
    o.glows.push({ x:-0.05, y:0.38, z:0.15, c:0x3ab8ff, s:0.5 });
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.25, 10, 5, 0, PI*2, 0, PI/2), 0.04, 8, rnd()*9), 0x2a3428, 0.2, 0.36, 0, 0, 0, 0, 1, 0.25, 0.8);
  },
  firsapling(o, rnd){ deadTree(P, o.group, 0, 0, 1.0 + rnd()*0.6, 0.06, rnd()); },
  deadtree(o, rnd){ deadTree(P, o.group, 0, 0, 1.3 + rnd()*0.7, 0.09, rnd()); },
  myceliumcorpse(o, rnd){ corpse(o, o.group, rnd, { pose:rnd() < 0.5 ? "slump" : "lie", skin:rnd() < 0.5, mycel:true, cloth:Math.floor(rnd()*5) }); },
  cordyceps(o, rnd){ corpse(o, o.group, rnd, { pose:rnd() < 0.6 ? "slump" : "lie", skin:true, cord:true, mycel:rnd() < 0.5 }); o.lights.push({ x:0, y:0.7, z:0.2, c:0xff8a3a, i:0.35 }); },
  fallenpillar(o, rnd){ P(o.group, CY(0.24, 0.24, 1.4, 8), 0x4a4650, 0, 0.24, 0, 0, 0, PI/2); P(o.group, BX(0.6, 0.15, 0.6), 0x3e3a44, -0.75, 0.08, 0); [-0.2, 0.3].forEach(x=> P(o.group, TO(0.25, 0.03, PI*2, 4, 8), 0x55515e, x, 0.24, 0, 0, PI/2)); P(o.group, K.sculpt(new THREE.SphereGeometry(0.3, 10, 5, 0, PI*2, 0, PI/2), 0.04, 8, rnd()*9), 0x2a3428, 0.2, 0.42, 0, 0, 0, 0, 1, 0.3, 0.9); P(o.group, K.tube([[-0.5, 0.48, 0.1], [0, 0.5, -0.15], [0.5, 0.46, 0.1]], 0.03, 8, 4), 0x2a201a); },
  ribcage(o, rnd){
    // the ribs of something enormous, half sunk in the floor
    for(let k=0;k<4;k++) P(o.group, TO(0.5 - k*0.06, 0.04 - k*0.004, PI*0.85, 5, 14), 0xa89c84, -0.3 + k*0.2, 0, 0, 0, PI/2 + 0.1, 0.25);
    P(o.group, K.tube([[-0.45, 0.06, -0.05], [0, 0.1, -0.08], [0.45, 0.05, -0.05]], 0.05, 10, 6), 0x9a8e74);
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.35, 10, 5, 0, PI*2, 0, PI/2), 0.05, 8, rnd()*9), 0x2a3428, 0.1, 0, 0.1, 0, 0, 0, 1, 0.15, 1);
  },
  reeds(o, rnd){ for(let i=0;i<7;i++){ const h = 0.5 + rnd()*0.4, x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.5, lean = (rnd() - 0.5)*0.5; P(o.group, CY(0.008, 0.014, h, 4), 0x5a5038, x, h/2, z, lean*0.4, 0, lean); P(o.group, CY(0.022, 0.022, 0.1, 5), 0x2e2418, x - Math.sin(lean)*h*0.9, h*0.92, z, lean*0.4, 0, lean); } },
  frogstatue(o){
    // a toad idol, squat and pitted, sunk in moss; its crown has gone green
    P(o.group, BX(0.9, 0.3, 0.9), 0x46443e, 0, 0.15, 0);
    P(o.group, K.lump(0.36, 3, 0.18, 4), 0x50544a, 0, 0.55, 0, 0, 0, 0, 1.2, 0.7, 1);
    P(o.group, BX(0.42, 0.02, 0.06), 0x14140f, 0, 0.5, 0.33, 0, 0, 0);
    [-1, 1].forEach(s=>{ P(o.group, S(0.07, 8, 6), 0x50544a, s*0.17, 0.72, 0.22, 0, 0, 0, 1, 0.6, 1); P(o.group, BX(0.08, 0.012, 0.03), 0x0a0a08, s*0.17, 0.75, 0.28, 0, 0, s*0.3); P(o.group, S(0.1, 8, 6), 0x50544a, s*0.33, 0.28, 0.24, 0, 0, 0, 1, 0.5, 1.3); for(let k=0;k<3;k++) P(o.group, CO(0.012, 0.06, 3), 0x3a3a34, s*(0.28 + k*0.04), 0.26, 0.4, PI/2, 0, 0); });
    P(o.group, CY(0.12, 0.14, 0.09, 8), 0x4a5a3a, 0, 0.93, 0.03); for(let k=0;k<6;k++){ const a = k/6*PI*2; P(o.group, CO(0.025, 0.07, 4), 0x4a5a3a, Math.cos(a)*0.11, 1.0, 0.03 + Math.sin(a)*0.11); }
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.5, 12, 5, 0, PI*2, 0, PI/2), 0.05, 7, 3), 0x2a3428, 0, 0.3, 0, 0, 0, 0, 1, 0.12, 1);
  },
  /* ---- on the north wall (z is the wall's face; y from the floor) ---- */
  slumped(o, rnd){ corpse(o, o.group, rnd, { pose:"slump", cloth:rnd() < 0.7 ? Math.floor(rnd()*5) : undefined, col:rnd() < 0.5 ? BONE : BONE2 }); },
  shackled(o, rnd){
    // hung by the wrists in irons, long dead
    const hy = 1.45;
    [-1, 1].forEach(s=>{ P(o.group, BX(0.08, 0.08, 0.04), IRON, s*0.22, hy + 0.12, 0.02); P(o.group, TO(0.03, 0.01, PI*2, 3, 8), IRON2, s*0.22, hy + 0.06, 0.05); for(let k=0;k<2;k++) P(o.group, TO(0.025, 0.008, PI*2, 3, 8), IRON2, s*(0.21 - k*0.01), hy + 0.0 - k*0.04, 0.06, 0, k % 2 ? PI/2 : 0); P(o.group, CY(0.03, 0.03, 0.05, 8), IRON, s*0.18, hy, 0.06); });
    corpse(o, o.group, rnd, { pose:"hang", hy, cloth:rnd() < 0.6 ? Math.floor(rnd()*5) : undefined, skin:rnd() < 0.3 });
  },
  gibbet(o, rnd){
    // an iron arm out of the wall, a chain, and a cage with someone still in it
    P(o.group, BX(0.12, 0.3, 0.05), IRON, 0, 1.55, 0.025); P(o.group, BX(0.05, 0.05, 0.6), IRON, 0, 1.62, 0.3); rod(o.group, [0, 1.4, 0.03], [0, 1.6, 0.5], 0.018, IRON);
    for(let k=0;k<4;k++) P(o.group, TO(0.025, 0.007, PI*2, 3, 8), IRON2, 0, 1.56 - k*0.045, 0.56, 0, k % 2 ? PI/2 : 0);
    const cy = 0.55, R = 0.2;
    for(let k=0;k<9;k++){ const a = k/9*PI*2; rod(o.group, [Math.cos(a)*R, cy, 0.56 + Math.sin(a)*R], [Math.cos(a)*R, cy + 0.72, 0.56 + Math.sin(a)*R], 0.01, IRON); }
    [cy, cy + 0.36, cy + 0.72].forEach(y=> P(o.group, TO(R, 0.012, PI*2, 4, 16), IRON, 0, y, 0.56, PI/2));
    P(o.group, CO(R, 0.16, 9, true), IRON, 0, cy + 0.8, 0.56); P(o.group, CY(R, R, 0.02, 12), IRON2, 0, cy, 0.56);
    skull(o.group, 0.03, cy + 0.02, 0.6, 0.075, 0.6, 0.4); for(let k=0;k<3;k++) P(o.group, TO(0.09, 0.009, PI, 3, 8), BONE2, 0, cy + 0.1 + k*0.05, 0.54, PI/2 + 0.6, 0, 0);
    bone(o.group, [0.1, cy + 0.05, 0.6], [0.32, cy - 0.2, 0.7], 0.016, BONE2); bone(o.group, [-0.06, cy + 0.08, 0.5], [-0.12, cy + 0.42, 0.62], 0.013, BONE2);
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.2, 10, 5, 0, PI*2, 0, PI/2), 0.04, 9, rnd()*9), BLOOD, 0.05, 0.005, 0.62, 0, 0, 0, 1, 0.05, 1);
  },
  banner(o, rnd){
    const c = CLOTHS[Math.floor(rnd()*3)], s = rnd();
    P(o.group, CY(0.018, 0.018, 0.66, 6), IRON, 0, 1.55, 0.07, 0, 0, PI/2); [-1, 1].forEach(k=> P(o.group, CO(0.03, 0.07, 4), IRON, k*0.36, 1.55, 0.07, 0, 0, -k*PI/2));
    P(o.group, rag(0.54, 1.05, s), c, 0, 1.53, 0.075);
    // a faded device: a pale tower, or a skull
    if(rnd() < 0.5){ P(o.group, BX(0.12, 0.2, 0.01), 0x7a6a50, 0, 1.25, 0.1); P(o.group, BX(0.18, 0.04, 0.01), 0x7a6a50, 0, 1.36, 0.1); }
    else { P(o.group, S(0.07, 8, 6), 0x7a6a50, 0, 1.28, 0.09, 0, 0, 0, 1, 1, 0.2); P(o.group, BX(0.03, 0.2, 0.01), 0x7a6a50, 0, 1.12, 0.095, 0, 0, 0.7); P(o.group, BX(0.03, 0.2, 0.01), 0x7a6a50, 0, 1.12, 0.095, 0, 0, -0.7); }
  },
  shelf(o, rnd){ P(o.group, BX(0.7, 0.05, 0.22), WOOD, 0, 1.1, 0.11, 0, 0, 0.08); P(o.group, BX(0.04, 0.2, 0.04), IRON, -0.3, 1.0, 0.03); for(let i=0;i<3;i++) P(o.group, K.slathe([[0, 0], [0.05, 0], [0.06, 0.08], [0.03, 0.15], [0.035, 0.18], [0, 0.18]], 8, 2), [0x3a3a30, 0x4a3a2a, 0x2a3434][i], (i - 1)*0.2, 1.13 + (i - 1)*0.016, 0.11); skull(o.group, 0.32, 1.16, 0.1, 0.06, -0.3, 0); },
  chains(o, rnd){ for(let k=0;k<3;k++){ const x = (k - 1)*0.25, n = 6 + Math.floor(rnd()*6); for(let i=0;i<n;i++) P(o.group, TO(0.035, 0.01, PI*2, 3, 8), [IRON2, RUST][i % 3 === 2 ? 1 : 0], x, 1.62 - i*0.07, 0.06, 0, i % 2 ? PI/2 : 0); P(o.group, TO(0.06, 0.016, PI*2, 4, 10), IRON, x, 1.62 - n*0.07 - 0.04, 0.06); P(o.group, BX(0.08, 0.06, 0.04), IRON, x, 1.66, 0.02); } },
  wallshroom(o, rnd){ P(o.group, K.sculpt(new THREE.SphereGeometry(0.4, 12, 8), 0.06, 7, rnd()*9), MOULD, 0, 0.6, 0, 0, 0, 0, 0.9, 1.1, 0.06); for(let i=0;i<7;i++){ const r = 0.05 + rnd()*0.08, x = (rnd() - 0.5)*0.55, y = 0.3 + rnd()*0.9; P(o.group, K.lump(r, 1, 0.45, rnd()*9), [0x5a4e3a, 0x6a5a40, 0x4a4234][i % 3], x, y, r*0.3, 0.3, 0, 0, 1.3, 0.4, 0.9); } },
  vines(o, rnd){ B.hangingmoss(o, rnd); },
  hangingmoss(o, rnd){ for(let i=0;i<9;i++){ const x = (rnd() - 0.5)*0.8, l = 0.4 + rnd()*0.9; P(o.group, CO(0.04 + rnd()*0.03, l, 4), [0x3a4034, 0x2e3428, 0x46483a][i % 3], x, 1.72 - l/2, 0.04 + rnd()*0.04, PI); } P(o.group, BX(0.9, 0.06, 0.1), 0x2e3428, 0, 1.7, 0.05); },
  glowmoss(o, rnd){ P(o.group, K.sculpt(new THREE.SphereGeometry(0.32, 12, 6), 0.05, 8, rnd()*9), 0x2a3428, 0, 0.95, 0, 0, 0, 0, 1, 1.3, 0.12); for(let k=0;k<7;k++){ const x = (rnd() - 0.5)*0.4, y = 0.65 + rnd()*0.6; L(o.group, S(0.018, 5, 4), 0x9cff6a, x, y, 0.04); } o.glows.push({ x:0, y:0.95, z:0.08, c:0x8adc5a, s:0.9 }); o.lights.push({ x:0, y:1.0, z:0.4, c:0x8adc5a, i:0.45 }); },
  skullniche(o, rnd){
    // a burial niche cut in the wall: a shrouded body on its shelf, a skull keeping watch
    P(o.group, BX(0.62, 0.46, 0.04), 0x050406, 0, 0.92, 0.02); P(o.group, CY(0.31, 0.31, 0.04, 12, false), 0x050406, 0, 1.15, 0.02, PI/2);
    P(o.group, BX(0.72, 0.06, 0.12), 0x46464e, 0, 0.67, 0.06); [-1, 1].forEach(s=> P(o.group, BX(0.06, 0.5, 0.06), 0x46464e, s*0.34, 0.92, 0.04));
    P(o.group, K.sculpt(K.slathe([[0, 0], [0.09, 0.05], [0.1, 0.25], [0.08, 0.45], [0.06, 0.5], [0, 0.52]], 8, 3), 0.01, 14, rnd()*9), 0x6a6250, 0.24, 0.79, 0.07, 0, 0, PI/2, 1, 1, 0.7);
    skull(o.group, -0.05, 0.7, 0.08, 0.07, (rnd() - 0.5)*0.4, 0);
    bone(o.group, [-0.25, 0.73, 0.07], [-0.12, 0.73, 0.1], 0.013, BONE2);
  },
  ossuary(o, rnd){
    // the dead stacked into the wall: rows of skulls between courses of long bones
    for(let row=0;row<4;row++){
      const y = 0.2 + row*0.36;
      P(o.group, BX(0.95, 0.12, 0.08), 0x8a7e66, 0, y - 0.04, 0.04);
      for(let k=0;k<6;k++) rod(o.group, [-0.46, y - 0.08 + k*0.018, 0.05 + (k % 2)*0.02], [0.46, y - 0.08 + k*0.018, 0.05 + (k % 2)*0.02], 0.016, k % 2 ? BONE : BONE2);
      for(let k=0;k<5;k++) skull(o.group, -0.38 + k*0.19 + (rnd() - 0.5)*0.02, y + 0.02, 0.03, 0.075, (rnd() - 0.5)*0.3, (rnd() - 0.5)*0.2, [BONE, BONE2, 0xa89c80][Math.floor(rnd()*3)]);
    }
    P(o.group, BX(1.0, 1.5, 0.02), 0x0a0808, 0, 0.75, 0.01);
  },
  candleshelf(o, rnd){
    P(o.group, BX(0.62, 0.05, 0.18), IRON, 0, 1.0, 0.09); [-0.25, 0.25].forEach(x=> rod(o.group, [x, 1.0, 0.16], [x, 0.85, 0.01], 0.012, IRON));
    [-0.2, -0.05, 0.12, 0.22].forEach(x=>{ const h = 0.05 + rnd()*0.18; candle(o, o.group, x, 0.09, h, 0.026, WAX, undefined, 1.025); });
    for(let k=0;k<4;k++){ const x = -0.25 + rnd()*0.5, l = 0.1 + rnd()*0.3; P(o.group, CY(0.012, 0.018, l, 5), WAX, x, 1.0 - l/2, 0.17); }
    o.lights.push({ x:0, y:1.2, z:0.5, c:0xff9a40, i:0.7 });
  },
  walleye(o, rnd){ P(o.group, K.lump(0.26, 2, 0.35, rnd()*9), 0x3a2a30, 0, 1.0, 0, 0, 0, 0, 1, 0.8, 0.35); P(o.group, TO(0.13, 0.04, PI*2, 6, 14), 0x4a2a2e, 0, 1.0, 0.07); o.eyes.push({ x:0, y:1.0, z:0.06, r:0.11, wall:true }); for(let k=0;k<4;k++){ const a = k*1.6 + rnd(); P(o.group, K.tube([[Math.cos(a)*0.15, 1.0 + Math.sin(a)*0.15, 0.06], [Math.cos(a)*0.32, 1.0 + Math.sin(a)*0.35, 0.03]], 0.012, 6, 3), 0x5a1a1e); } },
  wallroots(o, rnd){ for(let i=0;i<5;i++){ const x = (i - 2)*0.18 + (rnd() - 0.5)*0.1; P(o.group, K.tube([[x, 1.75, 0.02], [x + (rnd() - 0.5)*0.3, 1.2, 0.12], [x + (rnd() - 0.5)*0.4, 0.55, 0.08], [x + (rnd() - 0.5)*0.5, 0.0, 0.25]], 0.035 + rnd()*0.03, 14, 6), [0x2a201a, 0x241a16][i % 2]); } },
  wallcaps(o, rnd){ for(let i=0;i<4;i++){ const y = 0.5 + i*0.3, x = (rnd() - 0.5)*0.6, r = 0.12 + rnd()*0.1; P(o.group, K.sculpt(new THREE.SphereGeometry(r, 12, 5, 0, PI*2, 0, PI/2), r*0.12, 6/r, rnd()*9), 0x34303c, x, y, 0, 0, 0, 0, 1, 0.3, 0.75); L(o.group, TO(r*0.95, 0.01, PI, 3, 12), 0x7dff3a, x, y - 0.005, 0, PI/2, 0, PI); o.glows.push({ x, y:y - 0.02, z:r*0.4, c:0x7dff3a, s:r*3 }); } o.lights.push({ x:0, y:1.0, z:0.5, c:0x6aff3a, i:0.55 }); },
  cordycepswall(o, rnd){
    // someone the forest pinned to the wall with roots, and grew out of
    P(o.group, K.tube([[-0.4, 1.7, 0.02], [-0.1, 1.2, 0.18], [0.15, 0.9, 0.2], [0.4, 0.3, 0.05]], 0.04, 12, 6), 0x2a201a);
    P(o.group, K.tube([[0.35, 1.65, 0.02], [0.05, 1.3, 0.2], [-0.25, 0.7, 0.15], [-0.4, 0.1, 0.05]], 0.035, 12, 6), 0x241a16);
    corpse(o, o.group, rnd, { pose:"hang", hy:1.5, skin:true, cord:true, mycel:true });
    o.lights.push({ x:0, y:1.2, z:0.4, c:0xff8a3a, i:0.4 });
  },
  ribs(o){ for(let i=0;i<5;i++) P(o.group, TO(0.36 - Math.abs(i - 2)*0.03, 0.035, PI, 5, 14), 0xa89c84, 0, 0.35 + i*0.26, 0.02); P(o.group, BX(0.09, 1.4, 0.09), 0x9a8e74, 0, 0.85, 0.04); },
  shieldwall(o, rnd){
    const c = CLOTHS[Math.floor(rnd()*3)];
    [-1, 1].forEach(s=>{ P(o.group, BX(0.05, 0.8, 0.02), 0x5a5652, s*0.18, 1.05, 0.03, 0, 0, s*0.7); P(o.group, BX(0.2, 0.04, 0.04), IRON, s*0.18 + s*0.24, 1.32, 0.035, 0, 0, s*0.7); });
    P(o.group, K.slathe([[0, 0], [0.12, 0.05], [0.22, 0.3], [0.24, 0.5], [0, 0.52]], 10, 3), c, 0, 0.78, 0.05, 0, 0, 0, 1, 1, 0.18);
    P(o.group, TO(0.06, 0.02, PI*2, 4, 10), IRON2, 0, 1.06, 0.09); P(o.group, BX(0.03, 0.3, 0.02), 0x0a0a0a, 0.06, 1.0, 0.09, 0, 0, 0.5);
  },
  tapestry(o, rnd){ const c = CLOTHS[Math.floor(rnd()*5)]; P(o.group, CY(0.02, 0.02, 0.86, 6), WOOD, 0, 1.55, 0.05, 0, 0, PI/2); P(o.group, rag(0.76, 1.3, rnd()), c, 0, 1.53, 0.055); P(o.group, BX(0.6, 0.04, 0.01), 0x6a5a3a, 0, 1.3, 0.08); P(o.group, BX(0.04, 0.4, 0.01), 0x6a5a3a, 0, 1.05, 0.08); P(o.group, BX(0.3, 0.04, 0.01), 0x6a5a3a, 0, 1.12, 0.08); },
  /* ---- more wall dressing (placed by vanity.js on any wall face) ---- */
  beam(o){ P(o.group, BX(0.22, 1.7, 0.2), 0x3a2a1c, 0, 0.85, 0.1); P(o.group, BX(0.9, 0.2, 0.24), 0x30221a, 0, 1.6, 0.12); [-0.3, 0.3].forEach(x=> P(o.group, BX(0.08, 0.5, 0.08), 0x30221a, x*0.9, 1.35, 0.12, 0, 0, x > 0 ? -0.7 : 0.7)); [0.5, 1.2].forEach(y=> P(o.group, CY(0.025, 0.025, 0.05, 6), IRON, 0.06, y, 0.21, PI/2)); },
  pipes(o, rnd){
    // a culvert: a round mouth in the wall behind bars, weeping slime down the stone
    P(o.group, CY(0.3, 0.3, 0.1, 16), 0x3a3a34, 0, 0.8, 0.05, PI/2); P(o.group, CY(0.23, 0.23, 0.11, 14), 0x040404, 0, 0.8, 0.055, PI/2);
    for(let k=-2;k<=2;k++) P(o.group, CY(0.012, 0.012, 0.46 - Math.abs(k)*0.08, 5), RUST, k*0.09, 0.8, 0.11);
    P(o.group, BX(0.2, 0.55, 0.02), 0x24302a, 0, 0.3, 0.02); P(o.group, K.sculpt(new THREE.SphereGeometry(0.3, 10, 5, 0, PI*2, 0, PI/2), 0.04, 8, rnd()*9), 0x2a3426, 0, 0, 0.2, 0, 0, 0, 1, 0.05, 1);
    o.glows.push({ x:0, y:0.05, z:0.25, c:0x6a8a3a, s:0.4 });
  },
  poster(o, rnd){ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.6), K.ink({ vertexColors:false, map:posterTex(Math.floor(rnd()*2)) })); m.position.set(0, 1.05, 0.03); m.rotation.z = (rnd() - 0.5)*0.25; o.group.add(m); o.loose = true; },
  barrelrack(o){ P(o.group, BX(0.9, 0.06, 0.4), WOOD, 0, 0.5, 0.2); [-0.25, 0.25].forEach(x=>{ P(o.group, CY(0.18, 0.18, 0.4, 12), 0x34261a, x, 0.72, 0.2, PI/2); [-0.13, 0.13].forEach(z=> P(o.group, TO(0.185, 0.012, PI*2, 4, 14), RUST, x, 0.72, 0.2 + z)); P(o.group, CY(0.03, 0.03, 0.08, 6), IRON2, x, 0.62, 0.43, PI/2); }); [-0.42, 0.42].forEach(x=> P(o.group, BX(0.06, 0.5, 0.36), WOOD2, x, 0.25, 0.2)); },
  stalactites(o, rnd){ for(let i=0;i<5;i++){ const h = 0.2 + rnd()*0.35; P(o.group, CO(0.06 + rnd()*0.04, h, 6), 0x5a5a50, (i - 2)*0.2, 1.72 - h/2, 0.1 + rnd()*0.1, PI); } },
  glowworms(o, rnd){ for(let i=0;i<6;i++){ const x = (rnd() - 0.5)*0.8, l = 0.3 + rnd()*0.4; o.glows.push({ x, y:1.7 - l, z:0.05, c:0x9cffd8, s:0.16 }); P(o.group, CY(0.003, 0.003, l, 3), 0xc8d0c8, x, 1.7 - l/2, 0.05); L(o.group, S(0.012, 4, 3), 0x9cffd8, x, 1.7 - l, 0.05); } o.lights.push({ x:0, y:1.2, z:0.4, c:0x9cffd8, i:0.35 }); },
  window(o, rnd){ const c = [0x5a8ad8, 0x8a4a5a, 0x6a6aa8][Math.floor(rnd()*3)]; P(o.group, BX(0.62, 0.92, 0.06), 0x24242c, 0, 1.08, 0.02); P(o.group, CY(0.31, 0.31, 0.06, 14, false), 0x24242c, 0, 1.54, 0.02, PI/2, 0, PI/2); const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.8), new THREE.MeshBasicMaterial({ map:glassTex(), color:c })); glass.position.set(0, 1.08, 0.06); o.group.add(glass); o.loose = true; o.glows.push({ x:0, y:1.1, z:0.1, c, s:1.1 }); o.lights.push({ x:0, y:1.2, z:0.6, c, i:0.5 }); },
  coffinwall(o, rnd){ P(o.group, K.lathe([[0.0, 0], [0.22, 0], [0.3, 0.9], [0.22, 1.5], [0, 1.5]], 6), 0x2e2420, 0, 0, 0.12, 0, 0, 0, 1, 1, 0.45); P(o.group, K.lathe([[0.0, 0], [0.21, 0], [0.29, 0.88], [0.21, 1.46], [0, 1.46]], 6), 0x3a2c24, 0.06, 0.02, 0.2, 0, -0.35, 0, 1, 1, 0.12); P(o.group, BX(0.04, 0.4, 0.02), 0x6a5a3a, 0.08, 0.95, 0.28, 0, -0.35, 0); P(o.group, BX(0.2, 0.04, 0.02), 0x6a5a3a, 0.08, 1.05, 0.28, 0, -0.35, 0); for(let k=0;k<4;k++) P(o.group, S(0.012, 4, 3), IRON2, -0.12 + (k % 2)*0.24, 0.3 + Math.floor(k/2)*0.9, 0.24); bone(o.group, [-0.1, 0.5, 0.25], [-0.2, 0.15, 0.4], 0.014, BONE2); },
  urnshelf(o, rnd){ P(o.group, BX(0.8, 0.06, 0.24), 0x3a3a40, 0, 0.95, 0.12); [-0.25, 0, 0.25].forEach((x, i)=>{ if(i === 1 && rnd() < 0.5){ skull(o.group, x, 0.98, 0.12, 0.07, (rnd() - 0.5)*0.4, 0); return; } P(o.group, K.slathe([[0, 0], [0.07, 0], [0.1, 0.1], [0.06, 0.2], [0.08, 0.24], [0, 0.24]], 8, 3), [0x4a4a52, 0x5a4a3a, BRASS][i], x, 0.98, 0.12); }); },
  drips(o, rnd){ const c = rnd() < 0.5 ? 0x7acc3a : 0xa83a6a; for(let i=0;i<4;i++){ const x = (rnd() - 0.5)*0.8, h = 0.3 + rnd()*0.7; P(o.group, CY(0.02, 0.035, h, 6), new THREE.Color(c).multiplyScalar(0.5).getHex(), x, 1.7 - h/2, 0.03); L(o.group, S(0.03, 6, 4), c, x, 1.7 - h, 0.04, 0, 0, 0, 1, 1.4, 1); } o.glows.push({ x:0, y:1.2, z:0.06, c, s:0.6 }); },
  cornerweb(o){ const w = new THREE.Mesh(new THREE.CircleGeometry(0.85, 8, 0, PI/2), new THREE.MeshBasicMaterial({ map:webTex(), transparent:true, opacity:0.38, depthWrite:false, side:THREE.DoubleSide, color:0xb8b8b0 })); w.rotation.z = PI; w.position.set(0.42, 1.7, 0.03); o.group.add(w); o.loose = true; },
  bloodsmear(o, rnd){ P(o.group, BX(0.06, 0.6, 0.006), BLOOD, 0, 0.75, 0.004, 0, 0, 0.1); for(let k=0;k<4;k++) P(o.group, BX(0.025, 0.25 + rnd()*0.3, 0.006), BLOOD, -0.06 + k*0.04, 0.95 - k*0.04, 0.005, 0, 0, 0.1 + (rnd() - 0.5)*0.1); P(o.group, S(0.08, 8, 6), BLOOD, 0.02, 1.08, 0.004, 0, 0, 0, 1, 1.2, 0.05); corpse(o, o.group, rnd, { pose:"slump", cloth:Math.floor(rnd()*5), skin:rnd() < 0.5 }); },
  /* ---- on top of walls ---- */
  toprubble(o, rnd){ for(let i=0;i<4;i++){ const s = 0.07 + rnd()*0.09; P(o.group, BX(s*1.3, s, s), [0x4a4640, 0x3e3a36][i % 2], (rnd() - 0.5)*0.6, s*0.4, (rnd() - 0.5)*0.6, rnd(), rnd()*6, rnd()); } },
  topgrass(o, rnd){ for(let i=0;i<7;i++) P(o.group, CO(0.025, 0.18 + rnd()*0.15, 3), [0x4a4836, 0x3a3a2c][i % 2], (rnd() - 0.5)*0.6, 0.08, (rnd() - 0.5)*0.6, (rnd() - 0.5)*0.6, 0, (rnd() - 0.5)*0.6); },
  topcandle(o, rnd){ waxpool(o.group, 0.12, rnd()); for(let i=0;i<3;i++){ const a = i*2.1 + rnd(), d = i ? 0.06 + rnd()*0.06 : 0; candle(o, o.group, Math.cos(a)*d, Math.sin(a)*d, 0.06 + rnd()*0.14, 0.025); } for(let k=0;k<2;k++) P(o.group, CY(0.012, 0.02, 0.3 + rnd()*0.4, 5), WAX, (rnd() - 0.5)*0.3, -0.2, 0.47); },
  topskull(o, rnd){ skull(o.group, 0, 0, 0, 0.085, rnd()*6, 0); if(rnd() < 0.6) candle(o, o.group, 0.03, -0.01, 0.08, 0.022); },
  topspikes(o, rnd){ for(let i=0;i<5;i++) rod(o.group, [(i - 2)*0.16, 0, 0], [(i - 2)*0.16 + (rnd() - 0.5)*0.08, 0.32 + rnd()*0.15, (rnd() - 0.5)*0.08], 0.02, IRON, 0.003); },
  topbones(o, rnd){ for(let i=0;i<4;i++){ const a = rnd()*6; bone(o.group, [Math.cos(a)*0.15, 0.03, Math.sin(a)*0.15], [-Math.cos(a)*0.15, 0.03, -Math.sin(a)*0.15], 0.016, BONE2); } skull(o.group, 0.05, 0.02, 0.05, 0.07, rnd()*6, 0.3); }
};
/* ================================================================== *
 *  ROOMS: the dressing of the new rooms
 *  Vaults: gold and iron. The Red Throne: bone, blood and red wax.
 *  The Wizard's Quarters: a hearth, books, a cot, a kettle. The
 *  jungle pond: ferns, lotus, vines, a waterfall. Props the world
 *  builds from here too: the bone throne, the cage, the dice altar,
 *  the blood bowl and the padlock (on vault doors and golden chests).
 * ================================================================== */
const GOLD = 0xb8902e, GOLD2 = 0xd8b048, GOLD3 = 0x8a6a22, REDWAX = 0x6a1410, CRIMSON = 0x5a1210,
      LEAF = [0x4a8a34, 0x5a9a3a, 0x6aa840, 0x3e7a2c], MOSSG = 0x2e4a24, BARK = 0x3a2c1e;
/* a frond: a curved rib with leaflets down both sides (ferns, vines) */
function frond(g, a, len, lean, droop, col, n){
  const pts = []; for(let k=0;k<=4;k++){ const t = k/4, r = len*t, h = Math.sin(lean)*len*t - droop*t*t*len; pts.push([Math.cos(a)*r*Math.cos(lean*0.4), 0.02 + Math.max(0, h), Math.sin(a)*r*Math.cos(lean*0.4)]); }
  P(g, K.tube(pts, 0.008, 6, 3), 0x2a3a1a);
  for(let k=1;k<n;k++){
    const t = k/n, i = Math.min(3, Math.floor(t*4)), f = t*4 - i, p0 = pts[i], p1 = pts[i + 1];
    const x = p0[0] + (p1[0] - p0[0])*f, y = p0[1] + (p1[1] - p0[1])*f, z = p0[2] + (p1[2] - p0[2])*f, w = 0.17*(1 - t*0.65)*len;
    [-1, 1].forEach(s=> P(g, BX(w, 0.008, 0.06*len), col, x + Math.cos(a + s*1.2)*w*0.45, y, z + Math.sin(a + s*1.2)*w*0.45, 0, -(a + s*1.2), s*0.25));
  }
}
function coins(g, rnd, n, r, y){ for(let i=0;i<n;i++){ const a = rnd()*PI*2, d = Math.sqrt(rnd())*r; P(g, CY(0.035, 0.035, 0.008, 8), [GOLD, GOLD2, GOLD3][i % 3], Math.cos(a)*d, (y || 0) + 0.005 + rnd()*0.02, Math.sin(a)*d, (rnd() - 0.5)*0.6, 0, (rnd() - 0.5)*0.6); } }
Object.assign(B, {
  /* ---- the vault ---- */
  goldpile(o, rnd){
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.34, 14, 6, 0, PI*2, 0, PI/2), 0.04, 9, rnd()*9), GOLD, 0, 0, 0, 0, 0, 0, 1, 0.45, 1);
    coins(o.group, rnd, 26, 0.5, 0);
    for(let i=0;i<10;i++){ const a = rnd()*PI*2, d = rnd()*0.22; P(o.group, CY(0.035, 0.035, 0.008, 8), GOLD2, Math.cos(a)*d, 0.1 + rnd()*0.06, Math.sin(a)*d, rnd(), 0, rnd()); }
    P(o.group, K.slathe([[0, 0], [0.05, 0], [0.02, 0.04], [0.015, 0.1], [0.06, 0.14], [0.065, 0.2], [0, 0.18]], 10, 2), GOLD2, 0.18, 0.1, -0.05, 0.3, 0, 0.2);
    skull(o.group, -0.25, 0, 0.2, 0.06, 0.6, 0);
    o.glows.push({ x:0, y:0.2, z:0, c:0xffd27a, s:0.5 });
  },
  coinchest(o, rnd){
    crate(P, o.group, 0.5, 0, 0, 0, rnd()*0.5, 0x3a2414);
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.22, 12, 5, 0, PI*2, 0, PI/2), 0.02, 14, rnd()*9), GOLD, 0, 0.47, 0, 0, 0, 0, 1, 0.35, 0.95);
    coins(o.group, rnd, 12, 0.45, 0);
    o.glows.push({ x:0, y:0.55, z:0, c:0xffd27a, s:0.4 });
  },
  vaultbars(o, rnd){
    for(let i=0;i<7;i++) P(o.group, CY(0.022, 0.022, 1.5, 6), IRON, -0.45 + i*0.15, 0.85, 0.08);
    [0.3, 0.9, 1.5].forEach(y=>{ P(o.group, BX(1.05, 0.06, 0.05), IRON2, 0, y, 0.1); for(let i=0;i<7;i++) P(o.group, S(0.018, 5, 4), RUST, -0.45 + i*0.15, y, 0.13); });
    for(let k=0;k<8;k++) P(o.group, TO(0.035, 0.01, PI*2, 3, 8), IRON2, 0.4, 1.4 - k*0.07, 0.15, 0, k % 2 ? PI/2 : 0);
  },
  /* ---- the Red Throne ---- */
  bonepillar(o, rnd){
    P(o.group, CY(0.2, 0.26, 1.5, 8), 0x2a2224, 0, 0.75, 0);
    for(let lv=0; lv<4; lv++) for(let i=0;i<5;i++){ const a = i/5*PI*2 + lv*0.6; skull(o.group, Math.cos(a)*0.22, 0.1 + lv*0.34, Math.sin(a)*0.22, 0.075, -a + PI/2, 0, lv % 2 ? BONE : BONE2); }
    P(o.group, CY(0.26, 0.22, 0.08, 8), 0x2a2224, 0, 1.52, 0);
    waxpool(o.group, 0.2, rnd(), REDWAX); candle(o, o.group, 0, 0, 0.18, 0.05, REDWAX, 0xff4a2a, 1.56); candle(o, o.group, 0.1, 0.08, 0.1, 0.035, REDWAX, 0xff4a2a, 1.56);
    o.lights.push({ x:0, y:1.9, z:0, c:0xff3a1a, i:0.5 });
  },
  bloodpool(o, rnd){
    P(o.group, K.sculpt(new THREE.CircleGeometry(1.25, 28), 0.08, 3, rnd()*9), 0x2a0606, 0, 0.012, 0, -PI/2);
    L(o.group, K.sculpt(new THREE.CircleGeometry(0.9, 24), 0.1, 3, rnd()*9), 0x3a0808, 0, 0.016, 0, -PI/2);
    for(let i=0;i<9;i++){ const a = rnd()*PI*2, d = 1.1 + rnd()*0.5; P(o.group, new THREE.CircleGeometry(0.05 + rnd()*0.08, 8), 0x2a0606, Math.cos(a)*d, 0.013, Math.sin(a)*d, -PI/2); }
    o.glows.push({ x:0, y:0.05, z:0, c:0xff2a1a, s:1.4 });
  },
  redcandles(o, rnd){ waxpool(o.group, 0.3, rnd(), REDWAX); for(let i=0;i<6;i++){ const a = i*2.4 + rnd(), d = i ? 0.08 + rnd()*0.12 : 0; candle(o, o.group, Math.cos(a)*d, Math.sin(a)*d, 0.12 + rnd()*0.28, 0.035 + rnd()*0.02, REDWAX, 0xff4a2a); } o.lights.push({ x:0, y:0.5, z:0, c:0xff3a1a, i:0.45 }); },
  redbanner(o, rnd){
    P(o.group, CY(0.02, 0.02, 0.8, 6), WOOD, 0, 1.62, 0.05, 0, 0, PI/2);
    P(o.group, rag(0.66, 1.45, rnd()), CRIMSON, 0, 1.6, 0.055);
    P(o.group, TO(0.11, 0.018, PI*2, 4, 16), 0x8a6a2a, 0, 1.18, 0.07); P(o.group, S(0.045, 8, 6), 0x8a6a2a, 0, 1.18, 0.07, 0, 0, 0, 1, 0.6, 0.3);
    [-1, 1].forEach(s=> P(o.group, CO(0.02, 0.12, 4), 0x8a6a2a, s*0.16, 1.18, 0.07, 0, 0, s*PI/2));
  },
  /* the throne itself: a seat of femurs and skulls, a back of ribs and spine, a crown of horns */
  bonethrone(o, rnd){
    const g = o.group, BONE = 0xa08e76, BONE2 = 0x7e6e5c;
    P(g, BX(1.7, 0.16, 1.2), 0x241c1c, 0, 0.08, -0.05); P(g, BX(1.5, 0.12, 1.0), 0x2e2424, 0, 0.22, -0.08);
    for(let i=0;i<7;i++){ const x = -0.6 + i*0.2; bone(g, [x, 0.36, 0.38], [x + (rnd() - 0.5)*0.05, 0.62, 0.32], 0.035, i % 2 ? BONE : BONE2); }
    P(g, BX(1.2, 0.22, 0.7), 0x3a2e28, 0, 0.6, -0.05);
    P(g, rag(1.1, 0.5, rnd()), CRIMSON, 0, 0.74, 0.32, -0.15);
    P(g, BX(1.1, 0.06, 0.66), CRIMSON, 0, 0.73, -0.06);
    [-1, 1].forEach(s=>{
      bone(g, [s*0.7, 0.75, 0.35], [s*0.7, 0.8, -0.35], 0.06, BONE);
      for(let k=0;k<3;k++) bone(g, [s*0.7, 0.24, 0.3 - k*0.3], [s*0.7, 0.72, 0.3 - k*0.3], 0.04, BONE2);
      skull(g, s*0.7, 0.82, 0.32, 0.1, s*-0.3, -0.2, BONE);
    });
    // the back: a spine up the middle, ribs either side, skulls stacked to a crown
    const spine = [];
    for(let k=0;k<12;k++){ const y = 0.75 + k*0.15; spine.push(y); P(g, CY(0.07, 0.08, 0.1, 8), BONE2, 0, y, -0.38); P(g, BX(0.2, 0.04, 0.06), BONE, 0, y, -0.42); }
    for(let k=0;k<7;k++){ const y = 0.95 + k*0.17, w = 0.55 - Math.abs(k - 3)*0.04; P(g, TO(w, 0.025, PI, 4, 16), BONE, 0, y, -0.38, 0, 0, 0, 1, 0.6, 0.35); }
    P(g, BX(1.3, 1.9, 0.12), 0x1e1618, 0, 1.6, -0.5);
    for(let k=0;k<5;k++){ const a = (k - 2)*0.35; skull(g, Math.sin(a)*0.55, 2.55 + Math.cos(a)*0.2 - 0.2, -0.38, 0.11, 0, -0.1, k === 2 ? BONE : BONE2); }
    [-1, 1].forEach(s=>{ const base = [s*0.5, 2.5, -0.42]; P(g, K.tube([base, [s*0.75, 2.85, -0.38], [s*0.7, 3.25, -0.3], [s*0.5, 3.45, -0.2]], 0.05, 10, 6), 0x3a302a); P(g, CO(0.05, 0.22, 6), 0x2a2220, s*0.46, 3.55, -0.18, 0.4, 0, s*0.4); });
    // red candles burnt into the armrests, and an eye in the crown
    [-1, 1].forEach(s=> candle(o, g, s*0.7, -0.1, 0.12, 0.035, REDWAX, 0xff3a1a, 0.84));
    L(g, S(0.07, 10, 8), 0xff2a1a, 0, 2.62, -0.22, 0, 0, 0, 1, 0.55, 0.5);
    o.glows.push({ x:0, y:2.62, z:-0.15, c:0xff2a1a, s:1.1 });
    o.lights.push({ x:0, y:2.2, z:0.8, c:0xff2a1a, i:1.4 });
  },
  /* ---- the cage and the gamblers ---- */
  cage(o, rnd){
    const g = o.group, n = 14, r = 0.62, h = 2.0;
    P(g, CY(r + 0.05, r + 0.08, 0.08, 20), IRON, 0, 0.04, 0);
    for(let i=0;i<n;i++){ const a = i/n*PI*2; P(g, CY(0.022, 0.022, h, 6), i % 3 ? IRON : RUST, Math.cos(a)*r, h/2, Math.sin(a)*r); }
    [0.7, 1.4].forEach(y=> P(g, TO(r, 0.025, PI*2, 4, 28), IRON2, 0, y, 0, PI/2));
    for(let i=0;i<n/2;i++) P(g, TO(r, 0.02, PI, 4, 20), i % 3 ? IRON : RUST, 0, h, 0, 0, i/(n/2)*PI, 0, 1, 0.45, 1);
    P(g, TO(r, 0.03, PI*2, 4, 28), IRON2, 0, h, 0, PI/2);
    P(g, TO(0.08, 0.02, PI*2, 4, 12), IRON2, 0, h + 0.33, 0);
    for(let k=0;k<10;k++) P(g, TO(0.04, 0.012, PI*2, 3, 8), IRON2, 0, h + 0.42 + k*0.08, 0, 0, k % 2 ? PI/2 : 0);
    for(let k=0;k<3;k++) bone(g, [Math.cos(k*2)*0.4, 0.1, Math.sin(k*2)*0.4], [Math.cos(k*2 + 0.5)*0.3, 0.1, Math.sin(k*2 + 0.5)*0.3], 0.02, BONE2);
  },
  dicealtar(o, rnd){
    const g = o.group;
    P(g, BX(1.1, 0.7, 0.75), 0x3a3434, 0, 0.35, 0); P(g, BX(1.25, 0.08, 0.88), 0x4a2a24, 0, 0.74, 0); P(g, BX(1.1, 0.02, 0.76), 0x1e4a2a, 0, 0.79, 0);
    // two great dice of bone, black pips
    [[-0.22, 0.4, 0.3], [0.22, -0.1, 0.9]].forEach(([x, z, ry])=> sub(g, x, 0.92, z*0.3, 0.1, ry, 0.05, 1, t=>{
      P(t, BX(0.24, 0.24, 0.24), 0xd8ccae, 0, 0, 0);
      [[0, 0.121, 0], [0.06, 0.121, 0.06], [-0.06, 0.121, -0.06]].forEach(([px, py, pz])=> P(t, S(0.022, 6, 4), 0x100808, px, py, pz, 0, 0, 0, 1, 0.3, 1));
      [[-0.06, 0.06], [0.06, -0.06], [0.06, 0.06], [-0.06, -0.06]].forEach(([px, py])=> P(t, S(0.022, 6, 4), 0x100808, px, py, 0.121, 0, 0, 0, 1, 1, 0.3));
    }));
    coins(g, rnd, 14, 0.4, 0.8);
    skull(g, 0.42, 0.8, -0.18, 0.08, -0.5, 0);
    candle(o, g, -0.48, -0.25, 0.2, 0.04, WAX, 0xffb050, 0.8); candle(o, g, 0.5, 0.22, 0.14, 0.035, WAX, 0xffb050, 0.8);
    o.lights.push({ x:0, y:1.3, z:0.4, c:0xffb050, i:0.6 });
  },
  bloodbowl(o, rnd){
    const g = o.group;
    P(g, K.slathe([[0, 0], [0.3, 0], [0.22, 0.1], [0.12, 0.25], [0.12, 0.55], [0.32, 0.72], [0.36, 0.82], [0, 0.78]], 12, 3), 0x3a3030);
    L(g, new THREE.CircleGeometry(0.3, 18), 0x5a0a08, 0, 0.8, 0, -PI/2);
    for(let i=0;i<5;i++){ const a = i*1.3 + rnd(); P(g, BX(0.03, 0.2 + rnd()*0.3, 0.01), 0x3a0808, Math.cos(a)*0.3, 0.6, Math.sin(a)*0.3, 0, -a + PI/2, 0); }
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(g, BX(0.04, 0.04, 0.01), 0x8a2a1a, Math.cos(a)*0.13, 0.4, Math.sin(a)*0.13, 0, -a + PI/2, 0); }
    o.glows.push({ x:0, y:0.85, z:0, c:0xff2a1a, s:0.7 });
  },
  /* a padlock: an iron body, a shackle, and a keyhole that glows (the world adds the glow) */
  padlock(o){
    const g = o.group;
    P(g, BX(0.3, 0.26, 0.1), 0x8a6a30, 0, 0, 0); P(g, BX(0.32, 0.04, 0.11), 0x2a2420, 0, 0.11, 0); P(g, BX(0.32, 0.04, 0.11), 0x2a2420, 0, -0.11, 0);
    P(g, TO(0.1, 0.025, PI, 6, 14), 0x3a3a3e, 0, 0.13, 0);
    [-1, 1].forEach(s=> P(g, BX(0.02, 0.02, 0.115), 0x6a5a3a, s*0.12, 0, 0));
    P(g, S(0.03, 8, 6), 0x0a0604, 0, 0.02, 0.05, 0, 0, 0, 1, 1, 0.4); P(g, BX(0.02, 0.06, 0.02), 0x0a0604, 0, -0.03, 0.05);
  },
  /* ---- the Wizard's Quarters ---- */
  hearth(o, rnd){
    const g = o.group, st = 0x5a5650, st2 = 0x46423e;
    P(g, BX(1.5, 1.2, 0.5), st2, 0, 0.6, 0.25); P(g, BX(0.9, 0.75, 0.52), 0x120c0a, 0, 0.375, 0.26);
    P(g, BX(1.7, 0.12, 0.62), st, 0, 1.22, 0.3); P(g, BX(1.6, 0.1, 0.6), st2, 0, 0.05, 0.32);
    [-1, 1].forEach(s=> P(g, BX(0.25, 1.2, 0.56), st, s*0.62, 0.6, 0.28));
    for(let i=0;i<3;i++) P(g, CY(0.06, 0.07, 0.6, 7), BARK, (i - 1)*0.1, 0.1 + (i % 2)*0.08, 0.32 + (i - 1)*0.04, 0, (i - 1)*0.4, PI/2);
    for(let i=0;i<4;i++) L(g, CO(0.08 + rnd()*0.05, 0.3 + rnd()*0.2, 5), [0xff7a1a, 0xffa040, 0xff5a1a][i % 3], (i - 1.5)*0.14, 0.3, 0.38);
    L(g, BX(0.6, 0.06, 0.2), 0xff4a10, 0, 0.12, 0.4);
    P(g, CY(0.008, 0.008, 0.4, 4), IRON, 0.2, 0.55, 0.36); P(g, K.slathe([[0, 0], [0.1, 0.02], [0.12, 0.1], [0.08, 0.18], [0.03, 0.2], [0, 0.21]], 10, 2), 0x2a2a2e, 0.2, 0.3, 0.36);
    // the mantel: candles, a skull, a little frog figurine (a gift, once)
    candle(o, g, -0.55, 0.32, 0.16, 0.035, WAX, 0xffc070, 1.28); candle(o, g, -0.42, 0.34, 0.1, 0.03, WAX, 0xffc070, 1.28);
    skull(g, 0.5, 1.28, 0.32, 0.07, -0.3, 0); P(g, K.lump(0.06, 1, 0.2, 3), 0x4a6a3a, 0.2, 1.32, 0.34, 0, 0, 0, 1.2, 0.7, 1);
    o.glows.push({ x:0, y:0.4, z:0.45, c:0xff8a2a, s:1.8 }, { x:0, y:0.7, z:0.5, c:0xffb050, s:1.2 });
    o.lights.push({ x:0, y:0.9, z:1.4, c:0xff9a40, i:1.4 });
  },
  bookshelf(o, rnd){
    const g = o.group;
    P(g, BX(0.9, 1.55, 0.3), 0x2e2016, 0, 0.78, 0.15); P(g, BX(0.82, 1.45, 0.02), 0x1a120c, 0, 0.78, 0.01);
    [0.12, 0.5, 0.88, 1.26].forEach((y, row)=>{
      P(g, BX(0.86, 0.03, 0.28), 0x3a2a1c, 0, y, 0.15);
      let x = -0.38;
      while(x < 0.36){ const w = 0.03 + rnd()*0.035, h = 0.18 + rnd()*0.14, lean = rnd() < 0.12 ? 0.3 : 0; P(g, BX(w, h, 0.2), [0x4a1a14, 0x2a3a2a, 0x3a2a1a, 0x2a2a3a, 0x5a4a2a][Math.floor(rnd()*5)], x + w/2, y + 0.015 + h/2, 0.15, 0, 0, lean); x += w + 0.006 + (lean ? 0.05 : 0); if(rnd() < 0.08) x += 0.08; }
    });
    skull(g, 0.25, 1.28, 0.15, 0.06, 0.2, 0);
  },
  cot(o, rnd){
    const g = o.group;
    P(g, BX(1.6, 0.08, 0.7), WOOD, 0, 0.25, 0); [-1, 1].forEach(sx=> [-1, 1].forEach(sz=> P(g, BX(0.06, 0.25, 0.06), WOOD2, sx*0.75, 0.125, sz*0.3)));
    P(g, K.sculpt(new THREE.BoxGeometry(1.5, 0.12, 0.62, 6, 1, 3), 0.02, 6, 2), 0x6a5a38, 0, 0.35, 0);
    P(g, K.sculpt(new THREE.BoxGeometry(1.0, 0.08, 0.66, 6, 1, 4), 0.03, 5, 4), 0x3a2e40, 0.25, 0.43, 0, 0, 0.05, 0);
    P(g, K.lump(0.16, 1, 0.2, 5), 0xa8987a, -0.55, 0.45, 0, 0, 0, 0, 1.2, 0.5, 1.4);
  },
  desk(o, rnd){
    const g = o.group;
    P(g, BX(1.2, 0.06, 0.6), WOOD, 0, 0.7, 0); [-1, 1].forEach(sx=> [-1, 1].forEach(sz=> P(g, BX(0.06, 0.7, 0.06), WOOD2, sx*0.54, 0.35, sz*0.25)));
    P(g, BX(0.42, 0.03, 0.3), 0xd8ccae, -0.1, 0.745, 0.05, 0, 0.2, 0); P(g, BX(0.01, 0.035, 0.3), 0x3a2a1a, -0.1, 0.75, 0.05, 0, 0.2, 0);
    P(g, CY(0.035, 0.04, 0.06, 8), 0x101014, 0.25, 0.76, -0.1); P(g, CY(0.004, 0.002, 0.25, 3), 0xe8e0d0, 0.27, 0.86, -0.1, 0, 0, -0.4);
    for(let i=0;i<3;i++) P(g, CY(0.03, 0.03, 0.3, 8), 0xc8b890, 0.4 - i*0.04, 0.76 + i*0.06, 0.18, 0, 0.4, PI/2);
    waxpool(g, 0.12, rnd()); candle(o, g, -0.45, -0.15, 0.2, 0.035, WAX, 0xffc070, 0.73); candle(o, g, -0.38, -0.2, 0.12, 0.03, WAX, 0xffc070, 0.73);
    o.lights.push({ x:-0.4, y:1.1, z:0, c:0xffb060, i:0.45 });
  },
  bookpile(o, rnd){ for(let s=0;s<2;s++){ let y = 0; const x = s*0.3 - 0.15; for(let i=0;i<3 + Math.floor(rnd()*3);i++){ const h = 0.04 + rnd()*0.03; P(o.group, BX(0.26 + rnd()*0.08, h, 0.2 + rnd()*0.05), [0x4a1a14, 0x2a3a2a, 0x3a2a1a, 0x5a4a2a][i % 4], x, y + h/2, 0, 0, rnd()*0.6, 0); y += h; } } },
  /* ---- the Lantern Sanctum: Brother Olm's ruined scriptorium ---- */
  /* a lectern, its book chained open; the pages lift now and then */
  lectern(o, rnd){
    const g = o.group;
    P(g, CY(0.16, 0.2, 0.06, 8), WOOD2, 0, 0.03, 0);
    P(g, K.sculpt(CY(0.045, 0.06, 0.95, 8, 4), 0.006, 20, rnd()*9), WOOD, 0, 0.5, 0);
    P(g, BX(0.5, 0.04, 0.36), WOOD, 0, 1.0, 0.02, 0.45, 0, 0);
    P(g, BX(0.5, 0.05, 0.04), WOOD2, 0, 0.92, 0.17, 0.45, 0, 0);
    // the book: two leaves fanned open, stained, a ribbon
    [-1, 1].forEach(sd=>{ const lf = new THREE.BoxGeometry(0.21, 0.012, 0.3, 4, 1, 1); const a = lf.attributes.position; for(let i=0;i<a.count;i++) a.setY(i, a.getY(i) + Math.pow(Math.abs(a.getX(i))/0.105, 2)*0.02*(a.getX(i)*sd > 0 ? 1 : 0.3)); P(g, lf, 0x8a7a58, sd*0.105, 1.04, 0.02, 0.45, 0, -sd*0.08); });
    P(g, BX(0.46, 0.02, 0.32), 0x3a1a14, 0, 1.025, 0.02, 0.45, 0, 0);
    for(let k=0;k<6;k++){ const sd = k % 2 ? 1 : -1; P(g, BX(0.14, 0.003, 0.004), 0x2a2018, sd*0.11, 1.055, -0.08 + (k >> 1)*0.06, 0.45, 0, 0); }
    P(g, BX(0.015, 0.002, 0.2), 0x6a1a14, 0.02, 1.06, 0.13, 0.9, 0, 0.1);
    // the chain from the book to the post
    for(let k=0;k<6;k++) P(g, TO(0.016, 0.004, 0, 3, 6), IRON2, -0.24 + k*0.008, 0.98 - k*0.07, 0.12 - k*0.015, 0, k % 2 ? PI/2 : 0, 0);
    candle(o, g, 0.2, -0.12, 0.08 + rnd()*0.06, 0.025, WAX2, undefined, 1.0);
  },
  /* an orrery of bone and brass: rings, and skulls for planets */
  orrery(o, rnd){
    const g = o.group;
    P(g, CY(0.25, 0.32, 0.12, 10), 0x2a2420, 0, 0.06, 0);
    rod(g, [0, 0.1, 0], [0, 1.9, 0], 0.03, BRASS, 0.018);
    [[0.55, 1.5, 0.3, 0.2], [0.85, 1.35, -0.5, 0.4], [1.15, 1.2, 0.2, -0.3]].forEach(([r, y, rx, rz], i)=>{
      P(g, TO(r, 0.014, 0, 4, 40), i % 2 ? BRASS : 0x5a4a30, 0, y, 0, PI/2 + rx, 0, rz);
      const a = rnd()*PI*2, x = Math.cos(a)*r, z = Math.sin(a)*r;
      skull(g, x, y - 0.06 + Math.sin(a)*rx*r*0.5, z, 0.07 + i*0.02, a, 0);
    });
    L(g, S(0.1, 10, 8), 0xffb060, 0, 1.92, 0);
    o.glows.push({ x:0, y:1.92, z:0, c:0xffa040, s:1.4 }); o.lights.push({ x:0, y:1.9, z:0, c:0xffa860, i:0.6 });
  },
  /* a mound of melted wax with dozens of stubs burning in it */
  waxmound(o, rnd){
    const g = o.group;
    for(let k=0;k<5;k++) P(g, K.lump(0.16 + rnd()*0.14, 1, 0.35, rnd()*9), [WAX, WAX2, 0xb8a888][k % 3], (rnd() - 0.5)*0.5, 0.04 + rnd()*0.08, (rnd() - 0.5)*0.5, 0, 0, 0, 1, 0.45, 1);
    const n = 7 + Math.floor(rnd()*6);
    for(let k=0;k<n;k++){ const a = rnd()*PI*2, d = rnd()*0.35; candle(o, g, Math.cos(a)*d, Math.sin(a)*d, 0.05 + rnd()*0.2, 0.02 + rnd()*0.015, [WAX, WAX2][k % 2], k % 3 ? undefined : false, 0.08); }
    o.lights.push({ x:0, y:0.5, z:0, c:0xffb060, i:0.5 });
  },
  /* loose pages drifted against the wall: they rustle when you walk through */
  pagedrift(o, rnd){
    const g = o.group;
    for(let k=0;k<22;k++){
      const pg = new THREE.PlaneGeometry(0.16 + rnd()*0.06, 0.22 + rnd()*0.06, 2, 2); const a = pg.attributes.position; for(let i=0;i<a.count;i++) a.setZ(i, (rnd() - 0.5)*0.03);
      P(g, pg, [0x8a7a58, 0x6a5a40, 0x9a8a68, 0x5a4a36][k % 4], (rnd() - 0.5)*1.1, 0.01 + rnd()*0.08 + (k > 14 ? 0.08 : 0), (rnd() - 0.5)*0.6, -PI/2 + (rnd() - 0.5)*0.8, rnd()*PI, (rnd() - 0.5)*0.6);
    }
  },
  /* a summoning circle burned into the floor: rings, a star, runes, the stone scorched black */
  summoncircle(o, rnd){
    const g = o.group;
    P(g, new THREE.CircleGeometry(1.6, 40).rotateX(-PI/2), 0x0a0806, 0, 0.006, 0);
    [1.45, 1.2, 0.5].forEach((r, i)=> L(g, new THREE.RingGeometry(r - 0.03, r, 48).rotateX(-PI/2), i === 1 ? 0x8a3a1a : 0x6a2a14, 0, 0.012 + i*0.001, 0));
    for(let k=0;k<5;k++){ const a = k/5*PI*2, b = (k + 2)/5*PI*2; const ax = Math.sin(a)*1.2, az = Math.cos(a)*1.2, bx = Math.sin(b)*1.2, bz = Math.cos(b)*1.2, len = Math.hypot(bx - ax, bz - az); L(g, new THREE.PlaneGeometry(0.03, len).rotateX(-PI/2), 0x7a2a12, (ax + bx)/2, 0.014, (az + bz)/2, 0, Math.atan2(bx - ax, bz - az), 0); }
    for(let k=0;k<16;k++){ const a = k/16*PI*2; L(g, new THREE.PlaneGeometry(0.06, 0.1).rotateX(-PI/2), 0x6a2a14, Math.sin(a)*1.33, 0.015, Math.cos(a)*1.33, 0, a + (k % 3)*0.4, 0); }
    o.glows.push({ x:0, y:0.05, z:0, c:0x8a2a10, s:2.2 });
  },
  /* a tall window of stained glass, cracked, a shaft of cold light through the dust */
  stainedglass(o, rnd){
    const g = o.group;
    P(g, BX(1.2, 2.3, 0.14), 0x2a2622, 0, 1.4, 0.04);
    P(g, new THREE.CylinderGeometry(0, 0.64, 0.55, 4, 1), 0x2a2622, 0, 2.82, 0.04, 0, PI/4, 0, 1.3, 1, 0.16);   // the pointed arch
    const cols = [0x3a5a8a, 0x8a2a2a, 0x8a7a2a, 0x2a6a4a, 0x5a3a7a];
    for(let y=0;y<5;y++) for(let x=0;x<3;x++){ if(rnd() < 0.18) continue; L(g, BX(0.3, 0.38, 0.02), cols[(x + y*2) % cols.length], -0.33 + x*0.33, 0.55 + y*0.42, 0.12); }
    for(let k=0;k<4;k++) P(g, BX(1.04, 0.025, 0.04), 0x14100c, 0, 0.76 + k*0.42, 0.13);
    [-0.165, 0.165].forEach(x=> P(g, BX(0.025, 2.1, 0.04), 0x14100c, x, 1.4, 0.13));
    o.glows.push({ x:0, y:1.4, z:0.2, c:0x8aa8d8, s:2.2 });
    o.lights.push({ x:0, y:1.8, z:0.8, c:0x9ab8e8, i:0.7 });
  },
  kettle(o, rnd){
    const g = o.group;
    for(let i=0;i<3;i++){ const a = i/3*PI*2; rod(g, [Math.cos(a)*0.22, 0, Math.sin(a)*0.22], [0, 0.55, 0], 0.012, IRON); }
    P(g, CY(0.14, 0.1, 0.06, 10), 0x2a2224, 0, 0.06, 0); L(g, CY(0.11, 0.11, 0.02, 10), 0xff5a1a, 0, 0.1, 0);
    P(g, K.slathe([[0, 0], [0.1, 0.01], [0.13, 0.08], [0.1, 0.16], [0.04, 0.19], [0, 0.2]], 10, 2), 0x3a3a40, 0, 0.3, 0);
    P(g, K.tube([[0.11, 0.38, 0], [0.18, 0.44, 0], [0.22, 0.47, 0]], 0.012, 6, 3), 0x3a3a40); P(g, TO(0.08, 0.008, PI, 3, 10), IRON, 0, 0.5, 0);
    o.glows.push({ x:0, y:0.12, z:0, c:0xff6a1a, s:0.6 }); o.lights.push({ x:0, y:0.5, z:0, c:0xff8a3a, i:0.4 });
  },
  stool(o, rnd){ P(o.group, CY(0.18, 0.18, 0.05, 10), WOOD, 0, 0.42, 0); for(let i=0;i<3;i++){ const a = i/3*PI*2; rod(o.group, [Math.cos(a)*0.16, 0, Math.sin(a)*0.16], [Math.cos(a)*0.1, 0.4, Math.sin(a)*0.1], 0.018, WOOD2); } },
  /* ---- the jungle pond ---- */
  bigfern(o, rnd){
    const n = 9 + Math.floor(rnd()*4);
    for(let i=0;i<n;i++) frond(o.group, i/n*PI*2 + rnd()*0.4, 0.55 + rnd()*0.35, 0.5 + rnd()*0.6, 0.5 + rnd()*0.3, LEAF[i % 4], 9);
    P(o.group, K.lump(0.08, 1, 0.3, rnd()*9), 0x2a2a1a, 0, 0.03, 0, 0, 0, 0, 1, 0.5, 1);
  },
  lotus(o, rnd){
    P(o.group, new THREE.CylinderGeometry(0.3, 0.3, 0.02, 16, 1, false, 0.3, PI*2 - 0.6), 0x3a7a2a, 0, -0.1, 0);
    if(rnd() < 0.7){
      const c = [0xe8b8c8, 0xf0d8e0, 0xd89aac][Math.floor(rnd()*3)];
      for(let k=0;k<2;k++) for(let i=0;i<6;i++){ const a = i/6*PI*2 + k*0.5; P(o.group, S(0.05, 6, 4), c, Math.cos(a)*0.05*(1 - k*0.4), -0.04 + k*0.03, Math.sin(a)*0.05*(1 - k*0.4), Math.sin(a)*(0.8 - k*0.4), 0, -Math.cos(a)*(0.8 - k*0.4), 0.6, 1.5, 0.6); }
      L(o.group, S(0.025, 6, 4), 0xffe070, 0, -0.01, 0);
      o.glows.push({ x:0, y:0.0, z:0, c:0xffd8a0, s:0.35 });
    }
  },
  lotusbud(o, rnd){ P(o.group, K.sculpt(new THREE.SphereGeometry(0.28, 12, 5, 0, PI*2, 0, PI/2), 0.04, 7, rnd()*9), MOSSG, 0, 0, 0, 0, 0, 0, 1, 0.1, 1); for(let i=0;i<4;i++){ const a = rnd()*PI*2, d = rnd()*0.15, h = 0.12 + rnd()*0.14; P(o.group, CY(0.006, 0.008, h, 4), 0x3a5a2a, Math.cos(a)*d, h/2, Math.sin(a)*d); P(o.group, S(0.03, 6, 4), [0xe8b8c8, 0xf0e0a0, 0xc8a8e0][i % 3], Math.cos(a)*d, h, Math.sin(a)*d, 0, 0, 0, 1, 1.3, 1); } },
  mossylog(o, rnd){
    P(o.group, K.sculpt(new THREE.CylinderGeometry(0.2, 0.24, 1.6, 12, 6), 0.03, 6, rnd()*9), BARK, 0, 0.2, 0, 0, 0, PI/2);
    P(o.group, K.sculpt(new THREE.CylinderGeometry(0.21, 0.25, 1.4, 12, 4, true, -PI*0.45, PI*0.9), 0.04, 8, rnd()*9), MOSSG, 0.05, 0.22, 0, 0, 0, PI/2);
    P(o.group, CY(0.17, 0.17, 0.02, 12), 0x5a4a32, 0.81, 0.2, 0, 0, 0, PI/2);
    for(let i=0;i<5;i++){ const x = -0.6 + rnd()*1.2; P(o.group, K.slathe([[0.05, 0], [0.04, 0.03], [0, 0.05]], 8, 2), 0xc8a060, x, 0.38 + rnd()*0.03, (rnd() - 0.5)*0.2); }
    frond(o.group, 0.5, 0.4, 0.6, 0.5, LEAF[1], 7); frond(o.group, 2.4, 0.35, 0.7, 0.5, LEAF[2], 7);
  },
  junglevines(o, rnd){
    const g = o.group;
    for(let i=0;i<4;i++){
      const x0 = (rnd() - 0.5)*0.8, l = 0.7 + rnd()*0.9, pts = [];
      for(let k=0;k<=5;k++) pts.push([x0 + Math.sin(k*1.3 + i)*0.08, 1.72 - l*k/5, 0.05 + Math.sin(k*0.9)*0.04]);
      P(g, K.tube(pts, 0.014, 10, 4), 0x2a3a1a);
      for(let k=1;k<=10;k++){ const p = pts[Math.min(5, Math.floor(k/2))], s = k % 2 ? 1 : -1; P(g, S(0.05, 6, 4), LEAF[(i + k) % 4], p[0] + s*0.05, p[1] - (k % 2)*0.05, p[2] + 0.02, 0, 0, s*0.6, 1, 0.45, 0.2); }
      if(rnd() < 0.5){ const p = pts[3]; L(g, S(0.03, 6, 4), [0xff8aa8, 0xffe070][i % 2], p[0], p[1], p[2] + 0.04); o.glows.push({ x:p[0], y:p[1], z:p[2] + 0.05, c:0xffc0a0, s:0.22 }); }
    }
    P(g, K.sculpt(new THREE.BoxGeometry(1.0, 0.16, 0.12, 6, 1, 1), 0.03, 8, rnd()*9), MOSSG, 0, 1.72, 0.06);
  },
  /* the waterfall: mossy rocks down the wall and a basin at its foot (vanity.js runs the water) */
  waterfall(o, rnd){
    const g = o.group;
    for(let i=0;i<9;i++){ const y = 0.1 + rnd()*1.6, x = (rnd() < 0.5 ? -1 : 1)*(0.45 + rnd()*0.25), r = 0.12 + rnd()*0.12; P(g, K.lump(r, 1, 0.3, rnd()*9), [0x4a4a44, 0x3a3e36][i % 2], x, y, 0.08, 0, 0, 0, 1, 0.8, 0.7); P(g, K.sculpt(new THREE.SphereGeometry(r*1.02, 10, 4, 0, PI*2, 0, PI/2), r*0.08, 9, i), MOSSG, x, y + r*0.2, 0.08, 0, 0, 0, 1, 0.5, 0.75); }
    P(g, K.lump(0.2, 1, 0.3, 7), 0x3e3e38, 0, 1.75, 0.15, 0, 0, 0, 1.6, 0.6, 1);
    P(g, TO(0.5, 0.1, PI, 6, 18), 0x4a4a44, 0, 0.06, 0.25, PI/2, 0, PI);
    frond(g, 0.3, 0.45, 0.6, 0.4, LEAF[0], 8); frond(g, 2.8, 0.45, 0.6, 0.4, LEAF[2], 8);
    o.lights.push({ x:0, y:0.6, z:0.6, c:0x9ae8c8, i:0.5 });
  }
});

/* a scrap of parchment nailed up: scrawl that nobody can read, a bloody hand */
const _posters = {};
function posterTex(i){
  if(_posters[i]) return _posters[i];
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 80; const g = cv.getContext("2d", { willReadFrequently:true }), r = DG.RNG(400 + i).next;
  g.fillStyle = "#8a7a5a"; g.beginPath(); g.moveTo(3, 2); for(let k=0;k<=8;k++) g.lineTo(3 + k*7 + r()*3, 2 + r()*4); g.lineTo(62, 76 - r()*10); for(let k=8;k>=0;k--) g.lineTo(3 + k*7, 70 + r()*10); g.fill();
  g.fillStyle = "rgba(40,24,10,0.5)"; for(let k=0;k<30;k++) g.fillRect(r()*64|0, r()*80|0, 3, 2);
  g.strokeStyle = "#2a1a0e"; g.lineWidth = 1.2; for(let l=0;l<7;l++){ g.beginPath(); let x = 8; g.moveTo(x, 14 + l*8); while(x < 54){ x += 2 + r()*4; g.lineTo(x, 14 + l*8 + (r() - 0.5)*3); } g.stroke(); }
  if(i === 1){ g.fillStyle = "rgba(90,12,8,0.9)"; g.beginPath(); g.ellipse(34, 52, 9, 11, 0.2, 0, 7); g.fill(); for(let k=0;k<5;k++){ g.save(); g.translate(34 + (k - 2)*4.5, 42); g.rotate((k - 2)*0.25); g.fillRect(-1.6, -14, 3.2, 14); g.restore(); } g.fillRect(36, 60, 3, 16); }
  g.fillStyle = "#1a1a1a"; g.fillRect(30, 4, 4, 4);
  const t = new THREE.CanvasTexture(cv);
  return _posters[i] = t;
}
/* broken leaded glass: dark panes, a few still holding colour, holes where there is none */
let _glass = null;
function glassTex(){
  if(_glass) return _glass;
  const cv = document.createElement("canvas"); cv.width = 32; cv.height = 56; const g = cv.getContext("2d", { willReadFrequently:true }), r = DG.RNG(55).next;
  for(let y=0;y<7;y++) for(let x=0;x<4;x++){ const v = r() < 0.25 ? 10 : 60 + (r()*90 | 0); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(x*8, y*8, 8, 8); }
  g.strokeStyle = "#0a0a0e"; g.lineWidth = 2; for(let x=0;x<=32;x+=8){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 56); g.stroke(); } for(let y=0;y<=56;y+=8){ g.beginPath(); g.moveTo(0, y); g.lineTo(32, y); g.stroke(); }
  g.fillStyle = "#050505"; g.beginPath(); g.moveTo(14, 30); g.lineTo(26, 22); g.lineTo(22, 40); g.lineTo(10, 44); g.fill();
  _glass = new THREE.CanvasTexture(cv); return _glass;
}
let _web = null;
function webTex(){
  if(_web) return _web;
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d", { willReadFrequently:true }), r = DG.RNG(66).next;
  g.strokeStyle = "rgba(230,230,235,0.8)"; g.lineWidth = 0.8;
  const spokes = 9;
  for(let i=0;i<spokes;i++){ const a = i/(spokes - 1)*Math.PI/2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a)*128, Math.sin(a)*128); g.stroke(); }
  for(let rr=8; rr<128; rr+=7 + r()*5){ g.beginPath(); for(let i=0;i<spokes;i++){ const a = i/(spokes - 1)*Math.PI/2, q = rr*(0.92 + r()*0.12); const x = Math.cos(a)*q, y = Math.sin(a)*q; i ? g.quadraticCurveTo(Math.cos(a - 0.1)*q*0.94, Math.sin(a - 0.1)*q*0.94, x, y) : g.moveTo(x, y); } g.stroke(); }
  // torn: some strands sag loose
  g.strokeStyle = "rgba(220,220,225,0.5)"; for(let k=0;k<6;k++){ const a = r()*1.5, d = 40 + r()*80; g.beginPath(); g.moveTo(Math.cos(a)*d, Math.sin(a)*d); g.quadraticCurveTo(Math.cos(a)*d + 10, Math.sin(a)*d + 20, Math.cos(a + 0.2)*d, Math.sin(a + 0.2)*d + 25); g.stroke(); }
  _web = new THREE.CanvasTexture(cv); return _web;
}
Decor.kinds = ()=> Object.keys(B);
/* ---- Olm's library and the Flesh Library ---- */
Object.assign(B, {
  // a reading stand, a book open on it, a candle stub at its corner
  lectern(o, rnd){
    P(o.group, CY(0.05, 0.07, 0.9, 8), WOOD, 0, 0.45, 0); P(o.group, CY(0.22, 0.26, 0.05, 10), WOOD2, 0, 0.025, 0);
    P(o.group, BX(0.5, 0.04, 0.38), WOOD, 0, 0.95, 0, -0.5);
    P(o.group, BX(0.21, 0.02, 0.3), 0xd8ceb4, -0.11, 0.985, -0.01, -0.5, 0, 0.06); P(o.group, BX(0.21, 0.02, 0.3), 0xd0c4a8, 0.11, 0.985, -0.01, -0.5, 0, -0.06);
    for(let k=0;k<5;k++) P(o.group, BX(0.15, 0.004, 0.006), 0x3a2a1a, -0.11, 0.997 - k*0.025, 0.06 - k*0.045, -0.5);
    candle(o, o.group, 0.2, 0.1, 0.1, 0.03, undefined, undefined, 0.98);
  },
  // scrolls in a heap, some still sealed
  scrollpile(o, rnd){
    for(let i=0;i<7;i++){ const x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.4, y = 0.04 + (i > 3 ? 0.07 : 0), a = rnd()*PI;
      P(o.group, CY(0.035, 0.035, 0.3 + rnd()*0.15, 8), [0xd8ceb4, 0xc8b898, 0xb8a888][i % 3], x, y, z, 0, a, PI/2);
      if(i % 3 === 0) P(o.group, CY(0.02, 0.02, 0.012, 8), 0x8a1a14, x + Math.cos(a)*0.02, y + 0.03, z - Math.sin(a)*0.02, PI/2); }
  },
  // books grown over with meat, a vein of green through them
  fleshpile(o, rnd){
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.34, 14, 8, 0, PI*2, 0, PI/2), 0.05, 8, rnd()*9), 0x5a2228, 0, 0, 0, 0, 0, 0, 1, 0.55, 0.9);
    for(let i=0;i<4;i++){ const a = rnd()*PI*2; P(o.group, BX(0.24, 0.05, 0.18), [0x3a1a14, 0x2a2a3a][i % 2], Math.cos(a)*0.2, 0.08 + i*0.04, Math.sin(a)*0.2, rnd()*0.4, a, rnd()*0.4); }
    L(o.group, K.tube([[-0.3, 0.02, 0], [-0.05, 0.16, 0.1], [0.25, 0.05, -0.05]], 0.012, 8, 4), 0x7dff3a);
    o.glows.push({ x:0, y:0.15, z:0.05, c:0x7dff3a, s:0.5 });
  },
  // an eye on a stalk of meat, growing out of the floor, watching
  eyestalk(o, rnd){
    const h = 0.5 + rnd()*0.4;
    P(o.group, K.tube([[0, 0, 0], [0.05, h*0.5, 0.03], [-0.02, h, 0.06]], 0.04, 10, 6), 0x5a2228);
    P(o.group, K.sculpt(new THREE.SphereGeometry(0.16, 10, 6, 0, PI*2, 0, PI/2), 0.03, 9, rnd()*9), 0x4a1a20, 0, 0, 0, 0, 0, 0, 1, 0.4, 1);
    P(o.group, S(0.09, 12, 10), 0xc8bca0, -0.02, h + 0.06, 0.06);
    L(o.group, S(0.035, 8, 6), 0x7dff3a, -0.02, h + 0.07, 0.14);
    o.glows.push({ x:-0.02, y:h + 0.07, z:0.16, c:0x7dff3a, s:0.35 });
  },
  // the wall gone to meat: a slab of it, ribs showing, an eye or two open in it
  fleshwall(o, rnd){
    P(o.group, K.sculpt(new THREE.BoxGeometry(0.9, 1.5, 0.16, 6, 9, 2), 0.04, 6, rnd()*9), 0x5a2228, 0, 0.85, 0.02);
    for(let k=0;k<4;k++) P(o.group, TO(0.3, 0.025, PI*0.8, 4, 12), 0xb0a488, 0, 0.45 + k*0.28, 0.1, 0, 0, PI*0.1);
    o.eyes.push({ x:(rnd() - 0.5)*0.4, y:1.1, z:0.11, r:0.08, wall:true });
    L(o.group, K.tube([[-0.3, 1.5, 0.12], [0.05, 1.0, 0.13], [-0.1, 0.3, 0.12]], 0.01, 8, 4), 0x7dff3a);
  }
});
Decor.build = function(kind, rnd){ const o = make(); (B[kind] || B.rubble)(o, rnd); return o; };

/* ---- breakables: one baked look per kind, drawn instanced ----
   (the kinds are the game's own: the names stay, the look is grim) */
const BR = {
  pot(g){ // a cracked clay jar, sealed with a rag
    P(g, K.slathe([[0, 0], [0.15, 0.01], [0.24, 0.16], [0.22, 0.34], [0.12, 0.44], [0.1, 0.48], [0.13, 0.52], [0, 0.52]], 12, 3), 0x6a4a34);
    P(g, TO(0.225, 0.012, PI*2, 4, 16), 0x4a3222, 0, 0.22, 0, PI/2); P(g, TO(0.2, 0.01, PI*2, 4, 16), 0x4a3222, 0, 0.32, 0, PI/2);
    P(g, BX(0.015, 0.2, 0.01), 0x1a1008, 0.12, 0.25, 0.19, 0, 0.5, 0.3);
    P(g, K.sculpt(new THREE.SphereGeometry(0.1, 10, 6, 0, PI*2, 0, PI/2), 0.015, 18, 3), 0x4a3e2c, 0, 0.5, 0, 0, 0, 0, 1, 0.6, 1);
    P(g, TO(0.1, 0.012, PI*2, 4, 12), 0x2a2218, 0, 0.5, 0, PI/2);
  },
  crate(g){ crate(P, g, 0.8, 0, 0, 0, 0, 0x3e2c1e); },
  barrel(g){ P(g, K.lathe([[0, 0], [0.29, 0], [0.34, 0.35], [0.29, 0.7], [0, 0.7]], 14), 0x3a2a1c); [0.08, 0.25, 0.45, 0.62].forEach(y=> P(g, TO(0.32 + (y > 0.2 && y < 0.5 ? 0.02 : 0), 0.016, PI*2, 4, 18), RUST, 0, y, 0, PI/2)); for(let k=0;k<10;k++){ const a = k/10*PI*2; P(g, BX(0.008, 0.68, 0.01), 0x1e140e, Math.cos(a)*0.335, 0.35, Math.sin(a)*0.335, 0, -a, 0); } P(g, CY(0.27, 0.27, 0.02, 14), 0x2e2218, 0, 0.7, 0); },
  xbarrel(g){ // a powder keg: black, iron-hooped, a fuse, a skull daubed in old red
    P(g, K.lathe([[0, 0], [0.29, 0], [0.34, 0.35], [0.29, 0.7], [0, 0.7]], 14), 0x2a1e1a); [0.08, 0.25, 0.45, 0.62].forEach(y=> P(g, TO(0.32 + (y > 0.2 && y < 0.5 ? 0.02 : 0), 0.018, PI*2, 4, 18), IRON, 0, y, 0, PI/2));
    P(g, S(0.1, 8, 6), 0x8a1a12, 0, 0.38, 0.31, 0, 0, 0, 1, 1, 0.25); [-1, 1].forEach(s=> P(g, S(0.025, 5, 4), 0x100808, s*0.035, 0.4, 0.335));
    [-1, 1].forEach(s=> P(g, BX(0.03, 0.22, 0.01), 0x8a1a12, 0, 0.36, 0.33, 0, 0, s*0.8));
    P(g, CY(0.27, 0.27, 0.02, 14), 0x1e1612, 0, 0.7, 0); P(g, K.tube([[0.08, 0.7, 0], [0.12, 0.82, 0.04], [0.06, 0.88, 0.08]], 0.012, 6, 3), 0x8a7a5a);
  },
  urn(g){ // a funerary urn of tarnished bronze, lid on
    P(g, K.slathe([[0, 0], [0.13, 0], [0.12, 0.05], [0.23, 0.26], [0.2, 0.46], [0.11, 0.54], [0.13, 0.58], [0, 0.58]], 12, 3), 0x5a4a32);
    P(g, TO(0.21, 0.015, PI*2, 4, 16), 0x7a6a40, 0, 0.3, 0, PI/2); P(g, K.slathe([[0, 0], [0.14, 0], [0.1, 0.06], [0.03, 0.1], [0.04, 0.14], [0, 0.15]], 10, 2), 0x4a4030, 0, 0.58, 0);
    [-1, 1].forEach(s=> P(g, TO(0.05, 0.012, PI*2, 3, 10), 0x6a5a38, s*0.22, 0.4, 0, 0, PI/2, 0));
    P(g, S(0.05, 6, 4), 0x3e4a3a, 0.1, 0.2, 0.17, 0, 0, 0, 1, 1.4, 0.4);
  },
  coffin(g){ // a pauper's coffin, six-sided, nailed shut (or meant to be)
    const shape = new THREE.Shape([[-0.2, -0.45], [0.2, -0.45], [0.3, 0.2], [0.22, 0.45], [-0.22, 0.45], [-0.3, 0.2]].map(p=> new THREE.Vector2(p[0], p[1])));
    const body = new THREE.ExtrudeGeometry(shape, { depth:0.32, bevelEnabled:false }); body.rotateX(PI/2); body.translate(0, 0.32, 0);
    P(g, body, 0x34261c);
    const lid = new THREE.ExtrudeGeometry(shape, { depth:0.05, bevelEnabled:false }); lid.rotateX(PI/2); lid.translate(0, 0.37, 0); P(g, lid, 0x2a1e16, 0.03, 0, 0, 0, 0.08, 0);
    P(g, BX(0.05, 0.02, 0.4), 0x6a5a3a, 0.03, 0.385, 0.05); P(g, BX(0.2, 0.02, 0.05), 0x6a5a3a, 0.03, 0.385, -0.05);
    for(let k=0;k<6;k++) P(g, S(0.012, 4, 3), IRON2, (k % 2 ? 0.2 : -0.2), 0.38, -0.3 + Math.floor(k/2)*0.3);
  },
  shroomcap(g){ // a squat clump of grey fungus, gills gone black
    const c = [0x4a4440, 0x3e3a3c];
    [[0, 0, 0.3, 0.32], [0.2, 0.12, 0.16, 0.18], [-0.18, 0.1, 0.13, 0.15]].forEach(([x, z, r, h], i)=>{
      P(g, K.slathe([[r*0.45, 0], [r*0.35, h*0.3], [r*0.3, h]], 8, 2), 0x9a948a, x, 0, z);
      P(g, K.sculpt(K.slathe([[r, 0], [r*0.92, r*0.25], [r*0.6, r*0.55], [0, r*0.65]], 12, 3), r*0.08, 4/r, i*3 + 1), c[i % 2], x, h - 0.02, z);
      P(g, CY(r*0.95, r*0.3, 0.04, 14, true), 0x161214, x, h - 0.04, z);
    });
  },
  eggsac(g){ // a sac of something, veined and clammy, stuck to the floor with threads
    P(g, K.sculpt(new THREE.SphereGeometry(0.28, 16, 12), 0.05, 7, 2), 0x5e4e44, 0, 0.3, 0, 0.2, 0, 0.15, 0.9, 1.2, 1);
    for(let k=0;k<6;k++){ const a = k/6*PI*2 + 0.3; P(g, K.tube([[Math.cos(a)*0.1, 0.56, Math.sin(a)*0.1], [Math.cos(a)*0.27, 0.35, Math.sin(a)*0.27], [Math.cos(a)*0.22, 0.1, Math.sin(a)*0.22]], 0.02, 8, 3), 0x4a1a1e); }
    [0.4, 2.5, 4.4].forEach(a=> P(g, S(0.07, 8, 6), 0x6a5a48, Math.cos(a)*0.24, 0.32, Math.sin(a)*0.24));
    for(let k=0;k<5;k++){ const a = k*1.3; P(g, CY(0.006, 0.006, 0.3, 3), MYCEL, Math.cos(a)*0.3, 0.08, Math.sin(a)*0.3, Math.sin(a)*1.2, 0, -Math.cos(a)*1.2); }
  },
  pustule(g){ // a boil the size of a dog, about to go
    P(g, K.sculpt(new THREE.SphereGeometry(0.32, 16, 10), 0.04, 8, 5), 0x5a2a30, 0, 0.22, 0, 0, 0, 0, 1, 0.75, 1);
    P(g, K.sculpt(new THREE.SphereGeometry(0.15, 12, 8), 0.02, 14, 6), 0x9a9a4a, 0, 0.42, 0.02, 0, 0, 0, 1, 0.8, 1);
    [0.8, 2.6, 4.6].forEach(a=> P(g, S(0.07, 8, 6), 0x7a7a3a, Math.cos(a)*0.24, 0.3, Math.sin(a)*0.24));
    for(let k=0;k<5;k++){ const a = k/5*PI*2; P(g, K.tube([[Math.cos(a)*0.08, 0.4, Math.sin(a)*0.08], [Math.cos(a)*0.3, 0.25, Math.sin(a)*0.3], [Math.cos(a)*0.33, 0.02, Math.sin(a)*0.33]], 0.012, 8, 3), 0x3a1418); }
  }
};
/* breakables drawn from the asset kit where it has them (kitmodels.js): name, height */
const KIT_BREAK = { barrel:["barrel", 0.72], crate:["crate2", 0.78], pot:["vase", 0.56], urn:["urn", 0.62] };
Decor.breakableGeo = function(kind){
  const KM = DG.KitModels, kb = KIT_BREAK[kind];
  if(kb && KM && KM.has(kb[0])) return KM.geo(kb[0], { h:kb[1] }).clone();
  const g = new THREE.Group(); (BR[kind] || BR.pot)(g);
  const geos = [];
  g.children.forEach(m=>{ m.updateMatrix(); let q = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); q.applyMatrix4(m.matrix); if(!q.attributes.normal) q.computeVertexNormals(); K.paint(q, m.material.color); geos.push(q); });
  return K.merge(geos);
};

})();
