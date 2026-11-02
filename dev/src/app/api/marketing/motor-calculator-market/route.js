import { NextResponse } from "next/server";
import { fetchMotorCalculatorMarketSnapshot } from "@/lib/motor-calculator-market-fetch";

export const dynamic = "force-dynamic";

/**
 * Public read-only market snapshot for the marketing rewind calculator (no secrets returned).
 */
export async function GET() {
  try {
    const snapshot = await fetchMotorCalculatorMarketSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (err) {
    console.error("motor-calculator-market:", err);
    return NextResponse.json({ error: err.message || "Market snapshot failed" }, { status: 500 });
  }
}
