import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import { createPaypalSubscription, paypalConfigured } from "@/lib/paypal-api";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

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

    const calcPlan = await getMobileAppSubscriptionPlan();
    if (!calcPlan.paypalPlanId) {
      return NextResponse.json(
        {
          error: `IQWireCalculator subscription (“${calcPlan.planSlug}”) is not linked to PayPal yet. Set the price in Admin → Subscription plans.`,
        },
        { status: 503 }
      );
    }

    const base = getPublicSiteUrl(request);
    const returnUrl = `${base}/mobile-app/paypal-complete?status=success`;
    const cancelUrl = `${base}/mobile-app/paypal-complete?status=cancel`;

    const { subscriptionId } = await createPaypalSubscription({
      paypalPlanId: calcPlan.paypalPlanId,
      returnUrl,
      cancelUrl,
      brandName: "IQWireCalculator",
    });

    account.paypalSubscriptionId = subscriptionId;
    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    // Hosted PayPal JS checkout — do not send users to /webapps/billing/subscriptions.
    // That PayPal page redirects to /webapps/billing/error for this live plan.
    const checkoutUrl = `${base}/mobile-app/paypal-checkout?sid=${encodeURIComponent(subscriptionId)}`;
    return NextResponse.json({ approvalUrl: checkoutUrl, checkoutUrl, subscriptionId });
  } catch (err) {
    console.error("mobile-app checkout subscribe:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
