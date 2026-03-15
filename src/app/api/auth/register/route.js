import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { hashPassword, createPortalToken, getPortalCookieName } from "@/lib/auth-portal";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, shopName, contactName } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      shopName: (shopName || "").trim(),
      contactName: (contactName || "").trim(),
    });

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

    return NextResponse.json({
      ok: true,
      user: {
        email: user.email,
        shopName: user.shopName,
        contactName: user.contactName,
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
