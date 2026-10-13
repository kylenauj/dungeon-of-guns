/* ------------------------------------------------------------------ *
 *  Loot: rolling guns, runes and relics, naming them, pricing them,
 *  and turning a gun plus its runes plus the wizard's relics into the
 *  numbers a shot is fired with.
 *
 *  The curve that makes loot matter: enemy HP grows ~45% a floor
 *  (FLOOR_SCALE), a gun's damage grows 30% per item level and up to
 *  75% for rarity. Item level is the floor it dropped on, so a floor-1
 *  gun falls behind unless its runes carry it.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const L = DG.Loot = {};

let uidN = 0;
L.uid = ()=> "i" + (++uidN);

L.power = (level, rarity)=> (1 + 0.3*(level - 1))*DG.RARITY[rarity].mul;

L.rollRarity = function(rng, level, boost, min){
  const b = 0.18*(level - 1) + (boost || 0);
  const pool = DG.RARITY.map((r, i)=> ({ i, w:r.w*Math.pow(1 + b, i) })).filter(o=> o.i >= (min || 0));
  return rng.weighted(pool).i;
};

L.rollRune = function(rng, element, exclude){
  exclude = exclude || [];
  const ids = Object.keys(DG.RUNES).filter(id=> exclude.indexOf(id) < 0);
  // runes that play with the gun's element turn up more often on it
  const syn = { poison:["plague", "venom"], fire:["wildfire", "blast"], frost:["glacier", "ricochet"], shock:["conductor", "pierce"], arcane:["homing", "split"] }[element] || [];
  return rng.weighted(ids, id=> DG.RUNES[id].w*(syn.indexOf(id) >= 0 ? 2.5 : 1));
};

L.makeGun = function(base, element, rarity, level, runes, extra){
  const R = DG.RARITY[rarity];
  const g = Object.assign({ kind:"gun", uid:L.uid(), base, element, rarity, level, runes:(runes || []).slice(), slots:Math.max(R.slots, (runes || []).length) }, extra || {});
  g.ammo = L.stats(g).mag;
  g.name = g.unique || L.gunName(g);
  return g;
};

L.gunName = function(g){
  const B = DG.GUNS[g.base], E = DG.ELEMENTS[g.element];
  if(g.rarity === 0 && !g.runes.length) return E.adj + " " + B.name;
  const r = g.runes[0] && DG.RUNES[g.runes[0]];
  return E.adj + " " + B.name + (r ? " " + r.suffix : "");
};

L.rollGun = function(rng, level, opts){
  opts = opts || {};
  const rarity = opts.rarity !== undefined ? opts.rarity : L.rollRarity(rng, level, opts.boost, opts.minRarity);
  if(rarity === 4 && rng.chance(0.4)){
    const u = rng.pick(DG.UNIQUES);
    return L.makeGun(u.base, u.element, 4, level, u.runes, { unique:u.name, flavour:u.flavour, slots:3 });
  }
  const base = opts.base || rng.pick(DG.GUN_ORDER), element = opts.element || rng.pick(DG.ELEMENT_ORDER);
  const runes = [];
  for(let i=0;i<DG.RARITY[rarity].runes;i++) runes.push(L.rollRune(rng, element, runes));
  return L.makeGun(base, element, rarity, level, runes);
};

L.starterGun = ()=> L.makeGun("pistol", "arcane", 0, 1, [], { unique:"Old Faithful", flavour:"Your first wand-pistol. It has never once been cleaned." });

L.makeRune = id=> ({ kind:"rune", uid:L.uid(), id, name:DG.RUNES[id].name });
L.makeRelic = id=> ({ kind:"relic", uid:L.uid(), id, name:DG.RELICS[id].name });
L.rollRelic = function(rng, owned){
  owned = owned || [];
  const ids = Object.keys(DG.RELICS).filter(id=> owned.indexOf(id) < 0);
  if(!ids.length) return null;
  return L.makeRelic(rng.weighted(ids, id=> DG.RELICS[id].w));
};

L.price = function(item, floor){
  switch(item.kind){
    case "gun":   return Math.round((22 + 10*item.level)*(1 + item.rarity*0.55));
    case "rune":  return 28 + 9*floor;
    case "relic": return 45 + 12*floor;
    case "heal":  return 12 + 4*floor;
    case "mana":  return 8 + 3*floor;
  }
  return 99;
};

/* ---- the numbers a gun fires with ---- */
L.runeFx = function(gun){
  const fx = {};
  (gun.runes || []).forEach(id=>{
    const r = DG.RUNES[id]; if(!r) return;
    for(const k in r.fx){
      const v = r.fx[k];
      if(/Mul$|^spellCost$/.test(k)) fx[k] = (fx[k] === undefined ? 1 : fx[k])*v;
      else fx[k] = (fx[k] || 0) + v;
    }
  });
  return fx;
};

/* ps: the wizard's stat block from relics (game.js playerStats); optional */
L.stats = function(gun, ps){
  ps = ps || {};
  const B = DG.GUNS[gun.base], fx = L.runeFx(gun), power = L.power(gun.level, gun.rarity);
  const m = (k)=> fx[k] === undefined ? 1 : fx[k];
  return {
    power,
    dmg: B.dmg*power*m("dmgMul")*(ps.dmgMul || 1),
    rate: B.rate*m("rateMul")*(ps.rateMul || 1),
    speed: B.speed,
    spread: B.spread,
    pellets: B.pellets + (fx.extraPellets || 0),
    mag: Math.round(B.mag*m("magMul")),
    reload: B.reload*m("reloadMul"),
    range: B.range,
    size: B.size*m("sizeMul"),
    knock: B.knock,
    pierce: (B.pierce || 0) + (fx.pierce || 0),
    bounces: fx.bounces || 0,
    blast: B.blast || 0,
    fx,
    crit: ps.crit || 0,
    spell: DG.ELEMENTS[gun.element].spell,
    spellCost: Math.round(DG.SPELLS[DG.ELEMENTS[gun.element].spell].cost*m("spellCost"))
  };
};

/* a one-line summary for tooltips and the HUD */
L.describe = function(item){
  if(item.kind === "gun"){
    const s = L.stats(item), R = DG.RARITY[item.rarity];
    return R.name + " · lvl " + item.level + " · " + Math.round(s.dmg*10)/10 + (s.pellets > 1 ? "×" + s.pellets : "") + " dmg · " + Math.round(s.rate*10)/10 + "/s";
  }
  if(item.kind === "rune") return DG.RUNES[item.id].desc;
  if(item.kind === "relic") return DG.RELICS[item.id].desc;
  return "";
};

/* a rough damage-per-second figure, for comparing guns */
L.dps = function(gun, ps){
  const s = L.stats(gun, ps);
  const cycle = s.mag/s.rate + s.reload;
  return s.dmg*s.pellets*(s.pellets > 1 ? 0.7 : 1)*s.mag/cycle*(1 + (s.blast ? 0.5 : 0));
};

})(typeof window !== "undefined" ? window : globalThis);
