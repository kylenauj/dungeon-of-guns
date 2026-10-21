/* ------------------------------------------------------------------ *
 *  Filth: the muck of a place nobody has cleaned in a thousand years.
 *  View only, like the rest of the vanity (its own RNG, seeded by the
 *  dungeon, so a seed always dresses the same way).
 *
 *  - drifts along the foot of every wall: dirt and ash heaped against
 *    the stone, jagged rocks, splinters, bones and rags caught in them
 *  - heaps in the corners, where it all collects
 *  - rags: torn, holed cloth lying about the floor
 *  - tatters: strips of rotten cloth hanging down the walls
 *  - growths: wet masses of flesh in the corners, veins crawling out
 *    across the floor from them (more of them the deeper you go)
 *  - the hanged: bodies wrapped in rags, hung on chains by the walls
 *
 *  Muck is faceted (flat-shaded triangles) so its edges stay hard and
 *  broken; flesh is smooth and wet. It's all written straight into one
 *  buffer per area and material (a few thousand pieces a floor: making
 *  each a three.js geometry took most of a second), and small things
 *  (rocks, bones, splinters, lumps) are copies of a few shapes made once.
 *  Doorways, traps and pits are left clear; nothing stands higher than a
 *  pickup but the hanged.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE, PI = Math.PI, WH = K.WALL_H;
const proto = DG.World.prototype;

const RAGS = [0x3a2e24, 0x2c2822, 0x4a1c16, 0x34302c, 0x4a4234, 0x2a2420];
const BONE = 0x7e7464, WOOD = 0x2e2218, ROCK = 0x3e3a36;
const FLESH = [0x4a2422, 0x5e302c, 0x3a1c1e, 0x6a4038], BOIL = 0x8a7a5e, VEIN = 0x3a1416;

/* ---- a buffer of triangles: positions, normals, colours (typed, grown by doubling) ---- */
function Buf(){ this.p = new Float32Array(9*512); this.n = new Float32Array(9*512); this.c = new Float32Array(9*512); this.len = 0; }
Buf.prototype.room = function(k){
  if(this.len + k <= this.p.length) return;
  let cap = this.p.length*2; while(cap < this.len + k) cap *= 2;
  ["p", "n", "c"].forEach(f=>{ const a = new Float32Array(cap); a.set(this[f].subarray(0, this.len)); this[f] = a; });
};
/* a flat-shaded triangle in one colour */
Buf.prototype.tri = function(a, b, c, col, k){
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  let nx = uy*vz - uz*vy, ny = uz*vx - ux*vz, nz = ux*vy - uy*vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
  this.room(9); const i = this.len, P = this.p, N = this.n, C = this.c;
  P[i] = a[0]; P[i + 1] = a[1]; P[i + 2] = a[2]; P[i + 3] = b[0]; P[i + 4] = b[1]; P[i + 5] = b[2]; P[i + 6] = c[0]; P[i + 7] = c[1]; P[i + 8] = c[2];
  const r = col.r*k, g = col.g*k, bl = col.b*k;
  for(let j=0;j<9;j+=3){ N[i + j] = nx; N[i + j + 1] = ny; N[i + j + 2] = nz; C[i + j] = r; C[i + j + 1] = g; C[i + j + 2] = bl; }
  this.len += 9;
};
/* a copy of a ready shape (non-indexed arrays p, n), moved by matrix e, in colour col */
Buf.prototype.copy = function(S, e, col, rnd){
  const Sp = S.p, Sn = S.n, k = 0.75 + rnd()*0.45;
  this.room(Sp.length); const o = this.len, P = this.p, N = this.n, C = this.c;
  for(let i=0;i<Sp.length;i+=3){
    const x = Sp[i], y = Sp[i + 1], z = Sp[i + 2], nx = Sn[i], ny = Sn[i + 1], nz = Sn[i + 2], j = o + i;
    P[j] = e[0]*x + e[4]*y + e[8]*z + e[12]; P[j + 1] = e[1]*x + e[5]*y + e[9]*z + e[13]; P[j + 2] = e[2]*x + e[6]*y + e[10]*z + e[14];
    const ax = e[0]*nx + e[4]*ny + e[8]*nz, ay = e[1]*nx + e[5]*ny + e[9]*nz, az = e[2]*nx + e[6]*ny + e[10]*nz, l = Math.hypot(ax, ay, az) || 1;
    N[j] = ax/l; N[j + 1] = ay/l; N[j + 2] = az/l;
    const v = k*(0.88 + 0.24*((i*0.618) % 1));
    C[j] = col.r*v; C[j + 1] = col.g*v; C[j + 2] = col.b*v;
  }
  this.len += Sp.length;
};
Buf.prototype.geometry = function(){
  const g = new THREE.BufferGeometry(), n = this.len;
  g.setAttribute("position", new THREE.BufferAttribute(this.p.slice(0, n), 3));
  g.setAttribute("normal", new THREE.BufferAttribute(this.n.slice(0, n), 3));
  g.setAttribute("color", new THREE.BufferAttribute(this.c.slice(0, n), 3));
  g.computeBoundingSphere();
  return g;
};

/* ---- the small shapes, made once ---- */
const arrays = (g, flat)=>{ if(flat){ if(g.index) g = g.toNonIndexed(); g.computeVertexNormals(); } else { if(!g.attributes.normal) g.computeVertexNormals(); if(g.index) g = g.toNonIndexed(); } return { p:g.attributes.position.array, n:g.attributes.normal.array }; };
let SH = null;
function shapes(){
  if(SH) return SH;
  const r = DG.RNG(5150).next;
  SH = {
    rocks:[0, 1, 2, 3, 4, 5, 6, 7].map(k=>{ const g = K.lump(1, 0, 0.7, k*13.7 + 3); g.scale(1, 0.6 + r()*0.4, 1); return arrays(g, true); }),
    splinters:[0, 1, 2].map(()=>{ const g = new THREE.BoxGeometry(1, 0.6, 1, 1, 1, 2); g.translate(0, 0, 0.5); const p = g.attributes.position; for(let i=0;i<p.count;i++) if(p.getZ(i) > 0.7){ p.setX(i, p.getX(i)*(0.15 + r()*0.4)); p.setZ(i, p.getZ(i) + (r() - 0.3)*0.15); } return arrays(g, true); }),
    bone:(()=>{ const a = new THREE.CylinderGeometry(0.06, 0.07, 1, 5), b = new THREE.SphereGeometry(0.12, 5, 3), c = new THREE.SphereGeometry(0.11, 5, 3); b.translate(0, 0.5, 0); c.translate(0, -0.5, 0); a.rotateX(PI/2); b.rotateX(PI/2); c.rotateX(PI/2); return arrays(K.merge([a, b, c].map(q=>{ q = q.toNonIndexed(); q.computeVertexNormals(); return q; })), true); })(),
    lumps:[0, 1, 2, 3, 4, 5].map(k=> arrays(K.sculpt(new THREE.SphereGeometry(1, 8, 6), 0.22, 5, k*7.1 + 2), false)),
    boil:arrays(new THREE.SphereGeometry(1, 6, 4), false),
    band:arrays(new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), false)
  };
  return SH;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
const place = (x, y, z, rx, ry, rz, sx, sy, sz)=>{ _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z); _s.set(sx, sy, sz); return _m.compose(_v, _q, _s).elements; };

/* ---- the pieces ---- */
const C = c=> new THREE.Color(c);
function rock(b, rnd, x, z, s){ const S = shapes().rocks[Math.floor(rnd()*8)]; b.copy(S, place(x, s*0.25, z, 0, rnd()*PI*2, 0, s, s*(0.6 + rnd()*0.5), s), C(ROCK), rnd); }
function splinter(b, rnd, x, z, l){ const S = shapes().splinters[Math.floor(rnd()*3)]; b.copy(S, place(x, 0.02, z, (rnd() - 0.5)*0.25, rnd()*PI*2, (rnd() - 0.5)*0.4, 0.035 + rnd()*0.04, 0.035, l), C(WOOD), rnd); }
function bone(b, rnd, x, z, l){ b.copy(shapes().bone, place(x, 0.025, z, (rnd() - 0.5)*0.2, rnd()*PI*2, 0, 0.25, 0.25, l), C(BONE), rnd); }

/* a drift of muck against a wall: a strip along the wall from (x0, z0) in
   direction (ax, az), L long, reaching d out along (nx, nz), h high at the wall */
function drift(b, rnd, x0, z0, ax, az, nx, nz, L, d, h, col){
  const SU = 7, SV = 3, P = [], c0 = C(col);
  for(let v=0; v<=SV; v++) for(let u=0; u<=SU; u++){
    const fu = u/SU, fv = v/SV, env = Math.sin(fu*PI)*0.6 + 0.4, reach = d*(0.75 + rnd()*0.5);
    const y = v === SV ? -0.01 : h*Math.pow(1 - fv, 1.6)*env*(0.55 + rnd()*0.9);
    const along = fu*L + (u > 0 && u < SU ? (rnd() - 0.5)*0.08 : 0);
    P.push([x0 + ax*along + nx*fv*reach, y, z0 + az*along + nz*fv*reach]);
  }
  // (faces up for all four walls: the out direction is always the along direction turned left)
  const at = (u, v)=> P[v*(SU + 1) + u];
  for(let v=0; v<SV; v++) for(let u=0; u<SU; u++){
    const a = at(u, v), bb = at(u + 1, v), c = at(u, v + 1), e = at(u + 1, v + 1);
    b.tri(a, c, bb, c0, 0.7 + rnd()*0.45 + a[1]*1.2); b.tri(bb, c, e, c0, 0.7 + rnd()*0.45 + bb[1]*1.2);
  }
}
/* a heap in a corner: a lumpy quarter-mound */
function heap(b, rnd, cx, cz, sx, sz, r, h, col){
  const SA = 6, SR = 4, P = [], c0 = C(col), flip = sx*sz < 0;
  for(let j=0;j<=SR;j++) for(let i=0;i<=SA;i++){
    const a = i/SA*PI/2, fr = j/SR, rr = r*fr*(j ? 0.8 + rnd()*0.4 : 0);
    P.push([cx + sx*Math.cos(a)*rr, j === SR ? -0.01 : h*(1 - fr*fr)*(0.6 + rnd()*0.7), cz + sz*Math.sin(a)*rr]);
  }
  const at = (i, j)=> P[j*(SA + 1) + i];
  for(let j=0;j<SR;j++) for(let i=0;i<SA;i++){
    const a = at(i, j), bb = at(i + 1, j), c = at(i, j + 1), e = at(i + 1, j + 1), k = 0.65 + rnd()*0.45 + a[1]*0.9;
    if(flip){ b.tri(a, c, bb, c0, k); b.tri(bb, c, e, c0, k); } else { b.tri(a, bb, c, c0, k); b.tri(bb, e, c, c0, k); }
  }
}
/* a rag: a sheet of rotten cloth, crumpled, its edges torn away and holes eaten in it */
function rag(b, rnd, cx, cz, w, d, col){
  const N = 6, P = [], c0 = C(col), ry = rnd()*PI*2, cs = Math.cos(ry), sn = Math.sin(ry);
  for(let j=0;j<=N;j++) for(let i=0;i<=N;i++){
    const u = (i/N - 0.5)*w + (rnd() - 0.5)*w*0.08, v = (j/N - 0.5)*d + (rnd() - 0.5)*d*0.08;
    P.push([cx + u*cs - v*sn, 0.012 + Math.max(0, Math.sin(i/N*7 + rnd()*2)*Math.cos(j/N*5 + rnd()))*0.045 + rnd()*0.012, cz + u*sn + v*cs]);
  }
  const at = (i, j)=> P[j*(N + 1) + i];
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){
    const edge = Math.min(i, j, N - 1 - i, N - 1 - j) === 0;
    if(rnd() >= (edge ? 0.42 : 0.07)) b.tri(at(i, j), at(i, j + 1), at(i + 1, j), c0, 0.65 + rnd()*0.5);   // or torn off, eaten through
    if(rnd() >= (edge ? 0.42 : 0.07)) b.tri(at(i + 1, j), at(i, j + 1), at(i + 1, j + 1), c0, 0.65 + rnd()*0.5);
  }
}
/* a tatter: a strip of cloth hanging down a wall face, frayed into tongues at the bottom */
function tatter(b, rnd, x, top, z, nx, nz, w, l, col){
  const SY = 5, P = [], c0 = C(col), tx = -nz, tz = nx;
  for(let j=0;j<=SY;j++) for(let i=0;i<=2;i++){
    const fu = i/2 - 0.5, fv = j/SY, ragged = j === SY ? (rnd() - 0.2)*l*0.35 : 0, sway = Math.sin(fv*3 + x)*0.03*fv, narrow = 1 - fv*0.35;
    P.push([x + tx*fu*w*narrow + nx*(0.02 + sway), top - fv*l - ragged, z + tz*fu*w*narrow + nz*(0.02 + sway)]);
  }
  const at = (i, j)=> P[j*3 + i];
  for(let j=0;j<SY;j++) for(let i=0;i<2;i++){
    if(j > 1 && rnd() < 0.12) continue;                                // a hole
    const k = 0.55 + rnd()*0.35 + (1 - j/SY)*0.25;
    b.tri(at(i, j), at(i, j + 1), at(i + 1, j), c0, k); b.tri(at(i + 1, j), at(i, j + 1), at(i + 1, j + 1), c0, k);
  }
}
/* a growth: a heap of wet lumps, pale boils on it, veins crawling out over the floor */
function growth(b, rnd, cx, cz, sx, sz, size){
  const S = shapes(), n = 5 + Math.floor(rnd()*4);
  for(let k=0;k<n;k++){
    const r = size*(0.12 + rnd()*0.16), a = rnd()*PI/2, d = rnd()*size*0.5, x = cx + sx*Math.cos(a)*d, z = cz + sz*Math.sin(a)*d, sy = 0.55 + rnd()*0.4;
    b.copy(S.lumps[Math.floor(rnd()*6)], place(x, r*0.3, z, 0, rnd()*PI*2, 0, r, r*sy, r), C(FLESH[Math.floor(rnd()*FLESH.length)]), rnd);
    if(rnd() < 0.5) b.copy(S.boil, place(x + (rnd() - 0.5)*r, r*0.3 + r*sy*0.8, z + (rnd() - 0.5)*r, 0, 0, 0, r*0.28, r*0.28, r*0.28), C(BOIL), rnd);
  }
  // veins: thin ridges half sunk in the floor, wandering out and forking, thinner as they go
  const vc = C(VEIN);
  const vein = (x, z, a, L, w, depth)=>{
    for(let s=0;s<6;s++){
      const a2 = a + (rnd() - 0.5)*1.1, x2 = x + sx*Math.cos(a2)*L/6, z2 = z + sz*Math.sin(a2)*L/6, w2 = w*0.85;
      const px = -(z2 - z), pz = x2 - x, pl = Math.hypot(px, pz) || 1, ux = px/pl, uz = pz/pl;
      const l1 = [x - ux*w, 0.004, z - uz*w], r1 = [x + ux*w, 0.004, z + uz*w], m1 = [x, 0.004 + w*0.8, z];
      const l2 = [x2 - ux*w2, 0.004, z2 - uz*w2], r2 = [x2 + ux*w2, 0.004, z2 + uz*w2], m2 = [x2, 0.004 + w2*0.8, z2];
      const k = 0.8 + rnd()*0.3;
      b.tri(l1, m1, l2, vc, k); b.tri(l2, m1, m2, vc, k); b.tri(m1, r1, m2, vc, k*0.8); b.tri(m2, r1, r2, vc, k*0.8);
      if(depth < 2 && s > 1 && rnd() < 0.3) vein(x2, z2, a2 + (rnd() < 0.5 ? 0.7 : -0.7), L*0.5, w*0.6, depth + 1);
      x = x2; z = z2; a = a2; w = w2;
    }
  };
  const vn = 2 + Math.floor(rnd()*3);
  for(let k=0;k<vn;k++){ const a = rnd()*PI/2; vein(cx + sx*Math.cos(a)*size*0.3, cz + sz*Math.sin(a)*size*0.3, a, 0.8 + rnd()*1.4, 0.016 + rnd()*0.012, 0); }
}
/* the hanged: a body bound in rags, soaked dark toward the feet, on a chain from the dark overhead */
function hanged(b, rnd, x, z){
  const S = shapes(), y0 = 1.25 + rnd()*0.5, L = 0.95 + rnd()*0.3, c0 = C(RAGS[Math.floor(rnd()*RAGS.length)]).multiplyScalar(0.7);
  const lean = (rnd() - 0.5)*0.15;
  b.copy(S.lumps[Math.floor(rnd()*6)], place(x, y0 + L/2, z, 0, rnd()*PI*2, lean, 0.2, L/2, 0.17), c0, rnd);
  b.copy(S.lumps[Math.floor(rnd()*6)], place(x, y0 + L*0.12, z, 0, 0, lean, 0.13, L*0.16, 0.12), C(0x2a0e0c), rnd);   // soaked through
  for(let k=0;k<3;k++) b.copy(S.band, place(x, y0 + L*(0.25 + k*0.25), z, 0, 0, lean, 0.19 - Math.abs(k - 1)*0.03, 0.03, 0.17 - Math.abs(k - 1)*0.03), C(0x2a2018), rnd);
  b.copy(S.rocks[0], place(x - 0.05, y0 - 0.02, z, 0, 0, 0, 0.06, 0.06, 0.06), C(0x4a3e34), rnd);                    // a foot, out of the wrapping
  b.copy(S.band, place(x, y0 + L + 2.4, z, 0, 0, 0, 0.018, 5, 0.018), C(0x26221e), rnd);                            // the chain, up into the dark
}

/* the pieces, for the gallery (?gallery: the FILTH row) */
DG.Filth = {
  sample(kind){
    const b = new Buf(), r = DG.RNG(11).next;
    if(kind === "drift"){ drift(b, r, -0.6, -0.4, 1, 0, 0, 1, 1.2, 0.6, 0.35, 0x2e261e); for(let k=0;k<4;k++) rock(b, r, -0.4 + k*0.25, -0.2, 0.05 + r()*0.05); bone(b, r, 0.2, 0, 0.25); splinter(b, r, -0.2, 0.05, 0.4); }
    if(kind === "heap"){ heap(b, r, -0.6, -0.6, 1, 1, 1.2, 0.45, 0x2e261e); rag(b, r, 0.4, 0.4, 0.6, 0.5, 0x4a1c16); }
    if(kind === "growth") growth(b, r, -0.6, -0.6, 1, 1, 1.3);
    if(kind === "hanged") hanged(b, r, 0, 0);
    if(kind === "rag") rag(b, r, 0, 0, 0.7, 0.55, 0x3a2e24);
    if(kind === "tatter") for(let k=0;k<3;k++) tatter(b, r, -0.3 + k*0.3, 2.2, 0, 0, 1, 0.2, 1.2, 0x4a4234);
    return b.geometry();
  }
};

proto.buildFilth = function(){
  const W = this, D = W.D, th = W.th, rnd = DG.RNG((D.seed ^ 0xf17a) >>> 0).next, muck = {}, meat = {};
  const dirt = new THREE.Color(0x2a231c).lerp(new THREE.Color(th.floor), 0.3).getHex();
  const traps = new Set(); D.rooms.forEach(r=> (r.traps || []).forEach(t=> traps.add(t.x + "," + t.y)));
  const solid = (x, y)=> D.at(x, y) === T.SOLID;
  const floorOK = (x, y)=> D.at(x, y) === T.FLOOR && !traps.has(x + "," + y);
  const nearDoor = (x, y)=>{ for(let v=-1;v<=1;v++) for(let u=-1;u<=1;u++) if(D.at(x + u, y + v) === T.DOOR) return true; return false; };
  // the way through stays clear of anything tall: corridors, and the lanes in front of doors
  const way = new Set();
  (D.corridors || []).forEach(c=> c.tiles.forEach(([x, y])=> way.add(x + "," + y)));
  if(DG.Dungeon.doorLanes) D.rooms.forEach(r=> DG.Dungeon.doorLanes(D, r).forEach(L=>{ for(let y=L.y0; y<=L.y1; y++) for(let x=L.x0; x<=L.x1; x++) way.add(x + "," + y); }));
  const rot = 0.12 + Math.min(0.5, (th.gloom || 0)*0.35 + (D.floor || 1)*0.05);   // the deeper, the more of it
  const rag1 = ()=> RAGS[Math.floor(rnd()*RAGS.length)];
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    if(!floorOK(x, y) || nearDoor(x, y)) continue;
    const a = W.area[y*D.w + x];
    if(a === undefined || a < 0) continue;
    const b = muck[a] = muck[a] || new Buf();
    const litter = (cx, cz, spread, n)=>{
      for(let k=0;k<n;k++){
        const px = cx + (rnd() - 0.5)*spread, pz = cz + (rnd() - 0.5)*spread, q = rnd();
        if(q < 0.6) rock(b, rnd, px, pz, 0.03 + rnd()*0.07);
        else if(q < 0.8) splinter(b, rnd, px, pz, 0.15 + rnd()*0.3);
        else bone(b, rnd, px, pz, 0.12 + rnd()*0.16);
      }
    };
    const ragAt = (cx, cz, s)=> rag(b, rnd, cx, cz, s*(0.8 + rnd()*0.5), s*(0.6 + rnd()*0.5), rag1());
    const N = solid(x, y - 1), S = solid(x, y + 1), Wst = solid(x - 1, y), E = solid(x + 1, y);
    // drifts along each wall this tile touches
    if(N && rnd() < 0.8){ drift(b, rnd, x - 0.08, y, 1, 0, 0, 1, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt); litter(x + 0.5, y + 0.18, 0.8, 1 + Math.floor(rnd()*3)); }
    if(S && rnd() < 0.8){ drift(b, rnd, x + 1.08, y + 1, -1, 0, 0, -1, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt); litter(x + 0.5, y + 0.82, 0.8, 1 + Math.floor(rnd()*2)); }
    if(Wst && rnd() < 0.8){ drift(b, rnd, x, y + 1.08, 0, -1, 1, 0, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt); litter(x + 0.18, y + 0.5, 0.8, 1 + Math.floor(rnd()*2)); }
    if(E && rnd() < 0.8){ drift(b, rnd, x + 1, y - 0.08, 0, 1, -1, 0, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt); litter(x + 0.82, y + 0.5, 0.8, 1 + Math.floor(rnd()*2)); }
    // corners: where it all collects
    const corner = (N && Wst) ? [x, y, 1, 1] : (N && E) ? [x + 1, y, -1, 1] : (S && Wst) ? [x, y + 1, 1, -1] : (S && E) ? [x + 1, y + 1, -1, -1] : null;
    if(corner){
      const [cx, cz, sx, sz] = corner;
      heap(b, rnd, cx, cz, sx, sz, 0.9 + rnd()*0.45, 0.32 + rnd()*0.2, dirt);
      litter(cx + sx*0.35, cz + sz*0.35, 0.5, 2 + Math.floor(rnd()*3));
      if(rnd() < 0.5) ragAt(cx + sx*0.45, cz + sz*0.45, 0.5);
      if(rnd() < rot) growth(meat[a] = meat[a] || new Buf(), rnd, cx, cz, sx, sz, 0.8 + rnd()*0.6);
    }
    // the hanged, by the far wall and the sides (never over a doorway)
    if((N || Wst || E) && rnd() < 0.035 && !way.has(x + "," + y)) hanged(b, rnd, N ? x + 0.3 + rnd()*0.4 : Wst ? x + 0.4 : x + 0.6, N ? y + 0.4 : y + 0.3 + rnd()*0.4);
    // the open floor: now and then a rag, a scatter of grit and bone
    if(!N && !S && !Wst && !E){
      if(rnd() < 0.035) ragAt(x + 0.2 + rnd()*0.6, y + 0.2 + rnd()*0.6, 0.45 + rnd()*0.3);
      if(rnd() < 0.08) litter(x + 0.5, y + 0.5, 0.9, 1 + Math.floor(rnd()*3));
    } else if(rnd() < 0.12) ragAt(x + 0.25 + rnd()*0.5, y + 0.25 + rnd()*0.5, 0.4 + rnd()*0.3);
    // tatters down the walls the camera sees: the far wall, and the sides
    if(N && rnd() < 0.2){ const n = 1 + Math.floor(rnd()*3); for(let k=0;k<n;k++) tatter(b, rnd, x + 0.15 + rnd()*0.7, WH - 0.04 - rnd()*0.3, y, 0, 1, 0.12 + rnd()*0.22, 0.5 + rnd()*1.3, rag1()); }
    if(Wst && rnd() < 0.08) tatter(b, rnd, x, WH - 0.04 - rnd()*0.3, y + 0.2 + rnd()*0.6, 1, 0, 0.12 + rnd()*0.2, 0.5 + rnd()*1.1, rag1());
    if(E && rnd() < 0.08) tatter(b, rnd, x + 1, WH - 0.04 - rnd()*0.3, y + 0.2 + rnd()*0.6, -1, 0, 0.12 + rnd()*0.2, 0.5 + rnd()*1.1, rag1());
  }
  // flesh keeps its colour (the one red thing in a grey room) and is wet
  const fmat = W.fleshMat = W.fleshMat || K.inkPBR({ vivid:true, roughness:0.3 });
  const mat = W.filthMat = W.filthMat || K.inkPBR({ side:THREE.DoubleSide });
  const add = (bufs, m)=>{ for(const a in bufs){ if(!bufs[a].len) continue; const o = new THREE.Mesh(bufs[a].geometry(), m); o.receiveShadow = true; o.castShadow = false; W.areaGroup(+a).add(o); } };
  add(meat, fmat); add(muck, mat);
};

})();
