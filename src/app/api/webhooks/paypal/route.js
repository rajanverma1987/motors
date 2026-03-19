import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import PaypalWebhookEvent from "@/models/PaypalWebhookEvent";
import { verifyPaypalWebhookSignature } from "@/lib/paypal-api";
import {
  applyPaymentSaleCompleted,
  applyPaymentSaleDenied,
  applySubscriptionActivated,
  applySubscriptionCancelled,
} from "@/lib/subscription-service";

export const dynamic = "force-dynamic";

function getHeader(request, name) {
  return request.headers.get(name) || request.headers.get(name.toLowerCase()) || "";
}

/**
 * Extract PayPal subscription id from webhook payload.
 */
function subscriptionIdFromEvent(event) {
  const type = event?.event_type || "";
  const res = event?.resource || {};
  if (type.startsWith("BILLING.SUBSCRIPTION.")) {
    return res.id || "";
  }
  if (type.startsWith("PAYMENT.SALE.")) {
    return res.billing_agreement_id || "";
  }
  return "";
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const eventId = event.id || "";
    if (!eventId) {
      return NextResponse.json({ error: "Missing event id" }, { status: 400 });
    }

    const transmissionId = getHeader(request, "paypal-transmission-id");
    const transmissionTime = getHeader(request, "paypal-transmission-time");
    const certUrl = getHeader(request, "paypal-cert-url");
    const authAlgo = getHeader(request, "paypal-auth-algo");
    const transmissionSig = getHeader(request, "paypal-transmission-sig");

    const verified = await verifyPaypalWebhookSignature({
      transmissionId,
      transmissionTime,
      certUrl,
      authAlgo,
      transmissionSig,
      webhookId: process.env.PAYPAL_WEBHOOK_ID,
      webhookEventBody: event,
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    await connectDB();
    const existing = await PaypalWebhookEvent.findOne({ eventId }).lean();
    if (existing?.processedOk) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const eventType = event.event_type || "";
    const subId = subscriptionIdFromEvent(event);

    let errMsg = "";
    try {
      if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" && subId) {
        await applySubscriptionActivated({ subscriptionId: subId, eventId });
      } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" && subId) {
        await applySubscriptionCancelled({ subscriptionId: subId, eventId });
      } else if (eventType === "PAYMENT.SALE.COMPLETED" && subId) {
        const amt = event.resource?.amount?.total != null ? Number(event.resource.amount.total) : undefined;
        const currency = event.resource?.amount?.currency || "USD";
        const saleId = event.resource?.id || "";
        await applyPaymentSaleCompleted({
          subscriptionId: subId,
          amount: amt,
          currency,
          saleId,
          eventId,
        });
      } else if (eventType === "PAYMENT.SALE.DENIED" && subId) {
        await applyPaymentSaleDenied({ subscriptionId: subId, eventId });
      }
    } catch (e) {
      errMsg = e.message || String(e);
      console.error("PayPal webhook handler error:", errMsg);
    }

    await PaypalWebhookEvent.findOneAndUpdate(
      { eventId },
      {
        $set: {
          eventType,
          processedOk: !errMsg,
          errorMessage: errMsg.slice(0, 500),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PayPal webhook:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
