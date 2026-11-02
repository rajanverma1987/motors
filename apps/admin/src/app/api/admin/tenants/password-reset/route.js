import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import { getAdminSessionFromRequest } from "@/lib/auth-admin";
import { adminCan } from "@/lib/admin-rbac";
import { isValidEmail } from "@/lib/validation";
import { sendPortalPasswordResetEmail } from "@/lib/email";
import { hasPlatformSmtp } from "@/lib/platform-smtp";
import {
  buildPortalResetUrl,
  issuePortalPasswordReset,
  withDbName,
} from "@/lib/portal-password-reset";

export const dynamic = "force-dynamic";

/**
 * POST { slug, email? }
 * Issues a shop-portal password reset in the tenant DB and emails the link via 3PF SMTP.
 * Link points at https://{tenant.host}/reset-password?token=…
 */
export async function POST(request) {
  const session = await getAdminSessionFromRequest(request);
  if (!session?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!adminCan(session.role, "tenants.password_reset")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!hasPlatformSmtp()) {
    return NextResponse.json(
      { error: "Platform SMTP is not configured (SMTP_USER / SMTP_PASS)." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  await dbConnect();
  const tenant = await Tenant.findOne({ slug }).lean();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const email = String(body.email || tenant.ownerEmail || "")
    .trim()
    .toLowerCase();
  if (!email || !isValidEmail(email)) {
    return NextResponse.json({ error: "Valid email required (or set tenant ownerEmail)." }, { status: 400 });
  }

  const baseUri = process.env.MONGODB_ADMIN_URI || process.env.MONGODB_URI || "";
  if (!baseUri) {
    return NextResponse.json({ error: "MONGODB_URI not configured on admin" }, { status: 500 });
  }
  if (!tenant.mongoDbName) {
    return NextResponse.json({ error: "Tenant missing mongoDbName" }, { status: 400 });
  }

  const shopUri = withDbName(baseUri, tenant.mongoDbName);
  const shopConn = await mongoose.createConnection(shopUri).asPromise();
  try {
    const ShopUser = shopConn.models.User || shopConn.model("User", User.schema);
    const user = await ShopUser.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found in shop database" }, { status: 404 });
    }
    if (user.canLogin === false) {
      return NextResponse.json({ error: "User login is disabled" }, { status: 403 });
    }

    const token = issuePortalPasswordReset(user);
    await user.save();

    const host = String(tenant.host || `${slug}.3phaseflow.com`).replace(/^https?:\/\//, "");
    const resetUrl = buildPortalResetUrl(`https://${host}`, token);
    const mail = await sendPortalPasswordResetEmail({
      to: user.email,
      contactName: user.contactName,
      shopName: user.shopName || tenant.companyName,
      resetUrl,
    });
    if (!mail?.ok) {
      return NextResponse.json(
        { error: mail?.error || "Failed to send reset email" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      slug,
      email: user.email,
      host,
      expiresAt: user.passwordResetExpiresAt,
      sentBy: session.email,
    });
  } finally {
    await shopConn.close();
  }
}
