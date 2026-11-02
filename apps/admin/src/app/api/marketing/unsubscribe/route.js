import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import ListingMarketingState from "@/models/ListingMarketingState";
import MarketingContact from "@/models/MarketingContact";
import { verifyListingMarketingUnsubscribeToken } from "@/lib/listing-marketing-unsubscribe";

export function GET(request) {
  return handleUnsubscribe(request);
}

export async function handleUnsubscribe(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email")?.trim()?.toLowerCase();
    const token = searchParams.get("token");
    const baseUrl = getPublicSiteUrl(request);
    const successUrl = `${baseUrl}/unsubscribe/success`;

    if (!email) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=missing`);
    }
    if (!verifyListingMarketingUnsubscribeToken(email, token)) {
      return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=invalid`);
    }

    await connectDB();
    const now = new Date();

    const listings = await Listing.find({ email }).select("_id").lean();
    for (const listing of listings) {
      await ListingMarketingState.findOneAndUpdate(
        { listingId: listing._id },
        {
          $set: {
            listingId: listing._id,
            unsubscribedAt: now,
            awaitingRestartTemplate: false,
          },
        },
        { upsert: true }
      );
    }

    // Legacy contacts collection (no longer used by admin UI).
    const contact = await MarketingContact.findOne({ email });
    if (contact) {
      contact.status = "unsubscribed";
      await contact.save();
    }

    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error("Unsubscribe error:", err);
    const baseUrl = getPublicSiteUrl(request);
    return NextResponse.redirect(`${baseUrl}/unsubscribe/success?error=1`);
  }
}
