/* ------------------------------------------------------------------ *
 *  The HUD, drawn on one canvas over the game: Pine Hollow's slanted
 *  plates with hard ink shadows.
 *
 *  Top left: health, mana, gold, relics. Top right: the map. Bottom
 *  left: your guns. Bottom middle: what E does. Over the world: damage
 *  numbers, goblin barks, health bars, and the crosshair.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, S = DG.Stage;
const H = DG.HUD = { nums:[], barks:[], toasts:[], banner:null };
const INK = "#07060a", CREAM = "#f3e6c4", SIGNAL = "#ffd23d", HP = "#ff4a5a", MANA = "#4aa8ff", DIM = "#a89a88";
const F = (w, s)=> w + " " + s + "px 'Saira Condensed','Arial Narrow',sans-serif";

H.init = function(){
  const c = H.canvas = document.getElementById("hud");
  H.g = c.getContext("2d");
  const fit = ()=>{ const d = Math.min(2, devicePixelRatio || 1); c.width = innerWidth*d; c.height = innerHeight*d; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px"; H.dpr = d; };
  fit(); addEventListener("resize", fit);
};
H.reset = function(){ H.nums = []; H.barks = []; H.toasts = []; H.banner = null; H.bossT = 0; };

/* ---- events that put something on screen ---- */
H.handle = function(ev, G){
  switch(ev.type){
    case "hit": H.nums.push({ x:ev.x + (Math.random() - 0.5)*0.4, y:ev.y, z:1.4, v:Math.round(ev.amt), crit:ev.crit, t:0, col:ev.el ? "#" + new THREE.Color(DG.ELEMENTS[ev.el].color).getHexString() : CREAM }); break;
    case "hurt": H.nums.push({ x:G.player.x, y:G.player.y, z:2, v:"-" + Math.round(ev.amt), crit:true, t:0, col:HP }); H.hurtT = 0.5; break;
    case "heal": H.nums.push({ x:ev.x, y:ev.y, z:2, v:"+" + Math.round(ev.amt), t:0, col:"#5aff8a" }); break;
    case "coin": H.coinT = 0.3; break;
    case "msg": H.toast(ev.text, ev.dur); break;
    case "bark": H.barks.push({ id:ev.id, x:ev.x, y:ev.y, text:ev.text, t:0 }); break;
    case "floor": H.banner = { a:"FLOOR " + ev.floor, b:ev.name, t:0 }; break;
    case "clear": H.banner = { a:"ROOM CLEAR", b:"", t:0, short:true }; break;
    case "slip": if(!ev.enemy) H.nums.push({ x:G.player.x, y:G.player.y, z:2.2, v:"WHEEE", t:0, col:SIGNAL, crit:true }); break;
    case "fall": if(ev.who === "enemy") H.nums.push({ x:ev.x, y:ev.y, z:1, v:"bye!", t:0, col:DIM }); break;
    case "bonk": H.nums.push({ x:G.player.x, y:G.player.y, z:2.4, v:"BONK", t:0, col:SIGNAL, crit:true }); break;
    case "dizzy": H.nums.push({ x:ev.x, y:ev.y, z:2.6, v:"DIZZY", t:0, col:SIGNAL }); break;
    case "nomana": H.nums.push({ x:G.player.x, y:G.player.y, z:2.2, v:"no mana", t:0, col:MANA }); break;
  }
};
H.toast = function(text, dur){
  H.toasts = H.toasts.filter(t=> t.text !== text);
  H.toasts.push({ text, t:0, dur:dur || 2.6 });
  if(H.toasts.length > 4) H.toasts.shift();
};

/* a slanted plate with a hard shadow */
function plate(g, x, y, w, h, fill, skew){
  skew = skew === undefined ? 6 : skew;
  const path = ()=>{ g.beginPath(); g.moveTo(x + skew, y); g.lineTo(x + w + skew, y); g.lineTo(x + w - skew, y + h); g.lineTo(x - skew, y + h); g.closePath(); };
  g.save(); g.translate(4, 4); path(); g.fillStyle = INK; g.fill(); g.restore();
  path(); g.fillStyle = fill || "rgba(18,14,22,.88)"; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
}
function bar(g, x, y, w, h, k, col, back){
  plate(g, x, y, w, h, back || "rgba(18,14,22,.88)");
  if(k > 0){
    const s = 6*(1 - 0), ww = Math.max(0, (w - 6)*Math.min(1, k));
    g.beginPath(); g.moveTo(x + 3 + s - 1, y + 3); g.lineTo(x + 3 + ww + s - 1, y + 3); g.lineTo(x + 3 + ww - s + 1, y + h - 3); g.lineTo(x + 3 - s + 1, y + h - 3); g.closePath();
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

/* ---- per frame ---- */
H.draw = function(G, dt, opts){
  opts = opts || {};
  const g = H.g, d = H.dpr, W = innerWidth, Hh = innerHeight, p = G.player;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, W, Hh);
  if(opts.hidden) return;
  const small = W < 700;
  const k = small ? 0.8 : 1;

  // hurt: a red edge that fades; low health: it pulses
  H.hurtT = Math.max(0, (H.hurtT || 0) - dt);
  const low = p.hp/p.maxHp < 0.3 ? 0.25 + 0.15*Math.sin(G.t*6) : 0;
  const red = Math.max(H.hurtT, low);
  if(red > 0){
    const gr = g.createRadialGradient(W/2, Hh/2, Math.min(W, Hh)*0.35, W/2, Hh/2, Math.max(W, Hh)*0.75);
    gr.addColorStop(0, "rgba(255,0,30,0)"); gr.addColorStop(1, "rgba(255,0,30," + (red*0.6) + ")");
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  }

  // over the world: enemy health bars, barks, damage numbers
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || e.boss || e.hidden) return;
    if(e.hp >= e.maxHp && !e.affix) return;
    const s = S.project(e.x, 1.5*(e.r/0.34)*(e.affix && DG.AFFIXES[e.affix].size || 1) + 0.4, e.y); if(s.behind) return;
    const w = 34*k;
    g.fillStyle = INK; g.fillRect(s.x - w/2 - 2, s.y - 2, w + 4, 8);
    g.fillStyle = e.affix ? "#" + new THREE.Color(DG.AFFIXES[e.affix].tint).getHexString() : HP; g.fillRect(s.x - w/2, s.y, w*Math.max(0, e.hp/e.maxHp), 4);
    if(e.affix) text(g, DG.AFFIXES[e.affix].name.toUpperCase(), s.x, s.y - 10, 11*k, "#" + new THREE.Color(DG.AFFIXES[e.affix].tint).getHexString(), "center", "700");
    if(e.st.poison && e.st.poison.stacks > 0) text(g, "☣" + e.st.poison.stacks, s.x + w/2 + 6, s.y + 2, 12*k, "#7dff3a", "left", "700");
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
    const s = S.project(n.x, n.z + n.t*1.6, n.y);
    g.globalAlpha = Math.min(1, (0.9 - n.t)*4);
    const sz = (n.crit ? 22 : 15)*k*(n.t < 0.08 ? 1.4 : 1);
    text(g, String(n.v), s.x, s.y, sz, n.col, "center", "900");
    g.globalAlpha = 1;
    return n.t < 0.9;
  });

  // ---- top left: health, mana, gold, blink ----
  const x0 = 22, y0 = 18, bw = 230*k;
  bar(g, x0, y0, bw, 24*k, p.hp/p.maxHp, HP);
  text(g, Math.ceil(p.hp) + " / " + p.maxHp, x0 + 12, y0 + 12*k + 1, 15*k, CREAM, "left", "800");
  bar(g, x0, y0 + 30*k, bw*0.82, 16*k, p.mana/p.maxMana, MANA);
  text(g, Math.floor(p.mana) + "", x0 + 12, y0 + 38*k + 1, 12*k, CREAM, "left", "700");
  // blink charge: a little rune
  const bk = 1 - p.blinkCd/(DG.PLAYER.blink.cd*p.stats.blinkCdMul);
  plate(g, x0 + bw*0.82 + 16, y0 + 30*k, 44*k, 16*k, bk >= 1 ? "#6a3ab0" : "rgba(18,14,22,.88)");
  text(g, bk >= 1 ? "BLINK" : Math.ceil(p.blinkCd*10)/10 + "", x0 + bw*0.82 + 16 + 22*k, y0 + 38*k + 1, 11*k, CREAM, "center", "800");
  // gold
  H.coinT = Math.max(0, (H.coinT || 0) - dt);
  g.fillStyle = "#ffc83a"; g.strokeStyle = INK; g.lineWidth = 3;
  g.beginPath(); g.arc(x0 + 9, y0 + 64*k, 8*(1 + H.coinT), 0, Math.PI*2); g.fill(); g.stroke();
  text(g, p.gold + "", x0 + 24, y0 + 64*k, 18*k, SIGNAL, "left", "900");
  // relics
  p.relics.forEach((r, i)=>{
    const rx = x0 + 70*k + i*24*k;
    plate(g, rx, y0 + 55*k, 18*k, 18*k, "#4a3a10", 3);
    text(g, DG.RELICS[r.id].name[0], rx + 9*k, y0 + 64*k, 12*k, SIGNAL, "center", "900");
  });

  // ---- top middle: the boss ----
  const B = G.bossRef;
  if(B && !B.dead && B.spawn <= 0){
    H.bossT = Math.min(1, (H.bossT || 0) + dt*2);
    const w = Math.min(560, W*0.6), bx = W/2 - w/2, by = 22;
    g.globalAlpha = H.bossT;
    bar(g, bx, by + 18, w, 18, B.hp/B.maxHp, B.ai.raged ? "#ff2a4a" : "#c03a5a");
    text(g, G.bossName().toUpperCase(), W/2, by + 6, 17*k, SIGNAL, "center", "900");
    g.globalAlpha = 1;
  }

  // ---- top right: the map ----
  H.minimap(g, G, W - 20, 18, small);

  // ---- bottom left: the guns ----
  H.guns(g, G, 22, Hh - 20, k);

  // ---- bottom middle: what E does ----
  const tg = G.target();
  if(tg && G.state === "play"){
    g.font = F("800", 17*k);
    const label = tg.text, tw = g.measureText(label).width + 56;
    plate(g, W/2 - tw/2, Hh - 120*k, tw, 32*k, "rgba(18,14,22,.92)");
    g.fillStyle = CREAM; g.fillRect(W/2 - tw/2 + 14, Hh - 120*k + 7*k, 22, 18*k);
    text(g, I_KEY(), W/2 - tw/2 + 25, Hh - 120*k + 16*k, 13*k, INK, "center", "900");
    text(g, label, W/2 - tw/2 + 44, Hh - 120*k + 16*k, 17*k, CREAM, "left", "800");
  }

  // ---- toasts ----
  H.toasts = H.toasts.filter(t=>{ t.t += dt; return t.t < t.dur; });
  let ty = Hh*0.2;
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

  // ---- the big banner: floor names, room clear ----
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

  // ---- the crosshair ----
  if(!opts.noCursor) H.crosshair(g, G);
};
const I_KEY = ()=> DG.Input.usingPad ? "X" : "E";

H.crosshair = function(g, G){
  const m = DG.Input.mouse, p = G.player, s = G.gunStats();
  const r = 9 + (p.reloadT > 0 ? 3 : 0);
  g.lineWidth = 4; g.strokeStyle = INK;
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  g.lineWidth = 2; g.strokeStyle = CREAM;
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  g.fillStyle = "#" + new THREE.Color(DG.ELEMENTS[G.gun().element].color).getHexString();
  g.fillRect(m.x - 2, m.y - 2, 4, 4);
  if(p.reloadT > 0){
    g.lineWidth = 4; g.strokeStyle = SIGNAL;
    g.beginPath(); g.arc(m.x, m.y, r + 6, -Math.PI/2, -Math.PI/2 + Math.PI*2*(1 - p.reloadT/s.reload)); g.stroke();
  }
};

/* ---- the gun cards ---- */
H.guns = function(g, G, x, yb, k){
  const p = G.player;
  p.guns.forEach((gun, i)=>{
    const cur = i === p.cur, s = DG.Loot.stats(gun, p.stats), R = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element];
    const ec = "#" + new THREE.Color(E.color).getHexString();
    if(cur){
      const w = 300*k, h = 92*k, y = yb - h;
      plate(g, x, y, w, h, "rgba(18,14,22,.92)");
      g.fillStyle = ec; g.fillRect(x + 4, y + 4, 6, h - 8);
      text(g, gun.name, x + 18, y + 16*k, 17*k, R.color, "left", "900");
      text(g, R.name.toUpperCase() + " · LVL " + gun.level + " · " + E.name.toUpperCase(), x + 18, y + 35*k, 11*k, DIM, "left", "700");
      // ammo pips (or a count, for big magazines)
      const ay = y + 54*k;
      if(s.mag <= 14){ for(let j=0;j<s.mag;j++){ g.fillStyle = INK; g.fillRect(x + 18 + j*13*k, ay - 1, 10*k, 14*k); g.fillStyle = j < gun.ammo ? CREAM : "#3a3440"; g.fillRect(x + 19 + j*13*k, ay, 8*k, 12*k); } }
      else text(g, gun.ammo + " / " + s.mag, x + 18, ay + 6*k, 16*k, CREAM, "left", "900");
      if(p.reloadT > 0) text(g, "RELOADING", x + w - 16, ay + 6*k, 13*k, SIGNAL, "right", "900");
      // the spell
      const sp = DG.SPELLS[s.spell], can = p.mana >= s.spellCost;
      text(g, "RMB  " + sp.name + "  " + s.spellCost, x + 18, y + 78*k, 13*k, can ? ec : "#5a5260", "left", "800");
      // runes
      for(let j=0;j<gun.slots;j++){
        const rx = x + w - 22*k - j*22*k, ry = y + 78*k;
        g.fillStyle = INK; g.fillRect(rx - 9*k, ry - 9*k, 18*k, 18*k);
        g.fillStyle = gun.runes[j] ? "#5a3a8a" : "#2a2430"; g.fillRect(rx - 7*k, ry - 7*k, 14*k, 14*k);
        if(gun.runes[j]) text(g, DG.RUNES[gun.runes[j]].icon, rx, ry + 1, 12*k, "#e8d0ff", "center", "700");
      }
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

/* ---- the map: one box per room you've seen ---- */
H.minimap = function(g, G, xr, y, small){
  const D = G.D, cs = small ? 9 : 13, gap = 3;
  const seen = D.rooms.filter(r=> r.seen || (r.type === "secret" && r.found));
  if(!seen.length) return;
  // known-but-unvisited: rooms next to seen ones (not secrets)
  const hint = D.rooms.filter(r=> !r.seen && r.type !== "secret" && r.links.some(id=> D.rooms[id].seen && D.rooms[id].type !== "secret"));
  const all = seen.concat(hint);
  const minx = Math.min(...all.map(r=> r.cx)), maxx = Math.max(...all.map(r=> r.cx)), miny = Math.min(...all.map(r=> r.cy)), maxy = Math.max(...all.map(r=> r.cy));
  const w = (maxx - minx + 1)*(cs*1.4 + gap) + 16, h = (maxy - miny + 1)*(cs + gap) + 16;
  const x = xr - w;
  plate(g, x, y, w, h, "rgba(18,14,22,.8)", 4);
  const at = r=> ({ x:x + 8 + (r.cx - minx)*(cs*1.4 + gap), y:y + 8 + (r.cy - miny)*(cs + gap) });
  const ICON = { boss:"☠", shop:"$", treasure:"◆", puzzle:"?", secret:"★", start:"" };
  hint.forEach(r=>{ const q = at(r); g.strokeStyle = "#5a5260"; g.lineWidth = 2; g.strokeRect(q.x, q.y, cs*1.4, cs); });
  seen.forEach(r=>{
    const q = at(r), here = G.room === r;
    g.fillStyle = here ? SIGNAL : r.cleared ? "#8a7e90" : r.active ? "#ff4a5a" : "#5a5260";
    g.fillRect(q.x, q.y, cs*1.4, cs);
    const ic = ICON[r.type];
    if(ic) text(g, ic, q.x + cs*0.7, q.y + cs/2 + 1, cs*0.9, here ? INK : r.type === "boss" ? "#ff4a5a" : SIGNAL, "center", "900");
  });
};

})();
