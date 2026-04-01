import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const cookieHeader = request.headers.get("cookie") || "";
  const hasAdminCookie = cookieHeader.includes("motors_admin=");
  const hasPortalCookie = cookieHeader.includes("motors_portal=");

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
  ],
};
