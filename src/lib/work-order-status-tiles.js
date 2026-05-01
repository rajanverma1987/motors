/**
 * Shop floor job board status column header pills (Tailwind; pairs light + dark).
 * Indices are stable for saved settings (`workOrderStatusTileColors`).
 */
export const WORK_ORDER_STATUS_TILE_PRESETS = [
  { label: "Sky", className: "bg-sky-100 ring-1 ring-sky-300/90 shadow-sm dark:bg-sky-400/15 dark:shadow-none dark:ring-sky-400/30" },
  { label: "Violet", className: "bg-violet-100 ring-1 ring-violet-300/90 shadow-sm dark:bg-violet-400/15 dark:shadow-none dark:ring-violet-400/30" },
  { label: "Emerald", className: "bg-emerald-100 ring-1 ring-emerald-300/90 shadow-sm dark:bg-emerald-400/15 dark:shadow-none dark:ring-emerald-400/30" },
  { label: "Rose", className: "bg-rose-100 ring-1 ring-rose-300/90 shadow-sm dark:bg-rose-400/15 dark:shadow-none dark:ring-rose-400/30" },
  { label: "Amber", className: "bg-amber-100 ring-1 ring-amber-300/90 shadow-sm dark:bg-amber-400/15 dark:shadow-none dark:ring-amber-400/30" },
  { label: "Cyan", className: "bg-cyan-100 ring-1 ring-cyan-300/90 shadow-sm dark:bg-cyan-400/15 dark:shadow-none dark:ring-cyan-400/30" },
  { label: "Fuchsia", className: "bg-fuchsia-100 ring-1 ring-fuchsia-300/90 shadow-sm dark:bg-fuchsia-400/15 dark:shadow-none dark:ring-fuchsia-400/30" },
  { label: "Lime", className: "bg-lime-100 ring-1 ring-lime-300/90 shadow-sm dark:bg-lime-400/15 dark:shadow-none dark:ring-lime-400/30" },
  { label: "Teal", className: "bg-teal-100 ring-1 ring-teal-300/90 shadow-sm dark:bg-teal-400/15 dark:shadow-none dark:ring-teal-400/30" },
  { label: "Indigo", className: "bg-indigo-100 ring-1 ring-indigo-300/90 shadow-sm dark:bg-indigo-400/15 dark:shadow-none dark:ring-indigo-400/30" },
  { label: "Orange", className: "bg-orange-100 ring-1 ring-orange-300/90 shadow-sm dark:bg-orange-400/15 dark:shadow-none dark:ring-orange-400/30" },
  { label: "Pink", className: "bg-pink-100 ring-1 ring-pink-300/90 shadow-sm dark:bg-pink-400/15 dark:shadow-none dark:ring-pink-400/30" },
  { label: "Blue", className: "bg-blue-100 ring-1 ring-blue-300/90 shadow-sm dark:bg-blue-400/15 dark:shadow-none dark:ring-blue-400/30" },
  { label: "Green", className: "bg-green-100 ring-1 ring-green-300/90 shadow-sm dark:bg-green-400/15 dark:shadow-none dark:ring-green-400/30" },
  { label: "Red", className: "bg-red-100 ring-1 ring-red-300/90 shadow-sm dark:bg-red-400/15 dark:shadow-none dark:ring-red-400/30" },
  { label: "Purple", className: "bg-purple-100 ring-1 ring-purple-300/90 shadow-sm dark:bg-purple-400/15 dark:shadow-none dark:ring-purple-400/30" },
  { label: "Yellow", className: "bg-yellow-100 ring-1 ring-yellow-300/90 shadow-sm dark:bg-yellow-400/15 dark:shadow-none dark:ring-yellow-400/30" },
  { label: "Stone", className: "bg-stone-200 ring-1 ring-stone-400/80 shadow-sm dark:bg-stone-400/15 dark:shadow-none dark:ring-stone-400/30" },
  { label: "Slate", className: "bg-slate-200 ring-1 ring-slate-400/80 shadow-sm dark:bg-slate-400/15 dark:shadow-none dark:ring-slate-400/30" },
  { label: "Rose (soft)", className: "bg-rose-100 ring-1 ring-rose-300/90 shadow-sm dark:bg-rose-500/12 dark:shadow-none dark:ring-rose-500/25" },
  { label: "Sky (soft)", className: "bg-sky-100 ring-1 ring-sky-300/90 shadow-sm dark:bg-sky-500/12 dark:shadow-none dark:ring-sky-500/25" },
  { label: "Teal (soft)", className: "bg-teal-100 ring-1 ring-teal-300/90 shadow-sm dark:bg-teal-500/12 dark:shadow-none dark:ring-teal-500/25" },
  { label: "Purple (soft)", className: "bg-purple-100 ring-1 ring-purple-300/90 shadow-sm dark:bg-purple-500/12 dark:shadow-none dark:ring-purple-500/25" },
  { label: "Orange (soft)", className: "bg-orange-100 ring-1 ring-orange-300/90 shadow-sm dark:bg-orange-500/12 dark:shadow-none dark:ring-orange-500/25" },
];

const PRESET_COUNT = WORK_ORDER_STATUS_TILE_PRESETS.length;

/**
 * @param {unknown} raw
 * @param {string[]} allowedStatuses normalized labels from workOrderStatuses
 */
export function normalizeWorkOrderStatusTileColors(raw, allowedStatuses) {
  const allowed = new Set(
    Array.isArray(allowedStatuses) ? allowedStatuses.map((s) => String(s ?? "").trim()).filter(Boolean) : []
  );
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const status = String(k ?? "")
      .trim()
      .slice(0, 80);
    if (!status || !allowed.has(status)) continue;
    const n = parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n) || n < 0 || n >= PRESET_COUNT) continue;
    out[status] = String(n);
    if (Object.keys(out).length >= 25) break;
  }
  return out;
}

/**
 * @param {string} status
 * @param {number} columnIndex index in full columns list (fallback rotation)
 * @param {Record<string, string>} tileColorsMap status label → preset index string
 */
/** Tile header/badge classes from a saved preset index string (or auto by column index). */
export function resolveTilePresetClass(tileColor, fallbackColumnIndex = 0) {
  const presetRaw = tileColor;
  if (presetRaw !== undefined && presetRaw !== null && String(presetRaw).trim() !== "") {
    const n = parseInt(String(presetRaw).trim(), 10);
    if (Number.isFinite(n) && n >= 0 && n < PRESET_COUNT) {
      return WORK_ORDER_STATUS_TILE_PRESETS[n].className;
    }
  }
  const i = typeof fallbackColumnIndex === "number" && fallbackColumnIndex >= 0 ? fallbackColumnIndex : 0;
  return WORK_ORDER_STATUS_TILE_PRESETS[i % PRESET_COUNT].className;
}

export function resolveWorkOrderStatusTileClass(status, columnIndex, tileColorsMap) {
  return resolveTilePresetClass(tileColorsMap?.[status], columnIndex);
}

/** @param {unknown} bodyVal */
export function sanitizeWorkOrderStatusTileColorsPatch(bodyVal) {
  const obj = bodyVal && typeof bodyVal === "object" && !Array.isArray(bodyVal) ? bodyVal : {};
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const status = String(k ?? "")
      .trim()
      .slice(0, 80);
    if (!status) continue;
    const n = parseInt(String(v ?? "").trim(), 10);
    if (!Number.isFinite(n) || n < 0 || n >= PRESET_COUNT) continue;
    out[status] = String(n);
    if (Object.keys(out).length >= 25) break;
  }
  return out;
}
