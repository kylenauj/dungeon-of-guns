/* ------------------------------------------------------------------ *
 *  The world: the floor's tiles turned into stone, dressed and lit.
 *
 *  Geometry is merged per "area" (a room and its walls, or a corridor),
 *  so the fog of war is just area.visible. South-facing walls are built
 *  low so they never hide Zippy. Floors darken where they meet walls
 *  (a cheap ambient occlusion). Decor is flattened and baked per room.
 *  A small pool of point lights follows the nearest torches, candles,
 *  glowing mushrooms and crystals (a fixed count: no shader recompiles).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE, M = DG.Models;
const WH = K.WALL_H, LOW = 0.55, PI = Math.PI;

const World = DG.World = function(D){
  const W = this;
  W.D = D; W.group = new THREE.Group(); W.th = D.theme;
  W.areas = {}; W.doors = []; W.fakes = []; W.lights = []; W.flames = []; W.traps = []; W.props = {}; W.eyes = []; W.pz = {};
  W.mats = {
    floor: new THREE.MeshPhongMaterial({ vertexColors:true, map:K.floorTex, shininess:0, specular:0x000000 }),
    wall:  new THREE.MeshPhongMaterial({ vertexColors:true, map:K.stoneTex, shininess:0, specular:0x000000 }),
    plain: new THREE.MeshPhongMaterial({ vertexColors:true, shininess:0, specular:0x000000 })
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
  D.rooms.forEach(r=> r.props.forEach(p=> W.addProp(p)));
  D.rooms.forEach(r=>{ if(r.puzzle) W.buildPuzzle(r); });
};
const proto = World.prototype;

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
proto.buildAreas = function(){
  const W = this, D = W.D, th = W.th, buckets = {};
  const Bk = id=> buckets[id] || (buckets[id] = { floor:[], wall:[], plain:[], parts:new THREE.Group() });
  const hash = (x, y)=>{ const h = Math.sin(x*127.1 + y*311.7)*43758.5453; return h - Math.floor(h); };
  const walkable = t=> t === T.FLOOR || t === T.DOOR || t === T.PIT || t === T.BLOCK || t === T.BREAK || t === T.PUSH || t === T.WATER;
  const solidish = (x, y)=>{ const t = D.at(x, y); return t === T.SOLID || t === T.FAKE; };
  const cF1 = new THREE.Color(th.floor).multiplyScalar(1.35), cF2 = new THREE.Color(th.floor2).multiplyScalar(1.35), cW = new THREE.Color(th.wall).multiplyScalar(1.2), cTop = new THREE.Color(th.top).multiplyScalar(1.2);
  const style = (x, y)=>{ const r = DG.Dungeon.roomAt(D, x + 0.5, y + 0.5); return r ? r.style : null; };
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    const t = D.at(x, y), a = W.area[y*D.w + x];
    if(a < 0) continue;
    const b = Bk(a), h = hash(x, y);
    if(t === T.FLOOR || t === T.DOOR || t === T.BLOCK || t === T.BREAK || t === T.PUSH){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, 0, y + 0.5);
      const base = ((x + y) & 1 ? cF1 : cF2).clone().multiplyScalar(0.85 + h*0.3);
      // corners next to walls are darker: a little ambient occlusion
      K.paint(g, base, (c, px, py, pz)=>{
        const cx = Math.round(px), cz = Math.round(pz);
        let n = 0; [[cx - 1, cz - 1], [cx, cz - 1], [cx - 1, cz], [cx, cz]].forEach(([u, v])=>{ if(solidish(u, v)) n++; });
        c.multiplyScalar(1 - 0.17*n);
      });
      b.floor.push(g);
    }
    if(t === T.BLOCK){
      const st = style(x, y);
      if(st === "crates"){
        K.part(b.parts, new THREE.BoxGeometry(0.9, 0.85, 0.9), 0x7a5232, x + 0.5, 0.425, y + 0.5);
        K.part(b.parts, new THREE.BoxGeometry(0.92, 0.08, 0.92), 0x5a3a1a, x + 0.5, 0.8, y + 0.5);
      } else if(st === "graves"){
        K.part(b.parts, new THREE.BoxGeometry(0.6, 0.8, 0.2), 0x7a7a88, x + 0.5, 0.4, y + 0.5);
        K.part(b.parts, new THREE.CylinderGeometry(0.3, 0.3, 0.2, 12), 0x7a7a88, x + 0.5, 0.8, y + 0.5, PI/2);
        K.part(b.parts, new THREE.BoxGeometry(0.08, 0.3, 0.04), 0x4a4a58, x + 0.5, 0.6, y + 0.62);
      } else {
        const g = new THREE.BoxGeometry(0.86, 1.5, 0.86); g.translate(x + 0.5, 0.75, y + 0.5);
        b.wall.push(K.paint(g, cW, (c, px, py)=>{ if(py > 1.45) c.copy(cTop); c.multiplyScalar(0.9 + h*0.2); }));
        K.part(b.parts, new THREE.BoxGeometry(1, 0.15, 1), cTop.getHex(), x + 0.5, 0.075, y + 0.5);
      }
    }
    if(t === T.PIT){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, -2.2, y + 0.5);
      b.plain.push(K.paint(g, 0x020203));
      DG.DIRS4.forEach(([dx, dy])=>{
        if(D.at(x + dx, y + dy) === T.PIT) return;
        const s = new THREE.PlaneGeometry(1, 2.2);
        s.translate(0, -1.1, 0);
        s.rotateY(dx === 1 ? -PI/2 : dx === -1 ? PI/2 : dy === 1 ? PI : 0);
        s.translate(x + 0.5 + dx*0.5, 0, y + 0.5 + dy*0.5);
        b.plain.push(K.paint(s, cW.clone().multiplyScalar(0.35), (c, px, py)=> c.multiplyScalar(Math.max(0.05, 1 + py/1.4))));
      });
    }
    if(t === T.WATER){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-PI/2); g.translate(x + 0.5, -0.35, y + 0.5);
      b.plain.push(K.paint(g, 0x1a3a2a));
    }
    if(t === T.SOLID){
      let touch = false;
      for(const [dx, dy] of DG.DIRS8){ const n = D.at(x + dx, y + dy); if(walkable(n) || n === T.FAKE){ touch = true; break; } }
      if(!touch) continue;
      const south = walkable(D.at(x, y - 1)) && !walkable(D.at(x, y + 1));
      const hh = south ? LOW : WH;
      const g = new THREE.BoxGeometry(1, hh, 1); g.translate(x + 0.5, hh/2, y + 0.5);
      const uv = g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i, uv.getY(i)*hh/1.5);
      b.wall.push(K.paint(g, cW, (c, px, py)=>{ if(py > hh - 0.01) c.copy(cTop).multiplyScalar(0.85 + h*0.25); else c.multiplyScalar((0.75 + h*0.35)*(0.5 + 0.5*py/WH)); }));
      // a skirting stone along the bottom of walls facing a room
      if(!south && walkable(D.at(x, y + 1))) K.part(b.parts, new THREE.BoxGeometry(1, 0.18, 0.12), cW.clone().multiplyScalar(0.7).getHex(), x + 0.5, 0.09, y + 1.03);
    }
  }
  for(const id in buckets){
    const b = buckets[id], g = W.areaGroup(+id);
    if(b.floor.length){ const m = new THREE.Mesh(K.merge(b.floor), W.mats.floor); g.add(m); }
    if(b.wall.length) g.add(new THREE.Mesh(K.merge(b.wall), W.mats.wall));
    if(b.plain.length) g.add(new THREE.Mesh(K.merge(b.plain), W.mats.plain));
    if(b.parts.children.length){ g.add(b.parts); K.bake(b.parts, { w:0.02 }); }
  }
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
  const col = new THREE.Color(W.th.decor === "heart" ? 0x8a1a2a : W.th.decor === "weird" ? 0x6a2a8a : 0x2a8a7a);
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

/* ---- portcullises ---- */
proto.buildDoors = function(){
  const W = this;
  const barM = K.lambert(0x3a3a44);
  W.D.doors.forEach(d=>{
    const g = new THREE.Group();
    const along = d.axis === "v" ? "z" : "x";
    for(let i=0;i<9;i++){
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, WH, 0.09), barM);
      const o = -1.4 + i*0.35;
      bar.position.set(along === "x" ? o : 0, WH/2, along === "z" ? o : 0);
      g.add(bar);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), barM); tip.position.set(bar.position.x, -0.05, bar.position.z); tip.rotation.x = PI; g.add(tip);
    }
    for(const yy of [0.5, 1.2]){ const rail = new THREE.Mesh(new THREE.BoxGeometry(along === "x" ? 3 : 0.1, 0.1, along === "z" ? 3 : 0.1), barM); rail.position.y = yy; g.add(rail); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), new THREE.MeshBasicMaterial({ color:0xff4a3a, transparent:true, opacity:0 }));
    glow.rotation.x = -PI/2; glow.position.y = 0.03; if(along === "z") glow.rotation.z = PI/2;
    g.add(glow);
    g.position.set(d.x, -WH - 0.1, d.y);
    const a = W.area[(d.y - 0.5)*W.D.w + (d.x - 0.5)];
    W.areaGroup(a >= 0 ? a : d.room).add(g);
    W.doors.push({ d, g, glow, h:-WH - 0.1 });
  });
};

/* ---- illusionary walls ---- */
proto.buildFakes = function(){
  const W = this, th = W.th;
  W.D.fakes.forEach(f=>{
    const parts = [];
    f.tiles.forEach(([x, y])=>{
      const g = new THREE.BoxGeometry(1, WH, 1); g.translate(x + 0.5, WH/2, y + 0.5);
      parts.push(K.paint(g, th.wall, (c, px, py)=>{ if(py > WH - 0.01) c.setHex(th.top); c.multiplyScalar(1.2*0.93); }));
    });
    const m = new THREE.Mesh(K.merge(parts), new THREE.MeshPhongMaterial({ vertexColors:true, map:K.stoneTex, shininess:0, transparent:true, opacity:1, specular:0 }));
    const a = W.area[f.tiles[0][1]*W.D.w + f.tiles[0][0]];
    W.areaGroup(a >= 0 ? a : f.room).add(m);
    W.fakes.push({ f, m, t:0 });
  });
};

/* ---- painted doors ---- */
const doorTex = {};
function paintedDoorTex(color, mark){
  const k = color + ":" + (mark || "");
  if(doorTex[k]) return doorTex[k];
  const cv = document.createElement("canvas"); cv.width = 32; cv.height = 48; const g = cv.getContext("2d");
  const c = new THREE.Color(color);
  g.fillStyle = "#2a1a10"; g.fillRect(0, 0, 32, 48);
  g.fillStyle = "#" + c.getHexString(); g.fillRect(3, 4, 26, 44);
  g.fillStyle = "#" + c.clone().multiplyScalar(0.7).getHexString();
  for(let i=0;i<4;i++) g.fillRect(4 + i*7, 6, 2, 42);
  g.fillRect(3, 4, 26, 3);
  g.fillStyle = "#ffd23d"; g.fillRect(23, 26, 3, 3);
  if(mark === "x"){ g.strokeStyle = "#111"; g.lineWidth = 3; g.beginPath(); g.moveTo(6, 10); g.lineTo(26, 44); g.moveTo(26, 10); g.lineTo(6, 44); g.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return doorTex[k] = t;
}
proto.buildPainted = function(){
  const W = this;
  W.painted = [];
  W.D.painted.forEach(p=>{
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 1.3), new THREE.MeshPhongMaterial({ map:paintedDoorTex(p.color), shininess:0, specular:0, transparent:true }));
    m.position.set(p.x + 0.5, 0.65, p.y + 1.012);
    const a = W.area[p.y*W.D.w + p.x];
    W.areaGroup(a >= 0 ? a : p.room).add(m);
    W.painted.push({ p, m });
  });
};
proto.markPainted = function(i){
  const P = this.painted.find(o=> o.p.kind === "trick" && o.p.puzzle === i);
  if(P){ P.m.material.map = paintedDoorTex(P.p.color, "x"); P.m.material.needsUpdate = true; }
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
      K.part(g, new THREE.CylinderGeometry(0.04, 0.03, 0.4, 6), 0x4a3020, 0, 0, 0, 0.5);
      K.part(g, new THREE.CylinderGeometry(0.09, 0.05, 0.1, 8), 0x2a2a30, 0, 0.2, 0.1);
      K.bake(g, { w:0.015 });
      const flame = K.sprite(W.th.torch, 0.55, 0.95); flame.position.set(0, 0.32, 0.12); g.add(flame);
      const core = K.sprite(0xffffff, 0.2, 0.9); core.position.set(0, 0.3, 0.12); g.add(core);
      W.areaGroup(r.id).add(g);
      W.flames.push({ flame, s:0.55, ph:W.rnd()*6 });
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
    if(t.kind === "spikes"){
      K.part(g, new THREE.BoxGeometry(0.94, 0.04, 0.94), 0x55555e, 0, 0.02, 0); K.bake(g, { outline:false });
      const sp = new THREE.Group(); g.add(sp);
      for(let i=0;i<3;i++) for(let j=0;j<3;j++) K.part(sp, new THREE.ConeGeometry(0.07, 0.45, 4), 0xc8ccd8, -0.3 + i*0.3, 0.22, -0.3 + j*0.3);
      K.bake(sp, { w:0.012 });
      sp.position.y = -0.45; o.spikes = sp;
    } else if(t.kind === "darts"){
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.5), K.basic(0x000000)); slit.position.set(t.dir*0.52, 0.8, 0); g.add(slit);
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
proto.buildDecor = function(){
  const W = this, D = W.D, perArea = {}, glows = {};
  const tmp = new THREE.Matrix4();
  D.decor.forEach(d=>{
    const o = DG.Decor.build(d.kind, W.rnd);
    const a = W.areaOfTile(d.x, d.wall ? d.y - 0.5 : d.y); if(a === null) return;
    const holder = new THREE.Group();
    holder.position.set(d.x, 0, d.wall ? d.y + 1 - 0.98 : d.y);
    if(!d.wall) holder.rotation.y = d.rot || 0;
    holder.scale.setScalar(d.s || 1);
    holder.updateMatrix();
    if(o.loose){ o.group.position.copy(holder.position); o.group.rotation.copy(holder.rotation); o.group.scale.copy(holder.scale); W.areaGroup(a).add(o.group); return; }
    const target = perArea[a] || (perArea[a] = new THREE.Group());
    o.group.children.slice().forEach(m=>{
      if(!m.userData.part){ return; }
      m.updateMatrix(); tmp.multiplyMatrices(holder.matrix, m.matrix);
      tmp.decompose(m.position, m.quaternion, m.scale);
      target.add(m);
    });
    const wp = v=> new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(holder.matrix);
    o.glows.forEach(gl=>{ const p = wp(gl); (glows[a] = glows[a] || []).push({ x:p.x, y:p.y, z:p.z, c:gl.c, s:gl.s*(d.s || 1) }); if(gl.cap){ const m = new THREE.Mesh(new THREE.SphereGeometry(gl.cap, 10, 6, 0, PI*2, 0, PI/2), new THREE.MeshBasicMaterial({ color:gl.c })); m.position.copy(p); W.areaGroup(a).add(m); } });
    o.lights.forEach(l=>{ const p = wp(l); W.lights.push({ x:p.x, y:p.y, z:p.z, c:l.c, i:l.i, room:d.room, ph:W.rnd()*6, small:true }); });
    o.eyes.forEach(e=>{
      const p = wp(e), g = new THREE.Group(); g.position.copy(p);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(e.r, 12, 10), K.lambert(0xf4ece4)); g.add(ball);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(e.r*0.55, 10, 8), K.basic(0xd84aff)); iris.position.z = e.r*0.62; iris.scale.z = 0.5;
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(e.r*0.28, 8, 6), K.basic(0x080808)); pupil.position.z = e.r*0.92; pupil.scale.z = 0.4;
      const look = new THREE.Group(); look.add(iris); look.add(pupil); g.add(look);
      W.areaGroup(a).add(g);
      W.eyes.push({ g, look, x:p.x, z:p.z, wall:!!e.wall, blink:W.rnd()*5 });
    });
  });
  for(const a in perArea){ const g = perArea[a]; W.areaGroup(+a).add(g); K.bake(g, { w:0.018 }); }
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
  const col = { dust:[0.9, 0.8, 0.6], spores:[0.6, 1.0, 0.5], ghostfog:[0.6, 0.8, 1.0], eyes:[0.9, 0.4, 1.0], embers:[1.0, 0.4, 0.2] }[kind] || [0.9, 0.9, 0.9];
  const m = new THREE.ShaderMaterial({
    uniforms:{ uTime:{ value:0 }, uCenter:{ value:new THREE.Vector3() }, uScale:{ value:300 }, uCol:{ value:new THREE.Vector3(col[0], col[1], col[2]) }, uRise:{ value:kind === "embers" || kind === "spores" ? 0.5 : 0.08 } },
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
      new THREE.MeshLambertMaterial({ map:K.textTex([p.riddle ? "RIDDLE" : "READ ME"], 64, 36, { size:13 }) }), K.lambert(0x6a4a2a)]);
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
      P(g, new THREE.CylinderGeometry(0.32, 0.4, 0.7, 8), W.th.top, 0, 0.35, 0);
      P(g, new THREE.CylinderGeometry(0.42, 0.42, 0.08, 8), W.th.wall, 0, 0.74, 0);
      P(g, new THREE.CylinderGeometry(0.46, 0.46, 0.08, 8), W.th.wall, 0, 0.04, 0);
      K.bake(g, { w:0.02 });
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
    P(g, new THREE.CylinderGeometry(0.12, 0.16, 0.6, 10), 0xf0e6d4, 0, 0.3, 0);
    P(g, new THREE.SphereGeometry(0.42, 16, 8, 0, PI*2, 0, PI/2), col, 0, 0.58, 0, 0, 0, 0, 1, 0.7, 1);
    [-1, 1].forEach(s=> P(g, new THREE.SphereGeometry(0.04, 6, 4), 0x101010, s*0.06, 0.4, 0.13));
    P(g, new THREE.TorusGeometry(0.05, 0.012, 6, 10, PI), 0x3a1a1a, 0, 0.32, 0.14, 0, 0, PI);
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
    let vis;
    if(i < 100) vis = D.rooms[i].seen;
    else {
      const c = D.corridors[i - 100];
      vis = c.secret ? D.fakes.some(f=> f.corridor === c.id && f.revealed) || D.rooms[c.a].found || D.rooms[c.b].found
                     : D.rooms[c.a].seen || D.rooms[c.b].seen;
    }
    A.g.visible = vis;
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
    o.t += dt;
    o.m.material.opacity = Math.max(0.28, 1 - o.t*1.5) + 0.08*Math.sin(t*5);
    o.m.material.depthWrite = false;
  });
  // torches flicker; the nearest light sources get the real lights
  W.flames.forEach(f=> f.flame.scale.setScalar(f.s*(0.85 + 0.15*Math.sin(t*13 + f.ph) + 0.08*Math.sin(t*31 + f.ph*2))));
  const dark = G.curses.indexOf("dark") >= 0 ? 0.5 : 1;
  const near = W.lights.filter(o=> D.rooms[o.room] && D.rooms[o.room].seen && Math.abs(o.x - p.x) < 20 && Math.abs(o.z - p.y) < 16).sort((a, b)=> DG.dist2(a.x, a.z, p.x, p.y) - DG.dist2(b.x, b.z, p.x, p.y));
  S.torches.forEach((l, i)=>{
    const o = near[i];
    if(!o){ l.intensity = 0; return; }
    l.color.setHex(o.c); l.distance = o.small ? 6 : 11;
    l.position.set(o.x, o.y, o.z); l.intensity = o.i*dark*(0.88 + 0.12*Math.sin(t*11 + o.ph));
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
  W.moteMat.uniforms.uCenter.value.set(p.x, 0, p.y);
  W.moteMat.uniforms.uScale.value = S.renderer.domElement.height/2/Math.tan(S.camera.fov*PI/360);
};

proto.dispose = function(){
  this.group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
  const K2 = DG.Kit;
  K2.timed = K2.timed.filter(m=> m !== this.waterMat && m !== this.moteMat && !(this.glowMats || []).includes(m));
};

})();
