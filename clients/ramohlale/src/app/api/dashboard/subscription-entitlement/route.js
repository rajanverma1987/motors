import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPortalPayloadFromCookies } from "@/lib/auth-portal";
import { computeEntitlement } from "@/lib/subscription-entitlement";

/**
 * Server-side daily entitlement check (uses PLATFORM_TENANT_KEY from server env only).
 */
export async function GET() {
  const cookieStore = await cookies();
  const payload = await getPortalPayloadFromCookies(cookieStore);
  if (!payload?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = String(process.env.PLATFORM_API_BASE || "").replace(/\/$/, "");
  const tenantKey = String(process.env.PLATFORM_TENANT_KEY || "");
  const slug = String(process.env.TENANT_SLUG || "cemotor").toLowerCase();

  if (!base || !tenantKey) {
    // Local/dev without platform admin: allow full access
    return NextResponse.json({
      entitlement: { access: "full", grace: false, paywall: false, notice: null },
      checkedAt: new Date().toISOString(),
      source: "local-bypass",
    });
  }

  try {
    const res = await fetch(`${base}/api/tenant/subscription`, {
      headers: {
        Authorization: `Bearer ${tenantKey}`,
        "x-tenant-slug": slug,
      },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        {
          entitlement: computeEntitlement({ status: "active" }),
          checkedAt: new Date().toISOString(),
          source: "fallback",
          warning: data.error || "platform unreachable",
        },
        { status: 200 }
      );
    }
    return NextResponse.json({
      entitlement: data.entitlement || computeEntitlement({ status: data.status, expiresAt: data.expiresAt }),
      checkedAt: data.checkedAt || new Date().toISOString(),
      source: "platform",
    });
  } catch (err) {
    return NextResponse.json({
      entitlement: computeEntitlement({ status: "active" }),
      checkedAt: new Date().toISOString(),
      source: "error-fallback",
      warning: err?.message || "fetch failed",
    });
  }
}
