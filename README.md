# Dungeon of Guns

A top-down roguelike in the spirit of *The Binding of Isaac*. You're **Zippy**, a wizard who casts spells **through guns**, with **Gribbus** the frog hopping along beside you. The dungeon is dug fresh every run, and it gets spookier and weirder the deeper you go.

- **No slots, just powerups.** 127 passive items stack on everything. Some are godly, and some are just weird: Rubber Chicken, Portal Pockets, Loaded Dice, a Haunted Gun, bees. Ricochet + Frost Rounds + Crystal Growth + Wispcraft makes every bounce grow an icicle that releases an ice wisp. Items fire triggers (on hit, on kill, on bounce, on hurt...) into payloads that can trigger further, three deep. There are 12 **duos**, 5 gun **ascensions** and 15 **active items** (F).
- **Transformations.** Three items from a set turn Zippy into a Pyromancer, Ice Lich, Storm Lord, Plague Doctor, Gardener, Goldfinger, Frog Prince or Goofball.
- **Zippy wears what he carries.** A fire item turns his cape red, a legendary one his whole robe. Vine items wind vines round him. Goggles, a beehive, a rubber chicken in the hat band, a halo, a Gribbus hood: about 40 items change how he looks.
- **Elements react.** Arcane, fire, frost, poison and shock leave byproducts (icicles, flames, puddles, sparks, runes) and combine into Steam, Conduct, Brittle Rot and more.
- **Gribbus** licks, spits and croaks on his own. **Frog ponds** teach him new tricks, and **golden flies** unlock rarer ones for every future run.
- **Level-ups** offer a choice of three boons. **Active items** charge as you clear rooms (`F`).
- **From castle to Gloom Forest:** the Castle Keep, the Undercroft, the Rotting Crypt, the Gloomwood Edge and the Gloom Forest. The Gloom (from *Gloom Shooter*) eats more of the castle every floor, until by floor 5 it's a spooky mushroom forest. Each floor has its own enemies (goblins, shroom folk, ghosts, skeletons, watchers, blobs, tentacles, and the Gloom's rotlings, mould spitters, bloaters and blight husks), its own decor and its own boss: Grubnok the Goblin King, the Morel Matriarch, the Weeping Bride, the Eye Below and the Gloom Heart.
- **Rooms:** jumbo rooms, shops, treasure rooms, frog ponds, cursed altars, secret rooms behind **illusionary walls**, and five kinds of **goofy puzzle** (painted doors, braziers, push-blocks, the mushroom chorus, turning statues).

The look is "lantern ink": dithered, banded light with ink hatching in the shadows, ink outlines on everything, and a colour grade per floor. The deeper floors make the picture itself swim. All art and sound are generated in code, built on the asset kit from *Pine Hollow Rally* and *Gloom Shooter*. See the [design doc](docs/DESIGN.md) for the game loop, the difficulty and loot curves, and the roadmap.

## Run it

There's no build step. Serve the folder and open it:

```sh
npm start                 # http-server on http://localhost:8080
# or: python3 -m http.server 8080
```

URL shortcuts for testing: `?play` (skip the title), `?seed=WORD`, `?floor=3`, `?god`. Add `?gallery` to see every model lined up (WASD pans, the wheel zooms, 1-5 switch the floor lighting).

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
| `M` / `P` / `V` | Sound / chunky pixels / ink look on or off |

Gamepad: left stick moves, right stick aims, RT shoots, LT casts, A blinks, X uses, B fires the active item, Y swaps, RB opens the satchel.

## Develop

```sh
npm test                  # the rules, under Node (dungeon, combat, rooms, puzzles, loot, a bot playthrough)
npm run balance           # a bot plays full runs with no cheats and reports how far it gets
npm run power             # rolls 40 floor-4 builds and reports how strong (and how varied) they are
```

- `js/core/` is pure logic, with no THREE and no DOM.
- Content lives in `js/core/data.js` (enemies, bosses, floors) and `js/core/items.js` (powerups, duos, boons, actives, Gribbus' tricks).
- `vendor/three.min.js` is three.js r128 (MIT).
