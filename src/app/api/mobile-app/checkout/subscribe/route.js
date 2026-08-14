import { NextResponse } from "next/server";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import { createPaypalSubscription, paypalConfigured } from "@/lib/paypal-api";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

function isPrivateOrLocalHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true;
  return false;
}

function checkoutBaseFromRequest(request, requestedBase) {
  const raw = String(requestedBase || "").trim().replace(/\/$/, "");
  if (raw) {
    try {
      const u = new URL(raw);
      const protoOk = u.protocol === "http:" || u.protocol === "https:";
      if (protoOk && (u.protocol === "https:" || isPrivateOrLocalHost(u.hostname))) {
        return `${u.protocol}//${u.host}`;
      }
    } catch {
      /* ignore */
    }
  }
  try {
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
    if (host) {
      const hostname = host.split(":")[0];
      const protoHeader = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim();
      const proto = isPrivateOrLocalHost(hostname) ? protoHeader || "http" : "https";
      return `${proto}://${host}`;
    }
  } catch {
    /* ignore */
  }
  return getPublicSiteUrl(request);
}

export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }

    if (!paypalConfigured()) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Try again later or contact support." },
        { status: 503 }
      );
    }

    const calcPlan = await getMobileAppSubscriptionPlan();
    if (!calcPlan.paypalPlanId) {
      return NextResponse.json(
        {
          error: `IQWireCalculator subscription (“${calcPlan.planSlug}”) is not linked to PayPal yet. Set the price in Admin → Subscription plans.`,
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const base = checkoutBaseFromRequest(request, body.returnBase);
    const returnUrl = `${base}/mobile-app/paypal-complete?status=success`;
    const cancelUrl = `${base}/mobile-app/paypal-complete?status=cancel`;

    const { subscriptionId, approvalUrl } = await createPaypalSubscription({
      paypalPlanId: calcPlan.paypalPlanId,
      returnUrl,
      cancelUrl,
      subscriberEmail: account.email,
      brandName: "IQWireCalculator",
    });

    account.paypalSubscriptionId = subscriptionId;
    account.paypalPlanId = calcPlan.paypalPlanId;
    await account.save();

    return NextResponse.json({ approvalUrl, subscriptionId });
  } catch (err) {
    console.error("mobile-app checkout subscribe:", err);
    return NextResponse.json({ error: err.message || "Checkout failed" }, { status: 500 });
  }
}
