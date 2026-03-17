import { getTransporter } from "@/lib/email-transport";

const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "";
const marketingFrom = process.env.EMAIL_MARKETING_FROM || fromEmail;

export async function sendListingApproved(to, companyName) {
  const subject = "Congratulations! Your listing is live on MotorsWinding.com";
  const html = `
    <p>Congratulations${companyName ? ` from ${companyName}` : ""}!</p>
    <p>Your repair center listing on MotorsWinding.com has been <strong>approved</strong> and is now live on our website. Your company is listed in the directory so customers in your area can find and contact you.</p>
    <p>Thank you for being part of MotorsWinding.com.</p>
    <p>— MotorsWinding.com</p>
  `;
  return sendEmail(to, subject, html);
}

export async function sendListingRejected(to, companyName, reason) {
  const subject = "Update on your MotorsWinding.com listing submission";
  const html = `
    <p>Hi${companyName ? ` from ${companyName}` : ""},</p>
    <p>Thank you for submitting your repair center to MotorsWinding.com. After review, we are unable to approve your listing at this time.</p>
    ${reason ? `<p><strong>Reason for rejection:</strong> ${reason}</p>` : "<p>No specific reason was provided.</p>"}
    <p>If you have questions or would like to resubmit with updates, please reply to this email or contact us.</p>
    <p>— MotorsWinding.com</p>
  `;
  return sendEmail(to, subject, html);
}

export async function sendNewReviewNotification(to, companyName, reviewerName, rating, reviewBody) {
  const subject = `New customer review on MotorsWinding.com – ${companyName}`;
  const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
  const html = `
    <p>Hi,</p>
    <p>A customer left a new review for <strong>${companyName}</strong> on MotorsWinding.com.</p>
    <p><strong>Rating:</strong> ${stars} (${rating}/5)</p>
    <p><strong>From:</strong> ${reviewerName}</p>
    <p><strong>Review:</strong></p>
    <p>${reviewBody.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>
    <p>— MotorsWinding.com</p>
  `;
  return sendEmail(to, subject, html);
}

/** Notify contact@MotorsWinding.com when a user has no listings in their area (near-me page). */
export async function sendNoListingsNearMeNotification(city, state, zip) {
  const to = "contact@MotorsWinding.com";
  const subject = "MotorsWinding.com – No repair centers in this area (near-me page)";
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
    <p>— MotorsWinding.com (automated)</p>
  `;
  return sendEmail(to, subject, html);
}

/** Notify a user who signed up for "notify me when there's a listing" that repair centers are now in their area. Links to our site only; no direct shop contact info in the email. */
export async function sendAreaListedNotification(toEmail, locationLabel, shopListingsPageUrl) {
  const subject = "Repair centers are now in your area – MotorsWinding.com";
  const html = `
    <p>Good news!</p>
    <p>We've added repair centers near <strong>${locationLabel || "your area"}</strong> on MotorsWinding.com.</p>
    <p>You asked to be notified when new listings are available in your area. View the full list and details on our site:</p>
    <p><a href="${shopListingsPageUrl}">View repair centers in your area</a></p>
    <p>— MotorsWinding.com</p>
  `;
  return sendEmail(toEmail, subject, html);
}

/** Send demo request to admin as plain HTML table. Subject: RFQ - MotorsWinding CRM Demo. */
export async function sendDemoRequestToAdmin(fields) {
  const esc = (v) => (v == null ? "" : String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"));
  const rows = [
    ["Name", fields.name],
    ["Email", fields.email],
    ["Phone", fields.phone],
    ["Date", fields.preferDate],
    ["Time", fields.preferTime],
    ["Timezone", fields.timezone],
  ]
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([label, value]) => `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${esc(label)}</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(value)}</td></tr>`)
    .join("");
  const html = `
    <p>A visitor requested a CRM demo via the contact page.</p>
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">— MotorsWinding.com (contact form)</p>
  `;
  return sendEmail("contact@MotorsWinding.com", "RFQ - MotorsWinding CRM Demo.", html);
}

/** Send thank-you email to client after demo request. */
export async function sendDemoRequestThankYou(toName, toEmail) {
  const name = toName ? ` ${toName}` : "";
  const subject = "We received your demo request – MotorsWinding.com";
  const html = `
    <p>Hi${name},</p>
    <p>Thank you for requesting a demo of MotorsWinding.com. We've received your details and will get back to you within 1–2 business days to schedule a time that works for you.</p>
    <p>In the meantime, feel free to explore our <a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "")}/electric-motor-reapir-shops-listings">repair center directory</a> or learn more about <a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "")}/features">our features</a>.</p>
    <p>— The MotorsWinding.com team</p>
  `;
  return sendEmail(toEmail, subject, html);
}

/** Email address to receive "new listing submitted" and "shop listed" notifications. */
const listingNotifyEmail = () =>
  process.env.NOTIFY_LISTING_EMAIL?.trim() ||
  process.env.ADMIN_EMAIL?.trim() ||
  "contact@MotorsWinding.com";

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
    <p>Review and approve or reject in the admin: <a href="${(process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "")}/admin/listings">Admin → Listings</a></p>
    <table style="border-collapse:collapse;margin-top:12px;">
      <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:16px;">— MotorsWinding.com (automated)</p>
  `;
  return sendEmail(to, "New listing submitted – MotorsWinding.com", html);
}

/** Notify admin when a listing is approved and the shop is now listed on the website. */
export async function sendShopListedNotificationToAdmin(doc) {
  const to = listingNotifyEmail();
  if (!to) return { ok: true };
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://motorswinding.com").replace(/\/$/, "");
  const html = `
    <p>A repair center has been <strong>approved</strong> and is now listed on the website.</p>
    <p><strong>${(doc.companyName || "").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br />
    Email: ${(doc.email || "").replace(/</g, "&lt;")} | ${[doc.city, doc.state, doc.zipCode].filter(Boolean).join(", ") || "—"}</p>
    <p><a href="${siteUrl}/admin/listings">View in admin</a> | <a href="${siteUrl}/electric-motor-reapir-shops-listings">Public directory</a></p>
    <p style="margin-top:16px;">— MotorsWinding.com (automated)</p>
  `;
  return sendEmail(to, "Shop listed on website – MotorsWinding.com", html);
}

/** Send verification code for list-your-electric-motor-services email verification. */
export async function sendVerificationCodeEmail(to, code) {
  const subject = "Your MotorsWinding.com verification code";
  const html = `
    <p>Your verification code for listing your center on MotorsWinding.com is:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace">${code}</p>
    <p>Enter this code on the website to continue. The code expires in 15 minutes.</p>
    <p>If you didn't request this, you can ignore this email.</p>
    <p>— MotorsWinding.com</p>
  `;
  return sendEmail(to, subject, html);
}

/**
 * Send an email. Uses options.from when provided (e.g. for marketing); otherwise uses default EMAIL_FROM.
 */
async function sendEmail(to, subject, html, options = {}) {
  const from = options.from || fromEmail || process.env.SMTP_USER;
  const transport = getTransporter();
  if (!transport) {
    console.error("[Email not configured] Set SMTP_USER and SMTP_PASS. To:", to, "Subject:", subject);
    return { ok: false, error: "Email not configured. Set SMTP_USER and SMTP_PASS." };
  }
  try {
    await transport.sendMail({
      from,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (err) {
    console.error("Nodemailer error:", err);
    return { ok: false, error: err.message };
  }
}

/** Send email using the marketing "from" address (EMAIL_MARKETING_FROM). Use for admin marketing campaigns. */
export async function sendMarketingEmail(to, subject, html) {
  return sendEmail(to, subject, html, { from: marketingFrom });
}
