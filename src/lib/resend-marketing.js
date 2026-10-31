import { Resend } from "resend";
import { Webhook } from "standardwebhooks";

const DEFAULT_FROM = "3PhaseFlow <contact@mail.3phaseflow.com>";
const DEFAULT_REPLY_TO = "contact@3phaseflow.com";

function getResendClient() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/**
 * Send a listing marketing email via Resend.
 * @param {{ to: string, subject: string, html: string, tags?: Record<string, string> }} opts
 * @returns {Promise<{ ok: boolean, id?: string, error?: string }>}
 */
export async function sendListingMarketingEmailViaResend({ to, subject, html, tags = {} }) {
  const client = getResendClient();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY is not configured." };
  }

  const from = String(process.env.EMAIL_MARKETING_FROM || DEFAULT_FROM).trim() || DEFAULT_FROM;
  const replyTo =
    String(process.env.EMAIL_MARKETING_REPLY_TO || DEFAULT_REPLY_TO).trim() || DEFAULT_REPLY_TO;

  const tagList = Object.entries(tags)
    .filter(([name, value]) => name && value != null && String(value).trim())
    .map(([name, value]) => ({
      name: String(name).slice(0, 256),
      value: String(value).slice(0, 256),
    }));

  try {
    const { data, error } = await client.emails.send({
      from,
      to: [String(to).trim()],
      replyTo,
      subject: String(subject || "").trim() || "(no subject)",
      html: String(html || ""),
      ...(tagList.length ? { tags: tagList } : {}),
    });
    if (error) {
      return { ok: false, error: error.message || String(error) };
    }
    return { ok: true, id: data?.id || "" };
  } catch (err) {
    return { ok: false, error: err?.message || "Resend send failed" };
  }
}

/**
 * Verify Resend (Svix / standardwebhooks) signature.
 * @param {string} rawBody
 * @param {Headers|Record<string,string>} headers
 * @returns {{ ok: boolean, payload?: object, error?: string }}
 */
export function verifyResendWebhook(rawBody, headers) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    return { ok: false, error: "RESEND_WEBHOOK_SECRET is not configured." };
  }

  const getHeader = (name) => {
    if (typeof headers?.get === "function") return headers.get(name) || "";
    const key = Object.keys(headers || {}).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? String(headers[key] || "") : "";
  };

  try {
    const wh = new Webhook(secret);
    const payload = wh.verify(rawBody, {
      "webhook-id": getHeader("svix-id") || getHeader("webhook-id"),
      "webhook-timestamp": getHeader("svix-timestamp") || getHeader("webhook-timestamp"),
      "webhook-signature": getHeader("svix-signature") || getHeader("webhook-signature"),
    });
    return { ok: true, payload: typeof payload === "string" ? JSON.parse(payload) : payload };
  } catch (err) {
    return { ok: false, error: err?.message || "Invalid webhook signature" };
  }
}
