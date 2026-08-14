import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { cancelPaypalSubscription } from "@/lib/paypal-api";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app subscription GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

/** Cancel at period end (PayPal + local flag). Access continues until currentPeriodEndsAt. */
export async function DELETE(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const subId = String(account.paypalSubscriptionId || "").trim();
    if (subId) {
      try {
        await cancelPaypalSubscription(subId, "Subscriber cancelled from mobile app");
      } catch (err) {
        console.warn("mobile-app cancel paypal:", err.message);
      }
    }
    account.cancelAtPeriodEnd = true;
    const periodEnds = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).getTime() : 0;
    account.subscriptionStatus = periodEnds > Date.now() ? "cancelled" : "expired";
    await account.save();
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app subscription cancel:", err);
    return NextResponse.json({ error: err.message || "Failed to cancel" }, { status: 500 });
  }
}
