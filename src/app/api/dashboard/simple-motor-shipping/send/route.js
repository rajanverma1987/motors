import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { clampString } from "@/lib/validation";
import { parseCcEmailList } from "@/lib/send-document-custom-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import { resolveShopEmailLogo } from "@/lib/shop-email-logo";
import { getPublicSiteUrl } from "@/lib/public-site-url";

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

function row(label, value) {
  const v = String(value || "").trim();
  if (!v) return "";
  return `<tr><td style="padding:4px 12px 4px 0;vertical-align:top;color:#555">${esc(label)}</td><td style="padding:4px 0;font-weight:600">${esc(v)}</td></tr>`;
}

/** Preview meta for Simple portal Motor Shipping Send to. */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const toEmail = String(searchParams.get("toEmail") || "").trim();
    const toName = String(searchParams.get("toName") || "").trim();
    const documentLabel = String(searchParams.get("documentLabel") || "").trim() || "Motor shipping";
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
    console.error("Simple motor shipping send preview:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email customer for a Simple portal motor shipping notice. */
export async function POST(request) {
  const { allowed } = checkRateLimit(request, "simple-motor-shipping-send", 20);
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
    const entry = body?.entry && typeof body.entry === "object" ? body.entry : {};
    const invoiceNumber = String(entry.invoiceNumber || body?.invoiceNumber || "").trim();
    const documentLabel =
      String(body?.documentLabel || "").trim() ||
      (invoiceNumber ? `Motor shipping ${invoiceNumber}` : "Motor shipping");
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

    const baseUrl = getPublicSiteUrl(request);
    const shopLogo = resolveShopEmailLogo({
      ownerEmail: email,
      logoUrl: uSettings.logoUrl,
      baseUrl,
    });
    const noteHtml = customMessage
      ? `<p style="white-space:pre-wrap;margin:12px 0">${esc(customMessage)}</p>`
      : "";
    const logoHtml = shopLogo?.logoSrc
      ? `<p style="margin-top:16px"><img src="${esc(shopLogo.logoSrc)}" alt="" style="max-height:48px" /></p>`
      : "";
    const detailsHtml = `
      <table style="border-collapse:collapse;margin:12px 0;font-size:14px">
        ${row("Invoice #", invoiceNumber)}
        ${row("PO Number", entry.shippingPo)}
        ${row("Date", entry.date)}
        ${row("Transport", entry.mannerOfTransport)}
        ${row("Freight", entry.freight)}
        ${row("Picked by", entry.pickedBy)}
        ${row("Charges", entry.charges)}
        ${row("Paid By", entry.paidByLabel || entry.paidBy)}
        ${row("Notes", entry.notes)}
      </table>
    `;
    const html = `
      <p>Hi${toName ? ` ${esc(toName)}` : ""},</p>
      <p>Please find motor shipping details${invoiceNumber ? ` for ${esc(invoiceNumber)}` : ""} from ${esc(shopCompanyName || "our shop")}.</p>
      ${noteHtml}
      ${detailsHtml}
      <p>If you have questions, reply to this email or contact us.</p>
      ${logoHtml}
      <p style="margin-top:16px">— ${esc(shopCompanyName || "Our shop")}</p>
    `;
    const subject = `${documentLabel} – ${shopCompanyName || "Motor Shop"}`;

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;
    await transport.sendMail({
      from,
      to: toEmail,
      subject,
      html,
      ...(ccEmails.length ? { cc: ccEmails } : {}),
      ...(Array.isArray(shopLogo?.attachments) && shopLogo.attachments.length
        ? { attachments: shopLogo.attachments }
        : {}),
    });

    return NextResponse.json({ ok: true, message: "Email sent." });
  } catch (err) {
    console.error("Simple motor shipping send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
