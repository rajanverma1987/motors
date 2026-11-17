import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { checkRateLimit } from "@/lib/rate-limit";
import { toPublicListing } from "@/lib/listing-public-fields";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const { allowed } = await checkRateLimit(request, "listing-public-detail", 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Listing.findOne({ _id: id, status: "approved" }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Contact details are released only by the contact-unlock flow, never here.
    return NextResponse.json(
      toPublicListing(doc),
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err) {
    console.error("Get public listing error:", err);
    return NextResponse.json(
      { error: "Failed to load" },
      { status: 500 }
    );
  }
}
