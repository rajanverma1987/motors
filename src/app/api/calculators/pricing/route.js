import { NextResponse } from "next/server";
import { buildCalculatorPricingPayload } from "@/lib/calculator-subscription-plan";

export const dynamic = "force-dynamic";

/** Public calculator pricing (calc-only SubscriptionPlan + env fallbacks). */
export async function GET() {
  try {
    const pricing = await buildCalculatorPricingPayload();
    return NextResponse.json(pricing);
  } catch (err) {
    console.error("calculators/pricing:", err);
    return NextResponse.json({ error: "Failed to load pricing" }, { status: 500 });
  }
}
