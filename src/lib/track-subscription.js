import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import TrackFacility from "@/models/TrackFacility";
import TrackMotor from "@/models/TrackMotor";
import {
  createPaypalProductAndPlan,
  paypalConfigured,
  cancelPaypalSubscription,
} from "@/lib/paypal-api";
import {
  IQMOTORTRACK_FREE_MOTOR_LIMIT,
  IQMOTORTRACK_MONTHLY_USD,
} from "@/lib/iqmotortrack-marketing";

export const TRACK_SUBSCRIPTION_PLAN_SLUG = "iqmotortrack-pro";
export const TRACK_FREE_MOTOR_LIMIT = IQMOTORTRACK_FREE_MOTOR_LIMIT;
export const TRACK_DEFAULT_MONTHLY_USD = IQMOTORTRACK_MONTHLY_USD;

function pricesMatch(a, b) {
  return Number(a).toFixed(2) === Number(b).toFixed(2);
}

async function ensurePaypalSynced(planDoc) {
  if (!paypalConfigured() || !planDoc) return planDoc;
  if (planDoc.planType !== "paypal") return planDoc;
  const price = Number(planDoc.customPrice);
  if (!Number.isFinite(price) || price <= 0) return planDoc;
  if (String(planDoc.paypalPlanId || "").trim()) return planDoc;
  try {
    const { paypalProductId, paypalPlanId } = await createPaypalProductAndPlan(planDoc);
    planDoc.paypalProductId = paypalProductId;
    planDoc.paypalPlanId = paypalPlanId;
    await planDoc.save();
  } catch (err) {
    console.warn("ensureTrackPaypalSynced:", err.message);
  }
  return planDoc;
}

async function upsertBillingPlan() {
  await connectDB();
  const slug = TRACK_SUBSCRIPTION_PLAN_SLUG;
  let plan = await SubscriptionPlan.findOne({ slug });
  if (!plan) {
    plan = await SubscriptionPlan.create({
      name: "IQMotorTrack Pro",
      slug,
      description: "Unlimited motors for plant motor maintenance and repair tracking.",
      planType: "paypal",
      customPrice: TRACK_DEFAULT_MONTHLY_USD,
      currency: "USD",
      billingCycle: "monthly",
      billingIntervalCount: 1,
      isActive: true,
    });
  } else if (!pricesMatch(plan.customPrice, TRACK_DEFAULT_MONTHLY_USD)) {
    plan.customPrice = TRACK_DEFAULT_MONTHLY_USD;
    plan.planType = "paypal";
    plan.billingCycle = "monthly";
    plan.isActive = true;
    await plan.save();
  }
  return ensurePaypalSynced(plan);
}

export async function ensureTrackBillingPlan() {
  const plan = await upsertBillingPlan();
  const usd = Number(plan?.customPrice);
  const paypalPlanId = String(plan?.paypalPlanId || "").trim();
  return {
    configured: !!paypalPlanId && Number.isFinite(usd) && usd > 0,
    paypalPlanId,
    usd: Number.isFinite(usd) ? usd : TRACK_DEFAULT_MONTHLY_USD,
    currency: String(plan?.currency || "USD").toUpperCase(),
    planName: plan?.name || "IQMotorTrack Pro",
    planSlug: plan?.slug || TRACK_SUBSCRIPTION_PLAN_SLUG,
    billingCycle: "monthly",
    planType: plan?.planType || "paypal",
    planId: plan?._id ? String(plan._id) : "",
    paypalConfigured: paypalConfigured(),
    freeMotorLimit: TRACK_FREE_MOTOR_LIMIT,
  };
}

export function isTrackPro(facility) {
  if (!facility) return false;
  if (String(facility.plan || "") !== "pro") return false;
  const status = String(facility.subscriptionStatus || "");
  if (status === "active") return true;
  if (status === "cancelled" || status === "past_due") {
    const ends = facility.currentPeriodEndsAt ? new Date(facility.currentPeriodEndsAt).getTime() : 0;
    return ends > Date.now();
  }
  return false;
}

export async function countActiveMotors(facilityId) {
  await connectDB();
  return TrackMotor.countDocuments({
    facilityId,
    archived: { $ne: true },
  });
}

export async function canAddMotor(facility) {
  if (isTrackPro(facility)) {
    return { ok: true, pro: true, limit: null, count: await countActiveMotors(facility._id) };
  }
  const count = await countActiveMotors(facility._id);
  const limit = TRACK_FREE_MOTOR_LIMIT;
  return {
    ok: count < limit,
    pro: false,
    limit,
    count,
    remaining: Math.max(0, limit - count),
  };
}

export function describeTrackAccess(facility, motorCount = 0) {
  const pro = isTrackPro(facility);
  const limit = pro ? null : TRACK_FREE_MOTOR_LIMIT;
  return {
    plan: pro ? "pro" : "free",
    subscriptionStatus: String(facility?.subscriptionStatus || "free"),
    isPro: pro,
    motorCount,
    motorLimit: limit,
    motorsRemaining: pro ? null : Math.max(0, TRACK_FREE_MOTOR_LIMIT - motorCount),
    usageLabel: pro
      ? `${motorCount} motors (unlimited)`
      : `${motorCount} of ${TRACK_FREE_MOTOR_LIMIT} motors`,
    monthlyUsd: TRACK_DEFAULT_MONTHLY_USD,
  };
}

export function trackFacilityToJson(facility, access, billing) {
  return {
    id: String(facility._id),
    email: facility.email,
    facilityName: facility.facilityName,
    contactName: facility.contactName,
    phone: facility.phone || "",
    address: facility.address || "",
    city: facility.city || "",
    state: facility.state || "",
    postalCode: facility.postalCode || "",
    country: facility.country || "",
    countryCode: facility.countryCode || "",
    plan: access.plan,
    subscriptionStatus: access.subscriptionStatus,
    isPro: access.isPro,
    motorCount: access.motorCount,
    motorLimit: access.motorLimit,
    motorsRemaining: access.motorsRemaining,
    usageLabel: access.usageLabel,
    currentPeriodEndsAt: facility.currentPeriodEndsAt || null,
    cancelAtPeriodEnd: Boolean(facility.cancelAtPeriodEnd),
    billing,
  };
}

export async function applyTrackSubscriptionActivated({ paypalSubscriptionId, eventId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const facility = await TrackFacility.findOne({ paypalSubscriptionId: subId });
  if (!facility) return;
  facility.plan = "pro";
  facility.subscriptionStatus = "active";
  facility.lastPaymentAt = new Date();
  facility.lastPaymentFailedAt = null;
  facility.cancelAtPeriodEnd = false;
  const period = new Date();
  period.setMonth(period.getMonth() + 1);
  facility.currentPeriodEndsAt = period;
  await facility.save();
  console.log("Track Pro activated", { facilityId: String(facility._id), eventId, subId });
}

export async function applyTrackSubscriptionCancelled({ paypalSubscriptionId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const facility = await TrackFacility.findOne({ paypalSubscriptionId: subId });
  if (!facility) return;
  const periodEnds = facility.currentPeriodEndsAt ? new Date(facility.currentPeriodEndsAt).getTime() : 0;
  if (periodEnds > Date.now()) {
    facility.subscriptionStatus = "cancelled";
    facility.cancelAtPeriodEnd = true;
    facility.plan = "pro";
  } else {
    facility.subscriptionStatus = "cancelled";
    facility.plan = "free";
    facility.cancelAtPeriodEnd = false;
  }
  await facility.save();
}

export async function applyTrackPaymentDenied({ paypalSubscriptionId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const facility = await TrackFacility.findOne({ paypalSubscriptionId: subId });
  if (!facility) return;
  facility.subscriptionStatus = "past_due";
  facility.lastPaymentFailedAt = new Date();
  await facility.save();
}

export async function findTrackFacilityForPaypalEvent({
  paypalSubscriptionId,
  subscriberEmail,
  customId,
}) {
  await connectDB();
  const subId = String(paypalSubscriptionId || "").trim();
  if (subId) {
    const bySub = await TrackFacility.findOne({ paypalSubscriptionId: subId });
    if (bySub) return bySub;
  }
  const token = String(customId || "").trim();
  if (token) {
    const byToken = await TrackFacility.findOne({
      paypalCheckoutToken: token,
      paypalCheckoutTokenExpiresAt: { $gt: new Date() },
    });
    if (byToken) return byToken;
  }
  const email = String(subscriberEmail || "").trim().toLowerCase();
  if (email) {
    return TrackFacility.findOne({ email });
  }
  return null;
}

export async function cancelTrackPaypalSubscription(facility) {
  const subId = String(facility?.paypalSubscriptionId || "").trim();
  if (!subId || !paypalConfigured()) return;
  try {
    await cancelPaypalSubscription(subId, "Cancelled by facility from IQMotorTrack");
  } catch (err) {
    console.warn("cancelTrackPaypalSubscription:", err.message);
  }
}

function isoOrNull(d) {
  if (!d) return null;
  try {
    return new Date(d).toISOString();
  } catch {
    return null;
  }
}

export function trackSubscriptionTypeLabel(facility) {
  const status = String(facility?.subscriptionStatus || "free");
  if (status === "active") return "Pro";
  if (status === "past_due") return "Past due";
  if (status === "cancelled") return "Cancelled";
  if (status === "expired") return "Expired";
  return "Free";
}

export function trackNextDueAt(facility) {
  const status = String(facility?.subscriptionStatus || "free");
  if (status === "active" || status === "cancelled" || status === "past_due") {
    return facility.currentPeriodEndsAt || null;
  }
  return facility.currentPeriodEndsAt || null;
}

export function trackFacilityToAdminJson(facility, { motorCount = 0 } = {}) {
  const pro = isTrackPro(facility);
  return {
    id: String(facility._id),
    email: facility.email,
    facilityName: facility.facilityName || "",
    contactName: facility.contactName || "",
    name: facility.contactName || "",
    phone: facility.phone || "",
    country: facility.country || "",
    countryCode: facility.countryCode || "",
    canLogin: facility.canLogin !== false,
    banned: facility.canLogin === false,
    plan: facility.plan || "free",
    subscriptionStatus: facility.subscriptionStatus,
    subscriptionType: trackSubscriptionTypeLabel(facility),
    lastPaidAt: isoOrNull(facility.lastPaymentAt),
    nextDueAt: isoOrNull(trackNextDueAt(facility)),
    currentPeriodEndsAt: isoOrNull(facility.currentPeriodEndsAt),
    lastLoginAt: isoOrNull(facility.lastLoginAt),
    createdAt: isoOrNull(facility.createdAt),
    paypalSubscriptionId: facility.paypalSubscriptionId || "",
    cancelAtPeriodEnd: Boolean(facility.cancelAtPeriodEnd),
    isPro: pro,
    unlocked: pro,
    motorCount: Number(motorCount) || 0,
    motorLimit: pro ? null : TRACK_FREE_MOTOR_LIMIT,
  };
}

/** Cancel PayPal if present and force Free plan immediately. Login still allowed unless banned. */
export async function revokeTrackAccess(facility) {
  const subId = String(facility.paypalSubscriptionId || "").trim();
  if (subId) {
    try {
      await cancelPaypalSubscription(subId, "Admin removed IQMotorTrack Pro access");
    } catch (err) {
      console.warn("revokeTrackAccess paypal:", err.message);
    }
  }
  const now = new Date();
  facility.plan = "free";
  facility.subscriptionStatus = "expired";
  facility.cancelAtPeriodEnd = true;
  facility.currentPeriodEndsAt = now;
  await facility.save();
  return facility;
}

/** Grant or extend complimentary Pro for N days (admin). */
export function grantTrackProDays(facility, days) {
  const n = Math.floor(Number(days));
  if (!Number.isFinite(n) || n < 1 || n > 365) {
    throw new Error("Pro grant must be between 1 and 365 days");
  }
  const now = Date.now();
  const currentEnd =
    facility.plan === "pro" && facility.currentPeriodEndsAt
      ? new Date(facility.currentPeriodEndsAt).getTime()
      : 0;
  const from = Math.max(now, currentEnd);
  const next = new Date(from);
  next.setDate(next.getDate() + n);
  facility.plan = "pro";
  facility.subscriptionStatus = "active";
  facility.cancelAtPeriodEnd = false;
  facility.currentPeriodEndsAt = next;
  return facility;
}

export async function motorCountsByFacilityIds(facilityIds) {
  await connectDB();
  const ids = (facilityIds || []).filter(Boolean);
  if (!ids.length) return new Map();
  const rows = await TrackMotor.aggregate([
    { $match: { facilityId: { $in: ids }, archived: { $ne: true } } },
    { $group: { _id: "$facilityId", count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const row of rows) {
    map.set(String(row._id), Number(row.count) || 0);
  }
  return map;
}

