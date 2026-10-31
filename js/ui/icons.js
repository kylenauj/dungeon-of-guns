/* ------------------------------------------------------------------ *
 *  Icons: every powerup, active item, Gribbus trick and gun gets a
 *  medallion. An engraved bone glyph (dark outline, a little bevel) on
 *  a soot disc, ringed in the colour of its tier, the disc tinted by
 *  any element it carries. Drawn once per size with canvas paths and
 *  cached, so the HUD, the satchel and the pedestals all share them.
 *
 *    DG.Icons.canvas(key, size)  a cached canvas, size x size pixels
 *    DG.Icons.url(key, size)     the same as a data: URL, for <img>
 *    DG.Icons.spec(key)          what it draws (glyph, tier, elements)
 *
 *  Keys: an item id ("spinach" or "item:spinach"), "active:estus",
 *  "frog:tongue", "gun:pistol:fire:2" (base, element, rarity),
 *  "set:lich", "offer:heal", "offer:ward".
 *
 *  A spec is a little string: glyph[*n][~][+badge][@el,el][/deg]
 *    *n     n copies, fanned        ~   cracked through
 *    +badge a small second glyph    @   elements (or @all)
 *    /deg   turned by deg degrees
 *
 *  No THREE and no game logic: the tables load under Node, so the tests
 *  can check every item has a glyph that exists.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const Icons = DG.Icons = {};
const TAU = Math.PI*2, PI = Math.PI;

/* ================================================================== *
 *  Drawing helpers. Glyphs are drawn white into a mask, in a 100x100
 *  box (keep inside 10..90); "cuts" punch holes so the dark disc shows
 *  through as engraved lines.
 * ================================================================== */
let C = null, CUTALL = false;
const PC = {};
const p2 = d=> PC[d] || (PC[d] = new Path2D(d));
const add = ()=>{ C.globalCompositeOperation = CUTALL ? "destination-out" : "source-over"; };
const cut = ()=>{ C.globalCompositeOperation = "destination-out"; };
/* fill / cut an SVG path */
function F(d){ C.fill(p2(d)); }
function X(d){ cut(); C.fill(p2(d)); add(); }
/* stroke / cut a stroke along an SVG path */
function L(d, w){ C.lineWidth = w; C.stroke(p2(d)); }
function XL(d, w){ cut(); L(d, w); add(); }
/* circles, rings, ellipses */
function O(x, y, r){ C.beginPath(); C.arc(x, y, r, 0, TAU); C.fill(); }
function XO(x, y, r){ cut(); O(x, y, r); add(); }
function RO(x, y, r, w, a0, a1){ C.beginPath(); C.arc(x, y, r, a0 || 0, a1 === undefined ? TAU : a1); C.lineWidth = w; C.stroke(); }
function XRO(x, y, r, w, a0, a1){ cut(); RO(x, y, r, w, a0, a1); add(); }
function E(x, y, rx, ry, rot){ C.beginPath(); C.ellipse(x, y, rx, ry, rot || 0, 0, TAU); C.fill(); }
function XE(x, y, rx, ry, rot){ cut(); E(x, y, rx, ry, rot); add(); }
function RE(x, y, rx, ry, rot, w){ C.beginPath(); C.ellipse(x, y, rx, ry, rot || 0, 0, TAU); C.lineWidth = w; C.stroke(); }
function XRE(x, y, rx, ry, rot, w){ cut(); RE(x, y, rx, ry, rot, w); add(); }
/* a rounded box */
function RR(x, y, w, h, r){ C.beginPath(); r = Math.min(r || 0, w/2, h/2); C.moveTo(x + r, y); C.arcTo(x + w, y, x + w, y + h, r); C.arcTo(x + w, y + h, x, y + h, r); C.arcTo(x, y + h, x, y, r); C.arcTo(x, y, x + w, y, r); C.closePath(); C.fill(); }
function XRR(x, y, w, h, r){ cut(); RR(x, y, w, h, r); add(); }
/* a polygon from flat x,y pairs */
function PG(...p){ C.beginPath(); C.moveTo(p[0], p[1]); for(let i=2;i<p.length;i+=2) C.lineTo(p[i], p[i + 1]); C.closePath(); C.fill(); }
function XPG(...p){ cut(); PG(...p); add(); }
/* an arrowhead with its tip at x,y pointing along angle a */
function HD(x, y, a, s){ const c = Math.cos(a), sn = Math.sin(a), bx = x - c*s, by = y - sn*s; PG(x, y, bx - sn*s*0.62, by + c*s*0.62, bx + sn*s*0.62, by - c*s*0.62); }
/* an arrow from x0,y0 to x1,y1 */
function AR(x0, y0, x1, y1, w, s){ const a = Math.atan2(y1 - y0, x1 - x0); C.beginPath(); C.moveTo(x0, y0); C.lineTo(x1 - Math.cos(a)*s*0.7, y1 - Math.sin(a)*s*0.7); C.lineWidth = w; C.stroke(); HD(x1, y1, a, s); }
/* draw fn moved, turned and scaled */
function at(x, y, rot, s, fn){ C.save(); C.translate(x, y); if(rot) C.rotate(rot); if(s && s !== 1) C.scale(s, s); fn(); C.restore(); }
/* a pointed star: n points between radii r0 and r1 */
function STAR(x, y, n, r0, r1, rot, jag){
  C.beginPath();
  for(let i=0;i<n*2;i++){ const a = (rot || 0) + i/(n*2)*TAU, r = i % 2 ? r0 : r1*(jag ? 1 - jag*((i*7919) % 5)/5 : 1); C.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r); }
  C.closePath(); C.fill();
}

/* ================================================================== *
 *  The glyphs
 * ================================================================== */
const GL = Icons.GLYPHS = {
  /* ---- the dead ---- */
  skull(){
    F("M50 12 C27 12 15 29 15 47 C15 59 21 66 28 70 L28 79 C28 84 31 87 36 87 L64 87 C69 87 72 84 72 79 L72 70 C79 66 85 59 85 47 C85 29 73 12 50 12 Z");
    XE(35, 49, 10, 11, 0.15); XE(65, 49, 10, 11, -0.15);
    XPG(50, 58, 44, 69, 56, 69);
    XL("M40 76 L40 88 M50 76 L50 88 M60 76 L60 88", 3.2);
  },
  bone(){
    at(50, 50, -PI/4, 1, ()=>{ RR(-27, -7, 54, 14, 3); O(-29, -9, 10); O(-29, 9, 10); O(29, -9, 10); O(29, 9, 10); });
  },
  fang(){
    F("M26 14 C40 9 62 9 76 14 C74 44 63 70 38 91 C46 64 42 40 26 14 Z");
    XL("M30 23 C44 19 60 19 72 23", 3);
    XL("M64 30 C62 48 56 62 46 74", 2.5);
  },
  tomb(){
    XRR(10, 82, 80, 3, 0);
    F("M25 84 L25 36 C25 20 37 12 50 12 C63 12 75 20 75 36 L75 84 Z");
    XL("M50 26 L50 62 M39 37 L61 37", 5.5);
    RR(12, 84, 76, 6, 2);
  },
  ghost(){
    F("M23 87 L23 44 C23 24 35 11 50 11 C65 11 77 24 77 44 L77 87 L68 78 L59 87 L50 78 L41 87 L32 78 Z");
    XE(40, 42, 5.5, 8.5); XE(60, 42, 5.5, 8.5); XE(50, 63, 5, 7.5);
  },
  wisp(){
    F("M50 8 C57 24 73 33 73 54 C73 71 63 82 50 82 C37 82 27 71 27 54 C27 40 36 33 41 24 C43 33 46 36 49 37 C46 26 46 17 50 8 Z");
    XE(42, 57, 4, 6.5); XE(58, 57, 4, 6.5);
    O(31, 88, 3.5); O(66, 90, 2.6); O(78, 80, 2);
  },
  hood(){
    F("M50 9 C33 9 25 23 25 40 C25 52 21 64 14 89 L86 89 C79 64 75 52 75 40 C75 23 67 9 50 9 Z");
    X("M50 23 C40 23 35 33 35 43 C35 53 41 60 50 60 C59 60 65 53 65 43 C65 33 60 23 50 23 Z");
    O(43, 44, 3.4); O(57, 44, 3.4);
    XL("M38 72 L34 89 M62 72 L66 89", 2.5);
  },
  mask(){
    F("M18 18 C35 12 65 12 82 18 C84 50 73 78 50 89 C27 78 16 50 18 18 Z");
    XPG(26, 38, 45, 45, 43, 52, 28, 47); XPG(74, 38, 55, 45, 57, 52, 72, 47);
    XL("M37 72 Q50 63 63 72", 4);
    XL("M50 22 L50 34", 3);
  },
  beak(){
    RR(12, 18, 76, 7, 3); RR(30, 6, 40, 14, 3);
    F("M24 30 C24 26 30 24 50 24 C70 24 76 26 76 30 C78 46 72 56 62 58 L50 93 L38 58 C28 56 22 46 24 30 Z");
    XO(37, 40, 10); XO(63, 40, 10); O(37, 40, 6); O(63, 40, 6);
    XL("M50 54 L50 86", 2.5); XL("M42 64 L46 76 M58 64 L54 76", 2);
  },
  doll(){
    O(50, 25, 14);
    PG(37, 40, 63, 40, 66, 72, 57, 72, 56, 89, 44, 89, 43, 72, 34, 72);
    RR(17, 43, 66, 11, 5);
    XL("M42 20 L47 25 M47 20 L42 25 M53 20 L58 25 M58 20 L53 25", 2.3);
    XL("M50 44 L50 70 M45 50 L55 50 M45 58 L55 58 M45 66 L55 66", 2);
    XL("M60 13 L78 4", 7); L("M62 12 L80 3", 2.6); O(81, 3, 3.5);
  },
  /* ---- vessels ---- */
  flask(){
    RR(37, 9, 26, 7, 2); RR(42, 15, 16, 22, 1);
    O(50, 62, 27);
    XL("M27 57 Q38 50 50 57 T73 57", 3.2);
    XL("M38 20 L62 20", 2);
    XRO(50, 62, 18, 3, PI*0.95, PI*1.25);
  },
  vial(){
    RR(37, 9, 26, 12, 3);
    RR(40, 21, 20, 68, 10);
    XL("M40 47 L60 47", 3);
    XL("M46 54 L46 78", 2.5);
    XL("M37 21 L63 21", 2.5);
  },
  jar(){
    RR(43, 8, 14, 8, 2); RR(26, 16, 48, 12, 3);
    F("M29 30 L71 30 L76 40 L76 80 C76 86 72 89 66 89 L34 89 C28 89 24 86 24 80 L24 40 Z");
    XL("M24 29 L76 29", 3);
    XRR(34, 47, 32, 24, 3); RR(38, 51, 24, 16, 2);
  },
  chalice(){
    F("M22 14 L78 14 C78 40 67 53 50 55 C33 53 22 40 22 14 Z");
    RR(46, 54, 8, 22, 1); E(50, 64, 8, 4);
    F("M28 88 C30 79 41 75 50 75 C59 75 70 79 72 88 Z");
    XL("M22 23 L78 23", 3);
    XL("M33 32 C35 41 41 46 47 47", 2.5);
  },
  cup(){
    RR(22, 34, 44, 52, 6);
    RO(70, 58, 12, 6.5, -PI/2, PI/2);
    XL("M22 44 L66 44", 3);
    L("M34 26 Q28 18 34 10 M46 26 Q40 18 46 10 M58 26 Q52 18 58 10", 4);
  },
  teapot(){
    E(46, 60, 28, 22);
    F("M28 44 C30 34 38 30 46 30 C54 30 62 34 64 44 Z"); O(46, 26, 5);
    F("M68 58 L86 34 L91 38 L76 70 Z");
    RO(18, 58, 11, 6, PI*0.5, PI*1.5);
    XL("M20 46 L72 46", 3);
    XL("M28 66 Q46 74 64 66", 2.5);
  },
  bowl(){
    F("M10 48 L90 48 C88 71 71 85 50 85 C29 85 12 71 10 48 Z");
    RR(37, 84, 26, 5, 2);
    XL("M12 56 L88 56", 3);
    L("M34 38 Q28 28 34 18 M50 38 Q44 28 50 16 M66 38 Q60 28 66 18", 4);
  },
  keg(){
    F("M26 24 C22 40 22 72 26 88 L74 88 C78 72 78 40 74 24 Z");
    XL("M24 34 Q50 39 76 34 M23 78 Q50 83 77 78", 4);
    XL("M40 50 L60 70 M60 50 L40 70", 4.5);
    L("M58 24 C60 14 70 10 78 12", 3.5);
    STAR(82, 11, 5, 3, 9, 0.3);
  },
  pouch(){
    F("M30 36 C17 47 15 67 21 79 C26 87 36 90 50 90 C64 90 74 87 79 79 C85 67 83 47 70 36 Z");
    F("M33 36 L67 36 L61 27 L72 13 L57 20 L50 10 L43 20 L28 13 L39 27 Z");
    XL("M30 37 L70 37", 3.5);
    XRO(50, 63, 10, 3); XL("M50 57 L50 69", 3);
  },
  /* ---- the body ---- */
  heart(){
    F("M50 87 C30 71 11 57 11 36 C11 22 21 13 33 13 C41 13 47 18 50 25 C53 18 59 13 67 13 C79 13 89 22 89 36 C89 57 70 71 50 87 Z");
    XL("M24 34 C24 27 28 23 33 23", 3.2);
  },
  eye(){
    F("M8 50 Q50 12 92 50 Q50 88 8 50 Z");
    XO(50, 50, 18); O(50, 50, 13.5); XE(50, 50, 4, 11);
  },
  hand(){
    RR(28, 46, 44, 40, 10);
    RR(28, 20, 9, 34, 4.5); RR(39, 13, 9, 38, 4.5); RR(50, 15, 9, 36, 4.5); RR(61, 22, 9, 32, 4.5);
    at(24, 58, -0.7, 1, ()=> RR(-5, -16, 10, 26, 5));
    XL("M37 36 L37 50 M48 34 L48 50 M59 34 L59 50", 2);
    XL("M40 70 Q50 64 62 70", 2.5);
  },
  claw(){
    RO(50, 11, 5.5, 3.5);
    RR(38, 16, 24, 12, 3);
    XL("M38 22 L62 22", 2);
    F("M40 28 L60 28 C66 40 68 56 64 70 C62 78 58 84 50 86 C42 84 38 78 36 70 C32 56 34 40 40 28 Z");
    XL("M44 36 L42 48 M50 34 L50 50 M56 36 L58 48 M42 56 L40 66 M58 56 L60 66", 2);
    PG(38, 76, 30, 90, 42, 82); PG(50, 84, 50, 96, 55, 84); PG(62, 76, 70, 90, 58, 82);
  },
  wings(){
    const w = ()=>{ F("M47 42 C35 23 20 17 6 21 C14 29 16 35 12 43 C20 45 24 50 22 58 C31 57 40 55 47 52 Z"); XL("M43 44 C32 32 22 28 12 28 M43 48 C34 44 26 42 18 44", 2.5); };
    w(); at(100, 0, 0, 1, ()=>{ C.scale(-1, 1); w(); });
    E(50, 48, 5, 12);
  },
  feather(){
    F("M82 9 C57 11 32 33 28 70 C45 66 72 49 82 9 Z");
    XL("M80 13 L31 68", 2.6);
    XL("M60 24 L66 30 M48 36 L57 42 M40 48 L46 54", 2.5);
    L("M31 68 L17 87", 4.5);
  },
  /* ---- arms ---- */
  dagger(){
    F("M50 8 L58 22 L58 62 L42 62 L42 22 Z");
    RR(28, 61, 44, 8, 3); RR(45, 69, 10, 15, 2); O(50, 88, 5.5);
    XL("M50 20 L50 56", 2.6);
  },
  knife(){
    at(50, 50, 0.45, 1, ()=>{
      F("M-8 10 C-10 -10 -2 -26 12 -42 C14 -24 12 -6 8 10 Z");
      RR(-16, 10, 32, 7, 3); RR(-5, 17, 10, 20, 2); O(0, 40, 5);
      XL("M3 4 C4 -10 6 -22 10 -32", 2.4);
    });
  },
  axe(){
    L("M30 89 L62 15", 7.5);
    F("M54 20 C66 11 82 14 89 26 C93 38 90 52 80 62 C78 52 72 44 60 40 Z");
    F("M52 24 C44 20 36 22 32 28 C38 32 44 36 48 40 Z");
    XL("M86 34 C86 44 82 52 78 56", 2.5);
  },
  club(){
    at(50, 50, 0.7, 1, ()=>{
      RR(-5, 6, 10, 38, 4);
      F("M-6 8 L-11 -30 C-11 -42 11 -42 11 -30 L6 8 Z");
      [[-11, -28], [11, -28], [-10, -14], [10, -14], [-9, 0], [9, 0], [0, -42]].forEach(([x, y])=> HD(x + Math.sign(x)*7, y - (x ? 0 : 6), x ? (x > 0 ? 0 : PI) : -PI/2, 7));
      XL("M-6 30 L6 26 M-6 38 L6 34", 2.2);
    });
  },
  spear(){
    L("M14 86 L64 36", 5.5);
    PG(90, 10, 68, 22, 58, 42, 78, 32);
    XL("M86 14 L66 34", 2.2);
    XL("M60 34 L70 44", 3);
    L("M26 74 L18 82", 9);
  },
  bow(){
    L("M33 10 C72 24 72 76 33 90", 7);
    L("M33 10 L33 90", 2);
    AR(14, 50, 90, 50, 3.4, 13);
    PG(14, 50, 8, 43, 20, 47, 20, 53, 8, 57);
  },
  shield(){
    F("M18 14 L82 14 L82 43 C82 66 67 80 50 89 C33 80 18 66 18 43 Z");
    XL("M27 22 L73 22 L73 43 C73 61 62 72 50 79 C38 72 27 61 27 43 Z", 3);
    O(50, 46, 9); XO(50, 46, 3.5);
  },
  gun(){
    RR(30, 27, 60, 12, 2); RR(80, 24, 6, 5, 1);
    F("M14 30 L36 30 L42 41 L36 46 L32 86 L14 86 L10 82 L18 50 L12 40 Z");
    L("M38 46 C38 56 52 58 54 41", 3.5);
    XL("M18 60 L30 60 M18 70 L28 70", 2.4);
    XL("M30 33 L88 33", 2);
  },
  smg(){
    RR(16, 30, 70, 14, 2); RR(84, 34, 8, 5, 1);
    F("M24 44 L40 44 L36 78 L22 78 Z"); F("M52 44 L62 44 L60 72 L50 72 Z");
    RR(6, 34, 12, 8, 2);
    XL("M22 37 L84 37", 2.2);
  },
  shotgun(){
    F("M10 46 L62 40 L88 30 L92 46 L66 50 L14 58 Z");
    F("M14 50 L30 50 L22 80 L8 80 Z");
    XL("M30 48 L86 38", 2.2);
  },
  rifle(){
    RR(30, 38, 62, 7, 2);
    F("M6 46 L52 42 L50 52 L22 54 L10 64 L4 60 Z");
    RR(40, 28, 26, 8, 3); RR(46, 36, 4, 4, 0);
    XL("M12 52 L46 49", 2);
  },
  launcher(){
    RR(8, 32, 70, 20, 9);
    PG(76, 30, 92, 22, 92, 62, 76, 54);
    F("M32 52 L44 52 L40 82 L28 82 Z"); RR(56, 52, 9, 16, 2);
    RR(40, 22, 16, 10, 2);
    XL("M20 42 L72 42", 2.5); XL("M24 32 L24 52 M66 32 L66 52", 2.2);
  },
  cannon(){
    at(46, 46, -0.42, 1, ()=>{ F("M-36 -12 L30 -15 L30 15 L-36 12 Z"); RR(28, -19, 9, 38, 3); O(-38, 0, 10); O(-50, 0, 5); XL("M-12 -13 L-12 13", 2.2); });
    O(42, 72, 16); XO(42, 72, 7); O(42, 72, 3);
    XL("M42 57 L42 66 M42 78 L42 87 M27 72 L36 72 M48 72 L57 72", 2.2);
  },
  bullet(){
    at(50, 50, 0.6, 1, ()=>{
      RR(-12, -8, 24, 44, 2); RR(-15, 34, 30, 6, 1.5);
      F("M-12 -8 L-12 -16 C-12 -30 -6 -38 0 -40 C6 -38 12 -30 12 -16 L12 -8 Z");
      XL("M-14 -8 L14 -8", 3); XL("M-12 28 L12 28", 2);
    });
  },
  slug(){
    at(50, 50, 0.6, 1, ()=>{
      F("M-22 0 C-22 -24 -12 -38 0 -38 C12 -38 22 -24 22 0 L22 34 L-22 34 Z");
      RR(-25, 33, 50, 7, 2);
      XL("M-24 2 L24 2", 3.2); XL("M-22 24 L22 24", 2.2);
    });
  },
  pellets(){ [[50, 26], [28, 44], [72, 44], [38, 70], [62, 70]].forEach(([x, y])=> O(x, y, 9.5)); O(50, 50, 6); },
  wand(){
    L("M18 86 L66 36", 7.5);
    XL("M24 72 L32 80 M30 66 L38 74", 2.2);
    STAR(74, 26, 4, 5, 18, 0.2);
    O(84, 44, 2.6); O(58, 16, 2.2);
  },
  syringe(){
    at(50, 50, -PI/4, 1, ()=>{
      RR(-22, -10, 44, 20, 3); RR(-26, -16, 5, 32, 2); RR(-40, -3, 15, 6, 1); RR(-44, -11, 5, 22, 2);
      L("M22 0 L43 0", 3); PG(22, -6, 30, -3, 30, 3, 22, 6);
      XL("M-12 -10 L-12 -2 M-4 -10 L-4 -2 M4 -10 L4 -2 M12 -10 L12 -2", 2.2);
    });
  },
  weight(){
    F("M18 88 L28 42 L72 42 L82 88 Z");
    L("M37 43 C37 22 63 22 63 43", 8);
    XL("M27 52 L73 52 M22 78 L78 78", 3);
    XO(50, 65, 5);
  },
  /* ---- the shape of a shot ---- */
  bounce(){
    RR(80, 10, 8, 80, 1);
    XL("M80 24 L88 18 M80 40 L88 34 M80 56 L88 50 M80 72 L88 66", 2);
    C.beginPath(); C.moveTo(14, 82); C.lineTo(72, 48); C.lineTo(30, 20); C.lineWidth = 6.5; C.stroke();
    HD(22, 15, Math.atan2(-5, -8), 15);
  },
  pierce(){
    AR(12, 88, 88, 12, 5.5, 18);
    PG(12, 88, 10, 76, 18, 80, 24, 82, 20, 90);
    cut(); RE(50, 50, 13, 25, PI/4, 13); add();
    RE(50, 50, 13, 25, PI/4, 6);
  },
  drill(){
    RR(30, 9, 40, 12, 2);
    F("M30 22 L70 22 L50 92 Z");
    XL("M34 34 L66 28 M38 48 L62 42 M42 62 L58 56 M46 76 L54 72", 3);
  },
  curve(){
    C.beginPath(); C.moveTo(14, 86); C.bezierCurveTo(18, 40, 46, 20, 74, 26); C.lineWidth = 7; C.stroke();
    HD(88, 30, 0.25, 17);
    RO(80, 72, 9, 3); O(80, 72, 3);
  },
  split(){
    L("M50 90 L50 54", 7.5);
    L("M50 56 L30 30 M50 56 L70 30", 7);
    HD(22, 18, Math.atan2(-12, -8), 17); HD(78, 18, Math.atan2(-12, 8), 17);
  },
  fan(){
    AR(50, 88, 50, 12, 6, 16); AR(50, 88, 18, 24, 6, 16); AR(50, 88, 82, 24, 6, 16);
    O(50, 86, 7);
  },
  arrows2(){ AR(50, 50, 50, 10, 7, 18); AR(50, 50, 50, 90, 7, 18); XO(50, 50, 13); O(50, 50, 8.5); },
  arrows3(){ AR(50, 56, 50, 10, 7, 17); AR(50, 56, 10, 56, 7, 17); AR(50, 56, 90, 56, 7, 17); XO(50, 56, 13); E(50, 56, 10, 7); XO(50, 56, 3.5); },
  arrows4(){ [0, 1, 2, 3].forEach(i=>{ const a = PI/4 + i*PI/2; AR(50 + Math.cos(a)*10, 50 + Math.sin(a)*10, 50 + Math.cos(a)*42, 50 + Math.sin(a)*42, 6, 16); }); PG(50, 38, 62, 50, 50, 62, 38, 50); XPG(50, 45, 55, 50, 50, 55, 45, 50); },
  arrowsin(){ [0, 1, 2, 3].forEach(i=>{ const a = PI/4 + i*PI/2; AR(50 + Math.cos(a)*44, 50 + Math.sin(a)*44, 50 + Math.cos(a)*18, 50 + Math.sin(a)*18, 6, 15); }); O(50, 50, 7); },
  chaos(){ for(let i=0;i<8;i++){ const a = i/8*TAU; AR(50 + Math.cos(a)*12, 50 + Math.sin(a)*12, 50 + Math.cos(a)*42, 50 + Math.sin(a)*42, 4.5, 12); } O(50, 50, 9); },
  worm(){
    L("M14 62 C24 36 36 36 44 56 S62 78 70 54 S82 34 86 38", 10);
    O(86, 38, 7); XO(87, 36, 2);
  },
  orbit(){
    O(50, 50, 13);
    RO(50, 50, 33, 3.5);
    XO(73, 27, 14); O(73, 27, 9);
    XRO(50, 50, 33, 6, PI*0.6, PI*0.75);
  },
  boomerang(){
    C.beginPath(); C.moveTo(18, 80); C.lineTo(44, 26); C.lineTo(86, 40); C.lineWidth = 14; C.stroke();
    XL("M21 74 L44 30 L80 41", 2.5);
  },
  snowball(){ O(20, 74, 7); O(40, 62, 12); O(67, 42, 21); XRO(67, 42, 13, 2.5, PI*1.1, PI*1.5); },
  rocket(){
    F("M50 7 C63 18 66 33 66 52 L66 70 L34 70 L34 52 C34 33 37 18 50 7 Z");
    PG(34, 50, 19, 74, 34, 70); PG(66, 50, 81, 74, 66, 70);
    PG(41, 74, 59, 74, 50, 93);
    XO(50, 36, 6.5); XL("M34 60 L66 60", 2.5);
  },
  spiral(){
    C.beginPath();
    for(let t=0;t<=1;t+=0.01){ const a = t*TAU*2.4, r = 3 + t*36; C.lineTo(50 + Math.cos(a)*r, 50 + Math.sin(a)*r); }
    C.lineWidth = 6.5; C.stroke();
  },
  waves(){ O(20, 50, 8); [16, 30, 44].forEach((r, i)=> RO(20, 50, r + 8, 6.5 - i*0.6, -0.95, 0.95)); },
  /* ---- the elements ---- */
  flame(){
    F("M50 7 C57 24 77 34 77 58 C77 76 65 89 50 89 C35 89 23 76 23 58 C23 46 31 37 36 29 C38 40 42 44 46 46 C44 32 46 18 50 7 Z");
    XL("M50 52 C55 62 63 66 63 75 C63 83 57 88 50 88 C43 88 37 83 37 75 C37 66 46 61 50 52 Z", 3.2);
  },
  snowflake(){
    for(let i=0;i<6;i++) at(50, 50, i*PI/3, 1, ()=>{ L("M0 0 L0 -40", 6); L("M0 -22 L-11 -33 M0 -22 L11 -33", 4.5); L("M0 -9 L-8 -16 M0 -9 L8 -16", 3.5); });
    XO(50, 50, 5);
  },
  droplet(){
    F("M50 9 C60 30 79 46 79 62 C79 78 66 89 50 89 C34 89 21 78 21 62 C21 46 40 30 50 9 Z");
    XL("M33 62 C33 72 39 78 47 80", 4);
  },
  bolt(){ F("M60 6 L22 54 L45 54 L36 94 L80 39 L55 39 L68 6 Z"); },
  sigil(){
    RO(50, 52, 35, 4);
    L("M50 22 L76 67 L24 67 Z", 4);
    O(50, 52, 6);
    [[-PI/2, 0], [PI/6, 0], [PI*5/6, 0]].forEach(([a])=>{ XO(50 + Math.cos(a)*35, 52 + Math.sin(a)*35, 6); O(50 + Math.cos(a)*35, 52 + Math.sin(a)*35, 3.5); });
  },
  prism(){
    F("M50 18 L82 76 L18 76 Z");
    XL("M50 32 L70 69 L30 69 Z", 3);
    L("M4 58 L33 50", 3.5);
    L("M64 47 L94 34 M68 53 L95 50 M72 59 L94 66", 3.2);
  },
  gem(){
    F("M30 26 L70 26 L88 44 L50 90 L12 44 Z");
    XL("M12 44 L88 44 M30 26 L40 44 L50 90 L60 44 L70 26 M40 44 L50 26 L60 44", 2.5);
  },
  orb(){
    O(50, 46, 31);
    XRO(50, 46, 22, 3.5, PI*1.05, PI*1.45);
    F("M30 88 L70 88 L63 78 L37 78 Z");
    XL("M30 77 L70 77", 3);
  },
  icicle(){
    RR(10, 10, 80, 12, 3);
    PG(15, 22, 29, 22, 22, 62); PG(34, 22, 52, 22, 43, 90); PG(57, 22, 69, 22, 63, 68); PG(73, 22, 86, 22, 79, 50);
    XL("M10 22 L90 22", 2.5);
  },
  cloud(){
    O(32, 40, 15); O(53, 31, 20); O(72, 43, 14); RR(17, 38, 69, 18, 9);
    cut(); C.lineWidth = 7; C.stroke(p2("M54 54 L40 74 L50 74 L43 92 L64 68 L54 68 L60 54 Z")); add();
    F("M54 54 L40 74 L50 74 L43 92 L64 68 L54 68 L60 54 Z");
  },
  sun(){
    O(50, 50, 19);
    for(let i=0;i<12;i++){ const a = i/12*TAU, l = i % 2 ? 36 : 42, s = 0.14; PG(50 + Math.cos(a)*l, 50 + Math.sin(a)*l, 50 + Math.cos(a - s)*25, 50 + Math.sin(a - s)*25, 50 + Math.cos(a + s)*25, 50 + Math.sin(a + s)*25); }
    XO(50, 50, 13); O(50, 50, 9);
  },
  moon(){
    O(50, 50, 36); XO(64, 41, 30);
    O(70, 70, 3); O(80, 50, 2.5);
  },
  star(){ F("M50 6 L58 42 L94 50 L58 58 L50 94 L42 58 L6 50 L42 42 Z"); },
  burst(){ STAR(50, 50, 11, 20, 44, 0.1, 0.35); XO(50, 50, 10); O(50, 50, 5); },
  nova(){ O(50, 50, 10); RO(50, 50, 24, 4.5); for(let i=0;i<8;i++){ const a = i/8*TAU + PI/8; C.beginPath(); C.moveTo(50 + Math.cos(a)*32, 50 + Math.sin(a)*32); C.lineTo(50 + Math.cos(a)*44, 50 + Math.sin(a)*44); C.lineWidth = 5.5; C.stroke(); } },
  shards(){ PG(14, 32, 40, 20, 30, 48); PG(56, 10, 84, 22, 62, 36); PG(36, 62, 70, 56, 50, 90); XL("M22 33 L34 27 M64 18 L74 24 M44 66 L62 63", 2); },
  blackhole(){
    cut(); RE(50, 50, 42, 13, -0.4, 13); add();
    O(50, 50, 21); XO(50, 50, 15);
    cut(); RE(50, 50, 42, 13, -0.4, 10); add();
    C.beginPath(); C.ellipse(50, 50, 42, 13, -0.4, PI*0.02, PI*0.98); C.lineWidth = 5; C.stroke();
    C.beginPath(); C.ellipse(50, 50, 42, 13, -0.4, PI*1.12, PI*1.88); C.lineWidth = 3; C.stroke();
  },
  darksign(){
    STAR(50, 50, 13, 30, 46, 0.2, 0.55);
    XO(50, 50, 21);
    XRO(50, 50, 27, 2.2);
  },
  discoball(){
    L("M50 4 L50 18", 3);
    O(50, 52, 34);
    XRE(50, 52, 13, 34, 0, 2.6); XRE(50, 52, 26, 34, 0, 2.6); XL("M50 18 L50 86", 2.6);
    XL("M18 40 Q50 46 82 40 M16 52 L84 52 M18 64 Q50 58 82 64", 2.6);
  },
  /* ---- the luck of it ---- */
  coin(){ O(50, 50, 35); XRO(50, 50, 28, 3); XL("M50 34 L50 66 M38 46 L62 46", 6); },
  clover(){
    const hrt = "M0 0 C-4 -6 -18 -10 -20 -22 C-21 -30 -14 -36 -8 -34 C-4 -33 -1 -30 0 -27 C1 -30 4 -33 8 -34 C14 -36 21 -30 20 -22 C18 -10 4 -6 0 0 Z";
    [0, 1, 2, 3].forEach(i=> at(48, 46, i*PI/2, 1.15, ()=> F(hrt)));
    L("M50 50 C58 64 62 76 72 90", 5);
    XO(48, 46, 3);
  },
  die(){
    at(50, 50, 0.18, 1, ()=>{ RR(-32, -32, 64, 64, 10); [[-16, -16], [16, -16], [0, 0], [-16, 16], [16, 16]].forEach(([x, y])=> XO(x, y, 6.2)); });
  },
  crown(){
    F("M15 78 L15 36 L32 54 L50 24 L68 54 L85 36 L85 78 Z");
    O(15, 31, 5.5); O(50, 18, 6); O(85, 31, 5.5);
    XL("M15 66 L85 66", 3.2);
    XPG(50, 44, 56, 52, 50, 60, 44, 52);
  },
  ring(){
    RO(50, 60, 25, 11);
    XPG(50, 8, 66, 26, 50, 44, 34, 26);
    PG(50, 12, 62, 26, 50, 40, 38, 26);
    XL("M38 26 L62 26 M50 12 L50 40", 2);
  },
  key(){
    O(30, 30, 19); XO(30, 30, 9);
    L("M42 42 L84 84", 8.5);
    L("M70 70 L60 80 M80 80 L72 88 M76 76 L68 84", 7);
  },
  bell(){
    RO(50, 12, 5, 3.5);
    F("M50 15 C43 15 41 19 41 23 C30 27 28 40 28 52 C28 64 24 70 17 76 L83 76 C76 70 72 64 72 52 C72 40 70 27 59 23 C59 19 57 15 50 15 Z");
    XL("M24 67 L76 67", 3);
    O(50, 84, 6.5);
  },
  hourglass(){
    RR(20, 9, 60, 9, 2); RR(20, 82, 60, 9, 2);
    RR(22, 17, 5, 66, 1); RR(73, 17, 5, 66, 1);
    F("M31 18 L69 18 C69 35 56 44 54 50 C56 56 69 65 69 82 L31 82 C31 65 44 56 46 50 C44 44 31 35 31 18 Z");
    X("M36 22 L64 22 C64 34 53 43 50 49 C47 43 36 34 36 22 Z");
    X("M50 51 C53 57 64 66 64 78 L36 78 C36 66 47 57 50 51 Z");
    F("M37 78 C41 69 46 65 50 63 C54 65 59 69 63 78 Z");
    F("M41 33 L59 33 C57 38 53 42 50 45 C47 42 43 38 41 33 Z");
  },
  clock(){
    RO(50, 15, 6, 4); RR(46, 20, 8, 6, 1);
    O(50, 57, 32); XO(50, 57, 26);
    for(let i=0;i<12;i++){ const a = i/12*TAU; O(50 + Math.cos(a)*21, 57 + Math.sin(a)*21, i % 3 ? 1.6 : 2.8); }
    L("M50 57 L50 39 M50 57 L63 63", 4.5);
    O(50, 57, 4);
  },
  cog(){
    for(let i=0;i<8;i++) at(50, 50, i*PI/4, 1, ()=> RR(-7, -42, 14, 16, 2));
    O(50, 50, 29); XO(50, 50, 11);
    for(let i=0;i<4;i++){ const a = i*PI/2 + PI/4; XO(50 + Math.cos(a)*20, 50 + Math.sin(a)*20, 4); }
  },
  cycle(){
    const arc = (a0, a1)=>{ RO(50, 50, 30, 7, a0, a1); const t = a1 + 0.3; HD(50 + Math.cos(t)*30, 50 + Math.sin(t)*30, t + PI/2, 18); };
    arc(-PI*0.12, PI*0.66); arc(PI*0.88, PI*1.66);
  },
  uturn(){
    C.beginPath(); C.moveTo(28, 90); C.lineTo(28, 42); C.bezierCurveTo(28, 14, 72, 14, 72, 42); C.lineTo(72, 64); C.lineWidth = 9; C.stroke();
    HD(72, 88, PI/2, 22);
  },
  infinity(){ L("M50 50 C40 34 16 30 16 50 C16 70 40 66 50 50 C60 34 84 30 84 50 C84 70 60 66 50 50 Z", 8.5); },
  ouroboros(){
    RO(50, 54, 29, 10, -PI*0.3, PI*1.42);
    E(70, 25, 15, 11, -0.55);
    XO(73, 21, 2.8);
    XL("M58 30 L80 32", 2.6);
    for(let i=0;i<10;i++){ const a = -PI*0.15 + i*0.52; XO(50 + Math.cos(a)*29, 54 + Math.sin(a)*29, 2); }
  },
  /* ---- things that crawl, fly and grow ---- */
  fly(){
    E(50, 60, 11, 20); O(50, 36, 10);
    cut(); RE(32, 38, 18, 9, -0.6, 4); RE(68, 38, 18, 9, 0.6, 4); add();
    E(32, 38, 17, 8, -0.6); E(68, 38, 17, 8, 0.6);
    XL("M22 32 L42 44 M78 32 L58 44", 2);
    XO(45, 34, 3.2); XO(55, 34, 3.2);
    XL("M40 58 L60 58 M40 66 L60 66 M42 74 L58 74", 2.2);
    L("M40 54 L24 62 M40 64 L26 76 M60 54 L76 62 M60 64 L74 76", 2.5);
  },
  hive(){
    F("M17 84 C17 40 30 14 50 14 C70 14 83 40 83 84 Z");
    XL("M24 34 Q50 40 76 34 M19 50 Q50 57 81 50 M17 66 Q50 74 83 66", 3);
    X("M42 84 L42 76 C42 70 58 70 58 76 L58 84 Z");
    RR(12, 82, 76, 7, 2);
  },
  tadpole(){
    E(34, 40, 18, 15, -0.3);
    F("M44 48 C56 54 54 68 66 76 C74 81 84 82 90 78 C84 88 70 90 60 84 C48 76 46 64 36 54 Z");
    XO(28, 35, 4); O(29, 34, 1.6);
  },
  frog(){
    E(22, 78, 13, 7); E(78, 78, 13, 7);
    E(50, 64, 30, 21); E(50, 42, 25, 16);
    O(33, 30, 10); O(67, 30, 10);
    XO(33, 30, 4.8); XO(67, 30, 4.8);
    XL("M34 48 Q50 56 66 48", 2.8);
    XL("M30 76 L40 70 M70 76 L60 70", 2.4);
  },
  snail(){
    F("M12 80 C12 70 22 66 32 66 L84 66 C90 66 92 74 86 82 L18 84 C14 84 12 82 12 80 Z");
    L("M22 68 L14 48 M28 66 L26 46", 3.2); O(14, 46, 3.5); O(26, 44, 3.5);
    O(58, 44, 27);
    C.beginPath(); for(let t=0;t<=1;t+=0.02){ const a = t*TAU*1.8 + PI, r = 3 + t*20; C.lineTo(58 + Math.cos(a)*r, 44 + Math.sin(a)*r); } cut(); C.lineWidth = 3.2; C.stroke(); add();
    XL("M30 66 L86 66", 2.5);
  },
  leaf(){
    F("M16 84 C16 40 46 16 86 14 C84 54 60 82 16 84 Z");
    XL("M16 84 L70 30", 3.2);
    XL("M38 62 L38 44 M50 50 L50 34 M38 62 L56 62 M50 50 L66 50", 2.5);
  },
  sprout(){
    L("M50 90 C50 72 46 60 50 46 C54 34 64 26 76 28", 5);
    F("M48 64 C36 66 24 58 18 44 C32 42 44 48 48 64 Z");
    F("M52 52 C58 40 72 36 86 40 C80 54 66 58 52 52 Z");
    O(76, 28, 4);
    XL("M46 62 L28 48 M54 50 L78 42", 2);
  },
  flower(){
    for(let i=0;i<5;i++){ const a = i/5*TAU - PI/2; E(50 + Math.cos(a)*22, 44 + Math.sin(a)*22, 15, 9, a); }
    XO(50, 44, 13); O(50, 44, 9.5);
    L("M50 66 L50 92", 4.5);
  },
  mushroom(){
    F("M12 56 C12 30 30 14 50 14 C70 14 88 30 88 56 Z");
    F("M39 56 L61 56 L64 88 L36 88 Z");
    XL("M12 56 L88 56", 3.5);
    XO(31, 38, 5.5); XO(53, 27, 5); XO(70, 42, 6);
  },
  bird(){
    F("M8 50 C20 44 34 40 48 42 L60 34 C66 26 78 26 84 32 L94 38 L84 42 C82 52 76 60 64 64 L54 82 L50 68 C38 70 22 64 8 50 Z");
    XO(74, 34, 3);
    XL("M30 48 Q44 46 56 52 M36 56 Q48 56 58 60", 2.5);
  },
  tongue(){
    L("M12 74 C26 30 70 18 82 44 C90 62 70 76 60 62", 10);
    O(60, 62, 9);
    XL("M16 70 C28 36 66 26 78 44", 2);
  },
  lily(){
    O(50, 52, 37);
    XPG(50, 52, 68, 14, 82, 26);
    XL("M50 52 L18 52 M50 52 L28 80 M50 52 L60 88 M50 52 L86 62 M50 52 L28 24", 2.4);
    XO(50, 52, 3);
  },
  thorn(){
    L("M12 82 C26 50 46 66 58 44 C66 30 76 22 90 18", 6);
    [[24, 64, -2.3], [38, 60, 1.2], [50, 54, -1.7], [62, 38, 0.6], [74, 26, -1.9], [84, 20, 0.9]].forEach(([x, y, a])=> HD(x + Math.cos(a)*14, y + Math.sin(a)*14, a, 13));
  },
  chain(){
    RE(30, 30, 16, 10, PI/4, 6.5);
    cut(); RE(50, 50, 16, 10, -PI/4, 13); add(); RE(50, 50, 16, 10, -PI/4, 6.5);
    cut(); RE(70, 70, 16, 10, PI/4, 13); add(); RE(70, 70, 16, 10, PI/4, 6.5);
  },
  tangle(){ L("M14 50 C20 18 42 80 50 50 S80 18 86 46 S62 90 48 72 S20 40 40 30 S80 34 70 62", 5.5); },
  /* ---- tools of the trade ---- */
  tome(){
    RR(22, 14, 54, 70, 4);
    RR(24, 80, 52, 8, 2);
    XL("M24 80 L76 80", 2.5);
    XL("M30 14 L30 84", 2.5);
    XRO(53, 46, 12, 3); XO(53, 46, 3.5);
    RR(74, 40, 10, 14, 2);
  },
  scroll(){
    RR(26, 22, 48, 56, 1);
    RR(18, 14, 64, 12, 6); RR(18, 74, 64, 12, 6);
    XL("M18 26 L82 26 M18 74 L82 74", 2.5);
    XL("M34 38 L66 38 M34 48 L60 48 M34 58 L66 58", 3);
  },
  candle(){
    F("M50 9 C56 19 60 26 56 32 C54 35 46 35 44 32 C40 26 44 19 50 9 Z");
    RR(37, 40, 26, 44, 2);
    F("M37 40 L63 40 L63 54 C60 54 59 50 58 46 C57 52 54 54 52 48 Z");
    E(50, 86, 26, 5);
    XL("M24 84 L76 84", 2.5);
    XL("M44 50 L44 76", 2.5);
  },
  lantern(){
    RO(50, 12, 5.5, 3.5);
    PG(34, 26, 66, 26, 58, 17, 42, 17);
    RR(32, 26, 36, 50, 3); RR(28, 76, 44, 9, 2);
    XRR(38, 32, 24, 38, 2);
    F("M50 40 C54 48 58 52 58 58 C58 63 54 66 50 66 C46 66 42 63 42 58 C42 52 46 48 50 40 Z");
  },
  lens(){
    O(40, 40, 27); XO(40, 40, 20);
    L("M60 60 L86 86", 10);
    RO(40, 40, 13, 3, PI*1.05, PI*1.5);
  },
  spyglass(){
    at(50, 50, -0.6, 1, ()=>{ RR(-44, -6, 22, 12, 2); RR(-20, -8.5, 24, 17, 2); RR(6, -11, 34, 22, 3); RR(38, -13, 6, 26, 2); XL("M-22 -8 L-22 8 M4 -10 L4 10", 2.5); });
  },
  reticle(){
    RO(50, 50, 28, 5);
    L("M50 8 L50 32 M50 68 L50 92 M8 50 L32 50 M68 50 L92 50", 5);
    O(50, 50, 4.5);
  },
  specs(){
    RO(29, 54, 15, 6); RO(71, 54, 15, 6);
    L("M42 50 Q50 42 58 50", 4.5);
    L("M14 52 L8 40 M86 52 L92 40", 4);
    RO(29, 54, 8, 2.5, PI*1.1, PI*1.5); RO(71, 54, 8, 2.5, PI*1.1, PI*1.5);
  },
  magnet(){
    L("M30 16 L30 50 C30 66 39 76 50 76 C61 76 70 66 70 50 L70 16", 17);
    XL("M20 30 L40 30 M60 30 L80 30", 3);
    L("M14 84 L20 90 M86 84 L80 90 M50 90 L50 96", 3);
  },
  hat(){
    F("M44 6 C52 18 60 36 70 62 L30 62 C38 40 40 22 44 6 Z");
    E(50, 68, 40, 10);
    XL("M33 54 L67 54", 3.5);
    XE(50, 68, 26, 4);
    E(50, 66, 22, 3);
  },
  sock(){
    F("M33 10 L61 10 L61 54 C61 59 63 61 67 63 L79 69 C88 74 88 89 74 89 L44 89 C33 89 29 80 31 71 L33 61 Z");
    XL("M33 21 L61 21 M33 31 L61 31", 4);
    XL("M42 89 C46 82 54 80 60 84", 2.5);
  },
  boot(){
    F("M30 12 L57 12 L57 56 L80 64 C87 67 89 74 87 82 L87 87 L23 87 L23 80 L30 72 Z");
    XL("M30 23 L57 23", 3.5);
    XL("M23 79 L87 79", 3);
    XL("M38 32 L50 36 M38 42 L50 46", 2.5);
  },
  drumstick(){
    E(38, 38, 27, 21, -0.75);
    L("M54 54 L76 76", 8);
    O(80, 74, 6.5); O(74, 81, 6.5);
    XRO(38, 38, 13, 3, PI*1.05, PI*1.5);
  },
  box(){
    L("M36 40 L36 28 Q50 18 64 28 L64 40", 5.5);
    RR(16, 38, 68, 48, 4);
    XL("M16 52 L84 52", 3);
    XRR(44, 47, 12, 10, 1);
  },
  door(){
    F("M20 90 L20 40 C20 21 33 10 50 10 C67 10 80 21 80 40 L80 90 Z");
    X("M30 90 L30 42 C30 30 39 21 50 21 C61 21 70 30 70 42 L70 90 Z");
    C.beginPath(); for(let t=0;t<=1;t+=0.02){ const a = t*TAU*1.6, r = 2 + t*15; C.lineTo(50 + Math.cos(a)*r, 58 + Math.sin(a)*r); } C.lineWidth = 3.5; C.stroke();
  },
  bomb(){
    O(45, 59, 29);
    at(64, 31, 0.6, 1, ()=> RR(-8, -6, 16, 12, 2));
    L("M68 25 Q74 12 84 16", 3.5);
    STAR(86, 14, 5, 3, 10, 0.4);
    XRO(45, 59, 20, 3.5, PI*1.05, PI*1.45);
  },
  bubble(){
    RO(44, 54, 29, 5);
    RO(44, 54, 19, 3, PI*1.1, PI*1.5);
    RO(78, 22, 9, 4); RO(84, 46, 5, 3);
  },
  comet(){
    L("M58 40 L14 84", 8); L("M52 34 L20 58", 4.5); L("M64 46 L40 82", 4.5);
    XO(68, 32, 22); O(68, 32, 18);
    XRO(68, 32, 11, 3, PI*1.05, PI*1.5);
  },
  accordion(){
    RR(8, 24, 18, 52, 3); RR(74, 24, 18, 52, 3);
    PG(26, 30, 34, 24, 42, 30, 50, 24, 58, 30, 66, 24, 74, 30, 74, 70, 66, 76, 58, 70, 50, 76, 42, 70, 34, 76, 26, 70);
    XL("M34 26 L34 74 M42 30 L42 70 M50 26 L50 74 M58 30 L58 70 M66 26 L66 74", 2.2);
    XO(14, 36, 2.5); XO(20, 46, 2.5); XO(14, 56, 2.5); XO(20, 66, 2.5);
  },
  bonfire(){
    F("M16 86 C12 70 24 62 28 50 C32 58 36 60 38 54 C36 44 40 36 46 30 C46 42 52 46 56 42 C58 52 62 54 64 48 C70 56 80 66 84 86 Z");
    XL("M18 88 L82 76 M18 76 L82 88", 5);
    L("M18 88 L82 76 M18 76 L82 88", 3);
    cut(); RR(43, 18, 14, 60, 2); add();
    PG(46, 22, 54, 22, 54, 66, 50, 74, 46, 66);
    RR(38, 18, 24, 6, 2); RR(47, 8, 6, 11, 1); O(50, 7, 4);
  },
  hydra(){
    const necks = ["M50 90 C50 72 30 62 26 34", "M50 90 C50 64 50 44 50 26", "M50 90 C50 72 70 62 74 34"];
    necks.forEach((d, i)=>{ if(i){ cut(); L(d, 13); add(); } L(d, 8); });
    [[26, 28, -0.4], [50, 20, 0], [74, 28, 0.4]].forEach(([x, y, r])=>{ E(x, y, 10, 8, r); XO(x + (r < 0 ? -3 : 3)*(r ? 1 : 0), y - 2, 2.2); });
    XL("M22 32 L30 30 M46 24 L54 24 M70 30 L78 32", 1.8);
  },
  rune(){
    F("M30 14 C40 8 62 8 72 16 C80 32 80 66 74 84 C62 92 38 92 26 84 C20 66 20 32 30 14 Z");
    XL("M50 80 L50 22 M50 46 L34 26 M50 46 L66 26", 5.5);
    XL("M70 20 L64 36 L68 48", 2);
  }
};

/* ================================================================== *
 *  Which glyph each thing gets
 * ================================================================== */
Icons.ITEMS = {
  /* stats */
  spinach:"leaf", coffee:"cup", boots:"boot", heartjar:"heart", teapot:"teapot", clover:"clover", lens:"lens", scope:"spyglass",
  tallhat:"hat", specs:"specs", magnet:"magnet", hourglass:"hourglass+droplet", socks:"sock", snack:"drumstick", chunky:"slug", tiny:"pellets",
  steroids:"syringe", caffeine:"cup+bolt", glasscannon:"cannon~", luckyfoot:"claw", desperation:"heart~", overflow:"chalice", patience:"hourglass",
  /* the shape of every shot */
  rubber:"bounce", pinball:"orb+bounce", sharp:"pierce", drill:"drill", seeker:"curve", splitter:"split", twinshot:"bullet*2", triple:"fan",
  sideeyes:"arrows3", rearguard:"arrows2", wiggle:"worm", orbiter:"orbit", boomerang:"boomerang", ghostshot:"ghost", snowball:"snowball",
  rocket:"rocket", corkscrew:"spiral", chaos:"chaos", burstfire:"bullet*3", echo:"waves", kaleido:"arrows4",
  /* elements */
  cinderskin:"flame+shield@fire", kindling:"pouch@fire", brand:"burst@fire", flamestep:"boot@fire", pyroglove:"hand@fire", ashcrown:"crown@fire", phoenix:"feather@fire", salamander:"worm@fire", hearthstone:"ring@fire", sunsigil:"sun@fire",
  frostmitts:"hand@frost", rimeshard:"shards@frost", glacialplate:"shield@frost", snowdrift:"boot@frost", iciclecrown:"crown@frost", wintersbite:"fang@frost", permafrost:"rune@frost", hailcharm:"snowball@frost", frozentear:"droplet@frost", glacierheart:"heart+snowflake@frost",
  rotfang:"fang@poison", toadvenom:"frog@poison", blightgloves:"hand@poison", plaguemask:"mask@poison", sporesack:"pouch@poison", bileflask:"flask@poison", creepmold:"mushroom@poison", cauldron:"keg@poison", leechring:"ring@poison", motherrot:"skull+droplet@poison",
  copperwire:"chain+bolt@shock", staticgloves:"hand@shock", stormboots:"boot@shock", lightningrod:"spear@shock", teslacoil:"spiral@shock", thunderdrum:"bell@shock", galvanic:"cog@shock", sparklantern:"lantern@shock", voltheart:"heart@shock", stormcrown:"crown+cloud@shock",
  hexthread:"tangle@arcane", runebangle:"ring+rune@arcane", magemirror:"mirror@arcane", blinkglyph:"sigil+boot@arcane", eldritcheye:"eye@arcane", grimoire:"tome@arcane", voidlens:"blackhole@arcane", astralchime:"bell+star@arcane", echosigil:"bounce@arcane", magusstar:"star@arcane",
  scatterfocus:"wand+fan", repeatercoil:"wand+spiral", longlens:"wand+lens", bombardrune:"wand+bomb",
  halo:"wand+orbit", crescent:"wand+moon", wisplantern:"wand+wisp", vortexglyph:"wand+waves", prismshard:"wand+prism", fracture:"wand+shards", volleychamber:"wand+pellets", wraithglass:"wand+ghost",
  r_lance:"sun+pierce", r_breath:"flame+fan", r_rocket:"rocket+burst", r_spear:"spear+icicle", r_mine:"bomb+snowflake", r_vine:"thorn+tangle",
  r_locust:"fly+hive", r_ball:"orb+bolt", r_meteor:"comet+star", r_void:"blackhole+orbit", r_frogs:"frog+fan", r_lash:"tongue+frog",
  rimecore:"gem@frost", embercore:"gem@fire", venomcore:"gem@poison", stormcore:"gem@shock", hexcore:"gem@arcane",
  frostrounds:"snowflake", emberrounds:"flame", venomrounds:"droplet", staticrounds:"bolt", arcanerounds:"sigil", prism:"prism", elementalist:"orb@all",
  /* triggers */
  crystal:"gem*3", leaky:"droplet+bullet", wispcraft:"wisp", blossom:"flower", hotpotato:"burst+skull", discharge:"bolt+skull", shrapnel:"shards",
  shatterglass:"shards+bounce", mirrorblink:"mirror", trailblazer:"prints+flame", spite:"nova+droplet", spikyhat:"hat+thorn", leech:"fang+droplet",
  siphon:"jar+wisp", papershield:"shield", lunchbox:"box", fireworks:"burst+star", tictoc:"clock", fizzlepop:"flask+burst", staticcling:"chain@shock",
  coldshoulder:"nova@frost", rotbloom:"flower@poison", popsicle:"icicle@frost", hotswap:"cycle+burst", spellecho:"tome+waves", midaspocket:"pouch", membercard:"scroll+coin",
  brittlecrown:"crown~", tithe:"coin+chalice", pennyroll:"coin*2", interest:"tome+coin", syringe:"syringe+bolt", frenzy:"fang+bolt", itch:"claw+reticle",
  sparebarrel:"gun+bullet", doubletap:"skull+waves", crowsnest:"bird+fan", ukulele:"bolt+chain", mortar:"bone+rocket", fractal:"spiral+burst", gasbag:"cloud@fire",
  emberrelic:"jar@fire", frostrelic:"jar@frost", blightrelic:"jar@poison", stormrelic:"jar@shock", hexrelic:"jar@arcane",
  tadpact:"tadpole", froglock:"tadpole*3", lantern:"lantern@arcane", swampfeet:"prints+droplet", overkill:"skull*2", graverise:"tomb",
  /* element combos */
  plague:"beak@poison", wildfire:"flame*2@fire", brittle:"snowflake~@frost", conductor:"bolt*2@shock", thermal:"flame+snowflake",
  overgrowth:"sprout", wisplord:"wisp*2", megabombs:"bomb",
  /* the odd ones */
  chicken:"bird", shrinkray:"arrowsin", stickybomb:"bomb+droplet", bubblegum:"bubble+droplet", portal:"door", disco:"discoball", beehive:"hive@poison",
  napkin:"skull+ghost", thundersocks:"sock@shock", penny:"coin+clover", hiccups:"bubble", spaghetti:"tangle", snailmail:"snail", accordion:"accordion",
  dice:"die", comet:"comet", twister:"frog+spiral", bogpact:"scroll+frog", lampstaff:"wand+flame", familiar:"reticle+frog", swallow:"frog+skull", hungrytongue:"tongue+heart", croakhex:"nova+frog", clockwork:"cog+heart", haunted:"gun+ghost", pinata:"club",
  /* the grim ones */
  bloodvial:"vial", ashenring:"ring", graveboots:"boot+tomb", candlestub:"candle@fire", hexcoin:"coin+eye", rottenheart:"heart+fly",
  leadrounds:"weight", crowfeather:"feather", greatbow:"bow", witchfire:"flame+eye", bloodpact:"scroll+droplet", sacknife:"knife",
  riposte:"dagger", briar:"thorn", huntersmark:"reticle", silver:"bullet", witchhair:"doll", belldread:"bell", bonfire:"bonfire",
  carrion:"fly@poison", wraithstep:"prints", blackpowder:"keg", boneshield:"shield+bone", vengeance:"mask", giantsfang:"fang",
  moonlight:"moon", hollowing:"skull~", executioner:"axe", lifedrinker:"chalice+droplet", darksign:"darksign", sunlight:"sun",
  soulmass:"wisp*3@arcane", abyssring:"ring+eye", lastrites:"tome", bloodmoon:"moon+droplet",
  /* legendary */
  hydra:"hydra", stormcaller:"cloud@shock", blizzard:"heart@frost", inferno:"cog@fire", moons:"moon*3", dualwield:"gun*2", gremlin:"flask+eye",
  /* GODLY */
  prismheart:"heart@all", recursion:"ouroboros", shadow:"hood", horizon:"blackhole", frogsona:"frog", midas:"hand+coin", reverse:"uturn",
  infinity:"infinity", firekeeper:"bonfire@fire", godwand:"wand"
};
Icons.ACTIVES = {
  watch:"clock", frograin:"tadpole*3", bomb:"bomb", slate:"nova", mirror:"mirror", turret:"mushroom", seer:"lantern+eye", dice:"die",
  meteor:"comet@fire", soup:"bowl", hat:"hat+spiral", whistle:"waves", cannon:"cannon+frog", discoball:"discoball@all", pockethole:"blackhole",
  estus:"flask@fire", dreadbell:"bell", soulspear:"spear@arcane"
};
Icons.FROG = {
  tongue:"tongue", spit:"droplet@poison", croak:"nova@frost", hop:"bolt@shock", brood:"tadpole", lily:"lily", gulp:"uturn", crown:"crown",
  bigboy:"frog", flyhunt:"fly", mirror:"mirror", bubble:"bubble", doom:"skull+waves", twin:"frog*2", zoomies:"comet", sticky:"tongue+droplet",
  mimic:"frog+gun"
};
/* Gribbus' tricks as items (the "f_" ones): his glyph, on a lily pad */
Object.assign(Icons.ITEMS, {
  f_tongue:"tongue+lily", f_sticky:"tongue+droplet", f_flyhunt:"fly+lily", f_spit:"droplet+lily@poison", f_croak:"nova+lily@frost",
  f_hop:"bolt+lily@shock", f_brood:"tadpole+lily", f_lily:"lily", f_gulp:"uturn+lily", f_crown:"crown+lily", f_bigboy:"frog+weight",
  f_mirror:"mirror+lily", f_bubble:"bubble+lily", f_zoomies:"comet+lily", f_doom:"skull+waves@poison", f_twin:"frog*2", f_mimic:"frog+gun"
});
/* the wand, by the form that shapes it (a wand's base is its style: L.wandStyle) */
Icons.GUNS = { pistol:"wand", smg:"wand+spiral", shotgun:"wand+fan", rifle:"wand+lens", launcher:"wand+bomb",
  halo:"wand+orbit", crescent:"wand+moon", wisp:"wand+wisp", vortex:"wand+waves", prism:"wand+prism", fracture:"wand+shards", volley:"wand+pellets", wraith:"wand+ghost" };
Icons.SETS = {
  pyromancer:"flame@fire", lich:"skull@frost", storm:"cloud@shock", plague:"beak@poison", gardener:"sprout", goldfinger:"crown+coin",
  frogprince:"frog+crown", bloodhunter:"fang+droplet", clown:"mask+die"
};
Icons.OFFERS = { heal:"bowl", ward:"rune", key:"key", ember:"bonfire", lantern:"lantern+eye", shroom:"mushroom@poison" };

/* a mirror is still a mirror; the tables above name it */
GL.mirror = function(){
  RE(50, 36, 22, 26, 0, 7);
  XE(50, 36, 18, 22);
  RO(50, 36, 12, 3, PI*1.1, PI*1.45);
  RR(45, 62, 10, 26, 3); O(50, 90, 3.5);
};
GL.prints = function(){
  const foot = ()=>{ E(0, 6, 9, 15); O(-6, -14, 3.2); O(0, -16, 3.2); O(6, -14, 3.2); O(9, -9, 2.6); };
  at(34, 64, -0.25, 1, foot); at(64, 32, 0.25, 1, foot);
};

/* ================================================================== *
 *  Specs
 * ================================================================== */
const ELEMS = ["arcane", "fire", "frost", "poison", "shock"];
Icons.parse = function(s){
  const m = /^([a-z0-9]+)(?:\*(\d))?(~)?(?:\+([a-z0-9]+))?(?:@([a-z,]+))?(?:\/(-?\d+))?$/.exec(s || "");
  if(!m) return null;
  return { g:m[1], n:m[2] ? +m[2] : 1, crack:!!m[3], badge:m[4] || null, els:m[5] ? (m[5] === "all" ? ELEMS.slice() : m[5].split(",")) : [], rot:m[6] ? +m[6]*PI/180 : 0 };
};
const TIERCOL = ()=> (DG.TIERS || []).map(t=> t.color);
/* everything there is to know about how a key is drawn */
Icons.spec = function(key){
  key = String(key || "");
  let ns = "item", id = key;
  const i = key.indexOf(":"); if(i > 0){ ns = key.slice(0, i); id = key.slice(i + 1); }
  let s = null, rim = "#c8a45a", tier = -1, shape = "round", els = [];
  if(ns === "item" && DG.ITEMS && DG.ITEMS[id]){
    const d = DG.ITEMS[id]; s = Icons.parse(Icons.ITEMS[id] || "orb"); tier = d.tier; rim = TIERCOL()[d.tier] || rim;
    els = (d.els || []).slice();
    if(d.frog) shape = "pad";
  } else if(ns === "active"){
    s = Icons.parse(Icons.ACTIVES[id] || "lantern"); shape = "shield"; rim = "#c8a45a";
  } else if(ns === "frog"){
    s = Icons.parse(Icons.FROG[id] || "frog"); rim = "#8aa86a"; shape = "pad";
  } else if(ns === "gun"){
    const [base, el, rar] = id.split(":");
    s = Icons.parse(Icons.GUNS[base] || "gun");
    if(el) els = [el];
    const R = DG.RARITY && DG.RARITY[+rar || 0]; rim = R ? R.color : "#c9d1d9"; tier = [0, 1, 2, 2, 3][+rar || 0];
  } else if(ns === "set"){
    s = Icons.parse(Icons.SETS[id] || "hood"); rim = "#c07ab8"; tier = 3;
  } else if(ns === "offer"){
    s = Icons.parse(Icons.OFFERS[id] || "orb"); rim = id === "heal" ? "#c8402c" : "#9ac8e8";
  } else if(ns === "glyph"){
    s = Icons.parse(id) || Icons.parse("orb");
  } else s = Icons.parse("orb");
  // the spec's own elements win over the item's, and say "all" when it carries all
  if(s.els.length) els = s.els;
  return { g:s.g, n:s.n, crack:s.crack, badge:s.badge, rot:s.rot, els, rim, tier, shape };
};

/* ================================================================== *
 *  Drawing a medallion
 * ================================================================== */
const cache = {}, urls = {};
const mk = s=>{ const c = document.createElement("canvas"); c.width = c.height = s; return c; };
const rgb = h=>{ h = String(h).replace("#", ""); if(h.length === 3) h = h.split("").map(c=> c + c).join(""); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const mix = (a, b, t)=> a.map((v, i)=> Math.round(v + (b[i] - v)*t));
const css = (c, a)=> a === undefined ? "rgb(" + c.join(",") + ")" : "rgba(" + c.join(",") + "," + a + ")";
const ELCOL = el=> DG.ELEMENTS && DG.ELEMENTS[el] ? DG.ELEMENTS[el].color : 0xffffff;
const elRgb = el=>{ const n = ELCOL(el); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const BONE = [216, 204, 176];

function shapePath(g, shape, cx, cy, r){
  g.beginPath();
  if(shape === "shield"){
    // a heater shield, its top a little arched
    g.moveTo(cx - r*0.86, cy - r*0.78);
    g.quadraticCurveTo(cx, cy - r*1.02, cx + r*0.86, cy - r*0.78);
    g.lineTo(cx + r*0.86, cy - r*0.05);
    g.bezierCurveTo(cx + r*0.86, cy + r*0.5, cx + r*0.42, cy + r*0.82, cx, cy + r*1.0);
    g.bezierCurveTo(cx - r*0.42, cy + r*0.82, cx - r*0.86, cy + r*0.5, cx - r*0.86, cy - r*0.05);
    g.closePath();
  } else g.arc(cx, cy, r, 0, TAU);
}

/* the glyph (and its badge, copies and crack) into a white mask */
function drawGlyphs(sp){
  const g = GL[sp.g] || GL.orb;
  const one = (x, y, rot, s, fn)=> at(x, y, rot, s, ()=>{ C.translate(-50, -50); fn(); });
  // a copy laid over another first cuts a moat round itself, so both read
  const moat = (x, y, rot, s, fn)=>{ CUTALL = true; add(); for(let i=0;i<8;i++){ const a = i/8*TAU; one(x + Math.cos(a)*4.5, y + Math.sin(a)*4.5, rot, s, fn); } CUTALL = false; add(); };
  const n = Math.min(3, sp.n || 1);
  const scale = sp.badge ? 0.84 : 1, ox = sp.badge ? -5 : 0, oy = sp.badge ? -5 : 0;
  if(n === 1) one(50 + ox, 50 + oy, sp.rot, scale, g);
  else {
    const pos = n === 2 ? [[35, 42, -0.25, 0.62], [64, 60, 0.2, 0.62]] : [[50, 30, 0, 0.5], [28, 64, -0.3, 0.5], [72, 64, 0.3, 0.5]];
    pos.forEach(([x, y, r, s], i)=>{ if(i) moat(x + ox, y + oy, sp.rot + r, s*scale, g); one(x + ox, y + oy, sp.rot + r, s*scale, g); });
  }
  if(sp.crack){ cut(); C.lineWidth = 4.5; C.stroke(p2("M58 8 L46 30 L56 44 L42 60 L52 74 L44 92")); add(); }
  if(sp.badge && GL[sp.badge]){
    cut(); O(76, 76, 21); add();
    RO(76, 76, 19, 2);
    one(76, 76, 0, 0.3, GL[sp.badge]);
  }
}

/* how a canvas gets its glyph: an ink outline, a bone (or gilt) body, a bevel */
function glyphLayer(g, S, sp, Ri){
  const k = Ri*2*(S < 80 ? 0.9 : 0.86)/100;
  const M = mk(S), m = M.getContext("2d", { willReadFrequently:true });
  m.setTransform(k, 0, 0, k, S/2 - 50*k, S/2 - 50*k);
  m.fillStyle = m.strokeStyle = "#fff"; m.lineCap = "round"; m.lineJoin = "round";
  C = m; CUTALL = false; add();
  drawGlyphs(sp);
  C = null;
  m.setTransform(1, 0, 0, 1, 0, 0);
  const tint = (col)=>{ const T = mk(S), t = T.getContext("2d", { willReadFrequently:true }); t.drawImage(M, 0, 0); t.globalCompositeOperation = "source-in"; t.fillStyle = col; t.fillRect(0, 0, S, S); return T; };
  // the outline, and a soft drop shadow under it
  const o = Math.max(1, S*0.022), ink = tint("#070504");
  g.save(); g.globalAlpha = 0.55; g.drawImage(ink, o*0.5, o*1.6); g.restore();
  for(let i=0;i<12;i++){ const a = i/12*TAU; g.drawImage(ink, Math.cos(a)*o, Math.sin(a)*o); }
  // the body: bone, or gilt for the godly
  const B = mk(S), b = B.getContext("2d", { willReadFrequently:true });
  b.drawImage(M, 0, 0); b.globalCompositeOperation = "source-in";
  const gr = b.createLinearGradient(0, S*0.2, 0, S*0.85);
  if(sp.tier >= 4){ gr.addColorStop(0, "#fff4c8"); gr.addColorStop(0.55, "#e2c278"); gr.addColorStop(1, "#9a7434"); }
  else { gr.addColorStop(0, "#f4ead2"); gr.addColorStop(0.55, "#d6c8a6"); gr.addColorStop(1, "#9a8a6c"); }
  b.fillStyle = gr; b.fillRect(0, 0, S, S);
  // the bevel: light on the upper-left edges, shade on the lower-right
  const d = Math.max(0.7, S*0.013);
  const edge = (dx, dy, col)=>{ const T = mk(S), t = T.getContext("2d", { willReadFrequently:true }); t.fillStyle = col; t.fillRect(0, 0, S, S); t.globalCompositeOperation = "destination-out"; t.drawImage(M, dx, dy); b.globalCompositeOperation = "source-atop"; b.drawImage(T, 0, 0); };
  edge(-d, -d, "rgba(60,40,24,.55)");
  edge(d, d, "rgba(255,252,240,.55)");
  g.drawImage(B, 0, 0);
}

function medallion(g, S, sp){
  const cx = S/2, cy = S/2, R = S*(sp.tier >= 3 && S >= 40 ? 0.405 : 0.44), rim = rgb(sp.rim), small = S < 40;
  const rimC = mix(rim, BONE, 0.18), hi = mix(rimC, [255, 250, 235], 0.35), lo = mix(rimC, [0, 0, 0], 0.62);
  // the glow it gives off, stronger the rarer it is
  const ga = sp.tier >= 4 ? 0.75 : sp.tier === 3 ? 0.6 : sp.tier === 2 ? 0.45 : 0.32;
  const gl = g.createRadialGradient(cx, cy, R*0.75, cx, cy, S*0.5);
  gl.addColorStop(0, css(rimC, ga)); gl.addColorStop(1, css(rimC, 0));
  g.fillStyle = gl; g.fillRect(0, 0, S, S);
  // thorns or rays for the great ones
  if(sp.tier >= 3 && !small){
    const n = sp.tier >= 4 ? 16 : 8;
    g.fillStyle = css(mix(rimC, [0, 0, 0], 0.25));
    g.strokeStyle = "rgba(0,0,0,.85)"; g.lineWidth = Math.max(1, S*0.008);
    for(let i=0;i<n;i++){
      const a = i/n*TAU + PI/n, l = S*(sp.tier >= 4 ? (i % 2 ? 0.46 : 0.5) : 0.495), w = sp.tier >= 4 ? 0.12 : 0.2;
      g.beginPath(); g.moveTo(cx + Math.cos(a)*l, cy + Math.sin(a)*l); g.lineTo(cx + Math.cos(a - w)*R*0.95, cy + Math.sin(a - w)*R*0.95); g.lineTo(cx + Math.cos(a + w)*R*0.95, cy + Math.sin(a + w)*R*0.95); g.closePath(); g.fill(); g.stroke();
    }
  }
  // the rim: forged metal of the tier's colour, edged in ink
  shapePath(g, sp.shape, cx, cy, R + Math.max(1, S*0.018)); g.fillStyle = "rgba(4,3,3,.95)"; g.fill();
  const rg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  rg.addColorStop(0, css(hi)); rg.addColorStop(0.45, css(rimC)); rg.addColorStop(1, css(lo));
  shapePath(g, sp.shape, cx, cy, R); g.fillStyle = rg; g.fill();
  // the face: soot, warmed by an element if it carries one
  const Ri = R*(S < 80 ? 0.88 : 0.84);
  shapePath(g, sp.shape, cx, cy, Ri + Math.max(0.8, S*0.012)); g.fillStyle = "rgba(0,0,0,.92)"; g.fill();
  const els = sp.els || [];
  const tintC = els.length === 1 ? elRgb(els[0]) : els.length > 1 ? els.map(elRgb).reduce((a, b)=> mix(a, b, 0.5)) : null;
  const fg = g.createRadialGradient(cx, cy - Ri*0.15, Ri*0.05, cx, cy, Ri);
  fg.addColorStop(0, tintC ? css(mix([40, 32, 28], tintC, 0.42)) : "#2c2420");
  fg.addColorStop(0.65, tintC ? css(mix([18, 14, 12], tintC, 0.18)) : "#16110f");
  fg.addColorStop(1, "#060404");
  shapePath(g, sp.shape, cx, cy, Ri); g.fillStyle = fg; g.fill();
  if(!small){
    // a fine inner ring, engraved
    shapePath(g, sp.shape, cx, cy, Ri*0.94); g.strokeStyle = css(rimC, 0.22); g.lineWidth = Math.max(0.6, S*0.006); g.stroke();
    // rivets on the rim
    if(sp.tier < 3){ g.fillStyle = css(mix(rimC, [0, 0, 0], 0.5)); [1, 3, 5, 7].forEach(i=>{ const a = i*PI/4, rr = (R + Ri)/2; g.beginPath(); g.arc(cx + Math.cos(a)*rr, cy + Math.sin(a)*rr, S*0.012, 0, TAU); g.fill(); }); }
  }
  // the lily pad: a notch out of the rim
  if(sp.shape === "pad"){ g.fillStyle = "rgba(4,3,3,1)"; g.beginPath(); g.moveTo(cx, cy - R*0.84); g.lineTo(cx - R*0.14, cy - R*1.04); g.lineTo(cx + R*0.14, cy - R*1.04); g.closePath(); g.fill(); }
  return { R, Ri, els };
}
/* a diamond for each element, set into the bottom of the rim */
function pips(g, S, R, els){
  if(!els.length) return;
  const n = els.length, r = Math.max(1.6, S*(n > 3 ? 0.032 : 0.042)), step = r*2.3;
  const cx = S/2, cy = S/2 + R*0.93;
  els.forEach((el, i)=>{
    const x = cx + (i - (n - 1)/2)*step;
    g.beginPath(); g.moveTo(x, cy - r*1.35); g.lineTo(x + r*1.35, cy); g.lineTo(x, cy + r*1.35); g.lineTo(x - r*1.35, cy); g.closePath();
    g.fillStyle = "rgba(0,0,0,.95)"; g.fill();
    g.beginPath(); g.moveTo(x, cy - r); g.lineTo(x + r, cy); g.lineTo(x, cy + r); g.lineTo(x - r, cy); g.closePath();
    g.fillStyle = css(mix(elRgb(el), [255, 255, 255], 0.15)); g.fill();
  });
}

Icons.canvas = function(key, size){
  const S = Math.max(8, Math.round(size || 64)), ck = key + "|" + S;
  if(cache[ck]) return cache[ck];
  const sp = Icons.spec(key), cv = mk(S), g = cv.getContext("2d", { willReadFrequently:true });
  const m = medallion(g, S, sp);
  glyphLayer(g, S, sp, m.Ri);
  pips(g, S, m.R, m.els);
  return (cache[ck] = cv);
};
Icons.url = function(key, size){
  const ck = key + "|" + size;
  return urls[ck] || (urls[ck] = Icons.canvas(key, size).toDataURL());
};
/* draw one centred at x,y, size s (css px) on a HUD context scaled by dpr */
Icons.draw = function(g, key, x, y, s, dpr){
  const px = Math.round(s*(dpr || 1));
  g.drawImage(Icons.canvas(key, px), Math.round(x - s/2), Math.round(y - s/2), s, s);
};
/* the key for whatever sits on a pedestal or lies on the floor:
   { kind:"item", id }, { kind:"active", id }, { kind:"gun", gun } or a gun
   itself, { kind:"heal" }, { kind:"ward" } */
Icons.keyFor = function(o){
  if(!o) return "orb";
  if(o.kind === "item") return o.id;
  if(o.kind === "active") return "active:" + o.id;
  const g = o.kind === "gun" && o.gun ? o.gun : o;
  if(g.kind === "gun" || g.base) return "gun:" + g.base + ":" + (g.element || "") + ":" + (g.rarity || 0);
  if(o.kind === "heal" || o.kind === "ward" || o.kind === "key") return "offer:" + o.kind;
  if(o.kind === "quest") return "offer:" + (o.id === "ember" ? "ember" : o.id === "lantern" ? "lantern" : "shroom");
  return "glyph:orb";
};
/* the colour of its rim, for glows and beams */
Icons.color = function(key){ return Icons.spec(key).rim; };
Icons.tier = function(key){ return Icons.spec(key).tier; };

/* every key there is, for the contact sheet and the tests */
Icons.keys = function(){
  const k = [];
  Object.keys(DG.ITEMS || {}).forEach(id=> k.push(id));
  Object.keys(DG.ACTIVES || {}).forEach(id=> k.push("active:" + id));
  Object.keys(DG.FROG_BUFFS || {}).forEach(id=> k.push("frog:" + id));
  Object.keys(Icons.GUNS).forEach((b, i)=> k.push("gun:" + b + ":" + ELEMS[i] + ":" + i));
  Object.keys(Icons.SETS).forEach(id=> k.push("set:" + id));
  Object.keys(Icons.OFFERS).forEach(id=> k.push("offer:" + id));
  return k;
};

})(typeof window !== "undefined" ? window : globalThis);
