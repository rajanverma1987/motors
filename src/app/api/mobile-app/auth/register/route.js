import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { hashPassword, createMobileAppToken } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { trialEndsAtFrom } from "@/lib/mobile-app-subscription";
import { mobileAppSessionPayload } from "@/lib/mobile-app-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "mobile-app-register", 5);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const name = clampString(body?.name, LIMITS.name.max);
    const phone = clampString(body?.phone, 40);

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < LIMITS.password.min) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    }
    if (password.length > LIMITS.password.max) {
      return NextResponse.json({ error: "Password is too long." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    await connectDB();
    const existing = await MobileAppAccount.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const now = new Date();
    const account = await MobileAppAccount.create({
      email,
      passwordHash: await hashPassword(password),
      name,
      phone,
      trialStartedAt: now,
      trialEndsAt: trialEndsAtFrom(now),
      subscriptionStatus: "trial",
      lastLoginAt: now,
    });

    const token = await createMobileAppToken({
      accountId: account._id.toString(),
      email: account.email,
      name: account.name,
    });
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ token, account: session });
  } catch (err) {
    console.error("mobile-app register:", err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
