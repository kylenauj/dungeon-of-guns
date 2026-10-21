/* ------------------------------------------------------------------ *
 *  The view: plays the game's state and events back as a picture.
 *  It reads; it never changes the game.
 *
 *  - Zippy and his gun, Gribbus (and Grobbus) hopping and licking
 *  - one rig per enemy, made when it spawns, falling over when it dies
 *  - allies: wisps, tadpoles, the shadow, turrets, moons
 *  - hazards: icicles, flames, puddles, spark orbs, runes, black holes,
 *    spore clouds, slime, shockwaves; boss lasers
 *  - every event turned into sparks, rings, shakes and sounds
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, S = DG.Stage, FX = DG.FX, M = DG.Models;
const A = ()=> DG.Audio;
const PI = Math.PI;
const ELC = el=> el && DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
/* what each kind leaves on the floor when it goes */
const SPLAT = { grunt:0x2a5a14, slinger:0x2a5a14, bomber:0x2a5a14, shaman:0x2a5a14, brute:0x2a5a14, sneak:0x2a4a1a, king:0x2a5a14,
  puffling:0xa89870, toadstool:0x8a2a1a, shroomkin:0x5a2a7a, shroomlet:0x6a2a8a, matriarch:0x8a6a3a,
  ghost:0x6ab8d8, banshee:0x6a8ad8, poltergeist:0x6aa84a, skeleton:0xb8b09a, bride:0x8ab8e8,
  watcher:0x7a1a4a, blob:0x5aa82a, blobling:0x6ab83a, tentacle:0x5a1a5a, eye:0x8a1a2a, heart:0x5a0a3a,
  rotling:0x3a1a3e, spitter:0x5a6a2a, bloater:0x5a2a4a, husk:0x5a4a5a };

function shadowBlob(r){
  const s = new THREE.Mesh(K.glowPlane, new THREE.MeshBasicMaterial({ map:K.glowTex, color:0x000000, transparent:true, opacity:0.55, depthWrite:false }));
  s.scale.set(r*3.4, 1, r*3.4); s.position.y = 0.03; return s;
}

const View = DG.View = function(G){
  const V = this;
  V.G = G; V.rigs = {}; V.dying = []; V.pickups = {}; V.allies = {}; V.hazards = {}; V.beams = {}; V.floor = 0;
  V.dressPlayer(DG.Items.costume([]));
  V.frogs = [];
  V.lily = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 14, 1, false, 0.3, PI*2 - 0.6), K.lambert(0x5ac83a)); pad.position.y = 0.9; V.lily.add(pad);
  V.lily.add(K.sprite(0x9cff6a, 1.2, 0.35)); V.lily.visible = false; S.scene.add(V.lily);
  V.portal = null;
  V.buildFloor();
};
const proto = View.prototype;

/* Zippy wears what he carries: rebuilt whenever his costume changes */
proto.dressPlayer = function(look){
  const V = this, old = V.player, R = M.zippy(look);
  if(old){ S.scene.remove(old.root); R.root.position.copy(old.root.position); R.root.rotation.copy(old.root.rotation); }
  R.root.scale.set(HERO, HERO*STRETCH, HERO);
  R.ring = new THREE.Mesh(K.glowPlane, K.glowMat(0xb36bff, 0.35)); R.ring.scale.set(2.2, 1, 2.2); R.ring.position.y = 0.04;
  R.root.add(R.ring); R.root.add(shadowBlob(0.35));
  S.scene.add(R.root);
  V.player = R; V.lookKey = look.key;
  // and the close-up in the corner
  const P = S.portrait;
  if(V.pzZippy) P.root.remove(V.pzZippy.root);
  V.pzZippy = M.zippy(look); V.pzZippy.gunKey = null; V.pzZippy.root.position.set(-0.38, -0.1, 0); P.root.add(V.pzZippy.root);
};
/* the camera looks down at an angle, which squashes anything standing up:
   characters are drawn a little taller to make up for it */
const STRETCH = 1.16, HERO = 0.92;
const W0els = G=> [G.gun().element].concat(G.mods.els.filter(e=> e !== G.gun().element));
const W0gunKey = G=> G.gun().uid + ":" + W0els(G).join(",");
const AURA = {
  petals(x, z){ if(Math.random() < 0.5) return; FX.emit(x + (Math.random() - 0.5)*1.2, 2 + Math.random()*0.4, z + (Math.random() - 0.5)*1.2, (Math.random() - 0.5)*0.4, -0.6, 0, Math.random() < 0.5 ? 0xff8ac8 : 0xfff0a0, 0.18, 1.2, 0, 1); },
  bubbles(x, z){ if(Math.random() < 0.6) return; FX.emit(x + (Math.random() - 0.5)*0.8, 0.3, z + (Math.random() - 0.5)*0.8, 0, 0.9, 0, 0x9cf0ff, 0.22, 0.8, 0, 1); },
  embers(x, z){ FX.emit(x + (Math.random() - 0.5)*0.7, 0.2 + Math.random()*0.8, z + (Math.random() - 0.5)*0.7, 0, 1.5 + Math.random(), 0, Math.random() < 0.5 ? 0xff7a2a : 0xffd23d, 0.18, 0.6, 0, 1); },
  snow(x, z){ FX.emit(x + (Math.random() - 0.5)*1.4, 2.2 + Math.random()*0.5, z + (Math.random() - 0.5)*1.4, (Math.random() - 0.5)*0.3, -0.8, 0, 0xeaf8ff, 0.16, 1.2, 0, 1); },
  sparks(x, z){ if(Math.random() < 0.5) return; const a = Math.random()*6.28; FX.emit(x + Math.cos(a)*0.4, 0.4 + Math.random()*1.2, z + Math.sin(a)*0.4, Math.cos(a)*2, 0, Math.sin(a)*2, 0xfff04a, 0.14, 0.15, 0, 1); },
  toxic(x, z){ FX.emit(x + (Math.random() - 0.5)*0.8, 0.1, z + (Math.random() - 0.5)*0.8, 0, 0.6, 0, 0x9cff3a, 0.2, 0.7, 0, 1); },
  glints(x, z){ if(Math.random() < 0.6) return; FX.emit(x + (Math.random() - 0.5)*1, 0.3 + Math.random()*1.8, z + (Math.random() - 0.5)*1, 0, 0.2, 0, 0xfff27a, 0.22, 0.35, 0, 1); },
  smoke(x, z){ FX.emit(x + (Math.random() - 0.5)*0.6, 0.15, z + (Math.random() - 0.5)*0.6, 0, 0.5, 0, 0x6a3a9a, 0.4, 0.9, 0, 1); },
  rainbow(x, z, t){ const a = t*5; FX.emit(x + Math.cos(a)*0.5, 0.1, z + Math.sin(a)*0.5, 0, 0.8, 0, [0xff4a6a, 0xffd23d, 0x9cff3a, 0x46e4ff, 0xb36bff][Math.floor(t*8) % 5], 0.2, 0.6, 0, 1); },
  stars(x, z){ if(Math.random() < 0.5) return; FX.emit(x + (Math.random() - 0.5)*0.5, 0.5 + Math.random()*0.6, z + (Math.random() - 0.5)*0.5, 0, 0.1, 0, 0xfff27a, 0.16, 0.6, 0, 1); }
};

proto.buildFloor = function(){
  const V = this, G = V.G;
  if(V.world){ S.scene.remove(V.world.group); V.world.dispose(); }
  for(const id in V.rigs) S.scene.remove(V.rigs[id].root); V.rigs = {};
  V.dying.forEach(d=> S.scene.remove(d.R.root)); V.dying = [];
  for(const id in V.pickups) S.scene.remove(V.pickups[id]); V.pickups = {};
  for(const id in V.allies) S.scene.remove(V.allies[id].g); V.allies = {};
  for(const id in V.hazards) S.scene.remove(V.hazards[id].g); V.hazards = {};
  for(const id in V.beams) S.scene.remove(V.beams[id]); V.beams = {};
  if(V.portal){ S.scene.remove(V.portal); V.portal = null; }
  FX.clear();
  V.world = new DG.World(G.D);
  S.scene.add(V.world.group);
  S.theme(G.D.theme, G.curses);
  V.floor = G.floor;
  S.follow(G.player.x, G.player.y, G.player.x, G.player.y, true);
  // every shader the floor can need compiles now, behind the area card, not mid-fight
  V.warmAll();
  // and the floor's enemies are built ahead, one a frame while you explore, so a
  // room's fight doesn't build a dozen models in the frame it starts
  const th = G.D.theme, kinds = Object.keys(th.enemies || {}).map(k=> (DG.ENEMIES[k] && DG.ENEMIES[k].model) || k);
  V.pool = {}; V.warm = [];
  if(th.boss) V.warm.push((DG.BOSSES[th.boss] && DG.BOSSES[th.boss].model) || th.boss);
  for(let n=0;n<4;n++) kinds.forEach(k=> V.warm.push(k));
  V.endRigs = null;
  if(G.floor >= DG.FINAL_FLOOR) V.warm.push("@ending");
  // as much of it as fits in a moment is built now, behind the title card (one of
  // each first, the boss before them); only the rest is left to trickle in
  const t0 = performance.now();
  while(V.warm.length && performance.now() - t0 < 600) V.warmUp(true);
};
/* A new shader is compiled the first time anything that needs it is drawn, and on
   Windows (where the browser translates every shader for DirectX) that can take a
   second: the game froze the first time loot dropped, a boss died, a hazard
   appeared or a new room came into view. So at load, behind the floor's title card,
   the whole floor (fog of war lifted for a moment) and one of everything that only
   turns up mid-fight is compiled and drawn once into a tiny target, then put away. */
/* before each game step: where every moving thing is now (Stage.snap) */
proto.snap = function(){
  const G = this.G;
  S.snap([G.player]); S.snap(G.enemies); S.snap(G.frogs); S.snap(G.allies); S.snap(G.bullets); S.snap(G.pickups);
};
proto.warmAll = function(){
  const V = this, G = V.G, W = V.world, R = S.renderer, g = new THREE.Group(), p = G.player;
  const vis = {}; for(const id in W.areas){ vis[id] = W.areas[id].g.visible; W.areas[id].g.visible = true; }
  const add = make=>{ try{ const o = make(); if(o) g.add(o.isObject3D ? o : o.g || o.root); }catch(e){ console.warn("warm:", e); } };
  ["gold", "heart", "mana", "ward", "fly", "flyheal", "key"].forEach(k=> add(()=> M.pickup({ kind:k, value:5 })));
  const itemId = Object.keys(DG.ITEMS)[0], activeId = Object.keys(DG.ACTIVES || {})[0];
  add(()=> M.powerup(itemId));
  add(()=> M.offer({ kind:"item", id:itemId }));
  const gun = Object.assign({}, G.gun(), { kind:"gun" });
  add(()=> M.item(gun));
  if(activeId) add(()=> M.item({ kind:"active", id:activeId }));
  add(()=> M.pickup({ kind:"item", item:gun }));
  ["icicle", "flame", "puddle", "cloud", "spark", "rune", "blackhole", "spores", "slime", "shockwave", "fireline", "gum"].forEach(k=> add(()=> hazardMesh({ kind:k, r:1, t:1, max:1, id:0 })));
  ["bee", "hat", "moon", "shadow", "tadpole", "turret", "wisp"].forEach(k=> add(()=> allyMesh({ kind:k, el:"arcane", id:0 })));
  add(()=> shadowBlob(0.4));
  const hadPortal = V.portal; V.makePortal(0, 0); if(V.portal && V.portal !== hadPortal){ S.scene.remove(V.portal); g.add(V.portal); V.portal = hadPortal; }
  g.position.set(p.x, 0, p.y); S.scene.add(g);
  try{
    R.compile(S.scene, S.camera);
    const rt = new THREE.WebGLRenderTarget(64, 64); R.setRenderTarget(rt); R.shadowMap.needsUpdate = true; R.render(S.scene, S.camera);
    // and the whole floor once from high above, every room in view: each room's floor,
    // walls and filth go to the graphics card now, not the first time you walk into it
    // (the camera only sees the start room; the rest arrived room by room, a hitch each)
    const D = G.D, top = new THREE.OrthographicCamera(-D.w/2 - 2, D.w/2 + 2, D.h/2 + 2, -D.h/2 - 2, 1, 80);
    top.position.set(D.w/2, 40, D.h/2); top.up.set(0, 0, -1); top.lookAt(D.w/2, 0, D.h/2); top.updateMatrixWorld();
    R.render(S.scene, top);
    R.setRenderTarget(null); rt.dispose();
  }catch(e){ console.warn("warm:", e); }
  S.scene.remove(g);
  for(const id in vis) W.areas[id].g.visible = vis[id];
};
/* compile one rig's shaders now and draw it once, far under the floor into a
   scrap target (the drawing sends its meshes to the graphics card, which
   otherwise happens the moment it first appears: a hitch when a wave lands) */
const WARM = {};
proto.warmRig = function(R){
  const r = S.renderer;
  try{
    if(!WARM.rt){ WARM.rt = new THREE.WebGLRenderTarget(32, 32); WARM.cam = new THREE.PerspectiveCamera(100, 1, 0.5, 30); WARM.cam.position.set(0, -74, 7); WARM.cam.lookAt(0, -79, 0); }
    R.root.position.set(0, -80, 0); S.scene.add(R.root); R.root.updateMatrixWorld(true);
    r.compile(S.scene, S.camera);
    const sm = r.shadowMap.needsUpdate; r.shadowMap.needsUpdate = false;
    r.setRenderTarget(WARM.rt); r.render(S.scene, WARM.cam); r.setRenderTarget(null);
    r.shadowMap.needsUpdate = sm;
  }catch(e){ r.setRenderTarget(null); }
  S.scene.remove(R.root);
};
/* an enemy's rig: one built ahead if there is one, else built now */
proto.takeRig = function(kind){
  const L = this.pool && this.pool[kind];
  if(L && L.length) return L.pop();
  return this.tpl && this.tpl[kind] ? M.copy(this.tpl[kind]) : M.enemy(kind);
};
proto.warmUp = function(now){
  const V = this, G = V.G;
  if(!V.warm || !V.warm.length || (!now && (V.cine || (G.room && G.room.active)))) return;
  // between fights: one every fifth of a second, not one every frame (each is a
  // build, a compile and a draw: back to back they were a stutter after every fight)
  if(!now){ const t = performance.now(); if(t - (V.warmAt || 0) < 200) return; V.warmAt = t; }
  const k = V.warm.shift();
  try{
    if(k === "@ending"){ V.endRigs = DG.Ending.prebuild(); V.warmRig(V.endRigs.z); V.warmRig(V.endRigs.f); }
    else {
      // the first of a kind is built (and its shaders warmed), the rest are copies of it
      V.tpl = V.tpl || {};
      if(!V.tpl[k]){ V.tpl[k] = M.enemy(k); V.warmRig(V.tpl[k]); }
      (V.pool[k] = V.pool[k] || []).push(M.copy(V.tpl[k]));
    }
  }catch(e){ console.error("warm: " + k, e); }
};

proto.dispose = function(){
  const V = this;
  if(V.world){ S.scene.remove(V.world.group); V.world.dispose(); }
  for(const id in V.rigs) S.scene.remove(V.rigs[id].root);
  V.dying.forEach(d=> S.scene.remove(d.R.root));
  for(const id in V.pickups) S.scene.remove(V.pickups[id]);
  for(const id in V.allies) S.scene.remove(V.allies[id].g);
  for(const id in V.hazards) S.scene.remove(V.hazards[id].g);
  for(const id in V.beams) S.scene.remove(V.beams[id]);
  if(V.portal) S.scene.remove(V.portal);
  V.frogs.forEach(f=> S.scene.remove(f.root));
  S.scene.remove(V.player.root); S.scene.remove(V.lily);
  S.portrait.root.clear(); V.pzZippy = V.pzFrog = null;
  if(V.cine){ V.cine.dispose(); V.cine = null; }
  FX.clear();
};

/* sounds from the per-frame side (footfalls, voices); quiet in the attract mode */
proto.play = function(n, o){ const au = A(); if(au && !this.silent) au.play(n, o); };

/* ---- events ---- */
proto.handle = function(ev){
  const V = this, G = V.G, p = G.player, au = A();
  const play = (n, o)=> au && !V.silent && au.play(n, o);
  switch(ev.type){
    case "floor": if(ev.floor !== V.floor) V.buildFloor(); play("descend"); break;
    // King of the Bog: Gribbus lunges and swallows the Heart whole
    case "feast": {
      V.frogs.forEach(f=>{ f.lick = 0.18; f.lickX = ev.x; f.lickY = ev.y; });
      play("lick"); setTimeout(()=> play("croak"), 900);
      S.shake(0.6); FX.burst(ev.x, 1, ev.y, 0x72e050, 40, 6, 0.3, 1, { col2:0x5a0a3a, up:1 });
      FX.ring(ev.x, ev.y, 3, 0x72e050, 0.9); FX.smoke(ev.x, 0.2, ev.y, 0x2a4a1a, 10, 1, 1.6, { spread:1.4, rise:0.6 });
      break;
    }
    case "quest": {
      FX.soul(p.x, p.y, 4, 1.6, ev.id === "ember" ? 0xff8a2a : 0x72e050);
      FX.burst(p.x, 1.4, p.y, ev.id === "ember" ? 0xff8a2a : 0x72e050, 26, 3.5, 0.24, 0.8, { col2:0xffd23d, up:1 });
      play("godly"); S.shake(0.3);
      break;
    }
    case "shoot": {
      if(ev.from === "player" || !ev.from){
        const m = V.player.muzzle, w = new THREE.Vector3(); m.getWorldPosition(w);
        FX.burst(w.x, w.y, w.z, ELC(ev.el), ev.base === "shotgun" ? 8 : 3, 3, 0.25, 0.15, { col2:0xffffff });
        S.flash.position.set(w.x, w.y + 0.3, w.z); S.flash.color.setHex(ELC(ev.el)); S.flash.intensity = ev.base === "shotgun" || ev.base === "launcher" ? 2.5 : 1.2;
        V.recoil = Math.min(1.3, (V.recoil || 0)*0.4 + (ev.base === "shotgun" || ev.base === "launcher" ? 1.2 : ev.base === "rifle" ? 1 : ev.base === "smg" ? 0.45 : 0.7));
        if(ev.base === "shotgun" || ev.base === "launcher") S.shake(0.12);
        play("shoot_" + ev.base, { el:ev.el });
      } else FX.burst(ev.x, 0.8, ev.y, ELC(ev.el), 2, 2, 0.2, 0.12);
      break;
    }
    case "spell": FX.rise(ev.x, ev.y, ELC(ev.el), 18, 0.7, { v:2 }); FX.ring(ev.x, ev.y, 1.4, ELC(ev.el), 0.4); play("spell_" + ev.spell); break;
    case "nomana": case "nocharge": play("error"); break;
    case "hit": FX.burst(ev.x, 0.8, ev.y, ELC(ev.el), ev.crit ? 10 : 4, ev.crit ? 6 : 3.5, 0.22, 0.25); play(ev.crit ? "crit" : "hit", { el:ev.el }); break;
    case "pop":
      if(ev.team === "p") FX.burst(ev.x, 0.75, ev.y, ELC(ev.el), 3, 2.5, 0.18, 0.18);
      else FX.burst(ev.x, 0.6, ev.y, 0xff3a8a, 3, 2, 0.18, 0.18);
      break;
    case "bounce": FX.burst(ev.x, 0.75, ev.y, ev.els ? ELC(ev.els[0]) : 0xffffff, 4, 3, 0.15, 0.15); play("bounce"); break;
    case "kill": {
      const R = V.rigs[ev.id];
      // what's left behind stays for the floor
      if(!ev.fell && !ev.decoy && V.world){ const k = R ? R.kind : ""; V.world.addSplat(ev.x, ev.y, SPLAT[k] || 0x3a6a1a, ev.boss ? 4 : 1.1 + Math.random()*0.5); }
      if(R){ delete V.rigs[ev.id]; V.dying.push({ R, t:0, fell:ev.fell, boss:ev.boss, midas:ev.midas, decoy:ev.decoy, x:ev.x, y:ev.y }); }
      // no pop: a spatter where the blow landed, and the body is left to stagger, fall and come apart
      const col = ev.midas ? 0xffd23d : ev.decoy ? 0xd8e8ff : SPLAT[R ? R.kind : ""] || 0x7ad84a;
      FX.burst(ev.x, 0.7, ev.y, col, ev.boss ? 24 : ev.decoy || ev.midas ? 14 : 8, ev.boss ? 6 : 3.5, 0.26, 0.5, { grav:9, col2:ev.midas ? 0xffffff : 0x3a0606 });
      if(ev.boss) S.shake(1);
      play(ev.boss ? "bossdie" : ev.fell ? "fall" : ev.decoy ? "poof" : "kill");
      if(!ev.fell && !ev.decoy) play("die", { family:ev.boss ? "boss" : DIE[R ? R.kind : ""] || "goblin", x:ev.x, y:ev.y });
      break;
    }
    case "hurt": V.zHurt = 1; V.zHurtSide = Math.random() < 0.5 ? -1 : 1; S.shake(0.35); FX.burst(p.x, 0.9, p.y, 0xff3a4a, 10, 4, 0.25, 0.35); play("hurt"); break;
    case "wardBreak": S.shake(0.2); FX.ring(p.x, p.y, 1.6, 0x8ad8ff, 0.35); FX.burst(p.x, 0.9, p.y, 0x8ad8ff, 16, 4, 0.25, 0.4); play("ward"); break;
    case "ward": FX.rise(p.x, p.y, 0x8ad8ff, 10, 0.5); play("pickup"); break;
    case "death": V.zDead = 0.001; S.shake(0.8); FX.burst(p.x, 0.9, p.y, 0xb36bff, 24, 4, 0.3, 1.0, { grav:4 }); play("death"); break;
    case "heal": FX.rise(ev.x, ev.y, 0x5aff8a, 12, 0.5); play("heal"); break;
    case "blink": V.zWhip = 9; FX.burst(ev.x, 0.8, ev.y, 0xb36bff, 14, 3, 0.3, 0.35, { col2:0xffffff }); play("blink"); play("cloth"); break;
    case "blinkEnd": FX.burst(ev.x, 0.8, ev.y, 0xb36bff, 10, 2.5, 0.25, 0.3); FX.smoke(ev.x, 0.1, ev.y, 0x2a2420, 3, 0.4, 0.6, { spread:0.5, rise:0.2 }); play("step", { heavy:true, x:ev.x, y:ev.y }); break;
    case "reload": play("reload"); break;
    case "reloaded": play("reloaded"); break;
    case "swap": play("swap"); break;
    case "doorsShut": play("doorShut"); S.shake(0.25); break;
    case "doorsOpen": play("doorOpen"); break;
    case "clear": play("clear"); break;
    case "spawn":
      FX.burst(ev.x, 0.3, ev.y, ev.boss ? 0xff3a6a : 0x8a7a6a, ev.boss ? 40 : 12, 2.5, 0.5, 0.8, { up:1, drag:3 });
      FX.ring(ev.x, ev.y, ev.boss ? 3 : 1, 0x9cff3a, 0.6);
      break;
    case "tell": {
      const R = V.rigs[ev.id]; if(R){ R.tell = ev.t; R.tellMax = ev.t; R.tellKind = ev.kind; }
      if(ev.kind === "charge") FX.lane(ev.x, ev.y, ev.a, 9, 1.2, ev.t);
      play(ev.kind === "charge" || ev.kind === "squat" || ev.kind === "lasers" || ev.kind === "arteries" ? "tellBig" : ev.kind === "inhale" ? "inhale" : "tell");
      break;
    }
    case "eshoot": play(ev.kind === "ring" ? "ering" : ev.kind === "hex" ? "hex" : ev.kind === "spore" ? "puff" : ev.kind === "arrow" ? "arrow" : "sling"); break;
    case "throw": play("throw"); break;
    case "boom":
      FX.burst(ev.x, 0.5, ev.y, ev.color || (ev.el ? ELC(ev.el) : 0xffa040), ev.soft ? 16 : 26, 6*ev.r/1.7, 0.5, 0.5, { col2:ev.soft ? 0xffffff : 0xffe08a, up:1 });
      FX.ring(ev.x, ev.y, ev.r, ev.color || (ev.el ? ELC(ev.el) : 0xff7a2a), 0.35); FX.disc(ev.x, ev.y, ev.r, ev.color || (ev.el ? ELC(ev.el) : 0xff7a2a), 0.25);
      if(!ev.soft && V.world) V.world.addSplat(ev.x, ev.y, 0x0a0806, Math.min(4, ev.r*1.7), "scorch");
      if(!ev.soft){ S.flash.position.set(ev.x, 1.2, ev.y); S.flash.color.setHex(0xffa040); S.flash.intensity = 4; S.shake(0.4*ev.r/1.7); }
      play(ev.soft ? "steam" : "boom");
      break;
    case "arc": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, ev.color || 0xfff04a); play("zap"); break;
    case "infect": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0x7dff3a, 0.25); break;
    case "react": FX.ring(ev.x, ev.y, 1.6, ev.color, 0.4); FX.burst(ev.x, 1, ev.y, ev.color, 18, 5, 0.3, 0.5, { col2:0xffffff, up:1 }); play("react"); break;
    case "nova": FX.ring(ev.x, ev.y, ev.r, ELC(ev.el), 0.5); FX.disc(ev.x, ev.y, ev.r, ELC(ev.el), 0.4); FX.burst(ev.x, 0.5, ev.y, 0xffffff, 30, 8, 0.25, 0.5, { flat:true }); play("nova"); break;
    case "freeze": FX.burst(ev.x, 0.8, ev.y, 0xcff0ff, 12, 3, 0.3, 0.5); play("freeze"); break;
    case "cloud": FX.disc(ev.x, ev.y, ev.r, 0x7dff3a, 0.5); play("cloud"); break;
    case "fizzle": FX.burst(ev.x, 0.8, ev.y, 0xfff04a, 6, 2, 0.2, 0.3); play("error"); break;
    case "healBeam": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0x5aff8a, 0.3); FX.rise(ev.x2, ev.y2, 0x5aff8a, 8, 0.4); play("heal"); break;
    case "attune": { const c = { fire:0xff7a3a, frost:0x8ad8ff, poison:0x9cff3a, shock:0xfff04a, arcane:0xb36bff }[ev.el] || 0xffd27a; FX.rise(G.player.x, G.player.y, c, 18 + ev.tier*6, 0.8); FX.ring(G.player.x, G.player.y, 2 + ev.tier, c, 0.7); play("duo"); break; }
    case "goldLost": FX.burst(ev.x, 0.8, ev.y, 0xc8a050, 8, 2.5, 0.12, 0.5); break;
    case "interest": play("coin"); break;
    case "mastery": FX.rise(ev.x, ev.y, 0xffd27a, 16, 0.7); FX.ring(ev.x, ev.y, 1.8, 0xc8a050, 0.6); play("duo"); break;
    case "key": if(DG.HUD) DG.HUD.keyT = 0.8; play("pickup"); break;
    case "unlock": FX.burst(ev.x, 1, ev.y, 0xd8a060, 14, 2.5, 0.15, 0.5); S.shake(0.2); play("doorOpen"); break;
    case "stash": FX.smoke(ev.x, 1.0, ev.y, 0x6a6058, 10, 0.5, 1.2); FX.burst(ev.x, 1.0, ev.y, 0xc8a050, 10, 2, 0.15, 0.5); play("coin"); break;
    case "bonk":
      S.shake(0.3); FX.burst(ev.x, 1.3, ev.y, 0xffe680, 10, 3, 0.25, 0.5, { up:1 });
      play("bonk"); V.stars = 1.2;
      if(V.world) G.D.rooms.forEach(r=>{ if(r.puzzle && r.puzzle.failed) r.puzzle.failed.forEach(i=> V.world.markPainted(i)); });
      break;
    case "illusion": FX.burst(ev.x, 0.9, ev.y, 0xb36bff, 24, 2.5, 0.35, 0.8, { spread:1.4 }); play("illusion"); break;
    case "secretRoom": play("secret"); break;
    case "solved": { play("solved"); const r = G.D.rooms[ev.room]; FX.ring(r.cxw, r.cyw, 5, 0xffd23d, 0.9); break; }
    case "brazier": { play("brazier"); const r = G.D.rooms[ev.room], it = r.puzzle.items[ev.i]; FX.burst(it.x, 1.1, it.y, 0xff8a2a, 10, 3, 0.3, 0.4); break; }
    case "statue": { play("stone"); const r = G.D.rooms[ev.room], it = r.puzzle.items[ev.i]; FX.burst(it.x, 0.6, it.y, 0xa8a8b0, 8, 2, 0.25, 0.4); break; }
    case "chorusSing": play("note", { n:ev.i }); break;
    case "chorus": play(ev.ok ? "note" : "wrongnote", { n:ev.i }); break;
    case "push": play("push"); break;
    case "pushStuck": play("error"); break;
    case "pushReset": play("reset"); break;
    case "drop": if(ev.kind === "item") play("lootDrop", { rarity:ev.item && ev.item.rarity }); break;
    case "coin": play("coin"); break;
    case "pickup": play(ev.kind === "gun" || ev.kind === "active" ? "pickupBig" : "pickup"); break;
    case "item": play(ev.tier >= 3 ? "pickupLegend" : "pickupBig"); FX.rise(p.x, p.y, new THREE.Color(DG.TIERS[ev.tier].color), 26, 0.8, { v:3 }); break;
    case "godly": S.shake(0.6); FX.ring(p.x, p.y, 6, 0xfff27a, 1.2); FX.burst(p.x, 1, p.y, 0xfff27a, 60, 8, 0.4, 1.2, { up:2 }); play("godly"); break;
    case "duo": FX.ring(p.x, p.y, 3, 0xff4fd8, 0.8); play("duo"); break;
    case "ascend": FX.ring(p.x, p.y, 4, 0xffb12e, 1); FX.rise(p.x, p.y, 0xffb12e, 40, 0.8, { v:4 }); play("godly"); break;
    case "boon": play("pickupBig"); break;
    case "levelup": play("levelup"); FX.rise(p.x, p.y, 0xffd23d, 20, 0.6, { v:3 }); break;
    case "chest": play("chest"); FX.burst(ev.x, 0.6, ev.y, 0xffd23d, 20, 4, 0.3, 0.6, { up:2 }); break;
    case "buy": play("buy"); break;
    case "altar": play("altar"); S.shake(0.3); FX.burst(p.x, 1, p.y, 0xff2a3a, 30, 4, 0.3, 0.8, { up:1 }); break;
    case "sink": play("splash"); break;
    case "broke": play("error"); break;
    case "slip": play("slip"); break;
    case "fall": play("fall"); break;
    // only the traps near you make a sound, placed where they are (a floor of spike plates used to ping as one)
    case "trap": if(DG.dist(ev.x, ev.y, G.player.x, G.player.y) < 10) play(ev.kind === "spikes" ? "spikes" : ev.kind === "vent" ? "vent" : "dart", { x:ev.x, y:ev.y }); break;
    case "dizzy": FX.burst(ev.x, 1.6, ev.y, 0xffe680, 8, 2, 0.25, 0.8, { up:1 }); play("thud"); S.shake(0.3); break;
    case "boss": play("boss"); break;
    case "bossPhase": S.shake(0.5); play("tellBig"); break;
    case "jump": play("jump"); break;
    case "land": S.shake(0.9); play("boom"); break;
    case "portal": V.makePortal(ev.x, ev.y); play("portal"); break;
    case "read": play("click"); break;
    case "bark": play("bark"); break;
    case "break": FX.burst(ev.x, 0.4, ev.y, ev.kind === "pot" || ev.kind === "urn" ? 0xb8683a : ev.kind === "eggsac" || ev.kind === "pustule" ? 0xd8e84a : 0x8a5a30, 14, 3.5, 0.3, 0.6, { grav:8, up:2 }); play("break"); break;
    case "chip": { const b = V.G.D.breakMap && V.G.D.breakables.find(o=> o.id === ev.id); if(b) b.shake = 0.15; break; }
    case "byproduct": play("byproduct", { kind:ev.kind }); break;
    case "shatter": FX.burst(ev.x, 0.5, ev.y, 0xcff0ff, 12, 4, 0.22, 0.4); play("shatter"); break;
    case "ally": if(ev.kind === "wisp") FX.burst(ev.x, 0.8, ev.y, ELC(ev.el), 8, 2, 0.25, 0.3); break;
    case "allyHit": FX.burst(ev.x, 0.8, ev.y, ev.kind === "wisp" ? ELC(ev.el) : 0x9cff6a, 3, 2, 0.15, 0.2); break;
    case "lick": { const f = V.frogs[ev.frog]; if(f){ f.lick = 0.18; f.lickX = ev.tx; f.lickY = ev.ty; } play("lick"); break; }
    case "spit": play(ev.bubble ? "bubble" : "spit"); break;
    case "croak": FX.ring(ev.x, ev.y, ev.kind === "doom" ? 10 : 3, ev.kind === "doom" ? 0x9cff3a : 0x8ad8ff, 0.6); play("croak"); break;
    case "gulp": play("gulp"); break;
    case "frogbuff": play("frog"); FX.rise(G.gribbus.x, G.gribbus.y, 0x9cff6a, 20, 0.5, { v:3 }); break;
    case "item": {
      if(V.hold) S.scene.remove(V.hold.g);
      const g = M.powerup(ev.id); S.scene.add(g);
      V.hold = { t:1.4, g };
      FX.burst(p.x, 2.6, p.y, DG.TIERS[ev.tier] ? new THREE.Color(DG.TIERS[ev.tier].color).getHex() : 0xffffff, 14, 2.5, 0.25, 0.5, { up:1 });
      break;
    }
    case "transform":
      V.spinT = 1.4;
      FX.ring(p.x, p.y, 5, 0xfff27a, 0.9); FX.ring(p.x, p.y, 3, 0xff6ad8, 0.7);
      FX.burst(p.x, 1.2, p.y, 0xfff27a, 60, 7, 0.35, 1, { up:2, col2:0xffffff });
      S.shake(0.4); play("transform");
      break;
    case "burst": FX.burst(ev.x, 0.8, ev.y, 0x9cff3a, 30, 4, 0.4, 0.8, { up:1, col2:0xb36bff }); FX.ring(ev.x, ev.y, 1.9, 0x9cff3a, 0.5); play("splat"); break;
    case "frogPoof": FX.burst(ev.x, 0.4, ev.y, 0x9cff6a, 10, 2, 0.3, 0.5); if(ev.x2 !== undefined) FX.burst(ev.x2, 0.4, ev.y2, 0x9cff6a, 12, 2.5, 0.3, 0.5); play("poof"); break;
    /* the odd ones */
    case "status": if(ev.st === "confused"){ FX.burst(ev.x, 1.6, ev.y, 0xffd23d, 8, 2, 0.22, 0.5, { up:1 }); play("squeak"); } break;
    case "stick": FX.burst(ev.x, 0.9, ev.y, 0xff4a3a, 5, 1.5, 0.2, 0.3); play("stick"); break;
    case "portal": FX.ring(ev.x1, ev.y1, 0.9, 0x46e4ff, 0.35, { y:0.8 }); FX.ring(ev.x2, ev.y2, 0.9, 0xff9a2e, 0.35, { y:0.8 }); FX.burst(ev.x2, 0.8, ev.y2, 0xff9a2e, 6, 2.5, 0.2, 0.3); play("portalShot"); break;
    case "shove": FX.ring(ev.x, ev.y, ev.r, 0xd8b84a, 0.45); FX.ring(ev.x, ev.y, ev.r*0.6, 0xff6ad8, 0.35); S.shake(0.2); play("accordion"); break;
    case "jackpot": FX.burst(ev.x, 0.8, ev.y, 0xffd23d, 22, 5, 0.3, 0.7, { grav:9, up:2, col2:0xfff8b0 }); play("jackpot"); break;
    case "clockwork": FX.ring(ev.x, ev.y, 1.8, 0x8ad8ff, 0.5); play("ward"); break;
    case "haunt": { const a = ev.a; FX.burst(ev.x + Math.cos(a)*0.7, 1, ev.y + Math.sin(a)*0.7, 0x9cffc8, 4, 1.5, 0.25, 0.35); play("ghostShot"); break; }
    case "fling": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0xff6a8a, 0.2); FX.burst(ev.x2, 0.8, ev.y2, 0xff6a8a, 8, 3, 0.25, 0.3); play("bonk"); break;
    case "comet": FX.burst(ev.x, 0.8, ev.y, 0xfff27a, 12, 5, 0.3, 0.4, { col2:0xb36bff }); S.shake(0.15); play("thud"); break;
    case "zapShot": FX.ring(ev.x, ev.y, 1.2, 0xfff04a, 0.25); play("zap"); break;
    case "disco": FX.ring(ev.x, ev.y, ev.big ? 5 : 1.4, [0xff4a6a, 0x46e4ff, 0x9cff3a, 0xffd23d, 0xb36bff][Math.floor(Math.random()*5)], ev.big ? 0.8 : 0.3); if(ev.big) play("disco"); break;
    case "hiccup": FX.burst(ev.x, 1.6, ev.y, 0xb8f0ff, 6, 1.5, 0.3, 0.4, { up:1 }); play("hiccup"); break;
    case "bonkFriend": FX.burst(ev.x, 1, ev.y, 0xffd23d, 6, 2.5, 0.22, 0.3); play("bonk"); break;
    case "toll": S.shake(ev.big ? 0.5 : 0.3); FX.ring(ev.x, ev.y, ev.big ? 12 : 9, 0xc8b88a, 1.1); FX.ring(ev.x, ev.y, 5, 0x8a7a5a, 0.8); play("toll", { big:ev.big }); break;
    case "darksign": S.shake(0.8); FX.soul(ev.x, ev.y, 4, 2.2, 0x3a2a5a); FX.ring(ev.x, ev.y, 4, 0x6a4aa8, 0.9); FX.ash(ev.x, ev.y, 0.8, 1.6, 30); play("darksign"); break;
    case "darksignLit": FX.rise(ev.x, ev.y, 0xff8a3a, 10, 0.6); play("darksignLit"); break;
    case "execute": FX.blood(ev.x, 0.7, ev.y, 0x3a0606, 14, 3, 0.12, 0.7); S.shake(0.15); play("execute", { x:ev.x, y:ev.y }); break;
    case "spear": play("spear"); break;
    case "whistle": FX.ring(ev.x, ev.y, 6, 0xffd23d, 0.6); FX.ring(ev.x, ev.y, 9, 0xff6ad8, 0.8); play("whistle"); break;
    case "frogCannon": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0x9cff6a, 0.3); FX.burst(ev.x2, 0.5, ev.y2, 0x9cff6a, 16, 4, 0.3, 0.5); play("frog"); break;
    case "dice": FX.burst(G.player.x, 2.2, G.player.y, ev.mul >= 1.2 ? 0xffd23d : ev.mul < 1 ? 0x8a8aa8 : 0xffffff, 10, 2, 0.25, 0.5, { up:1 }); play("dice"); break;
    case "fly": play("fly"); break;
    case "lilyBlock": FX.burst(ev.x, 0.8, ev.y, 0x9cff6a, 6, 2, 0.2, 0.2); break;
    case "trapped": play("bubble"); break;
    case "graze": FX.burst(ev.x, 0.8, ev.y, 0xffffff, 6, 3, 0.2, 0.25); play("graze"); break;
    case "gremlin": FX.burst(ev.x, 1.5, ev.y, 0xff4fd8, 20, 4, 0.3, 0.5); play("gremlin"); break;
    case "active": play("active"); FX.ring(ev.x, ev.y, 2, 0xffd23d, 0.5); break;
    case "charged": play("charged"); break;
    case "reroll": play("reroll"); break;
    case "poof": FX.burst(ev.x, 0.5, ev.y, 0xb8d84a, 26, 3, 0.45, 0.9, { up:1, drag:2 }); play("puff"); break;
    case "splat": play("splat"); break;
    case "emerge": S.shake(0.25); FX.burst(ev.x, 0.2, ev.y, 0x8a3a8a, 16, 3.5, 0.3, 0.5, { up:3, grav:6 }); play("thud"); break;
    case "burrow": FX.burst(ev.x, 0.2, ev.y, 0x5a2a4a, 10, 2, 0.3, 0.4); break;
    case "bones": FX.burst(ev.x, 0.4, ev.y, 0xe8e2cc, 12, 3, 0.25, 0.6, { grav:8 }); play("bones"); break;
    case "reassemble": FX.rise(ev.x, ev.y, 0xe8e2cc, 14, 0.5); play("bones"); break;
    case "mirror": play("mirror"); break;
    case "decoyPop": FX.burst(ev.x, 1, ev.y, 0xd8e8ff, 24, 4, 0.35, 0.6); play("poof"); break;
    case "appear": FX.burst(ev.x, 1, ev.y, 0xa8d8ff, 24, 4, 0.35, 0.6); play("ghost"); break;
    case "wailTell": play("inhale"); break;
    case "shut": play("thud"); break;
    case "open": play("tellBig"); break;
    case "beat": S.shake(0.25); play("beat"); FX.ring(ev.x, ev.y, 3, 0xff2a3a, 0.4); break;
    case "summon": play("tellBig"); break;
    case "beam": play("laserTell"); break;
    /* ROOMS */
    case "chestUnlock": FX.burst(ev.x, 0.4, ev.y, 0xffc860, 12, 2.5, 0.15, 0.5); play("chestUnlock"); break;
    case "pact": S.shake(0.7); FX.ring(ev.x, ev.y, 7, 0xff2a1a, 1.4); FX.soul(ev.x, ev.y, 3, 2.2, 0x6a0a06); FX.burst(p.x, 1, p.y, 0xff2a1a, 50, 5, 0.35, 1.2, { up:1.5, col2:0x2a0404 }); S.theme(G.D.theme, G.curses); play("pact"); break;
    case "sprung": S.shake(0.5); FX.ring(ev.x, ev.y, 6, 0xff4a2a, 0.8); play("sprung"); break;
    case "gamble": FX.burst(ev.x, 1, ev.y, ev.win ? 0xffd23d : ev.blood ? 0x8a0a06 : 0x6a6058, ev.win ? 28 : 14, ev.win ? 4 : 2, 0.25, 0.7, { up:1.5, grav:ev.win ? 6 : 0 }); if(ev.win && !ev.blood) S.shake(0.2); play(ev.win ? "gambleWin" : "gambleLose"); break;
    case "olmTalk": play("olmTalk", { x:ev.x, y:ev.y }); break;
    case "olmBye": play("olmTalk", { x:ev.x, y:ev.y }); break;
    case "blessing": FX.rise(ev.x, ev.y, 0xffc870, 30, 0.7, { v:3 }); FX.ring(ev.x, ev.y, 2.5, 0xffc870, 0.8); play("blessing"); break;
  }
};

proto.makePortal = function(x, y){
  const g = new THREE.Group(); g.position.set(x, 0, y);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color:0x2a0a4a })); disc.rotation.x = -PI/2; disc.position.y = 0.03; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 6, 24), K.basic(0xb36bff)); ring.rotation.x = PI/2; ring.position.y = 0.06; g.add(ring);
  const glow = new THREE.Mesh(K.glowPlane, K.glowMat(0xb36bff, 0.8)); glow.scale.set(4, 1, 4); glow.position.y = 0.05; g.add(glow);
  S.scene.add(g); this.portal = g;
};

/* ---- allies and hazards: little meshes made on demand ---- */
function allyMesh(a){
  const g = new THREE.Group();
  if(a.kind === "wisp"){
    const c = ELC(a.el);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), K.basic(0xffffff)); g.add(core);
    g.add(K.sprite(c, 1.0, 0.9));
    [-1, 1].forEach(s=>{ const e = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 3), K.basic(0x101010)); e.position.set(s*0.045, 0.02, 0.1); g.add(e); });
    g.userData.y = 0.9;
  } else if(a.kind === "tadpole"){
    const R = { root:g };
    K.part(g, new THREE.SphereGeometry(0.13, 10, 8), 0x2a3a2a, 0, 0, 0, 0, 0, 0, 1, 0.8, 1.2);
    K.part(g, new THREE.ConeGeometry(0.07, 0.3, 6), 0x3a4a3a, 0, 0, -0.22, -PI/2);
    [-1, 1].forEach(s=> K.part(g, new THREE.SphereGeometry(0.035, 6, 4), 0xf0f0e0, s*0.06, 0.05, 0.1));
    K.bake(g, { w:0.012 });
    g.userData.y = 0.15;
  } else if(a.kind === "shadow"){
    const R = M.zippy(); R.mat.color.setHex(0x3a2a5a); R.mat.transparent = true; R.mat.opacity = 0.55; g.add(R.root); g.userData.rig = R; g.userData.y = 0;
  } else if(a.kind === "turret"){
    K.part(g, new THREE.CylinderGeometry(0.16, 0.2, 0.5, 10), 0xf0e6d4, 0, 0.25, 0);
    K.part(g, new THREE.SphereGeometry(0.36, 14, 8, 0, PI*2, 0, PI/2), 0x46a8ff, 0, 0.5, 0, 0, 0, 0, 1, 0.7, 1);
    K.bake(g, { w:0.02 }); g.userData.y = 0;
  } else if(a.kind === "bee"){
    K.part(g, new THREE.SphereGeometry(0.1, 10, 8), 0xffd23d, 0, 0, 0, 0, 0, 0, 1, 0.9, 1.3);
    [-0.04, 0.04].forEach(z=> K.part(g, new THREE.TorusGeometry(0.095, 0.02, 4, 12), 0x1a1410, 0, 0, z));
    K.part(g, new THREE.ConeGeometry(0.03, 0.09, 4), 0x1a1410, 0, 0, -0.15, -PI/2);
    [-1, 1].forEach(s=> K.part(g, new THREE.SphereGeometry(0.025, 4, 3), 0x101010, s*0.04, 0.03, 0.11));
    K.bake(g, { w:0.01 });
    g.userData.wings = [-1, 1].map(s=>{ const w = new THREE.Mesh(new THREE.CircleGeometry(0.09, 8), new THREE.MeshBasicMaterial({ color:0xeaf8ff, transparent:true, opacity:0.7, side:THREE.DoubleSide })); w.position.set(s*0.08, 0.08, 0); w.rotation.x = -PI/2; g.add(w); return w; });
    g.userData.y = 0.8;
  } else if(a.kind === "ghoul"){
    // the goblin that died, back as a green ghost of itself
    const R = M.enemy(a.model); R.mat.color.setHex(0x6aff9a); R.mat.emissive.setHex(0x0a3a1a); M.fade(R, 0.6); g.add(R.root); g.userData.rig = R; g.userData.y = 0.15;
    g.add(K.sprite(0x6aff9a, 1.6, 0.35));
  } else if(a.kind === "hat"){
    K.part(g, K.lathe([[0, 0], [0.4, 0.0], [0.44, 0.025], [0.4, 0.05], [0.2, 0.06], [0, 0.06]], 18), 0x4a2a9a);
    K.part(g, new THREE.ConeGeometry(0.22, 0.6, 14), 0x6b3fd0, 0, 0.32, 0);
    K.part(g, new THREE.TorusGeometry(0.22, 0.03, 6, 16), 0xf0c040, 0, 0.08, 0, PI/2);
    K.bake(g, { w:0.02 });
    g.add(K.sprite(0xb36bff, 1.4, 0.4));
    g.userData.y = 0.9; g.userData.spin = true;
  } else if(a.kind === "moon"){
    K.part(g, new THREE.SphereGeometry(0.24, 14, 10), 0xd8d8e8);
    [[0.08, 0.1, 0.18], [-0.1, -0.05, 0.19], [0.02, -0.14, 0.16]].forEach(([x, y, z])=> K.part(g, new THREE.SphereGeometry(0.05, 6, 4), 0xa8a8b8, x, y, z));
    K.bake(g, { w:0.015 }); g.add(K.sprite(0xc8d8ff, 1, 0.35)); g.userData.y = 0.9;
  }
  return g;
}
function hazardMesh(h){
  const g = new THREE.Group();
  const disc = (c, r, op)=>{ const m = new THREE.Mesh(K.glowPlane, K.glowMat(c, op)); m.scale.set(r*2.4, 1, r*2.4); m.position.y = 0.05; g.add(m); return m; };
  switch(h.kind){
    case "icicle":
      for(let i=0;i<4;i++){ const c = new THREE.Mesh(new THREE.ConeGeometry(0.1 + i*0.02, 0.5 + i*0.15, 5), new THREE.MeshPhongMaterial({ color:0xbfeaff, emissive:0x2a6a9a, transparent:true, opacity:0.9, shininess:90 })); const a = i*1.6; c.position.set(Math.cos(a)*0.12*(i ? 1 : 0), 0.25 + i*0.07, Math.sin(a)*0.12*(i ? 1 : 0)); c.rotation.set((i ? 0.3 : 0)*Math.sin(a), 0, (i ? 0.3 : 0)*Math.cos(a)); g.add(c); }
      disc(0x7fd8ff, h.r, 0.4); break;
    case "flame": g.userData.fire = true; disc(0xff6a1a, h.r, 0.55); break;
    case "puddle": { const m = new THREE.Mesh(new THREE.CircleGeometry(h.r, 18), new THREE.MeshPhongMaterial({ color:0x6ad83a, emissive:0x2a6a0a, transparent:true, opacity:0.7, shininess:90 })); m.rotation.x = -PI/2; m.position.y = 0.04; g.add(m); g.userData.bubbles = 0x9cff3a; break; }
    case "cloud": disc(0x7dff3a, h.r, 0.35); g.userData.cloud = 0x9cff3a; break;
    case "spark": { const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), K.basic(0xfff8b0)); core.position.y = 0.7; g.add(core); const s = K.sprite(0xfff04a, 1.2, 0.9); s.position.y = 0.7; g.add(s); g.userData.spin = core; break; }
    case "rune": { const ring = new THREE.Mesh(new THREE.TorusGeometry(h.r, 0.04, 4, 24), K.basic(0xb36bff)); ring.rotation.x = -PI/2; ring.position.y = 0.05; g.add(ring); const ring2 = new THREE.Mesh(new THREE.RingGeometry(h.r*0.4, h.r*0.5, 3), K.basic(0xd8a8ff)); ring2.rotation.x = -PI/2; ring2.position.y = 0.06; g.add(ring2); disc(0xb36bff, h.r, 0.3); g.userData.spin = ring2; break; }
    case "blackhole": { const c = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), K.basic(0x050008)); c.position.y = 0.8; g.add(c); const r = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 20), K.basic(0xb36bff)); r.position.y = 0.8; r.rotation.x = 1.2; g.add(r); g.userData.spin = r; disc(0x6a2aff, 1.4, 0.5); g.userData.suck = true; break; }
    case "spores": disc(0xa8b83a, h.r, 0.3); g.userData.cloud = 0xb8c84a; break;
    case "slime": { const m = new THREE.Mesh(new THREE.CircleGeometry(h.r, 14), new THREE.MeshPhongMaterial({ color:0x8ad83a, transparent:true, opacity:0.55, shininess:90 })); m.rotation.x = -PI/2; m.position.y = 0.035; g.add(m); break; }
    case "shockwave": { const r = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color:0xff2a3a, transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false })); r.rotation.x = -PI/2; r.position.y = 0.08; g.add(r); g.userData.wave = r; break; }
    case "fireline": disc(0xff4a1a, h.r, 0.5); g.userData.fire = true; break;
    case "gum": { const m = new THREE.Mesh(new THREE.CircleGeometry(h.r*0.8, 12), new THREE.MeshPhongMaterial({ color:0xff7ad8, emissive:0x5a1a40, transparent:true, opacity:0.85, shininess:60 })); m.rotation.x = -PI/2; m.position.y = 0.035; m.scale.set(1, 0.8 + Math.random()*0.4, 1); g.add(m);
      const bub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshPhongMaterial({ color:0xffa8e8, transparent:true, opacity:0.6, shininess:90 })); bub.position.set(0.1, 0.12, 0); g.add(bub); g.userData.bubble = bub; break; }
  }
  return g;
}

/* ================================================================== *
 *  Per frame
 * ================================================================== */
proto.update = function(dt, t){
  const V = this, G = V.G, p = G.player;
  V.warmUp();
  // Zippy, dressed in whatever he's carrying
  const ids = Object.keys(p.items).join(",") + "|" + G.mods.sets.join(",");
  if(ids !== V.itemIds){
    V.itemIds = ids;
    const look = DG.Items.costume(Object.keys(p.items), G.mods.sets);
    if(look.key !== V.lookKey){
      const first = V.lookKey === undefined;
      V.dressPlayer(look);
      if(!first){ FX.burst(p.x, 1.2, p.y, 0xfff27a, 24, 3.5, 0.3, 0.6, { col2:(M.DYE[look.cape] || M.DYE.arcane).light, up:1 }); FX.ring(p.x, p.y, 1.6, 0xfff27a, 0.4); }
    }
  }
  if(G.state !== "dead" && !V.cine) V.player.look.auras.forEach(a=> AURA[a] && AURA[a](p.x, p.y, t));
  const W = V.player, px = S.ix(p), py = S.iy(p);
  W.root.position.set(px, 0, py);
  W.root.rotation.y = PI/2 - S.iaim(p);
  const gunEls = [G.gun().element].concat(G.mods.els.filter(e=> e !== G.gun().element));
  if(W.gunKey !== G.gun().uid + ":" + gunEls.join(",")) M.setGun(W, G.gun(), gunEls);
  // holding up what he just found (Isaac's pose); a transformation spins him round
  if(V.hold){
    V.hold.t -= dt;
    const k = V.hold.t, up = Math.min(1, (1.4 - k)*6, k*5);
    W.parts.armL.rotation.x = -1.0 - 1.9*up; W.parts.armL.rotation.z = -0.3 + 0.25*up;
    V.hold.g.position.set(px, 2.95 + 0.25*up + Math.sin(t*4)*0.05, py); V.hold.g.rotation.y = t*2; V.hold.g.scale.setScalar(Math.max(0.01, up)*1.3);
    if(k <= 0){ S.scene.remove(V.hold.g); V.hold = null; W.parts.armL.rotation.z = -0.3; }
  }
  if(V.spinT > 0){ V.spinT -= dt; W.root.rotation.y += (1 - V.spinT/1.4)*PI*4*dt*3; }
  const dead = G.state === "dead";
  const speed = dead ? 0 : Math.hypot(p.vx, p.vy), ca = Math.cos(p.aim), sa = Math.sin(p.aim);
  V.recoil = Math.max(0, (V.recoil || 0) - dt*6);
  V.zHurt = Math.max(0, (V.zHurt || 0) - dt/0.55);
  if(dead) V.zDead = Math.min(1, (V.zDead || 0) + dt/1.9);
  M.animate(W, t, speed);
  const mo = M.stalk(W, { speed, fwd:p.vx*ca + p.vy*sa, side:p.vx*sa - p.vy*ca, max:DG.PLAYER.speed,
    crouch:p.blinkT > 0 && !dead, whip:V.zWhip || 0, recoil:V.recoil, hurt:V.zHurt, hurtSide:V.zHurtSide, dead:V.zDead || 0,
    reload:p.reloadT > 0 && !dead, holding:!!V.hold }, t, dt);
  V.zWhip = 0;
  // a footfall: a scuff of dust where it lands, and the sound of it
  if(mo.stepped && p.blinkT <= 0 && !dead){
    const side = (Math.floor(mo.ph/PI) % 2 ? 1 : -1)*0.12;
    FX.burst(p.x + sa*side + ca*0.15, 0.06, p.y - ca*side + sa*0.15, G.D.theme.mist > 0.4 ? 0x8a8aa8 : 0xa89a88, 3, 0.7, 0.2, 0.45, { up:0.5, drag:5 });
    V.play("step", { heavy:false, x:p.x, y:p.y });
  }
  if(dead && V.zDead > 0.3 && !V.zKnelt){ V.zKnelt = true; S.shake(0.25); FX.smoke(p.x, 0.1, p.y, 0x2a2420, 6, 0.5, 1.2, { spread:0.8, rise:0.3 }); V.play("step", { heavy:true, x:p.x, y:p.y }); }
  if(dead && V.zDead > 0.5 && Math.random() < 0.35) FX.emit(p.x + (Math.random() - 0.5)*0.6, 0.3 + Math.random()*0.9, p.y + (Math.random() - 0.5)*0.6, (Math.random() - 0.5)*0.2, 0.4 + Math.random()*0.5, (Math.random() - 0.5)*0.2, Math.random() < 0.6 ? 0xb36bff : 0xff8a3a, 0.12, 1.4, -0.1, 0.4);
  const flick = p.iframes > 0 && p.blinkT <= 0 && !dead ? (Math.sin(t*40) > 0 ? 1 : 0.35) : 1;
  M.fade(W, p.blinkT > 0 ? 0.25 : flick);
  if(p.blinkT > 0) FX.emit(p.x, 0.9, p.y, 0, 0, 0, 0xb36bff, 0.6, 0.25, 0, 0);
  M.tint(W, p.chill > 0 ? 0x2a6a8a : p.wards > 0 ? 0x101828 : 0x000000, 1);
  W.ring.material.opacity = 0.25 + 0.1*Math.sin(t*3);
  if(V.stars > 0){ V.stars -= dt; if(Math.random() < 0.4) FX.emit(p.x + Math.cos(t*9)*0.4, 2.3, p.y + Math.sin(t*9)*0.4, 0, 0, 0, 0xffe680, 0.25, 0.25, 0, 0); }
  // wards: little blue orbs circling
  if(p.wards > 0 && Math.random() < 0.3*p.wards){ const a = t*3 + Math.random(); FX.emit(p.x + Math.cos(a)*0.6, 1.1, p.y + Math.sin(a)*0.6, 0, 0.2, 0, 0x8ad8ff, 0.2, 0.3, 0, 1); }
  // the lantern is held a little forward and up, toward the camera: it lights his front
  // and the faces of what he walks toward, and shadows fall away from the viewer
  S.playerLight.position.set(px, 2.6, py + 0.85);
  // the lantern is his: he and his gun never throw its shadow (it would fill the room)
  W.root.traverse(o=>{ o.castShadow = false; });
  S.flash.intensity = Math.max(0, S.flash.intensity - dt*25);

  V.updateFrogs(dt, t);
  V.updatePortrait(dt, t);
  // the lily shield
  const g0 = G.gribbus;
  V.lily.visible = !!(g0 && g0.g.lily);
  if(V.lily.visible){ const lp = DG.Gribbus.lilyPos(G); V.lily.position.set(lp.x, 0, lp.y); V.lily.rotation.y = t*2; }

  V.updateEnemies(dt, t);
  V.updateLoot(dt, t);
  V.updateAllies(dt, t);
  V.updateHazards(dt, t);
  V.updateBeams(dt, t);

  if(V.portal){
    V.portal.children[1].rotation.z = t*2; V.portal.children[2].material.opacity = 0.6 + 0.2*Math.sin(t*4);
    if(Math.random() < 0.6){ const a = Math.random()*6.28; FX.emit(V.portal.position.x + Math.cos(a)*1.1, 0.1, V.portal.position.z + Math.sin(a)*1.1, -Math.cos(a)*0.8, 1.5, -Math.sin(a)*0.8, 0xb36bff, 0.3, 0.8, 0, 0.5); }
  }
  G.traps.forEach(tr=>{ if(tr.kind === "vent" && tr.state === "up" && Math.random() < 0.8) FX.emit(tr.x + 0.5 + (Math.random() - 0.5)*0.5, 0.1, tr.y + 0.5 + (Math.random() - 0.5)*0.5, 0, 4 + Math.random()*2, 0, Math.random() < 0.5 ? 0xff7a1a : 0xffd23d, 0.45, 0.45, 0, 1); });
  V.world.update(G, dt, t);
  // the ending takes Zippy and Gribbus over (js/render/ending.js)
  if(V.cine) V.cine.update(dt, t);
  FX.update(dt, G);
};

/* the close-up: Zippy and Gribbus idling and slowly turning, so whatever
   they wear (back included) comes round into view */
proto.updatePortrait = function(dt, t){
  const V = this, G = V.G, Z = V.pzZippy, F = V.pzFrog;
  if(Z){
    if(Z.gunKey !== W0gunKey(G)) M.setGun(Z, G.gun(), W0els(G));
    M.idle(Z, t, 0); M.animate(Z, t, 0);
    Z.root.rotation.y = Math.sin(t*0.45)*1.1;
    Z.parts.armR.rotation.x = -1.1; Z.parts.armL.rotation.x = -1.0 + Math.sin(t*2)*0.05;
    if(Z.parts.head) Z.parts.head.rotation.y = Math.sin(t*0.9)*0.25;
  }
  if(F){
    M.animate(F, t, 0);
    F.root.rotation.y = -0.5 + Math.sin(t*0.5 + 1)*0.8;
    M.hop(F, {}, t);
    if(F.parts.crown) F.parts.crown.visible = G.gribbus.buffs.indexOf("crown") >= 0;
  }
  const P = S.portrait.root.children; if(Z && P.indexOf(Z.root) < 0) S.portrait.root.add(Z.root);
};

proto.updateFrogs = function(dt, t){
  const V = this, G = V.G;
  // Gribbus wears his tricks: rebuild the frogs whenever he learns one
  const fk = G.gribbus.buffs.join(",");
  if(fk !== V.frogKey){
    V.frogKey = fk; V.frogs.forEach(R=> S.scene.remove(R.root)); V.frogs = [];
    const P = S.portrait;
    if(V.pzFrog) P.root.remove(V.pzFrog.root);
    V.pzFrog = M.frog(false, G.gribbus.buffs); V.pzFrog.root.position.set(0.72, 0, 0.7); V.pzFrog.root.scale.setScalar(1.15); P.root.add(V.pzFrog.root);
  }
  while(V.frogs.length < G.frogs.length){ const R = M.frog(V.frogs.length === 1, G.gribbus.buffs); R.root.add(shadowBlob(0.3)); S.scene.add(R.root); V.frogs.push(R); }
  G.frogs.forEach((f, i)=>{
    const R = V.frogs[i], g = G.gribbus.g;
    R.root.position.set(S.ix(f), f.hop || 0, S.iy(f));
    R.root.rotation.y += DG.wrapAngle(PI/2 - f.face - R.root.rotation.y)*(1 - Math.exp(-dt*12));
    const sz = (1 + 0.5*(g.size || 0))*(f.twin ? 0.9 : 1);
    R.root.scale.set(sz*1.3, sz*1.3*STRETCH, sz*1.3);
    // the hop: load, kick, reach, land hard (Models.hop)
    const mo = M.hop(R, { k:f.hopT > 0 && f.hopDur > 0 ? 1 - f.hopT/f.hopDur : -1, lick:R.lick > 0 ? 1 - R.lick/0.18 : 0 }, t + i*1.7, dt);
    if(mo.tookOff){ V.play("frogHop", { x:f.x, y:f.y }); FX.smoke(f.x, 0.05, f.y, 0x2a2420, 2, 0.3, 0.5, { spread:0.3, rise:0.15 }); }
    if(mo.landed){ V.play("frogLand", { x:f.x, y:f.y }); FX.burst(f.x, 0.05, f.y, G.D.theme.mist > 0.4 ? 0x8a8aa8 : 0xa89a88, 4, 1, 0.22, 0.45, { up:0.4, drag:5 }); }
    if(R.parts.crown) R.parts.crown.visible = !!g.dmg && G.gribbus.buffs.indexOf("crown") >= 0;
    M.animate(R, t, 0);
    // the tongue
    const tg = R.parts.tongue;
    if(R.lick > 0){
      R.lick -= dt;
      const d = Math.max(0.3, DG.dist(f.x, f.y, R.lickX, R.lickY)/(sz*1.3) - 0.2);
      tg.visible = true; tg.scale.set(1, 1, d*Math.sin(Math.max(0, R.lick)/0.18*PI));
      tg.parent.updateMatrixWorld();
    } else tg.visible = false;
    M.tint(R, g.mirrorEls ? ELC(G.gun().element) : 0x000000, g.mirrorEls ? 0.25 : 1);
  });
};

/* the bestiary's footfalls, swings and voices (all rate-limited: a room full
   of goblins is a rustle, not a drum roll) */
const SWING = { stab:1, charge:1, swipe:1, squat:1, spin:1, sweep:1, boo:1, throw:1, swell:1, spray:1 };
const MOAN = { goblin:"goblin", brute:"goblin", shroom:"shroom", puff:"shroom", stool:"shroom", husk:"shroom",
  ghost:"ghost", polt:"ghost", watcher:"flesh", blob:"flesh", tent:"flesh", crab:"flesh", spitter:"flesh", bloater:"flesh" };
proto.creepSounds = function(e, R, mo, t){
  const V = this;
  if(mo.step && t - (V.skitT || 0) > 1/6){ V.skitT = t; V.play("skitter", { x:e.x, y:e.y }); }
  if(mo.stomp){
    if(t - (V.stompT || 0) > 0.14){ V.stompT = t; V.play("stomp", { x:e.x, y:e.y }); }
    FX.smoke(e.x, 0.05, e.y, 0x2a2420, e.boss ? 4 : 2, e.boss ? 0.7 : 0.4, 0.7, { spread:e.r, rise:0.15 });
    if(e.boss) S.shake(0.1);
  }
  if(mo.struck && (SWING[mo.strikeKind] || e.boss)) V.play("swing", { x:e.x, y:e.y });
};
proto.updateMoans = function(dt){
  const V = this, G = V.G;
  V.moanT = (V.moanT === undefined ? 3 + Math.random()*5 : V.moanT) - dt;
  if(V.moanT > 0) return;
  const boss = G.enemies.find(e=> e.boss && !e.dead && e.spawn <= 0);
  V.moanT = boss ? 6 + Math.random()*5 : 8 + Math.random()*8;
  const live = G.enemies.filter(e=> !e.dead && !e.hidden && e.spawn <= 0 && V.rigs[e.id]);
  if(!live.length) return;
  const e = boss && Math.random() < 0.6 ? boss : live[Math.floor(Math.random()*live.length)], R = V.rigs[e.id];
  const fam = M.FAMILY[R.kind], kind = e.boss ? "boss" : R.kind === "banshee" ? "banshee" : MOAN[fam];
  if(!kind) return;
  R.act = 1;
  V.play("moan", { kind, x:e.x, y:e.y });
};
proto.updateEnemies = function(dt, t){
  const V = this, G = V.G, p = G.player;
  const live = {};
  G.enemies.forEach(e=>{
    if(e.dead) return;
    live[e.id] = 1;
    let R = V.rigs[e.id];
    if(!R){
      R = V.rigs[e.id] = V.takeRig(e.def.model || e.type);
      if(e.affix){
        const a = DG.AFFIXES[e.affix], sz = a.size || 1;
        const aura = new THREE.Mesh(K.glowPlane, K.glowMat(a.tint, 0.55)); aura.scale.set(2.4, 1, 2.4); aura.position.y = 0.05; R.root.add(aura); R.aura = aura;
      }
      R.shadow = shadowBlob(e.r); R.root.add(R.shadow);
      M.creep(R, { speed:0 }, t, 0);
      S.scene.add(R.root);
    }
    R.root.position.set(S.ix(e), 0, S.iy(e));
    const es = (e.affix && DG.AFFIXES[e.affix].size || 1)*(e.shrink || 1);
    R.root.scale.set(es, es*STRETCH, es);
    if(e.st.confused > 0 && Math.random() < 0.15){ const a = t*6 + e.id; FX.emit(e.x + Math.cos(a)*0.35, 1.4*(e.r/0.34) + 0.4, e.y + Math.sin(a)*0.35, 0, 0.3, 0, [0xffd23d, 0xff6ad8, 0x46e4ff][Math.floor(Math.random()*3)], 0.22, 0.35, 0, 1); }
    const want = PI/2 - e.face;
    R.root.rotation.y += DG.wrapAngle(want - R.root.rotation.y)*(1 - Math.exp(-dt*(e.def.speed ? 14 : 4)));
    if(e.spawn > 0){ const k = 1 - e.spawn/(e.boss ? 1.4 : 0.8); R.body.position.y = -1.2*(1 - k); M.fade(R, Math.max(0.1, k)); return; }
    const frozen = e.st.frozen > 0, stunned = e.st.stun > 0;
    // the wind-up, through to its release (Models.creep draws it back, holds it, lets it go)
    let tellK = -1;
    if(R.tell > 0){ R.tell -= dt; tellK = Math.min(1, 1 - Math.max(0, R.tell)/R.tellMax); }
    // burrowed tentacles sink into the floor
    if(e.def.ai === "tentacle"){ const want = e.hidden ? -1.8 : 0; R.sinkY = (R.sinkY || 0) + (want - (R.sinkY || 0))*(1 - Math.exp(-dt*12)); }
    let mo = null;
    if(!frozen){
      mo = M.creep(R, { speed:stunned ? 0 : Math.hypot(e.vx, e.vy), tell:tellK, tellKind:R.tellKind, flinch:e.flash, act:R.act, stunned,
        hop:e.hop, swell:e.swell, pulse:e.pulse, sink:e.def.ai === "tentacle" ? R.sinkY : undefined }, t, dt);
      R.act = 0;
      V.creepSounds(e, R, mo, t);
    }
    // the eye's lids close when it's invulnerable; it watches you, its gaze darting off and back
    if(R.parts.lidT){
      const want = e.invuln ? -0.02 : -1.35; R.parts.lidT.rotation.x += (want - R.parts.lidT.rotation.x)*(1 - Math.exp(-dt*10)); R.parts.lidB.rotation.x += (-want - R.parts.lidB.rotation.x)*(1 - Math.exp(-dt*10));
      if(R.parts.head){ R.parts.head.lookAt(p.x, 1.6, p.y); if(mo && mo.sacc !== undefined){ R.parts.head.rotateY(mo.sacc); R.parts.head.rotateX(mo.saccX); } }
    }
    if(R.shadow) R.shadow.material.opacity = e.hidden ? 0.1 : 0.5;
    let tc = 0x000000, tk = 1;
    if(e.flash > 0){ tc = 0xffffff; tk = e.boss ? 0.25 : 0.38; }
    else if(frozen) tc = 0x4ab8ff;
    else if(R.tell > 0) { const q = 1 - Math.max(0, R.tell)/R.tellMax; tc = 0xffe2b8; tk = 0.1 + 0.42*q*q + 0.05*Math.sin(t*14); }
    else if(e.st.trapped > 0) { tc = 0x8ae8ff; tk = 0.5; }
    else if(e.st.burn && e.st.burn.t > 0) { tc = 0xff5a1a; tk = 0.4 + 0.3*Math.sin(t*25 + e.id); }
    else if(e.st.poison && e.st.poison.stacks > 0) { tc = e.st.poison.plague ? 0x8aff2a : 0x4ab82a; tk = 0.3 + 0.25*Math.sin(t*5 + e.id); }
    else if(e.st.shocked > 0) { tc = 0xfff04a; tk = Math.random() < 0.3 ? 0.6 : 0.1; }
    else if(e.st.chill > 0) tc = 0x2a6a9a;
    else if(e.st.marked > 0) { tc = 0xb36bff; tk = 0.3; }
    else if(e.st.confused > 0) { tc = 0xff6ad8; tk = 0.2 + 0.15*Math.sin(t*9 + e.id); }
    M.tint(R, tc, tk);
    const ghostA = R.ghostly ? 0.72 : 1;
    M.fade(R, e.hidden ? (e.def.ai === "tentacle" ? 1 : 0.22 + 0.1*Math.sin(t*5 + e.id)) : e.decoy ? 0.6 : ghostA);
    if(e.hidden && e.def.ai === "sneak" && Math.random() < 0.25) FX.emit(e.x + (Math.random() - 0.5)*0.6, 0.3 + Math.random()*0.9, e.y + (Math.random() - 0.5)*0.6, 0, 0.3, 0, 0x9cff3a, 0.16, 0.4, 0, 1);
    if(R.aura) R.aura.material.opacity = 0.4 + 0.2*Math.sin(t*4 + e.id);
    if(e.st.trapped > 0 && Math.random() < 0.3) FX.emit(e.x + (Math.random() - 0.5)*0.8, 0.5 + Math.random()*0.8, e.y, 0, 0.4, 0, 0xb8f0ff, 0.3, 0.4, 0, 1);
    if(e.st.poison && e.st.poison.stacks > 0 && Math.random() < 0.08 + e.st.poison.stacks*0.02) FX.emit(e.x + (Math.random() - 0.5)*0.4, 0.9, e.y, 0, 0.8, 0, 0x7dff3a, 0.18, 0.6, 0, 0.5);
    if(e.st.burn && e.st.burn.t > 0 && Math.random() < 0.35) FX.emit(e.x + (Math.random() - 0.5)*0.4, 0.6, e.y, 0, 1.6, 0, 0xff7a1a, 0.3, 0.4, 0, 0.5);
    if(e.st.shocked > 0 && Math.random() < 0.15) FX.emit(e.x + (Math.random() - 0.5)*0.6, 0.6 + Math.random(), e.y, (Math.random() - 0.5)*3, 0, (Math.random() - 0.5)*3, 0xfff04a, 0.15, 0.15, 0, 3);
    if(stunned && !e.st.trapped && Math.random() < 0.3) FX.emit(e.x + Math.cos(t*9)*0.4, R.h + 0.6, e.y + Math.sin(t*9)*0.4, 0, 0, 0, 0xffe680, 0.22, 0.2, 0, 0);
  });
  for(const id in V.rigs) if(!live[id]){ S.scene.remove(V.rigs[id].root); delete V.rigs[id]; }
  V.updateMoans(dt);
  V.dying = V.dying.filter(d=>{
    d.t += dt;
    const R = d.R;
    if(d.fell || d.midas || d.decoy){
      if(d.fell){ R.root.position.y -= dt*6; R.root.rotation.x += dt*4; }
      else if(d.midas){ M.tint(R, 0xffc83a, 0.9); R.body.scale.setScalar(1 + d.t*0.3); }
      else { R.body.rotation.x = Math.min(PI/2, d.t*6); M.tint(R, 0x000000, 1); }
      M.fade(R, Math.max(0, 1 - Math.max(0, d.t - 0.5)*2));
      if(d.t > 1.1){ S.scene.remove(R.root); return false; }
      return true;
    }
    if(!V.dissolve(d, dt, t)){ S.scene.remove(R.root); return false; }
    return true;
  });
};

/* a death, Souls style: the thing staggers, its legs go, it falls (haunts and
   floating things rise instead), and then it comes apart into drifting ash and
   a few embers. A boss holds on longer, sinks, and its soul leaves in a column
   of pale light. Only transforms and the dither fade: nothing is rebuilt. */
const DIE = { grunt:"goblin", slinger:"goblin", bomber:"goblin", shaman:"goblin", brute:"goblin", sneak:"goblin", merchant:"goblin", king:"goblin",
  puffling:"shroom", toadstool:"shroom", shroomkin:"shroom", shroomlet:"shroom", matriarch:"shroom",
  ghost:"haunt", banshee:"haunt", skeleton:"haunt", poltergeist:"haunt", bride:"haunt",
  watcher:"weird", blob:"weird", blobling:"weird", tentacle:"weird", eye:"weird",
  rotling:"gloom", spitter:"gloom", bloater:"gloom", husk:"gloom", heart:"gloom" };
const RISE = { ghost:1, banshee:1, poltergeist:1, bride:1, watcher:1, eye:1 };
const SOUL = { ghost:0xa8c8e8, banshee:0xa8b8f0, poltergeist:0x9cffc8, bride:0xb8d0ff, watcher:0xff8a9a, eye:0xff8a9a };
proto.dissolve = function(d, dt, t){
  const R = d.R, b = R.body, P = R.parts, boss = d.boss;
  if(d.dur === undefined){
    d.dur = boss ? 4 : 1.9; d.dir = Math.random() < 0.7 ? 1 : -1; d.side = (Math.random() - 0.5)*0.5;
    d.rise = !!RISE[R.kind]; d.sc = R.root.scale.x; d.h = (R.h || 1.4)*R.root.scale.y; d.r = Math.max(0.25, (R.size || 1)*0.3)*d.sc;
    d.b0 = { y:b.position.y, rx:b.rotation.x, rz:b.rotation.z }; d.hx = P.head ? P.head.rotation.x : 0;
    d.aR = P.armR ? P.armR.rotation.x : 0; d.aL = P.armL ? P.armL.rotation.x : 0;
  }
  const k = d.t, sz = R.size || 1;
  if(k > d.dur) return false;
  const fade = smooth(boss ? 1.9 : 0.75, d.dur, k);
  if(d.rise){
    // haunts don't fall: they jerk, hang, and are drawn up and thin out to nothing
    const jerk = k < 0.3 ? Math.sin(k/0.3*PI)*0.25 : 0, up = smooth(0.2, d.dur, k);
    b.rotation.x = d.b0.rx - jerk + 0.3*up; b.rotation.z = d.b0.rz + Math.sin(k*9)*0.05*(1 - up);
    R.root.position.y = 0.9*up*up*sz;
    if(Math.random() < (boss ? 1 : 0.6)) FX.ash(d.x, d.y, d.r, d.h*0.8, boss ? 3 : 1, { pale:true, col:SOUL[R.kind], y0:R.root.position.y + 0.2 });
  } else {
    // a stagger back, the legs go, the body falls; then it settles and crumbles
    const stag = k < 0.35 ? Math.sin(k/0.35*PI) : 0;
    const fall = boss ? smooth(0.6, 1.6, k) : smooth(0.22, 0.75, k);
    const drop = boss ? 0.42*fall : 1.35*fall*fall;
    b.rotation.x = d.b0.rx - 0.32*stag + d.dir*drop + (boss ? Math.sin(k*31)*0.03*(1 - fade) : 0);
    b.rotation.z = d.b0.rz + d.side*fall + (k < 0.4 ? Math.sin(k*40)*0.05*(1 - k/0.4) : 0);
    b.position.y = d.b0.y - (boss ? 0.3*sz*fall : 0.06*sz*fall) - 0.12*sz*fade;
    if(P.head) P.head.rotation.x = d.hx - 0.4*stag + 0.5*fall;
    if(P.armR) P.armR.rotation.x = d.aR + (0.6 - d.aR*0.4)*fall;
    if(P.armL) P.armL.rotation.x = d.aL + (0.5 - d.aL*0.4)*fall;
    if(!d.thud && fall > 0.97){ d.thud = true; FX.smoke(d.x, 0.05, d.y, 0x2a2420, boss ? 10 : 3, boss ? 0.9 : 0.45, 0.9, { spread:d.r*2, rise:0.15 }); if(boss) S.shake(0.5); }
    // ash and embers, thickest as it goes
    const rate = (boss ? 3 : 1)*smooth(0.5, 1.2, k)*(1 - 0.6*fade);
    if(Math.random() < rate) FX.ash(d.x, d.y, d.r*1.4, d.h*(0.7 - 0.4*fade), boss ? 3 : 1, { embers:0.3 });
  }
  // the colour goes out of it, an ember glow runs through, then the dither eats it away
  const glow = smooth(0.5, 1.0, k)*(1 - fade);
  M.tint(R, glow > 0.02 ? (d.rise ? SOUL[R.kind] || 0xa8c8e8 : 0xff3a08) : 0x000000, glow > 0.02 ? (d.rise ? 0.3 : 0.2)*glow : 1);
  M.fade(R, 1 - fade);
  // a boss's soul: the column of light, once
  if(boss && !d.soul && k > 1.5){ d.soul = true; FX.soul(d.x, d.y, 10, 2.6, SOUL[R.kind] || 0xfff0d0); FX.ring(d.x, d.y, 4, 0xd8c8a0, 1.2); S.shake(0.6); }
  return true;
};
const smooth = (a, b, x)=>{ const k = Math.max(0, Math.min(1, (x - a)/(b - a))); return k*k*(3 - 2*k); };

proto.updateLoot = function(dt, t){
  const V = this, G = V.G, pk = {};
  G.pickups.forEach(k=>{
    pk[k.id] = 1;
    let o = V.pickups[k.id];
    if(!o){ o = V.pickups[k.id] = M.pickup(k); S.scene.add(o); }
    o.position.set(S.ix(k) + (o.userData.buzz ? Math.sin(t*7 + k.id)*0.15 : 0), (o.userData.hover || 0.3) + Math.sin(t*3 + k.id)*0.08, S.iy(k));
    o.rotation.y = t*(o.userData.spin || 1);
  });
  for(const id in V.pickups) if(!pk[id]){ S.scene.remove(V.pickups[id]); delete V.pickups[id]; }
};

proto.updateAllies = function(dt, t){
  const V = this, G = V.G, live = {};
  G.allies.forEach(a=>{
    live[a.id] = 1;
    let o = V.allies[a.id];
    if(!o){ o = V.allies[a.id] = { g:allyMesh(a) }; S.scene.add(o.g); }
    const y = o.g.userData.y || 0;
    o.g.position.set(S.ix(a), y + (a.kind === "wisp" ? Math.sin(t*6 + a.id)*0.12 : 0), S.iy(a));
    if(Math.hypot(a.vx, a.vy) > 0.1) o.g.rotation.y = Math.atan2(a.vx, a.vy);
    if(a.kind === "wisp" && Math.random() < 0.5) FX.emit(a.x, y, a.y, 0, 0.1, 0, ELC(a.el), 0.3, 0.3, 0, 1);
    if(a.kind === "shadow"){ const R = o.g.userData.rig, p = G.player; o.g.rotation.y = PI/2 - p.aim; if(R.gunKey !== W0gunKey(G)){ M.setGun(R, G.gun(), W0els(G)); } M.idle(R, t, Math.hypot(p.vx, p.vy)); }
    if(a.kind === "tadpole") o.g.children.forEach(c=>{ if(c.userData.baked) c.rotation.y = Math.sin(t*20 + a.id)*0.3; });
    if(a.kind === "bee"){ o.g.position.y = y + Math.sin(t*14 + a.id)*0.1; o.g.userData.wings.forEach((w, i)=> w.rotation.z = Math.sin(t*60)*0.6*(i ? -1 : 1)); }
    if(a.kind === "ghoul"){ M.idle(o.g.userData.rig, t, Math.hypot(a.vx, a.vy)); o.g.position.y = 0.15 + Math.sin(t*3 + a.id)*0.08; if(Math.random() < 0.2) FX.emit(a.x, 0.6, a.y, 0, 0.6, 0, 0x6aff9a, 0.25, 0.4, 0, 1); }
    if(a.kind === "hat"){ o.g.rotation.y = t*14; o.g.rotation.z = 0.35; if(Math.random() < 0.6) FX.emit(a.x, 0.9, a.y, 0, 0, 0, 0xb36bff, 0.3, 0.3, 0, 1); }
  });
  for(const id in V.allies) if(!live[id]){ FX.burst(V.allies[id].g.position.x, 0.8, V.allies[id].g.position.z, 0xffffff, 5, 2, 0.2, 0.3); S.scene.remove(V.allies[id].g); delete V.allies[id]; }
};

proto.updateHazards = function(dt, t){
  const V = this, G = V.G, live = {};
  // the more hazards, the thinner each one's spray of particles (fifty clouds each puffing
  // every frame buried the screen in overlapping smoke: the late-game lag)
  const thin = Math.min(1, 5/Math.max(1, G.hazards.length));
  G.hazards.forEach(h=>{
    live[h.id] = 1;
    let o = V.hazards[h.id];
    if(!o){ o = V.hazards[h.id] = { g:hazardMesh(h) }; o.g.position.set(h.x, 0, h.y); S.scene.add(o.g); }
    const k = Math.max(0, h.t/h.max), u = o.g.userData;
    if(h.kind === "icicle") o.g.scale.setScalar(Math.min(1, (1 - k)*6 + 0.2));
    if(u.fire && Math.random() < thin*0.7){ const a = Math.random()*6.28, d = Math.random()*h.r; FX.emit(h.x + Math.cos(a)*d, 0.1, h.y + Math.sin(a)*d, 0, 2 + Math.random()*2, 0, Math.random() < 0.6 ? 0xff7a1a : 0xffd23d, 0.4, 0.45, 0, 1); }
    if(u.cloud && Math.random() < thin*0.8){ const a = Math.random()*6.28, d = Math.sqrt(Math.random())*h.r; FX.emit(h.x + Math.cos(a)*d, 0.15 + Math.random()*0.5, h.y + Math.sin(a)*d, (Math.random() - 0.5)*0.3, 0.3 + Math.random()*0.4, (Math.random() - 0.5)*0.3, u.cloud, 0.7, 1.0, 0, 0.5); }
    if(u.bubbles && Math.random() < thin*0.2) FX.emit(h.x + (Math.random() - 0.5)*h.r, 0.08, h.y + (Math.random() - 0.5)*h.r, 0, 0.5, 0, u.bubbles, 0.2, 0.4, 0, 1);
    if(u.spin) u.spin.rotation.z += dt*4;
    if(u.bubble) u.bubble.scale.setScalar(0.5 + 0.6*Math.abs(Math.sin(t*1.7 + h.id)));
    if(u.suck && Math.random() < thin*0.9){ const a = Math.random()*6.28; FX.emit(h.x + Math.cos(a)*2.5, 0.8, h.y + Math.sin(a)*2.5, -Math.cos(a)*6, 0, -Math.sin(a)*6, 0xb36bff, 0.2, 0.4, 0, 0); }
    if(u.wave){ const r = h.r*(1 - k); u.wave.scale.setScalar(Math.max(0.01, r)); u.wave.material.opacity = 0.85*k; }
    o.g.children.forEach(c=>{ if(c.material && c.material.transparent && !u.wave && h.kind !== "icicle"){ c.material.opacity = Math.min(c.userData.op0 === undefined ? (c.userData.op0 = c.material.opacity) : c.userData.op0, k*3*(c.userData.op0)); } });
  });
  for(const id in V.hazards) if(!live[id]){ S.scene.remove(V.hazards[id].g); delete V.hazards[id]; }
};

proto.updateBeams = function(dt, t){
  const V = this, G = V.G, live = {};
  G.beams.forEach(b=>{
    live[b.id] = 1;
    let m = V.beams[b.id];
    if(!m){
      m = new THREE.Group();
      const core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color:0xff2a4a, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
      core.geometry.translate(0.5, 0, 0); core.rotation.x = -PI/2; m.add(core); m.userData.core = core;
      const white = core.clone(); white.material = core.material.clone(); white.material.color.setHex(0xffffff); white.position.y = 0.01; m.add(white); m.userData.white = white;
      S.scene.add(m); V.beams[b.id] = m;
    }
    m.position.set(b.x, 0.9, b.y);
    m.rotation.y = -b.a;
    const L = b.len || 1;
    if(b.live){
      m.userData.core.scale.set(L, b.w*2.6, 1); m.userData.core.material.opacity = 0.75 + 0.2*Math.sin(t*40);
      m.userData.white.scale.set(L, b.w*0.9, 1); m.userData.white.material.opacity = 0.9;
      if(Math.random() < 0.6){ const d = Math.random()*L; FX.emit(b.x + Math.cos(b.a)*d, 0.9, b.y + Math.sin(b.a)*d, (Math.random() - 0.5)*2, 1, (Math.random() - 0.5)*2, 0xff4a6a, 0.3, 0.3, 0, 2); }
    } else {
      const k = b.t/b.tell;
      m.userData.core.scale.set(L, 0.08 + k*0.1, 1); m.userData.core.material.opacity = 0.3 + 0.5*Math.abs(Math.sin(t*20*(0.5 + k)));
      m.userData.white.scale.set(L, 0.02, 1); m.userData.white.material.opacity = 0.3;
    }
  });
  for(const id in V.beams) if(!live[id]){ S.scene.remove(V.beams[id]); delete V.beams[id]; }
};

})();
