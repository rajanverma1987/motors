import { NextResponse } from "next/server";
import { ensureTrackBillingPlan } from "@/lib/track-subscription";
import { paypalPublicClientId } from "@/lib/paypal-api";
import {
  IQMOTORTRACK_FREE_MOTOR_LIMIT,
  IQMOTORTRACK_MONTHLY_USD,
} from "@/lib/iqmotortrack-marketing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const billing = await ensureTrackBillingPlan();
    return NextResponse.json({
      ok: true,
      free: {
        priceUsd: 0,
        motorLimit: IQMOTORTRACK_FREE_MOTOR_LIMIT,
        label: "Free",
      },
      pro: {
        priceUsd: billing.usd || IQMOTORTRACK_MONTHLY_USD,
        motorLimit: null,
        label: "Pro",
        billingCycle: "monthly",
        configured: billing.configured,
        paypalPlanId: billing.paypalPlanId,
        paypalClientId: paypalPublicClientId(),
      },
    });
  } catch (err) {
    console.error("Track pricing:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
