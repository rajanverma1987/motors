"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Tabs from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { buildEmployeeSelectOptions } from "@/lib/technician-select-options";
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions } from "@/lib/product-dropdown-catalog";
import { SIMPLE_PO_PAYMENT_METHOD_OPTIONS } from "@/lib/simple-purchase-order-form";
import { SIMPLE_FIELD_INPUT, SIMPLE_FIELD_LABEL } from "@/lib/simple-typography";

const FORM_ID = "simple-invoice-tax-remittance-form";
const FIELD_INPUT = SIMPLE_FIELD_INPUT;
const FIELD_LABEL = SIMPLE_FIELD_LABEL;

function FieldRow({ label, labelWidth = "4.5rem", className = "", controlClassName = "", children }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={controlClassName || "min-w-0 flex-1"}>{children}</div>
    </div>
  );
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyPaymentForm(taxTotal = 0) {
  return {
    taxType: "State sales tax remittance",
    taxPeriod: "",
    paidDate: todayIso(),
    paidAmount: taxTotal > 0 ? String(taxTotal) : "",
    method: "",
    paidBy: "",
    notes: "",
  };
}

/**
 * Simple Invoices → Taxes: Unpaid / Paid / Record Payment (period-batch remittance).
 */
export default function SimpleInvoiceTaxesModal({
  open,
  onClose,
  dateFrom = "",
  dateTo = "",
  zIndex = 120,
  onSaved,
}) {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const [activeTab, setActiveTab] = useState("unpaid");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [unpaidRows, setUnpaidRows] = useState([]);
  const [unpaidSummary, setUnpaidSummary] = useState({ count: 0, taxTotal: 0 });
  const [paidRows, setPaidRows] = useState([]);
  const [paidSummary, setPaidSummary] = useState({ count: 0, taxTotal: 0 });
  const [paymentForm, setPaymentForm] = useState(() => emptyPaymentForm());
  const [employees, setEmployees] = useState([]);

  const paymentMethodOptions = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "payment_method", {
      includeEmpty: false,
    });
    return fromSettings.length ? fromSettings : SIMPLE_PO_PAYMENT_METHOD_OPTIONS;
  }, [mergedSettings]);

  const paidByOptions = useMemo(
    () => buildEmployeeSelectOptions(employees, paymentForm.paidBy),
    [employees, paymentForm.paidBy]
  );

  const dateRangeLabel = useMemo(() => {
    const from = String(dateFrom || "").trim();
    const to = String(dateTo || "").trim();
    if (from && to) return `${formatDate(from)} to ${formatDate(to)}`;
    if (from) return `From ${formatDate(from)}`;
    if (to) return `Through ${formatDate(to)}`;
    return "All dates";
  }, [dateFrom, dateTo, formatDate]);

  const loadLists = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const qs = params.toString();
      const [unpaidRes, paidRes] = await Promise.all([
        fetch(`/api/dashboard/simple-tax-remittances?status=unpaid${qs ? `&${qs}` : ""}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/dashboard/simple-tax-remittances?status=paid${qs ? `&${qs}` : ""}`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      const unpaidData = await unpaidRes.json().catch(() => ({}));
      const paidData = await paidRes.json().catch(() => ({}));
      if (!unpaidRes.ok) throw new Error(unpaidData.error || "Failed to load unpaid taxes");
      if (!paidRes.ok) throw new Error(paidData.error || "Failed to load paid taxes");
      const unpaidList = Array.isArray(unpaidData.rows) ? unpaidData.rows : [];
      const unpaidSum = unpaidData.summary || { count: unpaidList.length, taxTotal: 0 };
      setUnpaidRows(unpaidList);
      setUnpaidSummary({
        count: Number(unpaidSum.count) || unpaidList.length,
        taxTotal: Number(unpaidSum.taxTotal) || 0,
      });
      const paidList = Array.isArray(paidData.rows) ? paidData.rows : [];
      const paidSum = paidData.summary || { count: paidList.length, taxTotal: 0 };
      setPaidRows(paidList);
      setPaidSummary({
        count: Number(paidSum.count) || paidList.length,
        taxTotal: Number(paidSum.taxTotal) || 0,
      });
      setPaymentForm((prev) => ({
        ...prev,
        paidAmount:
          Number(unpaidSum.taxTotal) > 0
            ? String(Number(unpaidSum.taxTotal))
            : prev.paidAmount || "",
      }));
    } catch (e) {
      setUnpaidRows([]);
      setPaidRows([]);
      await alert({
        title: "Error",
        message: e.message || "Could not load tax remittances",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert, dateFrom, dateTo]);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setActiveTab("unpaid");
      setUnpaidRows([]);
      setPaidRows([]);
      setPaymentForm(emptyPaymentForm());
      return;
    }
    setPaymentForm(emptyPaymentForm());
    void loadLists();
    let cancelled = false;
    (async () => {
      try {
        const emps = await fetchAllPaginatedDashboardItems("/api/dashboard/employees");
        if (!cancelled) setEmployees(Array.isArray(emps) ? emps : []);
      } catch {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadLists]);

  const patchPayment = (key, value) => setPaymentForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(paymentForm.taxType || "").trim()) {
      await alert({ title: "Error", message: "Tax type is required.", variant: "danger" });
      return;
    }
    if (!String(paymentForm.paidDate || "").trim()) {
      await alert({ title: "Error", message: "Paid date is required.", variant: "danger" });
      return;
    }
    const amt = parseFloat(String(paymentForm.paidAmount || "").trim());
    if (!Number.isFinite(amt) || amt <= 0) {
      await alert({ title: "Error", message: "Enter a valid paid amount.", variant: "danger" });
      return;
    }
    if (!unpaidRows.length) {
      await alert({
        title: "Nothing to remit",
        message: "There are no unpaid tax-collected jobs in this date range.",
        variant: "danger",
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/simple-tax-remittances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          taxType: paymentForm.taxType.trim(),
          taxPeriod: String(paymentForm.taxPeriod || "").trim(),
          paidDate: String(paymentForm.paidDate || "").trim().slice(0, 10),
          paidAmount: amt,
          method: String(paymentForm.method || "").trim(),
          paidBy: String(paymentForm.paidBy || "").trim(),
          notes: String(paymentForm.notes || "").trim(),
          from: dateFrom || "",
          to: dateTo || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save tax payment");
      await alert({
        title: "Success",
        message: `Tax payment saved for ${data.payment?.jobCount || unpaidRows.length} job(s). It appears on the Ledger as a tax payment.`,
      });
      onSaved?.(data.payment || null);
      await loadLists();
      setActiveTab("paid");
      setPaymentForm(emptyPaymentForm(0));
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const jobsTable = (rows, mode) => {
    if (loading) {
      return <p className="text-xs font-medium text-secondary">Loading…</p>;
    }
    if (!rows.length) {
      return (
        <p className="text-xs font-medium text-secondary">
          {mode === "unpaid"
            ? "No unpaid tax-collected jobs in this date range."
            : "No remitted tax jobs for this filter."}
        </p>
      );
    }
    return (
      <div className="min-h-0 flex-1 overflow-auto border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-[1] bg-muted/40 dark:bg-muted/20">
            <tr className="border-b border-border text-left">
              <th className="px-3 py-2 font-semibold text-title">Job#</th>
              <th className="px-3 py-2 font-semibold text-title">Customer</th>
              <th className="px-3 py-2 font-semibold text-title">
                {mode === "paid" ? "Remitted" : "Date"}
              </th>
              {mode === "paid" ? (
                <>
                  <th className="px-3 py-2 font-semibold text-title">Period</th>
                  <th className="px-3 py-2 font-semibold text-title">Tax type</th>
                </>
              ) : null}
              <th className="px-3 py-2 text-right font-semibold text-title">Tax</th>
              {mode === "paid" ? (
                <th className="px-3 py-2 text-right font-semibold text-title">Payment</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-b-0">
                <td className="px-3 py-2 font-medium text-title">{r.documentNumber || "-"}</td>
                <td className="px-3 py-2 text-title">{r.companyName || "-"}</td>
                <td className="px-3 py-2 tabular-nums text-secondary">
                  {mode === "paid"
                    ? r.taxRemittancePaidDate
                      ? formatDate(r.taxRemittancePaidDate)
                      : "-"
                    : r.date
                      ? formatDate(r.date)
                      : "-"}
                </td>
                {mode === "paid" ? (
                  <>
                    <td className="px-3 py-2 text-secondary">{r.taxRemittancePeriod || "-"}</td>
                    <td className="px-3 py-2 text-secondary">{r.taxRemittanceTaxType || "-"}</td>
                  </>
                ) : null}
                <td className="px-3 py-2 text-right tabular-nums font-medium text-title">
                  {formatMoney(r.taxCollected)}
                </td>
                {mode === "paid" ? (
                  <td className="px-3 py-2 text-right tabular-nums text-secondary">
                    {r.taxRemittancePaidAmount != null && r.taxRemittancePaidAmount !== ""
                      ? formatMoney(r.taxRemittancePaidAmount)
                      : "-"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        onClose?.();
      }}
      title="Taxes"
      size="6xl"
      width="min(1100px, 96vw)"
      height="min(84vh, 820px)"
      zIndex={zIndex}
      showClose={!saving}
      closeOnOutsideClick={false}
      actions={
        activeTab === "record" ? (
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            size="sm"
            disabled={saving || loading || unpaidRows.length === 0}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null
      }
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-secondary">
          Filing window: <span className="font-semibold text-title">{dateRangeLabel}</span>
        </p>
        <p className="text-sm text-secondary">
          Unpaid due:{" "}
          <span className="font-bold tabular-nums text-title">
            {formatMoney(unpaidSummary.taxTotal)}
          </span>
          <span className="text-secondary"> ({unpaidSummary.count} jobs)</span>
        </p>
      </div>

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        panelClassName="flex min-h-0 flex-1 flex-col pt-4"
        tabs={[
          {
            id: "unpaid",
            label: `Unpaid (${unpaidSummary.count})`,
            children: (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                {jobsTable(unpaidRows, "unpaid")}
              </div>
            ),
          },
          {
            id: "paid",
            label: `Paid (${paidSummary.count})`,
            children: (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                {jobsTable(paidRows, "paid")}
              </div>
            ),
          },
          {
            id: "record",
            label: "Record Payment",
            children: (
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-sm text-secondary">
                    Jobs to remit:{" "}
                    <span className="text-base font-bold text-title">{unpaidSummary.count}</span>
                  </div>
                  <div className="text-sm text-secondary">
                    Tax due:{" "}
                    <span className="text-base font-bold text-title">
                      {formatMoney(unpaidSummary.taxTotal)}
                    </span>
                  </div>
                </div>

                <div className="rounded-sm border border-border p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">
                    Record payment
                  </p>
                  <Form
                    id={FORM_ID}
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <FieldRow
                        label="Tax type"
                        labelWidth="4.25rem"
                        className="min-w-[14rem] flex-1"
                      >
                        <input
                          type="text"
                          required
                          value={paymentForm.taxType}
                          onChange={(e) => patchPayment("taxType", e.target.value)}
                          className={FIELD_INPUT}
                          disabled={saving}
                          aria-label="Tax type"
                        />
                      </FieldRow>
                      <FieldRow
                        label="Period"
                        labelWidth="3.25rem"
                        className="w-[12rem] shrink-0"
                      >
                        <input
                          type="text"
                          value={paymentForm.taxPeriod}
                          onChange={(e) => patchPayment("taxPeriod", e.target.value)}
                          className={FIELD_INPUT}
                          placeholder="e.g. 2026 Q1"
                          disabled={saving}
                          aria-label="Tax period"
                        />
                      </FieldRow>
                      <FieldRow label="Date" labelWidth="3rem" className="w-[11rem] shrink-0">
                        <input
                          type="date"
                          value={paymentForm.paidDate}
                          onChange={(e) => patchPayment("paidDate", e.target.value)}
                          className={FIELD_INPUT}
                          disabled={saving}
                        />
                      </FieldRow>
                      <FieldRow label="Amount" labelWidth="3.5rem" className="w-[10rem] shrink-0">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={paymentForm.paidAmount}
                          onChange={(e) => patchPayment("paidAmount", e.target.value)}
                          className={`${FIELD_INPUT} text-right tabular-nums`}
                          disabled={saving}
                        />
                      </FieldRow>
                      <FieldRow label="Method" labelWidth="3.5rem" className="w-[11rem] shrink-0">
                        <SimpleSelect
                          options={paymentMethodOptions}
                          value={paymentForm.method}
                          onChange={(e) => patchPayment("method", e.target.value)}
                          placeholder="Select…"
                          disabled={saving}
                          aria-label="Payment method"
                        />
                      </FieldRow>
                      <FieldRow
                        label="Paid By"
                        labelWidth="3.75rem"
                        className="min-w-[12rem] flex-1"
                      >
                        <SimpleSelect
                          options={paidByOptions}
                          value={paymentForm.paidBy}
                          onChange={(e) => patchPayment("paidBy", e.target.value)}
                          searchable
                          placeholder="Select…"
                          disabled={saving}
                          aria-label="Paid by"
                        />
                      </FieldRow>
                      <FieldRow
                        label="Notes"
                        labelWidth="3rem"
                        className="min-w-[14rem] flex-[1.2]"
                      >
                        <input
                          type="text"
                          value={paymentForm.notes}
                          onChange={(e) => patchPayment("notes", e.target.value)}
                          className={FIELD_INPUT}
                          disabled={saving}
                          aria-label="Notes"
                        />
                      </FieldRow>
                    </div>
                    <p className="text-xs text-secondary">
                      Saving marks all unpaid tax-collected jobs in the filing window as remitted
                      and posts the payment to the Ledger.
                    </p>
                  </Form>
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">
                    Jobs included
                  </p>
                  {jobsTable(unpaidRows, "unpaid")}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
}
