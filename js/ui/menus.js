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
        <p>Kills give <b>XP</b>; each level lets you pick a <b>boon</b>. <b>Frog ponds</b> teach Gribbus new tricks. <b>Golden flies</b> unlock rarer ones for every future run.</p>
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
        <p><kbd>ESC</kbd> pause &nbsp; <kbd>M</kbd> sound</p>
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
    const f = i + 1, B = DG.BOSSES[F.boss], done = felled.indexOf(f) >= 0, here = f === G.floor && !done;
    const state = done ? "cut" : here ? "here" : f < G.floor ? "past" : "below";
    return `<li class="${state}"><span class="fl">${f}</span><span class="nm">${esc(F.name)}</span><span class="bs">${done ? "✝ " : ""}${esc(B ? B.name : "")}</span></li>`;
  }).join("");
  const roads = [];
  if(p.quests.ember) roads.push(`<span class="chipx" style="--c:#ff9a4a">The Ember: it wants to go down, past the Heart</span>`);
  if(p.quests.crown && !(G.roads && G.roads.rot.stage)) roads.push(`<span class="chipx" style="--c:#7ac84a">The Crown of the Bog: Gribbus has plans</span>`);
  // the Rot road, once he's drunk from the lily: every step, done or not
  const rot = G.roads && G.roads.rot;
  const rotRoad = rot && rot.stage >= 1 && DG.Roads ? `<h4 class="road rot">The Rot</h4><ol class="steps">${DG.Roads.rotSteps(G).map(s=> `<li class="${s.done ? "done" : ""}">${esc(s.text)}</li>`).join("")}</ol>` : "";
  const shut = G.roads && G.roads.lantern.closed ? `<p class="tally shut">The Lantern road is shut.</p>` : "";
  return `<div class="journal">
      <h4>The road down</h4>
      <p class="mission">The Gloom is a rot coming up from the Heart at the bottom of the Keep. Each warden below is one of its roots. Go down. Cut them. Still the Heart.</p>
      <ol class="roots">${rows}</ol>
      <p class="tally">Lairs cleared: <b>${G.stats.lairs || 0}</b> · Puzzles solved: <b>${G.stats.puzzles || 0}</b> · Secrets: <b>${G.stats.secrets || 0}</b></p>
      ${roads.length ? `<div class="chips">${roads.join("")}</div>` : ""}
      ${rotRoad}${shut}
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
    : `<p class="hint">No powerups yet. Treasure rooms, shops, bosses, chests and secrets hold them, and they stack in strange and terrible ways.</p>`;
  const duoList = (G.mods.duos || []).map(n=> DG.DUOS.find(d=> d.name === n)).filter(Boolean);
  const duos = duoList.map(d=> `<div class="pw duo" style="--c:#c86aa8"><span class="pair">${icon(d.a, 34)}${icon(d.b, 34)}</span><div class="pwt"><b>${esc(d.name)}</b><small>duo · ${esc(DG.ITEMS[d.a].name)} + ${esc(DG.ITEMS[d.b].name)}</small><span>${esc(d.desc)}</span></div></div>`).join("");
  const forms = (G.mods.sets || []).map(id=> DG.SETS.find(x=> x.id === id)).filter(Boolean).map(s=> pw("set:" + s.id, "#c07ab8", s.name, "transformation", s.desc)).join("");
  const boons = p.boons.length ? p.boons.map(id=> `<span class="chipx" style="--c:#b8ff6a" title="${esc(DG.BOONS[id].desc)}">${esc(DG.BOONS[id].name)}</span>`).join("") : `<span class="hint">Level up to choose boons.</span>`;
  const frog = G.gribbus && G.gribbus.buffs.length ? G.gribbus.buffs.map(id=> `<span class="chipx" style="--c:#9cff6a" title="${esc(DG.FROG_BUFFS[id].desc)}">${icon("frog:" + id, 22, "ico sm")}${esc(DG.FROG_BUFFS[id].name)}</span>`).join("") : `<span class="hint">Find a frog pond to teach Gribbus a trick.</span>`;
  const act = p.active ? pw("active:" + p.active.id, "#e8c878", DG.ACTIVES[p.active.id].name, "active item · F", DG.ACTIVES[p.active.id].desc) : "";
  UI.show(`
    <div class="panel scroll bagp">
      <h2 class="head">SATCHEL</h2>
      ${UI.journal(G)}
      <div class="guns">${p.guns.map(gunCard).join("")}</div>
      ${act || forms || duos ? `<h4>Held and bound</h4><div class="pws">${act}${forms}${duos}</div>` : ""}
      <h4>Powerups (${ids.length})</h4>${items}
      <h4>Boons</h4><div class="chips">${boons}</div>
      <h4>Gribbus</h4><div class="chips">${frog}</div>
      ${(p.pacts || []).length ? `<h4>The Red God's due</h4><div class="chips">${p.pacts.map(k=> `<span class="chipx" style="--c:#d0402a" title="${esc(DG.PACTS[k].desc)}">${esc(DG.PACTS[k].name)}: ${esc(DG.PACTS[k].desc)}</span>`).join("")}</div>` : ""}
      <div class="row"><button class="item back" data-act="closeBag">CLOSE <small>TAB</small></button></div>
    </div>`, "bag");
};

/* ---- ROOMS: Brother Olm, the Lantern Pilgrim ----
   His menu rides on the game's "choose" state (the world waits while you
   talk). Mouse: click. Keys: 1-9, arrows and Enter, Esc to leave. */
const OLM_CSS = `
.screens.olm{display:flex;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 45%,rgba(40,26,12,.82) 0%,rgba(8,6,4,.95) 60%,rgba(3,2,2,.98) 100%);}
.olmp{display:grid;grid-template-columns:150px minmax(0,560px);gap:26px;align-items:start;max-width:780px;width:calc(100% - 32px);padding:22px 26px;background:linear-gradient(180deg,rgba(14,10,7,.94),rgba(8,6,4,.96));border:1px solid rgba(200,164,90,.28);box-shadow:0 0 0 1px #000,0 18px 60px rgba(0,0,0,.7);}
.olmp .face{width:150px;height:190px;position:relative;}
.olmp .face svg{width:100%;height:100%;filter:drop-shadow(0 0 18px rgba(255,170,70,.35));}
.olmp .face .lamp{animation:olmflick 2.6s infinite ease-in-out;}
@keyframes olmflick{0%,100%{opacity:.95}40%{opacity:.75}55%{opacity:1}70%{opacity:.82}}
.olmp h2.head{margin:0 0 4px;font-size:26px;letter-spacing:.14em;}
.olmp .who{color:#b89a6a;font-size:13px;letter-spacing:.2em;text-transform:uppercase;margin-bottom:12px;}
.olmp .olmline{font-size:19px;line-height:1.45;color:#eadcc0;font-style:italic;min-height:58px;margin:0 0 14px;padding:12px 16px;border-left:2px solid #c8a45a;background:linear-gradient(90deg,rgba(40,28,14,.7),rgba(10,8,6,0));animation:olmline .45s ease-out;}
@keyframes olmline{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.olmp .purse{color:#c8b48a;font-size:14px;margin-bottom:10px;letter-spacing:.06em;}
.olmp .purse b{color:#ffd27a;}
.olmp .opts{display:flex;flex-direction:column;gap:6px;}
.olmp .item.opt{display:flex;align-items:center;justify-content:flex-start;gap:12px;text-align:left;white-space:normal;padding:8px 14px 8px 30px;}
.olmp .item.opt kbd{flex:none;}
.olmp .item.opt .t{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;flex:1;}
.olmp .item.opt b{font-weight:600;color:#e2d2a8;letter-spacing:.05em;}
.olmp .item.opt small{opacity:.85;font-size:13px;margin:0;color:#c8b898;letter-spacing:.02em;}
.olmp .item.opt[disabled]{opacity:.38;}
.olmp .item.opt img{flex:none;}
.olmp .hint{margin-top:10px;}
@media (max-width:640px){ .olmp{grid-template-columns:1fr;gap:10px;} .olmp .face{width:90px;height:110px;margin:0 auto;} .olmp .olmline{font-size:16px;} }`;
function olmStyle(){ if(document.getElementById("olm-css")) return; const s = document.createElement("style"); s.id = "olm-css"; s.textContent = OLM_CSS; document.head.appendChild(s); }
/* his likeness: a pot helm, a cowl, a lantern held up (drawn, not a photo; he'd never sit for one) */
const OLM_FACE = `<svg viewBox="0 0 150 190" aria-hidden="true">
  <defs><radialGradient id="olmL" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".35" stop-color="#ff9a3a" stop-opacity=".8"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/></radialGradient></defs>
  <circle class="lamp" cx="112" cy="104" r="44" fill="url(#olmL)"/>
  <path d="M18 190 C20 140 36 118 75 112 C114 118 130 140 132 190Z" fill="#3a2e24" stroke="#120c08" stroke-width="2"/>
  <path d="M30 190 C34 150 50 132 75 128 C100 132 116 150 120 190Z" fill="#5a4a3a" stroke="#120c08" stroke-width="2"/>
  <path d="M38 132 C40 112 54 104 75 104 C96 104 110 112 112 132 C100 126 50 126 38 132Z" fill="#6a3a22" stroke="#120c08" stroke-width="2"/>
  <path d="M34 70 C34 30 52 14 75 14 C98 14 116 30 116 70 C116 92 104 106 75 108 C46 106 34 92 34 70Z" fill="#5c5650" stroke="#120c08" stroke-width="2.5"/>
  <path d="M40 60 C46 40 60 30 75 30 C90 30 104 40 110 60" fill="none" stroke="#7a726a" stroke-width="3"/>
  <rect x="40" y="62" width="70" height="9" rx="3" fill="#0c0806"/>
  <circle cx="60" cy="66" r="2" fill="#ffb84a"/><circle cx="90" cy="66" r="2" fill="#ffb84a"/>
  <path d="M75 72 L75 104" stroke="#3a3430" stroke-width="3"/>
  <g fill="#7a5a3a">${[48, 58, 68, 82, 92, 102].map(x=> `<circle cx="${x}" cy="88" r="2"/>`).join("")}</g>
  <path d="M103 86 L120 96" stroke="#2a2420" stroke-width="3"/>
  <rect x="104" y="96" width="16" height="22" rx="2" fill="#2a2420" stroke="#120c08" stroke-width="1.5"/>
  <rect x="107" y="99" width="10" height="15" fill="#ffc870"/>
</svg>`;
UI.olm = function(G){
  olmStyle();
  const c = G.choice, p = G.player;
  const opts = c.options.map((o, i)=> `<button class="item opt" data-act="olm" data-i="${i}" ${o.disabled ? "disabled" : ""}>
      <kbd>${i + 1}</kbd>${o.icon ? icon(o.icon, 30) : ""}<span class="t"><b>${esc(o.label)}</b>${o.sub ? `<small>${esc(o.sub)}</small>` : ""}</span></button>`).join("");
  UI.show(`
    <div class="olmp">
      <div class="face">${OLM_FACE}</div>
      <div>
        <h2 class="head">BROTHER OLM</h2>
        <div class="who">the Lantern Pilgrim${c.page === "trade" ? " · a trade" : ""}</div>
        <p class="olmline">“${esc(c.line)}”</p>
        <div class="purse"><b>${p.gold}</b> gold · <b>${p.keys}</b> ${p.keys === 1 ? "key" : "keys"} · <b>${Math.ceil(p.hp)}</b>/${p.maxHp} health</div>
        <div class="opts">${opts}</div>
        <p class="hint">Click, or press 1-${c.options.length}. Esc to ${c.page === "trade" ? "go back" : "leave"}.</p>
      </div>
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
    `<span class="sigil ${k}${m[k] ? " found" : ""}" title="${m[k] ? esc(DG.ENDINGS[k].title) : "???"}">${{ dawn:"&#9788;", flame:"&#10022;", bog:"&#9819;" }[k] || "?"}</span>`).join("")}<small>${n}/${Object.keys(DG.ENDINGS).length} endings</small></div>`;
};

UI.end = function(G, won){
  const s = G.stats, m = Math.floor(s.time/60), sec = Math.floor(s.time % 60);
  const killer = { orb:"Grubnok's royal spit", rock:"a thrown rock", dart:"a dart trap", hex:"a shaman's hex", spikes:"spikes", vent:"a fire vent", boom:"a goblin bomb", pit:"a pit, and a long fall", brute:"a Brute's embrace", king:"Grubnok's belly", grunt:"a Grunt's rusty blade", sneak:"a Sneak, from behind",
    spore:"spores", ecto:"ectoplasm", wail:"a banshee's wail", arrow:"a skeleton's arrow", tear:"the Bride's tears", blood:"the Heart's blood", laser:"a terrible stare", slam:"a tentacle", blob:"a blob", ghost:"a ghost", altar:"the altar's price", matriarch:"the Morel Matriarch", bride:"the Weeping Bride", eye:"the Eye Below", heart:"the Gloom Heart", rotling:"a Rotling", spitter:"Mould Spitter acid", acid:"Mould Spitter acid", bloater:"a Bloater", husk:"a Blight Husk", spores:"Gloom spores", "giving up":"despair" };
  const why = G.lastHurt ? (killer[G.lastHurt] || G.lastHurt) : "the dark";
  const END = Object.assign({ after:"" }, DG.ENDINGS[G.ending] || DG.ENDINGS.dawn,
    { after:{ dawn:"Daylight, at last.", flame:"The fire is tended again.", bog:"Long may he croak." }[G.ending] || "" });
  UI.show(`
    <div class="endwrap">
      <div class="died-band"><h1 class="died ${won ? "win" : ""}">${won ? esc(END.title) : "YOU DIED"}</h1>
        <p class="died-sub">${won ? esc(END.sub) + " " + esc(END.after) : "Slain by " + esc(why) + ", on floor " + G.floor + ", in " + esc(G.D.theme.name) + "."}</p></div>
      <div class="after">
      <div class="stats">
        <span><b>${G.floor}</b>floor</span><span><b>${s.kills}</b>kills</span><span><b>${s.items}</b>powerups</span><span><b>${s.reactions}</b>reactions</span><span><b>${s.rooms}</b>rooms</span>
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
