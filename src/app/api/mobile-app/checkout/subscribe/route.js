import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import {
  ensurePaypalBillingPlanActive,
  paypalCheckoutOrigin,
  paypalConfigured,
  paypalPublicClientId,
} from "@/lib/paypal-api";
import { resolveMobileAppPlanByBillingCycle } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

function paypalPlanSubscribeUrl(paypalPlanId) {
  return `${paypalCheckoutOrigin()}/webapps/billing/plans/subscribe?plan_id=${encodeURIComponent(paypalPlanId)}`;
}

export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }

    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Try again later or contact support." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const billingCycle = String(body?.billingCycle || "monthly").toLowerCase() === "yearly" ? "yearly" : "monthly";
    const calcPlan = await resolveMobileAppPlanByBillingCycle(billingCycle);
    if (!calcPlan.paypalPlanId) {
      return NextResponse.json(
        {
          error: `IQWireCalculator ${billingCycle} subscription (“${calcPlan.planSlug}”) is not linked to PayPal yet. Set the price in Admin → Subscription plans.`,
        },
        { status: 503 }
      );
    }

    await ensurePaypalBillingPlanActive(calcPlan.paypalPlanId);

    const checkoutToken = randomBytes(24).toString("hex");
    account.paypalCheckoutToken = checkoutToken;
    account.paypalCheckoutTokenExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    const approvalUrl = paypalPlanSubscribeUrl(calcPlan.paypalPlanId);
    const checkoutUrl = `/mobile-app/paypal-checkout?token=${encodeURIComponent(checkoutToken)}`;
    return NextResponse.json({
      approvalUrl,
      checkoutUrl,
      checkoutToken,
      paypalPlanId: calcPlan.paypalPlanId,
      paypalClientId: paypalPublicClientId(),
      billingCycle,
      usd: calcPlan.usd,
      currency: calcPlan.currency,
      planName: calcPlan.planName,
    });
  } catch (err) {
    console.error("mobile-app checkout subscribe:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
