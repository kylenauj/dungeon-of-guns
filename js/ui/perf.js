/* ------------------------------------------------------------------ *
 *  The hitch recorder. Off unless the page is opened with ?perf, or
 *  F8 is pressed (F8 again turns it off; it remembers). While on, it
 *  times every part of every frame, and when a frame runs long (a
 *  hitch) it writes down what that frame was doing: which functions
 *  took the time, what the game had just sent the view, and whether
 *  the GPU was handed new shaders, meshes or textures. A corner panel
 *  shows the frame rate and the last few hitches; F9 copies the whole
 *  report to the clipboard to paste back to whoever's fixing it.
 *  Costs a little time while on (every call is timed); nothing when off.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const KEY = "dungeonofguns.perf";
const store = (v)=>{ try{ if(v === undefined) return localStorage.getItem(KEY); if(v) localStorage.setItem(KEY, "1"); else localStorage.removeItem(KEY); }catch(e){ return null; } };
const on = /[?&]perf\b/.test(location.search) || store() === "1";
addEventListener("keydown", e=>{
  if(e.code !== "F8") return;
  e.preventDefault();
  store(on ? 0 : 1); location.reload();
});
if(!on) return;

const now = ()=> performance.now();
const P = DG.Perf = { frames:[], hitches:[], totals:{}, calls:{}, longtasks:[], t0:now() };

/* ---- timing every call: self time (time inside a function, less the time in what it called) ---- */
const stack = [];
let frameSelf = {}, frameEvents = {};
function wrap(obj, key, name){
  const fn = obj[key];
  if(typeof fn !== "function" || fn.__perf) return;
  const w = function(){
    const t = now(); stack.push(0);
    try { return fn.apply(this, arguments); }
    finally {
      const child = stack.pop(), dt = now() - t;
      frameSelf[name] = (frameSelf[name] || 0) + dt - child;
      if(stack.length) stack[stack.length - 1] += dt;
    }
  };
  Object.assign(w, fn); w.prototype = fn.prototype; w.__perf = true;
  obj[key] = w;
}
const lower = k=> /^[a-z]/.test(k);
function wrapModule(mod, label){
  if(!mod) return;
  Object.keys(mod).forEach(k=>{ if(lower(k) && typeof mod[k] === "function") wrap(mod, k, label + "." + k); });
}
function wrapProto(C, label){
  if(!C || !C.prototype) return;
  Object.getOwnPropertyNames(C.prototype).forEach(k=>{ if(k !== "constructor" && typeof C.prototype[k] === "function") wrap(C.prototype, k, label + "." + k); });
}
["Game", "View", "World", "Bot"].forEach(n=> wrapProto(DG[n], n));
["FX", "HUD", "Models", "KitModels", "Decor", "Kit", "AI", "Gribbus", "Puzzles", "Items", "Loot", "Dungeon", "Ending", "UI", "Icons", "Audio"].forEach(n=> wrapModule(DG[n], n));

// the view: which events each frame handled
if(DG.View){
  const h = DG.View.prototype.handle;
  DG.View.prototype.handle = function(ev){ if(ev && ev.type) frameEvents[ev.type] = (frameEvents[ev.type] || 0) + 1; return h.apply(this, arguments); };
}

/* ---- long tasks, as the browser sees them ---- */
try {
  new PerformanceObserver(list=> list.getEntries().forEach(e=>{ P.longtasks.push({ at:e.startTime, ms:e.duration }); if(P.longtasks.length > 200) P.longtasks.shift(); })).observe({ entryTypes:["longtask"] });
} catch(e){}

/* ---- the frame: wrap the stage's loop once it exists ---- */
const S = DG.Stage;
let last = 0, gpuInfo = "";
function hookStage(){
  if(!S.renderer || S.loop.__perf){ return; }
  const R = S.renderer;
  wrap(R, "render", "gpu.render");
  wrap(S, "renderPortrait", "Stage.renderPortrait");
  wrap(S, "updateCamera", "Stage.updateCamera");
  wrap(S, "resize", "Stage.resize");
  wrap(S, "adapt", "Stage.adapt");
  wrap(DG.Kit, "tick", "Kit.tick");
  try { const gl = R.getContext(), x = gl.getExtension("WEBGL_debug_renderer_info"); gpuInfo = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); } catch(e){}
  const loop = S.loop;
  S.updaters = S.updaters.map(f=>{ const o = { f }; wrap(o, "f", "main.frame"); return o.f; });
  const onFrame = S.onFrame;
  S.onFrame = f=>{ const o = { f }; wrap(o, "f", "main.frame"); return onFrame(o.f); };
  S.loop = function(){
    const t = now(), gap = last ? t - last : 16.7; last = t;
    // the gap since the last frame began is the last frame's work plus whatever the
    // browser did after it (drawing, the GPU, garbage collection): a long one is the last frame's fault
    if(prev) hitch(gap, prev);
    const info = R.info, before = { prog:(info.programs || []).length, geo:info.memory.geometries, tex:info.memory.textures };
    frameSelf = {}; frameEvents = {};
    loop.apply(this, arguments);
    const js = now() - t;
    prev = { at:t - P.t0, js, self:frameSelf, events:frameEvents, calls:info.render.calls, tris:info.render.triangles,
      prog:(info.programs || []).length - before.prog, geo:info.memory.geometries - before.geo, tex:info.memory.textures - before.tex };
    P.frames.push({ gap, js }); if(P.frames.length > 1200) P.frames.shift(); P.count = (P.count || 0) + 1;
    for(const k in frameSelf) P.totals[k] = (P.totals[k] || 0) + frameSelf[k];
  };
  S.loop.__perf = true;
}
let prev = null;
function hitch(gap, f){
  if(!(gap > Math.max(40, median()*2.4) && P.count > 10)) return;
  const top = Object.keys(f.self).map(k=> [k, f.self[k]]).sort((a, b)=> b[1] - a[1]).slice(0, 6).filter(x=> x[1] > 0.5);
  const lt = P.longtasks.filter(l=> l.at > performance.now() - gap - 200);
  const G = DG.app && DG.app.G;
  P.hitches.push({ at:f.at, gap, js:f.js, top, events:Object.assign({}, f.events), prog:f.prog, geo:f.geo, tex:f.tex, calls:f.calls, tris:f.tris,
    longtask:lt.length ? Math.round(Math.max(...lt.map(l=> l.ms))) : 0,
    where:G ? { floor:G.floor, room:G.room ? G.room.type + (G.room.active ? " (fighting)" : "") : "corridor", enemies:(G.enemies || []).filter(e=> !e.dead).length,
      shots:(G.shots || []).length, hazards:(G.hazards || []).length, mode:DG.app.mode } : null, dyn:S.dyn });
  if(P.hitches.length > 60) P.hitches.shift();
}
function median(){
  const a = P.frames.slice(-120).map(f=> f.gap).sort((x, y)=> x - y);
  return a.length ? a[a.length >> 1] : 16.7;
}
const pct = (a, q)=> a.length ? a[Math.min(a.length - 1, Math.floor(a.length*q))] : 0;
const r1 = v=> Math.round(v*10)/10;

/* ---- the panel ---- */
let panel = null, note = "";
function draw(){
  hookStage();
  if(!panel){
    panel = document.createElement("div");
    panel.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99;font:11px/1.35 ui-monospace,Menlo,Consolas,monospace;color:#e8dcc0;background:rgba(10,8,8,.82);border:1px solid #6a5a40;padding:6px 8px;pointer-events:none;white-space:pre;max-width:60vw";
    document.body.appendChild(panel);
  }
  const fr = P.frames.slice(-120), gaps = fr.map(f=> f.gap).sort((a, b)=> a - b);
  const fps = fr.length ? 1000/(fr.reduce((a, f)=> a + f.gap, 0)/fr.length) : 0;
  const lines = ["PERF  " + Math.round(fps) + " fps  median " + r1(pct(gaps, 0.5)) + " ms  worst(2s) " + r1(gaps[gaps.length - 1] || 0) + " ms  hitches " + P.hitches.length + "   F9 copy report · F8 off"];
  P.hitches.slice(-5).reverse().forEach(h=>{
    const ev = Object.keys(h.events).map(k=> k + (h.events[k] > 1 ? "×" + h.events[k] : "")).slice(0, 4).join(" ");
    lines.push(r1(h.at/1000) + "s  " + Math.round(h.gap) + "ms  js " + Math.round(h.js) + "  " + h.top.slice(0, 2).map(x=> x[0] + " " + Math.round(x[1])).join(", ")
      + (h.prog ? "  +" + h.prog + " shader" : "") + (h.geo > 0 ? "  +" + h.geo + " mesh" : "") + (h.tex > 0 ? "  +" + h.tex + " tex" : "") + (ev ? "  [" + ev + "]" : ""));
  });
  if(note) lines.push(note);
  panel.textContent = lines.join("\n");
}
setInterval(draw, 250);

/* ---- the report ---- */
P.report = function(){
  const fr = P.frames, gaps = fr.map(f=> f.gap).sort((a, b)=> a - b), secs = (now() - P.t0)/1000;
  const out = [];
  out.push("Zippy & Gribbus hitch report");
  out.push("browser: " + navigator.userAgent);
  out.push("gpu: " + gpuInfo + "   screen " + innerWidth + "x" + innerHeight + " @" + devicePixelRatio + "   drawn at " + Math.round((S.dyn || 1)*100) + "%");
  out.push("recorded " + Math.round(secs) + " s; last " + fr.length + " frames: median " + r1(pct(gaps, 0.5)) + " ms, p95 " + r1(pct(gaps, 0.95)) + ", p99 " + r1(pct(gaps, 0.99)) + ", max " + r1(gaps[gaps.length - 1] || 0));
  out.push("");
  out.push("where the time goes (self ms per frame, averaged over every frame recorded):");
  const n = Math.max(1, P.count || 0);
  Object.keys(P.totals).map(k=> [k, P.totals[k]/n]).sort((a, b)=> b[1] - a[1]).slice(0, 20).forEach(([k, v])=> out.push("  " + k.padEnd(34) + v.toFixed(2)));
  out.push("");
  out.push("hitches (" + P.hitches.length + "):");
  P.hitches.forEach(h=>{
    out.push("- at " + r1(h.at/1000) + " s: a " + Math.round(h.gap) + " ms frame: " + Math.round(h.js) + " ms in the game's own code, " + Math.max(0, Math.round(h.gap - h.js)) + " ms outside it (browser, GPU, garbage collection)"
      + (h.longtask ? "; browser long task " + h.longtask + " ms" : ""));
    if(h.top.length) out.push("    slowest: " + h.top.map(x=> x[0] + " " + r1(x[1])).join(", "));
    const ev = Object.keys(h.events); if(ev.length) out.push("    events: " + ev.map(k=> k + "×" + h.events[k]).join(" "));
    if(h.prog || h.geo || h.tex) out.push("    new on the GPU: " + [h.prog ? h.prog + " shader programs" : "", h.geo ? h.geo + " meshes" : "", h.tex ? h.tex + " textures" : ""].filter(Boolean).join(", "));
    out.push("    draw calls " + h.calls + ", triangles " + h.tris + (h.where ? ", floor " + h.where.floor + ", " + h.where.room + ", " + h.where.enemies + " enemies, " + h.where.shots + " shots, " + h.where.hazards + " hazards, mode " + h.where.mode : ""));
  });
  return out.join("\n");
};
addEventListener("keydown", e=>{
  if(e.code !== "F9") return;
  e.preventDefault();
  const txt = P.report();
  const done = ok=>{ note = ok ? "report copied: paste it anywhere" : "copy blocked: report printed to the console (F12)"; setTimeout(()=> note = "", 4000); };
  console.log(txt);
  try { navigator.clipboard.writeText(txt).then(()=> done(true), ()=> done(fallback(txt))); } catch(err){ done(fallback(txt)); }
});
function fallback(txt){
  try { const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch(e){ return false; }
}
})();
