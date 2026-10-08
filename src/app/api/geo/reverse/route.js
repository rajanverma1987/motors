import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/visitor-location";

/**
 * GET /api/geo/reverse?lat=&lng=
 * Reverse-geocode coordinates to city, state, and ZIP.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Valid lat and lng are required." }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Coordinates out of range." }, { status: 400 });
    }

    const location = await reverseGeocode(lat, lng);
    return NextResponse.json({
      city: location.city,
      state: location.state,
      zip: location.zip,
      country: location.country || "United States",
    });
  } catch (err) {
    console.warn("Reverse geo lookup failed:", err.message);
    return NextResponse.json(
      { city: "", state: "", zip: "", country: "United States" },
      { status: 200 }
    );
  }
}
