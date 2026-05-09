import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Motor from "@/models/Motor";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { LIMITS, clampString, clampArray } from "@/lib/validation";
import { sanitizeSpecs } from "@/lib/sanitize-specs";

const MAX_PHOTOS = 20;

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "createdAt").trim();
    const sortDir = String(searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      customer: "customerId",
      serialNumber: "serialNumber",
      manufacturer: "manufacturer",
      model: "model",
      hp: "hp",
      rpm: "rpm",
      voltage: "voltage",
      frameSize: "frameSize",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "createdAt";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ serialNumber: rx }, { manufacturer: rx }, { model: rx }];
    }
    const [totalCount, list] = await Promise.all([
      Motor.countDocuments(q),
      Motor.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
    const listWithId = list.map((m) => ({
      ...m,
      id: m._id.toString(),
      _id: undefined,
      motorPhotos: Array.isArray(m.motorPhotos) ? m.motorPhotos : [],
      nameplateImages: Array.isArray(m.nameplateImages) ? m.nameplateImages : [],
    }));
    if (!includePagination) return NextResponse.json(listWithId);
    return NextResponse.json({ items: listWithId, page, pageSize, totalCount });
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
      kw,
      amps,
      frameSize,
      motorType,
      slots,
      coreLength,
      coreDiameter,
      bars,
      motorPhotos,
      nameplateImages,
      notes,
      acSpecs,
      dcSpecs,
      dcArmatureSpecs,
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
      kw: clampString(kw, 50),
      amps: clampString(amps, 50),
      frameSize: clampString(frameSize, 100),
      motorType: clampString(motorType, LIMITS.shortText.max),
      slots: clampString(slots, 50),
      coreLength: clampString(coreLength, 50),
      coreDiameter: clampString(coreDiameter, 50),
      bars: clampString(bars, 50),
      motorPhotos: clampArray(motorPhotos, MAX_PHOTOS),
      nameplateImages: clampArray(nameplateImages, MAX_PHOTOS),
      notes: clampString(notes, LIMITS.message.max),
      acSpecs: sanitizeSpecs(acSpecs),
      dcSpecs: sanitizeSpecs(dcSpecs),
      dcArmatureSpecs: sanitizeSpecs(dcArmatureSpecs),
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
