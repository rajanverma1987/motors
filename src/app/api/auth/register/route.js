import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Listing from "@/models/Listing";
import { hashPassword, createPortalToken, setPortalSessionCookies } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import {
  applyListingOnlySubscriptionToShop,
  ensureShopSubscriptionOnRegister,
} from "@/lib/subscription-service";
import { getOrCreateEntitlementForEmail } from "@/lib/calculator-access";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "register", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { email, password, shopName, contactName, calculatorOnly } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (password.length < LIMITS.password.min) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    if (password.length > LIMITS.password.max) {
      return NextResponse.json(
        { error: "Password too long" },
        { status: 400 }
      );
    }

    await connectDB();
    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const emailNorm = email.trim().toLowerCase().slice(0, LIMITS.email.max);
    const approvedListing = await Listing.findOne({ email: emailNorm, status: "approved" })
      .select("_id")
      .lean();
    const listingOnly = !!approvedListing;
    const calculatorOnlyAccount = !!calculatorOnly && !listingOnly;

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: emailNorm,
      passwordHash,
      shopName: clampString(shopName, LIMITS.name.max),
      contactName: clampString(contactName, LIMITS.name.max),
      listingOnlyAccount: listingOnly,
      calculatorOnlyAccount,
    });

    try {
      if (listingOnly) {
        await applyListingOnlySubscriptionToShop(user.email);
      } else if (calculatorOnlyAccount) {
        await getOrCreateEntitlementForEmail(user.email);
      } else {
        await ensureShopSubscriptionOnRegister(user.email);
      }
    } catch (subErr) {
      console.error("Subscription bootstrap on register:", subErr);
    }

    const token = await createPortalToken({
      email: user.email,
      shopName: user.shopName,
      contactName: user.contactName,
      calculatorOnlyPortal: calculatorOnlyAccount,
    });
    const cookieStore = await cookies();
    await setPortalSessionCookies(cookieStore, {
      token,
      calculatorOnlyPortal: calculatorOnlyAccount,
    });

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        shopName: user.shopName,
        contactName: user.contactName,
        listingOnlyAccount: listingOnly,
        calculatorOnlyAccount,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: err.message || "Registration failed" },
      { status: 500 }
    );
  }
}
