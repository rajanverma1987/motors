import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  requireCalculatorAccount,
  calculatorAuthRequiredResponse,
  setPendingPaypalOrder,
} from "@/lib/calculator-access";
import { createPaypalCalculatorOrder, paypalConfigured } from "@/lib/paypal-orders";
import { calculatorSingleUsePriceUsd } from "@/lib/calculator-pricing";
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

    const base = getPublicSiteUrl(request);
    const returnUrl = `${base}/api/calculators/checkout/return?kind=single`;
    const cancelUrl = `${base}/cost-of-motor-repair-and-rewinding?checkout=cancel#motor-rewind-cost-calculator`;

    const { orderId, approvalUrl } = await createPaypalCalculatorOrder({
      returnUrl,
      cancelUrl,
      amountUsd: calculatorSingleUsePriceUsd(),
    });

    await setPendingPaypalOrder(ctx.email, orderId);

    return NextResponse.json({ approvalUrl, orderId });
  } catch (err) {
    console.error("calculators/checkout/one-time:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
