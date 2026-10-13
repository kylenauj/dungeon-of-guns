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
K.lambert = (c, opts)=> new THREE.MeshLambertMaterial(Object.assign({ color:c }, opts));
K.vlambert = opts=> new THREE.MeshLambertMaterial(Object.assign({ vertexColors:true }, opts));
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

K.timed = [];
K.tick = t=>{ K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t; }); };

K.hex = c=> "#" + new THREE.Color(c).getHexString();

})();
