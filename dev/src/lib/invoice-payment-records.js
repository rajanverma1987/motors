import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { invoiceBalance, invoiceLineTotal, invoiceTotalPaid } from "@/lib/invoice-amounts";
import { resolveInvoiceTaxFields } from "@/lib/quote-invoice-totals";

export const INVOICE_PAYMENT_METHODS = new Set(["cash", "check", "ach", "wire", "card", "other", ""]);

/**
 * @param {object} body
 */
export function parseInvoicePaymentBody(body) {
  const amount = parseFloat(String(body?.amount ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number" };
  }
  const paymentDate = String(body?.paymentDate ?? "").trim().slice(0, 50);
  if (!paymentDate) {
    return { error: "Payment date required" };
  }
  const method = String(body?.method ?? "").trim().toLowerCase();
  if (!INVOICE_PAYMENT_METHODS.has(method)) {
    return { error: "Invalid payment method" };
  }
  return {
    payment: {
      amount: amount.toFixed(2),
      paymentDate,
      method: method || "other",
      reference: String(body?.reference ?? "").trim().slice(0, 200),
      notes: String(body?.notes ?? "").trim().slice(0, 2000),
    },
    amountNum: Math.round(amount * 100) / 100,
  };
}

/**
 * @param {import("mongoose").Document} doc
 * @param {object} merged
 * @param {object} [customer]
 */
export function syncInvoiceStatusFromPayments(doc, merged, customer) {
  const tax = resolveInvoiceTaxFields({ customer });
  const invForTotals = { ...doc.toObject(), ...tax };
  const total = invoiceLineTotal(invForTotals);
  const paid = invoiceTotalPaid(doc);
  const balance = Math.max(0, Math.round((total - paid) * 100) / 100);
  if (balance <= 0.005) {
    doc.status = normalizeInvoiceStatusSlug("fully_paid", merged);
  } else if (paid > 0.005) {
    doc.status = normalizeInvoiceStatusSlug("partial_paid", merged);
  } else {
    const slug = normalizeInvoiceStatusSlug(doc.status, merged);
    if (slug === "fully_paid" || slug === "partial_paid") {
      doc.status = normalizeInvoiceStatusSlug("sent", merged);
    }
  }
}

/**
 * @param {import("mongoose").Document} doc
 * @param {object} [customer]
 */
export function invoicePaymentBalance(doc, customer) {
  const tax = resolveInvoiceTaxFields({ customer });
  const invForTotals = { ...doc.toObject(), ...tax };
  const total = invoiceLineTotal(invForTotals);
  const paid = invoiceTotalPaid(doc);
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

/**
 * @param {import("mongoose").Document} doc
 * @param {object} [customer]
 */
export function invoicePaymentResponse(doc, customer) {
  const tax = resolveInvoiceTaxFields({ customer });
  const invForTotals = { ...doc.toObject(), ...tax };
  const o = doc.toObject();
  return {
    id: doc._id.toString(),
    status: o.status,
    totalPaid: invoiceTotalPaid(o),
    balance: invoiceBalance(invForTotals),
    payments: o.payments || [],
  };
}
