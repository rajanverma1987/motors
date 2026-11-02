import { NextResponse } from "next/server";
import { getActiveGuestUnlockFromRequest } from "@/lib/calculator-guest-unlock";
import { buildCalculatorPricingPayload } from "@/lib/calculator-subscription-plan";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const pricing = await buildCalculatorPricingPayload();
    const guest = await getActiveGuestUnlockFromRequest(request);
    return NextResponse.json({
      hasGuestUnlock: !!guest,
      pricing,
    });
  } catch (err) {
    console.error("calculators/guest-access:", err);
    return NextResponse.json({ hasGuestUnlock: false }, { status: 500 });
  }
}
