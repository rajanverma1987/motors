/**
 * Directory listing profile score: services, capacity, capabilities, coverage, and profile completeness.
 * Higher = more complete / stronger directory presence. Used to sort public directory results.
 */

function nonEmptyStr(v) {
  if (v == null) return false;
  const s = String(v).trim();
  return s.length > 0;
}

function countArrayItems(arr) {
  if (!Array.isArray(arr)) return 0;
  return arr.filter((x) => nonEmptyStr(x)).length;
}

/**
 * @param {Record<string, unknown>} listingLike - plain object or lean listing document
 * @returns {number} score in [0, 1000]
 */
export function computeListingDirectoryScore(listingLike) {
  if (!listingLike || typeof listingLike !== "object") return 0;
  const l = listingLike;
  let score = 0;

  score += Math.min(countArrayItems(l.services) * 4, 40);
  score += Math.min(countArrayItems(l.motorCapabilities) * 3, 30);
  score += Math.min(countArrayItems(l.equipmentTesting) * 3, 24);
  score += Math.min(countArrayItems(l.rewindingCapabilities) * 3, 24);
  score += Math.min(countArrayItems(l.industriesServed) * 2, 16);
  score += Math.min(countArrayItems(l.certifications) * 2, 20);

  if (nonEmptyStr(l.maxMotorSizeHP)) score += 5;
  if (nonEmptyStr(l.maxVoltage)) score += 5;
  if (nonEmptyStr(l.maxWeightHandled)) score += 5;
  if (nonEmptyStr(l.shopSizeSqft)) score += 4;
  if (nonEmptyStr(l.numTechnicians)) score += 4;
  if (nonEmptyStr(l.numEngineers)) score += 2;
  if (nonEmptyStr(l.yearsCombinedExperience)) score += 3;
  if (nonEmptyStr(l.craneCapacity)) score += 3;
  if (nonEmptyStr(l.forkliftCapacity)) score += 3;
  if (nonEmptyStr(l.turnaroundTime)) score += 2;

  if (l.pickupDeliveryAvailable === true) score += 8;
  if (l.rushRepairAvailable === true) score += 5;

  if (nonEmptyStr(l.serviceZipCode) || nonEmptyStr(l.serviceRadiusMiles)) score += 4;
  if (nonEmptyStr(l.statesServed) && String(l.statesServed).trim().length > 2) score += 4;
  if (nonEmptyStr(l.citiesOrMetrosServed) && String(l.citiesOrMetrosServed).trim().length > 2) score += 4;
  if (nonEmptyStr(l.areaCoveredFrom) && String(l.areaCoveredFrom).trim().length > 2) score += 3;

  const desc = String(l.shortDescription || "").trim();
  if (desc.length >= 40) score += 4;
  if (desc.length >= 120) score += 4;
  if (desc.length >= 240) score += 4;

  if (nonEmptyStr(l.logoUrl)) score += 5;
  score += Math.min(countArrayItems(l.galleryPhotoUrls) * 2, 10);

  if (nonEmptyStr(l.yearsInBusiness)) score += 3;
  if (nonEmptyStr(l.phone)) score += 2;
  if (nonEmptyStr(l.website)) score += 2;
  if (nonEmptyStr(l.address) && nonEmptyStr(l.city) && nonEmptyStr(l.state) && nonEmptyStr(l.zipCode)) {
    score += 8;
  }

  return Math.min(Math.round(score), 1000);
}

/**
 * Merge existing listing (lean) with a PATCH $set object for score recomputation.
 * @param {Record<string, unknown>|null|undefined} existing
 * @param {Record<string, unknown>} patch
 */
export function mergeListingForDirectoryScore(existing, patch) {
  const out = { ...(existing || {}) };
  if (!patch || typeof patch !== "object") return out;
  for (const k of Object.keys(patch)) {
    if (Object.prototype.hasOwnProperty.call(patch, k) && patch[k] !== undefined) {
      out[k] = patch[k];
    }
  }
  return out;
}
