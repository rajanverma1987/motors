import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import LogisticsEntry from "@/models/LogisticsEntry";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString } from "@/lib/validation";
import { applyPoLineReceiptStatuses } from "@/lib/po-line-receipts";

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
    notes: doc.notes || "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function normalizePayload(body, email) {
  const kinds = new Set(["motor_receiving", "motor_shipping", "vendor_po_receiving"]);
  const kind = kinds.has(body?.kind) ? body.kind : null;
  if (!kind) return null;
  const out = {
    kind,
    date: clampString(body?.date, 30),
    invoiceNumber: clampString(body?.invoiceNumber, 100),
    jobNumber: clampString(body?.jobNumber, 100),
    mannerOfTransport: clampString(body?.mannerOfTransport, LIMITS.shortText.max),
    freight: clampString(body?.freight, LIMITS.shortText.max),
    droppedBy: clampString(body?.droppedBy, LIMITS.shortText.max),
    pickedBy: clampString(body?.pickedBy, LIMITS.shortText.max),
    charges: clampString(body?.charges, 50),
    notes: clampString(body?.notes, LIMITS.message.max),
    purchaseOrderId: null,
    poNumberSnapshot: "",
  };
  if (kind === "vendor_po_receiving" && body?.purchaseOrderId) {
    const id = String(body.purchaseOrderId).trim();
    if (mongoose.Types.ObjectId.isValid(id)) out.purchaseOrderId = new mongoose.Types.ObjectId(id);
  }
  return out;
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const kind = request.nextUrl.searchParams.get("kind");
    await connectDB();
    const q = { createdByEmail: email };
    if (kind && ["motor_receiving", "motor_shipping", "vendor_po_receiving"].includes(kind)) {
      q.kind = kind;
    }
    const list = await LogisticsEntry.find(q).sort({ date: -1, createdAt: -1 }).limit(500).lean();
    return NextResponse.json(list.map(toRow));
  } catch (err) {
    console.error("Logistics GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const body = await request.json();
    const payload = normalizePayload(body, email);
    if (!payload) {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (!payload.date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await connectDB();

    if (payload.kind === "vendor_po_receiving" && payload.purchaseOrderId) {
      const po = await PurchaseOrder.findOne({
        _id: payload.purchaseOrderId,
        createdByEmail: email,
      })
        .select("poNumber lineItems")
        .lean();
      if (!po) {
        return NextResponse.json({ error: "Purchase order not found" }, { status: 400 });
      }
      payload.poNumberSnapshot = po.poNumber || "";
      const lineCount = Array.isArray(po.lineItems) ? po.lineItems.length : 0;
      if (lineCount > 0) {
        const applied = await applyPoLineReceiptStatuses(payload.purchaseOrderId, email, body.poLineReceiptStatuses);
        if (!applied.ok) {
          return NextResponse.json({ error: applied.error }, { status: 400 });
        }
      }
    } else {
      payload.purchaseOrderId = null;
      payload.poNumberSnapshot = "";
    }

    const doc = await LogisticsEntry.create({
      createdByEmail: email,
      ...payload,
    });
    return NextResponse.json({ ok: true, entry: toRow(doc.toObject()) });
  } catch (err) {
    console.error("Logistics POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
