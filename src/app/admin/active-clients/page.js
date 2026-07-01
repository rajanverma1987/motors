"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiEye, FiCreditCard, FiMail } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";

function formatDateTime(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function subscriptionStateVariant(state) {
  if (state === "active" || state === "trialing") return "success";
  if (state === "past_due") return "warning";
  if (state === "cancelled" || state === "suspended") return "danger";
  return "default";
}

function ClientDetailModal({ client, open, onClose }) {
  if (!client) return null;
  const s = client.subscriptionSummary;
  const fields = [
    { label: "Email", value: client.email },
    { label: "Shop name", value: client.shopName || "—" },
    { label: "Contact name", value: client.contactName || "—" },
    { label: "Last login", value: formatDateTime(client.lastLoginAt) },
    {
      label: "Account type",
      value: client.calculatorOnlyAccount
        ? "Calculators only"
        : client.listingOnlyAccount
          ? "Directory listing"
          : "Full CRM",
    },
    {
      label: "Subscription",
      value: s ? `${s.planName} · ${s.internalState}${s.revoked ? " (revoked)" : ""}` : "—",
    },
    {
      label: "Login access",
      value: (
        <Badge variant={client.canLogin ? "success" : "danger"}>
          {client.canLogin ? "Can login" : "Revoked"}
        </Badge>
      ),
    },
    { label: "Registered", value: formatDateTime(client.createdAt) },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Client details" size="md">
      <div className="space-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export default function AdminActiveClientsPage() {
  const toast = useToast();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewClient, setViewClient] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [sendingEmailId, setSendingEmailId] = useState(null);

  const openManageSubscription = useCallback(
    (row) => {
      if (!row?.id) return;
      try {
        sessionStorage.setItem("adminOpenSubUserId", row.id);
      } catch (_) {}
      router.push("/admin/clients");
    },
    [router]
  );

  const sendFeedbackEmail = useCallback(
    async (row) => {
      if (!row?.id || sendingEmailId) return;
      setSendingEmailId(row.id);
      try {
        const res = await fetch(`/api/admin/users/${row.id}/feedback-outreach`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send email");
        toast.success(`Feedback email sent to ${data.email || row.email}.`);
      } catch (e) {
        toast.error(e.message || "Failed to send email");
      } finally {
        setSendingEmailId(null);
      }
    },
    [toast, sendingEmailId]
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const res = await fetch(`/api/admin/users/active?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load active clients");
      setUsers(
        (data.users || []).map((u) => ({
          ...u,
          _onView: () => setViewClient(u),
          _onManageSub: () => openManageSubscription(u),
          _onSendEmail: () => sendFeedbackEmail(u),
        }))
      );
      setTotalCount(Number(data.totalCount) || 0);
    } catch (e) {
      toast.error(e.message || "Failed to load active clients");
      setUsers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, searchQuery, openManageSubscription, sendFeedbackEmail]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = [
    {
      key: "view",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => row._onView?.()}
          className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="View"
        >
          <FiEye className="h-4 w-4" />
        </button>
      ),
    },
    {
      key: "subManage",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => row._onManageSub?.()}
          className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Manage subscription"
          title="Subscription"
        >
          <FiCreditCard className="h-4 w-4" />
        </button>
      ),
    },
    {
      key: "emailAction",
      label: "",
      render: (_, row) => {
        const busy = sendingEmailId === row.id;
        return (
          <button
            type="button"
            onClick={() => row._onSendEmail?.()}
            disabled={busy || !!sendingEmailId}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send feedback email"
            title="Send feedback & subscription email"
          >
            <FiMail className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
          </button>
        );
      },
    },
    { key: "email", label: "Email" },
    { key: "shopName", label: "Shop name" },
    { key: "contactName", label: "Contact name" },
    {
      key: "lastLoginAt",
      label: "Last login",
      render: (val) => formatDateTime(val),
    },
    {
      key: "subscriptionSummary",
      label: "Subscription",
      render: (s) =>
        s ? (
          <div className="flex flex-col gap-1 text-xs">
            <span className="text-title">{s.planName}</span>
            <Badge variant={subscriptionStateVariant(s.internalState)} className="w-fit rounded-full px-2.5 py-0.5 text-xs">
              {s.internalState}
            </Badge>
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "accountType",
      label: "Account",
      render: (_, row) => {
        if (row.calculatorOnlyAccount) {
          return (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              Calculators
            </Badge>
          );
        }
        if (row.listingOnlyAccount) {
          return (
            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
              Listing
            </Badge>
          );
        }
        return (
          <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
            CRM
          </Badge>
        );
      },
    },
    {
      key: "createdAt",
      label: "Registered",
      render: (val) => (val ? new Date(val).toLocaleDateString() : "—"),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Active clients</h1>
        <p className="text-sm text-secondary">
          Shops that have signed in to the portal at least once. Sorted by most recent login. Clients appear here
          after their next login if they registered before this was tracked.
        </p>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={users}
          rowKey="id"
          loading={loading}
          emptyMessage="No clients have logged in yet."
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search email, shop, contact…"
          responsive
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
        />
      </div>

      <ClientDetailModal client={viewClient} open={!!viewClient} onClose={() => setViewClient(null)} />
    </div>
  );
}
