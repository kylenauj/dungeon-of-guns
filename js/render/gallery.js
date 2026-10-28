/* ------------------------------------------------------------------ *
 *  The gallery (?gallery): every model in the game lined up on one
 *  floor, idling, under the chosen floor's lighting. For judging the
 *  art side by side.
 *
 *  WASD / arrows pan, wheel zooms, 1-5 switch floor lighting.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, M = DG.Models, S = DG.Stage;
const Gallery = DG.Gallery = {};

function label(text, w){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w || 1.6, 0.32), new THREE.MeshBasicMaterial({ map:K.textTex([text], 160, 32, { size:20, bg:"#120e16", fg:"#f3e6c4" }), transparent:true }));
  m.rotation.x = -1.05; m.position.y = 0.02; m.userData.text = text;
  return m;
}

Gallery.start = function(){
  const root = Gallery.root = new THREE.Group(); S.scene.add(root);
  const rigs = Gallery.rigs = [];
  const rows = [
    { name:"HEROES", gap:2.2, items:[["Zippy", ()=>{ const R = M.zippy(); M.setGun(R, { base:"pistol", element:"arcane", uid:1 }); return R; }], ["Gribbus", ()=> M.frog()], ["Grobbus", ()=> M.frog(true)],
      ...["pistol", "smg", "shotgun", "rifle", "launcher"].map((b, i)=> [b, ()=>{ const R = { root:new THREE.Group(), glows:[] }; const g = M.gun(b, ["arcane", "fire", "frost", "poison", "shock"][i], R); K.bake(g, { w:0.015 }); g.scale.setScalar(2); g.position.y = 0.8; g.rotation.y = Math.PI/2; R.root.add(g); return R; }])] },
    { name:"COSTUMES", gap:2.2, items:[
      ["Inferno", ["inferno"]], ["Blizzard", ["blizzard"]], ["Stormcaller", ["stormcaller"]], ["Plague", ["plague", "venomrounds"]],
      ["Overgrowth", ["overgrowth", "blossom", "swampfeet"]], ["Midas", ["midas", "midaspocket"]], ["Shadow", ["shadow"]], ["Frogsona", ["frogsona", "specs"]],
      ["Godwand", ["godwand", "prismheart", "infinity"]], ["Comet", ["comet", "portal", "boots"]], ["Goofball", ["chicken", "beehive", "dice", "bubblegum", "spikyhat", "spaghetti"]],
      ["Tinkerer", ["tallhat", "clockwork", "lens", "accordion", "haunted", "disco"]]
    ].map(([name, ids])=> [name, ()=>{ const R = M.zippy(DG.Items.costume(ids)); M.setGun(R, { base:"pistol", element:"fire", uid:1 }); return R; }]) },
    { name:"FORMS", gap:2.2, items:DG.SETS.map(s=> [s.name, ()=>{ const R = M.zippy(DG.Items.costume([], [s.id])); M.setGun(R, { base:"smg", element:(s.els || ["arcane"])[0], uid:1 }, s.els || []); return R; }]).concat([
      ["Gribbus+", ()=> M.frog(false, ["lily", "zoomies", "hop", "bubble", "flyhunt"])], ["Gribbus++", ()=> M.frog(false, ["doom", "brood", "croak", "gulp", "spit"])]]) },
    { name:"FRIENDS & ODDITIES", gap:2.6, items:[["Brother Olm", ()=>{ const R = M.olm(); R.olm = true; return R; }], ["Bungus", ()=> M.bungus()], ["scroll frog", ()=>{ const R = M.scrollFrog(0); R.still = true; return R; }],
      ["glowshroom", ()=> M.glowshroom()], ["door of eyes", ()=>{ const R = M.eyedoor(); R.eyedoor = true; return R; }],
      ...["bonethrone", "cage", "dicealtar", "bloodbowl", "padlock", "hearth", "bigfern", "waterfall"].map(k=> [k, ()=>{ const o = DG.Decor.build(k, DG.RNG(7).next); K.bake(o.group, { w:0.018 }); o.glows.forEach(gl=>{ const sp = K.sprite(gl.c, gl.s*1.4, 0.8); sp.position.set(gl.x, gl.y, gl.z); o.group.add(sp); }); if(k === "padlock") o.group.scale.setScalar(3); return { root:o.group }; }])] },
    { name:"GOBLINS", gap:2.2, items:["grunt", "slinger", "bomber", "shaman", "brute", "sneak", "merchant"].map(k=> [k, ()=> M.goblin(k)]) },
    { name:"SHROOMS & HAUNTS", gap:2.2, items:["puffling", "toadstool", "shroomkin", "shroomlet", "ghost", "banshee", "skeleton", "poltergeist"].map(k=> [k, ()=> M.enemy(k)]) },
    { name:"THE WEIRD", gap:2.4, items:["watcher", "blob", "blobling", "tentacle"].map(k=> [k, ()=> M.enemy(k)]) },
    { name:"THE GLOOM", gap:2.4, items:["rotling", "spitter", "bloater", "husk", "wight", "evilfrog"].map(k=> [k, ()=> M.enemy(k)]) },
    { name:"BOSSES", gap:5, items:["king", "matriarch", "bride", "eye", "heart", "hollow", "toadking", "archivist"].map(k=> [k, ()=> M.enemy(k)]) },
    { name:"THE OTHER BOSSES", gap:5, items:["gibbet", "ratking", "gravedigger", "antlered"].filter(k=> M[k]).map(k=> [k, ()=> M.enemy(k)]) },
    { name:"LAIRS", gap:4, items:Object.keys(DG.LAIRS).filter(k=> M["lair_" + k]).map(k=> [DG.LAIRS[k].name.split(",")[0], ()=> M.enemy("lair_" + k)]) },
    { name:"REDEEMED", gap:2.4, items:[["grey wizard", ()=> M.zippy({ robe:"grey", cape:"grey", parts:["tallhat"], auras:[] })], ["Gribbus", ()=>{ const R = M.frog(false, [], { redeemed:true }); R.root.scale.setScalar(1.3); return R; }],
      ["King of the Bog", ()=>{ const R = M.frog(false, ["crown"], { redeemed:true }); if(R.parts.crown) R.parts.crown.visible = true; R.root.scale.setScalar(2.2); return R; }],
      ["white wizard", ()=> M.zippy({ robe:"white", cape:"white", parts:["tallhat", "halo"], auras:[] })]] },
    { name:"THRONES", gap:3, items:["fire", "frost", "poison", "shock", "arcane"].map(el=> [DG.ENDINGS.throne.els[el].seat, ()=>{
      const T = M.throne(el), Z = M.zippy({ robe:DG.ATTUNE_DYE[el], cape:DG.ATTUNE_DYE[el], parts:["tallhat"], auras:[] });
      Z.root.position.set(0, 0.1, 0.22); Z.parts.skirt.rotation.x = -1.25; Z.body.rotation.x = -0.08; T.root.add(Z.root); T.throne = true; return T; }]) },
    { name:"LOOT", gap:1.6, items:[...["gold", "heart", "mana", "ward"].map(k=> [k, ()=>{ const g = M.pickup({ kind:k, value:5 }); g.position.y = 0.5; return { root:g }; }]),
      ...Object.keys(DG.ITEMS).filter((id, i, a)=> ["spinach", "pinball", "frostrounds", "wispcraft", "plague", "orbiter", "prismheart", "midas", "echo"].indexOf(id) >= 0).map(id=> [DG.ITEMS[id].name, ()=>{ const g = M.powerup(id); g.position.y = 0.8; return { root:g, spin:true }; }])] },
    { name:"BREAKABLES", gap:1.4, items:["pot", "crate", "barrel", "xbarrel", "urn", "coffin", "shroomcap", "eggsac", "pustule"].map(k=> [k, ()=> ({ root:new THREE.Mesh(DG.Decor.breakableGeo(k), K.toon()) })]) },
    { name:"FILTH", gap:2.4, items:["drift", "heap", "growth", "hanged", "rag", "tatter"].map(k=> [k, ()=> ({ root:new THREE.Mesh(DG.Filth.sample(k), k === "growth" ? K.inkPBR({ vivid:true, roughness:0.3 }) : K.inkPBR({ side:THREE.DoubleSide })) })]) },
    { name:"DECOR", gap:1.5, items:DG.Decor.kinds().map(k=> [k, ()=>{ const o = DG.Decor.build(k, Math.random); K.bake(o.group, { w:0.018 }); o.glows.forEach(gl=>{ const sp = K.sprite(gl.c, gl.s*1.4, 0.8); sp.position.set(gl.x, gl.y, gl.z); o.group.add(sp); }); return { root:o.group }; }]) }
  ];
  let z = 0;
  rows.forEach(row=>{
    const n = row.items.length, w = (n - 1)*row.gap;
    const head = label(row.name, 4); head.position.set(-w/2 - 3.2, 0.02, z); root.add(head);
    row.items.forEach(([name, make], i)=>{
      let R; try{ R = make(); }catch(e){ console.error("gallery: " + name, e); return; }
      const x = -w/2 + i*row.gap;
      R.root.position.set(x, 0, z); root.add(R.root);
      const l = label(name); l.position.set(x, 0.02, z + (row.gap > 3 ? 2.6 : 1.1)); root.add(l);
      rigs.push(R);
    });
    z += row.gap > 3 ? 7 : 3.6;
  });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(90, z + 12), K.ink({ vertexColors:false, color:0x5a504a, map:K.floorTex }));
  fl.material.map = K.floorTex.clone(); fl.material.map.wrapS = fl.material.map.wrapT = THREE.RepeatWrapping; fl.material.map.repeat.set(90, z + 12); fl.material.map.needsUpdate = true;
  fl.rotation.x = -Math.PI/2; fl.position.set(0, 0, z/2 - 3); root.add(fl);
  Gallery.floor = 0; Gallery.cam = { x:0, z:2, dist:13 };
  Gallery.setFloor(0);
  // ?gallery&sil: every model as a flat black shape on bone, no post pass. If a
  // model reads as cute here, no shader will save it (docs/ART_DIRECTION.md)
  if(/[?&]sil\b/.test(location.search)){
    const ink = new THREE.MeshBasicMaterial({ color:0x0a0806 });
    rigs.forEach(R=> R.root.traverse(o=>{ if(o.isSprite || (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending)) o.visible = false; else if(o.isMesh) o.material = ink; }));
    fl.material = new THREE.MeshBasicMaterial({ color:0xd8d0bc });
    S.fancy = false; S.scene.background = new THREE.Color(0xd8d0bc); S.scene.fog = null;
  }
  addEventListener("keydown", e=>{ const n = +e.key; if(n >= 1 && n <= 5) Gallery.setFloor(n - 1); Gallery.keys[e.code] = true; });
  addEventListener("keyup", e=>{ Gallery.keys[e.code] = false; });
  addEventListener("wheel", e=>{ Gallery.cam.dist = Math.max(5, Math.min(40, Gallery.cam.dist*(e.deltaY > 0 ? 1.1 : 0.9))); }, { passive:true });
  S.onFrame(Gallery.frame);
};
Gallery.keys = {};
Gallery.setFloor = function(i){
  Gallery.floor = i;
  const th = DG.FLOORS[i];
  S.theme(th, []);
  // the floor's light from a few torches over the lineup
  S.torches.forEach((l, j)=>{ l.color.setHex(th.torch); l.intensity = 1.6; l.distance = 14; l.position.set(-24 + (j % 4)*16, 2.5, -2 + Math.floor(j/4)*14); });
};
Gallery.frame = function(dt, t){
  const C = Gallery.cam, k = Gallery.keys, sp = dt*C.dist*0.9;
  if(k.KeyA || k.ArrowLeft) C.x -= sp; if(k.KeyD || k.ArrowRight) C.x += sp;
  if(k.KeyW || k.ArrowUp) C.z -= sp; if(k.KeyS || k.ArrowDown) C.z += sp;
  S.rig.dist = C.dist; S.follow(C.x, C.z, C.x, C.z);
  S.playerLight.position.set(C.x, 3, C.z + 2);
  Gallery.rigs.forEach((R, i)=>{
    if(R.throne) M.throneAnim(R, t); else if(R.olm) M.olmIdle(R, t + i*0.7, Math.sin(t*0.5)); else if(R.eyedoor) M.eyedoorOpen(R, 0.5 + 0.5*Math.sin(t*0.6), t); else if(R.still){ R.parts.head.rotation.x = -0.25 + Math.sin(t)*0.05; } else if(R.body && M.MOVES[R.kind]) M.creep(R, { speed:0 }, t + i*0.7, dt);       // a rig with its own moves stands as it does in the game
    else if(R.body) M.idle(R, t + i*0.7, 0);
    if(R.spin) R.root.rotation.y = t;
    if(R.parts && R.parts.head && R.kind === "zippy") R.parts.head.rotation.y = Math.sin(t*0.8)*0.3;
  });
};

})();
