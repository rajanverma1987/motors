"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiDollarSign, FiEdit2, FiPaperclip, FiPlus, FiRotateCw } from "react-icons/fi";
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
import { sortRowsClient } from "@/lib/client-table-sort";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";

const NEW_COMMISSION_INITIAL = {
  jobKey: "",
  salesPersonId: "",
  amount: "",
  status: "unpaid",
  paidAt: "",
  attachments: [],
};

function formatDateIST(dateValue) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}

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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCommissionId, setEditingCommissionId] = useState("");
  const [savingCommission, setSavingCommission] = useState(false);
  const [newCommissionForm, setNewCommissionForm] = useState(NEW_COMMISSION_INITIAL);
  const [pendingCommissionAttachmentFiles, setPendingCommissionAttachmentFiles] = useState([]);
  const [commissionAttachmentUploading, setCommissionAttachmentUploading] = useState(false);
  const [docsCommissionModalOpen, setDocsCommissionModalOpen] = useState(false);
  const [docsCommissionMeta, setDocsCommissionMeta] = useState(null);
  const [docsCommissionAttachments, setDocsCommissionAttachments] = useState([]);
  const [docsCommissionLoading, setDocsCommissionLoading] = useState(false);
  const [docsCommissionSaving, setDocsCommissionSaving] = useState(false);

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
        const [spRes, qRes, invRes, customerRes] = await Promise.all([
          fetch("/api/dashboard/sales-persons", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/customers", { credentials: "include", cache: "no-store" }),
        ]);
        const [spData, qData, invData, customerData] = await Promise.all([
          spRes.json().catch(() => []),
          qRes.json().catch(() => []),
          invRes.json().catch(() => []),
          customerRes.json().catch(() => []),
        ]);
        if (cancelled) return;
        if (spRes.ok) setSalesPersons(Array.isArray(spData) ? spData : []);
        const customerMap = Object.fromEntries(
          (Array.isArray(customerData) ? customerData : []).map((c) => [
            String(c.id || ""),
            c.companyName || c.primaryContactName || "—",
          ])
        );
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
              customerName: customerMap[String(q.customerId || "")] || "—",
              jobStatus: String(q.status || "draft"),
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

  const selectedJobMeta = useMemo(
    () => jobOptions.find((opt) => opt.value === newCommissionForm.jobKey)?.meta || null,
    [jobOptions, newCommissionForm.jobKey]
  );

  const getRowJobMeta = useCallback(
    (row) => {
      const quoteId = String(row?.quoteId || "").trim();
      const rfqNumber = String(row?.rfqNumber || "").trim();
      return (
        jobOptions.find((opt) => String(opt?.meta?.quoteId || "") === quoteId)?.meta ||
        jobOptions.find((opt) => String(opt?.meta?.rfqNumber || "") === rfqNumber)?.meta ||
        null
      );
    },
    [jobOptions]
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
          attachments: Array.isArray(newCommissionForm.attachments) ? newCommissionForm.attachments : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create commission");
      const newId = data.commission?.id;
      const pending = pendingCommissionAttachmentFiles;
      let commissionWithName = {
        ...data.commission,
        salesPersonName: salesPersonNameMap[data.commission?.salesPersonId] || "",
      };
      if (newId && pending.length > 0) {
        const fd = new FormData();
        pending.forEach((f) => fd.append("files", f));
        const up = await fetch(`/api/dashboard/sales-commissions/${newId}/upload`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          toast.error(upData.error || "Commission saved but document upload failed.");
        } else if (Array.isArray(upData.attachments)) {
          commissionWithName = {
            ...commissionWithName,
            attachments: upData.attachments,
            attachmentCount: upData.attachments.length,
          };
        }
      }
      setRows((prev) => [commissionWithName, ...prev]);
      setCreateModalOpen(false);
      setNewCommissionForm(NEW_COMMISSION_INITIAL);
      setPendingCommissionAttachmentFiles([]);
      toast.success("Sales commission created.");
    } catch (err) {
      toast.error(err.message || "Failed to create commission");
    } finally {
      setSavingCommission(false);
    }
  };

  const openEditModal = async (row) => {
    const matchedOption =
      jobOptions.find((opt) => opt.meta?.quoteId && opt.meta.quoteId === String(row.quoteId || "")) ||
      jobOptions.find((opt) => opt.meta?.rfqNumber && opt.meta.rfqNumber === String(row.rfqNumber || ""));
    const fallbackJobNumber = String(row.jobNumber || row.rfqNumber || "").trim();
    const jobKey = matchedOption?.value || (fallbackJobNumber ? `manual:${row.id}` : "");
    if (jobKey.startsWith("manual:")) {
      setJobOptions((prev) => {
        if (prev.some((opt) => opt.value === jobKey)) return prev;
        return [
          {
            value: jobKey,
            label: fallbackJobNumber,
            meta: {
              jobNumber: fallbackJobNumber,
              quoteId: String(row.quoteId || ""),
              rfqNumber: String(row.rfqNumber || ""),
              customerName: String(row.customerName || "").trim() || "—",
              jobStatus: String(row.jobStatus || "").trim() || "draft",
            },
          },
          ...prev,
        ];
      });
    }
    let attachments = Array.isArray(row.attachments) ? row.attachments : [];
    if (row.id) {
      try {
        const res = await fetch(`/api/dashboard/sales-commissions/${row.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          const full = await res.json();
          attachments = Array.isArray(full.attachments) ? full.attachments : attachments;
        }
      } catch {
        /* keep list-row attachments if any */
      }
    }
    setEditingCommissionId(row.id);
    setPendingCommissionAttachmentFiles([]);
    setNewCommissionForm({
      jobKey,
      salesPersonId: String(row.salesPersonId || ""),
      amount: String(row.amount ?? ""),
      status: row.status === "paid" ? "paid" : "unpaid",
      paidAt: row.paidAt ? new Date(row.paidAt).toISOString().slice(0, 10) : "",
      attachments,
    });
    setEditModalOpen(true);
  };

  const handleEditCommission = async (e) => {
    e.preventDefault();
    if (!editingCommissionId) return;
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
      const res = await fetch(`/api/dashboard/sales-commissions/${editingCommissionId}`, {
        method: "PATCH",
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
          attachments: Array.isArray(newCommissionForm.attachments) ? newCommissionForm.attachments : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update commission");
      const commissionWithName = {
        ...data.commission,
        salesPersonName:
          data.commission?.salesPersonName ||
          salesPersonNameMap[data.commission?.salesPersonId] ||
          "",
      };
      setRows((prev) => prev.map((r) => (r.id === editingCommissionId ? commissionWithName : r)));
      setEditModalOpen(false);
      setEditingCommissionId("");
      setNewCommissionForm(NEW_COMMISSION_INITIAL);
      setPendingCommissionAttachmentFiles([]);
      toast.success("Sales commission updated.");
    } catch (err) {
      toast.error(err.message || "Failed to update commission");
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
      setRows((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                ...data.commission,
                salesPersonName: data.commission?.salesPersonName || r.salesPersonName,
                attachmentCount:
                  data.commission?.attachmentCount ?? r.attachmentCount ?? 0,
              }
            : r
        )
      );
      toast.success("Commission marked as paid.");
    } catch (err) {
      toast.error(err.message || "Failed to update commission status");
    } finally {
      setStatusSavingId("");
    }
  };

  const openDocsCommissionModal = useCallback((row) => {
    if (!row?.id) return;
    setDocsCommissionMeta({
      id: row.id,
      label: String(row.jobNumber || row.rfqNumber || row.id).trim() || row.id,
    });
    setDocsCommissionAttachments([]);
    setDocsCommissionModalOpen(true);
  }, []);

  const closeDocsCommissionModal = useCallback(() => {
    setDocsCommissionModalOpen(false);
    setDocsCommissionMeta(null);
    setDocsCommissionAttachments([]);
    setDocsCommissionLoading(false);
  }, []);

  const persistDocsCommissionAttachments = useCallback(
    async (next) => {
      if (!docsCommissionMeta?.id) return;
      setDocsCommissionSaving(true);
      try {
        const res = await fetch(`/api/dashboard/sales-commissions/${docsCommissionMeta.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ attachments: next }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Update failed");
        const att = Array.isArray(data.commission?.attachments) ? data.commission.attachments : next;
        setDocsCommissionAttachments(att);
        await loadRows();
      } catch (e) {
        toast.error(e.message || "Could not update documents");
      } finally {
        setDocsCommissionSaving(false);
      }
    },
    [docsCommissionMeta?.id, loadRows, toast]
  );

  const handleDocsCommissionRemoveRow = async (_index, row) => {
    const next = docsCommissionAttachments.filter((a) => a.url !== row.url);
    await persistDocsCommissionAttachments(next);
  };

  const handleCommissionFileUpload = useCallback(async (files, commissionId) => {
    const id = String(commissionId || "").trim();
    if (!id) {
      toast.error("Save the commission first, then add documents.");
      return;
    }
    setCommissionAttachmentUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/dashboard/sales-commissions/${id}/upload`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setNewCommissionForm((f) => ({
        ...f,
        attachments: Array.isArray(data.attachments) ? data.attachments : f.attachments,
      }));
      toast.success("Files uploaded.");
      loadRows();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setCommissionAttachmentUploading(false);
    }
  }, [toast, loadRows]);

  useEffect(() => {
    if (!docsCommissionModalOpen || !docsCommissionMeta?.id) return;
    let cancelled = false;
    setDocsCommissionLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/sales-commissions/${docsCommissionMeta.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setDocsCommissionAttachments([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setDocsCommissionAttachments(Array.isArray(data.attachments) ? data.attachments : []);
      } catch {
        if (!cancelled) setDocsCommissionAttachments([]);
      } finally {
        if (!cancelled) setDocsCommissionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docsCommissionModalOpen, docsCommissionMeta?.id]);

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
      (r.customerName || getRowJobMeta(r)?.customerName || "").toLowerCase().includes(q) ||
      (r.jobStatus || getRowJobMeta(r)?.jobStatus || "").toLowerCase().includes(q) ||
      String(r.amount ?? "").toLowerCase().includes(q)
    );
  }, [unpaidRows, searchUnpaid, getRowJobMeta]);

  const filteredPaid = useMemo(() => {
    const q = searchPaid.trim().toLowerCase();
    if (!q) return paidRows;
    return paidRows.filter((r) =>
      (r.jobNumber || "").toLowerCase().includes(q) ||
      (r.rfqNumber || "").toLowerCase().includes(q) ||
      (r.salesPersonName || "").toLowerCase().includes(q) ||
      (r.customerName || getRowJobMeta(r)?.customerName || "").toLowerCase().includes(q) ||
      (r.jobStatus || getRowJobMeta(r)?.jobStatus || "").toLowerCase().includes(q) ||
      String(r.amount ?? "").toLowerCase().includes(q)
    );
  }, [paidRows, searchPaid, getRowJobMeta]);

  const getCommissionSortValue = useCallback((row, key) => {
    if (key === "jobNumber") return row.jobNumber || row.rfqNumber || "";
    if (key === "paidAt" || key === "createdAt") {
      const raw = row?.[key];
      const t = raw ? new Date(raw).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    if (key === "amount") return row?.amount;
    return row?.[key];
  }, []);

  const [unpaidSort, setUnpaidSort] = useState({ key: null, direction: "asc" });
  const [paidSort, setPaidSort] = useState({ key: null, direction: "asc" });
  const handleUnpaidSort = useCallback((key, direction) => setUnpaidSort({ key, direction }), []);
  const handlePaidSort = useCallback((key, direction) => setPaidSort({ key, direction }), []);

  const sortedFilteredUnpaid = useMemo(
    () => sortRowsClient(filteredUnpaid, unpaidSort, getCommissionSortValue),
    [filteredUnpaid, unpaidSort, getCommissionSortValue]
  );
  const sortedFilteredPaid = useMemo(
    () => sortRowsClient(filteredPaid, paidSort, getCommissionSortValue),
    [filteredPaid, paidSort, getCommissionSortValue]
  );

  const statusSummaryCards = useMemo(() => {
    const calcAmount = (list) =>
      list.reduce((sum, row) => {
        const amt = Number(row?.amount);
        return sum + (Number.isFinite(amt) ? amt : 0);
      }, 0);
    return [
      {
        key: "unpaid",
        label: "Unpaid",
        count: unpaidRows.length,
        amount: calcAmount(unpaidRows),
      },
      {
        key: "paid",
        label: "Paid",
        count: paidRows.length,
        amount: calcAmount(paidRows),
      },
    ];
  }, [paidRows, unpaidRows]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) =>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openDocsCommissionModal(row)}
              disabled={!(Number(row.attachmentCount) > 0)}
              className="rounded p-1.5 text-secondary hover:bg-card hover:text-title focus:outline-none focus:ring-2 focus:ring-primary disabled:pointer-events-none disabled:opacity-30"
              aria-label="View documents"
              title={row.attachmentCount ? "View documents" : "No documents"}
            >
              <FiPaperclip className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit"
              title="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            {row.status === "paid" ? (
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
            )}
          </div>,
      },
      {
        key: "jobNumber",
        label: "Job#",
        sortable: true,
        render: (_, row) => row.jobNumber || row.rfqNumber || "—",
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (_, row) => row.customerName || getRowJobMeta(row)?.customerName || "—",
      },
      {
        key: "jobStatus",
        label: "Job status",
        sortable: true,
        render: (_, row) => {
          const status = row.jobStatus || getRowJobMeta(row)?.jobStatus || "—";
          const s = String(status).toLowerCase();
          const variant =
            s === "paid" || s === "approved" || s === "completed" || s === "closed"
              ? "success"
              : s === "draft" || s === "open"
                ? "default"
                : s === "unpaid" || s === "pending"
                  ? "warning"
                  : "primary";
          return (
            <Badge variant={variant} className="rounded-full px-2.5 py-0.5 text-xs">
              {status}
            </Badge>
          );
        },
      },
      { key: "salesPersonName", label: "Sales person", sortable: true },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (_, row) => fmt(row.amount || 0),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
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
        sortable: true,
        render: (_, row) => formatDateIST(row.paidAt),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (_, row) => formatDateIST(row.createdAt),
      },
    ],
    [fmt, statusSavingId, openDocsCommissionModal, getRowJobMeta]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[86.4rem] flex-1 flex-col overflow-hidden px-4 py-8">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title">Sales Commission</h1>
            <p className="mt-1 text-sm text-secondary">
              Commissions tied to jobs, RFQs, and invoices.
            </p>
          </div>
          <Button type="button" variant="primary" onClick={() => setCreateModalOpen(true)}>
            <FiPlus className="h-4 w-4 shrink-0" />
            Add New Commission
          </Button>
        </div>
      </div>

      <div className="mt-6 min-h-0 flex-1">
        <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusSummaryCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-border bg-card/50 p-4">
              <div className="flex items-center gap-2 text-sm text-secondary">
                <FiDollarSign className="h-4 w-4" aria-hidden />
                {card.label}
              </div>
              <p className="mt-1 text-2xl font-bold tabular text-title">{fmt(card.amount)}</p>
              <p className="text-xs text-secondary">Count: {card.count}</p>
            </div>
          ))}
        </div>
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
                  data={sortedFilteredUnpaid}
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
                  sortState={unpaidSort}
                  onSort={handleUnpaidSort}
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
                  data={sortedFilteredPaid}
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
                  sortState={paidSort}
                  onSort={handlePaidSort}
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
          setPendingCommissionAttachmentFiles([]);
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
            placeholder="Select Job#"
            searchable
            required
          />
          <Input
            label="Customer"
            value={selectedJobMeta?.customerName || "—"}
            readOnly
          />
          <Input
            label="Selected job status"
            value={selectedJobMeta?.jobStatus || "—"}
            readOnly
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
          <VendorAttachmentsPanel
            resourceLabel="sales commission"
            vendorId={null}
            attachments={Array.isArray(newCommissionForm.attachments) ? newCommissionForm.attachments : []}
            onAttachmentsChange={(next) =>
              setNewCommissionForm((prev) => ({ ...prev, attachments: next }))
            }
            pendingFiles={pendingCommissionAttachmentFiles}
            onPendingFilesChange={setPendingCommissionAttachmentFiles}
            uploading={commissionAttachmentUploading}
          />
        </Form>
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={() => {
          if (savingCommission) return;
          setEditModalOpen(false);
          setEditingCommissionId("");
          setNewCommissionForm(NEW_COMMISSION_INITIAL);
          setPendingCommissionAttachmentFiles([]);
        }}
        title="Edit Commission"
        size="2xl"
        actions={
          <Button type="submit" form="edit-sales-commission-form" variant="primary" size="sm" disabled={savingCommission}>
            {savingCommission ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-sales-commission-form" onSubmit={handleEditCommission} className="flex flex-col gap-4 !space-y-0">
          <Select
            label="Job#"
            options={jobOptions}
            value={newCommissionForm.jobKey}
            onChange={(e) => setNewCommissionForm((prev) => ({ ...prev, jobKey: e.target.value ?? "" }))}
            placeholder="Select Job#"
            searchable
            required
          />
          <Input
            label="Customer"
            value={selectedJobMeta?.customerName || "—"}
            readOnly
          />
          <Input
            label="Selected job status"
            value={selectedJobMeta?.jobStatus || "—"}
            readOnly
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
          <VendorAttachmentsPanel
            resourceLabel="sales commission"
            resourceId={editingCommissionId || null}
            vendorId={null}
            attachments={Array.isArray(newCommissionForm.attachments) ? newCommissionForm.attachments : []}
            onAttachmentsChange={(next) =>
              setNewCommissionForm((prev) => ({ ...prev, attachments: next }))
            }
            pendingFiles={[]}
            onPendingFilesChange={() => {}}
            uploading={commissionAttachmentUploading}
            onPickFilesForUpload={handleCommissionFileUpload}
          />
        </Form>
      </Modal>

      <Modal
        open={docsCommissionModalOpen}
        onClose={closeDocsCommissionModal}
        title={
          docsCommissionMeta
            ? `Documents — Job ${docsCommissionMeta.label}`
            : "Documents"
        }
        size="lg"
      >
        {docsCommissionLoading ? (
          <div className="flex justify-center py-10">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : (
          <VendorAttachmentsPanel
            title="Attachments"
            resourceLabel="sales commission"
            resourceId={docsCommissionMeta?.id || null}
            vendorId={null}
            attachments={docsCommissionAttachments}
            onAttachmentsChange={setDocsCommissionAttachments}
            pendingFiles={[]}
            onPendingFilesChange={() => {}}
            uploading={docsCommissionSaving}
            hideUpload
            onRemoveSavedRow={handleDocsCommissionRemoveRow}
          />
        )}
      </Modal>
    </div>
  );
}
