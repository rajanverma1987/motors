"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiEdit2, FiPlus, FiTrash2, FiUpload, FiX } from "react-icons/fi";
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

function parseImagesText(text) {
  return String(text || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

const EMPTY_ITEM = {
  title: "",
  description: "",
  category: "other",
  priceDisplay: "",
  condition: "",
  images: [],
  status: "draft",
  shopNameSnapshot: "MotorsWinding.com",
};

const ORDER_STATUS_OPTS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
];

export default function AdminMarketplacePage() {
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, oRes] = await Promise.all([
        fetch("/api/admin/marketplace/items", { credentials: "include", cache: "no-store" }),
        fetch("/api/admin/marketplace/orders", { credentials: "include", cache: "no-store" }),
      ]);
      const iData = await iRes.json();
      const oData = await oRes.json();
      if (iRes.ok) setItems(Array.isArray(iData) ? iData : []);
      else {
        setItems([]);
        if (iRes.status === 401) toast.error("Sign in as admin.");
      }
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
      images: Array.isArray(row.images) ? row.images.filter(Boolean).slice(0, 10) : [],
      status: row.status || "draft",
      shopNameSnapshot: row.shopNameSnapshot || "MotorsWinding.com",
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
    const images = (Array.isArray(form.images) ? form.images : []).filter(Boolean).slice(0, 10);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priceDisplay: form.priceDisplay.trim(),
      condition: form.condition.trim(),
      images,
      status: form.status,
      shopNameSnapshot: form.shopNameSnapshot.trim() || "MotorsWinding.com",
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/marketplace/items/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Update failed");
        toast.success("Listing updated.");
      } else {
        const res = await fetch("/api/admin/marketplace/items", {
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
      title: "Delete platform listing?",
      message: "Removes this item from the public marketplace.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/marketplace/items/${row.id}`, {
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

  const onImageFiles = async (e) => {
    const input = e.target;
    const files = input.files;
    if (!files?.length) return;
    setUploadingImage(true);
    try {
      let acc = [...(Array.isArray(form.images) ? form.images : [])];
      for (const file of Array.from(files)) {
        if (acc.length >= 10) break;
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/marketplace/upload-image", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (data.url) acc = [...acc, data.url].slice(0, 10);
      }
      setForm((f) => ({ ...f, images: acc }));
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingImage(false);
      input.value = "";
    }
  };

  const patchOrderStatus = async (row, status) => {
    try {
      const res = await fetch(`/api/admin/marketplace/orders/${row.id}`, {
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
      { key: "shopNameSnapshot", label: "Listed as" },
      { key: "category", label: "Category" },
      { key: "priceDisplay", label: "Price / note" },
      {
        key: "status",
        label: "Status",
        render: (v) => (v === "published" ? "Published" : "Draft"),
      },
      {
        key: "slug",
        label: "Link",
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
    <div className="flex w-full flex-1 justify-center">
      <div className="w-full max-w-7xl p-6">
      <h1 className="text-center text-2xl font-bold text-title">Marketplace (platform)</h1>
      <p className="mt-1 text-center text-sm text-secondary">
        List items on the public marketplace as MotorsWinding.com. Orders appear here for your team to fulfill—no
        payment is collected on the site.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            tab === "items" ? "bg-primary text-white" : "bg-card text-secondary hover:bg-muted/50"
          }`}
        >
          Listings
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            tab === "orders" ? "bg-primary text-white" : "bg-card text-secondary hover:bg-muted/50"
          }`}
        >
          Orders
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

      <div className="mt-4">
        {tab === "items" ? (
          <Table
            columns={itemColumns}
            data={items}
            rowKey="id"
            loading={loading}
            emptyMessage="No platform listings."
            onRefresh={load}
            responsive
          />
        ) : (
          <Table
            columns={orderColumns}
            data={orders}
            rowKey="id"
            loading={loading}
            emptyMessage="No orders yet."
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
            <Button type="submit" form="admin-mp-item-form" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="admin-mp-item-form" onSubmit={submitItem} className="flex flex-col gap-3 !space-y-0">
          <Input
            label="Seller display name"
            value={form.shopNameSnapshot}
            onChange={(e) => setForm((f) => ({ ...f, shopNameSnapshot: e.target.value }))}
            placeholder="MotorsWinding.com"
          />
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
            />
            <Input
              label="Condition"
              value={form.condition}
              onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-secondary">Photos</p>
            <p className="mb-2 text-xs text-secondary">
              Up to 10 images. Upload files or paste URLs — they appear on the public marketplace listing.
            </p>
            {form.images.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div
                    key={`${url}-${i}`}
                    className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded bg-card/95 p-1 text-danger shadow-sm ring-1 ring-border hover:bg-card"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          images: f.images.filter((_, j) => j !== i),
                        }))
                      }
                      aria-label="Remove photo"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                multiple
                className="hidden"
                onChange={onImageFiles}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingImage || form.images.length >= 10}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5"
              >
                {uploadingImage ? (
                  "Uploading…"
                ) : (
                  <>
                    <FiUpload className="h-4 w-4" />
                    Upload photos
                  </>
                )}
              </Button>
              <span className="text-xs text-secondary">{form.images.length}/10</span>
            </div>
            <Textarea
              label="Image URLs (optional, one per line)"
              value={form.images.join("\n")}
              onChange={(e) => setForm((f) => ({ ...f, images: parseImagesText(e.target.value) }))}
              rows={3}
              placeholder="https://… or leave blank if you only use uploads"
            />
          </div>
        </Form>
      </Modal>
      </div>
    </div>
  );
}
