/**
 * Controlled dropdown catalog (Settings → Dropdowns), patterned after ornament-manufacturing admin/dropdowns.
 * Stored under UserSettings.settings.controlledDropdowns.
 */

import { DEFAULT_WORK_ORDER_STATUSES } from "@/lib/work-order-fields";
import { tileFieldsFromEntry, serializeTileColorForMap } from "@/lib/work-order-status-tiles";

/** Default quote statuses when Settings → Dropdowns has never been configured (legacy). */
export const QUOTE_STATUS_VALUES = ["draft", "sent", "approved", "rejected", "rnr"];

const DEFAULT_QUOTE_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  rnr: "RNR (Return No Repair)",
};

const MAX_QUOTE_STATUS_OPTIONS = 25;
const MAX_INVOICE_STATUS_OPTIONS = 25;

/** Default invoice statuses when Settings → Dropdowns has never been configured. */
export const DEFAULT_INVOICE_STATUS_VALUES = ["draft", "sent", "partial_paid", "fully_paid"];

const DEFAULT_INVOICE_LABELS = {
  draft: "Draft",
  sent: "Sent",
  partial_paid: "Partial Paid",
  fully_paid: "Fully Paid",
};

export const DROPDOWN_DEFINITIONS = {
  quote_status: {
    key: "quote_status",
    label: "Quote status",
  },
  work_order_status: {
    key: "work_order_status",
    label: "Work order status",
  },
  invoice_status: {
    key: "invoice_status",
    label: "Invoice status",
  },
};

function clampDropdownLabel(raw) {
  return String(raw ?? "").slice(0, 120);
}

function normalizeShowOnShopFloor(raw) {
  if (raw === false || raw === "false" || raw === 0) return false;
  return true;
}

/**
 * @param {{ value: string, label?: string, tileColor?: string, showOnShopFloor?: boolean }} entry
 * @param {{ boardLowerSet?: Set<string>, canonCount?: number, tiles?: Record<string, string> }} [ctx]
 */
function normalizeWoEntry(entry, ctx = {}) {
  const value = String(entry?.value ?? "")
    .trim()
    .slice(0, 80);
  if (!value) return null;
  const boardLowerSet = ctx.boardLowerSet;
  const canonCount = ctx.canonCount ?? 0;
  let showOnShopFloor = true;
  if (entry && Object.prototype.hasOwnProperty.call(entry, "showOnShopFloor")) {
    showOnShopFloor = normalizeShowOnShopFloor(entry.showOnShopFloor);
  } else if (boardLowerSet && boardLowerSet.size > 0 && canonCount > 0 && boardLowerSet.size < canonCount) {
    showOnShopFloor = boardLowerSet.has(value.toLowerCase());
  }
  const tiles = ctx.tiles && typeof ctx.tiles === "object" ? ctx.tiles : {};
  const legacyTile = tiles[value];
  const tile = tileFieldsFromEntry(entry, legacyTile);
  return {
    value,
    label: clampDropdownLabel(entry?.label),
    tileBgColor: tile.tileBgColor,
    tileTextColor: tile.tileTextColor,
    tileColor: tile.tileColor,
    showOnShopFloor,
  };
}

function normalizeQuoteEntries(rawEntries) {
  const quoteCtx = { tiles: {} };
  let list = Array.isArray(rawEntries)
    ? rawEntries.map((e) => normalizeWoEntry(e, quoteCtx)).filter(Boolean)
    : [];

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
      tileBgColor: "",
      tileTextColor: "",
      tileColor: "",
    }));
  }
  return uniq;
}

function normalizeInvoiceEntries(rawEntries) {
  const invCtx = { tiles: {} };
  let list = Array.isArray(rawEntries)
    ? rawEntries.map((e) => normalizeWoEntry(e, invCtx)).filter(Boolean)
    : [];

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
        DEFAULT_INVOICE_LABELS[valueLower] ||
        valueLower,
    });
    if (uniq.length >= MAX_INVOICE_STATUS_OPTIONS) break;
  }

  if (!uniq.length) {
    return DEFAULT_INVOICE_STATUS_VALUES.map((value) => ({
      value,
      label: DEFAULT_INVOICE_LABELS[value] || value,
      tileBgColor: "",
      tileTextColor: "",
      tileColor: "",
    }));
  }
  return uniq;
}

function normalizeWoEntries(rawEntries, legacyStatuses, legacyTiles, legacyBoardOrder) {
  const tiles =
    legacyTiles && typeof legacyTiles === "object" && !Array.isArray(legacyTiles) ? legacyTiles : {};
  const boardArr = Array.isArray(legacyBoardOrder) ? legacyBoardOrder : [];
  const boardLowerSet = new Set(
    boardArr.map((b) => String(b ?? "").trim().toLowerCase()).filter(Boolean)
  );
  const legacyList = Array.isArray(legacyStatuses) ? legacyStatuses : [];
  const woCtx = { boardLowerSet, canonCount: legacyList.length, tiles };

  let list = Array.isArray(rawEntries)
    ? rawEntries.map((e) => normalizeWoEntry(e, woCtx)).filter(Boolean)
    : [];

  if (!list.length && legacyList.length) {
    list = legacyList
      .map((v) => {
        const value = String(v ?? "").trim().slice(0, 80);
        if (!value) return null;
        const tile = tileFieldsFromEntry({ value }, tiles[value]);
        return {
          value,
          label: "",
          ...tile,
          showOnShopFloor:
            !boardLowerSet.size || boardLowerSet.size >= legacyList.length
              ? true
              : boardLowerSet.has(value.toLowerCase()),
        };
      })
      .filter(Boolean);
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
      tileBgColor: "",
      tileTextColor: "",
      tileColor: "",
      showOnShopFloor: true,
    }));
  }
  return uniq;
}

/**
 * @param {unknown} raw
 * @param {string[]} legacyWoStatuses
 * @param {Record<string, string>} legacyWoTiles
 */
export function normalizeControlledDropdowns(raw, legacyWoStatuses, legacyWoTiles, legacyBoardOrder) {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const quoteRaw = obj.quote_status && typeof obj.quote_status === "object" ? obj.quote_status : {};
  const woRaw = obj.work_order_status && typeof obj.work_order_status === "object" ? obj.work_order_status : {};
  const invRaw = obj.invoice_status && typeof obj.invoice_status === "object" ? obj.invoice_status : {};

  return {
    quote_status: {
      entries: normalizeQuoteEntries(quoteRaw.entries),
    },
    work_order_status: {
      entries: normalizeWoEntries(woRaw.entries, legacyWoStatuses, legacyWoTiles, legacyBoardOrder),
    },
    invoice_status: {
      entries: normalizeInvoiceEntries(invRaw.entries),
    },
  };
}

export function deriveWorkOrderFieldsFromControlledEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const statuses = list.map((e) => e.value).filter(Boolean).slice(0, 25);
  /** @type {Record<string, string>} */
  const tileColors = {};
  for (const e of list) {
    if (!e.value) continue;
    const serialized = serializeTileColorForMap(e);
    if (serialized) tileColors[e.value] = serialized;
  }
  return {
    statuses,
    tileColors,
    shopFloorBoardOrder: deriveShopFloorBoardOrderFromEntries(list, statuses),
  };
}

/** Statuses to show as columns on the shop floor job board (dropdown row order). */
export function deriveShopFloorBoardOrderFromEntries(entries, fallbackStatuses) {
  const list = Array.isArray(entries) ? entries : [];
  const allValues = list.map((e) => e.value).filter(Boolean);
  const shown = list.filter((e) => e.value && e.showOnShopFloor !== false).map((e) => e.value);
  if (shown.length) return shown.slice(0, 25);
  if (allValues.length) return allValues.slice(0, 25);
  const fb = Array.isArray(fallbackStatuses)
    ? fallbackStatuses.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  return fb.length ? fb.slice(0, 25) : [...DEFAULT_WORK_ORDER_STATUSES];
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
  const entry = idx >= 0 ? list[idx] : null;
  return {
    tileColor: entry?.tileColor ?? "",
    tileBgColor: entry?.tileBgColor ?? "",
    tileTextColor: entry?.tileTextColor ?? "",
    index: idx >= 0 ? idx : fallbackIndex,
  };
}

/** Allowed invoice status slugs (lowercase) from merged settings. */
export function invoiceStatusAllowedSlugs(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.invoice_status?.entries;
  const list = Array.isArray(entries) && entries.length ? entries : normalizeInvoiceEntries([]);
  return list.map((e) => String(e.value ?? "").trim().toLowerCase()).filter(Boolean);
}

export function invoiceStatusSelectOptionsFromMerged(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.invoice_status?.entries;
  const list = Array.isArray(entries) && entries.length ? entries : normalizeInvoiceEntries([]);
  return list.map((e) => {
    const value = String(e.value ?? "").trim().toLowerCase();
    return {
      value,
      label: clampDropdownLabel(e.label) || DEFAULT_INVOICE_LABELS[value] || value,
    };
  });
}

export function invoiceStatusEntryForSlug(mergedSettings, slug) {
  const v = String(slug ?? "").trim().toLowerCase();
  const entries = mergedSettings?.controlledDropdowns?.invoice_status?.entries;
  const list = Array.isArray(entries) && entries.length ? entries : normalizeInvoiceEntries([]);
  return list.find((e) => String(e.value ?? "").trim().toLowerCase() === v) || null;
}

/**
 * @param {unknown} mergedSettings
 * @param {string} value slug
 * @param {number} [fallbackIndex]
 */
export function invoiceStatusTileColorForValue(mergedSettings, value, fallbackIndex = 0) {
  const entries = mergedSettings?.controlledDropdowns?.invoice_status?.entries;
  const list = Array.isArray(entries) && entries.length ? entries : normalizeInvoiceEntries([]);
  const v = String(value ?? "").toLowerCase().trim();
  const idx = list.findIndex((e) => String(e.value ?? "").toLowerCase().trim() === v);
  const entry = idx >= 0 ? list[idx] : null;
  return {
    tileColor: entry?.tileColor ?? "",
    tileBgColor: entry?.tileBgColor ?? "",
    tileTextColor: entry?.tileTextColor ?? "",
    index: idx >= 0 ? idx : fallbackIndex,
  };
}

/** @param {unknown} bodyVal */
export function sanitizeControlledDropdownsPatch(
  bodyVal,
  legacyWoStatuses,
  legacyWoTiles,
  legacyBoardOrder
) {
  return normalizeControlledDropdowns(bodyVal, legacyWoStatuses, legacyWoTiles, legacyBoardOrder);
}
