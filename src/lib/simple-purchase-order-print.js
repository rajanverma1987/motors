import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { formatDateMdy } from "@/lib/format-date";
import { parsePoMoney } from "@/lib/simple-purchase-order-form";

/**
 * Map Simple PO form (+ vendor / settings) to Classic PoPrintSheetBody shape.
 * @param {{
 *   form: Record<string, unknown>,
 *   vendor?: object | null,
 *   accountSettings?: object,
 *   user?: object | null,
 * }} opts
 */
export function buildSimplePurchaseOrderPrintPayload({
  form,
  vendor = null,
  accountSettings = {},
  user = null,
}) {
  const lines = (Array.isArray(form?.lineItems) ? form.lineItems : [])
    .filter(
      (line) =>
        String(line?.itemName ?? "").trim() ||
        parsePoMoney(line?.quantity) ||
        parsePoMoney(line?.price) ||
        parsePoMoney(line?.taxPercent)
    )
    .map((line) => ({
      description: String(line.itemName || "").trim(),
      qty: String(line.quantity ?? "0").trim() || "0",
      uom: String(line.uom || "").trim(),
      unitPrice: String(line.price ?? "").trim(),
      taxPercent: String(line.taxPercent ?? "0").trim() || "0",
      status: "Ordered",
    }));

  const shopName = String(user?.shopName || "").trim();
  const ownerEmail = String(user?.email || "").trim();
  const fromShopContact = [user?.contactName, ownerEmail].filter(Boolean).join(" · ");
  const poDate = form?.poCutDate || form?.createdAt || "";
  const formatted =
    formatDateMdy(poDate) !== "—"
      ? formatDateMdy(poDate)
      : poDate
        ? String(poDate)
        : "";

  return {
    po: {
      id: String(form?.id || "").trim(),
      poNumber: String(form?.poNumber || "").trim(),
      vendorId: String(form?.vendorId || "").trim(),
      vendorName: String(vendor?.name || vendor?.companyName || form?.vendorName || "").trim(),
      lineItems: lines,
      notes: String(form?.comments || "").trim(),
      otherCharges: [],
      fromShopName: shopName,
      fromShopContact,
      fromShopLogoUrl: String(accountSettings?.logoUrl || "").trim(),
      fromAccountsBillingAddress: String(accountSettings?.accountsBillingAddress || "").trim(),
      fromAccountsShippingAddress: String(accountSettings?.accountsShippingAddress || "").trim(),
      fromPaymentTermsLabel: accountSettings?.accountsPaymentTerms
        ? accountsPaymentTermsLabel(accountSettings.accountsPaymentTerms)
        : "",
      invoiceThankYouNote: accountSettings?.invoiceThankYouNote ?? "",
      formattedCreatedAt: formatted,
    },
    vendor: vendor
      ? {
          name: vendor.name || vendor.companyName || "",
          contactName: vendor.contactName || "",
          address: vendor.address || "",
          city: vendor.city || "",
          state: vendor.state || "",
          zipCode: vendor.zipCode || vendor.zip || "",
          phone: vendor.phone || "",
          email: vendor.email || "",
        }
      : null,
    documentLabel: String(form?.poNumber || "").trim()
      ? `PO ${String(form.poNumber).trim()}`
      : "Purchase order",
  };
}
