"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions } from "@/lib/product-dropdown-catalog";
import { SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/lib/simple-service-proposal-form";
import { parsePayRate, periodMonthBounds } from "@/lib/employee-payroll-payment";

const PAY_FORM_ID = "simple-employee-record-payment-form";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";
const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

function FieldRow({ label, labelWidth = "6.75rem", children, className = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function localTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function paidAtIsoForSave(dateStr) {
  const raw = String(dateStr || "").trim();
  if (raw === localTodayIso()) return new Date().toISOString();
  const [year, month, day] = raw.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

function amountForHours(hours, rate) {
  const h = Number(hours);
  const r = parsePayRate(rate);
  if (!Number.isFinite(h) || h < 0) return "0.00";
  return (Math.round((r * h + Number.EPSILON) * 100) / 100).toFixed(2);
}

/**
 * Record one employee payroll payment (hourly or salary).
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved?: () => void,
 *   employee: null | {
 *     employeeId: string,
 *     employeeName?: string,
 *     name?: string,
 *     employeeNumber?: string,
 *     payType?: string,
 *     hourlyRate?: string,
 *     hours?: number,
 *     allUnpaidHours?: number,
 *     periodFrom?: string,
 *     periodTo?: string,
 *   },
 * }} props
 */
export default function SimpleEmployeeRecordPaymentModal({ open, onClose, onSaved, employee }) {
  const alert = useAlert();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const paymentMethodOptions = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "payment_method", {
      includeEmpty: false,
    });
    return fromSettings.length ? fromSettings : SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS;
  }, [mergedSettings]);

  const payType =
    String(employee?.payType || "").toLowerCase() === "salary" ? "salary" : "hourly";
  const name = employee?.employeeName || employee?.name || "Employee";
  const employeeNumber = employee?.employeeNumber || "";
  const hourlyRate = String(employee?.hourlyRate || "").trim();

  const [loadingUnpaid, setLoadingUnpaid] = useState(false);
  const [maxUnpaidHours, setMaxUnpaidHours] = useState(0);
  const [monthUnpaidHours, setMonthUnpaidHours] = useState(0);
  const [payHours, setPayHours] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payPaidAt, setPayPaidAt] = useState(localTodayIso);
  const [payPeriodFrom, setPayPeriodFrom] = useState("");
  const [payPeriodTo, setPayPeriodTo] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payPendingFiles, setPayPendingFiles] = useState([]);
  const [paySaving, setPaySaving] = useState(false);
  const [payUploading, setPayUploading] = useState(false);

  useEffect(() => {
    if (!open || !employee?.employeeId) return;
    let cancelled = false;

    const periodFrom = String(employee.periodFrom || "").slice(0, 10);
    const periodTo = String(employee.periodTo || "").slice(0, 10);
    const month =
      (periodFrom && periodFrom.slice(0, 7)) ||
      (periodTo && periodTo.slice(0, 7)) ||
      currentMonthValue();
    const bounds = periodMonthBounds(month);
    const nextFrom = periodFrom || bounds?.from || "";
    const nextTo = periodTo || bounds?.to || "";

    setPayPeriodFrom(nextFrom);
    setPayPeriodTo(nextTo);
    setPayPaidAt(localTodayIso());
    setPayMethod("");
    setPayNotes("");
    setPayPendingFiles([]);

    const forcedHours =
      employee.hours != null && Number.isFinite(Number(employee.hours))
        ? Number(employee.hours)
        : null;

    (async () => {
      setLoadingUnpaid(true);
      try {
        let allUnpaid =
          employee.allUnpaidHours != null ? Number(employee.allUnpaidHours) || 0 : null;
        let monthUnpaid = 0;
        if (payType === "hourly" && allUnpaid == null) {
          const res = await fetch(
            `/api/dashboard/employee-payroll-payments?balances=1&periodMonth=${encodeURIComponent(month)}`,
            { credentials: "include", cache: "no-store" }
          );
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Failed to load unpaid hours");
          const balance = (Array.isArray(data.balances) ? data.balances : []).find(
            (row) => String(row.employeeId) === String(employee.employeeId)
          );
          allUnpaid = Number(balance?.allUnpaidHours ?? balance?.unpaidHours) || 0;
          monthUnpaid = Number(balance?.unpaidHours) || 0;
        } else if (payType === "hourly") {
          monthUnpaid = Number(employee.totalHours) || 0;
        }

        if (cancelled) return;
        const maxHours = Math.max(0, allUnpaid || 0);
        setMaxUnpaidHours(maxHours);
        setMonthUnpaidHours(monthUnpaid);
        if (payType === "hourly") {
          const hours = forcedHours != null ? Math.min(forcedHours, maxHours || forcedHours) : maxHours;
          const hoursStr = (Number(hours) || 0).toFixed(2);
          setPayHours(hoursStr);
          setPayAmount(amountForHours(hoursStr, hourlyRate));
        } else {
          setPayHours("");
          setPayAmount(String(parsePayRate(hourlyRate) || 0));
        }
      } catch (err) {
        if (cancelled) return;
        setMaxUnpaidHours(forcedHours != null ? forcedHours : 0);
        setMonthUnpaidHours(0);
        if (payType === "hourly") {
          const hoursStr = (forcedHours != null ? forcedHours : 0).toFixed(2);
          setPayHours(hoursStr);
          setPayAmount(amountForHours(hoursStr, hourlyRate));
        }
        await alert({
          title: "Error",
          message: err?.message || "Failed to load unpaid hours",
          variant: "danger",
        });
      } finally {
        if (!cancelled) setLoadingUnpaid(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, employee, payType, hourlyRate, alert]);

  const close = () => {
    if (paySaving || payUploading) return;
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const employeeId = String(employee?.employeeId || "").trim();
    if (!employeeId) return;

    const amount = Number.parseFloat(String(payAmount).replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(amount) || amount < 0) {
      await alert({ title: "Error", message: "Enter a valid payment amount.", variant: "danger" });
      return;
    }
    if (!payPaidAt.trim()) {
      await alert({ title: "Error", message: "Paid date is required.", variant: "danger" });
      return;
    }
    if (!String(payMethod || "").trim()) {
      await alert({ title: "Error", message: "Mode of payment is required.", variant: "danger" });
      return;
    }
    const hoursToPay = payType === "hourly" ? Number.parseFloat(String(payHours)) : 0;
    if (payType === "hourly") {
      if (!Number.isFinite(hoursToPay) || hoursToPay <= 0) {
        await alert({ title: "Error", message: "Enter the hours to pay.", variant: "danger" });
        return;
      }
      if (hoursToPay > maxUnpaidHours + 0.001 && maxUnpaidHours > 0) {
        await alert({
          title: "Error",
          message: "Hours to pay cannot be more than all unpaid hours.",
          variant: "danger",
        });
        return;
      }
    }
    const paidAtIso = paidAtIsoForSave(payPaidAt.trim());
    if (!paidAtIso) {
      await alert({ title: "Error", message: "Paid date is required.", variant: "danger" });
      return;
    }
    if (!payPeriodFrom.trim() || !payPeriodTo.trim()) {
      await alert({
        title: "Error",
        message: "Pay period start and end dates are required.",
        variant: "danger",
      });
      return;
    }
    if (payPeriodFrom.trim() > payPeriodTo.trim()) {
      await alert({
        title: "Error",
        message: "Pay period start date must be on or before the end date.",
        variant: "danger",
      });
      return;
    }

    const periodMonth =
      String(payPeriodFrom || "").slice(0, 7) ||
      String(payPeriodTo || "").slice(0, 7) ||
      currentMonthValue();

    setPaySaving(true);
    try {
      const res = await fetch("/api/dashboard/employee-payroll-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId,
          periodMonth,
          periodFrom: payPeriodFrom.trim(),
          periodTo: payPeriodTo.trim(),
          payType,
          hourlyRate,
          hours: payType === "hourly" ? hoursToPay : 0,
          amount,
          paidAt: paidAtIso,
          paymentMethod: String(payMethod || "").trim(),
          notes: payNotes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      const paymentId = data.payment?.id;
      if (paymentId && payPendingFiles.length > 0) {
        setPayUploading(true);
        const fd = new FormData();
        for (const file of payPendingFiles) fd.append("files", file);
        const up = await fetch(`/api/dashboard/employee-payroll-payments/${paymentId}`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "Payment saved but document upload failed");
      }

      onClose?.();
      if (typeof onSaved === "function") onSaved();
      await alert({
        title: "Saved",
        message: `Payroll payment recorded for ${name}.`,
      });
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to record payment",
        variant: "danger",
      });
    } finally {
      setPaySaving(false);
      setPayUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record payroll payment"
      size="lg"
      showClose={!paySaving && !payUploading}
      actions={
        <Button
          type="submit"
          form={PAY_FORM_ID}
          variant="primary"
          size="sm"
          className={TOOLBAR_BTN}
          disabled={paySaving || payUploading || loadingUnpaid}
        >
          {paySaving || payUploading ? "Saving…" : "Confirm payment"}
        </Button>
      }
    >
      <Form
        id={PAY_FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm text-secondary">
            <span className="font-medium text-title">{name}</span>
            {employeeNumber ? ` · #${employeeNumber}` : ""}
            {" · "}
            {payType === "salary" ? "Salary" : "Hourly"}
          </p>
          {payType === "hourly" ? (
            <p className="rounded-sm border border-warning/40 bg-warning/15 px-3 py-2 text-sm font-semibold text-title">
              {loadingUnpaid ? (
                "Loading unpaid hours…"
              ) : (
                <>
                  <span className="tabular-nums">{(Number(monthUnpaidHours) || 0).toFixed(2)}</span>
                  {" unpaid this month · "}
                  <span className="tabular-nums">{(Number(maxUnpaidHours) || 0).toFixed(2)}</span>
                  {" unpaid, all periods"}
                </>
              )}
            </p>
          ) : null}
        </div>
        <FieldRow label="Pay period">
          <div className="flex min-w-0 flex-nowrap items-center gap-2">
            <input
              type="date"
              value={payPeriodFrom}
              onChange={(e) => setPayPeriodFrom(e.target.value)}
              required
              className={`${FIELD_INPUT} !w-auto min-w-0 flex-1`}
              aria-label="Pay period start date"
            />
            <span className="shrink-0 text-xs font-medium text-secondary">to</span>
            <input
              type="date"
              value={payPeriodTo}
              onChange={(e) => setPayPeriodTo(e.target.value)}
              required
              className={`${FIELD_INPUT} !w-auto min-w-0 flex-1`}
              aria-label="Pay period end date"
            />
          </div>
        </FieldRow>
        {payType === "hourly" ? (
          <FieldRow label="Hours to pay" className="items-start">
            <input
              type="number"
              min="0"
              max={maxUnpaidHours || undefined}
              step="0.01"
              value={payHours}
              onChange={(e) => {
                const next = e.target.value;
                setPayHours(next);
                setPayAmount(amountForHours(next, hourlyRate));
              }}
              required
              className={FIELD_INPUT}
              aria-label="Hours to pay"
            />
            <p className="mt-1 text-xs text-secondary">
              Prefilled with unpaid hours for this action. Lower it to pay part. The rest stays unpaid.
            </p>
          </FieldRow>
        ) : null}
        <FieldRow label="Amount">
          <input
            type="number"
            min="0"
            step="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="Paid date">
          <input
            type="date"
            value={payPaidAt}
            onChange={(e) => setPayPaidAt(e.target.value)}
            required
            className={FIELD_INPUT}
          />
        </FieldRow>
        <FieldRow label="Mode of payment">
          <SimpleSelect
            options={[
              { value: "", label: "Select mode of payment" },
              ...paymentMethodOptions,
            ]}
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
            className="w-full"
            triggerClassName="h-7 w-full rounded-none"
            placeholder="Select mode of payment"
            searchable
            aria-label="Mode of payment"
          />
        </FieldRow>
        <FieldRow label="Notes" className="items-start">
          <textarea
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
            placeholder="Optional payment memo or reference"
            rows={3}
            className={FIELD_TEXTAREA}
            aria-label="Notes"
          />
        </FieldRow>
        <VendorAttachmentsPanel
          resourceLabel="payroll payment"
          vendorId={null}
          attachments={[]}
          onAttachmentsChange={() => {}}
          pendingFiles={payPendingFiles}
          onPendingFilesChange={setPayPendingFiles}
          uploading={payUploading}
        />
        <p className="text-xs text-secondary">
          Documents upload when you confirm payment (proof of transfer, payslip, etc.).
        </p>
      </Form>
    </Modal>
  );
}
