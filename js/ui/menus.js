/* ------------------------------------------------------------------ *
 *  Everything that isn't the game: the title, pause, the satchel, level-up
 *  boons, how to play, and the end of a run.
 *  Plain DOM, dressed as an old grim book: engraved capitals, thin gold
 *  rules, and a YOU DIED that takes its time.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const UI = DG.UI = {};
const el = id=> document.getElementById(id);
const esc = s=> String(s).replace(/[&<>"]/g, c=> ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
const hex = c=> "#" + new THREE.Color(c).getHexString();
/* an item's medallion as an <img> (drawn at twice the size, for sharp screens) */
const icon = (key, s, cls)=> `<img class="${cls || "ico"}" src="${DG.Icons.url(key, s*2)}" width="${s}" height="${s}" alt="">`;

UI.show = function(html, cls){
  const s = el("screens");
  s.className = "screens on " + (cls || "");
  s.innerHTML = html;
  s.querySelectorAll("[data-act]").forEach(b=> b.addEventListener("click", e=>{ e.stopPropagation(); DG.Audio.play("select"); UI.act(b.dataset.act, b); }));
  const first = s.querySelector(".item:not([disabled])"); if(first) first.classList.add("sel");
  UI.open = true;
};
UI.hide = function(){ const s = el("screens"); s.className = "screens"; s.innerHTML = ""; UI.open = false; };
UI.handlers = {};
UI.act = function(a, b){ const f = UI.handlers[a]; if(f) f(b); };
UI.on = function(map){ Object.assign(UI.handlers, map); };
UI.on({ music: b=>{ const on = DG.Audio.toggleMusic(); if(b) b.querySelector("small").textContent = on ? "on" : "off"; } });

/* keyboard through menus: up/down, enter */
UI.key = function(e){
  if(!UI.open) return false;
  const items = Array.from(el("screens").querySelectorAll(".item:not([disabled])"));
  if(!items.length) return false;
  let i = items.findIndex(x=> x.classList.contains("sel"));
  if(e.code === "ArrowDown" || e.code === "KeyS"){ i = (i + 1) % items.length; }
  else if(e.code === "ArrowUp" || e.code === "KeyW"){ i = (i - 1 + items.length) % items.length; }
  else if(e.code === "Enter"){ if(items[i]) items[i].click(); return true; }
  else return false;
  items.forEach(x=> x.classList.remove("sel")); items[i].classList.add("sel"); DG.Audio.play("click");
  return true;
};

const best = ()=>{ try{ return JSON.parse(localStorage.getItem("dungeonofguns.best") || "{}"); }catch(e){ return {}; } };
UI.record = function(G){
  const b = best();
  b.runs = (b.runs || 0) + 1;
  b.floor = Math.max(b.floor || 0, G.floor);
  b.kills = (b.kills || 0) + G.stats.kills;
  if(G.state === "won") b.wins = (b.wins || 0) + 1;
  try{ localStorage.setItem("dungeonofguns.best", JSON.stringify(b)); }catch(e){}
};

UI.title = function(){
  const b = best();
  UI.show(`
    <div class="title-wrap">
      <div class="logo"><span>ZIPPY</span><div class="of"><i></i>&amp;<i></i></div><span>GRIBBUS</span></div>
      <p class="tag-line"><b>Abandon hope. Bring ammunition.</b>A wizard, a frog, and a dungeon that rots a little more with every floor you descend.</p>
      <div class="menu">
        <button class="item" data-act="new">NEW RUN <small>a fresh descent</small></button>
        <div class="seed-row"><input id="seed" maxlength="12" placeholder="SEED (optional)" spellcheck="false" autocomplete="off"><button class="item small" data-act="seeded">PLAY SEED</button></div>
        <button class="item" data-act="how">HOW TO PLAY</button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="music">MUSIC <small>${DG.Audio.musicOn === false ? "off" : "on"}</small></button>
        <button class="item" data-act="psx">LOOK <small>${DG.Stage.psx ? "PSX" : "modern"}</small></button>
      </div>
      <div class="title-foot">${UI.endingSigils()}
      ${b.runs ? `<p class="hint">Descents ${b.runs} · deepest floor ${b.floor} · foes slain ${b.kills}${b.wins ? " · escapes " + b.wins : ""}</p>` : `<p class="hint">Click anywhere to wake the sound. Something down there is listening.</p>`}</div>
    </div>`, "title");
};

UI.how = function(back){
  UI.show(`
    <div class="panel scroll">
      <h2 class="head">HOW TO PLAY</h2>
      <div class="cols">
      <div class="note">
        <p>You are <b>Zippy</b>, a hexhunter who casts spells <b>through guns</b>. <b>Gribbus</b> the toad hops at your heel and licks things best left unlicked. Clear a room and its doors unseal. Slay the floor's <b>boss</b> and take the portal down. Five floors, each fouler than the last.</p>
        <p>Every shot carries its gun's <b>element</b>. Elements <b>react</b>: fire + frost is Steam, shock + water is Conduct, and so on.</p>
        <p><b>Powerups</b> are passive and stack with everything. Ricochet + frost + crystal + wisps means bounces spawn icicles that spawn ice wisps. Godly items are rare, and some pairs make <b>duos</b>.</p>
        <p>There are no levels: you grow by what you <b>find</b>. Bosses and the lair on every floor each carry a powerup; shops sell them, and so does Brother Olm, if you meet him. A lucky run breaks wide open. Most don't. Read the enemies: their shots hang, bend and burst, and every one can be dodged.</p>
        <p><b>Gribbus' pond</b> is rare: three of his tricks float on its lily pads and he keeps one. His tricks turn up in shops and on bosses too. Now and then a run hides a <b>side road</b>: glowing mushrooms, Brother Olm met twice, or a sealed reliquary. Never more than one.</p>
        <p><b>Not every door is a door.</b> Some are paintings. Some walls are not walls: shoot or walk into suspicious stone. Trust nothing down here.</p>
      </div>
      <div class="note keys">
        <p><kbd>WASD</kbd> move &nbsp; <kbd>mouse</kbd> aim</p>
        <p><kbd>LMB</kbd> shoot &nbsp; <kbd>RMB</kbd> cast the gun's spell</p>
        <p><kbd>SPACE</kbd> blink (dodge through shots and over pits)</p>
        <p><kbd>E</kbd> open, take, buy, read &nbsp; <kbd>R</kbd> reload</p>
        <p><kbd>F</kbd> use your active item</p>
        <p><kbd>Q</kbd> / <kbd>wheel</kbd> / <kbd>1-3</kbd> switch guns</p>
        <p><kbd>TAB</kbd> satchel: everything you carry</p>
        <p><kbd>ESC</kbd> pause &nbsp; <kbd>M</kbd> sound &nbsp; <kbd>P</kbd> PSX look</p>
        <p class="hint">Gamepad: left stick move, right stick aim, RT shoot, LT spell, A blink, X use, B active, Y swap, RB satchel.</p>
      </div>
      </div>
      <div class="row"><button class="item back" data-act="${back}">BACK</button></div>
    </div>`);
};

UI.pause = function(G){
  UI.show(`
    <div class="title-wrap">
      <h2 class="head">PAUSED</h2>
      <p class="hint">Floor ${G.floor} · ${esc(G.D.theme.name)} · seed <b>${G.seedWord}</b><br>The dark waits. It is patient.</p>
      <div class="menu">
        <button class="item" data-act="resume">RESUME</button>
        <button class="item" data-act="bag">SATCHEL <small>guns and powerups</small></button>
        <button class="item" data-act="howPause">HOW TO PLAY</button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="music">MUSIC <small>${DG.Audio.musicOn === false ? "off" : "on"}</small></button>
        <button class="item" data-act="psx">LOOK <small>${DG.Stage.psx ? "PSX" : "modern"}</small></button>
        <button class="item" data-act="abandon">GIVE UP <small>end this run</small></button>
      </div>
    </div>`, "pause");
};

/* ---- the journal: what you're down here for, and how far it's got ----
   The Mission, floor by floor (each boss is a root of the Heart), and any
   other road you've stumbled onto. */
UI.journal = function(G){
  const p = G.player, n = DG.FINAL_FLOOR, felled = (G.stats.bosses || []).map(b=> b.floor);
  const rows = DG.FLOORS.slice(0, n).map((F, i)=>{
    const f = i + 1, B = DG.BOSSES[G.bossOf ? G.bossOf(f) : F.boss], done = felled.indexOf(f) >= 0, here = f === G.floor && !done;
    const state = done ? "cut" : here ? "here" : f < G.floor ? "past" : "below";
    return `<li class="${state}"><span class="fl">${f}</span><span class="nm">${esc(F.name)}</span><span class="bs">${done ? "✝ " : ""}${esc(B ? B.name : "")}</span></li>`;
  }).join("");
  // the run's side road, once you've stumbled on it: every step, done or not
  const R = DG.Roads && DG.Roads.spotted(G) ? DG.Roads.steps(G) : null;
  const road = R ? `<h4 class="road ${R.id}">${esc(R.name)}</h4><ol class="steps">${R.steps.map(s=> `<li class="${s.done ? "done" : ""}">${esc(s.text)}</li>`).join("")}</ol>${R.note ? `<p class="tally">${esc(R.note)}</p>` : ""}` : "";
  return `<div class="journal">
      <h4>The road down</h4>
      <p class="mission">The Gloom is a rot coming up from the Heart at the bottom of the Keep. Each warden below is one of its roots. Go down. Cut them. Still the Heart.</p>
      <ol class="roots">${rows}</ol>
      <p class="tally">Lairs cleared: <b>${G.stats.lairs || 0}</b> · Puzzles solved: <b>${G.stats.puzzles || 0}</b> · Secrets: <b>${G.stats.secrets || 0}</b></p>
      ${road}
    </div>`;
};

/* ---- the satchel: everything you carry ---- */
UI.bag = function(G){
  const p = G.player, L = DG.Loot;
  const gunCard = (gun, gi)=>{
    const s = L.stats(gun, G.mods), R = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element], sp = DG.SPELLS[s.spell];
    const innate = (gun.innate || []).filter(id=> DG.ITEMS[id]).map(id=> `<span class="chipx" style="--c:${DG.TIERS[DG.ITEMS[id].tier].color}" title="${esc(DG.ITEMS[id].desc)}">${icon(id, 18, "ico sm")}${esc(DG.ITEMS[id].name)}</span>`).join("");
    return `<div class="gcard ${gi === p.cur ? "cur" : ""}" style="--el:${hex(E.color)};--ra:${gun.ascended ? "#ffb12e" : R.color}">
      <div class="gname">${icon(DG.Icons.keyFor(gun), 34, "ico gico")}${esc(gun.name)}</div>
      <div class="gsub">${gun.ascended ? "Ascended" : R.name} · level ${gun.level} · ${E.name} · ${DG.GUNS[gun.base].name}</div>
      ${gun.flavour ? `<div class="gflav">${esc(gun.flavour)}</div>` : ""}
      <div class="gstats"><span>${Math.round(s.dmg*10)/10}${s.pellets > 1 ? "×" + s.pellets : ""}<small>damage</small></span><span>${Math.round(s.rate*10)/10}<small>per sec</small></span><span>${s.mag}<small>mag</small></span><span>${Math.round(L.dps(gun, G.mods))}<small>dps</small></span></div>
      <div class="gspell">RMB: <b>${sp.name}</b> (${s.spellCost} mana): ${sp.desc}</div>
      <div class="gel">Shots carry: ${G.shotEls(gun).map(e=> `<b style="color:${hex(DG.ELEMENTS[e].color)}">${DG.ELEMENTS[e].name}</b>`).join(" + ")}</div>
      ${innate ? `<div class="innate">Built in: ${innate}</div>` : ""}
    </div>`;
  };
  // powerups, grouped by tier, the greatest first; each with its medallion
  const ids = Object.keys(p.items).filter(id=> DG.ITEMS[id]).sort((a, b)=> DG.ITEMS[b].tier - DG.ITEMS[a].tier || DG.ITEMS[a].name.localeCompare(DG.ITEMS[b].name));
  const pw = (key, col, name, tag, desc, flavor)=> `<div class="pw" style="--c:${col}">${icon(key, 48)}<div class="pwt"><b>${esc(name)}</b><small>${tag}</small><span>${esc(desc)}</span>${flavor ? `<i>${esc(flavor)}</i>` : ""}</div></div>`;
  const tiers = DG.TIERS.map((T, t)=> ({ T, ids:ids.filter(id=> DG.ITEMS[id].tier === t) })).reverse().filter(x=> x.ids.length);
  const items = ids.length ? tiers.map(({ T, ids })=> `<h5 class="tierh" style="--c:${T.color}">${T.name} <span>${ids.length}</span></h5><div class="pws">${ids.map(id=>{ const it = DG.ITEMS[id];
      return pw(id, T.color, it.name + (p.items[id] > 1 ? " ×" + p.items[id] : ""), T.name, it.desc, it.flavor); }).join("")}</div>`).join("")
    : `<p class="hint">No powerups yet. Lairs and bosses carry them, shops and Brother Olm sell them, and secrets hide them. They stack in strange and terrible ways.</p>`;
  const duoList = (G.mods.duos || []).map(n=> DG.DUOS.find(d=> d.name === n)).filter(Boolean);
  const duos = duoList.map(d=> `<div class="pw duo" style="--c:#c86aa8"><span class="pair">${icon(d.a, 34)}${icon(d.b, 34)}</span><div class="pwt"><b>${esc(d.name)}</b><small>duo · ${esc(DG.ITEMS[d.a].name)} + ${esc(DG.ITEMS[d.b].name)}</small><span>${esc(d.desc)}</span></div></div>`).join("");
  const forms = (G.mods.sets || []).map(id=> DG.SETS.find(x=> x.id === id)).filter(Boolean).map(s=> pw("set:" + s.id, "#c07ab8", s.name, "transformation", s.desc)).join("");
  const boons = p.boons.length ? p.boons.map(id=> `<span class="chipx" style="--c:#b8ff6a" title="${esc(DG.BOONS[id].desc)}">${esc(DG.BOONS[id].name)}</span>`).join("") : `<span class="hint">Brother Olm gives blessings, for a price.</span>`;
  const frog = G.gribbus && G.gribbus.buffs.length ? G.gribbus.buffs.map(id=> `<span class="chipx" style="--c:#9cff6a" title="${esc(DG.FROG_BUFFS[id].desc)}">${icon("frog:" + id, 22, "ico sm")}${esc(DG.FROG_BUFFS[id].name)}</span>`).join("") : `<span class="hint">Gribbus' pond, shops and bosses hold his tricks.</span>`;
  const act = p.active ? pw("active:" + p.active.id, "#e8c878", DG.ACTIVES[p.active.id].name, "active item · F", DG.ACTIVES[p.active.id].desc) : "";
  UI.show(`
    <div class="panel scroll bagp">
      <h2 class="head">SATCHEL</h2>
      ${UI.journal(G)}
      <div class="guns">${p.guns.map(gunCard).join("")}</div>
      ${act || forms || duos ? `<h4>Held and bound</h4><div class="pws">${act}${forms}${duos}</div>` : ""}
      <h4>Powerups (${ids.length})</h4>${items}
      <h4>Blessings</h4><div class="chips">${boons}</div>
      <h4>Gribbus</h4><div class="chips">${frog}</div>
      ${(p.pacts || []).length ? `<h4>The Red God's due</h4><div class="chips">${p.pacts.map(k=> `<span class="chipx" style="--c:#d0402a" title="${esc(DG.PACTS[k].desc)}">${esc(DG.PACTS[k].name)}: ${esc(DG.PACTS[k].desc)}</span>`).join("")}</div>` : ""}
      <div class="row"><button class="item back" data-act="closeBag">CLOSE <small>TAB</small></button></div>
    </div>`, "bag");
};

/* ---- ROOMS: Brother Olm, the Lantern Pilgrim ----
   His menu rides on the game's "choose" state (the world waits while you
   talk). Mouse: click. Keys: 1-9, arrows and Enter, Esc to leave. */
const OLM_CSS = `
.screens.olm{display:flex;align-items:flex-end;justify-content:center;padding-bottom:3vh;background:linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 38%,rgba(6,5,3,.72) 62%,rgba(4,3,2,.94) 100%);}
.olmd{max-width:980px;width:calc(100% - 32px);padding:16px 22px 14px;background:linear-gradient(180deg,rgba(16,12,8,.95),rgba(8,6,4,.97));border:1px solid rgba(200,164,90,.3);border-top:2px solid rgba(232,200,120,.45);box-shadow:0 0 0 1px #000,0 -10px 50px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,220,150,.06);}
.olmd .nameplate{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:8px;}
.olmd .nameplate h2{margin:0;font-size:22px;letter-spacing:.16em;color:#ecd8a8;}
.olmd .nameplate .who{color:#a8906a;font-size:12px;letter-spacing:.22em;text-transform:uppercase;}
.olmd .nameplate .purse{margin-left:auto;color:#c8b48a;font-size:13px;letter-spacing:.05em;white-space:nowrap;}
.olmd .nameplate .purse b{color:#ffd27a;}
.olmd .olmline{font-size:18px;line-height:1.45;color:#eadcc0;font-style:italic;margin:0 0 12px;padding:8px 14px;border-left:2px solid #c8a45a;background:linear-gradient(90deg,rgba(48,34,16,.55),rgba(10,8,6,0));animation:olmline .4s ease-out;}
@keyframes olmline{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.olmd .opts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;}
.olmd .opts.trade{grid-template-columns:repeat(2,minmax(0,1fr));}
.olmd .item.opt{display:flex;align-items:center;justify-content:flex-start;gap:10px;text-align:left;white-space:normal;padding:7px 12px 7px 12px;border:1px solid rgba(200,164,90,.14);background:rgba(20,15,10,.6);}
.olmd .item.opt::before{display:none;}
.olmd .item.opt:hover,.olmd .item.opt.sel{border-color:rgba(232,200,120,.55);background:linear-gradient(90deg,rgba(200,164,90,.18),rgba(200,164,90,.04));}
.olmd .item.opt kbd{flex:none;min-width:20px;text-align:center;}
.olmd .item.opt .t{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0;flex:1;}
.olmd .item.opt b{font-weight:600;color:#e2d2a8;letter-spacing:.04em;font-size:15px;}
.olmd .item.opt small{opacity:.88;font-size:12.5px;margin:0;color:#bfae8e;letter-spacing:.01em;line-height:1.3;}
.olmd .item.opt .cost{flex:none;font-family:var(--body);font-size:13px;color:#ffd27a;border:1px solid rgba(232,200,120,.35);padding:1px 7px;white-space:nowrap;}
.olmd .item.opt .cost.no{color:#8a6a5a;border-color:rgba(140,100,80,.35);}
.olmd .item.opt .tag{flex:none;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9cd86a;}
.olmd .item.opt.special{grid-column:1/-1;border-color:rgba(200,240,170,.45);background:linear-gradient(90deg,rgba(150,220,110,.16),rgba(20,15,10,.6));}
.olmd .item.opt.special b{color:#e8ffd0;}
.olmd .item.opt.leave{grid-column:1/-1;justify-content:center;background:transparent;border-color:rgba(200,164,90,.1);}
.olmd .item.opt[disabled]{opacity:.36;}
.olmd .item.opt img{flex:none;}
.olmd .tierto{font-family:var(--body);font-size:12.5px;letter-spacing:.04em;}
.olmd .tierto i{font-style:normal;}
.olmd .hint{margin:10px 0 0;font-size:12px;opacity:.7;}
@media (max-width:640px){ .olmd .opts,.olmd .opts.trade{grid-template-columns:1fr;} .olmd .olmline{font-size:15px;} .olmd .nameplate .purse{margin-left:0;} }`;
function olmStyle(){ if(document.getElementById("olm-css")) return; const s = document.createElement("style"); s.id = "olm-css"; s.textContent = OLM_CSS; document.head.appendChild(s); }
/* Brother Olm's talk: a panel along the bottom (he and his frogs stay in view
   above it), his line, and what you can do, as cards. The trade is a grid of
   what you carry, each showing the tier it would climb to */
UI.olm = function(G){
  olmStyle();
  const c = G.choice, p = G.player, T = DG.TIERS;
  const tierName = t=> `<i style="color:${T[t].color}">${esc(T[t].name)}</i>`;
  const opts = c.options.map((o, i)=>{
    const cls = "item opt" + (o.special ? " special" : "") + (o.act === "leave" || o.act === "back" ? " leave" : "");
    const cost = o.price ? `<span class="cost${p.gold < o.price ? " no" : ""}">${o.price}g</span>` : "";
    const sub = c.page === "trade" && o.to !== undefined ? `<span class="tierto">${tierName(o.tier)} → a ${tierName(o.to)} powerup</span>` : o.sub ? `<small>${esc(o.sub)}</small>` : "";
    const ico = o.icon ? icon(o.icon, c.page === "trade" ? 38 : 32) : "";
    return `<button class="${cls}" data-act="olm" data-i="${i}" ${o.disabled ? "disabled" : ""}><kbd>${i + 1}</kbd>${ico}<span class="t"><b>${esc(o.label)}</b>${sub}</span>${o.tag ? `<span class="tag">${esc(o.tag)}</span>` : ""}${cost}</button>`;
  }).join("");
  UI.show(`
    <div class="olmd">
      <div class="nameplate"><h2 class="head">BROTHER OLM</h2><span class="who">the Lantern Pilgrim${c.page === "trade" ? " · a trade" : ""}</span>
        <span class="purse"><b>${p.gold}</b> gold · <b>${p.keys}</b> ${p.keys === 1 ? "key" : "keys"} · <b>${Math.ceil(p.hp)}</b>/${p.maxHp} health</span></div>
      <p class="olmline">“${esc(c.line)}”</p>
      <div class="opts${c.page === "trade" ? " trade" : ""}">${opts}</div>
      <p class="hint">Click, or press 1-${Math.min(9, c.options.length)}. Esc to ${c.page === "trade" ? "go back" : "leave"}.</p>
    </div>`, "olm");
  // keep the keyboard cursor where it was between his answers (a new talk starts at the top)
  const talk = c.prop + "@" + G.t; if(UI.olmTalk !== talk){ UI.olmTalk = talk; UI.olmSel = undefined; }
  const items = Array.from(el("screens").querySelectorAll(".item:not([disabled])"));
  if(UI.olmSel !== undefined){
    const b = el("screens").querySelector(`[data-i="${UI.olmSel}"]`);
    if(b && !b.disabled){ items.forEach(x=> x.classList.remove("sel")); b.classList.add("sel"); }
  }
};
UI.on({ olm: b=>{ UI.olmSel = +b.dataset.i; if(DG.app) DG.app.pick(+b.dataset.i); } });
const baseKey = UI.key;
UI.key = function(e){
  if(UI.open && el("screens").classList.contains("olm")){
    const m = /^(Digit|Numpad)([1-9])$/.exec(e.code);
    if(m){ const b = el("screens").querySelector(`[data-i="${+m[2] - 1}"]`); if(b && !b.disabled) b.click(); return true; }
  }
  return baseKey(e);
};

/* ---- level up: pick a boon ---- */
UI.choose = function(G){
  const c = G.choice; if(!c) return;
  if(c.kind === "olm") return UI.olm(G);
  UI.show(`
    <div class="title-wrap">
      <h2 class="head">LEVEL ${c.level}</h2>
      <p class="hint">Strength gathers. Choose one boon (1, 2, 3 or click).</p>
      <div class="boons">${c.options.map((id, i)=>{ const B = DG.BOONS[id];
        return `<button class="item boon" data-act="boon" data-i="${i}"><kbd>${i + 1}</kbd><b>${esc(B.name)}</b><small>${esc(B.desc)}</small></button>`; }).join("")}</div>
    </div>`, "choose");
};

/* the ending's lore, a line at a time, before the tally */
UI.lore = function(G, id){
  const E = DG.ENDINGS[id] || DG.ENDINGS.dawn;
  UI.show(`
    <div class="lorewrap ending-${id}">
      <h2 class="lore-title">${esc(E.title)}</h2>
      <div class="lore-lines">${E.lore.map((l, i)=> `<p style="animation-delay:${(0.8 + i*1.6).toFixed(1)}s">${esc(l)}</p>`).join("")}</div>
      <div class="menu" style="animation-delay:${(1.2 + E.lore.length*1.6).toFixed(1)}s"><button class="item sel" data-act="lore">CONTINUE</button></div>
    </div>`, "lore");
};
/* which endings this save has seen, as three sigils (dark until found) */
UI.endingSigils = function(){
  let m = {}; try{ m = JSON.parse(localStorage.getItem("dungeonofguns.meta") || "{}").endings || {}; }catch(e){}
  const n = Object.keys(DG.ENDINGS).filter(k=> m[k]).length;
  return `<div class="sigils" title="Endings found">${Object.keys(DG.ENDINGS).map(k=>
    `<span class="sigil ${k}${m[k] ? " found" : ""}" title="${m[k] ? esc(DG.ENDINGS[k].title) : "???"}">${{ dawn:"&#9788;", flame:"&#10022;", bog:"&#9819;", white:"&#10070;" }[k] || "?"}</span>`).join("")}<small>${n}/${Object.keys(DG.ENDINGS).length} endings</small></div>`;
};

UI.end = function(G, won){
  const s = G.stats, m = Math.floor(s.time/60), sec = Math.floor(s.time % 60);
  const killer = { orb:"Grubnok's royal spit", rock:"a thrown rock", dart:"a dart trap", hex:"a shaman's hex", spikes:"spikes", vent:"a fire vent", boom:"a goblin bomb", pit:"a pit, and a long fall", brute:"a Brute's embrace", king:"Grubnok's belly", grunt:"a Grunt's rusty blade", sneak:"a Sneak, from behind",
    spore:"spores", ecto:"ectoplasm", wail:"a banshee's wail", arrow:"a skeleton's arrow", tear:"the Bride's tears", blood:"the Heart's blood", laser:"a terrible stare", slam:"a tentacle", blob:"a blob", ghost:"a ghost", altar:"the altar's price", matriarch:"the Morel Matriarch", bride:"the Weeping Bride", eye:"the Eye Below", heart:"the Gloom Heart", rotling:"a Rotling", spitter:"Mould Spitter acid", acid:"Mould Spitter acid", bloater:"a Bloater", husk:"a Blight Husk", spores:"Gloom spores", "giving up":"despair",
    soul:"a Lantern Wight's soul-lights", bile:"a toad's bile", page:"the Archivist's pages", evilfrog:"a Gorged Toad", wight:"a Lantern Wight", toadking:"the Toad King", archivist:"the Archivist", tongue:"the Toad King's tongue" };
  const why = G.lastHurt ? (killer[G.lastHurt] || G.lastHurt) : "the dark";
  const END = Object.assign({ after:"" }, DG.ENDINGS[G.ending] || DG.ENDINGS.dawn,
    { after:{ dawn:"Daylight, at last.", flame:"The fire is tended again.", bog:"Long may he croak.", white:"The light goes where he goes." }[G.ending] || "" });
  UI.show(`
    <div class="endwrap">
      <div class="died-band"><h1 class="died ${won ? "win" : ""}">${won ? esc(END.title) : "YOU DIED"}</h1>
        <p class="died-sub">${won ? esc(END.sub) + " " + esc(END.after) : "Slain by " + esc(why) + ", on floor " + G.floor + ", in " + esc(G.D.theme.name) + "."}</p></div>
      <div class="after">
      <div class="stats">
        <span><b>${G.floor}</b>floor</span><span><b>${s.kills}</b>kills</span><span><b>${s.items}</b>powerups</span><span><b>${s.reactions}</b>reactions</span><span><b>${s.rooms}</b>rooms</span><span><b>${s.lairs || 0}</b>lairs</span>
        <span><b>${s.gold}</b>gold</span><span><b>${s.secrets}</b>secrets</span><span><b>${s.puzzles}</b>puzzles</span><span><b>${m}:${String(sec).padStart(2, "0")}</b>time</span>
      </div>
      ${won ? UI.endingSigils() : ""}
      <p class="hint">Best gun: <b>${esc(G.player.guns.slice().sort((a, b)=> DG.Loot.dps(b, G.mods) - DG.Loot.dps(a, G.mods))[0].name)}</b> · seed <b>${G.seedWord}</b></p>
      <div class="menu">
        ${won ? `<button class="item" data-act="endless">KEEP GOING <small>endless: deeper, and worse</small></button>` : ""}
        <button class="item" data-act="new">NEW RUN <small>try again</small></button>
        <button class="item" data-act="again">SAME SEED <small>${G.seedWord}</small></button>
        <button class="item" data-act="title">TITLE</button>
      </div>
      </div>
    </div>`, won ? "end win" : "end lose");
};

})();
