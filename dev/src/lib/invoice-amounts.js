import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";

function invoiceTotals(inv) {
  return computeTotalsFromLaborAndParts({
    laborTotal: inv?.laborTotal,
    partsTotal: inv?.partsTotal,
    taxExempt: inv?.customerTaxExempt,
    taxPercent: inv?.customerTaxPercent,
  });
}

/** Tax amount from labor + parts (same as invoice form / print). */
export function invoiceTaxAmount(inv) {
  return invoiceTotals(inv).taxAmount ?? 0;
}

/** Numeric invoice total from labor + parts (same as UI). */
export function invoiceLineTotal(inv) {
  return invoiceTotals(inv).grandTotal;
}

/** Sum of recorded payment amounts. */
export function invoiceTotalPaid(inv) {
  const list = Array.isArray(inv?.payments) ? inv.payments : [];
  let s = 0;
  for (const pay of list) {
    const x = parseFloat(pay?.amount ?? "0");
    if (Number.isFinite(x) && x > 0) s += x;
  }
  return Math.round(s * 100) / 100;
}

export function invoiceBalance(inv) {
  const t = invoiceLineTotal(inv);
  const p = invoiceTotalPaid(inv);
  return Math.max(0, Math.round((t - p) * 100) / 100);
}

/** Days since invoice date string (YYYY-MM-DD); null if unparseable. */
export function daysOutstanding(invoiceDateStr) {
  const s = String(invoiceDateStr ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

/**
 * ISO date (YYYY-MM-DD) when the invoice reached a fully-paid status.
 * Uses the payment that closed the balance when payments exist; otherwise updatedAt or invoice date.
 * @param {object} inv
 */
export function invoiceFullyPaidDate(inv) {
  const payments = Array.isArray(inv?.payments) ? [...inv.payments] : [];
  const total = invoiceLineTotal(inv);

  if (payments.length > 0) {
    const sorted = payments.sort((a, b) => {
      const da = String(a?.paymentDate ?? "").slice(0, 10);
      const db = String(b?.paymentDate ?? "").slice(0, 10);
      if (da && db && da !== db) return da.localeCompare(db);
      const ra = a?.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const rb = b?.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return ra - rb;
    });
    let running = 0;
    for (const p of sorted) {
      const amt = parseFloat(p?.amount ?? "0");
      if (Number.isFinite(amt) && amt > 0) {
        running = Math.round((running + amt) * 100) / 100;
      }
      if (running >= total - 0.005) {
        const d = String(p?.paymentDate ?? "").trim().slice(0, 10);
        if (d) return d;
        if (p?.recordedAt) {
          const rd = new Date(p.recordedAt);
          if (!Number.isNaN(rd.getTime())) return rd.toISOString().slice(0, 10);
        }
      }
    }
    const last = sorted[sorted.length - 1];
    const lastDate = String(last?.paymentDate ?? "").trim().slice(0, 10);
    if (lastDate) return lastDate;
  }

  if (inv?.updatedAt) {
    const u = new Date(inv.updatedAt);
    if (!Number.isNaN(u.getTime())) return u.toISOString().slice(0, 10);
  }
  return String(inv?.date ?? "").trim().slice(0, 10) || "";
}

export function agingBucket(days) {
  if (days == null || days < 0) return "unknown";
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}
