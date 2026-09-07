import { NextResponse } from "next/server";
import { getMobileAppBillingPlans } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

/** Public pricing for IQWireCalculator (Admin can change the plan price any time). */
export async function GET() {
  try {
    const billing = await getMobileAppBillingPlans();
    return NextResponse.json({
      name: "IQWireCalculator",
      trialDays: billing.trialDays,
      currency: billing.currency,
      paypalConfigured: billing.paypalConfigured,
      monthlyUsd: billing.monthly.usd,
      yearlyUsd: billing.yearly.usd,
      monthly: {
        slug: billing.monthly.planSlug,
        usd: billing.monthly.usd,
        configured: billing.monthly.configured,
        billingCycle: "monthly",
      },
      yearly: {
        slug: billing.yearly.planSlug,
        usd: billing.yearly.usd,
        configured: billing.yearly.configured,
        billingCycle: "yearly",
      },
      configured: billing.monthly.configured || billing.yearly.configured,
    });
  } catch (err) {
    console.error("mobile-app pricing:", err);
    return NextResponse.json({ error: err.message || "Failed to load pricing" }, { status: 500 });
  }
}
