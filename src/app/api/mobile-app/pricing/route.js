import { NextResponse } from "next/server";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

/** Public pricing for IQWireCalculator (Admin can change the plan price any time). */
export async function GET() {
  try {
    const plan = await getMobileAppSubscriptionPlan();
    return NextResponse.json({
      name: plan.planName,
      slug: plan.planSlug,
      monthlyUsd: plan.monthlyUsd,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      trialDays: plan.trialDays,
      configured: plan.configured,
      paypalConfigured: plan.paypalConfigured,
    });
  } catch (err) {
    console.error("mobile-app pricing:", err);
    return NextResponse.json({ error: err.message || "Failed to load pricing" }, { status: 500 });
  }
}
