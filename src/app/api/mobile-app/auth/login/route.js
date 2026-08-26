import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { verifyPassword, createMobileAppToken } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { mobileAppSessionPayload } from "@/lib/mobile-app-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "mobile-app-login", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await connectDB();
    const account = await MobileAppAccount.findOne({ email }).select("+passwordHash");
    if (!account) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (account.canLogin === false) {
      return NextResponse.json(
        { error: "Login has been disabled for this account. Contact support.", code: "LOGIN_REVOKED" },
        { status: 403 }
      );
    }
    const ok = await verifyPassword(password, account.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    account.lastLoginAt = new Date();
    await account.save();

    const token = await createMobileAppToken({
      accountId: account._id.toString(),
      email: account.email,
      name: account.name,
    });
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ token, account: session });
  } catch (err) {
    console.error("mobile-app login:", err);
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
