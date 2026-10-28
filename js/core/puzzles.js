/* ------------------------------------------------------------------ *
 *  Puzzles. Every piece is used with E: one press, one action (shots
 *  pass straight through). Each one has a rule to work out, something
 *  at stake (a budget of moves, or mistakes), and gets harder deeper
 *  down. Each is generated so it can always be solved (the tests check).
 *
 *  doors    the Liar's Doors: three doors (four deep down), a stone face over each saying
 *           one thing, and a plain rule about who lies, written over the doors.
 *           Early on the faces only say where the way is; deeper, they talk
 *           about each other too. One door is true.
 *           Every door has a closet, and they all look the same. Open the
 *           wrong one and you're ambushed, and the others seal.
 *  embers   lights-out with E: a brazier flips itself and its neighbours
 *           (3x3, then 4x4; deep down some flip in a knight's pattern).
 *           A row of candles counts the moves left.
 *  stones   sokoban, made by pulling the stones backwards off their plates,
 *           so it's always solvable and takes real pushing. Each stone takes
 *           only so many pushes before it cracks apart (its share of the
 *           answer and a few to spare). The reset rune costs blood.
 *  choir    the mushrooms sing a phrase; step on them to sing it back (three
 *           rounds, each a note longer; deep down, back to front). A wrong
 *           note bursts spores in your face.
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
    // three doors, four from floor 4 (four and five were a slog nobody could read)
    let n = Math.min(floor >= 4 ? 4 : 3, xs.length, DG.DOOR_COLORS.length);
    if(n < 3) return false;
    const pick = [];
    for(let i=0;i<n;i++) pick.push(xs[Math.round(i*(xs.length - 1)/(n - 1))]);
    if(pick.some((x, i)=> i && x - pick[i - 1] < 4)) return false;
    // the classic first ("one tells the truth"), faces that only say where the way is;
    // from floor 3 one liar among honest faces; from floor 4 they speak of each other
    const rule = floor <= 2 ? "two" : floor === 3 ? "one" : "honest", simple = floor <= 3;
    const colors = rng.shuffle(DG.DOOR_COLORS.slice()).slice(0, n);
    const rid = liarRiddle(rng, rule, colors, simple);
    if(!rid) return false;
    r.puzzle = { kind:"doors", rule, ruleText:RULE_SHORT[rule], answer:rid.answer, solved:false, failed:false, opened:-1,
      doors:pick.map((x, i)=> ({ x:x + 0.5, y:y + 0.5, tx:x, ty:y, i, color:colors[i].hex, name:colors[i].name, says:rid.says[i], open:false, pz:true, room:r.id, part:"door" })) };
    pick.forEach((x, i)=>{
      // every door has a closet behind it, and every closet is the same: dark, and empty until it's opened
      for(let yy=y - 3; yy<=y - 1; yy++) for(let xx=x - 1; xx<=x + 1; xx++) D.set(xx, yy, T.FLOOR);
      D.set(x, y, T.FAKE);
      D.fakes.push({ room:r.id, tiles:[[x, y]], revealed:false, x:x + 0.5, y:y + 0.5, puzzle:true, door:i });
      D.painted.push({ room:r.id, x, y, color:colors[i].hex, kind:"puzzle", puzzle:i });
    });
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:Math.floor(r.cyw) + 1, riddle:true, text:RULE_TEXT[rule](n) });
    return true;
  },

  /* ---- Embers: lights-out ---- */
  embers(D, rng, r, floor){
    const n = floor >= 3 ? 4 : 3, sp = n === 4 ? 1.7 : 2.2;   // (4x4 from floor 3)
    const cx = r.cxw, top = r.y1 + 3.3;                    // clear of a north door's way in
    const items = [];
    for(let j=0;j<n;j++) for(let i=0;i<n;i++) items.push({ x:cx + (i - (n - 1)/2)*sp, y:top + j*sp, cd:0, pz:true, room:r.id, part:"brazier", i:items.length });
    if(items.some(it=> !usable(D, r, Math.floor(it.x), Math.floor(it.y)))) return false;
    const knight = floor >= 4 ? rng.shuffle([...Array(n*n).keys()]).slice(0, 2) : [];
    const pz = { kind:"embers", n, w:n, h:n, items, knight, lit:new Array(n*n).fill(1), moves:0, solved:false };
    pz.masks = items.map((_, i)=> flipMask(pz, i));
    scrambleEmbers(pz, rng, floor);
    r.puzzle = pz;
    r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"LIGHT THEM ALL. Stir one and it flips, and so do the ones beside it (not the corners)." + (knight.length ? " The marked ones flip the ones a knight's move away instead." : "") + " The candles count your tries." });
    return true;
  },

  /* ---- Weighing Stones: sokoban, built backwards ---- */
  stones(D, rng, r, floor){
    const nb = floor >= 2 ? 3 : 2, need = 10 + 3*floor;
    const key = (x, y)=> x + "," + y;
    const ok = (x, y)=> usable(D, r, x, y) && x > r.x1 + 0 && y > r.y1 + 1;
    // a few pillars first, so the stones have something to get stuck on
    const pillars = [];
    for(let k=0, tries=0; k<5 + floor && tries<120; tries++){
      const x = rng.int(r.x1 + 2, r.x2 - 2), y = rng.int(r.y1 + 3, r.y2 - 3);
      if(!ok(x, y) || Math.abs(x - Math.floor(r.cxw)) < 1 && y > r.y2 - 4) continue;
      D.set(x, y, T.BLOCK); pillars.push([x, y]); k++;
    }
    if(!DG.Dungeon.roomConnected(D, r)){ pillars.forEach(([x, y])=> D.set(x, y, T.FLOOR)); return false; }
    // several layouts, and the hardest kept: the first that worked was often a couple of
    // straight shoves. Cheap ones first (each stone far from its plate, its pulls turning
    // corners), then a real answer for the most promising few, and the hardest of those
    const cands = [];
    for(let attempt=0; attempt<90 && cands.length < 6; attempt++){
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
      for(let step=0; step<900 && pulls < need*2; step++){
        const bi = rng.int(0, blocks.length - 1), b = blocks[bi], d = rng.int(0, 3);
        const ax = b.x - DX[d], ay = b.y - DY[d], bx = b.x - 2*DX[d], by = b.y - 2*DY[d];
        if(solid(ax, ay) || wall(bx, by)) continue;
        if(!reachable(pl, [ax, ay], wall, r)) continue;
        const len = 1 + (rng.chance(0.5) ? 1 : 0);
        let moved = 0;
        for(let k=0;k<len;k++){
          const cx = b.x - DX[d], cy = b.y - DY[d], px = cx - DX[d], py = cy - DY[d];
          if(solid(cx, cy) || wall(px, py)) break;
          moves.push({ x:cx, y:cy, dx:DX[d], dy:DY[d], b:bi });      // undone: a push from (cx, cy) the other way
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
      const connected = DG.Dungeon.roomConnected(D, r) || blocksOnlyCut(D, r);
      blocks.forEach(b=> D.set(b.x, b.y, T.FLOOR));
      if(!connected) continue;
      const cheap = Pz.stonesScore(blocks, plates, moves);
      if(cheap < 0) continue;
      cands.push({ cheap, blocks:blocks.map(b=> ({ x:b.x, y:b.y })), plates, entry:entry || pl, pulls });
    }
    // how hard each really is: a real answer, nearly the shortest (the random pulls were often
    // twenty-odd shoves undoing what six would do); its shoves and its corners
    let best = null, tried = 0;
    cands.sort((a, b)=> b.cheap - a.cheap);
    for(const c of cands){
      if(tried >= 3) break;
      c.blocks.forEach(b=> D.set(b.x, b.y, T.PUSH));
      const ans = Pz.stonesAnswer(D, r, c.blocks.map(b=> [b.x, b.y]), c.plates, c.entry);
      c.blocks.forEach(b=> D.set(b.x, b.y, T.FLOOR));
      if(!ans || ans.per.some(k=> k < 3)) continue;
      tried++;
      let corners = 0; for(let k=1;k<ans.moves.length;k++){ const a = ans.moves[k], z = ans.moves[k - 1]; if(a.b === z.b && (a.dx !== z.dx || a.dy !== z.dy)) corners++; }
      const score = ans.moves.length + 3*corners;
      if(!best || score > best.score) best = Object.assign({ score, ans }, c);
    }
    if(best){
      const { blocks, plates, ans, pulls } = best;
      blocks.forEach(b=> D.set(b.x, b.y, T.PUSH));
      // each stone cracks after so many shoves: its share of a near-shortest answer, and a few to spare
      const spare = floor <= 2 ? 4 : 3;
      const pz = { kind:"stones", blocks:blocks.map((b, i)=>{ const hp = ans.per[i] + spare; return { x:b.x, y:b.y, sx:b.x, sy:b.y, hp, hp0:hp }; }), plates:plates.map(([x, y])=> ({ x, y })), pulls, solved:false, cd:0,
        solution:ans.moves.map(m=> ({ x:m.x, y:m.y, dx:m.dx, dy:m.dy, b:m.b })), par:ans.moves.length };
      pz.plates.forEach((p, i)=> r.props.push({ kind:"plate", x:p.x, y:p.y, slot:i }));
      const rr = [Math.floor(r.cxw) + 3, Math.floor(r.cxw) - 3].map(x=> [x, r.y1]).find(([x, y])=> D.at(x, y) === T.FLOOR && !DG.Dungeon.inDoorway(D, r, x + 0.5, y + 0.5));
      if(rr){ pz.reset = { x:rr[0] + 0.5, y:rr[1] + 0.5, pz:true, room:r.id, part:"reset" }; r.props.push({ kind:"resetrune", x:rr[0], y:rr[1] }); }
      r.puzzle = pz;
      r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"THE WEIGHING STONES. Every plate wants its stone. Walk into a stone to shove it. Each cracks with every shove. The blue rune puts them back, for blood." });
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
    // three notes to start (four from floor 3), three rounds, each a note longer; from floor 4,
    // back to front (it was five to seven notes and four rounds: long, and dull)
    const len = floor >= 3 ? 4 : 3, rounds = 3, reverse = floor >= 4;
    const seq = []; for(let i=0;i<len + rounds;i++) seq.push(rng.int(0, 3));
    r.puzzle = { kind:"choir", items, seq, len, round:0, rounds, reverse, phase:"wait", i:0, t:1, solved:false, mistakes:0 };
    r.props.push({ kind:"sign", x:cx, y:r.y1, text:reverse ? "THE CHOIR. Hear them. Then step on them, back to front." : "THE CHOIR. Hear them. Then step on them, in the same order." });
    return true;
  },

  /* ---- the Mirror Hall ---- */
  mirrors(D, rng, r, floor){
    const turns = floor <= 1 ? 3 : floor <= 3 ? 4 : 5, decoys = floor <= 2 ? 2 : 3;
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
      const linked = floor >= 2;
      const pz = { kind:"mirrors", src, eye, items, want, linked, turns:0, solved:false };
      items.forEach((it, i)=>{ if(want[i] >= 0) it.q = want[i]; });
      if(!Pz.trace(D, pz).hit) continue;                   // the answer must work
      // scramble: turn shields at random (linked, the same way a player would, so it stays solvable)
      for(let k=0, n=rng.int(7, 11); k<n; k++) turnMirror(pz, rng.int(0, items.length - 1), 1);
      if(Pz.trace(D, pz).hit) turnMirror(pz, 0, 1);
      if(Pz.trace(D, pz).hit) continue;
      if(Pz.mirrorPar(pz) < turns + 2) continue;           // never a near-miss to start from
      pz.budget = Pz.mirrorPar(pz) + 3;
      r.puzzle = pz;
      r.props.push({ kind:"sign", x:Math.floor(r.cxw), y:r.y1, text:"THE MIRROR HALL. Give the eye the light. A shield turns a quarter at a touch." + (linked ? " Each one drags the next round with it." : "") });
      return true;
    }
    return false;
  }
};

/* ---- the Liar's Doors: riddles in the knights-and-knaves way ---- */
const NUM = ["", "", "", "THREE", "FOUR", "FIVE"];
const RULE_SHORT = {
  two:"One face tells the truth. The others lie.",
  one:"One face lies. The others tell the truth.",
  honest:"The true door's face tells the truth. The others lie."
};
const RULE_TEXT = {
  two:n=> "ONE FACE TELLS THE TRUTH. THE OTHERS LIE. One door is true. Open only one.",
  one:n=> "ONE FACE LIES. THE OTHERS TELL THE TRUTH. One door is true. Open only one.",
  honest:n=> "THE TRUE DOOR'S FACE TELLS THE TRUTH. THE OTHERS LIE. Open only one."
};
const range = n=> [...Array(n).keys()];
/* the worlds a rule allows: where the way is (a), and who lies */
function worlds(rule, n){
  const out = [];
  for(let a=0;a<n;a++){
    if(rule === "honest") out.push({ a, liar:range(n).map(i=> i !== a) });
    else for(let l=0;l<n;l++) out.push({ a, liar:range(n).map(i=> rule === "one" ? i === l : i !== l) });
  }
  return out;
}
/* what face i could say: about the way, about the other faces, about counting */
function statements(i, colors, simple){
  const n = colors.length, S = [], other = range(n).filter(j=> j !== i), nm = j=> colors[j].name;
  S.push({ t:"The way is behind me.", f:w=> w.a === i });
  S.push({ t:"The way is not behind me.", f:w=> w.a !== i });
  other.forEach(j=>{
    S.push({ t:"The way is behind the " + nm(j) + " door.", f:w=> w.a === j });
    S.push({ t:"The way is not behind the " + nm(j) + " door.", f:w=> w.a !== j });
  });
  // early: only where the way is (no "the red face lies"), so it reads in one go
  if(simple) return S;
  other.forEach(j=>{
    S.push({ t:"The " + nm(j) + " face lies.", f:w=> w.liar[j] });
    S.push({ t:"The " + nm(j) + " face speaks true.", f:w=> !w.liar[j] });
    S.push({ t:"The " + nm(j) + " face and I are both honest.", f:w=> !w.liar[j] && !w.liar[i] });
    S.push({ t:"The " + nm(j) + " face and I are not both honest.", f:w=> w.liar[j] || w.liar[i] });
  });
  other.forEach(j=> other.forEach(k=>{
    if(k <= j) return;
    S.push({ t:"The way is behind the " + nm(j) + " door or the " + nm(k) + " door.", f:w=> w.a === j || w.a === k });
    S.push({ t:"Of the " + nm(j) + " and " + nm(k) + " faces, exactly one lies.", f:w=> w.liar[j] !== w.liar[k] });
  }));
  if(i > 0) S.push({ t:"The way is somewhere to my left.", f:w=> w.a < i });
  if(i < n - 1) S.push({ t:"The way is somewhere to my right.", f:w=> w.a > i });
  if(i > 0 && i < n - 1) S.push({ t:"The way is beside me, one door off.", f:w=> Math.abs(w.a - i) === 1 });
  S.push({ t:"The way is at one end of the row.", f:w=> w.a === 0 || w.a === n - 1 });
  S.push({ t:"At least one of the others lies.", f:w=> other.some(j=> w.liar[j]) });
  S.push({ t:"More of us lie than tell the truth.", f:w=> w.liar.filter(Boolean).length*2 > n });
  return S;
}
/* the worlds where every face says what its honesty demands */
function consistent(rule, says){ return worlds(rule, says.length).filter(w=> says.every((s, i)=> !!s.f(w) === !w.liar[i])); }
function liarRiddle(rng, rule, colors, simple){
  const n = colors.length, pools = range(n).map(i=> statements(i, colors, simple));
  for(let tries=0; tries<12000; tries++){
    const says = pools.map(p=> rng.pick(p));
    const ws = consistent(rule, says);
    if(ws.length !== 1) continue;
    // it has to take some thinking: no single face may give it away, and no two may
    // either (with four or five doors, it takes three of them at least)
    const alone = k=> worlds(rule, n).filter(w=> !!says[k].f(w) === !w.liar[k]);
    if(range(n).some(k=> new Set(alone(k).map(w=> w.a)).size === 1)) continue;
    // (under "honest" the worlds are few, n of them, so there only no single face may)
    if(n >= 4 && rule !== "honest" && range(n).some(j=> range(n).some(k=> k > j && new Set(alone(j).filter(w=> !!says[k].f(w) === !w.liar[k]).map(w=> w.a)).size === 1))) continue;
    return { answer:ws[0].a, liars:ws[0].liar, says:says.map(s=> s.t) };
  }
  return null;
}
Pz.liarRiddle = liarRiddle;
Pz.riddleWorlds = (rule, texts, colors)=>{
  const pools = range(colors.length).map(i=> statements(i, colors, false));
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
/* a fair start: several dark (one or two dark looks like "just light that one", and
   lighting it flips its neighbours: it read as unbeatable), and a shortest answer of
   three to five stirs on 3x3, four to six on 4x4 */
Pz.EMBER_FAIR = { dark:3, par3:[3, 5], par4:[4, 6] };
Pz.emberFair = function(pz){
  const dark = pz.lit.filter(v=> !v).length, N = pz.items.length, [lo, hi] = pz.n === 4 ? Pz.EMBER_FAIR.par4 : Pz.EMBER_FAIR.par3;
  return dark >= Pz.EMBER_FAIR.dark && dark <= N - 2 && pz.par >= lo && pz.par <= hi;
};
Pz.scrambleEmbers = (pz, rng, floor)=> scrambleEmbers(pz, rng, floor);
Pz.flipMask = (pz, i)=> flipMask(pz, i);
function scrambleEmbers(pz, rng, floor){
  const N = pz.items.length;
  for(let tries=0; tries<60; tries++){
    pz.lit = pz.lit.map(()=> 1);
    // stirs from all-lit (so it can always come out): the rings show what each stir flips,
    // and it gutters the moment it can't come out, so it's hard, not cruel
    const presses = rng.shuffle([...Array(N).keys()]).slice(0, pz.n === 4 ? rng.int(4, 7) : rng.int(3, 5));
    presses.forEach(i=> flipEmber(pz, i));
    pz.par = Pz.emberPar(pz);
    if(Pz.emberFair(pz)) break;
  }
  if(pz.lit.every(v=> v)) flipEmber(pz, Math.floor(N/2));
  pz.par = Pz.emberPar(pz);
  if(pz.par === Infinity){ pz.lit = pz.lit.map(()=> 1); flipEmber(pz, 0); pz.par = 1; }
  pz.budget = pz.par + (floor <= 2 ? 4 : 3); pz.moves = 0;
}

/* ---- Weighing Stones ---- */
/* how hard a layout is: each stone's distance from its plate, and how often its
   answer turns a corner (a straight shove is no puzzle); -1 if a stone starts
   within two steps of its plate */
Pz.stonesScore = function(blocks, plates, moves){
  let score = 0;
  for(let i=0;i<blocks.length;i++){
    const mine = moves.filter(m=> m.b === i), [px, py] = plates[i];
    const dist = Math.abs(blocks[i].x - px) + Math.abs(blocks[i].y - py);
    if(dist < 3) return -1;
    let turns = 0; for(let k=1;k<mine.length;k++) if(mine[k].dx !== mine[k - 1].dx || mine[k].dy !== mine[k - 1].dy) turns++;
    score += dist + 4*turns;
  }
  return score;
};
/* the shortest answer, in shoves, the way the game moves stones (Pz.push): a stone
   goes onto open floor in the room, Zippy has to get round behind it, and any stone
   will do on any plate. A breadth-first search over (stones, where Zippy can reach),
   stopped after `cap` positions (null: not found that soon, which only means hard).
   Returns the shoves: [{ x, y, dx, dy }] from where each stone stands */
Pz.solveStones = function(D, r, stones, plates, player, cap, fixed){
  const W = r.x2 - r.x1 + 1, H = r.y2 - r.y1 + 1, N = W*H;
  const id = (x, y)=> (y - r.y1)*W + (x - r.x1);
  const open = new Uint8Array(N);
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++){ const t = D.at(x, y); open[id(x, y)] = t === T.FLOOR || t === T.PUSH ? 1 : 0; }
  (fixed || []).forEach(([x, y])=>{ open[id(x, y)] = 0; });                // stones that stay put this time
  if(!open[id(player[0], player[1])]) return null;
  const goal = plates.map(([x, y])=> id(x, y)).sort((a, b)=> a - b);
  const done = st=> st.every((v, i)=> v === goal[i]);
  const step = [1, W, -1, -W], dxs = [1, 0, -1, 0], dys = [0, 1, 0, -1];
  const seen = new Uint32Array(N), q = new Int32Array(N); let stamp = 0;
  // where Zippy can get to (stamped in seen), the stones in his way
  const fill = (st, from)=>{
    stamp++; let n = 0; q[n++] = from; seen[from] = stamp;
    for(let h=0; h<n; h++){
      const c = q[h], cx = c % W, cy = (c - cx)/W;
      for(let d=0; d<4; d++){
        const nx = cx + dxs[d], ny = cy + dys[d]; if(nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const m = c + step[d]; if(!open[m] || seen[m] === stamp || st.indexOf(m) >= 0) continue;
        seen[m] = stamp; q[n++] = m;
      }
    }
  };
  // a position: the stones, and the tile Zippy stands on (just after a shove, the one the
  // stone left). Not reduced to "where he can reach", so a few equal positions count
  // twice; that costs less than a fill per move did
  const keyOf = (st, p)=> st.length === 1 ? st[0]*N + p : st.join(",") + "|" + p;
  const s0 = stones.map(([x, y])=> id(x, y)).sort((a, b)=> a - b), p0 = id(player[0], player[1]);
  if(done(s0)) return [];
  const k0 = keyOf(s0, p0), prev = new Map([[k0, null]]);
  let frontier = [{ st:s0, p:p0, k:k0 }];
  while(frontier.length && prev.size < cap){
    const next = [];
    for(const S of frontier){
      fill(S.st, S.p);
      for(let i=0; i<S.st.length; i++){
        const c = S.st[i], cx = c % W, cy = (c - cx)/W;
        for(let d=0; d<4; d++){
          const bx = cx - dxs[d], by = cy - dys[d], tx = cx + dxs[d], ty = cy + dys[d];
          if(bx < 0 || by < 0 || bx >= W || by >= H || tx < 0 || ty < 0 || tx >= W || ty >= H) continue;
          const behind = c - step[d], to = c + step[d];
          if(seen[behind] !== stamp || !open[to] || S.st.indexOf(to) >= 0) continue;
          const st = S.st.slice(); st[i] = to; if(st.length > 1) st.sort((a, b)=> a - b);
          const k = keyOf(st, c);
          if(prev.has(k)) continue;
          prev.set(k, { from:S.k, x:cx + r.x1, y:cy + r.y1, dx:dxs[d], dy:dys[d] });
          if(done(st)){
            const out = []; let at = k;
            while(prev.get(at)){ const m = prev.get(at); out.push({ x:m.x, y:m.y, dx:m.dx, dy:m.dy }); at = m.from; }
            return out.reverse();
          }
          next.push({ st, p:c, k });
        }
      }
    }
    frontier = next;
  }
  return null;
};
/* a whole answer, one stone at a time: each order of the stones, each to the plate it
   reaches in the fewest shoves (the others standing still), and the shortest of those.
   Not always the very shortest answer, but a real one, close to it, and cheap.
   Returns { moves:[{ x, y, dx, dy, b }], per:[shoves for each stone] } or null */
Pz.stonesAnswer = function(D, r, stones, plates, player){
  // three orders, not every one: the farthest stone first, the nearest first, and as built
  const n = stones.length, far = i=> Math.min(...plates.map(([x, y])=> Math.abs(stones[i][0] - x) + Math.abs(stones[i][1] - y)));
  const idx = [...Array(n).keys()], byFar = idx.slice().sort((a, b)=> far(b) - far(a));
  const perms = [byFar, byFar.slice().reverse(), idx].filter((o, i, all)=> all.findIndex(p=> p.join() === o.join()) === i);
  let best = null;
  const memo = new Map(), solve = (stone, pt, pl, fixed)=>{
    const k = stone + "|" + pt + "|" + pl + "|" + fixed.map(f=> f.join(".")).sort().join(";");
    if(!memo.has(k)) memo.set(k, Pz.solveStones(D, r, [stone], [pt], pl, 1500, fixed));
    return memo.get(k);
  };
  for(const order of perms){
    const at = stones.map(s=> s.slice()), free = plates.map(p=> p.slice()), moves = [], per = new Array(n).fill(0);
    let pl = player.slice(), ok = true;
    for(const b of order){
      let pick = null;
      free.forEach((pt, pi)=>{
        const fixed = at.filter((_, j)=> j !== b);
        if(fixed.some(([x, y])=> x === pt[0] && y === pt[1])) return;
        const sol = solve(at[b], pt, pl, fixed);
        if(sol && (!pick || sol.length < pick.sol.length)) pick = { sol, pi };
      });
      if(!pick){ ok = false; break; }
      pick.sol.forEach(m=> moves.push(Object.assign({ b }, m)));
      per[b] = pick.sol.length;
      const last = pick.sol[pick.sol.length - 1];
      if(last){ at[b] = [last.x + last.dx, last.y + last.dy]; pl = [last.x, last.y]; }
      free.splice(pick.pi, 1);
      if(best && moves.length >= best.moves.length){ ok = false; break; }
    }
    if(ok && (!best || moves.length < best.moves.length)) best = { moves, per };
  }
  return best;
};
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
    // too few candles left to light them all, even perfectly: say so now, not
    // after you've burnt the rest of them on a puzzle that can't come out
    const dead = pz.moves >= pz.budget || Pz.emberPar(pz) > pz.budget - pz.moves;
    if(dead){
      fail(G, r, pz.moves >= pz.budget ? "The braziers gutter out. Something in the dark noticed." : "Too few candles left to light them all. The braziers gutter out, and something in the dark noticed.");
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
  // a stone with no shoves left falls apart: the stones go back, whole, the chest
  // drops a tier, and the noise brings something
  if(b.hp !== undefined && b.hp <= 0){
    G.emit("crumble", { room:r.id, x:tx, y:ty });
    fail(G, r, "The stone crumbles to gravel. The others grind back where they started, and something heard it.");
    Pz.resetBlocks(G, r);
    G.ambush(r);
    pz.cd = G.t + 0.6;
    return;
  }
  G.D.set(tx, ty, T.FLOOR); G.D.set(nx, ny, T.PUSH); b.x = nx; b.y = ny; G.D.ver++;
  if(b.hp !== undefined) b.hp--;
  pz.cd = G.t + 0.22;
  G.emit("push", { room:r.id, x:tx, y:ty, nx, ny, hp:b.hp });
  if(pz.plates.every(p=> pz.blocks.some(o=> o.x === p.x && o.y === p.y))) G.solvePuzzle(r);
};
Pz.resetBlocks = function(G, r){
  const pz = r.puzzle, p = G.player;
  pz.blocks.forEach(b=> G.D.set(b.x, b.y, T.FLOOR));
  pz.blocks.forEach(b=>{ b.x = b.sx; b.y = b.sy; if(b.hp0 !== undefined) b.hp = b.hp0; G.D.set(b.x, b.y, T.PUSH); });
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
      if(pz.i < n){ const k = pz.seq[pz.i]; pz.items[k].glow = 0.55; G.emit("chorusSing", { room:r.id, i:k, note:pz.i }); pz.i++; pz.t = Math.max(0.42, 0.62 - G.floor*0.03); }
      else { pz.phase = "listen"; pz.i = 0; pz.on = -1; G.emit("chorusListen", { room:r.id, reverse:pz.reverse }); }
    }
    // singing back: step onto a mushroom (E on it works too). It sings once as you
    // arrive, and again only after you've stepped off
    if(pz.phase === "listen"){
      const p = G.player, at = pz.items.findIndex(it=> DG.dist(it.x, it.y, p.x, p.y) < 0.8);
      if(at < 0) pz.on = -1;
      else if(at !== pz.on){ pz.on = at; if(pz.items[at].cd <= G.t){ pz.items[at].cd = G.t + 0.18; sing(G, r, pz, at); } }
    }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
