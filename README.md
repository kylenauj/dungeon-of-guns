# Dungeon of Guns

A top-down roguelike dungeon crawler. You're a wizard who casts spells **through guns**, in a goblin dungeon that's dug fresh for every run.

- Five gun types (pistol, SMG, shotgun, rifle, launcher) × five elements (arcane, fire, frost, poison, shock). Every shot carries its element, and right-click casts the element's spell through the gun.
- Sixteen **runes** to socket into guns, like **Plague Spreader** (poison jumps from goblin to goblin), Ricochet, Splitter, Wildfire and Conductor.
- **Procedural floors:** room layouts, furniture, traps, goblin waves, a shop, a treasure room, a puzzle room, a secret room behind an **illusionary wall**, and a boss.
- **Goofy puzzles:** painted doors you bonk into, a three-doors riddle from "A Totally Honest Goblin", lights-out braziers.
- **Goblins:** grunts, slingers, bombers, shamans, brutes, sneaks, elite affixes, and **Grubnok the Goblin King**.
- Five floors that keep getting meaner. Your old gun won't keep up, so **loot is how you get stronger**.

All art and sound are generated in code, built on the asset kit from *Pine Hollow Rally* and *Gloom Shooter*. See the [design doc](docs/DESIGN.md) for the game loop, the difficulty and loot curves, and the roadmap.

## Run it

There's no build step. Serve the folder and open it:

```sh
npm start                 # http-server on http://localhost:8080
# or: python3 -m http.server 8080
```

URL shortcuts for testing: `?play` (skip the title), `?seed=WORD`, `?floor=3`, `?god`.

## Controls

| | |
|---|---|
| `WASD` | Move |
| Mouse | Aim |
| Left click | Shoot |
| Right click | Cast the gun's spell (costs mana) |
| `Space` | Blink: dodge through shots and over pits |
| `E` | Open, take, buy, read |
| `R` | Reload |
| `Q` / wheel / `1`–`3` | Switch guns |
| `Tab` | Bag: move runes between guns |
| `Esc` | Pause |
| `M` / `P` | Sound / chunky pixels |

Gamepad: left stick moves, right stick aims, RT shoots, LT casts, A blinks, X uses, Y swaps, RB opens the bag.

## Develop

```sh
npm test                  # the rules, under Node (dungeon, combat, rooms, puzzles, loot, a bot playthrough)
npm run balance           # a bot plays full runs with no cheats and reports how far it gets
```

- `js/core/` is pure logic, with no THREE and no DOM.
- All content lives in `js/core/data.js`.
- `vendor/three.min.js` is three.js r128 (MIT).
