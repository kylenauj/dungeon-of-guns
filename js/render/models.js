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
const S = (r, w, h)=> geo("s" + r + "," + (w || 14) + "," + (h || 10), ()=> new THREE.SphereGeometry(r, w || 14, h || 10));
const CY = (rt, rb, h, n)=> geo("c" + rt + "," + rb + "," + h + "," + (n || 12), ()=> new THREE.CylinderGeometry(rt, rb, h, n || 12));
const CO = (r, h, n)=> geo("o" + r + "," + h + "," + (n || 12), ()=> new THREE.ConeGeometry(r, h, n || 12));
const BX = (w, h, d)=> geo("b" + w + "," + h + "," + d, ()=> new THREE.BoxGeometry(w, h, d));
const TO = (r, t, a)=> geo("t" + r + "," + t + "," + (a || 0), ()=> new THREE.TorusGeometry(r, t, 8, 20, a || PI*2));
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
Models.gun = function(base, element, R){
  R = R || rig("gun");
  const g = new THREE.Group(), col = DG.ELEMENTS[element].color;
  const info = (GUN[base] || GUN.pistol)(g, col);
  const gem = glow(R, g, info.gem[3], col, info.gem[0], info.gem[1], info.gem[2]);
  halo(R, g, col, info.gem[3]*9, info.gem[0], info.gem[1], info.gem[2], 0.5);
  if(info.vents) [-0.07, 0.07].forEach(x=> glow(R, g, 0.02, col, x, 0.02, 0.18));
  R.muzzle = new THREE.Object3D(); R.muzzle.position.set(info.muzzle[0], info.muzzle[1], info.muzzle[2]); g.add(R.muzzle);
  R.gem = gem;
  return g;
};

/* ================================================================== *
 *  Zippy
 * ================================================================== */
const ROBE = 0x6b3fd0, ROBE2 = 0x4a2a9a, ROBE3 = 0x8a5ae8, SKIN = 0xf2c9a0, BEARD = 0xf2f2f6, GOLD = 0xf0c040;
Models.zippy = function(){
  const R = rig("zippy"), b = R.body;
  // the robe, flared at the hem, with stars sewn on
  const robeProf = [[0.0, 0.02], [0.47, 0.02], [0.45, 0.14], [0.37, 0.45], [0.29, 0.75], [0.22, 0.93], [0.15, 1.02], [0.0, 1.04]];
  P(b, K.lathe(robeProf, 22), ROBE);
  P(b, TO(0.46, 0.04), GOLD, 0, 0.06, 0, PI/2);
  P(b, TO(0.3, 0.04), 0x6a4220, 0, 0.62, 0, PI/2);
  P(b, BX(0.1, 0.08, 0.04), GOLD, 0, 0.62, 0.31);
  P(b, TO(0.17, 0.05), ROBE3, 0, 1.0, 0, PI/2);
  [[0.4, 0.3], [2.2, 0.5], [-0.8, 0.22], [3.6, 0.35], [-2.4, 0.6], [1.3, 0.78]].forEach(([a, y])=>{
    const rr = y < 0.45 ? 0.43 - (y - 0.14)*0.25 : 0.37 - (y - 0.45)*0.27;
    P(b, OC(0.04), GOLD, Math.sin(a)*(rr + 0.01), y, Math.cos(a)*(rr + 0.01), 0, a);
  });
  // boots peeking out
  [-1, 1].forEach(s=> P(b, S(0.1, 10, 8), 0x5a3a20, s*0.14, 0.05, 0.16, 0, 0, 0, 1, 0.6, 1.4));
  // the head
  const head = group(b, 0, 1.2, 0.02); R.parts.head = head;
  P(head, S(0.22, 16, 12), SKIN);
  [-1, 1].forEach(s=>{ P(head, S(0.055, 8, 6), 0xf0a0a0, s*0.13, -0.035, 0.15, 0, 0, 0, 1, 0.7, 0.6); P(head, S(0.05, 8, 6), SKIN, s*0.21, 0.01, 0); });
  P(head, S(0.065, 10, 8), 0xe8a888, 0, -0.005, 0.22);
  eyes(head, 0.08, 0.05, 0.16, 0.045);
  [-1, 1].forEach(s=> P(head, BX(0.1, 0.03, 0.035), BEARD, s*0.085, 0.12, 0.19, 0, 0, -s*0.15));
  // the beard, the moustache
  const beard = group(head, 0, -0.08, 0.07); R.parts.beard = beard;
  P(beard, K.lathe([[0.0, 0.02], [0.17, 0.0], [0.19, -0.12], [0.15, -0.3], [0.08, -0.44], [0.02, -0.52], [0, -0.53]], 14), BEARD, 0, 0, 0, 0, 0, 0, 1, 1, 0.75);
  [-1, 1].forEach(s=> P(head, CY(0.025, 0.04, 0.16, 8), BEARD, s*0.075, -0.045, 0.2, 0, 0, s*1.25));
  // the hat, a bit bent, with a moon on the band
  const hat = group(head, 0, 0.14, 0); R.parts.hat = hat;
  P(hat, K.lathe([[0, 0], [0.46, 0.0], [0.5, 0.025], [0.45, 0.05], [0.2, 0.06], [0, 0.06]], 22), ROBE2);
  P(hat, CY(0.17, 0.25, 0.32, 16), ROBE, 0, 0.2, 0);
  P(hat, TO(0.245, 0.032), GOLD, 0, 0.08, 0, PI/2);
  P(hat, TO(0.06, 0.018, PI*1.3), GOLD, 0, 0.12, 0.25, 0, 0, 0.8);
  const t1 = group(hat, 0, 0.36, 0); t1.rotation.z = -0.25;
  P(t1, CY(0.1, 0.17, 0.26, 14), ROBE, 0, 0.12, 0);
  const t2 = group(t1, 0, 0.25, 0); t2.rotation.z = -0.5; R.parts.tip = t2;
  P(t2, CO(0.1, 0.26, 12), ROBE3, 0, 0.12, 0);
  glow(R, t2, 0.045, 0xffe680, 0, 0.27, 0);
  halo(R, t2, 0xffe680, 0.5, 0, 0.27, 0, 0.7);
  // sleeves and hands; the right one holds the gun
  const arm = (s)=>{
    const a = group(b, s*0.3, 0.86, 0.04);
    P(a, K.lathe([[0.06, 0], [0.08, -0.12], [0.13, -0.28], [0.12, -0.31], [0.0, -0.3]], 12), ROBE, 0, 0, 0);
    P(a, TO(0.12, 0.025), GOLD, 0, -0.29, 0, PI/2);
    P(a, S(0.075, 10, 8), SKIN, 0, -0.34, 0);
    a.rotation.x = -1.1;
    return a;
  };
  R.parts.armR = arm(1); R.parts.armL = arm(-1); R.parts.armL.rotation.z = -0.3; R.parts.armL.position.x = -0.25;
  const gunHolder = group(R.parts.armR, 0, -0.36, 0.02); gunHolder.rotation.x = 1.1; R.parts.gun = gunHolder;
  R.h = 2.1;
  finish(R);
  return R;
};
Models.wizard = Models.zippy;
Models.setGun = function(R, gun){
  const h = R.parts.gun;
  while(h.children.length) h.remove(h.children[0]);
  const gr = rig("gun");
  const g = Models.gun(gun.base, gun.element, gr);
  K.bake(g, { mat:K.toon(), w:0.018 });
  h.add(g);
  R.muzzle = gr.muzzle; R.gunGlows = gr.glows; R.gunKey = gun.uid;
  R.gunMats = []; g.traverse(o=>{ if(o.material && o.userData.baked) R.gunMats.push(o.material); });
};

/* ================================================================== *
 *  Gribbus (and Grobbus)
 * ================================================================== */
Models.frog = function(twin){
  const R = rig("frog"), b = R.body;
  const G1 = twin ? 0x3ab08a : 0x5ac83a, G2 = twin ? 0x2a8a6a : 0x3e9a28, BELLY = twin ? 0xb8e8c8 : 0xd8f08a;
  P(b, S(0.32, 16, 12), G1, 0, 0.27, -0.02, 0, 0, 0, 1.15, 0.78, 1.05);
  P(b, S(0.27, 14, 10), BELLY, 0, 0.21, 0.09, 0, 0, 0, 1.0, 0.62, 0.92);
  P(b, S(0.25, 14, 10), G1, 0, 0.37, 0.18, 0, 0, 0, 1.22, 0.72, 0.95);
  [-1, 1].forEach(s=>{
    P(b, S(0.11, 12, 8), G1, s*0.14, 0.5, 0.2);
    P(b, S(0.088, 12, 8), 0xfafae8, s*0.14, 0.53, 0.25);
    P(b, S(0.048, 8, 6), 0x101010, s*0.14, 0.535, 0.325, 0, 0, 0, 1.4, 0.6, 0.6);
    P(b, S(0.02, 6, 4), 0xffffff, s*0.14 + 0.02, 0.555, 0.335);
    P(b, S(0.055, 8, 6), 0xf8a0a0, s*0.2, 0.33, 0.3, 0, 0, 0, 1, 0.5, 0.4);
    // back legs, folded, and big flat feet
    P(b, S(0.13, 10, 8), G2, s*0.27, 0.17, -0.12, 0, 0, 0, 0.8, 1, 1.3);
    P(b, S(0.11, 10, 6), G2, s*0.31, 0.03, 0.05, 0, 0, 0, 1, 0.35, 1.5);
    [-0.06, 0, 0.06].forEach(t=> P(b, S(0.03, 6, 4), G2, s*0.31 + t, 0.03, 0.2));
    // front legs
    P(b, CY(0.035, 0.04, 0.18, 8), G1, s*0.17, 0.1, 0.25, 0.2);
    P(b, S(0.05, 8, 6), G2, s*0.18, 0.02, 0.29, 0, 0, 0, 1.2, 0.4, 1.2);
  });
  P(b, TO(0.15, 0.014, PI), 0x2a3a1a, 0, 0.35, 0.335, 0, 0, PI);
  [[0.12, 0.42, -0.2], [-0.15, 0.38, -0.12], [0.02, 0.48, -0.08], [0.2, 0.32, -0.25], [-0.08, 0.36, -0.3]].forEach(([x, y, z])=> P(b, S(0.035, 6, 4), G2, x, y, z));
  // the crown (Royal Crown), hidden until he earns it
  const crown = group(b, 0, 0.6, 0.12); crown.visible = false; R.parts.crown = crown;
  P(crown, CY(0.11, 0.12, 0.07, 10), GOLD);
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(crown, CO(0.025, 0.08, 4), GOLD, Math.cos(a)*0.11, 0.07, Math.sin(a)*0.11); }
  // the tongue: not baked, so the view can stretch it
  const tongue = new THREE.Mesh(CY(0.035, 0.05, 1, 8), new THREE.MeshLambertMaterial({ color:0xff6a8a }));
  tongue.geometry = tongue.geometry.clone(); tongue.geometry.rotateX(PI/2); tongue.geometry.translate(0, 0, 0.5);
  tongue.position.set(0, 0.33, 0.3); tongue.scale.set(1, 1, 0.01); tongue.visible = false; b.add(tongue); R.parts.tongue = tongue;
  R.h = 0.75;
  finish(R, { w:0.022 });
  return R;
};

/* ================================================================== *
 *  Goblins
 * ================================================================== */
const GOB = { skin:0x5ab03a, dark:0x3e7a2a, eye:0xffe14a, cloth:0x7a5230, metal:0x9a9aa8 };
function goblinBody(R, o){
  const b = R.body, skin = o.skin || GOB.skin, dark = o.dark || GOB.dark;
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(b, s*0.13, 0.28, 0);
    P(l, CY(0.06, 0.07, 0.24, 8), dark, 0, -0.12, 0);
    P(l, S(0.09, 10, 6), o.boot || 0x4a3020, 0, -0.25, 0.05, 0, 0, 0, 1, 0.55, 1.5);
    legs.push(l);
  });
  R.parts.legs = legs;
  P(b, S(0.3, 16, 12), skin, 0, 0.5, 0, 0, 0, 0, 1.02, 0.92, 0.95);
  P(b, K.lathe([[0.28, 0], [0.31, 0.08], [0.29, 0.2], [0.22, 0.3]], 14), o.cloth || GOB.cloth, 0, 0.32, 0);
  // head: ears out to here, a nose like a parsnip, teeth
  const head = group(b, 0, 0.88, 0.04); R.parts.head = head;
  P(head, S(0.22, 16, 12), skin, 0, 0, 0, 0, 0, 0, 1.05, 0.92, 0.95);
  [-1, 1].forEach(s=>{
    P(head, CO(0.1, 0.42, 8), skin, s*0.3, 0.06, -0.02, 0, s*0.3, -s*1.3, 1, 1, 0.45);
    P(head, CO(0.06, 0.3, 6), 0xd88a8a, s*0.29, 0.06, 0.0, 0, s*0.3, -s*1.3, 1, 1, 0.3);
  });
  P(head, CO(0.06, 0.22, 8), skin, 0, -0.03, 0.26, PI/2 + 0.3);
  [-1, 1].forEach(s=>{
    const e = glow(R, head, 0.05, o.eye || GOB.eye, s*0.09, 0.05, 0.17);
    P(head, S(0.022, 6, 4), 0x101010, s*0.09, 0.05, 0.215);
    P(head, BX(0.1, 0.025, 0.03), dark, s*0.09, 0.12, 0.17, 0, 0, s*0.35);
    P(head, CO(0.02, 0.06, 4), 0xf4f0d8, s*0.05, -0.12, 0.17, PI);
  });
  P(head, BX(0.14, 0.03, 0.03), 0x2a1010, 0, -0.1, 0.18);
  const arm = s=>{ const a = group(b, s*0.31, 0.62, 0.05); P(a, CY(0.05, 0.055, 0.3, 8), skin, 0, -0.13, 0); P(a, S(0.07, 8, 6), skin, 0, -0.29, 0.04); return a; };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  R.hand = group(R.parts.armR, 0, -0.3, 0.06);
  return head;
}
const KITS = {
  grunt(R, head){
    P(head, S(0.21, 12, 6, ), 0x8a7a6a, 0, 0.09, 0, 0, 0, 0, 1, 0.55, 1);
    P(R.hand, BX(0.04, 0.12, 0.42), GOB.metal, 0, 0, 0.2); P(R.hand, BX(0.05, 0.05, 0.12), 0x4a3020, 0, 0, -0.03);
  },
  slinger(R, head){
    P(head, CO(0.26, 0.3, 10), 0x6a5a3a, 0, 0.15, -0.03);
    P(R.hand, TO(0.1, 0.012, PI), 0x8a6a4a, 0, -0.08, 0.05, 0, PI/2);
    P(R.hand, S(0.06, 8, 6), 0x9a9a9a, 0, -0.18, 0.05);
    P(R.body, BX(0.18, 0.18, 0.09), 0x6a4a2a, -0.2, 0.42, -0.25);
  },
  bomber(R, head){
    P(R.hand, S(0.13, 12, 8), 0x1a1a22, 0, 0, 0.08);
    glow(R, R.hand, 0.035, 0xffa040, 0, 0.14, 0.08);
    P(R.body, TO(0.31, 0.045), 0x4a3020, 0, 0.55, 0, PI/2, 0.6);
    [-1, 1].forEach(s=> P(head, CY(0.065, 0.065, 0.05, 12), 0x88d8ff, s*0.09, 0.07, 0.19, PI/2));
    P(head, TO(0.2, 0.02), 0x3a2a1a, 0, 0.07, 0.02, 0, 0, 0, 1, 1, 0.9);
  },
  shaman(R, head){
    P(R.hand, CY(0.025, 0.025, 1.15, 6), 0x5a3a20, 0, 0.32, 0.05);
    P(R.hand, S(0.1, 10, 8), 0xece4cc, 0, 0.92, 0.05);
    R.parts.gem = glow(R, R.hand, 0.055, 0x9cff3a, 0, 1.03, 0.05);
    halo(R, R.hand, 0x9cff3a, 0.6, 0, 1.03, 0.05, 0.5);
    for(let i=0;i<5;i++) P(head, CO(0.04, 0.32, 4), [0xff4a4a, 0xffd23d, 0x46e4ff, 0xff4fd8, 0x9cff3a][i], (i - 2)*0.08, 0.28, -0.08, 0, 0, (i - 2)*0.25);
    P(head, CY(0.16, 0.18, 0.14, 10), 0xd8c8a0, 0, 0.02, 0.15, PI/2);
  },
  brute(R, head){
    P(R.hand, CY(0.12, 0.05, 0.8, 8), 0x6a4a2a, 0, 0, 0.3, PI/2);
    for(let i=0;i<5;i++) P(R.hand, CO(0.03, 0.09, 4), GOB.metal, Math.cos(i*1.3)*0.11, Math.sin(i*1.3)*0.11, 0.6);
    [-1, 1].forEach(s=>{ P(R.body, S(0.15, 10, 6), 0x6a6a74, s*0.3, 0.74, 0); P(head, CO(0.05, 0.22, 6), 0xe8e0c8, s*0.16, 0.18, 0, 0, 0, -s*0.6); });
    P(head, S(0.22, 12, 6), 0x5a5a64, 0, 0.08, 0, 0, 0, 0, 1, 0.5, 1);
  },
  sneak(R, head){
    P(head, CO(0.29, 0.52, 10), 0x22222c, 0, 0.13, -0.04);
    P(R.hand, BX(0.03, 0.05, 0.3), 0xb8c0d0, 0, 0, 0.13);
  },
  merchant(R, head){
    P(head, CY(0.17, 0.2, 0.3, 12), 0x2a2a3a, 0, 0.3, 0);
    P(head, CY(0.3, 0.3, 0.03, 16), 0x2a2a3a, 0, 0.16, 0);
    P(head, CY(0.18, 0.18, 0.06, 12), 0xa02a2a, 0, 0.2, 0);
    P(R.body, BX(0.42, 0.52, 0.26), 0x6a4a2a, 0, 0.6, -0.3);
    P(head, TO(0.05, 0.01), GOLD, 0.09, 0.05, 0.21);
  },
  king(R, head){
    const crown = group(head, 0, 0.2, 0); R.parts.crown = crown;
    P(crown, CY(0.17, 0.19, 0.12, 12), GOLD);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(crown, CO(0.035, 0.12, 4), GOLD, Math.cos(a)*0.17, 0.11, Math.sin(a)*0.17); }
    glow(R, crown, 0.035, 0xff3a6a, 0, 0.02, 0.19);
    P(R.body, K.lathe([[0.42, 0], [0.4, 0.4], [0.3, 0.72]], 16), 0xa02a2a, 0, 0.2, -0.05, 0, 0, 0, 1, 1, 0.8);
    P(R.hand, CY(0.03, 0.03, 0.85, 6), GOLD, 0, 0.2, 0.1);
    glow(R, R.hand, 0.07, 0xff3a6a, 0, 0.64, 0.1);
    P(R.body, S(0.36, 14, 10), GOB.skin, 0, 0.52, 0.06, 0, 0, 0, 1.2, 1, 1.15);
  }
};
Models.goblin = function(kind){
  const R = rig(kind);
  const size = { grunt:1, slinger:0.92, bomber:1, shaman:1, brute:1.75, sneak:0.95, merchant:1, king:2.5 }[kind] || 1;
  const skin = kind === "brute" ? 0x4a8a30 : kind === "king" ? 0x6ab040 : kind === "sneak" ? 0x3e6a3a : GOB.skin;
  const head = goblinBody(R, { skin, cloth:kind === "shaman" ? 0x4a2a6a : kind === "king" ? 0xa02a2a : GOB.cloth, eye:kind === "shaman" ? 0x9cff3a : GOB.eye });
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
  [[0.1, 0.55, 0.12], [-0.14, 0.48, 0.18], [0.2, 0.36, 0.2], [-0.05, 0.6, -0.08], [-0.2, 0.4, -0.12]].forEach(([x, y, z])=> P(b, S(0.04, 6, 4), 0xc8b890, x, y, z));
  eyes(b, 0.09, 0.4, 0.24, 0.05);
  P(b, TO(0.06, 0.012, PI), 0x3a2a1a, 0, 0.3, 0.28, 0, 0, PI);
  [-1, 1].forEach(s=> P(b, S(0.07, 8, 6), 0xc8b890, s*0.13, 0.05, 0.03, 0, 0, 0, 1, 0.6, 1.3));
  R.h = 0.7; return finish(R);
};
Models.toadstool = function(){
  const R = rig("toadstool"), b = R.body;
  P(b, CY(0.2, 0.26, 0.6, 14), 0xf0e8d8, 0, 0.3, 0);
  const cap = group(b, 0, 0.62, 0); R.parts.head = cap;
  P(cap, new THREE.SphereGeometry(0.5, 18, 10, 0, PI*2, 0, PI/2), 0xd8302a, 0, 0, 0, 0, 0, 0, 1, 0.75, 1);
  P(cap, new THREE.CircleGeometry(0.5, 18), 0xd8c8b0, 0, 0.0, 0, PI/2);
  capSpots(cap, 0.5, 0.02, 9, 0xfaf4ea);
  eyes(b, 0.08, 0.38, 0.22, 0.045);
  [-1, 1].forEach(s=> P(b, BX(0.08, 0.02, 0.02), 0x3a1a10, s*0.08, 0.46, 0.25, 0, 0, s*0.4));
  R.h = 1.1; return finish(R);
};
function shroomPerson(R, size, capCol, spotCol){
  const b = R.body;
  const legs = [];
  [-1, 1].forEach(s=>{ const l = group(b, s*0.11, 0.2, 0); P(l, CY(0.06, 0.07, 0.2, 8), 0xe8dcc8, 0, -0.1, 0); P(l, S(0.07, 8, 6), 0x8a6a4a, 0, -0.2, 0.04, 0, 0, 0, 1, 0.5, 1.4); legs.push(l); });
  R.parts.legs = legs;
  P(b, K.lathe([[0.18, 0], [0.22, 0.15], [0.2, 0.4], [0.16, 0.55], [0, 0.56]], 14), 0xf0e6d4, 0, 0.18, 0);
  const cap = group(b, 0, 0.72, 0); R.parts.head = cap;
  P(cap, new THREE.SphereGeometry(0.42, 16, 10, 0, PI*2, 0, PI/2), capCol, 0, -0.04, 0, 0, 0, 0, 1, 0.7, 1);
  P(cap, new THREE.CircleGeometry(0.42, 16), 0xc8b8a0, 0, -0.04, 0, PI/2);
  capSpots(cap, 0.42, -0.02, 8, spotCol);
  eyes(b, 0.07, 0.56, 0.18, 0.042);
  P(b, TO(0.05, 0.01, PI), 0x3a2a1a, 0, 0.47, 0.21, 0, 0, PI);
  const arm = s=>{ const a = group(b, s*0.22, 0.52, 0.03); P(a, CY(0.04, 0.045, 0.24, 8), 0xe8dcc8, 0, -0.11, 0); P(a, S(0.055, 8, 6), 0xe8dcc8, 0, -0.24, 0.03); return a; };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
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
  [-1, 1].forEach(s=>{ P(float, S(0.075, 10, 8), 0x101020, s*0.12, 0.7, 0.33, 0, 0, 0, 1, 1.4, 0.5); P(float, S(0.08, 8, 6), 0xe8f2ff, s*0.42, 0.42, 0.08, 0, 0, s*0.6, 1, 0.6, 1); });
  P(float, S(0.06, 8, 6), 0x101020, 0, 0.52, 0.36, 0, 0, 0, 1.2, 1.5, 0.5);
  halo(R, float, 0xa8d8ff, 1.6, 0, 0.5, 0, 0.35);
  R.h = 1.4; R.ghostly = true; return finish(R);
};
Models.banshee = function(){
  const R = rig("banshee"), b = R.body;
  const float = group(b, 0, 0.3, 0); R.parts.head = float;
  P(float, sheet(R, 0, 1.25, 0.46), 0xb8d0ff);
  P(float, K.lathe([[0, 1.32], [0.3, 1.2], [0.36, 0.9], [0.34, 0.55], [0.0, 0.5]], 14), 0x2a2a48, 0, 0, -0.06, 0, 0, 0, 1, 1, 0.8);
  P(float, S(0.2, 12, 10), 0xd8e4ff, 0, 1.0, 0.1);
  [-1, 1].forEach(s=>{ glow(R, float, 0.035, 0x9cf0ff, s*0.07, 1.04, 0.28); const a = group(float, s*0.36, 0.85, 0.05); P(a, CY(0.04, 0.06, 0.5, 8), 0xb8d0ff, 0, 0.2, 0, 0, 0, -s*0.4); });
  P(float, S(0.06, 8, 6), 0x101020, 0, 0.92, 0.27, 0, 0, 0, 1, 1.6, 0.5);
  halo(R, float, 0x8ab8ff, 2, 0, 0.8, 0, 0.35);
  R.h = 1.7; R.ghostly = true; return finish(R);
};
Models.skeleton = function(){
  const R = rig("skeleton"), b = R.body, BONE = 0xe8e2cc;
  const legs = [];
  [-1, 1].forEach(s=>{ const l = group(b, s*0.1, 0.42, 0); P(l, CY(0.03, 0.03, 0.4, 6), BONE, 0, -0.2, 0); P(l, BX(0.08, 0.04, 0.16), BONE, 0, -0.4, 0.04); legs.push(l); });
  R.parts.legs = legs;
  P(b, TO(0.12, 0.03), BONE, 0, 0.44, 0, PI/2);
  P(b, CY(0.025, 0.025, 0.45, 6), BONE, 0, 0.66, -0.02);
  [0.6, 0.7, 0.8].forEach((y, i)=> P(b, TO(0.15 - i*0.02, 0.022), BONE, 0, y, 0.02, PI/2, 0, 0, 1, 1.2, 1));
  const head = group(b, 0, 1.02, 0.02); R.parts.head = head;
  P(head, S(0.17, 14, 10), BONE);
  P(head, BX(0.2, 0.08, 0.14), BONE, 0, -0.12, 0.05);
  [-1, 1].forEach(s=>{ P(head, S(0.05, 8, 6), 0x101010, s*0.065, 0.02, 0.13); glow(R, head, 0.018, 0xff4a3a, s*0.065, 0.02, 0.16); });
  const arm = s=>{ const a = group(b, s*0.2, 0.86, 0.02); P(a, CY(0.025, 0.025, 0.34, 6), BONE, 0, -0.16, 0); return a; };
  R.parts.armR = arm(1); R.parts.armL = arm(-1);
  R.hand = group(R.parts.armL, 0, -0.32, 0.05);
  P(R.hand, TO(0.3, 0.02, PI), 0x6a4a2a, 0, 0, 0.05, 0, PI/2, PI/2);
  R.h = 1.25; return finish(R);
};
Models.poltergeist = function(){
  const R = rig("poltergeist"), b = R.body;
  const float = group(b, 0, 0.35, 0); R.parts.head = float;
  P(float, K.lathe([[0, 1.0], [0.28, 0.9], [0.38, 0.55], [0.3, 0.2], [0.1, 0.0], [0, 0.0]], 16), 0x3a2a5a);
  [-1, 1].forEach(s=> glow(R, float, 0.05, 0xb8ff6a, s*0.1, 0.72, 0.28));
  const orbit = group(b, 0, 0.8, 0); R.parts.orbit = orbit;
  [0, 2.1, 4.2].forEach((a, i)=> P(orbit, i === 1 ? BX(0.16, 0.16, 0.16) : S(0.1, 10, 8), i === 1 ? 0x7a5232 : 0xb8885a, Math.cos(a)*0.62, Math.sin(a*2)*0.1, Math.sin(a)*0.62));
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
  P(parent, CY(r*0.22, r*0.22, 0.025, 14), 0x080808, 0, y, r*1.0, PI/2);
  P(parent, S(r*0.08, 6, 4), 0xffffff, r*0.15, y + r*0.15, r*1.02);
}
Models.watcher = function(){
  const R = rig("watcher"), b = R.body;
  const float = group(b, 0, 0.9, 0); R.parts.head = float;
  eyeball(R, float, 0.38, 0xd84aff, 0);
  P(float, new THREE.SphereGeometry(0.4, 16, 8, 0, PI*2, 0, PI*0.3), 0x6a2a5a, 0, 0, 0, -0.3);
  for(let i=0;i<4;i++){ const a = i/4*PI*2 + 0.4; P(b, K.tube([[Math.cos(a)*0.15, 0.6, Math.sin(a)*0.15], [Math.cos(a)*0.3, 0.3, Math.sin(a)*0.3], [Math.cos(a)*0.25, 0.05, Math.sin(a)*0.25]], 0.05, 8, 6), 0x8a3a7a); }
  halo(R, float, 0xd84aff, 1.6, 0, 0, 0.3, 0.3);
  R.h = 1.5; return finish(R);
};
function blob(R, r, col){
  const b = R.body;
  const goo = new THREE.Mesh(S(r, 18, 14), new THREE.MeshPhongMaterial({ color:col, transparent:true, opacity:0.82, shininess:80, emissive:new THREE.Color(col).multiplyScalar(0.25) }));
  goo.position.y = r*0.8; goo.scale.set(1.1, 0.8, 1.1); b.add(goo); R.parts.goo = goo; R.glows.push(goo);
  const inner = group(b, 0, r*0.85, 0); R.parts.head = inner;
  eyes(inner, r*0.28, r*0.12, r*0.45, r*0.18);
  [[0.3, 0.2, -0.2], [-0.25, -0.1, -0.1], [0.05, -0.3, 0.2]].forEach(([x, y, z])=> P(inner, S(r*0.1, 6, 4), new THREE.Color(col).multiplyScalar(1.4).getHex(), x*r, y*r, z*r));
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
    P(g, S(0.035, 6, 4), 0xf0a8d8, 0, 0.17, r - 0.01);
    parent = g;
  }
  P(segs[4], CO(0.07, 0.2, 8), 0x8a3a8a, 0, 0.42, 0);
  R.parts.segs = segs;
  P(b, CY(0.36, 0.4, 0.06, 16), 0x3a1a2a, 0, 0.02, 0);
  R.h = 1.6; return finish(R);
};

/* ================================================================== *
 *  Bosses
 * ================================================================== */
Models.king = function(){ return Models.goblin("king"); };
Models.matriarch = function(){
  const R = rig("matriarch"), b = R.body;
  // a frilly skirt, a stalk of a body, a honeycomb cap
  P(b, K.lathe([[0.0, 0.02], [1.0, 0.0], [0.95, 0.18], [0.7, 0.45], [0.5, 0.9], [0.0, 0.95]], 22), 0xf0e2c8);
  const cap = group(b, 0, 1.0, 0); R.parts.head = cap;
  const g = K.lathe([[0.0, 1.5], [0.4, 1.4], [0.75, 1.05], [0.95, 0.55], [0.9, 0.15], [0.55, 0.0], [0, 0]], 24);
  K.paint(g, 0xb08850, (c, x, y, z)=>{ const a = Math.atan2(z, x); if(Math.sin(a*9)*Math.sin(y*14) > 0.25) c.multiplyScalar(0.45); });
  P(cap, g, 0xffffff);
  eyes(b, 0.22, 0.75, 0.55, 0.1);
  P(b, TO(0.18, 0.025, PI), 0x3a2a1a, 0, 0.58, 0.6, 0, 0, PI);
  [-1, 1].forEach(s=>{ const a = group(b, s*0.6, 0.7, 0.2); P(a, CY(0.07, 0.09, 0.5, 8), 0xf0e2c8, 0, -0.2, 0, 0, 0, s*0.6); });
  for(let i=0;i<6;i++){ const a = i/6*PI*2; halo(R, b, 0x9cff6a, 0.5, Math.cos(a)*1.0, 0.1, Math.sin(a)*1.0, 0.5); }
  R.h = 2.6; return finish(R, { w:0.035 });
};
Models.bride = function(){
  const R = rig("bride"), b = R.body;
  const float = group(b, 0, 0.3, 0); R.parts.head = float;
  P(float, K.lathe([[0, 1.5], [0.2, 1.42], [0.28, 1.1], [0.3, 0.85], [0.55, 0.4], [0.75, 0.05], [0, 0.05]], 20), 0xe8ecff);
  P(float, S(0.2, 14, 10), 0xd8e0ff, 0, 1.6, 0.03);
  P(float, K.lathe([[0.0, 1.95], [0.26, 1.75], [0.4, 1.3], [0.55, 0.6], [0.0, 0.6]], 18), 0xf8f8ff, 0, 0, -0.08, 0, 0, 0, 1, 1, 0.9);
  [-1, 1].forEach(s=>{ glow(R, float, 0.04, 0x8ae8ff, s*0.075, 1.62, 0.18); });
  P(float, S(0.12, 10, 8), 0x5a3a4a, 0, 0.95, 0.32);
  [[0.06, 1.0], [-0.06, 1.02], [0, 1.08]].forEach(([x, y])=> P(float, S(0.05, 8, 6), 0x8a5a7a, x, y, 0.38));
  halo(R, float, 0xa8d8ff, 3, 0, 1, 0, 0.35);
  R.h = 2.3; R.ghostly = true; return finish(R, { w:0.03 });
};
Models.eye = function(){
  const R = rig("eye"), b = R.body;
  const float = group(b, 0, 1.6, 0); R.parts.head = float;
  eyeball(R, float, 1.2, 0xff4a2a, 0);
  // eyelids that close when it blinks
  const top = group(float, 0, 0, 0), bot = group(float, 0, 0, 0);
  P(top, new THREE.SphereGeometry(1.26, 22, 12, 0, PI*2, 0, PI/2), 0x7a2a4a);
  P(bot, new THREE.SphereGeometry(1.26, 22, 12, 0, PI*2, PI/2, PI/2), 0x7a2a4a);
  top.rotation.x = -1.35; bot.rotation.x = 1.35;
  R.parts.lidT = top; R.parts.lidB = bot;
  for(let i=0;i<8;i++){ const a = i/8*PI*2; P(b, K.tube([[Math.cos(a)*0.6, 1.0, Math.sin(a)*0.6], [Math.cos(a)*1.4, 0.5, Math.sin(a)*1.4], [Math.cos(a + 0.4)*1.8, 0.05, Math.sin(a + 0.4)*1.8]], 0.13, 10, 8), 0x8a3a7a); }
  halo(R, float, 0xff4a2a, 4, 0, 0, 1, 0.3);
  R.h = 3.4; return finish(R, { w:0.04 });
};
Models.heart = function(){
  const R = rig("heart"), b = R.body;
  const beat = group(b, 0, 1.4, 0); R.parts.head = beat;
  P(beat, S(0.85, 20, 16), 0xa82a3a, -0.35, 0.1, 0, 0, 0, 0.3, 1, 1.1, 0.95);
  P(beat, S(0.85, 20, 16), 0xb83242, 0.35, 0.1, 0, 0, 0, -0.3, 1, 1.1, 0.95);
  P(beat, CO(0.95, 1.2, 20), 0xa02838, 0, -0.75, 0, PI);
  [[-0.3, 0.9, 0.1, 0.18], [0.2, 1.0, -0.1, 0.22], [0.55, 0.85, 0.05, 0.14]].forEach(([x, y, z, r])=> P(beat, CY(r*0.9, r, 0.8, 12), 0x8a2030, x, y, z));
  for(let i=0;i<7;i++){ const a = i*0.9; P(beat, K.tube([[Math.cos(a)*0.5, 0.6, 0.75], [Math.cos(a)*0.8, 0, 0.7], [Math.cos(a)*0.5, -0.6, 0.5]], 0.04, 10, 5), 0x4a1aa0); }
  for(let i=0;i<5;i++){ const a = i/5*PI*2; P(b, K.tube([[Math.cos(a)*0.6, 0.9, Math.sin(a)*0.6], [Math.cos(a)*1.4, 0.3, Math.sin(a)*1.4], [Math.cos(a)*2, 0.02, Math.sin(a)*2]], 0.12, 10, 6), 0x6a1a2a); }
  halo(R, beat, 0xff2a3a, 5, 0, 0, 0.5, 0.35);
  R.h = 3; return finish(R, { w:0.04 });
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
const coinM = new THREE.MeshLambertMaterial({ color:0xffc83a, emissive:0x553a00 });
Models.pickup = function(pk){
  const g = new THREE.Group();
  if(pk.kind === "gold"){ g.add(new THREE.Mesh(pk.value >= 5 ? coinBig : coinGeo, coinM)); g.userData.spin = 4; g.userData.hover = 0.3; }
  else if(pk.kind === "heart" || pk.kind === "flyheal"){
    const m = new THREE.MeshLambertMaterial({ color:0xff3a4a, emissive:0x501018 });
    const k = pk.kind === "flyheal" ? 0.5 : 1;
    for(const s of [-1, 1]){ const l = new THREE.Mesh(S(0.12*k), m); l.position.set(s*0.09*k, 0.05*k, 0); g.add(l); }
    const c = new THREE.Mesh(CO(0.17*k, 0.22*k), m); c.rotation.z = PI; c.position.y = -0.08*k; g.add(c);
    if(pk.kind === "flyheal") g.add(K.sprite(0xff8a9a, 0.6, 0.6));
    g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "mana"){
    g.add(new THREE.Mesh(OC(0.16), new THREE.MeshLambertMaterial({ color:0x46a8ff, emissive:0x103060 })));
    g.add(K.sprite(0x46a8ff, 0.9, 0.5)); g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "ward"){
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), new THREE.MeshLambertMaterial({ color:0x8ad8ff, emissive:0x2a5a8a })));
    g.add(K.sprite(0x8ad8ff, 1, 0.5)); g.userData.spin = 3; g.userData.hover = 0.5;
  } else if(pk.kind === "fly"){
    const m = new THREE.MeshLambertMaterial({ color:0xffd23d, emissive:0x8a6a00 });
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
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 16), new THREE.MeshLambertMaterial({ color:0x8ad8ff, emissive:0x2a5a8a })));
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
