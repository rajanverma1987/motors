import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  LISTING_MARKETING_TEMPLATE_KEYS,
  LISTING_MARKETING_TEMPLATE_META,
} from "@/lib/listing-marketing-constants";
import { DEFAULT_LISTING_MARKETING_TEMPLATES } from "@/lib/listing-marketing-defaults";

function normalizeTemplateDoc(doc, key) {
  const defaults = DEFAULT_LISTING_MARKETING_TEMPLATES[key];
  const meta = LISTING_MARKETING_TEMPLATE_META[key];
  if (!doc) {
    return {
      key,
      name: meta?.name || defaults.name,
      subject: defaults.subject,
      bodyHtml: defaults.bodyHtml,
    };
  }
  const bodyHtml = String(doc.bodyHtml || doc.body || "").trim() || defaults.bodyHtml;
  return {
    key,
    name: String(doc.name || meta?.name || defaults.name).trim(),
    subject: String(doc.subject || "").trim() || defaults.subject,
    bodyHtml,
  };
}

/** One-time style migration for pre-Resend template docs (type=initial|followup). */
async function migrateLegacyTemplates() {
  await MarketingTemplate.updateOne(
    { type: "initial", $or: [{ key: { $exists: false } }, { key: null }, { key: "" }] },
    { $set: { key: "initial", type: "initial", name: "Initial" } }
  );
  await MarketingTemplate.updateOne(
    { type: "followup", $or: [{ key: { $exists: false } }, { key: null }, { key: "" }] },
    { $set: { key: "followup1", type: "followup1", name: "Follow-up 1" } }
  );
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    await migrateLegacyTemplates();

    const docs = await MarketingTemplate.find({
      key: { $in: LISTING_MARKETING_TEMPLATE_KEYS },
    }).lean();
    const byKey = Object.fromEntries(docs.map((d) => [d.key, d]));

    const templates = LISTING_MARKETING_TEMPLATE_KEYS.map((key) =>
      normalizeTemplateDoc(byKey[key], key)
    );

    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Marketing templates get error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    await migrateLegacyTemplates();
    const body = await request.json();
    const list = Array.isArray(body?.templates) ? body.templates : [];

    for (const item of list) {
      const key = String(item?.key || "").trim();
      if (!LISTING_MARKETING_TEMPLATE_KEYS.includes(key)) continue;
      const meta = LISTING_MARKETING_TEMPLATE_META[key];
      await MarketingTemplate.findOneAndUpdate(
        { key },
        {
          $set: {
            key,
            // Keep `type` aligned with `key` so legacy unique indexes on `type` stay valid.
            type: key,
            name: String(item.name || meta?.name || key).trim(),
            subject: String(item.subject || "").trim(),
            bodyHtml: String(item.bodyHtml || item.body || ""),
          },
          $unset: { body: 1 },
        },
        { upsert: true, new: true }
      );
    }

    const docs = await MarketingTemplate.find({
      key: { $in: LISTING_MARKETING_TEMPLATE_KEYS },
    }).lean();
    const byKey = Object.fromEntries(docs.map((d) => [d.key, d]));
    const templates = LISTING_MARKETING_TEMPLATE_KEYS.map((key) =>
      normalizeTemplateDoc(byKey[key], key)
    );

    return NextResponse.json({ ok: true, templates });
  } catch (err) {
    console.error("Marketing templates update error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
