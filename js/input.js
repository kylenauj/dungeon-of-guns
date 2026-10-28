/* ------------------------------------------------------------------ *
 *  Input: keyboard and mouse, or a gamepad (twin-stick). Sampled once
 *  per frame; one-shot presses (blink, use, swap...) are handed to the
 *  first game step of the frame only.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const I = DG.Input = { keys:{}, mouse:{ x:innerWidth/2, y:innerHeight/2, l:false, r:false }, edge:{}, wheel:0, pad:null, usingPad:false, onKey:null };

const MAP = {
  KeyW:"up", ArrowUp:"up", KeyS:"down", ArrowDown:"down", KeyA:"left", ArrowLeft:"left", KeyD:"right", ArrowRight:"right",
  Space:"blink", ShiftLeft:"blink", ShiftRight:"blink", KeyE:"use", KeyF:"active", KeyQ:"swap", KeyR:"reload", KeyT:"warp",
  Digit1:"slot0", Digit2:"slot1", Digit3:"slot2"
};

I.init = function(){
  addEventListener("keydown", e=>{
    if(e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const k = MAP[e.code];
    if(k){ if(!I.keys[k]) I.edge[k] = true; I.keys[k] = true; }
    // (arrows too: embedded in a web page, they would scroll the page round the game)
    if(e.code === "Tab" || e.code === "Space" || e.code.indexOf("Arrow") === 0) e.preventDefault();
    I.usingPad = false;
    if(I.onKey) I.onKey(e);
  });
  addEventListener("keyup", e=>{ const k = MAP[e.code]; if(k) I.keys[k] = false; });
  addEventListener("blur", ()=>{ I.keys = {}; I.mouse.l = I.mouse.r = false; });
  addEventListener("mousemove", e=>{ I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.usingPad = false; });
  addEventListener("mousedown", e=>{ if(e.button === 0) I.mouse.l = true; if(e.button === 2) I.mouse.r = true; });
  addEventListener("mouseup", e=>{ if(e.button === 0) I.mouse.l = false; if(e.button === 2) I.mouse.r = false; });
  addEventListener("contextmenu", e=> e.preventDefault());
  // the wheel swaps guns; over the game it mustn't also scroll a page the game is
  // embedded in (an iframe that can't scroll hands the wheel to its parent).
  // Over the menus it still scrolls them.
  addEventListener("wheel", e=>{
    I.wheel += Math.sign(e.deltaY);
    const menu = e.target && e.target.closest && e.target.closest("#screens");
    if(!menu) e.preventDefault();
  }, { passive:false });
};

/* one frame's input for the game, given where the wizard is */
I.sample = function(G){
  const S = DG.Stage, p = G.player, K = I.keys, E = I.edge;
  const out = { mx:(K.right ? 1 : 0) - (K.left ? 1 : 0), my:(K.down ? 1 : 0) - (K.up ? 1 : 0),
    fire:I.mouse.l, spell:I.mouse.r, blink:!!E.blink, use:!!E.use, active:!!E.active, swap:!!E.swap || I.wheel !== 0, reload:!!E.reload, warp:!!E.warp,
    slot:E.slot0 ? 0 : E.slot1 ? 1 : E.slot2 ? 2 : -1 };
  const w = S.unproject(I.mouse.x, I.mouse.y, 0.75);
  if(w){ out.ax = w.x; out.ay = w.z; }
  // a gamepad, if one's plugged in and being used
  // (inside an iframe whose page doesn't allow "gamepad", getGamepads throws; that
  // used to abort every frame of an embedded game, so it is caught and treated as none)
  let pads = [];
  try{ pads = navigator.getGamepads ? navigator.getGamepads() : []; }catch(e){ pads = []; }
  const gp = pads && Array.from(pads).find(x=> x && x.connected);
  if(gp){
    const dz = v=> Math.abs(v) < 0.2 ? 0 : v;
    const lx = dz(gp.axes[0]), ly = dz(gp.axes[1]), rx = dz(gp.axes[2]), ry = dz(gp.axes[3]);
    const b = i=> gp.buttons[i] && gp.buttons[i].pressed;
    const prev = I.padPrev || {};
    const now = { a:b(0), bb:b(1), x:b(2), y:b(3), rb:b(5), lb:b(4), start:b(9) };
    if(lx || ly || rx || ry || now.a || b(7)) I.usingPad = true;
    if(I.usingPad){
      out.mx = lx; out.my = ly;
      if(rx || ry){ I.padAim = Math.atan2(ry, rx); }
      else if(lx || ly) I.padAim = I.padAim === undefined ? Math.atan2(ly, lx) : I.padAim;
      const a = I.padAim === undefined ? p.aim : I.padAim;
      out.ax = p.x + Math.cos(a)*6; out.ay = p.y + Math.sin(a)*6;
      out.fire = b(7) || (gp.buttons[7] && gp.buttons[7].value > 0.3) || !!(rx || ry) && Math.hypot(rx, ry) > 0.85;
      out.spell = b(6);
      if(now.a && !prev.a) out.blink = true;
      if(now.x && !prev.x) out.use = true;
      if(now.bb && !prev.bb) out.active = true;
      if(now.y && !prev.y) out.warp = true;
      if(now.lb && !prev.lb) out.reload = true;
      if(now.start && !prev.start && I.onPadStart) I.onPadStart();
      if(now.rb && !prev.rb && I.onPadBag) I.onPadBag();
      const sp = DG.Stage.project(out.ax, 0.75, out.ay); I.mouse.x = sp.x; I.mouse.y = sp.y;
    }
    I.padPrev = now;
  }
  I.edge = {}; I.wheel = 0;
  return out;
};
I.clear = function(){ I.keys = {}; I.edge = {}; I.mouse.l = I.mouse.r = false; I.wheel = 0; };

})();
