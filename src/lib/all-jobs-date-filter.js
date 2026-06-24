/** URL query keys for All jobs date range (`/dashboard/all-jobs`). */
export const ALL_JOBS_DATE_FROM_PARAM = "from";
export const ALL_JOBS_DATE_TO_PARAM = "to";

function normalizeYmd(raw) {
  const s = String(raw ?? "").trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

/** April–March financial year containing today. */
export function currentAllJobsFinancialYearRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;
  const fyEndYear = fyStartYear + 1;
  return {
    from: `${fyStartYear}-04-01`,
    to: `${fyEndYear}-03-31`,
  };
}

export function isAllJobsCurrentFinancialYear(fromYmd, toYmd) {
  const fy = currentAllJobsFinancialYearRange();
  return normalizeYmd(fromYmd) === fy.from && normalizeYmd(toYmd) === fy.to;
}

/**
 * @param {URLSearchParams | { get: (key: string) => string | null }} searchParams
 */
export function parseAllJobsDateRange(searchParams) {
  const from = normalizeYmd(searchParams?.get?.(ALL_JOBS_DATE_FROM_PARAM));
  const to = normalizeYmd(searchParams?.get?.(ALL_JOBS_DATE_TO_PARAM));
  const active = Boolean(from || to) && (!from || !to || from <= to);
  return { from, to, active };
}

/**
 * @param {object} record — quote, work order, or invoice with `date` (YYYY-MM-DD).
 */
export function recordInAllJobsDateRange(record, fromYmd, toYmd) {
  const from = normalizeYmd(fromYmd);
  const to = normalizeYmd(toYmd);
  if (!from && !to) return true;
  if (from && to && from > to) return true;
  const day = String(record?.date ?? "").trim().slice(0, 10);
  if (!day) return false;
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

/** Mongo clause for string `date` fields (YYYY-MM-DD). */
export function mongoDocumentDateRangeClause(fromYmd, toYmd) {
  const from = normalizeYmd(fromYmd);
  const to = normalizeYmd(toYmd);
  if (!from && !to) return null;
  if (from && to && from > to) return null;
  if (from && to) return { date: { $gte: from, $lte: to } };
  if (from) return { date: { $gte: from } };
  return { date: { $lte: to } };
}

/**
 * Merge a date-range clause into an existing Mongo query (uses $and when needed).
 * @param {object} q
 * @param {object | null} dateClause
 */
export function mergeMongoDateRangeQuery(q, dateClause) {
  if (!dateClause) return q;
  if (q.$and) {
    return { ...q, $and: [...q.$and, dateClause] };
  }
  if (q.$or || q.$nor || q.status) {
    return { ...q, $and: [dateClause] };
  }
  return { ...q, ...dateClause };
}
