import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackDatasheetVersion from "@/models/TrackDatasheetVersion";
import {
  getTrackFacilityFromRequest,
  serializeTrackDatasheetVersion,
  trackUnauthorized,
} from "@/lib/track-auth";
import {
  flattenTrackDatasheet,
  mergeTrackDatasheet,
  trackDatasheetFieldPaths,
  trackDatasheetProvenanceLine,
} from "@/lib/track-datasheet";

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

function decorate(version) {
  if (!version) return null;
  return {
    ...serializeTrackDatasheetVersion(version),
    provenanceLine: trackDatasheetProvenanceLine(version),
    groups: flattenTrackDatasheet(version.data, version.powerType, version.fieldProvenance),
  };
}

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const versions = await TrackDatasheetVersion.find({ motorId: motor._id })
      .sort({ version: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      ok: true,
      powerType: motor.powerType,
      fields: trackDatasheetFieldPaths(motor.powerType),
      latest: decorate(versions[0] || null),
      versions: versions.map((v) => ({
        ...serializeTrackDatasheetVersion(v),
        provenanceLine: trackDatasheetProvenanceLine(v),
      })),
      reviewFlag: motor.datasheetReviewFlag || "",
    });
  } catch (err) {
    console.error("Track datasheet GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/**
 * Facility-entered datasheet values (§16 D4: allowed, with "Plant entered" provenance).
 * Every save creates a new version; earlier versions stay viewable.
 */
export async function PATCH(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const values = body?.values && typeof body.values === "object" ? body.values : null;
    if (!values) {
      return NextResponse.json({ error: "No datasheet values supplied." }, { status: 400 });
    }

    const powerType = String(motor.powerType || "AC").toUpperCase() === "DC" ? "DC" : "AC";
    const allowed = new Set(trackDatasheetFieldPaths(powerType).map((f) => f.path));
    const incoming = {};
    for (const [path, value] of Object.entries(values)) {
      if (!allowed.has(path)) continue;
      const [block, key] = path.split(".");
      if (!incoming[block]) incoming[block] = {};
      incoming[block][key] = String(value ?? "").trim();
    }
    if (Object.keys(incoming).length === 0) {
      return NextResponse.json({ error: "No recognised datasheet fields supplied." }, { status: 400 });
    }

    const latest = await TrackDatasheetVersion.findOne({ motorId: motor._id, powerType })
      .sort({ version: -1 })
      .lean();

    const merged = mergeTrackDatasheet({
      current: latest?.data || null,
      currentProvenance: latest?.fieldProvenance || {},
      incoming,
      powerType,
      sourceType: "facility",
      sourceLabel: facility.facilityName || "Plant",
      at: new Date(),
    });

    if (!merged.changed) {
      return NextResponse.json({ ok: true, changed: false, latest: decorate(latest) });
    }

    const highest = await TrackDatasheetVersion.findOne({ motorId: motor._id })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const nextVersion = (Number(highest?.version) || 0) + 1;

    const created = await TrackDatasheetVersion.create({
      facilityId: facility._id,
      motorId: motor._id,
      version: nextVersion,
      powerType,
      data: merged.data,
      fieldProvenance: merged.fieldProvenance,
      changedFields: merged.changedFields,
      sourceType: "facility",
      sourceLabel: facility.facilityName || "Plant",
      recordedAt: new Date(),
    });

    motor.datasheetVersion = nextVersion;
    await motor.save();

    return NextResponse.json({ ok: true, changed: true, latest: decorate(created.toObject()) });
  } catch (err) {
    console.error("Track datasheet PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
