/* ------------------------------------------------------------------ *
 *  The game: one run, floor by floor. Pure logic, fixed-step.
 *
 *  G.update(dt, input) moves the world on; everything that happened
 *  goes into G.events for the view, the HUD and the audio to read.
 *  The game never waits on the view (Gloom Shooter's rule).
 *
 *  input = { mx, my        move vector (-1..1)
 *            ax, ay        aim point in world tiles
 *            fire, spell   held
 *            blink, use, swap, reload   pressed this step
 *            slot          0..2 to select a gun, or -1 }
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG, T = DG.TILE, L = DG.Loot;

const Game = DG.Game = function(opts){
  opts = opts || {};
  const G = this;
  G.seedWord = opts.seedWord || DG.seedWord(Math.floor((opts.seed || 1)*7.31) >>> 0);
  G.seed = DG.seedFromWord(G.seedWord);
  G.rng = DG.RNG(G.seed ^ 0x5bd1e995);
  G.t = 0; G.events = []; G.state = "play"; G.endless = false;
  G.stats = { kills:0, dmg:0, rooms:0, gold:0, time:0, floors:0, secrets:0, puzzles:0 };
  G.nextId = 1;
  const P = DG.PLAYER;
  G.player = {
    x:0, y:0, r:P.radius, vx:0, vy:0, hp:P.hp, maxHp:P.hp, mana:P.mana, maxMana:P.mana,
    guns:[L.starterGun()], cur:0, bag:[], relics:[], gold:0,
    blinkT:0, blinkCd:0, bdx:0, bdy:0, iframes:0, slip:0, sdx:0, sdy:0, stun:0, chill:0,
    fireCd:0, reloadT:0, aim:0, safeX:0, safeY:0, bonkCd:0, alive:true, moving:false
  };
  G.recalc();
  G.player.hp = G.player.maxHp; G.player.mana = G.player.maxMana;
  G.enterFloor(opts.floor || 1);
};
const proto = Game.prototype;

/* ---- events and messages ---- */
proto.emit = function(type, data){ const e = data || {}; e.type = type; this.events.push(e); return e; };
proto.say = function(text, dur){ this.emit("msg", { text, dur:dur || 2.6 }); };
proto.drain = function(){ const e = this.events; this.events = []; return e; };

/* ---- the wizard's stats, from relics ---- */
proto.recalc = function(){
  const p = this.player, s = { dmgMul:1, rateMul:1, speedMul:1, maxHp:0, maxMana:0, manaRegenMul:1, crit:0, noSlip:0, blinkCdMul:1, goldMul:1 };
  p.relics.forEach(it=>{
    const fx = DG.RELICS[it.id].fx;
    for(const k in fx){ if(/Mul$/.test(k)) s[k] *= fx[k]; else s[k] += fx[k]; }
  });
  p.stats = s;
  p.maxHp = DG.PLAYER.hp + s.maxHp; p.maxMana = DG.PLAYER.mana + s.maxMana;
  p.hp = Math.min(p.hp, p.maxHp); p.mana = Math.min(p.mana, p.maxMana);
};
proto.gun = function(){ return this.player.guns[this.player.cur]; };
proto.gunStats = function(g){ return L.stats(g || this.gun(), this.player.stats); };

/* ---- floors ---- */
proto.enterFloor = function(n){
  const G = this, p = G.player;
  G.floor = n;
  G.D = DG.Dungeon.generate((G.seed + n*104729) >>> 0, n);
  G.scale = DG.FLOOR_SCALE(n);
  G.enemies = []; G.bullets = []; G.pickups = []; G.clouds = []; G.bombs = []; G.marks = [];
  G.room = null; G.portal = null; G.bossRef = null;
  // flatten the traps, and give every room its runtime state
  G.traps = [];
  G.D.rooms.forEach(r=>{
    r.seen = r.type === "start"; r.active = false; r.wave = 0; r.waveDelay = 0;
    r.traps.forEach(t=>{ t.room = r.id; t.t = t.phase*(DG.TRAPS[t.kind].cycle || 1); t.state = "idle"; G.traps.push(t); });
    r.props.forEach(pr=>{
      pr.id = G.nextId++; pr.room = r.id;
      if(pr.kind === "chest"){ pr.open = false; }
      if(pr.kind === "pedestal") pr.item = G.shopItem(pr.slot);
    });
  });
  p.x = G.D.start.x; p.y = G.D.start.y; p.safeX = p.x; p.safeY = p.y; p.vx = p.vy = 0;
  G.flow = null;
  G.emit("floor", { floor:n, name:G.D.theme.name });
};
proto.descend = function(){
  const G = this, p = G.player;
  G.stats.floors++;
  if(G.floor >= DG.FINAL_FLOOR && !G.endless){ G.state = "won"; G.emit("won"); return; }
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp*0.3));   // a snack on the stairs
  G.enterFloor(G.floor + 1);
};
proto.keepGoing = function(){ this.endless = true; this.state = "play"; this.enterFloor(this.floor + 1); };

proto.shopItem = function(slot){
  const G = this, rng = G.rng, f = G.floor;
  let item;
  if(slot === 0) item = L.rollGun(rng, f + 1, { minRarity:1, boost:0.3 });
  else if(slot === 1) item = L.makeRune(L.rollRune(rng, G.gun().element));
  else if(slot === 2) item = L.rollRelic(rng, G.player.relics.map(r=> r.id)) || L.makeRune(L.rollRune(rng));
  else item = { kind:"heal", uid:L.uid(), name:"Suspicious Soup", amount:40 };
  return { item, price:L.price(item, f), sold:false };
};

/* ---- the map ---- */
proto.tile = function(x, y){ return this.D.at(Math.floor(x), Math.floor(y)); };
proto.doorAt = function(tx, ty){ return this.D.doors.find(d=> d.tiles.some(([x, y])=> x === tx && y === ty)); };
/* what stops a walker. pits stop goblins unless they've been knocked flying */
proto.blocked = function(tx, ty, who){
  const t = this.D.at(tx, ty);
  if(t === T.SOLID || t === T.BLOCK) return true;
  if(t === T.DOOR){ const d = this.doorAt(tx, ty); return d && !d.open; }
  if(t === T.FAKE) return who !== "player";
  if(t === T.PIT) return who === "enemy";
  return false;
};
proto.bulletBlocked = function(x, y){
  const tx = Math.floor(x), ty = Math.floor(y), t = this.D.at(tx, ty);
  if(t === T.SOLID || t === T.BLOCK) return true;
  if(t === T.DOOR){ const d = this.doorAt(tx, ty); return d && !d.open; }
  return false;
};

/* move a body as a box of half-size r through the tiles, a little at a time.
   returns true if it ran into something */
proto.move = function(e, dx, dy, who){
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))/0.2));
  let hit = false;
  for(let i=0;i<steps;i++){
    hit = this.moveAxis(e, dx/steps, 0, who) || hit;
    hit = this.moveAxis(e, 0, dy/steps, who) || hit;
  }
  return hit;
};
proto.moveAxis = function(e, dx, dy, who){
  const r = e.r, eps = 0.001;
  const nx = e.x + dx, ny = e.y + dy;
  const x0 = Math.floor(nx - r), x1 = Math.floor(nx + r - eps), y0 = Math.floor(ny - r), y1 = Math.floor(ny + r - eps);
  for(let ty=y0; ty<=y1; ty++) for(let tx=x0; tx<=x1; tx++){
    if(!this.blocked(tx, ty, who)) continue;
    if(dx > 0) e.x = tx - r - eps; else if(dx < 0) e.x = tx + 1 + r + eps;
    if(dy > 0) e.y = ty - r - eps; else if(dy < 0) e.y = ty + 1 + r + eps;
    return true;
  }
  e.x = nx; e.y = ny;
  return false;
};

/* the open floor tile nearest (x, y) inside room r, as a tile centre */
proto.freeSpot = function(r, x, y){
  let best = null, bd = Infinity;
  for(let ty=r.y1; ty<=r.y2; ty++) for(let tx=r.x1; tx<=r.x2; tx++){
    if(this.D.at(tx, ty) !== T.FLOOR) continue;
    const d = DG.dist2(tx + 0.5, ty + 0.5, x, y);
    if(d < bd){ bd = d; best = { x:tx + 0.5, y:ty + 0.5 }; }
  }
  return best || { x, y };
};

/* line of sight across tiles (for goblins deciding whether to shoot) */
proto.los = function(ax, ay, bx, by){
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d/0.25);
  for(let i=1;i<n;i++){ const t = i/n; if(this.bulletBlocked(ax + (bx - ax)*t, ay + (by - ay)*t)) return false; }
  return true;
};

/* ================================================================== */
proto.update = function(dt, input){
  const G = this;
  if(G.state !== "play") return;
  G.t += dt; G.stats.time += dt;
  G.updatePlayer(dt, input || {});
  G.updateRooms(dt);
  G.updateFlow();
  for(let i=0;i<G.enemies.length;i++) DG.AI.update(G, G.enemies[i], dt);
  G.separate();
  G.updateStatus(dt);
  G.updateBullets(dt);
  G.updateBombs(dt);
  G.updateClouds(dt);
  G.updateTraps(dt);
  G.updatePickups(dt);
  G.marks = G.marks.filter(m=> (m.t -= dt) > 0);
  G.enemies = G.enemies.filter(e=> !e.dead);
};

/* ---- the wizard ---- */
proto.updatePlayer = function(dt, I){
  const G = this, p = G.player, S = p.stats;
  p.iframes = Math.max(0, p.iframes - dt); p.blinkCd = Math.max(0, p.blinkCd - dt); p.stun = Math.max(0, p.stun - dt);
  p.chill = Math.max(0, p.chill - dt); p.bonkCd = Math.max(0, p.bonkCd - dt);
  p.mana = Math.min(p.maxMana, p.mana + DG.PLAYER.manaRegen*S.manaRegenMul*dt);
  if(I.ax !== undefined) p.aim = Math.atan2(I.ay - p.y, I.ax - p.x);

  let mx = I.mx || 0, my = I.my || 0;
  const ml = Math.hypot(mx, my); if(ml > 1){ mx /= ml; my /= ml; }
  p.moving = ml > 0.1;

  if(p.blinkT > 0){
    // mid-blink: a fast, untouchable dash that skims over pits
    const B = DG.PLAYER.blink, sp = B.dist/B.time;
    p.blinkT -= dt;
    G.move(p, p.bdx*sp*dt, p.bdy*sp*dt, "player");
    if(p.blinkT <= 0) G.emit("blinkEnd", { x:p.x, y:p.y });
  } else if(p.slip > 0){
    // on a banana: no steering, wheee
    p.slip -= dt;
    if(G.move(p, p.sdx*8*dt, p.sdy*8*dt, "player")) p.slip = 0;
  } else if(p.stun <= 0){
    const sp = DG.PLAYER.speed*S.speedMul*(p.chill > 0 ? 0.7 : 1);
    const k = 1 - Math.exp(-dt*18);
    p.vx += (mx*sp - p.vx)*k; p.vy += (my*sp - p.vy)*k;
    G.move(p, p.vx*dt, p.vy*dt, "player");
    if(I.blink && p.blinkCd <= 0){
      let bx = mx, by = my;
      if(Math.hypot(bx, by) < 0.1){ bx = Math.cos(p.aim); by = Math.sin(p.aim); }
      const bl = Math.hypot(bx, by); p.bdx = bx/bl; p.bdy = by/bl;
      p.blinkT = DG.PLAYER.blink.time; p.blinkCd = DG.PLAYER.blink.cd*S.blinkCdMul; p.iframes = Math.max(p.iframes, DG.PLAYER.blink.iframes);
      G.emit("blink", { x:p.x, y:p.y, dx:p.bdx, dy:p.bdy });
    }
    // painted doors: walk into one and... bonk
    if(my < -0.3 && p.bonkCd <= 0) G.checkBonk(p);
  } else { p.vx *= 0.8; p.vy *= 0.8; }

  // illusions you walk through
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  if(G.D.at(tx, ty) === T.FAKE) G.revealFake(tx, ty, true);

  // pits: fall in unless blinking
  if(p.blinkT <= 0 && G.D.at(tx, ty) === T.PIT){
    G.emit("fall", { x:p.x, y:p.y, who:"player" });
    p.x = p.safeX; p.y = p.safeY; p.vx = p.vy = 0; p.slip = 0;
    G.hurtPlayer(10, "pit", true);
  } else if(p.blinkT <= 0 && p.slip <= 0 && G.D.at(tx, ty) === T.FLOOR &&
            DG.DIRS8.every(([dx, dy])=> G.D.at(tx + dx, ty + dy) !== T.PIT)){
    p.safeX = p.x; p.safeY = p.y;
  }

  // guns
  if(I.slot >= 0 && I.slot < p.guns.length && I.slot !== p.cur) G.selectGun(I.slot);
  if(I.swap && p.guns.length > 1) G.selectGun((p.cur + 1) % p.guns.length);
  const g = G.gun(), s = G.gunStats(g);
  p.fireCd = Math.max(0, p.fireCd - dt);
  if(p.reloadT > 0){
    p.reloadT -= dt;
    if(p.reloadT <= 0){ g.ammo = s.mag; G.emit("reloaded"); }
  } else if(I.reload && g.ammo < s.mag){ G.startReload(); }
  if(I.fire && p.fireCd <= 0 && p.reloadT <= 0 && p.blinkT <= 0 && p.stun <= 0){
    if(g.ammo > 0) G.fireGun(g, s);
    else G.startReload();
  }
  if(I.spell && p.fireCd <= 0 && p.blinkT <= 0 && p.stun <= 0 && !p.spellHeld){
    if(p.mana >= s.spellCost) G.castSpell(g, s, I);
    else { G.emit("nomana"); p.spellHeld = true; }
  }
  if(!I.spell) p.spellHeld = false;
  if(I.use) G.interact();
};
proto.selectGun = function(i){
  const p = this.player; p.cur = i; p.reloadT = 0; p.fireCd = Math.max(p.fireCd, 0.15);
  this.emit("swap", { gun:this.gun() });
};
proto.startReload = function(){
  const p = this.player, s = this.gunStats();
  if(p.reloadT > 0) return;
  p.reloadT = s.reload; this.emit("reload", { t:s.reload });
};

proto.checkBonk = function(p){
  const G = this;
  for(const d of G.D.painted){
    // right up against the door's face, from the room side
    if(Math.abs(p.x - (d.x + 0.5)) > 0.55) continue;
    if(Math.abs(p.y - p.r - (d.y + 1)) > 0.08) continue;
    if(d.kind === "real") continue;           // the honest one is an illusion: walk on through
    p.bonkCd = 1; p.stun = 0.35; p.vx = 0; p.vy = 4; p.y += 0.15;
    G.emit("bonk", { x:d.x + 0.5, y:d.y + 1 });
    const room = G.D.rooms[d.room];
    if(d.kind === "trick" && room.puzzle && !room.puzzle.solved && room.puzzle.failed.indexOf(d.puzzle) < 0){
      room.puzzle.failed.push(d.puzzle);
      G.say(G.rng.pick(DG.LINES.wrong));
      G.ambush(room);
    } else G.say(G.rng.pick(DG.LINES.bonk));
    return;
  }
};
proto.revealFake = function(tx, ty, walked){
  const G = this;
  const f = G.D.fakes.find(o=> o.tiles.some(([x, y])=> x === tx && y === ty));
  if(!f || f.revealed) return;
  f.revealed = true;
  G.emit("illusion", { x:f.x, y:f.y });
  if(f.puzzle){
    const room = G.D.rooms[f.room];
    if(room.puzzle && !room.puzzle.solved){ room.puzzle.solved = true; G.stats.puzzles++; G.emit("solved", { room:room.id }); G.say("The honest door! " + G.rng.pick(DG.LINES.solved)); }
  } else { G.stats.secrets++; G.say(G.rng.pick(DG.LINES.secret)); }
};

/* ---- shooting ---- */
proto.fireGun = function(g, s){
  const G = this, p = G.player;
  g.ammo--; p.fireCd = 1/s.rate;
  const n = s.pellets, base = p.aim;
  for(let i=0;i<n;i++){
    const off = n > 1 ? (i/(n - 1) - 0.5)*s.spread*Math.PI/180 : 0;
    const a = base + off + (G.rng.next() - 0.5)*s.spread*Math.PI/180*(n > 1 ? 0.25 : 1);
    const sp = s.speed*(n > 1 ? 0.85 + G.rng.next()*0.3 : 1);
    G.addBullet({ team:"p", x:p.x + Math.cos(a)*0.5, y:p.y + Math.sin(a)*0.5, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp,
      r:s.size, dmg:s.dmg, life:s.range/s.speed, pierce:s.pierce, bounces:s.bounces, el:g.element, power:s.power,
      fx:s.fx, crit:s.crit, knock:s.knock, blast:s.blast, kind:g.base === "launcher" ? "grenade" : "bolt" });
  }
  if(g.ammo <= 0) G.startReload();
  G.emit("shoot", { x:p.x, y:p.y, a:base, el:g.element, base:g.base });
};

proto.addBullet = function(b){
  b.id = this.nextId++; b.hits = []; b.t = 0;
  b.homing = b.homing || (b.fx && b.fx.homing ? 1 : 0);
  this.bullets.push(b);
  return b;
};

proto.castSpell = function(g, s, I){
  const G = this, p = G.player, sp = DG.SPELLS[s.spell], pw = s.power*p.stats.dmgMul;
  p.mana -= s.spellCost; p.fireCd = 0.25;
  const a = p.aim;
  G.emit("spell", { spell:s.spell, x:p.x, y:p.y, a, el:g.element });
  switch(s.spell){
    case "missiles":
      for(let i=0;i<sp.n;i++){
        const o = a + (i - (sp.n - 1)/2)*0.32;
        G.addBullet({ team:"p", x:p.x, y:p.y, vx:Math.cos(o)*10, vy:Math.sin(o)*10, r:0.18, dmg:sp.dmg*pw, life:2.2, pierce:0, bounces:0,
          el:"arcane", power:s.power, fx:{}, crit:s.crit, knock:1.5, kind:"missile", homing:3.5 });
      }
      break;
    case "fireball":
      G.addBullet({ team:"p", x:p.x + Math.cos(a)*0.6, y:p.y + Math.sin(a)*0.6, vx:Math.cos(a)*9, vy:Math.sin(a)*9, r:0.34, dmg:sp.dmg*pw, life:1.6,
        pierce:0, bounces:0, el:"fire", power:s.power, fx:s.fx, crit:s.crit, knock:3, kind:"fireball", blast:sp.radius });
      break;
    case "nova":
      G.emit("nova", { x:p.x, y:p.y, r:sp.radius });
      G.bullets.forEach(b=>{ if(b.team === "e" && DG.dist(b.x, b.y, p.x, p.y) < sp.radius){ b.dead = true; } });
      G.enemies.forEach(e=>{
        if(e.spawn > 0 || DG.dist(e.x, e.y, p.x, p.y) > sp.radius + e.r) return;
        G.damageEnemy(e, sp.dmg*pw, { el:"frost", power:s.power, fx:s.fx, ax:e.x - p.x, ay:e.y - p.y, knock:2 });
        if(!e.dead) e.st.frozen = Math.max(e.st.frozen || 0, 1.6);
      });
      break;
    case "plague": {
      let tx = I.ax === undefined ? p.x + Math.cos(a)*5 : I.ax, ty = I.ay === undefined ? p.y + Math.sin(a)*5 : I.ay;
      const d = DG.dist(p.x, p.y, tx, ty); if(d > 9){ tx = p.x + (tx - p.x)/d*9; ty = p.y + (ty - p.y)/d*9; }
      G.clouds.push({ x:tx, y:ty, r:sp.radius, t:sp.dur, max:sp.dur, tick:0, rate:sp.stacksPerSec, power:s.power, plague:!!s.fx.plagueSpread, team:"p" });
      G.emit("cloud", { x:tx, y:ty, r:sp.radius });
      break;
    }
    case "chain": {
      // the first target: the goblin closest to where you're aiming
      let best = null, bs = Infinity;
      G.enemies.forEach(e=>{
        if(e.spawn > 0 || e.dead) return;
        const d = DG.dist(p.x, p.y, e.x, e.y); if(d > sp.range) return;
        const off = Math.abs(DG.wrapAngle(Math.atan2(e.y - p.y, e.x - p.x) - a));
        const sc = d*0.3 + off*4;
        if(sc < bs && G.los(p.x, p.y, e.x, e.y)){ bs = sc; best = e; }
      });
      if(!best){ G.emit("fizzle", { x:p.x + Math.cos(a)*2, y:p.y + Math.sin(a)*2 }); break; }
      G.chain(best, sp.dmg*pw, sp.jumps, p.x, p.y, { el:"shock", power:s.power, fx:s.fx, crit:s.crit });
      break;
    }
  }
};

/* lightning: hit e, then leap to the nearest goblin not yet struck */
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
    let nx = null, nd = DG.STATUS.shock.range*1.6;
    G.enemies.forEach(o=>{ if(o.dead || o.spawn > 0 || struck.indexOf(o.id) >= 0) return; const d = DG.dist(px, py, o.x, o.y); if(d < nd){ nd = d; nx = o; } });
    cur = nx;
  }
};

/* ---- damage ---- */
proto.damageEnemy = function(e, amt, src){
  const G = this;
  if(e.dead || e.spawn > 0 || e.airborne) return 0;
  src = src || {};
  const fx = src.fx || {};
  let m = 1;
  if(e.affix && DG.AFFIXES[e.affix].dmgTaken) m *= DG.AFFIXES[e.affix].dmgTaken;
  if(fx.brittle && (e.st.chill > 0 || e.st.frozen > 0)) m *= 1 + fx.brittle;
  if(src.el === "arcane" && !src.dot) m *= DG.STATUS.arcane.mul;
  let crit = false;
  if(!src.dot && src.crit && G.rng.chance(src.crit)){ m *= 2; crit = true; }
  const d = amt*m;
  e.hp -= d; e.flash = 0.1;
  G.stats.dmg += d;
  if(!src.dot) G.emit("hit", { x:e.x, y:e.y, amt:d, crit, el:src.el, id:e.id });
  // the element's status
  if(!src.dot && src.el){
    const pw = src.power || 1, S = DG.STATUS;
    const poisonStacks = (src.el === "poison" ? 1 : 0) + (fx.addPoison || 0);
    if(poisonStacks) G.poison(e, poisonStacks, pw, !!fx.plagueSpread);
    if(src.el === "fire") e.st.burn = { t:S.burn.dur, dps:Math.max(e.st.burn ? e.st.burn.dps : 0, S.burn.dps*pw), wildfire:!!fx.wildfire || (e.st.burn && e.st.burn.wildfire) };
    if(src.el === "frost"){
      e.st.chill = S.chill.dur; e.st.chillStacks = (e.st.chillStacks || 0) + 1;
      if(e.st.chillStacks >= S.chill.freezeAt){ e.st.frozen = S.chill.freeze; e.st.chillStacks = 0; G.emit("freeze", { x:e.x, y:e.y }); }
    }
    const arcP = (src.el === "shock" ? S.shock.chance : 0) + (fx.arcChance || 0);
    if(!src.noArc && arcP && G.rng.chance(arcP)){
      let nx = null, nd = S.shock.range;
      G.enemies.forEach(o=>{ if(o === e || o.dead || o.spawn > 0) return; const dd = DG.dist(e.x, e.y, o.x, o.y); if(dd < nd){ nd = dd; nx = o; } });
      if(nx) G.chain(nx, amt*S.shock.arcFrac, fx.arcJumps || 0, e.x, e.y, { el:"shock", power:pw, fx:{}, crit:0 }, [e.id]);
    }
    if(fx.blastChance && !src.noBlast && G.rng.chance(fx.blastChance)) G.explode(e.x, e.y, 1.3, amt*0.6, "p", { el:src.el, power:pw, fx:{}, noBlast:true });
  }
  // knockback (frozen and big things barely budge)
  if(src.knock && (src.ax || src.ay)){
    const l = Math.hypot(src.ax, src.ay) || 1, heavy = e.boss ? 0.1 : e.r > 0.5 ? 0.35 : 1;
    const k = src.knock*(src.el === "arcane" ? DG.STATUS.arcane.knock/1.5 : 1)*heavy*(e.st.frozen > 0 ? 0.3 : 1);
    e.kx += src.ax/l*k*2.2; e.ky += src.ay/l*k*2.2;
  }
  if(e.hp <= 0) G.killEnemy(e, src);
  return d;
};
proto.poison = function(e, stacks, power, plague){
  const P = DG.STATUS.poison, st = e.st;
  if(!st.poison) st.poison = { stacks:0, t:0, dps:0, plague:false };
  st.poison.stacks = Math.min(P.max, st.poison.stacks + stacks);
  st.poison.t = P.dur;
  st.poison.dps = Math.max(st.poison.dps, P.dps*power);
  st.poison.plague = st.poison.plague || plague;
};

proto.killEnemy = function(e, src, fell){
  const G = this, p = G.player;
  if(e.dead) return;
  e.dead = true; e.hp = 0;
  G.stats.kills++;
  G.emit("kill", { x:e.x, y:e.y, id:e.id, type:e.type, boss:!!e.boss, fell:!!fell });
  p.mana = Math.min(p.maxMana, p.mana + DG.PLAYER.manaOnKill);
  const gfx = src && src.fx; if(gfx && gfx.killHeal) G.heal(gfx.killHeal);
  // gold
  const [g0, g1] = e.def.gold || [1, 2];
  const gold = Math.round(G.rng.int(g0, g1)*(1 + 0.25*(G.floor - 1))*p.stats.goldMul*(e.affix ? 2 : 1));
  if(!fell) G.dropGold(e.x, e.y, gold);
  // things that happen when a goblin pops
  if(e.st.poison && e.st.poison.plague && e.st.poison.stacks > 0){
    G.clouds.push({ x:e.x, y:e.y, r:1.8, t:2.5, max:2.5, tick:0, rate:2, power:e.st.poison.dps/DG.STATUS.poison.dps, plague:true, team:"p" });
    G.emit("cloud", { x:e.x, y:e.y, r:1.8 });
  }
  if(e.st.burn && e.st.burn.t > 0 && e.st.burn.wildfire) G.explode(e.x, e.y, 1.9, e.st.burn.dps*2, "p", { el:"fire", power:e.st.burn.dps/DG.STATUS.burn.dps, fx:{ wildfire:1 }, noBlast:true });
  if(e.affix === "vengeful") G.ring(e.x, e.y, DG.AFFIXES.vengeful.deathRing, 5.5, e.dmg*0.7, G.rng.next());
  if(e.boss) G.bossDown(e);
};

proto.heal = function(n){ const p = this.player; const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + n); if(p.hp > before) this.emit("heal", { x:p.x, y:p.y, amt:p.hp - before }); };

proto.hurtPlayer = function(amt, why, force){
  const G = this, p = G.player;
  if(G.state !== "play") return;
  if(!force && (p.iframes > 0 || p.blinkT > 0)) return;
  p.hp -= amt; p.iframes = DG.PLAYER.hurtIframes; G.lastHurt = why;
  G.emit("hurt", { amt, why, x:p.x, y:p.y });
  if(p.hp <= 0){ p.hp = 0; p.alive = false; G.state = "dead"; G.emit("death", { why }); }
};

/* an explosion: team "p" hurts goblins; team "e" hurts the wizard AND goblins (goblin bombs are not smart bombs) */
proto.explode = function(x, y, r, dmg, team, src){
  const G = this;
  G.emit("boom", { x, y, r, el:src && src.el });
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || (src && src.skip === e.id)) return;
    const d = DG.dist(x, y, e.x, e.y); if(d > r + e.r) return;
    G.damageEnemy(e, dmg*(team === "e" ? 0.8 : 1)*(1 - 0.4*d/(r + e.r)), Object.assign({ knock:3, ax:e.x - x, ay:e.y - y }, src || {}));
  });
  if(team === "e"){ const p = G.player; if(DG.dist(x, y, p.x, p.y) < r + p.r) G.hurtPlayer(dmg, "boom"); }
  // illusions shimmer when a blast touches them
  G.D.fakes.forEach(f=>{ if(!f.revealed && DG.dist(x, y, f.x, f.y) < r + 0.5) G.revealFake(f.tiles[0][0], f.tiles[0][1]); });
};

/* a ring of enemy shots */
proto.ring = function(x, y, n, speed, dmg, off, kind){
  for(let i=0;i<n;i++){
    const a = (i/n + (off || 0))*Math.PI*2;
    this.addBullet({ team:"e", x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, r:0.2, dmg, life:4, kind:kind || "orb" });
  }
};

/* ---- statuses: poison, burn, chill, the plague jumping between goblins ---- */
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
      G.damageEnemy(e, st.poison.dps*st.poison.stacks*dt, { dot:true, el:"poison" });
      if(st.poison.t <= 0){ st.poison.stacks = 0; st.poison.plague = false; }
      else if(spread && st.poison.plague){
        G.enemies.forEach(o=>{
          if(o === e || o.dead || o.spawn > 0) return;
          if(DG.dist(e.x, e.y, o.x, o.y) > 2.5) return;
          G.poison(o, 1, st.poison.dps/DG.STATUS.poison.dps, true);
          G.emit("infect", { x1:e.x, y1:e.y, x2:o.x, y2:o.y });
        });
      }
    }
    if(e.dead) return;
    if(st.burn && st.burn.t > 0){ st.burn.t -= dt; G.damageEnemy(e, st.burn.dps*dt, { dot:true, el:"fire" }); }
    if(e.dead) return;
    if(st.chill > 0){ st.chill -= dt; if(st.chill <= 0) st.chillStacks = 0; }
    if(st.frozen > 0) st.frozen -= dt;
    if(st.stun > 0) st.stun -= dt;
  });
};

/* goblins don't stack on each other, or on you */
proto.separate = function(){
  const E = this.enemies, p = this.player;
  for(let i=0;i<E.length;i++){
    const a = E[i]; if(a.dead || a.airborne) continue;
    for(let j=i + 1;j<E.length;j++){
      const b = E[j]; if(b.dead || b.airborne) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if(d > 0.0001 && d < m){
        const push = (m - d)*0.5, ux = dx/d, uy = dy/d, wa = a.boss ? 0.1 : 1, wb = b.boss ? 0.1 : 1;
        this.move(a, -ux*push*wa, -uy*push*wa, "enemy"); this.move(b, ux*push*wb, uy*push*wb, "enemy");
      }
    }
    const dx = a.x - p.x, dy = a.y - p.y, d = Math.hypot(dx, dy), m = a.r + p.r;
    if(d > 0.0001 && d < m && p.blinkT <= 0) this.move(a, dx/d*(m - d), dy/d*(m - d), "enemy");
  }
};

/* ---- shots in flight ---- */
proto.updateBullets = function(dt){
  const G = this, p = G.player;
  const pz = G.room && G.room.puzzle && G.room.puzzle.kind === "braziers" && !G.room.puzzle.solved ? G.room.puzzle : null;
  if(pz) pz.items.forEach(it=> it.cd = Math.max(0, it.cd - dt));
  for(const b of G.bullets){
    if(b.dead) continue;
    b.t += dt; b.life -= dt;
    if(b.life <= 0){ G.bulletEnd(b, true); continue; }
    // homing: turn toward the nearest goblin in front
    if(b.homing && b.team === "p"){
      let best = null, bd = 7;
      G.enemies.forEach(e=>{ if(e.dead || e.spawn > 0) return; const d = DG.dist(b.x, b.y, e.x, e.y); if(d < bd){ bd = d; best = e; } });
      if(best){
        const sp = Math.hypot(b.vx, b.vy), cur = Math.atan2(b.vy, b.vx), want = Math.atan2(best.y - b.y, best.x - b.x);
        const turn = DG.clamp(DG.wrapAngle(want - cur), -b.homing*dt*1.6, b.homing*dt*1.6), na = cur + turn;
        b.vx = Math.cos(na)*sp; b.vy = Math.sin(na)*sp;
      }
    }
    const sp = Math.hypot(b.vx, b.vy), steps = Math.max(1, Math.ceil(sp*dt/0.2));
    for(let s=0; s<steps && !b.dead; s++){
      const ox = b.x, oy = b.y;
      b.x += b.vx*dt/steps; b.y += b.vy*dt/steps;
      if(G.bulletBlocked(b.x, b.y)){
        if(b.bounces > 0){
          b.bounces--;
          const hx = G.bulletBlocked(b.x, oy), hy = G.bulletBlocked(ox, b.y);
          if(hx || !hy) b.vx = -b.vx;
          if(hy || !hx) b.vy = -b.vy;
          b.x = ox; b.y = oy;
          G.emit("bounce", { x:b.x, y:b.y });
        } else { b.x = ox; b.y = oy; G.bulletEnd(b, false); break; }
      }
      // shots that sink into a wall that isn't there
      if(b.team === "p" && G.D.at(Math.floor(b.x), Math.floor(b.y)) === T.FAKE) G.revealFake(Math.floor(b.x), Math.floor(b.y));
      if(b.team === "p"){
        if(pz) for(let i=0;i<pz.items.length;i++){
          const it = pz.items[i];
          if(it.cd <= 0 && DG.dist(b.x, b.y, it.x, it.y) < 0.45 + b.r){ it.cd = 0.4; G.flipBrazier(G.room, i); G.bulletEnd(b, false); break; }
        }
        if(b.dead) break;
        for(const e of G.enemies){
          if(e.dead || e.spawn > 0 || e.airborne || b.hits.indexOf(e.id) >= 0) continue;
          if(DG.dist2(b.x, b.y, e.x, e.y) > (b.r + e.r)*(b.r + e.r)) continue;
          b.hits.push(e.id);
          if(b.blast){ G.bulletEnd(b, false, e); break; }
          G.damageEnemy(e, b.dmg, { el:b.el, power:b.power, fx:b.fx, crit:b.crit, knock:b.knock, ax:b.vx, ay:b.vy });
          if(b.fx && b.fx.split && !b.split){
            b.split = true;
            const a = Math.atan2(b.vy, b.vx), v = Math.hypot(b.vx, b.vy);
            [-0.6, 0.6].forEach(o=> G.addBullet(Object.assign({}, b, { id:0, hits:[e.id], dmg:b.dmg*0.5, vx:Math.cos(a + o)*v, vy:Math.sin(a + o)*v, split:true, life:Math.max(0.3, b.life), r:b.r*0.8, dead:false })));
          }
          if(b.pierce > 0) b.pierce--; else { G.bulletEnd(b, false); break; }
        }
      } else if(b.hurtsGoblins && G.enemies.some(e=>{
        if(e.dead || e.spawn > 0 || e.airborne || DG.dist2(b.x, b.y, e.x, e.y) > (b.r + e.r)*(b.r + e.r)) return false;
        G.damageEnemy(e, b.dmg, {}); return true; })){
        b.dead = true; G.emit("pop", { x:b.x, y:b.y, team:b.team });
      } else if(p.blinkT <= 0 && DG.dist2(b.x, b.y, p.x, p.y) < (b.r + p.r*0.8)*(b.r + p.r*0.8)){
        if(p.iframes <= 0){
          G.hurtPlayer(b.dmg, b.kind);
          if(b.slow) p.chill = Math.max(p.chill, b.slow);
          b.dead = true; G.emit("pop", { x:b.x, y:b.y, team:b.team });
        }
      }
    }
  }
  G.bullets = G.bullets.filter(b=> !b.dead);
};
proto.bulletEnd = function(b, expired, target){
  if(b.dead) return;
  b.dead = true;
  if(b.blast) this.explode(b.x, b.y, b.blast, b.dmg, b.team, { el:b.el, power:b.power, fx:b.fx || {}, crit:b.crit });
  else this.emit("pop", { x:b.x, y:b.y, team:b.team, el:b.el, wall:!expired });
};

/* ---- goblin bombs ---- */
proto.updateBombs = function(dt){
  const G = this;
  G.bombs.forEach(b=>{
    b.t += dt;
    if(b.t >= b.flight + b.fuse){ b.dead = true; G.explode(b.tx, b.ty, b.r, b.dmg, "e", { el:null }); }
  });
  G.bombs = G.bombs.filter(b=> !b.dead);
};

/* ---- poison clouds ---- */
proto.updateClouds = function(dt){
  const G = this;
  G.clouds.forEach(c=>{
    c.t -= dt; c.tick -= dt;
    if(c.tick <= 0){
      c.tick = 1/c.rate;
      G.enemies.forEach(e=>{ if(!e.dead && e.spawn <= 0 && DG.dist(c.x, c.y, e.x, e.y) < c.r + e.r*0.5) G.poison(e, 1, c.power, c.plague); });
    }
  });
  G.clouds = G.clouds.filter(c=> c.t > 0);
};

/* ---- traps ---- */
proto.updateTraps = function(dt){
  const G = this, p = G.player;
  const near = t=> Math.abs(t.x - p.x) < 24 && Math.abs(t.y - p.y) < 18;
  G.traps.forEach(t=>{
    const D = DG.TRAPS[t.kind];
    if(t.kind === "banana"){
      if(t.gone) return;
      const onP = Math.abs(p.x - t.x - 0.5) < 0.45 && Math.abs(p.y - t.y - 0.5) < 0.45;
      if(onP && p.blinkT <= 0 && p.slip <= 0 && p.moving){
        if(p.stats.noSlip){ return; }
        const l = Math.hypot(p.vx, p.vy) || 1;
        p.slip = D.slip; p.sdx = p.vx/l; p.sdy = p.vy/l; t.gone = true;
        G.emit("slip", { x:p.x, y:p.y }); G.say("WHEEEE");
      }
      G.enemies.forEach(e=>{
        if(t.gone || e.dead || e.spawn > 0 || e.boss) return;
        if(Math.abs(e.x - t.x - 0.5) < 0.45 && Math.abs(e.y - t.y - 0.5) < 0.45 && Math.hypot(e.vx, e.vy) > 0.5){
          t.gone = true; e.st.stun = 1.4; G.emit("slip", { x:e.x, y:e.y, enemy:true });
          G.damageEnemy(e, 5, {});
        }
      });
      return;
    }
    if(!near(t)) return;
    t.t += dt;
    const ph = t.t % D.cycle;
    if(t.kind === "spikes"){
      const prev = t.state;
      t.state = ph < D.cycle - D.warn - D.up ? "idle" : ph < D.cycle - D.up ? "warn" : "up";
      if(t.state === "up" && prev !== "up") G.emit("trap", { kind:"spikes", x:t.x + 0.5, y:t.y + 0.5 });
      if(t.state === "up"){
        if(Math.abs(p.x - t.x - 0.5) < 0.5 + p.r*0.6 && Math.abs(p.y - t.y - 0.5) < 0.5 + p.r*0.6) G.hurtPlayer(D.dmg*G.scale.dmg*0.8, "spikes");
        G.enemies.forEach(e=>{
          if(e.dead || e.spawn > 0 || e.airborne || (t.hitT && t.hitT[e.id] > G.t)) return;
          if(Math.abs(e.x - t.x - 0.5) < 0.5 && Math.abs(e.y - t.y - 0.5) < 0.5){ t.hitT = t.hitT || {}; t.hitT[e.id] = G.t + 0.6; G.damageEnemy(e, D.dmg*2, {}); }
        });
      }
    } else if(t.kind === "vent"){
      t.state = ph < D.cycle - D.warn - D.up ? "idle" : ph < D.cycle - D.up ? "warn" : "up";
      if(t.state === "up"){
        if(DG.dist(p.x, p.y, t.x + 0.5, t.y + 0.5) < 0.75) G.hurtPlayer(D.dmg*G.scale.dmg, "vent");
        G.enemies.forEach(e=>{ if(!e.dead && e.spawn <= 0 && DG.dist(e.x, e.y, t.x + 0.5, t.y + 0.5) < 0.8) e.st.burn = { t:2, dps:4, wildfire:false }; });
      }
    } else if(t.kind === "darts"){
      const room = G.D.rooms[t.room];
      if(!room.active && G.room !== room) return;
      if((t.last || 0) > ph){
        G.addBullet({ team:"e", x:t.x + 0.5 + t.dir*0.6, y:t.y + 0.5, vx:t.dir*D.speed, vy:0, r:0.12, dmg:D.dmg*G.scale.dmg, life:4, kind:"dart", hurtsGoblins:true });
        G.emit("trap", { kind:"darts", x:t.x + 0.5, y:t.y + 0.5 });
      }
      t.last = ph;
    }
  });
};

/* ---- rooms: lock, waves, clear ---- */
proto.updateRooms = function(dt){
  const G = this, p = G.player, D = G.D;
  // which room the wizard is properly inside
  let inside = null;
  for(const r of D.rooms){
    if(p.x > r.x1 + 0.9 && p.x < r.x2 + 0.1 && p.y > r.y1 + 0.9 && p.y < r.y2 + 0.1){ inside = r; break; }
  }
  // rooms you can see into get marked on the map
  D.rooms.forEach(r=>{ if(!r.seen && p.x > r.x1 - 2 && p.x < r.x2 + 3 && p.y > r.y1 - 2 && p.y < r.y2 + 3 && (r.type !== "secret" || inside === r)){ r.seen = true; G.emit("seen", { room:r.id }); } });
  if(inside !== G.room){
    G.room = inside;
    if(inside){
      G.emit("enter", { room:inside.id, type:inside.type });
      if(!inside.cleared && !inside.active && (inside.type === "combat" || inside.type === "boss")) G.activate(inside);
      if(inside.type === "shop" && !inside.greeted){ inside.greeted = true; G.say(G.rng.pick(DG.LINES.shop), 3.5); }
      if(inside.type === "secret" && !inside.found){ inside.found = true; G.emit("secretRoom", { room:inside.id }); }
    }
  }
  // the active room: next wave or clear
  D.rooms.forEach(r=>{
    if(!r.active) return;
    const alive = G.enemies.some(e=> e.room === r.id && !e.dead);
    if(alive) return;
    if(r.wave < r.waves.length){
      r.waveDelay -= dt;
      if(r.waveDelay <= 0){ G.spawnWave(r, r.waves[r.wave]); r.wave++; }
      return;
    }
    G.clearRoom(r);
  });
};
proto.activate = function(r){
  const G = this;
  r.active = true; r.wave = 0; r.waveDelay = 0;
  G.setDoors(r, false);
  G.emit("lock", { room:r.id });
  if(r.type === "boss"){
    const b = DG.BOSSES[0];
    const e = G.spawnEnemy(r, { type:b.id, x:r.boss.x, y:r.boss.y, boss:true }, b);
    G.bossRef = e;
    G.say(b.name.toUpperCase() + ": \"" + G.rng.pick(b.lines) + "\"", 3.5);
    G.emit("boss", { id:e.id, name:G.bossName() });
    r.waves = r.waves || [];
    r.wave = r.waves.length;
    return;
  }
  G.spawnWave(r, r.waves[0]); r.wave = 1;
};
proto.bossName = function(){
  const t = ["Grubnok the Goblin King", "Grubnok II: The Grubbening", "Grubnok, Now With Extra Crown", "Grubnok Who Has Been Working Out", "GRUBNOK ETERNAL (he's really mad)"];
  return t[Math.min(t.length - 1, this.floor - 1)] + (this.floor > t.length ? " +" + (this.floor - t.length) : "");
};
proto.setDoors = function(r, open){
  const G = this, p = G.player;
  r.doors.forEach(id=>{
    const d = G.D.doors[id]; d.open = open;
    // never shut a door on someone
    if(!open) d.tiles.forEach(([x, y])=>{
      if(Math.abs(p.x - x - 0.5) < 0.5 + p.r && Math.abs(p.y - y - 0.5) < 0.5 + p.r){ const s = G.freeSpot(r, r.cxw, r.cyw); p.x = s.x; p.y = s.y; }
    });
  });
  G.emit(open ? "doorsOpen" : "doorsShut", { room:r.id });
};
proto.spawnWave = function(r, wave){
  const G = this;
  wave.forEach(s=> G.spawnEnemy(r, s));
  G.emit("wave", { room:r.id, n:wave.length });
};
proto.spawnEnemy = function(r, s, bossDef){
  const G = this, def = bossDef || DG.ENEMIES[s.type], sc = G.scale, af = s.elite ? DG.AFFIXES[s.elite] : null;
  const hp = def.hp*sc.hp*(af && af.hp ? af.hp : 1)*(s.boss ? 1 : 1);
  const e = {
    id:G.nextId++, type:s.type, def, room:r.id, x:s.x, y:s.y, vx:0, vy:0, kx:0, ky:0,
    r:def.radius*(af && af.size ? af.size : 1), hp, maxHp:hp, speed:def.speed*(af && af.speed ? af.speed : 1), dmg:def.dmg*sc.dmg,
    affix:s.elite || null, boss:!!s.boss, st:{}, ai:{ state:"idle", t:0, cd:0.6 + G.rng.next()*0.8 }, spawn:s.boss ? 1.4 : 0.8, face:Math.PI/2, flash:0
  };
  G.enemies.push(e);
  G.emit("spawn", { id:e.id, x:e.x, y:e.y, type:e.type, boss:e.boss, affix:e.affix });
  return e;
};
proto.clearRoom = function(r){
  const G = this;
  r.active = false; r.cleared = true;
  G.setDoors(r, true);
  G.stats.rooms++;
  G.emit("clear", { room:r.id });
  if(r.type === "boss") return;
  // a reward, sometimes
  const rng = G.rng, c = G.freeSpot(r, r.cxw, r.cyw), x = c.x, y = c.y;
  const roll = rng.next();
  if(roll < 0.06 && !G.pickups.length) G.addProp(r, { kind:"chest", x:Math.floor(x), y:Math.floor(y), tier:1 });
  else if(roll < 0.14) G.dropItem(x, y, L.makeRune(L.rollRune(rng, G.gun().element)));
  else if(roll < 0.3) G.addPickup("heart", x, y, 20);
  else if(roll < 0.42) G.addPickup("mana", x, y, 40);
  else if(roll < 0.75) G.dropGold(x, y, Math.round(rng.int(4, 8)*(1 + 0.3*(G.floor - 1))));
};
proto.ambush = function(r){
  const G = this, n = 2 + Math.min(3, G.floor), wave = [];
  for(let i=0;i<n;i++){
    const x = G.rng.range(r.x1 + 1.5, r.x2 - 0.5), y = G.rng.range(r.cyw, r.y2 - 0.5);
    if(G.blocked(Math.floor(x), Math.floor(y), "enemy")) continue;
    wave.push({ type:i % 3 === 2 && G.floor >= 2 ? "slinger" : "grunt", x, y, elite:null });
  }
  if(!wave.length) return;
  r.waves = [wave]; r.wave = 0; r.cleared = false; r.waveDelay = 0;
  r.active = true; G.setDoors(r, false);
  G.emit("lock", { room:r.id });
};
proto.bossDown = function(e){
  const G = this, r = G.D.rooms[e.room];
  G.enemies.forEach(o=>{ if(o !== e && !o.dead && o.room === r.id) G.killEnemy(o, {}); });
  G.bullets.forEach(b=>{ if(b.team === "e") b.dead = true; });
  G.portal = { x:r.cxw, y:r.cyw + 1.5 };
  G.addProp(r, { kind:"chest", x:Math.floor(r.cxw), y:Math.floor(r.cyw) - 2, tier:3 });
  G.dropGold(e.x, e.y, 25 + 10*G.floor);
  G.emit("portal", G.portal);
  G.say(G.floor >= DG.FINAL_FLOOR && !G.endless ? "Grubnok is defeated! The way out is open." : "The king is down! (He'll be back.) A portal opens.", 4);
};

/* ---- puzzles ---- */
proto.flipBrazier = function(r, i){
  const G = this, pz = r.puzzle;
  [i - 1, i, i + 1].forEach(j=>{ if(j >= 0 && j < pz.lit.length) pz.lit[j] ^= 1; });
  G.emit("brazier", { room:r.id, i, lit:pz.lit.slice() });
  if(pz.lit.every(v=> v)){
    pz.solved = true; G.stats.puzzles++;
    r.props.forEach(pr=>{ if(pr.kind === "chest") pr.locked = false; });
    G.emit("solved", { room:r.id }); G.say(G.rng.pick(DG.LINES.solved));
  }
};

/* ---- things on the floor ---- */
proto.addPickup = function(kind, x, y, value, item){
  const G = this, a = G.rng.next()*Math.PI*2, s = G.rng.range(1, 3);
  const pk = { id:G.nextId++, kind, x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, value, item, t:0, r:0.25 };
  G.pickups.push(pk);
  G.emit("drop", { id:pk.id, kind, x, y, item });
  return pk;
};
proto.dropGold = function(x, y, amount){
  // a few coins of different sizes
  while(amount > 0){ const v = amount >= 10 ? 5 : 1; this.addPickup("gold", x, y, v); amount -= v; }
};
proto.dropItem = function(x, y, item){ return this.addPickup("item", x, y, 0, item); };
proto.addProp = function(r, pr){ pr.id = this.nextId++; pr.room = r.id; if(pr.kind === "chest") pr.open = false; r.props.push(pr); this.emit("prop", { prop:pr }); return pr; };

proto.updatePickups = function(dt){
  const G = this, p = G.player;
  G.pickups.forEach(k=>{
    k.t += dt;
    // pop out, slide to a stop
    if(Math.abs(k.vx) + Math.abs(k.vy) > 0.01){ G.move(k, k.vx*dt, k.vy*dt, "enemy"); const f = Math.exp(-dt*5); k.vx *= f; k.vy *= f; }
    const d = DG.dist(k.x, k.y, p.x, p.y);
    if(k.kind === "gold" && d < 2.6 && k.t > 0.3){ const s = 9*dt/Math.max(0.3, d); k.x += (p.x - k.x)*Math.min(1, s); k.y += (p.y - k.y)*Math.min(1, s); }
    if(k.t < 0.3 || d > p.r + k.r + 0.1) return;
    if(k.kind === "gold"){ p.gold += k.value; G.stats.gold += k.value; k.dead = true; G.emit("coin", { x:k.x, y:k.y, v:k.value }); }
    else if(k.kind === "heart" && p.hp < p.maxHp){ G.heal(k.value); k.dead = true; G.emit("pickup", { kind:"heart" }); }
    else if(k.kind === "mana" && p.mana < p.maxMana){ p.mana = Math.min(p.maxMana, p.mana + k.value); k.dead = true; G.emit("pickup", { kind:"mana" }); }
  });
  G.pickups = G.pickups.filter(k=> !k.dead);
};

/* what E would do right now, for the HUD prompt and for interact() */
proto.target = function(){
  const G = this, p = G.player;
  let best = null, bd = 1.5;
  const consider = (o, d, text)=>{ if(d < bd){ bd = d; best = { o, text }; } };
  G.pickups.forEach(k=>{ if(k.kind === "item") consider(k, DG.dist(k.x, k.y, p.x, p.y), "Take " + k.item.name); });
  if(G.portal) consider({ portal:true }, DG.dist(G.portal.x, G.portal.y, p.x, p.y) - 0.3, G.floor >= DG.FINAL_FLOOR && !G.endless ? "Escape the dungeon" : "Jump in the portal");
  const r = G.room || G.D.rooms.find(rr=> p.x > rr.x1 - 1 && p.x < rr.x2 + 2 && p.y > rr.y1 - 5 && p.y < rr.y2 + 2);
  if(r) r.props.forEach(pr=>{
    const d = DG.dist(pr.x + 0.5, pr.y + 0.5, p.x, p.y);
    if(pr.kind === "chest" && !pr.open) consider(pr, d, pr.locked ? "Locked (solve the puzzle)" : "Open chest");
    if(pr.kind === "pedestal" && !pr.item.sold) consider(pr, d, "Buy " + pr.item.item.name + " — " + pr.item.price + "g");
    if(pr.kind === "sign") consider(pr, d - 0.2, "Read sign");
    if(pr.kind === "merchant") consider(pr, d - 0.3, "Talk to Snibbit");
  });
  return best;
};

proto.interact = function(){
  const G = this, p = G.player, tg = G.target();
  if(!tg) return;
  const o = tg.o;
  if(o.portal){ G.emit("descend"); G.descend(); return; }
  if(o.kind === "item"){ G.takeItem(o.item, o); return; }
  if(o.kind === "chest"){
    if(o.locked){ G.say("It's locked. A sign says the braziers might help."); return; }
    o.open = true; G.emit("chest", { id:o.id, x:o.x + 0.5, y:o.y + 0.5 });
    G.chestLoot(o).forEach(it=> G.dropItem(o.x + 0.5, o.y + 1, it));
    G.dropGold(o.x + 0.5, o.y + 0.9, G.rng.int(3, 8) + o.tier*3);
    return;
  }
  if(o.kind === "pedestal"){
    const s = o.item;
    if(p.gold < s.price){ G.say(G.rng.pick(DG.LINES.broke)); G.emit("broke"); return; }
    p.gold -= s.price; s.sold = true; G.emit("buy", { item:s.item });
    if(s.item.kind === "heal"){ G.heal(s.item.amount); G.say("Tastes like boots. You feel better."); }
    else G.takeItem(s.item, null);
    return;
  }
  if(o.kind === "sign"){ G.say(o.text, o.riddle ? 9 : 6); G.emit("read"); return; }
  if(o.kind === "merchant"){ G.say("Snibbit: \"" + G.rng.pick(["Buy something or stop breathing on my stuff.", "That gun? Barely haunted.", "I'd say 'mint condition' but I ate the mint.", "Grubnok owes me money. Kill him for me? Kidding. Unless?"]) + "\"", 3.5); return; }
};

proto.chestLoot = function(c){
  const G = this, rng = G.rng, f = G.floor, owned = G.player.relics.map(r=> r.id);
  const gun = o=> L.rollGun(rng, f + (c.tier >= 2 ? 1 : 0), o);
  if(c.tier === 3) return [gun({ minRarity:2, boost:0.8 }), L.rollRelic(rng, owned) || L.makeRune(L.rollRune(rng))];
  const roll = rng.next();
  if(c.tier === 2){
    if(roll < 0.5) return [gun({ minRarity:1, boost:0.6 })];
    if(roll < 0.8) return [L.rollRelic(rng, owned) || gun({})];
    return [L.makeRune(L.rollRune(rng, G.gun().element)), L.makeRune(L.rollRune(rng))];
  }
  if(roll < 0.6) return [gun({ boost:0.1 })];
  if(roll < 0.82) return [L.rollRelic(rng, owned) || gun({})];
  return [L.makeRune(L.rollRune(rng, G.gun().element))];
};

proto.takeItem = function(item, pickup){
  const G = this, p = G.player;
  if(pickup) pickup.dead = true;
  G.pickups = G.pickups.filter(k=> !k.dead);
  if(item.kind === "gun"){
    if(p.guns.length < DG.PLAYER.maxGuns){ p.guns.push(item); p.cur = p.guns.length - 1; }
    else {
      const old = p.guns[p.cur];
      p.guns[p.cur] = item;
      G.dropItem(p.x, p.y, old);
    }
    p.reloadT = 0;
    G.emit("pickup", { kind:"gun", item }); G.say("Got " + item.name + (item.flavour ? " — " + item.flavour : ""), 3.5);
  } else if(item.kind === "rune"){
    const g = G.gun();
    if(g.runes.length < g.slots){ g.runes.push(item.id); g.name = g.unique || L.gunName(g); G.say(item.name + " socketed into your " + g.name + "!"); }
    else { p.bag.push(item); G.say(item.name + " → bag (TAB to socket it)"); }
    G.emit("pickup", { kind:"rune", item });
  } else if(item.kind === "relic"){
    p.relics.push(item);
    const before = p.maxHp;
    G.recalc();
    if(p.maxHp > before) p.hp += p.maxHp - before;
    G.emit("pickup", { kind:"relic", item }); G.say(item.name + ": " + DG.RELICS[item.id].desc, 3.5);
  }
};

/* the bag: move a rune between a gun and the bag */
proto.socket = function(bagIndex, gunIndex){
  const p = this.player, it = p.bag[bagIndex], g = p.guns[gunIndex];
  if(!it || !g || g.runes.length >= g.slots) return false;
  p.bag.splice(bagIndex, 1); g.runes.push(it.id); g.name = g.unique ? g.name : L.gunName(g);
  this.emit("socket"); return true;
};
proto.unsocket = function(gunIndex, runeIndex){
  const p = this.player, g = p.guns[gunIndex];
  if(!g || !g.runes[runeIndex]) return false;
  const id = g.runes.splice(runeIndex, 1)[0]; p.bag.push(L.makeRune(id)); g.name = g.unique ? g.name : L.gunName(g);
  const s = L.stats(g, p.stats); g.ammo = Math.min(g.ammo, s.mag);
  this.emit("socket"); return true;
};

/* ---- the flow field the goblins walk down, over the room they're in ---- */
proto.updateFlow = function(){
  const G = this, p = G.player, r = G.room;
  if(!r || !r.active){ G.flow = null; return; }
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  if(G.flow && G.flow.tx === tx && G.flow.ty === ty && G.flow.room === r.id) return;
  const x0 = r.x1 - 1, y0 = r.y1 - 1, w = r.x2 - r.x1 + 3, h = r.y2 - r.y1 + 3;
  const dist = new Float32Array(w*h).fill(Infinity), q = [];
  const idx = (x, y)=> (y - y0)*w + (x - x0);
  if(tx < x0 || ty < y0 || tx >= x0 + w || ty >= y0 + h) { G.flow = null; return; }
  dist[idx(tx, ty)] = 0; q.push(tx, ty);
  for(let qi=0; qi<q.length; qi+=2){
    const x = q[qi], y = q[qi + 1], d0 = dist[idx(x, y)];
    for(const [dx, dy] of DG.DIRS8){
      const nx = x + dx, ny = y + dy;
      if(nx < x0 || ny < y0 || nx >= x0 + w || ny >= y0 + h) continue;
      if(G.blocked(nx, ny, "enemy")) continue;
      if(dx && dy && (G.blocked(x + dx, y, "enemy") || G.blocked(x, y + dy, "enemy"))) continue;
      const nd = d0 + (dx && dy ? 1.414 : 1);
      if(nd < dist[idx(nx, ny)]){ dist[idx(nx, ny)] = nd; q.push(nx, ny); }
    }
  }
  G.flow = { tx, ty, room:r.id, x0, y0, w, h, dist };
};
/* the direction a goblin at (x, y) should walk to reach the wizard */
proto.flowDir = function(x, y){
  const F = this.flow; if(!F) return null;
  const tx = Math.floor(x), ty = Math.floor(y);
  const at = (a, b)=> (a < F.x0 || b < F.y0 || a >= F.x0 + F.w || b >= F.y0 + F.h) ? Infinity : F.dist[(b - F.y0)*F.w + (a - F.x0)];
  let best = at(tx, ty), bx = 0, by = 0;
  for(const [dx, dy] of DG.DIRS8){ const d = at(tx + dx, ty + dy); if(d < best){ best = d; bx = dx; by = dy; } }
  if(!bx && !by) return null;
  // aim at the centre of the next tile, so they round corners cleanly
  const cx = tx + bx + 0.5 - x, cy = ty + by + 0.5 - y, l = Math.hypot(cx, cy) || 1;
  return { x:cx/l, y:cy/l };
};

})(typeof window !== "undefined" ? window : globalThis);
