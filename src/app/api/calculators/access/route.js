import { NextResponse } from "next/server";
import {
  describeCalculatorAccessForPortal,
  entitlementToJson,
  requireCalculatorAccount,
  calculatorAuthRequiredResponse,
} from "@/lib/calculator-access";
import { calculatorAuthUrls, CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";
import { buildCalculatorPricingPayload } from "@/lib/calculator-subscription-plan";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const pricing = await buildCalculatorPricingPayload();
    const ctx = await requireCalculatorAccount(request);
    if (!ctx.authenticated && !ctx.bypass) {
      return NextResponse.json(
        { ...calculatorAuthRequiredResponse(CALCULATORS_SUBSCRIBE_PATH), pricing },
        { status: 401 }
      );
    }
    const { access, tier } = await describeCalculatorAccessForPortal(ctx.email, ctx.doc, {
      bypass: ctx.bypass,
    });
    return NextResponse.json({
      ...entitlementToJson(ctx.doc, access, { email: ctx.email, tier }),
      pricing,
      ...calculatorAuthUrls(CALCULATORS_SUBSCRIBE_PATH),
    });
  } catch (err) {
    console.error("calculators/access:", err);
    return NextResponse.json({ error: "Failed to load calculator access" }, { status: 500 });
  }
}
