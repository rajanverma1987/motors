"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FiDollarSign,
  FiDownload,
  FiExternalLink,
  FiLayers,
  FiClock,
  FiAlertCircle,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { invoiceStatusLabel, invoiceStatusBadgeVariant } from "@/lib/invoice-status";

const TABS = [
  { id: "open", label: "Open (due)", include: "open" },
  { id: "customer", label: "By customer", include: "open" },
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

export default function AccountsReceivablePageClient() {
  const toast = useToast();
  const router = useRouter();
  const fmt = useFormatMoney();
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const inc =
        tab === "customer" ? "open" : TABS.find((t) => t.id === tab)?.include || "open";
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
    if (tab !== "open" && tab !== "customer") return rows;
    if (agingFilter === "all") return rows;
    return rows.filter((r) => r.agingBucket === agingFilter);
  }, [rows, agingFilter, tab]);

  const customerGroups = useMemo(() => {
    const map = new Map();
    for (const r of filteredOpenRows) {
      const k = r.customerId;
      if (!map.has(k)) {
        map.set(k, {
          customerId: k,
          customerName: r.customerName,
          balance: 0,
          invoices: [],
        });
      }
      const g = map.get(k);
      g.balance += r.balance;
      g.invoices.push(r);
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [filteredOpenRows]);

  const openPaymentModal = async (row) => {
    setPaymentForId(row.id);
    setPaymentRow(row);
    setPayDate(todayISODate());
    setPayMethod("check");
    setPayRef("");
    setPayNotes("");
    try {
      const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const inv = await res.json();
      if (!res.ok) throw new Error(inv.error || "Failed");
      const bal = Math.max(0, inv.balance ?? row.balance);
      setPayAmount(bal > 0 ? String(bal) : "");
      setPaymentHistory(Array.isArray(inv.payments) ? [...inv.payments].reverse() : []);
    } catch (e) {
      toast.error(e.message || "Could not load invoice");
      setPayAmount(String(row.balance));
      setPaymentHistory([]);
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
      const res = await fetch(`/api/dashboard/invoices/${paymentForId}/payments`, {
        method: "POST",
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
      toast.success("Payment recorded.");
      setPaymentForId(null);
      setPaymentRow(null);
      load();
    } catch (e) {
      toast.error(e.message || "Could not record payment");
    } finally {
      setPaySubmitting(false);
    }
  };

  const exportCsv = () => {
    const listRows =
      tab === "customer"
        ? null
        : tab === "open"
          ? filteredOpenRows
          : rows;
    const headers =
      tab === "customer"
        ? ["Customer", "Open invoices", "Total balance"]
        : tab === "paid"
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
    if (tab === "customer") {
      for (const g of customerGroups) {
        lines.push(
          [
            `"${String(g.customerName).replace(/"/g, '""')}"`,
            g.invoices.length,
            g.balance.toFixed(2),
          ].join(",")
        );
      }
    } else {
      for (const r of listRows || []) {
        lines.push(
          tab === "paid"
            ? [
                `"${r.invoiceNumber}"`,
                `"${String(r.customerName).replace(/"/g, '""')}"`,
                r.date,
                r.invoiceTotal.toFixed(2),
                r.amountPaid.toFixed(2),
                r.status,
                r.daysOutstanding ?? "",
                r.agingBucket,
              ].join(",")
            : [
                `"${r.invoiceNumber}"`,
                `"${String(r.customerName).replace(/"/g, '""')}"`,
                r.date,
                r.invoiceTotal.toFixed(2),
                r.amountPaid.toFixed(2),
                r.balance.toFixed(2),
                r.status,
                r.daysOutstanding ?? "",
                r.agingBucket,
              ].join(",")
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `accounts-receivable-${tab}-${todayISODate()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const showAging = tab === "open" || tab === "customer";

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
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(`/dashboard/invoices?open=${row.id}`)}
          >
            {v || "—"}
          </button>
        ),
      },
      { key: "customerName", label: "Customer" },
      { key: "date", label: "Date" },
      {
        key: "invoiceTotal",
        label: "Total",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "amountPaid",
        label: "Paid",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "balance",
        label: "Balance",
        render: (v) => <span className="tabular font-medium">{fmt(v)}</span>,
      },
      {
        key: "daysOutstanding",
        label: "Days",
        render: (v) => (v != null ? v : "—"),
      },
      {
        key: "agingBucket",
        label: "Aging",
        render: (v) => <span className="text-secondary">{v}</span>,
      },
      {
        key: "status",
        label: "Status",
        render: (v) => <Badge variant={invoiceStatusBadgeVariant(v)}>{invoiceStatusLabel(v)}</Badge>,
      },
    ],
    [fmt, router]
  );

  const paidHistoryColumns = useMemo(
    () => [
      {
        key: "invoiceNumber",
        label: "Invoice#",
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => router.push(`/dashboard/invoices?open=${row.id}`)}
          >
            {v || "—"}
          </button>
        ),
      },
      { key: "customerName", label: "Customer" },
      { key: "date", label: "Date" },
      {
        key: "invoiceTotal",
        label: "Total",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "amountPaid",
        label: "Paid",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "daysOutstanding",
        label: "Days",
        render: (v) => (v != null ? v : "—"),
      },
      { key: "agingBucket", label: "Aging" },
      {
        key: "status",
        label: "Status",
        render: (v) => <Badge variant={invoiceStatusBadgeVariant(v)}>{invoiceStatusLabel(v)}</Badge>,
      },
    ],
    [fmt, router]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Accounts receivable</h1>
        <p className="mt-2 text-sm text-secondary">
          Record customer payments, track open balances, and export for accounting.{" "}
          <strong>Overdue</strong> = open balance past your default payment terms (
          {summary.overdueTermsLabel || "NET 30"}
          {summary.overdueGraceDays != null && summary.overdueGraceDays > 0
            ? ` — ${summary.overdueGraceDays}+ days from invoice date`
            : " — due upon receipt; counted overdue after invoice date"}
          ), set in Settings → Accounts.
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
            <div className="flex min-w-[200px] flex-col gap-1 sm:min-w-[220px]">
              <span className="flex items-center gap-1 text-xs font-medium text-secondary">
                <FiClock className="h-3.5 w-3.5" aria-hidden />
                Aging
              </span>
              <Select
                label=""
                className="!mb-0"
                options={AGING.map((a) => ({ value: a.id, label: a.label }))}
                value={agingFilter}
                onChange={(e) => setAgingFilter(e.target.value)}
                searchable={false}
              />
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={tab === "customer" ? customerGroups.length === 0 : rows.length === 0}
          >
            <FiDownload className="mr-1.5 inline h-4 w-4" />
            Export CSV
          </Button>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-card"
          >
            Invoices <FiExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {tab === "customer" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-secondary">Open invoices</th>
                <th className="px-4 py-3 text-right font-medium text-secondary">Total balance</th>
                <th className="px-4 py-3 text-left font-medium text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                    Loading…
                  </td>
                </tr>
              ) : customerGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                    No open balances.
                  </td>
                </tr>
              ) : (
                customerGroups.map((g) => (
                  <tr key={g.customerId} className="border-b border-border/80">
                    <td className="px-4 py-3 font-medium text-title">{g.customerName}</td>
                    <td className="px-4 py-3 text-right tabular">{g.invoices.length}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{fmt(g.balance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.invoices.map((inv) => (
                          <Button
                            key={inv.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openPaymentModal(inv)}
                          >
                            #{inv.invoiceNumber} ({fmt(inv.balance)})
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <Table
          columns={tab === "paid" ? paidHistoryColumns : openColumns}
          data={tab === "paid" ? rows : tab === "draft" ? rows : filteredOpenRows}
          rowKey="id"
          loading={loading}
          fillHeight
          emptyMessage={
            tab === "paid"
              ? "No paid invoices yet. Record payments on open invoices."
              : tab === "draft"
                ? "No draft invoices with a balance."
                : "No open receivables. Sent invoices appear here until fully paid."
          }
        />
      )}

      <Modal
        open={!!paymentForId}
        onClose={() => {
          if (!paySubmitting) {
            setPaymentForId(null);
            setPaymentRow(null);
          }
        }}
        title={paymentRow ? `Record payment — #${paymentRow.invoiceNumber}` : "Record payment"}
        size="md"
      >
        {paymentRow && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Customer: <span className="text-title">{paymentRow.customerName}</span>
              <br />
              Open balance:{" "}
              <span className="font-semibold tabular text-title">{fmt(paymentRow.balance)}</span>
            </p>
            {paymentHistory.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Payment history
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-border bg-form-bg/50 p-2 text-xs">
                  {paymentHistory.map((p, i) => (
                    <li key={i} className="tabular">
                      {p.paymentDate} · {fmt(p.amount)} · {p.method || "—"}
                      {p.reference ? ` · ref ${p.reference}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" disabled={paySubmitting} onClick={() => setPaymentForId(null)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" disabled={paySubmitting} onClick={submitPayment}>
                {paySubmitting ? "Saving…" : "Record payment"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
