import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { verifyTenantKey } from "@/lib/platform-tenant-crypto";
import { sendPortalPasswordResetEmail } from "@/lib/email";
import { hasPlatformSmtp } from "@/lib/platform-smtp";
import { isValidEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

const hits = new Map();

function rateLimit(slug) {
  const key = `pwdmail:${slug}`;
  const now = Date.now();
  const row = hits.get(key) || { n: 0, t: now };
  if (now - row.t > 60_000) {
    row.n = 0;
    row.t = now;
  }
  row.n += 1;
  hits.set(key, row);
  return row.n <= 20;
}

/**
 * Shop host asks platform to send a password-reset email via 3PF SMTP.
 * Auth: Authorization Bearer <PLATFORM_TENANT_KEY> + x-tenant-slug
 * Body: { to, resetUrl, contactName?, shopName? }
 */
export async function POST(request) {
  if (!hasPlatformSmtp()) {
    return NextResponse.json({ error: "Platform SMTP not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const slug = String(request.headers.get("x-tenant-slug") || "").trim().toLowerCase();
  if (!token || !slug) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!rateLimit(slug)) {
    return NextResponse.json({ error: "Rate limit" }, { status: 429 });
  }

  await dbConnect();
  const tenant = await Tenant.findOne({ slug }).lean();
  if (!tenant?.platformTenantKeyHash) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const ok = await verifyTenantKey(token, tenant.platformTenantKeyHash);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const to = String(body.to || "").trim().toLowerCase();
  const resetUrl = String(body.resetUrl || "").trim();
  if (!to || !isValidEmail(to) || !resetUrl) {
    return NextResponse.json({ error: "to and resetUrl required" }, { status: 400 });
  }
  try {
    const u = new URL(resetUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return NextResponse.json({ error: "Invalid resetUrl" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid resetUrl" }, { status: 400 });
  }

  const mail = await sendPortalPasswordResetEmail({
    to,
    contactName: String(body.contactName || "").trim(),
    shopName: String(body.shopName || tenant.companyName || "").trim(),
    resetUrl,
  });
  if (!mail?.ok) {
    return NextResponse.json({ error: mail?.error || "Send failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
