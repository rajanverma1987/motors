import { NextResponse } from "next/server";
import { normalizeLocationInput } from "@/lib/us-state-normalize";

/**
 * GET: Return approximate location (city, state, zip, country) from the request IP.
 * Used to pre-fill address on the listing form. No auth required.
 */
export async function GET(request) {
  try {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "";
    const url = ip
      ? `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,zip,country`
      : "https://ip-api.com/json/?fields=status,city,regionName,zip,country";
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    if (data.status !== "success") {
      return NextResponse.json({ city: "", state: "", zip: "", country: "United States" });
    }
    const normalized = normalizeLocationInput({
      city: data.city,
      state: data.regionName,
      zip: data.zip,
    });
    return NextResponse.json({
      city: normalized.city,
      state: normalized.state,
      zip: normalized.zip,
      country: data.country || "United States",
    });
  } catch (err) {
    console.warn("Geo lookup failed:", err.message);
    return NextResponse.json(
      { city: "", state: "", zip: "", country: "United States" },
      { status: 200 }
    );
  }
}
