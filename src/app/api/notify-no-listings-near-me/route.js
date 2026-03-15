import { NextResponse } from "next/server";
import { sendNoListingsNearMeNotification } from "@/lib/email";

/**
 * POST: Notify contact@MotorsWinding.com when no listings were found for a location (near-me page).
 * Body: { city?: string, state?: string, zip?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const city = (body?.city ?? "").trim();
    const state = (body?.state ?? "").trim();
    const zip = (body?.zip ?? "").trim();

    if (!city && !state && !zip) {
      return NextResponse.json(
        { error: "At least one of city, state, or zip is required." },
        { status: 400 }
      );
    }

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
