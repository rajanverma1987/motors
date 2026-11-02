import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import Lead from "@/models/Lead";
import { verifyTenantKey } from "@/lib/platform-tenant-crypto";

async function authTenant(request) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const slug = String(request.headers.get("x-tenant-slug") || "").trim().toLowerCase();
  if (!token || !slug) return { error: "Unauthorized", status: 401 };
  await dbConnect();
  const tenant = await Tenant.findOne({ slug }).lean();
  if (!tenant) return { error: "Unknown tenant", status: 401 };
  if (tenant.status === "suspended" || tenant.status === "disabled") {
    return { error: "Tenant suspended", status: 403 };
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
  const since = request.nextUrl.searchParams.get("since");
  const email = String(auth.tenant.ownerEmail || "").toLowerCase();
  const q = email ? { createdByEmail: email } : {};
  if (since) {
    const d = new Date(since);
    if (!Number.isNaN(d.getTime())) q.createdAt = { $gte: d };
  }
  const leads = await Lead.find(q).sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ leads });
}
