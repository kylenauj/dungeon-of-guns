# Dungeon of Guns: Design (v2)

**Zippy** is a hooded hexhunter who casts spells through guns. With him is **Gribbus**, a frog who attacks on his own. They go down into a dungeon that gets spookier and weirder the deeper they go. The run is built from a pile of powerups that stack and combine in ways nobody planned, least of all Zippy.

This document has three parts:

1. What the best games in the genre do, and what we take from each (section 1).
2. How Dungeon of Guns' systems work (sections 2–9).
3. How the code is laid out (section 10).

---

## 1. What the genre does well

| Game | What makes it work | What we take |
|---|---|---|
| **The Binding of Isaac** | Passive items **stack globally** and transform your one attack, so items combine without being designed to. **Item pools** per room type, with no repeats. Treasure, shop, secret, boss and devil-deal rooms. Familiars. **Active items** recharged by clearing rooms. Floor **curses**. Each floor is darker and stranger than the last. | Global stacking powerups with no slots. Item pools with no repeats in a run. Room types, including the **Cursed Altar** (trade max health for power). Gribbus as the familiar. Active items. Curses. The descent from goblin cellar to something much worse. |
| **Enter the Gungeon** | The dodge roll. Guns with personalities. Named **synergies**: owning two specific items pops "SYNERGY!" and upgrades both. | Blink. Guns as fire pattern × element. **Duos:** named combos that announce themselves. |
| **Noita** | Spell modifiers compose: "on hit, cast X", and X inherits the modifiers. Chaos that comes out of a few simple rules. | **Triggers and payloads.** Child shots inherit the parent's elements, with a depth limit so it never runs away. |
| **Risk of Rain 2** | On-hit item procs that chain. Stacks scale linearly or with diminishing returns. | Chance per proc, scaled by luck. A per-item cooldown so chains stay readable. Stacks add up. |
| **Hades** | Boons by rarity, and **Duo boons** that need two gods. You pick one of three. | Pick one of three on **level-up** (character boons) and at **frog ponds** (Gribbus buffs). **Elemental reactions** are Hades' duo boons, free and automatic. |
| **Nuclear Throne** | A mutation pick on level-up. Short, explosive, readable. | XP from kills leads to a level-up choice once the room is clear. |
| **Vampire Survivors** | Weapon + passive = an evolution. A screen full of chaos that still reads. | **Ascensions:** a gun plus the right powerup becomes something new. Screen-filling godly items. |
| **Spelunky** | The world reacts. Bombs hurt everyone. Shopkeepers get angry. | Explosive barrels, goblin bombs that hit goblins, breakable pots, traps that hurt enemies. |

The rule we take from all of them: **many small, general rules that multiply**, rather than a few big special cases. A powerup should be simple to read on its own and do something nobody planned next to three others.

---

## 2. The core loop

| Scale | What happens |
|---|---|
| **Seconds** | Move, aim, shoot, blink. Gribbus picks his own fights. Right-click casts the gun's element spell. `F` fires the active item. |
| **A room** | The doors slam shut. Goblins (and worse) rise out of the floor. Clear every wave and the doors open. Clearing a room charges your active item and sometimes drops a reward. |
| **A floor** | 10–18 rooms, including **jumbo rooms** (2×1, 1×2 and 2×2 cells) for the big fights. Treasure, shop, puzzle, **frog pond**, **cursed altar**, a secret room behind an illusion, and the boss. |
| **A run** | Five floors, each spookier and weirder than the last, then endless. You level up between fights and pick a boon. |
| **Meta** | **Golden flies** carry over between runs. Spend them at frog ponds to unlock new Gribbus buffs. |

---

## 3. Powerups: stacking, no slots

Every powerup affects **all** of Zippy's shots and lasts the whole run. There are no slots: pick everything up. Stacks add together.

Each powerup is data (`js/core/items.js`) built from four parts:

| Part | Examples |
|---|---|
| **Stats** | Damage, fire rate, shot speed, range, size, move speed, luck, crit, max health, mana, wards. |
| **Shot shape** | Ricochet, pierce, homing, split, extra shots, side and back shots, wiggle, orbit, boomerang, spectral (through walls), grow, accelerate, spiral, chaos. |
| **Elements** | Adds an element to every shot: Frost Rounds, Ember Rounds, Venom Rounds, Static Rounds, Arcane Rounds. A shot can carry several. |
| **Triggers** | `on fire / hit / kill / crit / bounce / wall / expire / blink / hurt / clear / second` → a **payload**. |

### 3.1 Payloads
- **Byproduct:** what the shot's element leaves behind. Frost leaves an **icicle** (it shatters into ice shards). Fire leaves a **flame patch**, poison a **toxic puddle**, shock a **spark orb** (it zaps nearby goblins), and arcane a **rune** (it fires motes).
- **Wisp:** a small allied spirit of the element. It orbits Zippy, then darts at goblins.
- **Shards:** a burst of small shots that inherit the parent's elements.
- **Burst:** an explosion. **Chain:** lightning. **Nova:** an elemental ring. **Shots:** a ring of your current gun's shots.
- **Tadpole:** a little frog that nibbles. Also heal, mana, ward, gold.

Payloads that fire shots make **children**. Children inherit elements and shape, but can only trigger more payloads up to a **depth limit** (one, by default). That's what keeps the chaos from freezing the game. Godly items raise the limit.

**The example from the brief, built from parts:** a single-shot gun + **Ricochet** + **Frost Rounds** + **Crystal Growth** (on bounce: drop a byproduct) + **Wispcraft** (byproducts spawn wisps of their element). The result: shots bounce off the walls, every bounce grows an icicle, and every icicle releases an ice wisp that hunts goblins. Nobody wrote "ricochet ice wisps": four rules multiplied.

### 3.2 Elemental reactions (free, automatic)
When a goblin carries two elements' statuses at once, they react:

| Pair | Reaction |
|---|---|
| Fire + Frost | **Steam:** a scalding burst around the goblin. |
| Fire + Poison | **Combust:** an explosion that grows with the poison stacks. |
| Fire + Shock | **Overload:** a knockback blast. |
| Frost + Shock | **Superconduct:** one big hit and a stun. |
| Frost + Poison | **Brittle Rot:** the goblin takes +50% damage for a while. |
| Shock + Poison | **Toxic Arc:** the poison leaps to three neighbours. |
| Arcane + anything | **Resonance:** an arcane mote bursts out. |

Reactions are the free combo layer: any two elements make something happen.

### 3.3 Rarity
Common → Uncommon → Rare → Legendary → **Godly**. Godly items are rare (well under 1% per roll, more in secret rooms and at the altar). They're screen-changing and get a gold pedestal and a sound. They include *Prism Heart* (every shot is every element), *Recursion Engine* (children can have children, three deep), *Zippy's Shadow* (a clone copies your shots), *Event Horizon* (expiring shots collapse into small black holes), and *Frogsona* (Gribbus fires your shots).

### 3.4 Pools
Each room type draws from its own pool: treasure, shop, boss, secret, altar. An item that has been seen, offered or taken **leaves the pool for the run**, so seeing the same one twice is rare by design.

**Fresh builds.** What you carried in your last two runs is offered at 0.3x weight (`Items.remember`, saved with the meta next to the golden flies), so one run's build isn't the next one's.

### 3.4b The grim ones
36 items that change how you play rather than add a number: **Hollowing** (+5% damage per kill in a room, up to +60%, gone when it's clear), **Executioner's Axe** (goblins under 15% just die), **Darksign** (once a floor, you rise again at 40%), **Lifedrinker** (2% of damage heals, 4 a second at most), **Parrying Dagger** (+60% for a second after a blink), **Black Briar Armour** (+20% while warded), **Hunter's Mark** (the first hit on each goblin triples), **Silver Bullets** (+60% on the dead and haunted), **Bell of Dread** (a toll stuns the room as it locks), **Bonfire Ember**, **Sunlight Medal**, **Soul Mass**, **Ring of the Abyss**, **Last Rites**, **Blood Moon**, and the godly **Fire Keeper's Soul**. Actives: Estus Flask, Toll of the Damned, Soul Spear. Duos: Crimson Covenant, The Reaper, Kindled, Praise the Sun, Hawkeye, Plague of Flies. Transformation: **Blood Hunter**.

Adding them (40 floor-4 builds, `npm run power`): p10 1.8x → 1.7x, median 4.1x → 5.0x, p90 8.5x → 11.8x, strongest 21.2x → 20.4x, peak shots 53 → 29. Bad runs stay possible, good ones got a little better. The bot's average floor stayed in its usual range (2.08, against 2.10 to 2.25 before).

### 3.5 Duos
Some pairs of items are named. Owning both announces the duo ("DUO! BRAIN FREEZE") and adds a bonus on top of the emergent combo.

### 3.5b The odd ones
About twenty items exist to be funny rather than strong. They add new verbs, and some are trades:
- **Crowd control:** Rubber Chicken confuses goblins, who clobber each other. Shrink Ray shrinks them. Cursed Accordion shoves them away on reload.
- **Shots:** Sticky Bombs, Bubble Gum puddles, Portal Pockets, Disco Fever volleys, Lucky Penny coins, Hiccups, Spaghetti Code and Snail Mail.
- **Allies:** Bee Hive bees, Necromancer's Napkin ghouls and the Haunted Gun.
- **Movement:** Thunder Socks lightning and Comet Cape blinks.
- **Luck and the frog:** Loaded Dice (0.6x to 1.8x per room) and Tongue Twister for Gribbus.
- **Five new actives:** Hat Trick, Goblin Whistle, Frog Cannon, Disco Ball and Pocket Black Hole.

### 3.5c Costumes
Zippy wears what he carries, as in Isaac (`DG.COSTUMES` in `items.js`, resolved by `Items.costume`):
- **Dyes.** Element items dye his cape and shoulder capelet. Legendary and godly ones (Inferno, Blizzard, Stormcaller, Midas, Zippy's Shadow) dye the whole robe and hat. The highest tier wins, so a common pickup never paints over a legendary.
- **Pieces stack.** About 40 items add a piece:
  - vines and flowers, goggles, a monocle
  - winged boots and striped socks
  - a flaming hat tip, an ice crown, a storm cloud, a plague-doctor beak
  - a rubber chicken in the hat band, a beehive or an accordion on his back, dice on his belt
  - a little ghost friend, a disco ball, a halo, a Gribbus hood, orbiting cubes, a void-tipped hat
- **Auras.** The big ones add particles: embers, snow, sparks, toxic bubbles, gold glints, smoke, rainbow, stars.
- **Live.** He's rebuilt with a sparkle whenever the look changes. `?gallery` has a COSTUMES row.

### 3.5d Transformations
Collect 3 items from a set (`DG.SETS`) and Zippy transforms, as in Isaac. Each form has its own look, which beats any item dye, and a modest bonus:
- **Pyromancer:** red, horns, fire on every shot.
- **Ice Lich:** a skull mask and an ice crown, frost novas.
- **Storm Lord:** lightning strikes.
- **Plague Doctor:** a beak and a top hat, plague on every shot.
- **Gardener:** a flower hat, petals, luck.
- **Goldfinger:** a crown, gold.
- **Frog Prince:** a lily cape, a stronger Gribbus.
- **Goofball:** a clown nose and ruff, confusion.

Items from a set you've started roll 2.5x more often per item you own from it, so a form is something you can chase. About a third of runs transform by floor 4.

Costumes also move: the cape flares as he runs; halos, ghosts and gremlins bob; the disco ball and orbit rings spin; flames flicker. The gun grows a little gem for every element its shots carry. Gribbus wears each trick he learns: goggles, a lily-pad hat, a doom hood, a bubble pipe, a pet fly. Zippy holds each new item up over his head, Isaac-style.

**Readability.**
- **Camera:** it sits a little lower and closer (pitch 0.93 rad, distance 19), so figures read as standing rather than squashed.
- **Characters:** they're drawn 16% taller to undo what foreshortening is left, and Zippy and Gribbus are drawn larger than life.
- **Pixels:** chunky pixel mode keeps more detail (h/500).
- **Portrait:** a window in the bottom-right corner shows Zippy and Gribbus up close, slowly turning so things on their backs come into view. It's labelled with any transformation.

### 3.6 Ascensions
A gun plus its matching item becomes an ascended gun, Vampire Survivors-style (for example, the Hex SMG plus Venom Rounds becomes the Plague Sprayer).

---

## 4. Zippy

| | |
|---|---|
| **Health** | 100, plus **wards**: blue pips that each block one hit completely. |
| **Mana** | 100. Pays for the gun's spell. |
| **Blink** | `Space`. Invulnerable, crosses pits. |
| **Guns** | Carries up to 3. A gun is its fire pattern, element and level; ascended guns can appear. Powerups apply to all of them. |
| **Active item** | One at a time, on `F`. Charged by clearing rooms or getting kills. |
| **Level-ups** | XP from kills. On level-up you pick **1 of 3 boons**: small character upgrades such as +crit, a fire trail behind blinks, mana on kill, a bigger pickup magnet, or Gribbus speed. The pick waits until the room is clear. |

---

## 5. Gribbus the frog

Gribbus, a warty old toad, follows Zippy and picks his own fights: in a fight he goes after the nearest goblin anywhere in the room, finding his way round furniture, with a **tongue lash** up close and a **spit** at range. He can't die. He only poofs back to Zippy's side when he's shut outside a room that locked, lost far away out of a fight, or properly stuck.

**Frog ponds** are side rooms with a pond and three lily pads. Each pad holds a **Gribbus buff**. Pick one and the other two sink. The buffs include Long Tongue, Toxic Spit, Frost Croak, Hop Lightning, Tadpole Brood, Lily Shield (blocks shots near Zippy), Bullet Gulp (eats enemy shots and spits them back), Royal Crown, Big Boy, Fly Hunter, Mirror Skin (copies Zippy's elements), Bubble Blower, Croak of Doom and Twin Frog. The godly one, **Frogsona**, makes Gribbus fire Zippy's shots.

**Golden flies** are rare drops: one in each frog pond, and bosses can drop them. They're saved between runs and unlock more Gribbus buffs in the pond pool.

---

## 6. The descent

The dungeon starts as a castle, and the **Gloom** (Gloom Shooter's rot, mould and cordyceps) eats more of it each floor until, by floor 5, there's no castle left: only a spooky mushroom forest. Each floor has a `gloom` value from 0 to 1 that drives the look:
- **Floors:** moss spreads in patches, with mycelium threads and glowing specks; from the middle floors, violet rot with glowing veins.
- **Walls:** bark and roots creep up them; the battlements crumble into ferns and glowcaps.
- **Light and gates:** torches become glowcap sconces, portcullises become bramble gates, and pillars become glowcap stalks and then mossy stumps.
- **Beyond the walls:** a forest of firs and giant glowcaps grows in the dark.

| Floor | Name | Gloom | Feel | Enemies | Boss |
|---|---|---|---|---|---|
| 1 | **The Forsaken Keep** | 0 | A dead castle: worn flagstones, slumped corpses, gibbets, candle clusters, braziers, toppled knights | Goblins | **Grubnok the Goblin King** |
| 2 | **The Weeping Undercroft** | 0.28 | Dripping, flooded cellars, sewer culverts, rats, corpses going to fungus | Goblins, shroom folk, the first rotlings | **The Morel Matriarch** |
| 3 | **The Rotting Crypt** | 0.5 | Ossuary walls, sarcophagi, open graves, soul-candles, roots splitting the stone | Ghosts, skeletons, rotlings, mould spitters | **The Weeping Bride** |
| 4 | **The Gloomwood** | 0.78 | Walls half bark, mossy floors, glowcap stalks, firs beyond | Watchers, blobs, tentacles, the Gloom | **The Eye Below** |
| 5 | **The Gloom Forest** | 1 | No stone: stumps, glowcaps, rot, bramble gates, glowbugs | **The Gloom:** rotlings, mould spitters, bloaters, blight husks, plus shrooms | **The Gloom Heart:** a rot-flesh knot with eyes and cordyceps; beats in rings, three phases |

The Gloom creatures come from Gloom Shooter:
- **Rotling:** a fast swarm.
- **Mould Spitter:** spits acid in volleys.
- **Bloater:** bursts into a spore cloud when killed, so don't pop it next to yourself.
- **Blight Husk:** an armoured cordyceps shroom that charges and shrugs off a quarter of every hit.

Deeper floors are darker. They have more **curses**: Darkness (less light), the Lost (no map), the Fog (shorter sight), and Haste (goblins are faster). They also get stranger dressing: whispers in the music and walls with eyes that follow you.

---

## 7. Rooms
- **Combat:** normal or **jumbo**, with furniture (pillars, pits, crates, cross walls, ring walls, gardens, graveyards…), **breakable** pots and crates, and **explosive barrels**.
- **Treasure:** an item pedestal. **Shop:** two items, a gun, soup, and a mystery. **Boss:** an item pedestal and the portal.
- **Secret:** behind an illusionary wall. Secret-pool items, with better godly odds.
- **Frog pond:** a Gribbus buff (pick 1 of 3) and a golden fly.
- **Cursed altar:** trade 20 max health for an altar-pool item. The pool has better odds of legendary and godly items.
- **Puzzle:** see section 8.

---

## 8. Puzzles
Every puzzle is generated and always solvable (the tests check). It rewards an item chest; failing some of them springs an ambush.

| Puzzle | How it works |
|---|---|
| **Three doors** | Coloured doors and a riddle with exactly one answer. The wrong door is paint (BONK) and an ambush. |
| **Braziers** | Lights-out. Shooting one flips it and its neighbours: a row on floors 1–2, a 3×3 grid deeper down. |
| **Push blocks** | Walk into stone blocks to shove them onto pressure plates. |
| **Shroom chorus** | Mushrooms glow in a sequence; shoot them in the same order. The sequence gets longer each round. |
| **Statues** | Each statue turns 90° when shot. Make them all face the eye. |

---

## 9. Difficulty
Goblins scale per floor (HP ×1 → ×3.3 by floor 5). Powerups and boons are how you keep up. Guns still have levels, but powerups multiply everything. Elites roll affixes. Bosses get one extra phase per endless loop. Balance is tuned against `npm run balance`, which has a bot play full runs.

**The power curve.** Some runs should be duds and some should be god runs. None should flood the room with shots.
- `npm run power` rolls 40+ floor-4 builds the way a run would and reports their damage against a no-item baseline.
- **Target spread:** a dud run near 1x, a typical run about 4–5x, the top tenth about 12–16x, and the odd godly run about 30x.
- **What keeps it there:**
  - **A shot budget.** Past 110 live shots, child shots stop spawning; past 160, nothing new spawns.
  - **Splits stay first-hand.** Only a shot fired from the gun can split or bounce-split, never a split of a split.
  - **Thinner volleys.** A volley bigger than the gun's own pattern thins each shot (shots^-0.3), and copies (echo, dual wield, the shadow, Frogsona) fire weaker.
  - **A reaction budget.** Reactions share one budget per room (4 banked, 2.2 a second), and their blasts splash other goblins at 40%.

---

## 10. The look: grimdark

Dark Souls, Bloodborne, Blasphemous and Darkest Dungeon, in one look across everything, so no model or room looks pasted in from somewhere else.

- **One material.** Characters, props, walls and floors all use one patched toon material (`K.ink` in `kit.js`), but light now falls off smoothly (`uSoft` blends the old toon bands away), with a faint ordered dither for grit and ink hatching only in the deepest shadow.
- **Characters** wear grime in their own space (mottled stains, fine grain, dirt rising from the feet, colours pulled toward grey), get a faint cold rim light and a contact shadow, and a thin contour instead of a cartoon outline (`K.OUTLINE`).
- **Full resolution** by default; **P** brings back the chunky pixels.
- **One post pass** (`stage.js`):
  - soft ink where depth jumps
  - bloom on what burns bright: candles, eyes, spells
  - a grade that drains colour, crushes the blacks and leans shadows to the floor's shade colour
  - a heavy vignette, film grain, and on deeper floors edges that swim and split
  - **V** toggles the plain picture.
- **Light:** a cold low moon from one side, a warm guttering lantern on Zippy, and torches, braziers and candles in small warm pools.
- **The detail standard for every model:** no chibi proportions or cartoon eyes; gaunt, hunched, worn silhouettes; sunken sockets with small glowing pinpricks; layered cloth, rust, bone, straps, scars and tatters (`K.slathe` smooth profiles, `K.tatter` ragged hems, `K.sculpt` sculpted flesh and bark). Budgets: about 25k triangles for an enemy, 35k for Zippy, 70k for a boss. `?gallery` lines every model up side by side to check it.
- **Vanity** (`vanity.js`, view only, seeded from the dungeon so a seed always dresses the same): drag marks and blood pools, ankle mist, light shafts, corpses and candles in corners, chains and skulls on the arches, lean red-eyed rats, splats that stay for the floor.
- **UI:** engraved serif (Cinzel, EB Garamond), bone on near-black with thin gold rules; Souls-style area cards, a long thin boss bar, and YOU DIED.

---

## 11. Architecture

```
js/core/        no THREE, no DOM: runs under Node
  core.js         namespace DG, seeded RNG, helpers
  data.js         elements, statuses, reactions, spells, guns, enemies, bosses, floors, traps, lines
  items.js        every powerup, Gribbus buff, boon and active item; pools; building the stat block
  loot.js         guns and item rolls, prices
  dungeon.js      the generator: graph, jumbo rooms, special rooms, furniture, props, puzzles
  puzzles.js      puzzle rules
  game.js         the simulation: Zippy, shots, triggers, payloads, reactions, hazards, allies, rooms
  gribbus.js      the frog, and the other allies
  ai.js           enemy and boss behaviours
tools/bot.js    a bot that plays (tests, balance, attract mode)
js/render/      kit (the ink material, baked models with outlines), stage (lights, camera, the
                ink post pass), world (dungeon, decor, fog of war), vanity (decals, mist,
                shafts, critters, splats), models, decor, fx, view, gallery (?gallery)
js/ui/          hud.js, menus.js
```

**House rules:**
- The game never waits on the view.
- Core code never calls `Math.random`.
- New content goes in data.
- Every fixed bug gets a regression test.
- Balance changes are made one knob at a time, with `npm run balance` numbers before and after.
