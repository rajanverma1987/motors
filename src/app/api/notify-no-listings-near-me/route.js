import { NextResponse } from "next/server";
import { sendNoListingsNearMeNotification } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { LIMITS, clampString } from "@/lib/validation";
import { clientIpFromRequest, ipGeolocate, reverseGeocode } from "@/lib/visitor-location";
import { normalizeLocationInput } from "@/lib/us-state-normalize";

/**
 * POST: Notify contact@IQMotorBase.com when no listings were found for a location (near-me page).
 * Body: { city?: string, state?: string, zip?: string }
 */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "notify-no-listings", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    let city = clampString(body?.city, LIMITS.city);
    let state = clampString(body?.state, LIMITS.state);
    let zip = clampString(body?.zip, LIMITS.zip);
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    let source = clampString(body?.source, LIMITS.shortText);

    if (!city && !state && !zip && hasCoords) {
      const fromGps = normalizeLocationInput(await reverseGeocode(lat, lng));
      city = clampString(fromGps.city, LIMITS.city);
      state = clampString(fromGps.state, LIMITS.state);
      zip = clampString(fromGps.zip, LIMITS.zip);
      if (city || state || zip) source = source || "gps";
    }

    if (!city && !state && !zip) {
      const fromIp = normalizeLocationInput(await ipGeolocate(clientIpFromRequest(request)));
      city = clampString(fromIp.city, LIMITS.city);
      state = clampString(fromIp.state, LIMITS.state);
      zip = clampString(fromIp.zip, LIMITS.zip);
      if (city || state || zip) source = source || "ip";
    }

    const result = await sendNoListingsNearMeNotification(city, state, zip, {
      lat: hasCoords ? lat : undefined,
      lng: hasCoords ? lng : undefined,
      source,
    });
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
