import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Customer from "@/models/Customer";
import ShopSubscription from "@/models/ShopSubscription";
import { LISTING_ONLY_WEBSITE_LEAD_CONTACTS_PER_MONTH } from "@/lib/listing-account-messages";
import { planIsListingDirectoryTier } from "@/lib/listing-tier-plan";

/**
 * True when directory listing CRM limits apply: User.listingOnlyAccount OR subscription plan is Listing tier (internal or PayPal).
 */
export async function userIsListingOnlyAccount(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return false;
  await connectDB();
  const u = await User.findOne({ email }).select("listingOnlyAccount").lean();
  if (u?.listingOnlyAccount) return true;
  const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
  if (!sub?.planId) return false;
  return planIsListingDirectoryTier(sub.planId);
}

export async function listingOnlyCustomerCount(ownerEmail) {
  const email = (ownerEmail || "").trim().toLowerCase();
  if (!email) return 0;
  await connectDB();
  return Customer.countDocuments({ createdByEmail: email });
}

/** UTC month bounds for “per month” lead visibility. */
export function currentUtcMonthBounds() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
}

/**
 * Resolve lead source the same way as dashboard leads list.
 */
export function resolveLeadSourceForRow(lead, userEmail, listingIds) {
  const u = (userEmail || "").trim().toLowerCase();
  if (lead.leadSource) return lead.leadSource;
  if (lead.createdByEmail?.toLowerCase() === u) return "manual";
  if (lead.sourceListingId && listingIds.includes(lead.sourceListingId)) return "website";
  return "admin_assigned";
}

/**
 * Directory listing tier: full contact for manual + admin_assigned leads always.
 * Website leads: full contact only for the first N submissions in the current UTC month (oldest first).
 * Older website leads (other months) stay masked unless they fall in the monthly quota logic above.
 */
export function buildListingTierVisibleContactIds(list, userEmail, listingIds) {
  const em = (userEmail || "").trim().toLowerCase();
  const visible = new Set();
  const { start, end } = currentUtcMonthBounds();
  const websiteThisMonth = [];
  for (const l of list) {
    const src = resolveLeadSourceForRow(l, em, listingIds);
    if (src === "manual" || src === "admin_assigned") {
      visible.add(l.id);
      continue;
    }
    if (src === "website") {
      const t = new Date(l.createdAt);
      if (t >= start && t <= end) websiteThisMonth.push(l);
    }
  }
  websiteThisMonth.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  for (const l of websiteThisMonth.slice(0, LISTING_ONLY_WEBSITE_LEAD_CONTACTS_PER_MONTH)) {
    visible.add(l.id);
  }
  return visible;
}

function maskEmail(email) {
  const s = (email || "").trim();
  if (!s.includes("@")) return "••••@••••.•••";
  const [local, domain] = s.split("@");
  const dom = domain || "";
  return `${(local || "").slice(0, 2)}•••@${dom.slice(0, 1)}•••`;
}

function maskPhone(phone) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length < 4) return "••••••••";
  return `•••••${d.slice(-2)}`;
}

export function maskLeadForListingOnly(lead, visibleContactIds) {
  if (visibleContactIds.has(lead.id)) return { ...lead, contactMasked: false };
  return {
    ...lead,
    email: maskEmail(lead.email),
    phone: maskPhone(lead.phone),
    message: lead.message ? "•••••••" : "",
    problemDescription: lead.problemDescription ? "•••••••" : "",
    contactMasked: true,
  };
}

/**
 * Shared list pipeline for dashboard leads (list + detail).
 * Listing tier: all shop leads are returned; contact masking is driven by source + monthly website quota.
 */
export async function enrichLeadsForDashboard(userEmail, listingIds, listWithSourceResolved) {
  const em = (userEmail || "").trim().toLowerCase();
  const listingOnly = await userIsListingOnlyAccount(em);
  const scoped = listWithSourceResolved;
  const visibleIds = listingOnly
    ? buildListingTierVisibleContactIds(scoped, em, listingIds)
    : new Set(scoped.map((l) => l.id));
  return { listingOnly, scoped, visibleIds };
}
