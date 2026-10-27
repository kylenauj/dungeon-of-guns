/* ------------------------------------------------------------------ *
 *  The thrones (the THRONE ending, docs/ENDINGS.md): one for each
 *  element mastered. Built facing +z (toward the camera when the rig
 *  isn't turned), seat at R.seat (its height), so Zippy can sit in it.
 *    fire    the Ash Throne: black glass, cracked, fire in the seams
 *    frost   the Rime Throne: blue ice and a crown of shards
 *    poison  the Blight Throne: bone, fungus and something dripping
 *    shock   the Storm Throne: black iron, copper coils, lightning rods
 *    arcane  the Star Throne: floating stone and turning rune rings
 *  Models.throneAnim(R, t) moves what moves (flames, orbits, rings).
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, Models = DG.Models, H = Models.H;
const { PI, S, CY, CO, BX, TO, OC, P, rig, group, glow, halo, finish } = H;

/* the seat and back every throne shares: a plinth, a seat, two arms, a back */
function frame(b, stone, trim, backH, opts){
  opts = opts || {};
  P(b, BX(1.5, 0.22, 1.3), trim, 0, 0.11, 0.05);                         // the dais
  P(b, BX(1.25, 0.16, 1.05), stone, 0, 0.3, 0.05);
  P(b, BX(0.95, 0.42, 0.78), stone, 0, 0.55, 0.0);                       // the seat block
  P(b, BX(1.0, 0.07, 0.82), trim, 0, 0.78, 0.0);
  [-1, 1].forEach(s=>{
    P(b, BX(0.16, 0.5, 0.8), stone, s*0.56, 0.78, 0.0);                  // the arms
    P(b, BX(0.22, 0.08, 0.86), trim, s*0.56, 1.06, 0.02);
  });
  P(b, BX(1.05, backH, 0.2), stone, 0, 0.75 + backH/2, -0.4);            // the back
  if(!opts.noCap) P(b, BX(1.15, 0.1, 0.26), trim, 0, 0.75 + backH, -0.4);
}

const BUILD = {
  fire(R, b){
    const OB = 0x1a1412, CR = 0x3a1a10, FL = 0xff7a2a, FL2 = 0xffc040;
    frame(b, OB, CR, 1.9);
    // the seams: fire showing through the cracked glass
    [[-0.3, 1.4], [0.25, 1.9], [-0.1, 2.3], [0.35, 1.2], [0, 1.65]].forEach(([x, y], i)=>{
      const m = new THREE.Mesh(BX(0.03, 0.35 + (i % 2)*0.2, 0.02), K.basic(FL)); m.position.set(x, y, -0.29); m.rotation.z = (i - 2)*0.4;
      b.add(m); R.glows.push(m);
    });
    // spikes of black glass along the top, and flames on each
    R.flames = [];
    [-0.5, -0.28, 0, 0.28, 0.5].forEach((x, i)=>{
      const h = i === 2 ? 0.9 : 0.5 + Math.abs(x)*0.3;
      P(b, CO(0.1, h, 6), OB, x, 2.7 + h/2, -0.4, 0, 0, -x*0.4);
      const f = glow(R, b, 0.07, FL2, x - x*0.2*h, 2.7 + h + 0.05, -0.4); R.flames.push(f);
    });
    // braziers on the arms
    [-1, 1].forEach(s=>{
      P(b, CY(0.14, 0.09, 0.12, 10), CR, s*0.56, 1.16, 0.3);
      R.flames.push(glow(R, b, 0.1, FL, s*0.56, 1.28, 0.3));
      halo(R, b, FL, 1.4, s*0.56, 1.35, 0.3, 0.5);
    });
    R.glowHalo = halo(R, b, FL, 4.5, 0, 1.6, -0.2, 0.45);
    R.col = FL;
  },
  frost(R, b){
    const IC = 0x8ab8d0, IC2 = 0xc8e8f8, DK = 0x3a5a72, GL = 0x9ae4ff;
    frame(b, IC, DK, 1.6, { noCap:true });
    // a crown of shards fanned out behind
    R.shards = [];
    for(let i=0;i<9;i++){
      const a = (i/8 - 0.5)*2.2, h = 1.0 + (1 - Math.abs(i/8 - 0.5)*2)*1.0;
      const m = P(b, CO(0.13, h, 5), i % 2 ? IC2 : IC, Math.sin(a)*0.55, 2.2 + Math.cos(a)*h*0.4, -0.45, 0, 0, -a*0.9);
      R.shards.push(m);
    }
    // icicles off the seat and the arms
    for(let i=0;i<7;i++) P(b, CO(0.035, 0.18 + (i % 3)*0.06, 5), IC2, -0.42 + i*0.14, 0.62 - (i % 3)*0.03, 0.42, PI);
    [-1, 1].forEach(s=>{ for(let i=0;i<3;i++) P(b, CO(0.03, 0.14, 5), IC2, s*0.56, 0.95, 0.3 - i*0.25, PI); });
    // frozen gems at the arms' ends
    [-1, 1].forEach(s=>{ P(b, OC(0.1), IC2, s*0.56, 1.2, 0.36); glow(R, b, 0.05, GL, s*0.56, 1.2, 0.36); halo(R, b, GL, 1.2, s*0.56, 1.2, 0.36, 0.45); });
    R.glowHalo = halo(R, b, GL, 4.8, 0, 1.6, -0.2, 0.4);
    R.col = GL;
  },
  poison(R, b){
    const BN = 0xc8bca0, BN2 = 0x8a7e66, ML = 0x2e3a1a, GL = 0x9cff3a;
    frame(b, ML, BN2, 1.7);
    // ribs up the back
    for(let i=0;i<5;i++){ const y = 1.1 + i*0.3; P(b, TO(0.42 - i*0.03, 0.035, PI), BN, 0, y, -0.28, 0, 0, 0); }
    // a skull on each arm, and one at the top
    const skull = (x, y, z, s)=>{
      P(b, S(0.13*s, 12, 10), BN, x, y, z, 0, 0, 0, 1, 0.95, 1.05);
      P(b, BX(0.14*s, 0.07*s, 0.12*s), BN, x, y - 0.1*s, z + 0.02);
      [-1, 1].forEach(e=>{ P(b, S(0.035*s, 8, 6), 0x0a0806, x + e*0.05*s, y, z + 0.11*s); glow(R, b, 0.016*s, GL, x + e*0.05*s, y, z + 0.13*s); });
    };
    [-1, 1].forEach(s=> skull(s*0.56, 1.2, 0.3, 1));
    skull(0, 2.62, -0.36, 1.5);
    // fungus: shelf caps up the back, glowing spots
    R.caps = [];
    [[-0.5, 1.5, 0.2], [0.5, 1.9, 0.24], [-0.45, 2.2, 0.16], [0.42, 1.25, 0.15], [-0.2, 2.5, 0.12], [0.3, 2.45, 0.14]].forEach(([x, y, r], i)=>{
      P(b, new THREE.SphereGeometry(r, 16, 8, 0, PI*2, 0, PI*0.45), 0x3a4a1e, x, y, -0.3, 0.5, 0, 0, 1, 0.5, 1);
      R.caps.push(glow(R, b, r*0.18, GL, x, y + r*0.2, -0.2));
    });
    // a pool at its feet
    R.pool = P(b, new THREE.CircleGeometry(1.0, 24), 0x3a5a14, 0, 0.23, 0.65, -PI/2, 0, 0, 1, 1, 0.5);
    R.glowHalo = halo(R, b, GL, 4.5, 0, 1.4, 0, 0.4);
    R.col = GL;
  },
  shock(R, b){
    const IR = 0x24242c, IR2 = 0x3c3c48, CU = 0xb87333, GL = 0xfff04a;
    frame(b, IR, IR2, 1.8);
    // copper coils on the back
    for(let i=0;i<6;i++) P(b, TO(0.2, 0.03), CU, 0, 1.15 + i*0.14, -0.27);
    // three lightning rods up from the back, one off each arm
    R.tips = [];
    [[-0.42, 2.55, -0.4, 1.0], [0, 2.55, -0.4, 1.5], [0.42, 2.55, -0.4, 1.0], [-0.56, 1.1, 0.3, 0.7], [0.56, 1.1, 0.3, 0.7]].forEach(([x, y, z, h])=>{
      P(b, CY(0.025, 0.045, h, 6), CU, x, y + h/2, z);
      for(let k=0;k<3;k++) P(b, TO(0.06, 0.012), CU, x, y + h*(0.3 + k*0.2), z, PI/2);
      P(b, S(0.06, 10, 8), IR2, x, y + h, z);
      const g = glow(R, b, 0.05, GL, x, y + h + 0.02, z); R.tips.push(g);
      halo(R, b, GL, 0.9, x, y + h + 0.02, z, 0.55);
    });
    R.glowHalo = halo(R, b, GL, 4.2, 0, 1.6, -0.2, 0.35);
    R.col = GL;
  },
  arcane(R, b){
    const ST = 0x3a3448, ST2 = 0x5a4e70, GL = 0xc89aff, GD = 0xc8a050;
    frame(b, ST, ST2, 1.7);
    // a disc of runes behind his head, two rings turning about it
    const disc = group(b, 0, 2.1, -0.28);
    P(disc, CY(0.55, 0.55, 0.06, 32), ST2, 0, 0, 0, PI/2);
    R.rings = [];
    [[0.62, 0.025, GD], [0.78, 0.02, GL]].forEach(([r, t, c])=>{ const g = group(disc, 0, 0, 0.06); P(g, TO(r, t), c); R.rings.push(g); });
    for(let i=0;i<8;i++){ const a = i/8*PI*2; R.glows.push(glow(R, disc, 0.035, GL, Math.cos(a)*0.4, Math.sin(a)*0.4, 0.05)); }
    // stones floating round it, and the throne's own stones lifted off the dais
    R.orbit = group(b, 0, 1.4, 0);
    for(let i=0;i<6;i++){ const a = i/6*PI*2; P(R.orbit, OC(0.09 + (i % 3)*0.03), i % 2 ? ST2 : ST, Math.cos(a)*1.05, Math.sin(i*1.7)*0.25, Math.sin(a)*1.05); glow(R, R.orbit, 0.025, GL, Math.cos(a)*1.05, Math.sin(i*1.7)*0.25 + 0.14, Math.sin(a)*1.05); }
    [-1, 1].forEach(s=>{ P(b, OC(0.12), GD, s*0.56, 1.25, 0.32); halo(R, b, GL, 1.1, s*0.56, 1.25, 0.32, 0.5); });
    R.glowHalo = halo(R, b, GL, 4.8, 0, 1.6, -0.2, 0.4);
    R.col = GL;
  }
};

Models.throne = function(el){
  const R = rig("throne"), b = R.body;
  (BUILD[el] || BUILD.arcane)(R, b);
  R.el = el; R.seat = 0.8; R.h = 2.8;
  return finish(R, { w:0.02 });
};
/* what moves on a throne */
Models.throneAnim = function(R, t){
  (R.flames || []).forEach((f, i)=>{ const k = 0.8 + 0.35*Math.sin(t*11 + i*1.7) + 0.2*Math.sin(t*23 + i); f.scale.set(k, 1 + 0.6*k, k); });
  (R.tips || []).forEach((g, i)=>{ g.visible = Math.sin(t*17 + i*2.3) > -0.6; });
  (R.caps || []).forEach((g, i)=>{ g.scale.setScalar(0.8 + 0.3*Math.sin(t*2 + i)); });
  (R.rings || []).forEach((g, i)=>{ g.rotation.z = t*(i ? -0.6 : 0.4); g.rotation.x = Math.sin(t*0.5 + i)*0.3; });
  if(R.orbit){ R.orbit.rotation.y = t*0.5; R.orbit.position.y = 1.4 + Math.sin(t*1.3)*0.08; }
  if(R.glowHalo) R.glowHalo.material.opacity = 0.35 + 0.08*Math.sin(t*3);
};
})();
