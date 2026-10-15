/* ------------------------------------------------------------------ *
 *  The dungeon generator. Every floor of every run is new.
 *
 *  1. A room graph grows on a 7x7 grid of cells (Isaac-style): a tree
 *     from the start room. Dead ends become the boss, treasure, shop,
 *     frog pond and cursed altar; one room becomes a puzzle.
 *  2. Some combat rooms swallow empty neighbouring cells and become
 *     JUMBO rooms (2x1, 1x2, 2x2). A few loops join plain rooms. An
 *     empty cell beside the map becomes a secret room behind an
 *     illusionary wall.
 *  3. Rooms get rectangles, then 3-wide corridors with a door at each
 *     end, kept inside the band of the two cells they join.
 *  4. Furniture (pillars, pits, crates, rings, graves, pools...),
 *     breakables (pots, crates, barrels, explosive barrels), traps,
 *     enemy waves from the floor's own bestiary, props, decor, curses.
 *     Every room is checked to be walkable from its doors.
 *
 *  Tiles are a flat Uint8Array; (x, y) is column, row. A tile's centre
 *  in the world is (x + 0.5, y + 0.5).
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const T = DG.TILE = { SOLID:0, FLOOR:1, PIT:2, DOOR:3, FAKE:4, BLOCK:5, BREAK:6, PUSH:7, WATER:8 };
const CW = 28, CH = 22, GW = 7, GH = 7, M = 3;

const Dungeon = DG.Dungeon = {};
Dungeon.CW = CW; Dungeon.CH = CH; Dungeon.M = M;

Dungeon.generate = function(seed, floor){
  const rng = DG.RNG(seed);
  for(let attempt=0; attempt<60; attempt++){
    const d = tryGenerate(rng, floor, seed);
    if(d) return d;
  }
  throw new Error("dungeon: no layout for seed " + seed);
};

function tryGenerate(rng, floor, seed){
  const S = DG.FLOOR_SCALE(floor);
  const W = CW*GW, H = CH*GH;
  const D = { seed, floor, w:W, h:H, tiles:new Uint8Array(W*H), rooms:[], doors:[], corridors:[], painted:[], fakes:[], breakables:[], decor:[], ver:0,
              theme:DG.FLOORS[(floor - 1) % DG.FLOORS.length] };
  D.at = (x, y)=> (x < 0 || y < 0 || x >= W || y >= H) ? T.SOLID : D.tiles[y*W + x];
  D.set = (x, y, v)=>{ if(x >= 0 && y >= 0 && x < W && y < H) D.tiles[y*W + x] = v; };

  /* ---- 1. the room graph ---- */
  const cells = {}, rooms = D.rooms, edges = [];
  const addRoom = (cx, cy)=>{ const r = { id:rooms.length, cx, cy, cells:[[cx, cy]], type:"combat", links:[], doors:[] }; rooms.push(r); cells[DG.key(cx, cy)] = r; return r; };
  const roomAt = (cx, cy)=> cells[DG.key(cx, cy)];
  const link = (a, b, ca, cb, kind)=>{ a.links.push(b.id); b.links.push(a.id); edges.push({ a:a.id, b:b.id, ca, cb, kind }); };
  const start = addRoom(3, 3); start.type = "start";
  let guard = 0;
  while(rooms.length < S.rooms && guard++ < 3000){
    const r = rng.pick(rooms);
    if(r.links.length >= 3 && rng.chance(0.8)) continue;
    const [dx, dy] = rng.pick(DG.DIRS4), nx = r.cx + dx, ny = r.cy + dy;
    if(nx < 0 || ny < 0 || nx >= GW || ny >= GH || roomAt(nx, ny)) continue;
    let occ = 0; DG.DIRS4.forEach(([ex, ey])=>{ if(roomAt(nx + ex, ny + ey)) occ++; });
    if(occ > 1 && rng.chance(0.85)) continue;
    link(r, addRoom(nx, ny), [r.cx, r.cy], [nx, ny]);
  }
  if(rooms.length < S.rooms) return null;

  const dist = bfsRooms(rooms, 0);
  rooms.forEach(r=> r.dist = dist[r.id]);
  const dead = rooms.filter(r=> r.id !== 0 && r.links.length === 1).sort((a, b)=> b.dist - a.dist);
  if(dead.length < 3 || dead[0].dist < 3) return null;
  dead[0].type = "boss";
  // the side rooms: dead ends first, then any plain room two steps out
  const sideTypes = ["treasure", "shop", "pond"].concat(floor >= 2 ? ["altar"] : []);
  const rest = rng.shuffle(dead.slice(1).filter(r=> r.dist >= 2));
  const plainFar = ()=> rng.shuffle(rooms.filter(r=> r.type === "combat" && r.dist >= 2 && r.links.length <= 2));
  for(const t of sideTypes){
    const r = rest.shift() || plainFar()[0];
    if(!r) return null;
    r.type = t;
  }
  const plain = rooms.filter(r=> r.type === "combat" && r.dist >= 2);
  if(plain.length < 2) return null;
  rng.pick(plain).type = "puzzle";

  /* ---- 2. jumbo rooms: plain rooms grow into empty neighbour cells ---- */
  let jumbos = 0;
  rng.shuffle(rooms.filter(r=> r.type === "combat" && r.dist >= 1)).forEach(r=>{
    if(jumbos >= S.jumbo) return;
    const shapes = rng.shuffle([[[1, 0]], [[0, 1]], [[1, 0], [0, 1], [1, 1]], [[-1, 0]], [[0, -1]]]);
    for(const sh of shapes){
      const add = sh.map(([dx, dy])=> [r.cx + dx, r.cy + dy]);
      if(add.some(([x, y])=> x < 0 || y < 0 || x >= GW || y >= GH || roomAt(x, y))) continue;
      add.forEach(c=>{ r.cells.push(c); cells[DG.key(c[0], c[1])] = r; });
      r.jumbo = true; jumbos++;
      return;
    }
  });
  // cell bounds of every room
  rooms.forEach(r=>{
    r.c0x = Math.min(...r.cells.map(c=> c[0])); r.c1x = Math.max(...r.cells.map(c=> c[0]));
    r.c0y = Math.min(...r.cells.map(c=> c[1])); r.c1y = Math.max(...r.cells.map(c=> c[1]));
  });

  // a few loops between plain rooms (through any pair of touching cells)
  const linked = (a, b)=> a.links.indexOf(b.id) >= 0;
  rooms.forEach(a=> a.cells.forEach(([cx, cy])=>{
    [[1, 0], [0, 1]].forEach(([dx, dy])=>{
      const b = roomAt(cx + dx, cy + dy);
      if(!b || b === a || linked(a, b)) return;
      const ok = r=> r.type === "combat" || r.type === "start";
      if(ok(a) && ok(b) && rng.chance(0.22)) link(a, b, [cx, cy], [cx + dx, cy + dy]);
    });
  }));

  // the secret room
  const cand = [];
  for(let cy=0; cy<GH; cy++) for(let cx=0; cx<GW; cx++){
    if(roomAt(cx, cy)) continue;
    const ns = DG.DIRS4.map(([dx, dy])=> ({ r:roomAt(cx + dx, cy + dy), c:[cx + dx, cy + dy] })).filter(o=> o.r && (o.r.type === "combat" || o.r.type === "start" || o.r.type === "treasure"));
    if(ns.length) cand.push({ cx, cy, ns, w:ns.length*ns.length });
  }
  if(cand.length){
    const c = rng.weighted(cand);
    const sec = addRoom(c.cx, c.cy); sec.type = "secret"; sec.hidden = true;
    sec.c0x = sec.c1x = c.cx; sec.c0y = sec.c1y = c.cy;
    const host = rng.pick(c.ns);
    link(host.r, sec, host.c, [c.cx, c.cy], "secret");
    sec.dist = host.r.dist + 1;
  }

  /* ---- 3. rectangles ---- */
  rooms.forEach(r=>{
    const ox = r.c0x*CW, oy = r.c0y*CH, cw = (r.c1x - r.c0x + 1)*CW, ch = (r.c1y - r.c0y + 1)*CH;
    if(r.jumbo){
      r.x1 = ox + rng.int(M, M + 2); r.x2 = ox + cw - 1 - rng.int(M, M + 2);
      r.y1 = oy + rng.int(M, M + 2); r.y2 = oy + ch - 1 - rng.int(M, M + 2);
    } else {
      const size = {
        start:[13, 11, 13, 11], boss:[21, 15, 22, 16], treasure:[11, 9, 13, 11], shop:[15, 11, 15, 11], pond:[15, 11, 17, 13],
        altar:[11, 9, 13, 11], puzzle:[15, 11, 17, 12], secret:[9, 7, 11, 9], combat:[11, 9, 22, 16]
      }[r.type];
      const w = rng.int(size[0], size[2]), h = rng.int(size[1], size[3]);
      const top = r.type === "puzzle" ? 6 : M;
      r.x1 = ox + rng.int(M, CW - M - w); r.x2 = r.x1 + w - 1;
      r.y1 = oy + rng.int(top, Math.max(top, CH - M - h)); r.y2 = Math.min(r.y1 + h - 1, oy + CH - M - 1);
    }
    for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) D.set(x, y, T.FLOOR);
    r.cxw = (r.x1 + r.x2 + 1)/2; r.cyw = (r.y1 + r.y2 + 1)/2;
  });

  /* ---- corridors and doors ---- */
  edges.forEach(e=>{
    let a = rooms[e.a], b = rooms[e.b], ca = e.ca, cb = e.cb;
    if(ca[0] > cb[0] || ca[1] > cb[1]){ [a, b] = [b, a]; [ca, cb] = [cb, ca]; }
    const ax = ca[0] !== cb[0] ? "x" : "y";
    // the band of the shared cell row (or column), so corridors never cross each other
    const band = ax === "x" ? [ca[1]*CH + M + 1, ca[1]*CH + CH - M - 2] : [ca[0]*CW + M + 1, ca[0]*CW + CW - M - 2];
    carveCorridor(D, rng, a, b, ax, band, e.kind === "secret" ? (a.type === "secret" ? "a" : "b") : null);
  });
  D.doorMap = new Int16Array(W*H).fill(-1);
  D.doors.forEach(d=> d.tiles.forEach(([x, y])=> D.doorMap[y*W + x] = d.id));

  /* ---- 4. contents ---- */
  rooms.forEach(r=>{
    r.waves = []; r.traps = []; r.props = []; r.cleared = r.type !== "combat" && r.type !== "boss";
    if(r.type === "combat"){ furnish(D, rng, r); breakables(D, rng, r); trapRoom(D, rng, r, S); populate(D, rng, r, floor, S); }
  });
  const st = rooms[0];
  D.start = { x:st.cxw, y:st.cyw + 1 };
  st.props.push({ kind:"sign", x:Math.floor(st.cxw), y:st.y1, text:"WASD move · mouse aim · click shoot · right-click cast · SPACE blink · E use · F active · Q swap guns · TAB inventory. Gribbus fights on his own. He's a good frog." });

  rooms.forEach(r=>{
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw);
    if(r.type === "treasure"){
      // always a choice: an item, or a weapon to build around (from floor 3, a second item too)
      if(floor >= 3){ r.props.push({ kind:"pedestal", x:cx - 3, y:cy, group:1 }); r.props.push({ kind:"pedestal", x:cx, y:cy, group:1 }); r.props.push({ kind:"pedestal", x:cx + 3, y:cy, group:1, sell:"gift" }); }
      else { r.props.push({ kind:"pedestal", x:cx - 2, y:cy, group:1 }); r.props.push({ kind:"pedestal", x:cx + 2, y:cy, group:1, sell:"gift" }); }
      r.props.push({ kind:"sign", x:cx, y:r.y1, text:"CHOOSE ONE. The rest crumble. Rules are rules." });
    }
    if(r.type === "secret"){ r.props.push({ kind:"pedestal", x:cx, y:cy, pool:"x" }); }
    if(r.type === "altar"){
      r.props.push({ kind:"pedestal", x:cx, y:cy, pool:"a" });
      r.props.push({ kind:"sign", x:cx, y:r.y1, text:"TAKE WHAT YOU NEED. GIVE WHAT YOU HAVE. (20 max health)" });
    }
    if(r.type === "shop"){
      r.props.push({ kind:"merchant", x:cx, y:r.y1 + 1 });
      // each shop stocks 3 to 5 wares (at least one item); the Membership Card adds two
      const n = rng.int(3, 5);
      const sells = ["item"].concat(rng.shuffle(["item", "item", "gun", rng.chance(0.4) ? "active" : "ward", "heal", "key"]).slice(0, n - 1));
      sells.forEach((s, i)=> r.props.push({ kind:"pedestal", x:cx - (n - 1) + i*2, y:cy + 1, sell:s === "item" ? null : s, pool:"s" }));
    }
    if(r.type === "pond") makePond(D, rng, r);
    if(r.type === "boss") r.boss = { x:r.cxw, y:r.y1 + 3.5 };
    if(r.type === "puzzle") DG.Puzzles.generate(D, rng, r, floor);
  });

  rooms.forEach(r=>{ if((r.type === "combat" || r.type === "start") && rng.chance(r.type === "start" ? 1 : 0.22)) paintDoor(D, rng, r); });
  dress(D, rng);

  // curses, more likely deeper down
  D.curses = [];
  if(floor > 1 && rng.chance(S.curse)) D.curses.push(rng.pick(Object.keys(DG.CURSES)));
  if(floor >= 5 && rng.chance(0.4)){ const c = rng.pick(Object.keys(DG.CURSES)); if(D.curses.indexOf(c) < 0) D.curses.push(c); }

  D.breakMap = new Array(W*H).fill(null);
  D.breakables.forEach((b, i)=>{ b.id = "b" + i; b.hp = b.kind === "xbarrel" ? 1 : b.kind === "crate" ? 18 : 8; D.breakMap[b.y*W + b.x] = b; });
  if(!validate(D)) return null;
  return D;
}

function bfsRooms(rooms, from){
  const d = rooms.map(()=> Infinity); d[from] = 0; const q = [from];
  while(q.length){ const i = q.shift(); rooms[i].links.forEach(j=>{ if(d[j] === Infinity){ d[j] = d[i] + 1; q.push(j); } }); }
  return d;
}

/* a corridor between a (left/top) and b (right/bottom), within a band of rows/cols */
function carveCorridor(D, rng, a, b, ax, band, secretSide){
  const U1 = r=> ax === "x" ? r.x1 : r.y1, U2 = r=> ax === "x" ? r.x2 : r.y2;
  const V1 = r=> ax === "x" ? r.y1 : r.x1, V2 = r=> ax === "x" ? r.y2 : r.x2;
  const put = (u, v, t)=> ax === "x" ? D.set(u, v, t) : D.set(v, u, t);
  const uA = U2(a) + 1, uB = U1(b) - 1;
  const aLo = Math.max(V1(a) + 1, band[0]), aHi = Math.min(V2(a) - 1, band[1]);
  const bLo = Math.max(V1(b) + 1, band[0]), bHi = Math.min(V2(b) - 1, band[1]);
  const lo = Math.max(aLo, bLo), hi = Math.min(aHi, bHi);
  let vA, vB, bend = null;
  if(lo <= hi && rng.chance(0.75)){ vA = vB = rng.int(lo, hi); }
  else {
    vA = rng.int(aLo, Math.max(aLo, aHi)); vB = rng.int(bLo, Math.max(bLo, bHi));
    if(vA !== vB) bend = rng.int(uA + 2, Math.max(uA + 2, uB - 2));
  }
  const tiles = [];
  const carve = (u, v)=>{ put(u, v, T.FLOOR); tiles.push(ax === "x" ? [u, v] : [v, u]); };
  if(bend === null){
    for(let u=uA+1; u<uB; u++) for(let k=-1;k<=1;k++) carve(u, vA + k);
  } else {
    for(let u=uA+1; u<=bend+1; u++) for(let k=-1;k<=1;k++) carve(u, vA + k);
    for(let v=Math.min(vA, vB)-1; v<=Math.max(vA, vB)+1; v++) for(let k=-1;k<=1;k++) carve(bend + k, v);
    for(let u=bend-1; u<uB; u++) for(let k=-1;k<=1;k++) carve(u, vB + k);
  }
  const corr = { id:D.corridors.length, a:a.id, b:b.id, tiles, secret:!!secretSide };
  D.corridors.push(corr);
  const end = (room, u, v, side)=>{
    const t3 = [-1, 0, 1].map(k=> ax === "x" ? [u, v + k] : [v + k, u]);
    const isSecretRoom = secretSide && ((secretSide === "a") === (room === a));
    if(secretSide && !isSecretRoom){
      t3.forEach(([x, y])=> D.set(x, y, T.FAKE));
      D.fakes.push({ room:room.id, corridor:corr.id, tiles:t3, revealed:false, x:t3[1][0] + 0.5, y:t3[1][1] + 0.5 });
      return;
    }
    if(isSecretRoom){ t3.forEach(([x, y])=> D.set(x, y, T.FLOOR)); return; }
    const door = { id:D.doors.length, room:room.id, corridor:corr.id, tiles:t3, open:true, axis:ax === "x" ? "v" : "h", side, x:t3[1][0] + 0.5, y:t3[1][1] + 0.5 };
    t3.forEach(([x, y])=> D.set(x, y, T.DOOR));
    D.doors.push(door); room.doors.push(door.id);
  };
  end(a, uA, vA, ax === "x" ? "e" : "s");
  end(b, uB, vB, ax === "x" ? "w" : "n");
}

function nearDoor(D, r, x, y, d){
  return r.doors.some(id=>{ const o = D.doors[id]; return Math.abs(o.x - 0.5 - x) + Math.abs(o.y - 0.5 - y) <= d; })
      || D.fakes.some(f=> f.room === r.id && Math.abs(f.x - 0.5 - x) + Math.abs(f.y - 0.5 - y) <= d);
}
Dungeon.nearDoor = nearDoor;

/* furniture, kept clear of doors and rolled back if it cuts the room in two */
function furnish(D, rng, r){
  const w = r.x2 - r.x1 + 1, h = r.y2 - r.y1 + 1, theme = D.theme.decor;
  const styles = [
    { s:"pillars", w:3 }, { s:"pit", w:w >= 15 && h >= 11 ? 2 : 0 }, { s:"crates", w:2.5 }, { s:"cross", w:w >= 15 ? 1.5 : 0 }, { s:"empty", w:1 },
    { s:"ring", w:w >= 15 && h >= 11 ? 1.5 : 0 }, { s:"graves", w:theme === "crypt" ? 3 : 0 }, { s:"pools", w:theme === "gloomwood" || theme === "forest" ? 2 : theme === "undercroft" ? 1 : 0.5 },
    { s:"islands", w:r.jumbo ? 2.5 : 0 }, { s:"maze", w:r.jumbo ? 1.5 : 0 }
  ];
  const style = rng.weighted(styles).s;
  r.style = style;
  const placed = [];
  const put = (x, y, t)=>{
    if(x <= r.x1 || y <= r.y1 || x >= r.x2 || y >= r.y2) return;
    if(nearDoor(D, r, x, y, 3) || D.at(x, y) !== T.FLOOR) return;
    D.set(x, y, t); placed.push([x, y]);
  };
  const cx = Math.floor((r.x1 + r.x2)/2), cy = Math.floor((r.y1 + r.y2)/2);
  const rect = (x0, y0, ww, hh, t)=>{ for(let y=y0; y<y0 + hh; y++) for(let x=x0; x<x0 + ww; x++) put(x, y, t); };
  if(style === "pillars"){
    const sx = rng.int(3, 5), sy = rng.int(3, 4), big = rng.chance(0.4);
    for(let y=r.y1 + 2; y<=r.y2 - 2; y+=sy) for(let x=r.x1 + 2; x<=r.x2 - 2; x+=sx){
      if(rng.chance(0.3)) continue;
      put(x, y, T.BLOCK); if(big){ put(x + 1, y, T.BLOCK); put(x, y + 1, T.BLOCK); put(x + 1, y + 1, T.BLOCK); }
    }
  } else if(style === "pit"){
    const pw = rng.int(3, Math.floor(w/2) - 1), ph = rng.int(2, Math.floor(h/2) - 2);
    rect(cx - Math.floor(pw/2), cy - Math.floor(ph/2), pw, ph, T.PIT);
  } else if(style === "crates"){
    const n = Math.round(w*h/28);
    for(let i=0;i<n;i++){ const x = rng.int(r.x1 + 1, r.x2 - 1), y = rng.int(r.y1 + 1, r.y2 - 1); put(x, y, T.BLOCK); if(rng.chance(0.4)) put(x + 1, y, T.BLOCK); }
  } else if(style === "cross"){
    for(let x=cx - 3; x<=cx + 3; x++) if(Math.abs(x - cx) > 1) put(x, cy, T.BLOCK);
    for(let y=cy - 2; y<=cy + 2; y++) if(Math.abs(y - cy) > 1) put(cx, y, T.BLOCK);
  } else if(style === "ring"){
    const rw = Math.min(5, Math.floor(w/2) - 2), rh = Math.min(4, Math.floor(h/2) - 2);
    for(let x=cx - rw; x<=cx + rw; x++) for(let y=cy - rh; y<=cy + rh; y++){
      const edge = x === cx - rw || x === cx + rw || y === cy - rh || y === cy + rh;
      if(edge && Math.abs(x - cx) > 1 && Math.abs(y - cy) > 1) put(x, y, T.BLOCK);
    }
    if(rng.chance(0.5)) rect(cx - 1, cy - 1, 3, 2, T.PIT);
  } else if(style === "graves"){
    for(let y=r.y1 + 2; y<=r.y2 - 2; y+=3) for(let x=r.x1 + 2; x<=r.x2 - 2; x+=3) if(rng.chance(0.7)) put(x, y, T.BLOCK);
  } else if(style === "pools"){
    const n = rng.int(2, 4);
    for(let i=0;i<n;i++){ const pw = rng.int(2, 4), ph = rng.int(2, 3); rect(rng.int(r.x1 + 2, r.x2 - pw - 1), rng.int(r.y1 + 2, r.y2 - ph - 1), pw, ph, T.WATER); }
  } else if(style === "islands"){
    // a jumbo room with chasms between islands, and bridges between them
    const n = rng.int(2, 4);
    for(let i=0;i<n;i++){ const pw = rng.int(3, 6), ph = rng.int(2, 4); rect(rng.int(r.x1 + 3, r.x2 - pw - 2), rng.int(r.y1 + 3, r.y2 - ph - 2), pw, ph, T.PIT); }
    for(let i=0;i<6;i++) put(rng.int(r.x1 + 2, r.x2 - 2), rng.int(r.y1 + 2, r.y2 - 2), T.BLOCK);
  } else if(style === "maze"){
    // long low walls with gaps
    for(let x=r.x1 + 4; x<=r.x2 - 4; x+=rng.int(5, 7)){
      const gap = rng.int(r.y1 + 2, r.y2 - 3);
      for(let y=r.y1 + 2; y<=r.y2 - 2; y++) if(Math.abs(y - gap) > 1) put(x, y, T.BLOCK);
    }
  }
  if(!roomConnected(D, r)){ placed.forEach(([x, y])=> D.set(x, y, T.FLOOR)); r.style = "empty"; }
}

/* pots, crates and barrels; on the edges mostly, and never sealing anything off */
function breakables(D, rng, r){
  const area = (r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1);
  const n = Math.round(area/(rng.chance(0.3) ? 18 : 40));
  const kinds = { castle:["pot", "crate", "barrel"], undercroft:["barrel", "crate", "shroomcap"], crypt:["urn", "coffin", "pot"], gloomwood:["shroomcap", "eggsac", "pustule"], forest:["pustule", "shroomcap", "eggsac"] }[D.theme.decor] || ["pot"];
  const added = [];
  for(let i=0;i<n;i++){
    const edge = rng.chance(0.65);
    let x, y;
    if(edge){ const side = rng.int(0, 3); x = side < 2 ? rng.int(r.x1, r.x2) : side === 2 ? r.x1 : r.x2; y = side >= 2 ? rng.int(r.y1, r.y2) : side === 0 ? r.y1 : r.y2; }
    else { x = rng.int(r.x1 + 1, r.x2 - 1); y = rng.int(r.y1 + 1, r.y2 - 1); }
    if(D.at(x, y) !== T.FLOOR || nearDoor(D, r, x, y, 3)) continue;
    const kind = rng.chance(0.12) ? "xbarrel" : rng.pick(kinds);
    D.set(x, y, T.BREAK); added.push({ x, y, kind, room:r.id });
  }
  if(!roomConnected(D, r, true)){ added.forEach(b=> D.set(b.x, b.y, T.FLOOR)); return; }
  added.forEach(b=> D.breakables.push(b));
}

/* every floor tile in the room reachable from the others (breakables count as walls) */
function roomConnected(D, r){
  const W = D.w, seen = new Uint8Array(W*D.h), q = [];
  const open = t=> t === T.FLOOR;
  let total = 0, sx = -1, sy = -1;
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(open(D.at(x, y))){ total++; if(sx < 0){ sx = x; sy = y; } }
  if(sx < 0) return false;
  q.push([sx, sy]); seen[sy*W + sx] = 1;
  let n = 0;
  while(q.length){
    const [x, y] = q.pop(); n++;
    DG.DIRS4.forEach(([dx, dy])=>{
      const nx = x + dx, ny = y + dy;
      if(nx < r.x1 || ny < r.y1 || nx > r.x2 || ny > r.y2 || seen[ny*W + nx] || !open(D.at(nx, ny))) return;
      seen[ny*W + nx] = 1; q.push([nx, ny]);
    });
  }
  // every door must open onto reachable floor
  const doorOk = r.doors.every(id=> D.doors[id].tiles.some(([x, y])=> DG.DIRS4.some(([dx, dy])=> seen[(y + dy)*W + x + dx])));
  return n === total && doorOk;
}
Dungeon.roomConnected = roomConnected;

function freeTiles(D, r, opts){
  opts = opts || {};
  const out = [];
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++){
    if(D.at(x, y) !== T.FLOOR) continue;
    if(nearDoor(D, r, x, y, opts.door || 4)) continue;
    if(r.traps.some(t=> t.x === x && t.y === y)) continue;
    if(r.props.some(p=> p.x === x && p.y === y)) continue;
    if(opts.edge && (x === r.x1 || x === r.x2 || y === r.y1 || y === r.y2)) continue;
    out.push([x, y]);
  }
  return out;
}
Dungeon.freeTiles = freeTiles;

function trapRoom(D, rng, r, S){
  if(!rng.chance(S.traps)) return;
  const n = rng.int(1, 2 + Math.floor(D.floor/2)) + (r.jumbo ? 2 : 0);
  for(let i=0;i<n;i++){
    const kind = rng.weighted([{ k:"spikes", w:4 }, { k:"darts", w:3 }, { k:"vent", w:D.floor >= 2 ? 2 : 0 }, { k:"banana", w:2 }]).k;
    const free = freeTiles(D, r, { door:3 });
    if(!free.length) return;
    if(kind === "darts"){
      const y = rng.int(r.y1 + 1, r.y2 - 1), west = rng.chance(0.5);
      const wx = west ? r.x1 - 1 : r.x2 + 1;
      if(D.at(wx, y) !== T.SOLID) continue;
      r.traps.push({ kind, x:wx, y, dir:west ? 1 : -1, phase:rng.next() });
    } else if(kind === "spikes"){
      const [x, y] = rng.pick(free), sw = rng.int(1, 3), sh = rng.int(1, 2), ph = rng.next();
      for(let yy=y; yy<y + sh; yy++) for(let xx=x; xx<x + sw; xx++)
        if(D.at(xx, yy) === T.FLOOR && xx <= r.x2 && yy <= r.y2 && !nearDoor(D, r, xx, yy, 3)) r.traps.push({ kind, x:xx, y:yy, phase:ph });
    } else {
      const [x, y] = rng.pick(free);
      r.traps.push({ kind, x, y, phase:rng.next() });
    }
  }
}

/* enemies: a budget per wave, spent on the floor's own bestiary */
function populate(D, rng, r, floor, S){
  const area = (r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1);
  const waves = r.jumbo ? S.waves + 1 : area >= 140 ? S.waves : 1;
  const table = D.theme.enemies;
  const types = Object.keys(table);
  for(let w=0; w<waves; w++){
    let budget = S.budget*DG.clamp(area/180, 0.7, r.jumbo ? 2.6 : 1.35)*(w === 0 ? 1 : 0.8);
    const free = rng.shuffle(freeTiles(D, r, { door:5 }));
    const wave = [];
    let turrets = 0;
    while(budget > 0.9 && free.length){
      const id = rng.weighted(types, t=> (DG.ENEMIES[t].cost <= budget + 0.5 ? table[t] : 0)*(DG.ENEMIES[t].speed === 0 && turrets >= 2 ? 0 : 1));
      if(!id || DG.ENEMIES[id].cost > budget + 0.5) break;
      if(DG.ENEMIES[id].speed === 0) turrets++;
      const [x, y] = free.pop();
      const elite = rng.chance(S.elite) ? rng.pick(Object.keys(DG.AFFIXES).filter(a=> a !== "haunted" || floor >= 3)) : null;
      wave.push({ type:id, x:x + 0.5, y:y + 0.5, elite });
      budget -= DG.ENEMIES[id].cost*(elite ? 1.6 : 1);
    }
    if(wave.length) r.waves.push(wave);
  }
  if(!r.waves.length){
    const t = freeTiles(D, r, { door:2 })[0] || [Math.floor(r.cxw), Math.floor(r.cyw)];
    r.waves.push([{ type:types[0], x:t[0] + 0.5, y:t[1] + 0.5, elite:null }]);
  }
}

/* a frog pond: water in the middle, three lily pads, a frog statue */
function makePond(D, rng, r){
  const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw);
  const pw = 7, ph = 4, x0 = cx - 3, y0 = cy - 2;
  for(let y=y0; y<y0 + ph; y++) for(let x=x0; x<x0 + pw; x++){
    const corner = (x === x0 || x === x0 + pw - 1) && (y === y0 || y === y0 + ph - 1);
    if(!corner) D.set(x, y, T.WATER);
  }
  [-2, 0, 2].forEach((dx, i)=> r.props.push({ kind:"lilypad", x:cx + dx, y:y0 + ph - 1, slot:i }));
  r.props.push({ kind:"sign", x:cx, y:r.y1, text:"THE FROG POND. Gribbus may sit on ONE lily pad. Choose wisely. He will judge you either way." });
  r.fly = { x:x0 - 2, y:cy };
  D.decor.push({ kind:"frogstatue", x:x0 + pw + 1.5, y:y0 + 0.5, room:r.id });
  D.decor.push({ kind:"reeds", x:x0 - 0.3, y:y0 + 1, room:r.id }, { kind:"reeds", x:x0 + pw + 0.3, y:y0 + ph - 1, room:r.id });
}

/* a painted door on the north wall: walk into it and... BONK */
function paintDoor(D, rng, r){
  for(let k=0;k<12;k++){
    const x = rng.int(r.x1 + 1, r.x2 - 1), y = r.y1 - 1;
    if(D.at(x, y) !== T.SOLID || D.at(x - 1, y) !== T.SOLID || D.at(x + 1, y) !== T.SOLID) continue;
    if(D.painted.some(p=> Math.abs(p.x - x) < 3 && p.y === y)) continue;
    if(r.props.some(p=> p.kind === "sign" && Math.abs(p.x - x) < 2)) continue;
    D.painted.push({ room:r.id, x, y, color:rng.pick(DG.DOOR_COLORS).hex, kind:"bonk" });
    return true;
  }
  return false;
}
Dungeon.paintDoor = paintDoor;

/* decor: things to look at that don't get in the way, by floor theme */
function dress(D, rng){
  const theme = D.theme.decor;
  const floorKinds = {
    castle:["bones", "candlecluster", "brazier", "deadknight", "skullpile", "brokenstatue", "spikes", "cage", "candelabra", "weaponrack", "rubble", "barrelstack"],
    undercroft:["fungalcorpse", "bones", "drain", "mushrooms", "rotpod", "barrelstack", "ratnest", "candlecluster", "rubble", "sack"],
    crypt:["candlecluster", "soulcandles", "bones", "skullpile", "gravestone", "opengrave", "urns", "fungalcorpse", "candle", "roots"],
    gloomwood:["glowcap", "deadtree", "myceliumcorpse", "cordyceps", "roots", "rotpod", "fallenpillar", "toadstools", "bones", "fern"],
    forest:["glowcap", "deadtree", "myceliumcorpse", "cordyceps", "log", "ribcage", "roots", "rotpod", "toadstools", "fern", "glowcap"]
  }[theme] || ["bones"];
  const wallKinds = {
    castle:["slumped", "banner", "gibbet", "shackled", "banner", "shieldwall"], undercroft:["slumped", "chains", "wallshroom", "pipes", "shackled"], crypt:["skullniche", "ossuary", "candleshelf", "coffinwall", "skullniche", "chains"],
    gloomwood:["wallroots", "cordycepswall", "hangingmoss", "walleye", "wallcaps"], forest:["wallroots", "wallcaps", "cordycepswall", "hangingmoss", "glowmoss"]
  }[theme] || ["banner"];
  D.rooms.forEach(r=>{
    const area = (r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1);
    const n = Math.round(area/14);
    for(let i=0;i<n;i++){
      const x = r.x1 + rng.next()*(r.x2 - r.x1 + 1), y = r.y1 + rng.next()*(r.y2 - r.y1 + 1);
      if(D.at(Math.floor(x), Math.floor(y)) !== T.FLOOR) continue;
      if(r.props.some(p=> Math.abs(p.x + 0.5 - x) < 1.2 && Math.abs(p.y + 0.5 - y) < 1.2)) continue;
      // corners and edges get cobwebs and clutter; the middle stays clear to fight in
      const nearEdge = x - r.x1 < 2 || r.x2 + 1 - x < 2 || y - r.y1 < 2 || r.y2 + 1 - y < 2;
      if(!nearEdge && rng.chance(0.7)) continue;
      D.decor.push({ kind:rng.pick(floorKinds), x, y, room:r.id, rot:rng.next()*6.28, s:0.8 + rng.next()*0.5 });
    }
    // on the north wall
    for(let x=r.x1 + 1; x<r.x2; x+=rng.int(3, 6)){
      if(D.at(x, r.y1 - 1) !== T.SOLID || D.painted.some(p=> p.x === x && p.y === r.y1 - 1)) continue;
      if(rng.chance(0.45)) D.decor.push({ kind:rng.pick(wallKinds), x:x + 0.5, y:r.y1 - 0.02, room:r.id, wall:true, s:0.9 + rng.next()*0.3 });
    }
  });
}

/* every room reachable from the start over floor, doors and illusions */
function validate(D){
  const W = D.w, seen = new Uint8Array(W*D.h), q = [];
  const sx = Math.floor(D.start.x), sy = Math.floor(D.start.y);
  if(D.at(sx, sy) !== T.FLOOR) return false;
  q.push([sx, sy]); seen[sy*W + sx] = 1;
  const pass = t=> t === T.FLOOR || t === T.DOOR || t === T.FAKE || t === T.WATER;
  while(q.length){
    const [x, y] = q.pop();
    DG.DIRS4.forEach(([dx, dy])=>{
      const nx = x + dx, ny = y + dy;
      if(seen[ny*W + nx] || !pass(D.at(nx, ny))) return;
      seen[ny*W + nx] = 1; q.push([nx, ny]);
    });
  }
  return D.rooms.every(r=>{
    for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === T.FLOOR && seen[y*W + x]) return true;
    return false;
  });
}

/* which room's interior a point is in (or null) */
/* does Zippy know this corridor is there? A secret one only once its
   illusion is found (or the room behind it is). Always a real boolean. */
Dungeon.corridorKnown = function(D, c){
  if(c.secret) return D.fakes.some(f=> f.corridor === c.id && f.revealed) || !!D.rooms[c.a].found || !!D.rooms[c.b].found;
  return !!(D.rooms[c.a].seen || D.rooms[c.b].seen);
};
/* obstacles that stand in a 2x2 square are one big obstacle, not four
   small ones. Returns the top-left tile of each square (they never
   overlap) and, by tile index, which square a block belongs to. */
Dungeon.clumps = function(D){
  const list = [], of = new Int32Array(D.w*D.h).fill(-1), B = (x, y)=> D.at(x, y) === T.BLOCK && of[y*D.w + x] < 0;
  for(let y=0; y<D.h - 1; y++) for(let x=0; x<D.w - 1; x++){
    if(!(B(x, y) && B(x + 1, y) && B(x, y + 1) && B(x + 1, y + 1))) continue;
    const i = list.length; list.push({ x, y });
    of[y*D.w + x] = of[y*D.w + x + 1] = of[(y + 1)*D.w + x] = of[(y + 1)*D.w + x + 1] = i;
  }
  return { list, of };
};
Dungeon.roomAt = function(D, x, y){
  const tx = Math.floor(x), ty = Math.floor(y);
  for(const r of D.rooms) if(tx >= r.x1 && tx <= r.x2 && ty >= r.y1 && ty <= r.y2) return r;
  return null;
};

})(typeof window !== "undefined" ? window : globalThis);
