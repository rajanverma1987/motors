import { connectDB } from "@/lib/db";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";

/**
 * Whether the shop may use CRM features (not login — login also checks revoked + User.canLogin).
 */
export async function computeSubscriptionPortalAccess(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) {
    return { allowed: false, reason: "No account email." };
  }
  await connectDB();
  const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
  if (!sub) {
    return { allowed: true, reason: null, sub: null, plan: null };
  }
  if (sub.revokedAt) {
    return {
      allowed: false,
      reason: sub.revokedReason || "Your subscription access has been revoked.",
      sub,
      plan: sub.planId,
    };
  }
  const plan = sub.planId;
  const isInternal = plan?.planType === "internal";

  if (isInternal) {
    return { allowed: true, reason: null, sub, plan };
  }

  const state = sub.internalState;
  if (state === "active" || state === "trialing") {
    return { allowed: true, reason: null, sub, plan };
  }
  if (state === "past_due") {
    const grace = sub.gracePeriodEndsAt ? new Date(sub.gracePeriodEndsAt) : null;
    if (grace && grace > new Date()) {
      return { allowed: true, reason: "Payment past due — please update billing before grace ends.", sub, plan };
    }
    return {
      allowed: false,
      reason: "Subscription is past due. Please contact support or update payment.",
      sub,
      plan,
    };
  }
  if (state === "suspended" || state === "cancelled") {
    return {
      allowed: false,
      reason:
        state === "cancelled"
          ? "Subscription cancelled. Renew to continue."
          : "Subscription suspended. Contact support.",
      sub,
      plan,
    };
  }
  return { allowed: true, reason: null, sub, plan };
}

/** Login is only blocked by subscription when admin revokes comped access (revokedAt). */
export async function getLoginBlockReason(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return null;
  await connectDB();
  const sub = await ShopSubscription.findOne({ ownerEmail: email }).select("revokedAt revokedReason").lean();
  if (sub?.revokedAt) {
    return sub.revokedReason || "Your access has been revoked. Please contact support.";
  }
  return null;
}

/** After failed payment: start or extend grace (7 days from now if not set). */
export function gracePeriodAfterFailure(existingGrace) {
  const now = new Date();
  if (existingGrace && new Date(existingGrace) > now) {
    return new Date(existingGrace);
  }
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return end;
}
