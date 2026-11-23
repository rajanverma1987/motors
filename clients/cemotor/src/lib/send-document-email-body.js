/**
 * Email body for proposal, invoice, and purchase-order sends.
 * The send window edits this as rich text. Plain text is still accepted.
 */

function clean(value) {
  return String(value ?? "").trim();
}

/** Pull a document number out of labels such as "RFQ# 100" or "Invoice #100". */
export function referenceFromDocumentLabel(documentType, label) {
  const text = clean(label);
  if (!text) return "";
  const type = clean(documentType).toLowerCase();
  const pattern =
    type === "invoice" ? /invoice#?\s*(.+)$/i : type === "po" ? /po#?\s*(.+)$/i : /rfq#?\s*(.+)$/i;
  const match = text.match(pattern);
  return match ? clean(match[1]).replace(/^#/, "") : "";
}

/**
 * @param {{
 *   documentType?: "quote" | "invoice" | "po",
 *   attachedPdf?: boolean,
 *   toName?: string,
 *   shopName?: string,
 *   kindLabel?: string,
 *   documentLabel?: string,
 *   reference?: string,
 * }} opts
 */
export function buildDefaultSendDocumentEmailBody(opts = {}) {
  const documentType = clean(opts.documentType).toLowerCase() || "quote";
  const attachedPdf = Boolean(opts.attachedPdf);
  const shop = clean(opts.shopName) || (attachedPdf ? "Our shop" : "Electric Motor Shop");
  const name = clean(opts.toName);
  const hi = `Hi${name ? ` ${name}` : ""},`;
  const sign = `— ${shop}`;
  const ref = clean(opts.reference).replace(/^#/, "");
  const label = clean(opts.documentLabel);
  const kind = clean(opts.kindLabel) || "service proposal";

  if (documentType === "po") {
    const poBit = ref ? ` (PO# ${ref})` : "";
    const lines = [
      hi,
      `Please find your purchase order${poBit} from ${shop}.${
        attachedPdf ? " The purchase order is attached as a PDF." : ""
      }`,
    ];
    if (attachedPdf) {
      lines.push("If you have questions, reply to this email or contact us.");
    } else {
      lines.push("View, print, and update delivery status for each line item here.");
      lines.push("You can print the PO from that page and mark line items as Dispatch when shipped.");
    }
    lines.push(sign);
    return lines.join("\n");
  }

  if (documentType === "invoice") {
    if (attachedPdf) {
      return [
        `Please review your invoice ${label || "invoice"}. The document is attached as a PDF.`,
        "If you have questions, reply to this email or contact us.",
        sign,
      ].join("\n");
    }
    return [
      hi,
      `Your invoice${ref ? ` #${ref}` : ""} from ${shop} is ready.`,
      "View and print your invoice here.",
      "You can print or save the invoice as PDF from that page.",
      "If you have questions, reply to this email or contact us directly.",
      sign,
    ].join("\n");
  }

  if (attachedPdf) {
    return [
      `Please review your ${kind} ${label || "service proposal"}. The document is attached as a PDF.`,
      "If you have questions, reply to this email or contact us.",
      sign,
    ].join("\n");
  }

  return [
    hi,
    `Your service proposal${ref ? ` (RFQ# ${ref})` : ""} is ready for your review.`,
    "View your service proposal and approve or reject it here.",
    "You can also print or save the service proposal as PDF from that page.",
    sign,
  ].join("\n");
}

const TEMPLATE_MARKERS = [
  "attached as a PDF",
  "is ready for your review",
  "is ready.",
  "Please find your purchase order",
  "Please review your",
  "View your service proposal",
  "View and print your invoice",
  "View, print, and update delivery status",
];

export function escapeEmailBodyText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when the value already contains markup from the rich-text editor. */
export function isRichEmailHtml(value) {
  return /<\/?[a-z][\s\S]*?>/i.test(String(value || ""));
}

/** Visible text, ignoring tags. An empty editor (`<p><br></p>`) is blank. */
export function emailBodyHasText(value) {
  const raw = String(value || "");
  if (!raw.trim()) return false;
  if (!isRichEmailHtml(raw)) return true;
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0;
}

/** Turn the plain default message into paragraphs the editor can format. */
export function plainEmailBodyToHtml(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return "";
  if (isRichEmailHtml(raw)) return raw;
  return raw
    .split(/\r?\n/)
    .map((line) => `<p>${escapeEmailBodyText(line) || "<br>"}</p>`)
    .join("");
}

const ALLOWED_EMAIL_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "div",
  "span",
  "blockquote",
]);

/** Keep formatting tags from the editor and drop scripts, handlers, and other markup. */
export function sanitizeRichEmailHtml(input) {
  let html = String(input || "");
  html = html.replace(/<!--[\s\S]*?-->/g, "");
  html = html.replace(
    /<a\b[^>]*\bhref\s*=\s*(['"])\s*javascript:[\s\S]*?\1[^>]*>([\s\S]*?)<\/a>/gi,
    "$2"
  );
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|link|meta|form|input|button|textarea)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  html = html.replace(
    /<\s*(script|style|iframe|object|embed|link|meta|form|input|button|textarea)\b[^>]*\/?\s*>/gi,
    ""
  );
  html = html.replace(/<\s*(\/?)\s*([a-z0-9]+)\b([^>]*)>/gi, (full, slash, tag, attrs) => {
    const name = String(tag || "").toLowerCase();
    if (!ALLOWED_EMAIL_TAGS.has(name)) return "";
    if (slash) return `</${name}>`;
    if (name === "br") return "<br>";
    if (name === "a") {
      const hrefMatch = String(attrs || "").match(/\bhref\s*=\s*(['"])(.*?)\1/i);
      let url = hrefMatch ? hrefMatch[2].trim() : "";
      if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url)) {
        if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(url)) url = `https://${url}`;
        else return "";
      }
      return `<a href="${escapeEmailBodyText(url)}" target="_blank" rel="noopener noreferrer">`;
    }
    return `<${name}>`;
  });
  return html.trim();
}

function looksLikeTemplate(text, basePlain) {
  const first = String(basePlain || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) || "";
  const markers = [first, ...TEMPLATE_MARKERS].filter(Boolean);
  return markers.some((marker) => text.includes(marker));
}

/**
 * Keep a previously saved note inside the default body.
 * Returns HTML for the rich-text editor.
 */
export function mergeSavedEmailBody(defaultBody, saved) {
  const note = String(saved || "").trim();
  const base = String(defaultBody || "").trim();
  const baseHtml = plainEmailBodyToHtml(base);
  if (!note) return baseHtml;
  if (isRichEmailHtml(note)) {
    const text = note.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!base || looksLikeTemplate(text, base)) return note;
    const close = baseHtml.indexOf("</p>");
    if (close >= 0) return `${baseHtml.slice(0, close + 4)}${note}${baseHtml.slice(close + 4)}`;
    return `${baseHtml}${note}`;
  }
  if (!base || note === base) return plainEmailBodyToHtml(note);
  if (looksLikeTemplate(note, base)) return plainEmailBodyToHtml(note);
  const lines = base.split("\n");
  const idx = lines.findIndex((line) => line.trim());
  if (idx < 0) return plainEmailBodyToHtml(note);
  const next = [...lines];
  next.splice(idx + 1, 0, "", note);
  return plainEmailBodyToHtml(next.join("\n"));
}
