/* ------------------------------------------------------------------ *
 *  The ending: the run is won, and the Gloom lets go of them.
 *
 *  The camera comes down close. Gribbus hops to Zippy's side. Light
 *  gathers out of the floor, the rot draws back off the stone, and in a
 *  flash they come out of it: Zippy a grey wizard, as his master was,
 *  and Gribbus a bright green frog with orange hands. Then each ending
 *  has its own last scene:
 *    dawn   they walk off together into a shaft of morning light
 *    flame  the First Flame rises in the Kiln and Zippy stands before it
 *    bog    Gribbus swells up huge and crowned, and Zippy bows to his king
 *
 *  View-side only: it reads the game, builds its own rigs and never
 *  writes back. Any key or click skips it.
 *    const c = DG.Ending.play(G, V, id, done)   c.update(dt, t), c.skip()
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, S = DG.Stage, FX = DG.FX, M = DG.Models;
const A = ()=> DG.Audio;
const PI = Math.PI;
const ease = k=> k <= 0 ? 0 : k >= 1 ? 1 : k*k*(3 - 2*k);
const lerp = (a, b, k)=> a + (b - a)*k;
const seg = (t, a, b)=> ease((t - a)/(b - a));

/* each ending's look: the light it ends in and the length of the scene */
const MOOD = {
  dawn:  { sky:0xffe2b0, ground:0x6a5a3a, light:1.3, high:0xfff0c8, fx:0xffe6a0, len:15 },
  flame: { sky:0xffa860, ground:0x4a2010, light:1.2, high:0xffc890, fx:0xff8a2a, len:15 },
  bog:   { sky:0xb8f0a0, ground:0x2a4a1a, light:1.1, high:0xe8ffc0, fx:0x72e050, len:15 }
};
const T_GATHER = 1.6, T_FLASH = 4.2, T_TITLE = 5.2, T_ACT = 6.6;

/* the overlay: bars, a white flash, the title, a fade to black */
function overlay(){
  const d = document.createElement("div");
  d.id = "cine";
  d.innerHTML = `<div class="bar top"></div><div class="bar bot"></div><div class="flash"></div>
    <div class="words"><h1></h1><p></p></div><div class="black"></div><div class="skip">any key to skip</div>`;
  document.body.appendChild(d);
  requestAnimationFrame(()=> d.classList.add("c-on"));
  return d;
}

/* the clearest way out of where they stand: up to 5 tiles of open floor */
function walkway(G, x, y){
  let best = { dx:0, dy:-1, n:0 };
  [[0, -1], [1, 0], [-1, 0], [0, 1]].forEach(([dx, dy])=>{
    let n = 0;
    for(let i=1; i<=5; i++){
      const tx = Math.floor(x + dx*i), ty = Math.floor(y + dy*i);
      if(G.blocked(tx, ty, "player") || G.blocked(Math.floor(x + dx*i - dy*0.7), Math.floor(y + dy*i + dx*0.7), "player")) break;
      n = i;
    }
    if(n > best.n + 0.5) best = { dx, dy, n };
  });
  return best;
}

DG.Ending = {};
DG.Ending.play = function(G, V, id, done){
  const mood = MOOD[id] || MOOD.dawn, E = DG.ENDINGS[id] || DG.ENDINGS.dawn;
  const p = G.player, x0 = p.x, y0 = p.y;
  const way = walkway(G, x0, y0);
  const u = S.post.mat.uniforms;
  // what we change, so it can be put back for the next run
  const keep = { dist:S.rig.dist, pitch:S.rig.pitch, lead:S.rig.lead, desat:u.uDesat.value, bloom:u.uBloom.value, vig:u.uVig.value,
    gloom:K.GLOOM.uGloom.value, hemiCol:S.hemi.color.getHex(), hemiI:S.hemi.intensity, fillI:S.fill.intensity, high:u.uHigh.value.getHex() };
  const hemi0 = S.hemi.color.clone(), hemi1 = new THREE.Color(mood.sky), high0 = u.uHigh.value.clone(), high1 = new THREE.Color(mood.high);
  const dom = overlay();
  dom.querySelector("h1").textContent = E.title;
  dom.querySelector("p").textContent = E.sub;

  // the two of them as they were (the game's own rigs go dark for the scene)
  const rigs = [];
  const add = R=>{ S.scene.add(R.root); rigs.push(R); return R; };
  const els = [G.gun().element].concat(G.mods.els.filter(e=> e !== G.gun().element));
  const darkZ = add(M.zippy(V.player.look)); M.setGun(darkZ, G.gun(), els);
  const f0 = G.frogs[0];
  const fx0 = f0 ? f0.x : x0 + 1.2, fy0 = f0 ? f0.y : y0 + 0.6;
  const darkF = add(M.frog(false, G.gribbus.buffs));
  // and as they will be
  const brightZ = add(M.zippy({ robe:"grey", cape:"grey", parts:["tallhat"], auras:[] })); brightZ.root.visible = false;
  const brightF = add(M.frog(false, id === "bog" ? ["crown"] : [], { redeemed:true })); brightF.root.visible = false;
  if(brightF.parts.crown) brightF.parts.crown.visible = id === "bog";
  [brightZ, brightF].forEach(R=>{ if(R.parts.tongue) R.parts.tongue.visible = false; });
  if(darkF.parts.tongue) darkF.parts.tongue.visible = false;
  // where Gribbus ends up: at Zippy's side, a little toward the camera
  const side = way.dx !== 0 ? { x:0, y:0.9 } : { x:0.95, y:0.25 };
  const fx1 = x0 + side.x, fy1 = y0 + side.y;
  let hearth = null, shaft = null;

  const c = { t:0, id, done:false };
  let flashed = false, faded = false;
  const hideGame = ()=>{ V.player.root.visible = false; V.frogs.forEach(R=> R.root.visible = false); V.lily.visible = false; };
  const au = A();
  au && au.setMode && au.setMode("menu");

  c.skip = function(){ if(c.t > 0.8) c.finish(); };
  c.finish = function(){
    if(c.done) return;
    c.done = true;
    // skipped early: jump to how the scene ends
    if(!flashed){ flashed = true; darkZ.root.visible = darkF.root.visible = false; brightZ.root.visible = brightF.root.visible = true;
      const bg = id === "bog" ? 2.1 : 0;
      brightZ.root.position.set(x0 - side.x*bg, 0, y0 - side.y*bg); brightZ.root.rotation.y = 0;
      brightF.root.position.set(fx1 + side.x*bg*0.8, 0, fy1 + side.y*bg*0.8); brightF.root.scale.setScalar(id === "bog" ? 4.4 : 1.3); }
    K.GLOOM.uGloom.value = 0; S.hemi.color.copy(hemi1); S.hemi.intensity = mood.light; u.uHigh.value.copy(high1);
    M.tint(brightZ, mood.fx, 0.03); M.tint(brightF, 0x000000, 1);
    S.rig.dist = keep.dist; S.rig.pitch = keep.pitch; S.rig.lead = keep.lead;
    u.uDesat.value = keep.desat; u.uBloom.value = keep.bloom; u.uVig.value = keep.vig;
    dom.classList.add("c-gone");
    setTimeout(()=> dom.remove(), 900);
    done && done();
  };
  // a new run calls this through View.dispose
  c.dispose = function(){
    rigs.forEach(R=> S.scene.remove(R.root));
    if(hearth) S.scene.remove(hearth);
    if(shaft) S.scene.remove(shaft);
    K.GLOOM.uGloom.value = keep.gloom; S.hemi.color.setHex(keep.hemiCol); S.hemi.intensity = keep.hemiI; S.fill.intensity = keep.fillI;
    u.uHigh.value.setHex(keep.high);
    S.rig.dist = keep.dist; S.rig.pitch = keep.pitch; S.rig.lead = keep.lead;
    u.uDesat.value = keep.desat; u.uBloom.value = keep.bloom; u.uVig.value = keep.vig;
    V.player.root.visible = true; V.frogs.forEach(R=> R.root.visible = true);
    if(!c.done){ c.done = true; dom.remove(); }
  };

  c.update = function(dt, t){
    hideGame();
    if(c.done) return idleAfter(dt, t);
    const k = c.t += dt;
    // the camera comes down close and low
    const cz = seg(k, 0, 2.4);
    S.rig.lead = 0;
    S.rig.dist = lerp(keep.dist, 10.5, cz); S.rig.pitch = lerp(keep.pitch, 0.62, cz);
    // the light: the rot recedes and the picture warms
    const lk = seg(k, T_GATHER, T_FLASH + 1.5);
    K.GLOOM.uGloom.value = lerp(keep.gloom, 0, lk);
    S.hemi.color.copy(hemi0).lerp(hemi1, lk); S.hemi.intensity = lerp(keep.hemiI, mood.light, lk); S.fill.intensity = lerp(keep.fillI, 0.95, lk);
    u.uDesat.value = lerp(keep.desat, 0.12, lk); u.uBloom.value = lerp(keep.bloom, 0.8, lk); u.uVig.value = lerp(keep.vig, 0.5, lk);
    u.uHigh.value.copy(high0).lerp(high1, lk);

    if(!flashed) before(k, dt, t);
    else after(k, dt, t);

    if(k >= T_FLASH && !flashed) transform();
    if(k > T_TITLE && !dom.classList.contains("c-title")) dom.classList.add("c-title");
    if(k > mood.len - 2.2 && !faded){ faded = true; dom.classList.add("c-fade"); }
    if(k > mood.len) c.finish();
  };

  /* before: they turn to face us; Gribbus hops over; light rises out of the floor */
  function before(k, dt, t){
    const Z = darkZ, F = darkF;
    Z.root.position.set(x0, 0, y0);
    Z.root.rotation.y += DG.wrapAngle(0 - Z.root.rotation.y)*(1 - Math.exp(-dt*3));
    M.animate(Z, t, 0); M.stalk(Z, { speed:0, fwd:0, side:0, max:DG.PLAYER.speed }, t, dt);
    // three hops to his side
    const hk = Math.min(1, k/2.1), hop = Math.min(2, Math.floor(hk*3)), inHop = hk*3 - hop;
    const from = hop/3, to = (hop + 1)/3, kk = lerp(from, to, ease(Math.min(1, inHop*1.4)));
    const hx = lerp(fx0, fx1, hk >= 1 ? 1 : kk), hy = lerp(fy0, fy1, hk >= 1 ? 1 : kk);
    const airK = hk < 1 && inHop < 0.72 ? inHop/0.72 : -1;
    F.root.position.set(hx, airK >= 0 ? Math.sin(airK*PI)*0.5 : 0, hy);
    F.root.scale.setScalar(1.3);
    const face = Math.atan2(fy1 - fy0, fx1 - fx0);
    F.root.rotation.y = hk < 1 ? PI/2 - face : F.root.rotation.y + DG.wrapAngle(0.3 - F.root.rotation.y)*(1 - Math.exp(-dt*4));
    M.animate(F, t, 0); M.hop(F, { k:airK }, t, dt);
    // motes: slow at first, then pouring up and drawing in
    if(k > T_GATHER){
      const g = seg(k, T_GATHER, T_FLASH);
      const n = Math.random() < 0.3 + g*1.2 ? 1 + Math.floor(g*3) : 0;
      for(let i=0; i<n; i++){
        const a = Math.random()*PI*2, r = 2.6 - g*1.6 + Math.random()*0.8;
        const ox = (x0 + fx1)/2, oy = (y0 + fy1)/2;
        FX.emit(ox + Math.cos(a)*r, 0.05, oy + Math.sin(a)*r, -Math.cos(a)*r*0.5, 0.8 + g*1.6, -Math.sin(a)*r*0.5, Math.random() < 0.5 ? mood.fx : 0xfff6dc, 0.12 + g*0.1, 1.1, -0.2, 0.6);
      }
      Z.mat && M.tint(Z, mood.fx, 0.5*g); M.tint(F, mood.fx, 0.5*g);
      if(g > 0.55) S.shake(0.04*g);
    }
  }

  /* the flash: out of the dark, into the light */
  function transform(){
    flashed = true;
    darkZ.root.visible = false; darkF.root.visible = false;
    brightZ.root.visible = true; brightF.root.visible = true;
    brightZ.root.position.copy(darkZ.root.position); brightZ.root.rotation.y = darkZ.root.rotation.y;
    brightF.root.position.set(fx1, 0, fy1); brightF.root.rotation.y = darkF.root.rotation.y; brightF.root.scale.setScalar(1.3);
    dom.classList.add("c-flashing"); setTimeout(()=> dom.classList.remove("c-flashing"), 120);
    S.flash.position.set(x0, 2, y0); S.flash.color.setHex(mood.fx); S.flash.intensity = 9;
    S.shake(0.5);
    FX.burst(x0, 1.2, y0, 0xffffff, 40, 6, 0.3, 0.9, { col2:mood.fx, up:1.5 });
    FX.burst(fx1, 0.5, fy1, 0x72e050, 18, 3.5, 0.22, 0.7, { col2:0xff8a2a, up:1 });
    FX.ring(x0, y0, 3.2, mood.fx, 0.9);
    FX.ring(x0, y0, 1.6, 0xffffff, 0.5);
    FX.soul(x0, y0, 5, 2.4, mood.fx);
    const au = A(); au && au.play && au.play("ending", { kind:id });
  }

  /* after: the glow settles, and each ending plays out */
  function after(k, dt, t){
    const Z = brightZ, F = brightF;
    const glow = Math.max(0, 1 - (k - T_FLASH)/1.4);
    M.tint(Z, mood.fx, 0.03 + 0.4*glow*glow); M.tint(F, 0xffd890, 0.25*glow*glow);
    if(Math.random() < 0.25) FX.emit(Z.root.position.x + (Math.random() - 0.5)*0.8, 0.2 + Math.random()*1.8, Z.root.position.z + (Math.random() - 0.5)*0.8, 0, 0.4, 0, 0xfff6dc, 0.1, 1.2, -0.05, 0.6);
    const act = k - T_ACT;
    if(id === "dawn") dawn(act, dt, t);
    else if(id === "flame") flame(act, dt, t);
    else bog(act, dt, t);
  }

  // walk the pair along their way, Gribbus a hop behind
  function walk(act, dt, t, dist, speed){
    const Z = brightZ, F = brightF;
    const d = Math.max(0, Math.min(dist, act*speed));
    const moving = act > 0 && d < dist;
    const zx = x0 + way.dx*d, zy = y0 + way.dy*d;
    const turn = PI/2 - Math.atan2(way.dy, way.dx);
    Z.root.position.set(zx, 0, zy);
    if(act > 0) Z.root.rotation.y += DG.wrapAngle(turn - Z.root.rotation.y)*(1 - Math.exp(-dt*5));
    else Z.root.rotation.y += DG.wrapAngle(0 - Z.root.rotation.y)*(1 - Math.exp(-dt*3));
    M.animate(Z, t, moving ? speed : 0);
    M.stalk(Z, { speed:moving ? speed : 0, fwd:moving ? speed : 0, side:0, max:DG.PLAYER.speed }, t, dt);
    // Gribbus: hops of 0.6 s, following the same line a little behind
    const fd = Math.max(0, d - 0.9), ph = act > 0.3 && moving ? ((act - 0.3) % 0.6)/0.6 : -1;
    F.root.position.set(fx1 + way.dx*fd, ph >= 0 ? Math.sin(ph*PI)*0.45 : 0, fy1 + way.dy*fd);
    if(act > 0.3) F.root.rotation.y += DG.wrapAngle(turn - F.root.rotation.y)*(1 - Math.exp(-dt*5));
    M.animate(F, t, 0); M.hop(F, { k:ph }, t, dt);
    return { zx, zy, moving };
  }

  function dawn(act, dt, t){
    // a shaft of morning comes down at the end of their way
    if(!shaft && act > -1){
      const n = Math.max(2, way.n);
      shaft = new THREE.Group();
      const sx = x0 + way.dx*(n + 0.5), sy = y0 + way.dy*(n + 0.5);
      shaft.position.set(sx, 0, sy); S.scene.add(shaft);
      FX.soul(sx, sy, 9, 8, 0xffe6a0);
      shaft.userData = { x:sx, y:sy };
    }
    if(shaft && Math.random() < 0.5) FX.emit(shaft.userData.x + (Math.random() - 0.5)*1.4, 4 + Math.random()*2, shaft.userData.y + (Math.random() - 0.5)*1.4, 0, -0.6, 0, 0xfff0c8, 0.14, 2, 0, 0.6);
    const w = walk(act, dt, t, Math.max(1.5, way.n + 0.4), 1.7);
    S.rig.tx = lerp(x0, w.zx, 0.6); S.rig.tz = lerp(y0, w.zy, 0.6);
  }

  function flame(act, dt, t){
    // the Hearth, two steps ahead: the First Flame rising out of the stone
    const n = Math.min(2.4, Math.max(1.4, way.n - 0.5));
    const hx = x0 + way.dx*(n + 1), hy = y0 + way.dy*(n + 1);
    if(!hearth && act > -1.2){
      hearth = new THREE.PointLight(0xff8a2a, 0, 14, 1.6); hearth.position.set(hx, 1.5, hy); S.scene.add(hearth);
      FX.soul(hx, hy, 7, 9, 0xff8a2a);
      FX.ring(hx, hy, 2.5, 0xff8a2a, 1.2);
      S.shake(0.3);
    }
    if(hearth){
      hearth.intensity = Math.min(4, hearth.intensity + dt*3) + Math.sin(t*13)*0.3 + Math.sin(t*7.3)*0.25;
      for(let i=0; i<2; i++) if(Math.random() < 0.8) FX.emit(hx + (Math.random() - 0.5)*0.9, 0.1 + Math.random()*0.6, hy + (Math.random() - 0.5)*0.9, (Math.random() - 0.5)*0.5, 2 + Math.random()*2.5, (Math.random() - 0.5)*0.5, Math.random() < 0.6 ? 0xff8a2a : 0xffd23d, 0.18, 1.3, -0.1, 0.4);
    }
    const w = walk(act, dt, t, n, 1.4);
    // at the hearth: he stands and looks into it, his hand up to the warmth
    if(!w.moving && act > 0.5){ const R = brightZ; R.parts.armL.rotation.x = lerp(R.parts.armL.rotation.x, -1.3, 1 - Math.exp(-dt*3)); }
    S.rig.tx = lerp(x0, hx, 0.45); S.rig.tz = lerp(y0, hy, 0.45);
  }

  function bog(act, dt, t){
    const Z = brightZ, F = brightF;
    // Gribbus swells: a gulp, a shudder, then up, up
    const grow = seg(act, 0, 3.2), wob = act > 0 && act < 3.4 ? Math.sin(act*18)*0.06*(1 - grow) : 0;
    const sz = 1.3*(1 + 2.4*grow);
    F.root.scale.set(sz*(1 + wob), sz*(1 - wob), sz*(1 + wob));
    // he backs off a step as his frog fills the room, so the king sits beside him
    const back = seg(act, 0.3, 2.4)*2.1;
    const fx = fx1 + side.x*back*0.8, fy = fy1 + side.y*back*0.8;
    F.root.position.set(fx, 0, fy);
    F.root.rotation.y += DG.wrapAngle(0.25 - F.root.rotation.y)*(1 - Math.exp(-dt*3));
    M.animate(F, t, 0); M.hop(F, { k:-1 }, t, dt);
    Z.root.position.set(x0 - side.x*back, 0, y0 - side.y*back);
    // and turns to his king, and bows
    const toF = PI/2 - Math.atan2(fy - Z.root.position.z, fx - Z.root.position.x);
    Z.root.rotation.y += DG.wrapAngle((act > 2.6 ? toF : 0) - Z.root.rotation.y)*(1 - Math.exp(-dt*3));
    M.animate(Z, t, 0); M.stalk(Z, { speed:0, fwd:0, side:0, max:DG.PLAYER.speed }, t, dt);
    const bow = seg(act, 3.6, 4.6)*(1 - seg(act, 6.2, 7));
    Z.body.rotation.x = 0.55*bow;
    if(act > 0 && act < 3.2 && Math.random() < 0.6) FX.emit(fx + (Math.random() - 0.5)*sz*0.6, Math.random()*sz*0.4, fy + (Math.random() - 0.5)*sz*0.6, (Math.random() - 0.5)*2, 1 + Math.random()*2, (Math.random() - 0.5)*2, Math.random() < 0.5 ? 0x72e050 : 0xff8a2a, 0.15, 0.8, 0.3, 1);
    if(act > 3.2 && !c.croaked){ c.croaked = true; const au = A(); au && au.play && au.play("croak"); S.shake(0.35); FX.ring(fx, fy, 3.5, 0x72e050, 1); FX.burst(fx, sz*0.6, fy, 0x72e050, 30, 5, 0.25, 0.9, { col2:0xffd23d, up:1 }); }
    if(Math.random() < 0.3) FX.emit(fx + (Math.random() - 0.5)*5, 0.05, fy + (Math.random() - 0.5)*5, 0, 0.3, 0, Math.random() < 0.5 ? 0xc8ff8a : 0xffd23d, 0.1, 1.6, -0.05, 0.6);
    S.rig.tx = lerp(x0 - side.x*back, fx, 0.5); S.rig.tz = lerp(y0 - side.y*back, fy, 0.5) - 0.3;
    S.rig.dist = lerp(10.5, 13.5, grow);
  }

  // after the scene (behind the lore and the end screen): they stand in the light
  function idleAfter(dt, t){
    [brightZ, brightF].forEach(R=>{ if(R.root.visible) M.animate(R, t, 0); });
    if(brightZ.root.visible) M.stalk(brightZ, { speed:0, fwd:0, side:0, max:DG.PLAYER.speed }, t, dt);
    if(brightF.root.visible) M.hop(brightF, { k:-1 }, t, dt);
    if(hearth) hearth.intensity = 3.6 + Math.sin(t*13)*0.3;
  }

  // the camera starts on them
  S.rig.tx = x0; S.rig.tz = y0;
  return c;
};

})();
