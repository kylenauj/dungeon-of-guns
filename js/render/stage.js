/* ------------------------------------------------------------------ *
 *  The stage: renderer, lights and the camera.
 *
 *  Pine Hollow's trick: draw the game at a low resolution and scale it
 *  up with hard pixel edges, so the whole thing reads as chunky pixel
 *  art. P toggles it off.
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
 *  V toggles back to the plain picture.
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit;
const S = DG.Stage = {};

S.TORCH_LIGHTS = 8;

S.init = function(){
  const r = S.renderer = new THREE.WebGLRenderer({ antialias:false, powerPreference:"high-performance" });
  r.setPixelRatio(1);
  document.getElementById("view").appendChild(r.domElement);
  // full resolution by default now (P still gives the old chunky pixels)
  try{ S.pixel = localStorage.getItem("dungeonofguns.pixel2") === "1"; }catch(e){ S.pixel = false; }

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
  // the shadow map is redrawn every S.shadowEvery frames (more apart when frames run slow)
  r.shadowMap.autoUpdate = false; S.shadowEvery = 1; S.frameN = 0;
  try{ S.shadows = localStorage.getItem("dungeonofguns.shadows") !== "0"; }catch(e){ S.shadows = true; }
  const sh = S.playerLight.shadow; sh.mapSize.set(512, 512); sh.camera.near = 0.25; sh.camera.far = 16; sh.bias = -0.004; sh.normalBias = 0.03;
  S.playerLight.castShadow = S.shadows;
  S.torches = [];
  for(let i=0;i<S.TORCH_LIGHTS;i++){ const l = new THREE.PointLight(0xffa04a, 0, 8, 1.8); scene.add(l); S.torches.push(l); }
  S.flash = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(S.flash);
  // a spare light, always there and dark until a scene needs it (the ending's hearth):
  // adding or removing a light, or turning a shadow on or off, rebuilds every
  // shader in the scene, which is a long freeze. So the lights never change.
  S.spare = new THREE.PointLight(0xff8a2a, 0, 14, 1.6); scene.add(S.spare);

  try{ S.fancy = localStorage.getItem("dungeonofguns.ink") !== "0"; }catch(e){ S.fancy = true; }
  try{ S.etch = localStorage.getItem("dungeonofguns.etch") !== "0"; }catch(e){ S.etch = true; }
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
  const k = (S.pixel ? Math.max(1, h/500) : Math.min(window.devicePixelRatio || 1, 1.5)**-1)/(S.dyn || 1);
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
  K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uScale) m.uniforms.uScale.value = h/k/2; });
};
/* the look: etched (ink lines on paper, colour only in the light), ink (the
   older grim look), or plain (no post pass). V and the menu cycle them. */
S.lookName = ()=> !S.fancy ? "plain" : S.etch ? "etched" : "ink";
S.toggleInk = function(){
  if(S.fancy && S.etch) S.etch = false;
  else if(S.fancy) S.fancy = false;
  else { S.fancy = true; S.etch = true; }
  K.INK.uEtch.value = S.fancy && S.etch ? 1 : 0; K.INK.uOutK.value = K.INK.uEtch.value ? 2 : 1;
  if(S.lastTheme) S.theme(S.lastTheme[0], S.lastTheme[1]);
  try{ localStorage.setItem("dungeonofguns.ink", S.fancy ? "1" : "0"); localStorage.setItem("dungeonofguns.etch", S.etch ? "1" : "0"); }catch(e){}
  return S.lookName();
};
S.initPost = function(){
  const rt = new THREE.WebGLRenderTarget(16, 16, { minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter });
  rt.depthTexture = new THREE.DepthTexture(16, 16); rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({
    uniforms:{ tCol:{ value:rt.texture }, tDep:{ value:rt.depthTexture }, uRes:{ value:new THREE.Vector2(16, 16) }, uNear:{ value:S.camera.near }, uFar:{ value:S.camera.far },
      uTime:{ value:0 }, uWeird:{ value:0 }, uEdge:{ value:0.045 }, uVig:{ value:0.85 }, uHurt:{ value:0 },
      uInk:K.INK.uInk, uShade:{ value:new THREE.Color(0x0c0c10) }, uHigh:{ value:new THREE.Color(0xffe2b0) }, uFog:{ value:new THREE.Color(0x0d0a0a) },
      uDesat:{ value:0.42 }, uBloom:{ value:0.6 }, uEtch:K.INK.uEtch, uPaper:K.INK.uPaper },
    depthTest:false, depthWrite:false,
    vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader:[
      "uniform sampler2D tCol, tDep; uniform vec2 uRes; uniform float uNear, uFar, uTime, uWeird, uEdge, uVig, uHurt, uDesat, uBloom;",
      "uniform vec3 uInk, uShade, uHigh, uFog, uPaper; uniform float uEtch; varying vec2 vUv;",
      "float ph(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }",
      "float pn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(ph(i), ph(i + vec2(1, 0)), f.x), mix(ph(i + vec2(0, 1)), ph(i + vec2(1, 1)), f.x), f.y); }",
      "float lin(vec2 uv){ float z = texture2D(tDep, uv).r*2.0 - 1.0; return 2.0*uNear*uFar/(uFar + uNear - z*(uFar - uNear)); }",
      "void main(){",
      "  vec2 uv = vUv, c = uv - 0.5; float r2 = dot(c, c);",
      // the deep floors breathe: the edges of the picture swim and split
      "  uv += uWeird*0.0055*vec2(sin(uv.y*17.0 + uTime*1.7), cos(uv.x*13.0 + uTime*1.3))*smoothstep(0.04, 0.3, r2);",
      "  float ca = uWeird*0.012*r2;",
      "  vec3 col = vec3(texture2D(tCol, uv + c*ca).r, texture2D(tCol, uv).g, texture2D(tCol, uv - c*ca).b);",
      // ink where depth jumps, drawn on the nearer side only (one clean pixel)
      "  vec2 px = 1.0/uRes; float d0 = lin(uv);",
      "  float dn = lin(uv - vec2(px.x, 0.0)) + lin(uv + vec2(px.x, 0.0)) + lin(uv + vec2(0.0, px.y)) + lin(uv - vec2(0.0, px.y));",
      "  float e = max(0.0, dn - 4.0*d0)/d0;",
      "  col = mix(col, uInk, smoothstep(uEdge, uEdge*2.2, e)*mix(0.45, 0.85, uEtch));",
      // bloom: what burns bright (candles, eyes, spells) bleeds into the dark around it
      "  vec3 bl = vec3(0.0); float bw = 0.0;",
      "  for(int i=0;i<8;i++){ float a = float(i)*2.39996 + 0.5, rr = 2.5 + float(i)*2.4;",
      "    vec2 o = vec2(cos(a), sin(a))*rr*px*(uRes.y/540.0); vec3 s = texture2D(tCol, uv + o).rgb;",
      "    float w = 1.0/(1.0 + float(i)*0.25); bl += max(s - 0.78, 0.0)*w; bw += w; }",
      "  col += bl/bw*uBloom*1.8;",
      // the grade: colours drained toward grey, blacks crushed, shadows sunk in the
      // floor's shade colour, lights a little warm; an S-curve for weight
      "  float l = dot(col, vec3(0.299, 0.587, 0.114));",
      "  col = mix(col, vec3(l), uDesat*(1.0 - smoothstep(0.55, 1.1, l)*0.5)*(1.0 - 0.6*uEtch));",
      "  vec3 sh = mix(uShade, uInk*0.6 + uPaper*0.12, uEtch);",                     // the etching sinks into ink, not purple
      "  col = mix(col, col*0.5 + sh*0.4, (1.0 - smoothstep(0.0, 0.3, l))*0.55);",
      "  col = mix(col, col*0.85 + uHigh*0.25*l, smoothstep(0.45, 1.0, l)*0.5);",
      "  col = max(col - 0.012, 0.0)*1.04; col = col*col*(3.0 - 2.0*col)*0.35 + col*0.65;",
      // corners sink into the dark (and pulse, deep down)
      "  float v = smoothstep(0.1, 0.6, r2*(1.6 + uWeird*0.25*sin(uTime*1.1)));",
      "  col = mix(col, uFog*0.3, v*uVig*(1.0 - 0.55*uEtch));",
      "  if(uEtch > 0.0){",
      // the page: paper laid under everything, still, not crawling: a soft mottle and long fibres
      "    vec2 sp = gl_FragCoord.xy*(540.0/uRes.y);",
      "    float pap = pn(sp*0.035)*0.5 + pn(sp*0.11 + 3.0)*0.3 + pn(sp*vec2(0.9, 0.06) + 7.0)*0.2;",
      "    col *= 1.0 + (pap - 0.5)*0.16*uEtch;",
      "    col += uPaper*(pap - 0.5)*0.025*uEtch;",
      // and its edge: ink washed in from the border, ragged, never a clean oval
      "    vec2 eu = vUv*vec2(uRes.x/uRes.y, 1.0); float ew = min(min(vUv.x, 1.0 - vUv.x)*uRes.x/uRes.y, min(vUv.y, 1.0 - vUv.y));",
      "    float er = ew + (pn(eu*9.0) - 0.5)*0.05 + (pn(eu*40.0) - 0.5)*0.015;",
      "    col = mix(col, uInk*0.5, (1.0 - smoothstep(0.0, 0.14, er))*0.88*uEtch);",
      "  }",
      "  col = mix(col, vec3(0.45, 0.0, 0.02), uHurt*smoothstep(0.05, 0.45, r2));",
      // grain: the old look's film grain dances; the etching's is printed and holds still
      "  float n = fract(sin(dot(floor(gl_FragCoord.xy) + floor(uTime*24.0)*(1.0 - uEtch)*vec2(17.3, 41.9), vec2(12.9898, 78.233)))*43758.5453);",
      "  col += (n - 0.5)*mix(0.045, 0.03, uEtch)*(0.6 + 0.4*(1.0 - l));",
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
S.toggleShadows = function(){
  S.shadows = !S.shadows; S.playerLight.castShadow = S.shadows;
  try{ localStorage.setItem("dungeonofguns.shadows", S.shadows ? "1" : "0"); }catch(e){}
  return S.shadows;
};
S.togglePixel = function(){
  S.pixel = !S.pixel;
  try{ localStorage.setItem("dungeonofguns.pixel2", S.pixel ? "1" : "0"); }catch(e){}
  S.resize();
  return S.pixel;
};

/* each floor's mood: darker and foggier the deeper you go, and darker still if cursed */
S.theme = function(th, curses){
  curses = curses || [];
  const dark = curses.indexOf("dark") >= 0, fog = curses.indexOf("fog") >= 0;
  S.lastTheme = [th, curses];
  // etched, the room is lit by its lights, not by a flat wash: the ambient drops,
  // the lantern and torches carry the picture, and shadow becomes hatching (never black)
  const amb = S.fancy && S.etch ? 0.24 : 1;
  S.scene.background = new THREE.Color(th.fog);
  S.scene.fog = new THREE.Fog(th.fog, fog ? 12 : 22, fog ? 27 : 48);
  S.hemi.color.setHex(th.ambient || 0xa8b0d8);
  S.hemi.intensity = 1.0*(th.light || 1)*(dark ? 0.55 : 1)*amb;
  S.fill.intensity = 0.75*(th.light || 1)*(dark ? 0.5 : 1)*(amb < 1 ? 0.22 : 1);
  S.playerLight.distance = (dark ? 9 : 13)*(amb < 1 ? 1.1 : 1);
  S.playerLight.intensity = (dark ? 2.4 : 2.2)*(amb < 1 ? 1.4 : 1);
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

/* adaptive resolution: if frames run slow for a while, draw fewer pixels
   (down to 60% of the screen's); when there's headroom again, step back up */
S.dyn = 1;
S.adapt = function(raw){
  if(raw > 0.25) return;                       // a hitch (tab switch, load): ignore
  S.ft = S.ft === undefined ? raw : S.ft*0.95 + raw*0.05;
  S.adaptT = (S.adaptT || 0) + raw;
  if(S.adaptT < 1.5) return;
  const was = S.dyn;
  // at the lowest resolution and still slow: redraw the shadows less often (never
  // switch them off here: that rebuilds every shader, a freeze)
  if(S.ft > 1/45 && S.dyn <= 0.6 && S.shadowEvery < 3){ S.shadowEvery++; S.adaptT = 0; return; }
  if(S.ft < 1/58 && S.dyn >= 1 && S.shadowEvery > 1){ S.shadowEvery--; S.adaptT = 0; return; }
  if(S.ft > 1/45) S.dyn = Math.max(0.6, S.dyn - 0.1);
  else if(S.ft < 1/58 && S.dyn < 1) S.dyn = Math.min(1, S.dyn + 0.05);
  if(S.dyn !== was){ S.adaptT = 0; S.resize(); }
};
S.loop = function(){
  requestAnimationFrame(S.loop);
  const raw = S.clock.getDelta(), dt = Math.min(0.05, raw), t = S.clock.elapsedTime;
  S.adapt(raw);
  K.tick(t);
  S.updaters.forEach(f=> f(dt, t));
  S.updateCamera(dt);
  if(++S.frameN % S.shadowEvery === 0) S.renderer.shadowMap.needsUpdate = true;
  if(S.fancy){
    S.post.mat.uniforms.uTime.value = t;
    S.renderer.setRenderTarget(S.post.rt); S.renderer.render(S.scene, S.camera);
    S.renderer.setRenderTarget(null); S.renderer.render(S.post.scene, S.post.cam);
  } else S.renderer.render(S.scene, S.camera);
  S.renderPortrait();
};
S.onFrame = f=>{ S.updaters.push(f); return ()=>{ S.updaters = S.updaters.filter(g=> g !== f); }; };

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
