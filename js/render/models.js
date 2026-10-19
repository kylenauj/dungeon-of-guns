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
/* eyes: sunken sockets, dark to the bottom, with a small cold pinprick of light
   deep in each. Pass R and the pinprick glows (pupil: its colour); without R
   it's only a dull bead. look: the pinpricks slide toward the middle */
function eyes(parent, sep, y, z, r, pupil, look, R){
  const c = pupil === undefined || pupil === 0x101018 ? 0xffb84a : pupil;
  [-1, 1].forEach(s=>{
    P(parent, S(r*1.25, 10, 8), 0x1c1416, s*sep, y + r*0.1, z - r*0.45, 0, 0, s*0.3, 1.15, 0.85, 0.5);
    P(parent, S(r*0.9, 10, 8), 0x050304, s*sep, y, z - r*0.2, 0, 0, s*0.25, 1.1, 0.78, 0.5);
    const x = s*sep - (look || 0)*s*0.2*r;
    if(R){ glow(R, parent, r*0.26, c, x, y - r*0.08, z + r*0.12); halo(R, parent, c, r*5, x, y - r*0.08, z + r*0.2, 0.45); }
    else P(parent, S(r*0.18, 6, 4), c, x, y - r*0.08, z + r*0.12);
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
const GP = { iron:0x232326, iron2:0x38383e, brass:0x6e5428, brass2:0x54401e, bone:0xc0b496, bone2:0x9a8c70, wood:0x3a2618, wood2:0x2a1c12,
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
    [-1, 1].forEach(s=>{ P(g, CY(0.045, 0.045, 0.012, 16), GP.bone, s*0.052, -0.12, 0.08, 0, 0, PI/2); });
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
    P(g, K.lathe([[0.045, 0], [0.05, 0.3], [0.065, 0.42], [0.12, 0.52], [0.115, 0.545], [0.06, 0.5]], 18), GP.iron2, 0, 0.03, 0.06, PI/2);
    [0.12, 0.26, 0.38].forEach(z=> P(g, zto(0.058, 0.013), GP.brass, 0, 0.03, z));
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
/* a heavy brow: a ridge of bone and skin that throws the eyes into shadow (cross, worried or plain) */
function brows(parent, sep, y, z, col, mood, w){ const W = w || 0.09, t = mood === "angry" ? 0.4 : mood === "sad" ? -0.35 : 0.08; [-1, 1].forEach(s=> P(parent, S(W*0.62, 10, 6), col, s*sep, y, z, 0.3, 0, s*t, 1.15, 0.42, 0.62)); }
/* gills under a mushroom cap */
function gills(parent, r, y, col, n){ for(let i=0;i<n;i++){ const a = i/n*PI*2; P(parent, BX(0.014, 0.03, r*0.75), col, Math.cos(a)*r*0.5, y, Math.sin(a)*r*0.5, 0, PI/2 - a); } }
/* a mouth: a ragged dark gash, open as much as you like, torn wider on one side, a raw lip sagging */
function mouth(parent, x, y, z, w, open, col){
  const o = open || 0.35, c = col || 0x0a0306;
  P(parent, S(w, 12, 8), c, x, y, z, 0, 0, 0.06, 1, o, 0.4);
  P(parent, S(w*0.6, 10, 6), c, x + w*0.42, y - w*o*0.2, z - w*0.02, 0, 0, -0.25, 1, o*0.75, 0.38);
  P(parent, S(w*0.5, 8, 6), 0x3a1416, x - w*0.15, y - w*o*0.75, z - w*0.06, 0, 0, 0.1, 1.5, 0.4, 0.45);
}
/* teeth along a mouth: needles, yellowed and uneven, one or two lost */
function teeth(parent, y, z, w, n, col){
  for(let i=0;i<n;i++){
    const h = Math.sin(i*12.9898 + n*3.17)*43758.5453, k = h - Math.floor(h);
    if(n > 3 && k < 0.13) continue;
    const sp = w/n; P(parent, CO(sp*(0.36 + k*0.16), sp*(1.8 + k*1.8), 5), col || 0xc8bc98, -w/2 + (i + 0.5)*sp, y - k*sp*0.4, z, PI + (k - 0.5)*0.35, 0, (k - 0.5)*0.45);
  }
}
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
  arcane:{ robe:0x45385a, dark:0x241c30, light:0xb07aff, cape:0x2c2434, stars:0x8a6a30 },
  fire:  { robe:0x5e2618, dark:0x2e1410, light:0xff7a2a, cape:0x4a1410, stars:0xa8722e },
  frost: { robe:0x34465a, dark:0x1c2834, light:0x8ad8ff, cape:0x26384a, stars:0x9aaab4 },
  poison:{ robe:0x3e4a26, dark:0x222a16, light:0x9cff3a, cape:0x2e3620, stars:0x7a7a3a },
  shock: { robe:0x5a5030, dark:0x1e1e30, light:0xfff04a, cape:0x26263c, stars:0xb8a860 },
  gold:  { robe:0x6e5428, dark:0x3a2c14, light:0xffd86a, cape:0x5a4220, stars:0xc8a050 },
  shadow:{ robe:0x1c1820, dark:0x0e0c10, light:0xb36bff, cape:0x0c0a0e, stars:0x4a3a5a },
  star:  { robe:0x2e2a46, dark:0x1a1828, light:0xc8d8ff, cape:0x181c34, stars:0xa89a6a },
  leaf:  { robe:0x34422a, dark:0x3a2a1a, light:0xb8d86a, cape:0x2a3620, stars:0x8a6a6a },
  grey:  { robe:0x9a9aa4, dark:0x6c6c78, light:0xdcdce6, cape:0x82828e, stars:0xf2f2ff },   // the ending: a grey wizard again
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
/* the same lathe, only the band of it between heights y0 and y1 (so a coat can
   be cut at the belt and its skirt swing on its own); cuts of one profile meet */
function zLatheCut(prof, seg, phi0, phiLen, n, y0, y1){
  const c = zCurve(prof, n), pts = [];
  const at = (a, b, y)=>{ const t = (y - a.y)/(b.y - a.y); return new THREE.Vector2(a.x + (b.x - a.x)*t, y); };
  for(let i=0;i<c.length;i++){
    const p = c[i], q = c[i + 1];
    if(p.y >= y0 && p.y <= y1) pts.push(p);
    if(q && ((p.y < y0) !== (q.y < y0))) pts.push(at(p, q, y0));
    if(q && ((p.y < y1) !== (q.y < y1))) pts.push(at(p, q, y1));
  }
  pts.sort((a, b)=> a.y - b.y);
  return new THREE.LatheGeometry(pts, seg, phi0 || 0, phiLen === undefined ? PI*2 : phiLen);
}
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
const ZCOAT = [[0.35, 0.2], [0.33, 0.35], [0.305, 0.52], [0.275, 0.7], [0.262, 0.82], [0.27, 0.98], [0.285, 1.1], [0.27, 1.2], [0.19, 1.3], [0.12, 1.37]];
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
  // below the belt his coat is its own piece (R.parts.skirt, hung from the
  // waist), so the view can swing the hem and trail it behind him
  const skirtP = group(b, 0, 0.82, 0), sk = group(skirtP, 0, -0.82, 0); R.parts.skirt = skirtP;
  const CUT = 0.82;
  // the under-robe, seen where the coat hangs open
  const ROBE = [[0.3, 0.12], [0.285, 0.3], [0.245, 0.6], [0.235, 0.8], [0.245, 1.0], [0.25, 1.14], [0.18, 1.28], [0.1, 1.37], [0.001, 1.4]];
  [[sk, -1, CUT + 0.012], [b, CUT - 0.012, 2]].forEach(([g, y0, y1])=>{
    const robe = zLatheCut(ROBE, 30, PI, PI*2, 3, y0, y1);
    zFolds(robe, 11, 0.06, 0.6, 1.1); K.tatter(robe, 0.24, 16, 0.1, 2.7);
    P(g, zHunch(robe), D.dark);
  });
  // the long coat, open at the front, torn at the hem, lined darker
  const GAP = 0.75;
  [[sk, -1, CUT + 0.012], [b, CUT - 0.012, 2]].forEach(([g, y0, y1])=>{
    const coat = zLatheCut(ZCOAT, 32, GAP/2, PI*2 - GAP, 3, y0, y1);
    zFolds(coat, 9, 0.07, 0.75, 0.4); K.tatter(coat, 0.36, 22, 0.17, 5.1);
    zHunch(coat);
    P(g, coat, D.robe); P(g, zInside(coat), zDim(D.robe, 0.45));
  });
  // its front edges, turned back, and clasps across the chest
  [-1, 1].forEach(s=>{
    const pts = []; for(let i=0;i<=10;i++){ const y = 0.24 + i*0.105; pts.push(zSurf(s*(GAP/2 + 0.04), y, 0.008)); }
    P(sk, zTaper(pts.slice(0, 7), 0.022, 0.02, 16, 6), zDim(D.robe, 0.7));
    P(b, zTaper(pts.slice(6), 0.02, 0.018, 10, 6), zDim(D.robe, 0.7));
  });
  [0.9, 1.0, 1.1].forEach((y, i)=>{ const l = zSurf(-0.42, y, 0.02), r = zSurf(0.42, y, 0.02); zChain(b, l, r, 4, ZC.brass, 0.014); P(b, zs(0.018), ZC.brass, l[0], y, l[2]); P(b, zs(0.018), ZC.brass, r[0], y, r[2]); });
  // runes stitched round the hem in the dye's thread
  for(let i=0;i<14;i++){
    const a = GAP/2 + 0.2 + i*(PI*2 - GAP - 0.4)/13, y = 0.46 + (i % 3)*0.025;
    const p = zSurf(a, y, 0.006);
    zFace(sk, BX(0.012, 0.07, 0.006), D.stars, p, a, 0.1, (i % 2 ? 0.3 : -0.2));
    zFace(sk, BX(0.04, 0.01, 0.006), D.stars, zSurf(a + 0.03, y + (i % 2 ? 0.02 : -0.015), 0.008), a, 0.1, (i % 3)*0.5);
  }
  // a ragged mantle over the shoulders (the cloak's dye)
  const mant = zLathe(ZMANT, 28, PI, PI*2, 3);
  zFolds(mant, 13, 0.06, 1.3, 2.2); K.tatter(mant, 1.06, 15, 0.12, 3.3);
  zHunch(mant); P(b, mant, C.cape);
  // the cloak down his back (the view keeps it moving)
  const capeG = group(b, 0, 1.31, 0.05); R.parts.cape = capeG;
  const cloak = zLathe([[0.17, 0.02], [0.25, -0.1], [0.3, -0.3], [0.33, -0.6], [0.36, -0.9], [0.39, -1.2]], 22, PI/2 + 0.3, PI - 0.6, 3);
  zFolds(cloak, 8, 0.09, -0.15, 0.9); K.tatter(cloak, -0.9, 11, 0.2, 7.7); zSmooth(cloak);
  P(capeG, cloak, C.cape); P(capeG, zInside(cloak), zDim(C.cape, 0.35));
  // belts: a broad one at the waist, a slung one at the hip, a strap across the chest
  P(b, CY(0.275, 0.272, 0.07, 30), ZC.leather, 0, 0.82, 0.004);
  P(b, BX(0.09, 0.08, 0.03), ZC.brass, 0.0, 0.82, 0.29); P(b, BX(0.05, 0.04, 0.032), ZC.iron, 0.0, 0.82, 0.295);
  P(sk, CY(0.3, 0.295, 0.045, 30), ZC.leather2, 0, 0.7, 0.01, 0, 0, 0.12);
  for(let i=0;i<8;i++){ const a = -1.2 + i*0.35; const p = zSurf(a, 0.7 + Math.sin(a)*0.035, 0.02); P(sk, zs(0.012), ZC.iron2, p[0], p[1], p[2]); }
  { const pts = [zSurf(-0.95, 1.2, 0.02), zSurf(-0.5, 1.12, 0.03), zSurf(0, 1.0, 0.035), zSurf(0.5, 0.88, 0.03), zSurf(1.0, 0.8, 0.025), zSurf(1.5, 0.76, 0.02)];
    P(b, zTaper(pts, 0.02, 0.02, 30, 6), ZC.leather);
    // little vials on it, one still glowing
    [[-0.25, 1.06], [0.25, 0.94]].forEach(([a, y], i)=>{ const p = zSurf(a, y, 0.06); P(b, CY(0.02, 0.022, 0.07, 10), 0x6a7a78, p[0], p[1], p[2]); P(b, CY(0.012, 0.012, 0.02, 8), ZC.wood, p[0], p[1] + 0.045, p[2]); if(i) glow(R, b, 0.017, D.light, p[0], p[1] - 0.01, p[2]); });
  }
  // the chained tome at his left hip
  { const g = group(sk, -0.29, 0.62, 0.06); g.rotation.set(0.1, -1.2, 0.08); R.anim.push({ o:g, sway:0.06, speed:2.1 });
    P(g, BX(0.17, 0.22, 0.065), ZC.leather2);
    P(g, BX(0.155, 0.205, 0.055), ZC.parch, 0.012, 0, 0);
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([x, y])=> P(g, BX(0.03, 0.03, 0.07), ZC.brass, x*0.075, y*0.1, 0));
    P(g, BX(0.03, 0.06, 0.075), ZC.iron2, 0.085, 0, 0); P(g, zto(0.025, 0.007), ZC.iron2, 0.1, 0, 0, 0, PI/2);
    P(g, OC(0.03), D.stars, 0, 0.0, 0.034, 0, 0, PI/4, 1, 1.4, 0.3);
    zChain(sk, [-0.27, 0.79, 0.08], [-0.29, 0.73, 0.07], 3, ZC.iron2, 0.016);
  }
  // prayer beads at the front, ending in a little bone skull
  { const pts = []; for(let i=0;i<=16;i++){ const t = i/16, a = 0.35 + t*0.5; const p = zSurf(a, 0.79 - Math.sin(t*PI)*0.2, 0.03); pts.push(p); P(sk, S(i % 4 ? 0.016 : 0.021, 8, 6), i % 4 ? 0x3a2a20 : ZC.bone, p[0], p[1], p[2]); }
    const top = pts[8]; for(let i=1;i<5;i++) P(sk, zs(0.015), 0x3a2a20, top[0], top[1] - i*0.03, top[2] + 0.005);
    const skp = [top[0], top[1] - 0.17, top[2] + 0.01];
    P(sk, zs(0.03), ZC.bone, skp[0], skp[1], skp[2], 0, 0, 0, 1, 1.05, 0.95);
    P(sk, BX(0.035, 0.018, 0.03), ZC.bone, skp[0], skp[1] - 0.027, skp[2] + 0.004);
    [-1, 1].forEach(s=> P(sk, zs(0.009), ZC.hole, skp[0] + s*0.012, skp[1] + 0.003, skp[2] + 0.026));
  }
  // paper talismans hung from the belt, sealed in old blood
  [[-1.6, 0.0], [-2.1, 0.3], [2.3, -0.2]].forEach(([a, r], i)=>{
    const p = zSurf(a, 0.66, 0.035), g = group(sk, p[0], p[1], p[2]); g.rotation.set(0, a, r*0.3); R.anim.push({ o:g, sway:0.08, speed:2.6 + i*0.4 });
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
    P(beard, zTaper(pts, 0.015 - Math.abs(u)*0.004, 0.002, 12, 5), [0x5e5a54, 0x4a4742, 0x76726a][i % 3]);
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
      P(head, new THREE.SphereGeometry(0.058, 16, 8, 0, PI*2, 0, PI*0.5), 0x3e4226, s*0.1, 0.205, 0.105, -0.55);
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
    const sl = zLathe([[0.07, 0.03], [0.083, -0.12], [0.092, -0.3], [0.115, -0.45], [0.15, -0.55]], 16, 0, PI*2, 3);
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
  // whatever a costume hung below the belt (pouches, jars, charms) swings with the skirt
  b.children.slice().forEach(o=>{ if(o !== skirtP && o.position.y > 0.17 && o.position.y < 0.8){ b.remove(o); sk.add(o); } });
  // gaunt: the whole figure drawn narrower than it was built; the hood and the
  // gun keep (nearly) their own proportions
  b.scale.set(0.86, 1, 0.92);
  head.scale.set(0.95/0.86, 1, 0.97/0.92);
  gunHolder.scale.set(1/0.86, 1, 1/0.92);
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
Models.frog = function(twin, buffs, opts){
  buffs = buffs || []; opts = opts || {};
  const shine = !!opts.redeemed;   // the ending: the Gloom lets go, and he's a bright green frog with orange hands again
  const has = id=> buffs.indexOf(id) >= 0;
  const R = rig("frog"), b = R.body;
  R.anim = [];
  // Gribbus: ditch-water olive and mud; Grobbus: the grey-green of an old pond
  const G1 = shine ? 0x46c838 : twin ? 0x404a42 : 0x54522c, G2 = shine ? 0x2a8a26 : twin ? 0x262e28 : 0x34301c, BELLY = shine ? 0xeeeaa8 : twin ? 0x8a9482 : 0xa8986a;
  const WART = shine ? 0x72e050 : twin ? 0x56625a : 0x6e6438, IRIS = shine ? 0xffd23d : twin ? 0x9ab890 : 0xc8902a;
  const HAND = shine ? 0xff8a2a : G2;
  const SCARF = has("doom") ? 0x1e1620 : has("croak") ? 0x4a6a7a : twin ? 0x2a3a5a : 0x5a1a14;
  let sd = twin ? 11 : 5; const rnd = ()=> (sd = (sd*16807) % 2147483647)/2147483647;
  // the rig: a pivot for each moving bit, with an inner group set back by the
  // pivot so every part is still placed in body coordinates
  const pivot = (parent, x, y, z)=>{ const g = group(parent, x, y, z); return [g, group(g, -x, -y, -z)]; };
  const [headP, H] = pivot(b, 0, 0.3, 0.06); R.parts.head = headP;
  const [throatP, TH] = pivot(H, 0, 0.245, 0.2); R.parts.throat = throatP;
  const hind = [], thighs = [], front = [], feet = [], lids = [];
  [-1, 1].forEach(s=>{
    const [tp, ti] = pivot(b, s*0.25, 0.22, -0.18); thighs.push(tp); tp.userData.inner = ti;
    const [hp, hi] = pivot(b, s*0.25, 0.22, -0.18); hind.push(hp);
    const [fp, fi] = pivot(hi, s*0.3, 0.07, -0.08); feet.push(fp); hp.userData.inner = hi; fp.userData.inner = fi;
    const [ap, ai] = pivot(b, s*0.16, 0.25, 0.22); front.push(ap); ap.userData.inner = ai;
  });
  R.parts.hind = hind; R.parts.thighs = thighs; R.parts.feet = feet; R.parts.front = front; R.parts.lids = lids;
  // the body: heavy and squat, belly sagging
  P(b, fSkin(0.32, 34, 26, 0.02, 15, 1.3, G1, G2, BELLY), 0xffffff, 0, 0.26, -0.03, 0, 0, 0, 1.18, 0.76, 1.08);
  // the head: wide and flat, a pale throat under it
  P(H, fSkin(0.25, 36, 26, 0.014, 18, 2.1, G1, G2, BELLY), 0xffffff, 0, 0.37, 0.16, 0, 0, 0, 1.18, 0.8, 0.98);
  P(TH, fSkin(0.2, 28, 20, 0.006, 15, 3.3, BELLY, zDim(BELLY, 0.8)), 0xffffff, 0, 0.245, 0.2, 0, 0, 0, 1.1, 0.55, 0.92);
  // poison glands behind the eyes, pitted
  [-1, 1].forEach(s=>{
    P(H, fSkin(0.09, 20, 14, 0.006, 30, 4 + s, G2, zDim(G2, 0.7)), 0xffffff, s*0.21, 0.44, 0.0, 0, s*0.35, 0, 0.7, 0.5, 1.4);
    for(let i=0;i<5;i++) P(H, zs(0.008), FC.hole, s*(0.2 + (i % 2)*0.03), 0.475, -0.06 + i*0.03);
  });
  // warts all over his back and head
  for(let i=0;i<32;i++){
    const u = PI*0.45 + rnd()*PI*1.1, v = -0.1 + rnd()*1.25, r = 0.02 + rnd()*0.022;
    const x = Math.sin(u)*Math.cos(v)*0.32*1.18, y = 0.26 + Math.sin(v)*0.32*0.76, z = -0.03 + Math.cos(u)*Math.cos(v)*0.32*1.08;
    P(b, K.lump(r, 1, 0.4, i + (twin ? 50 : 0)), i % 3 ? WART : zDim(WART, 0.75), x*1.0, y, z, 0, 0, 0, 1, 0.75, 1);
  }
  for(let i=0;i<10;i++){ const x = (rnd() - 0.5)*0.4, z = 0.1 + rnd()*0.2; if(Math.abs(Math.abs(x) - 0.15) < 0.07 && z > 0.17) continue; P(H, K.lump(0.014 + rnd()*0.012, 1, 0.4, 90 + i), WART, x, 0.37 + 0.16*Math.sqrt(Math.max(0, 1 - (x/0.32)*(x/0.32) - ((z - 0.17)/0.245)*((z - 0.17)/0.245))), z); }
  // the eyes: raised, slit-pupilled, glowing dully under heavy lids; the left one scarred half shut
  [-1, 1].forEach(s=>{
    P(H, fSkin(0.095, 24, 18, 0.004, 25, 5 + s, G1, G2), 0xffffff, s*0.15, 0.495, 0.21);
    P(H, zs(0.064, 14, 10), 0x24160a, s*0.15, 0.52, 0.248);
    glow(R, H, 0.052, s < 0 ? zDim(IRIS, 0.7) : IRIS, s*0.15, 0.52, 0.272);
    halo(R, H, IRIS, s < 0 ? 0.2 : 0.28, s*0.15, 0.53, 0.31, 0.7);
    P(H, BX(0.011, 0.07, 0.008), FC.hole, s*0.15, 0.518, 0.326);
    const lg = group(H, s*0.15, 0.52, 0.256); lids.push(lg);
    const lid = P(lg, new THREE.SphereGeometry(0.072, 18, 8, 0, PI*2, 0, PI*0.5), G2, 0, 0, 0);
    lid.rotation.set(s < 0 ? -0.35 : -0.75, 0, s*0.35); lg.userData.shut = s < 0 ? 0.95 : 1.3;
    P(H, zto(0.058, 0.013, PI), G2, s*0.15, 0.515, 0.29, 0.2, 0, PI);
    P(H, K.lump(0.04, 1, 0.3, 7 + s), G2, s*0.16, 0.575, 0.2, 0, 0, s*0.4, 1.3, 0.6, 1);
  });
  // a scar down over the left eye, stitched; another across his back
  { const c0 = [-0.15, 0.52, 0.256], pts = [[-0.7, 0.4, -0.6], [-0.35, 0.85, 0.1], [-0.05, 0.75, 0.66], [0.1, 0.2, 0.98]].map(d=>{ const m = Math.hypot(d[0], d[1], d[2]); return [c0[0] + d[0]/m*0.078, c0[1] + d[1]/m*0.078, c0[2] + d[2]/m*0.078]; });
    pts.push([-0.12, 0.37, 0.4]);
    P(H, K.tube(pts, 0.005, 14, 5), FC.scar);
    [1, 2].forEach(i=> P(H, zcy(0.003, 0.003, 0.03, 4), 0x2a2018, pts[i][0], pts[i][1] + 0.003, pts[i][2], 0.5, 0, 1.2)); }
  { const pts = []; for(let i=0;i<=8;i++){ const u = PI*0.75 + i*0.08, v = 0.35 + i*0.06; pts.push([Math.sin(u)*Math.cos(v)*0.39, 0.26 + Math.sin(v)*0.25, -0.03 + Math.cos(u)*Math.cos(v)*0.355]); }
    P(b, K.tube(pts, 0.008, 16, 5), FC.scar);
    pts.forEach((p, i)=>{ if(i % 2) P(b, BX(0.004, 0.035, 0.006), 0x2a2018, p[0], p[1], p[2], 0.6, 0.8, 0.3); }); }
  // the mouth: wide, down at the corners, a rusty ring through one side
  { const pts = []; for(let i=0;i<=16;i++){ const q = -1.2 + i/16*2.4; pts.push([Math.sin(q)*0.29, 0.325 - Math.pow(q/1.2, 2)*0.07, 0.16 + Math.cos(q)*0.244]); }
    P(H, K.tube(pts, 0.01, 32, 6), FC.mouth);
    P(H, K.tube(pts.map(p=> [p[0]*1.02, p[1] + 0.014, p[2] + 0.003]), 0.009, 32, 5), zDim(G2, 0.9)); }
  P(H, zto(0.024, 0.006), FC.rust, 0.27, 0.25, 0.27, 0.3, 1.1, 0);
  [-1, 1].forEach(s=> P(H, zs(0.011), FC.hole, s*0.04, 0.425, 0.405, 0, 0, 0, 1, 0.6, 1));
  // legs: thick folded haunches, long webbed toes with knuckled tips
  [-1, 1].forEach(s=>{
    const ti = thighs[s < 0 ? 0 : 1].userData.inner, fi = feet[s < 0 ? 0 : 1].userData.inner, ai = front[s < 0 ? 0 : 1].userData.inner;
    P(ti, fSkin(0.13, 22, 16, 0.006, 20, 8 + s, G1, G2, BELLY), 0xffffff, s*0.27, 0.17, -0.12, 0, 0, 0, 0.8, 1, 1.3);
    P(fi, fSkin(0.1, 20, 12, 0.005, 20, 9 + s, HAND, zDim(HAND, 0.8)), 0xffffff, s*0.31, 0.04, 0.03, 0, s*0.2, 0, 1, 0.35, 1.5);
    // the shin, folded away inside the haunch until the leg straightens in a kick
    P(fi, zTaper([[s*0.3, 0.06, -0.02], [s*0.27, 0.15, -0.14], [s*0.25, 0.22, -0.24]], 0.04, 0.05, 8, 8), G1);
    [-0.5, -0.15, 0.2, 0.55].forEach((a, k)=>{ const ang = a + s*0.25, l = 0.12 + (k % 2)*0.03; const x0 = s*0.31, z0 = 0.1;
      const tip = [x0 + Math.sin(ang)*l, 0.018, z0 + Math.cos(ang)*l];
      P(fi, zTaper([[x0, 0.035, z0 - 0.02], [x0 + Math.sin(ang)*l*0.5, 0.03, z0 + Math.cos(ang)*l*0.5], tip], 0.02, 0.012, 8, 6), HAND);
      P(fi, zs(0.016), zDim(HAND, 0.8), tip[0], tip[1], tip[2], 0, 0, 0, 1, 0.7, 1); });
    // front legs, splayed hands
    P(ai, zTaper([[s*0.16, 0.24, 0.24], [s*0.2, 0.12, 0.29], [s*0.2, 0.04, 0.31]], 0.048, 0.034, 10, 10), G1);
    P(ai, zs(0.045), HAND, s*0.2, 0.025, 0.33, 0, 0, 0, 1.2, 0.4, 1.1);
    [-0.6, -0.1, 0.4].forEach((a, k)=>{ const ang = a + s*0.4, tip = [s*0.2 + Math.sin(ang)*0.08, 0.014, 0.34 + Math.cos(ang)*0.08];
      P(ai, zTaper([[s*0.2, 0.025, 0.34], tip], 0.014, 0.01, 6, 6), HAND); P(ai, zs(0.012), zDim(HAND, 0.8), tip[0], tip[1], tip[2]); });
  });
  // a rag knotted round his neck, a bone charm hung from it
  { const t = new THREE.TorusGeometry(0.25, 0.04, 9, 36); K.sculpt(t, 0.008, 25, 2);
    P(b, t, SCARF, 0, 0.27, 0.1, PI/2 - 0.25);
    P(b, K.lump(0.05, 1, 0.3, 3), SCARF, 0.2, 0.27, 0.23);
    [[0.24, 0.18, 0.22, 0.5, 0.15], [0.27, 0.2, 0.15, 0.9, 0.12]].forEach(([x, y, z, r, l])=>{ const g = new THREE.BoxGeometry(0.06, l, 0.02, 2, 6, 1); K.tatter(g, -l*0.2, 3, 0.03, r*7); P(b, g, zDim(SCARF, 0.85), x, y, z, 0, 0, r); });
    P(b, zcy(0.003, 0.003, 0.07, 5), 0x2a1e14, 0.0, 0.2, 0.37, 0.3);
    P(b, CO(0.018, 0.06, 6), FC.bone, 0.0, 0.15, 0.38, PI);
    P(b, zto(0.01, 0.003), FC.brass, 0.0, 0.185, 0.375); }
  // the crown (Royal Crown), hidden until he earns it: rusted iron, a little gold left on the points
  const crown = group(H, 0, 0.6, 0.12); crown.visible = false; R.parts.crown = crown;
  P(crown, CY(0.11, 0.12, 0.07, 24), FC.rust);
  P(crown, zto(0.115, 0.008), 0x8a6a2e, 0, -0.03, 0, PI/2);
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(crown, CO(0.025, 0.09, 6), 0x8a6a2e, Math.cos(a)*0.11, 0.07, Math.sin(a)*0.11); P(crown, zs(0.012), 0x6a1a14, Math.cos(a)*0.118, 0.0, Math.sin(a)*0.118); }
  // what he's learned, he wears
  buffs.forEach(id=>{ if(FROG_OUTFIT[id]) FROG_OUTFIT[id]({ R, b, h:H, G1, G2 }); });
  // the tongue: not baked, so the view can stretch it
  const tongue = new THREE.Mesh(CY(0.035, 0.05, 1, 8), K.lambert(0x8a3e48));
  tongue.geometry = tongue.geometry.clone(); tongue.geometry.rotateX(PI/2); tongue.geometry.translate(0, 0, 0.5);
  tongue.position.set(0, 0.33, 0.3); tongue.scale.set(1, 1, 0.01); tongue.visible = false; H.add(tongue); R.parts.tongue = tongue;
  R.h = 0.75;
  finish(R, { w:0.022 });
  if(shine){ R.root.traverse(o=>{ if(o.userData.baked){ o.material = o.material.clone(); o.material.emissive = new THREE.Color(0x183a10); } }); halo(R, R.body, 0xb8ff7a, 1.6, 0, 0.35, 0, 0.35); }
  return R;
};

/* Gribbus' tricks, worn (head at about (0, 0.37, 0.18), eyes on top at (±0.15, 0.49, 0.25)) */
const FROG_OUTFIT = {
  tongue(c){ P(c.h, zs(0.04), 0x8a3e48, 0.04, 0.31, 0.39, 0, 0, 0, 1, 0.6, 1.3); },
  spit(c){ [[0.12, 0.45, -0.18], [-0.1, 0.42, -0.22], [0.0, 0.5, -0.05], [0.18, 0.35, -0.08]].forEach(([x, y, z], i)=> P(c.b, K.lump(0.03, 1, 0.3, i), 0x6a8a2a, x, y, z, 0, 0, 0, 1, 0.6, 1)); P(c.h, zTaper([[-0.06, 0.32, 0.4], [-0.07, 0.25, 0.41], [-0.065, 0.18, 0.4]], 0.014, 0.004, 6, 6), 0x7a9a2a); glow(c.R, c.h, 0.02, 0x9cff3a, -0.065, 0.2, 0.4); },
  croak(c){ for(let i=0;i<5;i++){ const a = -0.9 + i*0.45; P(c.b, CO(0.02, 0.1, 5), 0x9ab8c8, Math.sin(a)*0.25, 0.22, 0.1 + Math.cos(a)*0.25, PI); } halo(c.R, c.b, 0x8ad8ff, 0.6, 0, 0.2, 0.3, 0.25); },
  hop(c){ [[0, 0.55, -0.22, 0.4], [0.03, 0.47, -0.27, -0.4], [0, 0.39, -0.3, 0.4]].forEach(([x, y, z, r])=> P(c.b, BX(0.035, 0.1, 0.02), 0x9a8a3a, x, y, z, -0.6, 0, r)); glow(c.R, c.b, 0.025, 0xfff04a, 0, 0.47, -0.31); },
  brood(c){ [[-0.12, 0.5, -0.12], [0.08, 0.52, -0.15], [0.0, 0.47, -0.25]].forEach(([x, y, z], i)=>{ P(c.b, zs(0.042), 0x1e261e, x, y, z); P(c.b, zTaper([[x, y, z - 0.03], [x + 0.02, y - 0.01, z - 0.09], [x - 0.01, y - 0.02, z - 0.13]], 0.02, 0.004, 8, 6), 0x2a342a); glow(c.R, c.b, 0.007, 0x9cff3a, x + 0.015, y + 0.02, z + 0.03); }); },
  lily(c){ const pad = new THREE.CylinderGeometry(0.2, 0.2, 0.02, 24, 1, false, 0.3, PI*2 - 0.6); K.sculpt(pad, 0.008, 14, 1); P(c.h, pad, 0x3e4a26, 0, 0.62, 0.15, 0.2); for(let k=0;k<5;k++){ const q = k/5*PI*2; P(c.h, zs(0.022), 0xa8909a, 0.06 + Math.cos(q)*0.02, 0.645, 0.18 + Math.sin(q)*0.02, 0, 0, 0, 1, 0.5, 1); } },
  gulp(c){ P(c.b, CO(0.13, 0.16, 3), 0xa89c80, 0, 0.24, 0.34, PI + 0.4, 0, 0, 1, 1, 0.25); P(c.b, zs(0.025), 0x5a3a22, 0.03, 0.2, 0.37, 0, 0, 0, 1, 0.8, 0.3); },
  crown(c){ /* the crown is already on him, hidden until now */ },
  bigboy(c){ [-1, 1].forEach(s=> P(c.b, fSkin(0.08, 16, 12, 0.005, 25, s, c.G1, c.G2), 0xffffff, s*0.22, 0.2, 0.25, 0, 0, 0, 1.3, 1, 1)); },
  flyhunt(c){ const g = group(c.h, 0.15, 0.85, 0.1); c.R.anim.push({ o:g, bob:0.06, speed:11 }); P(g, zs(0.03), 0x1a1a1a, 0, 0, 0, 0, 0, 0, 1, 1, 1.5); glow(c.R, g, 0.012, 0x9cff3a, 0, 0.01, 0.04); [-1, 1].forEach(s=>{ const w = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color:0xb8b8a8, transparent:true, opacity:0.45, side:THREE.DoubleSide })); w.position.set(s*0.05, 0.02, 0); w.rotation.set(-0.5, 0, s*0.5); g.add(w); c.R.glows.push(w); }); },
  mirror(c){ [[-0.1, 0.45, 0.25], [0.15, 0.4, 0.1]].forEach(([x, y, z])=> glow(c.R, c.b, 0.015, 0xd8e0e8, x, y, z)); },
  bubble(c){ P(c.h, CY(0.012, 0.012, 0.15, 6), 0x2a1c12, 0.12, 0.3, 0.4, PI/2, 0, -0.3); P(c.h, CY(0.04, 0.03, 0.06, 10), 0x2a1c12, 0.18, 0.33, 0.47); const bub = new THREE.Mesh(S(0.08, 12, 8), new THREE.MeshPhongMaterial({ color:0x8aa0a8, transparent:true, opacity:0.4, shininess:90 })); bub.position.set(0.2, 0.46, 0.5); c.h.add(bub); c.R.glows.push(bub); c.R.anim.push({ o:bub, bob:0.04, speed:3 }); },
  doom(c){ const h = new THREE.SphereGeometry(0.31, 28, 12, 0, PI*2, 0, PI*0.55); K.tatter(h, 0.12, 9, 0.06, 4); P(c.h, h, 0x1a1418, 0, 0.36, -0.1, -0.5, 0, 0, 1.1, 0.9, 1); [-1, 1].forEach(s=> glow(c.R, c.h, 0.022, 0xff2a1a, s*0.15, 0.52, 0.3)); },
  twin(c){},
  zoomies(c){ P(c.h, zto(0.2, 0.016), 0x3a2a1e, 0, 0.53, 0.18, PI/2 - 0.2); [-1, 1].forEach(s=>{ P(c.h, CY(0.07, 0.07, 0.04, 14), 0x8a6a30, s*0.15, 0.53, 0.29, PI/2 - 0.3); P(c.h, CY(0.055, 0.055, 0.042, 14), 0x8a5a20, s*0.15, 0.535, 0.293, PI/2 - 0.3); }); },
  sticky(c){ P(c.h, zs(0.03), 0x9a6a7a, -0.06, 0.26, 0.39, 0, 0, 0, 1, 1.8, 1); }
};

/* ================================================================== *
 *  Goblins: gaunt, hunched, grey-green things that live off what the
 *  dungeon leaves behind. Long torn ears, needle teeth, eyes like
 *  embers at the bottom of a well; rags, rust and little fetishes.
 * ================================================================== */
const GOB = { skin:0x5f6a4e, dark:0x3a4232, eye:0xffb83a, cloth:0x4a3e30, metal:0x6a6a70, iron:0x26262a, rib:0x6a755a, wrap:0x4e4636 };
const BONEC = 0xc8bca0, RUSTC = 0x6a3a22, IRONC = 0x26262a, LEATH = 0x3a2a1e, BRASSC = 0x8a6a30, BLOODC = 0x4a1410, RAGC = 0x4a4234;
/* a lean torus for small rings, links and ribs (the shared TO is made for big smooth ones) */
const TOs = (r, t, a)=> geo("ts" + r + "," + t + "," + (a || 0), ()=> new THREE.TorusGeometry(r, t, 6, a && a < PI ? 10 : 18, a || PI*2));
/* K.sculpt, but vertices that share a place (seams, poles) stay together, so no cracks open */
function sculptW(g, amt, f, seed){
  const a = g.attributes.position, key = [], map = {};
  for(let i=0;i<a.count;i++){ const k = Math.round(a.getX(i)*1e4) + "," + Math.round(a.getY(i)*1e4) + "," + Math.round(a.getZ(i)*1e4); key.push(k); (map[k] || (map[k] = [])).push(i); }
  K.sculpt(g, amt, f, seed);
  for(const k in map){ const l = map[k]; if(l.length < 2) continue; let x = 0, y = 0, z = 0; l.forEach(i=>{ x += a.getX(i); y += a.getY(i); z += a.getZ(i); }); l.forEach(i=> a.setXYZ(i, x/l.length, y/l.length, z/l.length)); }
  g.computeVertexNormals();
  return g;
}
/* a fresh sculpted sphere (sculpt never touches the shared cache) */
function lumpS(r, w, h, amt, f, seed){ return sculptW(new THREE.SphereGeometry(r, SEG(w), SEG(h)), amt, f, seed); }
/* paint blotches of a second colour over a geometry (bruises, rust, mould); it multiplies the part's colour */
function blotch(g, c2, freq, cut, seed){
  const C2 = new THREE.Color(c2), s = seed || 0;
  return K.paint(g, 0xffffff, (c, x, y, z)=>{
    const n = Math.sin(x*freq + s)*Math.sin(y*freq*1.3 + s*1.7)*Math.sin(z*freq*0.8 + 2.1) + 0.5*Math.sin(x*freq*2.7 + 1.3)*Math.sin(z*freq*2.3 + s);
    if(n > cut) c.lerp(C2, Math.min(1, (n - cut)*3));
  });
}
/* a long bone or limb between points, with its joints */
function limb(parent, pts, r, col, jc){ P(parent, K.tube(pts, r, 6, 8), col); if(jc !== undefined) P(parent, S(r*1.3, 8, 6), jc, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[pts.length - 1][2]); }
/* a ring of rag wrapped round a limb */
function wraps(parent, r, ys, col, x, z, tilt){
  const y0 = Math.min(...ys) - 0.02, y1 = Math.max(...ys) + 0.02;
  P(parent, CY(r*0.98, r*1.06, y1 - y0, 10), col, x || 0, (y0 + y1)/2, z || 0, tilt || 0);
  [y0, y1].forEach((y, i)=> P(parent, TOs(r*(1.02 + i*0.04), r*0.12), col, x || 0, y, z || 0, PI/2 + 0.3*(i ? -1 : 1), 0, 0));
}
/* small iron links in a line */
function links(parent, a, b, n, r, col){ for(let i=0;i<n;i++){ const t = i/(n - 1); P(parent, TOs(r, r*0.3), col || IRONC, a[0] + (b[0] - a[0])*t, a[1] + (b[1] - a[1])*t, a[2] + (b[2] - a[2])*t, 0, i % 2 ? PI/2 : 0, Math.atan2(b[0] - a[0], b[1] - a[1])); } }
/* a little skull: cranium, black sockets (glowing if R and gc), a nose hole, a row of teeth */
function skull(parent, r, x, y, z, col, R, gc){
  const g = group(parent, x, y, z), c = col || BONEC;
  P(g, S(r, 12, 10), c, 0, 0, -r*0.1, 0, 0, 0, 0.92, 0.95, 1.08);
  P(g, S(r*0.62, 10, 8), c, 0, -r*0.5, r*0.36, 0, 0, 0, 1.05, 0.72, 0.9);
  [-1, 1].forEach(s=>{ P(g, S(r*0.27, 8, 6), 0x0c0808, s*r*0.36, -r*0.08, r*0.76, 0, 0, s*0.3, 1, 0.85, 0.6); if(R && gc) glow(R, g, r*0.09, gc, s*r*0.36, -r*0.1, r*0.86); });
  P(g, CO(r*0.12, r*0.22, 3), 0x0c0808, 0, -r*0.38, r*0.86, PI, 0, 0, 1, 1, 0.5);
  for(let i=0;i<5;i++) P(g, BX(r*0.1, r*0.17, r*0.08), 0xb0a488, (i - 2)*r*0.12, -r*0.8, r*0.62 - Math.abs(i - 2)*r*0.06);
  return g;
}
/* a string of bones and teeth hanging from a point */
function fetish(parent, x, y, z, n, col){
  P(parent, CY(0.004, 0.004, 0.055*n, 4), 0x2a2018, x, y - 0.0275*n, z);
  for(let i=0;i<n;i++) P(parent, i % 2 ? CO(0.012, 0.045, 5) : CY(0.009, 0.009, 0.04, 6), col || BONEC, x + (i % 2 ? 0.006 : -0.006), y - 0.03 - i*0.05, z + 0.006, i % 2 ? PI : 0, 0, (i % 3 - 1)*0.3);
}
/* a hood: a sculpted shell open at the front, the face lost in it */
function hoodGeo(r, open, len, seed){
  const g = new THREE.SphereGeometry(r, 28, 18, PI/2 + open/2, PI*2 - open, 0, PI*len);
  return sculptW(g, r*0.05, 2.2/r, seed);
}
/* a goblin's ear: a long torn leaf of gristle, notched where something bit it */
function gobEar(s, len){
  return geo("gear" + s + "," + len, ()=>{
    const pts = [[0, 0.055], [0.1, 0.07], [0.17, 0.055], [0.19, 0.022], [0.215, 0.052], [0.31, 0.035], [0.36, 0.014], [0.385, 0.028], [0.42, 0], [0.34, -0.012], [0.27, -0.028], [0.245, -0.004], [0.215, -0.036], [0.1, -0.05], [0, -0.045]];
    const sh = new THREE.Shape();
    pts.forEach((p, i)=> i ? sh.lineTo(s*p[0]*len, p[1]) : sh.moveTo(s*p[0]*len, p[1]));
    const g = new THREE.ExtrudeGeometry(sh, { depth:0.012, bevelEnabled:true, bevelThickness:0.006, bevelSize:0.006, bevelSegments:2, curveSegments:2 });
    g.translate(0, 0, -0.006); g.rotateX(-0.9); g.computeVertexNormals();
    return g;
  });
}
function goblinBody(R, o){
  const b = R.body, skin = o.skin || GOB.skin, dark = o.dark || GOB.dark, cloth = o.cloth || GOB.cloth, k = o.bulk || 1, seed = o.seed || 1, wrap = o.wrap || GOB.wrap;
  const rib = o.rib || GOB.rib, hunch = o.hunch === undefined ? 0.42 : o.hunch;
  // legs: thin and bent, long clawed feet, rags wound round the shins
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.09*k, 0.44, -0.02);
    limb(l, [[0, 0, 0], [s*0.012, -0.1, 0.05], [0, -0.2, 0.08]], 0.042*k, dark, skin);
    limb(l, [[0, -0.2, 0.08], [0, -0.31, 0.01], [0, -0.4, -0.03]], 0.031*k, skin);
    wraps(l, 0.034*k, [-0.29, -0.35], wrap, 0, 0.0, 0.4);
    P(l, S(0.05, 10, 6), dark, 0, -0.415, 0.035, 0, 0, 0, 0.85*k, 0.4, 1.7);
    [-1, 0, 1].forEach(t=> P(l, CO(0.012, 0.07, 5), 0x1a1612, t*0.025*k, -0.425, 0.125, PI/2 + 0.25, t*0.25, 0));
    legs.push(l);
  });
  R.parts.legs = legs;
  // the torso, bent forward: ribs and spine through the skin, shoulder blades like wings
  const tor = group(b, 0, 0.42, 0); tor.rotation.x = hunch; R.tor = tor;
  const tp = [[0, 0], [0.12, 0.01], [0.13, 0.07], [0.108, 0.15], [0.122, 0.24], [0.15, 0.34], [0.16, 0.41], [0.12, 0.47], [0.05, 0.5], [0, 0.5]].map(p=> [p[0]*k, p[1]]);
  P(tor, blotch(sculptW(K.slathe(tp, 16, 4), 0.01, 10, seed), 0x8a7a80, 11, 0.45, seed), skin, 0, 0, 0, 0, 0, 0, 1, 1, 0.78);
  [[0.21, 0.12], [0.265, 0.133], [0.32, 0.147]].forEach(([y, r])=> P(tor, TOs(r*k, 0.005, PI*0.6), rib, 0, y, 0.005, PI/2 + 0.3, 0, PI/2 - PI*0.3, 1, 0.8, 1));
  for(let i=0;i<7;i++){ const y = 0.1 + i*0.055; P(tor, S(0.02, 6, 4), rib, 0, y, -k*0.78*(0.11 + 0.045*y/0.41)); }
  [-1, 1].forEach(s=> P(tor, S(0.07, 10, 6), skin, s*0.08*k, 0.36, -0.1*k, 0, 0, s*0.2, 0.9, 1.1, 0.4));
  // a loincloth torn to strips, a belt
  P(b, K.tatter(K.lathe([[0.155*k, -0.15], [0.15*k, -0.05], [0.14*k, 0.04]], 14), -0.06, 9, 0.12, seed), cloth, 0, 0.5, 0.01, 0, 0, 0, 1, 1, 0.85);
  P(b, TOs(0.145*k, 0.017), LEATH, 0, 0.53, 0.01, PI/2, 0, 0, 1, 0.85, 1);
  P(b, BX(0.05, 0.045, 0.02), RUSTC, 0, 0.53, 0.01 + 0.125*k);
  const top = [0, 0.42 + 0.47*Math.cos(hunch), 0.47*Math.sin(hunch)];
  limb(b, [[0, top[1] - 0.04, top[2] - 0.05], [0, top[1] + 0.03, top[2] + 0.03], [0, top[1] + 0.07, top[2] + 0.1]], 0.04*k, skin);
  // the head: thrust forward on the neck, a long skull, the brow overhanging, a hooked nose, an underbite of needles
  const head = group(b, 0, top[1] + 0.1, top[2] + 0.12); R.parts.head = head; head.rotation.x = -0.3;
  P(head, blotch(lumpS(0.12, 14, 11, 0.008, 14, seed), 0x8a8070, 18, 0.55, seed), skin, 0, 0.02, -0.02, -0.25, 0, 0, 0.95, 0.88, 1.2);
  P(head, S(0.085, 12, 8), skin, 0, -0.05, 0.055, 0.2, 0, 0, 1.0, 0.7, 1.12);
  P(head, S(0.062, 10, 8), dark, 0, -0.095, 0.07, 0, 0, 0, 1.12, 0.5, 1.12);
  [-1, 1].forEach(s=> P(head, S(0.034, 8, 6), skin, s*0.07, -0.025, 0.065, 0, 0, 0, 1, 0.7, 1));
  brows(head, 0.048, 0.04, 0.095, skin, "angry", 0.075);
  eyes(head, 0.047, 0.012, 0.093, 0.026, o.eye || GOB.eye, 0, R);
  if(o.nose !== false){ limb(head, [[0, 0.02, 0.11], [0, 0.0, 0.17], [0, -0.035, 0.2]], 0.019, skin);
  P(head, CO(0.017, 0.045, 6), skin, 0, -0.055, 0.2, PI, 0, 0); }
  mouth(head, 0, -0.085, 0.135, 0.05, 0.3);
  teeth(head, -0.076, 0.15, 0.085, 7);
  [-1, 1].forEach(s=> P(head, CO(0.011, 0.05, 5), BONEC, s*0.036, -0.095, 0.14, -0.2, 0, -s*0.15));
  [[0.06, 0.08, 0.06], [-0.07, 0.06, -0.06], [0.03, -0.02, -0.1]].forEach(([x, y, z])=> P(head, S(0.014, 6, 4), dark, x, y, z));
  const ear = (o.ear || 1)*0.68;
  [-1, 1].forEach(s=>{
    P(head, gobEar(s, ear), skin, s*0.1, 0.02, -0.02, 0, s*0.5, s*0.32);
    P(head, gobEar(s, ear*0.8), 0x4a3436, s*0.11, 0.03, -0.012, 0, s*0.5, s*0.32, 1, 0.55, 1);
  });
  P(head, TOs(0.022, 0.006), BRASSC, 0.27*ear, 0.08, -0.17, 0.3, 0.5, 0);
  // long arms that hang to the knee, bandaged, three black claws
  const arm = s=>{
    const a = group(b, s*0.19*k, top[1] - 0.08, top[2] - 0.06);
    P(a, S(0.05*k, 10, 8), skin, 0, 0, 0);
    limb(a, [[0, 0, 0], [s*0.03, -0.11, -0.02], [s*0.03, -0.22, -0.01]], 0.034*k, skin, dark);
    limb(a, [[s*0.03, -0.22, -0.01], [s*0.02, -0.33, 0.03], [0, -0.42, 0.06]], 0.027*k, skin);
    wraps(a, 0.031*k, [-0.3, -0.34, -0.38], wrap, s*0.016, 0.035, -0.3);
    P(a, S(0.036*k, 8, 6), skin, 0, -0.45, 0.07, 0, 0, 0, 1, 1.1, 0.75);
    [-1, 0, 1].forEach(f=> P(a, CO(0.01*k, 0.09, 5), 0x1e1a14, f*0.022*k, -0.5, 0.085, PI*0.9, 0, f*0.18));
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  R.hand = group(R.parts.armR, 0, -0.46, 0.08);
  return head;
}
/* a ring of teeth on a cord round the neck */
function toothCollar(R, n, col){
  const tor = R.tor;
  P(tor, TOs(0.13, 0.006), 0x2a2018, 0, 0.44, 0.01, PI/2 + 0.2, 0, 0, 1, 0.8, 1);
  for(let i=0;i<n;i++){ const a = -1.1 + i*2.2/(n - 1); P(tor, CO(0.011, 0.045, 5), col || BONEC, Math.sin(a)*0.13, 0.41 - Math.abs(a)*0.02, Math.cos(a)*0.105 + 0.01, PI + 0.2, 0, -a*0.2); }
}
const KITS = {
  grunt(R, head){
    // a dented, rusted helm with a bent spike, a nose guard
    P(head, blotch(sculptW(new THREE.SphereGeometry(0.138, 24, 12, 0, PI*2, 0, PI*0.52), 0.006, 12, 3), 0x8a5a3a, 16, 0.25, 2), 0x4a3c34, 0, 0.06, -0.03, -0.28, 0, 0, 1, 0.92, 1.22);
    P(head, TOs(0.137, 0.011), RUSTC, 0, 0.058, -0.02, PI/2 - 0.28, 0, 0, 1, 1.22, 1);
    for(let i=0;i<9;i++){ const a = i/9*PI*2; P(head, S(0.009, 4, 3), BRASSC, Math.cos(a)*0.138, 0.04 + Math.sin(a)*0.05, Math.sin(a)*0.165 - 0.02); }
    P(head, CO(0.02, 0.13, 6), RUSTC, 0.04, 0.17, -0.06, -0.4, 0, -0.45);
    P(head, BX(0.022, 0.1, 0.014), IRONC, 0, 0.01, 0.125, -0.3);
    // a notched, rusted cleaver-sword, blood dried on it
    P(R.hand, BX(0.03, 0.032, 0.13), LEATH, 0, 0, -0.01);
    P(R.hand, S(0.022, 8, 6), IRONC, 0, 0, -0.08);
    P(R.hand, BX(0.15, 0.022, 0.024), IRONC, 0, 0, 0.06);
    P(R.hand, blotch(new THREE.BoxGeometry(0.012, 0.08, 0.38, 1, 2, 8), 0x8a5a3a, 20, 0.1, 5), 0x5a5048, 0, 0.012, 0.26);
    P(R.hand, CO(0.04, 0.09, 4), 0x5a5048, 0, 0.012, 0.48, PI/2, 0, 0, 0.3, 1, 1);
    [0.16, 0.27, 0.36].forEach(z=> P(R.hand, BX(0.016, 0.018, 0.02), 0x0c0808, 0, 0.052, z));
    P(R.hand, BX(0.014, 0.05, 0.12), BLOODC, 0, -0.008, 0.36);
    // a shield of three boards, an iron band, a skull nailed to it
    const sh = group(R.parts.armL, -0.02, -0.3, 0.1); sh.rotation.y = -0.35;
    [-0.075, 0, 0.075].forEach((x, i)=> P(sh, BX(0.072, [0.28, 0.33, 0.25][i], 0.025), [0x3a2c22, 0x45342a, 0x33271e][i], x, (i - 1)*0.012, 0, 0, 0, (i - 1)*0.05));
    [-0.08, 0.08].forEach(y=> P(sh, BX(0.24, 0.024, 0.012), IRONC, 0, y, 0.016));
    [-0.09, 0.09].forEach(x=> [-0.08, 0.08].forEach(y=> P(sh, S(0.009, 4, 3), BRASSC, x, y, 0.024)));
    skull(sh, 0.045, 0, 0.01, 0.04, 0xb0a488);
    // a scrap pauldron on the shield shoulder
    P(R.parts.armL, blotch(sculptW(new THREE.SphereGeometry(0.075, 16, 8, 0, PI*2, 0, PI*0.5), 0.005, 18, 4), 0x8a5a3a, 22, 0.2, 6), 0x4a3c34, 0, 0.02, 0, 0, 0, 0.35, 1.1, 0.8, 1.05);
    toothCollar(R, 7);
  },
  slinger(R, head){
    // a ragged hood with crow feathers, a scarf over the mouth
    P(head, K.tatter(hoodGeo(0.15, 1.3, 0.68, 4), -0.03, 9, 0.06, 4), 0x3a3428, 0, 0.03, -0.01, -0.2, 0, 0, 1, 1, 1.15);
    for(let i=0;i<4;i++) P(head, CO(0.02, 0.14, 5), 0x16141a, -0.05 + i*0.025, 0.13, -0.1 - i*0.01, -1.1 - i*0.1, 0, -0.5 + i*0.25, 1, 1, 0.35);
    P(head, S(0.075, 10, 6), 0x2e2a22, 0, -0.08, 0.07, 0, 0, 0, 1.15, 0.55, 1.15);
    // the sling: a cord looped from the fist, a stone in the pouch
    P(R.hand, TOs(0.08, 0.005, PI*1.2), 0x6a5a40, 0, -0.08, 0.02, 0, PI/2, PI*0.9);
    P(R.hand, S(0.032, 8, 6), LEATH, 0, -0.16, 0.03, 0, 0, 0, 1.2, 0.7, 1);
    P(R.hand, lumpS(0.026, 8, 6, 0.006, 40, 2), 0x6a6a64, 0, -0.145, 0.03);
    // a bag of stones on the hip, a bone fetish on the belt
    P(R.body, blotch(lumpS(0.08, 12, 9, 0.008, 18, 5), 0x6a5a48, 20, 0.3, 1), LEATH, -0.16, 0.42, -0.04, 0, 0, 0, 1, 1.15, 0.85);
    [[-0.17, 0.5, -0.04], [-0.14, 0.51, -0.01]].forEach(([x, y, z])=> P(R.body, lumpS(0.025, 6, 5, 0.006, 40, x), 0x6a6a64, x, y, z));
    fetish(R.body, 0.12, 0.52, 0.09, 4);
    toothCollar(R, 5, 0xa89a80);
  },
  bomber(R, head){
    // a soot-black leather cap, goggles with smoked lenses, a burn scar
    P(head, new THREE.SphereGeometry(0.13, 20, 10, 0, PI*2, 0, PI*0.5), 0x2a201a, 0, 0.03, -0.02, -0.28, 0, 0, 1, 0.92, 1.2);
    P(head, TOs(0.13, 0.012), LEATH, 0, 0.025, -0.01, PI/2 - 0.12, 0, 0, 1, 1.2, 1);
    [-1, 1].forEach(s=>{
      P(head, CY(0.03, 0.033, 0.03, 14), BRASSC, s*0.048, 0.022, 0.1, PI/2 - 0.15);
      P(head, CY(0.024, 0.024, 0.034, 14), 0x140c08, s*0.048, 0.022, 0.104, PI/2 - 0.15);
      glow(R, head, 0.007, 0xff7a2a, s*0.044, 0.026, 0.123);
    });
    P(head, S(0.03, 8, 6), 0x5a3028, 0.07, -0.04, 0.07, 0, 0, 0, 1, 0.7, 0.6);
    // the keg: staves and iron hoops, a daubed skull, the fuse already lit
    const keg = group(R.hand, 0, 0.03, 0.08);
    P(keg, blotch(K.slathe([[0, -0.115], [0.08, -0.115], [0.1, 0], [0.08, 0.115], [0, 0.115]], 16), 0x6a5a48, 30, 0.2, 3), 0x3a2a1c);
    [-0.085, -0.03, 0.03, 0.085].forEach(y=> P(keg, TOs(0.1 - Math.abs(y)*0.22, 0.007), IRONC, 0, y, 0, PI/2));
    P(keg, BX(0.05, 0.012, 0.01), 0xa89a80, 0, 0.0, 0.1, 0, 0, 0.7); P(keg, BX(0.05, 0.012, 0.01), 0xa89a80, 0, 0.0, 0.1, 0, 0, -0.7);
    P(keg, K.tube([[0, 0.11, 0], [0.03, 0.16, 0.02], [0.01, 0.2, 0.05]], 0.007, 6, 6), 0x8a7a5a);
    glow(R, keg, 0.018, 0xffc060, 0.01, 0.205, 0.05);
    halo(R, keg, 0xff6a1a, 0.35, 0.01, 0.21, 0.05, 0.75);
    // a bandolier of black-powder pots across the chest
    const sash = group(R.tor, 0, 0.3, 0); sash.rotation.z = 0.65;
    P(sash, TOs(0.17, 0.016), LEATH, 0, 0, 0, PI/2, 0, 0, 1, 0.82, 1);
    [0.5, 1.0, 1.5, 2.0].forEach(a=>{ const x = Math.cos(a)*0.18, z = Math.sin(a)*0.15; P(sash, S(0.034, 10, 8), 0x1a1a1c, x, 0, z); P(sash, CY(0.005, 0.005, 0.04, 4), 0x8a7a5a, x, 0.04, z); });
  },
  shaman(R, head){
    // a beast's skull worn as a hat, antlers branching off it, feathers
    const sk = group(head, 0, 0.1, 0.0); sk.rotation.x = -0.3;
    P(sk, blotch(lumpS(0.1, 14, 10, 0.006, 16, 7), 0x8a7a60, 16, 0.4, 2), BONEC, 0, 0, -0.02, 0, 0, 0, 1.05, 0.72, 1.2);
    P(sk, S(0.052, 10, 8), BONEC, 0, -0.025, 0.11, 0, 0, 0, 0.75, 0.6, 1.5);
    [-1, 1].forEach(s=>{
      P(sk, S(0.026, 8, 6), 0x0c0808, s*0.048, 0.01, 0.075);
      limb(sk, [[s*0.05, 0.04, -0.03], [s*0.13, 0.12, -0.07], [s*0.19, 0.24, -0.05], [s*0.21, 0.36, 0.01]], 0.013, 0x8a7a60);
      limb(sk, [[s*0.15, 0.16, -0.06], [s*0.17, 0.24, 0.02], [s*0.16, 0.29, 0.06]], 0.009, 0x8a7a60);
      limb(sk, [[s*0.19, 0.25, -0.05], [s*0.27, 0.31, -0.08], [s*0.31, 0.36, -0.06]], 0.008, 0x8a7a60);
    });
    for(let i=0;i<5;i++) P(head, CO(0.018, 0.16, 5), [0x1a1a1e, 0x3a1a14, 0x1a1a1e, 0x2a2a20, 0x1a1a1e][i], (i - 2)*0.035, 0.0, -0.13, -2.2, 0, (i - 2)*0.2, 1, 1, 0.35);
    // a robe to the ankles in mouldy strips, a mantle of feathers and fur
    P(R.body, K.tatter(K.slathe([[0.21, -0.4], [0.19, -0.2], [0.16, 0], [0.15, 0.04]], 16), -0.12, 13, 0.14, 3), 0x3a3428, 0, 0.5, 0.01, 0, 0, 0, 1, 1, 0.9);
    for(let i=0;i<12;i++){ const a = -PI*0.85 + i/11*PI*1.7; P(R.tor, CO(0.035, 0.14, 5), [0x1e1c1a, 0x2e2620, 0x26201c][i % 3], Math.sin(a)*0.16, 0.42, Math.cos(a)*0.12, PI + Math.cos(a)*0.5, 0, Math.sin(a)*0.5, 1, 1, 0.5); }
    // the staff, crooked at the top, and from the crook a censer on a chain, smoking green
    limb(R.hand, [[0, -0.42, 0], [0.02, 0, 0.01], [-0.01, 0.42, 0], [0.03, 0.74, 0.02], [0.13, 0.84, 0.03]], 0.016, 0x3a2c1e);
    links(R.hand, [0.13, 0.82, 0.03], [0.13, 0.7, 0.03], 5, 0.012);
    const cs = group(R.hand, 0.13, 0.64, 0.03);
    P(cs, K.lathe([[0, -0.06], [0.045, -0.04], [0.055, 0.0], [0.04, 0.03], [0.012, 0.06], [0, 0.07]], 12), BRASSC);
    [0, 2.1, 4.2].forEach(a=> P(cs, S(0.013, 6, 4), 0x0c0808, Math.cos(a)*0.05, 0.0, Math.sin(a)*0.05));
    R.parts.gem = glow(R, cs, 0.03, 0x9cff3a, 0, 0.0, 0.0);
    halo(R, cs, 0x9cff3a, 0.6, 0, 0.0, 0, 0.55);
    halo(R, cs, 0x5a8a4a, 0.5, 0.02, 0.14, 0, 0.25);
    halo(R, cs, 0x4a6a40, 0.7, -0.03, 0.3, 0, 0.15);
    fetish(R.hand, 0.04, 0.72, 0.02, 4);
    fetish(R.hand, -0.02, 0.6, 0.0, 3, 0x8a6a4a);
    toothCollar(R, 9);
  },
  brute(R, head){
    // a sack over its head, sagging, two eyeholes hacked through it (one bigger), sewn round and tied on top
    P(head, blotch(lumpS(0.135, 16, 12, 0.016, 12, 5), 0x6a5a4a, 9, 0.35, 4), 0x564834, 0.005, 0.0, 0.02, 0.15, 0, 0.12, 1.02, 1.0, 1.1);
    P(head, lumpS(0.07, 10, 8, 0.012, 20, 9), 0x564834, -0.01, 0.12, -0.02, 0.3, 0, 0.4, 0.8, 1.1, 0.8);
    P(head, TOs(0.04, 0.011), 0x6a5a3a, -0.015, 0.1, -0.01, PI/2 + 0.3, 0, 0.4);
    [[-1, 0.03, 0.024], [1, 0.022, 0.032]].forEach(([s, y, r])=>{
      const x = s*0.055;
      P(head, S(r, 10, 8), 0x050304, x, y, 0.13, 0, 0, 0, 1.2, 0.9, 0.5);
      glow(R, head, r*0.22, 0xff3a1a, x, y - r*0.1, 0.142);
      for(let i=0;i<6;i++){ const a = i/6*PI*2; P(head, BX(0.004, 0.02, 0.004), 0x1a1410, x + Math.cos(a)*r*1.3, y + Math.sin(a)*r*1.1, 0.137, 0, 0, a); }
    });
    for(let i=0;i<5;i++) P(head, BX(0.026, 0.005, 0.005), 0x1a1410, 0.004, 0.11 - i*0.04, 0.148 - Math.abs(i - 2)*0.012);
    // an iron jaw bolted on below it, teeth filed into the rim
    P(head, blotch(sculptW(new THREE.TorusGeometry(0.085, 0.028, 10, 28, PI*1.1), 0.004, 20, 3), 0x8a5a3a, 22, 0.2, 3), 0x3a3230, 0, -0.105, 0.04, PI/2 + 0.25, 0, PI*0.95, 1, 1.2, 0.8);
    for(let i=0;i<7;i++){ const a = -0.9 + i*0.3; P(head, CO(0.008, 0.035, 5), 0x8a8070, Math.sin(a)*0.085, -0.08, 0.04 + Math.cos(a)*0.1, -0.15, 0, -a*0.3); }
    [-1, 1].forEach(s=> P(head, CY(0.012, 0.012, 0.012, 8), BRASSC, s*0.09, -0.1, 0.06, 0, 0, PI/2));
    // a noose for a collar, the cut rope hanging down the back
    P(R.tor, TOs(0.12, 0.018), 0x6a5a3a, 0, 0.44, 0.0, PI/2 + 0.2, 0, 0, 1, 0.85, 1);
    limb(R.tor, [[0, 0.44, -0.11], [0.02, 0.36, -0.16], [-0.01, 0.26, -0.17]], 0.016, 0x6a5a3a);
    // stitched scars, a filthy bandage round the gut, an iron pauldron with spikes
    [[0.05, 0.3, 0.6], [-0.06, 0.18, -0.4]].forEach(([x, y, a])=>{ const g = group(R.tor, x, y, 0.15); g.rotation.z = a; P(g, BX(0.14, 0.008, 0.01), 0x3a1a18); for(let i=0;i<5;i++) P(g, BX(0.005, 0.03, 0.012), 0x1a1410, -0.05 + i*0.025, 0, 0.003); });
    P(R.tor, TOs(0.19, 0.018), 0x6a604c, 0, 0.1, 0, PI/2 + 0.1, 0, 0, 1, 0.8, 1);
    P(R.tor, TOs(0.185, 0.016), 0x5a5240, 0, 0.14, 0, PI/2 - 0.12, 0, 0, 1, 0.8, 1);
    P(R.tor, BX(0.05, 0.04, 0.02), BLOODC, 0.08, 0.12, 0.15, 0, 0.5, 0);
    P(R.parts.armL, blotch(sculptW(new THREE.SphereGeometry(0.1, 18, 8, 0, PI*2, 0, PI*0.5), 0.006, 14, 6), 0x8a5a3a, 18, 0.15, 6), 0x3a3230, 0, 0.03, 0, 0, 0, 0.4, 1.1, 0.8, 1.05);
    [-0.4, 0, 0.4].forEach(a=> P(R.parts.armL, CO(0.016, 0.09, 6), 0x5a4a40, -Math.sin(0.6 + a*0.3)*0.07, 0.09, a*0.12, 0, 0, 0.6));
    // a butcher's cleaver, rusted, its haft chained to the wrist
    P(R.hand, BX(0.034, 0.04, 0.16), LEATH, 0, 0, 0.0);
    P(R.hand, blotch(new THREE.BoxGeometry(0.018, 0.2, 0.34, 1, 4, 8), 0x8a5a3a, 14, 0.0, 7), 0x4a4440, 0, -0.06, 0.26);
    P(R.hand, BX(0.02, 0.016, 0.34), 0x8a8680, 0, -0.165, 0.26);
    P(R.hand, CY(0.02, 0.02, 0.022, 10), 0x0a0808, 0, 0.0, 0.38, 0, 0, PI/2);
    P(R.hand, BX(0.022, 0.07, 0.09), BLOODC, 0, -0.12, 0.33);
    links(R.hand, [0, 0, -0.09], [0, 0.12, -0.04], 6, 0.016);
    links(R.parts.armR, [0, -0.36, 0.05], [0.02, -0.3, 0.06], 3, 0.02);
  },
  sneak(R, head){
    // a deep hood, the face lost in it but for two red pricks; a cloth over the mouth
    P(head, K.tatter(hoodGeo(0.155, 1.1, 0.7, 6), -0.03, 9, 0.07, 6), 0x1c1a20, 0, 0.03, 0.0, -0.3, 0, 0, 1, 1, 1.22);
    P(head, S(0.078, 10, 6), 0x16141a, 0, -0.075, 0.075, 0, 0, 0, 1.15, 0.6, 1.15);
    // a cloak torn to ribbons, open at the front
    const cl = new THREE.LatheGeometry([[0.25, 0], [0.22, 0.2], [0.18, 0.4], [0.12, 0.5]].map(p=> new THREE.Vector2(p[0], p[1])), 24, 0.7, PI*2 - 1.4);
    P(R.tor, sculptW(K.tatter(cl, 0.12, 12, 0.16, 7), 0.008, 12, 7), 0x1e1c22, 0, -0.02, -0.02, 0, 0, 0, 1, 1, 0.85);
    // a long knife forward, another strapped across the back, a row of throwing blades on a strap
    P(R.hand, BX(0.026, 0.03, 0.1), LEATH, 0, 0, 0.0);
    P(R.hand, BX(0.06, 0.012, 0.016), IRONC, 0, 0, 0.055);
    P(R.hand, BX(0.008, 0.028, 0.24), 0x5e5e64, 0, 0, 0.18);
    P(R.hand, CO(0.014, 0.05, 4), 0x5e5e64, 0, 0, 0.32, PI/2, 0, 0, 0.6, 1, 1);
    P(R.tor, BX(0.02, 0.3, 0.012), 0x2a2620, 0.0, 0.3, -0.15, 0, 0, 0.6);
    const strap = group(R.tor, 0, 0.3, 0); strap.rotation.z = -0.6;
    P(strap, TOs(0.165, 0.012), LEATH, 0, 0, 0, PI/2, 0, 0, 1, 0.82, 1);
    [0.9, 1.2, 1.5, 1.8].forEach(a=> P(strap, BX(0.012, 0.07, 0.006), 0x6a6a70, Math.cos(a)*0.17, 0.02, Math.sin(a)*0.14 + 0.005, 0, -a + PI/2, 0));
  },
  merchant(R, head){
    // a deep hood, the grin too wide inside it
    P(head, K.tatter(hoodGeo(0.16, 1.2, 0.72, 8), -0.04, 10, 0.07, 8), 0x2e241c, 0, 0.03, -0.0, -0.25, 0, 0, 1, 1, 1.2);
    teeth(head, -0.066, 0.152, 0.11, 9, 0xd8cca8);
    // a long robe, a moth-eaten mantle
    P(R.body, K.tatter(K.slathe([[0.22, -0.42], [0.19, -0.2], [0.16, 0], [0.15, 0.06]], 16), -0.14, 12, 0.12, 5), 0x3a2e24, 0, 0.5, 0.0, 0, 0, 0, 1, 1, 0.9);
    const ml = new THREE.LatheGeometry([[0.22, 0], [0.2, 0.12], [0.14, 0.22], [0.08, 0.26]].map(p=> new THREE.Vector2(p[0], p[1])), 24);
    P(R.tor, sculptW(K.tatter(ml, 0.06, 14, 0.07, 9), 0.008, 12, 9), 0x2e241c, 0, 0.26, 0, 0, 0, 0, 1, 1, 0.85);
    // the pack of everything he's ever picked up: a sack, pots, a pan, a caged skull, a rolled rug, candles, antlers
    const pk = group(R.tor, 0, 0.32, -0.24); pk.rotation.x = -0.3;
    P(pk, blotch(lumpS(0.22, 16, 12, 0.018, 7, 3), 0x7a6a50, 9, 0.3, 2), 0x4a3e2c, 0, 0.0, 0, 0, 0, 0, 1, 1.2, 0.75);
    [-1, 1].forEach(s=> P(R.tor, TOs(0.17, 0.012, PI*0.9), LEATH, s*0.1, 0.32, -0.05, 0, PI/2, PI*0.55, 1, 1, 1));
    P(pk, CY(0.06, 0.06, 0.44, 12), 0x5a2a20, 0, 0.24, -0.02, 0, 0, PI/2);
    P(pk, TOs(0.06, 0.008), 0x3a2a1a, 0.12, 0.24, -0.02, 0, PI/2, 0); P(pk, TOs(0.06, 0.008), 0x3a2a1a, -0.12, 0.24, -0.02, 0, PI/2, 0);
    P(pk, K.lathe([[0, 0], [0.06, 0.01], [0.07, 0.06], [0.04, 0.1], [0.045, 0.12]], 12), 0x6a4030, 0.2, -0.12, 0.02, 0, 0, -0.4);
    P(pk, K.lathe([[0, 0], [0.04, 0.01], [0.05, 0.05], [0.025, 0.08]], 12), 0x4a4a3a, -0.21, -0.02, 0.04, 0, 0, 0.5);
    P(pk, CY(0.075, 0.07, 0.015, 16), IRONC, -0.15, 0.06, -0.14, PI/2 - 0.3, 0, 0.3); P(pk, BX(0.02, 0.012, 0.14), 0x2a2018, -0.15, 0.13, -0.2, -0.9);
    const cage = group(pk, 0.16, 0.15, -0.08);
    P(cage, CY(0.05, 0.05, 0.012, 12), IRONC, 0, -0.05, 0); P(cage, new THREE.SphereGeometry(0.05, 12, 6, 0, PI*2, 0, PI*0.5), IRONC, 0, 0.04, 0, 0, 0, 0, 1, 0.5, 1);
    for(let i=0;i<7;i++){ const a = i/7*PI*2; P(cage, CY(0.003, 0.003, 0.09, 4), IRONC, Math.cos(a)*0.05, 0, Math.sin(a)*0.05); }
    skull(cage, 0.026, 0, -0.02, 0, BONEC);
    [[-0.05, 0.27], [0.05, 0.25]].forEach(([x, y], i)=>{ P(pk, CY(0.014, 0.016, 0.07 + i*0.02, 8), 0xc8bc98, x, y + 0.02, 0.0); glow(R, pk, 0.012, 0xffb050, x, y + 0.07 + i*0.01, 0.0); });
    [-1, 1].forEach(s=> limb(pk, [[s*0.05, 0.12, -0.12], [s*0.12, 0.26, -0.18], [s*0.16, 0.36, -0.14]], 0.011, 0x8a7a60));
    fetish(pk, -0.18, -0.08, 0.1, 4); fetish(pk, 0.1, -0.12, 0.14, 3, 0x8a6a4a);
    // a crooked pole in his fist, a lantern hung from it, burning low
    limb(R.hand, [[0, -0.3, 0], [0.01, 0.05, 0.02], [0.03, 0.35, 0.06], [0.1, 0.45, 0.12], [0.15, 0.44, 0.15]], 0.013, 0x3a2c1e);
    links(R.hand, [0.15, 0.43, 0.15], [0.15, 0.35, 0.15], 3, 0.011);
    const lt = group(R.hand, 0.15, 0.27, 0.15);
    P(lt, CY(0.04, 0.045, 0.014, 6), IRONC, 0, -0.05, 0); P(lt, CO(0.05, 0.05, 6), IRONC, 0, 0.065, 0);
    for(let i=0;i<6;i++){ const a = i/6*PI*2 + PI/6; P(lt, BX(0.008, 0.1, 0.008), IRONC, Math.cos(a)*0.04, 0, Math.sin(a)*0.04); }
    P(lt, CY(0.03, 0.035, 0.09, 6), 0x5a4a30, 0, 0, 0);
    R.parts.gem = glow(R, lt, 0.026, 0xffb050, 0, 0, 0);
    halo(R, lt, 0xff9a3a, 1.0, 0, 0, 0, 0.6);
  },
  king(R, head){
    const crown = group(head, 0, 0.12, 0); R.parts.crown = crown;
    P(crown, CY(0.12, 0.13, 0.09, 12), BRASSC);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(crown, CO(0.026, 0.1, 4), BRASSC, Math.cos(a)*0.12, 0.09, Math.sin(a)*0.12); P(crown, S(0.016, 6, 4), [0x8a1a2a, 0x2a4a6a][i % 2], Math.cos(a)*0.125, 0.01, Math.sin(a)*0.125); }
    glow(R, crown, 0.025, 0xff3a2a, 0, 0.01, 0.13);
    P(R.body, K.tatter(K.slathe([[0.32, -0.38], [0.28, 0], [0.22, 0.3]], 16), -0.2, 12, 0.12, 2), 0x4a1410, 0, 0.5, -0.05, 0, 0, 0, 1, 1, 0.85);
    for(let i=0;i<12;i++){ const a = i/12*PI*2; P(R.tor, S(0.06, 8, 6), 0x8a8070, Math.cos(a)*0.18, 0.46, Math.sin(a)*0.15); }
    P(R.hand, CY(0.02, 0.02, 0.85, 6), BRASSC, 0, 0.2, 0.1);
    P(R.hand, TOs(0.06, 0.015), BRASSC, 0, 0.6, 0.1, PI/2);
    glow(R, R.hand, 0.05, 0xff3a2a, 0, 0.64, 0.1);
    P(R.tor, S(0.24, 14, 10), GOB.skin, 0, 0.18, 0.06, 0, 0, 0, 1.1, 1, 1);
  }
};
Models.goblin = function(kind){
  const R = rig(kind);
  const size = { grunt:1, slinger:0.92, bomber:1, shaman:1, brute:1.75, sneak:0.95, merchant:1, king:2.5 }[kind] || 1;
  const o = {
    grunt:{ seed:1 },
    slinger:{ seed:2, skin:0x5a6450, ear:1.1 },
    bomber:{ seed:3, skin:0x585e4a, dark:0x2e3228, eye:0xff8a2a, wrap:0x4a4030 },
    shaman:{ seed:4, skin:0x5a6252, cloth:0x3a3428, eye:0x9cff3a, hunch:0.65 },
    brute:{ seed:5, nose:false, skin:0x55604a, dark:0x343c2e, bulk:1.45, hunch:0.6, eye:0xff3a1a, ear:0.8, cloth:0x3a3028 },
    sneak:{ seed:6, skin:0x4a5444, dark:0x2a3028, cloth:0x1e1c22, eye:0xff2a1a, wrap:0x2a2620, hunch:0.6 },
    merchant:{ seed:7, skin:0x6a6a58, eye:0xc8ff6a, cloth:0x3a2e24, hunch:0.6 },
    king:{ seed:8, skin:0x5f6a4e, cloth:0x4a1410, bulk:1.3, eye:0xff3a1a }
  }[kind] || {};
  const head = goblinBody(R, o);
  (KITS[kind] || KITS.grunt)(R, head);
  R.body.scale.setScalar(size);
  R.h = 1.25*size; R.size = size;
  return finish(R);
};

/* ================================================================== *
 *  Shroom folk: what the spores make of the dead. Pale, bruised caps
 *  with the gills showing, mycelium in threads over everything, and
 *  under the caps, what's left of the people they grew out of.
 * ================================================================== */
/* a cap: domed, its rim turned down and torn, its skin sculpted and bruised */
function capGeo(r, h, droop, seed, bruise){
  const g = sculptW(K.tatter(K.slathe([[0, -0.02], [r*0.35, -0.04], [r*0.82, -droop*0.75], [r*1.0, -droop], [r*1.04, -droop*0.45], [r*0.92, h*0.42], [r*0.58, h*0.85], [0, h]], 20, 4), -droop*0.55, 11, droop*0.5, seed), r*0.06, 2.6/r, seed);
  const B = new THREE.Color(bruise || 0x6a5060), f = 2.4/r, s = seed || 0;
  return K.paint(g, 0xffffff, (c, x, y, z)=>{
    const a = Math.atan2(z, x), rr = Math.hypot(x, z)/r;
    const n = Math.sin(x*f + s)*Math.sin(y*f*1.3 + s*1.7)*Math.sin(z*f*0.8 + 2.1) + 0.5*Math.sin(x*f*2.7 + 1.3)*Math.sin(z*f*2.3 + s);
    if(n > 0.15) c.lerp(B, Math.min(1, (n - 0.15)*2.5));
    const st = Math.sin(a*29 + Math.sin(a*5 + s)*2.5 + rr*3);
    c.multiplyScalar(0.9 + 0.2*st*st*st);
    const fi = Math.sin(x*f*3.1 + Math.sin(z*f*2.2 + s)*1.7)*Math.sin(z*f*3.4 + Math.sin(x*f*1.9)*1.4);
    if(Math.abs(fi) < 0.05 && y > 0) c.multiplyScalar(0.3);
    if(y < h*0.15) c.multiplyScalar(0.65 + 0.35*Math.max(0, y/(h*0.15)));
    if(rr < 0.35 && y > 0) c.multiplyScalar(1.12);
  });
}
/* the underside: a dark disc and radiating gill plates */
function underCap(parent, r, y, col, n){
  P(parent, new THREE.CircleGeometry(r*0.92, 28), 0x2a201e, 0, y - 0.002, 0, PI/2);
  for(let i=0;i<n;i++){ const a = i/n*PI*2; P(parent, BX(0.006, r*0.1, r*0.58), col, Math.cos(a)*r*0.6, y - r*0.05, Math.sin(a)*r*0.6, 0, PI/2 - a, 0); }
}
/* warts and scales on a cap */
function warts(parent, r, y, n, col, seed){
  for(let i=0;i<n;i++){
    const a = i*2.39996 + (seed || 0), e = 0.35 + (i % 4)*0.17, s = 0.05 + (i % 3)*0.02;
    P(parent, K.lump(r*s*1.5, 1, 0.45, i + (seed || 0)), col, Math.cos(a)*Math.cos(e)*r*0.95, y + Math.sin(e)*r*0.6, Math.sin(a)*Math.cos(e)*r*0.95, 0, 0, 0, 1, 0.5, 1);
  }
}
/* pale threads of mycelium, from a point out over the floor */
function mycelium(parent, n, x, y, z, reach, col, seed){
  for(let i=0;i<n;i++){
    const a = i/n*PI*2 + (seed || 0)*1.3 + Math.sin(i*5.1)*0.3, l = reach*(0.6 + 0.4*Math.abs(Math.sin(i*3.7 + (seed || 0))));
    P(parent, K.tube([[x, y, z], [x + Math.cos(a)*l*0.35, Math.min(y, 0.02), z + Math.sin(a)*l*0.35], [x + Math.cos(a + 0.3)*l*0.75, 0.012, z + Math.sin(a + 0.3)*l*0.75], [x + Math.cos(a + 0.1)*l, 0.006, z + Math.sin(a + 0.1)*l]], 0.0055, 5, 6), col || 0xc8c0b0);
  }
}
/* a cluster of little mushrooms sprouting off something */
function sprouts(parent, n, x, y, z, sc, col, cc, seed){
  for(let i=0;i<n;i++){
    const a = i*2.39996 + (seed || 0), d = 0.02 + (i % 3)*0.025, h = (0.05 + (i % 4)*0.03)*sc, px = x + Math.cos(a)*d*sc, pz = z + Math.sin(a)*d*sc, t = Math.cos(a)*0.3, u = Math.sin(a)*0.3;
    P(parent, CY(0.006*sc, 0.009*sc, h, 6), col, px, y + h/2, pz, u, 0, -t);
    P(parent, new THREE.SphereGeometry((0.018 + (i % 3)*0.008)*sc, 10, 6, 0, PI*2, 0, PI*0.55), cc, px + Math.sin(-t)*h*0.5, y + h, pz + Math.sin(u)*h*0.5, u, 0, -t, 1, 0.7, 1);
  }
}
/* threads of mycelium hanging from a rim */
function strands(parent, n, r, y, len, col, seed){
  for(let i=0;i<n;i++){
    const a = i*2.39996 + (seed || 0), l = len*(0.5 + 0.5*Math.abs(Math.sin(i*4.1 + (seed || 0)))), x = Math.cos(a)*r, z = Math.sin(a)*r;
    P(parent, K.tube([[x, y, z], [x*0.97, y - l*0.5, z*0.97], [x*0.93 + 0.01, y - l, z*0.93]], 0.005, 4, 5), col || 0xb8b0a0);
  }
}
/* a bracket fungus: a shelf of hard growth stuck out of something, toward ry (0 = +z) */
function bracket(parent, r, x, y, z, ry, col){
  P(parent, sculptW(new THREE.SphereGeometry(r, 18, 8, 0, PI, 0, PI/2), r*0.08, 1.5/r, x*10 + y), col, x, y, z, 0, ry, 0, 1, 0.3, 1);
  P(parent, new THREE.TorusGeometry(r*0.97, r*0.07, 6, 18, PI).rotateX(PI/2), 0x2a2420, x, y - r*0.02, z, 0, ry, 0);
}
Models.puffling = function(){
  const R = rig("puffling"), b = R.body;
  // a swollen puffball, split with dark fissures, bruised
  const g = sculptW(new THREE.SphereGeometry(0.3, 30, 22), 0.022, 9, 4);
  K.paint(g, 0xffffff, (c, x, y, z)=>{
    const n = Math.sin(x*15 + Math.sin(z*9)*1.6)*Math.sin(y*12 + Math.sin(x*7)*1.3);
    if(Math.abs(n) < 0.07 && y > -0.12) c.setHex(0x2a1a1c);
    else if(Math.sin(x*6 + 1)*Math.sin(y*5)*Math.sin(z*7 + 2) > 0.2) c.setHex(0x8a7080);
  });
  P(b, g, 0xb0a48c, 0, 0.32, 0, 0, 0, 0, 1, 0.92, 1);
  // spore sacs swelling out of its sides, the pores weeping light
  [[0.22, 0.24, 0.12, 0.09], [-0.24, 0.3, 0.06, 0.08], [0.12, 0.2, -0.24, 0.085], [-0.15, 0.48, -0.15, 0.07], [0.18, 0.5, -0.04, 0.06]].forEach(([x, y, z, r], i)=>{
    P(b, blotch(lumpS(r, 12, 9, r*0.15, 18, i), 0x8a7a50, 30, 0.3, i), 0xb8ac80, x, y, z);
    glow(R, b, 0.012, 0xc8ff8a, x*1.28, y + r*0.4, z*1.28);
  });
  // the split on top, torn open, spores breathing out of it
  for(let i=0;i<7;i++){ const a = i/7*PI*2; P(b, CO(0.045, 0.1, 5), 0x9a8c74, Math.cos(a)*0.07, 0.6, Math.sin(a)*0.07, Math.sin(a)*0.9, 0, -Math.cos(a)*0.9, 1, 1, 0.35); }
  P(b, S(0.06, 10, 8), 0x0a0606, 0, 0.59, 0, 0, 0, 0, 1, 0.5, 1);
  glow(R, b, 0.035, 0xc8ff8a, 0, 0.62, 0);
  halo(R, b, 0x9cff3a, 0.7, 0, 0.72, 0, 0.35);
  // three eyes sunk in the flesh where a face isn't, and a mouth like a wound
  [[0.09, 0.42, 0.25, 0.03], [-0.03, 0.47, 0.25, 0.016], [-0.1, 0.36, 0.25, 0.018], [0.15, 0.52, 0.18, 0.014], [-0.15, 0.48, 0.18, 0.012]].forEach(([x, y, z, r])=>{ P(b, S(r*1.3, 8, 6), 0x0a0606, x, y, z, 0, 0, 0, 1, 0.8, 0.5); glow(R, b, r*0.38, 0xd8ff6a, x, y - r*0.1, z + r*0.42); halo(R, b, 0xd8ff6a, r*5, x, y, z + r*0.6, 0.4); });
  mouth(b, 0.01, 0.26, 0.27, 0.08, 0.35);
  teeth(b, 0.285, 0.285, 0.11, 8);
  // roots for feet: mycelium spreading over the floor
  mycelium(b, 7, 0, 0.06, 0, 0.5, 0xa89c88, 1);
  [-1, 1].forEach(s=> P(b, lumpS(0.07, 10, 7, 0.01, 20, s), 0x8a7c66, s*0.13, 0.05, 0.03, 0, 0, 0, 1, 0.55, 1.3));
  R.h = 0.7; return finish(R);
};
Models.toadstool = function(){
  const R = rig("toadstool"), b = R.body;
  // a stem of dead-white flesh, bruised, and pushing out of it a ribcage and a face
  P(b, blotch(sculptW(K.slathe([[0.25, 0], [0.21, 0.12], [0.17, 0.3], [0.16, 0.48], [0.19, 0.62], [0, 0.66]], 16, 4), 0.018, 9, 2), 0x7a6070, 8, 0.3, 3), 0xa0927e);
  [[0.24, 0.158], [0.3, 0.155], [0.36, 0.153]].forEach(([y, r])=> P(b, TOs(r, 0.009, PI*0.55), BONEC, 0, y, 0.0, PI/2 + 0.2, 0, PI/2 - PI*0.275, 1, 1, 1));
  P(b, BX(0.022, 0.15, 0.015), BONEC, 0, 0.3, 0.16, -0.08);
  brows(b, 0.055, 0.53, 0.15, 0xa0927e, "sad", 0.065);
  eyes(b, 0.055, 0.5, 0.15, 0.03, 0xc8ff5a, 0, R);
  mouth(b, 0, 0.4, 0.16, 0.055, 0.95);
  teeth(b, 0.44, 0.17, 0.07, 6);
  // withered arms grown into the stem, hanging
  [-1, 1].forEach(s=>{
    limb(b, [[s*0.15, 0.44, 0.02], [s*0.24, 0.32, 0.05], [s*0.26, 0.2, 0.1]], 0.024, 0x968874);
    [-1, 0, 1].forEach(f=> P(b, CO(0.008, 0.07, 5), 0x2a2018, s*0.26 + f*0.014, 0.15, 0.11, PI*0.92, 0, f*0.2));
    bracket(b, 0.07, s*0.17, 0.2 + (s > 0 ? 0.12 : 0), -0.06, s*(PI/2 + 0.4), 0x6a5444);
  });
  // the cap: a dried-blood dome, scabbed with pale warts, the rim drooping and torn, slime hanging off it
  const cap = group(b, 0, 0.6, 0); R.parts.head = cap;
  P(cap, capGeo(0.5, 0.36, 0.13, 5, 0x6a4a50), 0x5a2420);
  underCap(cap, 0.5, -0.06, 0x8a7a6a, 26);
  warts(cap, 0.5, 0.05, 14, 0x7a6a56, 2);
  sprouts(cap, 8, 0.1, 0.27, -0.12, 1.3, 0xa89a88, 0x5a3a34, 1);
  sprouts(cap, 4, -0.24, 0.17, 0.14, 1.0, 0xa89a88, 0x6a4a3a, 3);
  for(let i=0;i<9;i++){ const a = i*0.7 + 0.3, l = 0.06 + (i % 3)*0.05; P(cap, CO(0.012, l, 5), 0x7a7a5a, Math.cos(a)*0.46, -0.13 - l/2, Math.sin(a)*0.46, PI); }
  [0.5, 2.2, 3.9, 5.3].forEach((a, i)=> glow(R, cap, 0.014, 0xc8ff8a, Math.cos(a)*0.32, -0.1 - (i % 2)*0.03, Math.sin(a)*0.32));
  strands(cap, 10, 0.45, -0.1, 0.18, 0xb0a490, 3);
  // mycelium over the floor all round it
  mycelium(b, 9, 0, 0.05, 0, 0.75, 0xa89c88, 2);
  R.h = 1.1; return finish(R);
};
function shroomPerson(R, size, capCol, spotCol){
  const b = R.body, FLESH = 0x8a7c6c, PALE = 0x9a8e7c, seed = Math.round(size*10);
  // thin legs, a corpse's, mycelium trailing from the feet
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.08, 0.3, 0);
    limb(l, [[0, 0, 0], [s*0.01, -0.08, 0.04], [0, -0.15, 0.04]], 0.034, FLESH, PALE);
    limb(l, [[0, -0.15, 0.04], [0, -0.23, 0.0], [0, -0.28, -0.01]], 0.027, PALE);
    P(l, S(0.042, 8, 6), 0x5a4a3c, 0, -0.29, 0.03, 0, 0, 0, 0.9, 0.4, 1.6);
    legs.push(l);
  });
  R.parts.legs = legs;
  mycelium(b, 6, 0, 0.03, 0, 0.35, 0xa89c88, seed);
  // a stooped, rotting body: ribs, bruises, a rag at the hips, shelf fungus out of the back
  const tor = group(b, 0, 0.3, 0); tor.rotation.x = 0.35;
  P(tor, blotch(sculptW(K.slathe([[0, 0], [0.11, 0.01], [0.12, 0.08], [0.1, 0.16], [0.125, 0.26], [0.14, 0.32], [0.09, 0.38], [0, 0.4]], 14, 4), 0.01, 11, seed), 0x6a5068, 10, 0.3, seed), FLESH, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
  [[0.2, 0.11], [0.25, 0.122], [0.3, 0.132]].forEach(([y, r])=> P(tor, TOs(r, 0.0055, PI*0.6), 0xa89c88, 0, y, 0.005, PI/2 + 0.3, 0, PI/2 - PI*0.3, 1, 0.8, 1));
  bracket(tor, 0.08, 0.06, 0.26, -0.09, PI + 0.3, new THREE.Color(capCol).multiplyScalar(1.3).getHex());
  bracket(tor, 0.06, -0.05, 0.18, -0.09, PI - 0.3, new THREE.Color(capCol).multiplyScalar(1.15).getHex());
  bracket(tor, 0.05, 0.02, 0.33, -0.1, PI, new THREE.Color(capCol).multiplyScalar(1.4).getHex());
  P(b, K.tatter(K.lathe([[0.13, -0.12], [0.125, -0.04], [0.115, 0.03]], 14), -0.05, 8, 0.1, seed), 0x3a3228, 0, 0.32, 0.0, 0, 0, 0, 1, 1, 0.85);
  // the cap bursts out where the head was: tilted, gills underneath, threads hanging,
  // and under it the jaw still hangs open, one eye left
  const cap = group(b, 0, 0.66, 0.15); cap.rotation.set(-0.1, 0, 0.3); R.parts.head = cap;
  P(cap, sculptW(new THREE.CylinderGeometry(0.06, 0.075, 0.1, 14, 3), 0.006, 20, seed), FLESH, 0, -0.03, 0.0);
  P(cap, capGeo(0.24, 0.36, 0.13, seed, 0x5a4058), capCol, 0, 0.03, -0.03);
  underCap(cap, 0.24, -0.03, 0x8a7a6a, 18);
  warts(cap, 0.22, 0.1, 8, spotCol, seed);
  strands(cap, 9, 0.22, -0.06, 0.2, 0xb0a490, seed);
  sprouts(cap, 5, -0.07, 0.24, -0.08, 0.9, 0x9a8e7c, new THREE.Color(capCol).multiplyScalar(1.3).getHex(), seed);
  P(cap, S(0.05, 10, 8), PALE, 0, -0.1, 0.06, 0.3, 0, 0, 1.1, 0.6, 1.1);
  mouth(cap, 0, -0.1, 0.1, 0.04, 0.9);
  teeth(cap, -0.075, 0.105, 0.06, 6);
  P(cap, S(0.022, 8, 6), 0x050304, 0.04, -0.04, 0.09);
  glow(R, cap, 0.008, 0xd8ff6a, 0.04, -0.045, 0.105);
  // arms: one a corpse's, one overgrown; a rusted sickle
  const arm = s=>{
    const a = group(b, s*0.14, 0.6, 0.12);
    P(a, S(0.04, 8, 6), FLESH, 0, 0, 0);
    limb(a, [[0, 0, 0], [s*0.02, -0.1, -0.01], [s*0.02, -0.19, 0.0]], 0.026, FLESH, PALE);
    limb(a, [[s*0.02, -0.19, 0.0], [s*0.01, -0.28, 0.03], [0, -0.34, 0.05]], 0.021, PALE);
    [-1, 0, 1].forEach(f=> P(a, CO(0.007, 0.07, 5), 0x2a2018, f*0.016, -0.39, 0.06, PI*0.9, 0, f*0.2));
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  bracket(R.parts.armL, 0.05, -0.03, -0.12, 0.0, -PI/2, new THREE.Color(capCol).multiplyScalar(1.3).getHex());
  bracket(R.parts.armL, 0.035, -0.025, -0.2, 0.02, -PI/2 + 0.3, new THREE.Color(capCol).multiplyScalar(1.5).getHex());
  limb(R.parts.armR, [[0, -0.34, -0.08], [0, -0.35, 0.08], [0, -0.36, 0.22]], 0.012, 0x3a2c1e);
  P(R.parts.armR, blotch(sculptW(new THREE.TorusGeometry(0.11, 0.012, 6, 20, PI*0.9), 0.003, 30, 2), 0x8a5a3a, 30, 0.1, 2), 0x5a5048, 0, -0.27, 0.24, 0, PI/2, PI*0.6, 1, 1, 0.35);
  b.scale.setScalar(size); R.h = 1.1*size; R.size = size;
}
Models.shroomkin = function(){ const R = rig("shroomkin"); shroomPerson(R, 1.15, 0x5e4462, 0x9a8a90); return finish(R); };
Models.shroomlet = function(){ const R = rig("shroomlet"); shroomPerson(R, 0.6, 0x6e4258, 0xa89aa0); return finish(R); };

/* ================================================================== *
 *  The haunted: shrouds with nothing in them but a skull and a cold
 *  light, a wailing thing all hair and jaw, an archer who forgot to
 *  stay dead, and a knot of hate with the furniture flying round it.
 * ================================================================== */
/* a sheet ghost: a turned shape with a wavy hem (the costumes use it too) */
function sheet(R, col, h, w){
  const prof = [[0, h], [w*0.5, h - 0.04], [w*0.72, h - 0.2], [w*0.78, h*0.55], [w*0.82, h*0.25], [w*0.9, 0.08], [w*0.75, 0.02], [0, 0.06]];
  const g = K.lathe(prof, 18);
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const x = a.getX(i), z = a.getZ(i), y = a.getY(i); if(y < 0.15){ const ang = Math.atan2(z, x); a.setY(i, y + Math.sin(ang*6)*0.05); } }
  g.computeVertexNormals();
  return g;
}
/* a tall turned shroud, ragged at the hem, sculpted into folds */
function shroud(h, w, seed, tat){
  const g = K.slathe([[w*0.95, 0], [w*0.85, h*0.2], [w*0.7, h*0.5], [w*0.62, h*0.75], [w*0.5, h*0.92], [0, h]], 18, 4);
  // hanging folds, deeper toward the hem
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i), an = Math.atan2(z, x), k = 1 + (0.07*Math.sin(an*7 + seed) + 0.04*Math.sin(an*13 + seed*2))*(1 - y/h); a.setX(i, x*k); a.setZ(i, z*k); }
  K.tatter(g, h*0.3, 11, tat || 0.25, seed);
  return sculptW(g, w*0.04, 7/w*0.4, seed);
}
/* a skeletal hand reaching: a palm and long finger bones, the tips hooked */
function boneHand(parent, x, y, z, s, len, col){
  P(parent, S(0.03, 8, 6), col, x, y, z, 0, 0, 0, 1, 0.5, 1.2);
  for(let f=0;f<4;f++){
    const a = (f - 1.5)*0.28, l = len*(f === 0 || f === 3 ? 0.8 : 1);
    limb(parent, [[x + Math.sin(a)*0.02, y, z + 0.02], [x + Math.sin(a)*0.05, y - 0.01, z + l*0.55], [x + Math.sin(a)*0.06, y - 0.05, z + l]], 0.007, col);
  }
  limb(parent, [[x + s*0.025, y, z], [x + s*0.06, y - 0.01, z + 0.04], [x + s*0.07, y - 0.04, z + 0.07]], 0.007, col);
}
Models.ghost = function(){
  const R = rig("ghost"), b = R.body, CL = 0x434c56, BN = 0x9aa0a0;
  const float = group(b, 0, 0.25, 0); R.parts.head = float;
  P(float, shroud(0.95, 0.42, 2, 0.32), CL);
  P(float, shroud(0.6, 0.46, 5, 0.3), 0x3a424c, 0, -0.06, 0);
  // the cowl, and in it a skull with two cold lights for eyes
  const hd = group(float, 0, 0.9, 0.05); hd.rotation.x = -0.2;
  P(hd, K.tatter(hoodGeo(0.2, 1.5, 0.78, 3), -0.1, 10, 0.1, 3), 0x3a424c, 0, 0, -0.02, 0, 0, 0, 1, 1.05, 1.15);
  P(hd, S(0.16, 12, 10), 0x07080a, 0, -0.01, -0.05);
  skull(hd, 0.105, 0, -0.03, 0.1, 0x8a8e8c, R, 0x8ad8ff);
  // long sleeves reaching out, torn, skeletal hands
  [-1, 1].forEach(s=>{
    P(float, K.tatter(K.lathe([[0.085, -0.3], [0.06, -0.15], [0.05, 0]], 10), -0.25, 6, 0.08, s + 4), CL, s*0.25, 0.72, 0.1, -1.25, 0, s*0.12);
    boneHand(float, s*0.26, 0.6, 0.4, s, 0.15, BN);
  });
  // a shackle and its iron ball, dragged along
  links(b, [0.12, 0.25, 0.05], [0.42, 0.06, 0.15], 7, 0.03, 0x3a3230);
  P(b, blotch(lumpS(0.1, 14, 10, 0.006, 20, 2), 0x8a5a3a, 20, 0.2, 2), 0x2e2a2a, 0.47, 0.1, 0.17);
  P(float, TOs(0.06, 0.016), 0x3a3230, 0.12, 0.04, 0.05, PI/2);
  halo(R, float, 0x8ad8ff, 1.5, 0, 0.5, 0, 0.22);
  R.h = 1.4; R.ghostly = true; return finish(R);
};
Models.banshee = function(){
  const R = rig("banshee"), b = R.body, CL = 0x464c58, PALE = 0x9a9ca4;
  const float = group(b, 0, 0.3, 0); R.parts.head = float;
  P(float, shroud(1.1, 0.38, 5, 0.38), CL);
  P(float, shroud(0.75, 0.45, 9, 0.32), 0x2a2e3a, 0, -0.12, 0);
  // a starved body: ribs through grey skin, collarbones like handles
  P(float, blotch(sculptW(K.slathe([[0.15, 0.7], [0.12, 0.85], [0.15, 1.02], [0.13, 1.12], [0.05, 1.18], [0, 1.19]], 14, 4), 0.006, 14, 3), 0x6a6878, 12, 0.3, 2), PALE, 0, 0, 0.02, 0, 0, 0, 1, 1, 0.8);
  [0.9, 0.95, 1.0].forEach((y, i)=> P(float, TOs(0.13 + i*0.006, 0.006, PI*0.6), 0xb0b0b4, 0, y, 0.02, PI/2 + 0.3, 0, PI/2 - PI*0.3, 1, 0.8, 1));
  [-1, 1].forEach(s=> limb(float, [[0, 1.13, 0.1], [s*0.08, 1.14, 0.09], [s*0.16, 1.12, 0.03]], 0.008, 0xb0b0b4));
  // the head, thrown back, the jaw hanging open far past where a jaw should go
  const hd = group(float, 0, 1.3, 0.05); hd.rotation.x = -0.35;
  P(hd, blotch(lumpS(0.105, 14, 11, 0.006, 16, 7), 0x6a6878, 14, 0.3, 4), PALE, 0, 0.02, -0.01, 0, 0, 0, 0.85, 1.05, 1.0);
  [-1, 1].forEach(s=> P(hd, S(0.03, 8, 6), 0x3a3a44, s*0.06, -0.04, 0.06, 0, 0, 0, 0.8, 1.2, 0.6));
  eyes(hd, 0.04, 0.03, 0.085, 0.026, 0x8ad8ff, 0, R);
  P(hd, S(0.045, 10, 8), 0x050304, 0, -0.1, 0.07, 0.2, 0, 0, 1, 2.2, 0.6);
  teeth(hd, -0.02, 0.095, 0.06, 6, 0xb0aa98);
  P(hd, S(0.05, 10, 8), PALE, 0, -0.22, 0.05, 0.4, 0, 0, 0.9, 0.5, 1.0);
  // long lank hair, black, from the crown down her back and over her shoulders; a few strands across the face
  for(let i=0;i<16;i++){
    const a = PI*0.25 + i/15*PI*1.5, cx = Math.sin(a), cz = Math.cos(a), l = 0.9 + (i % 3)*0.15;
    P(float, K.tube([[cx*0.04, 1.4, cz*0.04 + 0.03], [cx*0.11, 1.3, cz*0.11], [cx*0.17 + Math.sin(i)*0.02, 1.1, cz*0.17 - 0.05], [cx*0.2, 1.4 - l*0.75, cz*0.2 - 0.1], [cx*0.18, 1.4 - l, cz*0.18 - 0.12]], 0.014 + (i % 2)*0.006, 8, 6), 0x101014);
  }
  [-0.03, 0.04].forEach((x, i)=> P(float, K.tube([[x, 1.4, 0.08], [x*1.4, 1.3, 0.15], [x*2 + 0.01, 1.1, 0.17], [x*2.5, 0.95, 0.15]], 0.009, 8, 6), 0x101014));
  // arms flung wide, long fingers clawing
  [-1, 1].forEach(s=>{
    limb(float, [[s*0.16, 1.1, 0.03], [s*0.27, 1.06, 0.1], [s*0.33, 1.02, 0.18]], 0.024, PALE, PALE);
    limb(float, [[s*0.33, 1.02, 0.18], [s*0.33, 1.05, 0.3], [s*0.3, 1.08, 0.42]], 0.018, PALE);
    P(float, K.tatter(K.lathe([[0.075, -0.2], [0.05, -0.08], [0.035, 0]], 10), -0.12, 6, 0.14, s + 7), CL, s*0.27, 1.06, 0.12, 0, 0, s*0.9);
    for(let f=0;f<4;f++){ const a = (f - 1.5)*0.3; limb(float, [[s*0.3, 1.08, 0.42], [s*0.3 + Math.sin(a)*0.05, 1.1 + Math.cos(a)*0.02, 0.5], [s*0.3 + Math.sin(a)*0.08, 1.06, 0.58]], 0.006, 0xc8c8cc); }
  });
  halo(R, float, 0x8ab8ff, 1.8, 0, 1.0, 0, 0.25);
  R.h = 1.7; R.ghostly = true; return finish(R);
};
Models.skeleton = function(){
  const R = rig("skeleton"), b = R.body, BONE = 0xb8ac90, BD = 0x8a7e66;
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.075, 0.5, 0);
    P(l, S(0.03, 8, 6), BONE, 0, 0, 0);
    limb(l, [[0, 0, 0], [s*0.005, -0.11, 0.015], [0, -0.22, 0.02]], 0.017, BONE, BONE);
    P(l, S(0.018, 8, 6), BONE, 0, -0.22, 0.045, 0, 0, 0, 1, 1.1, 0.6);
    limb(l, [[0, -0.23, 0.02], [0, -0.33, 0.005], [0, -0.43, -0.01]], 0.014, BONE, BONE);
    limb(l, [[s*0.016, -0.24, 0.01], [s*0.016, -0.42, -0.015]], 0.007, BD);
    P(l, BX(0.05, 0.025, 0.07), BONE, 0, -0.455, 0.02);
    for(let t=0;t<4;t++) P(l, CY(0.006, 0.005, 0.05, 5), BONE, (t - 1.5)*0.013, -0.462, 0.075, PI/2 - 0.1);
    legs.push(l);
  });
  R.parts.legs = legs;
  // the pelvis, the spine in its curve, a ribcage of real ribs
  [-1, 1].forEach(s=> P(b, lumpS(0.055, 10, 8, 0.004, 30, s), BONE, s*0.055, 0.53, -0.01, 0, 0, s*0.5, 0.7, 1, 0.5));
  P(b, CO(0.035, 0.08, 6), BONE, 0, 0.5, -0.03, PI);
  for(let i=0;i<11;i++){
    const y = 0.56 + i*0.043, z = -0.045 - Math.sin(i/10*PI)*0.03;
    P(b, CY(0.02, 0.02, 0.026, 8), BONE, 0, y, z);
    P(b, BX(0.012, 0.018, 0.035), BD, 0, y, z - 0.03, 0.4);
  }
  for(let i=0;i<5;i++){
    const y = 0.92 - i*0.055, w = 0.1 + Math.sin((i + 1)/6*PI)*0.035, z0 = -0.07 + i*0.002;
    [-1, 1].forEach(s=> limb(b, [[s*0.015, y, z0], [s*w*0.9, y - 0.01, z0 + 0.02], [s*w, y - 0.03, 0.04], [s*w*0.6, y - 0.05, 0.09]], 0.008, BONE));
  }
  P(b, BX(0.03, 0.16, 0.015), BONE, 0, 0.83, 0.095, -0.1);
  [-1, 1].forEach(s=>{ limb(b, [[0, 0.93, 0.09], [s*0.08, 0.95, 0.06], [s*0.16, 0.95, 0.0]], 0.009, BONE); P(b, lumpS(0.05, 10, 8, 0.004, 30, s + 2), BONE, s*0.11, 0.9, -0.07, 0, 0, s*0.3, 0.8, 1, 0.35); });
  for(let i=0;i<3;i++) P(b, CY(0.016, 0.016, 0.025, 8), BONE, 0, 0.99 + i*0.03, -0.02 + i*0.01);
  // a tattered cloak hanging off the shoulders behind, a belt with a rusted buckle, a rag at the hips
  const cl = new THREE.LatheGeometry([[0.2, 0], [0.18, 0.25], [0.15, 0.42], [0.1, 0.48]].map(p=> new THREE.Vector2(p[0], p[1])), 20, 1.1, PI*2 - 2.2);
  P(b, sculptW(K.tatter(cl, 0.2, 9, 0.22, 4), 0.01, 10, 4), 0x2a2620, 0, 0.5, -0.02, 0, 0, 0, 1, 1, 0.8);
  P(b, TOs(0.085, 0.012), LEATH, 0, 0.56, -0.01, PI/2 + 0.1, 0, 0, 1, 0.8, 1);
  P(b, BX(0.035, 0.03, 0.012), RUSTC, 0, 0.56, 0.065);
  P(b, K.tatter(K.lathe([[0.1, -0.1], [0.095, 0.0], [0.09, 0.03]], 12, PI*0.8), -0.04, 5, 0.08, 3), 0x3a3228, 0, 0.55, 0.0, 0, PI*0.6, 0, 1, 1, 0.8);
  // the skull, sockets with red embers in, under a rusted kettle helm
  const head = group(b, 0, 1.1, 0.02); R.parts.head = head;
  P(head, blotch(lumpS(0.09, 14, 11, 0.004, 22, 5), 0x8a7a60, 20, 0.4, 5), BONE, 0, 0.01, -0.015, 0, 0, 0, 0.88, 0.95, 1.1);
  P(head, S(0.06, 10, 8), BONE, 0, -0.04, 0.035, 0, 0, 0, 1.05, 0.85, 1.0);
  [-1, 1].forEach(s=> P(head, S(0.022, 8, 6), BONE, s*0.052, -0.035, 0.06, 0, 0, 0, 1, 0.7, 0.9));
  eyes(head, 0.032, -0.005, 0.075, 0.022, 0xff2a1a, 0, R);
  P(head, CO(0.012, 0.025, 3), 0x0a0808, 0, -0.04, 0.09, PI, 0, 0, 1, 1, 0.5);
  teeth(head, -0.07, 0.085, 0.06, 7, 0xb0a488);
  P(head, S(0.045, 10, 6), BONE, 0, -0.1, 0.035, 0.25, 0, 0, 1.0, 0.45, 1.0);
  teeth(head, -0.088, 0.075, 0.05, 6, 0xb0a488);
  const helm = group(head, 0, 0.03, -0.01); helm.rotation.x = -0.15;
  P(helm, blotch(sculptW(new THREE.SphereGeometry(0.1, 20, 10, 0, PI*2, 0, PI*0.5), 0.004, 20, 2), 0x8a5a3a, 22, 0.1, 3), 0x3e3430, 0, 0.0, 0, 0, 0, 0, 1, 0.9, 1.05);
  P(helm, blotch(K.lathe([[0.1, 0.0], [0.15, -0.035], [0.155, -0.045]], 16), 0x8a5a3a, 20, 0.0, 4), 0x3e3430);
  P(helm, TOs(0.1, 0.008), RUSTC, 0, 0.0, 0, PI/2);
  P(helm, BX(0.008, 0.1, 0.2), RUSTC, 0, 0.045, 0, 0.25);
  // arms of bone; the bow hand and the draw hand
  const arm = s=>{
    const a = group(b, s*0.17, 0.95, 0.0);
    P(a, S(0.026, 8, 6), BONE, 0, 0, 0);
    limb(a, [[0, 0, 0], [s*0.01, -0.1, -0.005], [s*0.01, -0.2, 0.0]], 0.014, BONE, BONE);
    limb(a, [[s*0.01, -0.2, 0.0], [s*0.005, -0.3, 0.025], [0, -0.38, 0.04]], 0.011, BONE);
    limb(a, [[s*0.025, -0.2, 0.0], [s*0.02, -0.38, 0.03]], 0.007, BD);
    P(a, BX(0.035, 0.03, 0.025), BONE, s*0.008, -0.4, 0.045);
    for(let f=0;f<4;f++) limb(a, [[s*0.008 + (f - 1.5)*0.009, -0.41, 0.05], [s*0.008 + (f - 1.5)*0.01, -0.45, 0.06], [s*0.008 + (f - 1.5)*0.01, -0.47, 0.05]], 0.004, BONE);
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  P(R.parts.armR, blotch(sculptW(new THREE.SphereGeometry(0.05, 14, 8, 0, PI*2, 0, PI*0.5), 0.003, 30, 6), 0x8a5a3a, 22, 0.1, 6), 0x3e3430, 0, 0.015, 0, 0, 0, -0.35, 1.1, 0.8, 1.05);
  R.hand = group(R.parts.armL, 0, -0.42, 0.05);
  limb(R.hand, [[0, -0.42, -0.04], [0, -0.3, 0.04], [0, -0.12, 0.08], [0, 0, 0.08], [0, 0.12, 0.08], [0, 0.3, 0.04], [0, 0.42, -0.04], [0, 0.46, -0.02]], 0.011, 0x2e2218);
  wraps(R.hand, 0.014, [-0.03, 0.03], LEATH, 0, 0.08);
  limb(R.hand, [[0, -0.43, -0.035], [0, 0, -0.035], [0, 0.43, -0.035]], 0.0025, 0x8a8478);
  // a quiver on the back, black-fletched arrows in it
  const q = group(b, 0.07, 0.86, -0.13); q.rotation.set(0.25, 0, -0.35);
  P(q, blotch(K.lathe([[0, -0.16], [0.045, -0.16], [0.05, 0.1], [0.055, 0.14], [0, 0.13]], 12), 0x6a5a48, 30, 0.2, 2), LEATH);
  for(let i=0;i<4;i++){ const x = (i - 1.5)*0.018, z = (i % 2)*0.015 - 0.007; P(q, CY(0.004, 0.004, 0.14, 4), 0x5a4a38, x, 0.2, z); P(q, BX(0.002, 0.06, 0.025), 0x14141a, x, 0.25, z, 0, i, 0); }
  R.h = 1.25; return finish(R);
};
Models.poltergeist = function(){
  const R = rig("poltergeist"), b = R.body;
  const float = group(b, 0, 0.35, 0); R.parts.head = float;
  // a knot of darkness, lumped and cracked, light showing through the cracks; the shroud trailing off it in strips
  const g = sculptW(K.slathe([[0, 0.0], [0.22, 0.12], [0.34, 0.45], [0.32, 0.7], [0.2, 0.92], [0, 0.98]], 16, 4), 0.04, 6, 8);
  P(float, blotch(g, 0x5a4a6a, 9, 0.3, 3), 0x1e1824);
  const crackM = new THREE.MeshBasicMaterial({ color:0x9cff3a, transparent:true });
  [[0.3, 0.25, 0.8], [1.9, 0.35, 0.6], [3.4, 0.2, 0.7], [4.6, 0.4, 0.5], [5.5, 0.3, 0.75]].forEach(([a0, y0, y1], i)=>{
    const pts = []; for(let j=0;j<5;j++){ const t = j/4, y = y0 + (y1 - y0)*t, a = a0 + Math.sin(t*5 + i)*0.25, rr = 0.335*Math.sin(Math.min(1, y/0.98)*PI*0.95 + 0.25) + 0.012; pts.push(new THREE.Vector3(Math.sin(a)*rr, y, Math.cos(a)*rr)); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.008, 4, false), crackM); float.add(m); R.glows.push(m);
  });
  P(float, K.tatter(sculptW(new THREE.SphereGeometry(0.36, 28, 16, 0, PI*2, 0, PI*0.42), 0.02, 8, 5), 0.2, 12, 0.22, 5), 0x34303a, 0, 0.62, -0.03, -0.25, 0, 0, 1, 0.9, 1);
  for(let i=0;i<7;i++){ const a = i/7*PI*2 + 0.3, l = 0.25 + (i % 3)*0.12; P(float, K.tube([[Math.cos(a)*0.18, 0.1, Math.sin(a)*0.18], [Math.cos(a)*0.24, -l*0.4, Math.sin(a)*0.24 - 0.05], [Math.cos(a + 0.3)*0.22, -l, Math.sin(a + 0.3)*0.22 - 0.12]], 0.025 - (i % 2)*0.008, 8, 6), 0x2a2430); }
  // eyes: too many, scattered, uneven; a mouth split wide with teeth on both lips
  [[0.11, 0.72, 0.27, 0.035], [-0.09, 0.75, 0.27, 0.03], [0.2, 0.6, 0.24, 0.018], [-0.02, 0.82, 0.25, 0.015], [-0.19, 0.64, 0.24, 0.016]].forEach(([x, y, z, r])=>{ P(float, S(r*1.3, 8, 6), 0x050304, x, y, z, 0, 0, 0, 1, 0.8, 0.5); glow(R, float, r*0.45, 0xb8ff6a, x, y, z + r*0.45); halo(R, float, 0xb8ff6a, r*5, x, y, z + r*0.7, 0.4); });
  mouth(float, 0, 0.47, 0.29, 0.13, 0.5);
  teeth(float, 0.5, 0.3, 0.22, 9, 0xb8b090);
  for(let i=0;i<7;i++){ const x = -0.09 + i*0.03; P(float, CO(0.007, 0.035 + (i % 3)*0.012, 5), 0xb8b090, x, 0.42, 0.3, -0.15); }
  // chains wound round it, a padlock hanging
  [[0.5, 0.3, 0.2], [0.3, -0.25, -0.4]].forEach(([y, tx, tz], j)=>{ const cg = group(float, 0, y, 0); cg.rotation.set(tx, 0, tz); for(let i=0;i<20;i++){ const a = i/20*PI*2; P(cg, TOs(0.03, 0.009), 0x3a3634, Math.cos(a)*0.34, 0, Math.sin(a)*0.34, 0, -a + (i % 2)*PI/2, PI/2); } });
  links(float, [0.25, 0.3, 0.18], [0.27, 0.12, 0.2], 5, 0.025, 0x3a3634);
  P(float, BX(0.06, 0.06, 0.025), 0x5a4a30, 0.27, 0.07, 0.2); P(float, TOs(0.022, 0.007, PI), 0x5a4a30, 0.27, 0.1, 0.2);
  // what it throws, circling: a broken chair, a candlestick still lit, a skull, a meat hook, a torn book, a plank full of nails
  const orbit = group(b, 0, 0.8, 0); R.parts.orbit = orbit;
  const WD = 0x3a2c22;
  const junk = [
    g=>{ P(g, BX(0.16, 0.025, 0.15), WD); [[-1, -1], [1, -1], [-1, 1]].forEach(([x, z])=> P(g, BX(0.02, 0.15, 0.02), WD, x*0.065, -0.08, z*0.06)); P(g, BX(0.16, 0.02, 0.02), WD, 0, 0.1, -0.065); [-1, 1].forEach(x=> P(g, BX(0.02, 0.18, 0.02), WD, x*0.065, 0.05, -0.065)); },
    g=>{ P(g, CY(0.035, 0.045, 0.02, 10), BRASSC, 0, -0.08, 0); P(g, CY(0.008, 0.01, 0.1, 6), BRASSC, 0, -0.03, 0); P(g, CY(0.02, 0.02, 0.012, 10), BRASSC, 0, 0.02, 0); P(g, CY(0.014, 0.016, 0.09, 8), 0xc8bc98, 0, 0.07, 0); P(g, S(0.012, 6, 4), 0xc8bc98, 0.014, 0.05, 0.0, 0, 0, 0, 0.7, 1.6, 0.7); glow(R, g, 0.014, 0xffb050, 0, 0.13, 0); halo(R, g, 0xff9a3a, 0.35, 0, 0.13, 0, 0.6); },
    g=>{ skull(g, 0.06, 0, 0, 0, BONEC, R, 0xb8ff6a); },
    g=>{ P(g, new THREE.TorusGeometry(0.06, 0.009, 6, 16, PI*1.3), RUSTC, 0, -0.04, 0, 0, 0, PI*0.9); P(g, CY(0.009, 0.009, 0.14, 6), RUSTC, 0.06, 0.06, 0); P(g, TOs(0.02, 0.006), RUSTC, 0.06, 0.14, 0); },
    g=>{ P(g, BX(0.17, 0.04, 0.13), 0x3a1a1a); P(g, BX(0.155, 0.032, 0.12), 0xa89a7a, 0.008, 0, 0); P(g, BX(0.1, 0.004, 0.11), 0xa89a7a, 0.05, 0.03, 0.01, 0, 0, 0.5); },
    g=>{ P(g, BX(0.32, 0.03, 0.07), WD); for(let i=0;i<4;i++) P(g, CY(0.004, 0.004, 0.06, 4), 0x5a5050, -0.12 + i*0.08, 0.03, (i % 2)*0.02 - 0.01, 0, 0, (i - 1.5)*0.2); }
  ];
  junk.forEach((f, i)=>{ const a = i/junk.length*PI*2, g = group(orbit, Math.cos(a)*0.62, Math.sin(a*2)*0.12, Math.sin(a)*0.62); g.rotation.set(i*0.7, i*2, i*0.5); f(g); });
  halo(R, float, 0xb8ff6a, 1.3, 0, 0.55, 0, 0.25);
  R.h = 1.5; R.ghostly = true; return finish(R);
};

/* ================================================================== *
 *  The weird: an eye that came loose of whatever owned it, sacks of
 *  bile with a meal still floating in them, and an arm of something
 *  very large reaching up through the floor.
 * ================================================================== */
/* an eyeball: yellowed, bloodshot, veins crawling from the back to the iris, a slit pupil, wet */
function eyeball(R, parent, r, iris, y){
  P(parent, blotch(new THREE.SphereGeometry(r, 30, 22), 0xc89080, 2.4/r, 0.35, 1), 0xc8bca0, 0, y, 0);
  for(let i=0;i<11;i++){
    const a = i/11*PI*2 + Math.sin(i*7.3)*0.25, pts = [];
    for(let j=0;j<5;j++){ const t = 1.25 - j*0.2, aa = a + Math.sin(j*1.7 + i)*0.18; pts.push([Math.sin(t)*Math.cos(aa)*r*1.004, y + Math.sin(t)*Math.sin(aa)*r*1.004, Math.cos(t)*r*1.004]); }
    P(parent, K.tube(pts, r*(0.012 - (i % 3)*0.002), 6, 5), 0x7a1414);
    if(i % 2){ const t = 0.95, aa = a + 0.4; P(parent, K.tube([pts[1], [Math.sin(t)*Math.cos(aa)*r*1.004, y + Math.sin(t)*Math.sin(aa)*r*1.004, Math.cos(t)*r*1.004]], r*0.007, 3, 5), 0x8a1a1a); }
  }
  P(parent, CY(r*0.46, r*0.46, r*0.03, 24), iris, 0, y, r*0.985, PI/2);
  P(parent, TOs(r*0.46, r*0.035), new THREE.Color(iris).multiplyScalar(0.45).getHex(), 0, y, r*0.99);
  for(let i=0;i<12;i++){ const a = i/12*PI*2; P(parent, BX(r*0.012, r*0.2, r*0.01), new THREE.Color(iris).multiplyScalar(0.6).getHex(), Math.cos(a)*r*0.3, y + Math.sin(a)*r*0.3, r*1.0, 0, 0, a + PI/2); }
  P(parent, CY(r*0.2, r*0.2, r*0.04, 16), 0x050304, 0, y, r*1.0, PI/2, 0, 0, 0.4, 1, 1.5);
}
Models.watcher = function(){
  const R = rig("watcher"), b = R.body, FL = 0x5a2c30;
  const float = group(b, 0, 0.9, 0); R.parts.head = float;
  eyeball(R, float, 0.33, 0x6a5a1a, 0);
  // lids of raw flesh, heavy, wet red at the rims, a few lashes like wire
  const lid = (top)=>{
    const g = group(float, 0, 0, 0); g.rotation.x = top ? -0.5 : PI + 0.55;
    P(g, blotch(sculptW(new THREE.SphereGeometry(0.36, 28, 12, 0, PI*2, 0, PI*0.42), 0.012, 9, top ? 1 : 2), 0x8a5a6a, 8, 0.3, 3), FL);
    const er = 0.36*Math.sin(PI*0.42), ey = 0.36*Math.cos(PI*0.42);
    P(g, TOs(er, 0.018), 0x6a1a1c, 0, ey, 0, PI/2);
    if(top) for(let i=0;i<9;i++){ const a = PI/2 + (i - 4)*0.17; P(g, CO(0.005, 0.07, 4), 0x0a0808, Math.cos(a)*er, ey - 0.01, Math.sin(a)*er, -0.6 + 0.2, 0, 0); }
  };
  lid(true); lid(false);
  // the knot of flesh at the back where it tore loose, nerves and the optic stalk hanging
  P(float, blotch(lumpS(0.26, 16, 12, 0.03, 9, 4), 0x8a5a6a, 9, 0.2, 2), FL, 0, 0.0, -0.2, 0, 0, 0, 1, 0.95, 0.9);
  for(let i=0;i<7;i++){
    const a = i/7*PI*2 + 0.3, l = 0.55 + (i % 3)*0.2, x0 = Math.cos(a)*0.18, z0 = Math.sin(a)*0.12 - 0.22;
    P(float, K.tube([[x0, -0.1, z0], [x0*1.4, -0.3, z0 - 0.06], [x0*1.2 + Math.sin(i)*0.05, -0.55, z0 - 0.02], [x0*1.5, -0.1 - l, z0 + 0.04]], 0.022 - (i % 3)*0.005, 10, 6), i % 2 ? 0x7a3a40 : 0x8a5a5a);
    P(float, S(0.02, 6, 4), 0x9a6a6a, x0*1.5, -0.1 - l, z0 + 0.04);
  }
  P(float, K.tube([[0, 0, -0.35], [0, -0.1, -0.5], [0.05, -0.35, -0.55], [0.02, -0.7, -0.45]], 0.05, 10, 8), 0x6a3a40);
  halo(R, float, 0xff5a2a, 1.3, 0, 0, 0.35, 0.22);
  R.h = 1.5; return finish(R);
};
function blob(R, r, col){
  const b = R.body;
  const goo = new THREE.Mesh(sculptW(new THREE.SphereGeometry(r, 30, 22), r*0.05, 2/r, 3), new THREE.MeshPhongMaterial({ color:col, transparent:true, opacity:0.64, shininess:60, specular:0x2a3a1a, emissive:new THREE.Color(col).multiplyScalar(0.08) }));
  goo.position.y = r*0.8; goo.scale.set(1.1, 0.8, 1.1); b.add(goo); R.parts.goo = goo; R.glows.push(goo);
  // inside: what it ate. A skull, a hand, a sword, ribs, an eye or two still looking, gut in coils
  const inner = group(b, 0, r*0.85, 0); R.parts.head = inner;
  P(inner, blotch(lumpS(r*0.32, 12, 10, r*0.06, 6/r, 2), 0x6a3a2a, 4/r, 0.2, 1), 0x4a1c18, r*0.05, -r*0.15, -r*0.05);
  skull(inner, r*0.17, -r*0.38, -r*0.12, r*0.15, 0xa89a7c);
  P(inner, BX(r*0.04, r*0.8, r*0.015), 0x5a5a58, r*0.38, -r*0.05, -r*0.18, 0.2, 0, 0.7);
  P(inner, BX(r*0.25, r*0.04, r*0.05), 0x3a2a1a, r*0.12, r*0.22, -r*0.18, 0.2, 0, 0.7);
  [0, 1, 2].forEach(i=> limb(inner, [[-r*0.1 + i*r*0.05, r*0.25, -r*0.35], [-r*0.25 + i*r*0.05, r*0.15, -r*0.2], [-r*0.3 + i*r*0.05, r*0.05, -r*0.02]], r*0.012, 0xa89a7c));
  [[r*0.4, r*0.15, -r*0.05, 1.2], [-r*0.05, -r*0.3, r*0.32, -0.6]].forEach(([x, y, z, ry], i)=>{ const e = group(inner, x, y, z); e.rotation.y = ry; P(e, S(r*0.08, 10, 8), 0x8a8270); P(e, S(r*0.04, 8, 6), 0x2a1a10, 0, 0, r*0.06); limb(e, [[0, 0, -r*0.07], [r*0.03, -r*0.05, -r*0.15], [0, -r*0.08, -r*0.25]], r*0.012, 0x7a3a3a); });
  P(inner, K.tube([[r*0.2, -r*0.35, r*0.1], [r*0.4, -r*0.2, 0], [r*0.25, -r*0.05, -r*0.1], [0, -r*0.2, -r*0.25], [-r*0.2, -r*0.35, -r*0.05], [-r*0.05, -r*0.4, r*0.25]], r*0.045, 16, 8), 0x8a4a48);
  limb(inner, [[r*0.1, r*0.05, r*0.3], [r*0.2, -r*0.05, r*0.35], [r*0.28, -r*0.1, r*0.3]], r*0.02, 0xa89a7c);
  for(let i=0;i<5;i++) P(inner, S(r*0.025 + (i % 2)*r*0.02, 6, 4), new THREE.Color(col).multiplyScalar(1.5).getHex(), Math.cos(i*2.4)*r*0.5, r*0.35 - i*r*0.12, Math.sin(i*2.4)*r*0.45);
  // the crust it drags along under it, a slick of bile
  P(b, blotch(sculptW(new THREE.TorusGeometry(r*0.9, r*0.1, 10, 28), r*0.04, 3/r, 5), 0x6a4a3a, 4/r, 0.2, 2), 0x3a3424, 0, r*0.03, 0, PI/2, 0, 0, 1, 1, 0.5);
  for(let i=0;i<6;i++){ const a = i/6*PI*2 + 0.5; P(b, S(r*0.12, 8, 6), new THREE.Color(col).multiplyScalar(0.6).getHex(), Math.cos(a)*r*1.05, r*0.02, Math.sin(a)*r*1.05, 0, 0, 0, 1.4, 0.25, 1); }
  R.h = r*1.8;
}
Models.blob = function(){ const R = rig("blob"); blob(R, 0.55, 0x5a6826); return finish(R); };
Models.blobling = function(){ const R = rig("blobling"); blob(R, 0.32, 0x66742a); return finish(R); };
Models.tentacle = function(){
  const R = rig("tentacle"), b = R.body, FL = 0x5a2a36, SU = 0xb89090;
  const segs = []; let parent = b;
  for(let i=0;i<5;i++){
    const g = group(parent, 0, i ? 0.32 : 0, 0); segs.push(g);
    const r0 = 0.165 - i*0.026, r1 = r0 - 0.026;
    P(g, blotch(sculptW(new THREE.CylinderGeometry(r1, r0, 0.36, 20, 6, true), 0.01, 14, i + 1), 0x8a5a6a, 14, 0.25, i), FL, 0, 0.17, 0);
    // suckers in two rows up the inside of the curl
    [0.05, 0.13, 0.21, 0.29].forEach((y, j)=> [-1, 1].forEach(s=>{
      const rr = r0 - (r0 - r1)*y/0.36 + 0.004, a = s*0.33 + (j % 2)*0.06, x = Math.sin(a)*rr, z = Math.cos(a)*rr, sr = 0.028 - i*0.004;
      P(g, TOs(sr*0.85, sr*0.28), 0x9a6a70, x, y, z, 0, a, 0); P(g, S(sr*0.75, 8, 6), 0x6a3a44, x, y, z - 0.002, 0, a, 0, 1, 1, 0.35);
    }));
    // scars across the back, pale and puckered
    if(i < 4) P(g, BX(0.01, 0.14, 0.008), 0xa88890, Math.sin(PI + 0.4)*r0, 0.17, Math.cos(PI + 0.4)*r0, 0, PI + 0.4, 0.5 + i*0.3);
    parent = g;
  }
  limb(segs[4], [[0, 0.34, 0], [0, 0.46, 0.03], [0, 0.55, 0.1], [0, 0.56, 0.18], [0, 0.5, 0.22]], 0.034, FL);
  P(segs[4], CO(0.03, 0.06, 8), FL, 0, 0.47, 0.24, PI - 0.5);
  [0.42, 0.5].forEach(y=> P(segs[4], TOs(0.012, 0.004), SU, 0, y, 0.035));
  R.parts.segs = segs;
  // the maw it rises from: lips of flesh, a ring of teeth turned in, the floor broken round it, a slick of blood
  P(b, CY(0.55, 0.55, 0.01, 24), 0x2a0a0e, 0, 0.005, 0);
  P(b, CY(0.3, 0.3, 0.02, 20), 0x050304, 0, 0.02, 0);
  P(b, blotch(sculptW(new THREE.TorusGeometry(0.3, 0.085, 12, 32), 0.02, 10, 3), 0x8a4a5a, 10, 0.2, 2), 0x6a2a34, 0, 0.05, 0, PI/2, 0, 0, 1, 1, 0.65);
  for(let i=0;i<14;i++){ const a = i/14*PI*2; P(b, CO(0.02, 0.09 + (i % 3)*0.03, 5), 0xc8bc98, Math.cos(a)*0.26, 0.1, Math.sin(a)*0.26, -Math.sin(a)*0.7, 0, Math.cos(a)*0.7); }
  for(let i=0;i<8;i++){ const a = i/8*PI*2 + 0.2, d = 0.48 + (i % 2)*0.08; P(b, blotch(new THREE.BoxGeometry(0.2, 0.07, 0.15), 0x6a6a6a, 20, 0.2, i), 0x3e3a3c, Math.cos(a)*d, 0.035, Math.sin(a)*d, 0.35*Math.sin(a*3), -a, 0.3); }
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
/* rot flesh, smooth this time: a sculpted sphere, mottled, with raw creases */
function rotFlesh(r, amt, seed, c1, c2, c3){
  const g = sculptW(new THREE.SphereGeometry(r, 30, 22), amt, 2.2/r, seed), C2 = new THREE.Color(c2), C3 = new THREE.Color(c3 || 0x1a0a14);
  return K.paint(g, c1, (c, x, y, z)=>{
    const k = Math.sin(x*9/r*0.3 + z*7/r*0.3 + seed)*Math.sin(y*11/r*0.3 + seed*0.7);
    if(k > 0.25) c.lerp(C2, Math.min(1, (k - 0.25)*3));
    const cr = Math.sin(x*14/r*0.3 + Math.sin(z*9/r*0.3)*2)*Math.sin(y*12/r*0.3 + Math.sin(x*6/r*0.3));
    if(Math.abs(cr) < 0.05) c.lerp(C3, 0.8);
  });
}
/* glowing pustules, each sat in a dark swollen ring */
function pustules(R, parent, n, r, y, sx, sy, sz, col){
  for(let i=0;i<n;i++){
    const a = i*2.39996, e = Math.asin(((i + 0.5)/n)*1.6 - 0.8);
    const x = Math.cos(a)*Math.cos(e)*r*sx, yy = y + Math.sin(e)*r*sy, z = Math.sin(a)*Math.cos(e)*r*sz, pr = 0.035 + (i % 3)*0.015;
    P(parent, S(pr*1.3, 7, 5), 0x2a1424, x*0.95, y + (yy - y)*0.95, z*0.95);
    glow(R, parent, pr, col || ROT.bile, x, yy, z);
  }
}
function rotEyes(R, parent, n, y, z, r, col){
  for(let i=0;i<n;i++){
    const x = (i - (n - 1)/2)*r*2.3, yy = y + (i % 2)*r*0.8;
    P(parent, S(r*1.25, 10, 8), 0x2a1424, x, yy, z - r*0.2, 0, 0, 0, 1, 1, 0.6);
    P(parent, S(r, 10, 8), 0x0a0408, x, yy, z);
    glow(R, parent, r*0.45, col || ROT.eye, x, yy, z + r*0.6);
  }
}
/* jointed legs like a crab's, black-tipped, too many of them */
function rotLegs(R, parent, n, r, y, len){
  const legs = [];
  for(let i=0;i<n;i++){
    const a = (i/n)*PI*2 + PI/n, g = group(parent, Math.cos(a)*r, y, Math.sin(a)*r); g.rotation.y = -a;
    limb(g, [[0, 0, 0], [len*0.3, len*0.25, 0], [len*0.55, len*0.15, 0]], 0.03, 0x2a1430, 0x3a1a3a);
    limb(g, [[len*0.55, len*0.15, 0], [len*0.75, -len*0.3, 0], [len*0.8, -y + 0.02, 0]], 0.022, 0x221028);
    P(g, CO(0.02, 0.08, 6), 0x0e060e, len*0.8, -y + 0.03, 0, 0, 0, 0.1 + PI);
    legs.push(g);
  }
  R.parts.legs = legs;
}
/* cordyceps: orange stalks, bent, knobbed, glowing at the tips */
function cordyceps(R, parent, n, x, y, z, h, spread, seed){
  for(let i=0;i<n;i++){
    const a = i*2.39996 + (seed || 0), l = h*(0.6 + 0.4*Math.abs(Math.sin(i*3.3 + (seed || 0)))), dx = Math.cos(a)*spread, dz = Math.sin(a)*spread;
    const tip = [x + dx*2.2 + Math.sin(i)*0.03, y + l, z + dz*2.2];
    P(parent, K.tube([[x + dx*0.3, y - 0.02, z + dz*0.3], [x + dx*1.2, y + l*0.45, z + dz*1.2], [x + dx*1.9, y + l*0.8, z + dz*1.9], tip], 0.011 + (i % 2)*0.005, 8, 6), 0xa84a1a);
    P(parent, S(0.018, 8, 6), 0x6a2a10, tip[0], tip[1], tip[2], 0, 0, 0, 1, 1.6, 1);
    glow(R, parent, 0.014, ROT.cord, tip[0], tip[1] + 0.02, tip[2]);
  }
}
Models.rotling = function(){
  const R = rig("rotling"), b = R.body;
  P(b, rotFlesh(0.34, 0.05, 2, ROT.flesh, ROT.flesh2), 0xffffff, 0, 0.36, 0, 0, 0, 0, 1, 0.72, 1.12);
  // ribs it grew on the outside, a spine ridge, cordyceps out of its back
  for(let i=0;i<4;i++) [-1, 1].forEach(s=> limb(b, [[s*0.03, 0.6, -0.12 + i*0.08], [s*0.2, 0.55, -0.12 + i*0.08], [s*0.3, 0.42, -0.1 + i*0.08]], 0.011, 0x8a7a6a));
  for(let i=0;i<5;i++) P(b, CO(0.02, 0.06, 6), 0x8a7a6a, 0, 0.6 - Math.abs(i - 2)*0.008, -0.2 + i*0.08, -0.3);
  cordyceps(R, b, 4, -0.05, 0.56, -0.15, 0.22, 0.05, 1);
  pustules(R, b, 6, 0.34, 0.42, 1, 0.7, 1.1);
  rotEyes(R, b, 4, 0.48, 0.34, 0.05);
  rotLegs(R, b, 6, 0.26, 0.3, 0.45);
  // a maw under the eyes, needles round it, mandibles either side
  mouth(b, 0, 0.3, 0.37, 0.11, 0.45);
  teeth(b, 0.33, 0.4, 0.18, 8, 0xc8c0a0);
  [-1, 1].forEach(s=> limb(b, [[s*0.12, 0.3, 0.3], [s*0.16, 0.25, 0.45], [s*0.08, 0.22, 0.55]], 0.016, 0x1a0a20));
  R.h = 0.9; return finish(R);
};
Models.spitter = function(){
  const R = rig("spitter"), b = R.body;
  P(b, rotFlesh(0.45, 0.05, 3, 0x3b4a2a, 0x5a6a3a, 0x1a2010), 0xffffff, 0, 0.55, 0, 0, 0, 0, 1, 1.15, 1);
  // mould: a pelt of fine pale hairs, grey fluff in the creases, and shelf fungus
  for(let i=0;i<46;i++){ const a = i*2.39996, e = (i % 9)/9*1.5 - 0.3; P(b, CO(0.012, 0.1 + (i % 4)*0.03, 4), [0xb8d8a0, 0x8a9a7a, 0xd8e8c0][i % 3], Math.cos(a)*Math.cos(e)*0.46, 0.55 + Math.sin(e)*0.52, Math.sin(a)*Math.cos(e)*0.46, Math.sin(a)*Math.cos(e)*1.2, 0, -Math.cos(a)*Math.cos(e)*1.2 + (e > 0.6 ? 0 : 0)); }
  [[0.3, 0.75, 0.2], [-0.32, 0.6, 0.15], [0.05, 0.9, -0.3]].forEach(([x, y, z], i)=> P(b, lumpS(0.08, 10, 8, 0.03, 30, i), 0x9aa08a, x, y, z, 0, 0, 0, 1, 0.6, 1));
  bracket(b, 0.11, 0.38, 0.45, -0.15, PI/2 + 0.6, 0x5a5a40);
  bracket(b, 0.08, -0.35, 0.38, -0.2, -PI/2 - 0.5, 0x5a5a40);
  // the spout: a puckered fleshy throat, glowing bile in it, drool hanging
  const sp = group(b, 0, 0.98, 0.18); sp.rotation.x = 0.7; R.parts.head = sp;
  P(sp, sculptW(K.slathe([[0.0, -0.05], [0.16, 0.0], [0.13, 0.12], [0.1, 0.26], [0.12, 0.32], [0.05, 0.34]], 14, 4), 0.012, 14, 3), 0x2a361e, 0, 0, 0);
  P(sp, sculptW(new THREE.TorusGeometry(0.1, 0.035, 10, 20), 0.01, 20, 2), 0x4a2a2a, 0, 0.32, 0, PI/2);
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(sp, CO(0.012, 0.05, 5), 0xc8c0a0, Math.cos(a)*0.08, 0.33, Math.sin(a)*0.08, Math.sin(a)*1.0, 0, -Math.cos(a)*1.0); }
  glow(R, sp, 0.075, ROT.bile, 0, 0.32, 0);
  halo(R, sp, ROT.bile, 0.8, 0, 0.36, 0, 0.4);
  limb(b, [[0.06, 0.95, 0.4], [0.07, 0.8, 0.46], [0.06, 0.65, 0.47]], 0.012, 0x7a9a3a);
  rotEyes(R, b, 3, 0.74, 0.42, 0.06, 0xffe14a);
  rotEyes(R, b, 2, 0.58, 0.45, 0.04, 0xffe14a);
  pustules(R, b, 5, 0.45, 0.6, 1, 1.1, 1);
  rotLegs(R, b, 3, 0.28, 0.25, 0.38);
  R.h = 1.4; return finish(R);
};
Models.bloater = function(){
  const R = rig("bloater"), b = R.body;
  const belly = group(b, 0, 0.82, 0); R.parts.head = belly;
  P(belly, rotFlesh(0.75, 0.04, 4, 0x5b4a5e, 0x7a6a3a, 0x2a1020), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.9, 1);
  // stretched so far the skin has split and been stitched, veins standing up all over it
  for(let i=0;i<8;i++){ const a = i/8*PI*2 + 0.2, pts = []; for(let j=0;j<5;j++){ const e = -0.7 + j*0.35, aa = a + Math.sin(j*1.7 + i)*0.2; pts.push([Math.cos(aa)*Math.cos(e)*0.74, Math.sin(e)*0.665, Math.sin(aa)*Math.cos(e)*0.74]); } P(belly, K.tube(pts, 0.016, 10, 6), 0x3a1a3a); }
  const seam = group(belly, 0, 0, 0); seam.rotation.set(0.3, 0.4, 0.2);
  for(let i=0;i<9;i++){ const e = -0.7 + i*0.17; P(seam, BX(0.012, 0.01, 0.09), 0x1a0a10, 0, Math.sin(e)*0.68, Math.cos(e)*0.745, -e); }
  P(seam, sculptW(new THREE.TorusGeometry(0.73, 0.012, 6, 40, 1.45), 0.003, 30, 1), 0x7a2a2a, 0, 0, 0, 0, -PI/2, -0.7);
  pustules(R, belly, 14, 0.74, 0.05, 1, 0.9, 1);
  // a small head sunk into the top of it, jaw hanging, and two useless arms
  const hd = group(belly, 0, 0.55, 0.45);
  P(hd, rotFlesh(0.14, 0.012, 7, 0x6a5a6a, 0x4a3a4a), 0xffffff, 0, 0, 0, 0, 0, 0, 0.9, 1, 1);
  eyes(hd, 0.05, 0.02, 0.11, 0.03, 0xffe14a, 0, R);
  mouth(hd, 0, -0.08, 0.11, 0.05, 1.2);
  teeth(hd, -0.04, 0.12, 0.07, 6);
  [-1, 1].forEach(s=>{ limb(belly, [[s*0.5, 0.25, 0.45], [s*0.62, 0.12, 0.55], [s*0.6, -0.02, 0.62]], 0.03, 0x5b4a5e); [-1, 0, 1].forEach(f=> P(belly, CO(0.008, 0.05, 5), 0x1a0a14, s*0.6 + f*0.015, -0.06, 0.63, PI*0.9, 0, f*0.2)); });
  for(let i=0;i<3;i++) P(belly, CY(0.04, 0.09, 0.25, 8), 0x3a2a3e, (i - 1)*0.25, 0.68, -0.25, -0.3, 0, (i - 1)*0.3);
  for(let i=0;i<3;i++) glow(R, belly, 0.04, ROT.bile, (i - 1)*0.25*1.5, 0.82, -0.3);
  cordyceps(R, belly, 3, -0.3, 0.55, -0.35, 0.25, 0.05, 2);
  rotLegs(R, b, 4, 0.5, 0.35, 0.45);
  halo(R, belly, ROT.bile, 2.2, 0, 0, 0, 0.2);
  R.h = 1.9; return finish(R);
};
Models.husk = function(){
  // a mushroom-folk the Gloom took: grey stem, a dead cap, cordyceps bursting out
  const R = rig("husk");
  shroomPerson(R, 1.25, 0x5a5660, 0x7a7680);
  const cap = R.parts.head;
  cordyceps(R, cap, 8, 0, 0.32, -0.02, 0.4, 0.06, 3);
  // a fist of dead cap for a maul
  P(R.parts.armR, rotFlesh(0.15, 0.03, 9, 0x3a2c3a, 0x5a3a4a), 0xffffff, 0, -0.38, 0.06);
  pustules(R, R.parts.armR, 4, 0.15, -0.38, 1, 1, 1, ROT.cord);
  pustules(R, R.body, 5, 0.25, 0.45, 1, 1, 1, ROT.cord);
  return finish(R);
};

/* ================================================================== *
 *  Bosses
 * ================================================================== */
/* ---- the boss kit: sculpted flesh, bone, rust, wax. Bosses are the most
   detailed things in the game, so they get their own little toolbox ---- */
const BS = { bone:0xc8bca0, ivory:0xd8ceb4, rust:0x6a3a22, blood:0x4a1410, brass:0x8a6a30, iron:0x26262a, leather:0x3a2a1e,
  mould:0x4a5040, corpse:0x8a7a6a, bruise:0x3a2a3a, wax:0xd8ccb0, black:0x0a0608, wood:0x3a281c };
const bsRing = (r, t, arc)=> geo("bs-ring" + r + "," + t + "," + (arc || 0), ()=> new THREE.TorusGeometry(r, t, 6, Math.max(10, Math.round(r*90)), arc || PI*2));
function bsN(x, y, z, f, s){ return Math.sin(x*f + s)*Math.sin(y*f*1.3 + s*2.1)*Math.sin(z*f*0.9 + s*0.7) + 0.5*Math.sin(x*f*2.3 + 1.7 + s)*Math.sin(y*f*2.1 + s)*Math.sin(z*f*2.7 + 0.4); }
const bsC = new THREE.Color(), bsC2 = new THREE.Color();
/* vertex paint: two colours mottled by smooth noise, plus whatever fn adds */
function bsPaint(g, c1, c2, f, s, fn){
  const b = new THREE.Color(c2);
  return K.paint(g, c1, (c, x, y, z, i)=>{ c.lerp(b, Math.max(0, Math.min(1, 0.5 + bsN(x, y, z, f, s)*0.9))); if(fn) fn(c, x, y, z, i); });
}
/* a fresh, sculpted blob */
function bsBlob(r, sx, sy, sz, amt, f, seed, w, h){ const g = new THREE.SphereGeometry(r, w || 40, h || 28); g.scale(sx, sy, sz); return K.sculpt(g, amt, f, seed); }
/* a smooth turned shell from a [radius, height] profile, optionally open at the front (phi 0 is +z) */
function bsLathe(prof, seg, open, inward){
  if(prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();
  const c = new THREE.SplineCurve(prof.map(p=> new THREE.Vector2(p[0], p[1])));
  let pts = c.getPoints((prof.length - 1)*5).map(p=> new THREE.Vector2(Math.max(0.002, p.x), p.y));
  if(inward) pts = pts.reverse();
  return new THREE.LatheGeometry(pts, seg || 40, open || 0, PI*2 - 2*(open || 0));
}
/* cloth: an outer shell and a darker lining, torn at the hem the same way */
function bsCloth(parent, prof, col, lining, open, y0, strips, len, seed, x, y, z, rx, ry, rz, sx, sy, sz){
  const o = K.tatter(bsLathe(prof, 44, open), y0, strips, len, seed);
  P(parent, o, col, x, y, z, rx, ry, rz, sx, sy, sz);
  const inner = prof.map(p=> [p[0]*0.975, p[1]]);
  const i = K.tatter(bsLathe(inner, 44, open, true), y0, strips, len, seed);
  P(parent, i, lining, x, y, z, rx, ry, rz, sx, sy, sz);
  return o;
}
/* prefabs: a few parts merged once into one vertex-coloured geometry */
function bsPrefab(key, build){
  return geo("bs-" + key, ()=>{
    const g = new THREE.Group(); build(g);
    const list = [];
    g.children.forEach(m=>{
      m.updateMatrix();
      const q = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      q.applyMatrix4(m.matrix);
      const c = m.material.color, prev = q.attributes.color, a = q.attributes.position, col = new Float32Array(a.count*3);
      for(let i=0;i<a.count;i++){ col[i*3] = c.r*(prev ? prev.getX(i) : 1); col[i*3+1] = c.g*(prev ? prev.getY(i) : 1); col[i*3+2] = c.b*(prev ? prev.getZ(i) : 1); }
      q.setAttribute("color", new THREE.BufferAttribute(col, 3));
      list.push(q);
    });
    return K.merge(list);
  });
}
/* a skull, about 0.25 tall at scale 1, facing +z */
const bsSkull = ()=> bsPrefab("skull", g=>{
  P(g, K.sculpt(new THREE.SphereGeometry(0.1, 16, 12), 0.006, 30, 2), BS.bone, 0, 0.03, -0.01, 0, 0, 0, 0.95, 1, 1.12);
  P(g, BX(0.1, 0.06, 0.08), BS.bone, 0, -0.04, 0.045);
  P(g, BX(0.085, 0.025, 0.07), 0xb0a488, 0, -0.095, 0.04, 0.25);
  [-1, 1].forEach(s=>{ P(g, geo("bs-sock", ()=> new THREE.SphereGeometry(0.027, 8, 6)), BS.black, s*0.038, 0.01, 0.085, 0, 0, 0, 1, 0.85, 0.55); P(g, BX(0.03, 0.04, 0.05), 0xb0a488, s*0.05, -0.04, 0.06, 0, 0, s*0.2); });
  P(g, CO(0.014, 0.03, 3), BS.black, 0, -0.03, 0.105, PI);
  for(let i=0;i<6;i++) P(g, BX(0.011, 0.02, 0.01), 0xe0d6bc, -0.03 + i*0.012, -0.075, 0.085);
});
/* a candle with wax run down it; flame added separately so it can glow */
const bsCandleGeo = (h)=> bsPrefab("candle" + h, g=>{
  P(g, CY(0.032, 0.036, h, 12), BS.wax, 0, h/2, 0);
  P(g, bsRing(0.03, 0.01), 0xc8bc9c, 0, h - 0.004, 0, PI/2);
  [[0.8, 0.5], [2.6, 0.3], [4.4, 0.65]].forEach(([a, k])=> P(g, CY(0.008, 0.013, h*k, 6), 0xe0d6bc, Math.cos(a)*0.032, h - h*k/2, Math.sin(a)*0.032));
  P(g, CY(0.07, 0.08, 0.02, 12), 0xc8bc9c, 0, 0.01, 0);
  P(g, CY(0.003, 0.003, 0.035, 4), 0x1a1410, 0, h + 0.015, 0);
});
function bsCandle(R, parent, x, y, z, h, s){
  s = s || 1; h = h || 0.2;
  P(parent, bsCandleGeo(h), 0xffffff, x, y, z, 0, 0, 0, s);
  const f = glow(R, parent, 0.016*s, 0xffc070, x, y + (h + 0.05)*s, z); f.scale.set(1, 1.9, 1);
  halo(R, parent, 0xff9a3a, 0.5*s, x, y + (h + 0.06)*s, z, 0.55);
}
/* a chain sagging from a to b */
function bsChain(parent, a, b, n, col, r, sag){
  r = r || 0.04;
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], yaw = Math.atan2(dx, dz), pitch = Math.atan2(Math.hypot(dx, dz), dy);
  for(let i=0;i<n;i++){
    const t = i/(n - 1), s = Math.sin(t*PI)*(sag || 0);
    P(parent, geo("bs-link" + r, ()=> new THREE.TorusGeometry(r, r*0.22, 5, 12)), col || 0x3a3236, a[0] + dx*t, a[1] + dy*t - s, a[2] + dz*t, pitch, yaw + (i % 2 ? PI/2 : 0), 0);
  }
}
/* a tooth: an uneven yellowed fang, point along +y */
const bsTooth = ()=> bsPrefab("tooth", g=>{ P(g, bsJitter(new THREE.ConeGeometry(0.02, 0.08, 8, 3), 0.002, 60, 1), 0xd0c4a0, 0, 0.04, 0); P(g, CY(0.021, 0.018, 0.02, 8), 0x8a5a48, 0, -0.005, 0); });

/* ---- floor 1, the Castle Keep: Grubnok, a hollow tyrant on a throne lashed
   to a starved hog-beast. Crown rusted into his skull, mantle in rags, a
   great cleaver, a flail, and the heads of everyone who disagreed ---- */
/* the Hollow Wizard: Zippy's master, what the dark made of him. Zippy's own
   rig, grown tall, in shadow, with a lich's face and horns of old soot */
Models.hollow = function(){
  const R = Models.zippy({ robe:"shadow", cape:"shadow", parts:["lichmask", "horns", "spikepauldrons", "cracks"], auras:[] });
  R.kind = "hollow"; R.root.scale.setScalar(1.75); R.h = (R.h || 2.1)*1.75;
  if(R.parts.head) halo(R, R.parts.head, 0x8ad8ff, 0.9, 0, 0.05, 0.2, 0.55);
  halo(R, R.body, 0x4a6aa8, 2.4, 0, 0.9, 0, 0.25);
  return R;
};
Models.king = function(){
  const R = rig("king"), b = R.body;
  const HIDE = 0x5a5046, HIDE2 = 0x2a221e, SKIN = 0x56603e, SKIN2 = 0x262a1c, RIB = 0x7e7866;
  // the beast's body: long, sunken, ribs showing through grey hide
  const tor = bsBlob(0.62, 1.1, 0.8, 1.55, 0.03, 6, 3.1);
  bsPaint(tor, HIDE, HIDE2, 3.2, 1.2, (c, x, y, z)=>{ if(y < -0.15) c.multiplyScalar(0.7 + Math.max(0, y + 0.48)); if(Math.abs(bsN(x, y, z, 9, 4)) < 0.05) c.lerp(bsC.setHex(0x6a2a2a), 0.5); });
  P(b, tor, 0xffffff, 0, 1.0, -0.15);
  const ell = (zz)=> Math.sqrt(Math.max(0, 1 - Math.pow((zz + 0.15)/0.96, 2)));
  for(let i=0;i<6;i++){
    const z = -0.62 + i*0.19, f = ell(z);
    [-1, 1].forEach(s=>{
      const pts = []; for(let k=0;k<6;k++){ const th = 0.55 + k*0.36; pts.push([s*0.69*f*Math.sin(th), 1.0 + 0.5*f*Math.cos(th), z + k*0.015]); }
      P(b, K.tube(pts, 0.026, 10, 6), RIB);
    });
  }
  // a crooked spine where the throne doesn't cover it
  for(let i=0;i<9;i++){ const z = i < 4 ? 0.3 + i*0.17 : -0.85 - (i - 4)*0.05, f = ell(z); if(i >= 4 && i > 6) continue; P(b, CO(0.05, 0.16 - i*0.008, 6), 0x6a6252, 0, 1.0 + 0.49*f + 0.02, z, -0.4); }
  // scars stitched shut on the flanks
  [[1, 0.95, 0.2, 0.5], [-1, 1.1, -0.5, -0.3]].forEach(([s, y, z, a])=>{ P(b, BX(0.012, 0.34, 0.02), 0x3a1a18, s*0.65, y, z, a, 0, s*0.25); for(let k=0;k<5;k++) P(b, BX(0.008, 0.012, 0.08), 0x1a1210, s*0.665, y - 0.13 + k*0.065, z + Math.sin(a)*(-0.13 + k*0.065), a); });
  // neck, and a head that's mostly skull: tusks, a jaw hanging open, an iron bit
  P(b, bsPaint(bsBlob(0.21, 1, 0.95, 2.2, 0.02, 9, 5.5, 28, 20), HIDE, HIDE2, 6, 8, (c, x, y, z)=>{ if(Math.sin(z*40) > 0.6 && y < 0) c.multiplyScalar(0.6); }), 0xffffff, 0, 1.12, 0.92, 0.35);
  const hb = group(b, 0, 0.98, 1.26);
  P(hb, bsPaint(bsBlob(0.2, 0.92, 0.85, 1.3, 0.012, 14, 7), 0x6e6a58, HIDE2, 6, 2), 0xffffff, 0, 0.05, 0);
  P(hb, CY(0.09, 0.15, 0.36, 16), 0x625e4e, 0, 0.0, 0.26, PI/2);
  P(hb, S(0.1, 14, 10), 0x4a3e38, 0, -0.01, 0.44, 0, 0, 0, 1.15, 0.8, 0.6);
  [-1, 1].forEach(s=> P(hb, S(0.026, 8, 6), BS.black, s*0.045, 0.0, 0.5));
  const jaw = group(hb, 0, -0.1, 0.05); jaw.rotation.x = 0.38;
  P(jaw, CY(0.07, 0.11, 0.38, 14), 0x5a5444, 0, -0.04, 0.2, PI/2, 0, 0, 1, 1, 0.55);
  P(jaw, S(0.08, 12, 8), 0x3a1416, 0, 0.0, 0.2, 0, 0, 0, 0.9, 0.25, 2);
  for(let i=0;i<7;i++){ const z = 0.06 + i*0.05; [-1, 1].forEach(s=> P(jaw, bsTooth(), 0xffffff, s*(0.06 - i*0.004), 0.01, z, 0, 0, 0, 0.8, 0.6 + (i*7 % 3)*0.2, 0.8)); }
  for(let i=0;i<6;i++){ const z = 0.12 + i*0.055; [-1, 1].forEach(s=> P(hb, bsTooth(), 0xffffff, s*0.075, -0.1, z, PI, 0, 0, 0.8, 0.7, 0.8)); }
  [-1, 1].forEach(s=>{
    P(hb, K.tube([[s*0.1, -0.12, 0.26], [s*0.17, -0.02, 0.33], [s*0.2, 0.12, 0.28], [s*0.18, 0.2, 0.2]], 0.026, 10, 8), BS.bone);
    P(hb, S(0.05, 10, 8), BS.black, s*0.11, 0.1, 0.16, 0, 0, 0, 1, 0.7, 0.8);
    glow(R, hb, 0.014, 0xff4a1a, s*0.115, 0.1, 0.19);
    P(hb, BX(0.12, 0.035, 0.06), 0x4e4a3c, s*0.1, 0.16, 0.16, 0, 0, s*-0.35);
    P(hb, bsPaint(bsJitter(new THREE.ConeGeometry(0.08, 0.26, 12, 3), 0.01, 20, s), 0x5a5444, 0x3a1a1a, 9, s), 0xffffff, s*0.16, 0.16, -0.08, -0.7, 0, -s*1.0, 1, 1, 0.35);
  });
  P(hb, bsRing(0.135, 0.018), BS.rust, 0, -0.01, 0.3);
  [-1, 1].forEach(s=>{ P(hb, bsRing(0.04, 0.012), BS.rust, s*0.14, -0.01, 0.3, 0, PI/2); bsChain(b, [s*0.15, 0.97, 1.55], [s*0.42, 1.68, 0.12], 14, 0x3a3034, 0.026, 0.12); });
  halo(R, hb, 0xff3a1a, 0.6, 0, 0.1, 0.25, 0.25);
  // four gaunt legs (diagonal pairs swing together)
  const legs = [];
  [[-1, 0.5, 1], [1, 0.5, 1], [1, -0.78, -1], [-1, -0.78, -1]].forEach(([s, z, fr])=>{
    const l = group(b, s*0.47, 1.0, z); legs.push(l);
    P(l, bsPaint(bsBlob(0.17, 0.9, 1.4, 1, 0.015, 8, s + z, 24, 18), HIDE, HIDE2, 5, s), 0xffffff, s*0.05, -0.1, fr*0.02);
    P(l, CY(0.085, 0.12, 0.46, 12), HIDE, s*0.04, -0.3, fr*0.08, -fr*0.25);
    P(l, S(0.085, 12, 8), 0x8a8270, s*0.04, -0.52, fr*0.13);
    P(l, CY(0.05, 0.075, 0.42, 12), 0x4e4a3e, s*0.04, -0.72, fr*0.04, fr*0.35);
    P(l, S(0.06, 10, 8), 0x6a6454, s*0.04, -0.9, -fr*0.02);
    P(l, S(0.085, 12, 8), 0x2e2a24, s*0.04, -0.95, 0.04, 0, 0, 0, 1, 0.45, 1.45);
    [-1, 0, 1].forEach(k=> P(l, CO(0.022, 0.12, 6), 0x1a1612, s*0.04 + k*0.045, -0.96, 0.17, PI/2 + 0.5));
  });
  R.parts.legs = legs;
  P(b, K.tube([[0, 1.2, -1.05], [0.08, 1.05, -1.32], [0.22, 0.65, -1.45], [0.3, 0.25, -1.38]], 0.032, 14, 6), HIDE2);
  for(let i=0;i<4;i++) P(b, CO(0.02, 0.07, 5), 0x8a8270, 0.04 + i*0.06, 1.12 - i*0.15, -1.25 - i*0.06, -0.8);
  // the blanket under the throne: faded crimson with a brass stripe, frayed at the edges
  const bl = new THREE.CylinderGeometry(0.67, 0.67, 0.95, 40, 4, true, -1.05, 2.1); bl.rotateX(-PI/2);
  bsPaint(bl, 0x4a1418, 0x24080a, 7, 3, (c, x, y, z)=>{ if(Math.abs(Math.abs(x) - 0.5) < 0.04) c.setHex(BS.brass).multiplyScalar(0.7); });
  P(b, bl, 0xffffff, 0, 0.98, -0.3, 0, 0, 0, 1.12, 0.8, 1);
  [-1, 1].forEach(s=>{ for(let i=0;i<9;i++){ const z = -0.72 + i*0.1, l = 0.12 + ((i*5 + (s > 0 ? 3 : 0)) % 4)*0.07; P(b, BX(0.012, l, 0.075), 0x3a1014, s*0.66, 1.26 - l/2, z, 0, 0, s*0.18); } });
  [[-0.65], [0.05]].forEach(([z])=> P(b, bsRing(0.6, 0.025, PI*1.1), BS.leather, 0, 1.0, z, 0, 0, -PI*0.05, 1.17, 0.83, 1));
  // the throne: blackened iron and rotten velvet, spikes, skulls on the spikes
  P(b, BX(0.86, 0.14, 0.72), BS.wood, 0, 1.56, -0.32);
  P(b, BX(0.9, 0.04, 0.76), BS.rust, 0, 1.64, -0.32);
  const back = group(b, 0, 1.6, -0.82); back.rotation.x = -0.12;
  P(back, bsPaint(new THREE.BoxGeometry(0.92, 1.25, 0.1, 4, 8, 1), BS.iron, BS.rust, 6, 5), 0xffffff, 0, 0.62, 0);
  P(back, bsPaint(new THREE.BoxGeometry(0.62, 0.95, 0.04, 3, 6, 1), 0x3a1418, 0x14060a, 9, 2), 0xffffff, 0, 0.6, 0.06);
  for(let i=0;i<8;i++){ [-1, 1].forEach(s=> P(back, S(0.02, 6, 4), 0x5a4a38, s*0.4, 0.1 + i*0.15, 0.06)); }
  [-1, 1].forEach(s=>{ P(back, CY(0.06, 0.075, 1.5, 12), BS.iron, s*0.47, 0.72, 0); P(back, OC(0.08), BS.rust, s*0.47, 1.52, 0, 0, 0, 0, 1, 1.6, 1); });
  [[-0.32, 0.3], [-0.16, 0.42], [0, 0.55], [0.16, 0.42], [0.32, 0.3]].forEach(([x, h], i)=>{
    P(back, CO(0.035, h, 8), i === 2 ? 0x4a3a2a : BS.iron, x, 1.25 + h/2, 0, 0, 0, -x*0.4);
    if(i === 1 || i === 3) P(back, bsSkull(), 0xffffff, x - x*0.06, 1.38, 0.01, -0.15, x*2, x*0.5, 1.15);
  });
  P(back, bsSkull(), 0xd8ccb0, 0, 1.55, 0.03, -0.1, 0, 0, 1.4);
  [-1, 1].forEach(s=>{
    P(b, BX(0.12, 0.09, 0.62), BS.wood, s*0.49, 1.92, -0.36);
    P(b, CY(0.04, 0.05, 0.3, 10), BS.iron, s*0.49, 1.75, -0.1);
    P(b, S(0.06, 10, 8), BS.rust, s*0.49, 1.97, -0.06);
    bsCandle(R, b, s*0.49, 1.965, -0.2, 0.18 + (s > 0 ? 0.08 : 0));
    bsCandle(R, b, s*0.5, 1.965, -0.33, 0.1);
    // trophies: chains with skulls and bones, swinging off the armrests
    bsChain(b, [s*0.56, 1.9, -0.5], [s*0.62, 1.32, -0.55], 7, 0x3a3034, 0.03);
    P(b, bsSkull(), 0xd0c4a8, s*0.63, 1.17, -0.55, 0.3, s*1.3, 0.2, 1.1);
    bsChain(b, [s*0.56, 1.9, -0.2], [s*0.63, 1.5, -0.22], 5, 0x3a3034, 0.025);
    P(b, CY(0.02, 0.02, 0.32, 8), BS.bone, s*0.64, 1.36, -0.22, 0.2, 0, 0.3);
    [-1, 1].forEach(k=> P(b, S(0.03, 8, 6), BS.bone, s*0.64 + 0.05*k*Math.sin(0.3), 1.36 + k*0.16, -0.22 + k*0.03));
  });
  // a tattered banner on a pole behind the throne
  P(back, CY(0.022, 0.022, 1.0, 8), BS.iron, 0.52, 1.75, -0.08);
  P(back, CY(0.015, 0.015, 0.42, 6), BS.iron, 0.52, 2.15, 0.05, PI/2);
  const ban = new THREE.PlaneGeometry(0.34, 0.6, 6, 10); ban.rotateY(PI/2);
  const ba = ban.attributes.position;
  for(let i=0;i<ba.count;i++){ const y = ba.getY(i), z = ba.getZ(i); ba.setX(i, Math.sin(z*14 + y*5)*0.025); if(y < -0.15) ba.setY(i, y - (Math.sin(z*41.3)*0.5 + 0.5)*0.2*(-0.15 - y)/0.15); }
  ban.computeVertexNormals();
  bsPaint(ban, 0x4a1418, 0x1e0a0a, 8, 4, (c, x, y, z)=>{ if(Math.hypot(z, y - 0.05) < 0.07) c.setHex(0x9a8a6a); });
  P(back, ban, 0xffffff, 0.53, 1.87, 0.05);
  P(back, ban, 0x8a7a6a, 0.515, 1.87, 0.05, 0, PI);
  // Grubnok: gaunt, hunched over his knees
  const tg = group(b, 0, 1.62, -0.3); tg.rotation.x = 0.32; tg.scale.setScalar(1.2);
  P(tg, S(0.2, 16, 12), 0x2a2018, 0, 0.04, 0, 0, 0, 0, 1.3, 0.6, 1.1);
  const tors = bsLathe([[0.17, 0], [0.2, 0.12], [0.18, 0.28], [0.24, 0.46], [0.29, 0.62], [0.24, 0.76], [0.1, 0.86]], 36);
  K.sculpt(tors, 0.012, 12, 5);
  bsPaint(tors, SKIN, SKIN2, 5, 3, (c, x, y, z)=>{ if(z > 0.05 && y > 0.36 && y < 0.62 && Math.sin(y*58) > 0.55) c.multiplyScalar(1.35); if(y < 0.3) c.multiplyScalar(0.75); });
  P(tg, tors, 0xffffff, 0, 0, 0, 0, 0, 0, 1, 1, 0.78);
  [-1, 1].forEach(s=>{
    // thighs forward over the seat, shins hanging, long-toed bare feet
    P(tg, CY(0.075, 0.09, 0.42, 12), SKIN, s*0.14, 0.02, 0.2, PI/2 - 0.3, 0, 0);
    P(tg, S(0.075, 10, 8), 0x6a6a4a, s*0.15, -0.02, 0.42);
    P(tg, CY(0.05, 0.065, 0.4, 12), SKIN2, s*0.16, -0.24, 0.47, -0.25);
    P(tg, S(0.06, 10, 8), SKIN2, s*0.17, -0.45, 0.56, 0, 0, 0, 0.9, 0.5, 1.7);
    [-1, 0, 1].forEach(k=> P(tg, CO(0.012, 0.08, 5), 0x1a1612, s*0.17 + k*0.03, -0.46, 0.67, PI/2 + 0.3));
    P(tg, bsRing(0.07, 0.014), BS.rust, s*0.16, -0.38, 0.52, PI/2 - 0.25);
  });
  // the mantle: rotten crimson, open at the front, ragged to the seat; a collar of matted fur
  bsCloth(tg, [[0.15, 0.86], [0.34, 0.8], [0.42, 0.66], [0.45, 0.4], [0.5, 0.1], [0.55, -0.12]], 0x4a1216, 0x1a0608, 0.75, 0.15, 18, 0.32, 2.7, 0, 0, -0.04, 0, 0, 0, 1, 1, 0.82);
  for(let i=0;i<16;i++){ const a = i/16*PI*2, lump = K.lump(0.085, 1, 0.35, i*3.3); bsPaint(lump, 0x5e5848, 0x2a2620, 18, i); P(tg, lump, 0xffffff, Math.sin(a)*0.27, 0.8 + Math.sin(i*2.1)*0.02, Math.cos(a)*0.22, 0, a, 0, 1, 0.8, 1); }
  P(tg, S(0.05, 12, 8), BS.brass, 0, 0.74, 0.25);
  glow(R, tg, 0.022, 0xff2a1a, 0, 0.74, 0.29);
  // chest ribs through the skin, a cord of teeth round the neck
  for(let i=0;i<4;i++){ [-1, 1].forEach(s=>{ const y = 0.62 - i*0.07; P(tg, K.tube([[s*0.03, y, 0.2], [s*0.13, y - 0.02, 0.19], [s*0.22, y - 0.06, 0.12]], 0.01, 6, 6), 0x5e6446); }); }
  for(let i=0;i<9;i++){ const a = -0.9 + i*0.225; P(tg, bsTooth(), 0xffffff, Math.sin(a)*0.2, 0.74 - Math.cos(a*1.2)*0.04, Math.cos(a)*0.16 + 0.06, PI, 0, 0, 1, 0.8, 1); }
  // the head: gaunt and long, ears hanging, eyes sunk to pinpricks, the crown grown in
  P(tg, CY(0.07, 0.09, 0.2, 12), SKIN2, 0, 0.9, 0.06, 0.3);
  const head = group(tg, 0, 1.04, 0.1); R.parts.head = head; head.rotation.x = -0.15;
  P(head, bsPaint(bsBlob(0.2, 0.82, 1.02, 1.0, 0.014, 10, 4.2), SKIN, SKIN2, 7, 6, (c, x, y, z)=>{ if(z > 0.08 && y < 0 && Math.abs(x) > 0.07) c.multiplyScalar(0.55); }), 0xffffff, 0, 0, 0);
  P(head, S(0.12, 14, 10), SKIN, 0, -0.13, 0.08, 0, 0, 0, 0.75, 0.55, 1.1);
  P(head, K.tube([[0, 0.0, 0.17], [0, -0.03, 0.24], [0, -0.09, 0.27], [0, -0.12, 0.24]], 0.026, 12, 8), SKIN);
  [-1, 1].forEach(s=>{
    P(head, S(0.05, 12, 8), BS.black, s*0.075, 0.035, 0.15, 0, 0, 0, 1.2, 0.75, 0.55);
    glow(R, head, 0.012, 0xff3a1a, s*0.075, 0.03, 0.18);
    P(head, BX(0.11, 0.03, 0.05), SKIN2, s*0.075, 0.085, 0.16, 0.2, 0, s*-0.3);
    P(head, bsPaint(bsJitter(new THREE.ConeGeometry(0.1, 0.55, 14, 4), 0.012, 16, s*3), SKIN, 0x3a1a1a, 10, s), 0xffffff, s*0.27, -0.12, -0.03, -0.35, 0, -s*(PI/2 + 0.95), 0.8, 0.8, 0.28);
    P(head, bsRing(0.035, 0.008), BS.brass, s*0.27, -0.12, 0.0, 0, PI/2);
  });
  P(head, BX(0.15, 0.022, 0.03), 0x140808, 0, -0.105, 0.185);
  for(let i=0;i<6;i++){ const x = -0.06 + i*0.024; P(head, bsTooth(), 0xffffff, x, -0.12, 0.185, 0, 0, (i - 2.5)*0.1, 0.7, i === 0 || i === 5 ? 1.6 : 0.6 + (i % 2)*0.4, 0.7); }
  for(let i=0;i<5;i++) P(head, K.tube([[-0.08 + i*0.04, 0.12, -0.12], [-0.12 + i*0.06, -0.05, -0.2], [-0.14 + i*0.07, -0.3, -0.18]], 0.008, 8, 4), 0x8a8478);
  const crown = group(head, 0, 0.14, -0.01); R.parts.crown = crown;
  P(crown, bsPaint(new THREE.CylinderGeometry(0.175, 0.19, 0.1, 32, 2, true), BS.brass, BS.rust, 14, 2), 0xffffff);
  P(crown, bsRing(0.18, 0.014), 0x4a3820, 0, 0.05, 0, PI/2);
  [[0, 0.36, 0], [0.9, 0.26, 0.15], [1.8, 0.3, -0.1], [2.7, 0.22, 0.2], [3.6, 0.32, 0], [4.5, 0.2, -0.25], [5.4, 0.28, 0.1]].forEach(([a, h, bend])=>{
    P(crown, CO(0.032, h, 8), bend > 0.12 ? BS.rust : 0x5a4626, Math.sin(a)*0.18, h/2 + 0.03, Math.cos(a)*0.18, Math.cos(a)*0.2 + bend, 0, -Math.sin(a)*0.2);
  });
  for(let i=0;i<10;i++){ const a = i/10*PI*2 + 0.3; P(crown, S(0.032, 8, 6), 0x4a2a34, Math.sin(a)*0.19, -0.055, Math.cos(a)*0.19, 0, 0, 0, 1, 0.6, 1); }
  [[-0.05, 0.2], [0.04, -0.15], [0.1, 0.3]].forEach(([x, a])=> P(head, BX(0.012, 0.13, 0.012), 0x3a0c0a, x, 0.06, 0.17 + Math.abs(x)*-0.2, -0.15, 0, a*0.3));
  glow(R, crown, 0.024, 0xff2a1a, 0, 0.0, 0.19);
  // arms: long, knotted, claws. The right drags a great cleaver; the left swings a flail
  const arm = s=>{
    const a = group(tg, s*0.34, 0.7, 0.04); a.rotation.z = s*0.28;
    P(a, S(0.09, 12, 10), SKIN, 0, 0, 0);
    P(a, CY(0.06, 0.075, 0.42, 12), SKIN, 0, -0.21, 0);
    P(a, S(0.068, 10, 8), 0x6a6a4a, 0, -0.42, 0);
    P(a, CY(0.048, 0.062, 0.4, 12), SKIN2, 0, -0.47, 0.19, PI/2 - 0.25);
    P(a, bsRing(0.06, 0.014), BS.rust, 0, -0.5, 0.3, PI/2 - 0.25);
    P(a, S(0.065, 10, 8), SKIN2, 0, -0.52, 0.42, 0, 0, 0, 0.9, 0.8, 1.1);
    [-1.5, -0.5, 0.5, 1.5].forEach(k=> P(a, CO(0.012, 0.13, 5), 0x1a1612, k*0.025, -0.56, 0.5, PI/2 + 0.9));
    return a;
  };
  const aR = R.parts.armR = arm(1), aL = R.parts.armL = arm(-1);
  const cl = group(aR, 0, -0.52, 0.42); cl.rotation.set(0.75, 0, 0.75);
  P(cl, CY(0.028, 0.032, 0.42, 10), BS.leather, 0, 0, 0.0, PI/2);
  [-0.12, 0, 0.12].forEach(z=> P(cl, bsRing(0.032, 0.008), BS.rust, 0, 0, z));
  const blade = new THREE.BoxGeometry(0.035, 0.36, 0.82, 1, 10, 24), ba2 = blade.attributes.position;
  for(let i=0;i<ba2.count;i++){ const y = ba2.getY(i), z = ba2.getZ(i); if(y < -0.2) ba2.setY(i, y + Math.max(0, Math.sin(z*23 + 1)*0.035) - Math.max(0, z + 0.1)*0.14 - Math.max(0, z - 0.38)*0.5); if(y > 0.2 && z > 0.42) ba2.setY(i, y - (z - 0.42)*0.35); }
  blade.computeVertexNormals();
  bsPaint(blade, 0x4a4440, BS.rust, 9, 7, (c, x, y, z)=>{ if(y < -0.11) c.lerp(bsC.setHex(0xa8a49c), 0.75); if(bsN(x, y, z, 7, 2) > 0.45) c.lerp(bsC.setHex(BS.blood), 0.8); if(Math.hypot(y - 0.06, z - 0.3) < 0.05) c.setHex(0x050404); });
  P(cl, blade, 0xffffff, 0, -0.08, 0.6);
  P(cl, BX(0.05, 0.05, 0.82), 0x2a2624, 0, 0.1, 0.58);
  for(let i=0;i<5;i++) P(cl, S(0.015, 6, 4), 0x6a5a40, 0.02, 0.06, 0.25 + i*0.04);
  const fl = group(aL, 0, -0.52, 0.42);
  P(fl, CY(0.03, 0.035, 0.36, 10), BS.leather, 0, 0.05, 0.05, 0.4);
  bsChain(fl, [0, -0.12, 0.0], [0, -0.55, 0.12], 6, 0x3a3236, 0.035);
  P(fl, bsPaint(K.sculpt(new THREE.SphereGeometry(0.14, 20, 16), 0.01, 20, 3), BS.iron, BS.rust, 12, 1), 0xffffff, 0, -0.72, 0.14);
  for(let i=0;i<12;i++){ const a = i*2.4, e = Math.asin((i + 0.5)/12*2 - 1), d = [Math.cos(a)*Math.cos(e), Math.sin(e), Math.sin(a)*Math.cos(e)];
    const m = P(fl, CO(0.035, 0.14, 6), 0x1e1c1c, d[0]*0.17, -0.72 + d[1]*0.17, 0.14 + d[2]*0.17); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2])); }
  R.h = 3.2; R.size = 2.5;
  return finish(R, { w:0.03 });
};
/* roughen a shape by moving each corner with smooth noise; unlike K.sculpt the
   seams of boxes and cones stay closed, as it only looks at positions */
function bsJitter(g, amt, f, seed){
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    a.setXYZ(i, x + bsN(x, y, z, f, seed)*amt, y + bsN(y, z, x, f, seed + 1)*amt, z + bsN(z, x, y, f, seed + 2)*amt); }
  g.computeVertexNormals();
  return g;
}
/* a tube that tapers from r0 to r1 along its length (roots, nerves, tendrils, fingers) */
function bsTaper(pts, r0, r1, seg, rseg){
  const curve = new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(p[0], p[1], p[2])));
  const ts = Math.round((seg || 12)*1.5), rs = Math.max(8, rseg || 8);
  const g = new THREE.TubeGeometry(curve, ts, 1, rs, false), a = g.attributes.position, c = new THREE.Vector3();
  for(let j=0;j<=ts;j++){
    const t = j/ts, r = r0 + (r1 - r0)*Math.pow(t, 0.8); curve.getPointAt(t, c);
    for(let k=0;k<=rs;k++){ const i = j*(rs + 1) + k; a.setXYZ(i, c.x + (a.getX(i) - c.x)*r, c.y + (a.getY(i) - c.y)*r, c.z + (a.getZ(i) - c.z)*r); }
  }
  g.computeVertexNormals();
  return g;
}
/* point a part's +y (or +z) along a direction */
const bsUp = new THREE.Vector3(0, 1, 0), bsFwd = new THREE.Vector3(0, 0, 1), bsV = new THREE.Vector3();
function bsAim(m, d, axis){ m.quaternion.setFromUnitVectors(axis || bsUp, bsV.set(d[0], d[1], d[2]).normalize()); return m; }
/* an egg in a sac: pale, veined, something curled up dark inside */
const bsEgg = ()=> bsPrefab("egg", g=>{
  const e = new THREE.SphereGeometry(0.1, 16, 12); e.scale(1, 1.25, 1);
  bsPaint(e, 0xc8bc8a, 0x8a8058, 18, 3, (c, x, y, z)=>{ const d = Math.hypot(x - 0.02, y + 0.01, z - 0.1); if(d < 0.07) c.lerp(bsC.setHex(0x2a1a14), (0.07 - d)/0.07*0.9); if(Math.abs(bsN(x, y, z, 40, 1)) < 0.06) c.lerp(bsC.setHex(0x6a2a3a), 0.6); });
  P(g, e, 0xffffff);
});
/* a wilted rose: a lump of dark petals */
const bsRose = ()=> bsPrefab("rose", g=>{
  const r = K.lump(0.05, 1, 0.5, 7.7); bsPaint(r, 0x3a0c12, 0x140608, 60, 2); P(g, r, 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.8, 1);
  [0, 2.1, 4.2].forEach(a=> P(g, S(0.032, 8, 6), 0x2a0a0e, Math.cos(a)*0.04, -0.02, Math.sin(a)*0.04, 0, -a, 0.9, 1, 0.3, 1.3));
});

/* ---- floor 2, the Undercroft: the Morel Matriarch, a swollen broodmother.
   A bloated egg-sac behind her, gill slits down a stalk of a body, long
   threadlike arms, and a honeycomb cap hanging over a face like a curtain ---- */
Models.matriarch = function(){
  const R = rig("matriarch"), b = R.body;
  const PALE = 0x9a907a, PALE2 = 0x4a4038, CAP = 0x8e6e44, CAP2 = 0x140c08, SPORE = 0x9cff6a;
  // a mat of mycelium spread over the floor, threads crawling off it
  P(b, bsPaint(bsBlob(1.15, 1, 0.1, 1.05, 0.03, 4, 2.2, 36, 12), 0x8a8478, 0x24201c, 5, 1), 0xffffff, 0, 0.02, -0.12);
  for(let i=0;i<16;i++){ const a = i/16*PI*2 + Math.sin(i*3.1)*0.15, r0 = 0.9, r1 = 1.45 + (i % 3)*0.12;
    P(b, K.tube([[Math.sin(a)*r0, 0.05, Math.cos(a)*r0 - 0.12], [Math.sin(a + 0.08)*(r0 + r1)/2, 0.03, Math.cos(a + 0.08)*(r0 + r1)/2 - 0.12], [Math.sin(a - 0.05)*r1, 0.015, Math.cos(a - 0.05)*r1 - 0.12]], 0.014, 6, 4), 0xa8a090); }
  // the brood sac: segmented, veined, crusted with eggs and shelf fungus
  const ab = bsBlob(0.75, 1.15, 0.7, 1.35, 0.04, 4.5, 1.7, 48, 32);
  bsPaint(ab, PALE, 0x5a4a50, 4, 2, (c, x, y, z)=>{ if(Math.abs(bsN(x, y, z, 6, 3)) < 0.055) c.lerp(bsC.setHex(0x3a1430), 0.75); if(y < -0.2) c.multiplyScalar(0.6); if(y > 0.25) c.lerp(bsC.setHex(0xa8a070), 0.25); });
  P(b, ab, 0xffffff, 0, 0.55, -0.45);
  [-0.9, -0.55, -0.2].forEach(z=>{ const f = Math.sqrt(1 - Math.pow((z + 0.45)/1.01, 2)); P(b, bsRing(1, 0.028), 0x3e3230, 0, 0.55, z, 0, 0, 0, 0.87*f, 0.53*f, 1); });
  for(let i=0;i<26;i++){
    const a = i*2.39996, e = 0.15 + (i % 7)*0.18, d = [Math.cos(a)*Math.cos(e), Math.sin(e), Math.sin(a)*Math.cos(e)];
    const x = d[0]*0.86, y = 0.55 + d[1]*0.52, z = -0.45 + d[2]*1.0;
    if(z > 0.3) continue;
    const m = P(b, bsEgg(), 0xffffff, x*1.04, y + 0.03, z*1.02 + (z < 0 ? -0.02 : 0), 0, 0, 0, 1 + (i % 4)*0.25);
    bsAim(m, [d[0], d[1] + 0.5, d[2]]);
    if(i % 5 === 1) glow(R, b, 0.028, SPORE, x*1.13, y + 0.1, z*1.06);
  }
  // burst eggs, empty and dark inside
  [[0.5, 0.95, -0.7], [-0.45, 0.98, -0.3], [0.1, 1.08, -0.85]].forEach(([x, y, z], i)=>{
    P(b, new THREE.SphereGeometry(0.13, 16, 10, 0, PI*2, PI*0.35, PI*0.65), 0xb8ac80, x, y, z, 0, i, 0, 1, 1.2, 1);
    P(b, S(0.11, 12, 8), 0x140a08, x, y + 0.01, z, 0, 0, 0, 1, 0.5, 1);
  });
  // shelf fungus on her flanks
  [[1, 0.6, -0.9, 0.22], [1, 0.42, -0.4, 0.17], [-1, 0.55, -0.75, 0.25], [-1, 0.75, -1.1, 0.15], [1, 0.75, -1.2, 0.14], [-1, 0.38, -0.25, 0.16]].forEach(([s, y, z, r], i)=>{
    const sh = new THREE.CylinderGeometry(r, r*1.08, 0.05, 20, 1, false, -PI/2, PI);
    bsPaint(sh, 0x7a5a3a, 0x2a1a10, 30, i, (c, x, y2, z2)=>{ if(y2 < 0) c.setHex(0xb8a888); if(Math.sin(Math.hypot(x, z2)*90) > 0.6) c.multiplyScalar(0.7); });
    const f = Math.sqrt(Math.max(0.1, 1 - Math.pow((z + 0.45)/1.01, 2))), yy = (y - 0.55)/0.52;
    P(b, sh, 0xffffff, s*0.86*f*Math.sqrt(Math.max(0, 1 - yy*yy)), y, z, 0, s > 0 ? PI/2 : -PI/2, 0);
  });
  for(let i=0;i<9;i++){ const a = 1.2 + i*0.75, x = Math.cos(a)*0.55, z = -0.6 + Math.sin(a)*0.75, h = 0.08 + (i % 3)*0.05;
    P(b, CY(0.012, 0.018, h, 6), 0xc8c0a8, x, 0.98 + (i % 2)*0.04, z); P(b, new THREE.SphereGeometry(0.04 + (i % 3)*0.012, 10, 6, 0, PI*2, 0, PI/2), [0x5a4030, 0x3a2a24, 0x8a6a4a][i % 3], x, 0.98 + (i % 2)*0.04 + h/2, z); }
  // her body: a stooped stalk rising from the front of the sac, gill slits down both sides
  const tg = group(b, 0, 0.42, 0.42); tg.rotation.x = 0.38;
  const st = bsLathe([[0.4, 0], [0.36, 0.22], [0.28, 0.5], [0.24, 0.78], [0.27, 0.98], [0.2, 1.12], [0.1, 1.2]], 40);
  K.sculpt(st, 0.018, 9, 3);
  bsPaint(st, PALE, PALE2, 6, 4, (c, x, y, z)=>{ c.multiplyScalar(0.82 + 0.18*Math.sin(Math.atan2(x, z)*26 + y*3)); if(y < 0.25) c.multiplyScalar(0.7); });
  P(tg, st, 0xffffff);
  [-1, 1].forEach(s=>{
    for(let i=0;i<5;i++){ const y = 0.42 + i*0.1, r = 0.27 - i*0.008;
      P(tg, BX(0.02, 0.14, 0.06), 0x1a0a0c, s*r, y, 0.02, 0, 0, s*0.35);
      P(tg, BX(0.025, 0.15, 0.02), 0xb8a890, s*(r + 0.01), y + 0.01, 0.055, 0, 0, s*0.35); }
    // egg sacs hanging under her arms
    for(let k=0;k<3;k++) P(tg, bsEgg(), 0xffffff, s*(0.26 + k*0.03), 0.3 - k*0.12, 0.16 + k*0.04, 0.3, 0, 0, 1.3 - k*0.2);
  });
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(tg, K.tube([[Math.sin(a)*0.3, 0.5, Math.cos(a)*0.28], [Math.sin(a)*0.36, 0.2, Math.cos(a)*0.34], [Math.sin(a)*0.44, -0.1 - (i % 3)*0.08, Math.cos(a)*0.42]], 0.01, 6, 4), 0xb0a894); }
  // long thread-thin arms, fingers like roots
  const arm = s=>{
    const a = group(tg, s*0.26, 1.0, 0.04); a.rotation.z = s*0.22;
    P(a, S(0.07, 12, 8), PALE, 0, 0, 0);
    P(a, CY(0.04, 0.055, 0.5, 12), PALE, 0, -0.25, 0.02);
    P(a, S(0.05, 10, 8), 0xb8ac94, 0, -0.5, 0.04);
    P(a, CY(0.03, 0.042, 0.5, 12), PALE2, 0, -0.74, 0.12, 0.35);
    P(a, S(0.045, 10, 8), PALE2, 0, -0.98, 0.21);
    for(let k=0;k<5;k++){ const ang = (k - 2)*0.35; P(a, K.tube([[0, -1.0, 0.22], [Math.sin(ang)*0.06, -1.1, 0.24 + Math.cos(ang)*0.04], [Math.sin(ang)*0.1, -1.22, 0.23 + Math.cos(ang)*0.08]], 0.011, 6, 4), 0x8a8270); }
    P(a, K.tube([[0, -0.6, 0.06], [0.03, -0.9, 0.0], [0.02, -1.2, 0.03]], 0.006, 6, 4), 0xc8c0b0);
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  // the head: a wizened face under a honeycomb cap, gills hanging round it like a veil
  const cap = group(tg, 0, 1.2, 0.06); R.parts.head = cap; cap.rotation.x = -0.25;
  const face = bsBlob(0.15, 0.82, 1.1, 0.9, 0.012, 14, 2);
  bsPaint(face, 0xa89a80, 0x3a3028, 9, 5, (c, x, y, z)=>{ if(z > 0.05 && y > -0.02 && y < 0.07 && Math.abs(x) > 0.02 && Math.abs(x) < 0.11) c.multiplyScalar(0.35); });
  P(cap, face, 0xffffff, 0, -0.1, 0.16);
  [-1, 1].forEach(s=>{ P(cap, S(0.032, 10, 8), BS.black, s*0.05, -0.07, 0.29, 0, 0, 0, 1.2, 0.8, 0.5); glow(R, cap, 0.011, SPORE, s*0.05, -0.07, 0.305); });
  P(cap, S(0.04, 10, 8), 0x140808, 0, -0.2, 0.29, 0, 0, 0, 1, 1.6, 0.5);
  for(let i=0;i<4;i++) P(cap, bsTooth(), 0xffffff, -0.024 + i*0.016, -0.15, 0.3, PI, 0, 0, 0.5, 0.6, 0.5);
  const cg = bsLathe([[0.6, -0.08], [0.7, 0.05], [0.72, 0.22], [0.66, 0.48], [0.5, 0.78], [0.26, 1.0], [0.0, 1.08]], 84);
  { const a = cg.attributes.position;
    for(let i=0;i<a.count;i++){
      const x = a.getX(i), y = a.getY(i), z = a.getZ(i), ang = Math.atan2(x, z), r = Math.hypot(x, z);
      if(r < 0.02 || y < 0.0) continue;
      const u = ang/PI*7 + bsN(x, y, z, 5, 1)*0.35, v = y*6.5 + (Math.floor(u) % 2)*0.5 + bsN(x, y, z, 4, 2)*0.3;
      const du = Math.abs(u - Math.floor(u) - 0.5)*2, dv = Math.abs(v - Math.floor(v) - 0.5)*2;
      const pit = Math.max(0, 1 - du*du)*Math.max(0, 1 - dv*dv), k = 1 - 0.11*pit*Math.min(1, y*4);
      a.setX(i, x*k); a.setZ(i, z*k);
    }
    cg.computeVertexNormals();
    K.paint(cg, CAP, (c, x, y, z)=>{
      const u = Math.atan2(x, z)/PI*7 + bsN(x, y, z, 5, 1)*0.35, v = y*6.5 + (Math.floor(u) % 2)*0.5 + bsN(x, y, z, 4, 2)*0.3;
      const du = Math.abs(u - Math.floor(u) - 0.5)*2, dv = Math.abs(v - Math.floor(v) - 0.5)*2, pit = Math.max(0, 1 - du*du)*Math.max(0, 1 - dv*dv);
      if(y > 0.02) c.lerp(bsC.setHex(CAP2), Math.min(1, pit*1.3)); else c.setHex(0x8a7a5e); if(bsN(x, y, z, 11, 3) > 0.5) c.lerp(bsC.setHex(0x3a4a30), 0.4); });
  }
  P(cap, cg, 0xffffff, 0, 0.02, -0.05);
  // gills: a ragged curtain under the rim, parted at the front so the face shows
  for(let i=0;i<44;i++){
    const a = i/44*PI*2; if(Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.42) continue;
    const l = 0.25 + ((i*7) % 5)*0.06;
    P(cap, BX(0.008, l, 0.1), i % 2 ? 0x8a7a62 : 0x6a5a48, Math.sin(a)*0.6, -0.05 - l/2, Math.cos(a)*0.6 - 0.05, 0, a, 0);
  }
  for(let i=0;i<16;i++){ const a = i*2.39996, e = 0.15 + (i % 5)*0.17, y = e*1.25, r = 0.7*Math.cos(e*1.2);
    glow(R, cap, 0.022 + (i % 3)*0.01, SPORE, Math.sin(a)*r*0.95, y, Math.cos(a)*r*0.95 - 0.05); }
  halo(R, cap, SPORE, 1.6, 0, 0.5, 0, 0.18);
  for(let i=0;i<5;i++){ const a = i/5*PI*2 + 0.4; halo(R, b, SPORE, 0.9, Math.sin(a)*1.0, 0.15, Math.cos(a)*1.0 - 0.2, 0.3); }
  R.h = 2.7; return finish(R, { w:0.03 });
};

/* ---- floor 3, the Rotting Crypt: the Weeping Bride. A towering corpse in
   a torn wedding dress, face hidden under a veil, long dead hands, a
   bouquet gone black, and the candles of a wedding nobody came to ---- */
Models.bride = function(){
  const R = rig("bride"), b = R.body;
  const f = group(b, 0, 0.3, 0); R.parts.head = f;
  const DRESS = 0xaca48e, DRESS2 = 0x3e382e, FLESH = 0x7c7e86, FLESH2 = 0x34343e, SOUL = 0x8ad8ff;
  const stain = (c, x, y, z)=>{ if(y < 0.5) c.multiplyScalar(0.55 + y*0.9); if(bsN(x, y, z, 6, 9) > 0.55) c.lerp(bsC.setHex(0x3a1410), 0.55); };
  // the underskirt and the dress over it, split at the front, hanging in rags below the floor
  const us = K.tatter(bsLathe([[0.66, -0.25], [0.58, 0.2], [0.4, 0.62], [0.24, 1.0], [0.18, 1.2]], 44), 0.15, 26, 0.35, 4.1);
  bsPaint(us, 0x6a6456, 0x2a2620, 7, 2, stain); P(f, us, 0xffffff);
  const prof = [[0.78, -0.25], [0.64, 0.1], [0.47, 0.46], [0.3, 0.84], [0.2, 1.13], [0.18, 1.26]];
  const ds = K.tatter(bsLathe(prof, 48, 0.32), 0.3, 28, 0.5, 2.3); bsPaint(ds, DRESS, DRESS2, 4, 1, stain); P(f, ds, 0xffffff);
  const dl = K.tatter(bsLathe(prof.map(p=> [p[0]*0.975, p[1]]), 48, 0.32, true), 0.3, 28, 0.5, 2.3); bsPaint(dl, 0x3a362e, 0x1a1814, 5, 1); P(f, dl, 0xffffff);
  // ruffles, torn
  { const g = K.tatter(bsLathe([[0.36, 0.62], [0.29, 0.8], [0.26, 0.86]], 48, 0.32), 0.7, 30, 0.2, 5); bsPaint(g, 0xa8a08a, 0x4a4438, 9, 1, stain); P(f, g, 0xffffff); }
  // the train, dragging behind her, candles melted onto it
  const tr = new THREE.PlaneGeometry(1, 1.5, 12, 18); tr.rotateX(-PI/2);
  { const a = tr.attributes.position;
    for(let i=0;i<a.count;i++){ const x = a.getX(i), z = a.getZ(i), t = (0.75 - z)/1.5; // t: 0 near her, 1 at the end
      a.setX(i, x*(0.95 - (1 - t)*0.35)); a.setY(i, Math.sin(x*9 + z*2)*0.035 + (1 - t)*0.25 + Math.max(0, 0.06 - t*0.06));
      if(t > 0.85) a.setZ(i, z - (Math.sin(x*37.1)*0.5 + 0.5)*0.25*(t - 0.85)/0.15); }
    tr.computeVertexNormals(); bsPaint(tr, DRESS, 0x4a443a, 4, 3, (c, x, y, z)=>{ c.multiplyScalar(0.65 + (z + 0.75)*0.2); }); }
  P(f, tr, 0xffffff, 0, -0.28, 0.0 - 1.15, 0, 0, 0);
  [[0.25, -1.2, 0.2], [-0.3, -1.45, 0.14], [0.05, -1.75, 0.26], [-0.12, -1.05, 0.1]].forEach(([x, z, h])=> bsCandle(R, f, x, -0.28 + (1 - (0.75 - (z + 1.15))/1.5)*0.25, z, h));
  // the bodice: laced, torn open over her ribs
  const bod = bsLathe([[0.17, 1.18], [0.15, 1.32], [0.18, 1.46], [0.21, 1.58], [0.2, 1.66], [0.12, 1.72]], 36);
  bsPaint(bod, 0xb8ae96, 0x5a5244, 7, 6, (c, x, y, z)=>{ if(z > 0.1 && y > 1.38 && y < 1.6 && Math.abs(x) < 0.09) c.setHex(0x120808); });
  P(f, bod, 0xffffff);
  for(let i=0;i<4;i++){ const y = 1.4 + i*0.05; P(f, K.tube([[-0.08, y, 0.17], [0, y + 0.012, 0.195], [0.08, y, 0.17]], 0.006, 6, 4), 0x7a7262); }
  P(f, BX(0.012, 0.2, 0.02), 0x6a6252, 0, 1.49, 0.19);
  for(let i=0;i<5;i++){ const y = 1.2 + i*0.035; [-1, 1].forEach(s=> P(f, BX(0.06, 0.006, 0.006), 0x2a2420, s*0.03, y, 0.165, 0, 0, s*0.6)); }
  P(f, bsRing(0.175, 0.022), 0x3a3430, 0, 1.2, 0, PI/2);
  P(f, S(0.03, 10, 8), BS.brass, 0, 1.2, 0.19);
  // shoulders, collarbones, a long grey neck
  [-1, 1].forEach(s=>{ P(f, S(0.065, 12, 8), FLESH, s*0.18, 1.68, 0); P(f, K.tube([[s*0.03, 1.7, 0.1], [s*0.1, 1.71, 0.08], [s*0.17, 1.7, 0.03]], 0.012, 6, 4), 0x9a9aa0); });
  P(f, CY(0.04, 0.05, 0.2, 12), FLESH, 0, 1.79, 0.02, 0.2);
  // the head, bowed, sunk in the veil; only the eyes come through
  const hd = group(f, 0, 1.94, 0.05); hd.rotation.set(0.35, 0, 0.22);
  P(hd, bsPaint(bsBlob(0.11, 0.85, 1.05, 0.95, 0.008, 16, 3), FLESH2, 0x14141a, 9, 2), 0xffffff, 0, 0, 0);
  for(let i=0;i<12;i++){ const a = (i/11 - 0.5)*2.6 + PI, r = 0.1;
    P(hd, K.tube([[Math.sin(a)*r, 0.08, Math.cos(a)*r], [Math.sin(a)*(r + 0.06), -0.2, Math.cos(a)*(r + 0.06)], [Math.sin(a)*(r + 0.1) + Math.sin(i)*0.04, -0.55 - (i % 3)*0.1, Math.cos(a)*(r + 0.1)]], 0.014, 8, 4), 0x121016); }
  // the veil: a short one over the face, a long one down her back
  const fv = [[0.03, 0.22], [0.15, 0.16], [0.19, 0.02], [0.2, -0.12], [0.21, -0.2]];
  P(f, bsPaint(K.tatter(bsLathe(fv, 40), -0.08, 14, 0.12, 3.3), 0xb8b2a4, 0x5a5650, 8, 4), 0xffffff, 0, 1.98, 0.1);
  P(f, K.tatter(bsLathe(fv.map(p=> [p[0]*0.96, p[1]]), 40, 0, true), -0.08, 14, 0.12, 3.3), 0x1e1e24, 0, 1.98, 0.1);
  const veil = [[0.16, 0.18], [0.2, 0.02], [0.23, -0.15], [0.3, -0.4], [0.38, -0.75], [0.44, -1.05]];
  const vo = K.tatter(bsLathe(veil, 44, 1.25), -0.75, 16, 0.35, 7.1); bsPaint(vo, 0xb0aa9c, 0x4a4640, 8, 4, (c, x, y)=>{ c.multiplyScalar(0.95 + y*0.25); }); P(f, vo, 0xffffff, 0, 1.98, 0.08);
  const vi = K.tatter(bsLathe(veil.map(p=> [p[0]*0.96, p[1]]), 44, 1.25, true), -0.75, 16, 0.35, 7.1); P(f, vi, 0x1e1e24, 0, 1.98, 0.08);
  [-1, 1].forEach(s=>{ glow(R, f, 0.015, SOUL, s*0.05, 1.92, 0.31); halo(R, f, SOUL, 0.25, s*0.05, 1.92, 0.32, 0.6); });
  
  // a wreath of dead flowers and a tarnished tiara
  for(let i=0;i<10;i++){ const a = i/10*PI*2; P(f, bsRose(), 0xffffff, Math.sin(a)*0.17, 2.11 + Math.cos(a*3)*0.02, 0.1 + Math.cos(a)*0.16, 0, a, 0, 0.8); P(f, CO(0.006, 0.08, 4), 0x2a2018, Math.sin(a + 0.3)*0.19, 2.14, 0.1 + Math.cos(a + 0.3)*0.18, Math.cos(a)*0.7, 0, -Math.sin(a)*0.7); }
  for(let i=0;i<5;i++) P(f, CO(0.013, 0.06 + (i === 2 ? 0.05 : 0), 4), 0x5a4a30, -0.08 + i*0.04, 2.19 + (i === 2 ? 0.02 : 0), 0.24 - Math.abs(i - 2)*0.02);
  glow(R, f, 0.016, SOUL, 0, 2.27, 0.25);
  // arms: long, grey, the right reaching for you, the left clutching a bouquet gone black
  const arm = (s, reach)=>{
    const a = group(f, s*0.2, 1.66, 0.02);
    const el = reach ? [s*0.05, -0.32, 0.16] : [s*0.04, -0.38, 0.02], wr = reach ? [s*0.02, -0.46, 0.52] : [-s*0.05, -0.5, 0.3];
    P(a, S(0.05, 10, 8), FLESH, 0, 0, 0);
    P(a, K.tube([[0, 0, 0], [el[0]*0.5, el[1]*0.5, el[2]*0.5], el], 0.035, 8, 8), FLESH);
    P(a, K.tube([el, [(el[0] + wr[0])/2, (el[1] + wr[1])/2, (el[2] + wr[2])/2], wr], 0.026, 8, 8), FLESH2);
    P(a, S(0.032, 8, 6), 0x9a9aa0, el[0], el[1], el[2]);
    const sl = K.tatter(bsLathe([[0.09, -0.2], [0.07, -0.05], [0.05, 0.05]], 20), -0.12, 9, 0.15, s + 3); P(a, sl, 0xc0b6a0, el[0]*0.35, el[1]*0.35, el[2]*0.35, reach ? 0.5 : 0.1, 0, s*0.1);
    P(a, S(0.04, 10, 8), FLESH2, wr[0], wr[1], wr[2], 0, 0, 0, 0.8, 0.5, 1.2);
    return { a, wr };
  };
  const rA = arm(1, true), lA = arm(-1, false);
  R.parts.armR = rA.a; R.parts.armL = lA.a;
  for(let k=0;k<5;k++){ const sp = (k - 2)*0.05, w = rA.wr;
    P(rA.a, K.tube([[w[0] + sp*0.5, w[1], w[2] + 0.03], [w[0] + sp, w[1] - 0.03, w[2] + 0.13], [w[0] + sp*1.3, w[1] - 0.09, w[2] + 0.22 - Math.abs(k - 2)*0.03]], 0.008, 8, 4), FLESH2);
    P(rA.a, CO(0.007, 0.04, 4), 0x1a1614, w[0] + sp*1.3, w[1] - 0.1, w[2] + 0.24 - Math.abs(k - 2)*0.03, PI/2 + 0.6); }
  const bq = group(lA.a, lA.wr[0], lA.wr[1], lA.wr[2]);
  for(let k=0;k<7;k++) P(bq, CY(0.005, 0.005, 0.3, 4), 0x2a2a18, (k - 3)*0.008, -0.1, 0.0, 0.1*(k - 3), 0, 0.08*(k - 3));
  P(bq, bsRing(0.03, 0.01), 0x4a3a40, 0, -0.03, 0, PI/2);
  [[0, 0.1, 0.02], [-0.06, 0.07, 0.03], [0.06, 0.08, 0.0], [-0.03, 0.12, -0.04], [0.04, 0.13, 0.05], [0.0, 0.05, 0.07], [-0.07, 0.03, -0.03]].forEach(([x, y, z], i)=> P(bq, bsRose(), 0xffffff, x, y, z, i, i*2, 0, 0.9 + (i % 3)*0.15));
  for(let k=0;k<4;k++){ const a = k*1.6; P(bq, BX(0.04, 0.005, 0.02), 0x2a3018, Math.cos(a)*0.08, 0.02 - k*0.02, Math.sin(a)*0.08, 0.3, a, 0.5); }
  P(bq, K.tube([[0.01, -0.03, 0.03], [0.03, -0.2, 0.05], [0.0, -0.42, 0.04]], 0.008, 6, 4), 0x5a4a50);
  // candles drifting round her, and the cold light she gives off
  [[0.62, 1.5, 0.35, 0.16], [-0.65, 1.25, 0.1, 0.22], [0.45, 0.95, -0.55, 0.12]].forEach(([x, y, z, h])=> bsCandle(R, f, x, y, z, h, 1.2));
  halo(R, f, SOUL, 1.4, 0, 1.5, 0.2, 0.3);
  halo(R, f, 0xa8d8ff, 3.2, 0, 0.3, 0, 0.18);
  R.h = 2.5; R.ghostly = true; return finish(R, { w:0.028 });
};

/* ---- floor 4, the Gloomwood Edge: the Eye Below. A vast bloodshot eye in a
   socket of meat, its lids rimmed with teeth that close like a mouth when it
   blinks, nerves running out of it into the floor ---- */
function bsEyeball(R, parent, r, iris, seed){
  const e = new THREE.SphereGeometry(r, r > 0.5 ? 64 : 22, r > 0.5 ? 48 : 16);
  K.paint(e, 0xb4a88a, (c, x, y, z)=>{ const cz = z/r;
    if(cz < 0.2) c.lerp(bsC.setHex(0x7a4438), Math.min(1, (0.2 - cz)*0.8));
    if(cz > 0.6) c.lerp(bsC.setHex(0xa85a48), (cz - 0.6)*1.4);
    if(cz < 0.86 && Math.abs(bsN(x/r, y/r, z/r, 5, seed)) < 0.022) c.lerp(bsC.setHex(0x7a0e0c), 0.9);
    if(cz < 0.86 && Math.abs(bsN(x/r, y/r, z/r, 12, seed + 2)) < 0.02) c.lerp(bsC.setHex(0x9a2018), 0.75);
    if(bsN(x/r, y/r, z/r, 2.2, seed + 5) > 0.35) c.lerp(bsC.setHex(0x8a6a3a), 0.35); });
  P(parent, e, 0xffffff);
  const ic = new THREE.SphereGeometry(r*1.004, r > 0.5 ? 56 : 18, r > 0.5 ? 18 : 6, 0, PI*2, 0, 0.52); ic.rotateX(PI/2);
  const ir = new THREE.Color(iris), dk = new THREE.Color(0x1a0402);
  K.paint(ic, iris, (c, x, y, z)=>{
    const t = Math.acos(Math.min(1, z/(r*1.004)))/0.52, ang = Math.atan2(y, x), xs = x/r, ys = y/r;
    c.copy(ir).multiplyScalar(0.45 + 0.55*(0.5 + 0.5*Math.sin(ang*38 + Math.sin(ang*7)*2)))
      .lerp(dk, Math.max(0, t - 0.75)*3);
    if(t < 0.35) c.lerp(bsC.setHex(0xffd080), (0.35 - t)*1.2);
    if(Math.abs(xs) < 0.07*Math.max(0, 1 - Math.pow(ys/0.36, 2)) + 0.004) c.setHex(0x000000);
  });
  const m = new THREE.Mesh(ic, new THREE.MeshBasicMaterial({ vertexColors:true, transparent:true }));
  parent.add(m); R.glows.push(m);
  return m;
}
Models.eye = function(){
  const R = rig("eye"), b = R.body;
  const FL = 0x5a3440, FL2 = 0x1e0c14, IRIS = 0xff4a1a;
  const float = group(b, 0, 1.65, 0); R.parts.head = float;
  bsEyeball(R, float, 1.2, IRIS, 1.3);
  // veins standing out on the white
  for(let i=0;i<9;i++){
    const a = i/9*PI*2 + Math.sin(i*5)*0.3, pts = [];
    for(let k=0;k<8;k++){ const th = 2.1 - k*0.19, w = a + Math.sin(k*2.3 + i)*0.16; pts.push([Math.sin(th)*Math.cos(w)*1.21, Math.sin(th)*Math.sin(w)*1.21, Math.cos(th)*1.21]); }
    P(float, bsTaper(pts, 0.022, 0.004, 14, 6), 0x5a0c0c);
  }
  // the socket: meat behind and round the eye
  const sock = bsBlob(1.0, 1.25, 1.2, 0.9, 0.08, 3.5, 2.2, 44, 32);
  bsPaint(sock, FL, FL2, 4, 3, (c, x, y, z)=>{ if(Math.abs(bsN(x, y, z, 5, 1)) < 0.05) c.lerp(bsC.setHex(0xb02428), 0.85); });
  P(float, sock, 0xffffff, 0, -0.05, -0.62);
  // sores weeping light on the back of it, so it never reads as a hole from behind
  for(let i=0;i<9;i++){ const u = 2.2 + i*0.24, v = -0.5 + (i % 4)*0.35, d = [Math.sin(u)*Math.cos(v), Math.sin(v), Math.cos(u)*Math.cos(v)];
    glow(R, float, 0.035 + (i % 3)*0.015, 0xd8301a, d[0]*1.27, -0.05 + d[1]*1.22, -0.62 + d[2]*0.93); }
  // lids: wrinkled, bruised, and lined with teeth that meet when it shuts
  const lid = top=>{
    const g = group(float, 0, 0, 0);
    const sh = new THREE.SphereGeometry(1.3, 60, 22, 0, PI*2, top ? 0 : PI/2, PI/2);
    K.sculpt(sh, 0.04, 4.5, top ? 1 : 2);
    bsPaint(sh, FL, FL2, 5, top ? 3 : 4, (c, x, y, z)=>{ const ay = Math.abs(y); if(ay < 0.35) c.multiplyScalar(0.75 + 0.25*Math.sin(ay*70)); if(Math.abs(bsN(x, y, z, 4, 7)) < 0.04) c.lerp(bsC.setHex(0x7a1424), 0.7); });
    P(g, sh, 0xffffff);
    P(g, bsRing(1.3, 0.1, PI), 0x4a2630, 0, 0, 0, PI/2, 0, 0, 1, 1, top ? 1.15 : 0.9);
    P(g, bsRing(1.22, 0.07, PI), 0x5a1018, 0, top ? -0.06 : 0.06, 0, PI/2);
    for(let i=0;i<24;i++){ const a = 0.16 + i/23*(PI - 0.32), big = (i*7) % 5 === 0;
      P(g, bsTooth(), 0xffffff, Math.cos(a)*1.24, top ? -0.06 : 0.06, Math.sin(a)*1.24, top ? PI : 0, 0, (i % 3 - 1)*0.12, 1.7, big ? 2.6 : 1.4 + (i % 3)*0.25, 1.7); }
    return g;
  };
  const top = lid(true), bot = lid(false);
  top.rotation.x = -1.35; bot.rotation.x = 1.35;
  R.parts.lidT = top; R.parts.lidB = bot;
  // the optic nerve, trailing out the back and down into the floor
  P(float, K.tube([[0, -0.1, -1.4], [0, -0.6, -1.85], [0.1, -1.3, -1.9], [0.15, -1.62, -1.7]], 0.2, 14, 12), FL);
  for(let i=0;i<5;i++) P(float, bsRing(0.21, 0.02), 0x3a1a24, 0, -0.35 - i*0.25, -1.62 - Math.sin(i*0.6)*0.25, 0.6 + i*0.25);
  // nerves into the floor, splitting at the ends into claws
  for(let i=0;i<8;i++){
    const a = i/8*PI*2 + 0.2, ca = Math.cos(a), sa = Math.sin(a), bend = 0.35*(i % 2 ? 1 : -1);
    const p = [[ca*0.5, 1.05, sa*0.5], [ca*1.0, 0.75, sa*1.0], [Math.cos(a + bend*0.4)*1.45, 0.3, Math.sin(a + bend*0.4)*1.45], [Math.cos(a + bend)*1.95, 0.06, Math.sin(a + bend)*1.95]];
    P(b, bsPaint(bsTaper([[ca*0.3, 1.2, sa*0.3]].concat(p), 0.24, 0.035, 20, 12), FL, FL2, 7, i, (c, x, y, z)=>{ if(Math.sin((x*ca + z*sa)*30) > 0.7) c.multiplyScalar(0.6); }), 0xffffff);
    P(b, bsTaper([[ca*0.6, 0.9, sa*0.6], [ca*0.95 - sa*0.15, 0.5, sa*0.95 + ca*0.15], [Math.cos(a - bend*0.6)*1.3, 0.04, Math.sin(a - bend*0.6)*1.3]], 0.05, 0.01, 10, 6), 0x6a3a44);
    const e = [Math.cos(a + bend)*1.95, 0.06, Math.sin(a + bend)*1.95], d = [Math.cos(a + bend), 0, Math.sin(a + bend)];
    [-1, 0, 1].forEach(k=>{ const m = P(b, CO(0.035, 0.22, 6), 0x1a1214, e[0] + d[0]*0.08 - d[2]*k*0.07, 0.04, e[2] + d[2]*0.08 + d[0]*k*0.07); bsAim(m, [d[0] - d[2]*k*0.4, -0.25, d[2] + d[0]*k*0.4]); });
    glow(R, b, 0.03, 0xff3a2a, p[1][0]*1.06, p[1][1] + 0.1, p[1][2]*1.06);
  }
  // fibres dangling from its underside
  for(let i=0;i<14;i++){ const a = i*2.39996, r = 0.25 + (i % 4)*0.12;
    P(b, K.tube([[Math.cos(a)*r, 0.75, Math.sin(a)*r], [Math.cos(a)*r*1.1 + 0.05, 0.42, Math.sin(a)*r*1.1], [Math.cos(a + 0.3)*r*1.2, 0.08 + (i % 3)*0.08, Math.sin(a + 0.3)*r*1.2]], 0.015 + (i % 3)*0.006, 8, 4), 0x7a4a50); }
  // lesser eyes on stalks, half-lidded, looking everywhere else
  for(let i=0;i<4;i++){
    const a = i/4*PI*2 + PI/4, x = Math.cos(a)*1.3, z = Math.sin(a)*1.3, h = 2.35 + (i % 2)*0.45;
    P(b, K.tube([[x*0.6, 0.6, z*0.6], [x*1.05, 1.4, z*1.05], [x*1.15, h - 0.15, z*1.15]], 0.06, 12, 8), FL);
    const e = group(b, x*1.15, h, z*1.15); e.rotation.y = Math.atan2(x, z) + (i % 2 ? 0.5 : -0.5);
    bsEyeball(R, e, 0.17, 0xffb03a, i + 4);
    P(e, new THREE.SphereGeometry(0.185, 20, 8, 0, PI*2, 0, PI*0.42), FL, 0, 0, 0, -0.35);
    P(e, new THREE.SphereGeometry(0.185, 20, 8, 0, PI*2, PI*0.7, PI*0.3), FL, 0, 0, 0, 0.2);
  }
  halo(R, float, IRIS, 3.4, 0, 0, 1.1, 0.25);
  R.h = 3.4; return finish(R, { w:0.035 });
};

/* ---- floor 5, the Gloom Forest: the Gloom Heart. A heart the size of a
   cart, rotten and still beating, cradled in the ribs of whatever it used
   to be inside, rooted into the forest floor, eyes open in the meat ---- */
const bsHeartShape = (x, y, z)=>{
  // a sphere pulled into a heart: tapered to a leaning apex below, shoulders above
  const k = y < 0 ? 1 + y*0.4 : 1 - y*y*0.08;
  return [x*k + y*y*0.2*(y < 0 ? 1 : 0), y*(y > 0 ? 0.92 : 1.1), z*k*0.86];
};
Models.heart = function(){
  const R = rig("heart"), b = R.body;
  const M1 = 0x6e1a2c, M2 = 0x260812, FAT = 0x8a7a4a, VEIN = 0xff3fb0, BILE = 0x9cff3a, BONE = 0xb0a488;
  // a mound of rot it's rooted in
  P(b, bsPaint(bsBlob(1.3, 1, 0.26, 1, 0.08, 3, 9, 40, 18), 0x1e0e1a, 0x0a0608, 3, 2, (c, x, y, z)=>{ if(bsN(x, y, z, 5, 4) > 0.4) c.lerp(bsC.setHex(0x22341e), 0.6); }), 0xffffff, 0, 0.02, 0);
  // roots, thick near it and knotted, splitting into rootlets
  for(let i=0;i<9;i++){
    const a = i/9*PI*2 + 0.15, w = (i % 2 ? 0.3 : -0.25), c = Math.cos(a), s = Math.sin(a);
    const p = [[c*0.8, 0.35, s*0.8], [c*1.35, 0.15, s*1.35], [Math.cos(a + w*0.5)*1.85, 0.06, Math.sin(a + w*0.5)*1.85], [Math.cos(a + w)*2.35, 0.02, Math.sin(a + w)*2.35]];
    P(b, bsPaint(bsTaper([[c*0.5, 0.45, s*0.5]].concat(p.map(q=> [q[0], Math.min(q[1], 0.12) + 0.02, q[2]])), 0.22, 0.03, 20, 10), 0x3a1430, 0x14060e, 6, i), 0xffffff);
    for(let k=0;k<2;k++){ const q = p[2 + k*0], ang = a + w + (k ? 0.6 : -0.6);
      P(b, K.tube([q, [q[0] + Math.cos(ang)*0.3, 0.02, q[2] + Math.sin(ang)*0.3], [q[0] + Math.cos(ang + 0.3)*0.55, 0.01, q[2] + Math.sin(ang + 0.3)*0.55]], 0.03, 8, 5), 0x24101e); }
    glow(R, b, 0.025, BILE, p[1][0], p[1][1] + 0.12, p[1][2]);
  }
  // ribs of something huge around it, some broken off
  for(let i=0;i<7;i++){
    const a = PI*0.5 + i/6*PI, c = Math.sin(a), s = Math.cos(a), br = i === 1 ? 2 : i === 4 ? 3 : 5;
    const p = [[c*1.45, 0.05, s*1.45], [c*1.68, 0.85, s*1.68], [c*1.6, 1.65, s*1.6], [c*1.3, 2.3, s*1.3], [c*0.95, 2.65, s*0.95]].slice(0, br);
    const t = bsTaper(p, 0.11, 0.06, 18, 10); bsPaint(t, BONE, 0x4a4434, 7, i); P(b, t, 0xffffff);
    const e = p[p.length - 1], q = p[p.length - 2];
    const m = P(b, CO(0.06, 0.16, 8), BONE, e[0], e[1], e[2]); bsAim(m, [e[0] - q[0], e[1] - q[1], e[2] - q[2]]);
  }
  for(let i=0;i<6;i++){ const z = -1.35 - i*0.03, x = (i - 2.5)*0.3; P(b, bsPaint(bsJitter(new THREE.BoxGeometry(0.22, 0.16, 0.26, 3, 3, 3), 0.015, 18, i), BONE, 0x3a3428, 9, i), 0xffffff, x, 0.1, z - Math.abs(x)*0.15, 0, 0.1*i, 0); P(b, CO(0.05, 0.2, 6), BONE, x, 0.25, z - Math.abs(x)*0.15 - 0.05, -0.4); }
  // the heart
  const beat = group(b, 0, 1.38, 0); R.parts.head = beat;
  const H = group(beat); H.scale.setScalar(1.1);
  const hg = new THREE.SphereGeometry(1, 64, 48);
  { const a = hg.attributes.position; for(let i=0;i<a.count;i++){ const q = bsHeartShape(a.getX(i), a.getY(i), a.getZ(i)); a.setXYZ(i, q[0], q[1], q[2]); } hg.computeVertexNormals(); }
  K.sculpt(hg, 0.06, 2.6, 4); K.sculpt(hg, 0.014, 11, 8);
  bsPaint(hg, M1, M2, 3, 2, (c, x, y, z)=>{
    if(y > 0.45 && bsN(x, y, z, 6, 1) > 0.05) c.lerp(bsC.setHex(FAT), 0.7);
    if(Math.abs(bsN(x, y, z, 2.5, 5)) < 0.04) c.lerp(bsC.setHex(0x0a0206), 0.8);
    if(bsN(x, y, z, 4, 7) > 0.55) c.lerp(bsC.setHex(0x3a2a3a), 0.6);
  });
  P(H, hg, 0xffffff, 0, 0, 0, 0, 0, 0.22);
  const onH = (u, v, r)=>{ const d = [Math.cos(v)*Math.sin(u), Math.sin(v), Math.cos(v)*Math.cos(u)], q = bsHeartShape(d[0]*r, d[1]*r, d[2]*r), c = Math.cos(0.22), s = Math.sin(0.22); return [q[0]*c - q[1]*s, q[0]*s + q[1]*c, q[2]]; };
  // vessels down its face: dark ones raised, and veins of glowing rot
  const veinMat = new THREE.MeshBasicMaterial({ color:VEIN, transparent:true });
  for(let i=0;i<9;i++){
    const u0 = -1.4 + i*0.38 + Math.sin(i*3.3)*0.15, pts = [];
    for(let k=0;k<7;k++){ const v = 0.75 - k*0.27, u = u0 + Math.sin(k*1.3 + i)*0.18 + k*0.04*(i % 2 ? 1 : -1); pts.push(onH(u, v, 1.035)); }
    if(i % 3 === 1){ const m = new THREE.Mesh(K.tube(pts, 0.022, 14, 6), veinMat); H.add(m); R.glows.push(m); }
    else P(H, K.tube(pts, 0.03 + (i % 2)*0.01, 14, 6), 0x2a0818);
  }
  for(let i=0;i<5;i++){ const u0 = 2.0 + i*0.45, pts = []; for(let k=0;k<6;k++) pts.push(onH(u0 + Math.sin(k + i)*0.2, 0.6 - k*0.3, 1.035)); const m = new THREE.Mesh(K.tube(pts, 0.02, 12, 6), veinMat); H.add(m); R.glows.push(m); }
  // great vessels torn off at the top, hanging open
  [[[0.25, 0.75, -0.05], [0.35, 1.35, 0.0], [0.05, 1.7, -0.25], [-0.35, 1.55, -0.55], 0.2, 0x7a3a4a],
   [[-0.2, 0.8, 0.15], [-0.32, 1.25, 0.3], [-0.5, 1.4, 0.5], null, 0.16, 0x6a2a50],
   [[0.55, 0.55, -0.35], [0.85, 0.95, -0.55], [0.95, 1.2, -0.5], null, 0.13, 0x4a2a5a]].forEach(([p0, p1, p2, p3, r, col], i)=>{
    const pts = [p0, p1, p2].concat(p3 ? [p3] : []);
    P(H, K.tube(pts, r, 16, 14), col);
    const e = pts[pts.length - 1], q = pts[pts.length - 2], d = [e[0] - q[0], e[1] - q[1], e[2] - q[2]];
    bsAim(P(H, bsRing(r*0.92, r*0.22), 0x4a1a2a, e[0], e[1], e[2]), d, bsFwd);
    bsAim(P(H, CY(r*0.8, r*0.8, 0.02, 14), 0x0a0206, e[0], e[1], e[2]), d);
    [0.3, 0.6].forEach(t=> P(H, bsRing(r*1.02, 0.014), 0x2a0a18, p0[0] + (p1[0] - p0[0])*t*2, p0[1] + (p1[1] - p0[1])*t*2, p0[2] + (p1[2] - p0[2])*t*2, PI/2));
  });
  // eyes open in the meat, lidded, glowing
  [[0.1, 0.25, 0.17], [0.65, -0.05, 0.12], [-0.55, 0.05, 0.13], [0.35, 0.55, 0.09], [-0.15, -0.4, 0.11], [1.6, 0.2, 0.1], [-1.5, 0.35, 0.1], [0.55, -0.55, 0.07]].forEach(([u, v, r], i)=>{
    const p = onH(u, v, 1.0), n = onH(u, v, 1.3); const d = [n[0] - p[0], n[1] - p[1], n[2] - p[2]];
    const g = group(H, p[0], p[1], p[2]); bsAim(g, d, bsFwd);
    P(g, bsRing(r*1.05, r*0.35), 0x3a0c1c, 0, 0, 0.01);
    P(g, S(r, 14, 10), 0xb0a080, 0, 0, -r*0.2);
    P(g, new THREE.SphereGeometry(r*1.1, 16, 8, 0, PI*2, 0, PI*(0.3 + (i % 3)*0.08)), 0x4a1424, 0, 0, -r*0.2, 0.9);
    glow(R, g, r*0.42, ROT.eye, 0, -r*0.05, r*0.72);
    P(g, BX(r*0.12, r*0.6, 0.01), 0x000000, 0, -r*0.05, r*0.95);
  });
  // cordyceps bursting out of it in clumps, and two blue glowcaps
  [[0.4, 0.85, 7], [-0.7, 0.55, 5], [1.2, 0.35, 4], [-1.9, 0.15, 4]].forEach(([u, v, n], ci)=>{
    const p = onH(u, v, 0.98), o = onH(u, v, 1.5), d = [o[0] - p[0], o[1] - p[1], o[2] - p[2]];
    for(let k=0;k<n;k++){
      const sp = (k - (n - 1)/2)*0.2, h = 0.45 + ((k*5 + ci) % 4)*0.17, w = [Math.sin(k*2.1 + ci)*0.25, 0, Math.cos(k*1.7)*0.25];
      const base = [p[0] + sp*0.15, p[1], p[2] + Math.sin(k)*0.08], mid = [base[0] + d[0]*h*0.5 + w[0]*0.5, base[1] + d[1]*h*0.5 + h*0.3, base[2] + d[2]*h*0.5 + w[2]*0.5], tip = [base[0] + d[0]*h + w[0] + sp*0.5, base[1] + d[1]*h + h*0.55, base[2] + d[2]*h + w[2]];
      P(H, bsTaper([base, mid, tip], 0.035, 0.014, 10, 6), 0x8a5a3a);
      const club = new THREE.SphereGeometry(0.045, 10, 8); club.scale(1, 2.6, 1);
      bsAim(P(H, bsPaint(club, 0xc86a2a, 0x3a1a0a, 60, k), 0xffffff, tip[0], tip[1], tip[2]), [tip[0] - mid[0], tip[1] - mid[1], tip[2] - mid[2]]);
      if(k % 2 === 0) glow(R, H, 0.03, ROT.cord, tip[0], tip[1] + 0.08, tip[2]);
    }
  });
  [[0.75, 0.6, -0.55, 0.3], [-0.8, 0.45, -0.45, 0.24]].forEach(([x, y, z, r])=>{ P(H, CY(r*0.22, r*0.3, r*1.2, 10), 0x9ab0c0, x, y, z); P(H, new THREE.SphereGeometry(r, 18, 8, 0, PI*2, 0, PI/2), 0x1a4a8a, x, y + r*0.6, z, 0, 0, 0, 1, 0.55, 1); glow(R, H, r*0.3, 0x6ad8ff, x, y + r*0.62, z); });
  // pustules of bile, weeping
  for(let i=0;i<22;i++){ const u = i*2.39996, v = Math.asin((i + 0.5)/22*1.7 - 0.85), p = onH(u, v, 1.03); glow(R, H, 0.03 + (i % 3)*0.015, i % 4 ? BILE : VEIN, p[0], p[1], p[2]); }
  halo(R, beat, 0xff3fb0, 4.5, 0, 0, 0.6, 0.28);
  halo(R, b, BILE, 2.5, 0, 0.1, 0, 0.15);
  R.h = 3.1; return finish(R, { w:0.035 });
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
 *  Everything here moves group transforms only (no geometry is rebuilt).
 *  Springs keep their state on the rig (R.mo), and work out their own dt
 *  from t when the caller (the gallery, the portrait) doesn't pass one.
 * ================================================================== */
const clamp01 = x=> x < 0 ? 0 : x > 1 ? 1 : x;
const smooth = (a, b, x)=>{ const k = clamp01((x - a)/(b - a)); return k*k*(3 - 2*k); };
/* a damped spring toward a target: s = { x, v }; k stiffness, c damping */
function spring(s, target, k, c, dt){ s.v += ((target - s.x)*k - s.v*c)*dt; s.x += s.v*dt; return s.x; }
Models.spring = spring;
function stepDt(m, t, dt){
  if(dt === undefined){ dt = m.lastT === undefined ? 1/60 : t - m.lastT; }
  m.lastT = t;
  return Math.max(0, Math.min(0.05, dt));
}

/* Zippy's stalk. A tired hunter, not a bouncing wizard: a steady lean into
   the walk that deepens with speed, a dip at every footfall and nothing side
   to side; the coat's skirt and the cloak hang plumb and trail behind with
   their own weight; the free hand swings a little, the gun hand stays on aim.
   o: { speed, fwd, side (his own frame), max, crouch (blink, 0/1), recoil,
   hurt (1 falling to 0), hurtSide, dead (0..1 collapse), reload }.
   Sets m.stepped on the frame a foot comes down. */
Models.stalk = function(R, o, t, dt){
  const m = R.mo || (R.mo = { ph:0, run:0, lean:{ x:0, v:0 }, roll:{ x:0, v:0 }, crouch:{ x:0, v:0 }, skx:{ x:0, v:0 }, skz:{ x:0, v:0 }, cpx:{ x:0, v:0 }, cpz:{ x:0, v:0 } });
  dt = stepDt(m, t, dt);
  const b = R.body, p = R.parts, max = o.max || 6;
  const sp = o.speed || 0, run = Math.min(1, sp/max);
  m.run += (run - m.run)*(1 - Math.exp(-dt*6));
  const fwdN = o.fwd === undefined ? run : Math.max(-1, Math.min(1, o.fwd/max));
  const sideN = o.side === undefined ? 0 : Math.max(-1, Math.min(1, o.side/max));
  // strides: about 2.6 footfalls a second at full speed
  const ph0 = m.ph;
  if(sp > 0.4) m.ph += dt*(1.3 + 1.3*run)*PI;
  m.stepped = sp > 0.8 && Math.floor(m.ph/PI) !== Math.floor(ph0/PI);
  const fall = 1 - Math.abs(Math.sin(m.ph));        // 1 at a footfall, 0 mid-stride
  // blink: drop into a crouch, then snap up out of it (an underdamped spring)
  const cr = spring(m.crouch, o.crouch ? 1 : 0, o.crouch ? 900 : 520, o.crouch ? 60 : 17, dt);
  // the lean: into the walk (a little back when he backs off), and into a strafe
  const lean = spring(m.lean, 0.05 + 0.24*Math.max(0, fwdN) - 0.06*Math.max(0, -fwdN) + 0.06*Math.abs(sideN), 40, 12, dt);
  const roll = spring(m.roll, -0.07*sideN, 40, 12, dt);
  const rec = o.recoil || 0, h = o.hurt || 0, d = o.dead || 0;
  // a stagger: thrown back hard, then catching himself
  const lurch = h > 0 ? Math.sin(Math.min(1, (1 - h)*4)*PI/2)*h : 0;
  // death: a stumble, the knees go, then he folds forward and stays there
  const kneel = smooth(0.12, 0.5, d), slump = smooth(0.4, 1, d), stum = d > 0 ? Math.sin(Math.min(1, d/0.15)*PI)*(1 - kneel) : 0;
  const breathe = Math.sin(t*1.7);
  let pitch = lean + 0.035*fall*m.run + cr*0.38 - rec*0.11 - lurch*0.34 - stum*0.14 + slump*0.5;
  let y = -0.045*fall*m.run + breathe*0.006*(1 - m.run) - cr*0.17 - kneel*0.46 + (kneel > 0.98 ? 0 : Math.sin(kneel*PI)*0.03);
  b.position.set(0, y, -rec*0.07 - lurch*0.09);
  b.rotation.set(pitch, 0, roll + lurch*0.12*(o.hurtSide || 1));
  // the skirt and the cloak hang plumb, trail behind, and swing on with their own weight
  if(p.skirt){
    const sx = spring(m.skx, -pitch*0.75 + 0.2*fwdN + 0.25*cr + 0.03*Math.abs(Math.cos(m.ph))*m.run, 70, 8, dt);
    const sz = spring(m.skz, -roll*0.9 - 0.14*sideN + 0.03*Math.sin(m.ph)*m.run, 70, 8, dt);
    p.skirt.rotation.set(sx, 0, sz);
    p.skirt.scale.set(1 + 0.12*kneel, 1 - 0.42*kneel, 1 + 0.12*kneel);
  }
  if(p.cape){
    const flut = Math.sin(t*6.3)*0.025*(0.2 + m.run) + Math.sin(t*1.3)*0.012;
    if(o.whip){ m.cpx.v += o.whip; }
    const cx = spring(m.cpx, -pitch*0.85 + 0.12 + 0.42*Math.max(0, fwdN) + 0.5*cr + flut - 0.1*slump, 38, 5, dt);
    const cz = spring(m.cpz, -roll - 0.3*sideN + Math.sin(t*1.7)*0.02, 38, 5, dt);
    p.cape.rotation.set(Math.max(-0.1, cx), 0, cz);
  }
  // the gun hand holds the aim against all of it; the free hand swings and hangs
  if(p.armR) p.armR.rotation.x = -1.1 - pitch*(1 - slump) - rec*0.45 + (o.reload ? 0.7 + Math.sin(t*20)*0.1 : 0) + slump*0.95 + lurch*0.25;
  if(p.armL && !o.holding){
    p.armL.rotation.x = -1.0 + 0.5*m.run - pitch*0.6 + Math.sin(m.ph)*0.16*m.run + breathe*0.03 + lurch*-0.5 + slump*1.0 + cr*0.5;
    p.armL.rotation.z = -0.3 - 0.06*m.run - lurch*0.3;
  }
  if(p.head) p.head.rotation.x = -pitch*0.55 + 0.04*fall*m.run - rec*0.08 - lurch*0.3 + kneel*0.15 + slump*0.5;
  if(p.beard) p.beard.rotation.x = -pitch*0.7 - 0.05*m.run + Math.sin(t*2.1)*0.02 - lurch*0.2;
  if(p.tip) p.tip.rotation.set(-0.15*m.run - 0.1*cr, 0, -0.5 + Math.sin(t*1.3)*0.06 + m.skz.x*0.6);
  return m;
};

/* Gribbus' hop, a heavy old toad's: he sinks and loads, the hind legs kick
   out straight behind him, the front legs reach in the air, he lands hard
   on his belly and the legs fold back under. On the ground: a slow throat,
   a blink now and then, and every so often a shift of his whole weight.
   o: { k (0..1 through a hop, < 0 on the ground), lick (0..1) }.
   Sets m.tookOff / m.landed on those frames. */
Models.hop = function(R, o, t, dt){
  const m = R.mo || (R.mo = { air:false, land:9, sq:{ x:0, v:0 }, pitch:{ x:0, v:0 }, blink:0, nextBlink:2 + Math.random()*3, shift:0, shiftT:4 + Math.random()*4, shiftTo:0, roll:{ x:0, v:0 } });
  dt = stepDt(m, t, dt);
  const b = R.body, p = R.parts, k = o.k === undefined ? -1 : o.k, air = k >= 0;
  m.tookOff = air && !m.air; m.landed = !air && m.air; m.air = air;
  if(m.landed){ m.land = 0; m.sq.v -= 9; }
  if(m.tookOff) m.sq.v += 5;
  m.land += dt;
  // squash (< 0) and stretch (> 0): a spring kicked at take-off and landing
  const sq = spring(m.sq, air ? 0.22*Math.sin(Math.min(1, k/0.25)*PI*0.5)*(1 - smooth(0.6, 1, k)) : 0, 260, 13, dt);
  // between hops he sinks and loads up, and lets it go if nothing comes
  const load = air ? 0 : smooth(0.12, 0.35, m.land)*(1 - smooth(1.5, 2.6, m.land));
  // the body's pitch: nose up off the ground, nose down to land
  const pTarget = air ? -0.38*(1 - smooth(0, 0.55, k)) + 0.28*smooth(0.55, 0.95, k) : 0.1*load;
  const pitch = spring(m.pitch, pTarget, 160, 18, dt);
  // the weight shift: now and then he rolls his bulk onto one side and back
  m.shiftT -= dt;
  if(m.shiftT <= 0 && !air){ m.shiftTo = m.shiftTo ? 0 : (Math.random() < 0.5 ? -1 : 1)*(0.06 + Math.random()*0.04); m.shiftT = m.shiftTo ? 0.9 + Math.random()*0.8 : 3 + Math.random()*5; }
  const roll = spring(m.roll, air ? 0 : m.shiftTo, 25, 9, dt);
  const breath = Math.sin(t*1.9);
  b.scale.set(1 - sq*0.45 + breath*0.012, 1 + sq*0.55 - 0.12*load - breath*0.012, 1 + sq*0.9);
  b.rotation.set(pitch, 0, roll);
  b.position.set(roll*0.25, -0.03*load, 0);
  // legs: phase weights through the hop
  const kick = air ? smooth(0, 0.14, k)*(1 - smooth(0.58, 0.88, k)) : 0;      // hind legs out straight behind
  const reach = air ? smooth(0.1, 0.4, k) : 0;                                   // front legs forward in the air
  const catchUp = air ? smooth(0.7, 0.95, k) : 0;                               // and down to take the landing
  const fold = air ? 0 : Math.exp(-m.land*9);                                    // the landing shoves them back under
  if(p.thighs) p.thighs.forEach((g, i)=>{ g.rotation.x = 0.45*kick - 0.15*load + 0.1*fold; g.rotation.z = (i ? 1 : -1)*(0.08*kick - 0.06*load); });
  if(p.hind) p.hind.forEach((g, i)=>{ g.rotation.x = 2.25*kick - 0.25*load + 0.15*fold; g.rotation.z = (i ? 1 : -1)*(0.1*kick - 0.08*load); });
  if(p.feet) p.feet.forEach((g, i)=>{
    // the leg straightens: the foot slides out along the folded leg, the shin comes out of the haunch
    const u = g.userData, ext = 0.18*smooth(0.45, 1, kick);
    if(!u.p0) u.p0 = g.position.clone();
    g.position.set(u.p0.x + (i ? 1 : -1)*0.03*ext, u.p0.y - 0.5*ext, u.p0.z + 0.85*ext);
    g.rotation.x = 0.9*kick - 0.15*load;
  });
  if(p.front) p.front.forEach((g, i)=>{ g.rotation.x = -1.05*reach*(1 - catchUp) - 0.35*catchUp + 0.45*fold + 0.12*load - pitch*0.6; g.rotation.z = (i ? -1 : 1)*0.15*reach; });
  // the head: low and heavy, jerked forward when the tongue goes out
  const lk = o.lick || 0, jerk = lk > 0 ? Math.sin(Math.min(1, lk)*PI) : 0;
  if(p.head){ p.head.rotation.x = -pitch*0.4 + 0.22*jerk + 0.05*load; p.head.position.z = 0.06 + 0.07*jerk; }
  // a slow throat, swelling and letting go
  if(p.throat){ const th = Math.pow(Math.max(0, Math.sin(t*1.25 + 0.4)), 3); p.throat.scale.set(1 + 0.1*th, 1 + 0.32*th, 1 + 0.14*th); }
  // blinks: both lids, quick, every few seconds (and on landing)
  m.nextBlink -= dt; if(m.nextBlink <= 0 || m.landed){ m.blink = 0.16; m.nextBlink = 2.5 + Math.random()*4.5; }
  if(m.blink > 0) m.blink -= dt;
  const shut = m.blink > 0 ? Math.sin((1 - m.blink/0.16)*PI) : 0;
  if(p.lids) p.lids.forEach(g=> g.rotation.x = g.userData.shut*shut);
  return m;
};

/* ---- the bestiary's motion ----
   Every family moves its own way, all of it a little wrong: goblins skitter
   and twitch, brutes lumber and shift their weight, fungus sways and
   shudders, the dead drift and lunge, the skeleton rattles and snaps its
   head round, flesh quivers and writhes, the Gloom scuttles and wheezes.
   Wind-ups are slow and deliberate (drawn back, held, trembling), then let go
   at once. Bosses breathe.
   o: { speed, tell (0..1 through a wind-up, < 0 for none), tellKind, flinch
   (> 0 while hit), act (1 to start an idle fit: a moan, a lurch), stunned,
   hop, swell, pulse, sink (tentacle, under the floor) }.
   Sets m.step (a small footfall), m.stomp (a heavy one) and m.struck (the
   frame a wind-up is let go) for the view to sound. */
const FAMILY = { grunt:"goblin", slinger:"goblin", bomber:"goblin", shaman:"goblin", sneak:"goblin", merchant:"goblin", brute:"brute", king:"king",
  puffling:"puff", toadstool:"stool", shroomkin:"shroom", shroomlet:"shroom", husk:"husk", matriarch:"matriarch",
  ghost:"ghost", banshee:"ghost", bride:"bride", skeleton:"skel", poltergeist:"polt",
  watcher:"watcher", eye:"eye", blob:"blob", blobling:"blob", tentacle:"tent",
  rotling:"crab", spitter:"spitter", bloater:"bloater", heart:"heart" };
Models.FAMILY = FAMILY;
const BOSSES = { king:1, matriarch:1, bride:1, eye:1, heart:1 };
/* the rest pose of everything that moves, kept once so motion is always rest + offset */
function rest(m, o){
  if(!o) return null;
  let r = m.rest.get(o);
  if(!r){ r = { p:o.position.clone(), r:o.rotation.clone(), s:o.scale.clone() }; m.rest.set(o, r); }
  return r;
}
function pose(m, o, px, py, pz, rx, ry, rz, sx, sy, sz){
  if(!o) return;
  const r = rest(m, o);
  o.position.set(r.p.x + (px || 0), r.p.y + (py || 0), r.p.z + (pz || 0));
  o.rotation.set(r.r.x + (rx || 0), r.r.y + (ry || 0), r.r.z + (rz || 0));
  o.scale.set(r.s.x*(sx === undefined ? 1 : sx), r.s.y*(sy === undefined ? 1 : sy), r.s.z*(sz === undefined ? 1 : sz));
}
const snap = x=> Math.sign(x)*Math.pow(Math.abs(x), 0.55);      // a gait that jerks rather than swings
const rnd = (a, b)=> a + Math.random()*(b - a);
/* a twitchy look-around: a new target every so often, reached almost at once */
function glance(m, dt, every, range, k){
  m.gT -= dt;
  if(m.gT <= 0){ m.gT = rnd(every[0], every[1]); m.gY = Math.random() < 0.35 ? 0 : rnd(-range, range); m.gX = rnd(-range, range)*0.35; m.gZ = Math.random() < 0.2 ? rnd(-0.35, 0.35) : 0; }
  spring(m.gy, m.gY, k || 500, 38, dt); spring(m.gx, m.gX, k || 500, 38, dt); spring(m.gz, m.gZ, (k || 500)*0.5, 26, dt);
}
Models.creep = function(R, o, t, dt){
  const m = R.mo || (R.mo = { rest:new Map(), ph:Math.random()*6, run:0, seed:Math.random()*10, strike:0, fl:0, act:0, lastTell:-1,
    gT:0, gY:0, gX:0, gZ:0, gy:{ x:0, v:0 }, gx:{ x:0, v:0 }, gz:{ x:0, v:0 }, fitT:rnd(1.5, 5), fit:0, sway:{ x:0, v:0 }, wob:{ x:0, v:0 } });
  dt = stepDt(m, t, dt);
  const fam = FAMILY[R.kind] || "goblin", boss = !!BOSSES[R.kind], sz = R.size || 1, P = R.parts, b = R.body;
  const sp = o.speed || 0;
  m.run += (Math.min(1, sp/3.5) - m.run)*(1 - Math.exp(-dt*8));
  const s = m.run, sd = m.seed;
  // the wind-up and its release
  const tk = o.tell === undefined ? -1 : o.tell;
  m.struck = false;
  if(m.lastTell >= 0 && tk < 0){ m.strike = 1; m.struck = true; m.strikeKind = m.tellKind; }
  m.lastTell = tk; if(tk >= 0) m.tellKind = o.tellKind;
  m.strike = Math.max(0, m.strike - dt/(boss ? 0.5 : 0.32));
  const wind = tk >= 0 ? smooth(0, 0.75, tk) : 0;
  const shake = tk >= 0 ? smooth(0.35, 1, tk)*Math.sin(t*47 + sd)*(boss ? 0.025 : 0.018) : 0;
  const st = m.strike > 0 ? Math.sin(Math.min(1, (1 - m.strike)*3.5)*PI*0.5)*m.strike : 0;   // out fast, back slow
  // a hit: a jolt back
  if(o.flinch > 0 && !m.wasHit) m.fl = 1;
  m.wasHit = o.flinch > 0; m.fl = Math.max(0, m.fl - dt*5);
  const fl = m.fl*m.fl;
  // fits: now and then something seizes it (a shudder, a lunge, a look); a moan starts one too
  m.fitT -= dt;
  if(o.act || m.fitT <= 0){ m.fit = 1; m.fitT = rnd(2.5, 7); }
  m.fit = Math.max(0, m.fit - dt/0.6);
  const fit = m.fit;
  const breath = Math.sin(t*(boss ? 1.1 : 1.8) + sd);
  // strides
  const ph0 = m.ph;
  const rate = { goblin:4 + 9*s, brute:2 + 3.2*s, king:1.6 + 2.6*s, husk:2 + 3*s, shroom:3 + 5*s, skel:3.5 + 7*s, crab:8 + 14*s, spitter:3 + 5*s, bloater:1.6 + 2.6*s, matriarch:1.4 + 2*s }[fam] || 3 + 5*s;
  if(sp > 0.2) m.ph += dt*rate;
  const stepped = sp > 0.6 && Math.floor(m.ph/PI) !== Math.floor(ph0/PI);
  m.step = stepped && (fam === "goblin" || fam === "skel" || fam === "crab" || fam === "shroom" || fam === "puff" || fam === "spitter");
  m.stomp = stepped && (fam === "brute" || fam === "king" || fam === "husk" || fam === "matriarch" || fam === "bloater");
  const ph = m.ph, fall = 1 - Math.abs(Math.sin(ph));
  // common: the wind-up rears back and rises, the release throws it forward
  let bx = -0.3*wind + 0.42*st - 0.2*fl + shake, by = 0.04*wind*sz, bz = (0.16*st - 0.06*fl)*sz, brz = 0, bry = 0;
  let bsx = 1, bsy = 1, bsz = 1;
  let armUp = -2.3*wind + 1.0*st;
  if((tk >= 0 ? o.tellKind : m.strikeKind) === "charge"){
    // a charge is wound up low: head down, weight forward, a foot pawing the floor
    bx = 0.3*wind + 0.25*st - 0.2*fl + shake; by = -0.06*wind*sz; bz = 0.25*st*sz; armUp = 0.5*wind - 0.3*st;
  }
  if(fam === "goblin"){
    // a hunched lope that hitches, legs snapping, head jerking about
    glance(m, dt, [0.25, 1.4], 0.75);
    by += Math.abs(Math.sin(ph))*0.06*s - 0.015*fall*s + breath*0.005;
    bx += 0.16*s; brz += Math.sin(ph*0.5)*0.025*s;
    if(P.legs) P.legs.forEach((l, i)=> pose(m, l, 0, 0, 0, snap(Math.sin(ph + i*PI))*0.85*s));
    pose(m, R.tor, 0, 0, 0, 0.12*s + 0.04*breath - 0.15*wind + 0.2*st);
    const tw = fit > 0.6 ? Math.sin(t*70)*0.12*(fit - 0.6)/0.4 : 0;
    pose(m, P.head, 0, 0, 0, m.gx.x - 0.12*s + 0.25*wind - 0.3*fl, m.gy.x, m.gz.x + tw);
    pose(m, P.armR, 0, 0, 0, -Math.sin(ph)*0.55*s + Math.sin(t*2.3 + sd)*0.06 + armUp);
    pose(m, P.armL, 0, 0, 0, Math.sin(ph)*0.55*s + Math.sin(t*2.1 + sd)*0.06 - 0.6*wind);
  } else if(fam === "brute" || fam === "king" || fam === "husk"){
    // weight: the whole bulk rolls onto each foot as it comes down
    const kb = fam === "king" ? 1.3 : 1;
    if(fam !== "husk") glance(m, dt, [1.2, 3.5], 0.45, 160);
    by += -0.07*fall*s*sz + breath*0.012*sz*kb + 0.05*wind*sz;
    brz += Math.sin(ph)*0.09*s; bx += 0.08*s;
    bsy *= 1 + breath*0.015*kb; bsx *= 1 - breath*0.008*kb;
    if(P.legs) P.legs.forEach((l, i)=> pose(m, l, 0, 0, 0, Math.sin(ph + i*PI)*0.5*s - 0.25*wind*(i ? 0 : 1)*(1 + Math.sin(t*11))));
    pose(m, R.tor, 0, 0, 0, 0.04*breath*kb - 0.12*wind + 0.18*st);
    pose(m, P.head, 0, 0, 0, (fam === "husk" ? 0 : m.gx.x) + 0.1*s + 0.06*breath - 0.25*fl + 0.15*wind, fam === "husk" ? Math.sin(t*0.6 + sd)*0.25 : m.gy.x, fam === "husk" && fit > 0.5 ? Math.sin(t*50)*0.1*fit : 0);
    pose(m, P.armR, 0, 0, 0, -Math.sin(ph)*0.4*s + armUp*1.05);
    pose(m, P.armL, 0, 0, 0, Math.sin(ph)*0.4*s + (fam === "king" ? armUp*0.8 : -0.4*wind));
    if(fam === "king" && P.crown) pose(m, P.crown, 0, 0, 0, 0, 0, Math.sin(ph)*0.05*s);
  } else if(fam === "shroom" || fam === "matriarch"){
    // swaying on a stalk, shuddering in fits, the cap twitching
    const big = fam === "matriarch";
    const shud = fit > 0 ? Math.sin(t*61 + sd)*0.05*fit : 0;
    brz += Math.sin(t*0.9 + sd)*0.07 + shud; bx += Math.sin(t*0.63 + sd)*0.04 + 0.1*s + shud*0.6;
    by += Math.abs(Math.sin(ph))*0.03*s + breath*(big ? 0.02 : 0.008);
    if(big){ bsy *= 1 + breath*0.02; bsx *= 1 - breath*0.01; }
    if(P.legs) P.legs.forEach((l, i)=> pose(m, l, 0, 0, 0, Math.sin(ph + i*PI)*0.55*s));
    const capT = fit > 0.7 ? Math.sin(t*38)*0.25*(fit - 0.7)/0.3 : 0;
    pose(m, P.head, 0, 0, 0, -0.35*wind + 0.3*st + Math.sin(t*1.3 + sd)*0.05, Math.sin(t*0.5 + sd)*0.15, capT + Math.sin(t*0.8 + sd)*0.06);
    pose(m, P.armR, 0, 0, 0, -Math.sin(ph)*0.4*s + armUp*(big ? 0.7 : 1) + Math.sin(t*1.7 + sd)*0.05);
    pose(m, P.armL, 0, 0, 0, Math.sin(ph)*0.4*s + (big ? armUp*0.7 : -0.3*wind) + Math.sin(t*1.5 + sd)*0.05);
  } else if(fam === "puff" || fam === "stool"){
    // spore things: a slow breath that fills them, a shudder, a lean as they creep
    const shud = fit > 0 ? Math.sin(t*55 + sd)*0.06*fit : 0;
    const inf = 0.06*Math.pow(Math.max(0, breath), 2);
    bsx *= 1 + inf + (o.swell || 0)*0.5; bsy *= 1 + inf*0.6 + (o.swell || 0)*0.3 - 0.12*wind; bsz *= 1 + inf + (o.swell || 0)*0.5;
    brz += Math.sin(t*1.1 + sd)*0.08 + shud; bx += 0.15*s + Math.sin(ph)*0.08*s;
    by += Math.abs(Math.sin(ph))*0.05*s;
    if(fam === "stool") pose(m, P.head, 0, -0.05*wind + 0.06*st, 0, Math.sin(t*0.7 + sd)*0.06, 0, Math.sin(t*0.9 + sd)*0.08 + (fit > 0.6 ? Math.sin(t*40)*0.2*(fit - 0.6) : 0), 1 + 0.15*wind, 1 - 0.25*wind + 0.25*st, 1 + 0.15*wind);
  } else if(fam === "ghost" || fam === "bride" || fam === "polt"){
    // they drift; then, without warning, they lurch at you
    const f = P.head, big = fam === "bride";
    const lunge = fit > 0 ? (fit > 0.85 ? (1 - fit)/0.15 : fit/0.85) : 0;   // out in a blink, back slowly
    const L = lunge*lunge*(big ? 0.35 : 0.3);
    pose(m, f, Math.sin(t*0.53 + sd)*0.06, Math.sin(t*1.05 + sd)*0.1 + 0.25*wind - 0.1*st + breath*(big ? 0.03 : 0), L + 0.4*st - 0.12*wind,
      0.22*s + L*0.8 - 0.35*wind + 0.55*st - 0.3*fl, Math.sin(t*0.37 + sd)*0.15, Math.sin(t*0.7 + sd)*0.08 + (lunge > 0.6 ? Math.sin(t*40)*0.06 : 0));
    bx = shake; by = 0; bz = 0;
    if(big){ pose(m, P.armR, 0, 0, 0, armUp*0.8 + Math.sin(t*0.9 + sd)*0.08); pose(m, P.armL, 0, 0, 0, -1.4*wind + 0.6*st + Math.sin(t*0.8 + sd + 1)*0.08); }
    if(fam === "polt" && P.orbit){
      // the debris won't keep an orbit: it lurches, stalls, tilts, and pulls in before a throw
      const ou = m.orbit || (m.orbit = { a:0 });
      ou.a += dt*(1.2 + 2.6*Math.max(0, Math.sin(t*0.8 + sd)*Math.sin(t*2.3)) + 6*wind + 4*fit);
      const os = 1 - 0.3*wind + 0.4*st;
      pose(m, P.orbit, 0, Math.sin(t*1.7)*0.08, 0, Math.sin(t*0.9 + sd)*0.35, ou.a, Math.cos(t*0.7 + sd)*0.3, os, os, os);
      P.orbit.children.forEach((c, i)=>{ if(c.isGroup) pose(m, c, 0, Math.sin(t*3.1 + i*1.7)*0.09 + (Math.random() < 0.02 ? rnd(-0.08, 0.08) : 0), 0, Math.sin(t*2 + i)*0.3, t*(0.5 + (i % 3)*0.4), 0); });
    }
  } else if(fam === "skel"){
    // bones: a stiff stalk, a constant faint rattle, the skull snapping round
    m.gT -= dt;
    if(m.gT <= 0){ m.gT = rnd(0.7, 2.6); m.gY = Math.random() < 0.4 ? 0 : rnd(-0.9, 0.9); m.gZ = Math.random() < 0.3 ? rnd(-0.45, 0.45) : 0; m.gX = rnd(-0.15, 0.2); }
    const rat = (0.008 + 0.02*s + 0.05*fit)*(Math.random() < 0.5 ? 1 : 0);
    const j = ()=> (Math.random() - 0.5)*rat;
    by += Math.abs(Math.sin(ph))*0.035*s; bx += 0.05*s + j(); brz += j();
    if(P.legs) P.legs.forEach((l, i)=> pose(m, l, 0, 0, 0, snap(Math.sin(ph + i*PI))*0.6*s + j()));
    pose(m, P.head, 0, 0, 0, m.gX + j()*2 - 0.3*fl, m.gY + j()*2, m.gZ + j()*2);
    // the bow arm comes up and holds; the draw hand pulls back
    pose(m, P.armL, 0, 0, 0, -Math.sin(ph)*0.35*s - 1.45*wind + 0.3*st + j(), 0, 0.2*wind);
    pose(m, P.armR, 0, 0, 0, Math.sin(ph)*0.35*s - 1.3*wind + j(), -0.5*wind, 0);
  } else if(fam === "watcher" || fam === "eye"){
    // a pulse like a slow heart; the gaze darts and fixes
    const f = P.head, beat = Math.pow(Math.max(0, Math.sin(t*(fam === "eye" ? 1.6 : 2.2) + sd)), 8), beat2 = Math.pow(Math.max(0, Math.sin(t*(fam === "eye" ? 1.6 : 2.2) + sd - 0.5)), 8);
    const pul = 1 + 0.05*beat + 0.03*beat2 + 0.12*wind;
    glance(m, dt, [0.18, 1.1], 0.6, 900);
    if(fam === "watcher") pose(m, f, 0, Math.sin(t*0.9 + sd)*0.08 + 0.15*wind, 0.2*st, m.gx.x + shake*3, m.gy.x, 0, pul, pul, pul);
    else pose(m, f, 0, Math.sin(t*0.6 + sd)*0.1 + 0.2*wind, 0, 0, 0, 0, pul, pul, pul);
    bx = shake; by = 0; bz = 0;
    m.sacc = m.gy.x*0.35; m.saccX = m.gx.x*0.35;
  } else if(fam === "blob"){
    // jelly: it can't stop quivering
    const q = 0.035*Math.sin(t*13 + sd) + 0.02*Math.sin(t*7.3 + sd*2) + 0.05*fit*Math.sin(t*31) + 0.06*s*Math.sin(ph*2);
    const land = o.hop !== undefined ? o.hop : 0;
    bsx *= 1 + q - land*0.15 + 0.1*wind; bsy *= 1 - q + land*0.3 - 0.2*wind + 0.3*st; bsz *= 1 + q - land*0.15 + 0.1*wind;
    bx = shake; bz = 0.1*st*sz; by = 0;
    if(P.head) pose(m, P.head, Math.sin(t*0.8 + sd)*0.04, Math.sin(t*1.1 + sd)*0.03, Math.cos(t*0.7 + sd)*0.04, Math.sin(t*0.5)*0.4, t*0.3, 0);
    if(P.goo) P.goo.scale.set(1.1 + q*1.4, 0.8 - q*1.4, 1.1 + q*1.4);
  } else if(fam === "tent"){
    // writhing: a wave runs up it, and it coils before it lashes
    if(P.segs) P.segs.forEach((g, i)=>{
      const w = 1 + i*0.18;
      pose(m, g, 0, 0, 0, Math.cos(t*1.7 - i*0.9 + sd)*0.16*w - 0.38*wind + 0.55*st + (fit > 0 ? Math.sin(t*25 + i)*0.08*fit : 0),
        0, Math.sin(t*2.3 - i*0.8 + sd)*0.22*w + Math.sin(t*0.6 + i)*0.08);
    });
    bx = shake; bz = 0;
  } else if(fam === "crab" || fam === "spitter" || fam === "bloater"){
    // the Gloom: rotlings scuttle sideways like crabs; spitters sway on their legs;
    // bloaters drag a wheezing gut that swells and lets go
    if(P.legs) P.legs.forEach((l, i)=>{
      const q = ph + (i % 2)*PI, lift = Math.max(0, Math.sin(q));
      const idle = fam === "crab" ? Math.sin(t*9 + i*2.1)*0.05*(fit + 0.2) : 0;
      pose(m, l, 0, 0, 0, 0, Math.cos(q)*(fam === "crab" ? 0.4 : 0.25)*s, lift*(fam === "crab" ? 0.55 : 0.35)*s + idle);
    });
    if(fam === "crab"){
      glance(m, dt, [0.2, 0.9], 0.5, 700);
      bry = m.gy.x*0.6; brz += Math.sin(ph)*0.06*s; by += Math.abs(Math.sin(ph*2))*0.025*s - 0.05*wind; bx += -0.3*wind + 0.3*st;
      bz += Math.sin(ph*0.5)*0.03*s;
    } else if(fam === "spitter"){
      by += breath*0.01; brz += Math.sin(t*0.8 + sd)*0.05;
      pose(m, P.head, 0, 0, 0, Math.sin(t*1.1 + sd)*0.1 - 0.5*wind + 0.6*st, Math.sin(t*0.6 + sd)*0.25, 0, 1 + 0.25*wind - 0.2*st, 1 + 0.25*wind - 0.2*st, 1 + 0.25*wind - 0.2*st);
    } else {
      // breath in (slow), a shaking catch at the top, out (quick)
      const c = ((t*0.42 + sd) % 1), inh = c < 0.7 ? smooth(0, 0.7, c) : 1 - smooth(0.7, 0.85, c);
      const catchJ = c > 0.62 && c < 0.72 ? Math.sin(t*60)*0.02 : 0;
      const g = 1 + 0.08*inh + catchJ + 0.12*wind + (o.swell || 0)*0.4;
      pose(m, P.head, 0, -0.03*fall*s, 0, 0.05*s, 0, Math.sin(ph)*0.06*s, g, 1 + 0.06*inh + catchJ + 0.1*wind, g);
      by += -0.03*fall*s; brz += Math.sin(ph)*0.05*s;
      m.wheeze = c > 0.62 && c < 0.64;
    }
  } else if(fam === "heart"){
    const g = 1 + 0.03*breath + 0.15*(o.pulse || 0) + 0.08*wind - 0.1*st;
    pose(m, P.head, 0, 0.05*breath, 0, 0, 0, 0, g, g*(1 + 0.03*Math.sin(t*2.3)), g);
    bx = shake; by = 0; bz = 0;
  }
  // stunned: it sags and wavers
  if(o.stunned){ bx += 0.15; brz += Math.sin(t*2.5 + sd)*0.08; }
  if(o.hop) by += o.hop;
  if(o.sink !== undefined) by += o.sink;
  pose(m, b, 0, by, bz, bx, bry, brz, bsx, bsy, bsz);
  if(P.tip) P.tip.rotation.z = -0.5 + Math.sin(t*3)*0.15 + s*0.1;
  if(P.gem) P.gem.scale.setScalar(1 + 0.3*Math.sin(t*6));
  return m;
};

Models.idle = function(R, t, speed){
  if(R.kind === "zippy"){ Models.stalk(R, { speed }, t); return; }
  if(R.kind === "frog"){ Models.hop(R, {}, t); return; }
  Models.creep(R, { speed }, t);
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
/* Loot is old and worn: tarnished coins, blood in a flask, a pale soul,
   a cracked rune-stone, a gilded fly. Each piece is merged once into a
   vertex-coloured geometry and shared; a little self-glow (and the light
   it gives off) keeps it findable in the dark. */
const lootMats = {};
const lootMat = em=> lootMats[em] || (lootMats[em] = K.ink({ emissive:em }));
const lootGlass = (c, op)=> new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:op, depthWrite:false });
/* a worn old coin: a crowned skull struck on one face, a cross on the other */
const coinGeo = ()=> bsPrefab("coin", g=>{
  const c = new THREE.CylinderGeometry(0.12, 0.118, 0.024, 26, 1); c.rotateX(PI/2);
  K.sculpt(c, 0.004, 40, 3);
  bsPaint(c, 0xa8823a, 0x4a3612, 26, 2, (k, x, y, z)=>{ const r = Math.hypot(x, y); if(r > 0.1) k.multiplyScalar(0.75); });
  P(g, c, 0xffffff);
  [-1, 1].forEach(s=> P(g, geo("bs-coinrim", ()=> new THREE.TorusGeometry(0.108, 0.008, 4, 26)), 0x7a5a24, 0, 0, s*0.012));
  P(g, S(0.034, 10, 8), 0xb8923e, 0, 0.0, 0.012, 0, 0, 0, 1, 1.1, 0.35);
  [-1, 1].forEach(s=> P(g, S(0.009, 6, 4), 0x2a1a08, s*0.013, 0.005, 0.022));
  for(let i=0;i<3;i++) P(g, CO(0.008, 0.024, 4), 0xb8923e, (i - 1)*0.018, 0.043, 0.014);
  P(g, BX(0.014, 0.07, 0.006), 0x8a6a2a, 0, 0, -0.014); P(g, BX(0.05, 0.014, 0.006), 0x8a6a2a, 0, 0.01, -0.014);
});
/* a flask of blood, corked and sealed; the blood glows */
const vialProf = [[0, -0.17], [0.09, -0.165], [0.135, -0.1], [0.14, -0.02], [0.11, 0.06], [0.05, 0.11], [0.038, 0.14], [0.038, 0.22], [0.048, 0.235], [0.0, 0.24]];
function bloodVial(g, k, R){
  const s = new THREE.Group(); s.scale.setScalar(k); g.add(s);
  const liquid = new THREE.Mesh(geo("vial-blood", ()=> K.lathe([[0, -0.155], [0.08, -0.15], [0.122, -0.09], [0.127, -0.02], [0.1, 0.04], [0.0, 0.045]], 16)), K.basic(0x9a0c14));
  s.add(liquid);
  const surf = new THREE.Mesh(geo("vial-surf", ()=> new THREE.CircleGeometry(0.1, 20).rotateX(-PI/2)), K.basic(0xe0281c)); surf.position.y = 0.045; s.add(surf);
  const glass = new THREE.Mesh(geo("vial-glass", ()=> K.lathe(vialProf, 18)), lootGlass(0xa89890, 0.12)); s.add(glass);
  const fit = new THREE.Mesh(bsPrefab("vial-fit", q=>{
    P(q, CY(0.034, 0.03, 0.07, 12), 0x5a3a22, 0, 0.255, 0);
    P(q, CY(0.05, 0.05, 0.02, 14), 0x5a4420, 0, 0.215, 0);
    P(q, geo("bs-vialcord", ()=> new THREE.TorusGeometry(0.045, 0.008, 5, 16)), 0x3a2a1a, 0, 0.17, 0, PI/2);
    P(q, CY(0.03, 0.04, 0.02, 10), 0x6a1010, 0, 0.29, 0);
    [0.4, 2.2, 4.1].forEach((a, i)=> P(q, CY(0.007, 0.01, 0.06 + i*0.02, 6), 0x5a0c0c, Math.cos(a)*0.035, 0.26 - i*0.01, Math.sin(a)*0.035));
    P(q, K.tube([[0.04, 0.17, 0.02], [0.08, 0.1, 0.07], [0.1, 0.0, 0.06]], 0.006, 6, 4), 0x3a2a1a);
    P(q, BX(0.06, 0.08, 0.008), 0xa8987a, 0.1, -0.03, 0.06, 0, 0.6, 0.1);
  }), lootMat(0x140a06));
  s.add(fit);
  const h = K.sprite(0xff2a1a, 0.9*k, 0.55); h.position.y = -0.05*k; g.add(h);
  if(R) R.glows.push(liquid, surf, glass, h);
  return s;
}
/* the ward rune (algiz, the elk-sedge: protection), with a crack through the stone */
const runeTex = (()=>{ let t; return ()=> t || (t = (()=>{
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 96; const g = cv.getContext("2d");
  g.strokeStyle = "#fff"; g.lineCap = "round"; g.shadowColor = "#fff"; g.shadowBlur = 6;
  g.lineWidth = 6; g.beginPath(); g.moveTo(32, 86); g.lineTo(32, 12); g.moveTo(32, 46); g.lineTo(12, 18); g.moveTo(32, 46); g.lineTo(52, 18); g.stroke();
  g.lineWidth = 2; g.shadowBlur = 3; g.beginPath(); g.moveTo(50, 4); g.lineTo(44, 22); g.lineTo(48, 34); g.lineTo(38, 52); g.lineTo(42, 66); g.lineTo(34, 92); g.stroke();
  return new THREE.CanvasTexture(cv); })()); })();
const runeStoneGeo = ()=> bsPrefab("runestone", g=>{
  const st = new THREE.BoxGeometry(0.24, 0.32, 0.075, 5, 7, 2);
  const a = st.attributes.position; for(let i=0;i<a.count;i++){ const y = a.getY(i); a.setX(i, a.getX(i)*(1 - Math.max(0, y)*0.9)); }
  bsJitter(st, 0.012, 14, 5);
  bsPaint(st, 0x5e5e64, 0x22222a, 12, 3, (c, x, y, z)=>{ if(y < -0.08 && bsN(x, y, z, 20, 1) > 0.2) c.lerp(bsC.setHex(0x3a5a3a), 0.6); });
  P(g, st, 0xffffff);
});
function runeStone(g, R, k){
  const s = new THREE.Group(); s.scale.setScalar(k || 1); g.add(s);
  s.add(new THREE.Mesh(runeStoneGeo(), lootMat(0x0a1218)));
  const mat = new THREE.MeshBasicMaterial({ map:runeTex(), color:0x8ad8ff, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false });
  [1, -1].forEach(sd=>{ const r = new THREE.Mesh(geo("rune-plane", ()=> new THREE.PlaneGeometry(0.17, 0.25)), mat); r.position.z = sd*0.045; if(sd < 0) r.rotation.y = PI; s.add(r); if(R) R.glows.push(r); });
  const h = K.sprite(0x8ad8ff, 0.8*(k || 1), 0.35); s.add(h); if(R) R.glows.push(h);
  return s;
}
/* a pale soul: a flame of cold light with two dark eyes in it */
function soulWisp(g){
  const flame = geo("wisp-flame", ()=> K.lathe([[0, -0.1], [0.075, -0.07], [0.09, 0.0], [0.065, 0.08], [0.025, 0.17], [0, 0.26]], 14));
  const outer = new THREE.Mesh(flame, new THREE.MeshBasicMaterial({ color:0x2a6aa8, transparent:true, opacity:0.5, blending:THREE.AdditiveBlending, depthWrite:false })); outer.scale.setScalar(1.5); outer.position.y = -0.03; g.add(outer);
  const mid = new THREE.Mesh(flame, new THREE.MeshBasicMaterial({ color:0x8ad8ff, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false })); g.add(mid);
  const core = new THREE.Mesh(S(0.055, 10, 8), K.basic(0xe8f6ff)); core.position.y = -0.01; g.add(core);
  [-1, 1].forEach(s=>{ const e = new THREE.Mesh(S(0.014, 6, 4), K.basic(0x0a1622)); e.position.set(s*0.026, 0.02, 0.06); e.scale.set(1, 1.5, 0.6); g.add(e); });
  [[0.05, -0.16, 0.02, 0.025], [-0.03, -0.24, -0.02, 0.018], [0.01, -0.31, 0.03, 0.012]].forEach(([x, y, z, r])=>{ const m = new THREE.Mesh(S(r, 6, 4), new THREE.MeshBasicMaterial({ color:0x8ad8ff, transparent:true, opacity:0.6, blending:THREE.AdditiveBlending, depthWrite:false })); m.position.set(x, y, z); g.add(m); });
  g.add(K.sprite(0x6ab8ff, 1.0, 0.45));
}
/* a fly gone to gold: tarnished gilt, red eyes, veined wings */
const flyGeo = ()=> bsPrefab("goldfly", g=>{
  const GL = 0xc89a3a, GD = 0x5a3a12;
  P(g, bsPaint(new THREE.SphereGeometry(0.065, 16, 12), GL, GD, 40, 1), 0xffffff, 0, 0, 0, 0, 0, 0, 1, 0.9, 1.1);
  const ab = new THREE.SphereGeometry(0.075, 18, 12); bsPaint(ab, GL, GD, 30, 2, (c, x, y, z)=>{ if(Math.sin(z*90) > 0.4) c.multiplyScalar(0.45); });
  P(g, ab, 0xffffff, 0, -0.01, -0.11, -0.2, 0, 0, 0.85, 0.75, 1.5);
  P(g, S(0.045, 12, 10), GL, 0, 0.005, 0.08);
  for(let i=0;i<3;i++) [-1, 1].forEach(s=> P(g, K.tube([[s*0.04, -0.03, 0.04 - i*0.05], [s*0.1, -0.05, 0.05 - i*0.06], [s*0.12, -0.13, 0.07 - i*0.08]], 0.006, 6, 4), 0x2a1a08));
  P(g, CO(0.008, 0.05, 4), 0x2a1a08, 0, -0.03, 0.12, PI/2 + 0.6);
});
const wingGeo = geo("fly-wing", ()=>{ const w = new THREE.CircleGeometry(0.1, 14); w.scale(0.6, 1.5, 1); w.translate(0, 0.13, 0); return w; });
const wingTex = (()=>{ let t; return ()=> t || (t = (()=>{
  const cv = document.createElement("canvas"); cv.width = cv.height = 32; const g = cv.getContext("2d");
  g.fillStyle = "rgba(220,200,140,0.35)"; g.fillRect(0, 0, 32, 32); g.strokeStyle = "rgba(60,40,10,0.9)"; g.lineWidth = 1;
  [[16, 32, 6, 0], [16, 32, 16, 0], [16, 32, 26, 0], [16, 32, 2, 12], [16, 32, 30, 12]].forEach(([a, b, c, d])=>{ g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); });
  g.beginPath(); g.moveTo(4, 14); g.lineTo(28, 10); g.stroke();
  return new THREE.CanvasTexture(cv); })()); })();

Models.pickup = function(pk){
  const g = new THREE.Group();
  if(pk.kind === "gold"){
    const m = lootMat(0x2a1a04), c = coinGeo();
    if(pk.value >= 5){ [[0, -0.05, 0, PI/2 - 0.1, 0, 0], [0.04, -0.02, 0.02, PI/2 + 0.15, 0.6, 0], [-0.02, 0.02, -0.03, PI/2 - 0.2, 1.4, 0.1], [0.0, 0.08, 0.04, 0, 0.3, 0.2]].forEach(([x, y, z, rx, ry, rz])=>{ const o = new THREE.Mesh(c, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(1.25); g.add(o); }); }
    else g.add(new THREE.Mesh(c, m));
    const h = K.sprite(0xd8a040, 0.55, 0.22); g.add(h);
    g.userData.spin = 4; g.userData.hover = 0.3;
  } else if(pk.kind === "heart" || pk.kind === "flyheal"){
    const k = pk.kind === "flyheal" ? 0.55 : 1;
    bloodVial(g, k);
    if(pk.kind === "flyheal") g.add(K.sprite(0xff5a4a, 0.6, 0.5));
    g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "mana"){
    soulWisp(g); g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "ward"){
    runeStone(g, null, 1.35); g.userData.spin = 3; g.userData.hover = 0.5;
  } else if(pk.kind === "key"){
    // an old iron key, rust at the teeth, a faint warm glint so it reads on the floor
    const kg = new THREE.Group(); g.add(kg);
    P(kg, TO(0.09, 0.025), 0x5a5048, 0, 0.12, 0);
    P(kg, CY(0.022, 0.022, 0.28, 8), 0x5a5048, 0, -0.06, 0);
    P(kg, BX(0.08, 0.035, 0.03), 0x6a3a22, 0.04, -0.15, 0); P(kg, BX(0.06, 0.035, 0.03), 0x6a3a22, 0.03, -0.09, 0);
    K.bake(kg, { w:0.01 }); kg.rotation.z = 0.5;
    g.add(K.sprite(0xd8a060, 0.6, 0.3)); g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "fly"){
    g.add(new THREE.Mesh(flyGeo(), lootMat(0x3a2606)));
    [-1, 1].forEach(s=>{ const w = new THREE.Mesh(wingGeo, new THREE.MeshBasicMaterial({ map:wingTex(), color:0xe8d8a0, transparent:true, opacity:0.75, side:THREE.DoubleSide, depthWrite:false })); w.position.set(s*0.03, 0.05, -0.02); w.rotation.set(-1.1, s*0.5, -s*0.9); g.add(w); });
    [-1, 1].forEach(s=>{ const e = new THREE.Mesh(S(0.022, 8, 6), K.basic(0xff2a1a)); e.position.set(s*0.035, 0.015, 0.105); g.add(e); });
    g.add(K.sprite(0xc8a040, 1.0, 0.45)); g.add(K.sprite(0xff3a1a, 0.25, 0.6));
    g.userData.spin = 6; g.userData.hover = 0.8; g.userData.buzz = true;
  } else if(pk.kind === "item"){
    g.add(Models.item(pk.item));
    const col = pk.item.kind === "gun" ? DG.RARITY[pk.item.rarity].color : pk.item.kind === "item" ? DG.TIERS[DG.ITEMS[pk.item.id].tier].color : "#ffd23d";
    g.add(beam(col));
    if(DG.Icons){ const ic = Models.iconSprite(DG.Icons.keyFor(pk.item), 0.8); ic.position.y = 0.95; g.add(ic); }
    g.userData.spin = 1.2; g.userData.hover = 0.6;
  }
  return g;
};
/* a shaft of dusty light over something worth having */
function beam(col){
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.26, 3, 12, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.13, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
  b.position.y = 1.2; g.add(b);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.1, 3, 8, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.18, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
  inner.position.y = 1.2; g.add(inner);
  const pool = new THREE.Mesh(K.glowPlane, K.glowMat(new THREE.Color(col), 0.38)); pool.scale.set(1.5, 1, 1.5); pool.position.y = -0.55; g.add(pool);
  return g;
}
Models.beam = beam;

/* a powerup's token: its look comes from what kind of thing it is. Each one
   hangs in a little reliquary frame, a ring of tarnished gilt with thorns */
const ELC = el=> DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
const RELIC = 0xa8803a, RELIC2 = 0x5a4220;
function reliquary(root, tierHex){
  // a little monstrance stand under the token: a crown of thorns on a gilt stem
  P(root, geo("relic-ring", ()=> new THREE.TorusGeometry(0.17, 0.016, 5, 36)), RELIC, 0, -0.27, 0, PI/2);
  for(let i=0;i<10;i++){ const a = i/10*PI*2, l = i % 2 ? 0.07 : 0.12; P(root, CO(0.013, l, 4), i % 2 ? RELIC2 : RELIC, Math.cos(a)*0.17, -0.27 + l*0.35, Math.sin(a)*0.17, Math.sin(a)*0.5, 0, -Math.cos(a)*0.5); }
  P(root, CY(0.018, 0.026, 0.16, 8), RELIC2, 0, -0.35, 0);
  P(root, CY(0.07, 0.09, 0.03, 12), RELIC, 0, -0.44, 0);
  P(root, S(0.02, 8, 6), tierHex, 0, -0.27, 0);
}
Models.powerup = function(id){
  const d = DG.ITEMS[id], g = new THREE.Group(), tierCol = new THREE.Color(DG.TIERS[d.tier].color);
  const R = rig("token");
  const cat = d.tier === 4 ? "godly" : d.els ? "element" : d.on ? "trigger" : d.shot ? "shot" : d.special ? "artifact" : "potion";
  const root = group(g, 0, 0, 0);
  if(cat === "potion"){
    // an apothecary's bottle, dark glass, the draught inside glowing through it
    const liq = [0xd8303a, 0x3a88d8, 0x6ad830, 0xd8a830, 0x9a58d8][id.length % 5];
    P(root, K.lathe([[0, -0.2], [0.15, -0.19], [0.17, -0.06], [0.12, 0.05], [0.05, 0.1], [0.05, 0.19], [0.062, 0.21], [0, 0.21]], 16), 0x2a3432);
    const l = glow(R, root, 0.13, liq, 0, -0.08, 0); l.scale.set(1.02, 0.75, 1.02); l.material.opacity = 0.9;
    P(root, CY(0.045, 0.04, 0.07, 10), 0x5a3a22, 0, 0.24, 0);
    P(root, CY(0.05, 0.055, 0.025, 10), 0x6a1010, 0, 0.27, 0);
    P(root, BX(0.18, 0.09, 0.01), 0xa89a78, 0, -0.07, 0.16, -0.08);
    P(root, BX(0.12, 0.012, 0.012), 0x3a2a1a, 0, -0.06, 0.166, -0.08);
    halo(R, root, liq, 0.9, 0, -0.08, 0, 0.45);
  } else if(cat === "shot"){
    // a cartridge: tarnished brass, a lead nose, the tier's colour in its band
    P(root, CY(0.085, 0.085, 0.24, 16), 0xb08a40, 0, -0.06, 0);
    P(root, CY(0.095, 0.095, 0.03, 16), 0x6a5024, 0, -0.18, 0);
    P(root, K.lathe([[0.085, 0], [0.08, 0.06], [0.055, 0.14], [0.02, 0.19], [0, 0.2]], 14), 0x6a6a72, 0, 0.06, 0);
    P(root, CY(0.088, 0.088, 0.035, 16), tierCol.getHex(), 0, -0.1, 0);
    P(root, BX(0.01, 0.12, 0.004), 0x3a2a14, 0, -0.04, 0.086);
  } else if(cat === "element"){
    // a shard of the element, set in an iron claw
    const c = ELC(d.els[0]);
    P(root, OC(0.17), c, 0, 0.03, 0, 0, 0, 0, 0.7, 1.5, 0.7);
    [[0.11, -0.1, 0.03, 0.5], [-0.1, -0.11, -0.03, -0.5], [0.02, -0.12, -0.1, 0.2]].forEach(([x, y, z, r])=> P(root, OC(0.07), c, x, y, z, 0, r, r, 0.6, 1.4, 0.6));
    for(let i=0;i<3;i++){ const a = i/3*PI*2; P(root, K.tube([[0, -0.22, 0], [Math.cos(a)*0.08, -0.17, Math.sin(a)*0.08], [Math.cos(a)*0.1, -0.05, Math.sin(a)*0.1], [Math.cos(a)*0.06, 0.04, Math.sin(a)*0.06]], 0.012, 8, 5), 0x2a2a30); }
    P(root, S(0.04, 8, 6), 0x2a2a30, 0, -0.22, 0);
    glow(R, root, 0.05, c, 0, 0.03, 0);
    halo(R, root, c, 1.1, 0, 0, 0, 0.55);
  } else if(cat === "trigger"){
    // a slate tablet with its sign cut in, the cut glowing in the tier's colour
    P(root, bsJitter(new THREE.BoxGeometry(0.32, 0.4, 0.08, 4, 5, 2), 0.01, 16, id.length), 0x3a3a40);
    // its sign: the item's own medallion, cut into the slate
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.27, 0.27), DG.Icons ? new THREE.MeshBasicMaterial({ map:iconTex(id), transparent:true, color:0xb8b8b8 })
      : new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 40, { size:28, bg:"#16161c", fg:DG.TIERS[d.tier].color }) }));
    glyph.position.z = 0.052; root.add(glyph); R.glows.push(glyph);
    const back = glyph.clone(); back.rotation.y = PI; back.position.z = -0.052; root.add(back);
  } else if(cat === "artifact"){
    // a relic: a stone of the tier's colour caged in iron bands
    P(root, new THREE.DodecahedronGeometry(0.15), tierCol.getHex());
    P(root, geo("relic-cage", ()=> new THREE.TorusGeometry(0.165, 0.014, 5, 28)), 0x2a2a30, 0, 0, 0, PI/2);
    P(root, geo("relic-cage", ()=> new THREE.TorusGeometry(0.165, 0.014, 5, 28)), 0x2a2a30, 0, 0, 0, 0, PI/2);
    P(root, geo("relic-loop", ()=> new THREE.TorusGeometry(0.04, 0.01, 5, 14)), 0x2a2a30, 0, 0.2, 0);
    halo(R, root, tierCol.getHex(), 0.8, 0, 0, 0, 0.4);
  } else {
    // godly: a black sun, thorned, burning
    glow(R, root, 0.15, 0xfff27a);
    P(root, geo("relic-sun", ()=> new THREE.TorusGeometry(0.17, 0.025, 6, 30)), 0x3a2a10);
    for(let i=0;i<12;i++){ const a = i/12*PI*2, l = i % 2 ? 0.13 : 0.22; P(root, CO(0.03, l, 6), i % 2 ? 0x3a2a10 : 0x8a6a30, Math.cos(a)*(0.19 + l/2), Math.sin(a)*(0.19 + l/2), 0, 0, 0, a - PI/2); }
    halo(R, root, 0xfff27a, 2.0, 0, 0, 0, 0.75);
  }
  if(cat !== "godly") reliquary(root, tierCol.getHex());
  halo(R, root, tierCol.getHex(), 0.9, 0, 0, 0, 0.3);
  finish(R, { w:0.015 });
  return g;
};
Models.item = function(it){
  if(it.kind === "item") return Models.powerup(it.id);
  if(it.kind === "quest"){
    // the Ember: a coal in an iron cage that will not go out; the Crown: reeds and river-gold
    const g2 = new THREE.Group(), R = rig("quest");
    if(it.id === "ember"){
      for(let i=0;i<6;i++){ const a = i/6*PI*2; P(g2, BX(0.02, 0.36, 0.02), 0x2a2a30, Math.cos(a)*0.12, 0, Math.sin(a)*0.12); }
      P(g2, TO(0.13, 0.02), 0x3a3a40, 0, 0.18, 0, PI/2); P(g2, TO(0.13, 0.02), 0x3a3a40, 0, -0.18, 0, PI/2);
      K.bake(g2, { w:0.01 });
      const c = glow(R, g2, 0.08, 0xff8a2a); c.scale.set(1, 1.3, 1); glow(R, g2, 0.045, 0xfff0b0);
      halo(R, g2, 0xff7a2a, 1.4, 0, 0, 0, 0.7);
    } else {
      P(g2, CY(0.15, 0.17, 0.08, 16), 0x8a7a2a, 0, 0, 0);
      for(let i=0;i<7;i++){ const a = i/7*PI*2; P(g2, CO(0.025, 0.18 + (i % 2)*0.08, 5), 0x4a7a3a, Math.cos(a)*0.15, 0.1, Math.sin(a)*0.15, 0, 0, 0); }
      K.bake(g2, { w:0.01 });
      halo(R, g2, 0x9cff6a, 1.1, 0, 0.05, 0, 0.5);
    }
    g2.scale.setScalar(1.4); g2.userData.rig = R; return g2;
  }
  if(it.kind === "key"){ const k = Models.pickup({ kind:"key" }); k.scale.setScalar(1.6); return k; }
  const g = new THREE.Group();
  if(it.kind === "gun"){
    const R = rig("gun"), gg = Models.gun(it.base, it.element, R);
    K.bake(gg, { w:0.015 }); gg.scale.setScalar(1.5); gg.rotation.y = PI/2; g.add(gg);
  } else if(it.kind === "active"){
    // a reliquary lantern: blackened iron, an ember kept alive inside
    const R = rig("active"), root = group(g, 0, 0, 0);
    P(root, CY(0.12, 0.14, 0.04, 14), 0x26262a, 0, -0.17, 0);
    P(root, CY(0.1, 0.12, 0.04, 14), 0x26262a, 0, 0.15, 0);
    P(root, CO(0.11, 0.1, 14), 0x26262a, 0, 0.22, 0);
    P(root, geo("relic-loop", ()=> new THREE.TorusGeometry(0.04, 0.01, 5, 14)), 0x3a3a40, 0, 0.3, 0);
    for(let i=0;i<4;i++){ const a = i/4*PI*2 + PI/4; P(root, BX(0.02, 0.3, 0.02), 0x3a3a40, Math.cos(a)*0.1, 0, Math.sin(a)*0.1); }
    const e = glow(R, root, 0.06, 0xff7a2a, 0, -0.02, 0); e.scale.set(1, 1.5, 1);
    glow(R, root, 0.03, 0xffd080, 0, -0.04, 0);
    halo(R, root, 0xff8a3a, 0.8, 0, 0, 0, 0.55);
    finish(R, { w:0.015 });
  } else if(it.kind === "heal") bloodVial(g, 1.25);
  else if(it.kind === "ward") runeStone(g, null, 1.2);
  return g;
};
/* What it is, from across the room: the thing's medallion (DG.Icons) on a
   sprite that always faces the camera, unlit so it reads in the dark, a
   soft glow of its tier behind it. Kept a shade under white so the bloom
   only kisses it. The textures are shared per key. */
const iconTexs = {};
const iconTex = key=>{
  if(iconTexs[key]) return iconTexs[key];
  const t = new THREE.CanvasTexture(DG.Icons.canvas(key, 256));
  t.anisotropy = 4;
  return (iconTexs[key] = t);
};
Models.iconSprite = function(key, size){
  const g = new THREE.Group(), col = new THREE.Color(DG.Icons.color(key)), tier = DG.Icons.tier(key);
  size = size || 1;
  const glowS = K.sprite(col.getHex(), size*(1.9 + Math.max(0, tier)*0.18), 0.16 + Math.max(0, tier)*0.05);
  glowS.material.fog = false; glowS.renderOrder = 7; g.add(glowS);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:iconTex(key), color:0xd2d2d2, transparent:true, depthWrite:false, fog:false }));
  sp.scale.set(size, size, 1); sp.renderOrder = 8; g.add(sp);
  g.userData.sprite = sp; g.userData.glow = glowS; g.userData.glow0 = glowS.material.opacity;
  return g;
};
/* a thin pillar of light in the tier's colour: faint for commons, a shaft for the godly */
function pillar(col, tier){
  const g = new THREE.Group(), k = 0.6 + Math.max(0, tier)*0.25;
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.3, 3.4, 14, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.07*k, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }));
  b.position.y = 1.7; g.add(b);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.11, 3.4, 8, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.11*k, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide, fog:false }));
  inner.position.y = 1.7; g.add(inner);
  const pool = new THREE.Mesh(K.glowPlane, K.glowMat(col, 0.22*k)); pool.scale.set(1.3, 1, 1.3); g.add(pool);
  return g;
}
/* on a pedestal: the token, a little larger than in the hand, three candles
   drifting round it, a pillar of light, and its medallion hanging above */
Models.offer = function(o){
  const g = new THREE.Group();
  const tok = o.kind === "item" ? Models.powerup(o.id) : o.kind === "gun" ? Models.item(o.gun) : Models.item({ kind:o.kind });
  tok.scale.setScalar(1.3); tok.position.y = 0.16; g.add(tok);
  const R = rig("offer"), ring = group(g, 0, 0, 0);
  for(let i=0;i<3;i++){ const a = i/3*PI*2 + 0.5; bsCandle(R, ring, Math.cos(a)*0.42, -0.42 + (i % 2)*0.05, Math.sin(a)*0.42, 0.12 + (i % 3)*0.04, 0.9); }
  K.bake(ring, { w:0.015 });
  if(DG.Icons){
    const key = DG.Icons.keyFor(o), col = new THREE.Color(DG.Icons.color(key)), tier = DG.Icons.tier(key);
    const beamG = pillar(col.getHex(), tier); beamG.position.y = -0.4; g.add(beamG);
    const ic = Models.iconSprite(key, 1.2); ic.position.y = 1.3; g.add(ic);
    g.userData.icon = ic; g.userData.iconY = 1.3; g.userData.token = tok;
  }
  return g;
};

/* a Gribbus buff on a lily pad: a mossy bronze token with its letter */
Models.frogBuffIcon = function(id){
  const d = DG.FROG_BUFFS[id], g = new THREE.Group(), R = rig("fb"), root = group(g, 0, 0, 0);
  P(root, bsPaint(K.sculpt(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 28, 1).rotateX(PI/2), 0.006, 20, 2), 0x3a5228, 0x16220e, 14, 1), 0xffffff);
  P(root, geo("fb-rim", ()=> new THREE.TorusGeometry(0.22, 0.026, 6, 32)), 0x6a5a2a);
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(root, S(0.014, 6, 4), 0x8a7a3a, Math.cos(a)*0.22, Math.sin(a)*0.22, 0.025); }
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.2, 24), DG.Icons ? new THREE.MeshBasicMaterial({ map:iconTex("frog:" + id), transparent:true, color:0xc8c8c8 })
    : new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 32, { size:24, bg:"#1a2e14", fg:"#d8f0a8" }) }));
  face.position.z = 0.035; root.add(face);
  const back = face.clone(); back.rotation.y = PI; back.position.z = -0.035; root.add(back);
  halo(R, root, 0x9cff6a, 1, 0, 0, 0, 0.35);
  if(d.locked) halo(R, root, 0xffd23d, 1.4, 0, 0, 0, 0.45);
  finish(R, { w:0.015 });
  return g;
};

})();
