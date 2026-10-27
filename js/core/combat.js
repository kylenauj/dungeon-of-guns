/* ------------------------------------------------------------------ *
 *  Combat: where the combos happen.
 *
 *  - Volleys: the gun's pattern, plus every shape powerup (extra shots,
 *    side/back, kaleidoscope, burst, echo, dual wield, shadow copies).
 *  - Shots: ricochet, pierce, homing, wiggle, spiral, orbit, boomerang,
 *    spectral, grow, accelerate; any number of elements each.
 *  - Damage and statuses, and REACTIONS when two elements meet.
 *  - Triggers -> payloads. A payload that makes shots makes children
 *    (depth + 1). Children inherit elements but only trigger payloads
 *    while depth < mods.maxDepth: that's what keeps chaos finite.
 *  - Hazards (byproducts and enemy hazards), allies (wisps, tadpoles,
 *    shadow, turret, moons), bombs, beams, spells.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG, T = DG.TILE, L = DG.Loot;
const proto = DG.Game.prototype;
const TAU = Math.PI*2;

/* the strength payloads scale with: about a third of the held gun's dps */
proto.payloadPower = function(){
  const s = this.gunStats();
  return Math.max(4, s.dmg*s.pellets*Math.min(s.rate, 8)/3);
};
/* every element a shot from gun g carries right now */
proto.shotEls = function(g){
  const M = this.mods, els = [g.element];
  if(this.player.discoT > 0){ DG.ELEMENT_ORDER.forEach(e=>{ if(els.indexOf(e) < 0) els.push(e); }); return els; }
  M.els.forEach(e=>{ if(els.indexOf(e) < 0) els.push(e); });
  if(M.special.prism){ const e = this.rng.pick(DG.ELEMENT_ORDER); if(els.indexOf(e) < 0) els.push(e); }
  return els;
};
/* conditional damage multipliers */
proto.dmgBonus = function(){
  const G = this, p = G.player, M = G.mods;
  let m = 1;
  if(M.special.desperation && p.hp < p.maxHp*0.3) m *= 1.7;
  if(M.special.overflow && p.mana >= p.maxMana - 0.5) m *= 1.4;
  if(M.special.elementalist) m *= 1 + 0.15*(M.els.length + 1)*M.special.elementalist;
  if(M.special.dice) m *= p.diceMul || 1;
  if(M.special.riposte && G.t < (p.riposteT || 0)) m *= 1.6;
  if(M.special.briar && p.wards > 0) m *= 1.2;
  if(M.special.vengeance && G.t < (p.vengeT || 0)) m *= 1.5;
  if(M.special.hollowing) m *= 1 + 0.05*Math.min(12, p.hollow || 0);
  if(G.t < (p.tollT || 0)) m *= 1.3;
  // Golden Tithe: your purse is your power
  if(M.special.mortgage) m *= 1 + Math.min(1, 0.01*M.special.mortgage*Math.floor(p.gold/15));
  // the reliquaries: +10% each while your shots carry their element
  RELICS.forEach(([sp, el])=>{ if(M.special[sp] && (M.els.indexOf(el) >= 0 || (G.gun() && G.gun().element === el))) m *= 1 + 0.1*M.special[sp]; });
  return m;
};
const RELICS = [["relic_fire", "fire"], ["relic_frost", "frost"], ["relic_poison", "poison"], ["relic_shock", "shock"], ["relic_arcane", "arcane"]];
/* fire rate from the stacking frenzies (Berserker's Tooth, Predator's Itch) */
proto.rateBonus = function(){
  const p = this.player, t = this.t;
  return 1 + (t < (p.frenzyT || 0) ? 0.05*(p.frenzy || 0) : 0) + (t < (p.itchT || 0) ? 0.04*(p.itch || 0) : 0);
};

/* ================================================================== *
 *  Volleys
 * ================================================================== */
proto.fireGun = function(g, s){
  const G = this, p = G.player;
  g.ammo--; p.fireCd = 1/(s.rate*G.rateBonus());
  let mul = G.dmgBonus();
  if(G.mods.special.patience) mul *= 1 + Math.min(1, (G.t - (p.lastShot || 0))/1.5);
  p.lastShot = G.t; p.volleys++;
  const disco = !!G.mods.special.disco && p.volleys % 5 === 0;
  G.fireVolley(p.x, p.y, p.aim, g, s, { mul, from:"player", disco });
  const M = G.mods;
  // Echoing Skull: sometimes the volley comes again
  if(M.special.doubletap && G.chance(Math.min(0.6, 0.15*M.special.doubletap))) G.pending.push({ t:0.09, fn:()=>{ if(G.player.alive !== false) G.fireVolley(p.x, p.y, p.aim, g, s, { mul:mul*0.8, from:"player" }); } });
  // Crow's Nest: every 5th volley, a fan
  if(M.special.fan && p.volleys % 5 === 0){
    const n = 3*M.special.fan;
    for(let i=0;i<n;i++){ const a = p.aim + (i - (n - 1)/2)*0.16; G.addShot({ x:p.x, y:p.y, a, speed:s.speed, r:0.12, dmg:s.dmg*0.6*mul, range:s.range*0.8, els:G.shotEls(g), power:s.power, depth:0, crit:s.crit, critMul:s.critMul }); }
  }
  // Thunder Socks: a charged shot throws lightning too
  if(G.mods.special.static && p.static >= 1){
    const t = G.nearestEnemy(p.x, p.y, 10);
    if(t){ p.static = 0; G.chain(t, G.payloadPower()*1.6, 4, p.x, p.y, { els:["shock"], power:s.power, depth:1, noArc:true }); G.emit("zapShot", { x:p.x, y:p.y }); }
  }
  const sh = G.mods.shot;
  for(let i=1;i<=sh.burst;i++) G.pending.push({ t:0.08*i, fn:()=> G.fireVolley(p.x, p.y, p.aim, g, s, { mul, from:"player", quiet:true }) });
  for(let i=1;i<=sh.echo;i++) G.pending.push({ t:0.25*i, fn:()=> G.fireVolley(p.x, p.y, p.aim, g, s, { mul:mul*0.45, from:"player", quiet:true }) });
  // Dual Wield: a second wand in the other hand, a little wide, at half strength
  if(G.mods.special.dualwield) G.fireVolley(p.x, p.y, p.aim + (G.rng.next() - 0.5)*0.3, g, s, { mul:mul*0.5*G.mods.special.dualwield, from:"player", quiet:true });
  // copies: the shadow and (with Frogsona) Gribbus
  G.allies.forEach(a=>{ if(a.kind === "shadow"){ const ax = p.aimX !== undefined ? p.aimX : p.x + Math.cos(p.aim)*5, ay = p.aimY !== undefined ? p.aimY : p.y + Math.sin(p.aim)*5; G.fireVolley(a.x, a.y, Math.atan2(ay - a.y, ax - a.x), g, s, { mul:mul*0.6, from:"shadow", quiet:true }); } });
  if(G.gribbus && G.gribbus.g.mimic){
    const f = G.gribbus, ax = p.aimX !== undefined ? p.aimX : p.x + Math.cos(p.aim)*5, ay = p.aimY !== undefined ? p.aimY : p.y + Math.sin(p.aim)*5;
    G.fireVolley(f.x, f.y, Math.atan2(ay - f.y, ax - f.x), g, s, { mul:mul*DG.Gribbus.mimicMul(G), from:"gribbus", quiet:true });
    G.emit("mimic", { x:f.x, y:f.y });
  }
  if(G.mods.special.frogsona && G.gribbus && !G.gribbus.ko){ const t = DG.Gribbus.target(G, 9); if(t) G.fireVolley(G.gribbus.x, G.gribbus.y, Math.atan2(t.y - G.gribbus.y, t.x - G.gribbus.x), g, s, { mul:mul*0.45, from:"gribbus", quiet:true }); }
  if(g.ammo <= 0) G.startReload();
};

const VOLLEY_THIN = 0.3;
proto.fireVolley = function(x, y, aim, g, s, o){
  const G = this, M = G.mods, sh = M.shot, rng = G.rng;
  o = o || {};
  const n = s.pellets + Math.round(sh.extra);
  let angles = [];
  if(n === 1) angles.push(aim + (rng.next() - 0.5)*s.spread*Math.PI/180);
  else {
    const spread = (s.pellets > 1 ? s.spread : 0) + sh.extra*9;
    for(let i=0;i<n;i++) angles.push(aim + (i/(n - 1) - 0.5)*spread*Math.PI/180 + (rng.next() - 0.5)*s.spread*Math.PI/180*0.25);
  }
  if(sh.side) for(let i=0;i<sh.side;i++){ angles.push(aim + Math.PI/2); angles.push(aim - Math.PI/2); }
  if(sh.back) angles.push(aim + Math.PI);
  if(sh.kaleido){ const base = angles.slice(); [0.5, 1, 1.5].forEach(k=> base.forEach(a=> angles.push(a + Math.PI*k))); }
  if(sh.chaos) angles = angles.map(()=> rng.next()*TAU);
  // more shots, each a little weaker: a volley's total damage grows with the
  // number of shots, but slower than the count does
  const thin = angles.length > s.pellets ? Math.pow(s.pellets/angles.length, VOLLEY_THIN) : 1;
  const els = o.disco ? DG.ELEMENT_ORDER.slice() : G.shotEls(g);
  if(o.disco) G.emit("disco", { x, y });
  angles.forEach((a, i)=>{
    const sp = s.speed*(s.pellets > 1 ? 0.85 + rng.next()*0.3 : 1);
    G.addShot({
      x:x + Math.cos(a)*0.5, y:y + Math.sin(a)*0.5, a, speed:sp, r:s.size*(o.disco ? 1.5 : 1), dmg:s.dmg*(o.mul || 1)*thin, range:s.range,
      pierce:s.basePierce + sh.pierce, bounces:sh.bounces, els, power:s.power, knock:s.knock, blast:s.blast,
      kind:g.base === "launcher" || s.blast ? "grenade" : "bolt", depth:0, crit:s.crit, critMul:s.critMul, from:o.from,
      orbit:i < sh.orbit && o.from === "player" ? 3 : 0
    });
  });
  if(!o.quiet || o.from === "shadow") G.emit("shoot", { x, y, a:aim, el:g.element, els, base:g.base, from:o.from });
  if(!o.quiet) G.trigger("fire", { x, y, els, depth:0 });
};

/* a player shot, with every shape flag the mods give it.
   The screen has room for so much: past SHOT_SOFT live shots only first-hand
   shots (depth 0) are made, past SHOT_HARD none are. */
const SHOT_SOFT = 110, SHOT_HARD = 160;
proto.addShot = function(o){
  const G = this, sh = G.mods.shot;
  if((G.pShots || 0) >= (o.depth ? SHOT_SOFT : SHOT_HARD)) return { dead:true, hits:[], els:o.els || [] };
  const life = o.range/o.speed + (sh.lifeAdd || 0)*(o.depth ? 0.3 : 1);
  const b = {
    team:"p", x:o.x, y:o.y, vx:Math.cos(o.a)*o.speed, vy:Math.sin(o.a)*o.speed, r:o.r, dmg:o.dmg, life, life0:life,
    pierce:o.pierce || 0, bounces:o.bounces || 0, els:o.els, power:o.power || 1, knock:o.knock || 1, blast:o.blast || 0,
    kind:o.kind || "bolt", depth:o.depth || 0, crit:o.crit || 0, critMul:o.critMul || 2, from:o.from,
    homing:o.homing !== undefined ? o.homing : sh.homing, baseA:o.a, sp0:o.speed,
    wiggle:o.depth ? 0 : sh.wiggle, spiral:o.depth ? 0 : sh.spiral, grow:sh.grow, accel:sh.accel,
    boomerang:o.depth ? 0 : sh.boomerang, spectral:sh.spectral, orbit:o.orbit || 0, orbitA:o.a,
    split:o.depth ? 0 : sh.split, spin:G.rng.sign()
  };
  // Spaghetti Code: every first-hand shot picks its own speed
  if(!b.depth && sh.jitter){ const k = 0.55 + G.rng.next()*0.9; b.vx *= k; b.vy *= k; b.sp0 *= k; }
  // Lucky Penny: now and then a shot is a coin
  if(!b.depth && o.from === "player" && G.mods.special.penny && G.chance(0.05*G.mods.special.penny)){ b.coin = true; b.dmg *= 3; b.kind = "coin"; }
  return G.addBullet(b);
};
proto.addBullet = function(b){
  b.id = this.nextId++; b.hits = []; b.t = 0;
  if(b.team === "p") this.pShots = (this.pShots || 0) + 1;
  this.bullets.push(b);
  return b;
};

/* pending: things that happen a moment later (bursts, echoes, revives) */
proto.updatePending = function(dt){
  const G = this;
  if(!G.pending.length) return;
  const due = [];
  G.pending = G.pending.filter(p=>{ p.t -= dt; if(p.t <= 0){ due.push(p); return false; } return true; });
  due.forEach(p=> p.fn());
};

/* ================================================================== *
 *  Shots in flight
 * ================================================================== */
proto.updateShots = function(dt){
  const G = this, p = G.player, M = G.mods;
  for(const b of G.bullets){
    if(b.dead) continue;
    if(b.team === "e" && G.timeStop > 0) continue;
    b.t += dt;
    if(b.team === "p") G.steerShot(b, dt);
    else if(b.stall || b.curve || b.split || b.home) G.steerEnemyShot(b, dt);
    if(b.dead) continue;
    if(!b.orbitLeft){
      b.life -= dt;
      if(b.life <= 0){ G.shotEnd(b, "expire"); continue; }
    }
    const sp = Math.hypot(b.vx, b.vy), steps = Math.max(1, Math.ceil(sp*dt/0.2));
    for(let s=0; s<steps && !b.dead; s++){
      const ox = b.x, oy = b.y;
      if(b.orbitLeft){ /* orbiting: position set by steerShot */ }
      else { b.x += b.vx*dt/steps; b.y += b.vy*dt/steps; }
      if(!b.orbitLeft && G.bulletBlocked(b.x, b.y, b.spectral)){
        const tx = Math.floor(b.x), ty = Math.floor(b.y);
        if(G.D.at(tx, ty) === T.BREAK) G.hitBreakable(tx, ty, b.team === "p" ? b.dmg : b.dmg*0.5);
        if(b.team === "p" && b.bounces > 0){
          b.bounces--;
          const hx = G.bulletBlocked(b.x, oy), hy = G.bulletBlocked(ox, b.y);
          if(hx || !hy) b.vx = -b.vx;
          if(hy || !hx) b.vy = -b.vy;
          b.x = ox; b.y = oy; b.baseA = Math.atan2(b.vy, b.vx);
          if(M.shot.bounceDmg) b.dmg *= 1 + M.shot.bounceDmg;
          G.emit("bounce", { x:b.x, y:b.y, els:b.els });
          G.trigger("bounce", { x:b.x, y:b.y, els:b.els, depth:b.depth, power:G.payloadPower() });
          // only first-hand shots split: a split of a split would never end
          if(M.shot.bounceSplit && b.depth === 0){
            const a = Math.atan2(b.vy, b.vx), v = Math.hypot(b.vx, b.vy);
            [-0.45, 0.45].forEach(o=> G.addShot({ x:b.x, y:b.y, a:a + o, speed:v, r:b.r*0.85, dmg:b.dmg*0.6, range:Math.max(2, b.life*v), pierce:b.pierce, bounces:Math.min(2, b.bounces), els:b.els, power:b.power, knock:b.knock, depth:b.depth + 1, crit:b.crit, critMul:b.critMul, homing:b.homing }));
          }
        } else if(b.team === "p" && M.shot.portal && (!b.ported || M.special.wormhole) && G.portalShot(b, ox, oy)){
          /* out of the opposite wall */
        } else {
          b.x = ox; b.y = oy;
          G.shotEnd(b, "wall");
          break;
        }
      }
      if(b.dead) break;
      if(b.team === "p"){
        const tx = Math.floor(b.x), ty = Math.floor(b.y);
        if(G.D.at(tx, ty) === T.FAKE) G.revealFake(tx, ty);
        for(const e of G.enemies){
          if(e.dead || e.spawn > 0 || e.airborne || b.hits.indexOf(e.id) >= 0) continue;
          if(e.untargetable) continue;
          if(DG.dist2(b.x, b.y, e.x, e.y) > (b.r + e.r)*(b.r + e.r)) continue;
          b.hits.push(e.id);
          if(b.blast){ G.shotEnd(b, "hit", e); break; }
          G.shotHit(b, e);
          if(b.split && !b.didSplit && b.depth === 0){
            b.didSplit = true;
            const a = Math.atan2(b.vy, b.vx), v = Math.hypot(b.vx, b.vy);
            for(let k=0;k<b.split;k++){
              const o = (k/(Math.max(1, b.split - 1)) - 0.5)*1.2;
              const c = G.addShot({ x:b.x, y:b.y, a:a + o, speed:v, r:b.r*0.8, dmg:b.dmg*0.5, range:Math.max(1.5, b.life*v), pierce:0, bounces:Math.min(1, b.bounces), els:b.els, power:b.power, knock:b.knock, depth:b.depth + 1, crit:b.crit, critMul:b.critMul, homing:b.homing });
              c.hits = [e.id];
            }
          }
          if(b.pierce > 0){ b.pierce--; if(M.shot.pierceDmg) b.dmg *= 1 + M.shot.pierceDmg; }
          else { G.shotEnd(b, "hitend"); break; }
        }
      } else {
        G.enemyShotStep(b, p);
      }
    }
  }
  G.bullets = G.bullets.filter(b=> !b.dead);
  let n = 0; for(const b of G.bullets) if(b.team === "p") n++;
  G.pShots = n;
};

/* the shape of a player shot this frame */
proto.steerShot = function(b, dt){
  const G = this, p = G.player;
  if(b.orbit > 0){
    // circling Zippy, then off it goes toward the cursor
    b.orbitLeft = true; b.orbit -= dt; b.orbitA += 5*dt;
    b.x = p.x + Math.cos(b.orbitA)*1.4; b.y = p.y + Math.sin(b.orbitA)*1.4;
    if(b.orbit <= 0){ b.orbitLeft = false; b.baseA = p.aim; b.vx = Math.cos(p.aim)*b.sp0; b.vy = Math.sin(p.aim)*b.sp0; }
    return;
  }
  let sp = Math.hypot(b.vx, b.vy);
  if(b.accel && sp < b.sp0*2.6){ sp *= 1 + 1.4*dt*b.accel; b.dmg *= 1 + 0.5*dt*b.accel; }
  if(b.grow && b.r < 0.7){ b.r *= 1 + 0.55*dt*b.grow; b.dmg *= 1 + 0.6*dt*b.grow; }
  if(b.boomerang && !b.returning && b.t > b.life0*0.45){ b.returning = true; b.pierce = 99; b.life = 3; b.hits = []; }
  if(b.returning){
    const want = Math.atan2(p.y - b.y, p.x - b.x);
    b.baseA += DG.clamp(DG.wrapAngle(want - b.baseA), -7*dt, 7*dt);
    if(DG.dist(b.x, b.y, p.x, p.y) < 0.6){ b.dead = true; return; }
  }
  if(b.homing){
    let best = null, bd = 7;
    G.enemies.forEach(e=>{ if(e.dead || e.spawn > 0 || e.untargetable) return; const d = DG.dist(b.x, b.y, e.x, e.y); if(d < bd){ bd = d; best = e; } });
    if(best){
      const want = Math.atan2(best.y - b.y, best.x - b.x);
      b.baseA += DG.clamp(DG.wrapAngle(want - b.baseA), -b.homing*dt*2.4, b.homing*dt*2.4);
    }
  }
  if(b.spiral) b.baseA += 2.6*dt*b.spin*b.spiral;
  let a = b.baseA;
  if(b.wiggle) a += Math.sin(b.t*16 + b.id)*0.55;
  b.vx = Math.cos(a)*sp; b.vy = Math.sin(a)*sp;
};

/* the creepy ones: an enemy shot that hangs in the air and then comes for
   you (stall), bends as it flies (curve), turns a little toward you (home)
   or bursts into more (split). All of them slow enough to read */
proto.steerEnemyShot = function(b, dt){
  const G = this, p = G.player;
  if(b.stall){
    const S = b.stall;
    if(!S.done && b.t >= S.at){
      if(!S.held){ S.held = true; S.vx = b.vx; S.vy = b.vy; b.vx = b.vy = 0; b.hanging = true; b.life += S.hold; }
      if(b.t >= S.at + S.hold){
        S.done = true; b.hanging = false;
        const a = Math.atan2(p.y - b.y, p.x - b.x);
        b.vx = Math.cos(a)*S.speed; b.vy = Math.sin(a)*S.speed;
        G.emit("dart", { x:b.x, y:b.y });
      }
    }
  }
  if(b.curve && !b.hanging){ const a = Math.atan2(b.vy, b.vx) + b.curve*dt, v = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a)*v; b.vy = Math.sin(a)*v; }
  if(b.home && !b.hanging && b.t < (b.homeT || 2)){
    const v = Math.hypot(b.vx, b.vy), a0 = Math.atan2(b.vy, b.vx), want = Math.atan2(p.y - b.y, p.x - b.x);
    const a = a0 + DG.clamp(DG.wrapAngle(want - a0), -b.home*dt, b.home*dt); b.vx = Math.cos(a)*v; b.vy = Math.sin(a)*v;
  }
  if(b.split && b.t >= b.split.at && !b.dead){
    const S = b.split, a0 = Math.atan2(b.vy, b.vx);
    b.dead = true;
    for(let i=0;i<S.n;i++){
      const a = a0 + (S.n > 1 ? (i/(S.n - 1) - 0.5)*S.spread*Math.PI/180 : 0);
      G.addBullet({ team:"e", x:b.x, y:b.y, vx:Math.cos(a)*S.speed, vy:Math.sin(a)*S.speed, r:b.r*0.8, dmg:b.dmg*0.7, life:3, kind:b.kind });
    }
    G.emit("pop", { x:b.x, y:b.y, team:"e" });
  }
};

/* enemy shots: hit Zippy, get eaten by moons and lily pads, get grazed */
proto.enemyShotStep = function(b, p){
  const G = this;
  if(b.hurtsEnemies){
    for(const e of G.enemies){
      if(e.dead || e.spawn > 0 || e.airborne || DG.dist2(b.x, b.y, e.x, e.y) > (b.r + e.r)*(b.r + e.r)) continue;
      G.damageEnemy(e, b.dmg, {}); b.dead = true; G.emit("pop", { x:b.x, y:b.y, team:"e" }); return;
    }
  }
  for(const a of G.allies){
    if(a.blocks && DG.dist2(b.x, b.y, a.x, a.y) < (a.r + b.r)*(a.r + b.r)){ b.dead = true; G.emit("pop", { x:b.x, y:b.y, team:"e" }); return; }
  }
  if(DG.Gribbus.blocks(G, b)){ b.dead = true; return; }
  const d2 = DG.dist2(b.x, b.y, p.x, p.y);
  if(p.blinkT <= 0 && d2 < (b.r + p.r*0.8)*(b.r + p.r*0.8)){
    if(p.iframes <= 0){
      G.hurtPlayer(b.dmg, b.kind);
      if(b.slow) p.chill = Math.max(p.chill, b.slow);
      b.dead = true; G.emit("pop", { x:b.x, y:b.y, team:b.team });
    }
    return;
  }
  // Reverse Bullet Hell: a near miss turns the shot around
  if(G.mods.special.graze && !b.grazed && d2 < 1.6){
    b.grazed = true;
    const t = DG.Gribbus.target(G, 12, b.x, b.y);
    const a = t ? Math.atan2(t.y - b.y, t.x - b.x) : Math.atan2(b.y - p.y, b.x - p.x);
    const sp = Math.max(10, Math.hypot(b.vx, b.vy)*1.5);
    b.dead = true;
    G.addShot({ x:b.x, y:b.y, a, speed:sp, r:0.18, dmg:G.payloadPower()*0.8, range:12, els:G.shotEls(G.gun()), power:G.gunStats().power, depth:1, homing:1 });
    G.emit("graze", { x:b.x, y:b.y });
  }
};

proto.shotHit = function(b, e){
  const G = this;
  const r = G.damageEnemy(e, b.dmg, { els:b.els, power:b.power, crit:b.crit, critMul:b.critMul, knock:b.knock, ax:b.vx, ay:b.vy, depth:b.depth, from:b.from, coin:b.coin });
  if(b.trap && !e.big && !e.dead){ e.st.trapped = b.trap; e.st.stun = Math.max(e.st.stun || 0, b.trap); G.emit("trapped", { id:e.id, x:e.x, y:e.y }); }
  G.trigger("hit", { x:e.x, y:e.y, els:b.els, depth:b.depth, enemy:e });
  if(r && r.crit) G.trigger("crit", { x:e.x, y:e.y, els:b.els, depth:b.depth, enemy:e });
};

proto.shotEnd = function(b, why, target){
  const G = this;
  if(b.dead) return;
  b.dead = true;
  if(b.blast){ G.explode(b.x, b.y, b.blast, b.dmg, b.team, { els:b.els, power:b.power, crit:b.crit, depth:b.depth }); }
  else G.emit("pop", { x:b.x, y:b.y, team:b.team, el:b.els ? b.els[0] : null, wall:why === "wall" });
  if(b.team !== "p") return;
  if(b.onEnd === "puddle") G.byproduct("poison", b.x, b.y, G.payloadPower(), 2);
  if(why === "wall") G.trigger("wall", { x:b.x, y:b.y, els:b.els, depth:b.depth });
  if(why === "expire"){
    G.trigger("expire", { x:b.x, y:b.y, els:b.els, depth:b.depth });
    if(G.mods.special.horizon && b.depth < G.mods.maxDepth && G.hazards.filter(h=> h.kind === "blackhole").length < 6)
      G.addHazard({ kind:"blackhole", x:b.x, y:b.y, r:2.8, t:1.8, P:G.payloadPower(), every:0.2, depth:b.depth + 1 });
  }
};

/* ================================================================== *
 *  Damage, statuses, reactions
 * ================================================================== */
/* what Silver Bullets bite harder into */
const HAUNTED = { ghost:1, banshee:1, skeleton:1, poltergeist:1, bride:1 };
proto.damageEnemy = function(e, amt, src){
  const G = this, M = G.mods;
  if(e.dead || e.spawn > 0 || e.airborne || e.invuln) return null;
  src = src || {};
  const els = src.els || (src.el ? [src.el] : []);
  let m = 1;
  if(e.affix && DG.AFFIXES[e.affix].dmgTaken) m *= DG.AFFIXES[e.affix].dmgTaken;
  if(e.def.armor) m *= e.def.armor;
  // the Warden's tower shield: from the front, shots barely scratch him
  if(e.lair && DG.LAIRS[e.lair].shield && !src.dot && (src.ax || src.ay)){
    const inc = Math.atan2(-src.ay, -src.ax);                // where the hit came from
    if(Math.abs(DG.wrapAngle(inc - e.face)) < 1.0){ m *= 0.15; if(!e.clangT || e.clangT < G.t){ e.clangT = G.t + 0.25; G.emit("clang", { x:e.x + Math.cos(e.face)*e.r, y:e.y + Math.sin(e.face)*e.r }); } }
  }
  if(e.lair && DG.AI.lairHurt) DG.AI.lairHurt(G, e);
  if(M.special.brittle && (e.st.chill > 0 || e.st.frozen > 0)) m *= 1 + 0.35*M.special.brittle;
  if(e.st.rot > 0) m *= 1.5;
  if(els.indexOf("arcane") >= 0 && !src.dot) m *= DG.STATUS.arcane.mul;
  if(e.st.marked > 0 && !src.dot && els.indexOf("arcane") < 0) m *= 1.1;
  if(M.special.silver && HAUNTED[e.type]) m *= 1.6;
  if(M.special.bossbane && e.big) m *= 1.25;
  // the Gribbus build
  const frogHit = src.from === "gribbus" || src.from === "tadpole" || src.frog;
  if(M.special.bogpact && !frogHit && !src.from) m *= 0.7;
  if(M.special.familiar){
    if(!frogHit && !src.from && !src.dot) e.dueT = G.t + 3;
    else if(frogHit && e.dueT > G.t){ e.dueT = 0; m *= 2; G.emit("due", { x:e.x, y:e.y, id:e.id }); }
  }
  if(M.special.firsthit && !src.dot && !e.firstHit){ e.firstHit = true; m *= 3; }
  let crit = false;
  if(!src.dot && src.crit && G.chance(src.crit)){
    m *= src.critMul || 2; crit = true;
    if(M.special.itch){ const p = G.player; p.itch = Math.min(8*M.special.itch, (G.t < (p.itchT || 0) ? p.itch || 0 : 0) + 1); p.itchT = G.t + 2; }
  }
  const d = amt*m;
  e.hp -= d; e.flash = 0.1;
  G.stats.dmg += d;
  if(frogHit) G.stats.frogDmg = (G.stats.frogDmg || 0) + d;
  // Swallow: the weak ones go down whole
  if(M.special.swallow && frogHit && !e.big && e.hp > 0 && e.hp < e.maxHp*0.15){ e.hp = 0; e.swallowed = true; G.emit("swallow", { x:e.x, y:e.y, id:e.id }); }
  // Lifedrinker: a little of every direct hit comes back as health, 4 a second at most
  if(M.special.lifesteal && !src.dot && !src.overkilled){
    const p = G.player;
    p.leech = Math.min(4, (p.leech || 0) + d*0.02*M.special.lifesteal);
    if(p.leech >= 1 && G.t >= (p.leechNext || 0) && p.hp < p.maxHp){ p.leech -= 1; p.leechNext = G.t + 0.25; G.heal(1); }
  }
  // the Executioner's Axe: the weak ones just die
  if(M.special.execute && !e.big && e.hp > 0 && e.hp < e.maxHp*(M.special.reaper ? 0.22 : 0.15)){ e.hp = 0; e.executed = true; G.emit("execute", { x:e.x, y:e.y, id:e.id }); }
  if(!src.dot) G.emit("hit", { x:e.x, y:e.y, amt:d, crit, el:els[0], id:e.id });
  if(e.decoy && !src.dot){ e.hp = Math.max(e.hp, 1); if(e.ai) e.ai.popped = true; }
  // statuses
  if(!src.dot && els.length){
    const pw = src.power || 1, S = DG.STATUS, dur = 1 + M.statusDur;
    els.forEach(el=>{
      if(el === "poison") G.poison(e, 1, pw, !!M.special.plague);
      if(el === "fire") G.applyBurn(e, S.burn.dps*pw, S.burn.dur*dur, !!M.special.wildfire);
      if(el === "frost"){
        e.st.chill = S.chill.dur*dur; e.st.chillStacks = (e.st.chillStacks || 0) + 1;
        if(e.st.chillStacks >= S.chill.freezeAt && !e.big){ e.st.frozen = S.chill.freeze; e.st.chillStacks = 0; G.emit("freeze", { x:e.x, y:e.y }); }
      }
      if(el === "shock") e.st.shocked = S.shock.dur*dur;
      if(el === "arcane") e.st.marked = S.arcane.dur*dur;
    });
    const arcP = (els.indexOf("shock") >= 0 ? S.shock.chance : 0) + (M.special.conductor ? 0.15 : 0);
    if(!src.noArc && arcP && G.chance(arcP)){
      const nx = G.nearestEnemy(e.x, e.y, S.shock.range, e);
      if(nx) G.chain(nx, amt*S.shock.arcFrac, (M.special.conductor || 0)*2, e.x, e.y, { els:["shock"], power:pw, depth:(src.depth || 0) + 1, noArc:true }, [e.id]);
    }
    if(!src.react) G.react(e);
  }
  // knockback (frozen and big things barely budge)
  if(src.knock && (src.ax || src.ay)){
    const l = Math.hypot(src.ax, src.ay) || 1, heavy = e.big ? 0.05 : e.r > 0.5 ? 0.35 : 1;
    const k = src.knock*(els.indexOf("arcane") >= 0 ? DG.STATUS.arcane.knock/1.5 : 1)*heavy*(e.st.frozen > 0 ? 0.3 : 1)*(e.def.speed ? 1 : 0);
    e.kx += src.ax/l*k*2.2; e.ky += src.ay/l*k*2.2;
  }
  if(e.hp <= 0){
    const over = -e.hp;
    G.killEnemy(e, src);
    if(M.special.overkill && over > 1 && !src.overkilled){ const nx = G.nearestEnemy(e.x, e.y, 6, e); if(nx){ G.emit("arc", { x1:e.x, y1:e.y, x2:nx.x, y2:nx.y, color:0xff4a5a }); G.damageEnemy(nx, over, { overkilled:true, depth:(src.depth || 0) + 1 }); } }
  }
  return { d, crit };
};
proto.applyBurn = function(e, dps, dur, wildfire){
  const b = e.st.burn;
  e.st.burn = { t:Math.max(dur, b ? b.t : 0), dps:Math.max(dps, b ? b.dps : 0), wildfire:wildfire || (b && b.wildfire) };
};
proto.poison = function(e, stacks, power, plague){
  const P = DG.STATUS.poison, st = e.st;
  if(!st.poison) st.poison = { stacks:0, t:0, dps:0, plague:false };
  st.poison.stacks = Math.min(P.max, st.poison.stacks + stacks);
  st.poison.t = P.dur*(1 + this.mods.statusDur);
  st.poison.dps = Math.max(st.poison.dps, P.dps*power);
  st.poison.plague = st.poison.plague || plague;
};
proto.nearestEnemy = function(x, y, range, not, struck, room){
  let best = null, bd = range;
  this.enemies.forEach(o=>{ if(o === not || o.dead || o.spawn > 0 || o.untargetable || (struck && struck.indexOf(o.id) >= 0) || (room !== undefined && o.room !== room)) return; const d = DG.dist(x, y, o.x, o.y); if(d < bd){ bd = d; best = o; } });
  return best;
};

/* two elements on one goblin: something happens */
const REACT_CAP = 4, REACT_REGEN = 2.2, REACT_SPLASH = 0.4;
proto.react = function(e){
  const G = this, st = e.st;
  if(e.dead || (st.reactCd || 0) > G.t) return;
  const has = {
    fire:!!(st.burn && st.burn.t > 0), frost:(st.chill || 0) > 0 || (st.frozen || 0) > 0,
    poison:!!(st.poison && st.poison.stacks > 0), shock:(st.shocked || 0) > 0, arcane:(st.marked || 0) > 0
  };
  const P = G.payloadPower()*(G.mods.special.thermal ? 1.6 : 1);
  const src = { react:true, els:[], depth:1, center:e.id };
  let key = null;
  if(has.fire && has.frost) key = "fire+frost";
  else if(has.fire && has.poison) key = "fire+poison";
  else if(has.fire && has.shock) key = "fire+shock";
  else if(has.frost && has.shock) key = "frost+shock";
  else if(has.poison && has.shock) key = "poison+shock";
  else if(has.frost && has.poison) key = "frost+poison";
  else if(has.arcane && (has.fire || has.frost || has.poison || has.shock)) key = "arcane";
  if(!key) return;
  // reactions draw on a shared budget (a few a second, refilling), so a
  // packed room can't set off a blast per goblin per frame; when it's dry the
  // statuses just wait for the next charge
  const rb = G.reactBudget || (G.reactBudget = { n:REACT_CAP, t:G.t });
  rb.n = Math.min(REACT_CAP, rb.n + (G.t - rb.t)*REACT_REGEN); rb.t = G.t;
  if(rb.n < 1) return;
  rb.n -= 1;
  st.reactCd = G.t + 0.7;
  const R = DG.REACTIONS[key];
  G.stats.reactions++;
  G.emit("react", { x:e.x, y:e.y, name:R.name, color:R.color, key });
  switch(key){
    case "fire+frost":
      st.burn.t = 0; st.chill = 0; st.chillStacks = 0;
      G.blast(e.x, e.y, 1.9, P*1.6, src, 0xe8f4ff);
      if(G.mods.special.fireice) G.enemies.forEach(o=>{ if(!o.dead && !o.boss && DG.dist(o.x, o.y, e.x, e.y) < 2.4) o.st.frozen = 1.2; });
      break;
    case "fire+poison": {
      const n = st.poison.stacks; st.poison.stacks = 0;
      G.explode(e.x, e.y, 1.5 + n*0.12, P*(1 + n*0.3), "p", { els:[], react:true, depth:1, center:e.id });
      break;
    }
    case "fire+shock":
      st.shocked = 0;
      G.explode(e.x, e.y, 1.6, P*1.3, "p", { els:[], react:true, depth:1, knock:7, center:e.id });
      break;
    case "frost+shock":
      st.shocked = 0; st.chill = 0; st.chillStacks = 0;
      G.damageEnemy(e, P*2.6, src); st.stun = Math.max(st.stun || 0, 1);
      break;
    case "frost+poison":
      st.chill = 0; st.rot = 4;
      break;
    case "poison+shock": {
      st.shocked = 0;
      const n = Math.max(1, Math.ceil(st.poison.stacks/2)), struck = [e.id];
      for(let i=0;i<3;i++){ const o = G.nearestEnemy(e.x, e.y, 5, e, struck); if(!o) break; struck.push(o.id); G.poison(o, n, st.poison.dps/DG.STATUS.poison.dps, st.poison.plague); G.emit("arc", { x1:e.x, y1:e.y, x2:o.x, y2:o.y, color:0xd8ff4a }); }
      break;
    }
    case "arcane":
      st.marked = 0;
      for(let i=0;i<2;i++) G.addShot({ x:e.x, y:e.y, a:G.rng.next()*TAU, speed:9, r:0.14, dmg:P*0.7, range:9, els:["arcane"], power:1, depth:2, homing:3, kind:"missile" });
      break;
  }
};
/* a burst of damage in a circle (reactions); no knockback, no further procs */
proto.blast = function(x, y, r, dmg, src, color){
  const G = this;
  G.emit("boom", { x, y, r, color, soft:true });
  G.enemies.forEach(o=>{ if(!o.dead && o.spawn <= 0 && DG.dist(x, y, o.x, o.y) < r + o.r) G.damageEnemy(o, dmg*(src.center === undefined || src.center === o.id ? 1 : REACT_SPLASH), src); });
};

proto.killEnemy = function(e, src, fell){
  const G = this, p = G.player, M = G.mods;
  if(e.dead) return;
  src = src || {};
  e.dead = true; e.hp = 0;
  if(e.decoy){ G.emit("kill", { x:e.x, y:e.y, id:e.id, type:e.type, decoy:true }); return; }
  G.stats.kills++;
  if(M.special.hollowing) p.hollow = Math.min(12, (p.hollow || 0) + (e.executed && M.special.reaper ? 2 : 1));
  if(M.special.frenzy){ p.frenzy = Math.min(6*M.special.frenzy, (G.t < (p.frenzyT || 0) ? p.frenzy || 0 : 0) + 1); p.frenzyT = G.t + 3; }
  G.emit("kill", { x:e.x, y:e.y, id:e.id, type:e.type, boss:!!e.boss, fell:!!fell, midas:!!M.special.midas });
  p.mana = Math.min(p.maxMana, p.mana + DG.PLAYER.manaOnKill + M.killMana);
  if(src.from === "gribbus" || src.from === "tadpole" || src.frog){
    if(DG.Gribbus.gainXp) DG.Gribbus.gainXp(G, e.boss ? 40 : Math.round((e.def.cost || 1)*5));
    if(DG.Roads) DG.Roads.frogKill(G, e);
    if(M.special.hungry && G.t >= (p.hungryT || 0)){ p.hungryT = G.t + 0.25; G.heal(1); }
  }
  // the gun in your hand learns from every kill
  const gun = G.gun();
  if(gun && !e.decoy && (gun.mastery || 0) < DG.Loot.MASTERY_MAX){
    gun.kills = (gun.kills || 0) + (e.boss ? 10 : 1);
    if(gun.kills >= DG.Loot.masteryNeed(gun.mastery || 0)){
      gun.kills = 0; gun.mastery = (gun.mastery || 0) + 1; G.recalc();
      G.emit("mastery", { name:gun.name, rank:gun.mastery, x:p.x, y:p.y });
      G.say(gun.name + " grows stronger. Mastery " + ["", "I", "II", "III", "IV", "V"][gun.mastery] + ".", 2.5);
    }
  }
  G.chargeActive(0.08);
  const [g0, g1] = e.def.gold || [1, 2];
  // deeper floors have more goblins already, so each one only pays a little more
  const gold = Math.round(G.rng.int(g0, g1)*(1 + 0.08*(G.floor - 1))*(e.affix ? 1.5 : 1));
  if(!fell && gold > 0) G.dropGold(e.x, e.y, gold);
  // elites sometimes carry a key
  if(!fell && e.affix && G.rng.chance(0.12)) G.addPickup("key", e.x, e.y, 1);
  if(src.from === "gribbus" && G.gribbus.g.flies) G.addPickup("flyheal", e.x, e.y, 1);
  G.trigger("kill", { x:e.x, y:e.y, els:src.els && src.els.length ? src.els : G.shotEls(G.gun()), depth:src.depth || 0, enemy:e });
  // things that happen when an enemy pops
  if(e.st.poison && e.st.poison.plague && e.st.poison.stacks > 0) G.addHazard({ kind:"cloud", x:e.x, y:e.y, r:1.8, t:2.5, P:e.st.poison.dps/DG.STATUS.poison.dps, every:0.5, plague:true });
  if(e.st.burn && e.st.burn.t > 0 && e.st.burn.wildfire){ G.explode(e.x, e.y, 1.9, e.st.burn.dps*2, "p", { els:["fire"], depth:1, react:true }); G.byproduct("fire", e.x, e.y, G.payloadPower(), 1); }
  if(e.affix === "vengeful") G.ring(e.x, e.y, DG.AFFIXES.vengeful.deathRing, 5.5, e.dmg*0.7, G.rng.next());
  if(e.affix === "haunted" && !e.boss){ const r = G.D.rooms[e.room]; G.pending.push({ t:0.4, fn:()=>{ if(r.active) G.spawnEnemy(r, { type:"ghost", x:e.x, y:e.y, quick:true, hpMul:0.5 }); } }); }
  // a Bloater bursts into a cloud of Gloom spores: don't pop it next to yourself
  if(e.def.deathCloud && !fell){ G.addHazard({ kind:"spores", x:e.x, y:e.y, r:1.9, t:3.2, dmg:e.dmg*0.45, every:0.5, team:"e" }); G.emit("burst", { x:e.x, y:e.y }); }
  if(e.def.splits && !fell){
    const r = G.D.rooms[e.room];
    for(let i=0;i<2;i++){ const a = G.rng.next()*TAU; G.spawnEnemy(r, { type:e.def.splits, x:e.x + Math.cos(a)*0.4, y:e.y + Math.sin(a)*0.4, quick:true }); }
  }
  if(e.def.reassemble && !e.reassembled && !fell && !(src.els && (src.els.indexOf("fire") >= 0 || src.els.indexOf("arcane") >= 0))){
    const r = G.D.rooms[e.room], x = e.x, y = e.y;
    G.emit("bones", { x, y });
    G.pending.push({ t:3, fn:()=>{ if(r.active){ const n = G.spawnEnemy(r, { type:e.type, x, y, quick:true, hpMul:0.6 }); n.reassembled = true; G.emit("reassemble", { x, y }); } } });
  }
  // Lucky Penny: killed by a coin, it pays out
  if(src.coin){ G.dropGold(e.x, e.y, 4 + G.floor); G.emit("jackpot", { x:e.x, y:e.y }); }
  if(M.special.clockwork){ G.clockKills = (G.clockKills || 0) + 1; if(G.clockKills % 12 === 0){ G.addWards(1, 4); G.emit("clockwork", { x:p.x, y:p.y }); } }
  if(e.boss) G.bossDown(e);
};

/* Shrink Ray: smaller, softer, lighter (bosses only shrink a bit) */
proto.shrinkEnemy = function(e, k){
  if(e.dead) return;
  if(e.shrink === undefined){ e.shrink = 1; e.r0 = e.r; e.dmg0 = e.dmg; }
  const min = e.big ? 0.85 : 0.5;
  if(e.shrink <= min) return;
  e.shrink = Math.max(min, e.shrink - k);
  e.r = e.r0*e.shrink; e.dmg = e.dmg0*e.shrink;
};
/* Portal Pockets: a shot that hits a room's wall comes out of the opposite one */
proto.portalShot = function(b, ox, oy){
  const G = this, r = DG.Dungeon.roomAt(G.D, ox, oy);
  if(!r) return false;
  const hx = G.bulletBlocked(b.x, oy);
  let x = ox, y = oy;
  if(hx) x = b.vx > 0 ? r.x1 + 0.35 : r.x2 + 0.65;
  else y = b.vy > 0 ? r.y1 + 0.35 : r.y2 + 0.65;
  if(G.bulletBlocked(x, y)) return false;
  G.emit("portal", { x1:ox, y1:oy, x2:x, y2:y });
  b.x = x; b.y = y; b.ported = true; b.dmg *= 1.3; b.hits = [];
  if(G.mods.special.wormhole) b.bounces += 1;
  return true;
};
/* Comet Cape: everything along the blink takes a hit and goes flying */
proto.cometHits = function(){
  const G = this, p = G.player, P = G.payloadPower();
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || e.untargetable || p.cometHit.indexOf(e.id) >= 0) return;
    if(DG.dist(e.x, e.y, p.x, p.y) > e.r + 0.7) return;
    p.cometHit.push(e.id);
    G.damageEnemy(e, P*2.4, { els:G.shotEls(G.gun()), power:G.gunStats().power, depth:1, ax:p.bdx, ay:p.bdy, knock:e.big ? 0.5 : 6 });
    G.emit("comet", { x:e.x, y:e.y });
  });
  if(G.mods.special.shootingstar && (p.starT = (p.starT || 0) + 1) % 3 === 0) G.byproduct(G.rng.pick(G.shotEls(G.gun())), p.x, p.y, P, 1);
};

/* ================================================================== *
 *  Triggers and payloads
 * ================================================================== */
proto.trigger = function(name, ctx){
  const G = this, list = G.mods.on[name];
  if(!list || !list.length) return;
  if((ctx.depth || 0) >= G.mods.maxDepth) return;
  G.procT = G.procT || {};
  for(let i=0;i<list.length;i++){
    const pl = list[i];
    if(pl.every) continue;                      // timed ones run from updateTicks
    if(pl.chance && !G.chance(pl.chance)) continue;
    if(name === "hit" || name === "bounce" || name === "crit"){
      const k = name + i; if((G.procT[k] || 0) > G.t) continue; G.procT[k] = G.t + 0.05;
    }
    G.payload(pl, ctx);
  }
};

proto.payload = function(pl, ctx){
  const G = this, p = G.player, rng = G.rng;
  const at = pl.at === "player" ? { x:p.x, y:p.y } : ctx;
  const x = at.x, y = at.y;
  const els = pl.el ? [pl.el] : (ctx.els && ctx.els.length ? ctx.els : G.shotEls(G.gun()));
  const P = ctx.power || G.payloadPower();
  const depth = (ctx.depth || 0) + 1;
  const s = G.gunStats();
  switch(pl.do){
    case "byproduct": G.byproduct(rng.pick(els), x, y, P, depth); break;
    case "shards":
      for(let i=0;i<(pl.n || 4);i++){ const a = i/(pl.n || 4)*TAU + rng.next()*0.4;
        G.addShot({ x, y, a, speed:12, r:0.1, dmg:P*(pl.dmg || 0.5)*0.6, range:5, els, power:s.power, depth, kind:"shard", homing:0 }); }
      break;
    case "wisp": for(let i=0;i<(pl.n || 1);i++) G.spawnAlly("wisp", x, y, { el:rng.pick(els), P }); break;
    case "burst": G.explode(x, y, pl.r || 1.5, P*(pl.dmg || 1)*1.2, "p", { els, power:s.power, depth }); break;
    case "chain": {
      const tg = pl.target === "random" ? rng.pick(G.enemies.filter(e=> !e.dead && e.spawn <= 0 && !e.untargetable).concat([null])) : G.nearestEnemy(x, y, 7, ctx.enemy);
      if(tg) G.chain(tg, P*(pl.dmg || 1), pl.jumps || 2, x, y, { els:["shock"].concat(els.filter(e=> e !== "shock")), power:s.power, depth, noArc:true }, ctx.enemy ? [ctx.enemy.id] : []);
      break;
    }
    case "nova": G.nova(x, y, pl.r || 2.5, P*(pl.dmg || 1), els, depth); break;
    case "ring":
      for(let i=0;i<(pl.n || 8);i++){ const a = i/(pl.n || 8)*TAU;
        G.addShot({ x:p.x, y:p.y, a, speed:s.speed, r:s.size, dmg:s.dmg*(pl.dmg || 1), range:s.range*0.7, pierce:G.mods.shot.pierce, bounces:G.mods.shot.bounces, els, power:s.power, depth, crit:s.crit, critMul:s.critMul }); }
      break;
    case "tadpole": for(let i=0;i<(pl.n || 1)*(G.mods.special.frogswarm ? 2 : 1);i++) G.spawnAlly("tadpole", x + rng.range(-0.5, 0.5), y + rng.range(-0.5, 0.5), { P }); break;
    case "heal": G.heal(pl.n || 2); break;
    case "mana": p.mana = Math.min(p.maxMana, p.mana + (pl.n || 5)); break;
    case "ward": G.addWards(pl.n || 1, pl.max); break;
    case "gold": G.dropGold(x, y, pl.n || 1); break;
    case "blackhole": G.addHazard({ kind:"blackhole", x, y, r:2.8, t:1.8, P, every:0.2, depth }); break;
    case "status": {
      const e = ctx.enemy; if(!e || e.dead || e.big) break;
      e.st[pl.st] = Math.max(e.st[pl.st] || 0, pl.t || 2);
      G.emit("status", { id:e.id, x:e.x, y:e.y, st:pl.st });
      break;
    }
    case "shrink": if(ctx.enemy) G.shrinkEnemy(ctx.enemy, pl.k || 0.06); break;
    case "stickybomb": {
      const e = ctx.enemy; if(!e || e.dead) break;
      G.emit("stick", { id:e.id, x:e.x, y:e.y });
      G.pending.push({ t:1, fn:()=> G.explode(e.x, e.y, pl.r || 1.5, P*(pl.dmg || 1.2), "p", { els, power:s.power, depth }) });
      break;
    }
    case "gum": if(!G.bulletBlocked(x, y) && G.hazards.filter(h=> h.kind === "gum").length < 24) G.addHazard({ kind:"gum", x, y, r:0.9, t:4.5, P, every:0.2, depth }); break;
    case "bee": for(let i=0;i<(pl.n || 1);i++) if(G.allies.filter(a=> a.kind === "bee").length < 10) G.spawnAlly("bee", x, y, { P }); break;
    case "ghoul": if(ctx.enemy && !ctx.enemy.boss && G.allies.filter(a=> a.kind === "ghoul").length < 3) G.spawnAlly("ghoul", x, y, { P, model:ctx.enemy.def.model || ctx.enemy.type }); break;
    case "hiccup": {
      const a = rng.next()*TAU;
      G.addShot({ x:p.x, y:p.y, a, speed:s.speed*0.55, r:0.34, dmg:s.dmg*2.2, range:s.range, els, power:s.power, depth, kind:"bubble", knock:3, homing:0 });
      G.emit("hiccup", { x:p.x, y:p.y });
      break;
    }
    case "shove": {
      const r = pl.r || 4;
      G.emit("shove", { x:p.x, y:p.y, r });
      G.enemies.forEach(e=>{
        if(e.dead || e.spawn > 0 || DG.dist(e.x, e.y, p.x, p.y) > r + e.r) return;
        const d = DG.dist(e.x, e.y, p.x, p.y) || 1;
        if(!e.big){ e.kx += (e.x - p.x)/d*14; e.ky += (e.y - p.y)/d*14; e.st.stun = Math.max(e.st.stun || 0, pl.stun || 0.6); }
        if(G.mods.special.barnyard && !e.big) e.st.confused = Math.max(e.st.confused || 0, 2.5);
      });
      break;
    }
    case "candy": G.addPickup("flyheal", x, y, 1); break;
    case "missile": {
      // a homing bone missile off the hit
      const a = rng.next()*TAU;
      G.addShot({ x, y, a, speed:10, r:0.16, dmg:P*(pl.dmg || 3)*0.6, range:14, els, power:s.power, depth, kind:"missile", homing:2.5 });
      break;
    }
    case "toll":
      G.enemies.forEach(e=>{ if(!e.dead && !e.big && G.room && e.room === G.room.id) e.st.stun = Math.max(e.st.stun || 0, pl.t || 1.5); });
      G.emit("toll", { x:p.x, y:p.y });
      break;
    case "dice": {
      const roll = 1 + Math.floor(rng.next()*6);
      p.diceMul = [0.6, 0.8, 1, 1.2, 1.5, 1.8][roll - 1];
      G.emit("dice", { roll, mul:p.diceMul });
      G.say("Loaded Dice: you rolled a " + roll + ". " + p.diceMul + "x damage in here.", 2.2);
      break;
    }
  }
};

/* what an element leaves behind */
proto.byproduct = function(el, x, y, P, depth){
  const G = this, M = G.mods, B = DG.BYPRODUCTS[el];
  if(!B) return;
  if(G.bulletBlocked(x, y)) return;
  const grow = M.special.overgrowth ? 1 : 0;
  const t = B.t*(1 + grow)*(1 + M.byproductDur), r = B.r*(1 + 0.4*grow);
  G.addHazard({ kind:B.kind, el, x, y, r, t, P, every:B.every || 0.25, depth });
  G.emit("byproduct", { kind:B.kind, el, x, y });
  if(M.special.wispcraft && depth < M.maxDepth + 1 && G.allies.filter(a=> a.kind === "wisp").length < 14) G.spawnAlly("wisp", x, y, { el, P });
};

/* a Lantern Beam: the old fire in a straight line, through everything in its way, three pulses */
proto.lanternBeam = function(x, y, a, dmg, src){
  const G = this, len = G.beamLength(x, y, a, 16), dx = Math.cos(a), dy = Math.sin(a);
  G.emit("lanternBeam", { x, y, a, len });
  const pulse = ()=> G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0) return;
    const rx = e.x - x, ry = e.y - y, along = rx*dx + ry*dy;
    if(along < 0 || along > len || Math.abs(rx*dy - ry*dx) > 0.7 + e.r) return;
    G.damageEnemy(e, dmg/3, Object.assign({ els:["fire"], power:1, depth:1, ax:dx, ay:dy, knock:0.6 }, src || {}));
  });
  pulse(); G.pending.push({ t:0.2, fn:pulse }, { t:0.4, fn:pulse });
};
proto.nova = function(x, y, r, dmg, els, depth, frog){
  const G = this;
  G.emit("nova", { x, y, r, el:els[0] });
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || DG.dist(e.x, e.y, x, y) > r + e.r) return;
    G.damageEnemy(e, dmg, { els, power:G.gunStats().power, depth, ax:e.x - x, ay:e.y - y, knock:1.5, frog:!!frog });
  });
};

/* lightning: hit e, then leap to the nearest enemy not yet struck */
proto.chain = function(e, dmg, jumps, fx, fy, src, struck){
  const G = this;
  struck = struck || [];
  let cur = e, px = fx, py = fy;
  for(let j=0; j<=jumps && cur; j++){
    struck.push(cur.id);
    G.emit("arc", { x1:px, y1:py, x2:cur.x, y2:cur.y });
    px = cur.x; py = cur.y;
    G.damageEnemy(cur, dmg, Object.assign({}, src, { noArc:true, ax:0, ay:0, knock:0.3 }));
    dmg *= 0.9;
    cur = G.nearestEnemy(px, py, DG.STATUS.shock.range*1.6, null, struck);
  }
};

/* an explosion: team "p" hurts enemies; team "e" hurts Zippy AND enemies */
proto.explode = function(x, y, r, dmg, team, src){
  const G = this, M = G.mods;
  src = src || {};
  if(team === "p"){ const k = 1 + M.boom + (M.special.megabombs ? 0.6 : 0); r *= k; dmg *= M.special.megabombs ? 1.4 : 1; }
  G.emit("boom", { x, y, r, el:src.els && src.els[0] });
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || src.skip === e.id) return;
    const d = DG.dist(x, y, e.x, e.y); if(d > r + e.r) return;
    const splash = src.center === undefined || src.center === e.id ? 1 : REACT_SPLASH;
    G.damageEnemy(e, dmg*splash*(team === "e" ? 0.8 : 1)*(1 - 0.4*d/(r + e.r)), Object.assign({ knock:3, ax:e.x - x, ay:e.y - y }, src));
  });
  if(team === "e"){ const p = G.player; if(DG.dist(x, y, p.x, p.y) < r + p.r) G.hurtPlayer(dmg, src.why || "boom"); }
  G.breakablesNear(x, y, r);
  G.D.fakes.forEach(f=>{ if(!f.revealed && DG.dist(x, y, f.x, f.y) < r + 0.5) G.revealFake(f.tiles[0][0], f.tiles[0][1]); });
  if(team === "p" && M.special.chainreaction && (src.depth || 0) < 3 && G.chance(0.4)){
    const d = (src.depth || 0) + 1, a = G.rng.next()*TAU;
    G.pending.push({ t:0.15, fn:()=> G.explode(x + Math.cos(a)*r*0.8, y + Math.sin(a)*r*0.8, r*0.7/(1 + M.boom + (M.special.megabombs ? 0.6 : 0)), dmg*0.6, "p", Object.assign({}, src, { depth:d })) });
  }
};

/* a ring of enemy shots */
proto.ring = function(x, y, n, speed, dmg, off, kind){
  for(let i=0;i<n;i++){
    const a = (i/n + (off || 0))*TAU;
    this.addBullet({ team:"e", x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, r:0.2, dmg, life:4, kind:kind || "orb" });
  }
};

/* ---- breakables: pots, crates, barrels ---- */
proto.hitBreakable = function(tx, ty, dmg){
  const G = this, br = G.D.breakMap && G.D.breakMap[ty*G.D.w + tx];
  if(!br || br.broken) return;
  br.hp -= dmg;
  G.emit("chip", { id:br.id, x:tx + 0.5, y:ty + 0.5 });
  if(br.hp <= 0) G.breakIt(br);
};
proto.breakIt = function(br){
  const G = this;
  if(br.broken) return;
  br.broken = true;
  G.D.set(br.x, br.y, T.FLOOR); G.D.breakMap[br.y*G.D.w + br.x] = null; G.D.ver = (G.D.ver || 0) + 1;
  G.emit("break", { id:br.id, x:br.x + 0.5, y:br.y + 0.5, kind:br.kind });
  const x = br.x + 0.5, y = br.y + 0.5;
  if(br.kind === "xbarrel"){ G.explode(x, y, 2.2, 30*G.scale.dmg, "e", { why:"barrel" }); return; }
  const roll = G.rng.next()/G.luck(1);
  if(roll < 0.28) G.dropGold(x, y, G.rng.int(1, 3));
  else if(roll < 0.33) G.addPickup("heart", x, y, 10);
  else if(roll < 0.37) G.addPickup("mana", x, y, 25);
  else if(roll < 0.385) G.addPickup("ward", x, y, 1);
};
proto.breakablesNear = function(x, y, r){
  const G = this; if(!G.D.breakables) return;
  G.D.breakables.forEach(br=>{ if(!br.broken && DG.dist(x, y, br.x + 0.5, br.y + 0.5) < r + 0.5) G.breakIt(br); });
};

/* ================================================================== *
 *  Hazards: byproducts, clouds, black holes, enemy spores and slime
 * ================================================================== */
proto.addHazard = function(h){
  h.id = this.nextId++; h.max = h.t; h.tick = 0; h.team = h.team || "p";
  this.hazards.push(h);
  if(this.hazards.length > 70) this.hazards.shift();
  return h;
};
proto.updateHazards = function(dt){
  const G = this, p = G.player;
  for(const h of G.hazards){
    h.t -= dt; h.tick -= dt;
    const fire = h.tick <= 0; if(fire) h.tick = h.every || 0.25;
    const inR = (e, k)=> DG.dist(h.x, h.y, e.x, e.y) < h.r*(k || 1) + e.r*0.5;
    const live = e=> !e.dead && e.spawn <= 0 && !e.airborne;
    switch(h.kind){
      case "icicle": {
        const touched = G.enemies.some(e=> live(e) && inR(e, 1.2));
        if(touched || h.t <= 0){
          h.t = 0;
          G.emit("shatter", { x:h.x, y:h.y });
          const B = DG.BYPRODUCTS.frost;
          for(let i=0;i<B.shards;i++) G.addShot({ x:h.x, y:h.y, a:i/B.shards*TAU, speed:11, r:0.11, dmg:h.P*B.shardDmg, range:4.5, els:["frost"], power:1, depth:h.depth, kind:"shard", homing:0 });
        }
        break;
      }
      case "flame": if(fire) G.enemies.forEach(e=>{ if(live(e) && inR(e)){ G.damageEnemy(e, h.P*0.25*0.7, { els:[], dot:true }); G.applyBurn(e, DG.STATUS.burn.dps, 2, !!G.mods.special.wildfire); G.react(e); } }); break;
      case "puddle": if(fire) G.enemies.forEach(e=>{ if(live(e) && inR(e)){ G.poison(e, 1, 1, !!G.mods.special.plague); G.react(e); } }); break;
      case "cloud":  if(fire) G.enemies.forEach(e=>{ if(live(e) && inR(e)) G.poison(e, 1, h.P || 1, h.plague); }); break;
      case "spark": if(fire){
        const e = G.nearestEnemy(h.x, h.y, DG.BYPRODUCTS.shock.reach);
        if(e){ G.emit("arc", { x1:h.x, y1:h.y, x2:e.x, y2:e.y }); G.damageEnemy(e, h.P*DG.BYPRODUCTS.shock.dmg, { els:["shock"], power:1, depth:h.depth, noArc:true }); }
      } break;
      case "rune": if(fire){
        const e = G.nearestEnemy(h.x, h.y, 9);
        if(e) G.addShot({ x:h.x, y:h.y, a:Math.atan2(e.y - h.y, e.x - h.x), speed:10, r:0.13, dmg:h.P*DG.BYPRODUCTS.arcane.dmg, range:10, els:["arcane"], power:1, depth:h.depth, homing:2.5, kind:"missile" });
      } break;
      case "gum": if(fire) G.enemies.forEach(e=>{ if(live(e) && inR(e)) e.st.chill = Math.max(e.st.chill || 0, 0.35); }); break;
      case "blackhole":
        G.enemies.forEach(e=>{
          if(!live(e) || e.big) return;
          const d = DG.dist(h.x, h.y, e.x, e.y); if(d > h.r) return;
          G.move(e, (h.x - e.x)/Math.max(0.3, d)*5*dt, (h.y - e.y)/Math.max(0.3, d)*5*dt, "flying");
          if(fire) G.damageEnemy(e, h.P*0.35, { els:["arcane"], dot:true });
        });
        G.bullets.forEach(b=>{ if(b.team === "e" && DG.dist(h.x, h.y, b.x, b.y) < h.r*0.6) b.dead = true; });
        break;
      /* the enemies' */
      case "spores": if(fire && DG.dist(h.x, h.y, p.x, p.y) < h.r + p.r*0.5) G.hurtPlayer(h.dmg, "spores"); break;
      case "grave":  if(DG.dist(h.x, h.y, p.x, p.y) < h.r + p.r*0.5) p.chill = Math.max(p.chill, 0.45); break;
      case "slime":  if(DG.dist(h.x, h.y, p.x, p.y) < h.r + p.r*0.5) p.chill = Math.max(p.chill, 0.3); break;
      case "fireline": if(fire && DG.dist(h.x, h.y, p.x, p.y) < h.r + p.r*0.5) G.hurtPlayer(h.dmg, "fire"); break;
      case "shockwave": {
        // a ring that expands; jump it with a blink
        const k = 1 - h.t/h.max, rr = h.r*k, d = DG.dist(h.x, h.y, p.x, p.y);
        if(!h.hit && Math.abs(d - rr) < 0.5 && p.blinkT <= 0){ h.hit = true; G.hurtPlayer(h.dmg, "shockwave"); }
        break;
      }
    }
  }
  G.hazards = G.hazards.filter(h=> h.t > 0);
};

/* ================================================================== *
 *  Allies: wisps, tadpoles, the shadow, turrets, moons
 * ================================================================== */
proto.spawnAlly = function(kind, x, y, o){
  const G = this, M = G.mods;
  o = o || {};
  const P = o.P || G.payloadPower();
  const a = { id:G.nextId++, kind, x, y, vx:0, vy:0, t:0, cd:0, r:0.2, P, el:o.el || G.gun().element };
  if(kind === "wisp"){ a.life = 8*(M.special.wisplord ? 2 : 1); a.dmg = P*0.7*(1 + M.wispDmg)*(M.special.wisplord ? 2 : 1); a.speed = 7.5; a.orbit = G.rng.next()*TAU; }
  if(kind === "tadpole"){ a.life = 14; a.dmg = P*0.35*(M.special.frogswarm ? 1.6 : 1); a.speed = 5.5; a.r = 0.16; }
  if(kind === "shadow"){ a.life = o.life || Infinity; a.r = 0.3; }
  if(kind === "turret"){ a.life = o.life || 10; a.r = 0.35; a.blocks = false; }
  if(kind === "moon"){ a.life = Infinity; a.r = 0.28; a.blocks = true; a.dmg = P*0.8; a.orbit = o.orbit || 0; }
  if(kind === "bee"){ const k = M.special.killerbees ? 2 : 1; a.life = 6*k; a.dmg = P*0.22*k; a.speed = 9.5; a.r = 0.12; a.el = "poison"; a.orbit = G.rng.next()*TAU; }
  if(kind === "ghoul"){ a.life = 10; a.dmg = P*0.9; a.speed = 4.4; a.r = 0.3; a.model = o.model || "grunt"; a.orbit = G.rng.next()*TAU; }
  if(kind === "hat"){ a.life = 4; a.r = 0.4; a.dmg = P*1.2; a.orbit = G.rng.next()*TAU; a.hitT = {}; }
  if(kind === "olm"){ a.life = Infinity; a.r = 0.5; a.speed = 2.6; a.cd = 2; a.ward = null; }
  G.allies.push(a);
  G.emit("ally", { id:a.id, kind, x, y, el:a.el });
  return a;
};
proto.updateAllies = function(dt){
  const G = this, p = G.player;
  for(const a of G.allies){
    a.t += dt; a.life -= dt; a.cd -= dt;
    if(a.life <= 0){ a.dead = true; G.emit("allyGone", { id:a.id, x:a.x, y:a.y, kind:a.kind }); continue; }
    if(a.kind === "wisp" || a.kind === "tadpole" || a.kind === "bee" || a.kind === "ghoul"){
      const tg = G.nearestEnemy(a.x, a.y, a.kind === "wisp" ? 9 : a.kind === "tadpole" ? 7 : 8);
      let tx, ty;
      if(tg){ tx = tg.x; ty = tg.y; }
      else { a.orbit += dt*2.5; tx = p.x + Math.cos(a.orbit)*1.6; ty = p.y + Math.sin(a.orbit)*1.6; }
      const d = Math.hypot(tx - a.x, ty - a.y) || 1, sp = a.speed*(tg ? 1 : 0.7);
      const k = 1 - Math.exp(-dt*6);
      a.vx += ((tx - a.x)/d*sp - a.vx)*k; a.vy += ((ty - a.y)/d*sp - a.vy)*k;
      if(a.kind === "tadpole" || a.kind === "ghoul") G.move(a, a.vx*dt, a.vy*dt, "frog"); else { a.x += a.vx*dt; a.y += a.vy*dt; }
      if(tg && a.cd <= 0 && DG.dist(a.x, a.y, tg.x, tg.y) < tg.r + a.r + 0.2){
        a.cd = { wisp:0.45, tadpole:0.55, bee:0.3, ghoul:0.7 }[a.kind];
        G.damageEnemy(tg, a.dmg, { els:a.kind === "wisp" || a.kind === "bee" ? [a.el] : [], power:1, depth:2, ax:tg.x - a.x, ay:tg.y - a.y, knock:a.kind === "ghoul" ? 1.5 : 0.6, from:a.kind });
        G.emit("allyHit", { x:tg.x, y:tg.y, kind:a.kind, el:a.el });
      }
    } else if(a.kind === "shadow"){
      // a step behind and to the side of Zippy
      const tx = p.x - Math.cos(p.aim)*1.1 + Math.cos(p.aim + Math.PI/2)*0.7, ty = p.y - Math.sin(p.aim)*1.1 + Math.sin(p.aim + Math.PI/2)*0.7;
      const k = 1 - Math.exp(-dt*10); a.x += (tx - a.x)*k; a.y += (ty - a.y)*k;
    } else if(a.kind === "turret"){
      const tg = G.nearestEnemy(a.x, a.y, 10);
      if(tg && a.cd <= 0 && G.los(a.x, a.y, tg.x, tg.y)){
        const g = G.gun(), s = G.gunStats(g);
        a.cd = 1.4/s.rate*Math.max(1, s.pellets/2);
        G.fireVolley(a.x, a.y, Math.atan2(tg.y - a.y, tg.x - a.x), g, s, { mul:0.7, from:"turret", quiet:true });
      }
    } else if(a.kind === "hat"){
      // out in a widening spiral and back again
      const k = a.t/4, rad = 1.2 + 3*Math.sin(Math.min(1, k)*Math.PI);
      a.orbit += dt*4.2;
      a.x = p.x + Math.cos(a.orbit)*rad; a.y = p.y + Math.sin(a.orbit)*rad;
      G.enemies.forEach(e=>{ if(!e.dead && e.spawn <= 0 && (a.hitT[e.id] || 0) <= G.t && DG.dist(a.x, a.y, e.x, e.y) < e.r + a.r){ a.hitT[e.id] = G.t + 0.35; G.damageEnemy(e, a.dmg, { els:G.shotEls(G.gun()), power:1, depth:2, ax:e.x - p.x, ay:e.y - p.y, knock:2, from:"hat" }); } });
    } else if(a.kind === "olm"){
      // Brother Olm: slow, a few steps behind; every few seconds a Lantern Beam at whatever's nearest; a ward for you at every locked door
      const tx = p.x - Math.cos(p.aim)*2.2, ty = p.y - Math.sin(p.aim)*2.2, d = Math.hypot(tx - a.x, ty - a.y);
      if(d > 0.4){ const sp = Math.min(a.speed*(d > 6 ? 2 : 1), d/dt); G.move(a, (tx - a.x)/d*sp*dt, (ty - a.y)/d*sp*dt, "frog"); }
      if(d > 14){ a.x = p.x - 1; a.y = p.y + 1; }
      const tg = G.room && G.room.active ? G.nearestEnemy(a.x, a.y, 12) : null;
      if(tg && a.cd <= 0 && G.los(a.x, a.y, tg.x, tg.y)){ a.cd = 3.2; a.face = Math.atan2(tg.y - a.y, tg.x - a.x); G.lanternBeam(a.x, a.y, a.face, G.payloadPower()*3.2, { from:"olm" }); }
      if(G.room && G.room.active && a.ward !== G.room.id){ a.ward = G.room.id; G.addWards(1); G.emit("olmWard", { x:a.x, y:a.y }); }
    } else if(a.kind === "moon"){
      a.orbit += dt*2.2;
      a.x = p.x + Math.cos(a.orbit)*1.7; a.y = p.y + Math.sin(a.orbit)*1.7;
      if(a.cd <= 0) G.enemies.forEach(e=>{ if(!e.dead && e.spawn <= 0 && DG.dist(a.x, a.y, e.x, e.y) < e.r + a.r){ a.cd = 0.3; G.damageEnemy(e, G.payloadPower()*0.8, { els:G.shotEls(G.gun()), power:1, depth:2, ax:e.x - p.x, ay:e.y - p.y, knock:1.5 }); } });
    }
  }
  G.allies = G.allies.filter(a=> !a.dead);
};

/* timed payloads (Tick Tock, Stormcaller, Swamp Feet...) run while a room is locked */
proto.updateTicks = function(dt){
  const G = this, list = G.mods.on.tick || [], p = G.player;
  const fight = G.room && G.room.active;
  if(!fight) return;
  list.forEach((pl, i)=>{
    if(pl.moving && !p.moving) return;
    G.tickT[i] = (G.tickT[i] || 0) + dt;
    if(G.tickT[i] >= pl.every){ G.tickT[i] = 0; G.payload(pl, { x:p.x, y:p.y, depth:0 }); }
  });
  // Haunted Gun: when Zippy stops shooting, something else pulls the trigger
  if(G.mods.special.haunted && G.t - (p.lastShot || 0) > 0.6){
    G.hauntCd = (G.hauntCd || 0) - dt;
    if(G.hauntCd <= 0){
      const t = G.nearestEnemy(p.x, p.y, 7);
      if(t && G.los(p.x, p.y, t.x, t.y)){
        const g = G.gun(), s = G.gunStats(g), a = Math.atan2(t.y - p.y, t.x - p.x);
        G.hauntCd = 1.6/s.rate;
        G.fireVolley(p.x, p.y, a, g, s, { mul:0.5, from:"ghost", quiet:true });
        G.emit("haunt", { x:p.x, y:p.y, a });
      }
    }
  }
  if(G.mods.special.gremlin){
    G.tickT.gremlin = (G.tickT.gremlin || 0) + dt;
    if(G.tickT.gremlin >= 8){
      G.tickT.gremlin = 0;
      const opts = [{ do:"nova", r:3.5, dmg:1.5 }, { do:"ring", n:12, dmg:1 }, { do:"chain", jumps:6, dmg:1.5, target:"random" }, { do:"wisp", n:4 }, { do:"tadpole", n:5 }, { do:"blackhole" }, { do:"burst", r:3, dmg:2 }];
      const pl = G.rng.pick(opts);
      G.emit("gremlin", { x:p.x, y:p.y });
      G.payload(pl, { x:p.x, y:p.y, depth:0 });
    }
  }
};

/* ================================================================== *
 *  Statuses over time
 * ================================================================== */
proto.updateStatus = function(dt){
  const G = this;
  G.plagueTick = (G.plagueTick || 0) - dt;
  const spread = G.plagueTick <= 0; if(spread) G.plagueTick = 1;
  G.enemies.forEach(e=>{
    if(e.dead) return;
    const st = e.st;
    e.flash = Math.max(0, (e.flash || 0) - dt);
    if(st.poison && st.poison.stacks > 0){
      st.poison.t -= dt;
      G.damageEnemy(e, st.poison.dps*st.poison.stacks*dt, { dot:true, els:["poison"] });
      if(st.poison.t <= 0){ st.poison.stacks = 0; st.poison.plague = false; }
      else if(spread && st.poison.plague){
        G.enemies.forEach(o=>{
          if(o === e || o.dead || o.spawn > 0) return;
          if(DG.dist(e.x, e.y, o.x, o.y) > 2.5) return;
          G.poison(o, 1, st.poison.dps/DG.STATUS.poison.dps, true);
          G.emit("infect", { x1:e.x, y1:e.y, x2:o.x, y2:o.y });
          if(G.mods.special.plaguestorm) G.damageEnemy(o, G.payloadPower()*0.4, { els:["shock"], power:1, depth:2, noArc:true });
        });
      }
    }
    if(e.dead) return;
    if(st.burn && st.burn.t > 0){ st.burn.t -= dt; G.damageEnemy(e, st.burn.dps*dt, { dot:true, els:["fire"] }); }
    if(e.dead) return;
    if(st.chill > 0){ st.chill -= dt; if(st.chill <= 0) st.chillStacks = 0; }
    ["frozen", "stun", "shocked", "marked", "rot", "trapped", "confused"].forEach(k=>{ if(st[k] > 0) st[k] -= dt; });
  });
};

/* enemies don't stack on each other, or on Zippy */
proto.separate = function(){
  const E = this.enemies, p = this.player;
  for(let i=0;i<E.length;i++){
    const a = E[i]; if(a.dead || a.airborne || a.def.speed === 0) continue;
    const who = a.phases ? "ghost" : "enemy";
    for(let j=i + 1;j<E.length;j++){
      const b = E[j]; if(b.dead || b.airborne) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if(d > 0.0001 && d < m){
        const push = (m - d)*0.5, ux = dx/d, uy = dy/d, wa = a.boss ? 0.1 : 1, wb = b.boss || b.def.speed === 0 ? 0 : 1;
        this.move(a, -ux*push*wa, -uy*push*wa, who); if(wb) this.move(b, ux*push*wb, uy*push*wb, b.phases ? "ghost" : "enemy");
      }
    }
    const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy), m = a.r + p.r;
    if(d > 0.0001 && d < m && p.blinkT <= 0) this.move(a, dx/d*(m - d), dy/d*(m - d), who);
  }
};

/* ================================================================== *
 *  Bombs (goblin bombs, poltergeist junk, Zippy's big bomb, meteors)
 *  and beams (watchers, the Eye)
 * ================================================================== */
proto.updateBombs = function(dt){
  const G = this;
  G.bombs.forEach(b=>{
    b.t += dt;
    if(b.t >= b.flight + b.fuse){
      b.dead = true;
      if(b.spore){ if(b.cb) b.cb(); G.emit("poof", { x:b.tx, y:b.ty }); }
      else if(b.team === "p") G.explode(b.tx, b.ty, b.r, b.dmg, "p", { els:G.shotEls(G.gun()), depth:1 });
      else G.explode(b.tx, b.ty, b.r, b.dmg, "e", { why:b.junk ? "junk" : "boom" });
    }
  });
  G.bombs = G.bombs.filter(b=> !b.dead);
};
/* a beam: telegraphed (tell), then live for `time`; `sweep` turns it */
proto.addBeam = function(o){
  const G = this;
  const b = Object.assign({ id:G.nextId++, t:0, w:0.45, sweep:0, hitCd:0 }, o);
  G.beams.push(b);
  G.emit("beam", { id:b.id });
  return b;
};
proto.beamLength = function(x, y, a, max){
  for(let d=0.5; d<max; d+=0.25) if(this.bulletBlocked(x + Math.cos(a)*d, y + Math.sin(a)*d)) return d;
  return max;
};
proto.updateBeams = function(dt){
  const G = this, p = G.player;
  G.beams.forEach(b=>{
    if(G.timeStop > 0) return;
    b.t += dt;
    const owner = G.enemies.find(e=> e.id === b.owner);
    if(!owner || owner.dead){ b.dead = true; return; }
    b.x = owner.x; b.y = owner.y;
    if(b.t > b.tell) b.a += b.sweep*dt;
    b.len = G.beamLength(b.x, b.y, b.a, b.max || 18);
    b.live = b.t > b.tell;
    if(b.t > b.tell + b.time){ b.dead = true; return; }
    if(!b.live) return;
    b.hitCd -= dt;
    // distance from Zippy to the beam's segment
    const dx = Math.cos(b.a), dy = Math.sin(b.a), rx = p.x - b.x, ry = p.y - b.y, along = rx*dx + ry*dy;
    if(b.dmg > 0 && along > 0 && along < b.len && Math.abs(rx*dy - ry*dx) < b.w + p.r*0.6 && b.hitCd <= 0){ b.hitCd = 0.4; G.hurtPlayer(b.dmg, "laser"); }
  });
  G.beams = G.beams.filter(b=> !b.dead);
};

/* ================================================================== *
 *  Spells (right mouse): the gun's element, through the gun
 * ================================================================== */
proto.castSpell = function(g, s, I, echo){
  const G = this, p = G.player, sp = DG.SPELLS[s.spell], pw = s.power*G.dmgBonus()*G.mods.dmgMul*Math.max(0.2, 1 + G.mods.dmg);
  if(!echo){ p.mana -= s.spellCost; p.fireCd = 0.25; }
  const a = p.aim, els = G.shotEls(g);
  G.emit("spell", { spell:s.spell, x:p.x, y:p.y, a, el:g.element });
  // the Lantern road: the old fire on the floor, and every fifth (or every) cast a beam of it
  if(!echo){
    const M = G.mods;
    p.casts = (p.casts || 0) + 1;
    if(M.special.ritewick) for(let k=1;k<=5;k++){ const x = p.x + Math.cos(a)*k*1.1, y = p.y + Math.sin(a)*k*1.1; if(G.bulletBlocked(x, y)) break; G.byproduct("fire", x, y, pw*0.6, 1); }
    if(M.special.lampstaff || (M.special.ritekeeper && p.casts % 5 === 0)) G.lanternBeam(p.x, p.y, a, pw*(M.special.lampstaff ? 2.2 : 3));
  }
  if(G.mods.special.croakhex && !echo && G.frogs) G.frogs.forEach(f=>{
    G.enemies.forEach(e=>{ const d = DG.dist(e.x, e.y, f.x, f.y); if(!e.dead && e.spawn <= 0 && !e.big && d < 4.5 && d > 0.6) G.move(e, (f.x - e.x)/d*1.3, (f.y - e.y)/d*1.3, e.phases ? "ghost" : "enemy"); });
    G.nova(f.x, f.y, 3.2, DG.Gribbus.power(G)*2*(f.twin ? 0.7 : 1), ["frost"], 1, true);
    G.emit("croak", { x:f.x, y:f.y, kind:"frost" });
  });
  G.trigger("spell", { x:p.x, y:p.y, els, depth:0 });
  switch(s.spell){
    case "missiles":
      for(let i=0;i<sp.n;i++){
        const o = a + (i - (sp.n - 1)/2)*0.32;
        G.addShot({ x:p.x, y:p.y, a:o, speed:10, r:0.18, dmg:sp.dmg*pw, range:22, els, power:s.power, knock:1.5, kind:"missile", homing:3.5, depth:0, crit:s.crit, critMul:s.critMul });
      }
      break;
    case "fireball":
      G.addShot({ x:p.x + Math.cos(a)*0.6, y:p.y + Math.sin(a)*0.6, a, speed:9, r:0.34, dmg:sp.dmg*pw, range:14, els, power:s.power, knock:3, kind:"fireball", blast:sp.radius, depth:0, homing:0 });
      break;
    case "nova":
      G.bullets.forEach(b=>{ if(b.team === "e" && DG.dist(b.x, b.y, p.x, p.y) < sp.radius) b.dead = true; });
      G.nova(p.x, p.y, sp.radius, sp.dmg*pw, els, 0);
      G.enemies.forEach(e=>{ if(!e.dead && !e.big && DG.dist(e.x, e.y, p.x, p.y) < sp.radius + e.r) e.st.frozen = Math.max(e.st.frozen || 0, 1.6); });
      break;
    case "plague": {
      let tx = I.ax === undefined ? p.x + Math.cos(a)*5 : I.ax, ty = I.ay === undefined ? p.y + Math.sin(a)*5 : I.ay;
      const d = DG.dist(p.x, p.y, tx, ty); if(d > 9){ tx = p.x + (tx - p.x)/d*9; ty = p.y + (ty - p.y)/d*9; }
      G.addHazard({ kind:"cloud", x:tx, y:ty, r:sp.radius, t:sp.dur, P:s.power, every:1/sp.stacksPerSec, plague:!!G.mods.special.plague });
      G.emit("cloud", { x:tx, y:ty, r:sp.radius });
      break;
    }
    case "chain": {
      let best = null, bs = Infinity;
      G.enemies.forEach(e=>{
        if(e.spawn > 0 || e.dead || e.untargetable) return;
        const d = DG.dist(p.x, p.y, e.x, e.y); if(d > sp.range) return;
        const off = Math.abs(DG.wrapAngle(Math.atan2(e.y - p.y, e.x - p.x) - a));
        const sc = d*0.3 + off*4;
        if(sc < bs && G.los(p.x, p.y, e.x, e.y)){ bs = sc; best = e; }
      });
      if(!best){ G.emit("fizzle", { x:p.x + Math.cos(a)*2, y:p.y + Math.sin(a)*2 }); break; }
      G.chain(best, sp.dmg*pw, sp.jumps, p.x, p.y, { els, power:s.power, depth:0, crit:s.crit });
      break;
    }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
