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
  hurtIframes:0.7, maxGuns:3, maxWards:6
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
              shot:{ speed:5.5, cd:2.4, tell:0.5, n:3, spread:26, kind:"hex", curve:0.9 }, heal:{ cd:4.5, amt:10, range:6 }, keep:[5, 8], lines:["Bones, rise!", "Up, ya lazy corpse."] },
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
              shot:{ speed:5, cd:3, tell:0.5, n:3, spread:50, kind:"ecto", stall:{ at:0.35, hold:0.75, speed:9 } }, lines:["Leave... this place...", "So cold..."] },
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
              shot:{ speed:7, cd:2.3, tell:0.55, n:3, spread:24, kind:"acid", split:{ at:0.55, n:3, spread:70, speed:6 } }, keep:[4.5, 7.5] },
  bloater:  { name:"Bloater",         hp:60,  speed:1.6, radius:0.62, cost:2.5, dmg:14, gold:[2,4], ai:"melee",   model:"bloater", deathCloud:true,
              lines:["blorp", "*gurgle*"] },
  /* the creepy ones: neon green and patient */
  wight:    { name:"Lantern Wight",   hp:34,  speed:2.0, radius:0.36, cost:2.5, dmg:11, gold:[2,3], ai:"wight",   model:"wight", phases:true,
              rosary:{ cd:3.6, tell:0.7, n:8, r:2.6, hold:0.85, speed:8.5 }, keep:[4, 7.5], lines:["...hush...", "Follow the light.", "Come closer. Closer."] },
  evilfrog: { name:"Gorged Toad",     hp:30,  speed:2.4, radius:0.42, cost:2,   dmg:11, gold:[1,3], ai:"evilfrog", model:"evilfrog",
              bile:{ cd:2.6, tell:0.45, n:3, spread:40, speed:6.5 }, lines:["*GRRROAK*", "*hrrrk*", "*glorp*"] },
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
  hollow:    { name:"The Hollow Wizard",       hp:3000, speed:2.2, radius:0.9, dmg:22, ai:"hollow",    model:"hollow",
               lines:["I was you, once. I came down for the same fire.", "The Ember is mine. It was always mine.", "Look at me, Zippy. Look at what the dark makes of us."],
               felled:"THE HOLLOW IS FILLED" },
  /* the other things that hold a floor (one or the other, by the seed) */
  gibbet:    { name:"Sir Hollin in the Gibbet", hp:880,  speed:2.2, radius:1.05, dmg:17, ai:"gibbet",    model:"gibbet",
               lines:["They hanged me for the King's sins. I kept the cage.", "Kneel. I have done this before.", "The crows ate my eyes. I see well enough."],
               felled:"THE KNIGHT IS CUT DOWN" },
  ratking:   { name:"The Rat King",            hp:1150, speed:2.0, radius:1.15, dmg:15, ai:"ratking",   model:"ratking",
               lines:["we are many we are one we are hungry", "a crown for us a crown for all of us", "share share share share"],
               felled:"THE KNOT IS CUT" },
  gravedigger:{ name:"Old Mattock, the Gravedigger", hp:1350, speed:2.0, radius:0.95, dmg:18, ai:"gravedigger", model:"gravedigger",
               lines:["Another one for the ground.", "I dug a hole your size this morning. Lie down.", "The dead don't stay down. I've stopped minding."],
               felled:"THE LAST GRAVE IS FILLED" },
  antlered:  { name:"The Antlered Hunger",     hp:1700, speed:2.8, radius:1.1, dmg:19, ai:"antlered",  model:"antlered",
               lines:["...", "hhhhungry", "*a sound like a stag screaming*"],
               felled:"THE HUNGER STARVES" },
  toadking:  { name:"The Bog Lord, Toad King", hp:3400, speed:1.8, radius:1.5, dmg:21, ai:"toadking",  model:"toadking",
               lines:["MORE.", "I ate the last little frog who wore a crown. He was delicious.", "KNEEL, AND BE SWALLOWED."],
               felled:"THE GLUTTON IS EATEN" },
  archivist: { name:"The Archivist, Who Wrote the Dark", hp:3300, speed:1.2, radius:1.4, dmg:21, ai:"archivist", model:"archivist",
               lines:["Every life down here is a page. Yours is short.", "I have read you, little wizard. I know how you end.", "Hush. This is a library."],
               felled:"THE BOOK IS CLOSED" },
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
  hp:  1 + 0.5*(f - 1) + 0.14*(f - 1)*(f - 1),
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

/* ---- the endings, and the lore they pay off ----
   Long before the Gloom, the Keep was built around a fire: the First Flame,
   which kept the dark of the deep forest out. Its keepers grew old and few;
   the last of them, a wizard, went down into the Kiln to tend it, and never
   came back up. The Flame guttered, the Gloom (rot, mould, cordyceps: a
   hunger that grows in the dark) crept up through the cellars, and the
   forest swallowed the castle floor by floor. Zippy was that wizard's
   apprentice. Gribbus was the Keep's frog, who sat on the well and ate the
   flies, and who followed Zippy down because nobody told him not to. */
DG.QUESTS = {
  ember:  { name:"Ember of the First Flame", desc:"A coal that will not go out. It wants to go home, down to the Kiln.", flavor:"Warm as a hand on your shoulder." },
  lantern:{ name:"Olm's Lantern",            desc:"It has never once gone out. In its light, a door of eyes opens.", flavor:"It is heavier than a lantern should be." },
  shrooms:{ name:"Glowing Mushrooms",        desc:"Gribbus has been eating them. He has opinions now. Loud ones.", flavor:"They glow on the way down, too." }
};
/* ---- side roads: at most one a run, and only by chance (js/core/roads.js) ----
   ember   the Sealed Reliquary on floor 2 or 3, its Warden, the Ember, and
           past the Heart, the Kiln (THE FIRST FLAME)
   bog     ten glowing mushrooms down the dungeon; Gribbus eats them and
           grows; the Heart's portal runs green into the Glutton's Bog and
           the Bog Lord, Toad King (KING OF THE BOG)
   olm     Brother Olm, met twice; hear all he has to say and he gives up
           his lantern; a door of eyes in his library opens on the Flesh
           Library and the Archivist (THE WHITE WIZARD)  */
DG.ROUTES = { none:0.4, ember:0.2, bog:0.2, olm:0.2 };
DG.SHROOMS_NEED = 10;
DG.SHROOMS_PER_FLOOR = [2, 3, 2, 3, 3];       // 13 down the five floors; ten will do
DG.SHROOM_STAGES = [4, 7, 10];                // mushrooms eaten for each of his three growths
DG.OLM_ODDS = 0.35;                           // without his road, Olm turns up once in about a third of runs
/* the climb out: after the Heart, one long way up toward daylight (set up from the Gloom Forest's look in Dungeon.climb) */
DG.CLIMB_LEN = 96;
/* the Kiln: a sixth floor that only the Ember opens */
DG.KILN = { name:"The Kiln of the First Flame", boss:"hollow", gloom:0, floor:0x3a2a22, floor2:0x30221c, wall:0x4a3a30, top:0x5a4a3a, torch:0xff8a3a, fog:0x0a0402, water:0x6a2a10,
  ambient:0xc8885a, light:0.95, decor:"castle", motes:"dust", ink:0x140804, rim:0xff9a5a, shaft:0xffb070, mist:0.18, shade:0x2a1408, high:0xffd8a0, weird:0.15,
  enemies:{ skeleton:2, banshee:1, brute:1, husk:1, ghost:1.5, wight:1 } };
/* the Glutton's Bog (the mushroom road's last floor) and the Flesh Library (Olm's road's) */
DG.BOG = { name:"The Glutton's Bog", boss:"toadking", gloom:0.85, floor:0x1e2a16, floor2:0x18220f, wall:0x2a3420, top:0x223018, torch:0x7dff3a, fog:0x020803, water:0x2a5a16,
  ambient:0x5a8a4a, light:0.8, decor:"bog", motes:"glowbugs", ink:0x030a02, rim:0x9cff4a, shaft:0x9cff6a, mist:0.6, shade:0x0a1a06, high:0xd8ffb0, weird:0.5,
  enemies:{ evilfrog:3, blob:1.2, bloater:1, rotling:1.4, puffling:0.8, toadstool:0.8, spitter:0.6 } };
DG.FLESH = { name:"The Flesh Library", boss:"archivist", gloom:0.55, floor:0x3a2224, floor2:0x30191c, wall:0x5a2a30, top:0x4a2026, torch:0x7dff3a, fog:0x080204, water:0x4a0a14,
  ambient:0x8a5a62, light:0.82, decor:"flesh", motes:"ghostfog", ink:0x0e0306, rim:0x9cff6a, shaft:0xc8ffb0, mist:0.42, shade:0x2a0a12, high:0xffe0d0, weird:0.9,
  enemies:{ ghost:2, banshee:1, wight:1.6, evilfrog:1.8, poltergeist:1, skeleton:0.8 } };
DG.SIDE_FLOORS = { kiln:DG.KILN, bog:DG.BOG, flesh:DG.FLESH };
DG.ENDINGS = {
  dawn:{ title:"DAWN", sub:"The Gloom Heart is still.", lore:[
    "The Heart stopped, and the rot let go of the stone.",
    "Room by room, the Keep remembered it was a castle.",
    "Somewhere far below, the First Flame still gutters, untended. But the forest has drawn back, and that is enough, for now.",
    "Zippy came back up into the morning a grey wizard again, as his master had been.",
    "Gribbus went back to the well. The flies have never been so afraid."] },
  flame:{ title:"THE FIRST FLAME", sub:"The Kiln is lit.", lore:[
    "In the Kiln, Zippy found what was left of his master: hollow, burning cold, still guarding a fire he had let go out.",
    "He laid him to rest, and set the Ember in the hearth where it belonged.",
    "The First Flame woke. Its light ran up every stair of the Keep and out through the forest, and the Gloom had nowhere left to hide.",
    "There is a keeper in the Kiln again. He is grey, and he is patient, and he talks to his frog.",
    "Gribbus has his own chair by the fire. It is a very good chair."] },
  bog:{ title:"KING OF THE BOG", sub:"Gribbus ate the Toad King.", lore:[
    "Ten mushrooms, a dungeon's worth of glow, and one very old, very fat king who thought he was the hungriest thing in the dark.",
    "He was not. Gribbus swallowed him whole, crown and all.",
    "The Gloom did not die. It became a bog, green and loud and bright, and every frog in it bows to Gribbus.",
    "Zippy is his royal wizard now, by decree. He carries the King's lily pad and says nice things on command. He was not consulted.",
    "Long live the King of the Bog. Praise him. He is listening. Croak."] },
  white:{ title:"THE WHITE WIZARD", sub:"The book is closed.", lore:[
    "The Archivist wrote the dark down, page by page, and the Gloom grew out of the ink.",
    "Olm's lantern burned through the last of it. Every page went white.",
    "What the dark had written on Zippy went white too: every curse, every scar, every bargain. He came out of the library clean.",
    "Brother Olm says he always knew the lantern was meant for someone else. He is lying. He is very pleased.",
    "There is a white wizard in the Keep now, and the light goes where he goes. Gribbus sits in it. It is warm."] }
};
/* a line on arriving at each floor, so the story seeps in as you go down */
DG.LORE_FLOORS = [
  "The Keep was built around a fire. The fire is very far down now.",
  "The cellars flooded when the Flame guttered. The water hasn't forgotten.",
  "The keepers are buried here. Not all of them stayed buried.",
  "The forest came in through the walls. It was always waiting.",
  "The Gloom has a heart. You can hear it from here."
];

/* ---- floors: a dead castle that the Gloom (rot, mould, cordyceps, from
   Gloom Shooter) eats a little more of every floor, until floor 5 is no
   castle at all but a mushroom forest grown out of the dead. Cold, dark
   stone; the only warmth is in small pools of candle and torch light. `gloom` (0..1) drives the look: moss and
   rot on the floors, roots and bark over the walls, glowcaps for torches,
   brambles for gates, a forest beyond the walls. ---- */
DG.FLOORS = [
  { name:"The Forsaken Keep",     boss:"king",      alt:"gibbet",      gloom:0,    floor:0x3c3834, floor2:0x34302d, wall:0x5a544c, top:0x46413b, torch:0x9cff4a, fog:0x050404, water:0x1a2428,
    ambient:0x84868e, light:0.9, decor:"castle", motes:"dust",
    ink:0x0a0606, rim:0xff9a5a, shaft:0xa8b0c0, mist:0.2, shade:0x100e0e, high:0xffcf96, weird:0,
    enemies:{ grunt:3, slinger:2.2, bomber:0.8, sneak:0.3 } },
  { name:"The Weeping Undercroft", boss:"matriarch", alt:"ratking",     gloom:0.28, floor:0x33342d, floor2:0x2b2c26, wall:0x4a4a3f, top:0x3b3b33, torch:0xb8ff3a, fog:0x040504, water:0x1a2220,
    ambient:0x76786c, light:0.85, decor:"undercroft", motes:"spores",
    ink:0x060604, rim:0xd8b870, shaft:0xa8a48a, mist:0.34, shade:0x0e0e0a, high:0xf0e0b0, weird:0.1,
    enemies:{ grunt:1.5, slinger:1.2, bomber:1, shaman:1, puffling:2, toadstool:1.2, shroomkin:1.4, rotling:0.8, evilfrog:0.5 } },
  { name:"The Rotting Crypt",     boss:"bride",     alt:"gravedigger", gloom:0.5,  floor:0x2a2a30, floor2:0x232328, wall:0x3c3e4a, top:0x2f303a, torch:0x4affa0, fog:0x030409, water:0x18284a,
    ambient:0x56648e, light:0.8, decor:"crypt", motes:"ghostfog",
    ink:0x04040a, rim:0x8ad8ff, shaft:0x8aa8d8, mist:0.44, shade:0x0a0c14, high:0xd8ecff, weird:0.3,
    enemies:{ ghost:2.2, banshee:1, skeleton:2, poltergeist:1, sneak:0.6, brute:0.6, rotling:1.2, spitter:0.8, wight:0.8 } },
  { name:"The Gloomwood",         boss:"eye",       alt:"antlered",    gloom:0.78, floor:0x222824, floor2:0x1c221e, wall:0x322c34, top:0x2a2430, torch:0x7dffb0, fog:0x020304, water:0x161a20,
    ambient:0x5a6270, light:0.72, decor:"gloomwood", motes:"glowbugs",
    ink:0x050508, rim:0xb0bccc, shaft:0x9aa6b8, mist:0.5, shade:0x0c0c10, high:0xdce4ec, weird:0.62,
    enemies:{ watcher:1.2, blob:1.2, tentacle:1.4, rotling:1.6, spitter:1.4, bloater:1.2, shroomkin:0.8, puffling:0.8, ghost:0.6, wight:1, evilfrog:0.6 } },
  { name:"The Gloom Forest",      boss:"heart",     gloom:1,    floor:0x1c2220, floor2:0x171c1a, wall:0x281e28, top:0x221a24, torch:0x7dff3a, fog:0x010201, water:0x141c12,
    ambient:0x4a5648, light:0.66, decor:"forest", motes:"glowbugs",
    ink:0x050604, rim:0x9ab86a, shaft:0x8a9a78, mist:0.56, shade:0x0a0c08, high:0xdce4c0, weird:1,
    enemies:{ rotling:2, spitter:1.6, bloater:1.4, husk:1.6, shroomkin:1, toadstool:1, puffling:1, tentacle:1, banshee:0.6, watcher:0.6, wight:1.2, evilfrog:0.8 } }
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
  pond:   ["Gribbus' pond. Three gifts float on the lily pads. He may keep one.", "Still black water, and three lily pads. Gribbus looks at you. Choose for him.", "Three lily pads, three gifts. The other two will sink."],
  shroom: ["Gribbus eats the glowing mushroom. He glows a little too.", "Gribbus swallows it whole. His eyes go green for a moment.", "Gribbus eats it, and looks at you as if you should thank him."],
  praise: ["PRAISE HIM. He demands it.", "Gribbus is waiting to be told he is wonderful.", "Gribbus clears his throat. Loudly. Meaningfully."],
  altar:  ["The altar thirsts. A little of your life will do.", "Blood for power. The oldest bargain.", "The altar hums. It is hungry. It is always hungry."]
};
DG.DOOR_COLORS = [
  { id:"rust",  name:"rust",  hex:0x8a3a26 },
  { id:"moss",  name:"moss",  hex:0x4a6a34 },
  { id:"slate", name:"slate", hex:0x3a4a6a },
  { id:"ochre", name:"ochre", hex:0x9a7a2a }
];

/* ================================================================== *
 *  ROOMS: locked vaults, rare rooms, Brother Olm, secret-wall tells
 *  (the generator places them in dungeon.js; game.js runs them)
 * ================================================================== */
/* how often each turns up, per floor (rolled on the dungeon's own seed) */
DG.RARE_ROOMS = {
  vault:  f=> f === 1 ? 0.45 : 0.6,           // a locked vault: a key buys the good stuff
  pond:   f=> f === 1 ? 0.18 : 0.25,          // Gribbus' pond: rare (every floor once you're building the frog)
  altar:  f=> f === 1 ? 0 : 0.35,             // the cursed altar: blood for power, from floor 2
  weird:  f=> f === 1 ? 0.15 : 0.27,          // one weird room, good or bad, from the table below
  golden: f=> f === 1 ? 0.2 : 0.35,           // a key-locked golden chest in some goblin room
  joke:   0.18,                               // a soapstone joke scrawled in some goblin room
  table: [ { type:"throne", w:1, min:2 }, { type:"cage", w:1.3, min:1 }, { type:"gamble", w:1.3, min:1 } ]
};
DG.ROOM_SIZES = { vault:[9, 7, 11, 9], olm:[15, 11, 17, 13], throne:[13, 11, 15, 13], cage:[15, 11, 17, 13], gamble:[11, 9, 13, 11] };

/* ---- lairs: one mini-boss a floor, in a dead-end room of its own ----
   Each is an enemy you know, grown huge, with moves of its own (ai.js,
   LAIR). hp multiplies the base enemy's, so each is about 40% of that
   floor's boss. The Warden also keeps the Ember road's Reliquary. */
DG.LAIRS = {
  gaoler:   { name:"Skabb, the Gaoler",      base:"brute",    floors:[1, 2], size:1.75, hp:3.8,  dmg:1.25,
              intro:"Something big drags its chains across the floor.", lines:["IN YOU GO.", "I'VE A CELL FOR YOU.", "NOBODY LEAVES."] },
  cook:     { name:"The Spore-Cook",         base:"bloater",  floors:[2, 3], size:1.6,  hp:8,    dmg:1.2,
              intro:"A smell of boiled rot. Someone's been cooking.", lines:["MORE FOR THE POT.", "TASTE IT.", "STIR, STIR, STIR."] },
  warden:   { name:"The Reliquary Warden",   base:"skeleton", floors:[3],    size:1.9,  hp:21,   dmg:1.35, shield:true, road:"ember",
              intro:"An old keeper, still at his post. He doesn't know he's dead.", lines:["NONE PASS.", "THE FLAME IS SEALED.", "BEGONE, THIEF."] },
  leech:    { name:"The Leech Mother",       base:"tentacle", floors:[3, 4], size:1.8,  hp:15.5, dmg:1.2,
              intro:"The floor is wet, and it moves.", lines:[] },
  manyeyed: { name:"The Many-Eyed",          base:"watcher",  floors:[4, 5], size:1.85, hp:15.5, dmg:1.1,
              intro:"You can feel it looking. All of it.", lines:[] },
  hound:    { name:"Gnaw, the Kennel Hound",  base:"sneak",    floors:[1, 2], size:2.4,  hp:20,   dmg:1.2,
              intro:"Claws on stone. Something was kept down here, and never fed.", lines:[] },
  bellringer:{ name:"The Bell-Ringer",        base:"brute",    floors:[2, 3], size:1.7,  hp:5.5,  dmg:1.2,
              intro:"A bell tolls somewhere close. Nobody rings for the living.", lines:["DONG.", "FOR WHOM?", "FOR YOU."] },
  mothwidow:{ name:"The Moth-Widow",           base:"banshee",  floors:[3, 4], size:2.2,  hp:14,   dmg:1.15,
              intro:"Dust falls like snow. Wings, somewhere above.", lines:["Hush.", "To the light, little one.", "Burn with me."] },
  choir:    { name:"The Choir of Husks",     base:"husk",     floors:[5],    size:1.35, hp:4,    dmg:1.0, count:3,
              intro:"Three of them, singing with no mouths.", lines:["...", "hhhhhaaaaa", "SING"] }
};
DG.ROOM_SIZES.lair = [13, 11, 15, 12];

/* the Red Throne's price: one of these, forever (shown before you take) */
DG.PACTS = {
  halved:    { name:"The Halving",  desc:"your max health is cut in half, forever" },
  hunted:    { name:"Hunted",       desc:"from now on, half of every horde is elite" },
  blind:     { name:"The Blinding", desc:"you will never see the map again" },
  benighted: { name:"Benighted",    desc:"the dark and the fog follow you, floor after floor" }
};

/* Brother Olm, the Lantern Pilgrim: an old friend of Zippy's, a wizard of his
   master's school, taller and older, in a library he keeps for his frogs.
   Each "listen" says the next thing he hasn't said yet; what matters most
   first. Lines marked `route` come up only on that road; `visit:2` only the
   second time you find him. On his own road, hear all of it and he offers
   his lantern. */
DG.OLM = {
  name:"Brother Olm",
  greet:   ["Hm? Ah. Zippy. And the frog. Mind the little ones, they're reading.",
            "You again. Good. The frogs missed you. I did not. I'm lying.",
            "Still breathing? Splendid. Me too. Mostly.",
            "The wizard and his frog. Sit. Not on the scrolls."],
  remembered:"Zippy. I dreamt you died down here. More than once. Well. Tea?",
  talk: [
    { id:"chair",     text:"I came down for the light at the bottom. Forty years ago. Haven't found it. Found frogs, though. Ten of them. They read better than I do now." },
    { id:"frogs",     text:"The little ones learn from the scrolls. Spells, mostly. One of them can almost do a fireball. It's the one without eyebrows." },
    { id:"keys",      text:"Keys. Goblins hoard them like teeth. A door in chains wants one. What's behind is usually worth it. Usually." },
    { id:"walls",     text:"A room with one door is a liar. It means to have two. Watch for stone that breathes. Listen for the draught.", pri:1 },
    { id:"reliquary", text:"There's a reliquary a floor or two down. The First Flame sleeps inside, and an old keeper still keeps it. He doesn't know he's dead.", route:"ember", pri:3 },
    { id:"shrooms",   text:"There are mushrooms down here that glow like your frog's dreams. If he eats enough of them, something very fat and very old will come looking for him.", route:"bog", pri:3 },
    { id:"lairs",     text:"Every floor has a lair, and something in it grown fat on the rest. It sits on something worth having. Kill it and take it." },
    { id:"soapstone", text:"The dead scrawl on the floors in orange. 'Try wall.' Half of it is true. The other half is goblins." },
    { id:"throne",    text:"There's a red throne somewhere below. If you find it... no. If you find it, think of me. Then think again." },
    { id:"heart",     text:"The Heart at the bottom of all this beats. What beats can be stopped." },
    { id:"lamp1",     text:"This lantern has never once gone out. Forty years. I've never fed it. I find that suspicious.", route:"olm", pri:2 },
    { id:"lamp2",     text:"There's a door down here that only opens to it. Eyes, all over. I've seen it in the light, out of the corner of mine.", route:"olm" },
    { id:"lamp3",     text:"Behind it is the library the dark was written in. I went in once. The books read me back.", route:"olm", visit:2, pri:2 },
    { id:"lamp4",     text:"I'm too old to go back in. You aren't. I hate that you aren't.", route:"olm", visit:2 },
    { id:"lamp5",     text:"If you went... no. If you went, you'd need the lantern. And you'd need to come back out. Promise me the second part.", route:"olm", visit:2 },
    { id:"bored",     text:"I'm not afraid of dying down here. I'm afraid of dying bored. You help with that." }
  ],
  lantern: "Fine. FINE. Take it. It's heavier than it looks. When the door opens, don't read anything in there. Not one word.",
  lanternGone: "Go on. The door's open now. I can feel it from here, like a draught.",
  idle:    ["Hmm. Hmmm.", "The little ones say hello. That one says something rude.", "Go on. The dark won't clear itself. Well. It might. Unlikely.", "Mind the frogs near the candles."],
  bless:   ["Kneel. No, the other knee. There.", "May it hold longer than my knees did.", "The lantern remembers you now. Lucky you."],
  scroll:  ["Take it. The frogs have finished with it. Mostly.", "One of the little ones copied this out. Badly. It still works.", "A good one. Don't let your frog eat it."],
  trade:   ["Give it here. Hm. Take this instead. Don't ask where it's been.", "A fair swap. Fairer for you. I'm old, what do I need it for?"],
  mend:    ["Sit by the fire. It's mostly fire.", "Drink. It's tea. It was tea. Drink anyway."],
  key:     ["A key. Found it in a goblin. Don't ask which end.", "Here. It opens something. Most things, if you push."],
  broke:   ["No coin? Neither have I. We're rich in other ways. Not useful ways."],
  nothing: ["You've nothing I can turn. Come back heavier."],
  done:    ["Once is a kindness. Twice is a habit. Come find me again."],
  leave:   ["Go well, Zippy. Go well, frog.", "Mind the dark. It minds you."]
};

/* orange messages scrawled on the floor, by the dead, for the living */
DG.SOAPSTONE = {
  honest: ["Try wall", "Hidden path ahead", "Could this be a secret?", "Wall, therefore try", "Try wall... O wall!"],
  joke:   ["Praise the frog!", "Be wary of frog", "Amazing chest ahead", "Liar ahead", "Time for crossbow", "Visions of key..."]
};

Object.assign(DG.LINES, {
  vault:  ["Some dead miser's hoard. He won't be needing it.", "Locked away for a reason. The reason is now yours.", "Gold has a smell down here. It's this room."],
  throne: ["Something on the throne is watching you. Possibly the throne.", "The air tastes of iron. A god left a gift here, and wants something back."],
  cage:   ["A treasure in a cage. The cage isn't for the treasure.", "Too easy. Far too easy."],
  gamble: ["The house is very old, and has never lost.", "Dice carved from knucklebones. Whose? Best not."],
  sprung: ["IT'S A TRAP. Of course it's a trap.", "The cage was bait. You were the fish."],
  olmRoom:["Candlelight. Scrolls everywhere. Small frogs, reading.", "Somebody lives here. Somebody with a lantern, and a great many frogs."],
  sprungClear:["The cage is empty. So is the room. You win this one.", "Survived the bait. The prize is yours, fair and bloody."]
});

})(typeof window !== "undefined" ? window : globalThis);
