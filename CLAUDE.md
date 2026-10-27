# Zippy & Gribbus (the repo is still dungeon-of-guns)

A real-time top-down roguelike (Zippy the hexhunter and Gribbus the toad, with spell-guns, in an Isaac-style dungeon, in a grimdark Dark Souls style) in plain JavaScript and three.js r128. There's no build step. It shares its asset kit and conventions with the user's other games, *Pine Hollow Rally* and *Gloom Shooter* (github.com/kylenauj/gloom-shooter).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Rules tests under `node --test`. Run before and after every change. |
| `npm run balance` | A bot plays full runs, no cheats. Quote it before and after any balance change. |
| `npm run look` | Screenshots floors 1, 3 and 5 and two gallery rows headless and measures them against the look contract (docs/ART_DIRECTION.md). Quote it before and after any change to the look. |
| `npm run power` | Rolls floor-4 builds and reports their power spread and peak shot count. Quote it before and after any change to items or combat numbers. |
| `npm start` | Serves the game on http://localhost:8080. Shortcuts: `?play&seed=WORD&floor=3&god`, plus `&boss=gibbet` (any `DG.BOSSES` key), `&lair=hound` (any `DG.LAIRS` id) , `&route=bog` (`bog`, `olm`, `ember` or `none`: the run's side road) and `&psx` (the PSX look: 240 lines, wobbling vertices, dithered 15-bit colour; P or the pause menu toggles it, and it's remembered). |

## Layout

- `js/core/` is the game, with no THREE and no DOM, so it runs under Node.
  - `data.js`: elements, reactions, guns, enemies, bosses, floors.
  - `items.js`: powerups, duos, ascensions, actives, boons, Gribbus' tricks, curses. `Items.build` turns what you own into `G.mods`.
  - `loot.js`: the wand and its stats. There's one weapon: Forms (`form:` items, `DG.WAND_FORMS`) reshape how it fires and stack; its element is whichever you've gathered most (`Game.wandElement`); it grows each floor (`DG.WAND_LEVEL`). Nothing drops guns.
  - `dungeon.js`: the generator.
  - `puzzles.js`: the five puzzle kinds.
  - `game.js`: the simulation (rooms, pickups, actives, Brother Olm). There are no levels: powerups come from bosses, lairs, shops and Olm.
  - `roads.js`: the side roads. A run gets at most one, by chance (the Ember, the Bog, Olm); see docs/ENDINGS.md §0.
  - `combat.js`: shots, triggers and payloads, statuses, reactions, hazards, allies.
  - `gribbus.js`: the frog, his pond, praise and the Mimic Toad. His tricks are items too (`f_*` in `items.js`).
  - `ai.js`: every enemy and boss.
- `tools/bot.js` is a pathfinding bot used by the tests, `npm run balance` and the title-screen attract mode.
- `js/render/` is three.js.
  - Everything solid uses one ink material (`K.ink` in `kit.js`), and `stage.js` runs one post pass. Keep new materials on `K.ink` / `K.toon` so the look stays consistent. The look is grimdark: no chibi proportions or cartoon eyes, muted earthy colours with light as the accent, and budgets of about 25k triangles per enemy, 35k for Zippy and 70k per boss (see docs/DESIGN.md §10).
  - Models are parts baked per rig (`models.js`). The mini-bosses (`Models.lair_<id>`, built at full size) and the newer floor bosses live in `js/render/rigs-*.js`, built from the kit in `Models.H`; each poses itself through `Models.MOVES[kind]` (called from `Models.creep` with the wind-up, the strike and the rest of the frame). `decor.js` builds the map dressing, and `vanity.js` adds view-only decals, mist, light shafts, critters and splats.
  - `?gallery` lines up every model; `?gallery&sil` draws them as flat black silhouettes.
  - `view.js` reads the game state and its event list; it never writes to the game.
- `js/ui/` holds `hud.js` (a canvas HUD), `menus.js` (DOM screens) and `icons.js` (`DG.Icons`: a procedural medallion for every item, active, frog trick and gun, used by the HUD, the satchel and the pedestals). A new item needs a glyph in `DG.Icons.ITEMS` (the tests check); `tools/icons.html` is the contact sheet.
- `docs/DESIGN.md` covers the design, the curves and the roadmap.

## Rules of the house

- **The game never waits on the view.** `Game.update(dt, input)` resolves everything and appends events to `G.events`. Keep it that way.
- **Core code never uses `Math.random`.** Use `G.rng`, so a seed replays the same dungeon and loot. The view can use `Math.random` for sparks.
- **New content goes in `data.js` or `items.js`.** New code is needed only for a new kind of effect (a new payload or special read in `combat.js`, a new AI behaviour).
- **Every logic bug that gets fixed gets a regression test** in `tests/rules.test.js`.
- **Balance is tuned one knob at a time**, with `npm run balance` numbers quoted before and after.
- **Don't edit `vendor/`.**
- **Every 2D canvas is drawn on the CPU:** `getContext("2d", { willReadFrequently:true })`. On the GPU, Chrome compiles a shader for each new kind of stroke, gradient or blend, and on Windows each one froze the game for seconds (a test checks).
