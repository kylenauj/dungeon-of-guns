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
              lines:["OI!", "Stabby time!", "Mine!"] },
  slinger:  { name:"Goblin Slinger",  hp:16,  speed:3.2, radius:0.32, cost:1.5, dmg:8,  gold:[1,3], ai:"ranged",  model:"slinger",
              shot:{ speed:7.5, cd:1.9, tell:0.45, n:1, kind:"rock" }, keep:[4.5, 7], lines:["Rock!", "Heads up!"] },
  bomber:   { name:"Goblin Bomber",   hp:20,  speed:3.0, radius:0.34, cost:2,   dmg:16, gold:[2,3], ai:"bomber",  model:"bomber",
              bomb:{ cd:2.6, fuse:1.15, radius:1.7 }, keep:[4, 7], lines:["Fire in the hole!", "Hehehehe"] },
  shaman:   { name:"Goblin Shaman",   hp:26,  speed:2.8, radius:0.34, cost:2.5, dmg:7,  gold:[2,4], ai:"shaman",  model:"shaman",
              shot:{ speed:6, cd:2.4, tell:0.5, n:3, spread:22, kind:"hex" }, heal:{ cd:4.5, amt:10, range:6 }, keep:[5, 8], lines:["Mumbo jumbo!", "Get up, ya lazy git"] },
  brute:    { name:"Goblin Brute",    hp:90,  speed:2.3, radius:0.6,  cost:3.5, dmg:18, gold:[4,7], ai:"brute",   model:"brute",
              charge:{ cd:3.4, tell:0.75, speed:10, time:0.65, stun:1.4 }, lines:["SMASH", "Brute want hug"] },
  sneak:    { name:"Goblin Sneak",    hp:18,  speed:5.0, radius:0.3,  cost:1.5, dmg:11, gold:[2,3], ai:"sneak",   model:"sneak",
              lines:["...", "Boo."] },
  /* shroom folk */
  puffling: { name:"Puffling",        hp:12,  speed:4.4, radius:0.3,  cost:1,   dmg:10, gold:[1,2], ai:"puffling",model:"puffling",
              lines:["poof?", "POOF!"] },
  toadstool:{ name:"Toadstool Turret",hp:40,  speed:0,   radius:0.45, cost:2,   dmg:8,  gold:[2,3], ai:"toadstool",model:"toadstool",
              shot:{ speed:5.5, cd:2.2, tell:0.6, n:5, spread:70, kind:"spore" } },
  shroomkin:{ name:"Shroomkin",       hp:34,  speed:3.0, radius:0.42, cost:2,   dmg:10, gold:[2,3], ai:"melee",   model:"shroomkin", splits:"shroomlet",
              lines:["Spore-ry!", "Mush!"] },
  shroomlet:{ name:"Shroomlet",       hp:10,  speed:4.2, radius:0.24, cost:0.5, dmg:6,  gold:[0,1], ai:"melee",   model:"shroomlet" },
  /* the haunted */
  ghost:    { name:"Ghost",           hp:28,  speed:2.2, radius:0.36, cost:2,   dmg:10, gold:[1,3], ai:"ghost",   model:"ghost", phases:true,
              shot:{ speed:5, cd:3, tell:0.5, n:1, kind:"ecto" }, lines:["Boooo", "Wooo"] },
  banshee:  { name:"Banshee",         hp:38,  speed:2.6, radius:0.38, cost:3,   dmg:9,  gold:[2,4], ai:"banshee", model:"banshee", phases:true,
              wail:{ cd:4.5, tell:0.9, n:11, arc:70, speed:6.5 }, keep:[3.5, 6.5] },
  skeleton: { name:"Skeleton Archer", hp:24,  speed:3.0, radius:0.33, cost:2,   dmg:10, gold:[1,3], ai:"ranged",  model:"skeleton", reassemble:true,
              shot:{ speed:11, cd:2.1, tell:0.55, n:1, kind:"arrow" }, keep:[5, 8], lines:["*rattle*", "click clack"] },
  poltergeist:{ name:"Poltergeist",   hp:26,  speed:2.8, radius:0.34, cost:2.5, dmg:14, gold:[2,3], ai:"bomber",  model:"poltergeist", phases:true,
              bomb:{ cd:2.4, fuse:0.5, radius:1.3, junk:true }, keep:[4, 7] },
  /* the weird */
  watcher:  { name:"Watcher",         hp:44,  speed:1.6, radius:0.42, cost:3,   dmg:14, gold:[2,4], ai:"watcher", model:"watcher",
              laser:{ cd:3.6, tell:1.0, time:0.5, len:16 }, keep:[5, 9] },
  blob:     { name:"Blob",            hp:40,  speed:2.6, radius:0.5,  cost:2.5, dmg:12, gold:[1,3], ai:"blob",    model:"blob", splits:"blobling" },
  blobling: { name:"Blobling",        hp:14,  speed:3.4, radius:0.3,  cost:0.5, dmg:8,  gold:[0,1], ai:"blob",    model:"blobling" },
  tentacle: { name:"Tentacle",        hp:36,  speed:0,   radius:0.4,  cost:2.5, dmg:16, gold:[2,3], ai:"tentacle",model:"tentacle",
              slam:{ cd:2.6, tell:0.85, r:1.2 } }
};

DG.BOSSES = {
  king:      { name:"Grubnok the Goblin King", hp:800,  speed:2.6, radius:1.1, dmg:16, ai:"king",      model:"king",
               lines:["WHO TOUCHED MY DUNGEON", "GUARDS! ...guards?", "I'LL SIT ON YOU"] },
  matriarch: { name:"The Morel Matriarch",     hp:1150, speed:1.4, radius:1.2, dmg:15, ai:"matriarch", model:"matriarch",
               lines:["You smell of... soap.", "My children will grow on you.", "Spores, my darlings."] },
  bride:     { name:"The Weeping Bride",       hp:1300, speed:2.4, radius:0.8, dmg:17, ai:"bride",     model:"bride",
               lines:["You're not him.", "Stay. Stay forever.", "Why does everyone leave?"] },
  eye:       { name:"The Eye Below",           hp:1700, speed:0.8, radius:1.5, dmg:19, ai:"eye",       model:"eye",
               lines:["I SEE YOU", "BLINK, LITTLE WIZARD", "LOOK AT ME"] },
  heart:     { name:"The Hollow Heart",        hp:2300, speed:0,   radius:1.6, dmg:20, ai:"heart",     model:"heart",
               lines:["ba-dum.", "BA-DUM.", "you are inside me now."] }
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
  dmg: 1 + 0.18*(f - 1),
  budget: 4 + f*2.4,
  waves: f >= 3 ? 2 : 1,
  elite: Math.min(0.45, 0.04 + 0.08*(f - 1)),
  traps: Math.min(0.85, 0.3 + 0.12*(f - 1)),
  rooms: Math.min(17, 9 + f*2),
  jumbo: Math.min(4, 1 + Math.floor(f/2)),
  curse: Math.min(0.8, 0.12*(f - 1))
});
DG.FINAL_FLOOR = 5;

/* ---- floors: spookier and weirder the deeper you go ---- */
DG.FLOORS = [
  { name:"The Goblin Cellars",  boss:"king",      floor:0x3a3330, floor2:0x2e2826, wall:0x5a4e45, top:0x6e6155, torch:0xffa04a, fog:0x0d0a0a,
    ambient:0x9a8a7a, light:1.0, decor:"cellar", motes:"dust",
    ink:0x160a06, rim:0xffb070, shaft:0xffe2a8, mist:0.18, shade:0x2a1838, high:0xffe2b0, weird:0,
    enemies:{ grunt:3, slinger:2.2, bomber:0.8, sneak:0.3 } },
  { name:"The Mushroom Grotto", boss:"matriarch", floor:0x2c3a30, floor2:0x223026, wall:0x3d5244, top:0x4f6a56, torch:0x9cff6a, fog:0x050d07,
    ambient:0x6a9a7a, light:0.9, decor:"grotto", motes:"spores",
    ink:0x03140a, rim:0x9cff8a, shaft:0xc8ff9a, mist:0.3, shade:0x08263a, high:0xeaffb0, weird:0.12,
    enemies:{ grunt:1.5, slinger:1.2, bomber:1, shaman:1, puffling:2.2, toadstool:1.4, shroomkin:1.6 } },
  { name:"The Haunted Crypt",   boss:"bride",     floor:0x2a2e3e, floor2:0x222533, wall:0x3e4460, top:0x535a7a, torch:0x6ad8ff, fog:0x04060c,
    ambient:0x6a7aa8, light:0.75, decor:"crypt", motes:"ghostfog",
    ink:0x05081a, rim:0x8ad8ff, shaft:0xa8d0ff, mist:0.42, shade:0x180e40, high:0xd8f0ff, weird:0.32,
    enemies:{ ghost:2.4, banshee:1.2, skeleton:2.2, poltergeist:1.2, sneak:0.8, brute:0.8, shroomkin:0.6 } },
  { name:"The Weird Below",     boss:"eye",       floor:0x3a2434, floor2:0x2e1c2a, wall:0x5a2e4a, top:0x7a3e60, torch:0xff4ad8, fog:0x0c0308,
    ambient:0x9a6a9a, light:0.62, decor:"weird", motes:"eyes",
    ink:0x14031a, rim:0xff6ad8, shaft:0xff9ae8, mist:0.36, shade:0x2a0838, high:0xffd0ff, weird:0.68,
    enemies:{ watcher:1.6, blob:2, tentacle:1.4, ghost:1.2, banshee:0.8, skeleton:1, brute:0.8, puffling:1 } },
  { name:"The Hollow Heart",    boss:"heart",     floor:0x2e1414, floor2:0x240e0e, wall:0x4a1a1e, top:0x6a2428, torch:0xff2a3a, fog:0x080202,
    ambient:0x9a5a5a, light:0.5, decor:"heart", motes:"embers",
    ink:0x1c0204, rim:0xff5a4a, shaft:0xff7a5a, mist:0.38, shade:0x380010, high:0xffd8b0, weird:1,
    enemies:{ watcher:1.4, blob:1.4, tentacle:1.4, banshee:1.2, ghost:1, brute:1.2, shroomkin:1, bomber:1, poltergeist:1, shaman:0.8 } }
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
  shop:   ["Snibbit's Discount Emporium! No refunds, no returns, no questions.", "Ooh, a customer! A wizard customer! Rich, I hope.", "Everything's legally obtained. Mostly."],
  broke:  ["No gold, no goods, pointy-hat.", "That's not enough shinies.", "Do I look like a charity?"],
  bonk:   ["BONK. It's a painting of a door.", "Ow. Very convincing paint job.", "That door is a lie.", "The door was a picture. You feel silly.", "Goblin art. Infuriatingly realistic."],
  secret: ["A wall that isn't! How rude of it.", "Illusionary wall. The goblins think they're SO clever.", "Through the fake wall... a secret!"],
  wrong:  ["HAHAHA it was the OTHER door!", "Gotcha! Lads, get 'im!", "Wrong door, wizard!"],
  solved: ["Click. Something unlocked.", "Puzzle solved! A goblin somewhere is furious.", "Ta-da!"],
  clear:  ["Room clear.", "Goblins: scattered.", "Tidy."],
  gribbus:["*ribbit*", "*RIBBIT*", "*croak*", "*blorp*", "*slurp*", "*ribbit?*"],
  pond:   ["Gribbus wants a lily pad. He looks at you very hard.", "The pond smells of adventure (and frog).", "Three lily pads. Gribbus can only sit on one."],
  altar:  ["The altar wants a little of your life. Just a little.", "Blood for power. Classic.", "The altar hums. It is hungry."]
};
DG.DOOR_COLORS = [
  { id:"red",    name:"red",    hex:0xd2453a },
  { id:"green",  name:"green",  hex:0x4fbf5a },
  { id:"blue",   name:"blue",   hex:0x3a6fd2 },
  { id:"yellow", name:"yellow", hex:0xe8c43a }
];

})(typeof window !== "undefined" ? window : globalThis);
