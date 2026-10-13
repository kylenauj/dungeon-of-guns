/* ------------------------------------------------------------------ *
 *  All the content. New guns, runes, relics, goblins and floors go
 *  here; code only changes for a genuinely new kind of effect.
 *
 *  Units: 1 world unit = 1 tile. Times in seconds. Damage is "base"
 *  damage at item level 1; loot.js scales it by level and rarity.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;

/* ---- elements: the spell school a gun is infused with ------------------
   Every shot carries its element's status. The right mouse button casts
   the element's spell through the gun, paid for in mana.               */
DG.ELEMENTS = {
  arcane: { name:"Arcane", adj:"Arcane",    color:0xb36bff, hint:"+20% damage, big knockback", spell:"missiles" },
  fire:   { name:"Fire",   adj:"Blazing",   color:0xff7a1a, hint:"burns for damage over time",  spell:"fireball" },
  frost:  { name:"Frost",  adj:"Frozen",    color:0x7fd8ff, hint:"chills; 5 chill stacks freeze", spell:"nova" },
  poison: { name:"Poison", adj:"Toxic",     color:0x7dff3a, hint:"stacking poison, up to 10",   spell:"plague" },
  shock:  { name:"Shock",  adj:"Crackling", color:0xfff04a, hint:"25% chance to arc to a neighbour", spell:"chain" }
};
DG.ELEMENT_ORDER = ["arcane", "fire", "frost", "poison", "shock"];

/* status tuning (per point of the hit's "power", which is the gun's level x rarity factor) */
DG.STATUS = {
  poison: { dps:1.6, dur:4, max:10 },
  burn:   { dps:5,   dur:3 },
  chill:  { slow:0.6, dur:2.2, freezeAt:5, freeze:1.3 },
  shock:  { chance:0.25, arcFrac:0.6, range:3.6 },
  arcane: { mul:1.2, knock:2.2 }
};

/* ---- spells (right mouse) ---- */
DG.SPELLS = {
  missiles: { name:"Magic Missiles", cost:30, desc:"Five homing missiles." ,       n:5, dmg:9 },
  fireball: { name:"Fireball",       cost:40, desc:"A slow orb that explodes and sets things alight.", dmg:34, radius:2.4 },
  nova:     { name:"Frost Nova",     cost:35, desc:"Freezes everything near you and shatters enemy shots.", dmg:12, radius:3.6 },
  plague:   { name:"Plague Cloud",   cost:35, desc:"A lingering cloud at the cursor: poison, poison, poison.", radius:2.6, dur:5, stacksPerSec:3 },
  chain:    { name:"Chain Lightning",cost:30, desc:"Lightning that leaps between six enemies.", dmg:20, jumps:6, range:8 }
};

/* ---- gun bases: the fire pattern ------------------------------------- */
DG.GUNS = {
  pistol:   { name:"Wand-Pistol", rate:4.2, dmg:9,   speed:17, spread:3,  pellets:1, mag:10, reload:0.9, range:15, size:0.16, knock:1.2, model:"pistol" },
  smg:      { name:"Hex SMG",     rate:11,  dmg:3.6, speed:19, spread:9,  pellets:1, mag:32, reload:1.3, range:12, size:0.12, knock:0.5, model:"smg" },
  shotgun:  { name:"Blunderbuss", rate:1.5, dmg:4.6, speed:15, spread:30, pellets:6, mag:4,  reload:1.4, range:7.5, size:0.13, knock:2.4, model:"shotgun" },
  rifle:    { name:"Longbarrel",  rate:1.6, dmg:27,  speed:32, spread:0.5,pellets:1, mag:5,  reload:1.6, range:22, size:0.15, knock:3, pierce:1, model:"rifle" },
  launcher: { name:"Grenado",     rate:1.0, dmg:22,  speed:11, spread:2,  pellets:1, mag:3,  reload:1.8, range:12, size:0.26, knock:4, blast:1.6, model:"launcher" }
};
DG.GUN_ORDER = ["pistol", "smg", "shotgun", "rifle", "launcher"];

/* ---- rarity: damage factor, rune slots, runes it comes with ---------- */
DG.RARITY = [
  { id:"common",    name:"Common",    mul:1.00, slots:1, runes:0, color:"#c9d1d9", w:52 },
  { id:"uncommon",  name:"Uncommon",  mul:1.14, slots:1, runes:1, color:"#5bd16b", w:28 },
  { id:"rare",      name:"Rare",      mul:1.30, slots:2, runes:1, color:"#4aa8ff", w:13 },
  { id:"epic",      name:"Epic",      mul:1.50, slots:2, runes:2, color:"#c06bff", w:5.5 },
  { id:"legendary", name:"Legendary", mul:1.75, slots:3, runes:2, color:"#ffb12e", w:1.5 }
];

/* ---- runes: modifiers socketed into a gun -----------------------------
   Each rune's effect is a set of flags/numbers that game.js reads when a
   gun fires, a shot hits, or an enemy dies. "plague" is the poison-spread
   example: poison jumps from goblin to goblin.                          */
DG.RUNES = {
  plague:    { name:"Plague Spreader", icon:"☣", w:6, desc:"Poisoned enemies infect others within 2.5 tiles each second, and pop into a cloud when they die.", fx:{ plagueSpread:1 }, suffix:"of Contagion" },
  venom:     { name:"Venom Tips",      icon:"✎", w:8, desc:"Every hit also adds a stack of poison.", fx:{ addPoison:1 }, suffix:"of Venom" },
  ricochet:  { name:"Ricochet",        icon:"↯", w:8, desc:"Shots bounce off walls twice.", fx:{ bounces:2 }, suffix:"of Bouncing" },
  split:     { name:"Splitter",        icon:"⋔", w:6, desc:"Shots split in two on the first hit.", fx:{ split:1 }, suffix:"of Halves" },
  homing:    { name:"Seeker",          icon:"◎", w:7, desc:"Shots curve toward goblins.", fx:{ homing:1 }, suffix:"of Seeking" },
  pierce:    { name:"Skewer",          icon:"➶", w:7, desc:"Shots pass through one more enemy.", fx:{ pierce:1 }, suffix:"of Skewering" },
  heavy:     { name:"Heavy Lead",      icon:"●", w:8, desc:"+35% damage, bigger shots, 15% slower firing.", fx:{ dmgMul:1.35, sizeMul:1.3, rateMul:0.85 }, suffix:"of Weight" },
  rapid:     { name:"Hair Trigger",    icon:"»", w:8, desc:"+30% fire rate, 10% less damage.", fx:{ rateMul:1.3, dmgMul:0.9 }, suffix:"of Haste" },
  vamp:      { name:"Leech",           icon:"♥", w:5, desc:"Kills heal you for 2.", fx:{ killHeal:2 }, suffix:"of Leeching" },
  surge:     { name:"Spell Surge",     icon:"✦", w:6, desc:"The gun's spell costs 30% less mana.", fx:{ spellCost:0.7 }, suffix:"of Sorcery" },
  blast:     { name:"Boom Bits",       icon:"✸", w:5, desc:"12% chance a hit explodes for 60% damage.", fx:{ blastChance:0.12 }, suffix:"of Booms" },
  wildfire:  { name:"Wildfire",        icon:"♨", w:5, desc:"Burning enemies explode into flame when they die.", fx:{ wildfire:1 }, suffix:"of Wildfire" },
  glacier:   { name:"Brittle",         icon:"❄", w:5, desc:"Chilled or frozen enemies take 30% more damage.", fx:{ brittle:0.3 }, suffix:"of Shattering" },
  conductor: { name:"Conductor",       icon:"ϟ", w:5, desc:"Any hit has a 15% chance to arc; arcs jump twice more.", fx:{ arcChance:0.15, arcJumps:2 }, suffix:"of Storms" },
  bigmag:    { name:"Deep Pockets",    icon:"▤", w:7, desc:"+50% magazine, 25% faster reload.", fx:{ magMul:1.5, reloadMul:0.75 }, suffix:"of Plenty" },
  multi:     { name:"Twinshot",        icon:"⁑", w:4, desc:"Fires an extra projectile, 20% less damage each.", fx:{ extraPellets:1, dmgMul:0.8 }, suffix:"of Twins" }
};

/* ---- unique legendaries: goblin-made, fixed element and runes ---- */
DG.UNIQUES = [
  { name:"The Snotgun",           base:"shotgun",  element:"poison", runes:["plague", "venom"],    flavour:"Smells exactly how you think." },
  { name:"Grandma's Hairdryer",   base:"smg",      element:"fire",   runes:["wildfire", "rapid"],  flavour:"Set to 'scorch'. There is no other setting." },
  { name:"Lightning Rod Classic", base:"rifle",    element:"shock",  runes:["conductor", "pierce"],flavour:"Do not hold during storms. Or ever." },
  { name:"Brr-Blaster 9000",      base:"pistol",   element:"frost",  runes:["glacier", "ricochet"],flavour:"Goblin engineering: it works, nobody knows why." },
  { name:"Wobbly Boom Tube",      base:"launcher", element:"arcane", runes:["split", "blast"],     flavour:"Points mostly forward." }
];

/* ---- relics: passive stat items ---------------------------------------- */
DG.RELICS = {
  necklace: { name:"Goblin Tooth Necklace", w:8, desc:"+15% damage.",                 fx:{ dmgMul:1.15 } },
  socks:    { name:"Comfy Socks",           w:8, desc:"+12% move speed.",             fx:{ speedMul:1.12 } },
  heart:    { name:"Spare Heart",           w:8, desc:"+25 max health (and heals it).", fx:{ maxHp:25 } },
  teapot:   { name:"Mana Teapot",           w:7, desc:"+60% mana regeneration.",      fx:{ manaRegenMul:1.6 } },
  toenail:  { name:"Lucky Toenail",         w:6, desc:"+10% chance to crit for double damage.", fx:{ crit:0.1 } },
  banana:   { name:"Banana Insurance",      w:4, desc:"You no longer slip on banana peels. Goblins still do.", fx:{ noSlip:1 } },
  hourglass:{ name:"Sticky Hourglass",      w:5, desc:"Blink recharges 35% faster.",  fx:{ blinkCdMul:0.65 } },
  pouch:    { name:"Bottomless Pouch",      w:6, desc:"+40% gold from everything.",   fx:{ goldMul:1.4 } },
  hat:      { name:"Taller Hat",            w:6, desc:"+30 max mana. Purely for the hat.", fx:{ maxMana:30 } },
  gloves:   { name:"Fingerless Gloves",     w:6, desc:"+20% fire rate.",              fx:{ rateMul:1.2 } }
};

/* ---- the wizard ---- */
DG.PLAYER = {
  hp:100, mana:100, manaRegen:7, manaOnKill:4, speed:6, radius:0.32,
  blink:{ dist:3.6, time:0.14, iframes:0.3, cd:0.85 },
  hurtIframes:0.7, maxGuns:3
};

/* ---- goblins ----------------------------------------------------------
   cost: how much of a room's budget one takes. Damage and HP scale with
   the floor (see FLOOR_SCALE).                                          */
DG.ENEMIES = {
  grunt:   { name:"Goblin Grunt",   hp:22,  speed:3.5, radius:0.34, cost:1,   dmg:9,  gold:[1,2], ai:"melee",   from:1,
             lines:["OI!", "Stabby time!", "Mine!"] },
  slinger: { name:"Goblin Slinger", hp:16,  speed:3.2, radius:0.32, cost:1.5, dmg:8,  gold:[1,3], ai:"ranged",  from:1,
             shot:{ speed:7.5, cd:1.9, tell:0.45, n:1 }, keep:[4.5, 7], lines:["Rock!", "Heads up!"] },
  bomber:  { name:"Goblin Bomber",  hp:20,  speed:3.0, radius:0.34, cost:2,   dmg:16, gold:[2,3], ai:"bomber",  from:2,
             bomb:{ cd:2.6, fuse:1.15, radius:1.7 }, keep:[4, 7], lines:["Fire in the hole!", "Hehehehe"] },
  shaman:  { name:"Goblin Shaman",  hp:26,  speed:2.8, radius:0.34, cost:2.5, dmg:7,  gold:[2,4], ai:"shaman",  from:2,
             shot:{ speed:6, cd:2.4, tell:0.5, n:3, spread:22 }, heal:{ cd:4.5, amt:10, range:6 }, keep:[5, 8], lines:["Mumbo jumbo!", "Get up, ya lazy git"] },
  brute:   { name:"Goblin Brute",   hp:90,  speed:2.3, radius:0.6,  cost:3.5, dmg:18, gold:[4,7], ai:"brute",   from:3,
             charge:{ cd:3.4, tell:0.75, speed:10, time:0.65, stun:1.4 }, lines:["SMASH", "Brute want hug"] },
  sneak:   { name:"Goblin Sneak",   hp:18,  speed:5.0, radius:0.3,  cost:1.5, dmg:11, gold:[2,3], ai:"sneak",   from:3,
             lines:["...", "Boo."] }
};
DG.ENEMY_ORDER = ["grunt", "slinger", "bomber", "shaman", "brute", "sneak"];

DG.BOSSES = [
  { id:"king", name:"Grubnok the Goblin King", hp:800, speed:2.6, radius:1.1, dmg:16, ai:"king",
    lines:["WHO TOUCHED MY DUNGEON", "GUARDS! ...guards?", "I'LL SIT ON YOU"] }
];

/* elite affixes: an elite goblin rolls one of these */
DG.AFFIXES = {
  armored:  { name:"Armored",  dmgTaken:0.6, tint:0x8a96a8 },
  swift:    { name:"Swift",    speed:1.45,   tint:0x5af0ff },
  big:      { name:"Big",      hp:1.7, size:1.35, tint:0xffa45a },
  vengeful: { name:"Vengeful", deathRing:8,  tint:0xff4a6a }
};

/* how the dungeon gets meaner each floor */
DG.FLOOR_SCALE = f=>({
  hp:  1 + 0.42*(f - 1) + 0.04*(f - 1)*(f - 1),
  dmg: 1 + 0.18*(f - 1),
  budget: 4 + f*2.4,
  waves: f >= 3 ? 2 : 1,
  elite: Math.min(0.45, 0.04 + 0.08*(f - 1)),
  traps: Math.min(0.85, 0.3 + 0.12*(f - 1)),
  rooms: Math.min(15, 7 + f*2)
});
DG.FINAL_FLOOR = 5;

/* ---- floors: names and colour palettes (the view reads the colours) ---- */
DG.FLOORS = [
  { name:"The Goblin Cellars",   floor:0x3a3330, floor2:0x2e2826, wall:0x5a4e45, top:0x6e6155, torch:0xffa04a, fog:0x0d0a0a },
  { name:"The Snot Sewers",      floor:0x2c3a30, floor2:0x223026, wall:0x3d5244, top:0x4f6a56, torch:0x9cff6a, fog:0x070d09 },
  { name:"The Fungus Halls",     floor:0x2e2a3e, floor2:0x252233, wall:0x463f60, top:0x5a5178, torch:0x46e4ff, fog:0x08070f },
  { name:"The Molten Mines",     floor:0x3e2a24, floor2:0x30201b, wall:0x5e3a2c, top:0x7a4a36, torch:0xff5a2a, fog:0x0f0605 },
  { name:"Grubnok's Throne Hole",floor:0x3a3424, floor2:0x2e281c, wall:0x6a5a34, top:0x8a7440, torch:0xffd23d, fog:0x0d0a04 }
];

/* ---- traps (minor: they sting, they don't end runs) ---- */
DG.TRAPS = {
  spikes: { name:"Spike plate", dmg:10, cycle:2.6, warn:0.55, up:0.6 },
  darts:  { name:"Dart slit",   dmg:7,  cycle:2.2, speed:9 },
  vent:   { name:"Fire vent",   dmg:6,  cycle:3.2, up:1.0, warn:0.5 },
  banana: { name:"Banana peel", slip:0.65 }
};

/* ---- the goblin merchant and other things that talk ---- */
DG.LINES = {
  shop:   ["Snibbit's Discount Emporium! No refunds, no returns, no questions.", "Ooh, a customer! A wizard customer! Rich, I hope.", "Everything's legally obtained. Mostly."],
  broke:  ["No gold, no goods, pointy-hat.", "That's not enough shinies.", "Do I look like a charity?"],
  bonk:   ["BONK. It's a painting of a door.", "Ow. Very convincing paint job.", "That door is a lie.", "The door was a picture. You feel silly.", "Goblin art. Infuriatingly realistic."],
  secret: ["A wall that isn't! How rude of it.", "Illusionary wall. The goblins think they're SO clever.", "Through the fake wall... a secret!"],
  wrong:  ["HAHAHA it was the OTHER door!", "Gotcha! Lads, get 'im!", "Wrong door, wizard!"],
  solved: ["Click. Something unlocked.", "Puzzle solved! A goblin somewhere is furious.", "Ta-da!"],
  clear:  ["Room clear.", "Goblins: scattered.", "Tidy."],
  floor:  ["Down you go.", "Deeper. Smellier.", "The goblins get bigger down here."]
};
DG.DOOR_COLORS = [
  { id:"red",    name:"red",    hex:0xd2453a },
  { id:"green",  name:"green",  hex:0x4fbf5a },
  { id:"blue",   name:"blue",   hex:0x3a6fd2 },
  { id:"yellow", name:"yellow", hex:0xe8c43a }
];

})(typeof window !== "undefined" ? window : globalThis);
