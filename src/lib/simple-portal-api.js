/** Client helpers for Simple portal Mongo-backed service proposals & purchase orders. */

import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";

const SP_API = "/api/dashboard/simple-service-proposals";
const PO_API = "/api/dashboard/simple-purchase-orders";

async function readJson(res) {
  return res.json().catch(() => ({}));
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function api(path, init = {}) {
  const res = await fetch(path, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init.headers || {}),
    },
  });
  const data = await readJson(res);
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data;
}

/**
 * Fetch all Simple service proposals (pages through API). Prefer fetchSimpleServiceProposalsPage for tables.
 */
export async function fetchSimpleServiceProposals() {
  return fetchAllPaginatedDashboardItems(SP_API);
}

/**
 * Server-paginated list for Simple Service Proposals / Invoices tables.
 * @param {{
 *   page?: number,
 *   pageSize?: number,
 *   q?: string,
 *   sortBy?: string,
 *   sortDir?: string,
 *   listKind?: "proposals"|"invoices",
 *   status?: string,
 *   from?: string,
 *   to?: string,
 * }} [query]
 */
export async function fetchSimpleServiceProposalsPage(query = {}) {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, Number(query.page) || 1)));
  params.set("pageSize", String(Math.min(100, Math.max(1, Number(query.pageSize) || 25))));
  if (query.q) params.set("q", String(query.q).trim());
  if (query.sortBy) {
    params.set("sortBy", String(query.sortBy));
    params.set("sortDir", query.sortDir === "asc" ? "asc" : "desc");
  }
  if (query.listKind) params.set("listKind", String(query.listKind));
  if (query.status) params.set("status", String(query.status));
  if (query.from) params.set("from", String(query.from).slice(0, 10));
  if (query.to) params.set("to", String(query.to).slice(0, 10));
  const data = await api(`${SP_API}?${params.toString()}`);
  const finance = data?.invoiceFinance || {};
  const financeBucket = (key) => ({
    count: Number(finance?.[key]?.count) || 0,
    amount: Number(finance?.[key]?.amount) || 0,
  });
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: Number(data?.page) || 1,
    pageSize: Number(data?.pageSize) || 25,
    totalCount: Number(data?.totalCount) || 0,
    totals: data?.totals || { total: 0, taxCollected: 0, count: 0 },
    statusBuckets: Array.isArray(data?.statusBuckets) ? data.statusBuckets : [],
    invoiceFinance: {
      amountReceivable: financeBucket("amountReceivable"),
      taxCollected: financeBucket("taxCollected"),
      taxToCollect: financeBucket("taxToCollect"),
    },
  };
}

export async function fetchSimpleServiceProposal(id) {
  const data = await api(`${SP_API}/${encodeURIComponent(id)}`);
  return data.item;
}

export async function createSimpleServiceProposal(row) {
  const data = await api(SP_API, { method: "POST", body: JSON.stringify(row) });
  return data.item;
}

export async function updateSimpleServiceProposal(id, row) {
  const data = await api(`${SP_API}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(row),
  });
  return data.item;
}

export async function deleteSimpleServiceProposal(id) {
  await api(`${SP_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveSimpleServiceProposal(row, { forceNew = false } = {}) {
  const id = forceNew ? "" : String(row?.id || "").trim();
  if (id) return updateSimpleServiceProposal(id, row);
  return createSimpleServiceProposal({ ...row, id: undefined });
}

export async function fetchSimplePurchaseOrders(query = {}) {
  const params = new URLSearchParams();
  if (query.serviceProposalId) params.set("serviceProposalId", query.serviceProposalId);
  if (query.jobNumber) params.set("jobNumber", query.jobNumber);
  if (query.q) params.set("q", query.q);
  const qs = params.toString();
  return fetchAllPaginatedDashboardItems(qs ? `${PO_API}?${qs}` : PO_API);
}

/**
 * Server-paginated Simple purchase orders list.
 */
export async function fetchSimplePurchaseOrdersPage(query = {}) {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(1, Number(query.page) || 1)));
  params.set("pageSize", String(Math.min(100, Math.max(1, Number(query.pageSize) || 25))));
  if (query.q) params.set("q", String(query.q).trim());
  if (query.sortBy) {
    params.set("sortBy", String(query.sortBy));
    params.set("sortDir", query.sortDir === "asc" ? "asc" : "desc");
  }
  if (query.paymentStatus) params.set("paymentStatus", String(query.paymentStatus));
  if (query.from) params.set("from", String(query.from).slice(0, 10));
  if (query.to) params.set("to", String(query.to).slice(0, 10));
  if (query.serviceProposalId) params.set("serviceProposalId", String(query.serviceProposalId));
  if (query.jobNumber) params.set("jobNumber", String(query.jobNumber));
  const data = await api(`${PO_API}?${params.toString()}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    page: Number(data?.page) || 1,
    pageSize: Number(data?.pageSize) || 25,
    totalCount: Number(data?.totalCount) || 0,
    paymentBuckets: Array.isArray(data?.paymentBuckets) ? data.paymentBuckets : [],
  };
}

export async function createSimplePurchaseOrder(row) {
  const data = await api(PO_API, { method: "POST", body: JSON.stringify(row) });
  return data.item;
}

export async function updateSimplePurchaseOrder(id, row) {
  const data = await api(`${PO_API}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(row),
  });
  return data.item;
}

export async function deleteSimplePurchaseOrder(id) {
  await api(`${PO_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function saveSimplePurchaseOrder(row) {
  const id = String(row?.id || "").trim();
  if (id) return updateSimplePurchaseOrder(id, row);
  return createSimplePurchaseOrder({ ...row, id: undefined });
}

export async function listSimplePurchaseOrdersForJobApi(serviceProposalId, jobNumber) {
  const sid = String(serviceProposalId || "").trim();
  const job = String(jobNumber || "").trim();
  if (!sid && !job) return [];
  const items = await fetchSimplePurchaseOrders({ serviceProposalId: sid, jobNumber: job });
  return (Array.isArray(items) ? items : []).sort((a, b) =>
    String(a.poNumber || "").localeCompare(String(b.poNumber || ""), undefined, { numeric: true })
  );
}
