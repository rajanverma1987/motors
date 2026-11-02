import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

export function generateTenantKey() {
  return `3pf_${randomBytes(24).toString("base64url")}`;
}

export function generateHandoffSecret() {
  return randomBytes(32).toString("hex");
}

export async function hashTenantKey(plain) {
  return bcrypt.hash(String(plain), 10);
}

export async function verifyTenantKey(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(String(plain), String(hash));
}

export function signPlatformPayload(secret, bodyObj) {
  const body = typeof bodyObj === "string" ? bodyObj : JSON.stringify(bodyObj);
  const ts = String(Date.now());
  const jti = randomBytes(12).toString("hex");
  const sig = createHmac("sha256", secret).update(`${ts}.${jti}.${body}`).digest("hex");
  return { body, ts, jti, sig };
}

export function verifyPlatformPayload(secret, { body, ts, jti, sig }, { maxSkewMs = 120000 } = {}) {
  if (!secret || !body || !ts || !jti || !sig) return { ok: false, error: "Missing signature fields" };
  const age = Math.abs(Date.now() - Number(ts));
  if (!Number.isFinite(age) || age > maxSkewMs) return { ok: false, error: "Timestamp expired" };
  const expected = createHmac("sha256", secret).update(`${ts}.${jti}.${body}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: "Bad signature" };
  return { ok: true, jti };
}

export function signSupportHandoff(secret, payload) {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return Buffer.from(JSON.stringify({ ...payload, sig }), "utf8").toString("base64url");
}

export function verifySupportHandoff(secret, token) {
  try {
    const raw = JSON.parse(Buffer.from(String(token), "base64url").toString("utf8"));
    const { sig, ...payload } = raw || {};
    const body = JSON.stringify(payload);
    const expected = createHmac("sha256", secret).update(body).digest("base64url");
    const a = Buffer.from(expected);
    const b = Buffer.from(String(sig || ""));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (!payload.exp || Date.now() > Number(payload.exp)) return null;
    return payload;
  } catch {
    return null;
  }
}
