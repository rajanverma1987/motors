/**
 * Server-only helpers for marketing rewind calculator market inputs.
 * Copper: IMF primary commodity copper via FRED (USD/metric ton → USD/kg).
 * Replacement benchmark: US PPI Motor and Generator Manufacturing, scaled vs anchor index.
 *
 * Env:
 * - FRED_API_KEY — https://fred.stlouisfed.org/docs/api/api_key.html
 * - MOTOR_REPLACEMENT_PPI_ANCHOR — PPI index value matching our baseline $ formula (default 285)
 * - MOTOR_CALC_CATHODE_TO_WIRE_FACTOR — uplift cathode → rough magnet-wire purchasing proxy (default 1.12)
 */

import { DEFAULT_CUSTOMER_COPPER_USD_PER_KG } from "@/lib/motor-rewind-cost/calculate";

const FRED_OBS_URL = "https://api.stlouisfed.org/fred/series/observations";

/** IMF Primary Commodity Prices: Copper, U.S. dollars per metric ton (monthly). */
const FRED_COPPER_SERIES = "PCOPPUSDM";

/** Producer Price Index: Motor and Generator Manufacturing (NAICS 335312), index. */
const FRED_MOTOR_PPI_SERIES = "PCU335312335312";

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function fredLatestObservation(seriesId, apiKey) {
  const url = new URL(FRED_OBS_URL);
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`FRED ${seriesId}: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const obs = Array.isArray(data?.observations) ? data.observations : [];
  for (const row of obs) {
    const v = row?.value;
    if (v === "." || v === undefined || v === null || String(v).trim() === "") continue;
    const num = Number(v);
    if (!Number.isFinite(num)) continue;
    return { date: String(row.date || "").trim(), value: num };
  }
  return null;
}

/**
 * @returns {Promise<{
 *   copperUsdPerKg: number,
 *   copperLive: boolean,
 *   copperSourceLabel: string,
 *   motorPpiMultiplier: number,
 *   motorLive: boolean,
 *   motorSourceLabel: string,
 *   fetchedAt: string,
 * }>}
 */
export async function fetchMotorCalculatorMarketSnapshot() {
  const fetchedAt = new Date().toISOString();
  const fredKey = process.env.FRED_API_KEY?.trim();
  const ppiAnchor = Number(process.env.MOTOR_REPLACEMENT_PPI_ANCHOR ?? "285");
  const cathodeToWire = Number(process.env.MOTOR_CALC_CATHODE_TO_WIRE_FACTOR ?? "1.12");

  let copperUsdPerKg = DEFAULT_CUSTOMER_COPPER_USD_PER_KG;
  let copperLive = false;
  let copperSourceLabel = `Fallback benchmark (${DEFAULT_CUSTOMER_COPPER_USD_PER_KG.toFixed(2)} USD/kg)`;

  let motorPpiMultiplier = 1;
  let motorLive = false;
  let motorSourceLabel = "Static heuristic (350 USD base + 98 USD/HP); configure FRED_API_KEY for PPI-adjusted benchmark";

  if (!fredKey) {
    return {
      copperUsdPerKg,
      copperLive,
      copperSourceLabel,
      motorPpiMultiplier,
      motorLive,
      motorSourceLabel,
      fetchedAt,
    };
  }

  const copperProm = fredLatestObservation(FRED_COPPER_SERIES, fredKey).catch(() => null);
  const ppiProm = fredLatestObservation(FRED_MOTOR_PPI_SERIES, fredKey).catch(() => null);

  const [cuObs, ppiObs] = await Promise.all([copperProm, ppiProm]);

  if (cuObs && Number.isFinite(cuObs.value) && cuObs.value > 0) {
    const perKgCathode = cuObs.value / 1000;
    const wireFactor = Number.isFinite(cathodeToWire) && cathodeToWire > 0 ? cathodeToWire : 1.12;
    copperUsdPerKg = round2(perKgCathode * wireFactor);
    copperLive = true;
    copperSourceLabel = `IMF copper benchmark via FRED (${FRED_COPPER_SERIES}, ${cuObs.date}); ×${wireFactor} cathode→wire proxy`;
  }

  if (ppiObs && Number.isFinite(ppiObs.value) && ppiObs.value > 0 && Number.isFinite(ppiAnchor) && ppiAnchor > 0) {
    motorPpiMultiplier = ppiObs.value / ppiAnchor;
    if (!Number.isFinite(motorPpiMultiplier) || motorPpiMultiplier <= 0) motorPpiMultiplier = 1;
    motorLive = true;
    motorSourceLabel = `US PPI Motor & Generator Mfg. (${FRED_MOTOR_PPI_SERIES}, ${ppiObs.date}) vs anchor index ${ppiAnchor} (St. Louis Fed)`;
  }

  return {
    copperUsdPerKg,
    copperLive,
    copperSourceLabel,
    motorPpiMultiplier,
    motorLive,
    motorSourceLabel,
    fetchedAt,
  };
}
