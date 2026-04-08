import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { filterListingsByLocation } from "@/lib/location-filter";
import { ensureApprovedListingsHaveUrlSlug } from "@/lib/listing-url-slug";
import { getIdFromSlugParam } from "@/lib/listing-slug";

export async function getPublicListings() {
  await connectDB();
  await ensureApprovedListingsHaveUrlSlug();
  const list = await Listing.find({ status: "approved" })
    .sort({ directoryScore: -1, updatedAt: -1, companyName: 1 })
    .lean();
  return list.map((l) => ({
    ...l,
    id: l._id.toString(),
    _id: undefined,
  }));
}

export async function getListingsFilteredByLocation({ state, city, zip }) {
  const listings = await getPublicListings();
  return filterListingsByLocation(listings, { state, city, zip });
}

export async function getPublicListingById(id) {
  if (!id) return null;
  await connectDB();
  const doc = await Listing.findOne({ _id: id, status: "approved" }).lean();
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
  };
}

export async function getPublicListingByUrlSlug(urlSlug) {
  if (!urlSlug || typeof urlSlug !== "string") return null;
  await connectDB();
  await ensureApprovedListingsHaveUrlSlug();
  const trimmed = decodeURIComponent(urlSlug).trim();
  const doc = await Listing.findOne({ status: "approved", urlSlug: trimmed }).lean();
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
  };
}

/**
 * Resolve listing from URL slug (new urlSlug or legacy company-name-{objectId}).
 * @returns {{ listing: object | null, redirectToSlug: string | null }}
 */
export async function resolvePublicListingFromSlugParam(slugParam) {
  await ensureApprovedListingsHaveUrlSlug();
  const raw = decodeURIComponent((slugParam || "").trim());

  const bySlug = await getPublicListingByUrlSlug(raw);
  if (bySlug) return { listing: bySlug, redirectToSlug: null };

  const legacyId = getIdFromSlugParam(raw);
  if (legacyId) {
    const byId = await getPublicListingById(legacyId);
    if (byId?.urlSlug) {
      return { listing: byId, redirectToSlug: byId.urlSlug };
    }
  }
  return { listing: null, redirectToSlug: null };
}
