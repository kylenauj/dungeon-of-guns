# Art direction: from cozy to dread

A strategy for making Zippy & Gribbus look frightening, Souls-like and like nothing else. It's based on screenshots of floors 1, 3 and 5 and every row of `?gallery`, taken October 2026 at commit `aeb493e`.

---

## 1. Diagnosis: why it still reads as Mario

The last few passes (ink, grime, etched) were **filters laid over cute content**. A filter can change how a shape is drawn. It can't change what the shape is. Six things give away the cozy read, roughly in order of how much they hurt:

| # | What gives it away | Where we saw it |
|---|---|---|
| 1 | **Round shapes.** Most enemies are a sphere with legs: rotling, spitter, bloater, husk, blob, blobling, shroomkin, shroomlet. Gribbus is a round gold coin. The brute has a teddy-bear face with round ears. Round means friendly, everywhere. | `K.lump` (icosahedra) is the base of most bodies |
| 2 | **Toy proportions.** Heads are about a third of body height (goblins, shaman, Zippy's hat and head). Adult proportion is 1/7 to 1/8. Large heads read as children and mascots. | goblin and Zippy rigs in `models.js` |
| 3 | **Candy colours.** The plum robe *with gold stars*, the gold toad, lime glows, the pink bloater, the yellow-green "map" floor on 3, magenta and yellow on 5, the orange READ ME sign, the green felt dice table. Saturated, clean hues are the Nintendo palette. | `ROBES` in `models.js:240`, floor themes in `data.js`, GLOOM floor shader in `kit.js` |
| 4 | **A toy-box camera.** A high, distant camera over waist-high walls (`K.WALL_H = 1.7`), lit end to end, makes a **tilt-shift miniature**: the figures look like figurines on a board. The "diorama" read is the main reason it feels cozy. | `stage.js` rig `dist:19, pitch:0.93` |
| 5 | **Comic gore and fairy dust.** Blood is bright red (`0xff2a3a`) round splats with radial droplets, plus red "X" strokes: sticker gore. Glowing cyan and white motes drift everywhere (up to 30 a room on floor 5), which reads as fireflies or Ori. | `fx.js:296`, `CELL.splat` in `vanity.js`, `motes` per biome |
| 6 | **A pattern, not a place.** The etched wall-top hatching reads as zebra-print fabric. The rot patches with ink coastlines and white sine veins on floor 3 read as a board-game map. Each is clever on its own, but together they're *decorative*, and decoration is the opposite of dread. | `inkPoche`, `GLOOM_GROUND` in `kit.js` |

Underneath all six: **nothing casts a shadow** (no shadow maps anywhere in `js/`), and nothing is hidden. Fear comes from what you can't see.

---

## 2. The direction: "Ash & Ember"

One sentence to judge every asset against:

> **The world is ash, bone and soot, drawn in black ink; only fire, souls, spells and fresh blood have colour, and the dark is truly black.**

Why this direction:
- **It's ours.** It builds on the engraving work already in the engine instead of throwing it away. Few 3D action games commit to a near-monochrome printmaking world with colour only from light. Return of the Obra Dinn did it in 1-bit, Mundaun in pencil, MadWorld in black and white with red. Nobody has done it as Souls-style gothic. That gap is what makes it unique.
- **It's Souls.** Dark Souls is about 90% desaturated umber and grey, and the bonfire is the most colourful thing on screen. Our version pushes that further, into a print.
- **It helps the game play.** If colour belongs only to light and magic, your shots, enemy shots and pickups are automatically the most readable things on screen.

What we stop doing: the purple-shadow grade, cyan motes, saturated floor rot, any albedo with strong colour, any primary form that's a sphere.

---

## 3. The rules (the "look contract")

These turn taste into checkable numbers. Put them in DESIGN.md §10 once agreed.

**Colour**
1. **Surface colours are capped at 25% saturation** (HSL). That covers walls, floors, props, skin, cloth and armour. Value range 0.04–0.55. Hue family: umber, ash, bone, rust, verdigris, dried-blood brown.
2. **Colour above 25% is only allowed on emissive things**: fire, embers, souls, spell shots, eyes, fresh blood, pickups.
3. **One accent hue per floor** (castle: ember orange; undercroft: sickly sodium yellow; crypt: soul blue; gloomwood: cold moon white; forest: bile green). Everything else stays neutral.
4. **No purple, pink, lime or gold surfaces.** Gold becomes tarnished brass (`0x5a4a2a`-ish) that only shines where lit.

**Shape**
5. **No sphere as a primary form.** Bodies are built from elongated, faceted, tapering forms: lathe profiles, extruded shards, swept tubes. Lumps are fine for warts and growths, not for torsos.
6. **Humanoids are at least 2.2× taller than wide; heads at most 1/6 of height.** Hunch them: shoulders forward, heads low, arms past the knee.
7. **Break the symmetry.** Every model gets at least one asymmetric feature: a missing arm, a broken horn, a cowl torn on one side, a growth on one shoulder.
8. **Edges are sharp or ragged, never rounded off.** Hems tatter (`K.tatter`), plates chip, bones splinter.

**Light**
9. **Beyond the light radius is black**, not grey or "paper". On a typical room, at least 35% of the screen should be within 10% of black.
10. **Every room has one dominant light and real shadows.** The lantern casts.

**Gore and particles**
11. **Blood is near-black brown when it lands** (`0x1e0606`–`0x3a0a08`), red only in the first instant in the air, wet-glossy under light, and directional (sprayed along the hit, never radial).
12. **Particles fall, they don't float.** Ash and soot drift down. Only embers rise, and only near fire. No drifting glowing motes.

---

## 4. The plan, in order of impact per hour

Each phase stands alone and can be judged in `?gallery` and on floors 1, 3 and 5 before going on.

### Phase 1: Palette lock and true dark (biggest win, about a day) — done
**Done.** `npm run look`, rooms average, before → after: strongly coloured pixels **6.4% → 1.7%** (floor 3: 6.5 → 0.3, floor 5: 3.5 → 0.4), mean saturation 34.9 → 28.4, near-black 53.5% → 60.8%. What changed: `K.INK.uSatCap` (0.24) caps every ink surface, with `{ vivid:true }` for loot; past the light's edge the etching is solid ink; wall tops are dark; the moon fill and ambient dropped and torch reach went from 11 to 8, so rooms are pools of light; the lantern is pale, so the torches carry each floor's one accent (ember, sodium, soul blue, moon white, bile green); rot and bark are black and grey-brown, not violet and salmon; moss edges are soft, not map coastlines; motes are falling ash; Zippy's arcane robe is ash with faded runes, Gribbus bog-umber, the bloater and blobs dead grey-green.

- **Clamp albedo saturation in the ink material**, not by hand: in `INK_MAIN` (`kit.js`), desaturate `diffuseColor` toward its luminance down to the 25% cap, unless the fragment is emissive. That one line drains every robe, toad and bloater at once. Then fix the few models that need a real hue by hand.
- **Recolour the worst offenders:** Zippy's arcane robe goes to ash-grey with soot-black and **no stars**. The purple lives only in the staff's glow and the spell. Gribbus becomes mottled olive-umber with one wet sheen, and the gold goes into his eyes. Bloater: grey-green dead flesh. Floors 3 and 5: the rot goes to desaturated olive-black and violet-black, without the bright fills.
- **Make the dark black:** drop the hemisphere light to about 0.15 on etched, set `scene.background` and fog to pure `0x000000`-ish, and stop the etching's "paper" tone in shadow. Hatching then only appears in the **band between light and dark** (the terminator), and full shadow is solid ink. That's how a woodcut works, and it gets rid of the zebra look.
- **Kill the motes.** Replace `motes` with falling ash (grey, unlit, slow, downward, a few at a time). Keep embers only near braziers.
- **Remove the purple shadow tint** (`uShade 0x2a1838`) and use a cold near-black instead.

### Phase 2: Camera, scale and architecture (about 2 days) — mostly done
**Done:** walls 1.7 → 2.6 (`K.WALL_H`); the camera is lower and closer (`dist` 19 → 15.5, `pitch` 0.93 → 0.84, FOV 36 → 34), so figures are about 30% bigger, and it eases back in a fight (×1.08, ×1.15 in a big arena, ×1.22 for a boss) so the arena still fits; any wall or column between Zippy and the camera opens in an ordered dither around him (`K.GLOOM.uSeeP`), keeping its plinth so the line of the wall still reads. `npm run look`: near-black 60.8% → 44.1% only because the room now fills more of the frame; strongly coloured pixels stay at 1.3%. **Not yet:** foreground chains and arches, pits into black.

- **Taller walls:** `K.WALL_H` from 1.7 to about 3.2, with wall tops lost in darkness (no top cap visible, so the hatched "map" tops go away). Rooms become halls, not boxes.
- **Lower, closer camera:** `dist` 19 → about 14, `pitch` 0.93 → about 0.78, FOV 36 → about 30. Figures get bigger and the miniature read goes away. Check the full room still fits for gameplay. If not, have the camera pull back only in fights.
- **Foreground occluders:** pillars, arches, hanging chains and cages between the camera and the floor, faded out near the player (a dither fade, so they never block a fight). Depth in the foreground is the quickest way to make a top-down view feel like a place.
- **Pillars and buttresses** along long walls, and broken floor that drops into black pits.

### Phase 3: Shadows (about 1 day, the scariest change) — done
**Done:** Zippy's lantern casts (a 512 cube shadow, PCF). Every ink surface takes its shadow; walls, columns, enemies, Gribbus and every baked prop throw one; Zippy and his gun don't. If frames stay slow at the lowest adaptive resolution the shadows switch themselves off, and the pause menu has a SHADOWS toggle (remembered).

- **One shadow-casting light: Zippy's lantern** (a point-light cube shadow at low resolution, 256–512), plus the boss arena's main light. Everything else stays unshadowed. Shadows of enemies stretching toward you from the edge of the light are the single most Souls moment we can add.
- If the cube shadow costs too much on low-end machines, fall back to **projected stretched blob shadows** that point away from the lantern.

### Phase 4: Silhouettes, rebuilt in order of screen time (about 1–2 weeks)
Start with a **silhouette test**: render every gallery model in flat black on bone-white (a `?gallery&sil` switch). If a model is cute as a black shape, no shader will save it.

| Model | Today | Target |
|---|---|---|
| **Zippy** | round robe, tall curled hat with stars, staff | tall, gaunt hexhunter: a **wide-brimmed pilgrim hat or drooping torn cowl** (no curl), long ragged greatcoat to the ankles, a lantern on a hook at the hip, face hidden except two pinpoint eyes, gun held low |
| **Gribbus** | round gold toad | a **bigger, heavier, leaner bog-toad**: flat skull, ridged spine, a split lip, slitted gold eyes, warts that weep, a cracked bell on a string. Hunched, never round. Keep him endearing through *behaviour*, not shape. |
| **Goblins** | big heads, short limbs | **hollowed scavengers**: small heads low between the shoulders, too-long arms, ribs showing, rag masks, crude iron. The brute becomes a hunched executioner with a cage-helm, not a bear. |
| **Gloom (rotling, spitter, bloater, husk)** | balls with legs | **things that used to be people**: a ribcage with a sac growing out of it (bloater), a crawling torso on fungal stalks (rotling), a husk standing still with a split skull blooming spores |
| **Shrooms** | ladybird domes | **cordyceps victims**: stalks bursting from a slumped body, caps torn and drooping |
| **Weird (watcher, blob)** | cute eyeball octopus, green jelly | watcher: an eye in a **knot of flesh and fingers**; blob: a **translucent mass with bones suspended in it** |
| **Bosses** | strong ideas, too clean and too colourful | keep the concepts. Grey down, add scale (they should fill a third of the screen), and give each one an entrance pose. |

Use the existing tools (`K.slathe` for profiles, `K.tatter` for hems, `K.sculpt` for flesh) and keep to the triangle budgets. Add one new primitive: **`K.shard`**, a faceted, tapering, slightly bent extrusion. It's the anti-lump, for limbs, horns, spines and armour plates.

### Phase 5: Gore, hits and death (about 2 days)
- Blood as described in rule 11: directional sprays decaled along the hit direction, wet gloss under the lantern, darkening to brown over about 10 seconds. Delete the round `splat` cell and the red "X" strokes.
- **Hit feedback through weight, not volume:** a 40–60 ms hit-stop on heavy hits, a white-orange spark, a deep thud. Souls hits feel heavy because of the freeze frame, not the gore.
- **Deaths:** the body slumps and stays a moment, then crumbles to ash that falls, with a faint soul wisp (the one coloured thing) drifting to Zippy.

### Phase 6: Props and the details that break tone (about 2 days)
- **READ ME sign** → a message **scrawled in glowing script on the floor**, the Souls messages players already know.
- **Dice altar** (green felt) → a stone slab with bone dice and a black cloth.
- **Golden chests** → iron-bound coffers, gold only showing through the gap of the lid.
- **Barrels, pots, crates** → slimmer, cracked, stained, sitting in pools of old wax or blood.
- **Costumes:** the *Goofball* set (chicken, bubblegum, spaghetti, disco) and names like *Pinball Wizard* and *Bubble Blower* undercut the tone more than any model. Decide whether they stay as one deliberate joke or get grim versions. This is a content call for you, not an art call.

### Phase 7: The signature pass (about 3 days, after phases 1–4)
Once the content is right, replace the stacked post effects with **one designed pass** that makes a frame recognisable from a thumbnail:
- **Woodcut terminator:** the hatching band between light and dark, black beyond it (from phase 1).
- **Bone-white highlights:** the brightest lit surfaces go to warm ivory, not white.
- **Ember bleed** instead of round bloom: fire and spells bleed **upward** a little, like heat, with a faint heat-haze ripple above braziers.
- **Ink-wash edges** stay. The film grain goes. The "swim" on deep floors stays but is used sparingly, at boss arenas and the Gloom's edge.

---

## 5. How we'll know it worked

Add a **look check** next to `npm run balance`: `npm run look` screenshots floors 1, 3 and 5 and the gallery with headless Chromium (Playwright is already on the machine), then reports:
- **% of pixels near black** (target ≥ 35% on a room)
- **% of saturated pixels that aren't emissive** (target < 3%)
- **average screen height of Zippy** (target about 2× today's)
- a **silhouette sheet** of every model, for a by-eye check

Quote the numbers before and after each phase, the same way balance changes are quoted.

The by-eye test: **turn the screenshot greyscale and squint.** If it still looks like a cozy game, it's the shapes. If it only looks cozy in colour, it's the palette.

---

## 6. Reference board

- **Dark Souls / Bloodborne:** desaturated umber, a single warm light, hunched silhouettes, long coats and wide hats
- **Blasphemous:** gothic Spanish iconography, gore that is reverent rather than splattery
- **Darkest Dungeon:** heavy ink, a torchlight radius that sets the mood, near-black outside it
- **Return of the Obra Dinn, Mundaun:** a print or drawing as the whole rendering style, not an overlay
- **Gustave Doré's engravings, Dürer's woodcuts, Zdzisław Beksiński's paintings:** the target for hatching, black and the forms of the Gloom
