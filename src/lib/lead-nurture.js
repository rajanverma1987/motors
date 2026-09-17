import crypto from "crypto";
import { connectDB } from "@/lib/db";
import LeadNurtureOptOut from "@/models/LeadNurtureOptOut";
import ShopSubscription from "@/models/ShopSubscription";
import User from "@/models/User";
import MarketingContact from "@/models/MarketingContact";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getDemoBookingUrl } from "@/lib/demo-booking-url";
import { sendLeadPlatformNurtureEmail } from "@/lib/email";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

const UNSUB_SECRET = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;
/** Minimum days between nurture emails to the same address. */
export const LEAD_NURTURE_COOLDOWN_DAYS = 30;

/**
 * @param {string} email
 * @returns {string}
 */
export function normalizeLeadNurtureEmail(email) {
  return clampString(String(email || ""), LIMITS.email.max).trim().toLowerCase();
}

/**
 * @param {string} email
 * @returns {string}
 */
export function getLeadNurtureUnsubscribeToken(email) {
  if (!UNSUB_SECRET) return "";
  const normalized = normalizeLeadNurtureEmail(email);
  if (!normalized) return "";
  return crypto.createHmac("sha256", UNSUB_SECRET).update(`lead-nurture:${normalized}`).digest("base64url");
}

/**
 * @param {string} email
 * @param {string} token
 * @returns {boolean}
 */
export function verifyLeadNurtureUnsubscribeToken(email, token) {
  const expected = getLeadNurtureUnsubscribeToken(email);
  if (!UNSUB_SECRET) return true;
  if (!expected || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * @param {string} email
 * @param {string} [baseUrl]
 * @returns {string}
 */
export function buildLeadNurtureUnsubscribeUrl(email, baseUrl) {
  const base = String(baseUrl || getPublicSiteUrl()).replace(/\/+$/, "");
  const normalized = normalizeLeadNurtureEmail(email);
  const token = getLeadNurtureUnsubscribeToken(normalized);
  const params = new URLSearchParams({ email: normalized });
  if (token) params.set("token", token);
  return `${base}/api/lead-nurture/unsubscribe?${params.toString()}`;
}

/**
 * True when the shop already pays for IQMotorBase (PayPal-backed active/trialing plan).
 * Free Ultimate, Trial, Listing-only, and shops with no paid plan are not paying.
 * @param {{ email?: string, crmUserId?: unknown } | null | undefined} listing
 * @returns {Promise<boolean>}
 */
export async function listingIsPayingIqMotorBaseCustomer(listing) {
  await connectDB();
  const emails = new Set();
  const primary = normalizeLeadNurtureEmail(listing?.email);
  if (primary && isValidEmail(primary)) emails.add(primary);

  if (listing?.crmUserId) {
    const user = await User.findById(listing.crmUserId)
      .select("email listingOnlyAccount calculatorOnlyAccount")
      .lean();
    if (user?.listingOnlyAccount || user?.calculatorOnlyAccount) {
      return false;
    }
    const login = normalizeLeadNurtureEmail(user?.email);
    if (login && isValidEmail(login)) emails.add(login);
  }

  for (const email of emails) {
    const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
    if (!sub || sub.revokedAt) continue;
    const plan = sub.planId;
    if (!plan || plan.planType !== "paypal") continue;
    const state = String(sub.internalState || "");
    if (state === "active" || state === "trialing") return true;
    if (state === "past_due") {
      const grace = sub.gracePeriodEndsAt ? new Date(sub.gracePeriodEndsAt) : null;
      if (grace && grace > new Date()) return true;
    }
  }
  return false;
}

/**
 * @param {string} email
 * @returns {Promise<boolean>}
 */
export async function isLeadNurtureOptedOut(email) {
  const normalized = normalizeLeadNurtureEmail(email);
  if (!normalized) return true;
  await connectDB();
  const row = await LeadNurtureOptOut.findOne({ email: normalized }).select("optedOutAt").lean();
  if (row?.optedOutAt) return true;
  const marketing = await MarketingContact.findOne({ email: normalized }).select("status").lean();
  if (marketing && ["unsubscribed", "do_not_contact"].includes(String(marketing.status || ""))) {
    return true;
  }
  return false;
}

/**
 * @param {string} email
 * @returns {Promise<void>}
 */
export async function recordLeadNurtureOptOut(email) {
  const normalized = normalizeLeadNurtureEmail(email);
  if (!normalized || !isValidEmail(normalized)) return;
  await connectDB();
  await LeadNurtureOptOut.findOneAndUpdate(
    { email: normalized },
    { $set: { optedOutAt: new Date() } },
    { upsert: true }
  );
  await MarketingContact.findOneAndUpdate(
    { email: normalized },
    {
      $set: { status: "unsubscribed", email: normalized },
      $setOnInsert: { companyName: "", name: "" },
    },
    { upsert: true }
  );
}

/**
 * After a website or IQMotorTrack repair lead is delivered to a listing,
 * optionally send the platform nurture email to non-paying shops.
 *
 * @param {object} opts
 * @param {{ email?: string, companyName?: string, primaryContactPerson?: string, crmUserId?: unknown } | null} opts.listing
 * @param {string} [opts.siteUrl]
 * @param {"website"|"iqmotortrack"|"admin_assign"|"backfill"} [opts.source]
 * @param {boolean} [opts.ignoreCooldown] send even if within cooldown window
 * @param {boolean} [opts.skipIfAlreadySent] skip when lastSentAt is set (backfill default)
 */
export async function maybeSendLeadPlatformNurtureEmail({
  listing,
  siteUrl,
  source = "website",
  ignoreCooldown = false,
  skipIfAlreadySent = false,
} = {}) {
  try {
    if (!listing) return { sent: false, reason: "no_listing" };
    if (await listingIsPayingIqMotorBaseCustomer(listing)) {
      return { sent: false, reason: "paying_customer" };
    }

    const to = normalizeLeadNurtureEmail(listing.email);
    if (!to || !isValidEmail(to)) {
      return { sent: false, reason: "no_email" };
    }
    if (await isLeadNurtureOptedOut(to)) {
      return { sent: false, reason: "opted_out" };
    }

    await connectDB();
    const existing = await LeadNurtureOptOut.findOne({ email: to }).lean();
    if (skipIfAlreadySent && existing?.lastSentAt) {
      return { sent: false, reason: "already_sent" };
    }
    if (!ignoreCooldown && existing?.lastSentAt) {
      const elapsedMs = Date.now() - new Date(existing.lastSentAt).getTime();
      const cooldownMs = LEAD_NURTURE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      if (elapsedMs < cooldownMs) {
        return { sent: false, reason: "cooldown" };
      }
    }

    const name =
      String(listing.companyName || "").trim() ||
      String(listing.primaryContactPerson || "").trim() ||
      "there";
    const base = String(siteUrl || getPublicSiteUrl()).replace(/\/+$/, "");
    const unsubscribeUrl = buildLeadNurtureUnsubscribeUrl(to, base);
    const bookingUrl = getDemoBookingUrl();

    const result = await sendLeadPlatformNurtureEmail({
      to,
      name,
      bookingUrl,
      unsubscribeUrl,
    });

    if (!result?.ok) {
      return { sent: false, reason: result?.error || "send_failed" };
    }

    await LeadNurtureOptOut.findOneAndUpdate(
      { email: to },
      {
        $set: {
          lastSentAt: new Date(),
          lastSource: String(source || "").slice(0, 40),
          optedOutAt: null,
        },
      },
      { upsert: true }
    );

    return { sent: true, to };
  } catch (err) {
    console.warn("Lead platform nurture email failed:", err?.message || err);
    return { sent: false, reason: err?.message || "error" };
  }
}
