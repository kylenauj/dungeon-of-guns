/* ------------------------------------------------------------------ *
 *  Goblin brains. Every attack is telegraphed (a "tell") so a good
 *  player can always read it: grunts wind up, slingers raise the
 *  sling, brutes paw the ground, the king squats before he flops.
 *
 *  Each behaviour is a small state machine over e.ai:
 *    { state, t (time left in state), cd (attack cooldown), ... }
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const AI = DG.AI = {};

AI.update = function(G, e, dt){
  if(e.dead) return;
  if(e.spawn > 0){ e.spawn -= dt; return; }
  // knockback first: this is how goblins end up in pits
  if(Math.abs(e.kx) + Math.abs(e.ky) > 0.05){
    G.move(e, e.kx*dt, e.ky*dt, Math.hypot(e.kx, e.ky) > 2.5 ? "flying" : "enemy");
    const f = Math.exp(-dt*9); e.kx *= f; e.ky *= f;
  } else { e.kx = e.ky = 0; }
  if(!e.airborne && G.D.at(Math.floor(e.x), Math.floor(e.y)) === DG.TILE.PIT && !e.boss){
    G.emit("fall", { x:e.x, y:e.y, who:"enemy", id:e.id });
    G.killEnemy(e, {}, true);
    return;
  }
  e.vx = 0; e.vy = 0;
  if(e.st.frozen > 0 || e.st.stun > 0) return;
  e.ai.cd -= dt;
  const B = BEHAVIOUR[e.def.ai] || BEHAVIOUR.melee;
  B(G, e, dt, G.player);
};

/* ---- shared moves ---- */
function speedOf(e){ return e.speed*(e.st.chill > 0 ? DG.STATUS.chill.slow : 1); }
function walk(G, e, dx, dy, mul, dt){
  const l = Math.hypot(dx, dy); if(l < 0.001) return false;
  const s = speedOf(e)*(mul || 1);
  e.vx = dx/l*s; e.vy = dy/l*s;
  e.face = Math.atan2(dy, dx);
  return G.move(e, e.vx*dt, e.vy*dt, "enemy");
}
/* toward the wizard: straight if there's a clear line, else down the flow field */
function approach(G, e, p, dt, mul){
  if(G.los(e.x, e.y, p.x, p.y) && clearPath(G, e, p)) return walk(G, e, p.x - e.x, p.y - e.y, mul, dt);
  const f = G.flowDir(e.x, e.y);
  if(f) return walk(G, e, f.x, f.y, mul, dt);
  return walk(G, e, p.x - e.x, p.y - e.y, mul, dt);
}
/* no pit between here and there (goblins aren't THAT stupid) */
function clearPath(G, e, p){
  const d = DG.dist(e.x, e.y, p.x, p.y), n = Math.ceil(d/0.4);
  for(let i=1;i<n;i++){ const t = i/n; if(G.blocked(Math.floor(e.x + (p.x - e.x)*t), Math.floor(e.y + (p.y - e.y)*t), "enemy")) return false; }
  return true;
}
function keepAway(G, e, p, dt, keep){
  const d = DG.dist(e.x, e.y, p.x, p.y), los = G.los(e.x, e.y, p.x, p.y);
  if(!los || d > keep[1]) return approach(G, e, p, dt);
  if(d < keep[0]){
    if(walk(G, e, e.x - p.x, e.y - p.y, 0.9, dt)) e.ai.strafe = -(e.ai.strafe || 1);
    return;
  }
  // strafe round the wizard, switching direction now and then
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
    G.addBullet(Object.assign({ team:"e", x:e.x + Math.cos(o)*e.r, y:e.y + Math.sin(o)*e.r, vx:Math.cos(o)*speed, vy:Math.sin(o)*speed, r:0.18, dmg:e.dmg, life:3.5, kind }, extra || {}));
  }
  G.emit("eshoot", { id:e.id, x:e.x, y:e.y, kind });
}
function bark(G, e, chance){
  if(e.def.lines && G.rng.chance(chance || 0.08)) G.emit("bark", { id:e.id, x:e.x, y:e.y, text:G.rng.pick(e.def.lines) });
}

/* a stab or a lunge: shared by grunts and sneaks */
function melee(G, e, dt, p, o){
  const A = e.ai, d = DG.dist(e.x, e.y, p.x, p.y);
  if(A.state === "tell"){
    A.t -= dt; e.face = A.a;
    if(A.t <= 0){ A.state = "lunge"; A.t = 0.2; A.hit = false; }
    return;
  }
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
    A.a = Math.atan2(p.y - e.y, p.x - e.x);
    tell(G, e, "stab", o.tell, { a:A.a });
    bark(G, e, 0.12);
    return;
  }
  if(o.target){ const t = o.target(); walk(G, e, t.x - e.x, t.y - e.y, 1, dt); }
  else approach(G, e, p, dt);
}

const BEHAVIOUR = {
  melee(G, e, dt, p){ melee(G, e, dt, p, { reach:1.6, tell:0.38, lunge:9, cd:1.0 }); },

  sneak(G, e, dt, p){
    // fades out, circles to your back, then stabs
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

  ranged(G, e, dt, p){
    const A = e.ai, S = e.def.shot;
    if(A.state === "tell"){
      A.t -= dt; e.face = Math.atan2(p.y - e.y, p.x - e.x);
      if(A.t <= 0){ A.state = "move"; A.cd = S.cd*(0.8 + G.rng.next()*0.4); shoot(G, e, e.face, S.speed, S.n, S.spread || 0, "rock"); }
      return;
    }
    A.state = "move";
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(A.cd <= 0 && d < 12 && G.los(e.x, e.y, p.x, p.y)){ tell(G, e, "aim", S.tell); bark(G, e, 0.06); return; }
    keepAway(G, e, p, dt, e.def.keep);
  },

  bomber(G, e, dt, p){
    const A = e.ai, B = e.def.bomb;
    if(A.state === "tell"){
      A.t -= dt; e.face = Math.atan2(p.y - e.y, p.x - e.x);
      if(A.t <= 0){
        A.state = "move"; A.cd = B.cd*(0.8 + G.rng.next()*0.4);
        // lob it where you're standing (a little off, they're goblins)
        const tx = p.x + (G.rng.next() - 0.5)*1.2, ty = p.y + (G.rng.next() - 0.5)*1.2;
        G.bombs.push({ id:G.nextId++, x:e.x, y:e.y, tx, ty, t:0, flight:0.75, fuse:B.fuse, r:B.radius, dmg:e.dmg });
        G.emit("throw", { id:e.id, x:e.x, y:e.y, tx, ty });
      }
      return;
    }
    A.state = "move";
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(A.cd <= 0 && d < 10 && G.los(e.x, e.y, p.x, p.y)){ tell(G, e, "throw", 0.4); bark(G, e, 0.2); return; }
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
        } else shoot(G, e, Math.atan2(p.y - e.y, p.x - e.x), S.speed, S.n, S.spread, "hex", { slow:1.4 });
      }
      return;
    }
    A.state = "move";
    if(A.hcd <= 0){
      // the most hurt friend in reach
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
        // straight into the wall. he'll need a minute
        A.state = "recover"; A.t = C.stun; A.cd = C.cd; e.st.stun = C.stun;
        G.emit("dizzy", { id:e.id, x:e.x, y:e.y, t:C.stun }); G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"ow" });
        return;
      }
      if(A.t <= 0){ A.state = "recover"; A.t = 0.6; A.cd = C.cd; }
      return;
    }
    if(A.state === "recover"){ A.t -= dt; if(A.t <= 0) A.state = "chase"; return; }
    A.state = "chase";
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(A.cd <= 0 && d < 9 && d > 2 && G.los(e.x, e.y, p.x, p.y)){
      A.a = Math.atan2(p.y - e.y, p.x - e.x);
      tell(G, e, "charge", C.tell, { a:A.a }); bark(G, e, 0.3);
      return;
    }
    // a shove if you stand next to him
    if(d < e.r + p.r + 0.1 && (A.shove || 0) <= G.t){ A.shove = G.t + 1; G.hurtPlayer(e.dmg*0.5, "brute"); }
    approach(G, e, p, dt);
  },

  /* ---- Grubnok ---- */
  king(G, e, dt, p){
    const A = e.ai, rage = e.hp/e.maxHp < 0.5;
    if(rage && !A.raged){ A.raged = true; G.emit("bossPhase", { id:e.id }); G.say("GRUBNOK: \"NOW I'M ANGRY\"", 2.5); }
    const d = DG.dist(e.x, e.y, p.x, p.y);
    if(!e.airborne && d < e.r + p.r && (A.touch || 0) <= G.t){ A.touch = G.t + 0.8; G.hurtPlayer(e.dmg*0.6, "king"); }
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
        if(A.t <= 0){
          shoot(G, e, Math.atan2(p.y - e.y, p.x - e.x), 8, rage ? 7 : 5, rage ? 50 : 40, "orb", { r:0.22, dmg:e.dmg*0.7 });
          A.n++; A.t = 0.3;
          if(A.n >= 3) A.state = "walk";
        }
        return;
      case "squat":
        A.t -= dt;
        if(A.t <= 0){
          A.state = "air"; A.t = 0.9; e.airborne = true;
          A.fx = e.x; A.fy = e.y; A.tx = p.x; A.ty = p.y;
          G.marks.push({ kind:"flop", x:p.x, y:p.y, r:2.5, t:0.9, max:0.9 });
          G.emit("jump", { id:e.id });
        }
        return;
      case "air": {
        A.t -= dt;
        const k = 1 - Math.max(0, A.t)/0.9;
        e.x = A.fx + (A.tx - A.fx)*k; e.y = A.fy + (A.ty - A.fy)*k; e.hop = Math.sin(k*Math.PI)*4;
        if(A.t <= 0){
          e.airborne = false; e.hop = 0;
          // land somewhere legal
          if(G.blocked(Math.floor(e.x), Math.floor(e.y), "enemy")){ e.x = A.fx; e.y = A.fy; }
          G.explode(e.x, e.y, 2.5, e.dmg*1.2, "e", { el:null, skip:e.id });
          G.ring(e.x, e.y, rage ? 16 : 12, 4.5, e.dmg*0.6, G.rng.next(), "orb");
          G.emit("land", { id:e.id, x:e.x, y:e.y });
          A.state = "walk"; A.cd = rage ? 0.9 : 1.4;
        }
        return;
      }
      case "summon":
        A.t -= dt;
        if(A.t <= 0){
          const room = G.D.rooms[e.room], n = rage ? 3 : 2;
          for(let i=0;i<n;i++){
            const a = G.rng.next()*Math.PI*2, x = e.x + Math.cos(a)*2.5, y = e.y + Math.sin(a)*2.5;
            if(G.blocked(Math.floor(x), Math.floor(y), "enemy")) continue;
            G.spawnEnemy(room, { type:G.floor >= 2 && i === 2 ? "slinger" : "grunt", x, y, elite:null });
          }
          A.state = "walk";
        }
        return;
    }
    // walking about between tricks
    A.state = "walk";
    if(d > 3) approach(G, e, p, dt, 1); else e.face = Math.atan2(p.y - e.y, p.x - e.x);
    if(A.cd > 0) return;
    const adds = G.enemies.filter(o=> o.room === e.room && o !== e && !o.dead).length;
    const order = ["spray", "flop", "spit", adds < 4 ? "summon" : "spray"];
    const pick = order[(A.k = ((A.k || 0) + 1)) % order.length];
    A.n = 0; A.cd = rage ? 1.1 : 1.7;
    if(pick === "spray"){ A.state = "spray"; A.t = 0.5; tell(G, e, "spray", 0.5); A.state = "spray"; }
    else if(pick === "spit"){ A.state = "spit"; A.t = 0.45; tell(G, e, "spit", 0.45); A.state = "spit"; }
    else if(pick === "flop"){ tell(G, e, "squat", 0.6); A.state = "squat"; A.t = 0.6; }
    else { tell(G, e, "summon", 0.8); A.state = "summon"; A.t = 0.8; G.emit("bark", { id:e.id, x:e.x, y:e.y, text:"LADS! GET 'IM!" }); }
  }
};

})(typeof window !== "undefined" ? window : globalThis);
