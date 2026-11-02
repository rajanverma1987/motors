import { NextResponse } from "next/server";
import {
  consumeCalculatorCredit,
  describeCalculatorAccess,
  describeCalculatorAccessForPortal,
  requireCalculatorAccount,
  calculatorAuthRequiredResponse,
  hasCalculatorEstimateAccess,
} from "@/lib/calculator-access";
import { buildRewindCalculatorEstimate } from "@/lib/calculator-estimate-server";
import { CALCULATORS_SUBSCRIBE_PATH } from "@/lib/calculator-auth-flow";

export const dynamic = "force-dynamic";

function estimatePayload(estimate) {
  const { breakdown, market, ...rest } = estimate;
  return {
    roughLow: rest.roughLow,
    roughHigh: rest.roughHigh,
    low: rest.low,
    high: rest.high,
    newMotorEstimate: rest.newMotorEstimate,
    replacementRecommended: rest.replacementRecommended,
    industrial: rest.industrial,
    fractionalHpNote: rest.fractionalHpNote,
    breakdown: {
      motorHp: breakdown.motorHp,
      copperCost: breakdown.copperCost,
      materialCost: breakdown.materialCost,
      laborUsd: breakdown.laborUsd,
      ballparkTotal: breakdown.ballparkTotal,
    },
    market: {
      copperUsdPerKg: market.copperUsdPerKg,
      motorPpiMultiplier: market.motorPpiMultiplier,
      copperLive: market.copperLive,
      motorLive: market.motorLive,
      copperSourceLabel: market.copperSourceLabel,
      motorSourceLabel: market.motorSourceLabel,
      fetchedAt: market.fetchedAt,
    },
  };
}

export async function POST(request) {
  try {
    const ctx = await requireCalculatorAccount(request);
    if (!ctx.authenticated && !ctx.bypass) {
      return NextResponse.json(calculatorAuthRequiredResponse(CALCULATORS_SUBSCRIBE_PATH), { status: 401 });
    }

    const { access, tier } = await describeCalculatorAccessForPortal(ctx.email, ctx.doc, {
      bypass: ctx.bypass,
    });
    const body = await request.json().catch(() => ({}));
    const consumeCredit = body?.consumeCredit !== false;

    if (
      !hasCalculatorEstimateAccess(ctx.doc, {
        bypass: ctx.bypass,
        fullCrmIncludesCalculators: tier.fullCrmIncludesCalculators,
      })
    ) {
      return NextResponse.json({ locked: true, hasAccess: false, accessMode: access.mode, authenticated: true });
    }

    const estimate = await buildRewindCalculatorEstimate(body);

    if (!ctx.bypass && access.mode === "credit" && consumeCredit) {
      await consumeCalculatorCredit(ctx.email);
    }

    const updatedAccess = describeCalculatorAccess(
      access.mode === "credit" && consumeCredit
        ? { ...ctx.doc, credits: Math.max(0, (Number(ctx.doc?.credits) || 0) - 1) }
        : ctx.doc,
      { bypass: ctx.bypass, fullCrmIncludesCalculators: tier.fullCrmIncludesCalculators }
    );

    return NextResponse.json({
      locked: false,
      hasAccess: true,
      authenticated: true,
      accessMode: updatedAccess.mode,
      credits: updatedAccess.credits,
      estimate: estimatePayload(estimate),
    });
  } catch (err) {
    console.error("calculators/estimate:", err);
    return NextResponse.json({ error: err.message || "Estimate failed" }, { status: 500 });
  }
}
