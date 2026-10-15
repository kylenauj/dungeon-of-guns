/* ------------------------------------------------------------------ *
 *  Effects: one pool of sparks for everything that bursts or drifts
 *  (Gloom Shooter's), a layer that draws every shot in flight, rings
 *  for blasts and spells, lightning, and the ground markers that warn
 *  you where a bomb or a king is about to land.
 *
 *  The grim pass: sparks are embers (a hot core that cools as it dies),
 *  colours are pulled a little toward grey and white goes to old ivory,
 *  and a second pool, drawn dark rather than glowing, adds smoke, ash
 *  and blood: big bursts smoke, gibs spatter dark drops that settle on
 *  the floor, fire and bombs trail soot.
 *
 *  Enemy shots get a dark rim and a hot core so they read against
 *  anything; your shots glow in their element's colour.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, S = DG.Stage;
const FX = DG.FX = {};

const N = 3000, NB = 1500, ND = 1400;
let P, pts, alive = 0, B, bpts, bglow, D, dpts, dalive = 0;

function scaleNow(){ return S.renderer.domElement.height/2/Math.tan(S.camera.fov*Math.PI/360); }

FX.init = function(scene){
  FX.scene = scene;
  // sparks: embers with a hot core
  P = { pos:new Float32Array(N*3), col:new Float32Array(N*3), size:new Float32Array(N), vel:new Float32Array(N*3), life:new Float32Array(N), max:new Float32Array(N), grav:new Float32Array(N), drag:new Float32Array(N), base:new Float32Array(N*3) };
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P.pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("color", new THREE.BufferAttribute(P.col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aSize", new THREE.BufferAttribute(P.size, 1).setUsage(THREE.DynamicDrawUsage));
  FX.sparkMat = new THREE.ShaderMaterial({ uniforms:{ uScale:{ value:400 } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true,
    vertexShader:"attribute float aSize; varying vec3 vC; uniform float uScale; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = clamp(uScale*aSize/max(1.0, -mv.z), 0.0, 48.0); gl_Position = projectionMatrix*mv; }",
    fragmentShader:["varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;",
      "  float k = 1.0 - d*2.0, core = smoothstep(0.55, 1.0, k);",
      // a soft glow round a hot little core; the core goes toward ivory, not pure white
      "  vec3 c = vC*(k*k*1.25) + min(vC*2.2, vec3(1.0, 0.92, 0.8))*core*0.55;",
      "  gl_FragColor = vec4(c, 1.0); }"].join("\n") });
  pts = new THREE.Points(g, FX.sparkMat); pts.frustumCulled = false; pts.renderOrder = 5;
  scene.add(pts);

  // the dark pool: smoke, ash and blood, drawn over the world rather than added to it
  D = { pos:new Float32Array(ND*3), col:new Float32Array(ND*3), size:new Float32Array(ND), alpha:new Float32Array(ND), vel:new Float32Array(ND*3), life:new Float32Array(ND), max:new Float32Array(ND), grav:new Float32Array(ND), drag:new Float32Array(ND), s0:new Float32Array(ND), grow:new Float32Array(ND), a0:new Float32Array(ND) };
  const dg = new THREE.BufferGeometry();
  dg.setAttribute("position", new THREE.BufferAttribute(D.pos, 3).setUsage(THREE.DynamicDrawUsage));
  dg.setAttribute("color", new THREE.BufferAttribute(D.col, 3).setUsage(THREE.DynamicDrawUsage));
  dg.setAttribute("aSize", new THREE.BufferAttribute(D.size, 1).setUsage(THREE.DynamicDrawUsage));
  dg.setAttribute("aAlpha", new THREE.BufferAttribute(D.alpha, 1).setUsage(THREE.DynamicDrawUsage));
  FX.smokeMat = new THREE.ShaderMaterial({ uniforms:{ uScale:{ value:400 } }, transparent:true, depthWrite:false, vertexColors:true,
    vertexShader:"attribute float aSize; attribute float aAlpha; varying vec3 vC; varying float vA; varying float vS; uniform float uScale; void main(){ vC = color; vA = aAlpha; vS = fract(position.x*13.1 + position.z*7.7); vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = clamp(uScale*aSize/max(1.0, -mv.z), 0.0, 96.0); gl_Position = projectionMatrix*mv; }",
    fragmentShader:["varying vec3 vC; varying float vA; varying float vS;",
      "void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if(d > 0.5) discard;",
      // ragged edges: the radius wobbles with angle, differently for every puff
      "  float a = atan(p.y, p.x), r = 0.5 - 0.08*(0.5 + 0.5*sin(a*5.0 + vS*30.0))*(0.5 + 0.5*sin(a*3.0 - vS*17.0));",
      "  float k = smoothstep(r, r*0.35, d);",
      "  gl_FragColor = vec4(vC, vA*k); }"].join("\n") });
  dpts = new THREE.Points(dg, FX.smokeMat); dpts.frustumCulled = false; dpts.renderOrder = 4;
  scene.add(dpts);

  // shots in flight: a solid sprite each (rimmed for enemy shots) and a glow under it
  B = { pos:new Float32Array(NB*3), col:new Float32Array(NB*3), size:new Float32Array(NB), rim:new Float32Array(NB) };
  const bg = new THREE.BufferGeometry();
  bg.setAttribute("position", new THREE.BufferAttribute(B.pos, 3).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("color", new THREE.BufferAttribute(B.col, 3).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("aSize", new THREE.BufferAttribute(B.size, 1).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("aRim", new THREE.BufferAttribute(B.rim, 1).setUsage(THREE.DynamicDrawUsage));
  FX.shotMat = new THREE.ShaderMaterial({ uniforms:{ uScale:{ value:400 }, uTime:{ value:0 } }, transparent:true, depthWrite:false, vertexColors:true,
    vertexShader:"attribute float aSize; attribute float aRim; varying vec3 vC; varying float vR; varying float vS; uniform float uScale; void main(){ vC = color; vR = aRim; vS = fract(position.x*3.7 + position.z*5.3); vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = clamp(uScale*aSize/max(1.0, -mv.z), 2.0, 64.0); gl_Position = projectionMatrix*mv; }",
    fragmentShader:["uniform float uTime; varying vec3 vC; varying float vR; varying float vS;",
      "void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if(d > 0.5) discard;",
      // a hot core going out to the colour, the edge licking like a flame
      "  float a = atan(p.y, p.x), lick = 0.035*sin(a*6.0 + uTime*14.0 + vS*40.0);",
      "  vec3 hot = mix(vC, vec3(1.0, 0.95, 0.85), 0.7);",
      "  vec3 c = mix(hot, vC, smoothstep(0.1, 0.3, d + lick));",
      "  c = mix(c, vC*0.55, smoothstep(0.3, 0.42, d + lick));",
      "  if(vR > 0.5 && d + lick*0.6 > 0.37) c = vec3(0.06, 0.01, 0.02);",
      "  else if(vR < 0.5 && d + lick > 0.46) discard;",
      "  gl_FragColor = vec4(c, 1.0); }"].join("\n") });
  bpts = new THREE.Points(bg, FX.shotMat); bpts.frustumCulled = false; bpts.renderOrder = 6;
  scene.add(bpts);
  const gg = new THREE.BufferGeometry();
  gg.setAttribute("position", bg.attributes.position); gg.setAttribute("color", bg.attributes.color);
  const gsize = new Float32Array(NB); gg.setAttribute("aSize", new THREE.BufferAttribute(gsize, 1).setUsage(THREE.DynamicDrawUsage)); B.gsize = gsize;
  bglow = new THREE.Points(gg, FX.sparkMat); bglow.frustumCulled = false; bglow.renderOrder = 4;
  scene.add(bglow);
  B.geo = bg; B.ggeo = gg;
  FX.items = [];
  FX.bombs = {};
};

FX.clear = function(){
  alive = 0; if(P){ P.life.fill(0); P.size.fill(0); }
  dalive = 0; if(D){ D.life.fill(0); D.size.fill(0); D.alpha.fill(0); }
  (FX.items || []).forEach(i=> i.obj && FX.scene.remove(i.obj)); FX.items = [];
  for(const k in FX.bombs) FX.scene.remove(FX.bombs[k].g); FX.bombs = {};
};

/* the grade: colours pulled a little toward their own grey, white toward old ivory */
const _c = new THREE.Color(), _g = new THREE.Color(), IVORY = new THREE.Color(0xfff0d8);
function grade(col, out){
  out = out || _g;
  if(typeof col === "number") out.setHex(col); else out.copy(col);
  const L = out.r*0.299 + out.g*0.587 + out.b*0.114, mx = Math.max(out.r, out.g, out.b), mn = Math.min(out.r, out.g, out.b);
  if(mx - mn < 0.12 && L > 0.75) return out.lerp(IVORY, 0.7).multiplyScalar(0.92);
  out.r = L + (out.r - L)*0.82; out.g = L + (out.g - L)*0.82; out.b = L + (out.b - L)*0.82;
  return out;
}
FX.grade = grade;

function emit(x, y, z, vx, vy, vz, col, size, life, grav, drag){
  let i = -1;
  for(let k=0;k<64;k++){ const j = (alive + k) % N; if(P.life[j] <= 0){ i = j; break; } }
  if(i < 0) i = alive % N;
  alive = (i + 1) % N;
  P.pos[i*3] = x; P.pos[i*3+1] = y; P.pos[i*3+2] = z;
  P.vel[i*3] = vx; P.vel[i*3+1] = vy; P.vel[i*3+2] = vz;
  const c = grade(col, _c);
  P.base[i*3] = c.r; P.base[i*3+1] = c.g; P.base[i*3+2] = c.b;
  P.size[i] = size; P.life[i] = life; P.max[i] = life; P.grav[i] = grav || 0; P.drag[i] = drag === undefined ? 2 : drag;
}
FX.emit = emit;

/* a dark particle: soot, ash, blood. grow: how much bigger it gets as it ages */
function dark(x, y, z, vx, vy, vz, col, size, life, alpha, grow, grav, drag){
  let i = -1;
  for(let k=0;k<64;k++){ const j = (dalive + k) % ND; if(D.life[j] <= 0){ i = j; break; } }
  if(i < 0) i = dalive % ND;
  dalive = (i + 1) % ND;
  D.pos[i*3] = x; D.pos[i*3+1] = y; D.pos[i*3+2] = z;
  D.vel[i*3] = vx; D.vel[i*3+1] = vy; D.vel[i*3+2] = vz;
  const c = typeof col === "number" ? _c.setHex(col) : col;
  D.col[i*3] = c.r; D.col[i*3+1] = c.g; D.col[i*3+2] = c.b;
  D.s0[i] = size; D.size[i] = size; D.life[i] = life; D.max[i] = life; D.a0[i] = alpha; D.alpha[i] = alpha;
  D.grow[i] = grow || 0; D.grav[i] = grav || 0; D.drag[i] = drag === undefined ? 1.5 : drag;
}
FX.dark = dark;
const SOOT = new THREE.Color(0x2a2420), BLOOD = new THREE.Color(0x3a0606), _d = new THREE.Color();
/* a puff of smoke, faintly tinted by what made it */
FX.smoke = function(x, y, z, col, n, size, life, opts){
  opts = opts || {};
  for(let i=0;i<n;i++){
    const a = Math.random()*6.283, s = (opts.speed || 0.8)*(0.3 + Math.random()*0.7);
    _d.copy(SOOT).lerp(col === undefined ? _c.setHex(0x14100e) : typeof col === "number" ? _c.setHex(col) : _c.copy(col), opts.tint === undefined ? 0.12 : opts.tint);
    dark(x + (Math.random() - 0.5)*(opts.spread || 0.3), y + Math.random()*0.2, z + (Math.random() - 0.5)*(opts.spread || 0.3), Math.cos(a)*s, (opts.rise === undefined ? 0.7 : opts.rise)*(0.6 + Math.random()*0.6), Math.sin(a)*s,
      _d, size*(0.7 + Math.random()*0.6), life*(0.7 + Math.random()*0.6), (opts.alpha || 0.5)*(0.7 + Math.random()*0.3), opts.grow === undefined ? 1.6 : opts.grow, 0, 1.2);
  }
};
/* dark drops that arc out and settle on the floor */
FX.blood = function(x, y, z, col, n, speed, size, life){
  for(let i=0;i<n;i++){
    const a = Math.random()*6.283, e = Math.random()*1.1, s = speed*(0.3 + Math.random()*0.7);
    _d.copy(BLOOD).lerp((col === undefined ? _c.setHex(0x3a0606) : typeof col === "number" ? _c.setHex(col) : _c.copy(col)).multiplyScalar(0.45), 0.35);
    dark(x, y, z, Math.cos(a)*Math.cos(e)*s, Math.sin(e)*s + 1, Math.sin(a)*Math.cos(e)*s, _d, size*(0.5 + Math.random()*0.8), life*(0.8 + Math.random()*0.8), 0.92, -0.3, 12, 0.6);
  }
};

/* sparks bursting from (x, y, z) in the world, with the smoke and gore they leave */
FX.burst = function(x, y, z, col, n, speed, size, life, opts){
  opts = opts || {};
  const gore = opts.grav && n >= 10;
  const ns = gore ? Math.ceil(n*0.55) : n;
  for(let i=0;i<ns;i++){
    const a = Math.random()*6.283, e = opts.flat ? Math.random()*0.3 : Math.random()*1.4 - 0.2, s = speed*(0.3 + Math.random()*0.7);
    const c = opts.col2 !== undefined && Math.random() < 0.5 ? opts.col2 : col;
    emit(x + (Math.random() - 0.5)*(opts.spread || 0), y, z + (Math.random() - 0.5)*(opts.spread || 0),
      Math.cos(a)*Math.cos(e)*s, Math.sin(e)*s + (opts.up || 0), Math.sin(a)*Math.cos(e)*s, c, size*(0.6 + Math.random()*0.6), life*(0.6 + Math.random()*0.6), opts.grav || 0, opts.drag);
  }
  if(gore) FX.blood(x, y, z, col, Math.min(40, Math.ceil(n*0.7)), speed*0.8, size*0.8, life*2.2);
  if(n >= 8 && !opts.flat) FX.smoke(x, y, z, col, Math.min(10, Math.ceil(n/5)), size*3.2, life*1.8, { spread:opts.spread || 0.4, alpha:0.55 });
  if(n >= 20) for(let i=0;i<Math.min(12, n/4);i++){ const a = Math.random()*6.283; dark(x + Math.cos(a)*0.4, y + 0.3, z + Math.sin(a)*0.4, Math.cos(a)*0.4, 0.8 + Math.random(), Math.sin(a)*0.4, 0x4a4440, 0.06 + Math.random()*0.05, 1.4 + Math.random(), 0.8, 0, -0.15, 0.8); }
};
FX.rise = function(x, z, col, n, r, opts){
  opts = opts || {};
  for(let i=0;i<n;i++){ const a = Math.random()*6.28, d = Math.sqrt(Math.random())*(r || 0.6);
    emit(x + Math.cos(a)*d, (opts.y || 0.1) + Math.random()*0.3, z + Math.sin(a)*d, (Math.random() - 0.5)*0.4, (opts.v || 1.2) + Math.random()*1.2, (Math.random() - 0.5)*0.4, col, (opts.size || 0.25)*0.85 + Math.random()*0.12, (opts.life || 0.9) + Math.random()*0.5, 0, 0.6); }
};

/* a flat ring on the ground that grows and fades: a dusty shock, brightest at its edge */
const ringTex = (()=>{
  const S0 = 128, cv = document.createElement("canvas"); cv.width = cv.height = S0; const g = cv.getContext("2d");
  const r = g.createRadialGradient(64, 64, 20, 64, 64, 63);
  r.addColorStop(0, "rgba(255,255,255,0)"); r.addColorStop(0.7, "rgba(255,255,255,0)"); r.addColorStop(0.86, "rgba(255,255,255,0.18)"); r.addColorStop(0.94, "rgba(255,255,255,0.8)"); r.addColorStop(0.975, "rgba(255,255,255,0.95)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, S0, S0);
  // break it up, like dust thrown out rather than a clean line
  g.globalCompositeOperation = "destination-out";
  for(let i=0;i<120;i++){ const a = Math.random()*6.283, d = 50 + Math.random()*13; g.fillStyle = "rgba(0,0,0," + (0.25 + Math.random()*0.5) + ")"; g.beginPath(); g.arc(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, 0.8 + Math.random()*2, 0, 7); g.fill(); }
  return new THREE.CanvasTexture(cv);
})();
const ringGeo = new THREE.PlaneGeometry(2.1, 2.1);
FX.ring = function(x, z, r, col, life, opts){
  opts = opts || {};
  const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map:ringTex, color:grade(col).clone(), transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
  m.rotation.x = -Math.PI/2; m.rotation.z = Math.random()*6.28; m.position.set(x, opts.y || 0.08, z);
  FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, ownMat:true, update(it, dt){ const k = it.t/it.life; m.scale.setScalar(Math.max(0.01, r*(opts.from === undefined ? 0.2 + 0.8*Math.sqrt(k) : opts.from + (1 - opts.from)*k))); m.material.opacity = 0.9*(1 - k*k); } });
  // a big ring kicks up dust along its edge
  if(r >= 2.5 && !opts.y) for(let i=0;i<Math.min(14, r*2);i++){ const a = Math.random()*6.283; dark(x + Math.cos(a)*r*0.3, 0.15, z + Math.sin(a)*r*0.3, Math.cos(a)*r*1.2, 0.3, Math.sin(a)*r*1.2, 0x2a2420, 0.5, life*1.5, 0.3, 1.5, 0, 2.2); }
};
/* a flash disc */
FX.disc = function(x, z, r, col, life){
  const m = new THREE.Mesh(K.glowPlane, K.glowMat(grade(col).clone(), 0.7)); m.position.set(x, 0.1, z); m.scale.set(r*2.6, 1, r*2.6); FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, ownMat:true, update(it){ m.material.opacity = 0.7*(1 - it.t/it.life); } });
};
/* lightning between two points, re-jagged every frame it lives, with a fainter fork */
FX.arc = function(x1, z1, x2, z2, col, life){
  const n = 10, pos = new Float32Array((n + 1)*3), g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const c = grade(col || 0xfff04a).clone();
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color:c, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  const fpos = new Float32Array(5*3), fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  const fork = new THREE.Line(fg, new THREE.LineBasicMaterial({ color:c.clone().multiplyScalar(0.6), transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  line.add(fork);
  FX.scene.add(line);
  const jag = ()=>{
    for(let i=0;i<=n;i++){ const t = i/n, j = (i === 0 || i === n) ? 0 : 0.4;
      pos[i*3] = x1 + (x2 - x1)*t + (Math.random() - 0.5)*j; pos[i*3+1] = 0.8 + (Math.random() - 0.5)*j; pos[i*3+2] = z1 + (z2 - z1)*t + (Math.random() - 0.5)*j; }
    const k = 2 + Math.floor(Math.random()*(n - 4));
    for(let i=0;i<5;i++){ fpos[i*3] = pos[k*3] + (Math.random() - 0.5)*0.25*i; fpos[i*3+1] = pos[k*3+1] - i*0.06; fpos[i*3+2] = pos[k*3+2] + (Math.random() - 0.5)*0.25*i; }
    g.attributes.position.needsUpdate = true; fg.attributes.position.needsUpdate = true;
  };
  jag();
  FX.items.push({ obj:line, t:0, life:life || 0.18, update(it){ jag(); line.material.opacity = 1 - it.t/it.life; fork.material.opacity = 0.7*(1 - it.t/it.life); } });
};
/* a warning on the floor: a circle that fills up as the danger arrives, over a dark stain */
FX.warn = function(x, z, r, life, col){
  const g = new THREE.Group(); g.position.set(x, 0.07, z);
  const c = col || 0xe02a1a;
  const under = new THREE.Mesh(new THREE.CircleGeometry(1.04, 32), new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.3, depthWrite:false, side:THREE.DoubleSide }));
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40), new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:0.85, depthWrite:false, side:THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:0.25, depthWrite:false, side:THREE.DoubleSide }));
  under.rotation.x = edge.rotation.x = fill.rotation.x = -Math.PI/2; under.position.y = -0.005;
  g.add(under); g.add(edge); g.add(fill); g.scale.setScalar(r);
  FX.scene.add(g);
  const it = { obj:g, t:0, life, update(it){ const k = Math.min(1, it.t/it.life); fill.scale.setScalar(Math.max(0.01, k)); fill.material.opacity = 0.18 + 0.17*k; edge.material.opacity = 0.5 + 0.4*Math.sin(it.t*20); under.material.opacity = 0.15 + 0.25*k; } };
  FX.items.push(it);
  return it;
};
/* a line on the floor: where the brute is about to charge */
FX.lane = function(x, z, a, len, w, life){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), new THREE.MeshBasicMaterial({ color:0xe02a1a, transparent:true, opacity:0.3, depthWrite:false, side:THREE.DoubleSide }));
  m.geometry.translate(len/2, 0, 0); m.rotation.x = -Math.PI/2; m.rotation.z = -a; m.position.set(x, 0.07, z);
  FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, update(it){ m.material.opacity = 0.2 + 0.25*Math.abs(Math.sin(it.t*14)); } });
};
/* a mesh that hangs about for a while (thrown debris, gibs) */
FX.temp = function(obj, life, update){ FX.scene.add(obj); FX.items.push({ obj, t:0, life, update }); };

/* ---- deaths ---- */
/* a body coming apart: grey ash flaking off and drifting up on the draught,
   with a few embers still glowing in it. (x, z) the body, r its radius, h its
   height; n flakes. pale: a haunt's thin cold wisps instead */
const ASH = new THREE.Color(0x3a3430), ASH2 = new THREE.Color(0x5a524a), _a = new THREE.Color();
FX.ash = function(x, z, r, h, n, opts){
  opts = opts || {};
  const wx = opts.wind === undefined ? 0.25 : opts.wind;
  for(let i=0;i<n;i++){
    const a = Math.random()*6.283, d = Math.sqrt(Math.random())*r, y = (opts.y0 || 0.1) + Math.random()*h;
    const px = x + Math.cos(a)*d, pz = z + Math.sin(a)*d;
    if(opts.pale){
      emit(px, y, pz, (Math.random() - 0.5)*0.3 + wx*0.5, 0.5 + Math.random()*0.9, (Math.random() - 0.5)*0.3, opts.col || 0xa8c8e8, 0.1 + Math.random()*0.1, 0.9 + Math.random()*0.8, -0.2, 0.8);
      continue;
    }
    if(Math.random() < (opts.embers === undefined ? 0.3 : opts.embers)) emit(px, y, pz, (Math.random() - 0.5)*0.4 + wx, 0.5 + Math.random()*0.9, (Math.random() - 0.5)*0.4, Math.random() < 0.6 ? 0xff6a1a : 0xffb050, 0.07 + Math.random()*0.06, 0.7 + Math.random()*0.8, -0.3, 0.9);
    else dark(px, y, pz, (Math.random() - 0.5)*0.3 + wx, 0.35 + Math.random()*0.7, (Math.random() - 0.5)*0.3, _a.copy(ASH).lerp(ASH2, Math.random()), 0.07 + Math.random()*0.08, 1.4 + Math.random()*1.2, 0.75, 0.4, -0.12, 0.7);
  }
};
/* a boss's soul leaving: a column of pale light that climbs, holds, and thins
   out, with motes streaming up it and a glow on the floor */
let soulGeo = null, soulTex = null;
FX.soul = function(x, z, h, life, col){
  if(!soulGeo){
    soulGeo = new THREE.CylinderGeometry(0.55, 0.8, 1, 20, 1, true); soulGeo.translate(0, 0.5, 0);
    const cv = document.createElement("canvas"); cv.width = 4; cv.height = 128; const g = cv.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.35, "rgba(255,255,255,0.55)"); gr.addColorStop(0.85, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0.6)");
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128); soulTex = new THREE.CanvasTexture(cv);
  }
  const c = grade(col || 0xfff0d0).clone();
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const mk = (w, op)=>{ const m = new THREE.Mesh(soulGeo, new THREE.MeshBasicMaterial({ map:soulTex, color:c, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide })); m.scale.set(w, 0.01, w); m.userData.op = op; g.add(m); return m; };
  const outer = mk(1.6, 0.35), inner = mk(0.6, 0.9);
  const floor = new THREE.Mesh(K.glowPlane, new THREE.MeshBasicMaterial({ map:K.glowTex, color:c, transparent:true, opacity:0, blending:THREE.AdditiveBlending, depthWrite:false }));
  floor.position.y = 0.05; floor.scale.set(7, 1, 7); g.add(floor);
  FX.scene.add(g);
  FX.items.push({ obj:g, t:0, life, update(it, dt){
    const k = it.t/it.life, up = Math.min(1, k*4), fade = k < 0.6 ? 1 : 1 - (k - 0.6)/0.4;
    [outer, inner].forEach((m, i)=>{ m.scale.y = Math.max(0.01, h*up*(i ? 1.05 : 1)); const w = (i ? 0.6 : 1.6)*(1 - 0.5*k)*(1 + 0.06*Math.sin(it.t*13 + i)); m.scale.x = m.scale.z = w; m.material.opacity = m.userData.op*fade*Math.min(1, k*8); m.rotation.y += dt*(i ? 2 : -1); });
    floor.material.opacity = 0.8*fade*Math.min(1, k*6);
    for(let i=0;i<3;i++) if(Math.random() < fade){ const a = Math.random()*6.283, d = Math.random()*0.6*(1 - 0.5*k); emit(x + Math.cos(a)*d, 0.2 + Math.random()*h*up*0.5, z + Math.sin(a)*d, 0, 3 + Math.random()*4, 0, c, 0.12 + Math.random()*0.12, 0.9 + Math.random()*0.6, -1, 0.3); }
  }, dispose(){ g.children.forEach(m=> m.material.dispose()); } });
};

const EL = el=> el && DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
const ENEMY_SHOT = { acid:[0x9cff3a, 0.4], orb:[0xff3a8a, 0.42], rock:[0xa89a88, 0.32], dart:[0xb8a07a, 0.24], hex:[0xb36bff, 0.36], spore:[0xb8d84a, 0.38], ecto:[0x8ae8ff, 0.46],
  wail:[0xa8c8ff, 0.4], arrow:[0xe8dcc0, 0.26], tear:[0x6ad8ff, 0.36], blood:[0xff2a3a, 0.42] };
const MARK = { flop:0xff3a2a, slam:0xff3a2a, tentacle:0xd84aff, tear:0x6ad8ff, shroomring:0x9cff3a, vein:0xff2a3a, swipe:0xff6a3a };

/* ---- per frame ---- */
let clock = 0;
FX.update = function(dt, G){
  clock += dt;
  const sc = scaleNow(); FX.sparkMat.uniforms.uScale.value = sc; FX.shotMat.uniforms.uScale.value = sc; FX.smokeMat.uniforms.uScale.value = sc; FX.shotMat.uniforms.uTime.value = clock;
  for(let i=0;i<N;i++){
    if(P.life[i] <= 0){ if(P.size[i]){ P.size[i] = 0; } continue; }
    P.life[i] -= dt;
    const k = Math.max(0, P.life[i]/P.max[i]), d = Math.exp(-P.drag[i]*dt), kk = k*Math.sqrt(k);
    P.vel[i*3] *= d; P.vel[i*3+1] = P.vel[i*3+1]*d - P.grav[i]*dt; P.vel[i*3+2] *= d;
    P.pos[i*3] += P.vel[i*3]*dt; P.pos[i*3+1] = Math.max(0.03, P.pos[i*3+1] + P.vel[i*3+1]*dt); P.pos[i*3+2] += P.vel[i*3+2]*dt;
    // embers cool as they die: they dim, and the blue goes out of them first
    P.col[i*3] = P.base[i*3]*kk; P.col[i*3+1] = P.base[i*3+1]*kk*(0.75 + 0.25*k); P.col[i*3+2] = P.base[i*3+2]*kk*(0.6 + 0.4*k);
    if(P.life[i] <= 0) P.size[i] = 0;
  }
  pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; pts.geometry.attributes.aSize.needsUpdate = true;
  for(let i=0;i<ND;i++){
    if(D.life[i] <= 0){ if(D.alpha[i]){ D.alpha[i] = 0; D.size[i] = 0; } continue; }
    D.life[i] -= dt;
    const k = Math.max(0, D.life[i]/D.max[i]), d = Math.exp(-D.drag[i]*dt);
    D.vel[i*3] *= d; D.vel[i*3+1] = D.vel[i*3+1]*d - D.grav[i]*dt; D.vel[i*3+2] *= d;
    D.pos[i*3] += D.vel[i*3]*dt; D.pos[i*3+2] += D.vel[i*3+2]*dt;
    const y = D.pos[i*3+1] + D.vel[i*3+1]*dt;
    // blood that reaches the floor stops there and spreads a little
    if(y <= 0.04 && D.grav[i] > 0){ D.pos[i*3+1] = 0.04; D.vel[i*3] = D.vel[i*3+1] = D.vel[i*3+2] = 0; D.grav[i] = 0; D.grow[i] = 0.5; D.s0[i] = D.size[i]; }
    else D.pos[i*3+1] = y;
    D.size[i] = Math.max(0.01, D.s0[i]*(1 + D.grow[i]*(1 - k)));
    D.alpha[i] = D.a0[i]*Math.min(1, k*2.5)*Math.min(1, (1 - k)*12 + 0.3);
    if(D.life[i] <= 0){ D.alpha[i] = 0; D.size[i] = 0; }
  }
  ["position", "color", "aSize", "aAlpha"].forEach(k=> dpts.geometry.attributes[k].needsUpdate = true);
  // items
  FX.items = FX.items.filter(it=>{
    it.t += dt;
    if(it.update) it.update(it, dt);
    if(it.t >= it.life){ FX.scene.remove(it.obj); if(it.dispose) it.dispose(); if(it.obj.geometry && it.obj.geometry !== K.glowPlane && it.obj.geometry !== ringGeo) it.obj.geometry.dispose(); if(it.ownMat) it.obj.material.dispose(); return false; }
    return true;
  });
  if(!G) return;
  // shots
  let n = 0;
  for(const b of G.bullets){
    if(n >= NB) break;
    let col, size, rim = 0, y = 0.75;
    if(b.team === "p"){
      // a shot with several elements cycles through their colours
      const els = b.els || [b.el];
      col = EL(els.length > 1 ? els[Math.floor(G.t*10 + b.id) % els.length] : els[0]); size = Math.max(0.2, b.r*2.2);
      if(b.kind === "shard") size = 0.18;
      if(b.kind === "spit"){ col = 0x9cff6a; size = 0.32; }
      if(b.kind === "bubble"){ col = 0xb8f0ff; size = 0.7; }
      if(b.kind === "coin"){ col = 0xffd23d; size = 0.5; if(Math.random() < 0.3) emit(b.x, y, b.y, 0, 0.4, 0, 0xfff8b0, 0.18, 0.25, 0, 1); }
      if(b.kind === "fireball"){ size = 0.8; if(Math.random() < 0.7) emit(b.x, y, b.y, (Math.random() - 0.5), Math.random(), (Math.random() - 0.5), 0xff7a1a, 0.5, 0.35, 0, 1); if(Math.random() < 0.35) dark(b.x, y + 0.2, b.y, 0, 0.6, 0, 0x1a1210, 0.35, 0.8, 0.4, 1.8, 0, 1); }
      if(b.kind === "missile"){ if(Math.random() < 0.6) emit(b.x, y, b.y, 0, 0.2, 0, 0xb36bff, 0.25, 0.3, 0, 1); if(Math.random() < 0.3) dark(b.x, y, b.y, 0, 0.3, 0, 0x16121a, 0.25, 0.7, 0.35, 1.6, 0, 1); }
      if(b.kind === "spear"){ col = 0xbfe8ff; size = 0.75; if(Math.random() < 0.8) emit(b.x, y, b.y, (Math.random() - 0.5)*0.4, 0.3, (Math.random() - 0.5)*0.4, 0x8ad8ff, 0.35, 0.45, 0, 1); }
      if(b.kind === "grenade"){ size = 0.42; y = 0.6 + Math.sin(Math.min(1, b.t*1.5)*Math.PI)*0.6; }
      if(els.indexOf("poison") >= 0 && Math.random() < 0.12) emit(b.x, y, b.y, 0, -0.3, 0, 0x7dff3a, 0.15, 0.4, 0, 1);
      if(els.indexOf("fire") >= 0 && Math.random() < 0.12) emit(b.x, y, b.y, (Math.random() - 0.5)*0.4, 0.7, (Math.random() - 0.5)*0.4, 0xff7a1a, 0.14, 0.4, 0, 1);
      if(els.indexOf("frost") >= 0 && Math.random() < 0.08) emit(b.x, y, b.y, 0, 0, 0, 0xcff0ff, 0.14, 0.4, 0, 1);
      if(b.orbitLeft) y = 0.9;
    } else {
      const E = ENEMY_SHOT[b.kind] || ENEMY_SHOT.orb; col = E[0]; size = E[1]*(b.r > 0.2 ? 1.2 : 1); rim = 1; y = 0.6;
      if(b.kind === "blood" && Math.random() < 0.06) dark(b.x, y, b.y, 0, 0, 0, 0x2a0404, 0.1, 0.8, 0.8, -0.2, 9, 0.5);
    }
    grade(col, _c);
    B.pos[n*3] = b.x; B.pos[n*3+1] = y; B.pos[n*3+2] = b.y;
    B.col[n*3] = _c.r; B.col[n*3+1] = _c.g; B.col[n*3+2] = _c.b;
    B.size[n] = size; B.rim[n] = rim; B.gsize[n] = size*(b.team === "p" ? 2.6 : 2);
    n++;
  }
  for(let i=n;i<NB;i++){ if(!B.size[i]) break; B.size[i] = 0; B.gsize[i] = 0; }
  B.geo.setDrawRange(0, n); B.ggeo.setDrawRange(0, n);
  ["position", "color", "aSize", "aRim"].forEach(k=> B.geo.attributes[k].needsUpdate = true);
  B.ggeo.attributes.aSize.needsUpdate = true;
  // bombs: an arc through the air trailing soot, then a fizzing wait
  const seen = {};
  G.bombs.forEach(b=>{
    seen[b.id] = 1;
    let o = FX.bombs[b.id];
    if(!o){
      const g = new THREE.Group();
      const look = b.junk ? [new THREE.BoxGeometry(0.3, 0.3, 0.3), 0x5a3e28] : b.spore ? [new THREE.SphereGeometry(0.2, 10, 8), 0x8aa83a] : b.meteor ? [new THREE.DodecahedronGeometry(0.35), 0x3a1a10] : b.team === "p" ? [new THREE.SphereGeometry(0.3, 12, 10), 0x22222a] : [new THREE.SphereGeometry(0.17, 10, 8), 0x161618];
      g.add(new THREE.Mesh(look[0], K.lambert(look[1])));
      const fuse = K.sprite(b.meteor ? 0xff5a1a : 0xff9a3a, b.meteor ? 1.6 : 0.5, 1); fuse.position.y = b.meteor ? 0 : 0.2; g.add(fuse);
      FX.scene.add(g);
      o = FX.bombs[b.id] = { g, fuse, warn:FX.warn(b.tx, b.ty, Math.max(0.6, b.r), b.flight + b.fuse, b.team === "p" ? 0x46e4ff : b.spore ? 0x9cff3a : 0xff3a2a) };
    }
    const k = Math.min(1, b.t/b.flight);
    if(b.meteor) o.g.position.set(b.tx, 0.2 + (1 - k)*9, b.ty);
    else o.g.position.set(b.x + (b.tx - b.x)*k, 0.2 + Math.sin(k*Math.PI)*2.2, b.y + (b.ty - b.y)*k);
    o.g.rotation.x += 0.2; o.g.rotation.z += 0.13;
    o.fuse.material.opacity = k >= 1 ? 0.5 + 0.5*Math.sin(b.t*30) : 1;
    if(Math.random() < 0.5) emit(o.g.position.x, o.g.position.y + 0.2, o.g.position.z, (Math.random() - 0.5)*0.6, 0.6, (Math.random() - 0.5)*0.6, 0xffa040, 0.15, 0.3, 0, 1);
    if(Math.random() < (b.meteor ? 0.8 : 0.3)) dark(o.g.position.x, o.g.position.y + 0.15, o.g.position.z, 0, 0.4, 0, b.spore ? 0x2a3418 : 0x16120f, b.meteor ? 0.7 : 0.25, b.meteor ? 1.2 : 0.7, 0.4, 1.8, 0, 1);
  });
  for(const id in FX.bombs) if(!seen[id]){ FX.scene.remove(FX.bombs[id].g); delete FX.bombs[id]; }
  // warnings on the floor: landings, slams, tentacles, tears
  G.marks.forEach(m=>{ if(!m.fx){ m.fx = FX.warn(m.x, m.y, m.r, m.t, MARK[m.kind] || 0xff3a2a); } });
};

})();
