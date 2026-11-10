import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { listActivePlatformCirMills } from "@/lib/platform-cir-mills-db";
import { normalizeCirMillsUnit } from "@/lib/platform-cir-mills";

/** Shop DB fallback when this app is not linked to the platform admin. */
async function loadLocalCirMills(unit) {
  return listActivePlatformCirMills(unit);
}

/**
 * Admin-edited Cir Mills live in the platform database.
 * Shop apps proxy that catalog so CM Best Match matches admin.
 */
async function loadPlatformCirMills(unit) {
  const base = String(process.env.PLATFORM_API_BASE || "").replace(/\/$/, "");
  const tenantKey = String(process.env.PLATFORM_TENANT_KEY || "").trim();
  const slug = String(process.env.TENANT_SLUG || "").trim().toLowerCase();
  if (!base || !tenantKey || !slug) return null;

  const res = await fetch(`${base}/api/tenant/cir-mills?unit=${encodeURIComponent(unit)}`, {
    headers: {
      Authorization: `Bearer ${tenantKey}`,
      "x-tenant-slug": slug,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to load Cir Mills from admin");
  }
  return Array.isArray(data.items) ? data.items : [];
}

/** Shared Cir Mills catalog for this shop's calculators (read-only). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const unit = normalizeCirMillsUnit(new URL(request.url).searchParams.get("unit"));
    const platformItems = await loadPlatformCirMills(unit);
    const items = platformItems == null ? await loadLocalCirMills(unit) : platformItems;
    return NextResponse.json({ items, unit });
  } catch (err) {
    console.error("GET cir-mills:", err);
    return NextResponse.json({ error: err.message || "Failed to load Cir Mills" }, { status: 500 });
  }
}
