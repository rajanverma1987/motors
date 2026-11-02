import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import ShopSubscription from "@/models/ShopSubscription";
import { verifyTenantKey } from "@/lib/platform-tenant-crypto";
import { computeEntitlement } from "@/lib/subscription-entitlement";

const hits = new Map();

function rateLimit(slug) {
  const key = `sub:${slug}`;
  const now = Date.now();
  const row = hits.get(key) || { n: 0, t: now };
  if (now - row.t > 60_000) {
    row.n = 0;
    row.t = now;
  }
  row.n += 1;
  hits.set(key, row);
  return row.n <= 60;
}

async function authTenant(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const slug = String(request.headers.get("x-tenant-slug") || "").trim().toLowerCase();
  if (!token || !slug) return { error: "Unauthorized", status: 401 };
  if (!rateLimit(slug)) return { error: "Rate limit", status: 429 };
  await dbConnect();
  const tenant = await Tenant.findOne({ slug }).lean();
  if (!tenant) return { error: "Unknown tenant", status: 401 };
  if (tenant.status === "suspended" || tenant.status === "disabled") {
    return { error: "Tenant suspended", status: 403, tenant };
  }
  const ok = await verifyTenantKey(token, tenant.platformTenantKeyHash);
  if (!ok) return { error: "Unauthorized", status: 401 };
  return { tenant };
}

export async function GET(request) {
  const auth = await authTenant(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const email = String(auth.tenant.ownerEmail || "").toLowerCase();
  let status = "unknown";
  let expiresAt = null;
  if (email) {
    const sub = await ShopSubscription.findOne({ ownerEmail: email }).lean();
    if (sub) {
      status = sub.internalState || "active";
      expiresAt = sub.gracePeriodEndsAt || sub.nextBillingTime || null;
      if (sub.revokedAt) status = "expired";
    } else {
      status = "active";
    }
  }
  const entitlement = computeEntitlement({ status, expiresAt });
  return NextResponse.json({
    slug: auth.tenant.slug,
    status,
    expiresAt,
    entitlement,
    checkedAt: new Date().toISOString(),
  });
}
