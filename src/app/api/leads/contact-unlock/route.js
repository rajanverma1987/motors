import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { sendContactUnlockNotificationToShop } from "@/lib/email";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "contact-unlock", 15);
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: "Too many submissions. Try again later." },
      { status: 429 }
    );
  }

  try {
    await connectDB();
    const body = await request.json();
    const {
      shopId,
      shopSlug,
      shopName,
      city,
      state,
      name,
      email,
      phone,
    } = body;

    if (!email || !name || !phone || !shopId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const rawListingId = String(shopId).trim();
    if (!mongoose.isValidObjectId(rawListingId)) {
      return NextResponse.json(
        { success: false, message: "Invalid listing reference." },
        { status: 400 }
      );
    }

    const listingDoc = await Listing.findOne({ _id: rawListingId, status: "approved" })
      .select("_id email companyName city state")
      .lean();

    if (!listingDoc) {
      return NextResponse.json(
        { success: false, message: "Listing not found or not available." },
        { status: 400 }
      );
    }

    const cityOut = [clampString(city, LIMITS.city.max), clampString(state, LIMITS.city.max)]
      .filter(Boolean)
      .join(", ")
      .slice(0, LIMITS.city.max);

    const doc = await Lead.create({
      name: clampString(name, LIMITS.name.max),
      email: String(email).trim().toLowerCase().slice(0, LIMITS.email.max),
      phone: clampString(phone, 30),
      city: cityOut,
      message: clampString(
        `[contact_view] Unlocked contact for ${clampString(shopName, LIMITS.companyName.max) || listingDoc.companyName || "listing"} (${clampString(shopSlug, 120)})`,
        LIMITS.message.max
      ),
      sourceListingId: listingDoc._id.toString(),
      assignedListingIds: [listingDoc._id.toString()],
      leadSource: "contact_unlock",
      leadType: "contact_view",
    });

    const shopEmail = listingDoc.email ? String(listingDoc.email).trim() : "";
    if (shopEmail && isValidEmail(shopEmail)) {
      try {
        await sendContactUnlockNotificationToShop({
          to: shopEmail,
          listingCompanyName: listingDoc.companyName || shopName || "",
          leadContactName: doc.name,
          siteUrl: getPublicSiteUrl(request),
        });
      } catch (e) {
        console.warn("Contact unlock shop notification email failed:", e);
      }
    }

    return NextResponse.json({ success: true, id: doc._id.toString() });
  } catch (err) {
    console.error("Contact unlock error:", err);
    return NextResponse.json(
      { success: false, message: "Server error. Please try again." },
      { status: 500 }
    );
  }
}
