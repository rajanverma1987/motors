"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Table from "@/components/ui/table";
import { formatDateMdy } from "@/lib/format-date";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { JOB_TYPE_OPTIONS } from "@/lib/work-order-fields";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import Badge from "@/components/ui/badge";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import QuoteFormModal from "@/components/dashboard/quote-form-modal";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import { allJobsListPath } from "@/lib/all-jobs-tabs";
import { parseAllJobsDateRange } from "@/lib/all-jobs-date-filter";

const WO_RECORD_LINK_CLASS =
  "text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded";

function workOrderStatusVariant(status) {
  const s = (status || "").trim().toLowerCase();
  if (!s) return "default";
  if (/\b(complete|completed|done|delivered|closed|picked?\s*up|shipped)\b/i.test(status || "")) return "success";
  if (/\b(cancel|rejected?|scrap|void|no\s*repair)\b/i.test(s)) return "danger";
  if (/\b(wait|holding|parts|pending|on\s*hold)\b/i.test(s)) return "warning";
  if (/\b(progress|active|work|wind|rewind|qc|test|assign|queue|shop|floor|stator)\b/i.test(s))
    return "primary";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return ["default", "primary", "warning"][h % 3];
}

export default function WorkOrdersPageClient({ embedded = false, actionsRef = null }) {
  const listPath = allJobsListPath(embedded, "work-orders", "/dashboard/work-orders");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [summaryBuckets, setSummaryBuckets] = useState({ open: 0, closed: 0 });
  const [employees, setEmployees] = useState([]);
  const [woModal, setWoModal] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [bucketFilter, setBucketFilter] = useState("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState({ key: "createdAt", direction: "desc" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      params.set("bucket", bucketFilter === "closed" ? "closed" : "open");
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const [woRes, empRes] = await Promise.all([
        fetch(`/api/dashboard/work-orders?${params.toString()}`, { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
      ]);
      if (woRes.ok) {
        const payload = await woRes.json();
        setRows(Array.isArray(payload?.items) ? payload.items : []);
        setTotalCount(Number(payload?.totalCount) || 0);
        if (payload?.summaryBuckets && typeof payload.summaryBuckets === "object") {
          setSummaryBuckets({
            open: Number(payload.summaryBuckets.open) || 0,
            closed: Number(payload.summaryBuckets.closed) || 0,
          });
        }
      } else {
        setRows([]);
        setTotalCount(0);
      }
      if (empRes.ok) {
        const list = await empRes.json();
        setEmployees(Array.isArray(list) ? list : []);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, tableSort, bucketFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, bucketFilter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const d = draftQuoteParam?.trim();
    const o = openId?.trim();
    if (d) {
      setWoModal({ draftQuoteId: d });
      router.replace(listPath, { scroll: false });
      return;
    }
    if (o) {
      setWoModal({ workOrderId: o });
      router.replace(listPath, { scroll: false });
    }
  }, [draftQuoteParam, openId, router, listPath]);

  useEffect(() => {
    if (!embedded || !actionsRef) return undefined;
    actionsRef.current = { reload: load };
    return () => {
      if (actionsRef.current?.reload === load) {
        actionsRef.current = null;
      }
    };
  }, [embedded, actionsRef, load]);

  const bucketSummaryCards = useMemo(
    () => [
      {
        key: "open",
        label: "Open",
        count: summaryBuckets.open,
        subtitle: String(summaryBuckets.open),
        tileAppearance: resolveStatusTileProps("", 0),
      },
      {
        key: "closed",
        label: "Closed",
        count: summaryBuckets.closed,
        subtitle: String(summaryBuckets.closed),
        tileAppearance: resolveStatusTileProps("", 5),
      },
    ],
    [summaryBuckets]
  );

  const emptyMessage = useMemo(() => {
    if (searchQuery.trim()) return "No work orders match your search.";
    if (dateFrom || dateTo) return "No work orders in this date range.";
    if (bucketFilter === "closed") return "No work orders with Close status.";
    return "No work orders yet. Create from an approved quote on the RFQ page.";
  }, [searchQuery, bucketFilter, dateFrom, dateTo]);

  const handleDeleteWorkOrder = useCallback(
    async (row) => {
      const wo = row?.workOrderNumber || row?.id || "this work order";
      const ok = await confirm({
        title: "Delete work order",
        message: `Permanently delete work order ${wo}? This cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/work-orders/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Delete failed");
        toast.success("Work order deleted.");
        load();
      } catch (e) {
        toast.error(e.message || "Could not delete work order");
      }
    },
    [confirm, toast, load]
  );

  const handleTableSort = useCallback((key, direction) => {
    setPage(1);
    setTableSort({ key, direction });
  }, []);

  const columns = useMemo(
    () => [
      { key: "workOrderNumber", label: "WO#", clickable: true, sortable: true },
      {
        key: "quoteRfqNumber",
        label: "RFQ#",
        sortable: true,
        render: (v, row) => {
          const label = v || row.quoteRfqNumber || "—";
          const quoteId = String(row.quoteId || "").trim();
          if (!quoteId || label === "—") return label;
          return (
            <button
              type="button"
              className={WO_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setOpenQuoteId(quoteId);
              }}
              title="Open RFQ"
            >
              {label}
            </button>
          );
        },
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (v) => formatDateMdy(v),
      },
      {
        key: "customerCompany",
        label: "Company",
        sortable: true,
        render: (v, row) => {
          const label = v || row.customerCompany || "—";
          const customerId = String(row.customerId || "").trim();
          if (!customerId || label === "—") return label;
          return (
            <button
              type="button"
              className={WO_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setOpenCustomerId(customerId);
              }}
              title="Open customer"
            >
              {label}
            </button>
          );
        },
      },
      { key: "motorClass", label: "Motor", sortable: true },
      {
        key: "jobType",
        label: "Type",
        sortable: true,
        render: (v) =>
          JOB_TYPE_OPTIONS.find((o) => o.value === v)?.label || v || "—",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => {
          const label = value != null && String(value).trim() ? String(value).trim() : "—";
          if (label === "—") return label;
          return (
            <Badge variant={workOrderStatusVariant(label)} className="rounded-full px-2.5 py-0.5 text-xs">
              {label}
            </Badge>
          );
        },
      },
      {
        key: "technicianEmployeeId",
        label: "Technician",
        sortable: true,
        render: (id) => employees.find((e) => e.id === id)?.name || id || "—",
      },
    ],
    [employees]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {!embedded ? (
        <div className="mb-4 shrink-0 border-b border-border pb-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-title">Work orders</h1>
            <p className="mt-2 text-sm text-secondary">
              Shop jobs from approved quotes. Open excludes Close status; Closed shows only work orders with Close
              status.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
          {bucketSummaryCards.map((card) => (
            <StatusFilterPillButton
              key={card.key}
              card={card}
              active={bucketFilter === card.key}
              onClick={() => {
                setPage(1);
                setBucketFilter(card.key);
              }}
            />
          ))}
        </div>
        <Table
          columns={columns}
          data={rows}
          rowKey="id"
          loading={loading}
          fillHeight
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search WO#, RFQ#, company, motor, type, status, technician…"
          sortState={tableSort}
          onSort={handleTableSort}
          onCellClick={(row) => setWoModal({ workOrderId: row.id })}
          onDelete={handleDeleteWorkOrder}
          actionsColumnLabel=""
          onRefresh={load}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
          emptyMessage={emptyMessage}
        />
      </div>

      <WorkOrderFormModal
        open={!!woModal}
        draftQuoteId={woModal?.draftQuoteId ?? null}
        workOrderId={woModal?.workOrderId ?? null}
        onClose={() => setWoModal(null)}
        onAfterSave={load}
        onOpenQuote={(id) => setOpenQuoteId(String(id || "").trim() || null)}
        onOpenCustomer={(id) => setOpenCustomerId(String(id || "").trim() || null)}
      />

      <QuoteFormModal
        open={!!openQuoteId}
        quoteId={openQuoteId}
        onClose={() => setOpenQuoteId(null)}
        onAfterSave={load}
        zIndex={120}
      />

      <CustomerQuickViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={120}
      />
    </div>
  );
}
