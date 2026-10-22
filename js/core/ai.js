/* ------------------------------------------------------------------ *
 *  Enemy brains, and the five bosses.
 *
 *  Every attack has a tell, so a good player can always read it:
 *  grunts wind up, slingers raise the sling, pufflings swell, banshees
 *  draw breath, watchers glare along a red line, tentacles bubble the
 *  floor first, and every boss squats, inhales or blinks before it hits.
 *
 *  Each behaviour is a small state machine over e.ai:
 *    { state, t (time left in state), cd (attack cooldown), ... }
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const AI = DG.AI = {};
const TAU = Math.PI*2;

AI.update = function(G, e, dt){
  if(e.dead) return;
  if(e.spawn > 0){ e.spawn -= dt; return; }
  // the safety net: an enemy never ends up outside its locked room
  const room = G.D.rooms[e.room];
  if(room && room.active && !e.airborne && !G.inRoom(room, e.x, e.y)){
    const s = G.freeSpot(room, e.x, e.y);
    e.x = s.x; e.y = s.y; e.kx = e.ky = 0;
  }
  if(e.decoy && e.ai.popped){ G.emit("decoyPop", { x:e.x, y:e.y, id:e.id }); G.killEnemy(e, {}); return; }
  // knockback first: this is how goblins end up in pits
  if(Math.abs(e.kx) + Math.abs(e.ky) > 0.05){
    G.move(e, e.kx*dt, e.ky*dt, e.phases ? "ghost" : Math.hypot(e.kx, e.ky) > 2.5 ? "flying" : "enemy");
    const f = Math.exp(-dt*9); e.kx *= f; e.ky *= f;
  } else { e.kx = e.ky = 0; }
  if(!e.airborne && !e.phases && !e.big && G.D.at(Math.floor(e.x), Math.floor(e.y)) === DG.TILE.PIT){
    G.emit("fall", { x:e.x, y:e.y, who:"enemy", id:e.id });
    G.killEnemy(e, {}, true);
    return;
  }
  e.vx = 0; e.vy = 0;
  if(e.st.frozen > 0 || e.st.stun > 0) return;
  // confused (Rubber Chicken, Goblin Whistle): stumbles about and clobbers
  // whatever it bumps into, friends included; no attacks on Zippy
  if(e.st.confused > 0 && !e.big && !e.decoy){
    if((e.ai.wanderT || 0) <= G.t){ e.ai.wanderT = G.t + 0.4 + G.rng.next()*0.6; e.ai.wanderA = G.rng.next()*Math.PI*2; }
    if(e.def.speed) walk(G, e, Math.cos(e.ai.wanderA), Math.sin(e.ai.wanderA), 0.7, dt);
    if((e.ai.bonkT || 0) <= G.t){
      const o = G.enemies.find(o=> o !== e && !o.dead && o.spawn <= 0 && DG.dist(o.x, o.y, e.x, e.y) < o.r + e.r + 0.25);
      if(o){ e.ai.bonkT = G.t + 0.6; G.damageEnemy(o, Math.max(e.dmg*1.5, G.payloadPower()*0.6), { ax:o.x - e.x, ay:o.y - e.y, knock:2, depth:2 }); G.emit("bonkFriend", { x:o.x, y:o.y }); }
    }
    return;
  }
  e.ai.cd -= dt;
  // bumping into Zippy hurts, for the squishy and the spooky
  const p = G.player;
  if((e.def.ai === "blob" || e.def.ai === "ghost" || e.big) && !e.untargetable && !e.airborne && DG.dist(e.x, e.y, p.x, p.y) < e.r + p.r && (e.ai.touch || 0) <= G.t){
    e.ai.touch = G.t + 0.9; G.hurtPlayer(e.dmg*0.6, e.type);
  }
  const B = (e.lair && LAIR[e.lair]) || BEHAVIOUR[e.def.ai] || BEHAVIOUR.melee;
  B(G, e, dt, p);
};

/* ---- shared moves ---- */
function speedOf(e){ return e.speed*(e.st.chill > 0 ? DG.STATUS.chill.slow : 1); }
function walk(G, e, dx, dy, mul, dt){
  const l = Math.hypot(dx, dy); if(l < 0.001) return false;
  const s = speedOf(e)*(mul || 1);
  e.vx = dx/l*s; e.vy = dy/l*s;
  e.face = Math.atan2(dy, dx);
  return G.move(e, e.vx*dt, e.vy*dt, e.phases ? "ghost" : "enemy");
}
function approach(G, e, p, dt, mul){
  if(e.phases || (G.los(e.x, e.y, p.x, p.y) && clearPath(G, e, p))) return walk(G, e, p.x - e.x, p.y - e.y, mul, dt);
  const f = G.flowDir(e.x, e.y);
  if(f) return walk(G, e, f.x, f.y, mul, dt);
  return walk(G, e, p.x - e.x, p.y - e.y, mul, dt);
}
function clearPath(G, e, p){
  const d = DG.dist(e.x, e.y, p.x, p.y), n = Math.ceil(d/0.4);
  for(let i=1;i<n;i++){ const t = i/n; if(G.blocked(Math.floor(e.x + (p.x - e.x)*t), Math.floor(e.y + (p.y - e.y)*t), "enemy")) return false; }
  return true;
}
function keepAway(G, e, p, dt, keep){
  const d = DG.dist(e.x, e.y, p.x, p.y), los = e.phases || G.los(e.x, e.y, p.x, p.y);
  if(!los || d > keep[1]) return approach(G, e, p, dt);
  if(d < keep[0]){
    if(walk(G, e, e.x - p.x, e.y - p.y, 0.9, dt)) e.ai.strafe = -(e.ai.strafe || 1);
    return;
  }
  e.ai.st = (e.ai.st || 0) - dt;
  if(e.ai.st <= 0){ e.ai.st = 1 + G.rng.next()*1.5; e.ai.strafe = G.rng.sign(); }
  const a = Math.atan2(e.y - p.y, e.x - p.x) + (e.ai.strafe || 1)*Math.PI/2;
  if(walk(G, e, Math.cos(a), Math.sin(a), 0.6, dt)) e.ai.strafe = -(e.ai.strafe || 1);
  e.face = Math.atan2(p.y - e.y, p.x - e.x);
}
function tell(G, e, kind, t, extra){
  e.ai.state = "tell"; e.ai.t = t; e.ai.tell = kind;
  G.emit("tell", Object.assign({ id:e.id, kind, x:e.x, y:e.y, t }, extra || {}));
}
function shoot(G, e, a, speed, n, spreadDeg, kind, extra){
  for(let i=0;i<n;i++){
    const o = a + (n > 1 ? (i/(n - 1) - 0.5)*spreadDeg*Math.PI/180 : 0);
    G.addBullet(Object.assign({ team:"e", x:e.x + Math.cos(o)*e.r, y:e.y + Math.sin(o)*e.r, vx:Math.cos(o)*speed, vy:Math.sin(o)*speed, r:0.18, dmg:e.dmg, life:4, kind }, extra || {}));
  }
  G.emit("eshoot", { id:e.id, x:e.x, y:e.y, kind });
}
function bark(G, e, chance){
  if(e.def.lines && G.rng.chance(chance || 0.08)) G.emit("bark", { id:e.id, x:e.x, y:e.y, text:G.rng.pick(e.def.lines) });
}
function aimAt(e, p){ return Math.atan2(p.y - e.y, p.x - e.x); }
/* a floor tile near (x, y) in e's room */
function spotNear(G, e, x, y, spread){
  const r = G.D.rooms[e.room];
  for(let i=0;i<12;i++){
    const a = G.rng.next()*TAU, d = G.rng.next()*spread;
    const tx = x + Math.cos(a)*d, ty = y + Math.sin(a)*d;
    if(G.inRoom(r, tx, ty) && G.D.at(Math.floor(tx), Math.floor(ty)) === DG.TILE.FLOOR) return { x:Math.floor(tx) + 0.5, y:Math.floor(ty) + 0.5 };
  }
  return G.freeSpot(r, x, y);
}
/* a telegraphed slam: a mark on the floor, then it goes off */
function slam(G, x, y, r, dmg, delay, kind){
  G.marks.push({ kind:kind || "slam", x, y, r, t:delay, max:delay });
  G.pending.push({ t:delay, fn:()=>{ G.explode(x, y, r, dmg, "e", { why:kind || "slam" }); } });
}

/* a stab or a lunge: grunts, sneaks, shroomkin */
function melee(G, e, dt, p, o){
  const A = e.ai, d = DG.dist(e.x, e.y, p.x, p.y);
  if(A.state === "tell"){ A.t -= dt; e.face = A.a; if(A.t <= 0){ A.state = "lunge"; A.t = 0.2; A.hit = false; } return; }
  if(A.state === "lunge"){
    A.t -= dt;
    walk(G, e, Math.cos(A.a), Math.sin(A.a), o.lunge/speedOf(e)*(e.st.chill > 0 ? DG.STATUS.chill.slow : 1), dt);
    if(!A.hit && DG.dist(e.x, e.y, p.x, p.y) < e.r + p.r + 0.2){ A.hit = true; G.hurtPlayer(e.dmg, e.type); }
    if(A.t <= 0){ A.state = "recover"; A.t = 0.4; A.cd = o.cd; }
    return;
  }
  if(A.state === "recover"){ A.t -= dt; if(A.t <= 0) A.state = "chase"; return; }
  A.state = "chase";
  if(d < o.reach && A.cd <= 0 && G.los(e.x, e.y, p.x, p.y)){
    A.a = aimAt(e, p);
    tell(G, e, "stab", o.tell, { a:A.a });
    bark(G, e, 0.12);
    return;
  }
  if(o.target){ const t = o.target(); walk(G, e, t.x - e.x, t.y - e.y, 1, dt); }
  else approach(G, e, p, dt);
}
/* aim, tell, fire: slingers, skeletons, toadstools */
function ranged(G, e, dt, p, opts){
  const A = e.ai, S = e.shot || e.def.shot;
  if(A.state === "tell"){
    A.t -= dt; e.face = aimAt(e, p);
    if(A.t <= 0){ A.state = "move"; A.cd = S.cd*(0.8 + G.rng.next()*0.4); shoot(G, e, e.face, S.speed, S.n, S.spread || 0, S.kind || "rock", opts && opts.extra); }
    return;
  }
  A.state = "move";
  const d = DG.dist(e.x, e.y, p.x, p.y);
  if(A.cd <= 0 && d < 12 && (e.phases || G.los(e.x, e.y, p.x, p.y))){ tell(G, e, "aim", S.tell); bark(G, e, 0.06); return; }
  if(e.def.speed === 0) { e.face = aimAt(e, p); return; }
  keepAway(G, e, p, dt, e.def.keep || [4, 7]);
}

const BEHAVIOUR = {
  melee(G, e, dt, p){ melee(G, e, dt, p, { reach:1.6, tell:0.38, lunge:9, cd:1.0 }); },

  sneak(G, e, dt, p){
    const A = e.ai;
    e.hidden = A.state !== "tell" && A.state !== "lunge" && A.state !== "recover";
    const behind = ()=>{
      const a = p.aim + Math.PI + Math.sin(G.t*0.7 + e.id)*0.6, r = 1.8;
      const t = { x:p.x + Math.cos(a)*r, y:p.y + Math.sin(a)*r };
      if(G.blocked(Math.floor(t.x), Math.floor(t.y), "enemy") || !G.los(e.x, e.y, t.x, t.y)){ const f = G.flowDir(e.x, e.y); return f ? { x:e.x + f.x, y:e.y + f.y } : p; }
      return t;
    };
    melee(G, e, dt, p, { reach:2.3, tell:0.32, lunge:11, cd:1.6, target:behind });
  },

  ranged(G, e, dt, p){ ranged(G, e, dt, p); },

  bomber(G, e, dt, p){
    const A = e.ai, B = e.def.bomb;
    if(e.phases){ A.vis = (A.vis || 0) + dt; e.hidden = Math.sin(A.vis*1.3) < -0.5 && A.state !== "tell"; }
    if(A.state === "tell"){
      A.t -= dt; e.face = aimAt(e, p);
      if(A.t <= 0){
        A.state = "move"; A.cd = B.cd*(0.8 + G.rng.next()*0.4);
        const tx = p.x + (G.rng.next() - 0.5)*1.2, ty = p.y + (G.rng.next() - 0.5)*1.2;
        G.bombs.push({ id:G.nextId++, x:e.x, y:e.y, tx, ty, t:0, flight:B.junk ? 0.6 : 0.75, fuse:B.fuse, r:B.radius, dmg:e.dmg, junk:!!B.junk, team:"e" });
        G.emit("throw", { id:e.id, x:e.x, y:e.y, tx, ty, junk:!!B.junk });
      }
      return;
    }
    A.state = "move";
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(A.cd <= 0 && d < 10 && (e.phases || G.los(e.x, e.y, p.x, p.y))){ tell(G, e, "throw", 0.4); bark(G, e, 0.2); return; }
    keepAway(G, e, p, dt, e.def.keep);
  },

  shaman(G, e, dt, p){
    const A = e.ai, H = e.def.heal, S = e.def.shot;
    A.hcd = (A.hcd === undefined ? 2 : A.hcd) - dt;
    if(A.state === "tell"){
      A.t -= dt;
      if(A.t <= 0){
        A.state = "move"; A.cd = S.cd*(0.8 + G.rng.next()*0.4);
        if(A.tell === "heal"){
          const o = G.enemies.find(x=> x.id === A.target);
          if(o && !o.dead){ o.hp = Math.min(o.maxHp, o.hp + H.amt*G.scale.hp); G.emit("healBeam", { x1:e.x, y1:e.y, x2:o.x, y2:o.y, id:o.id }); }
        } else shoot(G, e, aimAt(e, p), S.speed, S.n, S.spread, "hex", { slow:1.4 });
      }
      return;
    }
    A.state = "move";
    if(A.hcd <= 0){
      let best = null, bf = 0.85;
      G.enemies.forEach(o=>{ if(o === e || o.dead || o.spawn > 0 || o.room !== e.room) return; const f = o.hp/o.maxHp; if(f < bf && DG.dist(e.x, e.y, o.x, o.y) < H.range){ bf = f; best = o; } });
      if(best){ A.hcd = H.cd; A.target = best.id; tell(G, e, "heal", 0.5, { target:best.id }); bark(G, e, 0.4); return; }
    }
    if(A.cd <= 0 && G.los(e.x, e.y, p.x, p.y)){ tell(G, e, "hex", S.tell); return; }
    keepAway(G, e, p, dt, e.def.keep);
  },

  brute(G, e, dt, p){
    const A = e.ai, C = e.def.charge;
    if(A.state === "tell"){ A.t -= dt; e.face = A.a; if(A.t <= 0){ A.state = "charge"; A.t = C.time; A.hit = false; } return; }
    if(A.state === "charge"){
      A.t -= dt;
      const wall = walk(G, e, Math.cos(A.a), Math.sin(A.a), C.speed/speedOf(e), dt);
      if(!A.hit && DG.dist(e.x, e.y, p.x, p.y) < e.r + p.r + 0.15){
        A.hit = true; G.hurtPlayer(e.dmg, "brute");
        p.vx += Math.cos(A.a)*12; p.vy += Math.sin(A.a)*12;
      }
      if(wall){
        A.state = "recover"; A.t = C.stun; A.cd = C.cd; e.st.stun = C.stun;
        G.emit("dizzy", { id:e.id, x:e.x, y:e.y, t:C.stun }); G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"ow" });
        // a wall-smash knocks things loose
        G.breakablesNear(e.x + Math.cos(A.a)*0.8, e.y + Math.sin(A.a)*0.8, 0.9);
        return;
      }
      if(A.t <= 0){ A.state = "recover"; A.t = 0.6; A.cd = C.cd; }
      return;
    }
    if(A.state === "recover"){ A.t -= dt; if(A.t <= 0) A.state = "chase"; return; }
    A.state = "chase";
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(A.cd <= 0 && d < 9 && d > 2 && G.los(e.x, e.y, p.x, p.y)){
      A.a = aimAt(e, p);
      tell(G, e, "charge", C.tell, { a:A.a }); bark(G, e, 0.3);
      return;
    }
    if(d < e.r + p.r + 0.1 && (A.shove || 0) <= G.t){ A.shove = G.t + 1; G.hurtPlayer(e.dmg*0.5, "brute"); }
    approach(G, e, p, dt);
  },

  /* ---- shroom folk ---- */
  puffling(G, e, dt, p){
    const A = e.ai;
    if(A.state === "tell"){
      A.t -= dt; e.swell = 1 - A.t/0.55;
      if(A.t <= 0){
        // POOF: a spore cloud, and a little hurt for anyone close
        G.addHazard({ kind:"spores", x:e.x, y:e.y, r:1.5, t:2.6, every:0.5, dmg:e.dmg*0.45, team:"e" });
        if(DG.dist(e.x, e.y, p.x, p.y) < 1.5 + p.r) G.hurtPlayer(e.dmg, "puffling");
        G.emit("poof", { x:e.x, y:e.y });
        G.killEnemy(e, {});
      }
      return;
    }
    if(DG.dist(e.x, e.y, p.x, p.y) < 1.4){ tell(G, e, "swell", 0.55); bark(G, e, 0.3); return; }
    approach(G, e, p, dt);
  },
  toadstool(G, e, dt, p){
    const A = e.ai, S = e.def.shot;
    A.n = A.n || 0;
    if(A.state === "tell"){
      A.t -= dt; e.face = aimAt(e, p);
      if(A.t <= 0){
        A.state = "idle"; A.cd = S.cd*(0.8 + G.rng.next()*0.4); A.n++;
        if(A.n % 3 === 0){
          // every third: lob a cloud of spores where Zippy stands
          G.bombs.push({ id:G.nextId++, x:e.x, y:e.y, tx:p.x, ty:p.y, t:0, flight:0.8, fuse:0, r:0.1, dmg:0, team:"e", spore:true, junk:false, cb:()=> G.addHazard({ kind:"spores", x:p.x, y:p.y, r:1.3, t:3, every:0.5, dmg:e.dmg*0.4, team:"e" }) });
        } else shoot(G, e, e.face, S.speed, S.n, S.spread, "spore");
      }
      return;
    }
    e.face = aimAt(e, p);
    if(A.cd <= 0 && DG.dist(e.x, e.y, p.x, p.y) < 11 && G.los(e.x, e.y, p.x, p.y)) tell(G, e, "puff", S.tell);
  },

  /* ---- the haunted ---- */
  ghost(G, e, dt, p){
    const A = e.ai, S = e.def.shot;
    A.ph = (A.ph || G.rng.next()*6) + dt;
    // fades in and out: while faded it can't be hit (and can't hurt)
    const fade = Math.sin(A.ph*0.9) < -0.65;
    e.untargetable = fade; e.hidden = fade;
    if(fade){ walk(G, e, p.x - e.x + Math.sin(A.ph*2)*2, p.y - e.y + Math.cos(A.ph*2)*2, 0.6, dt); return; }
    if(A.state === "tell"){ A.t -= dt; if(A.t <= 0){ A.state = "drift"; A.cd = S.cd*(0.8 + G.rng.next()*0.4); shoot(G, e, aimAt(e, p), S.speed, 1, 0, "ecto", { r:0.24 }); } return; }
    A.state = "drift";
    if(A.cd <= 0 && DG.dist(e.x, e.y, p.x, p.y) < 9){ tell(G, e, "boo", S.tell); bark(G, e, 0.1); return; }
    const a = aimAt(e, p) + Math.sin(A.ph*1.7)*0.9;
    walk(G, e, Math.cos(a), Math.sin(a), 1, dt);
  },
  banshee(G, e, dt, p){
    const A = e.ai, W = e.def.wail;
    if(A.state === "tell"){ A.t -= dt; e.face = A.a; if(A.t <= 0){ A.state = "wail"; A.t = 0.6; A.k = 0; } return; }
    if(A.state === "wail"){
      // the scream: a fan of slow notes, swept across a cone
      A.t -= dt;
      const want = Math.floor((1 - A.t/0.6)*W.n);
      while(A.k < want && A.k < W.n){
        const o = A.a + (A.k/(W.n - 1) - 0.5)*W.arc*Math.PI/180;
        G.addBullet({ team:"e", x:e.x, y:e.y, vx:Math.cos(o)*W.speed, vy:Math.sin(o)*W.speed, r:0.2, dmg:e.dmg, life:3, kind:"wail", slow:1.2 });
        A.k++;
      }
      if(A.t <= 0){ A.state = "float"; A.cd = W.cd*(0.8 + G.rng.next()*0.4); }
      return;
    }
    A.state = "float";
    if(A.cd <= 0 && DG.dist(e.x, e.y, p.x, p.y) < 9){ A.a = aimAt(e, p); tell(G, e, "inhale", W.tell, { a:A.a }); G.emit("wailTell", { id:e.id }); return; }
    keepAway(G, e, p, dt, e.def.keep);
  },

  /* ---- the weird ---- */
  watcher(G, e, dt, p){
    const A = e.ai, Z = e.def.laser;
    if(A.state === "glare"){ A.t -= dt; if(A.beam) e.face = A.beam.a; if(A.t <= 0) A.state = "drift"; return; }
    A.state = "drift";
    if(A.cd <= 0 && DG.dist(e.x, e.y, p.x, p.y) < 13 && G.los(e.x, e.y, p.x, p.y)){
      A.cd = Z.cd*(0.8 + G.rng.next()*0.4);
      A.state = "glare"; A.t = Z.tell + Z.time;
      A.beam = G.addBeam({ owner:e.id, x:e.x, y:e.y, a:aimAt(e, p), tell:Z.tell, time:Z.time, dmg:e.dmg, w:0.35, max:Z.len });
      G.emit("tell", { id:e.id, kind:"glare", x:e.x, y:e.y, t:Z.tell });
      return;
    }
    keepAway(G, e, p, dt, e.def.keep);
  },
  blob(G, e, dt, p){
    const A = e.ai;
    if(A.state === "hop"){
      A.t -= dt;
      walk(G, e, Math.cos(A.a), Math.sin(A.a), 2.4, dt);
      e.hop = Math.sin((1 - A.t/0.4)*Math.PI)*0.6;
      if(A.t <= 0){ e.hop = 0; A.state = "squat"; A.t = 0.5 + G.rng.next()*0.4; if(G.rng.chance(0.4)) G.addHazard({ kind:"slime", x:e.x, y:e.y, r:0.8*e.r/0.5, t:4, team:"e" }); G.emit("splat", { x:e.x, y:e.y }); }
      return;
    }
    A.t = (A.t || 0) - dt;
    if(A.t <= 0){ A.state = "hop"; A.t = 0.4; A.a = aimAt(e, p) + (G.rng.next() - 0.5)*0.6; const f = !G.los(e.x, e.y, p.x, p.y) && G.flowDir(e.x, e.y); if(f) A.a = Math.atan2(f.y, f.x); }
  },
  tentacle(G, e, dt, p){
    // burrows, bubbles up under Zippy, slams, sways about for a bit, burrows again
    const A = e.ai, S = e.def.slam;
    if(!A.state || A.state === "idle"){ A.state = "up"; A.t = 1.5; }
    if(A.state === "under"){
      e.untargetable = true; e.hidden = true;
      A.t -= dt;
      if(A.t <= 0){
        const s = spotNear(G, e, p.x, p.y, 1.2);
        e.x = s.x; e.y = s.y;
        A.state = "rise"; A.t = S.tell;
        G.marks.push({ kind:"tentacle", x:e.x, y:e.y, r:S.r, t:S.tell, max:S.tell });
        G.emit("tell", { id:e.id, kind:"bubble", x:e.x, y:e.y, t:S.tell });
      }
      return;
    }
    if(A.state === "rise"){
      A.t -= dt;
      if(A.t <= 0){
        e.untargetable = false; e.hidden = false;
        if(DG.dist(e.x, e.y, p.x, p.y) < S.r + p.r) G.hurtPlayer(e.dmg, "tentacle");
        G.emit("emerge", { id:e.id, x:e.x, y:e.y });
        A.state = "up"; A.t = 2.4;
      }
      return;
    }
    // up: swipe at anything close
    e.untargetable = false; e.hidden = false;
    A.t -= dt; e.face = aimAt(e, p);
    if(DG.dist(e.x, e.y, p.x, p.y) < 1.5 && A.cd <= 0){ A.cd = 1.2; slam(G, e.x + Math.cos(e.face)*0.9, e.y + Math.sin(e.face)*0.9, 0.9, e.dmg*0.8, 0.45, "swipe"); G.emit("tell", { id:e.id, kind:"swipe", x:e.x, y:e.y, t:0.45 }); }
    if(A.t <= 0){ A.state = "under"; A.t = S.cd; G.emit("burrow", { id:e.id, x:e.x, y:e.y }); }
  },

  /* ================================================================== *
   *  BOSSES
   * ================================================================== */
  /* ---- Grubnok the Goblin King ---- */
  king(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(rage && !A.raged){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("GRUBNOK: \"NOW I'M ANGRY\"", 2.5); }
    const d = DG.dist(e.x, e.y, p.x, p.y);
    switch(A.state){
      case "spray":
        A.t -= dt;
        if(A.t <= 0){
          G.ring(e.x, e.y, rage ? 18 : 14, rage ? 5.8 : 5, e.dmg*0.7, A.n*0.37 + G.t*0.1, "orb");
          G.emit("eshoot", { id:e.id, x:e.x, y:e.y, kind:"ring" });
          A.n++; A.t = 0.45;
          if(A.n >= (rage ? 4 : 3)) A.state = "walk";
        }
        return;
      case "spit":
        A.t -= dt;
        if(A.t <= 0){ shoot(G, e, aimAt(e, p), 8, rage ? 7 : 5, rage ? 50 : 40, "orb", { r:0.22, dmg:e.dmg*0.7 }); A.n++; A.t = 0.3; if(A.n >= 3) A.state = "walk"; }
        return;
      case "squat":
        A.t -= dt;
        if(A.t <= 0){ A.state = "air"; A.t = 0.9; e.airborne = true; A.fx = e.x; A.fy = e.y; A.tx = p.x; A.ty = p.y; G.marks.push({ kind:"flop", x:p.x, y:p.y, r:2.5, t:0.9, max:0.9 }); G.emit("jump", { id:e.id }); }
        return;
      case "air": {
        A.t -= dt;
        const k = 1 - Math.max(0, A.t)/0.9;
        e.x = A.fx + (A.tx - A.fx)*k; e.y = A.fy + (A.ty - A.fy)*k; e.hop = Math.sin(k*Math.PI)*4;
        if(A.t <= 0){
          e.airborne = false; e.hop = 0;
          if(G.blocked(Math.floor(e.x), Math.floor(e.y), "enemy")){ e.x = A.fx; e.y = A.fy; }
          G.explode(e.x, e.y, 2.5, e.dmg*1.2, "e", { skip:e.id, why:"king" });
          G.ring(e.x, e.y, rage ? 16 : 12, 4.5, e.dmg*0.6, G.rng.next(), "orb");
          G.emit("land", { id:e.id, x:e.x, y:e.y });
          A.state = "walk"; A.cd = rage ? 0.9 : 1.4;
        }
        return;
      }
      case "summon":
        A.t -= dt;
        if(A.t <= 0){ summon(G, e, rage ? 3 : 2, ["grunt", "grunt", G.floor >= 2 ? "slinger" : "grunt"]); A.state = "walk"; }
        return;
    }
    A.state = "walk";
    if(d > 3) approach(G, e, p, dt, 1); else e.face = aimAt(e, p);
    if(A.cd > 0) return;
    const adds = G.enemies.filter(o=> o.room === e.room && o !== e && !o.dead).length;
    const order = ["spray", "flop", "spit", adds < 4 ? "summon" : "spray"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.n = 0; A.cd = rage ? 1.1 : 1.7;
    if(pick === "spray"){ tell(G, e, "spray", 0.5); A.state = "spray"; A.t = 0.5; }
    else if(pick === "spit"){ tell(G, e, "spit", 0.45); A.state = "spit"; A.t = 0.45; }
    else if(pick === "flop"){ tell(G, e, "squat", 0.6); A.state = "squat"; A.t = 0.6; }
    else { tell(G, e, "summon", 0.8); A.state = "summon"; A.t = 0.8; G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"LADS! GET 'IM!" }); }
  },

  /* ---- The Morel Matriarch: spore storms, a ring of mushrooms that hems you in, her children ---- */
  matriarch(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(rage && !A.raged){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("MATRIARCH: \"You're making me SPORE-ADIC.\"", 2.5); }
    switch(A.state){
      case "storm":
        A.t -= dt;
        if(A.t <= 0){ G.ring(e.x, e.y, rage ? 14 : 10, 3.6, e.dmg*0.6, A.n*0.13, "spore"); A.n++; A.t = 0.32; if(A.n >= (rage ? 7 : 5)) A.state = "walk"; }
        return;
      case "spin":
        A.t -= dt; A.spinA = (A.spinA || 0) + dt*(rage ? 3.2 : 2.4);
        A.fire = (A.fire || 0) - dt;
        if(A.fire <= 0){ A.fire = 0.07; for(let k=0;k<(rage ? 3 : 2);k++){ const a = A.spinA + k*TAU/(rage ? 3 : 2); G.addBullet({ team:"e", x:e.x, y:e.y, vx:Math.cos(a)*6.5, vy:Math.sin(a)*6.5, r:0.18, dmg:e.dmg*0.55, life:4, kind:"spore" }); } }
        if(A.t <= 0) A.state = "walk";
        return;
      case "ringcast":
        A.t -= dt;
        if(A.t <= 0){
          // mushrooms burst up in a ring around Zippy: don't be inside it when they do
          const cx = p.x, cy = p.y, n = rage ? 12 : 9, R = 2.8;
          for(let k=0;k<n;k++){ const a = k/n*TAU; slam(G, cx + Math.cos(a)*R, cy + Math.sin(a)*R, 0.75, e.dmg*0.9, 0.9, "shroomring"); }
          G.pending.push({ t:0.9, fn:()=>{ for(let k=0;k<n;k++){ const a = k/n*TAU; G.addHazard({ kind:"spores", x:cx + Math.cos(a)*R, y:cy + Math.sin(a)*R, r:0.7, t:3.5, every:0.4, dmg:e.dmg*0.35, team:"e" }); } } });
          A.state = "walk";
        }
        return;
      case "children":
        A.t -= dt;
        if(A.t <= 0){ summon(G, e, rage ? 4 : 3, ["puffling", "puffling", "shroomkin", "puffling"]); A.state = "walk"; }
        return;
    }
    A.state = "walk";
    if(DG.dist(e.x, e.y, p.x, p.y) > 4) approach(G, e, p, dt, 1);
    if(A.cd > 0) return;
    const adds = G.enemies.filter(o=> o.room === e.room && o !== e && !o.dead).length;
    const order = ["storm", "ringcast", "spin", adds < 5 ? "children" : "storm"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.n = 0; A.cd = rage ? 1.3 : 2;
    const tl = { storm:0.6, ringcast:0.5, spin:0.7, children:0.9 }[pick];
    tell(G, e, pick, tl); A.state = pick; A.t = pick === "spin" ? 2.6 + tl : tl;
    if(pick === "children") G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"Come, my darlings!" });
  },

  /* ---- The Hollow Wizard (the Kiln, the First Flame ending): Zippy's master,
     hollowed by the dark. Hex volleys, a blink and a ring, falling fire,
     and in his rage the dead come when he calls ---- */
  hollow(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(rage && !A.raged){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("THE HOLLOW WIZARD: \"I WAS YOU, ONCE. YOU WILL BE ME.\"", 3); }
    switch(A.state){
      case "volley":
        A.t -= dt; A.fire = (A.fire || 0) - dt;
        if(A.fire <= 0 && A.n < (rage ? 5 : 3)){ A.fire = 0.38; A.n++; shoot(G, e, aimAt(e, p), rage ? 8 : 7, rage ? 7 : 5, 34, "hex", { dmg:e.dmg*0.55 }); }
        if(A.t <= 0) A.state = "walk";
        return;
      case "blink":
        A.t -= dt; e.untargetable = true; e.hidden = true;
        if(A.t <= 0){
          const s = spotNear(G, e, p.x, p.y, 4.5);
          e.x = s.x; e.y = s.y; e.untargetable = false; e.hidden = false;
          G.ring(e.x, e.y, rage ? 18 : 12, 5, e.dmg*0.5, G.rng.next(), "hex");
          G.emit("appear", { id:e.id, x:e.x, y:e.y });
          A.state = "walk";
        }
        return;
      case "rain":
        A.t -= dt;
        if(A.t <= 0){
          for(let k=0;k<(rage ? 10 : 7);k++){ const s = spotNear(G, e, p.x, p.y, 5); slam(G, s.x, s.y, 1, e.dmg*0.9, 0.8 + k*0.1, "meteor"); }
          A.state = "walk";
        }
        return;
      case "summon":
        A.t -= dt;
        if(A.t <= 0){
          const r = G.D.rooms[e.room];
          for(let k=0;k<2;k++){ const s = spotNear(G, e, e.x, e.y, 4); const g = G.spawnEnemy(r, { type:G.rng.pick(["ghost", "skeleton"]), x:s.x, y:s.y }); g.spawn = 0.6; }
          G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"Rise. Serve." });
          A.state = "walk";
        }
        return;
    }
    A.state = "walk";
    A.ph = (A.ph || 0) + dt;
    const a = aimAt(e, p) + Math.PI/2*Math.sin(A.ph*0.7);
    if(DG.dist(e.x, e.y, p.x, p.y) > 3.5) walk(G, e, Math.cos(a), Math.sin(a), 1, dt); else e.face = aimAt(e, p);
    if(A.cd > 0) return;
    const minions = G.enemies.filter(o=> !o.dead && !o.boss && o.room === e.room).length;
    const order = ["volley", "blink", "rain", rage && minions < 3 ? "summon" : "volley"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.cd = rage ? 1.3 : 1.9; A.n = 0; A.fire = 0;
    const tl = { volley:0.6, blink:0.4, rain:0.7, summon:0.8 }[pick];
    tell(G, e, pick, tl); A.state = pick; A.t = (pick === "volley" ? 1.9 : pick === "blink" ? 0.7 : 0) + tl;
    if(pick === "blink"){ e.untargetable = true; e.hidden = true; }
  },

  /* ---- The Weeping Bride: copies, a wail that sweeps, tears from above, she vanishes ---- */
  bride(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(e.decoy){ e.life = (e.life || 9) - dt; if(e.life <= 0){ e.ai.popped = true; return; } }
    if(rage && !A.raged && !e.decoy){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("THE BRIDE: \"WHY WON'T YOU STAY\"", 2.5); }
    switch(A.state){
      case "sweep": {
        A.t -= dt;
        const k = 1 - A.t/1.4, a = A.a0 + (k - 0.5)*Math.PI*(rage ? 1.3 : 1);
        A.fire = (A.fire || 0) - dt;
        if(A.fire <= 0){ A.fire = 0.05; G.addBullet({ team:"e", x:e.x, y:e.y, vx:Math.cos(a)*7, vy:Math.sin(a)*7, r:0.19, dmg:e.dmg*(e.decoy ? 0.4 : 0.6), life:3.5, kind:"wail" }); }
        if(A.t <= 0) A.state = "float";
        return;
      }
      case "tears":
        A.t -= dt;
        if(A.t <= 0){
          for(let k=0;k<(rage ? 9 : 6);k++){ const s = spotNear(G, e, p.x, p.y, 4.5); slam(G, s.x, s.y, 0.9, e.dmg*0.8, 0.9 + k*0.12, "tear"); }
          A.state = "float";
        }
        return;
      case "vanish":
        A.t -= dt; e.untargetable = true; e.hidden = true;
        if(A.t <= 0){
          const r = G.D.rooms[e.room], a = G.rng.next()*TAU;
          const s = G.freeSpot(r, r.cxw + Math.cos(a)*(r.x2 - r.x1)*0.35, r.cyw + Math.sin(a)*(r.y2 - r.y1)*0.35);
          e.x = s.x; e.y = s.y; e.untargetable = false; e.hidden = false;
          G.ring(e.x, e.y, rage ? 16 : 12, 4.8, e.dmg*0.55, G.rng.next(), "wail");
          G.emit("appear", { id:e.id, x:e.x, y:e.y });
          A.state = "float";
        }
        return;
      case "mirror":
        A.t -= dt;
        if(A.t <= 0){
          const r = G.D.rooms[e.room];
          for(let k=0;k<(rage ? 3 : 2);k++){
            const s = spotNear(G, e, e.x, e.y, 5);
            const d = G.spawnEnemy(r, { type:"bride", x:s.x, y:s.y, quick:true }, DG.BOSSES.bride);
            d.decoy = true; d.hp = d.maxHp = 1; d.life = 9; d.ai.cd = 1 + k*0.5;
          }
          G.emit("mirror", { id:e.id });
          A.state = "float";
        }
        return;
    }
    A.state = "float";
    A.ph = (A.ph || 0) + dt;
    const a = aimAt(e, p) + Math.PI/2*Math.sin(A.ph*0.8);
    if(DG.dist(e.x, e.y, p.x, p.y) > 4) walk(G, e, Math.cos(a), Math.sin(a), 1, dt); else e.face = aimAt(e, p);
    if(A.cd > 0) return;
    const copies = G.enemies.filter(o=> o.decoy && !o.dead && o.room === e.room).length;
    const order = e.decoy ? ["sweep", "tears"] : ["sweep", "vanish", "tears", copies ? "sweep" : "mirror"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.cd = (rage ? 1.2 : 1.8)*(e.decoy ? 1.6 : 1);
    const tl = { sweep:0.7, vanish:0.4, tears:0.5, mirror:0.8 }[pick];
    tell(G, e, pick, tl); A.state = pick; A.t = pick === "sweep" ? 1.4 + tl : pick === "vanish" ? 0.9 + tl : tl;
    A.a0 = aimAt(e, p);
    if(pick === "vanish"){ e.untargetable = true; e.hidden = true; }
  },

  /* ---- The Eye Below: sweeping lasers, tentacles, blinks shut ---- */
  eye(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(rage && !A.raged){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("THE EYE: \"I SEE EVERYTHING NOW\"", 2.5); }
    e.face = aimAt(e, p);
    switch(A.state){
      case "lasers":
        A.t -= dt; if(A.t <= 0) A.state = "stare";
        return;
      case "tentacles":
        A.t -= dt;
        if(A.t <= 0){ for(let k=0;k<(rage ? 6 : 4);k++){ const s = spotNear(G, e, p.x, p.y, 3); slam(G, s.x, s.y, 1.1, e.dmg, 0.85 + k*0.2, "tentacle"); } A.state = "stare"; }
        return;
      case "blink":
        A.t -= dt;
        A.fire = (A.fire || 0) - dt;
        if(A.fire <= 0){ A.fire = 0.5; G.ring(e.x, e.y, rage ? 14 : 10, 4.2, e.dmg*0.5, G.rng.next(), "tear"); }
        if(A.t <= 0){ e.invuln = false; A.state = "stare"; G.emit("open", { id:e.id }); }
        return;
      case "gaze":
        A.t -= dt; A.fire = (A.fire || 0) - dt;
        if(A.fire <= 0){ A.fire = rage ? 0.12 : 0.18; shoot(G, e, aimAt(e, p) + (G.rng.next() - 0.5)*0.25, 9, 1, 0, "orb", { dmg:e.dmg*0.5 }); }
        if(A.t <= 0) A.state = "stare";
        return;
    }
    A.state = "stare";
    if(A.cd > 0) return;
    const order = ["lasers", "gaze", "tentacles", "blink"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.cd = rage ? 1.1 : 1.6;
    if(pick === "lasers"){
      const n = rage ? 3 : 2, base = aimAt(e, p);
      for(let k=0;k<n;k++) G.addBeam({ owner:e.id, x:e.x, y:e.y, a:base + k*TAU/n, tell:1.0, time:2.6, dmg:e.dmg*0.8, w:0.4, sweep:(k % 2 ? -1 : 1)*(rage ? 0.9 : 0.65), max:22 });
      G.emit("tell", { id:e.id, kind:"lasers", x:e.x, y:e.y, t:1 });
      A.state = "lasers"; A.t = 3.6;
    } else if(pick === "blink"){ e.invuln = true; G.emit("tell", { id:e.id, kind:"blink", x:e.x, y:e.y, t:0.3 }); G.emit("shut", { id:e.id }); A.state = "blink"; A.t = 2.2; }
    else { const tl = pick === "gaze" ? 0.5 : 0.4; tell(G, e, pick, tl); A.state = pick; A.t = pick === "gaze" ? 1.6 + tl : tl; }
  },

  /* ---- The Gloom Heart: it beats, and every beat is a shockwave ---- */
  heart(G, e, dt, p){
    const A = e.ai, f = e.hp/e.maxHp, phase = f > 0.66 ? 0 : f > 0.33 ? 1 : 2;
    if(phase !== (A.phase || 0)){
      A.phase = phase; G.emit("bossPhase", { id:e.id });
      G.say(phase === 1 ? "THE HEART: \"ba-DUM. ba-DUM. BA-DUM.\"" : "THE HEART: \"you can't stop a heart. you can only BREAK it.\"", 3);
      summon(G, e, 2 + phase, ["blob", "tentacle", "ghost", "watcher"]);
    }
    const period = [1.6, 1.25, 0.95][phase];
    A.beat = (A.beat || 0) + dt;
    e.pulse = Math.max(0, 1 - A.beat/0.25);
    if(A.beat >= period){
      A.beat = 0; A.n = (A.n || 0) + 1;
      G.emit("beat", { id:e.id, x:e.x, y:e.y });
      if(A.n % 2 === 0) G.addHazard({ kind:"shockwave", x:e.x, y:e.y, r:13, t:1.6, dmg:e.dmg*0.8, team:"e" });
      else G.ring(e.x, e.y, 10 + phase*4, 4 + phase*0.6, e.dmg*0.55, A.n*0.07, "blood");
      if(phase >= 1 && A.n % 4 === 1){ const s = spotNear(G, e, p.x, p.y, 2.5); slam(G, s.x, s.y, 1.3, e.dmg, 0.9, "vein"); }
    }
    // the Rot road: the Heart knows what's coming for it, and tries to eat him first.
    // It opens and drags Gribbus in; hurt it enough while it pulls and it chokes.
    // If it gets him, it spits him out dazed and heals. Low enough, he eats it.
    if(DG.Roads && DG.Roads.canFeast(G)){
      const f = G.gribbus;
      A.devCd = (A.devCd === undefined ? 7 : A.devCd) - dt;
      if(A.devour){
        const V = A.devour; V.t -= dt;
        if(e.hp <= V.hp0 - e.maxHp*0.05){ A.devour = null; e.st.stun = 1.6; f.held = 0; G.emit("choke", { id:e.id, x:e.x, y:e.y }); G.say("The Heart chokes on its own blood. Gribbus tears free.", 2.5); }
        else {
          const d = DG.dist(f.x, f.y, e.x, e.y) || 1;
          f.held = 0.2; f.x += (e.x - f.x)/d*2.6*dt; f.y += (e.y - f.y)/d*2.6*dt;
          if(d < e.r + 0.6){
            A.devour = null; e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.05);
            G.emit("heal", { x:e.x, y:e.y, amt:0, enemy:true }); G.emit("spitOut", { x:e.x, y:e.y });
            DG.Gribbus.recall(G, f); f.held = 2.5;
            G.say("It spits him out, dazed. It's stronger for the taste.", 2.5);
          } else if(V.t <= 0){ A.devour = null; f.held = 0; }
        }
      } else if(A.devCd <= 0 && !A.eaten){
        A.devCd = 9; A.devour = { t:3.4, hp0:e.hp };
        tell(G, e, "devour", 0.8); G.say("THE HEART OPENS. IT WANTS THE FROG. Hurt it!", 2.5);
      }
      if(e.hp < e.maxHp*0.12 && !A.eaten){
        A.eaten = true; A.devour = null; f.held = 1.2;
        G.emit("frogLeap", { x1:f.x, y1:f.y, x2:e.x, y2:e.y });
        G.pending.push({ t:1.1, fn:()=>{ if(!e.dead){ f.x = e.x; f.y = e.y + e.r; G.killEnemy(e, { from:"gribbus" }); } } });
      }
    }
    // arteries: rotating beams from phase 2
    if(phase === 2 && A.cd <= 0){
      A.cd = 5;
      for(let k=0;k<4;k++) G.addBeam({ owner:e.id, x:e.x, y:e.y, a:k*Math.PI/2 + G.rng.next(), tell:1.1, time:3, dmg:e.dmg*0.7, w:0.4, sweep:0.55, max:24 });
      G.emit("tell", { id:e.id, kind:"arteries", x:e.x, y:e.y, t:1.1 });
    }
  }
};


/* ================================================================== *
 *  LAIRS: the mini-bosses. Each runs its base enemy's brain, with moves
 *  of its own on their own timers, every one with a tell. Below half
 *  health each has a second wind.
 * ================================================================== */
/* a charge in a straight line (the Spore-Cook's roll; the brute's own is in BEHAVIOUR.brute) */
function charge(G, e, dt, p, C){
  const A = e.ai;
  if(A.state === "ctell"){ A.t -= dt; e.face = A.a; if(A.t <= 0){ A.state = "charging"; A.t = C.time; A.hit = false; } return true; }
  if(A.state === "charging"){
    A.t -= dt;
    const wall = walk(G, e, Math.cos(A.a), Math.sin(A.a), C.speed/speedOf(e), dt);
    if(!A.hit && DG.dist(e.x, e.y, p.x, p.y) < e.r + p.r + 0.15){ A.hit = true; G.hurtPlayer(e.dmg, e.type); p.vx += Math.cos(A.a)*10; p.vy += Math.sin(A.a)*10; }
    if(wall || A.t <= 0){ A.state = "recover"; A.t = wall ? C.stun : 0.5; if(wall){ e.st.stun = C.stun; G.emit("dizzy", { id:e.id, x:e.x, y:e.y, t:C.stun }); } }
    return true;
  }
  return false;
}
function secondWind(G, e, line){
  const A = e.ai;
  if(A.raged || e.hp > e.maxHp*0.5) return false;
  A.raged = true;
  G.emit("bossPhase", { id:e.id });
  if(line) G.emit("bark", { id:e.id, x:e.x, y:e.y, text:line });
  return true;
}
const LAIR = {
  /* Skabb, the Gaoler: a brute with a hooked chain. The hook drags you in
     to his charge; chains fall from the ceiling around you. */
  gaoler(G, e, dt, p){
    const A = e.ai, d = DG.dist(e.x, e.y, p.x, p.y);
    if(secondWind(G, e, "LADS! FRESH MEAT!")) summon(G, e, 2, ["grunt", G.floor >= 2 ? "slinger" : "grunt"]);
    A.hookCd = (A.hookCd === undefined ? 3 : A.hookCd) - dt;
    A.chainCd = (A.chainCd === undefined ? 5 : A.chainCd) - dt;
    if(A.state === "hook"){
      A.t -= dt; e.face = A.a;
      if(A.t <= 0){
        const dx = Math.cos(A.a), dy = Math.sin(A.a), rx = p.x - e.x, ry = p.y - e.y, along = rx*dx + ry*dy, off = Math.abs(rx*dy - ry*dx);
        G.emit("hookThrow", { id:e.id, x:e.x, y:e.y, a:A.a, len:9 });
        if(along > 0 && along < 9 && off < 0.7 + p.r && G.los(e.x, e.y, p.x, p.y)){
          G.hurtPlayer(e.dmg*0.5, "hook"); p.vx -= dx*16; p.vy -= dy*16;
          G.emit("hooked", { x:p.x, y:p.y });
          A.cd = 0;                                    // and straight into the charge
        }
        A.state = "recover"; A.t = 0.35; A.hookCd = A.raged ? 3.2 : 4.5;
      }
      return;
    }
    if(A.state === "chase" || A.state === "idle"){
      if(A.hookCd <= 0 && d > 3 && d < 9 && G.los(e.x, e.y, p.x, p.y)){
        A.a = aimAt(e, p); A.state = "hook"; A.t = 0.65;
        G.addBeam({ owner:e.id, x:e.x, y:e.y, a:A.a, tell:0.65, time:0.01, dmg:0, w:0.25, max:9, kind:"hook" });
        tell(G, e, "hook", 0.65, { a:A.a }); A.state = "hook"; A.t = 0.65;
        G.emit("bark", { id:e.id, x:e.x, y:e.y, text:G.rng.pick(DG.LAIRS.gaoler.lines) });
        return;
      }
      if(A.chainCd <= 0){
        A.chainCd = A.raged ? 4 : 6;
        const n = A.raged ? 6 : 4;
        for(let k=0;k<n;k++){ const s = spotNear(G, e, p.x, p.y, k ? 3.2 : 0.3); slam(G, s.x, s.y, 0.85, e.dmg*0.7, 0.95, "chains"); }
        G.emit("tell", { id:e.id, kind:"chains", x:e.x, y:e.y, t:0.95 });
      }
    }
    BEHAVIOUR.brute(G, e, dt, p);
  },
  /* the Spore-Cook: lobs rot from his pot that lands in spore clouds, and
     rolls his bulk at you; at half health he eats and boils over */
  cook(G, e, dt, p){
    const A = e.ai, d = DG.dist(e.x, e.y, p.x, p.y);
    if(secondWind(G, e, "SECOND HELPINGS!")){ A.lobCd = 0; e.hp = Math.min(e.maxHp, e.hp + e.maxHp*0.15); G.emit("heal", { x:e.x, y:e.y, amt:0, enemy:true }); }
    if(charge(G, e, dt, p, { time:0.85, speed:8.5, stun:1.1 })) return;
    if(A.state === "recover"){ A.t -= dt; if(A.t <= 0) A.state = "chase"; return; }
    if(A.state === "brew"){
      A.t -= dt;
      if(A.t <= 0){
        const n = A.raged ? 5 : 3;
        for(let k=0;k<n;k++){
          const s = spotNear(G, e, p.x, p.y, k ? 3 : 0.4), dmg = e.dmg*0.5;
          slam(G, s.x, s.y, 1.0, dmg, 0.85, "glob");
          G.pending.push({ t:0.85, fn:()=> G.addHazard({ kind:"spores", x:s.x, y:s.y, r:1.1, t:3.2, every:0.5, dmg:dmg*0.5, team:"e" }) });
        }
        G.emit("eshoot", { id:e.id, x:e.x, y:e.y, kind:"lob" });
        A.state = "chase"; A.lobCd = A.raged ? 2.8 : 4;
      }
      return;
    }
    A.lobCd = (A.lobCd === undefined ? 2 : A.lobCd) - dt;
    A.rollCd = (A.rollCd === undefined ? 4 : A.rollCd) - dt;
    A.state = "chase";
    if(A.lobCd <= 0 && G.los(e.x, e.y, p.x, p.y)){ tell(G, e, "brew", 0.7); A.state = "brew"; A.t = 0.7; G.emit("bark", { id:e.id, x:e.x, y:e.y, text:G.rng.pick(DG.LAIRS.cook.lines) }); return; }
    if(A.rollCd <= 0 && d > 2.5 && d < 10 && G.los(e.x, e.y, p.x, p.y)){ A.rollCd = A.raged ? 3.5 : 5; A.a = aimAt(e, p); tell(G, e, "charge", 0.8, { a:A.a }); A.state = "ctell"; A.t = 0.8; return; }
    approach(G, e, p, dt, 0.9);
  },
  /* the Reliquary Warden: a dead keeper behind a tower shield (shots from
     the front barely scratch him: get round him). Volleys of arrows at
     range, a shield bash up close; at half health the dead rise to help. */
  warden(G, e, dt, p){
    const A = e.ai, d = DG.dist(e.x, e.y, p.x, p.y);
    if(secondWind(G, e, "RISE, BROTHERS.")) summon(G, e, 2, ["skeleton"]);
    e.shot = e.shot || { speed:11, cd:2.4, tell:0.6, n:3, spread:24, kind:"arrow" };
    // turn slowly to face Zippy: the shield is only good from the front
    const want = aimAt(e, p);
    if(A.state !== "tell" && A.state !== "lunge") e.face += DG.wrapAngle(want - e.face)*Math.min(1, dt*(A.raged ? 2.6 : 1.8));
    if(d < 2.6 || A.state === "lunge" || (A.state === "tell" && A.tell === "stab") || A.state === "recover"){
      melee(G, e, dt, p, { reach:2.6, tell:0.5, lunge:9, cd:1.4 });
      if(A.state === "lunge" && A.hit && !A.bashed){ A.bashed = true; p.vx += Math.cos(A.a)*12; p.vy += Math.sin(A.a)*12; }
      if(A.state !== "lunge") A.bashed = false;
      return;
    }
    const face = e.face;
    ranged(G, e, dt, p);
    if(A.state !== "tell") { e.face = face + DG.wrapAngle(want - face)*Math.min(1, dt*1.8); }
    if(d > 6) approach(G, e, p, dt, 0.7);
  },
  /* the Leech Mother: burrows and rises under you like any tentacle, but
     comes up in a ring of leeches, and spits more while she's up */
  leech(G, e, dt, p){
    const A = e.ai, was = A.state;
    if(secondWind(G, e)) e.def = Object.assign({}, e.def, { slam:Object.assign({}, e.def.slam, { cd:1.6, tell:0.7 }) });
    BEHAVIOUR.tentacle(G, e, dt, p);
    if(was === "rise" && A.state === "up") G.ring(e.x, e.y, A.raged ? 14 : 10, 4.2, e.dmg*0.45, G.rng.next(), "leech");
    if(A.state === "up"){
      A.spitCd = (A.spitCd === undefined ? 0.8 : A.spitCd) - dt;
      if(A.spitCd <= 0){ A.spitCd = A.raged ? 0.9 : 1.4; shoot(G, e, aimAt(e, p), 6.5, 3, 30, "leech", { r:0.2, dmg:e.dmg*0.45 }); }
    }
  },
  /* the Many-Eyed: glares down three lines at once (five, later), and
     weeps a ring of tears between */
  manyeyed(G, e, dt, p){
    const A = e.ai, Z = e.def.laser;
    secondWind(G, e);
    A.ringCd = (A.ringCd === undefined ? 2.5 : A.ringCd) - dt;
    if(A.state === "glare"){ A.t -= dt; if(A.t <= 0) A.state = "drift"; return; }
    A.state = "drift";
    if(A.cd <= 0 && DG.dist(e.x, e.y, p.x, p.y) < 15 && G.los(e.x, e.y, p.x, p.y)){
      A.cd = (A.raged ? 2.6 : 3.4)*(0.85 + G.rng.next()*0.3);
      A.state = "glare"; A.t = Z.tell + Z.time + 0.2;
      const a = aimAt(e, p), n = A.raged ? 5 : 3, spread = A.raged ? 0.3 : 0.38;
      for(let k=0;k<n;k++) G.addBeam({ owner:e.id, x:e.x, y:e.y, a:a + (k - (n - 1)/2)*spread, tell:Z.tell, time:Z.time + 0.2, dmg:e.dmg, w:0.32, max:Z.len, sweep:(k - (n - 1)/2)*0.08 });
      G.emit("tell", { id:e.id, kind:"glare", x:e.x, y:e.y, t:Z.tell });
      return;
    }
    if(A.ringCd <= 0){ A.ringCd = A.raged ? 2.6 : 3.6; G.ring(e.x, e.y, A.raged ? 16 : 12, 4.5, e.dmg*0.5, G.rng.next(), "tear"); G.emit("eshoot", { id:e.id, x:e.x, y:e.y, kind:"ring" }); }
    keepAway(G, e, p, dt, [5, 9]);
  },
  /* the Choir of Husks: three that charge like husks; hurt one and the
     other two scream at you */
  choir(G, e, dt, p){
    const A = e.ai;
    if(A.screamT && A.screamT <= G.t){
      A.screamT = 0;
      shoot(G, e, aimAt(e, p), 7, 5, 46, "wail", { r:0.22, dmg:e.dmg*0.45 });
      G.emit("tell", { id:e.id, kind:"scream", x:e.x, y:e.y, t:0.1 });
    }
    BEHAVIOUR.brute(G, e, dt, p);
  }
};
AI.LAIR = LAIR;
/* the Choir: when one is hurt, the others scream (called from damageEnemy) */
AI.lairHurt = function(G, e){
  if(e.lair !== "choir") return;
  G.enemies.forEach(o=>{
    if(o === e || o.dead || o.lair !== "choir" || o.room !== e.room) return;
    if((o.ai.screamCd || 0) > G.t) return;
    o.ai.screamCd = G.t + 2.2; o.ai.screamT = G.t + 0.45;
    G.emit("tell", { id:o.id, kind:"scream", x:o.x, y:o.y, t:0.45 });
  });
};

function summon(G, e, n, types){
  const r = G.D.rooms[e.room];
  for(let i=0;i<n;i++){
    const a = G.rng.next()*TAU, x = e.x + Math.cos(a)*2.6, y = e.y + Math.sin(a)*2.6;
    if(!G.inRoom(r, x, y) || G.blocked(Math.floor(x), Math.floor(y), "enemy")) continue;
    G.spawnEnemy(r, { type:types[i % types.length], x, y, elite:null });
  }
  G.emit("summon", { id:e.id });
}

})(typeof window !== "undefined" ? window : globalThis);
