/* ------------------------------------------------------------------ *
 *  The dungeon generator. Every floor of every run is new.
 *
 *  1. A room graph grows on a coarse grid of cells (Isaac-style): a
 *     tree from the start room, plus a few loops.
 *  2. Dead ends become the boss, treasure and shop rooms; one room
 *     becomes a puzzle; an empty cell beside the map becomes a secret
 *     room behind an illusionary wall.
 *  3. Each cell gets a rectangle of a room; neighbours are joined by
 *     3-wide corridors (straight, or with a dog-leg), with a door at
 *     each end.
 *  4. Rooms get furniture (pillars, pits, crates), traps and goblins,
 *     and every room is checked to be walkable from its doors.
 *
 *  Tiles are a flat Uint8Array; (x, y) is column, row. A tile's centre
 *  in the world is (x + 0.5, y + 0.5).
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const T = DG.TILE = { SOLID:0, FLOOR:1, PIT:2, DOOR:3, FAKE:4, BLOCK:5 };
const CW = 28, CH = 22, GW = 7, GH = 7, M = 3;   // cell size, grid size, margin inside a cell

const Dungeon = DG.Dungeon = {};
Dungeon.CW = CW; Dungeon.CH = CH;

Dungeon.generate = function(seed, floor){
  const rng = DG.RNG(seed);
  for(let attempt=0; attempt<40; attempt++){
    const d = tryGenerate(rng, floor, seed);
    if(d) return d;
  }
  throw new Error("dungeon: no layout for seed " + seed);
};

function tryGenerate(rng, floor, seed){
  const S = DG.FLOOR_SCALE(floor);
  const W = CW*GW, H = CH*GH;
  const D = { seed, floor, w:W, h:H, tiles:new Uint8Array(W*H), rooms:[], doors:[], corridors:[], painted:[], fakes:[], theme:DG.FLOORS[(floor - 1) % DG.FLOORS.length] };
  D.at = (x, y)=> (x < 0 || y < 0 || x >= W || y >= H) ? T.SOLID : D.tiles[y*W + x];
  D.set = (x, y, v)=>{ if(x >= 0 && y >= 0 && x < W && y < H) D.tiles[y*W + x] = v; };

  /* ---- 1. the room graph ---- */
  const cells = {}, rooms = D.rooms, edges = [];
  const addRoom = (cx, cy)=>{ const r = { id:rooms.length, cx, cy, type:"combat", links:[], doors:[] }; rooms.push(r); cells[DG.key(cx, cy)] = r; return r; };
  const roomAt = (cx, cy)=> cells[DG.key(cx, cy)];
  const link = (a, b)=>{ a.links.push(b.id); b.links.push(a.id); edges.push([a.id, b.id]); };
  const start = addRoom(3, 3); start.type = "start";
  const target = S.rooms;
  let guard = 0;
  while(rooms.length < target && guard++ < 2000){
    const r = rng.pick(rooms);
    if(r.links.length >= 3 && rng.chance(0.8)) continue;
    const [dx, dy] = rng.pick(DG.DIRS4), nx = r.cx + dx, ny = r.cy + dy;
    if(nx < 0 || ny < 0 || nx >= GW || ny >= GH || roomAt(nx, ny)) continue;
    let occ = 0; DG.DIRS4.forEach(([ex, ey])=>{ if(roomAt(nx + ex, ny + ey)) occ++; });
    if(occ > 1 && rng.chance(0.85)) continue;
    link(r, addRoom(nx, ny));
  }
  if(rooms.length < target) return null;

  // distance from the start
  const dist = bfsRooms(rooms, 0);
  rooms.forEach(r=> r.dist = dist[r.id]);
  const dead = rooms.filter(r=> r.id !== 0 && r.links.length === 1).sort((a, b)=> b.dist - a.dist);
  if(dead.length < 3 || dead[0].dist < 3) return null;
  dead[0].type = "boss";
  // treasure and shop: the next dead ends, not touching the start
  const rest = dead.slice(1).filter(r=> r.dist >= 2);
  if(rest.length < 2) return null;
  rng.shuffle(rest);
  rest[0].type = "treasure"; rest[1].type = "shop";
  // a puzzle room: any plain room not next to the start
  const plain = rooms.filter(r=> r.type === "combat" && r.dist >= 2);
  if(plain.length < 2) return null;
  const pz = rng.pick(plain); pz.type = "puzzle";

  // a few loops, only between plain rooms
  rooms.forEach(a=>{
    [[1, 0], [0, 1]].forEach(([dx, dy])=>{
      const b = roomAt(a.cx + dx, a.cy + dy);
      if(!b || a.links.indexOf(b.id) >= 0) return;
      const ok = r=> r.type === "combat" || r.type === "start";
      if(ok(a) && ok(b) && rng.chance(0.22)) link(a, b);
    });
  });

  // the secret room: an empty cell next to a plain room (two neighbours is nicer)
  let secret = null;
  const cand = [];
  for(let cy=0; cy<GH; cy++) for(let cx=0; cx<GW; cx++){
    if(roomAt(cx, cy)) continue;
    const ns = DG.DIRS4.map(([dx, dy])=> roomAt(cx + dx, cy + dy)).filter(r=> r && (r.type === "combat" || r.type === "start" || r.type === "treasure"));
    if(ns.length) cand.push({ cx, cy, ns, w:ns.length*ns.length });
  }
  if(cand.length){
    const c = rng.weighted(cand);
    secret = addRoom(c.cx, c.cy); secret.type = "secret"; secret.hidden = true;
    const host = rng.pick(c.ns);
    secret.links.push(host.id); host.links.push(secret.id); edges.push([host.id, secret.id, "secret"]);
    secret.dist = host.dist + 1;
  }

  /* ---- 2. rectangles ---- */
  rooms.forEach(r=>{
    const size = {
      start:[13, 11, 13, 11], boss:[21, 15, 22, 16], treasure:[11, 9, 13, 11], shop:[15, 11, 15, 11],
      puzzle:[15, 11, 17, 12], secret:[9, 7, 11, 9], combat:[11, 9, 22, 16]
    }[r.type];
    const w = rng.int(size[0], size[2]), h = rng.int(size[1], size[3]);
    const ox = r.cx*CW, oy = r.cy*CH;
    const top = r.type === "puzzle" ? 6 : M;           // a puzzle room leaves space above for a closet
    r.x1 = ox + rng.int(M, CW - M - w); r.x2 = r.x1 + w - 1;
    r.y1 = oy + rng.int(top, Math.max(top, CH - M - h)); r.y2 = r.y1 + h - 1;
    if(r.y2 > oy + CH - M - 1){ r.y2 = oy + CH - M - 1; }
    for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) D.set(x, y, T.FLOOR);
    r.cxw = (r.x1 + r.x2 + 1)/2; r.cyw = (r.y1 + r.y2 + 1)/2;   // world centre
  });

  /* ---- 3. corridors and doors ---- */
  edges.forEach(([ia, ib, kind])=>{
    let a = rooms[ia], b = rooms[ib];
    if(a.cx > b.cx || a.cy > b.cy){ const t = a; a = b; b = t; }
    carveCorridor(D, rng, a, b, a.cx !== b.cx ? "x" : "y", kind === "secret" ? (a.type === "secret" ? "a" : "b") : null);
  });

  /* ---- 4. contents ---- */
  rooms.forEach(r=>{
    r.waves = []; r.traps = []; r.props = []; r.cleared = r.type !== "combat" && r.type !== "boss";
    if(r.type === "combat") furnish(D, rng, r);
    if(r.type === "combat") trapRoom(D, rng, r, S);
    if(r.type === "combat") populate(D, rng, r, floor, S);
  });
  const st = rooms[0];
  D.start = { x:st.cxw, y:st.cyw + 1 };
  st.props.push({ kind:"sign", x:Math.floor(st.cxw), y:st.y1, text:"WASD move · mouse aim · click shoot · right-click cast · SPACE blink · E use · Q swap · TAB bag" });

  rooms.forEach(r=>{
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw);
    if(r.type === "treasure") r.props.push({ kind:"chest", x:cx, y:cy, tier:1 });
    if(r.type === "secret")   r.props.push({ kind:"chest", x:cx, y:cy, tier:2 });
    if(r.type === "shop"){
      r.props.push({ kind:"merchant", x:cx, y:r.y1 + 1 });
      for(let i=0;i<4;i++) r.props.push({ kind:"pedestal", x:cx - 3 + i*2, y:cy + 1, slot:i });
    }
    if(r.type === "boss") r.boss = { x:r.cxw, y:r.y1 + 3.5 };
    if(r.type === "puzzle") makePuzzle(D, rng, r);
  });

  // painted doors (the bonk kind) on a few plain north walls
  rooms.forEach(r=>{
    if((r.type === "combat" || r.type === "start") && rng.chance(r.type === "start" ? 1 : 0.22)) paintDoor(D, rng, r);
  });

  if(!validate(D)) return null;
  return D;
}

function bfsRooms(rooms, from){
  const d = rooms.map(()=> Infinity); d[from] = 0; const q = [from];
  while(q.length){ const i = q.shift(); rooms[i].links.forEach(j=>{ if(d[j] === Infinity){ d[j] = d[i] + 1; q.push(j); } }); }
  return d;
}

/* a corridor between a (left/top) and b (right/bottom). ax: "x" joins
   side by side, "y" joins top to bottom. secretSide: which end is
   the secret room's ("a"/"b"); the other end's door is an illusion. */
function carveCorridor(D, rng, a, b, ax, secretSide){
  // work in (u, v): u runs along the join, v across it
  const U1 = r=> ax === "x" ? r.x1 : r.y1, U2 = r=> ax === "x" ? r.x2 : r.y2;
  const V1 = r=> ax === "x" ? r.y1 : r.x1, V2 = r=> ax === "x" ? r.y2 : r.x2;
  const put = (u, v, t)=> ax === "x" ? D.set(u, v, t) : D.set(v, u, t);
  const uA = U2(a) + 1, uB = U1(b) - 1;                // the two walls
  const lo = Math.max(V1(a), V1(b)) + 1, hi = Math.min(V2(a), V2(b)) - 1;
  let vA, vB, bend = null;
  if(lo <= hi && rng.chance(0.75)){ vA = vB = rng.int(lo, hi); }
  else {
    vA = rng.int(V1(a) + 1, V2(a) - 1); vB = rng.int(V1(b) + 1, V2(b) - 1);
    if(vA !== vB) bend = rng.int(uA + 2, uB - 2);
  }
  const tiles = [];
  const carve = (u, v)=>{ put(u, v, DG.TILE.FLOOR); tiles.push(ax === "x" ? [u, v] : [v, u]); };
  if(bend === null){
    for(let u=uA+1; u<uB; u++) for(let k=-1;k<=1;k++) carve(u, vA + k);
  } else {
    for(let u=uA+1; u<=bend+1; u++) for(let k=-1;k<=1;k++) carve(u, vA + k);
    for(let v=Math.min(vA, vB)-1; v<=Math.max(vA, vB)+1; v++) for(let k=-1;k<=1;k++) carve(bend + k, v);
    for(let u=bend-1; u<uB; u++) for(let k=-1;k<=1;k++) carve(u, vB + k);
  }
  const corr = { id:D.corridors.length, a:a.id, b:b.id, tiles, secret:!!secretSide };
  D.corridors.push(corr);
  // the two ends
  const end = (room, u, v, side)=>{
    const t3 = [-1, 0, 1].map(k=> ax === "x" ? [u, v + k] : [v + k, u]);
    const isSecretRoom = secretSide && ((secretSide === "a") === (room === a));
    if(secretSide && !isSecretRoom){
      // the host room's side: an illusionary wall, walkable, looks solid
      t3.forEach(([x, y])=> D.set(x, y, DG.TILE.FAKE));
      D.fakes.push({ room:room.id, corridor:corr.id, tiles:t3, revealed:false, x:t3[1][0] + 0.5, y:t3[1][1] + 0.5 });
      return;
    }
    if(isSecretRoom){ t3.forEach(([x, y])=> D.set(x, y, DG.TILE.FLOOR)); return; }
    const door = { id:D.doors.length, room:room.id, corridor:corr.id, tiles:t3, open:true, axis:ax === "x" ? "v" : "h", side,
                   x:t3[1][0] + 0.5, y:t3[1][1] + 0.5 };
    t3.forEach(([x, y])=> D.set(x, y, DG.TILE.DOOR));
    D.doors.push(door); room.doors.push(door.id);
  };
  end(a, uA, vA, ax === "x" ? "e" : "s");
  end(b, uB, vB, ax === "x" ? "w" : "n");
}

/* inside tiles near a door, where nothing should be put */
function nearDoor(D, r, x, y, d){
  return r.doors.some(id=>{ const o = D.doors[id]; return Math.abs(o.x - 0.5 - x) + Math.abs(o.y - 0.5 - y) <= d; })
      || D.fakes.some(f=> f.room === r.id && Math.abs(f.x - 0.5 - x) + Math.abs(f.y - 0.5 - y) <= d);
}

/* furniture: pillars, a pit, crates or low walls, kept clear of doors and
   rolled back if it cuts the room in two */
function furnish(D, rng, r){
  const w = r.x2 - r.x1 + 1, h = r.y2 - r.y1 + 1;
  const style = rng.weighted([{ s:"pillars", w:3 }, { s:"pit", w:w >= 15 && h >= 11 ? 2 : 0 }, { s:"crates", w:3 }, { s:"cross", w:w >= 15 ? 1.5 : 0 }, { s:"empty", w:1 }]).s;
  r.style = style;
  const placed = [];
  const put = (x, y, t)=>{
    if(x <= r.x1 || y <= r.y1 || x >= r.x2 || y >= r.y2) return;
    if(nearDoor(D, r, x, y, 3) || D.at(x, y) !== DG.TILE.FLOOR) return;
    D.set(x, y, t); placed.push([x, y]);
  };
  const cx = Math.floor((r.x1 + r.x2)/2), cy = Math.floor((r.y1 + r.y2)/2);
  if(style === "pillars"){
    const sx = rng.int(3, 5), sy = rng.int(3, 4), big = rng.chance(0.4);
    for(let y=r.y1 + 2; y<=r.y2 - 2; y+=sy) for(let x=r.x1 + 2; x<=r.x2 - 2; x+=sx){
      if(rng.chance(0.3)) continue;
      put(x, y, DG.TILE.BLOCK); if(big){ put(x + 1, y, DG.TILE.BLOCK); put(x, y + 1, DG.TILE.BLOCK); put(x + 1, y + 1, DG.TILE.BLOCK); }
    }
  } else if(style === "pit"){
    const pw = rng.int(3, Math.floor(w/2) - 1), ph = rng.int(2, Math.floor(h/2) - 2);
    for(let y=cy - Math.floor(ph/2); y<cy - Math.floor(ph/2) + ph; y++) for(let x=cx - Math.floor(pw/2); x<cx - Math.floor(pw/2) + pw; x++) put(x, y, DG.TILE.PIT);
  } else if(style === "crates"){
    const n = Math.round(w*h/28);
    for(let i=0;i<n;i++){ const x = rng.int(r.x1 + 1, r.x2 - 1), y = rng.int(r.y1 + 1, r.y2 - 1); put(x, y, DG.TILE.BLOCK); if(rng.chance(0.4)) put(x + 1, y, DG.TILE.BLOCK); }
  } else if(style === "cross"){
    for(let x=cx - 3; x<=cx + 3; x++) if(Math.abs(x - cx) > 1) put(x, cy, DG.TILE.BLOCK);
    for(let y=cy - 2; y<=cy + 2; y++) if(Math.abs(y - cy) > 1) put(cx, y, DG.TILE.BLOCK);
  }
  if(!roomConnected(D, r)){ placed.forEach(([x, y])=> D.set(x, y, DG.TILE.FLOOR)); r.style = "empty"; }
}

/* every floor tile in the room reachable from its first door */
function roomConnected(D, r){
  const W = D.w, seen = new Uint8Array(W*D.h), q = [];
  let total = 0;
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === DG.TILE.FLOOR) total++;
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === DG.TILE.FLOOR){ q.push([x, y]); seen[y*W + x] = 1; y = r.y2 + 1; break; }
  let n = 0;
  while(q.length){
    const [x, y] = q.pop(); n++;
    DG.DIRS4.forEach(([dx, dy])=>{
      const nx = x + dx, ny = y + dy;
      if(nx < r.x1 || ny < r.y1 || nx > r.x2 || ny > r.y2 || seen[ny*W + nx] || D.at(nx, ny) !== DG.TILE.FLOOR) return;
      seen[ny*W + nx] = 1; q.push([nx, ny]);
    });
  }
  return n === total;
}

function freeTiles(D, r, opts){
  opts = opts || {};
  const out = [];
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++){
    if(D.at(x, y) !== DG.TILE.FLOOR) continue;
    if(nearDoor(D, r, x, y, opts.door || 4)) continue;
    if(r.traps.some(t=> t.x === x && t.y === y)) continue;
    if(opts.edge && (x === r.x1 || x === r.x2 || y === r.y1 || y === r.y2)) continue;
    out.push([x, y]);
  }
  return out;
}

/* minor traps */
function trapRoom(D, rng, r, S){
  if(!rng.chance(S.traps)) return;
  const n = rng.int(1, 2 + Math.floor(D.floor/2));
  for(let i=0;i<n;i++){
    const kind = rng.weighted([{ k:"spikes", w:4 }, { k:"darts", w:3 }, { k:"vent", w:D.floor >= 2 ? 2 : 0 }, { k:"banana", w:2 }]).k;
    const free = freeTiles(D, r, { door:3 });
    if(!free.length) return;
    if(kind === "darts"){
      // a slit in the west or east wall, firing across the room
      const y = rng.int(r.y1 + 1, r.y2 - 1), west = rng.chance(0.5);
      const wx = west ? r.x1 - 1 : r.x2 + 1;
      if(D.at(wx, y) !== DG.TILE.SOLID) continue;
      r.traps.push({ kind, x:wx, y, dir:west ? 1 : -1, phase:rng.next() });
    } else if(kind === "spikes"){
      const [x, y] = rng.pick(free), sw = rng.int(1, 3), sh = rng.int(1, 2), ph = rng.next();
      for(let yy=y; yy<y + sh; yy++) for(let xx=x; xx<x + sw; xx++)
        if(D.at(xx, yy) === DG.TILE.FLOOR && xx <= r.x2 && yy <= r.y2 && !nearDoor(D, r, xx, yy, 3)) r.traps.push({ kind, x:xx, y:yy, phase:ph });
    } else {
      const [x, y] = rng.pick(free);
      r.traps.push({ kind, x, y, phase:rng.next() });
    }
  }
}

/* the goblins: a budget per wave, spent on what this floor allows */
function populate(D, rng, r, floor, S){
  const area = (r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1);
  const waves = area >= 140 ? S.waves : 1;
  const types = DG.ENEMY_ORDER.filter(id=> DG.ENEMIES[id].from <= floor);
  for(let w=0; w<waves; w++){
    let budget = S.budget*DG.clamp(area/180, 0.7, 1.35)*(w === 0 ? 1 : 0.8);
    const free = rng.shuffle(freeTiles(D, r, { door:5 }));
    const wave = [];
    while(budget > 0.9 && free.length){
      const id = rng.weighted(types, t=> (DG.ENEMIES[t].cost <= budget + 0.5 ? 1 : 0)*(t === "grunt" ? 3 : t === "slinger" ? 2.2 : 1.4));
      if(!id || DG.ENEMIES[id].cost > budget + 0.5) break;
      const [x, y] = free.pop();
      const elite = rng.chance(S.elite) ? rng.pick(Object.keys(DG.AFFIXES)) : null;
      wave.push({ type:id, x:x + 0.5, y:y + 0.5, elite });
      budget -= DG.ENEMIES[id].cost*(elite ? 1.6 : 1);
    }
    if(wave.length) r.waves.push(wave);
  }
  if(!r.waves.length){
    const t = freeTiles(D, r, { door:2 })[0] || [Math.floor(r.cxw), Math.floor(r.cyw)];
    r.waves.push([{ type:"grunt", x:t[0] + 0.5, y:t[1] + 0.5, elite:null }]);
  }
}

/* a painted door on the north wall: walks into it go BONK */
function paintDoor(D, rng, r){
  for(let k=0;k<12;k++){
    const x = rng.int(r.x1 + 1, r.x2 - 1), y = r.y1 - 1;
    if(D.at(x, y) !== DG.TILE.SOLID || D.at(x - 1, y) !== DG.TILE.SOLID || D.at(x + 1, y) !== DG.TILE.SOLID) continue;
    if(D.painted.some(p=> Math.abs(p.x - x) < 3 && p.y === y)) continue;
    if(r.props.some(p=> p.kind === "sign" && Math.abs(p.x - x) < 2)) continue;
    D.painted.push({ room:r.id, x, y, color:rng.pick(DG.DOOR_COLORS).hex, kind:"bonk" });
    return true;
  }
  return false;
}

/* ---- puzzles ---------------------------------------------------------- */
function makePuzzle(D, rng, r){
  if(rng.chance(0.55) && doorsPuzzle(D, rng, r)) return;
  braziersPuzzle(D, rng, r);
}

/* lights out, in a row: shooting a brazier flips it and its neighbours */
function braziersPuzzle(D, rng, r){
  const n = 5, cx = Math.floor(r.cxw), cy = Math.floor(r.cyw), lit = [1, 1, 1, 1, 1];
  const flip = i=> [i - 1, i, i + 1].forEach(j=>{ if(j >= 0 && j < n) lit[j] ^= 1; });
  const presses = rng.shuffle([0, 1, 2, 3, 4]).slice(0, rng.int(2, 3));
  presses.forEach(flip);
  if(lit.every(v=> v)) flip(2);
  r.puzzle = { kind:"braziers", lit, solved:false, items:[] };
  for(let i=0;i<n;i++) r.puzzle.items.push({ x:cx - 4 + i*2 + 0.5, y:cy - 1 + 0.5, cd:0 });
  r.props.push({ kind:"sign", x:cx, y:r.y1, text:"MAKE THEM ALL BURNY. — management" });
  r.props.push({ kind:"chest", x:cx, y:cy + 2, tier:1, locked:true });
}

/* three doors, one real: a riddle on a sign says which. The real one is an
   illusionary wall into a closet with a chest; the others are paint. */
function doorsPuzzle(D, rng, r){
  const y = r.y1 - 1;
  const xs = [];
  for(let x=r.x1 + 2; x<=r.x2 - 2; x++){
    if(!closetFree(D, x, y)) continue;
    if(xs.length && x - xs[xs.length - 1] < 4) continue;
    xs.push(x);
  }
  if(xs.length < 3) return false;
  // spread them out
  const pick = [xs[0], xs[Math.floor(xs.length/2)], xs[xs.length - 1]];
  if(pick[1] - pick[0] < 4 || pick[2] - pick[1] < 4) return false;
  const colors = rng.shuffle(DG.DOOR_COLORS.slice()).slice(0, 3);
  const k = rng.int(0, 2);
  const clue = riddle(rng, colors, k);
  if(!clue) return false;
  r.puzzle = { kind:"doors", answer:k, solved:false, failed:[], doors:pick.map((x, i)=> ({ x, y, color:colors[i].hex, name:colors[i].name })) };
  pick.forEach((x, i)=>{
    if(i === k){
      D.set(x, y, DG.TILE.FAKE);
      D.fakes.push({ room:r.id, tiles:[[x, y]], revealed:false, x:x + 0.5, y:y + 0.5, puzzle:true });
      for(let yy=y - 3; yy<=y - 1; yy++) for(let xx=x - 1; xx<=x + 1; xx++) D.set(xx, yy, DG.TILE.FLOOR);
      r.props.push({ kind:"chest", x, y:y - 2, tier:2, closet:true });
    }
    D.painted.push({ room:r.id, x, y, color:colors[i].hex, kind:i === k ? "real" : "trick", puzzle:i });
  });
  r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:Math.floor(r.cyw) + 1, text:clue, riddle:true });
  return true;
}
function closetFree(D, x, y){
  // the door tile, a 3x3 closet behind it and a ring of wall round that must all be untouched rock
  for(let yy=y - 4; yy<=y; yy++) for(let xx=x - 2; xx<=x + 2; xx++) if(D.at(xx, yy) !== DG.TILE.SOLID) return false;
  return D.at(x, y + 1) === DG.TILE.FLOOR;
}

/* build a riddle that picks out door k and only door k */
function riddle(rng, colors, k){
  const n = 3, idx = c=> colors.findIndex(o=> o.id === c.id);
  const clues = [];
  colors.forEach(c=>{
    const j = idx(c);
    clues.push({ t:"It is NOT the " + c.name + " one.", ok:i=> i !== j });
    clues.push({ t:"It is left of the " + c.name + " door.", ok:i=> i < j });
    clues.push({ t:"It is right of the " + c.name + " door.", ok:i=> i > j });
    clues.push({ t:"It is right next to the " + c.name + " door.", ok:i=> Math.abs(i - j) === 1 });
  });
  clues.push({ t:"It is not in the middle. Middles are for cowards.", ok:i=> i !== 1 });
  clues.push({ t:"It is on an end. Like a sausage.", ok:i=> i === 0 || i === 2 });
  const truths = clues.filter(c=> c.ok(k));
  const unique = list=> [0, 1, 2].filter(i=> list.every(c=> c.ok(i))).length === 1;
  rng.shuffle(truths);
  for(let a=0;a<truths.length;a++) for(let b=a + 1;b<truths.length;b++){
    if(unique([truths[a], truths[b]]) && !unique([truths[a]]) && !unique([truths[b]]))
      return "THE REAL DOOR: " + truths[a].t + " " + truths[b].t + " The other two are paint. — A Totally Honest Goblin";
  }
  const one = truths.find(c=> unique([c]));
  return one ? "THE REAL DOOR: " + one.t + " — A Totally Honest Goblin" : null;
}

/* every room reachable from the start over floor, doors and illusions */
function validate(D){
  const W = D.w, seen = new Uint8Array(W*D.h), q = [];
  const sx = Math.floor(D.start.x), sy = Math.floor(D.start.y);
  if(D.at(sx, sy) !== DG.TILE.FLOOR) return false;
  q.push([sx, sy]); seen[sy*W + sx] = 1;
  while(q.length){
    const [x, y] = q.pop();
    DG.DIRS4.forEach(([dx, dy])=>{
      const nx = x + dx, ny = y + dy, t = D.at(nx, ny);
      if(seen[ny*W + nx] || !(t === DG.TILE.FLOOR || t === DG.TILE.DOOR || t === DG.TILE.FAKE)) return;
      seen[ny*W + nx] = 1; q.push([nx, ny]);
    });
  }
  return D.rooms.every(r=> roomReached(D, r, seen));
}
function roomReached(D, r, seen){
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === DG.TILE.FLOOR && seen[y*D.w + x]) return true;
  return false;
}

/* which room's interior a point is in (or -1) */
Dungeon.roomAt = function(D, x, y){
  const tx = Math.floor(x), ty = Math.floor(y);
  for(const r of D.rooms) if(tx >= r.x1 && tx <= r.x2 && ty >= r.y1 && ty <= r.y2) return r;
  return null;
};

})(typeof window !== "undefined" ? window : globalThis);
