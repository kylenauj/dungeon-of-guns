/* ------------------------------------------------------------------ *
 *  Loot: Zippy's wand (the numbers it fires with) and prices. Powerups
 *  are in items.js.
 *
 *  There's one weapon, the wand. Forms (items) reshape how it fires
 *  (DG.WAND_FORMS), its element is whichever you've gathered most of,
 *  and it grows stronger floor by floor (DG.WAND_LEVEL). The old guns
 *  (rollGun) are still here for the endless floors' odd test, but
 *  nothing drops them.
 * ------------------------------------------------------------------ */
(function(root){
"use strict";
const DG = root.DG;
const L = DG.Loot = {};

let uidN = 0;
L.uid = ()=> "i" + (++uidN);

L.MASTERY_K = 0.06; L.MASTERY_MAX = 5;
/* kills a gun needs for its next rank of mastery */
L.masteryNeed = rank=> 40 + 30*rank;
L.power = (level, rarity)=> (1 + 0.3*(level - 1))*DG.RARITY[rarity].mul;

L.rollRarity = function(rng, level, boost, min){
  const b = 0.18*(level - 1) + (boost || 0);
  const pool = DG.RARITY.map((r, i)=> ({ i, w:r.w*Math.pow(1 + b, i) })).filter(o=> o.i >= (min || 0));
  return rng.weighted(pool).i;
};

L.makeGun = function(base, element, rarity, level, innate, extra){
  const g = Object.assign({ kind:"gun", uid:L.uid(), base, element, rarity, level, innate:(innate || []).slice() }, extra || {});
  g.ammo = L.stats(g).mag;
  g.name = g.unique || L.gunName(g);
  return g;
};

L.gunName = function(g, M){
  if(g.wand){
    // named for its two boldest forms (all twelve made a name nobody could read)
    const E = DG.ELEMENTS[g.element], forms = DG.FORM_ORDER.filter(f=> M && M.forms[f]).slice(0, 2).map(f=> DG.WAND_FORMS[f].name);
    return E.adj + " " + (forms.length ? forms.join(" ") + " " : "") + "Wand";
  }
  const B = DG.GUNS[g.base], E = DG.ELEMENTS[g.element];
  const it = g.innate[0] && DG.ITEMS[g.innate[0]];
  return E.adj + " " + B.name + (it ? " of " + it.name.replace(/^(The|A) /, "") : "");
};

/* built-in powerups: a common/uncommon/rare one per slot of the rarity */
L.rollInnate = function(rng, rarity){
  const out = [];
  DG.RARITY[rarity].innate.forEach(tier=>{
    // anything that works while held (not one-off health, wards or mana)
    const pick = Object.keys(DG.ITEMS).filter(id=>{
      const d = DG.ITEMS[id];
      return d.tier === tier && out.indexOf(id) < 0 && !(d.stats && (d.stats.hp || d.stats.wards || d.stats.mana));
    });
    if(pick.length) out.push(rng.pick(pick));
  });
  return out;
};

L.rollGun = function(rng, level, opts){
  opts = opts || {};
  const rarity = opts.rarity !== undefined ? opts.rarity : L.rollRarity(rng, level, opts.boost, opts.minRarity);
  if(rarity === 4 && rng.chance(0.4)){
    const u = rng.pick(DG.UNIQUES);
    return L.makeGun(u.base, u.element, 4, level, u.innate, { unique:u.name, flavour:u.flavour });
  }
  const base = opts.base || rng.pick(DG.GUN_ORDER), element = opts.element || rng.pick(DG.ELEMENT_ORDER);
  return L.makeGun(base, element, rarity, level, L.rollInnate(rng, rarity));
};

L.starterGun = ()=> L.makeGun("pistol", "arcane", 0, 1, [], { wand:true, unique:"Arcane Wand", flavour:"Zippy's only wand. Everything you find reshapes it." });
/* the look and sound a wand takes from its forms (the boldest one) */
L.wandStyle = M=> { const f = DG.FORM_ORDER.find(k=> M && M.forms[k]); return f ? DG.WAND_FORMS[f].style : "pistol"; };

L.itemPrice = function(id, floor){ const t = DG.ITEMS[id].tier; return Math.round((24 + 20*t + t*t*8)*(1 + 0.3*(floor - 1))); };
L.price = function(item, floor){
  switch(item.kind){
    case "gun":   return Math.round((22 + 12*item.level)*(1 + item.rarity*0.6));
    case "item":  return L.itemPrice(item.id, floor);
    case "heal":  return 12 + 4*floor;
    case "ward":  return 14 + 4*floor;
    case "active":return 30 + 8*floor;
  }
  return 99;
};

/* the numbers a gun fires with, once everything Zippy owns (M) is counted */
L.stats = function(gun, M){
  M = M || DG.Items.blank();
  // mastery: a gun you keep killing with grows with you (+6% a rank, 5 ranks)
  const B = gun.wand ? L.wandBase(M) : DG.GUNS[gun.base], power = L.power(gun.level, gun.rarity)*(1 + L.MASTERY_K*(gun.mastery || 0));
  const cl = (v, lo)=> Math.max(lo, v);
  return {
    power,
    dmg: B.dmg*power*cl(1 + M.dmg, 0.2)*M.dmgMul,
    rate: B.rate*cl(1 + M.rate, 0.25),
    speed: B.speed*cl(1 + M.shotSpeed, 0.4),
    spread: B.spread,
    pellets: B.pellets,
    mag: Math.max(1, Math.round(B.mag*(1 + M.mag))),
    reload: B.reload/(1 + M.reload),
    range: B.range*cl(1 + M.range, 0.4),
    size: B.size*cl(1 + M.size, 0.4),
    knock: B.knock,
    blast: B.blast || 0,
    basePierce: B.pierce || 0,
    crit: M.crit,
    critMul: 2 + M.critMul,
    spell: DG.ELEMENTS[gun.element].spell,
    spellTier: (M.attune && M.attune[gun.element]) || 0,
    spellCost: Math.round(DG.SPELLS[DG.ELEMENTS[gun.element].spell].cost*Math.max(0.3, 1 - M.spellCost))
  };
};

/* the wand's bolt with every form it has taken worked in */
L.wandBase = function(M){
  const B = Object.assign({}, DG.GUNS.wand);
  for(const f of DG.FORM_ORDER){
    const F = M && M.forms[f] && DG.WAND_FORMS[f]; if(!F) continue;
    ["pellets", "spread", "pierce", "blast"].forEach(k=>{ if(F[k]) B[k] = (B[k] || 0) + F[k]; });
    ["dmg", "rate", "speed", "range", "mag", "size", "knock"].forEach(k=>{ if(F[k]) B[k] *= F[k]; });
    if(F.spreadMul) B.spread *= F.spreadMul;
  }
  return B;
};

L.describe = function(item){
  if(item.kind === "gun"){
    const s = L.stats(item), R = DG.RARITY[item.rarity];
    return R.name + " · lvl " + item.level + " · " + Math.round(s.dmg*10)/10 + (s.pellets > 1 ? "×" + s.pellets : "") + " dmg · " + Math.round(s.rate*10)/10 + "/s";
  }
  if(item.kind === "item") return DG.ITEMS[item.id].desc;
  return "";
};

/* a rough damage-per-second figure, for comparing guns */
L.dps = function(gun, M){
  const s = L.stats(gun, M);
  const cycle = s.mag/s.rate + s.reload;
  return s.dmg*s.pellets*(s.pellets > 1 ? 0.7 : 1)*s.mag/cycle*(1 + (s.blast ? 0.5 : 0));
};

})(typeof window !== "undefined" ? window : globalThis);
