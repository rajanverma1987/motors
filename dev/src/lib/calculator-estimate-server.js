import { computeCustomerRewindBallpark, DEFAULT_CUSTOMER_COPPER_USD_PER_KG } from "@/lib/motor-rewind-cost/calculate";
import { fetchMotorCalculatorMarketSnapshot } from "@/lib/motor-calculator-market-fetch";

const RANGE_LOW_FACTOR = 0.88;
const RANGE_HIGH_FACTOR = 1.12;
const INDUSTRIAL_HP_THRESHOLD = 100;
const REPLACEMENT_MIDPOINT_MIN_USD = 1500;

function roughBallparkBand(low, high) {
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

function estimateNewMotorReplacementUsd(motorHp, motorPpiMultiplier = 1) {
  const h = Number(motorHp);
  if (!Number.isFinite(h) || h <= 0) return null;
  const m = Number.isFinite(motorPpiMultiplier) && motorPpiMultiplier > 0 ? motorPpiMultiplier : 1;
  return Math.round((350 + h * 98) * m);
}

function normalizeFormInput(body) {
  const form = body?.form && typeof body.form === "object" ? body.form : body;
  return {
    ratingUnit: "hp",
    hp: String(form?.hp ?? "10").trim(),
    kw: "",
    phase: String(form?.phase ?? "3").trim(),
    voltage: String(form?.voltage ?? "460").trim(),
    rpm: String(form?.rpm ?? "").trim(),
    slots: String(form?.slots ?? "36").trim(),
    coilType: String(form?.coilType ?? "lap").trim(),
    wireGauge: String(form?.wireGauge ?? "13").trim(),
    insulationMode: "fixed",
    insulationValue: "165",
    manualCuKg: String(form?.manualCuKg ?? "").trim(),
  };
}

/**
 * Server-only rewind ballpark (never send to client when access denied).
 */
export async function buildRewindCalculatorEstimate(body) {
  const form = normalizeFormInput(body);
  let market = {
    copperUsdPerKg: DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
    motorPpiMultiplier: 1,
    copperLive: false,
    motorLive: false,
    copperSourceLabel: "",
    motorSourceLabel: "",
    fetchedAt: "",
  };
  try {
    const snap = await fetchMotorCalculatorMarketSnapshot();
    if (snap && typeof snap === "object") {
      market = {
        copperUsdPerKg:
          typeof snap.copperUsdPerKg === "number" && Number.isFinite(snap.copperUsdPerKg)
            ? snap.copperUsdPerKg
            : DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
        motorPpiMultiplier:
          typeof snap.motorPpiMultiplier === "number" &&
          Number.isFinite(snap.motorPpiMultiplier) &&
          snap.motorPpiMultiplier > 0
            ? snap.motorPpiMultiplier
            : 1,
        copperLive: !!snap.copperLive,
        motorLive: !!snap.motorLive,
        copperSourceLabel: typeof snap.copperSourceLabel === "string" ? snap.copperSourceLabel : "",
        motorSourceLabel: typeof snap.motorSourceLabel === "string" ? snap.motorSourceLabel : "",
        fetchedAt: typeof snap.fetchedAt === "string" ? snap.fetchedAt : "",
      };
    }
  } catch {
    /* use defaults */
  }

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
  const newMotorEstimate = estimateNewMotorReplacementUsd(motorHp, market.motorPpiMultiplier);
  const crossesReplaceVsNew =
    newMotorEstimate != null && Number.isFinite(total) && total > 0.6 * newMotorEstimate;
  const replacementRecommended =
    crossesReplaceVsNew && Number.isFinite(midpoint) && midpoint >= REPLACEMENT_MIDPOINT_MIN_USD;

  return {
    breakdown,
    low,
    high,
    roughLow: rough.lowR,
    roughHigh: rough.highR,
    newMotorEstimate,
    replacementRecommended,
    industrial: Number.isFinite(motorHp) && motorHp > INDUSTRIAL_HP_THRESHOLD,
    fractionalHpNote: Number.isFinite(motorHp) && motorHp > 0 && motorHp < 1,
    market,
  };
}

function formatUsdWhole(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}

/** Blurred preview only — rounded band text, no breakdown (exact range still requires paid estimate). */
export async function buildRewindCalculatorTeaserPreview(body) {
  const est = await buildRewindCalculatorEstimate(body);
  return {
    previewText: `${formatUsdWhole(est.roughLow)} – ${formatUsdWhole(est.roughHigh)}`,
  };
}
