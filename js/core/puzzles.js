/* ------------------------------------------------------------------ *
 *  Puzzles. Every piece is used with E: one press, one action (shots
 *  pass straight through). Each one has a rule to work out, something
 *  at stake (a budget of moves, or mistakes), and gets harder deeper
 *  down. Each is generated so it can always be solved (the tests check).
 *
 *  doors    the Liar's Doors: three doors, a stone face over each saying
 *           one thing, and a rule about who lies. One door is true.
 *           Every door has a closet, and they all look the same. Open the
 *           wrong one and you're ambushed, and the others seal.
 *  embers   lights-out with E: a brazier flips itself and its neighbours
 *           (3x3, then 4x4; deep down some flip in a knight's pattern).
 *           A row of candles counts the moves left.
 *  stones   sokoban, made by pulling the stones backwards off their plates,
 *           so it's always solvable and takes real pushing. The reset rune
 *           costs blood.
 *  choir    the mushrooms sing a phrase, you sing it back (three rounds,
 *           each a note longer; deep down, back to front). A wrong note
 *           bursts spores in your face.
 *  mirrors  the Mirror Hall: a shaft of light, statues holding shields;
 *           turn the shields to carry the beam to the eye.
 *
 *  The reward: a chest (tier 2, or 3 from floor 3), or for the doors the
 *  true door's closet. Solve it without a slip and there's a key as well.
 *  Go over a budget and the reward drops a tier.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG, T = DG.TILE;
const Pz = DG.Puzzles = {};
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];      // 0 east, 1 south, 2 west, 3 north

Pz.generate = function(D, rng, r, floor){
  const kinds = rng.shuffle(["doors", "embers", "stones", "choir", "mirrors"]);
  for(const k of kinds){ if(GEN[k](D, rng, r, floor)) break; }
  const pz = r.puzzle;
  pz.flawless = true; pz.tier = floor >= 3 ? 3 : 2; pz.room = r.id;
  // the true door leads to its own closet of treasure; everything else locks a chest
  if(pz.kind !== "doors") r.props.push({ kind:"chest", x:Math.floor(r.cxw), y:r.y2 - 1, tier:pz.tier, locked:true });
};

/* tiles a puzzle may use: open floor, not the sign or chest rows, out of the doorways */
function usable(D, r, x, y){
  return x > r.x1 && x < r.x2 && y > r.y1 && y < r.y2 - 1 && D.at(x, y) === T.FLOOR && !DG.Dungeon.inDoorway(D, r, x + 0.5, y + 0.5, 0);
}

const GEN = Pz.GEN = {
  /* ---- the Liar's Doors ---- */
  doors(D, rng, r, floor){
    const y = r.y1 - 1, xs = [];
    for(let x=r.x1 + 2; x<=r.x2 - 2; x++){
      if(!closetFree(D, x, y)) continue;
      if(xs.length && x - xs[xs.length - 1] < 4) continue;
      xs.push(x);
    }
    if(xs.length < 3) return false;
    const pick = [xs[0], xs[Math.floor(xs.length/2)], xs[xs.length - 1]];
    if(pick[1] - pick[0] < 4 || pick[2] - pick[1] < 4) return false;
    const rule = floor <= 2 ? "one" : floor <= 4 ? "honest" : "two";
    const colors = rng.shuffle(DG.DOOR_COLORS.slice()).slice(0, 3);
    const rid = liarRiddle(rng, rule, colors);
    if(!rid) return false;
    r.puzzle = { kind:"doors", rule, answer:rid.answer, solved:false, failed:false, opened:-1,
      doors:pick.map((x, i)=> ({ x:x + 0.5, y:y + 0.5, tx:x, ty:y, i, color:colors[i].hex, name:colors[i].name, says:rid.says[i], open:false, pz:true, room:r.id, part:"door" })) };
    pick.forEach((x, i)=>{
      // every door has a closet behind it, and every closet is the same: dark, and empty until it's opened
      for(let yy=y - 3; yy<=y - 1; yy++) for(let xx=x - 1; xx<=x + 1; xx++) D.set(xx, yy, T.FLOOR);
      D.set(x, y, T.FAKE);
      D.fakes.push({ room:r.id, tiles:[[x, y]], revealed:false, x:x + 0.5, y:y + 0.5, puzzle:true, door:i });
      D.painted.push({ room:r.id, x, y, color:colors[i].hex, kind:"puzzle", puzzle:i });
    });
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:Math.floor(r.cyw) + 1, riddle:true, text:RULE_TEXT[rule] });
    return true;
  },

  /* ---- Embers: lights-out ---- */
  embers(D, rng, r, floor){
    const n = floor >= 3 ? 4 : 3, sp = n === 4 ? 1.7 : 2.2;
    const cx = r.cxw, top = r.y1 + 3.3;                    // clear of a north door's way in
    const items = [];
    for(let j=0;j<n;j++) for(let i=0;i<n;i++) items.push({ x:cx + (i - (n - 1)/2)*sp, y:top + j*sp, cd:0, pz:true, room:r.id, part:"brazier", i:items.length });
    if(items.some(it=> !usable(D, r, Math.floor(it.x), Math.floor(it.y)))) return false;
    const knight = floor >= 4 ? rng.shuffle([...Array(n*n).keys()]).slice(0, 2) : [];
    const pz = { kind:"embers", n, w:n, h:n, items, knight, lit:new Array(n*n).fill(1), moves:0, solved:false };
    pz.masks = items.map((_, i)=> flipMask(pz, i));
    scrambleEmbers(pz, rng, floor);
    r.puzzle = pz;
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"LIGHT THEM ALL. Every one you touch, its neighbours answer." + (knight.length ? " The marked ones answer like a knight moves." : "") + " The candles count your tries." });
    return true;
  },

  /* ---- Weighing Stones: sokoban, built backwards ---- */
  stones(D, rng, r, floor){
    const nb = floor >= 3 ? 3 : 2, need = 4 + 2*floor;
    const key = (x, y)=> x + "," + y;
    const ok = (x, y)=> usable(D, r, x, y) && x > r.x1 + 0 && y > r.y1 + 1;
    // a few pillars first, so the stones have something to get stuck on
    const pillars = [];
    for(let k=0, tries=0; k<3 + floor && tries<80; tries++){
      const x = rng.int(r.x1 + 2, r.x2 - 2), y = rng.int(r.y1 + 3, r.y2 - 3);
      if(!ok(x, y) || Math.abs(x - Math.floor(r.cxw)) < 1 && y > r.y2 - 4) continue;
      D.set(x, y, T.BLOCK); pillars.push([x, y]); k++;
    }
    if(!DG.Dungeon.roomConnected(D, r)){ pillars.forEach(([x, y])=> D.set(x, y, T.FLOOR)); return false; }
    for(let attempt=0; attempt<60; attempt++){
      const free = [];
      for(let y=r.y1 + 2; y<r.y2 - 1; y++) for(let x=r.x1 + 1; x<r.x2; x++) if(ok(x, y)) free.push([x, y]);
      if(free.length < 20) break;
      const plates = rng.shuffle(free.slice()).slice(0, nb);
      if(plates.some(([x, y], i)=> plates.some(([u, v], j)=> j !== i && Math.abs(x - u) + Math.abs(y - v) < 2))) continue;
      const blocks = plates.map(([x, y])=> ({ x, y }));
      const stone = (x, y)=> blocks.some(b=> b.x === x && b.y === y);
      const solid = (x, y)=> !ok(x, y) || stone(x, y);                                   // where a stone can't go
      const wall = (x, y)=> D.at(x, y) !== T.FLOOR || x < r.x1 || y < r.y1 || x > r.x2 || y > r.y2 || stone(x, y);   // where Zippy can't walk
      let pl = rng.pick(free.filter(([x, y])=> !solid(x, y))), pulls = 0;
      const moves = [];
      if(!pl) continue;
      // walk the player round and pull stones backwards, many times
      for(let step=0; step<400 && pulls < need*2; step++){
        const b = rng.pick(blocks), d = rng.int(0, 3);
        const ax = b.x - DX[d], ay = b.y - DY[d], bx = b.x - 2*DX[d], by = b.y - 2*DY[d];
        if(solid(ax, ay) || wall(bx, by)) continue;
        if(!reachable(pl, [ax, ay], wall, r)) continue;
        const len = 1 + (rng.chance(0.5) ? 1 : 0);
        let moved = 0;
        for(let k=0;k<len;k++){
          const cx = b.x - DX[d], cy = b.y - DY[d], px = cx - DX[d], py = cy - DY[d];
          if(solid(cx, cy) || wall(px, py)) break;
          moves.push({ x:cx, y:cy, dx:DX[d], dy:DY[d] });      // undone: a push from (cx, cy) the other way
          b.x = cx; b.y = cy; pl = [px, py]; moved++;
        }
        pulls += moved;
      }
      if(pulls < need) continue;
      if(blocks.some(b=> plates.some(([x, y])=> x === b.x && y === b.y))) continue;
      // the player has to be able to get to where the pulling ended, from the doors
      const entry = r.doors.length ? doorStep(D, r) : pl;
      if(entry && !reachable(entry, pl, wall, r)) continue;
      blocks.forEach(b=> D.set(b.x, b.y, T.PUSH));
      if(!DG.Dungeon.roomConnected(D, r) && !blocksOnlyCut(D, r)){ blocks.forEach(b=> D.set(b.x, b.y, T.FLOOR)); continue; }
      const pz = { kind:"stones", blocks:blocks.map(b=> ({ x:b.x, y:b.y, sx:b.x, sy:b.y })), plates:plates.map(([x, y])=> ({ x, y })), pulls, solved:false, cd:0,
        solution:moves.reverse() };
      pz.plates.forEach((p, i)=> r.props.push({ kind:"plate", x:p.x, y:p.y, slot:i }));
      const rr = [Math.floor(r.cxw) + 3, Math.floor(r.cxw) - 3].map(x=> [x, r.y1]).find(([x, y])=> D.at(x, y) === T.FLOOR && !DG.Dungeon.inDoorway(D, r, x + 0.5, y + 0.5));
      if(rr){ pz.reset = { x:rr[0] + 0.5, y:rr[1] + 0.5, pz:true, room:r.id, part:"reset" }; r.props.push({ kind:"resetrune", x:rr[0], y:rr[1] }); }
      r.puzzle = pz;
      r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"THE WEIGHING STONES. Every plate wants its stone. Walk into a stone to shove it. The blue rune puts them back, and it drinks blood for it." });
      return true;
    }
    pillars.forEach(([x, y])=> D.set(x, y, T.FLOOR));
    return false;
  },

  /* ---- the Choir ---- */
  choir(D, rng, r, floor){
    const cx = Math.floor(r.cxw), cy = Math.floor(r.cyw) - 1;
    const pos = [[0, -2], [2, 0], [0, 2], [-2, 0]];
    const items = pos.map(([dx, dy], i)=> ({ x:cx + dx + 0.5, y:cy + dy + 0.5, cd:0, glow:0, pz:true, room:r.id, part:"shroom", i }));
    if(items.some(it=> !usable(D, r, Math.floor(it.x), Math.floor(it.y)))) return false;
    const len = 3 + Math.ceil(floor/2), rounds = 3, reverse = floor >= 4;
    const seq = []; for(let i=0;i<len + rounds;i++) seq.push(rng.int(0, 3));
    r.puzzle = { kind:"choir", items, seq, len, round:0, rounds, reverse, phase:"wait", i:0, t:1, solved:false, mistakes:0 };
    r.props.push({ kind:"sign", x:cx, y:r.y1, text:reverse ? "THE CHOIR. Hear them out. Then sing it back to them, back to front. They hate a wrong note." : "THE CHOIR. Hear them out. Then sing it back to them. They hate a wrong note." });
    return true;
  },

  /* ---- the Mirror Hall ---- */
  mirrors(D, rng, r, floor){
    const turns = floor <= 2 ? 2 : floor <= 4 ? 3 : 4, decoys = floor <= 2 ? 1 : floor <= 4 ? 2 : 3;
    const ok = (x, y)=> usable(D, r, x, y) && !(x === Math.floor(r.cxw) && y === r.y2 - 1);
    for(let attempt=0; attempt<300; attempt++){
      const used = new Set(), key = (x, y)=> x + "," + y;
      let x = rng.int(r.x1 + 1, r.x2 - 1), y = rng.int(r.y1 + 2, r.y2 - 3), d = rng.int(0, 3);
      if(!ok(x, y)) continue;
      const src = { x, y, d }; used.add(key(x, y));
      const items = [], want = [];
      let fail = false;
      for(let t=0; t<=turns && !fail; t++){
        const len = rng.int(2, 4);
        for(let k=0;k<len;k++){
          x += DX[d]; y += DY[d];
          if(!ok(x, y) || used.has(key(x, y))){ fail = true; break; }
          used.add(key(x, y));
        }
        if(fail) break;
        if(t < turns){
          const nd = (d + (rng.chance(0.5) ? 1 : 3)) % 4;
          want.push(shieldFor(d, nd)); items.push({ x:x + 0.5, y:y + 0.5, tx:x, ty:y, q:0, pz:true, room:r.id, part:"mirror", i:items.length });
          d = nd;
        }
      }
      if(fail) continue;
      const eye = { x, y };
      // shields that lead nowhere, off the path
      for(let k=0, tries=0; k<decoys && tries<60; tries++){
        const u = rng.int(r.x1 + 1, r.x2 - 1), v = rng.int(r.y1 + 2, r.y2 - 2);
        if(!ok(u, v) || used.has(key(u, v))) continue;
        used.add(key(u, v)); want.push(-1); items.push({ x:u + 0.5, y:v + 0.5, tx:u, ty:v, q:rng.int(0, 3), pz:true, room:r.id, part:"mirror", i:items.length }); k++;
      }
      const linked = floor >= 4;
      const pz = { kind:"mirrors", src, eye, items, want, linked, turns:0, solved:false };
      items.forEach((it, i)=>{ if(want[i] >= 0) it.q = want[i]; });
      if(!Pz.trace(D, pz).hit) continue;                   // the answer must work
      // scramble: turn shields at random (linked, the same way a player would, so it stays solvable)
      for(let k=0, n=rng.int(4, 8); k<n; k++) turnMirror(pz, rng.int(0, items.length - 1), 1);
      if(Pz.trace(D, pz).hit) turnMirror(pz, 0, 1);
      if(Pz.trace(D, pz).hit) continue;
      pz.budget = Pz.mirrorPar(pz) + 4;
      r.puzzle = pz;
      r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"THE MIRROR HALL. Give the eye the light. A shield turns a quarter at a touch." + (linked ? " Each one drags the next round with it." : "") });
      return true;
    }
    return false;
  }
};

/* ---- the Liar's Doors: riddles in the knights-and-knaves way ---- */
const RULE_TEXT = {
  one:"THREE FACES. ONE OF THEM LIES. ONE DOOR IS TRUE. Read them. Then open one, and only one.",
  honest:"THE FACE OVER THE TRUE DOOR SPEAKS TRUE. THE OTHER TWO LIE. Open one, and only one.",
  two:"TWO FACES LIE. ONE SPEAKS TRUE. ONE DOOR IS TRUE. Open one, and only one."
};
const SPOT = ["left", "middle", "right"];
/* the worlds a rule allows: where the way is (a), and who lies */
function worlds(rule){
  const out = [];
  for(let a=0;a<3;a++){
    if(rule === "honest") out.push({ a, liar:[0, 1, 2].map(i=> i !== a) });
    else for(let l=0;l<3;l++) out.push({ a, liar:[0, 1, 2].map(i=> rule === "one" ? i === l : i !== l) });
  }
  return out;
}
function statements(i, colors){
  const S = [], other = [0, 1, 2].filter(j=> j !== i);
  S.push({ t:"The way is behind me.", f:w=> w.a === i });
  S.push({ t:"The way is not behind me.", f:w=> w.a !== i });
  [0, 1, 2].forEach(j=>{
    if(j === i) return;
    S.push({ t:"The way is behind the " + colors[j].name + " door.", f:w=> w.a === j });
    S.push({ t:"The way is not behind the " + colors[j].name + " door.", f:w=> w.a !== j });
  });
  other.forEach(j=>{
    S.push({ t:"The " + SPOT[j] + " face lies.", f:w=> w.liar[j] });
    S.push({ t:"The " + SPOT[j] + " face speaks true.", f:w=> !w.liar[j] });
    S.push({ t:"The " + SPOT[j] + " face and I are both honest.", f:w=> !w.liar[j] && !w.liar[i] });
  });
  if(i > 0) S.push({ t:"The way is to my left.", f:w=> w.a < i });
  if(i < 2) S.push({ t:"The way is to my right.", f:w=> w.a > i });
  S.push({ t:"At least one of the others lies.", f:w=> w.liar[other[0]] || w.liar[other[1]] });
  return S;
}
/* the worlds where every face says what its honesty demands */
function consistent(rule, says){ return worlds(rule).filter(w=> says.every((s, i)=> !!s.f(w) === !w.liar[i])); }
function liarRiddle(rng, rule, colors){
  const pools = [0, 1, 2].map(i=> statements(i, colors));
  for(let tries=0; tries<3000; tries++){
    const says = pools.map(p=> rng.pick(p));
    const ws = consistent(rule, says);
    if(ws.length !== 1) continue;
    // it has to take some thinking: no single face may give it away
    const giveaway = [0, 1, 2].some(k=>{ const one = worlds(rule).filter(w=> !!says[k].f(w) === !w.liar[k]); return new Set(one.map(w=> w.a)).size === 1; });
    if(giveaway) continue;
    return { answer:ws[0].a, liars:ws[0].liar, says:says.map(s=> s.t) };
  }
  return null;
}
Pz.liarRiddle = liarRiddle;
Pz.riddleWorlds = (rule, texts, colors)=>{
  const pools = [0, 1, 2].map(i=> statements(i, colors));
  const says = texts.map((t, i)=> pools[i].find(s=> s.t === t));
  return consistent(rule, says);
};

function closetFree(D, x, y){
  for(let yy=y - 4; yy<=y; yy++) for(let xx=x - 2; xx<=x + 2; xx++) if(D.at(xx, yy) !== T.SOLID) return false;
  return D.at(x, y + 1) === T.FLOOR;
}

/* ---- Embers ---- */
function flipMask(pz, i){
  const n = pz.n, x = i % n, y = Math.floor(i/n);
  const steps = pz.knight.indexOf(i) >= 0 ? [[0, 0], [1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]] : [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  let m = 0;
  steps.forEach(([dx, dy])=>{ const nx = x + dx, ny = y + dy; if(nx >= 0 && ny >= 0 && nx < n && ny < n) m |= 1 << (ny*n + nx); });
  return m;
}
function litMask(pz){ let m = 0; pz.lit.forEach((v, i)=>{ if(!v) m |= 1 << i; }); return m; }   // the dark ones
function flipEmber(pz, i){ const m = pz.masks[i]; pz.lit = pz.lit.map((v, k)=> (m >> k) & 1 ? v ^ 1 : v); }
Pz.flipEmber = flipEmber;
/* the fewest presses that light every one (brute force: 2^16 at most) */
Pz.emberPar = function(pz){
  const dark = litMask(pz), N = pz.items.length;
  let best = Infinity;
  for(let s=0; s<(1 << N); s++){
    let m = 0, c = 0;
    for(let i=0;i<N;i++) if((s >> i) & 1){ m ^= pz.masks[i]; c++; }
    if(m === dark && c < best) best = c;
  }
  return best;
};
function scrambleEmbers(pz, rng, floor){
  pz.lit = pz.lit.map(()=> 1);
  const N = pz.items.length, presses = rng.shuffle([...Array(N).keys()]).slice(0, rng.int(pz.n === 4 ? 4 : 3, pz.n === 4 ? 7 : 5));
  presses.forEach(i=> flipEmber(pz, i));
  if(pz.lit.every(v=> v)) flipEmber(pz, Math.floor(N/2));
  pz.par = Pz.emberPar(pz);
  if(pz.par === Infinity){ pz.lit = pz.lit.map(()=> 1); flipEmber(pz, 0); pz.par = 1; }
  pz.budget = pz.par + (floor <= 2 ? 3 : 2); pz.moves = 0;
}

/* ---- Weighing Stones ---- */
function reachable(from, to, solid, r){
  if(!from) return false;
  const seen = new Set([from[0] + "," + from[1]]), q = [from];
  while(q.length){
    const [x, y] = q.pop();
    if(x === to[0] && y === to[1]) return true;
    for(const [dx, dy] of DG.DIRS4){
      const nx = x + dx, ny = y + dy, k = nx + "," + ny;
      if(seen.has(k) || nx < r.x1 || ny < r.y1 || nx > r.x2 || ny > r.y2 || (solid(nx, ny) && !(nx === to[0] && ny === to[1]))) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}
/* the floor tile just inside the room's first door */
function doorStep(D, r){
  const d = D.doors[r.doors[0]]; if(!d) return null;
  const x = Math.floor(d.x), y = Math.floor(d.y);
  return d.side === "e" ? [x - 1, y] : d.side === "w" ? [x + 1, y] : d.side === "s" ? [x, y - 1] : [x, y + 1];
}
/* the room is only split by the stones themselves (they move, so that's fine) */
function blocksOnlyCut(D, r){
  const saved = [];
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === T.PUSH){ saved.push([x, y]); D.set(x, y, T.FLOOR); }
  const ok = DG.Dungeon.roomConnected(D, r);
  saved.forEach(([x, y])=> D.set(x, y, T.PUSH));
  return ok;
}

/* ---- the Mirror Hall ----
   A shield's q says which two sides of its tile are open: 0 north+east,
   1 east+south, 2 south+west, 3 west+north. Light coming in through one
   open side goes out through the other; through the back, it stops. */
const OPEN = [[3, 0], [0, 1], [1, 2], [2, 3]];   // as directions out of the tile (0 east, 1 south, 2 west, 3 north)
function shieldFor(din, dout){
  const inSide = (din + 2) % 4;                 // the side the light comes in by
  return OPEN.findIndex(([a, b])=> (a === inSide && b === dout) || (b === inSide && a === dout));
}
function turnMirror(pz, i, dir){
  const d = dir || 1;
  pz.items[i].q = ((pz.items[i].q + d) % 4 + 4) % 4;
  if(pz.linked && i + 1 < pz.items.length) pz.items[i + 1].q = ((pz.items[i + 1].q + d) % 4 + 4) % 4;
}
Pz.turnMirror = turnMirror;
/* where the light goes: the tiles it crosses, and whether it reaches the eye */
Pz.trace = function(D, pz){
  let x = pz.src.x, y = pz.src.y, d = pz.src.d;
  const pts = [[x + 0.5, y + 0.5]];
  for(let k=0;k<120;k++){
    const nx = x + DX[d], ny = y + DY[d];
    const t = D.at(nx, ny);
    if(t !== T.FLOOR && t !== T.PUSH){ pts.push([x + 0.5 + DX[d]*0.5, y + 0.5 + DY[d]*0.5]); return { pts, hit:false }; }
    x = nx; y = ny;
    if(x === pz.eye.x && y === pz.eye.y){ pts.push([x + 0.5, y + 0.5]); return { pts, hit:true }; }
    const m = pz.items.find(it=> it.tx === x && it.ty === y);
    if(m){
      pts.push([x + 0.5, y + 0.5]);
      const inSide = (d + 2) % 4, [a, b] = OPEN[m.q];
      if(inSide === a) d = b; else if(inSide === b) d = a;
      else return { pts, hit:false, blocked:m.i };
    }
  }
  return { pts, hit:false };
};
/* the fewest turns that solve it, from here (the unlinked way: each shield on its own) */
Pz.mirrorPar = function(pz){
  if(pz.linked){
    // a chain: turn the first until it's right, which drags the second, and so on
    const q = pz.items.map(it=> it.q); let n = 0;
    for(let i=0;i<q.length;i++){
      if(pz.want[i] < 0) continue;
      const k = ((pz.want[i] - q[i]) % 4 + 4) % 4; n += k;
      if(i + 1 < q.length) q[i + 1] = (q[i + 1] + k) % 4;
    }
    return n;
  }
  return pz.items.reduce((n, it, i)=> n + (pz.want[i] < 0 ? 0 : ((pz.want[i] - it.q) % 4 + 4) % 4), 0);
};

/* ================================================================== *
 *  Runtime
 * ================================================================== */
/* what E can do here: each piece in reach, with what it would do */
Pz.consider = function(G, r, consider){
  const pz = r.puzzle; if(!pz || pz.solved) return;
  const p = G.player, d = o=> DG.dist(o.x, o.y, p.x, p.y);
  if(r.active) return;                             // no puzzling mid-ambush
  if(pz.kind === "doors" && !pz.failed) pz.doors.forEach(o=>{
    if(o.open) return;
    consider(o, DG.dist(o.x, o.y + 0.9, p.x, p.y) - 0.3, "Open the " + o.name + " door. (Only one opens true.)");
  });
  if(pz.kind === "embers") pz.items.forEach(o=> consider(o, d(o), "Stir the brazier (" + (pz.budget - pz.moves) + " candle" + (pz.budget - pz.moves === 1 ? "" : "s") + " left)"));
  if(pz.kind === "choir" && pz.phase === "listen") pz.items.forEach(o=> consider(o, d(o), "Sing back (" + (pz.i + 1) + " of " + (pz.len + pz.round) + ")"));
  if(pz.kind === "mirrors") pz.items.forEach(o=> consider(o, d(o), "Turn the shield"));
  if(pz.kind === "stones" && pz.reset) consider(pz.reset, d(pz.reset), "Put the stones back (it drinks blood)");
};
/* E on a piece */
Pz.use = function(G, o){
  const r = G.D.rooms[o.room], pz = r && r.puzzle;
  if(!pz || pz.solved) return;
  if(o.cd > G.t) return;
  o.cd = G.t + 0.18;
  if(pz.kind === "doors") return openDoor(G, r, pz, o);
  if(pz.kind === "embers"){
    flipEmber(pz, o.i); pz.moves++;
    G.emit("brazier", { room:r.id, i:o.i, lit:pz.lit.slice(), left:pz.budget - pz.moves });
    if(pz.lit.every(v=> v)){ G.solvePuzzle(r); return; }
    if(pz.moves >= pz.budget){
      fail(G, r, "The braziers gutter out. Something in the dark noticed.");
      scrambleEmbers(pz, G.rng, G.floor);
      G.emit("gutter", { room:r.id, lit:pz.lit.slice() });
      G.ambush(r);
    }
    return;
  }
  if(pz.kind === "choir") return sing(G, r, pz, o.i);
  if(pz.kind === "mirrors"){
    turnMirror(pz, o.i, 1); pz.turns++;
    const tr = Pz.trace(G.D, pz);
    G.emit("mirror", { room:r.id, i:o.i, hit:tr.hit });
    if(tr.hit){ G.solvePuzzle(r); return; }
    if(pz.turns === pz.budget){ fail(G, r, "The light dims. The eye has seen you fumble."); G.ambush(r); }
    return;
  }
  if(pz.kind === "stones" && o.part === "reset"){
    const p = G.player, cost = Math.max(1, Math.round(p.maxHp*0.08));
    if(p.hp <= cost){ G.say("The rune wants blood you can't spare.", 2.5); return; }
    p.hp -= cost; G.emit("hurt", { amt:cost, why:"rune", x:p.x, y:p.y });
    pz.flawless = false;
    Pz.resetBlocks(G, r);
  }
};
function fail(G, r, line){
  const pz = r.puzzle;
  pz.flawless = false;
  if(!pz.degraded){
    pz.degraded = true;
    r.props.forEach(pr=>{ if(pr.kind === "chest" && pr.locked) pr.tier = Math.max(1, pr.tier - 1); });
  }
  G.say(line, 3);
  G.emit("pzFail", { room:r.id });
}
function openDoor(G, r, pz, o){
  if(pz.failed || o.open) return;
  o.open = true; pz.opened = o.i;
  const f = G.D.fakes.find(k=> k.puzzle && k.room === r.id && k.door === o.i);
  if(f) f.revealed = true;
  G.D.ver = (G.D.ver || 0) + 1;
  const honest = o.i === pz.answer;
  G.emit("pzDoor", { room:r.id, i:o.i, honest, x:o.x, y:o.y });
  if(honest){
    G.addProp(r, { kind:"pedestal", x:o.tx, y:o.ty - 2, closet:true, pool:"t" });
    G.solvePuzzle(r, "The true door. ");
  } else {
    pz.failed = true; pz.flawless = false;
    // the faces laugh; the doors left seal for good, and something comes out of the closet
    G.say(G.rng.pick(DG.LINES.wrong), 3);
    G.ambush(r);
  }
}
function sing(G, r, pz, i){
  if(pz.phase !== "listen"){ G.say("Hush. They're still singing.", 1.5); return; }
  const n = pz.len + pz.round, want = pz.seq[pz.reverse ? n - 1 - pz.i : pz.i];
  const it = pz.items[i]; it.glow = 0.4;
  G.emit("chorus", { room:r.id, i, ok:want === i });
  if(want === i){
    pz.i++;
    if(pz.i >= n){
      pz.round++;
      if(pz.round >= pz.rounds) G.solvePuzzle(r);
      else { pz.phase = "wait"; pz.t = 1.2; G.say("They like that. Again, and longer.", 2); }
    }
    return;
  }
  // a wrong note: a burst of spores, and they start again
  pz.mistakes++; pz.phase = "wait"; pz.t = 1.6; pz.i = 0; pz.flawless = false;
  const p = G.player;
  G.hurtPlayer(Math.max(4, Math.round(p.maxHp*0.06)), "spores", true);
  G.emit("spores", { x:it.x, y:it.y, room:r.id });
  if(pz.mistakes >= 3){ fail(G, r, "They stop singing. They're done with you. The chest gives a little, grudgingly."); G.solvePuzzle(r, ""); return; }
  G.say(pz.mistakes === 1 ? "A wrong note. The spores burst." : "Wrong again. Once more, and they'll stop singing for you.", 2.5);
}

/* Zippy walks into a stone */
Pz.push = function(G, tx, ty, dx, dy){
  const r = G.roomOf(tx + 0.5, ty + 0.5); if(!r || !r.puzzle || r.puzzle.kind !== "stones") return;
  const pz = r.puzzle;
  if(pz.cd > G.t || pz.solved) return;
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
  // never reset a stone onto Zippy
  pz.blocks.forEach(b=>{ if(Math.abs(p.x - b.x - 0.5) < 0.5 + p.r && Math.abs(p.y - b.y - 0.5) < 0.5 + p.r){ const s = G.freeSpot(r, r.cxw, r.y2); p.x = s.x; p.y = s.y; } });
  G.D.ver++;
  G.emit("pushReset", { room:r.id });
};

Pz.update = function(G, dt){
  const r = G.room; if(!r || !r.puzzle) return;
  const pz = r.puzzle;
  if(pz.items) pz.items.forEach(it=>{ if(it.glow > 0) it.glow -= dt; });
  if(pz.kind === "choir" && !pz.solved && !r.active){
    pz.t -= dt;
    if(pz.phase === "wait" && pz.t <= 0){ pz.phase = "sing"; pz.i = 0; pz.t = 0.4; }
    else if(pz.phase === "sing" && pz.t <= 0){
      const n = pz.len + pz.round;
      if(pz.i < n){ const k = pz.seq[pz.i]; pz.items[k].glow = 0.55; G.emit("chorusSing", { room:r.id, i:k, note:pz.i }); pz.i++; pz.t = Math.max(0.5, 0.75 - G.floor*0.04); }
      else { pz.phase = "listen"; pz.i = 0; G.emit("chorusListen", { room:r.id, reverse:pz.reverse }); }
    }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
