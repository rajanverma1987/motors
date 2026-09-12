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
  mergeMailAttachments,
  pdfFileAttachment,
  safePdfFilename,
} from "@/lib/simple-send-document-pdf";
import { buildDatasheetPdfBuffer } from "@/lib/simple-datasheet-pdf";

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

/** Preview metadata for Simple portal Send Datasheet to Customer. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const toEmail = String(searchParams.get("toEmail") || "").trim();
    const toName = String(searchParams.get("toName") || "").trim();
    const motorType = String(searchParams.get("motorType") || "AC").toUpperCase();
    const documentLabel =
      String(searchParams.get("documentLabel") || "").trim() ||
      `${motorType} Motor Datasheet and Inspection Report`;

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
    console.error("Simple datasheet send preview error:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email customer the AC / DC datasheet and inspection report PDF via shop SMTP. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "simple-datasheet-send", 20);
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
    const motorType = String(body?.motorType || "AC").toUpperCase() === "DC" ? "DC" : "AC";
    const datasheet = body?.datasheet && typeof body.datasheet === "object" ? body.datasheet : {};
    const printContext = body?.printContext && typeof body.printContext === "object" ? body.printContext : {};
    const technicianLabel = String(body?.technicianLabel || "").trim();
    const jobDiagrams = Array.isArray(body?.jobDiagrams) ? body.jobDiagrams : [];
    const attachments = Array.isArray(body?.attachments) ? body.attachments : [];

    const docNumber = String(printContext.documentNumber || datasheet?.jobNumber || "").trim();
    const reportTitle = `${motorType} Motor Datasheet and Inspection Report`;

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
      return NextResponse.json({ error: smtpNotice.message || "Shop SMTP is not configured." }, { status: 400 });
    }

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;

    let pdfAttachment = null;
    try {
      const pdfBuffer = await buildDatasheetPdfBuffer({
        motorType,
        datasheet,
        printContext,
        technicianLabel,
        jobDiagrams,
        attachments,
        shopName: shopCompanyName,
        ownerEmail: email,
        settings: uSettings,
      });

      const filenameBase = `${motorType}-Datasheet-Report`;
      const fileLabel = docNumber || "Report";
      pdfAttachment = pdfFileAttachment(safePdfFilename(filenameBase, fileLabel), pdfBuffer);
    } catch (pdfErr) {
      console.error("Simple datasheet PDF generation error:", pdfErr);
      return NextResponse.json({ error: "Could not generate the datasheet PDF report." }, { status: 500 });
    }

    if (!pdfAttachment) {
      return NextResponse.json({ error: "Could not generate the datasheet PDF report." }, { status: 500 });
    }

    const noteHtml = customMessage
      ? `<p style="white-space:pre-wrap;margin:12px 0;background-color:#f8fafc;padding:12px;border-left:4px solid #0284c7;border-radius:4px;">${esc(customMessage)}</p>`
      : "";

    const html = withDashboardOutboundEmailFooter(`
      <p>Hello${toName ? ` ${esc(toName)}` : ""},</p>
      <p>Please review your <strong>${esc(reportTitle)}</strong>${docNumber ? ` for job <strong>${esc(docNumber)}</strong>` : ""}. The full inspection and test report is attached as a PDF.</p>
      ${noteHtml}
      <p>This report includes complete motor identification, winding data, electrical test readings, mechanical condition, and inspection notes.</p>
      <p>If you have questions regarding these test results or scope of work, please reply to this email or contact us.</p>
      <p style="margin-top:20px;font-weight:600;">${esc(shopCompanyName || "Our shop")}</p>
    `);

    const subject = docNumber
      ? `${shopCompanyName || "Shop"}: ${reportTitle} (${docNumber})`
      : `${shopCompanyName || "Shop"}: ${reportTitle}`;

    await transport.sendMail({
      from,
      to: toEmail,
      subject,
      html,
      ...(ccEmails.length ? { cc: ccEmails } : {}),
      attachments: mergeMailAttachments(pdfAttachment),
    });

    return NextResponse.json({ ok: true, message: "Report sent successfully." });
  } catch (err) {
    console.error("Simple datasheet send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send report" }, { status: 500 });
  }
}
