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

export const dynamic = "force-dynamic";

const KINDS = ["test_report", "warranty", "invoice", "manual", "other"];
const MAX_DOCUMENTS = 30;

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

async function loadOwnedMotor(facility, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TrackMotor.findOne({ _id: id, facilityId: facility._id });
}

export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const url = clampString(body?.url, 500);
    if (!url) return NextResponse.json({ error: "Upload a file first." }, { status: 400 });
    if ((motor.documents || []).length >= MAX_DOCUMENTS) {
      return NextResponse.json(
        { error: `A motor can hold up to ${MAX_DOCUMENTS} documents.` },
        { status: 409 }
      );
    }

    motor.documents.push({
      name: clampString(body?.name, 160) || url.split("/").pop(),
      url,
      kind: KINDS.includes(String(body?.kind || "")) ? String(body.kind) : "other",
      uploadedAt: new Date(),
    });
    await motor.save();
    return NextResponse.json({ ok: true, motor: serializeTrackMotor(motor) }, { status: 201 });
  } catch (err) {
    console.error("Track documents POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const documentId = String(searchParams.get("documentId") || "").trim();
    const entry = motor.documents.id(documentId);
    if (!entry) return NextResponse.json({ error: "Document not found" }, { status: 404 });
    entry.deleteOne();
    await motor.save();
    return NextResponse.json({ ok: true, motor: serializeTrackMotor(motor) });
  } catch (err) {
    console.error("Track documents DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
