# Dungeon of Guns

A real-time top-down roguelike (a wizard with spell-guns versus goblins) in plain JavaScript and three.js r128. There's no build step. It shares its asset kit and conventions with the user's other games, *Pine Hollow Rally* and *Gloom Shooter* (github.com/kylenauj/gloom-shooter).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Rules tests under `node --test`. Run before and after every change. |
| `npm run balance` | A bot plays full runs, no cheats. Quote it before and after any balance change. |
| `npm start` | Serves the game on http://localhost:8080. Shortcuts: `?play&seed=WORD&floor=3&god`. |

## Layout

- `js/core/` is the game, with no THREE and no DOM, so it runs under Node.
  - `data.js`: all content.
  - `loot.js`: guns, runes, relics, stats.
  - `dungeon.js`: the generator.
  - `game.js`: the simulation.
  - `ai.js`: the goblins.
- `tools/bot.js` is a pathfinding bot used by the tests, `npm run balance` and the title-screen attract mode.
- `js/render/` is three.js. `view.js` reads the game state and its event list; it never writes to the game.
- `js/ui/` holds `hud.js` (a canvas HUD) and `menus.js` (DOM screens).
- `docs/DESIGN.md` covers the design, the curves and the roadmap.

## Rules of the house

- **The game never waits on the view.** `Game.update(dt, input)` resolves everything and appends events to `G.events`. Keep it that way.
- **Core code never uses `Math.random`.** Use `G.rng`, so a seed replays the same dungeon and loot. The view can use `Math.random` for sparks.
- **New content goes in `data.js`.** New code is needed only for a new kind of effect (a rune flag read in `game.js`, a new AI behaviour).
- **Every logic bug that gets fixed gets a regression test** in `tests/rules.test.js`.
- **Balance is tuned one knob at a time**, with `npm run balance` numbers quoted before and after.
- **Don't edit `vendor/`.**
