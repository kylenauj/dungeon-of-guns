/* ------------------------------------------------------------------ *
 *  The world: the floor's tiles turned into stone.
 *
 *  Geometry is merged per "area" (a room and its walls, or a corridor),
 *  so the fog of war is just area.visible: rooms appear as you reach
 *  them, and secret corridors only once their illusion is broken.
 *
 *  South-facing walls (the ones between you and the camera) are built
 *  low, so they never hide the wizard. Painted doors, illusionary
 *  walls, portcullises, torches, traps and props sit on top.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE;
const WH = K.WALL_H, LOW = 0.55;

const World = DG.World = function(D){
  const W = this;
  W.D = D; W.group = new THREE.Group(); W.th = D.theme;
  W.areas = {}; W.doors = []; W.fakes = []; W.torches = []; W.traps = []; W.props = {}; W.braziers = [];
  W.mats = {
    floor: new THREE.MeshPhongMaterial({ vertexColors:true, map:K.floorTex, shininess:0, specular:0x000000 }),
    wall:  new THREE.MeshPhongMaterial({ vertexColors:true, map:K.stoneTex, shininess:0, specular:0x000000 }),
    plain: new THREE.MeshPhongMaterial({ vertexColors:true, shininess:0, specular:0x000000 })
  };
  W.assignAreas();
  W.buildAreas();
  W.buildDoors();
  W.buildFakes();
  W.buildPainted();
  W.buildTorches();
  W.buildTraps();
  D.rooms.forEach(r=> r.props.forEach(p=> W.addProp(p)));
};
const proto = World.prototype;

/* ---- which area each tile draws in ---- */
proto.assignAreas = function(){
  const D = this.D, A = this.area = new Int16Array(D.w*D.h).fill(-1);
  const set = (x, y, v)=>{ if(x >= 0 && y >= 0 && x < D.w && y < D.h && A[y*D.w + x] < 0) A[y*D.w + x] = v; };
  D.rooms.forEach(r=>{ for(let y=r.y1 - 1; y<=r.y2 + 1; y++) for(let x=r.x1 - 1; x<=r.x2 + 1; x++) set(x, y, r.id); });
  D.fakes.forEach(f=>{ if(f.puzzle){ const [x, y] = f.tiles[0]; for(let yy=y - 4; yy<y; yy++) for(let xx=x - 2; xx<=x + 2; xx++) set(xx, yy, f.room); } });
  D.corridors.forEach(c=> c.tiles.forEach(([x, y])=> set(x, y, 100 + c.id)));
  // corridor walls take their corridor's area
  D.corridors.forEach(c=> c.tiles.forEach(([x, y])=> DG.DIRS8.forEach(([dx, dy])=> set(x + dx, y + dy, 100 + c.id))));
};
proto.areaGroup = function(id){
  if(!this.areas[id]){ const g = new THREE.Group(); g.visible = false; this.group.add(g); this.areas[id] = { g, id }; }
  return this.areas[id].g;
};

/* ---- floor, walls, blocks, pits ---- */
proto.buildAreas = function(){
  const W = this, D = W.D, th = W.th, buckets = {};
  const B = id=> buckets[id] || (buckets[id] = { floor:[], wall:[], plain:[] });
  const hash = (x, y)=>{ const h = Math.sin(x*127.1 + y*311.7)*43758.5453; return h - Math.floor(h); };
  const walkable = t=> t === T.FLOOR || t === T.DOOR || t === T.PIT || t === T.BLOCK;
  const cF1 = new THREE.Color(th.floor).multiplyScalar(1.35), cF2 = new THREE.Color(th.floor2).multiplyScalar(1.35), cW = new THREE.Color(th.wall).multiplyScalar(1.2), cTop = new THREE.Color(th.top).multiplyScalar(1.2);
  for(let y=0; y<D.h; y++) for(let x=0; x<D.w; x++){
    const t = D.at(x, y), a = W.area[y*D.w + x];
    if(a < 0) continue;
    const b = B(a), h = hash(x, y);
    if(t === T.FLOOR || t === T.DOOR || t === T.BLOCK){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI/2); g.translate(x + 0.5, 0, y + 0.5);
      const c = ((x + y) & 1 ? cF1 : cF2).clone().multiplyScalar(0.85 + h*0.3);
      b.floor.push(K.paint(g, c));
    }
    if(t === T.BLOCK){
      const room = DG.Dungeon.roomAt(D, x + 0.5, y + 0.5), crate = room && room.style === "crates";
      if(crate){
        const g = new THREE.BoxGeometry(0.9, 0.85, 0.9); g.translate(x + 0.5, 0.425, y + 0.5);
        b.plain.push(K.paint(g, 0x7a5232, (c, px, py, pz)=>{ const ex = Math.abs(px - x - 0.5) > 0.4, ez = Math.abs(pz - y - 0.5) > 0.4, ey = py > 0.8 || py < 0.05; if((ex && ez) || (ex && ey) || (ez && ey)) c.multiplyScalar(0.55); else c.multiplyScalar(0.85 + h*0.3); }));
      } else {
        const g = new THREE.BoxGeometry(0.86, 1.5, 0.86); g.translate(x + 0.5, 0.75, y + 0.5);
        b.wall.push(K.paint(g, cW, (c, px, py)=>{ if(py > 1.45) c.copy(cTop); c.multiplyScalar(0.9 + h*0.2); }));
      }
    }
    if(t === T.PIT){
      const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI/2); g.translate(x + 0.5, -2.2, y + 0.5);
      b.plain.push(K.paint(g, 0x020203));
      // the pit's sides, where it meets floor
      DG.DIRS4.forEach(([dx, dy])=>{
        if(D.at(x + dx, y + dy) === T.PIT) return;
        const s = new THREE.PlaneGeometry(1, 2.2);
        s.translate(0, -1.1, 0);
        s.rotateY(dx === 1 ? -Math.PI/2 : dx === -1 ? Math.PI/2 : dy === 1 ? Math.PI : 0);
        s.translate(x + 0.5 + dx*0.5, 0, y + 0.5 + dy*0.5);
        b.plain.push(K.paint(s, cW.clone().multiplyScalar(0.35), (c, px, py)=> c.multiplyScalar(Math.max(0.05, 1 + py/1.4))));
      });
    }
    if(t === T.SOLID){
      // only walls that touch somewhere you can stand
      let touch = false;
      for(const [dx, dy] of DG.DIRS8){ const n = D.at(x + dx, y + dy); if(walkable(n) || n === T.FAKE){ touch = true; break; } }
      if(!touch) continue;
      const south = walkable(D.at(x, y - 1)) && !walkable(D.at(x, y + 1));   // floor north of it: it faces away from the camera
      const hh = south ? LOW : WH;
      const g = new THREE.BoxGeometry(1, hh, 1); g.translate(x + 0.5, hh/2, y + 0.5);
      // scale the stone texture to the wall's height
      const uv = g.attributes.uv; for(let i=0;i<uv.count;i++) uv.setY(i, uv.getY(i)*hh/1.5);
      b.wall.push(K.paint(g, cW, (c, px, py)=>{ if(py > hh - 0.01) c.copy(cTop).multiplyScalar(0.85 + h*0.25); else c.multiplyScalar((0.75 + h*0.35)*(0.55 + 0.45*py/WH)); }));
    }
  }
  for(const id in buckets){
    const b = buckets[id], g = W.areaGroup(+id);
    if(b.floor.length){ const m = new THREE.Mesh(K.merge(b.floor), W.mats.floor); m.receiveShadow = true; g.add(m); }
    if(b.wall.length) g.add(new THREE.Mesh(K.merge(b.wall), W.mats.wall));
    if(b.plain.length) g.add(new THREE.Mesh(K.merge(b.plain), W.mats.plain));
  }
  // a little rubble and some bones, for character
  D.rooms.forEach(r=>{
    const rnd = DG.RNG(D.seed + r.id*31).next, parts = [];
    const n = Math.round((r.x2 - r.x1)*(r.y2 - r.y1)/30);
    for(let i=0;i<n;i++){
      const x = r.x1 + rnd()*(r.x2 - r.x1 + 1), y = r.y1 + rnd()*(r.y2 - r.y1 + 1);
      if(D.at(Math.floor(x), Math.floor(y)) !== T.FLOOR) continue;
      if(rnd() < 0.6) parts.push(K.paint(K.at(K.lump(0.08 + rnd()*0.1, 0, 0.4), x, 0.04, y), cW.clone().multiplyScalar(0.8)));
      else {
        const bone = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 4); bone.rotateZ(Math.PI/2); bone.rotateY(rnd()*6);
        parts.push(K.paint(K.at(bone, x, 0.04, y), 0xd8d0b8));
      }
    }
    if(parts.length) W.areaGroup(r.id).add(new THREE.Mesh(K.merge(parts), W.mats.plain));
  });
};

/* ---- portcullises ---- */
proto.buildDoors = function(){
  const W = this;
  const barM = K.lambert(0x3a3a44), runeM = K.basic(0xff4a3a, { transparent:true, opacity:0 });
  W.D.doors.forEach(d=>{
    const g = new THREE.Group();
    const along = d.axis === "v" ? "z" : "x";
    for(let i=0;i<9;i++){
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, WH, 0.09), barM);
      const o = -1.4 + i*0.35;
      bar.position.set(along === "x" ? o : 0, WH/2, along === "z" ? o : 0);
      g.add(bar);
    }
    for(const yy of [0.5, 1.2]){ const rail = new THREE.Mesh(new THREE.BoxGeometry(along === "x" ? 3 : 0.1, 0.1, along === "z" ? 3 : 0.1), barM); rail.position.y = yy; g.add(rail); }
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), runeM.clone());
    glow.rotation.x = -Math.PI/2; glow.position.y = 0.03; if(along === "z") glow.rotation.z = Math.PI/2;
    g.add(glow);
    g.position.set(d.x, -WH - 0.1, d.y);
    W.areaGroup(W.area[(d.y - 0.5)*W.D.w + (d.x - 0.5)] >= 0 ? W.area[(d.y - 0.5)*W.D.w + (d.x - 0.5)] : d.room).add(g);
    W.doors.push({ d, g, glow, h:-WH - 0.1 });
  });
};

/* ---- illusionary walls: wall boxes you can walk through ---- */
proto.buildFakes = function(){
  const W = this, th = W.th;
  W.D.fakes.forEach(f=>{
    const parts = [];
    f.tiles.forEach(([x, y])=>{
      const g = new THREE.BoxGeometry(1, WH, 1); g.translate(x + 0.5, WH/2, y + 0.5);
      // a faint tell: the stone is a shade off, if you're looking
      parts.push(K.paint(g, th.wall, (c, px, py)=>{ if(py > WH - 0.01) c.setHex(th.top); c.multiplyScalar(0.93); }));
    });
    const m = new THREE.Mesh(K.merge(parts), new THREE.MeshPhongMaterial({ vertexColors:true, map:K.stoneTex, shininess:0, transparent:true, opacity:1, specular:0 }));
    const a = W.area[f.tiles[0][1]*W.D.w + f.tiles[0][0]];
    W.areaGroup(a >= 0 ? a : f.room).add(m);
    W.fakes.push({ f, m, t:0 });
  });
};

/* ---- painted doors (and the puzzle's honest one) on north walls ---- */
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
  const stick = K.lambert(0x4a3020), metal = K.lambert(0x2a2a30);
  D.rooms.forEach(r=>{
    const y = r.y1 - 1, step = 5, off = (r.x1 + r.id) % step;
    for(let x=r.x1 + 1; x<r.x2; x++){
      if((x - r.x1 - off) % step !== 0) continue;
      if(D.at(x, y) !== T.SOLID || D.painted.some(p=> p.x === x && p.y === y)) continue;
      if(r.props.some(p=> p.kind === "sign" && Math.abs(p.x - x) < 1)) continue;
      const g = new THREE.Group(); g.position.set(x + 0.5, 1.15, y + 1.05);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.4, 5), stick); s.rotation.x = 0.5; g.add(s);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, 0.1, 6), metal); cup.position.set(0, 0.2, 0.1); g.add(cup);
      const flame = K.sprite(W.th.torch, 0.55, 0.95); flame.position.set(0, 0.32, 0.12); g.add(flame);
      const core = K.sprite(0xffffff, 0.2, 0.9); core.position.set(0, 0.3, 0.12); g.add(core);
      W.areaGroup(r.id).add(g);
      W.torches.push({ x:x + 0.5, y:y + 1.3, room:r.id, flame, core, ph:Math.random()*6 });
    }
  });
};

/* ---- traps ---- */
proto.buildTraps = function(){
  const W = this;
  const plateM = K.lambert(0x55555e), spikeM = K.lambert(0xc8ccd8), grateM = K.lambert(0x222226);
  W.D.rooms.forEach(r=> r.traps.forEach(t=>{
    const g = new THREE.Group(); g.position.set(t.x + 0.5, 0, t.y + 0.5);
    const o = { t, g };
    if(t.kind === "spikes"){
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.04, 0.94), plateM); plate.position.y = 0.02; g.add(plate);
      const sp = new THREE.Group(); g.add(sp);
      for(let i=0;i<3;i++) for(let j=0;j<3;j++){ const c = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.45, 4), spikeM); c.position.set(-0.3 + i*0.3, 0.22, -0.3 + j*0.3); sp.add(c); }
      sp.position.y = -0.45; o.spikes = sp; o.plate = plate;
    } else if(t.kind === "darts"){
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.5), K.basic(0x000000));
      slit.position.set(t.dir*0.52, 0.8, 0); g.add(slit);
      const fx = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.3), K.basic(0x8a2a1a)); fx.position.set(t.dir*0.54, 0.95, 0); g.add(fx);
    } else if(t.kind === "vent"){
      const grate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.8), grateM); grate.position.y = 0.02; g.add(grate);
      for(let i=0;i<4;i++){ const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.78), K.lambert(0x4a4a50)); bar.position.set(-0.27 + i*0.18, 0.04, 0); g.add(bar); }
      const glow = new THREE.Mesh(K.glowPlane, K.glowMat(0xff6a1a, 0)); glow.scale.set(1.6, 1, 1.6); glow.position.y = 0.06; g.add(glow);
      o.glow = glow;
    } else if(t.kind === "banana"){
      const peel = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.06, 4, 8, Math.PI*1.1), K.lambert(0xf2d23a));
      peel.rotation.x = -Math.PI/2; peel.position.y = 0.06; peel.rotation.z = Math.random()*6; g.add(peel);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 3), K.lambert(0x5a4a1a)); tip.position.set(0.18, 0.06, 0); g.add(tip);
      o.peel = g;
    }
    W.areaGroup(r.id).add(g);
    W.traps.push(o);
  }));
};

/* ---- props: chests, signs, the merchant, pedestals, braziers ---- */
proto.addProp = function(p){
  const W = this, g = new THREE.Group(), o = { p, g };
  g.position.set(p.x + 0.5, 0, p.y + 0.5);
  if(p.kind === "chest"){
    const col = [0x8a5a2b, 0x8a5a2b, 0x6a7080, 0xd8a83a][p.tier] || 0x8a5a2b, band = p.tier >= 3 ? 0xffe680 : p.tier === 2 ? 0x46e4ff : 0xb08a3a;
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.55), K.lambert(col)); base.position.y = 0.21; g.add(base);
    const lid = new THREE.Group(); lid.position.set(0, 0.42, -0.27); g.add(lid);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 8, 1, false, 0, Math.PI), K.lambert(col));
    top.rotation.z = Math.PI/2; top.rotation.y = Math.PI/2; top.position.set(0, 0, 0.27); top.rotation.x = 0; lid.add(top);
    top.rotation.set(0, 0, Math.PI/2); top.scale.set(1, 1, 1);
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.6), K.lambert(band)); b1.position.y = 0.38; g.add(b1);
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.05), K.lambert(band)); lock.position.set(0, 0.36, 0.29); g.add(lock);
    const glow = K.sprite(p.tier >= 2 ? 0x46e4ff : 0xffd23d, 1.6, p.locked ? 0.1 : 0.35); glow.position.y = 0.5; g.add(glow);
    o.lid = lid; o.glow = glow;
  } else if(p.kind === "sign"){
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), K.lambert(0x4a3020)); post.position.y = 0.45; g.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.06), [K.lambert(0x6a4a2a), K.lambert(0x6a4a2a), K.lambert(0x6a4a2a), K.lambert(0x6a4a2a),
      new THREE.MeshLambertMaterial({ map:K.textTex([p.riddle ? "RIDDLE" : "READ ME"], 64, 36, { size:13 }) }), K.lambert(0x6a4a2a)]);
    board.position.y = 0.95; board.rotation.x = -0.25; g.add(board);
    g.position.z += 0.2;
  } else if(p.kind === "merchant"){
    const R = DG.Models.goblin("merchant"); R.root.rotation.y = 0; g.add(R.root); o.rig = R;
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 0.6), K.lambert(0x6a4a2a)); counter.position.set(0, 0.35, 0.9); g.add(counter);
    const cloth = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.06, 0.65), K.lambert(0x8a2a3a)); cloth.position.set(0, 0.72, 0.9); g.add(cloth);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map:K.textTex(["SNIBBIT'S", "no refunds"], 128, 32, { size:12, bg:"#2a1a10", fg:"#ffd23d" }) }));
    sign.position.set(0, 2.05, -0.3); g.add(sign);
  } else if(p.kind === "pedestal"){
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.7, 6), K.lambert(W.th.top)); col.position.y = 0.35; g.add(col);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 6), K.lambert(W.th.wall)); top.position.y = 0.74; g.add(top);
    o.holder = new THREE.Group(); o.holder.position.y = 1.15; g.add(o.holder);
    o.shown = null;
  }
  W.areaGroup(p.room).add(g);
  W.props[p.id] = o;
  return o;
};

/* braziers for the lights-out puzzle */
proto.buildBraziers = function(room){
  const W = this;
  if(!room.puzzle || room.puzzle.kind !== "braziers" || W.braziers.length) return;
  room.puzzle.items.forEach((it, i)=>{
    const g = new THREE.Group(); g.position.set(it.x, 0, it.y);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.7, 6), K.lambert(0x3a3a40)); leg.position.y = 0.35; g.add(leg);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.18, 0.22, 8), K.lambert(0x5a5a64)); bowl.position.y = 0.8; g.add(bowl);
    const coal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), K.basic(0x2a1a14)); coal.position.y = 0.9; g.add(coal);
    const flame = K.sprite(0xff8a2a, 1.3, 0.9); flame.position.y = 1.2; g.add(flame);
    const core = K.sprite(0xffe08a, 0.5, 0.9); core.position.y = 1.1; g.add(core);
    W.areaGroup(room.id).add(g);
    W.braziers.push({ i, g, flame, core, coal, room });
  });
};

/* ---- per frame ---- */
proto.update = function(G, dt, t){
  const W = this, D = W.D, p = G.player;
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
  // doors drop into the floor when open, slam up when shut
  W.doors.forEach(o=>{
    const want = o.d.open ? -WH - 0.1 : 0;
    o.h += (want - o.h)*(1 - Math.exp(-dt*(o.d.open ? 4 : 14)));
    o.g.position.y = o.h;
    o.glow.material.opacity = o.d.open ? 0 : 0.5 + 0.3*Math.sin(t*6);
    o.glow.position.y = 0.03 - o.h;
  });
  // illusions, once found, go see-through and shimmer
  W.fakes.forEach(o=>{
    if(!o.f.revealed) return;
    o.t += dt;
    o.m.material.opacity = Math.max(0.28, 1 - o.t*1.5) + 0.08*Math.sin(t*5);
    o.m.material.depthWrite = false;
  });
  // torches flicker; the nearest ones get the real lights
  W.torches.forEach(o=>{ const f = 0.85 + 0.15*Math.sin(t*13 + o.ph) + 0.08*Math.sin(t*31 + o.ph*2); o.flame.scale.setScalar(0.55*f); o.flick = f; });
  const near = W.torches.filter(o=> D.rooms[o.room].seen).sort((a, b)=> DG.dist2(a.x, a.y, p.x, p.y) - DG.dist2(b.x, b.y, p.x, p.y));
  DG.Stage.torches.forEach((l, i)=>{
    const o = near[i];
    if(!o){ l.intensity = 0; return; }
    l.position.set(o.x, 1.5, o.y + 0.4); l.intensity = 1.8*o.flick;
  });
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
      if(pr.kind === "merchant" && o.rig) DG.Models.idle(o.rig, t, 0);
      if(pr.kind === "pedestal"){
        const s = pr.item;
        if(s.sold && o.shown){ o.holder.remove(o.shown); o.shown = null; }
        if(!s.sold && !o.shown){ o.shown = DG.Models.item(s.item); o.holder.add(o.shown); }
        if(o.shown){ o.shown.rotation.y = t*1.2; o.shown.position.y = Math.sin(t*2)*0.06; }
      }
    });
  });
  // braziers
  if(G.room && G.room.puzzle && G.room.puzzle.kind === "braziers") W.buildBraziers(G.room);
  W.braziers.forEach(o=>{
    const lit = o.room.puzzle.lit[o.i];
    const f = lit ? 1 + 0.12*Math.sin(t*14 + o.i) : 0;
    o.flame.scale.setScalar(1.3*f + 0.001); o.core.scale.setScalar(0.5*f + 0.001);
    o.coal.material.color.setHex(lit ? 0xff5a1a : 0x2a1a14);
  });
};

proto.dispose = function(){
  this.group.traverse(o=>{ if(o.geometry) o.geometry.dispose(); });
};

})();
