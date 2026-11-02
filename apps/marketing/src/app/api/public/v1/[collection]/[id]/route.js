import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { authenticateIntegrationApiKey } from "@/lib/integration-auth";
import { getIntegrationCollection, sanitizeIntegrationDoc, buildIntegrationWritePayload } from "@/lib/integration-collections";
import { checkRateLimit } from "@/lib/rate-limit";
import { recordSecurityEvent } from "@/lib/security-audit";
import { emitCrmResourceEvent } from "@/lib/integration-webhooks";

function scopeAllows(scopes, collection) {
  return Array.isArray(scopes) && (scopes.includes("*") || scopes.includes(collection));
}

export async function GET(request, context) {
  try {
    const { allowed } = await checkRateLimit(request, "integration-api", 120);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) {
      await recordSecurityEvent({
        event: "integration_api_auth_fail",
        request,
        success: false,
        metadata: { error: auth.error },
      });
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
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
    const { allowed } = await checkRateLimit(request, "integration-api", 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) {
      await recordSecurityEvent({
        event: "integration_api_auth_fail",
        request,
        success: false,
        metadata: { error: auth.error },
      });
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const collection = params?.collection;
    const id = params?.id;
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (cfg.readOnly) return NextResponse.json({ error: "Collection is read-only" }, { status: 405 });

    const body = await request.json().catch(() => ({}));
    const patch = buildIntegrationWritePayload(body, cfg, auth.ownerEmail, { forUpdate: true });

    await connectDB();
    const doc = await cfg.model.findOneAndUpdate(
      { _id: id, [cfg.ownerField]: auth.ownerEmail },
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const serialized = sanitizeIntegrationDoc(doc, cfg);
    await emitCrmResourceEvent({
      ownerEmail: auth.ownerEmail,
      collection,
      action: "updated",
      resourceId: serialized.id,
      data: serialized,
    });
    return NextResponse.json({ ok: true, item: serialized });
  } catch (err) {
    console.error("Public API update:", err);
    return NextResponse.json({ error: err.message || "Failed to update record" }, { status: 400 });
  }
}

export async function DELETE(request, context) {
  try {
    const { allowed } = await checkRateLimit(request, "integration-api", 60);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
    }
    const auth = await authenticateIntegrationApiKey(request);
    if (!auth.ok) {
      await recordSecurityEvent({
        event: "integration_api_auth_fail",
        request,
        success: false,
        metadata: { error: auth.error },
      });
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const collection = params?.collection;
    const id = params?.id;
    const cfg = getIntegrationCollection(collection);
    if (!cfg) return NextResponse.json({ error: "Unknown collection" }, { status: 404 });
    if (!scopeAllows(auth.scopes, collection)) return NextResponse.json({ error: "Scope denied" }, { status: 403 });
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    if (cfg.readOnly) return NextResponse.json({ error: "Collection is read-only" }, { status: 405 });

    await connectDB();
    const doc = await cfg.model.findOneAndDelete({ _id: id, [cfg.ownerField]: auth.ownerEmail }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const serialized = sanitizeIntegrationDoc(doc, cfg);
    await emitCrmResourceEvent({
      ownerEmail: auth.ownerEmail,
      collection,
      action: "deleted",
      resourceId: serialized.id,
      data: serialized,
    });
    return NextResponse.json({ ok: true, id: serialized.id });
  } catch (err) {
    console.error("Public API delete:", err);
    return NextResponse.json({ error: err.message || "Failed to delete record" }, { status: 400 });
  }
}

