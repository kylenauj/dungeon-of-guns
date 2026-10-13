/* How strong do builds get, and how much do they vary? Run: npm run power [-- builds]
   Rolls the items a run to floor 4 would see (from the same pools, the same
   way), points the build at a pack of training dummies for 8 seconds, and
   reports damage per second against a no-item baseline, plus the most player
   projectiles alive at once. Quote it before and after any power change. */
const DG = require("./load.js");
const N = +process.argv[2] || 40;
const SECS = 8;

function trial(word, items, boons){
  const G = new DG.Game({ seedWord:word, floor:4 });
  G.god = true;
  items.forEach(id=> G.giveItem(id, true));
  (boons || []).forEach(id=> G.player.boons.push(id));
  G.recalc();
  const r = G.D.rooms.find(x=> x.type === "combat" && x.x2 - x.x1 >= 12) || G.D.rooms.find(x=> x.type === "combat");
  // a clear range: no furniture between Zippy and the dummies
  for(let y=r.y1; y<=r.y2; y++) for(let x=r.x1; x<=r.x2; x++) G.D.set(x, y, DG.TILE.FLOOR);
  G.D.ver = (G.D.ver || 0) + 1;
  G.player.x = r.x1 + 2.5; G.player.y = Math.floor(r.cyw) + 0.5;
  r.active = true; G.room = r; G.enemies = [];
  for(let i=0;i<8;i++){
    const e = G.spawnEnemy(r, { type:"brute", x:r.x1 + 9 + (i % 4)*0.9, y:Math.floor(r.cyw) + 0.5 + (Math.floor(i/4) - 0.5)*1.4 });
    e.spawn = 0; e.hp = e.maxHp = 1e9; e.def = Object.assign({}, e.def, { speed:0 }); e.speed = 0; e.ai = { leash:true };
    e.update = null;
  }
  const tx = r.x1 + 10.5, ty = Math.floor(r.cyw) + 0.5;
  let peak = 0;
  const steps = SECS*60;
  for(let s=0; s<steps; s++){
    G.enemies.forEach(e=>{ if(!e.boss){ e.x = e.x0 === undefined ? (e.x0 = e.x) : e.x0; e.y = e.y0 === undefined ? (e.y0 = e.y) : e.y0; e.cd = 99; if(e.ai) e.ai.t = 0; } });
    G.update(1/60, { fire:true, ax:tx, ay:ty, mx:0, my:0 });
    G.drain();
    if(G.state === "choose") G.choose(0);
    let n = 0; for(const b of G.bullets) if(b.team === "p") n++;
    peak = Math.max(peak, n);
  }
  return { dps:G.stats.dmg/SECS, peak };
}

function rollBuild(i){
  const G = new DG.Game({ seedWord:"PWR" + i, floor:1 });
  const items = [];
  // what a run sees by floor 4: a treasure item a floor (two from floor 3), a boss item a floor,
  // a couple bought, sometimes a secret room's or an altar's
  const plan = ["t", "b", "t", "s", "b", "t", "t", "s", "b", "t"];
  if(G.rng.chance(0.6)) plan.push("x");
  if(G.rng.chance(0.3)) plan.push("a");
  plan.forEach((pool, k)=>{ G.floor = 1 + Math.floor(k/3); items.push(DG.Items.roll(G, pool)); });
  const boons = []; for(let k=0;k<9;k++){ const o = DG.Items.rollBoons(G, 3); boons.push(o[0]); G.player.boons.push(o[0]); }
  return { items, boons };
}

const base = trial("BASE", [], []);
console.log("baseline (no items): " + base.dps.toFixed(0) + " dps, " + base.peak + " shots at once");
const rows = [];
for(let i=0;i<N;i++){
  const b = rollBuild(i), t = trial("PWR" + i, b.items, b.boons);
  rows.push({ x:t.dps/base.dps, peak:t.peak, items:b.items });
  if(process.argv.indexOf("-v") >= 0) console.log(("PWR" + i).padEnd(6), (t.dps/base.dps).toFixed(1).padStart(6) + "x", String(t.peak).padStart(4) + " shots", b.items.join(" "));
}
const xs = rows.map(r=> r.x).sort((a, b)=> a - b), pk = rows.map(r=> r.peak).sort((a, b)=> a - b);
const pct = (a, q)=> a[Math.min(a.length - 1, Math.floor(q*a.length))];
console.log("\nbuild power vs baseline over " + N + " floor-4 builds:");
console.log("  weakest " + xs[0].toFixed(1) + "x   p10 " + pct(xs, 0.1).toFixed(1) + "x   median " + pct(xs, 0.5).toFixed(1) + "x   p90 " + pct(xs, 0.9).toFixed(1) + "x   strongest " + xs[xs.length - 1].toFixed(1) + "x");
console.log("  peak shots alive: median " + pct(pk, 0.5) + "   p90 " + pct(pk, 0.9) + "   max " + pk[pk.length - 1]);
const top = rows.slice().sort((a, b)=> b.x - a.x)[0];
console.log("  strongest build: " + top.items.join(", "));
