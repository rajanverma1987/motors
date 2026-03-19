import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import IntegrationWebhook from "@/models/IntegrationWebhook";

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Webhook id required" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const set = {};
    if (typeof body.active === "boolean") set.active = body.active;
    if (typeof body.endpointUrl === "string" && /^https?:\/\//i.test(body.endpointUrl.trim())) set.endpointUrl = body.endpointUrl.trim();
    if (Array.isArray(body.events) && body.events.length) set.events = body.events;
    await connectDB();
    const doc = await IntegrationWebhook.findOneAndUpdate(
      { _id: id, ownerEmail: email },
      { $set: set },
      { new: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH webhook:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) return NextResponse.json({ error: "Webhook id required" }, { status: 400 });
    await connectDB();
    const r = await IntegrationWebhook.deleteOne({ _id: id, ownerEmail: email });
    if (!r.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE webhook:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
