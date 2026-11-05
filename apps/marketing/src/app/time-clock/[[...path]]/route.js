import { NextResponse } from "next/server";
import { findTimeClockShopOrigin } from "@/lib/time-clock-shop-redirect";

export const dynamic = "force-dynamic";

function clockMessage(title, body) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>
</head>
<body style="margin:0;background:#f3f1ef;color:#1c1917;font-family:system-ui,sans-serif;">
  <main style="max-width:28rem;margin:0 auto;padding:3rem 1.25rem;">
    <p style="margin:0;font-size:0.75rem;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#945c2e;">Time Clock</p>
    <h1 style="margin:0.75rem 0 0;font-size:1.5rem;">${title}</h1>
    <p style="margin:0.75rem 0 0;line-height:1.5;color:#57534e;">${body}</p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request, context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  const parts = Array.isArray(params?.path) ? params.path.map((p) => String(p || "")) : [];
  const token = String(parts[0] || "").trim();
  if (!token) {
    return clockMessage(
      "Shop link required",
      "Open the Time Clock from your shop link or the icon you saved for your shop. The marketing site does not host the punch clock."
    );
  }

  const origin = await findTimeClockShopOrigin(token);
  if (!origin) {
    return clockMessage(
      "Time clock link not found",
      "This punch clock link does not match a shop. Ask the shop for a new Time Clock link."
    );
  }

  const extra = parts.slice(1).map((p) => encodeURIComponent(p)).join("/");
  const dest = new URL(`${origin}/time-clock/${encodeURIComponent(token)}${extra ? `/${extra}` : ""}`);
  dest.search = request.nextUrl.search;
  return NextResponse.redirect(dest, 302);
}
