import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Motor from "@/models/Motor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampArray } from "@/lib/validation";

const MAX_PHOTOS = 20;

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await Motor.find({ createdByEmail: email })
      .sort({ createdAt: -1 })
      .lean();
    const listWithId = list.map((m) => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
      motorPhotos: Array.isArray(m.motorPhotos) ? m.motorPhotos : [],
      nameplateImages: Array.isArray(m.nameplateImages) ? m.nameplateImages : [],
    }));
    return NextResponse.json(listWithId);
  } catch (err) {
    console.error("Dashboard list motors error:", err);
    return NextResponse.json({ error: "Failed to list motors" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
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
    if (!customerId?.trim()) {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    const doc = await Motor.create({
      customerId: customerId.trim(),
      serialNumber: clampString(serialNumber, LIMITS.shortText.max),
      manufacturer: clampString(manufacturer, LIMITS.shortText.max),
      model: clampString(model, LIMITS.shortText.max),
      hp: clampString(hp, 50),
      rpm: clampString(rpm, 50),
      voltage: clampString(voltage, 50),
      frameSize: clampString(frameSize, 100),
      motorType: clampString(motorType, LIMITS.shortText.max),
      motorPhotos: clampArray(motorPhotos, MAX_PHOTOS),
      nameplateImages: clampArray(nameplateImages, MAX_PHOTOS),
      notes: clampString(notes, LIMITS.message.max),
      createdByEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({
      ok: true,
      motor: {
        ...doc.toObject(),
        id: doc._id.toString(),
        _id: undefined,
      },
    });
  } catch (err) {
    console.error("Dashboard create motor error:", err);
    return NextResponse.json({ error: err.message || "Failed to create motor" }, { status: 500 });
  }
}
