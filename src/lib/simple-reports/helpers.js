import { formatDateForCurrency, toInputDateValue } from "@/lib/format-date";
import {
  parseMoneyInput,
  sumLinePrices,
  sumOtherLinePrices,
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
  computeInvoicePaymentSummary,
} from "@/lib/simple-service-proposal-form";
import {
  computePoFormTotals,
  computePoPaymentSummary,
  resolvePoStatus,
  simplePoTypeLabel,
} from "@/lib/simple-purchase-order-form";

function normalizeYmd(raw) {
  const s = String(raw ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

/**
 * @param {unknown} value — YYYY-MM-DD string, locale date string, or Date
 */
export function toYmd(value) {
  return toInputDateValue(value);
}

/**
 * @param {unknown} dayValue
 * @param {string} fromYmd
 * @param {string} toYmdRange
 */
export function dayInRange(dayValue, fromYmd, toYmdRange) {
  const from = normalizeYmd(fromYmd);
  const to = normalizeYmd(toYmdRange);
  if (!from && !to) return true;
  if (from && to && from > to) return true;
  const day = toYmd(dayValue);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/**
 * Prefer document date field, then createdAt.
 * @param {Record<string, unknown>} doc
 * @param {string[]} fieldOrder
 */
export function resolveDocDay(doc, fieldOrder = ["dateCreated", "date", "poCutDate", "createdAt"]) {
  for (const key of fieldOrder) {
    const day = toYmd(doc?.[key]);
    if (day) return day;
  }
  return "";
}

export function computeSpMoney(doc) {
  const scopeTotal = sumLinePrices(doc?.scopeDetails);
  const otherTotal = sumOtherLinePrices(doc?.otherItems);
  const showTax = doc?.customerTaxExempt === false;
  const taxPct = showTax ? parseMoneyInput(doc?.taxPercent) : 0;
  const taxAmount = showTax ? (scopeTotal * taxPct) / 100 : 0;
  const grandTotal = scopeTotal + otherTotal + taxAmount;
  return { scopeTotal, otherTotal, taxAmount, grandTotal };
}

export function computePoMoney(doc) {
  const totals = computePoFormTotals(doc?.lineItems, doc?.shippingCharge);
  const pay = computePoPaymentSummary(doc?.payments, totals.grandTotal);
  return {
    lineTotal: totals.total,
    taxAmount: totals.totalTax,
    grandTotal: totals.grandTotal,
    amountPaid: pay.amountPaid,
    unpaid: pay.balance,
    paymentStatus: pay.paymentStatus || doc?.paymentStatus || "Unpaid",
    poStatus: resolvePoStatus(doc?.lineItems),
    poTypeLabel: simplePoTypeLabel(doc),
    latestPaymentDate: pay.latestPaymentDate || "",
  };
}

/**
 * Simple invoice money + payment summary from SP `payments[]` (falls back to paid-date / status).
 * @param {Record<string, unknown>} doc
 */
export function computeSpInvoiceMoney(doc) {
  const money = computeSpMoney(doc);
  const pay = computeInvoicePaymentSummary(doc?.payments, money.grandTotal);
  const legacyPaid = Boolean(toYmd(doc?.invoicePaidDate)) || /paid/i.test(String(doc?.status || ""));
  const hasPaymentRows = Array.isArray(doc?.payments) && doc.payments.length > 0;
  let amountPaid = pay.amountPaid;
  let unpaid = pay.balance;
  let paymentStatus = pay.paymentStatus;
  let latestPaymentDate = pay.latestPaymentDate || toYmd(doc?.invoicePaidDate) || "";

  if (!hasPaymentRows && legacyPaid && money.grandTotal > 0) {
    amountPaid = money.grandTotal;
    unpaid = 0;
    paymentStatus = "Paid";
  }

  return {
    ...money,
    amountPaid,
    unpaid,
    paymentStatus,
    latestPaymentDate,
    isPaid: paymentStatus === "Paid" || (unpaid <= 0 && amountPaid > 0),
    isUnpaid: amountPaid <= 0,
    isPartial: paymentStatus === "Partial Paid",
  };
}

export function isInvoiceSp(doc) {
  return String(doc?.recordType || "").toUpperCase() === RECORD_TYPE_INVOICE;
}

export function isPipelineSp(doc) {
  const t = String(doc?.recordType || RECORD_TYPE_RFQ).toUpperCase();
  return t === RECORD_TYPE_RFQ || t === RECORD_TYPE_JOB;
}

export function moneyCell(n) {
  const value = Number.isFinite(n) ? n : 0;
  return Math.round(value * 100) / 100;
}

export function boolLabel(v) {
  return v ? "Yes" : "No";
}

/**
 * Excel cell date in the shop’s country format (from settings currency).
 * Empty values stay blank (not "—").
 * @param {unknown} value
 * @param {string} [currencyCode]
 */
export function formatReportDate(value, currencyCode) {
  if (value == null || value === "") return "";
  const formatted = formatDateForCurrency(value, currencyCode || "USD");
  return formatted === "—" ? "" : formatted;
}

/** Rough bucket for SP doc status filter (open vs closed). */
export function matchPipelineStatusBucket(status, bucket) {
  const key = String(bucket || "").trim().toLowerCase();
  if (!key) return true;
  const s = String(status || "").trim().toLowerCase();
  const closed =
    /\b(closed|accepted|lost|rejected|cancelled|canceled|void|won|complete|completed|declined)\b/.test(
      s
    );
  if (key === "closed") return closed;
  if (key === "open") return !closed;
  return true;
}

/**
 * Days past due relative to today (local calendar). Negative / zero → current.
 * @param {unknown} dueValue
 * @returns {{ daysPastDue: number|null, bucket: string }}
 */
export function agingFromDueDate(dueValue) {
  const due = toYmd(dueValue);
  if (!due) return { daysPastDue: null, bucket: "no-due" };
  const today = toYmd(new Date());
  if (!today) return { daysPastDue: null, bucket: "no-due" };
  const dueMs = Date.parse(`${due}T12:00:00`);
  const todayMs = Date.parse(`${today}T12:00:00`);
  if (!Number.isFinite(dueMs) || !Number.isFinite(todayMs)) {
    return { daysPastDue: null, bucket: "no-due" };
  }
  const daysPastDue = Math.floor((todayMs - dueMs) / 86400000);
  if (daysPastDue <= 0) return { daysPastDue, bucket: "current" };
  if (daysPastDue <= 30) return { daysPastDue, bucket: "1-30" };
  if (daysPastDue <= 60) return { daysPastDue, bucket: "31-60" };
  if (daysPastDue <= 90) return { daysPastDue, bucket: "61-90" };
  return { daysPastDue, bucket: "90+" };
}

export function agingBucketLabel(bucket) {
  switch (String(bucket || "")) {
    case "current":
      return "Current";
    case "1-30":
      return "1–30 days";
    case "31-60":
      return "31–60 days";
    case "61-90":
      return "61–90 days";
    case "90+":
      return "90+ days";
    case "no-due":
      return "No due date";
    default:
      return String(bucket || "");
  }
}

export function isSpInvoicePaid(doc) {
  return computeSpInvoiceMoney(doc).isPaid;
}
