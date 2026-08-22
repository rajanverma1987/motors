import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  isValidSimplePortalId,
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { checkRateLimit } from "@/lib/rate-limit";
import { clampString } from "@/lib/validation";
import { reverseReceiveInventoryFromPoLine } from "@/lib/inventory-service";
import mongoose from "mongoose";
import {
  canReturnPoLine,
  getPoLineReceivingStatus,
  isPoLineReturned,
  poLineHasContent,
  SIMPLE_PO_RECEIVING_STATUS_PARTIAL,
  SIMPLE_PO_RECEIVING_STATUS_RECEIVED,
  SIMPLE_PO_RECEIVING_STATUS_RETURNED,
  parsePoMoney,
} from "@/lib/simple-purchase-order-form";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function lineReceiveQty(line) {
  const received = parsePoMoney(line?.receivedQty);
  if (received > 0) return received;
  const ordered = parsePoMoney(line?.quantity);
  return ordered > 0 ? ordered : 0;
}

export async function POST(request, context) {
  const { allowed } = checkRateLimit(request, "simple-po-return", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

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

    const body = await request.json().catch(() => ({}));
    const lineIds = Array.isArray(body?.lineIds)
      ? body.lineIds.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    if (!lineIds.length) {
      return NextResponse.json({ error: "Select at least one line to return." }, { status: 400 });
    }

    const returnTrackingNumber = clampString(body?.returnTrackingNumber, 120);
    const returnReason = clampString(body?.returnReason, 500);
    const returnShippingCharge = sanitizePoNumericReturnCharge(body?.returnShippingCharge);
    const returnPaidBy = normalizeReturnPaidBy(body?.returnPaidBy);

    if (!returnReason) {
      return NextResponse.json({ error: "Return reason is required." }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimplePurchaseOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const lineItems = Array.isArray(doc.lineItems) ? [...doc.lineItems] : [];
    let changed = 0;

    for (const line of lineItems) {
      const lid = String(line?.id || "").trim();
      if (!lid || !lineIds.includes(lid) || isPoLineReturned(line) || !poLineHasContent(line)) continue;
      if (!canReturnPoLine(line)) continue;

      const priorStatus = getPoLineReceivingStatus(line);
      const invId = String(line?.inventoryItemId || "").trim();
      if (
        invId &&
        mongoose.Types.ObjectId.isValid(invId) &&
        (priorStatus === SIMPLE_PO_RECEIVING_STATUS_RECEIVED ||
          priorStatus === SIMPLE_PO_RECEIVING_STATUS_PARTIAL)
      ) {
        const qty = lineReceiveQty(line);
        if (qty > 0) {
          const rev = await reverseReceiveInventoryFromPoLine(email, invId, qty);
          if (!rev.ok && !rev.skipped) {
            return NextResponse.json(
              { error: rev.error || "Could not reverse inventory for returned line." },
              { status: 400 }
            );
          }
        }
      }

      line.returned = true;
      line.returnedAt = now;
      line.returnTrackingNumber = returnTrackingNumber;
      line.returnReason = returnReason;
      line.returnShippingCharge = returnShippingCharge;
      line.returnPaidBy = returnPaidBy;
      line.receivingStatus = SIMPLE_PO_RECEIVING_STATUS_RETURNED;
      changed += 1;
    }

    if (!changed) {
      return NextResponse.json(
        { error: "No eligible lines to return. Only received items can be returned." },
        { status: 400 }
      );
    }

    const update = {
      ...sanitizeSimplePortalPayload(doc),
      lineItems,
    };

    const updated = await SimplePurchaseOrder.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, item: serializeSimplePortalDoc(updated) });
  } catch (err) {
    console.error("Simple PO return lines error:", err);
    return NextResponse.json({ error: err.message || "Failed to return lines" }, { status: 500 });
  }
}

function sanitizePoNumericReturnCharge(raw) {
  const n = parsePoMoney(raw);
  if (n <= 0) return "";
  return String(n);
}

function normalizeReturnPaidBy(raw) {
  const v = String(raw || "").trim();
  if (v === "Vendor" || v === "Company") return v;
  return "Vendor";
}
