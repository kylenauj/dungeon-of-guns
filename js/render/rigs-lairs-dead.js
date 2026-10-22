/* ------------------------------------------------------------------ *
 *  Rigs of their own (see Models.MOVES in models.js for the moves):
 *  the dead and the holy. The Reliquary Warden, the Choir of Husks and
 *  the Bell-Ringer, each built at its full size in the game (the view
 *  scales a lair's rig by 1/size).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, P, rig, group, glow, halo, finish, zs, BS, bsN, bsPaint, bsBlob, bsLathe, bsCloth, bsChain, bsSkull, bsCandle, bsTaper, bsJitter, meat, sculptW, lumpS, lobes, blotch, cordyceps, ROT, smooth } = H;
const bsC = new THREE.Color();

/* the release of a strike, kept on the rig: out in a blink past where it's
   going (an overshoot), held a moment, then eased back over dur seconds.
   Returns 0..~1.15, and the kind of the strike in m.sKind */
function release(c, dur){
  const m = c.m;
  if(m.struck){ m.sk = 0; m.sKind = c.kind; }
  if(m.sk === undefined) m.sk = 99;
  m.sk += c.dt;
  const k = m.sk;
  if(k >= dur) return 0;
  if(k < 0.06) return smooth(0, 0.06, k)*1.18;
  if(k < 0.14) return 1.18 - 0.18*smooth(0.06, 0.14, k);
  return 1 - smooth(dur*0.3, dur, k);
}
/* a cloth panel hanging from y0 to y1 at depth z (front or back), w wide,
   bent round a body of radius rr, torn at the hem */
function panel(w, y0, y1, z, rr, seed, flame){
  const h = y0 - y1, g = new THREE.PlaneGeometry(w, h, 8, 14), a = g.attributes.position;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i) + (y0 + y1)/2, fy = (y0 - y)/h;
    a.setXYZ(i, x, y, Math.abs(z) - x*x/(2*rr) + Math.sin(x*14 + y*3 + seed)*0.012 + fy*0.03);
  }
  K.tatter(g, y1 + h*0.22, 70, h*0.2, seed);
  if(z < 0) g.rotateY(PI);
  return g;
}
/* vertical folds in a turned robe: n of them, deeper toward the hem (below y1) */
function folds(g, n, amt, y1){
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i), z = a.getZ(i), ang = Math.atan2(x, z);
    const k = 1 + amt*Math.sin(ang*n + Math.sin(ang*3)*0.8)*Math.max(0.15, Math.min(1, (y1 - y)/y1)); a.setX(i, x*k); a.setZ(i, z*k); }
  g.computeVertexNormals();
  return g;
}
/* a flame: a flat wavering teardrop, glowing (the keepers' sigil) */
function flameShape(s){
  const sh = new THREE.Shape();
  const pts = [];
  for(let i=0;i<=40;i++){
    const t = i/40, a = t*PI*2;
    // teardrop: round at the bottom, drawn up into a licking tip
    const x = Math.sin(a)*(0.55 - 0.35*Math.max(0, Math.cos(a)))*(1 + 0.18*Math.sin(a*3)) ;
    const y = -Math.cos(a)*0.62 + 0.38*Math.pow(Math.max(0, -Math.cos(a)), 3) + 0.1*Math.sin(a*2);
    pts.push(new THREE.Vector2(x*s, y*s));
  }
  sh.setFromPoints(pts);
  return new THREE.ShapeGeometry(sh, 6);
}
function glowMesh(R, parent, g, c, op, x, y, z){
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:op, side:THREE.DoubleSide, depthWrite:false }));
  m.position.set(x || 0, y || 0, z || 0); parent.add(m); R.glows.push(m); return m;
}

/* ================================================================== *
 *  The Reliquary Warden: a dead keeper still at his post. Rusted plate,
 *  a tabard rotted to rags with the keepers' flame on it, a great-helm
 *  with candles burnt down on its crown, a tower shield the height of a
 *  man, an arbalest with a box of bolts on it, and the reliquary's
 *  lantern caged on his back. About 2.4 tall.
 * ================================================================== */
const WD = { iron:0x4a4640, iron2:0x2c2a27, rust:0x7a4428, rust2:0x4a2414, cloth:0x4a2420, cloth2:0x24120e, sigil:0x8a6a30,
  leather:0x33251a, wood:0x3a281c, bone:0xb8ac90, flame:0xffa040, soul:0xffd890 };
const rusty = (g, f, seed)=> bsPaint(g, WD.iron, WD.rust, f || 6, seed || 1, (c, x, y, z)=>{ if(bsN(x, y*3, z, 9, (seed || 1) + 4) > 0.55) c.lerp(bsC.setHex(WD.rust2), 0.6); });
Models.lair_warden = function(){
  const R = rig("lair_warden"), b = R.body, p = R.parts;
  // legs: cuisses, knee cops, greaves, sabatons, over the dead man's bones
  p.legs = [-1, 1].map(s=>{
    const l = group(b, s*0.17, 1.08, 0);
    P(l, meat([[0, 0.04, 0], [s*0.01, -0.24, 0.02], [0, -0.48, 0.03]], t=> 0.105 - 0.02*t, 8, 9, s + 3), WD.iron2);
    P(l, rusty(new THREE.CylinderGeometry(0.125, 0.105, 0.38, 14, 3), 9, s + 1), 0xffffff, 0, -0.2, 0.01);
    P(l, rusty(new THREE.SphereGeometry(0.095, 12, 8), 12, s + 2), 0xffffff, 0, -0.5, 0.06, 0, 0, 0, 1.05, 1, 0.8);
    P(l, rusty(new THREE.ConeGeometry(0.1, 0.1, 10, 1, true), 12, s + 5), 0xffffff, s*0.07, -0.5, 0.03, 0, 0, -s*PI/2, 1, 1, 0.4);
    P(l, rusty(new THREE.CylinderGeometry(0.09, 0.075, 0.46, 14, 3), 9, s + 7), 0xffffff, 0, -0.78, 0.01);
    for(let i=0;i<3;i++) P(l, rusty(new THREE.BoxGeometry(0.16 - i*0.01, 0.05, 0.12), 10, s + i), 0xffffff, 0, -1.0 - i*0.012, 0.06 + i*0.07, 0.25*i);
    P(l, BX(0.15, 0.05, 0.3), WD.iron2, 0, -1.055, 0.08);
    return l;
  });
  // the skirt: lames of plate over a skirt of black mail
  P(b, bsJitter(bsLathe([[0.33, 0.62], [0.31, 0.78], [0.28, 1.0]], 28), 0.01, 20, 3), 0x26262a);
  for(let i=0;i<3;i++) P(b, rusty(bsLathe([[0.33 - i*0.015, 0.0], [0.3 - i*0.015, 0.12]], 28), 7, i + 2), 0xffffff, 0, 0.84 + i*0.11, 0, 0.04);
  // the breastplate, rusted through over the heart: ribs show in the hole
  const chest = bsBlob(0.3, 1.12, 1.28, 0.82, 0.008, 9, 2.2);
  bsPaint(chest, WD.iron, WD.rust, 5, 3, (c, x, y, z)=>{
    if(z > 0.12 && Math.hypot(x + 0.09, y - 0.06) < 0.085) c.setHex(0x0a0606);
    else if(z > 0.1 && Math.hypot(x + 0.09, y - 0.06) < 0.11) c.lerp(bsC.setHex(WD.rust2), 0.8);
    if(bsN(x, y*4, z, 8, 9) > 0.6) c.lerp(bsC.setHex(0x7a4a2a), 0.5);
  });
  P(b, chest, 0xffffff, 0, 1.5, 0.0);
  for(let i=0;i<3;i++) P(b, bsTaper([[-0.15, 1.6 - i*0.035, 0.18], [-0.09, 1.585 - i*0.035, 0.23], [-0.03, 1.59 - i*0.035, 0.2]], 0.01, 0.007, 6, 6), WD.bone);
  P(b, rusty(new THREE.CylinderGeometry(0.13, 0.19, 0.14, 16), 8, 6), 0xffffff, 0, 1.86, 0);
  P(b, H.TO(0.3, 0.035), WD.leather, 0, 1.2, 0, PI/2, 0, 0, 1, 0.82, 1);
  P(b, BX(0.07, 0.07, 0.03), BS.brass, 0, 1.2, 0.25);
  // the tabard, front and back, a dull flame on the front
  const tab = (z, seed, sig)=>{
    const g = panel(0.42, 1.84, 0.34, z, 0.4, seed);
    bsPaint(g, WD.cloth, WD.cloth2, 6, seed, (c, x, y, zz)=>{
      c.multiplyScalar(0.7 + Math.min(0.5, (y - 0.34)*0.35));
      if(sig){ const fx = x/0.11, fy = (y - 1.2)/0.2; const r = Math.hypot(fx*(1 + Math.max(0, fy)*1.4), fy + 0.15); if(r < 1 && fy < 0.95) c.lerp(bsC.setHex(WD.sigil), 0.85*(1 - Math.pow(r, 6))); }
      if(bsN(x, y, zz, 14, seed) > 0.5) c.lerp(bsC.setHex(0x14100c), 0.6);
    });
    P(b, g, 0xffffff);
  };
  tab(0.32, 3, true); tab(-0.33, 7, false);
  // a short cloak off the shoulders, torn to the knees
  bsCloth(b, [[0.2, 0.05], [0.33, -0.08], [0.38, -0.5], [0.42, -1.1]], 0x2e2620, 0x16120e, 1.75, -0.75, 16, 0.3, 5.2, 0, 1.9, -0.05, 0.06, 0, 0, 1, 1, 0.78);
  bsCloth(b, [[0.14, 0.08], [0.3, -0.02], [0.4, -0.16], [0.42, -0.3]], WD.cloth, WD.cloth2, 0, -0.18, 22, 0.12, 9.1, 0, 1.92, 0.0, 0, 0, 0, 1, 1, 0.85);
  // the head: a great-helm, crested, a cold glint in the slit, candles burnt down on its crown
  const hd = p.head = group(b, 0, 1.9, 0.04);
  P(hd, meat([[0, -0.1, 0], [0, 0.0, 0.01]], ()=> 0.07, 4, 8, 2), WD.bone);
  const helm = bsLathe([[0.19, -0.04], [0.17, 0.0], [0.155, 0.08], [0.16, 0.2], [0.15, 0.27], [0.11, 0.31], [0.0, 0.325]], 26);
  bsPaint(helm, WD.iron, WD.rust, 7, 5, (c, x, y, z)=>{
    if(z > 0.05 && Math.abs(y - 0.16) < 0.011 && Math.abs(x) > 0.018 && Math.abs(x) < 0.12) c.setHex(0x050404);
    if(z > 0.1 && y < 0.12 && y > 0.02 && Math.abs(Math.abs(x) - 0.05) < 0.01 && Math.round(y*60) % 2) c.setHex(0x0a0808);
    if(bsN(x, y*3, z, 11, 2) > 0.5) c.lerp(bsC.setHex(WD.rust2), 0.6);
    if(y < 0.0) c.multiplyScalar(0.7);
  });
  P(hd, helm, 0xffffff, 0, 0.0, 0, 0, 0, 0, 1, 1, 1.08);
  P(hd, rusty(bsLathe([[0.0, 0.31], [0.03, 0.31], [0.022, 0.0]], 8), 10, 2), 0xffffff, 0, 0, 0.16, 0.0, 0, 0, 0.8, 1, 1);
  P(hd, rusty(new THREE.BoxGeometry(0.025, 0.14, 0.38, 1, 3, 8), 12, 6), 0xffffff, 0, 0.36, -0.02);
  P(hd, H.TO(0.19, 0.018), 0x2a2622, 0, 0.0, 0, PI/2, 0, 0, 1, 1.08, 1);
  [-1, 1].forEach(s=>{ glow(R, hd, 0.012, WD.soul, s*0.055, 0.16, 0.16); halo(R, hd, WD.soul, 0.16, s*0.055, 0.16, 0.18, 0.5); });
  [[-0.09, 0.02, 0.17], [0.1, 0.05, 0.13], [0.07, -0.08, 0.1], [-0.08, -0.08, 0.14]].forEach(([x, z, h])=> bsCandle(R, hd, x, 0.29, z, h, 0.8));
  P(hd, bsJitter(new THREE.CylinderGeometry(0.135, 0.15, 0.04, 20, 1), 0.008, 30, 4), BS.wax, 0, 0.29, 0);
  for(let i=0;i<9;i++){ const a = i/9*PI*2 + 0.3; P(hd, bsTaper([[Math.sin(a)*0.14, 0.29, Math.cos(a)*0.14], [Math.sin(a)*0.155, 0.22, Math.cos(a)*0.155], [Math.sin(a)*0.16, 0.12 + (i % 3)*0.05, Math.cos(a)*0.16]], 0.012, 0.004, 5, 6), BS.wax); }
  hd.rotation.x = 0.12;
  // arms: pauldrons in three lames, mail at the elbow, gauntlets; each forearm a group of its own
  const arm = s=>{
    const a = group(b, s*0.4, 1.76, 0);
    for(let i=0;i<2;i++) P(a, rusty(sculptW(new THREE.SphereGeometry(0.24 - i*0.03, 20, 8, 0, PI*2, 0, PI*0.4), 0.006, 12, s + i), 7, s*3 + i), 0xffffff, s*(0.02 + i*0.03), 0.05 - i*0.1, 0, 0, 0, -s*(0.45 + i*0.25), 1.1, 0.62, 1.05);
    P(a, rusty(new THREE.BoxGeometry(0.035, 0.12, 0.26), 10, s), 0xffffff, -s*0.06, 0.17, 0, 0, 0, -s*0.2);
    P(a, meat([[0, 0, 0], [s*0.02, -0.22, 0], [0, -0.42, 0.01]], t=> 0.085 - 0.015*t, 8, 9, s + 1), WD.iron2);
    P(a, rusty(new THREE.CylinderGeometry(0.085, 0.08, 0.26, 12), 9, s + 4), 0xffffff, 0, -0.2, 0);
    P(a, S(0.08, 10, 8), 0x2a2a2e, 0, -0.43, 0);
    const f = group(a, 0, -0.43, 0);
    P(f, meat([[0, 0, 0], [0, -0.01, 0.18], [0, -0.02, 0.36]], t=> 0.075 - 0.015*t, 8, 9, s + 2), WD.iron2);
    P(f, rusty(new THREE.CylinderGeometry(0.075, 0.09, 0.24, 12), 9, s + 6), 0xffffff, 0, -0.01, 0.22, PI/2);
    P(f, rusty(new THREE.BoxGeometry(0.11, 0.1, 0.13), 10, s + 8), 0xffffff, 0, -0.02, 0.42);
    return { a, f };
  };
  const L = arm(-1), Rr = arm(1);
  p.armL = L.a; p.foreL = L.f; p.armR = Rr.a; p.foreR = Rr.f;
  L.f.rotation.x = 0.1; Rr.f.rotation.x = 0.35; Rr.a.rotation.x = 0.1;
  // the tower shield: the height of a man, bowed, iron-rimmed, the keepers' flame on its face
  const sh = p.shield = group(L.f, 0.12, -0.12, 0.5);
  { const g = new THREE.BoxGeometry(0.82, 1.42, 0.06, 12, 14, 1), a = g.attributes.position;
    for(let i=0;i<a.count;i++){ const x = a.getX(i), y = a.getY(i); a.setZ(i, a.getZ(i) - x*x*0.45 + (y < -0.55 ? (y + 0.55)*0.06 : 0)); if(y < -0.6) a.setX(i, x*(1 - (-0.6 - y)*0.9)); }
    g.computeVertexNormals();
    bsPaint(g, WD.wood, 0x1a120c, 9, 4, (c, x, y, z)=>{ if(Math.abs(Math.sin(x*26)) < 0.08) c.multiplyScalar(0.5); if(z > 0 && Math.hypot(x/0.24, (y - 0.08)/0.34) < 1) c.lerp(bsC.setHex(0x1a1614), 0.9); });
    P(sh, g, 0xffffff); }
  // the rim and the bands
  { const pts = [[-0.41, 0.71], [0.41, 0.71], [0.41, -0.55], [0.0, -0.78], [-0.41, -0.55]];
    for(let i=0;i<pts.length;i++){ const A = pts[i], B = pts[(i + 1) % pts.length], mx = (A[0] + B[0])/2;
      P(sh, rusty(K.tube([[A[0], A[1], 0.04 - A[0]*A[0]*0.45], [mx, (A[1] + B[1])/2, 0.04 - mx*mx*0.45], [B[0], B[1], 0.04 - B[0]*B[0]*0.45]], 0.026, 6, 6), 14, i), 0xffffff); }
    [0.48, -0.36].forEach(y=>{ for(let k=0;k<5;k++){ const x = -0.36 + k*0.18; P(sh, zs(0.022), 0x4a443a, x, y, 0.05 - x*x*0.45); } });
    // the flame: a dull iron boss with the flame burning in it
    P(sh, rusty(bsLathe([[0.27, -0.01], [0.24, 0.02], [0.2, 0.03]], 26), 10, 3), 0xffffff, 0, 0.08, 0.035, PI/2, 0, 0, 1, 1, 1.35);
    const fl = glowMesh(R, sh, flameShape(0.24), WD.flame, 0.9, 0, 0.1, 0.07); fl.scale.set(0.9, 1, 1);
    glowMesh(R, sh, flameShape(0.13), 0xffe0a0, 0.85, 0, 0.04, 0.075);
    p.sigil = halo(R, sh, WD.flame, 0.9, 0, 0.1, 0.12, 0.45); }
  // the arbalest: a heavy stock, a steel prod, a box of bolts on top, a crank at the side
  const xb = p.bow = group(Rr.f, 0, 0.03, 0.42);
  P(xb, bsJitter(new THREE.BoxGeometry(0.07, 0.1, 0.86, 1, 1, 6), 0.006, 12, 3), WD.wood, 0, 0.0, 0.12);
  P(xb, rusty(new THREE.BoxGeometry(0.12, 0.17, 0.32), 10, 7), 0xffffff, 0, 0.13, 0.2);
  for(let i=0;i<4;i++){ P(xb, CY(0.007, 0.007, 0.12, 5), 0x3a2a1a, -0.03 + i*0.02, 0.27, 0.12 + (i % 2)*0.06); P(xb, BX(0.002, 0.03, 0.03), 0x14141a, -0.03 + i*0.02, 0.32, 0.12 + (i % 2)*0.06); }
  [-1, 1].forEach(s=> P(xb, bsTaper([[0, 0.02, 0.54], [s*0.24, 0.02, 0.52], [s*0.44, 0.02, 0.4], [s*0.52, 0.02, 0.32]], 0.03, 0.014, 10, 8), WD.iron));
  P(xb, K.tube([[-0.52, 0.02, 0.32], [0, 0.02, 0.2], [0.52, 0.02, 0.32]], 0.005, 6, 4), 0x8a8478);
  P(xb, CY(0.035, 0.035, 0.05, 10), WD.iron, 0.07, 0.0, -0.1, 0, 0, PI/2);
  P(xb, BX(0.02, 0.14, 0.02), WD.iron, 0.1, -0.06, -0.1);
  P(xb, rusty(new THREE.ConeGeometry(0.05, 0.1, 6), 10, 2), 0xffffff, 0, 0.0, 0.6, PI/2);
  R.muzzle.position.set(0, 0.02, 0.62); xb.add(R.muzzle);
  // the reliquary's lantern caged on his back, on a chain, a little of the old fire in it
  const ln = p.lantern = group(b, 0.14, 1.72, -0.34);
  bsChain(ln, [0, 0.0, 0], [0, -0.18, 0], 4, 0x3a3236, 0.025);
  const lg = p.lamp = group(ln, 0, -0.2, -0.02);
  P(lg, rusty(new THREE.ConeGeometry(0.11, 0.1, 8), 8, 3), 0xffffff, 0, -0.04, 0);
  P(lg, rusty(new THREE.CylinderGeometry(0.1, 0.11, 0.04, 8), 8, 4), 0xffffff, 0, -0.34, 0);
  for(let i=0;i<6;i++){ const a = i/6*PI*2; P(lg, CY(0.008, 0.008, 0.28, 4), WD.iron, Math.cos(a)*0.09, -0.2, Math.sin(a)*0.09); }
  P(lg, bsSkull(), 0xffffff, 0, -0.27, 0, 0, 0.4, 0, 0.45);
  const lf = glow(R, lg, 0.03, 0xffc070, 0, -0.18, 0); lf.scale.set(1, 1.8, 1); p.lampFlame = lf;
  halo(R, lg, 0xff9a3a, 0.7, 0, -0.18, 0, 0.5);
  R.h = 2.45; R.size = 1;
  return finish(R, { w:0.022 });
};
Models.FAMILY.lair_warden = "skel";
/* he stalks like a man in a hundred-weight of iron: a heavy, even tread, the
   shield always up. The bash: the shield drawn in tight, the shoulder set
   behind it, a beat, and then the whole of him behind it. The volley: the
   arbalest comes up and levels, the feet brace, and each bolt kicks it */
Models.MOVES.lair_warden = c=>{
  const { P, m, t, s, ph, fall, wind, fl, fit, breath, shake, pose, kind } = c;
  const r = release(c, 0.75), sk = m.sKind, bash = (c.tell >= 0 ? kind : null) === "stab", aim = (c.tell >= 0 ? kind : null) === "aim";
  const rb = sk === "stab" ? r : 0, ra = sk === "aim" ? r : 0, rc = sk === "charge" ? r : 0;
  const wb = bash ? wind : 0, wa = aim ? wind : 0;
  c.glance([1.5, 4], 0.5, 120);
  const tr = shake*2.2;
  // the tread: each foot planted, the hips rolling over it
  p2(P.legs, (l, i)=> pose(l, 0, 0, 0, Math.sin(ph + i*PI)*0.42*s - (i ? 0.35*wb : -0.15*wb) + (i ? -0.25*wa : 0.2*wa) + (i ? -0.4*rb : 0.25*rb), 0, 0));
  const y = -0.05*fall*s + 0.008*breath - 0.09*wb - 0.06*wa - 0.04*rb;
  // the head: a slow watch, a jerk now and then (the dead don't forget their post)
  const jerk = fit > 0.7 ? Math.sin(t*40)*0.08*(fit - 0.7)/0.3 : 0;
  pose(P.head, 0, 0, 0, m.gx.x*0.6 - 0.2*fl + 0.15*wb - 0.12*wa, m.gy.x*0.8 + 0.25*wb - 0.15*wa + jerk, jerk*0.5);
  // the shield arm: drawn in tight to the chest for the bash, then driven out with everything behind it
  pose(P.armL, 0.06*wb, -0.03*wb, -0.2*wb + 0.38*rb, -0.18*wb + 0.42*rb + Math.sin(ph)*0.08*s, -0.12*wb, 0.1*wb);
  pose(P.foreL, 0, 0, 0, 0.1*wb - 0.3*rb);
  // the arbalest: up to the shoulder and level, a kick at each bolt
  const ar = Math.min(1, ra), kick = ra > 0 ? Math.max(0, Math.sin(m.sk*PI/0.17))*Math.max(0, 1 - m.sk/0.6) : 0, up = Math.max(wa, ar);
  pose(P.armR, 0, 0, 0, -Math.sin(ph + PI)*0.25*s*(1 - up) - 0.95*up - 0.25*kick + tr*0.4, -0.3*up, 0.06*up);
  pose(P.foreR, 0, 0, 0, 0.5*up + 0.15*s*(1 - up) - 0.25*kick);
  // the lantern swings on its chain behind him
  const sw = m.lsw || (m.lsw = { x:0, v:0 });
  H.spring(sw, -0.5*rb - 0.35*s + Math.sin(ph)*0.15*s + 0.4*wb, 30, 3, c.dt);
  pose(P.lamp, 0, 0, 0, sw.x, 0, Math.sin(t*1.3)*0.06 + Math.cos(ph)*0.1*s);
  if(P.lampFlame) P.lampFlame.scale.set(1, 1.6 + Math.sin(t*13)*0.25 + Math.sin(t*7.3)*0.2, 1);
  return {
    y, z:-0.08*wb + 0.55*rb - 0.12*ra*kick + 0.15*rc,
    rx: 0.06*s - 0.12*fl + 0.12*wb - 0.25*rb*(1 - Math.min(1, m.sk/0.2)) + 0.3*rb - 0.06*wa - 0.05*kick + tr*0.3 + 0.2*rc,
    ry: 0.32*wb - 0.25*rb + 0.15*wa, rz: Math.sin(ph)*0.035*s + tr*0.2,
    sy: 1 + 0.006*breath
  };
};

/* ================================================================== *
 *  The Choir of Husks: three tall dead choristers in cassocks and torn
 *  surplices, a nimbus of cordyceps behind each head. They have no faces:
 *  the head is split from crown to chin into a wet open throat, and when
 *  they sing it opens. About 2.3 tall.
 * ================================================================== */
const CH = { robe:0x2c1c1e, robe2:0x140c0c, surp:0x6a6252, surp2:0x3a3428, skin:0x8a8476, skin2:0x4e4a42, throat:0x4a0c12, wet:0x8a2228, cord:0x5a2e1a };
Models.lair_choir = function(){
  const R = rig("lair_choir"), b = R.body, p = R.parts;
  // the cassock, dragging, and the surplice over it, rotted to rags
  const cas = folds(K.tatter(bsLathe([[0.1, 1.82], [0.2, 1.75], [0.23, 1.5], [0.25, 1.0], [0.33, 0.4], [0.42, 0.02], [0.44, -0.04]], 36), 0.3, 22, 0.2, 3.3), 9, 0.07, 1.6);
  bsPaint(cas, CH.robe, CH.robe2, 5, 2, (c, x, y)=>{ if(y < 0.4) c.multiplyScalar(0.6 + y); });
  P(b, cas, 0xffffff);
  // everything above the waist bends from there (u: in the body's own coordinates)
  const up = p.tor = group(b, 0, 1.12, 0), u = group(up, 0, -1.12, 0);
  const sp = K.tatter(bsLathe([[0.16, 1.8], [0.25, 1.69], [0.28, 1.45], [0.31, 1.15], [0.33, 1.0]], 36), 1.25, 18, 0.3, 6.2);
  bsPaint(sp, CH.surp, CH.surp2, 6, 4, (c, x, y, z)=>{ if(bsN(x, y, z, 9, 3) > 0.45) c.lerp(bsC.setHex(0x3a2a1a), 0.6); if(y < 1.25) c.multiplyScalar(0.75); });
  P(u, sp, 0xffffff);
  P(u, K.tatter(bsLathe([[0.155, 1.8], [0.245, 1.69], [0.275, 1.45], [0.305, 1.15], [0.325, 1.0]], 36, 0, true), 1.25, 18, 0.3, 6.2), 0x2a2620);
  // a collar of black cloth, a cord at the waist with its knots hanging
  P(u, K.tatter(bsLathe([[0.1, 1.86], [0.2, 1.8], [0.27, 1.7]], 30), 1.72, 14, 0.06, 8), 0x1a1214);
  P(b, H.TO(0.255, 0.018), 0x5a4a38, 0, 1.18, 0, PI/2, 0, 0, 1, 0.9, 1);
  P(b, bsTaper([[0.12, 1.18, 0.21], [0.13, 0.95, 0.24], [0.11, 0.7, 0.25]], 0.014, 0.01, 8, 6), 0x5a4a38);
  [0.95, 0.78].forEach(y=> P(b, S(0.025, 8, 6), 0x5a4a38, 0.125, y, 0.245));
  // the neck: long, thin, bent forward under the weight of the head
  P(u, meat([[0, 1.74, -0.01], [0, 1.86, 0.02], [0, 1.96, 0.07]], t=> 0.05 - 0.008*t, 8, 9, 4), CH.skin2);
  // the head: split from crown to chin. Each half hinges at the back; the throat is inside
  const hd = p.head = group(u, 0, 1.98, 0.08);
  const th = bsBlob(0.075, 0.8, 1.6, 0.9, 0.006, 22, 5, 20, 16);
  bsPaint(th, CH.throat, 0x14040a, 30, 2, (c, x, y)=>{ if(Math.abs(Math.sin(y*90)) < 0.25) c.lerp(bsC.setHex(CH.wet), 0.7); });
  P(hd, th, 0xffffff, 0, 0.03, -0.01);
  p.throatGlow = glow(R, hd, 0.02, 0xff6a3a, 0, 0.0, 0.02); p.throatGlow.scale.set(0.6, 3.2, 0.6);
  const half = s=>{
    const g = group(hd, 0, 0, -0.1);
    const geo = new THREE.SphereGeometry(0.115, 20, 18, s > 0 ? PI/2 : -PI/2, PI, 0, PI);
    geo.scale(0.9, 1.65, 1.05); sculptW(geo, 0.005, 22, s + 5);
    bsPaint(geo, CH.skin, CH.skin2, 9, s + 2, (c, x, y, z)=>{ if(Math.abs(x) < 0.02) c.lerp(bsC.setHex(CH.wet), 0.85); if(y < -0.08) c.multiplyScalar(0.8); });
    P(g, geo, 0xffffff, 0, 0.02, 0.1);
    // the inside of the half: raw, ridged
    const ins = new THREE.CircleGeometry(0.1, 22); ins.scale(0.95, 1.6, 1);
    bsPaint(ins, CH.wet, CH.throat, 40, s, (c, x, y)=>{ if(Math.abs(Math.sin(y*80)) < 0.3) c.multiplyScalar(0.6); });
    ins.rotateY(-s*PI/2);
    P(g, ins, 0xffffff, s*0.006, 0.02, 0.1);
    // teeth along the split, both sides of the lip
    for(let i=0;i<7;i++){ const y = 0.13 - i*0.04, z = 0.1 + Math.sqrt(Math.max(0, 1 - Math.pow(y/0.17, 2)))*0.1;
      P(g, CO(0.007, 0.03, 4), 0xc8bc98, s*0.006, y + 0.02, z - 0.012, 0, 0, -s*PI/2); }
    return g;
  };
  p.jawL = half(-1); p.jawR = half(1);
  p.jawL.rotation.y = -0.1; p.jawR.rotation.y = 0.1;
  // the nimbus: cordyceps grown out of the back of the skull in a ring, like a saint's
  const nim = p.nimbus = group(hd, 0, 0.06, -0.13);
  // a broken ring of rot, and stalks bursting out of it, each bent its own way
  P(nim, bsPaint(sculptW(new THREE.TorusGeometry(0.24, 0.026, 8, 40, 5.3), 0.012, 14, 3), CH.cord, 0x2a140c, 12, 2), 0xffffff, 0, 0, 0, 0, 0, 2.4);
  for(let i=0;i<4;i++){ const a = 0.8 + i*1.5; P(nim, bsTaper([[Math.cos(a)*0.05, Math.sin(a)*0.06, 0.03], [Math.cos(a + 0.3)*0.15, Math.sin(a + 0.3)*0.15, 0.0], [Math.cos(a + 0.2)*0.235, Math.sin(a + 0.2)*0.235, -0.01]], 0.022, 0.014, 8, 6), CH.cord); }
  for(let i=0;i<11;i++){
    const a = i/11*PI*2 + 0.2 + Math.sin(i*5.3)*0.18, r1 = 0.36 + Math.abs(Math.sin(i*3.7))*0.16, bend = Math.sin(i*2.1)*0.5, z = -0.03 - (i % 3)*0.025;
    const p0 = [Math.cos(a)*0.24, Math.sin(a)*0.24, 0], p1 = [Math.cos(a + bend*0.2)*0.3, Math.sin(a + bend*0.2)*0.31, z*0.5], p2 = [Math.cos(a + bend*0.35)*(r1 - 0.04), Math.sin(a + bend*0.35)*(r1 - 0.04), z];
    const tip = [Math.cos(a + bend*0.6)*r1, Math.sin(a + bend*0.6)*r1, z - 0.03];
    P(nim, bsTaper([p0, p1, p2, tip], 0.014, 0.005, 9, 6), 0x8a3e16);
    P(nim, S(0.016, 8, 6), 0x5a2410, tip[0], tip[1], tip[2], 0, 0, a, 1.7, 1, 1);
    glow(R, nim, 0.011, ROT.cord, tip[0], tip[1], tip[2] + 0.012);
  }
  halo(R, nim, 0xff7a2a, 0.9, 0, 0.05, -0.05, 0.2);
  // arms: too long, thin, in wide torn sleeves; the hands hang past the knees
  const arm = s=>{
    const a = group(u, s*0.24, 1.7, 0);
    P(a, K.tatter(bsLathe([[0.065, 0.04], [0.085, -0.15], [0.11, -0.4], [0.13, -0.5]], 18), -0.36, 10, 0.16, s + 3), CH.robe, 0, 0, 0, 0, 0, s*0.05);
    P(a, meat([[0, 0, 0], [s*0.01, -0.25, 0], [0, -0.5, 0.01]], t=> 0.045 - 0.01*t, 8, 8, s + 6), CH.skin2);
    const f = group(a, 0, -0.5, 0.01);
    P(f, meat([[0, 0, 0], [0, -0.25, 0.02], [0, -0.48, 0.03]], t=> 0.035 - 0.012*t, 8, 8, s + 7), CH.skin2);
    for(let k=0;k<4;k++){ const x = (k - 1.5)*0.018;
      P(f, bsTaper([[x, -0.48, 0.03], [x*1.4, -0.58, 0.05], [x*1.6, -0.68, 0.04 - Math.abs(k - 1.5)*0.01], [x*1.5, -0.74, 0.0]], 0.009, 0.004, 8, 6), CH.skin); }
    P(f, bsTaper([[s*-0.02, -0.47, 0.04], [s*-0.04, -0.55, 0.07], [s*-0.04, -0.6, 0.06]], 0.009, 0.005, 6, 6), CH.skin);
    return { a, f };
  };
  const L = arm(-1), Rr = arm(1);
  p.armL = L.a; p.foreL = L.f; p.armR = Rr.a; p.foreR = Rr.f;
  L.a.rotation.z = -0.12; Rr.a.rotation.z = 0.12; L.f.rotation.x = -0.15; Rr.f.rotation.x = -0.15;
  // a censer on a chain at the hip, still smoking; a rotten hymnal chained on the other side
  const cz = p.censer = group(b, 0.27, 1.16, 0.08);
  bsChain(cz, [0, 0, 0], [0, -0.32, 0], 5, 0x4a3a28, 0.016);
  const cb = group(cz, 0, -0.34, 0);
  P(cb, bsLathe([[0.0, -0.12], [0.06, -0.1], [0.08, -0.04], [0.075, 0.0], [0.04, 0.05], [0.015, 0.08]], 14), BS.brass);
  P(cb, H.TO(0.075, 0.008), 0x4a3a20, 0, -0.02, 0, PI/2);
  glow(R, cb, 0.022, 0xff8a3a, 0, -0.03, 0.06); halo(R, cb, 0xff7a2a, 0.45, 0, -0.03, 0.06, 0.45);
  halo(R, cb, 0x8a8478, 0.7, 0, 0.12, 0, 0.18);
  const bk = p.book = group(b, -0.27, 1.16, 0.06);
  bsChain(bk, [0, 0, 0], [0, -0.2, 0], 4, 0x3a3430, 0.014);
  const bg = group(bk, 0, -0.3, 0); bg.rotation.set(0.2, 0.4, 0.15);
  P(bg, bsJitter(new THREE.BoxGeometry(0.17, 0.22, 0.06, 2, 2, 1), 0.008, 20, 4), 0x2a1a14);
  P(bg, bsJitter(new THREE.BoxGeometry(0.16, 0.2, 0.05, 2, 2, 1), 0.006, 30, 5), 0x8a7a5a, 0.008, 0, 0);
  P(bg, BX(0.02, 0.02, 0.07), BS.brass, 0.08, 0.1, 0);
  R.h = 2.3;
  return finish(R, { w:0.02 });
};
Models.FAMILY.lair_choir = "husk";
/* they glide, heads lolling, the throat opening and closing on a hymn no one
   hears. The scream: the head tips back, the throat splits wide, the arms
   fling out, a held quiver, then everything thrown forward at you */
Models.MOVES.lair_choir = c=>{
  const { P, m, t, s, ph, fall, wind, fl, fit, breath, shake, pose, kind } = c;
  const tk = c.tell >= 0 ? kind : null, r = release(c, 0.65), sk = m.sKind;
  const wsc = tk === "scream" ? wind : 0, wch = tk === "charge" || tk === "stab" ? wind : 0;
  const rsc = sk === "scream" ? r : 0, rch = sk === "charge" || sk === "stab" ? r : 0;
  const tr = shake*2.5;
  // a hymn: the throat opens and closes, slow, out of time with the others (seeded)
  const hymn = 0.5 + 0.5*Math.sin(t*0.9 + m.seed*3);
  const twitch = fit > 0.6 ? Math.sin(t*55)*0.25*(fit - 0.6)/0.4 : 0;
  const open = 0.2 + 0.12*hymn + 0.75*wsc + 0.95*Math.min(1, rsc) + 0.3*wch + twitch + 0.15*fl;
  pose(P.jawL, 0, 0, 0, 0, -open + 0.1, 0); pose(P.jawR, 0, 0, 0, 0, open - 0.1, 0);
  if(P.throatGlow) P.throatGlow.scale.set(0.4 + open*0.9, 3.2, 0.4 + open*0.6);
  const loll = Math.sin(t*0.45 + m.seed)*0.22;
  pose(P.head, 0, 0.04*wsc, 0, 0.15*s - 0.8*wsc + 0.55*Math.min(1, rsc) - 0.35*wch + 0.3*fl + tr*0.6, Math.sin(t*0.3 + m.seed*2)*0.15*(1 - wsc), loll*(1 - wsc) + twitch*0.4);
  pose(P.nimbus, 0, 0, 0, 0, 0, t*0.15 + wsc*2*Math.sin(t*30)*0.05);
  // the arms dangle and swing late behind the body (springs), flung out to scream
  const sl = m.sl || (m.sl = { x:0, v:0 }), sr = m.sr || (m.sr = { x:0, v:0 });
  H.spring(sl, Math.sin(ph)*0.3*s + 0.25*s, 40, 4, c.dt); H.spring(sr, -Math.sin(ph)*0.3*s + 0.25*s, 40, 4, c.dt);
  const fling = wsc*(1 - Math.min(1, rsc)) , thrust = Math.min(1, rsc) + rch;
  pose(P.armL, 0, 0, 0, sl.x + 0.9*wch - 1.1*thrust*(rsc ? 0.6 : 1) + 0.2*fling + tr, 0, -1.25*fling - 0.15*wch - 0.4*Math.min(1, rsc));
  pose(P.armR, 0, 0, 0, sr.x + 0.9*wch - 1.1*thrust*(rsc ? 0.6 : 1) + 0.2*fling - tr, 0, 1.25*fling + 0.15*wch + 0.4*Math.min(1, rsc));
  pose(P.foreL, 0, 0, 0, -0.3*fling - 0.3*thrust + 0.1*Math.sin(t*1.3 + 1)); pose(P.foreR, 0, 0, 0, -0.3*fling - 0.3*thrust + 0.1*Math.sin(t*1.2));
  // the censer and the book swing on their chains
  const cs = m.cs || (m.cs = { x:0, v:0 });
  H.spring(cs, -0.4*s - 0.6*rch + Math.sin(ph)*0.2*s, 25, 2.5, c.dt);
  pose(P.censer, 0, 0, 0, cs.x, 0, Math.sin(t*1.1)*0.08); pose(P.book, 0, 0, 0, cs.x*0.8, 0, -Math.sin(t*0.9)*0.06);
  const lean = 0.12*s + 0.05*Math.sin(t*0.6 + m.seed) - 0.25*wsc + 0.25*Math.min(1, rsc) + 0.5*wch + 0.35*rch - 0.2*fl + tr*0.3;
  pose(P.tor, 0, 0, 0, lean*0.8 + 0.08, 0, Math.sin(t*0.4 + m.seed)*0.05 + twitch*0.1);
  return {
    y: Math.abs(Math.sin(ph))*0.035*s + 0.01*breath + 0.07*wsc - 0.05*wch,
    z: 0.5*rch + 0.12*Math.min(1, rsc) - 0.06*wsc,
    rx: lean*0.25,
    rz: Math.sin(ph*0.5)*0.06*s,
    sy: 1 + 0.01*breath
  };
};
/* ================================================================== *
 *  The Bell-Ringer: a hunchback grown huge on one side from a lifetime
 *  of hauling the bell rope. Sackcloth hood, a rope harness, a back like
 *  a sack of stones, one great arm and one withered, and the great bell
 *  itself, cracked, gone green, carried by its yoke in his fist. A dull
 *  light lives in the crack. About 3.4 tall to the top of the hump.
 * ================================================================== */
const BR = { skin:0x6a5a4a, skin2:0x3a2a22, sack:0x5a4a36, sack2:0x2a2018, rope:0x6a5a3a, bronze:0x6a4a26, verd:0x3e6a5a, yoke:0x3a2818, crack:0xff7a30 };
function bellGeo(){
  const prof = [[0.0, 1.0], [0.16, 0.99], [0.27, 0.94], [0.32, 0.8], [0.34, 0.6], [0.38, 0.38], [0.46, 0.18], [0.55, 0.05], [0.58, 0.0]];
  const g = bsLathe(prof, 36);
  // the crack: a jagged line down one side, and green weeping from it
  bsPaint(g, BR.bronze, 0x4a3018, 7, 3, (c, x, y, z)=>{
    const a = Math.atan2(x, z), cx = 0.35 + Math.sin(y*19)*0.05 + Math.sin(y*47)*0.02;
    if(bsN(x, y, z, 6, 2) > 0.25 || y < 0.12 && bsN(x, y, z, 9, 5) > 0) c.lerp(bsC.setHex(BR.verd), 0.7);
    if(y > 0.04 && y < 0.92 && Math.abs(a - cx) < 0.022) c.setHex(0x0a0604);
    else if(y > 0.04 && y < 0.92 && Math.abs(a - cx) < 0.09 && y < 0.7) c.lerp(bsC.setHex(BR.verd), 0.85);
    if(Math.abs(y - 0.2) < 0.015 || Math.abs(y - 0.75) < 0.012) c.multiplyScalar(0.6);
  });
  return g;
}
Models.lair_bellringer = function(){
  const R = rig("lair_bellringer"), b = R.body, p = R.parts;
  const skin = (g, seed)=> bsPaint(g, BR.skin, BR.skin2, 4, seed, (c, x, y, z)=>{ if(bsN(x, y, z, 12, seed + 3) > 0.55) c.lerp(bsC.setHex(0x5a2a22), 0.5); });
  // legs: short, bowed, bare, the feet splayed and knotted
  p.legs = [-1, 1].map(s=>{
    const l = group(b, s*0.3, 1.02, 0);
    P(l, skin(meat([[0, 0.05, 0], [s*0.12, -0.25, 0.1], [s*0.1, -0.5, 0.12]], t=> 0.2 - 0.05*t, 10, 10, s + 2), s + 1), 0xffffff);
    P(l, skin(meat([[s*0.1, -0.5, 0.12], [s*0.06, -0.75, 0.04], [s*0.04, -0.94, 0.0]], t=> 0.15 - 0.04*t, 10, 10, s + 5), s + 4), 0xffffff);
    P(l, bsPaint(lumpS(0.13, 14, 10, 0.02, 9, s + 7), BR.skin, BR.skin2, 6, s), 0xffffff, s*0.05, -0.98, 0.1, 0, s*0.2, 0, 1, 0.5, 1.6);
    for(let k=0;k<4;k++) P(l, bsTaper([[s*0.05 + (k - 1.5)*0.05, -1.0, 0.25], [s*0.05 + (k - 1.5)*0.06, -1.01, 0.33]], 0.03, 0.018, 4, 6), BR.skin2);
    // rags wound round the shins
    for(let k=0;k<3;k++) P(l, H.TO(0.13 - k*0.01, 0.022), BR.sack2, s*0.07, -0.62 - k*0.09, 0.07, PI/2 + 0.2*(k - 1), 0, 0.1*s);
    return l;
  });
  // the smock: sackcloth to the knees
  const sm = folds(K.tatter(bsLathe([[0.3, 1.55], [0.48, 1.4], [0.56, 1.1], [0.58, 0.75], [0.62, 0.55]], 36), 0.85, 20, 0.22, 4.4), 7, 0.06, 1.4);
  bsPaint(sm, BR.sack, BR.sack2, 6, 2, (c, x, y, z)=>{ if(y < 0.8) c.multiplyScalar(0.75); if(bsN(x, y, z, 11, 4) > 0.5) c.lerp(bsC.setHex(0x1a140e), 0.6); });
  P(b, sm, 0xffffff);
  P(b, K.tatter(bsLathe([[0.295, 1.55], [0.475, 1.4], [0.555, 1.1], [0.575, 0.75], [0.615, 0.55]], 36, 0, true), 0.85, 20, 0.22, 4.4), 0x1a140e);
  // above the waist everything bends together: the chest, the hump, the head, the arms
  const up = p.tor = group(b, 0, 1.2, 0), u = group(up, 0, -1.2, 0);
  const ch = skin(lobes(bsBlob(0.5, 1.15, 0.95, 0.9, 0.02, 4, 2.2), 4, 0.06, 1, 2), 4);
  P(u, ch, 0xffffff, 0, 1.75, 0.05, 0.35);
  // the hump: a sack of stones, under the sackcloth
  const hm = bsBlob(0.55, 1.15, 0.8, 1.05, 0.025, 3.5, 7.3);
  bsPaint(hm, BR.sack, BR.sack2, 5, 8, (c, x, y, z)=>{ if(bsN(x, y, z, 9, 2) > 0.5) c.lerp(bsC.setHex(0x1a140e), 0.6); if(y < -0.2) c.multiplyScalar(0.7); });
  P(u, hm, 0xffffff, 0.08, 2.3, -0.25, -0.45, 0, -0.18);
  // a stoop of spine knuckles showing through the sack where it's worn thin
  for(let i=0;i<5;i++) P(u, lumpS(0.06, 8, 6, 0.01, 30, i), BR.skin2, 0.08 + i*0.01, 2.62 - i*0.13, -0.42 - Math.sin(i/4*PI)*0.18, 0, 0, 0, 1.4, 0.7, 1);
  // the rope harness: over the hump, across the chest, a coil at the hip
  P(u, bsTaper([[-0.4, 1.55, 0.35], [-0.1, 1.9, 0.48], [0.35, 2.3, 0.3], [0.45, 2.6, -0.1], [0.1, 2.65, -0.55], [-0.35, 2.1, -0.65], [-0.5, 1.6, -0.35]], 0.035, 0.035, 20, 8), BR.rope);
  P(u, bsTaper([[0.45, 1.5, 0.3], [0.1, 1.85, 0.5], [-0.3, 2.2, 0.32], [-0.4, 2.5, -0.1], [-0.15, 2.6, -0.55]], 0.03, 0.03, 16, 8), BR.rope);
  P(b, sculptW(new THREE.TorusGeometry(0.2, 0.05, 8, 20), 0.01, 20, 3), BR.rope, -0.48, 1.25, 0.15, 0.3, 1.2, 0, 1, 1, 1.3);
  P(b, bsTaper([[-0.5, 1.1, 0.2], [-0.55, 0.7, 0.25], [-0.5, 0.35, 0.1], [-0.6, 0.06, -0.1], [-0.5, 0.02, -0.5]], 0.03, 0.025, 16, 8), BR.rope);
  // the head: low and forward, in a sackcloth hood; a jaw that juts, one eye that catches the light
  const hd = p.head = group(u, 0.05, 2.15, 0.62);
  const hood = K.tatter(bsLathe([[0.04, 0.42], [0.2, 0.32], [0.28, 0.1], [0.3, -0.12], [0.34, -0.3]], 26, 0.55), -0.2, 12, 0.12, 5);
  bsPaint(hood, BR.sack, BR.sack2, 8, 6);
  P(hd, hood, 0xffffff, 0, 0, -0.05, -0.25);
  P(hd, K.tatter(bsLathe([[0.038, 0.42], [0.19, 0.32], [0.27, 0.1], [0.29, -0.12], [0.33, -0.3]], 26, 0.55, true), -0.2, 12, 0.12, 5), 0x0c0806, 0, 0, -0.05, -0.25);
  P(hd, bsTaper([[0, 0.4, -0.1], [0.04, 0.44, -0.28], [0.1, 0.32, -0.44], [0.13, 0.12, -0.5]], 0.09, 0.025, 10, 8), BR.sack);
  P(hd, skin(lumpS(0.2, 16, 12, 0.02, 12, 3), 6), 0xffffff, 0, -0.02, 0.0, 0, 0, 0, 1, 1.05, 1);
  P(hd, skin(lumpS(0.16, 14, 10, 0.02, 14, 4), 7), 0xffffff, 0.03, -0.17, 0.1, 0.3, 0, 0.15, 1.15, 0.7, 1.1);
  for(let i=0;i<6;i++) P(hd, CO(0.018, 0.06 + (i % 2)*0.03, 5), 0xa89a78, -0.1 + i*0.042, -0.11, 0.22 - Math.abs(i - 2.5)*0.015, 0.1*(i - 2.5), 0, 0.3*Math.sin(i*2.3));
  P(hd, S(0.06, 10, 8), 0x3a2620, -0.08, 0.06, 0.14, 0, 0, 0, 1.2, 0.8, 0.8);
  P(hd, S(0.035, 8, 6), 0x050304, 0.08, 0.06, 0.155);
  glow(R, hd, 0.01, 0xffd08a, 0.08, 0.06, 0.18); halo(R, hd, 0xffb060, 0.18, 0.08, 0.06, 0.2, 0.45);
  // the great arm (the rope arm): grown thick as a man round the forearm
  const aR = p.armR = group(u, 0.64, 2.12, 0.18);
  P(aR, skin(meat([[0, 0.05, 0], [0.08, -0.3, 0.06], [0.1, -0.6, 0.14]], t=> 0.24 - 0.04*t + 0.04*Math.sin(t*PI), 12, 11, 3), 9), 0xffffff);
  P(aR, K.tatter(bsLathe([[0.12, 0.18], [0.26, 0.08], [0.29, -0.12], [0.27, -0.3]], 20), -0.15, 10, 0.12, 3), BR.sack, 0.02, 0, 0, 0, 0, -0.35);
  const fR = p.foreR = group(aR, 0.1, -0.6, 0.14);
  P(fR, skin(meat([[0, 0, 0], [0.02, -0.06, 0.25], [0, -0.1, 0.52]], t=> 0.26 - 0.05*t + 0.03*Math.sin(t*PI*2), 12, 11, 8), 10), 0xffffff);
  for(let k=0;k<3;k++) P(fR, H.TO(0.24 - k*0.015, 0.025), BR.sack2, 0, -0.03 - k*0.02, 0.15 + k*0.1, 0.25, 0, 0);
  P(fR, skin(lumpS(0.17, 14, 10, 0.02, 10, 6), 11), 0xffffff, 0, -0.12, 0.62, 0, 0, 0, 1.2, 1, 1.1);
  for(let k=0;k<4;k++) P(fR, skin(meat([[(k - 1.5)*0.07, -0.05, 0.7], [(k - 1.5)*0.075, -0.18, 0.78], [(k - 1.5)*0.07, -0.26, 0.7]], ()=> 0.045, 6, 8, k), 12 + k), 0xffffff);
  // the bell, by its yoke in his fist
  const bl = p.bell = group(fR, 0, -0.06, 0.66);
  P(bl, bsJitter(new THREE.BoxGeometry(0.9, 0.12, 0.14, 6, 1, 1), 0.015, 9, 3), BR.yoke, 0, 0.0, 0);
  [-1, 1].forEach(s=>{ P(bl, H.TO(0.06, 0.018), 0x2a2622, s*0.3, 0.0, 0, 0, PI/2, 0); P(bl, BX(0.04, 0.3, 0.04), 0x2a2622, s*0.14, -0.14, 0, 0, 0, s*0.4); });
  const bg = p.bellBody = group(bl, 0, -0.22, 0);
  P(bg, bellGeo(), 0xffffff, 0, -1.0, 0, 0, 0, 0, 1, 1, 1);
  P(bg, bsLathe([[0.0, 0.97], [0.15, 0.96], [0.25, 0.92], [0.3, 0.78], [0.32, 0.6], [0.36, 0.38], [0.44, 0.18], [0.53, 0.05], [0.56, 0.0]].map(q=> [q[0]*0.97, q[1]]), 36, 0, true), 0x140c08, 0, -1.0, 0);
  P(bg, H.TO(0.08, 0.025), 0x4a3a20, 0, 0.02, 0, 0, 0, 0);
  // the clapper, hanging inside
  const cl = p.clapper = group(bg, 0, -0.12, 0);
  P(cl, CY(0.025, 0.025, 0.6, 6), 0x2a2622, 0, -0.3, 0); P(cl, S(0.09, 10, 8), 0x2a2622, 0, -0.65, 0);
  // the light in the crack
  const ca = 0.35;
  for(let i=0;i<9;i++){ const y = 0.12 + i*0.09, a = ca + Math.sin(y*19)*0.05 + Math.sin(y*47)*0.02, r = [0.55, 0.47, 0.4, 0.37, 0.35, 0.34, 0.33, 0.32, 0.3][i];
    const gm = glow(R, bg, 0.016, BR.crack, Math.sin(a)*(r + 0.005), y - 1.0, Math.cos(a)*(r + 0.005)); gm.scale.set(0.8, 3.2, 0.8); gm.material.opacity = 0.75; }
  p.crackHalo = halo(R, bg, BR.crack, 0.9, Math.sin(ca)*0.45, -0.6, Math.cos(ca)*0.45, 0.3);
  // trailing ropes off the yoke
  P(bl, bsTaper([[-0.42, 0, 0], [-0.5, -0.4, -0.1], [-0.45, -0.9, -0.25], [-0.5, -1.35, -0.5]], 0.025, 0.02, 14, 6), BR.rope);
  // the withered arm: thin, long-fingered, holding the bell's rope
  const aL = p.armL = group(u, -0.5, 2.05, 0.2);
  P(aL, skin(meat([[0, 0, 0], [-0.05, -0.3, 0.05], [-0.04, -0.52, 0.1]], t=> 0.09 - 0.02*t, 10, 9, 5), 13), 0xffffff);
  const fL = p.foreL = group(aL, -0.04, -0.52, 0.1);
  P(fL, skin(meat([[0, 0, 0], [0.03, -0.1, 0.22], [0.06, -0.14, 0.42]], t=> 0.07 - 0.02*t, 10, 9, 6), 14), 0xffffff);
  for(let k=0;k<4;k++) P(fL, bsTaper([[0.06 + (k - 1.5)*0.02, -0.14, 0.44], [0.07 + (k - 1.5)*0.025, -0.2, 0.52], [0.06 + (k - 1.5)*0.025, -0.28, 0.5]], 0.016, 0.008, 6, 6), BR.skin2);
  aL.rotation.z = -0.15; fL.rotation.x = 0.2;
  R.h = 3.3;
  return finish(R, { w:0.03 });
};
Models.FAMILY.lair_bellringer = "brute";
/* he lurches, the bell swinging from his fist and the clapper knocking. The
   toll: the bell heaved up over his head in both hands, a shuddering hold at
   the top, then brought down on the floor with everything he has, and he
   stays bent over it a moment while it rings. The swing: the bell drawn back
   behind him on the great arm, then flung round in a wide arc */
Models.MOVES.lair_bellringer = c=>{
  const { P, m, t, s, ph, fall, wind, fl, fit, breath, shake, pose, kind } = c;
  const tk = c.tell >= 0 ? kind : null, r = release(c, 1.0), sk = m.sKind;
  const wt = tk === "toll" || tk === "peal" ? wind : 0, ws = tk === "swing" || tk === "stab" ? wind : 0, wc = tk === "charge" ? wind : 0;
  const rt = sk === "toll" || sk === "peal" ? r : 0, rs = sk === "swing" || sk === "stab" ? r : 0, rc = sk === "charge" ? r : 0;
  const tr = shake*3.2, rt1 = Math.min(1, rt);
  // the toll: up (rx back over the head) ... and down onto the floor in front
  const lift = wt*(1 - rt1);
  // a lurch: he rolls his whole bulk onto each short leg
  p2(P.legs, (l, i)=> pose(l, 0, 0, 0, Math.sin(ph + i*PI)*0.4*s - 0.25*wt + 0.3*rt1*(i ? -1 : 0.6), 0, (i ? 1 : -1)*(0.08 + 0.1*wt)));
  pose(P.tor, 0, 0, 0, 0.1*s - 0.4*lift + 0.42*rt1 + 0.25*wc - 0.15*fl + tr*0.3, 0.5*ws - 0.75*Math.min(1, rs), Math.sin(ph)*0.06*s + tr*0.15);
  pose(P.armR, 0, 0, 0, Math.sin(ph + PI)*0.15*s - 2.7*lift - 0.5*rt1 + tr*0.5 - 0.3*ws, 0.8*ws - 1.5*Math.min(1, rs), 0.15*lift + 0.45*ws);
  pose(P.foreR, 0, 0, 0, -0.5*lift + 0.1*rt1 + 0.2*ws);
  pose(P.armL, 0, 0, 0, Math.sin(ph)*0.3*s - 2.4*lift + 0.2*rt1 - 0.5*wc + 0.3*tr, 0, -0.35*lift);
  pose(P.foreL, 0, 0, 0, -0.6*lift - 0.3*rt1);
  // the bell swings on in its yoke, a beat behind (and the clapper a beat behind that)
  const bs = m.bsw || (m.bsw = { x:0, v:0 }), bz = m.bsz || (m.bsz = { x:0, v:0 }), cs = m.csw || (m.csw = { x:0, v:0 });
  if(m.struck && (sk === "toll" || sk === "peal")) bs.v += 2.5;
  H.spring(bs, -0.25*s - 0.3*lift + 0.4*ws - 0.2*rs, 40, 3, c.dt);
  H.spring(bz, Math.sin(ph)*0.12*s + 0.6*ws - 0.9*Math.min(1, rs), 16, 2, c.dt);
  H.spring(cs, -bs.x*1.4 + (rt1 > 0 ? Math.sin(m.sk*40)*0.3*Math.max(0, 1 - m.sk) : 0), 30, 1.5, c.dt);
  pose(P.bellBody, 0, 0, 0, bs.x, 0, bz.x);
  pose(P.clapper, 0, 0, 0, Math.max(-0.22, Math.min(0.22, cs.x)), 0, Math.max(-0.22, Math.min(0.22, -bz.x*0.8)));
  if(P.crackHalo) P.crackHalo.material.opacity = (P.crackHalo.userData.op0 || 0.3)*(0.6 + 0.4*Math.sin(t*2.1) + 1.2*rt1);
  // the head: it lolls, it looks up at the bell as it goes up
  const tw = fit > 0.6 ? Math.sin(t*35)*0.12*(fit - 0.6)/0.4 : 0;
  pose(P.head, 0, 0, 0, 0.1*Math.sin(t*0.7) - 0.5*lift + 0.2*rt1 - 0.25*fl, Math.sin(t*0.5 + m.seed)*0.2 + tw, 0.15*Math.sin(t*0.4));
  return {
    y: -0.08*fall*s + 0.015*breath - 0.12*rt1 + 0.05*lift,
    z: 0.15*rt1 + 0.3*rc,
    rx: 0.05*s + 0.1*rt1 + 0.08*wc,
    ry: 0.25*ws - 0.3*Math.min(1, rs),
    rz: Math.sin(ph)*0.08*s,
    sy: 1 + 0.012*breath, sx: 1 - 0.006*breath
  };
};

function p2(list, fn){ if(list) list.forEach(fn); }

})();
