import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";

/**
 * In-memory Cir Mills cache for the browser tab session.
 * Loaded once when CM Best Match first needs it; AWG/Metric toggle reads from here.
 */
let sessionCatalogs = null;
/** @type {Promise<{ awg: object[], metric: object[] }> | null} */
let sessionLoadPromise = null;

async function fetchUnit(unit) {
  const u = normalizeCirMillsUnit(unit);
  const res = await fetch(`/api/dashboard/cir-mills?unit=${encodeURIComponent(u)}`, {
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Failed to load ${u} Cir Mills`);
  return Array.isArray(data.items) ? data.items : [];
}

/**
 * Load AWG + Metric once per tab session (parallel). Subsequent calls return the same data.
 * @returns {Promise<{ awg: object[], metric: object[] }>}
 */
export async function loadCirMillsSessionCatalogs() {
  if (sessionCatalogs) return sessionCatalogs;
  if (sessionLoadPromise) return sessionLoadPromise;

  sessionLoadPromise = (async () => {
    const [awg, metric] = await Promise.all([
      fetchUnit(CIR_MILLS_UNIT_AWG),
      fetchUnit(CIR_MILLS_UNIT_METRIC),
    ]);
    sessionCatalogs = { awg, metric };
    return sessionCatalogs;
  })().finally(() => {
    sessionLoadPromise = null;
  });

  return sessionLoadPromise;
}

export function getCirMillsSessionCatalog(unit) {
  if (!sessionCatalogs) return [];
  const u = normalizeCirMillsUnit(unit);
  return u === CIR_MILLS_UNIT_METRIC ? sessionCatalogs.metric : sessionCatalogs.awg;
}

export function hasCirMillsSessionCatalogs() {
  return sessionCatalogs != null;
}

/** Clear session cache (e.g. after admin resets Cir Mills). */
export function clearCirMillsSessionCatalogs() {
  sessionCatalogs = null;
  sessionLoadPromise = null;
}
