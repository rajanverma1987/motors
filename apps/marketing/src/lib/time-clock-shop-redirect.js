import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";

const TOKEN_RE = /^[a-f0-9]{16,128}$/i;
const CACHE_MS = 5 * 60 * 1000;

/** @type {Map<string, { origin: string, expires: number }>} */
const cache = new Map();

function withDbName(uri, dbName) {
  const u = new URL(uri);
  u.pathname = `/${dbName}`;
  return u.toString();
}

function shopOrigin(host) {
  const name = String(host || "").trim().toLowerCase();
  if (!name || name.includes("/") || name.includes("..")) return "";
  return `https://${name}`;
}

async function shopHasToken(uri, token) {
  const conn = await mongoose.createConnection(uri).asPromise();
  try {
    const hit = await conn.db.collection("usersettings").findOne(
      { "settings.timeClockToken": token },
      { projection: { _id: 1 } }
    );
    return Boolean(hit);
  } finally {
    await conn.close().catch(() => {});
  }
}

/**
 * Shop origin for a time clock token, using the same tenant list as admin.
 * @param {string} token
 * @returns {Promise<string>} https://shop-host or ""
 */
export async function findTimeClockShopOrigin(token) {
  const key = String(token || "").trim();
  if (!TOKEN_RE.test(key)) return "";
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.origin;

  await dbConnect();
  const baseUri = String(process.env.MONGODB_URI || "").trim();
  if (!baseUri) return "";
  const tenants = await Tenant.find({ status: { $ne: "disabled" } })
    .select("host mongoDbName")
    .lean();

  let origin = "";
  for (const tenant of tenants) {
    const nextOrigin = shopOrigin(tenant.host);
    const dbName = String(tenant.mongoDbName || "").trim();
    if (!nextOrigin || !dbName) continue;
    try {
      const found = await shopHasToken(withDbName(baseUri, dbName), key);
      if (found) {
        origin = nextOrigin;
        break;
      }
    } catch (err) {
      console.error("Time clock shop lookup failed:", tenant.host, err?.message || err);
    }
  }

  if (origin) cache.set(key, { origin, expires: Date.now() + CACHE_MS });
  return origin;
}
