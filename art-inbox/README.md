# Art inbox

Drop art here, raw, exactly as you bought or made it. Claude picks it up from
here, converts it into small game-ready files under `assets/`, and wires it into
the game. You don't need to rename, resize or convert anything.

## Where things go

| Folder | What | Good formats |
|---|---|---|
| `characters/` | Zippy, Gribbus, enemies, bosses (models, their textures, animations) | `.glb` / `.gltf` best; `.fbx`, `.obj`, `.blend` fine |
| `environment/` | Dungeon kit: walls, floors, arches, pillars, stairs, doors | same as above |
| `props/` | Barrels, chests, corpses, candles, chains, cages, rubble | same as above |
| `textures/` | Material sets: stone, wood, metal, cloth, bone (colour, normal, roughness...) | `.png`, `.jpg`, `.tga`, `.exr` |
| `fx/` | Sprites and flipbooks for fire, smoke, blood, magic | `.png` |
| `reference/` | Screenshots or pictures of the look you want | anything |

Not sure where something goes? Put it in the top of `art-inbox/`. A whole
asset pack as one `.zip` is fine too.

**Licences:** for anything bought or downloaded, add the licence file, or a
short `.txt` saying where it came from (the shop's page link is enough).
The game ships on the web, so the licence must allow use in a web game.

## How to upload (on the GitHub website)

1. Open the repo on github.com and switch the branch dropdown (top left of the
   file list) to **`claude/game-dark-souls-aesthetic-8ikzdw`**.
2. Click into `art-inbox/`, then the folder you want (e.g. `characters/`).
3. **Add file → Upload files**, drag the files (or a whole folder) in, then
   **Commit changes**.

Limits on the website: **25 MB per file** and up to **100 files per upload**.
Do several uploads if you have more.

**A file over 25 MB** (a big zip, a 4K texture set): use **GitHub Desktop**
(desktop.github.com), which takes files up to **100 MB** each. Or split the
zip into parts under 25 MB. Anything over 100 MB: split it, or upload the
pieces you actually want rather than the whole pack.

Uploaded to the main branch by accident? That's fine too, just say so.
