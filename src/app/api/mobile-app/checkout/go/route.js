import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { createPaypalSubscription, paypalConfigured } from "@/lib/paypal-api";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

async function accountFromCheckoutToken(token) {
  if (!token) return null;
  await connectDB();
  const account = await MobileAppAccount.findOne({ paypalCheckoutToken: token });
  if (!account) return null;
  const expires = account.paypalCheckoutTokenExpiresAt
    ? new Date(account.paypalCheckoutTokenExpiresAt).getTime()
    : 0;
  if (!expires || expires < Date.now()) return null;
  return account;
}

/** Full-page PayPal redirect — Smart Buttons use an iframe modal that PayPal closes immediately. */
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") || "").trim();
    const account = await accountFromCheckoutToken(token);
    if (!account) {
      return NextResponse.redirect(new URL("/mobile-app/paypal-complete?status=cancel", getPublicSiteUrl(request)));
    }

    if (!paypalConfigured()) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const calcPlan = await getMobileAppSubscriptionPlan();
    if (!calcPlan.paypalPlanId) {
      return NextResponse.json({ error: "PayPal plan is not linked." }, { status: 503 });
    }

    const base = getPublicSiteUrl(request);
    const { subscriptionId, approvalUrl } = await createPaypalSubscription({
      paypalPlanId: calcPlan.paypalPlanId,
      returnUrl: `${base}/mobile-app/paypal-complete?status=success&token=${encodeURIComponent(token)}`,
      cancelUrl: `${base}/mobile-app/paypal-complete?status=cancel`,
      subscriberEmail: account.email,
      brandName: "IQWireCalculator",
    });

    account.paypalSubscriptionId = subscriptionId;
    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    return NextResponse.redirect(approvalUrl, 302);
  } catch (err) {
    console.error("mobile-app checkout go:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
