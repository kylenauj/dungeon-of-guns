/* ------------------------------------------------------------------ *
 *  Audio, all synthesised (as in Pine Hollow and Gloom Shooter): no
 *  files, only oscillators, noise and one long stone-hall reverb.
 *
 *  A.play(name, opts) never throws: an unknown name is a no-op. Each
 *  call gets its own little output (a dry gain, a reverb send, and a
 *  panner when it has an { x, y }), a pitch jitter so repeats differ,
 *  a per-name rate limit and a per-name voice cap so a busy fight
 *  stays clear.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const A = DG.Audio = { ctx:null, muted:false, mode:"menu", step:0, next:0 };
const NO = {};
const rnd = (a, b)=> a + Math.random()*(b - a);
const pick = a=> a[Math.floor(Math.random()*a.length)];
const clamp = (v, a, b)=> v < a ? a : v > b ? b : v;
const mtof = m=> 440*Math.pow(2, (m - 69)/12);
const LIVE_MAX = 260;            // started-but-not-ended sources, across everything

/* ---- the graph ---- */
A.start = function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(A.ctx){ if(A.ctx.state === "suspended") A.ctx.resume(); return; }
  if(!AC) return;
  try{ A.muted = localStorage.getItem("dungeonofguns.muted") === "1"; }catch(e){}
  let c; try{ c = new AC(); }catch(e){ return; }
  A.init(c);
  A.timer = setInterval(A.tick, 50);
};
/* builds everything on a context; tests hand it an OfflineAudioContext */
A.init = function(c, offline){
  A.ctx = c; A.offline = !!offline; LIVE.clear();
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.25;
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  comp.connect(lim); lim.connect(c.destination);
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.8; A.master.connect(comp);
  A.sfx = c.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
  A.musicLP = c.createBiquadFilter(); A.musicLP.type = "lowpass"; A.musicLP.frequency.value = 3600; A.musicLP.connect(A.master);
  A.music = c.createGain(); A.music.gain.value = 0.45; A.music.connect(A.musicLP);
  makeBuffers(c);
  // the hall: a long dark tail behind everything, high-passed so it never muddies
  A.verbIn = c.createGain(); A.verbIn.gain.value = 1;
  const conv = c.createConvolver(); conv.buffer = makeIR(c, 3.2);
  const vhp = c.createBiquadFilter(); vhp.type = "highpass"; vhp.frequency.value = 80;
  const vout = c.createGain(); vout.gain.value = 0.5;
  A.verbIn.connect(conv); conv.connect(vhp); vhp.connect(vout); vout.connect(A.master);
  A.verb = A.verbIn;
  // a dark slapback off the far wall, for the big things
  A.echoIn = c.createGain(); A.echoIn.gain.value = 1;
  const dl = c.createDelay(1), elp = c.createBiquadFilter(), fb = c.createGain(), eout = c.createGain();
  dl.delayTime.value = 0.29; elp.type = "lowpass"; elp.frequency.value = 1500; fb.gain.value = 0.32; eout.gain.value = 0.35;
  A.echoIn.connect(dl); dl.connect(elp); elp.connect(fb); fb.connect(dl); elp.connect(eout); eout.connect(A.master); eout.connect(A.verbIn);
  A.next = c.currentTime + 0.1; A.step = 0;
  if(A.buildMusic) A.buildMusic();
};
A.toggleMute = function(){
  A.muted = !A.muted;
  try{ localStorage.setItem("dungeonofguns.muted", A.muted ? "1" : "0"); }catch(e){}
  if(A.master) A.master.gain.setTargetAtTime(A.muted ? 0 : 0.8, A.ctx.currentTime, 0.05);
  return A.muted;
};

/* white, brown (deep rumble) and crackle (sparse pops: grit, fire, rubble) */
const BUF = {};
function makeBuffers(c){
  const sr = c.sampleRate, n = Math.floor(sr*2);
  const w = c.createBuffer(1, n, sr), b = c.createBuffer(1, n, sr), k = c.createBuffer(1, n, sr);
  const W = w.getChannelData(0), B = b.getChannelData(0), K = k.getChannelData(0);
  let y = 0;
  for(let i=0;i<n;i++){ W[i] = Math.random()*2 - 1; y = (y + 0.02*W[i])/1.02; B[i] = y*3.5; }
  for(let i=0;i<n;){
    const a = (Math.random() < 0.5 ? -1 : 1)*Math.pow(Math.random(), 1.5), len = 20 + Math.floor(Math.random()*60);
    for(let j=0;j<len && i + j < n;j++) K[i + j] += a*Math.exp(-j/(len*0.25))*(Math.random()*2 - 1);
    i += Math.floor(sr*(0.002 + Math.random()*0.012));
  }
  BUF.w = w; BUF.b = b; BUF.c = k; A.noise = w;
}
/* a stone hall: a few hard early reflections, then a tail that darkens as it dies */
function makeIR(c, secs){
  const sr = c.sampleRate, n = Math.floor(sr*secs), ir = c.createBuffer(2, n, sr), pre = Math.floor(sr*0.014);
  for(let ch=0; ch<2; ch++){
    const d = ir.getChannelData(ch); let y = 0;
    for(let i=pre;i<n;i++){
      const k = (i - pre)/(n - pre), a = 0.8*Math.pow(1 - k, 2) + 0.05;
      y += a*((Math.random()*2 - 1) - y);
      d[i] = y*Math.pow(1 - k, 2)*Math.exp(-k*2.6);
    }
    for(let r=0;r<8;r++){ const i = pre + Math.floor(sr*(0.006 + Math.random()*0.075)); if(i < n) d[i] += (Math.random() < 0.5 ? -0.5 : 0.5)*(1 - r/10); }
  }
  return ir;
}

/* ---- voices ----
 *  P is the sound being built: its start time, its outputs, its pitch
 *  and filter jitter, and how long it rings. Every primitive starts a
 *  source, ramps its gain (no clicks), stops it and lets it go.          */
let P = null;
const LIVE = new Set();     // sources started and not yet ended (a set, so a doubled onended can't skew it)
Object.defineProperty(A, "live", { get:()=> LIVE.size });
function begin(src, nodes, t, end){
  LIVE.add(src);
  src.onended = ()=>{ LIVE.delete(src); for(let i=0;i<nodes.length;i++){ try{ nodes[i].disconnect(); }catch(e){} } };
  src.start(t); src.stop(end);
  if(end > P.end) P.end = end;
}
function route(g, o){
  g.connect(o.bus || P.dry);
  if(o.v !== false && P.wet) g.connect(P.wet);
  if(o.e && P.echo) g.connect(P.echo);
}
/* gain envelope: exponential attack (or a linear swell), optional hold, exponential release */
function env(p, t, att, dur, vol, hold){
  vol = Math.max(0.0002, vol);
  p.setValueAtTime(0.0001, t);
  if(att >= 0.04) p.linearRampToValueAtTime(vol, t + att); else p.exponentialRampToValueAtTime(vol, t + Math.max(0.002, att));
  if(hold) p.setValueAtTime(vol, t + att + hold);
  p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, att + (hold || 0) + 0.01));
}
/* a pitch contour: o.pc = [[fraction of dur, ratio], ...] */
function contour(p, f, t, dur, o){
  if(o.pc){ for(let i=0;i<o.pc.length;i++) p.exponentialRampToValueAtTime(Math.max(15, f*o.pc[i][1]), t + dur*o.pc[i][0]); }
  else if(o.to) p.exponentialRampToValueAtTime(Math.max(15, o.to*P.pj), t + (o.glide || dur));
}
/* an oscillator, optionally through a filter: o = { at, att, hold, to, glide, pc, det, lp, hp, bp, q, v, e, bus } */
function osc(type, f, dur, vol, o){
  o = o || NO;
  const c = A.ctx, t = P.t + (o.at || 0), s = c.createOscillator(), g = c.createGain(), nodes = [s, g];
  const f0 = f*P.pj;
  s.type = type; s.frequency.setValueAtTime(f0, t); contour(s.frequency, f0, t, dur, o);
  if(o.det) s.detune.value = o.det;
  let head = s;
  const ft = o.lp ? "lowpass" : o.hp ? "highpass" : o.bp ? "bandpass" : null;
  if(ft){ const fl = c.createBiquadFilter(); fl.type = ft; fl.frequency.value = (o.lp || o.hp || o.bp)*P.fj; fl.Q.value = o.q || 0.7; s.connect(fl); head = fl; nodes.push(fl); }
  head.connect(g);
  env(g.gain, t, o.att || 0.004, dur, vol*P.vol, o.hold);
  route(g, o);
  begin(s, nodes, t, t + dur + 0.03);
}
/* filtered noise: o = { at, att, hold, q, to, glide, buf:"w"|"b"|"c", rate, v, e, bus } */
function noise(dur, type, freq, vol, o){
  o = o || NO;
  const c = A.ctx, t = P.t + (o.at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = BUF[o.buf || "w"]; s.loop = true; s.playbackRate.value = o.rate || rnd(0.85, 1.15);
  const f0 = freq*P.fj;
  f.type = type; f.frequency.setValueAtTime(f0, t); f.Q.value = o.q || 0.8;
  if(o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to*P.fj), t + (o.glide || dur));
  s.connect(f); f.connect(g);
  env(g.gain, t, o.att || 0.003, dur, vol*P.vol, o.hold);
  route(g, o);
  LIVE.add(s);
  s.onended = ()=>{ LIVE.delete(s); s.disconnect(); f.disconnect(); g.disconnect(); };
  s.start(t, Math.random()*1.8); s.stop(t + dur + 0.03);
  if(t + dur > P.end) P.end = t + dur;
}
/* a body blow: a sine dropping fast */
function thump(f0, f1, dur, vol, o){
  o = Object.assign({ att:0.002, glide:dur*0.35 }, o || NO); o.to = f1;
  osc("sine", f0, dur, vol, o);
}
/* formant voice: a buzz through three vowel band-passes (grunts, moans, choirs) */
const VOWEL = {
  a:[[730, 1], [1090, 0.5], [2440, 0.22]], o:[[570, 1], [840, 0.45], [2410, 0.18]], u:[[320, 1], [800, 0.3], [2240, 0.12]],
  e:[[530, 1], [1840, 0.4], [2480, 0.22]], i:[[300, 1], [2200, 0.3], [3000, 0.18]], uh:[[620, 1], [1200, 0.4], [2550, 0.16]]
};
function voice(f, dur, vol, vowel, o){
  o = o || NO;
  const c = A.ctx, t = P.t + (o.at || 0), s = c.createOscillator(), g = c.createGain(), nodes = [s, g];
  const f0 = f*P.pj, V = VOWEL[vowel] || VOWEL.a, sh = o.shift || 1;
  s.type = o.type || "sawtooth"; s.frequency.setValueAtTime(f0, t); contour(s.frequency, f0, t, dur, o);
  if(o.det) s.detune.value = o.det;
  let rs = null, rg = null;
  if(o.rasp){   // breath and grit in the throat
    rs = c.createBufferSource(); rs.buffer = BUF.w; rs.loop = true; rg = c.createGain(); rg.gain.value = o.rasp*0.5;
    rs.connect(rg); nodes.push(rs, rg);
  }
  for(let i=0;i<3;i++){
    const bp = c.createBiquadFilter(), fg = c.createGain();
    bp.type = "bandpass"; bp.frequency.value = V[i][0]*sh*P.fj; bp.Q.value = V[i][0]*sh/(70 + i*40);
    if(o.morph){ const W = VOWEL[o.morph]; bp.frequency.setValueAtTime(V[i][0]*sh*P.fj, t); bp.frequency.linearRampToValueAtTime(W[i][0]*sh*P.fj, t + dur*0.8); }
    fg.gain.value = V[i][1]*5;
    s.connect(bp); if(rg) rg.connect(bp); bp.connect(fg); fg.connect(g); nodes.push(bp, fg);
  }
  env(g.gain, t, o.att || 0.02, dur, vol*P.vol, o.hold);
  route(g, o);
  if(rs){ rs.start(t, Math.random()*1.8); rs.stop(t + dur + 0.03); }
  begin(s, nodes, t, t + dur + 0.03);
}
/* a struck bell: inharmonic partials (hum, prime, minor tierce, quint, nominal...) each dying at its own rate */
const BELL = [[0.5, 0.6, 1], [1, 0.9, 0.7], [1.19, 0.55, 0.55], [1.5, 0.35, 0.45], [2, 0.45, 0.38], [2.51, 0.2, 0.26], [2.66, 0.17, 0.24], [3.01, 0.13, 0.18], [4.07, 0.09, 0.12], [5.42, 0.05, 0.08]];
function bell(f, dur, vol, o){
  o = o || NO;
  const n = o.n || BELL.length, str = o.str || 0;
  for(let i=0;i<n;i++){
    const r = BELL[i][0]*(1 + str*(BELL[i][0] - 1)*0.035);
    osc("sine", f*r, dur*BELL[i][2], vol*BELL[i][1], { at:o.at, att:i ? 0.003 : 0.02, det:rnd(-4, 4), v:o.v, e:o.e, bus:o.bus });
  }
  noise(0.06, "bandpass", Math.min(9000, f*3), vol*0.5, { at:o.at, q:2, v:o.v, bus:o.bus });
}
/* a soft chime: a small bell with only its brightest few partials, gently struck */
function chime(f, dur, vol, o){
  o = o || NO;
  osc("sine", f, dur, vol, { at:o.at, att:0.006, v:o.v, e:o.e });
  osc("sine", f*2.76, dur*0.5, vol*0.28, { at:o.at, att:0.004, v:o.v });
  osc("sine", f*5.4, dur*0.25, vol*0.1, { at:o.at, att:0.003, v:o.v });
}
/* iron: a short inharmonic clang */
function metal(f, dur, vol, o){
  o = o || NO;
  [[1, 1, 1], [1.47, 0.6, 0.7], [2.09, 0.45, 0.5], [2.56, 0.35, 0.4], [3.13, 0.25, 0.3]].forEach(p=>
    osc(o.type || "triangle", f*p[0], dur*p[2], vol*p[1], { at:o.at, att:0.002, det:rnd(-8, 8), v:o.v, e:o.e }));
  noise(0.04, "highpass", 2500, vol*0.8, { at:o.at, v:o.v });
}
/* one small link of chain, a coin, a buckle */
function clink(f, vol, at){
  osc("sine", f, 0.12, vol, { at, att:0.001 });
  osc("sine", f*2.71, 0.06, vol*0.5, { at, att:0.001 });
}
function chains(n, dur, vol, at){
  for(let i=0;i<n;i++) clink(rnd(1400, 3200), vol*rnd(0.4, 1), (at || 0) + Math.random()*dur);
  noise(dur, "bandpass", 3000, vol*0.6, { at, q:1.5, buf:"c", att:0.01 });
}
/* stone on stone: rumble and grit, wobbling */
function grind(dur, vol, o){
  o = o || NO;
  noise(dur, "lowpass", o.f || 320, vol, { at:o.at, att:0.06, buf:"b", q:1, e:o.e, rate:rnd(0.7, 1) });
  noise(dur, "bandpass", (o.f || 320)*3, vol*0.7, { at:o.at, att:0.05, buf:"c", q:1.2, rate:rnd(0.4, 0.7) });
  noise(dur, "bandpass", (o.f || 320)*1.6, vol*0.35, { at:o.at, att:0.08, q:4, rate:0.5 });
}
/* a buzz of rubbing: a slow square through a narrow band (hinges, wood, creaking breath) */
function creak(dur, vol, rate, f, o){
  o = o || NO;
  osc("square", rate, dur, vol, Object.assign({ bp:f, q:6, att:0.04 }, o));
}
/* breath: shaped noise, for whooshes and whispers */
function breath(dur, vol, o){
  o = o || NO;
  noise(dur, "bandpass", o.f || 1400, vol, { at:o.at, att:o.att || dur*0.4, q:o.q || 1.4, to:o.to, glide:o.glide, v:o.v, e:o.e });
}
/* a whisper: noise through two formants jumping between vowels, syllable by syllable */
function whisper(dur, vol, o){
  o = o || NO;
  const c = A.ctx, t = P.t + (o.at || 0), s = c.createBufferSource(), g = c.createGain(), am = c.createGain(), nodes = [s, g, am];
  s.buffer = BUF.w; s.loop = true;
  const vs = ["a", "e", "i", "o", "u", "uh"];
  for(let k=0;k<2;k++){
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 7; nodes.push(bp);
    let tt = t; while(tt < t + dur){ bp.frequency.setTargetAtTime(VOWEL[pick(vs)][k + 1][0]*rnd(0.9, 1.15), tt, 0.02); tt += rnd(0.07, 0.16); }
    s.connect(bp); bp.connect(am);
  }
  am.gain.setValueAtTime(0.2, t);
  let tt = t; while(tt < t + dur){ am.gain.setTargetAtTime(rnd(0.15, 1), tt, 0.03); tt += rnd(0.08, 0.2); }
  am.connect(g);
  env(g.gain, t, Math.min(0.3, dur*0.3), dur, vol*P.vol*3);
  route(g, o);
  begin(s, nodes, t, t + dur + 0.03);
}

/* ---- where a sound is: pan and fall off by distance to Zippy ---- */
function place(o){
  const G = DG.app && DG.app.G, p = G && G.player;
  if(!p || typeof o.x !== "number" || typeof o.y !== "number") return null;
  const dx = o.x - p.x, dy = o.y - p.y, d = Math.sqrt(dx*dx + dy*dy);
  return { pan:clamp(dx/11, -0.8, 0.8), gain:1/(1 + (d/10)*(d/10)), d };
}

/* ---- limits: { min: seconds between, cap: voices at once, wet: reverb send, jit: pitch jitter,
 *      g: shared key, also: [key, seconds] a second, shared limit, pri: plays even when busy, fixed: no jitter } */
const LIM = {};
const LIM_DEF = { min:0.03, cap:3, wet:0.35, jit:0.04 };
function lim(names, o){ names.split(" ").forEach(n=> LIM[n] = Object.assign({}, LIM_DEF, o)); }
const last = {}, voices = {};
const SND = {};
let legacy = null;

function playSafe(name, o){
  const c = A.ctx;
  if(!c || A.muted || typeof name !== "string") return;
  let fn = SND[name];
  if(!fn && legacy && legacy.has(name)) fn = o2=> legacy.play(name, o2);
  if(!fn){
    if(name.indexOf("shoot_") === 0) fn = SND.shoot_pistol;
    else if(name.indexOf("spell_") === 0) fn = SND.spell_missiles;
    if(!fn) return;
  }
  o = o && typeof o === "object" ? o : NO;
  const L = LIM[name] || LIM_DEF, now = c.currentTime;
  const key = L.g ? (typeof L.g === "function" ? L.g(o) : L.g) : name;
  if(last[key] !== undefined && now - last[key] < L.min) return;
  if(L.also && last[L.also[0]] !== undefined && now - last[L.also[0]] < L.also[1]) return;
  let vs = voices[key] || [];
  if(vs.length) vs = voices[key] = vs.filter(e=> e > now);
  if(vs.length >= L.cap) return;
  if(A.live > LIVE_MAX && !L.pri) return;
  const pos = place(o);
  if(pos && pos.gain < 0.05) return;
  last[key] = now; if(L.also) last[L.also[0]] = now;
  const dry = c.createGain(), wet = c.createGain();
  dry.gain.value = (pos ? pos.gain : 1)*(L.vol || 1);
  wet.gain.value = L.wet*(pos ? Math.sqrt(pos.gain) : 1)*(L.vol || 1);
  let pan = null;
  if(pos && c.createStereoPanner){ pan = c.createStereoPanner(); pan.pan.value = pos.pan; dry.connect(pan); pan.connect(A.sfx); }
  else dry.connect(A.sfx);
  wet.connect(A.verbIn);
  const echo = c.createGain(); echo.gain.value = pos ? pos.gain : 1; echo.connect(A.echoIn);
  P = { t:now + 0.008, dry, wet, echo, pj:L.fixed ? 1 : 1 + rnd(-1, 1)*L.jit, fj:L.fixed ? 1 : rnd(0.9, 1.1), vol:1, end:now };
  try{ fn(o); }
  finally{
    const end = P.end; P = null;
    vs.push(end); voices[key] = vs;
    if(!A.offline) setTimeout(()=>{ dry.disconnect(); wet.disconnect(); echo.disconnect(); if(pan) pan.disconnect(); }, (end - now + 0.5)*1000);
  }
}
A.play = function(name, o){
  try{ playSafe(name, o); }
  catch(e){ P = null; if(!A.warned){ A.warned = true; if(window.console) console.warn("audio: " + name, e); } }
};
A.has = name=> !!SND[name] || !!(legacy && legacy.has(name));

/* ================================================================== *
 *  Bodies and footfalls (hooks the view calls as things move)
 * ================================================================== */
lim("step", { min:0.12, cap:3, wet:0.16, jit:0.07 });
SND.step = o=>{
  const h = !!o.heavy;
  noise(h ? 0.16 : 0.11, "lowpass", h ? 420 : 620, h ? 0.3 : 0.18, { q:0.9, v:false });
  thump(h ? 105 : 130, 50, 0.09, h ? 0.22 : 0.1, { v:false });
  noise(0.07, "bandpass", rnd(1800, 2800), 0.05, { at:0.012, q:1.1, buf:"c" });   // grit under the boot
  if(h) clink(rnd(1100, 1500), 0.012, 0.02);
};
lim("frogHop", { min:0.1, cap:2, wet:0.2, jit:0.08 });
SND.frogHop = ()=>{
  noise(0.12, "bandpass", 420, 0.16, { q:2, to:260 });
  noise(0.08, "bandpass", 900, 0.07, { q:1.5, buf:"c", at:0.01 });
  thump(95, 140, 0.1, 0.05, { glide:0.08, v:false });
};
lim("frogLand", { min:0.1, cap:2, wet:0.3, jit:0.08 });
SND.frogLand = ()=>{
  noise(0.22, "lowpass", 900, 0.26, { to:180, q:1.2 });
  noise(0.14, "bandpass", 600, 0.12, { q:3, buf:"c" });
  thump(110, 42, 0.18, 0.22, { v:false });
};
lim("skitter", { min:1/6, cap:3, wet:0.25, jit:0.1 });
SND.skitter = ()=>{
  const n = 2 + Math.floor(Math.random()*3);
  for(let i=0;i<n;i++) noise(0.02, "bandpass", rnd(2600, 4800), 0.07, { q:5, at:i*rnd(0.025, 0.05) });
};
lim("stomp", { min:0.08, cap:3, wet:0.45, jit:0.06 });
SND.stomp = ()=>{
  thump(78, 32, 0.38, 0.5, { v:false });
  noise(0.32, "lowpass", 380, 0.4, { buf:"b", q:0.8 });
  noise(0.22, "bandpass", 1100, 0.1, { at:0.02, buf:"c", q:1 });
};
lim("moan", { min:1.4, cap:2, wet:0.7, jit:0.08, g:o=> "moan_" + (o.kind || "ghost"), also:["moan", 0.45] });
SND.moan = o=>{
  switch(o.kind){
    case "banshee": { const f = rnd(420, 540); voice(f, 1.9, 0.05, "i", { att:0.5, pc:[[0.4, 1.22], [1, 0.8]], morph:"e", rasp:0.15 }); voice(f*1.012, 1.9, 0.03, "i", { att:0.6, pc:[[0.4, 1.2], [1, 0.82]] }); break; }
    case "flesh": { const f = rnd(70, 92); voice(f, 1.5, 0.09, "o", { att:0.25, pc:[[0.5, 0.92], [1, 0.72]], rasp:0.5, morph:"u" }); noise(0.9, "bandpass", 380, 0.08, { at:0.3, q:4, buf:"c", att:0.2 }); break; }
    case "goblin": { const f = rnd(95, 130); voice(f, 0.75, 0.08, "a", { att:0.06, pc:[[0.3, 1.12], [1, 0.78]], rasp:0.7, morph:"uh" }); break; }
    case "shroom": creak(1.3, 0.05, rnd(22, 30), 760, { pc:[[0.5, 1.15], [1, 0.8]], att:0.3 }); breath(1.2, 0.05, { f:900, to:500, q:3, at:0.1 }); break;
    case "boss": { const f = rnd(52, 64); voice(f, 2.4, 0.16, "o", { att:0.35, pc:[[0.3, 1.14], [1, 0.68]], rasp:0.6, morph:"u", e:true }); noise(2, "lowpass", 160, 0.25, { buf:"b", att:0.5 }); break; }
    default: { const f = rnd(170, 230); voice(f, 2.1, 0.07, "u", { att:0.7, pc:[[0.5, 0.9], [1, 0.72]], rasp:0.25, morph:"o" }); voice(f*1.5, 2, 0.02, "u", { att:0.9, pc:[[1, 0.76]] }); }
  }
};
lim("die", { min:0.05, cap:3, wet:0.55, jit:0.08 });
SND.die = o=>{
  switch(o.family){
    case "shroom": noise(0.4, "lowpass", 1000, 0.25, { to:140, q:1.5 }); creak(0.7, 0.05, 28, 700, { at:0.08, pc:[[1, 0.55]] }); breath(0.6, 0.06, { f:1200, to:500, at:0.05, att:0.05 }); break;
    case "haunt": { const f = rnd(300, 380); voice(f, 1.6, 0.06, "u", { att:0.06, pc:[[0.2, 1.3], [1, 0.45]], rasp:0.2, morph:"o" }); breath(0.9, 0.08, { f:2600, to:500, att:0.05, q:1 }); chime(rnd(1100, 1500), 1.2, 0.012, { at:0.1 }); break; }
    case "weird": voice(rnd(80, 100), 1.2, 0.08, "o", { pc:[[1, 0.5]], rasp:0.4 }); voice(rnd(150, 180), 1.2, 0.05, "u", { pc:[[1, 1.7]] }); noise(0.8, "bandpass", 350, 0.1, { buf:"c", q:3, att:0.05 }); break;
    case "gloom": voice(rnd(80, 95), 1.4, 0.08, "u", { att:0.08, pc:[[1, 0.6]], rasp:0.3 }); whisper(1.1, 0.03, { at:0.2 }); thump(70, 35, 0.3, 0.2, { v:false }); break;
    case "boss": voice(58, 3.2, 0.2, "a", { att:0.08, pc:[[0.25, 1.2], [1, 0.45]], rasp:0.6, morph:"u", e:true }); voice(87, 3, 0.08, "o", { att:0.1, pc:[[0.25, 1.15], [1, 0.5]] }); noise(3, "lowpass", 140, 0.4, { buf:"b", att:0.2 }); break;
    default: { const f = rnd(150, 200); voice(f, 0.65, 0.1, "a", { att:0.008, pc:[[0.15, 1.2], [1, 0.55]], rasp:0.45, morph:"uh" }); noise(0.25, "bandpass", 500, 0.08, { at:0.12, q:3, buf:"c" }); }
  }
};
lim("swing", { min:0.06, cap:3, wet:0.3, jit:0.1 });
SND.swing = ()=>{
  noise(0.36, "bandpass", 320, 0.2, { att:0.14, to:1500, glide:0.24, q:1.6 });
  noise(0.3, "lowpass", 300, 0.1, { att:0.15, buf:"b" });
};
lim("cloth", { min:0.08, cap:2, wet:0.2, jit:0.1 });
SND.cloth = ()=>{
  noise(0.16, "bandpass", 1800, 0.09, { att:0.012, q:0.7, to:900 });
  noise(0.12, "bandpass", 1300, 0.05, { buf:"c", q:1, at:0.01 });
};

/* ---- the old sounds, until they are restyled ---- */
function tone(f, dur, type, vol, at, bus, slide, verb){
  const c = A.ctx; if(!c) return;
  const t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain();
  o.type = type || "sine"; o.frequency.setValueAtTime(f, t);
  if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || A.sfx); if(verb) g.connect(A.verb);
  o.start(t); o.stop(t + dur + 0.05);
}
function burst(dur, ftype, freq, vol, q, at, bus, sweep, verb){
  const c = A.ctx; if(!c) return;
  const t = c.currentTime + (at || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = A.noise; s.playbackRate.value = 0.6 + Math.random()*0.8;
  f.type = ftype; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if(sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || A.sfx); if(verb) g.connect(A.verb);
  s.start(t, Math.random()*1.5); s.stop(t + dur + 0.05);
}
/* a slow swell and fade, for drones and tolls */
function swell(f, dur, type, vol, at, bus, verb){
  const c = A.ctx; if(!c) return;
  const t = c.currentTime + (at || 0), o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
  o.type = type || "sawtooth"; o.frequency.setValueAtTime(f, t);
  lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur*0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(lp); lp.connect(g); g.connect(bus || A.sfx); if(verb) g.connect(A.verb);
  o.start(t); o.stop(t + dur + 0.05);
}

/* every gun shot gets a little of its element on top */
function elementTail(el){
  if(el === "fire") burst(0.15, "lowpass", 1200, 0.12, 1, 0.01);
  else if(el === "frost") tone(2400, 0.08, "sine", 0.03, 0.01, 0, 3600);
  else if(el === "poison") burst(0.12, "bandpass", 700, 0.1, 6, 0.01, 0, 300);
  else if(el === "shock") burst(0.06, "highpass", 5000, 0.08, 1, 0.01);
  else tone(900, 0.08, "triangle", 0.03, 0.01, 0, 1400);
}
const LEGACY = new Set(["accordion", "active", "altar", "bark", "beat", "blink", "bones", "bonk", "boom", "boss", "bossdie", "bounce", "brazier", "break", "bubble", "buy", "byproduct", "charged", "chest", "clear", "click", "cloud", "coin", "crit", "croak", "dart", "death", "descend", "dice", "disco", "doorOpen", "doorShut", "duo", "ering", "error", "fall", "fly", "freeze", "frog", "ghost", "ghostShot", "godly", "graze", "gremlin", "gulp", "heal", "heartbeat", "hex", "hiccup", "hit", "hurt", "illusion", "inhale", "jackpot", "jump", "kill", "laserTell", "levelup", "lick", "lootDrop", "mirror", "note", "nova", "pickup", "pickupBig", "poof", "portal", "portalShot", "puff", "push", "react", "reload", "reloaded", "reroll", "reset", "secret", "select", "shatter", "shoot_launcher", "shoot_pistol", "shoot_rifle", "shoot_shotgun", "shoot_smg", "sling", "slip", "socket", "solved", "spell_chain", "spell_fireball", "spell_missiles", "spell_nova", "spell_plague", "spikes", "splash", "splat", "squeak", "stick", "stone", "swap", "tell", "tellBig", "throw", "thud", "transform", "ward", "whistle", "zap"]);
legacy = { has:n=> LEGACY.has(n), play:function(name, o){
  switch(name){
    case "click":  tone(880, 0.05, "square", 0.04); break;
    case "select": tone(660, 0.06, "triangle", 0.08); tone(990, 0.08, "triangle", 0.06, 0.05); break;
    case "error":  tone(180, 0.12, "square", 0.06); tone(150, 0.12, "square", 0.05, 0.08); break;
    case "shoot_pistol":   tone(520, 0.09, "square", 0.07, 0, 0, 200); burst(0.06, "bandpass", 2400, 0.25, 1); elementTail(o.el); break;
    case "shoot_smg":      tone(380, 0.05, "square", 0.05, 0, 0, 160); burst(0.04, "bandpass", 3000, 0.2, 1); if(Math.random() < 0.4) elementTail(o.el); break;
    case "shoot_shotgun":  burst(0.28, "lowpass", 2600, 0.6, 0.7, 0, 0, 300); tone(90, 0.2, "sine", 0.5, 0, 0, 40); elementTail(o.el); break;
    case "shoot_rifle":    burst(0.18, "bandpass", 1800, 0.5, 0.8, 0, 0, 500, true); tone(160, 0.15, "sawtooth", 0.1, 0, 0, 60); elementTail(o.el); break;
    case "shoot_launcher": tone(140, 0.3, "sine", 0.4, 0, 0, 70); burst(0.2, "lowpass", 800, 0.4, 1); elementTail(o.el); break;
    case "spell_missiles": [0, 3, 7, 12, 15].forEach((s, i)=> tone(mtof(76 + s), 0.25, "triangle", 0.06, i*0.04, 0, 0, true)); break;
    case "spell_fireball": burst(0.6, "lowpass", 600, 0.4, 1, 0, 0, 2400, true); tone(110, 0.5, "sawtooth", 0.08, 0, 0, 220); break;
    case "spell_nova":     burst(0.5, "highpass", 3000, 0.3, 1, 0, 0, 8000, true); [0, 5, 12].forEach((s, i)=> tone(mtof(84 + s), 0.6, "sine", 0.06, i*0.03, 0, 0, true)); break;
    case "spell_plague":   burst(0.7, "bandpass", 400, 0.4, 5, 0, 0, 1200, true); tone(80, 0.6, "sawtooth", 0.06, 0, 0, 60); break;
    case "spell_chain":    for(let i=0;i<5;i++) burst(0.07, "highpass", 3500, 0.3, 1, i*0.04); tone(60, 0.3, "sawtooth", 0.15, 0, 0, 40); break;
    case "hit":    tone(220, 0.07, "square", 0.05, 0, 0, 90); burst(0.05, "lowpass", 1200, 0.15); break;
    case "crit":   tone(1320, 0.12, "triangle", 0.09); tone(1760, 0.15, "triangle", 0.07, 0.05); burst(0.08, "lowpass", 1600, 0.25); break;
    case "bounce": tone(1600, 0.04, "triangle", 0.04, 0, 0, 2200); break;
    case "kill":   tone(mtof(72 + Math.floor(Math.random()*5)), 0.08, "square", 0.05, 0, 0, 900); burst(0.2, "lowpass", 700, 0.3, 2, 0, 0, 150); break;
    case "bossdie": tone(mtof(33), 3.5, "sine", 0.5, 0, 0, 0, true); tone(mtof(45), 3, "triangle", 0.12, 0.02, 0, 0, true); [57, 60, 64, 69].forEach((m, i)=> tone(mtof(m), 1.6, "triangle", 0.06, 0.5 + i*0.22, 0, 0, true)); burst(1.8, "lowpass", 700, 0.8, 0.7, 0, 0, 50, true); break;
    case "hurt":   tone(200, 0.2, "sawtooth", 0.15, 0, 0, 70); burst(0.15, "lowpass", 1400, 0.35); break;
    case "death":  tone(mtof(31), 4, "sine", 0.55, 0, 0, 0, true); tone(mtof(43), 3.2, "triangle", 0.12, 0.01, 0, 0, true); tone(mtof(55.3), 2.6, "sine", 0.05, 0.02, 0, 0, true); burst(1.2, "lowpass", 500, 0.5, 0.7, 0, 0, 60, true); swell(mtof(40), 4.5, "sawtooth", 0.08, 0.3, 0, true); break;
    case "heal":   [0, 4, 7, 12].forEach((s, i)=> tone(mtof(79 + s), 0.3, "triangle", 0.05, i*0.05, 0, 0, true)); break;
    case "blink":  tone(400, 0.15, "sine", 0.1, 0, 0, 1600); burst(0.15, "highpass", 2000, 0.12, 1, 0, 0, 6000); break;
    case "reload": burst(0.05, "bandpass", 2500, 0.2, 4); break;
    case "reloaded": burst(0.05, "bandpass", 1800, 0.25, 4); tone(1200, 0.04, "square", 0.03, 0.03); break;
    case "swap":   burst(0.06, "bandpass", 2000, 0.2, 3); tone(700, 0.05, "triangle", 0.05, 0.04); break;
    case "doorShut": burst(0.4, "lowpass", 400, 0.7, 1, 0, 0, 80, true); tone(70, 0.3, "square", 0.15, 0, 0, 40); break;
    case "doorOpen": burst(0.6, "lowpass", 600, 0.3, 1, 0, 0, 200); [57, 60, 64].forEach((m, i)=> tone(mtof(m + 12), 0.25, "triangle", 0.06, i*0.08)); break;
    case "clear":  tone(mtof(57), 1.4, "sine", 0.12, 0, 0, 0, true); tone(mtof(64), 1.2, "triangle", 0.04, 0.12, 0, 0, true); break;
    case "tell":   tone(900, 0.06, "square", 0.03); break;
    case "tellBig": tone(110, 0.4, "sawtooth", 0.1, 0, 0, 220); break;
    case "sling":  burst(0.12, "bandpass", 900, 0.2, 3, 0, 0, 300); break;
    case "hex":    tone(300, 0.25, "sawtooth", 0.05, 0, 0, 150, true); break;
    case "ering":  tone(330, 0.3, "triangle", 0.08, 0, 0, 660); burst(0.2, "bandpass", 1500, 0.15, 2); break;
    case "throw":  tone(500, 0.2, "triangle", 0.05, 0, 0, 900); break;
    case "boom":   burst(0.8, "lowpass", 900, 0.9, 0.7, 0, 0, 70, true); tone(55, 0.5, "sine", 0.7, 0, 0, 30); break;
    case "zap":    burst(0.1, "highpass", 4000, 0.25, 1); tone(120, 0.1, "sawtooth", 0.08, 0, 0, 2000); break;
    case "freeze": tone(2600, 0.25, "sine", 0.06, 0, 0, 1200); burst(0.2, "highpass", 6000, 0.12); break;
    case "cloud":  burst(0.5, "bandpass", 500, 0.25, 4, 0, 0, 200); break;
    case "bonk":   tone(320, 0.18, "square", 0.12, 0, 0, 120); tone(1400, 0.4, "sine", 0.06, 0.08, 0, 700); tone(1700, 0.4, "sine", 0.05, 0.16, 0, 900); break;
    case "illusion": [72, 79, 84, 91].forEach((m, i)=> tone(mtof(m), 0.6, "sine", 0.05, i*0.06, 0, 0, true)); burst(0.6, "highpass", 3000, 0.1, 1, 0, 0, 8000, true); break;
    case "secret": [64, 67, 72, 76, 79, 84].forEach((m, i)=> tone(mtof(m), 0.4, "triangle", 0.06, i*0.07, 0, 0, true)); break;
    case "solved": [72, 76, 79, 84].forEach((m, i)=> tone(mtof(m), 0.5, "square", 0.05, i*0.1, 0, 0, true)); break;
    case "brazier": burst(0.3, "lowpass", 1400, 0.3, 1, 0, 0, 400); break;
    case "lootDrop": [0, 7, 12].forEach((s, i)=> tone(mtof(79 + s + (o.rarity || 0)*2), 0.3, "triangle", 0.05, i*0.05, 0, 0, true)); break;
    case "coin":   tone(mtof(88 + (Math.random() < 0.5 ? 0 : 3)), 0.08, "square", 0.035); tone(mtof(95), 0.12, "square", 0.03, 0.05); break;
    case "pickup": tone(mtof(81), 0.1, "triangle", 0.06); tone(mtof(88), 0.15, "triangle", 0.05, 0.06); break;
    case "pickupBig": [72, 76, 79, 84, 88].forEach((m, i)=> tone(mtof(m), 0.3, "triangle", 0.06, i*0.05, 0, 0, true)); break;
    case "chest":  burst(0.3, "lowpass", 800, 0.4, 2, 0, 0, 200); [76, 79, 84].forEach((m, i)=> tone(mtof(m), 0.4, "triangle", 0.06, 0.15 + i*0.08, 0, 0, true)); break;
    case "buy":    [84, 88, 91].forEach((m, i)=> tone(mtof(m), 0.1, "square", 0.04, i*0.06)); break;
    case "slip":   tone(300, 0.5, "sine", 0.12, 0, 0, 1400); tone(1400, 0.4, "sine", 0.08, 0.45, 0, 300); break;   // the slide whistle
    case "fall":   tone(900, 0.7, "sine", 0.1, 0, 0, 120); break;
    case "spikes": burst(0.08, "highpass", 3000, 0.25, 1); tone(800, 0.05, "square", 0.04); break;
    case "dart":   burst(0.08, "bandpass", 2500, 0.2, 2); break;
    case "thud":   tone(60, 0.3, "sine", 0.6, 0, 0, 30); burst(0.2, "lowpass", 300, 0.5); break;
    case "boss":   tone(mtof(29), 3, "sine", 0.5, 0, 0, 0, true); [45, 48, 52, 51].forEach((m, i)=> tone(mtof(m), 1.1, "sawtooth", 0.06, 0.2 + i*0.35, 0, 0, true)); swell(mtof(33), 4, "sawtooth", 0.12, 0, 0, true); break;
    case "jump":   tone(120, 0.5, "sine", 0.2, 0, 0, 480); break;
    case "portal": [60, 64, 67, 71, 74, 79].forEach((m, i)=> tone(mtof(m), 1.2, "sine", 0.05, i*0.09, 0, 0, true)); break;
    case "descend": tone(400, 1.0, "sine", 0.1, 0, 0, 80, true); break;
    case "socket": tone(1000, 0.06, "square", 0.04); tone(1500, 0.1, "triangle", 0.05, 0.05); break;
    case "active": [60, 67, 72, 79].forEach((m, i)=> tone(mtof(m), 0.3, "sawtooth", 0.05, i*0.04, 0, 0, true)); burst(0.3, "highpass", 2000, 0.15, 1, 0, 0, 7000); break;
    case "charged": tone(mtof(84), 0.1, "square", 0.04); tone(mtof(91), 0.2, "square", 0.04, 0.07); break;
    case "altar":  [40, 43, 46].forEach((m, i)=> tone(mtof(m), 1.2, "sawtooth", 0.07, i*0.15, 0, 0, true)); break;
    case "beat":   tone(55, 0.25, "sine", 0.6, 0, 0, 35); tone(50, 0.25, "sine", 0.5, 0.18, 0, 32); break;
    case "bones":  for(let i=0;i<4;i++) tone(900 + Math.random()*900, 0.04, "square", 0.04, i*0.05); break;
    case "bubble": tone(400, 0.12, "sine", 0.08, 0, 0, 1200); break;
    case "byproduct": tone(1200 + Math.random()*400, 0.06, "triangle", 0.025, 0, 0, 2400); break;
    case "break":  burst(0.25, "lowpass", 1600, 0.4, 1, 0, 0, 300); tone(200, 0.1, "square", 0.05, 0, 0, 80); break;
    case "croak":  tone(110, 0.18, "sawtooth", 0.12, 0, 0, 80); tone(95, 0.2, "sawtooth", 0.1, 0.12, 0, 70); break;
    case "frog":   tone(220, 0.08, "square", 0.05, 0, 0, 160); tone(330, 0.1, "square", 0.04, 0.06, 0, 260); break;
    case "lick":   tone(900, 0.07, "sine", 0.06, 0, 0, 300); burst(0.05, "bandpass", 1200, 0.12, 4); break;
    case "gulp":   tone(200, 0.2, "sine", 0.2, 0, 0, 60); break;
    case "duo":    [72, 76, 79, 84, 79, 84, 88].forEach((m, i)=> tone(mtof(m), 0.35, "square", 0.045, i*0.06, 0, 0, true)); break;
    case "godly":  [60, 64, 67, 72, 76, 79, 84, 88, 91, 96].forEach((m, i)=> tone(mtof(m), 0.9, "triangle", 0.06, i*0.07, 0, 0, true)); burst(1.4, "highpass", 4000, 0.15, 1, 0.2, 0, 9000, true); break;
    case "levelup": [67, 71, 74, 79, 83].forEach((m, i)=> tone(mtof(m), 0.25, "square", 0.045, i*0.06, 0, 0, true)); break;
    case "fly":    for(let i=0;i<6;i++) tone(mtof(88 + i*2), 0.12, "sine", 0.04, i*0.04); break;
    case "ghost":  tone(500, 0.9, "sine", 0.06, 0, 0, 300, true); tone(507, 0.9, "sine", 0.05, 0.05, 0, 310, true); break;
    case "graze":  tone(1800, 0.05, "sine", 0.03); break;
    case "gremlin": for(let i=0;i<3;i++) tone(1200 + Math.random()*800, 0.05, "square", 0.03, i*0.05); break;
    case "heartbeat": case "inhale": burst(0.6, "bandpass", 500, 0.25, 2, 0, 0, 1800, true); break;
    case "laserTell": tone(1200, 0.5, "sine", 0.05, 0, 0, 2400); break;
    case "mirror": [84, 79, 84].forEach((m, i)=> tone(mtof(m), 0.2, "sine", 0.05, i*0.05, 0, 0, true)); break;
    case "note":   tone(mtof([72, 74, 76, 79, 81][o.i || 0] || 72), 0.4, "triangle", 0.09, 0, 0, 0, true); break;
    case "nova":   burst(0.4, "highpass", 2500, 0.25, 1, 0, 0, 7000, true); break;
    case "poof":   burst(0.25, "lowpass", 900, 0.25, 1, 0, 0, 200); break;
    case "puff":   burst(0.2, "bandpass", 600, 0.2, 3, 0, 0, 200); break;
    case "push":   burst(0.25, "lowpass", 300, 0.4, 1); break;
    case "react":  tone(mtof(84), 0.08, "square", 0.05); tone(mtof(91), 0.15, "triangle", 0.06, 0.05); burst(0.2, "highpass", 3000, 0.12); break;
    case "reroll": for(let i=0;i<6;i++) tone(mtof(72 + i*3), 0.06, "square", 0.03, i*0.04); break;
    case "reset":  tone(600, 0.3, "triangle", 0.06, 0, 0, 200); break;
    case "shatter": burst(0.3, "highpass", 4000, 0.3, 1); tone(3000, 0.2, "sine", 0.04, 0, 0, 1500); break;
    case "splash": burst(0.4, "lowpass", 1400, 0.35, 1, 0, 0, 300); break;
    case "splat":  burst(0.15, "lowpass", 600, 0.35, 2, 0, 0, 120); tone(90, 0.12, "sine", 0.2, 0, 0, 50); break;
    case "stone":  burst(0.35, "lowpass", 260, 0.5, 1); tone(70, 0.3, "square", 0.08, 0, 0, 45); break;
    case "transform": [60, 64, 67, 72, 76, 79, 84, 88].forEach((m, i)=> tone(mtof(m), 0.6, "sawtooth", 0.04, i*0.06, 0, 0, true)); burst(1.2, "highpass", 3000, 0.2, 1, 0.3, 0, 9000, true); break;
    case "squeak": tone(1400, 0.12, "square", 0.05, 0, 0, 2400); tone(2200, 0.1, "square", 0.04, 0.08, 0, 1200); break;
    case "stick":  tone(900, 0.05, "square", 0.04); tone(1200, 0.05, "square", 0.04, 0.12); break;
    case "portalShot": tone(300, 0.2, "sine", 0.06, 0, 0, 1800, true); break;
    case "accordion": [52, 53, 58, 59].forEach(m=> tone(mtof(m), 0.6, "sawtooth", 0.05, 0, 0, mtof(m)*0.97, true)); break;
    case "jackpot": [76, 79, 84, 88, 91, 96].forEach((m, i)=> tone(mtof(m), 0.15, "square", 0.04, i*0.05)); break;
    case "ghostShot": tone(700, 0.25, "sine", 0.04, 0, 0, 400, true); break;
    case "disco": [60, 64, 67, 72, 67, 64].forEach((m, i)=> tone(mtof(m), 0.15, "square", 0.04, i*0.08)); break;
    case "hiccup": tone(500, 0.06, "square", 0.06, 0, 0, 1100); break;
    case "whistle": tone(2000, 0.5, "sine", 0.08, 0, 0, 2600); tone(2600, 0.4, "sine", 0.06, 0.45, 0, 1800); break;
    case "dice": for(let i=0;i<5;i++) burst(0.04, "bandpass", 2500 + Math.random()*1500, 0.2, 4, i*0.06); break;
    case "ward":   tone(mtof(86), 0.3, "sine", 0.07, 0, 0, 0, true); tone(mtof(93), 0.4, "sine", 0.05, 0.05, 0, 0, true); break;
    case "bark": {   // goblin gibberish: a couple of squeaky formant blips
      const b = 500 + Math.random()*400;
      for(let i=0;i<3;i++) tone(b*(0.8 + Math.random()*0.6), 0.07, "square", 0.025, i*0.07, 0, b*(0.6 + Math.random()));
      break;
    }
  }
} };

/* ---- the march ---- */
const SONG = {
  chords:[[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]],     // Am F G E
  bass:[45, 41, 43, 40],
  lead:[
    [69, -1, 72, -1, 71, 69, -1, 64, -1, -1, 65, -1, 64, -1, -1, -1],
    [65, -1, 69, -1, 72, -1, 74, 72, -1, 69, -1, -1, 65, -1, -1, -1],
    [67, -1, 71, -1, 74, -1, 72, 71, -1, 67, -1, 71, 74, -1, -1, -1],
    [68, -1, 71, -1, 74, -1, 76, -1, 74, 71, -1, 68, 64, -1, -1, -1]
  ]
};
A.setMode = m=>{ A.mode = m; };
A.tick = function(){
  const c = A.ctx; if(!c || c.state !== "running") return;
  const bpm = A.mode === "boss" ? 120 : A.mode === "fight" ? 108 : 84, spb = 60/bpm/4;
  while(A.next < c.currentTime + 0.2){
    const at = A.next - c.currentTime, s = A.step % 16, bar = Math.floor(A.step/16) % 4, Bu = A.music;
    const ch = SONG.chords[bar], bass = SONG.bass[bar] - (A.mode === "boss" ? 12 : 0);
    // the walking bass: on the beat, sneaking
    if(s % 4 === 0) tone(mtof(bass + (s === 8 ? 7 : 0)), spb*3, "triangle", 0.16, at, Bu);
    if(s % 4 === 2 && A.mode !== "menu") tone(mtof(bass + 12), spb*1.5, "triangle", 0.07, at, Bu);
    // a soft pad, and under everything a low drone that swells with each bar
    if(s === 0) ch.forEach((n, i)=> tone(mtof(n), spb*15, "sine", 0.022, at + i*0.01, Bu));
    if(s === 0){ swell(mtof(SONG.bass[bar] - 12), spb*17, "sawtooth", 0.05, at, Bu); swell(mtof(SONG.bass[bar] - 12)*1.006, spb*17, "sawtooth", 0.035, at, Bu, true); }
    // plucks
    if(s % 2 === 0) tone(mtof(ch[(s/2) % 3] + 12), 0.18, "triangle", A.mode === "menu" ? 0.03 : 0.02, at, Bu);
    // drums once there's a fight
    if(A.mode === "fight" || A.mode === "boss"){
      if(s % 8 === 0) tone(60, 0.18, "sine", 0.45, at, Bu, 35);
      if(s % 8 === 4) burst(0.12, "bandpass", 1800, 0.18, 1, at, Bu);
      if(s % 2 === 1) burst(0.03, "highpass", 7000, 0.05, 1, at, Bu);
      if(A.mode === "boss" && s % 4 === 2) tone(55, 0.12, "sine", 0.3, at, Bu, 35);
    }
    // the tune
    const n = SONG.lead[bar][s];
    if(n > 0 && (A.mode === "menu" || A.mode === "boss" || Math.floor(A.step/64) % 2 === 1)) tone(mtof(n), spb*3, "triangle", 0.03, at, Bu, 0, true);
    A.next += spb; A.step++;
  }
};

})();
