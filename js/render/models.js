/* ------------------------------------------------------------------ *
 *  Everyone, built from lumps the way Pine Hollow built its Bigfoot:
 *  faceted, hand-placed, jointed in groups so they can bob, waddle,
 *  wind up and fall over.
 *
 *  The wizard: a purple robe, a beard, a hat with ambitions, and a gun.
 *  The goblins: green, big-eared, yellow-eyed, each type with its own
 *  kit so you can tell them apart across a room. Grubnok: all of that,
 *  much more of it, and a crown.
 *
 *  Every model faces +z and stands on the ground at its origin.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const Models = DG.Models = {};

function rig(){
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  return { root, body, mats:[], parts:{}, muzzle:new THREE.Object3D(), h:1.4 };
}
function L(R, c, extra){ const m = new THREE.MeshLambertMaterial(Object.assign({ color:c }, extra)); R.mats.push(m); return m; }
function mesh(parent, g, m, x, y, z){ const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); parent.add(o); return o; }
function glowBall(parent, r, c, x, y, z){ return mesh(parent, new THREE.SphereGeometry(r, 6, 4), K.basic(c), x, y, z); }

/* ---- guns: point down +z, muzzle at the end ---- */
const GUN = {
  pistol(R, g, el){
    mesh(g, new THREE.BoxGeometry(0.1, 0.18, 0.12), L(R, 0x5a3a22), 0, -0.08, -0.05).rotation.x = 0.3;
    const b = mesh(g, new THREE.CylinderGeometry(0.045, 0.05, 0.36, 6), L(R, 0x3a3a44), 0, 0.02, 0.12); b.rotation.x = Math.PI/2;
    glowBall(g, 0.05, el, 0, 0.02, 0.32);
    R.muzzle.position.set(0, 0.02, 0.34);
  },
  smg(R, g, el){
    mesh(g, new THREE.BoxGeometry(0.12, 0.14, 0.42), L(R, 0x2e2e36), 0, 0, 0.05);
    mesh(g, new THREE.BoxGeometry(0.06, 0.22, 0.08), L(R, 0x1e1e24), 0, -0.15, 0.08);
    const b = mesh(g, new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), L(R, 0x4a4a54), 0, 0.02, 0.34); b.rotation.x = Math.PI/2;
    mesh(g, new THREE.BoxGeometry(0.13, 0.03, 0.2), K.basic(el), 0, 0.08, 0.05);
    R.muzzle.position.set(0, 0.02, 0.45);
  },
  shotgun(R, g, el){
    mesh(g, new THREE.BoxGeometry(0.11, 0.13, 0.34), L(R, 0x6a4022), 0, -0.02, -0.05);
    const b = mesh(g, new THREE.CylinderGeometry(0.11, 0.06, 0.5, 8), L(R, 0xb08a3a), 0, 0.03, 0.3); b.rotation.x = Math.PI/2;
    const rim = mesh(g, new THREE.TorusGeometry(0.1, 0.025, 4, 8), K.basic(el), 0, 0.03, 0.55);
    R.muzzle.position.set(0, 0.03, 0.58);
  },
  rifle(R, g, el){
    mesh(g, new THREE.BoxGeometry(0.09, 0.14, 0.5), L(R, 0x5a3a22), 0, -0.02, -0.08);
    const b = mesh(g, new THREE.CylinderGeometry(0.028, 0.034, 0.9, 6), L(R, 0x2a2e36), 0, 0.03, 0.55); b.rotation.x = Math.PI/2;
    const sc = mesh(g, new THREE.CylinderGeometry(0.045, 0.045, 0.24, 6), L(R, 0x1a1e24), 0, 0.12, 0.12); sc.rotation.x = Math.PI/2;
    glowBall(g, 0.035, el, 0, 0.12, 0.25);
    R.muzzle.position.set(0, 0.03, 1.0);
  },
  launcher(R, g, el){
    const t = mesh(g, new THREE.CylinderGeometry(0.13, 0.13, 0.7, 8), L(R, 0x4a5a3a), 0, 0.04, 0.15); t.rotation.x = Math.PI/2;
    const rim = mesh(g, new THREE.TorusGeometry(0.13, 0.03, 4, 8), L(R, 0x2a2a30), 0, 0.04, 0.5);
    mesh(g, new THREE.BoxGeometry(0.06, 0.18, 0.08), L(R, 0x3a2a1a), 0, -0.12, 0);
    glowBall(g, 0.06, el, 0, 0.18, 0.05);
    R.muzzle.position.set(0, 0.04, 0.52);
  }
};
Models.gun = function(base, element, R){
  R = R || rig();
  const g = new THREE.Group();
  (GUN[base] || GUN.pistol)(R, g, DG.ELEMENTS[element].color);
  g.add(R.muzzle);
  return g;
};

/* ---- the wizard ---- */
Models.wizard = function(){
  const R = rig(), b = R.body;
  const robe = L(R, 0x7a4ad8), robe2 = L(R, 0x4e30a0), skin = L(R, 0xf0c8a0), white = L(R, 0xeeeeee), gold = L(R, 0xe8c040);
  const r = mesh(b, new THREE.ConeGeometry(0.42, 1.0, 8), robe, 0, 0.5, 0);
  mesh(b, new THREE.CylinderGeometry(0.43, 0.45, 0.12, 8), robe2, 0, 0.06, 0);
  const belt = mesh(b, new THREE.TorusGeometry(0.25, 0.04, 4, 10), gold, 0, 0.62, 0); belt.rotation.x = Math.PI/2;
  // the head, with a beard you could lose a goblin in
  const head = new THREE.Group(); head.position.y = 1.08; b.add(head); R.parts.head = head;
  mesh(head, new THREE.SphereGeometry(0.19, 8, 6), skin);
  const beard = mesh(head, new THREE.ConeGeometry(0.17, 0.5, 6), white, 0, -0.2, 0.08); beard.rotation.x = Math.PI + 0.25;
  mesh(head, K.lump(0.06, 0, 0.2), skin, 0, -0.01, 0.19);
  for(const s of [-1, 1]){ mesh(head, new THREE.SphereGeometry(0.03, 4, 3), K.basic(0x101018), s*0.07, 0.04, 0.16); mesh(head, new THREE.BoxGeometry(0.09, 0.025, 0.02), white, s*0.07, 0.1, 0.17); }
  // the hat, slightly bent at the top as all good hats are
  const hat = new THREE.Group(); hat.position.y = 0.14; head.add(hat); R.parts.hat = hat;
  mesh(hat, new THREE.CylinderGeometry(0.44, 0.44, 0.04, 12), robe2, 0, 0, 0);
  mesh(hat, new THREE.ConeGeometry(0.26, 0.5, 8), robe, 0, 0.25, 0);
  const tip = new THREE.Group(); tip.position.y = 0.48; hat.add(tip); R.parts.tip = tip;
  const t2 = mesh(tip, new THREE.ConeGeometry(0.12, 0.34, 6), robe, 0.06, 0.12, -0.02); t2.rotation.z = -0.5;
  glowBall(tip, 0.04, 0xffe680, 0.17, 0.24, -0.02);
  mesh(hat, new THREE.OctahedronGeometry(0.05), K.basic(0xffe680), 0, 0.22, 0.2);
  // arms; the right one holds the gun
  const armR = new THREE.Group(); armR.position.set(0.28, 0.78, 0.05); b.add(armR); R.parts.armR = armR;
  mesh(armR, new THREE.ConeGeometry(0.1, 0.35, 6), robe, 0, -0.05, 0.08).rotation.x = Math.PI/2 + 0.6;
  mesh(armR, new THREE.SphereGeometry(0.07, 5, 4), skin, 0, -0.08, 0.22);
  const gunHolder = new THREE.Group(); gunHolder.position.set(0, -0.06, 0.24); armR.add(gunHolder); R.parts.gun = gunHolder;
  const armL = new THREE.Group(); armL.position.set(-0.28, 0.78, 0.05); b.add(armL);
  mesh(armL, new THREE.ConeGeometry(0.1, 0.35, 6), robe, 0, -0.05, 0.08).rotation.x = Math.PI/2 + 0.9;
  mesh(armL, new THREE.SphereGeometry(0.07, 5, 4), skin, 0.05, -0.12, 0.2);
  b.scale.setScalar(1.15);
  R.h = 2.1;
  return R;
};
Models.setGun = function(R, gun){
  const h = R.parts.gun;
  while(h.children.length) h.remove(h.children[0]);
  R.muzzle = new THREE.Object3D();
  h.add(Models.gun(gun.base, gun.element, R));
  R.gunKey = gun.uid;
};

/* ---- goblins ---- */
const GOB = { skin:0x5aa83a, dark:0x3e7a2a, eye:0xffe14a, cloth:0x6a4a2a, metal:0x8a8a94 };
Models.goblin = function(kind, opts){
  opts = opts || {};
  const R = rig(), b = R.body;
  const size = { grunt:1, slinger:0.92, bomber:1, shaman:1, brute:1.75, sneak:0.95, merchant:1, king:2.5 }[kind] || 1;
  const skinC = kind === "brute" ? 0x4a8a30 : kind === "king" ? 0x6ab040 : kind === "sneak" ? 0x3e6a3a : GOB.skin;
  const skin = L(R, skinC), dark = L(R, GOB.dark), cloth = L(R, kind === "shaman" ? 0x4a2a6a : kind === "king" ? 0xa02a2a : GOB.cloth);
  const eyeM = K.basic(kind === "shaman" ? 0x9cff3a : GOB.eye);
  b.scale.setScalar(size);
  // pot belly and stubby legs
  const legs = []; for(const s of [-1, 1]){ const l = new THREE.Group(); l.position.set(s*0.13, 0.28, 0); b.add(l); mesh(l, new THREE.CylinderGeometry(0.06, 0.07, 0.28, 5), dark, 0, -0.14, 0); mesh(l, K.lump(0.08, 0, 0.3), dark, 0, -0.26, 0.05).scale.set(1, 0.6, 1.5); legs.push(l); }
  R.parts.legs = legs;
  const belly = mesh(b, K.lump(0.3, 1, 0.12), skin, 0, 0.5, 0); belly.scale.set(1, 0.9, 0.95);
  mesh(b, new THREE.CylinderGeometry(0.29, 0.25, 0.16, 7), cloth, 0, 0.36, 0);
  // the head: ears out to here
  const head = new THREE.Group(); head.position.set(0, 0.86, 0.04); b.add(head); R.parts.head = head;
  mesh(head, K.lump(0.22, 1, 0.15), skin);
  for(const s of [-1, 1]){
    const ear = mesh(head, new THREE.ConeGeometry(0.08, 0.38, 4), skin, s*0.27, 0.06, -0.02); ear.rotation.z = -s*1.25; ear.rotation.y = s*0.3;
    mesh(head, new THREE.SphereGeometry(0.045, 5, 4), eyeM, s*0.09, 0.05, 0.18);
  }
  const nose = mesh(head, new THREE.ConeGeometry(0.05, 0.2, 4), skin, 0, -0.01, 0.25); nose.rotation.x = Math.PI/2;
  for(const s of [-1, 1]){ const tooth = mesh(head, new THREE.ConeGeometry(0.02, 0.06, 3), L(R, 0xf0f0d8), s*0.05, -0.12, 0.17); tooth.rotation.x = Math.PI; }
  // arms
  const arm = s=>{ const a = new THREE.Group(); a.position.set(s*0.3, 0.6, 0.05); b.add(a); mesh(a, new THREE.CylinderGeometry(0.05, 0.05, 0.3, 5), skin, 0, -0.12, 0); mesh(a, K.lump(0.07, 0, 0.3), skin, 0, -0.28, 0.04); return a; };
  const armR = arm(1), armL = arm(-1); R.parts.armR = armR; R.parts.armL = armL;
  const hand = new THREE.Group(); hand.position.set(0, -0.28, 0.06); armR.add(hand);
  // each kind's kit
  if(kind === "grunt"){
    const blade = mesh(hand, new THREE.BoxGeometry(0.04, 0.08, 0.42), L(R, GOB.metal), 0, 0, 0.18);
    mesh(hand, new THREE.BoxGeometry(0.05, 0.05, 0.12), L(R, 0x4a3020), 0, 0, -0.02);
    mesh(head, new THREE.SphereGeometry(0.2, 7, 4, 0, Math.PI*2, 0, Math.PI/2), L(R, 0x7a6a5a), 0, 0.08, 0);
  } else if(kind === "slinger"){
    const sl = mesh(hand, new THREE.TorusGeometry(0.1, 0.012, 3, 8, Math.PI), L(R, 0x8a6a4a), 0, -0.1, 0.05); sl.rotation.y = Math.PI/2;
    mesh(hand, K.lump(0.06, 0, 0.3), L(R, 0x888888), 0, -0.2, 0.05);
    mesh(b, new THREE.BoxGeometry(0.16, 0.16, 0.08), L(R, 0x6a4a2a), -0.2, 0.42, -0.24);
  } else if(kind === "bomber"){
    mesh(hand, new THREE.SphereGeometry(0.12, 7, 5), L(R, 0x1a1a1e), 0, 0, 0.08);
    glowBall(hand, 0.03, 0xffa040, 0, 0.13, 0.08);
    const band = mesh(b, new THREE.TorusGeometry(0.3, 0.04, 3, 10), L(R, 0x4a3020), 0, 0.55, 0); band.rotation.set(Math.PI/2, 0.6, 0);
    for(const s of [-1, 1]) mesh(head, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), L(R, 0x88d8ff, { emissive:0x204060 }), s*0.09, 0.08, 0.19).rotation.x = Math.PI/2;
  } else if(kind === "shaman"){
    const st = mesh(hand, new THREE.CylinderGeometry(0.025, 0.025, 1.1, 5), L(R, 0x5a3a20), 0, 0.3, 0.05);
    mesh(hand, K.lump(0.09, 0, 0.2), L(R, 0xe8e0c8), 0, 0.88, 0.05);
    R.parts.gem = glowBall(hand, 0.05, 0x9cff3a, 0, 0.98, 0.05);
    for(let i=0;i<5;i++){ const f = mesh(head, new THREE.ConeGeometry(0.04, 0.3, 3), L(R, [0xff4a4a, 0xffd23d, 0x46e4ff, 0xff4fd8, 0x9cff3a][i]), (i - 2)*0.08, 0.28, -0.08); f.rotation.z = (i - 2)*0.25; }
  } else if(kind === "brute"){
    const club = mesh(hand, new THREE.CylinderGeometry(0.11, 0.05, 0.75, 6), L(R, 0x6a4a2a), 0, 0, 0.3); club.rotation.x = Math.PI/2;
    for(let i=0;i<4;i++) mesh(hand, new THREE.ConeGeometry(0.03, 0.08, 3), L(R, GOB.metal), Math.cos(i*1.6)*0.1, Math.sin(i*1.6)*0.1, 0.55);
    for(const s of [-1, 1]) mesh(b, K.lump(0.14, 0, 0.2), L(R, 0x6a6a74), s*0.3, 0.72, 0);
  } else if(kind === "sneak"){
    const hood = mesh(head, new THREE.ConeGeometry(0.28, 0.5, 6), L(R, 0x1e1e26), 0, 0.12, -0.04);
    mesh(hand, new THREE.BoxGeometry(0.03, 0.05, 0.28), L(R, 0xb8c0d0), 0, 0, 0.12);
    R.mats.forEach(m=>{ m.transparent = true; });
  } else if(kind === "merchant"){
    mesh(head, new THREE.CylinderGeometry(0.17, 0.2, 0.3, 8), L(R, 0x2a2a3a), 0, 0.3, 0);
    mesh(head, new THREE.CylinderGeometry(0.3, 0.3, 0.03, 10), L(R, 0x2a2a3a), 0, 0.16, 0);
    mesh(head, new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8), L(R, 0xa02a2a), 0, 0.2, 0);
    mesh(b, new THREE.BoxGeometry(0.4, 0.5, 0.25), L(R, 0x6a4a2a), 0, 0.6, -0.3);
    for(const s of [-1, 1]) mesh(head, new THREE.TorusGeometry(0.05, 0.01, 3, 8), L(R, 0xffd23d), s*0.09, 0.05, 0.2);
  } else if(kind === "king"){
    const gold = L(R, 0xffc83a, { emissive:0x3a2a00 });
    const crown = new THREE.Group(); crown.position.y = 0.2; head.add(crown); R.parts.crown = crown;
    mesh(crown, new THREE.CylinderGeometry(0.17, 0.19, 0.12, 8, 1, true), gold, 0, 0, 0).material.side = THREE.DoubleSide;
    for(let i=0;i<6;i++){ const a = i/6*Math.PI*2; mesh(crown, new THREE.ConeGeometry(0.035, 0.12, 3), gold, Math.cos(a)*0.17, 0.11, Math.sin(a)*0.17); }
    glowBall(crown, 0.035, 0xff3a6a, 0, 0.02, 0.19);
    const cape = mesh(b, new THREE.ConeGeometry(0.42, 0.75, 8, 1, true, Math.PI*0.6, Math.PI*0.8), L(R, 0xa02a2a, { side:THREE.DoubleSide }), 0, 0.55, -0.02);
    cape.rotation.y = Math.PI;
    mesh(hand, new THREE.CylinderGeometry(0.03, 0.03, 0.8, 5), gold, 0, 0.2, 0.1);
    glowBall(hand, 0.07, 0xff3a6a, 0, 0.62, 0.1);
    belly.scale.set(1.25, 1.05, 1.2);
  }
  R.h = 1.25*size;
  R.size = size;
  return R;
};

/* ---- a frame of life: bob, waddle, wind-ups ---- */
Models.idle = function(R, t, speed){
  const s = Math.min(1, speed/3), ph = t*(6 + speed*1.5);
  R.body.position.y = Math.abs(Math.sin(ph))*0.06*s + Math.sin(t*2)*0.012;
  R.body.rotation.z = Math.sin(ph)*0.08*s;
  if(R.parts.legs) R.parts.legs.forEach((l, i)=> l.rotation.x = Math.sin(ph + i*Math.PI)*0.7*s);
  if(R.parts.armL) R.parts.armL.rotation.x = Math.sin(ph)*0.5*s;
  if(R.parts.tip) R.parts.tip.rotation.z = Math.sin(t*3)*0.15 + s*0.1;
  if(R.parts.gem) R.parts.gem.scale.setScalar(1 + 0.3*Math.sin(t*6));
};
/* tint every material: hit flash, statuses, elites */
Models.tint = function(R, hex, k){
  R.mats.forEach(m=>{ if(m.emissive){ m.emissive.setHex(hex); m.emissive.multiplyScalar(k); } });
};
Models.fade = function(R, a){
  R.mats.forEach(m=>{ m.transparent = a < 1; m.opacity = a; });
};

/* ---- things to pick up ---- */
const coinGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.04, 8); coinGeo.rotateX(Math.PI/2);
const coinBig = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8); coinBig.rotateX(Math.PI/2);
const coinM = new THREE.MeshLambertMaterial({ color:0xffc83a, emissive:0x553a00 });
Models.pickup = function(pk){
  const g = new THREE.Group();
  if(pk.kind === "gold"){ g.add(new THREE.Mesh(pk.value >= 5 ? coinBig : coinGeo, coinM)); g.userData.spin = 4; g.userData.hover = 0.3; }
  else if(pk.kind === "heart"){
    const m = K.lambert(0xff3a4a, { emissive:0x501018 });
    for(const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), m); l.position.set(s*0.09, 0.05, 0); g.add(l); }
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.22, 6), m); c.rotation.z = Math.PI; c.position.y = -0.08; g.add(c);
    g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "mana"){
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.16), K.lambert(0x46a8ff, { emissive:0x103060 })));
    g.add(K.sprite(0x46a8ff, 0.9, 0.5)); g.userData.spin = 2; g.userData.hover = 0.45;
  } else if(pk.kind === "item"){
    g.add(Models.item(pk.item));
    // a loot beam in the rarity's colour
    const col = pk.item.kind === "gun" ? DG.RARITY[pk.item.rarity].color : pk.item.kind === "rune" ? "#b36bff" : "#ffd23d";
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, 3, 6, 1, true), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
    beam.position.y = 1.2; g.add(beam);
    const pool = new THREE.Mesh(K.glowPlane, K.glowMat(new THREE.Color(col), 0.5)); pool.scale.set(1.6, 1, 1.6); pool.position.y = -0.55; g.add(pool);
    g.userData.spin = 1.2; g.userData.hover = 0.6;
  }
  return g;
};
Models.item = function(it){
  const g = new THREE.Group();
  if(it.kind === "gun"){ const gg = Models.gun(it.base, it.element); gg.scale.setScalar(1.5); gg.rotation.y = Math.PI/2; g.add(gg); g.add(K.sprite(DG.ELEMENTS[it.element].color, 0.9, 0.35)); }
  else if(it.kind === "rune"){
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.08), K.lambert(0x6a6a7a)); g.add(st);
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshBasicMaterial({ map:K.textTex([DG.RUNES[it.id].icon], 32, 40, { size:26, bg:"#3a3a48", fg:"#d8b0ff" }) }));
    mark.position.z = 0.045; g.add(mark);
    const back = mark.clone(); back.rotation.y = Math.PI; back.position.z = -0.045; g.add(back);
    g.add(K.sprite(0xb36bff, 1, 0.45));
  } else if(it.kind === "relic"){
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17), K.lambert(0xffd23d, { emissive:0x4a3a00 })); g.add(m);
    g.add(K.sprite(0xffd23d, 1, 0.4));
  } else if(it.kind === "heal"){
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 4, 0, Math.PI*2, Math.PI/2, Math.PI/2), K.lambert(0x8a6a4a, { side:THREE.DoubleSide })); g.add(bowl);
    const soup = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), K.lambert(0x6aa83a)); soup.rotation.x = -Math.PI/2; soup.position.y = -0.03; g.add(soup);
  }
  return g;
};

})();
