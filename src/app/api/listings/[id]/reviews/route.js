import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import Review from "@/models/Review";
import { sendNewReviewNotification } from "@/lib/email";

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REVIEWS_PER_IP_PER_LISTING = 2;

function hashIp(ip) {
  if (!ip) return "";
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(ip + (process.env.REVIEW_SALT || "review-salt")).digest("hex").slice(0, 32);
}

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Listing ID required" }, { status: 400 });
    }
    await connectDB();
    const reviews = await Review.find({ listingId: id, status: "approved" })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    const data = reviews.map((r) => ({
      id: r._id.toString(),
      authorName: r.authorName,
      rating: r.rating,
      body: r.body,
      createdAt: r.createdAt,
    }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("Get reviews error:", err);
    return NextResponse.json({ error: "Failed to load reviews" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "Listing ID required" }, { status: 400 });
    }

    const body = await request.json();
    const { authorName, authorEmail, rating, body: reviewBody, website: honeypot } = body;

    if (!authorName || typeof authorName !== "string" || authorName.trim().length < 2) {
      return NextResponse.json({ error: "Please enter your name (at least 2 characters)." }, { status: 400 });
    }
    const trimmedName = authorName.trim().slice(0, 100);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!authorEmail || !emailRegex.test(String(authorEmail).trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const trimmedEmail = String(authorEmail).trim().toLowerCase().slice(0, 254);

    const numRating = Number(rating);
    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json({ error: "Please choose a rating from 1 to 5 stars." }, { status: 400 });
    }

    if (!reviewBody || typeof reviewBody !== "string" || reviewBody.trim().length < 10) {
      return NextResponse.json({ error: "Review must be at least 10 characters." }, { status: 400 });
    }
    if (reviewBody.trim().length > 2000) {
      return NextResponse.json({ error: "Review must be 2000 characters or less." }, { status: 400 });
    }
    const trimmedBody = reviewBody.trim();

    if (honeypot && String(honeypot).trim() !== "") {
      return NextResponse.json({ error: "Submission rejected." }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
    const ipHash = hashIp(ip);

    await connectDB();

    const listing = await Listing.findById(id).lean();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
    const recentFromIp = await Review.countDocuments({
      listingId: id,
      ipHash,
      createdAt: { $gte: since },
    });
    if (recentFromIp >= MAX_REVIEWS_PER_IP_PER_LISTING) {
      return NextResponse.json(
        { error: "You have submitted the maximum number of reviews for this listing. Please try again later." },
        { status: 429 }
      );
    }

    const review = await Review.create({
      listingId: id,
      authorName: trimmedName,
      authorEmail: trimmedEmail,
      rating: numRating,
      body: trimmedBody,
      status: "approved",
      ipHash,
    });

    await sendNewReviewNotification(listing.email, listing.companyName, trimmedName, numRating, trimmedBody);

    return NextResponse.json({
      id: review._id.toString(),
      authorName: review.authorName,
      rating: review.rating,
      body: review.body,
      createdAt: review.createdAt,
    });
  } catch (err) {
    console.error("Post review error:", err);
    return NextResponse.json({ error: "Failed to submit review. Please try again." }, { status: 500 });
  }
}
