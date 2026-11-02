import { connectDB } from "@/lib/db";
import Review from "@/models/Review";

/**
 * Returns { average, count } for approved reviews of a listing.
 * average is 0 when there are no reviews.
 */
export async function getListingReviewStats(listingId) {
  if (!listingId) return { average: 0, count: 0 };
  await connectDB();
  const reviews = await Review.find({ listingId, status: "approved" })
    .select("rating")
    .lean();
  const count = reviews.length;
  if (count === 0) return { average: 0, count: 0 };
  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  const average = Math.round((sum / count) * 10) / 10;
  return { average, count };
}
