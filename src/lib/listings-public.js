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

export async function getPublicListingsPaginated({
  search,
  city,
  state,
  page = 1,
  pageSize = 40,
}) {
  await connectDB();
  await ensureApprovedListingsHaveUrlSlug();

  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.max(1, Number(pageSize) || 40);
  const normalizedSearch = (search || "").trim();
  const normalizedCity = (city || "").trim();
  const normalizedState = (state || "").trim();

  const andFilters = [{ status: "approved" }];

  if (normalizedCity || normalizedState) {
    const locationOr = [];
    if (normalizedCity) {
      locationOr.push(
        { city: new RegExp(`^${escapeRegExp(normalizedCity)}$`, "i") },
        { citiesOrMetrosServed: new RegExp(escapeRegExp(normalizedCity), "i") }
      );
    }
    if (normalizedState) {
      locationOr.push(
        { state: new RegExp(`^${escapeRegExp(normalizedState)}$`, "i") },
        { statesServed: new RegExp(escapeRegExp(normalizedState), "i") }
      );
    }
    andFilters.push({ $or: locationOr });
  }

  if (normalizedSearch) {
    const searchRegex = new RegExp(escapeRegExp(normalizedSearch), "i");
    andFilters.push({
      $or: [
        { companyName: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
        { zipCode: searchRegex },
        { serviceZipCode: searchRegex },
      ],
    });
  }

  const query = andFilters.length === 1 ? andFilters[0] : { $and: andFilters };
  const total = await Listing.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const effectivePage = Math.min(normalizedPage, totalPages);
  const skip = (effectivePage - 1) * normalizedPageSize;

  const list = await Listing.find(query)
    .sort({ directoryScore: -1, updatedAt: -1, companyName: 1 })
    .skip(skip)
    .limit(normalizedPageSize)
    .lean();

  return {
    listings: list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    })),
    total,
    page: effectivePage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

export async function getListingsFilteredByLocationPaginated({
  state,
  city,
  zip,
  page = 1,
  pageSize = 45,
}) {
  await connectDB();
  await ensureApprovedListingsHaveUrlSlug();

  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedPageSize = Math.max(1, Number(pageSize) || 45);
  const normalizedState = (state || "").trim();
  const normalizedCity = (city || "").trim();
  const normalizedZip = (zip || "").trim();

  const orFilters = [];
  if (normalizedState) {
    orFilters.push(
      { state: new RegExp(`^${escapeRegExp(normalizedState)}$`, "i") },
      { statesServed: new RegExp(escapeRegExp(normalizedState), "i") }
    );
  }
  if (normalizedCity) {
    orFilters.push(
      { city: new RegExp(`^${escapeRegExp(normalizedCity)}$`, "i") },
      { citiesOrMetrosServed: new RegExp(escapeRegExp(normalizedCity), "i") }
    );
  }
  if (normalizedZip) {
    orFilters.push(
      { zipCode: new RegExp(`^${escapeRegExp(normalizedZip)}$`, "i") },
      { serviceZipCode: new RegExp(`^${escapeRegExp(normalizedZip)}$`, "i") }
    );
  }

  const query = orFilters.length > 0 ? { status: "approved", $or: orFilters } : { status: "approved" };
  const total = await Listing.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
  const effectivePage = Math.min(normalizedPage, totalPages);
  const skip = (effectivePage - 1) * normalizedPageSize;

  const list = await Listing.find(query)
    .sort({ directoryScore: -1, updatedAt: -1, companyName: 1 })
    .skip(skip)
    .limit(normalizedPageSize)
    .lean();

  return {
    listings: list.map((l) => ({
      ...l,
      id: l._id.toString(),
      _id: undefined,
    })),
    total,
    page: effectivePage,
    pageSize: normalizedPageSize,
    totalPages,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
