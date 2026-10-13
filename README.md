# Dungeon of Guns

A top-down roguelike in the spirit of *The Binding of Isaac*. You're **Zippy**, a wizard who casts spells **through guns**, with **Gribbus** the frog hopping along beside you. The dungeon is dug fresh every run, and it gets spookier and weirder the deeper you go.

- **No slots, just powerups.** 107 passive items stack on everything, and some are godly. Ricochet + Frost Rounds + Crystal Growth + Wispcraft makes every bounce grow an icicle that releases an ice wisp. Items fire triggers (on hit, on kill, on bounce, on hurt...) into payloads that can trigger further, three deep. There are 8 **duos** and 5 gun **ascensions**.
- **Elements react.** Arcane, fire, frost, poison and shock leave byproducts (icicles, flames, puddles, sparks, runes) and combine into Steam, Conduct, Brittle Rot and more.
- **Gribbus** licks, spits and croaks on his own. **Frog ponds** teach him new tricks, and **golden flies** unlock rarer ones for every future run.
- **Level-ups** offer a choice of three boons. **Active items** charge as you clear rooms (`F`).
- **Five floors:** the Goblin Cellars, the Mushroom Grotto, the Haunted Crypt, the Weird Below and the Hollow Heart. Each has its own enemies (goblins, shroom folk, ghosts, banshees, skeletons, watchers, blobs, tentacles), its own decor and its own boss: Grubnok the Goblin King, the Shroom Matriarch, the Weeping Bride, the Eye Below and the Hollow Heart.
- **Rooms:** jumbo rooms, shops, treasure rooms, frog ponds, cursed altars, secret rooms behind **illusionary walls**, and five kinds of **goofy puzzle** (painted doors, braziers, push-blocks, the mushroom chorus, turning statues).

All art and sound are generated in code, built on the asset kit from *Pine Hollow Rally* and *Gloom Shooter*. See the [design doc](docs/DESIGN.md) for the game loop, the difficulty and loot curves, and the roadmap.

## Run it

There's no build step. Serve the folder and open it:

```sh
npm start                 # http-server on http://localhost:8080
# or: python3 -m http.server 8080
```

URL shortcuts for testing: `?play` (skip the title), `?seed=WORD`, `?floor=3`, `?god`.

`npm run bundle` builds `dist/dungeon-of-guns.html`, a single file that runs by double-clicking it.

## Controls

| | |
|---|---|
| `WASD` | Move |
| Mouse | Aim |
| Left click | Shoot |
| Right click | Cast the gun's spell (costs mana) |
| `Space` | Blink: dodge through shots and over pits |
| `E` | Open, take, buy, read |
| `F` | Use your active item |
| `R` | Reload |
| `Q` / wheel / `1`–`3` | Switch guns |
| `Tab` | Satchel: guns, powerups, boons, Gribbus |
| `1`–`3` on level-up | Pick a boon |
| `Esc` | Pause |
| `M` / `P` | Sound / chunky pixels |

Gamepad: left stick moves, right stick aims, RT shoots, LT casts, A blinks, X uses, B fires the active item, Y swaps, RB opens the satchel.

## Develop

```sh
npm test                  # the rules, under Node (dungeon, combat, rooms, puzzles, loot, a bot playthrough)
npm run balance           # a bot plays full runs with no cheats and reports how far it gets
```

- `js/core/` is pure logic, with no THREE and no DOM.
- Content lives in `js/core/data.js` (enemies, bosses, floors) and `js/core/items.js` (powerups, duos, boons, actives, Gribbus' tricks).
- `vendor/three.min.js` is three.js r128 (MIT).
