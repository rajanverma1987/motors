/** Common copper AWG circular mils (legacy short list). Prefer platform-cir-mills.js. */
export { DEFAULT_CIR_MILLS_ROWS as DEFAULT_WIRE_CATALOG_RAW } from "./platform-cir-mills";

import { DEFAULT_CIR_MILLS_ROWS } from "./platform-cir-mills";

/** @deprecated Use platform Cir Mills AWG/Metric tables via platform-cir-mills.js */
export const DEFAULT_WIRE_CATALOG = DEFAULT_CIR_MILLS_ROWS.map((w) => ({
  id: `awg-${w.size}`,
  size: String(w.size),
  circularMills: Number(w.circularMills),
}));
