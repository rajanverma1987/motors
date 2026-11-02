const SESSION_KEY = "iqmotorbase.simple-master-data-search.v1";

/**
 * @typedef {{
 *   rows: object[],
 *   resultMeta: {
 *     searchedFields?: object[],
 *     truncated?: boolean,
 *     limit?: number,
 *     searchType?: string,
 *   } | null,
 *   formId?: string,
 *   savedAt?: number,
 * }} MasterDataSearchSession
 */

/**
 * @param {MasterDataSearchSession} payload
 */
export function saveMasterDataSearchSession(payload) {
  if (typeof window === "undefined") return;
  try {
    const body = {
      rows: Array.isArray(payload?.rows) ? payload.rows : [],
      resultMeta: payload?.resultMeta || null,
      formId: String(payload?.formId || "").trim(),
      savedAt: Date.now(),
    };
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(body));
  } catch {
    /* ignore quota / private mode */
  }
}

/** @returns {MasterDataSearchSession | null} */
export function loadMasterDataSearchSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
      resultMeta: parsed.resultMeta || null,
      formId: String(parsed.formId || "").trim(),
      savedAt: Number(parsed.savedAt) || 0,
    };
  } catch {
    return null;
  }
}

export function clearMasterDataSearchSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export const SIMPLE_MASTER_DATA_SEARCH_RESULTS_PATH =
  "/dashboards/master-data-search/results";
