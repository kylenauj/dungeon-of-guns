/* ------------------------------------------------------------------ *
 *  Everything that isn't the game: the title, pause, the satchel, level-up
 *  boons, how to play, and the end of a run.
 *  Plain DOM, styled like Pine Hollow's menus.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const UI = DG.UI = {};
const el = id=> document.getElementById(id);
const esc = s=> String(s).replace(/[&<>"]/g, c=> ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" })[c]);
const hex = c=> "#" + new THREE.Color(c).getHexString();

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
      <div class="logo"><span>DUNGEON</span><small>of</small><span>GUNS</span></div>
      <p class="tag-line">Zippy the wizard, Gribbus the frog, and a dungeon that gets weirder the deeper it goes.</p>
      <div class="menu">
        <button class="item" data-act="new">NEW RUN <small>a fresh dungeon</small></button>
        <div class="seed-row"><input id="seed" maxlength="12" placeholder="SEED (optional)" spellcheck="false" autocomplete="off"><button class="item small" data-act="seeded">PLAY SEED</button></div>
        <button class="item" data-act="how">HOW TO PLAY</button>
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
        <button class="item" data-act="ink">LOOK <small>${DG.Stage.fancy ? "ink" : "plain"}</small></button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
      </div>
      ${b.runs ? `<p class="hint">Runs ${b.runs} · deepest floor ${b.floor} · goblins bopped ${b.kills}${b.wins ? " · escapes " + b.wins : ""}</p>` : `<p class="hint">Click anywhere to wake the sound.</p>`}
    </div>`, "title");
};

UI.how = function(back){
  UI.show(`
    <div class="panel scroll">
      <h2 class="head">HOW TO PLAY</h2>
      <div class="cols">
      <div class="note">
        <p>You're <b>Zippy</b>, a wizard who casts spells <b>through guns</b>. <b>Gribbus</b> the frog hops along and licks things. Clear a room and the doors open. Beat the floor's <b>boss</b> and take the portal down. Five floors, each spookier and stranger.</p>
        <p>Every shot carries its gun's <b>element</b>. Elements <b>react</b>: fire + frost is Steam, shock + water is Conduct, and so on.</p>
        <p><b>Powerups</b> are passive and stack with everything. Ricochet + frost + crystal + wisps means bounces spawn icicles that spawn ice wisps. Godly items are rare, and some pairs make <b>duos</b>.</p>
        <p>Kills give <b>XP</b>; each level lets you pick a <b>boon</b>. <b>Frog ponds</b> teach Gribbus new tricks. <b>Golden flies</b> unlock rarer ones for every future run.</p>
        <p><b>Not every door is a door.</b> Some are paintings. Some walls aren't walls: shoot or walk into suspicious stone.</p>
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
      <p class="hint">Floor ${G.floor} · ${esc(G.D.theme.name)} · seed <b>${G.seedWord}</b></p>
      <div class="menu">
        <button class="item" data-act="resume">RESUME</button>
        <button class="item" data-act="bag">SATCHEL <small>guns and powerups</small></button>
        <button class="item" data-act="howPause">HOW TO PLAY</button>
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
        <button class="item" data-act="ink">LOOK <small>${DG.Stage.fancy ? "ink" : "plain"}</small></button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="abandon">GIVE UP <small>end this run</small></button>
      </div>
    </div>`, "pause");
};

/* ---- the satchel: everything you carry ---- */
UI.bag = function(G){
  const p = G.player, L = DG.Loot;
  const gunCard = (gun, gi)=>{
    const s = L.stats(gun, G.mods), R = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element], sp = DG.SPELLS[s.spell];
    const innate = (gun.innate || []).filter(id=> DG.ITEMS[id]).map(id=> `<span class="chipx" style="--c:${DG.TIERS[DG.ITEMS[id].tier].color}" title="${esc(DG.ITEMS[id].desc)}">${esc(DG.ITEMS[id].name)}</span>`).join("");
    return `<div class="gcard ${gi === p.cur ? "cur" : ""}" style="--el:${hex(E.color)};--ra:${gun.ascended ? "#ffb12e" : R.color}">
      <div class="gname">${esc(gun.name)}</div>
      <div class="gsub">${gun.ascended ? "Ascended" : R.name} · level ${gun.level} · ${E.name} · ${DG.GUNS[gun.base].name}</div>
      ${gun.flavour ? `<div class="gflav">${esc(gun.flavour)}</div>` : ""}
      <div class="gstats"><span>${Math.round(s.dmg*10)/10}${s.pellets > 1 ? "×" + s.pellets : ""}<small>damage</small></span><span>${Math.round(s.rate*10)/10}<small>per sec</small></span><span>${s.mag}<small>mag</small></span><span>${Math.round(L.dps(gun, G.mods))}<small>dps</small></span></div>
      <div class="gspell">RMB: <b>${sp.name}</b> (${s.spellCost} mana): ${sp.desc}</div>
      <div class="gel">Shots carry: ${G.shotEls(gun).map(e=> `<b style="color:${hex(DG.ELEMENTS[e].color)}">${DG.ELEMENTS[e].name}</b>`).join(" + ")}</div>
      ${innate ? `<div class="innate">Built in: ${innate}</div>` : ""}
    </div>`;
  };
  const ids = Object.keys(p.items).filter(id=> DG.ITEMS[id]).sort((a, b)=> DG.ITEMS[b].tier - DG.ITEMS[a].tier);
  const items = ids.length ? ids.map(id=>{ const it = DG.ITEMS[id], T = DG.TIERS[it.tier];
    return `<div class="pw" style="--c:${T.color}"><b>${esc(it.name)}${p.items[id] > 1 ? " ×" + p.items[id] : ""}</b><small>${T.name}</small><span>${esc(it.desc)}</span></div>`; }).join("")
    : `<p class="hint">No powerups yet. Treasure rooms, shops, bosses, chests and secrets all have them, and they stack in strange ways.</p>`;
  const duos = (G.mods.duos || []).map(id=> DG.DUOS[id]).filter(Boolean).map(d=> `<div class="pw" style="--c:#ff4fd8"><b>${esc(d.name)}</b><small>duo</small><span>${esc(d.desc)}</span></div>`).join("");
  const boons = p.boons.length ? p.boons.map(id=> `<span class="chipx" style="--c:#b8ff6a" title="${esc(DG.BOONS[id].desc)}">${esc(DG.BOONS[id].name)}</span>`).join("") : `<span class="hint">Level up to pick boons.</span>`;
  const frog = G.gribbus && G.gribbus.buffs.length ? G.gribbus.buffs.map(id=> `<span class="chipx" style="--c:#9cff6a" title="${esc(DG.FROG_BUFFS[id].desc)}">${esc(DG.FROG_BUFFS[id].name)}</span>`).join("") : `<span class="hint">Find a frog pond to teach Gribbus a trick.</span>`;
  const act = p.active ? `<div class="pw" style="--c:#ffd23d"><b>${esc(DG.ACTIVES[p.active.id].name)}</b><small>active · F</small><span>${esc(DG.ACTIVES[p.active.id].desc)}</span></div>` : "";
  UI.show(`
    <div class="panel scroll bagp">
      <h2 class="head">SATCHEL</h2>
      <div class="guns">${p.guns.map(gunCard).join("")}</div>
      <h4>Powerups (${ids.length})</h4><div class="pws">${act}${duos}${items}</div>
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
      <h2 class="head">LEVEL ${c.level}!</h2>
      <p class="hint">Pick one. (1, 2, 3 or click)</p>
      <div class="boons">${c.options.map((id, i)=>{ const B = DG.BOONS[id];
        return `<button class="item boon" data-act="boon" data-i="${i}"><kbd>${i + 1}</kbd><b>${esc(B.name)}</b><small>${esc(B.desc)}</small></button>`; }).join("")}</div>
    </div>`, "choose");
};

UI.end = function(G, won){
  const s = G.stats, m = Math.floor(s.time/60), sec = Math.floor(s.time % 60);
  const killer = { orb:"Grubnok's royal spit", rock:"a rock", dart:"a dart trap", hex:"a shaman's hex", spikes:"spikes", vent:"a fire vent", boom:"a bomb", pit:"a pit", brute:"a Brute's hug", king:"Grubnok's belly", grunt:"a Grunt's stab", sneak:"a Sneak",
    spore:"spores", ecto:"ectoplasm", wail:"a banshee's wail", arrow:"a skeleton's arrow", tear:"the Bride's tears", blood:"the Heart's blood", laser:"a stare", slam:"a tentacle", blob:"a blob", ghost:"a ghost", altar:"the altar", matriarch:"the Shroom Matriarch", bride:"the Bride", eye:"the Eye", heart:"the Heart" };
  const why = G.lastHurt ? (killer[G.lastHurt] || G.lastHurt) : "goblins";
  UI.show(`
    <div class="title-wrap">
      <h2 class="head ${won ? "win" : "lose"}">${won ? "YOU ESCAPED THE DUNGEON" : "YOU DIED"}</h2>
      <p class="note">${won ? "The dungeon's heart stops. Gribbus croaks once, very proudly." : "Done in by " + esc(why) + " on floor " + G.floor + " (" + esc(G.D.theme.name) + ")."}</p>
      <div class="stats">
        <span><b>${G.floor}</b>floor</span><span><b>${s.kills}</b>kills</span><span><b>${s.items}</b>powerups</span><span><b>${s.reactions}</b>reactions</span><span><b>${s.rooms}</b>rooms</span>
        <span><b>${s.gold}</b>gold</span><span><b>${s.secrets}</b>secrets</span><span><b>${s.puzzles}</b>puzzles</span><span><b>${m}:${String(sec).padStart(2, "0")}</b>time</span>
      </div>
      <p class="hint">Best gun: <b>${esc(G.player.guns.slice().sort((a, b)=> DG.Loot.dps(b, G.mods) - DG.Loot.dps(a, G.mods))[0].name)}</b> · seed <b>${G.seedWord}</b></p>
      <div class="menu">
        ${won ? `<button class="item" data-act="endless">KEEP GOING <small>endless: deeper and nastier</small></button>` : ""}
        <button class="item" data-act="new">NEW RUN</button>
        <button class="item" data-act="again">SAME SEED <small>${G.seedWord}</small></button>
        <button class="item" data-act="title">TITLE</button>
      </div>
    </div>`, won ? "end win" : "end");
};

})();
