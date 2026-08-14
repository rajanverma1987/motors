import { Platform } from "react-native";
import Constants from "expo-constants";

const FETCH_TIMEOUT_MS = 20000;
const DEFAULT_API_PORT = 3000;
const PROD_API = "https://iqmotorbase.com";

/** Inlined at bundle time (`eas update` / Metro). Prefer this over Constants in Expo Go. */
const BUNDLED_API_URL = String(process.env.EXPO_PUBLIC_API_URL || "").trim();

function isHtmlBody(text) {
  const t = String(text || "").trim();
  return t.startsWith("<!") || /^<html/i.test(t) || /<!DOCTYPE/i.test(t);
}

function metroLanIpv4() {
  const sources = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.linkingUri,
  ];
  for (const src of sources) {
    const m = String(src || "").match(/\b(\d{1,3}(?:\.\d{1,3}){3})\b/);
    if (m && m[1] !== "127.0.0.1") return m[1];
  }
  return "";
}

function looksHttps(url) {
  return /^https:\/\//i.test(String(url || ""));
}

export function getApiBase() {
  let raw = BUNDLED_API_URL || String(Constants.expoConfig?.extra?.apiUrl || "").trim();

  if (looksHttps(raw)) {
    return raw.replace(/\/$/, "");
  }

  if (!raw) {
    raw = `http://127.0.0.1:${DEFAULT_API_PORT}`;
  }

  const usesLoopback = /127\.0\.0\.1|localhost/i.test(raw);
  const lan = metroLanIpv4();

  if (usesLoopback && lan) {
    raw = raw.replace(/127\.0\.0\.1|localhost/gi, lan);
  } else if (usesLoopback && Platform.OS === "android") {
    raw = raw.replace(/127\.0\.0\.1|localhost/gi, "10.0.2.2");
  }

  return raw.replace(/\/$/, "") || PROD_API;
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
      throw new Error(`Request timed out. Server: ${base}`);
    }
    if (/network request failed|failed to fetch|load failed/i.test(msg) || name === "TypeError") {
      throw new Error(`Cannot reach IQWireCalculator API at ${base}`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  if (isHtmlBody(text)) {
    if (res.status === 404) {
      throw new Error(
        `API not on this server yet (${path}). Deploy the latest IQMotorBase website, then try again.\n${base}`
      );
    }
    throw new Error(`Server returned a web page instead of JSON (${res.status}).\n${url}`);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: "Invalid response from server" };
  }
  if (!res.ok) {
    throw new Error((data && data.error) || res.statusText || "Request failed");
  }
  return data;
}
