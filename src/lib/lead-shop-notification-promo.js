/**
 * Temporary promo: include full lead contact details in shop notification emails
 * (do not gate contact behind login). Ends on LEAD_FULL_CONTACT_IN_EMAIL_UNTIL (UTC date)
 * or default end of March 2027.
 */

/** Default: through March 2027 (~few months from late 2026). Override with env YYYY-MM-DD. */
export const LEAD_FULL_CONTACT_IN_EMAIL_UNTIL_DEFAULT = "2027-03-31";

/**
 * @returns {string} YYYY-MM-DD
 */
export function getLeadFullContactInEmailUntilDate() {
  const raw = String(process.env.LEAD_FULL_CONTACT_IN_EMAIL_UNTIL || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return LEAD_FULL_CONTACT_IN_EMAIL_UNTIL_DEFAULT;
}

/**
 * @param {Date} [now]
 * @returns {boolean}
 */
export function shouldIncludeFullLeadContactInShopEmail(now = new Date()) {
  const until = getLeadFullContactInEmailUntilDate();
  const end = new Date(`${until}T23:59:59.999Z`);
  if (Number.isNaN(end.getTime())) return true;
  return now.getTime() <= end.getTime();
}

/**
 * Build table rows for lead fields present on the document.
 * @param {Record<string, unknown>} lead
 * @param {(v: unknown) => string} esc
 */
export function buildLeadContactDetailRowsHtml(lead, esc) {
  const rows = [
    ["Name", lead?.name],
    ["Company / facility", lead?.company],
    ["Email", lead?.email],
    ["Phone", lead?.phone],
    ["City", lead?.city],
    ["ZIP", lead?.zipCode],
    ["Buyer type", lead?.buyerType],
    ["Motor type", lead?.motorType],
    ["Motor HP", lead?.motorHp],
    ["Voltage", lead?.voltage],
    ["Urgency", lead?.urgencyLevel],
    ["Industry", lead?.industry],
  ];
  const problem = String(lead?.problemDescription || lead?.message || "").trim();
  const body = rows
    .filter(([, v]) => String(v || "").trim())
    .map(
      ([label, v]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;vertical-align:top;">${esc(label)}</td><td style="padding:8px 12px;border:1px solid #ddd;">${esc(v)}</td></tr>`
    )
    .join("");
  const problemBlock = problem
    ? `<p style="margin-top:16px;"><strong>Message / notes</strong></p><p style="white-space:pre-wrap;">${esc(problem).replace(/\n/g, "<br/>")}</p>`
    : "";
  return { tableHtml: body ? `<table style="border-collapse:collapse;width:100%;max-width:560px;">${body}</table>` : "", problemBlock };
}
