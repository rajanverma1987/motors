import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import Lead from "@/models/Lead";
import ListingPageViewDaily from "@/models/ListingPageViewDaily";
import { getListingPublicPathSegment } from "@/lib/listing-slug";

const LISTING_PATH_PREFIX = "/electric-motor-repair-shops-listings";

export function utcDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function currentUtcMonthPrefix(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Record one page view for an approved public listing.
 * @param {string} listingId
 */
export async function recordListingPageView(listingId) {
  if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) return false;

  await connectDB();

  const approved = await Listing.exists({ _id: listingId, status: "approved" });
  if (!approved) return false;

  const dateKey = utcDateKey();
  await ListingPageViewDaily.findOneAndUpdate(
    { listingId, dateKey },
    { $inc: { count: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return true;
}

/**
 * @param {{ page?: number, pageSize?: number, search?: string, sort?: string }} options
 */
export async function getAdminListingStats(options = {}) {
  const page = Math.max(1, Number.parseInt(String(options.page || "1"), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(String(options.pageSize || "25"), 10) || 25));
  const search = String(options.search || "")
    .trim()
    .toLowerCase();
  const sort = options.sort === "visitsThisMonth" ? "visitsThisMonth" : "visitsOverall";

  await connectDB();

  const monthPrefix = currentUtcMonthPrefix();

  const [monthlyViews, overallViews, quoteCounts] = await Promise.all([
    ListingPageViewDaily.aggregate([
      { $match: { dateKey: { $regex: `^${monthPrefix}` } } },
      { $group: { _id: "$listingId", count: { $sum: "$count" } } },
    ]),
    ListingPageViewDaily.aggregate([{ $group: { _id: "$listingId", count: { $sum: "$count" } } }]),
    Lead.aggregate([
      { $match: { sourceListingId: { $exists: true, $nin: ["", null] } } },
      { $group: { _id: "$sourceListingId", count: { $sum: 1 } } },
    ]),
  ]);

  const monthMap = new Map(monthlyViews.map((r) => [String(r._id), r.count || 0]));
  const overallMap = new Map(overallViews.map((r) => [String(r._id), r.count || 0]));
  const quoteMap = new Map(quoteCounts.map((r) => [String(r._id), r.count || 0]));

  const visitedIds = [...overallMap.entries()]
    .filter(([, count]) => count > 0)
    .map(([id]) => id);

  if (visitedIds.length === 0) {
    return { items: [], totalCount: 0, page, pageSize, monthLabel: monthPrefix };
  }

  const listings = await Listing.find({
    status: "approved",
    _id: { $in: visitedIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) },
  })
    .select("companyName urlSlug reviewedAt createdAt")
    .lean();

  let rows = listings.map((doc) => {
    const id = doc._id.toString();
    const slug = getListingPublicPathSegment({ ...doc, id });
    const listingDate = doc.reviewedAt || doc.createdAt || null;
    return {
      id,
      companyName: doc.companyName || "Repair center",
      listingPath: slug ? `${LISTING_PATH_PREFIX}/${slug}` : "",
      listingDate: listingDate ? new Date(listingDate).toISOString() : null,
      visitsThisMonth: monthMap.get(id) || 0,
      visitsOverall: overallMap.get(id) || 0,
      quoteRequestCount: quoteMap.get(id) || 0,
    };
  }).filter((row) => row.visitsOverall > 0);

  if (search) {
    rows = rows.filter((row) => {
      const company = row.companyName.toLowerCase();
      const path = row.listingPath.toLowerCase();
      return company.includes(search) || path.includes(search);
    });
  }

  rows.sort((a, b) => {
    const diff =
      sort === "visitsThisMonth"
        ? b.visitsThisMonth - a.visitsThisMonth
        : b.visitsOverall - a.visitsOverall;
    if (diff !== 0) return diff;
    return a.companyName.localeCompare(b.companyName);
  });

  const totalCount = rows.length;
  const start = (page - 1) * pageSize;
  const items = rows.slice(start, start + pageSize);

  return {
    items,
    totalCount,
    page,
    pageSize,
    monthLabel: monthPrefix,
  };
}
