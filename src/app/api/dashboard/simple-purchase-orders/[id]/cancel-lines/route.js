import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import Vendor from "@/models/Vendor";
import UserSettings from "@/models/UserSettings";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import {
  isValidSimplePortalId,
  sanitizeSimplePortalPayload,
  serializeSimplePortalDoc,
} from "@/lib/simple-portal-mongo";
import { mergeUserSettings } from "@/lib/user-settings";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import { getTransporter } from "@/lib/email-transport";
import { buildPoVendorAddressesEmailBlock } from "@/lib/accounts-display";
import { resolveShopEmailLogo } from "@/lib/shop-email-logo";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { shopEmailLogoInlineStyle } from "@/lib/logo-document-scale";
import { withDashboardOutboundEmailFooter } from "@/lib/customer-facing-email-content";
import { parseCcEmailList } from "@/lib/send-document-custom-message";
import { clampString } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildPurchaseOrderPdfBuffer,
  mergeMailAttachments,
  pdfFileAttachment,
  safePdfFilename,
} from "@/lib/simple-send-document-pdf";
import {
  canCancelPoLine,
  isPoLineCancelled,
  isPoLineInactive,
  poLineHasContent,
  poWasSentToVendor,
  SIMPLE_PO_RECEIVING_STATUS_CANCELLED,
} from "@/lib/simple-purchase-order-form";
import {
  buildPoCancellationVendorEmailHtml,
  buildPoCancellationVendorEmailSubject,
  poFormWithActiveLinesOnly,
} from "@/lib/simple-po-vendor-notify";
import { buildSimplePurchaseOrderPrintPayload } from "@/lib/simple-purchase-order-print";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function shopCompanyNameFromUser(user) {
  return (user.shopName && String(user.shopName).trim()) || process.env.MOTOR_SHOP_COMPANY_NAME?.trim() || "";
}

export async function POST(request, context) {
  const { allowed } = await checkRateLimit(request, "simple-po-cancel", 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const lineIds = Array.isArray(body?.lineIds)
      ? body.lineIds.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    if (!lineIds.length) {
      return NextResponse.json({ error: "Select at least one line to cancel." }, { status: 400 });
    }

    const reason = clampString(body?.reason, 500);
    const customMessage = clampString(body?.customMessage, 2000);
    const notifyVendor = Boolean(body?.notifyVendor);

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const doc = await SimplePurchaseOrder.findOne({ _id: id, createdByEmail: email }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const lineItems = Array.isArray(doc.lineItems) ? [...doc.lineItems] : [];
    let changed = 0;
    for (const line of lineItems) {
      const lid = String(line?.id || "").trim();
      if (!lid || !lineIds.includes(lid) || !poLineHasContent(line)) continue;
      if (!canCancelPoLine(line)) continue;
      line.cancelled = true;
      line.cancelledAt = now;
      line.cancellationReason = reason;
      line.receivingStatus = SIMPLE_PO_RECEIVING_STATUS_CANCELLED;
      changed += 1;
    }

    if (!changed) {
      return NextResponse.json(
        { error: "No eligible lines to cancel. Only items with status Ordered can be cancelled." },
        { status: 400 }
      );
    }

    const activeLines = lineItems.filter((l) => poLineHasContent(l) && !isPoLineInactive(l));
    const entirePo = activeLines.length === 0;
    const cancelledLines = lineItems.filter((l) => isPoLineCancelled(l) && poLineHasContent(l));

    const update = {
      ...sanitizeSimplePortalPayload(doc),
      lineItems,
      poCancelledAt: entirePo ? now : "",
    };

    const updated = await SimplePurchaseOrder.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = serializeSimplePortalDoc(updated);

    if (notifyVendor && poWasSentToVendor(doc)) {
      const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
      const uSettings = mergeUserSettings(settingsDoc?.settings);
      const smtpNotice = getWorkspaceSmtpDeliveryNotice(uSettings);
      if (smtpNotice.canSend === false) {
        return NextResponse.json({
          ok: true,
          item,
          warning: smtpNotice.message || "Lines cancelled but email was not sent (SMTP not configured).",
        });
      }

      const vendorId = String(updated.vendorId || "").trim();
      const vendor = vendorId
        ? await Vendor.findOne({ _id: vendorId, createdByEmail: email }).lean()
        : null;

      const toEmail = String(doc.sentToVendorEmail || vendor?.email || "").trim();
      if (!toEmail) {
        return NextResponse.json({
          ok: true,
          item,
          warning: "Lines cancelled but vendor email is missing.",
        });
      }

      const shopCompanyName = shopCompanyNameFromUser(user);
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
      const logoStyle = shopEmailLogoInlineStyle(uSettings.logoDocumentScale);
      const logoHtml = shopLogo?.logoSrc
        ? `<p style="margin-top:16px"><img src="${shopLogo.logoSrc.replace(/"/g, "&quot;")}" alt="" height="${logoStyle.heightPx}" style="${logoStyle.style}" /></p>`
        : "";

      const revisedForm = entirePo ? null : poFormWithActiveLinesOnly(item);
      const htmlInner = buildPoCancellationVendorEmailHtml({
        shopCompanyName,
        poNumber: item.poNumber,
        toName: vendor?.contactName || vendor?.name || "",
        reason,
        customMessage,
        cancelledLines,
        entirePo,
        revisedPo: revisedForm,
        addressesHtml,
        logoHtml,
      });

      const subject = buildPoCancellationVendorEmailSubject({
        entirePo,
        poNumber: item.poNumber,
        shopCompanyName,
      });

      const mail = resolveCustomerMailDelivery(uSettings, shopCompanyName);
      if (mail.error) {
        return NextResponse.json({
          ok: true,
          item,
          warning: mail.error || "Lines cancelled but email could not be sent.",
        });
      }

      const transport = mail.transport || getTransporter();
      const from = mail.from || process.env.EMAIL_FROM || process.env.SMTP_USER;

      let pdfAttachment = null;
      if (!entirePo && revisedForm) {
        const vendorRow = vendor || { name: item.vendorName };
        const { po: printPo } = buildSimplePurchaseOrderPrintPayload({
          form: revisedForm,
          vendor: vendorRow,
          accountSettings: uSettings,
          user,
        });
        const pdfBuffer = await buildPurchaseOrderPdfBuffer({
          po: printPo,
          vendor: vendorRow,
          shopName: shopCompanyName,
          ownerEmail: email,
          settings: uSettings,
        });
        pdfAttachment = pdfFileAttachment(
          safePdfFilename("PO-revised", item.poNumber || "purchase-order"),
          pdfBuffer
        );
      }

      const { ccEmails, error: ccError } = parseCcEmailList(body?.cc);
      if (ccError) {
        return NextResponse.json({ error: ccError }, { status: 400 });
      }

      await transport.sendMail({
        from,
        to: toEmail,
        subject,
        html: withDashboardOutboundEmailFooter(htmlInner),
        ...(ccEmails.length ? { cc: ccEmails } : {}),
        ...(mergeMailAttachments(shopLogo?.attachments, pdfAttachment).length
          ? { attachments: mergeMailAttachments(shopLogo?.attachments, pdfAttachment) }
          : {}),
      });
    }

    return NextResponse.json({ ok: true, item });
  } catch (err) {
    console.error("Simple PO cancel lines error:", err);
    return NextResponse.json({ error: err.message || "Failed to cancel lines" }, { status: 500 });
  }
}
