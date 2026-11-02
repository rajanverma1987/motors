import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { verifyPlatformPayload } from "@/lib/platform-tenant-crypto";

const seenJti = new Map();

/**
 * Client host receives signed lead push from admin.
 * Requires SUPPORT/PLATFORM inbound secret = SUPPORT_HANDOFF_SECRET or PLATFORM_WEBHOOK_SECRET.
 */
export async function POST(request) {
  const secret =
    process.env.PLATFORM_WEBHOOK_SECRET || process.env.SUPPORT_HANDOFF_SECRET || "";
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const ts = request.headers.get("x-3pf-timestamp") || "";
  const jti = request.headers.get("x-3pf-jti") || "";
  const sig = request.headers.get("x-3pf-signature") || "";
  const body = await request.text();

  const verified = verifyPlatformPayload(secret, { body, ts, jti, sig });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 401 });
  }
  if (seenJti.has(jti)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  seenJti.set(jti, Date.now());
  if (seenJti.size > 5000) {
    const cutoff = Date.now() - 300_000;
    for (const [k, t] of seenJti) {
      if (t < cutoff) seenJti.delete(k);
    }
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await dbConnect();
  // Soft ingest: store as ActivityLog-style or return accepted for CRM wiring.
  // Full Lead model may differ per shop DB; accept and acknowledge.
  console.info("[platform inbound lead]", process.env.TENANT_SLUG, payload?.id || payload?.email);

  return NextResponse.json({ ok: true });
}
