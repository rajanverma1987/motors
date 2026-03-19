import crypto from "crypto";
import { connectDB } from "@/lib/db";
import IntegrationApiKey from "@/models/IntegrationApiKey";

const KEY_PREFIX = "motors_sk";

function sha256(v) {
  return crypto.createHash("sha256").update(v).digest("hex");
}

export function generatePlainIntegrationKey() {
  const secret = crypto.randomBytes(24).toString("hex");
  const key = `${KEY_PREFIX}_${secret}`;
  const keyPrefix = key.slice(0, 14);
  return { key, keyPrefix, keyHash: sha256(key) };
}

export function normalizeApiKeyFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  const xKey = request.headers.get("x-api-key") || request.headers.get("x-client-secret") || "";
  if (xKey.trim()) return xKey.trim();
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function authenticateIntegrationApiKey(request) {
  const key = normalizeApiKeyFromRequest(request);
  if (!key) return { ok: false, error: "Missing API key." };
  const keyHash = sha256(key);
  await connectDB();
  const doc = await IntegrationApiKey.findOne({ keyHash, active: true }).lean();
  if (!doc) return { ok: false, error: "Invalid API key." };
  if (doc.expiresAt && new Date(doc.expiresAt) <= new Date()) {
    return { ok: false, error: "API key expired." };
  }
  await IntegrationApiKey.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } });
  return {
    ok: true,
    ownerEmail: String(doc.ownerEmail || "").trim().toLowerCase(),
    keyId: String(doc._id),
    scopes: Array.isArray(doc.scopes) && doc.scopes.length ? doc.scopes : ["*"],
  };
}

