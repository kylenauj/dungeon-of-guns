/* ------------------------------------------------------------------ *
 *  A headless bot that plays the game, for tests and balance runs.
 *  It walks the map by BFS, clears rooms, opens chests, takes loot,
 *  and goes down the portal. It's a decent player, not a great one.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;

function Bot(G, opts){
  this.G = G; this.path = null; this.repath = 0; this.goal = null; this.t = 0; this.opts = opts || {};
  this.visitedProps = {}; this.rng = DG.RNG(((G.seed || 7) ^ 0x9e3779b9) >>> 0);
}
Bot.prototype.bfs = function(sx, sy, tx, ty){
  const G = this.G, D = G.D, W = D.w, prev = new Int32Array(W*D.h).fill(-1), q = [sy*W + sx];
  prev[sy*W + sx] = sy*W + sx;
  const goal = ty*W + tx;
  for(let qi=0; qi<q.length; qi++){
    const c = q[qi]; if(c === goal) break;
    const x = c % W, y = (c - x)/W;
    for(const [dx, dy] of DG.DIRS4){
      const nx = x + dx, ny = y + dy, n = ny*W + nx;
      if(prev[n] !== -1 || (G.blocked(nx, ny, "enemy") && G.D.at(nx, ny) !== DG.TILE.WATER)) continue;   // no pits, but water is fine
      prev[n] = c; q.push(n);
    }
  }
  if(prev[goal] === -1) return null;
  const out = []; let c = goal;
  while(c !== prev[c]){ out.push([c % W + 0.5, Math.floor(c/W) + 0.5]); c = prev[c]; }
  return out.reverse();
};
Bot.prototype.chooseGoal = function(){
  const G = this.G, p = G.player;
  const live = G.enemies.filter(e=> !e.dead && e.spawn <= 0 && !e.untargetable);
  if(live.length){ let b = live[0]; live.forEach(e=>{ if(DG.dist(e.x, e.y, p.x, p.y) < DG.dist(b.x, b.y, p.x, p.y)) b = e; }); return { x:b.x, y:b.y, enemy:b }; }
  if(G.enemies.some(e=> !e.dead && G.room && e.room === G.room.id)) return { x:p.x, y:p.y };
  const items = G.pickups.filter(k=> k.kind === "item" && !this.visitedProps["k" + k.id] && (k.item.kind !== "gun" || DG.Loot.dps(k.item, G.mods) > DG.Loot.dps(G.gun(), G.mods)*0.9));
  if(items.length) return { x:items[0].x, y:items[0].y, use:true, key:"k" + items[0].id };
  for(const r of G.D.rooms){
    if(r.type === "secret" && !r.found) continue;
    for(const pr of r.props){
      const key = "p" + pr.id;
      if(this.visitedProps[key]) continue;
      if(pr.kind === "chest" && !pr.open && !pr.locked) return { x:pr.x + 0.5, y:pr.y + 1.2, use:true, key };
      if(pr.kind === "pedestal" && !pr.taken && pr.offer){
        const o = pr.offer;
        const ok = !o.currency || (o.currency === "gold" && p.gold >= o.price && o.kind !== "heal") || (o.currency === "hp" && p.maxHp - o.price >= 70);
        if(ok) return { x:pr.x + 0.5, y:pr.y + (pr.closet ? 0.5 : 1.3), use:true, key };
      }
      if(pr.kind === "lilypad" && !pr.taken && !r.pondDone && (pr.buff || !r.pondOffered)) return { x:pr.x + 0.5, y:pr.y + 1.3, use:!!pr.buff, key:pr.buff ? key : null };
    }
  }
  const todo = G.D.rooms.filter(r=> !r.cleared && (r.type === "combat"));
  if(todo.length){ todo.sort((a, b)=> DG.dist(a.cxw, a.cyw, p.x, p.y) - DG.dist(b.cxw, b.cyw, p.x, p.y)); return G.freeSpot(todo[0], todo[0].cxw, todo[0].cyw); }
  const boss = G.D.rooms.find(r=> r.type === "boss" && !r.cleared);
  if(boss) return G.freeSpot(boss, boss.cxw, boss.cyw);
  if(G.portal) return { x:G.portal.x, y:G.portal.y, use:true };
  return null;
};
Bot.prototype.input = function(dt){
  const G = this.G, p = G.player;
  this.t += dt; this.repath -= dt;
  const goal = this.chooseGoal();
  const I = { mx:0, my:0, ax:p.x + Math.cos(p.aim), ay:p.y + Math.sin(p.aim), fire:false, spell:false, blink:false, use:false, swap:false, reload:false, slot:-1 };
  // hold the best gun
  let bi = 0; p.guns.forEach((g, i)=>{ if(DG.Loot.dps(g, G.mods) > DG.Loot.dps(p.guns[bi], G.mods)) bi = i; });
  if(bi !== p.cur) I.slot = bi;
  if(!goal) return I;
  const e = goal.enemy;
  if(e){ I.ax = e.x; I.ay = e.y; I.fire = G.los(p.x, p.y, e.x, e.y); I.spell = I.fire && p.mana > 60 && this.rng.next() < 0.02; I.active = !!(p.active && p.active.charge >= p.active.max && this.rng.next() < 0.05); }
  // dodge: blink away from shots that are about to hit
  const threat = G.bullets.find(b=> b.team === "e" && DG.dist(b.x, b.y, p.x, p.y) < 1.4);
  if(threat && p.blinkCd <= 0 && this.rng.next() < (this.opts.dodge === undefined ? 0.5 : this.opts.dodge)){ I.blink = true; I.mx = -threat.vy; I.my = threat.vx; return I; }
  const d = DG.dist(goal.x, goal.y, p.x, p.y);
  if(e && d < 4.5 && G.los(p.x, p.y, e.x, e.y)){
    // kite: back off and circle
    const a = Math.atan2(p.y - e.y, p.x - e.x) + 0.9;
    I.mx = Math.cos(a); I.my = Math.sin(a);
    return I;
  }
  if(goal.use && d < 1.2){ I.use = true; if(goal.key) this.visitedProps[goal.key] = true; return I; }
  if(this.repath <= 0 || !this.path || !this.path.length){
    this.repath = 0.4;
    this.path = this.bfs(Math.floor(p.x), Math.floor(p.y), Math.floor(goal.x), Math.floor(goal.y));
    if(!this.path && goal.key) this.visitedProps[goal.key] = true;
  }
  if(this.path && this.path.length){
    while(this.path.length > 1 && DG.dist(this.path[0][0], this.path[0][1], p.x, p.y) < 0.35) this.path.shift();
    const [wx, wy] = this.path[0];
    const l = Math.hypot(wx - p.x, wy - p.y) || 1;
    I.mx = (wx - p.x)/l; I.my = (wy - p.y)/l;
  }
  return I;
};
DG.Bot = Bot;
})(typeof window !== "undefined" ? window : globalThis);
