/* ------------------------------------------------------------------ *
 *  Every powerup, active item, level-up boon and Gribbus buff.
 *
 *  A powerup is data, built from four parts that all stack:
 *    stats  numbers: dmg +0.2 means +20% damage; dmgMul multiplies
 *    shot   the shape of every shot: bounces, pierce, homing, split...
 *    els    elements added to every shot
 *    on     triggers -> payloads: { bounce:[{ do:"byproduct" }] }
 *  ...plus `special` for the handful of godly things that need code.
 *
 *  Triggers: fire hit kill crit bounce wall expire blink blinkEnd hurt
 *            clear lock tick (every `every` seconds) reload spell
 *  Payloads: byproduct shards wisp burst chain nova ring tadpole heal
 *            mana ward gold blackhole status
 *
 *  Tiers: 0 common, 1 uncommon, 2 rare, 3 legendary, 4 GODLY.
 *  Pools: t treasure, s shop, b boss, x secret, a altar.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;

DG.TIERS = [
  { id:"common",    name:"Common",    color:"#d8d8d8" },
  { id:"uncommon",  name:"Uncommon",  color:"#5bd16b" },
  { id:"rare",      name:"Rare",      color:"#4aa8ff" },
  { id:"legendary", name:"Legendary", color:"#ff9a2e" },
  { id:"godly",     name:"GODLY",     color:"#fff27a" }
];
/* how likely each tier is, per pool (floor nudges these up) */
DG.POOL_TIERS = {
  t:[52, 32, 13, 2.6, 0.4],
  s:[50, 36, 13, 1,   0],
  b:[18, 38, 32, 10,  2],
  x:[8,  28, 40, 19,  5],
  a:[0,  8,  42, 38,  12]
};

const I = (o)=> o;
DG.ITEMS = {
  /* ---------------- stats: the bread and butter ---------------- */
  spinach:    I({ name:"Suspicious Spinach", tier:0, pools:"tsb",  desc:"+25% damage.", flavor:"It glows a little.", stats:{ dmg:0.25 } }),
  coffee:     I({ name:"Goblin Coffee",      tier:0, pools:"tsb",  desc:"+25% fire rate.", flavor:"Brewed in a boot.", stats:{ rate:0.25 } }),
  boots:      I({ name:"Zoomy Boots",        tier:0, pools:"ts",   desc:"+15% move speed.", stats:{ speed:0.15 } }),
  heartjar:   I({ name:"Heart in a Jar",     tier:0, pools:"tsb",  desc:"+25 max health, and heals it.", stats:{ hp:25 } }),
  teapot:     I({ name:"Mana Teapot",        tier:0, pools:"ts",   desc:"+60% mana regeneration.", stats:{ regen:0.6 } }),
  clover:     I({ name:"Four-Leaf Clover",   tier:0, pools:"tsx",  desc:"+1 luck: every chance-based effect fires more often.", stats:{ luck:1 } }),
  lens:       I({ name:"Magnifying Lens",    tier:0, pools:"ts",   desc:"+40% shot size, +10% damage.", stats:{ size:0.4, dmg:0.1 } }),
  scope:      I({ name:"Long Scope",         tier:0, pools:"ts",   desc:"+45% range, +20% shot speed.", stats:{ range:0.45, shotSpeed:0.2 } }),
  tallhat:    I({ name:"Taller Hat",         tier:0, pools:"ts",   desc:"+30 max mana. Purely for the hat.", stats:{ mana:30 } }),
  specs:      I({ name:"Crit Specs",         tier:0, pools:"tsb",  desc:"+10% critical chance.", stats:{ crit:0.1 } }),
  magnet:     I({ name:"Coin Magnet",        tier:0, pools:"ts",   desc:"Coins fly to you from further away. +25% gold.", stats:{ magnet:2, gold:0.25 } }),
  hourglass:  I({ name:"Sticky Hourglass",   tier:0, pools:"ts",   desc:"Blink recharges 35% faster.", stats:{ blinkCd:0.35 } }),
  socks:      I({ name:"Comfy Socks",        tier:0, pools:"ts",   desc:"+10% speed. You never slip on banana peels.", stats:{ speed:0.1, noSlip:1 } }),
  snack:      I({ name:"Emergency Snack",    tier:0, pools:"ts",   desc:"+2 wards (each blocks one hit).", stats:{ wards:2 } }),
  chunky:     I({ name:"Chunky Bullets",     tier:1, pools:"tsb",  desc:"+30% damage, +30% size, -10% shot speed.", stats:{ dmg:0.3, size:0.3, shotSpeed:-0.1 } }),
  tiny:       I({ name:"Tiny Bullets",       tier:1, pools:"ts",   desc:"+40% fire rate, +25% shot speed, -15% damage, smaller shots.", stats:{ rate:0.4, shotSpeed:0.25, dmg:-0.15, size:-0.3 } }),
  steroids:   I({ name:"Wizard Steroids",    tier:2, pools:"bx",   desc:"+50% damage. Your beard is now magnificent.", stats:{ dmg:0.5 } }),
  caffeine:   I({ name:"Triple Espresso",    tier:2, pools:"bx",   desc:"+50% fire rate, +10% speed.", stats:{ rate:0.5, speed:0.1 } }),
  glasscannon:I({ name:"Glass Cannon",       tier:2, pools:"ax",   desc:"Double damage. -40 max health.", stats:{ dmgMul:2, hp:-40 } }),
  luckyfoot:  I({ name:"Lucky Goblin Foot",  tier:1, pools:"ts",   desc:"+2 luck. The goblin wants it back.", stats:{ luck:2 } }),
  desperation:I({ name:"Desperation",        tier:1, pools:"tb",   desc:"+70% damage while below 30% health.", special:"desperation" }),
  overflow:   I({ name:"Overflowing Cup",    tier:1, pools:"ts",   desc:"+40% damage while your mana is full.", special:"overflow" }),
  patience:   I({ name:"Patience",           tier:1, pools:"tb",   desc:"Shots hit up to 2x harder the longer you wait between them.", special:"patience" }),

  /* ---------------- the shape of every shot ---------------- */
  rubber:     I({ name:"Rubber Wand",        tier:1, pools:"tsb",  desc:"Shots bounce off walls twice.", shot:{ bounces:2 } }),
  pinball:    I({ name:"Pinball Wizard",     tier:2, pools:"tbx",  desc:"Shots bounce 4 more times and hit 15% harder after every bounce.", shot:{ bounces:4, bounceDmg:0.15 } }),
  sharp:      I({ name:"Sharpened Rounds",   tier:1, pools:"tsb",  desc:"Shots pierce one more goblin.", shot:{ pierce:1 } }),
  drill:      I({ name:"Drill Bits",         tier:2, pools:"tb",   desc:"Shots pierce two more goblins and hit harder each time they do.", shot:{ pierce:2, pierceDmg:0.2 } }),
  seeker:     I({ name:"Seeker Spirit",      tier:1, pools:"tsb",  desc:"Shots curve toward goblins.", shot:{ homing:1 } }),
  splitter:   I({ name:"Splitter",           tier:1, pools:"tb",   desc:"Shots split in two on their first hit.", shot:{ split:2 } }),
  twinshot:   I({ name:"Twinshot",           tier:1, pools:"tsb",  desc:"+1 shot per volley. -10% damage.", shot:{ extra:1 }, stats:{ dmg:-0.1 } }),
  triple:     I({ name:"Triple Trouble",     tier:2, pools:"tbx",  desc:"+2 shots per volley. -20% damage.", shot:{ extra:2 }, stats:{ dmg:-0.2 } }),
  sideeyes:   I({ name:"Side Eyes",          tier:1, pools:"ts",   desc:"Every volley also fires left and right.", shot:{ side:1 } }),
  rearguard:  I({ name:"Rear Guard",         tier:0, pools:"ts",   desc:"Every volley also fires behind you.", shot:{ back:1 } }),
  wiggle:     I({ name:"Wiggle Worm",        tier:1, pools:"ts",   desc:"Shots wiggle. +15% damage, +20% size. Look at them go.", shot:{ wiggle:1 }, stats:{ dmg:0.15, size:0.2 } }),
  orbiter:    I({ name:"Orbit Rounds",       tier:2, pools:"tb",   desc:"One shot per volley circles you for 3 seconds before flying off.", shot:{ orbit:1 } }),
  boomerang:  I({ name:"Boomerang Magic",    tier:1, pools:"tb",   desc:"Shots come back, and pierce on the way home.", shot:{ boomerang:1 } }),
  ghostshot:  I({ name:"Ghost Rounds",       tier:2, pools:"tbx",  desc:"Shots pass through walls.", shot:{ spectral:1 } }),
  snowball:   I({ name:"Snowball Effect",    tier:1, pools:"tb",   desc:"Shots grow and hit harder the further they fly.", shot:{ grow:1 } }),
  rocket:     I({ name:"Rocket Fuel",        tier:1, pools:"ts",   desc:"Shots accelerate. +15% damage.", shot:{ accel:1 }, stats:{ dmg:0.15 } }),
  corkscrew:  I({ name:"Spiral Sorcery",     tier:1, pools:"ts",   desc:"Shots corkscrew outward in spirals.", shot:{ spiral:1 } }),
  chaos:      I({ name:"Chaos Theory",       tier:1, pools:"tx",   desc:"Shots fly in random directions. +60% fire rate, +1 shot. Good luck.", shot:{ chaos:1, extra:1 }, stats:{ rate:0.6 } }),
  burstfire:  I({ name:"Burst Fire",         tier:1, pools:"ts",   desc:"Each trigger pull fires a 3-round burst. -25% fire rate.", shot:{ burst:2 }, stats:{ rate:-0.25 } }),
  echo:       I({ name:"Echo Chamber",       tier:2, pools:"tb",   desc:"Every volley fires again a moment later at 60% damage.", shot:{ echo:1 } }),
  kaleido:    I({ name:"Kaleidoscope",       tier:3, pools:"bxa",  desc:"Every volley is mirrored in four directions.", shot:{ kaleido:1 } }),

  /* ---------------- elements on every shot ---------------- */
  frostrounds:I({ name:"Frost Rounds",       tier:1, pools:"tsb",  desc:"Every shot carries frost.", els:["frost"] }),
  emberrounds:I({ name:"Ember Rounds",       tier:1, pools:"tsb",  desc:"Every shot carries fire.", els:["fire"] }),
  venomrounds:I({ name:"Venom Rounds",       tier:1, pools:"tsb",  desc:"Every shot carries poison.", els:["poison"] }),
  staticrounds:I({ name:"Static Rounds",     tier:1, pools:"tsb",  desc:"Every shot carries shock.", els:["shock"] }),
  arcanerounds:I({ name:"Arcane Rounds",     tier:1, pools:"tsb",  desc:"Every shot carries arcane.", els:["arcane"] }),
  prism:      I({ name:"Little Prism",       tier:2, pools:"tbx",  desc:"Every shot picks up a random extra element.", special:"prism" }),
  elementalist:I({ name:"Elementalist",      tier:2, pools:"tbx",  desc:"+15% damage for every different element your shots carry.", special:"elementalist" }),

  /* ---------------- triggers: when X, do Y ---------------- */
  crystal:    I({ name:"Crystal Growth",     tier:1, pools:"tb",   desc:"When a shot bounces, it leaves its element behind: icicles, flames, puddles, sparks, runes.", on:{ bounce:[{ do:"byproduct" }] } }),
  leaky:      I({ name:"Leaky Shots",        tier:1, pools:"ts",   desc:"Shots leave their element behind where they land.", on:{ wall:[{ do:"byproduct" }], expire:[{ do:"byproduct", chance:0.5 }] } }),
  wispcraft:  I({ name:"Wispcraft",          tier:2, pools:"tbx",  desc:"Everything your element leaves behind releases a wisp that hunts goblins.", special:"wispcraft" }),
  blossom:    I({ name:"Death Blossom",      tier:1, pools:"tb",   desc:"Goblins burst into 6 shards when they die.", on:{ kill:[{ do:"shards", n:6, dmg:0.5 }] } }),
  hotpotato:  I({ name:"Hot Potato",         tier:1, pools:"tsb",  desc:"Goblins explode when they die.", on:{ kill:[{ do:"burst", r:1.7, dmg:1.0 }] } }),
  discharge:  I({ name:"Static Discharge",   tier:1, pools:"tb",   desc:"Kills throw lightning to 3 more goblins.", on:{ kill:[{ do:"chain", jumps:3, dmg:0.8 }] } }),
  shrapnel:   I({ name:"Shrapnel",           tier:1, pools:"ts",   desc:"25% chance a hit throws 3 shards.", on:{ hit:[{ do:"shards", n:3, dmg:0.4, chance:0.25 }] } }),
  shatterglass:I({ name:"Shatterglass",      tier:1, pools:"tb",   desc:"Bounces throw 2 shards.", on:{ bounce:[{ do:"shards", n:2, dmg:0.4 }] } }),
  mirrorblink:I({ name:"Mirror Blink",       tier:1, pools:"ts",   desc:"Blinking fires a ring of 8 shots.", on:{ blink:[{ do:"ring", n:8, dmg:0.8 }] } }),
  trailblazer:I({ name:"Trail Blazer",       tier:1, pools:"ts",   desc:"Blinking leaves your element behind at both ends.", on:{ blink:[{ do:"byproduct", at:"player" }], blinkEnd:[{ do:"byproduct", at:"player" }] } }),
  spite:      I({ name:"Spite",              tier:1, pools:"tb",   desc:"Getting hurt sets off a nova of your element.", on:{ hurt:[{ do:"nova", r:3.4, dmg:1.5 }] } }),
  spikyhat:   I({ name:"Spiky Hat",          tier:0, pools:"ts",   desc:"Getting hurt fires 12 shards.", on:{ hurt:[{ do:"shards", n:12, dmg:0.7, at:"player" }] } }),
  leech:      I({ name:"Leech Fang",         tier:1, pools:"tsb",  desc:"15% of kills heal 3.", on:{ kill:[{ do:"heal", n:3, chance:0.15 }] } }),
  siphon:     I({ name:"Soul Siphon",        tier:0, pools:"ts",   desc:"Kills give 6 mana.", on:{ kill:[{ do:"mana", n:6 }] } }),
  papershield:I({ name:"Paper Shield",       tier:1, pools:"ts",   desc:"Clearing a room gives a ward (up to 3).", on:{ clear:[{ do:"ward", n:1, max:3 }] } }),
  lunchbox:   I({ name:"Lunchbox",           tier:0, pools:"ts",   desc:"Clearing a room heals 8.", on:{ clear:[{ do:"heal", n:8 }] } }),
  fireworks:  I({ name:"Crit Fireworks",     tier:1, pools:"tb",   desc:"Critical hits explode. +5% crit.", stats:{ crit:0.05 }, on:{ crit:[{ do:"burst", r:1.2, dmg:0.6 }] } }),
  tictoc:     I({ name:"Tick Tock",          tier:2, pools:"tb",   desc:"Every 2 seconds in a fight, fire a ring of 6 shots.", on:{ tick:[{ do:"ring", n:6, dmg:0.7, every:2 }] } }),
  fizzlepop:  I({ name:"Fizzlepop",          tier:1, pools:"ts",   desc:"Shots that run out of range go pop.", on:{ expire:[{ do:"burst", r:1.1, dmg:0.5 }] } }),
  staticcling:I({ name:"Static Cling",       tier:1, pools:"ts",   desc:"15% of hits arc to 2 more goblins.", on:{ hit:[{ do:"chain", jumps:2, dmg:0.5, chance:0.15 }] } }),
  coldshoulder:I({ name:"Cold Shoulder",     tier:1, pools:"ts",   desc:"10% of hits set off a little frost nova.", on:{ hit:[{ do:"nova", r:1.6, dmg:0.4, el:"frost", chance:0.1 }] } }),
  rotbloom:   I({ name:"Rot Bloom",          tier:1, pools:"ts",   desc:"Kills leave a toxic puddle.", on:{ kill:[{ do:"byproduct", el:"poison" }] } }),
  popsicle:   I({ name:"Popsicle",           tier:1, pools:"ts",   desc:"Kills leave an icicle.", on:{ kill:[{ do:"byproduct", el:"frost" }] } }),
  hotswap:    I({ name:"Hot Swap",           tier:1, pools:"ts",   desc:"Reloading sets off a nova of your element.", on:{ reload:[{ do:"nova", r:2.6, dmg:0.9 }] } }),
  spellecho:  I({ name:"Spell Echo",         tier:2, pools:"tbx",  desc:"Your spells cast twice.", special:"spellecho" }),
  midaspocket:I({ name:"Midas Pocket",       tier:0, pools:"ts",   desc:"Every kill drops an extra coin. +10% gold.", stats:{ gold:0.1 }, on:{ kill:[{ do:"gold", n:1 }] } }),
  tadpact:    I({ name:"Tadpole Pact",       tier:1, pools:"ts",   desc:"20% of kills hatch a tadpole that nibbles goblins.", on:{ kill:[{ do:"tadpole", n:1, chance:0.2 }] } }),
  froglock:   I({ name:"Frog Rain",          tier:1, pools:"ts",   desc:"When a room locks, 3 tadpoles drop from the ceiling.", on:{ lock:[{ do:"tadpole", n:3, at:"player" }] } }),
  lantern:    I({ name:"Wisp Lantern",       tier:1, pools:"tb",   desc:"When a room locks, 2 arcane wisps join you.", on:{ lock:[{ do:"wisp", n:2, el:"arcane", at:"player" }] } }),
  swampfeet:  I({ name:"Swamp Feet",         tier:1, pools:"ts",   desc:"While you move in a fight, you leave your element behind you.", on:{ tick:[{ do:"byproduct", at:"player", every:1.1, moving:true }] } }),
  overkill:   I({ name:"Overkill",           tier:1, pools:"tb",   desc:"Damage past a kill jumps to the nearest goblin.", special:"overkill" }),
  graverise:  I({ name:"Grave Calling",      tier:2, pools:"bxa",  desc:"Half of all kills rise as a wisp of your element.", on:{ kill:[{ do:"wisp", n:1, chance:0.5 }] } }),

  /* ---------------- element combos ---------------- */
  plague:     I({ name:"Plague Spreader",    tier:2, pools:"tbx",  desc:"Poison jumps from goblin to goblin every second, and poisoned goblins pop into clouds.", special:"plague" }),
  wildfire:   I({ name:"Wildfire",           tier:2, pools:"tb",   desc:"Burning goblins explode into flames when they die.", special:"wildfire" }),
  brittle:    I({ name:"Brittle",            tier:1, pools:"tb",   desc:"Chilled and frozen goblins take 35% more damage.", special:"brittle" }),
  conductor:  I({ name:"Conductor",          tier:2, pools:"tb",   desc:"15% of hits arc; every arc jumps 2 extra times.", special:"conductor" }),
  thermal:    I({ name:"Thermal Shock",      tier:2, pools:"tbx",  desc:"Elemental reactions deal 2.5x damage.", special:"thermal" }),
  overgrowth: I({ name:"Overgrowth",         tier:1, pools:"tb",   desc:"Icicles, flames, puddles, sparks and runes last twice as long and grow bigger.", special:"overgrowth" }),
  wisplord:   I({ name:"Wisp Whisperer",     tier:1, pools:"tb",   desc:"Wisps last twice as long and hit twice as hard.", special:"wisplord" }),
  megabombs:  I({ name:"Mega Bombs",         tier:2, pools:"tbx",  desc:"Every explosion is 60% bigger and hits harder.", special:"megabombs" }),

  /* ---------------- legendary ---------------- */
  hydra:      I({ name:"Hydra Wand",         tier:3, pools:"bxa",  desc:"Shots split into three on every bounce. +2 bounces.", shot:{ bounces:2, bounceSplit:1 } }),
  stormcaller:I({ name:"Stormcaller",        tier:3, pools:"bxa",  desc:"Every 2.5 seconds in a fight, lightning strikes and leaps 4 times.", on:{ tick:[{ do:"chain", jumps:4, dmg:1.6, every:2.5, target:"random" }] } }),
  blizzard:   I({ name:"Blizzard Heart",     tier:3, pools:"bxa",  desc:"Frost on every shot, and a frost nova around you every 5 seconds.", els:["frost"], on:{ tick:[{ do:"nova", r:3.6, dmg:1.2, el:"frost", every:5, at:"player" }] } }),
  inferno:    I({ name:"Infernal Engine",    tier:3, pools:"bxa",  desc:"Fire on every shot, and you leave a trail of flames.", els:["fire"], on:{ tick:[{ do:"byproduct", el:"fire", at:"player", every:0.45, moving:true }] } }),
  moons:      I({ name:"Moon Moons",         tier:3, pools:"bxa",  desc:"Three moons orbit you, block shots, and hurt goblins.", special:"moons" }),
  dualwield:  I({ name:"Dual Wield",         tier:3, pools:"bxa",  desc:"Your other guns fire too, every time you shoot.", special:"dualwield" }),
  gremlin:    I({ name:"Gremlin in a Bottle",tier:3, pools:"xa",   desc:"Every 8 seconds in a fight, a random payload goes off. Any of them.", special:"gremlin" }),

  /* ---------------- GODLY ---------------- */
  prismheart: I({ name:"Prism Heart",        tier:4, pools:"xab",  desc:"Every shot carries every element.", flavor:"You can taste colours now.", special:"prismheart" }),
  recursion:  I({ name:"Recursion Engine",   tier:4, pools:"xab",  desc:"Things your shots make can make more things. Three levels deep.", flavor:"It's turtles all the way down.", special:"recursion" }),
  shadow:     I({ name:"Zippy's Shadow",     tier:4, pools:"xab",  desc:"A shadow Zippy follows you and copies every shot.", flavor:"He's a bit rude.", special:"shadow" }),
  horizon:    I({ name:"Event Horizon",      tier:4, pools:"xab",  desc:"Shots that run out collapse into little black holes.", flavor:"Please don't look directly at it.", special:"horizon" }),
  frogsona:   I({ name:"Frogsona",           tier:4, pools:"xab",  desc:"Gribbus fires copies of your shots.", flavor:"Gribbus has found himself.", special:"frogsona" }),
  midas:      I({ name:"Midas Touch",        tier:4, pools:"xab",  desc:"Goblins die as gold statues that explode into coins and shards.", flavor:"Everything is gold. Everything.", special:"midas", on:{ kill:[{ do:"shards", n:10, dmg:0.8 }, { do:"gold", n:2 }] } }),
  reverse:    I({ name:"Reverse Bullet Hell",tier:4, pools:"xab",  desc:"Enemy shots that just miss you turn around and become yours.", flavor:"Thank you for your bullets.", special:"graze" }),
  infinity:   I({ name:"Infinite Ricochet",  tier:4, pools:"xab",  desc:"Shots bounce forever (well, for 4 seconds) and get stronger every bounce.", flavor:"Physics has left the chat.", shot:{ bounces:99, bounceDmg:0.12, lifeAdd:3 } }),
  godwand:    I({ name:"The Godwand",        tier:4, pools:"xab",  desc:"Double damage, +50% fire rate, +2 shots, homing.", flavor:"Simple. Effective. Smug.", stats:{ dmgMul:2, rate:0.5 }, shot:{ extra:2, homing:1 } })
};

/* named pairs: own both and they announce themselves, with a bonus */
DG.DUOS = [
  { a:"rubber",      b:"frostrounds", name:"Brain Freeze",   desc:"Bounces grow icicles.",                 on:{ bounce:[{ do:"byproduct", el:"frost" }] } },
  { a:"plague",      b:"staticrounds",name:"Plague Storm",   desc:"Every poison jump also throws lightning.", special:"plaguestorm" },
  { a:"hotpotato",   b:"megabombs",   name:"Chain Reaction", desc:"Explosions have a 40% chance to explode again.", special:"chainreaction" },
  { a:"seeker",      b:"boomerang",   name:"Homing Pigeon",  desc:"Boomerangs hunt on the way back too, +30% damage.", stats:{ dmg:0.3 } },
  { a:"wispcraft",   b:"crystal",     name:"Wisp Garden",    desc:"Every bounce releases a wisp directly.", on:{ bounce:[{ do:"wisp", n:1, chance:0.5 }] } },
  { a:"emberrounds", b:"frostrounds", name:"Fire and Ice",   desc:"Steam reactions also freeze everything nearby.", special:"fireice" },
  { a:"tadpact",     b:"froglock",    name:"Frog Swarm",     desc:"Tadpoles are twice as many and twice as hungry.", special:"frogswarm" },
  { a:"chunky",      b:"snowball",    name:"Avalanche",      desc:"Growing shots get 2x bigger, and crush through goblins.", shot:{ pierce:2 } }
];

/* guns + the right powerup become something else (Vampire Survivors' evolutions) */
DG.ASCENSIONS = [
  { base:"pistol",   item:"seeker",      name:"Seeker Sidearm",    innate:["seeker", "sharp"],         flavor:"It finds them. It always finds them." },
  { base:"smg",      item:"venomrounds", name:"Plague Sprayer",    innate:["plague", "venomrounds"],   flavor:"Hold the trigger. Hold your breath." },
  { base:"shotgun",  item:"rubber",      name:"Pinball Blaster",   innate:["pinball"],                 flavor:"TILT." },
  { base:"rifle",    item:"staticrounds",name:"Railgun",           innate:["drill", "staticcling"],    flavor:"Through the goblin, the wall, and probably the next floor." },
  { base:"launcher", item:"hotpotato",   name:"Boomstick Supreme", innate:["megabombs"],               flavor:"There is no kill like overkill." }
];

/* ---- active items: one at a time, on F, charged by clearing rooms ---- */
DG.ACTIVES = {
  watch:   { name:"Pocket Watch",   charge:3, desc:"Freezes every goblin and every shot for 3 seconds." },
  frograin:{ name:"Frog Rain",      charge:2, desc:"Eight tadpoles rain down and go hunting." },
  bomb:    { name:"Big Goblin Bomb",charge:1, desc:"Throw a huge bomb where you're aiming." },
  slate:   { name:"Clean Slate",    charge:2, desc:"Deletes every enemy shot and sets off a nova." },
  mirror:  { name:"Mirror Image",   charge:3, desc:"A shadow Zippy copies your shots for 8 seconds." },
  turret:  { name:"Shroom Turret",  charge:2, desc:"Plants a mushroom that fires your shots for 10 seconds." },
  seer:    { name:"Seer's Lantern", charge:2, desc:"Reveals the whole floor, secrets included." },
  dice:    { name:"Goblin Dice",    charge:3, desc:"Rerolls every item pedestal in the room." },
  meteor:  { name:"Meteor Swarm",   charge:3, desc:"Six meteors slam into goblins." },
  soup:    { name:"Bottomless Soup",charge:4, desc:"Heals 40." }
};

/* ---- level-up boons: pick 1 of 3 ---- */
DG.BOONS = {
  b_dmg:    { name:"Sharper Spells",   desc:"+10% damage.",            stats:{ dmg:0.1 } },
  b_rate:   { name:"Quicker Fingers",  desc:"+12% fire rate.",         stats:{ rate:0.12 } },
  b_speed:  { name:"Light Feet",       desc:"+7% move speed.",         stats:{ speed:0.07 } },
  b_hp:     { name:"Hearty",           desc:"+15 max health.",         stats:{ hp:15 } },
  b_mana:   { name:"Deep Pockets",     desc:"+20 max mana, +15% regen.", stats:{ mana:20, regen:0.15 } },
  b_crit:   { name:"Lucky Strikes",    desc:"+6% crit chance.",        stats:{ crit:0.06 } },
  b_critx:  { name:"Big Crits",        desc:"Crits deal 2.5x instead of 2x.", stats:{ critMul:0.5 } },
  b_luck:   { name:"Charmed",          desc:"+1 luck.",                stats:{ luck:1 } },
  b_blink:  { name:"Blink Practice",   desc:"Blink recharges 15% faster.", stats:{ blinkCd:0.15 } },
  b_shot:   { name:"Fast Shots",       desc:"+15% shot speed, +15% range.", stats:{ shotSpeed:0.15, range:0.15 } },
  b_size:   { name:"Big Shots",        desc:"+20% shot size, +5% damage.", stats:{ size:0.2, dmg:0.05 } },
  b_magnet: { name:"Shiny Eyes",       desc:"Bigger coin magnet, +10% gold.", stats:{ magnet:1.5, gold:0.1 } },
  b_ward:   { name:"Thick Robe",       desc:"+1 ward now.",            stats:{ wards:1 } },
  b_reload: { name:"Nimble Reload",    desc:"Reload 25% faster, +25% magazine.", stats:{ reload:0.25, mag:0.25 } },
  b_spell:  { name:"Thrifty Caster",   desc:"Spells cost 20% less mana.", stats:{ spellCost:0.2 } },
  b_status: { name:"Lingering Magic",  desc:"Statuses last 30% longer.", stats:{ statusDur:0.3 } },
  b_boom:   { name:"Kaboomist",        desc:"Explosions 20% bigger.",  stats:{ boom:0.2 } },
  b_byprod: { name:"Leftovers",        desc:"Byproducts last 40% longer.", stats:{ byproductDur:0.4 } },
  b_wisp:   { name:"Wisp Friend",      desc:"Wisps hit 30% harder.",   stats:{ wispDmg:0.3 } },
  b_frog:   { name:"Frog Snacks",      desc:"Gribbus attacks 20% faster.", stats:{ frogRate:0.2 } },
  b_frogd:  { name:"Frog Strength",    desc:"Gribbus hits 30% harder.", stats:{ frogDmg:0.3 } },
  b_killmana:{ name:"Mana Leak",       desc:"Kills give 3 more mana.", stats:{ killMana:3 } },
  b_blinkb: { name:"Blink Burn",       desc:"Blinking leaves flames where you land.", on:{ blinkEnd:[{ do:"byproduct", el:"fire", at:"player" }] } },
  b_blinkf: { name:"Blink Frost",      desc:"Blinking chills goblins where you start.", on:{ blink:[{ do:"nova", r:2, dmg:0.3, el:"frost", at:"player" }] } },
  b_pierce: { name:"Pointy",           desc:"+1 pierce.", rare:true,   shot:{ pierce:1 } },
  b_bounce: { name:"Springy",          desc:"+1 bounce.", rare:true,   shot:{ bounces:1 } },
  b_extra:  { name:"One More",         desc:"+1 shot per volley, -8% damage.", rare:true, shot:{ extra:1 }, stats:{ dmg:-0.08 } },
  b_home:   { name:"Guided",           desc:"Shots curve slightly toward goblins.", rare:true, shot:{ homing:0.5 } }
};

/* ---- Gribbus buffs: chosen at frog ponds (1 of 3). `locked` ones need golden flies ---- */
DG.FROG_BUFFS = {
  tongue:   { name:"Long Tongue",    desc:"Gribbus' tongue reaches twice as far.",           g:{ reach:1 } },
  spit:     { name:"Toxic Spit",     desc:"Gribbus spits poison globs that leave puddles.",   g:{ spitEl:"poison", spitPuddle:1 } },
  croak:    { name:"Frost Croak",    desc:"Every 4 seconds Gribbus croaks and chills everything near him.", g:{ croak:1 } },
  hop:      { name:"Hop Lightning",  desc:"Gribbus hops between goblins, zapping each one.", g:{ hopZap:1 } },
  brood:    { name:"Tadpole Brood",  desc:"Gribbus hatches a tadpole every 5 seconds in a fight.", g:{ brood:1 } },
  lily:     { name:"Lily Shield",    desc:"Gribbus' lily pad blocks enemy shots near you.",  g:{ lily:1 } },
  gulp:     { name:"Bullet Gulp",    desc:"Gribbus eats enemy shots and spits them back.",   g:{ gulp:1 }, locked:2 },
  crown:    { name:"Royal Crown",    desc:"Gribbus is royalty now. +60% damage.",           g:{ dmg:0.6 } },
  bigboy:   { name:"Big Boy",        desc:"Gribbus is twice the frog. +40% damage, bigger hits.", g:{ size:1, dmg:0.4 } },
  flyhunt:  { name:"Fly Hunter",     desc:"Gribbus' kills drop flies that heal 2.",          g:{ flies:1 }, locked:1 },
  mirror:   { name:"Mirror Skin",    desc:"Gribbus' attacks carry your elements.",           g:{ mirrorEls:1 } },
  bubble:   { name:"Bubble Blower",  desc:"Gribbus blows bubbles that trap goblins for 2 seconds.", g:{ bubble:1 }, locked:2 },
  doom:     { name:"Croak of Doom",  desc:"Every 10 seconds, a croak stuns every goblin in the room.", g:{ doom:1 }, locked:3 },
  twin:     { name:"Twin Frog",      desc:"Gribbus' twin brother Grobbus joins the party.",  g:{ twin:1 }, locked:4 },
  zoomies:  { name:"Frog Zoomies",   desc:"Gribbus attacks 50% faster.",                    g:{ rate:0.5 } },
  sticky:   { name:"Sticky Tongue",  desc:"Gribbus' tongue drags goblins in and slows them.", g:{ sticky:1 } }
};

/* ---- floor curses: more likely the deeper you go ---- */
DG.CURSES = {
  dark:  { name:"Curse of Darkness", desc:"The torches burn low." },
  lost:  { name:"Curse of the Lost", desc:"Your map is blank." },
  fog:   { name:"Curse of the Fog",  desc:"You can't see far." },
  haste: { name:"Curse of Haste",    desc:"Everything down here moves faster." }
};

/* ================================================================== *
 *  Building a stat block from everything Zippy owns.
 * ================================================================== */
const Items = DG.Items = {};

Items.blank = function(){
  return {
    dmg:0, dmgMul:1, rate:0, speed:0, shotSpeed:0, range:0, size:0, hp:0, mana:0, regen:0, luck:0, crit:0, critMul:0,
    magnet:0, gold:0, blinkCd:0, noSlip:0, reload:0, mag:0, spellCost:0, statusDur:0, boom:0, byproductDur:0, wispDmg:0,
    frogRate:0, frogDmg:0, killMana:0,
    shot:{ bounces:0, pierce:0, homing:0, split:0, extra:0, side:0, back:0, wiggle:0, orbit:0, boomerang:0, spectral:0, grow:0,
           accel:0, spiral:0, chaos:0, burst:0, echo:0, kaleido:0, bounceDmg:0, pierceDmg:0, bounceSplit:0, lifeAdd:0 },
    els:[], on:{}, special:{}, duos:[]
  };
}

function addDef(M, d, n){
  n = n || 1;
  if(d.stats) for(const k in d.stats){
    if(k === "dmgMul") M.dmgMul *= Math.pow(d.stats[k], n);
    else M[k] = (M[k] || 0) + d.stats[k]*n;
  }
  if(d.shot) for(const k in d.shot) M.shot[k] = (M.shot[k] || 0) + d.shot[k]*n;
  if(d.els) d.els.forEach(e=>{ if(M.els.indexOf(e) < 0) M.els.push(e); });
  if(d.on) for(const k in d.on){ for(let i=0;i<n;i++) d.on[k].forEach(p=> (M.on[k] = M.on[k] || []).push(Object.assign({ src:d.name }, p))); }
  if(d.special) M.special[d.special] = (M.special[d.special] || 0) + n;
}

/* items: { id: count }, boons: [ids], extra: item ids active right now (the held gun's innate ones) */
Items.build = function(items, boons, extra){
  const M = Items.blank();
  for(const id in items) if(DG.ITEMS[id]) addDef(M, DG.ITEMS[id], items[id]);
  (boons || []).forEach(id=> DG.BOONS[id] && addDef(M, DG.BOONS[id], 1));
  (extra || []).forEach(id=> DG.ITEMS[id] && addDef(M, DG.ITEMS[id], 1));
  const has = id=> items[id] || (extra || []).indexOf(id) >= 0;
  DG.DUOS.forEach(d=>{ if(has(d.a) && has(d.b)){ M.duos.push(d.name); addDef(M, d, 1); } });
  if(M.special.prismheart) DG.ELEMENT_ORDER.forEach(e=>{ if(M.els.indexOf(e) < 0) M.els.push(e); });
  M.maxDepth = 1 + (M.special.recursion ? 2 : 0);
  return M;
};

/* ---- pools: an item leaves its pools once it's been offered ---- */
Items.pools = function(){
  const P = { t:[], s:[], b:[], x:[], a:[] };
  for(const id in DG.ITEMS) DG.ITEMS[id].pools.split("").forEach(p=> P[p] && P[p].push(id));
  return P;
};
Items.roll = function(G, pool){
  const P = G.pools[pool] || G.pools.t, rng = G.rng, luck = G.mods ? G.mods.luck : 0;
  const w = DG.POOL_TIERS[pool] || DG.POOL_TIERS.t;
  // deeper floors and luck push the odds up
  const push = 1 + 0.12*(G.floor - 1) + 0.08*luck;
  const tierW = w.map((x, i)=> x*Math.pow(push, i));
  for(let tries=0; tries<6; tries++){
    const tier = rng.weighted(tierW.map((x, i)=> ({ i, w:x }))).i;
    const cand = P.filter(id=> DG.ITEMS[id].tier === tier && !G.seenItems[id]);
    if(cand.length){ const id = rng.pick(cand); Items.offer(G, id); return id; }
  }
  // the pool's run dry at those tiers: anything left, anywhere
  const any = Object.keys(DG.ITEMS).filter(id=> !G.seenItems[id] && DG.ITEMS[id].tier < 4);
  if(any.length){ const id = rng.pick(any); Items.offer(G, id); return id; }
  return "spinach";
};
Items.offer = function(G, id){ G.seenItems[id] = true; };

Items.rollBoons = function(G, n){
  const owned = G.player.boons, ids = Object.keys(DG.BOONS);
  const pick = [];
  const bag = G.rng.shuffle(ids.slice()).filter(id=> !(DG.BOONS[id].rare && G.rng.chance(0.6)));
  for(const id of bag){ if(pick.length >= n) break; if(owned.filter(x=> x === id).length < 3) pick.push(id); }
  return pick;
};

})(typeof window !== "undefined" ? window : globalThis);
