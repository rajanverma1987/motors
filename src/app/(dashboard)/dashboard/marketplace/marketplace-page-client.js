"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
const STATUS_OPTIONS = [
  { value: "draft", label: "Draft (not public)" },
  { value: "published", label: "Published" },
];

const CAT_OPTIONS = [
  { value: "parts", label: "Parts & components" },
  { value: "motors", label: "Motors & drives" },
  { value: "tools", label: "Tools & equipment" },
  { value: "surplus", label: "Surplus / used" },
  { value: "other", label: "Other" },
];

const EMPTY_ITEM = {
  title: "",
  description: "",
  category: "other",
  priceDisplay: "",
  condition: "",
  imagesText: "",
  status: "draft",
};

const ORDER_STATUS_OPTS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

export default function MarketplacePageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState("items");
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, oRes] = await Promise.all([
        fetch("/api/dashboard/marketplace/items", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/marketplace/orders", { credentials: "include", cache: "no-store" }),
      ]);
      const iData = await iRes.json();
      const oData = await oRes.json();
      if (iRes.ok) setItems(Array.isArray(iData) ? iData : []);
      else setItems([]);
      if (oRes.ok) setOrders(Array.isArray(oData) ? oData : []);
      else setOrders([]);
    } catch {
      toast.error("Could not load marketplace");
      setItems([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_ITEM });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      title: row.title || "",
      description: row.description || "",
      category: row.category || "other",
      priceDisplay: row.priceDisplay || "",
      condition: row.condition || "",
      imagesText: Array.isArray(row.images) ? row.images.join("\n") : "",
      status: row.status || "draft",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const submitItem = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error("Title is required.");
      return;
    }
    const images = form.imagesText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priceDisplay: form.priceDisplay.trim(),
      condition: form.condition.trim(),
      images,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/dashboard/marketplace/items/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Update failed");
        toast.success("Listing updated.");
      } else {
        const res = await fetch("/api/dashboard/marketplace/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Save failed");
        toast.success("Listing created.");
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (row) => {
    const ok = await confirm({
      title: "Delete listing?",
      message: "This removes the item from your CRM and the public marketplace.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/marketplace/items/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.success("Deleted.");
      load();
    } catch (e) {
      toast.error(e.message || "Could not delete");
    }
  };

  const patchOrderStatus = async (row, status) => {
    try {
      const res = await fetch(`/api/dashboard/marketplace/orders/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Update failed");
      toast.success("Order updated.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const itemColumns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              aria-label="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => deleteItem(row)}
              className="rounded p-1.5 text-danger hover:bg-danger/10"
              aria-label="Delete"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "priceDisplay", label: "Price / note" },
      {
        key: "status",
        label: "Status",
        render: (v) => (v === "published" ? "Published" : "Draft"),
      },
      {
        key: "slug",
        label: "Public link",
        render: (v) =>
          v ? (
            <a
              href={`/marketplace/${v}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View
            </a>
          ) : (
            "—"
          ),
      },
    ],
    []
  );

  const orderColumns = useMemo(
    () => [
      { key: "itemTitleSnapshot", label: "Item" },
      { key: "buyerName", label: "Buyer" },
      { key: "buyerEmail", label: "Email" },
      { key: "buyerPhone", label: "Phone" },
      { key: "quantity", label: "Qty" },
      {
        key: "status",
        label: "Status",
        render: (v, row) => (
          <select
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-title"
            value={v || "new"}
            onChange={(e) => patchOrderStatus(row, e.target.value)}
            aria-label="Order status"
          >
            {ORDER_STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: "buyerMessage",
        label: "Message",
        render: (v) => (
          <span className="line-clamp-2 max-w-[200px]" title={v}>
            {v || "—"}
          </span>
        ),
      },
      { key: "createdAt", label: "Date", render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Marketplace</h1>
        <p className="mt-1 text-sm text-secondary">
          List parts, motors, tools, and surplus on the public marketplace. Buyers submit a request—no payment on
          the site; you follow up directly. Published items appear at{" "}
          <a href="/marketplace" className="text-primary underline" target="_blank" rel="noopener noreferrer">
            /marketplace
          </a>
          .
        </p>
      </div>

      <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            tab === "items" ? "bg-primary text-white" : "bg-card text-secondary hover:bg-muted/50"
          }`}
        >
          My listings
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            tab === "orders" ? "bg-primary text-white" : "bg-card text-secondary hover:bg-muted/50"
          }`}
        >
          Buyer requests
        </button>
        {tab === "items" && (
          <div className="ml-auto">
            <Button type="button" variant="primary" size="sm" onClick={openCreate} className="inline-flex items-center gap-1.5">
              <FiPlus className="h-4 w-4" />
              New listing
            </Button>
          </div>
        )}
      </div>

      <div className="mt-4 min-h-0 min-w-0 flex-1">
        {tab === "items" ? (
          <Table
            columns={itemColumns}
            data={items}
            rowKey="id"
            loading={loading}
            emptyMessage="No listings yet. Create one to show on the public marketplace when published."
            onRefresh={load}
            responsive
          />
        ) : (
          <Table
            columns={orderColumns}
            data={orders}
            rowKey="id"
            loading={loading}
            emptyMessage="No buyer requests yet."
            onRefresh={load}
            responsive
          />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit listing" : "New listing"}
        size="2xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" form="mp-item-form" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="mp-item-form" onSubmit={submitItem} className="flex flex-col gap-3 !space-y-0">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <Textarea
            label="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={5}
            placeholder="Condition, specs, pickup/shipping notes…"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              label="Category"
              options={CAT_OPTIONS}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value ?? "other" }))}
              searchable={false}
            />
            <Select
              label="Visibility"
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "draft" }))}
              searchable={false}
            />
            <Input
              label="Price / pricing note"
              value={form.priceDisplay}
              onChange={(e) => setForm((f) => ({ ...f, priceDisplay: e.target.value }))}
              placeholder="e.g. $450, Make offer, Call for quote"
            />
            <Input
              label="Condition"
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
              placeholder="New, used, rebuilt…"
            />
          </div>
          <Textarea
            label="Image URLs (one per line, max 10)"
            value={form.imagesText}
            onChange={(e) => setForm((f) => ({ ...f, imagesText: e.target.value }))}
            rows={3}
            placeholder="https://…"
          />
        </Form>
      </Modal>
    </div>
  );
}
