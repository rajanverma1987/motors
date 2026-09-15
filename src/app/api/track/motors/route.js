import { NextResponse } from "next/server";
import {
  getTrackFacilityFromRequest,
  serializeTrackMotor,
  trackUnauthorized,
} from "@/lib/track-auth";
import TrackMotor, {
  TRACK_MOTOR_CRITICALITY,
  TRACK_MOTOR_POWER_TYPES,
  TRACK_MOTOR_STATUS,
} from "@/models/TrackMotor";
import { connectDB } from "@/lib/db";
import { canAddMotor } from "@/lib/track-subscription";
import { clampString } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get("archived") === "1";
    const q = {
      facilityId: facility._id,
      ...(includeArchived ? {} : { archived: { $ne: true } }),
    };
    const docs = await TrackMotor.find(q).sort({ updatedAt: -1 }).lean();
    return NextResponse.json({
      ok: true,
      motors: docs.map(serializeTrackMotor),
    });
  } catch (err) {
    console.error("Track motors GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const gate = await canAddMotor(facility);
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: `Free plan allows up to ${gate.limit} motors. Upgrade to Pro for unlimited motors.`,
          code: "MOTOR_LIMIT",
          limit: gate.limit,
          count: gate.count,
        },
        { status: 402 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const manufacturer = clampString(body?.manufacturer, 120);
    const voltage = clampString(body?.voltage, 80);
    const powerType = String(body?.powerType || "AC").toUpperCase() === "DC" ? "DC" : "AC";
    const hp = clampString(body?.hp, 40);
    const kw = clampString(body?.kw, 40);
    if (!manufacturer) {
      return NextResponse.json({ error: "Manufacturer is required." }, { status: 400 });
    }
    if (!voltage) {
      return NextResponse.json({ error: "Voltage is required." }, { status: 400 });
    }
    if (!hp && !kw) {
      return NextResponse.json({ error: "Enter HP and/or kW." }, { status: 400 });
    }
    if (!TRACK_MOTOR_POWER_TYPES.includes(powerType)) {
      return NextResponse.json({ error: "Power type must be AC or DC." }, { status: 400 });
    }

    const criticality = TRACK_MOTOR_CRITICALITY.includes(String(body?.criticality || ""))
      ? String(body.criticality)
      : "standard";
    const status = TRACK_MOTOR_STATUS.includes(String(body?.status || ""))
      ? String(body.status)
      : "in_service";

    await connectDB();
    const doc = await TrackMotor.create({
      facilityId: facility._id,
      manufacturer,
      modelNumber: clampString(body?.modelNumber, 120),
      serialNumber: clampString(body?.serialNumber, 120),
      powerType,
      motorType: clampString(body?.motorType, 80),
      hp,
      kw,
      voltage,
      fullLoadAmps: clampString(body?.fullLoadAmps, 40),
      rpm: clampString(body?.rpm, 40),
      frame: clampString(body?.frame, 60),
      enclosure: clampString(body?.enclosure, 60),
      locationBuilding: clampString(body?.locationBuilding, 120),
      locationArea: clampString(body?.locationArea, 120),
      locationAssetTag: clampString(body?.locationAssetTag, 80),
      criticality,
      status,
      notes: clampString(body?.notes, 2000),
    });

    return NextResponse.json({ ok: true, motor: serializeTrackMotor(doc) }, { status: 201 });
  } catch (err) {
    console.error("Track motors POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
