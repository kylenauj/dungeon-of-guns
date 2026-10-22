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
 *            mana ward gold blackhole status shrink stickybomb gum bee
 *            ghoul hiccup shove candy dice
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
  t:[34, 40, 20, 5,   1],
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
  echo:       I({ name:"Echo Chamber",       tier:2, pools:"tb",   desc:"Every volley fires again a moment later at 45% damage.", shot:{ echo:1 } }),
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
  thermal:    I({ name:"Thermal Shock",      tier:2, pools:"tbx",  desc:"Elemental reactions deal 60% more damage.", special:"thermal" }),
  overgrowth: I({ name:"Overgrowth",         tier:1, pools:"tb",   desc:"Icicles, flames, puddles, sparks and runes last twice as long and grow bigger.", special:"overgrowth" }),
  wisplord:   I({ name:"Wisp Whisperer",     tier:1, pools:"tb",   desc:"Wisps last twice as long and hit twice as hard.", special:"wisplord" }),
  megabombs:  I({ name:"Mega Bombs",         tier:2, pools:"tbx",  desc:"Every explosion is 60% bigger and hits harder.", special:"megabombs" }),

  /* ---------------- the odd ones: weird, funny, sometimes a trade ---------------- */
  chicken:    I({ name:"Rubber Chicken",     tier:1, pools:"ts",   desc:"12% of hits leave a goblin confused for 3 seconds: it stumbles about and clobbers its friends.", flavor:"Squeak.", on:{ hit:[{ do:"status", st:"confused", t:3, chance:0.12 }] } }),
  shrinkray:  I({ name:"Shrink Ray",         tier:1, pools:"tb",   desc:"Every hit shrinks a goblin a little, down to half size. Small goblins hit softer and fly further.", flavor:"Honey, I shrunk the goblins.", on:{ hit:[{ do:"shrink" }] } }),
  stickybomb: I({ name:"Sticky Bombs",       tier:2, pools:"tbx",  desc:"A quarter of your hits stick a bomb on the goblin. It goes off a second later.", flavor:"Tick. Tick. Oh no.", on:{ hit:[{ do:"stickybomb", chance:0.25, dmg:1.3, r:1.5 }] } }),
  bubblegum:  I({ name:"Bubble Gum",         tier:1, pools:"ts",   desc:"Shots fly a bit slower and leave sticky gum where they land. Goblins in gum crawl.", flavor:"Already chewed.", stats:{ shotSpeed:-0.2 }, on:{ wall:[{ do:"gum" }], expire:[{ do:"gum" }] } }),
  portal:     I({ name:"Portal Pockets",     tier:2, pools:"tbx",  desc:"Shots that hit a wall come out of the opposite wall, 30% stronger.", flavor:"Now you're thinking with pockets.", shot:{ portal:1 } }),
  disco:      I({ name:"Disco Fever",        tier:2, pools:"tbx",  desc:"Every 5th volley carries every element, and its shots are 50% bigger.", flavor:"Night fever.", special:"disco" }),
  beehive:    I({ name:"Bee Hive",           tier:1, pools:"ts",   desc:"Most kills let out an angry bee that stings goblins with poison.", flavor:"Not the bees.", on:{ kill:[{ do:"bee", n:1, chance:0.6 }] } }),
  napkin:     I({ name:"Necromancer's Napkin",tier:2, pools:"bx",  desc:"15% of kills rise as a ghost of themselves that fights for you for 10 seconds.", flavor:"Wipe your mouth. Raise the dead.", on:{ kill:[{ do:"ghoul", chance:0.15 }] } }),
  thundersocks:I({ name:"Thunder Socks",     tier:1, pools:"ts",   desc:"Running builds up static. After 2 seconds on the move, your next shot throws chain lightning.", flavor:"Shuffle, shuffle, ZAP.", special:"static" }),
  penny:      I({ name:"Lucky Penny",        tier:0, pools:"tsx",  desc:"1 in 20 shots is a lucky coin: triple damage, and a goblin it kills drops a pile of gold.", flavor:"Heads you win.", special:"penny" }),
  hiccups:    I({ name:"Hiccups",            tier:0, pools:"ts",   desc:"Every 3 seconds in a fight you hiccup out a big bubble in a random direction. It hits hard.", flavor:"Hic.", on:{ tick:[{ do:"hiccup", every:3 }] } }),
  spaghetti:  I({ name:"Spaghetti Code",     tier:1, pools:"tx",   desc:"Shots wiggle wildly and fly at random speeds. +35% damage. Nobody knows how it works.", flavor:"It works on my machine.", shot:{ wiggle:1, jitter:1 }, stats:{ dmg:0.35 } }),
  snailmail:  I({ name:"Snail Mail",         tier:1, pools:"ts",   desc:"Shots crawl along at half speed, but they're huge and hit 45% harder.", flavor:"Return to sender.", stats:{ shotSpeed:-0.5, size:0.7, dmg:0.45 } }),
  accordion:  I({ name:"Cursed Accordion",   tier:1, pools:"tb",   desc:"Reloading plays a horrible chord that shoves every goblin near you away and dazes them.", flavor:"It only knows one song.", on:{ reload:[{ do:"shove", r:4.5, stun:0.8 }] } }),
  dice:       I({ name:"Loaded Dice",        tier:1, pools:"ts",   desc:"Every time a room locks, roll for your damage: anything from 0.6x to 1.8x.", flavor:"Loaded with what, exactly?", special:"dice", on:{ lock:[{ do:"dice" }] } }),
  comet:      I({ name:"Comet Cape",         tier:2, pools:"tbx",  desc:"Blinking turns you into a comet: goblins you blink through take a heavy hit and go flying.", flavor:"Mind the tail.", special:"comet" }),
  /* the Gribbus build: things that make the frog the killer */
  bogpact:    I({ name:"Bog Pact",           tier:3, pools:"tbx",  desc:"Gribbus hits 75% harder. Your own shots hit 30% softer.", flavor:"Signed in pond-water. He kept the pen.", stats:{ frogMul:1.75 }, special:"bogpact", tags:["frog"] }),
  familiar:   I({ name:"Familiar's Due",     tier:2, pools:"tsb",  desc:"Goblins you hit are marked for Gribbus: his next hit on one does double.", flavor:"You soften them up. He collects.", special:"familiar", tags:["frog"] }),
  swallow:    I({ name:"Swallow",            tier:3, pools:"tbx",  desc:"Gribbus swallows goblins under 15% health whole (not bosses).", flavor:"No chewing. Never any chewing.", special:"swallow", tags:["frog"] }),
  hungrytongue:I({ name:"Hungry Tongue",     tier:1, pools:"ts",   desc:"Every goblin Gribbus kills heals you 1.", flavor:"He shares. Sort of.", special:"hungry", tags:["frog"] }),
  croakhex:   I({ name:"Croaking Hex",       tier:2, pools:"tb",   desc:"Casting a spell makes Gribbus croak: a blast of frost round him that drags goblins in.", flavor:"Your voice, his throat.", special:"croakhex", tags:["frog"] }),
  twister:    I({ name:"Tongue Twister",     tier:1, pools:"ts",   desc:"Gribbus flings the goblins he licks into other goblins.", flavor:"Gribbus has been practising.", special:"twister" }),
  clockwork:  I({ name:"Clockwork Heart",    tier:1, pools:"tb",   desc:"Every 12th kill winds up a ward (up to 4).", flavor:"Tick, tock, block.", special:"clockwork" }),
  haunted:    I({ name:"Haunted Gun",        tier:2, pools:"bx",   desc:"When you stop shooting, a ghost keeps pulling your trigger at goblins nearby (half damage, no ammo).", flavor:"It isn't you doing it.", special:"haunted" }),
  pinata:     I({ name:"Piñata Stick",       tier:1, pools:"ts",   desc:"+5% crit. Crits knock candy out of goblins; candy heals 2.", flavor:"Whack it till it rains.", stats:{ crit:0.05 }, on:{ crit:[{ do:"candy", chance:0.35 }] } }),

  /* ---------------- the grim ones: blood, souls and bad bargains ---------------- */
  membercard: I({ name:"Snibbit's Membership Card", tier:1, pools:"tsx", desc:"Every shop stocks 2 more wares and charges you 20% less.", flavor:"Valued customer since... recently.", special:"member" }),
  bloodvial:  I({ name:"Blood Vial",         tier:0, pools:"ts",   desc:"+15 max health. 1 kill in 12 heals 4.", flavor:"Still warm.", stats:{ hp:15 }, on:{ kill:[{ do:"heal", n:4, chance:0.08 }] } }),
  ashenring:  I({ name:"Ashen Ring",         tier:0, pools:"tsb",  desc:"+12% damage, +8% fire rate.", flavor:"The finger is long gone.", stats:{ dmg:0.12, rate:0.08 } }),
  graveboots: I({ name:"Gravedigger's Boots",tier:0, pools:"ts",   desc:"+12% move speed. Blink recharges 15% faster.", flavor:"Caked in someone's soil.", stats:{ speed:0.12, blinkCd:0.15 } }),
  candlestub: I({ name:"Candle Stub",        tier:0, pools:"ts",   desc:"+20% range. 1 hit in 10 spits a little burst of flame.", flavor:"It never quite goes out.", stats:{ range:0.2 }, on:{ hit:[{ do:"nova", r:1.2, dmg:0.35, el:"fire", chance:0.1 }] } }),
  hexcoin:    I({ name:"Hexed Coin",         tier:0, pools:"tsx",  desc:"+3 luck. -15 max health.", flavor:"Both sides are tails.", stats:{ luck:3, hp:-15 } }),
  rottenheart:I({ name:"Rotten Heart",       tier:0, pools:"tsb",  desc:"+35 max health, and heals it. -10% move speed.", flavor:"It beats. Mostly.", stats:{ hp:35, speed:-0.1 } }),
  leadrounds: I({ name:"Lead Rounds",        tier:0, pools:"ts",   desc:"+30% damage. -15% shot speed, -5% move speed.", flavor:"Heavy as a grudge.", stats:{ dmg:0.3, shotSpeed:-0.15, speed:-0.05 } }),
  crowfeather:I({ name:"Crow Feathers",      tier:1, pools:"ts",   desc:"+2 shots per volley, and shots curve toward goblins. -30% damage.", flavor:"The crows followed you down.", shot:{ extra:2, homing:0.4 }, stats:{ dmg:-0.3 } }),
  greatbow:   I({ name:"Greatbow String",    tier:1, pools:"tsb",  desc:"+80% shot speed, +60% range, +25% damage. -20% fire rate.", flavor:"Pulled by giants, once.", stats:{ shotSpeed:0.8, range:0.6, dmg:0.25, rate:-0.2 } }),
  witchfire:  I({ name:"Witchfire",          tier:1, pools:"tb",   desc:"Every shot carries fire and arcane. -10% damage.", flavor:"It burns green when no one is looking.", els:["fire", "arcane"], stats:{ dmg:-0.1 } }),
  bloodpact:  I({ name:"Blood Pact",         tier:1, pools:"tbx",  desc:"+40% damage. -20 max health. Half your kills heal 1.", flavor:"Sign here. And here. And here.", stats:{ dmg:0.4, hp:-20 }, on:{ kill:[{ do:"heal", n:1, chance:0.5 }] } }),
  sacknife:   I({ name:"Sacrificial Knife",  tier:1, pools:"tb",   desc:"Goblins burst into 8 shards of bone when they die. -10 max health.", flavor:"For the altar. Any altar.", stats:{ hp:-10 }, on:{ kill:[{ do:"shards", n:8, dmg:0.45 }] } }),
  riposte:    I({ name:"Parrying Dagger",    tier:1, pools:"ts",   desc:"For a second after you blink, your shots hit 60% harder.", flavor:"Step in. Strike true.", special:"riposte" }),
  briar:      I({ name:"Black Briar Armour", tier:1, pools:"tsb",  desc:"+2 wards now. While you have a ward, +20% damage.", flavor:"Thorns grow inward too.", stats:{ wards:2 }, special:"briar" }),
  huntersmark:I({ name:"Hunter's Mark",      tier:1, pools:"tsb",  desc:"The first hit on each goblin deals triple damage.", flavor:"Pick your mark. Then pick another.", special:"firsthit" }),
  silver:     I({ name:"Silver Bullets",     tier:1, pools:"tsb",  desc:"+60% damage to the dead and the haunted: ghosts, banshees, skeletons, poltergeists and the Bride.", flavor:"Blessed by a priest who's since gone missing.", special:"silver" }),
  witchhair:  I({ name:"Witch's Locks",      tier:1, pools:"ts",   desc:"1 hit in 5 curses a goblin: arcane-marked for 4 seconds.", flavor:"Braided while she screamed.", on:{ hit:[{ do:"status", st:"marked", t:4, chance:0.2 }] } }),
  belldread:  I({ name:"Bell of Dread",      tier:1, pools:"tb",   desc:"When a room locks, a toll stuns every goblin in it for 1.5 seconds.", flavor:"For whom does it toll? Them.", on:{ lock:[{ do:"toll", t:1.5 }] } }),
  bonfire:    I({ name:"Bonfire Ember",      tier:1, pools:"ts",   desc:"Clearing a room heals 10 and fills your mana.", flavor:"Rest here a while.", on:{ clear:[{ do:"heal", n:10 }, { do:"mana", n:999 }] } }),
  carrion:    I({ name:"Carrion Flies",      tier:1, pools:"ts",   desc:"1 hit in 12 lets loose a carrion fly that stings goblins with poison.", flavor:"They know what's coming.", on:{ hit:[{ do:"bee", n:1, chance:0.08 }] } }),
  wraithstep: I({ name:"Wraithstep",         tier:1, pools:"ts",   desc:"Blink recharges 30% faster, and blinking throws 4 shards around you.", flavor:"You were never quite there.", stats:{ blinkCd:0.3 }, on:{ blink:[{ do:"shards", n:4, dmg:0.6, at:"player" }] } }),
  blackpowder:I({ name:"Black Powder",       tier:1, pools:"ts",   desc:"Explosions are 35% bigger, and 3 in 10 shots that hit a wall go off.", flavor:"Keep away from candles. Ha.", stats:{ boom:0.35 }, on:{ wall:[{ do:"burst", r:1.2, dmg:0.6, chance:0.3 }] } }),
  boneshield: I({ name:"Bone Shield",        tier:1, pools:"tb",   desc:"Every 15 seconds in a fight, gain a ward (up to 2).", flavor:"Somebody's ribs, lashed together.", on:{ tick:[{ do:"ward", n:1, max:2, every:15, at:"player" }] } }),
  vengeance:  I({ name:"Vengeful Spirit",    tier:1, pools:"tb",   desc:"After you're hurt, +50% damage for 4 seconds.", flavor:"It remembers every wound.", special:"vengeance" }),
  giantsfang: I({ name:"Giant's Fang",       tier:2, pools:"tbx",  desc:"Shots are twice the size, pierce a goblin and hit 40% harder. -30% fire rate.", flavor:"Pried from something that still wanted it.", stats:{ size:1, dmg:0.4, rate:-0.3 }, shot:{ pierce:1 } }),
  moonlight:  I({ name:"Moonlight Shard",    tier:2, pools:"tbx",  desc:"Every shot carries arcane, pierces a goblin and bounces once.", flavor:"Cold light from a dead moon.", els:["arcane"], shot:{ pierce:1, bounces:1 } }),
  hollowing:  I({ name:"Hollowing",          tier:2, pools:"tbx",  desc:"Every kill in a room makes you 5% stronger, up to +60%. It fades when the room is clear.", flavor:"The more you take, the less of you is left.", special:"hollowing" }),
  executioner:I({ name:"Executioner's Axe",  tier:2, pools:"tbx",  desc:"Goblins below 15% health die at once (not bosses).", flavor:"No last words.", special:"execute" }),
  lifedrinker:I({ name:"Lifedrinker",        tier:2, pools:"bxa",  desc:"Your hits drink blood: 2% of the damage you deal heals you (up to 4 a second).", flavor:"Thirsty work.", special:"lifesteal" }),
  darksign:   I({ name:"Darksign",           tier:2, pools:"bxa",  desc:"Once a floor, when you would die, you rise again with 40% health in a burst of dark.", flavor:"Death is a door that keeps swinging back.", special:"darksign" }),
  sunlight:   I({ name:"Sunlight Medal",     tier:2, pools:"tbx",  desc:"Every 5 seconds in a fight, a spear of light strikes a goblin for heavy damage.", flavor:"Praise it.", on:{ tick:[{ do:"chain", jumps:0, dmg:3.2, every:5, target:"random" }] } }),
  soulmass:   I({ name:"Soul Mass",          tier:2, pools:"tbx",  desc:"Every 4 seconds in a fight, two soul wisps peel off you and hunt.", flavor:"Whose souls? Best not to ask.", on:{ tick:[{ do:"wisp", n:2, el:"arcane", every:4, at:"player" }] } }),
  abyssring:  I({ name:"Ring of the Abyss",  tier:2, pools:"bxa",  desc:"1 kill in 6 tears open a small black hole.", flavor:"Don't look into it. It's looking already.", on:{ kill:[{ do:"blackhole", chance:0.16 }] } }),
  lastrites:  I({ name:"Last Rites",         tier:2, pools:"bx",   desc:"Bosses take 25% more damage from everything.", flavor:"Read aloud over the not-yet-dead.", special:"bossbane" }),
  bloodmoon:  I({ name:"Blood Moon",         tier:3, pools:"bxa",  desc:"+15% crit, crits hit 50% harder, and a third of crits heal 1.", flavor:"The hunt is on tonight.", stats:{ crit:0.15, critMul:0.5 }, on:{ crit:[{ do:"heal", n:1, chance:0.33 }] } }),

  /* ---------------- the stackers (Risk of Rain's): find them again and again,
     every copy adds more. stack:true items can come back after they've been offered ---------------- */
  // coin
  brittlecrown:I({ name:"Brittle Crown",     tier:1, pools:"tsx",  stack:true, desc:"1 hit in 16 knocks a coin loose (more per copy). Getting hurt spills 5% of your gold.", flavor:"Heavy is the head. Heavier the purse.", on:{ hit:[{ do:"gold", n:1, chance:0.06 }] }, special:"brittlecrown" }),
  tithe:      I({ name:"Golden Tithe",       tier:1, pools:"tsx",  stack:true, desc:"+1% damage for every 15 gold you carry (per copy), up to +100%.", flavor:"Faith is expensive.", special:"mortgage" }),
  pennyroll:  I({ name:"Roll of Pennies",    tier:0, pools:"ts",   stack:true, desc:"Getting hurt spills 6 coins out of you (per copy).", flavor:"Cushioned the blow. Mostly.", on:{ hurt:[{ do:"gold", n:6, at:"player" }] } }),
  interest:   I({ name:"Usurer's Ledger",    tier:1, pools:"tsx",  stack:true, desc:"Clearing a room pays you 8% of the gold you carry (per copy, at most 30 a room).", flavor:"The dead pay interest too.", special:"interest" }),
  // attack speed
  syringe:    I({ name:"Rusty Syringe",      tier:0, pools:"tsb",  stack:true, desc:"+12% fire rate (per copy).", flavor:"Don't ask what was in it before.", stats:{ rate:0.12 } }),
  frenzy:     I({ name:"Berserker's Tooth",  tier:1, pools:"tsb",  stack:true, desc:"Each kill gives +5% fire rate for 3 seconds, stacking up to 6 times (6 more per copy).", flavor:"It's still biting.", special:"frenzy" }),
  itch:       I({ name:"Predator's Itch",    tier:1, pools:"ts",   stack:true, desc:"Crits give +4% fire rate for 2 seconds, stacking up to 8 times (8 more per copy). +5% crit.", flavor:"Can't stop. Won't stop.", stats:{ crit:0.05 }, special:"itch" }),
  // multishot
  sparebarrel:I({ name:"Spare Barrel",       tier:1, pools:"tsb",  stack:true, desc:"+1 shot per volley (per copy). -12% damage (per copy).", flavor:"Bolted on with optimism.", shot:{ extra:1 }, stats:{ dmg:-0.12 } }),
  doubletap:  I({ name:"Echoing Skull",      tier:1, pools:"tb",   stack:true, desc:"15% chance a volley fires twice (more per copy).", flavor:"It repeats everything you say. And shoot.", special:"doubletap" }),
  crowsnest:  I({ name:"Crow's Nest",        tier:1, pools:"ts",   stack:true, desc:"Every 5th volley throws a fan of 3 extra shots (3 more per copy).", flavor:"The crows help. Sort of.", special:"fan" }),
  // chain procs
  ukulele:    I({ name:"Cursed Ukulele",     tier:1, pools:"tsb",  stack:true, desc:"1 hit in 5 throws lightning to 3 goblins (more often per copy).", flavor:"One string. All of them out of tune.", on:{ hit:[{ do:"chain", jumps:3, dmg:0.6, chance:0.2, el:"shock" }] } }),
  mortar:     I({ name:"Grave Mortar",       tier:2, pools:"tbx",  stack:true, desc:"1 hit in 10 launches a homing bone missile for triple damage (more often per copy).", flavor:"It fires the dead. Respectfully.", on:{ hit:[{ do:"missile", dmg:3, chance:0.1 }] } }),
  fractal:    I({ name:"Fractal Fuse",       tier:2, pools:"bx",   stack:true, desc:"What your items make can set off your items once more (one level deeper per copy, three at most).", flavor:"Each spark lights two more.", special:"fractal" }),
  gasbag:     I({ name:"Bog Gas Bladder",    tier:0, pools:"ts",   stack:true, desc:"Kills burst into a small cloud of fire (bigger per copy).", flavor:"Do not puncture. Too late.", on:{ kill:[{ do:"nova", r:1.4, dmg:0.5, el:"fire" }] } }),
  // the reliquaries: each counts as two sources of its element towards attunement
  emberrelic: I({ name:"Ember Reliquary",    tier:1, pools:"tsb",  stack:true, desc:"Counts as 2 sources of fire for attunement. +10% damage while your shots carry fire.", flavor:"A finger bone that won't stop smouldering.", attune:{ fire:2 }, special:"relic_fire" }),
  frostrelic: I({ name:"Hoarfrost Reliquary",tier:1, pools:"tsb",  stack:true, desc:"Counts as 2 sources of frost for attunement. +10% damage while your shots carry frost.", flavor:"Cold enough to keep a saint fresh.", attune:{ frost:2 }, special:"relic_frost" }),
  blightrelic:I({ name:"Blight Reliquary",   tier:1, pools:"tsb",  stack:true, desc:"Counts as 2 sources of poison for attunement. +10% damage while your shots carry poison.", flavor:"The jar is sweating.", attune:{ poison:2 }, special:"relic_poison" }),
  stormrelic: I({ name:"Storm Reliquary",    tier:1, pools:"tsb",  stack:true, desc:"Counts as 2 sources of shock for attunement. +10% damage while your shots carry shock.", flavor:"Your hair stands up near it. So does Gribbus'.", attune:{ shock:2 }, special:"relic_shock" }),
  hexrelic:   I({ name:"Hex Reliquary",      tier:1, pools:"tsb",  stack:true, desc:"Counts as 2 sources of arcane for attunement. +10% damage while your shots carry arcane.", flavor:"It hums a hymn nobody taught it.", attune:{ arcane:2 }, special:"relic_arcane" }),

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
  firekeeper: I({ name:"Fire Keeper's Soul",tier:4, pools:"xab",  desc:"Every 10 seconds in a fight a bonfire flares under you: it heals 15, fills your mana, and a great ring of fire bursts out.", flavor:"She tended the flame. Now you carry it.", on:{ tick:[{ do:"heal", n:15, every:10 }, { do:"mana", n:999, every:10 }, { do:"nova", r:4.5, dmg:3, el:"fire", every:10, at:"player" }] } }),
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
  { a:"chunky",      b:"snowball",    name:"Avalanche",      desc:"Growing shots get 2x bigger, and crush through goblins.", shot:{ pierce:2 } },
  { a:"chicken",     b:"accordion",   name:"Barnyard Band",  desc:"Every shove leaves goblins confused too.", special:"barnyard" },
  { a:"beehive",     b:"venomrounds", name:"Killer Bees",    desc:"Bees hit twice as hard and last twice as long.", special:"killerbees" },
  { a:"portal",      b:"pinball",     name:"Wormhole Wizard",desc:"Shots go through portals every time, and gain a bounce for each trip.", special:"wormhole" },
  { a:"bloodpact",   b:"lifedrinker", name:"Crimson Covenant",desc:"+20 max health, and Lifedrinker drinks twice as fast.", stats:{ hp:20 }, special:"lifesteal" },
  { a:"hollowing",   b:"executioner", name:"The Reaper",     desc:"Executions come below 22% health, and each one counts double for Hollowing.", special:"reaper" },
  { a:"darksign",    b:"bonfire",     name:"Kindled",        desc:"Clearing a room re-lights the Darksign.", special:"kindled" },
  { a:"silver",      b:"sunlight",    name:"Praise the Sun", desc:"Spears of light strike twice as often.", on:{ tick:[{ do:"chain", jumps:0, dmg:3.2, every:5, target:"random" }] } },
  { a:"greatbow",    b:"crowfeather", name:"Hawkeye",        desc:"+1 pierce and +20% crit.", shot:{ pierce:1 }, stats:{ crit:0.2 } },
  { a:"carrion",     b:"venomrounds", name:"Plague of Flies",desc:"Flies and bees hit twice as hard and last twice as long.", special:"killerbees" },
  { a:"comet",       b:"trailblazer", name:"Shooting Star",  desc:"Comet blinks leave your element all along the trail.", special:"shootingstar" }
];

/* transformations (Isaac's): own 3 items of a set and Zippy becomes something
   else, with a new look and a modest bonus. `look` overrides his costume. */
DG.SETS = [
  { id:"pyromancer", name:"Pyromancer",    need:3, items:["emberrounds", "inferno", "wildfire", "hotpotato", "fireworks", "trailblazer", "hotswap"],
    desc:"Fire on every shot, +15% damage, and burning goblins explode into flames.", els:["fire"], stats:{ dmg:0.15 }, special:"wildfire",
    look:{ robe:"fire", cape:"fire", parts:["horns", "flamehat"], aura:"embers" } },
  { id:"lich",       name:"Ice Lich",      need:3, items:["frostrounds", "blizzard", "brittle", "popsicle", "coldshoulder", "snowball"],
    desc:"Frost on every shot, chilled goblins take more damage, and a frost nova goes off around you every 6 seconds.", els:["frost"], special:"brittle",
    on:{ tick:[{ do:"nova", r:3, dmg:0.8, el:"frost", every:6, at:"player" }] },
    look:{ robe:"frost", cape:"frost", parts:["lichmask", "icecrown"], aura:"snow" } },
  { id:"storm",      name:"Storm Lord",    need:3, items:["staticrounds", "stormcaller", "conductor", "staticcling", "discharge", "thundersocks"],
    desc:"Shock on every shot, and lightning strikes a goblin every 3 seconds in a fight.", els:["shock"],
    on:{ tick:[{ do:"chain", jumps:2, dmg:0.9, every:3, target:"random" }] },
    look:{ robe:"shock", cape:"shock", parts:["statichair", "stormcloud"], aura:"sparks" } },
  { id:"plague",     name:"Plague Doctor", need:3, items:["venomrounds", "plague", "rotbloom", "leaky", "swampfeet"],
    desc:"Poison on every shot, poison spreads from goblin to goblin, and +15 max health.", els:["poison"], special:"plague", stats:{ hp:15 },
    look:{ robe:"poison", cape:"shadow", parts:["plaguemask", "tophat"], aura:"toxic" } },
  { id:"gardener",   name:"Gardener",      need:3, items:["overgrowth", "blossom", "rotbloom", "beehive", "clover", "luckyfoot", "spinach", "swampfeet"],
    desc:"Byproducts last longer, +1 luck, and kills sometimes sprout a healing flower.", stats:{ byproductDur:0.5, luck:1 },
    on:{ kill:[{ do:"candy", chance:0.12 }] },
    look:{ robe:"leaf", cape:"leaf", parts:["vines", "flowers", "flowerhat"], aura:"petals" } },
  { id:"goldfinger", name:"Goldfinger",    need:3, items:["midaspocket", "midas", "magnet", "penny", "luckyfoot"],
    desc:"+50% gold, a bigger coin magnet, and every kill has a chance to drop a coin.", stats:{ gold:0.5, magnet:2 },
    on:{ kill:[{ do:"gold", n:1, chance:0.3 }] },
    look:{ robe:"gold", cape:"gold", parts:["crown", "coinpouch"], aura:"glints" } },
  { id:"frogprince", name:"Frog Prince",   need:3, items:["frogsona", "tadpact", "froglock", "twister", "swampfeet", "lantern"],
    desc:"Gribbus hits 50% harder and 30% faster, and tadpoles are twice as many.", stats:{ frogDmg:0.5, frogRate:0.3 }, special:"frogswarm",
    look:{ robe:"leaf", cape:"arcane", parts:["froghood", "lilycape"], aura:"bubbles" } },
  { id:"bloodhunter",name:"Blood Hunter",  need:3, items:["bloodpact", "lifedrinker", "bloodvial", "bloodmoon", "sacknife", "hollowing", "vengeance", "leech"],
    desc:"+20% damage, 1 kill in 5 heals 1, and getting hurt sprays 10 shards of blood.", stats:{ dmg:0.2 },
    on:{ kill:[{ do:"heal", n:1, chance:0.2 }], hurt:[{ do:"shards", n:10, dmg:0.7, at:"player" }] },
    look:{ robe:"shadow", cape:"fire", parts:["fangs", "spikepauldrons", "bandage"], aura:"embers" } },
  { id:"clown",      name:"Goofball",      need:3, items:["chicken", "hiccups", "spaghetti", "bubblegum", "dice", "accordion", "wiggle", "chaos"],
    desc:"+2 luck, and 6% of hits leave a goblin confused.", stats:{ luck:2 },
    on:{ hit:[{ do:"status", st:"confused", t:2.5, chance:0.06 }] },
    look:{ robe:"clown", cape:"clown", parts:["clownnose", "ruff"], aura:"rainbow" } }
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
  soup:    { name:"Bottomless Soup",charge:4, desc:"Heals 40." },
  hat:     { name:"Hat Trick",      charge:2, desc:"Your hat flies out and spirals round the room, slicing goblins, for 4 seconds." },
  whistle: { name:"Goblin Whistle", charge:2, desc:"Every goblin in the room is confused for 5 seconds and clobbers its friends." },
  cannon:  { name:"Frog Cannon",    charge:2, desc:"Fire Gribbus at the cursor. He lands with a croak that stuns and blasts everything there, as hard as he hits." },
  discoball:{ name:"Disco Ball",    charge:3, desc:"For 8 seconds, every shot carries every element." },
  pockethole:{ name:"Pocket Black Hole", charge:3, desc:"Throw a black hole that swallows goblins for 4 seconds." },
  estus:   { name:"Estus Flask",    charge:2, desc:"Heals 30 and gives a ward." },
  dreadbell:{ name:"Toll of the Damned", charge:3, desc:"Stuns every goblin in the room for 2 seconds, and your shots hit 30% harder for 6." },
  soulspear:{ name:"Soul Spear",    charge:2, desc:"Hurl a spear of soul-light that pierces everything in a line." }
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
  b_home:   { name:"Guided",           desc:"Shots curve slightly toward goblins.", rare:true, shot:{ homing:0.5 } },
  /* the ones that change how a fight goes */
  b_thirst: { name:"Bloodthirst",      desc:"1 kill in 12 heals 2.",   on:{ kill:[{ do:"heal", n:2, chance:0.08 }] } },
  b_splint: { name:"Bone Splinters",   desc:"Kills throw 3 splinters of bone.", on:{ kill:[{ do:"shards", n:3, dmg:0.35 }] } },
  b_ember:  { name:"Ember Touch",      desc:"1 hit in 12 flares up in fire.", on:{ hit:[{ do:"nova", r:1, dmg:0.3, el:"fire", chance:0.08 }] } },
  b_chill:  { name:"Grave Chill",      desc:"1 hit in 10 chills a goblin.", on:{ hit:[{ do:"status", st:"chill", t:1.5, chance:0.1 }] } },
  b_hex:    { name:"Hex Mark",         desc:"1 hit in 10 marks a goblin with arcane for 3 seconds.", on:{ hit:[{ do:"status", st:"marked", t:3, chance:0.1 }] } },
  b_redcrit:{ name:"Crimson Crits",    desc:"Crits throw 2 shards.",   on:{ crit:[{ do:"shards", n:2, dmg:0.4 }] } },
  b_bastion:{ name:"Bastion",          desc:"1 cleared room in 3 gives a ward.", on:{ clear:[{ do:"ward", n:1, max:3, chance:0.33 }] } },
  b_respite:{ name:"Respite",          desc:"Clearing a room heals 5.", on:{ clear:[{ do:"heal", n:5 }] } },
  b_haunt:  { name:"Haunting",         desc:"When a room locks, a wisp of your element joins you.", on:{ lock:[{ do:"wisp", n:1, at:"player" }] } },
  b_pulse:  { name:"Dark Pulse",       desc:"Every 6 seconds in a fight, a small nova of your element bursts around you.", on:{ tick:[{ do:"nova", r:2.2, dmg:0.6, every:6, at:"player" }] } },
  b_shatter:{ name:"Shatterstep",      desc:"Blinking throws 3 shards.", on:{ blink:[{ do:"shards", n:3, dmg:0.5, at:"player" }] } },
  b_wind:   { name:"Second Wind",      desc:"1 blink in 4 heals 2.",   on:{ blink:[{ do:"heal", n:2, chance:0.25 }] } },
  b_rburst: { name:"Reload Burst",     desc:"Reloading sets off a small nova.", on:{ reload:[{ do:"nova", r:1.8, dmg:0.5 }] } },
  b_retal:  { name:"Retaliation",      desc:"Getting hurt fires a ring of 6 shots.", on:{ hurt:[{ do:"ring", n:6, dmg:0.7 }] } },
  b_robber: { name:"Grave Robber",     desc:"1 kill in 10 drops a coin.", on:{ kill:[{ do:"gold", n:1, chance:0.1 }] } },
  b_attune: { name:"Attunement",       desc:"+30% mana regen, spells cost 10% less.", stats:{ regen:0.3, spellCost:0.1 } },
  b_edge:   { name:"Elemental Edge",   desc:"+8% damage, statuses last 20% longer.", stats:{ dmg:0.08, statusDur:0.2 } },
  b_bond:   { name:"Frog Bond",        desc:"Gribbus hits 15% harder and 15% faster.", stats:{ frogDmg:0.15, frogRate:0.15 } },
  b_spawn:  { name:"Spawning",         desc:"When a room locks, a tadpole joins you.", on:{ lock:[{ do:"tadpole", n:1, at:"player" }] } },
  b_glass:  { name:"Glass Bones",      desc:"+25% damage. -15 max health.", stats:{ dmg:0.25, hp:-15 } },
  b_stout:  { name:"Stout",            desc:"+30 max health. -5% move speed.", stats:{ hp:30, speed:-0.05 } },
  b_rage:   { name:"Last Stand",       desc:"+70% damage while below 30% health.", rare:true, special:"desperation" },
  b_still:  { name:"Stillness",        desc:"Shots hit up to 2x harder the longer you wait between them.", rare:true, special:"patience" },
  b_ambush: { name:"Ambush",           desc:"The first hit on each goblin deals triple damage.", rare:true, special:"firsthit" },
  b_hollow: { name:"Hollow",           desc:"Every kill in a room makes you 5% stronger, up to +60%, until it's clear.", rare:true, special:"hollowing" },
  b_silver: { name:"Silvered",         desc:"+60% damage to the dead and the haunted.", special:"silver" },
  b_parry:  { name:"Parry",            desc:"For a second after you blink, your shots hit 60% harder.", special:"riposte" },
  b_slayer: { name:"Slayer",           desc:"Bosses take 25% more damage.", rare:true, special:"bossbane" }
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
  gloom:    { name:"The Gloom Lily",  desc:"Black, oily, veined. Something in the water. He'd be stronger. He wouldn't be right.", g:{}, hidden:true },
  sticky:   { name:"Sticky Tongue",  desc:"Gribbus' tongue drags goblins in and slows them.", g:{ sticky:1 } }
};

/* ---- floor curses: more likely the deeper you go ---- */
DG.CURSES = {
  dark:  { name:"Curse of Darkness", desc:"The torches burn low." },
  lost:  { name:"Curse of the Lost", desc:"Your map is blank." },
  fog:   { name:"Curse of the Fog",  desc:"You can't see far." },
  haste: { name:"Curse of Haste",    desc:"Everything down here moves faster." }
};

/* ---- costumes: what Zippy wears for what he carries (Isaac-style) ----
   cape / robe: a dye (the robe only changes for the big ones, and the
   highest tier wins); parts: costume pieces that stack; aura: particles. */
DG.DYES = ["arcane", "fire", "frost", "poison", "shock", "gold", "shadow", "star", "leaf", "clown"];
DG.COSTUME_PARTS = ["vines", "flowers", "goggles", "monocle", "wingboots", "stripysocks", "mudboots", "tallhat", "spikyhat", "flamehat", "icecrown",
  "stormcloud", "plaguemask", "chicken", "hive", "accordion", "dice", "penny", "gear", "ghostpal", "discoball", "gum", "napkin", "noodles",
  "pinatastick", "teapot", "heartjar", "lunchbox", "coinpouch", "clover", "muscles", "cracks", "bombbelt", "starcape", "portalcuffs", "antenna",
  "halo", "prismgem", "froghood", "cubes", "voidtip", "mirrorshield", "orbitrings",
  /* transformations */
  "horns", "lichmask", "statichair", "tophat", "flowerhat", "crown", "lilycape", "clownnose", "ruff",
  /* more odds and ends */
  "spinachcan", "coffeecup", "magnet", "hourglass", "sandwich", "pauldrons", "spikepauldrons", "rubberball", "hateye", "sideeyes",
  "backeye", "worm", "jetpack", "wildhair", "icepauldron", "crystals", "wisplantern", "souljar", "tombstone", "bombtip", "hydra",
  "offhand", "gremlin", "boomerang", "papershield", "rocketsback", "alarmclock", "sodacan", "fangs", "angrybrows", "tadpolejar",
  "frogbrolly", "seashell", "snail", "goblet", "kaleido", "handmirror", "elementgems", "snowhat", "bandage"];
DG.AURAS = ["embers", "snow", "sparks", "toxic", "glints", "smoke", "rainbow", "stars", "petals", "bubbles"];
DG.COSTUMES = {
  /* the grim ones */
  membercard:{ parts:["coinpouch"] }, bloodpact:{ cape:"fire", parts:["fangs"] }, lifedrinker:{ parts:["fangs"], aura:"embers" }, bloodmoon:{ robe:"fire", cape:"shadow", aura:"embers" },
  darksign:{ cape:"shadow", parts:["cracks"], aura:"smoke" }, hollowing:{ cape:"shadow", parts:["lichmask"] }, briar:{ parts:["spikepauldrons"] },
  silver:{ parts:["monocle"] }, sunlight:{ parts:["halo"] }, soulmass:{ parts:["souljar"], aura:"stars" }, abyssring:{ cape:"shadow", aura:"smoke" },
  executioner:{ parts:["spikepauldrons"] }, bonfire:{ parts:["wisplantern"] }, rottenheart:{ parts:["heartjar"] }, sacknife:{ parts:["bandage"] },
  witchfire:{ cape:"fire" }, moonlight:{ cape:"arcane", parts:["starcape"] }, boneshield:{ parts:["tombstone"] }, carrion:{ parts:["hive"] },
  /* elements dye the cape; their legendary forms dye the whole robe */
  emberrounds:{ cape:"fire" }, frostrounds:{ cape:"frost" }, venomrounds:{ cape:"poison" }, staticrounds:{ cape:"shock" }, arcanerounds:{ cape:"arcane" },
  wildfire:{ cape:"fire", aura:"embers" }, brittle:{ cape:"frost" }, conductor:{ cape:"shock" },
  plague:{ cape:"poison", parts:["plaguemask"], aura:"toxic" },
  inferno:{ robe:"fire", cape:"fire", parts:["flamehat"], aura:"embers" },
  blizzard:{ robe:"frost", cape:"frost", parts:["icecrown"], aura:"snow" },
  stormcaller:{ robe:"shock", cape:"shock", parts:["stormcloud"], aura:"sparks" },
  /* growing things */
  overgrowth:{ parts:["vines"] }, rotbloom:{ parts:["vines"] }, blossom:{ parts:["vines", "flowers"] }, swampfeet:{ parts:["mudboots"] },
  /* odds and ends */
  specs:{ parts:["goggles"] }, lens:{ parts:["monocle"] }, boots:{ parts:["wingboots"] }, socks:{ parts:["stripysocks"] },
  thundersocks:{ parts:["stripysocks"], aura:"sparks" }, tallhat:{ parts:["tallhat"] }, spikyhat:{ parts:["spikyhat"] },
  chicken:{ parts:["chicken"] }, beehive:{ parts:["hive"] }, accordion:{ parts:["accordion"] }, dice:{ parts:["dice"] },
  penny:{ parts:["penny"] }, clockwork:{ parts:["gear"] }, haunted:{ parts:["ghostpal"] }, disco:{ parts:["discoball"] },
  bubblegum:{ parts:["gum"] }, napkin:{ parts:["napkin"] }, spaghetti:{ parts:["noodles"] }, pinata:{ parts:["pinatastick"] },
  teapot:{ parts:["teapot"] }, heartjar:{ parts:["heartjar"] }, lunchbox:{ parts:["lunchbox"] }, midaspocket:{ parts:["coinpouch"] },
  clover:{ parts:["clover"] }, luckyfoot:{ parts:["clover"] }, steroids:{ parts:["muscles"] }, glasscannon:{ parts:["cracks"] },
  stickybomb:{ parts:["bombbelt"] }, comet:{ cape:"star", parts:["starcape"], aura:"stars" }, portal:{ parts:["portalcuffs"] },
  shrinkray:{ parts:["antenna"] },
  spinach:{ parts:["spinachcan"] }, coffee:{ parts:["coffeecup"] }, caffeine:{ parts:["coffeecup"] }, magnet:{ parts:["magnet"] },
  hourglass:{ parts:["hourglass"] }, snack:{ parts:["sandwich"] }, chunky:{ parts:["pauldrons"] }, sharp:{ parts:["spikepauldrons"] },
  drill:{ parts:["spikepauldrons"] }, rubber:{ parts:["rubberball"] }, seeker:{ parts:["hateye"] }, sideeyes:{ parts:["sideeyes"] },
  rearguard:{ parts:["backeye"] }, wiggle:{ parts:["worm"] }, rocket:{ parts:["jetpack"] }, chaos:{ parts:["wildhair"] },
  staticcling:{ parts:["statichair"] }, coldshoulder:{ parts:["icepauldron"] }, crystal:{ parts:["crystals"] },
  wispcraft:{ parts:["wisplantern"] }, lantern:{ parts:["wisplantern"] }, wisplord:{ parts:["wisplantern"] }, siphon:{ parts:["souljar"] },
  graverise:{ parts:["tombstone"] }, megabombs:{ parts:["bombtip"] }, hydra:{ parts:["hydra"] }, dualwield:{ parts:["offhand"] },
  gremlin:{ parts:["gremlin"] }, boomerang:{ parts:["boomerang"] }, papershield:{ parts:["papershield"] }, fireworks:{ parts:["rocketsback"] },
  tictoc:{ parts:["alarmclock"] }, fizzlepop:{ parts:["sodacan"] }, leech:{ parts:["fangs"] }, spite:{ parts:["angrybrows"] },
  tadpact:{ parts:["tadpolejar"] }, froglock:{ parts:["frogbrolly"] }, echo:{ parts:["seashell"] }, patience:{ parts:["snail"] },
  overflow:{ parts:["goblet"] }, kaleido:{ parts:["kaleido"] }, mirrorblink:{ parts:["handmirror"] }, elementalist:{ parts:["elementgems"] },
  snowball:{ parts:["snowhat"] }, desperation:{ parts:["bandage"] }, trailblazer:{ aura:"embers" }, hotpotato:{ parts:["bombbelt"] },
  /* godly */
  godwand:{ parts:["halo"], aura:"glints" }, midas:{ robe:"gold", cape:"gold", aura:"glints" }, prismheart:{ parts:["prismgem"], aura:"rainbow" },
  shadow:{ robe:"shadow", cape:"shadow", aura:"smoke" }, frogsona:{ parts:["froghood"] }, recursion:{ parts:["cubes"] },
  horizon:{ parts:["voidtip"] }, reverse:{ parts:["mirrorshield"] }, infinity:{ parts:["orbitrings"] }
};

/* ================================================================== *
 *  Building a stat block from everything Zippy owns.
 * ================================================================== */
const Items = DG.Items = {};

Items.blank = function(){
  return {
    dmg:0, dmgMul:1, rate:0, speed:0, shotSpeed:0, range:0, size:0, hp:0, mana:0, regen:0, luck:0, crit:0, critMul:0,
    magnet:0, gold:0, blinkCd:0, noSlip:0, reload:0, mag:0, spellCost:0, statusDur:0, boom:0, byproductDur:0, wispDmg:0,
    frogRate:0, frogDmg:0, frogMul:1, killMana:0,
    shot:{ bounces:0, pierce:0, homing:0, split:0, extra:0, side:0, back:0, wiggle:0, orbit:0, boomerang:0, spectral:0, grow:0,
           accel:0, spiral:0, chaos:0, burst:0, echo:0, kaleido:0, bounceDmg:0, pierceDmg:0, bounceSplit:0, lifeAdd:0, portal:0, jitter:0 },
    els:[], on:{}, special:{}, duos:[], sets:[]
  };
}

function addDef(M, d, n){
  n = n || 1;
  if(d.stats) for(const k in d.stats){
    if(k === "dmgMul" || k === "frogMul") M[k] *= Math.pow(d.stats[k], n);
    else M[k] = (M[k] || 0) + d.stats[k]*n;
  }
  if(d.shot) for(const k in d.shot) M.shot[k] = (M.shot[k] || 0) + d.shot[k]*n;
  if(d.els) d.els.forEach(e=>{ if(M.els.indexOf(e) < 0) M.els.push(e); });
  if(d.on) for(const k in d.on){ for(let i=0;i<n;i++) d.on[k].forEach(p=> (M.on[k] = M.on[k] || []).push(Object.assign({ src:d.name }, p))); }
  if(d.special) M.special[d.special] = (M.special[d.special] || 0) + n;
}

/* ---- attunement: build into one element and it answers. Sources of an element
   are items that put it on your shots or are made of it, its reliquaries
   (two each), boons that work with it, a transformation of it, and the gun in
   your hand. At 2, 4 and 6 sources you reach Attunement I, II and III, and
   each tier adds the next row below on top of the last. ---- */
DG.ATTUNE_AT = [2, 4, 6];
DG.ATTUNEMENT = {
  fire:[
    { name:"Kindled",        desc:"Burns last 25% longer; 1 hit in 12 flares up.", stats:{ statusDur:0.25 }, on:{ hit:[{ do:"nova", r:1.1, dmg:0.35, el:"fire", chance:0.08 }] } },
    { name:"Wildfire",       desc:"Burning goblins explode into flames when they die.", special:"wildfire" },
    { name:"Pyre",           desc:"+15% damage, and every 4 seconds in a fight a ring of fire bursts around you.", stats:{ dmg:0.15 }, on:{ tick:[{ do:"nova", r:3.2, dmg:1.2, el:"fire", every:4, at:"player" }] } }],
  frost:[
    { name:"Rimed",          desc:"Chills last 25% longer; 1 hit in 10 chills outright.", stats:{ statusDur:0.25 }, on:{ hit:[{ do:"status", st:"chill", t:1.5, chance:0.1 }] } },
    { name:"Brittle",        desc:"Chilled and frozen goblins take 35% more damage.", special:"brittle" },
    { name:"Deep Winter",    desc:"+15% damage; kills shatter into ice; a frost nova every 4.5 seconds.", stats:{ dmg:0.15 }, on:{ kill:[{ do:"shards", n:5, dmg:0.4 }], tick:[{ do:"nova", r:3.2, dmg:1, el:"frost", every:4.5, at:"player" }] } }],
  poison:[
    { name:"Festering",      desc:"Poison lasts 30% longer; kills leave a toxic puddle 1 time in 4.", stats:{ statusDur:0.3 }, on:{ kill:[{ do:"byproduct", el:"poison", chance:0.25 }] } },
    { name:"Plague",         desc:"Poison jumps from goblin to goblin.", special:"plague" },
    { name:"Pestilence",     desc:"+15% damage, and you leave a trail of poison in a fight.", stats:{ dmg:0.15 }, on:{ tick:[{ do:"byproduct", el:"poison", at:"player", every:1.2, moving:true }] } }],
  shock:[
    { name:"Charged",        desc:"1 hit in 10 arcs to 2 more goblins.", on:{ hit:[{ do:"chain", jumps:2, dmg:0.5, chance:0.1, el:"shock" }] } },
    { name:"Conductor",      desc:"Arcs jump twice more.", special:"conductor" },
    { name:"Stormcalled",    desc:"+15% damage, and lightning strikes a goblin every 3 seconds in a fight.", stats:{ dmg:0.15 }, on:{ tick:[{ do:"chain", jumps:3, dmg:1.2, every:3, target:"random", el:"shock" }] } }],
  arcane:[
    { name:"Hexed",          desc:"+8% damage; 1 hit in 8 marks a goblin.", stats:{ dmg:0.08 }, on:{ hit:[{ do:"status", st:"marked", t:3, chance:0.12 }] } },
    { name:"Soulbound",      desc:"A third of kills rise as an arcane wisp.", on:{ kill:[{ do:"wisp", n:1, el:"arcane", chance:0.33 }] } },
    { name:"Runeborn",       desc:"+15% damage, and every 4 seconds in a fight a ring of 8 arcane bolts flies out.", stats:{ dmg:0.15 }, on:{ tick:[{ do:"ring", n:8, dmg:0.8, el:"arcane", every:4 }] } }]
};
/* which element a special or a payload belongs to, for counting sources */
const SPECIAL_EL = { wildfire:"fire", brittle:"frost", plague:"poison", conductor:"shock", static:"shock", plaguestorm:"poison", fireice:"frost",
  relic_fire:"fire", relic_frost:"frost", relic_poison:"poison", relic_shock:"shock", relic_arcane:"arcane", wispcraft:"arcane" };
Items.elSources = function(d){
  if(d._els) return d._els;
  const out = {};
  const add = (e, n)=>{ if(DG.ELEMENTS && !DG.ELEMENTS[e]) return; out[e] = Math.max(out[e] || 0, n); };
  (d.els || []).forEach(e=> add(e, 1));
  if(d.special && SPECIAL_EL[d.special]) add(SPECIAL_EL[d.special], 1);
  for(const k in d.on || {}) d.on[k].forEach(pl=>{ if(pl.el) add(pl.el, 1); });
  for(const e in d.attune || {}) out[e] = d.attune[e];
  return d._els = out;
};
/* build archetypes, read off what a thing does (plus any it names itself) */
Items.tagsOf = function(d){
  if(d._tags) return d._tags;
  const t = {}, st = d.stats || {}, sh = d.shot || {}, sp = d.special || "", on = d.on || {};
  const pls = []; for(const k in on) on[k].forEach(pl=> pls.push([k, pl]));
  const has = f=> pls.some(([k, pl])=> f(k, pl));
  if(st.gold > 0 || st.magnet > 0 || has((k, pl)=> pl.do === "gold") || /midas|penny|member|mortgage|interest|brittlecrown/.test(sp)) t.coin = 1;
  if(st.rate > 0 || st.reload > 0 || sh.burst || /frenzy|itch|patience/.test(sp)) t.attackspeed = 1;
  if(sh.extra > 0 || sh.side || sh.back || sh.kaleido || sh.split || sh.echo || sh.orbit || sh.bounceSplit || /doubletap|fan|dualwield|shadow/.test(sp)) t.multishot = 1;
  if(has((k)=> k === "hit" || k === "crit" || k === "bounce" || k === "wall") || has((k, pl)=> pl.do === "chain" || pl.do === "missile") || /conductor|overkill|fractal|recursion|chainreaction/.test(sp)) t.proc = 1;
  if(st.crit > 0 || st.critMul > 0 || on.crit) t.crit = 1;
  if(st.frogDmg > 0 || st.frogRate > 0 || st.frogMul > 1 || has((k, pl)=> pl.do === "tadpole") || /twister|frogsona|frogswarm/.test(sp)) t.frog = 1;
  if(has((k, pl)=> pl.do === "wisp" || pl.do === "bee" || pl.do === "ghoul" || pl.do === "tadpole") || /moons|shadow|haunted|wisplord/.test(sp)) t.summons = 1;
  if(st.hp > 0 || st.wards > 0 || has((k, pl)=> pl.do === "heal" || pl.do === "ward") || /darksign|lifesteal|briar/.test(sp)) t.tank = 1;
  for(const e in Items.elSources(d)) t["el:" + e] = 1;
  (d.tags || []).forEach(x=> t[x] = 1);
  return d._tags = Object.keys(t);
};
/* where a build is heading: tag counts over what you own (2+ makes a direction) */
Items.direction = function(items, boons){
  const n = {};
  for(const id in items || {}) if(DG.ITEMS[id]) Items.tagsOf(DG.ITEMS[id]).forEach(t=> n[t] = (n[t] || 0) + items[id]);
  (boons || []).forEach(id=>{ if(DG.BOONS[id]) Items.tagsOf(DG.BOONS[id]).forEach(t=> n[t] = (n[t] || 0) + 1); });
  for(const t in n) if(n[t] < 2) delete n[t];
  return n;
};
/* how much a thing pulls toward a direction: 0 for nothing in common */
Items.pull = function(d, dir){
  let k = 0; Items.tagsOf(d).forEach(t=>{ if(dir[t]) k += Math.min(4, dir[t]); });
  return k;
};

/* items: { id: count }, boons: [ids], extra: item ids active right now (the held gun's innate ones) */
Items.build = function(items, boons, extra, gunEl){
  const M = Items.blank();
  for(const id in items) if(DG.ITEMS[id]) addDef(M, DG.ITEMS[id], items[id]);
  (boons || []).forEach(id=> DG.BOONS[id] && addDef(M, DG.BOONS[id], 1));
  (extra || []).forEach(id=> DG.ITEMS[id] && addDef(M, DG.ITEMS[id], 1));
  const has = id=> items[id] || (extra || []).indexOf(id) >= 0;
  DG.DUOS.forEach(d=>{ if(has(d.a) && has(d.b)){ M.duos.push(d.name); addDef(M, d, 1); } });
  M.sets = [];
  DG.SETS.forEach(s=>{ if(s.items.filter(id=> items[id]).length >= s.need){ M.sets.push(s.id); addDef(M, s, 1); } });
  if(M.special.prismheart) DG.ELEMENT_ORDER.forEach(e=>{ if(M.els.indexOf(e) < 0) M.els.push(e); });
  // attunement: count each element's sources, then add its tiers
  const src = {};
  const count = (d, n)=>{ const e = Items.elSources(d); for(const k in e) src[k] = (src[k] || 0) + e[k]*(n || 1); };
  for(const id in items) if(DG.ITEMS[id]) count(DG.ITEMS[id], items[id]);
  (boons || []).forEach(id=> DG.BOONS[id] && count(DG.BOONS[id], 1));
  (extra || []).forEach(id=> DG.ITEMS[id] && count(DG.ITEMS[id], 1));
  DG.SETS.forEach(s=>{ if(M.sets.indexOf(s.id) >= 0) (s.els || []).forEach(e=> src[e] = (src[e] || 0) + 1); });
  if(gunEl) src[gunEl] = (src[gunEl] || 0) + 1;
  M.attuneSrc = src; M.attune = {};
  for(const e in src){
    const tier = DG.ATTUNE_AT.filter(n=> src[e] >= n).length;
    if(!tier || !DG.ATTUNEMENT[e]) continue;
    M.attune[e] = tier;
    for(let t=0; t<tier; t++) addDef(M, DG.ATTUNEMENT[e][t], 1);
  }
  M.maxDepth = 1 + (M.special.recursion ? 2 : 0) + Math.min(2, M.special.fractal || 0);
  return M;
};

/* what Zippy looks like with these items (ids in the order he got them), and
   any transformations (set ids): a transformation's look wins the dyes */
Items.costume = function(ids, sets){
  const look = { robe:"arcane", cape:"arcane", parts:[], auras:[] };
  let robeT = -1, capeT = -1;
  ids.forEach(id=>{
    const c = DG.COSTUMES[id], d = DG.ITEMS[id]; if(!c || !d) return;
    if(c.robe && d.tier >= robeT){ robeT = d.tier; look.robe = c.robe; }
    if(c.cape && d.tier >= capeT){ capeT = d.tier; look.cape = c.cape; }
    (c.parts || []).forEach(p=>{ if(look.parts.indexOf(p) < 0) look.parts.push(p); });
    if(c.aura && look.auras.indexOf(c.aura) < 0) look.auras.push(c.aura);
  });
  (sets || []).forEach(sid=>{
    const s = DG.SETS.find(x=> x.id === sid); if(!s) return;
    if(s.look.robe) look.robe = s.look.robe;
    if(s.look.cape) look.cape = s.look.cape;
    s.look.parts.forEach(p=>{ if(look.parts.indexOf(p) < 0) look.parts.push(p); });
    if(s.look.aura && look.auras.indexOf(s.look.aura) < 0) look.auras.push(s.look.aura);
  });
  look.auras = look.auras.slice(-3);
  look.key = look.robe + "/" + look.cape + "/" + look.parts.join(",") + "/" + look.auras.join(",");
  return look;
};

/* ---- pools: an item leaves its pools once it's been offered ---- */
Items.pools = function(){
  const P = { t:[], s:[], b:[], x:[], a:[] };
  for(const id in DG.ITEMS) DG.ITEMS[id].pools.split("").forEach(p=> P[p] && P[p].push(id));
  return P;
};
Items.roll = function(G, pool, opts){
  const P0 = G.pools[pool] || G.pools.t, rng = G.rng, luck = G.mods ? G.mods.luck : 0;
  // a tag to lean on (a frog build's treasure room keeps one frog thing on offer)
  const lean = opts && opts.tag ? P0.filter(id=> Items.tagsOf(DG.ITEMS[id]).indexOf(opts.tag) >= 0 && (!G.seenItems[id] || DG.ITEMS[id].stack)) : null;
  const P = lean && lean.length ? lean : P0;
  const w = DG.POOL_TIERS[pool] || DG.POOL_TIERS.t;
  // deeper floors and luck push the odds up
  const push = 1 + 0.12*(G.floor - 1) + 0.08*luck;
  const tierW = w.map((x, i)=> x*Math.pow(push, i));
  for(let tries=0; tries<6; tries++){
    const tier = rng.weighted(tierW.map((x, i)=> ({ i, w:x }))).i;
    const cand = P.filter(id=> DG.ITEMS[id].tier === tier && (!G.seenItems[id] || DG.ITEMS[id].stack));
    if(cand.length){ const id = rng.weighted(cand.map(id=> ({ id, w:setPull(G, id)*fresh(G, id)*buildPull(G, id)*stackW(G, id) }))).id; Items.offer(G, id); return id; }
  }
  // the pool's run dry at those tiers: anything left, anywhere
  const any = Object.keys(DG.ITEMS).filter(id=> !G.seenItems[id] && DG.ITEMS[id].tier < 4);
  if(any.length){ const id = rng.pick(any); Items.offer(G, id); return id; }
  return "spinach";
};
Items.offer = function(G, id){ G.seenItems[id] = true; };
/* what you carried in your last runs turns up less, so one run's build isn't
   the next run's too (G.meta.recent: item ids from the last two runs) */
const STALE = 0.3;
/* a stacker you already carry turns up less with each copy */
function stackW(G, id){ const d = DG.ITEMS[id]; if(!d.stack) return 1; const n = (G.player && G.player.items[id]) || 0; return (G.seenItems[id] ? 0.6 : 1)*Math.pow(0.6, n); }
/* things that fit where your build is heading turn up more (never always) */
const BUILD_PULL = 0.3, BUILD_PULL_MAX = 2.5;
function buildPull(G, id){
  if(!G.player) return 1;
  const dir = Items.direction(G.player.items, G.player.boons);
  return Math.min(BUILD_PULL_MAX, 1 + BUILD_PULL*Items.pull(DG.ITEMS[id], dir));
}
function fresh(G, id){ const r = G.meta && G.meta.recent; return r && r.indexOf(id) >= 0 ? STALE : 1; }
/* at the end of a run: remember what it carried (this run, then the one before) */
Items.remember = function(G){
  const now = Object.keys(G.player.items), before = (G.meta.recentRuns || [])[0] || [];
  G.meta.recentRuns = [now, before];
  G.meta.recent = now.concat(before.filter(id=> now.indexOf(id) < 0));
  return G.meta.recent;
};
/* items from a set you've started turn up more often, so a transformation is
   something you can chase */
const SET_PULL = 2.5;
function setPull(G, id){
  const owned = G.player ? G.player.items : {};
  let k = 0;
  DG.SETS.forEach(s=>{ if(s.items.indexOf(id) >= 0) k = Math.max(k, s.items.filter(x=> owned[x]).length); });
  return 1 + SET_PULL*k;
}

/* a level-up offers n boons: never one you've taken three times, rarely
   one you were just offered, less often one you already have, so the
   choices keep changing */
Items.rollBoons = function(G, n){
  const p = G.player, owned = p.boons, recent = (p.boonOffers || []).flat();
  const dir = Items.direction(p.items, owned);
  const cand = Object.keys(DG.BOONS).filter(id=> owned.filter(x=> x === id).length < 3).map(id=>{
    const have = owned.filter(x=> x === id).length, b = DG.BOONS[id];
    return { id, w:(b.rare ? 0.45 : 1)*(have ? 0.5/have : 1)*(recent.indexOf(id) >= 0 ? 0.15 : 1), pull:Items.pull(b, dir) };
  });
  const pick = [];
  while(pick.length < n && cand.length){
    // once a build has a direction, the first boon offered usually follows it
    const lead = !pick.length && Object.keys(dir).length;
    const c = G.rng.weighted(cand, o=> o.w*(lead ? (o.pull ? 1 + 3*o.pull : 0.15) : 1)); pick.push(c.id); cand.splice(cand.indexOf(c), 1);
  }
  p.boonOffers = [pick].concat(p.boonOffers || []).slice(0, 2);
  return pick;
};

})(typeof window !== "undefined" ? window : globalThis);
