/* ------------------------------------------------------------------ *
 *  Decor: the things that make a room feel lived in (or died in).
 *  Each floor has its own set: cellar clutter, grotto mushrooms, crypt
 *  candles and graves, the Weird Below's eyestalks and goo, the Hollow
 *  Heart's veins. Plus the breakables, and wall dressing.
 *
 *  A builder returns a Group of parts (kit.part) and lists of glows and
 *  lights. world.js flattens every room's decor into one baked mesh.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const Decor = DG.Decor = {};
const P = K.part, PI = Math.PI;
const S = (r, w, h)=> new THREE.SphereGeometry(r, w || 10, h || 8);
const CY = (a, b, h, n)=> new THREE.CylinderGeometry(a, b, h, n || 10);
const CO = (r, h, n)=> new THREE.ConeGeometry(r, h, n || 8);
const BX = (w, h, d)=> new THREE.BoxGeometry(w, h, d);
const TO = (r, t, a)=> new THREE.TorusGeometry(r, t, 6, 14, a || PI*2);
const OC = r=> new THREE.OctahedronGeometry(r);

/* out: { group, glows:[{x,y,z,c,s}], lights:[{x,y,z,c,i}], eyes:[...] } */
function make(){ return { group:new THREE.Group(), glows:[], lights:[], eyes:[] }; }
const B = {
  bones(o, rnd){ for(let i=0;i<3;i++){ const b = P(o.group, CY(0.025, 0.025, 0.32, 5), 0xe0d8c0, (rnd() - 0.5)*0.4, 0.03, (rnd() - 0.5)*0.4, 0, rnd()*6, PI/2); } P(o.group, S(0.06), 0xe0d8c0, 0.12, 0.05, 0.1); },
  rubble(o, rnd){ for(let i=0;i<4;i++) P(o.group, new THREE.DodecahedronGeometry(0.06 + rnd()*0.08), 0x7a7066, (rnd() - 0.5)*0.5, 0.04, (rnd() - 0.5)*0.5, rnd(), rnd()); },
  candle(o, rnd){ P(o.group, CY(0.05, 0.055, 0.22, 8), 0xf0e6c8, 0, 0.11, 0); P(o.group, S(0.07), 0xe8dcb8, 0, 0.02, 0, 0, 0, 0, 1.2, 0.3, 1.2); o.glows.push({ x:0, y:0.27, z:0, c:0xffb84a, s:0.45 }); o.lights.push({ x:0, y:0.4, z:0, c:0xffa040, i:0.6 }); },
  candles(o, rnd){ for(let i=0;i<3;i++){ const x = (i - 1)*0.18, h = 0.15 + rnd()*0.2; P(o.group, CY(0.04, 0.045, h, 8), 0xf0e6c8, x, h/2, (rnd() - 0.5)*0.15); o.glows.push({ x, y:h + 0.05, z:0, c:0xffb84a, s:0.35 }); } o.lights.push({ x:0, y:0.45, z:0, c:0xffa040, i:0.7 }); },
  sack(o){ P(o.group, S(0.22, 10, 8), 0xa08a5a, 0, 0.18, 0, 0, 0, 0, 1, 0.85, 0.9); P(o.group, CY(0.05, 0.08, 0.08, 6), 0xa08a5a, 0, 0.38, 0); },
  cobweb(o){ const w = new THREE.Mesh(new THREE.CircleGeometry(0.5, 6, 0, PI/2), new THREE.MeshBasicMaterial({ map:webTex(), transparent:true, opacity:0.55, depthWrite:false, side:THREE.DoubleSide })); w.rotation.x = -PI/2; w.position.y = 0.04; o.group.add(w); o.loose = true; },
  barrelstack(o){ [[0, 0], [0.42, 0.05], [0.2, 0.38]].forEach(([x, z], i)=> P(o.group, CY(0.19, 0.19, 0.42, 12), 0x8a5a30, x - 0.2, i === 2 ? 0.52 : 0.21, z, i === 2 ? PI/2 : 0)); },
  mushrooms(o, rnd){ for(let i=0;i<4;i++){ const x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.5, h = 0.1 + rnd()*0.15, r = 0.06 + rnd()*0.07; P(o.group, CY(0.025, 0.03, h, 6), 0xf0e6d4, x, h/2, z); P(o.group, new THREE.SphereGeometry(r, 10, 6, 0, PI*2, 0, PI/2), [0xd8302a, 0xc88a3a, 0x8a5ab0][i % 3], x, h, z); } },
  glowshroom(o, rnd){ const c = [0x46e4ff, 0x9cff6a, 0xff6ad8][Math.floor(rnd()*3)]; for(let i=0;i<3;i++){ const x = (rnd() - 0.5)*0.4, z = (rnd() - 0.5)*0.4, h = 0.15 + rnd()*0.25; P(o.group, CY(0.03, 0.04, h, 6), 0xe8f0ff, x, h/2, z); o.glows.push({ x, y:h + 0.02, z, c, s:0.55, cap:0.09 + rnd()*0.05 }); } o.lights.push({ x:0, y:0.5, z:0, c, i:0.8 }); },
  moss(o){ const m = new THREE.Mesh(new THREE.CircleGeometry(0.45, 9), new THREE.MeshLambertMaterial({ color:0x4a7a3a })); m.rotation.x = -PI/2; m.position.y = 0.02; m.userData.part = true; o.group.add(m); },
  toadstools(o, rnd){ for(let i=0;i<2;i++){ const x = (i - 0.5)*0.3; P(o.group, CY(0.05, 0.06, 0.22, 8), 0xf0e6d4, x, 0.11, 0); P(o.group, new THREE.SphereGeometry(0.14, 12, 6, 0, PI*2, 0, PI/2), 0xd8302a, x, 0.22, 0); [0, 2, 4].forEach(a=> P(o.group, S(0.025, 6, 4), 0xffffff, x + Math.cos(a)*0.08, 0.28, Math.sin(a)*0.08)); } },
  skull(o){ P(o.group, S(0.12, 12, 10), 0xe8e2cc, 0, 0.1, 0); P(o.group, BX(0.14, 0.06, 0.1), 0xe8e2cc, 0, 0.02, 0.04); [-1, 1].forEach(s=> P(o.group, S(0.035, 6, 4), 0x101010, s*0.045, 0.12, 0.09)); },
  gravestone(o){ P(o.group, BX(0.5, 0.6, 0.14), 0x7a7a88, 0, 0.3, 0); P(o.group, CY(0.25, 0.25, 0.14, 12, 1), 0x7a7a88, 0, 0.6, 0, PI/2); P(o.group, BX(0.24, 0.04, 0.02), 0x4a4a58, 0, 0.42, 0.08); P(o.group, BX(0.04, 0.2, 0.02), 0x4a4a58, 0, 0.42, 0.08); P(o.group, BX(0.6, 0.06, 0.4), 0x5a4a3a, 0, 0.03, 0.2); },
  eyestalk(o, rnd){ P(o.group, K.tube([[0, 0, 0], [0.05, 0.3, 0.02], [0, 0.6, 0]], 0.04, 8, 5), 0x8a3a7a); o.eyes.push({ x:0, y:0.68, z:0, r:0.1 }); },
  tendril(o, rnd){ for(let i=0;i<3;i++){ const a = i*2.1 + rnd(); P(o.group, K.tube([[0, 0, 0], [Math.cos(a)*0.15, 0.25, Math.sin(a)*0.15], [Math.cos(a)*0.3, 0.35 + rnd()*0.2, Math.sin(a)*0.3]], 0.035, 8, 5), 0x9a4a9a); } },
  goo(o){ const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), new THREE.MeshPhongMaterial({ color:0x8ad83a, transparent:true, opacity:0.6, shininess:90, emissive:0x1a3a0a })); m.rotation.x = -PI/2; m.position.y = 0.03; m.scale.set(1, 0.7, 1); o.group.add(m); o.loose = true; },
  crystal(o, rnd){ const c = [0xd84aff, 0x46e4ff, 0xff4a8a][Math.floor(rnd()*3)]; for(let i=0;i<3;i++){ const h = 0.3 + rnd()*0.4; const m = P(o.group, CO(0.08, h, 5), c, (rnd() - 0.5)*0.3, h/2, (rnd() - 0.5)*0.3, (rnd() - 0.5)*0.5, 0, (rnd() - 0.5)*0.5); } o.glows.push({ x:0, y:0.3, z:0, c, s:1 }); o.lights.push({ x:0, y:0.5, z:0, c, i:0.9 }); },
  vein(o, rnd){ P(o.group, K.tube([[-0.5, 0.02, 0], [0, 0.04, 0.2*(rnd() - 0.5)], [0.5, 0.02, 0.1]], 0.05, 10, 5), 0x8a1a2a); P(o.group, K.tube([[0, 0.03, 0], [0.2, 0.03, 0.4]], 0.035, 6, 5), 0x8a1a2a); },
  ember(o){ P(o.group, new THREE.DodecahedronGeometry(0.12), 0x3a1a1a, 0, 0.08, 0); o.glows.push({ x:0, y:0.12, z:0, c:0xff4a1a, s:0.7 }); o.lights.push({ x:0, y:0.3, z:0, c:0xff4a1a, i:0.5 }); },
  reeds(o, rnd){ for(let i=0;i<6;i++){ const h = 0.5 + rnd()*0.4, x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.5; P(o.group, CY(0.015, 0.02, h, 4), 0x5a8a3a, x, h/2, z, (rnd() - 0.5)*0.2, 0, (rnd() - 0.5)*0.2); P(o.group, CY(0.03, 0.03, 0.12, 6), 0x6a4a2a, x, h - 0.06, z); } },
  frogstatue(o){ P(o.group, BX(0.9, 0.3, 0.9), 0x6a6a74, 0, 0.15, 0); P(o.group, S(0.36, 14, 10), 0x8a9a8a, 0, 0.55, 0, 0, 0, 0, 1.1, 0.8, 1); [-1, 1].forEach(s=>{ P(o.group, S(0.12, 10, 8), 0x8a9a8a, s*0.16, 0.8, 0.18); P(o.group, S(0.06, 8, 6), 0x2a2a2a, s*0.16, 0.82, 0.28); }); P(o.group, CY(0.12, 0.13, 0.08, 8), 0xffd23d, 0, 0.95, 0.05); },
  /* ---- on the north wall (z is the wall's face) ---- */
  banner(o, rnd){ const c = [0xa02a2a, 0x2a4aa0, 0x2a8a4a][Math.floor(rnd()*3)]; P(o.group, BX(0.5, 0.75, 0.03), c, 0, 1.0, 0.04); P(o.group, CY(0.02, 0.02, 0.62, 6), 0x6a4a2a, 0, 1.4, 0.05, 0, 0, PI/2); P(o.group, OC(0.08), 0xffd23d, 0, 1.05, 0.06); },
  shelf(o, rnd){ P(o.group, BX(0.7, 0.05, 0.22), 0x6a4a2a, 0, 1.1, 0.11); for(let i=0;i<3;i++) P(o.group, CY(0.05, 0.06, 0.16 + rnd()*0.1, 8), [0x4aa8ff, 0x7dff3a, 0xa86a3a][i], (i - 1)*0.2, 1.2, 0.11); },
  chains(o){ for(let k=0;k<2;k++) for(let i=0;i<6;i++) P(o.group, TO(0.04, 0.012), 0x5a5a64, (k - 0.5)*0.4, 1.5 - i*0.08, 0.06, 0, i % 2 ? PI/2 : 0); },
  wallshroom(o, rnd){ for(let i=0;i<3;i++) P(o.group, new THREE.SphereGeometry(0.12 + rnd()*0.06, 10, 6, 0, PI*2, 0, PI/2), 0xc88a3a, (i - 1)*0.18, 0.6 + i*0.25, 0.05, PI/2); },
  vines(o, rnd){ for(let i=0;i<3;i++) P(o.group, K.tube([[(i - 1)*0.2, 1.6, 0.04], [(i - 1)*0.25 + 0.05, 1.0, 0.07], [(i - 1)*0.2, 0.3, 0.05]], 0.025, 8, 4), 0x4a7a3a); },
  glowmoss(o){ o.glows.push({ x:0, y:1.0, z:0.06, c:0x9cff6a, s:1.2 }); P(o.group, BX(0.6, 0.4, 0.03), 0x4a8a3a, 0, 1.0, 0.03); o.lights.push({ x:0, y:1.0, z:0.4, c:0x9cff6a, i:0.6 }); },
  skullniche(o){ P(o.group, BX(0.5, 0.4, 0.05), 0x1a1a22, 0, 1.0, 0.02); P(o.group, S(0.1, 10, 8), 0xe8e2cc, 0, 0.98, 0.08); [-1, 1].forEach(s=> P(o.group, S(0.03, 6, 4), 0x101010, s*0.04, 1.0, 0.16)); },
  candleshelf(o){ P(o.group, BX(0.6, 0.05, 0.18), 0x5a5a64, 0, 1.0, 0.09); [-0.18, 0, 0.18].forEach(x=>{ P(o.group, CY(0.03, 0.035, 0.14, 8), 0xf0e6c8, x, 1.1, 0.09); o.glows.push({ x, y:1.2, z:0.09, c:0xffb84a, s:0.35 }); }); o.lights.push({ x:0, y:1.2, z:0.5, c:0xffa040, i:0.7 }); },
  walleye(o){ P(o.group, S(0.28, 12, 8), 0x6a2a4a, 0, 1.0, 0, 0, 0, 0, 1, 0.75, 0.4); o.eyes.push({ x:0, y:1.0, z:0.08, r:0.17, wall:true }); },
  tendrils(o){ for(let i=0;i<3;i++) P(o.group, K.tube([[(i - 1)*0.25, 1.5, 0.03], [(i - 1)*0.3, 1.0, 0.12], [(i - 1)*0.2, 0.45, 0.06]], 0.04, 8, 5), 0x9a4a9a); },
  veins(o){ for(let i=0;i<3;i++) P(o.group, K.tube([[(i - 1)*0.3, 1.6, 0.03], [(i - 1)*0.1, 1.0, 0.06], [(i - 1)*0.35, 0.3, 0.03]], 0.04, 8, 5), 0x8a1a2a); },
  /* ---- more wall dressing (placed by vanity.js on any wall face) ---- */
  beam(o){ P(o.group, BX(0.22, 1.7, 0.2), 0x6a4426, 0, 0.85, 0.1); P(o.group, BX(0.9, 0.2, 0.24), 0x5a3a20, 0, 1.6, 0.12); [-0.3, 0.3].forEach(x=> P(o.group, BX(0.08, 0.5, 0.08), 0x5a3a20, x*0.9, 1.35, 0.12, 0, 0, x > 0 ? -0.7 : 0.7)); [0.5, 1.2].forEach(y=> P(o.group, CY(0.02, 0.02, 0.05, 6), 0x3a3a40, 0.06, y, 0.21, PI/2)); },
  pipes(o, rnd){ P(o.group, CY(0.07, 0.07, 1.0, 10), 0x6a6a72, 0, 1.25, 0.1, 0, 0, PI/2); P(o.group, CY(0.07, 0.07, 0.9, 10), 0x6a6a72, 0.42, 0.8, 0.1); P(o.group, S(0.1, 8, 6), 0x5a5a62, 0.42, 1.25, 0.1); P(o.group, TO(0.08, 0.02), 0xa04a2a, -0.2, 1.25, 0.1, 0, PI/2); P(o.group, CY(0.08, 0.08, 0.03, 6), 0xc83a2a, -0.2, 1.38, 0.1); o.glows.push({ x:0.42, y:0.35, z:0.1, c:0x6ad8ff, s:0.25 }); },
  poster(o, rnd){ const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.62), K.ink({ vertexColors:false, map:posterTex(Math.floor(rnd()*3)) })); m.position.set(0, 1.05, 0.03); m.rotation.z = (rnd() - 0.5)*0.2; o.group.add(m); o.loose = true; },
  barrelrack(o){ P(o.group, BX(0.9, 0.06, 0.4), 0x5a3a20, 0, 0.5, 0.2); [-0.25, 0.25].forEach(x=>{ P(o.group, CY(0.18, 0.18, 0.4, 12), 0x8a5a30, x, 0.72, 0.2, PI/2); P(o.group, CY(0.1, 0.1, 0.42, 8), 0x3a2a1a, x, 0.72, 0.21, PI/2); P(o.group, CY(0.03, 0.03, 0.08, 6), 0x9a9aa8, x, 0.62, 0.43, PI/2); }); [-0.42, 0.42].forEach(x=> P(o.group, BX(0.06, 0.5, 0.36), 0x5a3a20, x, 0.25, 0.2)); },
  roots(o, rnd){ for(let i=0;i<4;i++){ const x = (i - 1.5)*0.2; P(o.group, K.tube([[x, 1.75, 0.03], [x + (rnd() - 0.5)*0.2, 1.3, 0.12], [x + (rnd() - 0.5)*0.3, 0.8 + rnd()*0.3, 0.08]], 0.03, 8, 4), 0x6a4a2a); } },
  stalactites(o, rnd){ for(let i=0;i<5;i++){ const h = 0.2 + rnd()*0.35; P(o.group, CO(0.06 + rnd()*0.04, h, 6), 0x8a8a7a, (i - 2)*0.2, 1.72 - h/2, 0.1 + rnd()*0.1, PI); } },
  glowworms(o, rnd){ for(let i=0;i<6;i++) o.glows.push({ x:(rnd() - 0.5)*0.8, y:1.0 + rnd()*0.6, z:0.04, c:0x9cffd8, s:0.18 }); for(let i=0;i<6;i++) P(o.group, CY(0.004, 0.004, 0.3 + rnd()*0.3, 3), 0xc8e8e0, (rnd() - 0.5)*0.8, 1.45, 0.04); o.lights.push({ x:0, y:1.2, z:0.4, c:0x9cffd8, i:0.4 }); },
  window(o, rnd){ const c = [0x6ab8ff, 0xff6a8a, 0xb88aff][Math.floor(rnd()*3)]; P(o.group, BX(0.62, 0.92, 0.06), 0x3a3a48, 0, 1.08, 0.02); P(o.group, CY(0.31, 0.31, 0.06, 14, 1, false, 0, PI), 0x3a3a48, 0, 1.54, 0.02, PI/2, 0, PI/2); const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.8), new THREE.MeshBasicMaterial({ map:glassTex(), color:c })); glass.position.set(0, 1.08, 0.06); o.group.add(glass); o.loose = true; o.glows.push({ x:0, y:1.1, z:0.1, c, s:1.6 }); o.lights.push({ x:0, y:1.2, z:0.6, c, i:0.9 }); },
  coffinwall(o){ P(o.group, K.lathe([[0.0, 0], [0.22, 0], [0.3, 0.9], [0.22, 1.5], [0, 1.5]], 6), 0x4a3a3a, 0, 0, 0.12, 0, 0, 0, 1, 1, 0.45); P(o.group, BX(0.05, 0.45, 0.02), 0xd8c8a0, 0, 0.95, 0.27); P(o.group, BX(0.25, 0.05, 0.02), 0xd8c8a0, 0, 1.05, 0.27); },
  urnshelf(o){ P(o.group, BX(0.8, 0.06, 0.24), 0x5a5a64, 0, 0.95, 0.12); [-0.25, 0, 0.25].forEach((x, i)=>{ P(o.group, K.lathe([[0, 0], [0.07, 0], [0.1, 0.1], [0.06, 0.2], [0.08, 0.24], [0, 0.24]], 8), [0x6a7a9a, 0x9a8a6a, 0x7a5a6a][i], x, 0.98, 0.12); }); },
  drips(o, rnd){ const c = rnd() < 0.5 ? 0x9cff3a : 0xff4ad8; for(let i=0;i<4;i++){ const x = (rnd() - 0.5)*0.8, h = 0.3 + rnd()*0.7; P(o.group, CY(0.025, 0.04, h, 6), c, x, 1.7 - h/2, 0.03); P(o.group, S(0.045, 6, 4), c, x, 1.7 - h, 0.04); } o.glows.push({ x:0, y:1.2, z:0.06, c, s:0.9 }); },
  mouthwall(o){ P(o.group, S(0.38, 12, 8), 0x8a2a4a, 0, 0.9, 0, 0, 0, 0, 1, 0.6, 0.35); P(o.group, S(0.3, 12, 8), 0x1a040a, 0, 0.9, 0.06, 0, 0, 0, 1, 0.42, 0.3); for(let i=0;i<6;i++){ const x = -0.2 + i*0.08; P(o.group, CO(0.03, 0.09, 4), 0xf4ecd8, x, 1.0, 0.12, PI); P(o.group, CO(0.03, 0.09, 4), 0xf4ecd8, x + 0.04, 0.8, 0.12); } P(o.group, S(0.12, 8, 6), 0xd84a6a, 0, 0.82, 0.12, 0, 0, 0, 1.4, 0.5, 0.6); },
  valve(o){ P(o.group, S(0.32, 12, 10), 0x8a1a2a, 0, 0.9, 0.0, 0, 0, 0, 1, 1, 0.45); for(let i=0;i<8;i++){ const a = i/8*PI*2; P(o.group, BX(0.03, 0.18, 0.04), 0x5a0a14, Math.cos(a)*0.17, 0.9 + Math.sin(a)*0.17, 0.12, 0, 0, a + PI/2); } P(o.group, S(0.08, 8, 6), 0x1a0204, 0, 0.9, 0.13); o.glows.push({ x:0, y:0.9, z:0.18, c:0xff3a3a, s:0.7 }); },
  cornerweb(o){ const w = new THREE.Mesh(new THREE.CircleGeometry(0.8, 6, 0, PI/2), new THREE.MeshBasicMaterial({ map:webTex(), transparent:true, opacity:0.45, depthWrite:false, side:THREE.DoubleSide })); w.rotation.z = PI; w.position.set(0.4, 1.7, 0.02); o.group.add(w); o.loose = true; },
  /* ---- on top of walls ---- */
  toprubble(o, rnd){ for(let i=0;i<3;i++) P(o.group, new THREE.DodecahedronGeometry(0.07 + rnd()*0.07), 0x8a8076, (rnd() - 0.5)*0.6, 0.05, (rnd() - 0.5)*0.6, rnd(), rnd()); },
  topgrass(o, rnd){ for(let i=0;i<6;i++) P(o.group, CO(0.03, 0.2 + rnd()*0.15, 4), [0x5a9a3a, 0x7ab84a][i % 2], (rnd() - 0.5)*0.6, 0.1, (rnd() - 0.5)*0.6, (rnd() - 0.5)*0.4, 0, (rnd() - 0.5)*0.4); },
  topcandle(o, rnd){ const h = 0.12 + rnd()*0.15; P(o.group, CY(0.04, 0.045, h, 8), 0xf0e6c8, 0, h/2, 0); P(o.group, S(0.07, 8, 4), 0xe8dcb8, 0, 0.01, 0, 0, 0, 0, 1.4, 0.3, 1.4); o.glows.push({ x:0, y:h + 0.05, z:0, c:0xffb84a, s:0.35 }); },
  topeye(o){ P(o.group, S(0.16, 10, 8), 0x7a2a5a, 0, 0.02, 0, 0, 0, 0, 1, 0.5, 1); o.eyes.push({ x:0, y:0.08, z:0, r:0.1 }); },
  topskull(o){ P(o.group, S(0.1, 10, 8), 0xe8e2cc, 0, 0.09, 0); P(o.group, BX(0.12, 0.05, 0.08), 0xe8e2cc, 0, 0.02, 0.03); [-1, 1].forEach(s=> P(o.group, S(0.03, 6, 4), 0x101010, s*0.04, 0.1, 0.08)); },
  /* ---- the castle ---- */
  armour(o){ const st = 0xa8acb8, dk = 0x5a5e6a; P(o.group, BX(0.5, 0.08, 0.4), 0x4a4650, 0, 0.04, 0); [-1, 1].forEach(s=>{ P(o.group, CY(0.06, 0.07, 0.5, 8), st, s*0.1, 0.33, 0); P(o.group, BX(0.12, 0.06, 0.18), dk, s*0.1, 0.1, 0.04); }); P(o.group, CY(0.18, 0.15, 0.5, 10), st, 0, 0.82, 0); P(o.group, TO(0.17, 0.025), 0xd8a840, 0, 0.6, 0, PI/2); [-1, 1].forEach(s=>{ P(o.group, S(0.09, 8, 6), st, s*0.24, 1.04, 0); P(o.group, CY(0.04, 0.045, 0.42, 8), st, s*0.26, 0.82, 0.02); });
    P(o.group, S(0.15, 12, 10), st, 0, 1.24, 0); P(o.group, BX(0.2, 0.025, 0.04), 0x101014, 0, 1.24, 0.13); P(o.group, CO(0.04, 0.18, 6), 0xc83a3a, 0, 1.44, -0.02); P(o.group, BX(0.03, 1.2, 0.03), dk, 0.3, 0.75, 0.12); P(o.group, CO(0.08, 0.22, 4), st, 0.3, 1.45, 0.12); },
  candelabra(o){ P(o.group, CY(0.14, 0.18, 0.06, 10), 0xc8a040, 0, 0.03, 0); P(o.group, CY(0.025, 0.03, 1.0, 8), 0xc8a040, 0, 0.53, 0); P(o.group, TO(0.2, 0.02, PI), 0xc8a040, 0, 1.0, 0, 0, 0, PI); [-0.2, 0, 0.2].forEach(x=>{ P(o.group, CY(0.03, 0.03, 0.14, 8), 0xf0e6c8, x, 1.1, 0); o.glows.push({ x, y:1.22, z:0, c:0xffb84a, s:0.4 }); }); o.lights.push({ x:0, y:1.3, z:0, c:0xffa040, i:0.9 }); },
  weaponrack(o){ P(o.group, BX(0.8, 0.06, 0.18), 0x6a4426, 0, 0.1, 0); P(o.group, BX(0.8, 0.06, 0.12), 0x6a4426, 0, 0.9, -0.03); [-0.3, -0.1, 0.1, 0.3].forEach((x, i)=>{ P(o.group, CY(0.02, 0.02, 1.0, 6), 0x6a4426, x, 0.55, 0); P(o.group, i % 2 ? CO(0.05, 0.2, 4) : BX(0.12, 0.18, 0.02), 0xb8bcc8, x, 1.12, 0); }); },
  /* ---- the Gloom and the forest ---- */
  rotpod(o, rnd){ for(let i=0;i<3;i++){ const r = 0.12 + rnd()*0.12, x = (rnd() - 0.5)*0.5, z = (rnd() - 0.5)*0.5; P(o.group, K.lump(r, 1, 0.3, rnd()*9), [0x3a1a3e, 0x5a2050][i % 2], x, r*0.7, z, 0, 0, 0, 1, 0.8, 1); o.glows.push({ x, y:r*1.3, z, c:i % 2 ? 0xff3fb0 : 0x9cff3a, s:0.35 }); } P(o.group, new THREE.CircleGeometry(0.45, 10), 0x2a0a2a, 0, 0.015, 0, -PI/2); o.lights.push({ x:0, y:0.4, z:0, c:0x9cff3a, i:0.35 }); },
  roots(o, rnd){ for(let i=0;i<4;i++){ const a = i*1.6 + rnd(); P(o.group, K.tube([[0, 0.05, 0], [Math.cos(a)*0.3, 0.18, Math.sin(a)*0.3], [Math.cos(a)*0.65, 0.02, Math.sin(a)*0.65]], 0.05 - i*0.006, 10, 5), 0x3a2418); } P(o.group, K.lump(0.16, 1, 0.3, rnd()*9), 0x3a2418, 0, 0.08, 0, 0, 0, 0, 1, 0.6, 1); },
  glowcap(o, rnd){ const c = [0x1a6ad8, 0x1a88c8, 0x4a4ad0, 0x1aa0a0][Math.floor(rnd()*4)], h = 0.6 + rnd()*0.7, r = 0.3 + rnd()*0.25, lean = (rnd() - 0.5)*0.3;
    P(o.group, CY(r*0.18, r*0.28, h, 8), 0xcfe4ff, 0, h/2, 0, 0, 0, lean); P(o.group, TO(r*0.3, 0.025), 0xe8f0ff, -Math.sin(lean)*h*0.7, h*0.7, 0, PI/2, 0, lean);
    P(o.group, new THREE.SphereGeometry(r, 14, 7, 0, PI*2, 0, PI/2), c, -Math.sin(lean)*h, h - 0.02, 0, 0, 0, lean, 1, 0.55, 1);
    for(let k=0;k<5;k++){ const a = k*1.3; P(o.group, S(r*0.1, 6, 4), 0xd8f8ff, -Math.sin(lean)*h + Math.cos(a)*r*0.6, h + r*0.32, Math.sin(a)*r*0.6); }
    o.glows.push({ x:-Math.sin(lean)*h, y:h - 0.05, z:0, c, s:r*4, cap:0 }); o.lights.push({ x:-Math.sin(lean)*h, y:h + 0.3, z:0, c, i:0.9 });
    for(let k=0;k<3;k++){ const a = rnd()*6.28, d = 0.25 + rnd()*0.2, hh = 0.12 + rnd()*0.12; P(o.group, CY(0.02, 0.025, hh, 6), 0xcfe4ff, Math.cos(a)*d, hh/2, Math.sin(a)*d); P(o.group, new THREE.SphereGeometry(0.07, 8, 5, 0, PI*2, 0, PI/2), c, Math.cos(a)*d, hh, Math.sin(a)*d); } },
  fern(o, rnd){ for(let i=0;i<7;i++){ const a = i/7*PI*2 + rnd()*0.4, l = 0.35 + rnd()*0.2; P(o.group, BX(0.09, 0.012, l), [0x2a5a3a, 0x3a6a4a][i % 2], Math.cos(a)*l*0.4, 0.12, Math.sin(a)*l*0.4, -0.5, -a + PI/2, 0); } },
  log(o, rnd){ P(o.group, CY(0.2, 0.22, 1.3, 10), 0x3a2a20, 0, 0.2, 0, 0, 0, PI/2); P(o.group, CY(0.17, 0.17, 0.02, 10), 0x8a6a4a, 0.66, 0.2, 0, 0, 0, PI/2); for(let i=0;i<3;i++) P(o.group, new THREE.SphereGeometry(0.08, 8, 4, 0, PI*2, 0, PI/2), 0x3ab8ff, -0.3 + i*0.25, 0.4, 0.08, -0.3); o.glows.push({ x:-0.05, y:0.45, z:0.1, c:0x3ab8ff, s:0.6 }); P(o.group, new THREE.CircleGeometry(0.3, 8), 0x2a5a3a, 0.2, 0.41, 0, -PI/2); },
  firsapling(o, rnd){ const h = 1.4 + rnd()*0.8, c = new THREE.Color().setHSL(0.48 + rnd()*0.06, 0.35, 0.09 + rnd()*0.04).getHex(); P(o.group, CY(0.05, 0.08, h*0.3, 6), 0x2a1a10, 0, h*0.15, 0); for(let k=0;k<3;k++){ const f = k/3; P(o.group, CO((1 - f)*h*0.26 + 0.12, h*0.45, 7), c, 0, h*0.3 + f*h*0.5, 0); } },
  cordyceps(o, rnd){ P(o.group, K.lump(0.15, 1, 0.3, rnd()*9), 0x5a5660, 0, 0.1, 0, 0, 0, 0, 1.3, 0.7, 1); for(let i=0;i<5;i++){ const a = i*1.25 + rnd(), h = 0.3 + rnd()*0.35; P(o.group, CO(0.025, h, 5), 0xff7a2a, Math.cos(a)*0.08, 0.12 + h/2, Math.sin(a)*0.08, Math.sin(a)*0.4, 0, -Math.cos(a)*0.4); o.glows.push({ x:Math.cos(a)*(0.08 + h*0.2), y:0.12 + h, z:Math.sin(a)*(0.08 + h*0.2), c:0xff3fb0, s:0.22 }); } },
  fallenpillar(o, rnd){ P(o.group, CY(0.24, 0.24, 1.4, 10), 0x6a6672, 0, 0.24, 0, 0, 0, PI/2); P(o.group, BX(0.6, 0.15, 0.6), 0x5a5662, -0.75, 0.08, 0); [-0.2, 0.3].forEach(x=> P(o.group, TO(0.25, 0.03), 0x7a7682, x, 0.24, 0, 0, PI/2)); P(o.group, new THREE.CircleGeometry(0.35, 8), 0x2a5a3a, 0.2, 0.49, 0, -PI/2); P(o.group, K.tube([[-0.5, 0.48, 0.1], [0, 0.5, -0.15], [0.5, 0.46, 0.1]], 0.03, 8, 4), 0x3a2418); },
  /* ---- on the wall ---- */
  shieldwall(o, rnd){ const c = [0xa02a2a, 0x2a4aa0, 0xd8a840][Math.floor(rnd()*3)]; P(o.group, CY(0.24, 0.24, 0.04, 3), c, 0, 1.05, 0.04, PI/2, 0, PI); P(o.group, TO(0.2, 0.02, PI*2), 0xd8d8e0, 0, 1.08, 0.065); [-1, 1].forEach(s=> P(o.group, BX(0.06, 0.7, 0.03), 0x8a8e9a, s*0.22, 1.05, 0.02, 0, 0, s*0.7)); },
  tapestry(o, rnd){ const c = [0x8a1a2a, 0x2a2a7a, 0x1a5a3a][Math.floor(rnd()*3)]; P(o.group, BX(0.7, 1.1, 0.03), c, 0, 0.95, 0.03); P(o.group, BX(0.62, 0.06, 0.035), 0xd8a840, 0, 0.55, 0.035); P(o.group, BX(0.62, 0.06, 0.035), 0xd8a840, 0, 1.35, 0.035); P(o.group, OC(0.12), 0xd8a840, 0, 0.95, 0.05); P(o.group, CY(0.02, 0.02, 0.85, 6), 0x6a4426, 0, 1.52, 0.04, 0, 0, PI/2); },
  wallroots(o, rnd){ for(let i=0;i<5;i++){ const x = (i - 2)*0.18 + (rnd() - 0.5)*0.1; P(o.group, K.tube([[x, 1.75, 0.02], [x + (rnd() - 0.5)*0.3, 1.2, 0.12], [x + (rnd() - 0.5)*0.4, 0.55, 0.08], [x + (rnd() - 0.5)*0.5, 0.0, 0.25]], 0.035 + rnd()*0.03, 14, 5), [0x3a2418, 0x2a1a14][i % 2]); } },
  wallcaps(o, rnd){ for(let i=0;i<4;i++){ const y = 0.5 + i*0.3, x = (rnd() - 0.5)*0.6, r = 0.14 + rnd()*0.1; P(o.group, new THREE.CylinderGeometry(r, r*0.6, 0.05, 10, 1, false, 0, PI), 0x3ab8ff, x, y, 0.02); o.glows.push({ x, y, z:r*0.5, c:0x3ab8ff, s:r*3 }); } o.lights.push({ x:0, y:1.0, z:0.5, c:0x3ab8ff, i:0.55 }); },
  cordycepswall(o, rnd){ P(o.group, K.lump(0.3, 1, 0.3, rnd()*9), 0x3a1a3e, 0, 0.9, 0, 0, 0, 0, 1, 1.2, 0.4); for(let i=0;i<6;i++){ const a = -0.8 + i*0.32, h = 0.3 + rnd()*0.3; P(o.group, CO(0.025, h, 5), 0xff7a2a, Math.sin(a)*0.2, 0.9 + Math.cos(a)*0.25 + h*0.3, 0.12, -0.6, 0, -a); } o.glows.push({ x:0, y:0.9, z:0.1, c:0x9cff3a, s:0.7 }); },
  ribs(o){ for(let i=0;i<4;i++) P(o.group, TO(0.32, 0.035, PI), 0xe8dcc8, 0, 0.6 + i*0.25, 0.02); }
};
/* a goblin wanted poster, a lost-frog notice, a menu */
const _posters = {};
function posterTex(i){
  if(_posters[i]) return _posters[i];
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 80; const g = cv.getContext("2d");
  g.fillStyle = "#e8d8b0"; g.fillRect(0, 0, 64, 80); g.fillStyle = "#c8b890"; for(let k=0;k<40;k++) g.fillRect(Math.random()*64|0, Math.random()*80|0, 2, 1);
  g.fillStyle = "#3a2010"; g.textAlign = "center"; g.font = "900 13px 'Saira Condensed', sans-serif";
  const head = ["WANTED", "LOST FROG", "MENU"][i]; g.fillText(head, 32, 14);
  if(i === 0){ g.fillStyle = "#6b3fd0"; g.beginPath(); g.moveTo(32, 22); g.lineTo(44, 46); g.lineTo(20, 46); g.fill(); g.fillStyle = "#f2c9a0"; g.beginPath(); g.arc(32, 50, 7, 0, 7); g.fill(); g.fillStyle = "#fff"; g.fillRect(26, 54, 12, 8); g.fillStyle = "#3a2010"; g.font = "700 8px sans-serif"; g.fillText("REWARD:", 32, 70); g.fillText("3 SNAILS", 32, 78); }
  else if(i === 1){ g.fillStyle = "#5ac83a"; g.beginPath(); g.ellipse(32, 44, 14, 10, 0, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(26, 36, 4, 0, 7); g.arc(38, 36, 4, 0, 7); g.fill(); g.fillStyle = "#3a2010"; g.font = "700 8px sans-serif"; g.fillText("ANSWERS TO", 32, 66); g.fillText("\"GRIBBUS\"", 32, 75); }
  else { g.font = "700 8px sans-serif"; ["rat on stick ..2g", "rat no stick ..1g", "mystery soup ..?", "the stick .....5g"].forEach((l, k)=> g.fillText(l, 32, 32 + k*12)); }
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter;
  return _posters[i] = t;
}
let _glass = null;
function glassTex(){
  if(_glass) return _glass;
  const cv = document.createElement("canvas"); cv.width = 32; cv.height = 56; const g = cv.getContext("2d");
  for(let y=0;y<7;y++) for(let x=0;x<4;x++){ const v = 150 + ((x*7 + y*13) % 5)*25; g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(x*8, y*8, 8, 8); }
  g.strokeStyle = "#1a1a22"; g.lineWidth = 2; for(let x=0;x<=32;x+=8){ g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 56); g.stroke(); } for(let y=0;y<=56;y+=8){ g.beginPath(); g.moveTo(0, y); g.lineTo(32, y); g.stroke(); }
  g.fillStyle = "#fff8d0"; g.beginPath(); g.arc(16, 24, 6, 0, 7); g.fill();
  _glass = new THREE.CanvasTexture(cv); _glass.magFilter = THREE.NearestFilter; return _glass;
}
let _web = null;
function webTex(){
  if(_web) return _web;
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d");
  g.strokeStyle = "rgba(230,230,240,0.9)"; g.lineWidth = 1;
  for(let i=0;i<7;i++){ const a = i/6*Math.PI/2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a)*64, Math.sin(a)*64); g.stroke(); }
  for(let r=10; r<64; r+=10){ g.beginPath(); for(let i=0;i<=6;i++){ const a = i/6*Math.PI/2; const x = Math.cos(a)*r, y = Math.sin(a)*r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
  _web = new THREE.CanvasTexture(cv); return _web;
}
Decor.kinds = ()=> Object.keys(B);
Decor.build = function(kind, rnd){ const o = make(); (B[kind] || B.rubble)(o, rnd); return o; };

/* ---- breakables: one baked look per kind, drawn instanced ---- */
const BR = {
  pot(g){ P(g, K.lathe([[0, 0], [0.2, 0.02], [0.26, 0.2], [0.2, 0.4], [0.12, 0.46], [0.15, 0.52], [0, 0.52]], 12), 0xb8683a); P(g, TO(0.22, 0.02), 0x8a4a2a, 0, 0.24, 0, PI/2); },
  crate(g){ P(g, BX(0.8, 0.7, 0.8), 0x8a5a30, 0, 0.35, 0); [[0, 0.35, 0.41], [0, 0.35, -0.41]].forEach(([x, y, z])=>{ P(g, BX(0.82, 0.08, 0.02), 0x5a3a1a, x, y + 0.25, z); P(g, BX(0.82, 0.08, 0.02), 0x5a3a1a, x, y - 0.25, z); P(g, BX(0.08, 0.6, 0.02), 0x5a3a1a, x, y, z, 0, 0, 0.75); }); },
  barrel(g){ P(g, K.lathe([[0, 0], [0.3, 0], [0.34, 0.35], [0.3, 0.7], [0, 0.7]], 14), 0x8a5a30); [0.12, 0.58].forEach(y=> P(g, TO(0.32, 0.025), 0x4a4a54, 0, y, 0, PI/2)); },
  xbarrel(g){ P(g, K.lathe([[0, 0], [0.3, 0], [0.34, 0.35], [0.3, 0.7], [0, 0.7]], 14), 0xb8282a); [0.12, 0.58].forEach(y=> P(g, TO(0.32, 0.025), 0x2a2a2a, 0, y, 0, PI/2)); P(g, S(0.1, 8, 6), 0xf0f0e0, 0, 0.42, 0.31); P(g, BX(0.04, 0.2, 0.02), 0x1a1a1a, 0, 0.42, 0.35, 0, 0, 0.8); },
  urn(g){ P(g, K.lathe([[0, 0], [0.16, 0], [0.24, 0.25], [0.18, 0.5], [0.1, 0.56], [0.16, 0.62], [0, 0.62]], 12), 0x6a7a9a); P(g, TO(0.2, 0.025), 0xd8b84a, 0, 0.3, 0, PI/2); },
  coffin(g){ P(g, BX(0.6, 0.35, 0.85), 0x4a3a3a, 0, 0.18, 0); P(g, BX(0.62, 0.06, 0.87), 0x3a2a2a, 0, 0.37, 0); P(g, BX(0.06, 0.02, 0.3), 0xd8c8a0, 0, 0.41, 0); P(g, BX(0.18, 0.02, 0.06), 0xd8c8a0, 0, 0.41, 0.06); },
  shroomcap(g){ P(g, CY(0.1, 0.13, 0.35, 10), 0xf0e6d4, 0, 0.17, 0); P(g, new THREE.SphereGeometry(0.36, 14, 8, 0, PI*2, 0, PI/2), 0x8a4ab0, 0, 0.33, 0, 0, 0, 0, 1, 0.7, 1); [0, 2, 4].forEach(a=> P(g, S(0.05, 6, 4), 0xe8d8ff, Math.cos(a)*0.2, 0.48, Math.sin(a)*0.2)); },
  eggsac(g){ P(g, S(0.3, 12, 10), 0xd8b8a0, 0, 0.3, 0, 0, 0, 0, 1, 1.2, 1); [0.4, 2.5, 4.4].forEach(a=> P(g, S(0.09, 8, 6), 0xc87a8a, Math.cos(a)*0.24, 0.35, Math.sin(a)*0.24)); },
  pustule(g){ P(g, S(0.32, 12, 10), 0x9a2a3a, 0, 0.25, 0, 0, 0, 0, 1, 0.8, 1); P(g, S(0.14, 10, 8), 0xd8e84a, 0, 0.48, 0); }
};
Decor.breakableGeo = function(kind){
  const g = new THREE.Group(); (BR[kind] || BR.pot)(g);
  const geos = [];
  g.children.forEach(m=>{ m.updateMatrix(); let q = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone(); q.applyMatrix4(m.matrix); K.paint(q, m.material.color); geos.push(q); });
  return K.merge(geos);
};

})();
