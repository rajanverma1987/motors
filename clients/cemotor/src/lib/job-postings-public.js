import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import User from "@/models/User";
import Listing from "@/models/Listing";

/** Format city, state, zip from an approved directory listing. */
export function formatCompanyLocationFromListing(listing) {
  if (!listing) return "";
  const city = String(listing.city || "").trim();
  const state = String(listing.state || "").trim();
  const zip = String(listing.zipCode || "").trim();
  const cs = [city, state].filter(Boolean).join(", ");
  if (!cs && !zip) return "";
  if (cs && zip) return `${cs} ${zip}`;
  return cs || zip;
}

/**
 * @param {{ shopName?: string; contactName?: string; companyLocation?: string }} bundle
 */
function serializePosting(doc, bundle) {
  const b = bundle || {};
  const shopName = String(b.shopName || "").trim();
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    description: doc.description || "",
    location: doc.location || "",
    department: doc.department || "",
    employmentType: doc.employmentType || "full_time",
    experienceLevel: doc.experienceLevel || "any",
    salaryDisplay: doc.salaryDisplay || "",
    responsibilities: doc.responsibilities || "",
    qualifications: doc.qualifications || "",
    benefits: doc.benefits || "",
    /** Display name: directory listing company or CRM shop name */
    shopName: shopName || "Motor repair shop",
    companyContactName: String(b.contactName || "").trim(),
    companyLocation: String(b.companyLocation || "").trim(),
    updatedAt: doc.updatedAt,
  };
}

function companyBundleForEmail(ownerEmail, userByEmail, listingByEmail) {
  const e = String(ownerEmail || "").toLowerCase().trim();
  const u = userByEmail[e];
  const L = listingByEmail[e];
  const shopName = (L?.companyName || u?.shopName || "").trim();
  const contactName = (u?.contactName || "").trim();
  const companyLocation = formatCompanyLocationFromListing(L);
  return { shopName, contactName, companyLocation };
}

export async function getPublicJobPostings() {
  await connectDB();
  const list = await JobPosting.find({
    status: "open",
    listedOnMarketingSite: true,
  })
    .sort({ updatedAt: -1 })
    .lean();

  const emails = [...new Set(list.map((l) => String(l.ownerEmail || "").toLowerCase()))];
  const users = await User.find({ email: { $in: emails } })
    .select("email shopName contactName")
    .lean();
  const userByEmail = Object.fromEntries(users.map((u) => [u.email, u]));

  const listings = await Listing.find({ email: { $in: emails }, status: "approved" })
    .select("email companyName city state zipCode")
    .lean();
  const listingByEmail = {};
  for (const L of listings) {
    const em = String(L.email || "").toLowerCase().trim();
    if (em && !listingByEmail[em]) listingByEmail[em] = L;
  }

  return list.map((doc) =>
    serializePosting(doc, companyBundleForEmail(doc.ownerEmail, userByEmail, listingByEmail))
  );
}

export async function getPublicJobPostingSlugs() {
  await connectDB();
  const list = await JobPosting.find({
    status: "open",
    listedOnMarketingSite: true,
  })
    .select("slug")
    .lean();
  return list.map((d) => d.slug).filter(Boolean);
}

export async function getPublicJobPostingBySlug(slug) {
  if (!slug || typeof slug !== "string") return null;
  await connectDB();
  const trimmed = decodeURIComponent(slug).trim();
  const doc = await JobPosting.findOne({
    slug: trimmed,
    status: "open",
    listedOnMarketingSite: true,
  }).lean();
  if (!doc) return null;
  const email = String(doc.ownerEmail || "").toLowerCase().trim();
  const user = await User.findOne({ email }).select("shopName contactName").lean();
  const listing = await Listing.findOne({ email, status: "approved" })
    .select("companyName city state zipCode")
    .lean();
  const userByEmail = user ? { [email]: user } : {};
  const listingByEmail = listing ? { [email]: listing } : {};
  return serializePosting(doc, companyBundleForEmail(doc.ownerEmail, userByEmail, listingByEmail));
}
