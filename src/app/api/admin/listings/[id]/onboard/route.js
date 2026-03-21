import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import User from "@/models/User";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { hashPassword } from "@/lib/auth-portal";
import { ensureShopSubscriptionOnRegister } from "@/lib/subscription-service";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { sendCrmWelcomeEmail } from "@/lib/email";

/**
 * POST: Create a portal User from a directory listing (shop name, contact from listing),
 * set password, and bootstrap Free Ultimate subscription — same path as self-registration.
 */
export async function POST(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password : "";
    const shopName = clampString(body?.shopName ?? "", LIMITS.name.max);
    const contactName = clampString(body?.contactName ?? "", LIMITS.name.max);

    if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
      return NextResponse.json(
        { error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
        { status: 400 }
      );
    }

    await connectDB();
    const listing = await Listing.findById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    if (listing.crmUserId) {
      return NextResponse.json(
        {
          error: "This listing was already onboarded to the CRM.",
          code: "ALREADY_ONBOARDED",
          userId: String(listing.crmUserId),
        },
        { status: 409 }
      );
    }

    const email = (listing.email || "").trim().toLowerCase().slice(0, LIMITS.email.max);
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Listing has invalid email; fix the listing first." }, { status: 400 });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        {
          error: "A portal account with this email already exists. Use Registered clients to manage subscription and access.",
          code: "USER_EXISTS",
          userId: String(existing._id),
        },
        { status: 409 }
      );
    }

    const finalShopName = shopName || clampString(listing.companyName, LIMITS.name.max);
    const finalContactName = contactName || clampString(listing.primaryContactPerson, LIMITS.name.max);

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      shopName: finalShopName,
      contactName: finalContactName,
      canLogin: true,
    });

    try {
      await ensureShopSubscriptionOnRegister(user.email);
    } catch (subErr) {
      console.error("Subscription bootstrap on admin onboard:", subErr);
    }

    listing.crmUserId = user._id;
    listing.crmOnboardedAt = new Date();
    await listing.save();

    try {
      await sendCrmWelcomeEmail({
        to: user.email,
        shopName: user.shopName || listing.companyName || "",
        contactName: user.contactName || "",
        userId: String(user._id),
        plainPassword: password,
      });
    } catch (mailErr) {
      console.error("CRM welcome email failed:", mailErr);
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: String(user._id),
        email: user.email,
        shopName: user.shopName || "",
        contactName: user.contactName || "",
      },
    });
  } catch (err) {
    console.error("Admin listing onboard error:", err);
    return NextResponse.json(
      { error: err.message || "Onboard failed" },
      { status: 500 }
    );
  }
}
