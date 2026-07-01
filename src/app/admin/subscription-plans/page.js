"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

/** Must match CALCULATOR_SUBSCRIPTION_PLAN_SLUG in calculator-subscription-plan.js */
const CALCULATOR_PAYWALL_SLUG = "calc-only";
const PROTECTED_DELETE_SLUGS = new Set(["free-ultimate", "trial"]);

const BILLING_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom (every N months)" },
];

const EMPTY_EDIT = {
  name: "",
  description: "",
  customPrice: "",
  billingCycle: "monthly",
  billingIntervalCount: "1",
  negotiatedBy: "",
  currency: "USD",
  active: true,
};

export default function AdminSubscriptionPlansPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
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
  const [editPlan, setEditPlan] = useState(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT });
  const [editSaving, setEditSaving] = useState(false);
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
      appendAdminSortParams(params, tableSort);
      const res = await fetch(`/api/admin/subscription-plans?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setPlans(data.plans || []);
      setTotalCount(Number(data.totalCount) || 0);
    } catch (e) {
      toast.error(e.message || "Failed to load plans");
      setPlans([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, tableSort]);

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

  const openEdit = (row) => {
    setEditPlan(row);
    setEditForm({
      name: row.name || "",
      description: row.description || "",
      customPrice: String(Number(row.customPrice) ?? 0),
      billingCycle: row.billingCycle || "monthly",
      billingIntervalCount: String(row.billingIntervalCount ?? 1),
      negotiatedBy: row.negotiatedBy || "",
      currency: row.currency || "USD",
      active: row.active !== false,
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editPlan?.id) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/subscription-plans/${editPlan.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          customPrice: Number(editForm.customPrice),
          billingCycle: editForm.billingCycle,
          billingIntervalCount: Number(editForm.billingIntervalCount) || 1,
          negotiatedBy: editForm.negotiatedBy.trim(),
          currency: editForm.currency.trim() || "USD",
          active: editForm.active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success(
        editPlan.slug === CALCULATOR_PAYWALL_SLUG
          ? "Plan updated. Calculator paywall uses this plan’s price."
          : "Plan updated."
      );
      setEditPlan(null);
      load();
    } catch (err) {
      toast.error(err.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (PROTECTED_DELETE_SLUGS.has(row.slug)) {
      toast.error(`“${row.slug}” is a protected system plan and cannot be deleted.`);
      return;
    }
    const confirmed = await confirm({
      title: "Delete subscription plan",
      message: `Delete “${row.name}” (${row.slug})? This cannot be undone. Shops still assigned this plan must be moved first.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/subscription-plans/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Plan deleted.");
      load();
    } catch (err) {
      toast.error(err.message || "Delete failed");
    }
  };

  const toggleActive = async (id, active, slug) => {
    if (PROTECTED_DELETE_SLUGS.has(slug) && active) return;
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
    {
      key: "edit",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => openEdit(row)}
          className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label={`Edit ${row.name}`}
        >
          <FiEdit2 className="h-4 w-4" />
        </button>
      ),
    },
    {
      key: "delete",
      label: "",
      render: (_, row) =>
        PROTECTED_DELETE_SLUGS.has(row.slug) ? (
          <span className="inline-block w-8" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label={`Delete ${row.name}`}
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        ),
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (v, row) => (
        <span className="inline-flex flex-wrap items-center gap-2">
          {v}
          {row.slug === CALCULATOR_PAYWALL_SLUG ? (
            <Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">
              Calculator paywall
            </Badge>
          ) : null}
        </span>
      ),
    },
    { key: "slug", label: "Slug", sortable: true },
    {
      key: "planType",
      label: "Type",
      sortable: true,
      render: (v) => (
        <Badge variant={v === "internal" ? "default" : "primary"} className="rounded-full px-2.5 py-0.5 text-xs">
          {v}
        </Badge>
      ),
    },
    {
      key: "customPrice",
      label: "Price",
      sortable: true,
      render: (v, row) => `${row.currency || "USD"} ${Number(v).toFixed(2)} / ${row.billingCycle}`,
    },
    { key: "negotiatedBy", label: "Negotiated by", sortable: true },
    {
      key: "paypalPlanId",
      label: "PayPal plan",
      render: (v) => (v ? <span className="font-mono text-xs">{v.slice(0, 12)}…</span> : "—"),
    },
    {
      key: "active",
      label: "Active",
      sortable: true,
      render: (v, row) => (
        <button
          type="button"
          onClick={() => toggleActive(row.id, v, row.slug)}
          disabled={PROTECTED_DELETE_SLUGS.has(row.slug)}
          className="text-sm text-primary hover:underline disabled:opacity-40"
        >
          {v ? "Yes" : "No"}
        </button>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Subscription plans</h1>
        <p className="mt-1 text-sm text-secondary">
          Create PayPal billing plans with negotiated pricing. The public{" "}
          <strong>calculator subscription</strong> uses the active plan with slug{" "}
          <code className="rounded bg-muted px-1 text-xs">{CALCULATOR_PAYWALL_SLUG}</code> (override with{" "}
          <code className="rounded bg-muted px-1 text-xs">CALCULATOR_SUBSCRIPTION_PLAN_SLUG</code> in env). New clients
          register with <strong>Trial</strong> (internal) until you assign a paid plan.
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
      </div>

      <Modal
        open={!!editPlan}
        onClose={() => {
          if (!editSaving) setEditPlan(null);
        }}
        title={editPlan ? `Edit plan — ${editPlan.name}` : "Edit plan"}
        size="md"
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" disabled={editSaving} onClick={() => setEditPlan(null)}>
              Cancel
            </Button>
            <Button type="submit" form="admin-plan-edit-form" variant="primary" size="sm" disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {editPlan ? (
          <Form id="admin-plan-edit-form" onSubmit={saveEdit} className="flex flex-col gap-3 !space-y-0">
            <p className="text-sm text-secondary">
              Slug <span className="font-mono text-title">{editPlan.slug}</span> · Type{" "}
              <span className="font-medium text-title">{editPlan.planType}</span>
              {editPlan.slug === CALCULATOR_PAYWALL_SLUG ? (
                <span className="mt-1 block text-amber-700 dark:text-amber-400">
                  Powers the calculator Subscribe button on the marketing site and dashboard.
                </span>
              ) : null}
            </p>
            <Input
              label="Display name"
              name="name"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
            <Textarea
              label="Description"
              name="description"
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={`Price (${editForm.currency || "USD"})`}
                name="customPrice"
                type="number"
                min="0"
                step="0.01"
                value={editForm.customPrice}
                onChange={(e) => setEditForm((p) => ({ ...p, customPrice: e.target.value }))}
                required
              />
              <Input
                label="Currency"
                name="currency"
                value={editForm.currency}
                onChange={(e) => setEditForm((p) => ({ ...p, currency: e.target.value }))}
              />
            </div>
            {editPlan.planType === "paypal" ? (
              <>
                <Select
                  label="Billing cycle"
                  name="billingCycle"
                  options={BILLING_OPTIONS}
                  value={editForm.billingCycle}
                  onChange={(e) => setEditForm((p) => ({ ...p, billingCycle: e.target.value }))}
                />
                {editForm.billingCycle === "custom" ? (
                  <Input
                    label="Bill every N months"
                    name="billingIntervalCount"
                    type="number"
                    min="1"
                    max="24"
                    value={editForm.billingIntervalCount}
                    onChange={(e) => setEditForm((p) => ({ ...p, billingIntervalCount: e.target.value }))}
                  />
                ) : null}
                <p className="text-xs text-secondary">
                  Changing price or billing creates a new PayPal billing plan ID (PayPal does not allow in-place price
                  edits).
                </p>
              </>
            ) : null}
            <Input
              label="Negotiated by"
              name="negotiatedBy"
              value={editForm.negotiatedBy}
              onChange={(e) => setEditForm((p) => ({ ...p, negotiatedBy: e.target.value }))}
            />
            {!PROTECTED_DELETE_SLUGS.has(editPlan.slug) ? (
              <label className="flex items-center gap-2 text-sm text-title">
                <input
                  type="checkbox"
                  checked={editForm.active}
                  onChange={(e) => setEditForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded border-border"
                />
                Plan is active (visible for assignment / paywall)
              </label>
            ) : null}
          </Form>
        ) : null}
      </Modal>
    </div>
  );
}
