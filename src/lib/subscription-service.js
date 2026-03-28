import { connectDB } from "@/lib/db";
import User from "@/models/User";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionTransaction from "@/models/SubscriptionTransaction";
import { sendSubscriptionPlanAttachedEmail } from "@/lib/email";
import { createPaypalProductAndPlan, createPaypalSubscription, paypalConfigured } from "@/lib/paypal-api";
import { gracePeriodAfterFailure } from "@/lib/subscription-access";
import { LISTING_ONLY_PLAN_SLUG } from "@/lib/listing-account-messages";
import { planIsListingDirectoryTier } from "@/lib/listing-tier-plan";

export const FREE_ULTIMATE_SLUG = "free-ultimate";

/** @deprecated use LISTING_ONLY_PLAN_SLUG from listing-account-messages */
export const LISTING_ONLY_SLUG = LISTING_ONLY_PLAN_SLUG;

export async function ensureFreeUltimatePlan() {
  await connectDB();
  let plan = await SubscriptionPlan.findOne({ slug: FREE_ULTIMATE_SLUG });
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: "Free Ultimate",
      slug: FREE_ULTIMATE_SLUG,
      planType: "internal",
      description: "Full CRM access — internal comped plan until revoked.",
      customPrice: 0,
      billingCycle: "custom",
      billingIntervalCount: 1,
      active: true,
    });
  }
  return plan;
}

/** Internal plan shown on Subscription page for directory / listing-only CRM tier. */
export async function ensureListingOnlyPlan() {
  await connectDB();
  let plan = await SubscriptionPlan.findOne({ slug: LISTING_ONLY_PLAN_SLUG });
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: "Directory listing",
      slug: LISTING_ONLY_PLAN_SLUG,
      planType: "internal",
      description:
        "Directory listing plan: full CRM with up to 2 saved customers and full contact details for 2 website leads per calendar month.",
      customPrice: 0,
      billingCycle: "custom",
      billingIntervalCount: 1,
      active: true,
    });
  }
  return plan;
}

async function shopHasActivePaypalBackedSubscription(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return false;
  await connectDB();
  const sub = await ShopSubscription.findOne({ ownerEmail: email }).select("planId paypalSubscriptionId").lean();
  if (!sub) return false;
  const paypalId = (sub.paypalSubscriptionId || "").trim();
  if (!paypalId) return false;
  const plan = await SubscriptionPlan.findById(sub.planId).select("planType").lean();
  return plan?.planType === "paypal";
}

/**
 * Sets User.listingOnlyAccount and ShopSubscription to the Directory listing internal plan.
 * No-op if no portal user exists for the email. Skips plan changes if the shop has an active PayPal-backed subscription (no downgrade).
 */
export async function applyListingOnlySubscriptionToShop(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return { applied: false, reason: "no_email" };
  await connectDB();

  const user = await User.findOne({ email }).select("_id").lean();
  if (!user) return { applied: false, reason: "no_user" };

  if (await shopHasActivePaypalBackedSubscription(email)) {
    return { applied: false, reason: "paypal_active" };
  }

  const plan = await ensureListingOnlyPlan();
  await User.updateOne({ _id: user._id }, { $set: { listingOnlyAccount: true } });

  await ShopSubscription.findOneAndUpdate(
    { ownerEmail: email },
    {
      $set: {
        planId: plan._id,
        internalState: "active",
        paymentFailureCount: 0,
        customPriceSnapshot: plan.customPrice ?? 0,
        currencySnapshot: plan.currency || "USD",
      },
      $setOnInsert: {
        ownerEmail: email,
      },
    },
    { upsert: true, new: true }
  );

  return { applied: true };
}

/**
 * Bootstrap subscription for login / subscription GET: Free Ultimate or Directory listing from User.listingOnlyAccount.
 */
export async function syncSubscriptionWithAccountTier(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return null;
  await connectDB();
  const u = await User.findOne({ email }).select("listingOnlyAccount").lean();
  if (u?.listingOnlyAccount) {
    return applyListingOnlySubscriptionToShop(email);
  }
  return ensureShopSubscriptionOnRegister(email);
}

/** Call after new User registration. */
export async function ensureShopSubscriptionOnRegister(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return null;
  await connectDB();
  const plan = await ensureFreeUltimatePlan();
  const sub = await ShopSubscription.findOneAndUpdate(
    { ownerEmail: email },
    {
      $setOnInsert: {
        ownerEmail: email,
        planId: plan._id,
        internalState: "active",
        paymentFailureCount: 0,
        customPriceSnapshot: 0,
        currencySnapshot: plan.currency || "USD",
      },
    },
    { upsert: true, new: true }
  );
  return sub;
}

export async function logSubscriptionTransaction(entry) {
  await connectDB();
  return SubscriptionTransaction.create(entry);
}

export async function applyPaymentSaleCompleted({
  subscriptionId,
  amount,
  currency,
  saleId,
  eventId,
}) {
  await connectDB();
  const sub = await ShopSubscription.findOne({ paypalSubscriptionId: subscriptionId });
  if (!sub) return { ok: false, error: "Subscription not found" };
  sub.internalState = "active";
  sub.paymentFailureCount = 0;
  sub.gracePeriodEndsAt = undefined;
  await sub.save();
  await logSubscriptionTransaction({
    ownerEmail: sub.ownerEmail,
    paypalSubscriptionId: subscriptionId,
    paypalSaleId: saleId || "",
    paypalEventId: eventId || "",
    type: "payment",
    amount,
    currency: currency || "USD",
    status: "completed",
    description: "PAYMENT.SALE.COMPLETED",
  });
  return { ok: true };
}

export async function applyPaymentSaleDenied({ subscriptionId, eventId }) {
  await connectDB();
  const sub = await ShopSubscription.findOne({ paypalSubscriptionId: subscriptionId });
  if (!sub) return { ok: false, error: "Subscription not found" };
  const failures = (sub.paymentFailureCount || 0) + 1;
  sub.paymentFailureCount = failures;
  sub.internalState = failures >= 5 ? "suspended" : "past_due";
  sub.gracePeriodEndsAt = gracePeriodAfterFailure(sub.gracePeriodEndsAt);
  await sub.save();
  await logSubscriptionTransaction({
    ownerEmail: sub.ownerEmail,
    paypalSubscriptionId: subscriptionId,
    paypalEventId: eventId || "",
    type: "payment",
    status: "denied",
    description: "PAYMENT.SALE.DENIED",
  });
  return { ok: true };
}

export async function applySubscriptionActivated({ subscriptionId, eventId }) {
  await connectDB();
  const sub = await ShopSubscription.findOne({ paypalSubscriptionId: subscriptionId });
  if (!sub) return { ok: false, error: "Subscription not found" };
  sub.internalState = "active";
  sub.pendingApprovalUrl = "";
  sub.paymentFailureCount = 0;
  sub.gracePeriodEndsAt = undefined;
  sub.lastWebhookEventId = eventId || sub.lastWebhookEventId;
  await sub.save();
  const planDoc = await SubscriptionPlan.findById(sub.planId).lean();
  const listingTier = planIsListingDirectoryTier(planDoc);
  await User.updateOne({ email: sub.ownerEmail }, { $set: { listingOnlyAccount: listingTier } });
  await logSubscriptionTransaction({
    ownerEmail: sub.ownerEmail,
    paypalSubscriptionId: subscriptionId,
    paypalEventId: eventId || "",
    type: "webhook",
    status: "activated",
    description: "BILLING.SUBSCRIPTION.ACTIVATED",
  });
  return { ok: true };
}

export async function applySubscriptionCancelled({ subscriptionId, eventId }) {
  await connectDB();
  const sub = await ShopSubscription.findOne({ paypalSubscriptionId: subscriptionId });
  if (!sub) return { ok: false, error: "Subscription not found" };
  sub.internalState = "cancelled";
  sub.pendingApprovalUrl = "";
  sub.lastWebhookEventId = eventId || sub.lastWebhookEventId;
  await sub.save();
  await logSubscriptionTransaction({
    ownerEmail: sub.ownerEmail,
    paypalSubscriptionId: subscriptionId,
    paypalEventId: eventId || "",
    type: "webhook",
    status: "cancelled",
    description: "BILLING.SUBSCRIPTION.CANCELLED",
  });
  return { ok: true };
}

/**
 * Admin: create PayPal-backed plan in DB + PayPal catalog.
 */
export async function createPaypalBackedPlan(body, adminEmail) {
  await connectDB();
  const {
    name,
    slug,
    description,
    customPrice,
    billingCycle,
    billingIntervalCount,
    negotiatedBy,
    currency,
  } = body;
  if (!name || !slug) {
    throw new Error("Name and slug required");
  }
  const existing = await SubscriptionPlan.findOne({ slug: String(slug).toLowerCase().trim() });
  if (existing) {
    throw new Error("Slug already exists");
  }
  const plan = await SubscriptionPlan.create({
    name: String(name).trim(),
    slug: String(slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, "-"),
    planType: "paypal",
    description: String(description || "").slice(0, 500),
    customPrice: Number(customPrice) || 0,
    billingCycle: billingCycle || "monthly",
    billingIntervalCount: Math.max(1, Number(billingIntervalCount) || 1),
    negotiatedBy: String(negotiatedBy || "").slice(0, 200),
    currency: (currency || "USD").toUpperCase(),
    active: true,
  });

  if (paypalConfigured()) {
    const { paypalProductId, paypalPlanId } = await createPaypalProductAndPlan(plan);
    plan.paypalProductId = paypalProductId;
    plan.paypalPlanId = paypalPlanId;
    await plan.save();
  }

  await logSubscriptionTransaction({
    ownerEmail: "admin",
    type: "admin_override",
    description: `Created subscription plan ${plan.slug}`,
    performedBy: adminEmail || "",
    status: "ok",
  });

  return plan;
}

function getPublicSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * Assign a PayPal plan to a shop: creates PayPal subscription and stores approval URL.
 */
export async function assignPaypalPlanToShop({
  ownerEmail,
  planId,
  adminEmail,
  cancelOld = true,
}) {
  await connectDB();
  const plan = await SubscriptionPlan.findById(planId);
  if (!plan || plan.planType !== "paypal" || !plan.paypalPlanId) {
    throw new Error("Plan must be a PayPal plan with paypalPlanId set (create plan with PayPal configured).");
  }
  const email = ownerEmail.trim().toLowerCase();
  let sub = await ShopSubscription.findOne({ ownerEmail: email });
  const base = getPublicSiteUrl();
  const returnUrl = `${base}/dashboard/subscription?paypal=1`;
  const cancelUrl = `${base}/dashboard/subscription?paypal=cancel`;

  const { subscriptionId, approvalUrl } = await createPaypalSubscription({
    paypalPlanId: plan.paypalPlanId,
    returnUrl,
    cancelUrl,
    subscriberEmail: email,
  });

  if (cancelOld && sub?.paypalSubscriptionId && sub.paypalSubscriptionId !== subscriptionId) {
    try {
      const { cancelPaypalSubscription } = await import("@/lib/paypal-api");
      await cancelPaypalSubscription(sub.paypalSubscriptionId, "Replaced by new plan");
    } catch (e) {
      console.warn("Could not cancel previous PayPal subscription:", e.message);
    }
  }

  if (!sub) {
    sub = new ShopSubscription({
      ownerEmail: email,
      planId: plan._id,
      internalState: "trialing",
      paypalSubscriptionId: subscriptionId,
      pendingApprovalUrl: approvalUrl,
      customPriceSnapshot: plan.customPrice,
      currencySnapshot: plan.currency || "USD",
    });
  } else {
    sub.planId = plan._id;
    sub.internalState = "trialing";
    sub.paypalSubscriptionId = subscriptionId;
    sub.pendingApprovalUrl = approvalUrl;
    sub.customPriceSnapshot = plan.customPrice;
    sub.currencySnapshot = plan.currency || "USD";
    sub.revokedAt = undefined;
    sub.revokedReason = "";
  }
  await sub.save();

  const listingTier = planIsListingDirectoryTier(plan);
  await User.updateOne({ email }, { $set: { listingOnlyAccount: !!listingTier } });

  await logSubscriptionTransaction({
    ownerEmail: email,
    paypalSubscriptionId: subscriptionId,
    type: "admin_override",
    description: `Assigned PayPal plan ${plan.slug} by admin`,
    performedBy: adminEmail || "",
    status: "pending_approval",
  });

  try {
    const u = await User.findOne({ email }).select("shopName").lean();
    await sendSubscriptionPlanAttachedEmail({
      to: email,
      shopName: u?.shopName || "",
      planName: plan.name,
      planType: plan.planType,
      billingCycle: plan.billingCycle,
      customPrice: plan.customPrice,
      currency: plan.currency || "USD",
      approvalUrl,
    });
  } catch (e) {
    console.warn("sendSubscriptionPlanAttachedEmail (PayPal):", e?.message || e);
  }

  return { subscription: sub, approvalUrl };
}

/** Switch shop back to Free Ultimate (internal). */
export async function assignInternalFreeUltimateToShop(ownerEmail, adminEmail) {
  await connectDB();
  const plan = await ensureFreeUltimatePlan();
  const email = ownerEmail.trim().toLowerCase();
  let sub = await ShopSubscription.findOne({ ownerEmail: email });
  if (sub?.paypalSubscriptionId) {
    try {
      const { cancelPaypalSubscription } = await import("@/lib/paypal-api");
      await cancelPaypalSubscription(sub.paypalSubscriptionId, "Switched to internal plan");
    } catch (e) {
      console.warn("PayPal cancel:", e.message);
    }
  }
  if (!sub) {
    sub = new ShopSubscription({
      ownerEmail: email,
      planId: plan._id,
      internalState: "active",
      paypalSubscriptionId: "",
      pendingApprovalUrl: "",
      customPriceSnapshot: 0,
      currencySnapshot: plan.currency || "USD",
    });
  } else {
    sub.planId = plan._id;
    sub.internalState = "active";
    sub.paypalSubscriptionId = "";
    sub.pendingApprovalUrl = "";
    sub.customPriceSnapshot = 0;
    sub.gracePeriodEndsAt = undefined;
    sub.paymentFailureCount = 0;
  }
  await sub.save();

  await User.updateOne({ email }, { $set: { listingOnlyAccount: false } });

  await logSubscriptionTransaction({
    ownerEmail: email,
    type: "admin_override",
    description: "Assigned Free Ultimate (internal)",
    performedBy: adminEmail || "",
    status: "ok",
  });

  try {
    const u = await User.findOne({ email }).select("shopName").lean();
    await sendSubscriptionPlanAttachedEmail({
      to: email,
      shopName: u?.shopName || "",
      planName: plan.name,
      planType: plan.planType,
      billingCycle: plan.billingCycle,
      customPrice: plan.customPrice,
      currency: plan.currency || "USD",
      approvalUrl: "",
    });
  } catch (e) {
    console.warn("sendSubscriptionPlanAttachedEmail (Free Ultimate):", e?.message || e);
  }

  return sub;
}

export async function revokeShopAccess(ownerEmail, reason, adminEmail) {
  await connectDB();
  const email = ownerEmail.trim().toLowerCase();
  const sub = await ShopSubscription.findOne({ ownerEmail: email });
  if (!sub) {
    await ensureShopSubscriptionOnRegister(email);
  }
  const updated = await ShopSubscription.findOneAndUpdate(
    { ownerEmail: email },
    {
      revokedAt: new Date(),
      revokedReason: String(reason || "Access revoked").slice(0, 2000),
      internalState: "suspended",
    },
    { new: true }
  );
  await logSubscriptionTransaction({
    ownerEmail: email,
    type: "admin_override",
    description: `Revoked access: ${reason}`,
    performedBy: adminEmail || "",
    status: "revoked",
  });
  return updated;
}

export async function clearShopRevoke(ownerEmail, adminEmail) {
  await connectDB();
  const email = ownerEmail.trim().toLowerCase();
  const sub = await ShopSubscription.findOneAndUpdate(
    { ownerEmail: email },
    { $unset: { revokedAt: 1, revokedReason: 1 }, $set: { internalState: "active" } },
    { new: true }
  );
  if (sub) {
    await logSubscriptionTransaction({
      ownerEmail: email,
      type: "admin_override",
      description: "Cleared subscription revoke",
      performedBy: adminEmail || "",
      status: "ok",
    });
  }
  return sub;
}
