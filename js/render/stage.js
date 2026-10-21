/* ------------------------------------------------------------------ *
 *  The stage: renderer, lights and the camera.
 *
 *  There is one look and no graphics options: etched, at full resolution
 *  (dropping a little when frames run slow), with lantern shadows.
 *
 *  The camera hangs above and behind the wizard, looking down at about
 *  48°, close enough that the walls show their faces, and leans a little
 *  toward the cursor (so you see where you aim). It eases back in a fight.
 *  Zippy's lantern is the one light that casts shadows.
 *  Lights: a dim cave fill, the wizard's own glow, and a small pool of
 *  point lights that move to the torches nearest the wizard (a fixed
 *  number of lights, so the shaders never recompile).
 *
 *  The look: the scene is drawn into a low-res target, then one pass
 *  inks it. Lines go wherever depth jumps (so walls, props and decor are
 *  outlined like the characters), each floor grades the colours its own
 *  way, the corners sink into the floor's fog, a little grain moves over
 *  everything, and the deeper floors make the picture swim at its edges.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const S = DG.Stage = {};

// every light costs every lit pixel (the floors are physically based): six torches
// light the room you're in; the rest of the dungeon stays dark anyway
S.TORCH_LIGHTS = 6;

S.init = function(){
  const r = S.renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:"high-performance" });
  r.setPixelRatio(1);
  document.getElementById("view").appendChild(r.domElement);
  // full resolution by default now (P still gives the old chunky pixels)
  // one look, no options: etched, crisp, lantern shadows on (old saved choices are ignored)
  S.pixel = false;

  const scene = S.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  S.camera = new THREE.PerspectiveCamera(34, 1, 0.5, 200);

  S.hemi = new THREE.HemisphereLight(0x8a90a8, 0x1a140e, 0.7);
  scene.add(S.hemi);
  // a cold, low moon from one side, so every shape has a lit face and a dark one
  S.fill = new THREE.DirectionalLight(0x8a98c0, 0.55); S.fill.position.set(-0.7, 1, 0.35); scene.add(S.fill);
  // Zippy carries a warm, guttering lantern light
  S.playerLight = new THREE.PointLight(0xffdcb4, 1.5, 10, 1.8);
  scene.add(S.playerLight);
  // the one light that casts (Ash & Ember phase 3): everything near Zippy throws
  // a hard shadow away from his lantern, into the dark. Other lights stay cheap.
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  // the shadow map is redrawn every frame (needsUpdate in the loop; autoUpdate off
  // so nothing else, like the warm-up's render, redraws it twice)
  r.shadowMap.autoUpdate = false;
  S.shadows = true;
  const sh = S.playerLight.shadow; sh.mapSize.set(1024, 1024); sh.camera.near = 0.25; sh.camera.far = 11; sh.bias = -0.003; sh.normalBias = 0.03; sh.radius = 2.5;
  // (the shadow reaches no further than the lantern's light, set per floor in S.theme.
  // Past that it only cost a sixfold redraw of things nobody can see lit)
  S.playerLight.castShadow = S.shadows;
  S.torches = [];
  for(let i=0;i<S.TORCH_LIGHTS;i++){ const l = new THREE.PointLight(0xffa04a, 0, 8, 1.8); scene.add(l); S.torches.push(l); }
  S.flash = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(S.flash);
  // adding or removing a light, or turning a shadow on or off, rebuilds every
  // shader in the scene, which is a long freeze. So the lights never change: a
  // scene that needs one of its own (the ending's hearth) borrows the last torch
  // light (S.held; the world leaves it alone)
  S.held = null;

  S.fancy = true; S.etch = false;
  K.INK.uEtch.value = S.fancy && S.etch ? 1 : 0; K.INK.uOutK.value = K.INK.uEtch.value ? 2 : 1;
  S.initPost();
  // closer and a little lower than a straight top-down: characters read as
  // standing figures, not squashed lids
  // lower and closer than before (Ash & Ember phase 2): figures are bigger, walls
  // show their faces, and the room stops looking like a board seen from above;
  // zoom eases out a little in a fight (main.js), so an arena still fits
  S.rig = { x:0, z:0, tx:0, tz:0, dist:15.5, pitch:0.84, shake:0, lead:0.22, zoom:1, zoomWant:1 };
  S.initPortrait();
  S.clock = new THREE.Clock();
  S.updaters = [];
  S.resize();
  window.addEventListener("resize", S.resize);
  S.loop();
};

S.resize = function(){
  const w = window.innerWidth, h = window.innerHeight;
  // S.dyn: the adaptive resolution (1 is full; it drops when frames run slow)
  const k = (S.pixel ? Math.max(1, h/500) : Math.min(window.devicePixelRatio || 1, 1.25)**-1)/(S.dyn || 1);
  S.scale = k;
  S.renderer.setSize(Math.round(w/k), Math.round(h/k), false);
  if(S.post){
    const bw = Math.round(w/k), bh = Math.round(h/k); S.post.rt.setSize(bw, bh); S.post.mat.uniforms.uRes.value.set(bw, bh);
    // a render target's texture can't be flagged needsUpdate (three.js would
    // upload it like an image and throw); a new filter needs the target rebuilt
    const f = S.pixel ? THREE.NearestFilter : THREE.LinearFilter, tx = S.post.rt.texture;
    if(tx.minFilter !== f){ tx.minFilter = tx.magFilter = f; S.post.rt.dispose(); }
  }
  const c = S.renderer.domElement; c.style.width = w + "px"; c.style.height = h + "px";
  c.style.imageRendering = S.pixel ? "pixelated" : "auto";
  S.camera.aspect = w/h; S.camera.updateProjectionMatrix();
  // the post pass rebuilds positions from depth (for its ambient occlusion): it needs the lens
  if(S.post){ const ty = Math.tan(S.camera.fov*Math.PI/360); S.post.mat.uniforms.uProj.value.set(ty*S.camera.aspect, ty); }
  K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uScale) m.uniforms.uScale.value = h/k/2; });
};
S.initPost = function(){
  const rt = new THREE.WebGLRenderTarget(16, 16, { minFilter:THREE.LinearFilter, magFilter:THREE.LinearFilter });
  rt.depthTexture = new THREE.DepthTexture(16, 16); rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({
    uniforms:{ tCol:{ value:rt.texture }, tDep:{ value:rt.depthTexture }, uRes:{ value:new THREE.Vector2(16, 16) }, uNear:{ value:S.camera.near }, uFar:{ value:S.camera.far },
      uProj:{ value:new THREE.Vector2(1, 1) }, uAO:{ value:1.0 },
      uTime:{ value:0 }, uWeird:{ value:0 }, uEdge:{ value:0.045 }, uVig:{ value:0.85 }, uHurt:{ value:0 },
      uInk:K.INK.uInk, uShade:{ value:new THREE.Color(0x0c0c10) }, uHigh:{ value:new THREE.Color(0xffe2b0) }, uFog:{ value:new THREE.Color(0x0d0a0a) },
      uDesat:{ value:0.18 }, uBloom:{ value:0.6 } },
    depthTest:false, depthWrite:false,
    vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader:[
      "uniform sampler2D tCol, tDep; uniform vec2 uRes, uProj; uniform float uNear, uFar, uTime, uWeird, uEdge, uVig, uHurt, uDesat, uBloom, uAO;",
      "uniform vec3 uInk, uShade, uHigh, uFog; varying vec2 vUv;",
      "float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }",
      "float lin(vec2 uv){ float z = texture2D(tDep, uv).r*2.0 - 1.0; return 2.0*uNear*uFar/(uFar + uNear - z*(uFar - uNear)); }",
      "vec3 vpos(vec2 uv){ float d = lin(uv); return vec3((uv*2.0 - 1.0)*uProj*d, -d); }",
      "float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }",
      // anti-aliasing (FXAA, the short form): blend along an edge, never across it
      "vec3 fxaa(vec2 uv, vec2 px){",
      "  vec3 nw = texture2D(tCol, uv + vec2(-1.0, -1.0)*px).rgb, ne = texture2D(tCol, uv + vec2(1.0, -1.0)*px).rgb;",
      "  vec3 sw = texture2D(tCol, uv + vec2(-1.0, 1.0)*px).rgb, se = texture2D(tCol, uv + vec2(1.0, 1.0)*px).rgb, m = texture2D(tCol, uv).rgb;",
      "  float lNW = luma(nw), lNE = luma(ne), lSW = luma(sw), lSE = luma(se), lM = luma(m);",
      "  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));",
      "  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));",
      "  float red = max((lNW + lNE + lSW + lSE)*0.03125, 1.0/128.0), rcp = 1.0/(min(abs(dir.x), abs(dir.y)) + red);",
      "  dir = clamp(dir*rcp, vec2(-8.0), vec2(8.0))*px;",
      "  vec3 a = 0.5*(texture2D(tCol, uv + dir*(1.0/3.0 - 0.5)).rgb + texture2D(tCol, uv + dir*(2.0/3.0 - 0.5)).rgb);",
      "  vec3 b = a*0.5 + 0.25*(texture2D(tCol, uv - dir*0.5).rgb + texture2D(tCol, uv + dir*0.5).rgb);",
      "  float lB = luma(b); return (lB < lMin || lB > lMax) ? a : b; }",
      "void main(){",
      "  vec2 uv = vUv, c = uv - 0.5; float r2 = dot(c, c);",
      // the deep floors breathe: the edges of the picture swim and split
      "  uv += uWeird*0.0055*vec2(sin(uv.y*17.0 + uTime*1.7), cos(uv.x*13.0 + uTime*1.3))*smoothstep(0.04, 0.3, r2);",
      "  vec2 px = 1.0/uRes;",
      "  vec3 col = fxaa(uv, px);",
      "  float ca = uWeird*0.012*r2;",
      "  if(ca > 0.0001){ col.r = texture2D(tCol, uv + c*ca).r; col.b = texture2D(tCol, uv - c*ca).b; }",
      // ambient occlusion from the depth alone: every crease, corner and foot sinks
      // into shade. Positions are rebuilt from depth, the surface's facing from its
      // neighbours, and 16 taps in a spiral ask how much stands over it.
      "  float d0 = lin(uv), ao = 1.0;",
      "  if(d0 < 60.0){",
      "    vec3 P = vpos(uv), ax = vpos(uv + vec2(px.x, 0.0)) - P, ay = vpos(uv + vec2(0.0, px.y)) - P;",
      "    vec3 bx = P - vpos(uv - vec2(px.x, 0.0)), by = P - vpos(uv - vec2(0.0, px.y));",
      "    if(dot(bx, bx) < dot(ax, ax)) ax = bx; if(dot(by, by) < dot(ay, ay)) ay = by;",
      "    vec3 N = normalize(cross(ax, ay)); if(N.z < 0.0) N = -N;",
      "    float rp = 0.6/(2.0*uProj.y*d0), occ = 0.0, jit = ph(floor(gl_FragCoord.xy))*6.2832;",
      "    for(int i=0;i<16;i++){",
      "      float t = (float(i) + 0.5)/16.0, a = float(i)*2.39996 + jit;",
      "      vec3 v = vpos(uv + vec2(cos(a)*uRes.y/uRes.x, sin(a))*rp*t) - P; float vv = dot(v, v);",
      "      occ += max(0.0, dot(v, N) - 0.03)/(vv + 0.02)*smoothstep(1.0, 0.35, vv);",
      "    }",
      "    ao = clamp(1.0 - occ/16.0*0.42*uAO, 0.0, 1.0);",
      "  }",
      "  col *= mix(0.25, 1.0, ao);",
      // a faint line where depth jumps, so figures read against the floor (no cartoon ink)
      "  float dn = lin(uv - vec2(px.x, 0.0)) + lin(uv + vec2(px.x, 0.0)) + lin(uv + vec2(0.0, px.y)) + lin(uv - vec2(0.0, px.y));",
      "  float e = max(0.0, dn - 4.0*d0)/d0;",
      "  col = mix(col, uInk, smoothstep(uEdge, uEdge*2.2, e)*0.22);",
      // bloom: what burns bright (candles, eyes, spells) bleeds into the dark around it
      "  vec3 bl = vec3(0.0); float bw = 0.0;",
      "  for(int i=0;i<8;i++){ float a = float(i)*2.39996 + 0.5, rr = 2.5 + float(i)*2.4;",
      "    vec2 o = vec2(cos(a), sin(a))*rr*px*(uRes.y/540.0); vec3 s = texture2D(tCol, uv + o).rgb;",
      "    float w = 1.0/(1.0 + float(i)*0.25); bl += max(s - 0.72, 0.0)*w; bw += w; }",
      "  col += bl/bw*uBloom*1.8;",
      // the grade: a little colour drained, shadows cooled toward the floor's shade,
      // lights warmed, and a film shoulder so bright things roll off instead of clipping
      "  float l = luma(col);",
      "  col = mix(col, vec3(l), uDesat);",
      "  col = mix(col, col*0.7 + uShade*0.5, (1.0 - smoothstep(0.0, 0.25, l))*0.4);",
      "  col = mix(col, col*0.9 + uHigh*0.18*l, smoothstep(0.4, 1.0, l)*0.5);",
      "  col = 1.0 - exp(-col*1.45);",
      "  col = col*col*(3.0 - 2.0*col)*0.25 + col*0.75;",
      // corners sink into the dark (and pulse, deep down)
      "  float v = smoothstep(0.1, 0.62, r2*(1.6 + uWeird*0.25*sin(uTime*1.1)));",
      "  col = mix(col, uFog*0.3, v*uVig);",
      "  col = mix(col, vec3(0.45, 0.0, 0.02), uHurt*smoothstep(0.05, 0.45, r2));",
      // a fine, still grain over everything, heavier in the dark
      "  float n = ph(floor(gl_FragCoord.xy) + 0.37);",
      "  col += (n - 0.5)*0.028*(0.5 + 0.5*(1.0 - l));",
      "  gl_FragColor = vec4(col, 1.0);",
      "}"].join("\n")
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(quad);
  S.post = { rt, mat, scene, cam:new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
};
/* the portrait: a close-up of Zippy and Gribbus in a corner of the screen,
   drawn from its own little scene after the main picture (the view fills
   it, the HUD frames it) */
S.initPortrait = function(){
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0a0c);
  scene.add(new THREE.HemisphereLight(0xc8c0b0, 0x1a1418, 0.7));
  const key = new THREE.DirectionalLight(0xffd8a8, 0.95); key.position.set(2, 2.5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8aa0d8, 0.7); rim.position.set(-2.5, 1.5, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(31, 1, 0.1, 50);
  cam.position.set(0.15, 1.55, 4.25); cam.lookAt(0.15, 1.08, 0);
  const root = new THREE.Group(); scene.add(root);
  S.portrait = { scene, cam, root, rect:null, on:false };
};
S.renderPortrait = function(){
  const P = S.portrait, r = P && P.rect;
  if(!P || !P.on || !r || !P.root.children.length) return;
  const R = S.renderer, k = S.scale, H = R.domElement.height;
  const x = Math.round(r.x/k), y = Math.round(H - (r.y + r.h)/k), w = Math.max(8, Math.round(r.w/k)), h = Math.max(8, Math.round(r.h/k));
  P.cam.aspect = w/h; P.cam.updateProjectionMatrix();
  R.setScissorTest(true); R.setScissor(x, y, w, h); R.setViewport(x, y, w, h);
  R.render(P.scene, P.cam);
  R.setScissorTest(false); R.setViewport(0, 0, R.domElement.width, R.domElement.height);
};
/* each floor's mood: darker and foggier the deeper you go, and darker still if cursed */
S.theme = function(th, curses){
  curses = curses || [];
  const dark = curses.indexOf("dark") >= 0, fog = curses.indexOf("fog") >= 0;
  S.lastTheme = [th, curses];
  // etched, the room is lit by its lights, not by a flat wash: the ambient drops,
  // the lantern and torches carry the picture, and shadow becomes hatching (never black)
  // the room is lit by its lights, not a flat wash: a low ambient, the lantern and torches carry it
  const amb = 0.16;
  S.scene.background = new THREE.Color(th.fog);
  S.scene.fog = new THREE.Fog(th.fog, fog ? 12 : 22, fog ? 27 : 48);
  S.hemi.color.setHex(th.ambient || 0xa8b0d8);
  S.hemi.intensity = 1.0*(th.light || 1)*(dark ? 0.55 : 1)*amb;
  S.fill.intensity = 0.75*(th.light || 1)*(dark ? 0.5 : 1)*(amb < 1 ? 0.22 : 1);
  // the lantern: a hard pool of light around him that falls off fast, so the room
  // beyond is the torches' and the dark's (its shadow reaches exactly as far)
  S.playerLight.distance = dark ? 8.5 : 11; S.playerLight.decay = 2.2;
  S.playerLight.intensity = dark ? 3.2 : 3.4;
  S.playerLight.shadow.camera.far = S.playerLight.distance;
  // the ink: line colour, rim colour, grade, and how weird the picture gets
  K.INK.uInk.value.setHex(th.ink || 0x0a0612);
  K.INK.uRim.value.setHex(th.rim || 0x8a7aff);
  K.INK.uLift.value = dark ? 0.018 : 0.028;
  const u = S.post.mat.uniforms;
  u.uShade.value.setHex(th.shade || 0x0c0c10); u.uHigh.value.setHex(th.high || 0xffe2b0); u.uFog.value.setHex(th.fog);
  u.uWeird.value = th.weird || 0; u.uVig.value = dark ? 0.95 : 0.72;
  // the Gloom: how far it has taken the floors and walls
  const lum = c=>{ const k = new THREE.Color(c); return (k.r + k.g + k.b)/3; };
  K.GLOOM.uGloom.value = th.gloom || 0;
  K.GLOOM.uFloorLum.value = Math.max(0.05, lum(th.floor)*1.35);
  K.GLOOM.uWallLum.value = Math.max(0.05, lum(th.wall)*1.2*0.75);
};

/* follow (x, z), leaning toward the aim point (ax, az) */
S.follow = function(x, z, ax, az, snap){
  const R = S.rig;
  R.tx = x + (ax - x)*R.lead; R.tz = z + (az - z)*R.lead;
  if(snap){ R.x = R.tx; R.z = R.tz; }
};
S.shake = function(n){ S.rig.shake = Math.min(1.2, Math.max(S.rig.shake, n)); };
S.updateCamera = function(dt){
  const R = S.rig, k = 1 - Math.exp(-dt*8);
  R.x += (R.tx - R.x)*k; R.z += (R.tz - R.z)*k;
  R.zoom += ((R.zoomWant || 1) - R.zoom)*(1 - Math.exp(-dt*1.5));
  const dist = R.dist*R.zoom;
  const sx = (Math.random() - 0.5)*R.shake, sz = (Math.random() - 0.5)*R.shake; R.shake *= Math.exp(-dt*10);
  S.camera.position.set(R.x + sx, Math.sin(R.pitch)*dist, R.z + Math.cos(R.pitch)*dist + sz);
  S.camera.lookAt(R.x + sx*0.5, 0, R.z + sz*0.5);
};

/* adaptive resolution: if frames run slow for a few seconds, draw fewer pixels
   (down to 60% of the screen's), then, as a last step, a coarser lantern shadow.
   It only ever steps down, and rarely: every step reallocates the frame's
   buffers (a hitch you can feel), so stepping up and down around the limit
   was a stutter of its own. Shadows are still drawn every frame (redrawing them
   every other frame made every other frame heavy: a judder), and never
   switched off (that rebuilds every shader, a freeze). */
S.dyn = 1;
S.adapt = function(raw){
  if(raw > 0.25){ S.adaptT = 0; return; }      // a hitch (tab switch, load): start the count again
  S.ft = S.ft === undefined ? raw : S.ft*0.97 + raw*0.03;
  S.adaptT = (S.adaptT || 0) + raw;
  if(S.adaptT < 4 || S.ft < 1/42) return;
  S.adaptT = 0;
  if(S.dyn > 0.6){ S.dyn = Math.max(0.6, S.dyn - 0.2); S.ft = 1/50; S.resize(); }
  else if(S.playerLight.shadow.mapSize.x > 512){
    const sh = S.playerLight.shadow; sh.mapSize.set(512, 512);
    if(sh.map){ sh.map.dispose(); sh.map = null; }
  }
};
S.loop = function(){
  requestAnimationFrame(S.loop);
  const raw = S.clock.getDelta(), dt = Math.min(0.05, raw), t = S.clock.elapsedTime;
  S.adapt(raw);
  K.tick(t);
  S.updaters.forEach(f=> f(dt, t));
  S.updateCamera(dt);
  S.renderer.shadowMap.needsUpdate = true;
  if(S.fancy){
    S.post.mat.uniforms.uTime.value = t;
    S.renderer.setRenderTarget(S.post.rt); S.renderer.render(S.scene, S.camera);
    S.renderer.setRenderTarget(null); S.renderer.render(S.post.scene, S.post.cam);
  } else S.renderer.render(S.scene, S.camera);
  S.renderPortrait();
};
S.onFrame = f=>{ S.updaters.push(f); return ()=>{ S.updaters = S.updaters.filter(g=> g !== f); }; };

/* smooth motion. The game steps 60 times a second; the screen draws at its own
   rate (often 120 or 144, and even at 60 never exactly in step), so some frames
   get no step and some get two, and anything drawn straight from the game
   judders. Before each step S.snap records where things were; they're drawn
   S.alpha of the way from there to where they are now (one step behind, which
   nobody can see). A jump (a blink, a new room) is drawn as a jump. */
const PREV = new WeakMap();
S.alpha = 1;
S.snap = function(list){
  for(let i=0;i<list.length;i++){
    const e = list[i]; let o = PREV.get(e);
    if(!o){ o = { x:0, y:0, a:0 }; PREV.set(e, o); }
    o.x = e.x; o.y = e.y; o.a = e.aim || 0;
  }
};
const lerpable = (e, o)=> o && Math.abs(e.x - o.x) + Math.abs(e.y - o.y) < 1.5;
S.ix = e=>{ const o = PREV.get(e); return lerpable(e, o) ? o.x + (e.x - o.x)*S.alpha : e.x; };
S.iy = e=>{ const o = PREV.get(e); return lerpable(e, o) ? o.y + (e.y - o.y)*S.alpha : e.y; };
S.iaim = e=>{ const o = PREV.get(e); if(!o) return e.aim; let d = e.aim - o.a; d -= Math.round(d/(2*Math.PI))*2*Math.PI; return o.a + d*S.alpha; };

/* world → screen (CSS pixels) */
const _v = new THREE.Vector3();
S.project = function(x, y, z){
  _v.set(x, y, z).project(S.camera);
  return { x:(_v.x*0.5 + 0.5)*window.innerWidth, y:(-_v.y*0.5 + 0.5)*window.innerHeight, behind:_v.z > 1 };
};
/* screen → the ground plane at height h (for aiming) */
const _ray = new THREE.Raycaster(), _m = new THREE.Vector2(), _pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), _hit = new THREE.Vector3();
S.unproject = function(sx, sy, h){
  _m.set(sx/window.innerWidth*2 - 1, -(sy/window.innerHeight)*2 + 1);
  _ray.setFromCamera(_m, S.camera);
  _pl.constant = -(h || 0);
  return _ray.ray.intersectPlane(_pl, _hit) ? { x:_hit.x, z:_hit.z } : null;
};

})();
