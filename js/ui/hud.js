/* ------------------------------------------------------------------ *
 *  The HUD, drawn on one canvas over the game, in the manner of an old
 *  grim book: bone text on near-black, carved frames with thin tarnished
 *  gold edges, engraved serif (Cinzel) for names and numbers, a book face
 *  (EB Garamond) for anything you read.
 *
 *  Top left: health (with wards), mana, XP and level, gold, flies, the
 *  active item, every powerup you own, Gribbus' tricks. Top right: the
 *  map and curses. Bottom left: your guns. Bottom right: the portrait.
 *  Above them: the boss bar. Middle: what E does, item cards, area
 *  names, banners, speech. Over the world: damage numbers, barks,
 *  health bars, price tags, the crosshair.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, S = DG.Stage;
const H = DG.HUD = { nums:[], barks:[], toasts:[], banner:null, card:null, area:null };

/* the palette: bone on soot, tarnished gold, dried blood, soul-blue */
const INK = "#050404", BONE = "#d8ccb0", IVORY = "#ece2c8", DIM = "#8c8270", FAINT = "#4a443c",
  GOLD = "#c8a45a", GOLD2 = "#e8c878", HP = "#9a2318", HP2 = "#c8402c", MANA = "#3e5f9e", MANA2 = "#6a92d0",
  WARD = "#9ac8e8", XP = "#b8a468", GREEN = "#8aa86a", EDGE = "rgba(176,152,106,.55)";
const SERIF = "'Cinzel','Trajan Pro','Times New Roman',serif", BOOK = "'EB Garamond','Garamond',Georgia,serif";
const F = (w, s, fam)=> w + " " + Math.max(6, s) + "px " + (fam || SERIF);
const hex = c=> "#" + new THREE.Color(c).getHexString();
/* drain the candy out of a colour: lerp it toward old bone */
const muteCache = {};
const mute = (c, a)=>{
  const key = c + "|" + a; if(muteCache[key]) return muteCache[key];
  const x = new THREE.Color(c), b = new THREE.Color(0xc8bca0);
  return (muteCache[key] = "#" + x.lerp(b, a).getHexString());
};
const ease = t=> t <= 0 ? 0 : t >= 1 ? 1 : t*t*(3 - 2*t);

H.init = function(){
  const c = H.canvas = document.getElementById("hud");
  H.g = c.getContext("2d");
  const fit = ()=>{ const d = Math.min(2, devicePixelRatio || 1); c.width = innerWidth*d; c.height = innerHeight*d; c.style.width = innerWidth + "px"; c.style.height = innerHeight + "px"; H.dpr = d; };
  fit(); addEventListener("resize", fit);
  // a canvas never asks for a web font by itself: ask for every face we draw with
  if(document.fonts && document.fonts.load) ["400", "600", "700", "900"].forEach(w=> document.fonts.load(w + " 16px Cinzel").catch(()=>{}));
  if(document.fonts && document.fonts.load) ["500 16px 'EB Garamond'", "italic 500 16px 'EB Garamond'", "600 16px 'EB Garamond'"].forEach(f=> document.fonts.load(f).catch(()=>{}));
};
H.reset = function(){
  H.nums = []; H.barks = []; H.toasts = []; H.banner = null; H.card = null; H.area = null;
  H.bossT = 0; H.bossId = null; H.hpLag = null; H.deadT = 0;
};

/* A few lines the rules speak are reworded on their way to the screen.
   The rules keep their plain text (and the tests read it); this is only
   the voice. Anything not listed shows as it is. */
const REWORD = {
  "GRUBNOK: \"NOW I'M ANGRY\"": "GRUBNOK: \"Now... I am ANGRY.\"",
  "MATRIARCH: \"You're making me SPORE-ADIC.\"": "THE MATRIARCH: \"You make me... SPORE-ADIC.\"",
  "THE BRIDE: \"WHY WON'T YOU STAY\"": "THE BRIDE: \"Why will you not STAY?\"",
  "THE EYE: \"I SEE EVERYTHING NOW\"": "THE EYE: \"NOW I SEE ALL THINGS.\"",
  "THE HEART: \"ba-DUM. ba-DUM. BA-DUM.\"": "THE HEART: \"ba-DUM. ba-DUM. BA-DUM.\"",
  "The Gloom Heart is still. The forest breathes out. The way out is open.": "The Heart is still. The forest exhales. The way out lies open.",
  "A golden fly! Gribbus can learn new tricks at frog ponds.": "A golden fly. Gribbus may learn darker tricks at the ponds.",
  "It's locked. Solve the room's puzzle.": "Sealed. The room's riddle holds the key.",
  "The altar looks at you, then at your health. It says no.": "The altar weighs your life, and finds it wanting.",
  "Tastes like boots. You feel better.": "Tastes of old boots. Your wounds close.",
  "The lantern shows you everything. Even the secrets.": "The lantern lays all things bare. Even the secrets."
};
const reword = s=>{
  if(REWORD[s]) return REWORD[s];
  const m = /^(.+) is down! A portal opens\.$/.exec(s);
  if(m) return "Where it fell, a portal yawns open.";
  return s;
};

/* ---- events that put something on screen ---- */
const ATTUNE_COL = { fire:"#e0703a", frost:"#8ad0ff", poison:"#9cd84a", shock:"#f0d84a", arcane:"#b88aff" };
const ATTUNE_GLYPH = { fire:"♨", frost:"❄", poison:"☣", shock:"ϟ", arcane:"✶" };
H.handle = function(ev, G){
  const p = G.player;
  switch(ev.type){
    case "hit": H.nums.push({ x:ev.x + (Math.random() - 0.5)*0.4, y:ev.y, z:1.4, v:Math.round(ev.amt), crit:ev.crit, t:0, col:ev.el && DG.ELEMENTS[ev.el] ? mute(hex(DG.ELEMENTS[ev.el].color), 0.15) : BONE }); break;
    case "hurt": H.nums.push({ x:p.x, y:p.y, z:2, v:"-" + Math.round(ev.amt), crit:true, t:0, col:HP2 }); H.hurtT = 0.5; break;
    case "wardBreak": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"WARD SHATTERED", crit:true, t:0, col:WARD }); break;
    case "heal": H.nums.push({ x:ev.x, y:ev.y, z:2, v:"+" + Math.round(ev.amt), t:0, col:"#8ac88a" }); break;
    case "coin": H.coinT = 0.3; break;
    case "msg": H.toast(reword(ev.text), ev.dur); break;
    case "bark": H.barks.push({ id:ev.id, x:ev.x, y:ev.y, text:ev.text, t:0 }); break;
    case "floor": H.area = { floor:ev.floor, name:ev.name, t:0 }; H.banner = null; break;
    case "clear": if(H.banner && H.banner.kind !== "clear") break; { const L = DG.LINES && DG.LINES.clear; H.banner = { kind:"clear", a:L && L.length ? L[Math.floor(Math.random()*L.length)] : "Silence returns.", t:0 }; break; }
    case "kill": if(ev.boss){ const B = DG.BOSSES[G.D.theme.boss || "king"] || {}; H.banner = { kind:"felled", a:B.felled || "FOE VANQUISHED", b:G.bossName ? G.bossName() : B.name, t:0 }; } break;
    case "react": H.nums.push({ x:ev.x, y:ev.y, z:2.4, v:ev.name, crit:true, t:-0.1, col:mute(hex(ev.color), 0.15), big:true }); break;
    case "slip": if(!ev.enemy) H.nums.push({ x:p.x, y:p.y, z:2.2, v:"WHEEE", t:0, col:GOLD2, crit:true }); break;
    case "fall": if(ev.who === "enemy") H.nums.push({ x:ev.x, y:ev.y, z:1, v:"farewell", t:0, col:DIM }); break;
    case "bonk": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"BONK", t:0, col:GOLD2, crit:true }); break;
    case "dizzy": H.nums.push({ x:ev.x, y:ev.y, z:2.6, v:"DAZED", t:0, col:GOLD }); break;
    case "nomana": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"no mana", t:0, col:MANA2 }); break;
    case "nocharge": H.nums.push({ x:p.x, y:p.y, z:2.2, v:"not charged", t:0, col:DIM }); break;
    case "levelup": H.nums.push({ x:p.x, y:p.y, z:2.6, v:"LEVEL UP", t:0, col:XP, crit:true, big:true }); break;
    case "item": H.card = { title:ev.name, sub:ev.desc, flavor:ev.flavor, col:DG.TIERS[ev.tier].color, tier:DG.TIERS[ev.tier].name, t:0, life:ev.tier >= 4 ? 5 : 3.6, icons:[ev.id] }; break;
    case "attune": H.card = { title:"Attunement " + ["", "I", "II", "III"][ev.tier] + " · " + ev.name, sub:ev.desc, col:ATTUNE_COL[ev.el] || GOLD, tier:"Your " + ev.el + " answers", t:0, life:4.5 }; break;
    case "transform": H.card = { title:ev.name, sub:ev.desc, col:"#c07ab8", tier:"Transformation", t:0, life:5, icons:["set:" + ev.id] }; H.banner = { kind:"transform", a:"TRANSFORMATION", b:ev.name, t:0 }; break;
    case "duo": { const duo = DG.DUOS.find(x=> x.name === ev.name); H.card = { title:ev.name, sub:ev.desc, col:"#c86aa8", tier:"Duo · Synergy", t:0, life:4, icons:duo ? [duo.a, duo.b] : null }; break; }
    case "ascend": { const gun = G.gun && G.gun(); H.card = { title:ev.name, sub:ev.flavor, col:"#e0a848", tier:"Ascension · your gun evolved", t:0, life:4.5, icons:gun ? [DG.Icons.keyFor(gun)] : null }; break; }
    case "quest": { const Q = DG.QUESTS[ev.id] || {}; H.card = { title:Q.name || ev.name, sub:Q.desc, flavor:Q.flavor, col:ev.id === "ember" ? "#ff9a4a" : GREEN, tier:"Relic · another ending", t:0, life:5, icons:[DG.Icons.keyFor({ kind:"quest", id:ev.id })] }; break; }
    case "frogbuff": H.card = { title:"Gribbus learned " + ev.name, sub:ev.desc, col:GREEN, tier:"Frog trick", t:0, life:3.6, icons:["frog:" + ev.id] }; break;
    case "boon": H.nums.push({ x:p.x, y:p.y, z:2.6, v:ev.name, t:0, col:XP, crit:true }); break;
    case "fly": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"GOLDEN FLY", t:0, col:GOLD2, crit:true, big:true }); break;
    case "pickup": if(ev.kind === "active") H.card = { title:DG.ACTIVES[ev.id].name, sub:DG.ACTIVES[ev.id].desc + " (F)", col:GOLD, tier:"Active item", t:0, life:3.2, icons:["active:" + ev.id] }; break;
    case "graze": H.nums.push({ x:ev.x, y:ev.y, z:1.2, v:"mine", t:0, col:BONE }); break;
    case "status": if(ev.st === "confused") H.nums.push({ x:ev.x, y:ev.y, z:2.2, v:"??", t:0, col:"#c88ab8", crit:true }); break;
    case "jackpot": H.nums.push({ x:ev.x, y:ev.y, z:2.2, v:"JACKPOT", t:0, col:GOLD2, crit:true, big:true }); break;
    case "hiccup": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"hic", t:0, col:WARD }); break;
    case "clockwork": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"TICK · +WARD", t:0, col:WARD, crit:true }); break;
    case "zapShot": H.nums.push({ x:p.x, y:p.y, z:2.4, v:"ZAP", t:0, col:"#e8dc6a", crit:true }); break;
    case "bonkFriend": H.nums.push({ x:ev.x, y:ev.y, z:1.8, v:"oof", t:0, col:GOLD }); break;
    case "whistle": H.nums.push({ x:p.x, y:p.y, z:2.6, v:"WHEEET", t:0, col:GOLD2, crit:true, big:true }); break;
    case "dice": H.nums.push({ x:p.x, y:p.y, z:2.8, v:"⚄ " + ev.roll + ": " + ev.mul + "x", t:0, col:ev.mul >= 1.2 ? GOLD2 : ev.mul < 1 ? DIM : BONE, crit:true, big:true }); break;
  }
};
H.toast = function(text, dur){
  H.toasts = H.toasts.filter(t=> t.text !== text);
  const m = /^([^:"]{2,40}): "(.+)"$/.exec(text);   // NAME: "a line"  is someone speaking
  H.toasts.push({ text, who:m ? m[1] : null, line:m ? m[2] : null, t:0, dur:dur || 2.6 });
  if(H.toasts.length > 4) H.toasts.shift();
};

/* ---- drawing helpers ---- */
const R = v=> Math.round(v);
/* a carved frame: a soot panel, an ink edge, one thin line of tarnished gold, gold corner brackets */
function frame(g, x, y, w, h, fill, corners){
  x = R(x); y = R(y); w = R(w); h = R(h);
  if(fill !== false){
    if(typeof fill === "string") g.fillStyle = fill;
    else { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "rgba(24,20,18,.9)"); gr.addColorStop(1, "rgba(8,6,6,.92)"); g.fillStyle = gr; }
    g.fillRect(x, y, w, h);
  }
  g.lineWidth = 1;
  g.strokeStyle = "rgba(0,0,0,.9)"; g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  g.strokeStyle = EDGE; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  g.strokeStyle = "rgba(255,240,210,.05)"; g.beginPath(); g.moveTo(x + 1, y + 1.5); g.lineTo(x + w - 1, y + 1.5); g.stroke();
  if(corners !== false){
    const c = Math.min(7, w/4, h/3);
    g.strokeStyle = GOLD; g.globalAlpha *= 1; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x - 2, y + c); g.lineTo(x - 2, y - 2); g.lineTo(x + c, y - 2);
    g.moveTo(x + w - c, y - 2); g.lineTo(x + w + 2, y - 2); g.lineTo(x + w + 2, y + c);
    g.moveTo(x + w + 2, y + h - c); g.lineTo(x + w + 2, y + h + 2); g.lineTo(x + w - c, y + h + 2);
    g.moveTo(x + c, y + h + 2); g.lineTo(x - 2, y + h + 2); g.lineTo(x - 2, y + h - c);
    g.stroke(); g.lineWidth = 1;
  }
}
/* a thin bar in a bone frame; lag is the pale chunk of what was just lost */
function bar(g, x, y, w, h, k, col, col2, lag){
  x = R(x); y = R(y); w = R(w); h = Math.max(3, R(h));
  g.fillStyle = "rgba(6,4,4,.86)"; g.fillRect(x, y, w, h);
  const kk = Math.max(0, Math.min(1, k));
  if(lag !== undefined && lag > kk){ g.fillStyle = "rgba(226,208,170,.72)"; g.fillRect(x + 1 + (w - 2)*kk, y + 1, (w - 2)*(Math.min(1, lag) - kk), h - 2); }
  if(kk > 0){
    const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, col2 || col); gr.addColorStop(0.55, col); gr.addColorStop(1, "rgba(0,0,0,.6)");
    g.fillStyle = col; g.fillRect(x + 1, y + 1, (w - 2)*kk, h - 2);
    g.fillStyle = gr; g.globalAlpha *= 0.85; g.fillRect(x + 1, y + 1, (w - 2)*kk, h - 2); g.globalAlpha /= 0.85;
  }
  g.lineWidth = 1;
  g.strokeStyle = "rgba(0,0,0,.95)"; g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
  g.strokeStyle = "rgba(200,184,150,.6)"; g.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}
function setSpacing(g, sp){ if("letterSpacing" in g) g.letterSpacing = (sp || 0) + "px"; }
/* text with a soft soot outline so it reads on any floor */
function text(g, s, x, y, size, col, align, weight, fam, spacing){
  s = String(s);
  g.font = F(weight || "700", size, fam); g.textAlign = align || "left"; g.textBaseline = "middle";
  setSpacing(g, spacing);
  if(spacing && align === "center" && !("letterSpacing" in g)) spacing = 0;
  const xx = align === "center" && spacing ? x + spacing/2 : x;
  g.lineJoin = "round"; g.lineWidth = Math.max(2.5, size*0.2); g.strokeStyle = "rgba(4,3,3,.85)";
  g.strokeText(s, xx, y);
  g.fillStyle = col || BONE; g.fillText(s, xx, y);
  setSpacing(g, 0);
}
/* the width a line would take */
function measure(g, s, size, weight, fam, spacing){
  g.font = F(weight || "700", size, fam); setSpacing(g, spacing);
  const w = g.measureText(String(s)).width; setSpacing(g, 0); return w;
}
/* the biggest size up to `size` that fits in maxW */
function fit(g, s, size, maxW, weight, fam, spacingEm){
  const w = measure(g, s, size, weight, fam, size*(spacingEm || 0));
  return w > maxW ? size*maxW/w : size;
}
function wrap(g, s, maxW){
  const words = String(s).split(" "), lines = []; let cur = "";
  words.forEach(w=>{ const t = cur ? cur + " " + w : w; if(g.measureText(t).width > maxW && cur){ lines.push(cur); cur = w; } else cur = t; });
  if(cur) lines.push(cur);
  return lines;
}
/* a thin rule that fades out at both ends, with a small diamond in the middle */
function rule(g, cx, y, half, col, gem){
  y = R(y) + 0.5;
  const gr = g.createLinearGradient(cx - half, 0, cx + half, 0);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.5, col); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.strokeStyle = gr; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - half, y); g.lineTo(cx + half, y); g.stroke();
  if(gem) diamond(g, cx, y, gem, col);
}
function diamond(g, x, y, r, fill, stroke){
  g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath();
  if(fill){ g.fillStyle = fill; g.fill(); }
  if(stroke){ g.lineWidth = 1; g.strokeStyle = stroke; g.stroke(); }
}
/* a dark band across the screen, soft at top and bottom (and at the ends if half is given) */
function band(g, cx, cy, half, h, a){
  const gr = g.createLinearGradient(0, cy - h/2, 0, cy + h/2);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.3, "rgba(0,0,0," + a + ")"); gr.addColorStop(0.7, "rgba(0,0,0," + a + ")"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(cx - half, cy - h/2, half*2, h);
}
/* a powerup tile: its medallion (DG.Icons), and how many you hold if more than one */
function chip(g, x, y, s, key, count){
  DG.Icons.draw(g, key, x, y, s, H.dpr);
  if(count > 1) text(g, "×" + count, x + s*0.36, y + s*0.36, Math.max(9, s*0.42), IVORY, "center", "700");
}
function keycap(g, x, y, s, label){
  g.fillStyle = "rgba(20,16,14,.95)"; g.fillRect(R(x - s/2), R(y - s/2), R(s), R(s));
  g.lineWidth = 1; g.strokeStyle = GOLD; g.strokeRect(R(x - s/2) + 0.5, R(y - s/2) + 0.5, R(s) - 1, R(s) - 1);
  text(g, label, x, y + 1, s*0.6, IVORY, "center", "700");
}

/* ---- per frame ---- */
H.draw = function(G, dt, opts){
  opts = opts || {};
  const g = H.g, d = H.dpr, W = innerWidth, Hh = innerHeight, p = G.player;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.clearRect(0, 0, W, Hh);
  // death: the HUD fades away and leaves you with the dark
  H.deadT = G.state === "dead" ? (H.deadT || 0) + dt : 0;
  const fade = G.state === "dead" ? Math.max(0, 1 - H.deadT*1.4) : 1;
  if(S.portrait) S.portrait.on = !opts.hidden && fade > 0.05;
  if(opts.hidden || fade <= 0) return;
  g.globalAlpha = 1;
  const small = W < 700, k = small ? 0.82 : 1;
  H.alpha = fade;

  H.hurtT = Math.max(0, (H.hurtT || 0) - dt);
  const low = p.hp/p.maxHp < 0.3 ? 0.28 + 0.14*Math.sin(G.t*5) : 0;
  const red = Math.max(H.hurtT, low);
  if(red > 0){
    const gr = g.createRadialGradient(W/2, Hh/2, Math.min(W, Hh)*0.3, W/2, Hh/2, Math.max(W, Hh)*0.75);
    gr.addColorStop(0, "rgba(90,0,0,0)"); gr.addColorStop(1, "rgba(90,0,0," + (red*0.75) + ")");
    g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
  }
  if(fade < 1) g.globalAlpha = fade;
  const A = (a)=> { g.globalAlpha = a*fade; };

  // what Zippy stands at: a card at the bottom tells all about it (not while a pickup card shows)
  const tg = G.state === "play" ? G.target() : null;
  const nearInfo = tg && !H.card ? H.offerInfo(tg.o, G) : null;
  H.nearOffer = nearInfo ? tg.o : null;

  // over the world: health bars, price tags, barks, numbers
  G.enemies.forEach(e=>{
    if(e.dead || e.spawn > 0 || e.boss || e.hidden || e.decoy) return;
    if(e.hp >= e.maxHp && !e.affix) return;
    const s = S.project(e.x, 1.4*(e.r/0.34)*(e.affix && DG.AFFIXES[e.affix].size || 1) + 0.4, e.y); if(s.behind) return;
    const w = 34*k;
    g.fillStyle = "rgba(0,0,0,.85)"; g.fillRect(R(s.x - w/2 - 1), R(s.y - 1), R(w + 2), 5);
    g.fillStyle = e.affix ? mute(hex(DG.AFFIXES[e.affix].tint), 0.2) : HP2; g.fillRect(R(s.x - w/2), R(s.y), w*Math.max(0, e.hp/e.maxHp), 3);
    if(e.affix) text(g, DG.AFFIXES[e.affix].name, s.x, s.y - 9, 11*k, mute(hex(DG.AFFIXES[e.affix].tint), 0.25), "center", "700", SERIF, 1);
    if(e.st.poison && e.st.poison.stacks > 0) text(g, "☣" + e.st.poison.stacks, s.x + w/2 + 6, s.y + 2, 12*k, "#8ac84a", "left", "700");
  });
  // offers: the medallion over each says what it is; here, its price just above it,
  // and the name of the nearest one (the one you stand at gets the full card)
  if(G.room){
    const offers = G.room.props.filter(pr=> pr.kind === "pedestal" && !pr.taken && pr.offer && DG.dist(pr.x + 0.5, pr.y + 0.5, p.x, p.y) < 6);
    let named = null, nd = 4.5;
    offers.forEach(pr=>{ const d = DG.dist(pr.x + 0.5, pr.y + 0.5, p.x, p.y); if(d < nd){ nd = d; named = pr; } });
    if(named === H.nearOffer) named = null;
    // just over the top of the medallion (it hangs about 2.5 up, 1.2 across, and faces the camera)
    const up = H.camUp || (H.camUp = new THREE.Vector3());
    up.set(0, 1, 0).applyQuaternion(S.camera.quaternion);
    offers.forEach(pr=>{
      if(H.nearOffer === pr) return;   // the card at the bottom says it all
      const o = pr.offer, x = pr.x + 0.5, z = pr.y + 0.5, top = S.project(x + up.x*0.72, 2.5 + up.y*0.72, z + up.z*0.72);
      let y = top.y - 7*k;
      if(o.currency){ text(g, o.currency === "gold" ? o.price + " gold" : o.currency === "pact" ? "the price: " + DG.PACTS[o.pact].name : "−" + o.price + " max HP", top.x, y, 12*k, o.currency === "gold" ? (p.gold >= o.price ? GOLD2 : HP2) : HP2, "center", "600", BOOK); y -= 15*k; }
      if(pr === named){
        const name = o.kind === "item" ? DG.ITEMS[o.id].name : o.kind === "gun" ? o.gun.name : o.kind === "active" ? DG.ACTIVES[o.id].name : o.name;
        const col = o.kind === "item" ? DG.TIERS[DG.ITEMS[o.id].tier].color : o.kind === "gun" ? DG.RARITY[o.gun.rarity].color : BONE;
        text(g, name, top.x, y, 13*k, mute(col, 0.3), "center", "700");
      }
    });
  }
  H.barks = H.barks.filter(b=>{
    b.t += dt;
    const e = G.enemies.find(o=> o.id === b.id); if(e){ b.x = e.x; b.y = e.y; }
    const s = S.project(b.x, 2.4, b.y);
    const size = 15*k, tw = measure(g, b.text, size, "italic 500", BOOK) + 22;
    A(Math.min(1, b.t*6, (1.6 - b.t)*3));
    const gr = g.createLinearGradient(s.x - tw/2, 0, s.x + tw/2, 0);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.2, "rgba(0,0,0,.6)"); gr.addColorStop(0.8, "rgba(0,0,0,.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(s.x - tw/2, s.y - 25, tw, 20);
    text(g, b.text, s.x, s.y - 15, size, IVORY, "center", "italic 500", BOOK);
    A(1);
    return b.t < 1.6;
  });
  H.nums = H.nums.filter(n=>{
    n.t += dt;
    if(n.t < 0) return true;
    const s = S.project(n.x, n.z + n.t*1.6, n.y);
    A(Math.min(1, ((n.big ? 1.3 : 0.9) - n.t)*4));
    const sz = (n.big ? 22 : n.crit ? 19 : 14)*k*(n.t < 0.08 ? 1.35 : 1);
    text(g, String(n.v), s.x, s.y, sz, n.col, "center", "700", SERIF, n.big ? 1.5 : 0);
    A(1);
    return n.t < (n.big ? 1.3 : 0.9);
  });

  // ---- top left: health, wards, mana, blink, xp, gold ----
  const x0 = 24, y0 = 22;
  const bw = Math.min(small ? W*0.42 : 320, (150 + p.maxHp*0.9))*k;   // the bar grows with your max health
  const hk = p.hp/p.maxHp;
  if(H.hpLag === null || H.hpLag === undefined || hk > H.hpLag) H.hpLag = hk;
  H.hpHold = hk < (H.hpLast === undefined ? hk : H.hpLast) ? 0.55 : Math.max(0, (H.hpHold || 0) - dt);
  if(H.hpHold <= 0) H.hpLag = Math.max(hk, H.hpLag - dt*0.6);
  H.hpLast = hk;
  bar(g, x0, y0, bw, 11*k, hk, HP, HP2, H.hpLag);
  text(g, Math.ceil(p.hp) + " / " + p.maxHp, x0 + bw + 10, y0 + 6*k, 12*k, BONE, "left", "700");
  const hpTw = measure(g, Math.ceil(p.hp) + " / " + p.maxHp, 12*k, "700");
  for(let i=0;i<p.wards;i++) diamond(g, x0 + bw + 22 + hpTw + i*15*k, y0 + 5.5*k, 5.5*k, WARD, "rgba(0,0,0,.9)");
  bar(g, x0, y0 + 17*k, bw*0.82, 7*k, p.mana/p.maxMana, MANA, MANA2);
  text(g, Math.floor(p.mana) + "", x0 + bw*0.82 + 10, y0 + 20.5*k, 11*k, MANA2, "left", "700");
  const bk = 1 - p.blinkCd/(DG.PLAYER.blink.cd*Math.max(0.3, 1 - G.mods.blinkCd));
  const blx = x0 + bw*0.82 + 44*k;
  diamond(g, blx, y0 + 20.5*k, 5*k, bk >= 1 ? WARD : "rgba(20,18,18,.9)", bk >= 1 ? "rgba(0,0,0,.9)" : FAINT);
  text(g, bk >= 1 ? "BLINK" : (Math.ceil(p.blinkCd*10)/10).toFixed(1), blx + 9*k, y0 + 20.5*k, 10*k, bk >= 1 ? WARD : DIM, "left", "700", SERIF, 1);
  // xp: a hair of old gold
  const need = DG.PLAYER.xp(p.level);
  bar(g, x0, y0 + 30*k, bw*0.82, 3, p.xp/need, XP, "#e0d0a0");
  text(g, "LV " + p.level + (p.pendingLevels ? "  · " + p.pendingLevels + " awaiting" : ""), x0 + bw*0.82 + 10, y0 + 31*k, 11*k, XP, "left", "700", SERIF, 1);
  // gold, flies
  H.coinT = Math.max(0, (H.coinT || 0) - dt);
  const yr = y0 + 52*k;
  const kw = 40*k;   // the keys, at the right end of the purse
  const gw = Math.max(86*k, measure(g, p.gold + "", 15*k, "700") + 44*k) + kw;
  frame(g, x0, yr - 11*k, gw, 22*k, null, false);
  const cr = 6*k*(1 + H.coinT*0.8);
  g.fillStyle = "rgba(0,0,0,.9)"; g.beginPath(); g.arc(x0 + 13*k, yr, cr + 1.5, 0, Math.PI*2); g.fill();
  const cg = g.createRadialGradient(x0 + 11*k, yr - 2*k, 1, x0 + 13*k, yr, cr); cg.addColorStop(0, "#f0d890"); cg.addColorStop(1, "#8a6a30");
  g.fillStyle = cg; g.beginPath(); g.arc(x0 + 13*k, yr, cr, 0, Math.PI*2); g.fill();
  text(g, p.gold + "", x0 + gw - kw - 10, yr + 1, 15*k, H.coinT > 0 ? GOLD2 : IVORY, "right", "700");
  // a little iron key and how many you carry
  H.keyT = Math.max(0, (H.keyT || 0) - dt);
  const kx = x0 + gw - kw + 6*k, kc = H.keyT > 0 ? GOLD2 : p.keys ? "#c8bca0" : "#5a5046";
  g.strokeStyle = kc; g.lineWidth = 1.6*k; g.beginPath(); g.arc(kx + 4*k, yr, 3.2*k, 0, Math.PI*2); g.stroke();
  g.beginPath(); g.moveTo(kx + 7.2*k, yr); g.lineTo(kx + 16*k, yr); g.moveTo(kx + 13*k, yr); g.lineTo(kx + 13*k, yr + 3.5*k); g.moveTo(kx + 15.5*k, yr); g.lineTo(kx + 15.5*k, yr + 2.5*k); g.stroke();
  text(g, p.keys + "", x0 + gw - 10, yr + 1, 14*k, kc, "right", "700");
  if(G.meta.flies){ text(g, "✦ " + G.meta.flies, x0 + gw + 12, yr + 1, 13*k, GOLD, "left", "700"); }
  // the relics of a quest (the Ember, the Crown): the ending you're carrying
  const quests = Object.keys(p.quests || {}).filter(q=> p.quests[q]), qx = x0 + gw + (G.meta.flies ? 54 : 14)*k;
  quests.forEach((q, i)=> DG.Icons.draw(g, "offer:" + (q === "ember" ? "ember" : "crown"), qx + (i*28 + 12)*k, yr, 30*k, H.dpr));
  const qw = quests.length*28*k;
  // the active item
  if(p.active){
    const Ac = DG.ACTIVES[p.active.id], ax0 = qx + qw, full = p.active.charge >= p.active.max;
    const ax = ax0 + 22*k;
    const aw = Math.max(130*k, measure(g, Ac.name, 12*k, "600", BOOK) + 46*k);
    frame(g, ax, yr - 11*k, aw, 22*k, full ? "rgba(52,40,14,.92)" : null, false);
    if(full){ g.save(); g.shadowColor = "rgba(232,200,120,.6)"; g.shadowBlur = 10; }
    DG.Icons.draw(g, "active:" + p.active.id, ax0 + 9*k, yr, 34*k, H.dpr);
    if(full) g.restore();
    keycap(g, ax + 11*k, yr - 1, 14*k, "F");
    text(g, Ac.name, ax + 23*k, yr - 2*k, 12*k, full ? GOLD2 : DIM, "left", "600", BOOK);
    for(let i=0;i<p.active.max;i++) diamond(g, ax + 25*k + i*9*k, yr + 7*k, 2.6*k, i < Math.floor(p.active.charge) ? GOLD2 : FAINT);
  }
  // every powerup owned, as engraved tiles; Gribbus' tricks under them
  const ids = Object.keys(p.items).filter(id=> DG.ITEMS[id]);
  const cs = (small ? 26 : 30)*k, gap = 3*k, perRow = Math.max(1, Math.floor((small ? Math.min(260, W - 60) : 400)/(cs + gap)));
  const cx0 = x0 + cs/2 - 2, cy0 = yr + 18*k + cs/2;
  ids.forEach((id, i)=>{
    const cx = cx0 + (i % perRow)*(cs + gap), cy = cy0 + Math.floor(i/perRow)*(cs + gap);
    chip(g, cx, cy, cs, id, p.items[id]);
  });
  const fy = cy0 + Math.ceil(ids.length/perRow)*(cs + gap) - cs/2 + (ids.length ? 10*k : -4);
  // attunement: a sigil per element you're building into, with its tier as pips
  const att = (G.mods && G.mods.attuneSrc) || {};
  const els = Object.keys(att).filter(e=> att[e] >= 1 && DG.ATTUNEMENT[e]).sort((a, b)=> att[b] - att[a]);
  let ay = fy;
  if(els.length){
    els.forEach((e, i)=>{
      const ax = x0 + 8*k + i*58*k, tier = (G.mods.attune || {})[e] || 0, col = ATTUNE_COL[e];
      g.fillStyle = "rgba(10,8,8,.8)"; g.beginPath(); g.arc(ax, ay + 2, 8*k, 0, Math.PI*2); g.fill();
      g.strokeStyle = col; g.lineWidth = tier ? 2 : 1; g.globalAlpha = tier ? 1 : 0.5; g.stroke(); g.globalAlpha = 1;
      text(g, ATTUNE_GLYPH[e], ax, ay + 3, 10*k, col, "center", "700");
      // the pips: filled for tiers reached, the next one shows how close you are
      for(let t=0; t<3; t++){ const px = ax + 13*k + t*9*k, on = t < tier; g.fillStyle = on ? col : "rgba(90,80,70,.7)"; g.beginPath(); g.arc(px, ay + 2, 3*k, 0, Math.PI*2); g.fill(); }
      text(g, att[e] + "", ax + 42*k, ay + 3, 9*k, DIM, "left", "600", BOOK);
    });
    ay += 20*k;
  }
  if(G.gribbus && G.gribbus.buffs.length){
    const fy = ay;
    text(g, "GRIBBUS", x0, fy + 2, 10*k, GREEN, "left", "700", SERIF, 1.5);
    G.gribbus.buffs.forEach((b, i)=> chip(g, x0 + 70*k + i*(cs*0.8 + gap), fy + 2, cs*0.8, "frog:" + b));
  }
  // hover an item tile: what is it?
  const m = DG.Input.mouse;
  ids.forEach((id, i)=>{
    const cx = cx0 + (i % perRow)*(cs + gap), cy = cy0 + Math.floor(i/perRow)*(cs + gap);
    if(Math.abs(m.x - cx) < cs/2 && Math.abs(m.y - cy) < cs/2){
      const it = DG.ITEMS[id]; g.font = F("500", 14*k, BOOK);
      const tw = Math.min(280, W - cx - 40), lines = wrap(g, it.desc, tw - 20);
      frame(g, cx + 16, cy, tw, 30 + lines.length*17*k, "rgba(10,8,8,.96)");
      text(g, it.name, cx + 26, cy + 13, 14*k, mute(DG.TIERS[it.tier].color, 0.3), "left", "700");
      lines.forEach((l, j)=> text(g, l, cx + 26, cy + 32 + j*17*k, 14*k, BONE, "left", "500", BOOK));
    }
  });

  // ---- the portrait frame's size (the boss bar needs it) ----
  const ps = S.portrait ? Math.round((small ? 118 : 200)*Math.min(1.15, Math.max(0.8, Hh/800))) : 0;

  // ---- bottom centre: the boss, Souls style ----
  const B = G.bossRef;
  if(B && !B.dead && B.spawn <= 0){
    if(H.bossId !== B.id){ H.bossId = B.id; H.bossT = 0; H.bossLag = 1; H.bossLast = 1; H.bossHold = 0; }
    H.bossT = Math.min(1, (H.bossT || 0) + dt*1.2);
    const bk2 = Math.max(0, B.hp/B.maxHp);
    if(bk2 < H.bossLast - 1e-4) H.bossHold = 0.7; else H.bossHold = Math.max(0, H.bossHold - dt);
    if(H.bossHold <= 0) H.bossLag = Math.max(bk2, H.bossLag - dt*0.45);
    H.bossLag = Math.max(H.bossLag, bk2);
    H.bossLast = bk2;
    let w, by;
    if(small){ w = W - 48; by = Hh - 26 - ps - 30*k; }
    else { w = Math.min(820, W*0.64, W - 2*(ps + 52)); by = Hh - 22 - 96*k - 52; }
    const bx = W/2 - w/2;
    A(ease(H.bossT));
    const rage = B.ai.raged || (B.ai.phase || 0) > 0;
    bar(g, bx, by, w, (small ? 7 : 9)*k, bk2, B.invuln ? "#5a5a60" : rage ? "#a8261a" : "#7e1c14", B.invuln ? "#8a8a90" : rage ? "#e05038" : "#b8402c", H.bossLag);
    text(g, G.bossName(), bx + 2, by - 13*k, (small ? 15 : 19)*k, IVORY, "left", "600", SERIF, 1);
    if(rage) text(g, "ENRAGED", bx + w, by - 12*k, 10*k, HP2, "right", "700", SERIF, 2);
    A(1);
  }

  // ---- top right: the map, curses, goblins left ----
  const mapH = H.minimap(g, G, W - 22, 22, small) || 0;
  let ry = 22 + mapH + 14;
  G.curses.forEach(c=>{
    const lw = Math.max(130*k, measure(g, DG.CURSES[c].name, 12*k, "700", SERIF, 1) + 34);
    frame(g, W - 22 - lw, ry, lw, 20*k, "rgba(34,10,20,.9)", false);
    diamond(g, W - 22 - lw + 10, ry + 10*k, 3, "#b04a6a");
    text(g, DG.CURSES[c].name, W - 22 - lw/2 + 6, ry + 10*k + 1, 12*k, "#d08aa0", "center", "700", SERIF, 1);
    ry += 27*k;
  });
  if(G.room && G.room.active){
    const left = G.enemies.filter(e=> !e.dead && e.room === G.room.id && !e.decoy), waves = G.room.waves.length - G.room.wave;
    const label = left.length + (left.length === 1 ? " FOE REMAINS" : " FOES REMAIN") + (waves > 0 ? " · " + waves + (waves > 1 ? " WAVES" : " WAVE") + " TO COME" : "");
    const lw = measure(g, label, 12*k, "700", SERIF, 1.5) + 30;
    frame(g, W - 22 - lw, ry, lw, 22*k, "rgba(30,8,6,.9)", false);
    g.fillStyle = HP; g.fillRect(R(W - 22 - lw), R(ry + 22*k - 2), R(lw), 2);
    text(g, label, W - 22 - lw/2, ry + 11*k, 12*k, IVORY, "center", "700", SERIF, 1.5);
    if(left.length <= 3) left.forEach(e=>{
      if(e.spawn > 0) return;
      const s = S.project(e.x, 1, e.y), mg = 40;
      const on = !s.behind && s.x > mg && s.x < W - mg && s.y > mg && s.y < Hh - mg;
      if(on && !e.hidden) return;
      const cx = W/2, cy = Hh/2, a = Math.atan2(s.y - cy, s.x - cx);
      let ax = s.x, ay = s.y;
      if(!on){ const t = Math.min((W/2 - mg)/Math.abs(Math.cos(a) || 1e-6), (Hh/2 - mg)/Math.abs(Math.sin(a) || 1e-6)); ax = cx + Math.cos(a)*t; ay = cy + Math.sin(a)*t; }
      g.save(); g.translate(ax, ay); g.rotate(on ? Math.PI/2 : a);
      g.globalAlpha = (0.55 + 0.35*Math.sin(G.t*6))*fade;
      g.beginPath(); g.moveTo(13, 0); g.lineTo(-7, -8); g.lineTo(-3, 0); g.lineTo(-7, 8); g.closePath();
      g.fillStyle = HP2; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      g.restore(); A(1);
    });
  }

  // ---- bottom right: the close-up of Zippy and Gribbus (drawn by the stage; framed here) ----
  if(S.portrait){
    const px = W - 24 - ps, py = Hh - 24 - ps;
    S.portrait.rect = { x:px, y:py, w:ps, h:ps };
    g.lineWidth = 7; g.strokeStyle = "rgba(10,8,8,.96)"; g.strokeRect(px - 3.5, py - 3.5, ps + 7, ps + 7);
    g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,.95)"; g.strokeRect(px - 7.5, py - 7.5, ps + 15, ps + 15);
    g.strokeStyle = GOLD; g.globalAlpha = 0.75*fade; g.strokeRect(px - 5.5, py - 5.5, ps + 11, ps + 11); A(1);
    g.strokeStyle = "rgba(200,184,150,.35)"; g.strokeRect(px - 0.5, py - 0.5, ps + 1, ps + 1);
    [[px - 5.5, py - 5.5], [px + ps + 5.5, py - 5.5], [px - 5.5, py + ps + 5.5], [px + ps + 5.5, py + ps + 5.5]].forEach(([cx, cy])=> diamond(g, cx, cy, 4.5, GOLD, "rgba(0,0,0,.9)"));
    const forms = (G.mods.sets || []).map(id=> (DG.SETS.find(x=> x.id === id) || {}).name).filter(Boolean);
    const label = forms.length ? forms.join(" + ").toUpperCase() : "ZIPPY & GRIBBUS";
    const lsz = fit(g, label, 11*k, ps - 10, "700", SERIF, 0.15);
    const lw = Math.min(ps + 4, measure(g, label, lsz, "700", SERIF, lsz*0.15) + 24);
    frame(g, px + ps/2 - lw/2, py - 15*k, lw, 18*k, forms.length ? "rgba(40,14,36,.96)" : "rgba(12,10,10,.97)", false);
    text(g, label, px + ps/2, py - 6*k, lsz, forms.length ? "#d8a0c8" : GOLD, "center", "700", SERIF, lsz*0.15);
  }

  // ---- bottom left: the guns ----
  H.guns(g, G, 24, Hh - 24, k, small ? W - 24 - (ps + 24) - 22 : 9999);

  // ---- bottom middle: what E does, and what the thing is ----
  if(tg){
    const label = tg.text, tw = Math.min(W - 24, measure(g, label, 17*k, "500", BOOK) + 58);
    const ey = small ? Hh*0.6 : Hh - 140*k;
    if(nearInfo) H.offerCard(g, nearInfo, W/2, ey - 14*k, k, W, p);
    frame(g, W/2 - tw/2, ey, tw, 30*k);
    keycap(g, W/2 - tw/2 + 18, ey + 15*k, 18*k, DG.Input.usingPad ? "X" : "E");
    text(g, label, W/2 - tw/2 + 36, ey + 15*k, 17*k, IVORY, "left", "500", BOOK);
  }

  // ---- toasts: what the world says ----
  H.toasts = H.toasts.filter(t=>{ t.t += dt; return t.t < t.dur; });
  let ty = small ? Hh*0.2 : Hh*0.17;
  H.toasts.forEach(t=>{
    const size = 19*k, maxW = Math.min(640, W - 48);
    g.font = F(t.who ? "italic 500" : "500", size, BOOK);
    const lines = wrap(g, t.who ? "“" + t.line + "”" : t.text, maxW);
    const lh = 23*k, th = lines.length*lh + (t.who ? 18*k : 0) + 14;
    const tw = Math.max(...lines.map(l=> g.measureText(l).width)) + 140;
    A(Math.min(1, t.t*5, (t.dur - t.t)*2.5));
    band(g, W/2, ty + th/2, Math.min(W/2, tw/2), th + 16, 0.66);
    let ly = ty + 7 + lh/2;
    if(t.who){ text(g, t.who.toUpperCase(), W/2, ty + 8*k, 11*k, GOLD, "center", "700", SERIF, 2.5); ly += 14*k; }
    lines.forEach((l, i)=> text(g, l, W/2, ly + i*lh, size, IVORY, "center", t.who ? "italic 500" : "500", BOOK));
    A(1);
    ty += th + 8;
  });

  // ---- the item card: what you just got ----
  if(H.card){
    const c = H.card; c.t += dt;
    if(c.t > c.life) H.card = null;
    else {
      A(Math.min(1, c.t*4, (c.life - c.t)*2.5));
      const col = mute(c.col, 0.3), y = small ? Hh*0.62 : Hh*0.63;
      const maxW = Math.min(W - 28, 560);
      const tsz = fit(g, c.title, 30*k, maxW - 40, "600", SERIF, 0.04);
      g.font = F("500", 16*k, BOOK);
      const sub = wrap(g, c.sub || "", maxW - 48);
      const tw = Math.min(maxW, Math.max(measure(g, c.title, tsz, "600", SERIF, tsz*0.04) + 80, 360*k, ...sub.map(l=> measure(g, l, 16*k, "500", BOOK) + 48)));
      const h = 70*k + sub.length*19*k + (c.flavor ? 20*k : 0);
      frame(g, W/2 - tw/2, y - 34*k, tw, h, "rgba(10,8,8,.93)");
      if(c.icons && c.icons.length){
        const is = (small ? 54 : 66)*k, n = c.icons.length, pop = c.t < 0.35 ? 1 + (0.35 - c.t)*1.4 : 1;
        c.icons.forEach((key, i)=> DG.Icons.draw(g, key, W/2 + (i - (n - 1)/2)*is*0.92, y - 34*k - is*0.5, is*pop, H.dpr));
      }
      const tl = c.tier.toUpperCase(), tlw = measure(g, tl, 11*k, "700", SERIF, 3);
      text(g, tl, W/2, y - 20*k, 11*k, col, "center", "700", SERIF, 3);
      rule(g, W/2 - tlw/2 - 34, y - 20*k, 26, col); rule(g, W/2 + tlw/2 + 34, y - 20*k, 26, col);
      const rise = c.t < 0.4 ? (0.4 - c.t)*12 : 0;
      text(g, c.title, W/2, y + 6*k + rise, tsz, mute(c.col, 0.55), "center", "600", SERIF, tsz*0.04);
      sub.forEach((l, i)=> text(g, l, W/2, y + 32*k + i*19*k, 16*k, BONE, "center", "500", BOOK));
      if(c.flavor) text(g, c.flavor, W/2, y + 34*k + sub.length*19*k, 14*k, DIM, "center", "italic 500", BOOK);
      A(1);
    }
  }

  // ---- the area name, as you arrive ----
  if(H.area){
    const a = H.area; a.t += dt;
    const life = 5.4;
    if(a.t > life) H.area = null;
    else {
      const al = ease(a.t/1.2)*(1 - ease((a.t - (life - 1.4))/1.4));
      const y = Hh*0.38, name = a.name || "", sp = 0.16 + a.t*0.006;
      const nsz = fit(g, name, (small ? 30 : 50), W - 48, "400", SERIF, sp);
      const nw = measure(g, name, nsz, "400", SERIF, nsz*sp);
      A(al);
      band(g, W/2, y + 4, W/2, nsz*3.4, 0.55);
      text(g, "FLOOR " + a.floor, W/2, y - nsz*0.95, 12*k, GOLD, "center", "700", SERIF, 5);
      text(g, name, W/2, y + 2, nsz, IVORY, "center", "400", SERIF, nsz*sp);
      const half = Math.min(W/2 - 12, nw/2 + 60);
      rule(g, W/2, y - nsz*0.62, half, "rgba(200,164,90,.85)");
      rule(g, W/2, y + nsz*0.66, half, "rgba(200,164,90,.85)", 3);
      A(1);
    }
  }

  // ---- the big banner ----
  if(H.banner){
    const b = H.banner; b.t += dt;
    const life = b.kind === "clear" ? 2 : b.kind === "felled" ? 5 : 3.2;
    if(b.t > life) H.banner = null;
    else if(b.kind === "clear"){
      A(Math.min(1, b.t*3, (life - b.t)*2));
      const y = Hh*0.3, s = fit(g, b.a, 18*k, W - 40, "400", SERIF, 0.1);
      text(g, b.a, W/2, y, s, BONE, "center", "400", SERIF, s*0.1);
      rule(g, W/2, y + 16*k, Math.min(W/2 - 10, 170*k), "rgba(200,164,90,.7)", 2.5);
      A(1);
    } else if(b.kind === "felled"){
      const al = ease(b.t/0.9)*(1 - ease((b.t - (life - 1.2))/1.2));
      const y = Hh*0.36, s = fit(g, b.a, (small ? 32 : 58), W - 40, "600", SERIF, 0.08);
      A(al);
      band(g, W/2, y + 8, W/2, s*3.2, 0.6);
      g.save(); g.shadowColor = "rgba(232,180,80,.55)"; g.shadowBlur = 22;
      text(g, b.a, W/2, y, s*(1 + b.t*0.006), GOLD2, "center", "600", SERIF, s*0.08);
      g.restore();
      if(b.b) text(g, b.b, W/2, y + s*0.82, 15*k, BONE, "center", "italic 500", BOOK);
      A(1);
    } else {
      A(Math.min(1, b.t*3, (life - b.t)*2));
      const y = Hh*0.34, s = fit(g, b.b || b.a, (small ? 28 : 44), W - 40, "600", SERIF, 0.06);
      text(g, b.a, W/2, y - s*0.85, 12*k, "#c07ab8", "center", "700", SERIF, 5);
      if(b.b){ g.save(); g.shadowColor = "rgba(192,122,184,.5)"; g.shadowBlur = 18; text(g, b.b, W/2, y, s, IVORY, "center", "600", SERIF, s*0.06); g.restore(); }
      rule(g, W/2, y + s*0.7, Math.min(W/2 - 10, 220*k), "rgba(192,122,184,.8)", 3);
      A(1);
    }
  }

  if(!opts.noCursor) H.crosshair(g, G);
  g.globalAlpha = 1;
};

H.crosshair = function(g, G){
  const m = DG.Input.mouse, p = G.player, s = G.gunStats();
  const r = 9 + (p.reloadT > 0 ? 3 : 0);
  g.lineWidth = 3.5; g.strokeStyle = "rgba(0,0,0,.8)";
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  g.lineWidth = 1.5; g.strokeStyle = BONE;
  g.beginPath(); g.arc(m.x, m.y, r, 0, Math.PI*2); g.stroke();
  // four short ticks, like a sigil
  g.lineWidth = 1.5;
  [0, 1, 2, 3].forEach(i=>{ const a = i*Math.PI/2 + Math.PI/4, c = Math.cos(a), sn = Math.sin(a);
    g.strokeStyle = "rgba(0,0,0,.8)"; g.lineWidth = 3.5; g.beginPath(); g.moveTo(m.x + c*(r + 2), m.y + sn*(r + 2)); g.lineTo(m.x + c*(r + 6), m.y + sn*(r + 6)); g.stroke();
    g.strokeStyle = BONE; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m.x + c*(r + 2), m.y + sn*(r + 2)); g.lineTo(m.x + c*(r + 6), m.y + sn*(r + 6)); g.stroke(); });
  const els = G.shotEls(G.gun());
  els.forEach((el, i)=>{ const a = i/els.length*Math.PI*2 + G.t*2, o = els.length > 1 ? 4 : 0; diamond(g, m.x + Math.cos(a)*o, m.y + Math.sin(a)*o, 2.6, hex(DG.ELEMENTS[el].color), "rgba(0,0,0,.8)"); });
  if(p.reloadT > 0){
    g.lineWidth = 2.5; g.strokeStyle = GOLD2;
    g.beginPath(); g.arc(m.x, m.y, r + 6, -Math.PI/2, -Math.PI/2 + Math.PI*2*(1 - p.reloadT/s.reload)); g.stroke();
  }
};

/* ---- what's on offer: everything worth knowing before you take it ---- */
H.offerInfo = function(o, G){
  if(!o) return null;
  let of = null;
  if(o.kind === "pedestal" && !o.taken && o.offer) of = o.offer;
  else if(o.kind === "item" && o.item) of = o.item.kind === "gun" ? { kind:"gun", gun:o.item } : o.item;
  else if(o.kind === "lilypad" && o.buff && !o.taken){
    const B = DG.FROG_BUFFS[o.buff];
    return { key:"frog:" + o.buff, title:B.name, col:"#8aa86a", tier:"Gribbus' trick" + (B.locked ? " · a rare one" : ""), desc:B.desc, lines:[] };
  }
  if(!of) return null;
  const info = { key:DG.Icons.keyFor(of), price:of.price, currency:of.currency, lines:[] };
  if(of.kind === "item"){
    const d = DG.ITEMS[of.id], T = DG.TIERS[d.tier];
    Object.assign(info, { title:d.name, col:T.color, tier:T.name + " · Powerup", desc:d.desc, flavor:d.flavor });
    const have = G.player.items[of.id];
    if(have) info.lines.push({ t:"You carry " + (have > 1 ? have : "one") + " already. It stacks.", c:DIM });
    DG.DUOS.forEach(du=>{
      const other = du.a === of.id ? du.b : du.b === of.id ? du.a : null;
      if(other && G.player.items[other]) info.lines.push({ t:"With your " + DG.ITEMS[other].name + ": " + du.name + ".", c:"#c88ab8" });
    });
  } else if(of.kind === "active"){
    const A = DG.ACTIVES[of.id];
    Object.assign(info, { title:A.name, col:GOLD2, tier:"Active item · charged by " + A.charge + (A.charge > 1 ? " rooms" : " room"), desc:A.desc + " (F)" });
    if(G.player.active) info.lines.push({ t:"Replaces your " + DG.ACTIVES[G.player.active.id].name + ".", c:DIM });
  } else if(of.kind === "gun"){
    const gun = of.gun, R0 = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element], s = DG.Loot.stats(gun, G.mods), sp = DG.SPELLS[s.spell];
    Object.assign(info, { title:gun.name, col:gun.ascended ? "#ffb12e" : R0.color, tier:R0.name + " · " + E.name + " " + DG.GUNS[gun.base].name,
      desc:Math.round(s.dmg*10)/10 + (s.pellets > 1 ? "×" + s.pellets : "") + " damage, " + Math.round(s.rate*10)/10 + (Math.round(s.rate*10) === 10 ? " shot" : " shots") + " a second, " + s.mag + " to a load. Its spell: " + sp.name + ".",
      flavor:gun.flavour });
    const inn = (gun.innate || []).filter(id=> DG.ITEMS[id]).map(id=> DG.ITEMS[id].name);
    if(inn.length) info.lines.push({ t:"Built in: " + inn.join(", ") + ".", c:"#b8a8c0" });
  } else if(of.kind === "heal"){
    Object.assign(info, { title:of.name || "Suspicious Soup", col:"#c8402c", tier:"Provision", desc:"Heals " + (of.amount || 40) + ".", flavor:"Something is floating in it." });
  } else if(of.kind === "ward"){
    Object.assign(info, { title:of.name || "Wards", col:WARD, tier:"Provision", desc:"+" + (of.n || 1) + " wards. Each one turns aside a single blow." });
  } else return null;
  return info;
};
/* drawn above the E prompt: the medallion on the left, the rest beside it */
H.offerCard = function(g, info, cx, yb, k, W, p){
  const small = W < 700, pad = 14*k, is = (small ? 58 : 78)*k;
  const cw = Math.min(W - 24, (small ? 420 : 480)*k), tx = pad*2 + is, tw = cw - tx - pad;
  const col = mute(info.col, 0.3);
  // measure it all first
  g.font = F("500", 15*k, BOOK); const desc = wrap(g, info.desc || "", tw);
  g.font = F("italic 500", 14*k, BOOK); const flav = info.flavor ? wrap(g, info.flavor, tw) : [];
  g.font = F("500", 14*k, BOOK); const more = []; info.lines.forEach(l=> wrap(g, l.t, tw).forEach(t=> more.push({ t, c:l.c })));
  const nsz = fit(g, info.title, 21*k, tw, "600", SERIF, 0.03);
  const broke = info.currency === "gold" && p.gold < info.price;
  const price = info.currency === "gold" ? info.price + " gold" + (broke ? "  ·  you have " + p.gold : "") : info.currency === "hp" ? "costs " + info.price + " of your max health" : null;
  const th = 6*k + 20*k + 14*k + 12*k + desc.length*18*k + (flav.length ? 3*k + flav.length*17*k : 0) + (more.length ? 4*k + more.length*17*k : 0) + (price ? 22*k : 0);
  const h = Math.max(is + pad*2, th + pad*1.4), x = cx - cw/2, y = yb - h;
  frame(g, x, y, cw, h, "rgba(9,7,7,.94)");
  // the tier's colour, faint, along the top edge
  const edge = g.createLinearGradient(x, 0, x + cw, 0); edge.addColorStop(0, "rgba(0,0,0,0)"); edge.addColorStop(0.5, col); edge.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.globalAlpha *= 0.6; g.fillStyle = edge; g.fillRect(R(x), R(y), R(cw), 2); g.restore();
  DG.Icons.draw(g, info.key, x + pad + is/2, y + Math.min(h/2, pad + is/2 + 4*k), is, H.dpr);
  let ly = y + pad + 6*k;
  text(g, info.tier.toUpperCase(), x + tx, ly, 10.5*k, col, "left", "700", SERIF, 2.2); ly += 20*k;
  text(g, info.title, x + tx, ly, nsz, mute(info.col, 0.5), "left", "600", SERIF, nsz*0.03); ly += 14*k;
  const rg = g.createLinearGradient(x + tx, 0, x + tx + tw, 0); rg.addColorStop(0, "rgba(200,164,90,.6)"); rg.addColorStop(1, "rgba(200,164,90,0)");
  g.fillStyle = rg; g.fillRect(R(x + tx), R(ly), R(tw), 1); ly += 12*k;
  desc.forEach(l=>{ text(g, l, x + tx, ly, 15*k, BONE, "left", "500", BOOK); ly += 18*k; });
  if(flav.length){ ly += 3*k; flav.forEach(l=>{ text(g, l, x + tx, ly, 14*k, DIM, "left", "italic 500", BOOK); ly += 17*k; }); }
  if(more.length){ ly += 4*k; more.forEach(l=>{ text(g, l.t, x + tx, ly, 14*k, l.c, "left", "500", BOOK); ly += 17*k; }); }
  if(price){
    ly += 5*k;
    const bad = info.currency === "hp" || broke, cx2 = x + tx + 5*k;
    if(info.currency === "gold"){
      const cr = 5*k; g.fillStyle = "rgba(0,0,0,.9)"; g.beginPath(); g.arc(cx2, ly, cr + 1.5, 0, Math.PI*2); g.fill();
      const cg = g.createRadialGradient(cx2 - 1, ly - 1.5, 1, cx2, ly, cr); cg.addColorStop(0, "#f0d890"); cg.addColorStop(1, "#8a6a30");
      g.fillStyle = cg; g.beginPath(); g.arc(cx2, ly, cr, 0, Math.PI*2); g.fill();
    } else diamond(g, cx2, ly, 5*k, HP2, "rgba(0,0,0,.9)");
    text(g, price, x + tx + 16*k, ly + 1, 13*k, bad ? HP2 : GOLD2, "left", "700", SERIF, 1);
  }
};

/* ---- the gun cards ---- */
H.guns = function(g, G, x, yb, k, maxW){
  const p = G.player, small = maxW < 9999;
  const curW = Math.min(320*k, maxW || 9999), others = [];
  p.guns.forEach((gun, i)=>{
    const cur = i === p.cur, s = DG.Loot.stats(gun, G.mods), R0 = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element];
    const ec = mute(hex(E.color), 0.2), rc = gun.ascended ? GOLD2 : mute(R0.color, 0.3);
    if(cur){
      const w = curW, h = 92*k, y = yb - h;
      frame(g, x, y, w, h);
      g.fillStyle = ec; g.fillRect(R(x + 1), R(y + 1), 3, R(h - 2));
      const nsz = fit(g, gun.name, 16*k, w - 30 - G.shotEls(gun).length*15*k, "700", SERIF);
      text(g, gun.name, x + 14, y + 15*k, nsz, rc, "left", "700");
      text(g, (gun.ascended ? "Ascended" : R0.name) + " · level " + gun.level + " · " + Math.round(s.dmg*10)/10 + (s.pellets > 1 ? "×" + s.pellets : "") + " damage", x + 14, y + 33*k, 13*k, DIM, "left", "italic 500", BOOK);
      // every element the shots carry
      G.shotEls(gun).forEach((el, j)=> diamond(g, x + w - 16*k - j*15*k, y + 15*k, 5.5*k, mute(hex(DG.ELEMENTS[el].color), 0.15), "rgba(0,0,0,.9)"));
      const ay = y + 50*k;
      if(s.mag <= 14){ for(let j=0;j<s.mag;j++){ const bx = R(x + 14 + j*10*k); g.fillStyle = "rgba(0,0,0,.9)"; g.fillRect(bx - 1, R(ay - 1), R(6*k) + 2, R(13*k) + 2); g.fillStyle = j < gun.ammo ? BONE : "#2a2622"; g.fillRect(bx, R(ay), R(6*k), R(13*k)); } }
      else text(g, gun.ammo + " / " + s.mag, x + 14, ay + 6*k, 15*k, IVORY, "left", "700");
      if(p.reloadT > 0) text(g, "RELOADING", x + w - 12, ay + 6*k, 10*k, GOLD2, "right", "700", SERIF, 2);
      const sp = DG.SPELLS[s.spell], can = p.mana >= s.spellCost;
      text(g, "RMB", x + 14, y + 76*k, 9*k, DIM, "left", "700", SERIF, 1);
      text(g, sp.name, x + 14 + 30*k, y + 76*k, 14*k, can ? ec : "#5a524a", "left", "600", BOOK);
      text(g, s.spellCost + "", x + 14 + 36*k + measure(g, sp.name, 14*k, "600", BOOK), y + 76*k, 11*k, can ? MANA2 : "#5a524a", "left", "700");
      if(gun.innate && gun.innate.length && !small) text(g, gun.innate.map(id=> DG.ITEMS[id] ? DG.ITEMS[id].name : id).join(", "), x + w - 10, y + 77*k, 12*k, "#a898b0", "right", "italic 500", BOOK);
      x += w + 18;
    } else others.push({ gun, i, s, rc, ec });
  });
  // the guns you carry but don't hold: beside the card, or stacked above it on a narrow screen
  others.forEach((o, n)=>{
    const w = 150*k, h = 40*k;
    let ox = x, oy = yb - h;
    if(small){ ox = 24 + n*(w + 12); oy = yb - 92*k - 18 - h; if(ox + w > innerWidth - 12){ ox = 24; oy -= h + 12; } }
    else x += w + 14;
    frame(g, ox, oy, w, h, "rgba(10,8,8,.8)", false);
    g.fillStyle = o.ec; g.fillRect(R(ox + 1), R(oy + 1), 2, R(h - 2));
    g.font = F("700", 12*k);
    let nm = o.gun.name; while(g.measureText(nm).width > w - 26 && nm.length > 4) nm = nm.slice(0, -2);
    text(g, nm + (nm !== o.gun.name ? "…" : ""), ox + 11, oy + 13*k, 12*k, o.rc, "left", "700");
    text(g, "[" + (o.i + 1) + "]  " + o.gun.ammo + " / " + o.s.mag, ox + 11, oy + 29*k, 12*k, DIM, "left", "500", BOOK);
  });
};

/* ---- the map: it starts dark, and rooms go on it as you find them ----
   visited rooms are filled (cleared ones paler, the one you're in gold);
   rooms you've glimpsed are dim; doorways out of a visited room show where
   something waits as a faint dashed outline. A room that's just gone on
   the map fades in with a gold flash. Corridors link what you know. */
H.mapReveal = {};
/* ROOMS: a little key (bow, shaft, two teeth), for vaults on the map */
H.keyMark = function(g, x, y, s, col){
  g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.2, s*0.16); g.lineCap = "round";
  g.beginPath(); g.arc(x - s*0.32, y, s*0.2, 0, Math.PI*2); g.stroke();
  g.beginPath(); g.moveTo(x - s*0.12, y); g.lineTo(x + s*0.45, y); g.moveTo(x + s*0.3, y); g.lineTo(x + s*0.3, y + s*0.22); g.moveTo(x + s*0.45, y); g.lineTo(x + s*0.45, y + s*0.18); g.stroke();
  g.restore();
};
H.minimap = function(g, G, xr, y, small){
  const D = G.D, cs = small ? 9 : 12, gap = 3, lost = G.curses.indexOf("lost") >= 0;
  const visited = r=> r.visited || (r.type === "secret" && r.found);
  const known = r=> visited(r) || r.seen || r.hinted || r.known;
  // a doorway out of somewhere you've been: you know there's a room there, not what it is
  const beyond = r=> !lost && r.type !== "secret" && r.links.some(id=> visited(D.rooms[id]) && D.rooms[id].type !== "secret");
  const shown = D.rooms.filter(r=> known(r) || beyond(r));
  if(!shown.length) return 0;
  const key = G.floor + ":" + G.seedWord, now = G.t;
  if(H.mapReveal.key !== key) H.mapReveal = { key, at:{} };
  const cells = []; shown.forEach(r=> r.cells.forEach(c=> cells.push(c)));
  const minx = Math.min(...cells.map(c=> c[0])), maxx = Math.max(...cells.map(c=> c[0])), miny = Math.min(...cells.map(c=> c[1])), maxy = Math.max(...cells.map(c=> c[1]));
  const cw = cs*1.4 + gap, ch = cs + gap;
  const w = (maxx - minx + 1)*cw + 16, h = (maxy - miny + 1)*ch + 16;
  const x = xr - w;
  frame(g, x, y, w, h, "rgba(8,6,6,.78)");
  const ICON = { boss:"☠", shop:"$", treasure:"◆", puzzle:"?", secret:"★", pond:"♣", altar:"†", start:"", throne:"♚", cage:"!", gamble:"⁂", olm:"☼" };
  const box = r=>{ const rx = x + 8 + (r.c0x - minx)*cw, ry = y + 8 + (r.c0y - miny)*ch; return { rx, ry, rw:(r.c1x - r.c0x + 1)*cw - gap, rh:(r.c1y - r.c0y + 1)*ch - gap }; };
  // corridors between rooms you know
  g.strokeStyle = "rgba(150,132,104,.55)"; g.lineWidth = 2;
  shown.forEach(r=> r.links.forEach(id=>{
    const o = D.rooms[id]; if(id < r.id || shown.indexOf(o) < 0 || !(visited(r) || visited(o)) || o.type === "secret" && !visited(o)) return;
    const a = box(r), b = box(o);
    g.beginPath(); g.moveTo(R(a.rx + a.rw/2), R(a.ry + a.rh/2)); g.lineTo(R(b.rx + b.rw/2), R(b.ry + b.rh/2)); g.stroke();
  }));
  shown.forEach(r=>{
    const here = G.room === r, v = visited(r), k = known(r);
    const { rx, ry, rw, rh } = box(r);
    const state = v ? "v" : k ? "k" : "b";
    const rev = H.mapReveal.at;
    if(!rev[r.id] || rev[r.id].s !== state) rev[r.id] = { s:state, t:now };
    const age = now - rev[r.id].t, f = Math.min(1, age/0.6);   // fade in over 0.6 s
    g.save(); g.globalAlpha = 0.25 + 0.75*f;
    if(state === "b"){
      g.setLineDash([3, 3]); g.strokeStyle = "#5a5046"; g.lineWidth = 1;
      g.strokeRect(R(rx) + 0.5, R(ry) + 0.5, R(rw) - 1, R(rh) - 1); g.setLineDash([]);
    } else if(state === "k"){
      g.fillStyle = "#211c18"; g.fillRect(R(rx), R(ry), R(rw), R(rh));
      g.strokeStyle = "#5a5046"; g.lineWidth = 1; g.strokeRect(R(rx) + 0.5, R(ry) + 0.5, R(rw) - 1, R(rh) - 1);
    } else {
      g.fillStyle = here ? GOLD : r.active ? "#8a2418" : r.cleared || r.type !== "combat" ? "#6e6252" : "#4a4036";
      g.fillRect(R(rx), R(ry), R(rw), R(rh));
      g.strokeStyle = here ? "#fff0c0" : "#8a7a62"; g.lineWidth = 1; g.strokeRect(R(rx) + 0.5, R(ry) + 0.5, R(rw) - 1, R(rh) - 1);
    }
    // the moment it goes on the map: a gold flash that spreads and fades
    if(age < 0.9 && state !== "b"){ const q = age/0.9; g.globalAlpha = 1 - q; g.strokeStyle = GOLD; g.lineWidth = 2; g.strokeRect(R(rx - q*5), R(ry - q*5), R(rw + q*10), R(rh + q*10)); }
    g.restore();
    const ic = ICON[r.type];
    if(ic && (v || r.seen || r.hinted)) text(g, ic, rx + rw/2, ry + rh/2 + 1, cs*0.85, here ? INK : !v ? "#7a6a58" : r.type === "boss" ? "#d04a34" : r.type === "pond" ? GREEN : r.type === "altar" || r.type === "throne" ? "#c05a7a" : r.type === "olm" ? "#ffc870" : GOLD, "center", "700", "Georgia,serif");
    // ROOMS: behind a locked door, a key: you can see the chains from the room next door
    if(DG.Dungeon.behindLock(D, r)) H.keyMark(g, rx + rw/2, ry + rh/2, cs*0.8, here ? INK : v ? GOLD : "#c8a45a");
  });
  if(lost) text(g, "?", x + w/2, y + h/2, 20, "#c88ab8", "center", "700");
  return h;
};

})();
