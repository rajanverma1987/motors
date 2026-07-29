/** Client helpers for Simple portal Mongo-backed service proposals & purchase orders. */

import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  SIMPLE_SERVICE_PROPOSALS_STORAGE_KEY,
} from "@/lib/simple-service-proposal-form";
import {
  SIMPLE_PURCHASE_ORDERS_STORAGE_KEY,
} from "@/lib/simple-purchase-order-form";

const SP_API = "/api/dashboard/simple-service-proposals";
const PO_API = "/api/dashboard/simple-purchase-orders";
const SP_MIGRATED_FLAG = "simple-portal-sp-mongo-migrated-v1";
const PO_MIGRATED_FLAG = "simple-portal-po-mongo-migrated-v1";

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

/**
 * One-time: push browser localStorage rows into Mongo, then clear the key.
 * Maps old local ids → new Mongo ids for PO.serviceProposalId remapping.
 */
export async function migrateLocalSimpleServiceProposalsIfNeeded() {
  if (typeof window === "undefined") return { migrated: 0, idMap: {} };
  if (window.localStorage.getItem(SP_MIGRATED_FLAG) === "1") {
    return { migrated: 0, idMap: {} };
  }
  let local = [];
  try {
    const raw = window.localStorage.getItem(SIMPLE_SERVICE_PROPOSALS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    local = Array.isArray(parsed) ? parsed : [];
  } catch {
    local = [];
  }
  if (!local.length) {
    window.localStorage.setItem(SP_MIGRATED_FLAG, "1");
    return { migrated: 0, idMap: {} };
  }

  const existing = await fetchSimpleServiceProposals().catch(() => []);
  if (Array.isArray(existing) && existing.length > 0) {
    // Server already has data — don't duplicate; drop local cache.
    window.localStorage.removeItem(SIMPLE_SERVICE_PROPOSALS_STORAGE_KEY);
    window.localStorage.setItem(SP_MIGRATED_FLAG, "1");
    return { migrated: 0, idMap: {} };
  }

  const idMap = {};
  let migrated = 0;
  for (const row of local) {
    const oldId = String(row?.id || "").trim();
    try {
      const saved = await createSimpleServiceProposal({ ...row, id: undefined });
      if (oldId && saved?.id) idMap[oldId] = saved.id;
      migrated += 1;
    } catch {
      /* continue remaining */
    }
  }
  window.localStorage.removeItem(SIMPLE_SERVICE_PROPOSALS_STORAGE_KEY);
  window.localStorage.setItem(SP_MIGRATED_FLAG, "1");
  return { migrated, idMap };
}

export async function migrateLocalSimplePurchaseOrdersIfNeeded(idMap = {}) {
  if (typeof window === "undefined") return { migrated: 0 };
  if (window.localStorage.getItem(PO_MIGRATED_FLAG) === "1") {
    return { migrated: 0 };
  }
  let local = [];
  try {
    const raw = window.localStorage.getItem(SIMPLE_PURCHASE_ORDERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    local = Array.isArray(parsed) ? parsed : [];
  } catch {
    local = [];
  }
  if (!local.length) {
    window.localStorage.setItem(PO_MIGRATED_FLAG, "1");
    return { migrated: 0 };
  }

  const existing = await fetchSimplePurchaseOrders().catch(() => []);
  if (Array.isArray(existing) && existing.length > 0) {
    window.localStorage.removeItem(SIMPLE_PURCHASE_ORDERS_STORAGE_KEY);
    window.localStorage.setItem(PO_MIGRATED_FLAG, "1");
    return { migrated: 0 };
  }

  let migrated = 0;
  for (const row of local) {
    const oldSid = String(row?.serviceProposalId || "").trim();
    const nextSid = (oldSid && idMap[oldSid]) || oldSid;
    try {
      await createSimplePurchaseOrder({
        ...row,
        id: undefined,
        serviceProposalId: nextSid,
      });
      migrated += 1;
    } catch {
      /* continue */
    }
  }
  window.localStorage.removeItem(SIMPLE_PURCHASE_ORDERS_STORAGE_KEY);
  window.localStorage.setItem(PO_MIGRATED_FLAG, "1");
  return { migrated };
}
