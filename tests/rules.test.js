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
    const need = ["start", "boss", "treasure", "shop", "puzzle"];
    for(const t of need) assert.equal(types.filter(x=> x === t).length, 1, "seed " + s + " needs one " + t);
    ["pond", "altar"].forEach(t=> assert.ok(types.filter(x=> x === t).length <= 1, "at most one " + t));
    if(floor === 1) assert.ok(types.indexOf("altar") < 0, "no altar on floor 1");
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
  for(let i=0;i<60;i++){ const id = DG.Items.roll(G, "t"); assert.ok(!seen.has(id) || DG.ITEMS[id].stack, "repeat: " + id); seen.add(id); }
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
  // somewhere with three tiles of open floor ahead (the room's middle may be a pillar)
  const r = combatRoom(G);
  let c = null;
  for(let y=r.y1; y<=r.y2 && !c; y++) for(let x=r.x1; x<=r.x2 - 3 && !c; x++) if([0, 1, 2, 3].every(i=> G.D.at(x + i, y) === T.FLOOR)) c = { x:x + 0.5, y:y + 0.5 };
  G.addShot({ x:c.x, y:c.y, a:0, speed:4, r:0.15, dmg:5, range:1, els:["arcane"], power:1, depth:0 });
  step(G, 0.5);
  assert.ok(G.hazards.some(h=> h.kind === "blackhole"));
});

test("an ascension: Seeker Spirit turns the bare wand into the Seeker Wand; with a form, that form's ascension instead", ()=>{
  const G = game("ASCEND");
  G.giveItem("seeker");
  assert.equal(G.player.guns[0].name, "Seeker Wand");
  assert.ok(G.drain().some(e=> e.type === "ascend"));
  const H = game("ASCEND2");
  H.giveItem("scatterfocus"); H.giveItem("seeker");
  assert.ok(!H.player.guns[0].ascended, "Seeker wants the bare wand");
  H.giveItem("rubber");
  assert.equal(H.player.guns[0].name, "Pinball Wand");
});

/* ================================================================== *
 *  The wand: one weapon, shaped by what you find
 * ================================================================== */
test("there's one wand: no gun drops anywhere, and it grows stronger floor by floor", ()=>{
  const G = game("WAND1", 1), w = G.gun();
  assert.ok(w.wand && G.player.guns.length === 1);
  const d1 = G.gunStats().dmg;
  G.enterFloor(3); assert.ok(G.gunStats().dmg > d1*1.8, "floor 3: " + (G.gunStats().dmg/d1).toFixed(2) + "x");
  for(let s=0; s<40; s++){
    const H = game("NOGUNS" + s, 1 + (s % 5));
    H.D.rooms.forEach(r=> r.props.forEach(p=>{ if(p.offer) assert.ok(p.offer.kind !== "gun", r.type + " offers a gun"); }));
    [1, 2, 3].forEach(tier=> H.chestLoot({ tier }).forEach(it=> assert.ok(it.kind !== "gun", "a chest held a gun")));
  }
});
test("forms reshape the wand and stack: scatter fans out, lens pierces, bombard bursts; the look follows the boldest", ()=>{
  const G = game("WAND2"), s0 = G.gunStats();
  G.giveItem("scatterfocus");
  let s = G.gunStats();
  assert.equal(s.pellets, 5); assert.ok(s.rate < s0.rate && s.dmg < s0.dmg);
  assert.equal(G.gun().base, "shotgun");
  G.giveItem("bombardrune");
  s = G.gunStats();
  assert.equal(s.pellets, 5, "still five"); assert.ok(s.blast > 0, "and now they burst");
  assert.equal(G.gun().base, "launcher");
  assert.ok(/Bombard Scatter Wand|Scatter.*Wand/.test(G.gun().name), G.gun().name);
  const H = game("WAND3"); H.giveItem("longlens"); assert.ok(H.gunStats().basePierce >= 1);
  // each form on its own is about as strong as the bare wand
  ["scatterfocus", "repeatercoil", "longlens", "bombardrune"].forEach(id=>{
    const K = game("WANDDPS" + id), base = DG.Loot.dps(K.gun(), K.mods); K.giveItem(id, true);
    const k = DG.Loot.dps(K.gun(), K.mods)/base;
    assert.ok(k > 0.6 && k < 1.5, id + ": " + k.toFixed(2) + "x the bare wand");
  });
});
test("the wand's element is whichever you've gathered most: one core turns it to ice, its spell follows; a tie keeps what it has", ()=>{
  const G = game("WAND4");
  assert.equal(G.gun().element, "arcane");
  G.giveItem("rimecore");
  assert.equal(G.gun().element, "frost");
  assert.equal(G.gunStats().spell, "nova");
  assert.ok(G.shotEls(G.gun()).indexOf("frost") >= 0);
  assert.ok(G.drain().some(e=> e.type === "wand" && e.el === "frost"));
  G.giveItem("embercore");
  assert.equal(G.gun().element, "frost", "a tie: the wand keeps its element");
  G.giveItem("embercore");
  assert.equal(G.gun().element, "fire", "two fire beat one frost");
  G.giveItem("rimecore");
  assert.equal(G.gun().element, "fire", "and level again, it stays fire");
  assert.ok(G.player.items.embercore === 2, "cores stack");
});

test("shots carry the wand's element; other elements only ride along on one shot in four", ()=>{
  const G = game("TINGE");
  G.giveItem("rimecore"); G.giveItem("rimecore"); G.giveItem("venomcore"); G.giveItem("embercore");
  assert.equal(G.gun().element, "frost");
  const shots = []; for(let i=0;i<40;i++) shots.push(G.shotEls(G.gun()));
  assert.ok(shots.every(e=> e[0] === "frost"), "frost on every shot");
  const tinged = shots.filter(e=> e.length > 1);
  assert.equal(tinged.length, 40/DG.TINGE_EVERY, "one in four carries another");
  assert.ok(tinged.every(e=> e.length === 2), "and only one other at a time");
  assert.ok(tinged.some(e=> e[1] === "poison") && tinged.some(e=> e[1] === "fire"), "taking turns");
});

test("item rolls lean toward the wand's element once you've taken one", ()=>{
  // the same rolls with and without a frost core in hand: frost items come up more, the others less
  const count = core=>{
    let fr = 0, oth = 0;
    for(let s=0; s<120; s++){
      const G = game("LEAN" + s, 2);
      if(core) G.giveItem("rimecore", true);
      for(let i=0;i<4;i++){ const els = Object.keys(DG.Items.elSources(DG.ITEMS[DG.Items.roll(G, "t")])); if(els.indexOf("frost") >= 0) fr++; else if(els.length) oth++; }
    }
    return fr/(fr + oth);
  };
  const before = count(false), after = count(true);
  assert.ok(after > before*1.6, "frost's share of element items: " + before.toFixed(2) + " -> " + after.toFixed(2));
});

test("an item of another element says what it did: the wand stays, and how far behind it is", ()=>{
  const G = game("WAND5"), said = [];
  G.say = t=> said.push(t);
  G.giveItem("rimecore"); G.giveItem("rimecore"); said.length = 0;
  G.giveItem("venomcore");
  assert.equal(G.gun().element, "frost", "two frost, one poison: still frost");
  assert.ok(/stays frost \(frost 2, poison 1\)/.test(said.join(" ")), said.join(" | "));
  assert.ok(G.drain().some(e=> e.type === "offEl" && e.el === "poison" && e.wand === "frost"));
  assert.ok(G.mods.attune.frost >= 1, "frost keeps its attunement");
});

/* ================================================================== *
 *  Zippy: levels, actives, the altar
 * ================================================================== */
test("there are no levels: kills give no XP and never stop the game for a choice", ()=>{
  const G = game("LEVELS"), r = combatRoom(G); park(G); G.god = true;
  for(let i=0;i<40;i++){ const e = addEnemy(G, r, r.cxw, r.cyw); G.killEnemy(e, {}); }
  step(G, 0.5);
  assert.equal(G.state, "play");
  assert.equal(G.player.boons.length, 0);
  assert.ok(G.player.xp === undefined && G.player.level === undefined, "no XP to speak of");
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
  const r = G.D.rooms.find(x=> x.type === "shop"), ped = r.props.find(p=> p.kind === "pedestal" && p.offer.currency === "gold");
  G.player.gold = 999; G.player.hp = 10;
  G.player.x = ped.x + 0.5; G.player.y = ped.y + 1.2; G.room = r;
  G.interact();
  assert.ok(ped.taken);
  assert.equal(G.player.gold, 999 - ped.offer.price);
});

test("the Wandwright's bench (the old treasure room) is a choice of workings for the wand: take one and the rest crumble", ()=>{
  [[1, 2], [3, 3]].forEach(([floor, n])=>{
    const G = game("TREASURE", floor);
    const r = G.D.rooms.find(x=> x.type === "treasure"), peds = r.props.filter(p=> p.kind === "pedestal");
    assert.equal(peds.length, n, "floor " + floor);
    assert.ok(peds.every(p=> p.offer.kind === "item" && !p.offer.price && DG.ITEMS[p.offer.id].pools.indexOf("w") >= 0), "free, all from the Wandwright's pool");
    assert.ok(peds.some(p=> DG.ITEMS[p.offer.id].form), "one of them a form");
    const it = peds[0];
    G.player.x = it.x + 0.5; G.player.y = it.y + 1.2; G.room = r;
    G.interact();
    assert.ok(it.taken && peds.filter(p=> p !== it).every(p=> p.sunk));
  });
});

test("items come from bosses, lairs, shops and Olm: chests and armouries hold none", ()=>{
  for(let s=0; s<40; s++){
    const G = game("CHESTS" + s, 1 + (s % 5));
    [1, 2, 3].forEach(tier=> G.chestLoot({ tier }).forEach(it=> assert.ok(it.kind !== "itemid", "a tier " + tier + " chest held a powerup")));
  }
});

test("a gun grows with the kills you make with it", ()=>{
  const G = game("MASTERY"), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
  const g = G.gun(), dmg0 = G.gunStats().dmg;
  let ev = [];
  for(let i=0; i<DG.Loot.masteryNeed(0); i++){ const e = addEnemy(G, r, spot.x + 2, spot.y); G.killEnemy(e, {}); ev = ev.concat(G.drain()); }
  assert.equal(g.mastery, 1, "rank I");
  assert.ok(ev.some(e=> e.type === "mastery"));
  assert.ok(Math.abs(G.gunStats().dmg/dmg0 - (1 + DG.Loot.MASTERY_K)) < 1e-6, "+6% damage");
  for(let k=0; k<700; k++){ const e = addEnemy(G, r, spot.x + 2, spot.y); G.killEnemy(e, {}); }
  assert.equal(g.mastery, DG.Loot.MASTERY_MAX, "it stops at the cap");
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

function pondGame(word){
  for(let s=0; s<200; s++){ const G = game(word + s, 2); const r = G.D.rooms.find(x=> x.type === "pond"); if(r) return { G, r }; }
  throw new Error("no pond");
}
test("Gribbus' pond: three tricks of one tier float on the pads; pick one and the others sink", ()=>{
  for(let k=0; k<12; k++){
    const { G, r } = pondGame("POND" + k + "_");
    DG.Gribbus.offerPond(G, r);
    const pads = r.props.filter(p=> p.kind === "lilypad");
    assert.equal(pads.length, 3);
    assert.ok(pads.every(p=> p.buff));
    assert.equal(new Set(pads.map(p=> DG.FROG_BUFFS[p.buff].tier)).size, 1, "no obvious pick: all one tier");
    if(k) continue;
    DG.Gribbus.choosePad(G, pads[1]);
    assert.ok(G.gribbus.buffs.indexOf(pads[1].buff) >= 0, "Gribbus learns it");
    assert.ok(G.player.items["f_" + pads[1].buff], "and it's in the satchel as an item");
    assert.ok(pads[0].sunk && pads[2].sunk);
    assert.ok(!G.pickups.some(k=> k.kind === "fly"), "no golden fly");
  }
});

test("the pond is rare: about a quarter of floors", ()=>{
  let n = 0;
  for(let s=1; s<=200; s++) if(DG.Dungeon.generate(s*7919 >>> 0, 1 + (s % 5)).rooms.some(r=> r.type === "pond")) n++;
  assert.ok(n/200 > 0.12 && n/200 < 0.35, n + " ponds in 200 floors");
});

test("Gribbus' tricks are items too: found in shops and treasure, they teach him (and Mimic Toad copies your volleys)", ()=>{
  assert.ok(DG.Items.pools().s.some(id=> DG.ITEMS[id].frog), "some in the shop pool");
  assert.ok(DG.Items.pools().b.some(id=> DG.ITEMS[id].frog), "some in the boss pool");
  const G = game("MIMIC"), r = combatRoom(G); park(G);
  G.giveItem("f_mimic");
  assert.ok(G.gribbus.g.mimic);
  G.player.x = r.cxw; G.player.y = r.cyw; G.room = r; r.active = true; G.god = true;
  const e = addEnemy(G, r, r.cxw + 5, r.cyw); e.hp = e.maxHp = 1e6; e.speed = 0; e.ai.cd = 99;
  let frogShots = 0;
  for(let i=0;i<60;i++){ G.update(1/60, { fire:true, ax:e.x, ay:e.y }); frogShots += G.bullets.filter(b=> b.from === "gribbus" && b.t === 1/60).length; G.drain(); }
  assert.ok(frogShots > 0, "Gribbus fires your volleys");
  assert.ok(DG.Gribbus.mimicMul(G) < 1, "weaker than yours on his own");
  G.giveItem("f_crown"); G.giveItem("f_bigboy");
  assert.ok(DG.Gribbus.mimicMul(G) >= 0.99, "frog damage builds him up to match you: " + DG.Gribbus.mimicMul(G).toFixed(2));
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
  let word = null, p0 = null;
  for(let s=0; s<40 && !p0; s++){ const G = game("BONKER" + s); p0 = G.D.painted.find(p=> p.kind === "bonk"); if(p0) word = "BONKER" + s; }
  assert.ok(p0, "a painted door turns up");
  const G = game(word);
  G.player.x = p0.x + 0.5; G.player.y = p0.y + 1 + G.player.r + 0.02;
  assert.ok(step(G, 0.3, { my:-1 }).some(e=> e.type === "bonk"));
  const G2 = game(word);
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
  const { G, r } = puzzleRoom("stones", 1), pz = r.puzzle, b = pz.blocks[0];
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
  // a row with stone at both ends (not a doorway), whatever this seed's layout
  let row = Math.floor(G.player.y);
  const stone = (x, y)=> G.bulletBlocked(x + 0.5, y + 0.5) && G.D.at(x, y) !== T.DOOR;
  for(let y=r.y1 + 1; y<r.y2; y++) if([-1, 0, 1].every(d=> stone(r.x1 - 1, y + d) && stone(r.x2 + 1, y + d))){ row = y; break; }
  const b = G.addShot({ x:r.x1 + 1.5, y:row + 0.5, a:Math.PI, speed:12, r:0.1, dmg:1, range:30, els:["arcane"], power:1, depth:0 });
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
const usePz = (G, o)=>{ o.cd = 0; DG.Puzzles.use(G, o); };
test("puzzles are worked with E, never with shots", ()=>{
  assert.equal(DG.Puzzles.shot, undefined);
  const { G, r } = puzzleRoom("embers", 1), pz = r.puzzle, before = pz.lit.join("");
  const it = pz.items[0]; G.player.x = it.x; G.player.y = it.y + 0.6;
  for(let i=0;i<30;i++){ G.bullets.push({ team:"p", x:it.x, y:it.y, vx:0, vy:0, r:0.2, dmg:1, life:0.05, hits:[], pierce:0, el:null }); G.update(1/60, {}); G.drain(); }
  assert.equal(pz.lit.join(""), before, "bullets went through");
  const tg = G.target(); assert.ok(tg && tg.o.pz, "E targets the brazier"); assert.match(tg.text, /brazier/i);
});
test("the Liar's Doors: one true door by the rule, every door has a closet, nothing shows through the wall", ()=>{
  [1, 3, 5].forEach(f=>{
    const { G, r } = puzzleRoom("doors", f), pz = r.puzzle;
    const ws = DG.Puzzles.riddleWorlds(pz.rule, pz.doors.map(d=> d.says), pz.doors.map(d=> ({ name:d.name })));
    assert.equal(ws.length, 1, "floor " + f + ": exactly one way the faces can all be keeping the rule");
    assert.equal(ws[0].a, pz.answer);
    pz.doors.forEach(d=>{
      assert.equal(G.D.at(d.tx, d.ty), T.FAKE);
      for(let y=d.ty - 3; y<d.ty; y++) for(let x=d.tx - 1; x<=d.tx + 1; x++) assert.equal(G.D.at(x, y), T.FLOOR, "a closet behind every door");
      assert.ok(G.blocked(d.tx, d.ty, "player"), "shut to walking");
    });
    assert.ok(!r.props.some(p=> p.kind === "pedestal"), "no prize until the true door's opened");
    G.revealFake(pz.doors[0].tx, pz.doors[0].ty);
    assert.ok(!G.D.fakes.some(k=> k.puzzle && k.revealed), "shots and walking don't open them");
  });
  // the true door: solved, and the prize appears in its closet
  { const { G, r } = puzzleRoom("doors", 2), pz = r.puzzle, d = pz.doors[pz.answer];
    usePz(G, d);
    assert.ok(pz.solved);
    assert.ok(r.props.some(p=> p.kind === "pedestal" && p.y === d.ty - 2));
    assert.ok(G.pickups.some(k=> k.kind === "key"), "no slip: a key"); }
  // a false door: an ambush, and the others seal
  { const { G, r } = puzzleRoom("doors", 2), pz = r.puzzle, wrong = pz.doors.find(d=> d.i !== pz.answer);
    usePz(G, wrong);
    assert.ok(pz.failed && !pz.solved && r.active);
    usePz(G, pz.doors[pz.answer]);
    assert.ok(!pz.solved, "sealed"); }
});
test("Embers: the candles count; the fewest moves always fit; over budget it gutters, rescrambles and the chest drops a tier", ()=>{
  [1, 4].forEach(f=>{
    const { G, r } = puzzleRoom("embers", f), pz = r.puzzle, N = pz.items.length;
    assert.ok(pz.par >= 1 && pz.par <= pz.budget - 2, "floor " + f + ": par " + pz.par + ", budget " + pz.budget);
    // find the fewest presses and make them
    const dark = pz.lit.reduce((m, v, i)=> v ? m : m | (1 << i), 0);
    let best = null;
    for(let s=0; s<(1 << N); s++){ let m = 0, c = 0; for(let i=0;i<N;i++) if((s >> i) & 1){ m ^= pz.masks[i]; c++; } if(m === dark && (!best || c < best.c)) best = { s, c }; }
    for(let i=0;i<N;i++) if((best.s >> i) & 1) usePz(G, pz.items[i]);
    assert.ok(pz.solved, "floor " + f);
    assert.ok(!r.props.find(p=> p.kind === "chest").locked);
    assert.equal(r.props.find(p=> p.kind === "chest").tier, f >= 3 ? 3 : 2);
  });
  const { G, r } = puzzleRoom("embers", 1), pz = r.puzzle;
  // waste the candles pressing one brazier back and forth: it gutters as soon as
  // too few are left to finish, not only when the last one's gone
  let guard = 50, gutter = false;
  while(!pz.solved && !gutter && guard--){ const m = pz.moves; usePz(G, pz.items[0]); gutter = pz.moves === 0 && m > 0; }
  if(!pz.solved){
    assert.ok(gutter, "it gutters");
    assert.ok(r.active, "the dark noticed");
    assert.equal(r.props.find(p=> p.kind === "chest").tier, 1);
    assert.ok(pz.flawless === false);
  }
});
test("Embers never strands you: a stir that leaves too few candles to finish gutters at once; early floors start four or five stirs out, with four to spare", ()=>{
  // the state from a played run: four dark (top middle, top right, middle right,
  // bottom right) needs four stirs, and only three candles were left
  const { G, r } = puzzleRoom("embers", 1), pz = r.puzzle;
  let seen = 0;
  for(let k=0; k<300 && seen < 30; k++){
    const D = DG.Dungeon.generate(k*7919 + 13, 1 + (k % 2)), q = D.rooms.find(x=> x.puzzle && x.puzzle.kind === "embers");
    if(!q) continue; seen++;
    assert.ok(q.puzzle.par >= 4 && q.puzzle.par <= 5 && q.puzzle.budget === q.puzzle.par + 4, "par " + q.puzzle.par + " budget " + q.puzzle.budget);
  }
  assert.ok(seen >= 10);
  pz.lit = [1, 0, 0, 1, 1, 0, 1, 1, 0];
  assert.equal(DG.Puzzles.emberPar(pz), 4);
  pz.budget = 5; pz.moves = 1;   // four candles left: still possible
  usePz(G, pz.items[4]);          // a stir that doesn't help: now 5 needed, 3 left
  assert.equal(pz.moves, 0, "it gutters at once and rescrambles");
  assert.ok(r.active, "and the dark noticed");
});
test("Weighing Stones: built backwards, so the recorded pushes solve it; the reset rune costs blood", ()=>{
  [1, 3, 5].forEach(f=>{
    const { G, r } = puzzleRoom("stones", f), pz = r.puzzle;
    assert.ok(pz.pulls >= 4 + 2*f, "floor " + f + ": " + pz.pulls + " pushes");
    assert.equal(pz.blocks.length, f >= 3 ? 3 : 2);
    pz.solution.forEach(m=>{ pz.cd = 0; DG.Puzzles.push(G, m.x, m.y, m.dx, m.dy); });
    assert.ok(pz.solved, "floor " + f);
  });
  const { G, r } = puzzleRoom("stones", 2), pz = r.puzzle;
  if(pz.reset){
    const m = pz.solution[0]; DG.Puzzles.push(G, m.x, m.y, m.dx, m.dy);
    const hp = G.player.hp; usePz(G, pz.reset);
    assert.ok(G.player.hp < hp, "blood");
    assert.ok(pz.blocks.every(b=> b.x === b.sx && b.y === b.sy), "back where they started");
  }
});
test("the Choir: sing it back (back to front, deep down); wrong notes burst spores; three and they give up on you", ()=>{
  [1, 4].forEach(f=>{
    const { G, r } = puzzleRoom("choir", f), pz = r.puzzle;
    assert.equal(pz.reverse, f >= 4);
    for(let round=0; round<pz.rounds; round++){
      pz.phase = "listen"; pz.i = 0;
      const n = pz.len + round;
      for(let k=0;k<n;k++) usePz(G, pz.items[pz.seq[pz.reverse ? n - 1 - k : k]]);
    }
    assert.ok(pz.solved, "floor " + f);
  });
  const { G, r } = puzzleRoom("choir", 2), pz = r.puzzle, hp0 = G.player.hp;
  for(let k=0;k<3;k++){ pz.phase = "listen"; pz.i = 0; usePz(G, pz.items[(pz.seq[0] + 1) % 4]); G.player.iframes = 0; }
  assert.ok(G.player.hp < hp0, "spores");
  assert.ok(pz.solved && !pz.flawless);
  assert.equal(r.props.find(p=> p.kind === "chest").tier, 1);
  assert.ok(!G.pickups.some(k=> k.kind === "key"));
});
test("the Mirror Hall: the answer carries the light to the eye; the scramble doesn't; turning by the chain solves it", ()=>{
  [1, 3, 5].forEach(f=>{
    const { G, r } = puzzleRoom("mirrors", f), pz = r.puzzle;
    assert.ok(!DG.Puzzles.trace(G.D, pz).hit, "scrambled");
    assert.equal(pz.linked, f >= 2);
    const par = DG.Puzzles.mirrorPar(pz);
    assert.equal(pz.budget, par + 3);
    assert.ok(pz.want.filter(w=> w >= 0).length >= (f <= 1 ? 3 : 4), "floor " + f + ": three shields or more to set");
    // turn each, in order, until it's right (the chain way: it drags the next one round)
    pz.items.forEach((it, i)=>{ if(pz.want[i] < 0) return; let g = 4; while(it.q !== pz.want[i] && g-- && !pz.solved) usePz(G, it); });
    assert.ok(pz.solved, "floor " + f);
    assert.ok(pz.turns <= par, "the chain way is the fewest");
  });
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

test("every boss (both of each floor's) fights for 25 seconds, stays in its room, and can be killed", ()=>{
  for(let f=1; f<=5; f++) for(const key of [DG.FLOORS[f - 1].boss, DG.FLOORS[f - 1].alt].filter(Boolean)){
    const G = game("BOSS" + f, f);
    G.D.theme = Object.assign({}, G.D.theme, { boss:key });
    const r = G.D.rooms.find(x=> x.type === "boss");
    G.player.x = r.cxw; G.player.y = r.y2 - 0.5; G.god = true;
    step(G, 1.6);
    const b = G.bossRef;
    assert.ok(b && b.type === key, "floor " + f + " boss " + key);
    for(let i=0;i<60*25;i++){
      G.update(1/60, { mx:Math.sin(i/40), my:Math.cos(i/50)*0.5, ax:b.x, ay:b.y, fire:true });
      G.drain();
      for(const e of G.enemies) if(!e.dead && !e.airborne) assert.ok(G.inRoom(r, e.x, e.y), e.type + " left the boss room");
    }
    b.invuln = false; b.untargetable = false; b.airborne = false;   // (caught mid-leap, it would dodge the blow)
    G.damageEnemy(b, 1e8, {});
    assert.ok(b.dead && G.portal, "floor " + f + ": " + key + " down, portal open");
  }
});

/* ---- regression: enemies escaping through walls (rooms stayed locked forever) ---- */
test("a big body shoved into a wall can back out but never goes through it", ()=>{
  const G = game("WALLS");
  // any goblin room with five tiles of plain west wall in a row (not every layout has one in its first room)
  let r = null, wy = 0;
  for(const room of G.D.rooms.filter(x=> x.type === "combat")){
    for(let y=room.y1 + 2; y<room.y2 - 1 && !r; y++) if([-2, -1, 0, 1, 2].every(k=> G.D.at(room.x1 - 1, y + k) === T.SOLID) && [-1, 0, 1].every(k=> [0, 1, 2, 3].every(i=> G.D.at(room.x1 + i, y + k) === T.FLOOR))){ r = room; wy = y; }
    if(r) break;
  }
  assert.ok(r, "found solid wall");
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
    "status", "shrink", "stickybomb", "gum", "bee", "ghoul", "hiccup", "shove", "candy", "dice", "toll", "missile"];
  const check = (d, who)=>{ for(const k in d.on || {}) d.on[k].forEach(pl=> assert.ok(PAYLOADS.indexOf(pl.do) >= 0, who + ": unknown payload " + pl.do)); };
  for(const id in DG.ITEMS){
    const d = DG.ITEMS[id];
    assert.ok(d.name && d.desc, id + " has a name and a description");
    assert.ok(d.tier >= 0 && d.tier <= 4, id + " tier");
    assert.ok(d.given ? d.pools === "" : /^[tsbxafw]+$/.test(d.pools), id + " pools");
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
  const b = addEnemy(G, r, spot.x + 2, spot.y); b.boss = b.big = true; b.hp = b.maxHp = 100;
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

test("the map starts dark: rooms go on it as you find them", ()=>{
  const G = game("DARKMAP");
  const start = G.D.rooms.find(r=> r.type === "start");
  assert.ok(start.visited && start.known, "you know where you start");
  assert.ok(G.D.rooms.filter(r=> r !== start).every(r=> !r.known && !r.visited && !r.seen), "nothing else yet");
  const r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.god = true; G.player.x = spot.x; G.player.y = spot.y;
  const ev = step(G, 0.2);
  assert.ok(r.visited && r.seen && r.known, "walking in puts it on the map");
  assert.ok(ev.some(e=> e.type === "visit" && e.room === r.id));
  // the Seer's Lantern still shows the whole floor
  G.player.active = { id:"seer", charge:9, max:1 }; G.useActive();
  assert.ok(G.D.rooms.filter(x=> x.type !== "secret").every(x=> x.known));
});

test("level-up choices keep changing: no repeats from the last offers, a wide spread", ()=>{
  let overlap = 0, offers = 0;
  const seen = new Set();
  for(let s=0; s<30; s++){
    const G = game("BOONS" + s);
    let last = [];
    for(let k=0; k<10; k++){
      const o = DG.Items.rollBoons(G, 3);
      assert.equal(new Set(o).size, 3, "three different boons");
      overlap += o.filter(id=> last.indexOf(id) >= 0).length; offers++;
      o.forEach(id=> seen.add(id));
      G.player.boons.push(o[0]); last = o;
    }
  }
  assert.ok(overlap/offers < 0.15, "back-to-back offers rarely share a boon: " + (overlap/offers).toFixed(2));
  assert.ok(seen.size >= 50, "almost every boon turns up somewhere: " + seen.size);
});

test("a blink pressed just before it's ready still happens", ()=>{
  const G = game("BUFFER"); G.god = true; park(G);
  const p = G.player;
  p.blinkCd = 0.1;
  G.update(1/60, { blink:true });
  let ev = G.drain();
  assert.ok(!ev.some(e=> e.type === "blink"), "not yet");
  for(let i=0;i<10;i++){ G.update(1/60, {}); ev = ev.concat(G.drain()); }
  assert.ok(ev.some(e=> e.type === "blink"), "it went as soon as it could");
});

test("a false door is worth a knock: the first bonk can shake loose a stash", ()=>{
  let stashes = 0, doors = 0;
  for(let s=1; s<60; s++){
    const G = game("KNOCK" + s); G.god = true;
    const d = G.D.painted.find(x=> x.kind === "bonk"); if(!d) continue;
    doors++;
    const p = G.player; p.x = d.x + 0.5; p.y = d.y + 1 + p.r; p.bonkCd = 0;
    G.checkBonk(p);
    const ev = G.drain();
    assert.ok(ev.some(e=> e.type === "bonk"), "bonk");
    if(ev.some(e=> e.type === "stash")){ stashes++; assert.ok(G.pickups.some(k=> k.kind === "gold"), "coins came out"); }
    p.bonkCd = 0; G.checkBonk(p);
    assert.ok(!G.drain().some(e=> e.type === "stash"), "only the first knock");
  }
  assert.ok(doors > 10 && stashes > 0 && stashes < doors, stashes + " stashes behind " + doors + " doors");
});

test("shops vary in size, and the Membership Card adds wares and takes 20% off", ()=>{
  const sizes = new Set();
  for(let s=1; s<30; s++){
    const G = game("SHOP" + s), r = G.D.rooms.find(x=> x.type === "shop"); if(!r) continue;
    const peds = r.props.filter(p=> p.kind === "pedestal");
    sizes.add(peds.length);
    assert.ok(peds.length >= 3 && peds.length <= 5);
    assert.ok(peds.some(p=> p.offer.kind === "item"), "always at least one item");
  }
  assert.ok(sizes.size >= 2, "not every shop is the same size");
  for(let s=1; s<30; s++){
    const G = game("MEMBER" + s), r = G.D.rooms.find(x=> x.type === "shop"); if(!r) continue;
    G.giveItem("membercard", true); G.god = true;
    const before = r.props.filter(p=> p.kind === "pedestal"), prices = before.map(p=> p.offer.price);
    const spot = G.freeSpot(r, r.cxw, r.cyw - 1); G.player.x = spot.x; G.player.y = spot.y;
    step(G, 0.1);
    const after = r.props.filter(p=> p.kind === "pedestal");
    if(after.length === before.length) continue;     // no room either side: try another shop
    assert.ok(after.length > before.length, "more wares");
    before.forEach((p, i)=> assert.equal(p.offer.price, Math.round(prices[i]*0.8), "20% off"));
    return;
  }
  assert.fail("no shop had room for more wares");
});

/* ================================================================== *
 *  Icons: every powerup, active and frog trick has a glyph that exists
 * ================================================================== */
test("every item, active, frog trick, gun and set has an icon whose glyphs exist", ()=>{
  require("../js/ui/icons.js");
  const I = DG.Icons;
  const check = (table, ids, what)=> ids.forEach(id=>{
    const s = I.parse(table[id]);
    assert.ok(s, what + " " + id + " has an icon spec (" + table[id] + ")");
    assert.equal(typeof I.GLYPHS[s.g], "function", what + " " + id + ": glyph " + s.g + " exists");
    if(s.badge) assert.equal(typeof I.GLYPHS[s.badge], "function", what + " " + id + ": badge " + s.badge + " exists");
    s.els.forEach(el=> assert.ok(DG.ELEMENTS[el], what + " " + id + ": element " + el + " exists"));
  });
  check(I.ITEMS, Object.keys(DG.ITEMS), "item");
  check(I.ACTIVES, Object.keys(DG.ACTIVES), "active");
  check(I.FROG, Object.keys(DG.FROG_BUFFS), "frog trick");
  check(I.GUNS, DG.GUN_ORDER, "gun");
  check(I.SETS, DG.SETS.map(s=> s.id), "set");
  // nothing in the tables that the game doesn't have
  Object.keys(I.ITEMS).forEach(id=> assert.ok(DG.ITEMS[id], "icon for a real item: " + id));
  // no two powerups look the same: glyph, copies, crack, badge and elements together
  const seen = {};
  Object.keys(DG.ITEMS).forEach(id=>{
    const s = I.spec(id), sig = [s.g, s.n, s.crack, s.badge, s.els.join(","), s.rot].join("|");
    assert.ok(!seen[sig], id + " looks just like " + seen[sig] + " (" + sig + ")");
    seen[sig] = id;
  });
  // namespaced keys resolve to their own tables (item "dice" and active "dice" differ)
  assert.equal(I.spec("active:dice").shape, "shield");
  assert.equal(I.spec("frog:mirror").g, "mirror");
  assert.equal(I.spec("gun:rifle:shock:3").els[0], "shock");
  assert.equal(I.spec("prismheart").els.length, DG.ELEMENT_ORDER.length);
});

test("keys: you start with one, find more, and a locked door wants one", ()=>{
  const G = game("KEYS"); G.god = true;
  const p = G.player;
  assert.equal(p.keys, 1, "one to start");
  G.addPickup("key", p.x, p.y, 1); G.pickups[G.pickups.length - 1].t = 1; step(G, 0.3);
  assert.equal(p.keys, 2, "picked one up");
  const d = G.D.doors[0]; d.locked = true; d.open = false;
  G.setDoors(G.D.rooms[d.rooms ? d.rooms[0] : 0], true);
  assert.ok(!d.open, "a locked door stays shut when a room opens its doors");
  p.keys = 0; G.unlockDoor(d);
  assert.ok(d.locked && !d.open, "no key, no entry");
  p.keys = 1; G.unlockDoor(d);
  assert.ok(!d.locked && d.open && p.keys === 0, "a key opens it, and is spent");
});

/* ================================================================== *
 *  Builds you can plan: attunement, guided offers, the stackers
 * ================================================================== */
test("attunement: sources of one element unlock its tiers", ()=>{
  const none = DG.Items.build({}, [], [], "fire");
  assert.ok(!none.attune.fire, "the gun alone isn't enough");
  const one = DG.Items.build({ emberrounds:1 }, [], [], "fire");
  assert.equal(one.attune.fire, 1, "gun + Ember Rounds: Attunement I");
  const two = DG.Items.build({ emberrounds:1, emberrelic:1, wildfire:1 }, [], [], "fire");
  assert.equal(two.attune.fire, 2);
  assert.ok(two.special.wildfire >= 2, "II brings Wildfire on top of the item");
  const three = DG.Items.build({ emberrounds:1, emberrelic:2, inferno:1 }, [], [], "fire");
  assert.equal(three.attune.fire, 3, "III");
  assert.ok(three.on.tick.some(pl=> pl.el === "fire" && pl.do === "nova"), "the Pyre");
  const G = game("ATTUNE"); G.giveItem("frostrounds", true);
  G.player.guns[0].element = "frost"; G.recalc(); G.drain();
  G.giveItem("frostrelic", true);
  assert.ok(G.drain().some(e=> e.type === "attune" && e.el === "frost"), "reaching a tier is announced");
});

test("offers lean toward where your build is heading, but not always", ()=>{
  const coinish = id=> DG.Items.tagsOf(DG.ITEMS[id]).indexOf("coin") >= 0;
  const count = withBuild=>{
    let hits = 0, n = 0;
    for(let s=0; s<80; s++){
      const G = game("LEAN" + s);
      if(withBuild){ ["midaspocket", "magnet", "tithe"].forEach(id=> G.player.items[id] = 1); }
      for(let k=0;k<6;k++){ const id = DG.Items.roll(G, "t"); n++; if(coinish(id)) hits++; }
    }
    return hits/n;
  };
  const base = count(false), lean = count(true);
  assert.ok(lean > base*1.3, "a coin build sees more coin items: " + lean.toFixed(2) + " vs " + base.toFixed(2));
  assert.ok(lean < 0.7, "but it's still a roll");
  // boons: the first of three usually follows the build
  let follow = 0;
  for(let s=0; s<60; s++){
    const G = game("BOONLEAN" + s); ["syringe", "frenzy", "coffee"].forEach(id=> G.player.items[id] = 1);
    const o = DG.Items.rollBoons(G, 3);
    if(DG.Items.tagsOf(DG.BOONS[o[0]]).indexOf("attackspeed") >= 0) follow++;
  }
  assert.ok(follow > 30 && follow < 60, "the lead boon follows the build most of the time: " + follow + "/60");
});

test("stackers can turn up again, and stack", ()=>{
  const G = game("STACK");
  let again = false;
  for(let k=0; k<400 && !again; k++){ const id = DG.Items.roll(G, "t"); if(DG.ITEMS[id].stack){ if(G.player.items[id]) again = true; G.giveItem(id, true); } }
  assert.ok(again, "a stacker was offered a second time");
  const one = DG.Items.build({ syringe:1 }), three = DG.Items.build({ syringe:3 });
  assert.ok(Math.abs(three.rate - one.rate*3) < 1e-9, "three syringes, three times the speed");
});

test("a pile of proc items can't run away: shots and depth stay bounded", ()=>{
  const G = game("PROCS"), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.room = r; r.active = true; G.god = true;
  ["ukulele", "ukulele", "ukulele", "mortar", "mortar", "mortar", "fractal", "fractal", "fractal", "doubletap", "doubletap", "sparebarrel", "sparebarrel", "crowsnest", "staticcling", "shrapnel", "stickybomb"].forEach(id=> G.giveItem(id, true));
  assert.equal(G.mods.maxDepth, 3, "depth capped");
  G.enemies = [];
  for(let i=0;i<10;i++){ const e = addEnemy(G, r, spot.x + 2 + (i % 3), spot.y - 1 + Math.floor(i/3)*0.7); e.hp = e.maxHp = 1e6; e.speed = 0; e.ai.cd = 99; }
  let peak = 0;
  const t0 = Date.now();
  for(let i=0;i<60*4;i++){
    G.update(1/60, { fire:true, ax:spot.x + 3, ay:spot.y, mx:0, my:0 }); G.drain();
    peak = Math.max(peak, G.bullets.filter(b=> b.team === "p").length);
  }
  assert.ok(peak <= 170, "shots stay under the hard cap: " + peak);
  assert.ok(Date.now() - t0 < 8000, "and four seconds of it simulate quickly");
});

/* ================================================================== *
 *  Endings: Dawn, the First Flame (the Ember, the Kiln, the Hollow
 *  Wizard), King of the Bog (the Crown, and a frog with an appetite)
 * ================================================================== */
function killBoss(G){
  const r = G.D.rooms.find(x=> x.type === "boss");
  const s = G.freeSpot(r, r.cxw, r.cyw + 2); G.player.x = s.x; G.player.y = s.y; G.god = true;
  step(G, 1);
  const b = G.enemies.find(e=> e.boss && !e.dead);
  assert.ok(b, "a boss in the boss room");
  G.killEnemy(b, {}); step(G, 0.2);
  return { r, b };
}
function takePortal(G){ G.player.x = G.portal.x; G.player.y = G.portal.y; G.interact(); }

test("side routes: at most one a run, by chance; only its own things turn up", ()=>{
  const n = { none:0, ember:0, bog:0, olm:0 };
  for(let s=0; s<300; s++){ const G = new DG.Game({ seedWord:"ROUTE" + s }); n[G.roads.route || "none"]++; }
  Object.keys(n).forEach(k=> assert.ok(n[k] > 30, k + " happens: " + JSON.stringify(n)));
  assert.ok(n.none > 80, "plenty of runs have none");
  // each route puts only its own things in the dungeon
  const things = G=>{ const out = { reliquary:0, shroom:0, olm:0, eyedoor:0 };
    for(let f=1; f<=5; f++){ const D = DG.Dungeon.generate((G.seed + f*104729) >>> 0, f, DG.Roads.genOpts(G, f));
      D.rooms.forEach(r=>{ if(r.type === "reliquary") out.reliquary++; if(r.type === "olm") out.olm++; r.props.forEach(p=>{ if(p.kind === "glowshroom") out.shroom++; if(p.kind === "eyedoor") out.eyedoor++; }); }); }
    return out; };
  const ember = things(new DG.Game({ seedWord:"R1", route:"ember" }));
  assert.equal(ember.reliquary, 1); assert.equal(ember.shroom, 0); assert.equal(ember.eyedoor, 0);
  const bog = things(new DG.Game({ seedWord:"R2", route:"bog" }));
  assert.equal(bog.reliquary, 0); assert.ok(bog.shroom >= DG.SHROOMS_NEED, bog.shroom + " mushrooms, ten needed"); assert.equal(bog.eyedoor, 0);
  const olm = things(new DG.Game({ seedWord:"R3", route:"olm" }));
  assert.equal(olm.olm, 2, "Olm twice"); assert.equal(olm.eyedoor, 1, "the door of eyes on his second visit's floor"); assert.equal(olm.shroom + olm.reliquary, 0);
  const none = things(new DG.Game({ seedWord:"R4", route:null }));
  assert.ok(none.olm <= 1 && none.eyedoor === 0 && none.shroom === 0 && none.reliquary === 0);
});
// regression: a quest room could be a goblin room with two ways out, and with
// its doors locked it could cut a keyless player off from the boss
test("no locked room ever stands between the start and the boss", ()=>{
  let quests = 0;
  for(let s=1; s<=120; s++) for(const floor of [1, 2, 3]){
    const D = DG.Dungeon.generate(s*7349 >>> 0, floor, s % 2 ? { reliquary:true } : { shrine:true, rot:2 });
    const shut = r=> D.doors.some(d=> d.locked && d.into === r.id);
    D.rooms.forEach(r=>{ if(r.type === "reliquary" || r.type === "shrine"){ quests++; assert.equal(r.links.length, 1, r.type + " is a dead end"); } });
    const start = D.rooms.find(r=> r.type === "start"), seen = { [start.id]:true }, q = [start];
    while(q.length){ const r = q.shift(); r.links.forEach(id=>{ const n = D.rooms[id]; if(!seen[id] && !shut(n)){ seen[id] = true; q.push(n); } }); }
    assert.ok(seen[D.rooms.find(r=> r.type === "boss").id], "seed " + s + " floor " + floor + ": the boss is behind a lock");
  }
  assert.ok(quests > 20, quests + " quest rooms");
});

test("Dawn: kill the Gloom Heart, take the way out, and climb toward the light", ()=>{
  const G = game("DAWNEND", 5);
  killBoss(G);
  assert.ok(G.portal, "the way out opens");
  takePortal(G);
  assert.equal(G.state, "play", "not yet: the climb");
  assert.ok(G.D.climb && G.climb);
  // rocks fall and the Gloom flees past; at the top, the morning
  let rocks = 0, ghosts = 0;
  for(let i=0;i<60*4;i++){ G.update(1/60, {}); G.drain().forEach(e=>{ if(e.type === "rockfall") rocks++; }); }
  ghosts = G.enemies.filter(e=> e.flee).length;
  assert.ok(rocks > 2 && ghosts >= 1, rocks + " rocks, " + ghosts + " ghosts");
  G.player.x = G.D.exit.x; G.player.y = G.D.exit.y + 0.5; G.update(1/60, {});
  assert.equal(G.state, "won"); assert.equal(G.ending, "dawn");
  assert.ok(G.meta.endings.dawn, "remembered");
});
test("the Mission: every warden killed without a scratch trims the Heart", ()=>{
  const a = game("TRIM", 5); a.stats.bosses = [{ floor:1, clean:true }, { floor:2, clean:true }, { floor:3, clean:false }];
  const b = game("TRIM", 5); b.stats.bosses = [];
  const hp = G=>{ const r = G.D.rooms.find(x=> x.type === "boss"); G.player.x = r.cxw; G.player.y = r.y2 - 1; G.god = true; step(G, 0.5); return G.enemies.find(e=> e.boss).maxHp; };
  const ha = hp(a), hb = hp(b);
  assert.ok(Math.abs(ha/hb - 0.8) < 0.01, ha + " vs " + hb);
});
test("a boss fight taken without a hit is remembered as clean", ()=>{
  const G = game("CLEANKILL", 1); G.god = false;
  const r = G.D.rooms.find(x=> x.type === "boss"); G.player.x = r.cxw; G.player.y = r.y2 - 1; step(G, 0.3);
  const b = G.enemies.find(e=> e.boss); G.player.iframes = 99; G.killEnemy(b, {}); step(G, 0.2);
  assert.ok(G.stats.bosses[0].clean);
  const H = game("DIRTYKILL", 1);
  const r2 = H.D.rooms.find(x=> x.type === "boss"); H.player.x = r2.cxw; H.player.y = r2.y2 - 1; step(H, 0.3);
  H.player.iframes = 0; H.hurtPlayer(5, "test"); H.killEnemy(H.enemies.find(e=> e.boss), {}); step(H, 0.2);
  assert.ok(!H.stats.bosses[0].clean);
});

test("King of the Bog: ten mushrooms, a green portal, the Glutton's Bog and the Toad King", ()=>{
  const G = new DG.Game({ seedWord:"BOGEND", floor:5, route:"bog" });
  G.roads.rot.shrooms = DG.SHROOMS_NEED;
  killBoss(G);
  assert.equal(G.portal.kind, "bog", "the Heart's portal runs green");
  takePortal(G);
  assert.equal(G.state, "play", "not over yet");
  assert.equal(G.floor, DG.FINAL_FLOOR + 1); assert.equal(G.D.theme, DG.BOG);
  assert.ok(DG.Gribbus.mult(G) >= 2, "Gribbus is the king here");
  const { b } = killBoss(G);
  assert.equal(b.type, "toadking");
  takePortal(G);
  assert.equal(G.ending, "bog");
});

test("THE THRONE: an element mastered when the Heart falls; its portal leads to that element's throne", ()=>{
  const G = new DG.Game({ seedWord:"THRONE1", floor:5, route:"none" });
  for(let i=0;i<5;i++) G.giveItem("rimecore", true);
  assert.equal(G.mods.attune.frost, 3, "five cores and the wand: attunement III");
  assert.equal(G.mastered(), "frost");
  killBoss(G);
  assert.equal(G.portal.kind, "throne"); assert.equal(G.portal.el, "frost");
  assert.ok(/Rime Throne/.test(G.portalText()));
  takePortal(G);
  assert.equal(G.state, "won"); assert.equal(G.ending, "throne"); assert.equal(G.endingEl, "frost");
  assert.ok(G.meta.endings.throne && G.meta.thrones.frost, "remembered, and which throne");
  assert.equal(DG.endingFor("throne", "frost").title, "THE RIME THRONE");
  assert.ok(DG.endingFor("throne", "fire").lore.length >= 4);
  // not mastered: the climb out as ever
  const H = new DG.Game({ seedWord:"THRONE2", floor:5, route:"none" });
  for(let i=0;i<3;i++) H.giveItem("rimecore", true);
  assert.equal(H.mastered(), null);
  killBoss(H);
  assert.ok(!H.portal.kind, "attunement II isn't mastery");
});
test("THE THRONE: mastered after the Heart (its relic, say) turns the portal then; the Ember comes first", ()=>{
  const G = new DG.Game({ seedWord:"THRONE3", floor:5, route:"none" });
  for(let i=0;i<4;i++) G.giveItem("embercore", true);
  killBoss(G);
  assert.ok(!G.portal.kind);
  G.drain(); G.giveItem("embercore");
  assert.equal(G.portal.kind, "throne"); assert.equal(G.portal.el, "fire");
  assert.ok(G.drain().some(e=> e.type === "portal" && e.kind === "throne"), "the view is told");
  const H = new DG.Game({ seedWord:"THRONE4", floor:5, route:"ember" });
  for(let i=0;i<5;i++) H.giveItem("embercore", true);
  H.player.quests.ember = true;
  killBoss(H);
  assert.ok(H.portal.kind !== "throne", "carrying the Ember, it's the Kiln");
});
test("the robes take the wand's element a stage at a time: cape at I, half the robe at II, all of him at III", ()=>{
  const look = t=> DG.Items.costume(["rimecore"], [], { el:"frost", tier:t });
  assert.equal(look(0).cape, "arcane");
  assert.equal(look(1).cape, "frost"); assert.equal(look(1).robe, "arcane");
  assert.equal(look(2).tint, "frost"); assert.equal(look(2).tintK, 0.5);
  assert.equal(look(3).robe, "frost"); assert.ok(look(3).auras.indexOf("snow") >= 0 && look(3).mastery === "frost");
  assert.notEqual(look(1).key, look(2).key, "each stage is a new look (the view redresses him)");
  assert.equal(DG.Items.costume([], [], { el:"arcane", tier:3 }).robe, "arcanum");
});

test("glowing mushrooms: Gribbus eats them, grows, and from four on he demands praise", ()=>{
  for(let s=0; s<30; s++){
    const G = new DG.Game({ seedWord:"SHROOM" + s, route:"bog" });
    const r = G.D.rooms.find(x=> x.props.some(p=> p.kind === "glowshroom"));
    if(!r) continue;
    const o = r.props.find(p=> p.kind === "glowshroom"), m0 = DG.Gribbus.scale(G), s0 = DG.Gribbus.size(G);
    G.god = true; stand(G, o.x + 0.5, o.y + 0.5); G.room = r;
    assert.ok(/mushroom/.test(G.target().text), G.target().text);
    G.interact();
    assert.equal(G.roads.rot.shrooms, 1); assert.ok(o.eaten);
    assert.ok(DG.Gribbus.scale(G) > m0 && DG.Gribbus.size(G) > s0, "he grows");
    G.interact(); assert.equal(G.roads.rot.shrooms, 1, "a mushroom is eaten once");
    G.roads.rot.shrooms = 5; park(G);
    step(G, 20);
    const f = G.gribbus;
    assert.ok(f.demand > 0, "he demands praise");
    stand(G, f.x + 0.4, f.y); assert.ok(/Praise/.test(G.target().text));
    const before = DG.Gribbus.mult(G); G.interact();
    assert.ok(DG.Gribbus.mult(G) > before*1.4, "praised, he hits harder");
    return;
  }
  throw new Error("no mushroom found");
});

test("The First Flame: the Ember opens the Kiln, and the Hollow Wizard waits there", ()=>{
  const G = game("FLAMEEND", 5); G.player.quests.ember = true;
  killBoss(G); takePortal(G);
  assert.equal(G.state, "play", "not over yet");
  assert.equal(G.floor, DG.FINAL_FLOOR + 1); assert.equal(G.D.theme, DG.KILN);
  const { b } = killBoss(G);
  assert.equal(b.type, "hollow");
  takePortal(G);
  assert.equal(G.ending, "flame");
  assert.ok(G.meta.endings.flame);
});

/* ================================================================== *
 *  Rooms: locked vaults, golden chests, rare rooms, Brother Olm,
 *  secret-wall tells, the jungle pond
 * ================================================================== */
function specialRoom(type, floor, pred){
  for(let s=1; s<600; s++){
    const G = game("RM" + type + s, floor || 2);
    const r = G.D.rooms.find(x=> x.type === type && (!pred || pred(x, G)));
    if(r){ G.god = true; return { G, r }; }
  }
  throw new Error("no " + type + " room");
}
function stand(G, x, y){ G.player.x = x; G.player.y = y; G.player.vx = G.player.vy = 0; }
const propOf = (r, kind, f)=> r.props.find(p=> p.kind === kind && (!f || f(p)));

test("vaults and rare rooms turn up at the right rates, one door each, and every one is reachable", ()=>{
  const n = {}; let floors = 0;
  for(let s=1; s<=200; s++){
    const floor = 1 + (s % 5), D = DG.Dungeon.generate(s*2654435761 >>> 0, floor), seen = reach(D);
    floors++;
    D.rooms.forEach(r=>{
      if(!DG.Dungeon.SPECIAL[r.type]) return;
      n[r.type] = (n[r.type] || 0) + 1;
      assert.equal(r.links.length, 1, r.type + " is a dead end");
      assert.ok(roomReached(D, r, seen), "seed " + s + ": " + r.type + " unreachable");
      if(r.type === "throne") assert.ok(floor >= 2, "no Red Throne on floor 1");
    });
  }
  assert.ok(n.vault/floors > 0.4 && n.vault/floors < 0.75, "vaults on about half the floors: " + n.vault);
  const weird = (n.throne || 0) + (n.cage || 0) + (n.gamble || 0);
  assert.ok(weird/floors > 0.1 && weird/floors < 0.35, "a weird room every few floors: " + weird);
  assert.ok(n.throne && n.cage && n.gamble, "all three weird rooms happen");
  assert.ok(!n.olm, "Olm only where the game asks for him");
  const D = DG.Dungeon.generate(4242, 2, { olm:{ visit:1 } });
  assert.equal(D.rooms.filter(r=> r.type === "olm").length, 1);
});

test("a vault sits behind a locked door: no key, no entry; a key opens it and the loot is all yours", ()=>{
  const { G, r } = specialRoom("vault", 2, x=> x.vault === "armoury");
  const d = G.D.doors.find(x=> x.locked && x.into === r.id);
  assert.ok(d && !d.open && d.room !== r.id, "the host's door into the vault is locked");
  assert.ok(G.blocked(Math.floor(d.x), Math.floor(d.y), "player"), "a locked door is a wall");
  assert.ok(DG.Dungeon.behindLock(G.D, r));
  // stand in the host room, just inside the door
  const host = G.D.rooms[d.room], s = G.freeSpot(host, d.x, d.y);
  stand(G, s.x, s.y);
  G.player.keys = 0;
  const t0 = G.target(); assert.ok(t0 && t0.o.door === d && /key/i.test(t0.text), t0 && t0.text);
  G.interact(); assert.ok(d.locked && !d.open, "no key");
  G.player.keys = 2; G.interact();
  assert.ok(!d.locked && d.open && G.player.keys === 1, "one key spent, door open");
  assert.ok(G.drain().some(e=> e.type === "unlock"));
  assert.ok(DG.Dungeon.behindLock(G.D, r), "still marked as a vault on the map");
  // both pedestals: take one, the other stays
  const peds = r.props.filter(p=> p.kind === "pedestal");
  assert.equal(peds.length, 2);
  stand(G, peds[0].x + 0.5, peds[0].y + 1.2); G.interact();
  assert.ok(peds[0].taken && !peds[1].taken && !peds[1].sunk, "a vault isn't a choice: both are yours");
  stand(G, peds[1].x + 0.5, peds[1].y + 1.2); G.interact();
  assert.ok(peds[1].taken);
});

test("a golden chest wants a key of its own", ()=>{
  const { G, r } = specialRoom("combat", 3, x=> x.props.some(p=> p.kind === "chest" && p.keyLock));
  const c = propOf(r, "chest", p=> p.keyLock);
  stand(G, c.x + 0.5, c.y + 1.1);
  G.player.keys = 0;
  assert.ok(/key/i.test(G.target().text));
  G.interact(); assert.ok(!c.open && c.keyLock, "stays shut without a key");
  G.player.keys = 1; G.interact();
  assert.ok(c.open && !c.keyLock && G.player.keys === 0, "a key opens it");
  assert.ok(G.drain().some(e=> e.type === "chestUnlock"));
});

test("the Red Throne: a godly gift with its price shown, and the price is paid forever", ()=>{
  const prices = new Set();
  for(const want of ["halved", "blind", "hunted", "benighted"]){
    let done = false;
    for(let s=1; s<500 && !done; s++){
      const G = game("THRONE" + s, 2 + (s % 3)), r = G.D.rooms.find(x=> x.type === "throne"); if(!r) continue;
      const ped = propOf(r, "pedestal");
      assert.equal(DG.ITEMS[ped.offer.id].tier, 4, "a godly item");
      assert.ok(DG.PACTS[ped.offer.pact]); prices.add(ped.offer.pact);
      assert.ok(G.offerText(ped.offer).indexOf(DG.PACTS[ped.offer.pact].name) >= 0, "the price is shown");
      if(ped.offer.pact !== want) continue;
      done = true; G.god = true;
      const p = G.player;
      stand(G, ped.x + 0.5, ped.y + 1.3); G.room = r;
      const withGift = Math.max(20, DG.PLAYER.hp + DG.Items.build(Object.assign({ [ped.offer.id]:1 }, p.items), p.boons, []).hp);
      G.interact();
      assert.ok(ped.taken && p.items[ped.offer.id], "the gift is yours");
      assert.ok(G.drain().some(e=> e.type === "pact"));
      assert.deepEqual(p.pacts, [want]);
      if(want === "halved") assert.equal(p.maxHp, Math.max(20, withGift - Math.floor(withGift/2)), "max health halved");
      if(want === "blind"){ assert.ok(G.curses.indexOf("lost") >= 0); G.descend(); assert.ok(G.curses.indexOf("lost") >= 0, "still blind a floor down"); }
      if(want === "benighted"){ G.descend(); assert.ok(G.curses.indexOf("dark") >= 0 && G.curses.indexOf("fog") >= 0, "dark and fog a floor down"); }
      if(want === "hunted"){
        G.descend();
        const all = G.D.rooms.filter(x=> x.type === "combat").flatMap(x=> x.waves.flat());
        assert.ok(all.filter(s=> s.elite).length/all.length > 0.4, "half the horde is elite");
      }
    }
    assert.ok(done, "found a throne demanding " + want);
  }
  assert.equal(prices.size, 4);
});

test("the caged treasure springs a brutal ambush, and clearing it opens the doors again", ()=>{
  const { G, r } = specialRoom("cage", 2);
  const ped = propOf(r, "pedestal");
  assert.ok(ped.cage && ped.offer.kind === "item");
  stand(G, ped.x + 0.5, ped.y + 1.3); step(G, 0.1);
  G.interact();
  assert.ok(ped.taken && G.player.items[ped.offer.id]);
  assert.ok(r.active && r.waves.length === 2 && r.doors.every(id=> !G.D.doors[id].open), "the doors slam shut");
  assert.ok(r.waves.flat().some(s=> s.elite), "elites among them");
  for(let k=0;k<20 && !r.cleared;k++){ step(G, 1); G.enemies.forEach(e=>{ e.spawn = 0; e.untargetable = false; G.damageEnemy(e, 1e7, {}); }); }
  assert.ok(r.cleared && r.doors.every(id=> G.D.doors[id].open), "survive it and you're free");
  G.springCage(r);
  assert.ok(!r.active, "the cage springs once");
});

test("the gambler's altar: double or nothing, and blood to raise the prize", ()=>{
  const { G, r } = specialRoom("gamble", 2);
  const dice = propOf(r, "dice"), bowl = propOf(r, "bloodbowl"), ped = G.wagerTarget(bowl);
  const p = G.player;
  assert.ok(ped && ped.offer.kind === "item");
  let wins = 0, losses = 0;
  for(let k=0;k<200;k++){
    p.gold = 50; G.gambleGold(dice);
    if(p.gold === 100) wins++; else if(p.gold === 0) losses++; else assert.fail("gold is " + p.gold);
  }
  assert.ok(wins > 60 && losses > 60, wins + " wins, " + losses + " losses");
  p.gold = 5; G.gambleGold(dice); assert.equal(p.gold, 5, "the house wants ten at least");
  // blood: either the prize climbs a tier, or 15 max health is gone
  let climbs = 0, bleeds = 0;
  for(let k=0;k<12;k++){
    const t0 = DG.ITEMS[ped.offer.id].tier;
    if(t0 >= 4) break;
    p.altarLoss = 0; G.recalc();
    const before = p.maxHp;
    G.bloodWager(bowl);
    if(DG.ITEMS[ped.offer.id].tier > t0){ climbs++; assert.equal(p.maxHp, before); } else { bleeds++; assert.equal(p.maxHp, before - 15); }
  }
  assert.ok(climbs > 0, "the prize climbed");
  stand(G, ped.x + 0.5, ped.y + 1.1); G.interact(); assert.ok(ped.taken, "and the prize is free to take");
});

test("orange messages point at secret walls (and dead ends hide them) without giving the corridor away", ()=>{
  let msgs = 0, deadEnd = 0, secrets = 0;
  for(let s=1; s<120; s++){
    const G = game("TELL" + s, 1 + (s % 5)), D = G.D;
    D.fakes.filter(f=> !f.puzzle).forEach(f=>{
      secrets++;
      const host = D.rooms[f.room];
      if(host.type === "combat" && host.links.filter(id=> D.rooms[id].type !== "secret").length === 1) deadEnd++;
      const m = host.props.find(p=> p.kind === "message" && p.honest);
      if(!m) return;
      msgs++;
      assert.ok(DG.dist(m.x + 0.5, m.y + 0.5, f.x, f.y) < 3, "an honest message sits by its wall");
      // reading it says something, and reveals nothing
      G.god = true; stand(G, m.x + 0.5, m.y + 0.6);
      G.D.rooms.forEach(r=>{ if(r.type !== "secret") r.seen = true; });
      assert.ok(/orange/.test(G.target().text));
      G.interact();
      assert.ok(G.drain().some(e=> e.type === "msg" && /orange/.test(e.text)));
      assert.ok(!f.revealed, "a message doesn't open the wall");
      assert.strictEqual(DG.Dungeon.corridorKnown(D, D.corridors[f.corridor]), false, "nor puts the corridor on the map");
    });
  }
  assert.ok(msgs > secrets*0.3 && msgs < secrets*0.8, msgs + " messages by " + secrets + " secret walls");
  assert.ok(deadEnd > secrets*0.25, "secret walls like dead-end rooms: " + deadEnd + " of " + secrets);
});

function olmGame(word, visit){
  const G0 = new DG.Game({ seedWord:word, route:"olm" });
  const G = new DG.Game({ seedWord:word, route:"olm", floor:G0.roads.plan.olmFloors[(visit || 1) - 1] });
  G.god = true;
  const r = G.D.rooms.find(x=> x.type === "olm");
  return { G, r, o:propOf(r, "olm") };
}
test("Brother Olm: talk, a scroll for gold, a blessing, a trade a tier up, a mend, a key, and goodbye", ()=>{
  const { G, r, o } = olmGame("OLMTALK");
  const p = G.player;
  assert.ok(r.library, "he keeps a library");
  G.giveItem("spinach", true);
  stand(G, o.x + 0.5, o.y + 1.3); step(G, 0.1);
  assert.ok(/Olm/.test(G.target().text));
  G.interact();
  assert.equal(G.state, "choose"); assert.equal(G.choice.kind, "olm");
  assert.ok(G.choice.line.length > 10);
  const idx = act=> G.choice.options.findIndex(x=> x.act === act);
  // listening: never the same twice
  const lines = new Set();
  for(let k=0;k<6;k++){ G.choose(idx("listen")); assert.ok(!lines.has(G.choice.line), "a new line each time"); lines.add(G.choice.line); }
  // a scroll: a powerup for gold, once a visit
  const items0 = Object.keys(p.items).length;
  p.gold = 0; G.choose(idx("scroll")); assert.equal(Object.keys(p.items).length, items0, "no gold, no scroll");
  p.gold = 999; G.choose(idx("scroll")); assert.ok(Object.keys(p.items).length > items0 && p.gold < 999, "a powerup bought");
  const g0 = p.gold; G.choose(idx("scroll")); assert.equal(p.gold, g0, "once a visit");
  // a blessing: a boon for gold (the only boons there are now)
  p.gold = 500; G.choose(idx("bless")); assert.equal(p.boons.length, 1); assert.ok(p.gold < 500);
  // a trade: give one powerup, get one a tier higher
  G.choose(idx("trade")); assert.equal(G.choice.page, "trade");
  const gi = G.choice.options.findIndex(x=> x.id === "spinach"), count = Object.keys(p.items).length;
  G.choose(gi);
  assert.ok(!p.items.spinach, "the spinach is gone");
  assert.ok(Object.keys(p.items).length === count && Object.keys(p.items).some(id=> DG.ITEMS[id].tier === 1), "a tier-1 powerup in its place");
  assert.equal(G.choice.page, "main");
  // a mend, and a key
  p.hp = 10; G.choose(idx("mend")); assert.ok(p.hp > 10);
  p.gold = 100; const k0 = p.keys; G.choose(idx("key")); assert.equal(p.keys, k0 + 1);
  assert.ok(idx("lantern") < 0, "no lantern on a first visit");
  G.choose(G.choice.leave);
  assert.equal(G.state, "play"); assert.equal(G.choice, null);
});

test("Brother Olm remembers you across runs (meta), and his trade never offers a godly item or Gribbus' tricks", ()=>{
  const { G, o } = olmGame("OLMMETA");
  G.meta.olm = 2;
  G.talkOlm(o);
  assert.equal(G.choice.line, DG.OLM.remembered);
  G.giveItem("godwand", true); G.giveItem("f_tongue", true); G.giveItem("spinach", true);
  G.choose(G.choice.options.findIndex(x=> x.act === "trade"));
  assert.ok(!G.choice.options.some(x=> x.id === "godwand" || x.id === "f_tongue"));
});

test("the frog pond is a jungle: ferns, lotus, vines, a waterfall, and no grim clutter", ()=>{
  for(let f=1; f<=5; f++){
    let D, r;
    for(let s=0; !r; s++){ D = DG.Dungeon.generate(777 + f*1000 + s, f); r = D.rooms.find(x=> x.type === "pond"); }
    assert.ok(r.jungle);
    const kinds = D.decor.filter(d=> d.room === r.id).map(d=> d.kind);
    ["bigfern", "lotus", "waterfall", "junglevines", "mossylog"].forEach(k=> assert.ok(kinds.indexOf(k) >= 0, "floor " + f + " pond has " + k));
    ["bones", "skullpile", "myceliumcorpse", "cordyceps", "fungalcorpse", "deadknight"].forEach(k=> assert.ok(kinds.indexOf(k) < 0, "no " + k + " in the pond"));
  }
});

test("the bot doesn't swap two equal guns back and forth forever (it once stood in a treasure room for 25 minutes)", ()=>{
  const G = game("SWAPPER"); G.god = true; park(G);
  const p = G.player;
  // three guns already: taking another drops the one in hand at Zippy's feet
  while(p.guns.length < DG.PLAYER.maxGuns) p.guns.push(Object.assign({}, p.guns[0], { uid:G.nextId++ }));
  const twin = Object.assign({}, p.guns[0], { uid:G.nextId++, name:"Twin of Old Faithful" });
  G.dropItem(p.x + 0.5, p.y, twin);
  const bot = new DG.Bot(G);
  let swaps = 0;
  for(let i=0;i<60*8;i++){ G.update(1/60, bot.input(1/60)); swaps += G.drain().filter(e=> e.type === "pickup" && e.kind === "gun").length; }
  assert.ok(swaps <= 1, swaps + " swaps");
});

/* ---- doorways ---- */
test("every doorway has a clear lane in: no pillar, crate, pit, pot, trap or decor in front of a door", ()=>{
  for(let s=1;s<=60;s++){
    const floor = 1 + (s % 5), D = DG.Dungeon.generate(s*48271 >>> 0, floor);
    if(!D) continue;
    D.rooms.forEach(r=>{
      const lanes = DG.Dungeon.doorLanes(D, r);
      lanes.forEach(L=>{
        for(let y=Math.max(L.y0, r.y1); y<=Math.min(L.y1, r.y2); y++) for(let x=Math.max(L.x0, r.x1); x<=Math.min(L.x1, r.x2); x++){
          const t = D.at(x, y);
          if(r.type !== "puzzle") assert.ok(t !== T.BLOCK && t !== T.PIT && t !== T.BREAK, `seed ${s} floor ${floor} ${r.type} room: tile ${t} at ${x},${y} in a doorway`);
          assert.ok(!r.traps.some(tr=> tr.kind !== "darts" && tr.x === x && tr.y === y), `seed ${s}: a trap in a doorway`);
        }
      });
      D.decor.filter(d=> d.room === r.id).forEach(d=> assert.ok(!DG.Dungeon.inDoorway(D, r, d.x, d.y, d.wall ? 0 : 0.2), `seed ${s} floor ${floor} ${r.type}: ${d.kind} at ${d.x.toFixed(1)},${d.y.toFixed(1)} in a doorway`));
      r.props.filter(p=> p.kind === "sign").forEach(p=> assert.ok(!DG.Dungeon.inDoorway(D, r, p.x + 0.5, p.y + 0.5), `seed ${s}: a sign in a doorway`));
    });
  }
});

/* ---- lairs ---- */
test("every floor has a lair, a dead end off the path, with a mini-boss of that floor", ()=>{
  for(let f=1; f<=5; f++) for(let s=1; s<=6; s++){
    const D = DG.Dungeon.generate(s*7349 + f, f); if(!D) continue;
    const L = D.rooms.filter(r=> r.type === "lair");
    assert.equal(L.length, 1, "floor " + f);
    const r = L[0];
    assert.equal(r.links.length, 1, "a dead end");
    assert.ok(DG.LAIRS[r.lair].floors.indexOf(f) >= 0, r.lair + " belongs on floor " + f);
    assert.ok(!r.cleared);
  }
});
test("a lair locks you in with its mini-boss: big, protected like a boss, no portal; its hoard pays out", ()=>{
  Object.keys(DG.LAIRS).forEach(id=>{
    const L = DG.LAIRS[id], f = L.floors[0];
    let G = null, r = null;
    for(let s=1; s<60 && !r; s++){ const H = game("LAIR" + id + s, f); const x = H.D.rooms.find(o=> o.type === "lair" && o.lair === id); if(x){ G = H; r = x; } }
    if(!r){ r = (G = game("LAIRX" + id, f)).D.rooms.find(o=> o.type === "lair"); r.lair = id; }
    G.god = true; G.player.x = r.cxw; G.player.y = r.y2 - 0.5;
    step(G, 0.2);
    assert.ok(r.active, id + ": locked in");
    const minis = G.enemies.filter(e=> e.room === r.id && !e.dead);
    assert.equal(minis.length, L.count || 1, id);
    minis.forEach(e=>{ assert.ok(e.mini && e.big && !e.boss && e.lair === id); assert.ok(e.r > DG.ENEMIES[L.base].radius*1.3); });
    // it fights for a while without anything going wrong
    for(let i=0;i<60*8;i++){ G.update(1/60, {}); G.drain(); }
    G.enemies.filter(e=> e.room === r.id && !e.dead).forEach(e=>{ assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.hp), id + " stays finite"); });
    // a pit doesn't take it
    // ...kill them all: no portal, but a hoard
    G.enemies.filter(e=> e.room === r.id && !e.dead).forEach(e=> G.killEnemy(e, {}));
    step(G, 0.5);
    assert.ok(!G.portal, id + ": a lair isn't a boss");
    assert.ok(r.cleared && !r.active);
    assert.ok(r.props.some(p=> p.kind === "pedestal"), id + ": a prize");
    assert.ok(G.pickups.some(k=> k.kind === "key"), id + ": a key");
  });
});
test("the Reliquary Warden's shield: from the front, a shot barely scratches; from behind, full", ()=>{
  const G = game("WARDEN", 3), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  const e = G.spawnEnemy(r, { type:"skeleton", x:spot.x, y:spot.y, size:1.9, hpMul:21, lair:"warden" }); e.spawn = 0; e.face = 0;   // facing east
  const hp0 = e.hp;
  G.damageEnemy(e, 100, { ax:-1, ay:0 });          // a shot travelling west hits his front
  const front = hp0 - e.hp;
  G.damageEnemy(e, 100, { ax:1, ay:0 });           // a shot travelling east hits his back
  const back = hp0 - front - e.hp;
  assert.ok(front < back*0.3, "front " + front + ", back " + back);
});

/* ---- the Gribbus build ---- */
test("Bog Pact: Gribbus hits 75% harder, Zippy's own shots 30% softer", ()=>{
  const G = game("BOGPACT"), r = combatRoom(G), s = G.freeSpot(r, r.cxw, r.cyw); G.room = r;
  const p0 = DG.Gribbus.power(G);
  const e1 = addEnemy(G, r, s.x, s.y); e1.hp = e1.maxHp = 1e6; G.damageEnemy(e1, 100, {}); const zip0 = 1e6 - e1.hp;
  G.giveItem("bogpact", true);
  assert.ok(Math.abs(DG.Gribbus.power(G)/p0 - 1.75) < 0.01);
  const e2 = addEnemy(G, r, s.x, s.y); e2.hp = e2.maxHp = 1e6; G.damageEnemy(e2, 100, {}); const zip1 = 1e6 - e2.hp;
  assert.ok(Math.abs(zip1/zip0 - 0.7) < 0.01, "Zippy's shot");
  const e3 = addEnemy(G, r, s.x, s.y); e3.hp = e3.maxHp = 1e6; G.damageEnemy(e3, 100, { from:"gribbus" });
  assert.ok(Math.abs((1e6 - e3.hp) - zip0) < 0.01, "his licks aren't taxed");
});
test("Familiar's Due: what Zippy hits, Gribbus' next hit does double, once", ()=>{
  const G = game("FAMILIAR"), r = combatRoom(G), s = G.freeSpot(r, r.cxw, r.cyw); G.room = r;
  G.giveItem("familiar", true);
  const e = addEnemy(G, r, s.x, s.y); e.hp = e.maxHp = 1e6;
  G.damageEnemy(e, 10, { from:"gribbus" }); const plain = 1e6 - e.hp;
  G.damageEnemy(e, 1, {});                                   // Zippy marks it
  let before = e.hp; G.damageEnemy(e, 10, { from:"gribbus" }); assert.ok(Math.abs((before - e.hp) - plain*2) < 0.01, "double");
  before = e.hp; G.damageEnemy(e, 10, { from:"gribbus" }); assert.ok(Math.abs((before - e.hp) - plain) < 0.01, "once");
});
test("Swallow takes the weak whole, never a boss or a lair's beast", ()=>{
  const G = game("SWALLOW"), r = combatRoom(G), s = G.freeSpot(r, r.cxw, r.cyw); G.room = r; G.god = true;
  G.giveItem("swallow", true);
  const e = addEnemy(G, r, s.x, s.y); e.hp = e.maxHp = 100;
  G.damageEnemy(e, 80, { from:"gribbus" }); assert.ok(!e.dead);
  G.damageEnemy(e, 6, { from:"gribbus" }); assert.ok(e.dead, "14%: swallowed");
  const b = addEnemy(G, r, s.x, s.y); b.mini = b.big = true; b.hp = b.maxHp = 100;
  G.damageEnemy(b, 90, { from:"gribbus" }); assert.ok(!b.dead);
});
test("Gribbus ranks up on his own kills, and every rank makes him hit harder; Hungry Tongue feeds Zippy", ()=>{
  const G = game("RANKS"), r = combatRoom(G), s = G.freeSpot(r, r.cxw, r.cyw); G.room = r; G.god = true;
  G.giveItem("hungrytongue", true);
  const p = G.player; p.hp = 50;
  const p0 = DG.Gribbus.power(G);
  for(let i=0;i<6;i++){ const e = addEnemy(G, r, s.x, s.y); G.t += 1; G.damageEnemy(e, 1e6, { from:"gribbus" }); }
  assert.ok(G.gribbus.level >= 1, "a rank from his own kills");
  assert.ok(DG.Gribbus.power(G) > p0*1.07);
  assert.ok(p.hp >= 55, "fed");
  // Zippy's kills don't count for him
  const lv = G.gribbus.level, xp = G.gribbus.xp;
  for(let i=0;i<10;i++){ const e = addEnemy(G, r, s.x, s.y); G.damageEnemy(e, 1e6, {}); }
  assert.equal(G.gribbus.xp, xp); assert.equal(G.gribbus.level, lv);
});
test("Croaking Hex: a spell makes Gribbus croak, and it's his damage", ()=>{
  const G = game("CROAKHEX"), r = combatRoom(G), s = G.freeSpot(r, r.cxw, r.cyw); G.room = r; r.active = true; G.god = true;
  G.giveItem("croakhex", true);
  const f = G.gribbus; f.x = s.x; f.y = s.y;
  const e = addEnemy(G, r, s.x + 1.5, s.y); e.hp = e.maxHp = 1e6;
  G.player.mana = 999;
  const g = G.gun(), st = G.gunStats();
  G.castSpell(g, st, {}, false);
  assert.ok(e.hp < 1e6, "frozen and hurt");
  assert.ok(G.stats.frogDmg > 0);
});
test("a frog build finds his pond on every floor", ()=>{
  for(let s=1; s<=8; s++){
    const G = game("LEAN" + s, 1);
    G.giveItem("twister", true); G.giveItem("bogpact", true);
    const o = DG.Roads.genOpts(G, 2);
    assert.ok(o.frogBuild, "two frog things: a frog build");
    const D = DG.Dungeon.generate((G.seed + 2*104729) >>> 0, 2, o);
    assert.equal(D.rooms.filter(r=> r.type === "pond").length, 1);
  }
});

/* ---- the roads: Olm's, and the new things on them ---- */
test("Olm's route: hear all he has to say over two visits, take his lantern, and the door of eyes opens on the Flesh Library", ()=>{
  const A = olmGame("LANTERN", 1), S = A.G.olmState();
  A.G.talkOlm(A.o);
  for(let k=0;k<30;k++) A.G.choose(A.G.choice.options.findIndex(x=> x.act === "listen"));
  assert.ok(!A.G.choice.options.some(x=> x.act === "lantern"), "not on the first visit");
  // the second visit (a new floor of the same run): carry what he's said
  const B = olmGame("LANTERN", 2);
  B.G.olm = { said:Object.assign({}, S.said), visits:S.visits, idle:0 };
  const door = B.r.props.find(p=> p.kind === "eyedoor");
  assert.ok(door && !door.open, "a door of shut eyes in his library");
  stand(B.G, door.x + 0.5, door.y + 0.6);
  assert.ok(/shut eyes/.test(B.G.target().text)); B.G.interact(); assert.equal(B.G.floor, B.G.roads.plan.olmFloors[1], "shut: it goes nowhere");
  B.G.talkOlm(B.o);
  for(let k=0;k<30 && !B.G.choice.options.some(x=> x.act === "lantern"); k++) B.G.choose(B.G.choice.options.findIndex(x=> x.act === "listen"));
  const li = B.G.choice.options.findIndex(x=> x.act === "lantern");
  assert.ok(li >= 0, "everything heard: he'll give up the lantern");
  B.G.choose(li);
  assert.ok(B.G.player.quests.lantern && door.open);
  B.G.choose(B.G.choice.leave);
  stand(B.G, door.x + 0.5, door.y + 0.6); B.G.interact();
  assert.equal(B.G.floor, DG.FINAL_FLOOR + 1); assert.equal(B.G.D.theme, DG.FLESH);
  assert.ok(Object.keys(DG.FLESH.enemies).some(t=> t === "evilfrog") && DG.FLESH.enemies.ghost, "ghosts and evil frogs");
  const { b } = killBoss(B.G);
  assert.equal(b.type, "archivist");
  takePortal(B.G);
  assert.equal(B.G.ending, "white");
});

test("creepy shots: hang in the air then dart at you, bend, or burst; all of them dodgeable", ()=>{
  const G = game("CREEPY", 3), r = combatRoom(G); park(G);
  const p = G.player; p.x = r.cxw; p.y = r.cyw; G.room = r; r.active = true;
  const b = G.addBullet({ team:"e", x:p.x - 5, y:p.y, vx:3, vy:0, r:0.18, dmg:5, life:4, kind:"soul", stall:{ at:0.2, hold:0.6, speed:8 } });
  step(G, 0.4);
  assert.equal(Math.hypot(b.vx, b.vy), 0, "it hangs");
  p.y += 3;   // you move while it hangs
  step(G, 0.5);
  const a = Math.atan2(b.vy, b.vx), want = Math.atan2(p.y - b.y, p.x - b.x);
  assert.ok(Math.abs(DG.wrapAngle(a - want)) < 0.3, "then it comes for where you are now");
  const c = G.addBullet({ team:"e", x:p.x - 5, y:p.y - 4, vx:4, vy:0, r:0.18, dmg:5, life:4, kind:"bile", curve:1.5 });
  step(G, 0.5);
  assert.ok(Math.abs(c.vy) > 0.5, "a curving shot bends");
  const n0 = G.bullets.length;
  // (somewhere open, so no pillar eats it first)
  const sp = G.freeSpot(r, p.x - 3, p.y - 2);
  G.addBullet({ team:"e", x:sp.x, y:sp.y, vx:0.5, vy:0, r:0.18, dmg:5, life:4, kind:"acid", split:{ at:0.2, n:3, spread:60, speed:0.5 } });
  step(G, 0.3);
  assert.ok(G.bullets.filter(x=> x.kind === "acid").length === 3, "a splitting shot bursts into three");
  assert.ok(G.bullets.length >= n0);
});

test("the new foes and bosses fight without anything going NaN", ()=>{
  [["wight", 3], ["evilfrog", 4]].forEach(([type, floor])=>{
    const G = game("NEWFOE" + type, floor), r = combatRoom(G); G.god = true;
    const s = G.freeSpot(r, r.cxw, r.cyw); stand(G, s.x, s.y); G.room = r; r.active = true; G.enemies = [];
    const e = addEnemy(G, r, s.x + 3, s.y); e.ai.cd = 0;
    step(G, 8);
    assert.ok(isFinite(e.x) && isFinite(e.y) && !isNaN(e.hp), type);
    assert.ok(G.bullets.some(b=> b.team === "e") || G.stats.time > 0);
  });
  [["toadking", DG.BOG], ["archivist", DG.FLESH]].forEach(([key, theme])=>{
    const G = game("BOSS" + key, 5); G.god = true;
    G.side = key === "toadking" ? "bog" : "flesh"; G.enterFloor(DG.FINAL_FLOOR + 1);
    assert.equal(G.D.theme, theme);
    const r = G.D.rooms.find(x=> x.type === "boss"); const s = G.freeSpot(r, r.cxw, r.cyw + 3); stand(G, s.x, s.y);
    for(let i=0;i<60*25;i++){ G.update(1/60, { mx:Math.sin(i/40), my:Math.cos(i/50) }); G.drain(); }
    const b = G.bossRef;
    assert.ok(b && b.type === key && isFinite(b.x) && G.inRoom(r, b.x, b.y), key + " stays in its room");
    b.hp = b.maxHp*0.2; step(G, 3);
    G.killEnemy(b, {}); step(G, 0.5);
    assert.ok(G.portal, key + " can be killed");
  });
});

test("Toxic Spit's globs are poison, and every frog shot's element is a real one", ()=>{
  const G = game("SPITTER", 1);
  DG.Gribbus.giveBuff(G, "spit");
  assert.equal(G.gribbus.g.spitEl, "poison");
  const r = combatRoom(G); park(G);
  G.player.x = r.cxw; G.player.y = r.cyw; G.room = r; r.active = true; G.god = true;
  const f = G.gribbus; f.x = r.cxw - 2; f.y = r.cyw;
  const e = addEnemy(G, r, r.cxw + 3, r.cyw); e.hp = e.maxHp = 1e6; e.speed = 0; e.ai.cd = 99;
  const els = [];
  for(let i=0;i<60*6;i++){ G.update(1/60, {}); G.bullets.forEach(b=>{ if(b.from === "gribbus") els.push(...(b.els || [])); }); G.drain(); }
  assert.ok(els.indexOf("poison") >= 0, "a poison glob: " + JSON.stringify(els.slice(0, 5)));
  assert.ok(els.every(x=> DG.ELEMENTS[x]), JSON.stringify(els.filter(x=> !DG.ELEMENTS[x]).slice(0, 3)));
});
test("the Rite of the Keeper: every fifth spell is a Lantern Beam", ()=>{
  const G = game("KEEPER", 2); G.god = true; G.player.boons.push("rite_keeper"); G.recalc();
  let beams = 0;
  for(let i=0;i<10;i++){ G.player.mana = 999; G.castSpell(G.gun(), G.gunStats(), {}, false); beams += G.drain().filter(e=> e.type === "lanternBeam").length; }
  assert.equal(beams, 2);
});

// regression: diving into the black pond put you in the shrine with its outer door
// unsealed but still shut, and nothing could open it: you were shut in for good

/* ---- the other bosses and the newer lairs ---- */
test("each floor has two bosses, and the seed picks which: both turn up across seeds", ()=>{
  for(let f=1; f<=4; f++){
    const seen = new Set();
    for(let s=1; s<40; s++) seen.add(game("ALT" + s, f).D.theme.boss);
    assert.deepEqual([...seen].sort(), [DG.FLOORS[f - 1].boss, DG.FLOORS[f - 1].alt].sort(), "floor " + f);
    assert.ok(DG.BOSSES[DG.FLOORS[f - 1].alt], DG.FLOORS[f - 1].alt + " is a boss");
  }
  assert.equal(game("ALT1", 5).D.theme.boss, "heart");
});
test("the Kennel Hound pounces onto where Zippy stood, and lands", ()=>{
  const G = game("HOUND", 1), r = combatRoom(G), spot = G.freeSpot(r, r.cxw, r.cyw);
  G.player.x = spot.x; G.player.y = spot.y; G.god = true;
  const s2 = G.freeSpot(r, spot.x + 5, spot.y);
  const e = G.spawnEnemy(r, { type:"sneak", x:s2.x, y:s2.y, size:2.4, hpMul:20, lair:"hound" }); e.spawn = 0;
  e.ai.pounceCd = 0;
  let flew = false, landed = false;
  for(let i=0;i<60*3 && !landed;i++){
    G.update(1/60, {}); const ev = G.drain();
    if(e.airborne) flew = true;
    if(ev.some(v=> v.type === "land" && v.id === e.id)) landed = true;
  }
  assert.ok(flew && landed, "it leapt and came down");
  assert.ok(!e.airborne && e.hop === 0);
  assert.ok(DG.dist(e.x, e.y, spot.x, spot.y) < 1.5, "on Zippy's spot");
});
test("the Gravedigger's spade opens a grave that drags at Zippy's feet; the dead climb out of it", ()=>{
  const G = game("GRAVE", 3);
  G.D.theme = Object.assign({}, G.D.theme, { boss:"gravedigger" });
  const r = G.D.rooms.find(x=> x.type === "boss");
  G.player.x = r.cxw; G.player.y = r.y2 - 0.5; G.god = true;
  step(G, 1.6);
  const b = G.bossRef; assert.equal(b.type, "gravedigger");
  b.ai.k = -1; b.ai.cd = 0; b.ai.state = "walk";     // its next move: a dig
  step(G, 1.2, {});
  const grave = G.hazards.find(h=> h.kind === "grave");
  assert.ok(grave, "a grave");
  G.player.x = grave.x; G.player.y = grave.y; G.player.chill = 0;
  G.updateHazards(1/60);
  assert.ok(G.player.chill > 0, "it slows");
  // raise: whatever is in the graves gets up
  G.addHazard({ kind:"grave", x:grave.x + 1, y:grave.y, r:0.85, t:14, team:"e" });
  b.ai.state = "raise"; b.ai.t = 0.01;
  const n0 = G.enemies.filter(e=> !e.dead && e.type === "skeleton").length;
  step(G, 0.1, {});
  assert.ok(G.enemies.filter(e=> !e.dead && e.type === "skeleton").length > n0, "skeletons rise");
});

/* ---- hitches on Windows ---- */
test("no lights are added after load: a new light changes the light count and recompiles every lit shader (the White Wizard's ending froze for a second)", ()=>{
  const fs = require("fs"), path = require("path"), dir = path.join(__dirname, "..", "js", "render");
  fs.readdirSync(dir).filter(f=> /\.js$/.test(f) && f !== "stage.js" && f !== "gallery.js").forEach(f=>{
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    assert.ok(!/new THREE\.(Point|Spot|Directional|Hemisphere|RectArea)Light/.test(src), f + " makes a light: borrow one of Stage's torches (S.held) instead");
  });
});
test("every 2D canvas is drawn on the CPU: on the GPU, Chrome compiled a DirectX shader for each new kind of stroke or gradient, mid-fight", ()=>{
  const fs = require("fs"), path = require("path"), root = path.join(__dirname, "..", "js");
  const files = [];
  (function walk(d){ fs.readdirSync(d).forEach(f=>{ const p = path.join(d, f); if(fs.statSync(p).isDirectory()) walk(p); else if(/\.js$/.test(f) && f !== "perf.js") files.push(p); }); })(root);
  files.forEach(f=>{
    const src = fs.readFileSync(f, "utf8"), bad = src.match(/getContext\(\s*["']2d["']\s*\)/g);
    assert.ok(!bad, path.relative(root, f) + ": getContext(\"2d\") without { willReadFrequently:true }");
  });
});

/* ---- puzzles that take a while ---- */
test("the Liar's Doors: four doors when the room is wide (five deep down); one answer, and no single face gives it away", ()=>{
  [1, 3].forEach(f=>{
    const colors = DG.DOOR_COLORS.slice(0, f >= 3 ? 5 : 4);
    for(let s=0; s<6; s++){
      const rid = DG.Puzzles.liarRiddle(DG.RNG(77 + s*13 + f), f <= 1 ? "one" : "honest", colors);
      assert.ok(rid, "a riddle for " + colors.length + " doors");
      const ws = DG.Puzzles.riddleWorlds(f <= 1 ? "one" : "honest", rid.says, colors);
      assert.equal(ws.length, 1); assert.equal(ws[0].a, rid.answer);
    }
  });
});
test("the Weighing Stones crack: each takes its share of the answer and a few more, then the next shove crumbles it, puts the stones back and wakes the room", ()=>{
  const { G, r } = puzzleRoom("stones", 2), pz = r.puzzle;
  assert.ok(pz.blocks.length >= 3 && pz.solution.length >= 16, pz.blocks.length + " stones, " + pz.solution.length + " shoves");
  pz.blocks.forEach((b, i)=> assert.ok(b.hp >= 4, "stone " + i + ": " + b.hp));
  const b = pz.blocks[0];
  b.hp = 0;
  // shove it from wherever it can go
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], d = dirs.find(([dx, dy])=> G.D.at(b.x + dx, b.y + dy) === DG.TILE.FLOOR);
  const sx = b.sx, sy = b.sy;
  DG.Puzzles.push(G, b.x, b.y, d[0], d[1]);
  assert.ok(b.x === sx && b.y === sy && b.hp === b.hp0, "back where it started, whole");
  assert.ok(r.active, "the noise woke the room");
  assert.ok(pz.flawless === false);
});
test("the Choir sings five notes to start, four rounds, and from floor 3 wants them back to front", ()=>{
  const a = puzzleRoom("choir", 1).r.puzzle, b = puzzleRoom("choir", 3).r.puzzle;
  assert.equal(a.len, 5); assert.equal(a.rounds, 4); assert.ok(!a.reverse);
  assert.ok(b.reverse && b.len >= 6);
});

/* ---- the elements: abilities, and spells that grow ---- */
test("fifty abilities of the elements, ten each, and every one counts toward its element's attunement", ()=>{
  const ids = ["cinderskin", "kindling", "brand", "flamestep", "pyroglove", "ashcrown", "phoenix", "salamander", "hearthstone", "sunsigil",
    "frostmitts", "rimeshard", "glacialplate", "snowdrift", "iciclecrown", "wintersbite", "permafrost", "hailcharm", "frozentear", "glacierheart",
    "rotfang", "toadvenom", "blightgloves", "plaguemask", "sporesack", "bileflask", "creepmold", "cauldron", "leechring", "motherrot",
    "copperwire", "staticgloves", "stormboots", "lightningrod", "teslacoil", "thunderdrum", "galvanic", "sparklantern", "voltheart", "stormcrown",
    "hexthread", "runebangle", "magemirror", "blinkglyph", "eldritcheye", "grimoire", "voidlens", "astralchime", "echosigil", "magusstar"];
  assert.equal(new Set(ids).size, 50);
  const per = {};
  ids.forEach(id=>{ const d = DG.ITEMS[id]; assert.ok(d, id); const e = Object.keys(DG.Items.elSources(d)); assert.equal(e.length, 1, id + " is of one element"); per[e[0]] = (per[e[0]] || 0) + 1; });
  DG.ELEMENT_ORDER.forEach(e=> assert.equal(per[e], 10, e));
});
test("the right-click spell grows with attunement: four tiers of each, every one cast in a fight without anything going NaN", ()=>{
  DG.ELEMENT_ORDER.forEach(el=>{
    const key = DG.ELEMENTS[el].spell;
    assert.equal(DG.SPELLS[key].tiers.length, 4, key);
    // (the wand itself counts as one source of its element, so one core is tier I already;
    // tier 0 is the bare wand, arcane)
    for(let tier=el === "arcane" ? 0 : 1; tier<4; tier++){
      const G = game("SPELL" + el + tier, 2), r = combatRoom(G); G.god = true;
      const s0 = G.freeSpot(r, r.cxw, r.cyw); G.player.x = s0.x; G.player.y = s0.y; G.room = r; r.active = true;
      for(let i=0;i<4;i++) addEnemy(G, r, s0.x + 2 + i*0.5, s0.y + (i % 2));
      // gather the element until it's this tier (cores: one source each)
      const core = { frost:"rimecore", fire:"embercore", poison:"venomcore", shock:"stormcore", arcane:"hexcore" }[el];
      for(let i=0; i<(el === "arcane" ? [0, 1, 3, 5][tier] : 2*tier - 1); i++) G.giveItem(core, true);
      const s = G.gunStats();
      assert.equal(G.gun().element, el); assert.equal(s.spellTier, tier, el + " tier");
      G.player.mana = 999;
      G.castSpell(G.gun(), s, { ax:s0.x + 3, ay:s0.y });
      step(G, 1.2);
      G.enemies.forEach(e=> assert.ok(!isNaN(e.hp) && isFinite(e.x), el + " " + tier));
    }
  });
});
test("Absolute Zero comes twice, and Storm Crown strikes all over the room", ()=>{
  const G = game("ZERO", 2), r = combatRoom(G); G.god = true;
  const s0 = G.freeSpot(r, r.cxw, r.cyw); G.player.x = s0.x; G.player.y = s0.y; G.room = r; r.active = true;
  for(let i=0;i<6;i++) G.giveItem("rimecore", true);
  assert.equal(DG.spellAt("nova", G.gunStats().spellTier).name, "Absolute Zero");
  G.player.mana = 999; G.drain();
  G.castSpell(G.gun(), G.gunStats(), {});
  const ev = G.drain().concat(step(G, 1));
  assert.equal(ev.filter(e=> e.type === "spell" && e.spell === "nova").length, 2, "the nova, and its second wave");
  const H = game("CROWN", 2), q = combatRoom(H); H.god = true;
  const s1 = H.freeSpot(q, q.cxw, q.cyw); H.player.x = s1.x; H.player.y = s1.y; H.room = q; q.active = true;
  const foes = []; for(let i=0;i<6;i++) foes.push(addEnemy(H, q, q.x1 + 2 + i*1.6, q.y1 + 2 + (i % 2)*3));
  for(let i=0;i<5;i++) H.giveItem("stormcore", true);
  assert.equal(DG.spellAt("chain", H.gunStats().spellTier).name, "Storm Crown");
  H.player.mana = 999; H.drain();
  H.castSpell(H.gun(), H.gunStats(), {});
  // (the room's next wave comes in once these are down, so count the ones we placed)
  assert.ok(foes.filter(e=> e.hp < e.maxHp || e.dead).length >= 4, "it reaches all over the room at once");
  const hits = new Set();
  step(H, 1.5).forEach(e=>{ if(e.type === "arc") hits.add(e.x2.toFixed(1) + "," + e.y2.toFixed(1)); });
  assert.ok(hits.size >= 3, "and the storm keeps striking after the first bolt");
});
