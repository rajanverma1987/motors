import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getTrackFacilityFromRequest, trackUnauthorized } from "@/lib/track-auth";
import {
  ensurePaypalBillingPlanActive,
  paypalCheckoutOrigin,
  paypalConfigured,
  paypalPublicClientId,
} from "@/lib/paypal-api";
import { ensureTrackBillingPlan } from "@/lib/track-subscription";

export const dynamic = "force-dynamic";

function paypalPlanSubscribeUrl(paypalPlanId) {
  return `${paypalCheckoutOrigin()}/webapps/billing/plans/subscribe?plan_id=${encodeURIComponent(paypalPlanId)}`;
}

export async function POST(request) {
  try {
    const facility = await getTrackFacilityFromRequest(request);
    if (!facility) return NextResponse.json(trackUnauthorized(), { status: 401 });

    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Try again later or contact support." },
        { status: 503 }
      );
    }

    const billing = await ensureTrackBillingPlan();
    if (!billing.paypalPlanId) {
      return NextResponse.json(
        {
          error:
            "IQMotorTrack Pro is not linked to PayPal yet. Run scripts/ensure-iqmotortrack-paypal-plan.js or set the plan in Admin.",
        },
        { status: 503 }
      );
    }

    await ensurePaypalBillingPlanActive(billing.paypalPlanId);

    const checkoutToken = randomBytes(24).toString("hex");
    facility.paypalCheckoutToken = checkoutToken;
    facility.paypalCheckoutTokenExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
    facility.paypalPlanId = billing.paypalPlanId;
    await facility.save();

    return NextResponse.json({
      approvalUrl: paypalPlanSubscribeUrl(billing.paypalPlanId),
      checkoutUrl: `/Track/paypal-checkout?token=${encodeURIComponent(checkoutToken)}`,
      checkoutToken,
      paypalPlanId: billing.paypalPlanId,
      paypalClientId: paypalPublicClientId(),
      usd: billing.usd,
    });
  } catch (err) {
    console.error("Track checkout subscribe:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
