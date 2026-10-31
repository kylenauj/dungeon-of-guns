/* ------------------------------------------------------------------ *
 *  Rigs of their own (see Models.MOVES in models.js for the moves):
 *  the lair brutes. Skabb the Gaoler, the Spore-Cook, and Gnaw, the
 *  Kennel Hound. Each is built at its full size in the room (the view
 *  doesn't scale a lair rig up), on a design scale wrapped in one group.
 *
 *  Their moves run joints through stiff springs: a wind-up is drawn back
 *  and held trembling, the release snaps through, overshoots and settles,
 *  so a strike has weight on both sides of it.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, OC, P, rig, group, glow, halo, finish, BS, bsRing, bsN, bsPaint, bsBlob, bsLathe, bsCloth, bsChain, bsSkull, bsCandle, bsTooth, bsJitter, bsTaper, meat, smooth } = H;
const C = new THREE.Color();

/* a spring kept on the rig's motion state, stepped finely so stiff ones stay put */
function sp(m, key, target, k, d, dt){
  const s = m[key] || (m[key] = { x:target, v:0 });
  let left = dt;
  while(left > 1e-6){ const h = Math.min(left, 1/120); s.v += ((target - s.x)*k - s.v*d)*h; s.x += s.v*h; left -= h; }
  return s.x;
}
/* a limb of flesh from a to b (and on), thick at the root */
function flesh(parent, pts, r0, r1, col, seed){
  return P(parent, meat(pts, t=> r0 + (r1 - r0)*t + r0*0.18*Math.sin(PI*Math.min(1, t*1.6)), 10, 10, seed || 1), col);
}
/* a short chain of iron links hanging from a point */
function dangle(parent, x, y, z, n, r, col){
  for(let i=0;i<n;i++) P(parent, bsRing(r, r*0.24), col || 0x2c2a2c, x, y - i*r*1.55, z, 0, i % 2 ? PI/2 : 0, 0);
}

/* ================================================================== *
 *  Skabb, the Gaoler: a hunched mountain of a jailer under a leather
 *  hood and an iron bucket-mask, a hooked chain in his right fist and
 *  coiled over his shoulder, keys and a broken manacle at the left, and
 *  a gibbet cage strapped to his back with its last tenant still in it.
 * ================================================================== */
const GA = { skin:0x5a5048, skin2:0x2e2420, hood:0x2a221c, hood2:0x161210, leather:0x3a2a1e, iron:0x2a2a2e, rust:0x5e3420, bone:0xb8ac90 };
Models.lair_gaoler = function(){
  const R = rig("lair_gaoler"), b = R.body, Sc = 1.75;
  const g = group(b); g.scale.setScalar(Sc);
  // hips and a heavy leather apron, split and tattered
  const hips = group(g, 0, 0.8, 0);
  P(hips, bsPaint(bsBlob(0.3, 1.25, 0.8, 1, 0.02, 7, 2, 28, 20), GA.leather, 0x1e160e, 6, 2), 0xffffff, 0, 0, 0);
  bsCloth(hips, [[0.36, 0.08], [0.4, -0.08], [0.44, -0.3], [0.47, -0.5]], GA.leather, 0x1a120c, 0.5, -0.2, 11, 0.22, 3.3, 0, 0, 0.02);
  P(hips, bsRing(0.37, 0.035), 0x241a12, 0, 0.06, 0, PI/2, 0, 0, 1.05, 0.92, 1);
  P(hips, BX(0.12, 0.1, 0.03), GA.rust, 0, 0.06, 0.36);
  // legs: thick, bowed, in iron-shod boots
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(g, s*0.24, 0.8, 0); legs.push(l);
    flesh(l, [[0, 0, 0], [s*0.05, -0.22, 0.08], [s*0.04, -0.42, 0.06]], 0.16, 0.12, GA.skin, s + 3);
    flesh(l, [[s*0.04, -0.42, 0.06], [s*0.03, -0.58, 0.0], [s*0.02, -0.7, 0.0]], 0.12, 0.1, GA.skin2, s + 7);
    P(l, bsRing(0.115, 0.02), 0x241a12, s*0.03, -0.55, 0.01, PI/2);
    P(l, bsPaint(bsBlob(0.13, 1, 0.7, 1.55, 0.01, 9, s, 22, 16), 0x221a14, 0x0e0a08, 9, s), 0xffffff, s*0.02, -0.73, 0.07);
    P(l, CY(0.12, 0.135, 0.06, 14), GA.iron, s*0.02, -0.78, 0.07, 0, 0, 0, 1, 1, 1.5);
    P(l, S(0.07, 10, 8), GA.rust, s*0.02, -0.74, 0.25, 0, 0, 0, 1.1, 0.7, 0.8);
  });
  R.parts.legs = legs;
  // the torso pivots at the hips and leans far forward
  const tor = group(g, 0, 0.84, 0); tor.rotation.x = 0.5; R.tor = tor;
  const chest = bsBlob(0.42, 1.2, 1.0, 0.92, 0.035, 5, 4.2, 36, 26);
  bsPaint(chest, GA.skin, GA.skin2, 3.4, 2, (c, x, y, z)=>{
    if(Math.abs(bsN(x, y, z, 11, 7)) < 0.035) c.lerp(C.setHex(0x4a1c18), 0.6);        // old lash scars
    if(z < -0.1) c.multiplyScalar(0.8);
  });
  P(tor, chest, 0xffffff, 0, 0.42, 0.02);
  P(tor, bsPaint(bsBlob(0.38, 1.55, 0.72, 1.0, 0.03, 6, 9, 30, 20), GA.skin, GA.skin2, 4, 5), 0xffffff, 0, 0.7, -0.08);   // the hump of the shoulders
  P(tor, bsPaint(bsBlob(0.3, 1.05, 0.95, 0.9, 0.02, 6, 11, 28, 20), 0x7a6c5e, GA.skin2, 4, 6), 0xffffff, 0, 0.2, 0.2);    // the gut
  // a harness: a strap over the shoulder and round the gut, studs, a gaoler's tally of notches
  P(tor, bsRing(0.47, 0.03), GA.leather, 0, 0.45, 0.02, 0.2, 0, 0.75, 1.15, 1, 1);
  P(tor, bsRing(0.43, 0.03), GA.leather, 0, 0.12, 0.08, PI/2 + 0.15, 0, 0, 1, 1, 0.95);
  for(let i=0;i<7;i++){ const a = -1 + i*0.33; P(tor, S(0.018, 6, 4), 0x6a5a40, Math.sin(a)*0.44, 0.12, 0.08 + Math.cos(a)*0.42); }
  // the head: low between the shoulders, a leather hood over an iron bucket-mask
  const head = group(tor, 0, 0.88, 0.34); R.parts.head = head; head.rotation.x = -0.45; head.scale.setScalar(1.25);
  P(head, bsPaint(bsBlob(0.2, 1.3, 0.9, 1.1, 0.02, 9, 3, 24, 16), GA.skin, GA.skin2, 6, 1), 0xffffff, 0, -0.1, -0.12);      // the neck's bulk
  bsCloth(head, [[0.01, 0.42], [0.07, 0.38], [0.17, 0.27], [0.215, 0.1], [0.225, -0.05], [0.26, -0.15], [0.3, -0.2]], GA.hood, GA.hood2, 0.62, -0.12, 9, 0.16, 5.1, 0, 0, -0.02);
  const mask = CY(0.15, 0.165, 0.27, 18); bsPaint(mask, 0x48464a, GA.rust, 12, 4);
  P(head, mask, 0xffffff, 0, 0.07, 0.07, 0.12);
  P(head, BX(0.2, 0.022, 0.04), 0x050404, 0, 0.11, 0.22, 0.12);            // the eye slit
  P(head, BX(0.022, 0.13, 0.04), 0x050404, 0, 0.03, 0.225, 0.12);          // and the breathing slit
  [-1, 1].forEach(s=>{ glow(R, head, 0.013, 0xff7a2a, s*0.055, 0.112, 0.205); for(let i=0;i<4;i++) P(head, S(0.014, 6, 4), 0x6a5a40, s*0.14, -0.03 + i*0.065, 0.12); });
  halo(R, head, 0xff5a1a, 0.4, 0, 0.11, 0.25, 0.22);
  P(head, bsRing(0.165, 0.02), GA.rust, 0, -0.06, 0.06, PI/2 + 0.12);
  // arms: long, slab-muscled, hanging past the knees
  const arm = (s)=>{
    const a = group(tor, s*0.56, 0.66, 0.02); a.rotation.set(-0.62, 0, s*0.12);
    P(a, bsPaint(bsBlob(0.2, 1.1, 1, 1, 0.02, 8, s + 2, 24, 18), GA.skin, GA.skin2, 5, s), 0xffffff, s*0.02, 0, 0);    // the shoulder
    flesh(a, [[0, 0, 0], [s*0.05, -0.22, 0.03], [s*0.05, -0.46, 0.04]], 0.15, 0.12, GA.skin, s*5);
    const el = group(a, s*0.05, -0.46, 0.04); el.rotation.x = -0.25;
    flesh(el, [[0, 0, 0], [0, -0.2, 0.02], [0, -0.42, 0.04]], 0.12, 0.1, GA.skin, s*9);
    P(el, CY(0.115, 0.12, 0.12, 14), GA.iron, 0, -0.33, 0.04);                                    // a manacle
    P(el, bsRing(0.12, 0.018), GA.rust, 0, -0.27, 0.04, PI/2);
    const hand = group(el, 0, -0.5, 0.05);
    P(hand, bsPaint(bsBlob(0.1, 1.1, 1.0, 1.15, 0.01, 12, s*3, 20, 14), GA.skin, GA.skin2, 9, 2), 0xffffff, 0, 0, 0);
    for(let i=0;i<4;i++) P(hand, S(0.035, 8, 6), GA.skin2, s*0.0 - 0.06 + i*0.04, -0.07, 0.07, 0, 0, 0, 1, 1.2, 1);
    return { a, el, hand };
  };
  const AR = arm(1), AL = arm(-1);
  R.parts.armR = AR.a; R.parts.armL = AL.a; R.parts.elR = AR.el; R.parts.elL = AL.el;
  // the hook on its chain: it hangs from the right fist (and whirls before a throw)
  const whirl = group(AR.hand, 0, -0.04, 0); R.parts.whirl = whirl;
  const hk = group(whirl, 0, 0, 0); R.parts.hook = hk;
  dangle(hk, 0, -0.06, 0, 5, 0.035, 0x2c2a2c);
  P(hk, bsRing(0.19, 0.04, PI*1.35), 0x4a4644, 0.02, -0.46, 0, 0, 0, 0.6);
  P(hk, CO(0.05, 0.22, 8), 0x5a5654, -0.15, -0.34, 0, 0, 0, 0.9);
  P(hk, CY(0.03, 0.03, 0.08, 8), GA.rust, 0.05, -0.27, 0);
  // the rest of the chain, slung from the fist up over the right shoulder in coils
  [[0, 0.95, 0.15], [0.03, 0.9, 0.0], [-0.02, 1.0, 0.08]].forEach(([dx, s, rz], i)=> P(tor, bsRing(0.24*s, 0.03), 0x2c2a2e, 0.42 + dx, 0.85 - i*0.04, 0.0 + i*0.03, PI/2 + 0.6, 0.3, -0.5 + rz));
  bsChain(tor, [0.62, 0.62, 0.15], [0.66, 0.25, 0.35], 6, 0x2c2a2e, 0.035, 0.05);
  // the left fist: a ring of keys and a broken manacle chain
  P(AL.hand, bsRing(0.075, 0.012), 0x5a4a30, 0, -0.14, 0.02, 0, PI/2, 0);
  for(let i=0;i<6;i++){
    const a = -0.8 + i*0.32, kx = Math.sin(a)*0.07, ky = -0.14 - Math.cos(a)*0.07;
    const k = group(AL.hand, kx, ky, 0.02); k.rotation.z = a;
    P(k, BX(0.012, 0.11, 0.012), 0x6a5838, 0, -0.06, 0); P(k, BX(0.03, 0.025, 0.01), 0x6a5838, 0.012, -0.11, 0); P(k, bsRing(0.017, 0.006), 0x6a5838, 0, 0.0, 0);
  }
  dangle(AL.el, 0.0, -0.36, 0.12, 4, 0.03, 0x2c2a2c);
  // the gibbet cage on his back, and what's left of whoever was in it
  const cage = group(tor, 0.05, 0.62, -0.5); cage.rotation.set(-1.15, 0, 0.12); R.parts.cage = cage;
  [0, 0.62].forEach(y=> P(cage, bsRing(0.24, 0.022), GA.iron, 0, y, 0, PI/2));
  for(let i=0;i<10;i++){ const a = i/10*PI*2; P(cage, CY(0.012, 0.012, 0.62, 6), i % 3 ? GA.iron : GA.rust, Math.cos(a)*0.24, 0.31, Math.sin(a)*0.24); }
  [0, PI/2].forEach(a=> P(cage, bsRing(0.24, 0.016, PI), GA.iron, 0, 0.62, 0, 0, a, 0));
  P(cage, bsRing(0.05, 0.014), GA.rust, 0, 0.88, 0);
  P(cage, bsSkull(), 0xffffff, 0.04, 0.42, 0.03, 0.5, 0.4, 0.3, 1.3);
  for(let i=0;i<4;i++) P(cage, bsRing(0.1 - i*0.008, 0.009, PI), GA.bone, 0, 0.3 - i*0.045, -0.02, PI/2, 0, PI);
  P(cage, CY(0.012, 0.012, 0.36, 6), GA.bone, -0.06, 0.18, 0.02, 0.4, 0, 0.6);
  P(cage, CY(0.01, 0.01, 0.3, 6), GA.bone, 0.08, 0.12, 0.06, -0.3, 0, -0.8);
  bsChain(tor, [-0.36, 0.72, -0.2], [-0.2, 0.62, -0.6], 5, 0x2c2a2c, 0.028);
  bsChain(tor, [0.36, 0.72, -0.2], [0.3, 0.62, -0.6], 5, 0x2c2a2c, 0.028);
  // a lantern of rendered fat hanging off the cage: his only light
  const lamp = group(cage, -0.28, 0.25, 0.05); R.parts.lamp = lamp;
  P(lamp, CY(0.05, 0.06, 0.1, 8), GA.iron, 0, -0.08, 0); P(lamp, bsRing(0.03, 0.008), GA.iron, 0, 0.0, 0);
  glow(R, lamp, 0.03, 0xffa040, 0, -0.08, 0); halo(R, lamp, 0xff8a2a, 0.55, 0, -0.08, 0, 0.5);
  R.h = 2.0*Sc; R.size = Sc;
  return finish(R);
};
Models.FAMILY.lair_gaoler = "brute";
Models.MOVES.lair_gaoler = c=>{
  const { m, P, t, dt, s, ph, fall, fl, fit, breath, shake, pose } = c, k = c.kind;
  const hookW = k === "hook" ? c.wind : 0, hookS = k === "hook" ? c.st : 0;
  const chW = k === "chains" ? c.wind : 0, chS = k === "chains" ? c.st : 0;
  const crW = k === "charge" ? c.wind : 0, crS = k === "charge" ? c.st : 0;
  c.glance([1.4, 4], 0.45, 140);
  // the torso: lean, rear, twist (through springs, so a release overshoots)
  const leanT = 0.06*s + 0.03*breath - 0.5*chW + 0.55*chS + 0.35*crW + 0.25*crS - 0.25*fl - 0.12*hookW + 0.3*hookS;
  const lean = sp(m, "lean", leanT, 260, 20, dt);
  const twist = sp(m, "twist", -0.55*hookW + 0.75*hookS + Math.sin(ph)*0.06*s + (fit > 0.5 ? Math.sin(t*28)*0.05 : 0), 300, 18, dt);
  pose(c.R.tor, 0, 0, 0, lean, twist, -Math.sin(ph)*0.06*s, 1 - breath*0.01, 1 + breath*0.02, 1 + breath*0.015);
  pose(P.head, 0, 0, 0, c.m.gx.x*0.5 + 0.35*crW - 0.25*chW - 0.2*fl, c.m.gy.x - twist*0.6, fit > 0.6 ? Math.sin(t*40)*0.08 : 0);
  // the legs: a rolling, heavy stride; a foot pawing before a charge
  P.legs.forEach((l, i)=>{
    const paw = i === 0 ? crW*(0.35 + 0.35*Math.sin(t*13)) : 0;
    pose(l, 0, 0, 0, Math.sin(ph + i*PI)*0.55*s - paw - 0.25*chW*(i ? 1 : 0) + 0.2*chS*(i ? 0 : 1), 0, (i ? -1 : 1)*0.05);
  });
  // the hook arm: whirled up and out to the side, then thrown forward and through
  const swing = Math.sin(ph)*0.35*s;
  const rX = sp(m, "rX", -swing + 0.9*hookW - 2.4*hookS - 2.9*chW - 0.5*chS - 0.45*crW - 0.6*crS + 0.04*breath, 420, 22, dt);
  const rZ = sp(m, "rZ", 1.25*hookW - 0.3*hookS + 0.2*chW, 420, 22, dt);
  const lX = sp(m, "lX", swing - 0.4*hookW + 0.3*hookS - 2.9*chW - 0.5*chS - 0.45*crW - 0.6*crS + 0.04*breath, 420, 22, dt);
  pose(P.armR, 0, 0, 0, rX + shake*4, 0, rZ);
  pose(P.armL, 0, 0, 0, lX + shake*4, 0, -0.35*hookW - 0.15*chW);
  pose(P.elR, 0, 0, 0, -0.6*hookW - 0.5*chW + 0.2*chS);
  pose(P.elL, 0, 0, 0, -0.3*Math.abs(swing) - 0.5*chW + 0.2*chS);
  // the hook: hangs and swings with the walk; whirls faster and faster through the wind-up
  m.whirl = (m.whirl || 0) + dt*(hookW > 0 ? 6 + 16*hookW : 0);
  const out = sp(m, "hookOut", 1.2*hookW, 200, 14, dt);
  pose(P.whirl, 0, 0, 0, 0, hookW > 0 ? m.whirl : sp(m, "wy", 0, 30, 8, dt), 0);
  pose(P.hook, 0, 0, 0, -rX*0.6 - 1.6*hookS + Math.sin(t*1.7)*0.05, 0, out + Math.sin(t*1.3 + 1)*0.06);
  if(P.lamp) pose(P.lamp, 0, 0, 0, Math.sin(t*1.9)*0.15 + lean*0.4, 0, Math.sin(t*2.3)*0.12 + Math.sin(ph)*0.2*s);
  if(P.cage) pose(P.cage, 0, 0, 0, Math.sin(ph*2)*0.02*s, 0, Math.sin(ph)*0.04*s);
  // the body: a dip at every footfall, a roll onto each foot, a slam down on the chains
  const Sc = 1.75;
  return { y:(-0.06*fall*s + 0.06*chW - 0.1*chS - 0.05*crW)*Sc, z:(0.25*crS + 0.1*hookS - 0.06*fl)*Sc, rx:0.04*s + shake, rz:Math.sin(ph)*0.06*s };
};

/* ================================================================== *
 *  The Spore-Cook: a swollen, rotting cook under a sackcloth hood, a
 *  black cauldron slung in front of his gut on a yoke of straps, the
 *  broth in it glowing with spores. A ladle in one hand, a cleaver in
 *  the other, and the rot fruiting out of his shoulders.
 * ================================================================== */
const CK = { skin:0x6a6650, skin2:0x3a3628, rot:0x4a3a40, sack:0x4a3a28, sack2:0x241a10, apron:0x7a6e58, apron2:0x3a2a1a, iron:0x1e1c1e, broth:0x9cff3a };
Models.lair_cook = function(){
  const R = rig("lair_cook"), b = R.body, Sc = 1.6;
  const g = group(b); g.scale.setScalar(Sc);
  const { capGeo } = H;
  // stubby legs, swaddled in rags
  const legs = [];
  [-1, 1].forEach(s=>{
    const l = group(g, s*0.26, 0.42, 0); legs.push(l);
    flesh(l, [[0, 0, 0], [s*0.03, -0.2, 0.03], [s*0.02, -0.36, 0.02]], 0.15, 0.12, CK.skin2, s + 2);
    P(l, CY(0.14, 0.13, 0.16, 12), CK.sack2, s*0.02, -0.2, 0.02);
    P(l, bsPaint(bsBlob(0.13, 1.1, 0.6, 1.5, 0.012, 9, s, 20, 14), 0x241c14, 0x0e0a08, 9, s), 0xffffff, s*0.02, -0.38, 0.06);
  });
  R.parts.legs = legs;
  // the bulk: one huge gut, the torso pivots low on it
  const tor = group(g, 0, 0.42, 0); R.tor = tor;
  const gut = bsBlob(0.58, 1.08, 1.0, 1.02, 0.04, 4.2, 6, 36, 26);
  bsPaint(gut, CK.skin, CK.skin2, 3, 4, (c, x, y, z)=>{
    const n = bsN(x, y, z, 5, 2);
    if(n > 0.3) c.lerp(C.setHex(CK.rot), Math.min(1, (n - 0.3)*2.5));                // rot spreading in bruises
    if(Math.abs(bsN(x, y, z, 14, 9)) < 0.03) c.lerp(C.setHex(0x2a1a14), 0.7);         // split seams
  });
  P(tor, gut, 0xffffff, 0, 0.5, 0.02);
  P(tor, bsPaint(bsBlob(0.4, 1.3, 0.75, 1.0, 0.03, 6, 3, 28, 20), CK.skin, CK.skin2, 4, 7), 0xffffff, 0, 0.98, -0.04);   // slumped shoulders
  // the apron, filthy, hung over the gut
  const ap = bsLathe([[0.5, 0.86], [0.6, 0.62], [0.64, 0.38], [0.6, 0.16], [0.56, -0.04]], 30, 1.95);
  K.tatter(ap, 0.1, 8, 0.12, 4.4);
  bsPaint(ap, CK.apron, CK.apron2, 7, 3, (c, x, y, z)=>{ if(bsN(x, y, z, 9, 5) > 0.3) c.lerp(C.setHex(0x3a1410), 0.6); if(y < 0.3) c.multiplyScalar(0.75); });
  P(tor, ap, 0xffffff, 0, 0, 0.02, 0, PI, 0, 1.0, 1, 1.02);
  P(tor, bsRing(0.62, 0.025), 0x2a1e14, 0, 0.62, 0.02, PI/2, 0, 0, 1, 1.02, 1);
  // the head: small on that bulk, under a sack hood with one hole cut, a spore-lit eye in it
  const head = group(tor, 0, 1.18, 0.18); R.parts.head = head;
  P(head, bsPaint(bsBlob(0.17, 1, 1.05, 1, 0.015, 10, 2, 22, 16), CK.skin, CK.skin2, 7, 3), 0xffffff, 0, 0, 0);
  const hood = bsLathe([[0.01, 0.32], [0.1, 0.28], [0.2, 0.16], [0.22, 0.0], [0.24, -0.12], [0.3, -0.2]], 26);
  K.tatter(hood, -0.08, 9, 0.12, 7.1); K.sculpt(hood, 0.012, 14, 3);
  bsPaint(hood, CK.sack, CK.sack2, 9, 2, (c, x, y, z)=>{ if(Math.sin(y*90) > 0.7) c.multiplyScalar(0.8); });
  P(head, hood, 0xffffff, 0, 0.02, -0.01, -0.12);
  P(head, S(0.05, 10, 8), 0x050404, 0.06, 0.05, 0.2, 0, 0, 0, 1, 1.15, 0.5);
  glow(R, head, 0.018, CK.broth, 0.065, 0.045, 0.215); halo(R, head, 0x8ad83a, 0.35, 0.065, 0.045, 0.24, 0.3);
  P(head, BX(0.08, 0.012, 0.02), 0x2a1e14, -0.07, 0.07, 0.2, 0, 0, 0.3);              // the other hole, stitched shut
  for(let i=0;i<4;i++) P(head, BX(0.008, 0.03, 0.02), 0x1a1208, -0.1 + i*0.022, 0.07 + i*0.006, 0.205);
  P(head, bsRing(0.2, 0.018), 0x3a2a1a, 0, -0.1, 0, PI/2);                              // a rope at the neck
  // the rot fruiting from his shoulders and back: lopsided caps, pale gills lit from under
  [[0.42, 1.12, -0.1, 0.16, 0.5], [0.52, 1.0, 0.0, 0.11, 0.9], [-0.4, 1.16, -0.16, 0.13, -0.4], [-0.2, 1.22, -0.3, 0.1, -0.2], [0.12, 1.05, -0.42, 0.17, 0.1], [-0.3, 0.8, -0.48, 0.12, -0.6]].forEach(([x, y, z, r, a], i)=>{
    P(tor, CY(r*0.22, r*0.32, r*1.0, 8), 0x7a7262, x, y + r*0.4, z, 0, 0, a*0.4);
    P(tor, capGeo(r*1.15, r*0.7, r*0.4, i*3.1 + 1, 0x3a2a30), 0x6a5a4e, x - Math.sin(a*0.4)*r*0.9, y + r*0.85, z, 0, i, a*0.5);
    if(i % 2 === 0) glow(R, tor, r*0.2, 0xb8ff6a, x - Math.sin(a*0.4)*r*1.2, y + r*1.05, z);
  });
  // the cauldron, slung in front of the gut on a yoke of straps
  const pot = group(tor, 0, 0.5, 0.7); R.parts.pot = pot;
  const bowl = bsLathe([[0.04, -0.26], [0.22, -0.24], [0.33, -0.1], [0.36, 0.08], [0.33, 0.2], [0.35, 0.24]], 30);
  bsPaint(bowl, CK.iron, 0x3a2418, 10, 2, (c, x, y, z)=>{ if(y > 0.12 && bsN(x, y, z, 20, 1) > 0.2) c.lerp(C.setHex(0x6a7a3a), 0.5); });    // crust run over the lip
  P(pot, bowl, 0xffffff, 0, 0, 0);
  P(pot, bsLathe([[0.32, 0.18], [0.3, 0.2], [0.29, 0.22]], 30, 0, true), 0x121012, 0, 0, 0);
  P(pot, bsRing(0.345, 0.03), 0x2a2622, 0, 0.24, 0, PI/2);
  [-1, 1].forEach(s=>{ P(pot, bsRing(0.06, 0.016), 0x2a2622, s*0.36, 0.14, 0, 0, PI/2, 0); P(pot, CO(0.035, 0.1, 6), 0x1a1818, s*0.18, -0.3, 0.1, PI); });
  P(pot, CO(0.035, 0.1, 6), 0x1a1818, 0, -0.3, -0.18, PI);
  const broth = new THREE.CircleGeometry(0.3, 24); broth.rotateX(-PI/2);
  K.sculpt(broth, 0.01, 18, 2);
  bsPaint(broth, 0x4a7a2a, 0x1e3a12, 14, 1, (c, x, y, z)=>{ if(bsN(x, y, z, 30, 3) > 0.35) c.lerp(C.setHex(0xb8ff6a), 0.6); });
  P(pot, broth, 0xffffff, 0, 0.17, 0);
  const brothG = glow(R, pot, 0.06, CK.broth, 0, 0.18, 0); brothG.scale.set(4, 0.25, 4);
  halo(R, pot, 0x8ad83a, 1.2, 0, 0.3, 0, 0.45); R.parts.steam = halo(R, pot, 0xb8d89a, 0.8, 0.05, 0.55, 0, 0.18);
  [-1, 1].forEach(s=>{ bsChain(tor, [s*0.36, 0.64, 0.7], [s*0.46, 1.08, 0.12], 6, 0x2a2622, 0.028, 0.03); });
  P(tor, bsRing(0.52, 0.04, PI*0.9), 0x2a1e14, 0, 1.0, 0.0, PI/2 + 0.25, 0, PI*0.55);
  // arms: short and fat. The right stirs with a ladle long enough to reach the pot; the left keeps a cleaver
  const arm = (s)=>{
    const a = group(tor, s*0.6, 0.98, 0.05); a.rotation.set(-0.55, 0, s*0.18);
    P(a, bsPaint(bsBlob(0.17, 1.1, 1, 1, 0.015, 8, s + 4, 22, 16), CK.skin, CK.skin2, 5, s), 0xffffff, 0, 0, 0);
    flesh(a, [[0, 0, 0], [s*0.04, -0.2, 0.03], [s*0.04, -0.36, 0.05]], 0.14, 0.12, CK.skin, s*4);
    const el = group(a, s*0.04, -0.36, 0.05); el.rotation.x = -0.9;
    flesh(el, [[0, 0, 0], [0, -0.16, 0.01], [0, -0.32, 0.02]], 0.12, 0.1, CK.skin, s*6);
    P(el, CY(0.11, 0.12, 0.1, 12), CK.sack2, 0, -0.08, 0.01);
    const hand = group(el, 0, -0.38, 0.03);
    P(hand, bsPaint(bsBlob(0.085, 1.1, 1.0, 1.2, 0.01, 12, s*3, 18, 12), CK.skin, CK.skin2, 9, 2), 0xffffff, 0, 0, 0);
    return { a, el, hand };
  };
  const AR = arm(1), AL = arm(-1);
  R.parts.armR = AR.a; R.parts.armL = AL.a; R.parts.elR = AR.el; R.parts.elL = AL.el;
  // the ladle runs from the fist down into the broth (aimed at rest, so it always reaches)
  const ladle = group(AR.hand, 0, 0, 0); R.parts.ladle = ladle;
  R.root.updateMatrixWorld(true);
  const into = AR.hand.worldToLocal(pot.localToWorld(new THREE.Vector3(0.06, 0.1, 0.04)));
  const L = into.length(); ladle.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), into.clone().normalize());
  P(ladle, CY(0.018, 0.022, L + 0.12, 8), 0x3a2618, 0, -(L - 0.12)/2, 0);
  P(ladle, bsLathe([[0.01, -0.07], [0.08, -0.05], [0.1, 0.0], [0.1, 0.02]], 16), 0x34302c, 0, -L, 0.0);
  const scoop = glow(R, ladle, 0.05, CK.broth, 0, -L + 0.01, 0.0); scoop.scale.set(1.5, 0.4, 1.5); R.parts.scoop = scoop;
  const clv = group(AL.hand, 0, -0.04, 0.02); clv.rotation.x = -0.2;
  P(clv, CY(0.025, 0.028, 0.18, 8), 0x2a1a10, 0, 0, 0);
  const blade = new THREE.BoxGeometry(0.02, 0.28, 0.36, 1, 4, 6); bsJitter(blade, 0.006, 30, 2);
  bsPaint(blade, 0x4a4a4c, 0x3a1a14, 12, 3, (c, x, y, z)=>{ if(z > 0.14) c.lerp(C.setHex(0x8a8a88), 0.4); });
  P(clv, blade, 0xffffff, 0, -0.2, 0.12);
  R.h = 1.8*Sc; R.size = Sc;
  return finish(R);
};
Models.FAMILY.lair_cook = "bloater";
Models.MOVES.lair_cook = c=>{
  const { m, P, t, dt, s, ph, fall, fl, fit, breath, shake, pose } = c, k = c.kind;
  const bW = k === "brew" ? c.wind : 0, bS = k === "brew" ? c.st : 0;
  const rW = k === "charge" ? c.wind : 0, rS = k === "charge" ? c.st : 0;
  // the breath: a slow wheeze that fills the gut, catches, and lets go
  const cy = (t*0.45 + c.R.size) % 1, inh = cy < 0.7 ? smooth(0, 0.7, cy) : 1 - smooth(0.7, 0.85, cy);
  const gut = 1 + 0.05*inh + (cy > 0.62 && cy < 0.72 ? Math.sin(t*60)*0.012 : 0);
  // the stir: a slow circle in the pot, faster and faster through a brew
  m.stir = (m.stir || 0) + dt*(1.6 + 14*bW*bW);
  const sx = Math.cos(m.stir), sz = Math.sin(m.stir), deep = 1 - smooth(0, 0.15, bS);
  // the torso leans over the pot, rears back with the heave, tucks for the roll
  const lean = sp(m, "lean", 0.08*s + 0.18*bW - 0.42*bS + 0.55*rW + 0.35*rS - 0.2*fl + 0.03*inh, 220, 18, dt);
  const roll = sp(m, "roll", Math.sin(ph)*0.1*s + (fit > 0.5 ? Math.sin(t*20)*0.04 : 0), 120, 12, dt);
  pose(c.R.tor, 0, 0, 0, lean, sx*0.05*(0.3 + bW), roll, gut, 1 + 0.03*inh, gut);
  pose(P.head, 0, 0, 0, 0.25*bW - 0.3*bS + 0.4*rW + Math.sin(t*1.3)*0.05 - 0.2*fl, Math.sin(t*0.7)*0.2*(1 - bW), Math.sin(t*0.9)*0.08);
  P.legs.forEach((l, i)=> pose(l, 0, 0, 0, Math.sin(ph + i*PI)*0.5*s - 0.3*rW, 0, (i ? -1 : 1)*(0.06 + 0.04*s)));
  // the ladle arm: circling in the pot, then heaving up and over the head
  const rX = sp(m, "rX", -0.15 + sz*0.22*deep*(1 - rW) - 2.7*bS + 0.5*rW, 360, 22, dt);
  const rZ = sp(m, "rZ", -0.25 + sx*0.22*deep*(1 - rW) - 0.2*rW, 360, 22, dt);
  pose(P.armR, 0, 0, 0, rX + shake*3, 0, rZ);
  pose(P.elR, 0, 0, 0, 0.35*bS);
  pose(P.ladle, 0, 0, 0, 0.2*bS, 0, 0);
  if(P.scoop) P.scoop.scale.set(1.5*(0.4 + 0.6*smooth(0, 0.3, c.strike + bW)), 0.4, 1.5);
  // the cleaver arm braces on the rim through the brew, and hangs and swings otherwise
  const lX = sp(m, "lX", Math.sin(ph)*0.3*s + 0.35*bW - 0.25*bS + 0.4*rW + 0.03*breath, 260, 18, dt);
  pose(P.armL, 0, 0, 0, lX + shake*3, 0, 0.25*bW - 0.15*rW);
  pose(P.elL, 0, 0, 0, -0.3*bW);
  // the pot swings on its straps
  const potS = sp(m, "pot", -lean*0.4 + Math.sin(ph)*0.08*s + 0.4*bS, 90, 7, dt);
  pose(P.pot, 0, 0, 0, potS, 0, Math.sin(ph + 1)*0.06*s + Math.sin(t*2.1)*0.02);
  if(P.steam) P.steam.scale.setScalar(0.8 + 0.3*Math.sin(t*2.3) + 1.2*bW + 0.8*bS);
  const Sc = 1.6;
  return { y:(-0.05*fall*s - 0.06*rW + 0.04*bS)*Sc, z:(0.3*rS - 0.05*fl)*Sc, rx:0.03*s + shake + 0.12*rW, rz:Math.sin(ph)*0.08*s };
};

/* ================================================================== *
 *  Gnaw, the Kennel Hound: a starved hound the size of a horse, ribs
 *  like a cage, its hide gone in raw patches. A long skull of a head
 *  with too many teeth, eyes gone milky, a spiked collar with the
 *  chain still on it, snapped where it tore it out of the wall.
 * ================================================================== */
const HD = { hide:0x4a4038, hide2:0x221c18, raw:0x5a2422, raw2:0x2a0e0e, bone:0xb0a488, iron:0x262428 };
function houndPaint(g, seed){
  return bsPaint(g, HD.hide, HD.hide2, 5, seed, (c, x, y, z)=>{
    const n = bsN(x, y, z, 3.2, seed + 4);
    if(n > 0.42) c.lerp(C.setHex(n > 0.6 ? HD.raw : HD.raw2), Math.min(1, (n - 0.42)*4));      // flayed, raw
    if(y < 0.85) c.multiplyScalar(0.8);
  });
}
/* a tuft of fur: a ragged cone from (x, y, z) along (nx, ny, nz) */
const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3();
function tuft(parent, x, y, z, nx, ny, nz, len, rad, col, seed){
  // a lock of hair, not a quill: flat, wide at the root, a little bent
  const g = bsJitter(new THREE.ConeGeometry(rad, len, 6, 3), rad*0.2, 30, seed); g.scale(1.5, 1, 0.45); g.translate(0, len/2, 0);
  const pa = g.attributes.position; for(let i=0;i<pa.count;i++){ const yy = pa.getY(i)/len; pa.setZ(i, pa.getZ(i) - yy*yy*len*0.25); }
  const m = P(parent, g, col, x, y, z);
  m.quaternion.setFromUnitVectors(_up, _dir.set(nx, ny, nz).normalize());
  return m;
}
const FUR = [0x221c18, 0x2e2620, 0x3a3028, 0x4a4038, 0x1a1512];
const fh = i=>{ const v = Math.sin(i*12.9898 + 4.1)*43758.5453; return v - Math.floor(v); };
/* a pelt of tufts over an ellipsoid (centre c, radii rr), standing out from it and
   swept back along -z by `sweep`; only the part of the shell where keep(nx, ny, nz) holds */
function pelt(parent, n, c, rr, len, rad, sweep, seed, keep){
  for(let i=0, k=0; i<n*3 && k<n; i++){
    const u = fh(seed + i*3.1), v = fh(seed + i*7.7), th = u*PI*2, ph = Math.acos(2*v - 1);
    const nx = Math.sin(ph)*Math.cos(th), ny = Math.cos(ph), nz = Math.sin(ph)*Math.sin(th);
    if(keep && !keep(nx, ny, nz)) continue;
    k++;
    const l = len*(0.7 + 0.6*fh(seed + i*1.3));
    // rooted a little under the hide, lying along it: mostly swept back, only a little out
    tuft(parent, c[0] + nx*rr[0]*0.86, c[1] + ny*rr[1]*0.86, c[2] + nz*rr[2]*0.86, nx*0.45, ny*0.4 - 0.05, nz*0.45 - sweep, l, rad*1.35*(0.8 + 0.4*fh(seed + i*5.3)), FUR[Math.floor(fh(seed + i*2.2)*FUR.length)], seed + i);
  }
}
Models.lair_hound = function(){
  const R = rig("lair_hound"), b = R.body;
  // Gnaw is a wolf the size of a cart: heavy in the shoulder under a shaggy mane, deep
  // in the chest, narrowing to lean haunches, on thick legs and broad paws. (It was a
  // gaunt thing a hand's width across on stick legs: from above it read as a sheet of paper.)
  const g = group(b); g.scale.set(1.05, 1.05, 1.1);
  const sp0 = group(g, 0, 0, 0); R.parts.spine = sp0;
  // the body: a barrel of a chest under the shoulders, the belly drawn up, lean hips
  const torso = meat([[0, 1.2, 0.86], [0, 1.18, 0.46], [0, 1.16, -0.06], [0, 1.18, -0.5], [0, 1.2, -0.86]],
    t=> t < 0.45 ? 0.34 - 0.04*Math.pow(t/0.45 - 0.4, 2) : t < 0.7 ? 0.33 - 0.11*Math.sin((t - 0.45)/0.25*PI/2) : 0.22 + 0.03*Math.sin((t - 0.7)/0.3*PI), 18, 18, 3.3);
  K.sculpt(torso, 0.02, 7, 2);
  P(sp0, houndPaint(torso, 1), 0xffffff, 0, 0, 0, 0, 0, 0, 0.92, 1.12, 1);
  // the chest hangs deep between the forelegs
  P(sp0, houndPaint(bsBlob(0.24, 0.9, 1.0, 1.25, 0.02, 9, 3, 20, 16), 2), 0xffffff, 0, 1.0, 0.5);
  // the shoulders and the haunches, standing out of the line of the body
  [-1, 1].forEach(s=>{
    P(sp0, houndPaint(bsBlob(0.2, 0.8, 1.1, 1.2, 0.02, 9, s + 1, 18, 14), 4), 0xffffff, s*0.2, 1.24, 0.56);
    P(sp0, houndPaint(bsBlob(0.19, 0.8, 1.1, 1.15, 0.02, 9, s + 3, 18, 14), 6), 0xffffff, s*0.17, 1.18, -0.74);
    P(sp0, bsPaint(bsBlob(0.13, 0.3, 0.8, 1.4, 0.02, 12, s + 5, 14, 10), HD.raw, HD.raw2, 14, s), 0xffffff, s*0.27, 1.1, 0.08, 0, 0, s*0.2);      // a flank torn open to the meat
  });
  // the mane: a great ruff over the shoulders and up the neck, swept back
  pelt(sp0, 70, [0, 1.36, 0.6], [0.36, 0.32, 0.4], 0.34, 0.075, 0.9, 11, (x, y, z)=> y > -0.35 && z > -0.6);
  // shag along the back and down the flanks, shorter toward the tail
  pelt(sp0, 40, [0, 1.26, -0.15], [0.3, 0.26, 0.55], 0.22, 0.055, 1.2, 37, (x, y, z)=> y > -0.1);
  pelt(sp0, 18, [0, 1.22, -0.72], [0.24, 0.22, 0.24], 0.16, 0.05, 1.0, 59, (x, y, z)=> y > 0 && z < 0.3);
  // the spine's knuckles show where the hair has gone
  for(let i=0;i<7;i++) P(sp0, CO(0.035, 0.07, 6), HD.bone, 0, 1.47 - i*0.012, -0.05 - i*0.12, -0.3);
  // the neck: thick, carried low and forward, the head jutting off the end of it
  const neck = group(sp0, 0, 1.36, 0.82); R.parts.neck = neck; neck.rotation.x = 0.18;
  P(neck, houndPaint(meat([[0, 0, -0.14], [0, 0.0, 0.2], [0, -0.04, 0.46]], t=> 0.24 - 0.07*t, 10, 14, 2), 3), 0xffffff, 0, 0, 0, 0, 0, 0, 0.95, 1.1, 1);
  pelt(neck, 26, [0, 0.03, 0.12], [0.24, 0.24, 0.26], 0.26, 0.065, 1.0, 83, (x, y, z)=> y > -0.5);
  // the collar: an iron band with spikes, the chain snapped and trailing
  P(neck, CY(0.25, 0.25, 0.1, 18, 1), HD.iron, 0, 0, 0.2, PI/2 - 0.2, 0, 0, 0.95, 1, 1.1);
  for(let i=0;i<10;i++){ const a = i/10*PI*2; P(neck, CO(0.026, 0.13, 6), 0x3a3634, Math.cos(a)*0.25, Math.sin(a)*0.27, 0.2 + Math.sin(a)*0.04, 0, 0, a - PI/2); }
  P(neck, bsRing(0.045, 0.013), 0x3a3634, 0, -0.28, 0.2, 0, PI/2, 0);
  const tail0 = group(neck, 0, -0.3, 0.2); R.parts.leash = tail0;
  dangle(tail0, 0, 0, 0, 7, 0.045, 0x2a2828);
  const head = group(neck, 0, 0.02, 0.5); R.parts.head = head; head.rotation.x = -0.08; head.scale.setScalar(1.2);
  // the skull: broad across the cheeks, a long heavy muzzle
  const cran = bsBlob(0.17, 1.05, 0.85, 1.2, 0.014, 12, 2, 24, 18); P(head, houndPaint(cran, 7), 0xffffff, 0, 0.05, 0.02);
  const muz = bsTaper([[0, 0.03, 0.08], [0, 0.0, 0.32], [0, -0.03, 0.6]], 0.12, 0.065, 10, 14);
  P(head, bsPaint(muz, 0x4a4038, HD.raw2, 9, 3), 0xffffff, 0, 0, 0, 0, 0, 0, 1.05, 0.9, 1);
  P(head, S(0.05, 10, 8), 0x0e0a0a, 0, 0.0, 0.63, 0, 0, 0, 1.1, 0.8, 0.7);                 // the nose, gone black
  // ruffs of hair at the cheeks
  [-1, 1].forEach(s=>{ for(let i=0;i<7;i++){ const a = -0.6 + i*0.2; tuft(head, s*0.15, 0.02 + Math.sin(a)*0.1, 0.0 + Math.cos(a)*0.05, s*0.9, Math.sin(a)*0.5, -0.6, 0.16 + fh(i + s*9)*0.08, 0.04, FUR[(i + (s > 0 ? 1 : 3)) % FUR.length], 120 + i + s*20); } });
  [-1, 1].forEach(s=>{
    P(head, S(0.05, 10, 8), HD.hide2, s*0.1, 0.09, 0.13, 0, 0, 0, 1, 0.75, 0.7);
    const e = glow(R, head, 0.026, 0xc8d0c8, s*0.105, 0.09, 0.16); e.scale.set(1.3, 0.7, 0.7);       // milky, narrowed
    halo(R, head, 0xb8c8c8, 0.24, s*0.105, 0.09, 0.18, 0.25);
    // ears, tall and torn, laid back
    const ear = new THREE.ConeGeometry(0.07, 0.26, 6, 2); bsJitter(ear, 0.01, 20, s);
    P(head, bsPaint(ear, HD.hide, HD.raw2, 9, s), 0xffffff, s*0.1, 0.22, -0.07, -0.75, 0, s*-0.3, 1, 1, 0.5);
    // the lip curled back off the teeth
    for(let i=0;i<8;i++) P(head, bsTooth(), 0xffffff, s*(0.075 - i*0.005), -0.08, 0.16 + i*0.055, PI + 0.1, 0, s*0.1, 0.85, 0.85 + (i*3 % 4)*0.15, 0.85);
  });
  // the jaw: long and heavy, hinged far back, hanging open
  const jaw = group(head, 0, -0.08, 0.04); R.parts.jaw = jaw; jaw.rotation.x = 0.22;
  P(jaw, bsPaint(bsTaper([[0, -0.02, 0.0], [0, -0.04, 0.26], [0, -0.03, 0.54]], 0.1, 0.05, 10, 12), 0x3e3630, HD.raw2, 9, 4), 0xffffff, 0, 0, 0, 0, 0, 0, 1.05, 0.65, 1);
  P(jaw, S(0.07, 10, 8), 0x2a0a0c, 0, 0.0, 0.3, 0, 0, 0, 0.8, 0.3, 2.6);
  for(let i=0;i<9;i++) [-1, 1].forEach(s=> P(jaw, bsTooth(), 0xffffff, s*(0.06 - i*0.004), 0.0, 0.06 + i*0.055, -0.1, 0, -s*0.15, 0.75, 0.65 + (i*5 % 3)*0.2, 0.75));
  // legs: thick forearms under the mane, the hind legs bent like a drawn bow, broad paws
  const legs = [];
  const paw = (parent, x, y, z, s)=>{
    P(parent, houndPaint(bsBlob(0.09, 1.0, 0.55, 1.45, 0.01, 10, s + 7, 14, 10), 12), 0xffffff, x, y, z);
    for(let k=-1;k<=1;k++) P(parent, CO(0.016, 0.1, 5), 0x1a1612, x + k*0.045, y - 0.02, z + 0.13, PI/2 + 0.35);
  };
  const fore = (s)=>{
    const l = group(sp0, s*0.2, 1.2, 0.58); legs.push(l);
    P(l, houndPaint(meat([[0, 0.12, 0.02], [s*0.02, -0.22, -0.04], [s*0.01, -0.5, -0.07]], t=> 0.18 - 0.05*t, 10, 12, s), 5 + s), 0xffffff, 0, 0, 0);
    pelt(l, 12, [0, -0.1, -0.02], [0.17, 0.26, 0.15], 0.2, 0.05, 1.2, 140 + s*7, (x, y, z)=> z < 0.3);
    pelt(l, 6, [0, -0.6, -0.05], [0.1, 0.12, 0.1], 0.14, 0.04, 0.6, 160 + s*7, (x, y, z)=> y > -0.3);
    const el = group(l, s*0.01, -0.5, -0.07); R.parts["el" + (s > 0 ? "R" : "L")] = el;
    P(el, houndPaint(meat([[0, 0, 0], [0, -0.32, 0.03], [0, -0.62, 0.06]], t=> 0.11 - 0.025*t, 10, 10, s + 1), 8), 0xffffff, 0, 0, 0);
    paw(el, 0, -0.67, 0.1, s);
    return l;
  };
  const hind = (s)=>{
    const l = group(sp0, s*0.18, 1.18, -0.78); legs.push(l);
    P(l, houndPaint(meat([[0, 0.12, 0.06], [s*0.02, -0.16, 0.14], [s*0.02, -0.42, 0.18]], t=> 0.23 - 0.1*t, 10, 12, s + 3), 9 + s), 0xffffff, 0, 0, 0);
    const kn = group(l, s*0.02, -0.42, 0.18); R.parts["kn" + (s > 0 ? "R" : "L")] = kn;
    P(kn, houndPaint(meat([[0, 0, 0], [0, -0.18, -0.14], [0, -0.36, -0.28]], t=> 0.12 - 0.03*t, 10, 10, s + 5), 11), 0xffffff, 0, 0, 0);
    P(kn, houndPaint(meat([[0, -0.36, -0.28], [0, -0.56, -0.22], [0, -0.74, -0.16]], t=> 0.08 - 0.015*t, 8, 9, s), 13), 0xffffff, 0, 0, 0);
    paw(kn, 0, -0.76, -0.1, s);
    return l;
  };
  fore(-1); fore(1); hind(-1); hind(1);
  R.parts.legs = legs;
  // the tail: a heavy brush of matted hair, carried low
  const tail = group(sp0, 0, 1.3, -1.0); R.parts.tail = tail; tail.rotation.x = 0.45;
  P(tail, houndPaint(bsTaper([[0, 0, 0], [0, -0.14, -0.26], [0, -0.42, -0.44], [0, -0.78, -0.5]], 0.09, 0.03, 12, 8), 13), 0xffffff, 0, 0, 0);
  for(let i=0;i<22;i++){ const t = i/22, y = -0.05 - t*0.7, z = -0.12 - t*0.36 - (t > 0.5 ? (t - 0.5)*0.2 : 0), a = fh(i + 200)*PI*2;
    tuft(tail, Math.cos(a)*0.06, y + Math.sin(a)*0.05, z, Math.cos(a)*0.6, -0.6 + Math.sin(a)*0.4, -0.5, 0.16 - t*0.05, 0.045, FUR[i % FUR.length], 200 + i); }
  R.h = 1.85; R.size = 2.4;
  return finish(R);
};
Models.FAMILY.lair_hound = "goblin";
Models.MOVES.lair_hound = c=>{
  const { m, P, t, dt, s, ph, fall, fl, fit, breath, shake, pose } = c, k = c.kind, o = c.o;
  const pW = k === "pounce" ? c.wind : 0, pS = k === "pounce" ? c.st : 0;
  const bW = k === "stab" ? c.wind : 0, bS = k === "stab" ? c.st : 0;
  const hW = k === "howl" ? c.wind : 0, hS = k === "howl" ? c.st : 0;
  const air = sp(m, "air", Math.min(1, (o.hop || 0)*2.2) + 0.6*pS, 300, 26, dt);       // stretched out in the leap
  c.glance([0.3, 1.6], 0.5, 600);
  // a trot: diagonal pairs (front left with hind right)
  const ph4 = [0, PI, PI, 0];
  const crouch = sp(m, "crouch", pW + 0.3*bW - 0.15*hW, 260, 20, dt);
  const howl = sp(m, "howl", Math.max(hW, 0.85*hS), 140, 14, dt);
  P.legs.forEach((l, i)=>{
    const front = i < 2, q = ph + ph4[i], sw = Math.sin(q)*0.6*s*(1 - air);
    const coil = front ? -0.25*crouch : 0.45*crouch;                             // the hind legs come up under it
    const stretch = front ? -1.25*air : 1.15*air;                                // forelegs reach, hind legs kick out behind
    pose(l, 0, front ? 0 : -0.05*howl, 0, sw + coil + stretch - (front ? 0.2*howl : -0.3*howl) + (fit > 0.7 && i === 1 ? Math.sin(t*30)*0.2 : 0));
  });
  // the elbows and hocks fold through the stride, deeper in the crouch
  [["elL", 0], ["elR", 1]].forEach(([n, i])=>{ if(P[n]) pose(P[n], 0, 0, 0, Math.max(0, Math.sin(ph + ph4[i] + 0.8))*0.7*s + 0.55*crouch - 0.4*air); });
  [["knL", 2], ["knR", 3]].forEach(([n, i])=>{ if(P[n]) pose(P[n], 0, 0, 0, -Math.max(0, Math.sin(ph + ph4[i] + 0.8))*0.5*s - 0.65*crouch + 0.35*air + 0.4*howl); });
  // the spine: breathing ribs, a hunch in the crouch, a long flat stretch in the air, sat back for a howl
  const rib = 1 + 0.03*breath;
  pose(P.spine, 0, 0, 0, 0, 0, 0, rib, 1 + 0.015*breath, 1 + 0.05*air);
  // the neck and head: low and swinging as it trots, sniffing at rest; drawn back to bite, up to howl
  const sniff = s < 0.2 ? Math.max(0, Math.sin(t*9))*0.05*(Math.sin(t*0.7) > 0.3 ? 1 : 0) : 0;
  const nX = sp(m, "nX", 0.1*s + 0.05*pW + 0.25*bW - 0.55*bS - 1.15*howl - 0.35*air - 0.25*fl + sniff + Math.sin(ph*2)*0.06*s, 380, 22, dt);
  pose(P.neck, 0, 0, 0.12*bS - 0.08*bW, nX, m.gy.x*0.5*(1 - howl) + Math.sin(ph)*0.08*s, fit > 0.5 ? Math.sin(t*36)*0.1*fit : 0);
  pose(P.head, 0, 0, 0.15*bS, m.gx.x*0.4 - 0.15*bW + 0.25*bS - 0.5*howl + shake*3, 0, 0);
  // the jaw: hangs a little, gapes for the bite and slams shut on the release; wide for the howl
  const jaw = sp(m, "jaw", 0.08 + 0.05*Math.max(0, breath) + 0.75*bW + 0.6*howl + 0.35*pW - (bS > 0.05 ? 0.25 : 0), bS > 0.05 ? 1400 : 300, bS > 0.05 ? 40 : 20, dt);
  pose(P.jaw, 0, 0, 0, Math.max(-0.05, jaw));
  pose(P.leash, 0, 0, 0, -nX*0.6 + Math.sin(t*2.1)*0.1 + 0.5*air, 0, Math.sin(ph)*0.25*s);
  pose(P.tail, 0, 0, 0, -0.4*air + 0.3*crouch + Math.sin(t*1.4)*0.08, Math.sin(t*2.2 + (fit > 0 ? t*8 : 0))*0.25 + Math.sin(ph)*0.2*s, 0);
  return { y:1.15*(-0.42*crouch - 0.05*s*(1 - Math.abs(Math.sin(ph))) + 0.05*air), z:0.35*bS - 0.15*fl + 0.4*pS, rx:0.12*crouch - 0.22*howl - 0.08*air + shake + 0.03*s, rz:Math.sin(ph)*0.03*s };
};

})();
