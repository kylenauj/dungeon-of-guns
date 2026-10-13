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

  S.rig = { x:0, z:0, tx:0, tz:0, dist:21, pitch:1.05, shake:0, lead:0.22 };
  S.clock = new THREE.Clock();
  S.updaters = [];
  S.resize();
  window.addEventListener("resize", S.resize);
  S.loop();
};

S.resize = function(){
  const w = window.innerWidth, h = window.innerHeight;
  const k = S.pixel ? Math.max(1, h/380) : Math.min(window.devicePixelRatio || 1, 2)**-1;
  S.scale = k;
  S.renderer.setSize(Math.round(w/k), Math.round(h/k), false);
  const c = S.renderer.domElement; c.style.width = w + "px"; c.style.height = h + "px";
  c.style.imageRendering = S.pixel ? "pixelated" : "auto";
  S.camera.aspect = w/h; S.camera.updateProjectionMatrix();
  K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uScale) m.uniforms.uScale.value = h/k/2; });
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
  S.renderer.render(S.scene, S.camera);
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
