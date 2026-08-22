/**
 * Default AWG / circular mils table (from documents/cirmills.csv).
 * Used to seed PlatformCirMills when the collection is empty.
 */
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
