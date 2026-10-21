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
 *
 *  Everything is faceted (flat-shaded triangles) so its edges stay hard
 *  and broken, and it's merged into one mesh per area. Doorways, traps
 *  and pits are left clear, and nothing stands higher than a pickup.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE, PI = Math.PI, WH = K.WALL_H;
const proto = DG.World.prototype;

const RAGS = [0x3a2e24, 0x2c2822, 0x4a1c16, 0x34302c, 0x4a4234, 0x2a2420];
const BONE = 0x7e7464, WOOD = 0x2e2218, ROCK = 0x3e3a36;

/* flat-shaded: every triangle its own normal, so lumps read as broken, not soft */
function facet(g){ if(g.index) g = g.toNonIndexed(); g.computeVertexNormals(); return g; }
function colour(g, col, fn){ return K.paint(g, col, fn); }

/* a drift of muck against a wall: a strip along the wall from (x0, z0) in
   direction (ax, az), L long, reaching d out along (nx, nz), h high at the wall */
function drift(rnd, x0, z0, ax, az, nx, nz, L, d, h, col){
  const SU = 7, SV = 3, pos = [], P = [];
  for(let v=0; v<=SV; v++) for(let u=0; u<=SU; u++){
    const fu = u/SU, fv = v/SV;
    const env = Math.sin(fu*PI)*0.6 + 0.4;                        // lower at its ends
    const reach = d*(0.75 + rnd()*0.5);
    const y = v === SV ? -0.01 : h*Math.pow(1 - fv, 1.6)*env*(0.55 + rnd()*0.9);
    const along = fu*L + (u > 0 && u < SU ? (rnd() - 0.5)*0.08 : 0);
    P.push([x0 + ax*along + nx*fv*reach, y, z0 + az*along + nz*fv*reach]);
  }
  const at = (u, v)=> P[v*(SU + 1) + u];
  for(let v=0; v<SV; v++) for(let u=0; u<SU; u++){
    const a = at(u, v), b = at(u + 1, v), c = at(u, v + 1), e = at(u + 1, v + 1);
    pos.push(...a, ...c, ...b, ...b, ...c, ...e);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  // (faces up for all four walls: the out direction is always the along direction turned left)
  g.computeVertexNormals();
  const c0 = new THREE.Color(col);
  return colour(g, col, (c, x, y)=>{ c.copy(c0).multiplyScalar(0.7 + rnd()*0.45 + y*1.2); });
}
/* a heap in a corner: a lumpy quarter-mound */
function heap(rnd, cx, cz, sx, sz, r, h, col){
  const SA = 6, SR = 4, P = [], pos = [];
  for(let j=0;j<=SR;j++) for(let i=0;i<=SA;i++){
    const a = i/SA*PI/2, fr = j/SR, rr = r*fr*(j ? 0.8 + rnd()*0.4 : 0);
    const y = j === SR ? -0.01 : h*(1 - fr*fr)*(0.6 + rnd()*0.7);
    P.push([cx + sx*Math.cos(a)*rr, y, cz + sz*Math.sin(a)*rr]);
  }
  const at = (i, j)=> P[j*(SA + 1) + i];
  const flip = sx*sz < 0;
  for(let j=0;j<SR;j++) for(let i=0;i<SA;i++){
    const a = at(i, j), b = at(i + 1, j), c = at(i, j + 1), e = at(i + 1, j + 1);
    if(flip) pos.push(...a, ...c, ...b, ...b, ...c, ...e); else pos.push(...a, ...b, ...c, ...b, ...e, ...c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const c0 = new THREE.Color(col);
  return colour(g, col, (c, x, y)=>{ c.copy(c0).multiplyScalar(0.65 + rnd()*0.45 + y*0.9); });
}
function rock(rnd, x, z, s, col){
  const g = facet(K.lump(s, 0, 0.7, rnd()*100));
  g.scale(1, 0.55 + rnd()*0.5, 1); g.rotateY(rnd()*PI*2); g.translate(x, s*0.25, z);
  const c0 = new THREE.Color(col).multiplyScalar(0.7 + rnd()*0.6);
  return colour(g, c0, (c, px, py)=> c.multiplyScalar(0.8 + (py - s*0.25)/s*0.35));
}
function splinter(rnd, x, z, l){
  const g = new THREE.BoxGeometry(0.035 + rnd()*0.04, 0.02 + rnd()*0.02, l, 1, 1, 2);
  // a split, snapped end: the far vertices pulled to a point
  const p = g.attributes.position; for(let i=0;i<p.count;i++) if(p.getZ(i) > l*0.4){ p.setX(i, p.getX(i)*(0.2 + rnd()*0.5)); p.setZ(i, p.getZ(i) + (rnd() - 0.3)*0.06); }
  g.rotateZ((rnd() - 0.5)*0.4); g.rotateX((rnd() - 0.5)*0.25); g.rotateY(rnd()*PI*2); g.translate(x, 0.02, z);
  return colour(facet(g), new THREE.Color(WOOD).multiplyScalar(0.7 + rnd()*0.6));
}
function bone(rnd, x, z, l){
  const parts = [new THREE.CylinderGeometry(0.014, 0.017, l, 5), new THREE.SphereGeometry(0.03, 5, 3), new THREE.SphereGeometry(0.028, 5, 3)];
  parts[1].translate(0, l/2, 0); parts[2].translate(0, -l/2, 0);
  const g = K.merge(parts.map(p=> colour(facet(p), BONE)));
  g.rotateX(PI/2 + (rnd() - 0.5)*0.2); g.rotateY(rnd()*PI*2); g.translate(x, 0.025, z);
  return colour(g, new THREE.Color(BONE).multiplyScalar(0.7 + rnd()*0.35));
}
/* a rag: a sheet of rotten cloth, crumpled, its edges torn away and holes eaten in it */
function rag(rnd, w, d, col){
  const N = 6, pos = [], P = [];
  for(let j=0;j<=N;j++) for(let i=0;i<=N;i++){
    const u = i/N - 0.5, v = j/N - 0.5;
    P.push([u*w + (rnd() - 0.5)*w*0.08, 0.012 + Math.max(0, Math.sin(u*7 + rnd()*2)*Math.cos(v*5 + rnd()))*0.045 + rnd()*0.012, v*d + (rnd() - 0.5)*d*0.08]);
  }
  const at = (i, j)=> P[j*(N + 1) + i];
  for(let j=0;j<N;j++) for(let i=0;i<N;i++){
    const edge = Math.min(i, j, N - 1 - i, N - 1 - j) === 0;
    [[at(i, j), at(i, j + 1), at(i + 1, j)], [at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)]].forEach(t=>{
      if(rnd() < (edge ? 0.42 : 0.07)) return;                    // torn off, eaten through
      pos.push(...t[0], ...t[1], ...t[2]);
    });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const c0 = new THREE.Color(col);
  return colour(g, col, c=> c.copy(c0).multiplyScalar(0.65 + rnd()*0.5));
}
/* a tatter: a strip of cloth hanging down a wall face, frayed into tongues at the bottom */
function tatter(rnd, x, top, z, nx, nz, w, l, col){
  const SY = 5, pos = [], P = [];
  const tx = -nz, tz = nx;                                         // along the wall
  for(let j=0;j<=SY;j++) for(let i=0;i<=2;i++){
    const fu = i/2 - 0.5, fv = j/SY;
    const ragged = j === SY ? (rnd() - 0.2)*l*0.35 : 0;             // a torn bottom edge
    const sway = Math.sin(fv*3 + x)*0.03*fv;
    const narrow = 1 - fv*0.35;
    P.push([x + tx*fu*w*narrow + nx*(0.02 + sway), top - fv*l - ragged, z + tz*fu*w*narrow + nz*(0.02 + sway)]);
  }
  const at = (i, j)=> P[j*3 + i];
  for(let j=0;j<SY;j++) for(let i=0;i<2;i++){
    if(j > 1 && rnd() < 0.12) continue;                              // a hole
    pos.push(...at(i, j), ...at(i, j + 1), ...at(i + 1, j), ...at(i + 1, j), ...at(i, j + 1), ...at(i + 1, j + 1));
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  const c0 = new THREE.Color(col);
  return colour(g, col, (c, px, py)=> c.copy(c0).multiplyScalar(0.55 + rnd()*0.35 + Math.min(1, (py - top + l)/l)*0.25));
}

proto.buildFilth = function(){
  const W = this, D = W.D, th = W.th, rnd = DG.RNG((D.seed ^ 0xf17a) >>> 0).next, byArea = {};
  const dirt = new THREE.Color(0x2a231c).lerp(new THREE.Color(th.floor), 0.3).getHex();
  const traps = new Set(); D.rooms.forEach(r=> (r.traps || []).forEach(t=> traps.add(t.x + "," + t.y)));
  const solid = (x, y)=>{ const t = D.at(x, y); return t === T.SOLID; };
  const floorOK = (x, y)=> D.at(x, y) === T.FLOOR && !traps.has(x + "," + y);
  const nearDoor = (x, y)=>{ for(let v=-1;v<=1;v++) for(let u=-1;u<=1;u++) if(D.at(x + u, y + v) === T.DOOR) return true; return false; };
  const put = (x, y, g)=>{ const a = W.area[y*D.w + x]; if(a === undefined || a < 0) return; (byArea[a] = byArea[a] || []).push(g); };
  const litter = (x, y, cx, cz, spread, n)=>{
    for(let k=0;k<n;k++){
      const px = cx + (rnd() - 0.5)*spread, pz = cz + (rnd() - 0.5)*spread, q = rnd();
      if(q < 0.6) put(x, y, rock(rnd, px, pz, 0.03 + rnd()*0.07, ROCK));
      else if(q < 0.8) put(x, y, splinter(rnd, px, pz, 0.15 + rnd()*0.3));
      else put(x, y, bone(rnd, px, pz, 0.12 + rnd()*0.16));
    }
  };
  const ragAt = (x, y, cx, cz, s)=>{ const g = rag(rnd, s*(0.8 + rnd()*0.5), s*(0.6 + rnd()*0.5), RAGS[Math.floor(rnd()*RAGS.length)]); g.rotateY(rnd()*PI*2); g.translate(cx, 0, cz); put(x, y, g); };
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    if(!floorOK(x, y) || nearDoor(x, y)) continue;
    const N = solid(x, y - 1), S = solid(x, y + 1), Wst = solid(x - 1, y), E = solid(x + 1, y);
    // drifts along each wall this tile touches
    if(N && rnd() < 0.8){ put(x, y, drift(rnd, x - 0.08, y, 1, 0, 0, 1, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt)); litter(x, y, x + 0.5, y + 0.18, 0.8, 2 + Math.floor(rnd()*5)); }
    if(S && rnd() < 0.8){ put(x, y, drift(rnd, x + 1.08, y + 1, -1, 0, 0, -1, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt)); litter(x, y, x + 0.5, y + 0.82, 0.8, 2 + Math.floor(rnd()*4)); }
    if(Wst && rnd() < 0.8){ put(x, y, drift(rnd, x, y + 1.08, 0, -1, 1, 0, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt)); litter(x, y, x + 0.18, y + 0.5, 0.8, 2 + Math.floor(rnd()*4)); }
    if(E && rnd() < 0.8){ put(x, y, drift(rnd, x + 1, y - 0.08, 0, 1, -1, 0, 1.16, 0.4 + rnd()*0.35, 0.16 + rnd()*0.22, dirt)); litter(x, y, x + 0.82, y + 0.5, 0.8, 2 + Math.floor(rnd()*4)); }
    // corners: where it all collects
    const corner = (N && Wst) ? [x, y, 1, 1] : (N && E) ? [x + 1, y, -1, 1] : (S && Wst) ? [x, y + 1, 1, -1] : (S && E) ? [x + 1, y + 1, -1, -1] : null;
    if(corner){
      const [cx, cz, sx, sz] = corner;
      put(x, y, heap(rnd, cx, cz, sx, sz, 0.9 + rnd()*0.45, 0.32 + rnd()*0.2, dirt));
      litter(x, y, cx + sx*0.35, cz + sz*0.35, 0.5, 3 + Math.floor(rnd()*4));
      if(rnd() < 0.5) ragAt(x, y, cx + sx*0.45, cz + sz*0.45, 0.5);
    }
    // the open floor: now and then a rag, a scatter of grit and bone
    if(!N && !S && !Wst && !E){
      if(rnd() < 0.035) ragAt(x, y, x + 0.2 + rnd()*0.6, y + 0.2 + rnd()*0.6, 0.45 + rnd()*0.3);
      if(rnd() < 0.08) litter(x, y, x + 0.5, y + 0.5, 0.9, 1 + Math.floor(rnd()*3));
    } else if(rnd() < 0.12) ragAt(x, y, x + 0.25 + rnd()*0.5, y + 0.25 + rnd()*0.5, 0.4 + rnd()*0.3);
    // tatters down the walls the camera sees: the far wall, and the sides
    if(N && rnd() < 0.2){ const n = 1 + Math.floor(rnd()*3); for(let k=0;k<n;k++) put(x, y, tatter(rnd, x + 0.15 + rnd()*0.7, WH - 0.04 - rnd()*0.3, y, 0, 1, 0.12 + rnd()*0.22, 0.5 + rnd()*1.3, RAGS[Math.floor(rnd()*RAGS.length)])); }
    if(Wst && rnd() < 0.08) put(x, y, tatter(rnd, x, WH - 0.04 - rnd()*0.3, y + 0.2 + rnd()*0.6, 1, 0, 0.12 + rnd()*0.2, 0.5 + rnd()*1.1, RAGS[Math.floor(rnd()*RAGS.length)]));
    if(E && rnd() < 0.08) put(x, y, tatter(rnd, x + 1, WH - 0.04 - rnd()*0.3, y + 0.2 + rnd()*0.6, -1, 0, 0.12 + rnd()*0.2, 0.5 + rnd()*1.1, RAGS[Math.floor(rnd()*RAGS.length)]));
  }
  const mat = W.filthMat = W.filthMat || K.inkPBR({ side:THREE.DoubleSide });
  for(const a in byArea){
    const m = new THREE.Mesh(K.merge(byArea[a]), mat);
    m.receiveShadow = true; m.castShadow = false;
    W.areaGroup(+a).add(m);
  }
};

})();
