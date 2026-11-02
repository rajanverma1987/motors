/** Labels for Settings → Accounts payment terms (slug → display). */
const PAYMENT_TERM_LABELS = {
  on_receipt: "Due on receipt",
  net15: "NET 15",
  net30: "NET 30",
  net45: "NET 45",
  net60: "NET 60",
};

export function accountsPaymentTermsLabel(slug) {
  const k = String(slug ?? "net30")
    .toLowerCase()
    .trim();
  return PAYMENT_TERM_LABELS[k] || PAYMENT_TERM_LABELS.net30;
}

/** Escape for HTML email. */
export function escHtml(v) {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text block → HTML paragraphs / line breaks for email. */
export function accountsTextToEmailHtml(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  const lines = t.split(/\r?\n/).map((l) => escHtml(l));
  return `<div style="margin-top:4px;font-size:14px;line-height:1.5;color:#374151">${lines.join("<br/>")}</div>`;
}

/**
 * Quote & invoice emails to customers: company details (billing address only, no “Billing” label) + payment terms.
 */
export function buildCustomerQuoteInvoiceEmailBlock({ billingAddress, paymentTermsLabel }) {
  const bill = String(billingAddress ?? "").trim();
  const terms = paymentTermsLabel || accountsPaymentTermsLabel("net30");
  const parts = [];
  if (bill) {
    parts.push(accountsTextToEmailHtml(bill));
  }
  parts.push(
    `<p style="margin:16px 0 0 0;font-size:14px;color:#374151"><strong>Payment terms:</strong> ${escHtml(terms)}</p>`
  );
  return `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">${parts.join("")}</div>`;
}

/**
 * Purchase order email to vendors: labeled Billing and Ship-to / shipping blocks.
 */
export function buildPoVendorAddressesEmailBlock({ billingAddress, shippingAddress }) {
  const bill = String(billingAddress ?? "").trim();
  const ship = String(shippingAddress ?? "").trim();
  if (!bill && !ship) return "";
  const parts = [];
  if (bill) {
    parts.push(
      `<p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Billing</p>${accountsTextToEmailHtml(bill)}`
    );
  }
  if (ship) {
    parts.push(
      `<p style="margin:16px 0 4px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;">Shipping</p>${accountsTextToEmailHtml(ship)}`
    );
  }
  return `<div style="margin-top:20px;padding-top:16px;border-top:1px solid #e5e7eb">${parts.join("")}</div>`;
}
