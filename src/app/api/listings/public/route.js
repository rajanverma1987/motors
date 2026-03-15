import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { filterListingsByLocation } from "@/lib/location-filter";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || "";
    const city = searchParams.get("city") || "";
    const zip = searchParams.get("zip") || "";

    await connectDB();
    const list = await Listing.find({ status: "approved" })
      .sort({ companyName: 1 })
      .lean();
    const withId = list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    }));

    const filtered = filterListingsByLocation(withId, { state, city, zip });

    return NextResponse.json(filtered, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Public listings error:", err);
    return NextResponse.json(
      { error: "Failed to load" },
      { status: 500 }
    );
  }
}
