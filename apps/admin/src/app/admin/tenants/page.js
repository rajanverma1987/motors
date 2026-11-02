"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCreditCard, FiExternalLink } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import AdminTenantSubscriptionModal from "@/components/admin/AdminTenantSubscriptionModal";

function statusVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "success";
  if (s === "provisioning" || s === "pending") return "warning";
  if (s === "suspended" || s === "disabled" || s === "error") return "danger";
  return "default";
}

function subVariant(summary) {
  if (!summary) return "default";
  if (summary.revoked) return "danger";
  const s = String(summary.internalState || "").toLowerCase();
  if (s === "active" || s === "trialing") return "success";
  if (s === "past_due") return "warning";
  if (s === "cancelled" || s === "suspended" || s === "expired") return "danger";
  return "default";
}

function formatLastLogin(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Isolated client hosts + Open shop + assign subscription.
 */
export default function AdminTenantsPage() {
  const toast = useToast();
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [subTenant, setSubTenant] = useState(null);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tenants", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to load tenants");
        setTenants([]);
        return;
      }
      setError("");
      setTenants(data.tenants || []);
    } catch {
      setError("Failed to load tenants");
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  async function openShop(slug) {
    setBusy(slug);
    setError("");
    try {
      const res = await fetch("/api/admin/tenants/open-shop", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Open shop failed");
        toast.error(data.error || "Open shop failed");
        return;
      }
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Open shop failed");
      toast.error("Open shop failed");
    } finally {
      setBusy("");
    }
  }

  const columns = [
    {
      key: "actions",
      label: "Actions",
      render: (_val, row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openShop(row.slug)}
            disabled={busy === row.slug}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            aria-label="Open shop"
            title="Open shop"
          >
            <FiExternalLink className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSubTenant(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Assign subscription"
            title="Assign subscription"
          >
            <FiCreditCard className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    {
      key: "slug",
      label: "Slug",
      render: (val) => <span className="font-medium text-title">{val}</span>,
    },
    {
      key: "host",
      label: "Host",
      render: (val) =>
        val ? (
          <a
            href={`https://${val}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {val}
          </a>
        ) : (
          "—"
        ),
    },
    {
      key: "companyName",
      label: "Company",
      render: (val) => val || "—",
    },
    {
      key: "ownerEmail",
      label: "Owner",
      render: (val) => val || "—",
    },
    {
      key: "lastLoginAt",
      label: "Last login",
      render: (val) => formatLastLogin(val),
    },
    {
      key: "subscriptionSummary",
      label: "Subscription",
      render: (summary) => {
        if (!summary) {
          return (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              None
            </Badge>
          );
        }
        const label = summary.revoked
          ? `${summary.planName} · revoked`
          : `${summary.planName} · ${summary.internalState}`;
        return (
          <Badge variant={subVariant(summary)} className="rounded-full px-2.5 py-0.5 text-xs">
            {label}
          </Badge>
        );
      },
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={statusVariant(val)} className="rounded-full px-2.5 py-0.5 text-xs">
          {val || "—"}
        </Badge>
      ),
    },
    {
      key: "dnsStatus",
      label: "DNS",
      render: (val) => (
        <Badge variant={statusVariant(val)} className="rounded-full px-2.5 py-0.5 text-xs">
          {val || "—"}
        </Badge>
      ),
    },
    {
      key: "port",
      label: "Port",
      render: (val) => (val != null ? String(val) : "—"),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Tenants</h1>
        <p className="text-sm text-secondary">
          Isolated client hosts. Last login comes from each shop database. Open shop for support, or assign
          Trial / Free Ultimate / PayPal from the subscription action.
        </p>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={tenants}
          rowKey="slug"
          loading={loading}
          emptyMessage="No tenants yet. Run createCopy or provision-client."
          searchable
          searchPlaceholder="Search slug, host, company, owner…"
          responsive
        />
      </div>

      <AdminTenantSubscriptionModal
        tenant={subTenant}
        open={!!subTenant}
        onClose={() => setSubTenant(null)}
        onSaved={() => {
          loadTenants();
        }}
      />
    </div>
  );
}
