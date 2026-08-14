import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import { ensurePaypalBillingPlanActive, paypalConfigured } from "@/lib/paypal-api";
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

    await ensurePaypalBillingPlanActive(calcPlan.paypalPlanId);

    const checkoutToken = randomBytes(24).toString("hex");
    account.paypalCheckoutToken = checkoutToken;
    account.paypalCheckoutTokenExpiresAt = new Date(Date.now() + 45 * 60 * 1000);
    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    const base = getPublicSiteUrl(request);
    const checkoutUrl = `${base}/mobile-app/paypal-checkout?token=${encodeURIComponent(checkoutToken)}`;
    return NextResponse.json({ approvalUrl: checkoutUrl, checkoutUrl });
  } catch (err) {
    console.error("mobile-app checkout subscribe:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
