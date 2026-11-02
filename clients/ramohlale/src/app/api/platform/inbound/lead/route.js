import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Lead from "@/models/Lead";
import { verifyPlatformPayload } from "@/lib/platform-tenant-crypto";

const seenJti = new Map();

/**
 * Client host receives signed lead push from admin and stores it in the shop CRM DB.
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

  const ownerEmail = String(process.env.TENANT_OWNER_EMAIL || "").trim().toLowerCase();
  const name = String(payload.name || payload.contactName || "Lead").trim() || "Lead";
  const email = String(payload.email || "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Lead email required" }, { status: 400 });
  }

  await dbConnect();

  const externalId = String(payload.id || payload._id || "").trim();
  const doc = {
    name,
    email,
    phone: String(payload.phone || "").trim(),
    message: String(payload.message || payload.problemDescription || "").trim(),
    company: String(payload.company || "").trim(),
    city: String(payload.city || "").trim(),
    zipCode: String(payload.zipCode || "").trim(),
    motorType: String(payload.motorType || "").trim(),
    motorHp: String(payload.motorHp || "").trim(),
    leadSource: "admin_assigned",
    status: "new",
    createdByEmail: ownerEmail || email,
    sourceListingId: String(payload.sourceListingId || "").trim(),
  };

  let lead;
  if (externalId) {
    lead = await Lead.findOneAndUpdate(
      { trackInvitationId: `platform:${externalId}` },
      {
        $set: doc,
        $setOnInsert: { trackInvitationId: `platform:${externalId}` },
      },
      { upsert: true, new: true }
    );
  } else {
    lead = await Lead.create(doc);
  }

  return NextResponse.json({ ok: true, leadId: String(lead._id) });
}
