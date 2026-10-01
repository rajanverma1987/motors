"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import SimpleSelect from "@/components/simple/simple-select";
import SimpleEmployeePaymentHistoryModal from "@/components/simple/simple-employee-payment-history-modal";
import { useAlert } from "@/components/confirm-provider";
import {
  useFormatDate,
  useFormatMoney,
  useUserSettings,
} from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions } from "@/lib/product-dropdown-catalog";
import { SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS } from "@/lib/simple-service-proposal-form";
import {
  estimateEmployeePeriodPay,
  parsePayRate,
  periodMonthBounds,
} from "@/lib/employee-payroll-payment";
import {
  SIMPLE_LIST_TABLE_PROPS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";

const PAY_FORM_ID = "simple-employee-release-payment-form";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";
const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const NAME_LINK_CLASS =
  "font-medium text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

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

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function localTodayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

function payrollRowForEmployee({
  employeeId,
  name,
  employeeNumber,
  department,
  payType,
  hourlyRate,
  monthHours,
  monthPayment,
  paidHours,
  balance,
}) {
  let totalHours = Number(monthHours) || 0;
  let payment = monthPayment || null;
  let status = payment ? "paid" : "unpaid";

  let workedHours = Number(monthHours) || 0;
  let monthPaidHours = Number(paidHours) || 0;

  if (payType === "hourly" && balance) {
    workedHours = Number(balance.workedHours) || 0;
    monthPaidHours = Number(balance.paidHours) || 0;
    totalHours = Number(balance.unpaidHours) || 0;
    payment = balance.lastPayment || null;
    status = totalHours > 0.0001 ? "unpaid" : payment ? "paid" : "unpaid";
  } else if (payType === "hourly") {
    totalHours = Math.max(0, Math.round((workedHours - monthPaidHours) * 100) / 100);
    status = totalHours > 0.0001 ? "unpaid" : payment ? "paid" : "unpaid";
  }

  const amountDue =
    status === "unpaid"
      ? estimateEmployeePeriodPay({
          payType,
          hourlyRate,
          totalHours: payType === "salary" ? 0 : totalHours,
        })
      : 0;

  if (status === "unpaid" && payType === "hourly" && totalHours <= 0.0001) return null;
  if (status === "unpaid" && payType === "salary" && amountDue <= 0) return null;
  if (status === "paid" && !payment) return null;

  const allUnpaidHours =
    payType !== "hourly"
      ? 0
      : Math.max(
          0,
          balance && balance.allUnpaidHours != null
            ? Number(balance.allUnpaidHours) || 0
            : totalHours
        );

  return {
    employeeId,
    name,
    employeeNumber,
    department,
    payType,
    hourlyRate,
    workedHours: payType === "salary" ? null : workedHours,
    paidHours: payType === "salary" ? null : monthPaidHours,
    totalHours,
    allUnpaidHours,
    amountDue,
    payment,
    status,
  };
}

function monthLabel(ym) {
  const monthBounds = periodMonthBounds(ym);
  if (!monthBounds) return ym || "";
  const d = new Date(`${monthBounds.from}T12:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/**
 * Release Payment: employee payroll due for a month, with per-employee record payment.
 */
export default function SimpleReleasePaymentPanel() {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const paymentMethodOptions = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "payment_method", {
      includeEmpty: false,
    });
    return fromSettings.length ? fromSettings : SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS;
  }, [mergedSettings]);

  const [month, setMonth] = useState(currentMonthValue);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payHours, setPayHours] = useState("");
  const [payPaidAt, setPayPaidAt] = useState(localTodayIso);
  const [payPeriodFrom, setPayPeriodFrom] = useState("");
  const [payPeriodTo, setPayPeriodTo] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payPendingFiles, setPayPendingFiles] = useState([]);
  const [paySaving, setPaySaving] = useState(false);
  const [payUploading, setPayUploading] = useState(false);

  const [historyEmployee, setHistoryEmployee] = useState(null);

  const bounds = useMemo(() => periodMonthBounds(month), [month]);

  const fmt = useCallback(
    (n) => {
      try {
        return formatMoney(Number(n) || 0);
      } catch {
        return `$${(Number(n) || 0).toFixed(2)}`;
      }
    },
    [formatMoney]
  );

  const load = useCallback(async () => {
    if (!bounds) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const hoursParams = new URLSearchParams({ from: bounds.from, to: bounds.to });
      const [hoursRes, paymentsRes, employeesRes, balancesRes] = await Promise.all([
        fetch(`/api/dashboard/time-clock/hours?${hoursParams}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/dashboard/employee-payroll-payments?periodMonth=${encodeURIComponent(month)}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
        fetch(
          `/api/dashboard/employee-payroll-payments?balances=1&periodMonth=${encodeURIComponent(month)}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        ),
      ]);

      const hoursData = await hoursRes.json().catch(() => ({}));
      const paymentsData = await paymentsRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));
      const balancesData = await balancesRes.json().catch(() => ({}));

      if (!hoursRes.ok) throw new Error(hoursData.error || "Failed to load hours");
      if (!paymentsRes.ok) throw new Error(paymentsData.error || "Failed to load payroll payments");
      if (!employeesRes.ok) throw new Error(employeesData.error || "Failed to load employees");
      if (!balancesRes.ok) throw new Error(balancesData.error || "Failed to load unpaid hours");

      const hoursRows = Array.isArray(hoursData.rows) ? hoursData.rows : [];
      const payments = Array.isArray(paymentsData.payments) ? paymentsData.payments : [];
      const balances = Array.isArray(balancesData.balances) ? balancesData.balances : [];
      const employees = Array.isArray(employeesData.items)
        ? employeesData.items
        : Array.isArray(employeesData)
          ? employeesData
          : [];

      const hoursByEmployee = new Map(hoursRows.map((r) => [String(r.employeeId), r]));
      const paymentByEmployee = new Map();
      const paidHoursByEmployee = new Map();
      for (const payment of payments) {
        const id = String(payment.employeeId || "");
        if (!paymentByEmployee.has(id)) paymentByEmployee.set(id, payment);
        paidHoursByEmployee.set(id, (paidHoursByEmployee.get(id) || 0) + (Number(payment.hours) || 0));
      }
      const balanceByEmployee = new Map(balances.map((b) => [String(b.employeeId), b]));

      const activeEmployees = employees.filter((e) => {
        const status = String(e.employmentStatus || "Active").trim().toLowerCase();
        if (status === "active" || status === "") return true;
        if (status !== "inactive") return false;
        const id = String(e.id || e._id || "").trim();
        return (Number(balanceByEmployee.get(id)?.unpaidHours) || 0) > 0.0001;
      });

      const nextRows = [];
      const seen = new Set();

      const pushRow = (source) => {
        const row = payrollRowForEmployee(source);
        if (!row || seen.has(row.employeeId)) return;
        seen.add(row.employeeId);
        nextRows.push(row);
      };

      for (const emp of activeEmployees) {
        const id = String(emp.id || emp._id || "").trim();
        if (!id) continue;
        const hoursRow = hoursByEmployee.get(id);
        pushRow({
          employeeId: id,
          name: String(emp.name || hoursRow?.name || "").trim() || "Employee",
          employeeNumber: String(emp.employeeNumber || hoursRow?.employeeNumber || "").trim(),
          department: String(emp.department || hoursRow?.department || "").trim(),
          payType:
            String(emp.payType || hoursRow?.payType || "hourly").toLowerCase() === "salary"
              ? "salary"
              : "hourly",
          hourlyRate: String(emp.hourlyRate ?? hoursRow?.hourlyRate ?? "").trim(),
          monthHours: Number(hoursRow?.totalHours) || 0,
          monthPayment: paymentByEmployee.get(id) || null,
          paidHours: paidHoursByEmployee.get(id) || 0,
          balance: balanceByEmployee.get(id) || null,
        });
      }

      for (const hoursRow of hoursRows) {
        const id = String(hoursRow.employeeId || "").trim();
        if (!id || seen.has(id)) continue;
        pushRow({
          employeeId: id,
          name: String(hoursRow.name || "").trim() || "Employee",
          employeeNumber: String(hoursRow.employeeNumber || "").trim(),
          department: String(hoursRow.department || "").trim(),
          payType: String(hoursRow.payType || "hourly").toLowerCase() === "salary" ? "salary" : "hourly",
          hourlyRate: String(hoursRow.hourlyRate || "").trim(),
          monthHours: Number(hoursRow.totalHours) || 0,
          monthPayment: paymentByEmployee.get(id) || null,
          paidHours: paidHoursByEmployee.get(id) || 0,
          balance: balanceByEmployee.get(id) || null,
        });
      }

      nextRows.sort((a, b) => {
        if (a.status !== b.status) return a.status === "unpaid" ? -1 : 1;
        return String(a.name).localeCompare(String(b.name));
      });
      setRows(nextRows);
    } catch (err) {
      setRows([]);
      await alert({
        title: "Error",
        message: err?.message || "Failed to load payroll",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert, bounds, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const unpaidRows = useMemo(() => rows.filter((r) => r.status === "unpaid"), [rows]);
  const totalDue = useMemo(
    () => unpaidRows.reduce((sum, row) => sum + (Number(row.amountDue) || 0), 0),
    [unpaidRows]
  );

  const openPay = (row) => {
    if (!row || row.status === "paid") return;
    const monthBounds = periodMonthBounds(month);
    const hours = row.payType === "hourly" ? (Number(row.allUnpaidHours) || 0).toFixed(2) : "";
    setPayingRow(row);
    setPayHours(hours);
    setPayAmount(
      row.payType === "hourly" ? amountForHours(hours, row.hourlyRate) : String(Number(row.amountDue) || 0)
    );
    setPayPaidAt(localTodayIso());
    setPayPeriodFrom(monthBounds?.from || "");
    setPayPeriodTo(monthBounds?.to || "");
    setPayMethod("");
    setPayNotes("");
    setPayPendingFiles([]);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    if (paySaving || payUploading) return;
    setPayModalOpen(false);
    setPayingRow(null);
    setPayPendingFiles([]);
  };

  const openHistory = (row) => {
    const id = String(row?.employeeId || "").trim();
    if (!id) return;
    setHistoryEmployee({
      employeeId: id,
      name: String(row?.name || "").trim(),
      employeeNumber: String(row?.employeeNumber || "").trim(),
    });
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payingRow?.employeeId || !bounds) return;
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
    const hoursToPay =
      payingRow.payType === "hourly" ? Number.parseFloat(String(payHours)) : 0;
    if (payingRow.payType === "hourly") {
      const unpaid = Number(payingRow.allUnpaidHours) || 0;
      if (!Number.isFinite(hoursToPay) || hoursToPay <= 0) {
        await alert({ title: "Error", message: "Enter the hours to pay.", variant: "danger" });
        return;
      }
      if (hoursToPay > unpaid + 0.001) {
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

    setPaySaving(true);
    try {
      const res = await fetch("/api/dashboard/employee-payroll-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId: payingRow.employeeId,
          periodMonth: month,
          periodFrom: payPeriodFrom.trim(),
          periodTo: payPeriodTo.trim(),
          payType: payingRow.payType,
          hourlyRate: payingRow.hourlyRate,
          hours: payingRow.payType === "hourly" ? hoursToPay : 0,
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

      const paidName = payingRow.name;
      setPayModalOpen(false);
      setPayingRow(null);
      setPayPendingFiles([]);
      await load();
      await alert({
        title: "Saved",
        message: `Payroll payment recorded for ${paidName}.`,
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

  const columns = [
    {
      key: "actions",
      label: "Actions",
      render: (_, row) =>
        row.status === "unpaid" ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-7 shrink-0 whitespace-nowrap px-2.5 text-xs"
            onClick={() => openPay(row)}
          >
            Pay
          </Button>
        ) : null,
    },
    {
      key: "name",
      label: "Employee",
      sortable: true,
      render: (v, row) => (
        <button
          type="button"
          className={NAME_LINK_CLASS}
          onClick={() => openHistory(row)}
          title="View payment history"
        >
          {v || "Employee"}
        </button>
      ),
    },
    { key: "employeeNumber", label: "Emp #", sortable: true },
    { key: "department", label: "Dept", sortable: true },
    {
      key: "payType",
      label: "Pay type",
      render: (v) => (String(v) === "salary" ? "Salary" : "Hourly"),
    },
    {
      key: "workedHours",
      label: "Total hours",
      align: "right",
      sortable: true,
      render: (v) => (v == null ? "-" : (Number(v) || 0).toFixed(2)),
    },
    {
      key: "paidHours",
      label: "Paid hours",
      align: "right",
      sortable: true,
      render: (v) => (v == null ? "-" : (Number(v) || 0).toFixed(2)),
    },
    {
      key: "totalHours",
      label: "Unpaid hours",
      align: "right",
      sortable: true,
      render: (v) => (Number(v) || 0).toFixed(2),
    },
    {
      key: "hourlyRate",
      label: "Rate",
      align: "right",
      render: (v, row) => {
        const rate = String(v || "").trim();
        if (!rate) return "-";
        return row.payType === "salary" ? fmt(rate) : rate;
      },
    },
    {
      key: "amountDue",
      label: "Amount due",
      align: "right",
      sortable: true,
      render: (v) => fmt(v),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge
          variant={v === "paid" ? "success" : "warning"}
          className="rounded-full px-2.5 py-0.5 text-xs"
        >
          {v === "paid" ? "Paid" : "Unpaid"}
        </Badge>
      ),
    },
    {
      key: "paidAt",
      label: "Paid date",
      align: "right",
      render: (_, row) => {
        if (!row.payment?.paidAt) return "-";
        const text = formatDate(row.payment.paidAt);
        return text && text !== "-" ? text : "-";
      },
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-title">
            Month
            <input
              type="month"
              className="mt-1 block h-8 border border-border bg-card px-2 text-sm text-title"
              value={month}
              onChange={(e) => setMonth(e.target.value || currentMonthValue())}
            />
          </label>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
        <p className="text-sm text-secondary">
          {monthLabel(month)} unpaid:{" "}
          <span className="font-semibold tabular-nums text-title">{fmt(totalDue)}</span>
          {" across "}
          <span className="font-semibold text-title">{unpaidRows.length}</span>
          {" employee"}
          {unpaidRows.length === 1 ? "" : "s"}
        </p>
      </div>

      <p className="text-sm text-secondary">
        Total hours, paid hours, and unpaid hours on this table are for the selected month only.
        Pay shows every unpaid hour, including earlier and later periods, so they can be paid
        together. You can pay part of those hours. The rest stays unpaid. Set the pay period to
        cover the days you are paying. Salary uses the salary amount for the selected month. Punch
        history is kept on the Hours tab. Click an employee name to view payment history.
      </p>

      <div className={`${SIMPLE_SCREEN_TABLE_WRAP_CLASS} min-h-0 flex-1`}>
      <Table
        {...SIMPLE_LIST_TABLE_PROPS}
        columns={columns}
        data={rows}
        rowKey="employeeId"
        loading={loading}
        emptyMessage={loading ? "Loading…" : "No employee payroll due for this month."}
      />
      </div>

      <Modal
        open={payModalOpen}
        onClose={closePayModal}
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
            disabled={paySaving || payUploading}
          >
            {paySaving || payUploading ? "Saving…" : "Confirm payment"}
          </Button>
        }
      >
        <Form
          id={PAY_FORM_ID}
          onSubmit={handlePaySubmit}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          {payingRow ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-secondary">
                <span className="font-medium text-title">{payingRow.name}</span>
                {payingRow.employeeNumber ? ` · #${payingRow.employeeNumber}` : ""}
                {" · "}
                {payingRow.payType === "salary" ? "Salary" : "Hourly"}
              </p>
              {payingRow.payType === "hourly" ? (
                <p className="rounded-sm border border-warning/40 bg-warning/15 px-3 py-2 text-sm font-semibold text-title">
                  <span className="tabular-nums">
                    {(Number(payingRow.totalHours) || 0).toFixed(2)}
                  </span>
                  {" unpaid this month · "}
                  <span className="tabular-nums">
                    {(Number(payingRow.allUnpaidHours) || 0).toFixed(2)}
                  </span>
                  {" unpaid, all periods"}
                </p>
              ) : null}
            </div>
          ) : null}
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
          {payingRow?.payType === "hourly" ? (
            <FieldRow label="Hours to pay" className="items-start">
              <input
                type="number"
                min="0"
                max={Number(payingRow.allUnpaidHours) || 0}
                step="0.01"
                value={payHours}
                onChange={(e) => {
                  const next = e.target.value;
                  setPayHours(next);
                  setPayAmount(amountForHours(next, payingRow.hourlyRate));
                }}
                required
                className={FIELD_INPUT}
                aria-label="Hours to pay"
              />
              <p className="mt-1 text-xs text-secondary">
                Prefilled with all unpaid hours, including earlier and later periods. The table above shows this month only. Lower it to pay part. The rest stays unpaid.
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

      <SimpleEmployeePaymentHistoryModal
        open={Boolean(historyEmployee?.employeeId)}
        onClose={() => setHistoryEmployee(null)}
        employeeId={historyEmployee?.employeeId}
        employeeName={historyEmployee?.name}
        employeeNumber={historyEmployee?.employeeNumber}
      />
    </div>
  );
}
