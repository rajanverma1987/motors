import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import { LIMITS, clampString } from "@/lib/validation";

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
    status: row?.status === "Received" ? "Received" : (row?.status === "Delivered" || row?.status === "Dispatch") ? "Dispatch" : "Ordered",
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
    const lineItems = (doc.lineItems ?? []).map((item) => ({
      description: item?.description ?? "",
      qty: item?.qty ?? "1",
      uom: item?.uom ?? "",
      unitPrice: item?.unitPrice ?? "",
      status: item?.status === "Received" ? "Received" : (item?.status === "Delivered" || item?.status === "Dispatch") ? "Dispatch" : "Ordered",
    }));
    const shop = {
      name: process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "",
      address: process.env.MOTOR_SHOP_ADDRESS?.trim() || "",
      contact: process.env.MOTOR_SHOP_CONTACT?.trim() || "",
    };
    return NextResponse.json({
      id: doc._id.toString(),
      poNumber: doc.poNumber ?? "",
      vendorName,
      vendor,
      type: doc.type ?? "shop",
      quoteId: doc.quoteId ?? "",
      lineItems,
      notes: doc.notes ?? "",
      shop,
      totalOrder: lineItems.reduce((sum, row) => {
        const q = parseFloat(row?.qty ?? "1");
        const p = parseFloat(row?.unitPrice ?? "0");
        return sum + (Number.isFinite(q) && Number.isFinite(p) ? q * p : 0);
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
      status: item?.status === "Received" ? "Received" : (item?.status === "Delivered" || item?.status === "Dispatch") ? "Dispatch" : "Ordered",
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
