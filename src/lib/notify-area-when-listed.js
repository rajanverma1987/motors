import { connectDB } from "@/lib/db";
import AreaNotifyRequest from "@/models/AreaNotifyRequest";
import { matchesLocation } from "@/lib/location-filter";
import { sendAreaListedNotification } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

/**
 * When a listing is approved, find users who asked to be notified for this area
 * and email them. Subscribers stay on the list and get notified every time a
 * new shop is listed in their area. Email links to our site only (no shop contact info).
 * @param {Object} listing - Listing doc or plain object with city, state, zipCode, etc.
 */
export async function notifyAreaRequestsForListing(listing) {
  if (!listing) return;
  try {
    await connectDB();
    const requests = await AreaNotifyRequest.find({}).lean();
    const listingObj = listing.toObject ? listing.toObject() : listing;
    const locationLabel = [listingObj.city, listingObj.state, listingObj.zipCode].filter(Boolean).join(", ") || "your area";
    const shopListingsUrl = `${getPublicSiteUrl()}/electric-motor-reapir-near-me`;

    const toNotify = requests.filter((req) =>
      matchesLocation(listingObj, req.state, req.city, req.zip)
    );

    for (const req of toNotify) {
      try {
        await sendAreaListedNotification(req.email, locationLabel, shopListingsUrl);
      } catch (err) {
        console.error("Notify area request error for", req.email, err);
      }
    }
  } catch (err) {
    console.error("notifyAreaRequestsForListing error:", err);
  }
}
