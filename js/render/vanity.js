/* ------------------------------------------------------------------ *
 *  Vanity: everything in the dungeon that's only there to be looked at.
 *  None of it touches the game; it all comes from the view's own RNG,
 *  seeded by the dungeon, so a seed always dresses the same way.
 *
 *  - floor decals from one painted atlas: cracks, stains, moss, rugs,
 *    rune circles, puddles, straw, grates, drag marks, pools of old blood
 *  - a dithered ground mist that thickens the deeper you go
 *  - shafts of light falling from cracks in the ceiling
 *  - stone arches over the doorways
 *  - dressing on every wall face and on the wall tops
 *  - little lives: rats along the walls, bats overhead, fireflies,
 *    drifting spores, motes and blood cells
 *  - splats where things die and scorch where things blow up, which
 *    stay for the whole floor
 * ------------------------------------------------------------------ */
(function(){
"use strict";
const DG = window.DG, K = DG.Kit, T = DG.TILE, PI = Math.PI;
const proto = DG.World.prototype;
const WH = K.WALL_H;

/* ---- the decal atlas: 4×4 cells, painted once, white on clear so vertex colours tint them ---- */
const CELL = { crack:0, stain:1, moss:2, rune:3, rug:4, splat:5, scorch:6, leaves:7, straw:8, grate:9, puddle:10, drag:11, blood:12, tiles:13, prints:14, drips:15 };
let _atlas = null;
function atlas(){
  if(_atlas) return _atlas;
  const N = 128, cv = document.createElement("canvas"); cv.width = cv.height = N*4; const g = cv.getContext("2d");
  const r = DG.RNG(1234).next;
  const cell = (i, f)=>{ g.save(); g.translate((i % 4)*N, Math.floor(i/4)*N); g.beginPath(); g.rect(0, 0, N, N); g.clip(); f(); g.restore(); };
  const blob = (x, y, rad, a)=>{ const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, "rgba(255,255,255," + a + ")"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill(); };
  const jag = (x, y, a, len, w)=>{ g.lineWidth = w; g.beginPath(); g.moveTo(x, y); for(let k=0;k<len;k+=8){ a += (r() - 0.5)*0.9; x += Math.cos(a)*8; y += Math.sin(a)*8; g.lineTo(x, y); if(r() < 0.18 && w > 1.2) jag(x, y, a + (r() < 0.5 ? 1 : -1)*0.9, len*0.4, w*0.6); } g.stroke(); };
  g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round"; g.lineJoin = "round";
  cell(CELL.crack, ()=>{ g.strokeStyle = "#fff"; for(let k=0;k<3;k++) jag(64, 64, r()*6.28, 60, 3); });
  cell(CELL.stain, ()=>{ for(let k=0;k<7;k++) blob(40 + r()*48, 40 + r()*48, 18 + r()*26, 0.45); });
  cell(CELL.moss, ()=>{ for(let k=0;k<260;k++){ const a = r()*6.28, d = Math.pow(r(), 0.7)*54; g.globalAlpha = 0.4 + r()*0.6; g.beginPath(); g.arc(64 + Math.cos(a)*d, 64 + Math.sin(a)*d*0.8, 1.5 + r()*3, 0, 7); g.fill(); } g.globalAlpha = 1; });
  cell(CELL.rune, ()=>{ g.lineWidth = 3; [56, 44].forEach(rr=>{ g.beginPath(); g.arc(64, 64, rr, 0, 7); g.stroke(); }); g.lineWidth = 2; g.beginPath(); for(let k=0;k<=5;k++){ const a = k*PI*4/5 - PI/2; const x = 64 + Math.cos(a)*44, y = 64 + Math.sin(a)*44; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    for(let k=0;k<12;k++){ const a = k/12*PI*2; g.save(); g.translate(64 + Math.cos(a)*50, 64 + Math.sin(a)*50); g.rotate(a); g.fillRect(-1, -4, 2, 8); if(k % 2) g.fillRect(-4, -1, 8, 2); g.restore(); } });
  cell(CELL.rug, ()=>{ g.fillStyle = "rgba(255,255,255,0.95)"; g.fillRect(4, 4, 120, 120); g.fillStyle = "rgba(150,150,150,1)"; g.fillRect(12, 12, 104, 104); g.fillStyle = "rgba(225,225,225,1)"; g.fillRect(18, 18, 92, 92);
    g.fillStyle = "rgba(120,120,120,1)"; for(let y=26;y<110;y+=20) for(let x=26;x<110;x+=20){ g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 16, y + 8); g.lineTo(x + 8, y + 16); g.lineTo(x, y + 8); g.fill(); }
    g.fillStyle = "rgba(255,255,255,0.9)"; for(let x=6;x<124;x+=6){ g.fillRect(x, 0, 2, 3 + r()*4); g.fillRect(x, 121 + r()*3, 2, 5); }
    // worn through, burnt, torn away at a corner
    g.globalCompositeOperation = "destination-out"; for(let k=0;k<9;k++){ const x = r()*128, y = r()*128, rr = 4 + r()*16; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, "rgba(0,0,0,0.9)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr*2, rr*2); }
    g.fillStyle = "#000"; g.beginPath(); g.moveTo(128, 70); for(let k=0;k<8;k++) g.lineTo(128 - 20 - r()*30, 70 + k*8); g.lineTo(128, 128); g.fill(); g.globalCompositeOperation = "source-over"; });
  cell(CELL.splat, ()=>{ blob(64, 64, 30, 1); blob(64, 64, 36, 0.8); for(let k=0;k<14;k++){ const a = r()*6.28, d = 30 + r()*28, rr = 2 + r()*7; g.beginPath(); g.arc(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, rr, 0, 7); g.fill(); g.lineWidth = rr*0.8; g.beginPath(); g.moveTo(64 + Math.cos(a)*20, 64 + Math.sin(a)*20); g.lineTo(64 + Math.cos(a)*d, 64 + Math.sin(a)*d); g.stroke(); } });
  cell(CELL.scorch, ()=>{ blob(64, 64, 58, 0.9); blob(64, 64, 34, 1); g.lineWidth = 3; for(let k=0;k<16;k++){ const a = r()*6.28; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + Math.cos(a)*(40 + r()*22), 64 + Math.sin(a)*(40 + r()*22)); g.stroke(); } g.globalAlpha = 1; });
  cell(CELL.leaves, ()=>{ for(let k=0;k<16;k++){ g.save(); g.translate(14 + r()*100, 14 + r()*100); g.rotate(r()*6.28); const v = 160 + (r()*95|0); g.fillStyle = "rgb(" + v + "," + v + "," + v + ")"; g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, 7); g.fill(); g.restore(); } });
  cell(CELL.straw, ()=>{ g.lineWidth = 1.6; for(let k=0;k<55;k++){ const x = 20 + r()*88, y = 20 + r()*88, a = r()*6.28, l = 8 + r()*16; const v = 190 + (r()*65|0); g.strokeStyle = "rgb(" + v + "," + v + "," + v + ")"; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a)*l, y + Math.sin(a)*l); g.stroke(); } });
  cell(CELL.grate, ()=>{ g.fillStyle = "rgba(200,200,200,1)"; g.fillRect(24, 24, 80, 80); g.fillStyle = "rgba(10,10,10,1)"; for(let x=34;x<100;x+=14) g.fillRect(x, 32, 7, 64); g.fillStyle = "rgba(255,255,255,1)"; g.fillRect(24, 24, 80, 5); g.fillRect(24, 24, 5, 80); });
  cell(CELL.puddle, ()=>{ g.save(); g.scale(1, 0.7); blob(64, 91, 54, 0.8); blob(64, 91, 40, 0.9); g.restore(); g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 3; g.beginPath(); g.ellipse(52, 56, 18, 8, -0.2, 3.6, 5.2); g.stroke(); });
  // something dragged away: two smeared tracks, clawed fingermarks at the start
  cell(CELL.drag, ()=>{ g.lineCap = "round"; for(let t=0;t<2;t++){ const x0 = 50 + t*26; for(let k=0;k<5;k++){ g.globalAlpha = 0.25 + r()*0.35; g.lineWidth = 3 + r()*7; g.beginPath(); g.moveTo(x0 + (r() - 0.5)*10, 122); g.bezierCurveTo(x0 + (r() - 0.5)*24, 90, x0 + (r() - 0.5)*30, 40, x0 - 6 + (r() - 0.5)*16, 6 + r()*16); g.stroke(); } } g.globalAlpha = 0.9; for(let k=0;k<4;k++){ g.lineWidth = 2.2; g.beginPath(); g.moveTo(44 + k*8, 120); g.lineTo(42 + k*8 + (r() - 0.5)*4, 100 - r()*8); g.stroke(); } g.globalAlpha = 1; });
  // a pool gone dark at the edges, with spatter thrown out of it
  cell(CELL.blood, ()=>{ for(let k=0;k<5;k++) blob(52 + r()*24, 52 + r()*24, 20 + r()*18, 0.8); g.globalAlpha = 0.9; for(let k=0;k<22;k++){ const a = r()*6.28, d = 34 + r()*26, rr = 1 + r()*3.5; g.beginPath(); g.ellipse(64 + Math.cos(a)*d, 64 + Math.sin(a)*d, rr*1.8, rr, a, 0, 7); g.fill(); } g.globalAlpha = 1; });
  cell(CELL.tiles, ()=>{ for(let k=0;k<4;k++){ const x = 8 + (r()*3|0)*40, y = 8 + (r()*3|0)*40; g.fillStyle = "rgba(255,255,255,1)"; g.fillRect(x, y, 34, 34); g.fillStyle = "rgba(120,120,120,1)"; g.fillRect(x + 4, y + 4, 30, 30); } });
  cell(CELL.prints, ()=>{ for(let k=0;k<6;k++){ const x = 30 + k*12 + (k % 2)*10, y = 110 - k*18; g.beginPath(); g.ellipse(x, y, 4, 6, 0.3, 0, 7); g.fill(); for(let q=-1;q<=1;q++){ g.beginPath(); g.arc(x + q*4, y - 9, 1.8, 0, 7); g.fill(); } } });
  cell(CELL.drips, ()=>{ for(let k=0;k<7;k++){ const x = 8 + r()*112, l = 30 + r()*90; g.lineWidth = 3 + r()*4; g.globalAlpha = 0.5 + r()*0.5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, l); g.stroke(); g.beginPath(); g.arc(x, l, g.lineWidth*0.8, 0, 7); g.fill(); } g.globalAlpha = 1; });
  _atlas = new THREE.CanvasTexture(cv); _atlas.magFilter = THREE.NearestFilter; _atlas.minFilter = THREE.NearestFilter; _atlas.generateMipmaps = false;
  return _atlas;
}
/* one quad of the atlas, flat on the floor or standing on a wall face */
function decal(list, cell, x, y, z, w, h, rot, col, wall){
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv, cx = cell % 4, cy = Math.floor(cell/4);
  for(let i=0;i<uv.count;i++) uv.setXY(i, (cx + uv.getX(i))/4, (3 - cy + uv.getY(i))/4);
  if(!wall) g.rotateX(-PI/2);
  g.rotateY(rot || 0);
  g.translate(x, y, z);
  K.paint(g, col);
  list.push(g);
}
const decalMat = ()=> K.ink({ map:atlas(), transparent:true, depthWrite:false, alphaTest:0.04, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2 });

/* ---- what each floor scatters about ---- */
const THEMES = {
  castle:{ decals:[["crack", 3, 0x141012], ["stain", 2, 0x161210], ["tiles", 1.2, 0x1e1a1c], ["blood", 0.9, 0x3a0c08], ["drag", 0.7, 0x3a0c08], ["prints", 0.5, 0x3a0c08], ["straw", 0.5, 0x6a5a38], ["splat", 0.4, 0x2e0a08]], rug:[0.55, 0x5a1a16],
    walls:["banner", "tapestry", "shieldwall", "cornerweb", "window", "chains", "bloodsmear", "cornerweb", "slumped", "gibbet"], tops:["toprubble", "topcandle", "topskull", "topspikes"], corners:["candlecluster", "skullpile", "bones", "candlecluster"], critters:{ rats:1.6 }, motes:{ c:0xffd0a0, n:4, sp:0.2 } },
  undercroft:{ decals:[["crack", 4, 0x100e0c], ["stain", 3, 0x14120c], ["moss", 2.5, 0x1e2e1e], ["puddle", 1.6, 0x0a1414], ["grate", 0.6, 0x4a4a48], ["drag", 0.4, 0x2a0c08], ["blood", 0.4, 0x2a0c08], ["prints", 0.4, 0x141008]], rug:[0, 0],
    walls:["beam", "pipes", "barrelrack", "cornerweb", "roots", "glowworms", "poster", "chains", "wallshroom", "slumped"], tops:["toprubble", "topgrass", "topcandle", "topbones"], corners:["bones", "mushrooms", "ratnest", "candlecluster"], critters:{ rats:2.6 }, motes:{ c:0xb8d870, n:8, sp:0.4 } },
  crypt:{ decals:[["crack", 5, 0x08080e], ["stain", 3, 0x10101c], ["rune", 0.5, 0x6ab8ff], ["tiles", 1, 0x14141c], ["moss", 1.5, 0x142a24], ["blood", 0.5, 0x2a0a10], ["drag", 0.4, 0x2a0a10]], rug:[0, 0],
    walls:["window", "coffinwall", "urnshelf", "cornerweb", "skullniche", "ossuary", "candleshelf", "cornerweb", "slumped"], tops:["topcandle", "topskull", "topbones", "topcandle"], corners:["candlecluster", "soulcandles", "skullpile", "soulcandles"], critters:{ rats:1, bats:2 }, motes:{ c:0x8ac8ff, n:10, sp:0.3 } },
  gloomwood:{ decals:[["moss", 5, 0x142a24], ["leaves", 3, 0x1e2a22], ["splat", 2, 0x2a1024], ["puddle", 1.5, 0x10061a], ["rune", 0.3, 0x5ab8e8], ["crack", 1.5, 0x08080c], ["drag", 0.4, 0x2a0a10]], rug:[0, 0],
    walls:["roots", "glowworms", "stalactites", "hangingmoss", "drips", "wallroots"], tops:["topgrass", "topgrass", "toprubble", "topbones"], corners:["glowcap", "myceliumcorpse", "roots", "fern"], critters:{ bats:1.4 }, motes:{ c:0x6ad8ff, n:18, sp:0.35 } },
  forest:{ decals:[["moss", 5, 0x142a24], ["leaves", 5, 0x1e2a22], ["splat", 2.5, 0x2a1024], ["puddle", 1.5, 0x1a0624], ["prints", 0.4, 0x080e0a], ["drag", 0.3, 0x2a0a10]], rug:[0, 0],
    walls:["roots", "glowworms", "hangingmoss", "roots", "wallroots"], tops:["topgrass", "topgrass", "topgrass", "topbones"], corners:["glowcap", "cordyceps", "glowcap", "fern"], critters:{ bats:1 }, motes:{ c:0x6ad8ff, n:30, sp:0.3 } }
};
const pickW = (rnd, list)=>{ let tot = 0; list.forEach(e=> tot += e[1]); let v = rnd()*tot; for(const e of list){ v -= e[1]; if(v <= 0) return e; } return list[0]; };

proto.buildVanity = function(){
  const W = this, D = W.D, th = W.th, rnd = W.rnd, T0 = THEMES[th.decor] || THEMES.cellar;
  const floorAt = (x, y)=> D.at(Math.floor(x), Math.floor(y)) === T.FLOOR;
  const walk = t=> t === T.FLOOR || t === T.DOOR || t === T.PIT || t === T.BLOCK || t === T.BREAK || t === T.PUSH || t === T.WATER;
  W.vanityMats = []; W.critters = []; W.shafts = [];
  const byArea = {}, glowByArea = {};
  const extra = [];
  const taken = new Set(D.decor.filter(d=> d.wall).map(d=> Math.floor(d.x) + "," + Math.floor(d.y)));
  D.painted.forEach(p=> taken.add(p.x + "," + (p.y + 1)));

  D.rooms.forEach(r=>{
    const list = byArea[r.id] = byArea[r.id] || [], glowList = glowByArea[r.id] = glowByArea[r.id] || [];
    const w = r.x2 - r.x1 + 1, h = r.y2 - r.y1 + 1, area = w*h;
    // floor decals
    const n = Math.round(area/9);
    for(let i=0;i<n;i++){
      const x = r.x1 + 0.5 + rnd()*(w - 1), y = r.y1 + 0.5 + rnd()*(h - 1);
      if(!floorAt(x, y)) continue;
      const [kind, , col] = pickW(rnd, T0.decals), s = kind === "grate" ? 1 : 0.8 + rnd()*1.1;
      const c = new THREE.Color(col).multiplyScalar(0.8 + rnd()*0.4);
      if(kind === "rune") decal(glowList, CELL.rune, x, 0.025, y, 2.2, 2.2, rnd()*6, c);
      else decal(list, CELL[kind], x, 0.012 + i*0.0004, y, s, s, kind === "grate" || kind === "tiles" ? 0 : rnd()*6, c);
    }
    // a rug down the middle of the room
    if(T0.rug[0] && rnd() < T0.rug[0] && w >= 7 && h >= 6 && r.type !== "pond"){
      const rx = (r.x1 + r.x2 + 1)/2, ry = (r.y1 + r.y2 + 1)/2, long = w > h;
      decal(list, CELL.rug, rx, 0.01, ry, long ? Math.min(w - 4, 9) : 3, long ? 3 : Math.min(h - 3, 8), 0, new THREE.Color(T0.rug[1]));
    }
    // drips and cracks down the north wall's face
    for(let x=r.x1; x<=r.x2; x++){
      if(D.at(x, r.y1 - 1) !== T.SOLID || rnd() > 0.22) continue;
      const k = rnd() < 0.5 ? CELL.drips : CELL.crack;
      decal(list, k, x + 0.5, 1.0, r.y1 + 0.006, 1, k === CELL.drips ? 1.3 : 1, 0, new THREE.Color(k === CELL.drips ? new THREE.Color(th.ink).getHex() : 0x101010).lerp(new THREE.Color(th.wall), 0.3), true);
    }
    // wall dressing on the north wall and both side walls, and things on the wall tops
    const wallKinds = T0.walls;
    for(let x=r.x1 + 1; x<r.x2; x++){
      if(D.at(x, r.y1 - 1) !== T.SOLID || taken.has(x + "," + r.y1) || rnd() > 0.22) continue;
      if(D.at(x - 1, r.y1 - 1) !== T.SOLID || D.at(x + 1, r.y1 - 1) !== T.SOLID) continue;
      taken.add(x + "," + r.y1); taken.add((x + 1) + "," + r.y1); taken.add((x - 1) + "," + r.y1);
      extra.push({ kind:rnd() < 0.15 && wallKinds.indexOf("cornerweb") >= 0 ? "cornerweb" : wallKinds[Math.floor(rnd()*wallKinds.length)], x:x + 0.5, y:r.y1 + 0.02, face:true, rotY:0, area:r.id, room:r.id, s:0.9 + rnd()*0.25 });
    }
    [[r.x1 - 1, PI/2, r.x1 + 0.02], [r.x2 + 1, -PI/2, r.x2 + 0.98]].forEach(([wx, rotY, fx])=>{
      for(let y=r.y1 + 1; y<r.y2; y++){
        if(D.at(wx, y) !== T.SOLID || D.at(wx, y - 1) !== T.SOLID || D.at(wx, y + 1) !== T.SOLID || rnd() > 0.14) continue;
        const kind = wallKinds[Math.floor(rnd()*wallKinds.length)];
        if(kind === "cornerweb" || kind === "window") continue;
        extra.push({ kind, x:fx, y:y + 0.5, face:true, rotY, area:r.id, room:r.id, s:0.85 + rnd()*0.2 });
        y += 2;
      }
    });
    for(let x=r.x1 - 1; x<=r.x2 + 1; x++){
      const y = r.y1 - 1;
      if(D.at(x, y) !== T.SOLID || rnd() > 0.12) continue;
      const a = W.area[y*D.w + x]; if(a !== r.id) continue;
      extra.push({ kind:T0.tops[Math.floor(rnd()*T0.tops.length)], x:x + 0.5, y:y + 0.5, h:WH, rot:rnd()*6, area:a, room:r.id, s:0.9 + rnd()*0.4 });
    }
    // the corners: where candles were left burning for the dead, and the dead were left
    const corner = T0.corners;
    if(corner) [[r.x1 + 0.6, r.y1 + 0.55], [r.x2 + 0.4, r.y1 + 0.55], [r.x1 + 0.6, r.y2 + 0.4], [r.x2 + 0.4, r.y2 + 0.4]].forEach(([x, y], k)=>{
      if(rnd() > 0.55 || !floorAt(x, y) || DG.Dungeon.nearDoor(D, r, Math.floor(x), Math.floor(y), 2)) return;
      if(r.props.some(p=> Math.abs(p.x + 0.5 - x) < 1.5 && Math.abs(p.y + 0.5 - y) < 1.5)) return;
      extra.push({ kind:corner[Math.floor(rnd()*corner.length)], x, y, rot:rnd()*6.28, area:r.id, room:r.id, s:0.85 + rnd()*0.3 });
    });
    // light falling through a crack in the ceiling
    const nShafts = area > 260 ? 2 : rnd() < 0.55 ? 1 : 0;
    for(let i=0;i<nShafts;i++){
      const x = r.x1 + 2 + rnd()*Math.max(1, w - 4), y = r.y1 + 2 + rnd()*Math.max(1, h - 4);
      if(floorAt(x, y)) W.shafts.push({ x, y, room:r.id, ph:rnd()*6, w:1.8 + rnd()*1.2 });
    }
    // little lives
    const cr = T0.critters;
    if(cr.rats && rnd() < 0.5) for(let i=0;i<Math.round(cr.rats*rnd() + 0.4);i++) W.critters.push({ kind:"rat", room:r.id, x:r.x1 + 0.5, y:r.y1 + 0.5, t:rnd()*w, wait:rnd()*3, dir:rnd() < 0.5 ? 1 : -1 });
    if(cr.bats && rnd() < 0.45) for(let i=0;i<Math.round(cr.bats*rnd() + 0.5);i++) W.critters.push({ kind:"bat", room:r.id, ph:rnd()*6, rad:1.5 + rnd()*2.5, sp:(0.6 + rnd()*0.6)*(rnd() < 0.5 ? 1 : -1), h:2.2 + rnd()*1 });
  });
  // corridors get cracks and stains too
  D.corridors.forEach(c=>{
    const list = byArea[100 + c.id] = byArea[100 + c.id] || [];
    c.tiles.forEach(([x, y], i)=>{ if(i % 3 || rnd() > 0.5 || D.at(x, y) !== T.FLOOR) return; const [kind, , col] = pickW(rnd, T0.decals); if(kind === "rune") return; decal(list, CELL[kind], x + 0.5, 0.012, y + 0.5, 0.7 + rnd()*0.6, 0.7 + rnd()*0.6, rnd()*6, new THREE.Color(col)); });
  });
  // bake the decals, one mesh per area
  const mat = decalMat();
  for(const a in byArea){ if(byArea[a].length){ const m = new THREE.Mesh(K.merge(byArea[a]), mat); m.renderOrder = 1; W.areaGroup(+a).add(m); } }
  const glowMat = new THREE.MeshBasicMaterial({ map:atlas(), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, vertexColors:true, opacity:0.55 });
  W.runeMat = glowMat;
  for(const a in glowByArea){ if(glowByArea[a].length){ const m = new THREE.Mesh(K.merge(glowByArea[a]), glowMat); m.renderOrder = 2; W.areaGroup(+a).add(m); } }

  W.buildArches();
  W.buildDecor(extra);
  W.buildMist();
  W.buildShafts();
  W.buildCritters(T0);
  W.buildBackdrop();
  W.buildSplats();
};

/* ---- stone arches over the doorways (short posts on the low south walls, so Zippy never hides) ---- */
proto.buildArches = function(){
  const W = this, D = W.D, th = W.th;
  const walk = t=> t === T.FLOOR || t === T.DOOR || t === T.PIT || t === T.BLOCK || t === T.BREAK || t === T.PUSH || t === T.WATER;
  const stone = new THREE.Color(th.top).multiplyScalar(1.35).getHex(), dark = new THREE.Color(th.wall).multiplyScalar(0.9).getHex();
  const key = { castle:0x5a5650, undercroft:0x4a4a40, crypt:0x8a8270, gloomwood:0x3a3440, forest:0x2e2632 }[th.decor] || 0x5a5650;
  const byArea = {};
  D.doors.forEach(d=>{
    const tx = Math.floor(d.x), ty = Math.floor(d.y), h = d.axis !== "v";
    const a = W.area[ty*D.w + tx]; if(a < 0) return;
    const pillars = h ? [[tx - 2, ty], [tx + 2, ty]] : [[tx, ty - 2], [tx, ty + 2]];
    const low = h && pillars.some(([px, py])=> walk(D.at(px, py - 1)) && !walk(D.at(px, py + 1)));
    const g = byArea[a] || (byArea[a] = new THREE.Group());
    // a full arch only over doors in a north wall; posts everywhere else
    const arch = h && !low && walk(D.at(tx, ty - 1)) && D.rooms.some(r=> ty === r.y1 - 1 && tx >= r.x1 && tx <= r.x2);
    const ph = low ? 0.95 : arch ? WH + 0.75 : WH + 0.3;
    pillars.forEach(([px, py])=>{
      const x = px + 0.5, z = py + 0.5;
      K.part(g, new THREE.BoxGeometry(1.12, ph, 1.12), stone, x, ph/2, z);
      K.part(g, new THREE.BoxGeometry(1.24, 0.16, 1.24), dark, x, ph + 0.08, z);
      K.part(g, new THREE.BoxGeometry(1.22, 0.2, 1.22), dark, x, 0.1, z);
      if(arch){ const o = [0, 0.58]; K.part(g, new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), 0x2a2a30, x + o[0], 1.45, z + o[1]); }
    });
    if(arch){
      const span = 5.2, x = tx + 0.5, z = ty + 0.5;
      K.part(g, new THREE.BoxGeometry(h ? span : 1.1, 0.36, h ? 1.1 : span), stone, x, WH + 0.62, z);
      K.part(g, new THREE.BoxGeometry(h ? span + 0.1 : 1.2, 0.1, h ? 1.2 : span + 0.1), dark, x, WH + 0.85, z);
      K.part(g, new THREE.BoxGeometry(0.42, 0.5, 1.2), key, x, WH + 0.62, z, 0, h ? 0 : PI/2, 0);
      // a skull carved in the keystone, staring down at whoever comes through
      if(h) DG.Decor.skull(g, x, WH + 0.5, z + 0.6, 0.12, 0, 0.3, key === 0x8a8270 ? 0xa89c84 : new THREE.Color(key).multiplyScalar(1.25).getHex());
      // and chains hanging from the arch
      [-1, 1].forEach(s=>{ for(let k=0;k<6;k++) K.part(g, new THREE.TorusGeometry(0.035, 0.01, 3, 8), 0x3a3a3e, x + s*(h ? 1.6 : 0), WH + 0.4 - k*0.07, z + (h ? 0.58 : s*1.6), 0, k % 2 ? PI/2 : 0, 0); });
    }
  });
  for(const a in byArea){ W.areaGroup(+a).add(byArea[a]); K.bake(byArea[a], { w:0.022 }); }
};

/* ---- the mist: stippled in the same dither as the ink, drifting at ankle height ---- */
proto.buildMist = function(){
  const W = this, D = W.D, th = W.th;
  const den = th.mist === undefined ? 0.25 : th.mist;
  const col = new THREE.Color(th.ambient).lerp(new THREE.Color(th.rim || 0xffffff), 0.25).multiplyScalar(0.55);
  const m = new THREE.ShaderMaterial({
    uniforms:{ uTime:{ value:0 }, uDen:{ value:den }, uCol:{ value:col } }, transparent:true, depthWrite:false,
    vertexShader:"varying vec2 vW; void main(){ vec4 w = modelMatrix*vec4(position, 1.0); vW = w.xz; gl_Position = projectionMatrix*viewMatrix*w; }",
    fragmentShader:[
      "uniform float uTime, uDen; uniform vec3 uCol; varying vec2 vW;",
      "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)))*43758.5453); }",
      "float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0 - 2.0*f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }",
      "float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y*0.75))); }",
      "void main(){ vec2 p = vW*0.32;",
      "  float f = n(p + vec2(uTime*0.06, uTime*0.025))*0.6 + n(p*2.1 - vec2(uTime*0.09, -uTime*0.04))*0.3 + n(p*4.7 + uTime*0.12)*0.1;",
      "  float a = smoothstep(0.38, 0.9, f)*uDen;",
      "  float d = b2(0.5*gl_FragCoord.xy)*0.25 + b2(gl_FragCoord.xy);",
      "  a = floor(a*5.0 + d)/5.0;",
      "  gl_FragColor = vec4(uCol*(0.8 + f*0.5), a); }"].join("\n")
  });
  K.timed.push(m); W.vanityMats.push(m); W.mistMat = m;
  D.rooms.forEach(r=>{
    const w = r.x2 - r.x1 + 3, h = r.y2 - r.y1 + 3;
    const g = new THREE.PlaneGeometry(w, h); g.rotateX(-PI/2); g.translate((r.x1 + r.x2 + 1)/2, 0.16, (r.y1 + r.y2 + 1)/2);
    const mesh = new THREE.Mesh(g, m); mesh.renderOrder = 3;
    W.areaGroup(r.id).add(mesh);
  });
};

/* ---- shafts of light: two crossed, leaning planes, soft at the edges, with a pool where they land ---- */
proto.buildShafts = function(){
  const W = this, th = W.th;
  const col = new THREE.Color(th.shaft || 0xffe2a8);
  const m = new THREE.ShaderMaterial({
    uniforms:{ uTime:{ value:0 }, uCol:{ value:col } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide,
    vertexShader:"varying vec2 vUv; varying float vPh; attribute float aPh; void main(){ vUv = uv; vPh = aPh; gl_Position = projectionMatrix*modelViewMatrix*vec4(position, 1.0); }",
    fragmentShader:[
      "uniform float uTime; uniform vec3 uCol; varying vec2 vUv; varying float vPh;",
      "void main(){ float e = 1.0 - abs(vUv.x*2.0 - 1.0); e = pow(e, 1.6);",
      "  float v = smoothstep(0.0, 0.25, vUv.y)*(1.0 - smoothstep(0.7, 1.0, vUv.y));",
      "  float dust = 0.75 + 0.25*sin(vUv.y*30.0 - uTime*1.5 + vPh*7.0)*sin(vUv.x*9.0 + uTime*0.7);",
      "  float fl = 0.8 + 0.2*sin(uTime*0.9 + vPh);",
      "  gl_FragColor = vec4(uCol*e*v*dust*fl*0.26, 1.0); }"].join("\n")
  });
  K.timed.push(m); W.vanityMats.push(m);
  const byRoom = {};
  W.shafts.forEach(s=>{
    // one plane faces the camera (so the shaft reads as a broad beam), one crosses it
    [0, PI/2].forEach((rot, k)=>{
      const g = new THREE.PlaneGeometry(k ? s.w*0.6 : s.w, 6, 1, 6); g.translate(0, 3, 0); g.rotateY(rot);
      const a = g.attributes.position; for(let i=0;i<a.count;i++){ const y = a.getY(i); a.setX(i, a.getX(i) - y*0.28); a.setZ(i, a.getZ(i) - y*0.35); }
      g.translate(s.x, 0, s.y);
      const ph = new Float32Array(a.count).fill(s.ph); g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
      (byRoom[s.room] = byRoom[s.room] || []).push(g);
    });
    const pool = new THREE.Mesh(K.glowPlane, K.glowMat(col, 0.28)); pool.scale.set(s.w*2.6, 1, s.w*2.6); pool.position.set(s.x, 0.04, s.y);
    W.areaGroup(s.room).add(pool);
    W.lights.push({ x:s.x, y:2.5, z:s.y, c:col.getHex(), i:0.7, room:s.room, ph:s.ph, small:true });
  });
  for(const r in byRoom){
    const parts = byRoom[r].map(g=> g.toNonIndexed());
    const merged = new THREE.BufferGeometry();
    ["position", "uv", "aPh"].forEach(k=>{ const size = parts[0].attributes[k].itemSize; let n = 0; parts.forEach(p=> n += p.attributes[k].count); const arr = new Float32Array(n*size); let o = 0; parts.forEach(p=>{ arr.set(p.attributes[k].array, o); o += p.attributes[k].array.length; }); merged.setAttribute(k, new THREE.BufferAttribute(arr, size)); });
    const mesh = new THREE.Mesh(merged, m); mesh.renderOrder = 5; mesh.frustumCulled = false;
    W.areaGroup(+r).add(mesh);
  }
};

/* ---- beyond the walls: as the Gloom takes over, a dead forest of bare trees and
   giant glowcaps grows in the void around the rooms (never south of anything
   Zippy stands on, so it never hides him) ---- */
proto.buildBackdrop = function(){ /* dead trees and dark glowcaps beyond the walls */
  const W = this, D = W.D, g = W.th.gloom || 0;
  if(g < 0.5) return;
  const walk = t=> t !== T.SOLID && t !== T.FAKE;
  const rnd = DG.RNG(D.seed ^ 0x6100).next, trees = [], caps = {}, stems = [], halos = [];
  const near = (x, y, d)=>{ for(let yy=y - d; yy<=y + d; yy++) for(let xx=x - d; xx<=x + d; xx++) if(walk(D.at(xx, yy))) return true; return false; };
  const hidesSomething = (x, y)=>{ for(let k=1;k<=6;k++) for(let dx=-2; dx<=2; dx++) if(walk(D.at(x + dx, y - k))) return true; return false; };
  const dens = (g - 0.45)*0.18;
  for(let y=0; y<D.h; y+=2) for(let x=0; x<D.w; x+=2){
    if(rnd() > dens || near(x, y, 3) || hidesSomething(x, y)) continue;
    const wx = x + rnd()*2, wz = y + rnd()*2;
    if(rnd() < 0.3){
      const h = 2.5 + rnd()*4, cr = 0.8 + h*0.2 + rnd()*0.5, c = [0x2a6a98, 0x1e7a7a, 0x3a4a9a, 0x24606a][Math.floor(rnd()*4)];
      const st = new THREE.CylinderGeometry(cr*0.1, cr*0.16, h, 8); st.translate(wx, h/2, wz); stems.push(K.paint(st, 0x6a6e70));
      const cp = K.slathe([[cr, 0], [cr*0.9, cr*0.3], [cr*0.55, cr*0.62], [0, cr*0.8]], 12, 2); cp.translate(wx, h - 0.05, wz);
      (caps[c] = caps[c] || []).push(K.paint(cp, c));
      halos.push({ x:wx, y:h + 0.1, z:wz, c, s:cr*3 });
    } else {
      // a dead tree: a leaning trunk and a few bare limbs, as cones (cheap: there are many)
      const h = 3 + rnd()*4, lean = (rnd() - 0.5)*0.3, bark = new THREE.Color(0x1e1a18).multiplyScalar(0.8 + rnd()*0.4);
      const tr = new THREE.ConeGeometry(0.28, h, 6); tr.translate(0, h/2, 0); tr.rotateZ(lean); tr.translate(wx, 0, wz); trees.push(K.paint(tr, bark));
      for(let k=0;k<4;k++){ const a = rnd()*PI*2, y = h*(0.4 + rnd()*0.45), l = 0.8 + rnd()*1.4, br = new THREE.ConeGeometry(0.08, l, 4); br.translate(0, l/2, 0); br.rotateZ(-0.9 - rnd()*0.4); br.rotateY(a); br.translate(wx - Math.sin(lean)*y, y, wz); trees.push(K.paint(br, bark)); }
    }
  }
  const grp = new THREE.Group();
  if(trees.length) grp.add(new THREE.Mesh(K.merge(trees), K.ink()));
  if(stems.length) grp.add(new THREE.Mesh(K.merge(stems), K.ink({ emissive:0x0a1420 })));
  for(const c in caps) grp.add(new THREE.Mesh(K.merge(caps[c]), K.ink({ emissive:new THREE.Color(+c).multiplyScalar(0.18) })));
  halos.forEach(h=>{ const sp = K.sprite(h.c, h.s, 0.22); sp.position.set(h.x, h.y, h.z); grp.add(sp); const pool = new THREE.Mesh(K.glowPlane, K.glowMat(h.c, 0.3)); pool.scale.set(h.s, 1, h.s); pool.position.set(h.x, 0.05, h.z); grp.add(pool); });
  W.group.add(grp);
};

/* ---- little lives ---- */
function ratMesh(){
  // lean and mangy: a long body, a pointed snout, small red eyes, a long naked tail
  const g = new THREE.Group(), P = K.part;
  P(g, K.sculpt(new THREE.SphereGeometry(0.1, 12, 8), 0.012, 30, 3), 0x2e2622, 0, 0.085, 0, 0, 0, 0, 0.85, 0.7, 1.7);
  P(g, new THREE.ConeGeometry(0.06, 0.19, 8), 0x3a302a, 0, 0.08, 0.22, PI/2 - 0.15);
  [-1, 1].forEach(s=>{ P(g, new THREE.ConeGeometry(0.025, 0.05, 4), 0x4a3a34, s*0.04, 0.14, 0.15, -0.3, 0, s*0.4); P(g, new THREE.SphereGeometry(0.011, 4, 3), 0xc81a0e, s*0.03, 0.11, 0.24); for(let k=0;k<2;k++) P(g, new THREE.CylinderGeometry(0.008, 0.006, 0.08, 4), 0x2a2220, s*0.05, 0.03, 0.1 - k*0.18, 0.4, 0, s*0.4); });
  P(g, K.tube([[0, 0.07, -0.16], [0.06, 0.03, -0.32], [-0.04, 0.02, -0.5], [0.03, 0.02, -0.62]], 0.008, 10, 4), 0x6a4a44);
  K.bake(g, { w:0.01 });
  return g;
}
function batMesh(){
  const g = new THREE.Group(), P = K.part;
  P(g, new THREE.SphereGeometry(0.09, 8, 6), 0x1a141e, 0, 0, 0, 0, 0, 0, 1, 1, 1.2);
  [-1, 1].forEach(s=>{ P(g, new THREE.ConeGeometry(0.03, 0.08, 4), 0x1a141e, s*0.04, 0.09, 0.03); P(g, new THREE.SphereGeometry(0.014, 4, 3), 0xff4a3a, s*0.03, 0.02, 0.09); });
  K.bake(g, { w:0.012 });
  const wings = [-1, 1].map(s=>{ const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.06, s*0.38, 0.02, -0.02, 0, 0, -0.08, s*0.3, -0.06, -0.12, 0, 0, -0.08, s*0.38, 0.02, -0.02], 3)); geo.computeVertexNormals(); const w = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color:0x2a1e2e, side:THREE.DoubleSide })); g.add(w); return w; });
  g.userData.wings = wings;
  return g;
}
proto.buildCritters = function(T0){
  const W = this, D = W.D;
  W.critters.forEach(c=>{
    c.g = c.kind === "rat" ? ratMesh() : batMesh();
    W.areaGroup(c.room).add(c.g);
  });
  // a cloud of small glowing things per room: fireflies, spores, motes, blood cells
  const m = T0.motes;
  if(!m.n) return;
  D.rooms.forEach(r=>{
    const n = Math.round(m.n*Math.min(2, (r.x2 - r.x1 + 1)*(r.y2 - r.y1 + 1)/150)), pos = new Float32Array(n*3), ph = new Float32Array(n);
    for(let i=0;i<n;i++){ pos[i*3] = r.x1 + W.rnd()*(r.x2 - r.x1 + 1); pos[i*3 + 1] = 0.4 + W.rnd()*1.6; pos[i*3 + 2] = r.y1 + W.rnd()*(r.y2 - r.y1 + 1); ph[i] = W.rnd()*6.28; }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
    const mat = W.fireflyMat || (W.fireflyMat = new THREE.ShaderMaterial({
      uniforms:{ uTime:{ value:0 }, uScale:{ value:300 }, uCol:{ value:new THREE.Color(m.c) }, uSp:{ value:m.sp } }, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
      vertexShader:["attribute float aPh; uniform float uTime, uScale, uSp; varying float vA;",
        "void main(){ vec3 p = position; float t = uTime*uSp + aPh;",
        "  p += vec3(sin(t*1.3)*0.8, sin(t*2.1)*0.25, cos(t*1.1)*0.8);",
        "  vA = 0.35 + 0.65*pow(0.5 + 0.5*sin(uTime*2.0 + aPh*5.0), 3.0);",
        "  vec4 mv = modelViewMatrix*vec4(p, 1.0); gl_PointSize = clamp(uScale*0.11/max(1.0, -mv.z), 1.5, 7.0); gl_Position = projectionMatrix*mv; }"].join("\n"),
      fragmentShader:"uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); if(d > 0.5) discard; gl_FragColor = vec4(uCol*vA*(1.0 - d*1.6), 1.0); }" }));
    const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = 6;
    W.areaGroup(r.id).add(p);
  });
  if(W.fireflyMat){ K.timed.push(W.fireflyMat); W.vanityMats.push(W.fireflyMat); }
};

/* ---- splats and scorch marks that stay for the floor: one mesh, a ring of quads ---- */
const SPLATS = 220;
proto.buildSplats = function(){
  const W = this;
  const g = new THREE.BufferGeometry(), pos = new Float32Array(SPLATS*4*3), uv = new Float32Array(SPLATS*4*2), col = new Float32Array(SPLATS*4*3), idx = [];
  for(let i=0;i<SPLATS;i++) idx.push(i*4, i*4 + 2, i*4 + 1, i*4 + 1, i*4 + 2, i*4 + 3);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(SPLATS*4*3).map((v, i)=> i % 3 === 1 ? 1 : 0), 3));
  g.setIndex(idx);
  const mat = decalMat(); mat.side = THREE.DoubleSide;
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 1;
  W.group.add(m);
  W.splats = { g, n:0 };
};
proto.addSplat = function(x, z, color, size, kind){
  const W = this, S0 = W.splats; if(!S0) return;
  const t = W.D.at(Math.floor(x), Math.floor(z));
  if(t !== T.FLOOR && t !== T.DOOR) return;
  const i = S0.n % SPLATS; S0.n++;
  const cell = CELL[kind || "splat"], cx = cell % 4, cy = Math.floor(cell/4), a = Math.random()*6.28, h = size/2;
  const pos = S0.g.attributes.position.array, uv = S0.g.attributes.uv.array, col = S0.g.attributes.color.array, c = new THREE.Color(color);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([u, v], k)=>{
    const lx = u*h, lz = -v*h;
    pos[(i*4 + k)*3] = x + lx*Math.cos(a) - lz*Math.sin(a); pos[(i*4 + k)*3 + 1] = 0.018 + (S0.n % 50)*0.0002; pos[(i*4 + k)*3 + 2] = z + lx*Math.sin(a) + lz*Math.cos(a);
    uv[(i*4 + k)*2] = (cx + (u + 1)/2)/4; uv[(i*4 + k)*2 + 1] = (3 - cy + (v + 1)/2)/4;
    col[(i*4 + k)*3] = c.r; col[(i*4 + k)*3 + 1] = c.g; col[(i*4 + k)*3 + 2] = c.b;
  });
  S0.g.attributes.position.needsUpdate = S0.g.attributes.uv.needsUpdate = S0.g.attributes.color.needsUpdate = true;
  S0.g.computeBoundingSphere();
};

/* ---- per frame: rats scurry, bats circle ---- */
proto.updateVanity = function(G, dt, t){
  const W = this, D = W.D, p = G.player, S = DG.Stage;
  if(W.runeMat) W.runeMat.opacity = 0.4 + 0.18*Math.sin(t*1.7);
  if(W.fireflyMat) W.fireflyMat.uniforms.uScale.value = S.renderer.domElement.height/2/Math.tan(S.camera.fov*PI/360);
  W.critters.forEach(c=>{
    const r = D.rooms[c.room];
    if(!r.seen || Math.abs((r.x1 + r.x2)/2 - p.x) > 26 || Math.abs((r.y1 + r.y2)/2 - p.y) > 20) return;
    if(c.kind === "rat"){
      // round and round the room's edge, stopping to sniff; bolts when Zippy gets close
      const w = r.x2 - r.x1, h = r.y2 - r.y1, per = 2*(w + h);
      const at = u=>{ u = ((u % per) + per) % per; if(u < w) return [r.x1 + 0.35 + u, r.y1 + 0.35]; if((u -= w) < h) return [r.x2 + 0.65, r.y1 + 0.35 + u]; if((u -= h) < w) return [r.x2 + 0.65 - u, r.y2 + 0.65]; u -= w; return [r.x1 + 0.35, r.y2 + 0.65 - u]; };
      const near = DG.dist(c.x, c.y, p.x, p.y) < 2.6;
      if(near){ c.wait = 0; const f = at(c.t + 0.6), b = at(c.t - 0.6); c.dir = DG.dist(f[0], f[1], p.x, p.y) > DG.dist(b[0], b[1], p.x, p.y) ? 1 : -1; }
      if(c.wait > 0){ c.wait -= dt; c.g.position.y = 0; c.g.rotation.z = Math.sin(t*20)*0.04; }
      else {
        c.t = (c.t + c.dir*dt*(near ? 5 : 2.2) + per*10) % per;
        if(Math.random() < dt*0.4) c.wait = 0.5 + Math.random()*2.5;
        if(Math.random() < dt*0.08) c.dir = -c.dir;
      }
      const [x, y] = at(c.t);
      const dx = x - c.x, dy = y - c.y;
      if(dx*dx + dy*dy > 1e-6) c.g.rotation.y = Math.atan2(dx, dy);
      c.x = x; c.y = y; c.g.position.set(x, 0, y);
    } else {
      const cx = (r.x1 + r.x2 + 1)/2, cy = (r.y1 + r.y2 + 1)/2;
      c.ph += dt*c.sp;
      const x = cx + Math.cos(c.ph)*c.rad*1.4, y = cy + Math.sin(c.ph*1.3)*c.rad, hh = c.h + Math.sin(c.ph*3)*0.3;
      c.g.position.set(x, hh, y);
      c.g.rotation.y = Math.atan2(-Math.sin(c.ph)*c.sp, Math.cos(c.ph*1.3)*c.sp);
      const f = Math.sin(t*22 + c.rad*5);
      c.g.userData.wings.forEach((w, i)=> w.rotation.z = (i ? -1 : 1)*f*0.7);
    }
  });
};

})();
