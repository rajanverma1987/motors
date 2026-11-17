import { NextResponse } from "next/server";
import { checkFloodLimit } from "@/lib/rate-limit";
import { evaluateBotRequest, isListingDataPath, LISTING_PATH_FLOOD_LIMIT } from "@/lib/bot-guard";

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

/**
 * Marketing host only: no shop portal (/dashboard, /dashboards, /login) or admin UI.
 */
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

  const flood = await checkFloodLimit(request, 240);
  if (!flood.allowed) {
    return new NextResponse("Too many requests. Try again in a minute.", {
      status: 429,
      headers: { "Retry-After": "60", "Cache-Control": "no-store" },
    });
  }

  if (!hostAllowedEdge(request.headers.get("host"))) {
    return new NextResponse("Host not allowed for this app", { status: 421 });
  }

  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/dashboards" ||
    pathname.startsWith("/dashboards/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return NextResponse.redirect(new URL("/contact", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|uploads/|videos/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest)$).*)",
  ],
};
