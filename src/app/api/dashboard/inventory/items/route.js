import { NextResponse } from "next/server";
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

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await InventoryItem.find({ createdByEmail: email })
      .sort({ name: 1 })
      .lean();
    return NextResponse.json(list.map(toRow));
  } catch (err) {
    console.error("Inventory list:", err);
    return NextResponse.json({ error: "Failed to list inventory" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const name = clampString(body?.name, 200);
    if (!name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const onHand = Number(body?.onHand);
    const uomRaw = body?.uom ?? body?.unitOfMeasure;
    const doc = await InventoryItem.create({
      createdByEmail: email,
      name: name.trim(),
      sku: clampString(body?.sku, 100),
      uom: clampStringCoerced(uomRaw, 50) || "ea",
      onHand: Number.isFinite(onHand) ? Math.max(0, onHand) : 0,
      reserved: 0,
      threshold: Math.max(0, Number(body?.threshold) || 0),
      location: clampString(body?.location, 120),
      notes: clampString(body?.notes, LIMITS.message.max),
    });
    return NextResponse.json({ ok: true, item: toRow(doc.toObject()) });
  } catch (err) {
    console.error("Inventory create:", err);
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
