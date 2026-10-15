/* ------------------------------------------------------------------ *
 *  Everyone, built from smooth parts and baked into toon-shaded meshes
 *  with ink outlines (kit.js). Each model is a rig: groups that move
 *  (head, arms, legs, hat tip) so they can waddle, wind up and fall
 *  over. Every model faces +z and stands on the ground at its origin.
 *
 *  Zippy: a small wizard in a purple robe with stars on it, a beard
 *  you could lose a goblin in, and a hat that's given up on standing
 *  straight. Gribbus: a round green frog with a lot of opinions.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const Models = DG.Models = {};
const PI = Math.PI;

/* ---- geometry shorthands (shared, never disposed) ---- */
const GC = {};
const geo = (key, make)=> GC[key] || (GC[key] = make());
/* smooth: every round thing gets at least 1.6x the segments it asks for */
const SEG = n=> Math.max(6, Math.round(n*1.6));
const S = (r, w, h)=> geo("s" + r + "," + (w || 14) + "," + (h || 10), ()=> new THREE.SphereGeometry(r, SEG(w || 14), SEG(h || 10)));
const CY = (rt, rb, h, n)=> geo("c" + rt + "," + rb + "," + h + "," + (n || 12), ()=> new THREE.CylinderGeometry(rt, rb, h, SEG(n || 12)));
const CO = (r, h, n)=> geo("o" + r + "," + h + "," + (n || 12), ()=> new THREE.ConeGeometry(r, h, (n || 12) <= 6 ? n : SEG(n || 12)));
const BX = (w, h, d)=> geo("b" + w + "," + h + "," + d, ()=> new THREE.BoxGeometry(w, h, d));
const TO = (r, t, a)=> geo("t" + r + "," + t + "," + (a || 0), ()=> new THREE.TorusGeometry(r, t, 12, 32, a || PI*2));
const OC = (r)=> geo("oc" + r, ()=> new THREE.OctahedronGeometry(r));
const P = K.part;

function rig(kind){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  return { root, body, parts:{}, glows:[], muzzle:new THREE.Object3D(), h:1.4, size:1, kind };
}
function group(parent, x, y, z){ const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); parent.add(g); return g; }
/* glowing bits: not baked, not outlined, faded with the rest */
function glow(R, parent, r, c, x, y, z){
  const m = new THREE.Mesh(S(r, 8, 6), new THREE.MeshBasicMaterial({ color:c, transparent:true }));
  m.position.set(x || 0, y || 0, z || 0); parent.add(m); R.glows.push(m); return m;
}
function halo(R, parent, c, s, x, y, z, op){ const sp = K.sprite(c, s, op === undefined ? 0.6 : op); sp.position.set(x || 0, y || 0, z || 0); parent.add(sp); R.glows.push(sp); return sp; }
function finish(R, opts){
  const b = K.bake(R.root, opts);
  R.mat = b.mat; R.out = b.out;
  return R;
}
/* eyes that look at you: white, a pupil, a glint */
function eyes(parent, sep, y, z, r, pupil, look){
  [-1, 1].forEach(s=>{
    P(parent, S(r, 10, 8), 0xf8f8f0, s*sep, y, z);
    P(parent, S(r*0.55, 8, 6), pupil || 0x101018, s*sep + (look || 0)*s*0.2*r, y, z + r*0.75);
    P(parent, S(r*0.18, 6, 4), 0xffffff, s*sep + r*0.2, y + r*0.3, z + r*0.95);
  });
}

/* ================================================================== *
 *  Guns: a fire pattern, a crystal in the element's colour
 *  Grim artefacts now: blackened iron, bone and tarnished brass, runes
 *  cut along the barrels, and the element's crystal held in a little
 *  reliquary cage, the only bright thing on them.
 * ================================================================== */
/* low-poly shorthands for small details (rivets, beads, links): cheap, cached */
const zs = (r, w, h)=> geo("zs" + r + "," + (w || 8) + "," + (h || 6), ()=> new THREE.SphereGeometry(r, w || 8, h || 6));
const zto = (r, t, a)=> geo("zt" + r + "," + t + "," + (a || 0), ()=> new THREE.TorusGeometry(r, t, 6, r > 0.08 ? 28 : 14, a || PI*2));
const zcy = (rt, rb, h, n)=> geo("zc" + rt + "," + rb + "," + h + "," + (n || 10), ()=> new THREE.CylinderGeometry(rt, rb, h, n || 10));
const WOOD = 0x7a4a26, WOOD2 = 0x5a3418, BRASS = 0xd8a840, IRON = 0x4a4a58, DARK = 0x2a2a34;
const GP = { iron:0x232326, iron2:0x38383e, brass:0x8a6a30, brass2:0x6a5228, bone:0xc0b496, bone2:0x9a8c70, wood:0x3a2618, wood2:0x2a1c12,
  leather:0x3a2a1e, wax:0xd2c6a8, rust:0x5e3420, rune:0x4a4030 };
/* a cage of prongs round a crystal at (x, y, z), opening toward +z (or up) */
function gCage(g, x, y, z, r, n, up){
  for(let i=0;i<n;i++){
    const a = i/n*PI*2 + 0.4, cx = Math.cos(a)*r, cy = Math.sin(a)*r;
    const pts = up ? [[x + cx*0.6, y - r*1.1, z + cy*0.6], [x + cx*1.25, y, z + cy*1.25], [x + cx*0.5, y + r*1.15, z + cy*0.5]]
                   : [[x + cx*0.6, y + cy*0.6, z - r*1.1], [x + cx*1.25, y + cy*1.25, z], [x + cx*0.5, y + cy*0.5, z + r*1.2]];
    P(g, K.tube(pts, r*0.09, 8, 5), GP.iron2);
    P(g, zs(r*0.13), GP.brass, pts[2][0], pts[2][1], pts[2][2]);
  }
  if(up) P(g, CY(r*0.85, r*1.0, r*0.4, 14), GP.brass2, x, y - r*1.15, z);
  else P(g, CY(r*1.0, r*0.85, r*0.4, 14), GP.brass2, x, y, z - r*1.15, PI/2);
}
/* runes cut along a barrel: little dark marks in a row */
function gRunes(g, x, y, z0, z1, n, h){ for(let i=0;i<n;i++){ const z = z0 + (z1 - z0)*(i + 0.5)/n; P(g, BX(0.006, h || 0.022, 0.012), GP.rune, x, y, z, 0, 0, (i % 3 - 1)*0.5); } }
/* a candle stub stuck on with its own wax, a tiny flame */
function gCandle(g, R, x, y, z, h){
  P(g, CY(0.017, 0.02, h, 10), GP.wax, x, y + h/2, z);
  P(g, zs(0.022), GP.wax, x, y, z, 0, 0, 0, 1, 0.35, 1);
  [[0.016, 0.3], [-0.012, 2.2]].forEach(([d, a])=> P(g, CY(0.005, 0.007, h*0.6, 5), GP.wax, x + Math.cos(a)*d, y + h*0.5, z + Math.sin(a)*d));
  P(g, zcy(0.002, 0.002, 0.012, 5), 0x1a1410, x, y + h + 0.006, z);
  if(R){ const f = glow(R, g, 0.009, 0xffb050, x, y + h + 0.018, z); f.scale.set(1, 1.7, 1); }
}
const GUN = {
  pistol(g, el, R){
    // a bone grip, an iron frame, a ringed barrel, the crystal caged at the muzzle
    P(g, K.sculpt(new THREE.BoxGeometry(0.085, 0.21, 0.12, 2, 4, 2), 0.004, 30, 1), GP.bone2, 0, -0.11, -0.06, 0.35);
    [-0.06, -0.12, -0.18].forEach(y=> P(g, BX(0.09, 0.012, 0.125), GP.iron2, 0, y, -0.06 + y*0.35, 0.35));
    P(g, zs(0.04), GP.iron, 0, -0.21, -0.1);
    P(g, BX(0.1, 0.09, 0.22), GP.iron, 0, 0.0, 0.02);
    P(g, BX(0.105, 0.02, 0.2), GP.brass2, 0, 0.045, 0.02);
    P(g, zto(0.04, 0.008, PI), GP.iron2, 0, -0.06, 0.04, 0, PI/2, PI);
    P(g, BX(0.03, 0.06, 0.03), GP.iron2, 0, 0.06, -0.08, -0.4);
    P(g, CY(0.034, 0.044, 0.4, 14), GP.iron, 0, 0.03, 0.26, PI/2);
    [0.13, 0.25, 0.37].forEach(z=> P(g, zto(0.043, 0.01), GP.brass, 0, 0.03, z));
    gRunes(g, 0, 0.069, 0.14, 0.38, 6);
    P(g, CY(0.05, 0.04, 0.04, 14), GP.iron2, 0, 0.03, 0.46, PI/2);
    gCage(g, 0, 0.03, 0.53, 0.055, 4);
    gCandle(g, R, 0, 0.055, -0.05, 0.05);
    return { gem:[0, 0.03, 0.53, 0.05], muzzle:[0, 0.03, 0.58] };
  },
  smg(g, el, R){
    // a riveted iron box with a reliquary drum, twin barrels, a bone stock
    P(g, BX(0.13, 0.15, 0.4), GP.iron, 0, 0, 0.04);
    for(let i=0;i<5;i++) [-1, 1].forEach(s=> P(g, zs(0.009), GP.brass, s*0.066, 0.05, -0.12 + i*0.08));
    P(g, K.sculpt(new THREE.BoxGeometry(0.1, 0.2, 0.1, 2, 4, 2), 0.004, 30, 2), GP.bone2, 0, -0.14, -0.12, 0.3);
    P(g, BX(0.08, 0.09, 0.2), GP.bone, 0, 0.0, -0.24);
    P(g, CY(0.11, 0.11, 0.1, 22), GP.iron2, 0, -0.12, 0.08, 0, 0, PI/2);
    [-0.04, 0.04].forEach(x=> P(g, zto(0.11, 0.01), GP.brass, x, -0.12, 0.08, 0, PI/2));
    [-1, 1].forEach(s=>{ P(g, CY(0.045, 0.045, 0.012, 16), GP.bone, s*0.052, -0.12, 0.08, 0, 0, PI/2); [-1, 1].forEach(q=> P(g, zs(0.008), 0x0a0808, s*0.06, -0.11, 0.08 + q*0.016)); });
    for(const x of [-0.035, 0.035]){ P(g, CY(0.024, 0.026, 0.26, 10), GP.iron2, x, 0.02, 0.33, PI/2); P(g, zto(0.027, 0.007), GP.brass, x, 0.02, 0.45); }
    gRunes(g, 0.066, 0.0, -0.1, 0.18, 5, 0.03);
    P(g, BX(0.14, 0.025, 0.26), GP.brass2, 0, 0.087, 0.04);
    gCage(g, 0, 0.13, 0.08, 0.045, 3, true);
    [-1, 1].forEach(s=> [0.15, 0.18, 0.21].forEach(z=> P(g, BX(0.012, 0.06, 0.012), 0x0a0808, s*0.066, 0.01, z)));
    return { gem:[0, 0.13, 0.08, 0.042], vents:true, muzzle:[0, 0.02, 0.47] };
  },
  shotgun(g, el, R){
    // a blunderbuss: dark wood inlaid with bone, a flared brass maw with teeth
    P(g, BX(0.11, 0.13, 0.34), GP.wood, 0, -0.03, -0.1);
    P(g, K.sculpt(new THREE.BoxGeometry(0.1, 0.12, 0.22, 2, 2, 4), 0.005, 25, 3), GP.wood2, 0, -0.1, -0.3, -0.4);
    P(g, BX(0.112, 0.02, 0.2), GP.bone, 0, -0.01, -0.12);
    P(g, BX(0.12, 0.1, 0.12), GP.iron, 0, 0.0, 0.04);
    P(g, K.lathe([[0.045, 0], [0.05, 0.3], [0.065, 0.42], [0.12, 0.52], [0.115, 0.545], [0.06, 0.5]], 18), GP.brass, 0, 0.03, 0.06, PI/2);
    [0.12, 0.26, 0.38].forEach(z=> P(g, zto(0.058, 0.013), GP.iron2, 0, 0.03, z));
    for(let i=0;i<9;i++){ const a = i/9*PI*2; P(g, CO(0.012, 0.045, 5), GP.bone, Math.cos(a)*0.1, 0.03 + Math.sin(a)*0.1, 0.6, PI/2 + 0.3*Math.sin(a), 0, -0.3*Math.cos(a)); }
    gRunes(g, 0, 0.083, 0.12, 0.36, 5);
    gCage(g, 0, 0.12, -0.05, 0.05, 4, true);
    return { gem:[0, 0.12, -0.05, 0.048], muzzle:[0, 0.03, 0.62] };
  },
  rifle(g, el, R){
    // a long hunter's rifle: black wood, a bone butt, brass rings, a caged crystal for a sight
    P(g, BX(0.09, 0.14, 0.5), GP.wood, 0, -0.03, -0.12);
    P(g, K.sculpt(new THREE.BoxGeometry(0.08, 0.16, 0.2, 2, 4, 4), 0.005, 25, 4), GP.bone2, 0, -0.08, -0.4, -0.25);
    P(g, BX(0.085, 0.17, 0.02), GP.iron2, 0, -0.08, -0.5, -0.25);
    P(g, CY(0.026, 0.034, 0.95, 12), GP.iron, 0, 0.03, 0.55, PI/2);
    [0.25, 0.55, 0.85].forEach(z=> P(g, zto(0.038, 0.009), GP.brass, 0, 0.03, z));
    gRunes(g, 0, 0.062, 0.3, 0.8, 8);
    P(g, CY(0.04, 0.04, 0.24, 12), GP.iron2, 0, 0.12, 0.08, PI/2);
    [-0.02, 0.18].forEach(z=> P(g, zto(0.042, 0.008), GP.brass, 0, 0.12, z));
    P(g, CY(0.035, 0.035, 0.01, 12), 0x1a1a22, 0, 0.12, -0.04, PI/2);
    gCage(g, 0, 0.12, 0.25, 0.04, 4);
    // a prayer tag tied to the barrel
    P(g, zcy(0.003, 0.003, 0.06, 5), 0x2a1e14, 0, -0.01, 0.7);
    P(g, BX(0.004, 0.08, 0.035), 0xb0a080, 0, -0.07, 0.7); P(g, CY(0.01, 0.01, 0.006, 8), 0x6a1a14, 0.003, -0.06, 0.7, 0, 0, PI/2);
    return { gem:[0, 0.12, 0.25, 0.038], muzzle:[0, 0.03, 1.04] };
  },
  launcher(g, el, R){
    // a great iron tube bound in chains, a skull for a sight, the crystal in its mouth
    P(g, K.sculpt(new THREE.CylinderGeometry(0.14, 0.13, 0.72, 28, 8), 0.004, 20, 1), GP.iron, 0, 0.04, 0.12, PI/2);
    P(g, zto(0.145, 0.03), GP.iron2, 0, 0.04, 0.47);
    for(let i=0;i<10;i++){ const a = i/10*PI*2; P(g, CO(0.02, 0.07, 5), GP.iron2, Math.cos(a)*0.15, 0.04 + Math.sin(a)*0.15, 0.5, PI/2 + 0.4*Math.sin(a), 0, -0.4*Math.cos(a)); }
    P(g, zto(0.14, 0.022), GP.brass, 0, 0.04, -0.2);
    P(g, zto(0.14, 0.018), GP.rust, 0, 0.04, 0.25);
    for(let i=0;i<16;i++){ const a = i/16*PI*2; P(g, zto(0.02, 0.006), GP.iron2, Math.cos(a)*0.148, 0.04 + Math.sin(a)*0.148, 0.04 + Math.cos(a)*0.03, 0, i % 2 ? PI/2 : 0, a + PI/2); }
    P(g, BX(0.07, 0.2, 0.09), GP.wood, 0, -0.14, -0.02);
    P(g, BX(0.06, 0.04, 0.22), GP.leather, 0, 0.18, 0.05);
    // the skull
    P(g, K.sculpt(new THREE.SphereGeometry(0.05, 16, 12), 0.003, 40, 2), GP.bone, 0, 0.22, 0.12, 0, 0, 0, 0.9, 0.95, 1.1);
    P(g, BX(0.05, 0.025, 0.04), GP.bone, 0, 0.185, 0.16);
    [-1, 1].forEach(s=> P(g, zs(0.013), 0x0a0808, s*0.018, 0.225, 0.168));
    gRunes(g, 0.135, 0.04, -0.15, 0.4, 6, 0.04);
    return { gem:[0, 0.04, 0.46, 0.085], muzzle:[0, 0.04, 0.52] };
  }
};
Models.gun = function(base, element, R, els){
  R = R || rig("gun");
  const g = new THREE.Group(), col = DG.ELEMENTS[element].color;
  const info = (GUN[base] || GUN.pistol)(g, col, R);
  const gem = glow(R, g, info.gem[3], col, info.gem[0], info.gem[1], info.gem[2]);
  gem.scale.set(0.8, 0.8, 1.25);
  // a little caged chip for every other element the shots carry, in a row behind the big one
  (els || []).filter(e=> e !== element).forEach((e, i)=>{
    const z = info.gem[2] - 0.1 - i*0.07, y = info.gem[1] + (base === "smg" || base === "shotgun" ? -0.05 : 0.06);
    P(g, CY(0.026, 0.032, 0.02, 10), GP.iron2, info.gem[0], y, z);
    [-1, 1].forEach(s=> P(g, zcy(0.004, 0.004, 0.05, 5), GP.brass, info.gem[0] + s*0.022, y + 0.03, z));
    glow(R, g, 0.022, DG.ELEMENTS[e].color, info.gem[0], y + 0.03, z);
  });
  halo(R, g, col, info.gem[3]*8, info.gem[0], info.gem[1], info.gem[2], 0.45);
  if(info.vents) [-0.07, 0.07].forEach(x=> glow(R, g, 0.016, col, x, 0.01, 0.18));
  R.muzzle = new THREE.Object3D(); R.muzzle.position.set(info.muzzle[0], info.muzzle[1], info.muzzle[2]); g.add(R.muzzle);
  R.gem = gem;
  return g;
};

/* ---- detail helpers: every character gets the same kinds of finish ---- */
/* a belt round a body of radius r at height y, with a buckle at the front */
function belt(parent, r, y, col, buckle, z){ P(parent, TO(r, 0.032), col, 0, y, z || 0, PI/2); P(parent, BX(0.1, 0.085, 0.04), buckle || GOLD, 0, y, (z || 0) + r + 0.012); }
/* eyebrows: cross, worried or plain */
function brows(parent, sep, y, z, col, mood, w){ [-1, 1].forEach(s=> P(parent, BX(w || 0.09, 0.026, 0.03), col, s*sep, y, z, 0, 0, s*(mood === "angry" ? 0.45 : mood === "sad" ? -0.4 : -0.1))); }
/* gills under a mushroom cap */
function gills(parent, r, y, col, n){ for(let i=0;i<n;i++){ const a = i/n*PI*2; P(parent, BX(0.014, 0.03, r*0.75), col, Math.cos(a)*r*0.5, y, Math.sin(a)*r*0.5, 0, PI/2 - a); } }
/* a mouth: a dark oval, open as much as you like */
function mouth(parent, x, y, z, w, open, col){ P(parent, S(w, 10, 8), col || 0x2a0a10, x, y, z, 0, 0, 0, 1, open || 0.35, 0.4); }
/* teeth along a mouth */
function teeth(parent, y, z, w, n, col){ for(let i=0;i<n;i++) P(parent, CO(0.018, 0.05, 4), col || 0xf4f0d8, -w/2 + (i + 0.5)*w/n, y, z, PI); }
/* a chain of links between two points */
function chain(parent, a, b, n, col){ for(let i=0;i<n;i++){ const t = i/(n - 1); P(parent, TO(0.045, 0.012), col || 0x5a5a64, a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t, 0, i % 2 ? PI/2 : 0, 0); } }
/* spikes round a ring */
function spikeRing(parent, r, y, n, len, col){ for(let i=0;i<n;i++){ const a = i/n*PI*2; P(parent, CO(0.04, len, 5), col, Math.cos(a)*r, y, Math.sin(a)*r, 0, -a, PI/2); } }

/* ================================================================== *
 *  Zippy
 *  A hexhunter on a long pilgrimage: tall, gaunt and a little bent,
 *  in a deep cowl whose drooping peak remembers the wizard hat it used
 *  to be. His face is lost in the hood: a cracked porcelain half-mask
 *  and two pinpricks of light. A grey beard spills out, the coat is
 *  long and torn at the hem, and a chained tome knocks at his hip.
 * ================================================================== */
const SKIN = 0xf2c9a0, BEARD = 0xf2f2f6, GOLD = 0xf0c040, LEATHER = 0x7a4a26;
/* his palette: worn things, nothing bright but what glows */
const ZC = { ash:0x8e8a82, ash2:0x6a665e, ash3:0xaaa69a, bone:0xc8bca0, ivory:0xd8ceb4, rust:0x6a3a22, blood:0x4a1410,
  brass:0x8a6a30, iron:0x26262a, iron2:0x3c3c42, leather:0x3a2a1e, leather2:0x2a1e16, glove:0x1e1814, parch:0xb0a080,
  wax:0xd2c6a8, hole:0x050405, wood:0x3e2c1e, flesh:0x221814, ember:0xffb050 };
/* the dyes: coat and hood, its dark and light shades (light: what his eyes
   glow), the cloak and mantle, and the thread the runes are stitched in */
const DYE = {
  arcane:{ robe:0x3e3050, dark:0x221a2c, light:0xb07aff, cape:0x2c2434, stars:0x8a6a30 },
  fire:  { robe:0x5e2618, dark:0x2e1410, light:0xff7a2a, cape:0x4a1410, stars:0xa8722e },
  frost: { robe:0x34465a, dark:0x1c2834, light:0x8ad8ff, cape:0x26384a, stars:0x9aaab4 },
  poison:{ robe:0x3e4a26, dark:0x222a16, light:0x9cff3a, cape:0x2e3620, stars:0x7a7a3a },
  shock: { robe:0x5a5030, dark:0x1e1e30, light:0xfff04a, cape:0x26263c, stars:0xb8a860 },
  gold:  { robe:0x6e5428, dark:0x3a2c14, light:0xffd86a, cape:0x5a4220, stars:0xc8a050 },
  shadow:{ robe:0x1c1820, dark:0x0e0c10, light:0xb36bff, cape:0x0c0a0e, stars:0x4a3a5a },
  star:  { robe:0x2e2a46, dark:0x1a1828, light:0xc8d8ff, cape:0x181c34, stars:0xa89a6a },
  leaf:  { robe:0x34422a, dark:0x3a2a1a, light:0xb8d86a, cape:0x2a3620, stars:0x8a6a6a },
  clown: { robe:0x7a4a30, dark:0x2e4a5a, light:0xffd23d, cape:0x3a6a70, stars:0x8a3a4a }
};
Models.DYE = DYE;

/* ---- his own shaping tools ---- */
/* a profile smoothed into a curve */
function zCurve(prof, n){
  if(prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();
  const c = new THREE.SplineCurve(prof.map(p=> new THREE.Vector2(p[0], p[1])));
  return c.getPoints((prof.length - 1)*(n || 4)).map(p=> new THREE.Vector2(Math.max(0.001, p.x), p.y));
}
/* a fresh lathe (its own geometry, safe to bend); phi 0 is his front */
function zLathe(prof, seg, phi0, phiLen, n){ return new THREE.LatheGeometry(zCurve(prof, n), seg, phi0 || 0, phiLen === undefined ? PI*2 : phiLen); }
/* normals averaged across seams, so bent lathes stay smooth */
function zSmooth(g){
  g.computeVertexNormals();
  const a = g.attributes.position, n = g.attributes.normal, map = {};
  for(let i=0;i<a.count;i++){ const k = Math.round(a.getX(i)*1e4) + "," + Math.round(a.getY(i)*1e4) + "," + Math.round(a.getZ(i)*1e4); (map[k] || (map[k] = [])).push(i); }
  for(const k in map){
    const l = map[k]; if(l.length < 2) continue;
    let x = 0, y = 0, z = 0; l.forEach(i=>{ x += n.getX(i); y += n.getY(i); z += n.getZ(i); });
    const m = Math.hypot(x, y, z) || 1; l.forEach(i=> n.setXYZ(i, x/m, y/m, z/m));
  }
  return g;
}
/* hanging folds in cloth below yTop, darker in the troughs */
function zFolds(g, n, amt, yTop, seed){
  const a = g.attributes.position, col = new Float32Array(a.count*3);
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i), ang = Math.atan2(x, z);
    const k = Math.max(0, Math.min(1, (yTop - y)/0.6)), w = Math.sin(ang*n + seed)*0.7 + Math.sin(ang*n*2.3 + seed*3.1)*0.3;
    const d = 1 + amt*k*w; a.setX(i, x*d); a.setZ(i, z*d);
    col[i*3] = col[i*3 + 1] = col[i*3 + 2] = 1 + 0.18*k*w - 0.1*k;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
/* the same cloth seen from inside (linings) */
function zInside(g){
  g = g.clone();
  const idx = g.index.array; for(let i=0;i<idx.length;i+=3){ const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const n = g.attributes.normal; for(let i=0;i<n.count;i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
}
const zDim = (c, k)=> new THREE.Color(c).multiplyScalar(k).getHex();
/* he stoops: the chest and head lean forward, the upper back humps */
const zLean = y=> y > 0.7 ? 0.3*(y - 0.7)*(y - 0.7) : 0;
const zHump = (y, z)=> z < 0 && y > 0.95 && y < 1.45 ? -0.05*Math.sin((y - 0.95)/0.5*PI)*Math.min(1, -z/0.15) : 0;
function zHunch(g){
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const y = a.getY(i), z = a.getZ(i); a.setZ(i, z + zLean(y) + zHump(y, z)); }
  return zSmooth(g);
}
/* a tube that tapers from r0 to r1 */
function zTaper(pts, r0, r1, seg, rs){
  const curve = new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(p[0], p[1], p[2])));
  seg = seg || 16; rs = rs || 8;
  const g = new THREE.TubeGeometry(curve, seg, 1, rs, false), a = g.attributes.position, c = new THREE.Vector3();
  for(let i=0;i<=seg;i++){
    curve.getPointAt(i/seg, c); const r = r0 + (r1 - r0)*Math.pow(i/seg, 0.8);
    for(let j=0;j<=rs;j++){ const k = i*(rs + 1) + j; a.setXYZ(k, c.x + (a.getX(k) - c.x)*r, c.y + (a.getY(k) - c.y)*r, c.z + (a.getZ(k) - c.z)*r); }
  }
  return zSmooth(g);
}
/* a part pointing its +y out along angle a (0 = his front), tipped up by `up` */
function zPoint(parent, geo, col, p, a, up, sx, sy, sz){
  const m = P(parent, geo, col, p[0], p[1], p[2]); m.rotation.order = "YXZ"; m.rotation.set(PI/2 - (up || 0), a, 0);
  if(sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); return m;
}
/* a part laid on a surface, its +z facing out along angle a */
function zFace(parent, geo, col, p, a, tilt, roll, sx, sy, sz){
  const m = P(parent, geo, col, p[0], p[1], p[2]); m.rotation.order = "YXZ"; m.rotation.set(-(tilt || 0), a, roll || 0);
  if(sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz); return m;
}
/* a chain of small links */
function zChain(parent, a, b, n, col, r){
  for(let i=0;i<n;i++){ const t = i/(n - 1); P(parent, zto(r || 0.018, (r || 0.018)*0.3), col || ZC.iron2, a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t, 0, i % 2 ? PI/2 : 0, 0); }
}
/* the long coat, outside (the costume pieces sit on it) */
const ZCOAT = [[0.4, 0.2], [0.37, 0.35], [0.33, 0.52], [0.285, 0.7], [0.262, 0.82], [0.27, 0.98], [0.285, 1.1], [0.27, 1.2], [0.19, 1.3], [0.12, 1.37]];
const ZMANT = [[0.37, 0.98], [0.355, 1.08], [0.31, 1.19], [0.2, 1.29], [0.12, 1.36]];
function zInterp(p, y){
  if(y <= p[0][1]) return p[0][0];
  for(let i=1;i<p.length;i++) if(y <= p[i][1]){ const t = (y - p[i-1][1])/(p[i][1] - p[i-1][1]); return p[i-1][0] + (p[i][0] - p[i-1][0])*t; }
  return p[p.length - 1][0];
}
const zRad = y=> y >= 0.98 ? zInterp(ZMANT, y) : zInterp(ZCOAT, y);
/* a point on him at angle a (0 = front, + = his left... no: + = toward +x), height y, `out` beyond the cloth */
function zSurf(a, y, out){ const r = zRad(y) + (out || 0), z = Math.cos(a)*r; return [Math.sin(a)*r, y, z + zLean(y) + zHump(y, z)]; }
/* his hood, as a turned shape with the face pressed in: a deep, dark cowl */
function zHoodGeo(){
  const g = zLathe([[0.245, -0.3], [0.232, -0.21], [0.214, -0.12], [0.205, -0.02], [0.2, 0.07], [0.17, 0.16], [0.1, 0.225], [0.001, 0.245]], 44, PI, PI*2, 4);
  const a = g.attributes.position, col = new Float32Array(a.count*3);
  for(let i=0;i<a.count;i++){
    let x = a.getX(i), y = a.getY(i), z = a.getZ(i)*1.08;
    const ang = Math.atan2(x, z), ey = (y + 0.04)/0.165, e = (ang/0.82)*(ang/0.82) + ey*ey;
    let k = 1, shade = 1;
    if(e < 1){ k = 1 - 0.72*Math.sqrt(1 - e); shade = 0.025 + 0.5*e*e*e; }
    else if(e < 1.7){ const q = (e - 1)/0.7; k = 1 + 0.09*Math.sin(q*PI); shade = 0.55 + 0.45*q; }
    x *= k; z *= k;
    if(e < 1.9 && y > -0.03 && Math.abs(ang) < 1.25) z += 0.035*Math.min(1, (1.9 - e)/0.9);   // the brim juts out over the face
    if(y < -0.08) z -= (-0.08 - y)*0.55;   // and the cowl falls back onto his stooped shoulders
    a.setXYZ(i, x, y, z); col[i*3] = col[i*3 + 1] = col[i*3 + 2] = shade;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return zSmooth(g);
}

Models.zippy = function(look){
  look = look || { robe:"arcane", cape:"arcane", parts:[], auras:[] };
  const has = p=> look.parts.indexOf(p) >= 0;
  const D = DYE[look.robe] || DYE.arcane, C = DYE[look.cape] || DYE.arcane;
  const R = rig("zippy"), b = R.body;
  R.look = look; R.anim = [];
  // the under-robe, seen where the coat hangs open
  const robe = zLathe([[0.34, 0.12], [0.31, 0.3], [0.25, 0.6], [0.235, 0.8], [0.245, 1.0], [0.25, 1.14], [0.18, 1.28], [0.1, 1.37], [0.001, 1.4]], 30, PI, PI*2, 3);
  zFolds(robe, 11, 0.06, 0.6, 1.1); K.tatter(robe, 0.24, 16, 0.1, 2.7);
  P(b, zHunch(robe), D.dark);
  // the long coat, open at the front, torn at the hem, lined darker
  const GAP = 0.75, coat = zLathe(ZCOAT, 38, GAP/2, PI*2 - GAP, 3);
  zFolds(coat, 9, 0.07, 0.75, 0.4); K.tatter(coat, 0.36, 22, 0.17, 5.1);
  zHunch(coat);
  P(b, coat, D.robe); P(b, zInside(coat), zDim(D.robe, 0.45));
  // its front edges, turned back, and clasps across the chest
  [-1, 1].forEach(s=>{
    const pts = []; for(let i=0;i<=10;i++){ const y = 0.24 + i*0.105; pts.push(zSurf(s*(GAP/2 + 0.04), y, 0.008)); }
    P(b, zTaper(pts, 0.022, 0.018, 24, 6), zDim(D.robe, 0.7));
  });
  [0.9, 1.0, 1.1].forEach((y, i)=>{ const l = zSurf(-0.42, y, 0.02), r = zSurf(0.42, y, 0.02); zChain(b, l, r, 4, ZC.brass, 0.014); P(b, zs(0.018), ZC.brass, l[0], y, l[2]); P(b, zs(0.018), ZC.brass, r[0], y, r[2]); });
  // runes stitched round the hem in the dye's thread
  for(let i=0;i<14;i++){
    const a = GAP/2 + 0.2 + i*(PI*2 - GAP - 0.4)/13, y = 0.46 + (i % 3)*0.025;
    const p = zSurf(a, y, 0.006);
    zFace(b, BX(0.012, 0.07, 0.006), D.stars, p, a, 0.1, (i % 2 ? 0.3 : -0.2));
    zFace(b, BX(0.04, 0.01, 0.006), D.stars, zSurf(a + 0.03, y + (i % 2 ? 0.02 : -0.015), 0.008), a, 0.1, (i % 3)*0.5);
  }
  // a ragged mantle over the shoulders (the cloak's dye)
  const mant = zLathe(ZMANT, 36, PI, PI*2, 3);
  zFolds(mant, 13, 0.06, 1.3, 2.2); K.tatter(mant, 1.06, 15, 0.12, 3.3);
  zHunch(mant); P(b, mant, C.cape);
  // the cloak down his back (the view keeps it moving)
  const capeG = group(b, 0, 1.31, 0.05); R.parts.cape = capeG;
  const cloak = zLathe([[0.18, 0.02], [0.27, -0.1], [0.33, -0.3], [0.37, -0.6], [0.41, -0.9], [0.45, -1.2]], 26, PI/2 + 0.3, PI - 0.6, 3);
  zFolds(cloak, 8, 0.09, -0.15, 0.9); K.tatter(cloak, -0.9, 11, 0.2, 7.7); zSmooth(cloak);
  P(capeG, cloak, C.cape); P(capeG, zInside(cloak), zDim(C.cape, 0.35));
  // belts: a broad one at the waist, a slung one at the hip, a strap across the chest
  P(b, CY(0.275, 0.272, 0.07, 30), ZC.leather, 0, 0.82, 0.004);
  P(b, BX(0.09, 0.08, 0.03), ZC.brass, 0.0, 0.82, 0.29); P(b, BX(0.05, 0.04, 0.032), ZC.iron, 0.0, 0.82, 0.295);
  P(b, CY(0.305, 0.3, 0.045, 30), ZC.leather2, 0, 0.7, 0.01, 0, 0, 0.12);
  for(let i=0;i<8;i++){ const a = -1.2 + i*0.35; const p = zSurf(a, 0.7 + Math.sin(a)*0.035, 0.02); P(b, zs(0.012), ZC.iron2, p[0], p[1], p[2]); }
  { const pts = [zSurf(-0.95, 1.2, 0.02), zSurf(-0.5, 1.12, 0.03), zSurf(0, 1.0, 0.035), zSurf(0.5, 0.88, 0.03), zSurf(1.0, 0.8, 0.025), zSurf(1.5, 0.76, 0.02)];
    P(b, zTaper(pts, 0.02, 0.02, 30, 6), ZC.leather);
    // little vials on it, one still glowing
    [[-0.25, 1.06], [0.25, 0.94]].forEach(([a, y], i)=>{ const p = zSurf(a, y, 0.06); P(b, CY(0.02, 0.022, 0.07, 10), 0x6a7a78, p[0], p[1], p[2]); P(b, CY(0.012, 0.012, 0.02, 8), ZC.wood, p[0], p[1] + 0.045, p[2]); if(i) glow(R, b, 0.017, D.light, p[0], p[1] - 0.01, p[2]); });
  }
  // the chained tome at his left hip
  { const g = group(b, -0.31, 0.62, 0.06); g.rotation.set(0.1, -1.2, 0.08); R.anim.push({ o:g, sway:0.06, speed:2.1 });
    P(g, BX(0.17, 0.22, 0.065), ZC.leather2);
    P(g, BX(0.155, 0.205, 0.055), ZC.parch, 0.012, 0, 0);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([x, y])=> P(g, BX(0.03, 0.03, 0.07), ZC.brass, x*0.075, y*0.1, 0));
    P(g, BX(0.03, 0.06, 0.075), ZC.iron2, 0.085, 0, 0); P(g, zto(0.025, 0.007), ZC.iron2, 0.1, 0, 0, 0, PI/2);
    P(g, OC(0.03), D.stars, 0, 0.0, 0.034, 0, 0, PI/4, 1, 1.4, 0.3);
    zChain(b, [-0.28, 0.79, 0.08], [-0.31, 0.73, 0.07], 3, ZC.iron2, 0.016);
  }
  // prayer beads at the front, ending in a little bone skull
  { const pts = []; for(let i=0;i<=16;i++){ const t = i/16, a = 0.35 + t*0.5; const p = zSurf(a, 0.79 - Math.sin(t*PI)*0.2, 0.03); pts.push(p); P(b, S(i % 4 ? 0.016 : 0.021, 8, 6), i % 4 ? 0x3a2a20 : ZC.bone, p[0], p[1], p[2]); }
    const top = pts[8]; for(let i=1;i<5;i++) P(b, zs(0.015), 0x3a2a20, top[0], top[1] - i*0.03, top[2] + 0.005);
    const sk = [top[0], top[1] - 0.17, top[2] + 0.01];
    P(b, zs(0.03), ZC.bone, sk[0], sk[1], sk[2], 0, 0, 0, 1, 1.05, 0.95);
    P(b, BX(0.035, 0.018, 0.03), ZC.bone, sk[0], sk[1] - 0.027, sk[2] + 0.004);
    [-1, 1].forEach(s=> P(b, zs(0.009), ZC.hole, sk[0] + s*0.012, sk[1] + 0.003, sk[2] + 0.026));
  }
  // paper talismans hung from the belt, sealed in old blood
  [[-1.6, 0.0], [-2.1, 0.3], [2.3, -0.2]].forEach(([a, r], i)=>{
    const p = zSurf(a, 0.66, 0.035), g = group(b, p[0], p[1], p[2]); g.rotation.set(0, a, r*0.3); R.anim.push({ o:g, sway:0.08, speed:2.6 + i*0.4 });
    P(g, BX(0.05, 0.17, 0.004), ZC.parch, 0, -0.08, 0);
    P(g, CY(0.016, 0.016, 0.006, 12), 0x6a1a14, 0, -0.04, 0.003, PI/2);
    [-0.09, -0.115, -0.14].forEach(y=> P(g, BX(0.03, 0.006, 0.006), 0x1a1410, 0, y, 0.003));
  });
  // one iron pauldron, layered and riveted, on the left shoulder
  { const g = group(b, -0.25, 1.25, 0.06); g.rotation.set(0.05, 0, 0.55);
    [[0.0, 0.15], [-0.05, 0.135], [-0.1, 0.12]].forEach(([y, r], i)=>{
      P(g, new THREE.SphereGeometry(r, 20, 7, 0, PI*2, 0, PI*0.42), i ? ZC.iron2 : ZC.iron, 0, y, 0, 0, 0, 0, 1, 0.75, 1.15);
      P(g, zto(r*Math.sin(PI*0.42), 0.008), i ? ZC.rust : ZC.brass, 0, y + r*0.75*Math.cos(PI*0.42), 0, PI/2, 0, 0, 1, 1.15, 1);
    });
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(g, zs(0.011), ZC.brass, Math.sin(a)*0.11, 0.06, Math.cos(a)*0.13); }
    P(g, BX(0.05, 0.02, 0.05), ZC.leather, 0, 0.12, 0);
  }
  // boots: iron-capped toes poking out from under the robe
  [-1, 1].forEach(s=>{
    P(b, S(0.07, 12, 8), ZC.leather2, s*0.1, 0.045, 0.2, 0, s*0.15, 0, 0.85, 0.6, 1.6);
    P(b, S(0.05, 10, 8), ZC.iron2, s*0.105, 0.04, 0.29, 0, s*0.15, 0, 0.8, 0.5, 0.9);
    P(b, CY(0.075, 0.07, 0.035, 14), ZC.leather, s*0.1, 0.1, 0.15);
  });
  // the head: a deep cowl, the face lost in it
  const head = group(b, 0, 1.5, 0.15); R.parts.head = head;
  const frogHood = has("froghood");
  const HOOD = frogHood ? 0x4e5230 : D.robe;
  const hood = zHoodGeo(); if(frogHood) K.sculpt(hood, 0.008, 22, 3);
  P(head, hood, HOOD);
    // a few creases and a patch where it tore
  [[-0.7, 0.05, 0.3], [0.9, -0.02, -0.4], [2.6, 0.1, 0.2]].forEach(([a, y, r])=> zFace(head, BX(0.006, 0.12, 0.012), zDim(HOOD, 0.6), [Math.sin(a)*0.205, y, Math.cos(a)*0.215], a, 0.2, r));
  zFace(head, BX(0.08, 0.07, 0.01), zDim(HOOD, 1.25), [Math.sin(-1.9)*0.205, 0.08, Math.cos(-1.9)*0.205], -1.9, 0.3, 0.2);
  for(let i=0;i<4;i++) zFace(head, BX(0.004, 0.022, 0.006), ZC.bone, [Math.sin(-1.9 + 0.2)*0.213, 0.05 + i*0.02, Math.cos(-1.9 + 0.2)*0.213], -1.7, 0.3, 0.6);
  // inside the dark: a gaunt face, mostly shadow
  const face = group(head, 0, -0.035, 0.035); R.parts.face = face;
  P(face, K.sculpt(new THREE.SphereGeometry(0.075, 20, 16), 0.006, 30, 2), ZC.flesh, 0, -0.01, 0.0, 0, 0, 0, 0.95, 1.2, 1);
  const veiled = has("goggles") || has("plaguemask") || has("lichmask");
  if(!has("lichmask") && !has("plaguemask")){
    // the cracked porcelain half-mask, over his left side
    P(face, new THREE.SphereGeometry(0.083, 24, 16, -0.1, PI/2 + 0.12, PI*0.24, PI*0.56), 0xb0a68c, 0, 0.0, 0.012, 0, 0, 0, 1, 1.2, 1);
    P(face, zs(0.02), ZC.hole, -0.033, 0.012, 0.082, 0, 0, 0, 1.2, 0.7, 0.5);
    [[0.0, -0.035, 0.4], [-0.02, -0.02, -0.5], [-0.05, 0.035, 0.9]].forEach(([x, y, r])=> P(face, BX(0.004, 0.045, 0.006), 0x3a3028, x - 0.01, y, Math.sqrt(Math.max(0, 0.0069 - x*x - y*y/1.44)) + 0.014, 0, -x*6, r));
    P(face, BX(0.01, 0.045, 0.012), 0xb0a68c, -0.004, -0.01, 0.092, 0.25);
  }
  if(!veiled){
    // two pinpricks of light, in the dye's colour
    [-1, 1].forEach(s=>{ glow(R, face, s < 0 ? 0.015 : 0.012, D.light, s*0.033, 0.012, 0.085); });
    halo(R, face, D.light, 0.22, 0, 0.012, 0.09, 0.5);
  }
  // the beard: long grey strands spilling out of the hood
  const beard = group(head, 0, -0.1, 0.06); R.parts.beard = beard;
  for(let i=0;i<13;i++){
    const u = (i - 6)/6, x0 = u*0.05, len = 0.3 + (1 - Math.abs(u))*0.28 + ((i*7) % 5)*0.035, w = ((i*5) % 3 - 1)*0.022, w2 = ((i*3) % 4 - 1.5)*0.015;
    const pts = [[x0*0.8, 0.03, 0.0], [x0*1.2, -0.07, 0.12], [x0*1.5 + w, -0.17, 0.19], [x0*1.4 - w2, -0.3, 0.21], [x0*1.2 + w2, -len*0.78, 0.2 + w*0.5], [x0*1.0 - w, -len, 0.16 + w2]];
    P(beard, zTaper(pts, 0.015 - Math.abs(u)*0.004, 0.002, 18, 5), [0x5e5a54, 0x4a4742, 0x76726a][i % 3]);
  }
  // a matted mass behind the loose strands
  { const m = zTaper([[0, 0.02, 0.02], [0, -0.12, 0.15], [0, -0.28, 0.19], [0, -0.44, 0.17]], 0.055, 0.012, 16, 10); K.sculpt(m, 0.006, 40, 3); P(beard, m, 0x4e4a44, 0, 0, 0, 0, 0, 0, 1.25, 1, 0.7); }
  P(beard, zto(0.025, 0.009), ZC.brass, 0, -0.44, 0.235, PI/2 - 0.3);
  P(beard, zto(0.022, 0.008), ZC.iron2, 0.035, -0.32, 0.245, PI/2 - 0.2);
  // the peak of the hood, standing up and then giving up, the way the hat did
  const hat = group(head, 0, 0.19, -0.03); hat.rotation.x = -0.3; R.parts.hat = hat;
  let tip;
  if(frogHood){
    // a toad's skin, worn: warts, heavy-lidded eyes on top, a wide sour mouth over his face
    for(let i=0;i<22;i++){ const a = i*2.4, y = -0.15 + (i*0.37 % 0.38); const r = zInterp([[0.25, -0.2], [0.215, -0.12], [0.205, -0.02], [0.2, 0.07], [0.17, 0.16], [0.1, 0.225]], y);
      if(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.9 && y < 0.12) continue;
      P(head, K.lump(0.022 + (i % 3)*0.006, 1, 0.3, i), 0x5e5a34, Math.sin(a)*r, y, Math.cos(a)*r*1.08); }
    [-1, 1].forEach(s=>{
      P(head, K.sculpt(new THREE.SphereGeometry(0.07, 16, 12), 0.006, 25, s), 0x4e5230, s*0.1, 0.19, 0.08);
      glow(R, head, 0.04, 0xb8862a, s*0.1, 0.2, 0.115);
      P(head, BX(0.01, 0.05, 0.01), ZC.hole, s*0.1, 0.2, 0.152);
      P(head, new THREE.SphereGeometry(0.058, 16, 8, 0, PI*2, 0, PI*0.5), 0x3e4226, s*0.1, 0.205, 0.105, 0.75);
    });
    const pts = []; for(let i=0;i<=12;i++){ const q = -1.05 + i/12*2.1; pts.push([Math.sin(q)*0.225, 0.12 - Math.pow(q/1.05, 2)*0.05, Math.cos(q)*0.23 + 0.03]); }
    P(head, K.tube(pts, 0.012, 24, 6), 0x1e1a10);
    tip = group(hat, 0, 0.1, 0);
  } else if(has("tophat")){
    P(hat, zTaper([[0, -0.08, 0], [0, 0.06, -0.01], [0, 0.18, 0]], 0.13, 0.1, 10, 16), D.robe);
    tip = group(hat, 0, 0.62, 0);
  } else {
    P(hat, zTaper([[0, -0.1, 0.015], [0, 0.04, -0.005], [0.005, 0.17, -0.025], [0, 0.3, -0.02]], 0.15, 0.068, 18, 18), D.robe);
    P(hat, zto(0.12, 0.016), D.dark, 0, 0.03, 0, PI/2 + 0.08);
    let up = group(hat, 0, 0.29, -0.02);
    if(has("tallhat")){
      const tx = group(up, 0, 0, 0); tx.rotation.z = 0.25;
      P(tx, zTaper([[0, -0.02, 0], [0, 0.12, 0.01], [0, 0.26, 0]], 0.072, 0.06, 10, 14), D.robe);
      P(tx, zto(0.066, 0.014), ZC.brass, 0, 0.03, 0, PI/2);
      up = group(tx, 0, 0.25, 0);
    }
    const t2 = group(up, 0, 0, 0); t2.rotation.z = -0.5; R.parts.tip = t2;
    P(t2, zTaper([[0, -0.03, 0], [0.0, 0.1, 0.01], [0.02, 0.2, 0.05], [0.06, 0.25, 0.1], [0.1, 0.24, 0.14]], 0.072, 0.01, 22, 12), D.robe);
    P(t2, zto(0.06, 0.012), D.dark, 0, 0.06, 0.004, PI/2);
    if(!has("flamehat") && !has("voidtip") && !has("discoball") && !has("bombtip")){
      // a pilgrim's charm hung from the point: a little iron cage with a candle stub in it
      const lg = group(t2, 0.1, 0.22, 0.15); R.anim.push({ o:lg, sway:0.15, speed:3.1 });
      P(lg, zcy(0.003, 0.003, 0.06, 5), 0x2a2420, 0, -0.03, 0);
      P(lg, CY(0.018, 0.022, 0.006, 10), ZC.iron2, 0, -0.065, 0); P(lg, CY(0.022, 0.018, 0.006, 10), ZC.iron2, 0, -0.115, 0);
      for(let i=0;i<4;i++){ const a = i/4*PI*2 + 0.4; P(lg, zcy(0.003, 0.003, 0.05, 5), ZC.iron2, Math.cos(a)*0.02, -0.09, Math.sin(a)*0.02); }
      P(lg, zcy(0.008, 0.009, 0.02, 5), ZC.wax, 0, -0.103, 0);
      const f = glow(R, lg, 0.009, ZC.ember, 0, -0.088, 0); R.anim.push({ o:f, flicker:0.3 });
      halo(R, lg, ZC.ember, 0.35, 0, -0.09, 0, 0.55);
    }
    tip = t2;
  }
  // long sleeves, gaunt gloved hands; the right one holds the gun
  const HY = -0.6;
  const arm = (s)=>{
    const a = group(b, s*0.27, 1.22, 0.075);
    const sl = zLathe([[0.07, 0.03], [0.083, -0.12], [0.092, -0.3], [0.115, -0.45], [0.15, -0.55]], 20, 0, PI*2, 3);
    zFolds(sl, 5, 0.08, -0.25, s); K.tatter(sl, -0.47, 9, 0.07, 4 + s); zSmooth(sl);
    P(a, sl, D.robe);
    P(a, CY(0.105, 0.105, 0.01, 16), ZC.hole, 0, -0.5, 0);
    P(a, CY(0.086, 0.086, 0.04, 18), ZC.leather, 0, -0.27, 0);
    // the hand: a leather glove worn thin, long fingers, nails like claws
    P(a, CY(0.033, 0.04, 0.09, 12), ZC.glove, 0, -0.55, 0);
    P(a, zs(0.046), ZC.glove, 0, -0.615, 0.005, 0, 0, 0, 0.85, 1.15, 0.6);
    const hg = group(a, 0, HY, 0); hg.rotation.x = 1.1;
    for(let f=0;f<4;f++){
      const x = (f - 1.5)*0.021*s, l = f === 0 || f === 3 ? 0.85 : 1;
      const pts = [[x, 0.0, 0.03], [x*1.1, -0.035*l, 0.06*l], [x*1.1, -0.08*l, 0.05*l], [x, -0.1*l, 0.015]];
      P(hg, zTaper(pts, 0.012, 0.007, 10, 6), ZC.glove);
      P(hg, CO(0.007, 0.025, 6), 0x3a3228, pts[3][0], pts[3][1] - 0.008, pts[3][2] - 0.005, PI*0.9);
    }
    P(hg, zTaper([[s*0.035, -0.0, 0.0], [s*0.05, -0.03, 0.04], [s*0.035, -0.06, 0.07]], 0.013, 0.008, 8, 6), ZC.glove);
    a.rotation.x = -1.1;
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1); R.parts.armL.rotation.z = -0.3; R.parts.armL.position.x = -0.27;
  // a ring of beads round the left wrist
  for(let i=0;i<10;i++){ const a = i/10*PI*2; P(R.parts.armL, zs(0.011), i % 3 ? 0x3a2a20 : ZC.bone, Math.cos(a)*0.044, -0.575, Math.sin(a)*0.044); }
  const gunHolder = group(R.parts.armR, 0, HY, 0.02); gunHolder.rotation.x = 1.1; R.parts.gun = gunHolder;
  // the costume pieces (R.anim: the bits the view keeps moving)
  const ctx = { R, b, head, hat, tip, beard, cape:capeG, armL:R.parts.armL, armR:R.parts.armR, D, C, face, surf:zSurf, HY };
  look.parts.forEach(p=>{ if(OUTFIT[p]) OUTFIT[p](ctx); });
  R.h = 2.1;
  finish(R);
  return R;
};
Models.wizard = Models.zippy;

/* ---- costume pieces: each adds parts to the right bit of Zippy ----
   b: the body, y up from the floor, +z his front (c.surf(a, y, out) finds a
   point on his coat: a = 0 front, PI/2 his left side (+x); belt at y 0.82).
   head: the hood, centre at body (0, 1.5, 0.15), outside radius ~0.21, the
   face recessed at z ~0.1. hat: the base of the hood's peak; tip: its end.
   arms hang from the shoulder, hands at y c.HY. Everything here is worn,
   faded or grim; the funny things stay funny, just a bit wrong. */
const OUTFIT = {
  vines(c){
    // dead brambles wound round him, hem to shoulders, thorny, with a few withered leaves
    const pts = []; for(let i=0;i<=56;i++){ const t = i/56; pts.push(c.surf(t*PI*5 + 0.6, 0.3 + t*0.98, 0.03)); }
    P(c.b, K.tube(pts, 0.015, 110, 6), 0x2e2a1e);
    pts.forEach((p, i)=>{ if(i % 2) return; const a = i*0.28 + 0.6; zPoint(c.b, CO(0.008, 0.045, 6), 0x5a5444, p, a + (i % 4 ? 0.6 : -0.6), 0.4); });
    for(let i=3;i<56;i+=5){ const a = (i/56)*PI*5 + 0.6, p = c.surf(a + 0.05, 0.3 + i/56*0.98 + 0.02, 0.05); zFace(c.b, zs(0.04), [0x4a4a2a, 0x5a4a2e, 0x3e3a26][i % 3], p, a, 0.3, i, 0.45, 1, 0.2); }
  },
  flowers(c){
    // dead blossoms, pale and papery, pinned to him
    [[0.5, 0.42], [2.6, 0.6], [-1.2, 0.9], [4.1, 0.5], [-2.8, 0.36]].forEach(([a, y], i)=>{
      const col = [0xc8b8b0, 0x8a6a7a, 0xb8a890][i % 3], p = c.surf(a, y, 0.03);
      for(let k=0;k<6;k++){ const q = k/6*PI*2; zFace(c.b, zs(0.03), zDim(col, 0.85 + (k % 2)*0.2), [p[0] + Math.cos(q)*0.035*Math.cos(a), p[1] + Math.sin(q)*0.035, p[2] - Math.cos(q)*0.035*Math.sin(a)], a, 0, q, 0.6, 1.1, 0.3); }
      P(c.b, zs(0.018), 0x2a1e14, p[0]*1.04, p[1], p[2] + 0.01*Math.cos(a));
      P(c.b, zcy(0.004, 0.004, 0.12, 5), 0x3a3424, p[0], p[1] - 0.06, p[2], 0, 0, 0.3);
    });
  },
  goggles(c){
    // brass-and-leather lenses, the glass glowing faint red in the dark of the hood
    [-1, 1].forEach(s=>{
      P(c.face, CY(0.032, 0.036, 0.07, 14), ZC.brass, s*0.036, 0.015, 0.1, PI/2);
      P(c.face, zto(0.034, 0.007), 0x5a4a2a, s*0.036, 0.015, 0.137);
      glow(c.R, c.face, 0.025, 0xc83a2a, s*0.036, 0.015, 0.13);
    });
    P(c.face, BX(0.03, 0.014, 0.014), ZC.brass, 0, 0.018, 0.12);
    P(c.head, zto(0.212, 0.016), ZC.leather, 0, 0.02, 0.0, PI/2 - 0.08, 0, 0, 1, 1.08, 1);
    halo(c.R, c.face, 0xc83a2a, 0.3, 0, 0.015, 0.14, 0.4);
  },
  monocle(c){
    P(c.face, zto(0.028, 0.006), ZC.brass, 0.034, 0.014, 0.095);
    glow(c.R, c.face, 0.022, 0xc8e0e8, 0.034, 0.014, 0.09);
    P(c.b, K.tube([[0.08, 1.4, 0.32], [0.1, 1.25, 0.38], [0.06, 1.12, 0.4]], 0.004, 12, 4), ZC.brass);
  },
  wingboots(c){
    // black feathers at the heels, like a crow's
    [-1, 1].forEach(s=>{ for(let k=0;k<4;k++) P(c.b, zTaper([[0, 0, 0], [s*0.03, 0.04 + k*0.02, -0.05], [s*0.05, 0.08 + k*0.03, -0.12 + k*0.02]], 0.022, 0.003, 8, 6), k % 2 ? 0x2a2628 : 0x1e1c22, s*(0.16 + k*0.01), 0.08, 0.14 - k*0.025); });
  },
  stripysocks(c){
    // striped leg-wraps, faded red and dirty bone
    [-1, 1].forEach(s=>{ for(let k=0;k<4;k++) P(c.b, CY(0.062 - k*0.002, 0.065 - k*0.002, 0.026, 14), k % 2 ? 0xa89a78 : 0x5a2018, s*0.1, 0.08 + k*0.026, 0.19 - k*0.012); });
  },
  mudboots(c){ [-1, 1].forEach(s=>{ P(c.b, K.lump(0.09, 2, 0.35, 3 + s), 0x2e2416, s*0.11, 0.05, 0.22, 0, 0, 0, 1, 0.6, 1.4); P(c.b, K.lump(0.035, 1, 0.4, 5 + s), 0x4a3e26, s*0.15, 0.1, 0.27); }); },
  tallhat(c){ /* built into the hood's peak */ },
  spikyhat(c){
    // a circlet of rusted spikes round the hood
    P(c.head, zto(0.205, 0.014), ZC.iron, 0, 0.1, -0.01, PI/2 - 0.12, 0, 0, 1, 1.08, 1);
    for(let i=0;i<9;i++){ const a = PI + (i - 4)*0.42; zPoint(c.head, CO(0.018, 0.11 + (i % 2)*0.04, 6), i % 3 ? ZC.rust : ZC.iron2, [Math.sin(a)*0.2, 0.1 - Math.cos(a)*0.02, Math.cos(a)*0.21], a, 0.9); }
  },
  flamehat(c){ for(let i=0;i<4;i++){ const a = i*1.7; const f = glow(c.R, c.tip, 0.05 - i*0.009, [0xffd24a, 0xff9a2e, 0xff5a1a, 0xc82a10][i], 0.08 + Math.cos(a)*0.02, 0.25 + i*0.06, 0.12 + Math.sin(a)*0.02); c.R.anim.push({ o:f, flicker:0.35 }); } P(c.tip, CY(0.03, 0.04, 0.05, 10), ZC.iron, 0.09, 0.23, 0.13); halo(c.R, c.tip, 0xff6a1a, 1.0, 0.08, 0.32, 0.12, 0.7); },
  icecrown(c){ for(let i=0;i<8;i++){ const a = i/8*PI*2; zPoint(c.head, CO(0.022, 0.14 + (i % 2)*0.09, 6), i % 2 ? 0x9ab8c8 : 0x7a98aa, [Math.sin(a)*0.15, 0.17, Math.cos(a)*0.16], a, 1.2); } halo(c.R, c.head, 0x8ad8ff, 0.8, 0, 0.26, 0, 0.35); },
  stormcloud(c){
    const g = group(c.head, 0, 0.78, -0.08); c.R.anim.push({ o:g, bob:0.04, speed:1.3 });
    [[0, 0, 0, 0.15], [0.15, -0.02, 0.02, 0.11], [-0.15, -0.02, 0.02, 0.12], [0.05, 0.08, -0.05, 0.11], [-0.07, -0.05, 0.08, 0.09]].forEach(([x, y, z, r], i)=> P(g, K.lump(r, 2, 0.15, i), i % 2 ? 0x3a3a42 : 0x4a4a52, x, y, z, 0, 0, 0, 1, 0.7, 1));
    const bolt = [[0.02, -0.12, 0.05], [-0.03, -0.2, 0.06], [0.02, -0.26, 0.06], [-0.02, -0.34, 0.06]];
    bolt.forEach(([x, y, z], i)=>{ const f = glow(c.R, g, 0.02 - i*0.003, 0xfff04a, x, y, z); c.R.anim.push({ o:f, flicker:0.9 }); });
  },
  plaguemask(c){
    // a leather beak out of the hood, brass-rimmed lenses glowing sick green
    P(c.face, K.lathe([[0.0, 0.0], [0.05, 0.02], [0.055, 0.08], [0.035, 0.16], [0.012, 0.24], [0.0, 0.26]], 14), 0x3a2c1e, 0, -0.04, 0.08, PI/2 + 0.45);
    P(c.face, S(0.07, 14, 10), 0x3a2c1e, 0, 0.0, 0.05, 0, 0, 0, 1, 1.05, 0.9);
    [-1, 1].forEach(s=>{ P(c.face, CY(0.028, 0.028, 0.02, 12), ZC.brass, s*0.033, 0.018, 0.11, PI/2); glow(c.R, c.face, 0.022, 0x9cff3a, s*0.033, 0.018, 0.118); });
    [0.06, 0.12].forEach(z=> P(c.face, zto(0.04 - z*0.15, 0.006), ZC.brass, 0, -0.04 - z*0.4, 0.1 + z*0.85, 0.45));
    halo(c.R, c.face, 0x9cff3a, 0.3, 0, 0.018, 0.13, 0.35);
  },
  chicken(c){
    // a scrawny, half-plucked rooster has made his hood its roost
    const g = group(c.head, 0.12, 0.22, -0.04); g.rotation.set(0.1, 0.7, -0.2);
    P(g, S(0.055, 10, 8), 0xa89e8a, 0, 0, 0, 0, 0, 0, 1, 1, 1.5); P(g, zs(0.03), 0x8a7a68, 0, 0.065, 0.075, 0, 0, 0, 1, 1.4, 1);
    P(g, CO(0.012, 0.04, 6), 0x8a6a2a, 0, 0.07, 0.11, PI/2); P(g, BX(0.008, 0.035, 0.04), 0x6a1a14, 0, 0.11, 0.07);
    glow(c.R, g, 0.006, 0xff4a2a, 0.022, 0.08, 0.09);
    for(let i=0;i<3;i++) P(g, zTaper([[0, 0, -0.06], [0, 0.04 + i*0.02, -0.12], [0, 0.08 + i*0.02, -0.12]], 0.012, 0.002, 6, 5), 0x3a3430, (i - 1)*0.02, 0, 0);
    [-1, 1].forEach(s=> P(g, zcy(0.004, 0.004, 0.06, 5), 0x8a6a2a, s*0.02, -0.06, 0));
  },
  hive(c){
    // a wasps' nest on his back: grey paper, a dark hole, a few things moving in it
    const g = group(c.b, 0, 0.92, -0.42);
    P(g, K.sculpt(new THREE.SphereGeometry(0.15, 20, 16), 0.012, 18, 1), 0x8a7a5a, 0, 0, 0, 0, 0, 0, 1, 1.3, 0.9);
    [-0.1, -0.03, 0.04, 0.11].forEach(y=> P(g, zto(0.15*Math.sqrt(1 - (y/0.2)*(y/0.2)) + 0.004, 0.008), 0x6a5a40, 0, y, 0, PI/2, 0, 0, 1, 0.9, 1));
    P(g, zs(0.035), ZC.hole, 0, -0.08, -0.13);
    P(c.b, zto(0.3, 0.012, PI), ZC.leather, 0, 1.0, -0.05, PI/2 - 0.2, 0, PI);
    [[0.18, 0.1, -0.08], [-0.16, 0.2, -0.02]].forEach(([x, y, z])=>{ const f = glow(c.R, g, 0.012, 0xc89a2a, x, y, z); c.R.anim.push({ o:f, flicker:0.5 }); });
  },
  accordion(c){
    // a worn squeezebox on his back, bellows yellowed, the red gone to rust
    const g = group(c.b, 0, 0.98, -0.4); g.rotation.x = 0.15;
    for(let i=0;i<7;i++) P(g, BX(0.34, 0.035, 0.11 - (i % 2)*0.025), i % 2 ? 0x9a8a68 : 0x5a2a20, 0, -0.12 + i*0.04, 0);
    [-1, 1].forEach(s=>{ P(g, BX(0.36, 0.04, 0.13), 0x1e1a18, 0, s*0.16, 0); P(g, BX(0.06, 0.02, 0.135), ZC.brass, s*0.13, s*0.16, 0); });
    for(let i=0;i<4;i++) P(g, zs(0.01), ZC.ivory, -0.1 + i*0.06, 0.18, 0.06);
  },
  dice(c){
    // bone dice on cords
    [[-0.5, 0.0], [-0.3, 0.6]].forEach(([a, r], i)=>{
      const p = c.surf(a, 0.66 - i*0.04, 0.04); P(c.b, zcy(0.003, 0.003, 0.12, 5), 0x2a1e14, p[0], p[1] + 0.07, p[2]);
      P(c.b, BX(0.06, 0.06, 0.06), 0xd0c4a4, p[0], p[1], p[2], r, r + 0.3, 0.2);
      [[0, 0, 0.031], [0.015, 0.015, 0.031], [-0.015, -0.015, 0.031]].forEach(([x, y, z])=> P(c.b, zs(0.007), 0x1a1410, p[0] + x, p[1] + y, p[2] + z));
    });
  },
  penny(c){ P(c.head, CY(0.035, 0.035, 0.008, 16), 0x6a5a3a, -0.08, 0.13, 0.18, PI/2 - 0.75, -0.35); P(c.head, CY(0.026, 0.026, 0.009, 14), 0x4a6a58, -0.081, 0.132, 0.183, PI/2 - 0.75, -0.35); },
  gear(c){
    // a brass cog over his heart, a cold light in its hub
    const p = c.surf(0.25, 1.05, 0.03), g = group(c.b, p[0], p[1], p[2]); g.rotation.set(-0.35, 0.25, 0);
    P(g, zto(0.055, 0.016), ZC.brass); for(let i=0;i<8;i++){ const a = i/8*PI*2; P(g, BX(0.025, 0.025, 0.02), ZC.brass, Math.cos(a)*0.073, Math.sin(a)*0.073, 0, 0, 0, a); }
    for(let i=0;i<3;i++){ const a = i/3*PI*2; P(g, BX(0.008, 0.05, 0.008), ZC.iron2, Math.cos(a)*0.025, Math.sin(a)*0.025, 0, 0, 0, a + PI/2); }
    glow(c.R, g, 0.018, 0x8ad8ff, 0, 0, 0.01);
  },
  ghostpal(c){
    // a little shroud of a ghost keeps him company, hollow-eyed
    const g = group(c.b, 0.45, 1.65, -0.25); c.R.anim.push({ o:g, bob:0.1, speed:2.3 });
    const sh = zLathe([[0.001, 0.36], [0.08, 0.33], [0.13, 0.25], [0.15, 0.12], [0.17, 0.0], [0.2, -0.04]], 28);
    zFolds(sh, 7, 0.1, 0.15, 1); K.tatter(sh, 0.06, 8, 0.12, 2); zSmooth(sh);
    P(g, sh, 0xc8ccc4); P(g, zInside(sh), 0x5a5e5a);
    [-1, 1].forEach(s=> P(g, zs(0.024), ZC.hole, s*0.045, 0.24, 0.12, 0, 0, 0, 1, 1.5, 0.6));
    P(g, zs(0.018), ZC.hole, 0, 0.16, 0.13, 0, 0, 0, 1, 1.6, 0.6);
    halo(c.R, g, 0x9ac8b8, 0.6, 0, 0.18, 0, 0.3);
  },
  discoball(c){
    P(c.tip, zcy(0.003, 0.003, 0.12, 5), ZC.iron2, 0.1, 0.18, 0.14);
    const g = group(c.tip, 0.1, 0.08, 0.14); c.R.anim.push({ o:g, spin:3 });
    P(g, new THREE.IcosahedronGeometry(0.065, 1), 0x7a7a80);
    [[0.04, 0.03, 0.04], [-0.04, -0.02, 0.04], [0.0, 0.04, -0.05]].forEach(([x, y, z])=> glow(c.R, g, 0.014, 0xe8e0d0, x, y, z));
    halo(c.R, c.tip, 0xc86ab8, 0.5, 0.1, 0.08, 0.14, 0.4);
  },
  gum(c){ P(c.face, S(0.06, 14, 10), 0xa86a80, 0, -0.045, 0.12); glow(c.R, c.face, 0.008, 0xffd0e0, 0.02, -0.025, 0.175); },
  napkin(c){
    // a stained bib tucked under the beard
    const p = c.surf(0, 1.12, 0.02);
    P(c.b, CO(0.13, 0.22, 3), 0xb0a488, p[0], p[1] - 0.06, p[2] + 0.02, PI + 0.25, 0, 0, 1, 1, 0.25);
    [[0.03, -0.05], [-0.04, -0.1]].forEach(([x, y])=> P(c.b, zs(0.025), 0x5a3a22, p[0] + x, p[1] + y, p[2] + 0.04, 0, 0, 0, 1, 0.8, 0.3));
  },
  noodles(c){ for(let i=0;i<5;i++) P(c.beard, K.tube([[-0.06 + i*0.03, -0.12, 0.23], [-0.04 + i*0.02, -0.25, 0.27], [-0.07 + i*0.035, -0.4, 0.25]], 0.006, 10, 4), 0xc0b070); P(c.beard, K.lump(0.03, 1, 0.3, 4), 0x5a2a1a, 0.02, -0.28, 0.27); },
  pinatastick(c){
    // a beating stick on his back, still tied with faded ribbons
    const g = group(c.b, -0.15, 0.95, -0.4); g.rotation.z = 0.55;
    P(g, CY(0.022, 0.026, 0.8, 10), ZC.wood, 0, 0, 0);
    [0xa84a5a, 0x4a8a9a, 0xb89a3a, 0x7a8a4a].forEach((col, i)=> P(g, zTaper([[0, 0.3 - i*0.03, 0.02], [0.03, 0.22 - i*0.03, 0.05], [0.0, 0.12 - i*0.04, 0.06]], 0.012, 0.004, 8, 4), zDim(col, 0.7)));
  },
  teapot(c){
    // a dented pewter teapot at his hip
    const p = c.surf(-1.9, 0.6, 0.06), g = group(c.b, p[0], p[1], p[2]);
    P(g, K.sculpt(new THREE.SphereGeometry(0.07, 16, 12), 0.006, 20, 1), 0x6a6a64, 0, 0, 0, 0, 0, 0, 1, 0.8, 1);
    P(g, zTaper([[0.06, -0.01, 0], [0.1, 0.02, 0], [0.12, 0.06, 0]], 0.016, 0.01, 8, 6), 0x6a6a64);
    P(g, zto(0.035, 0.009, PI), 0x5a5a54, -0.07, 0.0, 0, 0, 0, PI/2);
    P(g, zs(0.02), 0x3a3a36, 0, 0.06, 0);
  },
  heartjar(c){
    // a jar of murky glass, a heart beating in it
    const p = c.surf(1.65, 0.62, 0.06);
    P(c.b, CY(0.05, 0.05, 0.11, 14), 0x5a6a68, p[0], p[1], p[2]); P(c.b, CY(0.055, 0.055, 0.025, 14), ZC.rust, p[0], p[1] + 0.065, p[2]);
    const f = glow(c.R, c.b, 0.03, 0xc8202a, p[0], p[1], p[2]); c.R.anim.push({ o:f, flicker:0.2 });
  },
  lunchbox(c){ const p = c.surf(2.1, 0.6, 0.05); P(c.b, BX(0.15, 0.11, 0.07), 0x4a1e1a, p[0], p[1], p[2], 0, 2.1); P(c.b, zto(0.035, 0.008, PI), ZC.iron2, p[0], p[1] + 0.055, p[2], 0, 2.1); [-1, 1].forEach(s=> P(c.b, zs(0.008), ZC.iron2, p[0] + s*0.05, p[1] + 0.04, p[2] + 0.02)); },
  coinpouch(c){
    // a fat leather purse, a few tarnished coins spilled on its flap
    const p = c.surf(-0.9, 0.62, 0.06);
    P(c.b, K.sculpt(new THREE.SphereGeometry(0.07, 14, 12), 0.008, 20, 2), 0x4a3420, p[0], p[1], p[2], 0, 0, 0, 1, 1.2, 0.9);
    P(c.b, zto(0.03, 0.01), ZC.leather2, p[0], p[1] + 0.08, p[2], PI/2);
    [[0.03, -0.05], [-0.02, -0.07]].forEach(([x, y])=> P(c.b, CY(0.022, 0.022, 0.006, 12), 0x9a7a3a, p[0] + x, p[1] + y, p[2] + 0.05, 0.9));
  },
  clover(c){ for(let i=0;i<4;i++){ const a = i/4*PI*2 + PI/4; P(c.head, zs(0.022), 0x4a5a32, 0.12 + Math.cos(a)*0.022, 0.12 + Math.sin(a)*0.022, 0.16, 0, 0, 0, 1, 1, 0.4); } P(c.head, zcy(0.004, 0.004, 0.05, 5), 0x3a3a22, 0.12, 0.09, 0.16, 0, 0, 0.3); },
  muscles(c){ [c.armL, c.armR].forEach(a=>{ P(a, K.sculpt(new THREE.SphereGeometry(0.11, 16, 12), 0.01, 18, 1), zDim(c.D.robe, 0.9), 0, -0.18, 0.02, 0, 0, 0, 1, 1.5, 1); P(a, CY(0.1, 0.1, 0.03, 14), 0xb0a488, 0, -0.08, 0.02); }); },
  cracks(c){
    // glass cannon: he's started to crack, and something cold shows through
    [[-0.2, 1.18, 0.2, 0.4], [-0.24, 1.08, 0.25, -0.3], [-0.15, 1.24, 0.15, 1]].forEach(([x, y, z, r], i)=>{ const m = new THREE.Mesh(BX(0.008, 0.12 + i*0.03, 0.01), new THREE.MeshBasicMaterial({ color:0x9ad8ff, transparent:true })); m.position.set(x, y, z + 0.12); m.rotation.set(0, -0.6, r); c.b.add(m); c.R.glows.push(m); });
    [[-0.3, 1.32, -0.02], [-0.34, 1.27, 0.06]].forEach(([x, y, z], i)=> P(c.b, CO(0.03, 0.12 + i*0.04, 5), 0x9ab8c8, x, y, z, 0.2*i, 0, 0.5 - i*0.2));
  },
  bombbelt(c){ for(let i=0;i<4;i++){ const a = 2.2 + i*0.45, p = c.surf(a, 0.74, 0.04); P(c.b, K.sculpt(new THREE.SphereGeometry(0.045, 12, 10), 0.003, 30, i), 0x1a1a1e, p[0], p[1], p[2]); P(c.b, CY(0.015, 0.015, 0.015, 8), ZC.iron2, p[0], p[1] + 0.045, p[2]); P(c.b, zTaper([[0, 0, 0], [0.01, 0.03, 0], [0.025, 0.04, 0]], 0.004, 0.003, 4, 4), 0x6a5a3a, p[0], p[1] + 0.05, p[2]); } },
  starcape(c){
    // a constellation sewn into the cloak in thread that still glimmers
    for(let i=0;i<9;i++){ const a = PI*0.62 + i*0.09*PI, y = -0.25 - (i % 4)*0.2, rr = 0.33 + (-y)*0.1 + 0.012; const m = glow(c.R, c.cape, 0.012 + (i % 3)*0.004, 0xd8d0a8, Math.sin(a)*rr, y, Math.cos(a)*rr); c.R.anim.push({ o:m, flicker:0.4 }); }
    for(let i=0;i<5;i++){ const a = PI*0.7 + i*0.14*PI, y = -0.4 - (i % 2)*0.25, rr = 0.33 + (-y)*0.1 + 0.01; zFace(c.cape, BX(0.12, 0.004, 0.004), 0x8a8060, [Math.sin(a)*rr, y, Math.cos(a)*rr], a, 0, (i % 2 ? 0.6 : -0.5)); }
  },
  portalcuffs(c){
    [[c.armR, 0x46b4d8], [c.armL, 0xd88a2e]].forEach(([a, col])=>{ P(a, CY(0.1, 0.1, 0.04, 18), ZC.iron, 0, -0.42, 0); const m = new THREE.Mesh(zto(0.105, 0.008), new THREE.MeshBasicMaterial({ color:col, transparent:true })); m.position.y = -0.42; m.rotation.x = PI/2; a.add(m); c.R.glows.push(m); });
  },
  antenna(c){ [-1, 1].forEach(s=>{ P(c.head, zTaper([[s*0.12, 0.1, -0.02], [s*0.2, 0.25, -0.03], [s*0.22, 0.38, 0.02], [s*0.28, 0.45, 0.04]], 0.012, 0.005, 12, 6), ZC.iron2); P(c.head, zTaper([[s*0.21, 0.3, -0.01], [s*0.28, 0.33, 0.0]], 0.006, 0.003, 4, 5), ZC.iron2); const f = glow(c.R, c.head, 0.02, 0x9cff3a, s*0.28, 0.46, 0.04); c.R.anim.push({ o:f, flicker:0.3 }); }); },
  halo(c){
    // a halo gone to rust and thorns, still faintly lit
    const g = group(c.head, 0, 0.6, -0.04); c.R.anim.push({ o:g, bob:0.04, speed:2 });
    P(g, zto(0.22, 0.012), ZC.rust, 0, 0, 0, PI/2);
    for(let i=0;i<12;i++){ const a = i/12*PI*2; zPoint(g, CO(0.01, 0.06, 5), ZC.iron2, [Math.sin(a)*0.22, 0, Math.cos(a)*0.22], a, 0.6 + (i % 2)*0.4); }
    const m = new THREE.Mesh(zto(0.22, 0.006), new THREE.MeshBasicMaterial({ color:0xd8b860, transparent:true })); m.rotation.x = PI/2; g.add(m); c.R.glows.push(m);
    halo(c.R, g, 0xd8b860, 1.1, 0, 0, 0, 0.35);
  },
  prismgem(c){
    // five little stones in an iron brooch at his collar
    const p = c.surf(0, 1.22, 0.02);
    P(c.b, CY(0.07, 0.07, 0.015, 18), ZC.iron, p[0], p[1], p[2], PI/2 - 0.5);
    [0xff4a6a, 0xffd23d, 0x9cff3a, 0x46e4ff, 0xb36bff].forEach((col, i)=>{ const a = i/5*PI*2; glow(c.R, c.b, 0.014, col, p[0] + Math.cos(a)*0.042, p[1] + Math.sin(a)*0.038, p[2] + 0.015); });
    P(c.b, OC(0.02), 0xb8b8b0, p[0], p[1], p[2] + 0.015);
  },
  froghood(c){ /* built into the hood */ },
  cubes(c){
    // runestones circling his head, a sign scratched in each
    const o = group(c.head, 0, 0.0, 0); c.R.parts.orbit = o;
    for(let i=0;i<3;i++){ const a = i/3*PI*2; const g = group(o, Math.cos(a)*0.42, Math.sin(a*2)*0.05, Math.sin(a)*0.42); g.rotation.set(a, a, 0.3);
      P(g, K.lump(0.05, 1, 0.25, i), 0x4a4a4a, 0, 0, 0, 0, 0, 0, 1, 1.3, 0.8);
      glow(c.R, g, 0.012, [0x46e4ff, 0xb36bff, 0xffd23d][i], 0, 0, 0.04); }
  },
  voidtip(c){ P(c.tip, S(0.06, 14, 10), 0x050008, 0.1, 0.24, 0.14); const m = new THREE.Mesh(zto(0.09, 0.01), new THREE.MeshBasicMaterial({ color:0x9a5ad8, transparent:true })); m.position.set(0.1, 0.24, 0.14); m.rotation.x = 1.2; c.tip.add(m); c.R.glows.push(m); halo(c.R, c.tip, 0x8a4ad8, 0.7, 0.1, 0.24, 0.14, 0.45); },
  mirrorshield(c){
    // an old round mirror for a shield, the silver gone dark and spotted
    const g = group(c.armL, -0.05, -0.32, 0.1); g.rotation.set(PI/2, 0, 0);
    P(g, CY(0.17, 0.17, 0.025, 28), 0x4a4a4e); P(g, CY(0.15, 0.15, 0.027, 28), 0x8a9094);
    P(g, zto(0.165, 0.016), ZC.brass, 0, 0, 0, PI/2);
    for(let i=0;i<8;i++){ const a = i/8*PI*2; P(g, zs(0.012), ZC.brass, Math.cos(a)*0.165, 0.016, Math.sin(a)*0.165); }
    [[0.05, 0.04], [-0.06, -0.03]].forEach(([x, z])=> P(g, zs(0.025), 0x3a3a38, x, 0.012, z, 0, 0, 0, 1, 0.2, 1));
    glow(c.R, g, 0.03, 0xd8e0e8, -0.04, 0.02, -0.05);
  },
  orbitrings(c){ [0.5, -0.6].forEach((tilt, i)=>{ const g = group(c.b, 0, 0.95, 0); g.rotation.x = tilt; c.R.anim.push({ o:g, spin:i ? -1.2 : 1.5 }); const m = new THREE.Mesh(zto(0.62, 0.008), new THREE.MeshBasicMaterial({ color:i ? 0x46b4d8 : 0xd8b040, transparent:true, opacity:0.7 })); m.rotation.x = PI/2; g.add(m); c.R.glows.push(m); glow(c.R, g, 0.03, i ? 0x46b4d8 : 0xd8b040, 0.62, 0, 0); }); },
  /* ---- transformations ---- */
  horns(c){
    // great curled horns out through the hood, embers smouldering at the tips
    [-1, 1].forEach(s=>{
      const pts = [[s*0.15, 0.08, -0.02], [s*0.27, 0.16, -0.08], [s*0.34, 0.3, -0.04], [s*0.31, 0.42, 0.06], [s*0.25, 0.44, 0.13]];
      const g = zTaper(pts, 0.05, 0.008, 26, 10); K.sculpt(g, 0.004, 60, s); P(c.head, g, 0x2a1e18);
      for(let i=1;i<6;i++){ const t = i/6, q = pts[Math.min(4, Math.floor(t*4))]; P(c.head, zto(0.045*(1 - t*0.7), 0.005), 0x1a1210, q[0], q[1], q[2], 0.6, s*0.5, 0); }
      const f = glow(c.R, c.head, 0.014, 0xff6a1a, s*0.25, 0.44, 0.13); c.R.anim.push({ o:f, flicker:0.3 });
    });
  },
  lichmask(c){
    // the skull he became: bone in the hood's dark, cold fire in the sockets
    P(c.face, K.sculpt(new THREE.SphereGeometry(0.085, 22, 16), 0.004, 30, 1), 0xc8c4b0, 0, 0.012, 0.02, 0, 0, 0, 1, 1.1, 1);
    P(c.face, BX(0.07, 0.04, 0.06), 0xb8b4a0, 0, -0.07, 0.05);
    [-1, 1].forEach(s=>{ P(c.face, zs(0.024), ZC.hole, s*0.032, 0.012, 0.085, 0, 0, 0, 1, 0.9, 0.6); glow(c.R, c.face, 0.012, 0x46c8ff, s*0.032, 0.012, 0.096); });
    P(c.face, CO(0.012, 0.025, 3), ZC.hole, 0, -0.025, 0.1, PI);
    for(let i=0;i<6;i++) P(c.face, BX(0.008, 0.018, 0.01), 0xd8d4c0, -0.025 + i*0.01, -0.06, 0.08);
    halo(c.R, c.face, 0x46c8ff, 0.3, 0, 0.012, 0.1, 0.45);
  },
  statichair(c){
    // white hair standing out of the hood on end, crackling
    for(let i=0;i<11;i++){ const a = PI + (i - 5)*0.28; const p = [Math.sin(a)*0.19, 0.04 + (i % 3)*0.03, Math.cos(a)*0.2]; P(c.head, zTaper([p, [p[0]*1.6, p[1] + 0.12 + (i % 2)*0.05, p[2]*1.5], [p[0]*2.1, p[1] + 0.22, p[2]*1.8]], 0.016, 0.003, 8, 5), i % 2 ? 0xc8c4bc : 0x9a968e); }
    [[0.3, 0.26, -0.3], [-0.32, 0.22, -0.28]].forEach(([x, y, z])=>{ const f = glow(c.R, c.head, 0.018, 0xfff04a, x, y, z); c.R.anim.push({ o:f, flicker:0.9 }); });
  },
  tophat(c){
    // a battered stovepipe on top of the hood, with a band of old crepe
    P(c.hat, CY(0.21, 0.2, 0.025, 28), 0x16141a, 0, 0.16, 0);
    const pipe = K.sculpt(new THREE.CylinderGeometry(0.135, 0.125, 0.4, 28, 6), 0.006, 10, 2); P(c.hat, pipe, 0x16141a, 0, 0.37, 0, 0, 0, 0.06);
    P(c.hat, CY(0.128, 0.128, 0.06, 28), 0x3a1418, 0, 0.21, 0);
    zFace(c.hat, BX(0.05, 0.12, 0.01), 0x0e0c10, [0.06, 0.18, 0.12], 0.4, 0, 0.3);
  },
  flowerhat(c){
    // a wreath of dried leaves and dead flowers round the hood
    for(let i=0;i<14;i++){ const a = i/14*PI*2; const p = [Math.sin(a)*0.19, 0.13 - Math.cos(a)*0.03, Math.cos(a)*0.2]; zFace(c.head, zs(0.04), i % 2 ? 0x4a4026 : 0x5a4a2e, p, a, 1.1, a, 0.5, 1, 0.25); }
    for(let i=0;i<6;i++){ const a = i/6*PI*2 + 0.3, col = [0xc8b8b0, 0x8a6a7a, 0xb8a890][i % 3]; const p = [Math.sin(a)*0.2, 0.145 - Math.cos(a)*0.03, Math.cos(a)*0.21];
      for(let k=0;k<5;k++){ const q = k/5*PI*2; P(c.head, zs(0.022), col, p[0] + Math.cos(q)*0.022, p[1] + 0.01, p[2] + Math.sin(q)*0.022, 0, 0, 0, 1, 0.4, 1); }
      P(c.head, zs(0.012), 0x2a1e14, p[0], p[1] + 0.015, p[2]); }
  },
  crown(c){
    // a tarnished crown pressed down on the hood
    const g = group(c.head, 0, 0.17, -0.01); g.rotation.x = -0.12;
    P(g, CY(0.16, 0.17, 0.07, 28), 0x8a6a2e);
    for(let i=0;i<7;i++){ const a = i/7*PI*2; zPoint(g, CO(0.026, 0.11, 6), 0x9a7a34, [Math.sin(a)*0.16, 0.05, Math.cos(a)*0.16], a, PI/2 - 0.15); glow(c.R, g, 0.012, [0xc82a3a, 0x3aa8c8, 0x6ac82a][i % 3], Math.sin(a)*0.172, 0.0, Math.cos(a)*0.172); }
    P(g, zto(0.165, 0.008), 0x6a4a1e, 0, -0.03, 0, PI/2);
  },
  lilycape(c){
    // a rotting lily pad worn as a mantle on his back
    const pad = new THREE.CylinderGeometry(0.42, 0.42, 0.02, 30, 1, false, 0.3, PI*2 - 0.6); K.sculpt(pad, 0.015, 9, 2);
    P(c.cape, pad, 0x3e4a26, 0, -0.45, -0.37, -1.35, PI, 0);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(c.cape, BX(0.006, 0.006, 0.36), 0x2a3418, Math.sin(a)*0.02, -0.45 + Math.cos(a)*0.17, -0.38 - Math.sin(a)*0.06, -1.35 + Math.cos(a), a, 0); }
    P(c.cape, zs(0.04), 0x9a8a8a, 0.15, -0.3, -0.39);
  },
  clownnose(c){
    // a red nose floating in the dark of the hood
    P(c.face, zs(0.04), 0x7a1e1c, 0, -0.012, 0.115);
    glow(c.R, c.face, 0.008, 0xf0d8c8, 0.015, 0.005, 0.148);
  },
  ruff(c){
    // a pleated ruff, yellowed, gone limp
    for(let i=0;i<20;i++){ const a = i/20*PI*2, p = [Math.sin(a)*0.23, 1.33 + (i % 2)*0.01, Math.cos(a)*0.23 + 0.13]; zFace(c.b, S(0.07, 10, 8), i % 2 ? 0xb8ac90 : 0x8a7a50, p, a, -0.35, 0, 0.35, 0.9, 1.3); }
  },
  /* ---- more odds and ends ---- */
  spinachcan(c){ const p = c.surf(1.4, 0.6, 0.055); P(c.b, CY(0.045, 0.045, 0.11, 14), 0x3a4a2a, p[0], p[1], p[2]); P(c.b, CY(0.047, 0.047, 0.04, 14), 0x7a6a50, p[0], p[1], p[2]); P(c.b, zto(0.045, 0.006), ZC.rust, p[0], p[1] + 0.055, p[2], PI/2); },
  coffeecup(c){ const g = group(c.armL, 0, c.HY - 0.04, 0.05); P(g, CY(0.045, 0.036, 0.09, 14), 0xa89a80); P(g, CY(0.04, 0.04, 0.01, 14), 0x1e120a, 0, 0.04, 0); P(g, zto(0.025, 0.008, PI), 0xa89a80, -0.05, 0, 0, 0, 0, PI/2); P(g, BX(0.004, 0.04, 0.003), 0x3a3028, 0.02, -0.01, 0.042, 0, 0, 0.4); },
  magnet(c){ const p = c.surf(-0.55, 0.62, 0.05); P(c.b, zto(0.07, 0.024, PI), 0x5a2018, p[0], p[1], p[2], 0, -0.5, PI); [-1, 1].forEach(s=> P(c.b, BX(0.05, 0.04, 0.05), 0x5a5a58, p[0] + s*0.07*Math.cos(0.5), p[1] - 0.02, p[2] + s*0.07*Math.sin(0.5))); },
  hourglass(c){
    const p = c.surf(-2.1, 0.62, 0.06), g = group(c.b, p[0], p[1], p[2]);
    P(g, CO(0.045, 0.07, 12), 0x8a9a98, 0, 0.035, 0, PI); P(g, CO(0.045, 0.07, 12), 0x8a9a98, 0, -0.035, 0);
    [-1, 1].forEach(s=> P(g, CY(0.055, 0.055, 0.015, 12), ZC.wood, 0, s*0.077, 0));
    for(let i=0;i<3;i++){ const a = i/3*PI*2; P(g, zcy(0.005, 0.005, 0.15, 5), ZC.iron2, Math.cos(a)*0.05, 0, Math.sin(a)*0.05); }
    glow(c.R, g, 0.02, 0xd8b040, 0, -0.04, 0);
  },
  sandwich(c){ const p = c.surf(0.6, 0.6, 0.05); P(c.b, BX(0.13, 0.025, 0.09), 0x9a8a60, p[0], p[1], p[2], 0.3, 0.6); P(c.b, BX(0.14, 0.015, 0.1), 0x5a6a3a, p[0], p[1] + 0.02, p[2], 0.3, 0.6); P(c.b, BX(0.13, 0.025, 0.09), 0x9a8a60, p[0], p[1] + 0.04, p[2], 0.3, 0.6); P(c.b, zs(0.02), 0x5a7a5a, p[0] + 0.03, p[1] + 0.055, p[2]); },
  pauldrons(c){
    // heavy iron on both shoulders, over cloth in his colour
    [-1, 1].forEach(s=>{ const g = group(c.b, s*0.26, 1.27, 0.07); g.rotation.z = -s*0.5;
      P(g, new THREE.SphereGeometry(0.16, 28, 12, 0, PI*2, 0, PI*0.45), ZC.iron2, 0, 0, 0, 0, 0, 0, 1, 0.8, 1.15);
      P(g, zto(0.16*Math.sin(PI*0.45), 0.012), ZC.brass, 0, 0.12*Math.cos(PI*0.45), 0, PI/2, 0, 0, 1, 1.15, 1);
      P(g, new THREE.SphereGeometry(0.17, 24, 8, 0, PI*2, PI*0.4, PI*0.15), c.D.dark, 0, 0.0, 0, 0, 0, 0, 1, 0.8, 1.15); });
  },
  spikepauldrons(c){ [-1, 1].forEach(s=>{ const g = group(c.b, s*0.26, 1.27, 0.07); g.rotation.z = -s*0.5; P(g, new THREE.SphereGeometry(0.14, 24, 10, 0, PI*2, 0, PI/2), ZC.iron, 0, 0, 0, 0, 0, 0, 1, 0.8, 1.1); for(let k=0;k<3;k++) P(g, CO(0.022, 0.13, 6), k % 2 ? ZC.rust : ZC.iron2, s*0.02, 0.1, -0.07 + k*0.07, 0, 0, s*0.2); }); },
  rubberball(c){ const p = c.surf(-1.3, 0.6, 0.06); P(c.b, S(0.055, 14, 10), 0x7a2a3a, p[0], p[1], p[2]); P(c.b, zto(0.055, 0.008), 0x8a7a3a, p[0], p[1], p[2], PI/2); },
  hateye(c){
    // an eye sewn into the hood, yellowed and veined, half-lidded
    const g = group(c.hat, 0, 0.12, 0.12); g.rotation.x = -0.2;
    P(g, zs(0.045), 0xb8ac88); glow(c.R, g, 0.018, 0x46a8ff, 0, 0, 0.034); P(g, BX(0.006, 0.026, 0.006), ZC.hole, 0, 0, 0.051);
    P(g, new THREE.SphereGeometry(0.05, 16, 8, 0, PI*2, 0, PI*0.45), zDim(c.D.robe, 0.8), 0, 0, 0, 0.45);
    for(let i=0;i<5;i++) P(g, BX(0.004, 0.022, 0.003), 0x1a1410, -0.04 + i*0.02, -0.045, 0.02);
  },
  sideeyes(c){ [-1, 1].forEach(s=>{ const g = group(c.head, s*0.2, 0.05, 0.02); g.rotation.y = s*PI/2; P(g, zs(0.035), 0xb8ac88); glow(c.R, g, 0.014, 0x9cff3a, 0, 0, 0.027); P(g, BX(0.005, 0.02, 0.005), ZC.hole, 0, 0, 0.04); P(g, new THREE.SphereGeometry(0.04, 14, 8, 0, PI*2, 0, PI*0.45), zDim(c.D.robe, 0.8), 0, 0, 0, 0.5); }); },
  backeye(c){ const g = group(c.head, 0, 0.06, -0.21); g.rotation.y = PI; P(g, zs(0.04), 0xb8ac88); glow(c.R, g, 0.016, 0xff4a3a, 0, 0, 0.03); P(g, BX(0.005, 0.022, 0.005), ZC.hole, 0, 0, 0.045); P(g, new THREE.SphereGeometry(0.046, 14, 8, 0, PI*2, 0, PI*0.45), zDim(c.D.robe, 0.8), 0, 0, 0, 0.5); },
  worm(c){
    // a pale grub nosing out of the hood
    const pts = [[0.1, 0.15, 0.1], [0.17, 0.25, 0.12], [0.22, 0.25, 0.18], [0.25, 0.33, 0.2]];
    P(c.head, zTaper(pts, 0.03, 0.02, 14, 10), 0xb89a8a);
    for(let i=1;i<6;i++){ const t = i/6, a = pts[Math.floor(t*3)], b2 = pts[Math.floor(t*3) + 1], f = t*3 % 1; P(c.head, zto(0.028 - t*0.008, 0.005), 0x8a6a62, a[0] + (b2[0] - a[0])*f, a[1] + (b2[1] - a[1])*f, a[2] + (b2[2] - a[2])*f, PI/2 - 0.6, 0.3, 0); }
    [-1, 1].forEach(s=> P(c.head, zs(0.006), ZC.hole, 0.25 + s*0.01, 0.35, 0.21));
  },
  jetpack(c){
    // two rusted canisters strapped on his back, coughing fire
    const g = group(c.b, 0, 0.92, -0.4);
    [-1, 1].forEach(s=>{ P(g, CY(0.065, 0.065, 0.34, 18), ZC.iron2, s*0.085, 0, 0); P(g, S(0.065, 14, 8), ZC.rust, s*0.085, 0.17, 0, 0, 0, 0, 1, 0.6, 1);
      [-0.1, 0.1].forEach(y=> P(g, zto(0.067, 0.008), ZC.brass, s*0.085, y, 0, PI/2));
      P(g, CY(0.045, 0.03, 0.06, 12), ZC.iron, s*0.085, -0.2, 0);
      const f = glow(c.R, g, 0.035, 0xff8a30, s*0.085, -0.26, 0); c.R.anim.push({ o:f, flicker:0.5 }); });
    P(g, BX(0.06, 0.25, 0.04), ZC.leather, 0, 0, 0.02);
  },
  wildhair(c){ for(let i=0;i<13;i++){ const a = PI + (i - 6)*0.25, col = [0x9a968e, 0x8a5a6a, 0x4a7a7a][i % 3]; const p = [Math.sin(a)*0.18, -0.02 + (i % 3)*0.04, Math.cos(a)*0.19]; P(c.head, zTaper([p, [p[0]*1.5, p[1] - 0.1, p[2]*1.4], [p[0]*1.7, p[1] - 0.25 - (i % 2)*0.08, p[2]*1.6]], 0.016, 0.003, 8, 5), col); } },
  icepauldron(c){ const g = group(c.b, -0.27, 1.32, 0.07); g.rotation.z = 0.5; P(g, K.lump(0.13, 2, 0.15, 4), 0x8aa4b4, 0, 0, 0, 0, 0, 0, 1, 0.6, 1.1); for(let k=0;k<4;k++) P(g, CO(0.028, 0.15 + (k % 2)*0.06, 5), 0xa8c4d4, -0.02 + k*0.012, 0.08, -0.08 + k*0.055, 0, 0, 0.2); halo(c.R, g, 0x8ad8ff, 0.5, 0, 0.08, 0, 0.3); },
  crystals(c){ [[0.27, 1.34, -0.0], [0.32, 1.29, 0.08], [0.24, 1.33, 0.12]].forEach(([x, y, z], i)=> P(c.b, CO(0.03, 0.14 + i*0.04, 5), [0x7a4a9a, 0x3a8a9a, 0x9a4a6a][i], x, y + 0.05, z, 0.2*i, 0, -0.4 + i*0.2)); glow(c.R, c.b, 0.02, 0xb07aff, 0.28, 1.36, 0.06); },
  wisplantern(c){
    // an iron lantern in his left hand, a lost soul in it
    const g = group(c.armL, 0, c.HY - 0.08, 0.06); g.rotation.x = 1.1;
    P(g, zcy(0.003, 0.003, 0.08, 5), ZC.iron2, 0, 0.0, 0);
    const lg = group(g, 0, -0.04, 0); c.R.anim.push({ o:lg, sway:0.1, speed:2.4 });
    P(lg, CO(0.05, 0.04, 6), ZC.iron, 0, -0.02, 0); P(lg, CY(0.05, 0.045, 0.012, 6), ZC.iron, 0, -0.12, 0);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(lg, zcy(0.004, 0.004, 0.09, 5), ZC.iron2, Math.cos(a)*0.045, -0.075, Math.sin(a)*0.045); }
    const w = glow(c.R, lg, 0.032, 0x8ae0ff, 0, -0.075, 0); c.R.anim.push({ o:w, flicker:0.3 });
    halo(c.R, lg, 0x8ae0ff, 0.55, 0, -0.075, 0, 0.5);
  },
  souljar(c){ const p = c.surf(-1.55, 0.62, 0.06); P(c.b, CY(0.05, 0.05, 0.1, 14), 0x4a4a5a, p[0], p[1], p[2]); P(c.b, CY(0.055, 0.055, 0.025, 14), ZC.iron, p[0], p[1] + 0.06, p[2]); glow(c.R, c.b, 0.03, 0x9a5ae8, p[0], p[1], p[2]); },
  tombstone(c){
    // a little headstone carried on his back, moss on it
    const g = group(c.b, 0, 0.95, -0.43); g.rotation.x = 0.12;
    P(g, K.sculpt(new THREE.BoxGeometry(0.3, 0.36, 0.07, 6, 6, 2), 0.008, 14, 1), 0x6a6a68);
    P(g, K.sculpt(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 24, 1), 0.006, 14, 2), 0x6a6a68, 0, 0.18, 0, PI/2);
    P(g, BX(0.12, 0.02, 0.01), 0x2a2a2a, 0, 0.1, -0.038); P(g, BX(0.02, 0.12, 0.01), 0x2a2a2a, 0, 0.1, -0.038);
    P(g, K.lump(0.05, 1, 0.4, 3), 0x3e4a2e, 0.1, 0.25, -0.02, 0, 0, 0, 1.2, 0.5, 1);
  },
  bombtip(c){ P(c.tip, K.sculpt(new THREE.SphereGeometry(0.065, 14, 10), 0.003, 30, 1), 0x1a1a1e, 0.1, 0.22, 0.15); P(c.tip, CY(0.018, 0.018, 0.02, 8), ZC.iron2, 0.1, 0.29, 0.15); P(c.tip, zcy(0.005, 0.005, 0.05, 5), 0x6a5a3a, 0.1, 0.32, 0.15); const f = glow(c.R, c.tip, 0.02, 0xffa040, 0.1, 0.35, 0.15); c.R.anim.push({ o:f, flicker:0.6 }); },
  hydra(c){
    // two serpent heads rising from his shoulders, scaled and lidless
    [-1, 1].forEach(s=>{
      const pts = [[s*0.25, 1.25, -0.05], [s*0.4, 1.45, -0.12], [s*0.45, 1.65, -0.02], [s*0.42, 1.72, 0.06]];
      const g = zTaper(pts, 0.055, 0.04, 20, 10); K.sculpt(g, 0.004, 50, s); P(c.b, g, 0x2e3a2c);
      const h = group(c.b, s*0.42, 1.73, 0.1); h.rotation.x = 0.3;
      P(h, K.sculpt(new THREE.SphereGeometry(0.07, 16, 12), 0.004, 40, s), 0x2e3a2c, 0, 0, 0, 0, 0, 0, 0.9, 0.7, 1.5);
      [-1, 1].forEach(q=> glow(c.R, h, 0.012, 0xd8c83a, q*0.04, 0.03, 0.06));
      for(let k=0;k<3;k++) P(h, CO(0.008, 0.03, 4), 0xc8bca0, (k - 1)*0.02, -0.03, 0.09, PI);
    });
  },
  offhand(c){ const g = group(c.armL, 0, c.HY, 0.02); g.rotation.x = 1.1; GUN.pistol(g); glow(c.R, g, 0.05, 0x9a5ae8, 0, 0.03, 0.53); },
  gremlin(c){
    // a scrawny grey imp riding his shoulder, grinning at nothing
    const g = group(c.b, -0.3, 1.36, -0.02); c.R.anim.push({ o:g, bob:0.02, speed:9 });
    P(g, K.sculpt(new THREE.SphereGeometry(0.07, 14, 10), 0.006, 30, 1), 0x4a5248, 0, 0, 0, 0, 0, 0, 1, 1.2, 0.9);
    P(g, K.sculpt(new THREE.SphereGeometry(0.055, 14, 10), 0.005, 30, 2), 0x4a5248, 0, 0.1, 0.03);
    [-1, 1].forEach(s=>{ P(g, zTaper([[s*0.04, 0.12, 0.02], [s*0.1, 0.17, 0.0], [s*0.15, 0.2, -0.02]], 0.02, 0.004, 8, 6), 0x4a5248); glow(c.R, g, 0.009, 0xd8c83a, s*0.022, 0.11, 0.075); P(g, zTaper([[s*0.05, -0.02, 0.03], [s*0.07, -0.08, 0.06], [s*0.06, -0.12, 0.05]], 0.012, 0.005, 6, 5), 0x4a5248); });
    P(g, BX(0.04, 0.006, 0.01), 0x1a1010, 0, 0.08, 0.08); for(let k=0;k<3;k++) P(g, CO(0.004, 0.012, 4), 0xc8bca0, -0.012 + k*0.012, 0.075, 0.082, PI);
  },
  boomerang(c){ const g = group(c.b, 0, 1.0, -0.42); P(g, BX(0.38, 0.05, 0.025), 0xc0b49a, -0.08, 0, 0, 0, 0, 0.5); P(g, BX(0.3, 0.05, 0.025), 0xc0b49a, 0.12, -0.02, 0, 0, 0, -0.6); for(let i=0;i<4;i++) P(g, BX(0.006, 0.03, 0.028), 0x3a2a1a, -0.2 + i*0.1, -0.04 + Math.abs(i - 1.5)*0.03, 0); },
  papershield(c){
    // a shield of pasted prayer-papers, sealed over and over
    const g = group(c.armL, -0.06, -0.3, 0.12); g.rotation.set(0, 0, 0.1);
    P(g, BX(0.24, 0.3, 0.015), 0xb0a080);
    for(let i=0;i<5;i++) P(g, BX(0.06, 0.16, 0.004), [0xc0b090, 0xa89870][i % 2], -0.09 + i*0.045, (i % 2)*0.05 - 0.03, 0.01, 0, 0, (i - 2)*0.1);
    [[0.05, 0.08], [-0.06, -0.06], [0.0, 0.0]].forEach(([x, y])=> P(g, CY(0.022, 0.022, 0.006, 12), 0x6a1a14, x, y, 0.012, PI/2));
  },
  rocketsback(c){ [-0.12, 0, 0.12].forEach((x, i)=>{ P(c.b, CY(0.035, 0.035, 0.28, 12), [0x5a2a20, 0x2a3a4a, 0x6a5a2a][i], x, 1.02, -0.42, 0.2); P(c.b, CO(0.04, 0.08, 12), 0x6a6a64, x, 1.19, -0.46, 0.2); P(c.b, zto(0.036, 0.006), ZC.brass, x, 0.95, -0.41, PI/2 + 0.2); }); },
  alarmclock(c){ const p = c.surf(1.85, 0.62, 0.06), g = group(c.b, p[0], p[1], p[2]); g.rotation.y = 1.85; P(g, CY(0.06, 0.06, 0.045, 18), 0x4a2a20, 0, 0, 0, PI/2); P(g, CY(0.048, 0.048, 0.047, 18), 0xb0a488, 0, 0, 0.002, PI/2); [-1, 1].forEach(s=> P(g, zs(0.025), ZC.iron2, s*0.045, 0.06, 0)); P(g, BX(0.006, 0.035, 0.008), ZC.hole, 0, 0.012, 0.027); P(g, BX(0.025, 0.006, 0.008), ZC.hole, 0.01, 0, 0.027); },
  sodacan(c){ const p = c.surf(2.0, 0.62, 0.05); P(c.b, CY(0.035, 0.035, 0.11, 14), 0x2a4a5a, p[0], p[1], p[2], 0.1); P(c.b, CY(0.036, 0.036, 0.03, 14), 0x8a8a84, p[0], p[1] + 0.01, p[2], 0.1); P(c.b, K.lump(0.02, 1, 0.5, 2), ZC.rust, p[0], p[1] - 0.04, p[2] + 0.02); },
  fangs(c){ [-1, 1].forEach(s=>{ P(c.face, CO(0.012, 0.05, 6), 0xd8d0b8, s*0.022, -0.06, 0.08, PI - 0.1); glow(c.R, c.face, 0.004, 0xffffff, s*0.022, -0.05, 0.088); }); },
  angrybrows(c){ [-1, 1].forEach(s=> P(c.face, BX(0.06, 0.012, 0.03), 0x1a1614, s*0.033, 0.04, 0.085, 0, 0, s*0.5)); },
  tadpolejar(c){ const p = c.surf(1.3, 0.62, 0.06); P(c.b, CY(0.05, 0.05, 0.12, 14), 0x5a6a52, p[0], p[1], p[2]); P(c.b, CY(0.055, 0.055, 0.025, 14), ZC.wood, p[0], p[1] + 0.07, p[2]); [[-0.02, -0.02], [0.02, 0.02]].forEach(([x, y])=> P(c.b, zs(0.014), 0x1a1e14, p[0] + x, p[1] + y, p[2] + 0.03, 0, 0, 0, 1.5, 1, 1)); glow(c.R, c.b, 0.012, 0x9cff3a, p[0], p[1] - 0.03, p[2]); },
  frogbrolly(c){
    // a frog-headed umbrella on his back, the canopy torn
    const g = group(c.b, -0.18, 1.1, -0.38); g.rotation.z = 0.3;
    P(g, zcy(0.008, 0.008, 0.75, 5), ZC.wood, 0, 0.15, 0);
    const can = new THREE.SphereGeometry(0.32, 24, 8, 0, PI*2, 0, PI/2); K.tatter(can, 0.12, 8, 0.06, 3); P(g, can, 0x3e4a26, 0, 0.46, 0, 0, 0, 0, 1, 0.55, 1);
    for(let i=0;i<8;i++){ const a = i/8*PI*2; P(g, zcy(0.004, 0.004, 0.33, 5), ZC.iron2, Math.cos(a)*0.16, 0.5, Math.sin(a)*0.16, Math.sin(a)*1.0, 0, -Math.cos(a)*1.0); }
    [-1, 1].forEach(s=>{ P(g, zs(0.04), 0x3e4a26, s*0.08, 0.62, 0.1); glow(c.R, g, 0.016, 0xb8862a, s*0.08, 0.635, 0.13); });
  },
  seashell(c){ const g = group(c.head, 0.2, -0.02, 0.02); g.rotation.z = -PI/2; P(g, CO(0.045, 0.11, 10), 0xa89890); for(let i=0;i<3;i++) P(g, zto(0.04 - i*0.01, 0.006), 0x8a7870, 0, -0.03 + i*0.03, 0, PI/2); },
  snail(c){ const g = group(c.head, -0.15, 0.15, 0.1); g.rotation.set(0, -0.6, 0.3); P(g, zto(0.035, 0.024), 0x6a5a3a, 0, 0.035, 0, 0, 0.6); P(g, zs(0.016), 0x8a7a68, 0.045, 0.01, 0.025, 0, 0, 0, 2.2, 0.8, 1); [-1, 1].forEach(s=> P(g, zcy(0.003, 0.003, 0.035, 5), 0x8a7a68, 0.08, 0.035, 0.025 + s*0.01)); },
  goblet(c){ const p = c.surf(-1.75, 0.6, 0.06); P(c.b, CO(0.045, 0.07, 14), 0x8a6a2e, p[0], p[1] + 0.03, p[2], PI); P(c.b, CY(0.01, 0.01, 0.05, 6), 0x8a6a2e, p[0], p[1] - 0.03, p[2]); P(c.b, CY(0.03, 0.03, 0.008, 12), 0x8a6a2e, p[0], p[1] - 0.055, p[2]); P(c.b, CY(0.038, 0.038, 0.006, 12), 0x3a0a0a, p[0], p[1] + 0.06, p[2]); },
  kaleido(c){ P(c.face, CY(0.022, 0.026, 0.16, 12), ZC.brass, 0.033, 0.014, 0.16, PI/2); [0xa84a5a, 0x3a8a9a, 0xb89a3a].forEach((col, i)=> P(c.face, zto(0.025, 0.005), zDim(col, 0.8), 0.033, 0.014, 0.1 + i*0.05)); glow(c.R, c.face, 0.016, 0xd8b8ff, 0.033, 0.014, 0.24); },
  handmirror(c){ const p = c.surf(2.4, 0.6, 0.05), g = group(c.b, p[0], p[1], p[2]); g.rotation.set(0, 2.4, 0.4); P(g, CY(0.01, 0.01, 0.1, 6), 0x8a6a2e, 0, -0.07, 0); P(g, CY(0.06, 0.06, 0.012, 16), 0x8a6a2e, 0, 0.02, 0, PI/2); glow(c.R, g, 0.042, 0x9aa0a8, 0, 0.02, 0.008); },
  elementgems(c){ DG.ELEMENT_ORDER.forEach((el, i)=>{ const a = -0.9 + i*0.45, p = c.surf(a, 0.82, 0.022); P(c.b, CY(0.02, 0.02, 0.01, 10), ZC.iron2, p[0], p[1], p[2], PI/2, a); glow(c.R, c.b, 0.016, DG.ELEMENTS[el].color, p[0]*1.04, p[1], p[2] + 0.008*Math.cos(a)); }); },
  snowhat(c){ P(c.head, new THREE.SphereGeometry(0.215, 28, 8, 0, PI*2, 0, PI*0.32), 0xc8ccd0, 0, 0.028, -0.01, 0, 0, 0, 1, 1, 1.08); for(let i=0;i<6;i++){ const a = i*1.1; P(c.head, K.lump(0.03, 1, 0.3, i), 0xd0d4d8, Math.sin(a)*0.13, 0.2, Math.cos(a)*0.13 - 0.01); } P(c.hat, K.lump(0.06, 1, 0.3, 9), 0xc8ccd0, 0, 0.27, -0.02); },
  bandage(c){ P(c.head, zto(0.21, 0.025), 0xa89c80, 0, 0.1, -0.01, PI/2 - 0.25, 0, 0.15, 1, 1.08, 1); P(c.head, zs(0.04), 0x5a1410, 0.13, 0.16, 0.14, 0, 0, 0, 1, 1, 0.4); P(c.head, BX(0.05, 0.14, 0.01), 0xa89c80, -0.17, 0.0, -0.12, 0.2, -0.9, 0.3); }
};

Models.setGun = function(R, gun, els){
  const h = R.parts.gun;
  while(h.children.length) h.remove(h.children[0]);
  const gr = rig("gun");
  const g = Models.gun(gun.base, gun.element, gr, els);
  K.bake(g, { mat:K.toon(), w:0.018 });
  h.add(g);
  R.muzzle = gr.muzzle; R.gunGlows = gr.glows; R.gunKey = gun.uid + ":" + (els || []).join(",");
  R.gunMats = []; g.traverse(o=>{ if(o.material && o.userData.baked) R.gunMats.push(o.material); });
};

/* ================================================================== *
 *  Gribbus (and Grobbus)
 *  Not a toy any more: a heavy, warty old toad the colour of a ditch,
 *  slit-eyed under heavy lids, a wide sour mouth, scarred from a long
 *  life of fights he says he won. A rag round his neck, a bone charm.
 * ================================================================== */
const FC = { scar:0x5e5244, rust:0x6a3a22, bone:0xc8bca0, iron:0x3a3a40, hole:0x0a0806, mouth:0x140e0a, brass:0x8a6a30 };
/* toad skin: a fresh sphere, sculpted lumpy, mottled dark and light, paler underneath */
function fSkin(r, ws, hs, amt, freq, seed, c1, c2, belly){
  const g = new THREE.SphereGeometry(r, ws, hs); K.sculpt(g, amt, freq, seed);
  const a = g.attributes.position, col = new Float32Array(a.count*3);
  const A = new THREE.Color(c1), B = new THREE.Color(c2), L = new THREE.Color(belly === undefined ? c1 : belly), t = new THREE.Color();
  for(let i=0;i<a.count;i++){
    const x = a.getX(i)/r, y = a.getY(i)/r, z = a.getZ(i)/r;
    const n = Math.sin(x*5.1 + seed)*Math.sin(y*4.3 + seed*1.7)*Math.sin(z*4.7 + seed*0.3) + 0.45*Math.sin(x*11 + 1.3)*Math.sin(y*9.7 + seed)*Math.sin(z*12.1 + 0.4);
    t.copy(A).lerp(B, Math.max(0, Math.min(1, 0.5 + n*1.4)));
    if(belly !== undefined){ const k = Math.max(0, Math.min(1, (-y + 0.35*z + 0.05)/0.55)); t.lerp(L, k*k*(3 - 2*k)); }
    col[i*3] = t.r; col[i*3 + 1] = t.g; col[i*3 + 2] = t.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return g;
}
Models.frog = function(twin, buffs){
  buffs = buffs || [];
  const has = id=> buffs.indexOf(id) >= 0;
  const R = rig("frog"), b = R.body;
  R.anim = [];
  // Gribbus: ditch-water olive and mud; Grobbus: the grey-green of an old pond
  const G1 = twin ? 0x404a42 : 0x54522c, G2 = twin ? 0x262e28 : 0x34301c, BELLY = twin ? 0x8a9482 : 0xa8986a;
  const WART = twin ? 0x56625a : 0x6e6438, IRIS = twin ? 0x9ab890 : 0xc8902a;
  const SCARF = has("doom") ? 0x1e1620 : has("croak") ? 0x4a6a7a : twin ? 0x2a3a5a : 0x5a1a14;
  let sd = twin ? 11 : 5; const rnd = ()=> (sd = (sd*16807) % 2147483647)/2147483647;
  // the body: heavy and squat, belly sagging
  P(b, fSkin(0.32, 34, 26, 0.02, 15, 1.3, G1, G2, BELLY), 0xffffff, 0, 0.26, -0.03, 0, 0, 0, 1.18, 0.76, 1.08);
  // the head: wide and flat, a pale throat under it
  P(b, fSkin(0.25, 36, 26, 0.014, 18, 2.1, G1, G2, BELLY), 0xffffff, 0, 0.37, 0.16, 0, 0, 0, 1.18, 0.8, 0.98);
  P(b, fSkin(0.2, 28, 20, 0.006, 15, 3.3, BELLY, zDim(BELLY, 0.8)), 0xffffff, 0, 0.245, 0.2, 0, 0, 0, 1.1, 0.55, 0.92);
  // poison glands behind the eyes, pitted
  [-1, 1].forEach(s=>{
    P(b, fSkin(0.09, 20, 14, 0.006, 30, 4 + s, G2, zDim(G2, 0.7)), 0xffffff, s*0.21, 0.44, 0.0, 0, s*0.35, 0, 0.7, 0.5, 1.4);
    for(let i=0;i<5;i++) P(b, zs(0.008), FC.hole, s*(0.2 + (i % 2)*0.03), 0.475, -0.06 + i*0.03);
  });
  // warts all over his back and head
  for(let i=0;i<46;i++){
    const u = PI*0.45 + rnd()*PI*1.1, v = -0.1 + rnd()*1.25, r = 0.02 + rnd()*0.022;
    const x = Math.sin(u)*Math.cos(v)*0.32*1.18, y = 0.26 + Math.sin(v)*0.32*0.76, z = -0.03 + Math.cos(u)*Math.cos(v)*0.32*1.08;
    P(b, K.lump(r, 1, 0.4, i + (twin ? 50 : 0)), i % 3 ? WART : zDim(WART, 0.75), x*1.0, y, z, 0, 0, 0, 1, 0.75, 1);
  }
  for(let i=0;i<10;i++){ const x = (rnd() - 0.5)*0.4, z = 0.1 + rnd()*0.2; if(Math.abs(Math.abs(x) - 0.15) < 0.07 && z > 0.17) continue; P(b, K.lump(0.014 + rnd()*0.012, 1, 0.4, 90 + i), WART, x, 0.37 + 0.16*Math.sqrt(Math.max(0, 1 - (x/0.32)*(x/0.32) - ((z - 0.17)/0.245)*((z - 0.17)/0.245))), z); }
  // the eyes: raised, slit-pupilled, glowing dully under heavy lids; the left one scarred half shut
  [-1, 1].forEach(s=>{
    P(b, fSkin(0.095, 24, 18, 0.004, 25, 5 + s, G1, G2), 0xffffff, s*0.15, 0.495, 0.21);
    P(b, S(0.064, 16, 12), 0x24160a, s*0.15, 0.52, 0.248);
    glow(R, b, 0.052, s < 0 ? zDim(IRIS, 0.7) : IRIS, s*0.15, 0.52, 0.272);
    halo(R, b, IRIS, s < 0 ? 0.2 : 0.28, s*0.15, 0.53, 0.31, 0.7);
    P(b, BX(0.011, 0.07, 0.008), FC.hole, s*0.15, 0.518, 0.326);
    const lid = P(b, new THREE.SphereGeometry(0.072, 24, 10, 0, PI*2, 0, PI*0.5), G2, s*0.15, 0.52, 0.256);
    lid.rotation.set(s < 0 ? -0.35 : -0.75, 0, s*0.35);
    P(b, zto(0.058, 0.013, PI), G2, s*0.15, 0.515, 0.29, 0.2, 0, PI);
    P(b, K.lump(0.04, 1, 0.3, 7 + s), G2, s*0.16, 0.575, 0.2, 0, 0, s*0.4, 1.3, 0.6, 1);
  });
  // a scar down over the left eye, stitched; another across his back
  { const c0 = [-0.15, 0.52, 0.256], pts = [[-0.7, 0.4, -0.6], [-0.35, 0.85, 0.1], [-0.05, 0.75, 0.66], [0.1, 0.2, 0.98]].map(d=>{ const m = Math.hypot(d[0], d[1], d[2]); return [c0[0] + d[0]/m*0.078, c0[1] + d[1]/m*0.078, c0[2] + d[2]/m*0.078]; });
    pts.push([-0.12, 0.37, 0.4]);
    P(b, K.tube(pts, 0.005, 14, 5), FC.scar);
    [1, 2].forEach(i=> P(b, zcy(0.003, 0.003, 0.03, 4), 0x2a2018, pts[i][0], pts[i][1] + 0.003, pts[i][2], 0.5, 0, 1.2)); }
  { const pts = []; for(let i=0;i<=8;i++){ const u = PI*0.75 + i*0.08, v = 0.35 + i*0.06; pts.push([Math.sin(u)*Math.cos(v)*0.39, 0.26 + Math.sin(v)*0.25, -0.03 + Math.cos(u)*Math.cos(v)*0.355]); }
    P(b, K.tube(pts, 0.008, 16, 5), FC.scar);
    pts.forEach((p, i)=>{ if(i % 2) P(b, BX(0.004, 0.035, 0.006), 0x2a2018, p[0], p[1], p[2], 0.6, 0.8, 0.3); }); }
  // the mouth: wide, down at the corners, a rusty ring through one side
  { const pts = []; for(let i=0;i<=16;i++){ const q = -1.2 + i/16*2.4; pts.push([Math.sin(q)*0.29, 0.325 - Math.pow(q/1.2, 2)*0.07, 0.16 + Math.cos(q)*0.244]); }
    P(b, K.tube(pts, 0.01, 32, 6), FC.mouth);
    P(b, K.tube(pts.map(p=> [p[0]*1.02, p[1] + 0.014, p[2] + 0.003]), 0.009, 32, 5), zDim(G2, 0.9)); }
  P(b, zto(0.024, 0.006), FC.rust, 0.27, 0.25, 0.27, 0.3, 1.1, 0);
  [-1, 1].forEach(s=> P(b, zs(0.011), FC.hole, s*0.04, 0.425, 0.405, 0, 0, 0, 1, 0.6, 1));
  // legs: thick folded haunches, long webbed toes with knuckled tips
  [-1, 1].forEach(s=>{
    P(b, fSkin(0.13, 22, 16, 0.006, 20, 8 + s, G1, G2, BELLY), 0xffffff, s*0.27, 0.17, -0.12, 0, 0, 0, 0.8, 1, 1.3);
    P(b, fSkin(0.1, 20, 12, 0.005, 20, 9 + s, G2, zDim(G2, 0.8)), 0xffffff, s*0.31, 0.04, 0.03, 0, s*0.2, 0, 1, 0.35, 1.5);
    [-0.5, -0.15, 0.2, 0.55].forEach((a, k)=>{ const ang = a + s*0.25, l = 0.12 + (k % 2)*0.03; const x0 = s*0.31, z0 = 0.1;
      const tip = [x0 + Math.sin(ang)*l, 0.018, z0 + Math.cos(ang)*l];
      P(b, zTaper([[x0, 0.035, z0 - 0.02], [x0 + Math.sin(ang)*l*0.5, 0.03, z0 + Math.cos(ang)*l*0.5], tip], 0.02, 0.012, 8, 6), G2);
      P(b, zs(0.016), zDim(G2, 0.8), tip[0], tip[1], tip[2], 0, 0, 0, 1, 0.7, 1); });
    // front legs, splayed hands
    P(b, zTaper([[s*0.16, 0.24, 0.24], [s*0.2, 0.12, 0.29], [s*0.2, 0.04, 0.31]], 0.048, 0.034, 10, 10), G1);
    P(b, zs(0.045), G2, s*0.2, 0.025, 0.33, 0, 0, 0, 1.2, 0.4, 1.1);
    [-0.6, -0.1, 0.4].forEach((a, k)=>{ const ang = a + s*0.4, tip = [s*0.2 + Math.sin(ang)*0.08, 0.014, 0.34 + Math.cos(ang)*0.08];
      P(b, zTaper([[s*0.2, 0.025, 0.34], tip], 0.014, 0.01, 6, 6), G2); P(b, zs(0.012), zDim(G2, 0.8), tip[0], tip[1], tip[2]); });
  });
  // a rag knotted round his neck, a bone charm hung from it
  { const t = new THREE.TorusGeometry(0.25, 0.04, 12, 48); K.sculpt(t, 0.008, 25, 2);
    P(b, t, SCARF, 0, 0.27, 0.1, PI/2 - 0.25);
    P(b, K.lump(0.05, 1, 0.3, 3), SCARF, 0.2, 0.27, 0.23);
    [[0.24, 0.18, 0.22, 0.5, 0.15], [0.27, 0.2, 0.15, 0.9, 0.12]].forEach(([x, y, z, r, l])=>{ const g = new THREE.BoxGeometry(0.06, l, 0.02, 2, 6, 1); K.tatter(g, -l*0.2, 3, 0.03, r*7); P(b, g, zDim(SCARF, 0.85), x, y, z, 0, 0, r); });
    P(b, zcy(0.003, 0.003, 0.07, 5), 0x2a1e14, 0.0, 0.2, 0.37, 0.3);
    P(b, CO(0.018, 0.06, 6), FC.bone, 0.0, 0.15, 0.38, PI);
    P(b, zto(0.01, 0.003), FC.brass, 0.0, 0.185, 0.375); }
  // the crown (Royal Crown), hidden until he earns it: rusted iron, a little gold left on the points
  const crown = group(b, 0, 0.6, 0.12); crown.visible = false; R.parts.crown = crown;
  P(crown, CY(0.11, 0.12, 0.07, 24), FC.rust);
  P(crown, zto(0.115, 0.008), 0x8a6a2e, 0, -0.03, 0, PI/2);
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(crown, CO(0.025, 0.09, 6), 0x8a6a2e, Math.cos(a)*0.11, 0.07, Math.sin(a)*0.11); P(crown, zs(0.012), 0x6a1a14, Math.cos(a)*0.118, 0.0, Math.sin(a)*0.118); }
  // what he's learned, he wears
  buffs.forEach(id=>{ if(FROG_OUTFIT[id]) FROG_OUTFIT[id]({ R, b, G1, G2 }); });
  // the tongue: not baked, so the view can stretch it
  const tongue = new THREE.Mesh(CY(0.035, 0.05, 1, 8), K.lambert(0x8a3e48));
  tongue.geometry = tongue.geometry.clone(); tongue.geometry.rotateX(PI/2); tongue.geometry.translate(0, 0, 0.5);
  tongue.position.set(0, 0.33, 0.3); tongue.scale.set(1, 1, 0.01); tongue.visible = false; b.add(tongue); R.parts.tongue = tongue;
  R.h = 0.75;
  finish(R, { w:0.022 });
  return R;
};

/* Gribbus' tricks, worn (head at about (0, 0.37, 0.18), eyes on top at (±0.15, 0.49, 0.25)) */
const FROG_OUTFIT = {
  tongue(c){ P(c.b, zs(0.04), 0x8a3e48, 0.04, 0.31, 0.39, 0, 0, 0, 1, 0.6, 1.3); },
  spit(c){ [[0.12, 0.45, -0.18], [-0.1, 0.42, -0.22], [0.0, 0.5, -0.05], [0.18, 0.35, -0.08]].forEach(([x, y, z], i)=> P(c.b, K.lump(0.03, 1, 0.3, i), 0x6a8a2a, x, y, z, 0, 0, 0, 1, 0.6, 1)); P(c.b, zTaper([[-0.06, 0.32, 0.4], [-0.07, 0.25, 0.41], [-0.065, 0.18, 0.4]], 0.014, 0.004, 6, 6), 0x7a9a2a); glow(c.R, c.b, 0.02, 0x9cff3a, -0.065, 0.2, 0.4); },
  croak(c){ for(let i=0;i<5;i++){ const a = -0.9 + i*0.45; P(c.b, CO(0.02, 0.1, 5), 0x9ab8c8, Math.sin(a)*0.25, 0.22, 0.1 + Math.cos(a)*0.25, PI); } halo(c.R, c.b, 0x8ad8ff, 0.6, 0, 0.2, 0.3, 0.25); },
  hop(c){ [[0, 0.55, -0.22, 0.4], [0.03, 0.47, -0.27, -0.4], [0, 0.39, -0.3, 0.4]].forEach(([x, y, z, r])=> P(c.b, BX(0.035, 0.1, 0.02), 0x9a8a3a, x, y, z, -0.6, 0, r)); glow(c.R, c.b, 0.025, 0xfff04a, 0, 0.47, -0.31); },
  brood(c){ [[-0.12, 0.5, -0.12], [0.08, 0.52, -0.15], [0.0, 0.47, -0.25]].forEach(([x, y, z], i)=>{ P(c.b, zs(0.042), 0x1e261e, x, y, z); P(c.b, zTaper([[x, y, z - 0.03], [x + 0.02, y - 0.01, z - 0.09], [x - 0.01, y - 0.02, z - 0.13]], 0.02, 0.004, 8, 6), 0x2a342a); glow(c.R, c.b, 0.007, 0x9cff3a, x + 0.015, y + 0.02, z + 0.03); }); },
  lily(c){ const pad = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, 0.3, PI*2 - 0.6); K.sculpt(pad, 0.008, 14, 1); P(c.b, pad, 0x3e4a26, 0, 0.62, 0.15, 0.2); for(let k=0;k<5;k++){ const q = k/5*PI*2; P(c.b, zs(0.022), 0xa8909a, 0.06 + Math.cos(q)*0.02, 0.645, 0.18 + Math.sin(q)*0.02, 0, 0, 0, 1, 0.5, 1); } },
  gulp(c){ P(c.b, CO(0.13, 0.16, 3), 0xa89c80, 0, 0.24, 0.34, PI + 0.4, 0, 0, 1, 1, 0.25); P(c.b, zs(0.025), 0x5a3a22, 0.03, 0.2, 0.37, 0, 0, 0, 1, 0.8, 0.3); },
  crown(c){ /* the crown is already on him, hidden until now */ },
  bigboy(c){ [-1, 1].forEach(s=> P(c.b, fSkin(0.08, 16, 12, 0.005, 25, s, c.G1, c.G2), 0xffffff, s*0.22, 0.2, 0.25, 0, 0, 0, 1.3, 1, 1)); },
  flyhunt(c){ const g = group(c.b, 0.15, 0.85, 0.1); c.R.anim.push({ o:g, bob:0.06, speed:11 }); P(g, zs(0.03), 0x1a1a1a, 0, 0, 0, 0, 0, 0, 1, 1, 1.5); glow(c.R, g, 0.012, 0x9cff3a, 0, 0.01, 0.04); [-1, 1].forEach(s=>{ const w = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color:0xb8b8a8, transparent:true, opacity:0.45, side:THREE.DoubleSide })); w.position.set(s*0.05, 0.02, 0); w.rotation.set(-0.5, 0, s*0.5); g.add(w); c.R.glows.push(w); }); },
  mirror(c){ [[-0.1, 0.45, 0.25], [0.15, 0.4, 0.1]].forEach(([x, y, z])=> glow(c.R, c.b, 0.015, 0xd8e0e8, x, y, z)); },
  bubble(c){ P(c.b, CY(0.012, 0.012, 0.15, 6), 0x2a1c12, 0.12, 0.3, 0.4, PI/2, 0, -0.3); P(c.b, CY(0.04, 0.03, 0.06, 10), 0x2a1c12, 0.18, 0.33, 0.47); const bub = new THREE.Mesh(S(0.08, 12, 8), new THREE.MeshPhongMaterial({ color:0x8aa0a8, transparent:true, opacity:0.4, shininess:90 })); bub.position.set(0.2, 0.46, 0.5); c.b.add(bub); c.R.glows.push(bub); c.R.anim.push({ o:bub, bob:0.04, speed:3 }); },
  doom(c){ const h = new THREE.SphereGeometry(0.31, 28, 12, 0, PI*2, 0, PI*0.55); K.tatter(h, 0.12, 9, 0.06, 4); P(c.b, h, 0x1a1418, 0, 0.36, -0.1, -0.5, 0, 0, 1.1, 0.9, 1); [-1, 1].forEach(s=> glow(c.R, c.b, 0.022, 0xff2a1a, s*0.15, 0.52, 0.3)); },
  twin(c){},
  zoomies(c){ P(c.b, zto(0.2, 0.016), 0x3a2a1e, 0, 0.53, 0.18, PI/2 - 0.2); [-1, 1].forEach(s=>{ P(c.b, CY(0.07, 0.07, 0.04, 14), 0x8a6a30, s*0.15, 0.53, 0.29, PI/2 - 0.3); P(c.b, CY(0.055, 0.055, 0.042, 14), 0x8a5a20, s*0.15, 0.535, 0.293, PI/2 - 0.3); }); },
  sticky(c){ P(c.b, zs(0.03), 0x9a6a7a, -0.06, 0.26, 0.39, 0, 0, 0, 1, 1.8, 1); }
};

/* ================================================================== *
 *  Goblins
 * ================================================================== */
const GOB = { skin:0x5ab03a, dark:0x3e7a2a, eye:0xffe14a, cloth:0x7a5230, metal:0x9a9aa8, iron:0x4a4a54 };
function goblinBody(R, o){
  const b = R.body, skin = o.skin || GOB.skin, dark = o.dark || GOB.dark, cloth = o.cloth || GOB.cloth;
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.13, 0.28, 0);
    P(l, CY(0.06, 0.07, 0.24, 8), dark, 0, -0.12, 0);
    P(l, TO(0.068, 0.02), 0xa08a6a, 0, -0.14, 0, PI/2);
    P(l, S(0.09, 10, 6), o.boot || 0x4a3020, 0, -0.25, 0.05, 0, 0, 0, 1, 0.55, 1.5);
    P(l, CO(0.025, 0.06, 4), 0xe8e0c8, 0, -0.25, 0.19, PI/2);
    legs.push(l);
  });
  R.parts.legs = legs;
  P(b, S(0.3, 16, 12), skin, 0, 0.5, 0, 0, 0, 0, 1.02, 0.92, 0.95);
  P(b, S(0.13, 10, 8), 0x8ad05a, 0, 0.5, 0.2, 0, 0, 0, 1.1, 1, 0.5);
  P(b, K.lathe([[0.28, 0], [0.31, 0.08], [0.29, 0.2], [0.22, 0.3]], 14), cloth, 0, 0.32, 0);
  belt(b, 0.29, 0.52, 0x3a2414, 0xb8b8c0);
  P(b, BX(0.16, 0.2, 0.03), cloth, 0, 0.36, 0.3, 0.12);
  P(b, BX(0.16, 0.03, 0.035), 0x3a2414, 0, 0.27, 0.315, 0.12);
  // head: ears out to here, a nose like a parsnip, teeth, warts
  const head = group(b, 0, 0.88, 0.04); R.parts.head = head;
  P(head, S(0.22, 16, 12), skin, 0, 0, 0, 0, 0, 0, 1.05, 0.92, 0.95);
  [-1, 1].forEach(s=>{
    P(head, CO(0.1, 0.42, 8), skin, s*0.3, 0.06, -0.02, 0, s*0.3, -s*1.3, 1, 1, 0.45);
    P(head, CO(0.06, 0.3, 6), 0xd88a8a, s*0.29, 0.06, 0.0, 0, s*0.3, -s*1.3, 1, 1, 0.3);
    if(s > 0) P(head, TO(0.03, 0.008), GOLD, s*0.4, 0.02, 0.02, 0, PI/2);
  });
  P(head, CO(0.06, 0.22, 8), skin, 0, -0.03, 0.26, PI/2 + 0.3);
  [-1, 1].forEach(s=> P(head, S(0.012, 4, 3), 0x1a2a10, s*0.025, -0.07, 0.31));
  P(head, S(0.025, 6, 4), dark, 0.12, 0.12, 0.15); P(head, S(0.02, 6, 4), dark, -0.15, -0.05, 0.14);
  [-1, 1].forEach(s=>{
    glow(R, head, 0.05, o.eye || GOB.eye, s*0.09, 0.05, 0.17);
    P(head, S(0.022, 6, 4), 0x101010, s*0.09, 0.05, 0.215);
    P(head, BX(0.1, 0.025, 0.03), dark, s*0.09, 0.12, 0.17, 0, 0, s*0.35);
    P(head, CO(0.02, 0.06, 4), 0xf4f0d8, s*0.05, -0.12, 0.17, PI);
  });
  P(head, BX(0.14, 0.03, 0.03), 0x2a1010, 0, -0.1, 0.18);
  const arm = s=>{
    const a = group(b, s*0.31, 0.62, 0.05);
    P(a, CY(0.05, 0.055, 0.3, 8), skin, 0, -0.13, 0);
    P(a, TO(0.055, 0.016), 0xa08a6a, 0, -0.22, 0, PI/2);
    P(a, S(0.07, 8, 6), skin, 0, -0.29, 0.04);
    [-0.03, 0, 0.03].forEach(x=> P(a, CO(0.012, 0.04, 4), 0xe8e0c8, x, -0.33, 0.08, PI*0.75));
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  R.hand = group(R.parts.armR, 0, -0.3, 0.06);
  return head;
}
const KITS = {
  grunt(R, head){
    P(head, S(0.21, 12, 6), 0x8a7a6a, 0, 0.09, 0, 0, 0, 0, 1, 0.55, 1);
    P(head, TO(0.2, 0.02), 0x6a5a4a, 0, 0.07, 0, PI/2);
    P(head, CO(0.03, 0.1, 4), 0x6a5a4a, 0, 0.22, 0);
    P(R.hand, BX(0.04, 0.12, 0.42), GOB.metal, 0, 0, 0.2); P(R.hand, BX(0.05, 0.05, 0.12), 0x4a3020, 0, 0, -0.03); P(R.hand, BX(0.16, 0.03, 0.04), GOB.iron, 0, 0, 0.02);
    // a round wooden shield on the other arm
    const sh = group(R.parts.armL, -0.04, -0.2, 0.1);
    P(sh, CY(0.2, 0.2, 0.04, 14), 0x8a5a30, 0, 0, 0, PI/2);
    P(sh, TO(0.2, 0.022), GOB.iron, 0, 0, 0.0);
    P(sh, S(0.055, 8, 6), GOB.metal, 0, 0, 0.03);
    P(sh, BX(0.38, 0.03, 0.03), 0x5a3a1a, 0, 0, 0.025, 0, 0, 0.5);
  },
  slinger(R, head){
    P(head, CO(0.26, 0.3, 10), 0x6a5a3a, 0, 0.15, -0.03);
    P(head, CO(0.04, 0.16, 4), 0xe8e0c8, 0.08, 0.25, -0.08, 0, 0, -0.6);
    P(R.hand, TO(0.1, 0.012, PI), 0x8a6a4a, 0, -0.08, 0.05, 0, PI/2);
    P(R.hand, S(0.06, 8, 6), 0x9a9a9a, 0, -0.18, 0.05);
    P(R.body, BX(0.18, 0.18, 0.09), 0x6a4a2a, -0.2, 0.42, -0.25);
    [-0.25, -0.15].forEach(x=> P(R.body, S(0.04, 6, 4), 0x9a9a9a, x, 0.53, -0.25));
    P(R.body, TO(0.33, 0.022), 0x4a3020, 0, 0.6, 0, PI/2, 0.7, 0);
  },
  bomber(R, head){
    P(R.hand, S(0.13, 12, 8), 0x1a1a22, 0, 0, 0.08);
    P(R.hand, CY(0.02, 0.02, 0.08, 6), 0x8a6a4a, 0, 0.13, 0.08);
    glow(R, R.hand, 0.035, 0xffa040, 0, 0.18, 0.08);
    P(R.body, TO(0.31, 0.045), 0x4a3020, 0, 0.55, 0, PI/2, 0.6);
    for(let i=0;i<5;i++){ const a = -0.9 + i*0.45; P(R.body, S(0.055, 8, 6), 0x1a1a22, Math.sin(a)*0.33, 0.55 + Math.sin(a)*0.18, Math.cos(a)*0.33); }
    [-1, 1].forEach(s=>{ P(head, CY(0.065, 0.065, 0.05, 12), 0x88d8ff, s*0.09, 0.07, 0.19, PI/2); P(head, TO(0.065, 0.015), 0x6a4a2a, s*0.09, 0.07, 0.215); });
    P(head, TO(0.2, 0.02), 0x3a2a1a, 0, 0.07, 0.02, 0, 0, 0, 1, 1, 0.9);
    P(head, S(0.16, 10, 6), 0x7a5a3a, 0, 0.12, -0.04, 0, 0, 0, 1, 0.6, 1);
  },
  shaman(R, head){
    P(R.hand, CY(0.025, 0.025, 1.15, 6), 0x5a3a20, 0, 0.32, 0.05);
    P(R.hand, S(0.1, 10, 8), 0xece4cc, 0, 0.92, 0.05);
    [-1, 1].forEach(s=> P(R.hand, S(0.025, 6, 4), 0x101010, s*0.035, 0.94, 0.13));
    [0.6, 0.7].forEach(y=> P(R.hand, CO(0.02, 0.12, 4), 0xff4fd8, 0.04, y, 0.05, 0, 0, -2.6));
    R.parts.gem = glow(R, R.hand, 0.055, 0x9cff3a, 0, 1.03, 0.05);
    halo(R, R.hand, 0x9cff3a, 0.6, 0, 1.03, 0.05, 0.5);
    for(let i=0;i<5;i++) P(head, CO(0.04, 0.32, 4), [0xff4a4a, 0xffd23d, 0x46e4ff, 0xff4fd8, 0x9cff3a][i], (i - 2)*0.08, 0.28, -0.08, 0, 0, (i - 2)*0.25);
    P(head, CY(0.16, 0.18, 0.14, 10), 0xd8c8a0, 0, 0.02, 0.15, PI/2);
    [-1, 1].forEach(s=>{ P(head, S(0.04, 6, 4), 0x101010, s*0.07, 0.04, 0.23); P(head, BX(0.02, 0.1, 0.01), 0xc83a3a, s*0.07, -0.05, 0.225); });
    // a necklace of teeth
    for(let i=0;i<7;i++){ const a = -1.1 + i*0.37; P(R.body, CO(0.022, 0.07, 4), 0xf4f0d8, Math.sin(a)*0.25, 0.7, Math.cos(a)*0.25, PI); }
  },
  brute(R, head){
    P(R.hand, CY(0.12, 0.05, 0.8, 8), 0x6a4a2a, 0, 0, 0.3, PI/2);
    P(R.hand, TO(0.11, 0.02), GOB.iron, 0, 0, 0.5);
    for(let i=0;i<5;i++) P(R.hand, CO(0.03, 0.09, 4), GOB.metal, Math.cos(i*1.3)*0.11, Math.sin(i*1.3)*0.11, 0.6);
    // iron pauldrons with spikes, a chain round the belly
    [-1, 1].forEach(s=>{
      P(R.body, new THREE.SphereGeometry(0.16, 12, 8, 0, PI*2, 0, PI/2), GOB.iron, s*0.3, 0.72, 0, 0, 0, -s*0.4);
      P(R.body, CO(0.035, 0.14, 5), GOB.metal, s*0.36, 0.86, 0, 0, 0, -s*0.5);
      P(head, CO(0.05, 0.22, 6), 0xe8e0c8, s*0.16, 0.18, 0, 0, 0, -s*0.6);
    });
    P(head, S(0.22, 12, 6), 0x5a5a64, 0, 0.08, 0, 0, 0, 0, 1, 0.5, 1);
    P(head, BX(0.03, 0.12, 0.2), GOB.iron, 0, 0.0, 0.18);
    for(let i=0;i<10;i++){ const a = i/10*PI*2; P(R.body, TO(0.035, 0.01), GOB.iron, Math.cos(a)*0.31, 0.45, Math.sin(a)*0.31, 0, -a, i % 2 ? PI/2 : 0); }
    P(R.body, BX(0.02, 0.16, 0.02), 0xc86a6a, 0.08, 0.6, 0.29, 0, 0, 0.6);
  },
  sneak(R, head){
    P(head, CO(0.29, 0.52, 10), 0x22222c, 0, 0.13, -0.04);
    P(head, CY(0.2, 0.22, 0.12, 12), 0x2a2a38, 0, -0.08, 0.03);
    P(R.hand, BX(0.03, 0.05, 0.3), 0xb8c0d0, 0, 0, 0.13); P(R.hand, BX(0.1, 0.02, 0.03), 0x3a3a48, 0, 0, -0.02);
    P(R.body, K.lathe([[0.36, 0], [0.32, 0.3], [0.22, 0.55]], 14), 0x22222c, 0, 0.25, -0.06, 0, 0, 0, 1, 1, 0.85);
    P(R.body, BX(0.06, 0.25, 0.03), 0x3a3a48, 0.18, 0.45, -0.28, 0, 0, 0.5);
  },
  merchant(R, head){
    P(head, CY(0.17, 0.2, 0.3, 12), 0x2a2a3a, 0, 0.3, 0);
    P(head, CY(0.3, 0.3, 0.03, 16), 0x2a2a3a, 0, 0.16, 0);
    P(head, CY(0.18, 0.18, 0.06, 12), 0xa02a2a, 0, 0.2, 0);
    P(head, BX(0.04, 0.12, 0.02), 0xffd23d, 0.12, 0.3, 0.14, 0, 0, -0.3);
    P(R.body, BX(0.42, 0.52, 0.26), 0x6a4a2a, 0, 0.6, -0.3);
    P(R.body, BX(0.44, 0.06, 0.28), 0x4a3020, 0, 0.62, -0.3);
    [[-0.26, 0.5], [0.26, 0.45]].forEach(([x, y])=>{ P(R.body, CY(0.07, 0.06, 0.12, 8), 0xb8683a, x, y, -0.3); P(R.body, TO(0.04, 0.01), 0x4a3020, x, y + 0.08, -0.3); });
    P(R.body, CY(0.04, 0.04, 0.5, 8), 0xf0e6c8, 0, 0.92, -0.32, 0, 0, PI/2);
    P(head, TO(0.05, 0.01), GOLD, 0.09, 0.05, 0.21);
  },
  king(R, head){
    const crown = group(head, 0, 0.2, 0); R.parts.crown = crown;
    P(crown, CY(0.17, 0.19, 0.12, 12), GOLD);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(crown, CO(0.035, 0.12, 4), GOLD, Math.cos(a)*0.17, 0.11, Math.sin(a)*0.17); P(crown, S(0.022, 6, 4), [0xff3a6a, 0x46e4ff][i % 2], Math.cos(a)*0.18, 0.02, Math.sin(a)*0.18); }
    glow(R, crown, 0.035, 0xff3a6a, 0, 0.02, 0.19);
    P(R.body, K.lathe([[0.42, 0], [0.4, 0.4], [0.3, 0.72]], 16), 0xa02a2a, 0, 0.2, -0.05, 0, 0, 0, 1, 1, 0.8);
    // a fur collar, spotted like ermine
    for(let i=0;i<12;i++){ const a = i/12*PI*2; P(R.body, S(0.09, 8, 6), 0xf4f0e8, Math.cos(a)*0.3, 0.84, Math.sin(a)*0.28 - 0.02); if(i % 3 === 0) P(R.body, S(0.025, 4, 3), 0x101010, Math.cos(a)*0.37, 0.86, Math.sin(a)*0.35 - 0.02); }
    P(R.hand, CY(0.03, 0.03, 0.85, 6), GOLD, 0, 0.2, 0.1);
    P(R.hand, TO(0.08, 0.02), GOLD, 0, 0.6, 0.1, PI/2);
    glow(R, R.hand, 0.07, 0xff3a6a, 0, 0.64, 0.1);
    P(R.body, S(0.36, 14, 10), GOB.skin, 0, 0.52, 0.06, 0, 0, 0, 1.2, 1, 1.15);
    P(R.body, S(0.03, 6, 4), GOB.dark, 0, 0.45, 0.47);
    [-1, 1].forEach(s=> P(head, TO(0.04, 0.012), GOLD, s*0.36, -0.02, 0.0, 0, PI/2));
  }
};
Models.goblin = function(kind){
  const R = rig(kind);
  const size = { grunt:1, slinger:0.92, bomber:1, shaman:1, brute:1.75, sneak:0.95, merchant:1, king:2.5 }[kind] || 1;
  const skin = kind === "brute" ? 0x4a8a30 : kind === "king" ? 0x6ab040 : kind === "sneak" ? 0x3e6a3a : GOB.skin;
  const head = goblinBody(R, { skin, cloth:kind === "shaman" ? 0x4a2a6a : kind === "king" ? 0xa02a2a : kind === "sneak" ? 0x2a2a38 : GOB.cloth, eye:kind === "shaman" ? 0x9cff3a : kind === "sneak" ? 0xff4a3a : GOB.eye });
  (KITS[kind] || KITS.grunt)(R, head);
  R.body.scale.setScalar(size);
  R.h = 1.25*size; R.size = size;
  return finish(R);
};

/* ================================================================== *
 *  Shroom folk
 * ================================================================== */
function capSpots(parent, r, y, n, col, scale){
  for(let i=0;i<n;i++){
    const a = i*2.4, e = 0.25 + (i % 3)*0.18;
    P(parent, S(r*0.13, 8, 6), col, Math.cos(a)*Math.cos(e)*r*(scale || 1), y + Math.sin(e)*r*0.62, Math.sin(a)*Math.cos(e)*r*(scale || 1), 0, 0, 0, 1, 0.5, 1);
  }
}
Models.puffling = function(){
  const R = rig("puffling"), b = R.body;
  P(b, S(0.3, 16, 12), 0xe8dcb8, 0, 0.34, 0);
  P(b, S(0.24, 12, 8), 0xf4ead0, 0, 0.3, 0.1, 0, 0, 0, 1, 0.8, 0.7);
  [[0.1, 0.55, 0.12], [-0.14, 0.48, 0.18], [0.2, 0.36, 0.2], [-0.05, 0.6, -0.08], [-0.2, 0.4, -0.12], [0.22, 0.5, -0.1]].forEach(([x, y, z])=> P(b, S(0.04, 6, 4), 0xc8b890, x, y, z));
  // the puff hole on top, ringed and dusty
  P(b, TO(0.07, 0.025), 0xb8a880, 0, 0.62, 0, PI/2);
  glow(R, b, 0.05, 0xc8ff8a, 0, 0.63, 0);
  eyes(b, 0.09, 0.4, 0.24, 0.05);
  brows(b, 0.09, 0.47, 0.27, 0x8a7a5a, "angry", 0.07);
  mouth(b, 0, 0.29, 0.28, 0.05, 0.6);
  [-1, 1].forEach(s=>{ P(b, S(0.07, 8, 6), 0xc8b890, s*0.13, 0.05, 0.03, 0, 0, 0, 1, 0.6, 1.3); P(b, S(0.05, 8, 6), 0xe0d4b0, s*0.3, 0.32, 0.05, 0, 0, 0, 1.3, 0.8, 0.8); });
  R.h = 0.7; return finish(R);
};
Models.toadstool = function(){
  const R = rig("toadstool"), b = R.body;
  P(b, K.lathe([[0.26, 0], [0.24, 0.2], [0.2, 0.45], [0.22, 0.6], [0, 0.62]], 14), 0xf0e8d8);
  P(b, TO(0.23, 0.04), 0xe0d4c0, 0, 0.5, 0, PI/2);
  // moss and grass at the foot
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(b, CO(0.03, 0.14, 4), 0x5a8a3a, Math.cos(a)*0.28, 0.06, Math.sin(a)*0.28, Math.sin(a)*0.3, 0, -Math.cos(a)*0.3); }
  const cap = group(b, 0, 0.62, 0); R.parts.head = cap;
  P(cap, new THREE.SphereGeometry(0.5, 18, 10, 0, PI*2, 0, PI/2), 0xd8302a, 0, 0, 0, 0, 0, 0, 1, 0.75, 1);
  P(cap, new THREE.CircleGeometry(0.5, 18), 0xd8c8b0, 0, 0.0, 0, PI/2);
  gills(cap, 0.48, -0.015, 0xb8a890, 16);
  capSpots(cap, 0.5, 0.02, 9, 0xfaf4ea);
  eyes(b, 0.08, 0.38, 0.22, 0.045);
  brows(b, 0.08, 0.45, 0.24, 0x3a1a10, "angry", 0.08);
  mouth(b, 0, 0.27, 0.23, 0.06, 0.4);
  teeth(b, 0.29, 0.25, 0.08, 3);
  [-1, 1].forEach(s=>{ const a = group(b, s*0.24, 0.35, 0); P(a, CY(0.04, 0.045, 0.22, 8), 0xf0e8d8, 0, -0.1, 0, 0, 0, s*0.4); P(a, S(0.05, 8, 6), 0xf0e8d8, s*0.05, -0.2, 0.02); });
  R.h = 1.1; return finish(R);
};
function shroomPerson(R, size, capCol, spotCol){
  const b = R.body;
  const legs = [];
  [-1, 1].forEach(s=>{ const l = group(b, s*0.11, 0.2, 0); P(l, CY(0.06, 0.07, 0.2, 8), 0xe8dcc8, 0, -0.1, 0); P(l, S(0.07, 8, 6), 0x8a6a4a, 0, -0.2, 0.04, 0, 0, 0, 1, 0.5, 1.4); legs.push(l); });
  R.parts.legs = legs;
  P(b, K.lathe([[0.18, 0], [0.22, 0.15], [0.2, 0.4], [0.16, 0.55], [0, 0.56]], 14), 0xf0e6d4, 0, 0.18, 0);
  // a belt of leaves
  for(let i=0;i<9;i++){ const a = i/9*PI*2; P(b, CO(0.05, 0.16, 4), [0x5a9a3a, 0x7ab84a][i % 2], Math.cos(a)*0.22, 0.28, Math.sin(a)*0.22, PI + Math.sin(a)*0.35, 0, Math.cos(a)*0.35, 1, 1, 0.5); }
  const cap = group(b, 0, 0.72, 0); R.parts.head = cap;
  P(cap, new THREE.SphereGeometry(0.42, 16, 10, 0, PI*2, 0, PI/2), capCol, 0, -0.04, 0, 0, 0, 0, 1, 0.7, 1);
  P(cap, new THREE.CircleGeometry(0.42, 16), 0xc8b8a0, 0, -0.04, 0, PI/2);
  gills(cap, 0.4, -0.055, 0xa89880, 14);
  P(cap, CO(0.05, 0.12, 6), capCol, 0.05, 0.3, 0, 0, 0, -0.4);
  capSpots(cap, 0.42, -0.02, 8, spotCol);
  eyes(b, 0.07, 0.56, 0.18, 0.042);
  brows(b, 0.07, 0.62, 0.2, 0x5a4a3a, "angry", 0.07);
  P(b, TO(0.05, 0.01, PI), 0x3a2a1a, 0, 0.47, 0.21, 0, 0, PI);
  const arm = s=>{ const a = group(b, s*0.22, 0.52, 0.03); P(a, CY(0.04, 0.045, 0.24, 8), 0xe8dcc8, 0, -0.11, 0); P(a, S(0.055, 8, 6), 0xe8dcc8, 0, -0.24, 0.03); return a; };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  P(R.parts.armR, CY(0.02, 0.02, 0.4, 6), 0x6a4a2a, 0, -0.24, 0.1, PI/2 - 0.3);
  P(R.parts.armR, CO(0.04, 0.1, 4), 0xb8b8c0, 0, -0.18, 0.31, PI/2 - 0.3);
  b.scale.setScalar(size); R.h = 1.1*size; R.size = size;
}
Models.shroomkin = function(){ const R = rig("shroomkin"); shroomPerson(R, 1.15, 0x8a4ab0, 0xe8d8ff); return finish(R); };
Models.shroomlet = function(){ const R = rig("shroomlet"); shroomPerson(R, 0.6, 0xb84ad0, 0xfff0ff); return finish(R); };

/* ================================================================== *
 *  The haunted
 * ================================================================== */
function sheet(R, col, h, w){
  // a sheet ghost: a turned shape with a wavy hem
  const prof = [[0, h], [w*0.5, h - 0.04], [w*0.72, h - 0.2], [w*0.78, h*0.55], [w*0.82, h*0.25], [w*0.9, 0.08], [w*0.75, 0.02], [0, 0.06]];
  const g = K.lathe(prof, 18);
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const x = a.getX(i), z = a.getZ(i), y = a.getY(i); if(y < 0.15){ const ang = Math.atan2(z, x); a.setY(i, y + Math.sin(ang*6)*0.05); } }
  g.computeVertexNormals();
  return g;
}
Models.ghost = function(){
  const R = rig("ghost"), b = R.body;
  const float = group(b, 0, 0.25, 0); R.parts.head = float;
  P(float, sheet(R, 0, 1.0, 0.5), 0xe8f2ff);
  // eye holes, an "oooh" mouth, patches where the sheet was mended
  [-1, 1].forEach(s=>{ P(float, S(0.075, 10, 8), 0x101020, s*0.12, 0.7, 0.33, 0, 0, 0, 1, 1.4, 0.5); glow(R, float, 0.022, 0x9cf0ff, s*0.12, 0.72, 0.37); });
  P(float, S(0.06, 8, 6), 0x101020, 0, 0.52, 0.36, 0, 0, 0, 1.2, 1.5, 0.5);
  P(float, BX(0.14, 0.12, 0.02), 0xc8d8f0, -0.2, 0.42, 0.34, 0, -0.5, 0.2);
  [0, 1, 2].forEach(i=> P(float, BX(0.012, 0.03, 0.01), 0x6a7a9a, -0.26 + i*0.05, 0.42, 0.36, 0, -0.5, 0.2));
  // little arms out front, booing
  [-1, 1].forEach(s=>{ const a = group(float, s*0.36, 0.5, 0.12); P(a, CY(0.06, 0.08, 0.22, 8), 0xe8f2ff, 0, 0, 0.08, PI/2 - 0.3, 0, s*0.3); P(a, S(0.07, 8, 6), 0xe8f2ff, s*0.03, 0.04, 0.2); });
  // a shackle and its iron ball, dragged along
  chain(b, [0.15, 0.22, 0.05], [0.42, 0.06, 0.15], 5);
  P(b, S(0.11, 10, 8), 0x3a3a44, 0.48, 0.1, 0.18);
  P(float, TO(0.07, 0.02), 0x4a4a54, 0.15, 0.04, 0.05, PI/2);
  halo(R, float, 0xa8d8ff, 1.6, 0, 0.5, 0, 0.35);
  R.h = 1.4; R.ghostly = true; return finish(R);
};
Models.banshee = function(){
  const R = rig("banshee"), b = R.body;
  const float = group(b, 0, 0.3, 0); R.parts.head = float;
  P(float, sheet(R, 0, 1.25, 0.46), 0xb8d0ff);
  // a torn under-dress, darker, hanging lower
  P(float, sheet(R, 0, 0.7, 0.52), 0x6a7ab8, 0, -0.12, 0);
  P(float, K.lathe([[0, 1.32], [0.3, 1.2], [0.36, 0.9], [0.34, 0.55], [0.0, 0.5]], 14), 0x2a2a48, 0, 0, -0.06, 0, 0, 0, 1, 1, 0.8);
  P(float, S(0.2, 12, 10), 0xd8e4ff, 0, 1.0, 0.1);
  // long hair streaming down her back
  for(let i=0;i<7;i++){ const x = (i - 3)*0.07; P(float, K.tube([[x*0.8, 1.18, 0.0], [x*1.4, 0.95, -0.25], [x*1.8 + Math.sin(i)*0.05, 0.6, -0.4], [x*2.2, 0.25, -0.45]], 0.035, 10, 5), 0x3a3a6a); }
  [-1, 1].forEach(s=>{ glow(R, float, 0.035, 0x9cf0ff, s*0.07, 1.04, 0.28); P(float, BX(0.07, 0.02, 0.02), 0x2a2a48, s*0.07, 1.1, 0.28, 0, 0, s*-0.45); });
  // the wail: a mouth stretched wide open
  P(float, S(0.065, 8, 6), 0x101020, 0, 0.9, 0.27, 0, 0, 0, 1, 1.9, 0.5);
  // bony arms reaching, long fingers
  [-1, 1].forEach(s=>{
    const a = group(float, s*0.36, 0.85, 0.05);
    P(a, CY(0.04, 0.06, 0.5, 8), 0xb8d0ff, 0, 0.2, 0.05, 0.5, 0, -s*0.4);
    for(let f=0;f<4;f++) P(a, CO(0.012, 0.14, 4), 0xd8e4ff, s*(0.12 + f*0.02) - s*0.03, 0.42 + f*0.02, 0.2, -0.8, 0, -s*0.4);
  });
  P(float, TO(0.17, 0.02), 0x8a9ac8, 0, 0.78, 0.0, PI/2 + 0.2);
  halo(R, float, 0x8ab8ff, 2, 0, 0.8, 0, 0.35);
  R.h = 1.7; R.ghostly = true; return finish(R);
};
Models.skeleton = function(){
  const R = rig("skeleton"), b = R.body, BONE = 0xe8e2cc, RUST = 0x8a5a3a;
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.1, 0.42, 0);
    P(l, CY(0.03, 0.03, 0.2, 6), BONE, 0, -0.1, 0); P(l, S(0.042, 8, 6), BONE, 0, -0.21, 0.01); P(l, CY(0.027, 0.027, 0.18, 6), BONE, 0, -0.31, 0);
    P(l, BX(0.08, 0.04, 0.16), BONE, 0, -0.4, 0.04); legs.push(l);
  });
  R.parts.legs = legs;
  P(b, K.lathe([[0.04, 0], [0.14, 0.03], [0.15, 0.1], [0.08, 0.12]], 10), BONE, 0, 0.38, 0);
  for(let i=0;i<5;i++) P(b, S(0.03, 6, 4), BONE, 0, 0.5 + i*0.07, -0.06);
  P(b, BX(0.035, 0.24, 0.03), BONE, 0, 0.72, 0.13);
  [0.6, 0.68, 0.76, 0.84].forEach((y, i)=> P(b, TO(0.15 - Math.abs(i - 1.5)*0.015, 0.02, PI*1.6), BONE, 0, y, 0.02, PI/2, 0, PI*0.7, 1, 1.15, 1));
  [-1, 1].forEach(s=> P(b, S(0.05, 8, 6), BONE, s*0.19, 0.9, 0.0));
  // a rusty helmet, a quiver of arrows on the back
  const head = group(b, 0, 1.02, 0.02); R.parts.head = head;
  P(head, S(0.17, 14, 10), BONE);
  P(head, BX(0.2, 0.08, 0.14), BONE, 0, -0.12, 0.05);
  teeth(head, -0.1, 0.12, 0.13, 5, 0xf8f4e4);
  [-1, 1].forEach(s=>{ P(head, S(0.05, 8, 6), 0x101010, s*0.065, 0.02, 0.13); glow(R, head, 0.018, 0xff4a3a, s*0.065, 0.02, 0.16); });
  P(head, CO(0.025, 0.05, 3), 0x101010, 0, -0.04, 0.16, PI/2 + 0.6);
  P(head, new THREE.SphereGeometry(0.19, 12, 8, 0, PI*2, 0, PI*0.42), RUST, 0, 0.0, -0.01, -0.15);
  P(head, CO(0.03, 0.12, 5), RUST, 0, 0.21, -0.03);
  P(b, CY(0.07, 0.06, 0.4, 8), 0x6a4a2a, 0.08, 0.8, -0.18, 0.2, 0, -0.3);
  [-0.03, 0.03, 0.08].forEach(x=>{ P(b, CY(0.008, 0.008, 0.3, 4), 0xc8a87a, 0.08 + x, 1.02, -0.22, 0.2, 0, -0.3); P(b, CO(0.025, 0.07, 3), 0xd84a3a, 0.14 + x, 1.15, -0.25, 0.2, 0, -0.3); });
  const arm = s=>{ const a = group(b, s*0.2, 0.86, 0.02); P(a, CY(0.025, 0.025, 0.16, 6), BONE, 0, -0.08, 0); P(a, S(0.035, 6, 4), BONE, 0, -0.17, 0); P(a, CY(0.022, 0.022, 0.15, 6), BONE, 0, -0.26, 0); return a; };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  R.hand = group(R.parts.armL, 0, -0.32, 0.05);
  P(R.hand, TO(0.3, 0.02, PI), 0x6a4a2a, 0, 0, 0.05, 0, PI/2, PI/2);
  P(R.hand, CY(0.004, 0.004, 0.6, 3), 0xe8e8e8, 0, 0, -0.0);
  R.h = 1.25; return finish(R);
};
Models.poltergeist = function(){
  const R = rig("poltergeist"), b = R.body;
  const float = group(b, 0, 0.35, 0); R.parts.head = float;
  P(float, K.lathe([[0, 1.0], [0.28, 0.9], [0.38, 0.55], [0.3, 0.2], [0.1, 0.0], [0, 0.0]], 16), 0x3a2a5a);
  P(float, K.tube([[0, 0.05, 0], [0.12, -0.12, -0.1], [-0.05, -0.25, -0.2], [0.1, -0.32, -0.3]], 0.05, 10, 6), 0x3a2a5a);
  [-1, 1].forEach(s=>{ glow(R, float, 0.05, 0xb8ff6a, s*0.1, 0.72, 0.28); P(float, BX(0.1, 0.025, 0.03), 0x1a0a2a, s*0.1, 0.8, 0.3, 0, 0, s*0.5); });
  // a jagged grin
  P(float, S(0.14, 10, 6), 0x0a0410, 0, 0.5, 0.26, 0, 0, 0, 1, 0.35, 0.4);
  teeth(float, 0.53, 0.32, 0.22, 6, 0xd8ffb0);
  // the junk it throws, orbiting: a pot, a book, a cup, a fork
  const orbit = group(b, 0, 0.8, 0); R.parts.orbit = orbit;
  const junk = [
    g=>{ P(g, S(0.1, 10, 8), 0xb8885a); P(g, TO(0.07, 0.02), 0x8a5a3a, 0, 0.08, 0, PI/2); },
    g=>{ P(g, BX(0.18, 0.05, 0.13), 0x7a2a3a); P(g, BX(0.16, 0.045, 0.12), 0xf0e6c8, 0.01, 0, 0); },
    g=>{ P(g, CY(0.06, 0.05, 0.1, 10), 0xe8e8f0); P(g, TO(0.035, 0.012), 0xe8e8f0, 0.07, 0, 0); },
    g=>{ P(g, BX(0.03, 0.2, 0.015), 0xc8c8d8); [-0.025, 0, 0.025].forEach(x=> P(g, BX(0.008, 0.07, 0.01), 0xc8c8d8, x, 0.12, 0)); }
  ];
  junk.forEach((f, i)=>{ const a = i/junk.length*PI*2, g = group(orbit, Math.cos(a)*0.62, Math.sin(a*2)*0.1, Math.sin(a)*0.62); g.rotation.set(i, i*2, i*0.5); f(g); });
  halo(R, float, 0xb8ff6a, 1.4, 0, 0.6, 0, 0.3);
  R.h = 1.5; R.ghostly = true; return finish(R);
};

/* ================================================================== *
 *  The weird
 * ================================================================== */
function eyeball(R, parent, r, iris, y){
  P(parent, S(r, 18, 14), 0xf4ece4, 0, y, 0);
  for(let i=0;i<6;i++){ const a = i/6*PI*2; P(parent, CY(0.012, 0.004, r*0.9, 4), 0xc82a3a, Math.cos(a)*r*0.6, y + Math.sin(a)*r*0.6, r*0.62, 0, 0, a + PI/2); }
  P(parent, CY(r*0.48, r*0.48, 0.02, 18), iris, 0, y, r*0.98, PI/2);
  P(parent, TO(r*0.48, r*0.03), new THREE.Color(iris).multiplyScalar(0.5).getHex(), 0, y, r*0.99);
  P(parent, CY(r*0.22, r*0.22, 0.025, 14), 0x080808, 0, y, r*1.0, PI/2);
  P(parent, S(r*0.08, 6, 4), 0xffffff, r*0.15, y + r*0.15, r*1.02);
}
Models.watcher = function(){
  const R = rig("watcher"), b = R.body;
  const float = group(b, 0, 0.9, 0); R.parts.head = float;
  eyeball(R, float, 0.38, 0xd84aff, 0);
  P(float, new THREE.SphereGeometry(0.4, 16, 8, 0, PI*2, 0, PI*0.3), 0x6a2a5a, 0, 0, 0, -0.3);
  for(let i=0;i<5;i++){ const a = -0.6 + i*0.3; P(float, CO(0.012, 0.09, 4), 0x2a0a20, Math.sin(a)*0.32, 0.27, 0.22, -0.6, 0, -a); }
  spikeRing(float, 0.36, -0.05, 7, 0.16, 0x4a1a3a);
  for(let i=0;i<4;i++){ const a = i/4*PI*2 + 0.4; P(b, K.tube([[Math.cos(a)*0.15, 0.6, Math.sin(a)*0.15], [Math.cos(a)*0.3, 0.3, Math.sin(a)*0.3], [Math.cos(a)*0.25, 0.05, Math.sin(a)*0.25]], 0.05, 8, 6), 0x8a3a7a); P(b, S(0.04, 6, 4), 0xf0a8d8, Math.cos(a)*0.25, 0.04, Math.sin(a)*0.25); }
  halo(R, float, 0xd84aff, 1.6, 0, 0, 0.3, 0.3);
  R.h = 1.5; return finish(R);
};
function blob(R, r, col){
  const b = R.body;
  const goo = new THREE.Mesh(S(r, 18, 14), new THREE.MeshPhongMaterial({ color:col, transparent:true, opacity:0.78, shininess:80, emissive:new THREE.Color(col).multiplyScalar(0.25) }));
  goo.position.y = r*0.8; goo.scale.set(1.1, 0.8, 1.1); b.add(goo); R.parts.goo = goo; R.glows.push(goo);
  const inner = group(b, 0, r*0.85, 0); R.parts.head = inner;
  eyes(inner, r*0.28, r*0.12, r*0.45, r*0.18);
  mouth(inner, 0, -r*0.15, r*0.5, r*0.12, 0.5, 0x1a3a0a);
  [[0.3, 0.2, -0.2], [-0.25, -0.1, -0.1], [0.05, -0.3, 0.2]].forEach(([x, y, z])=> P(inner, S(r*0.1, 6, 4), new THREE.Color(col).multiplyScalar(1.4).getHex(), x*r, y*r, z*r));
  // what it ate: a skull and a sword, floating inside
  P(inner, S(r*0.16, 10, 8), 0xe8e2cc, -r*0.4, -r*0.25, -r*0.2);
  [-1, 1].forEach(s=> P(inner, S(r*0.05, 6, 4), 0x2a2a1a, -r*0.4 + s*r*0.06, -r*0.23, -r*0.06));
  P(inner, BX(r*0.06, r*0.75, r*0.02), 0xb8c0d0, r*0.35, -r*0.1, -r*0.25, 0, 0, 0.7);
  P(inner, BX(r*0.25, r*0.04, r*0.05), 0x8a6a3a, r*0.17, r*0.12, -r*0.25, 0, 0, 0.7);
  R.h = r*1.8;
}
Models.blob = function(){ const R = rig("blob"); blob(R, 0.55, 0x8ad83a); return finish(R); };
Models.blobling = function(){ const R = rig("blobling"); blob(R, 0.32, 0xb8f05a); return finish(R); };
Models.tentacle = function(){
  const R = rig("tentacle"), b = R.body;
  const segs = []; let parent = b;
  for(let i=0;i<5;i++){
    const g = group(parent, 0, i ? 0.32 : 0, 0); segs.push(g);
    const r = 0.17 - i*0.025;
    P(g, CY(r - 0.02, r, 0.34, 10), i % 2 ? 0x8a3a8a : 0x9a4a9a, 0, 0.17, 0);
    P(g, TO(r - 0.005, 0.012), 0x6a2a6a, 0, 0.33, 0, PI/2);
    [0.1, 0.24].forEach(y=> P(g, S(0.035, 6, 4), 0xf0a8d8, 0, y, r - 0.01));
    parent = g;
  }
  P(segs[4], CO(0.07, 0.2, 8), 0x8a3a8a, 0, 0.42, 0);
  R.parts.segs = segs;
  // the broken floor it burst out of
  P(b, CY(0.36, 0.4, 0.06, 16), 0x3a1a2a, 0, 0.02, 0);
  for(let i=0;i<7;i++){ const a = i/7*PI*2; P(b, BX(0.16, 0.08, 0.12), 0x5a4a50, Math.cos(a)*0.42, 0.04, Math.sin(a)*0.42, 0.3*Math.sin(a), -a, 0.25); }
  R.h = 1.6; return finish(R);
};

/* ================================================================== *
 *  The Gloom (Gloom Shooter's rot): violet-black flesh, bile-green
 *  pustules that glow, too many eyes, cordyceps out of what used to be folk
 * ================================================================== */
const ROT = { flesh:0x3a1a3e, flesh2:0x5a2050, bile:0x9cff3a, pus:0xffe14a, eye:0xffe14a, cord:0xff7a2a, vein:0xff3fb0 };
Models.ROT = ROT;
let _rotSeed = 1;
function fleshGeo(r, det, amt, c1, c2){
  return K.paint(K.lump(r, det, amt, _rotSeed++*1.7), c1, (c, x, y, z)=>{ const k = Math.sin(x*9/r*0.3 + z*7/r*0.3)*Math.sin(y*11/r*0.3); if(k > 0.3) c.lerp(new THREE.Color(c2), 0.6); });
}
function pustules(R, parent, n, r, y, sx, sy, sz, col){
  for(let i=0;i<n;i++){
    const a = i*2.39996, e = Math.asin(((i + 0.5)/n)*1.6 - 0.8);
    const x = Math.cos(a)*Math.cos(e)*r*sx, yy = y + Math.sin(e)*r*sy, z = Math.sin(a)*Math.cos(e)*r*sz;
    glow(R, parent, 0.035 + (i % 3)*0.015, col || ROT.bile, x, yy, z);
  }
}
function rotEyes(R, parent, n, y, z, r, col){
  for(let i=0;i<n;i++){ const x = (i - (n - 1)/2)*r*2.3, yy = y + (i % 2)*r*0.8; P(parent, S(r, 8, 6), 0x1a0a1a, x, yy, z); glow(R, parent, r*0.6, col || ROT.eye, x, yy, z + r*0.5); }
}
function rotLegs(R, parent, n, r, y, len){
  const legs = [];
  for(let i=0;i<n;i++){
    const a = (i/n)*PI*2 + PI/n, g = group(parent, Math.cos(a)*r, y, Math.sin(a)*r); g.rotation.y = -a;
    P(g, CY(0.035, 0.05, len, 6), 0x2a1430, len*0.35, -len*0.3, 0, 0, 0, -1.0);
    P(g, CO(0.035, len*0.6, 5), 0x1a0a20, len*0.75, -len*0.75, 0, 0, 0, -0.3 + PI);
    legs.push(g);
  }
  R.parts.legs = legs;
}
Models.rotling = function(){
  const R = rig("rotling"), b = R.body;
  P(b, fleshGeo(0.36, 1, 0.38, ROT.flesh, ROT.flesh2), 0xffffff, 0, 0.36, 0, 0, 0, 0, 1, 0.72, 1.12);
  pustules(R, b, 6, 0.34, 0.42, 1, 0.7, 1.1);
  rotEyes(R, b, 4, 0.46, 0.34, 0.06);
  rotLegs(R, b, 6, 0.26, 0.3, 0.45);
  [-1, 1].forEach(s=> P(b, CO(0.04, 0.4, 4), 0x2a1430, s*0.17, 0.3, 0.42, 1.9));
  teeth(b, 0.28, 0.4, 0.2, 5, 0xe8f0c8);
  R.h = 0.9; return finish(R);
};
Models.spitter = function(){
  const R = rig("spitter"), b = R.body;
  P(b, fleshGeo(0.45, 1, 0.3, 0x3b4a2a, 0x5a6a3a), 0xffffff, 0, 0.55, 0, 0, 0, 0, 1, 1.15, 1);
  // mould hairs all over, and a spout on top
  for(let i=0;i<22;i++){ const a = i*2.4, e = (i % 7)/7*1.3 - 0.2; P(b, CO(0.02, 0.14, 3), 0xb8d8a0, Math.cos(a)*Math.cos(e)*0.46, 0.55 + Math.sin(e)*0.5, Math.sin(a)*Math.cos(e)*0.46, Math.sin(a)*0.8, 0, -Math.cos(a)*0.8); }
  const sp = group(b, 0, 0.98, 0.18); sp.rotation.x = 0.7; R.parts.head = sp;
  P(sp, CY(0.09, 0.16, 0.36, 10), 0x2a361e, 0, 0.14, 0);
  glow(R, sp, 0.08, ROT.bile, 0, 0.33, 0);
  rotEyes(R, b, 2, 0.72, 0.42, 0.13, 0xffe14a);
  pustules(R, b, 4, 0.45, 0.6, 1, 1.1, 1);
  rotLegs(R, b, 3, 0.28, 0.25, 0.38);
  halo(R, sp, ROT.bile, 0.8, 0, 0.33, 0, 0.4);
  R.h = 1.4; return finish(R);
};
Models.bloater = function(){
  const R = rig("bloater"), b = R.body;
  const belly = group(b, 0, 0.82, 0); R.parts.head = belly;
  P(belly, fleshGeo(0.75, 2, 0.12, 0x5b4a5e, 0x7a6a3a), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.9, 1);
  pustules(R, belly, 14, 0.74, 0.05, 1, 0.9, 1);
  rotEyes(R, belly, 2, 0.25, 0.66, 0.18, 0xffe14a);
  P(belly, S(0.2, 10, 8), 0x1a0a1a, 0, -0.1, 0.68, 0, 0, 0, 1.4, 0.6, 0.4);
  for(let i=0;i<3;i++) P(belly, CY(0.04, 0.09, 0.25, 6), 0x3a2a3e, (i - 1)*0.25, 0.68, -0.1, 0, 0, (i - 1)*0.3);
  rotLegs(R, b, 4, 0.5, 0.35, 0.45);
  halo(R, belly, ROT.bile, 2.2, 0, 0, 0, 0.25);
  R.h = 1.9; return finish(R);
};
Models.husk = function(){
  // a mushroom-folk the Gloom took: grey stem, a dead cap, cordyceps bursting out
  const R = rig("husk");
  shroomPerson(R, 1.25, 0x5a5660, 0x8a8690);
  const cap = R.parts.head;
  for(let i=0;i<7;i++){ const a = i/7*PI*2, rr = 0.18, h = 0.3 + (i % 3)*0.12;
    P(cap, CO(0.03, h, 5), ROT.cord, Math.cos(a)*rr, 0.26 + h/2, Math.sin(a)*rr, Math.sin(a)*0.5, 0, -Math.cos(a)*0.5);
    glow(R, cap, 0.04, ROT.vein, Math.cos(a)*(rr + h*0.25), 0.26 + h, Math.sin(a)*(rr + h*0.25)); }
  // a fist of dead cap for a maul
  P(R.parts.armR, fleshGeo(0.16, 1, 0.3, 0x3a2c3a, 0x5a3a4a), 0xffffff, 0, -0.32, 0.08);
  pustules(R, R.body, 5, 0.25, 0.45, 1, 1, 1, ROT.cord);
  return finish(R);
};

/* ================================================================== *
 *  Bosses
 * ================================================================== */
Models.king = function(){ return Models.goblin("king"); };
Models.matriarch = function(){
  const R = rig("matriarch"), b = R.body;
  // a frilly skirt with a ring of babies at the hem, a stalk of a body, a honeycomb cap
  P(b, K.lathe([[0.0, 0.02], [1.0, 0.0], [0.95, 0.18], [0.7, 0.45], [0.5, 0.9], [0.0, 0.95]], 22), 0xf0e2c8);
  [0.18, 0.42].forEach((y, i)=> P(b, TO(0.93 - i*0.22, 0.05), 0xe0d0b0, 0, y, 0, PI/2));
  for(let i=0;i<9;i++){ const a = i/9*PI*2, x = Math.cos(a)*1.1, z = Math.sin(a)*1.1; P(b, CY(0.04, 0.05, 0.16, 6), 0xf0e6d4, x, 0.08, z); P(b, new THREE.SphereGeometry(0.12, 10, 6, 0, PI*2, 0, PI/2), [0xb08850, 0xd8302a, 0x8a4ab0][i % 3], x, 0.16, z); }
  const cap = group(b, 0, 1.0, 0); R.parts.head = cap;
  const g = K.lathe([[0.0, 1.5], [0.4, 1.4], [0.75, 1.05], [0.95, 0.55], [0.9, 0.15], [0.55, 0.0], [0, 0]], 24);
  K.paint(g, 0xb08850, (c, x, y, z)=>{ const a = Math.atan2(z, x); if(Math.sin(a*9)*Math.sin(y*14) > 0.25) c.multiplyScalar(0.45); });
  P(cap, g, 0xffffff);
  gills(cap, 0.85, 0.02, 0xc8b090, 22);
  // glowing spores in the pits of her cap, and a crown of little mushrooms
  for(let i=0;i<8;i++){ const a = i/8*PI*2 + 0.2, y = 0.7 + (i % 2)*0.35, rr = y > 0.9 ? 0.82 : 0.95; glow(R, cap, 0.06, 0x9cff6a, Math.cos(a)*rr, y, Math.sin(a)*rr); }
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(cap, CY(0.03, 0.04, 0.16, 6), 0xf0e6d4, Math.cos(a)*0.25, 1.48, Math.sin(a)*0.25); P(cap, new THREE.SphereGeometry(0.09, 10, 6, 0, PI*2, 0, PI/2), 0xd8302a, Math.cos(a)*0.25, 1.55, Math.sin(a)*0.25); }
  eyes(b, 0.22, 0.75, 0.55, 0.1);
  [-1, 1].forEach(s=>{ for(let k=0;k<3;k++) P(b, BX(0.012, 0.07, 0.012), 0x2a1a10, s*(0.16 + k*0.05), 0.87, 0.6, 0, 0, s*(0.4 - k*0.3)); });
  P(b, TO(0.18, 0.025, PI), 0x3a2a1a, 0, 0.58, 0.6, 0, 0, PI);
  [-1, 1].forEach(s=>{ const a = group(b, s*0.6, 0.7, 0.2); P(a, CY(0.07, 0.09, 0.5, 8), 0xf0e2c8, 0, -0.2, 0, 0, 0, s*0.6); P(a, S(0.1, 8, 6), 0xf0e2c8, s*0.15, -0.42, 0.02); });
  for(let i=0;i<6;i++){ const a = i/6*PI*2; halo(R, b, 0x9cff6a, 0.5, Math.cos(a)*1.0, 0.1, Math.sin(a)*1.0, 0.5); }
  R.h = 2.6; return finish(R, { w:0.035 });
};
Models.bride = function(){
  const R = rig("bride"), b = R.body;
  const float = group(b, 0, 0.3, 0); R.parts.head = float;
  // the dress, ruffled in tiers, and a long ghostly train behind
  P(float, K.lathe([[0, 1.5], [0.2, 1.42], [0.28, 1.1], [0.3, 0.85], [0.55, 0.4], [0.75, 0.05], [0, 0.05]], 20), 0xe8ecff);
  [[0.08, 0.74], [0.32, 0.6], [0.58, 0.44]].forEach(([y, r])=> P(float, TO(r, 0.045), 0xd0d8f8, 0, y, 0, PI/2));
  P(float, K.lathe([[0.7, 0.04], [0.5, 0.3], [0.25, 0.6], [0, 0.65]], 14), 0xc8d0f0, 0, 0, -0.55, 0, 0, 0, 0.9, 0.5, 1.8);
  P(float, TO(0.29, 0.03), 0xb8c0e8, 0, 0.92, 0, PI/2);
  // pearls, a tiara, her face, sad brows and glowing tears
  for(let i=0;i<9;i++){ const a = -1.2 + i*0.3; P(float, S(0.025, 6, 4), 0xfff8f0, Math.sin(a)*0.21, 1.36 + Math.cos(a*1.3)*0.02, Math.cos(a)*0.21); }
  P(float, S(0.2, 14, 10), 0xd8e0ff, 0, 1.6, 0.03);
  P(float, TO(0.17, 0.02, PI), 0xe8e8ff, 0, 1.72, 0.0, 0, 0, 0);
  for(let i=0;i<5;i++) P(float, CO(0.022, 0.08 + (i === 2 ? 0.05 : 0), 4), 0xe8e8ff, -0.12 + i*0.06, 1.8 + (i === 2 ? 0.03 : 0), 0.02);
  glow(R, float, 0.03, 0x8ae8ff, 0, 1.9, 0.03);
  [-1, 1].forEach(s=>{ glow(R, float, 0.04, 0x8ae8ff, s*0.075, 1.62, 0.18); P(float, BX(0.07, 0.015, 0.02), 0x5a6a9a, s*0.075, 1.7, 0.19, 0, 0, s*-0.4); glow(R, float, 0.018, 0x8ae8ff, s*0.08, 1.5, 0.2); });
  P(float, S(0.035, 8, 6), 0x3a2a4a, 0, 1.52, 0.2, 0, 0, 0, 1.3, 0.6, 0.5);
  // the veil, and long dark hair under it
  P(float, new THREE.LatheGeometry([[0.55, 0.6], [0.4, 1.3], [0.27, 1.75], [0.05, 1.93]].map(p=> new THREE.Vector2(p[0], p[1])), 16, PI*0.62, PI*0.76), 0xf8f8ff, 0, 0, -0.04);
  P(float, TO(0.24, 0.025, PI*0.9), 0xf0f0ff, 0, 1.76, -0.02, PI/2 - 0.3, 0, -PI*0.95);
  for(let i=0;i<5;i++){ const x = (i - 2)*0.08; P(float, K.tube([[x, 1.7, -0.05], [x*1.4, 1.3, -0.2], [x*1.6, 0.85, -0.25]], 0.035, 8, 5), 0x2a2238); }
  // sleeves, hands, and a bouquet gone to seed
  [-1, 1].forEach(s=>{ const a = group(float, s*0.24, 1.25, 0.05); P(a, CY(0.05, 0.09, 0.45, 10), 0xe8ecff, s*0.05, -0.18, 0.12, 0.7, 0, s*0.35); P(a, S(0.05, 8, 6), 0xd8e0ff, -s*0.06, -0.38, 0.3); });
  P(float, CY(0.06, 0.03, 0.25, 6), 0x3a5a2a, 0, 0.82, 0.42, 0.3);
  [[0, 0.98, 0.45], [-0.08, 0.95, 0.42], [0.08, 0.95, 0.43], [-0.04, 1.02, 0.38], [0.05, 1.03, 0.38]].forEach(([x, y, z], i)=> P(float, S(0.06, 8, 6), [0x5a3a4a, 0x8a5a7a, 0x4a2a3a][i % 3], x, y, z));
  P(float, TO(0.04, 0.015), 0xb8c0e8, 0, 0.85, 0.44, PI/2);
  halo(R, float, 0xa8d8ff, 3, 0, 1, 0, 0.35);
  R.h = 2.3; R.ghostly = true; return finish(R, { w:0.03 });
};
Models.eye = function(){
  const R = rig("eye"), b = R.body;
  const float = group(b, 0, 1.6, 0); R.parts.head = float;
  eyeball(R, float, 1.2, 0xff4a2a, 0);
  // eyelids that close when it blinks, fringed with lashes
  const top = group(float, 0, 0, 0), bot = group(float, 0, 0, 0);
  P(top, new THREE.SphereGeometry(1.26, 22, 12, 0, PI*2, 0, PI/2), 0x7a2a4a);
  P(bot, new THREE.SphereGeometry(1.26, 22, 12, 0, PI*2, PI/2, PI/2), 0x7a2a4a);
  for(let i=0;i<9;i++){ const a = -1.1 + i*0.275; P(top, CO(0.04, 0.4, 4), 0x1a0810, Math.sin(a)*1.22, 0.05, Math.cos(a)*1.22, PI/2 + 0.5, a, 0); }
  P(top, TO(1.25, 0.05, PI), 0x5a1a3a, 0, 0, 0, 0, 0, 0);
  top.rotation.x = -1.35; bot.rotation.x = 1.35;
  R.parts.lidT = top; R.parts.lidB = bot;
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(b, K.tube([[Math.cos(a)*0.6, 1.0, Math.sin(a)*0.6], [Math.cos(a)*1.4, 0.5, Math.sin(a)*1.4], [Math.cos(a + 0.4)*1.8, 0.05, Math.sin(a + 0.4)*1.8]], 0.13, 10, 8), 0x8a3a7a); P(b, S(0.09, 6, 4), 0xf0a8d8, Math.cos(a + 0.4)*1.8, 0.06, Math.sin(a + 0.4)*1.8); }
  // little eyes on stalks, watching everything else
  for(let i=0;i<4;i++){
    const a = i/4*PI*2 + PI/4, x = Math.cos(a)*1.25, z = Math.sin(a)*1.25;
    P(b, K.tube([[x*0.7, 1.0, z*0.7], [x, 1.6, z], [x*1.15, 2.4, z*1.15]], 0.06, 8, 5), 0x8a3a7a);
    const e = group(b, x*1.15, 2.5, z*1.15); e.rotation.y = Math.atan2(x, z)*0.3;
    eyeball(R, e, 0.16, 0xffd23d, 0);
  }
  halo(R, float, 0xff4a2a, 4, 0, 0, 1, 0.3);
  R.h = 3.4; return finish(R, { w:0.04 });
};
Models.heart = function(){
  // the Gloom Heart: a knot of rot flesh rooted in the forest floor, veined
  // with glowing bile, crowned with cordyceps and glowcaps
  const R = rig("heart"), b = R.body;
  const beat = group(b, 0, 1.3, 0); R.parts.head = beat;
  P(beat, fleshGeo(1.0, 2, 0.22, 0x6a1240, 0x9a1a5a), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.9, 1);
  P(beat, fleshGeo(0.55, 1, 0.3, 0x4a0a30, 0x7a1a4a), 0xffffff, 0.55, 0.45, 0.35);
  P(beat, fleshGeo(0.5, 1, 0.3, 0x4a0a30, 0x7a1a4a), 0xffffff, -0.6, 0.35, 0.3);
  pustules(R, beat, 18, 0.98, 0.0, 1, 0.9, 1, ROT.vein);
  pustules(R, beat, 9, 0.98, 0.0, 1, 0.9, 1, ROT.bile);
  // eyes peering out of the flesh
  [[0.0, 0.25, 0.9, 0.16], [0.4, -0.1, 0.85, 0.11], [-0.42, 0.0, 0.85, 0.1], [0.2, 0.55, 0.75, 0.08]].forEach(([x, y, z, r])=>{ P(beat, S(r, 10, 8), 0x1a0a1a, x, y, z); glow(R, beat, r*0.6, ROT.eye, x, y, z + r*0.5); });
  // cordyceps and glowcaps out of the top
  for(let i=0;i<9;i++){ const a = i/9*PI*2, rr = 0.45, h = 0.5 + (i % 3)*0.25;
    P(beat, CO(0.05, h, 5), ROT.cord, Math.cos(a)*rr, 0.75 + h/2, Math.sin(a)*rr, Math.sin(a)*0.5, 0, -Math.cos(a)*0.5);
    glow(R, beat, 0.06, ROT.vein, Math.cos(a)*(rr + h*0.25), 0.75 + h, Math.sin(a)*(rr + h*0.25)); }
  [[0.7, 0.6, -0.3, 0.32], [-0.75, 0.5, -0.2, 0.26]].forEach(([x, y, z, r])=>{ P(beat, CY(r*0.25, r*0.3, r*1.2, 8), 0xcfe4ff, x, y, z); P(beat, new THREE.SphereGeometry(r, 12, 6, 0, PI*2, 0, PI/2), 0x2a8aff, x, y + r*0.6, z, 0, 0, 0, 1, 0.55, 1); glow(R, beat, r*0.3, 0x6ad8ff, x, y + r*0.6, z); });
  // roots: thick violet tubes into the floor
  for(let i=0;i<7;i++){ const a = i/7*PI*2; P(b, K.tube([[Math.cos(a)*0.6, 0.9, Math.sin(a)*0.6], [Math.cos(a)*1.4, 0.3, Math.sin(a)*1.4], [Math.cos(a)*2.1, 0.02, Math.sin(a)*2.1]], 0.13, 10, 6), 0x3a0a2a); P(b, S(0.2, 10, 6), 0x2a0a20, Math.cos(a)*2.1, 0.02, Math.sin(a)*2.1, 0, 0, 0, 1, 0.4, 1); }
  halo(R, beat, 0xff3fb0, 5, 0, 0, 0.5, 0.35);
  R.h = 3; return finish(R, { w:0.04 });
};

/* keep the moving bits of a costume moving: the cloak flares when he runs, things bob, spin, sway and flicker */
Models.animate = function(R, t, speed){
  const run = Math.min(1, (speed || 0)/3);
  if(R.parts.cape){
    R.parts.cape.rotation.x = Math.min(0.55, (speed || 0)*0.09) + Math.sin(t*7.5)*0.03*(0.3 + run);
    R.parts.cape.rotation.z = Math.sin(t*1.7)*0.025 + Math.sin(t*9.1)*0.015*run;
  }
  const A = R.anim || [];
  for(let i=0;i<A.length;i++){
    const a = A[i];
    if(a.spin) a.o.rotation.y = t*a.spin;
    if(a.bob){ if(a.y0 === undefined) a.y0 = a.o.position.y; a.o.position.y = a.y0 + Math.sin(t*a.speed + i*1.3)*a.bob; }
    if(a.sway){
      // hanging things swing, more when he runs
      if(a.r0 === undefined){ a.r0 = a.o.rotation.z; a.x0 = a.o.rotation.x; }
      a.o.rotation.z = a.r0 + Math.sin(t*a.speed + i*0.9)*a.sway*(0.5 + run);
      a.o.rotation.x = a.x0 + Math.sin(t*a.speed*0.7 + i)*a.sway*0.5 - run*a.sway*1.5;
    }
    if(a.flicker) a.o.scale.setScalar(1 - a.flicker*0.5 + Math.random()*a.flicker);
  }
};

/* any enemy, by its model name */
Models.enemy = function(model){
  if(KITS[model] && model !== "king") return Models.goblin(model);
  const f = Models[model];
  return f ? f() : Models.goblin("grunt");
};

/* ================================================================== *
 *  Animation helpers
 * ================================================================== */
Models.idle = function(R, t, speed){
  const s = Math.min(1, speed/3), ph = t*(6 + speed*1.5);
  R.body.position.y = Math.abs(Math.sin(ph))*0.06*s + Math.sin(t*2)*0.012;
  R.body.rotation.z = Math.sin(ph)*0.07*s;
  if(R.parts.legs) R.parts.legs.forEach((l, i)=> l.rotation.x = Math.sin(ph + i*Math.PI)*0.7*s);
  if(R.parts.armL && R.kind !== "zippy") R.parts.armL.rotation.x = Math.sin(ph)*0.5*s;
  if(R.parts.tip) R.parts.tip.rotation.z = -0.5 + Math.sin(t*3)*0.15 + s*0.1;
  if(R.parts.gem) R.parts.gem.scale.setScalar(1 + 0.3*Math.sin(t*6));
  if(R.ghostly && R.parts.head) R.parts.head.position.y = (R.parts.head.userData.y0 === undefined ? (R.parts.head.userData.y0 = R.parts.head.position.y) : R.parts.head.userData.y0) + Math.sin(t*2.2)*0.12;
  if(R.parts.orbit) R.parts.orbit.rotation.y = t*2.5;
  if(R.parts.segs) R.parts.segs.forEach((g, i)=>{ g.rotation.z = Math.sin(t*2.4 + i*0.7)*0.22; g.rotation.x = Math.cos(t*1.9 + i*0.6)*0.15; });
  if(R.parts.goo) R.parts.goo.scale.set(1.1 + Math.sin(t*5)*0.04, 0.8 - Math.sin(t*5)*0.04, 1.1 + Math.sin(t*5)*0.04);
};
const _c = new THREE.Color();
Models.tint = function(R, hex, k){
  if(R.mat && R.mat.emissive){ R.mat.emissive.setHex(hex); R.mat.emissive.multiplyScalar(k); }
  if(R.gunMats) R.gunMats.forEach(m=>{ if(m.emissive){ m.emissive.setHex(hex); m.emissive.multiplyScalar(k); } });
};
Models.fade = function(R, a){
  if(R.lastFade === a) return; R.lastFade = a;
  if(R.mat){ R.mat.transparent = a < 1; R.mat.opacity = a; R.mat.depthWrite = a > 0.5; }
  if(R.out) R.out.uniforms.uA.value = a;
  R.glows.forEach(g=>{ if(g.material){ g.material.transparent = true; g.material.opacity = (g.userData.op0 === undefined ? (g.userData.op0 = g.material.opacity) : g.userData.op0)*a; } });
  if(R.gunMats) R.gunMats.forEach(m=>{ m.transparent = a < 1; m.opacity = a; });
};

/* ================================================================== *
 *  Things to pick up, and powerup tokens on pedestals
 * ================================================================== */
const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12); coinGeo.rotateX(PI/2);
const coinBig = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12); coinBig.rotateX(PI/2);
const coinM = K.lambert(0xffc83a, { emissive:0x553a00 });
Models.pickup = function(pk){
  const g = new THREE.Group();
  if(pk.kind === "gold"){ g.add(new THREE.Mesh(pk.value >= 5 ? coinBig : coinGeo, coinM)); g.userData.spin = 4; g.userData.hover = 0.3; }
  else if(pk.kind === "heart" || pk.kind === "flyheal"){
    const m = K.lambert(0xff3a4a, { emissive:0x501018 });
    const k = pk.kind === "flyheal" ? 0.5 : 1;
    for(const s of [-1, 1]){ const l = new THREE.Mesh(S(0.12*k), m); l.position.set(s*0.09*k, 0.05*k, 0); g.add(l); }
    const c = new THREE.Mesh(CO(0.17*k, 0.22*k), m); c.rotation.z = PI; c.position.y = -0.08*k; g.add(c);
    if(pk.kind === "flyheal") g.add(K.sprite(0xff8a9a, 0.6, 0.6));
    g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "mana"){
    g.add(new THREE.Mesh(OC(0.16), K.lambert(0x46a8ff, { emissive:0x103060 })));
    g.add(K.sprite(0x46a8ff, 0.9, 0.5)); g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "ward"){
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), K.lambert(0x8ad8ff, { emissive:0x2a5a8a })));
    g.add(K.sprite(0x8ad8ff, 1, 0.5)); g.userData.spin = 3; g.userData.hover = 0.5;
  } else if(pk.kind === "fly"){
    const m = K.lambert(0xffd23d, { emissive:0x8a6a00 });
    g.add(new THREE.Mesh(S(0.1), m));
    [-1, 1].forEach(s=>{ const w = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), new THREE.MeshBasicMaterial({ color:0xfff8d0, transparent:true, opacity:0.7, side:THREE.DoubleSide })); w.position.set(s*0.12, 0.06, 0); w.rotation.set(-0.5, 0, s*0.4); g.add(w); });
    g.add(K.sprite(0xffd23d, 1.4, 0.8)); g.userData.spin = 6; g.userData.hover = 0.8; g.userData.buzz = true;
  } else if(pk.kind === "item"){
    g.add(Models.item(pk.item));
    const col = pk.item.kind === "gun" ? DG.RARITY[pk.item.rarity].color : pk.item.kind === "item" ? DG.TIERS[DG.ITEMS[pk.item.id].tier].color : "#ffd23d";
    g.add(beam(col));
    g.userData.spin = 1.2; g.userData.hover = 0.6;
  }
  return g;
};
function beam(col){
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 3, 8, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
  b.position.y = 1.2; g.add(b);
  const pool = new THREE.Mesh(K.glowPlane, K.glowMat(new THREE.Color(col), 0.5)); pool.scale.set(1.6, 1, 1.6); pool.position.y = -0.55; g.add(pool);
  return g;
}
Models.beam = beam;

/* a powerup's token: its look comes from what kind of thing it is */
const ELC = el=> DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
Models.powerup = function(id){
  const d = DG.ITEMS[id], g = new THREE.Group(), tierCol = new THREE.Color(DG.TIERS[d.tier].color);
  const R = rig("token");
  const cat = d.tier === 4 ? "godly" : d.els ? "element" : d.on ? "trigger" : d.shot ? "shot" : d.special ? "artifact" : "potion";
  const root = group(g, 0, 0, 0);
  if(cat === "potion"){
    P(root, K.lathe([[0, -0.2], [0.16, -0.18], [0.18, -0.05], [0.12, 0.06], [0.05, 0.1], [0.05, 0.2], [0, 0.2]], 14), 0xd8eef8);
    P(root, S(0.15, 12, 10), [0xff4a5a, 0x4aa8ff, 0x7dff3a, 0xffd23d, 0xb36bff][id.length % 5], 0, -0.08, 0, 0, 0, 0, 1, 0.75, 1);
    P(root, CY(0.055, 0.055, 0.06, 8), 0x8a5a2a, 0, 0.22, 0);
  } else if(cat === "shot"){
    P(root, CY(0.09, 0.09, 0.24, 12), GOLD, 0, -0.06, 0);
    P(root, CO(0.09, 0.18, 12), 0xc8c8d8, 0, 0.15, 0);
    P(root, TO(0.095, 0.02), tierCol.getHex(), 0, -0.12, 0, PI/2);
  } else if(cat === "element"){
    const c = ELC(d.els[0]);
    P(root, OC(0.2), c, 0, 0, 0, 0, 0, 0, 0.8, 1.4, 0.8);
    halo(R, root, c, 1.2, 0, 0, 0, 0.6);
  } else if(cat === "trigger"){
    P(root, BX(0.32, 0.4, 0.1), 0x6a6a7a);
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 40, { size:28, bg:"#3a3a48", fg:DG.TIERS[d.tier].color }) }));
    glyph.position.z = 0.051; root.add(glyph); R.glows.push(glyph);
    const back = glyph.clone(); back.rotation.y = PI; back.position.z = -0.051; root.add(back);
  } else if(cat === "artifact"){
    P(root, new THREE.DodecahedronGeometry(0.17), tierCol.getHex());
    P(root, TO(0.22, 0.025), GOLD, 0, 0, 0, PI/2);
  } else {
    // godly: a little sun with rays
    glow(R, root, 0.16, 0xfff27a);
    for(let i=0;i<8;i++){ const a = i/8*PI*2; P(root, CO(0.04, 0.16, 6), 0xffe14a, Math.cos(a)*0.24, Math.sin(a)*0.24, 0, 0, 0, a - PI/2); }
    halo(R, root, 0xfff27a, 2.2, 0, 0, 0, 0.8);
  }
  halo(R, root, tierCol.getHex(), 0.9, 0, 0, 0, 0.35);
  finish(R, { w:0.015 });
  return g;
};
Models.item = function(it){
  if(it.kind === "item") return Models.powerup(it.id);
  const g = new THREE.Group();
  if(it.kind === "gun"){
    const R = rig("gun"), gg = Models.gun(it.base, it.element, R);
    K.bake(gg, { w:0.015 }); gg.scale.setScalar(1.5); gg.rotation.y = PI/2; g.add(gg);
  } else if(it.kind === "active"){
    const R = rig("active"), root = group(g, 0, 0, 0);
    P(root, CY(0.16, 0.16, 0.05, 14), 0x4a4a5a, 0, 0, 0, PI/2);
    P(root, TO(0.16, 0.03), GOLD, 0, 0, 0);
    glow(R, root, 0.07, 0xff8a3a, 0, 0, 0.04);
    finish(R, { w:0.015 });
  } else if(it.kind === "heal"){
    const R = rig("soup"), root = group(g, 0, 0, 0);
    P(root, new THREE.SphereGeometry(0.2, 12, 6, 0, PI*2, PI/2, PI/2), 0x8a6a4a);
    P(root, new THREE.CircleGeometry(0.18, 12), 0x6aa83a, 0, -0.03, 0, -PI/2);
    finish(R, { w:0.015 });
  } else if(it.kind === "ward"){
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), K.lambert(0x8ad8ff, { emissive:0x2a5a8a })));
  }
  return g;
};
Models.offer = function(o){
  if(o.kind === "item") return Models.powerup(o.id);
  if(o.kind === "gun") return Models.item(o.gun);
  return Models.item({ kind:o.kind });
};

/* a Gribbus buff on a lily pad: a little frog-green token with its letter */
Models.frogBuffIcon = function(id){
  const d = DG.FROG_BUFFS[id], g = new THREE.Group(), R = rig("fb"), root = group(g, 0, 0, 0);
  P(root, CY(0.22, 0.22, 0.06, 16), 0x5ac83a, 0, 0, 0, PI/2);
  P(root, TO(0.22, 0.03), GOLD, 0, 0, 0);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 16), new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 32, { size:24, bg:"#3a8a2a", fg:"#fff8d0" }) }));
  face.position.z = 0.035; root.add(face);
  const back = face.clone(); back.rotation.y = PI; back.position.z = -0.035; root.add(back);
  halo(R, root, 0x9cff6a, 1, 0, 0, 0, 0.45);
  if(d.locked) halo(R, root, 0xffd23d, 1.4, 0, 0, 0, 0.5);
  finish(R, { w:0.015 });
  return g;
};

})();
