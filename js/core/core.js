/* ------------------------------------------------------------------ *
 *  Zippy & Gribbus: the shared namespace, a seeded RNG, small helpers.
 *
 *  Everything in js/core is plain logic with no THREE and no DOM, so the
 *  whole game (dungeon, combat, loot, AI) runs and is tested under Node
 *  as well as in the browser. Files attach themselves to one global, DG,
 *  in load order. Same house rules as Gloom Shooter.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG = root.DG || {};

/* mulberry32: small, fast, and the same sequence everywhere for a seed */
DG.RNG = function(seed){
  let s = (seed >>> 0) || 1;
  const next = ()=>{
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0)/4294967296;
  };
  return {
    next,
    int: (a, b)=> a + Math.floor(next()*(b - a + 1)),
    range: (a, b)=> a + next()*(b - a),
    pick: arr=> arr[Math.floor(next()*arr.length)],
    chance: p=> next() < p,
    sign: ()=> next() < 0.5 ? -1 : 1,
    /* pick from [{w:weight, ...}] or a parallel weight function */
    weighted(arr, wf){
      wf = wf || (o=> o.w);
      let tot = 0; arr.forEach(o=> tot += Math.max(0, wf(o)));
      let r = next()*tot;
      for(const o of arr){ r -= Math.max(0, wf(o)); if(r < 0) return o; }
      return arr[arr.length - 1];
    },
    shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j = Math.floor(next()*(i+1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
    get state(){ return s; }, set state(v){ s = v >>> 0; }
  };
};

DG.clamp = (v, a, b)=> Math.max(a, Math.min(b, v));
DG.lerp = (a, b, t)=> a + (b - a)*t;
DG.dist = (ax, ay, bx, by)=> Math.hypot(ax - bx, ay - by);
DG.dist2 = (ax, ay, bx, by)=> (ax - bx)*(ax - bx) + (ay - by)*(ay - by);
DG.angle = (ax, ay, bx, by)=> Math.atan2(by - ay, bx - ax);
DG.wrapAngle = a=>{ while(a > Math.PI) a -= Math.PI*2; while(a < -Math.PI) a += Math.PI*2; return a; };
DG.key = (x, y)=> x + "," + y;
DG.DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];
DG.DIRS8 = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

/* a seed a person can read out and type back in: six letters */
DG.seedWord = function(n){
  const C = "BCDFGHJKLMNPRSTVWZ", V = "AEIOU"; let s = "", x = n >>> 0;
  for(let i=0;i<6;i++){ if(i % 2 === 0){ s += C[x % C.length]; x = Math.floor(x/C.length); } else { s += V[x % V.length]; x = Math.floor(x/V.length); } }
  return s;
};
DG.seedFromWord = function(w){
  w = String(w || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if(/^\d+$/.test(w)) return (+w) >>> 0;
  let h = 2166136261;
  for(let i=0;i<w.length;i++){ h ^= w.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

})(typeof window !== "undefined" ? window : globalThis);
