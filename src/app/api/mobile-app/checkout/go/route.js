import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { ensurePaypalBillingPlanActive, paypalCheckoutOrigin, paypalConfigured } from "@/lib/paypal-api";
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

function paypalBounceHtml(dest) {
  const href = String(dest || "");
  const safeAttr = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "").replace(/>/g, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=${safeAttr}" />
  <title>Continuing to PayPal</title>
</head>
<body>
  <p>Continuing to PayPal…</p>
  <p><a href="${safeAttr}">Continue to PayPal</a></p>
  <script>window.location.replace(${JSON.stringify(href)});</script>
</body>
</html>`;
}

/** HTML bounce to PayPal. HTTP Location redirects get rewritten onto iqmotorbase.com by IIS/ARR. */
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

    await ensurePaypalBillingPlanActive(calcPlan.paypalPlanId);

    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    // Plan subscribe link — not /webapps/billing/subscriptions?ba_token=
    // That PayPal page fails with billing/error (createCart 400 / early_flush).
    const approvalUrl = `${paypalCheckoutOrigin()}/webapps/billing/plans/subscribe?plan_id=${encodeURIComponent(calcPlan.paypalPlanId)}`;

    return new NextResponse(paypalBounceHtml(approvalUrl), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("mobile-app checkout go:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
