import { NextResponse } from "next/server";
import { buildRewindCalculatorEstimate } from "@/lib/calculator-estimate-server";
import {
  getActiveGuestUnlockFromRequest,
  markGuestOrderUsed,
} from "@/lib/calculator-guest-unlock";
import { calculatorAccessBypassEnabled } from "@/lib/calculator-pricing";

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
    if (calculatorAccessBypassEnabled()) {
      const body = await request.json().catch(() => ({}));
      const estimate = await buildRewindCalculatorEstimate(body);
      return NextResponse.json({ locked: false, guest: true, estimate: estimatePayload(estimate) });
    }

    const guest = await getActiveGuestUnlockFromRequest(request);
    if (!guest) {
      return NextResponse.json({ locked: true, hasGuestUnlock: false }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const estimate = await buildRewindCalculatorEstimate(body);
    await markGuestOrderUsed(guest.orderId);

    return NextResponse.json({
      locked: false,
      hasGuestUnlock: true,
      guest: true,
      estimate: estimatePayload(estimate),
    });
  } catch (err) {
    console.error("calculators/estimate/guest:", err);
    return NextResponse.json({ error: err.message || "Estimate failed" }, { status: 500 });
  }
}
