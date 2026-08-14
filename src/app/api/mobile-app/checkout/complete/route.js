import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getPaypalSubscription } from "@/lib/paypal-api";
import { mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { syncMobileAppPaypalSubscription } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

/** Public: PayPal JS checkout posts the new subscription id with the one-time checkout token. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const subscriptionId = String(body.subscriptionId || "").trim();
    if (!token || !subscriptionId) {
      return NextResponse.json({ error: "Missing checkout details." }, { status: 400 });
    }

    await connectDB();
    const account = await MobileAppAccount.findOne({ paypalCheckoutToken: token });
    if (!account) {
      return NextResponse.json({ error: "Checkout session expired. Try Subscribe again from the app." }, { status: 400 });
    }
    const expires = account.paypalCheckoutTokenExpiresAt
      ? new Date(account.paypalCheckoutTokenExpiresAt).getTime()
      : 0;
    if (!expires || expires < Date.now()) {
      account.paypalCheckoutToken = "";
      account.paypalCheckoutTokenExpiresAt = null;
      await account.save();
      return NextResponse.json({ error: "Checkout session expired. Try Subscribe again from the app." }, { status: 400 });
    }

    const paypalSub = await getPaypalSubscription(subscriptionId);
    if (!paypalSub?.id) {
      return NextResponse.json({ error: "PayPal subscription was not found." }, { status: 400 });
    }

    account.paypalSubscriptionId = subscriptionId;
    account.paypalCheckoutToken = "";
    account.paypalCheckoutTokenExpiresAt = null;
    await account.save();

    const { account: synced, activated, paypalStatus } = await syncMobileAppPaypalSubscription(account);
    const session = await mobileAppSessionPayload(synced || account);
    return NextResponse.json({ account: session, activated, paypalStatus });
  } catch (err) {
    console.error("mobile-app checkout complete:", err);
    return NextResponse.json({ error: err.message || "Could not finish checkout." }, { status: 500 });
  }
}
