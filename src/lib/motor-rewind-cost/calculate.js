import copperData from "./copper-weight-lookup.json";
import pricingRules from "./pricing-rules.json";

const KW_TO_HP = 1.34102;

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function toNum(v, fallback = 0) {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseAwg(g) {
  const s = String(g).trim();
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pick empirical copper mass (kg) from lookup; falls back to closest row by HP, slots, and AWG.
 */
export function lookupCopperWeightKg(motorHp, slots, wireGauge) {
  const hp = toNum(motorHp, 0);
  const sl = toNum(slots, 0);
  const awg = parseAwg(wireGauge);
  const entries = copperData.entries || [];

  if (hp <= 0 || sl <= 0 || awg == null) {
    return { cuKg: null, match: "invalid", detail: "HP, slots, and wire gauge are required for lookup." };
  }

  let best = null;
  let bestScore = Infinity;
  for (const row of entries) {
    const rowAwg = parseAwg(row.awg);
    if (rowAwg == null) continue;
    const hpDiff = Math.abs(toNum(row.hpRef, 0) - hp);
    const slotPen = row.slots === sl ? 0 : Math.abs(row.slots - sl) * 0.25;
    const awgPen = rowAwg === awg ? 0 : Math.abs(rowAwg - awg) * 0.35;
    const score = hpDiff * 1.2 + slotPen + awgPen;
    if (score < bestScore) {
      bestScore = score;
      best = row;
    }
  }

  if (!best) {
    return { cuKg: null, match: "none", detail: "Lookup table has no rows." };
  }

  const exact = best.hpRef === hp && best.slots === sl && parseAwg(best.awg) === awg;
  return {
    cuKg: toNum(best.cuKg, 0),
    match: exact ? "exact" : "nearest",
    detail: exact
      ? "Matched nameplate band in shop lookup table."
      : `Nearest empirical row: ~${best.hpRef} HP, ${best.slots} slots, AWG ${best.awg} (adjust manual kg if needed).`,
    matchedRow: best,
  };
}

function laborFromSlabs(motorHp) {
  const hp = toNum(motorHp, 0);
  const slabs = [...(pricingRules.laborSlabs || [])].sort((a, b) => toNum(a.upToHp) - toNum(b.upToHp));
  for (const s of slabs) {
    if (hp <= toNum(s.upToHp, 0)) {
      return { laborUsd: toNum(s.laborUsd, 0), slabLabel: `Up to ${s.upToHp} HP` };
    }
  }
  const last = slabs[slabs.length - 1];
  return { laborUsd: last ? toNum(last.laborUsd, 0) : 0, slabLabel: "Open-ended slab" };
}

/**
 * Full rewind quote breakdown (USD). Safe to run on server or client.
 * @param {Record<string, unknown>} input
 */
export function computeMotorRewindQuote(input) {
  const ratingUnit = input.ratingUnit === "kw" ? "kw" : "hp";
  const motorHp =
    ratingUnit === "kw" ? toNum(input.kw, 0) * KW_TO_HP : toNum(input.hp, 0);

  const slots = Math.round(toNum(input.slots, 0));
  const wireGauge = input.wireGauge;
  const copperRatePerKg = toNum(input.copperRatePerKg, 0);
  const manualCuKg = toNum(input.manualCuKg, 0);

  const laborMode = input.laborMode === "per_hp" ? "per_hp" : "slab";
  const laborPerHp = toNum(input.laborPerHp, toNum(pricingRules.defaultLaborPerHpUsd, 78));

  const insulationMode = input.insulationMode === "percent" ? "percent" : "fixed";
  const insulationValue = toNum(input.insulationValue, 0);

  const marginPct = toNum(input.marginPct, 0);
  const gstPct = toNum(input.gstPct, 0);

  let cuKg = null;
  let copperSource = "lookup";
  let copperNote = "";

  if (manualCuKg > 0) {
    cuKg = manualCuKg;
    copperSource = "manual";
    copperNote = "Using manually entered copper weight.";
  } else {
    const lu = lookupCopperWeightKg(motorHp, slots, wireGauge);
    cuKg = lu.cuKg;
    copperNote = lu.detail || "";
    copperSource = lu.match === "exact" ? "lookup" : lu.match === "nearest" ? "lookup_nearest" : "lookup_missing";
    if (cuKg == null || lu.match === "invalid" || lu.match === "none") {
      copperSource = "missing";
      cuKg = 0;
    }
  }

  const copperCost = round2((cuKg || 0) * copperRatePerKg);

  let materialCost = 0;
  if (insulationMode === "percent") {
    materialCost = round2((insulationValue / 100) * copperCost);
  } else {
    materialCost = round2(insulationValue);
  }

  let laborUsd = 0;
  let laborLabel = "";
  if (laborMode === "per_hp") {
    laborUsd = round2(motorHp * laborPerHp);
    laborLabel = `${round2(laborPerHp)} USD/HP × ${round2(motorHp)} HP`;
  } else {
    const slab = laborFromSlabs(motorHp);
    laborUsd = round2(slab.laborUsd);
    laborLabel = `Slab (${slab.slabLabel})`;
  }

  const subtotal = round2(copperCost + materialCost + laborUsd);
  const afterMargin = round2(subtotal * (1 + marginPct / 100));
  const taxAmount = round2(afterMargin * (gstPct / 100));
  const finalTotal = round2(afterMargin + taxAmount);

  return {
    motorHp: round2(motorHp),
    ratingUnit,
    hpInput: round2(toNum(input.hp, 0)),
    kwInput: round2(toNum(input.kw, 0)),
    copperWeightKg: round2(cuKg || 0),
    copperSource,
    copperNote,
    copperCost,
    insulationMode,
    materialCost,
    laborMode,
    laborUsd,
    laborLabel,
    subtotal,
    marginPct: round2(marginPct),
    marginAmount: round2(afterMargin - subtotal),
    afterMargin,
    gstPct: round2(gstPct),
    taxAmount,
    finalTotal,
    meta: {
      phase: input.phase,
      voltage: toNum(input.voltage, 0),
      rpm: input.rpm,
      coilType: input.coilType,
      slots,
      wireGauge,
    },
  };
}

export function validateMotorRewindPayload(body) {
  const errors = [];
  if (!body || typeof body !== "object") errors.push("Body must be a JSON object.");
  const copper = toNum(body.copperRatePerKg, NaN);
  if (!Number.isFinite(copper) || copper < 0) errors.push("copperRatePerKg must be a non-negative number.");
  return errors;
}

/** Typical reference copper value for public ballpark only (not a live commodity quote). */
const DEFAULT_CUSTOMER_COPPER_USD_PER_KG = 9.75;

/**
 * Customer-facing ballpark: slab labor, no margin/tax, optional copper override from input.
 * Insulation defaults to fixed shop-style allowance unless caller passes insulationMode/insulationValue.
 */
export function computeCustomerRewindBallpark(input) {
  const merged = {
    ...input,
    copperRatePerKg:
      input.copperRatePerKg != null && String(input.copperRatePerKg).trim() !== ""
        ? toNum(input.copperRatePerKg, DEFAULT_CUSTOMER_COPPER_USD_PER_KG)
        : DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
    laborMode: "slab",
    laborPerHp: toNum(pricingRules.defaultLaborPerHpUsd, 78),
    marginPct: 0,
    gstPct: 0,
  };
  const full = computeMotorRewindQuote(merged);
  return {
    motorHp: full.motorHp,
    ratingUnit: full.ratingUnit,
    hpInput: full.hpInput,
    kwInput: full.kwInput,
    copperWeightKg: full.copperWeightKg,
    copperCost: full.copperCost,
    materialCost: full.materialCost,
    laborUsd: full.laborUsd,
    ballparkTotal: full.subtotal,
    meta: full.meta,
  };
}
