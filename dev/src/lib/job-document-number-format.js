import {
  applyDocumentPrefixIfAbsent,
  effectiveInvoiceNumberPrefix,
} from "@/lib/document-number-prefixes";

/** Job / RFQ / quote ID prefix from settings (e.g. CEMR-). Same field as invoice prefix. */
export function effectiveJobNumberPrefix(mergedSettings) {
  const p = effectiveInvoiceNumberPrefix(mergedSettings);
  if (!p) return "";
  return p.endsWith("-") ? p : `${p}-`;
}

/** Parse series counter from stored rfqNumber (A00001 or CEMR-A00001). */
export function parseJobSeriesCounter(rfqNumber) {
  const s = String(rfqNumber ?? "").trim();
  const m = s.match(/A(\d+)$/i);
  return m ? parseInt(m[1], 10) : 0;
}

/** Digit width of the A-series suffix (e.g. A0001 → 4, A00001 → 5). */
export function parseJobSeriesDigitWidth(rfqNumber) {
  const s = String(rfqNumber ?? "").trim();
  const m = s.match(/A(\d+)$/i);
  return m ? m[1].length : 0;
}

export function formatJobSeries(counter, digitWidth = 5) {
  const n = Math.max(1, Number(counter) || 1);
  const width = Math.max(4, Math.min(8, Number(digitWidth) || 5));
  return `A${String(n).padStart(width, "0")}`;
}

/**
 * Next job / RFQ number from an existing list of rfqNumbers (same series as Classic all-jobs).
 * Format: {prefix}A00001 (prefix from invoice/job settings, e.g. CEMR-A00001).
 * Digit pad follows existing numbers when present (A0001 → A0002); otherwise 5 digits.
 * @param {string[]} existingRfqNumbers
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 */
export function computeNextJobNumber(existingRfqNumbers, mergedSettings) {
  const prefix = effectiveJobNumberPrefix(mergedSettings);
  let maxNum = 0;
  let digitWidth = 0;
  for (const n of existingRfqNumbers || []) {
    maxNum = Math.max(maxNum, parseJobSeriesCounter(n));
    digitWidth = Math.max(digitWidth, parseJobSeriesDigitWidth(n));
  }
  const series = formatJobSeries(maxNum + 1, digitWidth || 5);
  return applyDocumentPrefixIfAbsent(prefix, series);
}
