/**
 * Controlled dropdown catalog (Settings → Dropdowns), patterned after ornament-manufacturing admin/dropdowns.
 * Stored under UserSettings.settings.controlledDropdowns.
 */

import { DEFAULT_WORK_ORDER_STATUSES } from "@/lib/work-order-fields";
import {
  normalizeHexColor,
  tileFieldsFromEntry,
  serializeTileColorForMap,
} from "@/lib/work-order-status-tiles";

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

function parseSortOrder(raw, fallbackIndex) {
  const n = Number(raw);
  if (Number.isFinite(n)) return Math.trunc(n);
  return fallbackIndex * 10;
}

function resolveFilterGroup(rawFilterGroup, label, value) {
  const fromField = clampDropdownLabel(rawFilterGroup);
  if (fromField) return fromField;
  const fromLabel = clampDropdownLabel(label);
  if (fromLabel) return fromLabel;
  return String(value || "").trim().slice(0, 120);
}

/** Case-insensitive key for matching Filter Group names. */
export function filterGroupKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function normalizeQuoteEntries(rawEntries) {
  const quoteCtx = { tiles: {} };
  const rawList = Array.isArray(rawEntries) ? rawEntries : [];
  const pairs = [];
  for (const raw of rawList) {
    const row = normalizeWoEntry(raw, quoteCtx);
    if (row) pairs.push({ row, raw });
  }

  const seen = new Set();
  const uniq = [];
  for (const { row, raw } of pairs) {
    const valueLower = row.value.toLowerCase();
    if (seen.has(valueLower)) continue;
    seen.add(valueLower);
    const label =
      clampDropdownLabel(row.label) ||
      DEFAULT_QUOTE_LABELS[valueLower] ||
      valueLower;
    const sortOrder = parseSortOrder(raw?.sortOrder, uniq.length);
    const filterGroup = resolveFilterGroup(raw?.filterGroup, label, valueLower);
    uniq.push({
      ...row,
      value: valueLower,
      label,
      filterGroup,
      sortOrder,
      filterGroupBgColor: normalizeHexColor(raw?.filterGroupBgColor) || "",
      filterGroupTextColor: normalizeHexColor(raw?.filterGroupTextColor) || "",
    });
    if (uniq.length >= MAX_QUOTE_STATUS_OPTIONS) break;
  }

  if (!uniq.length) {
    return QUOTE_STATUS_VALUES.map((value, index) => {
      const label = DEFAULT_QUOTE_LABELS[value] || value;
      return {
        value,
        label,
        filterGroup: label,
        sortOrder: index * 10,
        filterGroupBgColor: "",
        filterGroupTextColor: "",
        tileBgColor: "",
        tileTextColor: "",
        tileColor: "",
      };
    });
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
 * Resolve a status slug or display label (from CSV / legacy data) to the configured
 * quote or invoice option value used by Simple lists and filters.
 */
export function resolveConfiguredStatusSlug(raw, mergedSettings) {
  const t = String(raw ?? "").trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  const bare = lower.replace(/^invoice:/, "");
  const quoteOpts = quoteStatusSelectOptionsFromMerged(mergedSettings);
  const invOpts = invoiceStatusSelectOptionsFromMerged(mergedSettings);

  const quoteByValue = quoteOpts.find((o) => String(o.value).toLowerCase() === bare);
  if (quoteByValue) return quoteByValue.value;

  const invByValue = invOpts.find((o) => String(o.value).toLowerCase() === bare);
  if (invByValue) {
    const alsoQuote = quoteOpts.some((o) => String(o.value).toLowerCase() === bare);
    if (lower.startsWith("invoice:") || !alsoQuote) return `invoice:${invByValue.value}`;
    return invByValue.value;
  }

  const quoteByLabel = quoteOpts.find((o) => String(o.label || "").toLowerCase() === lower);
  if (quoteByLabel) return quoteByLabel.value;

  const invByLabel = invOpts.find((o) => String(o.label || "").toLowerCase() === lower);
  if (invByLabel) {
    const alsoQuote = quoteOpts.some(
      (o) => String(o.value).toLowerCase() === String(invByLabel.value).toLowerCase()
    );
    return alsoQuote ? invByLabel.value : `invoice:${invByLabel.value}`;
  }

  return t;
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

/** Filter card key for a Filter Group (`fg:<normalized>`). */
export function quoteStatusFilterGroupCardKey(groupLabel) {
  return `fg:${filterGroupKey(groupLabel)}`;
}

export function isQuoteStatusFilterGroupKey(key) {
  return String(key || "")
    .trim()
    .toLowerCase()
    .startsWith("fg:");
}

/**
 * One summary-card spec per distinct Filter Group (combined member statuses).
 * Card label/order come from the member with lowest sortOrder (entries order as tiebreak).
 * Card colors use Filter Group colors (shared); fall back to that top member's status tile colors.
 */
export function buildQuoteStatusFilterCardSpecs(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.quote_status?.entries;
  const list = Array.isArray(entries) ? entries : normalizeQuoteEntries([]);

  /** @type {Map<string, { members: typeof list, top: (typeof list)[number], topIndex: number }>} */
  const groups = new Map();
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    const gk = filterGroupKey(e.filterGroup || e.label || e.value);
    if (!gk) continue;
    let g = groups.get(gk);
    if (!g) {
      g = { members: [], top: e, topIndex: i };
      groups.set(gk, g);
    }
    g.members.push(e);
    const eOrder = Number.isFinite(Number(e.sortOrder)) ? Number(e.sortOrder) : i * 10;
    const topOrder = Number.isFinite(Number(g.top.sortOrder))
      ? Number(g.top.sortOrder)
      : g.topIndex * 10;
    if (eOrder < topOrder || (eOrder === topOrder && i < g.topIndex)) {
      g.top = e;
      g.topIndex = i;
    }
  }

  const specs = [...groups.entries()].map(([gk, g]) => {
    const sortOrder = Number.isFinite(Number(g.top.sortOrder))
      ? Number(g.top.sortOrder)
      : g.topIndex * 10;
    const colorSource =
      g.members.find(
        (m) =>
          normalizeHexColor(m.filterGroupBgColor) || normalizeHexColor(m.filterGroupTextColor)
      ) || g.top;
    const filterGroupBgColor = normalizeHexColor(colorSource.filterGroupBgColor) || "";
    const filterGroupTextColor = normalizeHexColor(colorSource.filterGroupTextColor) || "";
    return {
      key: `fg:${gk}`,
      label: String(g.top.filterGroup || g.top.label || g.top.value || "").trim() || gk,
      memberValues: g.members.map((m) => String(m.value ?? "").trim().toLowerCase()).filter(Boolean),
      sortOrder,
      tileValue: String(g.top.value ?? "").trim().toLowerCase(),
      topIndex: g.topIndex,
      filterGroupBgColor,
      filterGroupTextColor,
    };
  });

  specs.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a.label).localeCompare(String(b.label), undefined, { sensitivity: "base" });
  });
  return specs;
}

/** Numeric order for Proposal Status column sort; unknown statuses sort last. */
export function quoteStatusSortOrderForValue(mergedSettings, value) {
  const entries = mergedSettings?.controlledDropdowns?.quote_status?.entries;
  const list = Array.isArray(entries) ? entries : normalizeQuoteEntries([]);
  const v = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^invoice:/, "");
  const idx = list.findIndex((e) => String(e.value ?? "").toLowerCase().trim() === v);
  if (idx < 0) return Number.MAX_SAFE_INTEGER;
  const order = Number(list[idx].sortOrder);
  return Number.isFinite(order) ? order : idx * 10;
}

/**
 * Whether a row status matches a filter key (exact slug, invoice: slug, or fg: filter group).
 */
export function quoteStatusMatchesFilter(rowStatus, filterKey, mergedSettings) {
  const s = String(rowStatus || "")
    .trim()
    .toLowerCase();
  const f = String(filterKey || "")
    .trim()
    .toLowerCase();
  if (!f) return true;
  if (isQuoteStatusFilterGroupKey(f)) {
    const specs = buildQuoteStatusFilterCardSpecs(mergedSettings);
    const spec = specs.find((c) => c.key === f);
    if (!spec) return false;
    const bare = s.replace(/^invoice:/, "");
    return spec.memberValues.includes(bare) || spec.memberValues.includes(s);
  }
  if (s === f) return true;
  const sBare = s.replace(/^invoice:/, "");
  const fBare = f.replace(/^invoice:/, "");
  if (f.startsWith("invoice:") || s.startsWith("invoice:")) {
    return sBare === fBare;
  }
  return false;
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

/** Quote + invoice status options for Simple portal / commission summary. */
export function buildCombinedQuoteInvoiceStatusOptions(mergedSettings) {
  const quoteOpts = quoteStatusSelectOptionsFromMerged(mergedSettings);
  const invoiceOpts = invoiceStatusSelectOptionsFromMerged(mergedSettings);
  const quoteValues = new Set(quoteOpts.map((o) => String(o.value || "").trim().toLowerCase()).filter(Boolean));
  const out = quoteOpts.map((o) => ({
    value: String(o.value || "").trim(),
    label: o.label || o.value,
  }));
  for (const opt of invoiceOpts) {
    const value = String(opt.value || "").trim().toLowerCase();
    if (!value) continue;
    if (quoteValues.has(value)) {
      out.push({
        value: `invoice:${value}`,
        label: `${opt.label || value} (Invoice)`,
      });
    } else {
      out.push({
        value,
        label: opt.label || value,
      });
    }
  }
  return out;
}

/** Human-readable label for a stored quote/invoice status slug. */
export function resolveQuoteInvoiceStatusDisplayLabel(rawValue, mergedSettings) {
  const raw = String(rawValue || "").trim();
  if (!raw || raw === "—") return "—";
  const opts = buildCombinedQuoteInvoiceStatusOptions(mergedSettings);
  const lower = raw.toLowerCase();
  const hit = opts.find((o) => String(o.value).toLowerCase() === lower);
  if (hit) return hit.label;
  return raw.replace(/^invoice:/i, "").replace(/_/g, " ");
}

export function workOrderStatusSelectOptionsFromMerged(mergedSettings) {
  const entries = mergedSettings?.controlledDropdowns?.work_order_status?.entries;
  if (Array.isArray(entries) && entries.length) {
    return entries
      .map((e) => {
        const value = String(e.value ?? "").trim();
        if (!value) return null;
        return { value, label: clampDropdownLabel(e.label) || value };
      })
      .filter(Boolean);
  }
  const list = Array.isArray(mergedSettings?.workOrderStatuses) ? mergedSettings.workOrderStatuses : [];
  return list
    .map((s) => {
      const value = String(s ?? "").trim();
      if (!value) return null;
      return { value, label: value };
    })
    .filter(Boolean);
}

export function resolveWorkOrderStatusDisplayLabel(rawValue, mergedSettings) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "—";
  const opts = workOrderStatusSelectOptionsFromMerged(mergedSettings);
  const hit = opts.find((o) => String(o.value).toLowerCase() === raw.toLowerCase());
  return hit?.label || raw;
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
