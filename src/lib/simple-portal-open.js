import { SIMPLE_PORTAL_PATH } from "@/lib/simple-portal-tabs";

/**
 * @param {string} tab
 * @param {string} [openId]
 * @param {Record<string, string>} [extra]
 */
export function simplePortalOpenHref(tab, openId = "", extra = {}) {
  const params = new URLSearchParams();
  params.set("tab", String(tab || "").trim());
  const id = String(openId || "").trim();
  if (id) params.set("open", id);
  for (const [key, value] of Object.entries(extra || {})) {
    const v = String(value ?? "").trim();
    if (key && v) params.set(key, v);
  }
  return `${SIMPLE_PORTAL_PATH}?${params.toString()}`;
}

/** Lead ids in customers tab use a prefix so they do not collide with customer ids. */
export const SIMPLE_OPEN_LEAD_PREFIX = "lead:";

/**
 * @param {string} raw
 * @returns {{ kind: "customer"|"lead"|"record", id: string }}
 */
export function parseSimpleOpenParam(raw) {
  const value = String(raw || "").trim();
  if (!value) return { kind: "record", id: "" };
  if (value.startsWith(SIMPLE_OPEN_LEAD_PREFIX)) {
    return { kind: "lead", id: value.slice(SIMPLE_OPEN_LEAD_PREFIX.length).trim() };
  }
  return { kind: "record", id: value };
}

/**
 * Remove `open` (and optional keys) from the current dashboards query.
 * @param {URLSearchParams | { toString(): string }} searchParams
 * @param {string[]} [keys]
 */
export function clearSimpleOpenParams(searchParams, keys = ["open"]) {
  const params = new URLSearchParams(
    typeof searchParams?.toString === "function" ? searchParams.toString() : ""
  );
  for (const key of keys) params.delete(key);
  const qs = params.toString();
  return qs ? `${SIMPLE_PORTAL_PATH}?${qs}` : SIMPLE_PORTAL_PATH;
}
