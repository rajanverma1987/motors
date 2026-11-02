import { NextResponse } from "next/server";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";
import { connectDB } from "@/lib/db";
import {
  createTimeClockWallScanToken,
  clearTimeClockWallScanCookieOptions,
  getTimeClockWallScanCookieName,
  hasValidWallScan,
  timeClockWallScanCookieOptions,
  WALL_SCAN_TTL_SECONDS,
} from "@/lib/time-clock-wall-scan";

/**
 * POST: mint short-lived wall-scan unlock after opening the printed shop QR
 * (not the PWA Home Screen start URL).
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const value = await createTimeClockWallScanToken(token);
    const res = NextResponse.json({
      ok: true,
      wallScanAuthorized: true,
      expiresInSeconds: WALL_SCAN_TTL_SECONDS,
    });
    res.cookies.set(getTimeClockWallScanCookieName(), value, timeClockWallScanCookieOptions());
    return res;
  } catch (err) {
    console.error("Time clock wall-scan POST error:", err);
    return NextResponse.json({ error: err.message || "Failed to unlock punch" }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    const wallScanAuthorized = await hasValidWallScan(request, token);
    return NextResponse.json({ wallScanAuthorized });
  } catch (err) {
    console.error("Time clock wall-scan GET error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const res = NextResponse.json({ ok: true, wallScanAuthorized: false });
    res.cookies.set(getTimeClockWallScanCookieName(), "", clearTimeClockWallScanCookieOptions());
    if (token) {
      // no-op; cookie cleared for all
    }
    return res;
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
