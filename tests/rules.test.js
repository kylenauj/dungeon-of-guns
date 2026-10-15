/* The rules, tested under Node: dungeon generation, powerups and combos,
   reactions, Gribbus, rooms, puzzles, enemies, bosses. Run with `npm test`. */
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
      const ok = t === T.FLOOR || t === T.DOOR || t === T.WATER || (t === T.FAKE && !opts.noFakes);
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
function game(word, floor, items){ const G = new DG.Game({ seedWord:word || "TESTER", floor:floor || 1, items }); return G; }
function step(G, secs, input){ for(let i=0;i<Math.round(secs*60);i++){ if(G.state === "choose") G.choose(0); G.update(1/60, input || {}); } return G.drain(); }
function combatRoom(G){ return G.D.rooms.find(x=> x.type === "combat" && !x.jumbo) || G.D.rooms.find(x=> x.type === "combat"); }
function addEnemy(G, room, x, y, type){ const e = G.spawnEnemy(room, { type:type || "grunt", x, y }); e.spawn = 0; return e; }
function park(G){ G.player.x = G.D.start.x; G.player.y = G.D.start.y; }   // somewhere quiet

/* ================================================================== *
 *  The dungeon
 * ================================================================== */
test("every floor of 150 seeds is fully reachable and has the right rooms", ()=>{
  for(let s=1; s<=150; s++){
    const floor = 1 + (s % 5), D = DG.Dungeon.generate(s*2654435761 >>> 0, floor);
    const seen = reach(D);
    const types = D.rooms.map(r=> r.type);
    const need = ["start", "boss", "treasure", "shop", "puzzle", "pond"].concat(floor >= 2 ? ["altar"] : []);
    for(const t of need) assert.equal(types.filter(x=> x === t).length, 1, "seed " + s + " needs one " + t);
    D.rooms.forEach(r=> assert.ok(roomReached(D, r, seen), "seed " + s + ": room " + r.id + " (" + r.type + ") unreachable"));
    assert.equal(D.rooms.find(r=> r.type === "boss").links.length, 1, "the boss room is a dead end");
    D.rooms.filter(r=> r.type === "combat").forEach(r=> assert.ok(r.waves.length && r.waves.every(w=> w.length), "combat rooms have enemies"));
  }
});

test("jumbo rooms turn up, span several cells, and are big", ()=>{
  let n = 0;
  for(let s=1; s<=40; s++){
    const D = DG.Dungeon.generate(s*977, 1 + (s % 5));
    D.rooms.filter(r=> r.jumbo).forEach(r=>{ n++; assert.ok(r.cells.length >= 2); assert.ok((r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1) > 400, "jumbo is big"); });
  }
  assert.ok(n >= 40);
});

test("secret rooms are only reachable through an illusionary wall", ()=>{
  let n = 0;
  for(let s=1; s<=80; s++){
    const D = DG.Dungeon.generate(s*7919, 1 + (s % 5));
    const sec = D.rooms.find(r=> r.type === "secret"); if(!sec) continue;
    n++;
    assert.ok(roomReached(D, sec, reach(D)));
    assert.ok(!roomReached(D, sec, reach(D, { noFakes:true })), "seed " + s);
  }
  assert.ok(n > 60);
});

test("the same seed digs the same dungeon", ()=>{
  const a = DG.Dungeon.generate(424242, 3), b = DG.Dungeon.generate(424242, 3), c = DG.Dungeon.generate(424243, 3);
  assert.deepEqual(Array.from(a.tiles), Array.from(b.tiles));
  assert.notDeepEqual(Array.from(a.tiles), Array.from(c.tiles));
});

test("each floor uses its own bestiary", ()=>{
  for(let f=1; f<=5; f++){
    const D = DG.Dungeon.generate(1234 + f, f), allowed = Object.keys(DG.FLOORS[f - 1].enemies);
    D.rooms.forEach(r=> r.waves.forEach(w=> w.forEach(s=> assert.ok(allowed.indexOf(s.type) >= 0, "floor " + f + " spawned " + s.type))));
  }
});

/* ================================================================== *
 *  Powerups
 * ================================================================== */
test("every powerup, boon and duo builds a valid stat block", ()=>{
  for(const id in DG.ITEMS){
    const M = DG.Items.build({ [id]:1 }, [], []);
    assert.ok(isFinite(M.dmg) && isFinite(M.dmgMul) && M.maxDepth >= 1, id);
    const d = DG.ITEMS[id];
    assert.ok(d.name && d.desc && d.pools !== undefined && d.tier >= 0 && d.tier <= 4, id + " has its fields");
  }
  for(const id in DG.BOONS) assert.ok(DG.Items.build({}, [id], []), id);
  DG.DUOS.forEach(d=>{ assert.ok(DG.ITEMS[d.a] && DG.ITEMS[d.b], d.name); assert.ok(DG.Items.build({ [d.a]:1, [d.b]:1 }).duos.indexOf(d.name) >= 0); });
  assert.ok(Object.keys(DG.ITEMS).length >= 100, "a big pool");
  assert.ok(Object.values(DG.ITEMS).filter(d=> d.tier === 4).length >= 8, "godly ones");
});

test("costumes: every costume belongs to a real item and uses real dyes, parts and auras", ()=>{
  for(const id in DG.COSTUMES){
    const c = DG.COSTUMES[id];
    assert.ok(DG.ITEMS[id], id + " is an item");
    if(c.robe) assert.ok(DG.DYES.indexOf(c.robe) >= 0, id + " robe dye");
    if(c.cape) assert.ok(DG.DYES.indexOf(c.cape) >= 0, id + " cape dye");
    (c.parts || []).forEach(p=> assert.ok(DG.COSTUME_PARTS.indexOf(p) >= 0, id + " part " + p));
    if(c.aura) assert.ok(DG.AURAS.indexOf(c.aura) >= 0, id + " aura");
  }
  // a fire cape from the rounds, then the legendary dyes the whole robe; parts stack
  let L = DG.Items.costume(["emberrounds"]);
  assert.equal(L.cape, "fire"); assert.equal(L.robe, "arcane");
  L = DG.Items.costume(["emberrounds", "overgrowth", "blizzard"]);
  assert.equal(L.robe, "frost"); assert.equal(L.cape, "frost");
  assert.ok(L.parts.indexOf("vines") >= 0 && L.parts.indexOf("icecrown") >= 0);
  // a common dye can't paint over a legendary one
  assert.equal(DG.Items.costume(["inferno", "frostrounds"]).cape, "fire");
});

test("transformations: a third item from a set transforms Zippy (once), with a bonus and a new look", ()=>{
  DG.SETS.forEach(s=>{
    s.items.forEach(id=> assert.ok(DG.ITEMS[id], s.id + ": " + id + " is an item"));
    assert.equal(new Set(s.items).size, s.items.length, s.id + " has no repeats");
    assert.ok(s.items.length > s.need, s.id + " has more items than it needs");
    assert.ok(DG.DYES.indexOf(s.look.robe) >= 0 && s.look.parts.every(p=> DG.COSTUME_PARTS.indexOf(p) >= 0), s.id + " look");
  });
  const G = game("PYRO");
  G.giveItem("emberrounds"); G.giveItem("hotpotato");
  assert.equal(G.mods.sets.length, 0);
  const dmg = G.mods.dmg;
  G.giveItem("fireworks");
  const ev = G.drain();
  assert.ok(ev.some(e=> e.type === "transform" && e.id === "pyromancer"));
  assert.ok(G.mods.dmg > dmg && G.mods.special.wildfire, "the bonus applies");
  G.giveItem("trailblazer");
  assert.ok(!G.drain().some(e=> e.type === "transform"), "only once");
  const look = DG.Items.costume(Object.keys(G.player.items), G.mods.sets);
  assert.equal(look.robe, "fire"); assert.ok(look.parts.indexOf("horns") >= 0);
});

test("powerups stack", ()=>{
  const one = DG.Items.build({ spinach:1 }), two = DG.Items.build({ spinach:2 });
  assert.equal(two.dmg, one.dmg*2);
  assert.equal(DG.Items.build({ rubber:2 }).shot.bounces, 4);
});

test("item pools never offer the same thing twice in a run", ()=>{
  const G = game("POOLS");
  const seen = new Set();
  for(let i=0;i<60;i++){ const id = DG.Items.roll(G, "t"); assert.ok(!seen.has(id), "repeat: " + id); seen.add(id); }
});

test("the brief's combo: a ricochet + frost + Crystal Growth + Wispcraft shot grows icicles that release ice wisps", ()=>{
  const G = game("COMBO", 1, ["rubber", "frostrounds", "crystal", "wispcraft"]);
  const r = combatRoom(G); park(G);
  // fire one shot straight at a wall from inside the room
  G.player.x = r.x1 + 3.5; G.player.y = Math.floor(r.cyw) + 0.5;
  G.addShot({ x:r.x1 + 2.5, y:G.player.y, a:Math.PI, speed:12, r:0.15, dmg:5, range:20, bounces:G.mods.shot.bounces, els:G.shotEls(G.gun()), power:1, depth:0 });
  const ev = step(G, 0.5);
  assert.ok(ev.some(e=> e.type === "bounce"), "it bounced");
  assert.ok(G.hazards.some(h=> h.kind === "icicle") || ev.some(e=> e.type === "byproduct" && e.kind === "icicle"), "an icicle grew");
  assert.ok(G.allies.some(a=> a.kind === "wisp" && a.el === "frost"), "an ice wisp came out");
});

test("child shots can't trigger more payloads past the depth limit (and Recursion Engine raises it)", ()=>{
  const count = items=>{
    const G = game("DEPTH", 1, items);
    const r = combatRoom(G); park(G);
    for(let i=0;i<6;i++){ const e = addEnemy(G, r, r.cxw + (i % 3) - 1, r.cyw + Math.floor(i/3)); e.hp = e.maxHp = 1e6; e.speed = 0; }
    G.addShot({ x:r.cxw - 3, y:r.cyw, a:0, speed:10, r:0.2, dmg:1, range:10, els:["arcane"], power:1, depth:0 });
    let shots = 0;
    for(let i=0;i<90;i++){ G.update(1/60, {}); G.drain(); shots = Math.max(shots, G.bullets.length); }
    return shots;
  };
  const plain = count(["shrapnel", "shrapnel", "shrapnel", "shrapnel"]);
  assert.ok(plain < 80, "bounded (" + plain + ")");
  const deep = count(["shrapnel", "shrapnel", "shrapnel", "shrapnel", "recursion"]);
  assert.ok(deep >= plain, "recursion allows more (" + deep + " vs " + plain + ")");
});

test("Plague Spreader: poison jumps from goblin to goblin", ()=>{
  const G = game("PLAGUE", 1, ["plague"]); park(G);
  const r = combatRoom(G);
  const a = addEnemy(G, r, r.cxw, r.cyw), b = addEnemy(G, r, r.cxw + 1.5, r.cyw), c = addEnemy(G, r, r.cxw + 9, r.cyw);
  [a, b, c].forEach(e=>{ e.hp = e.maxHp = 1e5; e.speed = 0; });
  G.damageEnemy(a, 1, { els:["poison"], power:1 });
  assert.ok(a.st.poison.plague);
  step(G, 1.1);
  assert.ok(b.st.poison && b.st.poison.stacks > 0 && b.st.poison.plague, "the neighbour caught it");
  assert.ok(!c.st.poison, "the far one didn't");
});

test("without Plague Spreader, poison stays put", ()=>{
  const G = game("NOPLAGUE"); park(G);
  const r = combatRoom(G);
  const a = addEnemy(G, r, r.cxw, r.cyw), b = addEnemy(G, r, r.cxw + 1.5, r.cyw);
  [a, b].forEach(e=>{ e.hp = e.maxHp = 1e5; e.speed = 0; });
  G.damageEnemy(a, 1, { els:["poison"], power:1 });
  step(G, 1.5);
  assert.ok(!b.st.poison || !b.st.poison.stacks);
});

test("elemental reactions: fire + frost makes STEAM, frost + shock SUPERCONDUCTs", ()=>{
  const G = game("REACT"); park(G);
  const r = combatRoom(G);
  const e = addEnemy(G, r, r.cxw, r.cyw); e.hp = e.maxHp = 1e5;
  G.damageEnemy(e, 1, { els:["fire"], power:1 });
  G.damageEnemy(e, 1, { els:["frost"], power:1 });
  let ev = G.drain();
  assert.ok(ev.some(x=> x.type === "react" && x.name === "STEAM"));
  G.t += 1;
  G.damageEnemy(e, 1, { els:["frost"], power:1 });
  G.damageEnemy(e, 1, { els:["shock"], power:1 });
  ev = G.drain();
  assert.ok(ev.some(x=> x.type === "react" && x.name === "SUPERCONDUCT"));
});

test("five frost hits freeze a goblin", ()=>{
  const G = game("FROSTY"); park(G);
  const e = addEnemy(G, combatRoom(G), 0, 0); e.hp = e.maxHp = 1e5;
  for(let i=0;i<5;i++) G.damageEnemy(e, 1, { els:["frost"], power:1 });
  assert.ok(e.st.frozen > 0);
});

test("Zippy's shots hit goblins and carry the gun's element", ()=>{
  const G = game("SHOOTY");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; step(G, 0.05);
  G.enemies.forEach(e=> e.dead = true); G.enemies = [];
  G.player.guns[0] = DG.Loot.makeGun("smg", "poison", 0, 1, []); G.recalc();
  // somewhere with a clear line of fire
  const at = [[2.5, 0], [-2.5, 0], [0, 2.5], [0, -2.5], [1.8, 1.8], [-1.8, -1.8]].map(([dx, dy])=> ({ x:spot.x + dx, y:spot.y + dy }))
    .find(o=> G.D.at(Math.floor(o.x), Math.floor(o.y)) === T.FLOOR && G.los(spot.x, spot.y, o.x, o.y));
  const e = addEnemy(G, r, at.x, at.y); e.hp = e.maxHp = 1e5; e.speed = 0; e.ai.cd = 99;
  const ev = step(G, 0.5, { fire:true, ax:e.x, ay:e.y });
  assert.ok(ev.some(x=> x.type === "hit"));
  assert.ok(e.st.poison && e.st.poison.stacks > 0);
});

test("wards block a hit completely", ()=>{
  const G = game("WARDS");
  G.addWards(1);
  const hp = G.player.hp;
  G.hurtPlayer(30, "test");
  assert.equal(G.player.hp, hp); assert.equal(G.player.wards, 0);
});

test("blinking makes you untouchable", ()=>{
  const G = game("BLINKY");
  G.player.blinkT = 0.1;
  const hp = G.player.hp;
  G.hurtPlayer(20, "test");
  assert.equal(G.player.hp, hp);
});

test("goblin bombs hurt goblins too", ()=>{
  const G = game("BOOMER"); park(G);
  const e = addEnemy(G, combatRoom(G), 0, 0);
  e.x = 40; e.y = 40;
  const hp = e.hp;
  G.explode(e.x, e.y, 1.7, 10, "e", {});
  assert.ok(e.hp < hp);
});

test("an Event Horizon shot that runs out becomes a black hole", ()=>{
  const G = game("HOLE", 1, ["horizon"]); park(G);
  const r = combatRoom(G);
  G.addShot({ x:r.cxw, y:r.cyw, a:0, speed:4, r:0.15, dmg:5, range:1, els:["arcane"], power:1, depth:0 });
  step(G, 0.5);
  assert.ok(G.hazards.some(h=> h.kind === "blackhole"));
});

test("an ascension: Seeker Spirit turns a pistol into the Seeker Sidearm", ()=>{
  const G = game("ASCEND");
  G.giveItem("seeker");
  assert.equal(G.player.guns[0].name, "Seeker Sidearm");
  assert.ok(G.drain().some(e=> e.type === "ascend"));
});

/* ================================================================== *
 *  Zippy: levels, actives, the altar
 * ================================================================== */
test("levelling up offers three boons once the room is quiet, and picking one applies it", ()=>{
  const G = game("LEVELS"); park(G);
  G.gainXp(DG.PLAYER.xp(1));
  G.update(1/60, {});
  assert.equal(G.state, "choose");
  assert.equal(G.choice.options.length, 3);
  const id = G.choice.options[1];
  G.choose(1);
  assert.equal(G.state, "play");
  assert.ok(G.player.boons.indexOf(id) >= 0);
});

test("the Pocket Watch stops time", ()=>{
  const G = game("WATCH"); park(G);
  G.player.active = { id:"watch", charge:3, max:3 };
  const r = combatRoom(G), e = addEnemy(G, r, r.cxw, r.cyw);
  G.useActive({});
  const x = e.x, y = e.y;
  step(G, 1);
  assert.equal(e.x, x); assert.equal(e.y, y);
  assert.equal(G.player.active.charge, 0);
});

test("the cursed altar costs 20 max health", ()=>{
  const G = game("ALTAR", 2);
  const r = G.D.rooms.find(x=> x.type === "altar"), ped = r.props.find(p=> p.kind === "pedestal");
  const before = G.player.maxHp, id = ped.offer.id;
  G.player.x = ped.x + 0.5; G.player.y = ped.y + 1.2; G.room = r;
  G.interact();
  assert.equal(G.player.maxHp, before - 20 + (DG.ITEMS[id].stats && DG.ITEMS[id].stats.hp || 0));
  assert.ok(G.player.items[id]);
});

test("the shop takes your gold", ()=>{
  const G = game("SHOPPER");
  const r = G.D.rooms.find(x=> x.type === "shop"), ped = r.props.find(p=> p.kind === "pedestal" && p.offer.kind === "heal");
  G.player.gold = 999; G.player.hp = 10;
  G.player.x = ped.x + 0.5; G.player.y = ped.y + 1.2; G.room = r;
  G.interact();
  assert.ok(ped.taken);
  assert.equal(G.player.gold, 999 - ped.offer.price);
  assert.ok(G.player.hp > 10);
});

test("choosing one treasure pedestal sinks the other", ()=>{
  const G = game("TREASURE", 3);
  const r = G.D.rooms.find(x=> x.type === "treasure"), peds = r.props.filter(p=> p.kind === "pedestal");
  assert.equal(peds.length, 2);
  G.player.x = peds[0].x + 0.5; G.player.y = peds[0].y + 1.2; G.room = r;
  G.interact();
  assert.ok(peds[0].taken && peds[1].sunk);
});

/* ================================================================== *
 *  Gribbus
 * ================================================================== */
test("Gribbus hops over and licks goblins on his own", ()=>{
  const G = game("FROGGY");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
  G.gribbus.x = spot.x - 1; G.gribbus.y = spot.y;
  const e = addEnemy(G, r, spot.x - 3, spot.y); e.hp = e.maxHp = 1e5; e.speed = 0; e.ai.cd = 99;
  const ev = step(G, 3);
  assert.ok(ev.some(x=> x.type === "lick" || x.type === "spit"), "he attacked");
  assert.ok(e.hp < 1e5, "it hurt");
});

test("a frog pond: one lily pad teaches Gribbus a trick, the others sink", ()=>{
  const G = game("POND");
  const r = G.D.rooms.find(x=> x.type === "pond");
  DG.Gribbus.offerPond(G, r);
  const pads = r.props.filter(p=> p.kind === "lilypad");
  assert.equal(pads.length, 3);
  assert.ok(pads.every(p=> p.buff));
  DG.Gribbus.choosePad(G, pads[1]);
  assert.ok(G.gribbus.buffs.indexOf(pads[1].buff) >= 0);
  assert.ok(pads[0].sunk && pads[2].sunk);
});

test("golden flies unlock locked Gribbus buffs at ponds", ()=>{
  const locked = Object.keys(DG.FROG_BUFFS).filter(id=> DG.FROG_BUFFS[id].locked);
  let seenLocked = false;
  for(let s=0; s<40 && !seenLocked; s++){
    const G = new DG.Game({ seedWord:"FLIES" + s, meta:{ flies:99, unlocked:{} } });
    const r = G.D.rooms.find(x=> x.type === "pond");
    DG.Gribbus.offerPond(G, r);
    if(r.props.some(p=> p.kind === "lilypad" && locked.indexOf(p.buff) >= 0)) seenLocked = true;
  }
  assert.ok(seenLocked);
  for(let s=0; s<40; s++){
    const G = new DG.Game({ seedWord:"NOFLY" + s, meta:{ flies:0, unlocked:{} } });
    const r = G.D.rooms.find(x=> x.type === "pond");
    DG.Gribbus.offerPond(G, r);
    assert.ok(!r.props.some(p=> p.kind === "lilypad" && locked.indexOf(p.buff) >= 0), "locked ones stay locked");
  }
});

/* ================================================================== *
 *  Rooms, illusions, paint
 * ================================================================== */
test("walking into a goblin room shuts the doors; clearing it opens them", ()=>{
  const G = game("LOCKUP");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y;
  const ev = step(G, 0.1);
  assert.ok(ev.some(e=> e.type === "lock"));
  assert.ok(r.active && r.doors.every(id=> !G.D.doors[id].open));
  for(let k=0;k<8 && !r.cleared;k++){ G.enemies.forEach(e=>{ e.spawn = 0; e.untargetable = false; G.damageEnemy(e, 1e7, {}); }); step(G, 1.2); }
  assert.ok(r.cleared);
  assert.ok(r.doors.every(id=> G.D.doors[id].open));
});

test("walking into a painted door: BONK (but not from a room away)", ()=>{
  const G = game("BONKER");
  const p0 = G.D.painted.find(p=> p.kind === "bonk");
  G.player.x = p0.x + 0.5; G.player.y = p0.y + 1 + G.player.r + 0.02;
  assert.ok(step(G, 0.3, { my:-1 }).some(e=> e.type === "bonk"));
  const G2 = game("BONKER");
  G2.player.x = p0.x + 0.5; G2.player.y = p0.y - 6;
  assert.ok(!step(G2, 0.3, { my:-1 }).some(e=> e.type === "bonk"));
});

test("a shot through an illusionary wall reveals it", ()=>{
  for(let s=1; s<40; s++){
    const G = game("SECRET" + s);
    const f = G.D.fakes.find(x=> !x.puzzle); if(!f) continue;
    const [tx, ty] = f.tiles[1] || f.tiles[0];
    G.addShot({ x:tx + 0.5, y:ty + 0.5, a:0, speed:0.1, r:0.1, dmg:1, range:1, els:["arcane"], power:1, depth:0 });
    const ev = step(G, 0.05);
    assert.ok(f.revealed && ev.some(e=> e.type === "illusion"));
    return;
  }
  assert.fail("no secret found");
});

test("a secret corridor stays hidden (a real false, not undefined) until its illusion is found", ()=>{
  for(let s=1; s<40; s++){
    const G = game("SECRET" + s);
    const f = G.D.fakes.find(x=> !x.puzzle); if(!f) continue;
    const c = G.D.corridors[f.corridor];
    G.D.rooms.forEach(r=>{ if(r.type !== "secret") r.seen = true; });
    assert.strictEqual(DG.Dungeon.corridorKnown(G.D, c), false);
    G.revealFake(f.tiles[0][0], f.tiles[0][1]);
    assert.strictEqual(DG.Dungeon.corridorKnown(G.D, c), true);
    return;
  }
  assert.fail("no secret found");
});

test("Gribbus can't push puzzle blocks or hop through an illusionary wall", ()=>{
  const { G, r } = puzzleRoom("push", 1), pz = r.puzzle, b = pz.blocks[0];
  const before = pz.blocks.map(o=> o.x + "," + o.y).join(" ");
  const fr = G.gribbus;
  G.player.x = b.x - 2.5; G.player.y = b.y + 0.5;
  fr.x = b.x - 0.7; fr.y = b.y + 0.5;
  // make him hop straight through the block, again and again
  for(let i=0;i<120;i++){ fr.hopT = fr.hopDur = 0.3; fr.sx = fr.x; fr.sy = fr.y; fr.tx = b.x + 2.5; fr.ty = b.y + 0.5; G.update(1/60, {}); G.drain(); }
  assert.equal(pz.blocks.map(o=> o.x + "," + o.y).join(" "), before, "the blocks never moved");
  for(let s=1; s<40; s++){
    const H = game("SECRET" + s), f = H.D.fakes.find(x=> !x.puzzle); if(!f) continue;
    const [tx, ty] = f.tiles[1], fg = H.gribbus;
    H.player.x = tx + 0.5; H.player.y = ty + 0.5; park(H);
    fg.x = tx + 0.5 - (H.D.at(tx - 1, ty) === T.FLOOR ? 1 : 0); fg.y = ty + 0.5 - (H.D.at(tx, ty - 1) === T.FLOOR ? 1 : 0);
    H.move(fg, (tx + 0.5 - fg.x)*2, (ty + 0.5 - fg.y)*2, "frog");
    assert.ok(!f.revealed && H.D.at(Math.floor(fg.x), Math.floor(fg.y)) !== T.FAKE, "an illusion stops a frog");
    return;
  }
});

test("Gribbus left outside a room that locks poofs back to Zippy", ()=>{
  const G = game("FROGGATE");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.god = true;
  const d = G.D.doors[r.doors[0]];
  G.gribbus.x = d.x + (d.axis === "v" ? (d.x < r.cxw ? -2 : 2) : 0); G.gribbus.y = d.y + (d.axis === "h" ? (d.y < r.cyw ? -2 : 2) : 0);
  G.room = r; G.activate ? G.activate(r) : (r.active = true); G.setDoors(r, false);
  const ev = step(G, 0.5);
  assert.ok(G.inRoom(r, G.gribbus.x, G.gribbus.y), "he's inside with Zippy");
  assert.ok(ev.some(e=> e.type === "frogPoof"));
});

test("Gribbus hunts across a big room, round the furniture, without poofing back", ()=>{
  for(let s=1; s<40; s++){
    const G = game("ROAMER" + s), r = G.D.rooms.find(x=> x.type === "combat" && x.x2 - x.x1 >= 16 && (x.style === "pillars" || x.style === "crates"));
    if(!r) continue;
    G.god = true; G.room = r; r.active = true;
    const a = G.freeSpot(r, r.x1 + 2.5, r.cyw), b = G.freeSpot(r, r.x2 - 1.5, r.cyw);
    if(!a || !b || DG.dist(a.x, a.y, b.x, b.y) < 12) continue;
    G.player.x = a.x; G.player.y = a.y; G.gribbus.x = a.x + 0.6; G.gribbus.y = a.y;
    G.enemies = [];
    const e = addEnemy(G, r, b.x, b.y); e.hp = e.maxHp = 1e5; e.speed = 0; e.def = Object.assign({}, e.def, { speed:0 }); e.update = null;
    let poofs = 0;
    for(let i=0; i<60*14; i++){
      e.x = b.x; e.y = b.y; e.cd = 99;
      G.update(1/60, {});
      poofs += G.drain().filter(x=> x.type === "frogPoof").length;
      G.player.x = a.x; G.player.y = a.y;
    }
    assert.equal(poofs, 0, "he was never pulled back to Zippy");
    assert.ok(DG.dist(G.gribbus.x, G.gribbus.y, b.x, b.y) < 3.5, "he went all the way over to it");
    assert.ok(e.hp < 1e5, "and got stuck in");
    return;
  }
  assert.fail("no big furnished room found");
});

test("Gribbus finds his own way back to Zippy round a corner", ()=>{
  // a quiet room (no fight starts), Zippy in one corner, Gribbus in the far one
  const G = game("HOMING"), r = G.D.rooms.find(x=> x.type === "start"), f = G.gribbus;
  const a = G.freeSpot(r, r.x1 + 1.5, r.y1 + 1.5), b = G.freeSpot(r, r.x2 - 0.5, r.y2 - 0.5);
  G.player.x = a.x; G.player.y = a.y; f.x = b.x; f.y = b.y;
  let poofs = 0;
  for(let i=0; i<60*6; i++){ G.update(1/60, {}); poofs += G.drain().filter(x=> x.type === "frogPoof").length; }
  assert.equal(poofs, 0);
  assert.ok(DG.dist(f.x, f.y, G.player.x, G.player.y) < 2.5, "he hopped back on his own");
});

/* ================================================================== *
 *  The odd ones, and keeping power in check
 * ================================================================== */
function range(word, items){
  const G = game(word, 2, items);
  const r = combatRoom(G); park(G);
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) G.D.set(x, y, T.FLOOR);
  G.player.x = r.x1 + 2.5; G.player.y = Math.floor(r.cyw) + 0.5; G.room = r; r.active = true; G.god = true;
  return { G, r };
}
function dummy(G, r, x, y, type){ const e = addEnemy(G, r, x, y, type); e.hp = e.maxHp = 1e6; e.speed = 0; e.ai.cd = 99; return e; }

test("Rubber Chicken: a confused goblin stumbles about and clobbers its friends", ()=>{
  const { G, r } = range("CHICKEN", ["chicken"]);
  const a = dummy(G, r, r.x1 + 8.5, G.player.y), b = dummy(G, r, r.x1 + 9.1, G.player.y);
  a.speed = 2; G.payload({ do:"status", st:"confused", t:3 }, { x:a.x, y:a.y, enemy:a, depth:0 });
  const ev = step(G, 2.5);
  assert.ok(a.st.confused > 0 || ev.some(e=> e.type === "status"));
  assert.ok(b.hp < b.maxHp, "it hit its friend");
});
test("Shrink Ray shrinks goblins (bosses barely)", ()=>{
  const { G, r } = range("SHRINK", ["shrinkray"]);
  const e = dummy(G, r, r.x1 + 6.5, G.player.y), r0 = e.r;
  for(let i=0;i<20;i++) G.payload({ do:"shrink" }, { enemy:e, x:e.x, y:e.y, depth:0 });
  assert.ok(Math.abs(e.r - r0*0.5) < 1e-6, "half size");
});
test("Sticky Bombs go off a second later; Portal Pockets send shots out the far wall", ()=>{
  const { G, r } = range("STICKY", ["portal"]);
  const e = dummy(G, r, r.x1 + 6.5, G.player.y);
  G.payload({ do:"stickybomb", dmg:1, r:1.5 }, { enemy:e, x:e.x, y:e.y, depth:0, els:["fire"] });
  let ev = step(G, 1.1);
  assert.ok(ev.some(x=> x.type === "boom") && e.hp < e.maxHp, "boom");
  G.enemies.forEach(o=> o.dead = true);
  const b = G.addShot({ x:r.x1 + 1.5, y:G.player.y, a:Math.PI, speed:12, r:0.1, dmg:1, range:30, els:["arcane"], power:1, depth:0 });
  ev = step(G, 0.3);
  assert.ok(ev.some(x=> x.type === "portal"), "through a portal");
  assert.ok(b.x > r.cxw, "out of the east wall");
});
test("Lucky Penny coins pay out; Loaded Dice roll your damage when a room locks", ()=>{
  const { G, r } = range("PENNY", ["penny", "dice"]);
  G.mods.special.penny = 20;
  const e = addEnemy(G, r, r.x1 + 5.5, G.player.y); e.ai.cd = 99; e.speed = 0; e.hp = 1;
  G.fireVolley(G.player.x, G.player.y, 0, G.gun(), G.gunStats(), { from:"player" });
  assert.ok(G.bullets.some(b=> b.coin), "a coin");
  const ev = step(G, 0.6);
  assert.ok(ev.some(x=> x.type === "jackpot"));
  G.payload({ do:"dice" }, { x:0, y:0, depth:0 });
  assert.ok([0.6, 0.8, 1, 1.2, 1.5, 1.8].indexOf(G.player.diceMul) >= 0);
});
test("bees, ghouls, the hat, the whistle, the frog cannon and the pocket black hole all work", ()=>{
  const { G, r } = range("ODDS", ["beehive", "napkin"]);
  const e = dummy(G, r, r.x1 + 5.5, G.player.y), f = dummy(G, r, r.x1 + 6.5, G.player.y + 1);
  G.payload({ do:"bee", n:3 }, { x:e.x - 1, y:e.y, depth:0 });
  G.payload({ do:"ghoul" }, { x:e.x - 1, y:e.y, depth:0, enemy:f });
  assert.equal(G.allies.filter(a=> a.kind === "bee").length, 3);
  assert.equal(G.allies.filter(a=> a.kind === "ghoul").length, 1);
  step(G, 2);
  assert.ok(e.hp < e.maxHp && e.st.poison && e.st.poison.stacks > 0, "stung");
  ["hat", "whistle", "cannon", "discoball", "pockethole"].forEach(id=>{
    G.giveActive(id); G.player.active.charge = G.player.active.max;
    const hp = e.hp; G.player.aimX = e.x; G.player.aimY = e.y;
    G.useActive({}); const ev = step(G, 1.2);
    assert.ok(ev.some(x=> x.type === "active"), id);
    assert.ok(isFinite(e.hp) && isFinite(G.gribbus.x), id + " stays sane");
    if(id === "whistle") assert.ok(e.st.confused > 0 || f.st.confused > 0, "confused");
    if(id === "discoball") assert.equal(G.shotEls(G.gun()).length, 5);
  });
});
test("Comet Cape: blinking through goblins hits them", ()=>{
  const { G, r } = range("COMET", ["comet"]);
  const e = dummy(G, r, G.player.x + 1.5, G.player.y);
  step(G, 0.05, { blink:true, mx:1, my:0 });
  step(G, 0.4);
  assert.ok(e.hp < e.maxHp);
});
test("the screen never holds more than 160 of Zippy's shots, whatever he's carrying", ()=>{
  const { G, r } = range("CAP", ["kaleido", "triple", "twinshot", "hydra", "echo", "burstfire", "shrapnel", "shatterglass", "recursion", "infinity", "caffeine", "coffee"]);
  for(let i=0;i<4;i++) dummy(G, r, r.x1 + 9.5, G.player.y + i - 1.5);
  let peak = 0;
  for(let i=0;i<60*6;i++){ G.update(1/60, { fire:true, ax:r.x1 + 9.5, ay:G.player.y }); G.drain(); if(G.state === "choose") G.choose(0); peak = Math.max(peak, G.bullets.filter(b=> b.team === "p").length); }
  assert.ok(peak <= 160, "peak " + peak);
  assert.ok(peak > 60, "but plenty of them (" + peak + ")");
});
test("reactions share a budget: a packed room can't set off a blast per goblin every frame", ()=>{
  const { G, r } = range("REACT", []);
  const es = []; for(let i=0;i<12;i++) es.push(dummy(G, r, r.x1 + 7 + (i % 4)*0.6, G.player.y + Math.floor(i/4)*0.6 - 0.6));
  let reacts = 0;
  for(let i=0;i<60*4;i++){ es.forEach(e=>{ G.applyBurn(e, 1, 3); e.st.chill = 2; G.react(e); }); G.update(1/60, {}); reacts += G.drain().filter(x=> x.type === "react").length; }
  assert.ok(reacts <= 4 + 2.2*4 + 1, "reactions " + reacts);
  assert.ok(reacts >= 8, "but they still happen (" + reacts + ")");
});

test("the Gloom: a Bloater bursts into spores that hurt Zippy, a Blight Husk shrugs off a quarter of every hit", ()=>{
  const G = game("GLOOMY", 5);
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true;
  const b = addEnemy(G, r, spot.x + 0.6, spot.y, "bloater"); b.ai.cd = 99;
  G.damageEnemy(b, 1e6, {});
  const hp = G.player.hp; G.player.iframes = 0;
  step(G, 1.2);
  assert.ok(G.player.hp < hp, "the spores hurt");
  const h = addEnemy(G, r, spot.x + 3, spot.y, "husk"), h0 = h.hp;
  G.damageEnemy(h, 20, {});
  assert.ok(Math.abs((h0 - h.hp) - 15) < 1e-6, "armour takes a quarter");
  assert.equal(DG.FLOORS[0].gloom, 0); assert.equal(DG.FLOORS[4].gloom, 1);
  DG.FLOORS.forEach((f, i)=> i && assert.ok(f.gloom > DG.FLOORS[i - 1].gloom, "the Gloom only grows"));
});

test("breakables break, and explosive barrels explode", ()=>{
  for(let s=1; s<60; s++){
    const G = game("POTS" + s);
    const x = G.D.breakables.find(b=> b.kind === "xbarrel"), pot = G.D.breakables.find(b=> b.kind !== "xbarrel");
    if(!x || !pot) continue;
    G.hitBreakable(pot.x, pot.y, 1000);
    assert.equal(G.D.at(pot.x, pot.y), T.FLOOR);
    G.hitBreakable(x.x, x.y, 1000);
    assert.ok(G.drain().some(e=> e.type === "boom"));
    return;
  }
  assert.fail("no barrels found");
});

/* ================================================================== *
 *  Puzzles: every kind is solvable
 * ================================================================== */
function puzzleRoom(kind, floor){
  for(let s=1; s<400; s++){
    const G = game("PZ" + kind + s, floor || 1);
    const r = G.D.rooms.find(x=> x.type === "puzzle");
    if(r.puzzle.kind === kind){ G.room = r; return { G, r }; }
  }
  throw new Error("no " + kind + " puzzle");
}
test("the three-doors puzzle has exactly one honest door, and it's an illusion", ()=>{
  const { G, r } = puzzleRoom("doors", 2);
  const doors = G.D.painted.filter(p=> p.room === r.id && p.puzzle !== undefined);
  assert.equal(doors.length, 3);
  const real = doors.find(p=> p.kind === "real");
  assert.equal(G.D.at(real.x, real.y), T.FAKE);
  assert.equal(doors.indexOf(real), r.puzzle.answer);
  assert.ok(r.props.some(p=> p.kind === "sign" && p.riddle && /HONEST GOBLIN/i.test(p.text)));
});
test("braziers (row and grid) can always be lit", ()=>{
  [1, 3].forEach(f=>{
    const { G, r } = puzzleRoom("braziers", f), pz = r.puzzle, n = pz.lit.length, start = pz.lit.slice();
    let solved = false;
    for(let mask=0; mask<(1 << n) && !solved; mask++){
      pz.lit = start.slice();
      for(let i=0;i<n;i++) if(mask & (1 << i)) DG.Puzzles.flipBraziers(pz, i);
      solved = pz.lit.every(v=> v);
    }
    assert.ok(solved, "floor " + f);
  });
});
test("push blocks: pushing each block straight along its line solves it", ()=>{
  const { G, r } = puzzleRoom("push", 1), pz = r.puzzle;
  pz.blocks.forEach((b, i)=>{
    const p = pz.plates[i], dx = Math.sign(p.x - b.x), dy = Math.sign(p.y - b.y);
    let guard = 10;
    while((b.x !== p.x || b.y !== p.y) && guard--){ pz.cd = 0; DG.Puzzles.push(G, b.x, b.y, dx, dy); }
  });
  assert.ok(pz.solved);
  assert.ok(!r.props.find(p=> p.kind === "chest").locked);
});
test("statues can always be turned to face the eye", ()=>{
  const { r } = puzzleRoom("statues", 3), pz = r.puzzle, start = pz.face.slice();
  let ok = false;
  for(let m=0; m<256 && !ok; m++){
    pz.face = start.slice();
    for(let i=0;i<4;i++) for(let k=0;k<((m >> (i*2)) & 3);k++) DG.Puzzles.turnStatue(pz, i, 1);
    ok = pz.face.every((f, i)=> f === pz.want[i]);
  }
  assert.ok(ok);
});
test("the shroom chorus: repeat what they sing", ()=>{
  const { G, r } = puzzleRoom("chorus", 1), pz = r.puzzle;
  for(let round=0; round<pz.rounds; round++){
    pz.phase = "listen"; pz.i = 0;
    for(let k=0;k<pz.len + round;k++){ const it = pz.items[pz.seq[k]]; it.cd = 0; DG.Puzzles.shot(G, { x:it.x, y:it.y, r:0.1 }); }
  }
  assert.ok(pz.solved);
});

/* ================================================================== *
 *  Enemies and bosses
 * ================================================================== */
test("every enemy type spawns, acts and dies without anything going NaN", ()=>{
  for(const type of Object.keys(DG.ENEMIES)){
    const G = game("BEAST" + type, 3);
    const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
    G.player.x = spot.x; G.player.y = spot.y; G.god = true; step(G, 0.1);
    G.enemies.forEach(e=> e.dead = true); G.enemies = [];
    const e = addEnemy(G, r, spot.x + 3, spot.y, type);
    for(let i=0;i<60*8;i++){ G.update(1/60, { ax:e.x, ay:e.y }); G.drain(); assert.ok(isFinite(e.x) && isFinite(e.y) && isFinite(e.hp), type); }
    e.untargetable = false; e.spawn = 0; e.invuln = false; e.hidden = false;
    G.damageEnemy(e, 1e7, {});
    assert.ok(e.dead, type + " can die");
  }
});

test("every boss fights for 25 seconds, stays in its room, and can be killed", ()=>{
  for(let f=1; f<=5; f++){
    const G = game("BOSS" + f, f);
    const r = G.D.rooms.find(x=> x.type === "boss");
    G.player.x = r.cxw; G.player.y = r.y2 - 0.5; G.god = true;
    step(G, 1.6);
    const b = G.bossRef;
    assert.ok(b && b.type === DG.FLOORS[f - 1].boss, "floor " + f + " boss");
    for(let i=0;i<60*25;i++){
      G.update(1/60, { mx:Math.sin(i/40), my:Math.cos(i/50)*0.5, ax:b.x, ay:b.y, fire:true });
      G.drain();
      for(const e of G.enemies) if(!e.dead && !e.airborne) assert.ok(G.inRoom(r, e.x, e.y), e.type + " left the boss room");
    }
    b.invuln = false; b.untargetable = false;
    G.damageEnemy(b, 1e8, {});
    assert.ok(b.dead && G.portal, "floor " + f + ": boss down, portal open");
  }
});

/* ---- regression: enemies escaping through walls (rooms stayed locked forever) ---- */
test("a big body shoved into a wall can back out but never goes through it", ()=>{
  const G = game("WALLS");
  const r = combatRoom(G);
  let wy = r.y1 + 2;
  while(wy < r.y2 - 1 && [-2, -1, 0, 1, 2].some(k=> G.D.at(r.x1 - 1, wy + k) !== T.SOLID)) wy++;
  assert.ok(wy < r.y2 - 1, "found solid wall");
  const e = { x:r.x1 + 0.3, y:wy + 0.5, r:0.6 };
  for(let i=0;i<200;i++) G.move(e, -0.15, (i % 3 - 1)*0.01, "enemy");
  assert.ok(e.x >= r.x1 + 0.3 - 1e-6);
  G.move(e, 2, 0, "enemy");
  assert.ok(e.x > r.x1 + 0.6);
});

test("a goblin that somehow leaves its locked room is pulled back in", ()=>{
  const G = game("LEASH");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; step(G, 0.1);
  G.enemies.forEach(e=> e.spawn = 0);
  const e = G.enemies[0];
  e.x = -500; e.y = -500;
  step(G, 1/60);
  assert.ok(G.inRoom(r, e.x, e.y));
});

/* ================================================================== *
 *  The whole thing
 * ================================================================== */
test("a bot plays three runs past floor 2, with nobody ending up in a wall", ()=>{
  for(const w of ["ALPHA", "BRAVO", "CHARLI"]){
    const G = game(w), bot = new DG.Bot(G);
    G.god = true;
    for(let i=0; i<60*700 && G.floor < 3 && (G.state === "play" || G.state === "choose"); i++){
      if(G.state === "choose") G.choose(0);
      G.update(1/60, bot.input(1/60));
      G.drain();
      const p = G.player;
      assert.ok(isFinite(p.x) && isFinite(p.y) && isFinite(p.mana));
      assert.ok(!G.blocked(Math.floor(p.x), Math.floor(p.y), "player"), w + ": Zippy inside a wall");
      for(const e of G.enemies){
        if(e.dead || e.airborne || e.phases || e.spawn > 0) continue;
        const t = G.D.at(Math.floor(e.x), Math.floor(e.y));
        assert.ok(t !== T.SOLID && t !== T.BLOCK && t !== T.BREAK, w + ": " + e.type + " in a wall");
      }
    }
    assert.ok(G.floor >= 3, w + " reached floor 3 (got " + G.floor + ")");
  }
});

test("blocks standing in a 2x2 square are drawn as one big obstacle", ()=>{
  let squares = 0;
  for(let s=1; s<=30; s++){
    const D = game("CLUMP" + s).D, C = DG.Dungeon.clumps(D), seen = new Set();
    C.list.forEach((c, i)=>{
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy])=>{
        const x = c.x + dx, y = c.y + dy, k = y*D.w + x;
        assert.equal(D.at(x, y), T.BLOCK, "every tile of a big obstacle is a block");
        assert.equal(C.of[k], i, "and knows which obstacle it is part of");
        assert.ok(!seen.has(k), "no block is part of two big obstacles"); seen.add(k);
      });
    });
    // a lone block is never claimed
    for(let k=0; k<D.w*D.h; k++) if(C.of[k] >= 0) assert.ok(seen.has(k));
    squares += C.list.length;
  }
  assert.ok(squares > 0, "big pillars do turn up");
});

/* ================================================================== *
 *  The grim items, and builds that don't repeat
 * ================================================================== */
test("every item is well formed: real payloads, real tiers and pools, a description", ()=>{
  const PAYLOADS = ["byproduct", "shards", "wisp", "burst", "chain", "nova", "ring", "tadpole", "heal", "mana", "ward", "gold", "blackhole",
    "status", "shrink", "stickybomb", "gum", "bee", "ghoul", "hiccup", "shove", "candy", "dice", "toll"];
  const check = (d, who)=>{ for(const k in d.on || {}) d.on[k].forEach(pl=> assert.ok(PAYLOADS.indexOf(pl.do) >= 0, who + ": unknown payload " + pl.do)); };
  for(const id in DG.ITEMS){
    const d = DG.ITEMS[id];
    assert.ok(d.name && d.desc, id + " has a name and a description");
    assert.ok(d.tier >= 0 && d.tier <= 4, id + " tier");
    assert.ok(/^[tsbxa]+$/.test(d.pools), id + " pools");
    check(d, id);
  }
  DG.DUOS.forEach(d=>{ assert.ok(DG.ITEMS[d.a] && DG.ITEMS[d.b], d.name + " pairs real items"); check(d, d.name); });
  DG.SETS.forEach(s=> check(s, s.name));
  assert.ok(Object.keys(DG.ITEMS).length >= 160, "a deep pool");
});

test("every active item goes off without a hitch", ()=>{
  for(const id in DG.ACTIVES){
    const G = game("ACT" + id), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
    G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
    addEnemy(G, r, spot.x + 2, spot.y);
    G.player.active = { id, charge:9, max:1 };
    G.useActive();
    step(G, 1);
  }
});

test("Hollowing grows with every kill in a room and fades when it's clear", ()=>{
  const G = game("HOLLOW"), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
  G.giveItem("hollowing", true);
  const base = G.dmgBonus();
  for(let i=0;i<4;i++){ const e = addEnemy(G, r, spot.x + 2, spot.y); G.killEnemy(e, {}); }
  assert.ok(Math.abs(G.dmgBonus()/base - 1.2) < 1e-9, "+5% a kill");
  for(let i=0;i<20;i++){ const e = addEnemy(G, r, spot.x + 2, spot.y); G.killEnemy(e, {}); }
  assert.ok(Math.abs(G.dmgBonus()/base - 1.6) < 1e-9, "capped at +60%");
  G.clearRoom(r);
  assert.equal(G.player.hollow, 0, "gone once the room is clear");
});

test("the Executioner's Axe finishes goblins below 15%, but never a boss", ()=>{
  const G = game("AXE"), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
  G.giveItem("executioner", true);
  const e = addEnemy(G, r, spot.x + 2, spot.y); e.hp = e.maxHp = 100;
  G.damageEnemy(e, 80, {}); assert.ok(!e.dead, "20% left: still standing");
  G.damageEnemy(e, 6, {}); assert.ok(e.dead, "14% left: executed");
  const b = addEnemy(G, r, spot.x + 2, spot.y); b.boss = true; b.hp = b.maxHp = 100;
  G.damageEnemy(b, 90, {}); assert.ok(!b.dead, "bosses are spared");
});

test("the Darksign brings you back once a floor", ()=>{
  const G = game("DARKSIGN"); G.giveItem("darksign", true);
  const p = G.player;
  G.hurtPlayer(9999, "test", true);
  assert.equal(G.state, "play", "you rise again");
  assert.ok(p.hp >= Math.round(p.maxHp*0.4) - 1);
  p.iframes = 0;
  G.hurtPlayer(9999, "test", true);
  assert.equal(G.state, "dead", "but only once");
});

test("Lifedrinker heals from hits, Hunter's Mark triples the first, Silver bites the dead", ()=>{
  const G = game("BLOOD"), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true;
  ["lifedrinker", "huntersmark", "silver"].forEach(id=> G.giveItem(id, true));
  const p = G.player; p.hp = 50;
  const e = addEnemy(G, r, spot.x + 2, spot.y); e.hp = e.maxHp = 1e6;
  const first = G.damageEnemy(e, 100, {}).d, second = G.damageEnemy(e, 100, {}).d;
  assert.ok(Math.abs(first/second - 3) < 1e-9, "the first hit is triple");
  assert.ok(p.hp > 50, "it drank");
  const sk = addEnemy(G, r, spot.x + 2, spot.y, "skeleton"); sk.hp = sk.maxHp = 1e6; sk.firstHit = true;
  const gr = addEnemy(G, r, spot.x + 2, spot.y, "grunt"); gr.hp = gr.maxHp = 1e6; gr.firstHit = true;
  assert.ok(Math.abs(G.damageEnemy(sk, 100, {}).d/G.damageEnemy(gr, 100, {}).d - 1.6) < 1e-9, "silver on the dead");
});

test("what you carried last run turns up less in the next", ()=>{
  const recent = Object.keys(DG.ITEMS).filter(id=> DG.ITEMS[id].tier <= 1 && DG.ITEMS[id].pools.indexOf("t") >= 0).slice(0, 25);
  const count = remembered=>{
    let hits = 0;
    for(let s=0; s<60; s++){
      const G = new DG.Game({ seedWord:"FRESH" + s, meta:{ flies:0, unlocked:{}, recent:remembered } });
      for(let k=0;k<8;k++){ const id = DG.Items.roll(G, "t"); if(recent.indexOf(id) >= 0) hits++; }
    }
    return hits;
  };
  const without = count([]), withRecent = count(recent);
  assert.ok(withRecent < without*0.6, "recent items are offered much less: " + withRecent + " vs " + without);
  // and remembering keeps this run's build and the one before
  const G = game("REMEMBER"); G.giveItem("spinach", true); G.meta.recentRuns = [["coffee"]];
  DG.Items.remember(G);
  assert.deepEqual(G.meta.recentRuns, [["spinach"], ["coffee"]]);
  assert.deepEqual(G.meta.recent.sort(), ["coffee", "spinach"]);
});
