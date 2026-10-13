/* ------------------------------------------------------------------ *
 *  The view: plays the game's state and events back as a picture.
 *  It reads; it never changes the game.
 *
 *  - one rig per goblin, made when it spawns, falling over when it dies
 *  - the wizard, turned to the cursor, flickering while untouchable
 *  - coins, hearts, loot with beams in its rarity's colour
 *  - every event (hits, booms, tells, bonks) turned into sparks,
 *    rings, shakes and sounds
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, S = DG.Stage, FX = DG.FX, M = DG.Models;
const A = ()=> DG.Audio;

const View = DG.View = function(G){
  const V = this;
  V.G = G; V.rigs = {}; V.dying = []; V.pickups = {}; V.floor = 0;
  V.player = M.wizard(); S.scene.add(V.player.root);
  V.player.ring = new THREE.Mesh(K.glowPlane, K.glowMat(0xb36bff, 0.35)); V.player.ring.scale.set(2.2, 1, 2.2); V.player.ring.position.y = 0.04;
  V.player.root.add(V.player.ring);
  V.portal = null;
  V.buildFloor();
};
const proto = View.prototype;

proto.buildFloor = function(){
  const V = this, G = V.G;
  if(V.world){ S.scene.remove(V.world.group); V.world.dispose(); }
  for(const id in V.rigs) S.scene.remove(V.rigs[id].root); V.rigs = {};
  V.dying.forEach(d=> S.scene.remove(d.R.root)); V.dying = [];
  for(const id in V.pickups) S.scene.remove(V.pickups[id]); V.pickups = {};
  if(V.portal){ S.scene.remove(V.portal); V.portal = null; }
  FX.clear();
  V.world = new DG.World(G.D);
  S.scene.add(V.world.group);
  S.theme(G.D.theme);
  V.floor = G.floor;
  S.follow(G.player.x, G.player.y, G.player.x, G.player.y, true);
};

proto.dispose = function(){
  const V = this;
  if(V.world){ S.scene.remove(V.world.group); V.world.dispose(); }
  for(const id in V.rigs) S.scene.remove(V.rigs[id].root);
  V.dying.forEach(d=> S.scene.remove(d.R.root));
  for(const id in V.pickups) S.scene.remove(V.pickups[id]);
  if(V.portal) S.scene.remove(V.portal);
  S.scene.remove(V.player.root);
  FX.clear();
};

/* ---- events ---- */
const ELC = el=> el && DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
proto.handle = function(ev){
  const V = this, G = V.G, p = G.player, au = A();
  const play = (n, o)=> au && au.play(n, o);
  switch(ev.type){
    case "floor": if(ev.floor !== V.floor) V.buildFloor(); play("descend"); break;
    case "shoot": {
      const m = V.player.muzzle, w = new THREE.Vector3(); m.getWorldPosition(w);
      FX.burst(w.x, w.y, w.z, ELC(ev.el), ev.base === "shotgun" ? 8 : 3, 3, 0.25, 0.15, { col2:0xffffff });
      S.flash.position.set(w.x, w.y + 0.3, w.z); S.flash.color.setHex(ELC(ev.el)); S.flash.intensity = ev.base === "shotgun" || ev.base === "launcher" ? 2.5 : 1.2;
      V.recoil = ev.base === "shotgun" || ev.base === "rifle" || ev.base === "launcher" ? 1 : 0.4;
      if(ev.base === "shotgun" || ev.base === "launcher") S.shake(0.12);
      play("shoot_" + ev.base, { el:ev.el });
      break;
    }
    case "spell":
      FX.rise(ev.x, ev.y, ELC(ev.el), 18, 0.7, { v:2 });
      FX.ring(ev.x, ev.y, 1.4, ELC(ev.el), 0.4);
      play("spell_" + ev.spell);
      break;
    case "nomana": play("error"); break;
    case "hit":
      FX.burst(ev.x, 0.8, ev.y, ELC(ev.el), ev.crit ? 10 : 4, ev.crit ? 6 : 3.5, 0.22, 0.25);
      play(ev.crit ? "crit" : "hit", { el:ev.el });
      break;
    case "pop":
      if(ev.team === "p") FX.burst(ev.x, 0.75, ev.y, ELC(ev.el), 3, 2.5, 0.18, 0.18);
      else FX.burst(ev.x, 0.6, ev.y, 0xff3a8a, 3, 2, 0.18, 0.18);
      break;
    case "bounce": FX.burst(ev.x, 0.75, ev.y, 0xffffff, 3, 3, 0.15, 0.15); play("bounce"); break;
    case "kill": {
      const R = V.rigs[ev.id];
      if(R){ delete V.rigs[ev.id]; V.dying.push({ R, t:0, fell:ev.fell, boss:ev.boss }); }
      FX.burst(ev.x, 0.6, ev.y, 0x7ad84a, ev.boss ? 60 : 14, ev.boss ? 9 : 4.5, 0.3, 0.6, { grav:9, col2:0xffe14a });
      if(ev.boss){ S.shake(1); FX.ring(ev.x, ev.y, 7, 0xffd23d, 1.2); }
      play(ev.boss ? "bossdie" : ev.fell ? "fall" : "kill");
      break;
    }
    case "hurt":
      S.shake(0.35); FX.burst(p.x, 0.9, p.y, 0xff3a4a, 10, 4, 0.25, 0.35);
      play("hurt");
      break;
    case "death": S.shake(0.8); FX.burst(p.x, 0.9, p.y, 0xb36bff, 40, 6, 0.35, 1.2, { grav:4 }); play("death"); break;
    case "heal": FX.rise(ev.x, ev.y, 0x5aff8a, 12, 0.5); play("heal"); break;
    case "blink":
      FX.burst(ev.x, 0.8, ev.y, 0xb36bff, 14, 3, 0.3, 0.35, { col2:0xffffff });
      play("blink");
      break;
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
      play(ev.kind === "charge" || ev.kind === "squat" ? "tellBig" : "tell");
      break;
    }
    case "eshoot": play(ev.kind === "ring" ? "ering" : ev.kind === "hex" ? "hex" : "sling"); break;
    case "throw": play("throw"); break;
    case "boom":
      FX.burst(ev.x, 0.5, ev.y, ev.el ? ELC(ev.el) : 0xffa040, 26, 6*ev.r/1.7, 0.5, 0.5, { col2:0xffe08a, up:1 });
      FX.ring(ev.x, ev.y, ev.r, ev.el ? ELC(ev.el) : 0xff7a2a, 0.35); FX.disc(ev.x, ev.y, ev.r, ev.el ? ELC(ev.el) : 0xff7a2a, 0.25);
      S.flash.position.set(ev.x, 1.2, ev.y); S.flash.color.setHex(0xffa040); S.flash.intensity = 4;
      S.shake(0.4*ev.r/1.7);
      play("boom");
      break;
    case "arc": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0xfff04a); play("zap"); break;
    case "infect": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0x7dff3a, 0.25); break;
    case "nova":
      FX.ring(ev.x, ev.y, ev.r, 0x7fd8ff, 0.5); FX.disc(ev.x, ev.y, ev.r, 0x7fd8ff, 0.4);
      FX.burst(ev.x, 0.5, ev.y, 0xcff0ff, 40, 8, 0.3, 0.6, { flat:true });
      break;
    case "freeze": FX.burst(ev.x, 0.8, ev.y, 0xcff0ff, 12, 3, 0.3, 0.5); play("freeze"); break;
    case "cloud": FX.disc(ev.x, ev.y, ev.r, 0x7dff3a, 0.5); play("cloud"); break;
    case "fizzle": FX.burst(ev.x, 0.8, ev.y, 0xfff04a, 6, 2, 0.2, 0.3); play("error"); break;
    case "healBeam": FX.arc(ev.x1, ev.y1, ev.x2, ev.y2, 0x5aff8a, 0.3); FX.rise(ev.x2, ev.y2, 0x5aff8a, 8, 0.4); play("heal"); break;
    case "bonk":
      S.shake(0.3); FX.burst(ev.x, 1.3, ev.y, 0xffe680, 10, 3, 0.25, 0.5, { up:1 });
      play("bonk");
      V.stars = 1.2;
      if(V.world){ G.D.rooms.forEach(r=>{ if(r.puzzle && r.puzzle.failed) r.puzzle.failed.forEach(i=> V.world.markPainted(i)); }); }
      break;
    case "illusion": FX.burst(ev.x, 0.9, ev.y, 0xb36bff, 24, 2.5, 0.35, 0.8, { spread:1.4 }); play("illusion"); break;
    case "secretRoom": play("secret"); break;
    case "solved": play("solved"); { const r = G.D.rooms[ev.room]; FX.ring(r.cxw, r.cyw, 5, 0xffd23d, 0.9); } break;
    case "brazier": play("brazier"); { const r = G.D.rooms[ev.room], it = r.puzzle.items[ev.i]; FX.burst(it.x, 1.1, it.y, 0xff8a2a, 10, 3, 0.3, 0.4); } break;
    case "drop": if(ev.kind === "item") play("lootDrop", { rarity:ev.item && ev.item.rarity }); break;
    case "coin": play("coin"); break;
    case "pickup": play(ev.kind === "gun" || ev.kind === "relic" ? "pickupBig" : "pickup"); break;
    case "chest": play("chest"); FX.burst(ev.x, 0.6, ev.y, 0xffd23d, 20, 4, 0.3, 0.6, { up:2 }); break;
    case "buy": play("buy"); break;
    case "broke": play("error"); break;
    case "slip": play("slip"); break;
    case "fall": play("fall"); break;
    case "trap":
      if(ev.kind === "spikes") play("spikes");
      if(ev.kind === "darts") play("dart");
      break;
    case "dizzy": FX.burst(ev.x, 1.6, ev.y, 0xffe680, 8, 2, 0.25, 0.8, { up:1 }); play("thud"); S.shake(0.3); break;
    case "boss": play("boss"); break;
    case "bossPhase": S.shake(0.5); play("tellBig"); break;
    case "jump": play("jump"); break;
    case "land": S.shake(0.9); play("boom"); break;
    case "portal": V.makePortal(ev.x, ev.y); play("portal"); break;
    case "read": play("click"); break;
    case "socket": play("socket"); break;
    case "bark": play("bark"); break;
  }
};

proto.makePortal = function(x, y){
  const g = new THREE.Group(); g.position.set(x, 0, y);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 24), new THREE.MeshBasicMaterial({ color:0x2a0a4a })); disc.rotation.x = -Math.PI/2; disc.position.y = 0.03; g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.08, 6, 24), K.basic(0xb36bff)); ring.rotation.x = Math.PI/2; ring.position.y = 0.06; g.add(ring);
  const glow = new THREE.Mesh(K.glowPlane, K.glowMat(0xb36bff, 0.8)); glow.scale.set(4, 1, 4); glow.position.y = 0.05; g.add(glow);
  S.scene.add(g); this.portal = g;
};

/* ---- per frame ---- */
proto.update = function(dt, t){
  const V = this, G = V.G, p = G.player;
  // the wizard
  const W = V.player;
  W.root.position.set(p.x, 0, p.y);
  W.root.rotation.y = Math.PI/2 - p.aim;
  if(W.gunKey !== G.gun().uid) M.setGun(W, G.gun());
  const speed = Math.hypot(p.vx, p.vy);
  M.idle(W, t, p.blinkT > 0 ? 0 : speed);
  V.recoil = Math.max(0, (V.recoil || 0) - dt*8);
  W.parts.armR.position.z = 0.05 - V.recoil*0.08;
  W.parts.armR.rotation.x = -V.recoil*0.15 + (p.reloadT > 0 ? 0.8 + Math.sin(t*20)*0.1 : 0);
  // untouchable: flicker; blinking: a purple streak and almost gone
  const flick = p.iframes > 0 && p.blinkT <= 0 ? (Math.sin(t*40) > 0 ? 1 : 0.35) : 1;
  M.fade(W, p.blinkT > 0 ? 0.25 : flick);
  if(p.blinkT > 0) FX.emit(p.x, 0.9, p.y, 0, 0, 0, 0xb36bff, 0.6, 0.25, 0, 0);
  M.tint(W, p.chill > 0 ? 0x2a6a8a : 0x000000, 1);
  W.ring.material.opacity = 0.25 + 0.1*Math.sin(t*3);
  W.root.position.y = 0;
  if(V.stars > 0){ V.stars -= dt; if(Math.random() < 0.4) FX.emit(p.x + Math.cos(t*9)*0.4, 2.1, p.y + Math.sin(t*9)*0.4, 0, 0, 0, 0xffe680, 0.25, 0.25, 0, 0); }
  W.root.visible = G.state !== "dead";
  S.playerLight.position.set(p.x, 2.2, p.y + 0.3);
  S.flash.intensity = Math.max(0, S.flash.intensity - dt*25);

  // goblins
  const live = {};
  G.enemies.forEach(e=>{
    if(e.dead) return;
    live[e.id] = 1;
    let R = V.rigs[e.id];
    if(!R){
      R = V.rigs[e.id] = M.goblin(e.boss ? "king" : e.type);
      if(e.affix){
        const a = DG.AFFIXES[e.affix], sz = a.size || 1;
        R.root.scale.setScalar(sz);
        const aura = new THREE.Mesh(K.glowPlane, K.glowMat(a.tint, 0.55)); aura.scale.set(2.4, 1, 2.4); aura.position.y = 0.05; R.root.add(aura); R.aura = aura;
      }
      const shadow = new THREE.Mesh(K.glowPlane, new THREE.MeshBasicMaterial({ map:K.glowTex, color:0x000000, transparent:true, opacity:0.5, depthWrite:false }));
      shadow.scale.set(e.r*3.4, 1, e.r*3.4); shadow.position.y = 0.03; R.root.add(shadow); R.shadow = shadow;
      S.scene.add(R.root);
    }
    R.root.position.set(e.x, 0, e.y);
    const want = Math.PI/2 - e.face;
    R.root.rotation.y += DG.wrapAngle(want - R.root.rotation.y)*(1 - Math.exp(-dt*14));
    // rising out of a puff of smoke
    if(e.spawn > 0){ const k = 1 - e.spawn/(e.boss ? 1.4 : 0.8); R.body.position.y = -1.2*(1 - k); R.root.visible = true; M.fade(R, Math.max(0.1, k)); return; }
    const frozen = e.st.frozen > 0, stunned = e.st.stun > 0;
    if(!frozen) M.idle(R, t, stunned ? 0 : Math.hypot(e.vx, e.vy));
    // the tell: lean back, glow white, shake
    if(R.tell > 0){
      R.tell -= dt;
      const k = 1 - Math.max(0, R.tell)/R.tellMax;
      R.body.rotation.x = -0.35*k; R.body.position.x = Math.sin(t*60)*0.03*k;
      if(R.parts.armR) R.parts.armR.rotation.x = -2.2*k;
    } else {
      R.body.rotation.x *= 0.8; R.body.position.x = 0;
      if(R.parts.armR) R.parts.armR.rotation.x *= 0.85;
    }
    if(e.hop) R.body.position.y = e.hop;
    if(R.shadow) R.shadow.material.opacity = e.hop ? 0.5 + e.hop*0.1 : 0.5;
    // colour: hit flash > frozen > statuses > tell glow
    let tc = 0x000000, tk = 1;
    if(e.flash > 0) tc = 0xffffff;
    else if(frozen) tc = 0x4ab8ff;
    else if(R.tell > 0) { tc = 0xffffff; tk = 0.35 + 0.3*Math.sin(t*30); }
    else if(e.st.burn && e.st.burn.t > 0) { tc = 0xff5a1a; tk = 0.4 + 0.3*Math.sin(t*25 + e.id); }
    else if(e.st.poison && e.st.poison.stacks > 0) { tc = e.st.poison.plague ? 0x8aff2a : 0x4ab82a; tk = 0.3 + 0.25*Math.sin(t*5 + e.id); }
    else if(e.st.chill > 0) { tc = 0x2a6a9a; }
    M.tint(R, tc, tk);
    M.fade(R, e.hidden ? 0.32 + 0.12*Math.sin(t*5 + e.id) : 1);
    if(e.hidden && Math.random() < 0.25) FX.emit(e.x + (Math.random() - 0.5)*0.6, 0.3 + Math.random()*0.9, e.y + (Math.random() - 0.5)*0.6, 0, 0.3, 0, 0x9cff3a, 0.16, 0.4, 0, 1);
    if(R.aura) R.aura.material.opacity = 0.4 + 0.2*Math.sin(t*4 + e.id);
    if(e.st.poison && e.st.poison.stacks > 0 && Math.random() < 0.08 + e.st.poison.stacks*0.02) FX.emit(e.x + (Math.random() - 0.5)*0.4, 0.9, e.y, 0, 0.8, 0, 0x7dff3a, 0.18, 0.6, 0, 0.5);
    if(e.st.burn && e.st.burn.t > 0 && Math.random() < 0.35) FX.emit(e.x + (Math.random() - 0.5)*0.4, 0.6, e.y, 0, 1.6, 0, 0xff7a1a, 0.3, 0.4, 0, 0.5);
    if(stunned && Math.random() < 0.3) FX.emit(e.x + Math.cos(t*9)*0.4, R.h + 0.6, e.y + Math.sin(t*9)*0.4, 0, 0, 0, 0xffe680, 0.22, 0.2, 0, 0);
  });
  for(const id in V.rigs) if(!live[id]){ S.scene.remove(V.rigs[id].root); delete V.rigs[id]; }
  // the fallen: topple, sink, go
  V.dying = V.dying.filter(d=>{
    d.t += dt;
    const R = d.R;
    if(d.fell){ R.root.position.y -= dt*6; R.root.rotation.x += dt*4; }
    else { R.body.rotation.x = Math.min(Math.PI/2, d.t*6); R.body.position.y = -Math.max(0, d.t - 0.6)*0.8; }
    M.tint(R, 0x000000, 1);
    M.fade(R, Math.max(0, 1 - Math.max(0, d.t - (d.boss ? 1.5 : 0.5))*2));
    if(d.t > (d.boss ? 2.2 : 1.1)){ S.scene.remove(R.root); return false; }
    return true;
  });

  // things on the floor
  const pk = {};
  G.pickups.forEach(k=>{
    pk[k.id] = 1;
    let o = V.pickups[k.id];
    if(!o){ o = V.pickups[k.id] = M.pickup(k); S.scene.add(o); }
    o.position.set(k.x, (o.userData.hover || 0.3) + Math.sin(t*3 + k.id)*0.08, k.y);
    o.rotation.y = t*(o.userData.spin || 1);
  });
  for(const id in V.pickups) if(!pk[id]){ S.scene.remove(V.pickups[id]); delete V.pickups[id]; }

  if(V.portal){
    V.portal.children[1].rotation.z = t*2; V.portal.children[2].material.opacity = 0.6 + 0.2*Math.sin(t*4);
    if(Math.random() < 0.6){ const a = Math.random()*6.28; FX.emit(V.portal.position.x + Math.cos(a)*1.1, 0.1, V.portal.position.z + Math.sin(a)*1.1, -Math.cos(a)*0.8, 1.5, -Math.sin(a)*0.8, 0xb36bff, 0.3, 0.8, 0, 0.5); }
  }
  // vents breathe fire
  G.traps.forEach(tr=>{ if(tr.kind === "vent" && tr.state === "up" && Math.random() < 0.8) FX.emit(tr.x + 0.5 + (Math.random() - 0.5)*0.5, 0.1, tr.y + 0.5 + (Math.random() - 0.5)*0.5, 0, 4 + Math.random()*2, 0, Math.random() < 0.5 ? 0xff7a1a : 0xffd23d, 0.45, 0.45, 0, 1); });

  V.world.update(G, dt, t);
  FX.update(dt, G);
};

})();
