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
import { enqueueQuickBooksSync } from "@/lib/quickbooks/triggers";
import { actorFromPortalUser, activityChanges, recordActivity } from "@/lib/activity-log";

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
      poCutDate: payload.poCutDate ?? null,
      dueDate: payload.dueDate ?? null,
    };
    delete update.removedAt;
    delete update.removedByEmail;
    const doc = await SimplePurchaseOrder.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: update },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    let item = serializeSimplePortalDoc(doc);
    try {
      const receipt = await applySimplePoInventoryReceipts(email, previous.lineItems, doc.lineItems, {
        purchaseOrderId: String(doc._id),
        poNumber: String(doc.poNumber || "").trim(),
        vendorName: String(doc.vendorName || "").trim(),
      });
      if (receipt.mutated && Array.isArray(receipt.lineItems)) {
        const updated = await SimplePurchaseOrder.findOneAndUpdate(
          { _id: id, createdByEmail: email },
          { $set: { lineItems: receipt.lineItems } },
          { new: true }
        ).lean();
        if (updated) item = serializeSimplePortalDoc(updated);
      }
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
    enqueueQuickBooksSync({
      ownerEmail: email,
      trigger: "purchaseOrder",
      previous,
      next: doc,
    });
    const changes = activityChanges("purchaseOrder", previous, doc);
    if (changes.length) {
      const actor = actorFromPortalUser(user);
      await recordActivity({
        ownerEmail: email,
        ...actor,
        action: "saved",
        recordKind: "purchaseOrder",
        recordId: item.id,
        recordNumber: String(doc.poNumber || "").trim(),
        partyName: String(doc.vendorName || "").trim(),
        summary: changes.map((c) => `${c.field}: ${c.from || "(empty)"} to ${c.to || "(empty)"}`).join(". "),
        changes,
      });
    }
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
    if (!existing.removedAt) {
      return NextResponse.json(
        { error: "Remove this purchase order from the list before deleting it." },
        { status: 400 }
      );
    }
    try {
      // Treat delete as reverting all Received lines for inventory.
      await applySimplePoInventoryReceipts(email, existing.lineItems, [], {
        purchaseOrderId: String(existing._id),
        poNumber: String(existing.poNumber || "").trim(),
        vendorName: String(existing.vendorName || "").trim(),
      });
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
    const actor = actorFromPortalUser(user);
    await recordActivity({
      ownerEmail: email,
      ...actor,
      action: "deleted",
      recordKind: "purchaseOrder",
      recordId: id,
      recordNumber: String(deleted.poNumber || "").trim(),
      partyName: String(deleted.vendorName || "").trim(),
      summary: `Purchase order ${String(deleted.poNumber || id).trim()} deleted permanently.`,
      snapshot: deleted,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Dashboard delete simple purchase order error:", err);
    return NextResponse.json({ error: "Failed to delete purchase order" }, { status: 500 });
  }
}
