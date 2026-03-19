import { Platform } from "react-native";
import Constants from "expo-constants";

const FETCH_TIMEOUT_MS = 20000;

/**
 * Base URL for the Next.js CRM (same machine as dev server).
 * - iOS Simulator: use http://127.0.0.1:PORT (the simulator shares the Mac’s localhost).
 * - Android Emulator: 127.0.0.1 is the emulator itself → use http://10.0.2.2:PORT to reach the host PC.
 * - Physical device: your Mac/PC LAN IP, and run `next dev --hostname 0.0.0.0` so the server accepts it.
 */
export function getApiBase() {
  let raw = Constants.expoConfig?.extra?.apiUrl;
  raw = raw != null && String(raw).trim() ? String(raw).trim() : "";

  if (!raw) {
    raw = Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://127.0.0.1:3000";
  } else if (Platform.OS === "android" && /127\.0\.0\.1|localhost/i.test(raw)) {
    raw = raw.replace(/127\.0\.0\.1|localhost/gi, "10.0.2.2");
  }

  return raw.replace(/\/$/, "");
}

export function getApiBaseForMessage() {
  return getApiBase();
}

/**
 * @param {string} path - e.g. /api/tech/auth/login
 * @param {{ token?: string, method?: string, body?: object }} [opts]
 */
export async function techFetch(path, opts = {}) {
  const { token, method = "GET", body } = opts;
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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
      throw new Error(
        `Request timed out (${FETCH_TIMEOUT_MS / 1000}s). CRM URL: ${base}\n` +
          "Simulator: iOS → http://127.0.0.1:3000 · Android → http://10.0.2.2:3000\n" +
          "Set EXPO_PUBLIC_API_URL in .env and restart Expo (stop Metro, run npx expo start again)."
      );
    }
    if (/network request failed|failed to fetch|load failed|aborted/i.test(msg) || name === "TypeError") {
      throw new Error(
        `Cannot reach CRM at ${base}\n` +
          "• iOS Simulator: use EXPO_PUBLIC_API_URL=http://127.0.0.1:3000 (not your Wi‑Fi IP).\n" +
          "• Android Emulator: use http://10.0.2.2:3000 (this app rewrites 127.0.0.1 → 10.0.2.2).\n" +
          "• Ensure `npm run dev` is running for the motors project on that port."
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const errMsg = (data && data.error) || res.statusText || "Request failed";
    throw new Error(errMsg);
  }
  return data;
}

const FORM_FETCH_TIMEOUT_MS = 90000;

/**
 * Absolute URL for images/files served from the CRM (paths like /uploads/...).
 * @param {string} pathOrUrl
 */
export function getMediaUrl(pathOrUrl) {
  if (!pathOrUrl) return "";
  const s = String(pathOrUrl).trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = getApiBase();
  return `${base}${s.startsWith("/") ? s : `/${s}`}`;
}

/**
 * Multipart upload (do not set Content-Type — boundary is set automatically).
 * @param {string} path
 * @param {{ token?: string, method?: string, formData: FormData }} opts
 */
export async function techFetchForm(path, opts = {}) {
  const { token, method = "POST", formData } = opts;
  if (!formData) throw new Error("formData required");
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = { Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FORM_FETCH_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (e) {
    const name = e?.name;
    if (name === "AbortError") {
      throw new Error(`Upload timed out (${FORM_FETCH_TIMEOUT_MS / 1000}s). CRM URL: ${base}`);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const errMsg = (data && data.error) || res.statusText || "Upload failed";
    throw new Error(errMsg);
  }
  return data;
}
