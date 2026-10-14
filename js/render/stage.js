/* ------------------------------------------------------------------ *
 *  The stage: renderer, lights and the camera.
 *
 *  Pine Hollow's trick: draw the game at a low resolution and scale it
 *  up with hard pixel edges, so the whole thing reads as chunky pixel
 *  art. P toggles it off.
 *
 *  The camera hangs above and behind the wizard, looking down at about
 *  60°, and leans a little toward the cursor (so you see where you aim).
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
  try{ S.pixel = localStorage.getItem("dungeonofguns.pixel") !== "0"; }catch(e){ S.pixel = true; }

  const scene = S.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  S.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);

  S.hemi = new THREE.HemisphereLight(0xa8b0d8, 0x3a2e22, 0.9);
  scene.add(S.hemi);
  S.fill = new THREE.DirectionalLight(0x9098c0, 0.45); S.fill.position.set(-0.3, 1, 0.6); scene.add(S.fill);
  S.playerLight = new THREE.PointLight(0xe0c8ff, 1.7, 12, 1.3);
  scene.add(S.playerLight);
  S.torches = [];
  for(let i=0;i<S.TORCH_LIGHTS;i++){ const l = new THREE.PointLight(0xffa04a, 0, 11, 1.4); scene.add(l); S.torches.push(l); }
  S.flash = new THREE.PointLight(0xffffff, 0, 8, 2); scene.add(S.flash);

  try{ S.fancy = localStorage.getItem("dungeonofguns.ink") !== "0"; }catch(e){ S.fancy = true; }
  S.initPost();
  // closer and a little lower than a straight top-down: characters read as
  // standing figures, not squashed lids
  S.rig = { x:0, z:0, tx:0, tz:0, dist:19, pitch:0.93, shake:0, lead:0.22 };
  S.initPortrait();
  S.clock = new THREE.Clock();
  S.updaters = [];
  S.resize();
  window.addEventListener("resize", S.resize);
  S.loop();
};

S.resize = function(){
  const w = window.innerWidth, h = window.innerHeight;
  const k = S.pixel ? Math.max(1, h/500) : Math.min(window.devicePixelRatio || 1, 2)**-1;
  S.scale = k;
  S.renderer.setSize(Math.round(w/k), Math.round(h/k), false);
  if(S.post){ const bw = Math.round(w/k), bh = Math.round(h/k); S.post.rt.setSize(bw, bh); S.post.mat.uniforms.uRes.value.set(bw, bh); }
  const c = S.renderer.domElement; c.style.width = w + "px"; c.style.height = h + "px";
  c.style.imageRendering = S.pixel ? "pixelated" : "auto";
  S.camera.aspect = w/h; S.camera.updateProjectionMatrix();
  K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uScale) m.uniforms.uScale.value = h/k/2; });
};
S.toggleInk = function(){
  S.fancy = !S.fancy;
  try{ localStorage.setItem("dungeonofguns.ink", S.fancy ? "1" : "0"); }catch(e){}
  return S.fancy;
};
S.initPost = function(){
  const rt = new THREE.WebGLRenderTarget(16, 16, { minFilter:THREE.NearestFilter, magFilter:THREE.NearestFilter });
  rt.depthTexture = new THREE.DepthTexture(16, 16); rt.depthTexture.type = THREE.UnsignedIntType;
  const mat = new THREE.ShaderMaterial({
    uniforms:{ tCol:{ value:rt.texture }, tDep:{ value:rt.depthTexture }, uRes:{ value:new THREE.Vector2(16, 16) }, uNear:{ value:S.camera.near }, uFar:{ value:S.camera.far },
      uTime:{ value:0 }, uWeird:{ value:0 }, uEdge:{ value:0.045 }, uVig:{ value:0.85 }, uHurt:{ value:0 },
      uInk:K.INK.uInk, uShade:{ value:new THREE.Color(0x2a1838) }, uHigh:{ value:new THREE.Color(0xffe2b0) }, uFog:{ value:new THREE.Color(0x0d0a0a) } },
    depthTest:false, depthWrite:false,
    vertexShader:"varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader:[
      "uniform sampler2D tCol, tDep; uniform vec2 uRes; uniform float uNear, uFar, uTime, uWeird, uEdge, uVig, uHurt;",
      "uniform vec3 uInk, uShade, uHigh, uFog; varying vec2 vUv;",
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
      "  col = mix(col, uInk, smoothstep(uEdge, uEdge*2.2, e)*0.9);",
      // the floor's grade: shadows lean to its shade colour, lights to its highlight
      "  float l = dot(col, vec3(0.299, 0.587, 0.114));",
      "  col = mix(col, col*0.55 + uShade*0.5, (1.0 - smoothstep(0.0, 0.32, l))*0.6);",
      "  col = mix(col, col*0.8 + uHigh*0.3*l, smoothstep(0.4, 1.0, l)*0.6);",
      "  col = mix(vec3(l), col, 1.18);",
      // corners sink into the fog (and pulse, deep down)
      "  float v = smoothstep(0.16, 0.72, r2*(1.55 + uWeird*0.25*sin(uTime*1.1)));",
      "  col = mix(col, uFog*0.6, v*uVig);",
      "  col = mix(col, vec3(0.6, 0.0, 0.05), uHurt*smoothstep(0.08, 0.5, r2));",
      "  float n = fract(sin(dot(floor(gl_FragCoord.xy) + floor(uTime*24.0)*vec2(17.3, 41.9), vec2(12.9898, 78.233)))*43758.5453);",
      "  col += (n - 0.5)*0.03;",
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
  scene.background = new THREE.Color(0x1a1422);
  scene.add(new THREE.HemisphereLight(0xfff0e0, 0x3a2e48, 1.05));
  const key = new THREE.DirectionalLight(0xffffff, 0.75); key.position.set(1.5, 3, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb36bff, 0.5); rim.position.set(-2, 1.5, -3); scene.add(rim);
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
S.togglePixel = function(){
  S.pixel = !S.pixel;
  try{ localStorage.setItem("dungeonofguns.pixel", S.pixel ? "1" : "0"); }catch(e){}
  S.resize();
  return S.pixel;
};

/* each floor's mood: darker and foggier the deeper you go, and darker still if cursed */
S.theme = function(th, curses){
  curses = curses || [];
  const dark = curses.indexOf("dark") >= 0, fog = curses.indexOf("fog") >= 0;
  S.scene.background = new THREE.Color(th.fog);
  S.scene.fog = new THREE.Fog(th.fog, fog ? 12 : 22, fog ? 27 : 48);
  S.hemi.color.setHex(th.ambient || 0xa8b0d8);
  S.hemi.intensity = 0.9*(th.light || 1)*(dark ? 0.55 : 1);
  S.fill.intensity = 0.45*(th.light || 1)*(dark ? 0.5 : 1);
  S.playerLight.distance = dark ? 8 : 12;
  S.playerLight.intensity = dark ? 2.1 : 1.7;
  // the ink: line colour, rim colour, grade, and how weird the picture gets
  K.INK.uInk.value.setHex(th.ink || 0x0a0612);
  K.INK.uRim.value.setHex(th.rim || 0x8a7aff);
  K.INK.uLift.value = dark ? 0.04 : 0.06;
  const u = S.post.mat.uniforms;
  u.uShade.value.setHex(th.shade || 0x2a1838); u.uHigh.value.setHex(th.high || 0xffe2b0); u.uFog.value.setHex(th.fog);
  u.uWeird.value = th.weird || 0; u.uVig.value = dark ? 1 : 0.85;
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
  const sx = (Math.random() - 0.5)*R.shake, sz = (Math.random() - 0.5)*R.shake; R.shake *= Math.exp(-dt*10);
  S.camera.position.set(R.x + sx, Math.sin(R.pitch)*R.dist, R.z + Math.cos(R.pitch)*R.dist + sz);
  S.camera.lookAt(R.x + sx*0.5, 0, R.z + sz*0.5);
};

S.loop = function(){
  requestAnimationFrame(S.loop);
  const dt = Math.min(0.05, S.clock.getDelta()), t = S.clock.elapsedTime;
  K.tick(t);
  S.updaters.forEach(f=> f(dt, t));
  S.updateCamera(dt);
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
