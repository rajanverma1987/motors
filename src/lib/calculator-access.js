import crypto from "crypto";
import { connectDB } from "@/lib/db";
import CalculatorEntitlement from "@/models/CalculatorEntitlement";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { calculatorAccessBypassEnabled } from "@/lib/calculator-pricing";
import { calculatorAuthUrls } from "@/lib/calculator-auth-flow";
import { resolveCalculatorPortalTier } from "@/lib/calculator-portal-tier";

export async function getOrCreateEntitlementForEmail(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) throw new Error("Account email is required");
  await connectDB();
  let doc = await CalculatorEntitlement.findOne({ ownerEmail: email });
  if (!doc) {
    doc = await CalculatorEntitlement.create({
      ownerEmail: email,
      entitlementId: crypto.randomUUID(),
    });
  }
  return doc.toObject();
}

/**
 * Calculator access is tied to a signed-in portal account (email), not cookies.
 * @returns {Promise<{
 *   bypass: boolean,
 *   authenticated: boolean,
 *   email: string,
 *   doc: object | null,
 *   entitlementId: string,
 *   user: object | null
 * }>}
 */
export async function requireCalculatorAccount(request) {
  if (calculatorAccessBypassEnabled()) {
    const user = await getPortalUserFromRequest(request);
    const email = user?.email?.trim().toLowerCase() || "";
    const doc = email ? await getOrCreateEntitlementForEmail(email) : null;
    return {
      bypass: true,
      authenticated: !!email,
      email,
      doc,
      entitlementId: doc?.entitlementId || "",
      user: user || null,
    };
  }

  const user = await getPortalUserFromRequest(request);
  const email = user?.email?.trim().toLowerCase() || "";
  if (!email) {
    return {
      bypass: false,
      authenticated: false,
      email: "",
      doc: null,
      entitlementId: "",
      user: null,
    };
  }

  const doc = await getOrCreateEntitlementForEmail(email);
  return {
    bypass: false,
    authenticated: true,
    email,
    doc,
    entitlementId: doc.entitlementId,
    user,
  };
}

export function calculatorAuthRequiredResponse(nextPath) {
  const urls = calculatorAuthUrls(nextPath);
  return {
    error: "Sign in to your IQMotorBase portal account before purchasing calculator access.",
    authenticated: false,
    ...urls,
  };
}

export function hasActiveSubscription(doc) {
  if (!doc?.subscriptionExpiresAt) return false;
  return new Date(doc.subscriptionExpiresAt) > new Date();
}

export function hasCalculatorEstimateAccess(doc, { bypass, fullCrmIncludesCalculators } = {}) {
  if (bypass || calculatorAccessBypassEnabled() || fullCrmIncludesCalculators) return true;
  if (!doc) return false;
  if (hasActiveSubscription(doc)) return true;
  return Number(doc.credits) > 0;
}

export function hasDashboardCalculatorAccess(doc, { bypass, fullCrmIncludesCalculators } = {}) {
  if (bypass || calculatorAccessBypassEnabled() || fullCrmIncludesCalculators) return true;
  if (!doc) return false;
  return hasActiveSubscription(doc);
}

export function describeCalculatorAccess(doc, { bypass, fullCrmIncludesCalculators } = {}) {
  if (bypass || calculatorAccessBypassEnabled()) {
    return { allowed: true, dashboardAllowed: true, mode: "bypass", credits: 0 };
  }
  if (fullCrmIncludesCalculators) {
    const credits = Number(doc?.credits) || 0;
    const subActive = doc && hasActiveSubscription(doc);
    return {
      allowed: true,
      dashboardAllowed: true,
      mode: subActive ? "subscription" : credits > 0 ? "credit" : "crm_included",
      credits,
    };
  }
  if (!doc) return { allowed: false, dashboardAllowed: false, mode: "none", credits: 0 };
  if (hasActiveSubscription(doc)) {
    return {
      allowed: true,
      dashboardAllowed: true,
      mode: "subscription",
      credits: Number(doc.credits) || 0,
    };
  }
  const credits = Number(doc.credits) || 0;
  if (credits > 0) {
    return { allowed: true, dashboardAllowed: false, mode: "credit", credits };
  }
  return { allowed: false, dashboardAllowed: false, mode: "none", credits: 0 };
}

/** Portal policy + entitlement for /api/calculators/access and estimate routes. */
export async function describeCalculatorAccessForPortal(ownerEmail, doc, { bypass } = {}) {
  const tier = await resolveCalculatorPortalTier(ownerEmail);
  const access = describeCalculatorAccess(doc, {
    bypass,
    fullCrmIncludesCalculators: tier.fullCrmIncludesCalculators,
  });
  return { access, tier };
}

export async function consumeCalculatorCredit(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  const doc = await CalculatorEntitlement.findOne({ ownerEmail: email }).lean();
  if (!doc || hasActiveSubscription(doc)) return;
  if ((Number(doc.credits) || 0) < 1) return;
  await CalculatorEntitlement.updateOne({ ownerEmail: email }, { $inc: { credits: -1 } });
}

export async function grantCalculatorCredit(ownerEmail, count = 1) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  await getOrCreateEntitlementForEmail(email);
  await CalculatorEntitlement.updateOne({ ownerEmail: email }, { $inc: { credits: Math.max(1, count) } });
}

export async function grantCalculatorSubscription({
  ownerEmail,
  paypalSubscriptionId,
  expiresAt,
}) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  await getOrCreateEntitlementForEmail(email);
  await CalculatorEntitlement.updateOne(
    { ownerEmail: email },
    {
      $set: {
        paypalSubscriptionId: String(paypalSubscriptionId || "").trim(),
        subscriptionExpiresAt: expiresAt,
        internalState: "subscription_active",
        pendingPaypalOrderId: "",
      },
    }
  );
}

export async function extendCalculatorSubscriptionMonths(ownerEmail, months = 1) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  const doc = await CalculatorEntitlement.findOne({ ownerEmail: email }).lean();
  const base =
    doc?.subscriptionExpiresAt && new Date(doc.subscriptionExpiresAt) > new Date()
      ? new Date(doc.subscriptionExpiresAt)
      : new Date();
  const end = new Date(base);
  end.setMonth(end.getMonth() + months);
  await CalculatorEntitlement.updateOne(
    { ownerEmail: email },
    {
      $set: {
        subscriptionExpiresAt: end,
        internalState: "subscription_active",
      },
    }
  );
}

export async function applyCalculatorSubscriptionActivated({ paypalSubscriptionId, eventId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  const doc = await CalculatorEntitlement.findOne({ paypalSubscriptionId: subId }).lean();
  if (!doc?.ownerEmail) return;
  await extendCalculatorSubscriptionMonths(doc.ownerEmail, 1);
  if (eventId) {
    await CalculatorEntitlement.updateOne(
      { ownerEmail: doc.ownerEmail },
      { $set: { lastPaypalOrderId: String(eventId).slice(0, 120) } }
    );
  }
}

export async function applyCalculatorSubscriptionCancelled({ paypalSubscriptionId }) {
  const subId = String(paypalSubscriptionId || "").trim();
  if (!subId) return;
  await connectDB();
  await CalculatorEntitlement.updateMany(
    { paypalSubscriptionId: subId },
    { $set: { internalState: "subscription_cancelled" } }
  );
}

export async function setPendingPaypalOrder(ownerEmail, orderId) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  await getOrCreateEntitlementForEmail(email);
  await CalculatorEntitlement.updateOne(
    { ownerEmail: email },
    { $set: { pendingPaypalOrderId: String(orderId || "").trim() } }
  );
}

export async function clearPendingPaypalOrder(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  await connectDB();
  await CalculatorEntitlement.updateOne({ ownerEmail: email }, { $set: { pendingPaypalOrderId: "" } });
}

export function entitlementToJson(doc, access, { email, tier } = {}) {
  return {
    authenticated: true,
    accountEmail: email || doc?.ownerEmail || "",
    hasAccess: access.allowed,
    hasDashboardAccess: access.dashboardAllowed,
    accessMode: access.mode,
    credits: access.credits,
    subscriptionExpiresAt: doc?.subscriptionExpiresAt
      ? new Date(doc.subscriptionExpiresAt).toISOString()
      : null,
    calculatorOnlyTier: !!tier?.calculatorOnlyTier,
    fullCrmIncludesCalculators: tier?.fullCrmIncludesCalculators === true,
    showCalculatorPaywall: !!tier?.calculatorOnlyTier && !access.dashboardAllowed,
  };
}
