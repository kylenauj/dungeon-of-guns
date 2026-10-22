/* ------------------------------------------------------------------ *
 *  Rigs of their own (see Models.MOVES in models.js for the moves).
 *
 *  The other lords of the upper floors: Sir Hollin in the Gibbet (the
 *  Keep's other master) and the Rat King (the Undercroft's).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, TO, P, rig, group, glow, halo, finish, zs, BS, bsRing, bsN, bsPaint, bsBlob, bsLathe, bsChain, bsTooth, bsJitter, bsTaper, bsPrefab, smooth } = H;
const col = new THREE.Color();
const V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), V3 = new THREE.Vector3(), V4 = new THREE.Vector3(), V5 = new THREE.Vector3();
const Q1 = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), M4 = new THREE.Matrix4();
const clamp = (x, a, b)=> Math.max(a, Math.min(b, x));
const lerp = (a, b, k)=> a + (b - a)*k;
/* out fast, past the mark, and settle back onto it */
const backOut = x=>{ const c = 1.9; x -= 1; return 1 + (c + 1)*x*x*x + c*x*x; };
/* a strike's arc, from the frame it's let go (u: 0 to 1 through c.strike): out at
   once with an overshoot, held a beat at the end of the swing, then back slowly */
const arc = u=> u < 0.22 ? backOut(u/0.22) : u < 0.42 ? 1 : 1 - smooth(0.42, 1, u);

/* two bones reaching for a point: the arm group sits at the shoulder, its upper
   bone hangs down -y for l1, the fore group (at -l1) hangs its bone down -y for l2.
   (tx, ty, tz) and the pole (where the elbow should point) are in the arm's parent */
function reach(arm, fore, tx, ty, tz, l1, l2, px, py, pz){
  const d = V1.set(tx - arm.position.x, ty - arm.position.y, tz - arm.position.z);
  const D = clamp(d.length(), Math.abs(l1 - l2) + 0.02, (l1 + l2)*0.995); d.normalize();
  const bend = PI - Math.acos(clamp((l1*l1 + l2*l2 - D*D)/(2*l1*l2), -1, 1));
  fore.rotation.set(-bend, 0, 0);
  const h = V2.set(0, -l1 - l2*Math.cos(bend), l2*Math.sin(bend)).normalize();
  Q1.setFromUnitVectors(h, d);
  // twist about the reach so the elbow points at the pole
  const e = V3.set(0, -1, 0).applyQuaternion(Q1), pole = V4.set(px, py, pz);
  e.addScaledVector(d, -e.dot(d)); pole.addScaledVector(d, -pole.dot(d));
  if(e.lengthSq() > 1e-6 && pole.lengthSq() > 1e-6){
    const ang = Math.atan2(V5.copy(e).cross(pole).dot(d), e.dot(pole));
    Q2.setFromAxisAngle(d, ang); Q1.premultiply(Q2);
  }
  arm.quaternion.copy(Q1);
}
/* point a group's +z along d, its +y as near u as it'll go */
function aim(o, d, u){
  const z = V1.set(d[0], d[1], d[2]).normalize(), y = V2.set(u[0], u[1], u[2]);
  y.addScaledVector(z, -y.dot(z)); if(y.lengthSq() < 1e-6) y.set(0, 1, 0).addScaledVector(z, -z.y); y.normalize();
  const x = V3.copy(y).cross(z);
  M4.makeBasis(x, y, z); o.quaternion.setFromRotationMatrix(M4);
}
/* blend pose keys: rest plus each key's difference, by its weight */
function blend(rest, list){
  const o = {};
  for(const k in rest) o[k] = Array.isArray(rest[k]) ? rest[k].slice() : rest[k];
  list.forEach(([key, w])=>{
    if(!key || !(w > 1e-4) && !(w < -1e-4)) return;
    for(const k in key){
      if(!(k in rest)) continue;
      if(Array.isArray(rest[k])) for(let i=0;i<rest[k].length;i++) o[k][i] += (key[k][i] - rest[k][i])*w;
      else o[k] += (key[k] - rest[k])*w;
    }
  });
  return o;
}
/* the strike bookkeeping every own-move rig here shares: the wind-up's pose is
   carried into the strike (the common wind drops to 0 the frame it's let go, which
   snapped every wind-up back to rest before it struck) */
function strikeState(c){
  const m = c.m;
  if(m.gs === undefined){ m.gs = 0; m.from = 0; m.lastWind = 0; m.windKind = ""; m.hitKind = ""; }
  if(c.strike > m.gs + 0.2){ m.from = m.lastWind; m.hitKind = m.windKind || c.kind; }
  m.gs = c.strike;
  if(c.tell >= 0){ m.lastWind = c.wind; m.windKind = c.kind; }
  const u = 1 - c.strike;
  return { u, hit:c.strike > 0 ? arc(u) : 0, carry:c.strike > 0 ? m.from*(1 - smooth(0, 0.2, u)) : 0, wk:c.tell >= 0 ? c.kind : null, hk:c.strike > 0 ? m.hitKind : null };
}

/* ================================================================== *
 *  Sir Hollin in the Gibbet. The old King had his own champion hanged
 *  for losing a war the King lost; the cage was never taken down, and
 *  one winter it climbed off its hook. Plate gone black with rust, a
 *  tabard of the Keep rotted to a rag, the noose still round his neck,
 *  the crows still riding him, and the sword they never took off him.
 * ================================================================== */
const GB = { plate:0x5a5a62, plate2:0x24242a, rust:0x5e3620, rust2:0x3a2014, cage:0x2e2a28, tab:0x6e2824, tab2:0x2a0e0c, device:0x8e846c,
  rope:0x5e5038, leather:0x34261c, mail:0x2a2a2e, crow:0x141218, crow2:0x2c2c34, steel:0x6e6c68, bone:0xb8ac90 };
const GS = 1.45;                      // the whole knight, built man-sized and grown
const plateC = (g, f, s, rust)=> bsPaint(g, GB.plate, GB.plate2, f || 6, s || 1, (c, x, y, z)=>{
  const n = bsN(x, y, z, 9, (s || 1) + 3); if(n > 0.5 - (rust || 0.2)) c.lerp(col.setHex(GB.rust), Math.min(0.9, (n - 0.3 + (rust || 0.2))*1.6));
  if(bsN(x, y, z, 22, (s || 1) + 7) > 0.75) c.multiplyScalar(0.55);
});
const ironC = (g, s)=> bsPaint(g, GB.cage, 0x141212, 8, s || 2, (c, x, y, z)=>{ if(bsN(x, y, z, 14, (s || 2) + 1) > 0.25) c.lerp(col.setHex(GB.rust), 0.6); });
/* the breastplate's radius at height y (tor space) */
const CHEST = [[-0.06, 0.25], [0.1, 0.27], [0.3, 0.31], [0.45, 0.33], [0.56, 0.3], [0.64, 0.2], [0.68, 0.1]];
const chestR = y=>{ if(y <= CHEST[0][0]) return CHEST[0][1]; for(let i=1;i<CHEST.length;i++) if(y <= CHEST[i][0]){ const a = CHEST[i - 1], b = CHEST[i], k = (y - a[0])/(b[0] - a[0]); return a[1] + (b[1] - a[1])*k; } return CHEST[CHEST.length - 1][1]; };
/* the gibbet's radius at height y (tor space): a man-shaped cage, a dome over the head */
const CAGE = [[-0.22, 0.36], [0.05, 0.37], [0.32, 0.43], [0.55, 0.47], [0.66, 0.37], [0.76, 0.24], [0.92, 0.22], [1.04, 0.18], [1.12, 0.08], [1.16, 0.0]];
const cageR = y=>{ if(y <= CAGE[0][0]) return CAGE[0][1]; for(let i=1;i<CAGE.length;i++) if(y <= CAGE[i][0]){ const a = CAGE[i - 1], b = CAGE[i], k = (y - a[0])/(b[0] - a[0]); return a[1] + (b[1] - a[1])*k; } return 0; };
const CZ = 0.86;                      // the cage is a little flatter front to back

/* a tabard panel, hung from the shoulders over the chest to the knees */
function tabard(front){
  const W = 0.4, top = 0.6, bot = -0.62, g = new THREE.PlaneGeometry(W, top - bot, 8, 22), a = g.attributes.position;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i) + (top + bot)/2;
    let z = y > -0.04 ? Math.sqrt(Math.max(0, Math.pow(chestR(y)*0.8 + 0.025, 2) - x*x*0.35)) : 0.24 + (-0.04 - y)*0.1;
    if(y > 0.5) z -= (y - 0.5)*0.9;
    let yy = y;
    if(y < bot + 0.2){ const h = Math.sin(Math.floor((x + W/2)/W*7)*12.9898 + (front ? 1.7 : 4.1))*43758.5453; yy -= ((h - Math.floor(h))*0.26 + 0.02)*(bot + 0.2 - y)/0.2; }
    // a hole torn through, low on one side
    z += Math.sin(x*31 + y*17)*0.006;
    a.setXYZ(i, x*(1 + Math.max(0, -y)*0.25), yy, z);
  }
  g.computeVertexNormals();
  bsPaint(g, GB.tab, GB.tab2, 7, front ? 3 : 5, (c, x, y, z)=>{
    const ay = y + 0.0;
    if(front){
      // the Keep's tower, bleached pale, the gate dark
      const tower = Math.abs(x) < 0.07 && ay > 0.06 && ay < 0.3, cren = ay >= 0.3 && ay < 0.35 && Math.abs(x) < 0.07 && Math.floor((x + 0.07)/0.028) % 2 === 0;
      if(tower || cren) c.lerp(col.setHex(GB.device), 0.8);
      if(Math.abs(x) < 0.022 && ay > 0.06 && ay < 0.15) c.setHex(0x120808);
    }
    if(y < -0.35) c.multiplyScalar(0.55 + (y + 0.62)*1.4);
    if(bsN(x, y, z, 11, front ? 2 : 6) > 0.6) c.lerp(col.setHex(0x1a1410), 0.7);
  });
  if(!front) g.rotateY(PI);
  return g;
}
/* a crow: perched, hunched, its wings folded (each wing a group that can open) */
function crow(R, parent, x, y, z, yaw){
  const g = group(parent, x, y, z); g.rotation.y = yaw;
  const body = new THREE.SphereGeometry(0.065, 12, 9); body.scale(0.8, 0.78, 1.45); K.sculpt(body, 0.006, 40, x*10);
  bsPaint(body, GB.crow, GB.crow2, 30, 2); P(g, body, 0xffffff, 0, 0.07, 0);
  P(g, BX(0.06, 0.012, 0.11), GB.crow, 0, 0.05, -0.13, -0.35);
  [-1, 1].forEach(s=>{ P(g, CY(0.005, 0.005, 0.06, 4), 0x2a2420, s*0.022, 0.025, 0.01); P(g, BX(0.03, 0.006, 0.035), 0x2a2420, s*0.022, -0.002, 0.02); });
  const head = group(g, 0, 0.12, 0.085);
  P(head, bsPaint(new THREE.SphereGeometry(0.038, 10, 8), GB.crow, GB.crow2, 40, 3), 0xffffff, 0, 0, 0, 0, 0, 0, 0.9, 0.95, 1.1);
  P(head, CO(0.014, 0.07, 6), 0x1e1c1e, 0, -0.008, 0.06, PI/2 + 0.15);
  [-1, 1].forEach(s=> P(head, S(0.006, 6, 4), 0x6a6a5a, s*0.024, 0.008, 0.02));
  const wings = [-1, 1].map(s=>{
    const w = group(g, s*0.045, 0.1, 0.02);
    const wg = new THREE.BoxGeometry(0.2, 0.008, 0.11, 4, 1, 2), wa = wg.attributes.position;
    for(let i=0;i<wa.count;i++){ const wx = wa.getX(i) + 0.1, wz = wa.getZ(i); wa.setXYZ(i, s*wx, wa.getY(i), wz - wx*0.35 - (wx > 0.15 && wz < 0 ? 0.04 : 0)); }
    wg.computeVertexNormals(); bsPaint(wg, GB.crow, GB.crow2, 25, s + 4);
    P(w, wg, 0xffffff, 0, 0, 0);
    // fold: hung down along the flank, swept back
    w.rotation.set(0, s*0.5, s*-1.35);
    return w;
  });
  return { g, head, wL:wings[0], wR:wings[1] };
}

Models.gibbet = function(){
  const R = rig("gibbet"), b = R.body, Pt = R.parts;
  const kn = group(b, 0, 0, 0); kn.scale.setScalar(GS); Pt.kn = kn;
  // the hips: rusted faulds over a skirt of black mail
  const fa = bsLathe([[0.25, 1.02], [0.27, 0.95], [0.3, 0.86], [0.32, 0.78]], 30);
  plateC(fa, 7, 2); P(kn, fa, 0xffffff);
  for(let i=0;i<3;i++) P(kn, bsRing(0.27 + i*0.022, 0.009), GB.plate2, 0, 0.98 - i*0.07, 0, PI/2, 0, 0, 1, 1, 0.85);
  const mail = K.tatter(bsLathe([[0.29, 0.86], [0.31, 0.74], [0.33, 0.6]], 30), 0.7, 18, 0.12, 3.3);
  bsPaint(mail, GB.mail, 0x121214, 40, 2, (c, x, y, z)=>{ if(Math.sin(y*160) > 0.5) c.multiplyScalar(0.7); });
  P(kn, mail, 0xffffff, 0, 0, 0, 0, 0, 0, 1, 1, 0.85);
  // the legs: cuisses, knee-cops, greaves, sabatons; the left one broke in the drop and was never set
  const legs = [], knees = [], feet = [];
  [-1, 1].forEach(s=>{
    const l = group(kn, s*0.16, 0.92, 0); legs.push(l);
    P(l, plateC(new THREE.CylinderGeometry(0.125, 0.095, 0.44, 16, 3), 6, s + 2), 0xffffff, 0, -0.22, 0.0);
    P(l, BX(0.012, 0.36, 0.03), GB.plate2, 0, -0.22, 0.095);
    P(l, BX(0.2, 0.025, 0.2), GB.leather, 0, -0.06, 0.0);
    const k = group(l, 0, -0.44, 0); knees.push(k);
    P(k, plateC(K.sculpt(new THREE.SphereGeometry(0.1, 14, 10), 0.006, 30, s), 9, s + 5), 0xffffff, 0, 0, 0.02, 0, 0, 0, 1, 1, 1.1);
    P(k, BX(0.16, 0.08, 0.02), GB.plate, 0, 0.0, 0.06, 0.2, 0, 0, 1, 1, 1);
    P(k, plateC(new THREE.CylinderGeometry(0.095, 0.072, 0.42, 16, 3), 7, s + 8, 0.35), 0xffffff, 0, -0.23, 0.0);
    P(k, BX(0.012, 0.34, 0.03), GB.plate2, 0, -0.23, 0.075);
    const f = group(k, 0, -0.45, 0); feet.push(f);
    for(let i=0;i<4;i++) P(f, BX(0.15 - i*0.006, 0.055, 0.08), i % 2 ? GB.plate2 : GB.plate, 0, -0.01 - i*0.005, 0.02 + i*0.065, 0.12);
    P(f, CO(0.05, 0.12, 6), GB.plate, 0, -0.03, 0.29, PI/2, 0, 0, 1, 1, 0.5);
    P(f, BX(0.12, 0.04, 0.12), 0x1e1a18, 0, -0.04, -0.03);
  });
  Pt.legs = legs; Pt.knees = knees; Pt.feet = feet;
  knees[0].rotation.set(0.05, 0.25, 0);                  // the bad leg, turned out

  // the torso: everything above the waist turns as one
  const tor = group(kn, 0, 0.98, 0); R.tor = Pt.tor = tor;
  const bp = bsLathe(CHEST.map(p=> [p[1], p[0]]), 36);
  K.sculpt(bp, 0.01, 7, 4); plateC(bp, 5, 3);
  P(tor, bp, 0xffffff, 0, 0, 0, 0, 0, 0, 1, 1, 0.8);
  P(tor, BX(0.025, 0.5, 0.03), GB.plate2, 0, 0.3, 0.255, -0.05);
  for(let i=0;i<5;i++) P(tor, zs(0.014), 0x5a4a38, -0.18 + i*0.09, 0.06, 0.2 + (i === 2 ? 0.01 : 0));
  // the tabard of the Keep, front and back, and a sword belt
  const tab = group(tor, 0, 0, 0); Pt.tab = tab;
  P(tab, tabard(true), 0xffffff);
  P(tab, tabard(false), 0xffffff);
  P(tor, bsRing(0.3, 0.025), GB.leather, 0, -0.02, 0, PI/2, 0, 0, 1, 1, 0.83);
  P(tor, BX(0.07, 0.07, 0.03), 0x5a4426, 0.05, -0.02, 0.27);
  // a gorget, and the noose still round the neck
  P(tor, plateC(new THREE.CylinderGeometry(0.11, 0.17, 0.12, 20, 2), 8, 6), 0xffffff, 0, 0.66, 0.01);
  P(tor, TO(0.105, 0.022, 0), GB.rope, 0.0, 0.73, 0.0, PI/2 - 0.2, 0, 0.15);
  P(tor, K.lump(0.045, 1, 0.3, 3.3), GB.rope, 0.11, 0.72, -0.04, 0, 0, 0, 1, 1.5, 1);
  for(let i=0;i<3;i++) P(tor, TO(0.042, 0.01, 0), 0x4a3e2c, 0.11, 0.69 + i*0.03, -0.04, PI/2);
  P(tor, K.tube([[0.12, 0.76, -0.05], [0.1, 0.92, -0.08], [0.04, 1.06, -0.04], [0, 1.17, 0]], 0.019, 14, 8), GB.rope);

  // the gibbet: iron straps riveted into a man-shaped cage, bars bent where the arms broke out
  const cage = group(tor, 0, 0, 0); Pt.cage = cage;
  const NB = 9;
  for(let i=0;i<NB;i++){
    const a = i/NB*PI*2, side = Math.abs(Math.sin(a)), front = Math.cos(a) > 0.95;
    const pts = [];
    for(let k=0;k<=12;k++){
      const y = -0.22 + k/12*1.38;
      let r = cageR(y) + 0.005;
      // the bars by the shoulders bowed outward, wrenched by the arms
      if(side > 0.85) r += 0.13*Math.max(0, Math.sin(clamp((y - 0.22)/0.5, 0, 1)*PI));
      let aa = a;
      if(side > 0.85) aa += (Math.sin(a) > 0 ? 1 : -1)*0.25*Math.max(0, Math.sin(clamp((y - 0.22)/0.5, 0, 1)*PI))*(Math.cos(a) > 0 ? 1 : -1);
      pts.push([Math.sin(aa)*r, y, Math.cos(aa)*r*CZ]);
    }
    if(front){
      // the front bar snapped at the chest, both ends bent out
      P(cage, ironC(K.tube(pts.slice(0, 6).concat([[pts[5][0] + 0.05, pts[5][1] + 0.05, pts[5][2] + 0.12]]), 0.015, 10, 6), i), 0xffffff);
      P(cage, ironC(K.tube([[pts[8][0] - 0.04, pts[8][1] - 0.07, pts[8][2] + 0.14]].concat(pts.slice(8)), 0.015, 10, 6), i + 1), 0xffffff);
    } else P(cage, ironC(K.tube(pts, 0.015, 18, 6), i), 0xffffff);
  }
  [-0.22, 0.2, 0.62, 0.95].forEach((y, j)=>{
    const r = cageR(y) + 0.008;
    const hoop = new THREE.TorusGeometry(r, 0.018, 5, 40); hoop.rotateX(PI/2); hoop.scale(1, 0.75, CZ); ironC(hoop, j + 3);
    P(cage, hoop, 0xffffff, 0, y, 0);
    for(let i=0;i<NB;i++){ const a = i/NB*PI*2; if(Math.abs(Math.sin(a)) > 0.85 && y > 0.2 && y < 0.7) continue; P(cage, zs(0.018), 0x3a2a20, Math.sin(a)*(r + 0.012), y, Math.cos(a)*(r + 0.012)*CZ); }
  });
  P(cage, ironC(new THREE.TorusGeometry(0.075, 0.02, 6, 20), 9), 0xffffff, 0, 1.24, 0);
  P(cage, CY(0.03, 0.04, 0.06, 8), GB.cage, 0, 1.16, 0);
  // the rope out of the top, frayed where it was cut
  P(cage, K.tube([[0, 1.2, 0], [0.03, 1.3, 0.04], [0.02, 1.4, -0.01]], 0.017, 6, 6), GB.rope);
  [[0.05, 0.03], [-0.03, 0.05], [0.0, -0.05]].forEach(([dx, dz])=> P(cage, K.tube([[0.02, 1.4, -0.01], [0.02 + dx, 1.46, -0.01 + dz]], 0.004, 3, 3), 0x7a6a4a));
  // and the chain it hung by, snapped, trailing down his back
  const ch = group(cage, 0, 1.24, -0.02); Pt.chain = ch;
  bsChain(ch, [0, 0.02, -0.03], [0, -0.04, -0.22], 5, 0x3a3234, 0.03);
  bsChain(ch, [0, -0.06, -0.25], [0.04, -0.8, -0.52], 11, 0x3a3234, 0.03, 0.05);
  P(ch, TO(0.03, 0.007, PI*1.4), 0x4a3e38, 0.04, -0.86, -0.53, 0.3, 0.5, 0);

  // the head: a great helm, dented and pecked through, lolled to one side on a broken neck
  const head = group(tor, 0, 0.74, 0.02); Pt.head = head;
  head.rotation.set(0.12, 0, 0.32);
  const helm = new THREE.CylinderGeometry(0.135, 0.15, 0.3, 26, 6, true); K.sculpt(helm, 0.008, 12, 3);
  plateC(helm, 8, 7, 0.1); P(head, helm, 0xffffff, 0, 0.14, 0);
  const dome = new THREE.SphereGeometry(0.137, 26, 10, 0, PI*2, 0, PI/2); dome.scale(1, 0.55, 1); K.sculpt(dome, 0.006, 14, 2); plateC(dome, 8, 8, 0.1);
  P(head, dome, 0xffffff, 0, 0.29, 0);
  P(head, BX(0.025, 0.36, 0.03), GB.plate2, 0, 0.16, 0.145);
  P(head, BX(0.26, 0.024, 0.03), 0x050405, 0, 0.17, 0.135);
  [-1, 1].forEach(s=>{ glow(R, head, 0.008, 0xbfd0ff, s*0.045, 0.17, 0.12); });
  halo(R, head, 0x8aa0d0, 0.28, 0, 0.17, 0.16, 0.22);
  for(let i=0;i<8;i++){ const x = 0.03 + (i % 4)*0.022, y = 0.06 - Math.floor(i/4)*0.03; P(head, zs(0.007), 0x050405, x, y, 0.15 - x*0.15); }
  // holes the crows made, and their droppings down the helm
  [[0.09, 0.24, 0.1], [-0.11, 0.08, 0.08], [0.05, 0.3, -0.06]].forEach(([x, y, z])=> P(head, zs(0.016), 0x060405, x, y, z));
  [[-0.06, 0.26], [0.1, 0.22], [-0.12, 0.2]].forEach(([x, y], i)=> P(head, BX(0.014, 0.08 + i*0.02, 0.01), 0x8a8676, x, y - 0.04, Math.sqrt(Math.max(0, 0.144*0.144 - x*x)) + 0.004, 0, Math.atan2(x, 0.14)));
  P(head, bsRing(0.152, 0.012), GB.rust, 0, 0.0, 0, PI/2);

  // arms: pauldrons, rerebraces, couters, vambraces, gauntlets (posed by reaching, see the moves)
  const arm = s=>{
    const a = group(tor, s*0.38, 0.56, 0);
    const pd = new THREE.SphereGeometry(0.15, 18, 12, 0, PI*2, 0, PI*0.5); pd.scale(1.1, 0.62, 1.15); K.sculpt(pd, 0.008, 10, s + 4); plateC(pd, 7, s + 11, 0.3);
    P(a, pd, 0xffffff, s*0.03, 0.02, 0, 0, 0, -s*0.35);
    for(let i=0;i<2;i++){ const l = new THREE.SphereGeometry(0.145 - i*0.012, 18, 6, 0, PI*2, PI*0.4, PI*0.14); l.scale(1.05, 1, 1.1); plateC(l, 7, s + 14 + i); P(a, l, 0xffffff, s*0.03, -0.05 - i*0.05, 0, 0, 0, -s*0.35); }
    P(a, CO(0.03, 0.14, 6), GB.plate2, s*0.1, 0.13, 0, 0, 0, -s*0.6);
    P(a, CY(0.095, 0.1, 0.12, 12), GB.mail, 0, -0.08, 0);
    P(a, plateC(new THREE.CylinderGeometry(0.075, 0.066, 0.3, 14, 2), 7, s + 17), 0xffffff, 0, -0.2, 0);
    const f = group(a, 0, -0.36, 0);
    P(f, plateC(K.sculpt(new THREE.SphereGeometry(0.07, 12, 9), 0.006, 30, s), 8, s + 19), 0xffffff, 0, 0, 0);
    P(f, BX(0.02, 0.1, 0.1), GB.plate, s*0.06, 0, -0.02);
    P(f, plateC(new THREE.CylinderGeometry(0.066, 0.056, 0.28, 14, 2), 7, s + 21), 0xffffff, 0, -0.17, 0);
    P(f, CY(0.07, 0.062, 0.05, 12), GB.plate2, 0, -0.3, 0);
    // the gauntlet, a fist
    P(f, BX(0.1, 0.09, 0.1), GB.plate, 0, -0.38, 0.0);
    for(let i=0;i<4;i++) P(f, BX(0.022, 0.05, 0.04), i % 2 ? GB.plate2 : GB.plate, -0.035 + i*0.024, -0.43, 0.04);
    P(f, BX(0.03, 0.06, 0.03), GB.plate, -s*0.055, -0.39, 0.04);
    // a rag of mail and tabard hanging off the elbow
    P(f, K.tatter(bsLathe([[0.075, 0.0], [0.08, -0.08], [0.085, -0.16]], 12), -0.05, 6, 0.06, s + 2), GB.mail, 0, 0.0, 0);
    return { a, f };
  };
  const ar = arm(1), al = arm(-1);
  Pt.armR = ar.a; Pt.foreR = ar.f; Pt.armL = al.a; Pt.foreL = al.f;

  // the greatsword: notched, broken at the point, the fuller black with old blood
  const sw = group(tor, 0, 0, 0); Pt.sword = sw;
  const bl = new THREE.BoxGeometry(0.17, 0.032, 1.45, 2, 1, 72), ba = bl.attributes.position;
  bl.translate(0, 0, 0.765);
  for(let i=0;i<ba.count;i++){
    let x = ba.getX(i), y = ba.getY(i), z = ba.getZ(i);
    const edge = Math.abs(x) > 0.04;
    x *= 1 - 0.2*(z - 0.04)/1.45;
    if(edge){ [0.36, 0.6, 0.67, 0.96, 1.22].forEach((n, j)=>{ x *= 1 - (j === 2 ? 0.3 : 0.4)*Math.max(0, 1 - Math.abs(z - n)/0.028)*(x*(j % 2 ? 1 : -1) > 0 ? 1 : 0.15); }); }
    if(Math.abs(x) < 0.04) y *= 1.5;
    // the point snapped off on a slant
    const cut = 1.4 + x*1.6; if(z > cut) z = cut;
    ba.setXYZ(i, x, y, z);
  }
  bl.computeVertexNormals();
  bsPaint(bl, GB.steel, 0x2a2826, 10, 4, (c, x, y, z)=>{
    if(Math.abs(x) < 0.018 && z < 1.1) c.setHex(0x1a0e0c);
    if(Math.abs(x) > 0.055) c.lerp(col.setHex(0x9a968c), 0.5);
    if(bsN(x, y, z, 8, 3) > 0.35) c.lerp(col.setHex(GB.rust), 0.7);
    if(bsN(x, y, z, 5, 9) > 0.55 && z < 0.7) c.lerp(col.setHex(BS.blood), 0.75);
  });
  P(sw, bl, 0xffffff);
  const guard = new THREE.BoxGeometry(0.52, 0.05, 0.055, 8, 1, 1), ga = guard.attributes.position;
  for(let i=0;i<ga.count;i++){ const x = ga.getX(i); ga.setY(i, ga.getY(i) - x*x*0.6); ga.setZ(i, ga.getZ(i) + x*x*0.3); }
  guard.computeVertexNormals(); P(sw, ironC(guard, 5), 0xffffff, 0, 0, 0.02);
  [-1, 1].forEach(s=> P(sw, zs(0.028), GB.rust, s*0.265, -0.045, 0.1));
  P(sw, CY(0.026, 0.03, 0.34, 10), GB.leather, 0, 0, -0.17, PI/2);
  for(let i=0;i<7;i++) P(sw, TO(0.03, 0.006, 0), 0x241a12, 0, 0, -0.03 - i*0.045);
  P(sw, ironC(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 14), 6), 0xffffff, 0, 0, -0.37, 0, 0, PI/2);
  P(sw, zs(0.022), GB.rust, 0, 0, -0.395);

  // the crows: one on the cage's crown, one on its shoulder, one on its back
  Pt.crows = [crow(R, cage, 0.0, 1.27, 0.02, 0.2), crow(R, cage, -0.32, 0.64, 0.24, -0.7), crow(R, cage, 0.22, 0.98, -0.16, 2.4)];
  R.h = 3.3; R.size = 2.4;
  return finish(R, { w:0.03 });
};
Models.FAMILY.gibbet = "brute";
Models.BOSSES.gibbet = 1;

/* his poses: where the sword is (its grip, in the torso's space), which way the
   blade points (d) and its flat faces (u); how the torso turns (ty), pitches (tp)
   and rolls (tr); how deep he crouches (cr); how far forward the body goes (z);
   the head's pitch (hp); the left hand let go of the sword (lf) to reach for L */
const GK = {
  rest:  { g:[0.12, -0.08, 0.4],  d:[0.22, -0.72, 0.66], u:[1, 0, 0],    ty:0,    tp:0.06,  tr:0,    cr:0,    z:0,     hp:0,     lf:0, L:[-0.45, -0.1, 0.25], tuck:0, rattle:0 },
  sweepW:{ g:[0.5, 0.48, -0.25], d:[0.62, 0.22, -0.76], u:[0, 1, 0.2],  ty:0.9,  tp:-0.08, tr:-0.12, cr:0.3, z:-0.08, hp:-0.15 },
  sweepH:{ g:[-0.35, 0.3, 0.5],  d:[-0.86, -0.02, 0.5], u:[0, 1, 0],    ty:-1.05, tp:0.28, tr:0.14, cr:0.4,  z:0.3,   hp:0.15 },
  stabW: { g:[0.34, 0.12, -0.14], d:[0.08, 0.08, 1],     u:[0, 1, 0],   ty:0.55, tp:-0.15, tr:0,   cr:0.35, z:-0.18, hp:-0.1 },
  stabH: { g:[0.04, 0.3, 0.78],  d:[0, 0.0, 1],         u:[0, 1, 0],    ty:-0.15, tp:0.38, tr:0,   cr:0.5,  z:0.75,  hp:0.12 },
  leapW: { g:[0.26, -0.18, 0.3], d:[0.3, -0.6, 0.74],   u:[1, 0, 0],    ty:0.2,  tp:0.5,  tr:0,    cr:1,    z:0,     hp:-0.35 },
  leapH: { g:[0.05, 0.95, 0.05], d:[0, 0.55, -0.83],    u:[1, 0, 0],    ty:0,    tp:-0.25, tr:0,   cr:-0.05, z:0.25, hp:-0.25, tuck:0.3 },
  air:   { g:[0.05, 0.98, 0.0],  d:[0, 0.4, -0.92],     u:[1, 0, 0],    ty:0,    tp:-0.15, tr:0,   cr:0,    z:0,     hp:-0.2,  tuck:1 },
  slam:  { g:[0.03, 0.12, 0.74], d:[0.05, -0.36, 0.93],      u:[1, 0, 0],    ty:0,    tp:0.6,  tr:0,    cr:0.9,  z:0.3,   hp:0.3 },
  crowsW:{ g:[0.6, 0.28, 0.14],  d:[0.72, -0.55, 0.3],  u:[0, 0.3, 1],  ty:0,    tp:-0.3, tr:0,    cr:0.2,  z:-0.05, hp:-0.55, lf:1, L:[-0.78, 0.55, 0.15], rattle:1 },
  crowsH:{ g:[0.68, 0.5, 0.0],   d:[0.82, -0.3, 0.15],  u:[0, 0.3, 1],  ty:0,    tp:-0.45, tr:0,   cr:0.1,  z:-0.1,  hp:-0.8,  lf:1, L:[-0.85, 0.85, 0.05], rattle:0.6 }
};
const gKey = (kind, hit)=>{
  const k = kind === "sweep" ? "sweep" : kind === "leap" ? "leap" : kind === "crows" ? "crows" : "stab";
  return GK[k + (hit ? "H" : "W")];
};
const RH = [0, 0, -0.1], LH = [0, 0, -0.25];
Models.MOVES.gibbet = function(c){
  const { m, P, t, dt, s, ph, fall, fl, fit, breath, o } = c;
  const k = strikeState(c);
  // the leap: in the air while the game lifts him; a slam the frame he lands
  const hop = o.hop || 0, air = smooth(0.05, 0.5, hop);
  if(hop > 0.3) m.flying = true;
  if(m.flying && hop < 0.06){ m.slam = 1; m.flying = false; }
  m.slam = Math.max(0, (m.slam || 0) - dt/0.7);
  const slam = m.slam > 0 ? arc(1 - m.slam) : 0;
  const list = [];
  if(k.wk) list.push([gKey(k.wk, false), c.wind]);
  if(k.hk){ list.push([gKey(k.hk, false), k.carry]); list.push([gKey(k.hk, true), k.hit*(1 - air)]); }
  list.push([GK.air, air]); list.push([GK.slam, slam]);
  const q = blend(GK.rest, list);
  // walking: a dragging limp, the sword's point scraping behind him
  const sw = Math.sin(ph), sw2 = Math.sin(ph + PI);
  q.ty += Math.sin(ph)*0.08*s; q.g[2] -= 0.08*s; q.g[1] += 0.04*s;
  // the cage still hangs: he sways on his feet like it does
  const hang = Math.sin(t*0.9 + c.m.seed)*0.04 + Math.sin(t*0.37)*0.03;
  // the legs: the crouch bends both knees; the limp drags the left
  const cr = q.cr, tuck = q.tuck;
  const thigh = 1.0*cr + 1.15*tuck, knee = 1.7*cr + 1.7*tuck;
  c.pose(P.legs[1], 0, 0, 0, -thigh + sw*0.5*s - 0.1*s, 0, 0.02*cr);
  c.pose(P.legs[0], 0, 0, 0, -thigh*0.9 + sw2*0.25*s, 0, -0.04*cr - 0.04);
  c.pose(P.knees[1], 0, 0, 0, knee + Math.max(0, -sw)*0.7*s, 0, 0);
  c.pose(P.knees[0], 0, 0, 0, knee*0.9 + Math.max(0, -sw2)*0.15*s, 0, 0);
  c.pose(P.feet[1], 0, 0, 0, -0.7*cr - 0.6*tuck - Math.max(0, -sw)*0.3*s, 0, 0);
  c.pose(P.feet[0], 0, 0, 0, -0.65*cr - 0.6*tuck + 0.25*s*Math.max(0, sw2), 0, 0);
  const drop = (0.88 - 0.44*Math.cos(cr*1.0) - 0.44*Math.cos(cr*0.7))*GS;
  const back = (0.44*Math.sin(cr*1.0) - 0.44*Math.sin(cr*0.7))*GS;
  // the torso: turns, pitches and rolls; a flinch throws it back
  const shake = c.shake*4 + (k.wk === "crows" ? Math.sin(t*61)*0.03*c.wind : 0);
  c.pose(P.tor, 0, 0, 0, q.tp + breath*0.015 - 0.3*fl + shake, q.ty + shake*0.5, q.tr + hang*0.5 + Math.sin(ph)*0.05*s);
  // the cage rattles on him
  const rat = q.rattle*Math.sin(t*53)*0.03 + (fit > 0.5 ? Math.sin(t*47)*0.02*fit : 0);
  c.pose(P.cage, 0, rat*0.3, 0, rat, rat*0.5, rat*0.7);
  c.pose(P.chain, 0, 0, 0, Math.sin(t*1.3 + 0.5)*0.12 + q.tp*0.6 + 0.2*s, 0, Math.sin(t*0.9)*0.1 - q.ty*0.25);
  // the head lolls; a fit jerks it like the rope just went taut again
  const jerk = fit > 0.7 ? Math.sin((1 - fit)/0.3*PI)*0.5 : 0;
  c.pose(P.head, 0, 0, 0, q.hp + Math.sin(t*0.8)*0.04 - 0.25*fl, Math.sin(t*0.5 + 1)*0.1, hang*2 - jerk - q.tr*0.5);
  // the tabard drags behind the moves
  const tg = m.tab || (m.tab = { x:0, v:0 });
  const tx = Models.spring(tg, -q.tp*0.7 + 0.15*s - q.z*0.3, 40, 6, dt);
  c.pose(P.tab, 0, 0, 0, Math.min(0.1, tx*0.4), 0, 0);
  // the sword, then both hands on its grip (the left lets go to throw the crows off)
  const sw0 = P.sword;
  sw0.position.set(q.g[0], q.g[1], q.g[2]);
  aim(sw0, q.d, q.u);
  // keep the grip within the right arm's reach
  const rh = V4.set(RH[0], RH[1], RH[2]).applyQuaternion(sw0.quaternion).add(sw0.position);
  const sR = P.armR.position, dx = rh.x - sR.x, dy = rh.y - sR.y, dz = rh.z - sR.z, dl = Math.hypot(dx, dy, dz), max = 0.74;
  if(dl > max){ const f = max/dl - 1; sw0.position.x += dx*f; sw0.position.y += dy*f; sw0.position.z += dz*f; rh.x += dx*f; rh.y += dy*f; rh.z += dz*f; }
  const rx = rh.x, ry = rh.y, rz = rh.z;
  reach(P.armR, P.foreR, rx, ry, rz, 0.36, 0.4, 1, -0.7, -0.5);
  const lh = V5.set(LH[0], LH[1], LH[2]).applyQuaternion(sw0.quaternion).add(sw0.position);
  const lf = clamp(q.lf, 0, 1), lx = lerp(lh.x, q.L[0], lf), ly = lerp(lh.y, q.L[1], lf), lz = lerp(lh.z, q.L[2], lf);
  reach(P.armL, P.foreL, lx, ly, lz, 0.36, 0.4, -1, -0.7, -0.5);
  // the crows: they shift and peck; they flap when he rattles; they go up when he roars
  if(c.kind === "crows" && c.strike > 0.95 && !(m.away > 0.9)) m.away = 1;
  m.away = Math.max(0, (m.away || 0) - dt/3.2);
  m.cr = m.cr || P.crows.map(()=> ({ t:Math.random()*2, y:0, p:0 }));
  P.crows.forEach((cw, i)=>{
    const st = m.cr[i]; st.t -= dt;
    if(st.t <= 0){ st.t = 0.3 + Math.random()*1.6; st.y = (Math.random() - 0.5)*2.2; st.p = Math.random() < 0.25 ? 0.7 : 0; }
    const flap = k.wk === "crows" ? c.wind : 0, out = m.away;
    let vis = 1, fx = 0, fy = 0, fz = 0;
    if(out > 0){
      if(out > 0.55){ const f = (1 - out)/0.45; fy = 3.2*f*f + 0.4*f; fx = Math.sin(i*2.1 + 0.5)*2*f; fz = Math.cos(i*2.1 + 0.5)*2*f - 0.5*f; vis = 1 - smooth(0.6, 1, f); }
      else if(out > 0.22) vis = 0;
      else { const f = out/0.22; fy = 1.6*f; fx = Math.sin(i*1.7)*0.8*f; vis = 1 - f*0.9; }
    }
    const fly = out > 0 && vis > 0 ? 1 : flap;
    const hopY = flap*Math.abs(Math.sin(t*9 + i))*0.05;
    c.pose(cw.g, fx, fy + hopY + rat*0.2, fz, 0, out > 0 ? Math.sin(t*3 + i)*0.5 : 0, 0, Math.max(0.001, vis), Math.max(0.001, vis), Math.max(0.001, vis));
    c.pose(cw.head, 0, 0, 0, st.p*Math.max(0, Math.sin((1.6 - st.t)*12)) - flap*0.4, st.y, 0);
    const beat = Math.sin(t*(fly > 0 ? 26 : 2) + i)*(fly > 0 ? 1 : 0.02);
    [cw.wL, cw.wR].forEach((w, j)=>{ const sg = j ? 1 : -1; c.pose(w, 0, 0, 0, 0, -sg*0.5*fly, sg*(1.35*fly + beat*0.9*fly)); });
  });
  return { y:-drop - 0.03*fall*s*GS, z:(q.z*GS*0.6) - back, rx:0.04*s - 0.12*fl, rz:hang*0.6 + Math.sin(ph)*0.05*s + 0.03*s };
};


/* ================================================================== *
 *  The Rat King. Rats of the Undercroft, a few hundred winters of them,
 *  their tails grown together into one knot, the living gnawing their
 *  way out of the dead. Somebody pushed a crown down onto the biggest.
 *  It moves like spilt grain, all of it at once, and every head twitches
 *  on its own.
 * ================================================================== */
const RK = { fur:0x4a4038, fur2:0x1e1816, belly:0x6a5e52, tail:0x7a625c, tail2:0x3a2a28, sore:0x5a1e1c, nose:0x5e3c3a, ear:0x6a4c48, tooth:0xc8b070, rag:0x4a4232, bone:0xb0a488 };
const ratBodyGeo = (n)=> bsPrefab("ratbody" + n, g=>{
  const b = new THREE.SphereGeometry(0.1, 12, 9); b.scale(0.95, 0.82, 2.05); K.sculpt(b, 0.012, 26, n*3.1);
  bsPaint(b, RK.fur, RK.fur2, 24, n, (c, x, y, z)=>{ if(y < -0.03) c.lerp(col.setHex(RK.belly), 0.45); if(bsN(x, y, z, 38, n + 2) > 0.62) c.lerp(col.setHex(RK.sore), 0.8); if(Math.sin(z*90 + x*40) > 0.7) c.multiplyScalar(0.75); });
  P(g, b, 0xffffff);
  // the haunches, and the start of the tail going in
  [-1, 1].forEach(s=>{ const h = new THREE.SphereGeometry(0.06, 8, 6); h.scale(0.9, 1, 1.3); bsPaint(h, RK.fur, RK.fur2, 30, n + s); P(g, h, 0xffffff, s*0.055, -0.03, -0.1); });
  P(g, bsPaint(new THREE.CylinderGeometry(0.014, 0.024, 0.14, 8), RK.tail, RK.tail2, 30, n), 0xffffff, 0, 0.0, -0.24, PI/2 + 0.3);
  // forepaws, splayed
  [-1, 1].forEach(s=>{ P(g, H.zcy(0.012, 0.016, 0.07, 5), RK.ear, s*0.06, -0.07, 0.13, 0.5); [-1, 0, 1].forEach(k=> P(g, CO(0.005, 0.03, 4), 0x1a1210, s*0.06 + k*0.01, -0.1, 0.16, PI/2)); });
});
/* a head: long skull, a wet nose, torn ears, yellow teeth, eyes like seeds */
const ratHeadGeo = (n, jawless)=> bsPrefab("rathead" + n + (jawless ? "j" : ""), g=>{
  const sk = new THREE.SphereGeometry(0.07, 12, 8); sk.scale(0.85, 0.78, 1.15); K.sculpt(sk, 0.006, 30, n);
  bsPaint(sk, RK.fur, RK.fur2, 30, n + 1, (c, x, y, z)=>{ if(y < -0.02) c.lerp(col.setHex(RK.belly), 0.4); if(bsN(x, y, z, 50, n) > 0.65) c.lerp(col.setHex(RK.sore), 0.8); });
  P(g, sk, 0xffffff, 0, 0, 0);
  const sn = new THREE.ConeGeometry(0.052, 0.15, 10, 2); sn.rotateX(PI/2); bsPaint(sn, RK.fur, RK.fur2, 40, n + 3);
  P(g, sn, 0xffffff, 0, -0.012, 0.11, 0, 0, 0, 1, 0.82, 1);
  P(g, zs(0.016, 6, 5), RK.nose, 0, -0.008, 0.185);
  [-1, 1].forEach(s=>{
    const ear = new THREE.SphereGeometry(0.034, 8, 5); ear.scale(1, 1.15, 0.35); bsPaint(ear, RK.ear, 0x2a1a18, 40, n + s, (c, x, y)=>{ if(y > 0.02 && ((n*7 + s*3) % 4 === 0)) c.multiplyScalar(0.3); });
    P(g, ear, 0xffffff, s*0.045, 0.055, -0.02, -0.3, s*0.5, s*0.3);
    P(g, zs(0.011, 6, 4), 0x050404, s*0.036, 0.02, 0.06);
    // whiskers
    for(let k=0;k<2;k++) P(g, H.zcy(0.0015, 0.0015, 0.1, 3), 0x8a8070, s*0.05, -0.012 + k*0.01, 0.15, 0, 0, s*(PI/2 - 0.3 - k*0.25));
  });
  if(!jawless){ [-1, 1].forEach(s=> P(g, BX(0.011, 0.03, 0.008), RK.tooth, s*0.007, -0.04, 0.17, 0.2)); }
});
const ratJawGeo = ()=> bsPrefab("ratjaw", g=>{
  const j = new THREE.ConeGeometry(0.04, 0.12, 10, 1); j.rotateX(PI/2); bsPaint(j, RK.fur, RK.belly, 40, 4);
  P(g, j, 0xffffff, 0, 0, 0.06, 0, 0, 0, 1, 0.5, 1);
  P(g, zs(0.03, 8, 5), 0x2a0e0e, 0, 0.012, 0.05, 0, 0, 0, 0.8, 0.3, 1.4);
  [-1, 1].forEach(s=> P(g, BX(0.011, 0.03, 0.008), RK.tooth, s*0.007, 0.015, 0.11, -0.2));
});
/* yaw then pitch then roll: the order things lie on a mound */
function lay(m, rx, ry, rz){ m.rotation.order = "YXZ"; m.rotation.set(rx, ry, rz); return m; }
Models.ratking = function(){
  const R = rig("ratking"), b = R.body, Pt = R.parts;
  const mass = group(b, 0, 0, 0); Pt.mass = mass;
  // the core: a heap of bodies too packed to tell apart
  const core = bsBlob(0.62, 1.3, 0.85, 1.2, 0.06, 3.2, 5.1, 32, 22);
  bsPaint(core, RK.fur, RK.fur2, 9, 3, (c, x, y, z)=>{
    if(Math.sin(x*48 + Math.sin(z*30)*2) > 0.55) c.multiplyScalar(0.62);       // the grain of packed bodies
    if(bsN(x, y, z, 7, 8) > 0.5) c.lerp(col.setHex(RK.sore), 0.55);
    if(y < -0.3) c.multiplyScalar(0.7 + (y + 0.62)*0.8);
  });
  P(mass, core, 0xffffff, 0, 0.5, 0);
  // the tails, knotted on the crown of the heap
  const knot = group(mass, 0.0, 1.12, -0.2);
  P(knot, bsPaint(K.lump(0.2, 2, 0.25, 4.4), RK.tail, RK.tail2, 18, 3, (c, x, y, z)=>{ if(bsN(x, y, z, 30, 5) > 0.4) c.lerp(col.setHex(RK.sore), 0.6); }), 0xffffff, 0, 0, 0, 0, 0, 0, 1.2, 0.7, 1);
  for(let i=0;i<9;i++){
    const a = i/9*PI*2, r0 = 0.18;
    const pts = [[Math.sin(a)*r0, -0.02, Math.cos(a)*r0], [Math.sin(a + 1.4)*0.2, 0.1, Math.cos(a + 1.4)*0.2], [Math.sin(a + 2.7)*0.12, 0.04, Math.cos(a + 2.7)*0.12], [Math.sin(a + 3.6)*0.3, -0.08, Math.cos(a + 3.6)*0.3], [Math.sin(a + 3.9)*0.42, -0.22, Math.cos(a + 3.9)*0.4]];
    P(knot, bsPaint(bsTaper(pts, 0.03, 0.016, 14, 8), RK.tail, RK.tail2, 20, i), 0xffffff);
  }
  // the bodies: a lower ring and an upper, all facing out
  const heads = [], jaws = [], rats = [];
  const ring = (n, rad, y, tilt, a0, sz, live)=>{
    for(let i=0;i<n;i++){
      const a = a0 + i/n*PI*2 + Math.sin(i*7.3)*0.15, k = sz*(0.85 + ((i*13) % 5)*0.07);
      const x = Math.sin(a)*rad*1.1, z = Math.cos(a)*rad, tint = [0xffffff, 0xd8ccbc, 0xb8b0a8, 0xe8d8c0, 0x9a9088][(i*3 + n) % 5];
      lay(P(mass, ratBodyGeo((i % 4) + 1), tint, x, y, z, 0, 0, 0, k), tilt, a, Math.sin(i*3.1)*0.3);
      // the head: its own group if you can see it twitch, baked in if it's round the back
      const hx = x + Math.sin(a)*Math.cos(tilt)*0.22*k, hy = y - Math.sin(tilt)*0.22*k + 0.02*k, hz = z + Math.cos(a)*Math.cos(tilt)*0.22*k;
      const front = Math.cos(a) > -0.35;
      if(live && front){
        const h = lay(group(mass, hx, hy, hz), tilt*0.7, a, 0); h.scale.setScalar(k);
        const jawed = Math.cos(a) > 0.3;
        P(h, ratHeadGeo((i % 3) + 1, jawed), tint);
        if(jawed){ const j = group(h, 0, -0.04, 0.05); j.rotation.x = 0.08; P(j, ratJawGeo(), tint); jaws.push(j); }
        heads.push(h);
      } else {
        lay(P(mass, ratHeadGeo((i % 3) + 1), tint, hx, hy, hz, 0, 0, 0, k), tilt*0.7 + 0.3, a, Math.sin(i)*0.4);
      }
      rats.push(a);
    }
  };
  ring(12, 0.82, 0.3, 0.3, 0.1, 1.95, true);
  ring(8, 0.56, 0.68, -0.08, 0.5, 1.75, true);
  ring(5, 0.3, 0.98, -0.55, 1.1, 1.5, false);
  // and some of them dead in the knot: a skull, a ribcage, a rag
  P(mass, bsPaint(K.lump(0.06, 1, 0.3, 2), RK.bone, 0x6a6050, 20, 1), 0xffffff, 0.55, 0.95, -0.45);
  for(let i=0;i<5;i++) P(mass, K.tube([[0.3, 0.78 + i*0.03, -0.72], [0.38, 0.86 + i*0.03, -0.62], [0.46, 0.78 + i*0.03, -0.66]], 0.01, 6, 4), RK.bone);
  P(mass, CY(0.012, 0.016, 0.4, 6), RK.bone, -0.6, 0.6, -0.55, 0.4, 0, 1.0);
  [-0.6, 0.2].forEach(dz=> P(mass, zs(0.022), RK.bone, -0.6 + dz*0.2, 0.6 + dz*0.4, -0.55 + dz*0.3));
  const rag = new THREE.PlaneGeometry(0.5, 0.42, 6, 6), ra = rag.attributes.position;
  for(let i=0;i<ra.count;i++){ const x = ra.getX(i), y = ra.getY(i); ra.setZ(i, Math.sin(x*9 + y*7)*0.04 - y*y*0.6); if(y < -0.12) ra.setY(i, y - Math.abs(Math.sin(x*31))*0.12); }
  rag.computeVertexNormals(); bsPaint(rag, RK.rag, 0x1a1810, 12, 2);
  P(mass, rag, 0xffffff, -0.78, 0.62, 0.2, -0.3, -1.3, 0.2);
  P(mass, rag, 0xb0a890, 0.6, 0.85, -0.35, -0.6, 2.4, -0.3);
  P(mass, H.bsSkull(), 0x8a8070, -0.42, 0.92, -0.5, -0.3, -0.6, 0.2, 1.4);
  // the king: the biggest of them, half out of the top, a crown hammered down on him
  const kg = lay(group(mass, 0.0, 1.16, 0.12), -0.35, 0, 0); Pt.king = kg;
  lay(P(kg, ratBodyGeo(9), 0xe0d4c4, 0, -0.06, -0.2, 0, 0, 0, 2.6), 0.3, 0, 0);
  const kh = lay(group(kg, 0, 0.08, 0.2), 0.25, 0, 0); kh.scale.setScalar(3.0); Pt.kingHead = kh;
  P(kh, ratHeadGeo(7, true), 0xd8ccc0);
  const kj = group(kh, 0, -0.04, 0.05); kj.rotation.x = 0.1; P(kj, ratJawGeo(), 0xd8ccc0); Pt.kingJaw = kj;
  [-1, 1].forEach(s=> glow(R, kh, 0.005, 0xff3a1a, s*0.036, 0.02, 0.066));
  halo(R, kh, 0xa8301a, 0.22, 0, 0.02, 0.1, 0.25);
  // the crown, too small and crooked, hammered on over the ears
  const cr = group(kh, 0.005, 0.07, -0.01); cr.rotation.set(-0.15, 0, 0.22);
  P(cr, bsPaint(new THREE.CylinderGeometry(0.058, 0.064, 0.035, 20, 1, true), BS.brass, BS.rust, 30, 4), 0xffffff, 0, 0, 0);
  P(cr, bsRing(0.06, 0.006), 0x4a3820, 0, 0.017, 0, PI/2);
  for(let i=0;i<6;i++){ const a = i/6*PI*2, h = [0.06, 0.04, 0.07, 0.035, 0.055, 0.03][i]; P(cr, CO(0.011, h, 5), i % 2 ? BS.rust : 0x6a5428, Math.sin(a)*0.058, 0.018 + h/2, Math.cos(a)*0.058, Math.cos(a)*0.25, 0, -Math.sin(a)*0.25 + (i === 3 ? 0.5 : 0)); }
  P(cr, zs(0.01), 0x6a1414, 0, 0.0, 0.064);
  // tails loose at the bottom edge: they lash
  const tails = [];
  for(let i=0;i<8;i++){
    const a = i/8*PI*2 + 0.2, t = lay(group(mass, Math.sin(a)*0.75, 0.06, Math.cos(a)*0.7), 0, a + 0.5, 0);
    const sd = i % 2 ? 1 : -1;
    P(t, bsPaint(bsTaper([[0, 0, -0.1], [0, 0.0, 0.3], [sd*0.15, 0.0, 0.65], [sd*0.02, 0.0, 1.0], [-sd*0.15, 0.02, 1.3]], 0.035, 0.006, 16, 8), RK.tail, RK.tail2, 20, i), 0xffffff);
    tails.push(t);
  }
  // the feet: a fringe of little clawed paws all round the bottom, scrabbling
  const feet = group(b, 0, 0, 0); Pt.feet = feet;
  for(let i=0;i<22;i++){
    const a = i/22*PI*2 + Math.sin(i*5)*0.08, r = 0.86 + Math.sin(i*3.3)*0.06;
    const f = lay(P(feet, H.zcy(0.02, 0.03, 0.14, 6), RK.ear, Math.sin(a)*r*1.05, 0.05, Math.cos(a)*r*0.95), 1.1, a, 0);
    [-1, 0, 1].forEach(k=> lay(P(feet, CO(0.008, 0.05, 4), 0x1a1210, Math.sin(a)*(r + 0.08)*1.05 + Math.cos(a)*k*0.022, 0.012, Math.cos(a)*(r + 0.08)*0.95 - Math.sin(a)*k*0.022), PI/2, a, 0));
  }
  // three that peel off when it calls more of itself
  const peel = [];
  [[1.1, 0.5], [-2.0, 0.45], [2.75, 0.62]].forEach(([a, y], i)=>{
    const pg = lay(group(mass, Math.sin(a)*0.78, y, Math.cos(a)*0.68), 0.1, a, 0);
    P(pg, ratBodyGeo(i + 5), 0xc8bcae, 0, 0, 0, 0, 0, 0, 1.8);
    P(pg, ratHeadGeo(i + 4), 0xc8bcae, 0, 0.03, 0.42, 0.2, 0, 0, 1.8);
    peel.push(pg);
  });
  Pt.peelA = [1.1, -2.0, 2.75];
  Pt.heads = heads; Pt.jaws = jaws; Pt.tails = tails; Pt.peel = peel;
  R.h = 1.9; R.size = 2.4;
  return finish(R, { w:0.03 });
};
Models.FAMILY.ratking = "crab";
Models.BOSSES.ratking = 1;
Models.MOVES.ratking = function(c){
  const { m, P, t, dt, s, ph, fl, fit, breath, o } = c;
  const k = strikeState(c);
  const W = kd=> k.wk === kd ? c.wind : 0, Hh = kd=> k.hk === kd ? k.hit : 0, C = kd=> k.hk === kd ? k.carry : 0;
  const stream = W("stream") + C("stream"), streamH = Hh("stream");
  const lash = W("lash") + C("lash"), lashH = Hh("lash");
  const burrow = W("burrow") + C("burrow"), burrowH = Hh("burrow");
  const summon = W("summon") + C("summon"), summonH = Hh("summon");
  const quake = c.shake*6 + summon*Math.sin(t*57)*0.04 + (fit > 0.5 ? Math.sin(t*44)*0.02*fit : 0);
  // the heap: it heaves like one breathing thing, and rolls along as it goes
  const heave = 1 + 0.035*breath + 0.04*Math.sin(t*2.7)*Math.sin(t*1.1);
  const roll = Math.sin(ph*0.5)*0.06*s, pitch = Math.sin(ph)*0.05*s;
  const sy = heave*(1 + 0.12*stream - 0.15*lash - 0.42*burrow - 0.2*burrowH + 0.16*summon - 0.12*summonH) - 0.04*s;
  const sx = (2 - heave)*(1 - 0.04*stream + 0.1*lash + 0.25*burrow + 0.1*burrowH + 0.1*summon + 0.08*summonH) + 0.03*s;
  const coil = 0.7*lash - 0.95*lashH;
  c.pose(P.mass, quake*0.4, 0, -0.12*stream + 0.35*streamH, -0.18*stream + 0.32*streamH + pitch + quake, coil + Math.sin(t*0.4)*0.05, roll + quake*0.7, sx, sy, sx*(1 - 0.14*stream + 0.32*streamH));
  c.pose(P.feet, 0, 0, 0, 0, Math.sin(t*31)*0.03*s, 0, 1, 1 - 0.3*burrow, 1);
  // the heads: each its own rat, twitching, sniffing, snapping round
  m.hd = m.hd || P.heads.map(()=> ({ t:Math.random(), y:0, x:0, sn:0, yv:{ x:0, v:0 }, xv:{ x:0, v:0 } }));
  P.heads.forEach((h, i)=>{
    const st = m.hd[i]; st.t -= dt;
    if(st.t <= 0){ st.t = (0.15 + Math.random()*1.1)*(1 - 0.8*Math.min(1, summon)); st.y = (Math.random() - 0.5)*1.2; st.x = (Math.random() - 0.6)*0.6; st.sn = Math.random() < 0.3 ? 0.6 : 0; }
    const yy = Models.spring(st.yv, st.y, 900, 40, dt), xx = Models.spring(st.xv, st.x, 900, 40, dt);
    const sniff = st.sn*Math.sin(t*38 + i)*0.08;
    // rear up and turn to the front for the stream; snap down and forward to spew
    const rot = h.rotation.y, toFront = -Math.atan2(Math.sin(rot), Math.cos(rot));
    const rear = stream*(1 - streamH);
    c.pose(h, 0, 0.06*rear, 0.04*streamH, xx*(1 - stream) + sniff - 0.7*rear + 0.55*streamH - 0.3*burrow - 0.2*fl, yy*(1 - stream) + toFront*0.35*(stream + streamH), 0);
  });
  P.jaws.forEach((j, i)=> c.pose(j, 0, 0, 0, 0.12*Math.max(0, Math.sin(t*3 + i*1.7))*(1 - stream) + 0.6*stream + 0.9*streamH, 0, 0));
  // the king: slower, looks about, screams with the rest
  if(!m.kg){ m.kg = { t:0, y:0, yv:{ x:0, v:0 } }; }
  m.kg.t -= dt; if(m.kg.t <= 0){ m.kg.t = 0.8 + Math.random()*2; m.kg.y = (Math.random() - 0.5)*1.4; }
  const ky = Models.spring(m.kg.yv, m.kg.y, 120, 14, dt);
  c.pose(P.king, 0, 0.05*stream - 0.2*burrow, 0, -0.35*stream + 0.3*streamH + 0.15*summon*Math.sin(t*20), ky*(1 - stream), 0);
  c.pose(P.kingHead, 0, 0, 0, -0.3*stream + 0.25*streamH - 0.25*fl, 0, Math.sin(t*0.7)*0.08);
  c.pose(P.kingJaw, 0, 0, 0, 0.1 + 0.08*Math.sin(t*1.9) + 0.65*stream + 0.8*streamH + 0.5*summon, 0, 0);
  // the loose tails: they curl in as it coils, then whip out flat and long
  P.tails.forEach((tl, i)=>{
    const wig = Math.sin(t*2.3 + i*1.9)*0.25 + Math.sin(t*5.1 + i)*0.08*s;
    const flick = lashH*Math.sin(t*30 + i)*0.2;
    c.pose(tl, 0, 0.05*lash + 0.04*lashH, 0, -1.1*lash - 0.12*lashH, wig*(1 - lashH) + flick - 0.6*lash + 0.35*lashH, 0, 1, 1, 1 - 0.3*lash + 0.75*lashH);
  });
  // the ones that peel off to become more of it
  if(k.hk === "summon" && c.strike > 0.95 && !(m.peel > 0.9)) m.peel = 1;
  m.peel = Math.max(0, (m.peel || 0) - dt/1.8);
  P.peel.forEach((pg, i)=>{
    const p = m.peel, off = p > 0.6 ? (1 - p)/0.4 : 0, vis = p > 0.6 ? 1 - smooth(0.5, 1, off) : p > 0.25 ? 0 : 1 - p/0.25;
    const v = Math.max(0.001, vis);
    const pa = P.peelA[i];
    c.pose(pg, Math.sin(pa)*1.3*off, -0.45*off*off, Math.cos(pa)*1.3*off, 0.5*off + Math.sin(t*40 + i)*0.12*summon, Math.sin(t*30 + i)*0.4*off, Math.sin(t*25 + i)*0.15*summon, v, v, v);
  });
  return { y:-0.04*Math.abs(Math.sin(ph))*s - 0.35*burrow - 0.5*burrowH, z:0.18*streamH - 0.05*stream, rx:0.03*s - 0.1*fl, rz:0, sx:1, sy:1, sz:1 };
};

})();
