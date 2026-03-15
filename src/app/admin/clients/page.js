"use client";

import { useState, useEffect, useCallback } from "react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";

function ClientDetailModal({ client, open, onClose }) {
  if (!client) return null;
  const fields = [
    { label: "Email", value: client.email },
    { label: "Shop name", value: client.shopName || "—" },
    { label: "Contact name", value: client.contactName || "—" },
    {
      label: "Login access",
      value: (
        <Badge variant={client.canLogin ? "success" : "danger"}>
          {client.canLogin ? "Can login" : "Revoked"}
        </Badge>
      ),
    },
    {
      label: "Registered",
      value: client.createdAt
        ? new Date(client.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—",
    },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Client details" size="md">
      <div className="space-y-4">
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-medium uppercase tracking-wide text-secondary">
              {label}
            </dt>
            <dd className="mt-1 text-sm text-text">{value}</dd>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const COLUMNS = [
  { key: "email", label: "Email" },
  { key: "shopName", label: "Shop name" },
  { key: "contactName", label: "Contact name" },
  {
    key: "canLogin",
    label: "Access",
    render: (val) => (
      <Badge variant={val ? "success" : "danger"}>
        {val ? "Can login" : "Revoked"}
      </Badge>
    ),
  },
  {
    key: "createdAt",
    label: "Registered",
    render: (val) => (val ? new Date(val).toLocaleDateString() : "—"),
  },
  {
    key: "view",
    label: "",
    render: (_, row) => (
      <Button
        variant="outline"
        size="sm"
        onClick={() => row._onView?.()}
      >
        View
      </Button>
    ),
  },
  {
    key: "actions",
    label: "",
    render: (_, row) => (
      <ClientActions
        id={row.id}
        canLogin={row.canLogin}
        onUpdate={row._onUpdate}
      />
    ),
  },
];


function ClientActions({ id, canLogin, onUpdate }) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ canLogin: !canLogin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Update failed");
      }
      onUpdate?.();
    } finally {
      setLoading(false);
    }
  }

  return canLogin ? (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "…" : "Revoke"}
    </Button>
  ) : (
    <Button
      variant="primary"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "…" : "Grant"}
    </Button>
  );
}

function matchClient(row, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  const email = (row.email || "").toLowerCase();
  const shop = (row.shopName || "").toLowerCase();
  const contact = (row.contactName || "").toLowerCase();
  return email.includes(s) || shop.includes(s) || contact.includes(s);
}

export default function AdminClientsPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewClient, setViewClient] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const openViewModal = useCallback((client) => {
    setViewClient(client);
    setViewModalOpen(true);
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setViewClient(null);
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      const list = (data.users || []).map((u) => ({
        ...u,
        _onUpdate: () => fetchUsers(),
        _onView: () => openViewModal(u),
      }));
      setUsers(list);
    } catch (e) {
      toast.error(e.message || "Failed to load clients");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast, openViewModal]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = searchQuery.trim()
    ? users.filter((row) => matchClient(row, searchQuery.trim()))
    : users;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Registered clients</h1>
        <p className="text-sm text-secondary">
          Portal users who can log in to the dashboard. Revoke or grant login access.
        </p>
      </div>

      <div className="mt-6 min-w-0">
        <Table
          stickyHeader
          stickyHeaderMaxHeight="80vh"
          columns={COLUMNS}
          data={filteredUsers}
          rowKey="id"
          loading={loading}
          emptyMessage="No registered clients."
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search email, shop, contact…"
          responsive
        />
      </div>

      <ClientDetailModal
        client={viewClient}
        open={viewModalOpen}
        onClose={closeViewModal}
      />
    </div>
  );
}
