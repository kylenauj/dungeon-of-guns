/* loads js/core into Node: the rules have no THREE and no DOM */
const path = require("path");
["core", "data", "items", "loot", "dungeon", "puzzles", "game", "combat", "gribbus", "roads", "ai"].forEach(f=> require(path.join(__dirname, "..", "js", "core", f + ".js")));
require(path.join(__dirname, "..", "tools", "bot.js"));
module.exports = globalThis.DG;
