import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { returnInventoryToStock } from "@/lib/inventory-service";
import { clampString } from "@/lib/validation";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toRow(doc) {
  const onHand = Number(doc.onHand) || 0;
  const reserved = Number(doc.reserved) || 0;
  return {
    id: doc._id.toString(),
    name: doc.name ?? "",
    sku: doc.sku ?? "",
    onHand,
    reserved,
    available: onHand - reserved,
    threshold: Number(doc.threshold) || 0,
    location: doc.location ?? "",
    uom: doc.uom ?? "ea",
    notes: doc.notes ?? "",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * POST — return previously issued stock to on-hand.
 * Body: { qty, relatedMovementId?, notes?, simpleServiceProposalId? }
 */
export async function POST(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const exists = await InventoryItem.findOne({ _id: id, createdByEmail: email }).select("_id").lean();
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const result = await returnInventoryToStock(email, id, {
      qty: Number(body.qty),
      relatedMovementId: String(body.relatedMovementId || "").trim(),
      notes: clampString(body.notes, 500),
      simpleServiceProposalId: String(body.simpleServiceProposalId || "").trim(),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Return failed" }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      item: toRow(result.item),
      movementId: result.movement?._id?.toString?.() || "",
    });
  } catch (err) {
    console.error("Inventory return POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
