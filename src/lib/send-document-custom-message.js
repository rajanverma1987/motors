import { clampString } from "@/lib/validation";

const CUSTOM_MESSAGE_MAX = 2000;

/** Parse optional custom email note from send preview POST body. */
export async function parseSendDocumentCustomMessage(request) {
  try {
    const body = await request.json();
    return clampString(body?.customMessage, CUSTOM_MESSAGE_MAX);
  } catch {
    return "";
  }
}

export const SEND_DOCUMENT_CUSTOM_MESSAGE_MAX = CUSTOM_MESSAGE_MAX;
