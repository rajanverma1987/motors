/**
 * Industrial lead qualification for public website / directory repair requests.
 * Platform floor: shops should not be notified for residential, pool/spa, or sub-min HP work.
 */

/** Default minimum HP for routing to shops when a listing has no minMotorSizeHP. */
export const PLATFORM_MIN_ROUTE_HP = 5;

export const LEAD_BUYER_TYPE_OPTIONS = [
  { value: "", label: "Select buyer type…" },
  { value: "industrial_plant", label: "Industrial plant / manufacturing" },
  { value: "commercial", label: "Commercial facility" },
  { value: "oem_contractor", label: "OEM / contractor" },
  { value: "municipal_utility", label: "Municipal / utility" },
  { value: "residential", label: "Residential / homeowner" },
];

export const QUALIFICATION_STATUS = {
  QUALIFIED: "qualified",
  MISSING_COMPANY: "missing_company",
  MISSING_HP: "missing_hp",
  BELOW_MIN_HP: "below_min_hp",
  RESIDENTIAL: "residential",
  POOL_OR_SPA: "pool_or_spa",
  NO_MATCHING_SHOP: "no_matching_shop",
};

const RESIDENTIAL_BUYER = "residential";

const POOL_SPA_RE =
  /\b(pool\s*pump|spa\s*pump|hot\s*tub|jacuzzi|swim(?:ming)?\s*pool|pool\s*motor|spa\s*motor|above[- ]ground\s*pool)\b/i;

const RESIDENTIAL_RE =
  /\b(residential|homeowner|home\s*owner|my\s*house|our\s*house|garage\s*door|ceiling\s*fan|well\s*pump\s*(?:at\s*)?(?:home|house)|furnace\s*blower\s*(?:at\s*)?home)\b/i;

/**
 * Parse horsepower from free text ("50", "50 HP", "7.5hp", "1/2").
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseMotorHp(raw) {
  const s = String(raw ?? "").trim().toLowerCase().replace(/,/g, "");
  if (!s) return null;
  const frac = s.match(/^(\d+)\s*\/\s*(\d+)/);
  if (frac) {
    const a = Number(frac[1]);
    const b = Number(frac[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
  }
  const m = s.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parseListingMinHp(raw) {
  const n = parseMotorHp(raw);
  if (n == null || n <= 0) return PLATFORM_MIN_ROUTE_HP;
  return Math.max(PLATFORM_MIN_ROUTE_HP, n);
}

/**
 * @param {unknown} raw
 * @returns {number|null}
 */
export function parseListingMaxHp(raw) {
  const n = parseMotorHp(raw);
  if (n == null || n <= 0) return null;
  return n;
}

/**
 * @param {{
 *   company?: string,
 *   motorHp?: string|number,
 *   buyerType?: string,
 *   motorType?: string,
 *   problemDescription?: string,
 *   message?: string,
 *   voltage?: string,
 * }} input
 */
export function qualifyWebsiteLead(input = {}) {
  const company = String(input.company || "").trim();
  const buyerType = String(input.buyerType || "").trim().toLowerCase();
  const motorType = String(input.motorType || "").trim();
  const problemDescription = String(input.problemDescription || "").trim();
  const message = String(input.message || "").trim();
  const motorHpRaw = input.motorHp;
  const haystack = [motorType, problemDescription, message].filter(Boolean).join("\n");

  if (!company) {
    return {
      ok: false,
      routeToShops: false,
      status: QUALIFICATION_STATUS.MISSING_COMPANY,
      reason: "Company or facility name is required for industrial matching.",
      parsedHp: null,
      httpStatus: 400,
    };
  }

  const parsedHp = parseMotorHp(motorHpRaw);
  if (parsedHp == null) {
    return {
      ok: false,
      routeToShops: false,
      status: QUALIFICATION_STATUS.MISSING_HP,
      reason: "Motor horsepower (HP) is required so we can match industrial shops.",
      parsedHp: null,
      httpStatus: 400,
    };
  }

  if (buyerType === RESIDENTIAL_BUYER) {
    return {
      ok: true,
      routeToShops: false,
      status: QUALIFICATION_STATUS.RESIDENTIAL,
      reason:
        "Residential and homeowner requests are not routed to industrial repair shops on 3PhaseFlow.",
      parsedHp,
      httpStatus: 200,
    };
  }

  if (POOL_SPA_RE.test(haystack)) {
    return {
      ok: true,
      routeToShops: false,
      status: QUALIFICATION_STATUS.POOL_OR_SPA,
      reason:
        "Pool, spa, and similar residential pump motors are not routed to industrial shops.",
      parsedHp,
      httpStatus: 200,
    };
  }

  if (RESIDENTIAL_RE.test(haystack) && parsedHp < PLATFORM_MIN_ROUTE_HP) {
    return {
      ok: true,
      routeToShops: false,
      status: QUALIFICATION_STATUS.RESIDENTIAL,
      reason:
        "This looks like residential work below our industrial matching threshold.",
      parsedHp,
      httpStatus: 200,
    };
  }

  if (parsedHp < PLATFORM_MIN_ROUTE_HP) {
    return {
      ok: true,
      routeToShops: false,
      status: QUALIFICATION_STATUS.BELOW_MIN_HP,
      reason: `We match industrial and commercial motors ${PLATFORM_MIN_ROUTE_HP} HP and above. This request was not sent to shops.`,
      parsedHp,
      httpStatus: 200,
    };
  }

  return {
    ok: true,
    routeToShops: true,
    status: QUALIFICATION_STATUS.QUALIFIED,
    reason: "",
    parsedHp,
    httpStatus: 200,
  };
}

/**
 * Keep listings that can handle this lead HP (min floor and optional max capacity).
 * @param {Array<{ id?: string, minMotorSizeHP?: string, maxMotorSizeHP?: string }>} listings
 * @param {number} leadHp
 */
export function filterListingsForLeadHp(listings, leadHp) {
  const hp = Number(leadHp);
  if (!Number.isFinite(hp)) return [];
  const list = Array.isArray(listings) ? listings : [];
  return list.filter((listing) => {
    const minHp = parseListingMinHp(listing?.minMotorSizeHP);
    if (hp < minHp) return false;
    const maxHp = parseListingMaxHp(listing?.maxMotorSizeHP);
    if (maxHp != null && hp > maxHp) return false;
    return true;
  });
}

export function notRoutedUserMessage(status) {
  switch (status) {
    case QUALIFICATION_STATUS.RESIDENTIAL:
      return "Thanks for reaching out. 3PhaseFlow matches industrial and commercial motor repair. Residential and homeowner jobs are not sent to our shop network.";
    case QUALIFICATION_STATUS.POOL_OR_SPA:
      return "Thanks for reaching out. Pool, spa, and similar residential pump motors are outside our industrial shop network, so this was not sent to shops.";
    case QUALIFICATION_STATUS.BELOW_MIN_HP:
      return `Thanks for reaching out. We match industrial motors ${PLATFORM_MIN_ROUTE_HP} HP and above. Smaller motors are not sent to shops on this network.`;
    case QUALIFICATION_STATUS.NO_MATCHING_SHOP:
      return "Thanks for reaching out. We received your industrial request, but no matching shops were available for this size and location right now.";
    default:
      return "Thanks for reaching out. This request did not meet our industrial matching criteria, so it was not sent to shops.";
  }
}
