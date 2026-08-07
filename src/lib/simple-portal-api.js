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

export async function fetchSimpleServiceProposals() {
  return fetchAllPaginatedDashboardItems(SP_API);
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
