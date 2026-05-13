import {
  invoiceStatusAllowedSlugs,
  invoiceStatusEntryForSlug,
  invoiceStatusSelectOptionsFromMerged,
} from "@/lib/dropdown-catalog";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveTilePresetClass } from "@/lib/work-order-status-tiles";

/** @param {unknown} merged */
function resolvedMerged(merged) {
  return merged && typeof merged === "object" && !Array.isArray(merged) ? merged : mergeUserSettings({});
}

/** Options for selects (defaults when settings never saved). */
export const INVOICE_STATUS_OPTIONS = invoiceStatusSelectOptionsFromMerged(mergeUserSettings({}));

const LEGACY_MAP = {
  draft: "draft",
  sent: "sent",
  partial_paid: "partial_paid",
  fully_paid: "fully_paid",
  partialpaid: "partial_paid",
  fullypaid: "fully_paid",
  "partial paid": "partial_paid",
  "fully paid": "fully_paid",
};

const TILE_BADGE_VARIANTS = ["default", "primary", "success", "warning", "danger"];

/**
 * Normalize stored / submitted status to an allowed slug for this shop.
 * @param {unknown} raw
 * @param {unknown} [mergedSettings] mergeUserSettings output; when omitted, uses defaults only.
 */
export function normalizeInvoiceStatusSlug(raw, mergedSettings) {
  const merged = resolvedMerged(mergedSettings);
  const allowed = invoiceStatusAllowedSlugs(merged);
  const allowedSet = new Set(allowed);
  if (!allowed.length) return "draft";

  const rawStr = String(raw ?? "").trim();
  const rawNorm = rawStr.toLowerCase().replace(/\s+/g, "_");
  const fromLegacy = LEGACY_MAP[rawNorm] || LEGACY_MAP[rawStr.toLowerCase()];
  const candidate = fromLegacy || rawNorm;
  if (allowedSet.has(candidate)) return candidate;
  if (allowedSet.has(rawNorm)) return rawNorm;
  for (const a of allowed) {
    if (a.toLowerCase() === rawNorm) return a;
  }
  return allowed[0];
}

export function invoiceStatusLabel(slug, mergedSettings) {
  const merged = resolvedMerged(mergedSettings);
  const entry = invoiceStatusEntryForSlug(merged, slug);
  if (entry?.label) return String(entry.label).trim();
  const s = normalizeInvoiceStatusSlug(slug, merged);
  const opts = invoiceStatusSelectOptionsFromMerged(merged);
  const opt = opts.find((o) => o.value === s);
  return (opt?.label ?? s) || "Draft";
}

export function invoiceStatusBadgeVariant(slug, mergedSettings) {
  const merged = resolvedMerged(mergedSettings);
  const s = normalizeInvoiceStatusSlug(slug, merged);
  const entry = invoiceStatusEntryForSlug(merged, s);
  const tid = parseInt(String(entry?.tileColor ?? "").trim(), 10);
  if (Number.isFinite(tid) && tid >= 0) {
    return TILE_BADGE_VARIANTS[tid % TILE_BADGE_VARIANTS.length];
  }
  if (s.includes("fully") && s.includes("paid")) return "success";
  if (s.includes("partial") && s.includes("paid")) return "warning";
  if (s === "sent") return "primary";
  return "default";
}

/**
 * Tailwind classes for the colored status pill (same tile presets as Settings → Dropdowns).
 * @param {unknown} slug
 * @param {unknown} [mergedSettings]
 */
export function invoiceStatusPillClassName(slug, mergedSettings) {
  const merged = resolvedMerged(mergedSettings);
  const s = normalizeInvoiceStatusSlug(slug, merged);
  const entry = invoiceStatusEntryForSlug(merged, s);
  const opts = invoiceStatusSelectOptionsFromMerged(merged);
  const idx = opts.findIndex((o) => o.value === s);
  const fallbackIdx = idx >= 0 ? idx : 0;
  return resolveTilePresetClass(entry?.tileColor, fallbackIdx);
}
