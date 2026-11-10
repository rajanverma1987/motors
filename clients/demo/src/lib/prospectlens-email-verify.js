import { isValidEmail } from "@/lib/validation";
import { allowsMultipleListingsForEmail } from "@/lib/listing-shared-email";

const VERIFY_URL = "https://prospectslens.com/api/v1/email/verify";

const VERIFY_OPTIONS = {
  smtp: true,
  blockRoleAccounts: false,
  blockCatchAll: true,
  requireSmtp: true,
  timeoutMs: 12000,
};

function getApiKey() {
  return process.env.PROSPECTLENS_API_KEY?.trim() || "";
}

function authHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

function extractApiError(body) {
  if (!body || typeof body !== "object") return null;
  const err = body.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object" && typeof err.message === "string" && err.message.trim()) {
    return err.message.trim();
  }
  if (typeof body.message === "string" && body.message.trim()) return body.message.trim();
  return null;
}

/** ProspectLens returns { success, data: { valid, deliverable, ... } }; docs show flat shape. */
function unwrapProspectLensBody(body) {
  if (!body || typeof body !== "object") return body;
  if (body.success === false) return null;
  const inner = body.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner;
  }
  if (typeof body.valid === "boolean" || body.deliverable != null) {
    return body;
  }
  return body;
}

function isVerifiedResult(result) {
  if (!result || typeof result !== "object") return false;
  return result.valid === true;
}

function invalidMessage(data) {
  const reason = String(data?.reason || "").trim();
  if (reason && reason !== "ok") {
    return `This email appears invalid (${reason.replace(/_/g, " ")}).`;
  }
  const checks = data?.checks || {};
  if (checks.disposable) return "Disposable email addresses are not allowed.";
  if (checks.roleAccount) return "Role accounts (e.g. info@, sales@) are not allowed.";
  if (checks.catchAll) return "Catch-all mailboxes are not allowed.";
  if (checks.format === false) return "Please enter a valid email address.";
  if (checks.mx === false) return "This email domain does not accept mail (no MX records).";
  if (checks.mailboxExists === false) return "This mailbox does not appear to exist.";
  const deliverable = String(data?.deliverable || "").toLowerCase();
  if (deliverable && deliverable !== "yes" && deliverable !== "unknown") {
    return `This email does not appear deliverable (${data.deliverable}).`;
  }
  return "This email address could not be verified. Please use a valid shop contact email.";
}

/**
 * Verify a listing email via ProspectLens. Skips platform shared email and basic format checks.
 * @returns {{ valid: boolean, reason?: string, message?: string|null, skipped?: boolean, score?: number }}
 */
export async function verifyListingEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  if (!norm) {
    return { valid: false, reason: "missing", message: "Email is required." };
  }
  if (allowsMultipleListingsForEmail(norm)) {
    return { valid: true, skipped: true, reason: "platform_shared_email", message: null };
  }
  if (!isValidEmail(norm)) {
    return { valid: false, reason: "format", message: "Please enter a valid email address." };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      valid: false,
      reason: "service_unconfigured",
      message: "Email verification is not configured (PROSPECTLENS_API_KEY).",
    };
  }

  let res;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: authHeaders(apiKey),
      body: JSON.stringify({ email: norm, options: VERIFY_OPTIONS }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return {
      valid: false,
      reason: "service_error",
      message: "Email verification is temporarily unavailable. Try again.",
    };
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const msg = extractApiError(data) || `Email verification failed (HTTP ${res.status}).`;
    return { valid: false, reason: data?.error?.code || "verify_failed", message: msg };
  }

  if (data.success === false) {
    const msg = extractApiError(data) || "Email verification failed.";
    return { valid: false, reason: data?.error?.code || "verify_failed", message: msg };
  }

  const result = unwrapProspectLensBody(data);
  if (!result) {
    const msg = extractApiError(data) || "Email verification failed.";
    return { valid: false, reason: "verify_failed", message: msg };
  }

  const valid = isVerifiedResult(result);

  return {
    valid,
    reason: result.reason || (valid ? "ok" : "invalid"),
    deliverable: result.deliverable,
    score: typeof result.score === "number" ? result.score : undefined,
    message: valid ? null : invalidMessage(result),
  };
}
