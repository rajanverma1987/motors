import { NextResponse } from "next/server";
import {
  CALCULATOR_ONLY_DASHBOARD_PATH,
  isCalculatorOnlyAllowedDashboardApi,
  isCalculatorOnlyDashboardPath,
} from "@/lib/calculator-portal-routes";

/** Edge-safe: tier is set on login/register and refreshed by GET /api/auth/me */
function hasCalculatorOnlyTierCookie(cookieHeader) {
  return /(?:^|;\s*)motors_portal_tier=calculator_only(?:;|$)/.test(cookieHeader || "");
}

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie") || "";
  const hasAdminCookie = cookieHeader.includes("motors_admin=");
  const hasPortalCookie = cookieHeader.includes("motors_portal=");
  const calcOnlyPortal = hasPortalCookie && hasCalculatorOnlyTierCookie(cookieHeader);

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasAdminCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!hasPortalCookie) {
      const loginUrl = new URL("/login", request.url);
      const dest = `${pathname}${request.nextUrl.search || ""}`;
      loginUrl.searchParams.set("next", dest);
      return NextResponse.redirect(loginUrl);
    }
    if (calcOnlyPortal && !isCalculatorOnlyDashboardPath(pathname)) {
      return NextResponse.redirect(new URL(CALCULATOR_ONLY_DASHBOARD_PATH, request.url));
    }
  }

  if (pathname.startsWith("/api/dashboard/") && calcOnlyPortal) {
    if (!isCalculatorOnlyAllowedDashboardApi(pathname)) {
      return NextResponse.json(
        { error: "Calculators-only accounts may only access calculator tools." },
        { status: 403 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/listings/:path*",
    "/admin/leads/:path*",
    "/admin/clients/:path*",
    "/admin/location-pages/:path*",
    "/admin/marketing/:path*",
    "/admin/marketplace/:path*",
    "/admin/support",
    "/admin/support/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/api/dashboard/:path*",
  ],
};
