/* ------------------------------------------------------------------ *
 *  The game: one run, floor by floor. Pure logic, fixed-step.
 *
 *  G.update(dt, input) moves the world on; everything that happened
 *  goes into G.events for the view, the HUD and the audio to read.
 *  The game never waits on the view.
 *
 *  This file: Zippy, the map, rooms, pickups, interacting, levels and
 *  active items. combat.js has shots, damage, triggers and payloads;
 *  gribbus.js the frog and friends; puzzles.js the puzzles; ai.js the
 *  enemies.
 *
 *  input = { mx, my  move (-1..1)   ax, ay  aim point (tiles)
 *            fire, spell  held      blink, use, swap, reload, active  pressed
 *            slot  0..2 or -1 }
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG, T = DG.TILE, L = DG.Loot, Items = DG.Items;

const Game = DG.Game = function(opts){
  opts = opts || {};
  const G = this;
  G.seedWord = opts.seedWord || DG.seedWord(Math.floor((opts.seed || 1)*7.31) >>> 0);
  G.seed = DG.seedFromWord(G.seedWord);
  G.rng = DG.RNG(G.seed ^ 0x5bd1e995);
  G.t = 0; G.events = []; G.state = "play"; G.endless = false; G.choice = null;
  G.meta = opts.meta || { flies:0, unlocked:{} };
  G.stats = { kills:0, dmg:0, rooms:0, gold:0, time:0, floors:0, secrets:0, puzzles:0, items:0, reactions:0, flies:0 };
  G.nextId = 1;
  G.seenItems = {}; G.pools = Items.pools();
  const P = DG.PLAYER;
  G.player = {
    x:0, y:0, r:P.radius, vx:0, vy:0, hp:P.hp, maxHp:P.hp, mana:P.mana, maxMana:P.mana, wards:0,
    guns:[L.starterGun()], cur:0, items:{}, boons:[], gold:0, xp:0, level:1, pendingLevels:0,
    active:null, blinkT:0, blinkCd:0, bdx:0, bdy:0, iframes:0, slip:0, sdx:0, sdy:0, stun:0, chill:0,
    fireCd:0, reloadT:0, aim:0, safeX:0, safeY:0, bonkCd:0, alive:true, moving:false, lastShot:0, volleys:0
  };
  G.recalc();
  G.player.hp = G.player.maxHp; G.player.mana = G.player.maxMana;
  G.gribbus = DG.Gribbus.create(G);
  (opts.items || []).forEach(id=> G.giveItem(id, true));
  G.enterFloor(opts.floor || 1);
};
const proto = Game.prototype;

/* ---- events and messages ---- */
proto.emit = function(type, data){ const e = data || {}; e.type = type; this.events.push(e); return e; };
proto.say = function(text, dur){ this.emit("msg", { text, dur:dur || 2.6 }); };
proto.drain = function(){ const e = this.events; this.events = []; return e; };

/* ---- everything Zippy owns, folded into one stat block (G.mods) ---- */
proto.recalc = function(){
  const G = this, p = G.player, g = p.guns[p.cur];
  const extra = g ? (g.innate || []) : [];
  const M = G.mods = Items.build(p.items, p.boons, extra);
  const hpBefore = p.maxHp;
  p.maxHp = Math.max(20, DG.PLAYER.hp + M.hp - (p.altarLoss || 0));
  p.maxMana = DG.PLAYER.mana + M.mana;
  if(p.maxHp > hpBefore && hpBefore) p.hp += p.maxHp - hpBefore;
  p.hp = Math.min(p.hp, p.maxHp); p.mana = Math.min(p.mana, p.maxMana);
  G.duoKey = M.duos.join(",");
};
proto.gun = function(){ return this.player.guns[this.player.cur]; };
proto.gunStats = function(g){ return L.stats(g || this.gun(), this.mods); };
proto.luck = function(p){ return Math.min(1, p*(1 + 0.15*this.mods.luck)); };
proto.chance = function(p){ return this.rng.next() < this.luck(p); };

/* ---- floors ---- */
proto.enterFloor = function(n){
  const G = this, p = G.player;
  G.floor = n;
  G.D = DG.Dungeon.generate((G.seed + n*104729) >>> 0, n);
  G.scale = DG.FLOOR_SCALE(n);
  G.enemies = []; G.bullets = []; G.pickups = []; G.bombs = []; G.marks = []; G.hazards = []; G.allies = []; G.pending = []; G.beams = [];
  G.room = null; G.portal = null; G.bossRef = null; G.timeStop = 0; G.tickT = {};
  G.curses = G.D.curses || [];
  G.traps = [];
  G.D.rooms.forEach(r=>{
    r.seen = r.type === "start"; r.active = false; r.wave = 0; r.waveDelay = 0;
    r.traps.forEach(t=>{ t.room = r.id; t.t = t.phase*(DG.TRAPS[t.kind].cycle || 1); t.state = "idle"; G.traps.push(t); });
    r.props.forEach(pr=> G.initProp(r, pr));
  });
  if(G.curses.indexOf("lost") < 0) G.D.rooms.forEach(r=>{ if(r.type !== "secret") r.known = true; });
  p.x = G.D.start.x; p.y = G.D.start.y; p.safeX = p.x; p.safeY = p.y; p.vx = p.vy = 0;
  G.gribbus.x = p.x - 1; G.gribbus.y = p.y + 0.5;
  G.flow = null;
  G.emit("floor", { floor:n, name:G.D.theme.name, curses:G.curses.slice() });
  G.curses.forEach(c=> G.say(DG.CURSES[c].name + ": " + DG.CURSES[c].desc, 4));
};
proto.descend = function(){
  const G = this, p = G.player;
  G.stats.floors++;
  if(G.floor >= DG.FINAL_FLOOR && !G.endless){ G.state = "won"; G.emit("won"); return; }
  p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp*0.3));   // a snack on the stairs
  G.enterFloor(G.floor + 1);
};
proto.keepGoing = function(){ this.endless = true; this.state = "play"; this.enterFloor(this.floor + 1); };

/* props come out of the generator as plain data; give them their runtime bits */
proto.initProp = function(r, pr){
  const G = this;
  pr.id = G.nextId++; pr.room = r.id;
  if(pr.kind === "chest") pr.open = false;
  if(pr.kind === "pedestal" && !pr.offer) pr.offer = G.makeOffer(r, pr);
  if(pr.kind === "lilypad" && !pr.buff){ pr.buff = null; }
  return pr;
};
/* what sits on a pedestal: an item from the room's pool, a gun, soup... */
proto.makeOffer = function(r, pr){
  const G = this, f = G.floor;
  const pool = pr.pool || ({ treasure:"t", shop:"s", boss:"b", secret:"x", altar:"a", puzzle:"t" })[r.type] || "t";
  if(pr.sell === "gun"){ const g = L.rollGun(G.rng, f + 1, { minRarity:1, boost:0.3 }); return { kind:"gun", gun:g, price:L.price(g, f), currency:"gold" }; }
  if(pr.sell === "heal") return { kind:"heal", amount:40, price:L.price({ kind:"heal" }, f), currency:"gold", name:"Suspicious Soup" };
  if(pr.sell === "ward") return { kind:"ward", n:2, price:L.price({ kind:"ward" }, f), currency:"gold", name:"Two Wards" };
  if(pr.sell === "active"){ const id = G.rng.pick(Object.keys(DG.ACTIVES)); return { kind:"active", id, price:L.price({ kind:"active" }, f), currency:"gold", name:DG.ACTIVES[id].name }; }
  const id = Items.roll(G, pool);
  const o = { kind:"item", id, name:DG.ITEMS[id].name };
  if(r.type === "shop") { o.price = L.itemPrice(id, f); o.currency = "gold"; }
  if(r.type === "altar"){ o.price = 20; o.currency = "hp"; }
  return o;
};

/* ---- the map ---- */
proto.tile = function(x, y){ return this.D.at(Math.floor(x), Math.floor(y)); };
proto.doorAt = function(tx, ty){ return this.D.doorMap ? this.D.doors[this.D.doorMap[ty*this.D.w + tx]] : this.D.doors.find(d=> d.tiles.some(([x, y])=> x === tx && y === ty)); };
/* what stops a walker. pits stop enemies unless knocked flying; ghosts drift through walls */
proto.blocked = function(tx, ty, who){
  const t = this.D.at(tx, ty);
  if(t === T.SOLID){ return who !== "ghost" || tx <= 0 || ty <= 0 || tx >= this.D.w - 1 || ty >= this.D.h - 1; }
  if(t === T.BLOCK || t === T.BREAK || t === T.PUSH) return who !== "ghost" || t === T.PUSH;
  if(t === T.DOOR){ const d = this.doorAt(tx, ty); return d && !d.open && who !== "ghost"; }
  if(t === T.FAKE) return who !== "player" && who !== "ghost";
  if(t === T.PIT || t === T.WATER) return who === "enemy";
  return false;
};
proto.bulletBlocked = function(x, y, spectral){
  const tx = Math.floor(x), ty = Math.floor(y), t = this.D.at(tx, ty);
  if(spectral) return tx <= 0 || ty <= 0 || tx >= this.D.w - 1 || ty >= this.D.h - 1;
  if(t === T.SOLID || t === T.BLOCK || t === T.BREAK || t === T.PUSH) return true;
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
  // Only tiles AHEAD of the body can stop it: a body shoved into a wall can
  // always back out, never go deeper, and is never pushed through.
  const r = e.r, eps = 0.001;
  if(dx){
    const nx = e.x + dx, y0 = Math.floor(e.y - r + eps), y1 = Math.floor(e.y + r - eps);
    const c0 = Math.floor((dx > 0 ? e.x + r - eps : e.x - r + eps)), c1 = Math.floor((dx > 0 ? nx + r - eps : nx - r + eps));
    for(let c=c0; dx > 0 ? c<=c1 : c>=c1; c+=Math.sign(dx)){
      if((c + 0.5 - e.x)*dx <= 0) continue;
      for(let ty=y0; ty<=y1; ty++) if(this.blocked(c, ty, who)){
        if(who === "player" && this.tryPush(c, ty, Math.sign(dx), 0)) continue;
        e.x = dx > 0 ? Math.min(nx, Math.max(e.x, c - r - eps)) : Math.max(nx, Math.min(e.x, c + 1 + r + eps));
        return true;
      }
    }
    e.x = nx;
  }
  if(dy){
    const ny = e.y + dy, x0 = Math.floor(e.x - r + eps), x1 = Math.floor(e.x + r - eps);
    const c0 = Math.floor((dy > 0 ? e.y + r - eps : e.y - r + eps)), c1 = Math.floor((dy > 0 ? ny + r - eps : ny - r + eps));
    for(let c=c0; dy > 0 ? c<=c1 : c>=c1; c+=Math.sign(dy)){
      if((c + 0.5 - e.y)*dy <= 0) continue;
      for(let tx=x0; tx<=x1; tx++) if(this.blocked(tx, c, who)){
        if(who === "player" && this.tryPush(tx, c, 0, Math.sign(dy))) continue;
        e.y = dy > 0 ? Math.min(ny, Math.max(e.y, c - r - eps)) : Math.max(ny, Math.min(e.y, c + 1 + r + eps));
        return true;
      }
    }
    e.y = ny;
  }
  return false;
};
/* pushing a puzzle block: puzzles.js decides; returns false here so Zippy stops */
proto.tryPush = function(tx, ty, dx, dy){
  if(this.D.at(tx, ty) !== T.PUSH) return false;
  if(DG.Puzzles) DG.Puzzles.push(this, tx, ty, dx, dy);
  return false;
};

proto.inRoom = function(r, x, y){ return x >= r.x1 && x <= r.x2 + 1 && y >= r.y1 && y <= r.y2 + 1; };
proto.roomOf = function(x, y){ return DG.Dungeon.roomAt(this.D, x, y); };

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
  G.timeStop = Math.max(0, G.timeStop - dt);
  G.updatePlayer(dt, input || {});
  G.updateRooms(dt);
  G.updateFlow();
  if(G.timeStop <= 0){ for(let i=0;i<G.enemies.length;i++) DG.AI.update(G, G.enemies[i], dt); }
  G.separate();
  G.updateStatus(dt);
  G.updatePending(dt);
  G.updateShots(dt);
  G.updateBeams(dt);
  if(G.timeStop <= 0) G.updateBombs(dt);
  G.updateHazards(dt);
  G.updateAllies(dt);
  DG.Gribbus.update(G, dt);
  G.updateTicks(dt);
  G.updateTraps(dt);
  if(DG.Puzzles) DG.Puzzles.update(G, dt);
  G.updatePickups(dt);
  G.marks = G.marks.filter(m=> (m.t -= dt) > 0);
  G.enemies = G.enemies.filter(e=> !e.dead);
  // level-ups wait until the room is quiet
  if(G.player.pendingLevels > 0 && !(G.room && G.room.active) && G.state === "play") G.offerBoons();
};

/* ---- Zippy ---- */
proto.updatePlayer = function(dt, I){
  const G = this, p = G.player, M = G.mods;
  p.iframes = Math.max(0, p.iframes - dt); p.blinkCd = Math.max(0, p.blinkCd - dt); p.stun = Math.max(0, p.stun - dt);
  p.chill = Math.max(0, p.chill - dt); p.bonkCd = Math.max(0, p.bonkCd - dt);
  p.mana = Math.min(p.maxMana, p.mana + DG.PLAYER.manaRegen*(1 + M.regen)*dt);
  if(I.ax !== undefined) p.aim = Math.atan2(I.ay - p.y, I.ax - p.x);
  p.aimX = I.ax; p.aimY = I.ay;

  let mx = I.mx || 0, my = I.my || 0;
  const ml = Math.hypot(mx, my); if(ml > 1){ mx /= ml; my /= ml; }
  p.moving = ml > 0.1;
  p.discoT = Math.max(0, (p.discoT || 0) - dt);
  if(M.special.static && p.moving) p.static = Math.min(1, (p.static || 0) + dt/2);

  if(p.blinkT > 0){
    const B = DG.PLAYER.blink, sp = B.dist/B.time;
    p.blinkT -= dt;
    G.move(p, p.bdx*sp*dt, p.bdy*sp*dt, "player");
    if(M.special.comet) G.cometHits();
    if(p.blinkT <= 0){ G.emit("blinkEnd", { x:p.x, y:p.y }); G.trigger("blinkEnd", { x:p.x, y:p.y, depth:0 }); }
  } else if(p.slip > 0){
    p.slip -= dt;
    if(G.move(p, p.sdx*8*dt, p.sdy*8*dt, "player")) p.slip = 0;
  } else if(p.stun <= 0){
    const sp = DG.PLAYER.speed*Math.max(0.5, 1 + M.speed)*(p.chill > 0 ? 0.7 : 1)*(G.onWater(p) ? 0.75 : 1);
    const k = 1 - Math.exp(-dt*18);
    p.vx += (mx*sp - p.vx)*k; p.vy += (my*sp - p.vy)*k;
    G.move(p, p.vx*dt, p.vy*dt, "player");
    if(I.blink && p.blinkCd <= 0){
      let bx = mx, by = my;
      if(Math.hypot(bx, by) < 0.1){ bx = Math.cos(p.aim); by = Math.sin(p.aim); }
      const bl = Math.hypot(bx, by); p.bdx = bx/bl; p.bdy = by/bl;
      p.blinkT = DG.PLAYER.blink.time; p.blinkCd = DG.PLAYER.blink.cd*Math.max(0.3, 1 - M.blinkCd); p.iframes = Math.max(p.iframes, DG.PLAYER.blink.iframes);
      p.cometHit = [];
      G.emit("blink", { x:p.x, y:p.y, dx:p.bdx, dy:p.bdy, comet:!!M.special.comet });
      G.trigger("blink", { x:p.x, y:p.y, depth:0 });
    }
    if(my < -0.3 && p.bonkCd <= 0) G.checkBonk(p);
  } else { p.vx *= 0.8; p.vy *= 0.8; }

  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  if(G.D.at(tx, ty) === T.FAKE) G.revealFake(tx, ty, true);

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
    if(p.mana >= s.spellCost){ G.castSpell(g, s, I); if(G.mods.special.spellecho) G.pending.push({ t:0.3, fn:()=> G.castSpell(g, s, I, true) }); }
    else { G.emit("nomana"); p.spellHeld = true; }
  }
  if(!I.spell) p.spellHeld = false;
  if(I.active) G.useActive(I);
  if(I.use) G.interact();
};
proto.onWater = function(e){ return this.D.at(Math.floor(e.x), Math.floor(e.y)) === T.WATER; };
proto.selectGun = function(i){
  const p = this.player; p.cur = i; p.reloadT = 0; p.fireCd = Math.max(p.fireCd, 0.15);
  this.recalc();
  this.emit("swap", { gun:this.gun() });
};
proto.startReload = function(){
  const p = this.player, s = this.gunStats();
  if(p.reloadT > 0) return;
  p.reloadT = s.reload; this.emit("reload", { t:s.reload });
  this.trigger("reload", { x:p.x, y:p.y, depth:0 });
};

proto.checkBonk = function(p){
  const G = this;
  for(const d of G.D.painted){
    if(Math.abs(p.x - (d.x + 0.5)) > 0.55) continue;
    if(Math.abs(p.y - p.r - (d.y + 1)) > 0.08) continue;
    if(d.kind === "real") continue;
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
proto.revealFake = function(tx, ty){
  const G = this;
  const f = G.D.fakes.find(o=> o.tiles.some(([x, y])=> x === tx && y === ty));
  if(!f || f.revealed) return;
  f.revealed = true;
  G.emit("illusion", { x:f.x, y:f.y });
  if(f.puzzle){
    const room = G.D.rooms[f.room];
    if(room.puzzle && !room.puzzle.solved) G.solvePuzzle(room, "The honest door! ");
  } else { G.stats.secrets++; G.say(G.rng.pick(DG.LINES.secret)); }
};
proto.solvePuzzle = function(r, prefix){
  const G = this;
  if(r.puzzle.solved && r.puzzle.rewarded) return;
  r.puzzle.solved = true; r.puzzle.rewarded = true; G.stats.puzzles++;
  r.props.forEach(pr=>{ if(pr.kind === "chest") pr.locked = false; });
  G.emit("solved", { room:r.id });
  G.say((prefix || "") + G.rng.pick(DG.LINES.solved));
};

proto.heal = function(n){ const p = this.player; const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + n); if(p.hp > before) this.emit("heal", { x:p.x, y:p.y, amt:p.hp - before }); };
proto.addWards = function(n, max){
  const p = this.player, cap = Math.min(max || DG.PLAYER.maxWards, DG.PLAYER.maxWards);
  const before = p.wards; p.wards = Math.min(cap, p.wards + n);
  if(p.wards > before) this.emit("ward", { n:p.wards - before });
};

proto.hurtPlayer = function(amt, why, force){
  const G = this, p = G.player;
  if(G.state !== "play" && G.state !== "choose") return;
  if(!force && (p.iframes > 0 || p.blinkT > 0)) return;
  if(G.god) return;
  p.iframes = DG.PLAYER.hurtIframes; G.lastHurt = why;
  if(p.wards > 0 && why !== "pit"){
    p.wards--; G.emit("wardBreak", { x:p.x, y:p.y });
  } else {
    p.hp -= amt;
    G.emit("hurt", { amt, why, x:p.x, y:p.y });
  }
  G.trigger("hurt", { x:p.x, y:p.y, depth:0 });
  if(p.hp <= 0){ p.hp = 0; p.alive = false; G.state = "dead"; G.emit("death", { why }); }
};

/* ---- items ---- */
proto.giveItem = function(id, quiet){
  const G = this, p = G.player, d = DG.ITEMS[id];
  if(!d) return;
  p.items[id] = (p.items[id] || 0) + 1;
  G.seenItems[id] = true;
  G.stats.items++;
  const duosBefore = G.duoKey || "", setsBefore = G.player.sets || [];
  G.recalc();
  if(d.stats && d.stats.wards) G.addWards(d.stats.wards);
  if(!quiet){
    G.emit("item", { id, name:d.name, desc:d.desc, flavor:d.flavor, tier:d.tier });
    if(d.tier >= 4) G.emit("godly", { id, name:d.name });
  }
  G.mods.duos.forEach(n=>{ if(duosBefore.split(",").indexOf(n) < 0 && !quiet){ const duo = DG.DUOS.find(x=> x.name === n); G.emit("duo", { name:n, desc:duo.desc }); } });
  // a third item of a set: a transformation
  G.mods.sets.forEach(sid=>{ if(setsBefore.indexOf(sid) < 0){ const s = DG.SETS.find(x=> x.id === sid); G.emit("transform", { id:sid, name:s.name, desc:s.desc }); if(!quiet) G.say("TRANSFORMATION! You are the " + s.name + ".", 4); } });
  p.sets = G.mods.sets.slice();
  G.checkAscensions();
  if(d.special === "moons" || d.special === "shadow") DG.Gribbus.spawnPermanents(G);
};
proto.checkAscensions = function(){
  const G = this, p = G.player;
  p.guns.forEach(g=>{
    if(g.ascended) return;
    const a = DG.ASCENSIONS.find(x=> x.base === g.base && p.items[x.item]);
    if(!a) return;
    g.ascended = true; g.name = a.name; g.unique = a.name; g.flavour = a.flavor;
    g.innate = (g.innate || []).concat(a.innate.filter(id=> (g.innate || []).indexOf(id) < 0));
    g.rarity = Math.max(g.rarity, 3);
    G.emit("ascend", { name:a.name, flavor:a.flavor });
    G.say("ASCENSION! Your gun becomes the " + a.name + ".", 4);
  });
  G.recalc();
};

/* ---- levels ---- */
proto.gainXp = function(n){
  const p = this.player;
  p.xp += n;
  while(p.xp >= DG.PLAYER.xp(p.level)){ p.xp -= DG.PLAYER.xp(p.level); p.level++; p.pendingLevels++; this.emit("levelup", { level:p.level }); }
};
proto.offerBoons = function(){
  const G = this;
  G.choice = { kind:"boon", options:Items.rollBoons(G, 3), level:G.player.level - G.player.pendingLevels + 1 };
  G.state = "choose";
  G.emit("choose", { kind:"boon" });
};
proto.choose = function(i){
  const G = this, p = G.player, c = G.choice;
  if(!c || G.state !== "choose") return;
  const id = c.options[Math.max(0, Math.min(c.options.length - 1, i))];
  if(c.kind === "boon"){
    p.boons.push(id); p.pendingLevels--;
    const before = p.maxHp;
    G.recalc();
    const B = DG.BOONS[id];
    if(B.stats && B.stats.wards) G.addWards(B.stats.wards);
    if(p.maxHp > before) p.hp = Math.min(p.maxHp, p.hp);
    G.emit("boon", { id, name:B.name });
  }
  G.choice = null; G.state = "play";
};

/* ---- active items ---- */
proto.giveActive = function(id){
  const G = this, p = G.player;
  if(p.active) G.dropActive(p.active, p.x, p.y);
  p.active = { id, charge:DG.ACTIVES[id].charge, max:DG.ACTIVES[id].charge };
  G.emit("pickup", { kind:"active", id }); G.say(DG.ACTIVES[id].name + ": " + DG.ACTIVES[id].desc, 3.5);
};
proto.dropActive = function(a, x, y){ this.addPickup("item", x, y, 0, { kind:"active", id:a.id, charge:a.charge, name:DG.ACTIVES[a.id].name }); };
proto.chargeActive = function(n){
  const a = this.player.active; if(!a) return;
  const was = a.charge; a.charge = Math.min(a.max, a.charge + n);
  if(was < a.max && a.charge >= a.max) this.emit("charged", { id:a.id });
};
proto.useActive = function(I){
  const G = this, p = G.player, a = p.active;
  if(!a) return;
  if(a.charge < a.max){ G.emit("nocharge"); return; }
  a.charge = 0;
  G.emit("active", { id:a.id, x:p.x, y:p.y });
  const P = G.payloadPower();
  switch(a.id){
    case "watch": G.timeStop = 3; break;
    case "hat": G.spawnAlly("hat", p.x, p.y, { P }); break;
    case "whistle":
      G.enemies.forEach(e=>{ if(!e.dead && !e.boss && G.room && e.room === G.room.id) e.st.confused = Math.max(e.st.confused || 0, 5); });
      G.emit("whistle", { x:p.x, y:p.y });
      break;
    case "cannon": {
      const f = G.gribbus;
      let tx = p.aimX === undefined ? p.x + Math.cos(p.aim)*5 : p.aimX, ty = p.aimY === undefined ? p.y + Math.sin(p.aim)*5 : p.aimY;
      const d = DG.dist(p.x, p.y, tx, ty); if(d > 9){ tx = p.x + (tx - p.x)/d*9; ty = p.y + (ty - p.y)/d*9; }
      const r = G.room || G.roomOf(p.x, p.y); if(r){ const s = G.freeSpot(r, tx, ty); if(s){ tx = s.x; ty = s.y; } }
      G.emit("frogCannon", { x1:f.x, y1:f.y, x2:tx, y2:ty });
      f.x = tx; f.y = ty; f.hopT = 0; f.rest = 0.6;
      G.pending.push({ t:0.3, fn:()=>{
        G.nova(tx, ty, 3, P*3, G.shotEls(G.gun()), 1);
        G.enemies.forEach(e=>{ if(!e.dead && !e.boss && DG.dist(e.x, e.y, tx, ty) < 3 + e.r) e.st.stun = Math.max(e.st.stun || 0, 1.2); });
        G.emit("croak", { x:tx, y:ty, kind:"cannon" });
      } });
      break;
    }
    case "discoball": p.discoT = 8; G.emit("disco", { x:p.x, y:p.y, big:true }); break;
    case "pockethole": {
      let tx = p.aimX === undefined ? p.x + Math.cos(p.aim)*5 : p.aimX, ty = p.aimY === undefined ? p.y + Math.sin(p.aim)*5 : p.aimY;
      const d = DG.dist(p.x, p.y, tx, ty); if(d > 9){ tx = p.x + (tx - p.x)/d*9; ty = p.y + (ty - p.y)/d*9; }
      G.addHazard({ kind:"blackhole", x:tx, y:ty, r:3.6, t:4, P:P*1.5, every:0.2, depth:1 });
      break;
    }
    case "frograin": for(let i=0;i<8;i++) G.spawnAlly("tadpole", p.x + G.rng.range(-3, 3), p.y + G.rng.range(-3, 3), {}); break;
    case "bomb": {
      const tx = p.aimX === undefined ? p.x + Math.cos(p.aim)*4 : p.aimX, ty = p.aimY === undefined ? p.y + Math.sin(p.aim)*4 : p.aimY;
      G.bombs.push({ id:G.nextId++, x:p.x, y:p.y, tx, ty, t:0, flight:0.6, fuse:0.5, r:2.8, dmg:P*6, team:"p" });
      break;
    }
    case "slate":
      G.bullets.forEach(b=>{ if(b.team === "e") b.dead = true; });
      G.payload({ do:"nova", r:4.5, dmg:2 }, { x:p.x, y:p.y, els:G.shotEls(G.gun()), depth:0, power:P });
      break;
    case "mirror": G.spawnAlly("shadow", p.x - 1, p.y, { life:8 }); break;
    case "turret": G.spawnAlly("turret", p.x + Math.cos(p.aim)*1.2, p.y + Math.sin(p.aim)*1.2, { life:10 }); break;
    case "seer": G.D.rooms.forEach(r=>{ r.known = true; if(r.type === "secret") r.hinted = true; }); G.D.fakes.forEach(f=> f.hinted = true); G.say("The lantern shows you everything. Even the secrets."); break;
    case "dice": {
      const r = G.room || G.roomOf(p.x, p.y);
      if(r) r.props.forEach(pr=>{ if(pr.kind === "pedestal" && !pr.taken && pr.offer && pr.offer.kind === "item"){ const o = G.makeOffer(r, pr); pr.offer = o; G.emit("reroll", { id:pr.id }); } });
      break;
    }
    case "meteor": {
      const live = G.enemies.filter(e=> !e.dead && e.spawn <= 0);
      for(let i=0;i<6;i++){
        const e = live.length ? live[i % live.length] : null;
        const tx = e ? e.x : p.x + G.rng.range(-5, 5), ty = e ? e.y : p.y + G.rng.range(-5, 5);
        G.bombs.push({ id:G.nextId++, x:tx, y:ty - 8, tx, ty, t:0, flight:0.5 + i*0.15, fuse:0, r:1.8, dmg:P*3.5, team:"p", meteor:true });
      }
      break;
    }
    case "soup": G.heal(40); break;
  }
};

/* ---- rooms: lock, waves, clear ---- */
proto.updateRooms = function(dt){
  const G = this, p = G.player, D = G.D;
  let inside = null;
  for(const r of D.rooms){
    if(p.x > r.x1 + 0.9 && p.x < r.x2 + 0.1 && p.y > r.y1 + 0.9 && p.y < r.y2 + 0.1){ inside = r; break; }
  }
  D.rooms.forEach(r=>{ if(!r.seen && p.x > r.x1 - 2 && p.x < r.x2 + 3 && p.y > r.y1 - 2 && p.y < r.y2 + 3 && (r.type !== "secret" || inside === r)){ r.seen = true; r.known = true; G.emit("seen", { room:r.id }); } });
  if(inside !== G.room){
    G.room = inside;
    if(inside){
      G.emit("enter", { room:inside.id, type:inside.type });
      if(!inside.cleared && !inside.active && (inside.type === "combat" || inside.type === "boss")) G.activate(inside);
      if(inside.type === "shop" && !inside.greeted){ inside.greeted = true; G.say(G.rng.pick(DG.LINES.shop), 3.5); }
      if(inside.type === "pond" && !inside.greeted){ inside.greeted = true; G.say(G.rng.pick(DG.LINES.pond), 3.5); DG.Gribbus.offerPond(G, inside); }
      if(inside.type === "altar" && !inside.greeted){ inside.greeted = true; G.say(G.rng.pick(DG.LINES.altar), 3.5); }
      if(inside.type === "secret" && !inside.found){ inside.found = true; G.emit("secretRoom", { room:inside.id }); }
    }
  }
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
  G.tickT = {};
  G.trigger("lock", { x:G.player.x, y:G.player.y, depth:0 });
  if(r.type === "boss"){
    const key = G.D.theme.boss || "king", b = DG.BOSSES[key];
    const e = G.spawnEnemy(r, { type:key, x:r.boss.x, y:r.boss.y, boss:true }, b);
    G.bossRef = e;
    G.say(b.name.toUpperCase() + ": \"" + G.rng.pick(b.lines) + "\"", 3.5);
    G.emit("boss", { id:e.id, name:G.bossName() });
    r.wave = r.waves.length;
    return;
  }
  G.spawnWave(r, r.waves[0]); r.wave = 1;
};
proto.bossName = function(){
  const key = this.D.theme.boss || "king", n = DG.BOSSES[key].name, loop = Math.floor((this.floor - 1)/DG.FLOORS.length);
  return n + (loop ? " +" + loop : "");
};
proto.setDoors = function(r, open){
  const G = this, p = G.player;
  r.doors.forEach(id=>{
    const d = G.D.doors[id]; d.open = open;
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
  const loop = Math.floor((G.floor - 1)/DG.FLOORS.length);
  const hp = def.hp*sc.hp*(af && af.hp ? af.hp : 1)*(s.boss ? 1 + 0.5*loop : 1)*(s.hpMul || 1);
  const haste = G.curses.indexOf("haste") >= 0 ? 1.2 : 1;
  const e = {
    id:G.nextId++, type:s.type, def, room:r.id, x:s.x, y:s.y, vx:0, vy:0, kx:0, ky:0,
    r:def.radius*(af && af.size ? af.size : 1)*(s.size || 1), hp, maxHp:hp, speed:def.speed*(af && af.speed ? af.speed : 1)*haste, dmg:def.dmg*sc.dmg,
    affix:s.elite || null, boss:!!s.boss, st:{}, ai:{ state:"idle", t:0, cd:0.6 + G.rng.next()*0.8 }, spawn:s.boss ? 1.4 : (s.quick ? 0.3 : 0.8), face:Math.PI/2, flash:0,
    phases:!!def.phases, gen:s.gen || 0
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
  G.chargeActive(1);
  G.trigger("clear", { x:G.player.x, y:G.player.y, depth:0 });
  G.allies.forEach(a=>{ if(a.kind === "tadpole" || a.kind === "wisp") a.life = Math.min(a.life, 1.5); });
  if(r.type === "boss") return;
  const rng = G.rng, c = G.freeSpot(r, r.cxw, r.cyw), x = c.x, y = c.y;
  const roll = rng.next()/G.luck(1);
  if(roll < 0.05 && !G.pickups.length) G.addProp(r, { kind:"chest", x:Math.floor(x), y:Math.floor(y), tier:1 });
  else if(roll < 0.2) G.addPickup("heart", x, y, 20);
  else if(roll < 0.3) G.addPickup("mana", x, y, 40);
  else if(roll < 0.38) G.addPickup("ward", x, y, 1);
  else if(roll < 0.7) G.dropGold(x, y, Math.round(rng.int(4, 8)*(1 + 0.3*(G.floor - 1))));
};
proto.ambush = function(r){
  const G = this, n = 2 + Math.min(3, G.floor), wave = [];
  const types = Object.keys(G.D.theme.enemies).filter(t=> DG.ENEMIES[t].speed > 0);
  for(let i=0;i<n;i++){
    const x = G.rng.range(r.x1 + 1.5, r.x2 - 0.5), y = G.rng.range(r.cyw, r.y2 - 0.5);
    if(G.blocked(Math.floor(x), Math.floor(y), "enemy")) continue;
    wave.push({ type:G.rng.pick(types), x, y, elite:null });
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
  G.beams = [];
  G.portal = { x:r.cxw, y:r.cyw + 2 };
  G.addProp(r, { kind:"pedestal", x:Math.floor(r.cxw), y:Math.floor(r.cyw) - 1, pool:"b" });
  if(G.chance(0.35)) G.addPickup("fly", r.cxw + 2, r.cyw, 1);
  G.dropGold(e.x, e.y, 25 + 10*G.floor);
  G.emit("portal", G.portal);
  G.say(G.floor >= DG.FINAL_FLOOR && !G.endless ? "The Hollow Heart is still. The way out is open." : DG.BOSSES[e.type].name + " is down! A portal opens.", 4);
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
  while(amount > 0){ const v = amount >= 10 ? 5 : 1; this.addPickup("gold", x, y, v); amount -= v; }
};
proto.dropItem = function(x, y, item){ return this.addPickup("item", x, y, 0, item); };
proto.addProp = function(r, pr){ this.initProp(r, pr); r.props.push(pr); this.emit("prop", { prop:pr }); return pr; };

proto.updatePickups = function(dt){
  const G = this, p = G.player, mag = 2.6 + G.mods.magnet;
  G.pickups.forEach(k=>{
    k.t += dt;
    if(Math.abs(k.vx) + Math.abs(k.vy) > 0.01){ G.move(k, k.vx*dt, k.vy*dt, "enemy"); const f = Math.exp(-dt*5); k.vx *= f; k.vy *= f; }
    const d = DG.dist(k.x, k.y, p.x, p.y);
    if((k.kind === "gold" || k.kind === "fly" || k.kind === "flyheal") && d < mag && k.t > 0.3){ const s = 9*dt/Math.max(0.3, d); k.x += (p.x - k.x)*Math.min(1, s); k.y += (p.y - k.y)*Math.min(1, s); }
    if(k.kind === "flyheal" && k.t > 8) k.dead = true;
    if(k.t < 0.3 || d > p.r + k.r + 0.1) return;
    if(k.kind === "gold"){ const v = Math.max(1, Math.round(k.value*(1 + G.mods.gold))); p.gold += v; G.stats.gold += v; k.dead = true; G.emit("coin", { x:k.x, y:k.y, v }); }
    else if(k.kind === "heart" && p.hp < p.maxHp){ G.heal(k.value); k.dead = true; G.emit("pickup", { kind:"heart" }); }
    else if(k.kind === "flyheal"){ G.heal(2); k.dead = true; G.emit("pickup", { kind:"heart" }); }
    else if(k.kind === "mana" && p.mana < p.maxMana){ p.mana = Math.min(p.maxMana, p.mana + k.value); k.dead = true; G.emit("pickup", { kind:"mana" }); }
    else if(k.kind === "ward" && p.wards < DG.PLAYER.maxWards){ G.addWards(k.value); k.dead = true; }
    else if(k.kind === "fly"){ G.meta.flies++; G.stats.flies++; k.dead = true; G.emit("fly", { total:G.meta.flies }); G.say("A golden fly! Gribbus can learn new tricks at frog ponds.", 3.5); }
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
    if(pr.kind === "pedestal" && !pr.taken && pr.offer) consider(pr, d, G.offerText(pr.offer));
    if(pr.kind === "lilypad" && !pr.taken && pr.buff && !r.pondDone) consider(pr, d, "Gribbus sits here: " + DG.FROG_BUFFS[pr.buff].name);
    if(pr.kind === "sign") consider(pr, d - 0.2, "Read sign");
    if(pr.kind === "merchant") consider(pr, d - 0.3, "Talk to Snibbit");
  });
  return best;
};
proto.offerText = function(o){
  const what = o.kind === "item" ? DG.ITEMS[o.id].name : o.kind === "gun" ? o.gun.name : o.name;
  if(o.currency === "gold") return "Buy " + what + " — " + o.price + "g";
  if(o.currency === "hp") return "Take " + what + " — costs " + o.price + " max health";
  return "Take " + what;
};

proto.interact = function(){
  const G = this, p = G.player, tg = G.target();
  if(!tg) return;
  const o = tg.o;
  if(o.portal){ G.emit("descend"); G.descend(); return; }
  if(o.kind === "item"){ G.takeItem(o.item, o); return; }
  if(o.kind === "chest"){
    if(o.locked){ G.say("It's locked. Solve the room's puzzle."); return; }
    o.open = true; G.emit("chest", { id:o.id, x:o.x + 0.5, y:o.y + 0.5 });
    G.chestLoot(o).forEach(it=> it.kind === "itemid" ? G.addProp(G.D.rooms[o.room], { kind:"pedestal", x:o.x, y:o.y + 1, pool:it.pool }) : G.dropItem(o.x + 0.5, o.y + 1, it));
    G.dropGold(o.x + 0.5, o.y + 0.9, G.rng.int(3, 8) + o.tier*3);
    if(G.chance(0.15 + 0.1*o.tier)) G.addPickup(G.rng.pick(["heart", "mana", "ward"]), o.x + 0.5, o.y + 1, 1);
    return;
  }
  if(o.kind === "pedestal"){
    const of = o.offer;
    if(of.currency === "gold" && p.gold < of.price){ G.say(G.rng.pick(DG.LINES.broke)); G.emit("broke"); return; }
    if(of.currency === "hp" && p.maxHp - of.price < 20){ G.say("The altar looks at you, then at your health. It says no."); G.emit("broke"); return; }
    if(of.currency === "gold") p.gold -= of.price;
    if(of.currency === "hp"){ p.altarLoss = (p.altarLoss || 0) + of.price; G.recalc(); G.emit("altar", { x:o.x, y:o.y }); }
    o.taken = true;
    if(of.price) G.emit("buy", { offer:of });
    if(of.kind === "item") G.giveItem(of.id);
    else if(of.kind === "gun") G.takeItem(of.gun, null);
    else if(of.kind === "heal"){ G.heal(of.amount); G.say("Tastes like boots. You feel better."); }
    else if(of.kind === "ward") G.addWards(of.n);
    else if(of.kind === "active") G.giveActive(of.id);
    // a treasure room's choice: the other pedestals sink
    const r = G.D.rooms[o.room];
    if(o.group) r.props.forEach(pr=>{ if(pr !== o && pr.group === o.group && !pr.taken){ pr.taken = true; pr.sunk = true; G.emit("sink", { id:pr.id }); } });
    return;
  }
  if(o.kind === "lilypad"){ DG.Gribbus.choosePad(G, o); return; }
  if(o.kind === "sign"){ G.say(o.text, o.riddle ? 9 : 6); G.emit("read"); return; }
  if(o.kind === "merchant"){ G.say("Snibbit: \"" + G.rng.pick(["Buy something or stop breathing on my stuff.", "That gun? Barely haunted.", "I'd say 'mint condition' but I ate the mint.", "Is that a frog? Keep him off the merchandise."]) + "\"", 3.5); return; }
};

proto.chestLoot = function(c){
  const G = this, rng = G.rng, f = G.floor;
  const gun = o=> L.rollGun(rng, f + (c.tier >= 2 ? 1 : 0), o);
  if(c.tier >= 2) return rng.chance(0.55) ? [{ kind:"itemid", pool:c.tier >= 3 ? "b" : "t" }] : [gun({ minRarity:1, boost:0.6 })];
  const roll = rng.next();
  if(roll < 0.45) return [gun({ boost:0.1 })];
  if(roll < 0.6) return [{ kind:"itemid", pool:"t" }];
  return [];
};

proto.takeItem = function(item, pickup){
  const G = this, p = G.player;
  if(pickup) pickup.dead = true;
  G.pickups = G.pickups.filter(k=> !k.dead);
  if(item.kind === "gun"){
    if(p.guns.length < DG.PLAYER.maxGuns){ p.guns.push(item); p.cur = p.guns.length - 1; }
    else { const old = p.guns[p.cur]; p.guns[p.cur] = item; G.dropItem(p.x, p.y, old); }
    p.reloadT = 0;
    G.checkAscensions();
    G.emit("pickup", { kind:"gun", item }); G.say("Got " + item.name + (item.flavour ? " — " + item.flavour : ""), 3.5);
  } else if(item.kind === "active"){
    if(p.active) G.dropActive(p.active, p.x, p.y);
    p.active = { id:item.id, charge:item.charge === undefined ? DG.ACTIVES[item.id].charge : item.charge, max:DG.ACTIVES[item.id].charge };
    G.emit("pickup", { kind:"active", id:item.id }); G.say(DG.ACTIVES[item.id].name + ": " + DG.ACTIVES[item.id].desc, 3.5);
  } else if(item.kind === "item"){ G.giveItem(item.id); }
};

/* ---- the flow field the enemies walk down, over the room they're in ---- */
proto.updateFlow = function(){
  const G = this, p = G.player, r = G.room;
  if(!r || !r.active){ G.flow = null; return; }
  const tx = Math.floor(p.x), ty = Math.floor(p.y);
  if(G.flow && G.flow.tx === tx && G.flow.ty === ty && G.flow.room === r.id && G.flow.ver === G.D.ver) return;
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
  G.flow = { tx, ty, room:r.id, x0, y0, w, h, dist, ver:G.D.ver };
};
proto.flowDir = function(x, y){
  const F = this.flow; if(!F) return null;
  const tx = Math.floor(x), ty = Math.floor(y);
  const at = (a, b)=> (a < F.x0 || b < F.y0 || a >= F.x0 + F.w || b >= F.y0 + F.h) ? Infinity : F.dist[(b - F.y0)*F.w + (a - F.x0)];
  let best = at(tx, ty), bx = 0, by = 0;
  for(const [dx, dy] of DG.DIRS8){ const d = at(tx + dx, ty + dy); if(d < best){ best = d; bx = dx; by = dy; } }
  if(!bx && !by) return null;
  const cx = tx + bx + 0.5 - x, cy = ty + by + 0.5 - y, l = Math.hypot(cx, cy) || 1;
  return { x:cx/l, y:cy/l };
};

/* ---- traps ---- */
proto.updateTraps = function(dt){
  const G = this, p = G.player;
  const near = t=> Math.abs(t.x - p.x) < 26 && Math.abs(t.y - p.y) < 20;
  G.traps.forEach(t=>{
    const D = DG.TRAPS[t.kind];
    if(t.kind === "banana"){
      if(t.gone) return;
      const onP = Math.abs(p.x - t.x - 0.5) < 0.45 && Math.abs(p.y - t.y - 0.5) < 0.45;
      if(onP && p.blinkT <= 0 && p.slip <= 0 && p.moving){
        if(G.mods.noSlip) return;
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
          if(e.dead || e.spawn > 0 || e.airborne || e.phases || (t.hitT && t.hitT[e.id] > G.t)) return;
          if(Math.abs(e.x - t.x - 0.5) < 0.5 && Math.abs(e.y - t.y - 0.5) < 0.5){ t.hitT = t.hitT || {}; t.hitT[e.id] = G.t + 0.6; G.damageEnemy(e, D.dmg*2, {}); }
        });
      }
    } else if(t.kind === "vent"){
      t.state = ph < D.cycle - D.warn - D.up ? "idle" : ph < D.cycle - D.up ? "warn" : "up";
      if(t.state === "up"){
        if(DG.dist(p.x, p.y, t.x + 0.5, t.y + 0.5) < 0.75) G.hurtPlayer(D.dmg*G.scale.dmg, "vent");
        G.enemies.forEach(e=>{ if(!e.dead && e.spawn <= 0 && DG.dist(e.x, e.y, t.x + 0.5, t.y + 0.5) < 0.8) G.applyBurn(e, 4, 2, false); });
      }
    } else if(t.kind === "darts"){
      const room = G.D.rooms[t.room];
      if(!room.active && G.room !== room) return;
      if((t.last || 0) > ph){
        G.addBullet({ team:"e", x:t.x + 0.5 + t.dir*0.6, y:t.y + 0.5, vx:t.dir*D.speed, vy:0, r:0.12, dmg:D.dmg*G.scale.dmg, life:4, kind:"dart", hurtsEnemies:true });
        G.emit("trap", { kind:"darts", x:t.x + 0.5, y:t.y + 0.5 });
      }
      t.last = ph;
    }
  });
};

})(typeof window !== "undefined" ? window : globalThis);
