import { sortRowsClient } from "@/lib/client-table-sort";

/**
 * @param {URLSearchParams|{ get: (k: string) => string|null }} searchParams
 * @param {{ allowedKeys: string[], defaultKey?: string, defaultDir?: "asc"|"desc" }} options
 */
export function parseAdminSortParams(searchParams, { allowedKeys, defaultKey = "createdAt", defaultDir = "desc" }) {
  const rawKey = String(searchParams.get("sortBy") || defaultKey).trim();
  const sortBy = allowedKeys.includes(rawKey) ? rawKey : defaultKey;
  const sortDir = String(searchParams.get("sortDir") || defaultDir).toLowerCase() === "asc" ? "asc" : "desc";
  return { sortBy, sortDir };
}

/**
 * Map UI column keys to MongoDB field names for `.sort()`.
 * @param {Record<string, string>} [fieldMap]
 */
export function mongoSortFromAdmin(sortBy, sortDir, fieldMap = {}) {
  const field = fieldMap[sortBy] || sortBy;
  return { [field]: sortDir === "asc" ? 1 : -1 };
}

/** @param {URLSearchParams} params */
export function appendAdminSortParams(params, tableSort) {
  if (tableSort?.key) {
    params.set("sortBy", tableSort.key);
    params.set("sortDir", tableSort.direction === "asc" ? "asc" : "desc");
  }
  return params;
}

/**
 * Default sort value resolver for admin tables (nested / computed columns).
 * @param {Record<string, unknown>} row
 * @param {string} key
 */
export function adminRowSortValue(row, key) {
  if (key === "location" || key === "area") {
    return [row.city, row.state].filter(Boolean).join(", ");
  }
  if (key === "subscriptionSummary") {
    return row.subscriptionSummary?.planName || "";
  }
  if (key === "subscriptionState") {
    return row.subscriptionSummary?.internalState || "";
  }
  if (key === "accountType") {
    if (row.calculatorOnlyAccount) return "calculators";
    if (row.listingOnlyAccount) return "listing";
    return "crm";
  }
  if (key === "source") {
    return row.sourceListingName || row.sourceListingId || "";
  }
  if (key === "assignedTo") {
    return (row.assignedToNames || []).filter(Boolean).join(", ");
  }
  if (
    key === "listingDate" ||
    key === "createdAt" ||
    key === "lastLoginAt" ||
    key === "submittedAt" ||
    key === "updatedAt" ||
    key === "firstEmailSentAt" ||
    key === "lastEmailSentAt"
  ) {
    return Number(new Date(row[key] || 0).getTime()) || 0;
  }
  if (key === "visitsThisMonth" || key === "visitsOverall" || key === "quoteRequestCount" || key === "customPrice") {
    return Number(row[key]) || 0;
  }
  if (key === "canLogin") {
    return row.canLogin === false ? 0 : 1;
  }
  if (key === "active") {
    return row.active === false ? 0 : 1;
  }
  return row?.[key];
}

/**
 * Sort rows in memory then paginate (for computed columns or post-join data).
 * @template T
 * @param {T[]} rows
 * @param {{ sortBy: string, sortDir: string }} sort
 * @param {number} page
 * @param {number} pageSize
 * @param {(row: T, key: string) => unknown} [getSortValue]
 */
export function sortAndPaginateAdminRows(rows, sort, page, pageSize, getSortValue = adminRowSortValue) {
  const sorted = sortRowsClient(rows, { key: sort.sortBy, direction: sort.sortDir }, getSortValue);
  const totalCount = sorted.length;
  const start = (page - 1) * pageSize;
  return { items: sorted.slice(start, start + pageSize), totalCount };
}
