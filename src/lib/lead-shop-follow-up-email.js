/**
 * Build subject + plain-text body for admin lead follow-up emails
 * (shop check-in + customer feedback).
 */

function formatLeadDate(createdAt) {
  if (!createdAt) return "that date";
  try {
    return new Date(createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "that date";
  }
}

function line(label, value) {
  const v = String(value || "").trim();
  return v ? `${label}: ${v}` : null;
}

function normalizeShopNames(shopNames = []) {
  return (Array.isArray(shopNames) ? shopNames : []).map((n) => String(n || "").trim()).filter(Boolean);
}

/**
 * @param {{
 *   lead: object,
 *   shopNames?: string[],
 * }} params
 */
export function buildLeadShopFollowUpDraft({ lead, shopNames = [] }) {
  const dateLabel = formatLeadDate(lead?.createdAt);
  const names = normalizeShopNames(shopNames);
  const greeting =
    names.length === 1 ? `Hi ${names[0]},` : names.length > 1 ? `Hi ${names.join(" / ")},` : "Hi,";

  const detailLines = [
    line("Customer", lead?.name),
    line("Company", lead?.company),
    line("Email", lead?.email),
    line("Phone", lead?.phone),
    line("Location", [lead?.city, lead?.zipCode].filter(Boolean).join(", ") || lead?.city),
    line("Motor", [lead?.motorType, lead?.motorHp ? `${lead.motorHp} HP` : "", lead?.voltage].filter(Boolean).join(", ")),
    line("Urgency", lead?.urgencyLevel),
    line("Need", lead?.problemDescription || lead?.message),
  ].filter(Boolean);

  const subject = `IQMotorBase lead follow-up (${dateLabel})`;

  const body = [
    greeting,
    "",
    `On ${dateLabel} we sent your shop a customer lead from IQMotorBase.com. We are checking in to confirm you received it and to learn how it went.`,
    "",
    "Lead details:",
    ...detailLines.map((l) => `- ${l}`),
    "",
    "Please reply with a short update on these three points:",
    "1. Did you receive the lead notification on that date?",
    "2. Were you able to connect with the customer?",
    "3. Was this a successful client conversion (quote, job, or paying work)?",
    "",
    "Your feedback helps us send better-matched leads and shows the value of being listed on IQMotorBase. Reply to this email whenever you have a moment.",
    "",
    "Thank you,",
    "IQMotorBase.com",
  ].join("\n");

  return { subject, body, dateLabel };
}

/**
 * Customer-facing follow-up: did the shop connect, and rate IQMotorBase.
 * @param {{
 *   lead: object,
 *   shopNames?: string[],
 * }} params
 */
export function buildLeadCustomerFollowUpDraft({ lead, shopNames = [] }) {
  const dateLabel = formatLeadDate(lead?.createdAt);
  const names = normalizeShopNames(shopNames);
  const firstName = String(lead?.name || "").trim().split(/\s+/)[0] || "";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const shopLabel =
    names.length === 1
      ? names[0]
      : names.length > 1
        ? names.join(", ")
        : "a motor repair shop";

  const subject = `Quick check-in from IQMotorBase (${dateLabel})`;

  const body = [
    greeting,
    "",
    `On ${dateLabel} you requested motor repair help through IQMotorBase.com, and we shared your request with ${shopLabel}.`,
    "",
    "We would appreciate a short reply on two points:",
    "1. Did the shop connect with you?",
    "2. How would you rate IQMotorBase (1 to 5, or a short comment)?",
    "",
    "Your feedback helps us improve matching for customers and shops. Simply reply to this email.",
    "",
    "Thank you,",
    "IQMotorBase.com",
  ].join("\n");

  return { subject, body, dateLabel };
}

/** Convert plain-text body to simple HTML paragraphs for branded email wrap. */
export function plainTextEmailBodyToHtml(text) {
  const esc = (v) =>
    v == null
      ? ""
      : String(v)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
  const raw = String(text || "").trim();
  if (!raw) return "<p></p>";
  return raw
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}
