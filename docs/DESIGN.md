# Dungeon of Guns — Design

A top-down, real-time roguelike dungeon crawler. You're a wizard who casts spells **through guns**, fighting your way down a goblin-infested dungeon that is dug fresh for every run.

This document is the plan: the pillars, the game loop at every scale, how difficulty and loot fit together, the content in the base build, and how the code is laid out. Section 8 is the roadmap for refining it into a polished game.

---

## 1. Pillars

1. **Guns are spellbooks.** Every gun has a fire pattern (pistol, SMG, shotgun, rifle, launcher) *and* an element (arcane, fire, frost, poison, shock). Every shot carries the element's status, and the right mouse button casts the element's spell through the gun. One gun is a whole build.
2. **Runes make the build yours.** Runes socket into guns and change how they behave. The headline example: an SMG with **Plague Spreader** turns every goblin it touches into a carrier, and the poison hops from goblin to goblin.
3. **Every run is a new dungeon.** Layout, room shapes, furniture, traps, goblins, puzzles, secrets and loot are all procedural, from a seed you can share.
4. **Goofy, not grim.** Painted doors you bonk into. Illusionary walls. Riddles from "A Totally Honest Goblin". Goblins that slip on banana peels and get flattened by their own king. A boss called *Grubnok Who Has Been Working Out*.
5. **Readable danger.** Every enemy attack has a tell (wind-up, glow, floor marker). Traps are minor: they sting, they don't end runs. You die to the goblins, not to dice.

---

## 2. The game loop, at every scale

### 2.1 Moment to moment (seconds)
**Move, aim, shoot, dodge.** WASD and the mouse, twin-stick style. The decisions:
- **Where to stand.** Pillars and crates block shots. Pits swallow goblins you knock into them, and swallow you if you're careless.
- **When to blink.** Blink is a short dash with invulnerability. It goes through bullets and over pits, on a cooldown under a second. It's the skill expression.
- **Ammo vs. mana.** Guns have magazines and reload. Spells cost mana, which regenerates and comes back faster with kills. Use the gun for steady damage and the spell for the big moment.

### 2.2 The room (30–90 seconds)
Walk in and **the doors slam shut**. Goblins rise out of the floor in a puff of smoke (they can't act yet, so you get a beat to read the room). Kill every goblin in every wave and the doors open. A cleared room sometimes drops a reward: gold, a heart, mana, a rune, or rarely a chest.

Rooms vary by:
- **Shape and furniture:** pillars, a central pit, crates, cross-shaped low walls, or empty.
- **Traps:** spike plates (on a timer, with a warning), dart slits in the walls, fire vents, banana peels. Traps hurt goblins too. Using them against goblins is part of the fun.
- **Waves:** one wave on floors 1–2, two on bigger rooms from floor 3.
- **Elites:** a goblin can roll an affix: **Armored**, **Swift**, **Big** or **Vengeful** (explodes into a bullet ring when it dies). Elites drop double gold.

### 2.3 The floor (5–10 minutes)
A floor is 9–15 rooms in a branching layout:

| Room | What's there |
|---|---|
| **Start** | A sign with the controls. Also a painted door, as an introduction. |
| **Combat** | Most rooms. Locks until cleared. |
| **Treasure** | A chest (a gun 60%, a relic 22%, a rune 18%). |
| **Shop** | Snibbit the goblin merchant: a gun, a rune, a relic, and soup. |
| **Puzzle** | Lights-out braziers, or the three-doors riddle (see 2.5). Reward chest. |
| **Secret** | Behind an **illusionary wall**. A better chest. |
| **Boss** | Grubnok the Goblin King. Kill him, open the portal, go deeper. |

The layout is a tree (with a few loops), so the boss is always at the end of a dead end and the shop and treasure are off on side branches. Exploring costs time and risk but pays in loot. The minimap fills in as you go and hints at doors you haven't opened.

### 2.4 The run (30–50 minutes)
Five floors, each with its own name, palette and nastier goblins:

1. **The Goblin Cellars:** grunts and slingers.
2. **The Snot Sewers:** bombers and shamans join.
3. **The Fungus Halls:** brutes and sneaks join; rooms get second waves.
4. **The Molten Mines.**
5. **Grubnok's Throne Hole.**

Beat floor 5's boss and you've escaped. You can then **keep going** into endless floors with escalating scaling. Taking the portal down heals 30%.

### 2.5 Illusions and puzzles
- **Painted doors:** look exactly like doors, but they're paint on a wall. Walk into one and you **BONK** (short stun, stars, a joke). Most are just jokes.
- **Illusionary walls:** look like stone, but you can walk and shoot straight through them. Each floor usually hides a **secret room** behind one. There's a faint tell (the stone is a shade off), and shots or explosions that pass into one make it shimmer and reveal itself.
- **Three doors puzzle:** three coloured doors and a sign with a riddle that's guaranteed to have exactly one answer ("It is NOT the red one. It is right next to the blue door."). The honest door is an illusion leading to a closet with a chest. A wrong door is paint: BONK, and the goblins who were watching jump you.
- **Braziers puzzle:** five braziers in a row. Shooting one flips it and its neighbours (lights-out). Light them all to unlock the chest. It's always solvable.

### 2.6 Meta (across runs)
The base build keeps your best floor, run count and total kills. Persistent unlocks are on the roadmap (section 8). The plan: unlock new guns, runes and relics *into the loot pool*, rather than permanent stat boosts. That way skill and loot stay what carries a run.

---

## 3. Difficulty and "you need good loot"

The pressure comes from two curves that diverge on purpose:

**Goblins get tougher every floor** (`FLOOR_SCALE` in `data.js`):

| Floor | Goblin HP | Goblin damage | Room budget | Waves | Elite chance |
|---|---|---|---|---|---|
| 1 | ×1.00 | ×1.00 | 6.4 | 1 | 4% |
| 2 | ×1.46 | ×1.18 | 8.8 | 1 | 12% |
| 3 | ×2.00 | ×1.36 | 11.2 | 2 | 20% |
| 4 | ×2.62 | ×1.54 | 13.6 | 2 | 28% |
| 5 | ×3.32 | ×1.72 | 16.0 | 2 | 36% |

**Guns only get better if you find better ones.** A gun's damage is `base × (1 + 0.3 × (level − 1)) × rarity`. Its **level is the floor it dropped on** and is fixed for good. Rarity adds ×1.14 to ×1.75 damage and more rune slots:

| Rarity | Damage | Rune slots | Comes with |
|---|---|---|---|
| Common | ×1.00 | 1 | 0 runes |
| Uncommon | ×1.14 | 1 | 1 |
| Rare | ×1.30 | 2 | 1 |
| Epic | ×1.50 | 2 | 2 |
| Legendary | ×1.75 | 3 | 2 (40% chance of a named unique) |

So the floor-1 starter, *Old Faithful*, does about half the damage per goblin-HP on floor 3 that it did on floor 1. **If you don't pick up new guns, the dungeon outgrows you.** Rarity odds skew upward with depth, and chests in secret rooms, puzzle closets and the shop roll a level higher. Exploring is how you keep up.

**Runes** are the other lever: they don't scale with level, but they multiply (Heavy Lead ×1.35, Twinshot, Splitter, Boom Bits) or add whole mechanics (Plague, Wildfire, Conductor). A low-level gun with the right runes can carry you a floor longer. Runes move freely between guns in the bag, so a good rune is never wasted.

**Relics** are flat passives (Goblin Tooth Necklace +15% damage, Comfy Socks +12% speed, Banana Insurance...). The shop and chests sell them.

Balance gets tuned against `npm run balance`, which has a bot play full runs with no cheats. Change one knob at a time and quote the before and after.

---

## 4. Combat rules

| | |
|---|---|
| **Wizard** | 100 HP, 100 mana (+7/s, +4 per kill). Carries up to 3 guns. 0.7 s of invulnerability after a hit. |
| **Blink** | 3.6 tiles in 0.14 s, invulnerable for 0.3 s, 0.85 s cooldown. Crosses pits. |
| **Pits** | Fall in: 10 damage and you're put back at the last safe tile. Goblins that fall in are gone. |

**Elements** (applied on every hit):

| Element | Status | Spell (RMB) |
|---|---|---|
| Arcane | +20% damage, big knockback (into pits!) | **Magic Missiles:** 5 homing bolts |
| Fire | Burn: damage over 3 s | **Fireball:** slow orb, big explosion, sets alight |
| Frost | Chill: slows 40%; 5 stacks **freeze** | **Frost Nova:** freezes everything near you and deletes enemy shots |
| Poison | Stacking poison (up to 10 stacks) | **Plague Cloud:** a lingering cloud at the cursor |
| Shock | 25% chance to arc to a neighbour | **Chain Lightning:** leaps between 6 goblins |

**Runes (16):** Plague Spreader, Venom Tips, Ricochet, Splitter, Seeker, Skewer, Heavy Lead, Hair Trigger, Leech, Spell Surge, Boom Bits, Wildfire, Brittle, Conductor, Deep Pockets, Twinshot. Full text is in `data.js`.

**Goblins:**

| Goblin | From | Does |
|---|---|---|
| Grunt | floor 1 | Runs at you, winds up, lunges. |
| Slinger | 1 | Keeps 4–7 tiles away, strafes, throws rocks. |
| Bomber | 2 | Lobs bombs at where you are. A red circle shows where it lands. Bombs hurt goblins too. |
| Shaman | 2 | Heals the most hurt goblin nearby (green beam), casts 3-way hexes that slow you. |
| Brute | 3 | Big and slow. Paws the ground (a red lane shows the line), then charges. Hits a wall: dizzy for 1.4 s. |
| Sneak | 3 | Nearly invisible. Circles behind where you're aiming, then stabs. |
| **Grubnok** | boss | Bullet rings, aimed spit fans, belly flop (a red circle shows the landing, and it squashes his own goblins), summons the lads. Below half health: angrier and faster. |

---

## 5. Procedural generation

`js/core/dungeon.js`, deterministic from the seed:

1. **Room graph:** rooms grow on a 7×7 grid of cells from the start room. A new room is only added next to one existing room (most of the time), so the result is a tree. A few loops are then added between plain rooms.
2. **Special rooms:** the farthest dead end becomes the boss room; two other dead ends become treasure and shop; a plain room at least two steps from the start becomes the puzzle. An empty cell next to the map becomes the secret room, joined by an illusionary wall.
3. **Rectangles:** each cell gets a room of a size that fits its type (11×9 up to 22×16), placed randomly inside the cell.
4. **Corridors:** neighbours are joined by 3-wide corridors, straight when the rooms overlap or with a dog-leg when they don't. There's a door at each end, and the secret one's host end is an illusion.
5. **Contents:** furniture (rolled back if it would cut the room off from its doors), traps, waves of goblins paid for from a budget, elites, props, painted doors, puzzles.
6. **Validation:** a flood fill from the start must reach every room. Otherwise the generator rolls again.

The tests check this over hundreds of seeds: every room reachable, secret rooms reachable *only* through illusions, every riddle has exactly one answer, every brazier puzzle is solvable.

---

## 6. Assets

Everything is built in code, as in *Pine Hollow Rally* and *Gloom Shooter*. There are no image or sound files.

- **From Pine Hollow:** the chunky-pixel look (render at ~380 px tall and scale up with hard edges; `P` toggles it), the Saira Condensed type, the slanted menu plates with hard ink shadows, and fully synthesized audio.
- **From Gloom Shooter:** the asset kit (`kit.js`: faceted lump geometry, vertex painting, geometry merging, the glow texture), the spark pool in `fx.js`, the synth sound engine in `audio.js`, the vendored three.js r128, and the architecture: pure-logic core under Node, with the view reading an event list.
- **New:** stone and floor textures drawn on canvases; the wizard; six goblin kits and Grubnok; five guns; chests, signs, pedestals, braziers, portcullises, painted doors, torches, traps; a goblin-march soundtrack that adds drums in fights and speeds up for the boss.

---

## 7. Architecture

```
js/core/      the game: no THREE, no DOM, runs under Node
  core.js       namespace DG, seeded RNG, helpers
  data.js       ALL content: elements, spells, guns, rarities, runes, relics, goblins, floors, traps, lines
  loot.js       rolling, naming, pricing guns/runes/relics; gun stats from runes + relics
  dungeon.js    the generator
  game.js       the simulation: wizard, shots, statuses, rooms, waves, traps, puzzles, illusions, loot, shop
  ai.js         goblin behaviours and Grubnok
tools/bot.js  a bot that plays (tests, balance, and the title-screen attract mode)
js/render/    three.js: stage (renderer, camera, lights), world (dungeon meshes, fog of war),
              models, fx, view (reads the game, never writes it)
js/ui/        hud.js (canvas HUD + minimap), menus.js (title, pause, bag, end)
js/input.js   keyboard + mouse, gamepad
js/audio.js   synthesized sound and music
js/main.js    fixed 60 Hz loop and screen flow
```

**House rules** (inherited from Gloom Shooter):
- The game never waits on the view. `Game.update(dt, input)` resolves everything at once and appends events. The view, HUD and audio read them.
- New content goes in `data.js`. Code changes only for a new *kind* of effect.
- Every logic bug that gets fixed gets a regression test in `tests/rules.test.js`.
- Balance changes are made one knob at a time and checked with `npm run balance`.

---

## 8. Roadmap: from base to polished

**Phase 2: assets and feel**
- Wizard and goblin animation passes (proper walk cycles, hit reactions, death poses), robes that sway.
- Gun-specific muzzle effects and shot shapes (shotgun pellets vs rifle tracer vs SMG stream); recoil, hit-stop on crits, screen-shake tuning.
- Per-floor set dressing: sewer water channels, glowing fungus, lava cracks, Grubnok's gold.
- Destructible crates and barrels (explosive barrels!), pots that drop coins.

**Phase 3: content**
- One boss per floor (a Shaman Council, a Brute in a mine cart, a giant mimic door…), with Grubnok as the finale.
- More gun bases (beam staff, boomerang-blade, minigun, wand-bow), more runes (chain-reaction, orbiting bullets, time-slow on blink), runes with downsides (cursed).
- More puzzles: pressure plates that need a goblin standing on them, a gong melody puzzle, a mirror-and-beam puzzle, a "which goblin is lying" riddle.
- Mimic doors and mimic chests. Goblin "heist" rooms where they try to steal your gold.
- NPC events: a lost goblin who wants escorting, a gambling goblin, a cursed altar trade.

**Phase 4: the run and meta loop**
- Unlocks: new guns, runes and relics added to the loot pool by achievements ("kill 50 goblins with plague").
- A hub between runs (the wizard's tower) to choose a starting gun.
- Daily seed with a shared leaderboard.
- Curses and blessings at floor transitions (risk vs reward choices).

**Phase 5: polish and platforms**
- Touch twin-stick controls for phones (the HUD already scales).
- Settings: rebinding, screen shake, colourblind-safe element markers.
- The Gloom Shooter "ghost" approach: an automated playtester and screenshot audit.
