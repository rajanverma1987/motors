import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { LIMITS, clampString } from "@/lib/validation";
import { poLineTotalWithTax } from "@/lib/po-line-item-totals";

const MAX_LINE_ITEMS = 100;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

/** Normalize line items for update: only status can change; preserve description, qty, uom, unitPrice */
function normalizeLineItemsForVendor(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_LINE_ITEMS).map((row) => ({
    description: clampString(row?.description, LIMITS.shortText.max),
    qty: clampString(String(row?.qty ?? "1"), 50),
    uom: clampString(row?.uom, 20),
    unitPrice: clampString(row?.unitPrice, 50),
    taxPercent: clampString(String(row?.taxPercent ?? "0"), 50),
    status:
      row?.status === "Received"
        ? "Received"
        : row?.status === "Back Order"
          ? "Back Order"
          : row?.status === "Delivered" || row?.status === "Dispatch"
            ? "Dispatch"
            : "Ordered",
  }));
}

/** GET: Public view of PO by vendor share token (no auth) */
export async function GET(request, context) {
  try {
    const params = await getParams(context);
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }
    await connectDB();
    const doc = await PurchaseOrder.findOne({ vendorShareToken: token }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Purchase order not found or link expired" }, { status: 404 });
    }
    const VendorModel = (await import("@/models/Vendor")).default;
    const vendorDoc = await VendorModel.findById(doc.vendorId)
      .select("name contactName phone email address city state zipCode")
      .lean();
    const vendorName = vendorDoc?.name ?? doc.vendorId ?? "Vendor";
    const vendor = vendorDoc
      ? {
          name: vendorDoc.name ?? "",
          contactName: vendorDoc.contactName ?? "",
          phone: vendorDoc.phone ?? "",
          email: vendorDoc.email ?? "",
          address: vendorDoc.address ?? "",
          city: vendorDoc.city ?? "",
          state: vendorDoc.state ?? "",
          zipCode: vendorDoc.zipCode ?? "",
        }
      : null;
    const User = (await import("@/models/User")).default;
    const UserSettings = (await import("@/models/UserSettings")).default;
    const ownerEmail = String(doc.createdByEmail || "")
      .trim()
      .toLowerCase();
    const owner = ownerEmail ? await User.findOne({ email: ownerEmail }).lean() : null;
    const settingsDoc = ownerEmail
      ? await UserSettings.findOne({ ownerEmail }).lean()
      : null;
    const { mergeUserSettings } = await import("@/lib/user-settings");
    const { accountsPaymentTermsLabel } = await import("@/lib/accounts-display");
    const u = mergeUserSettings(settingsDoc?.settings);
    const shopContact = [owner?.contactName, owner?.email].filter(Boolean).join(" · ") || "";
    const fromShopName = owner?.shopName?.trim() || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
    const fromShopContact = shopContact || process.env.MOTOR_SHOP_CONTACT?.trim() || "";
    const fromShopLogoUrl = typeof u.logoUrl === "string" ? u.logoUrl.trim() : "";
    const fromAccountsBillingAddress = (u.accountsBillingAddress || "").trim();
    const fromAccountsShippingAddress = (u.accountsShippingAddress || "").trim();
    const fromPaymentTermsLabel = accountsPaymentTermsLabel(u.accountsPaymentTerms);
    const currency = typeof u.currency === "string" ? u.currency.toUpperCase().trim() : "USD";
    const formattedCreatedAt =
      doc.createdAt != null
        ? new Date(doc.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "";
    const otherCharges = (Array.isArray(doc.otherCharges) ? doc.otherCharges : []).map((row) => ({
      label: row?.label || "Logistics charges",
      amount: row?.amount || "",
      logisticsEntryId: row?.logisticsEntryId ? String(row.logisticsEntryId) : "",
    }));

    const lineItems = (doc.lineItems ?? []).map((item) => ({
      description: item?.description ?? "",
      qty: item?.qty ?? "1",
      uom: item?.uom ?? "",
      unitPrice: item?.unitPrice ?? "",
      taxPercent: item?.taxPercent ?? "0",
      status:
        item?.status === "Received"
          ? "Received"
          : item?.status === "Back Order"
            ? "Back Order"
            : item?.status === "Delivered" || item?.status === "Dispatch"
              ? "Dispatch"
              : "Ordered",
    }));
    return NextResponse.json({
      id: doc._id.toString(),
      poNumber: doc.poNumber ?? "",
      vendorName,
      vendor,
      type: doc.type ?? "shop",
      quoteId: doc.quoteId ?? "",
      lineItems,
      notes: doc.notes ?? "",
      otherCharges,
      fromShopName,
      fromShopContact,
      fromShopLogoUrl,
      fromAccountsBillingAddress,
      fromAccountsShippingAddress,
      fromPaymentTermsLabel,
      invoiceThankYouNote: (u.invoiceThankYouNote || "").trim(),
      formattedCreatedAt,
      currency,
      totalOrder: lineItems.reduce((sum, row) => {
        const t = poLineTotalWithTax(row);
        return sum + (t != null && Number.isFinite(t) ? t : 0);
      }, 0).toFixed(2),
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error("PO vendor view error:", err);
    return NextResponse.json({ error: "Failed to load purchase order" }, { status: 500 });
  }
}

/** PATCH: Vendor updates line item status(es) only (no auth) */
export async function PATCH(request, context) {
  try {
    const params = await getParams(context);
    const token = params?.token?.trim();
    if (!token) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }
    await connectDB();
    const doc = await PurchaseOrder.findOne({ vendorShareToken: token });
    if (!doc) {
      return NextResponse.json({ error: "Purchase order not found or link expired" }, { status: 404 });
    }
    const body = await request.json();
    const { lineItems: submittedLineItems } = body;
    if (!Array.isArray(submittedLineItems) || submittedLineItems.length === 0) {
      return NextResponse.json({ error: "lineItems array required" }, { status: 400 });
    }
    doc.lineItems = normalizeLineItemsForVendor(submittedLineItems);
    doc.markModified("lineItems");
    await doc.save();
    const po = doc.toObject();
    const lineItems = (po.lineItems ?? []).map((item) => ({
      ...item,
      status:
        item?.status === "Received"
          ? "Received"
          : item?.status === "Back Order"
            ? "Back Order"
            : item?.status === "Delivered" || item?.status === "Dispatch"
              ? "Dispatch"
              : "Ordered",
    }));
    return NextResponse.json({
      ok: true,
      lineItems,
    });
  } catch (err) {
    console.error("PO vendor update status error:", err);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
