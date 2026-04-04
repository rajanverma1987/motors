"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  FiInbox,
  FiUsers,
  FiPackage,
  FiFileText,
  FiClipboard,
  FiDollarSign,
  FiTrendingUp,
  FiCreditCard,
  FiTruck,
  FiShoppingCart,
  FiUserPlus,
  FiExternalLink,
  FiLayers,
} from "react-icons/fi";
import { useUserSettings } from "@/contexts/user-settings-context";
import { formatMoney } from "@/lib/format-currency";
import { normalizeInvoiceStatusSlug, INVOICE_STATUS_OPTIONS } from "@/lib/invoice-status";
import DashboardPeriodFilter from "@/components/dashboard/dashboard-period-filter";
import { isOpenInvoiceOverdueForTerms } from "@/lib/accounts-payment-terms";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { poBalanceDue, latestVendorInvoiceDate, daysSinceApAnchor } from "@/lib/po-payable";

const LEAD_STATUS_LABELS = { new: "New", contacted: "Contacted", quoted: "Quoted", won: "Won", lost: "Lost" };
const QUOTE_STATUS_LABELS = { draft: "Draft", sent: "Sent", approved: "Approved", rejected: "Rejected", rnr: "RNR" };
const PO_STATUS_LABELS = {
  open: "Open",
  "partially invoiced": "Partially invoiced",
  "fully invoiced": "Fully invoiced",
  "partially paid": "Partially paid",
  closed: "Closed",
};

const ENDPOINTS = [
  { key: "leads", url: "/api/dashboard/leads", href: "/dashboard/leads", label: "Leads", icon: FiInbox, statusKey: "status", statusLabels: LEAD_STATUS_LABELS },
  { key: "customers", url: "/api/dashboard/customers", href: "/dashboard/customers", label: "Customers", icon: FiUsers },
  { key: "motors", url: "/api/dashboard/motors", href: "/dashboard/motors", label: "Customer's motors", icon: FiPackage },
  { key: "quotes", url: "/api/dashboard/quotes", href: "/dashboard/quotes", label: "Quotes", icon: FiFileText, statusKey: "status", statusLabels: QUOTE_STATUS_LABELS },
  { key: "vendors", url: "/api/dashboard/vendors", href: "/dashboard/vendors", label: "Vendors", icon: FiTruck },
  { key: "purchaseOrders", url: "/api/dashboard/purchase-orders", href: "/dashboard/purchase-orders", label: "Purchase orders", icon: FiShoppingCart, statusKey: "status", statusLabels: PO_STATUS_LABELS },
  { key: "employees", url: "/api/dashboard/employees", href: "/dashboard/employees", label: "Employees", icon: FiUserPlus },
];

function countByStatus(items, statusKey, labels) {
  const out = {};
  if (!labels) return out;
  Object.keys(labels).forEach((k) => {
    out[k] = 0;
  });
  if (!Array.isArray(items)) return out;
  items.forEach((item) => {
    const s = (item[statusKey] || "").toLowerCase().trim();
    if (s && out[s] !== undefined) out[s]++;
    else if (s && out[s] === undefined) out[s] = 1;
  });
  return out;
}

function countInvoiceBySlug(items) {
  const out = {};
  INVOICE_STATUS_OPTIONS.forEach((o) => {
    out[o.value] = 0;
  });
  if (!Array.isArray(items)) return out;
  items.forEach((inv) => {
    const slug = normalizeInvoiceStatusSlug(inv.status);
    if (out[slug] !== undefined) out[slug]++;
  });
  return out;
}

function workOrderStatusBreakdown(items) {
  const m = new Map();
  if (!Array.isArray(items)) return [];
  for (const w of items) {
    const s = (w.status || "Unknown").trim() || "Unknown";
    m.set(s, (m.get(s) || 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, n]) => ({ label, value: n }));
}

function accountsPayableFromPOs(poList) {
  if (!Array.isArray(poList)) {
    return { openCount: 0, lines: [], outstanding: 0, overdueCount: 0, outstandingCount: 0 };
  }
  const open = poList.filter((po) => String(po.status || "").toLowerCase() !== "closed");
  const by = new Map();
  for (const po of open) {
    const s = po.status || "Open";
    by.set(s, (by.get(s) || 0) + 1);
  }
  const lines = [...by.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, n]) => ({ label, value: n }));

  let outstanding = 0;
  let overdueCount = 0;
  let outstandingCount = 0;
  for (const po of poList) {
    const bal = poBalanceDue(po);
    if (bal > 0.009) {
      outstandingCount++;
      outstanding += bal;
      const invDate = latestVendorInvoiceDate(po);
      const days = daysSinceApAnchor(invDate, po.createdAt);
      if (days != null && days > 30) overdueCount++;
    }
  }
  outstanding = Math.round(outstanding * 100) / 100;

  return { openCount: open.length, lines, outstanding, overdueCount, outstandingCount };
}

function CardLoadingBody() {
  return (
    <div className="mt-3 flex min-h-[4.5rem] items-start gap-3" role="status" aria-live="polite" aria-label="Loading">
      <span
        className="inline-block h-9 w-9 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2 pt-0.5">
        <div className="h-7 w-3/5 max-w-[7rem] animate-pulse rounded-md bg-muted" />
        <div className="h-3 w-4/5 max-w-[9rem] animate-pulse rounded bg-muted/70" />
        <div className="h-3 w-2/5 max-w-[5rem] animate-pulse rounded bg-muted/50" />
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  count,
  /** When set, shown as the large headline instead of numeric `count` (e.g. formatted currency). */
  primaryValue,
  /** Small line under the headline (e.g. outstanding item count). */
  primaryHint,
  icon: Icon,
  placeholder,
  byStatus,
  statusLabels,
  extraLines,
  loading,
}) {
  const statusEntries = useMemo(() => {
    if (!statusLabels) return [];
    return Object.entries(statusLabels).map(([key, lab]) => [lab, (byStatus && byStatus[key]) ?? 0]);
  }, [byStatus, statusLabels]);

  const showMain = !placeholder && count != null && !loading;
  const showPrimary = !placeholder && primaryValue != null && String(primaryValue).length > 0 && !loading;
  const showLoading = loading && !placeholder;

  return (
    <Link
      href={href}
      aria-busy={showLoading || undefined}
      className="flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-secondary">{label}</span>
        <Icon className={`h-5 w-5 shrink-0 text-secondary ${showLoading ? "opacity-40" : ""}`} aria-hidden />
      </div>
      {showLoading ? (
        <CardLoadingBody />
      ) : (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-title leading-tight">
            {placeholder ? "—" : showPrimary ? primaryValue : showMain ? Number(count) : "—"}
          </p>
          {primaryHint && !placeholder && (showPrimary || showMain) && (
            <p className="mt-1 text-xs font-medium text-secondary">{primaryHint}</p>
          )}
          {extraLines && extraLines.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-border pt-2">
              {extraLines.map((row) => (
                <li key={row.label} className="flex justify-between gap-2 text-xs text-secondary">
                  <span>{row.label}</span>
                  <span className="shrink-0 tabular-nums text-title">{row.value}</span>
                </li>
              ))}
            </ul>
          )}
          {statusEntries.length > 0 && (
            <ul className="mt-2 space-y-0.5 border-t border-border pt-2">
              {statusEntries.map(([statusLabel, n]) => (
                <li key={statusLabel} className="flex justify-between gap-2 text-xs text-secondary">
                  <span>{statusLabel}</span>
                  <span className="tabular-nums text-title">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <span className="mt-auto pt-2 inline-flex items-center gap-1 text-xs text-primary">
        {placeholder && <span className="text-secondary">Coming soon · </span>}
        View
        <FiExternalLink className="h-3 w-3" aria-hidden />
      </span>
    </Link>
  );
}

function itemInCreatedRange(item, range) {
  if (!range) return true;
  const t = item?.createdAt ? new Date(item.createdAt).getTime() : NaN;
  if (!Number.isFinite(t)) return false;
  return t >= range.from.getTime() && t <= range.to.getTime();
}

function arRowInInvoiceDateRange(row, range) {
  if (!range) return true;
  if (!row?.date) return false;
  const t = new Date(String(row.date).slice(0, 10) + "T12:00:00").getTime();
  if (!Number.isFinite(t)) return false;
  return t >= range.from.getTime() && t <= range.to.getTime();
}

export default function DashboardPage() {
  const { settings } = useUserSettings();
  const arTermsSlug = settings?.accountsPaymentTerms || "net30";
  const arTermsDisplay = accountsPaymentTermsLabel(arTermsSlug);
  const currency = settings?.currency || "USD";
  const fmt = (n) => formatMoney(n, currency);
  const fmtK = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return "—";
    const locale = currency === "INR" ? "en-IN" : undefined;
    try {
      return (
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          currencyDisplay: "narrowSymbol",
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }).format(num / 1000) + "K"
      );
    } catch {
      return fmt(num);
    }
  };

  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodRange, setPeriodRange] = useState(null);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    const epData = {};
    try {
      const results = await Promise.all([
        ...ENDPOINTS.map(async (ep) => {
          const res = await fetch(ep.url, { credentials: "include", cache: "no-store" });
          const data = await res.json();
          return { ep, ok: res.ok, data };
        }),
        fetch("/api/dashboard/work-orders", { credentials: "include", cache: "no-store" }).then(
          async (res) => ({ kind: "wo", ok: res.ok, data: await res.json() })
        ),
        fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }).then(
          async (res) => ({ kind: "inv", ok: res.ok, data: await res.json() })
        ),
        fetch("/api/dashboard/accounts-receivable?include=open", {
          credentials: "include",
          cache: "no-store",
        }).then(async (res) => ({ kind: "ar", ok: res.ok, data: await res.json() })),
        fetch("/api/dashboard/inventory/summary", {
          credentials: "include",
          cache: "no-store",
        }).then(async (res) => ({ kind: "invSum", ok: res.ok, data: await res.json() })),
        fetch("/api/dashboard/sales-commissions", {
          credentials: "include",
          cache: "no-store",
        }).then(async (res) => ({ kind: "comm", ok: res.ok, data: await res.json() })),
      ]);

      let woData = [];
      let invData = [];
      let arPayload = { rows: [], summary: {} };
      let invSummary = {
        totalSkus: 0,
        totalOnHand: 0,
        totalReserved: 0,
        totalAvailable: 0,
        lowStockCount: 0,
      };
      let commList = [];

      for (const r of results) {
        if (r.ep) {
          const { ep, ok, data } = r;
          epData[ep.key] = ok && Array.isArray(data) ? data : [];
        } else if (r.kind === "wo" && r.ok && Array.isArray(r.data)) woData = r.data;
        else if (r.kind === "inv" && r.ok && Array.isArray(r.data)) invData = r.data;
        else if (r.kind === "ar" && r.ok && r.data && typeof r.data === "object") {
          arPayload = {
            rows: Array.isArray(r.data.rows) ? r.data.rows : [],
            summary: r.data.summary || {},
          };
        } else if (r.kind === "invSum" && r.ok && r.data && typeof r.data === "object") {
          invSummary = {
            totalSkus: Number(r.data.totalSkus) || 0,
            totalOnHand: Number(r.data.totalOnHand) || 0,
            totalReserved: Number(r.data.totalReserved) || 0,
            totalAvailable: Number(r.data.totalAvailable) || 0,
            lowStockCount: Number(r.data.lowStockCount) || 0,
          };
        } else if (r.kind === "comm" && r.ok && r.data && typeof r.data === "object") {
          commList = Array.isArray(r.data.commissions) ? r.data.commissions : [];
        }
      }

      setRaw({ epData, woData, invData, arPayload, invSummary, commList });
    } catch {
      setRaw(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const { counts, byStatus, extra } = useMemo(() => {
    if (!raw) {
      return {
        counts: {},
        byStatus: {},
        extra: {
          workOrders: { total: 0, lines: [] },
          invoices: { total: 0, bySlug: {} },
          ar: { openCount: 0, outstanding: 0, overdue: 0 },
          ap: { openCount: 0, lines: [], outstanding: 0, overdueCount: 0, outstandingCount: 0 },
          inventory: {
            totalSkus: 0,
            totalOnHand: 0,
            totalReserved: 0,
            totalAvailable: 0,
            lowStockCount: 0,
          },
          commissions: {
            total: 0,
            paidCount: 0,
            unpaidCount: 0,
            totalAmount: 0,
            unpaidAmount: 0,
          },
          quotes: {
            totalAmount: 0,
          },
        },
      };
    }
    const range = periodRange;
    const nextCounts = {};
    const nextByStatus = {};
    let poList = [];

    for (const ep of ENDPOINTS) {
      const arr = (raw.epData[ep.key] || []).filter((x) => itemInCreatedRange(x, range));
      nextCounts[ep.key] = arr.length;
      if (ep.key === "purchaseOrders") poList = arr;
      if (ep.statusKey && ep.statusLabels) {
        nextByStatus[ep.key] = countByStatus(arr, ep.statusKey, ep.statusLabels);
      }
    }
    const quotesAmount =
      Math.round(
        ((raw.epData.quotes || [])
          .filter((x) => itemInCreatedRange(x, range))
          .reduce((sum, q) => {
            const labor = Number(q?.laborTotal) || 0;
            const parts = Number(q?.partsTotal) || 0;
            return sum + labor + parts;
          }, 0)) * 100
      ) / 100;

    const woList = raw.woData.filter((x) => itemInCreatedRange(x, range));
    const invList = raw.invData.filter((x) => itemInCreatedRange(x, range));
    const commList = (raw.commList || []).filter((x) => itemInCreatedRange(x, range));

    let arBlock;
    if (range) {
      const arFiltered = raw.arPayload.rows.filter((row) => arRowInInvoiceDateRange(row, range));
      const totalOutstanding =
        Math.round(arFiltered.reduce((s, r) => s + (Number(r.balance) || 0), 0) * 100) / 100;
      arBlock = {
        openCount: arFiltered.length,
        outstanding: totalOutstanding,
        overdue: arFiltered.filter((r) =>
          isOpenInvoiceOverdueForTerms(r.daysOutstanding, arTermsSlug)
        ).length,
      };
    } else {
      const s = raw.arPayload.summary || {};
      arBlock = {
        openCount: Number(s.openCount) || 0,
        outstanding: Number(s.totalOutstanding) || 0,
        overdue: Number(s.overdueCount) || 0,
      };
    }

    return {
      counts: nextCounts,
      byStatus: nextByStatus,
      extra: {
        workOrders: {
          total: woList.length,
          lines: workOrderStatusBreakdown(woList),
        },
        invoices: {
          total: invList.length,
          bySlug: countInvoiceBySlug(invList),
        },
        ar: arBlock,
        ap: accountsPayableFromPOs(poList),
        inventory: raw.invSummary || {
          totalSkus: 0,
          totalOnHand: 0,
          totalReserved: 0,
          totalAvailable: 0,
          lowStockCount: 0,
        },
        commissions: {
          total: commList.length,
          paidCount: commList.filter((r) => String(r.status || "").toLowerCase() === "paid").length,
          unpaidCount: commList.filter((r) => String(r.status || "").toLowerCase() !== "paid").length,
          totalAmount: Math.round(
            commList.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100
          ) / 100,
          unpaidAmount:
            Math.round(
              commList
                .filter((r) => String(r.status || "").toLowerCase() !== "paid")
                .reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100
            ) / 100,
        },
        quotes: {
          totalAmount: quotesAmount,
        },
      },
    };
  }, [raw, periodRange, arTermsSlug]);

  const invoiceStatusEntries = useMemo(
    () =>
      INVOICE_STATUS_OPTIONS.map((o) => ({
        label: o.label,
        value: extra.invoices.bySlug[o.value] ?? 0,
      })),
    [extra.invoices.bySlug]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto bg-bg">
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title">Dashboard</h1>
            <p className="mt-1 text-sm text-secondary">
              Overview of your CRM. Filter by period (created date). AR uses invoice date on open items.
            </p>
          </div>
          <Link
            href="/list-your-electric-motor-services"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get more visibility
            <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>

        <DashboardPeriodFilter
          onRangeChange={setPeriodRange}
          note={
            periodRange
              ? "Counts use created date in this range. Accounts receivable uses invoice date on open items."
              : undefined
          }
        />

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">
            Summary
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ENDPOINTS.map(({ key, href, label, icon, statusLabels }) => (
              <StatCard
                key={key}
                href={href}
                label={label}
                count={loading ? undefined : counts[key]}
                primaryValue={
                  key === "quotes" && !loading ? fmtK(extra.quotes.totalAmount) : undefined
                }
                primaryHint={
                  key === "quotes" && !loading
                    ? `${counts[key] || 0} quote${(counts[key] || 0) === 1 ? "" : "s"}`
                    : undefined
                }
                icon={icon}
                placeholder={false}
                byStatus={byStatus[key]}
                statusLabels={statusLabels}
                loading={loading}
              />
            ))}
            <StatCard
              href="/dashboard/work-orders"
              label="Work orders"
              count={loading ? undefined : extra.workOrders.total}
              icon={FiClipboard}
              placeholder={false}
              extraLines={extra.workOrders.lines.map((r) => ({
                label: r.label,
                value: r.value,
              }))}
              loading={loading}
            />
            <StatCard
              href="/dashboard/invoices"
              label="Invoices"
              count={loading ? undefined : extra.invoices.total}
              icon={FiDollarSign}
              placeholder={false}
              extraLines={invoiceStatusEntries.map((r) => ({
                label: r.label,
                value: r.value,
              }))}
              loading={loading}
            />
            <StatCard
              href="/dashboard/accounts-receivable"
              label="Accounts receivable"
              count={loading ? undefined : extra.ar.openCount}
              primaryValue={loading ? undefined : fmt(extra.ar.outstanding)}
              primaryHint={
                loading
                  ? undefined
                  : `${extra.ar.openCount} invoice${extra.ar.openCount === 1 ? "" : "s"} with balance`
              }
              icon={FiTrendingUp}
              placeholder={false}
              extraLines={[
                {
                  label: `Overdue (past ${arTermsDisplay})`,
                  value: String(extra.ar.overdue),
                },
              ]}
              loading={loading}
            />
            <StatCard
              href="/dashboard/accounts-payable"
              label="Accounts payable"
              count={loading ? undefined : extra.ap.outstandingCount}
              primaryValue={loading ? undefined : fmt(extra.ap.outstanding)}
              primaryHint={
                loading
                  ? undefined
                  : `${extra.ap.outstandingCount} PO${extra.ap.outstandingCount === 1 ? "" : "s"} with balance due`
              }
              icon={FiCreditCard}
              placeholder={false}
              extraLines={(() => {
                const rows = [];
                if (extra.ap.overdueCount > 0) {
                  rows.push({
                    label: "Overdue (30+ days)",
                    value: String(extra.ap.overdueCount),
                  });
                }
                rows.push({
                  label: "Open POs (not closed)",
                  value: extra.ap.openCount === 0 ? "—" : String(extra.ap.openCount),
                });
                if (extra.ap.openCount > 0) {
                  rows.push(...extra.ap.lines.map((r) => ({ label: r.label, value: r.value })));
                }
                return rows;
              })()}
              loading={loading}
            />
            <StatCard
              href="/dashboard/sales-commission"
              label="Sales commission"
              count={loading ? undefined : extra.commissions.total}
              primaryValue={loading ? undefined : fmt(extra.commissions.unpaidAmount)}
              primaryHint={
                loading
                  ? undefined
                  : `${extra.commissions.unpaidCount} unpaid entr${extra.commissions.unpaidCount === 1 ? "y" : "ies"}`
              }
              icon={FiDollarSign}
              placeholder={false}
              extraLines={[
                { label: "Unpaid", value: String(extra.commissions.unpaidCount) },
                { label: "Paid", value: String(extra.commissions.paidCount) },
              ]}
              loading={loading}
            />
            <StatCard
              href="/dashboard/inventory"
              label="Inventory"
              primaryValue={loading ? undefined : String(extra.inventory.totalAvailable)}
              primaryHint={
                loading
                  ? undefined
                  : `${extra.inventory.totalSkus} SKU(s) · on hand ${extra.inventory.totalOnHand}`
              }
              icon={FiLayers}
              placeholder={false}
              extraLines={[
                { label: "Reserved (open WOs)", value: String(extra.inventory.totalReserved) },
                {
                  label: "Low stock (≤ threshold)",
                  value: String(extra.inventory.lowStockCount),
                },
              ]}
              loading={loading}
            />
          </div>
          <p className="mt-3 text-xs text-secondary">
            Accounts receivable: headline is amount outstanding; subtitle is count of open invoices with a balance.
            Accounts payable: headline is balance due; subtitle is count of POs with vendor balance due. Open POs /
            status rows are POs not in Closed status (created in period). Overdue AP uses 30+ days since latest vendor
            invoice (or PO created date if none).
          </p>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiInbox className="h-4 w-4" aria-hidden />
              Enter lead
            </Link>
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiUsers className="h-4 w-4" aria-hidden />
              Add customer
            </Link>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiFileText className="h-4 w-4" aria-hidden />
              Create quote
            </Link>
            <Link
              href="/dashboard/motors"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiPackage className="h-4 w-4" aria-hidden />
              Add motor
            </Link>
            <Link
              href="/dashboard/work-orders"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiClipboard className="h-4 w-4" aria-hidden />
              Work orders
            </Link>
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiDollarSign className="h-4 w-4" aria-hidden />
              Invoices
            </Link>
            <Link
              href="/dashboard/inventory"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:border-primary/30 hover:bg-primary/10"
            >
              <FiLayers className="h-4 w-4" aria-hidden />
              Inventory
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
