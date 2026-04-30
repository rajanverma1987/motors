"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiPlus, FiRotateCw } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

const NEW_COMMISSION_INITIAL = {
  jobKey: "",
  salesPersonId: "",
  amount: "",
  status: "unpaid",
  paidAt: "",
};

export default function DashboardSalesCommissionPage() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [activeTab, setActiveTab] = useState("unpaid");
  const [loading, setLoading] = useState(true);
  const [statusSavingId, setStatusSavingId] = useState("");
  const [searchUnpaid, setSearchUnpaid] = useState("");
  const [searchPaid, setSearchPaid] = useState("");
  const [rows, setRows] = useState([]);
  const [salesPersons, setSalesPersons] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);
  const [newCommissionForm, setNewCommissionForm] = useState(NEW_COMMISSION_INITIAL);

  const salesPersonNameMap = useMemo(() => {
    const map = {};
    for (const sp of salesPersons) {
      map[sp.id] = sp.name || sp.email || sp.phone || sp.id || "—";
    }
    return map;
  }, [salesPersons]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [spRes, qRes, invRes] = await Promise.all([
          fetch("/api/dashboard/sales-persons", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }),
        ]);
        const [spData, qData, invData] = await Promise.all([
          spRes.json().catch(() => []),
          qRes.json().catch(() => []),
          invRes.json().catch(() => []),
        ]);
        if (cancelled) return;
        if (spRes.ok) setSalesPersons(Array.isArray(spData) ? spData : []);
        const quoteList = Array.isArray(qData) ? qData : [];
        const fromQuotes = quoteList
          .filter((q) => String(q.rfqNumber || "").trim())
          .map((q) => ({
            value: `rfq:${q.id}`,
            label: String(q.rfqNumber),
            meta: {
              jobNumber: String(q.rfqNumber),
              quoteId: String(q.id || ""),
              rfqNumber: String(q.rfqNumber || ""),
            },
          }));
        setJobOptions(fromQuotes);
      } catch {
        if (!cancelled) {
          setSalesPersons([]);
          setJobOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const salesPersonOptions = useMemo(
    () => salesPersons.map((sp) => ({ value: sp.id, label: sp.name || sp.email || sp.phone || sp.id || "—" })),
    [salesPersons]
  );

  const handleCreateCommission = async (e) => {
    e.preventDefault();
    const selectedJob = jobOptions.find((opt) => opt.value === newCommissionForm.jobKey);
    if (!selectedJob) {
      toast.error("Job# is required.");
      return;
    }
    if (!newCommissionForm.salesPersonId) {
      toast.error("Sales person is required.");
      return;
    }
    const amountNum = Number(newCommissionForm.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Amount must be a valid number.");
      return;
    }
    setSavingCommission(true);
    try {
      const res = await fetch("/api/dashboard/sales-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobNumber: selectedJob.meta.jobNumber,
          quoteId: selectedJob.meta.quoteId,
          rfqNumber: selectedJob.meta.rfqNumber,
          salesPersonId: newCommissionForm.salesPersonId,
          amount: amountNum,
          status: newCommissionForm.status,
          paidAt: newCommissionForm.paidAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create commission");
      const commissionWithName = {
        ...data.commission,
        salesPersonName: salesPersonNameMap[data.commission?.salesPersonId] || "",
      };
      setRows((prev) => [commissionWithName, ...prev]);
      setCreateModalOpen(false);
      setNewCommissionForm(NEW_COMMISSION_INITIAL);
      toast.success("Sales commission created.");
    } catch (err) {
      toast.error(err.message || "Failed to create commission");
    } finally {
      setSavingCommission(false);
    }
  };

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
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[86.4rem] flex-1 flex-col overflow-hidden px-4 py-8">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title">Sales Commission</h1>
            <p className="mt-1 text-sm text-secondary">
              View and manage commission records linked to Job#, RFQ#, and Invoice#.
            </p>
          </div>
          <Button type="button" variant="primary" onClick={() => setCreateModalOpen(true)}>
            <FiPlus className="h-4 w-4 shrink-0" />
            Add New Commission
          </Button>
        </div>
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

      <Modal
        open={createModalOpen}
        onClose={() => {
          if (savingCommission) return;
          setCreateModalOpen(false);
          setNewCommissionForm(NEW_COMMISSION_INITIAL);
        }}
        title="Add New Commission"
        size="2xl"
        actions={
          <Button type="submit" form="create-sales-commission-form" variant="primary" size="sm" disabled={savingCommission}>
            {savingCommission ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="create-sales-commission-form" onSubmit={handleCreateCommission} className="flex flex-col gap-4 !space-y-0">
          <Select
            label="Job#"
            options={jobOptions}
            value={newCommissionForm.jobKey}
            onChange={(e) => setNewCommissionForm((prev) => ({ ...prev, jobKey: e.target.value ?? "" }))}
            placeholder="Select RFQ# or Invoice#"
            searchable
            required
          />
          <Select
            label="Sales Person"
            options={salesPersonOptions}
            value={newCommissionForm.salesPersonId}
            onChange={(e) => setNewCommissionForm((prev) => ({ ...prev, salesPersonId: e.target.value ?? "" }))}
            placeholder="Select sales person"
            searchable
            required
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={newCommissionForm.amount}
            onChange={(e) => setNewCommissionForm((prev) => ({ ...prev, amount: e.target.value }))}
            placeholder="0.00"
            required
          />
          <Select
            label="Status"
            options={[
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
            ]}
            value={newCommissionForm.status}
            onChange={(e) =>
              setNewCommissionForm((prev) => ({
                ...prev,
                status: e.target.value ?? "unpaid",
                paidAt: (e.target.value ?? "unpaid") === "paid" ? (prev.paidAt || new Date().toISOString().slice(0, 10)) : "",
              }))
            }
            searchable={false}
          />
          <Input
            label="Paid date"
            type="date"
            value={newCommissionForm.paidAt}
            onChange={(e) => setNewCommissionForm((prev) => ({ ...prev, paidAt: e.target.value }))}
          />
        </Form>
      </Modal>
    </div>
  );
}
