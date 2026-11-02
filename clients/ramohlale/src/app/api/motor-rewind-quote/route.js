import { NextResponse } from "next/server";
import { computeCustomerRewindBallpark } from "@/lib/motor-rewind-cost/calculate";

/**
 * POST — public ballpark rewind estimate (USD). No margin/tax; slab labor only.
 */
export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, errors: ["Invalid JSON body."] }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, errors: ["Body must be a JSON object."] }, { status: 400 });
    }

    const breakdown = computeCustomerRewindBallpark(body);
    return NextResponse.json({ ok: true, breakdown });
  } catch (err) {
    console.error("motor-rewind-quote:", err);
    return NextResponse.json({ ok: false, errors: ["Server error."] }, { status: 500 });
  }
}
