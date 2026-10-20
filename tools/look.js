/* ------------------------------------------------------------------ *
 *  The look check (npm run look): the balance report for the art.
 *
 *  Serves the game, opens it in headless Chromium, takes the same shots
 *  every time (floors 1, 3 and 5 on a fixed seed, and two gallery rows),
 *  hides the HUD, and measures each picture against the look contract in
 *  docs/ART_DIRECTION.md:
 *
 *    black  % of pixels near black (luma < 0.07). Target: 35%+ on a room.
 *    sat    % of pixels that are strongly coloured (HSV saturation > 0.45
 *           and value > 0.2). Emissive things are allowed to be; the rest
 *           of the world isn't, so this should stay small.
 *    msat   mean saturation of the pixels that aren't near black
 *
 *  Shots are saved to .look/ (or the folder given as the first argument)
 *  to look at by eye. Needs Playwright (global or local) and a Chromium.
 *  Quote the numbers before and after any change to the look.
 * ------------------------------------------------------------------ */
const http = require("http"), fs = require("fs"), path = require("path");

function loadPlaywright(){
  const tries = ["playwright", "/opt/node22/lib/node_modules/playwright"];
  for(const t of tries){ try{ return require(t); }catch(e){} }
  console.error("npm run look needs Playwright: npm i -g playwright (and a Chromium)."); process.exit(1);
}

const ROOT = path.join(__dirname, ".."), OUT = path.resolve(process.argv[2] || path.join(ROOT, ".look"));
const TYPES = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".png":"image/png", ".svg":"image/svg+xml", ".json":"application/json" };
function serve(){
  return new Promise(res=>{
    const s = http.createServer((q, r)=>{
      const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]).replace(/\/$/, "/index.html"));
      if(!f.startsWith(ROOT)){ r.writeHead(403); return r.end(); }
      fs.readFile(f, (e, d)=>{ if(e){ r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type":TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); });
    });
    s.listen(0, ()=> res(s));
  });
}

const SHOTS = [
  { name:"floor1", url:"?play&seed=ash&floor=1&god", wait:9000 },
  { name:"floor3", url:"?play&seed=ash&floor=3&god", wait:9000 },
  { name:"floor5", url:"?play&seed=bone&floor=5&god", wait:9000 },
  { name:"heroes", url:"?gallery", wait:7000, cam:[-4, 0, 9] },
  { name:"gloom",  url:"?gallery", wait:7000, cam:[0, 23, 11] }
];

/* measured in the page: decode the screenshot on a canvas and count */
function measure(b64){
  return new Promise(res=>{
    const im = new Image();
    im.onload = ()=>{
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const g = c.getContext("2d"); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let n = 0, black = 0, sat = 0, ss = 0, sn = 0;
      for(let i=0;i<d.length;i+=4){
        const r = d[i]/255, gg = d[i+1]/255, b = d[i+2]/255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b);
        const l = 0.299*r + 0.587*gg + 0.114*b, s = mx > 0 ? (mx - mn)/mx : 0;
        n++;
        if(l < 0.07){ black++; continue; }
        ss += s; sn++;
        if(s > 0.45 && mx > 0.2) sat++;
      }
      res({ black:black/n*100, sat:sat/n*100, msat:sn ? ss/sn*100 : 0 });
    };
    im.src = "data:image/png;base64," + b64;
  });
}

(async()=>{
  const { chromium } = loadPlaywright();
  const srv = await serve(), base = "http://localhost:" + srv.address().port + "/";
  fs.mkdirSync(OUT, { recursive:true });
  const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
  const b = await chromium.launch({ executablePath:exe, args:["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport:{ width:1280, height:720 } });
  p.on("pageerror", e=> console.error("  page error:", e.message));
  const rows = [];
  for(const s of SHOTS){
    await p.goto(base + s.url);
    await p.waitForTimeout(s.wait);
    if(s.cam) await p.evaluate(([x, z, d])=>{ const C = DG.Gallery.cam; C.x = x; C.z = z; C.dist = d; DG.Stage.follow(x, z, x, z, true); }, s.cam);
    await p.addStyleTag({ content:"#hud, #screens { visibility:hidden !important; }" });
    await p.waitForTimeout(1500);
    const buf = await p.screenshot({ path:path.join(OUT, s.name + ".png") });
    const m = await p.evaluate(measure, buf.toString("base64"));
    rows.push(Object.assign({ name:s.name }, m));
  }
  await b.close(); srv.close();
  const f = v=> v.toFixed(1).padStart(6);
  console.log("shot        black%   sat%  msat%");
  rows.forEach(r=> console.log(r.name.padEnd(10) + f(r.black) + " " + f(r.sat) + " " + f(r.msat)));
  const rooms = rows.filter(r=> r.name.startsWith("floor"));
  const avg = k=> rooms.reduce((a, r)=> a + r[k], 0)/rooms.length;
  console.log("rooms avg " + f(avg("black")) + " " + f(avg("sat")) + " " + f(avg("msat")));
  console.log("targets      >=35     <3   (lower is greyer)");
  console.log("shots in " + path.relative(process.cwd(), OUT) + "/");
})().catch(e=>{ console.error(e); process.exit(1); });
