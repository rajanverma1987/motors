import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import TrackMotor from "@/models/TrackMotor";
import TrackServiceHistory, { TRACK_WORK_TYPES } from "@/models/TrackServiceHistory";
import {
  getTrackFacilityFromRequest,
  serializeTrackServiceHistory,
  trackUnauthorized,
} from "@/lib/track-auth";
import { clampString } from "@/lib/validation";
import { recalcTrackMotorRepairTotals } from "@/lib/track-integration";

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

function numberOrNull(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export async function GET(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    const rows = await TrackServiceHistory.find({ motorId: motor._id })
      .sort({ completedAt: -1 })
      .limit(200)
      .lean();
    const totalCost = rows.reduce((sum, row) => sum + (Number(row.finalCost) || 0), 0);
    return NextResponse.json({
      ok: true,
      entries: rows.map(serializeTrackServiceHistory),
      repairCount: rows.length,
      totalCost: Math.round(totalCost * 100) / 100,
    });
  } catch (err) {
    console.error("Track service history GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });
    const motor = await loadOwnedMotor(facility, await resolveId(context));
    if (!motor) return NextResponse.json({ error: "Motor not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const completedRaw = body?.completedAt ? new Date(body.completedAt) : null;
    if (!completedRaw || Number.isNaN(completedRaw.getTime())) {
      return NextResponse.json({ error: "Enter the date the work was completed." }, { status: 400 });
    }
    const workType = TRACK_WORK_TYPES.includes(String(body?.workType || ""))
      ? String(body.workType)
      : "other";
    const finalCost = numberOrNull(body?.finalCost);
    const warrantyMonths = numberOrNull(body?.warrantyMonths);
    let warrantyExpiresAt = null;
    if (warrantyMonths) {
      warrantyExpiresAt = new Date(completedRaw);
      warrantyExpiresAt.setMonth(warrantyExpiresAt.getMonth() + Number(warrantyMonths));
    }

    const doc = await TrackServiceHistory.create({
      facilityId: facility._id,
      motorId: motor._id,
      completedAt: completedRaw,
      shopName: clampString(body?.shopName, 160),
      jobNumber: clampString(body?.jobNumber, 80),
      invoiceNumber: clampString(body?.invoiceNumber, 80),
      workType,
      description: clampString(body?.description, 4000),
      finalCost,
      currency: String(body?.currency || "USD").toUpperCase().slice(0, 3),
      costSource: finalCost === null ? "" : "manual",
      turnaroundDays: numberOrNull(body?.turnaroundDays),
      failureCause: clampString(body?.failureCause, 1000),
      testReportUrl: clampString(body?.testReportUrl, 500),
      attachments: (Array.isArray(body?.attachments) ? body.attachments : [])
        .map((u) => clampString(u, 500))
        .filter(Boolean)
        .slice(0, 6),
      warrantyMonths,
      warrantyExpiresAt,
      source: "manual",
    });

    await recalcTrackMotorRepairTotals(motor._id);
    return NextResponse.json({ ok: true, entry: serializeTrackServiceHistory(doc) }, { status: 201 });
  } catch (err) {
    console.error("Track service history POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
