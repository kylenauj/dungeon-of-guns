# Dungeon of Guns

A real-time top-down roguelike (Zippy the wizard and Gribbus the frog, with spell-guns, in an Isaac-style dungeon) in plain JavaScript and three.js r128. There's no build step. It shares its asset kit and conventions with the user's other games, *Pine Hollow Rally* and *Gloom Shooter* (github.com/kylenauj/gloom-shooter).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Rules tests under `node --test`. Run before and after every change. |
| `npm run balance` | A bot plays full runs, no cheats. Quote it before and after any balance change. |
| `npm run power` | Rolls floor-4 builds and reports their power spread and peak shot count. Quote it before and after any change to items or combat numbers. |
| `npm start` | Serves the game on http://localhost:8080. Shortcuts: `?play&seed=WORD&floor=3&god`. |

## Layout

- `js/core/` is the game, with no THREE and no DOM, so it runs under Node.
  - `data.js`: elements, reactions, guns, enemies, bosses, floors.
  - `items.js`: powerups, duos, ascensions, actives, boons, Gribbus' tricks, curses. `Items.build` turns what you own into `G.mods`.
  - `loot.js`: guns and stats.
  - `dungeon.js`: the generator.
  - `puzzles.js`: the five puzzle kinds.
  - `game.js`: the simulation (rooms, pickups, levelling, actives).
  - `combat.js`: shots, triggers and payloads, statuses, reactions, hazards, allies.
  - `gribbus.js`: the frog and frog ponds.
  - `ai.js`: every enemy and boss.
- `tools/bot.js` is a pathfinding bot used by the tests, `npm run balance` and the title-screen attract mode.
- `js/render/` is three.js.
  - Everything solid uses one ink material (`K.ink` in `kit.js`), and `stage.js` runs one post pass. Keep new materials on `K.ink` / `K.toon` so the look stays consistent.
  - Models are parts baked per rig (`models.js`). `decor.js` builds the map dressing, and `vanity.js` adds view-only decals, mist, light shafts, critters and splats.
  - `?gallery` lines up every model.
  - `view.js` reads the game state and its event list; it never writes to the game.
- `js/ui/` holds `hud.js` (a canvas HUD) and `menus.js` (DOM screens).
- `docs/DESIGN.md` covers the design, the curves and the roadmap.

## Rules of the house

- **The game never waits on the view.** `Game.update(dt, input)` resolves everything and appends events to `G.events`. Keep it that way.
- **Core code never uses `Math.random`.** Use `G.rng`, so a seed replays the same dungeon and loot. The view can use `Math.random` for sparks.
- **New content goes in `data.js` or `items.js`.** New code is needed only for a new kind of effect (a new payload or special read in `combat.js`, a new AI behaviour).
- **Every logic bug that gets fixed gets a regression test** in `tests/rules.test.js`.
- **Balance is tuned one knob at a time**, with `npm run balance` numbers quoted before and after.
- **Don't edit `vendor/`.**
