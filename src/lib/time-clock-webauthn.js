import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import TimeClockChallenge from "@/models/TimeClockChallenge";

function getRequestOrigin(request) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (!host) return null;
  let proto = (request.headers.get("x-forwarded-proto") || "").split(",")[0].trim().toLowerCase();
  if (proto !== "http" && proto !== "https") {
    const hostname = host.split(":")[0].toLowerCase();
    proto =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost")
        ? "http"
        : "https";
  }
  return { origin: `${proto}://${host}`, rpID: host.split(":")[0] };
}

export function getWebAuthnRpFromRequest(request) {
  return getRequestOrigin(request);
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
