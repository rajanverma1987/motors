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
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    const email = auth.ownerEmail;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || 50)));
    const skip = Math.max(0, Number(searchParams.get("skip") || 0));
    const q = { [cfg.ownerField]: email };
    const updatedAfter = searchParams.get("updatedAfter");
    if (updatedAfter) {
      const dt = new Date(updatedAfter);
      if (!Number.isNaN(dt.getTime())) q.updatedAt = { $gt: dt };
    }
    await connectDB();
    const rows = await cfg.model.find(q).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await cfg.model.countDocuments(q);
    return NextResponse.json({
      collection,
      total,
      limit,
      skip,
      items: rows.map((r) => sanitizeIntegrationDoc(r, cfg)),
    });
  } catch (err) {
    console.error("Public API list:", err);
    return NextResponse.json({ error: "Failed to list records" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const collection = params?.collection;
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    if (cfg.readOnly) return NextResponse.json({ error: "Collection is read-only" }, { status: 405 });
    const body = await request.json().catch(() => ({}));
    const payload = { ...body, [cfg.ownerField]: auth.ownerEmail };
    delete payload._id;
    delete payload.id;
    await connectDB();
    const doc = await cfg.model.create(payload);
    const serialized = sanitizeIntegrationDoc(doc, cfg);
    await emitIntegrationEvent({
      ownerEmail: auth.ownerEmail,
      eventName: `crm.${collection}.created`,
      collection,
      resourceId: serialized.id,
      data: serialized,
    });
    return NextResponse.json({ ok: true, item: serialized }, { status: 201 });
  } catch (err) {
    console.error("Public API create:", err);
    return NextResponse.json({ error: err.message || "Failed to create record" }, { status: 400 });
  }
}

