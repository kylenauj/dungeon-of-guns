/* ------------------------------------------------------------------ *
 *  The asset kit, carried over from Pine Hollow Rally by way of Gloom
 *  Shooter: everything is built from code, nothing is loaded.
 *
 *  - lumps: icosahedra with a hashed bump per corner, so the facets
 *    stay closed and every lump is different (Bigfoot's fur, now goblin)
 *  - vertex painting and a geometry merge, so a prop is one draw
 *  - the soft round glow texture and additive glow materials
 *  - a stone texture drawn on a canvas, chunky like Pine Hollow's
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG;
const K = DG.Kit = {};

K.WALL_H = 1.7;

K.lump = function(r, det, amt, seed){
  const g = new THREE.IcosahedronGeometry(r, det === undefined ? 1 : det), a = g.attributes.position;
  const s = seed === undefined ? Math.random()*100 : seed, k0 = amt === undefined ? 0.2 : amt;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    const h = Math.sin((Math.round(x*1e3)*12.9898 + Math.round(y*1e3)*78.233 + Math.round(z*1e3)*37.719)*0.001 + s)*43758.5453;
    const k = 1 - k0/2 + (h - Math.floor(h))*k0;
    a.setXYZ(i, x*k, y*k, z*k);
  }
  g.computeVertexNormals();
  return g;
};

K.paint = function(g, col, fn){
  const a = g.attributes.position, c = new THREE.Color(col), out = new Float32Array(a.count*3), t = new THREE.Color();
  for(let i=0;i<a.count;i++){
    t.copy(c); if(fn) fn(t, a.getX(i), a.getY(i), a.getZ(i), i);
    out[i*3] = t.r; out[i*3+1] = t.g; out[i*3+2] = t.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(out, 3));
  return g;
};

K.merge = function(list){
  const parts = list.map(g=> g.index ? g.toNonIndexed() : g);
  let n = 0; parts.forEach(g=> n += g.attributes.position.count);
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3), uv = new Float32Array(n*2);
  let o = 0;
  parts.forEach(g=>{
    const p = g.attributes.position, q = g.attributes.normal, c = g.attributes.color, u = g.attributes.uv;
    pos.set(p.array, o*3);
    if(q) nor.set(q.array, o*3);
    if(c) col.set(c.array, o*3); else col.fill(1, o*3, (o + p.count)*3);
    if(u) uv.set(u.array, o*2);
    o += p.count;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
};
K.at = function(g, x, y, z, rx, ry, rz, sx, sy, sz){
  if(sx !== undefined) g.scale(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  if(rx) g.rotateX(rx); if(ry) g.rotateY(ry); if(rz) g.rotateZ(rz);
  g.translate(x || 0, y || 0, z || 0);
  return g;
};

/* a soft round glow */
K.glowTex = (()=>{
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d");
  const r = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,255,255,.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
})();
K.glowPlane = (()=>{ const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI/2); return g; })();
K.glowMat = (color, opacity)=> new THREE.MeshBasicMaterial({ map:K.glowTex, color, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:opacity === undefined ? 0.6 : opacity });
K.basic = (c, opts)=> new THREE.MeshBasicMaterial(Object.assign({ color:c }, opts));
K.sprite = (c, s, opacity)=>{
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:c, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false, opacity:opacity === undefined ? 0.8 : opacity }));
  sp.scale.set(s, s, s); return sp;
};

/* chunky stone: big blocks with mortar lines and speckle, greyscale so
   vertex colours tint it per floor */
K.stoneTex = (()=>{
  const S = 64, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, S, S);
  for(let i=0;i<500;i++){ const v = 170 + Math.floor(Math.random()*70); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(Math.random()*S|0, Math.random()*S|0, 2, 2); }
  g.fillStyle = "#6a6a6a";
  for(let r=0;r<4;r++){ g.fillRect(0, r*16, S, 2); const o = r % 2 ? 0 : 16; for(let c=0;c<3;c++) g.fillRect(o + c*32 - 1, r*16, 2, 16); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
})();
K.floorTex = (()=>{
  const S = 32, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d");
  g.fillStyle = "#bdbdbd"; g.fillRect(0, 0, S, S);
  for(let i=0;i<180;i++){ const v = 150 + Math.floor(Math.random()*90); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(Math.random()*S|0, Math.random()*S|0, 2, 2); }
  g.fillStyle = "#7a7a7a"; g.fillRect(0, 0, S, 1); g.fillRect(0, 0, 1, S);
  g.fillStyle = "#d8d8d8"; g.fillRect(1, 1, S - 2, 1);
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
})();

/* text on a little canvas, for signs */
K.textTex = function(lines, w, h, opts){
  opts = opts || {};
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d");
  g.fillStyle = opts.bg || "#6a4a2a"; g.fillRect(0, 0, w, h);
  g.fillStyle = opts.fg || "#f3e6c4"; g.font = (opts.weight || "700") + " " + (opts.size || 14) + "px 'Saira Condensed', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  lines.forEach((l, i)=> g.fillText(l, w/2, h/2 + (i - (lines.length - 1)/2)*(opts.size || 14)*1.1));
  const t = new THREE.CanvasTexture(cv); t.magFilter = THREE.NearestFilter;
  return t;
};


/* ---- the ink look ------------------------------------------------------
   Everything solid in the game (characters, props, walls, floors) uses one
   material: three.js's toon material, patched. The light that reaches a
   pixel is cut into a few bands with an ordered (Bayer) dither between
   them, so lantern pools fall off in stepped, stippled rings like an old
   engraving printed in colour. The darkest band gets diagonal ink hatching.
   Characters also get a rim of the floor's colour, so they read against
   the gloom. The uniforms are shared, so the stage can retune every
   material at once per floor (K.INK).

   Characters are built from simple parts, then baked: the parts of each
   moving group merge into one vertex-coloured mesh, plus an inverted-hull
   outline in the floor's ink colour. Glowing parts stay unlit. */
K.INK = {
  uSteps:{ value:4 }, uInk:{ value:new THREE.Color(0x0a0612) }, uRim:{ value:new THREE.Color(0x8a7aff) },
  uHatch:{ value:1 }, uHatchAt:{ value:0.42 }, uLift:{ value:0.06 }, uRimK:{ value:0.5 }
};
const INK_PARS = [
  "uniform float uSteps, uHatch, uHatchAt, uLift, uRimK; uniform vec3 uInk, uRim;",
  "float inkBayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y*0.75))); }",
  "float inkBayer(vec2 a){ return inkBayer2(0.5*a)*0.25 + inkBayer2(a); }",
  "vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection){ float d = clamp(dot(normal, lightDirection)*0.5 + 0.5, 0.0, 1.0); return vec3(d*d*1.15); }"
].join("\n");
const INK_MAIN = [
  "vec3 inkAlb = max(diffuseColor.rgb, vec3(0.02));",
  "float inkA = max(dot(inkAlb, vec3(0.299, 0.587, 0.114)), 0.02);",
  "float inkL = dot(outgoingLight - totalEmissiveRadiance, vec3(0.299, 0.587, 0.114))/inkA;",
  "float inkB = inkBayer(gl_FragCoord.xy);",
  "float inkQ = max(floor(inkL*uSteps + inkB*0.92 + 0.04)/uSteps, uLift);",
  "vec3 inkLit = (outgoingLight - totalEmissiveRadiance)*(inkQ/max(inkL, 0.0001)) + totalEmissiveRadiance;",
  // the darkest band: diagonal lines of ink
  "float inkHatch = (1.0 - step(0.99, mod(gl_FragCoord.x + gl_FragCoord.y, 4.0)))*step(inkQ, uHatchAt)*uHatch;",
  "inkLit = mix(inkLit, uInk, inkHatch*0.75);",
  "#ifdef INK_RIM",
  // characters sink into a soft contact shadow near the floor, so all of them sit in the world the same way
  "  inkLit *= mix(0.55, 1.0, smoothstep(0.0, 0.45, vInkY));",
  "  float inkRim = 1.0 - clamp(dot(normal, geometry.viewDir), 0.0, 1.0);",
  "  inkLit += uRim*step(0.62 + inkB*0.12, inkRim)*uRimK*(0.35 + 0.65*inkA);",
  "#endif",
  "outgoingLight = inkLit;",
  "gl_FragColor = vec4( outgoingLight, diffuseColor.a );"
].join("\n");
K.inkify = function(mat, opts){
  opts = opts || {};
  mat.onBeforeCompile = sh=>{
    for(const k in K.INK) sh.uniforms[k] = K.INK[k];
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <gradientmap_pars_fragment>", INK_PARS)
      .replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", INK_MAIN);
    if(opts.rim){
      sh.fragmentShader = "#define INK_RIM\nvarying float vInkY;\n" + sh.fragmentShader;
      sh.vertexShader = "varying float vInkY;\n" + sh.vertexShader.replace("#include <project_vertex>",
        "#include <project_vertex>\n#ifdef USE_INSTANCING\n vInkY = (modelMatrix*instanceMatrix*vec4(transformed, 1.0)).y;\n#else\n vInkY = (modelMatrix*vec4(transformed, 1.0)).y;\n#endif");
    }
  };
  mat.customProgramCacheKey = ()=> opts.rim ? "ink-rim" : "ink";
  return mat;
};
/* the material: vertex colours by default; { rim:true } for characters */
K.ink = (opts)=>{
  opts = Object.assign({}, opts);
  const rim = opts.rim; delete opts.rim;
  return K.inkify(new THREE.MeshToonMaterial(Object.assign({ vertexColors:true }, opts)), { rim });
};
K.toon = (opts)=> K.ink(Object.assign({ rim:true }, opts));
K.lambert = (c, opts)=> K.ink(Object.assign({ color:c, vertexColors:false }, opts));
K.vlambert = opts=> K.ink(opts);
K.outlineMat = (w)=> new THREE.ShaderMaterial({
  uniforms:{ uW:{ value:w || 0.028 }, uA:{ value:1 }, uInk:K.INK.uInk }, side:THREE.BackSide, transparent:true,
  vertexShader:"uniform float uW; void main(){ vec3 p = position + normal*uW; gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0); }",
  fragmentShader:"uniform float uA; uniform vec3 uInk; void main(){ if(uA < 0.99 && fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)))*43758.5453) > uA) discard; gl_FragColor = vec4(uInk, 1.0); }"
});
/* a part: geometry + a colour, to be baked */
K.part = function(parent, geo, color, x, y, z, rx, ry, rz, sx, sy, sz){
  const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
  m.position.set(x || 0, y || 0, z || 0);
  if(rx || ry || rz) m.rotation.set(rx || 0, ry || 0, rz || 0);
  if(sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
  m.userData.part = true;
  parent.add(m);
  return m;
};
/* merge every part directly under each object into one toon mesh + outline */
K.bake = function(root, opts){
  opts = opts || {};
  const mat = opts.mat || K.toon(), out = opts.outline === false ? null : (opts.outlineMat || K.outlineMat(opts.w));
  const nodes = [];
  root.traverse(o=> nodes.push(o));
  nodes.forEach(o=>{
    const parts = o.children.filter(c=> c.isMesh && c.userData.part);
    if(!parts.length) return;
    const geos = parts.map(m=>{
      m.updateMatrix();
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      g.applyMatrix4(m.matrix);
      const c = m.material.color, a = g.attributes.position, col = new Float32Array(a.count*3), prev = g.attributes.color;
      for(let i=0;i<a.count;i++){
        const pr = prev ? prev.getX(i) : 1, pg = prev ? prev.getY(i) : 1, pb = prev ? prev.getZ(i) : 1;
        col[i*3] = c.r*pr; col[i*3+1] = c.g*pg; col[i*3+2] = c.b*pb;
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      if(!g.attributes.normal) g.computeVertexNormals();
      return g;
    });
    parts.forEach(m=>{ o.remove(m); m.geometry.dispose(); m.material.dispose(); });
    const merged = K.merge(geos);
    const mesh = new THREE.Mesh(merged, mat); mesh.userData.baked = true;
    o.add(mesh);
    if(out){ const ol = new THREE.Mesh(merged, out); ol.userData.outline = true; o.add(ol); }
  });
  return { mat, out };
};
/* a smooth turned shape from a profile of [radius, height] points */
K.lathe = function(prof, seg){
  // a profile drawn top-down would turn the faces inside out (and the
  // outline shell would cover the model): always build it bottom-up
  if(prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();
  return new THREE.LatheGeometry(prof.map(p=> new THREE.Vector2(p[0], p[1])), seg || 16);
};
/* a tube along points */
K.tube = function(pts, r, seg, rseg){ return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(p[0], p[1], p[2]))), seg || 12, r, rseg || 6, false); };

K.timed = [];
K.tick = t=>{ K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t; }); };

K.hex = c=> "#" + new THREE.Color(c).getHexString();

})();
