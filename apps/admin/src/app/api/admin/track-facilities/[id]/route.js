import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  trackFacilityToAdminJson,
  revokeTrackAccess,
  grantTrackProDays,
  countActiveMotors,
} from "@/lib/track-subscription";

export const dynamic = "force-dynamic";

async function getId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return params?.id;
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const facility = await TrackFacility.findById(id);
    if (!facility) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.revokeAccess === true) {
      await revokeTrackAccess(facility);
    }
    if (typeof body.canLogin === "boolean") {
      facility.canLogin = body.canLogin;
      if (body.canLogin === false && body.revokeAccess !== true) {
        await revokeTrackAccess(facility);
      }
    }
    if (typeof body.facilityName === "string") {
      facility.facilityName = body.facilityName.trim();
    }
    if (typeof body.contactName === "string") {
      facility.contactName = body.contactName.trim();
    }
    if (typeof body.name === "string" && body.contactName === undefined) {
      facility.contactName = body.name.trim();
    }
    if (typeof body.phone === "string") {
      facility.phone = body.phone.trim();
    }
    if (body.grantProDays != null && body.grantProDays !== "") {
      grantTrackProDays(facility, body.grantProDays);
    }
    await facility.save();

    const fresh = await TrackFacility.findById(id).select("-passwordHash").lean();
    const motorCount = await countActiveMotors(id);
    return NextResponse.json({ account: trackFacilityToAdminJson(fresh, { motorCount }) });
  } catch (err) {
    console.error("PATCH admin track-facility:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
