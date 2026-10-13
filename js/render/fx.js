/* ------------------------------------------------------------------ *
 *  Effects: one pool of sparks for everything that bursts or drifts
 *  (Gloom Shooter's), a layer that draws every shot in flight, rings
 *  for blasts and spells, lightning, and the ground markers that warn
 *  you where a bomb or a king is about to land.
 *
 *  Enemy shots get a dark rim and a white core so they read against
 *  anything; your shots glow in their element's colour.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, S = DG.Stage;
const FX = DG.FX = {};

const N = 3000, NB = 1500;
let P, pts, alive = 0, B, bpts, bglow;

function scaleNow(){ return S.renderer.domElement.height/2/Math.tan(S.camera.fov*Math.PI/360); }

FX.init = function(scene){
  FX.scene = scene;
  // sparks
  P = { pos:new Float32Array(N*3), col:new Float32Array(N*3), size:new Float32Array(N), vel:new Float32Array(N*3), life:new Float32Array(N), max:new Float32Array(N), grav:new Float32Array(N), drag:new Float32Array(N), base:new Float32Array(N*3) };
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P.pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("color", new THREE.BufferAttribute(P.col, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("aSize", new THREE.BufferAttribute(P.size, 1).setUsage(THREE.DynamicDrawUsage));
  FX.sparkMat = new THREE.ShaderMaterial({ uniforms:{ uScale:{ value:400 } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true,
    vertexShader:"attribute float aSize; varying vec3 vC; uniform float uScale; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = clamp(uScale*aSize/max(1.0, -mv.z), 0.0, 48.0); gl_Position = projectionMatrix*mv; }",
    fragmentShader:"varying vec3 vC; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; float k = 1.0 - d*2.0; gl_FragColor = vec4(vC*k*1.4, 1.0); }" });
  pts = new THREE.Points(g, FX.sparkMat); pts.frustumCulled = false; pts.renderOrder = 5;
  scene.add(pts);

  // shots in flight: a solid sprite each (rimmed for enemy shots) and a glow under it
  B = { pos:new Float32Array(NB*3), col:new Float32Array(NB*3), size:new Float32Array(NB), rim:new Float32Array(NB) };
  const bg = new THREE.BufferGeometry();
  bg.setAttribute("position", new THREE.BufferAttribute(B.pos, 3).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("color", new THREE.BufferAttribute(B.col, 3).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("aSize", new THREE.BufferAttribute(B.size, 1).setUsage(THREE.DynamicDrawUsage));
  bg.setAttribute("aRim", new THREE.BufferAttribute(B.rim, 1).setUsage(THREE.DynamicDrawUsage));
  FX.shotMat = new THREE.ShaderMaterial({ uniforms:{ uScale:{ value:400 } }, transparent:true, depthWrite:false, vertexColors:true,
    vertexShader:"attribute float aSize; attribute float aRim; varying vec3 vC; varying float vR; uniform float uScale; void main(){ vC = color; vR = aRim; vec4 mv = modelViewMatrix*vec4(position, 1.0); gl_PointSize = clamp(uScale*aSize/max(1.0, -mv.z), 2.0, 64.0); gl_Position = projectionMatrix*mv; }",
    fragmentShader:["varying vec3 vC; varying float vR;",
      "void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard;",
      "  vec3 c = mix(vec3(1.0), vC, smoothstep(0.12, 0.3, d));",
      "  if(vR > 0.5 && d > 0.38) c = vec3(0.05, 0.0, 0.05);",
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
  (FX.items || []).forEach(i=> i.obj && FX.scene.remove(i.obj)); FX.items = [];
  for(const k in FX.bombs) FX.scene.remove(FX.bombs[k].g); FX.bombs = {};
};

const _c = new THREE.Color();
function emit(x, y, z, vx, vy, vz, col, size, life, grav, drag){
  let i = -1;
  for(let k=0;k<64;k++){ const j = (alive + k) % N; if(P.life[j] <= 0){ i = j; break; } }
  if(i < 0) i = alive % N;
  alive = (i + 1) % N;
  P.pos[i*3] = x; P.pos[i*3+1] = y; P.pos[i*3+2] = z;
  P.vel[i*3] = vx; P.vel[i*3+1] = vy; P.vel[i*3+2] = vz;
  const c = typeof col === "number" ? _c.setHex(col) : col;
  P.base[i*3] = c.r; P.base[i*3+1] = c.g; P.base[i*3+2] = c.b;
  P.size[i] = size; P.life[i] = life; P.max[i] = life; P.grav[i] = grav || 0; P.drag[i] = drag === undefined ? 2 : drag;
}
FX.emit = emit;

/* sparks bursting from (x, y, z) in the world */
FX.burst = function(x, y, z, col, n, speed, size, life, opts){
  opts = opts || {};
  for(let i=0;i<n;i++){
    const a = Math.random()*6.283, e = opts.flat ? Math.random()*0.3 : Math.random()*1.4 - 0.2, s = speed*(0.3 + Math.random()*0.7);
    const c = opts.col2 !== undefined && Math.random() < 0.5 ? opts.col2 : col;
    emit(x + (Math.random() - 0.5)*(opts.spread || 0), y, z + (Math.random() - 0.5)*(opts.spread || 0),
      Math.cos(a)*Math.cos(e)*s, Math.sin(e)*s + (opts.up || 0), Math.sin(a)*Math.cos(e)*s, c, size*(0.6 + Math.random()*0.6), life*(0.6 + Math.random()*0.6), opts.grav || 0, opts.drag);
  }
};
FX.rise = function(x, z, col, n, r, opts){
  opts = opts || {};
  for(let i=0;i<n;i++){ const a = Math.random()*6.28, d = Math.sqrt(Math.random())*(r || 0.6);
    emit(x + Math.cos(a)*d, (opts.y || 0.1) + Math.random()*0.3, z + Math.sin(a)*d, 0, (opts.v || 1.2) + Math.random()*1.2, 0, col, (opts.size || 0.25) + Math.random()*0.15, (opts.life || 0.9) + Math.random()*0.5, 0, 0.6); }
};

/* a flat ring on the ground that grows and fades */
FX.ring = function(x, z, r, col, life, opts){
  opts = opts || {};
  const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 32), new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
  m.rotation.x = -Math.PI/2; m.position.set(x, opts.y || 0.08, z);
  FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, update(it, dt){ const k = it.t/it.life; m.scale.setScalar(Math.max(0.01, r*(opts.from === undefined ? 0.2 + 0.8*Math.sqrt(k) : opts.from + (1 - opts.from)*k))); m.material.opacity = 0.9*(1 - k); } });
};
/* a flash disc */
FX.disc = function(x, z, r, col, life){
  const m = new THREE.Mesh(K.glowPlane, K.glowMat(col, 0.9)); m.position.set(x, 0.1, z); m.scale.set(r*2.6, 1, r*2.6); FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, update(it){ m.material.opacity = 0.9*(1 - it.t/it.life); } });
};
/* lightning between two points, re-jagged every frame it lives */
FX.arc = function(x1, z1, x2, z2, col, life){
  const n = 8, pos = new Float32Array((n + 1)*3), g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color:col || 0xfff04a, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
  FX.scene.add(line);
  const jag = ()=>{
    for(let i=0;i<=n;i++){ const t = i/n, j = (i === 0 || i === n) ? 0 : 0.35;
      pos[i*3] = x1 + (x2 - x1)*t + (Math.random() - 0.5)*j; pos[i*3+1] = 0.8 + (Math.random() - 0.5)*j; pos[i*3+2] = z1 + (z2 - z1)*t + (Math.random() - 0.5)*j; }
    g.attributes.position.needsUpdate = true;
  };
  jag();
  FX.items.push({ obj:line, t:0, life:life || 0.18, update(it){ jag(); line.material.opacity = 1 - it.t/it.life; } });
};
/* a warning on the floor: a circle that fills up as the danger arrives */
FX.warn = function(x, z, r, life, col){
  const g = new THREE.Group(); g.position.set(x, 0.07, z);
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 32), new THREE.MeshBasicMaterial({ color:col || 0xff3a2a, transparent:true, opacity:0.85, depthWrite:false, side:THREE.DoubleSide }));
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color:col || 0xff3a2a, transparent:true, opacity:0.25, depthWrite:false, side:THREE.DoubleSide }));
  edge.rotation.x = fill.rotation.x = -Math.PI/2; g.add(edge); g.add(fill); g.scale.setScalar(r);
  FX.scene.add(g);
  const it = { obj:g, t:0, life, update(it){ const k = Math.min(1, it.t/it.life); fill.scale.setScalar(Math.max(0.01, k)); edge.material.opacity = 0.5 + 0.4*Math.sin(it.t*20); } };
  FX.items.push(it);
  return it;
};
/* a line on the floor: where the brute is about to charge */
FX.lane = function(x, z, a, len, w, life){
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, w), new THREE.MeshBasicMaterial({ color:0xff3a2a, transparent:true, opacity:0.3, depthWrite:false, side:THREE.DoubleSide }));
  m.geometry.translate(len/2, 0, 0); m.rotation.x = -Math.PI/2; m.rotation.z = -a; m.position.set(x, 0.07, z);
  FX.scene.add(m);
  FX.items.push({ obj:m, t:0, life, update(it){ m.material.opacity = 0.2 + 0.25*Math.abs(Math.sin(it.t*14)); } });
};
/* a mesh that hangs about for a while (thrown debris, gibs) */
FX.temp = function(obj, life, update){ FX.scene.add(obj); FX.items.push({ obj, t:0, life, update }); };

const EL = el=> el && DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
const ENEMY_SHOT = { orb:[0xff3a8a, 0.42], rock:[0xa89a88, 0.32], dart:[0xb8a07a, 0.24], hex:[0xb36bff, 0.36], spore:[0xb8d84a, 0.38], ecto:[0x8ae8ff, 0.46],
  wail:[0xa8c8ff, 0.4], arrow:[0xe8dcc0, 0.26], tear:[0x6ad8ff, 0.36], blood:[0xff2a3a, 0.42] };
const MARK = { flop:0xff3a2a, slam:0xff3a2a, tentacle:0xd84aff, tear:0x6ad8ff, shroomring:0x9cff3a, vein:0xff2a3a, swipe:0xff6a3a };

/* ---- per frame ---- */
FX.update = function(dt, G){
  const sc = scaleNow(); FX.sparkMat.uniforms.uScale.value = sc; FX.shotMat.uniforms.uScale.value = sc;
  for(let i=0;i<N;i++){
    if(P.life[i] <= 0){ if(P.size[i]){ P.size[i] = 0; } continue; }
    P.life[i] -= dt;
    const k = Math.max(0, P.life[i]/P.max[i]), d = Math.exp(-P.drag[i]*dt);
    P.vel[i*3] *= d; P.vel[i*3+1] = P.vel[i*3+1]*d - P.grav[i]*dt; P.vel[i*3+2] *= d;
    P.pos[i*3] += P.vel[i*3]*dt; P.pos[i*3+1] = Math.max(0.03, P.pos[i*3+1] + P.vel[i*3+1]*dt); P.pos[i*3+2] += P.vel[i*3+2]*dt;
    P.col[i*3] = P.base[i*3]*k; P.col[i*3+1] = P.base[i*3+1]*k; P.col[i*3+2] = P.base[i*3+2]*k;
    if(P.life[i] <= 0) P.size[i] = 0;
  }
  pts.geometry.attributes.position.needsUpdate = true; pts.geometry.attributes.color.needsUpdate = true; pts.geometry.attributes.aSize.needsUpdate = true;
  // items
  FX.items = FX.items.filter(it=>{
    it.t += dt;
    if(it.update) it.update(it, dt);
    if(it.t >= it.life){ FX.scene.remove(it.obj); if(it.obj.geometry && it.obj.geometry !== K.glowPlane) it.obj.geometry.dispose(); return false; }
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
      if(b.kind === "fireball"){ size = 0.8; if(Math.random() < 0.7) emit(b.x, y, b.y, (Math.random() - 0.5), Math.random(), (Math.random() - 0.5), 0xff7a1a, 0.5, 0.35, 0, 1); }
      if(b.kind === "missile" && Math.random() < 0.6) emit(b.x, y, b.y, 0, 0.2, 0, 0xb36bff, 0.25, 0.3, 0, 1);
      if(b.kind === "grenade"){ size = 0.42; y = 0.6 + Math.sin(Math.min(1, b.t*1.5)*Math.PI)*0.6; }
      if(els.indexOf("poison") >= 0 && Math.random() < 0.12) emit(b.x, y, b.y, 0, -0.3, 0, 0x7dff3a, 0.15, 0.4, 0, 1);
      if(els.indexOf("fire") >= 0 && Math.random() < 0.12) emit(b.x, y, b.y, 0, 0.6, 0, 0xff7a1a, 0.18, 0.3, 0, 1);
      if(els.indexOf("frost") >= 0 && Math.random() < 0.08) emit(b.x, y, b.y, 0, 0, 0, 0xcff0ff, 0.14, 0.4, 0, 1);
      if(b.orbitLeft) y = 0.9;
    } else {
      const E = ENEMY_SHOT[b.kind] || ENEMY_SHOT.orb; col = E[0]; size = E[1]*(b.r > 0.2 ? 1.2 : 1); rim = 1; y = 0.6;
    }
    _c.setHex(col);
    B.pos[n*3] = b.x; B.pos[n*3+1] = y; B.pos[n*3+2] = b.y;
    B.col[n*3] = _c.r; B.col[n*3+1] = _c.g; B.col[n*3+2] = _c.b;
    B.size[n] = size; B.rim[n] = rim; B.gsize[n] = size*(b.team === "p" ? 3 : 2.2);
    n++;
  }
  for(let i=n;i<NB;i++){ if(!B.size[i]) break; B.size[i] = 0; B.gsize[i] = 0; }
  B.geo.setDrawRange(0, n); B.ggeo.setDrawRange(0, n);
  ["position", "color", "aSize", "aRim"].forEach(k=> B.geo.attributes[k].needsUpdate = true);
  B.ggeo.attributes.aSize.needsUpdate = true;
  // bombs: an arc through the air, then a fizzing wait
  const seen = {};
  G.bombs.forEach(b=>{
    seen[b.id] = 1;
    let o = FX.bombs[b.id];
    if(!o){
      const g = new THREE.Group();
      const look = b.junk ? [new THREE.BoxGeometry(0.3, 0.3, 0.3), 0x7a5232] : b.spore ? [new THREE.SphereGeometry(0.2, 8, 6), 0xb8d84a] : b.meteor ? [new THREE.DodecahedronGeometry(0.35), 0x5a2a1a] : b.team === "p" ? [new THREE.SphereGeometry(0.3, 10, 8), 0x2a2a3a] : [new THREE.SphereGeometry(0.17, 7, 5), 0x1a1a1e];
      g.add(new THREE.Mesh(look[0], K.lambert(look[1])));
      const fuse = K.sprite(b.meteor ? 0xff6a1a : 0xffa040, b.meteor ? 1.6 : 0.5, 1); fuse.position.y = b.meteor ? 0 : 0.2; g.add(fuse);
      FX.scene.add(g);
      o = FX.bombs[b.id] = { g, fuse, warn:FX.warn(b.tx, b.ty, Math.max(0.6, b.r), b.flight + b.fuse, b.team === "p" ? 0x46e4ff : b.spore ? 0x9cff3a : 0xff3a2a) };
    }
    const k = Math.min(1, b.t/b.flight);
    if(b.meteor) o.g.position.set(b.tx, 0.2 + (1 - k)*9, b.ty);
    else o.g.position.set(b.x + (b.tx - b.x)*k, 0.2 + Math.sin(k*Math.PI)*2.2, b.y + (b.ty - b.y)*k);
    o.g.rotation.x += 0.2; o.g.rotation.z += 0.13;
    o.fuse.material.opacity = k >= 1 ? 0.5 + 0.5*Math.sin(b.t*30) : 1;
    if(Math.random() < 0.5) emit(o.g.position.x, o.g.position.y + 0.2, o.g.position.z, 0, 0.6, 0, 0xffa040, 0.15, 0.3, 0, 1);
  });
  for(const id in FX.bombs) if(!seen[id]){ FX.scene.remove(FX.bombs[id].g); delete FX.bombs[id]; }
  // warnings on the floor: landings, slams, tentacles, tears
  G.marks.forEach(m=>{ if(!m.fx){ m.fx = FX.warn(m.x, m.y, m.r, m.t, MARK[m.kind] || 0xff3a2a); } });
};

})();
