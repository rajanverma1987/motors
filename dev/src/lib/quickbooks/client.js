import { connectDB } from "@/lib/db";
import QuickBooksConnection from "@/models/QuickBooksConnection";
import { qboApiBaseUrl } from "@/lib/quickbooks/constants";
import { refreshAccessToken } from "@/lib/quickbooks/oauth";

const REFRESH_SKEW_MS = 2 * 60 * 1000;

/**
 * @param {string} ownerEmail
 * @returns {Promise<import("mongoose").LeanDocument | null>}
 */
export async function getActiveConnection(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return null;
  await connectDB();
  return QuickBooksConnection.findOne({ ownerEmail: email, active: true }).lean();
}

/**
 * Ensure access token is valid; refresh and persist if needed.
 * @param {string} ownerEmail
 */
export async function getValidAccessToken(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  await connectDB();
  const conn = await QuickBooksConnection.findOne({ ownerEmail: email, active: true });
  if (!conn) {
    throw new Error("QuickBooks is not connected for this shop.");
  }
  const expiresAt = conn.accessTokenExpiresAt ? new Date(conn.accessTokenExpiresAt).getTime() : 0;
  if (expiresAt - REFRESH_SKEW_MS > Date.now() && conn.accessToken) {
    return { accessToken: conn.accessToken, realmId: conn.realmId, companyName: conn.companyName };
  }
  const tokens = await refreshAccessToken(conn.refreshToken);
  conn.accessToken = tokens.accessToken;
  if (tokens.refreshToken) conn.refreshToken = tokens.refreshToken;
  conn.accessTokenExpiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
  await conn.save();
  return { accessToken: conn.accessToken, realmId: conn.realmId, companyName: conn.companyName };
}

/**
 * @param {string} ownerEmail
 * @param {string} method
 * @param {string} path - e.g. "/customer" or "/query?query=..."
 * @param {object} [body]
 */
export async function qboRequest(ownerEmail, method, path, body) {
  const { accessToken, realmId } = await getValidAccessToken(ownerEmail);
  const url = `${qboApiBaseUrl()}/v3/company/${realmId}${path}${
    path.includes("?") ? "&" : "?"
  }minorversion=65`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
  /** @type {RequestInit} */
  const init = { method, headers };
  if (body != null && method !== "GET") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fault =
      data?.Fault?.Error?.[0]?.Message ||
      data?.Fault?.Error?.[0]?.Detail ||
      data?.fault?.error?.[0]?.message ||
      data?.error ||
      `QuickBooks API error (${res.status})`;
    const err = new Error(String(fault));
    err.status = res.status;
    err.qbo = data;
    throw err;
  }
  return data;
}

/**
 * @param {string} ownerEmail
 * @param {string} query
 */
export async function qboQuery(ownerEmail, query) {
  const q = encodeURIComponent(String(query || "").trim());
  return qboRequest(ownerEmail, "GET", `/query?query=${q}`);
}

/**
 * Fetch company info display name.
 * @param {string} ownerEmail
 */
export async function fetchCompanyName(ownerEmail) {
  try {
    const { realmId } = await getValidAccessToken(ownerEmail);
    const data = await qboRequest(ownerEmail, "GET", `/companyinfo/${realmId}`);
    return String(data?.CompanyInfo?.CompanyName || data?.CompanyInfo?.LegalName || "").trim();
  } catch {
    return "";
  }
}

/**
 * Chart of Accounts for income/expense pickers.
 * @param {string} ownerEmail
 */
export async function listChartOfAccounts(ownerEmail) {
  const data = await qboQuery(
    ownerEmail,
    "select * from Account where Active = true maxresults 1000"
  );
  const rows = data?.QueryResponse?.Account || [];
  return (Array.isArray(rows) ? rows : []).map((a) => ({
    id: String(a.Id || ""),
    name: String(a.Name || "").trim(),
    accountType: String(a.AccountType || "").trim(),
    accountSubType: String(a.AccountSubType || "").trim(),
    classification: String(a.Classification || "").trim(),
  }));
}
