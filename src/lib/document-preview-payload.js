import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE } from "@/lib/quote-document-labels";

export function normalizeQuotePreviewPayload(q, accountSettings) {
  return {
    ...q,
    fromBillingAddress: String(q.fromBillingAddress || accountSettings?.accountsBillingAddress || "").trim(),
    fromShippingAddress: String(q.fromShippingAddress || accountSettings?.accountsShippingAddress || "").trim(),
  };
}

export function normalizeInvoicePreviewPayload(inv, accountSettings) {
  return {
    invoice: inv,
    motorLabel: inv.motorLabel,
    fromShopName: inv.fromShopName || "",
    fromShopContact: inv.fromShopContact || "",
    fromShopLogoUrl: (inv.fromShopLogoUrl || accountSettings?.logoUrl || "").trim(),
    fromBillingAddress: String(inv.fromBillingAddress || accountSettings?.accountsBillingAddress || "").trim(),
    fromShippingAddress: String(inv.fromShippingAddress || accountSettings?.accountsShippingAddress || "").trim(),
    fromPaymentTermsLabel:
      inv.fromPaymentTermsLabel || accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms),
    customerToName: inv.customerToName || "",
    customerBillingAddress: inv.customerBillingAddress || "",
    invoicePaymentOptions: accountSettings?.invoicePaymentOptions || "",
    invoiceThankYouNote: accountSettings?.invoiceThankYouNote || "",
  };
}

export async function fetchQuotePreviewPayload(quoteId, accountSettings) {
  const res = await fetch(`/api/dashboard/quotes/${quoteId}`, { credentials: "include", cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `${SERVICE_PROPOSAL_DOCUMENT_TITLE} not found`);
  return normalizeQuotePreviewPayload(data, accountSettings);
}

export async function fetchInvoicePreviewPayload(invoiceId, accountSettings) {
  const res = await fetch(`/api/dashboard/invoices/${invoiceId}`, { credentials: "include", cache: "no-store" });
  const inv = await res.json();
  if (!res.ok) throw new Error(inv.error || "Invoice not found");
  return normalizeInvoicePreviewPayload(inv, accountSettings);
}

export async function fetchPoPreviewPayload(purchaseOrderId) {
  const res = await fetch(`/api/dashboard/purchase-orders/${purchaseOrderId}`, {
    credentials: "include",
    cache: "no-store",
  });
  const po = await res.json();
  if (!res.ok) throw new Error(po.error || "Purchase order not found");

  let vendor = null;
  const vid = String(po.vendorId || "").trim();
  if (vid) {
    const vRes = await fetch(`/api/dashboard/vendors/${vid}`, { credentials: "include", cache: "no-store" });
    if (vRes.ok) vendor = await vRes.json();
  }

  return { po, vendor };
}
