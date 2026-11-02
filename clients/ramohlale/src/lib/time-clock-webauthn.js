import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import TimeClockChallenge from "@/models/TimeClockChallenge";
import { getPublicSiteUrl } from "@/lib/public-site-url";

function isLocalHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.endsWith(".localhost");
}

function rpFromUrlString(raw) {
  try {
    const u = new URL(String(raw || "").trim());
    if (!u.hostname) return null;
    return {
      origin: `${u.protocol}//${u.host}`,
      rpID: u.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolve WebAuthn rpID + origin.
 * Prefer the browser Origin header (what the employee actually opened).
 * Never trust Node Host alone on production: IIS/proxies often report localhost.
 */
export function getWebAuthnRpFromRequest(request) {
  const fromOrigin = rpFromUrlString(request.headers.get("origin") || "");
  if (fromOrigin && !isLocalHost(fromOrigin.rpID)) return fromOrigin;

  const referer = String(request.headers.get("referer") || "").trim();
  if (referer) {
    const fromReferer = rpFromUrlString(referer);
    if (fromReferer && !isLocalHost(fromReferer.rpID)) return fromReferer;
  }

  const fromPublic = rpFromUrlString(getPublicSiteUrl(request));
  if (fromPublic && !isLocalHost(fromPublic.rpID)) return fromPublic;

  // Real local/dev only. Never emit localhost RP on a production Node process.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Passkey setup could not resolve the public site domain. Set SITE_URL or NEXT_PUBLIC_SITE_URL on the server."
    );
  }

  if (fromOrigin && isLocalHost(fromOrigin.rpID)) return fromOrigin;

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  let proto = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  if (proto !== "http" && proto !== "https") {
    proto = isLocalHost(hostname) ? "http" : "https";
  }
  return { origin: `${proto}://${host}`, rpID: hostname };
}

export async function storeChallenge({ shopEmail, employeeId, challenge, kind }) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await TimeClockChallenge.create({
    shopEmail: String(shopEmail || "").trim().toLowerCase(),
    employeeId: String(employeeId || "").trim(),
    challenge,
    kind,
    expiresAt,
  });
}

export async function consumeChallenge({ shopEmail, challenge, kind }) {
  const doc = await TimeClockChallenge.findOneAndDelete({
    shopEmail: String(shopEmail || "").trim().toLowerCase(),
    challenge: String(challenge || "").trim(),
    kind,
    expiresAt: { $gt: new Date() },
  }).lean();
  return doc || null;
}

export async function buildRegistrationOptions({
  request,
  shopEmail,
  employee,
  existingPasskeys = [],
}) {
  const rp = getWebAuthnRpFromRequest(request);
  if (!rp) throw new Error("Unable to resolve site origin for passkeys.");
  const excludeCredentials = (existingPasskeys || []).map((p) => ({
    id: p.credentialId,
    transports: Array.isArray(p.transports) ? p.transports : undefined,
  }));
  const options = await generateRegistrationOptions({
    rpName: "Shop Time Clock",
    rpID: rp.rpID,
    userName: String(employee.email || employee.id),
    userDisplayName: String(employee.name || employee.email || "Employee"),
    userID: new TextEncoder().encode(String(employee.id).slice(0, 64)),
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });
  await storeChallenge({
    shopEmail,
    employeeId: String(employee.id),
    challenge: options.challenge,
    kind: "registration",
  });
  return { options, rp };
}

export async function verifyRegistration({
  request,
  shopEmail,
  employeeId,
  response,
  expectedChallenge,
}) {
  const rp = getWebAuthnRpFromRequest(request);
  if (!rp) throw new Error("Unable to resolve site origin for passkeys.");
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
  });
  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration failed.");
  }
  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  return {
    credentialId: credential.id,
    publicKey: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports || [],
    credentialDeviceType,
    credentialBackedUp,
  };
}

export async function buildAuthenticationOptions({ request, shopEmail, allowCredentials = [] }) {
  const rp = getWebAuthnRpFromRequest(request);
  if (!rp) throw new Error("Unable to resolve site origin for passkeys.");
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "required",
    allowCredentials: allowCredentials.length
      ? allowCredentials.map((p) => ({
          id: p.credentialId,
          transports: Array.isArray(p.transports) ? p.transports : undefined,
        }))
      : undefined,
  });
  await storeChallenge({
    shopEmail,
    employeeId: "",
    challenge: options.challenge,
    kind: "authentication",
  });
  return { options, rp };
}

export async function verifyAuthentication({
  request,
  shopEmail,
  response,
  expectedChallenge,
  passkey,
}) {
  const rp = getWebAuthnRpFromRequest(request);
  if (!rp) throw new Error("Unable to resolve site origin for passkeys.");
  const publicKey = isoBase64URL.toBuffer(passkey.publicKey);
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: rp.origin,
    expectedRPID: rp.rpID,
    requireUserVerification: true,
    credential: {
      id: passkey.credentialId,
      publicKey,
      counter: passkey.counter || 0,
      transports: passkey.transports,
    },
  });
  if (!verification.verified) {
    throw new Error("Passkey verification failed.");
  }
  return {
    newCounter: verification.authenticationInfo.newCounter,
  };
}
