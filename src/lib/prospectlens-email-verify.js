import { isValidEmail } from "@/lib/validation";
import { allowsMultipleListingsForEmail } from "@/lib/listing-shared-email";

const VERIFY_URL = "https://prospectslens.com/api/v1/email/verify";

const VERIFY_OPTIONS = {
  smtp: true,
  blockRoleAccounts: true,
  blockCatchAll: true,
  requireSmtp: true,
  timeoutMs: 12000,
};

function getApiKey() {
  return process.env.PROSPECTLENS_API_KEY?.trim() || "";
}

function maskEmail(email) {
  const s = String(email || "");
  const at = s.indexOf("@");
  if (at <= 1) return "***";
  return `${s.slice(0, 2)}***${s.slice(at)}`;
}

function logVerify(step, payload) {
  console.log("[ProspectLens email verify]", step, payload);
}

/** ProspectLens returns { success, data: { valid, deliverable, ... } }; docs show flat shape. */
function unwrapProspectLensBody(body) {
  if (!body || typeof body !== "object") return body;
  const inner = body.data;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner;
  }
  return body;
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
  if (data?.deliverable && data.deliverable !== "yes") {
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
  logVerify("start", { email: maskEmail(norm) });

  if (!norm) {
    logVerify("reject", { reason: "missing" });
    return { valid: false, reason: "missing", message: "Email is required." };
  }
  if (allowsMultipleListingsForEmail(norm)) {
    logVerify("skip", { reason: "platform_shared_email" });
    return { valid: true, skipped: true, reason: "platform_shared_email", message: null };
  }
  if (!isValidEmail(norm)) {
    logVerify("reject", { reason: "format" });
    return { valid: false, reason: "format", message: "Please enter a valid email address." };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    logVerify("reject", { reason: "service_unconfigured", hasApiKey: false });
    return {
      valid: false,
      reason: "service_unconfigured",
      message: "Email verification is not configured (PROSPECTLENS_API_KEY).",
    };
  }

  logVerify("request", {
    url: VERIFY_URL,
    email: maskEmail(norm),
    hasApiKey: true,
    options: VERIFY_OPTIONS,
  });

  let res;
  try {
    res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ email: norm, options: VERIFY_OPTIONS }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    logVerify("fetch_error", {
      email: maskEmail(norm),
      name: err?.name,
      message: err?.message,
    });
    return {
      valid: false,
      reason: "service_error",
      message: "Email verification is temporarily unavailable. Try again.",
    };
  }

  const rawText = await res.text();
  let data = {};
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch (parseErr) {
    logVerify("parse_error", {
      email: maskEmail(norm),
      status: res.status,
      statusText: res.statusText,
      rawPreview: rawText.slice(0, 500),
      parseError: parseErr?.message,
    });
    data = {};
  }

  logVerify("response", {
    email: maskEmail(norm),
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    body: data,
    rawLength: rawText.length,
  });

  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "Email verification failed.";
    logVerify("reject", {
      email: maskEmail(norm),
      reason: data?.reason || "verify_failed",
      httpStatus: res.status,
      message: msg,
    });
    return { valid: false, reason: data?.reason || "verify_failed", message: msg };
  }

  /** ProspectLens wraps payload as { success, data: { valid, deliverable, ... } }. */
  const result = unwrapProspectLensBody(data);

  const valid = result.valid === true && result.deliverable === "yes";
  const message = valid ? null : invalidMessage(result);
  logVerify(valid ? "accept" : "reject", {
    email: maskEmail(norm),
    computedValid: valid,
    apiValid: result.valid,
    deliverable: result.deliverable,
    reason: result.reason,
    score: result.score,
    checks: result.checks,
    smtp: result.smtp,
    unwrappedFromDataField: result !== data,
    message,
  });

  return {
    valid,
    reason: result.reason || (valid ? "ok" : "invalid"),
    deliverable: result.deliverable,
    score: typeof result.score === "number" ? result.score : undefined,
    message,
  };
}
