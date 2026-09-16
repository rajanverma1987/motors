import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getTrackFacilityFromRequest, trackSessionPayload, trackUnauthorized } from "@/lib/track-auth";
import { LIMITS, clampString } from "@/lib/validation";

export const dynamic = "force-dynamic";

const FIELDS = {
  facilityName: 160,
  contactName: LIMITS.name.max,
  phone: 40,
  address: 240,
  city: 80,
  state: 80,
  postalCode: 30,
  country: 80,
};

/**
 * §6.2 - the facility profile. The address is used to rank nearby shops and is
 * sent with every RFQ, so it is editable in the app.
 */
export async function PATCH(request) {
  try {
    const authed = await getTrackFacilityFromRequest(request);
    if (!authed) return NextResponse.json(trackUnauthorized(), { status: 401 });
    await connectDB();
    const facility = await TrackFacility.findById(authed._id);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    const body = await request.json().catch(() => ({}));
    for (const [key, max] of Object.entries(FIELDS)) {
      if (body[key] === undefined) continue;
      facility[key] = clampString(body[key], max);
    }
    if (body.countryCode !== undefined) {
      const code = String(body.countryCode || "").trim().toUpperCase();
      facility.countryCode = /^[A-Z]{2}$/.test(code) ? code : "";
    }
    if (!facility.facilityName) {
      return NextResponse.json({ error: "Facility name is required." }, { status: 400 });
    }
    if (!facility.contactName) {
      return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
    }
    await facility.save();

    return NextResponse.json({ ok: true, session: await trackSessionPayload(facility) });
  } catch (err) {
    console.error("Track facility PATCH:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
