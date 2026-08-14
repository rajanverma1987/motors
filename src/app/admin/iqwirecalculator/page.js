"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEye, FiLock, FiSlash, FiUnlock } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

function formatDate(val) {
  if (!val) return "—";
  return new Date(val).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function typeVariant(type, banned) {
  if (banned) return "danger";
  if (type === "IQWireCalculator") return "success";
  if (type === "Trial") return "warning";
  if (type === "Past due") return "warning";
  if (type === "Cancelled" || type === "Expired") return "default";
  return "default";
}

function AccountDetailModal({ account, open, onClose }) {
  if (!account) return null;
  const fields = [
    { label: "Name", value: account.name || "—" },
    { label: "Email", value: account.email },
    { label: "Phone", value: account.phone || "—" },
    { label: "Country", value: account.country || "—" },
    { label: "Subscription", value: account.subscriptionType },
    { label: "Last paid", value: formatDate(account.lastPaidAt) },
    { label: "Next due", value: formatDate(account.nextDueAt) },
    { label: "Last login", value: formatDate(account.lastLoginAt) },
    { label: "Registered", value: formatDate(account.createdAt) },
    { label: "Login", value: account.banned ? "Banned" : "Allowed" },
    { label: "App access", value: account.unlocked ? "Unlocked" : "Locked" },
  ];
  return (
    <Modal open={open} onClose={onClose} title="IQWireCalculator client" size="md">
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

export default function AdminIqWireCalculatorPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewAccount, setViewAccount] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const { tableSort, handleTableSort } = useAdminTableSort("createdAt", "desc");

  const onTableSort = useCallback(
    (key, direction) => {
      setPage(1);
      handleTableSort(key, direction);
    },
    [handleTableSort]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      appendAdminSortParams(params, tableSort);
      const res = await fetch(`/api/admin/mobile-app-accounts?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setAccounts(data.accounts || []);
      setTotalCount(Number(data.totalCount) || 0);
    } catch (e) {
      toast.error(e.message || "Failed to load IQWireCalculator clients");
      setAccounts([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, searchQuery, tableSort]);

  useEffect(() => {
    load();
  }, [load]);

  const patchAccount = async (id, body) => {
    const res = await fetch(`/api/admin/mobile-app-accounts/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
    return data.account;
  };

  const removeAccess = async (row) => {
    const first = await confirm({
      title: "Remove access",
      message: `Lock IQWireCalculator for ${row.email}? Their trial/subscription ends immediately. They can still sign in.`,
      confirmLabel: "Remove access",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Confirm remove access",
      message: "This cannot be undone from here. PayPal billing is cancelled if present.",
      confirmLabel: "Remove access",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!second) return;
    try {
      await patchAccount(row.id, { revokeAccess: true });
      toast.success("Access removed.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const banAccount = async (row) => {
    const first = await confirm({
      title: "Ban client",
      message: `Ban ${row.email}? They will not be able to sign in, and app access is locked.`,
      confirmLabel: "Ban",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Confirm ban",
      message: "This blocks login until you unban them.",
      confirmLabel: "Ban",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!second) return;
    try {
      await patchAccount(row.id, { canLogin: false });
      toast.success("Client banned.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const unbanAccount = async (row) => {
    const ok = await confirm({
      title: "Unban client",
      message: `Allow ${row.email} to sign in again? Subscription is not restored automatically.`,
      confirmLabel: "Unban",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await patchAccount(row.id, { canLogin: true });
      toast.success("Client unbanned.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const columns = [
    {
      key: "view",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setViewAccount(row)}
          className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`View ${row.email}`}
        >
          <FiEye className="h-4 w-4" />
        </button>
      ),
    },
    {
      key: "revoke",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => removeAccess(row)}
          disabled={!row.unlocked && row.subscriptionStatus === "expired"}
          className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Remove access for ${row.email}`}
          title="Remove access"
        >
          <FiLock className="h-4 w-4" />
        </button>
      ),
    },
    {
      key: "ban",
      label: "",
      render: (_, row) =>
        row.banned ? (
          <button
            type="button"
            onClick={() => unbanAccount(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`Unban ${row.email}`}
            title="Unban"
          >
            <FiUnlock className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => banAccount(row)}
            className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label={`Ban ${row.email}`}
            title="Ban"
          >
            <FiSlash className="h-4 w-4" />
          </button>
        ),
    },
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Phone" },
    { key: "country", label: "Country", sortable: true },
    {
      key: "subscriptionType",
      label: "Subscription",
      sortable: true,
      render: (v, row) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Badge variant={typeVariant(v, row.banned)} className="rounded-full px-2.5 py-0.5 text-xs">
            {v}
          </Badge>
          {row.banned ? (
            <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs">
              Banned
            </Badge>
          ) : null}
        </span>
      ),
    },
    {
      key: "lastPaidAt",
      label: "Last paid",
      sortable: true,
      render: (v) => formatDate(v),
    },
    {
      key: "nextDueAt",
      label: "Next due",
      sortable: true,
      render: (v) => formatDate(v),
    },
    {
      key: "lastLoginAt",
      label: "Last login",
      sortable: true,
      render: (v) => formatDate(v),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">IQWireCalculator clients</h1>
        <p className="mt-1 text-sm text-secondary">
          Mobile app accounts (not shop CRM). Remove access locks the app; ban blocks sign-in.
        </p>
        <div className="mt-4 max-w-sm">
          <Input
            label="Search"
            name="q"
            value={searchQuery}
            onChange={(e) => {
              setPage(1);
              setSearchQuery(e.target.value);
            }}
            placeholder="Name, email, phone, or country"
          />
        </div>
      </div>
      <div className="mt-6 min-h-0">
        <Table
          columns={columns}
          data={accounts}
          rowKey="id"
          loading={loading}
          emptyMessage="No IQWireCalculator clients yet."
          responsive
          sortState={tableSort}
          onSort={onTableSort}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
        />
      </div>
      <AccountDetailModal account={viewAccount} open={!!viewAccount} onClose={() => setViewAccount(null)} />
    </div>
  );
}
