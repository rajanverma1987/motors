/**
 * Controlled dropdown catalog (Settings → Dropdowns), patterned after ornament-manufacturing admin/dropdowns.
 * Stored under UserSettings.settings.controlledDropdowns.
 */

import { DEFAULT_WORK_ORDER_STATUSES } from "@/lib/work-order-fields";
import { WORK_ORDER_STATUS_TILE_PRESETS } from "@/lib/work-order-status-tiles";

/** Default quote statuses when Settings → Dropdowns has never been configured (legacy). */
export const QUOTE_STATUS_VALUES = ["draft", "sent", "approved", "rejected", "rnr"];

const PRESET_COUNT = WORK_ORDER_STATUS_TILE_PRESETS.length;

const DEFAULT_QUOTE_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  rnr: "RNR (Return No Repair)",
};

const MAX_QUOTE_STATUS_OPTIONS = 25;

export const DROPDOWN_DEFINITIONS = {
  quote_status: {
    key: "quote_status",
    label: "Quote status",
  },
  work_order_status: {
    key: "work_order_status",
    label: "Work order status",
  },
};

function validTileColor(raw) {
  const n = parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n >= PRESET_COUNT) return "";
  return String(n);
}

function clampDropdownLabel(raw) {
  return String(raw ?? "").slice(0, 120);
}

/**
 * @param {{ value: string, label?: string, tileColor?: string }} entry
 */
function normalizeWoEntry(entry) {
  const value = String(entry?.value ?? "")
    .trim()
    .slice(0, 80);
  if (!value) return null;
  return {
    value,
    label: clampDropdownLabel(entry?.label),
    tileColor: validTileColor(entry?.tileColor),
  };
}

function normalizeQuoteEntries(rawEntries) {
  let list = Array.isArray(rawEntries) ? rawEntries.map(normalizeWoEntry).filter(Boolean) : [];

  const seen = new Set();
  const uniq = [];
  for (const row of list) {
    const valueLower = row.value.toLowerCase();
    if (seen.has(valueLower)) continue;
    seen.add(valueLower);
    uniq.push({
      ...row,
      value: valueLower,
      label:
        clampDropdownLabel(row.label) ||
        DEFAULT_QUOTE_LABELS[valueLower] ||
        valueLower,
    });
    if (uniq.length >= MAX_QUOTE_STATUS_OPTIONS) break;
  }

  if (!uniq.length) {
    return QUOTE_STATUS_VALUES.map((value) => ({
      value,
      label: DEFAULT_QUOTE_LABELS[value] || value,
      tileColor: "",
    }));
  }
  return uniq;
}

function normalizeWoEntries(rawEntries, legacyStatuses, legacyTiles) {
  const tiles =
    legacyTiles && typeof legacyTiles === "object" && !Array.isArray(legacyTiles) ? legacyTiles : {};
  let list = Array.isArray(rawEntries) ? rawEntries.map(normalizeWoEntry).filter(Boolean) : [];

  if (!list.length && Array.isArray(legacyStatuses) && legacyStatuses.length) {
    list = legacyStatuses.map((v) => ({
      value: String(v ?? "").trim().slice(0, 80),
      label: "",
      tileColor: validTileColor(tiles[String(v ?? "").trim()]),
    })).filter((r) => r.value);
  }

  const seen = new Set();
  const uniq = [];
  for (const row of list) {
    const k = row.value.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(row);
    if (uniq.length >= 25) break;
  }

  if (!uniq.length) {
    return DEFAULT_WORK_ORDER_STATUSES.map((value) => ({
      value,
      label: "",
      tileColor: "",
    }));
  }
  return uniq;
}

/**
 * @param {unknown} raw
 * @param {string[]} legacyWoStatuses
 * @param {Record<string, string>} legacyWoTiles
 */
export function normalizeControlledDropdowns(raw, legacyWoStatuses, legacyWoTiles) {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const quoteRaw = obj.quote_status && typeof obj.quote_status === "object" ? obj.quote_status : {};
  const woRaw = obj.work_order_status && typeof obj.work_order_status === "object" ? obj.work_order_status : {};

  return {
    quote_status: {
      entries: normalizeQuoteEntries(quoteRaw.entries),
    },
    work_order_status: {
      entries: normalizeWoEntries(woRaw.entries, legacyWoStatuses, legacyWoTiles),
    },
  };
}

export function deriveWorkOrderFieldsFromControlledEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const statuses = list.map((e) => e.value).filter(Boolean).slice(0, 25);
  /** @type {Record<string, string>} */
  const tileColors = {};
  for (const e of list) {
    if (e.value && e.tileColor) tileColors[e.value] = String(e.tileColor);
  }
  return { statuses, tileColors };
}

/**
 * @param {unknown} mergedSettings mergeUserSettings output or draft
 */
export function quoteStatusSelectOptionsFromMerged(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.quote_status?.entries;
  const list = Array.isArray(entries) ? entries : normalizeQuoteEntries([]);
  return list.map((e) => ({
    value: e.value,
    label: e.label || e.value,
  }));
}

/**
 * @param {unknown} mergedSettings
 * @param {string} value slug
 * @param {number} [fallbackIndex]
 */
export function quoteStatusTileColorForValue(mergedSettings, value, fallbackIndex = 0) {
  const entries = mergedSettings?.controlledDropdowns?.quote_status?.entries;
  const list = Array.isArray(entries) ? entries : normalizeQuoteEntries([]);
  const v = String(value ?? "").toLowerCase().trim();
  const idx = list.findIndex((e) => String(e.value ?? "").toLowerCase().trim() === v);
  const tile = idx >= 0 ? list[idx].tileColor : "";
  return { tileColor: tile, index: idx >= 0 ? idx : fallbackIndex };
}

/** @param {unknown} bodyVal */
export function sanitizeControlledDropdownsPatch(bodyVal, legacyWoStatuses, legacyWoTiles) {
  return normalizeControlledDropdowns(bodyVal, legacyWoStatuses, legacyWoTiles);
}
