"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiRefreshCw, FiPackage } from "react-icons/fi";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { invoiceStatusLabel } from "@/lib/invoice-status";
import DashboardPeriodFilter from "@/components/dashboard/dashboard-period-filter";
import { rangeToQueryParams } from "@/lib/dashboard-period";

const LEAD_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

const QUOTE_STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  rnr: "R&R",
  other: "Other",
};

const LEAD_SOURCE_LABELS = {
  website: "Website",
  admin_assigned: "Assigned",
  manual: "Manual",
};

function formatSeriesRow(row) {
  if (row?.label) return row.label;
  const m = row?.month || row?.key;
  if (!m || m.length < 7) return m || "—";
  if (m.length === 10 && m.includes("-")) {
    const d = new Date(m + "T12:00:00");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function MiniBars({ rows, valueKey, maxOverride, fmt }) {
  const max = maxOverride ?? Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <div className="flex h-24 items-end gap-1 border-t border-border pt-3">
      {rows.map((r) => {
        const v = Number(r[valueKey]) || 0;
        const pct = max > 0 ? Math.max(4, (v / max) * 100) : 0;
        const title = `${formatSeriesRow(r)}: ${fmt ? fmt(v) : v}`;
        return (
          <div key={r.key || r.month} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={title}>
            <div
              className="w-full max-w-[48px] rounded-t bg-primary/70 dark:bg-primary/50"
              style={{ height: `${pct}%`, minHeight: v > 0 ? 4 : 0 }}
            />
            <span className="truncate text-[10px] text-secondary">
              {(r.label || r.month || r.key || "").toString().slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CountBars({ rows, valueKey }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey]) || 0));
  return (
    <div className="flex h-20 items-end gap-1 border-t border-border pt-3">
      {rows.map((r) => {
        const v = Number(r[valueKey]) || 0;
        const pct = max > 0 ? Math.max(6, (v / max) * 100) : 0;
        return (
          <div
            key={r.key || r.month}
            className="flex min-w-0 flex-1 flex-col items-center gap-1"
            title={`${formatSeriesRow(r)}: ${v}`}
          >
            <div
              className="w-full max-w-[40px] rounded-t bg-emerald-600/70 dark:bg-emerald-500/50"
              style={{ height: `${pct}%`, minHeight: v > 0 ? 4 : 0 }}
            />
            <span className="truncate text-[10px] text-secondary">
              {(r.label || r.month || r.key || "").toString().slice(0, 6)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ReportTable({ columns, rows, empty }) {
  if (!rows?.length) {
    return <p className="py-4 text-sm text-secondary">{empty || "No data."}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[240px] text-sm">
        <thead>
          <tr className="border-b border-border bg-card">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary ${c.align === "right" ? "text-right" : ""}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-title">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-b border-border last:border-b-0">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                >
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPageClient() {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [data, setData] = useState(null);
  const [commissionRows, setCommissionRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodQs, setPeriodQs] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = periodQs
        ? `/api/dashboard/reports?${periodQs}`
        : "/api/dashboard/reports";
      const [res, commRes] = await Promise.all([
        fetch(url, { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/sales-commissions", { credentials: "include", cache: "no-store" }),
      ]);
      const d = await res.json();
      const commData = await commRes.json();
      if (!res.ok) throw new Error(d.error || "Failed to load reports");
      setData(d);
      setCommissionRows(Array.isArray(commData?.commissions) ? commData.commissions : []);
    } catch (e) {
      toast.error(e.message || "Could not load reports");
      setData(null);
      setCommissionRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast, periodQs]);

  useEffect(() => {
    load();
  }, [load]);

  const summaryCards = useMemo(() => {
    const s = data?.summary;
    if (!s) return [];
    return [
      { label: "Leads", value: s.leads, href: "/dashboard/leads" },
      { label: "Customers", value: s.customers, href: "/dashboard/customers" },
      { label: "Motors", value: s.motors, href: "/dashboard/motors" },
      { label: "Quotes", value: s.quotes, href: "/dashboard/quotes" },
      { label: "Work orders", value: s.workOrders, href: "/dashboard/work-orders" },
      { label: "Invoices", value: s.invoices, href: "/dashboard/invoices" },
      { label: "Purchase orders", value: s.purchaseOrders, href: "/dashboard/purchase-orders" },
      { label: "Vendors", value: s.vendors, href: "/dashboard/vendors" },
      { label: "Employees", value: s.employees, href: "/dashboard/employees" },
      { label: "Inventory SKUs", value: s.inventorySkus ?? 0, href: "/dashboard/inventory" },
    ];
  }, [data]);

  const leadStatusRows = useMemo(() => {
    const b = data?.leads?.byStatus;
    if (!b) return [];
    return Object.entries(b).map(([k, count]) => ({
      key: k,
      label: LEAD_STATUS_LABELS[k] || k,
      count,
    }));
  }, [data]);

  const quoteStatusRows = useMemo(() => {
    const b = data?.quotes?.byStatus;
    if (!b) return [];
    return Object.entries(b)
      .filter(([, c]) => c > 0)
      .map(([k, count]) => ({ key: k, label: QUOTE_STATUS_LABELS[k] || k, count }));
  }, [data]);

  const commissionUnpaidRows = useMemo(
    () => commissionRows.filter((r) => String(r.status || "").toLowerCase() !== "paid"),
    [commissionRows]
  );
  const commissionPaidRows = useMemo(
    () => commissionRows.filter((r) => String(r.status || "").toLowerCase() === "paid"),
    [commissionRows]
  );
  const commissionTotalAmount = useMemo(
    () => commissionRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [commissionRows]
  );
  const commissionUnpaidAmount = useMemo(
    () => commissionUnpaidRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [commissionUnpaidRows]
  );
  const commissionPaidAmount = useMemo(
    () => commissionPaidRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [commissionPaidRows]
  );

  if (loading && !data) {
    return (
      <div className="mx-auto flex max-w-6xl flex-1 flex-col px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-border" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 pb-12">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Reports</h1>
          <p className="mt-1 text-sm text-secondary">
            Shop-wide summaries from leads, customers, quotes, jobs, invoices, and purchase orders. Charts use
            days, weeks, or months depending on the period.
          </p>
          {data?.period?.label && (
            <p className="mt-1 text-sm font-medium text-title">Showing: {data.period.label}</p>
          )}
          {data?.generatedAt && (
            <p className="mt-1 text-xs text-secondary">
              Generated {new Date(data.generatedAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
        >
          <FiRefreshCw
            className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          <span>Refresh</span>
        </Button>
      </div>

      <DashboardPeriodFilter
        onRangeChange={(range) => {
          setPeriodQs(range ? rangeToQueryParams(range) : "");
        }}
      />

      {/* Summary */}
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-title">Record counts</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {summaryCards.map(({ label, value, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-card/80"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-title">{value ?? 0}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Leads */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Leads</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">By status</h3>
            <ReportTable
              columns={[
                { key: "label", label: "Status" },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={leadStatusRows}
              empty="No leads."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">By source</h3>
            <ReportTable
              columns={[
                {
                  key: "source",
                  label: "Source",
                  render: (_, row) => LEAD_SOURCE_LABELS[row.source] || row.source,
                },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={Object.entries(data?.leads?.bySource || {}).map(([source, count]) => ({
                source,
                count,
              }))}
              empty="No leads."
            />
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-title">New leads over time</h3>
          <p className="mb-2 text-xs text-secondary">By {data?.period?.bucket || "month"} in selected period</p>
          <CountBars rows={data?.leads?.series || data?.leads?.byMonth || []} valueKey="count" />
        </div>
      </section>

      {/* Customers & motors */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Customers & motors</h2>
        <div className="mb-4 flex flex-wrap gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <span className="text-xs text-secondary">Avg motors per customer</span>
            <p className="text-xl font-semibold tabular-nums text-title">
              {data?.customers?.avgMotorsPerCustomer ?? "—"}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-title">Top customers by motor count</h3>
          <ReportTable
            columns={[
              { key: "name", label: "Customer" },
              { key: "motorCount", label: "Motors", align: "right" },
            ]}
            rows={data?.customers?.topByMotors || []}
            empty="No motors linked to customers."
          />
        </div>
      </section>

      {/* Quotes */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Quotes</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Pipeline value (excl. rejected & R&R)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-title">
              {fmt(data?.quotes?.pipelineValueExRejected ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Approved quote value</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmt(data?.quotes?.approvedValue ?? 0)}
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">By status</h3>
            <ReportTable
              columns={[
                { key: "label", label: "Status" },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={quoteStatusRows}
              empty="No quotes."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">Top customers by quote count</h3>
            <ReportTable
              columns={[
                { key: "name", label: "Customer" },
                { key: "quoteCount", label: "Quotes", align: "right" },
              ]}
              rows={data?.quotes?.topCustomersByQuotes || []}
              empty="No quotes with customers."
            />
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-title">Quotes over time</h3>
          <p className="mb-2 text-xs text-secondary">Dollar value created per period (bar height)</p>
          <MiniBars rows={data?.quotes?.series || data?.quotes?.byMonth || []} valueKey="value" fmt={fmt} />
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-title">Quotes by period</h3>
          <p className="mb-3 text-xs text-secondary">Count and value by period</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-border text-secondary">
                  <th className="py-2 text-left text-xs font-medium uppercase">Period</th>
                  <th className="py-2 text-right text-xs font-medium uppercase">Count</th>
                  <th className="py-2 text-right text-xs font-medium uppercase">Value</th>
                </tr>
              </thead>
              <tbody>
                {(data?.quotes?.series || data?.quotes?.byMonth || []).map((r) => (
                  <tr key={r.key || r.month} className="border-b border-border/60">
                    <td className="py-2">{formatSeriesRow(r)}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Work orders */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Work orders</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">By status</h3>
            <ReportTable
              columns={[
                { key: "status", label: "Status" },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={data?.workOrders?.byStatus || []}
              empty="No work orders."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold text-title">Created over time</h3>
            <CountBars rows={data?.workOrders?.series || data?.workOrders?.byMonth || []} valueKey="count" />
          </div>
        </div>
      </section>

      {/* Invoices / AR */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Invoices & AR</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Total billed</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">
              {fmt(data?.invoices?.totalBilled ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Collected</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmt(data?.invoices?.totalCollected ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Outstanding AR</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {fmt(data?.invoices?.outstandingAR ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Open overdue</p>
            <p className="mt-0.5 text-[11px] leading-tight text-secondary">
              Past {data?.invoices?.overdueTermsLabel ?? "payment terms"} (Settings → Accounts)
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-red-700 dark:text-red-400">
              {data?.invoices?.overdueOpenCount ?? 0}
            </p>
          </div>
          <Link
            href="/dashboard/accounts-receivable"
            className="flex min-h-[88px] items-center rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Open accounts receivable →
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">By invoice status</h3>
            <ReportTable
              columns={[
                {
                  key: "status",
                  label: "Status",
                  render: (slug) => invoiceStatusLabel(slug) || slug,
                },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={Object.entries(data?.invoices?.byStatus || {}).map(([status, count]) => ({
                status,
                count,
              }))}
              empty="No invoices."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">Top customers by billed</h3>
            <ReportTable
              columns={[
                { key: "name", label: "Customer" },
                {
                  key: "billed",
                  label: "Billed",
                  align: "right",
                  render: (v) => fmt(v),
                },
              ]}
              rows={data?.invoices?.topCustomersByBilled || []}
              empty="No invoice revenue by customer."
            />
          </div>
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-title">Invoices over time</h3>
          <p className="mb-2 text-xs text-secondary">Amount billed per period (bar height)</p>
          <MiniBars rows={data?.invoices?.series || data?.invoices?.byMonth || []} valueKey="billed" fmt={fmt} />
        </div>
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-semibold text-title">Invoices by period</h3>
          <p className="mb-3 text-xs text-secondary">Invoice count and billed amount by period</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[360px] text-sm">
              <thead>
                <tr className="border-b border-border text-secondary">
                  <th className="py-2 text-left text-xs font-medium uppercase">Period</th>
                  <th className="py-2 text-right text-xs font-medium uppercase">Count</th>
                  <th className="py-2 text-right text-xs font-medium uppercase">Billed</th>
                </tr>
              </thead>
              <tbody>
                {(data?.invoices?.series || data?.invoices?.byMonth || []).map((r) => (
                  <tr key={r.key || r.month} className="border-b border-border/60">
                    <td className="py-2">{formatSeriesRow(r)}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                    <td className="py-2 text-right tabular-nums">{fmt(r.billed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Purchase orders / AP */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Purchase orders & AP</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">PO order total</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">
              {fmt(data?.purchaseOrders?.totalOrderValue ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Vendor invoiced</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{fmt(data?.purchaseOrders?.vendorInvoiced ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Paid to vendors</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmt(data?.purchaseOrders?.vendorPaid ?? 0)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Balance due vendors</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {fmt(data?.purchaseOrders?.balanceDueVendors ?? 0)}
            </p>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">PO by status</h3>
            <ReportTable
              columns={[
                { key: "status", label: "Status" },
                { key: "count", label: "Count", align: "right" },
              ]}
              rows={data?.purchaseOrders?.byStatus || []}
              empty="No purchase orders."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">Top vendors by PO value</h3>
            <ReportTable
              columns={[
                { key: "name", label: "Vendor" },
                {
                  key: "orderTotal",
                  label: "Order total",
                  align: "right",
                  render: (v) => fmt(v),
                },
              ]}
              rows={data?.purchaseOrders?.topVendorsByPOValue || []}
              empty="No POs with vendors."
            />
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/accounts-payable"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Accounts payable →
          </Link>
        </div>
      </section>

      {/* Inventory */}
      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-title">
          <FiPackage className="h-5 w-5 text-secondary" aria-hidden />
          Inventory
        </h2>
        <p className="mb-4 text-sm text-secondary">
          Stock snapshot (not filtered by the report period except &ldquo;New SKUs&rdquo;). Reserved qty is tied to open
          work orders from quotes until the job is marked Shipped.
        </p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">SKUs</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">
              {data?.inventory?.skuCount ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">On hand (total units)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">
              {data?.inventory?.totalOnHand ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Reserved</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{data?.inventory?.totalReserved ?? 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Available</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {data?.inventory?.totalAvailable ?? 0}
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Low stock (at/below threshold)</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {data?.inventory?.lowStockCount ?? 0}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">
              {data?.period?.allTime ? "Total SKUs (all time)" : "New SKUs in period"}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">
              {data?.inventory?.skusCreatedInPeriod ?? 0}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <Link href="/dashboard/inventory" className="inline-flex text-sm font-medium text-primary hover:underline">
            Open inventory →
          </Link>
        </div>
      </section>

      {/* Sales commission */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-title">Sales commission</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Total commission amount</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-title">{fmt(commissionTotalAmount)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Unpaid amount</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-amber-700 dark:text-amber-400">
              {fmt(commissionUnpaidAmount)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-secondary">Paid amount</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {fmt(commissionPaidAmount)}
            </p>
          </div>
          <Link
            href="/dashboard/sales-commission"
            className="flex min-h-[88px] items-center rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-medium text-primary hover:bg-primary/10"
          >
            Open sales commission →
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">Unpaid records</h3>
            <ReportTable
              columns={[
                {
                  key: "jobNumber",
                  label: "Job#",
                  render: (_, row) => row.jobNumber || row.rfqNumber || "—",
                },
                { key: "salesPersonName", label: "Sales person" },
                { key: "amount", label: "Amount", align: "right", render: (v) => fmt(v || 0) },
              ]}
              rows={commissionUnpaidRows}
              empty="No unpaid commission records."
            />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold text-title">Paid records</h3>
            <ReportTable
              columns={[
                {
                  key: "jobNumber",
                  label: "Job#",
                  render: (_, row) => row.jobNumber || row.rfqNumber || "—",
                },
                { key: "salesPersonName", label: "Sales person" },
                { key: "amount", label: "Amount", align: "right", render: (v) => fmt(v || 0) },
                {
                  key: "paidAt",
                  label: "Paid date",
                  render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
                },
              ]}
              rows={commissionPaidRows}
              empty="No paid commission records."
            />
          </div>
        </div>
      </section>
    </div>
  );
}
