import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview, withDashboardOutboundEmailFooter } from "@/lib/customer-facing-email-content";
import { clampString } from "@/lib/validation";
import { parseCcEmailList } from "@/lib/send-document-custom-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import {
  buildQuoteInvoicePdfBuffer,
  mergeMailAttachments,
  pdfFileAttachment,
  safePdfFilename,
} from "@/lib/simple-send-document-pdf";

function esc(v) {
  return v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

/** Preview meta for Simple portal Send To Customer (no Classic document id). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const toEmail = String(searchParams.get("toEmail") || "").trim();
    const toName = String(searchParams.get("toName") || "").trim();
    const documentLabel = String(searchParams.get("documentLabel") || "").trim() || "Service proposal";
    if (!toEmail) {
      return NextResponse.json(
        { error: "Customer has no email address. Add an email to the customer record." },
        { status: 400 }
      );
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);

    return NextResponse.json({
      ok: true,
      preview: {
        toEmail,
        toName,
        from: resolveOutboundFromPreview(uSettings, shopCompanyName),
        documentLabel,
        smtp: getWorkspaceSmtpDeliveryNotice(uSettings),
      },
    });
  } catch (err) {
    console.error("Simple SP send preview:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email customer for a Simple portal service proposal / invoice. */
export async function POST(request) {
  const { allowed } = checkRateLimit(request, "simple-sp-send", 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many send requests. Try again later." }, { status: 429 });
  }
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const customMessage = clampString(body?.customMessage, 2000);
    const { ccEmails, error: ccError } = parseCcEmailList(body?.cc);
    if (ccError) {
      return NextResponse.json({ error: ccError }, { status: 400 });
    }
    const toEmail = String(body?.toEmail || "").trim();
    const toName = String(body?.toName || "").trim();
    const documentLabel = String(body?.documentLabel || "").trim() || "Service proposal";
    const documentType = String(body?.documentType || "quote").trim().toLowerCase();
    if (!toEmail) {
      return NextResponse.json({ error: "Customer email is required." }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
    const uSettings = mergeUserSettings(settingsDoc?.settings);
    const shopCompanyName = shopCompanyNameFromUser(user);
    const smtpNotice = getWorkspaceSmtpDeliveryNotice(uSettings);
    if (smtpNotice.canSend === false) {
      return NextResponse.json({ error: smtpNotice.message || "SMTP is not configured." }, { status: 400 });
    }

    const noteHtml = customMessage
      ? `<p style="white-space:pre-wrap;margin:12px 0">${esc(customMessage)}</p>`
      : "";
    const kind = documentType === "invoice" ? "invoice" : "quote";
    const kindLabel = kind === "invoice" ? "invoice" : "service proposal";
    const html = withDashboardOutboundEmailFooter(`
      <p>Hello${toName ? ` ${esc(toName)}` : ""},</p>
      <p>Please review your ${esc(kindLabel)} <strong>${esc(documentLabel)}</strong>. The document is attached as a PDF.</p>
      ${noteHtml}
      <p>If you have questions, reply to this email or contact us.</p>
      <p>— ${esc(shopCompanyName || "Our shop")}</p>
    `);
    const subject = `${shopCompanyName || "Shop"}: ${documentLabel}`;

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;

    const invoicePayload = body?.invoicePayload && typeof body.invoicePayload === "object" ? body.invoicePayload : null;
    const quoteDoc = body?.quote && typeof body.quote === "object" ? body.quote : null;
    const sourceDoc = kind === "invoice" ? invoicePayload?.invoice || invoicePayload : quoteDoc;
    if (!sourceDoc || typeof sourceDoc !== "object") {
      return NextResponse.json({ error: "Document details are required to attach the PDF." }, { status: 400 });
    }
    let pdfAttachment = null;
    try {
        const pdfBuffer = await buildQuoteInvoicePdfBuffer({
          kind,
          doc: sourceDoc,
          extras: kind === "invoice" ? invoicePayload || {} : quoteDoc || {},
          shopName: shopCompanyName,
          ownerEmail: email,
          settings: uSettings,
        });
        const numberLabel =
          kind === "invoice"
            ? sourceDoc.invoiceNumber || sourceDoc.rfqNumber || documentLabel
            : sourceDoc.rfqNumber || sourceDoc.invoiceNumber || documentLabel;
        pdfAttachment = pdfFileAttachment(
          safePdfFilename(kind === "invoice" ? "Invoice" : "Service-Proposal", numberLabel),
          pdfBuffer
        );
    } catch (pdfErr) {
      console.error("Simple SP PDF attach error:", pdfErr);
      return NextResponse.json({ error: "Could not generate the PDF attachment." }, { status: 500 });
    }
    if (!pdfAttachment) {
      return NextResponse.json({ error: "Could not generate the PDF attachment." }, { status: 500 });
    }

    await transport.sendMail({
      from,
      to: toEmail,
      subject,
      html,
      ...(ccEmails.length ? { cc: ccEmails } : {}),
      ...(pdfAttachment ? { attachments: mergeMailAttachments(pdfAttachment) } : {}),
    });

    return NextResponse.json({ ok: true, message: "Email sent." });
  } catch (err) {
    console.error("Simple SP send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
