import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VerificationCode from "@/models/VerificationCode";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";
import {
  emailOwnsListing,
  LISTING_OWNER_EDIT_PURPOSE,
  loadApprovedListingBySlug,
  serializeOwnerListing,
} from "@/lib/listing-owner-edit";
import {
  LISTING_OWNER_EDIT_COOKIE,
  createListingOwnerEditToken,
  listingOwnerEditCookieOptions,
} from "@/lib/listing-owner-edit-auth";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "listing-owner-edit-verify", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    const code = String(body?.code || "").trim();
    if (!slug || !email || !code) {
      return NextResponse.json({ error: "Email and code required" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await connectDB();
    const codeDoc = await VerificationCode.findOne({
      email,
      code,
      purpose: LISTING_OWNER_EDIT_PURPOSE,
    });
    if (!codeDoc) {
      return NextResponse.json({ error: "Invalid or expired verification code." }, { status: 400 });
    }
    if (new Date() > codeDoc.expiresAt) {
      await VerificationCode.deleteOne({ _id: codeDoc._id });
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const listing = await loadApprovedListingBySlug(slug);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (!(await emailOwnsListing(listing, email))) {
      return NextResponse.json(
        { error: "That email is not on this listing." },
        { status: 400 }
      );
    }

    await VerificationCode.deleteOne({ _id: codeDoc._id });

    const token = await createListingOwnerEditToken(listing._id, email);
    const res = NextResponse.json({
      ok: true,
      listing: serializeOwnerListing(listing),
    });
    res.cookies.set(LISTING_OWNER_EDIT_COOKIE, token, listingOwnerEditCookieOptions());
    return res;
  } catch (err) {
    console.error("Listing owner edit verify error:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}
