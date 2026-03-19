import crypto from "crypto";
import { connectDB } from "@/lib/db";
import IntegrationWebhook from "@/models/IntegrationWebhook";
import IntegrationWebhookDelivery from "@/models/IntegrationWebhookDelivery";

function hmac(secret, payload) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function eventMatches(events, name) {
  if (!Array.isArray(events) || events.length === 0) return false;
  if (events.includes("*")) return true;
  return events.includes(name);
}

export async function emitIntegrationEvent({
  ownerEmail,
  eventName,
  collection,
  resourceId,
  data,
}) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email || !eventName) return;

  await connectDB();
  const hooks = await IntegrationWebhook.find({ ownerEmail: email, active: true }).lean();
  if (!hooks.length) return;

  const ts = Date.now().toString();
  const requestId = crypto.randomUUID();
  const payloadObj = {
    id: requestId,
    event: eventName,
    ownerEmail: email,
    collection: collection || "",
    resourceId: resourceId || "",
    occurredAt: new Date().toISOString(),
    data: data || {},
  };
  const payload = JSON.stringify(payloadObj);

  await Promise.allSettled(
    hooks
      .filter((h) => eventMatches(h.events, eventName))
      .map(async (hook) => {
        const signature = hmac(hook.secret, `${ts}.${payload}`);
        let ok = false;
        let code = null;
        let err = "";
        try {
          const res = await fetch(hook.endpointUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Motors-Event": eventName,
              "X-Motors-Timestamp": ts,
              "X-Motors-Signature": `sha256=${signature}`,
              "X-Motors-Request-Id": requestId,
            },
            body: payload,
          });
          code = res.status;
          ok = res.ok;
          if (!ok) err = `HTTP ${res.status}`;
        } catch (e) {
          err = e.message || "Delivery error";
        }

        await IntegrationWebhook.updateOne(
          { _id: hook._id },
          {
            $set: {
              lastDeliveredAt: new Date(),
              lastStatusCode: code,
              lastError: err.slice(0, 500),
            },
          }
        );

        await IntegrationWebhookDelivery.create({
          ownerEmail: email,
          webhookId: String(hook._id),
          eventName,
          resourceCollection: collection || "",
          resourceId: resourceId || "",
          requestId,
          status: ok ? "success" : "failed",
          httpStatusCode: code,
          error: err.slice(0, 500),
          attempts: 1,
        });
      })
  );
}

