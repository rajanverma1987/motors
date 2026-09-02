import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const userDoc = await User.findOne({ email: shop.ownerEmail }).select("shopName").lean();
    return NextResponse.json({
      shopName: String(userDoc?.shopName || "").trim() || "Shop",
      token,
      geofenceConfigured: shop.lat != null && shop.lng != null,
      radiusM: shop.radiusM,
    });
  } catch (err) {
    console.error("Public time clock meta error:", err);
    return NextResponse.json({ error: "Failed to load time clock" }, { status: 500 });
  }
}
