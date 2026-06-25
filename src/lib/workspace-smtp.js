import nodemailer from "nodemailer";
import { getTransporter } from "@/lib/email-transport";
import {
  normalizeWorkspaceSmtpFields,
  workspaceSmtpIsComplete,
  resolveWorkspaceSmtpSecure,
  humanizeSmtpConnectionError,
} from "@/lib/workspace-smtp-fields";

const platformFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || "";

/** @param {ReturnType<typeof normalizeWorkspaceSmtpFields>} cfg */
export function createWorkspaceSmtpTransport(cfg) {
  if (!workspaceSmtpIsComplete(cfg)) return null;
  const secure = resolveWorkspaceSmtpSecure(cfg.smtpPort, cfg.smtpSecure);
  return nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPassword,
    },
    ...(cfg.smtpPort === 587 && !secure ? { requireTLS: true } : {}),
  });
}

/** @param {string} name @param {string} email */
export function formatWorkspaceSmtpFrom(name, email) {
  const em = String(email || "").trim();
  if (!em) return platformFrom;
  const nm = String(name || "").trim().replace(/"/g, "'");
  if (nm) return `"${nm}" <${em}>`;
  return em;
}

/**
 * Pick shop SMTP when enabled, otherwise platform transporter.
 * @param {object} mergedSettings mergeUserSettings() output
 * @param {string} [shopCompanyName]
 */
export function resolveCustomerMailDelivery(mergedSettings, shopCompanyName = "") {
  const smtp = normalizeWorkspaceSmtpFields(mergedSettings);
  if (smtp.smtpEnabled) {
    if (!workspaceSmtpIsComplete(smtp)) {
      return {
        transport: null,
        from: null,
        usedWorkspaceSmtp: false,
        error:
          "Workspace SMTP is enabled but incomplete. Open Settings → SMTP and save host, username, password, and from email.",
      };
    }
    const transport = createWorkspaceSmtpTransport(smtp);
    if (!transport) {
      return {
        transport: null,
        from: null,
        usedWorkspaceSmtp: false,
        error: "Could not create workspace SMTP transport. Check Settings → SMTP.",
      };
    }
    return {
      transport,
      from: formatWorkspaceSmtpFrom(smtp.smtpFromName || shopCompanyName, smtp.smtpFromEmail),
      usedWorkspaceSmtp: true,
      error: null,
    };
  }
  return {
    transport: getTransporter(),
    from: platformFrom,
    usedWorkspaceSmtp: false,
    error: null,
  };
}

/** @param {ReturnType<typeof normalizeWorkspaceSmtpFields>} cfg */
export async function verifyWorkspaceSmtpConnection(cfg) {
  const transport = createWorkspaceSmtpTransport(cfg);
  if (!transport) {
    return {
      ok: false,
      error: "Complete host, username, password, and from email, and enable workspace SMTP.",
    };
  }
  try {
    await transport.verify();
    return { ok: true, message: "SMTP connection successful." };
  } catch (err) {
    return { ok: false, error: humanizeSmtpConnectionError(err) };
  } finally {
    try {
      transport.close();
    } catch (_) {
      /* ignore */
    }
  }
}
