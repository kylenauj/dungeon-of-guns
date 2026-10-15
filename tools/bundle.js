/* Builds one self-contained HTML file (dist/zippy-and-gribbus.html) with the
   CSS, three.js and every script inlined, so the game runs by double-clicking
   it: no server needed. Run: npm run bundle */
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
let html = fs.readFileSync(path.join(root, "index.html"), "utf8");
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (m, href)=> "<style>\n" + fs.readFileSync(path.join(root, href), "utf8") + "\n</style>");
html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src)=>
  "<script>/* " + src + " */\n" + fs.readFileSync(path.join(root, src), "utf8").replace(/<\/script/gi, "<\\/script") + "\n</script>");
fs.mkdirSync(path.join(root, "dist"), { recursive:true });
const out = path.join(root, "dist", "zippy-and-gribbus.html");
fs.writeFileSync(out, html);
console.log(out, (fs.statSync(out).size/1024).toFixed(0) + " KB");
