"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const BILLING_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (every N months)" },
];

export default function AdminSubscriptionPlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    customPrice: "",
    billingCycle: "monthly",
    billingIntervalCount: "1",
    negotiatedBy: "",
    currency: "USD",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscription-plans", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPlans(data.plans || []);
    } catch (e) {
      toast.error(e.message || "Failed to load plans");
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
          description: form.description.trim(),
          customPrice: Number(form.customPrice) || 0,
          billingCycle: form.billingCycle,
          billingIntervalCount: Number(form.billingIntervalCount) || 1,
          negotiatedBy: form.negotiatedBy.trim(),
          currency: form.currency.trim() || "USD",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Create failed");
      toast.success("Plan created. PayPal product/plan IDs saved when credentials are configured.");
      setForm({
        name: "",
        slug: "",
        description: "",
        customPrice: "",
        billingCycle: "monthly",
        billingIntervalCount: "1",
        negotiatedBy: "",
        currency: "USD",
      });
      load();
    } catch (err) {
      toast.error(err.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (id, active) => {
    try {
      const res = await fetch(`/api/admin/subscription-plans/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      load();
    } catch (e) {
      toast.error(e.message || "Update failed");
    }
  };

  const columns = [
    { key: "name", label: "Name" },
    { key: "slug", label: "Slug" },
    {
      key: "planType",
      label: "Type",
      render: (v) => (
        <Badge variant={v === "internal" ? "default" : "primary"}>{v}</Badge>
      ),
    },
    {
      key: "customPrice",
      label: "Price",
      render: (v, row) => `${row.currency || "USD"} ${Number(v).toFixed(2)} / ${row.billingCycle}`,
    },
    { key: "negotiatedBy", label: "Negotiated by" },
    {
      key: "paypalPlanId",
      label: "PayPal plan",
      render: (v) => (v ? <span className="font-mono text-xs">{v.slice(0, 12)}…</span> : "—"),
    },
    {
      key: "active",
      label: "Active",
      render: (v, row) => (
        <button
          type="button"
          onClick={() => toggleActive(row.id, v)}
          disabled={row.slug === "free-ultimate"}
          className="text-sm text-primary hover:underline disabled:opacity-40"
        >
          {v ? "Yes" : "No"}
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-auto px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Subscription plans</h1>
        <p className="mt-1 text-sm text-secondary">
          Create PayPal billing plans with negotiated pricing. New clients register with <strong>Free Ultimate</strong>{" "}
          (internal) until you assign a paid plan. Configure{" "}
          <code className="rounded bg-muted px-1 text-xs">PAYPAL_CLIENT_ID</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">PAYPAL_CLIENT_SECRET</code>,{" "}
          <code className="rounded bg-muted px-1 text-xs">PAYPAL_MODE</code>, and webhook ID for live sync.
        </p>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <FormContainer>
          <FormSectionTitle as="h2">Create PayPal-backed plan</FormSectionTitle>
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            <Input
              label="Display name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Input
              label="Slug (URL-safe)"
              name="slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="e.g. pro-monthly-199"
              required
            />
            <Textarea
              label="Description"
              name="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Negotiated price (USD)"
                name="customPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.customPrice}
                onChange={(e) => setForm((p) => ({ ...p, customPrice: e.target.value }))}
                required
              />
              <Input
                label="Currency"
                name="currency"
                value={form.currency}
                onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              />
            </div>
            <Select
              label="Billing cycle"
              name="billingCycle"
              options={BILLING_OPTIONS}
              value={form.billingCycle}
              onChange={(e) => setForm((p) => ({ ...p, billingCycle: e.target.value }))}
            />
            {form.billingCycle === "custom" && (
              <Input
                label="Bill every N months"
                name="billingIntervalCount"
                type="number"
                min="1"
                max="24"
                value={form.billingIntervalCount}
                onChange={(e) => setForm((p) => ({ ...p, billingIntervalCount: e.target.value }))}
              />
            )}
            <Input
              label="Negotiated by"
              name="negotiatedBy"
              value={form.negotiatedBy}
              onChange={(e) => setForm((p) => ({ ...p, negotiatedBy: e.target.value }))}
              placeholder="Account manager / reference"
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create in DB + PayPal"}
            </Button>
          </form>
        </FormContainer>

        <div className="min-h-0">
          <h2 className="mb-3 text-lg font-semibold text-title">All plans</h2>
          <Table
            columns={columns}
            data={plans.map((p) => ({ ...p, id: p.id }))}
            rowKey="id"
            loading={loading}
            emptyMessage="No plans yet."
            responsive
          />
        </div>
      </div>
    </div>
  );
}
