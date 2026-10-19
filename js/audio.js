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
const MUSIC_GAIN = 0.45;

/* ---- the graph ---- */
A.start = function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(A.ctx){ if(A.ctx.state === "suspended") A.ctx.resume(); return; }
  if(!AC) return;
  try{ A.muted = localStorage.getItem("dungeonofguns.muted") === "1"; A.musicOn = localStorage.getItem("dungeonofguns.music") !== "0"; }catch(e){}
  let c; try{ c = new AC(); }catch(e){ return; }
  A.init(c);
  A.timer = setInterval(A.tick, 50);
};
/* builds everything on a context; tests hand it an OfflineAudioContext */
A.init = function(c, offline){
  A.ctx = c; A.offline = !!offline; LIVE.clear();
  for(const k in last) delete last[k]; for(const k in voices) delete voices[k];
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.006; comp.release.value = 0.25;
  const lim = c.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.12;
  comp.connect(lim); lim.connect(c.destination);
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.8; A.master.connect(comp);
  A.sfx = c.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
  A.musicLP = c.createBiquadFilter(); A.musicLP.type = "lowpass"; A.musicLP.frequency.value = 3600; A.musicLP.connect(A.master);
  A.music = c.createGain(); A.music.gain.value = A.musicOn === false ? 0 : MUSIC_GAIN; A.music.connect(A.musicLP);
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
/* the score alone, for those who'd rather hear the dungeon */
A.toggleMusic = function(){
  A.musicOn = A.musicOn === false;
  try{ localStorage.setItem("dungeonofguns.music", A.musicOn ? "1" : "0"); }catch(e){}
  if(A.music) A.music.gain.setTargetAtTime(A.musicOn ? MUSIC_GAIN : 0, A.ctx.currentTime, 0.3);
  return A.musicOn;
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

function playSafe(name, o){
  const c = A.ctx;
  if(!c || A.muted || typeof name !== "string") return;
  let fn = SND[name];
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
A.has = name=> !!SND[name];

/* ================================================================== *
 *  Bodies and footfalls (hooks the view calls as things move)
 * ================================================================== */
lim("step", { min:0.12, cap:3, wet:0.16, jit:0.07 });
SND.step = o=>{
  const h = !!o.heavy;
  noise(h ? 0.16 : 0.11, "lowpass", h ? 420 : 620, h ? 0.2 : 0.18, { q:0.9, v:false });
  thump(h ? 105 : 130, 50, 0.09, h ? 0.14 : 0.1, { v:false });
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
const MOAN_TRIM = { ghost:0.4, shroom:5, boss:0.8 }, DIE_TRIM = { haunt:0.45, shroom:2.5, goblin:1.5 };
SND.moan = o=>{
  P.vol = MOAN_TRIM[o.kind] || 1;
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
  P.vol = DIE_TRIM[o.family] || 1;
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

/* a choir chord in the effects: formant voices, a little detuned against each other */
function choir(notes, dur, vol, o){
  o = o || NO;
  notes.forEach((m, i)=>{
    const at = (o.at || 0) + (o.stag || 0)*i, att = o.att || dur*0.4;
    voice(mtof(m), dur, vol, o.vowel || "a", { at, att, morph:o.morph, det:rnd(-8, 8), pc:o.pc, e:o.e, rasp:o.rasp });
    if(o.thick) voice(mtof(m), dur, vol*0.6, o.vowel || "a", { at:at + 0.03, att, morph:o.morph, det:(Math.random() < 0.5 ? -1 : 1)*rnd(10, 18), pc:o.pc });
  });
}
const ELNOTE = [69, 72, 74, 76, 81, 84];

/* ================================================================== *
 *  The interface
 * ================================================================== */
lim("click", { min:0.03, cap:2, wet:0.1, jit:0.03 });
SND.click = ()=>{ noise(0.04, "bandpass", 1700, 0.07, { q:2, v:false }); osc("sine", 210, 0.07, 0.035, { v:false }); };
lim("select", { min:0.05, cap:2, wet:0.45, jit:0.02 });
SND.select = ()=>{ thump(150, 70, 0.1, 0.14, { v:false }); chime(mtof(69), 1, 0.026); };
lim("error", { min:0.15, cap:1, wet:0.3, jit:0.03 });
SND.error = ()=>{
  osc("sawtooth", mtof(38), 0.3, 0.06, { lp:420 }); osc("sawtooth", mtof(39), 0.3, 0.05, { lp:420 });
  noise(0.12, "lowpass", 300, 0.16, { buf:"b" });
};

/* ================================================================== *
 *  Guns: a deep thump, a crack, a stone-room tail, and the element on top
 * ================================================================== */
function elementTail(el, k){
  if(el === "fire"){ noise(0.3, "bandpass", 900, 0.1*k, { buf:"c", q:0.9, at:0.01, to:350, att:0.02 }); noise(0.22, "lowpass", 600, 0.06*k, { at:0.01, att:0.04 }); }
  else if(el === "frost"){ chime(rnd(1700, 2300), 0.5, 0.016*k, { at:0.015 }); noise(0.12, "highpass", 5000, 0.04*k, { buf:"c", at:0.01 }); }
  else if(el === "poison") noise(0.3, "bandpass", 520, 0.12*k, { q:4, to:200, at:0.01, buf:"c" });
  else if(el === "shock"){ noise(0.12, "highpass", 3400, 0.09*k, { buf:"c", at:0.004 }); osc("sawtooth", 58, 0.14, 0.03*k, { lp:900, at:0.004 }); }
  else { const f = rnd(290, 330); osc("sine", f, 0.45, 0.022*k, { at:0.01, att:0.02 }); osc("sine", f*1.06, 0.45, 0.016*k, { at:0.01, att:0.02 }); }
}
lim("shoot_pistol", { min:0.04, cap:4, wet:0.5, jit:0.05 });
SND.shoot_pistol = o=>{
  thump(170, 48, 0.17, 0.42, { v:false });
  noise(0.05, "bandpass", 2000, 0.28, { q:0.8 });
  noise(0.26, "lowpass", 1200, 0.2, { to:280 });
  noise(0.12, "bandpass", 3000, 0.05, { buf:"c", at:0.01 });
  elementTail(o.el, 1);
};
lim("shoot_smg", { min:0.05, cap:4, wet:0.32, jit:0.07 });
SND.shoot_smg = o=>{
  thump(150, 60, 0.1, 0.26, { v:false });
  noise(0.035, "bandpass", 2400, 0.18, { q:0.8 });
  noise(0.14, "lowpass", 900, 0.12, { to:300 });
  if(Math.random() < 0.35) elementTail(o.el, 0.6);
};
lim("shoot_shotgun", { min:0.08, cap:3, wet:0.6, jit:0.04 });
SND.shoot_shotgun = o=>{
  thump(120, 34, 0.42, 0.7, { v:false });
  noise(0.07, "bandpass", 1200, 0.3, { q:0.6 });
  noise(0.5, "lowpass", 2400, 0.45, { to:200, q:0.7, e:true });
  noise(0.32, "bandpass", 1600, 0.12, { buf:"c", q:0.7, at:0.005 });
  elementTail(o.el, 1.3);
};
lim("shoot_rifle", { min:0.08, cap:3, wet:0.7, jit:0.04 });
SND.shoot_rifle = o=>{
  noise(0.04, "highpass", 2200, 0.32);
  thump(190, 44, 0.26, 0.5, { v:false });
  noise(0.7, "lowpass", 1600, 0.2, { to:180, e:true });
  metal(rnd(520, 580), 0.14, 0.018, { at:0.2, v:false });   // the bolt
  elementTail(o.el, 1.2);
};
lim("shoot_launcher", { min:0.1, cap:3, wet:0.55, jit:0.04 });
SND.shoot_launcher = o=>{
  thump(95, 36, 0.42, 0.6, { v:false });
  noise(0.36, "bandpass", 420, 0.3, { q:1.4, to:200 });
  metal(150, 0.5, 0.03);
  breath(0.42, 0.07, { f:700, to:1500, att:0.02 });
  elementTail(o.el, 1);
};

/* ---- spells ---- */
lim("spell_missiles spell_fireball spell_nova spell_plague spell_chain", { min:0.1, cap:2, wet:0.75, jit:0.03 });
SND.spell_missiles = ()=>{
  for(let i=0;i<5;i++) breath(0.32, 0.05, { f:600, to:2400, at:i*0.05, att:0.05, q:2 });
  osc("sine", mtof(62), 1.2, 0.03, { att:0.03 }); osc("sine", mtof(63), 1.2, 0.022, { att:0.05 });
  voice(mtof(38), 1, 0.04, "o", { att:0.05, rasp:0.2 });
};
SND.spell_fireball = ()=>{
  noise(0.9, "lowpass", 300, 0.42, { att:0.06, to:1600, glide:0.3 });
  noise(1.1, "bandpass", 1200, 0.12, { buf:"c", att:0.1 });
  thump(90, 38, 0.45, 0.4, { v:false });
};
SND.spell_nova = ()=>{
  noise(0.6, "highpass", 2500, 0.22, { to:7000 });
  for(let i=0;i<6;i++) clink(rnd(2500, 5200), 0.022, Math.random()*0.25);
  bell(mtof(74), 2.4, 0.035, { n:6, str:1 });
  thump(140, 50, 0.3, 0.3, { v:false });
};
SND.spell_plague = ()=>{
  noise(1.3, "bandpass", 350, 0.28, { q:3, to:700, att:0.2 });
  noise(1.2, "bandpass", 520, 0.14, { buf:"c", q:5 });
  voice(mtof(38), 1.4, 0.05, "u", { att:0.4, rasp:0.5 });
};
SND.spell_chain = ()=>{
  for(let i=0;i<5;i++) noise(0.08, "highpass", 3000, 0.22, { buf:"c", at:i*0.045 });
  noise(1.3, "lowpass", 300, 0.34, { buf:"b", at:0.05, att:0.05, e:true });
  osc("sawtooth", 55, 0.32, 0.06, { lp:1200 });
};

/* ================================================================== *
 *  Blows, wounds and deaths
 * ================================================================== */
lim("hit", { min:0.035, cap:5, wet:0.25, jit:0.1 });
SND.hit = ()=>{
  thump(rnd(150, 190), 60, 0.09, 0.3, { v:false });
  noise(0.08, "lowpass", 1100, 0.24, { to:400 });
  noise(0.05, "bandpass", 500, 0.12, { q:2, buf:"c" });
};
lim("crit", { min:0.05, cap:3, wet:0.45, jit:0.06 });
SND.crit = ()=>{
  thump(130, 45, 0.15, 0.5, { v:false });
  noise(0.13, "lowpass", 1800, 0.32, { to:300 });
  metal(rnd(420, 520), 0.5, 0.04);
  noise(0.1, "bandpass", 2200, 0.12, { buf:"c", q:1 });
};
lim("bounce", { min:0.06, cap:2, wet:0.4, jit:0.12 });
SND.bounce = ()=>{
  const f = rnd(1400, 1900);
  osc("sine", f, 0.2, 0.025, { to:f*0.85 });
  noise(0.04, "bandpass", 2500, 0.07, { q:2 });
  noise(0.06, "lowpass", 800, 0.09);
};
lim("kill", { min:0.04, cap:4, wet:0.45, jit:0.08 });
SND.kill = ()=>{
  thump(100, 38, 0.3, 0.42, { v:false });
  noise(0.32, "lowpass", 700, 0.28, { to:120, q:1.5 });
  noise(0.12, "bandpass", 1800, 0.12, { buf:"c", q:1, at:0.02 });
  thump(80, 40, 0.16, 0.2, { at:0.22, v:false });          // and the body hits the floor
  noise(0.16, "lowpass", 400, 0.2, { at:0.22, buf:"b" });
};
lim("bossdie", { min:0.5, cap:1, wet:0.9, jit:0, pri:true });
SND.bossdie = ()=>{
  bell(mtof(38), 9, 0.22, { e:true });
  thump(70, 25, 1.6, 0.8, { v:false });
  noise(4, "lowpass", 200, 0.5, { buf:"b", att:0.05 });
  noise(2.5, "bandpass", 900, 0.12, { buf:"c", att:0.1 });
  choir([38, 45, 50, 53], 5, 0.03, { at:0.6, att:1.5, vowel:"o", morph:"u", pc:[[1, 0.94]] });
};
lim("hurt", { min:0.12, cap:2, wet:0.4, jit:0.06, pri:true });
SND.hurt = ()=>{
  voice(rnd(105, 130), 0.34, 0.16, "uh", { att:0.01, pc:[[0.2, 1.1], [1, 0.75]], rasp:0.5 });
  thump(120, 45, 0.2, 0.5, { v:false });
  noise(0.16, "lowpass", 900, 0.3, { to:250 });
};
lim("death", { min:1, cap:1, wet:1, jit:0, pri:true });
SND.death = ()=>{
  bell(mtof(38), 10, 0.24, { e:true });
  bell(mtof(50), 6, 0.06, { at:0.02 });
  thump(60, 22, 2, 0.9, { v:false });
  noise(3, "lowpass", 180, 0.45, { buf:"b", att:0.02 });
  choir([38, 45, 50, 53], 5.5, 0.03, { at:0.5, att:2, vowel:"u", morph:"o", pc:[[1, 0.96]], thick:true });
};
lim("graze", { min:0.1, cap:2, wet:0.2, jit:0.1 });
SND.graze = ()=>{ noise(0.15, "bandpass", 2200, 0.08, { att:0.03, to:900, q:2 }); };

/* ================================================================== *
 *  Zippy
 * ================================================================== */
lim("heal", { min:0.3, cap:2, wet:0.8, jit:0.02 });
SND.heal = ()=>{
  chime(mtof(69), 1.6, 0.04); chime(mtof(76), 1.6, 0.03, { at:0.08 });
  choir([57, 64], 1.5, 0.03, { att:0.4, morph:"o" });
  breath(0.8, 0.035, { f:1500, att:0.3 });
};
lim("blink", { min:0.1, cap:2, wet:0.5, jit:0.06 });
SND.blink = ()=>{
  breath(0.34, 0.14, { f:500, to:3000, att:0.26, glide:0.3, q:1 });
  osc("sine", 300, 0.4, 0.07, { to:80 });
  noise(0.12, "bandpass", 1600, 0.06, { buf:"c", at:0.26 });
};
lim("reload", { min:0.1, cap:2, wet:0.3, jit:0.05 });
SND.reload = ()=>{ metal(rnd(700, 800), 0.12, 0.035); noise(0.06, "bandpass", 2000, 0.1, { q:3 }); noise(0.1, "bandpass", 900, 0.06, { buf:"c", at:0.05 }); };
lim("reloaded", { min:0.1, cap:2, wet:0.35, jit:0.04 });
SND.reloaded = ()=>{
  noise(0.1, "bandpass", 1500, 0.11, { q:2, to:2500 });
  metal(rnd(500, 560), 0.22, 0.045, { at:0.08 });
  thump(200, 80, 0.06, 0.05, { at:0.08, v:false });
};
lim("swap", { min:0.08, cap:2, wet:0.3, jit:0.05 });
SND.swap = ()=>{ noise(0.18, "bandpass", 900, 0.1, { att:0.05, to:1800, q:1 }); metal(rnd(420, 480), 0.2, 0.028, { at:0.12 }); };

/* ================================================================== *
 *  Doors, rooms, puzzles, the descent
 * ================================================================== */
lim("doorShut", { min:0.3, cap:1, wet:0.8, jit:0.03, pri:true });
SND.doorShut = ()=>{
  grind(0.55, 0.3, { f:260 });
  chains(7, 0.5, 0.025);
  thump(85, 30, 0.6, 0.8, { at:0.5, v:false });
  noise(0.6, "lowpass", 500, 0.45, { at:0.5, to:90, e:true });
  metal(110, 1.2, 0.06, { at:0.52, e:true });
};
lim("doorOpen", { min:0.3, cap:1, wet:0.8, jit:0.03, pri:true });
SND.doorOpen = ()=>{
  grind(1, 0.22, { f:300 });
  chains(10, 0.8, 0.022, 0.05);
  metal(130, 1, 0.045, { at:0.95 });
  thump(70, 35, 0.4, 0.4, { at:0.95, v:false });
};
lim("clear", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.clear = ()=>{ bell(mtof(50), 6, 0.08, { e:true }); choir([50, 57], 3, 0.022, { at:0.2, att:1, vowel:"a", morph:"o" }); };
lim("descend", { min:1, cap:1, wet:1, jit:0, pri:true });
SND.descend = ()=>{
  thump(55, 25, 2.5, 0.6, { v:false });
  noise(3.5, "lowpass", 180, 0.4, { buf:"b", att:0.4 });
  bell(mtof(43), 8, 0.1, { at:0.6, e:true });
  bell(mtof(38), 9, 0.08, { at:2.2, e:true });
  choir([50, 53, 57], 5, 0.025, { att:1.5, vowel:"u", morph:"o", pc:[[1, 0.89]] });
};
lim("portal", { min:0.5, cap:1, wet:1, jit:0.02 });
SND.portal = ()=>{
  noise(3, "bandpass", 300, 0.22, { q:3, to:1200, att:1, glide:2.5 });
  osc("sawtooth", 55, 3.5, 0.05, { lp:400, att:1 }); osc("sawtooth", 55.6, 3.5, 0.04, { lp:400, att:1.2 });
  choir([50, 57, 62, 63], 3.5, 0.02, { att:1.4, vowel:"o", morph:"a", pc:[[1, 1.06]] });
  whisper(2.5, 0.025, { at:0.5 });
};
lim("secret", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.secret = ()=>{
  grind(1.2, 0.16);
  choir([50, 57, 62, 65], 3.2, 0.025, { att:0.8 });
  chime(mtof(74), 2.5, 0.035, { at:0.6 }); chime(mtof(81), 2.5, 0.025, { at:0.9 });
};
lim("solved", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.solved = ()=>{
  metal(160, 0.8, 0.045); thump(90, 40, 0.3, 0.4, { v:false });
  bell(mtof(55), 5, 0.08, { at:0.25, e:true });
  choir([55, 62, 67], 2.5, 0.022, { at:0.3, att:0.8 });
};
lim("brazier", { min:0.1, cap:2, wet:0.6, jit:0.05 });
SND.brazier = ()=>{ noise(0.5, "lowpass", 250, 0.33, { to:1500, glide:0.15, att:0.03 }); noise(1.2, "bandpass", 1500, 0.1, { buf:"c", att:0.1, at:0.05 }); };
lim("stone", { min:0.15, cap:2, wet:0.6, jit:0.05 });
SND.stone = ()=>{ grind(0.6, 0.32, { f:220 }); thump(80, 35, 0.3, 0.4, { at:0.55, v:false }); };
lim("push", { min:0.15, cap:2, wet:0.5, jit:0.05 });
SND.push = ()=>{ grind(0.38, 0.28, { f:260 }); };
lim("reset", { min:0.3, cap:1, wet:0.6, jit:0.03 });
SND.reset = ()=>{ grind(0.8, 0.22, { f:200 }); osc("sine", 110, 1.2, 0.055, { to:70, att:0.1 }); };
/* the singing fungi: pitches stay true, so the tune can be learnt */
const SING = [62, 65, 67, 69, 72, 74];
const singNote = o=> SING[(o.n !== undefined ? o.n : o.i) | 0] || SING[0];
lim("note", { min:0.08, cap:3, wet:0.8, jit:0, fixed:true });
SND.note = o=>{ const f = mtof(singNote(o)); voice(f, 1.3, 0.09, "a", { att:0.08, morph:"o", rasp:0.05 }); voice(f/2, 1.3, 0.04, "o", { att:0.1 }); };
lim("wrongnote", { min:0.08, cap:2, wet:0.6, jit:0, fixed:true });
SND.wrongnote = o=>{
  const f = mtof(singNote(o));
  voice(f, 0.9, 0.07, "uh", { att:0.05, pc:[[1, 0.92]], rasp:0.2 }); voice(f*1.06, 0.9, 0.06, "uh", { att:0.05, pc:[[1, 0.9]] });
  thump(90, 40, 0.25, 0.25, { v:false });
};

/* ================================================================== *
 *  What enemies do
 * ================================================================== */
lim("tell", { min:0.08, cap:2, wet:0.3, jit:0.1 });
SND.tell = ()=>{ noise(0.24, "bandpass", 1200, 0.06, { att:0.13, q:3, to:2200 }); };
lim("tellBig", { min:0.15, cap:2, wet:0.6, jit:0.05 });
SND.tellBig = ()=>{
  osc("sawtooth", 55, 0.85, 0.08, { lp:500, att:0.4, to:82 });
  voice(rnd(70, 85), 0.85, 0.07, "o", { att:0.3, rasp:0.6, pc:[[1, 1.2]] });
  noise(0.85, "lowpass", 250, 0.2, { buf:"b", att:0.5 });
};
lim("sling", { min:0.06, cap:3, wet:0.3, jit:0.1 });
SND.sling = ()=>{ noise(0.2, "bandpass", 700, 0.12, { q:2, att:0.04, to:1600 }); };
lim("hex", { min:0.08, cap:2, wet:0.6, jit:0.06 });
SND.hex = ()=>{
  const f = rnd(140, 160);
  osc("sawtooth", f, 0.5, 0.035, { lp:900, att:0.05, pc:[[1, 0.7]] }); osc("sawtooth", f*1.06, 0.5, 0.03, { lp:900, att:0.05, pc:[[1, 0.72]] });
  whisper(0.4, 0.018);
};
lim("ering", { min:0.08, cap:2, wet:0.5, jit:0.06 });
SND.ering = ()=>{ noise(0.42, "bandpass", 400, 0.17, { q:2, to:1400, att:0.08 }); osc("sine", 90, 0.42, 0.13, { to:140, att:0.05 }); };
lim("arrow", { min:0.06, cap:3, wet:0.3, jit:0.08 });
SND.arrow = ()=>{ const f = rnd(180, 220); osc("triangle", f, 0.15, 0.06, { to:f*0.75, att:0.002 }); noise(0.15, "bandpass", 2500, 0.07, { q:1.5, to:1200 }); };
lim("steam", { min:0.06, cap:3, wet:0.4, jit:0.06 });
SND.steam = ()=>{ noise(0.65, "highpass", 3000, 0.1, { att:0.02, to:1500 }); noise(0.42, "lowpass", 400, 0.15, { buf:"b" }); };
lim("throw", { min:0.06, cap:3, wet:0.3, jit:0.08 });
SND.throw = ()=>{ noise(0.32, "bandpass", 500, 0.13, { att:0.08, to:1200, q:1.4 }); };
lim("boom", { min:0.06, cap:3, wet:0.7, jit:0.05 });
SND.boom = ()=>{
  thump(70, 25, 1, 0.85, { v:false });
  noise(1.4, "lowpass", 1200, 0.55, { to:80, e:true });
  noise(1.6, "bandpass", 1400, 0.11, { buf:"c", at:0.05, att:0.05 });
  noise(2.5, "lowpass", 150, 0.32, { buf:"b", att:0.1 });
};
lim("zap", { min:0.05, cap:3, wet:0.4, jit:0.1 });
SND.zap = ()=>{ noise(0.13, "highpass", 3200, 0.17, { buf:"c" }); osc("sawtooth", 50, 0.2, 0.055, { lp:1500, to:40 }); noise(0.05, "bandpass", 5000, 0.08); };
lim("spit", { min:0.06, cap:3, wet:0.3, jit:0.1 });
SND.spit = ()=>{ noise(0.2, "bandpass", 900, 0.14, { q:2, to:400, buf:"c" }); thump(160, 90, 0.08, 0.06); };
lim("inhale", { min:0.3, cap:1, wet:0.7, jit:0.04 });
SND.inhale = SND.heartbeat = ()=>{
  noise(1.05, "bandpass", 400, 0.24, { att:0.85, to:1600, glide:1, q:2 });
  voice(rnd(60, 70), 1, 0.05, "u", { att:0.8, rasp:0.8 });
};
lim("laserTell", { min:0.2, cap:2, wet:0.5, jit:0.04 });
SND.laserTell = ()=>{
  osc("sawtooth", 80, 0.95, 0.055, { lp:700, att:0.5, to:160 });
  osc("sine", 160, 0.95, 0.045, { att:0.5, to:320 });
  noise(0.95, "highpass", 4000, 0.025, { att:0.6 });
};
lim("beat", { min:0.2, cap:2, wet:0.4, jit:0.02 });
SND.beat = ()=>{
  thump(60, 30, 0.32, 0.7, { v:false }); noise(0.2, "lowpass", 200, 0.38, { buf:"b" });
  thump(52, 28, 0.36, 0.55, { at:0.2, v:false }); noise(0.2, "lowpass", 180, 0.3, { buf:"b", at:0.2 });
};
lim("ghost", { min:0.2, cap:2, wet:0.85, jit:0.06 });
SND.ghost = ()=>{
  voice(rnd(200, 260), 1.6, 0.06, "u", { att:0.4, pc:[[1, 0.75]], morph:"o", rasp:0.15 });
  breath(1, 0.07, { f:2500, to:600, att:0.2 });
  whisper(1, 0.02, { at:0.2 });
};
lim("ghostShot", { min:0.06, cap:3, wet:0.6, jit:0.08 });
SND.ghostShot = ()=>{ breath(0.4, 0.07, { f:1600, to:500, att:0.06, q:2 }); voice(rnd(400, 480), 0.4, 0.02, "u", { att:0.1, pc:[[1, 0.8]] }); };
lim("bones", { min:0.08, cap:2, wet:0.45, jit:0.08 });
SND.bones = ()=>{
  for(let i=0;i<7;i++) noise(0.035, "bandpass", rnd(1100, 2800), 0.13, { q:6, at:Math.random()*0.38 });
  thump(220, 120, 0.06, 0.06, { v:false });
};
lim("bark", { min:0.4, cap:1, wet:0.35, jit:0.08 });
SND.bark = ()=>{
  let t = 0; const n = 2 + Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){ const d = rnd(0.1, 0.18); voice(rnd(110, 170), d, 0.07, pick(["a", "uh", "o", "e"]), { at:t, rasp:0.6, pc:[[1, rnd(0.75, 1.2)]], att:0.01 }); t += d*0.85; }
};
lim("gremlin", { min:0.3, cap:1, wet:0.5, jit:0.05 });
SND.gremlin = ()=>{
  for(let i=0;i<4;i++) voice(rnd(240, 300)*(1 - i*0.08), 0.11, 0.05, "a", { at:i*0.11, rasp:0.7, att:0.005, pc:[[1, 0.85]] });
  whisper(0.6, 0.02);
};

/* ================================================================== *
 *  Elements, statuses, gore
 * ================================================================== */
lim("react", { min:0.08, cap:3, wet:0.6, jit:0.06 });
SND.react = ()=>{
  thump(110, 40, 0.3, 0.42, { v:false });
  noise(0.36, "bandpass", 1800, 0.14, { buf:"c", to:600 });
  bell(mtof(60 + Math.floor(rnd(0, 6))), 1.6, 0.03, { n:5, str:2 });
};
lim("nova", { min:0.1, cap:2, wet:0.6, jit:0.05 });
SND.nova = ()=>{
  noise(0.6, "highpass", 2000, 0.18, { to:6000 });
  for(let i=0;i<4;i++) clink(rnd(2500, 5000), 0.02, Math.random()*0.2);
  thump(120, 40, 0.3, 0.3, { v:false });
};
lim("freeze", { min:0.06, cap:3, wet:0.5, jit:0.08 });
SND.freeze = ()=>{ noise(0.3, "highpass", 4000, 0.11, { buf:"c" }); osc("sine", rnd(90, 110), 0.5, 0.05, { to:60 }); chime(rnd(2400, 3000), 0.5, 0.01); };
lim("cloud", { min:0.15, cap:2, wet:0.5, jit:0.06 });
SND.cloud = ()=>{ noise(0.8, "bandpass", 400, 0.17, { q:2.5, att:0.15, to:250 }); noise(0.6, "bandpass", 600, 0.08, { buf:"c", q:4, att:0.1 }); };
lim("shatter", { min:0.06, cap:3, wet:0.55, jit:0.08 });
SND.shatter = ()=>{
  noise(0.26, "highpass", 3500, 0.22, { buf:"c" });
  for(let i=0;i<6;i++) clink(rnd(2500, 6000), 0.025, Math.random()*0.15);
  thump(200, 80, 0.08, 0.15, { v:false });
};
lim("splat", { min:0.05, cap:3, wet:0.35, jit:0.1 });
SND.splat = ()=>{
  noise(0.26, "lowpass", 700, 0.33, { to:120, q:2 });
  noise(0.15, "bandpass", 400, 0.12, { buf:"c", q:2 });
  thump(90, 40, 0.15, 0.25, { v:false });
};
lim("splash", { min:0.1, cap:2, wet:0.6, jit:0.06 });
SND.splash = ()=>{
  noise(0.6, "lowpass", 1600, 0.28, { to:250, att:0.01 });
  noise(0.8, "bandpass", 2500, 0.06, { buf:"c", at:0.1, att:0.05 });
  thump(120, 60, 0.2, 0.2, { v:false });
};
/* a pot, an urn, a crate, an egg sac: a crack, shards, a dull drop */
lim("break", { min:0.05, cap:3, wet:0.45, jit:0.08 });
SND["break"] = ()=>{
  noise(0.05, "bandpass", 1800, 0.28, { q:1 });
  for(let i=0;i<5;i++) noise(0.04, "bandpass", rnd(1500, 3500), 0.09, { q:4, at:0.03 + Math.random()*0.25 });
  noise(0.3, "lowpass", 900, 0.24, { to:200 });
  thump(120, 50, 0.15, 0.24, { v:false });
};
lim("puff", { min:0.06, cap:3, wet:0.35, jit:0.1 });
SND.puff = ()=>{ noise(0.36, "bandpass", 500, 0.14, { q:1.5, to:250, att:0.03 }); };
lim("poof", { min:0.06, cap:3, wet:0.45, jit:0.08 });
SND.poof = ()=>{ noise(0.45, "lowpass", 900, 0.24, { to:150, att:0.01 }); breath(0.4, 0.055, { f:1200, to:400, att:0.02 }); };
lim("byproduct", { min:0.12, cap:2, wet:0.3, jit:0.15 });
SND.byproduct = ()=>{ noise(0.05, "bandpass", rnd(1500, 2500), 0.25, { q:2 }); noise(0.12, "bandpass", 1800, 0.3, { buf:"c", q:1 }); };
lim("bubble", { min:0.08, cap:2, wet:0.4, jit:0.1 });
SND.bubble = ()=>{ noise(0.36, "bandpass", 450, 0.15, { buf:"c", q:6, to:250 }); osc("sine", 180, 0.26, 0.055, { to:90 }); };
lim("stick", { min:0.06, cap:3, wet:0.3, jit:0.1 });
SND.stick = ()=>{ thump(160, 70, 0.11, 0.24, { v:false }); noise(0.12, "bandpass", 700, 0.12, { q:2, buf:"c" }); };
/* confusion: the world swims and the ears ring */
lim("squeak", { min:0.25, cap:2, wet:0.6, jit:0.05 });
SND.squeak = ()=>{
  const f = rnd(600, 700), w = [[0.25, 1.05], [0.5, 0.97], [0.75, 1.04], [1, 0.95]];
  osc("sine", f, 1.2, 0.025, { pc:w, att:0.1 }); osc("sine", f*1.012, 1.2, 0.02, { pc:w, att:0.15 });
  osc("sine", rnd(3000, 3300), 1, 0.005, { att:0.2 });
};
lim("hiccup", { min:0.15, cap:2, wet:0.35, jit:0.08 });
SND.hiccup = ()=>{ voice(rnd(140, 170), 0.1, 0.1, "uh", { att:0.003, rasp:0.6, pc:[[1, 1.3]] }); noise(0.04, "bandpass", 1200, 0.06); };
lim("illusion", { min:0.2, cap:2, wet:0.85, jit:0.04 });
SND.illusion = ()=>{
  breath(0.8, 0.08, { f:3000, to:800, att:0.5, q:1 });
  chime(mtof(81), 1.5, 0.022); chime(mtof(82), 1.5, 0.018, { at:0.05 });
  whisper(0.9, 0.022, { at:0.1 });
};
lim("mirror", { min:0.2, cap:2, wet:0.85, jit:0.03 });
SND.mirror = ()=>{
  osc("sine", mtof(86), 2, 0.025, { att:0.01 }); osc("sine", mtof(86)*1.007, 2, 0.02, { att:0.01 });
  breath(0.5, 0.045, { f:2500, to:5000, att:0.3 });
};
lim("ward", { min:0.15, cap:2, wet:0.7, jit:0.03 });
SND.ward = ()=>{ noise(0.2, "highpass", 2500, 0.14, { buf:"c" }); bell(mtof(62), 2.5, 0.045, { n:6, str:1 }); };

/* ================================================================== *
 *  Loot: soft chimes and a breath, never a blip
 * ================================================================== */
lim("lootDrop", { min:0.1, cap:2, wet:0.8, jit:0 });
SND.lootDrop = o=>{
  const r = clamp((o.rarity | 0), 0, 5), f = mtof(ELNOTE[r]);
  chime(f, 1.8, 0.035); chime(f*1.5, 1.8, 0.022, { at:0.09 });
  breath(0.6, 0.03, { f:2000, att:0.25 });
  if(r >= 3) bell(mtof(50), 4, 0.04 + r*0.006, { at:0.05, e:true });
};
lim("coin", { min:0.04, cap:4, wet:0.3, jit:0.05 });
SND.coin = ()=>{ clink(rnd(2200, 2800), 0.028, 0); clink(rnd(2600, 3400), 0.018, rnd(0.03, 0.06)); };
lim("pickup", { min:0.05, cap:3, wet:0.6, jit:0.01 });
SND.pickup = ()=>{ chime(mtof(pick([76, 81])), 1.2, 0.032); breath(0.36, 0.028, { f:1800, att:0.15, q:1 }); };
lim("pickupBig", { min:0.1, cap:2, wet:0.8, jit:0 });
SND.pickupBig = ()=>{
  chime(mtof(69), 2, 0.042); chime(mtof(76), 2, 0.032, { at:0.1 });
  breath(0.6, 0.035, { f:1500, att:0.3 });
  osc("sine", mtof(45), 1.6, 0.045, { att:0.2 });
};
lim("pickupLegend", { min:0.3, cap:1, wet:1, jit:0, pri:true });
SND.pickupLegend = ()=>{
  bell(mtof(57), 5, 0.08, { e:true });
  choir([57, 64, 69, 72], 3, 0.025, { att:0.6, thick:true });
  breath(1.2, 0.045, { f:1800, att:0.6 });
};
lim("chest", { min:0.2, cap:2, wet:0.6, jit:0.03 });
SND.chest = ()=>{
  creak(0.5, 0.06, rnd(30, 40), 900, { pc:[[1, 1.4]] });
  metal(rnd(260, 300), 0.3, 0.035);
  thump(110, 50, 0.15, 0.25, { v:false });
  chime(mtof(74), 1.8, 0.032, { at:0.35 }); chime(mtof(81), 1.8, 0.022, { at:0.45 });
};
lim("buy", { min:0.15, cap:2, wet:0.45, jit:0.02 });
SND.buy = ()=>{
  for(let i=0;i<4;i++) clink(rnd(2000, 3200), 0.022, i*0.05 + Math.random()*0.02);
  noise(0.08, "lowpass", 600, 0.1, { at:0.2 });
  osc("sine", mtof(57), 0.8, 0.035, { at:0.1 });
};
lim("jackpot", { min:0.3, cap:1, wet:0.7, jit:0.02 });
SND.jackpot = ()=>{ for(let i=0;i<14;i++) clink(rnd(1800, 3400), 0.022*rnd(0.5, 1), Math.random()*0.9); bell(mtof(62), 4, 0.065, { e:true }); };
lim("reroll", { min:0.2, cap:1, wet:0.45, jit:0.04 });
SND.reroll = ()=>{
  for(let i=0;i<6;i++) noise(0.03, "bandpass", rnd(1200, 2400), 0.12, { q:6, at:i*0.05 + Math.random()*0.02 });
  breath(0.4, 0.055, { f:800, to:2000, att:0.2 });
};
lim("dice", { min:0.2, cap:1, wet:0.45, jit:0.04 });
SND.dice = ()=>{
  let t = 0;
  for(let i=0;i<6;i++){ noise(0.035, "bandpass", rnd(1500, 2600), 0.14*(1 - i*0.12), { q:5, at:t }); t += 0.05*(1 + i*0.45); }
  thump(160, 90, 0.08, 0.1, { at:t, v:false });
};
lim("charged", { min:0.2, cap:1, wet:0.8, jit:0 });
SND.charged = ()=>{ chime(mtof(69), 1.5, 0.038); osc("sine", mtof(57), 1.2, 0.028, { att:0.2 }); };
lim("active", { min:0.15, cap:2, wet:0.7, jit:0.03 });
SND.active = ()=>{
  thump(100, 40, 0.3, 0.38, { v:false });
  breath(0.5, 0.09, { f:400, to:2500, att:0.05 });
  choir([45, 52], 1, 0.04, { att:0.05, morph:"o" });
  bell(mtof(69), 2, 0.026, { n:5 });
};
lim("altar", { min:0.4, cap:1, wet:0.9, jit:0.02, pri:true });
SND.altar = ()=>{
  thump(55, 28, 0.8, 0.6, { v:false });
  choir([38, 44, 50, 51], 2.6, 0.032, { att:0.3, vowel:"u", morph:"o", rasp:0.2 });
  metal(140, 1.4, 0.035, { e:true });
  thump(60, 30, 0.3, 0.45, { at:0.6, v:false });
};
lim("fly", { min:0.2, cap:1, wet:0.7, jit:0.03 });
SND.fly = ()=>{
  osc("sawtooth", rnd(180, 220), 0.55, 0.025, { bp:900, q:3, pc:[[0.3, 1.1], [0.6, 0.95], [1, 1.2]], att:0.05 });
  chime(mtof(81), 1.4, 0.03, { at:0.4 });
};

/* ---- ROOMS: a draught through a secret wall, locks, the Red God, the cage, Brother Olm ---- */
lim("draught", { min:2, cap:1, wet:0.9, jit:0.1 });
SND.draught = ()=>{
  // cold air pulled through a crack: a hollow whoosh that swells and dies, and a whisper inside it
  breath(2.2, 0.05, { f:520, to:900, att:0.9, q:2.5 });
  noise(2.0, "bandpass", 1800, 0.018, { att:0.8, q:6, to:1300 });
  whisper(1.4, 0.012, { at:0.4 });
};
lim("chestUnlock", { min:0.3, cap:1, wet:0.6 });
SND.chestUnlock = ()=>{ metal(rnd(900, 1000), 0.25, 0.04); clink(2600, 0.03, 0.12); thump(140, 70, 0.12, 0.2, { at:0.15, v:false }); };
lim("pact", { min:1, cap:1, wet:1, jit:0, pri:true });
SND.pact = ()=>{
  thump(45, 22, 1.6, 0.7, { v:false });
  choir([33, 39, 40, 46], 4, 0.04, { att:0.4, vowel:"u", morph:"a", rasp:0.35 });
  bell(mtof(34), 7, 0.08, { at:0.3, e:true });
  whisper(3, 0.03, { at:0.6 });
};
lim("sprung", { min:1, cap:1, wet:0.9, jit:0, pri:true });
SND.sprung = ()=>{ chains(16, 1.2, 0.03, 0); metal(110, 1.4, 0.05, { at:0.05 }); thump(60, 28, 0.6, 0.6, { at:0.1, v:false }); choir([45, 46], 1.5, 0.03, { at:0.3, vowel:"a", rasp:0.4 }); };
lim("gambleWin", { min:0.3, cap:1, wet:0.8 }); lim("gambleLose", { min:0.3, cap:1, wet:0.8 });
SND.gambleWin = ()=>{ for(let i=0;i<3;i++) thump(rnd(300, 400), 150, 0.06, 0.12, { at:i*0.09, v:false }); for(let i=0;i<10;i++) clink(rnd(1800, 3200), 0.02, 0.3 + Math.random()*0.6); chime(mtof(76), 1.5, 0.03, { at:0.35 }); };
SND.gambleLose = ()=>{ for(let i=0;i<3;i++) thump(rnd(300, 400), 150, 0.06, 0.12, { at:i*0.09, v:false }); osc("sine", 160, 1.2, 0.05, { to:70, at:0.3 }); choir([40, 41], 1.2, 0.02, { at:0.35, vowel:"o", rasp:0.3 }); };
lim("olmTalk", { min:0.4, cap:1, wet:0.5, jit:0.06 });
SND.olmTalk = ()=>{
  // an old man's murmur through a pot helm: low syllables, a hum, the lantern's creak
  const f = rnd(95, 110);
  for(let i=0;i<3 + Math.floor(Math.random()*3);i++) voice(f*rnd(0.9, 1.15), rnd(0.12, 0.22), 0.05, pick(["o", "uh", "u", "a"]), { at:i*0.18, att:0.03, rasp:0.3 });
  metal(rnd(300, 340), 0.3, 0.012, { at:0.1 });
};
lim("blessing", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.blessing = ()=>{ bell(mtof(57), 5, 0.06, { e:true }); choir([57, 64, 69], 2.5, 0.022, { att:0.6, vowel:"a", morph:"o" }); chime(mtof(81), 2, 0.025, { at:0.5 }); };

/* ---- the big moments: a bell, a choir, never a fanfare ---- */
lim("levelup", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.levelup = ()=>{
  bell(mtof(50), 5, 0.07, { e:true });
  choir([50, 57, 62, 65, 69], 2.6, 0.022, { att:0.5, morph:"o", stag:0.04 });
  breath(1, 0.03, { f:2200, att:0.5 });
};
lim("duo", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.duo = ()=>{
  bell(mtof(55), 5, 0.065); bell(mtof(58), 5, 0.055, { at:0.25, e:true });
  choir([43, 55, 58, 62], 2.6, 0.022, { att:0.5, at:0.1 });
};
lim("godly", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.godly = ()=>{
  thump(55, 25, 1.5, 0.5, { v:false });
  bell(mtof(38), 9, 0.12, { e:true }); bell(mtof(50), 7, 0.06, { at:0.4 });
  choir([50, 57, 62, 65, 69, 74], 4, 0.02, { att:1, stag:0.12, thick:true });
  breath(2.5, 0.05, { f:2500, att:1.5 });
};
lim("transform", { min:0.5, cap:1, wet:1, jit:0, pri:true });
SND.transform = ()=>{
  choir([38, 44, 50, 56, 63], 3.5, 0.024, { att:0.8, vowel:"o", morph:"u", rasp:0.2 });
  thump(60, 25, 1, 0.5, { v:false });
  noise(1.4, "bandpass", 400, 0.16, { q:1.5, to:2500, att:0.6 });
  bell(mtof(44), 5, 0.06, { str:3, at:0.8, e:true });
};

/* ---- the grim items: a toll, the Darksign, the axe, the spear ---- */
lim("toll", { min:0.6, cap:1, wet:1, jit:0, pri:true });
SND.toll = (o)=>{
  bell(mtof(o && o.big ? 33 : 38), o && o.big ? 9 : 6, 0.14, { e:true });
  thump(55, 25, 0.8, 0.35, { v:false });
  noise(1.5, "lowpass", 220, 0.2, { buf:"b", att:0.05 });
};
lim("darksign", { min:1, cap:1, wet:1, jit:0, pri:true });
SND.darksign = ()=>{
  thump(48, 20, 1.6, 0.7, { v:false });
  noise(2.2, "bandpass", 300, 0.25, { q:1.2, to:60, att:0.05 });
  choir([38, 41, 45, 50], 3.5, 0.026, { att:0.4, vowel:"u", morph:"o", rasp:0.25, thick:true });
  bell(mtof(38), 7, 0.1, { at:0.5, e:true });
};
lim("darksignLit", { min:1, cap:1, wet:1, jit:0 });
SND.darksignLit = ()=>{ bell(mtof(62), 3, 0.04, { e:true }); breath(1, 0.03, { f:1800, att:0.4 }); };
lim("execute", { min:0.06, cap:3, wet:0.5, jit:0.06 });
SND.execute = ()=>{
  noise(0.12, "bandpass", 2600, 0.16, { q:2, to:600 });
  thump(120, 40, 0.22, 0.4, { at:0.03, v:false });
  metal(rnd(300, 340), 0.25, 0.03, { at:0.02 });
};
lim("spear", { min:0.3, cap:1, wet:0.9, jit:0.02 });
SND.spear = ()=>{
  noise(0.6, "bandpass", 900, 0.18, { q:1.5, to:3500, att:0.03 });
  choir([62, 69, 74], 1.2, 0.02, { att:0.05, vowel:"a" });
  chime(mtof(86), 1.2, 0.03, { at:0.05 });
};

/* ================================================================== *
 *  Traps and pratfalls, made grim
 * ================================================================== */
lim("spikes", { min:0.1, cap:3, wet:0.45, jit:0.06 });
SND.spikes = ()=>{ noise(0.12, "bandpass", 1600, 0.12, { q:1.5, to:700 }); thump(140, 55, 0.12, 0.2, { v:false }); metal(rnd(180, 220), 0.12, 0.01); };   // a dull iron shunk, not a ping
lim("vent", { min:0.15, cap:2, wet:0.4, jit:0.08 });
SND.vent = ()=>{ noise(0.7, "bandpass", 500, 0.16, { q:0.8, to:1400, att:0.05 }); thump(70, 40, 0.3, 0.12, { v:false }); };
lim("dart", { min:0.08, cap:3, wet:0.35, jit:0.08 });
SND.dart = ()=>{ noise(0.1, "bandpass", 2800, 0.08, { q:2, to:1500 }); thump(220, 120, 0.05, 0.08, { at:0.08, v:false }); };
lim("slip", { min:0.3, cap:1, wet:0.45, jit:0.05 });
SND.slip = ()=>{
  noise(0.3, "bandpass", 1500, 0.1, { q:1, to:600, att:0.05 });
  thump(95, 38, 0.3, 0.45, { at:0.32, v:false }); noise(0.25, "lowpass", 500, 0.28, { at:0.32 });
  voice(rnd(110, 130), 0.25, 0.1, "uh", { at:0.3, att:0.01, rasp:0.5, pc:[[1, 0.8]] });
};
lim("fall", { min:0.1, cap:2, wet:0.7, jit:0.06 });
SND.fall = ()=>{
  voice(rnd(140, 170), 1.4, 0.05, "a", { pc:[[1, 0.5]], att:0.02, rasp:0.3 });
  breath(1.2, 0.07, { f:1500, to:300, att:0.1 });
  thump(70, 30, 0.4, 0.2, { at:1.3, v:false }); noise(0.3, "lowpass", 300, 0.12, { at:1.3 });
};
lim("thud", { min:0.06, cap:3, wet:0.5, jit:0.06 });
SND.thud = ()=>{
  thump(65, 28, 0.45, 0.65, { v:false });
  noise(0.35, "lowpass", 350, 0.42, { buf:"b" });
  noise(0.3, "bandpass", 900, 0.08, { buf:"c", at:0.02 });
};
/* a blow to the skull: a crack and a ringing in the ears */
lim("bonk", { min:0.1, cap:2, wet:0.45, jit:0.05 });
SND.bonk = ()=>{
  thump(140, 50, 0.2, 0.5, { v:false });
  noise(0.1, "bandpass", 1600, 0.18, { q:1.5, buf:"c" });
  const f = rnd(2900, 3300); osc("sine", f, 1.6, 0.01, { att:0.05 }); osc("sine", f*1.004, 1.6, 0.008, { att:0.08 });
};

/* ================================================================== *
 *  Gribbus
 * ================================================================== */
lim("croak", { min:0.2, cap:2, wet:0.6, jit:0.05 });
SND.croak = ()=>{
  creak(0.5, 0.16, rnd(28, 34), 420, { q:3, att:0.03, pc:[[1, 0.85]] });
  voice(rnd(75, 85), 0.5, 0.06, "o", { att:0.03, rasp:0.4 });
  thump(90, 45, 0.25, 0.2, { v:false });
};
lim("frog", { min:0.15, cap:2, wet:0.45, jit:0.05 });
SND.frog = ()=>{ creak(0.28, 0.11, 36, 500, { q:3 }); breath(0.3, 0.075, { f:600, to:1400, att:0.05 }); };
lim("lick", { min:0.05, cap:2, wet:0.3, jit:0.08 });
SND.lick = ()=>{
  noise(0.08, "bandpass", 1500, 0.12, { q:1.5, to:600 });
  noise(0.1, "lowpass", 600, 0.12, { at:0.05, buf:"c" });
  thump(180, 90, 0.06, 0.08, { at:0.06, v:false });
};
lim("gulp", { min:0.15, cap:2, wet:0.35, jit:0.05 });
SND.gulp = ()=>{
  osc("sine", 220, 0.3, 0.14, { to:55, glide:0.2, att:0.01 });
  noise(0.15, "bandpass", 500, 0.1, { q:4, buf:"c", at:0.05 });
  voice(90, 0.2, 0.05, "u", { att:0.01 });
};
/* the shove: a wheezing harmonium */
lim("accordion", { min:0.2, cap:2, wet:0.6, jit:0.03 });
SND.accordion = ()=>{
  [50, 51, 57].forEach(m=> osc("sawtooth", mtof(m), 0.7, 0.028, { bp:900, q:1.2, att:0.08, pc:[[1, 0.97]] }));
  breath(0.6, 0.07, { f:700, att:0.1, to:400 });
  thump(90, 40, 0.25, 0.32, { v:false });
};
/* the dance trick: a cursed music box, winding down */
lim("disco", { min:0.5, cap:1, wet:0.8, jit:0 });
SND.disco = ()=>{
  let t = 0;
  [74, 77, 81, 80, 77, 74, 73].forEach((m, i)=>{ chime(mtof(m)*rnd(0.992, 1.008), 1.2, 0.028, { at:t }); t += 0.12 + i*0.03; });
};
/* the whistle: a hollow bone horn, two falling notes */
lim("whistle", { min:0.5, cap:1, wet:1, jit:0 });
SND.whistle = ()=>{
  [[57, 0, 1.1], [52, 0.95, 1.5]].forEach(([m, at, d])=>{
    const f = mtof(m);
    osc("sine", f, d, 0.07, { at, att:0.15, pc:[[0.8, 1], [1, 0.95]], e:true });
    osc("triangle", f*2, d, 0.012, { at, att:0.15 });
    noise(d, "bandpass", f*2, 0.05, { at, q:8, att:0.15 });
  });
};
lim("portalShot", { min:0.05, cap:3, wet:0.5, jit:0.06 });
SND.portalShot = ()=>{ osc("sine", 250, 0.3, 0.045, { to:900, att:0.02 }); breath(0.25, 0.055, { f:600, to:2500, att:0.05 }); };

/* ================================================================== *
 *  Bosses
 * ================================================================== */
lim("boss", { min:1, cap:1, wet:1, jit:0, pri:true });
SND.boss = ()=>{
  bell(mtof(38), 10, 0.15, { e:true });
  thump(45, 22, 2.5, 0.7, { v:false });
  noise(4, "lowpass", 160, 0.42, { buf:"b", att:0.5 });
  choir([38, 45, 50, 51, 57], 5, 0.028, { att:1.5, vowel:"o", morph:"a", rasp:0.15, thick:true });
};
lim("jump", { min:0.2, cap:1, wet:0.5, jit:0.04 });
SND.jump = ()=>{
  voice(rnd(60, 75), 0.6, 0.1, "a", { att:0.02, rasp:0.6, pc:[[1, 1.15]] });
  noise(0.6, "bandpass", 300, 0.17, { att:0.3, to:1200, q:1.2 });
};
SND.socket = SND.reloaded;

/* ---- the mix: trims measured from offline renders (loudest 50 ms, dBFS), so that
 *      footfalls and clicks sit near -36, shots and blows near -30 to -20, and only
 *      the boss, the death toll and the doors reach about -12 ---- */
const TRIM = {
  altar:0.5, beat:0.3, skitter:3, stomp:0.6, die:0.7, boss:0.6, bossdie:0.65, death:0.6, descend:0.6, doorOpen:0.6, doorShut:0.45, slip:0.4, stone:0.45,
  thud:0.7, transform:0.85, kill:0.55, fall:0.55, godly:0.7, shoot_launcher:0.75, shoot_pistol:1.3, shoot_smg:1.8,
  hit:1.8, arrow:3, bounce:2.5, bones:3, bubble:2.3, click:5, coin:3, cloud:2.3, error:2.4, frog:3.5, ghostShot:2.5,
  graze:4, gremlin:1.6, hex:1.7, hiccup:4, illusion:1.7, jump:2, lick:1.4, pickup:2, poof:2.4, puff:4,
  portalShot:1.8, reload:5, reroll:2.4, select:1.7, shatter:2, sling:3.5, spikes:1.3, vent:1, spit:5, splat:1.6, stick:1.5,
  swap:1.5, tell:2.8, throw:2.2, zap:4, step:2.2, frogHop:3, cloth:3.5, dart:1.4, brazier:2, "break":1.5, freeze:1.9,
  spell_missiles:1.8, hurt:1.6, byproduct:3, ghost:0.6, bark:1.1
};
for(const k in TRIM){ if(!LIM[k]) LIM[k] = Object.assign({}, LIM_DEF); LIM[k].vol = TRIM[k]; }

/* ================================================================== *
 *  The score: a gothic requiem in D minor.
 *
 *  Long-lived voices that never stop (so no node churn): a low drone,
 *  a four-voice formant choir (saws through vowel band-passes), three
 *  bowed strings with a tremolo, and wind. A step clock in eighth notes
 *  moves them chord to chord and drops in the short things: distant
 *  church bells, drips, rare whispers, and in a fight slow heavy taiko.
 *
 *  explore  sparse: drone, wind, a choir that comes and goes, a far bell
 *  fight    taiko on the one and the and-of-three, tremolo strings
 *  boss     full choir every bar, bells, driving drums, a string ostinato
 *  Deeper floors detune everything, darken the filter, swap the drone's
 *  fifth for a tritone, stretch the bells and slip in clusters.
 * ================================================================== */
const MODES = {
  menu:    { bpm:46, bars:2, drone:0.9, choir:0.85, sing:0.85, strings:0.5, wind:0.5,  trem:0,    perc:0,   bells:0.8, drips:0.04 },
  explore: { bpm:50, bars:2, drone:0.8, choir:0.7,  sing:0.5,  strings:0.5, wind:0.8,  trem:0,    perc:0,   bells:0.6, drips:0.07 },
  fight:   { bpm:64, bars:2, drone:1,   choir:0.65, sing:0.7,  strings:0.75, wind:0.3,  trem:0.55, perc:1,   bells:0.5, drips:0.02 },
  boss:    { bpm:74, bars:1, drone:1,   choir:0.75, sing:1,    strings:0.85,   wind:0.12, trem:0.7,  perc:1.2, bells:1,   drips:0 }
};
/* choir voicings (bass, tenor, alto, soprano) */
const CH = {
  i:[50, 57, 62, 65], VI:[46, 58, 62, 65], iv:[43, 58, 62, 67], V:[45, 57, 61, 64], bII:[51, 58, 63, 67],
  vii:[49, 55, 58, 64], III:[53, 57, 60, 65], v:[45, 57, 60, 64],
  // the deep floors: clusters and tritones
  x1:[50, 51, 57, 62], x2:[50, 56, 62, 63], x3:[44, 50, 56, 61], x4:[49, 50, 56, 63]
};
const PROG = {
  menu:   [["i", "VI", "iv", "V"], ["i", "III", "VI", "V"]],
  explore:[["i", "VI", "iv", "V"], ["i", "bII", "i", "vii"], ["i", "iv", "VI", "v"], ["i", "III", "bII", "V"]],
  fight:  [["i", "i", "VI", "V"], ["i", "bII", "vii", "i"], ["i", "iv", "bII", "V"]],
  boss:   [["i", "VI", "bII", "V"], ["i", "bII", "iv", "vii"], ["i", "i", "bII", "bII"]]
};
const M = A.M = { built:false };
A.musicOff = false;

A.buildMusic = function(){
  const c = A.ctx, bus = A.music;
  const gain = (v, to)=>{ const g = c.createGain(); g.gain.value = v; if(to) g.connect(to); return g; };
  const osc = (type, f, to)=>{ const o = c.createOscillator(); o.type = type; o.frequency.value = f; if(to) o.connect(to); o.start(); return o; };
  const filt = (type, f, q, to)=>{ const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; if(to) b.connect(to); return b; };
  const lfo = (rate, depth, param)=>{ const g = gain(depth); g.connect(param); osc("sine", rate, g); return g; };
  M.L = {}; M.send = {};
  const SEND = { drone:0.15, choir:0.9, strings:0.7, wind:0.35, perc:0.4, bells:1, amb:0.9 };
  for(const k in SEND){ M.L[k] = gain(0, bus); M.send[k] = gain(SEND[k], A.verbIn); M.L[k].connect(M.send[k]); }
  M.L.amb.gain.value = 1;
  // drone: two detuned saws and a fifth on D, a sine an octave down, a breathing low-pass
  M.droneLP = filt("lowpass", 240, 1.4, M.L.drone);
  lfo(0.045, 90, M.droneLP.frequency);
  M.dr = [osc("sawtooth", mtof(38), gain(0.03, M.droneLP)), osc("sawtooth", mtof(38), gain(0.03, M.droneLP)), osc("sine", mtof(26), gain(0.04, M.droneLP))];
  M.fifthG = gain(0.012, M.droneLP); M.fifth = osc("sawtooth", mtof(45), M.fifthG);
  M.warble = gain(0); osc("sine", 0.13, M.warble);       // the deep floors' seasick drift
  M.dr.concat([M.fifth]).forEach(o=> M.warble.connect(o.detune));
  // choir: four voices of two saws each, through three vowel formants
  M.choirIn = gain(1);
  M.form = [0, 1, 2].map(i=>{ const b = filt("bandpass", VOWEL.a[i][0], VOWEL.a[i][0]/(80 + i*40), null); M.choirIn.connect(b); b.connect(gain(VOWEL.a[i][1]*5, M.L.choir)); return b; });
  const vibA = gain(9), vibB = gain(12); osc("sine", 5.1, vibA); osc("sine", 5.7, vibB);
  M.cv = [0, 1, 2, 3].map(i=>{
    const g = gain(0, M.choirIn), a = osc("sawtooth", mtof(CH.i[i]), g), b = osc("sawtooth", mtof(CH.i[i]), g);
    a.detune.value = -7; b.detune.value = 7; vibA.connect(a.detune); vibB.connect(b.detune);
    return { g, a, b };
  });
  // strings: three bowed voices, dark-filtered, with a tremolo for the fights
  const sIn = gain(1), slp = filt("lowpass", 1500, 0.5, null), shp = filt("highpass", 110, 0.5, null);
  M.trem = gain(0.75, M.L.strings); sIn.connect(slp); slp.connect(shp); shp.connect(M.trem);
  M.tremDepth = lfo(7.5, 0, M.trem.gain);
  M.sv = [0, 1, 2].map(i=>{
    const g = gain(0, sIn), a = osc("sawtooth", mtof(62), g), b = osc("sawtooth", mtof(62), g);
    a.detune.value = -6; b.detune.value = 6;
    return { g, a, b };
  });
  // wind: one looped noise through a broad band and a narrow howl, both drifting
  const ws = c.createBufferSource(); ws.buffer = BUF.w; ws.loop = true; ws.playbackRate.value = 0.5;
  M.windAmp = gain(0.25, M.L.wind);
  const b1 = filt("bandpass", 380, 0.9, gain(0.5, M.windAmp)), b2 = filt("bandpass", 720, 9, gain(0.3, M.windAmp));
  ws.connect(b1); ws.connect(b2); ws.start();
  lfo(0.07, 220, b1.frequency); lfo(0.11, 320, b2.frequency); lfo(0.05, 0.15, M.windAmp.gain);
  // two fixed positions, left and right, for drips and whispers
  M.panL = c.createStereoPanner ? c.createStereoPanner() : gain(1); M.panR = c.createStereoPanner ? c.createStereoPanner() : gain(1);
  if(M.panL.pan){ M.panL.pan.value = -0.7; M.panR.pan.value = 0.7; }
  M.panL.connect(M.L.amb); M.panR.connect(M.L.amb);
  M.built = true; M.applied = null; M.depth = -1; M.prog = null; M.chord = CH.i;
  applyMode();
};

function depthNow(){
  if(A.mode === "menu") return 0.1;
  const G = DG.app && DG.app.G, f = G && G.floor || 1;
  return clamp((f - 1)/4, 0, 1.4);
}
function applyMode(){
  const c = A.ctx; if(!c || !M.built) return;
  const md = MODES[A.mode] || MODES.explore, t = c.currentTime, off = A.musicOff;
  ["drone", "choir", "strings", "wind"].forEach(k=> M.L[k].gain.setTargetAtTime(off ? 0 : md[k], t, 1.2));
  M.L.perc.gain.setTargetAtTime(off ? 0 : 0.35, t, 0.3); M.L.bells.gain.setTargetAtTime(off ? 0 : 1.2, t, 0.3); M.L.amb.gain.setTargetAtTime(off ? 0 : 1, t, 0.5);
  M.tremDepth.gain.setTargetAtTime(md.trem*0.3, t, 0.8);
  M.applied = A.mode;
}
A.setMode = m=>{
  if(!MODES[m]) m = "explore";
  if(m === A.mode && M.applied === m) return;
  const was = A.mode; A.mode = m;
  applyMode();
  // a fresh phrase when the fight starts or ends, on the next bar
  if(was !== m && A.ctx) M.prog = null;
};
/* the deep floors: retune what never stops */
function setDepth(d, t){
  M.depth = d;
  const det = 6 + 22*d;
  M.dr[0].detune.setTargetAtTime(-det, t, 2); M.dr[1].detune.setTargetAtTime(det, t, 2);
  M.fifth.frequency.setTargetAtTime(mtof(d >= 0.5 ? 44 : 45), t, 2);
  M.fifthG.gain.setTargetAtTime(0.011 + 0.01*d, t, 2);
  M.warble.gain.setTargetAtTime(d >= 0.6 ? 10 + 16*d : 0, t, 2);
  M.cv.forEach(v=>{ v.a.detune.setTargetAtTime(-7 - 14*d, t, 2); v.b.detune.setTargetAtTime(7 + 14*d, t, 2); });
  A.musicLP.frequency.setTargetAtTime(3600 - 1500*Math.min(1, d), t, 2);
  M.droneLP.Q.setTargetAtTime(1.4 + 3*d, t, 2);
}

A.tick = function(){
  const c = A.ctx;
  if(!c || c.state !== "running" || A.offline) return;
  // a hidden tab only ticks about once a second, so look further ahead there
  A.schedule(c.currentTime + (typeof document !== "undefined" && document.hidden ? 1.6 : 0.3));
};
/* schedules the score up to a time (the tick looks 0.3 s ahead; tests render it offline) */
A.schedule = function(until){
  const c = A.ctx; if(!c || !M.built) return;
  if(A.next < c.currentTime - 0.25) A.next = c.currentTime + 0.05;     // after a stall, skip ahead rather than pile up
  while(A.next < until){
    const md = MODES[A.mode] || MODES.explore;
    try{ if(!A.musicOff && A.musicOn !== false) stepMusic(A.next, md); }catch(e){ P = null; if(!A.warned){ A.warned = true; if(window.console) console.warn("music", e); } }
    A.next += 60/md.bpm/2; A.step++;
  }
};
/* a context for the score's own short sounds: straight onto a layer, no jitter */
function mus(t, bus, fn){
  P = { t, dry:bus, wet:null, echo:null, pj:1, fj:1, vol:1, end:t };
  try{ fn(); } finally{ P = null; }
}
function taiko(t, f, vol, bus){
  mus(t, bus || M.L.perc, ()=>{
    thump(f, f*0.45, 0.7, vol);
    noise(0.1, "lowpass", 1000, vol*0.3);
    noise(0.55, "lowpass", 170, vol*0.6, { buf:"b" });
  });
}
function stepMusic(t, md){
  const s = A.step % 8, eighth = 60/md.bpm/2, quiet = A.muted;
  if(s === 0) newBar(t, md);
  if(quiet) return;
  const bar = Math.floor(A.step/8), d = M.depth;
  // drums
  if(A.mode === "fight"){
    if(s === 0) taiko(t, 62, 0.42*md.perc);
    if(s === 5) taiko(t, 66, 0.3*md.perc);
    if(s === 3) taiko(t, 130, 0.1*md.perc);
    if(s === 7 && bar % 2 === 1) taiko(t, 120, 0.12*md.perc);
    if(bar % 4 === 3 && s >= 6) taiko(t + eighth/2, 110, 0.1*md.perc);
  }
  else if(A.mode === "boss"){
    if(s === 0 || s === 3 || s === 6) taiko(t, 58, 0.45*md.perc);
    if(s === 4){ mus(t, M.L.perc, ()=> metal(rnd(300, 330), 0.5, 0.025)); taiko(t, 70, 0.25*md.perc); }
    if(s === 2 || s === 7) taiko(t, 125, 0.14*md.perc);
    if(bar % 4 === 3 && s >= 4) taiko(t + eighth/2, 105, 0.13*md.perc);
    // the string ostinato, marcato on every eighth
    const v = M.sv[2], f = mtof(M.chord[0] + 12 + [0, 0, 1, 0, -1, 0, 3, 1][s]);
    v.a.frequency.setTargetAtTime(f, t, 0.006); v.b.frequency.setTargetAtTime(f, t, 0.006);
    v.g.gain.setTargetAtTime(0.06, t, 0.008); v.g.gain.setTargetAtTime(0.012, t + 0.07, 0.07);
  }
  else if(d >= 0.4 && s === 0 && bar % 4 === 2 && Math.random() < d) taiko(t, 52, 0.12, M.L.amb);   // something heavy, far off
  // the room: drips, wind does itself, and very rarely a whisper
  if(Math.random() < md.drips) mus(t + Math.random()*eighth, pick([M.panL, M.panR, M.L.amb]), ()=>{
    const f = rnd(700, 1500); osc("sine", f, 0.07, 0.03, { to:f*rnd(1.4, 1.9), glide:0.025, att:0.002 });
  });
  if(A.mode !== "boss" && Math.random() < (A.mode === "fight" ? 0.001 : 0.003 + 0.006*d))
    mus(t, Math.random() < 0.5 ? M.panL : M.panR, ()=> whisper(rnd(1.2, 2.4), 0.01 + 0.006*d));
  if(d >= 0.6 && A.mode === "explore" && Math.random() < 0.006)
    mus(t, M.L.amb, ()=> voice(rnd(45, 55), 4, 0.02, "u", { att:1.5, rasp:0.4, pc:[[1, 0.9]] }));   // the dungeon groans
}
function newBar(t, md){
  const bar = Math.floor(A.step/8), d = depthNow();
  if(Math.abs(d - M.depth) > 0.01) setDepth(d, t);
  const per = md.bars;
  if(bar % per !== 0) return;
  const k = Math.floor(bar/per);
  if(!M.prog || k % 4 === 0){ M.prog = pick(PROG[A.mode] || PROG.explore); M.pi = 0; }
  let name = M.prog[M.pi++ % 4];
  if(name !== "i" && Math.random() < d*0.5) name = pick(d > 0.8 ? ["x1", "x2", "x3", "x4"] : ["x1", "x2"]);
  const ch = M.chord = CH[name], dur = per*8*60/md.bpm/2, quiet = A.muted;
  // choir: glide to the chord, and sing this phrase or rest
  const sing = Math.random() < md.sing, vowel = d > 0.5 ? pick(["o", "u", "o", "a"]) : pick(["a", "o", "a", "e"]);
  M.form.forEach((b, i)=> b.frequency.setTargetAtTime(VOWEL[vowel][i][0], t, 0.8));
  M.cv.forEach((v, i)=>{
    const f = mtof(ch[i]);
    v.a.frequency.setTargetAtTime(f, t, 0.09); v.b.frequency.setTargetAtTime(f, t, 0.09);
    v.g.gain.setTargetAtTime(sing ? (i === 3 ? 0.025 : 0.035) : 0, t + 0.05, sing ? dur*0.18 : 0.8);
    if(sing && A.mode !== "boss") v.g.gain.setTargetAtTime(0, t + dur*0.78, dur*0.07);
  });
  // strings
  if(A.mode === "explore" || A.mode === "menu"){
    const swell = Math.random() < (A.mode === "menu" ? 0.6 : 0.4);
    const notes = [ch[1] + 12, ch[2] + 12, Math.random() < 0.3 + d*0.5 ? ch[2] + 13 : ch[3] + 12];   // sometimes a rub of a semitone
    M.sv.forEach((v, i)=>{
      v.a.frequency.setTargetAtTime(mtof(notes[i]), t, 0.3); v.b.frequency.setTargetAtTime(mtof(notes[i]), t, 0.3);
      v.g.gain.setTargetAtTime(swell ? 0.045 : 0, t + 0.1 + i*0.6, swell ? dur*0.2 : 0.8);
      if(swell) v.g.gain.setTargetAtTime(0, t + dur*0.6, dur*0.1);
    });
  } else {
    // a sustained chord under tremolo; in a fight the top voice creeps up a semitone
    M.sv.forEach((v, i)=>{
      if(A.mode === "boss" && i === 2) return;
      const n = (i === 0 ? ch[0] + 12 : i === 1 ? ch[2] + 12 : ch[3] + 12);
      v.a.frequency.setTargetAtTime(mtof(n), t, 0.08); v.b.frequency.setTargetAtTime(mtof(n), t, 0.08);
      if(A.mode === "fight" && i === 2 && Math.random() < 0.4){ v.a.frequency.setTargetAtTime(mtof(n + 1), t + dur*0.4, dur*0.25); v.b.frequency.setTargetAtTime(mtof(n + 1), t + dur*0.4, dur*0.25); }
      v.g.gain.setTargetAtTime(0.04, t, 0.3);
    });
  }
  if(quiet) return;
  // bells: a far toll while exploring, sometimes three; every other bar for a boss
  const bt = { str:d*2, n:d > 0.5 ? 10 : 8 };
  if(A.mode === "boss"){ if(bar % 2 === 0) mus(t, M.L.bells, ()=> bell(mtof(ch[0]), 6, 0.06*md.bells, bt)); }
  else if(bar % 4 === 0 && Math.random() < (A.mode === "fight" ? 0.5 : 0.65)){
    const n = Math.random() < 0.25 ? 3 : 1, f = mtof(pick([50, 50, 45, 43]));
    for(let i=0;i<n;i++) mus(t + i*2.6, M.L.bells, ()=> bell(f, 7, 0.035*md.bells, bt));
  }
}

})();
