import { NextResponse } from "next/server";
import { normalizeLocationInput } from "@/lib/us-state-normalize";

/**
 * GET /api/geo/reverse?lat=&lng=
 * Reverse-geocode coordinates to city/state/zip (US Census geocoder).
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

    const censusUrl = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
    censusUrl.searchParams.set("x", String(lng));
    censusUrl.searchParams.set("y", String(lat));
    censusUrl.searchParams.set("benchmark", "Public_AR_Current");
    censusUrl.searchParams.set("vintage", "Current_Current");
    censusUrl.searchParams.set("format", "json");

    const res = await fetch(censusUrl.toString(), { next: { revalidate: 86400 } });
    if (!res.ok) {
      return NextResponse.json({ city: "", state: "", zip: "", country: "United States" });
    }

    const data = await res.json();
    const geographies = data?.result?.geographies || {};
    const places = geographies["Places"] || geographies["Incorporated Places"] || [];
    const counties = geographies["Counties"] || [];
    const states = geographies["States"] || [];
    const zctas = geographies["2020 Census ZIP Code Tabulation Areas"] || geographies["ZIP Code Tabulation Areas"] || [];

    const placeName = places[0]?.NAME || counties[0]?.NAME || "";
    const city = placeName.replace(/\s+(city|town|village|CDP)$/i, "").trim();
    const stateName = states[0]?.NAME || "";
    const zip = zctas[0]?.ZCTA5 || zctas[0]?.GEOID || "";

    const normalized = normalizeLocationInput({ city, state: stateName, zip });

    return NextResponse.json({
      city: normalized.city,
      state: normalized.state,
      zip: normalized.zip,
      country: "United States",
    });
  } catch (err) {
    console.warn("Reverse geo lookup failed:", err.message);
    return NextResponse.json(
      { city: "", state: "", zip: "", country: "United States" },
      { status: 200 }
    );
  }
}
