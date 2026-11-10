"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Table from "@/components/ui/table";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { formatDateMdy } from "@/lib/format-date";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
export default function TaxesPageClient() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [activeTab, setActiveTab] = useState("paid");
  const [loading, setLoading] = useState(true);
  const [taxPaidRows, setTaxPaidRows] = useState([]);
  const [taxPaidSummary, setTaxPaidSummary] = useState({ poAmount: 0, taxPaid: 0 });
  const [otherRows, setOtherRows] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [savingOther, setSavingOther] = useState(false);
  const [otherForm, setOtherForm] = useState({
    taxType: "",
    taxPeriod: "",
    paidDate: todayIso(),
    paidAmount: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/taxes", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTaxPaidRows(data.taxPaid?.rows || []);
      setTaxPaidSummary(data.taxPaid?.summary || { poAmount: 0, taxPaid: 0 });
      setOtherRows(data.otherTaxPayments || []);
    } catch (e) {
      toast.error(e.message || "Failed to load taxes");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const taxesExportStamp = useMemo(() => todayIso(), []);

  const paidExportFilename = useMemo(() => `taxes-tax-paid-${taxesExportStamp}.csv`, [taxesExportStamp]);
  const otherExportFilename = useMemo(
    () => `taxes-other-payments-${taxesExportStamp}.csv`,
    [taxesExportStamp]
  );

  const paidColumns = useMemo(
    () => [
      {
        key: "poNumber",
        label: "PO#",
        sortable: true,
        render: (v, row) => (
          <Link
            href={`/dashboard/purchase-orders?open=${encodeURIComponent(row.id)}`}
            className="font-medium text-primary hover:underline"
          >
            {v || "—"}
          </Link>
        ),
        exportValue: (v) => v ?? "",
      },
      {
        key: "vendorName",
        label: "Vendor name",
        sortable: true,
        exportValue: (v) => v ?? "",
      },
      {
        key: "poAmount",
        label: "PO amount",
        sortable: true,
        render: (v) => fmt(v),
        exportValue: (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : ""),
      },
      {
        key: "taxPaid",
        label: "Tax paid",
        sortable: true,
        render: (v) => <span className="tabular-nums font-medium text-title">{fmt(v)}</span>,
        exportValue: (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : ""),
      },
    ],
    [fmt]
  );

  const otherColumns = useMemo(
    () => [
      {
        key: "taxType",
        label: "Tax type",
        sortable: true,
        exportValue: (v) => v ?? "",
      },
      {
        key: "taxPeriod",
        label: "Tax period",
        sortable: true,
        exportValue: (v) => v ?? "",
      },
      {
        key: "paidDate",
        label: "Paid date",
        sortable: true,
        render: (v) => <span className="tabular-nums">{formatDateMdy(v)}</span>,
        exportValue: (v) => formatDateMdy(v),
      },
      {
        key: "paidAmount",
        label: "Paid amount",
        sortable: true,
        render: (v) => fmt(v),
        exportValue: (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(2) : ""),
      },
    ],
    [fmt]
  );

  const handleSubmitOtherTax = async (e) => {
    e.preventDefault();
    if (!otherForm.taxType.trim()) {
      toast.error("Tax type is required.");
      return;
    }
    if (!otherForm.paidDate.trim()) {
      toast.error("Paid date is required.");
      return;
    }
    const amt = parseFloat(String(otherForm.paidAmount).trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Enter a valid paid amount.");
      return;
    }
    setSavingOther(true);
    try {
      const res = await fetch("/api/dashboard/taxes/other-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taxType: otherForm.taxType.trim(),
          taxPeriod: otherForm.taxPeriod.trim(),
          paidDate: otherForm.paidDate.trim().slice(0, 10),
          paidAmount: amt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Tax payment saved. It appears on the Ledger as a tax payment.");
      setAddOpen(false);
      setOtherForm({ taxType: "", taxPeriod: "", paidDate: todayIso(), paidAmount: "" });
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingOther(false);
    }
  };

  return (
    <div className="w-full min-w-0 flex-1">
      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Taxes</h1>
        <p className="mt-1 text-sm text-secondary">
          Estimated tax included in vendor PO payments and other tax remittances. Other tax payments also post to the{" "}
          <Link href="/dashboard/ledger" className="text-primary hover:underline">
            Ledger
          </Link>
          .
        </p>
      </div>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          {
            id: "paid",
            label: "Tax paid",
            children: (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <p className="text-sm text-secondary">PO amount (tax-inclusive)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-title">{fmt(taxPaidSummary.poAmount)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card/50 p-4">
                    <p className="text-sm text-secondary">Tax paid (allocated from payments)</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-title">{fmt(taxPaidSummary.taxPaid)}</p>
                  </div>
                </div>
                <p className="text-sm text-secondary">
                  For each purchase order with line-item tax and recorded payments, tax paid is estimated as the
                  payments times the share of line tax in the PO total (tax-inclusive).
                </p>
                <Table
                  columns={paidColumns}
                  data={taxPaidRows}
                  rowKey="id"
                  loading={loading}
                  searchable
                  searchPlaceholder="Search PO#, vendor…"
                  emptyMessage="No PO payments with line tax to show yet."
                  onRefresh={load}
                  responsive
                  exportable
                  exportIconOnly
                  exportFilename={paidExportFilename}
                  exportButtonTitle="Excel export (CSV)"
                />
              </div>
            ),
          },
          {
            id: "other",
            label: "Other taxes",
            children: (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-secondary max-w-[42rem]">
                    Record remittances or filings that are not tied to a specific invoice or PO (e.g. quarterly sales tax).
                    Each entry is posted to the ledger as a debit tax payment.
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="inline-flex shrink-0 items-center gap-1.5"
                    onClick={() => {
                      setOtherForm((f) => ({ ...f, paidDate: todayIso() }));
                      setAddOpen(true);
                    }}
                  >
                    <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                    Add tax payment
                  </Button>
                </div>
                <Table
                  columns={otherColumns}
                  data={otherRows}
                  rowKey="id"
                  loading={loading}
                  searchable
                  searchPlaceholder="Search tax type, period, date…"
                  emptyMessage="No other tax payments yet."
                  onRefresh={load}
                  responsive
                  exportable
                  exportIconOnly
                  exportFilename={otherExportFilename}
                  exportButtonTitle="Excel export (CSV)"
                />
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={addOpen}
        onClose={() => {
          if (!savingOther) setAddOpen(false);
        }}
        title="Add tax payment"
        size="lg"
        showClose={!savingOther}
        actions={
          <Button
            type="submit"
            form="add-other-tax-form"
            variant="primary"
            size="sm"
            disabled={savingOther}
            className="inline-flex shrink-0 items-center gap-1.5"
          >
            {savingOther ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="add-other-tax-form" onSubmit={handleSubmitOtherTax} className="flex flex-col gap-4 !space-y-0">
          <Input
            label="Tax type"
            value={otherForm.taxType}
            onChange={(e) => setOtherForm((f) => ({ ...f, taxType: e.target.value }))}
            placeholder="e.g. State sales tax remittance"
            required
          />
          <Input
            label="Tax period"
            value={otherForm.taxPeriod}
            onChange={(e) => setOtherForm((f) => ({ ...f, taxPeriod: e.target.value }))}
            placeholder="e.g. 2026 Q1 or Jan 2026"
          />
          <Input
            label="Paid date"
            type="date"
            value={otherForm.paidDate}
            onChange={(e) => setOtherForm((f) => ({ ...f, paidDate: e.target.value }))}
            required
          />
          <Input
            label="Paid amount"
            type="number"
            step="0.01"
            min="0.01"
            value={otherForm.paidAmount}
            onChange={(e) => setOtherForm((f) => ({ ...f, paidAmount: e.target.value }))}
            placeholder="0.00"
            required
          />
        </Form>
      </Modal>
    </div>
  );
}
