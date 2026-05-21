import { getPaypalAccessToken, paypalConfigured, paypalBaseUrl } from "@/lib/paypal-api";
import { calculatorSingleUsePriceUsd } from "@/lib/calculator-pricing";

export { paypalConfigured };

/**
 * One-time PayPal Checkout order (calculator single-use unlock).
 */
export async function createPaypalCalculatorOrder({ returnUrl, cancelUrl, amountUsd }) {
  if (!paypalConfigured()) {
    throw new Error("PayPal is not configured.");
  }
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const value = Number(amountUsd ?? calculatorSingleUsePriceUsd()).toFixed(2);
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: "IQMotorBase calculator — single price reveal",
          amount: { currency_code: "USD", value },
        },
      ],
      application_context: {
        brand_name: "IQMotorBase",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.name || "PayPal order create failed");
  }
  const approve = (data.links || []).find((l) => l.rel === "approve");
  return {
    orderId: data.id,
    approvalUrl: approve?.href || "",
    status: data.status,
  };
}

export async function capturePaypalOrder(orderId) {
  if (!paypalConfigured()) {
    throw new Error("PayPal is not configured.");
  }
  const id = String(orderId || "").trim();
  if (!id) throw new Error("Missing order id");
  const token = await getPaypalAccessToken();
  const base = paypalBaseUrl();
  const res = await fetch(`${base}/v2/checkout/orders/${id}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.name || "PayPal capture failed");
  }
  const status = data.status || "";
  if (status !== "COMPLETED") {
    throw new Error(`PayPal order not completed (status: ${status || "unknown"})`);
  }
  return data;
}
