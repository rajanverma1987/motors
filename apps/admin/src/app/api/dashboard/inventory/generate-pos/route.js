import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PurchaseOrder from "@/models/PurchaseOrder";
import Vendor from "@/models/Vendor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { normalizePurchaseOrderLineItems } from "@/lib/purchase-order-line-items";
import { getNextPoNumber } from "@/lib/purchase-order-numbers";

/**
 * POST body:
 * {
 *   quoteId?: string,
 *   groups: [{ vendorId: string, lineItems: [{ description, qty, uom, unitPrice, inventoryItemId? }] }]
 * }
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json().catch(() => ({}));
    const groups = Array.isArray(body?.groups) ? body.groups : [];
    if (groups.length === 0) {
      return NextResponse.json({ error: "groups required" }, { status: 400 });
    }
    const quoteIdRaw = String(body?.quoteId ?? "").trim();
    const typeVal = quoteIdRaw ? "job" : "shop";

    await connectDB();

    const created = [];
    for (const g of groups) {
      const vendorId = String(g?.vendorId ?? "").trim();
      if (!vendorId) {
        return NextResponse.json({ error: "Each group needs vendorId" }, { status: 400 });
      }
      const v = await Vendor.findOne({ _id: vendorId, createdByEmail: email }).lean();
      if (!v) {
        return NextResponse.json({ error: `Vendor not found: ${vendorId}` }, { status: 400 });
      }
      const rawLines = Array.isArray(g?.lineItems) ? g.lineItems : [];
      const lineItems = normalizePurchaseOrderLineItems(rawLines);
      if (lineItems.length === 0) {
        continue;
      }
      const poNumber = await getNextPoNumber(email);
      const doc = await PurchaseOrder.create({
        poNumber,
        vendorId,
        type: typeVal,
        quoteId: typeVal === "job" ? clampString(quoteIdRaw, 100) : "",
        lineItems,
        vendorInvoices: [],
        payments: [],
        notes: clampString(g?.notes ?? body?.notes, LIMITS.message.max),
        createdByEmail: email,
      });
      created.push({
        id: doc._id.toString(),
        poNumber: doc.poNumber,
        vendorId: doc.vendorId,
      });
    }

    if (created.length === 0) {
      return NextResponse.json({ error: "No line items to order" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, purchaseOrders: created });
  } catch (err) {
    console.error("Generate POs from inventory:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
