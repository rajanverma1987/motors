"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiLayers } from "react-icons/fi";
import Table from "@/components/ui/table";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { JOB_TYPE_OPTIONS } from "@/lib/work-order-fields";
import { mergeUserSettings, USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";
import Badge from "@/components/ui/badge";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";

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

export default function WorkOrdersPageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [statusOptions, setStatusOptions] = useState(USER_SETTINGS_DEFAULTS.workOrderStatuses);
  const [woModal, setWoModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState({ key: "createdAt", direction: "desc" });
  const [backfillBusy, setBackfillBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const [woRes, empRes, setRes] = await Promise.all([
        fetch(`/api/dashboard/work-orders?${params.toString()}`, { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/settings", { credentials: "include", cache: "no-store" }),
      ]);
      if (woRes.ok) {
        const payload = await woRes.json();
        setRows(Array.isArray(payload?.items) ? payload.items : []);
        setTotalCount(Number(payload?.totalCount) || 0);
      } else {
        setRows([]);
        setTotalCount(0);
      }
      if (empRes.ok) {
        const list = await empRes.json();
        setEmployees(Array.isArray(list) ? list : []);
      }
      if (setRes.ok) {
        const d = await setRes.json();
        const st = mergeUserSettings(d.settings).workOrderStatuses;
        if (Array.isArray(st) && st.length) setStatusOptions(st);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, tableSort, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const d = draftQuoteParam?.trim();
    const o = openId?.trim();
    if (d) {
      setWoModal({ draftQuoteId: d });
      router.replace("/dashboard/work-orders", { scroll: false });
      return;
    }
    if (o) {
      setWoModal({ workOrderId: o });
      router.replace("/dashboard/work-orders", { scroll: false });
    }
  }, [draftQuoteParam, openId, router]);

  const statusSelectOptions = statusOptions.map((s) => ({ value: s, label: s }));

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

  const handleBackfillFromInvoices = useCallback(async () => {
    setBackfillBusy(true);
    try {
      const dryRes = await fetch("/api/dashboard/work-orders/backfill-from-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dryRun: true }),
      });
      const dry = await dryRes.json().catch(() => ({}));
      if (!dryRes.ok) throw new Error(dry.error || "Preview failed");
      const previewCount = Number(dry.previewCount) || 0;
      const closedStatusUsed = String(dry.closedStatusUsed || "").trim() || "—";
      if (previewCount === 0) {
        toast.info("No invoice-linked quotes are missing a work order. Nothing to create.");
        return;
      }
      const ok = await confirm({
        title: "Create work orders from invoices?",
        message: `Found ${previewCount} invoice(s) whose quote has no work order yet. Each will get a new work order with status “${closedStatusUsed}” (from your Settings → work order statuses). Inventory reservation and board notifications are skipped. Continue?`,
        confirmLabel: "Create work orders",
      });
      if (!ok) return;
      const runRes = await fetch("/api/dashboard/work-orders/backfill-from-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ dryRun: false }),
      });
      const run = await runRes.json().catch(() => ({}));
      if (!runRes.ok) throw new Error(run.error || "Backfill failed");
      const createdCount = Number(run.createdCount) || 0;
      const errCount = Number(run.errorCount) || 0;
      toast.success(
        `Created ${createdCount} work order(s).${errCount ? ` ${errCount} row(s) failed — see browser console for details.` : ""}`
      );
      if (errCount > 0) {
        console.warn("Work order backfill errors:", run.errors);
      }
      setPage(1);
      await load();
    } catch (e) {
      toast.error(e.message || "Backfill failed");
    } finally {
      setBackfillBusy(false);
    }
  }, [confirm, load, toast]);

  const columns = useMemo(
    () => [
      { key: "workOrderNumber", label: "WO#", clickable: true, sortable: true },
      { key: "quoteRfqNumber", label: "RFQ#", sortable: true },
      { key: "date", label: "Date", sortable: true },
      { key: "customerCompany", label: "Company", sortable: true },
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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[86.4rem] flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-title">Work orders</h1>
            <p className="mt-2 text-sm text-secondary">
              Shop jobs from approved quotes—filter by status below. Use{" "}
              <span className="font-medium text-title">Create from invoices</span> if you invoiced quotes before
              creating work orders: it adds one closed-style work order per missing quote.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={backfillBusy || loading}
              onClick={handleBackfillFromInvoices}
              className="whitespace-nowrap"
            >
              <FiLayers className="h-4 w-4 shrink-0" aria-hidden />
              {backfillBusy ? "Working…" : "Create from invoices"}
            </Button>
            <Select
              id="wo-table-status-filter"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value ?? "");
              }}
              options={[{ value: "", label: "All statuses" }, ...statusSelectOptions]}
              searchable={false}
              placeholder="All statuses"
              className="w-64 sm:w-72"
            />
          </div>
        </div>
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
        onRefresh={load}
        pagination={{ page, pageSize, totalCount }}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        paginateClientSide={false}
        emptyMessage={
          rows.length === 0
            ? statusFilter.trim()
              ? "No work orders with this status."
              : searchQuery.trim()
                ? "No work orders match your search."
                : "No work orders yet. Create from an approved quote on the Quotes page (row icon) or Job Write-Up."
            : ""
        }
      />

      <WorkOrderFormModal
        open={!!woModal}
        draftQuoteId={woModal?.draftQuoteId ?? null}
        workOrderId={woModal?.workOrderId ?? null}
        onClose={() => setWoModal(null)}
        onAfterSave={load}
      />
    </div>
  );
}
