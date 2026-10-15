/* ------------------------------------------------------------------ *
 *  The world's content: elements, reactions, spells, guns, enemies,
 *  bosses, floors, traps and lines. Powerups, boons, actives and
 *  Gribbus' buffs live in items.js.
 *
 *  Units: 1 world unit = 1 tile. Times in seconds.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;

/* ---- elements ----------------------------------------------------------
   Every shot carries its gun's element (and any the powerups add). Each
   element leaves a status on goblins, a byproduct when a trigger asks
   for one, and has a spell (right mouse) on guns of that element.     */
DG.ELEMENTS = {
  arcane: { name:"Arcane", adj:"Arcane",    color:0xb36bff, hint:"+20% damage, big knockback, marks goblins", spell:"missiles" },
  fire:   { name:"Fire",   adj:"Blazing",   color:0xff7a1a, hint:"burns for damage over time",  spell:"fireball" },
  frost:  { name:"Frost",  adj:"Frozen",    color:0x7fd8ff, hint:"chills; 5 chill stacks freeze", spell:"nova" },
  poison: { name:"Poison", adj:"Toxic",     color:0x7dff3a, hint:"stacking poison, up to 10",   spell:"plague" },
  shock:  { name:"Shock",  adj:"Crackling", color:0xfff04a, hint:"shocks; 25% chance to arc to a neighbour", spell:"chain" }
};
DG.ELEMENT_ORDER = ["arcane", "fire", "frost", "poison", "shock"];

DG.STATUS = {
  poison: { dps:1.6, dur:4, max:10 },
  burn:   { dps:5,   dur:3 },
  chill:  { slow:0.6, dur:2.2, freezeAt:5, freeze:1.3 },
  shock:  { chance:0.25, arcFrac:0.6, range:3.6, dur:1.6 },
  arcane: { mul:1.2, knock:2.2, dur:2.2 }
};

/* what each element leaves behind (byproducts), at a payload power of P */
DG.BYPRODUCTS = {
  frost:  { kind:"icicle", t:3.0, r:0.4,  shards:6, shardDmg:0.45 },
  fire:   { kind:"flame",  t:3.0, r:0.95, dps:0.7 },
  poison: { kind:"puddle", t:4.0, r:1.05, every:0.5 },
  shock:  { kind:"spark",  t:3.0, r:0.35, every:0.5, reach:3.5, dmg:0.6 },
  arcane: { kind:"rune",   t:3.0, r:0.6,  every:0.65, dmg:0.5 }
};

/* two statuses on one goblin react */
DG.REACTIONS = {
  "fire+frost":   { name:"STEAM",        color:0xe8f4ff },
  "fire+poison":  { name:"COMBUST",      color:0xb8ff3a },
  "fire+shock":   { name:"OVERLOAD",     color:0xff9a2e },
  "frost+shock":  { name:"SUPERCONDUCT", color:0xaee8ff },
  "frost+poison": { name:"BRITTLE ROT",  color:0x8ad8a8 },
  "poison+shock": { name:"TOXIC ARC",    color:0xd8ff4a },
  "arcane":       { name:"RESONANCE",    color:0xd8a8ff }
};

/* ---- spells (right mouse) ---- */
DG.SPELLS = {
  missiles: { name:"Magic Missiles", cost:30, desc:"Five homing missiles.", n:5, dmg:9 },
  fireball: { name:"Fireball",       cost:40, desc:"A slow orb that explodes and sets things alight.", dmg:34, radius:2.4 },
  nova:     { name:"Frost Nova",     cost:35, desc:"Freezes everything near you and shatters enemy shots.", dmg:12, radius:3.6 },
  plague:   { name:"Plague Cloud",   cost:35, desc:"A lingering cloud at the cursor: poison, poison, poison.", radius:2.6, dur:5, stacksPerSec:3 },
  chain:    { name:"Chain Lightning",cost:30, desc:"Lightning that leaps between six enemies.", dmg:20, jumps:6, range:8 }
};

/* ---- gun bases: the fire pattern ---- */
DG.GUNS = {
  pistol:   { name:"Wand-Pistol", rate:4.2, dmg:9,   speed:17, spread:3,  pellets:1, mag:10, reload:0.9, range:15, size:0.16, knock:1.2 },
  smg:      { name:"Hex SMG",     rate:11,  dmg:3.6, speed:19, spread:9,  pellets:1, mag:32, reload:1.3, range:12, size:0.12, knock:0.5 },
  shotgun:  { name:"Blunderbuss", rate:1.5, dmg:4.6, speed:15, spread:30, pellets:6, mag:4,  reload:1.4, range:7.5, size:0.13, knock:2.4 },
  rifle:    { name:"Longbarrel",  rate:1.6, dmg:27,  speed:32, spread:0.5,pellets:1, mag:5,  reload:1.6, range:22, size:0.15, knock:3, pierce:1 },
  launcher: { name:"Grenado",     rate:1.0, dmg:22,  speed:11, spread:2,  pellets:1, mag:3,  reload:1.8, range:12, size:0.26, knock:4, blast:1.6 }
};
DG.GUN_ORDER = ["pistol", "smg", "shotgun", "rifle", "launcher"];

/* gun rarity: damage, and how many powerups come built in (active while you hold it) */
DG.RARITY = [
  { id:"common",    name:"Common",    mul:1.00, innate:[],     color:"#c9d1d9", w:52 },
  { id:"uncommon",  name:"Uncommon",  mul:1.14, innate:[0],    color:"#5bd16b", w:28 },
  { id:"rare",      name:"Rare",      mul:1.30, innate:[1],    color:"#4aa8ff", w:13 },
  { id:"epic",      name:"Epic",      mul:1.50, innate:[1, 0], color:"#c06bff", w:5.5 },
  { id:"legendary", name:"Legendary", mul:1.75, innate:[2, 1], color:"#ffb12e", w:1.5 }
];

/* unique legendaries: goblin-made, with their own built-in powerups */
DG.UNIQUES = [
  { name:"The Snotgun",           base:"shotgun",  element:"poison", innate:["plague", "venomrounds"], flavour:"Smells exactly how you think." },
  { name:"Grandma's Hairdryer",   base:"smg",      element:"fire",   innate:["wildfire", "coffee"],    flavour:"Set to 'scorch'. There is no other setting." },
  { name:"Lightning Rod Classic", base:"rifle",    element:"shock",  innate:["conductor", "sharp"],    flavour:"Do not hold during storms. Or ever." },
  { name:"Brr-Blaster 9000",      base:"pistol",   element:"frost",  innate:["brittle", "rubber", "crystal"], flavour:"Goblin engineering: it works, nobody knows why." },
  { name:"Wobbly Boom Tube",      base:"launcher", element:"arcane", innate:["splitter", "hotpotato"], flavour:"Points mostly forward." }
];

/* ---- Zippy ---- */
DG.PLAYER = {
  hp:100, mana:100, manaRegen:7, manaOnKill:4, speed:6, radius:0.32,
  blink:{ dist:3.6, time:0.14, iframes:0.3, cd:0.85 },
  hurtIframes:0.7, maxGuns:3, maxWards:6,
  xp:(lvl)=> 30 + 30*(lvl - 1)
};

/* ---- enemies ----------------------------------------------------------
   cost: how much of a room's budget one takes. xp: what it's worth.
   Which floors they appear on is set per floor (FLOORS[].enemies).   */
DG.ENEMIES = {
  /* goblins */
  grunt:    { name:"Goblin Grunt",    hp:22,  speed:3.5, radius:0.34, cost:1,   dmg:9,  gold:[1,2], ai:"melee",   model:"grunt",
              lines:["Fresh meat!", "Stick 'im!", "Mine. All mine."] },
  slinger:  { name:"Goblin Slinger",  hp:16,  speed:3.2, radius:0.32, cost:1.5, dmg:8,  gold:[1,3], ai:"ranged",  model:"slinger",
              shot:{ speed:7.5, cd:1.9, tell:0.45, n:1, kind:"rock" }, keep:[4.5, 7], lines:["Eat stone!", "Hold still, wizard!"] },
  bomber:   { name:"Goblin Bomber",   hp:20,  speed:3.0, radius:0.34, cost:2,   dmg:16, gold:[2,3], ai:"bomber",  model:"bomber",
              bomb:{ cd:2.6, fuse:1.15, radius:1.7 }, keep:[4, 7], lines:["Fire in the hole!", "Hehehe... boom."] },
  shaman:   { name:"Goblin Shaman",   hp:26,  speed:2.8, radius:0.34, cost:2.5, dmg:7,  gold:[2,4], ai:"shaman",  model:"shaman",
              shot:{ speed:6, cd:2.4, tell:0.5, n:3, spread:22, kind:"hex" }, heal:{ cd:4.5, amt:10, range:6 }, keep:[5, 8], lines:["Bones, rise!", "Up, ya lazy corpse."] },
  brute:    { name:"Goblin Brute",    hp:90,  speed:2.3, radius:0.6,  cost:3.5, dmg:18, gold:[4,7], ai:"brute",   model:"brute",
              charge:{ cd:3.4, tell:0.75, speed:10, time:0.65, stun:1.4 }, lines:["CRUSH.", "Brute want hug."] },
  sneak:    { name:"Goblin Sneak",    hp:18,  speed:5.0, radius:0.3,  cost:1.5, dmg:11, gold:[2,3], ai:"sneak",   model:"sneak",
              lines:["...", "Behind you."] },
  /* shroom folk */
  puffling: { name:"Puffling",        hp:12,  speed:4.4, radius:0.3,  cost:1,   dmg:10, gold:[1,2], ai:"puffling",model:"puffling",
              lines:["poof?", "POOF."] },
  toadstool:{ name:"Toadstool Turret",hp:40,  speed:0,   radius:0.45, cost:2,   dmg:8,  gold:[2,3], ai:"toadstool",model:"toadstool",
              shot:{ speed:5.5, cd:2.2, tell:0.6, n:5, spread:70, kind:"spore" } },
  shroomkin:{ name:"Shroomkin",       hp:34,  speed:3.0, radius:0.42, cost:2,   dmg:10, gold:[2,3], ai:"melee",   model:"shroomkin", splits:"shroomlet",
              lines:["Rot... spreads...", "Spore-ry."] },
  shroomlet:{ name:"Shroomlet",       hp:10,  speed:4.2, radius:0.24, cost:0.5, dmg:6,  gold:[0,1], ai:"melee",   model:"shroomlet" },
  /* the haunted */
  ghost:    { name:"Ghost",           hp:28,  speed:2.2, radius:0.36, cost:2,   dmg:10, gold:[1,3], ai:"ghost",   model:"ghost", phases:true,
              shot:{ speed:5, cd:3, tell:0.5, n:1, kind:"ecto" }, lines:["Leave... this place...", "So cold..."] },
  banshee:  { name:"Banshee",         hp:38,  speed:2.6, radius:0.38, cost:3,   dmg:9,  gold:[2,4], ai:"banshee", model:"banshee", phases:true,
              wail:{ cd:4.5, tell:0.9, n:11, arc:70, speed:6.5 }, keep:[3.5, 6.5] },
  skeleton: { name:"Skeleton Archer", hp:24,  speed:3.0, radius:0.33, cost:2,   dmg:10, gold:[1,3], ai:"ranged",  model:"skeleton", reassemble:true,
              shot:{ speed:11, cd:2.1, tell:0.55, n:1, kind:"arrow" }, keep:[5, 8], lines:["*rattle*", "*clatter*"] },
  poltergeist:{ name:"Poltergeist",   hp:26,  speed:2.8, radius:0.34, cost:2.5, dmg:14, gold:[2,3], ai:"bomber",  model:"poltergeist", phases:true,
              bomb:{ cd:2.4, fuse:0.5, radius:1.3, junk:true }, keep:[4, 7] },
  /* the weird */
  watcher:  { name:"Watcher",         hp:44,  speed:1.6, radius:0.42, cost:3,   dmg:14, gold:[2,4], ai:"watcher", model:"watcher",
              laser:{ cd:3.6, tell:1.0, time:0.5, len:16 }, keep:[5, 9] },
  blob:     { name:"Blob",            hp:40,  speed:2.6, radius:0.5,  cost:2.5, dmg:12, gold:[1,3], ai:"blob",    model:"blob", splits:"blobling" },
  blobling: { name:"Blobling",        hp:14,  speed:3.4, radius:0.3,  cost:0.5, dmg:8,  gold:[0,1], ai:"blob",    model:"blobling" },
  tentacle: { name:"Tentacle",        hp:36,  speed:0,   radius:0.4,  cost:2.5, dmg:16, gold:[2,3], ai:"tentacle",model:"tentacle",
              slam:{ cd:2.6, tell:0.85, r:1.2 } },
  /* the Gloom (from Gloom Shooter): rot, mould and cordyceps */
  rotling:  { name:"Rotling",         hp:11,  speed:5.0, radius:0.3,  cost:0.7, dmg:8,  gold:[0,1], ai:"melee",   model:"rotling",
              lines:["skrrk", "*squelch*"] },
  spitter:  { name:"Mould Spitter",   hp:26,  speed:2.2, radius:0.4,  cost:2,   dmg:11, gold:[1,3], ai:"ranged",  model:"spitter",
              shot:{ speed:7, cd:2.3, tell:0.55, n:3, spread:24, kind:"acid" }, keep:[4.5, 7.5] },
  bloater:  { name:"Bloater",         hp:60,  speed:1.6, radius:0.62, cost:2.5, dmg:14, gold:[2,4], ai:"melee",   model:"bloater", deathCloud:true,
              lines:["blorp", "*gurgle*"] },
  husk:     { name:"Blight Husk",     hp:58,  speed:2.6, radius:0.45, cost:3,   dmg:16, gold:[2,4], ai:"brute",   model:"husk", armor:0.75,
              charge:{ cd:3.8, tell:0.8, speed:9, time:0.6, stun:1.2 }, lines:["...the Gloom...", "Join us."] }
};

DG.BOSSES = {
  king:      { name:"Grubnok, the Gorged King", hp:800,  speed:2.6, radius:1.1, dmg:16, ai:"king",      model:"king",
               lines:["Who dares trespass in MY keep?", "Guards! ...Guards? Cowards, all.", "Kneel, little wizard. Or be sat upon."],
               felled:"TYRANT FELLED" },
  matriarch: { name:"The Morel Matriarch",     hp:1150, speed:1.4, radius:1.2, dmg:15, ai:"matriarch", model:"matriarch",
               lines:["You smell of soap... and fear.", "My children shall take root in you.", "Breathe deep, little mage. Breathe deep."],
               felled:"ROT UPROOTED" },
  bride:     { name:"The Weeping Bride",       hp:1300, speed:2.4, radius:0.8, dmg:17, ai:"bride",     model:"bride",
               lines:["You are not him.", "Stay. Stay with me forever.", "Everyone leaves. Not you. Not anymore."],
               felled:"VOWS SEVERED" },
  eye:       { name:"The Eye Below",           hp:1700, speed:0.8, radius:1.5, dmg:19, ai:"eye",       model:"eye",
               lines:["I SEE YOU.", "BLINK, LITTLE WIZARD. I NEVER DO.", "LOOK UPON ME."],
               felled:"THE EYE IS SHUT" },
  heart:     { name:"The Gloom Heart",         hp:2300, speed:0,   radius:1.6, dmg:20, ai:"heart",     model:"heart",
               lines:["ba-dum.", "the forest is mine. the forest is me.", "rot with me, little wizard."],
               felled:"HEART STILLED" }
};

/* elite affixes */
DG.AFFIXES = {
  armored:  { name:"Armored",  dmgTaken:0.6, tint:0x8a96a8 },
  swift:    { name:"Swift",    speed:1.45,   tint:0x5af0ff },
  big:      { name:"Big",      hp:1.7, size:1.35, tint:0xffa45a },
  vengeful: { name:"Vengeful", deathRing:8,  tint:0xff4a6a },
  haunted:  { name:"Haunted",  ghostOnDeath:1, tint:0xb8d8ff }
};

/* how the dungeon gets meaner each floor */
DG.FLOOR_SCALE = f=>({
  hp:  1 + 0.42*(f - 1) + 0.04*(f - 1)*(f - 1),
  dmg: 1.15 + 0.3*(f - 1),
  budget: 4 + f*2.4,
  waves: f >= 3 ? 2 : 1,
  elite: Math.min(0.45, 0.04 + 0.08*(f - 1)),
  traps: Math.min(0.85, 0.3 + 0.12*(f - 1)),
  rooms: Math.min(17, 9 + f*2),
  jumbo: Math.min(4, 1 + Math.floor(f/2)),
  curse: Math.min(0.8, 0.12*(f - 1))
});
DG.FINAL_FLOOR = 5;

/* ---- floors: a dead castle that the Gloom (rot, mould, cordyceps, from
   Gloom Shooter) eats a little more of every floor, until floor 5 is no
   castle at all but a mushroom forest grown out of the dead. Cold, dark
   stone; the only warmth is in small pools of candle and torch light. `gloom` (0..1) drives the look: moss and
   rot on the floors, roots and bark over the walls, glowcaps for torches,
   brambles for gates, a forest beyond the walls. ---- */
DG.FLOORS = [
  { name:"The Forsaken Keep",     boss:"king",      gloom:0,    floor:0x3c3834, floor2:0x34302d, wall:0x5a544c, top:0x46413b, torch:0xff8a34, fog:0x060508, water:0x1a3440,
    ambient:0x8088a0, light:0.9, decor:"castle", motes:"dust",
    ink:0x0a0608, rim:0xff9a5a, shaft:0xa8b8d8, mist:0.2, shade:0x1a1220, high:0xffcf96, weird:0,
    enemies:{ grunt:3, slinger:2.2, bomber:0.8, sneak:0.3 } },
  { name:"The Weeping Undercroft", boss:"matriarch", gloom:0.28, floor:0x33342d, floor2:0x2b2c26, wall:0x4a4a3f, top:0x3b3b33, torch:0xff9440, fog:0x040604, water:0x16302a,
    ambient:0x6e8070, light:0.85, decor:"undercroft", motes:"spores",
    ink:0x060806, rim:0xa8d878, shaft:0x9aae90, mist:0.34, shade:0x121a18, high:0xf0e0b0, weird:0.1,
    enemies:{ grunt:1.5, slinger:1.2, bomber:1, shaman:1, puffling:2, toadstool:1.2, shroomkin:1.4, rotling:0.8 } },
  { name:"The Rotting Crypt",     boss:"bride",     gloom:0.5,  floor:0x2a2a30, floor2:0x232328, wall:0x3c3e4a, top:0x2f303a, torch:0x5ac0ff, fog:0x030409, water:0x18284a,
    ambient:0x56648e, light:0.8, decor:"crypt", motes:"ghostfog",
    ink:0x05040e, rim:0x8ad8ff, shaft:0x8aa8d8, mist:0.44, shade:0x140a2a, high:0xd8ecff, weird:0.3,
    enemies:{ ghost:2.2, banshee:1, skeleton:2, poltergeist:1, sneak:0.6, brute:0.6, rotling:1.2, spitter:0.8 } },
  { name:"The Gloomwood",         boss:"eye",       gloom:0.78, floor:0x222824, floor2:0x1c221e, wall:0x322c34, top:0x2a2430, torch:0x4aa8f0, fog:0x020306, water:0x24183e,
    ambient:0x46607e, light:0.72, decor:"gloomwood", motes:"glowbugs",
    ink:0x06020c, rim:0x6ac8f0, shaft:0x7a9ac8, mist:0.5, shade:0x100620, high:0xc8ecff, weird:0.62,
    enemies:{ watcher:1.2, blob:1.2, tentacle:1.4, rotling:1.6, spitter:1.4, bloater:1.2, shroomkin:0.8, puffling:0.8, ghost:0.6 } },
  { name:"The Gloom Forest",      boss:"heart",     gloom:1,    floor:0x1c2220, floor2:0x171c1a, wall:0x281e28, top:0x221a24, torch:0x3aa0e8, fog:0x010205, water:0x2e1236,
    ambient:0x40567e, light:0.66, decor:"forest", motes:"glowbugs",
    ink:0x08020c, rim:0xd85ab8, shaft:0x6a90c8, mist:0.56, shade:0x14061f, high:0xb8e4ff, weird:1,
    enemies:{ rotling:2, spitter:1.6, bloater:1.4, husk:1.6, shroomkin:1, toadstool:1, puffling:1, tentacle:1, banshee:0.6, watcher:0.6 } }
];

/* ---- traps (minor: they sting, they don't end runs) ---- */
DG.TRAPS = {
  spikes: { name:"Spike plate", dmg:10, cycle:2.6, warn:0.55, up:0.6 },
  darts:  { name:"Dart slit",   dmg:7,  cycle:2.2, speed:9 },
  vent:   { name:"Fire vent",   dmg:6,  cycle:3.2, up:1.0, warn:0.5 },
  banana: { name:"Banana peel", slip:0.65 }
};

/* ---- lines ---- */
DG.LINES = {
  shop:   ["Snibbit's Emporium of Dubious Wares. No refunds. No survivors.", "A customer! A living one, even. How rare.", "Every ware lawfully looted from the dead. Mostly."],
  broke:  ["No gold, no goods, pointy-hat.", "Your purse is as empty as your future.", "Charity died down here long ago."],
  bonk:   ["BONK. A painting of a door. How cruel.", "Merely paint. Somewhere, a goblin snickers.", "That door is a lie.", "A false door. Your nose will remember it.", "Goblin art. Infuriatingly convincing."],
  secret: ["The wall was a lie. Something waits beyond.", "An illusory wall. Clever, for goblins.", "Hidden things, hidden for a reason."],
  wrong:  ["HAHAHA. The OTHER door, fool!", "Gotcha! Lads, get 'im!", "Wrong door, wizard. Your last mistake."],
  solved: ["Click. Something old unlocks.", "The mechanism yields. Somewhere, a goblin weeps.", "It is done."],
  clear:  ["The room falls silent.", "Nothing stirs. For now.", "Silence returns."],
  gribbus:["*ribbit*", "*RIBBIT*", "*croak*", "*blorp*", "*slurp*", "*ribbit?*"],
  pond:   ["Gribbus eyes the lily pads with grave intent.", "Still black water. It smells of frog, and of old secrets.", "Three lily pads. Gribbus may claim but one."],
  altar:  ["The altar thirsts. A little of your life will do.", "Blood for power. The oldest bargain.", "The altar hums. It is hungry. It is always hungry."]
};
DG.DOOR_COLORS = [
  { id:"red",    name:"red",    hex:0xd2453a },
  { id:"green",  name:"green",  hex:0x4fbf5a },
  { id:"blue",   name:"blue",   hex:0x3a6fd2 },
  { id:"yellow", name:"yellow", hex:0xe8c43a }
];

})(typeof window !== "undefined" ? window : globalThis);
