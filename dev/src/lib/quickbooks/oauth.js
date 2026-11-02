import crypto from "crypto";
import {
  QBO_OAUTH_SCOPE,
  intuitAuthBaseUrl,
  intuitClientId,
  intuitClientSecret,
  intuitConfigured,
  intuitRedirectUri,
  intuitRevokeUrl,
  intuitTokenUrl,
} from "@/lib/quickbooks/constants";

function basicAuthHeader() {
  return `Basic ${Buffer.from(`${intuitClientId()}:${intuitClientSecret()}`).toString("base64")}`;
}

function stateSecret() {
  return (
    process.env.INTUIT_STATE_SECRET ||
    process.env.JWT_SECRET ||
    process.env.PORTAL_JWT_SECRET ||
    "motors-qbo-state-dev"
  );
}

/**
 * Signed OAuth state (owner email + nonce + expiry).
 * @param {string} ownerEmail
 */
export function createOAuthState(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ e: email, n: nonce, exp }), "utf8").toString(
    "base64url"
  );
  const sig = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * @param {string} state
 * @returns {{ email: string } | null}
 */
export function verifyOAuthState(state) {
  const raw = String(state || "").trim();
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.e || !data?.exp || Date.now() > Number(data.exp)) return null;
    return { email: String(data.e).trim().toLowerCase() };
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(ownerEmail) {
  if (!intuitConfigured()) {
    throw new Error("QuickBooks is not configured (INTUIT_CLIENT_ID / SECRET / REDIRECT_URI).");
  }
  const state = createOAuthState(ownerEmail);
  const params = new URLSearchParams({
    client_id: intuitClientId(),
    redirect_uri: intuitRedirectUri(),
    response_type: "code",
    scope: QBO_OAUTH_SCOPE,
    state,
  });
  const base = intuitAuthBaseUrl();
  if (!/^https:\/\/appcenter\.intuit\.com/i.test(base)) {
    throw new Error(
      `Invalid QuickBooks authorize URL "${base}". Expected https://appcenter.intuit.com/connect/oauth2`
    );
  }
  const url = new URL(base);
  url.search = params.toString();
  return url.toString();
}

/**
 * @param {string} code
 */
export async function exchangeAuthorizationCode(code) {
  if (!intuitConfigured()) {
    throw new Error("QuickBooks is not configured.");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: String(code || "").trim(),
    redirect_uri: intuitRedirectUri(),
  });
  const res = await fetch(intuitTokenUrl(), {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "QuickBooks token exchange failed");
  }
  return {
    accessToken: String(data.access_token || ""),
    refreshToken: String(data.refresh_token || ""),
    expiresIn: Number(data.expires_in) || 3600,
  };
}

/**
 * @param {string} refreshToken
 */
export async function refreshAccessToken(refreshToken) {
  if (!intuitConfigured()) {
    throw new Error("QuickBooks is not configured.");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: String(refreshToken || "").trim(),
  });
  const res = await fetch(intuitTokenUrl(), {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || "QuickBooks token refresh failed");
  }
  return {
    accessToken: String(data.access_token || ""),
    refreshToken: String(data.refresh_token || refreshToken),
    expiresIn: Number(data.expires_in) || 3600,
  };
}

/**
 * Best-effort revoke (ignore failures).
 * @param {string} token
 */
export async function revokeToken(token) {
  if (!token || !intuitConfigured()) return;
  try {
    await fetch(intuitRevokeUrl(), {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token: String(token) }),
    });
  } catch {
    /* ignore */
  }
}
