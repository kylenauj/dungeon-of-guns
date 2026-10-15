/* ------------------------------------------------------------------ *
 *  Audio, all synthesised (as in Pine Hollow and Gloom Shooter): two
 *  buses, music and effects, into one compressor.
 *
 *  The music is a slow goblin dirge in A minor over a low drone,
 *  sequenced ahead of the clock. Exploring gets bass and plucks; a
 *  locked room adds drums; the bosses get the lot, faster.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const A = DG.Audio = { ctx:null, muted:false, mode:"menu", step:0, next:0 };

A.start = function(){
  const AC = window.AudioContext || window.webkitAudioContext;
  if(A.ctx){ if(A.ctx.state === "suspended") A.ctx.resume(); return; }
  if(!AC) return;
  try{ A.muted = localStorage.getItem("dungeonofguns.muted") === "1"; }catch(e){}
  const c = A.ctx = new AC();
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
  A.master = c.createGain(); A.master.gain.value = A.muted ? 0 : 0.75; A.master.connect(comp);
  A.sfx = c.createGain(); A.sfx.gain.value = 0.9; A.sfx.connect(A.master);
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200; lp.connect(A.master);
  A.music = c.createGain(); A.music.gain.value = 0.45; A.music.connect(lp);
  const len = c.sampleRate*2; A.noise = c.createBuffer(1, len, c.sampleRate);
  const d = A.noise.getChannelData(0); for(let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
  const n = Math.round(c.sampleRate*1.6), ir = c.createBuffer(2, n, c.sampleRate);
  for(let ch=0; ch<2; ch++){ const b = ir.getChannelData(ch); for(let i=0;i<n;i++) b[i] = (Math.random()*2 - 1)*Math.pow(1 - i/n, 3.5); }
  A.verb = c.createConvolver(); A.verb.buffer = ir; const vb = c.createGain(); vb.gain.value = 0.3; A.verb.connect(vb); vb.connect(A.master);
  A.next = c.currentTime + 0.1;
  setInterval(A.tick, 50);
};
A.toggleMute = function(){
  A.muted = !A.muted;
  try{ localStorage.setItem("dungeonofguns.muted", A.muted ? "1" : "0"); }catch(e){}
  if(A.master) A.master.gain.setTargetAtTime(A.muted ? 0 : 0.75, A.ctx.currentTime, 0.05);
  return A.muted;
};

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
const mtof = m=> 440*Math.pow(2, (m - 69)/12);
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
const throttle = {};
A.play = function(name, o){
  if(!A.ctx || A.muted) return;
  o = o || {};
  // never stack forty copies of one sound in a frame
  const now = A.ctx.currentTime;
  if(throttle[name] && now - throttle[name] < 0.025) return;
  throttle[name] = now;
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
};

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
