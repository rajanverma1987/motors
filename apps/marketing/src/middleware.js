import { NextResponse } from "next/server";

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
export function middleware(request) {
  if (!hostAllowedEdge(request.headers.get("host"))) {
    return new NextResponse("Host not allowed for this app", { status: 421 });
  }

  const { pathname } = request.nextUrl;
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
