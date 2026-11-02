import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySupportHandoff } from "@/lib/platform-tenant-crypto";
import {
  createPortalToken,
  getPortalCookieName,
  portalSessionCookieOptions,
} from "@/lib/auth-portal";
import dbConnect from "@/lib/db";
import User from "@/models/User";

/**
 * Exchange support handoff token for a portal session (full access, no banner).
 */
export async function POST(request) {
  const secret = process.env.SUPPORT_HANDOFF_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  const payload = verifySupportHandoff(secret, body.token);
  if (!payload || payload.mode !== "support") {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const slug = String(process.env.TENANT_SLUG || "").toLowerCase();
  if (slug && payload.slug && payload.slug !== slug) {
    return NextResponse.json({ error: "Wrong tenant host" }, { status: 403 });
  }

  await dbConnect();
  const ownerEmail = String(process.env.TENANT_OWNER_EMAIL || "").toLowerCase();
  let user = null;
  if (ownerEmail) {
    user = await User.findOne({ email: ownerEmail }).lean();
  }
  if (!user) {
    user = await User.findOne({ canLogin: true }).sort({ createdAt: 1 }).lean();
  }
  if (!user) {
    return NextResponse.json({ error: "No shop user to impersonate" }, { status: 404 });
  }

  const token = await createPortalToken({
    email: user.email,
    shopName: user.shopName || "",
    supportMode: true,
    supportAdminId: payload.adminUserId || "",
  });

  console.info(
    "[support-handoff]",
    JSON.stringify({
      slug: payload.slug,
      admin: payload.adminUserId,
      shop: user.email,
      at: new Date().toISOString(),
    })
  );

  const cookieStore = await cookies();
  cookieStore.set(getPortalCookieName(), token, portalSessionCookieOptions({ rememberMe: false }));
  return NextResponse.json({ ok: true });
}
