import { NextResponse } from "next/server";
import { getListingsFilteredByLocationPaginated } from "@/lib/listings-public";
import { getListingLocationMatchType } from "@/lib/location-filter";
import { normalizeLocationInput } from "@/lib/us-state-normalize";

const MAX_RESULTS = 100;

function matchRank(type) {
  if (type === "based-in") return 0;
  if (type === "serves") return 1;
  return 2;
}

/**
 * GET /api/listings/nearby?city=&state=&zip=
 * Location-aware listing search with based-in / serves ranking.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const location = normalizeLocationInput({
      city: searchParams.get("city"),
      state: searchParams.get("state"),
      zip: searchParams.get("zip"),
    });

    if (!location.city && !location.state && !location.zip) {
      return NextResponse.json(
        { error: "Provide at least one of city, state, or zip." },
        { status: 400 }
      );
    }

    const { listings, total } = await getListingsFilteredByLocationPaginated({
      city: location.city,
      state: location.state,
      zip: location.zip,
      page: 1,
      pageSize: MAX_RESULTS,
    });

    const area = { city: location.city, state: location.state, zip: location.zip };
    const ranked = listings
      .map((listing) => {
        const locationMatchType = getListingLocationMatchType(listing, area);
        return { ...listing, locationMatchType };
      })
      .sort((a, b) => {
        const byMatch = matchRank(a.locationMatchType) - matchRank(b.locationMatchType);
        if (byMatch !== 0) return byMatch;
        return (b.directoryScore || 0) - (a.directoryScore || 0);
      });

    return NextResponse.json(
      {
        listings: ranked,
        total,
        location,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("Nearby listings error:", err);
    return NextResponse.json({ error: "Failed to load nearby listings" }, { status: 500 });
  }
}
