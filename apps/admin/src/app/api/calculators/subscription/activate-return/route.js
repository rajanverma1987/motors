import { NextResponse } from "next/server";
import {
  describeCalculatorAccess,
  entitlementToJson,
  extendCalculatorSubscriptionMonths,
  requireCalculatorAccount,
  calculatorAuthRequiredResponse,
} from "@/lib/calculator-access";
import { connectDB } from "@/lib/db";
import CalculatorEntitlement from "@/models/CalculatorEntitlement";
import { CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";

export const dynamic = "force-dynamic";

/** After PayPal subscription approval redirect — grant access on the signed-in account. */
export async function POST(request) {
  try {
    const ctx = await requireCalculatorAccount(request);
    if (!ctx.authenticated && !ctx.bypass) {
      return NextResponse.json(calculatorAuthRequiredResponse(CALCULATORS_SUBSCRIBE_PATH), { status: 401 });
    }

    await connectDB();
    const fresh = await CalculatorEntitlement.findOne({ ownerEmail: ctx.email }).lean();
    const subId = String(fresh?.paypalSubscriptionId || "").trim();
    if (subId) {
      await extendCalculatorSubscriptionMonths(ctx.email, 1);
    }
    const updated = await CalculatorEntitlement.findOne({ ownerEmail: ctx.email }).lean();
    const access = describeCalculatorAccess(updated, { bypass: ctx.bypass });
    return NextResponse.json(entitlementToJson(updated, access, { email: ctx.email }));
  } catch (err) {
    console.error("calculators/subscription/activate-return:", err);
    return NextResponse.json({ error: err.message || "Activation failed" }, { status: 500 });
  }
}
