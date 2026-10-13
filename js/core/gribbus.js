/* ------------------------------------------------------------------ *
 *  Gribbus the frog (and, with Twin Frog, his brother Grobbus).
 *
 *  He hops after Zippy, picks his own fights, licks goblins that get
 *  close and spits at the ones that don't. He can't be hurt: he is a
 *  very good frog. Frog ponds teach him tricks (one of three lily
 *  pads); golden flies, saved between runs, unlock more tricks.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const Gr = DG.Gribbus = {};
const TAU = Math.PI*2;

function frog(name){
  return { name, x:0, y:0, vx:0, vy:0, r:0.28, hop:0, hopT:0, hopDur:0.3, sx:0, sy:0, tx:0, ty:0, rest:0,
           cd:0.5, spitCd:1, face:0, tongue:null, timers:{}, lily:0 };
}
Gr.create = function(G){
  const f = frog("Gribbus");
  f.buffs = []; f.g = {};
  G.frogs = [f];
  return f;
};

/* the strength of a lick */
Gr.power = function(G){
  const M = G.mods, g = G.gribbus.g;
  return 0.45*G.payloadPower()*(1 + M.frogDmg + (g.dmg || 0));
};
Gr.target = function(G, range, x, y){
  const f = G.gribbus;
  return G.nearestEnemy(x === undefined ? f.x : x, y === undefined ? f.y : y, range);
};

/* lily pads and Bullet Gulp stop enemy shots */
Gr.blocks = function(G, b){
  const f = G.gribbus; if(!f || !f.g.lily) return false;
  const p = G.player, a = G.t*2.2;
  const lx = p.x + Math.cos(a)*1.15, ly = p.y + Math.sin(a)*1.15;
  if(DG.dist2(b.x, b.y, lx, ly) < 0.42){ G.emit("lilyBlock", { x:b.x, y:b.y }); return true; }
  return false;
};
Gr.lilyPos = function(G){ const p = G.player, a = G.t*2.2; return { x:p.x + Math.cos(a)*1.15, y:p.y + Math.sin(a)*1.15 }; };

/* Moon Moons and Zippy's Shadow live as long as the run */
Gr.spawnPermanents = function(G){
  if(G.mods.special.moons && !G.allies.some(a=> a.kind === "moon")) for(let i=0;i<3;i++) G.spawnAlly("moon", G.player.x, G.player.y, { orbit:i/3*TAU });
  if(G.mods.special.shadow && !G.allies.some(a=> a.kind === "shadow" && a.life === Infinity)) G.spawnAlly("shadow", G.player.x - 1, G.player.y, {});
};

/* ---- buffs ---- */
Gr.giveBuff = function(G, id){
  const f = G.gribbus, B = DG.FROG_BUFFS[id];
  f.buffs.push(id);
  for(const k in B.g) f.g[k] = (f.g[k] || 0) + B.g[k];
  if(id === "twin" && G.frogs.length < 2){ const t = frog("Grobbus"); t.x = f.x; t.y = f.y; t.twin = true; G.frogs.push(t); }
  G.emit("frogbuff", { id, name:B.name, desc:B.desc });
};
/* walking into a frog pond: three lily pads, three tricks */
Gr.offerPond = function(G, r){
  if(r.pondOffered) return;
  r.pondOffered = true;
  const pads = r.props.filter(p=> p.kind === "lilypad");
  const unlocked = id=> !DG.FROG_BUFFS[id].locked || G.meta.flies >= DG.FROG_BUFFS[id].locked;
  const have = G.gribbus.buffs;
  const ids = G.rng.shuffle(Object.keys(DG.FROG_BUFFS).filter(id=> have.indexOf(id) < 0 && unlocked(id)));
  pads.forEach((p, i)=>{ p.buff = ids[i] || null; p.taken = !ids[i]; });
  if(!ids.length){ r.pondDone = true; G.dropGold(r.cxw, r.cyw + 2, 20); G.say("Gribbus knows every trick there is. Have some gold instead."); }
  if(r.fly && !r.flyGiven){ r.flyGiven = true; G.addPickup("fly", r.fly.x + 0.5, r.fly.y + 0.5, 1); }
};
Gr.choosePad = function(G, pad){
  const r = G.D.rooms[pad.room];
  if(r.pondDone || pad.taken || !pad.buff) return;
  Gr.giveBuff(G, pad.buff);
  pad.taken = true; pad.chosen = true; r.pondDone = true;
  r.props.forEach(p=>{ if(p.kind === "lilypad" && p !== pad && !p.taken){ p.taken = true; p.sunk = true; G.emit("sink", { id:p.id }); } });
  G.say("Gribbus learned " + DG.FROG_BUFFS[pad.buff].name + "! " + G.rng.pick(DG.LINES.gribbus), 3.5);
};

/* back to Zippy's side, on open floor */
Gr.recall = function(G, f){
  const p = G.player, r = G.room || G.roomOf(p.x, p.y);
  let x = p.x - Math.cos(p.aim)*0.8, y = p.y - Math.sin(p.aim)*0.8;
  if(r){ const s = G.freeSpot(r, x, y); if(s){ x = s.x; y = s.y; } }
  else if(G.blocked(Math.floor(x), Math.floor(y), "frog")){ x = p.x; y = p.y; }
  G.emit("frogPoof", { x:f.x, y:f.y, x2:x, y2:y });
  f.x = x; f.y = y; f.hopT = 0; f.hop = 0; f.stuck = 0; f.rest = 0.2;
};

/* ---- per frame ---- */
Gr.update = function(G, dt){
  G.frogs.forEach((f, i)=> updateFrog(G, f, i, dt));
};

function updateFrog(G, f, idx, dt){
  const p = G.player, M = G.mods, g = G.gribbus.g, rng = G.rng;
  const rate = 1 + M.frogRate + (g.rate || 0);
  f.cd -= dt*rate; f.spitCd -= dt*rate; f.rest -= dt;
  for(const k in f.timers) f.timers[k] -= dt;
  const fight = G.room && G.room.active;
  // left behind (outside a room that just locked, far away, or stuck on a
  // wall or a gate): poof back to Zippy's side
  const away = DG.dist(f.x, f.y, p.x, p.y);
  if(away > 9 || (fight && !G.inRoom(G.room, f.x, f.y)) || (f.stuck || 0) > 1.2) Gr.recall(G, f);

  const reach = 2.1*(1 + (g.reach || 0)), dmg = Gr.power(G)*(f.twin ? 0.7 : 1), size = 1 + 0.5*(g.size || 0);
  const tg = fight ? G.nearestEnemy(f.x, f.y, 8) : null;
  const els = g.mirrorEls ? G.shotEls(G.gun()) : [];

  // the tongue
  if(f.tongue){
    f.tongue.t -= dt;
    if(f.tongue.t <= 0) f.tongue = null;
  }
  if(tg && f.cd <= 0 && DG.dist(f.x, f.y, tg.x, tg.y) < reach + tg.r){
    f.cd = 0.85;
    f.face = Math.atan2(tg.y - f.y, tg.x - f.x);
    f.tongue = { x:tg.x, y:tg.y, t:0.18 };
    G.damageEnemy(tg, dmg*size, { els, power:1, depth:1, ax:tg.x - f.x, ay:tg.y - f.y, knock:g.sticky ? 0 : 1.2, from:"gribbus" });
    if(g.sticky && !tg.boss && !tg.dead){ G.move(tg, (f.x - tg.x)*0.35, (f.y - tg.y)*0.35, tg.phases ? "ghost" : "enemy"); tg.st.chill = Math.max(tg.st.chill || 0, 1.5); }
    // Tongue Twister: the licked goblin gets flung into its neighbour
    if(M.special.twister && !tg.boss && !tg.dead){
      const o = G.nearestEnemy(tg.x, tg.y, 4.5, tg);
      if(o){
        const d = DG.dist(tg.x, tg.y, o.x, o.y) || 1;
        tg.kx += (o.x - tg.x)/d*12; tg.ky += (o.y - tg.y)/d*12;
        G.damageEnemy(o, dmg*size*1.4, { power:1, depth:1, ax:o.x - tg.x, ay:o.y - tg.y, knock:2, from:"gribbus" });
        G.emit("fling", { x1:tg.x, y1:tg.y, x2:o.x, y2:o.y });
      }
    }
    G.emit("lick", { x:f.x, y:f.y, tx:tg.x, ty:tg.y, frog:idx });
  }
  // the spit (Toxic Spit makes it poison that puddles; Bubble Blower traps)
  if(tg && f.spitCd <= 0 && DG.dist(f.x, f.y, tg.x, tg.y) < 8 && G.los(f.x, f.y, tg.x, tg.y)){
    f.spitCd = 1.7;
    const a = Math.atan2(tg.y - f.y, tg.x - f.x);
    const bubble = g.bubble && rng.chance(0.35);
    const b = G.addShot({ x:f.x, y:f.y, a, speed:bubble ? 6 : 9, r:bubble ? 0.3 : 0.16, dmg:dmg*0.6*size, range:9, els:g.spitEl ? [g.spitEl].concat(els) : els, power:1, depth:1, homing:0.6, kind:bubble ? "bubble" : "spit", from:"gribbus" });
    if(g.spitPuddle) b.onEnd = "puddle";
    if(bubble) b.trap = 2;
    G.emit("spit", { x:f.x, y:f.y, frog:idx, bubble });
  }
  // croaks
  if(fight && g.croak && (f.timers.croak || 0) <= 0){
    const near = G.enemies.some(e=> !e.dead && e.spawn <= 0 && DG.dist(e.x, e.y, f.x, f.y) < 3);
    if(near){ f.timers.croak = 4; G.nova(f.x, f.y, 3, dmg*0.6, ["frost"], 1); G.emit("croak", { x:f.x, y:f.y, kind:"frost" }); }
  }
  if(fight && g.doom && (f.timers.doom || 0) <= 0 && idx === 0){
    f.timers.doom = 10;
    G.enemies.forEach(e=>{ if(!e.dead && e.room === G.room.id && !e.boss) e.st.stun = Math.max(e.st.stun || 0, 1.2); });
    G.emit("croak", { x:f.x, y:f.y, kind:"doom" }); G.say("CROAK OF DOOM", 1.5);
  }
  if(fight && g.brood && (f.timers.brood || 0) <= 0){ f.timers.brood = 5; G.spawnAlly("tadpole", f.x, f.y, {}); }
  // Bullet Gulp: snatch an enemy shot and spit it back
  if(g.gulp && (f.timers.gulp || 0) <= 0){
    const b = G.bullets.find(b=> b.team === "e" && DG.dist2(b.x, b.y, f.x, f.y) < 6.5);
    if(b){
      f.timers.gulp = 1.4; b.dead = true;
      const t = G.nearestEnemy(f.x, f.y, 12);
      f.tongue = { x:b.x, y:b.y, t:0.15 };
      if(t) G.addShot({ x:f.x, y:f.y, a:Math.atan2(t.y - f.y, t.x - f.x), speed:13, r:0.2, dmg:dmg*1.5, range:12, els, power:1, depth:1, homing:1, kind:"spit", from:"gribbus" });
      G.emit("gulp", { x:f.x, y:f.y });
    }
  }

  // hopping about
  if(f.hopT > 0){
    f.hopT -= dt;
    const k = 1 - Math.max(0, f.hopT)/f.hopDur;
    const nx = f.sx + (f.tx - f.sx)*k, ny = f.sy + (f.ty - f.sy)*k;
    const bumped = G.move(f, nx - f.x, ny - f.y, "frog");
    f.stuck = bumped ? (f.stuck || 0) + dt : 0;
    f.hop = Math.sin(k*Math.PI)*0.6;
    if(f.hopT <= 0){
      f.hop = 0; f.rest = 0.12 + rng.next()*0.25;
      if(g.hopZap && tg && DG.dist(f.x, f.y, tg.x, tg.y) < 1.6) G.chain(tg, dmg*0.8, 2, f.x, f.y, { els:["shock"], power:1, depth:1, noArc:true, from:"gribbus" });
    }
    return;
  }
  if(f.rest > 0) return;
  // where to hop: at a goblin (to lick it), else to Zippy's side
  let gx, gy;
  if(tg && DG.dist(p.x, p.y, tg.x, tg.y) < 10){
    const a = Math.atan2(tg.y - f.y, tg.x - f.x), d = DG.dist(f.x, f.y, tg.x, tg.y);
    const want = Math.max(0, d - reach*0.8);
    gx = f.x + Math.cos(a)*Math.min(2.4, want); gy = f.y + Math.sin(a)*Math.min(2.4, want);
    f.face = a;
  } else {
    const side = idx === 0 ? 1 : -1;
    gx = p.x - Math.cos(p.aim)*0.9 + Math.cos(p.aim + Math.PI/2)*1.1*side;
    gy = p.y - Math.sin(p.aim)*0.9 + Math.sin(p.aim + Math.PI/2)*1.1*side;
    if(DG.dist(f.x, f.y, gx, gy) < 0.6) return;
    const d = DG.dist(f.x, f.y, gx, gy);
    if(d > 2.4){ gx = f.x + (gx - f.x)/d*2.4; gy = f.y + (gy - f.y)/d*2.4; }
    f.face = Math.atan2(gy - f.y, gx - f.x);
  }
  if(DG.dist(f.x, f.y, gx, gy) < 0.2) return;
  f.sx = f.x; f.sy = f.y; f.tx = gx; f.ty = gy;
  f.hopDur = 0.26 + DG.dist(f.x, f.y, gx, gy)*0.03; f.hopT = f.hopDur;
}

})(typeof window !== "undefined" ? window : globalThis);
