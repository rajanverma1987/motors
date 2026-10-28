import { sendMarketingEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { buildTalentUnsubscribeUrl } from "@/lib/talent-unsubscribe";
import { talentAvailabilityLabel } from "@/lib/talent-seo";

export { talentAvailabilityLabel };

export async function sendTalentVerificationCodeEmail(to, code) {
  const subject = "Your IQMotorBase talent verification code";
  const html = `
    <p>Your code to sign in to your free electric motor shop talent profile:</p>
    <p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace">${code}</p>
    <p>Enter this code on the website. It expires in 15 minutes.</p>
    <p>If you did not request this, you can ignore this email.</p>
  `;
  return sendMarketingEmail(to, subject, html);
}

export async function sendTalentJobAlertEmail({
  to,
  seekerName,
  jobTitle,
  shopName,
  location,
  jobUrl,
  request,
}) {
  const unsub = buildTalentUnsubscribeUrl(to, request);
  const name = seekerName || "there";
  const subject = `New electric motor shop job near you: ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(name)},</p>
    <p>A new role was posted that matches your preferred location:</p>
    <p><strong>${escapeHtml(jobTitle)}</strong><br/>
    ${escapeHtml(shopName || "Motor repair shop")}${location ? ` · ${escapeHtml(location)}` : ""}</p>
    <p><a href="${escapeHtml(jobUrl)}">View job and apply with your profile</a></p>
    <p style="font-size:12px;color:#666;">You are receiving this because you created a free talent profile on IQMotorBase.
    <a href="${escapeHtml(unsub)}">Unsubscribe from job alerts</a>.</p>
  `;
  return sendMarketingEmail(to, subject, html);
}

export async function sendTalentApplicationReceivedEmail({ to, seekerName, jobTitle, shopName }) {
  const subject = `Application received: ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(seekerName || "there")},</p>
    <p>Your application for <strong>${escapeHtml(jobTitle)}</strong>
    ${shopName ? `at ${escapeHtml(shopName)}` : ""} was submitted.</p>
    <p>The shop can review your public talent profile. We will email you if they update your application status.</p>
  `;
  return sendMarketingEmail(to, subject, html);
}

export async function sendTalentApplicationStatusEmail({
  to,
  seekerName,
  jobTitle,
  statusLabel,
  profileUrl,
}) {
  const subject = `Application update: ${jobTitle}`;
  const html = `
    <p>Hi ${escapeHtml(seekerName || "there")},</p>
    <p>Your application for <strong>${escapeHtml(jobTitle)}</strong> was marked as
    <strong>${escapeHtml(statusLabel)}</strong>.</p>
    ${profileUrl ? `<p><a href="${escapeHtml(profileUrl)}">View your talent profile</a></p>` : ""}
  `;
  return sendMarketingEmail(to, subject, html);
}

export async function sendShopNewApplicantEmail({
  to,
  jobTitle,
  applicantName,
  applicantEmail,
  profileUrl,
  dashboardUrl,
}) {
  const subject = `New applicant for ${jobTitle}`;
  const html = `
    <p>Someone applied to <strong>${escapeHtml(jobTitle)}</strong> via IQMotorBase Careers.</p>
    <p><strong>${escapeHtml(applicantName || "Applicant")}</strong>
    (${escapeHtml(applicantEmail || "")})</p>
    ${profileUrl ? `<p><a href="${escapeHtml(profileUrl)}">View public talent profile</a></p>` : ""}
    ${dashboardUrl ? `<p><a href="${escapeHtml(dashboardUrl)}">Open applicants in dashboard</a></p>` : ""}
  `;
  return sendMarketingEmail(to, subject, html);
}

export function talentPublicProfileUrl(slug, request) {
  const base = getPublicSiteUrl(request);
  return `${base}/talent/${encodeURIComponent(slug)}`;
}

export function talentCreateProfileUrl(request) {
  return `${getPublicSiteUrl(request)}/talent/login`;
}

export const TALENT_INVITE_DEFAULT_SUBJECT =
  "You're invited: free electric motor shop talent profile";

export const TALENT_INVITE_DEFAULT_BODY = `Hi,

We're inviting you to create a free electric motor shop talent profile on IQMotorBase.

Shops hire winders, technicians, machinists, and field service pros through our Talent directory and Careers jobs. Sign in with a 6-digit email code (no password), add your skills and preferred states, and get location-matched job alerts.

It only takes a few minutes, and it's free for job seekers.`;

/** Build branded invite HTML: editable body + fixed create-profile CTA. */
export function buildTalentInviteEmailHtml(bodyText, request) {
  const createUrl = talentCreateProfileUrl(request);
  const blogUrl = `${getPublicSiteUrl(request)}/blog/create-free-electric-motor-shop-technician-profile`;
  const paragraphs = String(bodyText || "")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");

  return `
    ${paragraphs || "<p>You're invited to create a free talent profile on IQMotorBase.</p>"}
    <p style="margin:24px 0;">
      <a href="${escapeHtml(createUrl)}"
         style="display:inline-block;background:#0b5fff;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;">
        Create free profile
      </a>
    </p>
    <p style="font-size:13px;color:#555;">
      Or open <a href="${escapeHtml(createUrl)}">${escapeHtml(createUrl)}</a>
    </p>
    <p style="font-size:12px;color:#666;">
      How it works: <a href="${escapeHtml(blogUrl)}">Create a free electric motor shop technician profile</a>
    </p>
  `;
}

export async function sendTalentInviteEmail({ to, subject, bodyText, request }) {
  const html = buildTalentInviteEmailHtml(bodyText, request);
  return sendMarketingEmail(
    to,
    String(subject || TALENT_INVITE_DEFAULT_SUBJECT).slice(0, 200),
    html
  );
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
