# Roads down: endings, Olm, the frog, puzzles and lairs

## 0. Now: one road a run, by chance

**This section is what's built.** Sections 2 to 4 below are the earlier
design (the Lantern and the Rot as chains you could start on any run); they
stay as history. The rest (the Mission, puzzles, lairs) still stands.

Side roads were on offer every run, and the Rot's choice at the pond was
obvious (click the corrupted lily). Now a run gets **at most one side
road**, rolled from the seed when it starts (`DG.ROUTES`: none 40%, the
Ember 20%, the Bog 20%, Olm 20%; `G.roads.route`, `js/core/roads.js`).
Only that road's things are put in the dungeon, so a road is something you
stumble on. `?route=bog|olm|ember|none` forces one for testing.

| Road | What you find | Last floor | Boss | Ending |
|---|---|---|---|---|
| **None** | the Mission only | the climb out | the Gloom Heart | **DAWN** |
| **The Ember** | the Sealed Reliquary on floor 2 or 3, its Warden keeping the Ember | 6, the Kiln | the Hollow Wizard | **THE FIRST FLAME** |
| **The Bog** | glowing mushrooms down the dungeon (2-3 a floor). Gribbus eats each one and grows a little; at 4, 7 and 10 he grows a size (the old Rot models); from 4 on he **demands praise** (E near him: +50% for 20s, ignore him and he sulks). At ten, the Heart's portal runs green | 6, the Glutton's Bog: everything glows, Gribbus hits twice as hard and wears the crown | the Bog Lord, Toad King | **KING OF THE BOG**: Gribbus eats him; Zippy is his royal wizard |
| **Olm** | Brother Olm twice (floors 1-2 and 3-4). Hear everything he has to say (Listen, across both visits) and he gives up his lantern; the door of eyes in his second library opens | 6, the Flesh Library: ghosts, Lantern Wights and Gorged Toads | the Archivist, Who Wrote the Dark | **THE WHITE WIZARD**: Zippy, cleansed, robed white, in a column of holy light |

**THE THRONE** isn't a road but a build. Master the wand's element
(attunement III in it: six sources, the wand counting one) and when the Heart
falls its portal burns that element's colour (`G.mastered()`, portal kind
`throne`; mastered after the Heart, by its relic say, the portal turns then,
`G.checkThrone`). The Ember and the Bog come first. Through it: the ending,
no climb. The throne rises out of the floor (`Models.throne(el)`,
`js/render/rigs-throne.js`), Zippy, robed all in the element, sits in it,
Gribbus hops up on the arm, and the element pours out of him round the room.
One ending, five thrones, each with its own words (`DG.ENDINGS.throne.els`,
`DG.endingFor`): the **Ash**, **Rime**, **Blight**, **Storm** and **Star
Thrones**. `G.meta.thrones` remembers which.

On the way, the robes show it (`Items.costume(ids, sets, { el, tier })`):
at attunement I the cape takes the element's dye, at II the robe runs half
way to it, at III all of him, with its motes about him. The wand keeps its
element on a tie; another element has to pass it. Every shot carries the
wand's element; the others take turns riding on one shot in four
(`DG.TINGE_EVERY`, `G.shotEls`), so a frost build fires frost, not a
rainbow (the Prism Heart is the rainbow, on purpose). Item rolls lean the
same way (`DG.EL_PULL`): each item of the wand's element makes more of it
turn up (x1.8 for one, to x3.5) and other elements less (x0.45). Ten items
in, the wand's element went from 55% of a build's element items to 72%,
and builds with three or more of one element from 26% to 48%. Picking up another
element's item says so ("Poison stirs in you, but your wand stays frost
(frost 2, poison 1)") and the HUD rings the wand's element in gold.

Off his road, Olm still turns up once on 35% of runs. He looks like Zippy
(the same school's coat, hood and hat), a head taller, in teal and brass,
with ten little frogs sat round him reading scrolls in his library. His
talk is a panel along the bottom of the screen, no portrait: Listen, a
scroll (a powerup) for gold, Trade (a powerup for one a tier higher), a
Blessing (the only boons there are now), Mend, a Key.

**Gribbus' pond** is rare (18% of floor 1, 25% after; every floor on a frog
build). Its three lily pads hold three tricks of **one tier**, so no pad is
the obvious pick. His tricks are items (`f_*`), found in shops, treasure
and boss pools too, so a frog build is something you can steer toward.
**Mimic Toad** sits him at your side copying every volley you fire, at half
strength before frog damage bonuses. Golden flies are gone.

## The earlier design

A design for the second half of the game. Today the two side endings sit
behind a locked door each (the Sealed Reliquary and the Drowned Shrine). A
key opens them and a free relic is inside, so a run with a few spare keys
falls into a side ending almost by accident. This design replaces that
with three **roads**. Each one is a chain of things you *do* on the way
down. Each one changes how the run plays as well as how it ends.

| Road | Who leads you | What your run becomes | Last floor | Ending |
|---|---|---|---|---|
| **The Mission** | no one (Zippy's own) | whatever you build | 5, the Gloom Forest | **DAWN** |
| **The Lantern** | Brother Olm, the last Lamplighter | a spellcaster: Zippy's casts grow, Olm fights beside you | 6, the Kiln | **THE FIRST FLAME** |
| **The Rot** | Gribbus, and what's in his pond | a frog build: Gribbus does the killing | 5, drowned | **KING OF THE BOG** |

Both side roads can be *started* on the same run. Each has a **point of no
return** on floor 2 or 3, and stepping past one closes the other. A road
left unfinished falls back to the Mission. A run gets one ending, chosen by
play, never by a key.

---

## 1. The Mission (DAWN)

**The pitch.** The Gloom is a rot spreading up from the Heart at the bottom
of the Keep. Go down. Still the Heart.

Today it's a plain "kill five bosses". It gets three things:

- **A journal.** A new page in the satchel (TAB) shows the Mission, plus
  any road you've stumbled onto, with the steps done so far and a
  half-cryptic line about the next one ("The lantern wants three wicks.
  One burns in these halls."). It answers "what am I doing here" without a
  quest marker.
- **The Heart remembers.** Each floor boss you kill severs one of the
  Heart's roots, and the arrival line on each floor says so. On floor 5
  the Heart fights with one phase for each root you *didn't* cut cleanly:
  every boss killed without taking a hit trims a phase. Skilled play
  shortens the fight, and the fight doesn't drag.
- **The last beat.** When the Heart dies, the forest starts to come apart.
  There's a 40-second climb out: one long corridor with roots tearing
  through the floor and the last of the Gloom fleeing past you, ending in
  daylight. It's short and loud, and it's the only time in the game you
  run *toward* light. Then DAWN.

---

## 2. The Lantern road (THE FIRST FLAME): Brother Olm, rebuilt

### Who he is now

Olm today is a small figure in a cosy library: a kettle, a cot, books,
an empty room. He becomes the game's **second most important character.**

- **The look.** He's twice Zippy's height, hunched so his hood scrapes the
  ceiling, and gaunt. His robe is stitched from vellum pages, with ink and
  wax dripping off the hem. His face is never seen: where the face should
  be, an iron **cage-lantern** hangs from his hood, and a small trapped
  flame gutters inside it, the only warm light in the room. A long
  hooked staff hangs with prayer-chains. He moves slowly, with long
  pauses, and speaks in a dry rasp. Budget: a boss-sized model (≤ 70k
  triangles), built from the same meat-limb kit as Zippy.
- **The truth (revealed along the road).** Olm and Zippy's master were the
  Keep's two Lamplighters. Forty years ago, afraid the First Flame would
  be stolen, Olm took a coal of it in his lantern "for safekeeping". The
  Flame guttered without it. The Gloom came up through the cold hearth,
  and his friend stayed below to guard a dead fire until he went hollow.
  Olm has been "searching for the light at the bottom" ever since. He has
  had it in his lantern the whole time. He has never been able to make
  himself go back.

### His room: the Lantern Sanctum

The library becomes a ruined **scriptorium-observatory**:

- a ring of lecterns, each with a book chained open, pages turning on
  their own;
- a broken orrery of bones and brass turning slowly overhead;
- mounds of melted wax with dozens of candle stubs (the light accents);
- a summoning circle burned into the floor, and Olm seated at its centre
  on a chair too small for him;
- one tall cracked window of stained glass, with a shaft of cold light
  through the dust;
- shelves collapsed into drifts of loose pages that rustle when you walk
  through them.

It's dark, grand and wrong, and nothing like the cosy library.

### The chain

| # | Step | Where | What you do | What it gives |
|---|---|---|---|---|
| 1 | **A light in the stacks** | Floor 1 or 2 (his Sanctum is guaranteed on one of them while the road is open) | Talk to Olm. He sees your master's mark on Zippy and asks you to carry his lantern down "a little way". | **Olm's Lantern**, a relic that shows Wick-marks (below) and widens Zippy's light. |
| 2 | **Three wicks** *(point of no return)* | Floors 1–3, one per floor, each in a combat room | Find a **dead wick** (a tall iron brazier only the Lantern shows). Light it with **E**: the room locks and a **vigil** starts. The Gloom comes for the flame in waves, and you have to keep it lit for 25 s (it has health; moths and ghosts go for it, not you). | Each wick lit: a **Lantern Rite** (below). Lighting the first one closes the Rot road: "The lantern's light makes the black lily shut." |
| 3 | **The Reliquary** | Floor 2 or 3 | The Sealed Reliquary is no longer key-locked. Its door burns open for a lantern that has lit **two** wicks. Inside, the **Reliquary Warden** (a lair fight, §6) guards the Ember. | **The Ember.** |
| 4 | **Confession** | Floor 4 (the Sanctum is guaranteed on floor 4 if you carry the Ember) | Olm tells you the truth, in three short lines, and offers you a choice. **Forgive him:** he comes down with you. **Take his lantern:** he stays, and you take his flame. | Forgive: **Olm fights at your side on floor 5**: a huge slow ally who casts lantern-beams and shields you once per room. Take: **the Lamplighter's Staff**, the strongest spell upgrade in the game. |
| 5 | **The Kiln** | Floor 5 → 6 | Still the Heart. The Ember pulls you down to the Kiln. The Hollow Wizard (your master) is the last fight. If Olm came with you, he speaks to his friend between phases and in the end holds him while you set the Ember. | **THE FIRST FLAME.** If Olm came, he sits down in the Keeper's chair, and the last shot is the two lanterns side by side. If you took his flame, Zippy keeps the fire alone. |

### Lantern Rites: Zippy's build on this road

Zippy's cast (right-click) is the road's build axis. Each Rite is a
permanent change to it:

- **Rite of the Wick:** casts leave a burning line on the floor for 3 s.
- **Rite of Wax:** a cast that hits three or more enemies refunds half its mana.
- **Rite of the Keeper:** every fifth cast is a **Lantern Beam**: a
  piercing ray along the aim line, held for one second.

Rites stack with the spell items that already exist, so a Lantern run
leans on spells the way a Rot run leans on the frog.

---

## 3. The Rot road (KING OF THE BOG): Gribbus' pond goes bad

### The pitch

Something in the water down here is hungry, and Gribbus has been drinking
it. Feed it, and he grows into something that can eat the Heart.

### The chain

| # | Step | Where | What you do | What it gives |
|---|---|---|---|---|
| 1 | **Something in the water** | Any frog pond, floors 1–3 | Next to the three lily pads, a fourth is floating: black and oily, with veins. Choose the **Gloom Lily** instead of a trick. | **Rot I.** Gribbus is darker and wet-skinned with a third eye, and his licks spread rot (damage over time that spreads on death). **The pond corrupts for the rest of the floor:** black water, dead ferns, maggots instead of lotus. |
| 2 | **Feed him** *(point of no return)* | Floors 2–4 | Gribbus has a **Hunger** bar under his portrait. It fills only with **his** kills. At the next pond, if the bar is full he **molts**. | **Rot II** at the first molt (bigger, a split jaw, a second tongue). **Rot III** at the second (the Bloated: twice the size, a back crowded with pustules, and he swallows small enemies whole). The first molt closes the Lantern road: "Olm won't look at the frog any more." |
| 3 | **The Drowned Shrine** | Floor 3 (or the first floor after Rot II) | The shrine is no longer behind a locked door. When the corrupted pond on that floor is entered, Gribbus dives in, and the pond floor opens: **a stair down through the water.** The **Leech Mother** (a lair fight) is coiled around the crown. | **The Crown of the Bog.** |
| 4 | **Brood** | Floor 4 | Gribbus' kills on this floor hatch **rot-tadpoles** that fight for you. A third of the room turns to bog: slow for enemies, fine for frogs. | The road is ready. |
| 5 | **The Feast** | Floor 5 | The Gloom Forest is half drowned on this road. The Heart fight changes: the Heart tries to **eat Gribbus**, and you have to keep it from pulling him in. When the Heart is low, Gribbus swallows it. | **KING OF THE BOG.** The Keep fills with black water, every frog in the forest turns to face the throne, and Zippy is "royal wizard, by decree". The tone is played straight and grim, with one croak at the end. |

### The Gribbus build (on any road, but the Rot road needs it)

Today Gribbus deals about **a quarter** of Zippy's gun damage, whatever you
do. The build path makes it possible for Gribbus to be **the main source
of damage**, at a cost to Zippy.

- **Frog level.** Gribbus' own kills give him experience, and each
  frog level is +8% frog damage, shown as a small rank beside his
  portrait.
- **Build gravity.** Once you own two frog items, treasure rooms show one
  frog item among the choices, and a frog pond turns up on every floor.
- **New frog items** (in `items.js`, each with an icon):
  - *Bog Pact* (tier 3): Gribbus hits **twice as hard**; your shots hit 30% softer.
  - *Familiar's Due* (tier 2): every enemy *you* damage is marked, and Gribbus' next hit on it does double damage.
  - *Swallow* (tier 3): Gribbus swallows enemies under 15% health whole (not bosses).
  - *Hungry Tongue* (tier 1): a frog kill heals you 1.
  - *Sic 'Em* (an active): Gribbus leaps to the spot you aim at and slams down, dealing a huge hit in an area. On a frog build this is the button you press.
  - *Croaking Hex* (tier 2): your cast also makes Gribbus croak, chilling and drawing every enemy near him toward him (he becomes the tank).
- **Target numbers** (checked with `npm run power` extended to report the frog's share):
  - a plain run: the frog does 20–25% of the damage (as now);
  - three frog items by floor 3: about 50%;
  - Bog Pact plus Rot II: **60–75%**.

  The balance bot gets a "frog build" mode that always takes frog items,
  so the Rot road's difficulty can be measured like the others.

---

## 4. How the roads cross

- Both roads can be *begun*: carry Olm's Lantern *and* see the Gloom Lily.
- **Lighting the first wick** closes the Rot road: the black lily never
  shows again.
- **The first molt** closes the Lantern road: Olm's Sanctum is locked
  from the inside, and a note is pinned to the door.
- Neither started by floor 3: it's the Mission.
- Started but not finished (say, the Ember not found by floor 5): the
  Mission ending, with a line that remembers what you left undone.
- The Reliquary and the Shrine don't take keys any more. Keys stay for
  vaults, golden chests and the shop, where a key is a trade, not a fate.
- Every step done is saved between runs (in the `endings` meta), so the
  title screen's three sigils fill in as you learn the roads, and the
  journal's hints get clearer on later runs.

---

## 5. Puzzles: an honest look, and a rebuild

### What's wrong now

| Puzzle | Today | The problem |
|---|---|---|
| **Three doors** | a riddle with one answer; walk through the honest door | **You can see the answer.** Only the honest door has a closet. The pedestal's icon pokes above the wall, the HUD labels the pedestal through the wall, and shooting the doors gives the answer away. |
| **Braziers** | lights-out, by shooting | A row of five is trivial. Interacting by **shooting** flips several at once with one burst, so the result feels random. |
| **Push blocks** | sokoban onto plates | The best of the five, but the layouts are short, and one wedged block ends it. |
| **Chorus** | Simon says: shoot the mushrooms in the order they sang | It's four notes long, and multi-shot guns hit two mushrooms at once. |
| **Statues** | each shot turns a statue | It's the same as braziers, shots cause the same misfires, and there's no idea to work out. |

All of them reward a tier-2 chest and cost nothing to fail. None of them
asks for skill or thought.

### The rules for the rebuild

1. **E, not bullets.** Every puzzle piece is used with E: one press is one
   action, the piece being targeted glows, and a prompt names the action
   ("E: turn the mirror"). Shots pass through puzzle pieces.
2. **Something to work out.** The sign is a clue, not instructions. The
   rule is learned by watching what one action does.
3. **Something at stake.** Each puzzle has a budget (moves, time or
   mistakes). Going over it costs something fair: an ambush, a spore
   burst, or the reward dropping a tier.
4. **Harder deeper down**, and **better rewards**: a tier-2 chest on
   floors 1–2, tier 3 on floors 3+, and each puzzle solved without a
   mistake also gives a key.

### The five, rebuilt

- **The Liar's Doors** (was Three Doors). There are three doors with a
  stone face over each. Each face *says* one thing (on a plaque, read with
  E): "The treasure is not behind me." "The left face lies." On floor 1
  exactly one face lies. Deeper down, the statements point at each other
  (knights-and-knaves logic, generated and solver-checked to have exactly
  one answer). **Every door has a closet**, all three dark and identical.
  The pedestal isn't labelled through walls and doesn't show over them,
  and shots do nothing. Choose with E (held for half a second, so it's
  deliberate). A wrong door is a mimic chest and an ambush.
- **Embers** (was Braziers). There's a 3×3 grid on floors 1–2 and a 4×4
  grid deeper down. E on a brazier flips it and its neighbours.
  Candles on a stand count down the **move budget** (the optimal
  solution plus two). Run out and the braziers gutter, moths pour in, and
  the grid rescrambles. On floor 4 and below, some braziers carry a rune
  and flip in a *knight's-move* pattern instead, which the solver handles.
- **The Weighing Stones** (was Push). It's the same sokoban, but each layout
  is made by pulling the blocks *backwards* from a solved state, with a
  required minimum number of pushes (6 on floor 1, 14 on floor 5). The
  reset rune is used with E and costs half a heart, so getting stuck costs
  something, but never ends the puzzle.
- **The Choir** (was Chorus). The mushrooms sing a phrase, and you sing it
  back with E. It's three rounds, each one note longer (4–6 notes on
  floor 1, up to 6–8 on floor 5). On floor 4 and below, the sign says
  "back to front", and the reply is reversed. Each wrong note releases a
  spore burst (damage), and three wrong notes end it with the chest one
  tier lower.
- **The Mirror Hall** (was Statues). Light is the accent of the whole game,
  so this puzzle is about light. A shaft of cold light falls from a crack
  in the ceiling. Statues hold polished shields, and E turns one by 90°.
  Route the beam to the eye on the far wall. Deeper down there are more
  mirrors, coloured filters, and statues that turn together (turning one
  turns its neighbour). The beam is drawn live, so you can see what each
  turn does, and the generator checks every layout can be solved.

---

## 6. Lairs: mini-boss rooms

Each floor gets **one lair** (two on a floor with a jumbo room): a dead-end
room off the main path with a skull-and-chain mark over the door and on
the map. Going in locks it, a title card names the thing inside, and a
small health bar appears at the top of the screen. Beat it for a
guaranteed item from the lair pool, a key and a heal.

Lair bosses are **existing enemy rigs, made big** (×1.6–1.9) with a set
of two or three moves of their own, built from AI behaviours that already
exist (so the art budget goes to Olm and Gribbus, where it shows). They're
data in `data.js` (`DG.LAIRS`: base enemy, size, health, moves, title,
floors), spawned through `spawnEnemy` with a `mini` flag. A mini isn't a
boss, so it doesn't open the portal, but it gets most of a boss's
protections.

| Floor | Lair | Built on | Moves |
|---|---|---|---|
| 1 | **Skabb, the Gaoler** | brute | a hooked chain that drags you in; slams that drop cage bars, cutting the room in two for a few seconds |
| 2 | **The Spore-Cook** | bloater | boils a cauldron that bursts into poison puddles; rolls across the room; eats his own spores to heal unless you burst them first |
| 2–3 | **The Reliquary Warden** *(Lantern road)* | skeleton | a tower shield that blocks shots from the front, so you have to get round him; a shield bash; raises two skeletons when he's below half health |
| 3 | **The Leech Mother** *(Rot road)* | tentacle | sinks into pools and comes up under you; spits leeches that drain you; slow where the water is |
| 4 | **The Many-Eyed** | watcher | three eyes that each fire a different pattern, and each one blinks out when it's hit enough |
| 5 | **The Choir of Husks** | husk ×3 | three husks that share one health bar; when one is hit, the other two scream in a cone |

Road lairs only appear on their road. On other runs that floor gets a
lair from the plain list.

---

## 7. Building it, in phases

Each phase ends with `npm test` green, a regression test for each new
rule, and `npm run balance`, `npm run power` (and `npm run look` where it
changes the look) quoted before and after. A rebuilt single-file game
goes out after each phase.

1. **Puzzles and lairs.** E-interaction for every puzzle, the five
   rebuilt (the door leaks fixed first), the lair room type, and the six
   lair bosses. The journal page goes in, so far showing only the Mission.
2. **The Gribbus build.** Frog levels, build gravity, six frog items with
   icons, Sic 'Em, the frog's share reported by `npm run power`, and the
   bot's frog-build mode.
3. **The Rot road.** The Gloom Lily, Hunger and molts, Gribbus' Rot I–III
   models (with the hop fixed), the corrupted pond look, the dive to
   the Shrine, the Leech Mother, the floor-5 changes, and the new bog
   ending scene.
4. **The Lantern road.** Olm's new model and the Sanctum, the Lantern,
   wicks and vigils, the Rites, the Warden, the confession choice, Olm as
   an ally, and the Kiln ending in both versions.
5. **The Mission.** Roots and the Heart's phases, the climb out, the DAWN
   scene, the road locks, and the meta progress on the title screen.

---

## 8. As built

All five phases are in. Where the build differs from the plan above:

- **Sic 'Em** wasn't added as a new active. The existing **Frog Cannon**
  already launches Gribbus at your aim point, so it now hits as hard as
  he does instead (it scales with every frog multiplier).
- **Frog items:** Bog Pact is ×1.75, not ×2 (tuned with `npm run power`).
- **The Rot's hunger** needs 26 points for Rot II and 44 for Rot III (an
  enemy's worth is its cost). The **Drowned Shrine** turns up from floor 3
  on any floor where Gribbus is split and uncrowned, not only floor 3. The
  **"brood"** (rot-tadpoles from his kills) starts once he wears the crown,
  not only on floor 4. The half of the room that turns to bog wasn't built.
- **The bog ending** needs the crown plus Rot II. A crown alone is no
  longer an ending.
- **Rites:** the Rite of Wax is a flat quarter off the mana cost, not a
  refund on three hits. The Lamplighter's Staff makes every spell a beam,
  at half the mana.
- **Olm** finds you on floor 1 on about 60% of seeds (chosen by the seed,
  so it doesn't disturb the game's dice), otherwise on floor 2. Each wick
  gives one Rite in order (Wick, Wax, Keeper). The Reliquary appears on
  floors 2 and 3 for anyone carrying the lantern without the Ember.
- **Lairs:** the road lairs (the Warden and the Leech Mother) guard the
  Reliquary and the Shrine. They also turn up as ordinary lairs on their
  floors.
- **The Heart's roots:** a clean kill (no damage taken during the boss
  fight) trims the Heart's health by 10%, up to four, rather than
  removing a phase.
- **The climb out** is 96 tiles of shaft, with falling stone and the
  fleeing Gloom. It's about half a minute at a run.
- **Not built yet:** title-screen progress for each road's steps (the steps
  are saved in `meta.roads` already), and the Gloom Lily's "bog" terrain.
