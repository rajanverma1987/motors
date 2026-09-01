import { getListingLocationMatchType, isListingBasedInArea } from "@/lib/location-filter";
import { comparePublicListings } from "@/lib/listing-premium";

function hasRewinding(listing) {
  const caps = [
    ...(Array.isArray(listing?.rewindingCapabilities) ? listing.rewindingCapabilities : []),
    ...(Array.isArray(listing?.services) ? listing.services : []),
    ...(Array.isArray(listing?.motorCapabilities) ? listing.motorCapabilities : []),
  ]
    .join(" ")
    .toLowerCase();
  return /rewind|re-wind|stator|armature|coil/.test(caps);
}

function collectTopLabels(listings, key, limit = 6) {
  const counts = new Map();
  for (const listing of listings) {
    const items = Array.isArray(listing?.[key]) ? listing[key] : [];
    for (const raw of items) {
      const label = String(raw || "").trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/**
 * @param {object[]} listings
 * @param {{ state?: string, city?: string, zip?: string }} area
 */
export function buildLocationListingInsights(listings, area = {}) {
  const list = Array.isArray(listings) ? listings : [];
  let basedIn = 0;
  let serves = 0;
  let rewinding = 0;
  let pickup = 0;
  let rush = 0;

  for (const listing of list) {
    const match = getListingLocationMatchType(listing, area);
    if (match === "based-in") basedIn += 1;
    else if (match === "serves") serves += 1;
    if (hasRewinding(listing)) rewinding += 1;
    if (listing?.pickupDeliveryAvailable) pickup += 1;
    if (listing?.rushRepairAvailable) rush += 1;
  }

  return {
    total: list.length,
    basedIn,
    serves,
    rewinding,
    pickup,
    rush,
    topIndustries: collectTopLabels(list, "industriesServed"),
    topCapabilities: collectTopLabels(list, "motorCapabilities"),
    topServices: collectTopLabels(list, "services"),
  };
}

export function filterListingsForLocationPage(listings, { match, capability, area } = {}) {
  let out = Array.isArray(listings) ? [...listings] : [];
  const matchNorm = String(match || "").trim().toLowerCase();
  const capNorm = String(capability || "").trim().toLowerCase();
  const areaFilter = area || {};

  if (matchNorm === "based-in") {
    out = out.filter((l) => isListingBasedInArea(l, areaFilter));
  } else if (matchNorm === "serves") {
    out = out.filter((l) => !isListingBasedInArea(l, areaFilter));
  }

  if (capNorm === "rewinding") {
    out = out.filter(hasRewinding);
  } else if (capNorm === "pickup") {
    out = out.filter((l) => !!l?.pickupDeliveryAvailable);
  } else if (capNorm === "rush") {
    out = out.filter((l) => !!l?.rushRepairAvailable);
  }

  out.sort(comparePublicListings);
  return out;
}

/** Paginate an in-memory listing array. */
export function paginateListings(listings, { page = 1, pageSize = 45 } = {}) {
  const total = listings.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const effectivePage = Math.min(Math.max(1, page), totalPages);
  const skip = (effectivePage - 1) * pageSize;
  return {
    listings: listings.slice(skip, skip + pageSize),
    total,
    page: effectivePage,
    pageSize,
    totalPages,
  };
}
