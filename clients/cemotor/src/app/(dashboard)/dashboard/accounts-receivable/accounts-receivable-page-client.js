"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import {
  FiDollarSign,
  FiDownload,
  FiEdit2,
  FiExternalLink,
  FiLayers,
  FiClock,
  FiAlertCircle,
  FiTrash2,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { invoiceStatusLabel, invoiceStatusPillAppearance } from "@/lib/invoice-status";
import { mergeUserSettings } from "@/lib/user-settings";
import { sortRowsClient } from "@/lib/client-table-sort";
import { formatDateMdy } from "@/lib/format-date";
import CustomerViewModal from "@/components/dashboard/customer-view-modal";
import { CustomerRecordLink } from "@/components/dashboard/customer-record-link";

const TABS = [
  { id: "open", label: "Open (due)", include: "open" },
  { id: "draft", label: "Drafts (unpaid)", include: "draft" },
  { id: "paid", label: "Paid history", include: "paid" },
];

const AGING = [
  { id: "all", label: "All ages" },
  { id: "0-30", label: "0–30 days" },
  { id: "31-60", label: "31–60 days" },
  { id: "61-90", label: "61–90 days" },
  { id: "90+", label: "90+ days" },
];

const PAYMENT_METHODS = [
  { value: "check", label: "Check" },
  { value: "ach", label: "ACH / bank transfer" },
  { value: "wire", label: "Wire" },
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function paymentMethodLabel(value) {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value || "—";
}

export default function AccountsReceivablePageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const mergedAccountSettings = useMemo(() => mergeUserSettings(accountSettings), [accountSettings]);
  const [tab, setTab] = useState("open");
  const [agingFilter, setAgingFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalOutstanding: 0,
    openCount: 0,
    overdueCount: 0,
    overdueGraceDays: 30,
    overdueTermsLabel: "NET 30",
  });
  const [loading, setLoading] = useState(true);
  const [paymentForId, setPaymentForId] = useState(null);
  const [paymentRow, setPaymentRow] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISODate);
  const [payMethod, setPayMethod] = useState("check");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inc = TABS.find((t) => t.id === tab)?.include || "open";
      const res = await fetch(`/api/dashboard/accounts-receivable?include=${inc}`, {
        credentials: "include",
        cache: "no-store",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to load");
      setRows(d.rows || []);
      if (d.summary) setSummary(d.summary);
    } catch (e) {
      toast.error(e.message || "Could not load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredOpenRows = useMemo(() => {
    if (tab !== "open") return rows;
    if (agingFilter === "all") return rows;
    return rows.filter((r) => r.agingBucket === agingFilter);
  }, [rows, agingFilter, tab]);

  const applyPaymentModalInvoice = useCallback((inv, rowFallback, { resetAmount = false } = {}) => {
    const bal = Math.max(0, inv.balance ?? rowFallback?.balance ?? 0);
    setPaymentRow((prev) => ({
      ...(rowFallback || prev || {}),
      balance: bal,
      customerName: inv.customerName || rowFallback?.customerName,
      invoiceNumber: inv.invoiceNumber || rowFallback?.invoiceNumber,
    }));
    setPaymentHistory(
      Array.isArray(inv.payments)
        ? inv.payments.map((p, i) => ({ ...p, _index: i }))
        : []
    );
    if (resetAmount) {
      setPayAmount(bal > 0 ? String(bal) : "");
    }
  }, []);

  const resetPaymentForm = useCallback((balance) => {
    setEditingPaymentIndex(null);
    setPayDate(todayISODate());
    setPayMethod("check");
    setPayRef("");
    setPayNotes("");
    const bal = Math.max(0, Number(balance) || 0);
    setPayAmount(bal > 0 ? String(bal) : "");
  }, []);

  const openPaymentModal = async (row) => {
    setPaymentForId(row.id);
    setPaymentRow(row);
    resetPaymentForm(row.balance);
    try {
      const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const inv = await res.json();
      if (!res.ok) throw new Error(inv.error || "Failed");
      applyPaymentModalInvoice(inv, row, { resetAmount: true });
    } catch (e) {
      toast.error(e.message || "Could not load invoice");
      setPayAmount(String(row.balance));
      setPaymentHistory([]);
    }
  };

  const refreshPaymentModal = useCallback(
    async (invoiceId, rowFallback, { resetAmount = false } = {}) => {
      const res = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const inv = await res.json();
      if (!res.ok) throw new Error(inv.error || "Failed to load invoice");
      applyPaymentModalInvoice(inv, rowFallback, { resetAmount });
      return inv;
    },
    [applyPaymentModalInvoice]
  );

  const handleEditPayment = (payment) => {
    if (payment?._index == null) return;
    setEditingPaymentIndex(payment._index);
    setPayAmount(String(payment.amount ?? ""));
    setPayDate(String(payment.paymentDate ?? "").slice(0, 10) || todayISODate());
    setPayMethod(payment.method || "check");
    setPayRef(payment.reference || "");
    setPayNotes(payment.notes || "");
  };

  const handleDeletePayment = async (payment) => {
    if (!paymentForId || payment?._index == null || paySubmitting) return;
    const ok = await confirm({
      title: "Delete payment",
      message: `Remove this payment${payment.amount ? ` (${fmt(payment.amount)})` : ""}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setPaySubmitting(true);
    try {
      const res = await fetch(
        `/api/dashboard/invoices/${paymentForId}/payments/${payment._index}`,
        { method: "DELETE", credentials: "include" }
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.success("Payment removed.");
      if (editingPaymentIndex === payment._index) {
        resetPaymentForm(d.invoice?.balance ?? paymentRow?.balance);
      } else if (editingPaymentIndex != null && editingPaymentIndex > payment._index) {
        setEditingPaymentIndex(editingPaymentIndex - 1);
      }
      await refreshPaymentModal(paymentForId, {
        ...paymentRow,
        balance: d.invoice?.balance ?? paymentRow?.balance,
      });
      load();
    } catch (e) {
      toast.error(e.message || "Could not delete payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  const submitPayment = async () => {
    if (!paymentForId || paySubmitting) return;
    const amt = parseFloat(String(payAmount).replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setPaySubmitting(true);
    try {
      const isEdit = editingPaymentIndex != null && editingPaymentIndex >= 0;
      const url = isEdit
        ? `/api/dashboard/invoices/${paymentForId}/payments/${editingPaymentIndex}`
        : `/api/dashboard/invoices/${paymentForId}/payments`;
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: amt,
          paymentDate: payDate,
          method: payMethod,
          reference: payRef,
          notes: payNotes,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Payment failed");
      toast.success(isEdit ? "Payment updated." : "Payment recorded.");
      resetPaymentForm(d.invoice?.balance ?? 0);
      await refreshPaymentModal(
        paymentForId,
        {
          ...paymentRow,
          balance: d.invoice?.balance ?? paymentRow?.balance,
        },
        { resetAmount: true }
      );
      if ((d.invoice?.balance ?? 0) <= 0.009) {
        setPaymentForId(null);
        setPaymentRow(null);
      }
      load();
    } catch (e) {
      toast.error(e.message || "Could not save payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  const exportCsv = () => {
    const listRows = tab === "open" ? filteredOpenRows : rows;
    const headers =
      tab === "paid"
        ? ["Invoice#", "Customer", "Date", "Total", "Amount paid", "Status", "Days", "Aging"]
        : [
            "Invoice#",
            "Customer",
            "Date",
            "Invoice total",
            "Amount paid",
            "Balance",
            "Status",
            "Days out",
            "Aging",
          ];
    const lines = [headers.join(",")];
    for (const r of listRows || []) {
        lines.push(
          tab === "paid"
            ? [
                `"${r.invoiceNumber}"`,
                `"${String(r.customerName).replace(/"/g, '""')}"`,
                formatDateMdy(r.date),
                r.invoiceTotal.toFixed(2),
                r.amountPaid.toFixed(2),
                r.status,
                r.daysOutstanding ?? "",
                r.agingBucket,
              ].join(",")
            : [
                `"${r.invoiceNumber}"`,
                `"${String(r.customerName).replace(/"/g, '""')}"`,
                formatDateMdy(r.date),
                r.invoiceTotal.toFixed(2),
                r.amountPaid.toFixed(2),
                r.balance.toFixed(2),
                r.status,
                r.daysOutstanding ?? "",
                r.agingBucket,
              ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `accounts-receivable-${tab}-${todayISODate()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const showAging = tab === "open";

  const [arTableSort, setArTableSort] = useState({ key: null, direction: "asc" });
  const arTableSource = tab === "paid" || tab === "draft" ? rows : filteredOpenRows;
  const sortedArTableData = useMemo(
    () => sortRowsClient(arTableSource, arTableSort),
    [arTableSource, arTableSort]
  );
  const searchFilteredArTableData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedArTableData;
    return sortedArTableData.filter((row) => {
      const hay = [
        row.invoiceNumber,
        row.customerName,
        row.date,
        row.status,
        row.agingBucket,
        fmt(row.invoiceTotal),
        fmt(row.balance),
        fmt(row.amountPaid),
        String(row.daysOutstanding ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [sortedArTableData, searchQuery, fmt]);
  const handleArTableSort = useCallback((key, direction) => setArTableSort({ key, direction }), []);

  const openColumns = useMemo(
    () => [
      {
        key: "_pay",
        label: "",
        render: (_, row) =>
          row.balance > 0.009 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openPaymentModal(row)}>
              Record payment
            </Button>
          ) : null,
      },
      {
        key: "invoiceNumber",
        label: "Invoice#",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setInvoiceModal({ invoiceId: row.id })}
          >
            {v || "—"}
          </button>
        ),
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (_, row) => (
          <CustomerRecordLink customerId={row.customerId} onOpen={setOpenCustomerId}>
            {row.customerName || "—"}
          </CustomerRecordLink>
        ),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (v) => <span className="tabular-nums">{formatDateMdy(v)}</span>,
      },
      {
        key: "invoiceTotal",
        label: "Total",
        sortable: true,
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "amountPaid",
        label: "Paid",
        sortable: true,
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "balance",
        label: "Balance",
        sortable: true,
        render: (v) => <span className="tabular font-medium">{fmt(v)}</span>,
      },
      {
        key: "daysOutstanding",
        label: "Days",
        sortable: true,
        render: (v) => (v != null ? v : "—"),
      },
      {
        key: "agingBucket",
        label: "Aging",
        sortable: true,
        render: (v) => <span className="text-secondary">{v}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => {
          const pill = invoiceStatusPillAppearance(v, mergedAccountSettings);
          return (
          <span
            className={`job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
            style={pill.style}
          >
            {invoiceStatusLabel(v, mergedAccountSettings)}
          </span>
          );
        },
      },
    ],
    [fmt, mergedAccountSettings]
  );

  const paidHistoryColumns = useMemo(
    () => [
      {
        key: "invoiceNumber",
        label: "Invoice#",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setInvoiceModal({ invoiceId: row.id })}
          >
            {v || "—"}
          </button>
        ),
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (_, row) => (
          <CustomerRecordLink customerId={row.customerId} onOpen={setOpenCustomerId}>
            {row.customerName || "—"}
          </CustomerRecordLink>
        ),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (v) => <span className="tabular-nums">{formatDateMdy(v)}</span>,
      },
      {
        key: "invoiceTotal",
        label: "Total",
        sortable: true,
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "amountPaid",
        label: "Paid",
        sortable: true,
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "daysOutstanding",
        label: "Days",
        sortable: true,
        render: (v) => (v != null ? v : "—"),
      },
      { key: "agingBucket", label: "Aging", sortable: true },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => {
          const pill = invoiceStatusPillAppearance(v, mergedAccountSettings);
          return (
          <span
            className={`job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
            style={pill.style}
          >
            {invoiceStatusLabel(v, mergedAccountSettings)}
          </span>
          );
        },
      },
    ],
    [fmt, mergedAccountSettings]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Accounts receivable</h1>
        <p className="mt-2 text-sm text-secondary">
          Customer payments and open balances; export for accounting. Overdue follows Settings → Accounts.
        </p>
      </div>

      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiDollarSign className="h-4 w-4" aria-hidden />
            Total outstanding
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{fmt(summary.totalOutstanding)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiLayers className="h-4 w-4" aria-hidden />
            Open invoices
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{summary.openCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiAlertCircle className="h-4 w-4" aria-hidden />
            Overdue (past {summary.overdueTermsLabel || "terms"})
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{summary.overdueCount}</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setAgingFilter("all");
              setSearchQuery("");
            }}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-primary text-white"
                : "bg-card text-secondary hover:bg-card/80 hover:text-title"
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {showAging && (
            <label className="flex items-center gap-2">
              <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-medium text-secondary">
                <FiClock className="h-4 w-4 shrink-0" aria-hidden />
                Aging
              </span>
              <Select
                label=""
                className="!mb-0 !gap-0 w-[11rem] sm:w-[12rem] [&>div]:h-8 [&>div]:min-h-8 [&>div]:py-1"
                options={AGING.map((a) => ({ value: a.id, label: a.label }))}
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                searchable={false}
              />
            </label>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
            Export CSV
          </Button>
          <Link
            href="/dashboard/invoices"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-[0.5px] border-border bg-transparent px-3 text-sm font-medium text-primary transition-opacity hover:bg-card hover:border-primary/20"
          >
            Invoices
            <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>

      <Table
        columns={tab === "paid" ? paidHistoryColumns : openColumns}
        data={searchFilteredArTableData}
        rowKey="id"
        loading={loading}
        fillHeight
        sortState={arTableSort}
        onSort={handleArTableSort}
        searchable
        onSearch={setSearchQuery}
        searchPlaceholder="Search invoice#, customer, date, status, aging…"
        emptyMessage={
          searchQuery.trim()
            ? "No invoices match your search."
            : tab === "paid"
              ? "No paid invoices yet. Record payments on open invoices."
              : tab === "draft"
                ? "No draft invoices with a balance."
                : "No open receivables. Sent invoices appear here until fully paid."
        }
      />

      <Modal
        open={!!paymentForId}
        onClose={() => {
          if (!paySubmitting) {
            setPaymentForId(null);
            setPaymentRow(null);
            setEditingPaymentIndex(null);
          }
        }}
        title={
          paymentRow
            ? `${editingPaymentIndex != null ? "Edit" : "Record"} payment — #${paymentRow.invoiceNumber}`
            : "Record payment"
        }
        size="lg"
        actions={
          paymentRow ? (
            <>
              {editingPaymentIndex != null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={paySubmitting}
                  onClick={() => resetPaymentForm(paymentRow.balance)}
                >
                  Cancel edit
                </Button>
              ) : null}
              <Button type="button" variant="primary" size="sm" disabled={paySubmitting} onClick={submitPayment}>
                {paySubmitting ? "Saving…" : editingPaymentIndex != null ? "Update payment" : "Record payment"}
              </Button>
            </>
          ) : null
        }
      >
        {paymentRow && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Customer: <span className="text-title">{paymentRow.customerName}</span>
              <br />
              Open balance:{" "}
              <span className="font-semibold tabular text-title">{fmt(paymentRow.balance)}</span>
            </p>

            <Input
              label="Amount"
              type="text"
              inputMode="decimal"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <Input label="Payment date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            <Select
              label="Method"
              options={PAYMENT_METHODS}
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              searchable={false}
            />
            <Input
              label="Reference # (check / transaction id)"
              value={payRef}
              onChange={(e) => setPayRef(e.target.value)}
            />
            <Textarea label="Notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} rows={2} />

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Payment history</p>
              {paymentHistory.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="w-0 px-2 py-2 text-left text-secondary">
                          <span className="sr-only">Actions</span>
                        </th>
                        <th className="px-3 py-2 text-right text-secondary">Amount</th>
                        <th className="px-3 py-2 text-left text-secondary">Date</th>
                        <th className="px-3 py-2 text-left text-secondary">Method</th>
                        <th className="px-3 py-2 text-left text-secondary">Reference</th>
                        <th className="px-3 py-2 text-left text-secondary">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...paymentHistory].reverse().map((p) => (
                        <tr
                          key={p._index}
                          className={`border-t border-border ${editingPaymentIndex === p._index ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={paySubmitting}
                                onClick={() => handleEditPayment(p)}
                                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                aria-label="Edit payment"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                              <button
                                type="button"
                                disabled={paySubmitting}
                                onClick={() => handleDeletePayment(p)}
                                className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
                                aria-label="Delete payment"
                                title="Delete"
                              >
                                <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(p.amount)}</td>
                          <td className="px-3 py-2 text-secondary">{formatDateMdy(p.paymentDate)}</td>
                          <td className="px-3 py-2 text-title">{paymentMethodLabel(p.method)}</td>
                          <td className="px-3 py-2 text-secondary">{p.reference || "—"}</td>
                          <td className="max-w-[12rem] truncate px-3 py-2 text-secondary" title={p.notes || ""}>
                            {p.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No payments recorded yet.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      <InvoiceFormModal
        open={!!invoiceModal}
        draftQuoteId={invoiceModal?.draftQuoteId ?? null}
        invoiceId={invoiceModal?.invoiceId ?? null}
        onClose={() => setInvoiceModal(null)}
        onAfterSave={load}
        onSwitchToInvoice={(id) => setInvoiceModal({ invoiceId: id })}
        zIndex={55}
      />

      <CustomerViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={56}
      />
    </div>
  );
}
