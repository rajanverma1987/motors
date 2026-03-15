import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AreaNotifyRequest from "@/models/AreaNotifyRequest";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

/**
 * POST: Save "notify me when there's a listing in my area" request.
 * Body: { email: string, city?: string, state?: string, zip?: string }
 */
export async function POST(request) {
  const { allowed } = checkRateLimit(request, "area-notify", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const email = (body?.email ?? "").trim().toLowerCase().slice(0, LIMITS.email.max);
    const city = clampString(body?.city, LIMITS.city);
    const state = clampString(body?.state, LIMITS.state);
    const zip = clampString(body?.zip, LIMITS.zip);

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    await connectDB();
    await AreaNotifyRequest.findOneAndUpdate(
      { email, city, state, zip },
      { email, city, state, zip },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Area notify request error:", err);
    return NextResponse.json(
      { error: err.message || "Request failed" },
      { status: 500 }
    );
  }
}
