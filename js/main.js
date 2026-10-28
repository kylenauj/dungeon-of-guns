/* ------------------------------------------------------------------ *
 *  The app: boots the stage, runs the game at a fixed 60 steps a
 *  second, and walks the player between the title, a run, the pause
 *  menu, the satchel, level-up boons and the end screen.
 *
 *  Behind the title, a bot plays a real run with the sound off (the
 *  attract mode from every arcade cabinet you ever walked past).
 *
 *  URL shortcuts for testing: ?seed=WORD  ?floor=3  ?god  ?play  ?gallery  ?boss=KEY  ?lair=ID  ?route=bog|olm|ember|none  ?mood=ember (a floor mood, DG.FLOOR_MOODS)  ?psx (the PSX look; P toggles it)
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, S = DG.Stage, UI = DG.UI, HUD = DG.HUD, IN = DG.Input, AU = DG.Audio;
const STEP = 1/60;
const Q = new URLSearchParams(location.search);

const app = DG.app = { G:null, V:null, mode:"boot", acc:0, demo:null };

/* what outlives a run: the endings and road steps found, what you carried lately, Olm's memory of you */
const META_KEY = "dungeonofguns.meta";
function loadMeta(){ try{ const m = JSON.parse(localStorage.getItem(META_KEY) || "{}"); return { unlocked:m.unlocked || {}, recent:m.recent || [], recentRuns:m.recentRuns || [], endings:m.endings || {}, olm:m.olm || 0 }; }catch(e){ return { unlocked:{}, recent:[], recentRuns:[], endings:{} }; } }
function saveMeta(m){ try{ localStorage.setItem(META_KEY, JSON.stringify(m)); }catch(e){} }

function newWord(){ return DG.seedWord((Math.random()*4294967296) >>> 0 ^ Date.now()); }

/* ---- the attract mode ---- */
app.startDemo = function(){
  app.stopRun();
  const G = new DG.Game({ seedWord:newWord(), floor:1 + Math.floor(Math.random()*3) });
  G.god = true; S.fpsWorld = false;
  app.G = G; app.V = new DG.View(G); app.V.silent = true;
  app.demo = new DG.Bot(G, { dodge:0.9 });
  app.mode = "title";
  AU.setMode("menu");
  UI.title();
};

/* ---- the veil: a loading screen over the world while a floor is built ----
   Building a floor (its stone, the filth, every shader, every enemy ahead) takes a
   second or two. It used to happen in the middle of a frame, the last picture
   frozen on screen; now the veil goes up first (it paints), the floor is built
   behind it, a couple of frames are drawn under it (so the first sight of
   everything costs nothing later), then it fades. The game holds still meanwhile. */
const Veil = app.veil = {
  el:null,
  show(title, sub){
    if(!Veil.el){ Veil.el = document.createElement("div"); Veil.el.className = "veil"; document.body.appendChild(Veil.el); }
    Veil.el.innerHTML = "<b></b><i></i><small></small>";
    Veil.el.querySelector("b").textContent = title || "";
    Veil.el.querySelector("small").textContent = sub || "the dark takes shape…";
    Veil.el.classList.remove("gone"); Veil.el.style.display = "flex";
  },
  hide(){ if(!Veil.el) return; Veil.el.classList.add("gone"); setTimeout(()=>{ if(Veil.el.classList.contains("gone")) Veil.el.style.display = "none"; }, 500); }
};
/* run fn once the veil has painted (two frames on), then keep it up `hold` frames more */
const behindVeil = (fn, hold)=>{ requestAnimationFrame(()=> requestAnimationFrame(()=>{ fn(); let n = hold || 2; const tick = ()=>{ if(--n <= 0) Veil.hide(); else requestAnimationFrame(tick); }; requestAnimationFrame(tick); })); };

app.newRun = function(word){
  Veil.show("ZIPPY & GRIBBUS", "the dark takes shape…");
  app.mode = "loading";
  behindVeil(()=> app.newRunNow(word), 3);
};
app.newRunNow = function(word){
  app.stopRun();
  // ?route=bog|olm|ember|none forces the run's side road (for testing)
  const route = Q.has("route") ? (Q.get("route") === "none" ? null : Q.get("route")) : undefined;
  const G = new DG.Game({ seedWord:word || newWord(), floor:+Q.get("floor") || 1, meta:loadMeta(), route });
  if(Q.has("god")) G.god = true;
  // testing: ?boss=gibbet puts that boss on this floor; ?lair=hound puts that beast in the floor's lair
  if(DG.BOSSES[Q.get("boss")]) G.D.theme = Object.assign({}, G.D.theme, { boss:Q.get("boss") });
  // ?mood=ember puts that light on this floor (any id in DG.FLOOR_MOODS for the floor)
  const moods = DG.FLOOR_MOODS[(G.floor - 1) % DG.FLOOR_MOODS.length], mood = !G.side && moods && moods.find(m=> m.id === Q.get("mood"));
  if(mood && !G.D.climb) G.D.theme = DG.Dungeon.withMood(Object.assign({}, DG.FLOORS[(G.floor - 1) % DG.FLOORS.length], { boss:G.D.theme.boss }), mood);
  if(DG.LAIRS[Q.get("lair")]) G.D.rooms.forEach(r=>{ if(r.type === "lair") r.lair = Q.get("lair"); });
  S.fpsWorld = S.fps; S.look.yaw = -Math.PI/2; S.look.pitch = -0.08;
  app.G = G; app.V = new DG.View(G); app.demo = null;
  app.mode = "play"; app.acc = 0; app.pend = {};
  HUD.reset(); UI.hide(); IN.clear();
  HUD.handle({ type:"floor", floor:G.floor, name:G.D.theme.name, mood:G.D.theme.moodName || "" }, G);
  document.body.classList.add("playing");
};
/* what a run carried turns up less in the next two (Items.remember) */
function rememberRun(G){
  if(!G || app.demo || G.remembered || !Object.keys(G.player.items).length) return;
  G.remembered = true; DG.Items.remember(G); saveMeta(G.meta);
}
app.stopRun = function(){
  rememberRun(app.G);
  if(app.V){ app.V.dispose(); app.V = null; }
  app.G = null; app.demo = null;
  document.body.classList.remove("playing");
};

app.pause = function(){ if(app.mode !== "play") return; app.mode = "pause"; UI.pause(app.G); IN.clear(); IN.unlock(); document.body.classList.remove("playing"); };
app.resume = function(){ app.mode = "play"; app.pend = {}; UI.hide(); IN.clear(); document.body.classList.add("playing"); if(fpsOn()) IN.lock(); };
/* first person: only on a floor built for it (full walls and a ceiling), only in play, never in a cutscene */
function fpsOn(){ const V = app.V; return !!(S.fps && V && V.world && V.world.fps && !V.cine && !app.demo && app.mode !== "title" && app.mode !== "end" && app.mode !== "cine"); }
IN.lockable = ()=> app.mode === "play";
// losing the mouse (Esc, alt-tab) pauses, as Esc does in the top-down view
document.addEventListener("pointerlockchange", ()=>{ if(!document.pointerLockElement && app.mode === "play" && S.fpsLive) app.pause(); });
app.openBag = function(){ if(app.mode !== "play" && app.mode !== "pause") return; app.mode = "bag"; UI.bag(app.G); IN.clear(); IN.unlock(); document.body.classList.remove("playing"); };
app.choose = function(){ app.mode = "choose"; UI.choose(app.G); IN.clear(); IN.unlock(); document.body.classList.remove("playing"); };
app.pick = function(i){ if(app.mode !== "choose") return; app.G.choose(i); app.resume(); };
app.end = function(won){
  app.mode = "end"; IN.unlock();
  rememberRun(app.G);
  saveMeta(app.G.meta);
  UI.record(app.G);
  // a win: the ending plays out (js/render/ending.js), then its lore, then the tally
  if(won && DG.Ending && app.V && !app.demo){
    const G = app.G, id = G.ending || "dawn";
    app.mode = "cine";
    document.body.classList.remove("playing"); document.body.classList.add("cinema");
    app.V.cine = DG.Ending.play(G, app.V, id, ()=>{
      document.body.classList.remove("cinema");
      if(app.G !== G) return;
      app.mode = "end";
      UI.lore(G, id);
    });
    return;
  }
  setTimeout(()=>{ if(app.mode === "end"){ UI.end(app.G, won); document.body.classList.remove("playing"); } }, won ? 400 : 1600);
};

UI.on({
  new: ()=> app.newRun(),

  title: ()=> app.startDemo(),
  backTitle: ()=> UI.title(),
  backPause: ()=> UI.pause(app.G),
  resume: ()=> app.resume(),
  bag: ()=> app.openBag(),
  closeBag: ()=> app.resume(),
  abandon: ()=>{ app.G.state = "dead"; app.G.lastHurt = "giving up"; app.end(false); },
  lore: ()=>{ if(app.mode === "end") UI.end(app.G, true); },
  endless: ()=>{ if(app.V && app.V.cine){ app.V.cine.dispose(); app.V.cine = null; } app.G.keepGoing(); app.mode = "play"; UI.hide(); document.body.classList.add("playing"); },
  boon: b=> app.pick(+b.dataset.i),
  // VIEW: top-down or first person (an experiment); a floor is built for one or the other
  view: b=>{
    const on = S.setFps(!S.fps), run = app.G && !app.demo && app.mode !== "title";
    if(b){ const v = b.querySelector(".val"); if(v) v.textContent = on ? "FIRST PERSON" : "TOP-DOWN"; }
    if(run) HUD.toast(on ? "First person from the next floor" : "Top-down from the next floor", 2.2);
  }
});

/* ---- keys that aren't game controls ---- */
IN.onKey = function(e){
  AU.start();
  if(app.mode === "cine"){ if(app.V && app.V.cine) app.V.cine.skip(); return; }
  if(e.code === "KeyP" && !(e.target && e.target.tagName === "INPUT")){ const on = S.setPsx(!S.psx); HUD.toast(on ? "PSX look on" : "PSX look off", 1.2); return; }
  if(e.code === "KeyM" && !(e.target && e.target.tagName === "INPUT")){ AU.toggleMute(); HUD.toast(AU.muted ? "Sound off" : "Sound on", 1.2); return; }
  if(e.code === "Escape"){
    if(app.mode === "play") app.pause();
    else if(app.mode === "choose" && app.G.choice && app.G.choice.leave !== undefined) app.pick(app.G.choice.leave);   // Esc walks away from Brother Olm
    else if(app.mode === "pause" || app.mode === "bag") app.resume();
    return;
  }
  if(e.code === "Tab"){
    if(app.mode === "play") app.openBag();
    else if(app.mode === "bag") app.resume();
    return;
  }
  if(app.mode === "choose"){ const i = { Digit1:0, Digit2:1, Digit3:2, Numpad1:0, Numpad2:1, Numpad3:2 }[e.code]; if(i !== undefined){ app.pick(i); return; } }
  if(app.mode !== "play") UI.key(e);
};
IN.onPadStart = ()=>{ if(app.mode === "play") app.pause(); else if(app.mode === "pause" || app.mode === "bag") app.resume(); };
IN.onPadBag = ()=>{ if(app.mode === "play") app.openBag(); else if(app.mode === "bag") app.resume(); };

/* ---- the frame ---- */
/* the pace of play: the whole fight runs a touch slower than real time
   (everything together, so nothing gets easier or harder, just calmer) */
const PACE = 0.88;
const ONE_SHOTS = ["blink", "use", "active", "swap", "reload", "warp"], NO_SHOTS = { blink:false, use:false, active:false, swap:false, reload:false, warp:false, slot:-1 };
function frame(dt, t){
  const G = app.G, V = app.V;
  if(!G || !V) return;
  // going down: the veil is up, the game holds still; the floor is built once it has
  // painted, and the events that came with the descent are handled after it
  if(app.descend){
    const d = app.descend; d.n++;
    // (a new floor is built for the view chosen now: VIEW in the menus says "from the next floor")
    if(d.n === 3 && !app.demo) S.fpsWorld = S.fps;
    if(d.n === 3){ [d.ev].concat(d.rest).forEach(ev=>{ V.handle(ev); HUD.handle(ev, G); }); }
    if(d.n > 3){ V.update(dt, t); S.follow(G.player.x, G.player.y, G.player.x, G.player.y, true); }
    if(d.n === 6){ Veil.hide(); app.descend = null; app.acc = 0; }
    return;
  }
  if(app.mode === "play" || app.mode === "title" || app.mode === "end" || app.mode === "cine"){
    app.acc = Math.min(app.acc + dt, STEP*5);
    let first = true;
    const live = app.mode === "play";
    const input = live ? IN.sample(G) : app.demo ? null : {};
    // one-shot presses wait for the next game step: on a fast screen (120 Hz+)
    // most frames run no step at all, and a press there used to be dropped
    if(live){
      const P = app.pend = app.pend || {};
      ONE_SHOTS.forEach(k=>{ if(input[k]) P[k] = true; });
      if(input.slot >= 0) P.slot = input.slot;
    }
    while(app.acc >= STEP){
      app.acc -= STEP;
      let I;
      if(app.demo) I = app.demo.input(STEP);
      else if(live){ I = Object.assign({}, input, NO_SHOTS, first ? app.pend : {}); if(first) app.pend = {}; first = false; }
      else I = {};
      V.snap();
      G.update(STEP*PACE, I);
      if(app.demo && G.state === "choose") G.choose(Math.floor(Math.random()*3));
      G.drain().forEach(ev=>{
        // a new floor: everything from here waits behind the veil (frame, above)
        if(!V.silent && ev.type === "floor" && V.builtD !== G.D && !app.descend){ app.descend = { ev, rest:[], n:0 }; Veil.show(ev.name || "", "down into the dark…"); return; }
        if(app.descend){ app.descend.rest.push(ev); return; }
        if(V.silent){ const a = AU.muted; AU.muted = true; V.handle(ev); AU.muted = a; }
        else { V.handle(ev); HUD.handle(ev, G); }
      });
      if(app.descend) break;
      if(app.demo && ((G.state !== "play" && G.state !== "choose") || G.t > 150)){ app.startDemoSoon(); break; }
      if(live && G.state !== "play") break;
    }
    // how far into the next step this frame is: things are drawn that far along (Stage.snap)
    S.alpha = Math.min(1, app.acc/STEP);
    if(live && G.state === "choose") app.choose();
    if(live && G.state === "dead") app.end(false);
    if(live && G.state === "won") app.end(true);
  }
  // music follows the fight
  if(app.mode === "play"){
    const boss = G.bossRef && !G.bossRef.dead;
    AU.setMode(boss ? "boss" : G.room && G.room.active ? "fight" : "explore");
  }
  V.update(dt, t);
  const p = G.player, m = IN.mouse, aim = app.mode === "play" && !S.fpsLive ? S.unproject(m.x, m.y, 0) : null;
  const px = S.ix(p), py = S.iy(p);
  S.fpsLive = fpsOn(); S.look.speed = Math.hypot(p.vx || 0, p.vy || 0);
  if(S.fpsLive) S.follow(px, py, px, py, true);
  else if(!V.cine) S.follow(px, py, aim ? aim.x : px, aim ? aim.z : py);
  // the camera eases back in a fight (more for a big arena or a boss), and in close to explore
  const rm = G.room, big = rm && (rm.x2 - rm.x1 > 16 || rm.y2 - rm.y1 > 12);
  S.rig.zoomWant = V.cine || !(rm && rm.active) ? 1 : G.bossRef && !G.bossRef.dead ? 1.22 : big ? 1.15 : 1.08;
  HUD.draw(G, dt, { hidden:app.mode === "title" || app.mode === "cine" || !!V.cine || app.mode === "bag" || app.mode === "pause" || app.mode === "choose" || !!app.demo, noCursor:app.mode !== "play" });
}
app.startDemoSoon = function(){
  if(app.mode !== "title") return;
  const keep = document.getElementById("screens").innerHTML;
  app.V.dispose();
  const G = new DG.Game({ seedWord:newWord(), floor:1 + Math.floor(Math.random()*3) });
  G.god = true; S.fpsWorld = false;
  app.G = G; app.V = new DG.View(G); app.V.silent = true; app.demo = new DG.Bot(G, { dodge:0.9 });
  if(!keep) UI.title();
};

/* ---- boot ---- */
function boot(){
  S.init(); DG.FX.init(S.scene); HUD.init(); IN.init();
  addEventListener("pointerdown", ()=>{ AU.start(); if(app.mode === "cine" && app.V && app.V.cine) app.V.cine.skip(); });
  document.getElementById("loading").remove();
  if(Q.has("gallery")){ DG.Gallery.start(); return; }
  S.onFrame(frame);
  if(Q.has("play") || Q.has("seed")) app.newRun(Q.get("seed") || undefined);
  else app.startDemo();
}
if(document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();

})();
