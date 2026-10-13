/* The rules, tested under Node: dungeon generation, combat, rooms,
   puzzles, illusions, loot. Run with `npm test`. */
const test = require("node:test");
const assert = require("node:assert/strict");
const DG = require("./load.js");
const T = DG.TILE;

/* ---- helpers ---- */
function reach(D, opts){
  opts = opts || {};
  const W = D.w, seen = new Uint8Array(W*D.h), q = [];
  const sx = Math.floor(D.start.x), sy = Math.floor(D.start.y);
  q.push([sx, sy]); seen[sy*W + sx] = 1;
  while(q.length){
    const [x, y] = q.pop();
    for(const [dx, dy] of DG.DIRS4){
      const nx = x + dx, ny = y + dy, t = D.at(nx, ny);
      const ok = t === T.FLOOR || t === T.DOOR || (t === T.FAKE && !opts.noFakes);
      if(!ok || seen[ny*W + nx]) continue;
      seen[ny*W + nx] = 1; q.push([nx, ny]);
    }
  }
  return (x, y)=> !!seen[y*W + x];
}
function roomReached(D, r, seen){
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) if(D.at(x, y) === T.FLOOR && seen(x, y)) return true;
  return false;
}
function game(word, floor){ return new DG.Game({ seedWord:word || "TESTER", floor:floor || 1 }); }
function step(G, secs, input){ for(let i=0;i<Math.round(secs*60);i++){ G.update(1/60, input || {}); } return G.drain(); }
function addGoblin(G, room, x, y, type){ return G.spawnEnemy(room, { type:type || "grunt", x, y }); }
function readyAll(G){ G.enemies.forEach(e=> e.spawn = 0); }

/* ---- the dungeon ---- */
test("every floor of 150 seeds is fully reachable and has the right rooms", ()=>{
  for(let s=1; s<=150; s++){
    const floor = 1 + (s % 5), D = DG.Dungeon.generate(s*2654435761 >>> 0, floor);
    const seen = reach(D);
    const types = D.rooms.map(r=> r.type);
    for(const need of ["start", "boss", "treasure", "shop", "puzzle"]) assert.equal(types.filter(t=> t === need).length, 1, "seed " + s + " needs one " + need);
    D.rooms.forEach(r=> assert.ok(roomReached(D, r, seen), "seed " + s + ": room " + r.id + " (" + r.type + ") unreachable"));
    const boss = D.rooms.find(r=> r.type === "boss");
    assert.equal(boss.links.length, 1, "the boss room is a dead end");
    D.rooms.filter(r=> r.type === "combat").forEach(r=> assert.ok(r.waves.length && r.waves.every(w=> w.length), "combat rooms have goblins"));
  }
});

test("secret rooms are only reachable through an illusionary wall", ()=>{
  let n = 0;
  for(let s=1; s<=80; s++){
    const D = DG.Dungeon.generate(s*7919, 1 + (s % 5));
    const sec = D.rooms.find(r=> r.type === "secret"); if(!sec) continue;
    n++;
    assert.ok(roomReached(D, sec, reach(D)), "reachable with illusions");
    assert.ok(!roomReached(D, sec, reach(D, { noFakes:true })), "seed " + s + ": not reachable without");
  }
  assert.ok(n > 60, "most floors have a secret");
});

test("the same seed digs the same dungeon", ()=>{
  const a = DG.Dungeon.generate(424242, 3), b = DG.Dungeon.generate(424242, 3), c = DG.Dungeon.generate(424243, 3);
  assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles));
  assert.notDeepEqual(Array.from(a.tiles), Array.from(c.tiles));
});

test("the three-doors puzzle has exactly one honest door, and it's an illusion", ()=>{
  let n = 0;
  for(let s=1; s<=200 && n < 25; s++){
    const D = DG.Dungeon.generate(s*31337, 2), r = D.rooms.find(x=> x.type === "puzzle");
    if(r.puzzle.kind !== "doors") continue;
    n++;
    const doors = D.painted.filter(p=> p.room === r.id && p.puzzle !== undefined);
    assert.equal(doors.length, 3);
    assert.equal(doors.filter(p=> p.kind === "real").length, 1);
    const real = doors.find(p=> p.kind === "real");
    assert.equal(D.at(real.x, real.y), T.FAKE);
    assert.equal(doors.indexOf(real), r.puzzle.answer);
    assert.ok(r.props.some(p=> p.kind === "sign" && p.riddle && /HONEST GOBLIN/i.test(p.text)));
  }
  assert.ok(n >= 10, "doors puzzles turn up");
});

/* ---- rooms ---- */
test("walking into a goblin room shuts the doors; clearing it opens them", ()=>{
  const G = game("LOCKUP");
  const r = G.D.rooms.find(x=> x.type === "combat");
  const spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y;
  const ev = step(G, 0.1);
  assert.ok(ev.some(e=> e.type === "lock"));
  assert.ok(r.active && r.doors.every(id=> !G.D.doors[id].open));
  // kill every wave
  for(let k=0;k<6 && !r.cleared;k++){ readyAll(G); G.enemies.forEach(e=> G.damageEnemy(e, 1e6, {})); step(G, 1.2); }
  assert.ok(r.cleared, "room cleared");
  assert.ok(r.doors.every(id=> G.D.doors[id].open), "doors open again");
});

/* ---- combat ---- */
test("Plague Spreader: poison jumps from goblin to goblin", ()=>{
  const G = game("PLAGUE");
  const r = G.D.rooms.find(x=> x.type === "combat");
  G.player.x = 2; G.player.y = 2;   // well away, so nothing activates
  const a = addGoblin(G, r, r.cxw, r.cyw), b = addGoblin(G, r, r.cxw + 1.5, r.cyw), c = addGoblin(G, r, r.cxw + 9, r.cyw);
  readyAll(G); [a, b, c].forEach(e=>{ e.hp = e.maxHp = 1e5; e.speed = 0; });
  G.damageEnemy(a, 1, { el:"poison", power:1, fx:{ plagueSpread:1 } });
  assert.ok(a.st.poison.plague);
  assert.ok(!b.st.poison);
  step(G, 1.1);
  assert.ok(b.st.poison && b.st.poison.stacks > 0 && b.st.poison.plague, "the neighbour caught it");
  assert.ok(!c.st.poison, "the far one didn't");
});

test("without the rune, poison stays put", ()=>{
  const G = game("NOPLAGUE");
  const r = G.D.rooms.find(x=> x.type === "combat");
  G.player.x = 2; G.player.y = 2;
  const a = addGoblin(G, r, r.cxw, r.cyw), b = addGoblin(G, r, r.cxw + 1.5, r.cyw);
  readyAll(G); [a, b].forEach(e=>{ e.hp = e.maxHp = 1e5; e.speed = 0; });
  G.damageEnemy(a, 1, { el:"poison", power:1, fx:{} });
  step(G, 1.5);
  assert.ok(!b.st.poison || !b.st.poison.stacks);
});

test("five frost hits freeze a goblin", ()=>{
  const G = game("FROSTY");
  const r = G.D.rooms.find(x=> x.type === "combat");
  const e = addGoblin(G, r, r.cxw, r.cyw); readyAll(G); e.hp = e.maxHp = 1e5;
  for(let i=0;i<5;i++) G.damageEnemy(e, 1, { el:"frost", power:1, fx:{} });
  assert.ok(e.st.frozen > 0);
});

test("the wizard's shots hit goblins and the element applies", ()=>{
  const G = game("SHOOTY");
  const r = G.D.rooms.find(x=> x.type === "combat");
  const spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; step(G, 0.05);
  G.enemies.forEach(e=> e.dead = true); G.enemies = [];
  G.player.guns[0] = DG.Loot.makeGun("smg", "poison", 0, 1, []);
  const e = addGoblin(G, r, spot.x + 2.5, spot.y); readyAll(G); e.hp = e.maxHp = 1e5; e.speed = 0;
  e.ai.cd = 99;
  const ev = step(G, 0.5, { fire:true, ax:e.x, ay:e.y });
  assert.ok(ev.some(x=> x.type === "hit"));
  assert.ok(e.st.poison && e.st.poison.stacks > 0);
});

test("blinking makes you untouchable", ()=>{
  const G = game("BLINKY");
  G.player.blinkT = 0.1;
  const hp = G.player.hp;
  G.hurtPlayer(20, "test");
  assert.equal(G.player.hp, hp);
});

test("goblin bombs hurt goblins too", ()=>{
  const G = game("BOOMER");
  const r = G.D.rooms.find(x=> x.type === "combat");
  G.player.x = 2; G.player.y = 2;
  const e = addGoblin(G, r, r.cxw, r.cyw); readyAll(G);
  const hp = e.hp;
  G.explode(e.x, e.y, 1.7, 10, "e", {});
  assert.ok(e.hp < hp);
});

/* ---- illusions and paint ---- */
test("walking into a painted door: BONK", ()=>{
  const G = game("BONKER");
  const p0 = G.D.painted.find(p=> p.kind === "bonk");
  assert.ok(p0, "the start room always has one");
  G.player.x = p0.x + 0.5; G.player.y = p0.y + 1 + G.player.r + 0.02;
  const ev = step(G, 0.3, { my:-1 });
  assert.ok(ev.some(e=> e.type === "bonk"));
});

test("a shot through an illusionary wall reveals it", ()=>{
  for(let s=1; s<40; s++){
    const G = game("SECRET" + s);
    const f = G.D.fakes.find(x=> !x.puzzle); if(!f) continue;
    const [tx, ty] = f.tiles[1] || f.tiles[0];
    G.addBullet({ team:"p", x:tx + 0.5, y:ty + 0.5, vx:0.01, vy:0, r:0.1, dmg:1, life:0.5, pierce:0, bounces:0, el:"arcane", power:1, fx:{}, kind:"bolt" });
    const ev = step(G, 0.05);
    assert.ok(f.revealed && ev.some(e=> e.type === "illusion"));
    return;
  }
  assert.fail("no secret found");
});

test("lighting every brazier unlocks the chest", ()=>{
  for(let s=1; s<200; s++){
    const G = game("BRAZ" + s);
    const r = G.D.rooms.find(x=> x.type === "puzzle");
    if(r.puzzle.kind !== "braziers") continue;
    const chest = r.props.find(p=> p.kind === "chest");
    assert.ok(chest.locked);
    // brute-force the lights-out row: try every set of presses
    const start = r.puzzle.lit.slice();
    for(let mask=0; mask<32 && !r.puzzle.solved; mask++){
      r.puzzle.lit = start.slice();
      for(let i=0;i<5;i++) if(mask & (1 << i)) G.flipBrazier(r, i);
    }
    assert.ok(r.puzzle.solved, "solvable");
    assert.ok(!chest.locked);
    return;
  }
  assert.fail("no brazier puzzle");
});

/* ---- loot ---- */
test("deeper loot and rarer loot hit harder", ()=>{
  const g1 = DG.Loot.makeGun("smg", "poison", 0, 1, []), g4 = DG.Loot.makeGun("smg", "poison", 0, 4, []), r4 = DG.Loot.makeGun("smg", "poison", 3, 4, []);
  assert.ok(DG.Loot.dps(g4) > DG.Loot.dps(g1)*1.8);
  assert.ok(DG.Loot.dps(r4) > DG.Loot.dps(g4));
});

test("rarity rolls skew rarer as you go deeper", ()=>{
  const rng = DG.RNG(5);
  const avg = lvl=>{ let s = 0; for(let i=0;i<4000;i++) s += DG.Loot.rollRarity(rng, lvl); return s/4000; };
  assert.ok(avg(5) > avg(1) + 0.3);
});

test("socketing and unsocketing runes", ()=>{
  const G = game("RUNES");
  const g = G.gun(); g.runes = []; g.slots = 2;
  G.player.bag.push(DG.Loot.makeRune("plague"));
  assert.ok(G.socket(0, 0));
  assert.deepEqual(g.runes, ["plague"]);
  assert.equal(G.player.bag.length, 0);
  assert.ok(G.unsocket(0, 0));
  assert.equal(G.player.bag.length, 1);
});

test("the shop takes your gold", ()=>{
  const G = game("SHOPPER");
  const r = G.D.rooms.find(x=> x.type === "shop"), ped = r.props.find(p=> p.kind === "pedestal" && p.slot === 3);
  G.player.gold = 999; G.player.hp = 10;
  G.player.x = ped.x + 0.5; G.player.y = ped.y + 1.2;
  G.room = r;
  G.interact();
  assert.ok(ped.item.sold);
  assert.equal(G.player.gold, 999 - ped.item.price);
  assert.ok(G.player.hp > 10);
});

/* ---- the whole thing ---- */
test("a bot plays three runs past the first boss without anything going NaN", ()=>{
  for(const w of ["ALPHA", "BRAVO", "CHARLI"]){
    const G = game(w), bot = new DG.Bot(G);
    G.player.hp = G.player.maxHp = 1e6;
    for(let i=0; i<60*600 && G.floor < 2 && G.state === "play"; i++){
      G.update(1/60, bot.input(1/60));
      G.drain();
      const p = G.player;
      assert.ok(isFinite(p.x) && isFinite(p.y) && isFinite(p.mana), "player stays finite");
      for(const e of G.enemies) assert.ok(isFinite(e.x) && isFinite(e.y) && isFinite(e.hp), "goblins stay finite");
      assert.ok(!G.blocked(Math.floor(p.x), Math.floor(p.y), "player"), w + ": the wizard never ends up inside a wall");
    }
    assert.ok(G.floor >= 2, w + " reached floor 2 (got floor " + G.floor + ")");
  }
});

test("a painted door only bonks you when you walk into it (not from a room away)", ()=>{
  const G = game("BONKER");
  const p0 = G.D.painted.find(p=> p.kind === "bonk");
  G.player.x = p0.x + 0.5; G.player.y = p0.y - 6;      // same column, far to the north
  const ev = step(G, 0.3, { my:-1 });
  assert.ok(!ev.some(e=> e.type === "bonk"));
});
