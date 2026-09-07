const FETCH_TIMEOUT_MS = 20000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function isAuthRejected(err) {
  const status = Number(err?.status) || 0;
  const code = String(err?.code || "");
  if (status === 401 || status === 403) return true;
  return code === "AUTH_REQUIRED" || code === "LOGIN_REVOKED";
}

export async function appFetch(path, opts = {}) {
  const { token, method = "GET", body } = opts;
  const url = path.startsWith("/") ? path : `/${path}`;
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
    if (e?.name === "AbortError") {
      throw new ApiError("Request timed out. Check your connection and try again.", {
        status: 0,
        code: "TIMEOUT",
      });
    }
    throw new ApiError("Cannot reach IQWireCalculator. Check your connection.", {
      status: 0,
      code: "NETWORK",
    });
  } finally {
    clearTimeout(timeoutId);
  }

  const text = await res.text();
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
