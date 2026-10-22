/* ------------------------------------------------------------------ *
 *  The roads down: the side endings, as chains of things you do
 *  (docs/ENDINGS.md). Each road has steps; a step done is remembered for
 *  the run (G.roads) and, once ever reached, between runs (meta.roads).
 *
 *  The Rot (KING OF THE BOG): Gribbus drinks from the Gloom Lily, feeds
 *  on his own kills, molts at the ponds, dives for the Drowned Shrine's
 *  crown past the Leech Mother, and eats the Heart.
 *
 *  The Lantern (THE FIRST FLAME) is Brother Olm's road (phase 4).
 *
 *  The points of no return: the first molt shuts the Lantern road; the
 *  first wick lit shuts the Rot.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const Roads = DG.Roads = {};

DG.ROT = {
  // hunger needed to molt from each stage (frog kill worth: an enemy's cost)
  need:[0, 26, 44],
  stages:[
    null,
    { name:"Rot I",   title:"Tainted", g:{ dmg:0.25 } },
    { name:"Rot II",  title:"Split",   g:{ dmg:0.35, rate:0.15 } },
    { name:"Rot III", title:"Bloated", g:{ dmg:0.5, size:0.5 } }
  ],
  lines:{
    lily:"Gribbus drinks from the black lily. Something in him goes quiet. Something else wakes up.",
    hungry:"Gribbus is hungry. Not for flies.",
    molt2:"Gribbus splits his skin in the black water. What climbs out has a second mouth.",
    molt3:"Gribbus swells. The pond shrinks away from him.",
    sealed:"The door is sealed with black water. It won't take a key. Gribbus is staring at the pond.",
    dive:"Gribbus slides into the black water. You follow him down.",
    crown:"Gribbus puts on the Crown. It fits him now. It didn't, before.",
    lanternShut:"Somewhere above, an old man puts out a lamp."
  },
  steps:[
    { id:"lily",   text:"Drink from the Gloom Lily, at a frog pond, floors 1 to 3" },
    { id:"molt2",  text:"Feed him (his own kills) until he molts at a pond: Rot II" },
    { id:"crown",  text:"Dive into the black pond for the Drowned Shrine, and take its crown" },
    { id:"molt3",  text:"Feed him again: Rot III (not needed, but he's worse for it)" },
    { id:"feast",  text:"Let him eat the Heart" }
  ]
};

Roads.init = function(){
  return { rot:{ stage:0, hunger:0, closed:false, crown:false }, lantern:{ stage:0, wicks:0, closed:false } };
};
/* what the next floor's generator needs to know */
Roads.genOpts = function(G, n){
  const R = G.roads, o = {};
  if(!R) return o;
  if(R.rot.stage >= 1) o.rot = R.rot.stage;
  if(R.rot.stage >= 2 && !R.rot.crown && n >= 3 && n < DG.FINAL_FLOOR) o.shrine = true;
  if(R.rot.stage >= 2 && R.rot.crown && n === DG.FINAL_FLOOR) o.drowned = true;
  return o;
};
const rem = (G, road, step)=>{
  const m = G.meta; if(!m) return;
  m.roads = m.roads || {}; m.roads[road] = m.roads[road] || {};
  m.roads[road][step] = true;
};

/* ---- the Rot ---- */
/* a frog pond: the black lily floats beside the three, while the road is open */
Roads.offerGloom = function(G, r){
  const R = G.roads.rot;
  if(R.closed || R.stage > 0 || G.floor > 3 || G.endless) return;
  const pads = r.props.filter(p=> p.kind === "lilypad"), mid = pads[1] || pads[0];
  if(!mid) return;
  const pad = G.addProp(r, { kind:"lilypad", x:mid.x, y:mid.y - 2, slot:3, gloom:true });
  pad.buff = "gloom"; pad.taken = false;
};
Roads.chooseGloom = function(G, pad){
  const R = G.roads.rot, r = G.D.rooms[pad.room];
  R.stage = 1; R.hunger = 0;
  r.corrupt = true;
  rem(G, "rot", "lily");
  G.emit("corrupt", { room:r.id, x:pad.x + 0.5, y:pad.y + 0.5 });
  G.emit("molt", { stage:1, x:G.gribbus.x, y:G.gribbus.y });
  G.say(DG.ROT.lines.lily, 4.5);
};
/* his own kills feed him */
Roads.frogKill = function(G, e){
  const R = G.roads && G.roads.rot;
  if(!R || R.stage < 1) return;
  // with the crown on, his kills hatch rot-tadpoles that fight for you
  if(R.crown && R.stage >= 2 && G.chance(0.3)) G.spawnAlly("tadpole", e.x, e.y, {});
  if(R.stage >= 3) return;
  const before = R.hunger;
  R.hunger += Math.max(1, Math.round(e.def.cost || 1));
  if(before < DG.ROT.need[R.stage] && R.hunger >= DG.ROT.need[R.stage]){ G.say(DG.ROT.lines.hungry, 3); G.emit("hungry", {}); }
};
Roads.hungerFull = G=>{ const R = G.roads.rot; return R.stage >= 1 && R.stage < 3 && R.hunger >= DG.ROT.need[R.stage]; };
/* stepping into a pond with him fed: he molts */
Roads.enterPond = function(G, r){
  const R = G.roads.rot;
  if(R.stage >= 1) r.corrupt = true;
  if(!Roads.hungerFull(G)) return;
  R.stage++; R.hunger = 0;
  rem(G, "rot", "molt" + R.stage);
  G.emit("molt", { stage:R.stage, x:G.gribbus.x, y:G.gribbus.y });
  G.say(DG.ROT.lines["molt" + R.stage], 4.5);
  if(R.stage === 2 && !G.roads.lantern.closed){ G.roads.lantern.closed = true; G.pending.push({ t:4.8, fn:()=> G.say(DG.ROT.lines.lanternShut, 3.5) }); G.emit("roadShut", { road:"lantern" }); }
};
/* what each rot stage adds to him (on top of his tricks) */
Roads.frogBonus = function(G){
  const R = G.roads && G.roads.rot, out = {};
  if(!R) return out;
  for(let s=1; s<=R.stage; s++){ const g = DG.ROT.stages[s].g; for(const k in g) out[k] = (out[k] || 0) + g[k]; }
  return out;
};
/* the shrine's door: water, not iron */
Roads.sealedDoor = function(G, d){ return d.sealed; };
/* the black pond, on a floor with a sealed shrine: E dives in after him */
Roads.consider = function(G, r, consider){
  if(r.type !== "pond" || !r.corrupt) return;
  const shrine = G.D.rooms.find(o=> o.type === "shrine" && o.road && !o.dived);
  if(!shrine) return;
  const p = G.player, d = DG.dist(r.cxw, r.cyw, p.x, p.y);
  consider({ dive:shrine.id, x:r.cxw, y:r.cyw }, d - 2.2, "Dive after Gribbus, into the black water");
};
Roads.dive = function(G, o){
  const s = G.D.rooms[o.dive]; if(!s) return;
  s.dived = true;
  // the shrine's own door opens from the inside
  G.D.doors.forEach(d=>{ if(d.into === s.id || d.room === s.id){ if(d.sealed){ d.sealed = false; d.locked = false; } } });
  const p = G.player, f = G.gribbus, at = G.freeSpot(s, s.cxw, s.y2 - 0.5);
  G.emit("dive", { x:p.x, y:p.y, x2:at.x, y2:at.y });
  p.x = at.x; p.y = at.y; p.vx = p.vy = 0; p.safeX = p.x; p.safeY = p.y;
  G.frogs.forEach((fr, i)=>{ fr.x = at.x - 0.8 + i*1.6; fr.y = at.y - 0.6; fr.hopT = 0; });
  G.say(DG.ROT.lines.dive, 3.5);
};
/* the Leech Mother is dead: the crown is there for the taking */
Roads.shrineClear = function(G, r){
  if(r.crownGiven) return;
  r.crownGiven = true;
  G.addProp(r, { kind:"pedestal", x:Math.floor(r.cxw), y:Math.floor(r.cyw), quest:"crown" });
};
Roads.takeCrown = function(G){
  G.roads.rot.crown = true;
  rem(G, "rot", "crown");
};
/* the end of the Rot: he has the crown, and he's split at least once */
Roads.canFeast = G=> !!(G.roads && G.roads.rot.crown && G.roads.rot.stage >= 2);
Roads.feast = function(G){ rem(G, "rot", "feast"); };

/* ---- for the journal ---- */
Roads.rotSteps = function(G){
  const R = G.roads.rot;
  const done = { lily:R.stage >= 1, molt2:R.stage >= 2, crown:R.crown, molt3:R.stage >= 3, feast:G.ending === "bog" };
  return DG.ROT.steps.map(s=> ({ text:s.text, done:!!done[s.id] }));
};

})(typeof window !== "undefined" ? window : globalThis);
