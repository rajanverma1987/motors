"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiRotateCw } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

export default function DashboardSalesCommissionPage() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [activeTab, setActiveTab] = useState("unpaid");
  const [loading, setLoading] = useState(true);
  const [statusSavingId, setStatusSavingId] = useState("");
  const [searchUnpaid, setSearchUnpaid] = useState("");
  const [searchPaid, setSearchPaid] = useState("");
  const [rows, setRows] = useState([]);

  const loadRows = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/sales-commissions", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sales commissions");
      setRows(Array.isArray(data.commissions) ? data.commissions : []);
    } catch (err) {
      toast.error(err.message || "Failed to load sales commissions");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const markPaid = async (id) => {
    if (!id) return;
    setStatusSavingId(id);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark as paid");
      setRows((prev) => prev.map((r) => (r.id === id ? data.commission : r)));
      toast.success("Commission marked as paid.");
    } catch (err) {
      toast.error(err.message || "Failed to update commission status");
    } finally {
      setStatusSavingId("");
    }
  };

  const unpaidRows = useMemo(
    () => rows.filter((r) => r.status !== "paid"),
    [rows]
  );
  const paidRows = useMemo(
    () => rows.filter((r) => r.status === "paid"),
    [rows]
  );

  const filteredUnpaid = useMemo(() => {
    const q = searchUnpaid.trim().toLowerCase();
    if (!q) return unpaidRows;
    return unpaidRows.filter((r) =>
      (r.jobNumber || "").toLowerCase().includes(q) ||
      (r.rfqNumber || "").toLowerCase().includes(q) ||
      (r.salesPersonName || "").toLowerCase().includes(q) ||
      String(r.amount ?? "").toLowerCase().includes(q)
    );
  }, [unpaidRows, searchUnpaid]);

  const filteredPaid = useMemo(() => {
    const q = searchPaid.trim().toLowerCase();
    if (!q) return paidRows;
    return paidRows.filter((r) =>
      (r.jobNumber || "").toLowerCase().includes(q) ||
      (r.rfqNumber || "").toLowerCase().includes(q) ||
      (r.salesPersonName || "").toLowerCase().includes(q) ||
      String(r.amount ?? "").toLowerCase().includes(q)
    );
  }, [paidRows, searchPaid]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) =>
          row.status === "paid" ? (
            <span className="px-1.5 text-secondary">—</span>
          ) : (
            <button
              type="button"
              onClick={() => markPaid(row.id)}
              disabled={statusSavingId === row.id}
              className="rounded p-1.5 text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
              aria-label="Mark paid"
              title="Mark paid"
            >
              {statusSavingId === row.id ? (
                <FiRotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <FiCheck className="h-4 w-4" />
              )}
            </button>
          ),
      },
      {
        key: "jobNumber",
        label: "Job#",
        render: (_, row) => row.jobNumber || row.rfqNumber || "—",
      },
      { key: "salesPersonName", label: "Sales person" },
      {
        key: "amount",
        label: "Amount",
        render: (_, row) => fmt(row.amount || 0),
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => (
          <Badge
            variant={row.status === "paid" ? "success" : "warning"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        ),
      },
      {
        key: "paidAt",
        label: "Paid date",
        render: (_, row) => (row.paidAt ? new Date(row.paidAt).toLocaleDateString() : "—"),
      },
      {
        key: "createdAt",
        label: "Created",
        render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"),
      },
    ],
    [fmt, statusSavingId]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-8">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Sales Commission</h1>
        <p className="mt-1 text-sm text-secondary">
          View and manage commission records linked to Job Write-Up job numbers.
        </p>
      </div>

      <div className="mt-6 min-h-0 flex-1">
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          tabs={[
            {
              id: "unpaid",
              label: `Unpaid (${unpaidRows.length})`,
              children: (
                <Table
                  columns={columns}
                  data={filteredUnpaid}
                  rowKey="id"
                  loading={loading}
                  searchable
                  onSearch={setSearchUnpaid}
                  searchPlaceholder="Search job#, sales person, amount..."
                  emptyMessage={unpaidRows.length === 0 ? "No unpaid commissions." : "No unpaid records match your search."}
                  onRefresh={async () => {
                    setLoading(true);
                    await loadRows();
                  }}
                  responsive
                />
              ),
            },
            {
              id: "paid",
              label: `Paid (${paidRows.length})`,
              children: (
                <Table
                  columns={columns}
                  data={filteredPaid}
                  rowKey="id"
                  loading={loading}
                  searchable
                  onSearch={setSearchPaid}
                  searchPlaceholder="Search job#, sales person, amount..."
                  emptyMessage={paidRows.length === 0 ? "No paid commissions yet." : "No paid records match your search."}
                  onRefresh={async () => {
                    setLoading(true);
                    await loadRows();
                  }}
                  responsive
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
