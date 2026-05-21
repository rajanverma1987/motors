/**
 * Shop floor / status tile colors: custom hex (background + text) or legacy preset indices.
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

/** Default light-mode hex pairs for legacy preset indices (Settings migration). */
export const TILE_PRESET_HEX_COLORS = [
  { bg: "#e0f2fe", text: "#075985" },
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#d1fae5", text: "#065f46" },
  { bg: "#ffe4e6", text: "#9f1239" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#cffafe", text: "#155e75" },
  { bg: "#fae8ff", text: "#86198f" },
  { bg: "#ecfccb", text: "#3f6212" },
  { bg: "#ccfbf1", text: "#115e59" },
  { bg: "#e0e7ff", text: "#3730a3" },
  { bg: "#ffedd5", text: "#9a3412" },
  { bg: "#fce7f3", text: "#9d174d" },
  { bg: "#dbeafe", text: "#1e40af" },
  { bg: "#dcfce7", text: "#166534" },
  { bg: "#fee2e2", text: "#991b1b" },
  { bg: "#f3e8ff", text: "#6b21a8" },
  { bg: "#fef9c3", text: "#854d0e" },
  { bg: "#e7e5e4", text: "#44403c" },
  { bg: "#e2e8f0", text: "#334155" },
  { bg: "#ffe4e6", text: "#9f1239" },
  { bg: "#e0f2fe", text: "#075985" },
  { bg: "#ccfbf1", text: "#115e59" },
  { bg: "#f3e8ff", text: "#6b21a8" },
  { bg: "#ffedd5", text: "#9a3412" },
];

const PRESET_COUNT = WORK_ORDER_STATUS_TILE_PRESETS.length;

const CUSTOM_TILE_RING =
  "ring-1 ring-inset border border-border/70 shadow-sm dark:ring-white/15";

/** @param {unknown} raw */
export function normalizeHexColor(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const h = s.slice(1);
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  const m = s.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (m) {
    const hex = (n) => Math.min(255, Math.max(0, parseInt(n, 10))).toString(16).padStart(2, "0");
    return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
  }
  return "";
}

/** @param {number} index */
export function presetIndexToHexColors(index) {
  const i =
    typeof index === "number" && index >= 0 ? index % TILE_PRESET_HEX_COLORS.length : 0;
  const p = TILE_PRESET_HEX_COLORS[i] || TILE_PRESET_HEX_COLORS[0];
  return { bg: p.bg, text: p.text };
}

/**
 * Parse stored tile color: preset index string, JSON `{bg,text}`, or object.
 * @returns {{ bg?: string, text?: string, presetIndex?: number }}
 */
export function parseTileColorValue(raw) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const bg = normalizeHexColor(raw.bg ?? raw.background ?? raw.tileBgColor);
    const text = normalizeHexColor(raw.text ?? raw.color ?? raw.tileTextColor);
    if (bg || text) return { bg, text };
    const n = parseInt(String(raw.preset ?? raw.tileColor ?? "").trim(), 10);
    if (Number.isFinite(n) && n >= 0 && n < PRESET_COUNT) return { presetIndex: n };
    return {};
  }
  const s = String(raw ?? "").trim();
  if (!s) return {};
  if (s.startsWith("{")) {
    try {
      return parseTileColorValue(JSON.parse(s));
    } catch {
      return {};
    }
  }
  const n = parseInt(s, 10);
  if (Number.isFinite(n) && n >= 0 && n < PRESET_COUNT) return { presetIndex: n };
  return {};
}

/** @param {{ tileBgColor?: string, tileTextColor?: string, tileColor?: string }} [entry] */
export function tileFieldsFromEntry(entry, legacyMapValue) {
  let tileBgColor = normalizeHexColor(entry?.tileBgColor);
  let tileTextColor = normalizeHexColor(entry?.tileTextColor);
  let tileColor = "";
  const legacyPreset = parseTileColorValue(entry?.tileColor);
  if (!tileBgColor && !tileTextColor && legacyPreset.presetIndex != null) {
    const hex = presetIndexToHexColors(legacyPreset.presetIndex);
    tileBgColor = hex.bg;
    tileTextColor = hex.text;
  }
  if (!tileBgColor && !tileTextColor && legacyMapValue) {
    const fromMap = parseTileColorValue(legacyMapValue);
    if (fromMap.bg || fromMap.text) {
      tileBgColor = fromMap.bg || "";
      tileTextColor = fromMap.text || "";
    } else if (fromMap.presetIndex != null) {
      const hex = presetIndexToHexColors(fromMap.presetIndex);
      tileBgColor = hex.bg;
      tileTextColor = hex.text;
    }
  }
  if (entry?.tileColor != null && String(entry.tileColor).trim() !== "" && !tileBgColor && !tileTextColor) {
    tileColor = String(parseInt(String(entry.tileColor).trim(), 10));
    if (tileColor === "NaN") tileColor = "";
  }
  return { tileBgColor, tileTextColor, tileColor };
}

/** Serialize for legacy `workOrderStatusTileColors` map values. */
export function serializeTileColorForMap(entry) {
  const bg = normalizeHexColor(entry?.tileBgColor);
  const text = normalizeHexColor(entry?.tileTextColor);
  if (bg || text) return JSON.stringify({ bg, text });
  const preset = parseTileColorValue(entry?.tileColor);
  if (preset.presetIndex != null) return String(preset.presetIndex);
  return "";
}

/**
 * @param {unknown} tileColor stored map value or entry.tileColor
 * @param {number} fallbackColumnIndex
 * @param {{ tileBgColor?: string, tileTextColor?: string, tileColor?: string }} [entry]
 */
export function resolveStatusTileProps(tileColor, fallbackColumnIndex = 0, entry) {
  let spec = tileFieldsFromEntry(entry || {}, tileColor);
  if (!spec.tileBgColor && !spec.tileTextColor) {
    const parsed = parseTileColorValue(tileColor);
    if (parsed.bg || parsed.text) {
      spec = { tileBgColor: parsed.bg || "", tileTextColor: parsed.text || "", tileColor: "" };
    } else if (parsed.presetIndex != null) {
      const hex = presetIndexToHexColors(parsed.presetIndex);
      spec = { tileBgColor: hex.bg, tileTextColor: hex.text, tileColor: "" };
    }
  }
  if (spec.tileBgColor || spec.tileTextColor) {
    /** @type {Record<string, string>} */
    const style = {};
    if (spec.tileBgColor) style.backgroundColor = spec.tileBgColor;
    if (spec.tileTextColor) style.color = spec.tileTextColor;
    return { className: `${CUSTOM_TILE_RING} tile-colors-custom`, style };
  }
  return {
    className: resolveTilePresetClass(tileColor, fallbackColumnIndex),
    style: undefined,
  };
}

/** Tile header/badge classes from a saved preset index string (or auto by column index). */
export function resolveTilePresetClass(tileColor, fallbackColumnIndex = 0) {
  const presetRaw = tileColor;
  if (presetRaw !== undefined && presetRaw !== null && String(presetRaw).trim() !== "") {
    const parsed = parseTileColorValue(presetRaw);
    if (parsed.presetIndex != null) {
      return WORK_ORDER_STATUS_TILE_PRESETS[parsed.presetIndex].className;
    }
  }
  const i = typeof fallbackColumnIndex === "number" && fallbackColumnIndex >= 0 ? fallbackColumnIndex : 0;
  return WORK_ORDER_STATUS_TILE_PRESETS[i % PRESET_COUNT].className;
}

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
    const fields = tileFieldsFromEntry({}, v);
    const serialized = serializeTileColorForMap(fields);
    if (serialized) {
      out[status] = serialized;
    } else {
      const parsed = parseTileColorValue(v);
      if (parsed.bg || parsed.text) {
        out[status] = JSON.stringify({ bg: parsed.bg, text: parsed.text });
      } else if (parsed.presetIndex != null) {
        out[status] = String(parsed.presetIndex);
      }
    }
    if (Object.keys(out).length >= 25) break;
  }
  return out;
}

/**
 * @param {string} status
 * @param {number} columnIndex index in full columns list (fallback rotation)
 * @param {Record<string, string>} tileColorsMap status label → preset index or JSON colors
 */
export function resolveWorkOrderStatusTileClass(status, columnIndex, tileColorsMap) {
  return resolveStatusTileProps(tileColorsMap?.[status], columnIndex).className;
}

export function resolveWorkOrderStatusTileProps(status, columnIndex, tileColorsMap) {
  return resolveStatusTileProps(tileColorsMap?.[status], columnIndex);
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
    const serialized = serializeTileColorForMap(tileFieldsFromEntry({}, v));
    if (serialized) {
      out[status] = serialized;
      if (Object.keys(out).length >= 25) break;
      continue;
    }
    const parsed = parseTileColorValue(v);
    if (parsed.bg || parsed.text) {
      out[status] = JSON.stringify({ bg: parsed.bg, text: parsed.text });
    } else if (parsed.presetIndex != null) {
      out[status] = String(parsed.presetIndex);
    }
    if (Object.keys(out).length >= 25) break;
  }
  return out;
}
