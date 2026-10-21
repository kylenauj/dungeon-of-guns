/* ------------------------------------------------------------------ *
 *  The kit converter (npm run kit): turns the FBX models dropped into
 *  art-inbox/ into js/render/kitdata.js, a compact script the game loads
 *  like any other (so there is still no build step, and the single-file
 *  bundle still works).
 *
 *  For each model listed in MODELS below:
 *  - its meshes are merged, centred on x/z, stood on y = 0 and scaled to
 *    the size given (game units: a floor tile is 1);
 *  - every vertex gets a material class from its FBX material's name
 *    (pierre = stone, bois = wood, fer = iron, terre = clay, rouge = cloth,
 *    emission = flame, verre = glass, metal = gem), and the kit's own flat
 *    colours are thrown away: the game shades each class itself (kit.js);
 *  - duplicate vertices are welded, then positions are packed to 16 bits,
 *    normals to 8, and the lot written as base64.
 *
 *  Needs the dev dependency three@0.128.0 (npm install) for its FBXLoader.
 * ------------------------------------------------------------------ */
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, ".."), INBOX = path.join(ROOT, "art-inbox"), OUT = path.join(ROOT, "js", "render", "kitdata.js");
global.THREE = require("three"); global.window = global; global.self = global;
const ex = f=> vm.runInThisContext(fs.readFileSync(path.join(ROOT, "node_modules/three/examples/js", f), "utf8"));
ex("libs/fflate.min.js"); ex("loaders/FBXLoader.js");
// some packs point at texture files that weren't shipped (or need a browser): never load them,
// the game shades by material class anyway
THREE.TextureLoader.prototype.load = function(){ return new THREE.Texture(); };
const _warn = console.warn; console.warn = (...a)=>{ if(!/not supported in three\.js/.test(a[0])) _warn(...a); };

/* name: [file, size, which axis the size is for ("h" height, "w" largest width, "l" largest of all),
   and for packs with one baked material per model: what it's mostly made of] */
const MODELS = {
  barrel:   ["props/barrel.fbx", 0.66, "h"],
  crate1:   ["props/woodbox.fbx", 0.6, "h"],
  crate2:   ["props/woodbox_001.fbx", 0.6, "h"],
  crate3:   ["props/woodbox_002.fbx", 0.6, "h"],
  crate4:   ["props/woodbox_003.fbx", 0.6, "h"],
  vase:     ["props/vase.fbx", 0.62, "h"],
  urn:      ["props/vase_001.fbx", 0.62, "h"],
  // (the rest of that kit, walls, pillars, doors, furniture, gems, was a worse fit than
  // what the game has: add a line here to bring one in)
  // the dungeon prop pack (props/dungeon-pack): torture and the gallows, blood on them
  stocks:    ["props/dungeon-pack/Stocks.fbx", 0.9, "h", "wood"],
  guillotine:["props/dungeon-pack/Guillotine.fbx", 2.5, "h", "wood"],
  xstocks:   ["props/dungeon-pack/X_Stocks.fbx", 1.65, "h", "wood"],
  shackles:  ["props/dungeon-pack/Shackle_Plank.fbx", 0.5, "w", "wood"],
  spikeboard:["props/dungeon-pack/Trap.fbx", 1.05, "h", "wood2"],
  weaponrack:["props/dungeon-pack/Weapon_Rack.fbx", 0.92, "h", "wood"],
  gallows:   ["props/dungeon-pack/Cage.fbx", 2.3, "h", "iron"]
};
/* material class from the kit's material names */
const CLASS = { none:0, wood:1, wood2:2, iron:3, stone:4, stone2:5, clay:6, cloth:7, flame:8, glass:9, gem:10, blood:11 };
function classOf(name, base){
  const n = (name || "").toLowerCase();
  if(n.indexOf("blood") >= 0) return CLASS.blood;
  if(base) return CLASS[base];
  if(n.indexOf("emission") >= 0) return CLASS.flame;
  if(n.indexOf("verre") >= 0) return CLASS.glass;
  if(n.indexOf("bois de bois") >= 0) return CLASS.wood2;
  if(n.indexOf("bois") >= 0) return CLASS.wood;
  if(n.indexOf("pierreclair") >= 0) return CLASS.stone2;
  if(n.indexOf("pierre") >= 0) return CLASS.stone;
  if(n.indexOf("terre") >= 0) return CLASS.clay;
  if(n.indexOf("fer") >= 0 || n.indexOf("blancmetal") >= 0) return CLASS.iron;
  if(n.indexOf("metal") >= 0 || n.indexOf("diamond") >= 0) return CLASS.gem;
  if(n.indexOf("rouge") >= 0 || n.indexOf("voiture") >= 0) return CLASS.cloth;
  return CLASS.iron;
}

function load(file){
  const buf = fs.readFileSync(path.join(INBOX, file));
  return new THREE.FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
}
/* every triangle of every mesh, in the model's space, with its material class */
function triangles(obj, base){
  const tris = [];
  obj.updateMatrixWorld(true);
  obj.traverse(m=>{
    if(!m.isMesh) return;
    const g = m.geometry, p = g.attributes.position, nrm = g.attributes.normal, mats = Array.isArray(m.material) ? m.material : [m.material];
    const nm = new THREE.Matrix3().getNormalMatrix(m.matrixWorld), v = new THREE.Vector3(), n = new THREE.Vector3();
    const groups = g.groups.length ? g.groups : [{ start:0, count:(g.index ? g.index.count : p.count), materialIndex:0 }];
    groups.forEach(gr=>{
      const cls = classOf((mats[gr.materialIndex] || mats[0]).name, base);
      for(let k=gr.start; k<gr.start + gr.count; k++){
        const i = g.index ? g.index.getX(k) : k;
        v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
        if(nrm) n.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize(); else n.set(0, 1, 0);
        tris.push([v.x, v.y, v.z, n.x, n.y, n.z, cls]);
      }
    });
  });
  return tris;
}
function convert(name, [file, size, axis, base]){
  const verts = triangles(load(file), base);
  // bounds, then centre on x/z, feet on the floor, scaled to size
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  verts.forEach(v=>{ for(let k=0;k<3;k++){ mn[k] = Math.min(mn[k], v[k]); mx[k] = Math.max(mx[k], v[k]); } });
  const ext = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
  const s = size/(axis === "h" ? ext[1] : axis === "w" ? Math.max(ext[0], ext[2]) : Math.max(...ext));
  const cx = (mn[0] + mx[0])/2, cz = (mn[2] + mx[2])/2;
  verts.forEach(v=>{ v[0] = (v[0] - cx)*s; v[1] = (v[1] - mn[1])*s; v[2] = (v[2] - cz)*s; });
  const box = [ext[0]*s/2, ext[1]*s, ext[2]*s/2];
  // weld identical vertices (same place, facing, class), packed: 16-bit positions over the box, 8-bit normals
  const Q = v=> [Math.round((v[0]/box[0]*0.5 + 0.5)*65535), Math.round(v[1]/box[1]*65535), Math.round((v[2]/box[2]*0.5 + 0.5)*65535)];
  const map = new Map(), pos = [], nor = [], mat = [], idx = [];
  verts.forEach(v=>{
    const q = Q(v), nq = [Math.round(v[3]*127), Math.round(v[4]*127), Math.round(v[5]*127)], key = q.join(",") + "|" + nq.join(",") + "|" + v[6];
    let i = map.get(key);
    if(i === undefined){ i = pos.length/3; map.set(key, i); pos.push(...q); nor.push(...nq); mat.push(v[6]); }
    idx.push(i);
  });
  const b64 = a=> Buffer.from(a.buffer).toString("base64");
  const n = pos.length/3, I = n > 65535 ? new Uint32Array(idx) : new Uint16Array(idx);
  return { n, t:idx.length/3, box:box.map(x=> +x.toFixed(4)), p:b64(new Uint16Array(pos)), q:b64(new Int8Array(nor)), m:b64(new Uint8Array(mat)), i:b64(I), i32:n > 65535 ? 1 : 0 };
}

const data = {}; let tris = 0;
for(const name in MODELS){
  try{ data[name] = convert(name, MODELS[name]); tris += data[name].t; console.log(name.padEnd(11), String(data[name].t).padStart(6), "tris", String(data[name].n).padStart(6), "verts"); }
  catch(e){ console.error("kit: " + name + ": " + e.message); }
}
const js = "/* generated by tools/kit.js (npm run kit) from the FBX models in art-inbox/: do not edit by hand */\n" +
  "window.DG = window.DG || {}; DG.KITDATA = { classes:" + JSON.stringify(CLASS) + ", models:" + JSON.stringify(data) + " };\n";
fs.writeFileSync(OUT, js);
console.log(Object.keys(data).length + " models, " + tris + " triangles, " + (js.length/1024).toFixed(0) + " KB -> " + path.relative(ROOT, OUT));
