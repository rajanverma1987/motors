import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authenticateIntegrationApiKey } from "@/lib/integration-auth";
import { getIntegrationCollection, sanitizeIntegrationDoc } from "@/lib/integration-collections";
import { emitIntegrationEvent } from "@/lib/integration-webhooks";

function scopeAllows(scopes, collection) {
  return Array.isArray(scopes) && (scopes.includes("*") || scopes.includes(collection));
}

export async function GET(request, context) {
  try {
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const collection = params?.collection;
    const id = params?.id;
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await connectDB();
    const doc = await cfg.model.findOne({ _id: id, [cfg.ownerField]: auth.ownerEmail }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item: sanitizeIntegrationDoc(doc, cfg) });
  } catch (err) {
    console.error("Public API get:", err);
    return NextResponse.json({ error: "Failed to load record" }, { status: 500 });
  }
}

export async function PUT(request, context) {
  try {
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const collection = params?.collection;
    const id = params?.id;
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (cfg.readOnly) return NextResponse.json({ error: "Collection is read-only" }, { status: 405 });

    const body = await request.json().catch(() => ({}));
    const patch = { ...body };
    delete patch._id;
    delete patch.id;
    delete patch[cfg.ownerField];

    await connectDB();
    const doc = await cfg.model.findOneAndUpdate(
      { _id: id, [cfg.ownerField]: auth.ownerEmail },
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const serialized = sanitizeIntegrationDoc(doc, cfg);
    await emitIntegrationEvent({
      ownerEmail: auth.ownerEmail,
      eventName: `crm.${collection}.updated`,
      collection,
      resourceId: serialized.id,
      data: serialized,
    });
    return NextResponse.json({ ok: true, item: serialized });
  } catch (err) {
    console.error("Public API update:", err);
    return NextResponse.json({ error: err.message || "Failed to update record" }, { status: 400 });
  }
}

