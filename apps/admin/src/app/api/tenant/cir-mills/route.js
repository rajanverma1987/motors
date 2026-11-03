import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { verifyTenantKey } from "@/lib/platform-tenant-crypto";
import { listActivePlatformCirMills } from "@/lib/platform-cir-mills-db";
import { normalizeCirMillsUnit } from "@/lib/platform-cir-mills";

/**
 * Read-only Cir Mills catalog for shop apps.
 * Auth: Authorization Bearer <PLATFORM_TENANT_KEY> + x-tenant-slug
 */
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
  try {
    const unit = normalizeCirMillsUnit(request.nextUrl.searchParams.get("unit"));
    const items = await listActivePlatformCirMills(unit);
    return NextResponse.json({ items, unit });
  } catch (err) {
    console.error("Tenant GET cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to load Cir Mills" }, { status: 500 });
  }
}
