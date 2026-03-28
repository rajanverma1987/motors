import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { verifyPassword, createPortalToken, getPortalCookieName } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLoginBlockReason } from "@/lib/subscription-access";
import { syncSubscriptionWithAccountTier } from "@/lib/subscription-service";
import { userIsListingOnlyAccount } from "@/lib/listing-account-restrictions";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "portal-login", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (user.canLogin === false) {
      return NextResponse.json(
        { error: "Login access has been revoked. Please contact support.", code: "LOGIN_REVOKED" },
        { status: 403 }
      );
    }

    try {
      await syncSubscriptionWithAccountTier(user.email);
    } catch (_) {
      /* ignore */
    }

    const subRevokeReason = await getLoginBlockReason(user.email);
    if (subRevokeReason) {
      return NextResponse.json(
        { error: subRevokeReason, code: "SUBSCRIPTION_REVOKED" },
        { status: 403 }
      );
    }

    const token = await createPortalToken({
      email: user.email,
      shopName: user.shopName,
      contactName: user.contactName,
    });
    const cookieStore = await cookies();
    cookieStore.set(getPortalCookieName(), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    const listingOnly = await userIsListingOnlyAccount(user.email);

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        shopName: user.shopName,
        contactName: user.contactName,
        listingOnlyAccount: listingOnly,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
