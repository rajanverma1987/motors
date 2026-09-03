/**
 * Platform Cir Mills catalogs (AWG + Metric).
 * AWG seed: historical half-size table (documents/cirmills-awg.csv).
 * Metric seed: documents/cirmills.csv (Metric mm → Cir mills).
 */

export const CIR_MILLS_UNIT_AWG = "awg";
export const CIR_MILLS_UNIT_METRIC = "metric";

export function normalizeCirMillsUnit(raw) {
  const u = String(raw || "").trim().toLowerCase();
  return u === CIR_MILLS_UNIT_METRIC ? CIR_MILLS_UNIT_METRIC : CIR_MILLS_UNIT_AWG;
}

/** Default AWG / circular mils table. Used to seed PlatformCirMills when AWG unit is empty. */
export const DEFAULT_CIR_MILLS_ROWS = [
  { size: "0.5", circularMills: 94000 },
  { size: "1", circularMills: 83690 },
  { size: "1.5", circularMills: 74530 },
  { size: "2", circularMills: 66360 },
  { size: "2.5", circularMills: 59100 },
  { size: "3", circularMills: 52620 },
  { size: "3.5", circularMills: 46870 },
  { size: "4", circularMills: 41740 },
  { size: "4.5", circularMills: 37170 },
  { size: "5", circularMills: 33090 },
  { size: "5.5", circularMills: 29480 },
  { size: "6", circularMills: 26240 },
  { size: "6.5", circularMills: 23380 },
  { size: "7", circularMills: 20820 },
  { size: "7.5", circularMills: 18550 },
  { size: "8", circularMills: 16510 },
  { size: "8.5", circularMills: 14710 },
  { size: "9", circularMills: 13090 },
  { size: "9.5", circularMills: 11660 },
  { size: "10", circularMills: 10380 },
  { size: "10.5", circularMills: 9250 },
  { size: "11", circularMills: 8230 },
  { size: "11.5", circularMills: 7330 },
  { size: "12", circularMills: 6530 },
  { size: "12.5", circularMills: 5820 },
  { size: "13", circularMills: 5180 },
  { size: "13.5", circularMills: 4610 },
  { size: "14", circularMills: 4110 },
  { size: "14.5", circularMills: 3660 },
  { size: "15", circularMills: 3260 },
  { size: "15.5", circularMills: 2910 },
  { size: "16", circularMills: 2580 },
  { size: "16.5", circularMills: 2300 },
  { size: "17", circularMills: 2050 },
  { size: "17.5", circularMills: 1820 },
  { size: "18", circularMills: 1620 },
  { size: "18.5", circularMills: 1440 },
  { size: "19", circularMills: 1290 },
  { size: "19.5", circularMills: 1150 },
  { size: "20", circularMills: 1020 },
  { size: "20.5", circularMills: 912 },
  { size: "21", circularMills: 812 },
  { size: "21.5", circularMills: 724 },
  { size: "22", circularMills: 640 },
  { size: "22.5", circularMills: 571 },
  { size: "23", circularMills: 511 },
  { size: "23.5", circularMills: 454 },
  { size: "24", circularMills: 404 },
  { size: "24.5", circularMills: 361 },
  { size: "25", circularMills: 320 },
  { size: "25.5", circularMills: 286 },
  { size: "26", circularMills: 253 },
  { size: "26.5", circularMills: 225 },
  { size: "27", circularMills: 202 },
  { size: "27.5", circularMills: 180 },
  { size: "28", circularMills: 159 },
  { size: "28.5", circularMills: 142 },
  { size: "29", circularMills: 128 },
  { size: "29.5", circularMills: 112 },
  { size: "30", circularMills: 100 },
  { size: "30.5", circularMills: 90.3 },
  { size: "31", circularMills: 79.2 },
  { size: "32", circularMills: 64 },
  { size: "33", circularMills: 50.4 },
  { size: "34", circularMills: 39.7 },
  { size: "35", circularMills: 31.4 },
  { size: "36", circularMills: 25 },
];

/** Default Metric (mm) / circular mils table from documents/cirmills.csv. */
export const DEFAULT_METRIC_CIR_MILLS_ROWS = [
  { size: "7.5", circularMills: 87190 },
  { size: "7.1", circularMills: 78140 },
  { size: "6.7", circularMills: 69580 },
  { size: "6.3", circularMills: 61520 },
  { size: "6", circularMills: 55800 },
  { size: "5.6", circularMills: 48610 },
  { size: "5.3", circularMills: 43540 },
  { size: "5", circularMills: 38750 },
  { size: "4.75", circularMills: 34970 },
  { size: "4.5", circularMills: 31390 },
  { size: "4.25", circularMills: 28000 },
  { size: "4", circularMills: 24800 },
  { size: "3.75", circularMills: 21800 },
  { size: "3.55", circularMills: 19530 },
  { size: "3.35", circularMills: 17390 },
  { size: "3.15", circularMills: 15380 },
  { size: "3", circularMills: 13950 },
  { size: "2.8", circularMills: 12150 },
  { size: "2.65", circularMills: 10880 },
  { size: "2.5", circularMills: 9690 },
  { size: "2.36", circularMills: 8630 },
  { size: "2.24", circularMills: 7780 },
  { size: "2.12", circularMills: 6970 },
  { size: "2", circularMills: 6200 },
  { size: "1.9", circularMills: 5600 },
  { size: "1.8", circularMills: 5020 },
  { size: "1.7", circularMills: 4480 },
  { size: "1.6", circularMills: 3970 },
  { size: "1.5", circularMills: 3490 },
  { size: "1.4", circularMills: 3040 },
  { size: "1.32", circularMills: 2700 },
  { size: "1.25", circularMills: 2420 },
  { size: "1.18", circularMills: 2160 },
  { size: "1.12", circularMills: 1940 },
  { size: "1.06", circularMills: 1740 },
  { size: "1", circularMills: 1550 },
  { size: "0.95", circularMills: 1400 },
  { size: "0.9", circularMills: 1260 },
  { size: "0.85", circularMills: 1120 },
  { size: "0.8", circularMills: 992 },
  { size: "0.75", circularMills: 872 },
  { size: "0.71", circularMills: 781 },
  { size: "0.67", circularMills: 696 },
  { size: "0.63", circularMills: 615 },
  { size: "0.6", circularMills: 558 },
  { size: "0.56", circularMills: 486 },
  { size: "0.53", circularMills: 435 },
  { size: "0.5", circularMills: 388 },
  { size: "0.475", circularMills: 350 },
  { size: "0.45", circularMills: 314 },
  { size: "0.425", circularMills: 280 },
  { size: "0.4", circularMills: 248 },
  { size: "0.375", circularMills: 218 },
  { size: "0.355", circularMills: 195 },
  { size: "0.335", circularMills: 174 },
  { size: "0.315", circularMills: 140 },
  { size: "0.3", circularMills: 122 },
  { size: "0.28", circularMills: 122 },
  { size: "0.265", circularMills: 109 },
  { size: "0.25", circularMills: 96.3 },
  { size: "0.236", circularMills: 86.3 },
  { size: "0.224", circularMills: 77.8 },
  { size: "0.212", circularMills: 69.7 },
  { size: "0.2", circularMills: 62 },
  { size: "0.19", circularMills: 56 },
  { size: "0.18", circularMills: 50.4 },
  { size: "0.17", circularMills: 44.8 },
  { size: "0.16", circularMills: 39.7 },
  { size: "0.15", circularMills: 34.9 },
  { size: "0.14", circularMills: 30.4 },
  { size: "0.132", circularMills: 27 },
  { size: "0.125", circularMills: 24.2 },
];

/**
 * @param {{ size: string, qty: number|string, circularMills?: number }[]} selections
 * @returns {{ display: string, totalQty: number, totalCm: number }}
 */
export function formatOriginalWireSelection(selections) {
  const parts = [];
  let totalQty = 0;
  let totalCm = 0;
  for (const row of Array.isArray(selections) ? selections : []) {
    const size = String(row?.size ?? "").trim();
    const qty = Number.parseFloat(String(row?.qty ?? "").replace(/,/g, ""));
    const cm = Number(row?.circularMills);
    if (!size || !Number.isFinite(qty) || qty <= 0) continue;
    parts.push(`${size} #${qty}`);
    totalQty += qty;
    if (Number.isFinite(cm) && cm > 0) totalCm += cm * qty;
  }
  return {
    display: parts.join(", "),
    totalQty: Math.round(totalQty * 1000) / 1000,
    totalCm: Math.round(totalCm * 100) / 100,
  };
}
