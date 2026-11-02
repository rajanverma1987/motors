import { TRIAL_PLAN_SLUG } from "@/lib/trial-subscription-messages";

/**
 * Whether a SubscriptionPlan document is the self-signup trial tier (internal).
 */
export function planIsTrialTier(plan) {
  if (!plan || typeof plan !== "object") return false;
  const slug = (plan.slug || "").toLowerCase().trim();
  const name = (plan.name || "").toLowerCase().trim();
  if (slug === TRIAL_PLAN_SLUG || slug.startsWith(`${TRIAL_PLAN_SLUG}-`)) return true;
  if (name === "trial" || /^trial\b/i.test(name.trim())) return true;
  return false;
}
