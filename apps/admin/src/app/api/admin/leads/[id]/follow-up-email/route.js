import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { getListingNotifyEmailsIncludingCrmLogin } from "@/lib/listing-notify-emails";
import { sendMarketingEmail } from "@/lib/email";
import {
  buildLeadShopFollowUpDraft,
  buildLeadCustomerFollowUpDraft,
  plainTextEmailBodyToHtml,
} from "@/lib/lead-shop-follow-up-email";

async function loadLeadAndShops(leadId) {
  if (!mongoose.isValidObjectId(leadId)) return { error: "Invalid lead id", status: 400 };
  await connectDB();
  const lead = await Lead.findById(leadId).lean();
  if (!lead) return { error: "Lead not found", status: 404 };

  const assigned = (lead.assignedListingIds || []).map((id) => String(id || "").trim()).filter(Boolean);
  const sourceId = lead.sourceListingId ? String(lead.sourceListingId).trim() : "";
  const listingIds = [...new Set([...(assigned.length ? assigned : sourceId ? [sourceId] : [])])].filter(
    (id) => mongoose.isValidObjectId(id)
  );

  if (listingIds.length === 0) {
    return {
      error: "No shop is assigned to this lead. Assign a shop before sending a follow-up email.",
      status: 400,
      lead,
      shops: [],
    };
  }

  const listings = await Listing.find({ _id: { $in: listingIds }, status: "approved" })
    .select("_id email companyName notificationEmails crmUserId")
    .lean();

  const shops = [];
  const emailSet = new Set();
  for (const listing of listings) {
    const emails = await getListingNotifyEmailsIncludingCrmLogin(listing);
    for (const e of emails) emailSet.add(e);
    shops.push({
      id: listing._id.toString(),
      companyName: listing.companyName || "",
      emails,
    });
  }

  return {
    lead: { ...lead, id: lead._id.toString(), _id: undefined },
    shops,
    toEmails: [...emailSet],
  };
}

function parseRecipientList(rawTo, { label, max = 15 }) {
  const recipients = [
    ...new Set(
      String(rawTo || "")
        .split(/[,;]+/)
        .map((s) => clampString(s, LIMITS.email.max).trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  if (recipients.length === 0) {
    return { error: `${label}: at least one recipient email is required.` };
  }
  if (recipients.length > max) {
    return { error: `${label}: too many recipients (max ${max}).` };
  }
  for (const email of recipients) {
    if (!isValidEmail(email)) {
      return { error: `${label}: invalid email ${email}` };
    }
  }
  return { recipients };
}

async function sendToRecipients(recipients, subject, textBody) {
  const html = plainTextEmailBodyToHtml(textBody);
  const sent = [];
  const failed = [];
  for (const to of recipients) {
    const result = await sendMarketingEmail(to, subject, html);
    if (result?.ok === false) {
      failed.push({ to, error: result.error || "Send failed" });
    } else {
      sent.push(to);
    }
  }
  return { sent, failed };
}

/** GET: prefilled shop + lead follow-up drafts. */
export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    const loaded = await loadLeadAndShops(id);
    if (loaded.error && (!loaded.lead || loaded.status === 404 || loaded.status === 400)) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status || 400 });
    }

    const shopNames = loaded.shops.map((s) => s.companyName).filter(Boolean);
    const shopDraft = buildLeadShopFollowUpDraft({ lead: loaded.lead, shopNames });
    const leadDraft = buildLeadCustomerFollowUpDraft({ lead: loaded.lead, shopNames });
    const leadEmail = String(loaded.lead?.email || "").trim();

    const warnings = [];
    if (!loaded.toEmails?.length) {
      warnings.push("Assigned shop(s) have no login or notification email on file. Add shop recipients manually.");
    }
    if (!leadEmail || !isValidEmail(leadEmail)) {
      warnings.push("This lead has no valid email. Add a lead recipient manually.");
    }

    return NextResponse.json({
      shop: {
        to: (loaded.toEmails || []).join(", "),
        subject: shopDraft.subject,
        body: shopDraft.body,
      },
      lead: {
        to: leadEmail && isValidEmail(leadEmail) ? leadEmail : "",
        subject: leadDraft.subject,
        body: leadDraft.body,
      },
      shopNames,
      dateLabel: shopDraft.dateLabel,
      warning: warnings.length ? warnings.join(" ") : null,
    });
  } catch (err) {
    console.error("Admin lead follow-up email draft error:", err);
    return NextResponse.json({ error: err.message || "Failed to build email" }, { status: 500 });
  }
}

/**
 * POST: send shop follow-up and lead follow-up at the same time.
 * Body: { shop: { to, subject, body }, lead: { to, subject, body } }
 */
export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "admin-lead-follow-up-email", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many emails. Try again later." }, { status: 429 });
  }

  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid lead id" }, { status: 400 });
    }

    await connectDB();
    const lead = await Lead.findById(id).select("_id").lean();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const shop = body.shop || {};
    const leadMail = body.lead || {};

    // Backward compatible if old single-email payload is sent
    const shopPayload = body.shop
      ? shop
      : { to: body.to, subject: body.subject, body: body.body };

    const shopSubject = clampString(shopPayload.subject, 200).trim();
    const shopBody = clampString(shopPayload.body, 8000).trim();
    const leadSubject = clampString(leadMail.subject, 200).trim();
    const leadBody = clampString(leadMail.body, 8000).trim();

    if (!shopSubject || !shopBody) {
      return NextResponse.json({ error: "Shop email subject and body are required." }, { status: 400 });
    }
    if (!leadSubject || !leadBody) {
      return NextResponse.json({ error: "Lead email subject and body are required." }, { status: 400 });
    }

    const shopParsed = parseRecipientList(shopPayload.to, { label: "Shop email" });
    if (shopParsed.error) {
      return NextResponse.json({ error: shopParsed.error }, { status: 400 });
    }
    const leadParsed = parseRecipientList(leadMail.to, { label: "Lead email", max: 5 });
    if (leadParsed.error) {
      return NextResponse.json({ error: leadParsed.error }, { status: 400 });
    }

    const [shopResult, leadResult] = await Promise.all([
      sendToRecipients(shopParsed.recipients, shopSubject, shopBody),
      sendToRecipients(leadParsed.recipients, leadSubject, leadBody),
    ]);

    const sent = [
      ...shopResult.sent.map((to) => ({ to, audience: "shop" })),
      ...leadResult.sent.map((to) => ({ to, audience: "lead" })),
    ];
    const failed = [
      ...shopResult.failed.map((f) => ({ ...f, audience: "shop" })),
      ...leadResult.failed.map((f) => ({ ...f, audience: "lead" })),
    ];

    const shopOk = shopResult.sent.length > 0;
    const leadOk = leadResult.sent.length > 0;

    if (!shopOk && !leadOk) {
      return NextResponse.json(
        { error: failed[0]?.error || "Failed to send emails", failed },
        { status: 500 }
      );
    }

    if (!shopOk || !leadOk) {
      const missing = !shopOk ? "shop" : "lead";
      return NextResponse.json({
        ok: true,
        partial: true,
        sent,
        failed,
        message: `Partial send: ${missing} email failed. Sent ${sent.length} message${sent.length === 1 ? "" : "s"}.`,
      });
    }

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      message: `Sent shop follow-up (${shopResult.sent.length}) and lead follow-up (${leadResult.sent.length}).`,
    });
  } catch (err) {
    console.error("Admin lead follow-up email send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
