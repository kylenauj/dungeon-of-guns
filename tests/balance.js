/* How far does a decent bot get, no cheats? Run: npm run balance [-- runs] [frog]
   (frog: a frog run, the bot taking Gribbus' things wherever it has the choice)
   Tune one knob at a time and quote the numbers before and after. */
const DG = require("./load.js");
const runs = +process.argv[2] || 12, frog = process.argv.indexOf("frog") >= 0;
const pickBoon = G=>{
  if(!frog || !G.choice || !G.choice.options) return 0;
  const i = G.choice.options.findIndex(o=> typeof o === "string" && /^b_(frog|bond)/.test(o));
  return i >= 0 ? i : 0;
};
const floors = [], causes = {}, frogShare = [];
for(let i=0;i<runs;i++){
  const G = new DG.Game({ seedWord:"BAL" + i }), bot = new DG.Bot(G, { frog });
  for(let s=0; s<60*1500 && (G.state === "play" || G.state === "choose"); s++){ if(G.state === "choose") G.choose(pickBoon(G)); G.update(1/60, bot.input(1/60)); G.drain(); }
  floors.push(G.floor + (G.state === "won" ? 1 : 0));
  causes[G.lastHurt || "-"] = (causes[G.lastHurt || "-"] || 0) + (G.state === "dead" ? 1 : 0);
  if(frog) frogShare.push((G.stats.frogDmg || 0)/Math.max(1, G.stats.dmg));
  console.log("BAL" + i, G.state.padEnd(5), "floor", G.floor, "kills", String(G.stats.kills).padStart(3), "time", Math.round(G.stats.time) + "s", "gun", G.gun().name, Math.round(DG.Loot.dps(G.gun(), G.mods)) + "dps", "items", G.stats.items, "lvl", G.player.level);
}
const avg = floors.reduce((a, b)=> a + b, 0)/floors.length;
console.log("\naverage floor reached:", avg.toFixed(2), " killed by:", JSON.stringify(causes));
if(frog){ const f = frogShare.sort((a, b)=> a - b); console.log("Gribbus did a median " + Math.round(f[f.length >> 1]*100) + "% of the damage (" + Math.round(f[0]*100) + "% to " + Math.round(f[f.length - 1]*100) + "%)"); }
