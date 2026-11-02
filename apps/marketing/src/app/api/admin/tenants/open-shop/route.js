import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { adminCan } from "@/lib/admin-rbac";
import { signSupportHandoff } from "@/lib/platform-tenant-crypto";

/**
 * POST { slug } → { url } short-lived support handoff to client host.
 * Suspended tenants still allowed (recovery mode B).
 */
export async function POST(request) {
  const adminEmail = await getAdminFromRequest(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Env bootstrap admin is treated as owner
  const role = "owner";
  if (!adminCan(role, "tenants.open_shop")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const slug = String(body.slug || "").trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  await dbConnect();
  const tenant = await Tenant.findOne({ slug }).lean();
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  if (!tenant.supportHandoffSecret) {
    return NextResponse.json({ error: "Tenant missing support handoff secret" }, { status: 400 });
  }

  const exp = Date.now() + 60_000;
  const token = signSupportHandoff(tenant.supportHandoffSecret, {
    slug,
    adminUserId: adminEmail,
    mode: "support",
    exp,
    jti: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  });

  const host = tenant.host || `${slug}.3phaseflow.com`;
  const url = `https://${host}/support-handoff?token=${encodeURIComponent(token)}`;
  return NextResponse.json({ url, expiresAt: new Date(exp).toISOString() });
}
