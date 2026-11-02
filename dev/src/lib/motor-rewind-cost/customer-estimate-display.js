import { computeCustomerRewindBallpark } from "@/lib/motor-rewind-cost/calculate";

export const RANGE_LOW_FACTOR = 0.88;
export const RANGE_HIGH_FACTOR = 1.12;
export const INDUSTRIAL_HP_THRESHOLD = 100;
export const REPLACEMENT_MIDPOINT_MIN_USD = 1500;

export function roughBallparkBand(low, high) {
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lowR: lo, highR: hi };
  const roundDown25 = (n) => Math.floor(n / 25) * 25;
  const roundUp25 = (n) => Math.ceil(n / 25) * 25;
  let lowR = roundDown25(lo);
  let highR = roundUp25(hi);
  if (highR < lowR) highR = lowR + 25;
  return { lowR, highR };
}

export function estimateNewMotorReplacementUsd(motorHp, motorPpiMultiplier = 1) {
  const h = Number(motorHp);
  if (!Number.isFinite(h) || h <= 0) return null;
  const m = Number.isFinite(motorPpiMultiplier) && motorPpiMultiplier > 0 ? motorPpiMultiplier : 1;
  return Math.round((350 + h * 98) * m);
}

export function formatUsd(n, { whole = false } = {}) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: whole ? 0 : 2,
  }).format(x);
}

/**
 * Build customer-facing estimate display from sanitized calculator form + market snapshot.
 * @param {Record<string, string>} form
 * @param {{ copperUsdPerKg?: number, motorPpiMultiplier?: number, copperLive?: boolean, motorLive?: boolean, copperSourceLabel?: string, motorSourceLabel?: string, fetchedAt?: string }} market
 */
export function buildCustomerEstimateDisplay(form, market = {}) {
  const breakdown = computeCustomerRewindBallpark({
    ...form,
    slots: Number(form.slots),
    voltage: Number(form.voltage),
    copperRatePerKg: market.copperUsdPerKg,
  });
  const total = breakdown.ballparkTotal;
  const low = Math.round(total * RANGE_LOW_FACTOR * 100) / 100;
  const high = Math.round(total * RANGE_HIGH_FACTOR * 100) / 100;
  const midpoint = (low + high) / 2;
  const rough = roughBallparkBand(low, high);
  const motorHp = breakdown.motorHp;
  const motorPpiMultiplier = market.motorPpiMultiplier ?? 1;
  const newMotorEstimate = estimateNewMotorReplacementUsd(motorHp, motorPpiMultiplier);
  const crossesReplaceVsNew =
    newMotorEstimate != null && Number.isFinite(total) && total > 0.6 * newMotorEstimate;
  const replacementRecommended =
    crossesReplaceVsNew && Number.isFinite(midpoint) && midpoint >= REPLACEMENT_MIDPOINT_MIN_USD;
  const industrial = Number.isFinite(motorHp) && motorHp > INDUSTRIAL_HP_THRESHOLD;
  const fractionalHpNote = Number.isFinite(motorHp) && motorHp > 0 && motorHp < 1;

  return {
    breakdown,
    low,
    high,
    roughLow: rough.lowR,
    roughHigh: rough.highR,
    newMotorEstimate,
    replacementRecommended,
    industrial,
    fractionalHpNote,
    copperLive: !!market.copperLive,
    motorLive: !!market.motorLive,
    copperSourceLabel: market.copperSourceLabel || "",
    motorSourceLabel: market.motorSourceLabel || "",
    copperUsdPerKg: market.copperUsdPerKg,
    motorPpiMultiplier,
    marketFetchedAt: market.fetchedAt || "",
  };
}
