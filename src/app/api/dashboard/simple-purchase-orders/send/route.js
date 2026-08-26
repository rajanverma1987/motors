import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveOutboundFromPreview, withDashboardOutboundEmailFooter } from "@/lib/customer-facing-email-content";
import { clampString } from "@/lib/validation";
import { parseCcEmailList } from "@/lib/send-document-custom-message";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { isValidSimplePortalId } from "@/lib/simple-portal-mongo";
import { buildPoVendorAddressesEmailBlock } from "@/lib/accounts-display";
import { resolveShopEmailLogo } from "@/lib/shop-email-logo";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { shopEmailLogoInlineStyle } from "@/lib/logo-document-scale";
import {
  buildPurchaseOrderPdfBuffer,
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

/** Preview meta for Simple portal Send To Vendor (localStorage POs). */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const toEmail = String(searchParams.get("toEmail") || "").trim();
    const toName = String(searchParams.get("toName") || "").trim();
    const documentLabel = String(searchParams.get("documentLabel") || "").trim() || "Purchase order";
    if (!toEmail) {
      return NextResponse.json(
        { error: "Vendor has no email address. Add an email to the vendor record." },
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
    console.error("Simple PO send preview:", err);
    return NextResponse.json({ error: err.message || "Failed to load preview" }, { status: 500 });
  }
}

/** Email vendor for a Simple portal purchase order. */
export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "simple-po-send", 20);
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
    const poNumber = String(body?.poNumber || "").trim();
    const documentLabel =
      String(body?.documentLabel || "").trim() || (poNumber ? `PO ${poNumber}` : "Purchase order");
    if (!toEmail) {
      return NextResponse.json({ error: "Vendor email is required." }, { status: 400 });
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
    const addressesHtml = buildPoVendorAddressesEmailBlock({
      billingAddress: uSettings.accountsBillingAddress,
      shippingAddress: uSettings.accountsShippingAddress,
    });
    const noteHtml = customMessage
      ? `<p style="white-space:pre-wrap;margin:12px 0">${esc(customMessage)}</p>`
      : "";
    const logoStyle = shopEmailLogoInlineStyle(uSettings.logoDocumentScale);
    const logoHtml = shopLogo?.logoSrc
      ? `<p style="margin-top:16px"><img src="${esc(shopLogo.logoSrc)}" alt="" height="${logoStyle.heightPx}" style="${logoStyle.style}" /></p>`
      : "";
    const html = withDashboardOutboundEmailFooter(`
      <p>Hi${toName ? ` ${esc(toName)}` : ""},</p>
      <p>Please find your purchase order ${poNumber ? `(PO# ${esc(poNumber)})` : ""} from ${esc(shopCompanyName || "our shop")}. The purchase order is attached as a PDF.</p>
      ${noteHtml}
      <p>If you have questions, reply to this email or contact us.</p>
      ${addressesHtml || ""}
      ${logoHtml}
      <p style="margin-top:16px">— ${esc(shopCompanyName || "Our shop")}</p>
    `);
    const subject = `Purchase order ${poNumber || documentLabel} – ${shopCompanyName || "Motor Shop"}`;

    const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
    if (mail.error) {
      return NextResponse.json({ error: mail.error }, { status: 400 });
    }
    const transport = mail.transport || getTransporter();
    const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;
    const po = body?.po && typeof body.po === "object" ? body.po : null;
    const vendor = body?.vendor && typeof body.vendor === "object" ? body.vendor : null;
    if (!po) {
      return NextResponse.json({ error: "Purchase order details are required to attach the PDF." }, { status: 400 });
    }
    let pdfAttachment = null;
    try {
      const pdfBuffer = await buildPurchaseOrderPdfBuffer({
        po,
        vendor,
        shopName: shopCompanyName,
        ownerEmail: email,
        settings: uSettings,
      });
      pdfAttachment = pdfFileAttachment(safePdfFilename("PO", poNumber || documentLabel), pdfBuffer);
    } catch (pdfErr) {
      console.error("Simple PO PDF attach error:", pdfErr);
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
      ...(mergeMailAttachments(shopLogo?.attachments, pdfAttachment).length
        ? { attachments: mergeMailAttachments(shopLogo?.attachments, pdfAttachment) }
        : {}),
    });

    const poId = String(body?.poId || po?.id || "").trim();
    if (poId && isValidSimplePortalId(poId)) {
      await SimplePurchaseOrder.findOneAndUpdate(
        { _id: poId, createdByEmail: email },
        { $set: { sentToVendorAt: new Date(), sentToVendorEmail: toEmail } }
      );
    }

    return NextResponse.json({ ok: true, message: "Email sent to vendor." });
  } catch (err) {
    console.error("Simple PO send error:", err);
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 500 });
  }
}
