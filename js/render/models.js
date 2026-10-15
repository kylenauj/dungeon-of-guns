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
 * ================================================================== */
const WOOD = 0x7a4a26, WOOD2 = 0x5a3418, BRASS = 0xd8a840, IRON = 0x4a4a58, DARK = 0x2a2a34;
const GUN = {
  pistol(g, el){
    P(g, BX(0.1, 0.2, 0.13), WOOD, 0, -0.1, -0.06, 0.35);
    P(g, BX(0.12, 0.09, 0.22), BRASS, 0, 0.0, 0.02);
    P(g, CY(0.035, 0.05, 0.4, 10), WOOD2, 0, 0.03, 0.26, PI/2);
    [0.14, 0.24, 0.34].forEach(z=> P(g, TO(0.045, 0.012), BRASS, 0, 0.03, z));
    P(g, CO(0.05, 0.08, 6), BRASS, 0, 0.03, 0.47, PI/2);
    return { gem:[0, 0.03, 0.53, 0.055], muzzle:[0, 0.03, 0.56] };
  },
  smg(g, el){
    P(g, BX(0.13, 0.15, 0.4), IRON, 0, 0, 0.04);
    P(g, BX(0.11, 0.2, 0.1), WOOD, 0, -0.14, -0.12, 0.3);
    P(g, CY(0.11, 0.11, 0.1, 14), DARK, 0, -0.12, 0.08, 0, 0, PI/2);
    for(const x of [-0.035, 0.035]) P(g, CY(0.025, 0.025, 0.24, 8), BRASS, x, 0.02, 0.32, PI/2);
    P(g, BX(0.14, 0.03, 0.26), BRASS, 0, 0.09, 0.04);
    return { gem:[0, 0.12, 0.08, 0.045], vents:true, muzzle:[0, 0.02, 0.46] };
  },
  shotgun(g, el){
    P(g, BX(0.11, 0.13, 0.34), WOOD, 0, -0.03, -0.1);
    P(g, BX(0.1, 0.12, 0.22), WOOD2, 0, -0.1, -0.3, -0.4);
    P(g, K.lathe([[0.05, 0], [0.055, 0.3], [0.07, 0.42], [0.13, 0.52], [0.12, 0.54], [0.05, 0.5]], 14), BRASS, 0, 0.03, 0.06, PI/2);
    [0.12, 0.26].forEach(z=> P(g, TO(0.065, 0.015), IRON, 0, 0.03, z));
    return { gem:[0, 0.11, -0.05, 0.05], muzzle:[0, 0.03, 0.62] };
  },
  rifle(g, el){
    P(g, BX(0.09, 0.14, 0.5), WOOD, 0, -0.03, -0.12);
    P(g, BX(0.08, 0.16, 0.2), WOOD2, 0, -0.08, -0.4, -0.25);
    P(g, CY(0.028, 0.036, 0.95, 10), DARK, 0, 0.03, 0.55, PI/2);
    [0.25, 0.55, 0.85].forEach(z=> P(g, TO(0.04, 0.01), BRASS, 0, 0.03, z));
    P(g, CY(0.045, 0.045, 0.26, 10), IRON, 0, 0.12, 0.1, PI/2);
    return { gem:[0, 0.12, 0.25, 0.04], muzzle:[0, 0.03, 1.04] };
  },
  launcher(g, el){
    P(g, CY(0.14, 0.13, 0.72, 16), 0x5a6a3a, 0, 0.04, 0.12, PI/2);
    P(g, TO(0.14, 0.035), IRON, 0, 0.04, 0.48);
    P(g, TO(0.14, 0.025), BRASS, 0, 0.04, -0.2);
    P(g, BX(0.07, 0.2, 0.09), WOOD, 0, -0.14, -0.02);
    P(g, BX(0.3, 0.03, 0.05), 0x6a4a2a, 0, 0.17, 0.12);
    return { gem:[0, 0.04, 0.46, 0.09], muzzle:[0, 0.04, 0.52] };
  }
};
Models.gun = function(base, element, R, els){
  R = R || rig("gun");
  const g = new THREE.Group(), col = DG.ELEMENTS[element].color;
  const info = (GUN[base] || GUN.pistol)(g, col);
  const gem = glow(R, g, info.gem[3], col, info.gem[0], info.gem[1], info.gem[2]);
  // a little gem for every other element the shots carry, in a row behind the big one
  (els || []).filter(e=> e !== element).forEach((e, i)=>{
    P(g, CY(0.03, 0.03, 0.02, 8), BRASS, info.gem[0], info.gem[1] + 0.06, info.gem[2] - 0.09 - i*0.07);
    glow(R, g, 0.026, DG.ELEMENTS[e].color, info.gem[0], info.gem[1] + 0.085, info.gem[2] - 0.09 - i*0.07);
  });
  halo(R, g, col, info.gem[3]*9, info.gem[0], info.gem[1], info.gem[2], 0.5);
  if(info.vents) [-0.07, 0.07].forEach(x=> glow(R, g, 0.02, col, x, 0.02, 0.18));
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
 * ================================================================== */
const SKIN = 0xf2c9a0, BEARD = 0xf2f2f6, GOLD = 0xf0c040, LEATHER = 0x7a4a26;
/* the dyes: robe, its dark and light shades, the cape, and the stars sewn on */
const DYE = {
  arcane:{ robe:0x6b3fd0, dark:0x4a2a9a, light:0x8a5ae8, cape:0x3a2470, stars:GOLD },
  fire:  { robe:0xc8402a, dark:0x8a2414, light:0xff7a3a, cape:0xa8180e, stars:0xffd23d },
  frost: { robe:0x3a7ad8, dark:0x24508a, light:0x8ad8ff, cape:0x1a4a8a, stars:0xe8f8ff },
  poison:{ robe:0x4a9a2a, dark:0x2a6a1a, light:0x9cff3a, cape:0x2a5a14, stars:0xd8ff6a },
  shock: { robe:0xd8b82a, dark:0x2a2a5a, light:0xfff04a, cape:0x23235a, stars:0xfff8b0 },
  gold:  { robe:0xd8a830, dark:0x8a6a10, light:0xfff27a, cape:0xb8862a, stars:0xffffff },
  shadow:{ robe:0x2a2234, dark:0x14101c, light:0x4a3a6a, cape:0x0a0810, stars:0xb36bff },
  star:  { robe:0x6b3fd0, dark:0x4a2a9a, light:0x8a5ae8, cape:0x141a4a, stars:GOLD },
  leaf:  { robe:0x3e8a3a, dark:0x5a3a20, light:0x9cd86a, cape:0x2a6a2a, stars:0xff8ac8 },
  clown: { robe:0xff7a2a, dark:0x2a8ad8, light:0xffd23d, cape:0x2ab8d8, stars:0xff4a8a }
};
Models.DYE = DYE;

Models.zippy = function(look){
  look = look || { robe:"arcane", cape:"arcane", parts:[], auras:[] };
  const has = p=> look.parts.indexOf(p) >= 0;
  const D = DYE[look.robe] || DYE.arcane, C = DYE[look.cape] || DYE.arcane;
  const ROBE = D.robe, ROBE2 = D.dark, ROBE3 = D.light;
  const R = rig("zippy"), b = R.body;
  R.look = look;
  // the robe, flared at the hem, with stars sewn on
  const robeProf = [[0.0, 0.02], [0.47, 0.02], [0.45, 0.14], [0.37, 0.45], [0.29, 0.75], [0.22, 0.93], [0.15, 1.02], [0.0, 1.04]];
  P(b, K.lathe(robeProf, 22), ROBE);
  P(b, TO(0.46, 0.04), GOLD, 0, 0.06, 0, PI/2);
  P(b, TO(0.44, 0.02), ROBE2, 0, 0.16, 0, PI/2);
  belt(b, 0.3, 0.62, 0x6a4220, GOLD);
  P(b, TO(0.17, 0.05), ROBE3, 0, 1.0, 0, PI/2);
  [[0.4, 0.3], [2.2, 0.5], [-0.8, 0.22], [3.6, 0.35], [-2.4, 0.6], [1.3, 0.78], [2.9, 0.82], [-1.6, 0.45]].forEach(([a, y])=>{
    const rr = y < 0.45 ? 0.43 - (y - 0.14)*0.25 : 0.37 - (y - 0.45)*0.27;
    P(b, OC(0.04), D.stars, Math.sin(a)*(rr + 0.01), y, Math.cos(a)*(rr + 0.01), 0, a);
  });
  // a short cape over the shoulders, open at the front (it takes the cape dye)
  const capeG = group(b, 0, 1.03, 0); R.parts.cape = capeG;
  const cape = new THREE.LatheGeometry([[0.56, 0.12], [0.5, 0.45], [0.4, 0.8], [0.22, 1.03]].map(p=> new THREE.Vector2(p[0], p[1] - 1.03)), 16, PI*0.45, PI*1.1);
  P(capeG, cape, C.cape);
  P(capeG, TO(0.555, 0.025, PI*1.1), C.stars, 0, 0.13 - 1.03, 0, PI/2, 0, -PI*1.05);
  // and a capelet over the shoulders, so the dye reads from the front too
  P(b, K.lathe([[0.38, 0.74], [0.34, 0.86], [0.26, 0.97], [0.19, 1.04]], 18), C.cape);
  P(b, TO(0.375, 0.025), C.stars, 0, 0.745, 0, PI/2);
  P(b, S(0.045, 8, 6), GOLD, 0, 0.98, 0.21);
  // on the belt: a pouch, a green potion, a rolled-up scroll
  P(b, BX(0.15, 0.13, 0.08), LEATHER, 0.2, 0.52, 0.24, 0, -0.55);
  P(b, BX(0.15, 0.04, 0.09), 0x5a3418, 0.2, 0.6, 0.24, 0, -0.55);
  P(b, S(0.012, 6, 4), GOLD, 0.21, 0.57, 0.29);
  P(b, CY(0.02, 0.02, 0.06, 6), 0xd8eef8, -0.2, 0.62, 0.26);
  glow(R, b, 0.05, 0x7dff3a, -0.2, 0.55, 0.26);
  P(b, CY(0.025, 0.025, 0.02, 6), 0x8a5a2a, -0.2, 0.66, 0.26);
  P(b, CY(0.03, 0.03, 0.22, 8), 0xf0e6c8, -0.05, 0.56, -0.3, 0, 0, 1.3);
  // boots peeking out
  [-1, 1].forEach(s=>{ P(b, S(0.1, 10, 8), 0x5a3a20, s*0.14, 0.05, 0.16, 0, 0, 0, 1, 0.6, 1.4); P(b, CO(0.04, 0.12, 6), 0x5a3a20, s*0.14, 0.09, 0.3, -1.2); });
  // the head
  const head = group(b, 0, 1.2, 0.02); R.parts.head = head;
  P(head, S(0.22, 16, 12), SKIN);
  [-1, 1].forEach(s=>{ P(head, S(0.055, 8, 6), 0xf0a0a0, s*0.13, -0.035, 0.15, 0, 0, 0, 1, 0.7, 0.6); P(head, S(0.05, 8, 6), SKIN, s*0.21, 0.01, 0); });
  P(head, S(0.065, 10, 8), 0xe8a888, 0, -0.005, 0.22);
  eyes(head, 0.08, 0.05, 0.16, 0.045);
  // little round spectacles (unless something better sits on his face)
  if(!has("goggles") && !has("plaguemask")){
    [-1, 1].forEach(s=> P(head, TO(0.055, 0.009), GOLD, s*0.08, 0.05, 0.2));
    P(head, BX(0.05, 0.012, 0.012), GOLD, 0, 0.06, 0.215);
  }
  [-1, 1].forEach(s=> P(head, BX(0.1, 0.03, 0.035), BEARD, s*0.085, 0.13, 0.19, 0, 0, -s*0.15));
  // the beard, the moustache
  const beard = group(head, 0, -0.08, 0.07); R.parts.beard = beard;
  P(beard, K.lathe([[0.0, 0.02], [0.17, 0.0], [0.19, -0.12], [0.15, -0.3], [0.08, -0.44], [0.02, -0.52], [0, -0.53]], 14), BEARD, 0, 0, 0, 0, 0, 0, 1, 1, 0.75);
  P(beard, TO(0.035, 0.012), GOLD, 0, -0.42, 0.06, 0.3);
  [-1, 1].forEach(s=> P(head, CY(0.025, 0.04, 0.16, 8), BEARD, s*0.075, -0.045, 0.2, 0, 0, s*1.25));
  // the hat, a bit bent, with a moon on the band and a patch where it tore (or Gribbus' face, with Frogsona)
  const hat = group(head, 0, 0.14, -0.04); hat.rotation.x = -0.32; R.parts.hat = hat;
  let tip;
  if(has("froghood")){
    P(hat, new THREE.SphereGeometry(0.3, 16, 10, 0, PI*2, 0, PI*0.6), 0x5ac83a, 0, -0.04, 0, 0, 0, 0, 1.05, 0.9, 1.05);
    P(hat, TO(0.27, 0.035), 0x3e9a28, 0, 0.0, 0, PI/2);
    [-1, 1].forEach(s=>{ P(hat, S(0.1, 12, 8), 0x5ac83a, s*0.13, 0.22, 0.12); P(hat, S(0.075, 10, 8), 0xfafae8, s*0.13, 0.25, 0.17); P(hat, S(0.04, 8, 6), 0x101010, s*0.13, 0.255, 0.235, 0, 0, 0, 1.4, 0.6, 0.6); });
    P(hat, TO(0.12, 0.012, PI), 0x2a3a1a, 0, 0.12, 0.25, 0, 0, PI);
    tip = group(hat, 0, 0.32, 0);
  } else {
    P(hat, K.lathe([[0, 0], [0.4, 0.0], [0.44, 0.025], [0.4, 0.05], [0.2, 0.06], [0, 0.06]], 22), ROBE2);
    P(hat, CY(0.17, 0.25, 0.32, 16), ROBE, 0, 0.2, 0);
    P(hat, TO(0.245, 0.032), GOLD, 0, 0.08, 0, PI/2);
    P(hat, TO(0.06, 0.018, PI*1.3), GOLD, 0, 0.12, 0.25, 0, 0, 0.8);
    P(hat, BX(0.1, 0.09, 0.02), ROBE3, -0.15, 0.24, 0.13, 0, -0.6, 0.2);
    [[-0.17, 0.2], [0.17, 0.3], [0.04, 0.33]].forEach(([x, y])=> P(hat, OC(0.03), D.stars, x, y, Math.sqrt(Math.max(0, 0.04 - x*x))*1.05 + 0.02));
    const t1 = group(hat, 0, 0.36, 0); t1.rotation.z = -0.25;
    P(t1, CY(0.1, 0.17, 0.26, 14), ROBE, 0, 0.12, 0);
    P(t1, OC(0.03), D.stars, 0, 0.12, 0.14);
    let up = t1;
    if(has("tallhat")){ const tx = group(t1, 0, 0.25, 0); tx.rotation.z = 0.2; P(tx, CY(0.08, 0.1, 0.3, 12), ROBE, 0, 0.15, 0); P(tx, TO(0.09, 0.02), GOLD, 0, 0.05, 0, PI/2); up = group(tx, 0, 0.05, 0); }
    const t2 = group(up, 0, 0.25, 0); t2.rotation.z = -0.5; R.parts.tip = t2;
    P(t2, CO(0.1, 0.26, 12), ROBE3, 0, 0.12, 0);
    if(!has("flamehat") && !has("voidtip") && !has("discoball")){ glow(R, t2, 0.045, 0xffe680, 0, 0.27, 0); halo(R, t2, 0xffe680, 0.5, 0, 0.27, 0, 0.7); }
    tip = t2;
  }
  // sleeves and hands; the right one holds the gun
  const arm = (s)=>{
    const a = group(b, s*0.3, 0.86, 0.04);
    P(a, K.lathe([[0.06, 0], [0.08, -0.12], [0.13, -0.28], [0.12, -0.31], [0.0, -0.3]], 12), ROBE, 0, 0, 0);
    P(a, TO(0.12, 0.025), GOLD, 0, -0.29, 0, PI/2);
    P(a, S(0.075, 10, 8), SKIN, 0, -0.34, 0);
    P(a, S(0.03, 6, 4), SKIN, 0.05*s, -0.36, 0.05);
    a.rotation.x = -1.1;
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1); R.parts.armL.rotation.z = -0.3; R.parts.armL.position.x = -0.25;
  P(R.parts.armL, TO(0.04, 0.012), GOLD, 0, -0.35, 0.05);
  const gunHolder = group(R.parts.armR, 0, -0.36, 0.02); gunHolder.rotation.x = 1.1; R.parts.gun = gunHolder;
  // the costume pieces (R.anim: the bits the view keeps moving)
  R.anim = [];
  const ctx = { R, b, head, hat, tip, beard, cape:capeG, armL:R.parts.armL, armR:R.parts.armR, D, C };
  look.parts.forEach(p=>{ if(OUTFIT[p]) OUTFIT[p](ctx); });
  R.h = 2.1;
  finish(R);
  return R;
};
Models.wizard = Models.zippy;

/* ---- costume pieces: each adds parts to the right bit of Zippy ----
   (b: the body, y up from the floor, +z is his front; head at y 1.2) */
const OUTFIT = {
  vines(c){
    // a vine wound three times round him, hem to shoulders, with leaves
    const pts = []; for(let i=0;i<=40;i++){ const t = i/40, a = t*PI*6, y = 0.08 + t*0.92, rr = (y < 0.45 ? 0.45 - (y - 0.14)*0.25 : 0.37 - (y - 0.45)*0.27) + 0.03; pts.push([Math.sin(a)*rr, y, Math.cos(a)*rr]); }
    P(c.b, K.tube(pts, 0.025, 80, 5), 0x3e7a2a);
    for(let i=2;i<40;i+=3){ const [x, y, z] = pts[i]; const a = Math.atan2(x, z); P(c.b, S(0.055, 8, 6), i % 2 ? 0x5aa83a : 0x7ac84a, x*1.08, y + 0.02, z*1.08, 0.4, a, 0.6, 1, 0.35, 1.6); }
  },
  flowers(c){
    [[0.5, 0.3], [2.6, 0.55], [-1.2, 0.78], [4.1, 0.42], [-2.8, 0.22]].forEach(([a, y], i)=>{
      const rr = (y < 0.45 ? 0.45 - (y - 0.14)*0.25 : 0.37 - (y - 0.45)*0.27) + 0.06, col = [0xff6aa8, 0xffd23d, 0xff8a3a][i % 3];
      for(let k=0;k<5;k++){ const q = k/5*PI*2; P(c.b, S(0.035, 6, 4), col, Math.sin(a)*rr + Math.cos(q)*0.04*Math.cos(a), y + Math.sin(q)*0.04, Math.cos(a)*rr - Math.cos(q)*0.04*Math.sin(a)); }
      P(c.b, S(0.028, 6, 4), 0xfff0a0, Math.sin(a)*(rr + 0.02), y, Math.cos(a)*(rr + 0.02));
    });
  },
  goggles(c){
    [-1, 1].forEach(s=>{ P(c.head, CY(0.065, 0.07, 0.07, 12), 0x3a3a44, s*0.085, 0.06, 0.18, PI/2); glow(c.R, c.head, 0.05, 0xff4a3a, s*0.085, 0.06, 0.22); });
    P(c.head, TO(0.225, 0.022), 0x5a3a20, 0, 0.06, 0, PI/2 + 0.05);
  },
  monocle(c){ P(c.head, TO(0.06, 0.012), GOLD, 0.085, 0.05, 0.205); glow(c.R, c.head, 0.045, 0xd8f0ff, 0.085, 0.05, 0.2); P(c.head, K.tube([[0.14, 0.03, 0.2], [0.18, -0.15, 0.2], [0.12, -0.35, 0.22]], 0.006, 8, 3), GOLD); },
  wingboots(c){ [-1, 1].forEach(s=>{ for(let k=0;k<3;k++) P(c.b, BX(0.03, 0.06 + k*0.03, 0.14 - k*0.03), 0xf8f8ff, s*(0.24 + k*0.015), 0.1 + k*0.04, 0.08 - k*0.03, -0.5, 0, s*(0.6 + k*0.2)); }); },
  stripysocks(c){ [-1, 1].forEach(s=>{ for(let k=0;k<3;k++) P(c.b, CY(0.075, 0.08, 0.035, 10), k % 2 ? 0xffd23d : 0xd83a3a, s*0.14, 0.11 + k*0.035, 0.12); }); },
  mudboots(c){ [-1, 1].forEach(s=>{ P(c.b, S(0.13, 10, 8), 0x4a3418, s*0.15, 0.06, 0.15, 0, 0, 0, 1, 0.65, 1.5); P(c.b, S(0.05, 6, 4), 0x6a5a2a, s*0.2, 0.12, 0.25); }); },
  tallhat(c){ /* built into the hat */ },
  spikyhat(c){ for(let i=0;i<8;i++){ const a = i/8*PI*2; P(c.hat, CO(0.035, 0.14, 5), 0x9a9aa8, Math.cos(a)*0.4, 0.03, Math.sin(a)*0.4, 0, -a, -PI/2 - 0.3); } },
  flamehat(c){ for(let i=0;i<4;i++){ const a = i*1.7; const f = glow(c.R, c.tip, 0.07 - i*0.012, [0xffe14a, 0xff9a2e, 0xff5a1a, 0xff3a1a][i], Math.cos(a)*0.03, 0.27 + i*0.08, Math.sin(a)*0.03); c.R.anim.push({ o:f, flicker:0.35 }); } halo(c.R, c.tip, 0xff7a2a, 1.1, 0, 0.35, 0, 0.8); },
  icecrown(c){ for(let i=0;i<7;i++){ const a = i/7*PI*2; P(c.hat, CO(0.04, 0.16 + (i % 2)*0.08, 5), 0xbfeaff, Math.cos(a)*0.25, 0.14, Math.sin(a)*0.25, 0, 0, 0); } halo(c.R, c.hat, 0x8ad8ff, 0.9, 0, 0.18, 0, 0.4); },
  stormcloud(c){ const g = group(c.head, 0, 0.9, -0.05); [[0, 0, 0, 0.16], [0.15, -0.02, 0, 0.12], [-0.15, -0.02, 0.02, 0.12], [0.05, 0.08, -0.05, 0.11]].forEach(([x, y, z, r])=> P(g, S(r, 10, 8), 0x7a7a8a, x, y, z, 0, 0, 0, 1, 0.75, 1)); glow(c.R, g, 0.04, 0xfff04a, 0.02, -0.17, 0.05); glow(c.R, g, 0.03, 0xfff04a, -0.04, -0.24, 0.05); },
  plaguemask(c){ P(c.head, CO(0.07, 0.26, 10), 0xe8dcc0, 0, -0.04, 0.32, PI/2 + 0.3); [-1, 1].forEach(s=>{ P(c.head, CY(0.05, 0.05, 0.03, 12), 0x2a2a34, s*0.085, 0.06, 0.2, PI/2); glow(c.R, c.head, 0.035, 0x9cff3a, s*0.085, 0.06, 0.215); }); },
  chicken(c){ const g = group(c.hat, 0.22, 0.12, 0.12); g.rotation.set(0.2, 0.6, -0.5); P(g, S(0.06, 8, 6), 0xffd23d, 0, 0, 0, 0, 0, 0, 1, 1, 1.6); P(g, S(0.05, 8, 6), 0xffd23d, 0, 0.05, 0.09); P(g, CO(0.02, 0.05, 4), 0xff8a2a, 0, 0.05, 0.15, PI/2); P(g, BX(0.015, 0.05, 0.05), 0xd83a3a, 0, 0.11, 0.09); },
  hive(c){ const g = group(c.b, 0, 0.75, -0.42); P(g, K.lathe([[0, -0.2], [0.12, -0.18], [0.16, -0.06], [0.15, 0.06], [0.1, 0.16], [0, 0.2]], 12), 0xe8b84a); [-0.1, 0, 0.1].forEach(y=> P(g, TO(0.15 - Math.abs(y)*0.3, 0.015), 0xb8862a, 0, y, 0, PI/2)); P(g, S(0.035, 6, 4), 0x2a1a10, 0, -0.04, -0.15); P(c.b, TO(0.3, 0.015, PI), 0x6a4a2a, 0, 0.82, -0.05, PI/2 - 0.2, 0, PI); glow(c.R, g, 0.025, 0xffd23d, 0.2, 0.1, -0.05); },
  accordion(c){ const g = group(c.b, 0, 0.78, -0.4); for(let i=0;i<5;i++) P(g, BX(0.38, 0.06, 0.12 - (i % 2)*0.02), i % 2 ? 0xf0e6d4 : 0xc82a3a, 0, -0.14 + i*0.07, 0); [-1, 1].forEach(s=> P(g, BX(0.4, 0.04, 0.14), 0x2a2a34, 0, s*0.18, 0)); },
  dice(c){ [[-0.12, 0.45, 0.32, 0.3], [-0.02, 0.42, 0.33, -0.4]].forEach(([x, y, z, r])=>{ P(c.b, BX(0.07, 0.07, 0.07), 0xf8f8f0, x, y, z, r, r, 0); P(c.b, S(0.012, 4, 3), 0x101010, x, y, z + 0.037); P(c.b, CY(0.004, 0.004, 0.1, 3), 0x3a2a1a, x, y + 0.08, z - 0.02); }); },
  penny(c){ P(c.hat, CY(0.06, 0.06, 0.015, 14), 0xc8783a, 0, 0.12, 0.26, PI/2 - 0.2); P(c.hat, CY(0.045, 0.045, 0.017, 14), 0xe8984a, 0, 0.12, 0.262, PI/2 - 0.2); },
  gear(c){ P(c.b, TO(0.07, 0.022), 0xc8a040, 0, 0.82, 0.27, -0.25); for(let i=0;i<8;i++){ const a = i/8*PI*2; P(c.b, BX(0.03, 0.03, 0.025), 0xc8a040, Math.cos(a)*0.09, 0.82 + Math.sin(a)*0.09, 0.28, -0.25, 0, a); } glow(c.R, c.b, 0.035, 0x8ad8ff, 0, 0.82, 0.29); },
  ghostpal(c){ const g = group(c.b, 0.42, 1.55, -0.25); c.R.anim.push({ o:g, bob:0.1, speed:2.3 }); P(g, sheet(c.R, 0, 0.35, 0.18), 0xe8f2ff); [-1, 1].forEach(s=> P(g, S(0.025, 6, 4), 0x101020, s*0.04, 0.25, 0.11)); halo(c.R, g, 0x9cffc8, 0.6, 0, 0.18, 0, 0.35); },
  discoball(c){ P(c.tip, CY(0.004, 0.004, 0.12, 3), 0x9a9aa8, 0, 0.3, 0); const g = group(c.tip, 0, 0.4, 0); c.R.anim.push({ o:g, spin:3 }); P(g, new THREE.IcosahedronGeometry(0.08, 1), 0xd8d8e8); [[0.05, 0.03, 0.05], [-0.05, -0.02, 0.05], [0.0, 0.05, -0.06]].forEach(([x, y, z])=> glow(c.R, g, 0.022, 0xffffff, x, y, z)); halo(c.R, c.tip, 0xff6ad8, 0.7, 0, 0.4, 0, 0.5); },
  gum(c){ P(c.head, S(0.08, 12, 10), 0xff4ab8, 0, -0.07, 0.3); },
  napkin(c){ P(c.b, CO(0.15, 0.22, 3), 0xf8f8f0, 0, 0.9, 0.22, PI + 0.3, 0, 0, 1, 1, 0.3); },
  noodles(c){ for(let i=0;i<4;i++) P(c.beard, K.tube([[-0.08 + i*0.05, -0.05, 0.12], [-0.04 + i*0.03, -0.2, 0.15], [-0.1 + i*0.06, -0.35, 0.12]], 0.008, 8, 3), 0xf0d86a); P(c.beard, S(0.04, 8, 6), 0x8a3a1a, 0.03, -0.25, 0.15); },
  pinatastick(c){ const g = group(c.b, -0.2, 0.85, -0.38); g.rotation.z = 0.6; for(let i=0;i<5;i++) P(g, CY(0.025, 0.025, 0.12, 8), [0xff4a6a, 0x46e4ff, 0xffd23d, 0x9cff3a, 0xb36bff][i], 0, -0.25 + i*0.12, 0); },
  teapot(c){ const g = group(c.b, -0.3, 0.45, 0.12); P(g, S(0.08, 10, 8), 0xf0e6d4, 0, 0, 0, 0, 0, 0, 1, 0.8, 1); P(g, CO(0.02, 0.08, 6), 0xf0e6d4, 0.08, 0.02, 0, 0, 0, -0.9); P(g, TO(0.04, 0.012, PI), 0xf0e6d4, -0.08, 0, 0, 0, PI/2, PI/2); P(g, S(0.025, 6, 4), 0x4aa8ff, 0, 0.07, 0); },
  heartjar(c){ P(c.b, CY(0.06, 0.06, 0.12, 10), 0xd8eef8, 0.3, 0.45, 0.1); P(c.b, CY(0.065, 0.065, 0.025, 10), 0x8a5a2a, 0.3, 0.52, 0.1); glow(c.R, c.b, 0.035, 0xff3a5a, 0.3, 0.45, 0.1); },
  lunchbox(c){ P(c.b, BX(0.16, 0.12, 0.08), 0xd83a3a, 0.31, 0.42, -0.08, 0, 0.6); P(c.b, TO(0.04, 0.01, PI), 0x2a2a34, 0.31, 0.48, -0.08, 0, 0.6); },
  coinpouch(c){ P(c.b, S(0.08, 10, 8), 0xb8862a, -0.31, 0.45, -0.02, 0, 0, 0, 1, 1.2, 1); P(c.b, TO(0.035, 0.012), 0xffd23d, -0.31, 0.55, -0.02, PI/2); P(c.b, CY(0.03, 0.03, 0.01, 10), 0xffd23d, -0.27, 0.36, 0.06, 0.6); },
  clover(c){ for(let i=0;i<4;i++){ const a = i/4*PI*2 + PI/4; P(c.hat, S(0.03, 6, 4), 0x3ab83a, -0.2 + Math.cos(a)*0.03, 0.13 + Math.sin(a)*0.03, 0.17); } P(c.hat, CY(0.006, 0.006, 0.06, 3), 0x2a8a2a, -0.2, 0.09, 0.17); },
  muscles(c){ [c.armL, c.armR].forEach(a=> P(a, S(0.1, 10, 8), 0xf2c9a0, 0, -0.17, 0.05, 0, 0, 0, 1, 1.3, 1)); },
  cracks(c){ [[-0.22, 0.95, -0.15], [-0.28, 0.85, -0.05], [-0.18, 0.9, 0.05]].forEach(([x, y, z], i)=> P(c.b, CO(0.035, 0.12 + i*0.03, 4), 0xbfeaff, x, y + 0.05, z, 0.2*i, 0, 0.5 - i*0.2)); },
  bombbelt(c){ for(let i=0;i<4;i++){ const a = 2.4 + i*0.45; P(c.b, S(0.05, 8, 6), 0x1a1a22, Math.sin(a)*0.33, 0.56, Math.cos(a)*0.33); P(c.b, CY(0.008, 0.008, 0.04, 3), 0x8a6a4a, Math.sin(a)*0.33, 0.62, Math.cos(a)*0.33); } },
  starcape(c){ for(let i=0;i<7;i++){ const a = PI*0.62 + i*0.11*PI, y = 0.38 + (i % 3)*0.18, rr = 0.52 - (y - 0.3)*0.45; P(c.cape, OC(0.035), 0xfff27a, Math.sin(a)*rr, y - 1.03, Math.cos(a)*rr); } },
  portalcuffs(c){ P(c.armR, TO(0.13, 0.022), 0x46e4ff, 0, -0.27, 0, PI/2); P(c.armL, TO(0.13, 0.022), 0xff9a2e, 0, -0.27, 0, PI/2); glow(c.R, c.armR, 0.03, 0x46e4ff, 0.12, -0.27, 0); glow(c.R, c.armL, 0.03, 0xff9a2e, -0.12, -0.27, 0); },
  antenna(c){ [-1, 1].forEach(s=>{ P(c.hat, CY(0.008, 0.008, 0.3, 4), 0x9a9aa8, s*0.12, 0.35, 0.05, 0, 0, -s*0.4); glow(c.R, c.hat, 0.03, 0x9cff3a, s*0.18, 0.5, 0.05); }); },
  halo(c){ const g = group(c.head, 0, 0.75, 0); c.R.anim.push({ o:g, bob:0.05, speed:2 }); const m = new THREE.Mesh(TO(0.26, 0.025), new THREE.MeshBasicMaterial({ color:0xfff27a, transparent:true })); m.rotation.x = PI/2; g.add(m); c.R.glows.push(m); halo(c.R, g, 0xfff27a, 1.4, 0, 0, 0, 0.5); },
  prismgem(c){ [0xff4a6a, 0xffd23d, 0x9cff3a, 0x46e4ff, 0xb36bff].forEach((col, i)=>{ const a = (i - 2)*0.35; glow(c.R, c.b, 0.03, col, Math.sin(a)*0.27, 0.88 + Math.cos(a*2)*0.02, Math.cos(a)*0.27); }); P(c.b, OC(0.05), 0xf8f8ff, 0, 0.8, 0.28); },
  froghood(c){ /* built into the hat */ },
  cubes(c){ const o = group(c.head, 0, 0.1, 0); c.R.parts.orbit = o; for(let i=0;i<3;i++){ const a = i/3*PI*2; P(o, BX(0.08, 0.08, 0.08), [0x46e4ff, 0xb36bff, 0xffd23d][i], Math.cos(a)*0.42, Math.sin(a*2)*0.05, Math.sin(a)*0.42, a, a, 0); } },
  voidtip(c){ P(c.tip, S(0.08, 12, 10), 0x050008, 0, 0.32, 0); const m = new THREE.Mesh(TO(0.12, 0.015), new THREE.MeshBasicMaterial({ color:0xb36bff, transparent:true })); m.position.y = 0.32; m.rotation.x = 1.2; c.tip.add(m); c.R.glows.push(m); halo(c.R, c.tip, 0xb36bff, 0.8, 0, 0.32, 0, 0.5); },
  mirrorshield(c){ P(c.armL, CY(0.17, 0.17, 0.03, 16), 0xc8c8d8, -0.05, -0.18, 0.1, PI/2); P(c.armL, TO(0.17, 0.02), GOLD, -0.05, -0.18, 0.115); glow(c.R, c.armL, 0.05, 0xffffff, -0.08, -0.15, 0.13); },
  orbitrings(c){ [0.5, -0.6].forEach((tilt, i)=>{ const g = group(c.b, 0, 0.75, 0); g.rotation.x = tilt; c.R.anim.push({ o:g, spin:i ? -1.2 : 1.5 }); const m = new THREE.Mesh(TO(0.62, 0.012), new THREE.MeshBasicMaterial({ color:i ? 0x46e4ff : 0xffd23d, transparent:true, opacity:0.8 })); m.rotation.x = PI/2; g.add(m); c.R.glows.push(m); glow(c.R, g, 0.04, i ? 0x46e4ff : 0xffd23d, 0.62, 0, 0); }); },
  /* ---- transformations ---- */
  horns(c){ [-1, 1].forEach(s=>{ const pts = [[s*0.16, 0.08, 0], [s*0.3, 0.2, -0.02], [s*0.36, 0.38, 0.04], [s*0.3, 0.5, 0.1]]; P(c.head, K.tube(pts, 0.04, 10, 6), 0x2a1410); P(c.head, CO(0.04, 0.1, 6), 0xffd23d, s*0.29, 0.54, 0.11, 0.4, 0, -s*0.3); }); },
  lichmask(c){ P(c.head, S(0.225, 14, 10), 0xd8e8f0, 0, 0.0, 0.015, 0, 0, 0, 1, 1, 0.98); [-1, 1].forEach(s=>{ P(c.head, S(0.05, 8, 6), 0x0a1020, s*0.08, 0.04, 0.18); glow(c.R, c.head, 0.03, 0x46e4ff, s*0.08, 0.04, 0.215); }); teeth(c.head, -0.07, 0.2, 0.12, 5, 0xe8f0f8); },
  statichair(c){ for(let i=0;i<9;i++){ const a = (i - 4)*0.32; P(c.head, CO(0.03, 0.22, 4), 0xf2f2f6, Math.sin(a)*0.2, 0.1, Math.cos(a)*0.08 - 0.12, -0.4 + Math.cos(a)*0.2, 0, -a*0.8); } glow(c.R, c.head, 0.025, 0xfff04a, 0.18, 0.22, -0.1); glow(c.R, c.head, 0.025, 0xfff04a, -0.2, 0.18, -0.12); },
  tophat(c){ P(c.hat, CY(0.2, 0.2, 0.05, 16), 0x1a1a22, 0, 0.42, 0); P(c.hat, CY(0.15, 0.15, 0.25, 16), 0x1a1a22, 0, 0.56, 0); P(c.hat, CY(0.155, 0.155, 0.05, 16), 0x6a1a2a, 0, 0.47, 0); },
  flowerhat(c){ for(let i=0;i<7;i++){ const a = i/7*PI*2, col = [0xff6aa8, 0xffd23d, 0xff8a3a, 0xc88aff][i % 4]; for(let k=0;k<5;k++){ const q = k/5*PI*2; P(c.hat, S(0.03, 6, 4), col, Math.cos(a)*0.32 + Math.cos(q)*0.035, 0.07, Math.sin(a)*0.32 + Math.sin(q)*0.035); } P(c.hat, S(0.022, 6, 4), 0xfff0a0, Math.cos(a)*0.32, 0.09, Math.sin(a)*0.32); } },
  crown(c){ const g = group(c.hat, 0, 0.36, 0); P(g, CY(0.19, 0.2, 0.1, 12), GOLD); for(let i=0;i<6;i++){ const a = i/6*PI*2; P(g, CO(0.035, 0.12, 4), GOLD, Math.cos(a)*0.19, 0.1, Math.sin(a)*0.19); glow(c.R, g, 0.02, [0xff3a6a, 0x46e4ff, 0x9cff3a][i % 3], Math.cos(a)*0.2, 0.0, Math.sin(a)*0.2); } },
  lilycape(c){ P(c.cape, new THREE.CylinderGeometry(0.55, 0.55, 0.03, 18, 1, false, 0.3, PI*2 - 0.6), 0x4aa83a, 0, -0.75, -0.25, -1.2, PI, 0); P(c.cape, TO(0.5, 0.025, PI*1.6), 0x3a8a2a, 0, -0.75, -0.25, -1.2 + PI/2, 0, 0); },
  clownnose(c){ P(c.head, S(0.075, 10, 8), 0xff2a3a, 0, -0.005, 0.24); glow(c.R, c.head, 0.02, 0xffffff, 0.025, 0.02, 0.31); },
  ruff(c){ for(let i=0;i<14;i++){ const a = i/14*PI*2; P(c.b, S(0.07, 8, 6), i % 2 ? 0xffffff : 0xffd23d, Math.sin(a)*0.22, 1.04, Math.cos(a)*0.22, 0, a, 0, 1, 0.6, 1.4); } },
  /* ---- more odds and ends ---- */
  spinachcan(c){ P(c.b, CY(0.05, 0.05, 0.12, 10), 0x3a8a3a, 0.3, 0.45, 0.12); P(c.b, CY(0.052, 0.052, 0.04, 10), 0xd8d8e0, 0.3, 0.45, 0.12); },
  coffeecup(c){ P(c.armL, CY(0.05, 0.04, 0.1, 10), 0xf0e6d4, -0.04, -0.4, 0.08); P(c.armL, CY(0.045, 0.045, 0.01, 10), 0x4a2a1a, -0.04, -0.35, 0.08); P(c.armL, TO(0.03, 0.01, PI), 0xf0e6d4, -0.1, -0.4, 0.08, 0, 0, PI/2); },
  magnet(c){ P(c.b, TO(0.09, 0.03, PI), 0xd83a3a, -0.25, 0.5, 0.2, 0, -0.5, PI); [-1, 1].forEach(s=> P(c.b, BX(0.06, 0.05, 0.06), 0xd8d8e0, -0.25 + s*0.08*Math.cos(0.5), 0.41, 0.2 + s*0.08*Math.sin(0.5))); },
  hourglass(c){ const g = group(c.b, -0.32, 0.47, 0.08); P(g, CO(0.05, 0.08, 8), 0xd8eef8, 0, 0.04, 0, PI); P(g, CO(0.05, 0.08, 8), 0xd8eef8, 0, -0.04, 0); P(g, CY(0.06, 0.06, 0.015, 8), 0x6a4220, 0, 0.085, 0); P(g, CY(0.06, 0.06, 0.015, 8), 0x6a4220, 0, -0.085, 0); glow(c.R, g, 0.025, 0xffd23d, 0, -0.04, 0); },
  sandwich(c){ P(c.b, BX(0.14, 0.03, 0.1), 0xe8c88a, 0.05, 0.47, 0.32, 0.3); P(c.b, BX(0.15, 0.02, 0.11), 0x7ac84a, 0.05, 0.49, 0.32, 0.3); P(c.b, BX(0.14, 0.03, 0.1), 0xe8c88a, 0.05, 0.51, 0.32, 0.3); },
  pauldrons(c){ [-1, 1].forEach(s=> P(c.b, new THREE.SphereGeometry(0.15, 12, 8, 0, PI*2, 0, PI/2), c.D.light, s*0.27, 0.9, 0.0, 0, 0, -s*0.5)); },
  spikepauldrons(c){ [-1, 1].forEach(s=>{ P(c.b, new THREE.SphereGeometry(0.13, 10, 8, 0, PI*2, 0, PI/2), 0x6a6a74, s*0.27, 0.9, 0.0, 0, 0, -s*0.5); for(let k=0;k<3;k++) P(c.b, CO(0.025, 0.1, 5), 0xd8d8e0, s*(0.3 + k*0.03), 1.0 - k*0.02, -0.06 + k*0.06, 0, 0, -s*0.7); }); },
  rubberball(c){ P(c.b, S(0.07, 10, 8), 0xff4a8a, -0.28, 0.42, 0.18); P(c.b, TO(0.07, 0.012), 0xffd23d, -0.28, 0.42, 0.18, PI/2); },
  hateye(c){ const g = group(c.hat, 0, 0.2, 0.19); g.rotation.x = -0.3; P(g, S(0.065, 10, 8), 0xf4ece4); P(g, S(0.035, 8, 6), 0x46a8ff, 0, 0, 0.04); P(g, S(0.018, 6, 4), 0x080808, 0, 0, 0.065); },
  sideeyes(c){ [-1, 1].forEach(s=>{ const g = group(c.hat, s*0.2, 0.18, 0); g.rotation.y = s*PI/2; P(g, S(0.05, 10, 8), 0xf4ece4); P(g, S(0.025, 6, 4), 0x9cff3a, 0, 0, 0.035); P(g, S(0.013, 6, 4), 0x080808, 0, 0, 0.05); }); },
  backeye(c){ const g = group(c.hat, 0, 0.2, -0.2); g.rotation.y = PI; P(g, S(0.06, 10, 8), 0xf4ece4); P(g, S(0.03, 6, 4), 0xff4a3a, 0, 0, 0.04); P(g, S(0.015, 6, 4), 0x080808, 0, 0, 0.06); },
  worm(c){ P(c.hat, K.tube([[0.1, 0.3, 0.1], [0.2, 0.42, 0.14], [0.26, 0.4, 0.2], [0.3, 0.5, 0.22]], 0.035, 10, 6), 0xff8a9a); [-1, 1].forEach(s=> P(c.hat, S(0.012, 4, 3), 0x101010, 0.3 + s*0.02, 0.53, 0.25)); },
  jetpack(c){ const g = group(c.b, 0, 0.72, -0.36); [-1, 1].forEach(s=>{ P(g, CY(0.07, 0.07, 0.36, 10), 0xd8d8e0, s*0.09, 0, 0); P(g, CO(0.07, 0.1, 10), 0xd83a3a, s*0.09, 0.22, 0); P(g, CY(0.05, 0.035, 0.06, 10), 0x3a3a44, s*0.09, -0.21, 0); const f = glow(c.R, g, 0.045, 0xffa040, s*0.09, -0.28, 0); c.R.anim.push({ o:f, flicker:0.5 }); }); },
  wildhair(c){ for(let i=0;i<11;i++){ const a = i/11*PI*2; P(c.head, CO(0.04, 0.18, 4), [0xf2f2f6, 0xff4a8a, 0x46e4ff][i % 3], Math.cos(a)*0.2, 0.0, Math.sin(a)*0.2 - 0.04, Math.sin(a)*1.2, 0, -Math.cos(a)*1.2); } },
  icepauldron(c){ P(c.b, new THREE.SphereGeometry(0.15, 10, 8, 0, PI*2, 0, PI/2), 0xbfeaff, -0.27, 0.9, 0, 0, 0, 0.5); for(let k=0;k<3;k++) P(c.b, CO(0.035, 0.16, 5), 0xd8f4ff, -0.3 - k*0.03, 1.0, -0.06 + k*0.06, 0, 0, 0.6); halo(c.R, c.b, 0x8ad8ff, 0.6, -0.3, 1.0, 0, 0.35); },
  crystals(c){ [[0.27, 0.95, -0.05], [0.32, 0.9, 0.05], [0.24, 0.93, 0.08]].forEach(([x, y, z], i)=> P(c.b, CO(0.035, 0.14 + i*0.04, 5), [0xd84aff, 0x46e4ff, 0xff4a8a][i], x, y + 0.06, z, 0.2*i, 0, -0.4 + i*0.2)); },
  wisplantern(c){ const g = group(c.armL, -0.04, -0.42, 0.06); P(g, CY(0.004, 0.004, 0.08, 3), 0x5a5a64, 0, 0.04, 0); P(g, CY(0.05, 0.06, 0.1, 6), 0x3a3a44, 0, -0.04, 0); const w = glow(c.R, g, 0.04, 0x9cf0ff, 0, -0.04, 0); c.R.anim.push({ o:w, flicker:0.3 }); halo(c.R, g, 0x9cf0ff, 0.5, 0, -0.04, 0, 0.5); },
  souljar(c){ P(c.b, CY(0.055, 0.055, 0.11, 10), 0xd8eef8, -0.32, 0.45, 0.06); P(c.b, CY(0.06, 0.06, 0.025, 10), 0x3a3a44, -0.32, 0.52, 0.06); glow(c.R, c.b, 0.035, 0xb36bff, -0.32, 0.45, 0.06); },
  tombstone(c){ P(c.b, BX(0.32, 0.4, 0.08), 0x8a8a96, 0, 0.75, -0.42); P(c.b, CY(0.16, 0.16, 0.08, 12), 0x8a8a96, 0, 0.95, -0.42, PI/2); P(c.b, BX(0.14, 0.03, 0.01), 0x4a4a58, 0, 0.82, -0.465); P(c.b, BX(0.03, 0.12, 0.01), 0x4a4a58, 0, 0.82, -0.465); },
  bombtip(c){ P(c.tip, S(0.08, 10, 8), 0x1a1a22, 0, 0.32, 0); P(c.tip, CY(0.01, 0.01, 0.06, 4), 0x8a6a4a, 0, 0.42, 0); const f = glow(c.R, c.tip, 0.03, 0xffa040, 0, 0.46, 0); c.R.anim.push({ o:f, flicker:0.6 }); },
  hydra(c){ [-1, 1].forEach(s=>{ const pts = [[s*0.25, 0.9, -0.05], [s*0.45, 1.15, -0.1], [s*0.42, 1.38, 0.0]]; P(c.b, K.tube(pts, 0.05, 10, 6), 0x3a8a5a); const h = group(c.b, s*0.42, 1.42, 0.03); P(h, S(0.08, 10, 8), 0x3a8a5a, 0, 0, 0, 0, 0, 0, 1, 0.8, 1.4); [-1, 1].forEach(q=>{ P(h, S(0.02, 6, 4), 0xffd23d, q*0.04, 0.04, 0.08); }); P(h, CO(0.012, 0.05, 3), 0xf4f0d8, 0, -0.04, 0.1, PI); }); },
  offhand(c){ const g = group(c.armL, 0, -0.36, 0.02); g.rotation.x = 1.1; GUN.pistol(g); glow(c.R, g, 0.05, 0xb36bff, 0, 0.03, 0.53); },
  gremlin(c){ const g = group(c.b, -0.3, 1.0, -0.05); c.R.anim.push({ o:g, bob:0.03, speed:9 }); P(g, S(0.09, 10, 8), 0x5ab03a); P(g, S(0.07, 10, 8), 0x5ab03a, 0, 0.12, 0.02); [-1, 1].forEach(s=>{ P(g, CO(0.03, 0.12, 4), 0x5ab03a, s*0.08, 0.15, 0, 0, 0, -s*1.2); glow(c.R, g, 0.018, 0xffe14a, s*0.03, 0.13, 0.08); }); P(g, BX(0.06, 0.012, 0.01), 0x2a1010, 0, 0.09, 0.085); },
  boomerang(c){ P(c.b, BX(0.4, 0.06, 0.03), 0xc8783a, -0.08, 0.82, -0.36, 0, 0, 0.5); P(c.b, BX(0.3, 0.06, 0.03), 0xc8783a, 0.12, 0.8, -0.36, 0, 0, -0.6); },
  papershield(c){ P(c.armL, BX(0.24, 0.3, 0.015), 0xf0ead8, -0.06, -0.18, 0.12, 0, 0, 0.1); P(c.armL, BX(0.12, 0.012, 0.012), 0x3a2a1a, -0.06, -0.12, 0.13); P(c.armL, BX(0.15, 0.012, 0.012), 0x3a2a1a, -0.06, -0.18, 0.13); },
  rocketsback(c){ [-0.12, 0, 0.12].forEach((x, i)=>{ P(c.b, CY(0.04, 0.04, 0.28, 8), [0xd83a3a, 0x46a8ff, 0xffd23d][i], x, 0.85, -0.38, 0.2); P(c.b, CO(0.045, 0.08, 8), 0xf0f0f0, x, 1.02, -0.42, 0.2); }); },
  alarmclock(c){ const g = group(c.b, 0.3, 0.46, 0.1); P(g, CY(0.07, 0.07, 0.05, 14), 0xd83a3a, 0, 0, 0, PI/2); P(g, CY(0.055, 0.055, 0.052, 14), 0xf8f8f0, 0, 0, 0.002, PI/2); [-1, 1].forEach(s=> P(g, S(0.03, 6, 4), 0xd8d8e0, s*0.05, 0.07, 0)); P(g, BX(0.008, 0.04, 0.01), 0x101010, 0, 0.015, 0.03); },
  sodacan(c){ P(c.b, CY(0.04, 0.04, 0.12, 10), 0x46a8ff, 0.31, 0.44, -0.06); P(c.b, CY(0.041, 0.041, 0.03, 10), 0xffffff, 0.31, 0.45, -0.06); },
  fangs(c){ [-1, 1].forEach(s=> P(c.head, CO(0.018, 0.07, 4), 0xffffff, s*0.035, -0.09, 0.2, PI)); },
  angrybrows(c){ [-1, 1].forEach(s=> P(c.head, BX(0.11, 0.035, 0.04), 0xf2f2f6, s*0.085, 0.13, 0.205, 0, 0, s*0.45)); },
  tadpolejar(c){ P(c.b, CY(0.06, 0.06, 0.13, 10), 0xd8eef8, 0.31, 0.45, 0.02); P(c.b, CY(0.065, 0.065, 0.025, 10), 0x8a5a2a, 0.31, 0.53, 0.02); [[-0.02, 0.43], [0.02, 0.47]].forEach(([x, y])=> P(c.b, S(0.018, 6, 4), 0x2a3a2a, 0.31 + x, y, 0.06)); },
  frogbrolly(c){ const g = group(c.b, -0.18, 1.0, -0.3); g.rotation.z = 0.3; P(g, CY(0.008, 0.008, 0.7, 4), 0x6a4a2a, 0, 0.2, 0); P(g, new THREE.SphereGeometry(0.32, 12, 6, 0, PI*2, 0, PI/2), 0x5ac83a, 0, 0.5, 0, 0, 0, 0, 1, 0.5, 1); [-1, 1].forEach(s=>{ P(g, S(0.05, 8, 6), 0x5ac83a, s*0.1, 0.65, 0.12); P(g, S(0.025, 6, 4), 0x101010, s*0.1, 0.67, 0.16); }); },
  seashell(c){ P(c.head, CO(0.05, 0.12, 8), 0xffb8c8, 0.24, 0.0, 0.0, 0, 0, -PI/2); P(c.head, TO(0.04, 0.012), 0xff8aa8, 0.21, 0.0, 0.0, 0, PI/2); },
  snail(c){ const g = group(c.hat, -0.25, 0.08, 0.15); P(g, TO(0.045, 0.03), 0xc8783a, 0, 0.04, 0, 0, 0.6); P(g, S(0.02, 6, 4), 0xe8d0a0, 0.05, 0.01, 0.03, 0, 0, 0, 2, 0.8, 1); [-1, 1].forEach(s=> P(g, CY(0.004, 0.004, 0.04, 3), 0xe8d0a0, 0.08, 0.04, 0.03 + s*0.01)); },
  goblet(c){ P(c.b, CO(0.05, 0.08, 10), GOLD, -0.3, 0.5, 0.12, PI); P(c.b, CY(0.012, 0.012, 0.06, 6), GOLD, -0.3, 0.43, 0.12); P(c.b, S(0.04, 8, 6), 0x46a8ff, -0.3, 0.53, 0.12, 0, 0, 0, 1, 0.4, 1); },
  kaleido(c){ P(c.head, CY(0.03, 0.035, 0.2, 8), 0x8a5ae8, -0.08, 0.05, 0.3, PI/2); [0xff4a6a, 0x46e4ff, 0xffd23d].forEach((col, i)=> P(c.head, TO(0.033, 0.006), col, -0.08, 0.05, 0.22 + i*0.06)); },
  handmirror(c){ const g = group(c.b, 0.3, 0.42, -0.1); g.rotation.z = 0.4; P(g, CY(0.012, 0.012, 0.12, 6), GOLD, 0, -0.08, 0); P(g, CY(0.07, 0.07, 0.015, 14), GOLD, 0, 0.02, 0, PI/2); glow(c.R, g, 0.05, 0xe8f8ff, 0, 0.02, 0.01); },
  elementgems(c){ DG.ELEMENT_ORDER.forEach((el, i)=>{ const a = -0.8 + i*0.4; glow(c.R, c.b, 0.025, DG.ELEMENTS[el].color, Math.sin(a)*0.31, 0.62, Math.cos(a)*0.31); }); },
  snowhat(c){ P(c.hat, new THREE.SphereGeometry(0.42, 16, 6, 0, PI*2, 0, PI*0.2), 0xf8fcff, 0, -0.33, 0); for(let i=0;i<5;i++){ const a = i*1.3; P(c.hat, S(0.04, 6, 4), 0xf8fcff, Math.cos(a)*0.2, 0.42, Math.sin(a)*0.06); } },
  bandage(c){ P(c.head, TO(0.215, 0.03), 0xf0ead8, 0, 0.12, 0, PI/2 - 0.2, 0, 0.15); P(c.head, BX(0.05, 0.05, 0.02), 0xd83a3a, 0.12, 0.17, 0.17); }
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
 * ================================================================== */
Models.frog = function(twin, buffs){
  buffs = buffs || [];
  const has = id=> buffs.indexOf(id) >= 0;
  const R = rig("frog"), b = R.body;
  R.anim = [];
  const G1 = twin ? 0x3ab08a : 0x5ac83a, G2 = twin ? 0x2a8a6a : 0x3e9a28, BELLY = twin ? 0xb8e8c8 : 0xd8f08a;
  const SCARF = has("doom") ? 0x2a1a3a : has("croak") ? 0x8ad8ff : twin ? 0x3a6ad8 : 0xd83a3a;
  P(b, S(0.32, 16, 12), G1, 0, 0.27, -0.02, 0, 0, 0, 1.15, 0.78, 1.05);
  P(b, S(0.27, 14, 10), BELLY, 0, 0.21, 0.09, 0, 0, 0, 1.0, 0.62, 0.92);
  P(b, S(0.25, 14, 10), G1, 0, 0.37, 0.18, 0, 0, 0, 1.22, 0.72, 0.95);
  [-1, 1].forEach(s=>{
    P(b, S(0.11, 12, 8), G1, s*0.14, 0.5, 0.2);
    P(b, S(0.088, 12, 8), 0xfafae8, s*0.14, 0.53, 0.25);
    P(b, S(0.048, 8, 6), 0x101010, s*0.14, 0.535, 0.325, 0, 0, 0, 1.4, 0.6, 0.6);
    P(b, S(0.02, 6, 4), 0xffffff, s*0.14 + 0.02, 0.555, 0.335);
    P(b, BX(0.1, 0.022, 0.03), G2, s*0.14, 0.61, 0.25, 0, 0, s*0.2);
    P(b, S(0.055, 8, 6), 0xf8a0a0, s*0.2, 0.33, 0.3, 0, 0, 0, 1, 0.5, 0.4);
    P(b, S(0.012, 4, 3), 0x2a3a1a, s*0.035, 0.42, 0.37);
    // back legs, folded, and big flat feet with round toe pads
    P(b, S(0.13, 10, 8), G2, s*0.27, 0.17, -0.12, 0, 0, 0, 0.8, 1, 1.3);
    P(b, S(0.11, 10, 6), G2, s*0.31, 0.03, 0.05, 0, 0, 0, 1, 0.35, 1.5);
    [-0.06, 0, 0.06].forEach(t=> P(b, S(0.032, 6, 4), BELLY, s*0.31 + t, 0.03, 0.21));
    // front legs
    P(b, CY(0.035, 0.04, 0.18, 8), G1, s*0.17, 0.1, 0.25, 0.2);
    P(b, S(0.05, 8, 6), G2, s*0.18, 0.02, 0.29, 0, 0, 0, 1.2, 0.4, 1.2);
  });
  P(b, TO(0.15, 0.014, PI), 0x2a3a1a, 0, 0.35, 0.335, 0, 0, PI);
  [[0.12, 0.42, -0.2], [-0.15, 0.38, -0.12], [0.02, 0.48, -0.08], [0.2, 0.32, -0.25], [-0.08, 0.36, -0.3], [-0.24, 0.26, -0.18]].forEach(([x, y, z])=> P(b, S(0.035, 6, 4), G2, x, y, z));
  // his scarf, knotted at the side, tails flapping
  P(b, TO(0.25, 0.045), SCARF, 0, 0.28, 0.1, PI/2 - 0.25);
  P(b, S(0.055, 8, 6), SCARF, 0.2, 0.27, 0.22);
  [[0.24, 0.18, 0.2, 0.5], [0.27, 0.2, 0.14, 0.9]].forEach(([x, y, z, r])=> P(b, BX(0.06, 0.15, 0.03), SCARF, x, y, z, 0, 0, r));
  // the crown (Royal Crown), hidden until he earns it
  const crown = group(b, 0, 0.6, 0.12); crown.visible = false; R.parts.crown = crown;
  P(crown, CY(0.11, 0.12, 0.07, 10), GOLD);
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(crown, CO(0.025, 0.08, 4), GOLD, Math.cos(a)*0.11, 0.07, Math.sin(a)*0.11); }
  // what he's learned, he wears
  buffs.forEach(id=>{ if(FROG_OUTFIT[id]) FROG_OUTFIT[id]({ R, b, G1, G2 }); });
  // the tongue: not baked, so the view can stretch it
  const tongue = new THREE.Mesh(CY(0.035, 0.05, 1, 8), K.lambert(0xff6a8a));
  tongue.geometry = tongue.geometry.clone(); tongue.geometry.rotateX(PI/2); tongue.geometry.translate(0, 0, 0.5);
  tongue.position.set(0, 0.33, 0.3); tongue.scale.set(1, 1, 0.01); tongue.visible = false; b.add(tongue); R.parts.tongue = tongue;
  R.h = 0.75;
  finish(R, { w:0.022 });
  return R;
};

/* Gribbus' tricks, worn (head at about (0, 0.37, 0.18), eyes on top at y 0.5) */
const FROG_OUTFIT = {
  tongue(c){ P(c.b, S(0.04, 8, 6), 0xff6a8a, 0.04, 0.31, 0.36, 0, 0, 0, 1, 0.6, 1.3); },
  spit(c){ [[0.12, 0.45, -0.18], [-0.1, 0.42, -0.22], [0.0, 0.5, -0.05], [0.18, 0.35, -0.08]].forEach(([x, y, z])=> P(c.b, S(0.035, 6, 4), 0xc8ff3a, x, y, z)); glow(c.R, c.b, 0.025, 0x9cff3a, -0.04, 0.29, 0.36); },
  croak(c){ for(let i=0;i<5;i++){ const a = -0.9 + i*0.45; P(c.b, CO(0.022, 0.1, 4), 0xd8f4ff, Math.sin(a)*0.25, 0.22, 0.1 + Math.cos(a)*0.25, PI); } },
  hop(c){ [[0, 0.55, -0.22, 0.4], [0.03, 0.47, -0.27, -0.4], [0, 0.39, -0.3, 0.4]].forEach(([x, y, z, r])=> P(c.b, BX(0.04, 0.1, 0.03), 0xffe14a, x, y, z, -0.6, 0, r)); glow(c.R, c.b, 0.03, 0xfff04a, 0, 0.47, -0.3); },
  brood(c){ [[-0.12, 0.5, -0.12], [0.08, 0.52, -0.15], [0.0, 0.47, -0.25]].forEach(([x, y, z])=>{ P(c.b, S(0.045, 8, 6), 0x2a3a2a, x, y, z); P(c.b, CO(0.025, 0.09, 5), 0x3a4a3a, x, y, z - 0.07, -PI/2); }); },
  lily(c){ P(c.b, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14, 1, false, 0.3, PI*2 - 0.6), 0x4aa83a, 0, 0.62, 0.15, 0.2); P(c.b, S(0.04, 8, 6), 0xffa8d8, 0.06, 0.66, 0.18); },
  gulp(c){ P(c.b, CO(0.13, 0.16, 3), 0xf8f8f0, 0, 0.24, 0.32, PI + 0.4, 0, 0, 1, 1, 0.25); },
  crown(c){ /* the crown is already on him, hidden until now */ },
  bigboy(c){ [-1, 1].forEach(s=> P(c.b, S(0.08, 8, 6), c.G2, s*0.22, 0.22, 0.24, 0, 0, 0, 1.3, 1, 1)); },
  flyhunt(c){ const g = group(c.b, 0.15, 0.85, 0.1); c.R.anim.push({ o:g, bob:0.06, speed:11 }); glow(c.R, g, 0.04, 0xffd23d); [-1, 1].forEach(s=>{ const w = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color:0xfff8d0, transparent:true, opacity:0.7, side:THREE.DoubleSide })); w.position.set(s*0.05, 0.02, 0); w.rotation.set(-0.5, 0, s*0.5); g.add(w); c.R.glows.push(w); }); },
  mirror(c){ [[-0.1, 0.45, 0.25], [0.15, 0.4, 0.1]].forEach(([x, y, z])=> glow(c.R, c.b, 0.02, 0xffffff, x, y, z)); },
  bubble(c){ P(c.b, CY(0.015, 0.015, 0.15, 6), 0x8a5a2a, 0.12, 0.3, 0.38, PI/2, 0, -0.3); P(c.b, CY(0.04, 0.03, 0.06, 8), 0x8a5a2a, 0.18, 0.33, 0.45); const bub = new THREE.Mesh(S(0.08, 12, 8), new THREE.MeshPhongMaterial({ color:0xb8f0ff, transparent:true, opacity:0.5, shininess:90 })); bub.position.set(0.2, 0.46, 0.48); c.b.add(bub); c.R.glows.push(bub); c.R.anim.push({ o:bub, bob:0.04, speed:3 }); },
  doom(c){ P(c.b, new THREE.SphereGeometry(0.3, 14, 8, 0, PI*2, 0, PI*0.55), 0x1a1020, 0, 0.36, -0.1, -0.5, 0, 0, 1.1, 0.9, 1); [-1, 1].forEach(s=> glow(c.R, c.b, 0.025, 0xff2a3a, s*0.14, 0.535, 0.33)); },
  twin(c){},
  zoomies(c){ P(c.b, TO(0.2, 0.02), 0xd83a3a, 0, 0.5, 0.18, PI/2 - 0.2); [-1, 1].forEach(s=>{ P(c.b, CY(0.07, 0.07, 0.04, 10), 0x2a2a34, s*0.14, 0.56, 0.24, PI/2 - 0.5); P(c.b, CY(0.055, 0.055, 0.042, 10), 0xffa040, s*0.14, 0.565, 0.245, PI/2 - 0.5); }); },
  sticky(c){ P(c.b, S(0.03, 6, 4), 0xff8ab8, -0.06, 0.26, 0.36, 0, 0, 0, 1, 1.8, 1); }
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
  bsPaint(sock, FL, FL2, 4, 3, (c, x, y, z)=>{ if(Math.abs(bsN(x, y, z, 5, 1)) < 0.05) c.lerp(bsC.setHex(0x8a1a2a), 0.7); });
  P(float, sock, 0xffffff, 0, -0.05, -0.62);
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

/* keep the moving bits of a costume moving: the cape flares when he runs, things bob, spin and flicker */
Models.animate = function(R, t, speed){
  if(R.parts.cape) R.parts.cape.rotation.x = Math.min(0.55, (speed || 0)*0.09) + Math.sin(t*7.5)*0.03*(0.3 + Math.min(1, (speed || 0)/3));
  const A = R.anim || [];
  for(let i=0;i<A.length;i++){
    const a = A[i];
    if(a.spin) a.o.rotation.y = t*a.spin;
    if(a.bob){ if(a.y0 === undefined) a.y0 = a.o.position.y; a.o.position.y = a.y0 + Math.sin(t*a.speed + i*1.3)*a.bob; }
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
  const liquid = new THREE.Mesh(geo("vial-blood", ()=> K.lathe([[0, -0.155], [0.08, -0.15], [0.122, -0.09], [0.127, -0.02], [0.1, 0.04], [0.0, 0.045]], 16)), K.basic(0xb0101a));
  s.add(liquid);
  const surf = new THREE.Mesh(geo("vial-surf", ()=> new THREE.CircleGeometry(0.1, 20).rotateX(-PI/2)), K.basic(0xff3a2a)); surf.position.y = 0.045; s.add(surf);
  const glass = new THREE.Mesh(geo("vial-glass", ()=> K.lathe(vialProf, 18)), lootGlass(0xc8b8b0, 0.22)); s.add(glass);
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
    runeStone(g); g.userData.spin = 3; g.userData.hover = 0.5;
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
const RELIC = 0x7a5e2a, RELIC2 = 0x3a2a14;
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
    P(root, CY(0.085, 0.085, 0.24, 16), 0x8a6a30, 0, -0.06, 0);
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
    const glyph = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.28), new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 40, { size:28, bg:"#16161c", fg:DG.TIERS[d.tier].color }) }));
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
/* on a pedestal, three candles drift round the offering */
Models.offer = function(o){
  const g = o.kind === "item" ? Models.powerup(o.id) : o.kind === "gun" ? Models.item(o.gun) : Models.item({ kind:o.kind });
  const R = rig("offer"), ring = group(g, 0, 0, 0);
  for(let i=0;i<3;i++){ const a = i/3*PI*2 + 0.5; bsCandle(R, ring, Math.cos(a)*0.42, -0.42 + (i % 2)*0.05, Math.sin(a)*0.42, 0.12 + (i % 3)*0.04, 0.9); }
  K.bake(ring, { w:0.015 });
  return g;
};

/* a Gribbus buff on a lily pad: a mossy bronze token with its letter */
Models.frogBuffIcon = function(id){
  const d = DG.FROG_BUFFS[id], g = new THREE.Group(), R = rig("fb"), root = group(g, 0, 0, 0);
  P(root, bsPaint(K.sculpt(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 28, 1).rotateX(PI/2), 0.006, 20, 2), 0x3a5228, 0x16220e, 14, 1), 0xffffff);
  P(root, geo("fb-rim", ()=> new THREE.TorusGeometry(0.22, 0.026, 6, 32)), 0x6a5a2a);
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(root, S(0.014, 6, 4), 0x8a7a3a, Math.cos(a)*0.22, Math.sin(a)*0.22, 0.025); }
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ map:K.textTex([d.name[0]], 32, 32, { size:24, bg:"#1a2e14", fg:"#d8f0a8" }) }));
  face.position.z = 0.035; root.add(face);
  const back = face.clone(); back.rotation.y = PI; back.position.z = -0.035; root.add(back);
  halo(R, root, 0x9cff6a, 1, 0, 0, 0, 0.35);
  if(d.locked) halo(R, root, 0xffd23d, 1.4, 0, 0, 0, 0.45);
  finish(R, { w:0.015 });
  return g;
};

})();
