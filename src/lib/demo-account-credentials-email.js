import { getPublicSiteUrl } from "@/lib/public-site-url";

function escHtmlEmail(v) {
  return v == null
    ? ""
    : String(v)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Demo account credentials email body (platform header applied when sending).
 * Safe for client + server import (no nodemailer).
 */
export function buildDemoAccountCredentialsEmailContent({
  to,
  shopName,
  contactName,
  userId,
  plainPassword,
  planLabel = "",
}) {
  const site = getPublicSiteUrl();
  const loginUrl = `${site}/login`;
  const settingsUrl = `${site}/dashboards/settings`;
  const esc = escHtmlEmail;
  const greet = contactName ? ` ${esc(contactName)}` : "";
  const subject = "Your IQMotorBase.com demo account credentials";
  const planRow = planLabel
    ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Package</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(planLabel)}</td></tr>`
    : "";
  const bodyHtml = `
    <p>Hi${greet},</p>
    <p>Here are your <strong>demo account</strong> login credentials for <strong>${esc(shopName || "your shop")}</strong> on IQMotorBase.com.</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Login email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(to)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Account ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${esc(userId)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Password</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;">${esc(plainPassword)}</td></tr>
        ${planRow}
      </tbody>
    </table>
    <p><a href="${esc(loginUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Log in to the CRM</a></p>
    <p><strong>Security:</strong> Change this password after you sign in under <strong>Settings</strong> → <strong>Account</strong> (or open <a href="${esc(settingsUrl)}">${esc(settingsUrl)}</a>).</p>
    <p>If you have questions about your package or need a walkthrough, reply to this email.</p>
    <p>— IQMotorBase.com</p>
  `;
  return { subject, bodyHtml };
}

/**
 * CRM welcome email body (listing onboard). Safe for client + server.
 */
export function buildCrmWelcomeEmailContent({
  to,
  shopName,
  contactName,
  userId,
  plainPassword,
  planLabel = "",
}) {
  const site = getPublicSiteUrl();
  const loginUrl = `${site}/login`;
  const settingsUrl = `${site}/dashboards/settings`;
  const esc = escHtmlEmail;
  const greet = contactName ? ` ${esc(contactName)}` : "";
  const subject = "Your IQMotorBase.com CRM account is ready";
  const planRow = planLabel
    ? `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Package</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(planLabel)}</td></tr>`
    : "";
  const bodyHtml = `
    <p>Hi${greet},</p>
    <p>Your shop portal account has been created for <strong>${esc(shopName || "your shop")}</strong>.</p>
    <table style="border-collapse:collapse;margin:16px 0;">
      <tbody>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Login email</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(to)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Account ID</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;font-size:12px;">${esc(userId)}</td></tr>
        <tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">Password</td><td style="padding:8px 12px;border:1px solid #ddd;font-family:monospace;">${esc(plainPassword)}</td></tr>
        ${planRow}
      </tbody>
    </table>
    <p><a href="${esc(loginUrl)}" style="display:inline-block;padding:10px 20px;background:#9a5d33;color:#fff;text-decoration:none;border-radius:6px;">Log in to the CRM</a></p>
    <p><strong>Security:</strong> Change this password after you sign in. In the dashboard go to <strong>Settings</strong> → <strong>Account</strong> → <strong>Password</strong>, or open your account settings directly: <a href="${esc(settingsUrl)}">${esc(settingsUrl)}</a>.</p>
    <p>Your account includes access to leads, quotes, jobs, and billing. If you have questions, reply to this email.</p>
    <p>— IQMotorBase.com</p>
  `;
  return { subject, bodyHtml };
}
