import { NextResponse } from "next/server";
import { getPortalPayloadFromRequest } from "@/lib/auth-portal";
import { userIsCalculatorOnlyPortalAccount } from "@/lib/calculator-portal-tier";

export const dynamic = "force-dynamic";

/**
 * Lightweight tier check for middleware (Node runtime, DB-backed).
 * Only callable with a valid portal session cookie.
 */
export async function GET(request) {
  const payload = await getPortalPayloadFromRequest(request);
  if (!payload?.email) {
    return NextResponse.json({ calculatorOnlyPortal: false }, { status: 401 });
  }
  const calculatorOnlyPortal = await userIsCalculatorOnlyPortalAccount(payload.email);
  return NextResponse.json({ calculatorOnlyPortal });
}
