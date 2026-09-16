import { NextResponse } from "next/server";
import { retryTrackPendingDeliveries } from "@/lib/track-integration";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Unattended retry for pending IQMotorTrack → shop deliveries.
 * Protect with CRON_SECRET (Authorization: Bearer <secret> or ?secret=).
 * Wire from your host scheduler, e.g. every 5 to 15 minutes.
 */
export async function GET(request) {
  try {
    const expected = String(process.env.CRON_SECRET || "").trim();
    if (!expected) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured on the server." },
        { status: 503 }
      );
    }
    const auth = String(request.headers.get("authorization") || "");
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
    const querySecret = String(new URL(request.url).searchParams.get("secret") || "").trim();
    if (bearer !== expected && querySecret !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limitRaw = Number(new URL(request.url).searchParams.get("limit") || 25);
    const results = await retryTrackPendingDeliveries({
      limit: Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, limitRaw)) : 25,
    });
    return NextResponse.json({
      ok: true,
      retried: results.length,
      results,
    });
  } catch (err) {
    console.error("cron track-deliveries:", err);
    return NextResponse.json({ error: err.message || "Retry failed" }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}
