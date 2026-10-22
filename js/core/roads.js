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
  return { rot:{ stage:0, hunger:0, closed:false, crown:false }, lantern:{ stage:0, wicks:0, closed:false, litOn:{}, ember:false, olm:null } };
};
/* what the next floor's generator needs to know */
Roads.genOpts = function(G, n){
  const R = G.roads, o = {};
  if(!R) return o;
  if(R.rot.stage >= 1) o.rot = R.rot.stage;
  if(R.rot.stage >= 2 && !R.rot.crown && n >= 3 && n < DG.FINAL_FLOOR) o.shrine = true;
  if(R.rot.stage >= 2 && R.rot.crown && n === DG.FINAL_FLOOR) o.drowned = true;
  return Roads.lanternGen(G, n, o);
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
  // (opened, not just unsealed: a door that's neither locked nor open has nothing to open it with, and you'd be shut in)
  G.D.doors.forEach(d=>{ if(d.into === s.id || d.room === s.id){ if(d.sealed){ d.sealed = false; d.locked = false; d.open = true; } } });
  G.D.ver = (G.D.ver || 0) + 1;
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

/* ---- the Lantern: Brother Olm's road ---- */
DG.LANTERN = {
  wicks:3, vigil:24, rites:["rite_wick", "rite_wax", "rite_keeper"],
  lines:{
    ask:"Carry it down for me, Zippy. A little way. My knees won't do the stairs, and the dark knows my face.",
    took:"The lantern is warm in your hand. It shows things that weren't there. Old iron, waiting for a flame.",
    wickSeen:"The lantern catches on something: a dead wick, tall as a man. It wants lighting.",
    vigil:"The wick takes. The dark notices. Keep it burning.",
    wickLit:"The wick burns on its own now. Something in the old fire remembers you.",
    wickOut:"The wick gutters out. Light it again, if you've the nerve.",
    rotShut:"The black lily, wherever it floats, closes up tight.",
    warded:"Wards, old as the Keep, burn across the door. The lantern pulls at them. Not yet: it wants more wicks lit.",
    burn:"The lantern breathes on the wards and they burn away.",
    ember:"The Ember is warm in your hand. The lantern leans toward it. Far below, something answers.",
    noFrog:"BROTHER OLM: \"That frog is wrong, Zippy. I'll not have it at my fire. Go.\""
  },
  truth:[
    "Your master and I were the Keep's two lamplighters. Forty years. Never once let the fire go out.",
    "Then I heard it was to be stolen. I was afraid. I took a coal of it in my lantern, to keep it safe. Just a coal.",
    "The Flame guttered without it. The Gloom came up through the cold hearth. He stayed below to guard a dead fire. I ran. I've been searching for the light at the bottom ever since. It's in my hand. It always was."
  ],
  steps:[
    { id:"lantern", text:"Carry Brother Olm's lantern" },
    { id:"wick1",   text:"Light a dead wick, and keep it burning" },
    { id:"wick2",   text:"Light a second wick (the Reliquary's wards give way)" },
    { id:"ember",   text:"Take the Ember from the Reliquary, past its Warden" },
    { id:"truth",   text:"Hear Olm's confession, deep down, and decide" },
    { id:"kiln",    text:"Carry the Ember down past the Heart, to the Kiln" }
  ]
};
const L = G=> G.roads && G.roads.lantern;
Roads.lanternOpen = G=>{ const R = L(G); return !!R && !R.closed; };
/* where Olm turns up, and what the floor holds for the road */
Roads.lanternGen = function(G, n, o){
  const R = L(G); if(!R || R.closed || G.endless) return o;
  // he finds you early: on floor 1 most runs (by the seed, so it draws nothing from the game's dice), else floor 2
  if(R.stage === 0 && (n === 2 || (n === 1 && (G.seed >>> 5) % 10 < 6))) o.sanctum = true;
  if(R.stage >= 1 && R.wicks < DG.LANTERN.wicks && n <= 3 && !R.litOn[n]) o.wick = true;
  if(R.stage >= 1 && !R.ember && (n === 2 || n === 3)) o.reliquary = true;
  if(R.stage >= 2 && !R.olm && n === 4) o.sanctum = true;                                // to confess
  return o;
};
Roads.takeLantern = function(G){
  const R = L(G); R.stage = 1;
  rem(G, "lantern", "lantern");
  G.emit("lantern", {});
  G.say(DG.LANTERN.lines.took, 4);
};
/* a dead wick: E lights it, and the vigil starts */
Roads.wickConsider = function(G, r, consider){
  const R = L(G);
  r.props.forEach(pr=>{
    if(pr.kind !== "wick" || pr.lit || r.vigil || r.active) return;
    const p = G.player;
    consider(pr, DG.dist(pr.x + 0.5, pr.y + 0.5, p.x, p.y), "Light the dead wick. (The dark will come for it.)");
  });
};
Roads.lightWick = function(G, pr){
  const r = G.D.rooms[pr.room];
  if(pr.lit || r.vigil || r.active) return;
  pr.hp = 100;
  r.vigil = { prop:pr.id, t:DG.LANTERN.vigil, spawn:1.2, n:0 };
  r.active = true; r.cleared = false; r.waves = []; r.wave = 0;
  G.setDoors(r, false);
  G.emit("lock", { room:r.id }); G.emit("vigil", { x:pr.x + 0.5, y:pr.y + 0.5, room:r.id });
  G.say(DG.LANTERN.lines.vigil, 3);
};
/* the vigil: things drift in from the walls for the flame; keep them off it */
Roads.updateVigil = function(G, dt){
  const r = G.room; if(!r || !r.vigil) return;
  const V = r.vigil, pr = r.props.find(o=> o.id === V.prop);
  V.t -= dt; V.spawn -= dt;
  if(V.spawn <= 0 && V.t > 2){
    V.spawn = Math.max(1.1, 2.4 - G.floor*0.25); V.n++;
    const k = 1 + (V.n % 3 === 0 ? 1 : 0);
    for(let i=0;i<k;i++){
      const side = G.rng.int(0, 3), x = side < 2 ? G.rng.range(r.x1 + 0.5, r.x2 + 0.5) : side === 2 ? r.x1 + 0.5 : r.x2 + 0.5, y = side >= 2 ? G.rng.range(r.y1 + 0.5, r.y2 + 0.5) : side === 0 ? r.y1 + 0.5 : r.y2 + 0.5;
      const e = G.spawnEnemy(r, { type:G.floor >= 3 && G.rng.chance(0.3) ? "banshee" : "ghost", x, y, quick:true });
      e.vigil = pr.id; e.phases = true;
    }
  }
  if(pr.hp <= 0){
    r.vigil = null;
    G.enemies.forEach(e=>{ if(e.vigil === pr.id && !e.dead) e.vigil = null; });
    G.emit("wickOut", { x:pr.x + 0.5, y:pr.y + 0.5 });
    G.say(DG.LANTERN.lines.wickOut, 3);
    return;
  }
  if(V.t <= 0){
    r.vigil = null; pr.lit = true;
    G.enemies.forEach(e=>{ if(e.vigil === pr.id && !e.dead){ G.emit("decoyPop", { x:e.x, y:e.y, id:e.id }); e.dead = true; e.hp = 0; } });
    const R = L(G); R.wicks++; R.litOn[G.floor] = true;
    rem(G, "lantern", "wick" + Math.min(2, R.wicks));
    // the old fire remembers: a rite for each wick
    const rite = DG.LANTERN.rites[Math.min(R.wicks, 3) - 1], p = G.player;
    if(rite && p.boons.indexOf(rite) < 0){ p.boons.push(rite); G.recalc(); G.emit("boon", { id:rite, name:DG.BOONS[rite].name }); }
    G.emit("wickLit", { x:pr.x + 0.5, y:pr.y + 0.5, wicks:R.wicks });
    G.say(DG.LANTERN.lines.wickLit, 3.5);
    // the first wick lit: the black lily closes
    const rot = G.roads.rot;
    if(!rot.closed && rot.stage === 0){ rot.closed = true; G.pending.push({ t:3.8, fn:()=> G.say(DG.LANTERN.lines.rotShut, 3) }); G.emit("roadShut", { road:"rot" }); }
  }
};
/* a vigil ghost drifts for the wick, not for you; touching it, it burns the flame and itself */
Roads.vigilMove = function(G, e, dt){
  const r = G.D.rooms[e.room], pr = r && r.props.find(o=> o.id === e.vigil);
  if(!pr || !r.vigil){ e.vigil = null; return false; }
  const tx = pr.x + 0.5, ty = pr.y + 0.5, d = DG.dist(e.x, e.y, tx, ty) || 1, sp = e.speed*0.85;
  e.vx = (tx - e.x)/d*sp; e.vy = (ty - e.y)/d*sp; e.face = Math.atan2(ty - e.y, tx - e.x);
  e.x += e.vx*dt; e.y += e.vy*dt;
  if(d < e.r + 0.45){
    pr.hp -= e.type === "banshee" ? 22 : 14;
    G.emit("wickHit", { x:tx, y:ty, hp:pr.hp });
    e.dead = true; e.hp = 0; G.emit("decoyPop", { x:e.x, y:e.y, id:e.id });
  }
  return true;
};
/* the Reliquary's door: wards, not a lock; two wicks lit and the lantern burns them away */
Roads.burnWards = function(G, d){
  const R = L(G);
  if(!R || R.wicks < 2){ G.say(DG.LANTERN.lines.warded, 4); G.emit("broke"); return; }
  d.warded = false; d.locked = false; d.open = true;
  G.D.ver = (G.D.ver || 0) + 1;
  G.emit("unlock", { x:d.x, y:d.y, door:d.id }); G.emit("wardsBurn", { x:d.x, y:d.y });
  G.say(DG.LANTERN.lines.burn, 3);
};
Roads.reliquaryClear = function(G, r){
  if(r.emberGiven) return;
  r.emberGiven = true;
  G.addProp(r, { kind:"pedestal", x:Math.floor(r.cxw), y:Math.floor(r.cyw), quest:"ember" });
};
Roads.takeEmber = function(G){ const R = L(G); if(R){ R.ember = true; if(R.stage < 2) R.stage = 2; } rem(G, "lantern", "ember"); };
/* the confession, and the choice */
Roads.decide = function(G, choice){
  const R = L(G); R.olm = choice; R.stage = 3;
  rem(G, "lantern", "truth");
  if(choice === "take" && DG.ITEMS.lampstaff) G.giveItem("lampstaff");
};
/* Brother Olm, forgiven, comes down with you: a slow, huge ally on floor 5 and in the Kiln */
Roads.olmAlly = G=>{ const R = L(G); return !!(R && R.olm === "forgive"); };

/* ---- for the journal ---- */
Roads.lanternSteps = function(G){
  const R = L(G);
  const done = { lantern:R.stage >= 1, wick1:R.wicks >= 1, wick2:R.wicks >= 2, ember:R.ember, truth:!!R.olm, kiln:G.ending === "flame" };
  return DG.LANTERN.steps.map(s=> ({ text:s.text, done:!!done[s.id] }));
};
Roads.rotSteps = function(G){
  const R = G.roads.rot;
  const done = { lily:R.stage >= 1, molt2:R.stage >= 2, crown:R.crown, molt3:R.stage >= 3, feast:G.ending === "bog" };
  return DG.ROT.steps.map(s=> ({ text:s.text, done:!!done[s.id] }));
};

})(typeof window !== "undefined" ? window : globalThis);
