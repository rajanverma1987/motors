"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FiDownload,
  FiExternalLink,
  FiLayers,
  FiClock,
  FiAlertCircle,
  FiCreditCard,
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

const TABS = [
  { id: "due", label: "Due to vendors", include: "due" },
  { id: "vendor", label: "By vendor", include: "due" },
  { id: "open", label: "Open POs", include: "open" },
  { id: "closed", label: "Closed", include: "closed" },
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

const STATUS_VARIANT = {
  Open: "default",
  "Partially Invoiced": "warning",
  "Fully Invoiced": "primary",
  "Partially Paid": "warning",
  Closed: "success",
};

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export default function AccountsPayablePageClient() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [tab, setTab] = useState("due");
  const [agingFilter, setAgingFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalPayable: 0,
    dueCount: 0,
    overdueCount: 0,
    openPoCount: 0,
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
      const inc = TABS.find((t) => t.id === tab)?.include || "due";
      const res = await fetch(`/api/dashboard/accounts-payable?include=${inc}`, {
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

  const filteredDueRows = useMemo(() => {
    if (tab !== "due" && tab !== "vendor") return rows;
    if (agingFilter === "all") return rows;
    return rows.filter((r) => r.agingBucket === agingFilter);
  }, [rows, agingFilter, tab]);

  const vendorGroups = useMemo(() => {
    const map = new Map();
    for (const r of filteredDueRows) {
      const k = r.vendorId;
      if (!map.has(k)) {
        map.set(k, {
          vendorId: k,
          vendorName: r.vendorName,
          balance: 0,
          pos: [],
        });
      }
      const g = map.get(k);
      g.balance += r.balanceDue;
      g.pos.push(r);
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [filteredDueRows]);

  const openPaymentModal = async (row) => {
    if (row.balanceDue <= 0.009) {
      toast.error("No balance due on vendor invoices for this PO.");
      return;
    }
    setPaymentForId(row.id);
    setPaymentRow(row);
    setPayDate(todayISODate());
    setPayMethod("check");
    setPayRef("");
    setPayNotes("");
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const po = await res.json();
      if (!res.ok) throw new Error(po.error || "Failed");
      const bal = Number(po.balanceDue ?? row.balanceDue) || 0;
      setPayAmount(bal > 0 ? String(bal) : "");
      const pays = Array.isArray(po.payments) ? [...po.payments].reverse() : [];
      setPaymentHistory(pays);
    } catch (e) {
      toast.error(e.message || "Could not load PO");
      setPayAmount(String(row.balanceDue));
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
      const res = await fetch(`/api/dashboard/purchase-orders/${paymentForId}/vendor-payments`, {
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
      toast.success("Vendor payment recorded.");
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
    const list =
      tab === "vendor"
        ? null
        : tab === "due"
          ? filteredDueRows
          : rows;
    const headers =
      tab === "vendor"
        ? ["Vendor", "POs with balance", "Total due"]
        : [
            "PO#",
            "Vendor",
            "Order total",
            "Vendor invoiced",
            "Paid",
            "Balance due",
            "Status",
            "Days",
            "Aging",
          ];
    const lines = [headers.join(",")];
    if (tab === "vendor") {
      for (const g of vendorGroups) {
        lines.push(
          [
            `"${String(g.vendorName).replace(/"/g, '""')}"`,
            g.pos.length,
            g.balance.toFixed(2),
          ].join(",")
        );
      }
    } else {
      for (const r of list || []) {
        lines.push(
          [
            `"${r.poNumber}"`,
            `"${String(r.vendorName).replace(/"/g, '""')}"`,
            r.orderTotal.toFixed(2),
            r.invoiced.toFixed(2),
            r.paid.toFixed(2),
            r.balanceDue.toFixed(2),
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
    a.download = `accounts-payable-${tab}-${todayISODate()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const showAging = tab === "due" || tab === "vendor";

  const tableColumns = useMemo(
    () => [
      {
        key: "_pay",
        label: "",
        render: (_, row) =>
          row.balanceDue > 0.009 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => openPaymentModal(row)}>
              Pay vendor
            </Button>
          ) : null,
      },
      {
        key: "poNumber",
        label: "PO#",
        render: (v) => (
          <span className="font-medium text-title">{v || "—"}</span>
        ),
      },
      { key: "vendorName", label: "Vendor" },
      {
        key: "orderTotal",
        label: "Order",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "invoiced",
        label: "Invoiced",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "paid",
        label: "Paid",
        render: (v) => <span className="tabular">{fmt(v)}</span>,
      },
      {
        key: "balanceDue",
        label: "Due",
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
        render: (v) => <Badge variant={STATUS_VARIANT[v] || "default"}>{v}</Badge>,
      },
    ],
    [fmt]
  );

  const closedColumns = useMemo(
    () => tableColumns.filter((c) => c.key !== "_pay"),
    [tableColumns]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Accounts payable</h1>
        <p className="mt-2 text-sm text-secondary">
          Pay vendors against <strong className="text-title">vendor invoices</strong> attached on each PO. Add
          vendor bills on Purchase orders → then record payments here. Aging uses the latest vendor invoice date
          (or PO date if none).
        </p>
      </div>

      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiCreditCard className="h-4 w-4" aria-hidden />
            Total due (invoiced)
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{fmt(summary.totalPayable)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiLayers className="h-4 w-4" aria-hidden />
            POs with balance due
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{summary.dueCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiAlertCircle className="h-4 w-4" aria-hidden />
            Overdue (30d+)
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{summary.overdueCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-4">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <FiClock className="h-4 w-4" aria-hidden />
            Open POs (not closed)
          </div>
          <p className="mt-1 text-2xl font-bold tabular text-title">{summary.openPoCount}</p>
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
            disabled={
              tab === "vendor" ? vendorGroups.length === 0 : rows.length === 0
            }
          >
            <FiDownload className="mr-1.5 inline h-4 w-4" />
            Export CSV
          </Button>
          <Link
            href="/dashboard/purchase-orders"
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-primary hover:bg-card"
          >
            Purchase orders <FiExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {tab === "vendor" ? (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-border bg-card">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-secondary">Vendor</th>
                <th className="px-4 py-3 text-right font-medium text-secondary">POs with balance</th>
                <th className="px-4 py-3 text-right font-medium text-secondary">Total due</th>
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
              ) : vendorGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary">
                    No vendor balances. Attach vendor invoices on a PO to create payables.
                  </td>
                </tr>
              ) : (
                vendorGroups.map((g) => (
                  <tr key={g.vendorId} className="border-b border-border/80">
                    <td className="px-4 py-3 font-medium text-title">{g.vendorName}</td>
                    <td className="px-4 py-3 text-right tabular">{g.pos.length}</td>
                    <td className="px-4 py-3 text-right tabular font-medium">{fmt(g.balance)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.pos.map((p) => (
                          <Button
                            key={p.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => openPaymentModal(p)}
                          >
                            {p.poNumber} ({fmt(p.balanceDue)})
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
          columns={tab === "closed" ? closedColumns : tableColumns}
          data={tab === "due" ? filteredDueRows : rows}
          rowKey="id"
          loading={loading}
          fillHeight
          emptyMessage={
            tab === "closed"
              ? "No closed POs yet."
              : tab === "open"
                ? "No open purchase orders."
                : "Nothing due. Record vendor invoices on your POs first."
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
        title={paymentRow ? `Pay vendor — PO ${paymentRow.poNumber}` : "Pay vendor"}
        size="md"
      >
        {paymentRow && (
          <div className="space-y-4">
            <p className="text-sm text-secondary">
              Vendor: <span className="text-title">{paymentRow.vendorName}</span>
              <br />
              Balance due (on vendor invoices):{" "}
              <span className="font-semibold tabular text-title">{fmt(paymentRow.balanceDue)}</span>
            </p>
            {paymentHistory.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Payment history
                </p>
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded border border-border bg-form-bg/50 p-2 text-xs">
                  {paymentHistory.map((p, i) => (
                    <li key={i} className="tabular">
                      {p.date} · {fmt(p.amount)} · {p.method || "—"}
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
