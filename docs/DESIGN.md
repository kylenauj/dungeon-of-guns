# Dungeon of Guns: Design (v2)

**Zippy** is a small wizard who casts spells through guns. With him is **Gribbus**, a frog who attacks on his own. They go down into a dungeon that gets spookier and weirder the deeper they go. The run is built from a pile of powerups that stack and combine in ways nobody planned, least of all Zippy.

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

### 3.5 Duos
Some pairs of items are named. Owning both announces the duo ("DUO! BRAIN FREEZE") and adds a bonus on top of the emergent combo.

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

Gribbus follows Zippy, hops into fights, and attacks whatever is closest: a **tongue lash** up close, a **spit** at range. He can't die. If he's hit he's knocked out for a few seconds and croaks about it.

**Frog ponds** are side rooms with a pond and three lily pads. Each pad holds a **Gribbus buff**. Pick one and the other two sink. The buffs include Long Tongue, Toxic Spit, Frost Croak, Hop Lightning, Tadpole Brood, Lily Shield (blocks shots near Zippy), Bullet Gulp (eats enemy shots and spits them back), Royal Crown, Big Boy, Fly Hunter, Mirror Skin (copies Zippy's elements), Bubble Blower, Croak of Doom and Twin Frog. The godly one, **Frogsona**, makes Gribbus fire Zippy's shots.

**Golden flies** are rare drops: one in each frog pond, and bosses can drop them. They're saved between runs and unlock more Gribbus buffs in the pond pool.

---

## 6. The descent

| Floor | Name | Feel | Enemies | Boss |
|---|---|---|---|---|
| 1 | **The Goblin Cellars** | Warm torches, crates, barrels | Goblins | **Grubnok the Goblin King:** bullet rings, belly flop, summons |
| 2 | **The Mushroom Grotto** | Glowing caps, spore haze | Shroom folk + goblins | **The Morel Matriarch:** spore storms, a mushroom ring that hems you in, splits her caps |
| 3 | **The Haunted Crypt** | Cold blue, candles, graves, fog | Ghosts, skeletons | **The Weeping Bride:** three copies, only one real, and a wail that sweeps the room |
| 4 | **The Weird Below** | Purple and red, eyes in the walls, flesh | Watchers, blobs, tentacles | **The Eye Below:** sweeping lasers, tentacle bursts, blinks shut to become invulnerable |
| 5 | **The Hollow Heart** | Black and red, pulsing | Everything, twisted | **The Hollow Heart:** beats in rings, three phases |

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

---

## 10. The look: "lantern ink"

One look across everything, so no model or room looks pasted in from somewhere else.

- **One material.** Characters, props, walls and floors all use one patched toon material (`K.ink` in `kit.js`). The light reaching a pixel is cut into four bands, with an ordered Bayer dither between them. Lantern pools fall off in stepped, stippled rings, like an engraving printed in colour. The darkest band gets diagonal ink hatching.
- **Characters** add a rim light in the floor's colour and a contact shadow near the floor, plus an inverted-hull outline in the floor's ink colour.
- **One post pass** (`stage.js`):
  - ink lines wherever depth jumps, so walls, decor and props are outlined like the characters
  - a per-floor split-tone grade
  - a vignette into the floor's fog colour, and film grain
  - on deeper floors, edges that swim and split their colours (`weird`: 0 in the cellars, 1 in the Heart)
  - **V** toggles the plain picture.
- **Per floor** (`data.js` FLOORS): ink, rim, shade/highlight grade, light-shaft colour, mist density, weirdness.
- **The detail standard for every model:**
  - a silhouette with secondary shapes
  - a face with highlights (eyes, brows, a mouth or teeth)
  - an accent material (gold, iron or a glow)
  - one or two props that tell you who it is (the grunt's shield, the bomber's bandolier, the ghost's ball and chain, the Bride's wilted bouquet)
  - `?gallery` lines every model up side by side to check it.
- **Vanity** (`vanity.js`, view only, seeded from the dungeon so a seed always dresses the same):
  - floor decals from one painted atlas
  - dithered ankle mist that thickens with depth
  - light shafts, and arches over north doors
  - dressing on every wall face and on the wall tops
  - rats, bats and fireflies
  - splats and scorch marks that stay for the floor

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
