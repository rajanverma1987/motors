import { getTransporter } from "@/lib/email-transport";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getBrandLogoAbsoluteUrl } from "@/lib/brand-logo";
import { resolveCustomerMailDelivery } from "@/lib/workspace-smtp";
import {
  buildQuoteToCustomerEmailContent,
  buildInvoiceToCustomerEmailContent,
  buildPoToVendorEmailContent,
} from "@/lib/customer-facing-email-content";

const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "";
const marketingFrom = process.env.EMAIL_MARKETING_FROM || fromEmail;

function escHtmlEmail(v) {
  return v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Replace legacy motorswinding.com domain in outgoing email HTML (templates, env URLs, DB content). */
function sanitizeEmailBodyHtml(html) {
  if (!html) return html;
  return String(html)
    .replace(/(?:https?:\/\/)?(?:www\.)?motorswinding\.com/gi, (match) =>
      /^https?:\/\//i.test(match) ? "https://iqmotorbase.com" : "iqmotorbase.com"
    )
    .replace(/@(?:www\.)?motorswinding\.com/gi, "@iqmotorbase.com");
}

/** IQ Motorbase header for platform / admin emails (logo from `public/logo.png`). */
function wrapPlatformBrandedHtml(bodyHtml) {
  const site = getPublicSiteUrl();
  const logoUrl = getBrandLogoAbsoluteUrl();
  if (!logoUrl.startsWith("http")) return bodyHtml;
  const header = `<div style="margin:0 0 24px 0;padding-bottom:16px;border-bottom:1px solid #e5e7eb"><a href="${escHtmlEmail(site)}" style="text-decoration:none;display:inline-block"><img src="${escHtmlEmail(logoUrl)}" alt="IQ Motorbase" width="280" style="max-width:100%;width:280px;height:auto;display:block;border:0" /></a></div>`;
  return header + bodyHtml;
}

export async function sendListingApproved(to, companyName) {
  const subject = "Congratulations! Your listing is live on IQMotorBase.com";
  const html = `
    <p>Congratulations${companyName ? ` from ${companyName}` : ""}!</p>
    <p>Your repair center listing on IQMotorBase.com has been <strong>approved</strong> and is now live on our website. Your company is listed in the directory so customers in your area can find and contact you.</p>
    <p>Thank you for being part of IQMotorBase.com.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

export async function sendListingRejected(to, companyName, reason) {
  const subject = "Update on your IQMotorBase.com listing submission";
  const html = `
    <p>Hi${companyName ? ` from ${companyName}` : ""},</p>
    <p>Thank you for submitting your repair center to IQMotorBase.com. After review, we are unable to approve your listing at this time.</p>
    ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : "<p>No specific reason was provided.</p>"}
    <p>If you have questions or would like to resubmit with updates, please reply to this email or contact us.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

export async function sendNewReviewNotification(to, companyName, reviewerName, rating, reviewBody) {
  const subject = `New customer review on IQMotorBase.com – ${companyName}`;
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  const html = `
    <p>Hi,</p>
    <p>A customer left a new review for <strong>${companyName}</strong> on IQMotorBase.com.</p>
    <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
    <p><strong>From:</strong> ${reviewerName}</p>
    <p><strong>Review:</strong></p>
    <p>${reviewBody.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/** Rewind calculator RFQ — override with REWIND_CALCULATOR_RFQ_EMAIL if needed. */
const rewindCalculatorRfqEmail = () =>
  process.env.REWIND_CALCULATOR_RFQ_EMAIL?.trim() || "contact@IQMotorBase.com";

/**
 * Notify IQMotorBase when a visitor submits an RFQ after using the public rewind ballpark calculator.
 * @param {{ leadName: string, leadEmail: string, leadPhone?: string, leadCity?: string, leadZip?: string, problemDescription?: string, htmlRows: string }} params
 */
export async function sendRewindCalculatorRfqToAdmin(params) {
  const to = rewindCalculatorRfqEmail();
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const subject = "Rewind calculator RFQ — IQMotorBase.com";
  const html = `
    <p>A visitor used the <strong>electric motor rewinding cost calculator</strong> and requested quotes from shops in their area.</p>
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Name</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadName)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadEmail)}</td></tr>
        ${params.leadPhone ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Phone</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadPhone)}</td></tr>` : ""}
        ${params.leadCity ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">City</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadCity)}</td></tr>` : ""}
        ${params.leadZip ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">ZIP</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadZip)}</td></tr>` : ""}
      </tbody>
    </table>
    <p style="margin-top:16px;"><strong>Calculator summary</strong></p>
    <table style="border-collapse:collapse;">${params.htmlRows}</table>
    ${params.problemDescription ? `<p style="margin-top:16px;"><strong>Message / notes</strong></p><p>${esc(params.problemDescription).replace(/\n/g, "<br/>")}</p>` : ""}
    <p>— IQMotorBase.com (automated)</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/**
 * Notify IQMotorBase when a visitor downloads a calculator estimate PDF (price enquiry).
 * @param {{
 *   leadName: string,
 *   leadEmail: string,
 *   leadPhone: string,
 *   visitorTypeLabel: string,
 *   sourcePage?: string,
 *   htmlRows: string,
 *   estimateRange?: string,
 *   pdfBuffer?: Buffer,
 *   pdfFilename?: string,
 * }} params
 */
export async function sendCalculatorPriceEnquiryToAdmin(params) {
  const to = rewindCalculatorRfqEmail();
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const subject = "Price Enquiry";
  const html = `
    <p>A visitor downloaded a <strong>motor rewind cost calculator estimate PDF</strong> from IQMotorBase.com.</p>
    ${params.pdfBuffer ? "<p><strong>The detailed estimate PDF is attached to this email.</strong></p>" : ""}
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Name</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadName)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadEmail)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Phone</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.leadPhone)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Visitor type</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.visitorTypeLabel)}</td></tr>
        ${params.sourcePage ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Source page</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.sourcePage)}</td></tr>` : ""}
        ${params.estimateRange ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Ballpark range</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(params.estimateRange)}</td></tr>` : ""}
      </tbody>
    </table>
    <p style="margin-top:16px;"><strong>Calculator configuration &amp; estimate</strong></p>
    <table style="border-collapse:collapse;">${params.htmlRows}</table>
    <p>— IQMotorBase.com (automated)</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html), {
    attachments: calculatorEstimatePdfAttachments(params.pdfBuffer, params.pdfFilename),
  });
}

function calculatorEstimatePdfAttachments(pdfBuffer, pdfFilename) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) return undefined;
  return [
    {
      filename: pdfFilename || "IQMotorBase-Motor-Rewind-Estimate.pdf",
      content: pdfBuffer,
      contentType: "application/pdf",
    },
  ];
}

/**
 * Send the detailed estimate PDF to the visitor who requested the download.
 * @param {{
 *   toEmail: string,
 *   customerName: string,
 *   estimateRange?: string,
 *   pdfBuffer?: Buffer,
 *   pdfFilename?: string,
 * }} params
 */
export async function sendCalculatorEstimatePdfToCustomer(params) {
  const to = String(params.toEmail || "").trim();
  if (!to) return { ok: false, error: "Customer email is required." };

  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const site = getPublicSiteUrl();
  const name = esc(params.customerName || "there");
  const rangeLine = params.estimateRange
    ? `<p>Your ballpark planning range: <strong>${esc(params.estimateRange)}</strong> (US typical rewind shop pricing).</p>`
    : "";

  const subject = "Your motor rewind cost estimate – IQMotorBase.com";
  const html = `
    <p>Hi ${name},</p>
    <p>Thank you for using the <strong>IQMotorBase.com motor rewind cost calculator</strong>. Your detailed estimate PDF is attached.</p>
    ${rangeLine}
    <p>The PDF includes your motor configuration, ballpark range, cost breakdown, and how the estimate was calculated. This is planning guidance only—not a binding shop quote. Final pricing depends on inspection and shop scope.</p>
    <p>When you are ready for written quotes from qualified repair shops, visit <a href="${esc(site)}">${esc(site)}</a>.</p>
    <p>— IQMotorBase.com</p>
  `;

  return sendEmail(to, subject, wrapPlatformBrandedHtml(html), {
    attachments: calculatorEstimatePdfAttachments(params.pdfBuffer, params.pdfFilename),
  });
}

/** Notify contact@IQMotorBase.com when a user has no listings in their area (near-me page). */
export async function sendNoListingsNearMeNotification(city, state, zip) {
  const to = "contact@IQMotorBase.com";
  const subject = "IQMotorBase.com – No repair centers in this area (near-me page)";
  const locationParts = [city, state, zip].filter(Boolean);
  const locationLine = locationParts.length ? locationParts.join(", ") : "Location not provided";
  const html = `
    <p>A visitor on the <strong>Electric motor repair shops near me</strong> page had no listings in their area.</p>
    <p><strong>Location details:</strong></p>
    <ul>
      ${city ? `<li>City: ${city}</li>` : ""}
      ${state ? `<li>State: ${state}</li>` : ""}
      ${zip ? `<li>ZIP: ${zip}</li>` : ""}
    </ul>
    <p><strong>Summary:</strong> ${locationLine}</p>
    <p>Please look for motor repair shops in this area and encourage them to list on the directory.</p>
    <p>— IQMotorBase.com (automated)</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/** Notify a user who signed up for "notify me when there's a listing" that repair centers are now in their area. Links to our site only; no direct shop contact info in the email. */
export async function sendAreaListedNotification(toEmail, locationLabel, shopListingsPageUrl) {
  const subject = "Repair centers are now in your area – IQMotorBase.com";
  const html = `
    <p>Good news!</p>
    <p>We've added repair centers near <strong>${locationLabel || "your area"}</strong> on IQMotorBase.com.</p>
    <p>You asked to be notified when new listings are available in your area. View the full list and details on our site:</p>
    <p><a href="${shopListingsPageUrl}">View repair centers in your area</a></p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(toEmail, subject, wrapPlatformBrandedHtml(html));
}

/** Send demo request to admin as plain HTML table. Subject: RFQ - IQMotorBase CRM Demo. */
export async function sendDemoRequestToAdmin(fields) {
  const esc = (v) => (v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const rows = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone],
    ["Business type", fields.businessType],
    ["Team size", fields.teamSize],
    ["Current tools", fields.currentTools],
    ["Main problem", fields.mainProblem],
    ["Business / shop", fields.businessName],
    ["City", fields.city],
    ["State", fields.state],
    ["Source page", fields.sourcePage],
    ["Date", fields.preferDate],
    ["Time", fields.preferTime],
    ["Timezone", fields.timezone],
  ]
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${esc(label)}</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(value)}</td></tr>`)
    .join("");
  const html = `
    <p>A visitor requested a CRM demo${fields.sourcePage ? ` (source: ${esc(fields.sourcePage)})` : ""}.</p>
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">— IQMotorBase.com (contact form)</p>
  `;
  return sendEmail("contact@IQMotorBase.com", "RFQ - IQMotorBase CRM Demo.", wrapPlatformBrandedHtml(html));
}

/** Send thank-you email to client after demo request. */
export async function sendDemoRequestThankYou(toName, toEmail, availability = {}) {
  const name = toName ? ` ${toName}` : "";
  const subject = "We received your demo request – IQMotorBase.com";
  const esc = (v) => (v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const preferDate = String(availability?.preferDate || "").trim();
  const preferTime = String(availability?.preferTime || "").trim();
  const timezone = String(availability?.timezone || "").trim();
  const preferenceParts = [preferDate, preferTime, timezone].filter(Boolean);
  const preferenceLine =
    preferenceParts.length > 0
      ? `<p>We saved your submitted preference: <strong>${esc(preferenceParts.join(" · "))}</strong>. If that changes, include updated options in your reply.</p>`
      : "";
  const html = `
    <p>Hi${name},</p>
    <p>Thank you for requesting a demo of IQMotorBase.com.</p>
    ${preferenceLine}
    <p>To schedule your meeting, please <strong>reply to this email</strong> with a few dates and times that work for you (include your timezone). We&apos;ll send a calendar invite for a slot that fits your schedule.</p>
    <p>In the meantime, feel free to explore our <a href="${getPublicSiteUrl()}/electric-motor-repair-shops-listings">repair center directory</a> or learn more about <a href="${getPublicSiteUrl()}/features">our features</a>.</p>
    <p>— The IQMotorBase.com team</p>
  `;
  return sendEmail(toEmail, subject, wrapPlatformBrandedHtml(html));
}

/** Email address to receive "new listing submitted" and "shop listed" notifications. */
const listingNotifyEmail = () =>
  process.env.NOTIFY_LISTING_EMAIL?.trim() ||
  process.env.ADMIN_EMAIL?.trim() ||
  "contact@IQMotorBase.com";

/** Notify admin when someone submits a new listing from list-your-electric-motor-services. */
export async function sendNewListingSubmittedToAdmin(doc) {
  const to = listingNotifyEmail();
  if (!to) return { ok: true };
  const esc = (v) => (v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const rows = [
    ["Company", doc.companyName],
    ["Email", doc.email],
    ["Phone", doc.phone],
    ["Website", doc.website],
    ["City", doc.city],
    ["State", doc.state],
    ["ZIP", doc.zipCode],
    ["Primary contact", doc.primaryContactPerson],
    ["Short description", (doc.shortDescription || "").slice(0, 200)],
  ]
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${esc(label)}</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(value)}</td></tr>`)
    .join("");
  const html = `
    <p>A new repair center listing was submitted from the <strong>List your electric motor services</strong> page.</p>
    <p>Review and approve or reject in the admin: <a href="${getPublicSiteUrl()}/admin/listings">Admin → Listings</a></p>
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">— IQMotorBase.com (automated)</p>
  `;
  return sendEmail(to, "New listing submitted – IQMotorBase.com", wrapPlatformBrandedHtml(html));
}

/** Notify admin when a listing is approved and the shop is now listed on the website. */
export async function sendShopListedNotificationToAdmin(doc) {
  const to = listingNotifyEmail();
  if (!to) return { ok: true };
  const siteUrl = getPublicSiteUrl();
  const html = `
    <p>A repair center has been <strong>approved</strong> and is now listed on the website.</p>
    <p><strong>${(doc.companyName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br />
    Email: ${(doc.email || "").replace(/</g, "&lt;")} | ${[doc.city, doc.state, doc.zipCode].filter(Boolean).join(", ") || "—"}</p>
    <p><a href="${siteUrl}/admin/listings">View in admin</a> | <a href="${siteUrl}/electric-motor-repair-shops-listings">Public directory</a></p>
    <p style="margin-top:16px;">— IQMotorBase.com (automated)</p>
  `;
  return sendEmail(to, "Shop listed on website – IQMotorBase.com", wrapPlatformBrandedHtml(html));
}

/**
 * Notify a listed repair center when a visitor submits an RFQ from their public listing page.
 */
export async function sendNewWebsiteLeadNotificationToShop({
  to,
  listingCompanyName,
  leadContactName,
  leadContactCompany,
  siteUrl,
}) {
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const base = String(siteUrl || getPublicSiteUrl()).replace(/\/+$/, "");
  const leadsUrl = `${base}/dashboard/leads`;
  const loginUrl = `${base}/login`;
  const fromLine = [esc(leadContactName || "Someone"), leadContactCompany ? ` (${esc(leadContactCompany)})` : ""].join("");
  const subject = `New lead for ${listingCompanyName || "your shop"} – IQMotorBase.com`;
  const html = `
    <p>Hello,</p>
    <p>You received a new repair inquiry (RFQ) from your <strong>IQMotorBase.com</strong> directory listing.</p>
    <p><strong>From:</strong> ${fromLine || "A visitor"}</p>
    <p>Log in to your shop dashboard to view full contact details and respond in your CRM:</p>
    <p><a href="${esc(leadsUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Open Leads in CRM</a></p>
    <p style="font-size:13px;color:#555;">If you are not signed in, use <a href="${esc(loginUrl)}">Log in</a> first with your shop email, then open <strong>Leads</strong>.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/** Send verification code for list-your-electric-motor-services email verification. */
export async function sendVerificationCodeEmail(to, code) {
  const subject = "Your IQMotorBase.com verification code";
  const html = `
    <p>Your verification code for listing your center on IQMotorBase.com is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace">${code}</p>
    <p>Enter this code on the website to continue. The code expires in 15 minutes.</p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/**
 * Welcome email after admin onboards a listing to CRM (includes temp password; instruct to change in Settings).
 */
export async function sendCrmWelcomeEmail({
  to,
  shopName,
  contactName,
  userId,
  plainPassword,
}) {
  const site = getPublicSiteUrl();
  const loginUrl = `${site}/login`;
  const settingsUrl = `${site}/dashboard/settings`;
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const greet = contactName ? ` ${esc(contactName)}` : "";
  const subject = "Your IQMotorBase.com CRM account is ready";
  const html = `
    <p>Hi${greet},</p>
    <p>Your shop portal account has been created for <strong>${esc(shopName || "your shop")}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Login email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(to)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Account ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${esc(userId)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Password</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;">${esc(plainPassword)}</td></tr>
      </tbody>
    </table>
    <p><a href="${esc(loginUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Log in to the CRM</a></p>
    <p><strong>Security:</strong> Change this password after you sign in. In the dashboard go to <strong>Settings</strong> → <strong>Account</strong> → <strong>Password</strong>, or open your account settings directly: <a href="${esc(settingsUrl)}">${esc(settingsUrl)}</a>.</p>
    <p>Your account includes access to leads, quotes, jobs, and billing. If you have questions, reply to this email.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/**
 * Admin seeds a directory listing: notify the business they are featured + CRM login (listing-only tier).
 */
export async function sendListingFeaturedAccountEmail({
  to,
  shopName,
  userId,
  plainPassword,
  publicListingUrl,
}) {
  const site = getPublicSiteUrl();
  const loginUrl = `${site}/login`;
  const leadsUrl = `${site}/dashboard/leads`;
  const directoryUrl = `${site}/dashboard/directory-listing`;
  const contactUrl = `${site}/contact`;
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const company = (shopName && String(shopName).trim()) || "";
  const greet = company ? ` ${esc(company)}` : "";
  const subject = "Your repair center is featured on IQMotorBase.com";
  const html = `
    <p>Hi${greet},</p>
    <p>We have added <strong>${esc(shopName || "your business")}</strong> to the IQMotorBase.com public repair shop directory so customers can find you when they search for motor repair services.</p>
    <p><strong>What you get:</strong> visibility in our directory, incoming leads from the website routed to your account, and a dashboard to review inquiries and manage how your listing appears.</p>
    ${publicListingUrl ? `<p><strong>Your public listing:</strong> <a href="${esc(publicListingUrl)}">${esc(publicListingUrl)}</a></p>` : ""}
    <p>Use the credentials below to log in to your shop dashboard. There you can view <a href="${esc(leadsUrl)}">Leads</a> and edit your profile on <a href="${esc(directoryUrl)}">Directory listing</a>.</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Login email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(to)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Account ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${esc(userId)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Temporary password</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;">${esc(plainPassword)}</td></tr>
      </tbody>
    </table>
    <p><a href="${esc(loginUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Log in to your dashboard</a></p>
    <p><strong>Security:</strong> Change your password after you sign in under <strong>Settings</strong> → <strong>Account</strong>.</p>
    <p>To unlock the full CRM (quotes, jobs, billing, and unlimited leads), <a href="${esc(contactUrl)}">contact us</a> about a paid plan.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/**
 * Admin outreach to active portal clients — feedback request and paid subscription interest.
 */
export async function sendActiveClientFeedbackOutreachEmail({ to, contactName, shopName }) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const greeting = contactName?.trim()
    ? esc(contactName.trim())
    : shopName?.trim()
      ? `team at ${esc(shopName.trim())}`
      : "there";
  const pricingUrl = `${site}/pricing`;
  const subscriptionUrl = `${site}/dashboard/subscription`;
  const contactUrl = `${site}/contact`;
  const subject = "How is IQMotorBase working for your shop?";
  const html = `
    <p>Hi ${greeting},</p>
    <p>Thank you for using <strong>IQMotorBase.com</strong>${shopName?.trim() ? ` at <strong>${esc(shopName.trim())}</strong>` : ""}. We hope the portal is helping you manage jobs, quotes, and customer communication.</p>
    <p>We would love your feedback:</p>
    <ul>
      <li>What is working well for your shop today?</li>
      <li>What features or workflows would make IQMotorBase more useful?</li>
      <li>Is there anything confusing or missing from your day-to-day use?</li>
    </ul>
    <p>Simply reply to this email with your thoughts — even a few sentences help us prioritize improvements.</p>
    <p><strong>Interested in a paid subscription?</strong> If you are on a free or trial plan and want full CRM access, calculators, marketplace tools, and ongoing support, we would be happy to walk you through options:</p>
    <ul>
      <li><a href="${esc(pricingUrl)}">View plans &amp; pricing</a></li>
      <li><a href="${esc(subscriptionUrl)}">Manage subscription in your dashboard</a></li>
      <li><a href="${esc(contactUrl)}">Contact us for a demo or custom quote</a></li>
    </ul>
    <p>Reply here or reach out through the contact page if you would like to discuss a paid plan for your shop.</p>
    <p>Thank you for being part of IQMotorBase.com.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendMarketingEmail(to, subject, html);
}

/**
 * Admin outreach — listing page stats, free directory benefits, shop management software subscription.
 */
export async function sendListingStatsOutreachEmail({
  to,
  companyName,
  listingUrl,
  monthLabel,
  visitsThisMonth,
  visitsOverall,
  quoteRequestCount,
}) {
  const site = getPublicSiteUrl().replace(/\/$/, "");
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const monthName = monthLabel
    ? new Date(`${monthLabel}-01T12:00:00Z`).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })
    : "This month";
  const fullListingUrl = listingUrl?.startsWith("http") ? listingUrl : `${site}${listingUrl || ""}`;
  const softwareUrl = `${site}/motor-repair-shop-management-software`;
  const pricingUrl = `${site}/pricing`;
  const subscriptionUrl = `${site}/dashboard/subscription`;
  const contactUrl = `${site}/contact`;
  const subject = `Your IQMotorBase listing stats — ${esc(companyName || "repair center")}`;
  const html = `
    <p>Hello${companyName?.trim() ? ` from <strong>${esc(companyName.trim())}</strong>` : ""},</p>
    <p>Your repair center is listed on <strong>IQMotorBase.com</strong> and customers are finding you online. Here is a snapshot of your listing performance:</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${esc(monthName)} page visits</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(String(visitsThisMonth ?? 0))}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Overall listing page visits</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(String(visitsOverall ?? 0))}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Quote requests from your listing</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(String(quoteRequestCount ?? 0))}</td></tr>
      </tbody>
    </table>
    ${listingUrl ? `<p>View your public listing: <a href="${esc(fullListingUrl)}">${esc(fullListingUrl)}</a></p>` : ""}
    <p><strong>What you receive for free today</strong></p>
    <ul>
      <li>A searchable directory profile so buyers can find your shop by location and services</li>
      <li>Visibility on IQMotorBase.com when customers search for motor repair and rewinding</li>
      <li>Quote requests routed to your shop when visitors inquire from your listing page</li>
      <li>Ongoing exposure as our directory and SEO content grow — at no listing fee</li>
    </ul>
    <p><strong>Run your whole shop in one place</strong></p>
    <p>Many shops start with a free directory listing, then move to <strong>IQMotorBase shop management software</strong> to handle work orders, quotes, inventory, job tracking, customer communication, and more — without juggling spreadsheets and disconnected tools.</p>
    <ul>
      <li><a href="${esc(softwareUrl)}">Motor repair shop management software</a></li>
      <li><a href="${esc(pricingUrl)}">View plans &amp; pricing</a></li>
      <li><a href="${esc(subscriptionUrl)}">Subscribe from your dashboard</a></li>
      <li><a href="${esc(contactUrl)}">Contact us for a demo</a></li>
    </ul>
    <p>Reply to this email if you have questions about your stats or want help choosing a plan for your shop.</p>
    <p>Thank you for being part of IQMotorBase.com.</p>
    <p>— IQMotorBase.com</p>
  `;
  return sendMarketingEmail(to, subject, html);
}

/**
 * Notify client when an admin attaches or changes their subscription plan (PayPal approval link or Free Ultimate).
 */
export async function sendSubscriptionPlanAttachedEmail({
  to,
  shopName,
  planName,
  planType,
  billingCycle,
  customPrice,
  currency,
  approvalUrl,
}) {
  const site = getPublicSiteUrl();
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const subUrl = `${site}/dashboard/subscription`;
  const isPaypal = String(planType || "").toLowerCase() === "paypal";
  const priceLine =
    customPrice != null && !Number.isNaN(Number(customPrice))
      ? `${esc(currency || "USD")} ${Number(customPrice).toFixed(2)}`
      : "";
  const subject = isPaypal
    ? `Subscription plan attached — ${esc(planName || "IQMotorBase")}`
    : `Your IQMotorBase.com plan: ${esc(planName || "Free Ultimate")}`;
  const approvalBlock =
    isPaypal && approvalUrl
      ? `<p><strong>Complete setup in PayPal:</strong> your administrator assigned a paid plan. Open this link to approve billing (you can also find it under <a href="${esc(subUrl)}">CRM → Subscription</a>):</p>
         <p><a href="${esc(approvalUrl)}" style="word-break:break-all;">${esc(approvalUrl)}</a></p>`
      : "";
  const html = `
    <p>Hello${shopName ? ` from <strong>${esc(shopName)}</strong>` : ""},</p>
    <p>A subscription plan has been attached to your IQMotorBase.com account.</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Plan</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(planName || "—")}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Type</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(planType || "—")}</td></tr>
        ${billingCycle ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Billing</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(billingCycle)}</td></tr>` : ""}
        ${priceLine ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Amount</td><td style="padding:8px 12px;border:1px solid #ddd;">${priceLine}</td></tr>` : ""}
      </tbody>
    </table>
    ${approvalBlock}
    <p>Manage subscription anytime: <a href="${esc(subUrl)}">${esc(subUrl)}</a></p>
    <p>— IQMotorBase.com</p>
  `;
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html));
}

/**
 * Send an email. Uses options.from when provided (e.g. for marketing); otherwise uses default EMAIL_FROM.
 */
async function sendEmail(to, subject, html, options = {}) {
  const transport = options.transport || getTransporter();
  const from = options.from || fromEmail || process.env.SMTP_USER;
  const attachments = options.attachments;
  const sanitizedHtml = sanitizeEmailBodyHtml(html);
  if (!transport) {
    console.error("[Email not configured] Set SMTP_USER and SMTP_PASS. To:", to, "Subject:", subject);
    return { ok: false, error: "Email not configured. Set SMTP_USER and SMTP_PASS." };
  }
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html: sanitizedHtml,
      ...(Array.isArray(options.cc) && options.cc.length ? { cc: options.cc.join(", ") } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
    });
    return { ok: true };
  } catch (err) {
    console.error("Nodemailer error:", err);
    return { ok: false, error: err.message };
  }
}

/** Apply workspace SMTP when userSettings provided in options. */
function customerMailOptions(options = {}, shopCompanyName = "") {
  if (options.transport && options.from) {
    return { transport: options.transport, from: options.from, error: null };
  }
  if (options.userSettings) {
    const mail = resolveCustomerMailDelivery(options.userSettings, shopCompanyName);
    return { transport: mail.transport, from: mail.from, error: mail.error };
  }
  return { transport: getTransporter(), from: fromEmail || process.env.SMTP_USER, error: null };
}

async function sendCustomerFacingEmail(to, subject, html, options, shopCompanyName) {
  const extraAttachments = Array.isArray(options.attachments) ? options.attachments : [];
  const mailOpts = {
    ...customerMailOptions(options, shopCompanyName),
    ...(extraAttachments.length ? { attachments: extraAttachments } : {}),
    ...(Array.isArray(options.cc) && options.cc.length ? { cc: options.cc } : {}),
  };
  if (mailOpts.error) return { ok: false, error: mailOpts.error };
  return sendEmail(to, subject, html, mailOpts);
}

/** Send email using the marketing "from" address (EMAIL_MARKETING_FROM). Use for admin marketing campaigns. */
export async function sendMarketingEmail(to, subject, html) {
  return sendEmail(to, subject, wrapPlatformBrandedHtml(html), { from: marketingFrom });
}

/** Send quote to customer with link to approve/reject. Uses motor shop name in subject and signature (no IQMotorBase.com). */
export async function sendQuoteToCustomer(
  toEmail,
  customerName,
  rfqNumber,
  respondUrl,
  shopCompanyName,
  options = {}
) {
  const { subject, html } = buildQuoteToCustomerEmailContent({
    customerName,
    rfqNumber,
    respondUrl,
    shopCompanyName,
    logoSrc: options.logoSrc || options.logoAbsoluteUrl,
    accountsEmailBlock: options.accountsEmailBlock,
    customMessage: options.customMessage,
  });
  const shopName = (shopCompanyName && String(shopCompanyName).trim()) ? shopCompanyName.trim() : "Motor Shop";
  return sendCustomerFacingEmail(toEmail, subject, html, options, shopName);
}

/** Email link for repair-flow preliminary quote — customer approves teardown, declines repair, or authorizes scrap. */
export async function sendRepairFlowPreliminaryToCustomer(
  toEmail,
  customerName,
  jobNumber,
  respondUrl,
  shopCompanyName,
  options = {}
) {
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const shopName = (shopCompanyName && String(shopCompanyName).trim()) ? shopCompanyName.trim() : "Motor Shop";
  const signature = esc(shopName);
  const jobRef = esc(jobNumber) || "your repair job";
  const subject = `Preliminary quote — Job ${jobRef} – ${shopName}`;
  const logoSrc = String(options.logoSrc || options.logoAbsoluteUrl || "").trim();
  const logoIsHttp = logoSrc.startsWith("http://") || logoSrc.startsWith("https://");
  const logoIsData = logoSrc.startsWith("data:image/");
  const logoIsCid = logoSrc.startsWith("cid:");
  const logoBlock =
    logoIsHttp || logoIsData || logoIsCid
      ? `<p style="margin-top:20px;margin-bottom:8px"><img src="${esc(logoSrc)}" alt="${signature}" width="160" style="max-width:160px;height:auto;display:block;border:0" /></p>`
      : "";
  const html = `
    <p>Hi${customerName ? ` ${esc(customerName)}` : ""},</p>
    <p>Your <strong>preliminary (pre-disassembly) quote</strong> for job <strong>${jobRef}</strong> is ready.</p>
    <p>Open the link below to review the quote and tell us how you would like to proceed: approve disassembly and repair, decline and pick up as-is, or authorize scrap.</p>
    <p><a href="${esc(respondUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Review preliminary quote</a></p>
    <p>You can print or save the quote as a PDF from that page.</p>
    ${typeof options.accountsEmailBlock === "string" && options.accountsEmailBlock.trim() ? options.accountsEmailBlock : ""}
    ${logoBlock}
    <p style="margin-top:16px">— ${signature}</p>
  `;
  const extraAttachments = Array.isArray(options.attachments) ? options.attachments : [];
  return sendEmail(toEmail, subject, html, extraAttachments.length ? { attachments: extraAttachments } : {});
}

/**
 * Invoice email to customer — primary CTA is link to view/print (same idea as quote respond link).
 * Pass options.viewUrl (e.g. /invoice/view/{token}).
 */
export async function sendInvoiceToCustomer(
  toEmail,
  customerName,
  invoiceNumber,
  shopCompanyName,
  options = {}
) {
  const { subject, html } = buildInvoiceToCustomerEmailContent({
    customerName,
    invoiceNumber,
    shopCompanyName,
    viewUrl: options.viewUrl,
    totalFormatted: options.totalFormatted,
    summaryHtml: options.summaryHtml,
    logoSrc: options.logoSrc || options.logoAbsoluteUrl,
    accountsEmailBlock: options.accountsEmailBlock,
    customMessage: options.customMessage,
  });
  const shopName = (shopCompanyName && String(shopCompanyName).trim()) ? shopCompanyName.trim() : "Motor Shop";
  return sendCustomerFacingEmail(toEmail, subject, html, options, shopName);
}

/** Send purchase order to vendor with link to view, print, and update delivery status. Uses motor shop name in subject and signature. */
export async function sendPoToVendor(toEmail, vendorName, poNumber, viewUrl, shopCompanyName, options = {}) {
  const { subject, html } = buildPoToVendorEmailContent({
    vendorName,
    poNumber,
    viewUrl,
    shopCompanyName,
    logoSrc: options.logoSrc || options.logoAbsoluteUrl,
    poVendorAddressesHtml: options.poVendorAddressesHtml,
    customMessage: options.customMessage,
  });
  const extraAttachments = Array.isArray(options.attachments) ? options.attachments : [];
  return sendEmail(toEmail, subject, html, {
    ...(extraAttachments.length ? { attachments: extraAttachments } : {}),
    ...(Array.isArray(options.cc) && options.cc.length ? { cc: options.cc } : {}),
  });
}

/** Email work order PDF to a recipient (custom email + optional message in body). */
export async function sendWorkOrderPdfToRecipient(
  toEmail,
  workOrderNumber,
  shopCompanyName,
  pdfBuffer,
  options = {}
) {
  const esc = (v) =>
    v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const shopName = shopCompanyName && String(shopCompanyName).trim() ? shopCompanyName.trim() : "Motor Shop";
  const woNo = esc(workOrderNumber) || "—";
  const subject = `Work order ${woNo} – ${esc(shopName)}`;
  const instructions = String(options.instructions ?? "").trim();
  const instructionsBlock = instructions
    ? `<p style="margin-top:12px;padding:12px;background:#f5f5f4;border-radius:8px;font-size:14px;line-height:1.5;color:#374151"><strong>Message:</strong><br/>${esc(instructions).replace(/\n/g, "<br/>")}</p>`
    : "";
  const html = `
    <p>Hello,</p>
    <p>Please find the attached work order <strong>${woNo}</strong> from ${esc(shopName)}.</p>
    ${instructionsBlock}
    <p style="margin-top:16px">If you have questions, reply to this email.</p>
    <p style="margin-top:16px">— ${esc(shopName)}</p>
  `;
  const safeFile = String(workOrderNumber || "work-order")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sendEmail(toEmail, subject, html, {
    attachments: [
      {
        filename: `Work-Order-${safeFile || "document"}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
