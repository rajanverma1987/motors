import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendListingMarketingEmailViaResend } from "@/lib/resend-marketing";
import { LISTING_MARKETING_TEMPLATE_KEYS } from "@/lib/listing-marketing-constants";
import { DEFAULT_LISTING_MARKETING_TEMPLATES } from "@/lib/listing-marketing-defaults";
import {
  renderListingMarketingHtml,
  renderListingMarketingSubject,
} from "@/lib/listing-marketing-render";
import { buildListingMarketingUnsubscribeUrl } from "@/lib/listing-marketing-unsubscribe";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const to = String(body?.to || "contact@iqmotorbase.com")
      .trim()
      .toLowerCase();
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const templateKey = String(body?.templateKey || "initial").trim();
    if (!LISTING_MARKETING_TEMPLATE_KEYS.includes(templateKey)) {
      return NextResponse.json({ error: "Invalid template." }, { status: 400 });
    }

    const defaults = DEFAULT_LISTING_MARKETING_TEMPLATES[templateKey];
    let subject = String(body?.subject || "").trim();
    let bodyHtml = String(body?.bodyHtml || "").trim();

    if (!subject || !bodyHtml) {
      await connectDB();
      const doc = await MarketingTemplate.findOne({ key: templateKey }).lean();
      if (!subject) subject = String(doc?.subject || defaults.subject).trim();
      if (!bodyHtml) bodyHtml = String(doc?.bodyHtml || doc?.body || defaults.bodyHtml);
    }

    const ctx = {
      name: "Test Contact",
      email: to,
      companyName: "Test Motor Shop",
      unsubscribeUrl: buildListingMarketingUnsubscribeUrl(to, request),
    };

    const renderedSubject = `[TEST] ${renderListingMarketingSubject(subject, ctx)}`;
    const renderedHtml = renderListingMarketingHtml(bodyHtml, ctx);

    const result = await sendListingMarketingEmailViaResend({
      to,
      subject: renderedSubject,
      html: renderedHtml,
      tags: {
        templateKey,
        purpose: "test",
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Send failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, to, templateKey, resendId: result.id || "" });
  } catch (err) {
    console.error("Marketing send-test error:", err);
    return NextResponse.json({ error: err.message || "Send failed" }, { status: 500 });
  }
}
