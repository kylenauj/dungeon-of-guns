/* How far does a decent bot get, no cheats? Run: npm run balance [-- runs]
   Tune one knob at a time and quote the numbers before and after. */
const DG = require("./load.js");
const runs = +process.argv[2] || 12;
const floors = [], causes = {};
for(let i=0;i<runs;i++){
  const G = new DG.Game({ seedWord:"BAL" + i }), bot = new DG.Bot(G);
  for(let s=0; s<60*1500 && (G.state === "play" || G.state === "choose"); s++){ if(G.state === "choose") G.choose(0); G.update(1/60, bot.input(1/60)); G.drain(); }
  floors.push(G.floor + (G.state === "won" ? 1 : 0));
  causes[G.lastHurt || "-"] = (causes[G.lastHurt || "-"] || 0) + (G.state === "dead" ? 1 : 0);
  console.log("BAL" + i, G.state.padEnd(5), "floor", G.floor, "kills", String(G.stats.kills).padStart(3), "time", Math.round(G.stats.time) + "s", "gun", G.gun().name, Math.round(DG.Loot.dps(G.gun(), G.mods)) + "dps", "items", G.stats.items, "lvl", G.player.level);
}
const avg = floors.reduce((a, b)=> a + b, 0)/floors.length;
console.log("\naverage floor reached:", avg.toFixed(2), " killed by:", JSON.stringify(causes));
