/* ------------------------------------------------------------------ *
 *  Rigs of their own (see Models.MOVES in models.js for the moves).
 *  The weird lairs: the Leech Mother, the Many-Eyed, the Moth-Widow.
 *  Each is built at its full size in the game (the view doesn't scale a
 *  lair's own rig up the way it scales a borrowed one).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, P, rig, group, glow, halo, finish, bsBlob, bsPaint, bsN, bsLathe, bsCloth, bsTaper, bsEyeball, smooth } = H;
const C1 = new THREE.Color(), C2 = new THREE.Color();
const hash = (a, b)=>{ const h = Math.sin(a*127.1 + b*311.7)*43758.5453; return h - Math.floor(h); };

/* a strike of its own length: m.struck starts it, kind remembered. a: out at
   once, held a moment, eased back, with an overshoot that rings out */
function lash(c, dur){
  const m = c.m;
  if(m.struck){ m.L = 1; m.LK = c.kind; }
  m.L = Math.max(0, (m.L || 0) - c.dt/dur);
  if(!m.L) return { a:0, u:1, k:m.LK, on:false };
  const u = 1 - m.L, out = Math.sin(Math.min(1, u/0.14)*PI/2), back = 1 - smooth(0.3, 1, u);
  return { a:out*back + Math.sin(u*PI*5)*0.16*(1 - u)*out, u, k:m.LK, on:true };
}
/* the kind of move under way: the wind-up's, else the strike's while it plays */
const kindOf = (c, L)=> c.tell >= 0 ? c.kind : L.on ? L.k : null;

/* ================================================================== *
 *  The Leech Mother: a leech the size of a well, rearing out of the floor.
 *  Ringed olive-black hide, dull ochre spots down the back, a lamprey's
 *  sucker for a head with rows of hooked teeth turned in, her young
 *  clinging all down her, egg sacs swollen at her sides.
 * ================================================================== */
const LM = { hide:0x23251a, hide2:0x0e100a, belly:0x4a4734, spot:0x6a5632, lip:0x4a2a26, gum:0x3a1012, tooth:0xb8a882, sac:0x8a8462 };
function leechSeg(r0, r1, len, seed){
  // a stretch of ringed body: shallow creases every few inches, flattened front to back
  const pts = [], n = 30;
  for(let k=0;k<=n;k++){
    const t = k/n, y = -0.04 + t*(len + 0.08), r = r0 + (r1 - r0)*t;
    const crease = Math.pow(Math.abs(Math.sin(t*PI*4)), 0.4);
    pts.push(new THREE.Vector2(r*(0.94 + 0.06*crease), y));
  }
  const g = new THREE.LatheGeometry(pts, 30);
  g.scale(1.12, 1, 0.88);
  K.sculpt(g, 0.012, 9, seed);
  return K.paint(g, LM.hide, (c, x, y, z)=>{
    const ph = Math.atan2(x, z), back = Math.abs(ph) > 2.1, crease = Math.abs(Math.sin((y + 0.04)/(len + 0.08)*PI*4));
    if(Math.abs(ph) < 0.9) c.lerp(C1.setHex(LM.belly), 0.55*(1 - Math.abs(ph)/0.9));
    if(crease < 0.22) c.lerp(C1.setHex(LM.hide2), 0.7);
    // two dotted ochre bands down the back, and a third broken one between
    const d1 = Math.abs(Math.abs(ph) - 2.55), dot = Math.sin(y*38 + seed)*Math.sin(ph*9);
    if(back && d1 < 0.16 && dot > -0.2) c.lerp(C1.setHex(LM.spot), 0.75);
    if(Math.abs(ph) > 3.0 && Math.sin(y*22 + seed*3) > 0.4) c.lerp(C1.setHex(LM.spot), 0.45);
    if(bsN(x*3, y*3, z*3, 3, seed) > 0.5) c.lerp(C1.setHex(0x3a3a24), 0.4);
  });
}
/* a young one, curled along the hide, mouth fastened on */
function leechling(parent, r, ang, y0, len, seed, bend){
  const pts = [];
  for(let k=0;k<5;k++){ const t = k/4, a = ang + Math.sin(t*PI)*(bend || 0.4) + t*0.25, rr = r + 0.035 + Math.sin(t*PI)*0.02;
    pts.push([Math.sin(a)*rr*1.12, y0 + t*len, Math.cos(a)*rr*0.88]); }
  const g = bsTaper(pts, 0.05, 0.03, 10, 8);
  P(parent, K.paint(g, 0x1c1d14, (c, x, y, z)=>{ if(Math.sin(y*80 + seed) > 0.6) c.lerp(C1.setHex(0x3a3420), 0.6); }), 0xffffff);
  P(parent, S(0.042, 10, 8), 0x2a2418, pts[4][0], pts[4][1], pts[4][2], 0, 0, 0, 1, 0.7, 1);
}
Models.lair_leech = function(){
  const R = rig("lair_leech"), b = R.body; R.size = 1.8;
  // the hole she comes up through: black water, a lip of torn flesh, the floor broken back
  P(b, CY(1.05, 1.05, 0.01, 30), 0x120c0a, 0, 0.005, 0);
  P(b, CY(0.62, 0.62, 0.02, 28), 0x040404, 0, 0.015, 0);
  const lip = K.sculpt(new THREE.TorusGeometry(0.6, 0.12, 12, 40), 0.03, 7, 3); lip.rotateX(PI/2); lip.scale(1, 0.55, 1);
  P(b, bsPaint(lip, 0x2a2a1c, 0x14140c, 6, 2), 0xffffff, 0, 0.04, 0);
  // flagstones heaved up and broken back from the hole, none of them the same
  for(let i=0;i<9;i++){ const a = i/9*PI*2 + 0.3 + (hash(i, 1) - 0.5)*0.5, d = 0.82 + hash(i, 2)*0.3, w = 0.22 + hash(i, 3)*0.22, dp = 0.16 + hash(i, 4)*0.14;
    P(b, bsPaint(K.sculpt(new THREE.BoxGeometry(w, 0.07 + hash(i, 5)*0.06, dp, 3, 2, 3), 0.02, 9, i), 0x5a5650, 0x2e2c28, 8, i), 0xffffff, Math.cos(a)*d, 0.03, Math.sin(a)*d, 0.45*(hash(i, 6) - 0.5), -a + (hash(i, 7) - 0.5)*0.8, 0.25 + 0.3*hash(i, 8)); }
  // her young, loose on the floor round the hole
  [[0.95, 0.4], [-0.8, -0.7], [0.3, -1.05]].forEach(([x, z], i)=>{
    const a = i*2.1, pts = [0, 1, 2, 3].map(k=> [x + Math.cos(a + k*0.5)*k*0.09, 0.05, z + Math.sin(a + k*0.5)*k*0.09]);
    P(b, bsTaper(pts, 0.045, 0.03, 8, 8), 0x1a1a12);
  });
  // the body: eight ringed lengths, each hung off the last, so she can writhe
  const root = group(b, 0, 0, 0), segs = [], skins = []; let parent = root;
  const N = 8, L = 0.34;
  const rad = i=> 0.44 - i*0.021;
  for(let i=0;i<N;i++){
    const g = group(parent, 0, i ? L : -0.05, 0); segs.push(g);
    g.rotation.x = [0.0, -0.08, -0.06, 0.02, 0.1, 0.16, 0.2, 0.22][i];
    g.rotation.z = [0, 0.05, 0.04, -0.03, -0.05, -0.02, 0.03, 0.02][i];
    const sk = group(g, 0, 0, 0); skins.push(sk);
    P(sk, leechSeg(rad(i), rad(i + 1), L, i*1.7 + 1), 0xffffff);
    parent = g;
  }
  // her young, clinging all the way up
  [[1, 1.9, 0.05, 0.3], [2, -2.4, 0.12, 0.28], [3, 0.6, 0.0, 0.32], [4, 2.8, 0.1, 0.26], [5, -1.0, 0.05, 0.3], [6, 2.2, 0.0, 0.24], [2, 0.9, 0.2, 0.22]].forEach(([i, a, y, l], k)=>
    leechling(skins[i], rad(i)*0.98, a, y, l, k*3.3, k % 2 ? 0.5 : -0.4));
  // egg sacs swollen at her sides: pale, veined, something curled in each glowing through
  const sacs = [];
  [[2, 1.45, 0.12, 0.2], [2, 1.75, 0.0, 0.15], [3, 1.3, 0.05, 0.13], [5, -1.5, 0.1, 0.17], [5, -1.85, 0.0, 0.13], [4, -1.4, 0.2, 0.12]].forEach(([i, a, y, r], k)=>{
    const rr = rad(i)*1.02 + r*0.55, x = Math.sin(a)*rr*1.12, z = Math.cos(a)*rr*0.88;
    const sg = group(skins[i], x, y + 0.12, z); sacs.push(sg);
    const sac = bsBlob(r, 1, 1.15, 0.95, r*0.08, 9, k + 2, 20, 14);
    bsPaint(sac, LM.sac, 0x5a5238, 14, k, (c, X, Y, Z)=>{ if(Math.abs(bsN(X*4, Y*4, Z*4, 3, k)) < 0.06) c.lerp(C1.setHex(0x6a2418), 0.8); });
    P(sg, sac, 0xffffff);
    const em = glow(R, sg, r*0.28, 0xb88a3a, Math.sin(a)*r*0.75, 0, Math.cos(a)*r*0.6); em.scale.set(1, 0.7, 1);
    halo(R, sg, 0xa87a2a, r*3.2, Math.sin(a)*r*0.9, 0, Math.cos(a)*r*0.8, 0.22);
  });
  // the head: a sucker, a cup of rubbery lip opening forward and up, rows of hooked teeth turned in
  const head = group(segs[N - 1], 0, L, 0.02); head.rotation.x = 0.55;
  P(head, leechSeg(rad(N), 0.33, 0.14, 21), 0xffffff, 0, -0.02, 0);
  const mouth = group(head, 0, 0.12, 0);
  mouth.scale.setScalar(1.25);
  const cup = bsLathe([[0.31, 0.0], [0.37, 0.07], [0.44, 0.15], [0.47, 0.2]], 40);
  P(mouth, bsPaint(K.sculpt(cup, 0.012, 11, 4), LM.lip, 0x1a1210, 9, 2), 0xffffff);
  const inner = bsLathe([[0.04, -0.02], [0.2, 0.0], [0.33, 0.07], [0.45, 0.19]], 40, 0, true);
  P(mouth, bsPaint(inner, LM.gum, 0x1a0606, 14, 3), 0xffffff);
  P(mouth, CY(0.12, 0.12, 0.02, 20), 0x020202, 0, -0.01, 0);
  const rim = K.sculpt(new THREE.TorusGeometry(0.46, 0.045, 10, 48), 0.012, 14, 7); rim.rotateX(PI/2);
  P(mouth, bsPaint(rim, 0x5a3a30, 0x2a1a16, 12, 1), 0xffffff, 0, 0.2, 0);
  const rows = [];
  [[0.4, 0.165, 22, 0.075], [0.31, 0.09, 18, 0.06], [0.22, 0.04, 14, 0.05], [0.14, 0.01, 9, 0.04]].forEach(([r, y, n, h], j)=>{
    const tg = group(mouth, 0, 0, 0); rows.push(tg);
    for(let i=0;i<n;i++){ const a = i/n*PI*2 + j*0.4;
      // hooked: leaning in toward the throat, tips bent down
      P(tg, K.shard(h, h*0.22, 0.6, 5, i + j*31), j ? LM.tooth : 0xc8b894, Math.cos(a)*r, y, Math.sin(a)*r, 0, -a + PI/2, -0.9 - j*0.15); }
  });
  R.parts = { segs, skins, head, mouth, rows, sacs, root };
  R.h = 2.9; return finish(R);
};
Models.FAMILY.lair_leech = "tent";
Models.MOVES.lair_leech = c=>{
  const { m, P, t, dt, wind, fl, fit, breath, shake } = c, N = P.segs.length;
  const L = lash(c, 0.75), kind = kindOf(c, L);
  const swipe = kind === "swipe" || kind === "stab", bub = !swipe && kind !== null;
  const w = c.tell >= 0 ? wind : 0, a = L.a;
  // a slow bulge rides up her (how a leech moves), and the whole length writhes
  P.segs.forEach((g, i)=>{
    const k = i/(N - 1), wv = 0.4 + k;
    const bulge = Math.pow(Math.max(0, Math.sin(t*2.1 - i*0.8)), 6) + 0.25*fit*Math.max(0, Math.sin(t*9 - i));
    let rx = Math.sin(t*1.2 - i*0.55)*0.045*wv + Math.sin(t*0.5 + i)*0.02;
    let rz = Math.sin(t*1.6 - i*0.62)*0.07*wv + (fit > 0 ? Math.sin(t*23 + i)*0.04*fit : 0);
    let sy = 1, sxz = 1 + 0.09*bulge + 0.015*breath;
    if(swipe){
      // she rears back, the top curling over behind her, mouth gaping; then lashes down onto you
      rx += w*(k < 0.5 ? -0.12 : -0.24 + (k - 0.5)*0.3) + shake*3*k;
      rx += a*(k < 0.35 ? 0.05 : 0.17 + 0.12*k);
      rz *= 1 - 0.7*Math.max(w, a);
    } else if(bub){
      // coiled down tight under the floor, then up all at once, too tall, and settling
      rx += w*0.16*Math.sin(i*1.9) + shake*2;
      rz += w*0.12*Math.cos(i*1.6);
      sy = 1 - 0.25*w + 0.12*a;
      sxz *= 1 + 0.1*w - 0.05*a;
    }
    rx -= 0.18*fl*k;
    c.pose(g, 0, i ? (sy - 1)*0.34 : 0, 0, rx, 0, rz);
    c.pose(P.skins[i], 0, 0, 0, 0, 0, 0, sxz, sy, sxz);
  });
  // the sucker: it works open and shut on its own; a wind-up gapes it; a lash snaps it shut on you
  const idleOpen = 0.25 + 0.15*Math.sin(t*0.9) + 0.25*fit;
  let open = idleOpen + w*1.0;
  if(L.on) open = swipe ? Math.max(0, 1.2 - a*1.6) + (1 - smooth(0.4, 1, L.u))*0 : 1.25 - 0.6*L.u;
  open = Math.max(0.05, open);
  c.pose(P.mouth, 0, 0, 0, 0, 0, 0, 0.72 + 0.4*open, 1 + 0.15*open, 0.72 + 0.4*open);
  P.rows.forEach((g, j)=> c.pose(g, 0, 0.01*open, 0, 0, t*(j % 2 ? -0.25 : 0.2)*(1 + 3*w) + (j % 2 ? -1 : 1)*open*0.08, 0, 1 - 0.08*open*j, 1 + 0.25*open, 1 - 0.08*open*j));
  c.pose(P.head, 0, 0, 0, -0.35*w*(swipe ? 1 : 0.4) + (swipe ? 0.25*a : -0.2*a) + Math.sin(t*1.4)*0.05, Math.sin(t*0.7)*0.15, 0);
  // the egg sacs swell with her breath, and something in them turns over now and then
  P.sacs.forEach((g, i)=>{ const q = 1 + 0.06*Math.sin(t*1.3 + i*2) + 0.08*w; c.pose(g, 0, 0, 0, 0, 0, Math.sin(t*0.8 + i)*0.08, q, q*(1 + 0.04*Math.sin(t*3 + i)), q); });
  return { y:0, z:swipe ? -0.12*w + 0.18*a : 0, rx:0, rz:0 };
};

/* ================================================================== *
 *  The Many-Eyed: a knot of grey flesh hanging in the air, crowded with
 *  eyes (big and small, sunk in folds or out on stalks), each looking its
 *  own way, all of them weeping. Torn membranes and nerves hang under it.
 *  When it glares, every eye turns on you at once.
 * ================================================================== */
const ME = { fl:0x4e4842, fl2:0x1e1a1a, bruise:0x3a2834, wet:0x6a1a1e, mem:0x5a4440, mem2:0x2a1a1a, nerve:0x6a4a44 };
const fwdOf = (g)=>{
  // which way (yaw, pitch, in g's own frame) is straight ahead for the knot
  const q = new THREE.Quaternion(); let o = g; q.identity();
  const chain = []; while(o && !o.userData.knot){ chain.unshift(o); o = o.parent; }
  chain.forEach(n=> q.multiply(n.quaternion));
  const d = new THREE.Vector3(0, 0, 1).applyQuaternion(q.invert());
  return { yaw:Math.atan2(d.x, d.z), pitch:-Math.asin(Math.max(-1, Math.min(1, d.y))) };
};
Models.lair_manyeyed = function(){
  const R = rig("lair_manyeyed"), b = R.body; R.size = 1.85;
  const float = group(b, 0, 1.75, 0); R.parts.head = float;
  const knot = group(float, 0, 0, 0); knot.userData.knot = true;
  const paint = (g, s)=> bsPaint(g, ME.fl, ME.fl2, 3.5, s, (c, x, y, z)=>{
    if(bsN(x, y, z, 2.2, s + 3) > 0.45) c.lerp(C1.setHex(ME.bruise), 0.6);
    if(Math.abs(bsN(x, y, z, 5, s + 1)) < 0.04) c.lerp(C1.setHex(ME.wet), 0.8);
    if(y < -0.2) c.multiplyScalar(0.75 + Math.max(0, y + 0.6)*0.6);
  });
  // the knot: several lumps grown into each other, folded and creased
  const lumps = [[0, 0, 0, 0.6, 1.05, 0.92, 0.95], [0.28, 0.12, -0.38, 0.28, 1, 1, 0.9], [-0.3, 0.05, -0.36, 0.3, 1, 0.9, 1], [0.05, -0.32, -0.3, 0.3, 1.1, 0.85, 1], [0, 0.3, -0.36, 0.24, 1, 1, 1]];
  const inside = (x, y, z, skip)=> Math.min(...lumps.map(([lx, ly, lz, r, sx, sy, sz], j)=> j === skip ? 9 : Math.pow((x - lx)/(r*sx), 2) + Math.pow((y - ly)/(r*sy), 2) + Math.pow((z - lz)/(r*sz), 2)));
  lumps.forEach(([x, y, z, r, sx, sy, sz], i)=>{
    const g = paint(bsBlob(r, sx, sy, sz, r*0.06, 1.6/r, i*1.3 + 1, i ? 18 : 28, i ? 14 : 22), i);
    // where one lump has grown into the next: a deep wet seam
    const a = g.attributes.position, col = g.attributes.color;
    for(let k=0;k<a.count;k++){ const d = inside(a.getX(k) + x, a.getY(k) + y, a.getZ(k) + z, i);
      if(d < 1.5){ const q = Math.min(1, (1.5 - d)*1.4); col.setXYZ(k, col.getX(k)*(1 - q) + 0.2*q, col.getY(k)*(1 - q) + 0.04*q, col.getZ(k)*(1 - q) + 0.05*q); } }
    P(knot, g, 0xffffff, x, y, z);
  });
  // how far out the knot's skin is, going out from the middle along v
  const skin = v=>{ for(let t=1.3;t>0;t-=0.01){ const x = v.x*t, y = v.y*t, z = v.z*t;
    if(lumps.some(([lx, ly, lz, r, sx, sy, sz])=> Math.pow((x - lx)/(r*sx), 2) + Math.pow((y - ly)/(r*sy), 2) + Math.pow((z - lz)/(r*sz), 2) < 0.92)) return t; } return 0.5; };
  // veins standing up out of it, dark and swollen, wandering between the eyes
  for(let i=0;i<11;i++){
    const a0 = hash(i, 11)*PI*2, e0 = (hash(i, 12) - 0.4)*1.4, da = (hash(i, 13) - 0.5)*1.6, de = (hash(i, 14) - 0.5)*1.2, pts = [];
    for(let k=0;k<6;k++){ const u = k/5, a = a0 + da*u + Math.sin(u*6 + i)*0.12, el = e0 + de*u;
      const d = new THREE.Vector3(Math.sin(a)*Math.cos(el), Math.sin(el), Math.cos(a)*Math.cos(el)), t = skin(d) + 0.012; pts.push([d.x*t, d.y*t, d.z*t]); }
    P(knot, bsTaper(pts, 0.022 - (i % 3)*0.005, 0.008, 12, 6), i % 3 ? 0x3a1a26 : 0x5a1a1e);
  }
  // the eyes: where on the knot, how big, how far out on a stalk
  const eyes = [], tears = [];
  const spec = [
    [0.0, 0.05, 1, 0.27, 0], [-0.48, 0.32, 0.8, 0.15, 0], [0.5, 0.3, 0.78, 0.14, 0], [0.28, -0.42, 0.85, 0.13, 0], [-0.3, -0.35, 0.88, 0.12, 0], [0.0, 0.58, 0.8, 0.11, 0],
    [-0.74, -0.05, 0.65, 0.1, 0], [0.76, -0.1, 0.62, 0.11, 0], [0.45, 0.02, 0.92, 0.075, 0], [-0.42, 0.05, 0.93, 0.07, 0],
    [0.28, 0.92, 0.25, 0.14, 0], [-0.32, 0.88, 0.18, 0.12, 0],
    [0.55, 0.8, -0.1, 0.09, 0.4], [-0.6, 0.72, -0.05, 0.1, 0.34], [0.9, 0.25, 0.1, 0.08, 0.36], [-0.9, 0.2, 0.05, 0.08, 0.42], [0.1, 0.95, -0.45, 0.075, 0.48],
    [0.6, -0.6, 0.3, 0.07, 0.3],
    [-0.6, 0.1, -0.75, 0.1, 0], [0, 0.25, -1, 0.11, 0]
  ];
  const v = new THREE.Vector3(), IRIS = [0x8a6a1a, 0x7a2a1a, 0x5a6a5a, 0x9a7a3a];
  spec.forEach(([x, y, z, r, stalk], i)=>{
    v.set(x, y + (z > 0.3 && !stalk ? 0.35 : 0), z).normalize();
    const base = v.clone().multiplyScalar(skin(v) - (stalk ? 0.03 : r*0.25));
    const g = group(knot, base.x, base.y, base.z); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), v);
    let eg;
    if(stalk){
      // out on a stalk: a grey, wrinkled thing that bends under the eye's weight
      const pts = [[0, 0, -0.02], [Math.sin(i)*0.04, Math.cos(i*2)*0.03, stalk*0.45], [Math.sin(i*3)*0.05, -0.04, stalk*0.8], [0, 0, stalk]];
      P(g, bsPaint(bsTaper(pts, 0.055, 0.03, 10, 8), ME.fl, ME.fl2, 12, i), 0xffffff);
      P(g, bsPaint(bsBlob(r*1.15, 1, 1, 0.8, r*0.08, 9, i, 14, 10), ME.fl, 0x3a2a2a, 10, i), 0xffffff, 0, 0, stalk - r*0.35);
      eg = group(g, 0, 0, stalk + r*0.3);
    } else {
      // sunk in a fold: a raw wet socket round it, a heavy lid that blinks
      const sock = K.sculpt(new THREE.TorusGeometry(r*1.02, r*0.28, 6, 18), r*0.05, 6/r*0.2, i);
      P(g, bsPaint(sock, 0x4a3a36, ME.wet, 10, i), 0xffffff, 0, 0, r*0.2);
      eg = group(g, 0, 0, 0);
    }
    bsEyeball(R, eg, r, IRIS[i % IRIS.length], i*1.7 + 2);
    eg.children[0].material.color.setHex(0xb0948a);
    const pin = glow(R, eg, r*0.09, 0xff6a3a, 0, 0, r*1.02);
    const hl = halo(R, eg, 0xff5a2a, r*3.2, 0, 0, r*1.1, 0.0);
    let lid = null;
    if(!stalk){
      lid = group(g, 0, 0, 0);
      const sh = new THREE.SphereGeometry(r*1.12, 14, 6, 0, PI*2, 0, PI*0.5); K.sculpt(sh, r*0.05, 8/r*0.15, i + 9);
      P(lid, bsPaint(sh, ME.fl, ME.wet, 6/r*0.1, i, (c, X, Y)=>{ if(Y < r*0.25) c.lerp(C1.setHex(0x5a2a2a), 0.6); }), 0xffffff);
      lid.rotation.x = -0.95;
    }
    // where its tears run: a dark wet track down from the lower lid, and a drop that slides it
    if(!stalk && z > 0.3 && i < 6){
      const tp = [[0, -r*0.9, r*0.7], [0.01, -r*1.8, r*0.5], [-0.01, -r*3.2, r*0.2]];
      P(g, bsTaper(tp, r*0.09, r*0.03, 6, 6), 0x2a0e0c);
      const d = glow(R, g, r*0.1, 0xa8b4a8, tp[0][0], tp[0][1], tp[0][2]); d.scale.set(1, 1.6, 1);
      tears.push({ m:d, p:tp, ph:i*0.37 });
    }
    eyes.push({ g, eg, pin, hl, lid, r, stalk, ty:0, tx:0, y:{ x:0, v:0 }, x:{ x:0, v:0 }, timer:hash(i, 3)*2, blink:0, nextBlink:2 + hash(i, 7)*6 });
  });
  // torn membranes hanging under it in strips, and the nerves it tore loose from
  const flaps = [];
  [[0.3, 0.5, 0.0, 1, 0.75], [1.9, 0.44, 0.15, 2, 0.6], [3.4, 0.5, -0.1, 3, 0.85], [4.9, 0.42, 0.1, 4, 0.55]].forEach(([ry, rr, tilt, s, len], i)=>{
    const g = group(knot, 0, -0.32, 0); g.rotation.set(tilt, ry, 0); flaps.push(g);
    const prof = [[rr*0.75, 0.05], [rr, -0.2], [rr*1.02, -0.3 - len*0.4], [rr*0.9, -0.3 - len*0.6]];
    P(g, bsPaint(K.tatter(bsLathe(prof, 26, 2.45), -0.2, 13, 0.55 + len*0.3, s*2.3), ME.mem, ME.mem2, 6, s), 0xffffff);
    P(g, K.tatter(bsLathe(prof.map(q=> [q[0]*0.97, q[1]]), 26, 2.45, true), -0.2, 13, 0.55 + len*0.3, s*2.3), ME.mem2);
  });
  const nerves = group(knot, 0, -0.35, 0);
  for(let i=0;i<9;i++){
    const a = i/9*PI*2 + 0.4, d0 = 0.12 + (i % 3)*0.1, l = 0.6 + (i % 4)*0.22, x0 = Math.cos(a)*d0, z0 = Math.sin(a)*d0;
    const pts = [[x0, 0, z0], [x0*1.4, -0.3, z0*1.3], [x0*1.2 + Math.sin(i)*0.08, -0.6*l, z0*1.2], [x0*1.5, -l, z0*1.4 + 0.03]];
    P(nerves, bsTaper(pts, 0.03 - (i % 3)*0.006, 0.008, 10, 6), i % 2 ? ME.nerve : 0x5a3a36);
    P(nerves, S(0.025, 8, 6), 0x8a6a5a, pts[3][0], pts[3][1], pts[3][2]);
    if(i % 3 === 0) P(nerves, S(0.035, 8, 6), 0x6a3a3a, pts[1][0], pts[1][1], pts[1][2]);
  }
  R.parts.knot = knot; R.parts.eyes = eyes; R.parts.tears = tears; R.parts.flaps = flaps; R.parts.nerves = nerves;
  finish(R);
  // straight ahead, in each eye's own frame (for the glare)
  float.updateMatrixWorld(true);
  eyes.forEach(e=>{ const f = fwdOf(e.eg); e.fy = Math.max(-1.25, Math.min(1.25, f.yaw)); e.fx = Math.max(-1.1, Math.min(1.1, f.pitch));
    const gf = fwdOf(e.g); e.gy = Math.max(-0.8, Math.min(0.8, gf.yaw)); e.gx = Math.max(-0.8, Math.min(0.8, gf.pitch)); });
  R.h = 2.6; return R;
};
Models.FAMILY.lair_manyeyed = "watcher";
Models.MOVES.lair_manyeyed = c=>{
  const { m, P, t, dt, wind, fl, fit, breath, shake } = c;
  const L = lash(c, 0.6), kind = kindOf(c, L), w = c.tell >= 0 ? wind : 0, a = L.a;
  const glare = w > 0 || L.on;
  // it hangs and turns slowly, the knot beating like a heart that's lost its rhythm
  const beat = Math.pow(Math.max(0, Math.sin(t*2.0)), 10) + 0.6*Math.pow(Math.max(0, Math.sin(t*2.0 - 0.45)), 10);
  const sw = 1 + 0.04*beat + 0.12*w - 0.08*a + 0.02*breath;
  c.pose(P.knot, 0, 0, 0, Math.sin(t*0.37)*0.12*(1 - w), Math.sin(t*0.23)*0.35*(1 - w), Math.sin(t*0.51)*0.08 + shake*2, sw*(1 + 0.03*Math.sin(t*3.1)), sw, sw);
  // every eye its own: a new place to look every so often, reached in a snap; on the glare, all of them on you
  P.eyes.forEach((e, i)=>{
    e.timer -= dt;
    if(e.timer <= 0){ e.timer = 0.25 + hash(i, t)*1.6; e.ty = (hash(t, i) - 0.5)*1.6; e.tx = (hash(i*3, t) - 0.5)*1.0; }
    const ty = glare ? e.fy : e.ty, tx = glare ? e.fx : e.tx, k = glare ? 1400 : 700;
    H.spring(e.y, ty, k, 45, dt); H.spring(e.x, tx, k, 45, dt);
    c.pose(e.eg, 0, 0, 0, e.x.x, e.y.x, 0);
    // stalks swing round to point it, and droop and sway when they don't
    if(e.stalk) c.pose(e.g, 0, 0, 0, (glare ? e.gx*0.8 : Math.sin(t*0.9 + i*1.7)*0.18) - 0.2*a, (glare ? e.gy*0.8 : Math.sin(t*0.7 + i)*0.22), 0);
    // blinks, one eye at a time; on the glare every lid goes back as far as it will
    e.nextBlink -= dt; if(e.nextBlink <= 0){ e.blink = 0.18; e.nextBlink = 1.5 + hash(i, t*7)*5; }
    if(e.blink > 0) e.blink -= dt;
    const shut = e.blink > 0 ? Math.sin((1 - e.blink/0.18)*PI) : 0;
    if(e.lid) c.pose(e.lid, 0, 0, 0, 1.95*shut*(1 - w) - 0.25*w + 1.2*a*(1 - L.u) + 0.7*fl, 0, 0);
    // the pinprick in each pupil burns up through the wind-up
    const hot = w*w + a*0.5;
    e.pin.scale.setScalar(1 + 1.6*hot);
    if(e.hl.material) e.hl.material.opacity = 0.03 + 0.32*hot;
    e.hl.scale.setScalar(e.r*2.6*(1 + 0.9*hot));
  });
  // it weeps, all the time
  P.tears.forEach(d=>{
    const u = ((t*0.35 + d.ph) % 1), p0 = d.p[0], p1 = d.p[2];
    d.m.position.set(p0[0] + (p1[0] - p0[0])*u, p0[1] + (p1[1] - p0[1])*u, p0[2] + (p1[2] - p0[2])*u);
    d.m.scale.set(1 - 0.5*u, 1.6 - 0.6*u, 1 - 0.5*u);
  });
  P.flaps.forEach((g, i)=> c.pose(g, 0, 0, 0, Math.sin(t*1.1 + i*2)*0.08 + 0.18*c.s + 0.15*a, 0, Math.sin(t*0.8 + i)*0.06));
  c.pose(P.nerves, 0, 0, 0, Math.sin(t*0.9)*0.1 + 0.25*c.s + 0.2*a, 0, Math.sin(t*0.63)*0.1);
  // the glare: it rises and draws back, swelling; the release throws it back on itself
  return { y:Math.sin(t*1.1)*0.08 + 0.12*w - 0.05*a, z:-0.08*w - 0.3*a, rx:-0.12*w - 0.35*a - 0.2*fl + 0.12*c.s, rz:Math.sin(t*0.7)*0.04 };
};

/* ================================================================== *
 *  The Moth-Widow: a widow in mourning with a moth's body. Wings as wide as
 *  the room, ash and dust with eyes on them gone pale; a black veil over a
 *  face that isn't there, only a blank of grey fur; feathered antennae up
 *  through the veil; arms of too many joints; a long ringed gown hanging
 *  like an abdomen, in tatters.
 * ================================================================== */
const MW = { dust:0x8a7e6a, dust2:0x4a4236, vein:0x2e2820, fur:0xa89a84, fur2:0x6a5e50, veil:0x141216, veil2:0x2a262a, skin:0x4a443e, gown:0x3a3230, gown2:0x1a1616 };
/* a wing: a sheet lying flat, along +x (the span) with the chord running back (-z);
   torn at the trailing edge and holed; an eye-spot gone pale. Both faces, the
   upper one the paler */
function wingGeo(len, chord, seed, hind){
  const nu = 26, nv = 14, pos = [], col = [], idx = [];
  const at = (u, v)=>{
    const cu = chord*(hind ? 0.55 + 0.45*Math.sin(Math.min(1, u*1.25)*PI*0.62) : 0.36 + 0.64*Math.sin(Math.min(1, u*1.05)*PI*0.6));
    const rag = v > 0.7 ? (hash(Math.floor(u*nu*0.6), seed) - 0.5)*0.35*(v - 0.7)/0.3 : 0;
    const vv = v*(1 + rag);
    const x = u*len*(1 - (hind ? 0.35 : 0.22)*vv*vv) + (hind ? 0 : 0.06*vv*u*len);
    const y = -vv*cu - (hind ? 0.1 : 0.04)*u*u*len;
    const z = -0.05*Math.sin(vv*PI)*u + 0.06*u*u - 0.02*Math.sin(u*14 + seed)*vv;
    return [x, y, z, vv];
  };
  const c = new THREE.Color(), base = new THREE.Color(MW.dust), dk = new THREE.Color(MW.dust2), vn = new THREE.Color(MW.vein), pale = new THREE.Color(0xb4a88e), rust = new THREE.Color(0x6a3a26);
  const eu = hind ? 0.55 : 0.62, ev = hind ? 0.45 : 0.5, er = hind ? 0.17 : 0.13;
  for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){
    const u = i/nu, v = j/nv, [x, y, z, vv] = at(u, v);
    pos.push(x, y, z);
    c.copy(base).lerp(dk, Math.max(0, 0.5 - u)*0.9);
    if(bsN(u*3, v*3, seed, 4, seed) > 0.35) c.lerp(dk, 0.35);
    // veins: running out from the root
    const ang = Math.atan2(vv, u + 0.08)*7;
    if(Math.abs(Math.sin(ang*PI*0.5)) < 0.08 && u > 0.1) c.lerp(vn, 0.65);
    // the eye-spot: dark ring, pale ring, a dull centre
    const d = Math.hypot((u - eu)*len/chord, (vv - ev))/er;
    if(d < 1.3){ if(d < 0.35) c.lerp(hind ? rust : vn, 0.8); else if(d < 0.7) c.lerp(pale, 0.55); else if(d < 1.05) c.lerp(vn, 0.7); }
    // a dark band near the outer edge, and the edge itself frayed paler
    if(u > 0.82 && u < 0.9) c.lerp(dk, 0.4);
    if(vv > 0.92 || u > 0.97) c.lerp(pale, 0.3);
    col.push(c.r, c.g, c.b);
  }
  const W = nu + 1;
  for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){
    const u = (i + 0.5)/nu, v = (j + 0.5)/nv;
    // holes eaten through it, mostly toward the trailing edge and the tip
    if(v > 0.35 && hash(i*0.37 + seed, j*0.71) > 0.97 - 0.08*v*u) continue;
    const a = j*W + i, b = a + 1, cc = a + W, d = cc + 1;
    idx.push(a, cc, b, b, cc, d);
  }
  const n = pos.length/3, P2 = pos.slice(), C2a = col.slice(), I2 = idx.slice();
  // the back face: same sheet a hair behind, wound the other way, a little darker
  for(let i=0;i<n;i++){ P2.push(pos[i*3], pos[i*3 + 1], pos[i*3 + 2] - 0.004); C2a.push(col[i*3], col[i*3 + 1], col[i*3 + 2]); C2a[i*3] *= 0.75; C2a[i*3 + 1] *= 0.75; C2a[i*3 + 2] *= 0.75; }
  for(let k=0;k<idx.length;k+=3) I2.push(idx[k] + n, idx[k + 2] + n, idx[k + 1] + n);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P2, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(C2a, 3));
  g.setIndex(I2); g.rotateX(PI/2); g.computeVertexNormals();
  return g;
}
/* a feathered antenna: a curved shaft with a comb of barbs down both sides */
function antenna(parent, s){
  const pts = [[0, 0, 0], [s*0.06, 0.22, 0.04], [s*0.18, 0.46, -0.02], [s*0.3, 0.6, -0.14]];
  P(parent, bsTaper(pts, 0.012, 0.005, 12, 6), 0x8a7a62);
  const curve = new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(p[0], p[1], p[2])));
  const q = new THREE.Vector3(), tg = new THREE.Vector3();
  for(let i=2;i<22;i++){
    const u = i/22; curve.getPointAt(u, q); curve.getTangentAt(u, tg);
    const len = 0.1*Math.sin(u*PI)*(1.1 - u*0.4) + 0.015;
    [-1, 1].forEach(side=>{
      // barbs fan out sideways off the shaft and sweep a little forward
      P(parent, CO(0.004, len, 3), 0xb8a888, q.x + side*len*0.45, q.y + len*0.1, q.z + 0.012, 0.3, 0, -side*(PI/2 - 0.35));
    });
  }
}
Models.lair_mothwidow = function(){
  const R = rig("lair_mothwidow"), b = R.body; R.size = 2.2;
  const f = group(b, 0, 0.7, 0); R.parts.float = f;
  // the gown: ringed like a moth's abdomen, swollen, hanging into tatters below her
  const gown = group(f, 0, 1.85, 0); R.parts.gown = gown;
  const gp = [[0.17, 0], [0.27, -0.15], [0.37, -0.4], [0.39, -0.65], [0.34, -0.95], [0.27, -1.22], [0.2, -1.45], [0.16, -1.62]];
  const ring = y=> y > -1.2 ? Math.pow(Math.abs(Math.sin((y + 0.08)*PI*3.6)), 3) : 0;
  const go = K.tatter(bsLathe(gp, 40), -1.05, 20, 0.55, 4.4);
  { const a = go.attributes.position; for(let i=0;i<a.count;i++){ const k = 1 - 0.07*ring(a.getY(i)); a.setX(i, a.getX(i)*k); a.setZ(i, a.getZ(i)*k); } go.computeVertexNormals(); }
  bsPaint(go, MW.gown, MW.gown2, 4, 2, (c, x, y, z)=>{ const r = ring(y); if(r < 0.2 && y > -1.2) c.lerp(C1.setHex(0x5a5048), 0.3); if(r > 0.85) c.multiplyScalar(0.85); if(y < -1.1) c.multiplyScalar(0.75); if(bsN(x, y, z, 7, 3) > 0.45) c.lerp(C1.setHex(MW.fur2), 0.35); });
  P(gown, go, 0xffffff);
  P(gown, K.tatter(bsLathe(gp.map(p=> [p[0]*0.97, p[1]]), 40, 0, true), -1.05, 20, 0.55, 4.4), 0x0e0c0c);
  // the bodice, narrow, black, laced up the front
  const bod = bsLathe([[0.17, 1.82], [0.15, 1.95], [0.17, 2.1], [0.2, 2.22], [0.16, 2.3]], 32);
  P(f, bsPaint(bod, MW.veil2, MW.veil, 9, 4), 0xffffff);
  for(let i=0;i<5;i++) P(f, BX(0.07, 0.008, 0.008), 0x5a5048, 0, 1.88 + i*0.07, 0.165 + (i > 2 ? 0.02 : 0), 0, 0, (i % 2 ? 1 : -1)*0.4);
  // a moth's thorax under it: a ruff of grey fur round the shoulders and down the back
  const ruff = group(f, 0, 2.24, 0);
  for(let i=0;i<70;i++){
    const a = i/70*PI*2*1.0 + hash(i, 1)*0.1, row = i % 3, r = 0.2 + row*0.035, y = -row*0.05;
    P(ruff, K.shard(0.12 + hash(i, 2)*0.1, 0.03, 0.4, 4, i), row ? MW.fur : 0x8a7c68, Math.sin(a)*r, y, Math.cos(a)*r*0.85, 0.9 + row*0.25, a, 0);
  }
  // two pairs of small folded forelegs at her breast, like a moth's
  [-1, 1].forEach(s=>[0, 1].forEach(k=>{
    const y = 2.0 - k*0.12, pts = [[s*0.08, y, 0.12], [s*0.16, y - 0.06, 0.2], [s*0.1, y - 0.12, 0.25], [s*0.03, y - 0.1, 0.22]];
    P(f, bsTaper(pts, 0.016, 0.006, 8, 6), MW.skin);
    [1, 2].forEach(j=> P(f, S(0.018, 6, 5), 0x6a6056, pts[j][0], pts[j][1], pts[j][2]));
  }));
  // the head: small, furred, faceless; the veil over it open at the front on a blank
  const head = group(f, 0, 2.44, 0.02); head.scale.setScalar(1.3); R.parts.head = head;
  P(head, bsPaint(bsBlob(0.13, 0.9, 1.1, 0.95, 0.006, 20, 5, 22, 16), 0x9a907e, 0x6a6052, 14, 3), 0xffffff, 0, 0, 0.01);
  P(head, bsPaint(bsBlob(0.1, 0.85, 1.05, 0.6, 0.002, 30, 6, 18, 12), 0xb4ac9a, 0x8a8272, 20, 2), 0xffffff, 0, -0.01, 0.1);
  const hv = [[0.02, 0.17], [0.13, 0.12], [0.17, 0.0], [0.19, -0.14], [0.22, -0.26]];
  bsCloth(head, hv, MW.veil, 0x060606, 0.95, -0.12, 14, 0.12, 3.3, 0, 0, 0);
  // the long veil down her back, to her waist
  const vg = group(head, 0, 0, 0); R.parts.veil = vg;
  bsCloth(vg, [[0.16, 0.12], [0.2, 0.0], [0.25, -0.2], [0.33, -0.55], [0.42, -0.95]], MW.veil, 0x080808, 1.5, -0.6, 16, 0.32, 7.1, 0, 0, -0.04, 0.08, PI, 0);
  // a mourning brooch, a lock of something under glass, the only light on her
  P(f, S(0.03, 10, 8), 0x3a3022, 0, 2.29, 0.17);
  glow(R, f, 0.012, 0xc8b070, 0, 2.29, 0.2);
  // antennae, feathered, up through the veil
  const ant = []; [-1, 1].forEach(s=>{ const g = group(head, s*0.05, 0.13, 0.04); g.rotation.set(-0.2, 0, -s*0.15); antenna(g, s); ant.push(g); });
  R.parts.ant = ant;
  // arms: long, grey, jointed one time too many, fingers like a spider's legs
  const arm = (s)=>{
    const a = group(f, s*0.22, 2.2, 0.0); a.rotation.set(0.25, 0, s*0.35);
    P(a, S(0.05, 10, 8), MW.skin, 0, 0, 0);
    bsCloth(a, [[0.06, 0.02], [0.09, -0.18], [0.12, -0.36]], MW.veil, 0x060606, 0, -0.2, 9, 0.16, s + 4, 0, 0, 0);
    P(a, bsTaper([[0, 0, 0], [0, -0.22, 0.01], [0, -0.42, 0.02]], 0.03, 0.022, 8, 8), MW.skin);
    const e1 = group(a, 0, -0.42, 0.02); e1.rotation.x = -0.5; P(e1, S(0.03, 8, 6), 0x5a5048, 0, 0, 0);
    P(e1, bsTaper([[0, 0, 0], [0, -0.18, 0], [0, -0.32, 0.01]], 0.022, 0.018, 8, 8), MW.skin);
    const e2 = group(e1, 0, -0.32, 0.01); e2.rotation.x = -0.6; P(e2, S(0.024, 8, 6), 0x5a5048, 0, 0, 0);
    P(e2, bsTaper([[0, 0, 0], [0, -0.14, 0], [0, -0.26, 0.01]], 0.018, 0.014, 8, 8), MW.skin);
    const hd = group(e2, 0, -0.26, 0.01); hd.rotation.x = -0.3;
    for(let i=0;i<4;i++){ const sp = (i - 1.5)*0.25;
      const pts = [[0, 0, 0], [Math.sin(sp)*0.06, -0.08, 0.02], [Math.sin(sp)*0.1, -0.18, 0.06], [Math.sin(sp)*0.12, -0.24, 0.12]];
      P(hd, bsTaper(pts, 0.009, 0.004, 8, 5), 0x3a342e); P(hd, S(0.01, 5, 4), 0x5a5048, pts[1][0], pts[1][1], pts[1][2]); }
    return { a, e1, e2, hd };
  };
  R.parts.armR = arm(1).a; R.parts.armL = arm(-1).a;
  R.parts.arms = [R.parts.armR, R.parts.armL].map(a=> ({ a, e1:a.children.find(n=> n.isGroup), }));
  R.parts.arms.forEach(o=>{ o.e2 = o.e1.children.find(n=> n.isGroup); o.hd = o.e2.children.find(n=> n.isGroup); });
  // the wings: forewings long and narrow at the root, hindwings rounder below them
  const wings = [];
  [1, -1].forEach(s=>{
    const fw = group(f, s*0.06, 2.24, -0.14), hw = group(f, s*0.06, 2.1, -0.16);
    fw.scale.x = s; hw.scale.x = s;
    fw.rotation.set(0.12, s*0.3, s*0.3); hw.rotation.set(0.05, s*0.75, s*0.1);
    P(fw, wingGeo(2.15, 1.05, 3 + s, false), 0xffffff);
    P(hw, wingGeo(1.4, 1.05, 7 + s, true), 0xffffff, 0, -0.05, -0.01);
    wings.push({ fw, hw, s });
  });
  R.parts.wings = wings;
  R.h = 3.4; return finish(R);
};
Models.FAMILY.lair_mothwidow = "ghost";
Models.MOVES.lair_mothwidow = c=>{
  const { m, P, t, dt, wind, fl, fit, breath, shake, s } = c;
  const L = lash(c, 0.7), kind = kindOf(c, L), w = c.tell >= 0 ? wind : 0, a = L.a;
  const dust = kind === "dust", dive = kind === "dive" || kind === "charge", summon = kind === "summon" || (kind && !dust && !dive);
  // the wings beat slow and deep while she hangs there, quicker as she moves
  m.wph = (m.wph || 0) + dt*(2.2 + 2.5*s + (dust ? 9*w*w : 0));
  const beat = Math.sin(m.wph), lift = Math.max(0, -Math.cos(m.wph));
  // each pair: [sweep back (y), raise (z)] blended between rest, spread wide, and folded
  // each pair: tilt (x), sweep back (y), raise (z), blended between hanging there, spread wide at you, and folded
  let fz = 0.3*beat, fy = 0.06*Math.sin(m.wph + 0.8), fx = 0.05*beat, hz = 0.22*Math.sin(m.wph - 0.6), hy = 0.05*Math.sin(m.wph + 0.2), hx = 0.04*Math.sin(m.wph - 0.6);
  if(dust){
    // up and spread to face you, every pale eye on them showing; a shudder; then one great downbeat
    const sp = Math.max(w, a > 0 ? 1 - L.u : 0), sh = Math.sin(t*41)*0.06*w*w;
    fx = fx*(1 - sp) + 1.15*sp - 1.3*a + sh; hx = hx*(1 - sp) + 1.0*sp - 1.1*a + sh;
    fy = fy*(1 - sp) - 0.5*sp; hy = hy*(1 - sp) - 0.85*sp;
    fz = fz*(1 - sp) + 0.15*sp + sh - 0.5*a; hz = hz*(1 - sp) - 0.1*sp - 0.4*a;
  } else if(dive){
    // folded back flat along her, a dart
    const fo = Math.max(w, a > 0 ? 1 - L.u*0.8 : 0);
    fy = fy*(1 - fo) + 1.0*fo; hy = hy*(1 - fo) + 0.65*fo; fz = fz*(1 - fo) - 0.35*fo; hz = hz*(1 - fo) - 0.25*fo; fx *= 1 - fo; hx *= 1 - fo;
  } else if(summon){
    // raised high over her like a hood, trembling
    const r2 = Math.max(w, a > 0 ? 1 - L.u : 0), sh = Math.sin(t*33)*0.05*w;
    fz = fz*(1 - r2) + (0.85 + sh)*r2 - 0.5*a; hz = hz*(1 - r2) + 0.5*r2 - 0.4*a;
    fx = fx*(1 - r2) + 0.35*r2; fy *= 1 - r2; hy *= 1 - r2;
  }
  P.wings.forEach(g=>{ c.pose(g.fw, 0, 0, 0, fx + 0.2*fl, g.s*fy, g.s*fz); c.pose(g.hw, 0, 0, 0, hx + 0.2*fl, g.s*hy, g.s*hz); });
  // her arms: hanging, fingers working, until she raises them or spreads them or sweeps them back
  P.arms.forEach((o, i)=>{
    const sd = i ? -1 : 1;
    let rx = Math.sin(t*0.9 + i*2)*0.08 + 0.2*s, rz = 0, e1 = Math.sin(t*1.3 + i)*0.1, e2 = Math.sin(t*1.7 + i*3)*0.12, hd = Math.sin(t*2.3 + i)*0.15;
    if(summon){ rx += -2.6*w + 1.4*a; rz += sd*(0.25*w + 0.5*a); e1 += 0.5*w - 0.4*a; e2 += 0.4*w; hd += -0.6*w + Math.sin(t*30 + i)*0.08*w; }
    if(dust){ rx += -0.9*w - 0.5*a; rz += sd*(0.9*w + 0.3*a); e1 += 0.3*w; hd += 0.4*w; }
    if(dive){ rx += 0.8*w - 0.6*a; rz += sd*0.2*w; e1 += 0.4*w + 0.5*a; e2 += 0.3*w; hd += -0.5*a; }
    c.pose(o.a, 0, 0, 0, rx - 0.3*fl, 0, rz);
    c.pose(o.e1, 0, 0, 0, e1); c.pose(o.e2, 0, 0, 0, e2); c.pose(o.hd, 0, 0, 0, hd);
  });
  // the head: the blank turns slow and stops, too still; the antennae taste the air
  c.glance([0.8, 2.6], 0.5, 120);
  c.pose(P.head, 0, 0, 0, m.gx.x*0.6 + (summon ? -0.45*w : 0) + (dive ? 0.35*w : 0) - 0.25*fl, m.gy.x*0.8, Math.sin(t*0.4)*0.08 + (fit > 0.5 ? Math.sin(t*30)*0.06*fit : 0));
  P.ant.forEach((g, i)=> c.pose(g, 0, 0, 0, Math.sin(t*2.7 + i*1.3)*0.1 - (dive ? 0.5*w : 0) + 0.3*a, 0, (i ? 1 : -1)*(Math.sin(t*1.9 + i)*0.08 + (dust ? 0.25*w : 0))));
  // the gown and the veil hang and drag behind her
  const pitch = 0.12*s + (dive ? 0.55*w + 0.75*a : 0) - (summon ? 0.15*w : 0);
  c.pose(P.gown, 0, 0, 0, -pitch*0.6 - 0.25*s + Math.sin(t*1.1)*0.04 + (dust ? 0.15*a : 0), 0, Math.sin(t*0.8)*0.05);
  c.pose(P.veil, 0, 0, 0, -pitch*0.5 + 0.1*s + Math.sin(t*1.4)*0.04, 0, 0);
  // she hangs in the air, lifted on each downbeat; a dust downbeat throws her up; a dive throws her at you
  const y = 0.08*lift + Math.sin(t*1.2)*0.05 + (dust ? 0.25*a - 0.1*w : 0) + (summon ? 0.15*w : 0);
  return { y, z:(dive ? -0.15*w + 0.7*a : 0) - 0.1*fl, rx:pitch - 0.2*fl + shake, rz:Math.sin(t*0.6)*0.04 };
};

})();
