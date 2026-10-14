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
