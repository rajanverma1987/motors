/**
 * Client-side / API entitlement from platform subscription status.
 * Daily check; 7-day grace with notice; then soft paywall.
 */

export const GRACE_DAYS = 7;

export function computeEntitlement({ status, expiresAt, now = new Date() } = {}) {
  const s = String(status || "unknown").toLowerCase();
  const exp = expiresAt ? new Date(expiresAt) : null;
  const expired =
    s === "expired" ||
    s === "cancelled" ||
    (exp && !Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime());

  if (!expired && (s === "active" || s === "trialing" || s === "trial")) {
    return {
      access: "full",
      grace: false,
      paywall: false,
      notice: null,
      revokeAt: null,
    };
  }

  if (!expired) {
    return { access: "full", grace: false, paywall: false, notice: null, revokeAt: null };
  }

  const base = exp && !Number.isNaN(exp.getTime()) ? exp : now;
  const revokeAt = new Date(base.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  if (now.getTime() <= revokeAt.getTime()) {
    return {
      access: "grace",
      grace: true,
      paywall: false,
      notice: `Your subscription has expired. Access to the platform will revoke after ${GRACE_DAYS} days of expiration (${revokeAt.toISOString().slice(0, 10)}).`,
      revokeAt: revokeAt.toISOString(),
    };
  }

  return {
    access: "paywall",
    grace: false,
    paywall: true,
    notice: "Your subscription grace period has ended. Renew to continue using the dashboards.",
    revokeAt: revokeAt.toISOString(),
  };
}
