"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useFormatMoney } from "@/contexts/user-settings-context";
import { periodMonthBounds } from "@/lib/employee-payroll-payment";
import SimpleEmployeePunchCalendar from "@/components/simple/simple-employee-punch-calendar";
import SimpleEmployeeRecordPaymentModal from "@/components/simple/simple-employee-record-payment-modal";

function monthLabel(ym) {
  const bounds = periodMonthBounds(ym);
  if (!bounds) return ym || "";
  const d = new Date(`${bounds.from}T12:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/**
 * Lists recorded payroll payments for one employee.
 * Optional leftPanel renders a side column (e.g. employee edit form).
 */
export default function SimpleEmployeePaymentHistoryModal({
  open,
  onClose,
  employeeId,
  employeeName = "",
  employeeNumber = "",
  payType = "hourly",
  hourlyRate = "",
  leftPanel = null,
  actions = null,
  title: titleOverride = "",
  showClose = true,
}) {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [payOpen, setPayOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [calendarReload, setCalendarReload] = useState(0);
  const [hoursForm, setHoursForm] = useState({ workDate: "", hours: "", note: "" });

  const hasLeftPanel = leftPanel != null;
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
    const id = String(employeeId || "").trim();
    if (!id) {
      setPayments([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/employee-payroll-payments?employeeId=${encodeURIComponent(id)}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load payment history");
      setPayments(Array.isArray(data.payments) ? data.payments : []);
    } catch (err) {
      setPayments([]);
      await alert({
        title: "Error",
        message: err?.message || "Failed to load payment history",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert, employeeId]);

  useEffect(() => {
    if (!open || hasLeftPanel) return;
    void load();
  }, [open, hasLeftPanel, load]);

  const openManualHours = () => {
    const now = new Date();
    const workDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    setHoursForm({ workDate, hours: "", note: "" });
    setHoursOpen(true);
  };

  const submitManualHours = async (e) => {
    e.preventDefault();
    const id = String(employeeId || "").trim();
    if (!id) return;
    setSavingHours(true);
    try {
      const res = await fetch("/api/dashboard/time-clock/manual-hours", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: id,
          workDate: hoursForm.workDate,
          hours: Number(hoursForm.hours),
          note: hoursForm.note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save hours");
      setHoursOpen(false);
      setCalendarReload((n) => n + 1);
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save hours",
        variant: "danger",
      });
    } finally {
      setSavingHours(false);
    }
  };

  const titleName = String(employeeName || "").trim() || "Employee";
  const titleNumber = String(employeeNumber || "").trim();
  const modalTitle =
    String(titleOverride || "").trim() ||
    (hasLeftPanel ? titleName : "Employee payment history");

  const columns = [
    {
      key: "periodMonth",
      label: "Month",
      sortable: true,
      render: (v) => monthLabel(v) || v || "-",
    },
    {
      key: "payPeriod",
      label: "Pay period",
      render: (_, row) => {
        const from = String(row.periodFrom || "").trim();
        const to = String(row.periodTo || "").trim();
        if (!from && !to) return "-";
        const fromText = from ? formatDate(from) : "";
        const toText = to ? formatDate(to) : "";
        if (fromText && toText) return `${fromText} to ${toText}`;
        return fromText || toText || "-";
      },
    },
    {
      key: "payType",
      label: "Pay type",
      render: (v) => (String(v) === "salary" ? "Salary" : "Hourly"),
    },
    {
      key: "hours",
      label: "Hours paid",
      align: "right",
      render: (v) => (Number(v) || 0).toFixed(2),
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      sortable: true,
      render: (v) => fmt(v),
    },
    {
      key: "status",
      label: "Status",
      render: () => (
        <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
          Paid
        </Badge>
      ),
    },
    {
      key: "paidAt",
      label: "Paid date",
      align: "right",
      sortable: true,
      render: (v) => {
        if (!v) return "-";
        const text = formatDate(v);
        return text && text !== "-" ? text : "-";
      },
    },
    {
      key: "paymentMethod",
      label: "Mode of payment",
      render: (v) => String(v || "").trim() || "-",
    },
    {
      key: "notes",
      label: "Notes",
      render: (v) => {
        const text = String(v || "").trim();
        return text ? (
          <span className="line-clamp-2 max-w-[14rem]" title={text}>
            {text}
          </span>
        ) : (
          "-"
        );
      },
    },
  ];

  const historyTable = (
    <Table
      columns={columns}
      data={payments}
      rowKey="id"
      loading={loading}
      emptyMessage={loading ? "Loading…" : "No payroll payments recorded for this employee."}
      responsive
    />
  );

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={modalTitle}
        size={hasLeftPanel ? "7xl" : "5xl"}
        width={hasLeftPanel ? "min(1680px, 98vw)" : "min(960px, 96vw)"}
        height={hasLeftPanel ? "min(90vh, 880px)" : undefined}
        showClose={showClose}
        closeOnOutsideClick={false}
        actions={
          <>
            {hasLeftPanel ? (
              <>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  disabled={!employeeId}
                  onClick={openManualHours}
                >
                  Manual hours
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  disabled={!employeeId}
                  onClick={() => setPayOpen(true)}
                >
                  Payment Record
                </Button>
              </>
            ) : null}
            {actions}
          </>
        }
        bodyClassName={
          hasLeftPanel
            ? "!relative !overflow-y-auto !overscroll-contain !p-3 sm:!p-4 lg:!overflow-hidden"
            : ""
        }
      >
        {hasLeftPanel ? (
          <div className="relative flex min-h-0 flex-col gap-4 lg:absolute lg:inset-0 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-5 lg:overflow-hidden lg:p-1">
            <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              {leftPanel}
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-4 lg:pb-1">
              <SimpleEmployeePunchCalendar
                employeeId={employeeId}
                open={open}
                reloadToken={calendarReload}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="text-sm text-secondary">
                <span className="font-medium text-title">{titleName}</span>
                {titleNumber ? ` · #${titleNumber}` : ""}
              </div>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="shrink-0"
                disabled={!employeeId}
                onClick={() => setPayOpen(true)}
              >
                Payment Record
              </Button>
            </div>
            {historyTable}
          </>
        )}
      </Modal>

      <Modal
        open={hoursOpen}
        onClose={() => !savingHours && setHoursOpen(false)}
        title="Manual hours"
        size="md"
        showClose={!savingHours}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form="employee-manual-hours-form" variant="primary" size="sm" disabled={savingHours}>
            {savingHours ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id="employee-manual-hours-form"
          onSubmit={submitManualHours}
          className="flex flex-col gap-3 !space-y-0 !border-0 !p-0 !shadow-none"
        >
          <label className="text-xs font-bold text-title">
            Date
            <input
              type="date"
              required
              className="mt-1 h-8 w-full border border-border bg-card px-2 text-sm text-title"
              value={hoursForm.workDate}
              onChange={(e) => setHoursForm((f) => ({ ...f, workDate: e.target.value }))}
              disabled={savingHours}
            />
          </label>
          <label className="text-xs font-bold text-title">
            Hours
            <input
              type="number"
              required
              min="0.01"
              max="24"
              step="0.01"
              className="mt-1 h-8 w-full border border-border bg-card px-2 text-sm text-title"
              value={hoursForm.hours}
              onChange={(e) => setHoursForm((f) => ({ ...f, hours: e.target.value }))}
              placeholder="e.g. 8"
              disabled={savingHours}
            />
          </label>
          <label className="text-xs font-bold text-title">
            Note (optional)
            <textarea
              rows={3}
              maxLength={500}
              className="mt-1 w-full border border-border bg-card px-2 py-1.5 text-sm text-title"
              value={hoursForm.note}
              onChange={(e) => setHoursForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Reason or description…"
              disabled={savingHours}
            />
          </label>
        </Form>
      </Modal>

      <SimpleEmployeeRecordPaymentModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        employee={
          payOpen && employeeId
            ? {
                employeeId,
                employeeName: titleName,
                employeeNumber: titleNumber,
                payType,
                hourlyRate,
              }
            : null
        }
        onSaved={() => {
          setPayOpen(false);
          if (!hasLeftPanel) void load();
        }}
      />
    </>
  );
}
