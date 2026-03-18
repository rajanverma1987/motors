"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Table from "@/components/ui/table";
import Select from "@/components/ui/select";
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
  const [employees, setEmployees] = useState([]);
  const [statusOptions, setStatusOptions] = useState(USER_SETTINGS_DEFAULTS.workOrderStatuses);
  const [woModal, setWoModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, empRes, setRes] = await Promise.all([
        fetch("/api/dashboard/work-orders", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/settings", { credentials: "include", cache: "no-store" }),
      ]);
      if (woRes.ok) setRows(await woRes.json());
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
  }, []);

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

  const rowsAfterStatus = useMemo(() => {
    if (!statusFilter.trim()) return rows;
    const want = statusFilter.trim().toLowerCase();
    return rows.filter((r) => (r.status || "").trim().toLowerCase() === want);
  }, [rows, statusFilter]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rowsAfterStatus;
    return rowsAfterStatus.filter((r) => {
      const tech = (employees.find((e) => e.id === r.technicianEmployeeId)?.name || "").toLowerCase();
      const jobLabel = (
        JOB_TYPE_OPTIONS.find((o) => o.value === r.jobType)?.label || ""
      ).toLowerCase();
      const hay = [
        r.workOrderNumber,
        r.quoteRfqNumber,
        r.date,
        r.customerCompany,
        r.companyName,
        r.motorClass,
        r.jobType,
        jobLabel,
        r.status,
        tech,
      ]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [rowsAfterStatus, searchQuery, employees]);

  const columns = useMemo(
    () => [
      { key: "workOrderNumber", label: "WO#", clickable: true },
      { key: "quoteRfqNumber", label: "RFQ#" },
      { key: "date", label: "Date" },
      { key: "customerCompany", label: "Company" },
      { key: "motorClass", label: "Motor" },
      {
        key: "jobType",
        label: "Type",
        render: (v) =>
          JOB_TYPE_OPTIONS.find((o) => o.value === v)?.label || v || "—",
      },
      {
        key: "status",
        label: "Status",
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
        render: (id) => employees.find((e) => e.id === id)?.name || id || "—",
      },
    ],
    [employees]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-bold text-title">Work orders</h1>
          <div className="shrink-0 min-w-0">
            <Select
              id="wo-table-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value ?? "")}
              options={[{ value: "", label: "All statuses" }, ...statusSelectOptions]}
              searchable={false}
              placeholder="All statuses"
              className="w-64 sm:w-72"
            />
          </div>
        </div>
        <p className="mt-2 text-sm text-secondary">
          From a quote, use Create work order to open the form on the Quotes page; save there to create the
          row. AC vs DC forms match motor type.
        </p>
      </div>
      <Table
        columns={columns}
        data={filteredRows}
        rowKey="id"
        loading={loading}
        fillHeight
        searchable
        onSearch={setSearchQuery}
        searchPlaceholder="Search WO#, RFQ#, company, motor, type, status, technician…"
        onCellClick={(row) => setWoModal({ workOrderId: row.id })}
        onDelete={handleDeleteWorkOrder}
        onRefresh={load}
        emptyMessage={
          rows.length === 0
            ? "No work orders yet. Create from a saved quote on the Quotes page."
            : filteredRows.length === 0 && searchQuery.trim()
              ? "No work orders match your search."
              : statusFilter.trim()
                ? "No work orders with this status."
                : "No work orders match."
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
