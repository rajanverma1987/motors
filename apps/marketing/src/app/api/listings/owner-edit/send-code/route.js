import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import VerificationCode from "@/models/VerificationCode";
import { sendListingOwnerEditCodeEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validation";
import { emailOwnsListing, LISTING_OWNER_EDIT_PURPOSE, loadApprovedListingBySlug } from "@/lib/listing-owner-edit";

const CODE_EXPIRY_MINUTES = 15;

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "listing-owner-edit-send", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();
    const email = String(body?.email || "")
      .trim()
      .toLowerCase();
    if (!slug) {
      return NextResponse.json({ error: "Listing required" }, { status: 400 });
    }
    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const listing = await loadApprovedListingBySlug(slug);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (!(await emailOwnsListing(listing, email))) {
      return NextResponse.json(
        { error: "That email is not on this listing. Use the email address submitted with the listing." },
        { status: 400 }
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await connectDB();
    await VerificationCode.deleteMany({ email, purpose: LISTING_OWNER_EDIT_PURPOSE });
    await VerificationCode.create({ email, code, expiresAt, purpose: LISTING_OWNER_EDIT_PURPOSE });

    const result = await sendListingOwnerEditCodeEmail(email, code, listing.companyName);
    if (!result.ok) {
      await VerificationCode.deleteMany({ email, purpose: LISTING_OWNER_EDIT_PURPOSE });
      console.error("Listing owner edit code email failed:", result.error);
      return NextResponse.json(
        { error: "Failed to send verification email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Listing owner edit send-code error:", err);
    return NextResponse.json({ error: err.message || "Failed to send code" }, { status: 500 });
  }
}
