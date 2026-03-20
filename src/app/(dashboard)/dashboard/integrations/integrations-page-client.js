"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Checkbox from "@/components/ui/checkbox";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";

const COLLECTION_NAMES = [
  "customers",
  "motors",
  "quotes",
  "workOrders",
  "invoices",
  "inventoryItems",
  "vendors",
  "purchaseOrders",
  "employees",
  "logisticsEntries",
  "leads",
  "supportTickets",
  "marketplaceItems",
  "marketplaceOrders",
  "policies",
  "directoryListings",
];

const EVENT_TEMPLATES = COLLECTION_NAMES.flatMap((c) => [
  `crm.${c}.created`,
  `crm.${c}.updated`,
]);

export default function IntegrationsPageClient() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [newKeyName, setNewKeyName] = useState("Primary integration key");
  const [lastCreatedKey, setLastCreatedKey] = useState("");
  const [hookName, setHookName] = useState("Main webhook");
  const [hookUrl, setHookUrl] = useState("");
  const [hookAllEvents, setHookAllEvents] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState(EVENT_TEMPLATES);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kRes, wRes] = await Promise.all([
        fetch("/api/dashboard/integrations/keys", { credentials: "include" }),
        fetch("/api/dashboard/integrations/webhooks", { credentials: "include" }),
      ]);
      const k = await kRes.json();
      const w = await wRes.json();
      if (!kRes.ok) throw new Error(k.error || "Failed to load keys");
      if (!wRes.ok) throw new Error(w.error || "Failed to load webhooks");
      setKeys(k.keys || []);
      setWebhooks(w.webhooks || []);
      setDeliveries(w.deliveries || []);
    } catch (e) {
      toast.error(e.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const createKey = async () => {
    try {
      const res = await fetch("/api/dashboard/integrations/keys", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create key");
      setLastCreatedKey(data.key || "");
      toast.success("API key created. Copy it now; this is the only time shown.");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to create key");
    }
  };

  const removeKey = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/integrations/keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete key");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete key");
    }
  };

  const toggleKey = async (id, active) => {
    try {
      const res = await fetch(`/api/dashboard/integrations/keys/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update key");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to update key");
    }
  };

  const createWebhook = async () => {
    try {
      const events = hookAllEvents ? ["*"] : selectedEvents;
      if (!hookAllEvents && events.length === 0) {
        toast.error("Select at least one event.");
        return;
      }
      const res = await fetch("/api/dashboard/integrations/webhooks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hookName,
          endpointUrl: hookUrl,
          events,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create webhook");
      toast.success("Webhook created.");
      if (data.secret) toast.info(`Signing secret: ${data.secret}`);
      setHookUrl("");
      if (!hookAllEvents) setSelectedEvents(EVENT_TEMPLATES);
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to create webhook");
    }
  };

  const toggleEvent = (eventName) => {
    setSelectedEvents((prev) =>
      prev.includes(eventName)
        ? prev.filter((e) => e !== eventName)
        : [...prev, eventName]
    );
  };

  const toggleWebhook = async (id, active) => {
    try {
      const res = await fetch(`/api/dashboard/integrations/webhooks/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update webhook");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to update webhook");
    }
  };

  const deleteWebhook = async (id) => {
    try {
      const res = await fetch(`/api/dashboard/integrations/webhooks/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete webhook");
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete webhook");
    }
  };

  const keyColumns = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "keyPrefix", label: "Prefix" },
      {
        key: "active",
        label: "Active",
        render: (v, row) => (
          <button type="button" className="text-primary hover:underline" onClick={() => toggleKey(row.id, v)}>
            {v ? "Yes" : "No"}
          </button>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
      {
        key: "lastUsedAt",
        label: "Last used",
        render: (v) => (v ? new Date(v).toLocaleString() : "Never"),
      },
      {
        key: "id",
        label: "",
        render: (_, row) => (
          <button type="button" className="text-danger hover:underline" onClick={() => removeKey(row.id)}>
            Delete
          </button>
        ),
      },
    ],
    []
  );

  const webhookColumns = useMemo(
    () => [
      { key: "name", label: "Name" },
      { key: "endpointUrl", label: "Endpoint URL" },
      {
        key: "events",
        label: "Events",
        render: (v) => (Array.isArray(v) ? v.join(", ") : ""),
      },
      {
        key: "active",
        label: "Active",
        render: (v, row) => (
          <button type="button" className="text-primary hover:underline" onClick={() => toggleWebhook(row.id, v)}>
            {v ? "Yes" : "No"}
          </button>
        ),
      },
      {
        key: "id",
        label: "",
        render: (_, row) => (
          <button type="button" className="text-danger hover:underline" onClick={() => deleteWebhook(row.id)}>
            Delete
          </button>
        ),
      },
    ],
    []
  );

  const deliveryColumns = useMemo(
    () => [
      { key: "eventName", label: "Event" },
      { key: "status", label: "Status" },
      { key: "httpStatusCode", label: "HTTP" },
      { key: "error", label: "Error" },
      { key: "createdAt", label: "Time", render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    ],
    []
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold text-title">API Integrations</h1>
        <p className="mt-1 text-sm text-secondary">
          Create per-account secret API keys, configure event webhooks, and integrate external systems. No admin APIs
          are exposed.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/developers/api" target="_blank" className="text-primary hover:underline">
            Open public API documentation
          </Link>
        </p>
      </div>

      {loading ? <p className="mt-6 text-secondary">Loading…</p> : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium text-title">Secret API keys</h2>
          <div className="flex gap-2">
            <Input label="Key name" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
            <div className="pt-6">
              <Button onClick={createKey}>Create key</Button>
            </div>
          </div>
          {lastCreatedKey ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <p className="font-medium text-title">Copy this key now</p>
              <p className="mt-1 break-all font-mono text-xs text-secondary">{lastCreatedKey}</p>
            </div>
          ) : null}
          <Table columns={keyColumns} data={keys} rowKey="id" emptyMessage="No keys yet." responsive />
        </section>

        <section className="space-y-4 rounded-lg border border-border p-4">
          <h2 className="text-lg font-medium text-title">Webhooks</h2>
          <Input label="Webhook name" value={hookName} onChange={(e) => setHookName(e.target.value)} />
          <Input label="Endpoint URL" value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} />
          <Checkbox
            label="Subscribe to all CRM events"
            checked={hookAllEvents}
            onChange={(e) => setHookAllEvents(e.target.checked)}
          />
          {!hookAllEvents ? (
            <div className="rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-medium text-title">Select events</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {EVENT_TEMPLATES.map((ev) => (
                  <Checkbox
                    key={ev}
                    name={ev}
                    label={ev}
                    checked={selectedEvents.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          <Button onClick={createWebhook}>Create webhook</Button>
          <Table columns={webhookColumns} data={webhooks} rowKey="id" emptyMessage="No webhooks yet." responsive />
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-border p-4">
        <h2 className="text-lg font-medium text-title">Recent webhook deliveries</h2>
        <Table columns={deliveryColumns} data={deliveries} rowKey="id" emptyMessage="No deliveries yet." responsive />
      </section>
    </div>
  );
}

