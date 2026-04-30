"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

const EMPTY_ENTRY = {
  date: "",
  description: "",
  party: "",
  debit: "",
  credit: "",
  receivable: "",
  payable: "",
  status: "",
};

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatLedgerDate(value) {
  if (value == null || value === "") return "—";
  let d = null;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "number") {
    d = new Date(value);
  } else {
    const raw = String(value).trim();
    if (!raw) return "—";
    const isoLike = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoLike) {
      d = new Date(`${isoLike[1]}T12:00:00.000Z`);
    } else {
      const hasExplicitYear = /\b\d{4}\b/.test(raw);
      if (hasExplicitYear) {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) d = parsed;
      }
    }
  }

  if (!d || Number.isNaN(d.getTime())) return String(value);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("paid")) return "success";
  if (s.includes("unpaid") || s.includes("payable")) return "warning";
  if (s.includes("billed")) return "primary";
  return "default";
}

export default function LedgerPageClient() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({
    totalDebit: 0,
    totalCredit: 0,
    totalReceivable: 0,
    totalPayable: 0,
    accountBalance: 0,
  });
  const [entryOpen, setEntryOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({ ...EMPTY_ENTRY, date: todayDate() });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const url = `/api/dashboard/ledger${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ledger");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(
        data.summary || {
          totalDebit: 0,
          totalCredit: 0,
          totalReceivable: 0,
          totalPayable: 0,
          accountBalance: 0,
        }
      );
    } catch (err) {
      toast.error(err.message || "Failed to load ledger");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { key: "date", label: "Date", render: (v) => formatLedgerDate(v) },
      { key: "description", label: "Description", render: (v) => v || "—" },
      { key: "party", label: "Party", render: (v) => v || "—" },
      {
        key: "debit",
        label: "Debit",
        render: (v) => (Number(v) > 0 ? <span className="tabular">{fmt(v)}</span> : " - "),
      },
      {
        key: "credit",
        label: "Credit",
        render: (v) => (Number(v) > 0 ? <span className="tabular">{fmt(v)}</span> : " - "),
      },
      {
        key: "receivable",
        label: "Receivable",
        render: (v) => (Number(v) > 0 ? <span className="tabular">{fmt(v)}</span> : " - "),
      },
      {
        key: "payable",
        label: "Payable",
        render: (v) => (Number(v) > 0 ? <span className="tabular">{fmt(v)}</span> : " - "),
      },
      {
        key: "status",
        label: "Status",
        render: (v) =>
          v ? (
            <Badge variant={statusVariant(v)} className="rounded-full px-2.5 py-0.5 text-xs">
              {v}
            </Badge>
          ) : (
            "—"
          ),
      },
    ],
    [fmt]
  );

  const filteredRows = useMemo(() => {
    const q = String(searchQuery || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const fields = [
        row.date,
        row.description,
        row.party,
        row.status,
        row.debit,
        row.credit,
        row.receivable,
        row.payable,
      ];
      return fields.some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [rows, searchQuery]);

  const handleSaveEntry = async () => {
    if (saving) return;
    if (!entryForm.date) {
      toast.error("Date is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: entryForm.date,
        description: entryForm.description,
        party: entryForm.party,
        debit: entryForm.debit,
        credit: entryForm.credit,
        receivable: entryForm.receivable,
        payable: entryForm.payable,
        status: entryForm.status,
      };
      const res = await fetch("/api/dashboard/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save entry");
      toast.success("Ledger entry added.");
      setEntryOpen(false);
      setEntryForm({ ...EMPTY_ENTRY, date: todayDate() });
      load();
    } catch (err) {
      toast.error(err.message || "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-8">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Ledger</h1>
          <p className="mt-2 text-sm text-secondary">
            Every money movement in and out, including receivables, payables, and settlement entries.
          </p>
        </div>
        <Button type="button" onClick={() => setEntryOpen(true)}>
          Add Entry
        </Button>
      </div>

      <div className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-medium text-secondary">Total Debit</p>
          <p className="mt-1 text-xl font-bold tabular text-title">{fmt(summary.totalDebit)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-medium text-secondary">Total Credit</p>
          <p className="mt-1 text-xl font-bold tabular text-title">{fmt(summary.totalCredit)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-medium text-secondary">Total Receivable</p>
          <p className="mt-1 text-xl font-bold tabular text-title">{fmt(summary.totalReceivable)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-medium text-secondary">Total Payable</p>
          <p className="mt-1 text-xl font-bold tabular text-title">{fmt(summary.totalPayable)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <p className="text-xs font-medium text-secondary">Account Balance</p>
          <p className="mt-1 text-xl font-bold tabular text-title">{fmt(summary.accountBalance)}</p>
        </div>
      </div>

      <div className="mb-3 flex shrink-0 flex-wrap items-end gap-2">
        <Input
          label="From"
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="mb-0 min-w-[190px]"
        />
        <Input
          label="To"
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="mb-0 min-w-[190px]"
        />
        <Button type="button" variant="primary" size="sm" onClick={load}>
          Go
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setFromDate("");
            setToDate("");
          }}
        >
          Clear
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <FiRefreshCw className="mr-1.5 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Table
        columns={columns}
        data={filteredRows}
        rowKey="id"
        loading={loading}
        fillHeight
        searchable
        onSearch={setSearchQuery}
        searchPlaceholder="Search ledger..."
        emptyMessage="No ledger transactions found for this date range."
      />

      <Modal
        open={entryOpen}
        onClose={() => !saving && setEntryOpen(false)}
        title="Add ledger entry"
        size="md"
        actions={
          <Button type="submit" form="ledger-entry-form" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save entry"}
          </Button>
        }
      >
        <form
          id="ledger-entry-form"
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEntry();
          }}
        >
          <Input
            label="Date"
            type="date"
            value={entryForm.date}
            onChange={(e) => setEntryForm((p) => ({ ...p, date: e.target.value }))}
          />
          <Input
            label="Description"
            value={entryForm.description}
            onChange={(e) => setEntryForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Input
            label="Party"
            value={entryForm.party}
            onChange={(e) => setEntryForm((p) => ({ ...p, party: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Debit"
              type="number"
              min="0"
              step="0.01"
              value={entryForm.debit}
              onChange={(e) => setEntryForm((p) => ({ ...p, debit: e.target.value }))}
            />
            <Input
              label="Credit"
              type="number"
              min="0"
              step="0.01"
              value={entryForm.credit}
              onChange={(e) => setEntryForm((p) => ({ ...p, credit: e.target.value }))}
            />
            <Input
              label="Receivable"
              type="number"
              min="0"
              step="0.01"
              value={entryForm.receivable}
              onChange={(e) => setEntryForm((p) => ({ ...p, receivable: e.target.value }))}
            />
            <Input
              label="Payable"
              type="number"
              min="0"
              step="0.01"
              value={entryForm.payable}
              onChange={(e) => setEntryForm((p) => ({ ...p, payable: e.target.value }))}
            />
          </div>
          <Input
            label="Status"
            value={entryForm.status}
            onChange={(e) => setEntryForm((p) => ({ ...p, status: e.target.value }))}
          />
        </form>
      </Modal>
    </div>
  );
}
