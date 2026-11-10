import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";

export async function GET(_request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const token = String(params?.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const userDoc = await User.findOne({ email: shop.ownerEmail }).select("shopName").lean();
    const shopName = String(userDoc?.shopName || "").trim() || "Shop";
    const startUrl = `/time-clock/${encodeURIComponent(token)}?source=pwa`;
    const manifest = {
      id: `/time-clock/${token}`,
      name: `${shopName} Time Clock`,
      short_name: "Time Clock",
      description: "Shop employee time clock",
      start_url: startUrl,
      scope: "/time-clock/",
      display: "standalone",
      background_color: "#f3f1ef",
      theme_color: "#945c2e",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      ],
    };
    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Time clock manifest error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
