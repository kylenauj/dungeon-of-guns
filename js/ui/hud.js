/* ------------------------------------------------------------------ *
 *  The HUD, drawn on one canvas over the game: Pine Hollow's slanted
 *  plates with hard ink shadows.
 *
 *  Top left: health (with wards), mana, XP and level, gold, flies, the
 *  active item, every powerup you own, Gribbus' tricks. Top right: the
 *  map and curses. Bottom left: your guns. Middle: what E does, item
 *  banners (Isaac-style), duos, reactions. Over the world: damage
 *  numbers, barks, health bars, price tags, the crosshair.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, S = DG.Stage;
const H = DG.HUD = { nums:[], barks:[], toasts:[], banner:null, card:null };
const INK = "#07060a", CREAM = "#f3e6c4", SIGNAL = "#ffd23d", HP = "#ff4a5a", MANA = "#4aa8ff", DIM = "#a89a88", WARD = "#8ad8ff", XP = "#b8ff6a";
const F = (w, s)=> w + " " + s + "px 'Saira Condensed','Arial Narrow',sans-serif";
const hex = c=> "#" + new THREE.Color(c).getHexString();

H.init = function(){
  const c = H.canvas = document.getElementById("hud");
  H.g = c.getContext("2d");
  const fit = ()=>{ const d = Math.min(2, devicePixelRatio || 1); c.width = innerWidth*d; c.height = innerHeight*d; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px"; H.dpr = d; };
  fit(); addEventListener("resize", fit);
};
H.reset = function(){ H.nums = []; H.barks = []; H.toasts = []; H.banner = null; H.card = null; H.bossT = 0; };

/* ---- events that put something on screen ---- */
H.handle = function(ev, G){
  const p = G.player;
  switch(ev.type){
    case "hit": H.nums.push({ x:ev.x + (Math.random() - 0.5)*0.4, y:ev.y, z:1.4, v:Math.round(ev.amt), crit:ev.crit, t:0, col:ev.el ? hex(DG.ELEMENTS[ev.el].color) : CREAM }); break;
    case "hurt": H.nums.push({ x:p.x, y:p.y, z:2, v:"-" + Math.round(ev.amt), crit:true, t:0, col:HP }); H.hurtT = 0.5; break;
    case "wardBreak": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"WARD!", crit:true, t:0, col:WARD }); break;
    case "heal": H.nums.push({ x:ev.x, y:ev.y, z:2, v:"+" + Math.round(ev.amt), t:0, col:"#5aff8a" }); break;
    case "coin": H.coinT = 0.3; break;
    case "msg": H.toast(ev.text, ev.dur); break;
    case "bark": H.barks.push({ id:ev.id, x:ev.x, y:ev.y, text:ev.text, t:0 }); break;
    case "floor": H.banner = { a:"FLOOR " + ev.floor, b:ev.name, t:0 }; break;
    case "clear": H.banner = { a:"ROOM CLEAR", b:"", t:0, short:true }; break;
    case "react": H.nums.push({ x:ev.x, y:ev.y, z:2.4, v:ev.name + "!", crit:true, t:-0.1, col:hex(ev.color), big:true }); break;
    case "slip": if(!ev.enemy) H.nums.push({ x:p.x, y:p.y, z:2.2, v:"WHEEE", t:0, col:SIGNAL, crit:true }); break;
    case "fall": if(ev.who === "enemy") H.nums.push({ x:ev.x, y:ev.y, z:1, v:"bye!", t:0, col:DIM }); break;
    case "bonk": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"BONK", t:0, col:SIGNAL, crit:true }); break;
    case "dizzy": H.nums.push({ x:ev.x, y:ev.y, z:2.6, v:"DIZZY", t:0, col:SIGNAL }); break;
    case "nomana": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"no mana", t:0, col:MANA }); break;
    case "nocharge": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"not charged", t:0, col:DIM }); break;
    case "levelup": H.nums.push({ x:p.x, y:p.y, z:2.6, v:"LEVEL UP!", t:0, col:XP, crit:true, big:true }); break;
    case "item": H.card = { title:ev.name, sub:ev.desc, flavor:ev.flavor, col:DG.TIERS[ev.tier].color, tier:DG.TIERS[ev.tier].name, t:0, life:ev.tier >= 4 ? 5 : 3.6 }; break;
    case "duo": H.card = { title:"DUO! " + ev.name, sub:ev.desc, col:"#ff4fd8", tier:"SYNERGY", t:0, life:4 }; break;
    case "ascend": H.card = { title:"ASCENSION: " + ev.name, sub:ev.flavor, col:"#ffb12e", tier:"YOUR GUN EVOLVED", t:0, life:4.5 }; break;
    case "frogbuff": H.card = { title:"GRIBBUS LEARNED " + ev.name.toUpperCase(), sub:ev.desc, col:"#9cff6a", tier:"FROG TRICK", t:0, life:3.6 }; break;
    case "boon": H.nums.push({ x:p.x, y:p.y, z:2.6, v:ev.name, t:0, col:XP, crit:true }); break;
    case "fly": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"GOLDEN FLY", t:0, col:SIGNAL, crit:true, big:true }); break;
    case "pickup": if(ev.kind === "active") H.card = { title:DG.ACTIVES[ev.id].name, sub:DG.ACTIVES[ev.id].desc + " (F)", col:SIGNAL, tier:"ACTIVE ITEM", t:0, life:3.2 }; break;
    case "graze": H.nums.push({ x:ev.x, y:ev.y, z:1.2, v:"mine!", t:0, col:CREAM }); break;
  }
};
H.toast = function(text, dur){
  H.toasts = H.toasts.filter(t=> t.text !== text);
  H.toasts.push({ text, t:0, dur:dur || 2.6 });
  if(H.toasts.length > 4) H.toasts.shift();
};

function plate(g, x, y, w, h, fill, skew){
  skew = skew === undefined ? 6 : skew;
  const path = ()=>{ g.beginPath(); g.moveTo(x + skew, y); g.lineTo(x + w + skew, y); g.lineTo(x + w - skew, y + h); g.lineTo(x - skew, y + h); g.closePath(); };
  g.save(); g.translate(4, 4); path(); g.fillStyle = INK; g.fill(); g.restore();
  path(); g.fillStyle = fill || "rgba(18,14,22,.88)"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
}
function bar(g, x, y, w, h, k, col, back){
  plate(g, x, y, w, h, back || "rgba(18,14,22,.88)");
  if(k > 0){
    const ww = Math.max(0, (w - 6)*Math.min(1, k)), s = 5;
    g.beginPath(); g.moveTo(x + 3 + s, y + 3); g.lineTo(x + 3 + ww + s, y + 3); g.lineTo(x + 3 + ww - s + 2, y + h - 3); g.lineTo(x + 3 - s + 2, y + h - 3); g.closePath();
    g.fillStyle = col; g.fill();
  }
}
function text(g, s, x, y, size, col, align, weight){
  g.font = F(weight || "800", size); g.textAlign = align || "left"; g.textBaseline = "middle";
  g.fillStyle = INK; g.fillText(s, x + 2, y + 2);
  g.fillStyle = col || CREAM; g.fillText(s, x, y);
}
function wrap(g, s, maxW){
  const words = String(s).split(" "), lines = []; let cur = "";
  words.forEach(w=>{ const t = cur ? cur + " " + w : w; if(g.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
  if(cur) lines.push(cur);
  return lines;
}
function chip(g, x, y, s, col, label, k){
  g.fillStyle = INK; g.fillRect(x - s/2 - 2, y - s/2 - 2, s + 4, s + 4);
  g.fillStyle = col; g.fillRect(x - s/2, y - s/2, s, s);
  text(g, label, x, y + 1, s*0.62, INK, "center", "900");
}

/* ---- per frame ---- */
H.draw = function(G, dt, opts){
  opts = opts || {};
  const g = H.g, d = H.dpr, W = innerWidth, Hh = innerHeight, p = G.player;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, W, Hh);
  if(opts.hidden) return;
  const small = W < 700, k = small ? 0.8 : 1;

  H.hurtT = Math.max(0, (H.hurtT || 0) - dt);
  const low = p.hp/p.maxHp < 0.3 ? 0.25 + 0.15*Math.sin(G.t*6) : 0;
  const red = Math.max(H.hurtT, low);
  if(red > 0){
    const gr = g.createRadialGradient(W/2, Hh/2, Math.min(W, Hh)*0.35, W/2, Hh/2, Math.max(W, Hh)*0.75);
    gr.addColorStop(0, "rgba(255,0,30,0)"); gr.addColorStop(1, "rgba(255,0,30," + (red*0.6) + ")");
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  }

  // over the world: health bars, price tags, barks, numbers
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || e.boss || e.hidden || e.decoy) return;
    if(e.hp >= e.maxHp && !e.affix) return;
    const s = S.project(e.x, 1.4*(e.r/0.34)*(e.affix && DG.AFFIXES[e.affix].size || 1) + 0.4, e.y); if(s.behind) return;
    const w = 34*k;
    g.fillStyle = INK; g.fillRect(s.x - w/2 - 2, s.y - 2, w + 4, 8);
    g.fillStyle = e.affix ? hex(DG.AFFIXES[e.affix].tint) : HP; g.fillRect(s.x - w/2, s.y, w*Math.max(0, e.hp/e.maxHp), 4);
    if(e.affix) text(g, DG.AFFIXES[e.affix].name.toUpperCase(), s.x, s.y - 10, 11*k, hex(DG.AFFIXES[e.affix].tint), "center", "700");
    if(e.st.poison && e.st.poison.stacks > 0) text(g, "☣" + e.st.poison.stacks, s.x + w/2 + 6, s.y + 2, 12*k, "#7dff3a", "left", "700");
  });
  if(G.room) G.room.props.forEach(pr=>{
    if(pr.kind !== "pedestal" || pr.taken || !pr.offer || DG.dist(pr.x + 0.5, pr.y + 0.5, p.x, p.y) > 5) return;
    const o = pr.offer, s = S.project(pr.x + 0.5, 1.9, pr.y + 0.5);
    const name = o.kind === "item" ? DG.ITEMS[o.id].name : o.kind === "gun" ? o.gun.name : o.name;
    const col = o.kind === "item" ? DG.TIERS[DG.ITEMS[o.id].tier].color : o.kind === "gun" ? DG.RARITY[o.gun.rarity].color : CREAM;
    text(g, name, s.x, s.y, 13*k, col, "center", "800");
    if(o.currency) text(g, o.currency === "gold" ? o.price + "g" : "-" + o.price + " max HP", s.x, s.y + 15*k, 12*k, o.currency === "gold" ? (p.gold >= o.price ? SIGNAL : HP) : HP, "center", "900");
  });
  H.barks = H.barks.filter(b=>{
    b.t += dt;
    const e = G.enemies.find(o=> o.id === b.id); if(e){ b.x = e.x; b.y = e.y; }
    const s = S.project(b.x, 2.4, b.y);
    g.font = F("700", 14*k); const tw = g.measureText(b.text).width + 14;
    g.globalAlpha = Math.min(1, (1.6 - b.t)*3);
    g.fillStyle = CREAM; g.strokeStyle = INK; g.lineWidth = 2.5;
    g.beginPath(); g.rect(s.x - tw/2, s.y - 26, tw, 20); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(s.x - 4, s.y - 6); g.lineTo(s.x + 3, s.y - 6); g.lineTo(s.x - 2, s.y + 2); g.closePath(); g.fill();
    g.fillStyle = INK; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(b.text, s.x, s.y - 16);
    g.globalAlpha = 1;
    return b.t < 1.6;
  });
  H.nums = H.nums.filter(n=>{
    n.t += dt;
    if(n.t < 0) return true;
    const s = S.project(n.x, n.z + n.t*1.6, n.y);
    g.globalAlpha = Math.min(1, ((n.big ? 1.3 : 0.9) - n.t)*4);
    const sz = (n.big ? 26 : n.crit ? 22 : 15)*k*(n.t < 0.08 ? 1.4 : 1);
    text(g, String(n.v), s.x, s.y, sz, n.col, "center", "900");
    g.globalAlpha = 1;
    return n.t < (n.big ? 1.3 : 0.9);
  });

  // ---- top left: health, wards, mana, xp, blink, gold ----
  const x0 = 22, y0 = 18, bw = 230*k;
  bar(g, x0, y0, bw, 24*k, p.hp/p.maxHp, HP);
  text(g, Math.ceil(p.hp) + " / " + p.maxHp, x0 + 12, y0 + 12*k + 1, 15*k, CREAM, "left", "800");
  for(let i=0;i<p.wards;i++){ const wx = x0 + bw + 18 + i*16*k; g.fillStyle = INK; g.beginPath(); g.arc(wx + 1, y0 + 13*k, 7*k + 1, 0, Math.PI*2); g.fill(); g.fillStyle = WARD; g.beginPath(); g.arc(wx, y0 + 12*k, 6.5*k, 0, Math.PI*2); g.fill(); }
  bar(g, x0, y0 + 30*k, bw*0.82, 16*k, p.mana/p.maxMana, MANA);
  text(g, Math.floor(p.mana) + "", x0 + 12, y0 + 38*k + 1, 12*k, CREAM, "left", "700");
  const bk = 1 - p.blinkCd/(DG.PLAYER.blink.cd*Math.max(0.3, 1 - G.mods.blinkCd));
  plate(g, x0 + bw*0.82 + 16, y0 + 30*k, 44*k, 16*k, bk >= 1 ? "#6a3ab0" : "rgba(18,14,22,.88)");
  text(g, bk >= 1 ? "BLINK" : Math.ceil(p.blinkCd*10)/10 + "", x0 + bw*0.82 + 16 + 22*k, y0 + 38*k + 1, 11*k, CREAM, "center", "800");
  // xp
  const need = DG.PLAYER.xp(p.level);
  bar(g, x0, y0 + 52*k, bw*0.82, 10*k, p.xp/need, XP);
  text(g, "LV " + p.level + (p.pendingLevels ? "  +" + p.pendingLevels + " waiting" : ""), x0 + bw*0.82 + 18, y0 + 57*k + 1, 12*k, XP, "left", "900");
  // gold, flies
  H.coinT = Math.max(0, (H.coinT || 0) - dt);
  const yr = y0 + 80*k;
  g.fillStyle = "#ffc83a"; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.arc(x0 + 9, yr, 8*(1 + H.coinT), 0, Math.PI*2); g.fill(); g.stroke();
  text(g, p.gold + "", x0 + 24, yr, 18*k, SIGNAL, "left", "900");
  if(G.meta.flies){ text(g, "✦" + G.meta.flies, x0 + 80*k, yr, 15*k, SIGNAL, "left", "900"); }
  // the active item
  if(p.active){
    const A = DG.ACTIVES[p.active.id], ax = x0 + 130*k, full = p.active.charge >= p.active.max;
    plate(g, ax, yr - 12*k, 140*k, 24*k, full ? "#5a4a10" : "rgba(18,14,22,.88)");
    text(g, "[F] " + A.name, ax + 8, yr, 12*k, full ? SIGNAL : DIM, "left", "800");
    for(let i=0;i<p.active.max;i++){ g.fillStyle = INK; g.fillRect(ax + 8 + i*12*k, yr + 9*k, 10*k, 5*k); g.fillStyle = i < Math.floor(p.active.charge) ? SIGNAL : "#3a3440"; g.fillRect(ax + 9 + i*12*k, yr + 10*k, 8*k, 3*k); }
  }
  // every powerup owned, as chips; Gribbus' tricks under them
  const ids = Object.keys(p.items).filter(id=> DG.ITEMS[id]);
  const cs = 18*k, perRow = Math.floor((small ? 260 : 380)/(cs + 5));
  ids.forEach((id, i)=>{
    const it = DG.ITEMS[id], cx = x0 + 10 + (i % perRow)*(cs + 5), cy = yr + 26*k + Math.floor(i/perRow)*(cs + 5);
    chip(g, cx, cy, cs, DG.TIERS[it.tier].color, it.name[0] + (p.items[id] > 1 ? p.items[id] : ""), k);
  });
  const fy = yr + 26*k + Math.ceil(ids.length/perRow)*(cs + 5) + (ids.length ? 4 : 0);
  if(G.gribbus && G.gribbus.buffs.length){
    text(g, "GRIBBUS:", x0, fy + 2, 11*k, "#9cff6a", "left", "900");
    G.gribbus.buffs.forEach((b, i)=> chip(g, x0 + 66*k + i*(cs + 5), fy + 2, cs*0.9, "#9cff6a", DG.FROG_BUFFS[b].name[0], k));
  }
  // hover an item chip: what is it?
  const m = DG.Input.mouse;
  ids.forEach((id, i)=>{
    const cx = x0 + 10 + (i % perRow)*(cs + 5), cy = yr + 26*k + Math.floor(i/perRow)*(cs + 5);
    if(Math.abs(m.x - cx) < cs/2 && Math.abs(m.y - cy) < cs/2){
      const it = DG.ITEMS[id]; g.font = F("700", 13*k);
      const lines = wrap(g, it.desc, 260);
      plate(g, cx + 14, cy, 280, 26 + lines.length*16, "rgba(18,14,22,.96)");
      text(g, it.name, cx + 24, cy + 12, 14*k, DG.TIERS[it.tier].color, "left", "900");
      lines.forEach((l, j)=> text(g, l, cx + 24, cy + 30 + j*16, 12*k, CREAM, "left", "600"));
    }
  });

  // ---- top middle: the boss ----
  const B = G.bossRef;
  if(B && !B.dead && B.spawn <= 0){
    H.bossT = Math.min(1, (H.bossT || 0) + dt*2);
    const w = Math.min(560, W*0.6), bx = W/2 - w/2, by = 22;
    g.globalAlpha = H.bossT;
    bar(g, bx, by + 18, w, 18, B.hp/B.maxHp, B.invuln ? "#6a6a74" : B.ai.raged || (B.ai.phase || 0) > 0 ? "#ff2a4a" : "#c03a5a");
    text(g, G.bossName().toUpperCase(), W/2, by + 6, 17*k, SIGNAL, "center", "900");
    g.globalAlpha = 1;
  }

  // ---- top right: the map, curses, goblins left ----
  const mapH = H.minimap(g, G, W - 20, 18, small) || 0;
  let ry = 18 + mapH + 10;
  G.curses.forEach(c=>{ const lw = 150*k; plate(g, W - 20 - lw, ry, lw, 20*k, "rgba(60,10,40,.9)"); text(g, DG.CURSES[c].name, W - 20 - lw/2, ry + 10*k + 1, 12*k, "#ff8ad8", "center", "800"); ry += 26*k; });
  if(G.room && G.room.active){
    const left = G.enemies.filter(e=> !e.dead && e.room === G.room.id && !e.decoy), waves = G.room.waves.length - G.room.wave;
    const label = left.length + (left.length === 1 ? " ENEMY LEFT" : " ENEMIES LEFT") + (waves > 0 ? " · " + waves + " MORE WAVE" + (waves > 1 ? "S" : "") : "");
    g.font = F("900", 14*k); const lw = g.measureText(label).width + 28;
    plate(g, W - 20 - lw, ry, lw, 24*k, "rgba(90,20,30,.9)");
    text(g, label, W - 20 - lw/2, ry + 12*k + 1, 14*k, CREAM, "center", "900");
    if(left.length <= 3) left.forEach(e=>{
      if(e.spawn > 0) return;
      const s = S.project(e.x, 1, e.y), mg = 40;
      const on = !s.behind && s.x > mg && s.x < W - mg && s.y > mg && s.y < Hh - mg;
      if(on && !e.hidden) return;
      const cx = W/2, cy = Hh/2, a = Math.atan2(s.y - cy, s.x - cx);
      let ax = s.x, ay = s.y;
      if(!on){ const t = Math.min((W/2 - mg)/Math.abs(Math.cos(a) || 1e-6), (Hh/2 - mg)/Math.abs(Math.sin(a) || 1e-6)); ax = cx + Math.cos(a)*t; ay = cy + Math.sin(a)*t; }
      g.save(); g.translate(ax, ay); g.rotate(on ? Math.PI/2 : a);
      g.globalAlpha = 0.6 + 0.4*Math.sin(G.t*8);
      g.beginPath(); g.moveTo(14, 0); g.lineTo(-8, -10); g.lineTo(-3, 0); g.lineTo(-8, 10); g.closePath();
      g.fillStyle = "#ff4a5a"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
      g.restore(); g.globalAlpha = 1;
    });
  }

  // ---- bottom left: the guns ----
  H.guns(g, G, 22, Hh - 20, k);

  // ---- bottom middle: what E does ----
  const tg = G.target();
  if(tg && G.state === "play"){
    g.font = F("800", 17*k);
    const label = tg.text, tw = g.measureText(label).width + 56;
    plate(g, W/2 - tw/2, Hh - 120*k, tw, 32*k, "rgba(18,14,22,.92)");
    g.fillStyle = CREAM; g.fillRect(W/2 - tw/2 + 14, Hh - 120*k + 7*k, 22, 18*k);
    text(g, DG.Input.usingPad ? "X" : "E", W/2 - tw/2 + 25, Hh - 120*k + 16*k, 13*k, INK, "center", "900");
    text(g, label, W/2 - tw/2 + 44, Hh - 120*k + 16*k, 17*k, CREAM, "left", "800");
  }

  // ---- toasts ----
  H.toasts = H.toasts.filter(t=>{ t.t += dt; return t.t < t.dur; });
  let ty = Hh*0.18;
  H.toasts.forEach(t=>{
    g.font = F("800", 19*k);
    const lines = wrap(g, t.text, Math.min(620, W - 60));
    const tw = Math.max(...lines.map(l=> g.measureText(l).width)) + 40, th = lines.length*24*k + 12;
    g.globalAlpha = Math.min(1, t.t*6, (t.dur - t.t)*3);
    plate(g, W/2 - tw/2, ty, tw, th, "rgba(18,14,22,.9)");
    lines.forEach((l, i)=> text(g, l, W/2, ty + 6 + 12*k + i*24*k, 19*k, CREAM, "center", "800"));
    g.globalAlpha = 1;
    ty += th + 10;
  });

  // ---- the item card: what you just got ----
  if(H.card){
    const c = H.card; c.t += dt;
    if(c.t > c.life) H.card = null;
    else {
      g.globalAlpha = Math.min(1, c.t*5, (c.life - c.t)*3);
      const y = Hh*0.64, scale = c.t < 0.15 ? 1 + (0.15 - c.t)*2 : 1;
      g.font = F("900", 36*k*scale); const tw = Math.max(g.measureText(c.title).width + 60, 360);
      plate(g, W/2 - tw/2, y - 34*k, tw, 96*k, "rgba(18,14,22,.92)");
      text(g, c.tier, W/2, y - 20*k, 12*k, c.col, "center", "900");
      text(g, c.title, W/2, y + 6*k, 34*k*scale, c.col, "center", "900");
      text(g, c.sub || "", W/2, y + 34*k, 15*k, CREAM, "center", "700");
      if(c.flavor) text(g, c.flavor, W/2, y + 52*k, 13*k, DIM, "center", "600");
      g.globalAlpha = 1;
    }
  }

  // ---- the big banner ----
  if(H.banner){
    const b = H.banner; b.t += dt;
    const life = b.short ? 1.2 : 2.8;
    if(b.t > life) H.banner = null;
    else {
      g.globalAlpha = Math.min(1, b.t*5, (life - b.t)*3);
      const y = Hh*0.36;
      text(g, b.a, W/2, y, (b.short ? 34 : 54)*k, b.short ? CREAM : SIGNAL, "center", "900");
      if(b.b) text(g, b.b, W/2, y + 40*k, 22*k, CREAM, "center", "700");
      g.globalAlpha = 1;
    }
  }

  if(!opts.noCursor) H.crosshair(g, G);
};

H.crosshair = function(g, G){
  const m = DG.Input.mouse, p = G.player, s = G.gunStats();
  const r = 9 + (p.reloadT > 0 ? 3 : 0);
  g.lineWidth = 4; g.strokeStyle = INK;
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  g.lineWidth = 2; g.strokeStyle = CREAM;
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  const els = G.shotEls(G.gun());
  els.forEach((el, i)=>{ const a = i/els.length*Math.PI*2 + G.t*2; g.fillStyle = hex(DG.ELEMENTS[el].color); g.fillRect(m.x + Math.cos(a)*(els.length > 1 ? 4 : 0) - 2, m.y + Math.sin(a)*(els.length > 1 ? 4 : 0) - 2, 4, 4); });
  if(p.reloadT > 0){
    g.lineWidth = 4; g.strokeStyle = SIGNAL;
    g.beginPath(); g.arc(m.x, m.y, r + 6, -Math.PI/2, -Math.PI/2 + Math.PI*2*(1 - p.reloadT/s.reload)); g.stroke();
  }
};

/* ---- the gun cards ---- */
H.guns = function(g, G, x, yb, k){
  const p = G.player;
  p.guns.forEach((gun, i)=>{
    const cur = i === p.cur, s = DG.Loot.stats(gun, G.mods), R = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element];
    const ec = hex(E.color);
    if(cur){
      const w = 320*k, h = 96*k, y = yb - h;
      plate(g, x, y, w, h, "rgba(18,14,22,.92)");
      g.fillStyle = ec; g.fillRect(x + 4, y + 4, 6, h - 8);
      text(g, gun.name, x + 18, y + 16*k, 17*k, gun.ascended ? "#ffb12e" : R.color, "left", "900");
      text(g, (gun.ascended ? "ASCENDED · " : R.name.toUpperCase() + " · ") + "LVL " + gun.level + " · " + Math.round(s.dmg*10)/10 + (s.pellets > 1 ? "×" + s.pellets : "") + " DMG", x + 18, y + 35*k, 11*k, DIM, "left", "700");
      // every element the shots carry
      G.shotEls(gun).forEach((el, j)=>{ const ex = x + w - 20*k - j*16*k; g.fillStyle = INK; g.beginPath(); g.arc(ex + 1, y + 17*k, 7*k, 0, Math.PI*2); g.fill(); g.fillStyle = hex(DG.ELEMENTS[el].color); g.beginPath(); g.arc(ex, y + 16*k, 6*k, 0, Math.PI*2); g.fill(); });
      const ay = y + 54*k;
      if(s.mag <= 14){ for(let j=0;j<s.mag;j++){ g.fillStyle = INK; g.fillRect(x + 18 + j*13*k, ay - 1, 10*k, 14*k); g.fillStyle = j < gun.ammo ? CREAM : "#3a3440"; g.fillRect(x + 19 + j*13*k, ay, 8*k, 12*k); } }
      else text(g, gun.ammo + " / " + s.mag, x + 18, ay + 6*k, 16*k, CREAM, "left", "900");
      if(p.reloadT > 0) text(g, "RELOADING", x + w - 16, ay + 6*k, 13*k, SIGNAL, "right", "900");
      const sp = DG.SPELLS[s.spell], can = p.mana >= s.spellCost;
      text(g, "RMB  " + sp.name + "  " + s.spellCost, x + 18, y + 80*k, 13*k, can ? ec : "#5a5260", "left", "800");
      if(gun.innate && gun.innate.length) text(g, "+ " + gun.innate.map(id=> DG.ITEMS[id] ? DG.ITEMS[id].name : id).join(", "), x + w - 12, y + 80*k, 10*k, "#c8b8e8", "right", "700");
      x += w + 18;
    } else {
      const w = 150*k, h = 44*k, y = yb - h;
      plate(g, x, y, w, h, "rgba(18,14,22,.75)");
      g.fillStyle = ec; g.fillRect(x + 4, y + 4, 4, h - 8);
      g.font = F("800", 13*k);
      let nm = gun.name; while(g.measureText(nm).width > w - 40 && nm.length > 4) nm = nm.slice(0, -2);
      text(g, nm + (nm !== gun.name ? "…" : ""), x + 14, y + 15*k, 13*k, R.color, "left", "800");
      text(g, "[" + (i + 1) + "]  " + gun.ammo + "/" + s.mag, x + 14, y + 32*k, 11*k, DIM, "left", "700");
      x += w + 14;
    }
  });
};

/* ---- the map: one box per known room (jumbo rooms span cells) ---- */
H.minimap = function(g, G, xr, y, small){
  const D = G.D, cs = small ? 9 : 12, gap = 3, lost = G.curses.indexOf("lost") >= 0;
  const shown = D.rooms.filter(r=> r.seen || (r.type === "secret" && r.found) || (!lost && r.type !== "secret" && r.links.some(id=> D.rooms[id].seen && D.rooms[id].type !== "secret")) || r.hinted || (r.known && r.type !== "secret"));
  if(!shown.length) return 0;
  const cells = []; shown.forEach(r=> r.cells.forEach(c=> cells.push(c)));
  const minx = Math.min(...cells.map(c=> c[0])), maxx = Math.max(...cells.map(c=> c[0])), miny = Math.min(...cells.map(c=> c[1])), maxy = Math.max(...cells.map(c=> c[1]));
  const cw = cs*1.4 + gap, ch = cs + gap;
  const w = (maxx - minx + 1)*cw + 16, h = (maxy - miny + 1)*ch + 16;
  const x = xr - w;
  plate(g, x, y, w, h, "rgba(18,14,22,.8)", 4);
  const ICON = { boss:"☠", shop:"$", treasure:"◆", puzzle:"?", secret:"★", pond:"♣", altar:"†", start:"" };
  shown.forEach(r=>{
    const here = G.room === r, seen = r.seen || r.found;
    const rx = x + 8 + (r.c0x - minx)*cw, ry = y + 8 + (r.c0y - miny)*ch;
    const rw = (r.c1x - r.c0x + 1)*cw - gap, rh = (r.c1y - r.c0y + 1)*ch - gap;
    if(!seen){ g.strokeStyle = "#5a5260"; g.lineWidth = 2; g.strokeRect(rx, ry, rw, rh); }
    else { g.fillStyle = here ? SIGNAL : r.cleared ? "#8a7e90" : r.active ? "#ff4a5a" : "#5a5260"; g.fillRect(rx, ry, rw, rh); }
    const ic = ICON[r.type];
    if(ic && (seen || r.hinted)) text(g, ic, rx + rw/2, ry + rh/2 + 1, cs*0.9, here ? INK : r.type === "boss" ? "#ff4a5a" : r.type === "pond" ? "#9cff6a" : r.type === "altar" ? "#ff4a8a" : SIGNAL, "center", "900");
  });
  if(lost) text(g, "?", x + w/2, y + h/2, 20, "#ff8ad8", "center", "900");
  return h;
};

})();
