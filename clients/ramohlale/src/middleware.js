import { NextResponse } from "next/server";
import { checkFloodLimit } from "@/lib/rate-limit";
import { evaluateBotRequest, isListingDataPath, LISTING_PATH_FLOOD_LIMIT } from "@/lib/bot-guard";
import { assertSameOriginApiMutation } from "@/lib/api-origin-guard";
import {
  CALCULATOR_ONLY_DASHBOARD_HREF,
  isCalculatorOnlyAllowedDashboardApi,
  isCalculatorOnlyDashboardPath,
} from "@/lib/calculator-portal-routes";
import {
  classicPathToSimpleRedirect,
  isClassicPortalPath,
  isClassicPortalUiCookie,
  isSimpleCalculatorsPath,
  isSimplePortalPath,
  simplePathToClassicRedirect,
} from "@/lib/portal-view";

/** Edge-safe: tier is set on login/register and refreshed by GET /api/auth/me */
function hasCalculatorOnlyTierCookie(cookieHeader) {
  return /(?:^|;\s*)motors_portal_tier=calculator_only(?:;|$)/.test(cookieHeader || "");
}

function hostAllowedEdge(hostHeader) {
  const raw = process.env.ALLOWED_HOSTS || "";
  if (!raw.trim()) return true;
  const allowed = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const host = String(hostHeader || "")
    .split(":")[0]
    .trim()
    .toLowerCase();
  return Boolean(host && allowed.includes(host));
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Scrapers first: cheapest check, and it keeps them out of the rate-limit store.
  const bot = evaluateBotRequest(request.headers.get("user-agent"), pathname);
  if (bot.blocked) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store", "X-Blocked-Reason": bot.reason },
    });
  }

  // Listing data gets a tighter per-IP ceiling than the rest of the site.
  if (isListingDataPath(pathname)) {
    const listingFlood = await checkFloodLimit(request, LISTING_PATH_FLOOD_LIMIT);
    if (!listingFlood.allowed) {
      return new NextResponse("Too many requests. Try again in a minute.", {
        status: 429,
        headers: { "Retry-After": "60", "Cache-Control": "no-store" },
      });
    }
  }

  const flood = await checkFloodLimit(request, 900);
  if (!flood.allowed) {
    return new NextResponse("Too many requests. Try again in a minute.", {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const hasAdminCookie = cookieHeader.includes("motors_admin=");
  const hasPortalCookie = cookieHeader.includes("motors_portal=");
  const calcOnlyPortal = hasPortalCookie && hasCalculatorOnlyTierCookie(cookieHeader);

  if (!hostAllowedEdge(request.headers.get("host"))) {
    return new NextResponse("Host not allowed for this app", { status: 421 });
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!hasAdminCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/dashboards")) {
    if (!hasPortalCookie) {
      const loginUrl = new URL("/", request.url);
      const dest = `${pathname}${request.nextUrl.search || ""}`;
      loginUrl.searchParams.set("next", dest);
      return NextResponse.redirect(loginUrl);
    }
    if (calcOnlyPortal && !isCalculatorOnlyDashboardPath(pathname)) {
      return NextResponse.redirect(new URL(CALCULATOR_ONLY_DASHBOARD_HREF, request.url));
    }
    const search = request.nextUrl.search || "";
    const shopClassicUi = !calcOnlyPortal && isClassicPortalUiCookie(cookieHeader);
    if (shopClassicUi) {
      if (isSimplePortalPath(pathname) && !isSimpleCalculatorsPath(pathname, search)) {
        const target = simplePathToClassicRedirect(pathname, search);
        const current = `${pathname}${search}`;
        if (target && target !== current) {
          return NextResponse.redirect(new URL(target, request.url));
        }
      }
    } else if (isClassicPortalPath(pathname)) {
      const target = classicPathToSimpleRedirect(pathname, search);
      return NextResponse.redirect(new URL(target, request.url));
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

  if (pathname.startsWith("/api/dashboard/") || pathname.startsWith("/api/admin/")) {
    const originCheck = assertSameOriginApiMutation(request);
    if (!originCheck.ok) {
      return NextResponse.json({ error: originCheck.error }, { status: originCheck.status });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|uploads/|videos/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$).*)",
  ],
};
