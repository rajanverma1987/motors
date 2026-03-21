"use client";

import { useState, useEffect, useCallback } from "react";
import { FiEye, FiLock, FiUnlock, FiCreditCard } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";

function ClientDetailModal({ client, open, onClose }) {
  if (!client) return null;
  const s = client.subscriptionSummary;
  const fields = [
    { label: "Email", value: client.email },
    { label: "Shop name", value: client.shopName || "—" },
    { label: "Contact name", value: client.contactName || "—" },
    {
      label: "Subscription",
      value: s ? (
        <span>
          {s.planName} ({s.planType}) · {s.internalState}
          {s.revoked ? " · access revoked" : ""}
        </span>
      ) : (
        "—"
      ),
    },
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

function SubscriptionManageModal({ client, open, onClose, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [revokeReason, setRevokeReason] = useState("");
  const [offlineNote, setOfflineNote] = useState("");
  const [offlineAmount, setOfflineAmount] = useState("");

  const load = useCallback(async () => {
    if (!client?.id) return;
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        fetch(`/api/admin/users/${client.id}/subscription`, { credentials: "include" }),
        fetch("/api/admin/subscription-plans", { credentials: "include" }),
      ]);
      const subData = await subRes.json();
      const plansData = await plansRes.json();
      if (!subRes.ok) throw new Error(subData.error || "Failed to load subscription");
      setSub(subData.subscription);
      const paypalPlans = (plansData.plans || []).filter(
        (p) => p.planType === "paypal" && p.active && p.paypalPlanId
      );
      setPlans(
        paypalPlans.map((p) => ({
          value: p.id,
          label: `${p.name} — ${p.currency} ${Number(p.customPrice).toFixed(2)} (${p.billingCycle})`,
        }))
      );
      if (paypalPlans[0]) setSelectedPlanId(paypalPlans[0].id);
    } catch (e) {
      toast.error(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }, [client?.id, toast]);

  useEffect(() => {
    if (open && client) load();
  }, [open, client, load]);

  async function post(action, body = {}) {
    const res = await fetch(`/api/admin/users/${client.id}/subscription`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  const handleAssignPaypal = async () => {
    if (!selectedPlanId) {
      toast.error("Select a PayPal plan (create one under Subscriptions if missing).");
      return;
    }
    try {
      const data = await post("assign_paypal", { planId: selectedPlanId });
      toast.success("PayPal subscription created. Share the approval link with the client.");
      if (data.approvalUrl) {
        await navigator.clipboard.writeText(data.approvalUrl);
        toast.info("Approval URL copied to clipboard.");
      }
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const handleFreeUltimate = async () => {
    try {
      await post("assign_free_ultimate");
      toast.success("Client is on Free Ultimate.");
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error("Enter a revoke reason (shown on login).");
      return;
    }
    try {
      await post("revoke", { reason: revokeReason.trim() });
      toast.success("Subscription access revoked.");
      setRevokeReason("");
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const handleClearRevoke = async () => {
    try {
      await post("clear_revoke");
      toast.success("Revoke cleared.");
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const copyApproval = async () => {
    const url = sub?.pendingApprovalUrl;
    if (!url) {
      toast.error("No pending approval URL.");
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Copied approval URL.");
  };

  const extendGrace = async () => {
    try {
      await post("extend_grace", { days: 7 });
      toast.success("Grace extended.");
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const markOffline = async () => {
    try {
      await post("mark_paid_offline", {
        amount: offlineAmount ? Number(offlineAmount) : undefined,
        note: offlineNote,
      });
      toast.success("Recorded offline payment.");
      setOfflineNote("");
      setOfflineAmount("");
      await load();
      onSaved?.();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  if (!client) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Subscription — ${client.email}`} size="lg">
      {loading && !sub ? (
        <p className="text-secondary">Loading…</p>
      ) : (
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <p>
              <strong>State:</strong> {sub?.internalState || "—"}
            </p>
            <p className="mt-1">
              <strong>Plan:</strong> {sub?.plan?.name || "—"} ({sub?.plan?.planType || "—"})
            </p>
            {sub?.revokedAt && (
              <p className="mt-1 text-danger">
                <strong>Revoked:</strong> {sub.revokedReason || "No reason stored"}
              </p>
            )}
            {sub?.pendingApprovalUrl && (
              <p className="mt-2 break-all text-xs text-secondary">{sub.pendingApprovalUrl}</p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-title">Upgrade / change plan (PayPal)</h3>
            <p className="mt-1 text-xs text-secondary">
              Creates a PayPal subscription and stores the approval URL. Client completes payment from CRM →
              Subscription or you copy the link below.
            </p>
            {plans.length > 0 ? (
              <div className="mt-3 space-y-3">
                <Select
                  label="Plan"
                  name="planId"
                  options={plans}
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  placeholder="Select plan"
                />
                <Button type="button" variant="primary" size="sm" onClick={handleAssignPaypal}>
                  Assign PayPal plan
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-warning">
                No active PayPal plans with IDs. Create one under Admin → Subscriptions.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={copyApproval}>
              Copy payment link
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleFreeUltimate}>
              Switch to Free Ultimate
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={extendGrace}>
              Extend grace +7 days
            </Button>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-title">Revoke comped access</h3>
            <p className="mt-1 text-xs text-secondary">
              Blocks login with this reason (separate from “login access” lock icon).
            </p>
            <Textarea
              label="Reason (shown to client on login)"
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={2}
              className="mt-2"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="danger" size="sm" onClick={handleRevoke}>
                Revoke subscription access
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleClearRevoke}>
                Clear revoke
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-title">Mark paid offline</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Input
                label="Amount (optional)"
                type="number"
                value={offlineAmount}
                onChange={(e) => setOfflineAmount(e.target.value)}
              />
              <Input
                label="Note"
                value={offlineNote}
                onChange={(e) => setOfflineNote(e.target.value)}
              />
            </div>
            <Button type="button" className="mt-2" variant="secondary" size="sm" onClick={markOffline}>
              Log offline payment
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const BASE_COLUMNS = [
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
    key: "actions",
    label: "",
    render: (_, row) => (
      <ClientActions id={row.id} canLogin={row.canLogin} onUpdate={row._onUpdate} />
    ),
  },
  { key: "email", label: "Email" },
  { key: "shopName", label: "Shop name" },
  { key: "contactName", label: "Contact name" },
  {
    key: "subscriptionSummary",
    label: "Subscription",
    render: (s) =>
      s ? (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-title">{s.planName}</span>
          <span className="text-secondary">{s.internalState}</span>
          {s.revoked ? <Badge variant="danger">Revoked</Badge> : null}
        </div>
      ) : (
        "—"
      ),
  },
  {
    key: "canLogin",
    label: "Login",
    render: (val) => (
      <Badge variant={val ? "success" : "danger"}>{val ? "Yes" : "No"}</Badge>
    ),
  },
  {
    key: "createdAt",
    label: "Registered",
    render: (val) => (val ? new Date(val).toLocaleDateString() : "—"),
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
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
      aria-label="Revoke access"
    >
      <FiLock className="h-4 w-4" />
    </button>
  ) : (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      aria-label="Grant access"
    >
      <FiUnlock className="h-4 w-4" />
    </button>
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
  const [subClient, setSubClient] = useState(null);
  const [subModalOpen, setSubModalOpen] = useState(false);

  const openViewModal = useCallback((client) => {
    setViewClient(client);
    setViewModalOpen(true);
  }, []);

  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setViewClient(null);
  }, []);

  const openSubModal = useCallback((client) => {
    setSubClient(client);
    setSubModalOpen(true);
  }, []);

  const closeSubModal = useCallback(() => {
    setSubModalOpen(false);
    setSubClient(null);
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
        _onManageSub: () => openSubModal(u),
      }));
      setUsers(list);

      const pending =
        typeof sessionStorage !== "undefined" ? sessionStorage.getItem("adminOpenSubUserId") : null;
      if (pending) {
        const row = list.find((x) => x.id === pending);
        if (row) {
          sessionStorage.removeItem("adminOpenSubUserId");
          setSubClient(row);
          setSubModalOpen(true);
        } else {
          sessionStorage.removeItem("adminOpenSubUserId");
        }
      }
    } catch (e) {
      toast.error(e.message || "Failed to load clients");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [toast, openViewModal, openSubModal]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = searchQuery.trim()
    ? users.filter((row) => matchClient(row, searchQuery.trim()))
    : users;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Registered clients</h1>
        <p className="text-sm text-secondary">
          Portal users, login access, and subscriptions. Use the card icon to assign PayPal plans or revoke comped
          access.
        </p>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={BASE_COLUMNS}
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

      <ClientDetailModal client={viewClient} open={viewModalOpen} onClose={closeViewModal} />

      <SubscriptionManageModal
        client={subClient}
        open={subModalOpen}
        onClose={closeSubModal}
        onSaved={fetchUsers}
      />
    </div>
  );
}
