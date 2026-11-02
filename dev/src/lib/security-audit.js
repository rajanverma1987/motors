import { connectDB } from "@/lib/db";
import SecurityAuditLog from "@/models/SecurityAuditLog";

function getClientIp(request) {
  const forwarded = request?.headers?.get?.("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request?.headers?.get?.("x-real-ip") || "";
}

function getUserAgent(request) {
  return String(request?.headers?.get?.("user-agent") || "").slice(0, 500);
}

/**
 * Record a security-relevant event (non-blocking on failure).
 * @param {object} params
 * @param {string} params.event
 * @param {Request} [params.request]
 * @param {string} [params.actorEmail]
 * @param {boolean} [params.success]
 * @param {string} [params.path]
 * @param {Record<string, unknown>} [params.metadata]
 */
export async function recordSecurityEvent({
  event,
  request,
  actorEmail = "",
  success = false,
  path = "",
  metadata = {},
}) {
  try {
    await connectDB();
    await SecurityAuditLog.create({
      event,
      actorEmail: String(actorEmail || "").trim().toLowerCase().slice(0, 320),
      ip: request ? getClientIp(request) : "",
      userAgent: request ? getUserAgent(request) : "",
      path: String(path || request?.nextUrl?.pathname || "").slice(0, 500),
      success: !!success,
      metadata,
    });
  } catch (err) {
    console.error("Security audit log failed:", err?.message || err);
  }
}
