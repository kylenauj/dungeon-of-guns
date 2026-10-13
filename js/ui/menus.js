/* ------------------------------------------------------------------ *
 *  Everything that isn't the game: the title, pause, the bag (where
 *  runes get socketed), how to play, and the end of a run.
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
      <p class="tag-line">A wizard. Five kinds of gun. Far too many goblins.</p>
      <div class="menu">
        <button class="item" data-act="new">NEW RUN <small>a fresh dungeon</small></button>
        <div class="seed-row"><input id="seed" maxlength="12" placeholder="SEED (optional)" spellcheck="false" autocomplete="off"><button class="item small" data-act="seeded">PLAY SEED</button></div>
        <button class="item" data-act="how">HOW TO PLAY</button>
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
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
        <p>You're a wizard who casts spells <b>through guns</b>. Clear every goblin in a room and the doors open. Find the <b>boss</b>, beat him, take the portal down. Five floors; each one is meaner.</p>
        <p><b>Guns</b> have an <b>element</b> (arcane, fire, frost, poison, shock). Every shot carries it, and the right mouse button casts that element's <b>spell</b> for mana.</p>
        <p><b>Runes</b> socket into guns and change them. Plague Spreader makes poison jump between goblins. Ricochet bounces. Splitter splits. Mix them.</p>
        <p>Goblins get tougher every floor and your old gun won't keep up: <b>better loot is how you get stronger</b>. Chests, the shop, secret rooms, puzzle rewards.</p>
        <p><b>Not every door is a door.</b> Some are paintings. Some walls aren't walls: shoot or walk into suspicious stone.</p>
      </div>
      <div class="note keys">
        <p><kbd>WASD</kbd> move &nbsp; <kbd>mouse</kbd> aim</p>
        <p><kbd>LMB</kbd> shoot &nbsp; <kbd>RMB</kbd> cast the gun's spell</p>
        <p><kbd>SPACE</kbd> blink (dodge through shots and over pits)</p>
        <p><kbd>E</kbd> open, take, buy, read &nbsp; <kbd>R</kbd> reload</p>
        <p><kbd>Q</kbd> / <kbd>wheel</kbd> / <kbd>1-3</kbd> switch guns</p>
        <p><kbd>TAB</kbd> bag: move runes between guns</p>
        <p><kbd>ESC</kbd> pause &nbsp; <kbd>M</kbd> sound &nbsp; <kbd>P</kbd> pixels</p>
        <p class="hint">Gamepad: left stick move, right stick aim, RT shoot, LT spell, A blink, X use, Y swap, RB bag.</p>
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
        <button class="item" data-act="bag">BAG <small>runes and guns</small></button>
        <button class="item" data-act="howPause">HOW TO PLAY</button>
        <button class="item" data-act="pixel">PIXELS <small>${DG.Stage.pixel ? "chunky" : "crisp"}</small></button>
        <button class="item" data-act="mute">SOUND <small>${DG.Audio.muted ? "off" : "on"}</small></button>
        <button class="item" data-act="abandon">GIVE UP <small>end this run</small></button>
      </div>
    </div>`, "pause");
};

/* ---- the bag ---- */
UI.bag = function(G, sel){
  const p = G.player, L = DG.Loot;
  UI.bagSel = sel === undefined ? null : sel;
  const gunCard = (gun, gi)=>{
    const s = L.stats(gun, p.stats), R = DG.RARITY[gun.rarity], E = DG.ELEMENTS[gun.element], sp = DG.SPELLS[s.spell];
    const runes = [];
    for(let j=0;j<gun.slots;j++){
      const id = gun.runes[j];
      runes.push(id ? `<button class="rune on" data-act="unsock" data-g="${gi}" data-r="${j}" title="${esc(DG.RUNES[id].desc)}"><i>${DG.RUNES[id].icon}</i><span>${esc(DG.RUNES[id].name)}<small>${esc(DG.RUNES[id].desc)}</small></span></button>`
                    : `<button class="rune empty" data-act="sock" data-g="${gi}" ${UI.bagSel === null ? "disabled" : ""}><i>+</i><span>${UI.bagSel === null ? "empty slot" : "socket here"}</span></button>`);
    }
    return `<div class="gcard ${gi === p.cur ? "cur" : ""}" style="--el:${hex(E.color)};--ra:${R.color}">
      <div class="gname">${esc(gun.name)}</div>
      <div class="gsub">${R.name} · level ${gun.level} · ${E.name} · ${DG.GUNS[gun.base].name}</div>
      ${gun.flavour ? `<div class="gflav">${esc(gun.flavour)}</div>` : ""}
      <div class="gstats"><span>${Math.round(s.dmg*10)/10}${s.pellets > 1 ? "×" + s.pellets : ""}<small>damage</small></span><span>${Math.round(s.rate*10)/10}<small>per sec</small></span><span>${s.mag}<small>mag</small></span><span>${Math.round(L.dps(gun, p.stats))}<small>dps</small></span></div>
      <div class="gspell">RMB: <b>${sp.name}</b> (${s.spellCost} mana): ${sp.desc}</div>
      <div class="gel">${E.name}: ${E.hint}</div>
      <div class="runes">${runes.join("")}</div>
    </div>`;
  };
  const bag = p.bag.length ? p.bag.map((it, i)=> `<button class="rune ${UI.bagSel === i ? "picked" : ""}" data-act="pick" data-i="${i}"><i>${DG.RUNES[it.id].icon}</i><span>${esc(it.name)}<small>${esc(DG.RUNES[it.id].desc)}</small></span></button>`).join("")
                           : `<p class="hint">No loose runes. Runes you pick up go into the gun you're holding if it has a free slot, otherwise here.</p>`;
  const relics = p.relics.length ? p.relics.map(r=> `<div class="relic"><b>${esc(r.name)}</b> ${esc(DG.RELICS[r.id].desc)}</div>`).join("") : `<p class="hint">No relics yet.</p>`;
  UI.show(`
    <div class="panel scroll bagp">
      <h2 class="head">BAG</h2>
      <p class="hint">Click a loose rune, then an empty slot to socket it. Click a socketed rune to take it out. Nothing is ever destroyed.</p>
      <div class="guns">${p.guns.map(gunCard).join("")}</div>
      <h4>Loose runes</h4><div class="bagrunes">${bag}</div>
      <h4>Relics</h4><div class="relics">${relics}</div>
      <div class="row"><button class="item back" data-act="closeBag">CLOSE <small>TAB</small></button></div>
    </div>`, "bag");
};

UI.end = function(G, won){
  const s = G.stats, m = Math.floor(s.time/60), sec = Math.floor(s.time % 60);
  const killer = { orb:"Grubnok's royal spit", rock:"a rock", dart:"a dart trap", hex:"a shaman's hex", spikes:"spikes", vent:"a fire vent", boom:"a goblin bomb", pit:"a pit", brute:"a Brute's hug", king:"Grubnok's belly", grunt:"a Grunt's stab", sneak:"a Sneak" };
  const why = G.lastHurt ? (killer[G.lastHurt] || G.lastHurt) : "goblins";
  UI.show(`
    <div class="title-wrap">
      <h2 class="head ${won ? "win" : "lose"}">${won ? "YOU ESCAPED THE DUNGEON" : "YOU DIED"}</h2>
      <p class="note">${won ? "Grubnok is very cross about it. The goblins will be talking about you for weeks." : "Done in by " + esc(why) + " on floor " + G.floor + " (" + esc(G.D.theme.name) + ")."}</p>
      <div class="stats">
        <span><b>${G.floor}</b>floor</span><span><b>${s.kills}</b>goblins</span><span><b>${s.rooms}</b>rooms</span>
        <span><b>${s.gold}</b>gold</span><span><b>${s.secrets}</b>secrets</span><span><b>${s.puzzles}</b>puzzles</span><span><b>${m}:${String(sec).padStart(2, "0")}</b>time</span>
      </div>
      <p class="hint">Best gun: <b>${esc(G.player.guns.slice().sort((a, b)=> DG.Loot.dps(b) - DG.Loot.dps(a))[0].name)}</b> · seed <b>${G.seedWord}</b></p>
      <div class="menu">
        ${won ? `<button class="item" data-act="endless">KEEP GOING <small>endless: deeper and nastier</small></button>` : ""}
        <button class="item" data-act="new">NEW RUN</button>
        <button class="item" data-act="again">SAME SEED <small>${G.seedWord}</small></button>
        <button class="item" data-act="title">TITLE</button>
      </div>
    </div>`, won ? "end win" : "end");
};

})();
