import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import MobileAppAccount from "@/models/MobileAppAccount";
import { createPaypalProductAndPlan, paypalConfigured, cancelPaypalSubscription, getPaypalSubscription, activatePaypalSubscription } from "@/lib/paypal-api";

/** Admin → Subscription plans slug for IQWireCalculator (price editable any time). */
export const MOBILE_APP_SUBSCRIPTION_PLAN_SLUG = "mobile-app";

export const MOBILE_APP_IAP_PRODUCT_ID = "IQWireMonthly";
export const MOBILE_APP_IAP_ANDROID_PACKAGE = "com.iqmotorbase.iqwirecalculator";
export const MOBILE_APP_IAP_IOS_BUNDLE = "com.iqmotorbase.iqwirecalculator";
export const MOBILE_APP_TRIAL_DAYS = 3;
export const MOBILE_APP_GRACE_DAYS = 3;
export const MOBILE_APP_DEFAULT_MONTHLY_USD = 9.99;

function planSlugFromEnv() {
  return String(process.env.MOBILE_APP_SUBSCRIPTION_PLAN_SLUG || MOBILE_APP_SUBSCRIPTION_PLAN_SLUG)
    .trim()
    .toLowerCase();
}

export function trialEndsAtFrom(start = new Date()) {
  const d = new Date(start);
  d.setDate(d.getDate() + MOBILE_APP_TRIAL_DAYS);
  return d;
}

export function addBillingPeriod(fromDate, plan) {
  const d = new Date(fromDate || Date.now());
  const cycle = String(plan?.billingCycle || "monthly");
  const count = Math.max(1, Number(plan?.billingIntervalCount) || 1);
  if (cycle === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  if (cycle === "custom") {
    d.setMonth(d.getMonth() + count);
    return d;
  }
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function ensurePaypalSynced(planDoc) {
  if (!paypalConfigured() || !planDoc) return planDoc;
  if (planDoc.planType !== "paypal") return planDoc;
  if (String(planDoc.paypalPlanId || "").trim()) return planDoc;
  const price = Number(planDoc.customPrice);
  if (!Number.isFinite(price) || price <= 0) return planDoc;
  try {
    const { paypalProductId, paypalPlanId } = await createPaypalProductAndPlan(planDoc);
    planDoc.paypalProductId = paypalProductId;
    planDoc.paypalPlanId = paypalPlanId;
    await planDoc.save();
  } catch (err) {
    console.warn("ensureMobileAppPaypalSynced:", err.message);
  }
  return planDoc;
}

/**
 * Ensure the IQWireCalculator PayPal plan exists so Admin can change price on the fly.
 */
export async function ensureMobileAppSubscriptionPlan() {
  await connectDB();
  const slug = planSlugFromEnv();
  let plan = await SubscriptionPlan.findOne({ slug });
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: "IQWireCalculator",
      slug,
      planType: "paypal",
      description:
        "IQWireCalculator mobile app — motor and wire calculators, saved work, and upcoming video lessons. Not tied to shop CRM.",
      customPrice: MOBILE_APP_DEFAULT_MONTHLY_USD,
      currency: "USD",
      billingCycle: "monthly",
      billingIntervalCount: 1,
      active: true,
    });
  } else if (plan.name === "Mobile App") {
    plan.name = "IQWireCalculator";
    if (!plan.description || /IQMotorBase Calculators mobile app/.test(plan.description)) {
      plan.description =
        "IQWireCalculator mobile app — motor and wire calculators, saved work, and upcoming video lessons. Not tied to shop CRM.";
    }
    await plan.save();
  }
  await ensurePaypalSynced(plan);
  return plan;
}

export async function getMobileAppSubscriptionPlan() {
  const slug = planSlugFromEnv();
  const plan = await ensureMobileAppSubscriptionPlan();
  const monthlyUsd = Number(plan.customPrice);
  const paypalPlanId = String(plan.paypalPlanId || "").trim();
  return {
    configured: !!paypalPlanId && Number.isFinite(monthlyUsd) && monthlyUsd > 0,
    paypalPlanId,
    monthlyUsd: Number.isFinite(monthlyUsd) ? monthlyUsd : MOBILE_APP_DEFAULT_MONTHLY_USD,
    currency: String(plan.currency || "USD").toUpperCase(),
    planName: plan.name || "IQWireCalculator",
    planSlug: slug,
    billingCycle: plan.billingCycle || "monthly",
    billingIntervalCount: plan.billingIntervalCount || 1,
    planType: plan.planType || "",
    planId: String(plan._id),
    paypalConfigured: paypalConfigured(),
    trialDays: MOBILE_APP_TRIAL_DAYS,
  };
}

export function describeMobileAppAccess(account) {
  const now = Date.now();
  const trialEnds = account?.trialEndsAt ? new Date(account.trialEndsAt).getTime() : 0;
  const periodEnds = account?.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).getTime() : 0;
  const iapEnds = account?.iapExpiresAt ? new Date(account.iapExpiresAt).getTime() : 0;
  const graceEnds = account?.graceEndsAt ? new Date(account.graceEndsAt).getTime() : 0;
  const status = String(account?.subscriptionStatus || "trial");
  const trialMsLeft = Math.max(0, trialEnds - now);
  const periodMsLeft = Math.max(0, Math.max(periodEnds, iapEnds) - now);

  if (iapEnds > now) {
    return { unlocked: true, accessMode: "subscription", lockedReason: "" };
  }
  if (status === "active" && (periodEnds > now || graceEnds > now)) {
    return {
      unlocked: true,
      accessMode: graceEnds > now && periodEnds <= now ? "grace" : "subscription",
      lockedReason: "",
    };
  }
  if (status === "cancelled" && periodEnds > now) {
    return { unlocked: true, accessMode: "cancelled_until_period_end", lockedReason: "" };
  }
  if (status === "past_due" && graceEnds > now) {
    return { unlocked: true, accessMode: "grace", lockedReason: "" };
  }
  if (trialEnds > now && status !== "active") {
    return { unlocked: true, accessMode: "trial", lockedReason: "" };
  }

  let lockedReason = "trial_ended";
  if (status === "past_due") lockedReason = "payment_failed";
  else if (status === "cancelled" || status === "expired") lockedReason = "subscription_ended";
  else if (status === "active" && periodEnds <= now) lockedReason = "subscription_ended";

  return { unlocked: false, accessMode: "locked", lockedReason, trialMsLeft, periodMsLeft };
}

export async function findMobileAppAccountForPaypalEvent({
  paypalSubscriptionId,
  subscriberEmail,
  customId,
}) {
  const subId = String(paypalSubscriptionId || "").trim();
  const email = String(subscriberEmail || "").trim().toLowerCase();
  const token = String(customId || "").trim();
  await connectDB();
  if (subId) {
    const bySub = await MobileAppAccount.findOne({ paypalSubscriptionId: subId });
    if (bySub) return bySub;
  }
  if (token) {
    const byToken = await MobileAppAccount.findOne({ paypalCheckoutToken: token });
    if (byToken) return byToken;
  }
  if (email) {
    const byEmail = await MobileAppAccount.findOne({ email });
    if (byEmail) return byEmail;
  }
  return null;
}

export function mobileAppAccountToJson(account, access, planPayload) {
  const trialEnds = account?.trialEndsAt ? new Date(account.trialEndsAt).toISOString() : null;
  const periodEnds = account?.currentPeriodEndsAt
    ? new Date(account.currentPeriodEndsAt).toISOString()
    : null;
  return {
    id: String(account._id),
    email: account.email,
    name: account.name || "",
    phone: account.phone || "",
    country: account.country || "",
    countryCode: account.countryCode || "",
    subscriptionStatus: account.subscriptionStatus,
    trialEndsAt: trialEnds,
    currentPeriodEndsAt: periodEnds,
    cancelAtPeriodEnd: !!account.cancelAtPeriodEnd,
    paypalSubscriptionId: account.paypalSubscriptionId || "",
    unlocked: access.unlocked,
    accessMode: access.accessMode,
    lockedReason: access.lockedReason || "",
    trialDays: MOBILE_APP_TRIAL_DAYS,
    plan: planPayload
      ? {
          name: planPayload.planName,
          slug: planPayload.planSlug,
          monthlyUsd: planPayload.monthlyUsd,
          currency: planPayload.currency,
          billingCycle: planPayload.billingCycle,
          configured: planPayload.configured,
          paypalConfigured: planPayload.paypalConfigured,
        }
      : null,
  };
}

export async function applyMobileAppSubscriptionActivated({ paypalSubscriptionId, eventId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const account = await MobileAppAccount.findOne({ paypalSubscriptionId: subId });
  if (!account) return;
  const lastPaid = account.lastPaymentAt ? new Date(account.lastPaymentAt).getTime() : 0;
  if (
    account.subscriptionStatus === "active" &&
    lastPaid &&
    Date.now() - lastPaid < 15 * 60 * 1000
  ) {
    return;
  }
  const plan = await ensureMobileAppSubscriptionPlan();
  const base =
    account.currentPeriodEndsAt && new Date(account.currentPeriodEndsAt).getTime() > Date.now()
      ? account.currentPeriodEndsAt
      : new Date();
  account.subscriptionStatus = "active";
  account.cancelAtPeriodEnd = false;
  account.currentPeriodEndsAt = addBillingPeriod(base, plan);
  account.lastPaymentAt = new Date();
  account.lastPaymentFailedAt = null;
  account.graceEndsAt = null;
  if (eventId) {
    account.paypalPlanId = account.paypalPlanId || String(plan.paypalPlanId || "");
  }
  await account.save();
}

export async function applyMobileAppIapEntitlement(account, payload) {
  const expiresAt = payload.expiresAt instanceof Date ? payload.expiresAt : new Date(payload.expiresAt);
  account.iapPlatform = String(payload.platform || "").toLowerCase();
  account.iapProductId = String(payload.productId || MOBILE_APP_IAP_PRODUCT_ID);
  account.iapTransactionId = String(payload.transactionId || "").trim();
  account.iapOriginalTransactionId = String(payload.originalTransactionId || "").trim();
  account.iapPurchaseToken = String(payload.purchaseToken || "").trim();
  account.iapExpiresAt = expiresAt;
  account.subscriptionStatus = "active";
  account.cancelAtPeriodEnd = false;
  account.currentPeriodEndsAt = expiresAt;
  account.lastPaymentAt = new Date();
  account.lastPaymentFailedAt = null;
  account.graceEndsAt = null;
  await account.save();
  return account;
}

async function revertUnpaidMobileCheckout(account) {
  const iapEnds = account.iapExpiresAt ? new Date(account.iapExpiresAt).getTime() : 0;
  if (iapEnds > Date.now()) return account;
  const trialEnds = account.trialEndsAt ? new Date(account.trialEndsAt).getTime() : 0;
  account.subscriptionStatus = trialEnds > Date.now() ? "trial" : "expired";
  account.cancelAtPeriodEnd = false;
  account.currentPeriodEndsAt = null;
  account.lastPaymentAt = null;
  account.graceEndsAt = null;
  await account.save();
  return account;
}

/**
 * Ask PayPal if this checkout actually billed. Never mark paid from “user closed the browser.”
 * @returns {{ account: object, activated: boolean, paypalStatus: string }}
 */
export async function syncMobileAppPaypalSubscription(account) {
  const iapEnds = account?.iapExpiresAt ? new Date(account.iapExpiresAt).getTime() : 0;
  if (iapEnds > Date.now()) {
    return { account, activated: true, paypalStatus: "IAP" };
  }
  const subId = String(account?.paypalSubscriptionId || "").trim();
  if (!subId) {
    return { account, activated: false, paypalStatus: "" };
  }
  try {
    let paypalSub = await getPaypalSubscription(subId);
    let paypalStatus = String(paypalSub?.status || "").toUpperCase();

    if (paypalStatus === "APPROVED") {
      try {
        await activatePaypalSubscription(subId);
        paypalSub = await getPaypalSubscription(subId);
        paypalStatus = String(paypalSub?.status || "").toUpperCase();
      } catch (err) {
        console.warn("mobile-app paypal activate:", err.message);
      }
    }

    if (paypalStatus === "ACTIVE") {
      await applyMobileAppSubscriptionActivated({ paypalSubscriptionId: subId, eventId: "paypal-verify" });
      const fresh = await MobileAppAccount.findById(account._id);
      return { account: fresh || account, activated: true, paypalStatus };
    }

    if (paypalStatus === "CANCELLED" && account.lastPaymentAt) {
      await applyMobileAppSubscriptionCancelled({ paypalSubscriptionId: subId });
      const fresh = await MobileAppAccount.findById(account._id);
      return { account: fresh || account, activated: false, paypalStatus };
    }

    if (["EXPIRED", "SUSPENDED"].includes(paypalStatus) || paypalSub == null) {
      const fresh = await revertUnpaidMobileCheckout(account);
      return { account: fresh, activated: false, paypalStatus: paypalStatus || "MISSING" };
    }

    if (account.subscriptionStatus === "active") {
      const fresh = await revertUnpaidMobileCheckout(account);
      return { account: fresh, activated: false, paypalStatus };
    }

    return { account, activated: false, paypalStatus };
  } catch (err) {
    console.warn("mobile-app paypal sync:", err.message);
    return { account, activated: account.subscriptionStatus === "active", paypalStatus: "UNKNOWN" };
  }
}

export async function applyMobileAppSubscriptionCancelled({ paypalSubscriptionId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const account = await MobileAppAccount.findOne({ paypalSubscriptionId: subId });
  if (!account) return;
  const iapEnds = account.iapExpiresAt ? new Date(account.iapExpiresAt).getTime() : 0;
  if (iapEnds > Date.now()) return;
  const periodEnds = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).getTime() : 0;
  account.subscriptionStatus = periodEnds > Date.now() ? "cancelled" : "expired";
  account.cancelAtPeriodEnd = true;
  await account.save();
}

export async function applyMobileAppPaymentDenied({ paypalSubscriptionId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const account = await MobileAppAccount.findOne({ paypalSubscriptionId: subId });
  if (!account) return;
  const iapEnds = account.iapExpiresAt ? new Date(account.iapExpiresAt).getTime() : 0;
  if (iapEnds > Date.now()) return;
  const grace = new Date();
  grace.setDate(grace.getDate() + MOBILE_APP_GRACE_DAYS);
  account.subscriptionStatus = "past_due";
  account.lastPaymentFailedAt = new Date();
  account.graceEndsAt = grace;
  await account.save();
}

function isoOrNull(d) {
  return d ? new Date(d).toISOString() : null;
}

export function subscriptionTypeLabel(account) {
  const status = String(account?.subscriptionStatus || "trial");
  if (status === "active") return "IQWireCalculator";
  if (status === "trial") return "Trial";
  if (status === "past_due") return "Past due";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return status;
}

export function nextDueAt(account) {
  const status = String(account?.subscriptionStatus || "trial");
  if (status === "active" || status === "cancelled" || status === "past_due") {
    return account.currentPeriodEndsAt || null;
  }
  if (status === "trial") return account.trialEndsAt || null;
  return account.currentPeriodEndsAt || null;
}

export function extendMobileAppTrial(account, days) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1 || n > 365) {
    throw new Error("Trial extension must be between 1 and 365 days");
  }
  const now = Date.now();
  const currentEnd = account.trialEndsAt ? new Date(account.trialEndsAt).getTime() : 0;
  const from = Math.max(now, currentEnd);
  const next = new Date(from);
  next.setDate(next.getDate() + n);
  account.trialEndsAt = next;
  const status = String(account.subscriptionStatus || "trial");
  if (status !== "active") {
    account.subscriptionStatus = "trial";
    account.cancelAtPeriodEnd = false;
    account.graceEndsAt = null;
  }
  return account;
}

export function mobileAppAccountToAdminJson(account) {
  const access = describeMobileAppAccess(account);
  return {
    id: String(account._id),
    email: account.email,
    name: account.name || "",
    phone: account.phone || "",
    country: account.country || "",
    countryCode: account.countryCode || "",
    canLogin: account.canLogin !== false,
    banned: account.canLogin === false,
    subscriptionStatus: account.subscriptionStatus,
    subscriptionType: subscriptionTypeLabel(account),
    lastPaidAt: isoOrNull(account.lastPaymentAt),
    nextDueAt: isoOrNull(nextDueAt(account)),
    trialEndsAt: isoOrNull(account.trialEndsAt),
    currentPeriodEndsAt: isoOrNull(account.currentPeriodEndsAt),
    lastLoginAt: isoOrNull(account.lastLoginAt),
    createdAt: isoOrNull(account.createdAt),
    paypalSubscriptionId: account.paypalSubscriptionId || "",
    unlocked: access.unlocked,
    accessMode: access.accessMode,
  };
}

/** Immediately lock calculators (cancels PayPal if present). Login still allowed unless banned. */
export async function revokeMobileAppAccess(account) {
  const subId = String(account.paypalSubscriptionId || "").trim();
  if (subId) {
    try {
      await cancelPaypalSubscription(subId, "Admin removed IQWireCalculator access");
    } catch (err) {
      console.warn("revokeMobileAppAccess paypal:", err.message);
    }
  }
  const now = new Date();
  account.subscriptionStatus = "expired";
  account.cancelAtPeriodEnd = true;
  account.currentPeriodEndsAt = now;
  account.trialEndsAt = now;
  account.graceEndsAt = null;
  await account.save();
  return account;
}
