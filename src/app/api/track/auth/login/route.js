import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { verifyPassword, createTrackToken } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";
import { trackSessionPayload } from "@/lib/track-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "track-login", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password || !isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });
    }
    await connectDB();
    const facility = await TrackFacility.findOne({ email }).select("+passwordHash");
    if (!facility || facility.canLogin === false) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    const ok = await verifyPassword(password, facility.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    facility.lastLoginAt = new Date();
    await facility.save();
    const token = await createTrackToken({
      facilityId: facility._id.toString(),
      email: facility.email,
      contactName: facility.contactName,
    });
    const session = await trackSessionPayload(facility);
    return NextResponse.json({ ok: true, token, session });
  } catch (err) {
    console.error("Track login:", err);
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
