import { LISTING_ONLY_PLAN_SLUG } from "@/lib/listing-account-messages";

/**
 * Whether a SubscriptionPlan document is the directory listing CRM tier (internal or PayPal).
 */
export function planIsListingDirectoryTier(plan) {
  if (!plan || typeof plan !== "object") return false;
  const slug = (plan.slug || "").toLowerCase().trim();
  const name = (plan.name || "").toLowerCase().trim();
  if (slug === LISTING_ONLY_PLAN_SLUG || slug.startsWith(`${LISTING_ONLY_PLAN_SLUG}-`)) return true;
  if (name === "listing only" || /^listing only\b/i.test(name.trim())) return true;
  return false;
}
