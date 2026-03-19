import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/db";
import MarketingContact from "@/models/MarketingContact";
import MarketingTemplate from "@/models/MarketingTemplate";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { sendMarketingEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";

const FOLLOW_UP_DAYS = 5;
const MAX_BATCH = 50;
const UNSUB_SECRET = process.env.MARKETING_UNSUBSCRIBE_SECRET || process.env.AUTH_SECRET;

function getUnsubscribeToken(email) {
  if (!UNSUB_SECRET) return "";
  const normalized = (email || "").trim().toLowerCase();
  return crypto.createHmac("sha256", UNSUB_SECRET).update(normalized).digest("base64url");
}

function renderBody(body, contact) {
  if (!body) return "";
  const name = (contact.name || "").trim();
  const email = (contact.email || "").trim();
  const company = (contact.companyName || "").trim();
  return body
    .replace(/\{\{name\}\}/g, name || "")
    .replace(/\{\{email\}\}/g, email)
    .replace(/\{\{companyName\}\}/g, company || "")
    .replace(/\{\{#name\}\}([\s\S]*?)\{\{\/name\}\}/g, name ? "$1" : "");
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();
    const body = await request.json();
    const batchSize = Math.min(Math.max(1, parseInt(body?.batchSize, 10) || 10), MAX_BATCH);

    const now = new Date();
    const followUpCutoff = new Date(now.getTime() - FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000);

    const sendable = await MarketingContact.find({
      status: { $nin: ["listed", "do_not_contact", "unsubscribed"] },
    })
      .sort({ lastEmailSentAt: 1, firstEmailSentAt: 1, createdAt: 1 })
      .lean();

    const toSend = [];
    for (const c of sendable) {
      if (toSend.length >= batchSize) break;
      const isNew = !c.firstEmailSentAt;
      const needsFollowUp = c.lastEmailSentAt && new Date(c.lastEmailSentAt) <= followUpCutoff;
      if (isNew) toSend.push({ ...c, sendType: "initial" });
      else if (needsFollowUp) toSend.push({ ...c, sendType: "followup" });
    }

    const initialDoc = await MarketingTemplate.findOne({ type: "initial" }).lean();
    const followupDoc = await MarketingTemplate.findOne({ type: "followup" }).lean();
    const initialSubject = (initialDoc?.subject || "List your motor repair shop on MotorsWinding.com").trim();
    const initialBody = (initialDoc?.body || "").trim();
    const followupSubject = (followupDoc?.subject || "Quick follow-up – list your motor repair shop").trim();
    const followupBody = (followupDoc?.body || "").trim();

    const baseUrl = getPublicSiteUrl();
    const linkReplacer = (html) => html.replace(/https:\/\/motorswinding\.com\//g, baseUrl + "/");

    let sent = 0;
    const errors = [];

    for (const c of toSend) {
      const contact = { name: c.name, email: c.email, companyName: c.companyName };
      const isInitial = c.sendType === "initial";
      const subject = isInitial ? initialSubject : followupSubject;
      const rawBody = isInitial ? initialBody : followupBody;
      const unsubscribeUrl = `${baseUrl}/api/marketing/unsubscribe?email=${encodeURIComponent(c.email)}&token=${getUnsubscribeToken(c.email)}`;
      let html = linkReplacer(renderBody(rawBody, contact)).replace(/\{\{unsubscribe_url\}\}/g, unsubscribeUrl);
      if (!html.includes(unsubscribeUrl)) {
        html += `<p style="margin-top:2em;font-size:12px;color:#666">You received this because your business was contacted for listing. <a href="${unsubscribeUrl}">Unsubscribe</a> from these emails.</p>`;
      }
      const result = await sendMarketingEmail(c.email, subject, html);
      if (result.ok) {
        const updates = {
          lastEmailSentAt: now,
          followUpCount: (c.followUpCount || 0) + (isInitial ? 0 : 1),
          status: "contacted",
        };
        if (!c.firstEmailSentAt) updates.firstEmailSentAt = now;
        await MarketingContact.updateOne({ _id: c._id }, { $set: updates });
        sent++;
      } else {
        errors.push({ email: c.email, error: result.error });
      }
    }

    return NextResponse.json({
      ok: true,
      sent,
      total: toSend.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (err) {
    console.error("Marketing send-batch error:", err);
    return NextResponse.json({ error: err.message || "Send failed" }, { status: 500 });
  }
}
