import Constants from "expo-constants";

const FETCH_TIMEOUT_MS = 20000;
const PROD_API = "https://iqmotorbase.com";

/** Inlined at bundle time (`eas update` / Metro). Prefer this over Constants in Expo Go. */
const BUNDLED_API_URL = String(process.env.EXPO_PUBLIC_API_URL || "").trim();

export class ApiError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/** Backend rejected this session (banned, revoked, or invalid/expired token). */
export function isAuthRejected(err) {
  const status = Number(err?.status) || 0;
  const code = String(err?.code || "");
  if (status === 401 || status === 403) return true;
  return code === "AUTH_REQUIRED" || code === "LOGIN_REVOKED";
}

function isHtmlBody(text) {
  const t = String(text || "").trim();
  return t.startsWith("<!") || /^<html/i.test(t) || /<!DOCTYPE/i.test(t);
}

function looksHttps(url) {
  return /^https:\/\//i.test(String(url || ""));
}

export function getApiBase() {
  const raw = (BUNDLED_API_URL || String(Constants.expoConfig?.extra?.apiUrl || "")).trim().replace(/\/$/, "");
  if (looksHttps(raw) && !/localhost|127\.0\.0\.1/i.test(raw)) {
    return raw;
  }
  return PROD_API;
}

export async function appFetch(path, opts = {}) {
  const { token, method = "GET", body } = opts;
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const name = e?.name;
    const msg = e?.message || "";
    if (name === "AbortError") {
      throw new ApiError(`Request timed out. Server: ${base}`, { status: 0, code: "TIMEOUT" });
    }
    if (/network request failed|failed to fetch|load failed/i.test(msg) || name === "TypeError") {
      throw new ApiError(`Cannot reach IQWireCalculator API at ${base}`, { status: 0, code: "NETWORK" });
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  if (isHtmlBody(text)) {
    if (res.status === 404) {
      throw new ApiError(
        `API not on this server yet (${path}). Deploy the latest IQMotorBase website, then try again.\n${base}`,
        { status: 404, code: "NOT_FOUND" }
      );
    }
    throw new ApiError(`Server returned a web page instead of JSON (${res.status}).\n${url}`, {
      status: res.status,
      code: "HTML",
    });
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: "Invalid response from server" };
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || res.statusText || "Request failed", {
      status: res.status,
      code: (data && data.code) || "",
    });
  }
  return data;
}
