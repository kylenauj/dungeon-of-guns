/* ------------------------------------------------------------------ *
 *  Rigs of their own (see Models.MOVES in models.js for the moves):
 *  the other bosses of the deep floors.
 *
 *  Old Mattock, the Gravedigger (the crypt): a tall, stooped dead man
 *  in a grave-soiled coat and a hat gone soft with rain, an iron-shod
 *  shovel in one hand and a hooded lantern of cold crypt-light in the
 *  other. He digs, he flings the dirt, he lifts the lantern, he calls.
 *
 *  The Antlered Hunger (the Gloomwood): a starved thing of the deep
 *  woods, a stag's skull for a head under a crown of antlers hung with
 *  moss and rags, ribs through grey hide, arms too long, claws.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, P, rig, group, glow, halo, finish, BS, bsN, bsPaint, bsBlob, bsLathe, bsCloth, bsTaper, bsJitter, bsRing, bsChain, bsTooth, meat, limb, bracket, sculptW, smooth } = H;
const C = new THREE.Color();
const clamp = (x, a, b)=> Math.max(a, Math.min(b, x));

/* the strike, in phases: u runs 0..1 through it (the view counts c.strike down from 1) */
function phases(c, m){
  // remember the wind-up's last value, so the strike carries on from where the wind-up left it
  if(c.tell >= 0){ m.lw = c.wind; m.lk = c.kind; }
  const u = 1 - c.strike;
  const go = c.strike > 0 ? smooth(0, 0.13, u) : 0;                 // the swing: very fast
  const back = c.strike > 0 ? smooth(0.42, 1, u) : 1;               // the recovery: slow
  const hit = go*(1 - back);                                        // at the strike's far end, held, then let go
  const over = c.strike > 0 ? Math.sin(clamp((u - 0.08)/0.22, 0, 1)*PI)*(1 - back) : 0;   // a jolt past the mark
  const carry = c.strike > 0 ? (m.lw || 0)*(1 - go) : 0;            // the wind-up pose, let go into the swing
  return { u, go, back, hit, over, carry, w:c.tell >= 0 ? c.wind : carry, k:c.tell >= 0 ? c.kind : m.lk };
}

/* ================================================================== *
 *  Old Mattock, the Gravedigger
 * ================================================================== */
const GD = { coat:0x37322a, coat2:0x15120e, soil:0x2c2218, shirt:0x4e4a3e, skin:0x76786e, skin2:0x34362f, hat:0x26231e, hat2:0x0e0d0b,
  iron:0x34343a, rust:0x5a3420, wood:0x4a3624, wood2:0x2a1e14, boot:0x1c1814, brass:0x5a4a2a, rope:0x6a5a40, cold:0xa8d8ff, cold2:0x5ac0ff };
const dirt = (c, x, y, z, low)=>{ if(y < low) c.lerp(C.setHex(GD.soil), clamp((low - y)/low*1.4, 0, 0.85)); if(bsN(x, y, z, 7, 3) > 0.5) c.lerp(C.setHex(GD.soil), 0.5); };

function gdShovel(g){
  // the haft: old ash, split and bound with wire; the grip a T of black iron
  P(g, bsJitter(new THREE.CylinderGeometry(0.03, 0.036, 1.62, 10, 8), 0.004, 9, 2), GD.wood, 0, -0.55, 0);
  P(g, CY(0.022, 0.022, 0.22, 8), GD.iron, 0, 0.27, 0, 0, 0, PI/2);
  P(g, CY(0.034, 0.034, 0.08, 8), GD.iron, 0, 0.22, 0);
  [-0.2, -0.62, -1.0].forEach(y=>{ for(let i=0;i<3;i++) P(g, bsRing(0.037, 0.006), 0x4a4a50, 0, y + i*0.018, 0, PI/2); });
  // the blade: a long iron spade, notched, its edge bright with use, rust everywhere else
  const bl = new THREE.BoxGeometry(0.36, 0.5, 0.03, 8, 10, 1), a = bl.attributes.position;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), t = (0.25 - y)/0.5;               // t: 0 at the socket, 1 at the edge
    a.setX(i, x*(0.86 + 0.14*Math.sin(Math.min(1, t*1.6)*PI*0.5)) * (t > 0.85 ? 1 - (t - 0.85)*1.6 : 1));
    a.setZ(i, a.getZ(i) + x*x*0.9 - 0.04*t);                            // dished, and swept forward
    if(t > 0.97 && Math.sin(x*61) > 0.6) a.setY(i, y + 0.03);           // notches in the edge
  }
  bl.computeVertexNormals();
  bsPaint(bl, GD.iron, GD.rust, 9, 4, (c, x, y)=>{ if(y < -0.19) c.lerp(C.setHex(0x8a8a90), 0.55); });
  P(g, bl, 0xffffff, 0, -1.6, 0.0);
  P(g, CY(0.045, 0.06, 0.18, 10), GD.iron, 0, -1.31, 0, 0, 0, 0, 1, 1, 0.8);
  [-1, 1].forEach(s=> P(g, BX(0.03, 0.2, 0.02), GD.iron, s*0.05, -1.3, 0.025, 0, 0, s*0.18));
  // grave earth caked on the blade
  [[0.06, -1.74, 0.03], [-0.09, -1.66, 0.035], [0.1, -1.55, -0.02], [-0.02, -1.79, 0.02]].forEach(([x, y, z], i)=> P(g, K.lump(0.03 + (i % 2)*0.015, 1, 0.4, i + 2), GD.soil, x, y, z, 0, 0, 0, 1.3, 0.8, 0.7));
}
function gdLantern(R, g){
  // a hooded crypt-lantern: an iron cage round a cold flame, a cowl of black tin, a ring to hang it by
  P(g, bsRing(0.04, 0.008), GD.iron, 0, 0.02, 0);
  P(g, CY(0.004, 0.004, 0.08, 4), GD.iron, 0, -0.03, 0);
  P(g, bsLathe([[0.012, 0.0], [0.07, -0.04], [0.12, -0.1], [0.13, -0.13]], 18), GD.hat, 0, -0.07, 0);
  P(g, CY(0.115, 0.115, 0.02, 16), GD.iron, 0, -0.205, 0);
  for(let i=0;i<6;i++){ const a = i/6*PI*2; P(g, BX(0.012, 0.24, 0.012), GD.iron, Math.cos(a)*0.1, -0.33, Math.sin(a)*0.1, 0, -a, 0); }
  P(g, CY(0.12, 0.1, 0.04, 16), GD.iron, 0, -0.47, 0);
  P(g, CO(0.03, 0.06, 6), GD.iron, 0, -0.52, 0, PI);
  // smoked glass, the cold flame in it
  const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.22, 16, 1, true), new THREE.MeshBasicMaterial({ color:0x4a6a80, transparent:true, opacity:0.55 }));
  gl.position.y = -0.33; g.add(gl); R.glows.push(gl);
  const f = glow(R, g, 0.045, GD.cold, 0, -0.35, 0); f.scale.set(1, 1.7, 1);
  halo(R, g, GD.cold2, 0.9, 0, -0.33, 0, 0.6);
  halo(R, g, GD.cold, 2.2, 0, -0.33, 0, 0.22);
}
function gdArm(parent, s, x, y, z){
  const sh = group(parent, x, y, z);
  P(sh, bsBlob(0.085, 1, 1, 1, 0.01, 12, s + 4, 14, 10), GD.coat, 0, -0.02, 0);
  const up = meat([[0, 0, 0], [s*0.01, -0.28, 0.01], [0, -0.56, 0]], t=> 0.072 - 0.012*t, 10, 10, s + 9);
  bsPaint(up, GD.coat, GD.coat2, 6, s + 2); P(sh, up, 0xffffff);
  const fo = group(sh, 0, -0.56, 0);
  P(fo, S(0.06, 10, 8), GD.coat, 0, 0, 0);
  const lo = meat([[0, 0, 0], [0, -0.24, 0.01], [0, -0.44, 0]], t=> 0.064 - 0.014*t, 10, 10, s + 3);
  bsPaint(lo, GD.coat, GD.coat2, 6, s + 5); P(fo, lo, 0xffffff);
  // the cuff, frayed, and a bony grey wrist out of it
  P(fo, K.tatter(bsLathe([[0.085, -0.5], [0.075, -0.4], [0.065, -0.34]], 16), -0.44, 9, 0.07, s + 1), GD.coat, 0, 0, 0);
  P(fo, CY(0.028, 0.034, 0.12, 8), GD.skin, 0, -0.52, 0);
  const hand = group(fo, 0, -0.6, 0.0);
  P(hand, bsBlob(0.05, 0.8, 1.15, 0.65, 0.006, 20, s + 7, 14, 10), GD.skin, 0, 0, 0);
  for(let k=0;k<4;k++){ const fx = -0.03 + k*0.02;
    P(hand, bsTaper([[fx, -0.02, 0.025], [fx, -0.07, 0.05], [fx*0.9, -0.1, 0.02], [fx*0.8, -0.09, -0.02]], 0.011, 0.007, 6, 6), GD.skin2); }
  P(hand, bsTaper([[s*-0.035, 0.0, 0.02], [s*-0.05, -0.04, 0.06], [s*-0.03, -0.07, 0.07]], 0.012, 0.008, 5, 6), GD.skin);
  return { sh, fo, hand };
}
Models.gravedigger = function(){
  const R = rig("gravedigger"), b = R.body, Pp = R.parts;
  // ---- the legs: long and thin in black wool, boots heavy with clay ----
  Pp.legs = [-1, 1].map(s=>{
    const l = group(b, s*0.15, 1.24, 0);
    const th = meat([[0, 0.02, 0], [s*0.01, -0.3, 0.03], [0, -0.6, 0.04]], t=> 0.085 - 0.015*t, 10, 10, s + 1);
    bsPaint(th, 0x2a2620, 0x14120f, 6, s); P(l, th, 0xffffff);
    const sn = meat([[0, -0.6, 0.04], [0, -0.9, 0.0], [0, -1.12, -0.01]], t=> 0.068 - 0.012*t, 10, 10, s + 2);
    bsPaint(sn, 0x2a2620, 0x14120f, 6, s + 1); P(l, sn, 0xffffff);
    const bt = bsBlob(0.09, 0.85, 0.7, 1.7, 0.008, 14, s + 5, 18, 12);
    bsPaint(bt, GD.boot, GD.soil, 5, s, (c, x, y)=>{ if(y < -0.02) c.lerp(C.setHex(GD.soil), 0.6); });
    P(l, bt, 0xffffff, 0, -1.18, 0.07);
    P(l, CY(0.075, 0.07, 0.18, 12), GD.boot, 0, -1.08, 0);
    P(l, bsRing(0.076, 0.012), 0x2a2018, 0, -1.0, 0, PI/2);
    [[0.05, -1.21, 0.15], [-0.04, -1.2, 0.0], [0.0, -1.06, 0.07]].forEach(([x, y, z], i)=> P(l, K.lump(0.025, 1, 0.4, i + s*3), GD.soil, x, y, z, 0, 0, 0, 1.2, 0.7, 1.1));
    return l;
  });
  // ---- the coat's skirt: long, split at the front and behind, the hem black with grave-earth ----
  const sk = group(b, 0, 0, 0); Pp.skirt = sk;
  const sprof = [[0.37, 0.1], [0.35, 0.45], [0.31, 0.85], [0.27, 1.2], [0.265, 1.42]];
  bsCloth(sk, sprof, GD.coat, GD.coat2, 0.3, 0.55, 22, 0.28, 3.3);
  sk.children.forEach(m=>{ if(m.geometry && m.geometry.attributes.position.count > 200) bsPaint(m.geometry, m.material.color.getHex(), GD.coat2, 3, 2, (c, x, y, z)=> dirt(c, x, y, z, 0.45)); m.material.color.setHex(0xffffff); });
  // a coil of rope at the hip and a ring of grave-bells on the belt
  for(let i=0;i<4;i++) P(b, bsRing(0.13 - i*0.004, 0.018), GD.rope, -0.33, 1.08 - i*0.03, 0.04, PI/2 + 0.25, 0, 0.35);
  P(b, meat([[-0.33, 0.96, 0.12], [-0.3, 0.7, 0.16], [-0.34, 0.5, 0.1]], ()=> 0.016, 8, 6, 3), GD.rope);

  // ---- the torso: stooped hard, the coat buttoned over nothing ----
  const tor = group(b, 0, 1.3, 0); tor.rotation.x = 0.32; R.tor = tor;
  const ch = bsLathe([[0.27, -0.06], [0.29, 0.25], [0.32, 0.55], [0.31, 0.78], [0.2, 0.92], [0.09, 0.98]], 36);
  ch.scale(1, 1, 0.78); sculptW(ch, 0.01, 9, 3);
  bsPaint(ch, GD.coat, GD.coat2, 5, 7, (c, x, y, z)=>{ if(z > 0.17 && Math.abs(x) < 0.03) c.multiplyScalar(0.5); });
  P(tor, ch, 0xffffff);
  // a hunch of a back
  P(tor, bsPaint(bsBlob(0.24, 1.2, 0.9, 0.8, 0.012, 9, 4, 24, 16), GD.coat, GD.coat2, 6, 1), 0xffffff, 0, 0.66, -0.1);
  // buttons (some gone), the shirt at the throat
  [0.15, 0.32, 0.49, 0.66].forEach((y, i)=>{ if(i !== 2) P(tor, S(0.017, 8, 6), 0x1a1612, 0.035, y, 0.245 - y*0.03); });
  P(tor, bsBlob(0.07, 1.2, 1, 0.6, 0.004, 20, 1, 12, 8), GD.shirt, 0, 0.86, 0.12);
  // belt and buckle
  P(tor, bsRing(0.29, 0.03), 0x1e1a14, 0, 0.0, 0, PI/2, 0, 0, 1, 0.78, 1);
  P(tor, BX(0.08, 0.07, 0.02), GD.brass, 0, 0.0, 0.235);
  const bells = group(tor, 0.26, -0.02, 0.07);
  P(bells, bsRing(0.07, 0.008), GD.iron, 0, 0, 0, PI/2 - 0.3, 0, 0.3);
  for(let i=0;i<5;i++){ const a = i/5*PI*2;
    const bg = group(bells, Math.cos(a)*0.07, -0.025 + Math.sin(a)*0.02, Math.sin(a)*0.07);
    P(bg, bsLathe([[0.002, 0.05], [0.016, 0.046], [0.022, 0.02], [0.032, -0.012]], 12), GD.brass, 0, -0.03, 0);
    P(bg, S(0.008, 6, 4), 0x2a2218, 0, -0.045, 0); }
  Pp.bells = bells;
  // a torn capelet over the shoulders, and the collar turned up against the cold
  bsCloth(tor, [[0.42, -0.34], [0.38, -0.1], [0.3, 0.04], [0.16, 0.1]], GD.coat, GD.coat2, 0.5, -0.12, 18, 0.16, 6.1, 0, 0.9, -0.02, 0, 0, 0, 1, 1, 0.82);
  P(tor, K.tatter(bsLathe([[0.17, 0.0], [0.19, 0.1], [0.2, 0.2]], 30, 0.9), 0.05, 10, 0.03, 2), GD.coat, 0, 0.9, -0.01, -0.15);
  // ---- the neck, thrust forward, and the head ----
  P(tor, meat([[0, 0.86, 0.0], [0, 0.98, 0.07], [0, 1.06, 0.15]], t=> 0.052 - 0.006*t, 8, 9, 4), GD.skin2);
  const hd = group(tor, 0, 1.08, 0.17); hd.rotation.x = -0.32; Pp.head = hd;
  const sk2 = bsBlob(0.12, 0.88, 1.22, 1.0, 0.012, 14, 6, 30, 22);
  // a long dead face: sunken cheeks, grey stubble on the jaw
  { const a = sk2.attributes.position; for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      if(z > 0.03 && y < 0.02 && y > -0.1 && Math.abs(x) > 0.035) a.setX(i, x*0.84);       // the cheeks fall in
      if(y < -0.06) { a.setZ(i, z*0.92 + 0.01); a.setX(i, a.getX(i)*0.88); }                  // a long narrow jaw
    } sk2.computeVertexNormals(); }
  bsPaint(sk2, GD.skin, GD.skin2, 9, 3, (c, x, y, z)=>{
    if(y < -0.03 && z > -0.02) c.lerp(C.setHex(0x2a2c26), clamp((-0.03 - y)*9, 0, 0.75)*(0.6 + 0.4*Math.sin(x*190)*Math.sin(y*170)));
    if(Math.abs(bsN(x, y, z, 30, 2)) < 0.04) c.lerp(C.setHex(0x4a2a2a), 0.4);
  });
  P(hd, sk2, 0xffffff);
  // sockets, deep, and a cold light far down each
  [-1, 1].forEach(s=>{
    P(hd, S(0.032, 10, 8), 0x1c1a18, s*0.045, 0.035, 0.088, 0, 0, s*0.25, 1.2, 0.9, 0.7);
    P(hd, S(0.025, 10, 8), 0x040304, s*0.045, 0.03, 0.098, 0, 0, s*0.25, 1.1, 0.8, 0.5);
    P(hd, BX(0.05, 0.012, 0.02), GD.skin2, s*0.047, 0.065, 0.1, 0, 0, s*-0.25);
    glow(R, hd, 0.0065, GD.cold, s*0.044, 0.028, 0.112); halo(R, hd, GD.cold2, 0.09, s*0.044, 0.028, 0.115, 0.5);
    P(hd, bsBlob(0.022, 0.5, 1, 0.8, 0.003, 30, s, 10, 8), GD.skin, s*0.118, 0.02, -0.01);                 // ears
  });
  P(hd, bsTaper([[0, 0.04, 0.11], [0, -0.0, 0.135], [0, -0.03, 0.14]], 0.016, 0.012, 6, 8), GD.skin);     // a long nose
  P(hd, BX(0.06, 0.008, 0.02), 0x0a0808, 0, -0.075, 0.105, 0.1);                                           // a slack mouth
  for(let i=0;i<4;i++) P(hd, BX(0.008, 0.013, 0.006), 0x8a8270, -0.018 + i*0.012, -0.07, 0.11);
  // lank hair, grey-black, from under the hat
  for(let i=0;i<14;i++){ const a = PI + (i/13 - 0.5)*3.2, r = 0.105;
    P(hd, bsTaper([[Math.sin(a)*r, 0.07, Math.cos(a)*r], [Math.sin(a)*(r + 0.03), -0.06, Math.cos(a)*(r + 0.02)], [Math.sin(a)*(r + 0.04) + Math.sin(i*3)*0.02, -0.17 - (i % 3)*0.04, Math.cos(a)*(r + 0.03)]], 0.011, 0.003, 6, 5), 0x2a2a28); }
  // the hat: a soft crown dented in, a broad brim that rain has bent down
  const hat = group(hd, 0, 0.11, -0.005); hat.rotation.set(0.12, 0, 0.07); Pp.hat = hat;
  const cr = bsLathe([[0.125, 0.0], [0.13, 0.06], [0.122, 0.12], [0.1, 0.155], [0.02, 0.15]], 28); sculptW(cr, 0.008, 18, 2);
  { const a = cr.attributes.position; for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i); if(y > 0.13 && Math.abs(x) < 0.05) a.setY(i, y - 0.03*(1 - Math.abs(x)/0.05)); if(y > 0.09 && z > 0.05) a.setY(i, a.getY(i) - 0.02); } cr.computeVertexNormals(); }
  bsPaint(cr, GD.hat, GD.hat2, 8, 2); P(hat, cr, 0xffffff);
  P(hat, bsRing(0.128, 0.016), 0x16130f, 0, 0.03, 0, PI/2);
  const brimP = [[0.47, -0.2], [0.41, -0.11], [0.28, -0.03], [0.125, 0.012]];
  const br = K.tatter(bsLathe(brimP, 48), -0.13, 26, 0.06, 4.4); sculptW(br, 0.01, 12, 1); bsPaint(br, GD.hat, GD.hat2, 6, 1, (c, x, y, z)=>{ c.multiplyScalar(0.8 + y*1.6); });
  P(hat, br, 0xffffff, 0, 0.0, 0, 0, 0, 0, 1, 1, 0.92);
  const bu = K.tatter(bsLathe(brimP.map(p=> [p[0]*0.99, p[1] - 0.014]), 48, 0, true), -0.145, 26, 0.06, 4.4); P(hat, bu, 0x0e0c0a, 0, 0, 0, 0, 0, 0, 1, 1, 0.92);

  // ---- the arms: the shovel in the right, the lantern in the left ----
  const aR = gdArm(tor, 1, 0.31, 0.84, 0.0), aL = gdArm(tor, -1, -0.31, 0.84, 0.0);
  aR.sh.rotation.set(-0.12, 0, 0.1); aR.fo.rotation.x = -0.75;
  aL.sh.rotation.set(-0.25, 0, -0.12); aL.fo.rotation.x = -0.55;
  Pp.armR = aR.sh; Pp.foreR = aR.fo; Pp.armL = aL.sh; Pp.foreL = aL.fo;
  const sv = group(aR.hand, 0, -0.03, 0.03), svIn = group(sv, 0, 0.22, 0); sv.rotation.set(1.27, 0, -0.05); Pp.shovel = sv;
  gdShovel(svIn);
  const ln = group(aL.hand, 0, -0.05, 0.0); Pp.lantern = ln;
  gdLantern(R, ln);
  // a few clods falling off him, and the cold glow he walks in
  halo(R, b, 0x4a6a8a, 3.0, 0, 0.2, 0, 0.12);
  R.h = 3.0;
  return finish(R, { w:0.028 });
};
Models.FAMILY.gravedigger = "husk";
Models.BOSSES.gravedigger = 1;
/* poses as angles about x measured in the body's own frame (0 = hanging straight
   down, + swings it back, - forward: -PI is straight up), so a pose reads like a
   drawing. Each move is a wind-up pose and a strike pose; the frame is
   lerp(lerp(idle, windup, w), strike, hit). Anything a pose leaves out is idle's. */
function blend(idle, wind, hit, w, h){
  const o = {};
  for(const key in idle){
    const a = idle[key], b = wind && wind[key] !== undefined ? wind[key] : a, c = hit && hit[key] !== undefined ? hit[key] : a;
    o[key] = (a + (b - a)*w)*(1 - h) + c*h;
  }
  return o;
}
const TAU = PI*2;
const GDI = { T:0.32, ty:0, A:0.2, Az:0, F:-0.55, Sv:0.72, AL:0.07, ALz:0, FL:-0.48, hd:0, y:0, z:0, rx:0, ry:0, lg0:0, lg1:0 };
const GDW = {
  // the shovel up over his head, the blade hanging back behind it, his weight on his heels
  dig:     { T:0.02, A:-2.85, Az:0.1, F:-3.35, Sv:1.75, AL:-0.9, ALz:-0.45, FL:-1.1, hd:0.25, y:0.06, z:-0.06, rx:-0.06, lg0:0.2, lg1:-0.12 },
  // scooped low and back, wound round to the right
  fling:   { T:0.75, ty:-0.6, A:0.95, Az:0.25, F:0.7, Sv:1.15, AL:-0.85, ALz:-0.5, FL:-1.0, hd:-0.35, y:-0.16, z:-0.05, ry:-0.2, lg0:0.25, lg1:-0.3 },
  // the lantern lifted high at arm's length, his face turned up into its light
  lantern: { T:0.12, AL:-2.5, ALz:0.1, FL:-2.55, A:0.3, hd:-0.5, y:0.05 },
  // both arms up, the shovel held high: he calls, and something under the floor answers
  raise:   { T:-0.05, A:-2.65, Az:0.5, F:-2.95, Sv:-3.05, AL:-2.65, ALz:-0.5, FL:-2.95, hd:-0.6, y:0.07 }
};
const GDH = {
  dig:     { T:0.7, A:-0.85, Az:0.05, F:-0.95, Sv:TAU - 0.9, AL:-0.55, ALz:-0.45, FL:-0.9, hd:-0.4, y:-0.12, z:0.2, rx:0.12, lg0:-0.45, lg1:0.35 },
  fling:   { T:0.12, ty:0.55, A:-2.15, Az:0.1, F:-2.35, Sv:-2.65, AL:0.4, ALz:-0.3, FL:-0.3, hd:-0.1, y:0.04, z:0.12, ry:0.25, lg0:-0.2, lg1:0.3 },
  lantern: { T:0.12, AL:-2.55, ALz:0.1, FL:-2.6, A:0.3, hd:-0.5, y:0.05 },
  raise:   { T:-0.12, A:-2.85, Az:0.6, F:-3.05, Sv:-3.1, AL:-2.85, ALz:-0.6, FL:-3.05, hd:-0.75, y:0.1 }
};
Models.MOVES.gravedigger = function(c){
  const { m, P: Pp, t, dt, s, ph, fall, breath, shake, fl, fit, pose } = c;
  const F = phases(c, m), k = F.k;
  if(!m.lsw){ m.lsw = { x:0, v:0 }; m.gT = 0; m.gY = 0; m.gX = 0; m.gy = { x:0, v:0 }; m.gx = { x:0, v:0 }; m.gz = { x:0, v:0 }; }
  c.glance([1.8, 4.2], 0.5, 60);
  const W = GDW[k], Hh = GDH[k], h = W ? F.hit + F.over*0.15 : 0;
  // the dig goes over the top: its strike is measured from a full turn on, so the blade doesn't spin back
  const I = W === GDW.dig && c.strike > 0 ? Object.assign({}, GDI, { Sv:GDI.Sv + TAU }) : GDI;
  const q = blend(I, W, Hh, W ? F.w : 0, h);
  // and on top of the pose: the stalk, the breath, a cough now and then, a flinch, the wind-up's tremble
  const cough = fit > 0.3 ? Math.sin((1 - fit)*PI*5)*0.06*fit : 0, tr = c.tell >= 0 ? shake*3 : 0;
  const sw = Math.sin(ph)*s;
  q.A += -0.22*sw + tr; q.F += -0.22*sw + tr; q.Sv += -0.22*sw + tr; q.AL += 0.18*sw + tr*0.6; q.FL += 0.18*sw + tr*0.6;
  q.T += breath*0.02 + 0.08*s - cough*1.5 - 0.1*fl;
  q.lg0 += 0.42*sw; q.lg1 -= 0.42*sw;
  pose(c.R.tor, 0, 0, 0, q.T - 0.32, q.ty, 0);
  pose(Pp.head, 0, 0, 0, q.hd + m.gx.x*0.5 + cough*2, m.gy.x*(1 - Math.abs(q.hd)), m.gz.x*0.4);
  pose(Pp.armR, 0, 0, 0, q.A - q.T + 0.12, 0, q.Az);
  pose(Pp.foreR, 0, 0, 0, q.F - q.A + 0.75 + Math.sin(t*1.3)*0.03);
  pose(Pp.shovel, 0, 0, 0, q.Sv - q.F - 1.27);
  pose(Pp.armL, 0, 0, 0, q.AL - q.T + 0.25 - fl*0.4, 0, q.ALz);
  pose(Pp.foreL, 0, 0, 0, q.FL - q.AL + 0.55);
  Pp.legs.forEach((l, i)=> pose(l, 0, 0, 0, i ? q.lg1 : q.lg0));
  pose(Pp.skirt, 0, 0, 0, -0.06*s + Math.sin(t*1.1)*0.02 + (q.lg0 + q.lg1)*0.15, 0, Math.sin(ph)*0.03*s);
  // the lantern swings on its ring, trailing every move of the arm (a damped pendulum), and hangs plumb
  const rx = q.rx + 0.06*s + cough - 0.12*fl + shake*1.2;
  const R0 = c.R.tor.rotation.x + Pp.armL.rotation.x + Pp.foreL.rotation.x;
  const swing = H.spring(m.lsw, 0, 18, 2.6, dt); if(m.lastArm !== undefined) m.lsw.v += (R0 - m.lastArm)*-3; m.lastArm = R0;
  pose(Pp.lantern, 0, 0, 0, -(R0 + rx) + swing + Math.sin(t*1.7)*0.04, 0, -Pp.armL.rotation.z + Math.sin(t*1.3 + 1)*0.05 + Math.sin(ph)*0.08*s);
  // the bells jangle when he moves
  pose(Pp.bells, 0, 0, 0, Math.sin(t*9)*0.12*(s + F.w + F.hit), 0, Math.sin(t*7.3)*0.1*(s + F.w));
  return { y:q.y - 0.05*fall*s + breath*0.01, z:q.z - 0.06*fl, rx, ry:q.ry, rz:Math.sin(ph)*0.035*s + (k === "raise" && c.tell >= 0 ? Math.sin(t*23)*0.012 : 0) };
};

/* ================================================================== *
 *  The Antlered Hunger
 * ================================================================== */
const AH = { hide:0x5a5044, hide2:0x221c17, rib:0x86796a, bone:0xb6aa8e, bone2:0x6a5e4a, horn:0x4e4234, horn2:0x2a2219, moss:0x3e4a2a, moss2:0x26301a,
  rag:0x3a342a, hoof:0x16120e, claw:0x1a1612, eye:0xd8e6ee };
const hidePaint = (g, seed)=> bsPaint(g, AH.hide, AH.hide2, 5, seed, (c, x, y, z)=>{
  if(bsN(x, y, z, 4, seed + 3) > 0.45) c.lerp(C.setHex(AH.moss), 0.55);                       // lichen
  if(Math.abs(bsN(x, y, z, 14, seed)) < 0.035) c.lerp(C.setHex(0x3a1a16), 0.5);               // old wounds
});
function ahAntler(parent, s, seed){
  // a main beam sweeping up, out and back, tines off it, the tips forked: a crown of dead wood
  const g = group(parent, s*0.07, 0.1, -0.04);
  const pts = [[0, 0, 0], [s*0.12, 0.16, -0.02], [s*0.3, 0.36, -0.1], [s*0.42, 0.62, -0.16], [s*0.46, 0.88, -0.1], [s*0.4, 1.08, 0.02]];
  const main = bsTaper(pts, 0.045, 0.012, 22, 8); bsJitter(main, 0.006, 20, seed);
  bsPaint(main, AH.horn, AH.horn2, 9, seed, (c, x, y)=>{ c.lerp(C.setHex(0xa89a80), clamp((y - 0.75)*1.6, 0, 0.6)); });
  P(g, main, 0xffffff);
  P(g, bsRing(0.05, 0.016), AH.horn2, 0, 0.02, 0, PI/2);                       // the burr
  const tine = (a, d, len, sd)=>{
    const tp = [a, [a[0] + d[0]*len*0.5, a[1] + d[1]*len*0.5, a[2] + d[2]*len*0.5], [a[0] + d[0]*len + s*0.02, a[1] + d[1]*len + 0.03, a[2] + d[2]*len]];
    const q = bsTaper(tp, 0.022, 0.006, 10, 6); bsJitter(q, 0.004, 25, sd);
    bsPaint(q, AH.horn, 0x9a8c72, 7, sd, (c, x, y)=>{ c.lerp(C.setHex(0xb0a28a), clamp((y - 0.4)*1.0, 0, 0.5)); }); P(g, q, 0xffffff);
    return tp[2];
  };
  const t1 = tine(pts[1], [s*0.15, 0.25, 0.85], 0.3, seed + 1);          // the brow tine, forward over the face
  tine(pts[2], [s*0.35, 0.6, 0.55], 0.32, seed + 2);
  const t3 = tine(pts[3], [s*0.25, 0.75, 0.4], 0.38, seed + 3);
  tine(pts[3], [s*0.9, 0.35, -0.1], 0.3, seed + 4);
  tine(pts[4], [s*0.5, 0.75, -0.3], 0.3, seed + 5);
  tine(pts[5], [s*-0.2, 0.8, 0.3], 0.22, seed + 6);
  tine(pts[5], [s*0.6, 0.6, 0.1], 0.2, seed + 7);
  // moss hanging off it in beards, and rags caught on the tines
  [pts[2], pts[3], t3, pts[4], t1].forEach((p, i)=>{
    for(let j=0;j<3;j++){ const ox = (j - 1)*0.025, len = 0.18 + ((i*3 + j) % 4)*0.07;
      P(g, bsTaper([[p[0] + ox, p[1], p[2]], [p[0] + ox*1.5, p[1] - len*0.5, p[2] + 0.01], [p[0] + ox + Math.sin(i + j)*0.03, p[1] - len, p[2]]], 0.012, 0.003, 6, 5), j % 2 ? AH.moss : AH.moss2); }
  });
  [[pts[3], 0.34], [pts[4], 0.26]].forEach(([p, len], i)=>{
    const rg = new THREE.PlaneGeometry(0.12, len, 3, 6); rg.translate(0, -len/2, 0);
    { const a = rg.attributes.position; for(let j=0;j<a.count;j++){ const y = a.getY(j); a.setZ(j, Math.sin(y*14 + i)*0.02); if(y < -len*0.7) a.setX(j, a.getX(j)*(1 + Math.sin(a.getX(j)*90)*0.5)); } rg.computeVertexNormals(); }
    P(g, rg, AH.rag, p[0], p[1], p[2], 0, s*0.6 + i, 0);
    P(g, rg, 0x1a1712, p[0], p[1], p[2] - 0.004, 0, s*0.6 + i + PI, 0);
  });
  return g;
}
function ahArm(parent, s, x, y, z){
  const sh = group(parent, x, y, z);
  P(sh, hidePaint(bsBlob(0.1, 1.1, 0.9, 1, 0.012, 10, s + 2, 16, 12), s), 0xffffff, 0, 0.0, -0.01);
  const up = meat([[0, 0, 0], [s*0.02, -0.38, 0.0], [0, -0.78, 0]], t=> 0.068 - 0.03*Math.sin(t*PI)*0.6 - 0.012*t, 12, 10, s + 3);
  hidePaint(up, s + 1); P(sh, up, 0xffffff);
  const fo = group(sh, 0, -0.78, 0);
  P(fo, hidePaint(bsBlob(0.055, 1, 1.2, 1, 0.006, 20, s + 8, 12, 10), s + 4), 0xffffff, 0, 0.0, -0.01);    // a knob of an elbow
  const lo = meat([[0, 0, 0], [0, -0.38, 0.01], [0, -0.74, 0]], t=> 0.052 - 0.016*t, 12, 10, s + 5);
  hidePaint(lo, s + 2); P(fo, lo, 0xffffff);
  const hand = group(fo, 0, -0.78, 0.0);
  P(hand, hidePaint(bsBlob(0.06, 0.9, 1.1, 0.55, 0.006, 20, s + 6, 14, 10), s + 5), 0xffffff, 0, 0, 0);
  const claws = [];
  for(let k=0;k<4;k++){ const a = (k - 1.5)*0.32, fx = Math.sin(a)*0.055, fz = Math.cos(a)*0.02;
    const f = group(hand, fx, -0.04, fz); f.rotation.set(0.15, 0, a*0.4);
    P(f, bsTaper([[0, 0, 0], [0, -0.1, 0.02], [0, -0.19, 0.035]], 0.016, 0.01, 8, 6), AH.hide);
    const cl = K.shard(0.2, 0.016, 0.45, 5, k + s*3); P(f, cl, AH.claw, 0, -0.19, 0.035, PI + 0.25, 0, 0);
    claws.push(f); }
  P(hand, bsTaper([[s*-0.05, 0, 0.02], [s*-0.08, -0.07, 0.06], [s*-0.08, -0.13, 0.07]], 0.016, 0.01, 6, 6), AH.hide);
  P(hand, K.shard(0.12, 0.014, 0.4, 5, s + 9), AH.claw, s*-0.08, -0.13, 0.07, PI + 0.4, 0, 0);
  return { sh, fo, hand, claws };
}
function ahLeg(parent, s){
  // digitigrade: a short thigh forward, a long shin back to the hock, a cannon bone down to the hoof
  const l = group(parent, s*0.2, 1.48, -0.02);
  P(l, hidePaint(bsBlob(0.13, 0.9, 1.2, 1.1, 0.012, 10, s + 1, 16, 12), s), 0xffffff, 0, -0.05, 0);
  const th = meat([[0, 0, 0], [s*0.02, -0.28, 0.14], [0, -0.52, 0.26]], t=> 0.11 - 0.035*t, 12, 10, s + 2);
  hidePaint(th, s + 2); P(l, th, 0xffffff);
  const kn = group(l, 0, -0.52, 0.26);
  P(kn, hidePaint(bsBlob(0.07, 1, 1, 1.1, 0.008, 18, s, 12, 10), s + 3), 0xffffff, 0, 0, 0);
  const sh = meat([[0, 0, 0], [0, -0.28, -0.2], [0, -0.5, -0.4]], t=> 0.07 - 0.03*t, 12, 10, s + 4);
  hidePaint(sh, s + 4); P(kn, sh, 0xffffff);
  const hk = group(kn, 0, -0.5, -0.4);
  P(hk, S(0.045, 10, 8), AH.rib, 0, 0, -0.01);
  const cn = meat([[0, 0, 0], [0, -0.24, 0.06], [0, -0.44, 0.12]], t=> 0.04 - 0.008*t, 10, 9, s + 6);
  hidePaint(cn, s + 5); P(hk, cn, 0xffffff);
  // the hoof: split, black, worn
  [-1, 1].forEach(q=>{ const hf = bsBlob(0.04, 0.7, 0.8, 1.3, 0.004, 30, q + s, 12, 10); bsPaint(hf, AH.hoof, 0x3a3026, 12, 2); P(hk, hf, 0xffffff, q*0.025, -0.47, 0.17); });
  P(hk, S(0.035, 8, 6), AH.hide2, 0, -0.43, 0.06, 0, 0, 0, 1.4, 0.7, 1.3);
  // a fringe of matted hair at the hock
  for(let i=0;i<5;i++) P(hk, bsTaper([[(i - 2)*0.015, 0.02, -0.03], [(i - 2)*0.02, -0.08, -0.06], [(i - 2)*0.022, -0.16, -0.05]], 0.012, 0.003, 5, 5), AH.hide2);
  return { l, kn, hk };
}
Models.antlered = function(){
  const R = rig("antlered"), b = R.body, Pp = R.parts;
  // ---- the legs and the pelvis ----
  const lg = [-1, 1].map(s=> ahLeg(b, s));
  Pp.legs = lg.map(o=> o.l); Pp.knees = lg.map(o=> o.kn); Pp.hocks = lg.map(o=> o.hk);
  P(b, hidePaint(bsBlob(0.2, 1.35, 0.8, 0.9, 0.015, 8, 3, 24, 16), 5), 0xffffff, 0, 1.5, -0.04);
  // a loincloth of rags and hanging moss
  bsCloth(b, [[0.28, 1.05], [0.29, 1.3], [0.27, 1.5], [0.25, 1.56]], AH.rag, 0x14120e, 0.0, 1.38, 13, 0.32, 3.7);
  // ---- the torso: a cage of ribs under tight hide, the spine knuckled down the back ----
  const tor = group(b, 0, 1.5, 0); tor.rotation.x = 0.62; R.tor = tor;
  const bod = bsLathe([[0.17, -0.04], [0.19, 0.16], [0.28, 0.4], [0.33, 0.62], [0.32, 0.82], [0.24, 0.98], [0.12, 1.05]], 40);
  bod.scale(1, 1, 0.8); sculptW(bod, 0.012, 7, 5);
  // the belly falls in under the ribs; the ribs stand out
  { const a = bod.attributes.position; for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
      if(y > 0.38 && y < 0.88){ const r = Math.hypot(x, z/0.8), ang = Math.atan2(x, z);
        const rib = Math.pow(Math.max(0, Math.sin((y - 0.38)*PI*9)), 3)*(Math.abs(ang) < 2.4 ? 1 : 0.3);
        const k = 1 + 0.06*rib - 0.03; a.setX(i, x*k); a.setZ(i, z*k); }
      if(y < 0.36 && z > 0) a.setZ(i, z*0.78);
    } bod.computeVertexNormals(); }
  bsPaint(bod, AH.hide, AH.hide2, 5, 2, (c, x, y, z)=>{
    if(y > 0.38 && y < 0.88){ const rib = Math.max(0, Math.sin((y - 0.38)*PI*9)); c.lerp(C.setHex(rib > 0.6 ? AH.rib : AH.hide2), rib > 0.6 ? (rib - 0.6)*1.6 : (0.6 - rib)*0.6); }
    if(bsN(x, y, z, 4, 8) > 0.5) c.lerp(C.setHex(AH.moss), 0.5);
    if(y < 0.3 && z > 0) c.multiplyScalar(0.7);
  });
  P(tor, bod, 0xffffff); Pp.ribs = tor;
  for(let i=0;i<9;i++) P(tor, bsBlob(0.032, 1.3, 0.6, 0.8, 0.004, 20, i, 10, 8), AH.bone2, 0, 0.1 + i*0.105, -0.24 + Math.sin(i/8*PI)*-0.035 - (i > 5 ? (i - 5)*0.012 : 0));   // spine
  [-1, 1].forEach(s=> P(tor, hidePaint(bsBlob(0.14, 0.9, 1.2, 0.5, 0.01, 12, s + 7, 16, 10), s + 6), 0xffffff, s*0.18, 0.82, -0.16, -0.2, s*0.4, 0));   // shoulder blades
  // fungus taking hold on the back and the shoulders, lichen in sheets
  [[0.16, 0.55, -0.2, PI*0.9, 0.09], [-0.2, 0.7, -0.17, -PI*0.85, 0.07], [0.1, 0.38, -0.21, PI, 0.06], [0.28, 0.92, -0.05, PI*0.6, 0.06]].forEach(([x, y, z, ry, r])=> bracket(tor, r, x, y, z, ry, 0x8a7a5a));
  // ---- the neck, long and starved, and the skull ----
  P(tor, hidePaint(meat([[0, 0.92, 0.0], [0, 1.1, 0.08], [0, 1.22, 0.2]], t=> 0.09 - 0.02*t, 10, 10, 2), 3), 0xffffff);
  for(let i=0;i<4;i++) P(tor, S(0.03, 8, 6), AH.rib, 0, 0.98 + i*0.075, -0.06 + i*0.04);
  const hd = group(tor, 0, 1.26, 0.24); hd.rotation.x = -0.72; Pp.head = hd;
  // the cranium, the long face of a stag's skull, cracked, mossed at the back
  const cr = bsBlob(0.12, 1, 0.85, 1.05, 0.01, 14, 2, 24, 18);
  bsPaint(cr, AH.bone, AH.bone2, 7, 3, (c, x, y, z)=>{ if(z < -0.04) c.lerp(C.setHex(AH.moss), 0.6); });
  P(hd, cr, 0xffffff, 0, 0.0, 0);
  const sn = bsTaper([[0, 0.02, 0.05], [0, -0.01, 0.2], [0, -0.04, 0.34], [0, -0.06, 0.42]], 0.085, 0.04, 14, 12);
  sn.scale(1, 0.75, 1); bsPaint(sn, AH.bone, AH.bone2, 9, 5, (c, x, y, z)=>{ if(Math.abs(bsN(x, y, z, 24, 1)) < 0.05) c.lerp(C.setHex(0x3a3024), 0.7); });
  P(hd, sn, 0xffffff);
  // the nasal gape and the sockets, black, a cold point of light far down each
  P(hd, bsBlob(0.03, 0.8, 0.5, 2.2, 0.002, 30, 1, 10, 8), 0x0a0807, 0, -0.005, 0.31);
  [-1, 1].forEach(s=>{
    P(hd, S(0.04, 12, 10), 0x0c0a08, s*0.07, 0.025, 0.08, 0, s*0.4, 0, 1, 0.85, 0.7);
    P(hd, bsTaper([[s*0.1, 0.06, 0.03], [s*0.11, 0.06, 0.1], [s*0.07, 0.07, 0.15]], 0.016, 0.01, 6, 6), AH.bone);     // the brow ridge
    glow(R, hd, 0.008, AH.eye, s*0.072, 0.02, 0.105); halo(R, hd, AH.eye, 0.14, s*0.072, 0.02, 0.11, 0.55);
  });
  // the upper teeth
  for(let i=0;i<6;i++) [-1, 1].forEach(s=> P(hd, BX(0.012, 0.022, 0.016), 0xa89a7a, s*(0.03 - i*0.002), -0.07, 0.14 + i*0.04));
  // the jaw, hinged far back, so it drops wide
  const jaw = group(hd, 0, -0.05, 0.02); Pp.jaw = jaw;
  const jb = bsTaper([[0, -0.01, 0.0], [0, -0.04, 0.16], [0, -0.05, 0.38]], 0.05, 0.022, 12, 10); jb.scale(1.25, 0.6, 1);
  bsPaint(jb, AH.bone, AH.bone2, 9, 7); P(jaw, jb, 0xffffff);
  for(let i=0;i<6;i++) [-1, 1].forEach(s=> P(jaw, BX(0.011, 0.02, 0.014), 0x9a8c6a, s*(0.028 - i*0.002), 0.0, 0.1 + i*0.045));
  P(jaw, meat([[-0.04, -0.03, 0.06], [0, -0.08, 0.14], [0.04, -0.03, 0.22]], ()=> 0.01, 8, 6, 2), 0x3a1a16);     // a string of dried gut
  // the antlers
  Pp.antlers = [-1, 1].map((s, i)=> ahAntler(hd, s, i*7 + 3));
  // ---- the arms: too long, the claws dragging near the floor ----
  const aR = ahArm(tor, 1, 0.36, 0.86, -0.02), aL = ahArm(tor, -1, -0.36, 0.86, -0.02);
  aR.sh.rotation.set(-0.75, 0, 0.16); aR.fo.rotation.x = -0.45;
  aL.sh.rotation.set(-0.7, 0, -0.16); aL.fo.rotation.x = -0.5;
  Pp.armR = aR.sh; Pp.foreR = aR.fo; Pp.armL = aL.sh; Pp.foreL = aL.fo; Pp.handR = aR.hand; Pp.handL = aL.hand; Pp.claws = aR.claws.concat(aL.claws);
  // a few things he wears: a rag over a shoulder, a thong of finger-bones round his neck
  bsCloth(tor, [[0.2, -0.3], [0.18, -0.1], [0.12, 0.02]], AH.rag, 0x14120e, 2.3, -0.12, 9, 0.2, 2.2, -0.26, 0.9, 0.0, 0, 0.6, 0.5);
  for(let i=0;i<9;i++){ const a = (i/8 - 0.5)*2.2; P(tor, CY(0.009, 0.012, 0.06, 6), AH.bone, Math.sin(a)*0.13, 0.96 - Math.cos(a)*0.03, 0.1 + Math.cos(a)*0.08, 0.3, 0, a*0.3); }
  halo(R, b, 0x4a5a40, 3.4, 0, 0.2, 0, 0.12);
  R.h = 3.4;
  return finish(R, { w:0.028 });
};
Models.FAMILY.antlered = "brute";
Models.BOSSES.antlered = 1;
const AHI = { T:0.62, A:-0.13, Az:0, F:-0.58, hd:0, jw:0.06, cl:0, cr:0, leap:0, scrape:0, y:0, z:0, rx:0 };
const AHW = {
  // down low on its haunches, the claws spread wide, its face up at you
  pounce: { T:0.95, A:-1.05, Az:0.8, F:-1.55, hd:-0.3, jw:0.25, cl:0.6, cr:0.85, rx:0.12 },
  // the head down so the antlers come level, the arms swept back, a hoof scraping the floor
  charge: { T:0.98, A:0.45, Az:0.3, F:0.15, hd:0.95, jw:0.15, cr:0.4, scrape:1, rx:0.05 },
  // reared back, head thrown up, the jaw dropping, the arms flung out and back
  scream: { T:0.08, A:0.5, Az:1.0, F:0.7, hd:-1.35, jw:0.8, cl:0.8, y:0.06, rx:-0.08 },
  // both arms up over the antlers, the claws open
  roots:  { T:0.22, A:-2.85, Az:0.28, F:-3.15, hd:-0.3, jw:0.3, cl:0.6, y:0.08 }
};
const AHH = {
  pounce: { T:0.72, A:-1.95, Az:0.25, F:-2.1, hd:-0.3, jw:0.55, cl:1, cr:-0.15, leap:1, rx:0.22, z:0.3 },
  charge: { T:1.08, A:0.7, Az:0.35, F:0.4, hd:1.1, jw:0.3, cr:0.15, rx:0.18, z:0.42 },
  scream: { T:-0.04, A:0.75, Az:1.15, F:0.95, hd:-1.55, jw:1, cl:1, y:0.08, rx:-0.12 },
  roots:  { T:1.0, A:-1.5, Az:0.12, F:-1.25, hd:0.2, jw:0.45, cl:1, cr:0.5, rx:0.12, z:0.12 }
};
Models.MOVES.antlered = function(c){
  const { m, P: Pp, t, dt, s, ph, fall, breath, shake, fl, fit, pose } = c;
  const F = phases(c, m), k = F.k, hop = c.o.hop || 0, air = Math.min(1, hop*2.5);
  if(m.gy === undefined){ m.gT = 0; m.gY = 0; m.gX = 0; m.gy = { x:0, v:0 }; m.gx = { x:0, v:0 }; m.gz = { x:0, v:0 }; }
  c.glance([0.25, 1.6], 0.7, 700);                // a predator's head: still, then snapped to a new place
  const W = AHW[k], Hh = AHH[k], h = W ? Math.max(F.hit + F.over*0.15, k === "pounce" ? air : 0) : 0;
  const q = blend(AHI, W, Hh, W ? F.w*(k === "pounce" ? 1 - air : 1) : 0, h);
  // a fit: the head jerks and the jaw works, the way a starving thing twitches
  const tw = fit > 0.5 ? Math.sin(t*61)*0.12*(fit - 0.5)*2 : 0, tr = c.tell >= 0 ? shake*3 : 0, sw = Math.sin(ph)*s;
  const scream = k === "scream" ? h : 0;
  q.A += tr; q.F += tr; q.cl += tr*2;
  q.T += 0.1*s - 0.12*fl + 0.02*breath;
  q.jw += 0.04*Math.max(0, Math.sin(t*0.9)) + (fit > 0.3 ? Math.abs(Math.sin(t*19))*0.2*fit : 0);
  // the lope: low, the weight thrown from leg to leg, the long arms swinging
  const lph = [ph, ph + PI];
  const leg = [0, 1].map(i=> ({ th:Math.sin(lph[i])*0.5*s, kn:Math.max(0, -Math.cos(lph[i]))*0.5*s, hk:-Math.max(0, -Math.cos(lph[i]))*0.3*s }));
  const cr = q.cr*(1 - air);
  leg.forEach(l=>{ l.th += -0.55*cr + 0.9*q.leap*air; l.kn += 0.95*cr - 0.2*q.leap*air; l.hk += -0.5*cr + 0.4*q.leap*air; });
  const scrape = c.tell >= 0 ? Math.max(0, Math.sin(t*9))*q.scrape : 0;
  leg[0].th += -0.45*scrape; leg[0].kn += 0.5*scrape;
  // the ribs heave with each breath, harder after it has screamed
  const hv = 1 + 0.025*breath + 0.04*F.hit;
  pose(c.R.tor, 0, 0, 0, q.T - 0.62, 0, 0, hv, 1, hv);
  pose(Pp.head, 0, 0, 0, q.hd - (q.T - 0.62)*0.8 + m.gx.x*0.6*(1 - h) + tw + Math.sin(t*41)*0.05*scream, m.gy.x*(1 - (W ? Math.max(F.w, h) : 0)), m.gz.x*0.6 + Math.sin(t*29)*0.05*scream);
  pose(Pp.jaw, 0, 0, 0, q.jw);
  [[Pp.armR, Pp.foreR, 1, -0.75, -0.45], [Pp.armL, Pp.foreL, -1, -0.7, -0.5]].forEach(([a, f, sg, ar, fr], i)=>{
    const swing = (i ? 1 : -1)*0.45*sw;
    pose(a, 0, 0, 0, q.A + swing - q.T - ar - 0.45*fl, 0, sg*(q.Az + Math.sin(t*37)*0.05*scream));
    pose(f, 0, 0, 0, q.F - q.A - fr - 0.15*s);
  });
  Pp.claws.forEach((n, i)=> pose(n, 0, 0, 0, q.cl*0.6 + Math.sin(t*1.7)*0.08 + Math.sin(t*2.3 + i)*0.05, 0, 0));
  [0, 1].forEach(i=>{ pose(Pp.legs[i], 0, 0, 0, leg[i].th); pose(Pp.knees[i], 0, 0, 0, leg[i].kn); pose(Pp.hocks[i], 0, 0, 0, leg[i].hk - leg[i].kn*0.4); });
  Pp.antlers.forEach((n, i)=> pose(n, 0, 0, 0, 0, 0, (i ? 1 : -1)*0.02*Math.sin(t*1.1)));
  return { y:q.y - 0.34*cr - 0.08*fall*s + breath*0.012, z:q.z - 0.07*fl, rx:q.rx + 0.08*s - 0.15*fl + shake*1.3, rz:Math.sin(ph)*0.06*s };
};
})();
