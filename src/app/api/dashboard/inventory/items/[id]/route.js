import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import InventoryItem from "@/models/InventoryItem";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampStringCoerced } from "@/lib/validation";

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

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function PATCH(request, context) {
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
    const doc = await InventoryItem.findOne({ _id: id, createdByEmail: email });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));

    if (body.name !== undefined) {
      const name = clampString(body.name, 200).trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      doc.name = name;
    }
    if (body.sku !== undefined) doc.sku = clampString(body.sku, 100);
    if (body.uom !== undefined || body.unitOfMeasure !== undefined) {
      const raw = body.uom !== undefined ? body.uom : body.unitOfMeasure;
      const u = clampStringCoerced(raw, 50).trim();
      doc.set("uom", u || "ea");
      doc.markModified("uom");
    }
    if (body.threshold !== undefined) {
      doc.threshold = Math.max(0, Number(body.threshold) || 0);
    }
    if (body.location !== undefined) doc.location = clampString(body.location, 120);
    if (body.notes !== undefined) doc.notes = clampString(body.notes, LIMITS.message.max);
    if (body.onHandDelta !== undefined) {
      const d = Number(body.onHandDelta);
      if (!Number.isFinite(d)) {
        return NextResponse.json({ error: "Invalid onHandDelta" }, { status: 400 });
      }
      doc.onHand = Math.max(0, (Number(doc.onHand) || 0) + d);
    }
    if (body.setOnHand !== undefined) {
      const v = Number(body.setOnHand);
      if (!Number.isFinite(v) || v < 0) {
        return NextResponse.json({ error: "Invalid setOnHand" }, { status: 400 });
      }
      doc.onHand = v;
    }

    await doc.save();
    return NextResponse.json({ ok: true, item: toRow(doc.toObject()) });
  } catch (err) {
    console.error("Inventory PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
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
    const existing = await InventoryItem.findOne({ _id: id, createdByEmail: email }).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const onHand = Number(existing.onHand) || 0;
    if (onHand > 0) {
      return NextResponse.json(
        { error: "Set on-hand quantity to 0 before deleting this part." },
        { status: 400 }
      );
    }
    const r = await InventoryItem.deleteOne({ _id: id, createdByEmail: email });
    if (r.deletedCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Inventory DELETE:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
