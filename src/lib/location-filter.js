/**
 * Shared location-matching logic for listings (used by public API and location/SEO pages).
 */
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
