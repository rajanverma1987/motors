"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiEye, FiLock, FiPlus, FiSlash, FiUnlock } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import { Form } from "@/components/ui/form-layout";
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

function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let s = "";
  for (let i = 0; i < 14; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
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
    { label: "Trial ends", value: formatDate(account.trialEndsAt) },
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
  const [editAccount, setEditAccount] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [extendDays, setExtendDays] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    country: "",
    password: "",
    trialDays: "3",
  });
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

  const openEdit = (row) => {
    setEditAccount(row);
    setEditName(row.name || "");
    setEditPhone(row.phone || "");
    setExtendDays("");
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editAccount?.id) return;
    const daysRaw = String(extendDays || "").trim();
    const days = daysRaw === "" ? 0 : Number(daysRaw);
    if (daysRaw !== "" && (!Number.isFinite(days) || days < 1 || days > 365 || !Number.isInteger(days))) {
      toast.error("Enter a whole number of days from 1 to 365, or leave it blank.");
      return;
    }
    setEditSaving(true);
    try {
      const body = { name: editName, phone: editPhone };
      if (days >= 1) body.extendTrialDays = days;
      await patchAccount(editAccount.id, body);
      toast.success(days >= 1 ? `Saved. Trial extended by ${days} day${days === 1 ? "" : "s"}.` : "Saved.");
      setEditAccount(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setEditSaving(false);
    }
  };

  const openCreate = () => {
    setCreateForm({
      name: "",
      email: "",
      phone: "",
      country: "",
      password: generateTempPassword(),
      trialDays: "3",
    });
    setCreateOpen(true);
  };

  const saveCreate = async (e) => {
    e.preventDefault();
    const name = String(createForm.name || "").trim();
    const email = String(createForm.email || "").trim();
    const password = String(createForm.password || "");
    if (!name || !email || !password) {
      toast.error("Name, email, and password are required.");
      return;
    }
    const daysRaw = String(createForm.trialDays || "").trim();
    const days = daysRaw === "" ? 0 : Number(daysRaw);
    if (daysRaw !== "" && (!Number.isFinite(days) || days < 1 || days > 365 || !Number.isInteger(days))) {
      toast.error("Trial days must be a whole number from 1 to 365.");
      return;
    }
    setCreateSaving(true);
    try {
      const res = await fetch("/api/admin/mobile-app-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: createForm.phone,
          country: createForm.country,
          trialDays: days >= 1 ? days : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Create failed");
      toast.success(`Account created for ${email}. Share the password with them to sign in.`);
      setCreateOpen(false);
      setPage(1);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setCreateSaving(false);
    }
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
      key: "edit",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Edit ${row.email}`}
          title="Edit"
        >
          <FiEdit2 className="h-4 w-4" />
        </button>
      ),
    },
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-title">IQWireCalculator clients</h1>
            <p className="mt-1 text-sm text-secondary">
              Mobile app accounts (not shop CRM). Remove access locks the app; ban blocks sign-in.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-1.5"
          >
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add account
          </Button>
        </div>
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
      <Modal
        open={!!editAccount}
        onClose={() => {
          if (!editSaving) setEditAccount(null);
        }}
        title={editAccount ? `Edit ${editAccount.email}` : "Edit client"}
        size="md"
        actions={
          <Button type="submit" form="iqwire-account-edit-form" variant="primary" size="sm" disabled={editSaving}>
            {editSaving ? "Saving…" : "Save"}
          </Button>
        }
      >
        {editAccount ? (
          <Form id="iqwire-account-edit-form" onSubmit={saveEdit} className="flex flex-col gap-4 !space-y-0">
            <Input label="Name" name="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <Input label="Phone" name="phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            <p className="text-sm text-secondary">
              Current trial ends:{" "}
              <span className="font-medium text-title">{formatDate(editAccount.trialEndsAt)}</span>
            </p>
            <Input
              label="Extend trial by (days)"
              name="extendTrialDays"
              type="number"
              min={1}
              max={365}
              step={1}
              value={extendDays}
              onChange={(e) => setExtendDays(e.target.value)}
              placeholder="e.g. 7"
            />
            <p className="text-xs text-secondary">
              Adds days onto the later of now or the current trial end. Leave blank to save name/phone only. Expired
              trials become active trial access again.
            </p>
          </Form>
        ) : null}
      </Modal>
      <Modal
        open={createOpen}
        onClose={() => {
          if (!createSaving) setCreateOpen(false);
        }}
        title="Add IQWireCalculator account"
        size="md"
        actions={
          <Button type="submit" form="iqwire-account-create-form" variant="primary" size="sm" disabled={createSaving}>
            {createSaving ? "Creating…" : "Create"}
          </Button>
        }
      >
        <Form id="iqwire-account-create-form" onSubmit={saveCreate} className="flex flex-col gap-4 !space-y-0">
          <Input
            label="Name"
            name="name"
            value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            required
          />
          <Input
            label="Phone"
            name="phone"
            value={createForm.phone}
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Country"
            name="country"
            value={createForm.country}
            onChange={(e) => setCreateForm((f) => ({ ...f, country: e.target.value }))}
            placeholder="Optional"
          />
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Password"
                name="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                required
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateForm((f) => ({ ...f, password: generateTempPassword() }))}
              disabled={createSaving}
            >
              Generate
            </Button>
          </div>
          <Input
            label="Trial days"
            name="trialDays"
            type="number"
            min={1}
            max={365}
            step={1}
            value={createForm.trialDays}
            onChange={(e) => setCreateForm((f) => ({ ...f, trialDays: e.target.value }))}
          />
          <p className="text-xs text-secondary">
            They sign in to the IQWireCalculator app with this email and password. Copy the password before you close
            this dialog.
          </p>
        </Form>
      </Modal>
    </div>
  );
}
