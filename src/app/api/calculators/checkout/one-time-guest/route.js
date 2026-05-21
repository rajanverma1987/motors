import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { createPaypalCalculatorOrder, paypalConfigured } from "@/lib/paypal-orders";
import { calculatorSingleUsePriceUsd } from "@/lib/calculator-pricing";
import { createPendingGuestOrder } from "@/lib/calculator-guest-unlock";

export const dynamic = "force-dynamic";

/** Public cost guide: $5 PayPal unlock without portal registration. */
export async function POST(request) {
  try {
    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "PayPal is not configured. Contact support to enable checkout." },
        { status: 503 }
      );
    }

    const base = getPublicSiteUrl(request);
    const returnUrl = `${base}/api/calculators/checkout/return?kind=single&guest=1`;
    const cancelUrl = `${base}/cost-of-motor-repair-and-rewinding?checkout=cancel#motor-rewind-cost-calculator`;

    const { orderId, approvalUrl } = await createPaypalCalculatorOrder({
      returnUrl,
      cancelUrl,
      amountUsd: calculatorSingleUsePriceUsd(),
    });

    await createPendingGuestOrder(orderId);

    return NextResponse.json({ approvalUrl, orderId });
  } catch (err) {
    console.error("calculators/checkout/one-time-guest:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
