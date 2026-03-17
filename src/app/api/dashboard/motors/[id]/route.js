import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Motor from "@/models/Motor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampArray } from "@/lib/validation";

const MAX_PHOTOS = 20;

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
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Motor.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const out = {
      id: doc._id.toString(),
      customerId: doc.customerId ?? "",
      serialNumber: doc.serialNumber ?? "",
      manufacturer: doc.manufacturer ?? "",
      model: doc.model ?? "",
      hp: doc.hp ?? "",
      rpm: doc.rpm ?? "",
      voltage: doc.voltage ?? "",
      frameSize: doc.frameSize ?? "",
      motorType: doc.motorType ?? "",
      motorPhotos: Array.isArray(doc.motorPhotos) ? doc.motorPhotos : [],
      nameplateImages: Array.isArray(doc.nameplateImages) ? doc.nameplateImages : [],
      notes: doc.notes ?? "",
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
    return NextResponse.json(out);
  } catch (err) {
    console.error("Dashboard get motor error:", err);
    return NextResponse.json({ error: "Failed to load motor" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Motor.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const {
      customerId,
      serialNumber,
      manufacturer,
      model,
      hp,
      rpm,
      voltage,
      frameSize,
      motorType,
      motorPhotos,
      nameplateImages,
      notes,
    } = body;
    if (customerId !== undefined) {
      if (!String(customerId).trim()) {
        return NextResponse.json({ error: "Customer is required" }, { status: 400 });
      }
      doc.customerId = String(customerId).trim();
    }
    if (serialNumber !== undefined) doc.serialNumber = clampString(serialNumber, LIMITS.shortText.max);
    if (manufacturer !== undefined) doc.manufacturer = clampString(manufacturer, LIMITS.shortText.max);
    if (model !== undefined) doc.model = clampString(model, LIMITS.shortText.max);
    if (hp !== undefined) doc.hp = clampString(hp, 50);
    if (rpm !== undefined) doc.rpm = clampString(rpm, 50);
    if (voltage !== undefined) doc.voltage = clampString(voltage, 50);
    if (frameSize !== undefined) doc.frameSize = clampString(frameSize, 100);
    if (motorType !== undefined) doc.motorType = clampString(motorType, LIMITS.shortText.max);
    if (motorPhotos !== undefined) doc.motorPhotos = clampArray(motorPhotos, MAX_PHOTOS);
    if (nameplateImages !== undefined) doc.nameplateImages = clampArray(nameplateImages, MAX_PHOTOS);
    if (notes !== undefined) doc.notes = clampString(notes, LIMITS.message.max);
    await doc.save();
    return NextResponse.json({
      ok: true,
      motor: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard update motor error:", err);
    return NextResponse.json({ error: err.message || "Failed to update motor" }, { status: 500 });
  }
}
