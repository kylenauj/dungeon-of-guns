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
      <div class="logo"><span>DUNGEON</span><div class="of"><i></i>of<i></i></div><span>GUNS</span></div>
      <p class="tag-line"><b>Abandon hope. Bring ammunition.</b>A wizard, a frog, and a dungeon that rots a little more with every floor you descend.</p>
      <div class="menu">
        <button class="item" data-act="new">NEW RUN <small>a fresh descent</small></button>
        <div class="seed-row"><input id="seed" maxlength="12" placeholder="SEED (optional)" spellcheck="false" autocomplete="off"><button class="item small" data-act="seeded">PLAY SEED</button></div>
        <button class="item" data-act="how">HOW TO PLAY</button>
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
        <button class="item" data-act="ink">LOOK <small>${DG.Stage.fancy ? "ink" : "plain"}</small></button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="music">MUSIC <small>${DG.Audio.musicOn === false ? "off" : "on"}</small></button>
      </div>
      ${b.runs ? `<p class="hint">Descents ${b.runs} · deepest floor ${b.floor} · foes slain ${b.kills}${b.wins ? " · escapes " + b.wins : ""}</p>` : `<p class="hint">Click anywhere to wake the sound. Something down there is listening.</p>`}
    </div>`, "title");
};

UI.how = function(back){
  UI.show(`
    <div class="panel scroll">
      <h2 class="head">HOW TO PLAY</h2>
      <div class="cols">
      <div class="note">
        <p>You are <b>Zippy</b>, a wizard who casts spells <b>through guns</b>. <b>Gribbus</b> the frog hops at your heel and licks things best left unlicked. Clear a room and its doors unseal. Slay the floor's <b>boss</b> and take the portal down. Five floors, each fouler than the last.</p>
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
        <p><kbd>ESC</kbd> pause &nbsp; <kbd>M</kbd> sound &nbsp; <kbd>P</kbd> pixels &nbsp; <kbd>V</kbd> look</p>
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
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
        <button class="item" data-act="ink">LOOK <small>${DG.Stage.fancy ? "ink" : "plain"}</small></button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="music">MUSIC <small>${DG.Audio.musicOn === false ? "off" : "on"}</small></button>
        <button class="item" data-act="abandon">GIVE UP <small>end this run</small></button>
      </div>
    </div>`, "pause");
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
      <div class="guns">${p.guns.map(gunCard).join("")}</div>
      ${act || forms || duos ? `<h4>Held and bound</h4><div class="pws">${act}${forms}${duos}</div>` : ""}
      <h4>Powerups (${ids.length})</h4>${items}
      <h4>Boons</h4><div class="chips">${boons}</div>
      <h4>Gribbus</h4><div class="chips">${frog}</div>
      <div class="row"><button class="item back" data-act="closeBag">CLOSE <small>TAB</small></button></div>
    </div>`, "bag");
};

/* ---- level up: pick a boon ---- */
UI.choose = function(G){
  const c = G.choice; if(!c) return;
  UI.show(`
    <div class="title-wrap">
      <h2 class="head">LEVEL ${c.level}</h2>
      <p class="hint">Strength gathers. Choose one boon (1, 2, 3 or click).</p>
      <div class="boons">${c.options.map((id, i)=>{ const B = DG.BOONS[id];
        return `<button class="item boon" data-act="boon" data-i="${i}"><kbd>${i + 1}</kbd><b>${esc(B.name)}</b><small>${esc(B.desc)}</small></button>`; }).join("")}</div>
    </div>`, "choose");
};

UI.end = function(G, won){
  const s = G.stats, m = Math.floor(s.time/60), sec = Math.floor(s.time % 60);
  const killer = { orb:"Grubnok's royal spit", rock:"a thrown rock", dart:"a dart trap", hex:"a shaman's hex", spikes:"spikes", vent:"a fire vent", boom:"a goblin bomb", pit:"a pit, and a long fall", brute:"a Brute's embrace", king:"Grubnok's belly", grunt:"a Grunt's rusty blade", sneak:"a Sneak, from behind",
    spore:"spores", ecto:"ectoplasm", wail:"a banshee's wail", arrow:"a skeleton's arrow", tear:"the Bride's tears", blood:"the Heart's blood", laser:"a terrible stare", slam:"a tentacle", blob:"a blob", ghost:"a ghost", altar:"the altar's price", matriarch:"the Morel Matriarch", bride:"the Weeping Bride", eye:"the Eye Below", heart:"the Gloom Heart", rotling:"a Rotling", spitter:"Mould Spitter acid", acid:"Mould Spitter acid", bloater:"a Bloater", husk:"a Blight Husk", spores:"Gloom spores", "giving up":"despair" };
  const why = G.lastHurt ? (killer[G.lastHurt] || G.lastHurt) : "the dark";
  UI.show(`
    <div class="endwrap">
      <div class="died-band"><h1 class="died ${won ? "win" : ""}">${won ? "YOU ESCAPED" : "YOU DIED"}</h1>
        <p class="died-sub">${won ? "The dungeon's heart is still. Daylight, at last. Gribbus croaks once, very proudly." : "Slain by " + esc(why) + ", on floor " + G.floor + ", in " + esc(G.D.theme.name) + "."}</p></div>
      <div class="after">
      <div class="stats">
        <span><b>${G.floor}</b>floor</span><span><b>${s.kills}</b>kills</span><span><b>${s.items}</b>powerups</span><span><b>${s.reactions}</b>reactions</span><span><b>${s.rooms}</b>rooms</span>
        <span><b>${s.gold}</b>gold</span><span><b>${s.secrets}</b>secrets</span><span><b>${s.puzzles}</b>puzzles</span><span><b>${m}:${String(sec).padStart(2, "0")}</b>time</span>
      </div>
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
