import { normalizeWorkspaceSmtpFields } from "@/lib/workspace-smtp-fields";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE, SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER } from "@/lib/quote-document-labels";

const platformFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || "IQMotorBase";

/** @param {unknown} v */
export function escapeEmailHtml(v) {
  return v == null
    ? ""
    : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** @param {object} mergedSettings @param {string} [shopCompanyName] */
export function resolveOutboundFromPreview(mergedSettings, shopCompanyName = "") {
  const smtp = normalizeWorkspaceSmtpFields(mergedSettings);
  if (smtp.smtpEnabled && smtp.smtpFromEmail) {
    const em = smtp.smtpFromEmail;
    const nm = (smtp.smtpFromName || shopCompanyName || "").trim().replace(/"/g, "'");
    if (nm) return `"${nm}" <${em}>`;
    return em;
  }
  return platformFrom;
}

function logoBlock(logoSrc, signature) {
  const src = typeof logoSrc === "string" ? logoSrc.trim() : "";
  const isHttp = src.startsWith("http://") || src.startsWith("https://");
  const isData = src.startsWith("data:image/");
  const isCid = src.startsWith("cid:");
  if (!isHttp && !isData && !isCid) return "";
  return `<p style="margin-top:20px;margin-bottom:8px"><img src="${escapeEmailHtml(src)}" alt="${signature}" width="160" style="max-width:160px;height:auto;display:block;border:0" /></p>`;
}

/** @param {{ customerName?: string, rfqNumber?: string, respondUrl: string, shopCompanyName?: string, logoSrc?: string, accountsEmailBlock?: string }} opts */
export function buildQuoteToCustomerEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Motor Shop";
  const rfqNumber = opts.rfqNumber;
  const signature = escapeEmailHtml(shopName);
  const subject = `Your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} ${escapeEmailHtml(rfqNumber) || "is ready"} – ${signature}`;
  const html = `
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} ${rfqNumber ? `(RFQ# ${escapeEmailHtml(rfqNumber)})` : ""} is ready for your review.</p>
    <p><strong>View your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} and approve or reject it here:</strong></p>
    <p><a href="${escapeEmailHtml(opts.respondUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} &amp; respond</a></p>
    <p>You can also print or save the ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} as PDF from that page.</p>
    ${typeof opts.accountsEmailBlock === "string" && opts.accountsEmailBlock.trim() ? opts.accountsEmailBlock : ""}
    ${logoBlock(opts.logoSrc, signature)}
    <p style="margin-top:16px">— ${signature}</p>
  `;
  return { subject, html, shopName };
}

/** @param {{ customerName?: string, invoiceNumber?: string, shopCompanyName?: string, viewUrl?: string, totalFormatted?: string, summaryHtml?: string, logoSrc?: string, accountsEmailBlock?: string }} opts */
export function buildInvoiceToCustomerEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Motor Shop";
  const invNo = escapeEmailHtml(opts.invoiceNumber) || "—";
  const signature = escapeEmailHtml(shopName);
  const subject = `Invoice ${invNo} – ${signature}`;
  const accountsBlock =
    typeof opts.accountsEmailBlock === "string" && opts.accountsEmailBlock.trim() ? opts.accountsEmailBlock : "";
  const viewUrl = typeof opts.viewUrl === "string" ? opts.viewUrl.trim() : "";

  if (viewUrl) {
    const html = `
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Your invoice <strong>#${invNo}</strong> from ${signature} is ready.</p>
    <p><strong>View and print your invoice here:</strong></p>
    <p><a href="${escapeEmailHtml(viewUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View invoice</a></p>
    <p>You can print or save the invoice as PDF from that page.</p>
    ${accountsBlock}
    <p style="margin-top:16px">If you have questions, reply to this email or contact us directly.</p>
    ${logoBlock(opts.logoSrc, signature)}
    <p style="margin-top:16px">— ${signature}</p>
  `;
    return { subject, html, shopName };
  }

  const totalLine = opts.totalFormatted
    ? `<p><strong>Amount due:</strong> ${escapeEmailHtml(opts.totalFormatted)}</p>`
    : "";
  const notesBlock = opts.summaryHtml
    ? `<div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px">${opts.summaryHtml}</div>`
    : "";
  const html = `
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Please find your invoice <strong>#${invNo}</strong> from ${signature}.</p>
    ${totalLine}
    ${notesBlock}
    ${accountsBlock}
    <p style="margin-top:16px">If you have questions, reply to this email or contact us directly.</p>
    ${logoBlock(opts.logoSrc, signature)}
    <p style="margin-top:16px">— ${signature}</p>
  `;
  return { subject, html, shopName };
}

/** @param {{ vendorName?: string, poNumber?: string, viewUrl: string, shopCompanyName?: string, logoSrc?: string, poVendorAddressesHtml?: string }} opts */
export function buildPoToVendorEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Motor Shop";
  const poNumber = opts.poNumber;
  const signature = escapeEmailHtml(shopName);
  const subject = `Purchase order ${escapeEmailHtml(poNumber) || ""} – ${shopName}`;
  const html = `
    <p>Hi${opts.vendorName ? ` ${escapeEmailHtml(opts.vendorName)}` : ""},</p>
    <p>Please find your purchase order ${poNumber ? `(PO# ${escapeEmailHtml(poNumber)})` : ""} from ${signature}.</p>
    <p><strong>View, print, and update delivery status for each line item here:</strong></p>
    <p><a href="${escapeEmailHtml(opts.viewUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View purchase order</a></p>
    <p>You can print the PO from that page and mark line items as Dispatch when shipped.</p>
    ${typeof opts.poVendorAddressesHtml === "string" && opts.poVendorAddressesHtml.trim() ? opts.poVendorAddressesHtml : ""}
    ${logoBlock(opts.logoSrc, signature)}
    <p style="margin-top:16px">— ${signature}</p>
  `;
  return { subject, html, shopName };
}
