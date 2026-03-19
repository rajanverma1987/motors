/**
 * PayPal REST API (Subscriptions v1). Uses PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET.
 * PAYPAL_MODE=sandbox | live
 */

function paypalBaseUrl() {
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase();
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

export function paypalConfigured() {
  return !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export async function getPaypalAccessToken() {
  if (!paypalConfigured()) {
    throw new Error("PayPal is not configured (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).");
  }
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "PayPal token failed");
  }
  return data.access_token;
}

function billingIntervalFromPlan(plan) {
  const cycle = plan.billingCycle || "monthly";
  const count = Math.max(1, Number(plan.billingIntervalCount) || 1);
  if (cycle === "yearly") {
    return { interval_unit: "YEAR", interval_count: 1 };
  }
  if (cycle === "custom") {
    return { interval_unit: "MONTH", interval_count: count };
  }
  return { interval_unit: "MONTH", interval_count: 1 };
}

/**
 * Create catalog product + billing plan with fixed negotiated price.
 * @param {import("mongoose").Document} planDoc - SubscriptionPlan
 */
export async function createPaypalProductAndPlan(planDoc) {
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  const productRes = await fetch(`${base}/v1/catalogs/products`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: planDoc.name,
      description: (planDoc.description || planDoc.name).slice(0, 127),
      type: "SERVICE",
    }),
  });
  const product = await productRes.json().catch(() => ({}));
  if (!productRes.ok) {
    throw new Error(product.message || product.name || "PayPal product create failed");
  }
  const productId = product.id;

  const price = Number(planDoc.customPrice || 0).toFixed(2);
  const { interval_unit, interval_count } = billingIntervalFromPlan(planDoc);

  const planBody = {
    product_id: productId,
    name: planDoc.name,
    description: (planDoc.description || "").slice(0, 127) || planDoc.name,
    billing_cycles: [
      {
        frequency: { interval_unit, interval_count },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: price,
            currency_code: (planDoc.currency || "USD").toUpperCase(),
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      payment_failure_threshold: 3,
    },
  };

  const planRes = await fetch(`${base}/v1/billing/plans`, {
    method: "POST",
    headers,
    body: JSON.stringify(planBody),
  });
  const planJson = await planRes.json().catch(() => ({}));
  if (!planRes.ok) {
    throw new Error(planJson.message || planJson.name || "PayPal billing plan create failed");
  }

  return {
    paypalProductId: productId,
    paypalPlanId: planJson.id,
  };
}

/**
 * Create a subscription (returns approval link for subscriber).
 */
export async function createPaypalSubscription({
  paypalPlanId,
  returnUrl,
  cancelUrl,
  subscriberEmail,
  brandName = "MotorsWinding",
}) {
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const body = {
    plan_id: paypalPlanId,
    subscriber: subscriberEmail
      ? {
          email_address: subscriberEmail,
        }
      : undefined,
    application_context: {
      brand_name: brandName,
      locale: "en-US",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };
  const res = await fetch(`${base}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.name || "PayPal subscription create failed");
  }
  const approve = (data.links || []).find((l) => l.rel === "approve");
  return {
    subscriptionId: data.id,
    approvalUrl: approve?.href || "",
    status: data.status,
  };
}

/**
 * Cancel PayPal subscription at end of cycle or immediately.
 */
export async function cancelPaypalSubscription(paypalSubscriptionId, reason = "Admin changed plan") {
  if (!paypalSubscriptionId) return;
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const res = await fetch(`${base}/v1/billing/subscriptions/${paypalSubscriptionId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason: { note: reason.slice(0, 127) } }),
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "PayPal cancel failed");
  }
}

/**
 * Verify webhook signature (PayPal API).
 */
export async function verifyPaypalWebhookSignature({
  transmissionId,
  transmissionTime,
  certUrl,
  authAlgo,
  transmissionSig,
  webhookId,
  webhookEventBody,
}) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    console.warn("PAYPAL_WEBHOOK_ID not set — webhook verification skipped in dev is unsafe");
    return process.env.NODE_ENV !== "production";
  }
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId || process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: webhookEventBody,
    }),
  });
  const data = await res.json().catch(() => ({}));
  return data.verification_status === "SUCCESS";
}
