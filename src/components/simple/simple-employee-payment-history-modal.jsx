"use client";

import { useCallback, useEffect, useState } from "react";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useFormatMoney } from "@/contexts/user-settings-context";
import { periodMonthBounds } from "@/lib/employee-payroll-payment";

function monthLabel(ym) {
  const bounds = periodMonthBounds(ym);
  if (!bounds) return ym || "";
  const d = new Date(`${bounds.from}T12:00:00`);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/**
 * Lists recorded payroll payments for one employee.
 */
export default function SimpleEmployeePaymentHistoryModal({
  open,
  onClose,
  employeeId,
  employeeName = "",
  employeeNumber = "",
}) {
  const alert = useAlert();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);

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
    if (!open) return;
    void load();
  }, [open, load]);

  const titleName = String(employeeName || "").trim() || "Employee";
  const titleNumber = String(employeeNumber || "").trim();

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
      label: "Hours",
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Employee payment history"
      size="5xl"
      width="min(960px, 96vw)"
      showClose
    >
      <div className="mb-3 text-sm text-secondary">
        <span className="font-medium text-title">{titleName}</span>
        {titleNumber ? ` · #${titleNumber}` : ""}
      </div>
      <Table
        columns={columns}
        data={payments}
        rowKey="id"
        loading={loading}
        emptyMessage={loading ? "Loading…" : "No payroll payments recorded for this employee."}
        responsive
      />
    </Modal>
  );
}
