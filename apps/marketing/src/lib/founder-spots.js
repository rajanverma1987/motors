import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";

export const FOUNDER_SPOTS_TOTAL = 10;

/**
 * @param {number} tenantCount
 */
export function founderSpotsFromCount(tenantCount) {
  const total = FOUNDER_SPOTS_TOTAL;
  const raw = Number(tenantCount);
  const taken = Number.isFinite(raw) ? Math.max(0, Math.min(total, Math.floor(raw))) : 0;
  return { total, taken, left: total - taken };
}

/** Same Tenant rows the admin Tenants list shows. */
export async function getFounderSpotCounts() {
  await dbConnect();
  const tenantCount = await Tenant.countDocuments({});
  return founderSpotsFromCount(tenantCount);
}

/**
 * @param {{ taken: number, left: number, total: number }} spots
 */
export function founderPricingOfferSentence({ taken, left, total }) {
  const cap = `We are currently offering founder pricing to the first ${total} shops, a permanently locked discounted rate.`;
  const close = "If you want to see the platform before the founder spots are gone, I can show you everything in 30 minutes.";
  if (left <= 0) {
    return `${cap} Those spots are filled, so pricing is at the standard rate.`;
  }
  if (taken <= 0) {
    return `${cap} ${close}`;
  }
  const takenLabel = taken === 1 ? "One spot is already taken." : `${taken} spots are already taken.`;
  return `${cap} ${takenLabel} ${close}`;
}
