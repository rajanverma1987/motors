import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  isValidSimplePortalId,
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { applySimplePoInventoryReceipts } from "@/lib/simple-po-line-receipts";
import { emitCrmResourceEvent } from "@/lib/integration-webhooks";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimplePurchaseOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: serializeSimplePortalDoc(doc) });
  } catch (err) {
    console.error("Dashboard get simple purchase order error:", err);
    return NextResponse.json({ error: "Failed to load purchase order" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const previous = await SimplePurchaseOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!previous) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const payload = sanitizeSimplePortalPayload(body);
    const update = {
      ...payload,
      poType: String(payload.poType || "job").trim().toLowerCase() || "job",
      serviceProposalId: String(payload.serviceProposalId ?? "").trim(),
      jobNumber: String(payload.jobNumber ?? "").trim(),
      poNumber: String(payload.poNumber ?? "").trim(),
      vendorId: String(payload.vendorId ?? "").trim(),
      vendorName: String(payload.vendorName ?? "").trim(),
      paymentStatus: String(payload.paymentStatus || "Unpaid").trim() || "Unpaid",
      poCutDate: String(payload.poCutDate ?? "").trim(),
      dueDate: String(payload.dueDate ?? "").trim(),
    };
    const doc = await SimplePurchaseOrder.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: update },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const item = serializeSimplePortalDoc(doc);
    try {
      await applySimplePoInventoryReceipts(email, previous.lineItems, doc.lineItems);
    } catch (invErr) {
      console.error("Simple PO inventory receipts:", invErr);
      return NextResponse.json(
        {
          error: invErr.message || "Saved, but inventory receive failed",
          item,
        },
        { status: 500 }
      );
    }
    void emitCrmResourceEvent({
      ownerEmail: email,
      collection: "purchaseOrders",
      action: "updated",
      resourceId: item.id,
      data: item,
    });
    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("Dashboard update simple purchase order error:", err);
    return NextResponse.json({ error: err.message || "Failed to update purchase order" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const existing = await SimplePurchaseOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    try {
      // Treat delete as reverting all Received lines for inventory.
      await applySimplePoInventoryReceipts(email, existing.lineItems, []);
    } catch (invErr) {
      console.error("Simple PO inventory reverse on delete:", invErr);
      return NextResponse.json(
        { error: invErr.message || "Failed to reverse inventory before delete" },
        { status: 500 }
      );
    }
    const deleted = await SimplePurchaseOrder.findOneAndDelete({ _id: id, createdByEmail: email }).lean();
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    void emitCrmResourceEvent({
      ownerEmail: email,
      collection: "purchaseOrders",
      action: "deleted",
      resourceId: id,
      data: serializeSimplePortalDoc(deleted),
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Dashboard delete simple purchase order error:", err);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
