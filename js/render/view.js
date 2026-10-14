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
  V.pzZippy = M.zippy(look); V.pzZippy.gunKey = null; V.pzZippy.root.position.x = -0.38; P.root.add(V.pzZippy.root);
};
/* the camera looks down at an angle, which squashes anything standing up:
   characters are drawn a little taller to make up for it */
const STRETCH = 1.16, HERO = 1.2;
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
  FX.clear();
};

/* ---- events ---- */
proto.handle = function(ev){
  const V = this, G = V.G, p = G.player, au = A();
  const play = (n, o)=> au && !V.silent && au.play(n, o);
  switch(ev.type){
    case "floor": if(ev.floor !== V.floor) V.buildFloor(); play("descend"); break;
    case "shoot": {
      if(ev.from === "player" || !ev.from){
        const m = V.player.muzzle, w = new THREE.Vector3(); m.getWorldPosition(w);
        FX.burst(w.x, w.y, w.z, ELC(ev.el), ev.base === "shotgun" ? 8 : 3, 3, 0.25, 0.15, { col2:0xffffff });
        S.flash.position.set(w.x, w.y + 0.3, w.z); S.flash.color.setHex(ELC(ev.el)); S.flash.intensity = ev.base === "shotgun" || ev.base === "launcher" ? 2.5 : 1.2;
        V.recoil = ev.base === "shotgun" || ev.base === "rifle" || ev.base === "launcher" ? 1 : 0.4;
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
      if(R){ delete V.rigs[ev.id]; V.dying.push({ R, t:0, fell:ev.fell, boss:ev.boss, midas:ev.midas, decoy:ev.decoy }); }
      const col = ev.midas ? 0xffd23d : ev.decoy ? 0xd8e8ff : 0x7ad84a;
      FX.burst(ev.x, 0.6, ev.y, col, ev.boss ? 60 : 14, ev.boss ? 9 : 4.5, 0.3, 0.6, { grav:9, col2:ev.midas ? 0xffffff : 0xffe14a });
      if(ev.boss){ S.shake(1); FX.ring(ev.x, ev.y, 7, 0xffd23d, 1.2); }
      play(ev.boss ? "bossdie" : ev.fell ? "fall" : ev.decoy ? "poof" : "kill");
      break;
    }
    case "hurt": S.shake(0.35); FX.burst(p.x, 0.9, p.y, 0xff3a4a, 10, 4, 0.25, 0.35); play("hurt"); break;
    case "wardBreak": S.shake(0.2); FX.ring(p.x, p.y, 1.6, 0x8ad8ff, 0.35); FX.burst(p.x, 0.9, p.y, 0x8ad8ff, 16, 4, 0.25, 0.4); play("ward"); break;
    case "ward": FX.rise(p.x, p.y, 0x8ad8ff, 10, 0.5); play("pickup"); break;
    case "death": S.shake(0.8); FX.burst(p.x, 0.9, p.y, 0xb36bff, 40, 6, 0.35, 1.2, { grav:4 }); play("death"); break;
    case "heal": FX.rise(ev.x, ev.y, 0x5aff8a, 12, 0.5); play("heal"); break;
    case "blink": FX.burst(ev.x, 0.8, ev.y, 0xb36bff, 14, 3, 0.3, 0.35, { col2:0xffffff }); play("blink"); break;
    case "blinkEnd": FX.burst(ev.x, 0.8, ev.y, 0xb36bff, 10, 2.5, 0.25, 0.3); break;
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
    case "trap": play(ev.kind === "spikes" ? "spikes" : "dart"); break;
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
  if(G.state !== "dead") V.player.look.auras.forEach(a=> AURA[a] && AURA[a](p.x, p.y, t));
  const W = V.player;
  W.root.position.set(p.x, 0, p.y);
  W.root.rotation.y = PI/2 - p.aim;
  const gunEls = [G.gun().element].concat(G.mods.els.filter(e=> e !== G.gun().element));
  if(W.gunKey !== G.gun().uid + ":" + gunEls.join(",")) M.setGun(W, G.gun(), gunEls);
  // holding up what he just found (Isaac's pose); a transformation spins him round
  if(V.hold){
    V.hold.t -= dt;
    const k = V.hold.t, up = Math.min(1, (1.4 - k)*6, k*5);
    W.parts.armL.rotation.x = -1.0 - 1.9*up; W.parts.armL.rotation.z = -0.3 + 0.25*up;
    V.hold.g.position.set(p.x, 2.95 + 0.25*up + Math.sin(t*4)*0.05, p.y); V.hold.g.rotation.y = t*2; V.hold.g.scale.setScalar(Math.max(0.01, up)*1.3);
    if(k <= 0){ S.scene.remove(V.hold.g); V.hold = null; W.parts.armL.rotation.z = -0.3; }
  }
  if(V.spinT > 0){ V.spinT -= dt; W.root.rotation.y += (1 - V.spinT/1.4)*PI*4*dt*3; }
  const speed = Math.hypot(p.vx, p.vy);
  M.idle(W, t, p.blinkT > 0 ? 0 : speed);
  M.animate(W, t, speed);
  // little puffs of dust where Zippy steps
  V.stride = (V.stride || 0) + speed*dt;
  if(V.stride > 0.75 && p.blinkT <= 0){ V.stride = 0; FX.burst(p.x + (Math.random() - 0.5)*0.3, 0.06, p.y + (Math.random() - 0.5)*0.3, G.D.theme.mist > 0.4 ? 0x8a8aa8 : 0xa89a88, 3, 0.7, 0.2, 0.45, { up:0.5, drag:5 }); }
  V.recoil = Math.max(0, (V.recoil || 0) - dt*8);
  W.parts.armR.rotation.x = -1.1 - V.recoil*0.25 + (p.reloadT > 0 ? 0.7 + Math.sin(t*20)*0.1 : 0);
  if(!V.hold) W.parts.armL.rotation.x = -1.0 + Math.sin(t*2)*0.05;
  if(W.parts.beard) W.parts.beard.rotation.x = Math.sin(t*3)*0.05 + speed*0.02;
  const flick = p.iframes > 0 && p.blinkT <= 0 ? (Math.sin(t*40) > 0 ? 1 : 0.35) : 1;
  M.fade(W, p.blinkT > 0 ? 0.25 : flick);
  if(p.blinkT > 0) FX.emit(p.x, 0.9, p.y, 0, 0, 0, 0xb36bff, 0.6, 0.25, 0, 0);
  M.tint(W, p.chill > 0 ? 0x2a6a8a : p.wards > 0 ? 0x101828 : 0x000000, 1);
  W.ring.material.opacity = 0.25 + 0.1*Math.sin(t*3);
  if(V.stars > 0){ V.stars -= dt; if(Math.random() < 0.4) FX.emit(p.x + Math.cos(t*9)*0.4, 2.3, p.y + Math.sin(t*9)*0.4, 0, 0, 0, 0xffe680, 0.25, 0.25, 0, 0); }
  // wards: little blue orbs circling
  if(p.wards > 0 && Math.random() < 0.3*p.wards){ const a = t*3 + Math.random(); FX.emit(p.x + Math.cos(a)*0.6, 1.1, p.y + Math.sin(a)*0.6, 0, 0.2, 0, 0x8ad8ff, 0.2, 0.3, 0, 1); }
  W.root.visible = G.state !== "dead";
  S.playerLight.position.set(p.x, 2.2, p.y + 0.3);
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
    F.body.scale.set(1 + Math.sin(t*3)*0.03, 1 - Math.sin(t*3)*0.03, 1);
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
    R.root.position.set(f.x, f.hop || 0, f.y);
    R.root.rotation.y += DG.wrapAngle(PI/2 - f.face - R.root.rotation.y)*(1 - Math.exp(-dt*12));
    const sz = (1 + 0.5*(g.size || 0))*(f.twin ? 0.9 : 1);
    R.root.scale.set(sz*1.3, sz*1.3*STRETCH, sz*1.3);
    // squash on landing, stretch in the air
    const air = (f.hop || 0) > 0.05;
    R.body.scale.set(air ? 0.9 : 1 + Math.sin(t*3 + i)*0.03, air ? 1.15 : 1 - Math.sin(t*3 + i)*0.03, air ? 1.1 : 1);
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

proto.updateEnemies = function(dt, t){
  const V = this, G = V.G, p = G.player;
  const live = {};
  G.enemies.forEach(e=>{
    if(e.dead) return;
    live[e.id] = 1;
    let R = V.rigs[e.id];
    if(!R){
      R = V.rigs[e.id] = M.enemy(e.def.model || e.type);
      if(e.affix){
        const a = DG.AFFIXES[e.affix], sz = a.size || 1;
        const aura = new THREE.Mesh(K.glowPlane, K.glowMat(a.tint, 0.55)); aura.scale.set(2.4, 1, 2.4); aura.position.y = 0.05; R.root.add(aura); R.aura = aura;
      }
      R.shadow = shadowBlob(e.r); R.root.add(R.shadow);
      S.scene.add(R.root);
    }
    R.root.position.set(e.x, 0, e.y);
    const es = (e.affix && DG.AFFIXES[e.affix].size || 1)*(e.shrink || 1);
    R.root.scale.set(es, es*STRETCH, es);
    if(e.st.confused > 0 && Math.random() < 0.15){ const a = t*6 + e.id; FX.emit(e.x + Math.cos(a)*0.35, 1.4*(e.r/0.34) + 0.4, e.y + Math.sin(a)*0.35, 0, 0.3, 0, [0xffd23d, 0xff6ad8, 0x46e4ff][Math.floor(Math.random()*3)], 0.22, 0.35, 0, 1); }
    const want = PI/2 - e.face;
    R.root.rotation.y += DG.wrapAngle(want - R.root.rotation.y)*(1 - Math.exp(-dt*(e.def.speed ? 14 : 4)));
    if(e.spawn > 0){ const k = 1 - e.spawn/(e.boss ? 1.4 : 0.8); R.body.position.y = -1.2*(1 - k); M.fade(R, Math.max(0.1, k)); return; }
    const frozen = e.st.frozen > 0, stunned = e.st.stun > 0;
    if(!frozen) M.idle(R, t, stunned ? 0 : Math.hypot(e.vx, e.vy));
    if(R.tell > 0){
      R.tell -= dt;
      const k = 1 - Math.max(0, R.tell)/R.tellMax;
      R.body.rotation.x = -0.3*k; R.body.position.x = Math.sin(t*60)*0.03*k;
      if(R.parts.armR) R.parts.armR.rotation.x = -2.2*k;
    } else {
      R.body.rotation.x *= 0.8; R.body.position.x = 0;
      if(R.parts.armR) R.parts.armR.rotation.x *= 0.85;
    }
    if(e.hop) R.body.position.y = e.hop;
    if(e.swell) R.body.scale.setScalar(1 + e.swell*0.5);
    if(e.pulse !== undefined && R.parts.head) R.parts.head.scale.setScalar(1 + e.pulse*0.12);
    // the eye's lids close when it's invulnerable
    if(R.parts.lidT){ const want = e.invuln ? -0.02 : -1.35; R.parts.lidT.rotation.x += (want - R.parts.lidT.rotation.x)*(1 - Math.exp(-dt*10)); R.parts.lidB.rotation.x += (-want - R.parts.lidB.rotation.x)*(1 - Math.exp(-dt*10)); if(R.parts.head) R.parts.head.lookAt(p.x, 1.6, p.y); }
    // burrowed tentacles sink into the floor
    if(e.def.ai === "tentacle"){ const want = e.hidden ? -1.8 : 0; R.body.position.y += (want - R.body.position.y)*(1 - Math.exp(-dt*12)); }
    if(R.shadow) R.shadow.material.opacity = e.hidden ? 0.1 : 0.5;
    let tc = 0x000000, tk = 1;
    if(e.flash > 0){ tc = 0xffffff; tk = e.boss ? 0.25 : 0.38; }
    else if(frozen) tc = 0x4ab8ff;
    else if(R.tell > 0) { tc = 0xffffff; tk = 0.35 + 0.3*Math.sin(t*30); }
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
  V.dying = V.dying.filter(d=>{
    d.t += dt;
    const R = d.R;
    if(d.fell){ R.root.position.y -= dt*6; R.root.rotation.x += dt*4; }
    else if(d.midas){ M.tint(R, 0xffc83a, 0.9); R.body.scale.setScalar(1 + d.t*0.3); }
    else { R.body.rotation.x = Math.min(PI/2, d.t*6); R.body.position.y = -Math.max(0, d.t - 0.6)*0.8; M.tint(R, 0x000000, 1); }
    M.fade(R, Math.max(0, 1 - Math.max(0, d.t - (d.boss ? 1.5 : 0.5))*2));
    if(d.t > (d.boss ? 2.2 : 1.1)){ S.scene.remove(R.root); return false; }
    return true;
  });
};

proto.updateLoot = function(dt, t){
  const V = this, G = V.G, pk = {};
  G.pickups.forEach(k=>{
    pk[k.id] = 1;
    let o = V.pickups[k.id];
    if(!o){ o = V.pickups[k.id] = M.pickup(k); S.scene.add(o); }
    o.position.set(k.x + (o.userData.buzz ? Math.sin(t*7 + k.id)*0.15 : 0), (o.userData.hover || 0.3) + Math.sin(t*3 + k.id)*0.08, k.y);
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
    o.g.position.set(a.x, y + (a.kind === "wisp" ? Math.sin(t*6 + a.id)*0.12 : 0), a.y);
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
  G.hazards.forEach(h=>{
    live[h.id] = 1;
    let o = V.hazards[h.id];
    if(!o){ o = V.hazards[h.id] = { g:hazardMesh(h) }; o.g.position.set(h.x, 0, h.y); S.scene.add(o.g); }
    const k = Math.max(0, h.t/h.max), u = o.g.userData;
    if(h.kind === "icicle") o.g.scale.setScalar(Math.min(1, (1 - k)*6 + 0.2));
    if(u.fire && Math.random() < 0.7){ const a = Math.random()*6.28, d = Math.random()*h.r; FX.emit(h.x + Math.cos(a)*d, 0.1, h.y + Math.sin(a)*d, 0, 2 + Math.random()*2, 0, Math.random() < 0.6 ? 0xff7a1a : 0xffd23d, 0.4, 0.45, 0, 1); }
    if(u.cloud && Math.random() < 0.8){ const a = Math.random()*6.28, d = Math.sqrt(Math.random())*h.r; FX.emit(h.x + Math.cos(a)*d, 0.15 + Math.random()*0.5, h.y + Math.sin(a)*d, (Math.random() - 0.5)*0.3, 0.3 + Math.random()*0.4, (Math.random() - 0.5)*0.3, u.cloud, 0.7, 1.0, 0, 0.5); }
    if(u.bubbles && Math.random() < 0.2) FX.emit(h.x + (Math.random() - 0.5)*h.r, 0.08, h.y + (Math.random() - 0.5)*h.r, 0, 0.5, 0, u.bubbles, 0.2, 0.4, 0, 1);
    if(u.spin) u.spin.rotation.z += dt*4;
    if(u.bubble) u.bubble.scale.setScalar(0.5 + 0.6*Math.abs(Math.sin(t*1.7 + h.id)));
    if(u.suck && Math.random() < 0.9){ const a = Math.random()*6.28; FX.emit(h.x + Math.cos(a)*2.5, 0.8, h.y + Math.sin(a)*2.5, -Math.cos(a)*6, 0, -Math.sin(a)*6, 0xb36bff, 0.2, 0.4, 0, 0); }
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
