import { clampString } from "@/lib/validation";

const CUSTOM_MESSAGE_MAX = 2000;
const CC_MAX_LENGTH = 500;
const CC_MAX_ADDRESSES = 10;
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

/**
 * Parse comma- or semicolon-separated Cc addresses.
 * @param {unknown} raw
 * @returns {{ ccEmails: string[], error: string | null }}
 */
export function parseCcEmailList(raw) {
  const str = String(raw ?? "").trim();
  if (!str) return { ccEmails: [], error: null };
  if (str.length > CC_MAX_LENGTH) {
    return { ccEmails: [], error: `Cc must be ${CC_MAX_LENGTH} characters or fewer.` };
  }
  const parts = str.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
  const invalid = [];
  const valid = [];
  for (const p of parts) {
    if (EMAIL_RX.test(p)) valid.push(p);
    else invalid.push(p);
  }
  if (invalid.length) {
    return { ccEmails: [], error: `Invalid Cc email: ${invalid[0]}` };
  }
  const deduped = [...new Set(valid.map((e) => e.toLowerCase()))];
  if (deduped.length > CC_MAX_ADDRESSES) {
    return { ccEmails: [], error: `Cc is limited to ${CC_MAX_ADDRESSES} addresses.` };
  }
  return { ccEmails: deduped, error: null };
}

/** Parse optional custom note and Cc list from send preview POST body. */
export async function parseSendDocumentEmailBody(request) {
  try {
    const body = await request.json();
    const customMessage = clampString(body?.customMessage, CUSTOM_MESSAGE_MAX);
    const { ccEmails, error: ccError } = parseCcEmailList(body?.cc);
    return { customMessage, ccEmails, ccError };
  } catch {
    return { customMessage: "", ccEmails: [], ccError: null };
  }
}

/** Parse optional custom email note from send preview POST body. */
export async function parseSendDocumentCustomMessage(request) {
  const { customMessage } = await parseSendDocumentEmailBody(request);
  return customMessage;
}

export const SEND_DOCUMENT_CUSTOM_MESSAGE_MAX = CUSTOM_MESSAGE_MAX;
export const SEND_DOCUMENT_CC_MAX_LENGTH = CC_MAX_LENGTH;
