/* ------------------------------------------------------------------ *
 *  The roads down: the side endings (docs/ENDINGS.md). A run gets at
 *  most one side road, chosen by chance when it starts (DG.ROUTES), and
 *  only that road's things are put in the dungeon, so a road is
 *  something you stumble on, not something every run offers:
 *
 *  ember  THE FIRST FLAME. The Sealed Reliquary on floor 2 or 3; its
 *         Warden keeps the Ember. Carry it past the Heart, down to the
 *         Kiln and the Hollow Wizard.
 *  bog    KING OF THE BOG. Glowing mushrooms down the dungeon. Gribbus
 *         eats them and grows (three growths), and from four on he
 *         demands praise. At ten, the Heart's portal runs green into the
 *         Glutton's Bog, where he's king and Zippy the sidekick; he eats
 *         the Bog Lord, Toad King.
 *  olm    THE WHITE WIZARD. Brother Olm, met twice. Hear everything he has
 *         to say and he gives up his lantern; a door of eyes in his
 *         library opens on the Flesh Library and the Archivist.
 *
 *  A step done is remembered for the run (G.roads) and, once ever
 *  reached, between runs (meta.roads), for the journal.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const Roads = DG.Roads = {};

/* Gribbus' growths on the mushroom road (the models are the old Rot I-III) */
DG.ROT = {
  stages:[
    null,
    { name:"Glutted",  title:"Fed",     g:{ dmg:0.25 } },
    { name:"Swollen",  title:"Swollen", g:{ dmg:0.35, rate:0.15 } },
    { name:"Bloated",  title:"Bloated", g:{ dmg:0.5, size:0.5 } }
  ],
  lines:{
    grow1:"Gribbus swells a little. His skin goes dark and wet, and a third eye opens on his brow.",
    grow2:"Gribbus splits his skin. What climbs out has a second mouth, and opinions.",
    grow3:"TEN. Gribbus is enormous, and glows like a lantern. Far below, something huge and hungry smells him. Still the Heart, and follow him down.",
    more:"Gribbus eats another one. He doesn't need it. He wants it."
  },
  steps:[
    { id:"shroom1", text:"Let Gribbus eat a glowing mushroom" },
    { id:"grow2",   text:"Keep feeding him: seven mushrooms" },
    { id:"grow3",   text:"Ten mushrooms: he's ready to be king" },
    { id:"bog",     text:"Still the Heart, and follow him into the green" },
    { id:"king",    text:"Let him eat the Bog Lord, Toad King" }
  ]
};
DG.LANTERN = {
  steps:[
    { id:"olm1",    text:"Find Brother Olm, and listen" },
    { id:"olm2",    text:"Find him again, deeper down, and hear the rest" },
    { id:"lantern", text:"Take his lantern" },
    { id:"door",    text:"Go through the door of eyes" },
    { id:"white",   text:"Close the Archivist's book" }
  ]
};
DG.EMBER = {
  lines:{ ember:"The Ember is warm in your hand. Far below, something answers it." },
  steps:[
    { id:"reliquary", text:"Find the Sealed Reliquary, and its Warden" },
    { id:"ember",     text:"Take the Ember" },
    { id:"kiln",      text:"Carry it past the Heart, down to the Kiln" }
  ]
};

/* the run's road, and where its things go (from the seed's own dice, so the
   game's rolls aren't disturbed); force: a road for tests and ?route= */
Roads.init = function(G, force){
  const rng = DG.RNG((G.seed ^ 0x2c1b3c6d) >>> 0), R = DG.ROUTES;
  let route = force !== undefined ? force : rng.weighted(Object.keys(R), k=> R[k]);
  if(route === "none") route = null;
  const plan = { olmFloors:[], emberFloor:0 };
  if(route === "olm") plan.olmFloors = [rng.int(1, 2), rng.int(3, 4)];
  else if(rng.chance(DG.OLM_ODDS)) plan.olmFloors = [rng.int(1, 4)];
  if(route === "ember") plan.emberFloor = rng.int(2, 3);
  return { route, plan, rot:{ stage:0, shrooms:0 }, lantern:{ stage:0 }, ember:{ found:false } };
};
const rem = (G, road, step)=>{
  const m = G.meta; if(!m) return;
  m.roads = m.roads || {}; m.roads[road] = m.roads[road] || {};
  m.roads[road][step] = true;
};
Roads.remember = rem;

/* what the next floor's generator needs to know */
Roads.genOpts = function(G, n){
  const R = G.roads, o = {};
  if(!R) return o;
  if(G.side && n === DG.FINAL_FLOOR + 1){ o.theme = DG.SIDE_FLOORS[G.side]; return o; }
  // a frog build: his pond turns up on every floor
  if(G.player && (Items().direction(G.player.items, G.player.boons).frog || 0) >= 2) o.frogBuild = true;
  if(G.endless || n > DG.FINAL_FLOOR) return o;
  if(R.plan.emberFloor === n && !R.ember.found) o.reliquary = true;
  const v = R.plan.olmFloors.indexOf(n);
  if(v >= 0) o.olm = { visit:v + 1, door:R.route === "olm" && v === 1 };
  if(R.route === "bog") o.shrooms = DG.SHROOMS_PER_FLOOR[n - 1] || 0;
  return o;
};
const Items = ()=> DG.Items;

/* ---- the mushroom road ---- */
/* a glowing mushroom: Gribbus eats it; at four, seven and ten he grows */
Roads.eatShroom = function(G, o){
  const R = G.roads.rot, p = G.player;
  if(o.eaten) return;
  o.eaten = true;
  R.shrooms++; p.quests.shrooms = R.shrooms;
  const n = R.shrooms;
  G.emit("shroom", { x:o.x + 0.5, y:o.y + 0.5, n });
  if(n === 1){ G.emit("quest", { id:"shrooms", name:DG.QUESTS.shrooms.name }); rem(G, "bog", "shroom1"); }
  const at = DG.SHROOM_STAGES.indexOf(n);
  if(at >= 0){
    R.stage = at + 1;
    if(R.stage === 2) rem(G, "bog", "grow2");
    if(R.stage === 3) rem(G, "bog", "grow3");
    G.emit("molt", { stage:R.stage, x:G.gribbus.x, y:G.gribbus.y });
    G.say(DG.ROT.lines["grow" + R.stage], R.stage === 3 ? 5 : 4);
  }
  else if(n > DG.SHROOMS_NEED) G.say(DG.ROT.lines.more, 3);
  else G.say(G.rng.pick(DG.LINES.shroom) + " (" + n + " of " + DG.SHROOMS_NEED + ")", 3.2);
};
Roads.kingReady = G=> !!(G.roads && G.roads.rot.shrooms >= DG.SHROOMS_NEED);
/* his own kills: in the Bog, they hatch tadpoles that fight for you */
Roads.frogKill = function(G, e){
  const R = G.roads && G.roads.rot;
  if(!R || R.stage < 3 || G.side !== "bog") return;
  if(G.chance(0.3)) G.spawnAlly("tadpole", e.x, e.y, {});
};
/* what the mushrooms add to him: a little for each one, and each growth on top */
Roads.frogBonus = function(G){
  const R = G.roads && G.roads.rot, out = {};
  if(!R) return out;
  const n = Math.min(13, R.shrooms);
  if(n){ out.dmg = 0.04*n; out.size = 0.04*n; }
  for(let s=1; s<=R.stage; s++){ const g = DG.ROT.stages[s].g; for(const k in g) out[k] = (out[k] || 0) + g[k]; }
  return out;
};

/* ---- Olm's road ---- */
/* everything he has to say on this road, heard, on his second visit at least */
Roads.olmExhausted = function(G){
  const S = G.olmState ? G.olmState() : null, R = G.roads;
  if(!S || !R || R.route !== "olm" || S.visits < 2) return false;
  return DG.OLM.talk.every(t=> (t.route && t.route !== R.route) || S.said[t.id]);
};
Roads.takeLantern = function(G){
  const R = G.roads.lantern;
  R.stage = 1; G.player.quests.lantern = true;
  rem(G, "olm", "lantern");
  G.emit("quest", { id:"lantern", name:DG.QUESTS.lantern.name });
  G.emit("lantern", {});
  // the door of eyes in his library opens to it
  G.D.rooms.forEach(r=> r.props.forEach(pr=>{ if(pr.kind === "eyedoor" && !pr.open){ pr.open = true; G.emit("eyesOpen", { id:pr.id, x:pr.x + 0.5, y:pr.y + 0.5 }); } }));
};
Roads.olmVisited = function(G, visits){ rem(G, "olm", visits >= 2 ? "olm2" : "olm1"); };

/* ---- the Ember road ---- */
Roads.reliquaryClear = function(G, r){
  if(r.emberGiven) return;
  r.emberGiven = true;
  G.addProp(r, { kind:"pedestal", x:Math.floor(r.cxw), y:Math.floor(r.cyw), quest:"ember" });
};
Roads.takeEmber = function(G){ G.roads.ember.found = true; rem(G, "ember", "ember"); };
Roads.enterReliquary = function(G){ rem(G, "ember", "reliquary"); };

/* ---- for the journal: each road's steps, done or not ---- */
Roads.steps = function(G){
  const R = G.roads; if(!R) return null;
  const S = G.olm || { visits:0 }, p = G.player;
  if(R.route === "bog"){
    const n = R.rot.shrooms, done = { shroom1:n >= 1, grow2:n >= 7, grow3:n >= 10, bog:G.side === "bog", king:G.ending === "bog" };
    return { id:"bog", name:"The Bog", steps:DG.ROT.steps.map(s=> ({ text:s.text, done:!!done[s.id] })), note:n ? n + " of " + DG.SHROOMS_NEED + " mushrooms" : "" };
  }
  if(R.route === "olm"){
    const done = { olm1:S.visits >= 1, olm2:S.visits >= 2, lantern:!!p.quests.lantern, door:G.side === "flesh", white:G.ending === "white" };
    return { id:"olm", name:"The Lantern", steps:DG.LANTERN.steps.map(s=> ({ text:s.text, done:!!done[s.id] })) };
  }
  if(R.route === "ember"){
    const done = { reliquary:!!R.ember.seen, ember:R.ember.found, kiln:G.side === "kiln" };
    return { id:"ember", name:"The First Flame", steps:DG.EMBER.steps.map(s=> ({ text:s.text, done:!!done[s.id] })) };
  }
  return null;
};
/* has the run found its road yet (the journal keeps a road hidden until it's spotted) */
Roads.spotted = function(G){
  const R = G.roads; if(!R || !R.route) return false;
  if(R.route === "bog") return R.rot.shrooms > 0;
  if(R.route === "olm") return (G.olm && G.olm.visits > 0) || false;
  if(R.route === "ember") return !!R.ember.seen;
  return false;
};

})(typeof window !== "undefined" ? window : globalThis);
