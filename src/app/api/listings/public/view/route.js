import { NextResponse } from "next/server";
import { recordListingPageView } from "@/lib/listing-page-views";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const listingId = String(body?.listingId || "").trim();
    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 });
    }

    const recorded = await recordListingPageView(listingId);
    if (!recorded) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/listings/public/view:", err);
    return NextResponse.json({ error: "Failed to record view" }, { status: 500 });
  }
}
