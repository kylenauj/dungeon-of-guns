/* ------------------------------------------------------------------ *
 *  The app: boots the stage, runs the game at a fixed 60 steps a
 *  second, and walks the player between the title, a run, the pause
 *  menu, the bag and the end screen.
 *
 *  Behind the title, a bot plays a real run with the sound off (the
 *  attract mode from every arcade cabinet you ever walked past).
 *
 *  URL shortcuts for testing: ?seed=WORD  ?floor=3  ?god  ?play
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, S = DG.Stage, UI = DG.UI, HUD = DG.HUD, IN = DG.Input, AU = DG.Audio;
const STEP = 1/60;
const Q = new URLSearchParams(location.search);

const app = DG.app = { G:null, V:null, mode:"boot", acc:0, demo:null };

function newWord(){ return DG.seedWord((Math.random()*4294967296) >>> 0 ^ Date.now()); }

/* ---- the attract mode ---- */
app.startDemo = function(){
  app.stopRun();
  const G = new DG.Game({ seedWord:newWord(), floor:1 + Math.floor(Math.random()*3) });
  G.player.hp = G.player.maxHp = 99999;
  app.G = G; app.V = new DG.View(G); app.V.silent = true;
  app.demo = new DG.Bot(G, { dodge:0.9 });
  app.mode = "title";
  AU.setMode("menu");
  UI.title();
};

app.newRun = function(word){
  app.stopRun();
  const G = new DG.Game({ seedWord:word || newWord(), floor:+Q.get("floor") || 1 });
  if(Q.has("god")){ G.player.hp = G.player.maxHp = 9999; }
  app.G = G; app.V = new DG.View(G); app.demo = null;
  app.mode = "play"; app.acc = 0;
  HUD.reset(); UI.hide(); IN.clear();
  HUD.handle({ type:"floor", floor:G.floor, name:G.D.theme.name }, G);
  document.body.classList.add("playing");
};
app.stopRun = function(){
  if(app.V){ app.V.dispose(); app.V = null; }
  app.G = null; app.demo = null;
  document.body.classList.remove("playing");
};

app.pause = function(){ if(app.mode !== "play") return; app.mode = "pause"; UI.pause(app.G); IN.clear(); document.body.classList.remove("playing"); };
app.resume = function(){ app.mode = "play"; UI.hide(); IN.clear(); document.body.classList.add("playing"); };
app.openBag = function(){ if(app.mode !== "play" && app.mode !== "pause") return; app.mode = "bag"; UI.bag(app.G); IN.clear(); document.body.classList.remove("playing"); };
app.end = function(won){
  app.mode = "end";
  UI.record(app.G);
  setTimeout(()=>{ if(app.mode === "end"){ UI.end(app.G, won); document.body.classList.remove("playing"); } }, won ? 400 : 1600);
};

UI.on({
  new: ()=> app.newRun(),
  seeded: ()=>{ const v = (document.getElementById("seed") || {}).value; app.newRun(v ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || undefined : undefined); },
  again: ()=> app.newRun(app.G.seedWord),
  title: ()=> app.startDemo(),
  how: ()=> UI.how("backTitle"),
  backTitle: ()=> UI.title(),
  howPause: ()=> UI.how("backPause"),
  backPause: ()=> UI.pause(app.G),
  resume: ()=> app.resume(),
  bag: ()=> app.openBag(),
  closeBag: ()=> app.resume(),
  abandon: ()=>{ app.G.state = "dead"; app.G.lastHurt = "giving up"; app.end(false); },
  endless: ()=>{ app.G.keepGoing(); app.mode = "play"; UI.hide(); document.body.classList.add("playing"); },
  pixel: b=>{ const on = S.togglePixel(); if(b) b.querySelector("small").textContent = on ? "chunky" : "crisp"; },
  mute: b=>{ const m = AU.toggleMute(); if(b) b.querySelector("small").textContent = m ? "off" : "on"; },
  pick: b=>{ const i = +b.dataset.i; UI.bag(app.G, UI.bagSel === i ? null : i); },
  sock: b=>{ if(UI.bagSel !== null && app.G.socket(UI.bagSel, +b.dataset.g)) UI.bag(app.G); },
  unsock: b=>{ app.G.unsocket(+b.dataset.g, +b.dataset.r); UI.bag(app.G); }
});

/* ---- keys that aren't game controls ---- */
IN.onKey = function(e){
  AU.start();
  if(e.code === "KeyM" && !(e.target && e.target.tagName === "INPUT")){ AU.toggleMute(); HUD.toast(AU.muted ? "Sound off" : "Sound on", 1.2); return; }
  if(e.code === "KeyP" && !(e.target && e.target.tagName === "INPUT")){ S.togglePixel(); return; }
  if(e.code === "Escape"){
    if(app.mode === "play") app.pause();
    else if(app.mode === "pause" || app.mode === "bag") app.resume();
    return;
  }
  if(e.code === "Tab"){
    if(app.mode === "play") app.openBag();
    else if(app.mode === "bag") app.resume();
    return;
  }
  if(e.code === "Enter" && e.target && e.target.id === "seed"){ UI.act("seeded"); return; }
  if(app.mode !== "play") UI.key(e);
};
IN.onPadStart = ()=>{ if(app.mode === "play") app.pause(); else if(app.mode === "pause" || app.mode === "bag") app.resume(); };
IN.onPadBag = ()=>{ if(app.mode === "play") app.openBag(); else if(app.mode === "bag") app.resume(); };

/* ---- the frame ---- */
function frame(dt, t){
  const G = app.G, V = app.V;
  if(!G || !V) return;
  if(app.mode === "play" || app.mode === "title" || app.mode === "end"){
    app.acc = Math.min(app.acc + dt, STEP*5);
    let first = true;
    const live = app.mode === "play";
    const input = live ? IN.sample(G) : app.demo ? null : {};
    while(app.acc >= STEP){
      app.acc -= STEP;
      let I;
      if(app.demo) I = app.demo.input(STEP);
      else if(live){ I = first ? input : Object.assign({}, input, { blink:false, use:false, swap:false, reload:false, slot:-1 }); first = false; }
      else I = {};
      G.update(STEP, I);
      G.drain().forEach(ev=>{
        if(V.silent){ const a = AU.muted; AU.muted = true; V.handle(ev); AU.muted = a; }
        else { V.handle(ev); HUD.handle(ev, G); }
      });
      if(app.demo && (G.state !== "play" || G.t > 150)){ app.startDemoSoon(); break; }
    }
    if(live && G.state === "dead") app.end(false);
    if(live && G.state === "won") app.end(true);
  }
  // music follows the fight
  if(app.mode === "play"){
    const boss = G.bossRef && !G.bossRef.dead;
    AU.setMode(boss ? "boss" : G.room && G.room.active ? "fight" : "explore");
  }
  V.update(dt, t);
  const p = G.player, m = IN.mouse, aim = app.mode === "play" ? S.unproject(m.x, m.y, 0) : null;
  S.follow(p.x, p.y, aim ? aim.x : p.x, aim ? aim.z : p.y);
  HUD.draw(G, dt, { hidden:app.mode === "title" || app.mode === "bag" || app.mode === "pause" || !!app.demo, noCursor:app.mode !== "play" });
}
app.startDemoSoon = function(){
  if(app.mode !== "title") return;
  const keep = document.getElementById("screens").innerHTML;
  app.V.dispose();
  const G = new DG.Game({ seedWord:newWord(), floor:1 + Math.floor(Math.random()*3) });
  G.player.hp = G.player.maxHp = 99999;
  app.G = G; app.V = new DG.View(G); app.V.silent = true; app.demo = new DG.Bot(G, { dodge:0.9 });
  if(!keep) UI.title();
};

/* ---- boot ---- */
function boot(){
  S.init(); DG.FX.init(S.scene); HUD.init(); IN.init();
  addEventListener("pointerdown", ()=> AU.start());
  S.onFrame(frame);
  document.getElementById("loading").remove();
  if(Q.has("play") || Q.has("seed")) app.newRun(Q.get("seed") || undefined);
  else app.startDemo();
}
if(document.readyState === "loading") addEventListener("DOMContentLoaded", boot); else boot();

})();
