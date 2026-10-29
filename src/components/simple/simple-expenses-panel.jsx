"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  buildEmployeeSelectOptions,
  resolveEmployeeDisplayName,
  resolveLoggedInEmployeeSelectValue,
  withShopAdminEmployee,
} from "@/lib/technician-select-options";
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions } from "@/lib/product-dropdown-catalog";
import {
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";

const FORM_ID = "simple-expense-form";

const CHART_PERIOD_WEEK = "week";
const CHART_PERIOD_MONTH = "month";
const CHART_PERIOD_PREV_MONTH = "prev_month";
const CHART_PERIOD_CUSTOM = "custom";

const CHART_PERIOD_OPTIONS = [
  { value: CHART_PERIOD_WEEK, label: "This Week" },
  { value: CHART_PERIOD_MONTH, label: "This Month" },
  { value: CHART_PERIOD_PREV_MONTH, label: "Prev. Month" },
  { value: CHART_PERIOD_CUSTOM, label: "Custom" },
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toIsoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function todayIso() {
  return toIsoDate(new Date());
}

/** Local calendar Monday-start week containing today. */
function weekRangeIso(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 Sun … 6 Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

function monthRangeIso(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 0);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function prevMonthRangeIso(now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

function rangeForChartPeriod(period) {
  if (period === CHART_PERIOD_WEEK) return weekRangeIso();
  if (period === CHART_PERIOD_PREV_MONTH) return prevMonthRangeIso();
  if (period === CHART_PERIOD_CUSTOM) return null;
  return monthRangeIso();
}

function emptyForm(employeeId = "") {
  return {
    id: "",
    expenseDate: todayIso(),
    category: "",
    creditCardNumber: "",
    employeeId: String(employeeId || ""),
    amount: "",
    notes: "",
  };
}

function MoneyBarEndLabel({ x, y, width, height, value, formatMoney }) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  if (n <= 0) return null;
  const labelX = Number(x) + Number(width) + 6;
  const labelY = Number(y) + Number(height) / 2;
  return (
    <text
      x={labelX}
      y={labelY}
      fill="currentColor"
      className="fill-title"
      fontSize={11}
      fontWeight={600}
      dominantBaseline="middle"
    >
      {formatMoney(n)}
    </text>
  );
}

/**
 * Record shop expenses: left form + chart, right history table.
 * @param {{ presentation?: "panel" | "embedded", className?: string }} props
 */
export default function SimpleExpensesPanel({ presentation = "panel", className = "" }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const formatDate = useFormatDate();
  const formatMoney = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const [employees, setEmployees] = useState([]);
  const employeesWithAdmin = useMemo(() => withShopAdminEmployee(employees, user), [employees, user]);
  const defaultEmployeeId = useMemo(
    () => resolveLoggedInEmployeeSelectValue(user, employeesWithAdmin),
    [user, employeesWithAdmin]
  );

  const [form, setForm] = useState(() => emptyForm());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chartPeriod, setChartPeriod] = useState(CHART_PERIOD_MONTH);
  const [customFrom, setCustomFrom] = useState(() => monthRangeIso().from);
  const [customTo, setCustomTo] = useState(() => todayIso());
  const [creditCardFilter, setCreditCardFilter] = useState("");

  const chartRange = useMemo(() => {
    const preset = rangeForChartPeriod(chartPeriod);
    if (preset) return preset;
    return {
      from: String(customFrom || "").trim(),
      to: String(customTo || "").trim(),
    };
  }, [chartPeriod, customFrom, customTo]);

  const categoryOptions = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "expense_category", {
      includeEmpty: false,
    });
    return fromSettings.length
      ? fromSettings
      : [
          { value: "Travel", label: "Travel" },
          { value: "Supplies", label: "Supplies" },
          { value: "Other", label: "Other" },
        ];
  }, [mergedSettings]);

  const creditCardOptionsBase = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "expense_credit_card", {
      includeEmpty: false,
    });
    return fromSettings.length
      ? fromSettings
      : [
          { value: "Company Visa", label: "Company Visa" },
          { value: "Company Mastercard", label: "Company Mastercard" },
          { value: "Other", label: "Other" },
        ];
  }, [mergedSettings]);

  const creditCardOptions = useMemo(() => {
    const current = String(form.creditCardNumber || "").trim();
    if (current && !creditCardOptionsBase.some((o) => o.value === current)) {
      return [{ value: current, label: current }, ...creditCardOptionsBase];
    }
    return creditCardOptionsBase;
  }, [creditCardOptionsBase, form.creditCardNumber]);

  const creditCardFilterOptions = useMemo(() => {
    const seen = new Set();
    const opts = [{ value: "", label: "All credit cards" }];
    for (const o of creditCardOptionsBase) {
      const v = String(o.value || "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      opts.push({ value: v, label: o.label || v });
    }
    for (const r of rows) {
      const v = String(r.creditCardNumber || "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      opts.push({ value: v, label: v });
    }
    return opts;
  }, [creditCardOptionsBase, rows]);

  const employeeOptions = useMemo(
    () => buildEmployeeSelectOptions(employeesWithAdmin, form.employeeId),
    [employeesWithAdmin, form.employeeId]
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/simple-expenses?limit=500", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load expenses");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      setRows([]);
      await alert({
        title: "Error",
        message: err.message || "Could not load expenses",
        variant: "danger",
      });
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    void loadRows();
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
  }, [loadRows]);

  useEffect(() => {
    if (!defaultEmployeeId) return;
    setForm((f) => {
      if (f.id || String(f.employeeId || "").trim()) return f;
      return { ...f, employeeId: defaultEmployeeId };
    });
  }, [defaultEmployeeId]);

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const resetForm = useCallback(() => {
    setForm(emptyForm(defaultEmployeeId));
  }, [defaultEmployeeId]);

  const startEdit = (row) => {
    setForm({
      id: String(row.id || ""),
      expenseDate: String(row.expenseDate || todayIso()).slice(0, 10),
      category: String(row.category || ""),
      creditCardNumber: String(row.creditCardNumber || ""),
      employeeId: String(row.employeeId || ""),
      amount: row.amount != null && row.amount !== "" ? String(row.amount) : "",
      notes: String(row.notes || ""),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.expenseDate || "").trim()) {
      await alert({ title: "Error", message: "Date is required.", variant: "danger" });
      return;
    }
    if (!String(form.category || "").trim()) {
      await alert({ title: "Error", message: "Category is required.", variant: "danger" });
      return;
    }
    const amount = parseFloat(String(form.amount || "").trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      await alert({
        title: "Error",
        message: "Enter a valid amount greater than zero.",
        variant: "danger",
      });
      return;
    }

    const employeeId = String(form.employeeId || "").trim();
    const employeeName = resolveEmployeeDisplayName(employeesWithAdmin, employeeId);
    const payload = {
      expenseDate: String(form.expenseDate).trim().slice(0, 10),
      category: String(form.category).trim(),
      creditCardNumber: String(form.creditCardNumber || "").trim(),
      employeeId,
      employeeName,
      amount,
      notes: String(form.notes || "").trim(),
    };

    setSaving(true);
    try {
      const editingId = String(form.id || "").trim();
      const res = await fetch(
        editingId ? `/api/dashboard/simple-expenses/${editingId}` : "/api/dashboard/simple-expenses",
        {
          method: editingId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(editingId ? "Expense updated." : "Expense recorded.");
      resetForm();
      await loadRows();
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

  const handleDelete = async (row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    const ok = await confirm({
      title: "Delete expense?",
      message: `Delete ${formatMoney(row.amount)} (${row.category || "expense"}) on ${
        row.expenseDate ? formatDate(row.expenseDate) : "-"
      }? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/simple-expenses/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Expense deleted.");
      if (String(form.id) === id) resetForm();
      await loadRows();
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to delete",
        variant: "danger",
      });
    }
  };

  const filteredRows = useMemo(() => {
    const from = String(chartRange.from || "").trim();
    const to = String(chartRange.to || "").trim();
    const card = String(creditCardFilter || "").trim();
    return rows.filter((r) => {
      const d = String(r.expenseDate || "").slice(0, 10);
      if (!d) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (card && String(r.creditCardNumber || "").trim() !== card) return false;
      return true;
    });
  }, [rows, chartRange, creditCardFilter]);

  const categoryChartData = useMemo(() => {
    /** @type {Map<string, number>} */
    const map = new Map();
    for (const r of filteredRows) {
      const cat = String(r.category || "").trim() || "Other";
      map.set(cat, (map.get(cat) || 0) + (Number(r.amount) || 0));
    }
    return [...map.entries()]
      .map(([label, amount]) => ({
        label,
        amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredRows]);

  const chartTotal = useMemo(
    () => categoryChartData.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [categoryChartData]
  );

  const chartHeight = Math.max(160, categoryChartData.length * 36 + 24);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        className: "w-20",
        render: (_, row) => (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              title="Edit"
              onClick={() => startEdit(row)}
            >
              <FiEdit2 className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-danger hover:bg-danger/10"
              title="Delete"
              onClick={() => void handleDelete(row)}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "expenseDate",
        label: "Date",
        sortable: true,
        render: (v) => (v ? formatDate(v) : "-"),
      },
      {
        key: "category",
        label: "Category",
        sortable: true,
        render: (v) => String(v || "").trim() || "-",
      },
      {
        key: "creditCardNumber",
        label: "Credit card",
        sortable: true,
        render: (v) => String(v || "").trim() || "-",
      },
      {
        key: "employeeName",
        label: "Employee",
        sortable: true,
        render: (v, row) =>
          String(v || "").trim() ||
          resolveEmployeeDisplayName(employeesWithAdmin, row.employeeId) ||
          "-",
      },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        align: "right",
        render: (v) => (
          <span className="tabular-nums font-medium text-title">{formatMoney(v)}</span>
        ),
      },
      {
        key: "notes",
        label: "Notes",
        sortable: false,
        render: (v) => (
          <span className="line-clamp-2 text-secondary">{String(v || "").trim() || "-"}</span>
        ),
      },
    ],
    [employeesWithAdmin, formatDate, formatMoney]
  );

  const formCard = (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-secondary">
          {form.id ? "Edit expense" : "Record expense"}
        </p>
        {form.id ? (
          <Button type="button" variant="outline" size="sm" disabled={saving} onClick={resetForm}>
            New
          </Button>
        ) : null}
      </div>
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <Input
          label="Date *"
          type="date"
          value={form.expenseDate}
          onChange={(e) => patch("expenseDate", e.target.value)}
          required
        />
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-title" htmlFor="simple-expense-category">
            Category *
          </label>
          <SimpleSelect
            id="simple-expense-category"
            options={categoryOptions}
            value={form.category}
            onChange={(e) => patch("category", e.target.value)}
            placeholder="Select category…"
            searchable
            aria-label="Category"
          />
          <p className="mt-1 text-xs text-secondary">
            Manage categories in Settings → Dropdowns → Expense category.
          </p>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-title" htmlFor="simple-expense-credit-card">
            Credit card number
          </label>
          <SimpleSelect
            id="simple-expense-credit-card"
            options={creditCardOptions}
            value={form.creditCardNumber}
            onChange={(e) => patch("creditCardNumber", e.target.value)}
            placeholder="Select credit card…"
            searchable
            aria-label="Credit card number"
          />
          <p className="mt-1 text-xs text-secondary">
            Manage cards in Settings → Dropdowns → Credit card number.
          </p>
        </div>
        <div className="min-w-0">
          <label className="mb-1 block text-sm text-title" htmlFor="simple-expense-employee">
            Employee
          </label>
          <SimpleSelect
            id="simple-expense-employee"
            options={employeeOptions}
            value={form.employeeId}
            onChange={(e) => patch("employeeId", e.target.value)}
            placeholder="Select…"
            searchable
            aria-label="Employee"
          />
        </div>
        <Input
          label="Amount *"
          type="text"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => patch("amount", e.target.value)}
          placeholder="0.00"
          required
          inputClassName="text-right tabular-nums"
        />
        <Textarea
          label="Notes"
          value={form.notes}
          onChange={(e) => patch("notes", e.target.value)}
          rows={3}
        />
        <Button type="submit" form={FORM_ID} variant="primary" disabled={saving} className="w-full">
          {saving ? "Saving…" : form.id ? "Update expense" : "Save expense"}
        </Button>
      </Form>
    </div>
  );

  const dateFilterBar = (
    <div className="flex shrink-0 flex-nowrap items-end gap-2 overflow-x-auto border-b border-border pb-2">
      <div
        className="inline-grid shrink-0 grid-cols-4 gap-1 border border-border bg-[hsl(var(--form-bg))] p-0.5"
        role="group"
        aria-label="Expense date range"
      >
        {CHART_PERIOD_OPTIONS.map((opt) => {
          const active = chartPeriod === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setChartPeriod(opt.value)}
              className={`min-h-8 px-2 text-[11px] font-semibold whitespace-nowrap sm:text-xs ${
                active
                  ? "bg-primary text-white"
                  : "bg-transparent text-secondary hover:bg-primary/10 hover:text-primary"
              }`}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="w-[13rem] shrink-0">
        <label className="mb-1 block text-xs text-title" htmlFor="simple-expense-card-filter">
          Credit card
        </label>
        <SimpleSelect
          id="simple-expense-card-filter"
          options={creditCardFilterOptions}
          value={creditCardFilter}
          onChange={(e) => setCreditCardFilter(e.target.value)}
          placeholder="All credit cards"
          searchable
          aria-label="Filter by credit card"
        />
      </div>
      {chartPeriod === CHART_PERIOD_CUSTOM ? (
        <>
          <Input
            label="From"
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="w-[9.5rem] shrink-0"
          />
          <Input
            label="To"
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="w-[9.5rem] shrink-0"
          />
        </>
      ) : null}
      <p className="mb-1.5 ml-auto shrink-0 whitespace-nowrap text-xs text-secondary sm:text-sm">
        {filteredRows.length} ·{" "}
        <span className="font-semibold tabular-nums text-title">{formatMoney(chartTotal)}</span>
        {chartRange.from || chartRange.to ? (
          <span>
            {" "}
            · {chartRange.from ? formatDate(chartRange.from) : "…"} to{" "}
            {chartRange.to ? formatDate(chartRange.to) : "…"}
          </span>
        ) : null}
      </p>
    </div>
  );

  const chartCard = (
    <div className="rounded-sm border border-border bg-card p-4">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-secondary">
          Expenses by category
        </p>
        <p className="mt-1 text-sm text-secondary">
          Total:{" "}
          <span className="font-semibold tabular-nums text-title">{formatMoney(chartTotal)}</span>
        </p>
      </div>
      {categoryChartData.length === 0 ? (
        <p className="py-8 text-center text-sm text-secondary">
          No expenses in this date range.
        </p>
      ) : (
        <div className="w-full text-title" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryChartData}
              layout="vertical"
              margin={{ left: 8, right: 64, top: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatMoney(v)}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                formatter={(v) => [formatMoney(v), "Amount"]}
                labelFormatter={(label) => String(label || "")}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 0,
                }}
              />
              <Bar dataKey="amount" name="Amount" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]}>
                <LabelList
                  dataKey="amount"
                  content={(props) => <MoneyBarEndLabel {...props} formatMoney={formatMoney} />}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  const tableCard = (
    <div
      className={`${SIMPLE_SCREEN_TABLE_WRAP_CLASS} flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-border bg-card p-2 sm:p-2.5`}
    >
      {dateFilterBar}
      <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
        <Table
          columns={columns}
          data={filteredRows}
          rowKey="id"
          loading={loading}
          emptyMessage={
            creditCardFilter
              ? "No expenses for this credit card in the selected date range."
              : "No expenses in this date range."
          }
          fillHeight
          dense
          textSize="xs"
        />
      </div>
    </div>
  );

  const body = (
    <div
      className={`grid h-full min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(26rem,38rem)_minmax(0,2fr)] xl:items-stretch ${className}`}
    >
      <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto xl:max-h-full">
        {formCard}
        {chartCard}
      </div>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        {tableCard}
      </div>
    </div>
  );

  if (presentation === "embedded") {
    return body;
  }

  return (
    <div className={`${SIMPLE_SCREEN_PANEL_CLASS} flex min-h-0 flex-1 flex-col gap-3 overflow-hidden`}>
      <div className="hidden shrink-0 border-b border-border pb-3 sm:block">
        <h2 className="text-lg font-bold text-title">Expenses</h2>
        <p className="mt-1 text-sm text-secondary">
          Record other shop expenses by category. Categories are managed in Settings → Dropdowns.
        </p>
      </div>
      {body}
    </div>
  );
}

/**
 * Modal wrapper used from Purchase / Payable toolbar.
 */
export function SimpleExpensesModal({ open, onClose, zIndex = 120 }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Expenses"
      size="7xl"
      width="min(1680px, 98vw)"
      height="90vh"
      zIndex={zIndex}
      showClose
      closeOnOutsideClick={false}
      bodyClassName="!flex !h-full !min-h-0 !flex-col !overflow-hidden"
    >
      <SimpleExpensesPanel presentation="embedded" className="h-full min-h-0 flex-1" />
    </Modal>
  );
}
