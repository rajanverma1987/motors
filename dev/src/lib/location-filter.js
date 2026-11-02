/**
 * Shared location-matching logic for listings (used by public API and location/SEO pages).
 */
function norm(v) {
  return String(v || "").trim().toLowerCase();
}

export function isListingBasedInArea(listing, { state, city, zip } = {}) {
  const s = norm(state);
  const c = norm(city);
  const z = norm(zip);
  const listState = norm(listing?.state);
  const listCity = norm(listing?.city);
  const listZip = norm(listing?.zipCode);

  if (z && listZip === z) return true;
  if (c && listCity === c && (!s || listState === s)) return true;
  if (s && !c && listState === s) return true;
  if (s && c && listState === s && listCity === c) return true;
  return false;
}

/** @returns {"based-in"|"serves"|null} */
export function getListingLocationMatchType(listing, { state, city, zip } = {}) {
  if (!matchesLocation(listing, state, city, zip)) return null;
  return isListingBasedInArea(listing, { state, city, zip }) ? "based-in" : "serves";
}

export function matchesLocation(listing, state, city, zip) {
  const s = (state || "").trim().toLowerCase();
  const c = (city || "").trim().toLowerCase();
  const z = (zip || "").trim().toLowerCase();
  if (!s && !c && !z) return true;

  const listStr = (v) => (v || "").trim().toLowerCase();
  const listState = listStr(listing.state);
  const listCity = listStr(listing.city);
  const listZip = listStr(listing.zipCode);
  const listServiceZip = listStr(listing.serviceZipCode);
  const listStatesServed = listStr(listing.statesServed);
  const listCitiesServed = listStr(listing.citiesOrMetrosServed);

  if (s && (listState === s || listStatesServed.includes(s))) return true;
  if (z && (listZip === z || listServiceZip === z)) return true;
  if (c && (listCity === c || listCitiesServed.includes(c))) return true;
  return false;
}

/**
 * Filter a list of listings by state, city, and/or zip.
 */
export function filterListingsByLocation(listings, { state, city, zip }) {
  if (!state && !city && !zip) return listings;
  return listings.filter((l) => matchesLocation(l, state, city, zip));
}
