import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  requireCalculatorAccount,
  grantCalculatorCredit,
  clearPendingPaypalOrder,
} from "@/lib/calculator-access";
import { capturePaypalOrder, paypalConfigured } from "@/lib/paypal-orders";
import { connectDB } from "@/lib/db";
import CalculatorEntitlement from "@/models/CalculatorEntitlement";
import {
  findGuestUnlockByOrderId,
  markGuestOrderCaptured,
  setGuestUnlockCookie,
} from "@/lib/calculator-guest-unlock";

export const dynamic = "force-dynamic";

/**
 * PayPal redirects here after one-time approval (?token=ORDER_ID).
 * Logged-in users get a credit; guests get a session cookie for one reveal on the cost guide.
 */
export async function GET(request) {
  const base = getPublicSiteUrl(request);
  const failRedirect = `${base}/cost-of-motor-repair-and-rewinding?checkout=failed#motor-rewind-cost-calculator`;
  const successRedirect = `${base}/cost-of-motor-repair-and-rewinding?price_unlocked=1#motor-rewind-cost-calculator`;

  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    const isGuestReturn = searchParams.get("guest") === "1";
    if (!token) {
      return NextResponse.redirect(failRedirect);
    }

    if (!paypalConfigured()) {
      return NextResponse.redirect(failRedirect);
    }

    const ctx = await requireCalculatorAccount(request);
    const guestDoc = await findGuestUnlockByOrderId(token);

    if (isGuestReturn || !ctx.authenticated) {
      if (!guestDoc) {
        return NextResponse.redirect(failRedirect);
      }
      await capturePaypalOrder(token);
      await markGuestOrderCaptured(token);
      await setGuestUnlockCookie(token);
      return NextResponse.redirect(successRedirect);
    }

    await connectDB();
    const doc = await CalculatorEntitlement.findOne({ ownerEmail: ctx.email }).lean();
    const pending = String(doc?.pendingPaypalOrderId || "").trim();
    if (pending && pending !== token) {
      console.warn("PayPal return token mismatch", { pending, token, email: ctx.email });
    }

    await capturePaypalOrder(token);
    await grantCalculatorCredit(ctx.email, 1);
    await clearPendingPaypalOrder(ctx.email);
    await CalculatorEntitlement.updateOne(
      { ownerEmail: ctx.email },
      { $set: { lastPaypalOrderId: token } }
    );

    return NextResponse.redirect(successRedirect);
  } catch (err) {
    console.error("calculators/checkout/return:", err);
    return NextResponse.redirect(failRedirect);
  }
}
