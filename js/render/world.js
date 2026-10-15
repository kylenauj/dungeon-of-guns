/* ------------------------------------------------------------------ *
 *  The world: the floor's tiles turned into stone, dressed and lit.
 *
 *  Geometry is merged per "area" (a room and its walls, or a corridor),
 *  so the fog of war is just area.visible. South-facing walls are built
 *  low so they never hide Zippy. Floors darken where they meet walls
 *  (a cheap ambient occlusion). Decor is flattened and baked per room.
 *  A small pool of point lights follows the nearest torches, candles,
 *  glowing mushrooms and crystals (a fixed count: no shader recompiles).
 *
 *  The stone is old and dead: worn flagstones in four cuts, ashlar walls
 *  whose courses run on from tile to tile (world-space UVs), a plinth
 *  and a cornice along every face, stones that jut, merlons that have
 *  crumbled. Things that glow by themselves (glowcap gills, embers)
 *  bake into one unlit mesh per area.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE, M = DG.Models;
const WH = K.WALL_H, LOW = 0.55, PI = Math.PI;
const frac = v=> v - Math.floor(v);
const hash2 = (x, y)=> frac(Math.sin(x*127.1 + y*311.7)*43758.5453);

/* ---- the stone, painted once: greyscale, so vertex colours tint it per floor ---- */
const TEX = {};
function texDone(cv, mip){
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = mip === false ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter; t.anisotropy = 1;
  return t;
}
function slab(g, r, x, y, w, h, v, cracks){
  // one dressed stone: a worn face, bevelled edges, pits, a stain, maybe a crack
  const grd = g.createLinearGradient(x, y, x + w*0.3, y + h);
  grd.addColorStop(0, "rgb(" + (v + 14) + "," + (v + 14) + "," + (v + 14) + ")"); grd.addColorStop(1, "rgb(" + (v - 16) + "," + (v - 16) + "," + (v - 16) + ")");
  g.fillStyle = grd; g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,0.16)"; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
  g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x, y + h - 2, w, 2); g.fillRect(x + w - 2, y, 2, h);
  for(let k=0;k<w*h/18;k++){ const q = r(); g.fillStyle = q < 0.5 ? "rgba(0,0,0," + (0.08 + r()*0.18) + ")" : "rgba(255,255,255," + (0.04 + r()*0.08) + ")"; g.fillRect(x + r()*w, y + r()*h, 1 + r()*2, 1 + r()*2); }
  if(r() < 0.6){ const sx = x + r()*w, sy = y + r()*h, rr = 6 + r()*Math.min(w, h)*0.5, gr = g.createRadialGradient(sx, sy, 0, sx, sy, rr); gr.addColorStop(0, "rgba(0,0,0,0.28)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x, y, w, h); }
  // chipped corners
  if(r() < 0.35){ const c = 3 + r()*7; g.fillStyle = "rgba(0,0,0,0.6)"; g.beginPath(); const cx = r() < 0.5 ? x : x + w, cy = r() < 0.5 ? y : y + h; g.moveTo(cx, cy); g.lineTo(cx + (cx === x ? c : -c), cy); g.lineTo(cx, cy + (cy === y ? c : -c)); g.fill(); }
  if(r() < cracks){
    g.strokeStyle = "rgba(0,0,0,0.75)"; g.lineWidth = 1 + r(); g.beginPath();
    let px = x + r()*w, py = y + (r() < 0.5 ? 1 : h - 1), a = py > y + h/2 ? -PI/2 : PI/2; g.moveTo(px, py);
    for(let k=0;k<6;k++){ a += (r() - 0.5)*1.4; px += Math.cos(a)*h*0.22; py += Math.sin(a)*h*0.22; g.lineTo(Math.max(x, Math.min(x + w, px)), Math.max(y, Math.min(y + h, py))); }
    g.stroke();
  }
}
/* walls: ashlar courses over 2x2 units, tiling both ways */
function stoneTex(){
  if(TEX.stone) return TEX.stone;
  const N = 256, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"), r = DG.RNG(77).next;
  g.fillStyle = "#2e2e2e"; g.fillRect(0, 0, N, N);
  const rows = 8, rh = N/rows;
  for(let row=0; row<rows; row++){
    const o = r()*30; let x = o;
    while(x < o + N - 1){
      let w = 28 + r()*44; if(x + w > o + N - 20) w = o + N - x;
      const v = 150 + (r()*70 | 0), seed = (r()*1e6) | 0;
      [x, x - N].forEach(px=> slab(g, DG.RNG(seed).next, px + 1.5, row*rh + 1.5, w - 3, rh - 3, v, 0.3));
      x += w;
    }
  }
  // damp streaks running down
  for(let k=0;k<18;k++){ const x = r()*N, l = 30 + r()*140, y = r()*N; const gr = g.createLinearGradient(0, y, 0, y + l); gr.addColorStop(0, "rgba(0,0,0,0.22)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x, y, 2 + r()*5, l); }
  return TEX.stone = texDone(cv);
}
/* floors: flagstones of every size laid over 4x4 units (cut and cut again,
   so no two neighbours match), tiling seamlessly */
function floorTex(){
  if(TEX.floor) return TEX.floor;
  const N = 512, U = N/4, cv = document.createElement("canvas"); cv.width = cv.height = N; const g = cv.getContext("2d"), r = DG.RNG(91).next;
  g.fillStyle = "#242424"; g.fillRect(0, 0, N, N);
  const G = 2.5, slabs = [];
  const cut = (x, y, w, h)=>{
    const big = Math.max(w, h);
    if(big <= 0.75 || (big <= 1.75 && r() < 0.42)){ slabs.push([x, y, w, h]); return; }
    const vert = w > h ? true : w < h ? false : r() < 0.5, len = vert ? w : h;
    const k = Math.max(1, Math.min(len/0.25 - 1, Math.round((0.3 + r()*0.4)*len/0.25)))*0.25;
    if(vert){ cut(x, y, k, h); cut(x + k, y, w - k, h); } else { cut(x, y, w, k); cut(x, y + k, w, h - k); }
  };
  cut(0, 0, 4, 4);
  slabs.forEach(([x, y, w, h])=> slab(g, r, x*U + G, y*U + G, w*U - 2*G, h*U - 2*G, 150 + (r()*62 | 0), 0.5));
  // hollows worn by feet, dark seepage
  for(let k=0;k<6;k++){ const sx = r()*N, sy = r()*N, rr = 30 + r()*70; [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]].forEach(([ox, oy])=>{ const gr = g.createRadialGradient(sx + ox, sy + oy, 0, sx + ox, sy + oy, rr); gr.addColorStop(0, "rgba(0,0,0,0.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(sx + ox - rr, sy + oy - rr, rr*2, rr*2); }); }
  return TEX.floor = texDone(cv);
}
/* smooth value noise over the floor, so tone drifts without showing the tile grid */
const vnoise = (x, y)=>{ const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx*fx*(3 - 2*fx), sy = fy*fy*(3 - 2*fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return a + (b - a)*sx + (c - a)*sy + (a - b - c + d)*sx*sy; };

/* world-space UVs on a positioned geometry, so courses run on across tiles */
function wuv(g){
  if(g.index) g = g.toNonIndexed();
  if(!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  let uv = g.attributes.uv; if(!uv){ uv = new THREE.BufferAttribute(new Float32Array(p.count*2), 2); g.setAttribute("uv", uv); }
  for(let i=0;i<p.count;i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if(ay > 0.7) uv.setXY(i, x*0.5, z*0.5);
    else if(ax > az) uv.setXY(i, z*0.5, y*0.5);
    else uv.setXY(i, x*0.5, y*0.5);
  }
  return g;
}
/* a stone part for the wall mesh: world UVs, tops in the top colour, darker low down */
function stone(list, g, cW, cTop, k){
  g = wuv(g);
  const n = g.attributes.normal;
  K.paint(g, cW, (c, px, py, pz, i)=>{
    if(n.getY(i) > 0.7) c.copy(cTop);
    c.multiplyScalar((k || 1)*(0.5 + 0.5*Math.min(1, py/WH + 0.15)));
  });
  list.push(g);
  return g;
}
const box = (w, h, d, x, y, z, rx, ry, rz)=>{ const g = new THREE.BoxGeometry(w, h, d); if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz); g.translate(x, y, z); return g; };

const World = DG.World = function(D){
  const W = this;
  W.D = D; W.group = new THREE.Group(); W.th = D.theme;
  W.areas = {}; W.doors = []; W.fakes = []; W.lights = []; W.flames = []; W.traps = []; W.props = {}; W.eyes = []; W.pz = {};
  W.mats = {
    floor: K.ink({ map:floorTex(), gloom:"floor" }),
    wall:  K.ink({ map:stoneTex(), gloom:"wall" }),
    plain: K.ink(),
    lit:   new THREE.MeshBasicMaterial({ vertexColors:true })
  };
  W.rnd = DG.RNG(D.seed ^ 0x51ed).next;
  W.assignAreas();
  W.buildAreas();
  W.buildWater();
  W.buildDoors();
  W.buildFakes();
  W.buildPainted();
  W.buildTorches();
  W.buildTraps();
  W.buildDecor();
  W.buildBreakables();
  W.buildMotes();
  W.buildVanity();
  D.rooms.forEach(r=> r.props.forEach(p=> W.addProp(p)));
  D.rooms.forEach(r=>{ if(r.puzzle) W.buildPuzzle(r); });
};
const proto = World.prototype;
World.stone = stone; World.wuv = wuv; World.stoneTex = stoneTex;

/* ---- which area each tile draws in ---- */
proto.assignAreas = function(){
  const D = this.D, A = this.area = new Int16Array(D.w*D.h).fill(-1);
  const set = (x, y, v)=>{ if(x >= 0 && y >= 0 && x < D.w && y < D.h && A[y*D.w + x] < 0) A[y*D.w + x] = v; };
  D.rooms.forEach(r=>{ for(let y=r.y1 - 1; y<=r.y2 + 1; y++) for(let x=r.x1 - 1; x<=r.x2 + 1; x++) set(x, y, r.id); });
  D.fakes.forEach(f=>{ if(f.puzzle){ const [x, y] = f.tiles[0]; for(let yy=y - 4; yy<y; yy++) for(let xx=x - 2; xx<=x + 2; xx++) set(xx, yy, f.room); } });
  D.corridors.forEach(c=> c.tiles.forEach(([x, y])=> set(x, y, 100 + c.id)));
  D.corridors.forEach(c=> c.tiles.forEach(([x, y])=> DG.DIRS8.forEach(([dx, dy])=> set(x + dx, y + dy, 100 + c.id))));
};
proto.areaGroup = function(id){
  if(!this.areas[id]){ const g = new THREE.Group(); g.visible = false; this.group.add(g); this.areas[id] = { g, id }; }
  return this.areas[id].g;
};
proto.areaOfTile = function(x, y){ const a = this.area[Math.floor(y)*this.D.w + Math.floor(x)]; return a >= 0 ? a : null; };

/* ---- floor, walls, pillars, pits ---- */
const walkable = t=> t === T.FLOOR || t === T.DOOR || t === T.PIT || t === T.BLOCK || t === T.BREAK || t === T.PUSH || t === T.WATER;
proto.buildAreas = function(){
  const W = this, D = W.D, th = W.th, gl = th.gloom || 0, buckets = {};
  const Bk = id=> buckets[id] || (buckets[id] = { floor:[], wall:[], plain:[], parts:new THREE.Group(), lit:new THREE.Group() });
  const solidish = (x, y)=>{ const t = D.at(x, y); return t === T.SOLID || t === T.FAKE; };
  const cF1 = new THREE.Color(th.floor).multiplyScalar(1.35), cF2 = new THREE.Color(th.floor2).multiplyScalar(1.35), cW = new THREE.Color(th.wall).multiplyScalar(1.2), cTop = new THREE.Color(th.top).multiplyScalar(1.2);
  const style = (x, y)=>{ const r = DG.Dungeon.roomAt(D, x + 0.5, y + 0.5); return r ? r.style : null; };
  const clumps = DG.Dungeon.clumps(D);
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    const t = D.at(x, y), a = W.area[y*D.w + x];
    if(a < 0) continue;
    const b = Bk(a), h = hash2(x, y);
    if(t === T.FLOOR || t === T.DOOR || t === T.BLOCK || t === T.BREAK || t === T.PUSH){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, 0, y + 0.5);
      const uv = g.attributes.uv, pa = g.attributes.position;
      for(let i=0;i<uv.count;i++) uv.setXY(i, pa.getX(i)/4, -pa.getZ(i)/4);
      // tone drifts across the floor; corners next to walls are darker (a little ambient occlusion)
      K.paint(g, cF1, (c, px, py, pz)=>{
        const nz = vnoise(px*0.33, pz*0.33)*0.7 + vnoise(px*1.1 + 9, pz*1.1)*0.3;
        c.lerp(cF2, vnoise(px*0.21 + 3, pz*0.21 - 5)).multiplyScalar(0.72 + nz*0.5);
        const cx = Math.round(px), cz = Math.round(pz);
        let n = 0; [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]].forEach(([u, v])=>{ if(solidish(u, v)) n++; });
        c.multiplyScalar(1 - 0.2*n);
      });
      b.floor.push(g);
    }
    const ci = t === T.BLOCK ? clumps.of[y*D.w + x] : -1;
    if(ci >= 0){
      // four blocks in a square are one big obstacle, drawn from its top-left tile
      const cl = clumps.list[ci];
      if(cl.x === x && cl.y === y) W.bigBlock(b, x, y, style(x, y), h, a, cW, cTop);
    } else if(t === T.BLOCK) W.pillar(b, x, y, style(x, y), h, a, cW, cTop);
    if(t === T.PIT){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, -2.2, y + 0.5);
      b.plain.push(K.paint(g, 0x020203));
      DG.DIRS4.forEach(([dx, dy])=>{
        if(D.at(x + dx, y + dy) === T.PIT) return;
        // the shaft's sides: the same stone, sinking into black
        const s = new THREE.PlaneGeometry(1, 2.2);
        s.translate(0, -1.1, 0);
        s.rotateY(dx === 1 ? -PI/2 : dx === -1 ? PI/2 : dy === 1 ? PI : 0);
        s.translate(x + 0.5 + dx*0.5, 0, y + 0.5 + dy*0.5);
        const sg = wuv(s);
        b.wall.push(K.paint(sg, cW.clone().multiplyScalar(0.5), (c, px, py)=> c.multiplyScalar(Math.max(0.03, 1 + py/1.2))));
        // a broken lip of stone round the edge
        const lip = box(dx ? 0.1 : 1, 0.06, dy ? 0.1 : 1, x + 0.5 + dx*0.47, 0.03, y + 0.5 + dy*0.47);
        stone(b.wall, lip, cF1, cF1, 0.8);
      });
    }
    if(t === T.WATER){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, -0.35, y + 0.5);
      b.plain.push(K.paint(g, 0x0a1410));
    }
    if(t === T.SOLID){
      let touch = false;
      for(const [dx, dy] of DG.DIRS8){ const n = D.at(x + dx, y + dy); if(walkable(n) || n === T.FAKE){ touch = true; break; } }
      if(!touch) continue;
      const south = walkable(D.at(x, y - 1)) && !walkable(D.at(x, y + 1));
      b.wall.push(...W.wallBlock(x, y, south));
      // on top of walls facing a room
      if(!south && walkable(D.at(x, y + 1))){
        // the keep: merlons, most of them crumbled
        if(th.decor === "castle" && (x & 1) === 0 && h > 0.25){
          const mh = 0.14 + frac(h*9.1)*0.3, tilt = (frac(h*5.3) - 0.5)*0.25;
          stone(b.wall, box(0.6, mh, 0.62, x + 0.5, WH + mh/2 - 0.02, y + 0.55, 0, 0, tilt), cW, cTop, 0.95);
          if(h > 0.8) stone(b.wall, box(0.24, 0.12, 0.2, x + 0.5 + (h - 0.9)*3, WH + mh + 0.04, y + 0.6, h*3, h*5, 0), cW, cTop, 0.9);
        }
        // the Gloom: shelf fungus and dead moss hanging over the lip
        if(gl >= 0.45 && h < gl*0.55){
          const P = K.part;
          if(h < 0.22){ for(let k=0;k<3;k++){ const r = 0.12 - k*0.025; P(b.parts, new THREE.CylinderGeometry(r, r*0.5, 0.04, 10, 1, false, 0, PI), 0x4a4440, x + 0.3 + k*0.18, WH - 0.25 - k*0.22, y + 1.0, 0, -PI/2, 0); P(b.lit, new THREE.TorusGeometry(r*0.9, 0.012, 3, 10, PI), th.torch, x + 0.3 + k*0.18, WH - 0.27 - k*0.22, y + 1.0, PI/2, 0, 0); } }
          else for(let k=0;k<4;k++){ const l = 0.25 + frac(h*(k + 3)*7.7)*0.5; P(b.parts, new THREE.ConeGeometry(0.045, l, 4), 0x2e3428, x + 0.15 + k*0.23, WH - l/2 + 0.02, y + 1.03, PI); }
        }
      }
    }
  }
  (W.capGlows || []).forEach(c=>{ const sp = K.sprite(c.c, c.s || 1.4, 0.3); sp.position.set(c.x, c.y, c.z); W.areaGroup(c.area).add(sp); });
  for(const id in buckets){
    const b = buckets[id], g = W.areaGroup(+id);
    if(b.floor.length){ const m = new THREE.Mesh(K.merge(b.floor), W.mats.floor); g.add(m); }
    if(b.wall.length) g.add(new THREE.Mesh(K.merge(b.wall), W.mats.wall));
    if(b.plain.length) g.add(new THREE.Mesh(K.merge(b.plain), W.mats.plain));
    if(b.parts.children.length){ g.add(b.parts); K.bake(b.parts, { w:0.02 }); }
    if(b.lit.children.length){ g.add(b.lit); K.bake(b.lit, { mat:W.mats.lit, outline:false }); }
  }
};

/* ---- the shapes things take (shared with the decor: decor.js) ---- */
const deadTree = (...a)=> DG.Decor.deadTree(...a), glowcap = (...a)=> DG.Decor.glowcap(...a), crate = (...a)=> DG.Decor.crate(...a);
const skull = (P, g, x, y, z, r, ry, col)=> DG.Decor.skull(g, x, y, z, r, ry, 0, col);

/* a lone block, in the room's style: a column (cracked, banded, broken, or
   ringed with skulls in the crypt), a stack of rotten crates, a leaning
   gravestone, a glowcap, or a dead tree */
proto.pillar = function(b, x, y, st, h, a, cW, cTop){
  const W = this, D = W.D, th = W.th, gl = th.gloom || 0, P = K.part, cx = x + 0.5, cz = y + 0.5;
  const h2 = frac(h*7.31 + 0.2), h3 = frac(h*13.7 + 0.5);
  if(st === "crates"){
    const wood = [0x3e2c1e, 0x36281c, 0x44301e][Math.floor(h2*3)];
    crate(P, b.parts, 0.84, cx, 0, cz, (h - 0.5)*0.3, wood);
    if(h3 < 0.5) crate(P, b.parts, 0.56, cx + (h2 - 0.5)*0.2, 0.78, cz + (h - 0.5)*0.2, h*4, wood);
    else if(h3 < 0.7) skull(P, b.parts, cx + 0.1, 0.78, cz + 0.05, 0.1, h*6);
    else { P(b.parts, new THREE.SphereGeometry(0.2, 10, 8), 0x4a3e2c, cx - 0.12, 0.92, cz, 0, 0, 0.3, 1.2, 0.7, 0.9); P(b.parts, new THREE.CylinderGeometry(0.04, 0.06, 0.1, 6), 0x4a3e2c, cx - 0.24, 1.04, cz, 0, 0, 0.6); }
  } else if(st === "graves"){
    // a leaning gravestone on a sunken slab, or a stone cross
    const sc = 0x56565c, lean = (h2 - 0.5)*0.32, tw = (h3 - 0.5)*0.4;
    stone(b.wall, box(0.78, 0.1, 0.6, cx, 0.05, cz + 0.05), cW, cTop, 0.75);
    if(h < 0.35){
      stone(b.wall, box(0.14, 1.05, 0.14, cx, 0.6, cz - 0.1, 0, tw, lean), cW, cW, 1.1);
      stone(b.wall, box(0.56, 0.13, 0.14, cx - Math.sin(lean)*0.55, 0.85, cz - 0.1, 0, tw, lean), cW, cW, 1.1);
      P(b.parts, new THREE.TorusGeometry(0.16, 0.03, 4, 14), sc, cx - Math.sin(lean)*0.55, 0.85, cz - 0.1, 0, tw, lean);
    } else {
      const g = new THREE.BoxGeometry(0.58, 0.7, 0.15); g.translate(0, 0.35, 0);
      const top = new THREE.CylinderGeometry(0.29, 0.29, 0.15, 14, 1, false, 0, PI); top.rotateX(PI/2); top.rotateZ(PI/2); top.translate(0, 0.7, 0);
      [g, top].forEach(q=>{ q.rotateZ(lean); q.rotateY(tw); q.translate(cx, 0.06, cz - 0.08); stone(b.wall, q, cW, cW, 1.05); });
      // a carved cross, and a crack through it
      P(b.parts, new THREE.BoxGeometry(0.04, 0.26, 0.02), 0x1a1a1e, cx - Math.sin(lean)*0.5, 0.56, cz, 0, tw, lean);
      P(b.parts, new THREE.BoxGeometry(0.16, 0.04, 0.02), 0x1a1a1e, cx - Math.sin(lean)*0.55, 0.6, cz, 0, tw, lean);
    }
    for(let k=0;k<3;k++) P(b.parts, new THREE.ConeGeometry(0.03, 0.16 + k*0.04, 3), 0x3a4232, cx - 0.28 + k*0.22, 0.12, cz + 0.22, (k - 1)*0.3, 0, 0.2);
  } else if(gl >= 0.75 && h < (gl - 0.5)*0.9){
    const col = [0x4ab8e8, 0x3ad0c8, 0x6a8aff, 0x8ae0ff][Math.floor(h2*4)];
    const c = glowcap(P, b.parts, b.lit, cx, cz, 1.2 + h3*0.45, 0.46, col, h);
    const gr = DG.Dungeon.roomAt(D, cx, cz);
    if(gr) W.lights.push({ x:c.x, y:c.y + 0.2, z:c.z, c:col, i:0.8, room:gr.id, ph:h*6, small:true });
    (W.capGlows = W.capGlows || []).push({ x:c.x, y:c.y, z:c.z, c:col, area:+a, s:1.5 });
  } else if(gl >= 0.9){
    deadTree(P, b.parts, cx, cz, 1.5 + h2*0.6, 0.15, h);
  } else if(th.decor === "crypt"){
    // the crypt: a squat column banded with skulls set into the stone
    stone(b.wall, box(0.96, 0.2, 0.96, cx, 0.1, cz), cW, cTop, 0.85);
    stone(b.wall, new THREE.CylinderGeometry(0.36, 0.4, 1.4, 8).rotateY(PI/8).translate(cx, 0.85, cz), cW, cTop, 1);
    stone(b.wall, box(0.92, 0.16, 0.92, cx, 1.6, cz), cW, cTop, 0.95);
    for(let k=0;k<6;k++){ const an = k/6*PI*2 + h; skull(P, b.parts, cx + Math.sin(an)*0.36, 0.86, cz + Math.cos(an)*0.36, 0.085, an, 0xa89c84); }
    P(b.parts, new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8), 0x1a1a20, cx, 1.08, cz, 0, PI/8, 0);
    P(b.parts, new THREE.CylinderGeometry(0.42, 0.42, 0.04, 8), 0x1a1a20, cx, 0.74, cz, 0, PI/8, 0);
  } else {
    // a column: plinth, a cracked octagonal shaft, a capital; some banded in
    // iron, some broken off and lying in pieces
    const broken = h2 < 0.28, sh = broken ? 0.55 + h3*0.5 : 1.3;
    stone(b.wall, box(0.98, 0.18, 0.98, cx, 0.09, cz), cW, cTop, 0.8);
    stone(b.wall, box(0.84, 0.12, 0.84, cx, 0.24, cz), cW, cTop, 0.9);
    stone(b.wall, new THREE.CylinderGeometry(0.33, 0.36, sh, 8).rotateY(PI/8).translate(cx, 0.3 + sh/2, cz), cW, cTop, 1);
    if(!broken){
      stone(b.wall, box(0.82, 0.1, 0.82, cx, 1.65, cz), cW, cTop, 0.95);
      stone(b.wall, box(0.94, 0.14, 0.94, cx, 1.77, cz), cW, cTop, 1);
    } else {
      // the break: a jagged top, and the rest of it on the floor
      for(let k=0;k<3;k++) stone(b.wall, box(0.26, 0.18 + k*0.06, 0.24, cx + (k - 1)*0.18, 0.3 + sh + 0.05, cz + (h3 - 0.5)*0.2, h*k, h*3 + k, (k - 1)*0.4), cW, cTop, 0.9);
      for(let k=0;k<3;k++) stone(b.wall, box(0.16 + k*0.04, 0.12, 0.18, cx + Math.cos(h*9 + k*2)*0.42, 0.06, cz + Math.sin(h*9 + k*2)*0.42, 0, h*7 + k, 0.2), cW, cTop, 0.8);
    }
    if(th.decor === "castle" && h3 > 0.45){
      // an iron band, riveted
      const by = 0.3 + Math.min(sh, 1.3)*0.55;
      P(b.parts, new THREE.CylinderGeometry(0.375, 0.375, 0.09, 8), 0x26262a, cx, by, cz, 0, PI/8, 0);
      for(let k=0;k<8;k++){ const an = k/8*PI*2 + PI/8; P(b.parts, new THREE.SphereGeometry(0.022, 4, 3), 0x4a4a50, cx + Math.cos(an)*0.385, by, cz + Math.sin(an)*0.385); }
      P(b.parts, new THREE.TorusGeometry(0.07, 0.015, 4, 10), 0x2e2e32, cx, by - 0.1, cz + 0.39, 0, 0, 0);
    }
    if(th.decor === "undercroft"){
      // mould creeping up from the floor, and shelf fungus
      for(let k=0;k<4;k++){ const an = h*7 + k*1.7, r = 0.06 + frac(h*(k + 3)*5.1)*0.06; P(b.parts, K.lump(r, 1, 0.45, h*9 + k), [0x5a4e3a, 0x4a4234, 0x3e4436][k % 3], cx + Math.cos(an)*0.36, 0.4 + k*0.24, cz + Math.sin(an)*0.36, 0, an, 0, 1.3, 0.45, 1.3); }
    }
  }
};

/* a 2x2 obstacle, in the room's style: a crate stack, a giant glowcap,
   a great dead tree, a sarcophagus, a ruined knight on his plinth, or a
   broad pier of stone */
proto.bigBlock = function(b, x, y, st, h, a, cW, cTop){
  const W = this, th = W.th, gl = th.gloom || 0, P = K.part, cx = x + 1, cz = y + 1;
  const h2 = frac(h*7.31 + 0.2), h3 = frac(h*13.7 + 0.5);
  if(st === "crates"){
    const wood = [0x3e2c1e, 0x36281c, 0x44301e][Math.floor(h2*3)];
    crate(P, b.parts, 0.9, cx - 0.45, 0, cz - 0.42, 0.05, wood);
    crate(P, b.parts, 0.86, cx + 0.46, 0, cz - 0.4, -0.08, wood);
    crate(P, b.parts, 0.88, cx - 0.4, 0, cz + 0.46, 0.12, wood);
    crate(P, b.parts, 0.7, cx - 0.1, 0.84, cz - 0.2, h*3, wood);
    // a burst sack, and a body somebody shoved in the corner
    P(b.parts, K.sculpt(K.slathe([[0, 0], [0.3, 0.05], [0.34, 0.25], [0.22, 0.48], [0.08, 0.56], [0, 0.56]], 10, 3), 0.03, 7, h*9), 0x4a3e2c, cx + 0.5, 0, cz + 0.5, 0.2, h, 0.1);
    skull(P, b.parts, cx + 0.42, 0.52, cz + 0.62, 0.11, -0.3);
  } else if(gl >= 0.75 && h < (gl - 0.5)*1.4){
    // a giant glowcap, with a few lesser ones at its foot
    const col = [0x4ab8e8, 0x3ad0c8, 0x6a8aff, 0x8ae0ff][Math.floor(h2*4)];
    const c = glowcap(P, b.parts, b.lit, cx, cz, 1.6 + h3*0.4, 0.92, col, h);
    for(let k=0;k<3;k++){ const an = h*9 + k*2.1, r = 0.75; glowcap(P, b.parts, b.lit, cx + Math.cos(an)*r, cz + Math.sin(an)*r, 0.3 + k*0.14, 0.17, col, h + k); }
    P(b.parts, new THREE.CylinderGeometry(0.9, 1.0, 0.1, 14), 0x1e2420, cx, 0.05, cz);
    const gr = DG.Dungeon.roomAt(W.D, cx, cz);
    if(gr) W.lights.push({ x:c.x, y:c.y + 0.3, z:c.z, c:col, i:1.1, room:gr.id, ph:h*6, small:true });
    (W.capGlows = W.capGlows || []).push({ x:c.x, y:c.y, z:c.z, c:col, area:+a, s:2.6 });
  } else if(gl >= 0.9){
    // a great dead tree, and the remains of someone the forest took
    deadTree(P, b.parts, cx, cz, 2.0 + h2*0.4, 0.3, h);
    const an = h*11, bx = cx + Math.cos(an)*0.62, bz = cz + Math.sin(an)*0.62;
    skull(P, b.parts, bx, 0.02, bz, 0.1, an + PI/2, 0x9a9484);
    for(let k=0;k<4;k++) P(b.parts, new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), 0x9a9484, bx + (k - 1.5)*0.1, 0.03, bz + 0.15, PI/2, 0, k*0.6);
    for(let k=0;k<3;k++){ const a2 = h*5 + k*2.2; P(b.parts, new THREE.CylinderGeometry(0.17, 0.09, 0.04, 10, 1, false, 0, PI), 0x5a5048, cx + Math.cos(a2)*0.32, 0.6 + k*0.3, cz + Math.sin(a2)*0.32, 0, -a2 + PI/2, 0); }
  } else if(th.decor === "crypt"){
    // a sarcophagus with its knight carved on the lid, candles burnt low at its head
    stone(b.wall, box(1.9, 0.14, 1.9, cx, 0.07, cz), cW, cTop, 0.75);
    stone(b.wall, box(1.1, 0.7, 1.7, cx, 0.49, cz), cW, cTop, 1);
    stone(b.wall, box(1.24, 0.12, 1.84, cx, 0.9, cz), cW, cTop, 1.1);
    [-1, 1].forEach(s=> stone(b.wall, box(0.1, 0.5, 1.5, cx + s*0.56, 0.45, cz), cW, cTop, 0.8));
    const ef = 0x6a6a72;
    P(b.parts, K.slathe([[0, 0], [0.2, 0.05], [0.22, 0.4], [0.16, 0.75], [0.12, 0.95], [0, 1.0]], 10, 3), ef, cx, 1.05, cz + 0.55, -PI/2, 0, 0, 1.1, 1, 0.55);
    P(b.parts, new THREE.SphereGeometry(0.13, 10, 8), ef, cx, 1.08, cz - 0.58);
    P(b.parts, new THREE.BoxGeometry(0.06, 0.04, 0.9), 0x7a7a82, cx, 1.18, cz + 0.1);
    P(b.parts, new THREE.BoxGeometry(0.26, 0.04, 0.05), 0x7a7a82, cx, 1.18, cz - 0.28);
    // a crack, and the lid shoved a little askew
    P(b.parts, new THREE.BoxGeometry(1.2, 0.02, 0.03), 0x101014, cx, 0.97, cz + 0.2, 0, 0.3, 0);
    for(let k=0;k<3;k++){ const ch = 0.12 + k*0.06, px = cx - 0.42 + k*0.12, pz = cz - 0.78; P(b.parts, new THREE.CylinderGeometry(0.035, 0.04, ch, 7), 0xd8ccae, px, 0.96 + ch/2, pz); P(b.parts, new THREE.SphereGeometry(0.05, 6, 4), 0xcfc2a0, px, 0.97, pz, 0, 0, 0, 1.4, 0.3, 1.4); P(b.lit, new THREE.ConeGeometry(0.02, 0.06, 4), 0xffd890, px, 1.0 + ch, pz); (W.capGlows = W.capGlows || []).push({ x:px, y:1.02 + ch, z:pz, c:0xffa850, area:+a, s:0.45 }); }
    const gr = DG.Dungeon.roomAt(W.D, cx, cz);
    if(gr) W.lights.push({ x:cx - 0.3, y:1.5, z:cz - 0.6, c:0xffa040, i:0.6, room:gr.id, ph:h*6, small:true });
  } else if(th.decor === "castle" && h2 < 0.6){
    // a knight on a plinth, his sword planted; time has taken an arm or his head
    stone(b.wall, box(1.9, 0.2, 1.9, cx, 0.1, cz), cW, cTop, 0.75);
    stone(b.wall, box(1.5, 0.5, 1.5, cx, 0.45, cz), cW, cTop, 0.95);
    stone(b.wall, box(1.64, 0.1, 1.64, cx, 0.75, cz), cW, cTop, 1);
    const sc = 0x6e6a66, dk = 0x4e4a48, y0 = 0.8, P2 = (geo, c, ...r)=> P(b.parts, geo, c, ...r);
    [-1, 1].forEach(s=>{ P2(new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8), sc, cx + s*0.13, y0 + 0.25, cz); P2(new THREE.BoxGeometry(0.14, 0.08, 0.24), dk, cx + s*0.13, y0 + 0.04, cz + 0.04); });
    P2(K.tatter(new THREE.CylinderGeometry(0.22, 0.32, 0.5, 14, 3, true), -0.05, 9, 0.12, h*7), dk, cx, y0 + 0.45, cz);
    P2(K.slathe([[0.2, 0], [0.25, 0.12], [0.27, 0.32], [0.3, 0.45], [0.12, 0.55], [0, 0.56]], 10, 3), sc, cx, y0 + 0.48, cz, 0, 0, 0, 1, 1, 0.75);
    [-1, 1].forEach(s=> P2(new THREE.SphereGeometry(0.13, 8, 6), sc, cx + s*0.3, y0 + 0.92, cz, 0, 0, 0, 1, 0.8, 1));
    // the sword, point down, both hands on the pommel (one arm broken away)
    P2(new THREE.BoxGeometry(0.07, 0.75, 0.025), 0x5a5a60, cx, y0 + 0.38, cz + 0.32);
    P2(new THREE.BoxGeometry(0.34, 0.05, 0.06), dk, cx, y0 + 0.77, cz + 0.32);
    P2(new THREE.SphereGeometry(0.05, 6, 4), dk, cx, y0 + 0.86, cz + 0.32);
    P2(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 7), sc, cx - 0.22, y0 + 0.76, cz + 0.16, 0.6, 0, -0.35);
    if(h3 < 0.5) P2(new THREE.CylinderGeometry(0.06, 0.05, 0.42, 7), sc, cx + 0.22, y0 + 0.76, cz + 0.16, 0.6, 0, 0.35);
    else P2(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 7), sc, cx + 0.62, 0.84, cz + 0.4, PI/2, 0.7, 0);
    if(h3 > 0.25){
      // the great helm, slit for eyes
      P2(K.slathe([[0.14, 0], [0.16, 0.12], [0.15, 0.26], [0.1, 0.33], [0, 0.35]], 10, 3), sc, cx, y0 + 1.0, cz);
      P2(new THREE.BoxGeometry(0.22, 0.025, 0.04), 0x101012, cx, y0 + 1.18, cz + 0.14);
    } else P2(K.slathe([[0.14, 0], [0.16, 0.12], [0.15, 0.26], [0.1, 0.33], [0, 0.35]], 10, 3), sc, cx + 0.55, 0.85, cz - 0.5, 1.2, 0, 0.4);
    // the rubble of him, at his feet
    for(let k=0;k<4;k++) stone(b.wall, box(0.12 + k*0.03, 0.08, 0.14, cx + Math.cos(h*9 + k*1.7)*0.6, 0.84, cz + Math.sin(h*9 + k*1.7)*0.6, 0, h*5 + k, 0.1), cW, cTop, 0.85);
  } else if(th.decor === "undercroft" && h2 < 0.5){
    // a cistern: a low ring of stone round black water, slime over its lip,
    // and something's hand above the surface
    const oct = (r, h, y)=> new THREE.CylinderGeometry(r, r, h, 8).rotateY(PI/8).translate(cx, y, cz);
    stone(b.wall, oct(0.98, 0.14, 0.07), cW, cTop, 0.75);
    for(let k=0;k<8;k++){ const an = k/8*PI*2 + PI/4, r = 0.8; stone(b.wall, box(0.62, 0.62, 0.22, cx + Math.cos(an)*r, 0.45, cz + Math.sin(an)*r, 0, -an + PI/2, 0), cW, cTop, 0.9 + frac(h*(k + 1)*3.3)*0.2); }
    for(let k=0;k<8;k++){ const an = k/8*PI*2 + PI/4, r = 0.8; stone(b.wall, box(0.68, 0.08, 0.3, cx + Math.cos(an)*r, 0.8, cz + Math.sin(an)*r, 0, -an + PI/2, (frac(h*k*7.7) - 0.5)*0.08), cW, cTop, 1.05); }
    const water = new THREE.CircleGeometry(0.7, 16); water.rotateX(-PI/2); water.translate(cx, 0.62, cz); b.plain.push(K.paint(water, 0x0c140e));
    P(b.parts, K.sculpt(new THREE.SphereGeometry(0.55, 14, 6, 0, PI*2, 0, PI/2), 0.06, 6, h*5), 0x24301e, cx + 0.2, 0.6, cz + 0.1, 0, 0, 0, 1, 0.04, 1);
    // a bony hand reaching out of the water
    const hx = cx + (h2 - 0.5)*0.5, hz = cz + (h3 - 0.5)*0.4;
    DG.Decor.rod(b.parts, [hx, 0.55, hz], [hx + 0.05, 0.95, hz + 0.08], 0.03, 0x6a5e4c);
    for(let k=0;k<4;k++) DG.Decor.rod(b.parts, [hx + 0.05, 0.95, hz + 0.08], [hx + 0.02 + k*0.03, 1.08 + (k === 1 || k === 2 ? 0.04 : 0), hz + 0.14 + (k === 0 ? 0.03 : 0)], 0.01, 0x8a7e66);
    for(let k=0;k<3;k++){ const an = h*9 + k*2.2; P(b.parts, new THREE.BoxGeometry(0.04, 0.4 + k*0.1, 0.02), 0x24302a, cx + Math.cos(an)*0.92, 0.45, cz + Math.sin(an)*0.92, 0, -an + PI/2, 0); }
    for(let k=0;k<5;k++){ const an = h*4 + k*1.3, r = 0.05 + frac(h*(k + 2)*3.7)*0.05; P(b.parts, K.lump(r, 1, 0.45, h*9 + k), [0x5a4e3a, 0x4a4234][k % 2], cx + Math.cos(an)*0.92, 0.25 + k*0.1, cz + Math.sin(an)*0.92, 0, an, 0, 1.3, 0.45, 1.3); }
  } else {
    // a broad pier: octagonal, on a stepped plinth, banded in iron in the keep
    const oct = (r, h, y)=> new THREE.CylinderGeometry(r, r*1.02, h, 8).rotateY(PI/8).translate(cx, y, cz);
    stone(b.wall, oct(0.99, 0.2, 0.1), cW, cTop, 0.8);
    stone(b.wall, oct(0.9, 0.12, 0.26), cW, cTop, 0.9);
    stone(b.wall, oct(0.78, 1.16, 0.9), cW, cTop, 1);
    stone(b.wall, oct(0.86, 0.1, 1.53), cW, cTop, 0.95);
    stone(b.wall, oct(0.94, 0.12, 1.64), cW, cTop, 1);
    // its top has crumbled: loose stones, a skull someone left
    for(let k=0;k<3;k++) stone(b.wall, box(0.24 + k*0.05, 0.12, 0.2, cx + Math.cos(h*9 + k*2.1)*0.45, 1.76, cz + Math.sin(h*9 + k*2.1)*0.45, 0, h*5 + k, 0.08), cW, cTop, 0.85);
    if(h3 < 0.5) skull(P, b.parts, cx - 0.1, 1.7, cz + 0.2, 0.1, h*6);
    if(th.decor === "undercroft") for(let k=0;k<6;k++){ const an = h*4 + k*1.1, r = 0.05 + frac(h*(k + 2)*3.7)*0.06; P(b.parts, K.lump(r, 1, 0.45, h*9 + k), [0x5a4e3a, 0x4a4234, 0x3e4436][k % 3], cx + Math.cos(an)*0.82, 0.4 + k*0.17, cz + Math.sin(an)*0.82, 0, an, 0, 1.3, 0.45, 1.3); }
    if(th.decor === "castle"){
      [0.62, 1.3].forEach(by=>{
        P(b.parts, new THREE.CylinderGeometry(0.8, 0.8, 0.09, 8), 0x26262a, cx, by, cz, 0, PI/8, 0);
        for(let k=0;k<8;k++){ const an = k/8*PI*2 + PI/8; P(b.parts, new THREE.SphereGeometry(0.03, 4, 3), 0x4a4a50, cx + Math.cos(an)*0.82, by, cz + Math.sin(an)*0.82); }
      });
      P(b.parts, K.tube([[cx - 0.3, 1.25, cz + 0.76], [cx - 0.15, 0.9, cz + 0.82], [cx, 1.25, cz + 0.76]], 0.018, 8, 4), 0x3a3a3e);
      [-0.3, 0].forEach(o=> P(b.parts, new THREE.TorusGeometry(0.06, 0.016, 4, 10), 0x2e2e32, cx + o, 1.18, cz + 0.8));
    }
  }
};

/* one wall tile: full height, or low on a room's south side so it never
   hides Zippy. Every face that looks onto open ground gets a plinth, a
   cornice (or a capping stone), and a stone or two that juts out. */
proto.wallBlock = function(x, y, low){
  const W = this, D = W.D, th = W.th, hh = low ? LOW : WH, out = [];
  const cW = new THREE.Color(th.wall).multiplyScalar(1.2), cTop = new THREE.Color(th.top).multiplyScalar(1.2);
  const h = hash2(x, y), tone = 0.85 + h*0.25;
  stone(out, box(1, hh, 1, x + 0.5, hh/2, y + 0.5), cW, cTop, tone);
  DG.DIRS4.forEach(([dx, dy], f)=>{
    if(!walkable(D.at(x + dx, y + dy))) return;
    const fx = x + 0.5 + dx*0.5, fz = y + 0.5 + dy*0.5, alongX = dx === 0;
    const B = (w, bh, o, u, py, k)=>{
      const g = box(alongX ? w : o, bh, alongX ? o : w, fx + dx*o/2 + (alongX ? u : 0), py, fz + dy*o/2 + (alongX ? 0 : u));
      stone(out, g, cW, cTop, k*tone);
    };
    B(1, low ? 0.14 : 0.2, 0.08, 0, low ? 0.07 : 0.1, 0.8);
    if(!low){ B(1, 0.1, 0.1, 0, WH - 0.05, 1.05); B(1, 0.05, 0.05, 0, WH - 0.125, 0.85); }
    else B(1, 0.07, 0.045, 0, LOW - 0.035, 1.05);
    if(low) return;
    // stones that have shifted out of true
    const n = Math.floor(hash2(x*3.1 + f, y*5.7 - f)*3);
    for(let k=0;k<n;k++){
      const q = hash2(x*7.7 + k*3.3 + f, y*1.9 - k*5.1), row = 1 + Math.floor(q*4), u = (hash2(x + k*9.1, y*3.3 + f) - 0.5)*0.55;
      B(0.22 + q*0.2, 0.2, 0.025 + frac(q*31)*0.03, u, 0.18 + row*0.25, 0.9 + frac(q*17)*0.2);
    }
  });
  return out;
};

/* ---- ponds and pools: an animated surface ---- */
proto.buildWater = function(){
  const W = this, D = W.D, by = {};
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    if(D.at(x, y) !== T.WATER) continue;
    const a = W.area[y*D.w + x]; if(a < 0) continue;
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, -0.12, y + 0.5);
    (by[a] = by[a] || []).push(g);
  }
  const col = new THREE.Color(W.th.water || 0x2a8a7a);
  W.waterMat = new THREE.ShaderMaterial({
    uniforms:{ uTime:{ value:0 }, uCol:{ value:col } }, transparent:true, depthWrite:false,
    vertexShader:"varying vec2 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader:["uniform float uTime; uniform vec3 uCol; varying vec2 vW;",
      "void main(){ float r = sin(vW.x*3.1 + uTime*1.3)*sin(vW.y*2.7 - uTime*1.1) + sin((vW.x + vW.y)*5.0 + uTime*2.0)*0.5;",
      "  float hi = smoothstep(0.75, 1.2, r);",
      "  gl_FragColor = vec4(uCol*(0.7 + 0.3*r) + vec3(hi*0.5), 0.72); }"].join("\n")
  });
  K.timed.push(W.waterMat);
  for(const a in by) W.areaGroup(+a).add(new THREE.Mesh(K.merge(by[a]), W.waterMat));
};

/* ---- portcullises: blackened iron, rusting, riveted where the bars cross,
   spiked at the foot; in the deep Gloom, brambles knotted round old bones ---- */
proto.buildDoors = function(){
  const W = this, P = K.part, Dc = DG.Decor;
  const bramble = (W.th.gloom || 0) >= 0.7;
  W.D.doors.forEach(d=>{
    const g = new THREE.Group(), rr = W.rnd;
    const along = d.axis === "v" ? "z" : "x";
    const at = (o, y, n)=> along === "x" ? [o, y, n || 0] : [n || 0, y, o];
    if(bramble){
      // thorny roots knotted across the doorway, bones caught in them
      for(let i=0;i<7;i++){
        const o = -1.35 + i*0.45, pts = [];
        for(let k=0;k<=5;k++){ const y = k/5*WH, w = Math.sin(k*1.7 + i)*0.2; pts.push(at(o + w, y, (rr() - 0.5)*0.25)); }
        P(g, K.tube(pts, 0.055 + rr()*0.03, 12, 6), [0x2a1e16, 0x221812][i % 2]);
        for(let k=0;k<7;k++){ const p = pts[Math.floor(rr()*5)], q = rr()*6.28; P(g, new THREE.ConeGeometry(0.03, 0.2, 4), 0x4a3e2a, p[0] + (rr() - 0.5)*0.1, p[1] + rr()*0.3, p[2] + (rr() - 0.5)*0.1, Math.cos(q)*1.4, 0, Math.sin(q)*1.4); }
      }
      for(const yy of [0.4, 0.95, 1.45]){ const pts = [-1.55, -0.5, 0.5, 1.55].map((o, k)=> at(o, yy + Math.sin(k*2 + yy)*0.14, (rr() - 0.5)*0.15)); P(g, K.tube(pts, 0.05, 14, 6), 0x241a14); }
      Dc.skull(g, ...at(-0.3 + rr()*0.6, 0.85, 0.12), 0.09, 0, 0.3, 0x9a9484);
      Dc.bone(g, at(0.5, 1.2, 0.1), at(0.9, 1.0, 0.12), 0.018, 0x9a9484);
      K.bake(g, { w:0.018 });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), new THREE.MeshBasicMaterial({ color:0xc83a8a, transparent:true, opacity:0 }));
      glow.rotation.x = -PI/2; glow.position.y = 0.03; if(along === "z") glow.rotation.z = PI/2; g.add(glow);
      g.position.set(d.x, -WH - 0.1, d.y);
      const a = W.area[(d.y - 0.5)*W.D.w + (d.x - 0.5)];
      W.areaGroup(a >= 0 ? a : d.room).add(g);
      W.doors.push({ d, g, glow, h:-WH - 0.1 });
      return;
    }
    const iron = [0x26262a, 0x2c2a2a, 0x302824];
    for(let i=0;i<9;i++){
      const o = -1.4 + i*0.35, c = iron[Math.floor(rr()*3)];
      P(g, new THREE.CylinderGeometry(0.045, 0.045, WH - 0.05, 6), c, ...at(o, WH/2 + 0.02));
      P(g, new THREE.ConeGeometry(0.06, 0.24, 4), c, ...at(o, -0.08), PI);
      // rust running down from where the rails cross
      P(g, new THREE.CylinderGeometry(0.047, 0.047, 0.25 + rr()*0.3, 6), 0x5a3020, ...at(o, 0.32 - rr()*0.1));
    }
    for(const yy of [0.35, 0.95, 1.5]){
      P(g, new THREE.BoxGeometry(along === "x" ? 3.1 : 0.12, 0.11, along === "z" ? 3.1 : 0.12), 0x222224, 0, yy, 0);
      for(let i=0;i<9;i++) P(g, new THREE.SphereGeometry(0.035, 5, 4), 0x4a4446, ...at(-1.4 + i*0.35, yy, 0.07));
    }
    // a chain hanging from it, cut
    for(let k=0;k<5;k++) P(g, new THREE.TorusGeometry(0.04, 0.012, 3, 8), 0x3a3a3e, ...at(1.2, 1.2 - k*0.08, 0.09), 0, k % 2 ? PI/2 : 0, 0);
    K.bake(g, { w:0.016 });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), new THREE.MeshBasicMaterial({ color:0xc82a1a, transparent:true, opacity:0 }));
    glow.rotation.x = -PI/2; glow.position.y = 0.03; if(along === "z") glow.rotation.z = PI/2;
    g.add(glow);
    g.position.set(d.x, -WH - 0.1, d.y);
    const a = W.area[(d.y - 0.5)*W.D.w + (d.x - 0.5)];
    W.areaGroup(a >= 0 ? a : d.room).add(g);
    W.doors.push({ d, g, glow, h:-WH - 0.1 });
  });
};

/* ---- illusionary walls ---- */
/* an illusion is built exactly like the wall around it (same height, same
   paint, same plinth and cornice), so only a sharp eye or a stray shot finds it */
proto.buildFakes = function(){
  const W = this, th = W.th, D = W.D;
  W.D.fakes.forEach(f=>{
    const parts = [], r = D.rooms[f.room];
    f.tiles.forEach(([x, y])=>{
      const low = y === r.y2 + 1 && x >= r.x1 && x <= r.x2;
      parts.push(...W.wallBlock(x, y, low));
    });
    const m = new THREE.Mesh(K.merge(parts), K.ink({ map:stoneTex(), gloom:"wall" }));
    const a = W.area[f.tiles[0][1]*W.D.w + f.tiles[0][0]];
    W.areaGroup(a >= 0 ? a : f.room).add(m);
    W.fakes.push({ f, m, t:0 });
  });
};

/* ---- false doors: they look like every other heavy door in the place (a
   stone arch, iron-strapped planks, a ring) until you walk into one. The
   one tell, for a sharp eye: a hairline crack where the paint shows bare
   stone. Puzzle doors hang a coloured rag over the arch; a wrong one gets
   an X scratched across it. ---- */
const doorTex = {};
function paintedDoorTex(mark){
  const k = mark || "plain";
  if(doorTex[k]) return doorTex[k];
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 96; const g = cv.getContext("2d");
  g.fillStyle = "#2a1c12"; g.fillRect(0, 0, 64, 96);
  for(let i=0;i<5;i++){
    const x = 2 + i*12.4, v = 52 + (i*37 % 23);
    g.fillStyle = "rgb(" + v + "," + Math.round(v*0.68) + "," + Math.round(v*0.45) + ")"; g.fillRect(x, 0, 11.4, 96);
    g.fillStyle = "rgba(0,0,0,.35)"; for(let j=0;j<6;j++) g.fillRect(x + 2 + (j*7 % 8), 6 + j*15, 1, 9);
  }
  g.fillStyle = "#1c1a1c"; [16, 64].forEach(y=>{ g.fillRect(0, y, 64, 7); g.fillStyle = "#3a3640"; for(let x=4;x<64;x+=10) g.fillRect(x, y + 2, 3, 3); g.fillStyle = "#1c1a1c"; });
  g.strokeStyle = "#4a4448"; g.lineWidth = 3; g.beginPath(); g.arc(46, 46, 6, 0, Math.PI*2); g.stroke();
  // the tell: a hairline crack, bare stone under the paint
  g.strokeStyle = "rgba(150,146,140,.55)"; g.lineWidth = 1; g.beginPath(); g.moveTo(22, 30); g.lineTo(25, 41); g.lineTo(21, 50); g.lineTo(26, 63); g.stroke();
  if(mark === "x"){ g.strokeStyle = "rgba(220,210,190,.85)"; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 14); g.lineTo(54, 86); g.moveTo(54, 14); g.lineTo(10, 86); g.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  return doorTex[k] = t;
}
proto.buildPainted = function(){
  const W = this, th = W.th, cTop = new THREE.Color(th.top).multiplyScalar(1.1).getHex(), cW = new THREE.Color(th.wall).multiplyScalar(1.05).getHex();
  W.painted = [];
  W.D.painted.forEach(p=>{
    const a = W.area[p.y*W.D.w + p.x], grp = W.areaGroup(a >= 0 ? a : p.room);
    const cx = p.x + 0.5, z = p.y + 1;
    // the arch, standing proud of the wall like the real doorways'
    const arch = new THREE.Group(), P = K.part;
    [-1, 1].forEach(sd=> P(arch, new THREE.BoxGeometry(0.16, 1.45, 0.16), cW, cx + sd*0.5, 0.725, z + 0.06));
    P(arch, new THREE.TorusGeometry(0.5, 0.09, 8, 18, Math.PI), cTop, cx, 1.42, z + 0.06);
    P(arch, new THREE.BoxGeometry(1.2, 0.12, 0.2), cTop, cx, 0.06, z + 0.08);
    P(arch, new THREE.BoxGeometry(0.12, 0.12, 0.12), 0x6a6a72, cx, 1.95, z + 0.07);
    if(p.kind !== "bonk"){
      // a puzzle door: a rag of its colour hangs over the arch
      const c = new THREE.Color(p.color).multiplyScalar(0.7);
      P(arch, new THREE.PlaneGeometry(0.42, 0.5), c.getHex(), cx, 1.62, z + 0.17);
    }
    K.bake(arch, { w:0.012 });
    grp.add(arch);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.42), K.ink({ vertexColors:false, map:paintedDoorTex() }));
    m.position.set(cx, 0.71, z + 0.012);
    grp.add(m);
    W.painted.push({ p, m });
  });
};
proto.markPainted = function(i){
  const P = this.painted.find(o=> o.p.kind === "trick" && o.p.puzzle === i);
  if(P){ P.m.material.map = paintedDoorTex("x"); P.m.material.needsUpdate = true; }
};

/* ---- torches on north walls ---- */
proto.buildTorches = function(){
  const W = this, D = W.D;
  D.rooms.forEach(r=>{
    const y = r.y1 - 1, step = 5, off = (r.x1 + r.id) % step;
    for(let x=r.x1 + 1; x<r.x2; x++){
      if((x - r.x1 - off) % step !== 0) continue;
      if(D.at(x, y) !== T.SOLID || D.painted.some(p=> p.x === x && p.y === y)) continue;
      if(r.props.some(p=> p.kind === "sign" && Math.abs(p.x - x) < 1)) continue;
      if(D.decor.some(d=> d.wall && Math.abs(d.x - x - 0.5) < 0.8 && Math.abs(d.y - y - 1) < 0.5)) continue;
      const g = new THREE.Group(); g.position.set(x + 0.5, 1.15, y + 1.05);
      const P = K.part, Dc = DG.Decor;
      if((W.th.gloom || 0) >= 0.7){
        // a knot of shelf glowcaps grown out of the wall where a torch was
        const lit = new THREE.Group(); g.add(lit);
        for(let k=0;k<4;k++){ const r = 0.15 - k*0.025, px = (k % 2 ? 0.1 : -0.08) + (W.rnd() - 0.5)*0.06, py = -0.3 + k*0.2; P(g, K.sculpt(new THREE.SphereGeometry(r, 12, 5, 0, PI*2, 0, PI/2), r*0.12, 6/r, W.rnd()*9), 0x2e2a34, px, py, -0.05, 0, 0, 0, 1, 0.3, 0.8); P(lit, new THREE.TorusGeometry(r*0.95, 0.012, 3, 12, PI), W.th.torch, px, py - 0.005, -0.05, PI/2, 0, PI); }
        P(g, K.tube([[-0.2, 0.4, -0.04], [-0.05, 0.0, 0.0], [0.05, -0.5, -0.03]], 0.02, 8, 4), 0x2a201a);
        K.bake(lit, { mat:W.mats.lit, outline:false }); K.bake(g, { w:0.012 });
        const glow = K.sprite(W.th.torch, 0.9, 0.55); glow.position.set(0, -0.05, 0.12); g.add(glow);
        W.areaGroup(r.id).add(g);
        W.flames.push({ flame:glow, s:0.9, ph:W.rnd()*6, slow:true });
        W.lights.push({ x:x + 0.5, y:1.4, z:y + 1.4, c:W.th.torch, i:1.3, room:r.id, ph:W.rnd()*6 });
        continue;
      }
      if(W.th.decor === "crypt"){
        // a skull on an iron spike, soul-fire burning out of its crown
        P(g, new THREE.BoxGeometry(0.2, 0.26, 0.04), 0x26262a, 0, -0.1, -0.04);
        [-1, 1].forEach(s=> [-0.18, -0.0].forEach(yy=> P(g, new THREE.SphereGeometry(0.018, 4, 3), 0x4a4a50, s*0.07, yy, -0.015)));
        Dc.rod(g, [0, -0.08, -0.02], [0, 0.12, 0.12], 0.018, 0x26262a);
        Dc.skull(g, 0, 0.1, 0.13, 0.085, 0, -0.15, 0xa89c84);
        K.bake(g, { w:0.015 });
        const flame = K.sprite(W.th.torch, 0.6, 0.9); flame.position.set(0, 0.36, 0.13); g.add(flame);
        const core = K.sprite(0xe0f4ff, 0.22, 0.85); core.position.set(0, 0.32, 0.13); g.add(core);
        W.areaGroup(r.id).add(g);
        W.flames.push({ flame, s:0.6, ph:W.rnd()*6 });
        W.lights.push({ x:x + 0.5, y:1.5, z:y + 1.4, c:W.th.torch, i:1.6, room:r.id, ph:W.rnd()*6 });
        continue;
      }
      // an iron sconce: a riveted plate, a twisted arm, a cage round a pitch-soaked head
      P(g, new THREE.BoxGeometry(0.2, 0.32, 0.04), 0x26262a, 0, -0.12, -0.04);
      [-1, 1].forEach(s=> [-0.24, 0.0].forEach(yy=> P(g, new THREE.SphereGeometry(0.018, 4, 3), 0x4a4a50, s*0.07, yy, -0.015)));
      Dc.rod(g, [0, -0.2, -0.02], [0, 0.02, 0.1], 0.016, 0x26262a);
      P(g, new THREE.CylinderGeometry(0.035, 0.025, 0.42, 6), 0x3a2a1c, 0, 0.06, 0.1, 0.35);
      P(g, new THREE.CylinderGeometry(0.06, 0.05, 0.14, 7), 0x1a1410, 0, 0.25, 0.16, 0.35);
      for(let k=0;k<5;k++){ const an = k/5*PI*2; Dc.rod(g, [Math.cos(an)*0.05, 0.12, 0.13 + Math.sin(an)*0.05], [Math.cos(an)*0.1, 0.3, 0.18 + Math.sin(an)*0.1], 0.008, 0x26262a); }
      P(g, new THREE.TorusGeometry(0.1, 0.012, 4, 12), 0x3a3a3e, 0, 0.3, 0.18, PI/2);
      K.bake(g, { w:0.015 });
      const flame = K.sprite(W.th.torch, 0.7, 0.95); flame.position.set(0, 0.42, 0.18); g.add(flame);
      const flame2 = K.sprite(0xff5a1a, 1.2, 0.35); flame2.position.set(0, 0.48, 0.2); g.add(flame2);
      const core = K.sprite(0xffe8b0, 0.24, 0.9); core.position.set(0, 0.36, 0.18); g.add(core);
      W.areaGroup(r.id).add(g);
      W.flames.push({ flame, s:0.7, ph:W.rnd()*6 }, { flame:flame2, s:1.2, ph:W.rnd()*6 });
      W.lights.push({ x:x + 0.5, y:1.5, z:y + 1.4, c:W.th.torch, i:1.8, room:r.id, ph:W.rnd()*6 });
    }
  });
};

/* ---- traps ---- */
proto.buildTraps = function(){
  const W = this;
  W.D.rooms.forEach(r=> r.traps.forEach(t=>{
    const g = new THREE.Group(); g.position.set(t.x + 0.5, 0, t.y + 0.5);
    const o = { t, g };
    // every trap shows a faint warning glow even at rest, so it reads in the dark and
    // the fog; it flares as the trap arms (see update)
    const warn = new THREE.Mesh(K.glowPlane, K.glowMat(t.kind === "vent" ? 0xff6a1a : 0xc8402a, 0.14)); warn.scale.set(1.5, 1, 1.5); warn.position.y = 0.05;
    if(t.kind === "spikes" || t.kind === "vent"){ g.add(warn); o.warn = warn; }
    if(t.kind === "spikes"){
      // a rusted iron plate, darker rim, holes the spikes come up through, old blood
      K.part(g, new THREE.BoxGeometry(0.96, 0.05, 0.96), 0x2a2224, 0, 0.025, 0);
      K.part(g, new THREE.BoxGeometry(0.84, 0.055, 0.84), 0x5a4a42, 0, 0.028, 0);
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) K.part(g, new THREE.CylinderGeometry(0.05, 0.05, 0.06, 8), 0x0a0808, -0.3 + i*0.3, 0.03, -0.3 + j*0.3);
      K.part(g, new THREE.CylinderGeometry(0.22, 0.26, 0.058, 10), 0x3a0e0a, 0.18, 0.029, -0.12, 0, 0, 0, 1, 1, 0.7);
      [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]].forEach(([x, z])=> K.part(g, new THREE.SphereGeometry(0.035, 6, 4), 0x8a8a92, x, 0.05, z));
      K.bake(g, { outline:false });
      const sp = new THREE.Group(); g.add(sp);
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) K.part(sp, new THREE.ConeGeometry(0.07, 0.45, 4), 0xc8ccd8, -0.3 + i*0.3, 0.22, -0.3 + j*0.3);
      K.bake(sp, { w:0.012 });
      sp.position.y = -0.45; o.spikes = sp;
    } else if(t.kind === "darts"){
      // a carved skull on the wall, the dart slit in its mouth, a red glint in the dark of it
      const sk = new THREE.Group(); sk.position.set(t.dir*0.5, 0.82, 0); sk.rotation.y = t.dir > 0 ? -PI/2 : PI/2; g.add(sk);
      K.part(sk, new THREE.SphereGeometry(0.17, 12, 8), 0xb8ac90, 0, 0.04, -0.08, 0, 0, 0, 1, 1, 0.6);
      [-1, 1].forEach(e=> K.part(sk, new THREE.SphereGeometry(0.045, 8, 6), 0x0a0808, e*0.065, 0.07, 0.0));
      K.part(sk, new THREE.BoxGeometry(0.14, 0.05, 0.04), 0x0a0808, 0, -0.06, 0.0);
      K.bake(sk, { w:0.01 });
      const gl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), K.basic(0xff3a1a)); gl.position.set(0, -0.06, 0.02); sk.add(gl); o.glint = gl;
    } else if(t.kind === "vent"){
      K.part(g, new THREE.BoxGeometry(0.8, 0.04, 0.8), 0x222226, 0, 0.02, 0);
      for(let i=0;i<4;i++) K.part(g, new THREE.BoxGeometry(0.06, 0.05, 0.78), 0x4a4a50, -0.27 + i*0.18, 0.04, 0);
      K.bake(g, { outline:false });
      const glow = new THREE.Mesh(K.glowPlane, K.glowMat(0xff6a1a, 0)); glow.scale.set(1.6, 1, 1.6); glow.position.y = 0.06; g.add(glow);
      o.glow = glow;
    } else if(t.kind === "banana"){
      K.part(g, new THREE.TorusGeometry(0.18, 0.06, 6, 10, PI*1.1), 0xf2d23a, 0, 0.06, 0, -PI/2, 0, W.rnd()*6);
      K.part(g, new THREE.SphereGeometry(0.05, 6, 4), 0x5a4a1a, 0.18, 0.06, 0);
      K.bake(g, { w:0.012 });
      o.peel = g;
    }
    W.areaGroup(r.id).add(g);
    W.traps.push(o);
  }));
};

/* ---- decor: flattened per room into one baked mesh ---- */
/* (a list other than the dungeon's own comes from vanity.js: those can
   sit on any wall face (face + rotY) or on top of a wall (h)) */
proto.buildDecor = function(list){
  const W = this, D = W.D, perArea = {}, litArea = {}, glows = {};
  const tmp = new THREE.Matrix4();
  (list || D.decor).forEach(d=>{
    const o = DG.Decor.build(d.kind, W.rnd);
    const a = d.area !== undefined ? d.area : W.areaOfTile(d.x, d.wall ? d.y - 0.5 : d.y); if(a === null || a < 0) return;
    const holder = new THREE.Group();
    holder.position.set(d.x, d.h || 0, d.face ? d.y : d.wall ? d.y + 1 - 0.98 : d.y);
    if(d.face) holder.rotation.y = d.rotY || 0; else if(!d.wall) holder.rotation.y = d.rot || 0;
    holder.scale.setScalar(d.s || 1);
    holder.updateMatrix();
    if(o.loose){ o.group.position.copy(holder.position); o.group.rotation.copy(holder.rotation); o.group.scale.copy(holder.scale); W.areaGroup(a).add(o.group); return; }
    const target = perArea[a] || (perArea[a] = new THREE.Group()), litT = litArea[a] || (litArea[a] = new THREE.Group());
    o.group.children.slice().forEach(m=>{
      if(!m.userData.part){ return; }
      m.updateMatrix(); tmp.multiplyMatrices(holder.matrix, m.matrix);
      tmp.decompose(m.position, m.quaternion, m.scale);
      (m.userData.lit ? litT : target).add(m);
    });
    const wp = v=> new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(holder.matrix);
    o.glows.forEach(gl=>{ const p = wp(gl); (glows[a] = glows[a] || []).push({ x:p.x, y:p.y, z:p.z, c:gl.c, s:gl.s*(d.s || 1) }); if(gl.cap){ const m = new THREE.Mesh(new THREE.SphereGeometry(gl.cap, 10, 6, 0, PI*2, 0, PI/2), new THREE.MeshBasicMaterial({ color:gl.c })); m.position.copy(p); W.areaGroup(a).add(m); } });
    o.lights.forEach(l=>{ const p = wp(l); W.lights.push({ x:p.x, y:p.y, z:p.z, c:l.c, i:l.i, room:d.room, ph:W.rnd()*6, small:true }); });
    o.eyes.forEach(e=>{
      const p = wp(e), g = new THREE.Group(); g.position.copy(p);
      // a sunken, bloodshot thing: yellowed, a burning slit for a pupil
      const ball = new THREE.Mesh(new THREE.SphereGeometry(e.r, 12, 10), K.lambert(0x6a5a3e)); g.add(ball);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(e.r*0.5, 10, 8), K.basic(0x8aa020)); iris.position.z = e.r*0.66; iris.scale.z = 0.45;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(e.r*0.3, 8, 6), K.basic(0xd8ff4a)); pupil.position.z = e.r*0.92; pupil.scale.set(0.22, 1.1, 0.3);
      const look = new THREE.Group(); look.add(iris); look.add(pupil); g.add(look);
      W.areaGroup(a).add(g);
      W.eyes.push({ g, look, x:p.x, z:p.z, wall:!!e.wall, blink:W.rnd()*5 });
    });
  });
  for(const a in perArea){ const g = perArea[a]; if(g.children.length){ W.areaGroup(+a).add(g); K.bake(g, { w:0.018 }); } }
  for(const a in litArea){ const g = litArea[a]; if(g.children.length){ W.areaGroup(+a).add(g); K.bake(g, { mat:W.mats.lit, outline:false }); } }
  // the glows of a room: one draw
  for(const a in glows){
    const list = glows[a], hp = [], hc = [], hs = [], c = new THREE.Color();
    list.forEach(h=>{ hp.push(h.x, h.y, h.z); c.setHex(h.c); hc.push(c.r, c.g, c.b); hs.push(h.s); });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(hp, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(hc, 3)); g.setAttribute("aSize", new THREE.Float32BufferAttribute(hs, 1));
    const m = new THREE.ShaderMaterial({ uniforms:{ map:{ value:K.glowTex }, uScale:{ value:300 }, uTime:{ value:0 } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true,
      vertexShader:"attribute float aSize; varying vec3 vC; uniform float uScale, uTime; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position, 1.0); float f = 0.85 + 0.15*sin(uTime*9.0 + position.x*7.0 + position.z*3.0); gl_PointSize = min(256.0, uScale*aSize*f/max(1.0, -mv.z)); gl_Position = projectionMatrix*mv; }",
      fragmentShader:"uniform sampler2D map; varying vec3 vC; void main(){ float k = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vC*k*1.2, 1.0); }" });
    K.timed.push(m); W.glowMats = W.glowMats || []; W.glowMats.push(m);
    const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 4;
    W.areaGroup(+a).add(p);
  }
};

/* ---- breakables: instanced per kind ---- */
proto.buildBreakables = function(){
  const W = this, D = W.D, by = {};
  D.breakables.forEach(b=> (by[b.kind] = by[b.kind] || []).push(b));
  W.breakSets = [];
  const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for(const kind in by){
    const list = by[kind], geo = DG.Decor.breakableGeo(kind);
    const mat = K.toon(), om = K.outlineMat(0.02);
    const mesh = new THREE.InstancedMesh(geo, mat, list.length), out = new THREE.InstancedMesh(geo, om, list.length);
    list.forEach((b, i)=>{
      e.set(0, W.rnd()*PI*2, 0); q.setFromEuler(e);
      mtx.compose(new THREE.Vector3(b.x + 0.5, 0, b.y + 0.5), q, new THREE.Vector3(1, 1, 1));
      b.mtx = mtx.clone(); b.inst = i; b.set = kind;
      mesh.setMatrixAt(i, mtx); out.setMatrixAt(i, mtx);
    });
    mesh.frustumCulled = out.frustumCulled = false;
    W.group.add(mesh); W.group.add(out);
    W.breakSets.push({ kind, list, mesh, out });
  }
};
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);
proto.updateBreakables = function(){
  const W = this, D = W.D;
  W.breakSets.forEach(s=>{
    let dirty = false;
    s.list.forEach(b=>{
      const vis = !b.broken && D.rooms[b.room].seen;
      const shake = b.shake > 0;
      if(vis === b.vis && !shake && !b.wasShaking) return;
      b.vis = vis; dirty = true;
      let m = vis ? b.mtx : _zero;
      if(vis && shake){ m = b.mtx.clone(); m.elements[12] += (Math.random() - 0.5)*0.08; m.elements[14] += (Math.random() - 0.5)*0.08; b.shake -= 1/60; }
      b.wasShaking = shake;
      s.mesh.setMatrixAt(b.inst, m); s.out.setMatrixAt(b.inst, m);
    });
    if(dirty){ s.mesh.instanceMatrix.needsUpdate = true; s.out.instanceMatrix.needsUpdate = true; }
  });
};

/* ---- floating motes: dust, spores, ghost fog, embers ---- */
proto.buildMotes = function(){
  const W = this, n = 380, pos = new Float32Array(n*3), ph = new Float32Array(n);
  for(let i=0;i<n;i++){ pos[i*3] = (W.rnd() - 0.5)*40; pos[i*3+1] = W.rnd()*3; pos[i*3+2] = (W.rnd() - 0.5)*30; ph[i] = W.rnd()*6.28; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
  const kind = W.th.motes;
  const col = { dust:[0.9, 0.8, 0.6], spores:[0.6, 1.0, 0.5], ghostfog:[0.6, 0.8, 1.0], eyes:[0.9, 0.4, 1.0], embers:[1.0, 0.4, 0.2], glowbugs:[0.4, 0.85, 1.0] }[kind] || [0.9, 0.9, 0.9];
  const m = new THREE.ShaderMaterial({
    uniforms:{ uTime:{ value:0 }, uCenter:{ value:new THREE.Vector3() }, uScale:{ value:300 }, uCol:{ value:new THREE.Vector3(col[0], col[1], col[2]) }, uRise:{ value:kind === "embers" || kind === "spores" ? 0.5 : kind === "glowbugs" ? 0.2 : 0.08 } },
    transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
    vertexShader:["attribute float aPh; uniform float uTime, uScale, uRise; uniform vec3 uCenter; varying float vA;",
      "void main(){ vec3 p = position; p.y = mod(p.y + uTime*uRise + aPh, 3.2);",
      "  p.x += sin(uTime*0.4 + aPh*3.0)*0.8; p.z += cos(uTime*0.3 + aPh*2.0)*0.8;",
      "  p.xz = uCenter.xz + mod(p.xz - uCenter.xz + vec2(20.0, 15.0), vec2(40.0, 30.0)) - vec2(20.0, 15.0);",
      "  vA = (0.4 + 0.6*sin(uTime*1.3 + aPh*5.0))*smoothstep(0.0, 0.4, p.y)*smoothstep(3.2, 2.4, p.y);",
      "  vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_PointSize = clamp(uScale*0.07/max(1.0, -mv.z), 1.0, 6.0); gl_Position = projectionMatrix*mv; }"].join("\n"),
    fragmentShader:"uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(uCol*vA*(1.0 - d*2.0), 1.0); }"
  });
  K.timed.push(m); W.moteMat = m;
  const p = new THREE.Points(g, m); p.frustumCulled = false;
  W.group.add(p);
};

/* ---- props ---- */
proto.addProp = function(p){
  const W = this, g = new THREE.Group(), o = { p, g };
  g.position.set(p.x + 0.5, 0, p.y + 0.5);
  const P = K.part;
  if(p.kind === "chest"){
    const col = [0x8a5a2b, 0x8a5a2b, 0x5a6a8a, 0xd8a83a][p.tier] || 0x8a5a2b, band = p.tier >= 3 ? 0xffe680 : p.tier === 2 ? 0x46e4ff : 0xc8a040;
    P(g, new THREE.BoxGeometry(0.82, 0.44, 0.56), col, 0, 0.22, 0);
    P(g, new THREE.BoxGeometry(0.86, 0.07, 0.6), band, 0, 0.4, 0);
    P(g, new THREE.BoxGeometry(0.12, 0.15, 0.05), band, 0, 0.36, 0.3);
    P(g, new THREE.BoxGeometry(0.05, 0.06, 0.02), 0x1a1a1a, 0, 0.34, 0.33);
    [-0.33, 0.33].forEach(x=>{ P(g, new THREE.BoxGeometry(0.08, 0.44, 0.6), band, x, 0.22, 0); [0.1, 0.32].forEach(y=> P(g, new THREE.SphereGeometry(0.022, 6, 4), 0x2a2a2a, x, y, 0.3)); });
    P(g, new THREE.BoxGeometry(0.9, 0.06, 0.64), 0x3a2414, 0, 0.03, 0);
    const lid = new THREE.Group(); lid.position.set(0, 0.44, -0.28); g.add(lid);
    P(lid, new THREE.CylinderGeometry(0.28, 0.28, 0.82, 12, 1, false, 0, PI), col, 0, 0, 0.28, 0, 0, PI/2);
    P(lid, new THREE.TorusGeometry(0.28, 0.03, 6, 12, PI), band, 0, 0, 0.28, 0, PI/2, 0);
    K.bake(g, { w:0.022 });
    const glow = K.sprite(p.tier >= 2 ? 0x46e4ff : 0xffd23d, 1.6, 0.3); glow.position.y = 0.5; g.add(glow);
    o.lid = lid; o.glow = glow;
  } else if(p.kind === "sign"){
    P(g, new THREE.BoxGeometry(0.08, 0.9, 0.08), 0x4a3020, 0, 0.45, 0);
    K.bake(g, { w:0.015 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.06), [K.lambert(0x6a4a2a), K.lambert(0x6a4a2a), K.lambert(0x6a4a2a), K.lambert(0x6a4a2a),
      K.ink({ vertexColors:false, map:K.textTex([p.riddle ? "RIDDLE" : "READ ME"], 64, 36, { size:13 }) }), K.lambert(0x6a4a2a)]);
    board.position.y = 0.95; board.rotation.x = -0.25; g.add(board);
    g.position.z += 0.2;
  } else if(p.kind === "merchant"){
    const R = M.goblin("merchant"); g.add(R.root); o.rig = R;
    P(g, new THREE.BoxGeometry(3.2, 0.7, 0.6), 0x6a4a2a, 0, 0.35, 0.9);
    P(g, new THREE.BoxGeometry(3.25, 0.06, 0.65), 0x8a2a3a, 0, 0.72, 0.9);
    K.bake(g, { w:0.02 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map:K.textTex(["SNIBBIT'S", "no refunds"], 128, 32, { size:12, bg:"#2a1a10", fg:"#ffd23d" }) }));
    sign.position.set(0, 2.05, -0.3); g.add(sign);
  } else if(p.kind === "pedestal"){
    const altar = W.D.rooms[p.room].type === "altar";
    if(altar){
      P(g, new THREE.BoxGeometry(1.2, 0.7, 0.8), 0x3a2a2e, 0, 0.35, 0);
      P(g, new THREE.BoxGeometry(1.3, 0.08, 0.9), 0x5a2a2e, 0, 0.72, 0);
      [-0.5, 0.5].forEach(x=> P(g, new THREE.CylinderGeometry(0.05, 0.05, 0.25, 8), 0xf0e6c8, x, 0.88, -0.2));
      K.bake(g, { w:0.02 });
      [-0.5, 0.5].forEach(x=>{ const f = K.sprite(0xffa040, 0.4, 0.9); f.position.set(x, 1.05, -0.2); g.add(f); });
      const pool = new THREE.Mesh(K.glowPlane, K.glowMat(0xff2a3a, 0.5)); pool.scale.set(3, 1, 3); pool.position.y = 0.05; g.add(pool);
      W.lights.push({ x:p.x + 0.5, y:1.4, z:p.y + 0.7, c:0xff3a3a, i:1.2, room:p.room, ph:0 });
    } else {
      // an altar: a cracked block on a stepped base, an iron band, old blood down its face
      const st = new THREE.Color(W.th.wall).multiplyScalar(1.1).getHex(), dk = new THREE.Color(W.th.wall).multiplyScalar(0.7).getHex();
      P(g, new THREE.CylinderGeometry(0.56, 0.6, 0.08, 8), dk, 0, 0.04, 0, 0, PI/8, 0);
      P(g, new THREE.CylinderGeometry(0.46, 0.5, 0.1, 8), st, 0, 0.13, 0, 0, PI/8, 0);
      P(g, new THREE.CylinderGeometry(0.33, 0.37, 0.52, 8), st, 0, 0.44, 0, 0, PI/8, 0);
      P(g, new THREE.CylinderGeometry(0.44, 0.4, 0.09, 8), st, 0, 0.74, 0, 0, PI/8, 0);
      P(g, new THREE.CylinderGeometry(0.375, 0.375, 0.06, 8), 0x26262a, 0, 0.3, 0, 0, PI/8, 0);
      for(let i=0;i<8;i++){ const a = i/8*PI*2 + PI/8; P(g, new THREE.SphereGeometry(0.02, 4, 3), 0x4a4a50, Math.cos(a)*0.38, 0.3, Math.sin(a)*0.38); }
      P(g, new THREE.BoxGeometry(0.1, 0.3, 0.01), 0x3a0c08, 0.05, 0.56, 0.35, -0.1, 0, 0.05); P(g, new THREE.BoxGeometry(0.04, 0.42, 0.01), 0x3a0c08, -0.07, 0.5, 0.35, -0.1, 0, -0.03);
      P(g, new THREE.BoxGeometry(0.02, 0.4, 0.01), 0x0a0a0a, 0.2, 0.45, 0.31, -0.1, 0.4, 0.4);
      DG.Decor.skull(g, -0.36, 0.14, 0.32, 0.07, 0.5, 0.2, 0xa89c84);
      K.bake(g, { w:0.02 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.365, 0.06, 16, 1, true), new THREE.MeshBasicMaterial({ color:W.th.rim || 0xffd23d, transparent:true, opacity:0.7, blending:THREE.AdditiveBlending, depthWrite:false }));
      band.position.y = 0.55; g.add(band); o.band = band;
    }
    o.holder = new THREE.Group(); o.holder.position.y = 1.2; g.add(o.holder);
    o.shown = null; o.sink = 0;
  } else if(p.kind === "lilypad"){
    P(g, new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16, 1, false, 0.3, PI*2 - 0.6), 0x4aa83a, 0, -0.08, 0);
    P(g, new THREE.TorusGeometry(0.4, 0.03, 6, 16), 0x3a8a2a, 0, -0.06, 0, PI/2);
    K.bake(g, { w:0.015 });
    o.holder = new THREE.Group(); o.holder.position.y = 0.7; g.add(o.holder); o.shown = null; o.sink = 0;
  } else if(p.kind === "plate"){
    P(g, new THREE.BoxGeometry(0.86, 0.06, 0.86), 0x6a6a74, 0, 0.03, 0);
    K.bake(g, { outline:false });
    const glow = new THREE.Mesh(K.glowPlane, K.glowMat(0x46e4ff, 0.15)); glow.scale.set(1.2, 1, 1.2); glow.position.y = 0.07; g.add(glow); o.glow = glow;
  } else if(p.kind === "resetrune"){
    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 16), K.basic(0x46a8ff)); glow.rotation.x = -PI/2; glow.position.y = 0.06; g.add(glow);
    const sp = K.sprite(0x46a8ff, 1.2, 0.6); sp.position.y = 0.4; g.add(sp); o.glow = glow;
  }
  const a = p.closet ? W.areaOfTile(p.x + 0.5, p.y + 0.5) : p.room;
  W.areaGroup(a === null ? p.room : a).add(g);
  W.props[p.id] = o;
  return o;
};

/* ---- puzzle pieces ---- */
proto.buildPuzzle = function(r){
  const W = this, pz = r.puzzle, P = K.part, out = W.pz[r.id] = { r, items:[] };
  const add = g=> W.areaGroup(r.id).add(g);
  if(pz.kind === "braziers") pz.items.forEach((it, i)=>{
    const g = new THREE.Group(); g.position.set(it.x, 0, it.y);
    P(g, new THREE.CylinderGeometry(0.08, 0.16, 0.7, 6), 0x3a3a40, 0, 0.35, 0);
    P(g, new THREE.CylinderGeometry(0.34, 0.18, 0.22, 10), 0x5a5a64, 0, 0.8, 0);
    K.bake(g, { w:0.018 });
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), K.basic(0x2a1a14)); coal.position.y = 0.9; g.add(coal);
    const flame = K.sprite(0xff8a2a, 1.3, 0.9); flame.position.y = 1.2; g.add(flame);
    add(g); out.items.push({ g, flame, coal });
  });
  if(pz.kind === "statues"){
    pz.items.forEach((it, i)=>{
      const g = new THREE.Group(); g.position.set(it.x, 0, it.y);
      P(g, new THREE.BoxGeometry(0.8, 0.3, 0.8), 0x6a6a74, 0, 0.15, 0);
      const turn = new THREE.Group(); turn.position.y = 0.3; g.add(turn);
      P(turn, new THREE.CylinderGeometry(0.22, 0.3, 0.7, 8), 0x8a8a94, 0, 0.35, 0);
      P(turn, new THREE.SphereGeometry(0.24, 12, 10), 0x8a8a94, 0, 0.85, 0);
      P(turn, new THREE.ConeGeometry(0.08, 0.25, 6), 0x7a7a84, 0, 0.85, 0.28, PI/2);
      [-1, 1].forEach(s=> P(turn, new THREE.ConeGeometry(0.06, 0.25, 4), 0x7a7a84, s*0.18, 1.08, 0, 0, 0, -s*0.4));
      K.bake(g, { w:0.02 });
      [-1, 1].forEach(s=>{ const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), K.basic(0x46e4ff)); e.position.set(s*0.09, 0.9, 0.2); turn.add(e); });
      add(g); out.items.push({ g, turn });
    });
    const eye = new THREE.Group(); eye.position.set(pz.eye.x, 0, pz.eye.y);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.7, 20), K.basic(0x2a1a3a)); disc.rotation.x = -PI/2; disc.position.y = 0.03; eye.add(disc);
    const iris = new THREE.Mesh(new THREE.CircleGeometry(0.35, 20), K.basic(0xd84aff)); iris.rotation.x = -PI/2; iris.position.y = 0.04; eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), K.basic(0x080808)); pupil.rotation.x = -PI/2; pupil.position.y = 0.05; eye.add(pupil);
    add(eye); out.eye = eye;
  }
  if(pz.kind === "chorus") pz.items.forEach((it, i)=>{
    const col = [0xff4a6a, 0x46e4ff, 0x9cff3a, 0xffd23d][i];
    const g = new THREE.Group(); g.position.set(it.x, 0, it.y);
    P(g, new THREE.CylinderGeometry(0.12, 0.16, 0.6, 10), 0x9a948a, 0, 0.3, 0);
    P(g, new THREE.SphereGeometry(0.42, 16, 8, 0, PI*2, 0, PI/2), new THREE.Color(col).multiplyScalar(0.45).getHex(), 0, 0.58, 0, 0, 0, 0, 1, 0.7, 1);
    P(g, new THREE.SphereGeometry(0.06, 8, 6), 0x0a0406, 0, 0.36, 0.11, 0, 0, 0, 0.8, 1.4, 0.5);
    K.bake(g, { w:0.02 });
    const glow = K.sprite(col, 2.2, 0); glow.position.y = 0.8; g.add(glow);
    add(g); out.items.push({ g, glow, col });
  });
  if(pz.kind === "push"){
    out.blocks = pz.blocks.map(b=>{
      const g = new THREE.Group();
      P(g, new THREE.BoxGeometry(0.94, 0.9, 0.94), 0x7a7a88, 0, 0.45, 0);
      P(g, new THREE.BoxGeometry(0.96, 0.1, 0.96), 0x5a5a68, 0, 0.88, 0);
      K.bake(g, { w:0.022 });
      const rune = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map:K.textTex(["◇"], 32, 32, { size:26, bg:"#5a5a68", fg:"#46e4ff" }) }));
      rune.position.set(0, 0.5, 0.48); g.add(rune);
      g.position.set(b.x + 0.5, 0, b.y + 0.5); add(g);
      return g;
    });
  }
};

/* ================================================================== *
 *  Per frame
 * ================================================================== */
proto.update = function(G, dt, t){
  const W = this, D = W.D, p = G.player, S = DG.Stage;
  // fog of war
  for(const id in W.areas){
    const A = W.areas[id], i = +id;
    // (three.js draws anything whose visible isn't exactly false, so: booleans only)
    A.g.visible = i < 100 ? !!D.rooms[i].seen : DG.Dungeon.corridorKnown(D, D.corridors[i - 100]);
  }
  // doors
  W.doors.forEach(o=>{
    const want = o.d.open ? -WH - 0.1 : 0;
    o.h += (want - o.h)*(1 - Math.exp(-dt*(o.d.open ? 4 : 14)));
    o.g.position.y = o.h;
    o.glow.material.opacity = o.d.open ? 0 : 0.5 + 0.3*Math.sin(t*6);
    o.glow.position.y = 0.03 - o.h;
  });
  // illusions, once found
  W.fakes.forEach(o=>{
    if(!o.f.revealed){ if(o.f.hinted) o.m.material.emissive && o.m.material.emissive.setHex(0x2a1a4a); return; }
    if(!o.m.material.transparent){ o.m.material.transparent = true; o.m.material.needsUpdate = true; }
    o.t += dt;
    o.m.material.opacity = Math.max(0.28, 1 - o.t*1.5) + 0.08*Math.sin(t*5);
    o.m.material.depthWrite = false;
  });
  // torches flicker; the nearest light sources get the real lights
  W.flames.forEach(f=>{ if(f.slow){ f.flame.scale.setScalar(f.s*(0.9 + 0.1*Math.sin(t*1.7 + f.ph))); return; }
    // torches gutter: a fast flutter over a slow surge, and now and then a gust nearly puts one out
    const gust = Math.max(0, Math.sin(t*0.7 + f.ph*3))**12, k = (0.8 + 0.14*Math.sin(t*9 + f.ph) + 0.09*Math.sin(t*23 + f.ph*2) + 0.06*Math.sin(t*41 + f.ph*5))*(1 - gust*0.45);
    f.flame.scale.set(f.s*k*(0.9 + 0.1*Math.sin(t*17 + f.ph)), f.s*k*(1.05 + 0.2*Math.sin(t*11 + f.ph*1.3)), 1); });
  const dark = G.curses.indexOf("dark") >= 0 ? 0.5 : 1;
  const near = W.lights.filter(o=> D.rooms[o.room] && D.rooms[o.room].seen && Math.abs(o.x - p.x) < 20 && Math.abs(o.z - p.y) < 16).sort((a, b)=> DG.dist2(a.x, a.z, p.x, p.y) - DG.dist2(b.x, b.z, p.x, p.y));
  S.torches.forEach((l, i)=>{
    const o = near[i];
    if(!o){ l.intensity = 0; return; }
    l.color.setHex(o.c); l.distance = o.small ? 6 : 11;
    const gust = o.small ? 0 : Math.max(0, Math.sin(t*0.7 + o.ph*3))**12, fl = o.small ? 0.88 + 0.12*Math.sin(t*11 + o.ph) : (0.78 + 0.13*Math.sin(t*9 + o.ph) + 0.09*Math.sin(t*23 + o.ph*2))*(1 - gust*0.4);
    l.position.set(o.x + (o.small ? 0 : Math.sin(t*7 + o.ph)*0.06), o.y, o.z + (o.small ? 0 : Math.cos(t*5 + o.ph)*0.04)); l.intensity = o.i*dark*fl;
  });
  if(W.glowMats) W.glowMats.forEach(m=> m.uniforms.uScale.value = S.renderer.domElement.height/2/Math.tan(S.camera.fov*PI/360)*0.4);
  // traps
  W.traps.forEach(o=>{
    const tr = o.t;
    if(o.spikes){
      const want = tr.state === "up" ? 0 : tr.state === "warn" ? -0.32 : -0.45;
      o.spikes.position.y += (want - o.spikes.position.y)*(1 - Math.exp(-dt*(tr.state === "up" ? 40 : 10)));
    }
    if(o.glow) o.glow.material.opacity = tr.state === "warn" ? 0.4 + 0.3*Math.sin(t*20) : tr.state === "up" ? 0.9 : 0;
    if(o.warn) o.warn.material.opacity = tr.state === "warn" ? 0.5 + 0.25*Math.sin(t*24) : tr.state === "up" ? 0.35 : 0.12 + 0.04*Math.sin(t*2 + tr.x);
    if(o.glint) o.glint.material.color.setHex(Math.sin(t*3 + tr.y) > 0.6 ? 0xff5a2a : 0x8a1a0a);
    if(o.peel) o.peel.visible = !tr.gone;
  });
  // props
  D.rooms.forEach(r=>{
    if(!r.seen && r.type !== "secret") return;
    r.props.forEach(pr=>{
      const o = W.props[pr.id]; if(!o) return;
      if(pr.kind === "chest"){
        o.lid.rotation.x += ((pr.open ? -1.9 : 0) - o.lid.rotation.x)*(1 - Math.exp(-dt*10));
        o.glow.material.opacity = pr.open ? 0 : pr.locked ? 0.08 : 0.3 + 0.1*Math.sin(t*3);
      }
      if(pr.kind === "merchant" && o.rig) M.idle(o.rig, t, 0);
      if(pr.kind === "pedestal"){
        const key = pr.offer ? (pr.offer.id || (pr.offer.gun && pr.offer.gun.uid) || pr.offer.kind) : null;
        if(o.key !== key || (pr.taken && o.shown)){ if(o.shown) o.holder.remove(o.shown); o.shown = null; o.key = key; }
        if(!pr.taken && !o.shown && pr.offer){ o.shown = M.offer(pr.offer); o.holder.add(o.shown); if(pr.offer.kind === "item" && DG.ITEMS[pr.offer.id].tier >= 3){ const b = M.beam(DG.TIERS[DG.ITEMS[pr.offer.id].tier].color); b.position.y = -0.6; o.shown.add(b); } }
        if(o.shown){ o.shown.rotation.y = t*1.2; o.shown.position.y = Math.sin(t*2)*0.06; }
        if(o.band){ o.band.visible = !pr.taken; o.band.material.opacity = 0.45 + 0.25*Math.sin(t*2.5); }
        if(pr.sunk){ o.sink = Math.min(1, o.sink + dt*1.5); o.g.position.y = -o.sink*1.2; }
      }
      if(pr.kind === "lilypad"){
        if(pr.buff && !o.shown && !pr.taken){ o.shown = M.frogBuffIcon(pr.buff); o.holder.add(o.shown); }
        if((pr.taken || pr.sunk) && o.shown && !pr.chosen){ o.holder.remove(o.shown); o.shown = null; }
        if(o.shown){ o.shown.rotation.y = t*1.5; o.shown.position.y = Math.sin(t*2 + pr.slot)*0.08; }
        o.g.position.y = Math.sin(t*1.5 + pr.slot)*0.03 - (pr.sunk ? (o.sink = Math.min(1, o.sink + dt)) : 0)*0.5;
      }
      if(pr.kind === "plate" && r.puzzle && r.puzzle.blocks){
        const on = r.puzzle.blocks.some(b=> b.x === pr.x && b.y === pr.y);
        o.glow.material.opacity = on ? 0.8 : 0.15 + 0.1*Math.sin(t*3);
      }
      if(pr.kind === "resetrune") o.glow.rotation.z = t;
    });
  });
  // puzzle pieces
  for(const id in W.pz){
    const o = W.pz[id], pz = o.r.puzzle;
    if(pz.kind === "braziers") o.items.forEach((it, i)=>{ const lit = pz.lit[i], f = lit ? 1 + 0.12*Math.sin(t*14 + i) : 0; it.flame.scale.setScalar(1.3*f + 0.001); it.coal.material.color.setHex(lit ? 0xff5a1a : 0x2a1a14); });
    if(pz.kind === "statues") o.items.forEach((it, i)=>{ const want = -pz.face[i]*PI/2 + PI/2; it.turn.rotation.y += DG.wrapAngle(want - it.turn.rotation.y)*(1 - Math.exp(-dt*10)); });
    if(pz.kind === "statues" && o.eye) o.eye.children[1].material.color.setHex(pz.solved ? 0x46ff8a : 0xd84aff);
    if(pz.kind === "chorus") o.items.forEach((it, i)=>{ const gl = Math.max(0, pz.items[i].glow || 0); it.glow.material.opacity = Math.min(1, gl*2.5) + (pz.solved ? 0.3 : 0); it.g.scale.setScalar(1 + gl*0.4); });
    if(pz.kind === "push") o.blocks.forEach((g, i)=>{ const b = pz.blocks[i]; g.position.x += (b.x + 0.5 - g.position.x)*(1 - Math.exp(-dt*14)); g.position.z += (b.y + 0.5 - g.position.z)*(1 - Math.exp(-dt*14)); });
  }
  // eyes in the walls follow Zippy, and blink now and then
  W.eyes.forEach(e=>{
    const a = Math.atan2(p.x - e.x, p.y - e.z);
    e.look.rotation.y = e.wall ? DG.clamp(a, -1, 1) : a;
    e.look.rotation.x = e.wall ? 0.3 : 0;
    e.blink -= dt; if(e.blink < 0){ e.g.scale.y = 0.1; if(e.blink < -0.12){ e.blink = 2 + Math.random()*5; e.g.scale.y = 1; } }
  });
  W.updateBreakables();
  W.updateVanity(G, dt, t);
  W.moteMat.uniforms.uCenter.value.set(p.x, 0, p.y);
  W.moteMat.uniforms.uScale.value = S.renderer.domElement.height/2/Math.tan(S.camera.fov*PI/360);
};

proto.dispose = function(){
  this.group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  const K2 = DG.Kit;
  const mine = [this.waterMat, this.moteMat].concat(this.glowMats || [], this.vanityMats || []);
  K2.timed = K2.timed.filter(m=> mine.indexOf(m) < 0);
};

})();
