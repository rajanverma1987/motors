"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDollarSign, FiEye } from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useFormatMoney } from "@/contexts/user-settings-context";
import {
  estimateEmployeePeriodPay,
  periodMonthBounds,
} from "@/lib/employee-payroll-payment";

const PAY_FORM_ID = "simple-employee-release-payment-form";
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

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function monthLabel(ym) {
  const bounds = periodMonthBounds(ym);
  if (!bounds) return ym || "";
  const d = new Date(`${bounds.from}T12:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/**
 * Release Payment: employee payroll due for a month, with per-employee record payment.
 */
export default function SimpleReleasePaymentPanel() {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();

  const [month, setMonth] = useState(currentMonthValue);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payPaidAt, setPayPaidAt] = useState(todayIsoDate);
  const [payNotes, setPayNotes] = useState("");
  const [payPendingFiles, setPayPendingFiles] = useState([]);
  const [paySaving, setPaySaving] = useState(false);
  const [payUploading, setPayUploading] = useState(false);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPayment, setViewingPayment] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

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
      const [hoursRes, paymentsRes, employeesRes] = await Promise.all([
        fetch(`/api/dashboard/time-clock/hours?${hoursParams}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch(`/api/dashboard/employee-payroll-payments?periodMonth=${encodeURIComponent(month)}`, {
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
      ]);

      const hoursData = await hoursRes.json().catch(() => ({}));
      const paymentsData = await paymentsRes.json().catch(() => ({}));
      const employeesData = await employeesRes.json().catch(() => ({}));

      if (!hoursRes.ok) throw new Error(hoursData.error || "Failed to load hours");
      if (!paymentsRes.ok) throw new Error(paymentsData.error || "Failed to load payroll payments");
      if (!employeesRes.ok) throw new Error(employeesData.error || "Failed to load employees");

      const hoursRows = Array.isArray(hoursData.rows) ? hoursData.rows : [];
      const payments = Array.isArray(paymentsData.payments) ? paymentsData.payments : [];
      const employees = Array.isArray(employeesData.items)
        ? employeesData.items
        : Array.isArray(employeesData)
          ? employeesData
          : [];

      const hoursByEmployee = new Map(hoursRows.map((r) => [String(r.employeeId), r]));
      const paymentByEmployee = new Map(payments.map((p) => [String(p.employeeId), p]));

      const activeEmployees = employees.filter((e) => {
        const status = String(e.employmentStatus || "Active").trim().toLowerCase();
        return status === "active" || status === "";
      });

      const nextRows = [];
      const seen = new Set();

      for (const emp of activeEmployees) {
        const id = String(emp.id || emp._id || "").trim();
        if (!id) continue;
        seen.add(id);
        const hoursRow = hoursByEmployee.get(id);
        const totalHours = Number(hoursRow?.totalHours) || 0;
        const payType = String(emp.payType || hoursRow?.payType || "hourly").toLowerCase() === "salary"
          ? "salary"
          : "hourly";
        const hourlyRate = String(emp.hourlyRate ?? hoursRow?.hourlyRate ?? "").trim();
        const amountDue = estimateEmployeePeriodPay({
          payType,
          hourlyRate,
          totalHours,
        });
        const payment = paymentByEmployee.get(id) || null;

        if (!payment && payType === "hourly" && totalHours <= 0) continue;
        if (!payment && payType === "salary" && amountDue <= 0) continue;

        nextRows.push({
          employeeId: id,
          name: String(emp.name || hoursRow?.name || "").trim() || "Employee",
          employeeNumber: String(emp.employeeNumber || hoursRow?.employeeNumber || "").trim(),
          department: String(emp.department || hoursRow?.department || "").trim(),
          payType,
          hourlyRate,
          totalHours,
          amountDue,
          payment,
          status: payment ? "paid" : "unpaid",
        });
      }

      for (const hoursRow of hoursRows) {
        const id = String(hoursRow.employeeId || "").trim();
        if (!id || seen.has(id)) continue;
        const totalHours = Number(hoursRow.totalHours) || 0;
        const payType =
          String(hoursRow.payType || "hourly").toLowerCase() === "salary" ? "salary" : "hourly";
        const hourlyRate = String(hoursRow.hourlyRate || "").trim();
        const amountDue = estimateEmployeePeriodPay({ payType, hourlyRate, totalHours });
        const payment = paymentByEmployee.get(id) || null;
        if (!payment && totalHours <= 0 && amountDue <= 0) continue;
        nextRows.push({
          employeeId: id,
          name: String(hoursRow.name || "").trim() || "Employee",
          employeeNumber: String(hoursRow.employeeNumber || "").trim(),
          department: String(hoursRow.department || "").trim(),
          payType,
          hourlyRate,
          totalHours,
          amountDue,
          payment,
          status: payment ? "paid" : "unpaid",
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
    setPayingRow(row);
    setPayAmount(String(Number(row.amountDue) || 0));
    setPayPaidAt(todayIsoDate());
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

  const openView = async (row) => {
    const id = row?.payment?.id;
    if (!id) return;
    setViewModalOpen(true);
    setViewingPayment(row.payment);
    setViewLoading(true);
    try {
      const res = await fetch(`/api/dashboard/employee-payroll-payments/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load payment");
      setViewingPayment(data);
    } catch (err) {
      setViewModalOpen(false);
      setViewingPayment(null);
      await alert({
        title: "Error",
        message: err?.message || "Failed to load payment",
        variant: "danger",
      });
    } finally {
      setViewLoading(false);
    }
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

    setPaySaving(true);
    try {
      const res = await fetch("/api/dashboard/employee-payroll-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId: payingRow.employeeId,
          periodMonth: month,
          payType: payingRow.payType,
          hourlyRate: payingRow.hourlyRate,
          hours: payingRow.totalHours,
          amount,
          paidAt: payPaidAt.trim(),
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
        row.status === "paid" ? (
          <button
            type="button"
            className="inline-flex items-center p-1.5 text-primary hover:bg-primary/10"
            title="View payment"
            aria-label="View payment"
            onClick={() => void openView(row)}
          >
            <FiEye className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center p-1.5 text-primary hover:bg-primary/10"
            title="Record payment"
            aria-label={`Record payment for ${row.name}`}
            onClick={() => openPay(row)}
          >
            <FiDollarSign className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        ),
    },
    { key: "name", label: "Employee", sortable: true },
    { key: "employeeNumber", label: "Emp #", sortable: true },
    { key: "department", label: "Dept", sortable: true },
    {
      key: "payType",
      label: "Pay type",
      render: (v) => (String(v) === "salary" ? "Salary" : "Hourly"),
    },
    {
      key: "totalHours",
      label: "Hours",
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
      render: (v, row) => fmt(row.payment?.amount ?? v),
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
    <div className="w-full min-w-0 space-y-4">
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
        Hourly pay uses clocked hours × rate for the month. Salary uses the employee salary amount.
        Record payment per employee when you pay them.
      </p>

      <Table
        columns={columns}
        data={rows}
        rowKey="employeeId"
        loading={loading}
        emptyMessage={loading ? "Loading…" : "No employee payroll due for this month."}
        responsive
      />

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
            <p className="text-sm text-secondary">
              <span className="font-medium text-title">{payingRow.name}</span>
              {payingRow.employeeNumber ? ` · #${payingRow.employeeNumber}` : ""}
              {" · "}
              {payingRow.payType === "salary" ? "Salary" : "Hourly"}
              {" · "}
              <span className="tabular-nums">{(Number(payingRow.totalHours) || 0).toFixed(2)}</span>
              {" hrs"}
            </p>
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

      <Modal
        open={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setViewingPayment(null);
        }}
        title="Payroll payment record"
        size="lg"
        showClose
      >
        {viewLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-secondary">Loading…</div>
        ) : viewingPayment ? (
          <div className="flex flex-col gap-3">
            <FieldRow label="Employee">
              <p className="text-sm text-title">{viewingPayment.employeeName || "—"}</p>
            </FieldRow>
            <FieldRow label="Month">
              <p className="text-sm text-title">{monthLabel(viewingPayment.periodMonth)}</p>
            </FieldRow>
            <FieldRow label="Hours">
              <p className="text-sm tabular-nums text-title">
                {(Number(viewingPayment.hours) || 0).toFixed(2)}
              </p>
            </FieldRow>
            <FieldRow label="Amount">
              <p className="text-sm tabular-nums text-title">{fmt(viewingPayment.amount)}</p>
            </FieldRow>
            <FieldRow label="Status">
              <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                Paid
              </Badge>
            </FieldRow>
            <FieldRow label="Paid date">
              <p className="text-sm text-title">{formatDate(viewingPayment.paidAt) || "—"}</p>
            </FieldRow>
            <FieldRow label="Notes" className="items-start">
              <p className="whitespace-pre-wrap text-sm text-title">
                {String(viewingPayment.notes || "").trim() || "—"}
              </p>
            </FieldRow>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
