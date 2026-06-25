/** Client-safe SMTP field normalization (no nodemailer). */

export const WORKSPACE_SMTP_DEFAULTS = {
  smtpEnabled: false,
  smtpHost: "",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  smtpFromName: "",
};

/** @param {number} port @param {boolean} smtpSecure */
export function resolveWorkspaceSmtpSecure(port, smtpSecure) {
  const p = Number(port) || 587;
  if (p === 465) return true;
  if (p === 587 || p === 25 || p === 2525) return false;
  return smtpSecure === true;
}

/** @param {unknown} err */
export function humanizeSmtpConnectionError(err) {
  const msg = String(err?.message || err || "").trim();
  if (!msg) return "SMTP connection failed.";
  if (msg.includes("wrong version number") || msg.includes("0A00010B")) {
    return "SSL/TLS settings do not match the port. Use port 587 with “Use SSL/TLS” off (STARTTLS), or port 465 with it on.";
  }
  if (msg.includes("ECONNREFUSED")) {
    return "Could not connect to the SMTP server. Check the host and port.";
  }
  if (msg.includes("Invalid login") || msg.includes("authentication failed") || msg.includes("535")) {
    return "SMTP login failed. Check username and password (use an app password if your provider requires it).";
  }
  return msg.length > 220 ? `${msg.slice(0, 220)}…` : msg;
}

/** @param {unknown} raw */
export function normalizeWorkspaceSmtpFields(raw) {
  const s = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const portNum = Number(s.smtpPort);
  const port = Number.isFinite(portNum) && portNum > 0 && portNum <= 65535 ? Math.round(portNum) : 587;
  const smtpSecure = resolveWorkspaceSmtpSecure(port, s.smtpSecure === true);
  return {
    smtpEnabled: s.smtpEnabled === true,
    smtpHost: String(s.smtpHost ?? "").trim().slice(0, 255),
    smtpPort: port,
    smtpSecure,
    smtpUser: String(s.smtpUser ?? "").trim().slice(0, 255),
    smtpPassword: String(s.smtpPassword ?? ""),
    smtpFromEmail: String(s.smtpFromEmail ?? "").trim().slice(0, 255).toLowerCase(),
    smtpFromName: String(s.smtpFromName ?? "").trim().slice(0, 120),
  };
}

/** @param {ReturnType<typeof normalizeWorkspaceSmtpFields>} cfg */
export function workspaceSmtpIsComplete(cfg) {
  if (!cfg?.smtpEnabled) return false;
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPassword || !cfg.smtpFromEmail) return false;
  return true;
}

/**
 * SMTP delivery status for customer/vendor email preview and send UI.
 * @param {object} mergedSettings
 * @returns {{ status: "ready" | "not_configured" | "incomplete", message: string | null, canSend: boolean }}
 */
export function getWorkspaceSmtpDeliveryNotice(mergedSettings) {
  const smtp = normalizeWorkspaceSmtpFields(mergedSettings);
  if (workspaceSmtpIsComplete(smtp)) {
    return { status: "ready", message: null, canSend: true };
  }
  if (smtp.smtpEnabled) {
    return {
      status: "incomplete",
      message:
        "Workspace SMTP is enabled but incomplete. Open Settings → SMTP and save host, username, password, and from email before sending.",
      canSend: false,
    };
  }
  return {
    status: "not_configured",
    message:
      "Workspace SMTP is not set up. This email will be sent from IQMotorBase. Go to Settings → SMTP to send from your shop address.",
    canSend: true,
  };
}

/**
 * Merge request body over stored settings for test/save.
 * @param {object} body
 * @param {object} stored merged settings including password
 */
export function mergeWorkspaceSmtpPatch(body, stored) {
  const base = normalizeWorkspaceSmtpFields(stored);
  const patch = normalizeWorkspaceSmtpFields(body);
  const passwordIncoming = body?.smtpPassword;
  const keepPassword =
    passwordIncoming === undefined ||
    passwordIncoming === null ||
    String(passwordIncoming).trim() === "";
  return {
    ...base,
    ...patch,
    smtpPassword: keepPassword ? base.smtpPassword : String(passwordIncoming),
  };
}

/** Strip password before sending settings to the browser. */
export function userSettingsForClient(stored) {
  const s = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
  const smtp = normalizeWorkspaceSmtpFields(s);
  return {
    ...s,
    ...WORKSPACE_SMTP_DEFAULTS,
    ...smtp,
    smtpPassword: "",
    smtpPasswordConfigured: Boolean(String(smtp.smtpPassword || "").trim()),
  };
}

/** @param {Record<string, unknown>} body */
export function sanitizeWorkspaceSmtpPatch(body) {
  if (!body || typeof body !== "object") return {};
  const out = {};
  if (typeof body.smtpEnabled === "boolean") out.smtpEnabled = body.smtpEnabled;
  if (body.smtpHost !== undefined) out.smtpHost = String(body.smtpHost ?? "").trim().slice(0, 255);
  if (body.smtpPort !== undefined) {
    const portNum = Number(body.smtpPort);
    if (Number.isFinite(portNum) && portNum > 0 && portNum <= 65535) {
      out.smtpPort = Math.round(portNum);
    }
  }
  if (typeof body.smtpSecure === "boolean") out.smtpSecure = body.smtpSecure;
  if (body.smtpUser !== undefined) out.smtpUser = String(body.smtpUser ?? "").trim().slice(0, 255);
  if (body.smtpFromEmail !== undefined) {
    out.smtpFromEmail = String(body.smtpFromEmail ?? "").trim().slice(0, 255).toLowerCase();
  }
  if (body.smtpFromName !== undefined) {
    out.smtpFromName = String(body.smtpFromName ?? "").trim().slice(0, 120);
  }
  const pw = body.smtpPassword;
  if (pw !== undefined && pw !== null && String(pw).trim() !== "") {
    out.smtpPassword = String(pw);
  }
  return out;
}
