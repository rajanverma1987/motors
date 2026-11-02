import { NextResponse } from "next/server";
import { clientIpFromRequest, ipGeolocate } from "@/lib/visitor-location";

/**
 * GET: Approximate city, state, and ZIP from the visitor IP.
 */
export async function GET(request) {
  try {
    const location = await ipGeolocate(clientIpFromRequest(request));
    return NextResponse.json({
      city: location.city,
      state: location.state,
      zip: location.zip,
      country: location.country || "United States",
    });
  } catch (err) {
    console.warn("Geo lookup failed:", err.message);
    return NextResponse.json(
      { city: "", state: "", zip: "", country: "United States" },
      { status: 200 }
    );
  }
}
