import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import MobileAppAccount from "@/models/MobileAppAccount";
import {
  createPaypalProductAndPlan,
  paypalConfigured,
  cancelPaypalSubscription,
  getPaypalSubscription,
  activatePaypalSubscription,
  updatePaypalPlanPricing,
} from "@/lib/paypal-api";

/** Admin → Subscription plans slug for IQWireCalculator monthly. */
export const MOBILE_APP_SUBSCRIPTION_PLAN_SLUG = "mobile-app";
export const MOBILE_APP_YEARLY_PLAN_SLUG = "mobile-app-yearly";

export const MOBILE_APP_IAP_PRODUCT_ID = "IQWireMonthly";
export const MOBILE_APP_IAP_ANDROID_PACKAGE = "com.iqmotorbase.iqwirecalculator";
export const MOBILE_APP_IAP_IOS_BUNDLE = "com.iqmotorbase.iqwirecalculator";
export const MOBILE_APP_TRIAL_DAYS = 3;
export const MOBILE_APP_GRACE_DAYS = 3;
export const MOBILE_APP_DEFAULT_MONTHLY_USD = 11.99;
export const MOBILE_APP_DEFAULT_YEARLY_USD = 119;

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

function pricesMatch(a, b) {
  return Number(a).toFixed(2) === Number(b).toFixed(2);
}

async function ensurePaypalSynced(planDoc) {
  if (!paypalConfigured() || !planDoc) return planDoc;
  if (planDoc.planType !== "paypal") return planDoc;
  const price = Number(planDoc.customPrice);
  if (!Number.isFinite(price) || price <= 0) return planDoc;
  const existingId = String(planDoc.paypalPlanId || "").trim();
  if (existingId) return planDoc;
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

async function alignPlanPrice(planDoc, targetPrice) {
  const next = Number(targetPrice);
  if (!planDoc || !Number.isFinite(next) || next <= 0) return planDoc;
  if (pricesMatch(planDoc.customPrice, next)) return planDoc;
  const paypalPlanId = String(planDoc.paypalPlanId || "").trim();
  if (paypalPlanId && paypalConfigured()) {
    try {
      await updatePaypalPlanPricing(paypalPlanId, {
        price: next,
        currency: planDoc.currency || "USD",
      });
    } catch (err) {
      console.warn("alignPlanPrice paypal:", err.message);
      planDoc.paypalPlanId = "";
      planDoc.paypalProductId = "";
    }
  }
  planDoc.customPrice = next;
  await planDoc.save();
  return planDoc;
}

function serializePlan(planDoc, fallbackPrice, fallbackCycle) {
  const usd = Number(planDoc?.customPrice);
  const paypalPlanId = String(planDoc?.paypalPlanId || "").trim();
  const billingCycle = planDoc?.billingCycle || fallbackCycle;
  return {
    configured: !!paypalPlanId && Number.isFinite(usd) && usd > 0,
    paypalPlanId,
    usd: Number.isFinite(usd) ? usd : fallbackPrice,
    monthlyUsd: billingCycle === "yearly" ? MOBILE_APP_DEFAULT_MONTHLY_USD : Number.isFinite(usd) ? usd : fallbackPrice,
    currency: String(planDoc?.currency || "USD").toUpperCase(),
    planName: planDoc?.name || "IQWireCalculator",
    planSlug: planDoc?.slug || "",
    billingCycle,
    billingIntervalCount: planDoc?.billingIntervalCount || 1,
    planType: planDoc?.planType || "",
    planId: planDoc?._id ? String(planDoc._id) : "",
    paypalConfigured: paypalConfigured(),
    trialDays: MOBILE_APP_TRIAL_DAYS,
  };
}

async function upsertBillingPlan({ slug, name, description, customPrice, billingCycle }) {
  await connectDB();
  let plan = await SubscriptionPlan.findOne({ slug });
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name,
      slug,
      planType: "paypal",
      description,
      customPrice,
      currency: "USD",
      billingCycle,
      billingIntervalCount: 1,
      active: true,
    });
  } else {
    let dirty = false;
    if (plan.name !== name) {
      plan.name = name;
      dirty = true;
    }
    if (plan.planType !== "paypal") {
      plan.planType = "paypal";
      dirty = true;
    }
    if (plan.billingCycle !== billingCycle) {
      plan.billingCycle = billingCycle;
      dirty = true;
    }
    if (plan.active !== true) {
      plan.active = true;
      dirty = true;
    }
    if (!plan.description || /IQMotorBase Calculators mobile app/.test(plan.description)) {
      plan.description = description;
      dirty = true;
    }
    if (dirty) await plan.save();
    plan = await alignPlanPrice(plan, customPrice);
  }
  await ensurePaypalSynced(plan);
  return plan;
}

/**
 * Ensure the IQWireCalculator monthly PayPal plan exists.
 */
export async function ensureMobileAppSubscriptionPlan() {
  const slug = planSlugFromEnv();
  return upsertBillingPlan({
    slug,
    name: "IQWireCalculator",
    description:
      "IQWireCalculator PWA: CM Best Match wire calculator, named saves, and print. Not tied to shop management.",
    customPrice: MOBILE_APP_DEFAULT_MONTHLY_USD,
    billingCycle: "monthly",
  });
}

export async function ensureMobileAppYearlySubscriptionPlan() {
  const slug = String(process.env.MOBILE_APP_YEARLY_PLAN_SLUG || MOBILE_APP_YEARLY_PLAN_SLUG)
    .trim()
    .toLowerCase();
  return upsertBillingPlan({
    slug,
    name: "IQWireCalculator Yearly",
    description:
      "IQWireCalculator PWA yearly subscription: CM Best Match wire calculator, named saves, and print.",
    customPrice: MOBILE_APP_DEFAULT_YEARLY_USD,
    billingCycle: "yearly",
  });
}

export async function ensureMobileAppBillingPlans() {
  const monthly = await ensureMobileAppSubscriptionPlan();
  const yearly = await ensureMobileAppYearlySubscriptionPlan();
  return { monthly, yearly };
}

export async function getMobileAppSubscriptionPlan() {
  const plan = await ensureMobileAppSubscriptionPlan();
  const payload = serializePlan(plan, MOBILE_APP_DEFAULT_MONTHLY_USD, "monthly");
  return { ...payload, monthlyUsd: payload.usd };
}

export async function getMobileAppYearlySubscriptionPlan() {
  const plan = await ensureMobileAppYearlySubscriptionPlan();
  return serializePlan(plan, MOBILE_APP_DEFAULT_YEARLY_USD, "yearly");
}

export async function getMobileAppBillingPlans() {
  const { monthly, yearly } = await ensureMobileAppBillingPlans();
  const monthlyPayload = serializePlan(monthly, MOBILE_APP_DEFAULT_MONTHLY_USD, "monthly");
  const yearlyPayload = serializePlan(yearly, MOBILE_APP_DEFAULT_YEARLY_USD, "yearly");
  return {
    trialDays: MOBILE_APP_TRIAL_DAYS,
    currency: "USD",
    paypalConfigured: paypalConfigured(),
    monthly: { ...monthlyPayload, monthlyUsd: monthlyPayload.usd },
    yearly: yearlyPayload,
  };
}

export async function resolveMobileAppPlanByBillingCycle(cycle) {
  const wanted = String(cycle || "monthly").toLowerCase() === "yearly" ? "yearly" : "monthly";
  if (wanted === "yearly") return getMobileAppYearlySubscriptionPlan();
  return getMobileAppSubscriptionPlan();
}

export async function resolvePlanDocForAccount(account) {
  await connectDB();
  const paypalPlanId = String(account?.paypalPlanId || "").trim();
  if (paypalPlanId) {
    const byPaypal = await SubscriptionPlan.findOne({ paypalPlanId });
    if (byPaypal) return byPaypal;
  }
  return ensureMobileAppSubscriptionPlan();
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

export function mobileAppAccountToJson(account, access, planPayload, billingPlans) {
  const trialEnds = account?.trialEndsAt ? new Date(account.trialEndsAt).toISOString() : null;
  const periodEnds = account?.currentPeriodEndsAt
    ? new Date(account.currentPeriodEndsAt).toISOString()
    : null;
  return {
    id: String(account._id),
    email: account.email,
    name: account.name || "",
    companyName: account.companyName || "",
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
          monthlyUsd: planPayload.monthlyUsd ?? planPayload.usd,
          usd: planPayload.usd ?? planPayload.monthlyUsd,
          currency: planPayload.currency,
          billingCycle: planPayload.billingCycle,
          configured: planPayload.configured,
          paypalConfigured: planPayload.paypalConfigured,
        }
      : null,
    plans: billingPlans
      ? {
          monthly: {
            name: billingPlans.monthly.planName,
            slug: billingPlans.monthly.planSlug,
            usd: billingPlans.monthly.usd,
            configured: billingPlans.monthly.configured,
          },
          yearly: {
            name: billingPlans.yearly.planName,
            slug: billingPlans.yearly.planSlug,
            usd: billingPlans.yearly.usd,
            configured: billingPlans.yearly.configured,
          },
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
  const plan = await resolvePlanDocForAccount(account);
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
    companyName: account.companyName || "",
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
