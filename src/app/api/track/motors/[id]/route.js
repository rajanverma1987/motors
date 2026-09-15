import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import {
  getTrackFacilityFromRequest,
  serializeTrackMotor,
  trackUnauthorized,
} from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { TRACK_MOTOR_CRITICALITY, TRACK_MOTOR_STATUS } from "@/models/TrackMotor";

export const dynamic = "force-dynamic";

async function loadOwnedMotor(facility, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TrackMotor.findOne({ _id: id, facilityId: facility._id });
}

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = String(params?.id || "").trim();
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    return NextResponse.json({ ok: true, motor: serializeTrackMotor(doc) });
  } catch (err) {
    console.error("Track motor GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = String(params?.id || "").trim();
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const fields = [
      "manufacturer",
      "modelNumber",
      "serialNumber",
      "motorType",
      "hp",
      "kw",
      "voltage",
      "fullLoadAmps",
      "rpm",
      "frame",
      "enclosure",
      "locationBuilding",
      "locationArea",
      "locationAssetTag",
      "notes",
    ];
    for (const key of fields) {
      if (body[key] !== undefined) doc[key] = clampString(body[key], key === "notes" ? 2000 : 120);
    }
    if (body.powerType !== undefined) {
      doc.powerType = String(body.powerType).toUpperCase() === "DC" ? "DC" : "AC";
    }
    if (body.criticality !== undefined && TRACK_MOTOR_CRITICALITY.includes(String(body.criticality))) {
      doc.criticality = String(body.criticality);
    }
    if (body.status !== undefined && TRACK_MOTOR_STATUS.includes(String(body.status))) {
      doc.status = String(body.status);
    }
    if (body.archived !== undefined) doc.archived = Boolean(body.archived);
    if (!doc.manufacturer) {
      return NextResponse.json({ error: "Manufacturer is required." }, { status: 400 });
    }
    if (!doc.voltage) {
      return NextResponse.json({ error: "Voltage is required." }, { status: 400 });
    }
    if (!doc.hp && !doc.kw) {
      return NextResponse.json({ error: "Enter HP and/or kW." }, { status: 400 });
    }
    await doc.save();
    return NextResponse.json({ ok: true, motor: serializeTrackMotor(doc) });
  } catch (err) {
    console.error("Track motor PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = String(params?.id || "").trim();
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    doc.archived = true;
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track motor DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
