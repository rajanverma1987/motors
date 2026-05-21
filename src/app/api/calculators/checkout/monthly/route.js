import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  requireCalculatorAccount,
  calculatorAuthRequiredResponse,
} from "@/lib/calculator-access";
import { createPaypalSubscription, paypalConfigured } from "@/lib/paypal-api";
import { getCalculatorSubscriptionPlan } from "@/lib/calculator-subscription-plan";
import { connectDB } from "@/lib/db";
import CalculatorEntitlement from "@/models/CalculatorEntitlement";
import { CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const ctx = await requireCalculatorAccount(request);
    if (!ctx.authenticated && !ctx.bypass) {
      return NextResponse.json(calculatorAuthRequiredResponse(CALCULATORS_SUBSCRIBE_PATH), { status: 401 });
    }

    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "PayPal is not configured. Contact support to enable calculator checkout." },
        { status: 503 }
      );
    }

    const calcPlan = await getCalculatorSubscriptionPlan();
    const planId = calcPlan.paypalPlanId;
    if (!planId) {
      return NextResponse.json(
        {
          error: `Calculators subscription plan (“${calcPlan.planSlug}”) is not set up with PayPal yet. Contact support.`,
        },
        { status: 503 }
      );
    }

    const base = getPublicSiteUrl(request);
    const returnUrl = `${base}/calculators-subscription?checkout=monthly&success=1`;
    const cancelUrl = `${base}/calculators-subscription?checkout=cancel`;

    const { subscriptionId, approvalUrl } = await createPaypalSubscription({
      paypalPlanId: planId,
      returnUrl,
      cancelUrl,
      subscriberEmail: ctx.email,
      brandName: "IQMotorBase Calculators",
    });

    await connectDB();
    await CalculatorEntitlement.updateOne(
      { ownerEmail: ctx.email },
      { $set: { paypalSubscriptionId: subscriptionId, pendingPaypalOrderId: "" } }
    );

    return NextResponse.json({ approvalUrl, subscriptionId });
  } catch (err) {
    console.error("calculators/checkout/monthly:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
