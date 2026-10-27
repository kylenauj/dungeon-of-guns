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

// walls stand well over Zippy's head, so rooms read as halls, not boxes; where
// one stands between him and the camera, it opens (K.GLOOM.uSeeP, below)
K.WALL_H = 2.6;

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

/* merge a list of geometries into one (one draw). Shared vertices stay shared: an
   indexed part keeps its index (offset), a loose one gets a running index. (It used
   to explode everything into separate triangles first: 3-6x the vertices, and most
   of a floor's load time.) */
K.merge = function(list){
  let n = 0, ni = 0; list.forEach(g=>{ n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3), uv = new Float32Array(n*2);
  const idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let o = 0, oi = 0;
  list.forEach(g=>{
    const p = g.attributes.position, q = g.attributes.normal, c = g.attributes.color, u = g.attributes.uv;
    pos.set(p.array, o*3);
    if(q) nor.set(q.array, o*3);
    if(c) col.set(c.array, o*3); else col.fill(1, o*3, (o + p.count)*3);
    if(u) uv.set(u.array, o*2);
    if(g.index){ const ia = g.index.array; for(let i=0;i<ia.length;i++) idx[oi + i] = ia[i] + o; oi += ia.length; }
    else { for(let i=0;i<p.count;i++) idx[oi + i] = o + i; oi += p.count; }
    o += p.count;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
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
  const cv = document.createElement("canvas"); cv.width = cv.height = 64; const g = cv.getContext("2d", { willReadFrequently:true });
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
  const S = 64, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d", { willReadFrequently:true });
  g.fillStyle = "#c8c8c8"; g.fillRect(0, 0, S, S);
  for(let i=0;i<500;i++){ const v = 170 + Math.floor(Math.random()*70); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.fillRect(Math.random()*S|0, Math.random()*S|0, 2, 2); }
  g.fillStyle = "#6a6a6a";
  for(let r=0;r<4;r++){ g.fillRect(0, r*16, S, 2); const o = r % 2 ? 0 : 16; for(let c=0;c<3;c++) g.fillRect(o + c*32 - 1, r*16, 2, 16); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return t;
})();
K.floorTex = (()=>{
  const S = 32, cv = document.createElement("canvas"); cv.width = cv.height = S; const g = cv.getContext("2d", { willReadFrequently:true });
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
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d", { willReadFrequently:true });
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
  uSteps:{ value:5 }, uInk:{ value:new THREE.Color(0x0a0612) }, uRim:{ value:new THREE.Color(0x8a7aff) },
  uHatch:{ value:0 }, uHatchAt:{ value:0.22 }, uLift:{ value:0.025 }, uRimK:{ value:0.45 },
  // the grim look: light falls off smoothly (uSoft blends the bands away),
  // and characters wear grime: mottled, darker in the creases and lower down
  uSoft:{ value:1 }, uGrime:{ value:0.55 },
  // the etching (K.ETCH below): 0 off, 1 on; the paper's tone; hatch lines per unit
  uEtch:{ value:0 }, uOutK:{ value:1 }, uGrain:{ value:1 }, uPaper:{ value:new THREE.Color(0xd4cec2) }, uHatchF:{ value:3.6 },
  // Ash & Ember (docs/ART_DIRECTION.md): no surface is more coloured than this
  // (HSV saturation); colour comes from light and from things that glow
  uSatCap:{ value:0.24 },
  // the PSX look (Stage.setPsx): every vertex snaps to a grid this many cells
  // high (0: off), uSnapAsp cells wide per cell high, so models wobble and swim
  // as the camera moves, the way the PlayStation's whole-pixel maths did
  uSnap:{ value:0 }, uSnapAsp:{ value:1 }
};
const SNAP = "\n if(uSnap > 0.0 && gl_Position.w > 0.0){ vec2 sg = vec2(uSnap*uSnapAsp, uSnap); gl_Position.xy = floor(gl_Position.xy/gl_Position.w*sg + 0.5)/sg*gl_Position.w; }";
K.SNAP = SNAP;
/* outlines are a hairline now, not a cartoon line: shape comes from light and shade */
K.OUTLINE = 0.22;
const INK_PARS = [
  "uniform float uSteps, uHatch, uHatchAt, uLift, uRimK, uSoft, uGrime, uEtch, uHatchF, uSatCap, uGrain; uniform vec3 uInk, uRim, uPaper;",
  "varying vec3 vHP; varying vec3 vHN;",
  "float inkPoche = 0.0;",
  "float in2h(vec2 p){ vec3 q = fract(vec3(p.xyx)*0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y)*q.z); }",
  "float in2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(in2h(i), in2h(i + vec2(1, 0)), f.x), mix(in2h(i + vec2(0, 1)), in2h(i + vec2(1, 1)), f.x), f.y); }",   // set by the walls' tops: solid ink, like the walls on a drawn map
  // one stroke of a hatch: a line at every whole step of c, w its half-width (0..0.5),
  // antialiased over a pixel; thin lines fade instead of breaking into dots
  "float inkLine(float c, float w){ float d = abs(fract(c) - 0.5), aa = max(fwidth(c), 0.0001); w = clamp(w, 0.0, 0.5);",
  "  return clamp((w - d)/aa + 0.5, 0.0, 1.0)*clamp(w/(aa*0.6), 0.0, 1.0); }",
  "float igh(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y)*p.z); }",
  "float ign(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f);",
  "  return mix(mix(mix(igh(i), igh(i + vec3(1,0,0)), f.x), mix(igh(i + vec3(0,1,0)), igh(i + vec3(1,1,0)), f.x), f.y),",
  "             mix(mix(igh(i + vec3(0,0,1)), igh(i + vec3(1,0,1)), f.x), mix(igh(i + vec3(0,1,1)), igh(i + vec3(1,1,1)), f.x), f.y), f.z); }",
  // the same noise and its slope in one go (for the grain: four calls became one)
  "vec3 ignd(vec3 p){ vec3 i = floor(p), f = fract(p), u = f*f*(3.0 - 2.0*f), du = 6.0*f*(1.0 - f);",
  "  float a = igh(i), b = igh(i + vec3(1,0,0)), c = igh(i + vec3(0,1,0)), d = igh(i + vec3(1,1,0));",
  "  float e = igh(i + vec3(0,0,1)), f1 = igh(i + vec3(1,0,1)), g = igh(i + vec3(0,1,1)), h = igh(i + vec3(1,1,1));",
  "  float k1 = b - a, k2 = c - a, k3 = e - a, k4 = a - b - c + d, k5 = a - c - e + g, k6 = a - b - e + f1, k7 = -a + b + c - d + e - f1 - g + h;",
  "  return du*vec3(k1 + k4*u.y + k6*u.z + k7*u.y*u.z, k2 + k5*u.z + k4*u.x + k7*u.z*u.x, k3 + k6*u.x + k5*u.y + k7*u.x*u.y); }",
  "float inkBayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y*0.75))); }",
  "float inkBayer(vec2 a){ return inkBayer2(0.5*a)*0.25 + inkBayer2(a); }",
  "vec3 getGradientIrradiance(vec3 normal, vec3 lightDirection){ float d = clamp(dot(normal, lightDirection)*0.5 + 0.5, 0.0, 1.0); return vec3(d*d*1.15); }"
].join("\n");
const INK_MAIN = [
  "vec3 inkAlb = max(diffuseColor.rgb, vec3(0.02));",
  "float inkA = max(dot(inkAlb, vec3(0.299, 0.587, 0.114)), 0.02);",
  "float inkL = dot(outgoingLight - totalEmissiveRadiance, vec3(0.299, 0.587, 0.114))/inkA;",
  "float inkB = inkBayer(gl_FragCoord.xy);",
  "float inkQ = max(mix(floor(inkL*uSteps + inkB*0.92 + 0.04)/uSteps, clamp(inkL*(0.35 + 0.75*inkL), 0.0, 1.15), uSoft), uLift);",
  "vec3 inkLit = (outgoingLight - totalEmissiveRadiance)*(inkQ/max(inkL, 0.0001)) + totalEmissiveRadiance;",
  // the darkest band: diagonal lines of ink (the old look)
  "float inkHatch = (1.0 - step(0.99, mod(gl_FragCoord.x + gl_FragCoord.y, 4.0)))*step(inkQ, uHatchAt)*uHatch*(1.0 - uEtch);",
  "inkLit = mix(inkLit, uInk, inkHatch*0.75);",
  // the etching: colour only where light falls; elsewhere the surface is the
  // paper's tone, shaded by hatching that thickens and crosses as it darkens.
  // The lines lie on the surface (world space; a character's own space), on
  // whichever plane it faces most, so they hold still as the camera moves.
  "if(uEtch > 0.0){",
  "  vec3 eN = normalize(vHN), aN = abs(eN);",
  "  vec2 hp = (aN.y > max(aN.x, aN.z) ? vHP.xz : aN.x > aN.z ? vHP.zy : vHP.xy)*uHatchF;",
  "  float wob = (in2(hp*0.64) - 0.5)*0.3 + (in2(hp*2.5) - 0.5)*0.1;",          // a hand that wavers
  "  float eD = clamp(1.0 - inkQ/0.85, 0.0, 1.0);",                                  // how dark, 0..1
  "  float eK = inkLine(hp.x + hp.y + wob, eD*0.62 - 0.02);",
  "  eK = max(eK, inkLine(hp.x - hp.y + wob*1.4 + 0.31, (eD - 0.4)*0.6));",
  "  eK = max(eK, inkLine(hp.x*1.41 + wob*0.8 + 0.67, (eD - 0.72)*0.9));",
  "  eK *= 0.55 + 0.45*in2(hp*0.36 + 7.0);",                                         // the ink lies heavier here and there
  "  vec3 eLit = outgoingLight - totalEmissiveRadiance;",
  "  float eAL = dot(inkAlb, vec3(0.299, 0.587, 0.114));",
  "  vec3 eMono = uPaper*(0.35 + 0.65*eAL);",                                         // the surface, uncoloured
  "  float eSat = smoothstep(0.2, 0.8, inkQ);",
  "  vec3 eFill = mix(eMono*(0.24 + 0.5*min(inkQ, 1.0)), eLit, eSat);",
  "  eFill = mix(eFill, uInk, eK*0.95);",
  "  eFill = mix(eFill, uInk, smoothstep(0.62, 0.92, eD));",
  // the tops of walls, as a hand-drawn dungeon map draws them: clusters of short
  // strokes, each cluster at its own angle, on the bare paper
  "  if(inkPoche > 0.0){",
  "    vec2 pc = vHP.xz*2.4 + vec2(in2(vHP.xz*1.7), in2(vHP.xz*1.9 + 4.0))*0.6, pi = floor(pc);",
  "    float pa = igh(vec3(pi, 3.0))*3.1416; vec2 pd = vec2(cos(pa), sin(pa));",
  "    float pl = inkLine(dot(vHP.xz, pd)*13.0 + igh(vec3(pi, 5.0))*3.0, 0.2 + 0.08*igh(vec3(pi, 7.0)));",
  "    vec3 poche = mix(uInk, uPaper*0.1, pl*0.35);",
  "    eFill = mix(eFill, poche, inkPoche);",
  "  }",
  "  inkLit = mix(inkLit, eFill + totalEmissiveRadiance, uEtch);",
  "}",
  "#ifdef INK_RIM",
  // characters sink into a soft contact shadow near the floor, so all of them sit in the world the same way
  "  inkLit *= mix(0.4, 1.0, smoothstep(0.0, 0.6, vInkY));",
  "  float inkRim = 1.0 - clamp(dot(normal, geometry.viewDir), 0.0, 1.0);",
  // a thin cold edge round every figure, lit or not: in the dark the dungeon is, what
  // can kill you still shows as a silhouette (smooth now, and as strong on a black-clad thing)
  "#ifdef INK_FIGURE",
  "  inkLit += uRim*smoothstep(0.32, 0.88, inkRim)*0.6*smoothstep(0.0, 0.5, vInkY + 0.2);",
  "#else",
  "  inkLit += uRim*smoothstep(0.6, 0.92, inkRim)*uRimK*(0.75 + 0.25*inkA)*smoothstep(0.0, 0.5, vInkY + 0.2);",
  "#endif",
  "#endif",
  "outgoingLight = inkLit;",
  "gl_FragColor = vec4( outgoingLight, diffuseColor.a );"
].join("\n");
/* ---- the Gloom on the world (floors and walls only) ------------------------
   uGloom goes 0 (a clean castle) .. 1 (a mushroom forest). On floors: moss in
   spreading patches, pale mycelium threads, glowing specks, and from the
   middle floors violet rot with bile-green veins that glow. On walls: bark
   and roots creeping up from the floor, rot veins, moss on top. Shared
   uniforms, set per floor by the stage. */
/* tOcc: where the walls are, blurred (World.occlusion): dirt and shadow pool at
   the foot of every wall and deepest in corners. Black (none) until a floor sets it. */
const OCC0 = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); OCC0.needsUpdate = true;
K.GLOOM = { tOcc:{ value:OCC0 }, uOccS:{ value:new THREE.Vector2(1, 1) }, uOccK:{ value:0 },
  uGloom:{ value:0 }, uGTime:{ value:0 }, uFloorLum:{ value:0.4 }, uWallLum:{ value:0.4 },
  // the see-through: Zippy's chest and the camera; wall between them dithers away
  uSeeP:{ value:new THREE.Vector3(0, -99, 0) }, uSeeC:{ value:new THREE.Vector3(0, 10, 10) } };
const GLOOM_PARS = [
  "uniform float uGloom, uGTime, uFloorLum, uWallLum, uOccK; uniform vec3 uSeeP, uSeeC; uniform sampler2D tOcc; uniform vec2 uOccS; varying vec3 vGW; varying vec3 vGN;",
  "float gh(vec2 p){ vec3 q = fract(vec3(p.xyx)*0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y)*q.z); }",
  "float gn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(gh(i), gh(i + vec2(1, 0)), f.x), mix(gh(i + vec2(0, 1)), gh(i + vec2(1, 1)), f.x), f.y); }",
  "float gfbm(vec2 p){ return gn(p)*0.55 + gn(p*2.1 + 3.7)*0.28 + gn(p*4.3 + 1.3)*0.17; }"
].join("\n");
const GLOOM_COMMON = [
  "vec3 gloomGlow = vec3(0.0);",
  "float gFlat = 0.0, gWet = 0.0;",   // filth flattens and dulls the stone; wet filth shines
  "float gRot = clamp((uGloom - 0.3)*0.75, 0.0, 0.52);",
  "vec3 gBase = diffuseColor.rgb;"
].join("\n");
const GLOOM_GROUND = [   // moss, mycelium, specks and rot on a horizontal surface at vGW.xz
  "float gn1 = gfbm(vGW.xz*0.35), gn2 = gfbm(vGW.xz*1.7 + 9.0);",
  "float gCover = smoothstep(0.96 - uGloom*1.25, 1.24 - uGloom*1.25, mix(gn1, gn2, 0.45));",
  "vec3 gMoss = mix(mix(vec3(0.075, 0.13, 0.13), vec3(0.12, 0.2, 0.16), gn2), mix(vec3(0.095, 0.105, 0.09), vec3(0.14, 0.15, 0.125), gn2), uEtch)*2.3*gShade;",
  "vec3 gc = mix(gBase, gMoss, gCover);",
  "float gTh = abs(sin(vGW.x*0.9 + sin(vGW.z*0.7)*2.4 + gn1*5.0))*abs(sin(vGW.z*1.1 + sin(vGW.x*0.6)*2.0));",
  "gc = mix(gc, vec3(0.42, 0.42, 0.38)*gShade, smoothstep(0.03, 0.0, gTh)*0.16*gCover);",
  "float gRn = gfbm(vGW.xz*0.22 + 17.0), gR = smoothstep(0.96 - gRot, 1.2 - gRot, gRn + (gn2 - 0.5)*0.12);",
  "gc = mix(gc, mix(vec3(0.07, 0.065, 0.06), vec3(0.12, 0.11, 0.1), gn2)*1.45*gShade, gR);",
  // etched, every patch of moss and rot gets an ink contour, like a drawn map's shading
  "if(uEtch > 0.0){ float gEdge = smoothstep(0.03, 0.0, abs(mix(gn1, gn2, 0.3) - (1.06 - uGloom*1.25)))*step(0.01, uGloom);",
  "  gEdge = max(gEdge, smoothstep(0.025, 0.0, abs(gRn - (1.04 - gRot)))*step(0.01, gRot));",
  "  gc = mix(gc, uInk, gEdge*uEtch*0.3); }",
  "float gVein = smoothstep(0.035, 0.0, abs(gfbm(vGW.xz*0.8 + 4.0) - 0.5));",
  "gloomGlow += vec3(0.45, 1.0, 0.15)*gVein*0.2*(0.6 + 0.4*sin(uGTime*2.0 + vGW.x))*gR;",
  "float gSp = step(0.955, gh(floor(vGW.xz*2.6)))*smoothstep(0.4, 0.15, length(fract(vGW.xz*2.6) - 0.5));",
  "gloomGlow += vec3(0.25, 0.75, 1.0)*gSp*0.14*(0.7 + 0.3*sin(uGTime*1.3 + gh(floor(vGW.xz*2.6))*20.0))*gCover*(1.0 - gR);"
].join("\n");
const GLOOM_FLOOR = [GLOOM_COMMON, "float gShade = clamp(dot(vColor, vec3(0.333))/uFloorLum, 0.35, 1.3);", GLOOM_GROUND,
  // grime at the foot of the walls: darker, browner, a ragged edge (not a clean gradient)
  "float gO = texture2D(tOcc, vGW.xz*uOccS).r; gO = smoothstep(0.0, 1.0, clamp(gO*1.25 + (gn2 - 0.5)*0.35, 0.0, 1.0))*uOccK;",
  "gc = mix(gc, gc*vec3(0.62, 0.55, 0.48)*0.55, gO);",
  // filth: mud, ash and rot lying over the stone in drifts, thickest along the walls,
  // so the floor's grid drowns in it here and there; the low wet parts glisten
  "float gFn = gn1*0.55 + gn2*0.45 + gO*0.5;",
  "float gF = smoothstep(0.4, 0.6, gFn);",
  "vec3 gMud = mix(gBase*0.42, vec3(0.07, 0.058, 0.046)*gShade, 0.45)*mix(0.75, 1.15, gn2);",   // the floor's own colour, sunk in dirt
  "gc = mix(gc, gMud, gF*0.92);",
  "gFlat = gF*0.85;",
  "gWet = smoothstep(0.7, 0.8, gFn + (gn1 - 0.5)*0.2)*0.85;",
  "gc *= 1.0 - gWet*0.35;",
  "diffuseColor.rgb = gc;"].join("\n");
const GLOOM_WALL = [GLOOM_COMMON,
  "{ vec3 sd = uSeeC - uSeeP; float sL = length(sd); vec3 sn = sd/sL, sq = vGW - uSeeP; float st = dot(sq, sn);",
  "  if(st > 0.25 && st < sL && vGW.y > 0.62){ float sr = length(sq - sn*st), sR = 1.15 + st*0.03;",
  "    if(inkBayer(gl_FragCoord.xy) < smoothstep(sR, sR*0.6, sr)*0.92) discard; } }",
  "float gShade = clamp(dot(vColor, vec3(0.333))/uWallLum, 0.35, 1.3);",
  "if(vGN.y > 0.5){", GLOOM_GROUND, "diffuseColor.rgb = gc; inkPoche = step(1.2, vGW.y)*uEtch; } else {",
  // bark and roots, climbing from the floor; rot veins up the lower wall
  "  vec2 wp = vec2(vGW.x + vGW.z, vGW.y);",
  "  float gB = smoothstep(1.0 - uGloom*1.35, 1.1 - uGloom*1.35, gfbm(wp*vec2(0.5, 0.8) + 2.0) + (1.0 - clamp(vGW.y/1.7, 0.0, 1.0))*0.3);",
  "  float st = abs(sin(wp.x*7.0 + gfbm(wp*vec2(2.0, 0.4))*7.0));",
  "  vec3 bark = mix(vec3(0.12, 0.11, 0.1), vec3(0.22, 0.2, 0.17), st)*1.7*gShade;",
  "  float gm = smoothstep(0.55, 0.0, vGW.y)*gB*uGloom;",
  "  bark = mix(bark, vec3(0.12, 0.2, 0.16)*2.0*gShade, gm);",
  "  vec3 gc = mix(gBase, bark, gB);",
  "  float gR = smoothstep(1.0 - gRot, 1.08 - gRot, gfbm(wp*0.6 + 3.0))*smoothstep(1.7, 0.1, vGW.y);",
  "  gc = mix(gc, vec3(0.09, 0.08, 0.075)*1.6*gShade, gR*0.85);",
  "  float gVein = smoothstep(0.07, 0.0, abs(gfbm(wp*vec2(1.2, 0.7) + 4.0) - 0.5));",
  "  gloomGlow += vec3(0.45, 1.0, 0.15)*gVein*0.25*(0.6 + 0.4*sin(uGTime*2.0 + wp.x))*gR;",
  "  diffuseColor.rgb = gc;",
  "}"].join("\n");
/* the colour cap: every surface is pulled toward its own grey until it is no
   more saturated than uSatCap. After the Gloom and the grime, before the light,
   so torchlight and spells still colour it and emissive glows are untouched. */
const SATCAP = [
  "{ float scMx = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b), scMn = min(min(diffuseColor.r, diffuseColor.g), diffuseColor.b);",
  "  float scS = (scMx - scMn)/max(scMx, 0.0001), scL = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));",
  "  diffuseColor.rgb = mix(vec3(scL), diffuseColor.rgb, min(1.0, uSatCap/max(scS, 0.0001)));",
  // and no surface is whiter than old bone: real things reflect at most ~60% of the
  // light (pale paint, bone, ivory), so skeletons and statues stop glowing like plastic
  "#ifdef INK_RIM",
  "  diffuseColor.rgb *= min(1.0, 0.42/max(scL, 0.0001)); }",   // characters: nothing on them paler than dirty bone (pale bits were what made them read as cartoons)
  "#else",
  "  diffuseColor.rgb *= min(1.0, 0.58/max(scL, 0.0001)); }",
  "#endif"
].join("\n");
/* the grain: the surface's normal nudged by a small 3D noise in the model's own
   space, at two scales (pores and weave, then dents and lumps) */
const GRAIN = [
  "normal = normalize(normal + (ignd(vInkO*34.0)*0.126 + ignd(vInkO*8.0)*0.108)*uGrain);"
].join("\n");
/* grime on characters, in their own space so it rides along with them:
   mottled stains at two scales, a fine grain, and dirt that rises from the feet */
const GRIME = [
  "float gr1 = ign(vInkO*7.0), gr2 = ign(vInkO*23.0 + 5.0), gr3 = igh(floor(vInkO*90.0));",
  "float grime = (0.78 + 0.32*gr1)*(0.9 + 0.16*gr2)*(0.95 + 0.08*gr3);",
  "grime *= mix(0.72, 1.0, smoothstep(0.0, 0.5, vInkO.y + gr1*0.15));",
  "diffuseColor.rgb *= mix(1.0, grime, uGrime);",
  // and the colours go a little dead: pulled toward their own grey
  "diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), diffuseColor.rgb, 1.0 - 0.28*uGrime);"
].join("\n");
K.inkify = function(mat, opts){
  opts = opts || {};
  mat.onBeforeCompile = sh=>{
    for(const k in K.INK) sh.uniforms[k] = K.INK[k];
    if(opts.gloom){
      for(const k in K.GLOOM) sh.uniforms[k] = K.GLOOM[k];
      sh.vertexShader = "varying vec3 vGW; varying vec3 vGN;\n" + sh.vertexShader.replace("#include <project_vertex>",
        "#include <project_vertex>\n vGW = (modelMatrix*vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix)*objectNormal);");
      sh.fragmentShader = GLOOM_PARS + "\n" + sh.fragmentShader
        .replace("#include <color_fragment>", "#include <color_fragment>\n" + (opts.gloom === "wall" ? GLOOM_WALL : GLOOM_FLOOR))
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += gloomGlow;")
        // filth is matte and smooths the stone's relief over; wet filth is glossy
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(mix(roughnessFactor, 1.0, gFlat), 0.2, gWet);")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = normalize(mix(normal, normalize(vNormal), max(gFlat, gWet)));");
    }
    // where the hatching lies: world space for the dungeon, a character's own space for characters
    sh.vertexShader = (opts.rim ? "#define INK_RIM\n" : "") + "varying vec3 vHP; varying vec3 vHN;\n" + sh.vertexShader.replace("#include <project_vertex>",
      "#include <project_vertex>\n vec4 inkHP = vec4(transformed, 1.0); vec3 inkHN = objectNormal;\n#ifndef INK_RIM\n#ifdef USE_INSTANCING\n inkHP = instanceMatrix*inkHP; inkHN = mat3(instanceMatrix)*inkHN;\n#endif\n inkHP = modelMatrix*inkHP; inkHN = mat3(modelMatrix)*inkHN;\n#endif\n vHP = inkHP.xyz; vHN = inkHN;");
    const std = mat.isMeshStandardMaterial;
    if(std && !opts.pbr){
      // a character or prop on the physically based model: its grime, rim and contact
      // shadow as before, and a fine grain pressed into the surface (skin, cloth, bone
      // and iron stop reading as smooth plastic)
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + INK_PARS)
        .replace("#include <lights_physical_fragment>", (opts.vivid ? "" : SATCAP) + "\n#include <lights_physical_fragment>")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n" + (opts.rim ? GRAIN : ""))
        .replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", INK_MAIN);
    } else if(opts.pbr){
      // a physically based surface (stone, wood, iron): the light falls on it as it
      // would, with its relief and roughness; only the colour cap and the Gloom are added
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + INK_PARS)
        .replace("#include <lights_physical_fragment>", (opts.vivid ? "" : SATCAP) + "\n#include <lights_physical_fragment>");
    } else sh.fragmentShader = sh.fragmentShader
      .replace("#include <gradientmap_pars_fragment>", INK_PARS)
      .replace("#include <lights_toon_fragment>", (opts.vivid ? "" : SATCAP) + "\n#include <lights_toon_fragment>")
      .replace("gl_FragColor = vec4( outgoingLight, diffuseColor.a );", INK_MAIN);
    // the PSX wobble (off unless uSnap is set): after every other vertex change
    sh.vertexShader = "uniform float uSnap, uSnapAsp;\n" + sh.vertexShader.replace("#include <fog_vertex>", "#include <fog_vertex>" + SNAP);
    if(opts.rim){
      if(opts.figure) sh.fragmentShader = "#define INK_FIGURE\n" + sh.fragmentShader;
      sh.fragmentShader = "#define INK_RIM\nvarying float vInkY; varying vec3 vInkO;\n" + sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n" + GRIME);
      sh.vertexShader = "varying float vInkY; varying vec3 vInkO;\n" + sh.vertexShader.replace("#include <project_vertex>",
        "#include <project_vertex>\n vInkO = transformed;\n#ifdef USE_INSTANCING\n vInkY = (modelMatrix*instanceMatrix*vec4(transformed, 1.0)).y;\n#else\n vInkY = (modelMatrix*vec4(transformed, 1.0)).y;\n#endif");
    }
  };
  mat.customProgramCacheKey = ()=> (opts.rim ? "ink-rim" : "ink") + (opts.figure ? "-fig" : "") + (opts.gloom ? "-gloom-" + opts.gloom : "") + (opts.vivid ? "-vivid" : "") + (opts.pbr ? "-pbr" : "") + "-etch";
  mat.extensions = Object.assign({}, mat.extensions, { derivatives:true });
  return mat;
};
/* the material: vertex colours by default; { rim:true } for characters,
   { gloom:"floor" | "wall" } for the dungeon's own floors and walls,
   { vivid:true } for the few things allowed their full colour (loot) */
K.ink = (opts)=>{
  opts = Object.assign({}, opts);
  const rim = opts.rim, gloom = opts.gloom, vivid = opts.vivid, figure = opts.figure; delete opts.rim; delete opts.gloom; delete opts.vivid; delete opts.figure;
  // characters and baked props (rim) are physically based; flat helpers stay toon
  const m = rim ? new THREE.MeshStandardMaterial(Object.assign({ vertexColors:true, roughness:0.78, metalness:0 }, opts))
                : new THREE.MeshToonMaterial(Object.assign({ vertexColors:true }, opts));
  return K.inkify(m, { rim, gloom, vivid, figure });
};
/* a figure (Zippy, Gribbus, every enemy): the character material with a stronger
   edge light, so what moves reads against the dark (props keep the faint one) */
K.figure = opts=> K.ink(Object.assign({ rim:true, figure:true }, opts));
/* a physically based surface: map, normalMap, roughnessMap; { gloom } as above */
K.inkPBR = (opts)=>{
  opts = Object.assign({}, opts);
  const gloom = opts.gloom, vivid = opts.vivid; delete opts.gloom; delete opts.vivid;
  return K.inkify(new THREE.MeshStandardMaterial(Object.assign({ vertexColors:true, roughness:1, metalness:0 }, opts)), { gloom, vivid, pbr:true });
};
K.toon = (opts)=> K.ink(Object.assign({ rim:true }, opts));
K.lambert = (c, opts)=> K.ink(Object.assign({ color:c, vertexColors:false }, opts));
K.vlambert = opts=> K.ink(opts);
K.outlineMat = (w)=> new THREE.ShaderMaterial({
  uniforms:{ uW:{ value:(w || 0.028)*K.OUTLINE }, uA:{ value:1 }, uInk:K.INK.uInk, uOutK:K.INK.uOutK, uSnap:K.INK.uSnap, uSnapAsp:K.INK.uSnapAsp }, side:THREE.BackSide, transparent:true,
  vertexShader:"uniform float uW, uOutK, uSnap, uSnapAsp; void main(){ vec3 p = position + normal*uW*uOutK; gl_Position = projectionMatrix*modelViewMatrix*vec4(p, 1.0);" + SNAP + " }",
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
/* every part's geometry, moved into place, tinted by its colour, written straight
   into one merged buffer (no per-part copies: baking was most of a floor's load) */
const _nm = new THREE.Matrix3();
function bakeParts(parts){
  let n = 0, ni = 0;
  parts.forEach(m=>{ const g = m.geometry; if(!g.attributes.normal) g.computeVertexNormals(); n += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
  const pos = new Float32Array(n*3), nor = new Float32Array(n*3), col = new Float32Array(n*3), uv = new Float32Array(n*2);
  const idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let o = 0, oi = 0;
  parts.forEach(m=>{
    m.updateMatrix();
    const g = m.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, C = g.attributes.color, U = g.attributes.uv, cnt = g.attributes.position.count;
    const e = m.matrix.elements, ne = _nm.getNormalMatrix(m.matrix).elements, c = m.material.color;
    for(let i=0;i<cnt;i++){
      const x = P[i*3], y = P[i*3 + 1], z = P[i*3 + 2], j = (o + i)*3;
      pos[j] = e[0]*x + e[4]*y + e[8]*z + e[12]; pos[j + 1] = e[1]*x + e[5]*y + e[9]*z + e[13]; pos[j + 2] = e[2]*x + e[6]*y + e[10]*z + e[14];
      const nx = N[i*3], ny = N[i*3 + 1], nz = N[i*3 + 2];
      let ax = ne[0]*nx + ne[3]*ny + ne[6]*nz, ay = ne[1]*nx + ne[4]*ny + ne[7]*nz, az = ne[2]*nx + ne[5]*ny + ne[8]*nz;
      const l = Math.hypot(ax, ay, az) || 1; nor[j] = ax/l; nor[j + 1] = ay/l; nor[j + 2] = az/l;
      if(C){ col[j] = c.r*C.getX(i); col[j + 1] = c.g*C.getY(i); col[j + 2] = c.b*C.getZ(i); } else { col[j] = c.r; col[j + 1] = c.g; col[j + 2] = c.b; }
      if(U){ uv[(o + i)*2] = U.getX(i); uv[(o + i)*2 + 1] = U.getY(i); }
    }
    if(g.index){ const ia = g.index.array; for(let i=0;i<ia.length;i++) idx[oi + i] = ia[i] + o; oi += ia.length; }
    else { for(let i=0;i<cnt;i++) idx[oi + i] = o + i; oi += cnt; }
    o += cnt;
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
  return g;
}
K.bake = function(root, opts){
  opts = opts || {};
  // no outline shell by default: at 0.006 units it was under a pixel wide, yet it
  // doubled every model's triangles and draw calls (the post pass draws the edges)
  const mat = opts.mat || K.toon(), out = opts.outline ? (opts.outlineMat || K.outlineMat(opts.w)) : null;
  const nodes = [];
  root.traverse(o=> nodes.push(o));
  nodes.forEach(o=>{
    const parts = o.children.filter(c=> c.isMesh && c.userData.part);
    if(!parts.length) return;
    const merged = bakeParts(parts);
    parts.forEach(m=>{ o.remove(m); m.geometry.dispose(); m.material.dispose(); });
    const mesh = new THREE.Mesh(merged, mat); mesh.userData.baked = true;
    mesh.castShadow = mesh.receiveShadow = true;   // in the lantern's shadow (stage.js)
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
  return new THREE.LatheGeometry(prof.map(p=> new THREE.Vector2(p[0], p[1])), Math.round((seg || 16)*1.5));
};
/* the same, but the profile is smoothed into a curve first (organic shapes:
   robes, skulls, bellies). n: points per profile segment */
K.slathe = function(prof, seg, n){
  if(prof[0][1] > prof[prof.length - 1][1]) prof = prof.slice().reverse();
  const c = new THREE.SplineCurve(prof.map(p=> new THREE.Vector2(p[0], p[1])));
  const pts = c.getPoints((prof.length - 1)*(n || 4)).map(p=> new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(pts, Math.round((seg || 16)*1.5));
};
/* tear a hem: vertices below y0 get dragged down into ragged strips (and a
   little outward), so cloth ends in tatters instead of a clean ring.
   strips: how many tatters around; len: how long the longest hangs */
K.tatter = function(g, y0, strips, len, seed){
  const a = g.attributes.position, s = seed || 1.3;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i);
    if(y > y0) continue;
    const ang = Math.atan2(x, z), k = (y0 - y)/(Math.abs(y0) + 0.0001 + 0.2);
    const h = Math.sin(Math.floor((ang + Math.PI)/(Math.PI*2)*strips)*12.9898 + s)*43758.5453;
    const cut = (h - Math.floor(h));
    const tri = Math.abs(((ang + Math.PI)/(Math.PI*2)*strips) % 1 - 0.5)*2;
    a.setY(i, y - len*(0.25 + 0.75*cut)*(1 - tri*0.7)*Math.min(1, k*3 + 0.3));
    const r = Math.hypot(x, z), o = 1 + 0.06*cut;
    if(r > 0.001){ a.setX(i, x*o); a.setZ(i, z*o); }
  }
  g.computeVertexNormals();
  return g;
};
/* push a geometry's surface in and out with smooth noise: sculpted, not
   faceted (flesh, bark, rock, gaunt faces). amt in units, freq per unit */
K.sculpt = function(g, amt, freq, seed){
  // (indexed geometry with its own smooth normals, so the surface stays closed)
  const a = g.attributes.position, f = freq || 4, s = seed || 0;
  const n3 = (x, y, z)=> Math.sin(x*f + s)*Math.sin(y*f*1.3 + s*2.1)*Math.sin(z*f*0.9 + s*0.7)
    + 0.5*Math.sin(x*f*2.3 + 1.7 + s)*Math.sin(y*f*2.1 + s)*Math.sin(z*f*2.7 + 0.4);
  if(!g.attributes.normal) g.computeVertexNormals();
  const nr = g.attributes.normal;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i), d = n3(x, y, z)*amt;
    a.setXYZ(i, x + nr.getX(i)*d, y + nr.getY(i)*d, z + nr.getZ(i)*d);
  }
  g.computeVertexNormals();
  return g;
};
/* a shard: the anti-lump. A faceted spike that tapers from r at its foot to a
   point at len (+y), bent toward +z by `bend` (a fraction of its length), its
   facets jittered so no two are alike. For horns, spines, claws, splinters of
   bone and the plates of armour: hard, angular forms that never read as soft. */
K.shard = function(len, r, bend, sides, seed){
  const s = seed === undefined ? 1 : seed, b = bend || 0;
  const g = new THREE.CylinderGeometry(r*0.06, r, len, sides || 5, 4, false).toNonIndexed();
  g.translate(0, len/2, 0);
  const a = g.attributes.position;
  for(let i=0;i<a.count;i++){
    const x = a.getX(i), y = a.getY(i), z = a.getZ(i), t = y/len;
    const h = Math.sin((Math.round(x*1e3)*12.9898 + Math.round(y*1e3)*78.233 + Math.round(z*1e3)*37.719)*0.001 + s)*43758.5453;
    const j = 1 + ((h - Math.floor(h)) - 0.5)*0.4;
    a.setXYZ(i, x*j, y, z*j + b*len*t*t);
  }
  g.computeVertexNormals();
  return g;
};
/* a tube along points */
K.tube = function(pts, r, seg, rseg){ return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=> new THREE.Vector3(p[0], p[1], p[2]))), Math.round((seg || 12)*1.5), r, Math.max(8, rseg || 6), false); };

K.timed = [];
K.tick = t=>{ K.GLOOM.uGTime.value = t; K.timed.forEach(m=>{ if(m.uniforms && m.uniforms.uTime) m.uniforms.uTime.value = t; }); };

K.hex = c=> "#" + new THREE.Color(c).getHexString();

})();
