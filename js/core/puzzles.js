/* ------------------------------------------------------------------ *
 *  Puzzles. Each one is generated so it's always solvable (the tests
 *  check), and each one locks a chest until it's done.
 *
 *  doors     three coloured doors, a riddle with exactly one answer;
 *            the wrong door is paint (BONK) and an ambush
 *  braziers  lights-out: shooting one flips it and its neighbours
 *            (a row on floors 1-2, a 3x3 grid deeper down)
 *  push      shove stone blocks onto pressure plates (a reset rune
 *            puts them back if you wedge one)
 *  chorus    mushrooms sing a sequence; shoot them in the same order
 *  statues   each shot turns a statue 90 degrees; make them all face
 *            the eye (deeper down, turning one turns its neighbour)
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG, T = DG.TILE;
const Pz = DG.Puzzles = {};

Pz.generate = function(D, rng, r, floor){
  const kinds = rng.shuffle(["doors", "braziers", "push", "chorus", "statues"]);
  for(const k of kinds){ if(GEN[k](D, rng, r, floor)) break; }
  // the honest door leads to its own closet of treasure; everything else locks a chest
  if(r.puzzle.kind !== "doors") r.props.push({ kind:"chest", x:Math.floor(r.cxw), y:r.y2 - 1, tier:2, locked:true });
};

const GEN = {
  braziers(D, rng, r, floor){
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw) - 1;
    const grid = floor >= 3;
    const w = grid ? 3 : 5, h = grid ? 3 : 1, n = w*h;
    const lit = new Array(n).fill(1);
    const pz = { kind:"braziers", w, h, lit, solved:false, items:[] };
    for(let j=0;j<h;j++) for(let i=0;i<w;i++) pz.items.push({ x:cx - (w - 1) + i*2 + 0.5, y:cy - (h - 1) + j*2 + 0.5, cd:0 });
    const presses = rng.shuffle([...Array(n).keys()]).slice(0, rng.int(2, grid ? 4 : 3));
    presses.forEach(i=> flipBraziers(pz, i));
    if(lit.every(v=> v)) flipBraziers(pz, Math.floor(n/2));
    r.puzzle = pz;
    r.props.push({ kind:"sign", x:cx, y:r.y1, text:"MAKE THEM ALL BURNY. Shooting one also flips its neighbours. — management" });
    return true;
  },
  doors(D, rng, r){
    const y = r.y1 - 1, xs = [];
    for(let x=r.x1 + 2; x<=r.x2 - 2; x++){
      if(!closetFree(D, x, y)) continue;
      if(xs.length && x - xs[xs.length - 1] < 4) continue;
      xs.push(x);
    }
    if(xs.length < 3) return false;
    const pick = [xs[0], xs[Math.floor(xs.length/2)], xs[xs.length - 1]];
    if(pick[1] - pick[0] < 4 || pick[2] - pick[1] < 4) return false;
    const colors = rng.shuffle(DG.DOOR_COLORS.slice()).slice(0, 3);
    const k = rng.int(0, 2);
    const clue = riddle(rng, colors, k);
    if(!clue) return false;
    r.puzzle = { kind:"doors", answer:k, solved:false, failed:[], doors:pick.map((x, i)=> ({ x, y, color:colors[i].hex, name:colors[i].name })) };
    pick.forEach((x, i)=>{
      if(i === k){
        D.set(x, y, T.FAKE);
        D.fakes.push({ room:r.id, tiles:[[x, y]], revealed:false, x:x + 0.5, y:y + 0.5, puzzle:true });
        for(let yy=y - 3; yy<=y - 1; yy++) for(let xx=x - 1; xx<=x + 1; xx++) D.set(xx, yy, T.FLOOR);
        r.props.push({ kind:"pedestal", x, y:y - 2, closet:true, pool:"t" });
      }
      D.painted.push({ room:r.id, x, y, color:colors[i].hex, kind:i === k ? "real" : "trick", puzzle:i });
    });
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:Math.floor(r.cyw) + 1, text:clue, riddle:true });
    return true;
  },
  push(D, rng, r, floor){
    const n = floor >= 3 ? 3 : 2, blocks = [], plates = [];
    const used = new Set(), key = (x, y)=> x + "," + y;
    const free = (x, y)=> D.at(x, y) === T.FLOOR && !used.has(key(x, y)) && !DG.Dungeon.nearDoor(D, r, x, y, 3) && x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2;
    for(let tries=0; tries<200 && blocks.length < n; tries++){
      const [dx, dy] = rng.pick(DG.DIRS4), len = rng.int(2, 4);
      const px = rng.int(r.x1 + 2, r.x2 - 2), py = rng.int(r.y1 + 2, r.y2 - 2);
      // the line: player spot, block, ..., plate
      const line = [];
      for(let k=0;k<=len + 1;k++) line.push([px - dx*k, py - dy*k]);
      if(!line.every(([x, y])=> free(x, y))) continue;
      line.forEach(([x, y])=> used.add(key(x, y)));
      plates.push({ x:px, y:py });
      blocks.push({ x:px - dx*len, y:py - dy*len, sx:px - dx*len, sy:py - dy*len });
    }
    if(blocks.length < n) return false;
    blocks.forEach(b=> D.set(b.x, b.y, T.PUSH));
    if(!DG.Dungeon.roomConnected(D, r)){ blocks.forEach(b=> D.set(b.x, b.y, T.FLOOR)); return false; }
    r.puzzle = { kind:"push", blocks, plates, solved:false, cd:0 };
    plates.forEach((p, i)=> r.props.push({ kind:"plate", x:p.x, y:p.y, slot:i }));
    const rr = DG.Dungeon.freeTiles(D, r, { door:3 }).find(([x, y])=> y === r.y1 && !used.has(key(x, y)));
    if(rr){ r.puzzle.reset = { x:rr[0] + 0.5, y:rr[1] + 0.5, cd:0 }; r.props.push({ kind:"resetrune", x:rr[0], y:rr[1] }); }
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"PUT THE ROCKS ON THE PLATES. Walk into a rock to push it. Wedged one? Shoot the blue rune to start over." });
    return true;
  },
  chorus(D, rng, r, floor){
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw) - 1;
    const pos = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    const items = pos.map(([dx, dy])=> ({ x:cx + dx + 0.5, y:cy + dy + 0.5, cd:0, glow:0 }));
    if(items.some(it=> D.at(Math.floor(it.x), Math.floor(it.y)) !== T.FLOOR)) return false;
    const len = 3 + Math.floor(floor/2);
    const seq = []; for(let i=0;i<len + 1;i++) seq.push(rng.int(0, 3));
    r.puzzle = { kind:"chorus", items, seq, len, round:0, rounds:2, phase:"wait", i:0, t:0, solved:false, mistakes:0 };
    r.props.push({ kind:"sign", x:cx, y:r.y1, text:"THE SHROOM CHORUS. Listen. Then shoot them in the order they sang. Mushrooms hate a wrong note." });
    return true;
  },
  statues(D, rng, r, floor){
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw) - 1;
    const pos = [[0, -3], [3, 0], [0, 3], [-3, 0]];
    const items = pos.map(([dx, dy])=> ({ x:cx + dx + 0.5, y:cy + dy + 0.5, cd:0 }));
    if(items.some(it=> D.at(Math.floor(it.x), Math.floor(it.y)) !== T.FLOOR)) return false;
    // facing: 0 east, 1 south, 2 west, 3 north; the answer points at the eye
    const want = items.map(it=>{ const a = Math.atan2(cy + 0.5 - it.y, cx + 0.5 - it.x); return ((Math.round(a/(Math.PI/2)) % 4) + 4) % 4; });
    const linked = floor >= 3;
    const pz = { kind:"statues", items, face:want.slice(), want, linked, solved:false, eye:{ x:cx + 0.5, y:cy + 0.5 } };
    const presses = rng.int(3, 7);
    for(let i=0;i<presses;i++) turnStatue(pz, rng.int(0, 3), -1);
    if(pz.face.every((f, i)=> f === want[i])) turnStatue(pz, 0, -1);
    r.puzzle = pz;
    r.props.push({ kind:"sign", x:cx, y:r.y1, text:linked ? "MAKE THEM LOOK AT THE EYE. Shoot a statue to turn it. They're friends: turning one turns the next one too." : "MAKE THEM LOOK AT THE EYE. Shoot a statue to turn it." });
    return true;
  }
};

function flipBraziers(pz, i){
  const x = i % pz.w, y = Math.floor(i/pz.w);
  [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy])=>{
    const nx = x + dx, ny = y + dy;
    if(nx < 0 || ny < 0 || nx >= pz.w || ny >= pz.h) return;
    pz.lit[ny*pz.w + nx] ^= 1;
  });
}
Pz.flipBraziers = flipBraziers;
function turnStatue(pz, i, dir){
  const d = dir || 1;
  pz.face[i] = ((pz.face[i] + d) % 4 + 4) % 4;
  if(pz.linked){ const j = (i + 1) % pz.face.length; pz.face[j] = ((pz.face[j] + d) % 4 + 4) % 4; }
}
Pz.turnStatue = turnStatue;

function closetFree(D, x, y){
  for(let yy=y - 4; yy<=y; yy++) for(let xx=x - 2; xx<=x + 2; xx++) if(D.at(xx, yy) !== T.SOLID) return false;
  return D.at(x, y + 1) === T.FLOOR;
}

/* build a riddle that picks out door k and only door k */
function riddle(rng, colors, k){
  const idx = c=> colors.findIndex(o=> o.id === c.id);
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

/* ================================================================== *
 *  Runtime
 * ================================================================== */
/* a shot hits a puzzle piece? returns true if it was used up */
Pz.shot = function(G, b){
  const r = G.room; if(!r || !r.puzzle || r.puzzle.solved) return false;
  const pz = r.puzzle;
  if(pz.kind === "push" && pz.reset && pz.reset.cd <= 0 && DG.dist(b.x, b.y, pz.reset.x, pz.reset.y) < 0.5 + b.r){
    pz.reset.cd = 1; Pz.resetBlocks(G, r); return true;
  }
  if(!pz.items) return false;
  for(let i=0;i<pz.items.length;i++){
    const it = pz.items[i];
    if(it.cd > 0 || DG.dist(b.x, b.y, it.x, it.y) > 0.45 + b.r) continue;
    it.cd = 0.4;
    if(pz.kind === "braziers"){
      flipBraziers(pz, i);
      G.emit("brazier", { room:r.id, i, lit:pz.lit.slice() });
      if(pz.lit.every(v=> v)) G.solvePuzzle(r);
    } else if(pz.kind === "statues"){
      turnStatue(pz, i, 1);
      G.emit("statue", { room:r.id, i });
      if(pz.face.every((f, k)=> f === pz.want[k])) G.solvePuzzle(r);
    } else if(pz.kind === "chorus"){
      if(pz.phase !== "listen") return true;
      it.glow = 0.4;
      G.emit("chorus", { room:r.id, i, ok:pz.seq[pz.i] === i });
      if(pz.seq[pz.i] === i){
        pz.i++;
        if(pz.i >= pz.len + pz.round){
          pz.round++;
          if(pz.round >= pz.rounds) G.solvePuzzle(r);
          else { pz.phase = "wait"; pz.t = 1; G.say("Lovely! Again, but longer.", 2); }
        }
      } else {
        pz.mistakes++; pz.phase = "wait"; pz.t = 1.5; pz.i = 0;
        G.say(pz.mistakes === 1 ? "WRONG NOTE! The shrooms are furious." : "Wrong note. They'll sing it again.", 2.5);
        if(pz.mistakes === 1) G.ambush(r);
      }
    }
    return true;
  }
  return false;
};

/* Zippy walks into a push block */
Pz.push = function(G, tx, ty, dx, dy){
  const r = G.roomOf(tx + 0.5, ty + 0.5); if(!r || !r.puzzle || r.puzzle.kind !== "push") return;
  const pz = r.puzzle;
  if(pz.cd > G.t) return;
  const b = pz.blocks.find(o=> o.x === tx && o.y === ty); if(!b) return;
  const nx = tx + dx, ny = ty + dy;
  if(G.D.at(nx, ny) !== T.FLOOR || !G.inRoom(r, nx + 0.5, ny + 0.5)) { G.emit("pushStuck", { x:tx, y:ty }); pz.cd = G.t + 0.3; return; }
  if(G.enemies.some(e=> !e.dead && Math.floor(e.x) === nx && Math.floor(e.y) === ny)) return;
  G.D.set(tx, ty, T.FLOOR); G.D.set(nx, ny, T.PUSH); b.x = nx; b.y = ny; G.D.ver++;
  pz.cd = G.t + 0.22;
  G.emit("push", { room:r.id, x:tx, y:ty, nx, ny });
  if(pz.plates.every(p=> pz.blocks.some(o=> o.x === p.x && o.y === p.y))) G.solvePuzzle(r);
};
Pz.resetBlocks = function(G, r){
  const pz = r.puzzle, p = G.player;
  pz.blocks.forEach(b=> G.D.set(b.x, b.y, T.FLOOR));
  pz.blocks.forEach(b=>{ b.x = b.sx; b.y = b.sy; G.D.set(b.x, b.y, T.PUSH); });
  // never reset a block onto Zippy
  pz.blocks.forEach(b=>{ if(Math.abs(p.x - b.x - 0.5) < 0.5 + p.r && Math.abs(p.y - b.y - 0.5) < 0.5 + p.r){ const s = G.freeSpot(r, r.cxw, r.y2); p.x = s.x; p.y = s.y; } });
  G.D.ver++;
  G.emit("pushReset", { room:r.id });
};

Pz.update = function(G, dt){
  const r = G.room; if(!r || !r.puzzle) return;
  const pz = r.puzzle;
  if(pz.items) pz.items.forEach(it=>{ it.cd = Math.max(0, it.cd - dt); if(it.glow > 0) it.glow -= dt; });
  if(pz.reset) pz.reset.cd = Math.max(0, pz.reset.cd - dt);
  if(pz.kind === "chorus" && !pz.solved && !r.active){
    pz.t -= dt;
    if(pz.phase === "wait" && pz.t <= 0){ pz.phase = "sing"; pz.i = 0; pz.t = 0.4; }
    else if(pz.phase === "sing" && pz.t <= 0){
      const n = pz.len + pz.round;
      if(pz.i < n){ const k = pz.seq[pz.i]; pz.items[k].glow = 0.55; G.emit("chorusSing", { room:r.id, i:k, note:pz.i }); pz.i++; pz.t = 0.75; }
      else { pz.phase = "listen"; pz.i = 0; G.emit("chorusListen", { room:r.id }); }
    }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
