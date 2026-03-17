import { NextResponse } from "next/server";
import { sendNoListingsNearMeNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { LIMITS, clampString } from "@/lib/validation";

/**
 * POST: Notify contact@MotorsWinding.com when no listings were found for a location (near-me page).
 * Body: { city?: string, state?: string, zip?: string }
 */
export async function POST(request) {
  const { allowed } = checkRateLimit(request, "notify-no-listings", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const city = clampString(body?.city, LIMITS.city);
    const state = clampString(body?.state, LIMITS.state);
    const zip = clampString(body?.zip, LIMITS.zip);

    const result = await sendNoListingsNearMeNotification(city, state, zip);
    if (!result.ok) {
      console.error("Notify no-listings-near-me email error:", result.error);
      return NextResponse.json(
        { error: "Failed to send notification. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Notify no-listings-near-me error:", err);
    return NextResponse.json(
      { error: err.message || "Request failed" },
      { status: 500 }
    );
  }
}
