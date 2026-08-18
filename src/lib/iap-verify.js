import { createPublicKey, X509Certificate } from "crypto";
import { compactVerify, importPKCS8, SignJWT } from "jose";
import {
  MOBILE_APP_IAP_ANDROID_PACKAGE,
  MOBILE_APP_IAP_IOS_BUNDLE,
  MOBILE_APP_IAP_PRODUCT_ID,
} from "@/lib/mobile-app-subscription";

/** Public Apple Root CA - G3. Not a secret. Used to validate StoreKit 2 JWS x5c chains. */
const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTdD2UMWRn5otNNwA5U+HbP1vMrJND/EXd8WqgR
O+sFa2RneRGGXx6LLSfRZuSXg167IfZ3Vv8tj7Ytr5WYxWSbj+ZosZdZxQ7YwP9G
3Gpvuj2h7wIDAQABo0IwQDAdBgNVHQ4EFgQUK9BpR5R2Cf70a40uQKb3R01/J2cw
DgYDVR0PAQH/BAQDAgEGMA8GA1UEEwEB/wQFMAMBAf8wCgYIKoZIzj0EAwMDaAAw
ZQIxAO06w0RwuyBGKc+5bP84e62lD/2UMRwRkUM3I1zP7piP3oY3nU4O8oE+zP3Z
sAwxAjAu7jrs+8gfeCOl/1NiBFfrsM/2x9R4mZ+dLZd+BypoE0oBntA7fEgLmeU=
-----END CERTIFICATE-----`;

function derB64ToPem(b64) {
  const body = String(b64 || "")
    .replace(/\s/g, "")
    .match(/.{1,64}/g);
  if (!body) throw new Error("Invalid Apple certificate.");
  return `-----BEGIN CERTIFICATE-----\n${body.join("\n")}\n-----END CERTIFICATE-----\n`;
}

function assertAppleChain(x5c) {
  if (!Array.isArray(x5c) || x5c.length < 2) {
    throw new Error("Apple receipt is missing its certificate chain.");
  }
  const certs = x5c.map((entry) => new X509Certificate(derB64ToPem(entry)));
  const root = new X509Certificate(APPLE_ROOT_CA_G3_PEM);
  for (let i = 0; i < certs.length - 1; i += 1) {
    if (!certs[i].verify(certs[i + 1].publicKey)) {
      throw new Error("Apple receipt certificate chain is invalid.");
    }
  }
  const last = certs[certs.length - 1];
  const lastIsRoot = last.fingerprint256 === root.fingerprint256;
  if (lastIsRoot) return;
  if (!last.verify(root.publicKey)) {
    throw new Error("Apple receipt is not signed by Apple.");
  }
}

export async function verifyAppleSignedTransaction(jws) {
  const raw = String(jws || "").trim();
  const parts = raw.split(".");
  if (parts.length !== 3) throw new Error("Invalid Apple transaction.");
  let header;
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    throw new Error("Invalid Apple transaction header.");
  }
  const x5c = header.x5c;
  assertAppleChain(x5c);
  const leafPem = derB64ToPem(x5c[0]);
  const key = createPublicKey(leafPem);
  const { payload } = await compactVerify(raw, key);
  let claims;
  try {
    claims = JSON.parse(new TextDecoder().decode(payload));
  } catch {
    throw new Error("Invalid Apple transaction payload.");
  }
  const productId = String(claims.productId || "");
  const bundleId = String(claims.bundleId || "");
  if (productId !== MOBILE_APP_IAP_PRODUCT_ID) {
    throw new Error("This purchase is not the IQWireCalculator monthly subscription.");
  }
  if (bundleId && bundleId !== MOBILE_APP_IAP_IOS_BUNDLE) {
    throw new Error("This purchase belongs to a different app.");
  }
  const expiresMs = Number(claims.expiresDate || 0);
  if (!expiresMs || expiresMs <= Date.now()) {
    throw new Error("This Apple subscription is not active.");
  }
  return {
    platform: "ios",
    productId,
    transactionId: String(claims.transactionId || ""),
    originalTransactionId: String(claims.originalTransactionId || ""),
    purchaseToken: raw,
    expiresAt: new Date(expiresMs),
    environment: String(claims.environment || ""),
  };
}

function googleServiceAccount() {
  const raw = String(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function googlePlayAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(sa.private_key, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/androidpublisher" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error("Could not authenticate with Google Play.");
  }
  return data.access_token;
}

export async function verifyGooglePlaySubscription(purchaseToken) {
  const sa = googleServiceAccount();
  if (!sa?.private_key || !sa?.client_email) {
    const err = new Error("Google Play verification is not configured yet.");
    err.code = "GOOGLE_CREDENTIALS_MISSING";
    throw err;
  }
  const token = String(purchaseToken || "").trim();
  if (!token) throw new Error("Missing Google Play purchase token.");
  const access = await googlePlayAccessToken(sa);
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(MOBILE_APP_IAP_ANDROID_PACKAGE)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(token)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Google Play could not verify this purchase.");
  }
  const line = Array.isArray(data.lineItems) ? data.lineItems[0] : null;
  const productId = String(line?.productId || data.productId || "");
  if (productId && productId !== MOBILE_APP_IAP_PRODUCT_ID) {
    throw new Error("This purchase is not the IQWireCalculator monthly subscription.");
  }
  const expiry = line?.expiryTime || data.expiryTime || "";
  const expiresAt = expiry ? new Date(expiry) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    throw new Error("This Google Play subscription is not active.");
  }
  return {
    platform: "android",
    productId: productId || MOBILE_APP_IAP_PRODUCT_ID,
    transactionId: String(data.latestOrderId || data.orderId || ""),
    originalTransactionId: String(data.latestOrderId || data.orderId || ""),
    purchaseToken: token,
    expiresAt,
  };
}
