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
