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
} from "react-icons/fi";

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
  { key: "motors", url: "/api/dashboard/motors", href: "/dashboard/motors", label: "Motor assets", icon: FiPackage },
  { key: "quotes", url: "/api/dashboard/quotes", href: "/dashboard/quotes", label: "Quotes", icon: FiFileText, statusKey: "status", statusLabels: QUOTE_STATUS_LABELS },
  { key: "vendors", url: "/api/dashboard/vendors", href: "/dashboard/vendors", label: "Vendors", icon: FiTruck },
  { key: "purchaseOrders", url: "/api/dashboard/purchase-orders", href: "/dashboard/purchase-orders", label: "Purchase orders", icon: FiShoppingCart, statusKey: "status", statusLabels: PO_STATUS_LABELS },
  { key: "employees", url: "/api/dashboard/employees", href: "/dashboard/employees", label: "Employees", icon: FiUserPlus },
];

const PLACEHOLDER_ITEMS = [
  { key: "workOrders", href: "/dashboard/work-orders", label: "Work orders", icon: FiClipboard, placeholder: true },
  { key: "invoices", href: "/dashboard/invoices", label: "Invoices", icon: FiDollarSign, placeholder: true },
  { key: "accountsReceivable", href: "/dashboard/accounts-receivable", label: "Accounts receivable", icon: FiTrendingUp, placeholder: true },
  { key: "accountsPayable", href: "/dashboard/accounts-payable", label: "Accounts payable", icon: FiCreditCard, placeholder: true },
];

function countByStatus(items, statusKey, labels) {
  const out = {};
  if (!labels) return out;
  Object.keys(labels).forEach((k) => { out[k] = 0; });
  if (!Array.isArray(items)) return out;
  items.forEach((item) => {
    const s = (item[statusKey] || "").toLowerCase().trim();
    if (s && out[s] !== undefined) out[s]++;
    else if (s && !out[s]) out[s] = 1;
  });
  return out;
}

function StatCard({ href, label, count, icon: Icon, placeholder, byStatus, statusLabels }) {
  const statusEntries = useMemo(() => {
    if (!statusLabels) return [];
    return Object.entries(statusLabels).map(([key, lab]) => [lab, (byStatus && byStatus[key]) ?? 0]);
  }, [byStatus, statusLabels]);

  return (
    <Link
      href={href}
      className="flex flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-secondary">{label}</span>
        <Icon className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-title">
        {placeholder ? "—" : count != null ? Number(count) : "…"}
      </p>
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
      <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary">
        {placeholder && <span className="text-secondary">Coming soon · </span>}
        View
        <FiExternalLink className="h-3 w-3" aria-hidden />
      </span>
    </Link>
  );
}

export default function DashboardPage() {
  const [counts, setCounts] = useState({});
  const [byStatus, setByStatus] = useState({});
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    const nextCounts = {};
    const nextByStatus = {};
    await Promise.all(
      ENDPOINTS.map(async (ep) => {
        try {
          const res = await fetch(ep.url, { credentials: "include", cache: "no-store" });
          const data = await res.json();
          if (!res.ok || !Array.isArray(data)) {
            nextCounts[ep.key] = null;
            return;
          }
          nextCounts[ep.key] = data.length;
          if (ep.statusKey && ep.statusLabels) {
            nextByStatus[ep.key] = countByStatus(data, ep.statusKey, ep.statusLabels);
          }
        } catch {
          nextCounts[ep.key] = null;
        }
      })
    );
    setCounts(nextCounts);
    setByStatus(nextByStatus);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  return (
    <div className="min-h-screen bg-bg">
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title">Dashboard</h1>
            <p className="mt-1 text-sm text-secondary">
              Overview of your CRM. Use the sidebar to open each section.
            </p>
          </div>
          <Link
            href="/list-your-electric-motor-services"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get more visibility
            <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />
          </Link>
        </div>

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
                icon={icon}
                placeholder={false}
                byStatus={byStatus[key]}
                statusLabels={statusLabels}
              />
            ))}
            {PLACEHOLDER_ITEMS.map(({ key, href, label, icon }) => (
              <StatCard
                key={key}
                href={href}
                label={label}
                count={null}
                icon={icon}
                placeholder
              />
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-secondary">
            Quick actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:bg-primary/10 hover:border-primary/30"
            >
              <FiInbox className="h-4 w-4" aria-hidden />
              Enter lead
            </Link>
            <Link
              href="/dashboard/customers"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:bg-primary/10 hover:border-primary/30"
            >
              <FiUsers className="h-4 w-4" aria-hidden />
              Add customer
            </Link>
            <Link
              href="/dashboard/quotes"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:bg-primary/10 hover:border-primary/30"
            >
              <FiFileText className="h-4 w-4" aria-hidden />
              Create quote
            </Link>
            <Link
              href="/dashboard/motors"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-title hover:bg-primary/10 hover:border-primary/30"
            >
              <FiPackage className="h-4 w-4" aria-hidden />
              Add motor
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
