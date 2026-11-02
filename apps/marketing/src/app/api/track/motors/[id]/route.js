import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackMaintenanceLog from "@/models/TrackMaintenanceLog";
import TrackServiceHistory from "@/models/TrackServiceHistory";
import TrackDatasheetVersion from "@/models/TrackDatasheetVersion";
import TrackRfqRequest from "@/models/TrackRfqRequest";
import {
  getTrackFacilityFromRequest,
  serializeTrackDatasheetVersion,
  serializeTrackMaintenanceLog,
  serializeTrackMotor,
  serializeTrackServiceHistory,
  trackUnauthorized,
} from "@/lib/track-auth";
import { applyTrackMotorFields, validateTrackMotor } from "@/lib/track-motor-input";
import { serializeTrackRfq } from "@/lib/track-rfq";
import { trackDatasheetProvenanceLine, flattenTrackDatasheet } from "@/lib/track-datasheet";

export const dynamic = "force-dynamic";

async function resolveId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return String(params?.id || "").trim();
}

async function loadOwnedMotor(facility, id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return TrackMotor.findOne({ _id: id, facilityId: facility._id });
}

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const id = await resolveId(context);
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const [logs, history, versions, rfqs] = await Promise.all([
      TrackMaintenanceLog.find({ motorId: doc._id }).sort({ performedAt: -1 }).limit(200).lean(),
      TrackServiceHistory.find({ motorId: doc._id }).sort({ completedAt: -1 }).limit(100).lean(),
      TrackDatasheetVersion.find({ motorId: doc._id }).sort({ version: -1 }).limit(30).lean(),
      TrackRfqRequest.find({ motorId: doc._id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const latestVersion = versions[0] || null;
    const datasheet = latestVersion
      ? {
          ...serializeTrackDatasheetVersion(latestVersion),
          provenanceLine: trackDatasheetProvenanceLine(latestVersion),
          groups: flattenTrackDatasheet(
            latestVersion.data,
            latestVersion.powerType,
            latestVersion.fieldProvenance
          ),
        }
      : null;

    const serializedRfqs = rfqs.map(serializeTrackRfq);
    const openRfq =
      serializedRfqs.find((r) => ["open", "awarded", "in_repair", "repaired"].includes(r.status)) || null;

    return NextResponse.json({
      ok: true,
      motor: serializeTrackMotor(doc),
      maintenanceLogs: logs.map(serializeTrackMaintenanceLog),
      serviceHistory: history.map(serializeTrackServiceHistory),
      datasheet,
      datasheetVersions: versions.map((v) => ({
        ...serializeTrackDatasheetVersion(v),
        provenanceLine: trackDatasheetProvenanceLine(v),
      })),
      rfqs: serializedRfqs,
      openRfq,
    });
  } catch (err) {
    console.error("Track motor GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const id = await resolveId(context);
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    applyTrackMotorFields(body, doc);
    if (body.archived !== undefined) doc.archived = Boolean(body.archived);
    if (body.clearDatasheetReviewFlag === true) doc.datasheetReviewFlag = "";

    const error = validateTrackMotor(doc);
    if (error) return NextResponse.json({ error }, { status: 400 });

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
    const id = await resolveId(context);
    const doc = await loadOwnedMotor(facility, id);
    if (!doc) return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    if (doc.openRfqId) {
      return NextResponse.json(
        { error: "This motor has an open RFQ. Cancel the RFQ before archiving it." },
        { status: 409 }
      );
    }
    doc.archived = true;
    await doc.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Track motor DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
