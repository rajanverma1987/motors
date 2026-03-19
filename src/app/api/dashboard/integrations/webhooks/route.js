import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import IntegrationWebhook from "@/models/IntegrationWebhook";
import IntegrationWebhookDelivery from "@/models/IntegrationWebhookDelivery";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const hooks = await IntegrationWebhook.find({ ownerEmail: email }).sort({ createdAt: -1 }).lean();
    const deliveries = await IntegrationWebhookDelivery.find({ ownerEmail: email }).sort({ createdAt: -1 }).limit(50).lean();
    return NextResponse.json({
      webhooks: hooks.map((w) => ({
        id: String(w._id),
        name: w.name,
        endpointUrl: w.endpointUrl,
        active: w.active,
        events: w.events || ["*"],
        lastDeliveredAt: w.lastDeliveredAt,
        lastStatusCode: w.lastStatusCode,
        lastError: w.lastError || "",
        createdAt: w.createdAt,
      })),
      deliveries: deliveries.map((d) => ({
        id: String(d._id),
        webhookId: d.webhookId,
        eventName: d.eventName,
        status: d.status,
        httpStatusCode: d.httpStatusCode,
        createdAt: d.createdAt,
        error: d.error || "",
      })),
    });
  } catch (err) {
    console.error("GET webhooks:", err);
    return NextResponse.json({ error: "Failed to load webhooks" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "Webhook").trim().slice(0, 120);
    const endpointUrl = String(body.endpointUrl || "").trim();
    if (!/^https?:\/\//i.test(endpointUrl)) {
      return NextResponse.json({ error: "Valid endpointUrl required" }, { status: 400 });
    }
    const events = Array.isArray(body.events) && body.events.length ? body.events : ["*"];
    const secret = crypto.randomBytes(24).toString("hex");
    await connectDB();
    const doc = await IntegrationWebhook.create({
      ownerEmail: user.email.trim().toLowerCase(),
      name,
      endpointUrl,
      events,
      active: true,
      secret,
    });
    return NextResponse.json({
      ok: true,
      secret,
      webhook: {
        id: String(doc._id),
        name: doc.name,
        endpointUrl: doc.endpointUrl,
        active: doc.active,
        events: doc.events || ["*"],
      },
    });
  } catch (err) {
    console.error("POST webhook:", err);
    return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
  }
}
