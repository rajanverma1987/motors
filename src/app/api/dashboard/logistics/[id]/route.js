import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import LogisticsEntry from "@/models/LogisticsEntry";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import {
  applyPoLineReceiptStatuses,
  revertPoOnLogisticsDelete,
} from "@/lib/po-line-receipts";
import {
  removeLogisticsChargesFromPo,
  syncLogisticsChargesToPo,
} from "@/lib/logistics-po-charges";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toRow(doc) {
  return {
    id: doc._id.toString(),
    kind: doc.kind,
    date: doc.date || "",
    invoiceNumber: doc.invoiceNumber || "",
    jobNumber: doc.jobNumber || "",
    purchaseOrderId: doc.purchaseOrderId ? String(doc.purchaseOrderId) : "",
    poNumberSnapshot: doc.poNumberSnapshot || "",
    mannerOfTransport: doc.mannerOfTransport || "",
    freight: doc.freight || "",
    droppedBy: doc.droppedBy || "",
    pickedBy: doc.pickedBy || "",
    charges: doc.charges || "",
    logisticsChargesPaidBy: doc.logisticsChargesPaidBy || "",
    logisticsChargesAmount: doc.logisticsChargesAmount || "",
    notes: doc.notes || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await request.json();
    await connectDB();
    const existing = await LogisticsEntry.findOne({ _id: id, createdByEmail: email });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const patch = {};
    if (body.date !== undefined) patch.date = clampString(body.date, 30);
    if (body.invoiceNumber !== undefined) patch.invoiceNumber = clampString(body.invoiceNumber, 100);
    if (body.jobNumber !== undefined) patch.jobNumber = clampString(body.jobNumber, 100);
    if (body.mannerOfTransport !== undefined) {
      patch.mannerOfTransport = clampString(body.mannerOfTransport, LIMITS.shortText.max);
    }
    if (body.freight !== undefined) patch.freight = clampString(body.freight, LIMITS.shortText.max);
    if (body.droppedBy !== undefined) patch.droppedBy = clampString(body.droppedBy, LIMITS.shortText.max);
    if (body.pickedBy !== undefined) patch.pickedBy = clampString(body.pickedBy, LIMITS.shortText.max);
    if (body.charges !== undefined) patch.charges = clampString(body.charges, 50);
    if (body.notes !== undefined) patch.notes = clampString(body.notes, LIMITS.message.max);
    if (existing.kind === "vendor_po_receiving") {
      if (body.logisticsChargesPaidBy !== undefined) {
        const paidBy = String(body.logisticsChargesPaidBy ?? "").trim().toLowerCase();
        patch.logisticsChargesPaidBy = paidBy === "company" || paidBy === "vendor" ? paidBy : "";
      }
      if (body.logisticsChargesAmount !== undefined) {
        patch.logisticsChargesAmount = clampString(body.logisticsChargesAmount, 50);
      }
    }

    const prevPoId = existing.purchaseOrderId ? String(existing.purchaseOrderId) : "";
    let nextPoId = prevPoId;
    if (existing.kind === "vendor_po_receiving" && body.purchaseOrderId !== undefined) {
      const pid = String(body.purchaseOrderId || "").trim();
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
        patch.purchaseOrderId = null;
        patch.poNumberSnapshot = "";
        nextPoId = "";
      } else {
        const po = await PurchaseOrder.findOne({
          _id: pid,
          createdByEmail: email,
        })
          .select("poNumber lineItems")
          .lean();
        if (po) {
          patch.purchaseOrderId = new mongoose.Types.ObjectId(pid);
          patch.poNumberSnapshot = po.poNumber || "";
          nextPoId = pid;
          const lineCount = Array.isArray(po.lineItems) ? po.lineItems.length : 0;
          if (lineCount > 0) {
            const applied = await applyPoLineReceiptStatuses(pid, email, body.poLineReceiptStatuses);
            if (!applied.ok) {
              return NextResponse.json({ error: applied.error }, { status: 400 });
            }
            patch.poLineReceiptStatuses = applied.appliedStatuses ?? [];
          }
        }
      }
    } else if (existing.kind === "vendor_po_receiving" && nextPoId) {
      const po = await PurchaseOrder.findOne({
        _id: nextPoId,
        createdByEmail: email,
      })
        .select("lineItems")
        .lean();
      const lineCount = Array.isArray(po?.lineItems) ? po.lineItems.length : 0;
      if (lineCount > 0 && body.poLineReceiptStatuses !== undefined) {
        const applied = await applyPoLineReceiptStatuses(nextPoId, email, body.poLineReceiptStatuses);
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 400 });
        }
        patch.poLineReceiptStatuses = applied.appliedStatuses ?? [];
      }
    }

    Object.assign(existing, patch);
    await existing.save();

    if (existing.kind === "vendor_po_receiving") {
      await LogisticsEntry.updateOne(
        { _id: id, createdByEmail: email },
        {
          $set: {
            logisticsChargesPaidBy: existing.logisticsChargesPaidBy || "",
            logisticsChargesAmount: existing.logisticsChargesAmount || "",
          },
        }
      );
    }

    if (existing.kind === "vendor_po_receiving") {
      if (prevPoId && prevPoId !== nextPoId) {
        await removeLogisticsChargesFromPo(prevPoId, email);
      }
      if (nextPoId) {
        const synced = await syncLogisticsChargesToPo({
          purchaseOrderId: nextPoId,
          ownerEmail: email,
          logisticsEntryId: id,
          paidBy: existing.logisticsChargesPaidBy,
          amount: existing.logisticsChargesAmount,
        });
        if (!synced.ok) {
          return NextResponse.json({ error: synced.error || "Failed to update PO charges" }, { status: 400 });
        }
      } else if (prevPoId) {
        await removeLogisticsChargesFromPo(prevPoId, email);
      }
    }

    return NextResponse.json({ ok: true, entry: toRow(existing.toObject()) });
  } catch (err) {
    console.error("Logistics PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const existing = await LogisticsEntry.findOne({ _id: id, createdByEmail: email }).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.kind === "vendor_po_receiving" && existing.purchaseOrderId) {
      await removeLogisticsChargesFromPo(existing.purchaseOrderId, email);
      const reverted = await revertPoOnLogisticsDelete(existing, email, id);
      if (!reverted.ok) {
        return NextResponse.json({ error: reverted.error || "Failed to revert PO receipt" }, { status: 400 });
      }
    }

    const r = await LogisticsEntry.deleteOne({ _id: id, createdByEmail: email });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Logistics DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
