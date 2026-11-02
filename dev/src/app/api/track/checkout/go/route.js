import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { ensurePaypalBillingPlanActive, paypalCheckoutOrigin, paypalConfigured } from "@/lib/paypal-api";
import { ensureTrackBillingPlan } from "@/lib/track-subscription";

export const dynamic = "force-dynamic";

async function facilityFromCheckoutToken(token) {
  if (!token) return null;
  await connectDB();
  const facility = await TrackFacility.findOne({ paypalCheckoutToken: token });
  if (!facility) return null;
  const expires = facility.paypalCheckoutTokenExpiresAt
    ? new Date(facility.paypalCheckoutTokenExpiresAt).getTime()
    : 0;
  if (!expires || expires < Date.now()) return null;
  return facility;
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

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = String(url.searchParams.get("token") || "").trim();
    const facility = await facilityFromCheckoutToken(token);
    if (!facility) {
      return NextResponse.redirect(new URL("/Track?paypal=cancel", getPublicSiteUrl(request)));
    }

    if (!paypalConfigured()) {
      return NextResponse.json({ error: "Payments are not configured." }, { status: 503 });
    }

    const billing = await ensureTrackBillingPlan();
    const paypalPlanId = String(facility.paypalPlanId || billing.paypalPlanId || "").trim();
    if (!paypalPlanId) {
      return NextResponse.json({ error: "PayPal plan is not linked." }, { status: 503 });
    }

    await ensurePaypalBillingPlanActive(paypalPlanId);
    facility.paypalPlanId = paypalPlanId;
    await facility.save();

    const approvalUrl = `${paypalCheckoutOrigin()}/webapps/billing/plans/subscribe?plan_id=${encodeURIComponent(paypalPlanId)}`;
    const wantsJson = String(request.headers.get("accept") || "").includes("application/json");
    if (wantsJson) {
      return NextResponse.json({ approvalUrl });
    }

    return new NextResponse(paypalBounceHtml(approvalUrl), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Track checkout go:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
