import { normalizeWorkspaceSmtpFields } from "@/lib/workspace-smtp-fields";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER } from "@/lib/quote-document-labels";
import { shopEmailLogoInlineStyle } from "@/lib/logo-document-scale";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { emailBodyHasText, isRichEmailHtml, sanitizeRichEmailHtml } from "@/lib/send-document-email-body";

const platformFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || "3PhaseFlow";

/** @param {unknown} v */
export function escapeEmailHtml(v) {
  return v == null
    ? ""
    : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Subtle marketing footer for dashboard outbound emails (Send to customer / vendor / shipping).
 * Kept small so it does not compete with the shop signature.
 */
export function dashboardOutboundEmailMarketingFooterHtml() {
  const site = escapeEmailHtml(getPublicSiteUrl());
  return `<div style="margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;text-align:center"><a href="${site}" style="font-size:11px;line-height:1.4;color:#9ca3af;text-decoration:underline" target="_blank" rel="noopener noreferrer">By 3PhaseFlow</a></div>`;
}

/** @param {string} bodyHtml */
export function withDashboardOutboundEmailFooter(bodyHtml) {
  return `${String(bodyHtml || "")}${dashboardOutboundEmailMarketingFooterHtml()}`;
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

function logoBlock(logoSrc, signature, scale) {
  const src = typeof logoSrc === "string" ? logoSrc.trim() : "";
  const isHttp = src.startsWith("http://") || src.startsWith("https://");
  const isData = src.startsWith("data:image/");
  const isCid = src.startsWith("cid:");
  if (!isHttp && !isData && !isCid) return "";
  const { heightPx, maxWidthPx, style } = shopEmailLogoInlineStyle(scale);
  return `<p style="margin-top:20px;margin-bottom:8px"><img src="${escapeEmailHtml(src)}" alt="${signature}" height="${heightPx}" width="${maxWidthPx}" style="${style}" /></p>`;
}

/** Optional note from shop, plain text, newlines preserved. */
export function formatCustomEmailMessageHtml(message) {
  const text = String(message ?? "").trim();
  if (!text) return "";
  return text
    .split(/\r?\n/)
    .map((line) => {
      const inner = escapeEmailHtml(line);
      return `<p style="margin:0 0 8px">${inner || "&nbsp;"}</p>`;
    })
    .join("");
}

const SIGN_OFF_LINE = /^(?:[—–-]|,)\s+\S/;

/** Last line starting with — or a comma is the signature, so links and the logo can sit above it. */
export function splitEmailSignOff(text) {
  const lines = String(text || "").replace(/\s+$/u, "").split(/\n/);
  let index = lines.length - 1;
  while (index >= 0 && !lines[index].trim()) index -= 1;
  if (index < 0) return { body: "", signOff: "" };
  const last = lines[index].trim();
  if (!SIGN_OFF_LINE.test(last)) return { body: String(text || "").trim(), signOff: "" };
  return { body: lines.slice(0, index).join("\n").trim(), signOff: last };
}

/** Pull a trailing "— Shop" paragraph out of editor HTML so the link and logo stay above it. */
function splitHtmlSignOff(html) {
  const match = String(html || "").match(/<(p|div)>([\s\S]*?)<\/\1>\s*$/i);
  if (!match) return { body: html, signOffHtml: "" };
  const text = match[2].replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim();
  if (!SIGN_OFF_LINE.test(text)) return { body: html, signOffHtml: "" };
  return {
    body: html.slice(0, match.index).trim(),
    signOffHtml: `<p style="margin-top:16px">${match[2]}</p>`,
  };
}

/**
 * Editable prose, then generated extras (button, addresses, logo), then the sign-off.
 * Rich-text HTML from the send window is sanitized and kept. Plain text is still escaped.
 * @param {string} prose
 * @param {string} [extrasHtml]
 */
export function composeEditableEmailHtml(prose, extrasHtml = "") {
  const raw = String(prose || "").trim();
  if (isRichEmailHtml(raw)) {
    const safe = sanitizeRichEmailHtml(raw);
    const { body, signOffHtml } = splitHtmlSignOff(safe);
    return withDashboardOutboundEmailFooter(`${body}${extrasHtml || ""}${signOffHtml}`);
  }
  const { body, signOff } = splitEmailSignOff(raw);
  const sign = signOff
    ? `<p style="margin-top:16px">${escapeEmailHtml(signOff)}</p>`
    : "";
  return withDashboardOutboundEmailFooter(
    `${formatCustomEmailMessageHtml(body)}${extrasHtml || ""}${sign}`
  );
}

/** @param {{ customerName?: string, rfqNumber?: string, respondUrl: string, shopCompanyName?: string, logoSrc?: string, accountsEmailBlock?: string, customMessage?: string }} opts */
export function buildQuoteToCustomerEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Electric Motor Shop";
  const rfqNumber = opts.rfqNumber;
  const signature = escapeEmailHtml(shopName);
  const subject = `Your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} ${escapeEmailHtml(rfqNumber) || "is ready"} to ${signature}`;
  const accounts =
    typeof opts.accountsEmailBlock === "string" && opts.accountsEmailBlock.trim() ? opts.accountsEmailBlock : "";
  const button = `<p><a href="${escapeEmailHtml(opts.respondUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} &amp; respond</a></p>`;
  const prose = emailBodyHasText(opts.customMessage) ? String(opts.customMessage).trim() : "";
  if (!prose) {
    const html = withDashboardOutboundEmailFooter(`
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} ${rfqNumber ? `(RFQ# ${escapeEmailHtml(rfqNumber)})` : ""} is ready for your review.</p>
    <p><strong>View your ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} and approve or reject it here:</strong></p>
    ${button}
    <p>You can also print or save the ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER} as PDF from that page.</p>
    ${accounts}
    ${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}
    <p style="margin-top:16px">,  ${signature}</p>
  `);
    return { subject, html, shopName };
  }
  const html = composeEditableEmailHtml(
    prose,
    `${button}${accounts}${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}`
  );
  return { subject, html, shopName };
}

/** @param {{ customerName?: string, invoiceNumber?: string, shopCompanyName?: string, viewUrl?: string, totalFormatted?: string, summaryHtml?: string, logoSrc?: string, accountsEmailBlock?: string, customMessage?: string }} opts */
export function buildInvoiceToCustomerEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Electric Motor Shop";
  const invNo = escapeEmailHtml(opts.invoiceNumber) || ", ";
  const signature = escapeEmailHtml(shopName);
  const subject = `Invoice ${invNo} to ${signature}`;
  const accountsBlock =
    typeof opts.accountsEmailBlock === "string" && opts.accountsEmailBlock.trim() ? opts.accountsEmailBlock : "";
  const viewUrl = typeof opts.viewUrl === "string" ? opts.viewUrl.trim() : "";
  const prose = emailBodyHasText(opts.customMessage) ? String(opts.customMessage).trim() : "";

  if (viewUrl) {
    const button = `<p><a href="${escapeEmailHtml(viewUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View invoice</a></p>`;
    if (prose) {
      const html = composeEditableEmailHtml(
        prose,
        `${button}${accountsBlock}${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}`
      );
      return { subject, html, shopName };
    }
    const html = withDashboardOutboundEmailFooter(`
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Your invoice <strong>#${invNo}</strong> from ${signature} is ready.</p>
    <p><strong>View and print your invoice here:</strong></p>
    ${button}
    <p>You can print or save the invoice as PDF from that page.</p>
    ${accountsBlock}
    <p style="margin-top:16px">If you have questions, reply to this email or contact us directly.</p>
    ${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}
    <p style="margin-top:16px">,  ${signature}</p>
  `);
    return { subject, html, shopName };
  }

  const totalLine = opts.totalFormatted
    ? `<p><strong>Amount due:</strong> ${escapeEmailHtml(opts.totalFormatted)}</p>`
    : "";
  const notesBlock = opts.summaryHtml
    ? `<div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px">${opts.summaryHtml}</div>`
    : "";
  if (prose) {
    const html = composeEditableEmailHtml(
      prose,
      `${totalLine}${notesBlock}${accountsBlock}${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}`
    );
    return { subject, html, shopName };
  }
  const html = withDashboardOutboundEmailFooter(`
    <p>Hi${opts.customerName ? ` ${escapeEmailHtml(opts.customerName)}` : ""},</p>
    <p>Please find your invoice <strong>#${invNo}</strong> from ${signature}.</p>
    ${totalLine}
    ${notesBlock}
    ${accountsBlock}
    <p style="margin-top:16px">If you have questions, reply to this email or contact us directly.</p>
    ${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}
    <p style="margin-top:16px">,  ${signature}</p>
  `);
  return { subject, html, shopName };
}

/** @param {{ vendorName?: string, poNumber?: string, viewUrl: string, shopCompanyName?: string, logoSrc?: string, poVendorAddressesHtml?: string, customMessage?: string }} opts */
export function buildPoToVendorEmailContent(opts) {
  const shopName = opts.shopCompanyName && String(opts.shopCompanyName).trim() ? opts.shopCompanyName.trim() : "Electric Motor Shop";
  const poNumber = opts.poNumber;
  const signature = escapeEmailHtml(shopName);
  const subject = `Purchase order ${escapeEmailHtml(poNumber) || ""} to ${shopName}`;
  const addresses =
    typeof opts.poVendorAddressesHtml === "string" && opts.poVendorAddressesHtml.trim()
      ? opts.poVendorAddressesHtml
      : "";
  const button = `<p><a href="${escapeEmailHtml(opts.viewUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">View purchase order</a></p>`;
  const prose = emailBodyHasText(opts.customMessage) ? String(opts.customMessage).trim() : "";
  if (prose) {
    const html = composeEditableEmailHtml(
      prose,
      `${button}${addresses}${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}`
    );
    return { subject, html, shopName };
  }
  const html = withDashboardOutboundEmailFooter(`
    <p>Hi${opts.vendorName ? ` ${escapeEmailHtml(opts.vendorName)}` : ""},</p>
    <p>Please find your purchase order ${poNumber ? `(PO# ${escapeEmailHtml(poNumber)})` : ""} from ${signature}.</p>
    <p><strong>View, print, and update delivery status for each line item here:</strong></p>
    ${button}
    <p>You can print the PO from that page and mark line items as Dispatch when shipped.</p>
    ${addresses}
    ${logoBlock(opts.logoSrc, signature, opts.logoDocumentScale)}
    <p style="margin-top:16px">,  ${signature}</p>
  `);
  return { subject, html, shopName };
}
