import Listing from "@/models/Listing";
import Lead from "@/models/Lead";

export async function getListingIdsForUser(email) {
  if (!email) return [];
  const listings = await Listing.find({ email: email.trim().toLowerCase() })
    .select("_id")
    .lean();
  return listings.map((l) => l._id.toString());
}

export function leadBelongsToShop(lead, listingIds, userEmail) {
  const em = (userEmail || "").trim().toLowerCase();
  if (lead.createdByEmail?.toLowerCase() === em) return true;
  const listIds = lead.assignedListingIds || [];
  if (listIds.some((id) => listingIds.includes(id))) return true;
  if (lead.sourceListingId && listingIds.includes(lead.sourceListingId)) return true;
  return false;
}

export async function fetchLeadsForShopUser(userEmail) {
  const listingIds = await getListingIdsForUser(userEmail);
  const all = await Lead.find().sort({ createdAt: -1 }).lean();
  return all.filter((doc) => leadBelongsToShop(doc, listingIds, userEmail));
}
