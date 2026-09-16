/**
 * Ranks IQMotorBase directory listings for the IQMotorTrack shop selection screen (§7.3, §14.10).
 *
 * Ranking inputs, in the order the spec requires:
 *   1. Proximity to the facility (city, then state / stated coverage, then everything else).
 *   2. Capability match (AC/DC, HP range, rewinding, emergency, pickup).
 *   3. Shops that have serviced this motor before, pinned to the very top.
 *   4. Directory score.
 *
 * Listings carry no coordinates, so proximity is expressed as an honest tier label
 * ("Same city", "Serves your state", ...) rather than a fabricated mileage.
 */

import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import Review from "@/models/Review";
import TrackServiceHistory from "@/models/TrackServiceHistory";
import { trackRespondsByMap } from "@/lib/track-shop-accounts";

const PROXIMITY = {
  same_city: { rank: 0, label: "Same city" },
  serves_city: { rank: 1, label: "Serves your city" },
  same_state: { rank: 2, label: "Same state" },
  serves_state: { rank: 3, label: "Serves your state" },
  elsewhere: { rank: 4, label: "Outside your state" },
};

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function listContains(raw, needle) {
  if (!needle) return false;
  const hay = Array.isArray(raw) ? raw.join(", ") : String(raw || "");
  return norm(hay).includes(needle);
}

function proximityFor(listing, facility) {
  const city = norm(facility?.city);
  const state = norm(facility?.state);
  if (city && norm(listing.city) === city) return PROXIMITY.same_city;
  if (city && listContains(listing.citiesOrMetrosServed, city)) return PROXIMITY.serves_city;
  if (state && norm(listing.state) === state) return PROXIMITY.same_state;
  if (state && listContains(listing.statesServed, state)) return PROXIMITY.serves_state;
  return PROXIMITY.elsewhere;
}

function parseHp(raw) {
  const num = Number(String(raw || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(num) && num > 0 ? num : null;
}

/**
 * @param {Record<string, unknown>} listing
 * @param {{ powerType?: string, hp?: string, kw?: string }} motor
 * @param {{ urgency?: string, logistics?: string }} rfq
 */
function capabilityTags(listing, motor, rfq) {
  const tags = [];
  const capabilities = norm((listing.motorCapabilities || []).join(", "));
  const services = norm((listing.services || []).join(", "));
  const rewinding = norm((listing.rewindingCapabilities || []).join(", "));
  const powerType = norm(motor?.powerType);

  let score = 0;

  if (powerType === "dc" && (capabilities.includes("dc") || services.includes("dc"))) {
    tags.push("DC capable");
    score += 3;
  }
  if (powerType === "ac" && (capabilities.includes("ac") || services.includes("ac"))) {
    tags.push("AC capable");
    score += 3;
  }
  if (rewinding || services.includes("rewind")) {
    tags.push("Rewinding");
    score += 2;
  }

  const motorHp = parseHp(motor?.hp) || (parseHp(motor?.kw) ? parseHp(motor.kw) * 1.341 : null);
  const maxHp = parseHp(listing.maxMotorSizeHP);
  if (motorHp && maxHp) {
    if (maxHp >= motorHp) {
      tags.push(`Up to ${listing.maxMotorSizeHP} HP`);
      score += 2;
    } else {
      score -= 4;
    }
  }

  if (listing.rushRepairAvailable) {
    tags.push("Emergency / rush");
    score += norm(rfq?.urgency) === "emergency" ? 4 : 1;
  }
  if (listing.pickupDeliveryAvailable) {
    tags.push("Pickup and delivery");
    score += norm(rfq?.logistics) === "shop_pickup" ? 4 : 1;
  }
  if (listing.isPremium) tags.push("Premium partner");

  return { tags, score };
}

/**
 * @param {{
 *   facility: Record<string, unknown>,
 *   motor: Record<string, unknown>,
 *   urgency?: string,
 *   logistics?: string,
 *   search?: string,
 *   limit?: number,
 * }} args
 */
export async function rankTrackShopsForMotor({
  facility,
  motor,
  urgency = "standard",
  logistics = "either",
  search = "",
  limit = 60,
}) {
  await connectDB();

  const query = { status: "approved" };
  const term = String(search || "").trim();
  if (term) {
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ companyName: rx }, { city: rx }, { state: rx }, { zipCode: rx }];
  }

  const listings = await Listing.find(query)
    .select(
      "companyName city state zipCode country crmUserId email notificationEmails services motorCapabilities rewindingCapabilities equipmentTesting maxMotorSizeHP pickupDeliveryAvailable rushRepairAvailable turnaroundTime isPremium directoryScore urlSlug"
    )
    .lean();

  if (listings.length === 0) return [];

  const listingIds = listings.map((l) => String(l._id));

  const [ratingRows, historyRows, respondsByMap] = await Promise.all([
    Review.aggregate([
      { $match: { listingId: { $in: listings.map((l) => l._id) }, status: "approved" } },
      { $group: { _id: "$listingId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
    motor?._id || motor?.id
      ? TrackServiceHistory.find({
          motorId: motor._id || motor.id,
          shopListingId: { $in: listingIds },
        })
          .select("shopListingId completedAt")
          .lean()
      : Promise.resolve([]),
    trackRespondsByMap(listings),
  ]);

  const ratingMap = new Map();
  for (const row of ratingRows) {
    ratingMap.set(String(row._id), {
      rating: Math.round(Number(row.avg) * 10) / 10,
      reviewCount: Number(row.count) || 0,
    });
  }

  const servicedMap = new Map();
  for (const row of historyRows) {
    const key = String(row.shopListingId || "");
    if (!key) continue;
    const at = row.completedAt ? new Date(row.completedAt).getTime() : 0;
    const prev = servicedMap.get(key) || 0;
    if (at > prev) servicedMap.set(key, at);
  }

  const rows = listings.map((listing) => {
    const id = String(listing._id);
    const proximity = proximityFor(listing, facility);
    const { tags, score } = capabilityTags(listing, motor, { urgency, logistics });
    const rating = ratingMap.get(id) || { rating: null, reviewCount: 0 };
    const servicedAt = servicedMap.get(id) || 0;
    return {
      id,
      companyName: String(listing.companyName || ""),
      city: String(listing.city || ""),
      state: String(listing.state || ""),
      zipCode: String(listing.zipCode || ""),
      urlSlug: String(listing.urlSlug || ""),
      distanceLabel: proximity.label,
      proximityRank: proximity.rank,
      capabilityTags: tags,
      capabilityScore: score,
      turnaroundTime: String(listing.turnaroundTime || ""),
      rating: rating.rating,
      reviewCount: rating.reviewCount,
      directoryScore: Number(listing.directoryScore) || 0,
      respondsBy: respondsByMap.get(id) || "email",
      servicedBefore: servicedAt > 0,
      lastServicedAt: servicedAt > 0 ? new Date(servicedAt).toISOString() : null,
    };
  });

  rows.sort((a, b) => {
    if (a.servicedBefore !== b.servicedBefore) return a.servicedBefore ? -1 : 1;
    if (a.servicedBefore && b.servicedBefore) {
      const aAt = a.lastServicedAt ? new Date(a.lastServicedAt).getTime() : 0;
      const bAt = b.lastServicedAt ? new Date(b.lastServicedAt).getTime() : 0;
      if (aAt !== bAt) return bAt - aAt;
    }
    if (a.proximityRank !== b.proximityRank) return a.proximityRank - b.proximityRank;
    if (a.capabilityScore !== b.capabilityScore) return b.capabilityScore - a.capabilityScore;
    if (a.directoryScore !== b.directoryScore) return b.directoryScore - a.directoryScore;
    return a.companyName.localeCompare(b.companyName);
  });

  return rows.slice(0, Math.max(1, Number(limit) || 60));
}
