"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiEdit2, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import JobPostingFormFields from "@/components/job-postings/job-posting-form-fields";
import { STATUS_LABELS, EMPLOYMENT_LABELS } from "@/lib/job-posting-labels";

const CREATE_FORM_ID = "admin-job-posting-create-form";
const EDIT_FORM_ID = "admin-job-posting-edit-form";

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  department: "",
  employmentType: "full_time",
  experienceLevel: "any",
  salaryDisplay: "",
  responsibilities: "",
  qualifications: "",
  benefits: "",
  status: "open",
  listedOnMarketingSite: true,
};

function formFromJob(data) {
  if (!data) return { ...EMPTY_FORM };
  return {
    title: data.title || "",
    description: data.description || "",
    location: data.location || "",
    department: data.department || "",
    employmentType: data.employmentType || "full_time",
    experienceLevel: data.experienceLevel || "any",
    salaryDisplay: data.salaryDisplay || "",
    responsibilities: data.responsibilities || "",
    qualifications: data.qualifications || "",
    benefits: data.benefits || "",
    status: data.status || "draft",
    listedOnMarketingSite: data.listedOnMarketingSite !== false,
  };
}

function statusVariant(status) {
  if (status === "open") return "success";
  if (status === "closed") return "default";
  return "warning";
}

function locationFromShop(shop) {
  if (!shop) return "";
  return [shop.city, shop.state].filter(Boolean).join(", ");
}

export default function AdminJobPostingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [shops, setShops] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shopsLoading, setShopsLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [listingId, setListingId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editMeta, setEditMeta] = useState({ slug: "", shopName: "", ownerEmail: "" });
  const [editSaving, setEditSaving] = useState(false);

  const shopOptions = useMemo(
    () => [
      { value: "", label: "Select a motor shop…" },
      ...shops.map((s) => ({ value: s.id, label: s.label })),
    ],
    [shops]
  );

  const selectedShop = useMemo(
    () => shops.find((s) => s.id === listingId) || null,
    [shops, listingId]
  );

  const loadShops = useCallback(async () => {
    setShopsLoading(true);
    try {
      const res = await fetch("/api/admin/job-postings?shops=1", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load shops");
      setShops(Array.isArray(data.shops) ? data.shops : []);
    } catch (err) {
      toast.error(err.message || "Failed to load shops");
      setShops([]);
    } finally {
      setShopsLoading(false);
    }
  }, [toast]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/job-postings", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load job postings");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      toast.error(err.message || "Failed to load job postings");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadShops();
    void loadItems();
  }, [loadShops, loadItems]);

  function openCreate() {
    setListingId("");
    setForm({ ...EMPTY_FORM });
    setCreateOpen(true);
  }

  function closeCreate() {
    if (saving) return;
    setCreateOpen(false);
  }

  function onShopChange(nextId) {
    setListingId(nextId);
    const shop = shops.find((s) => s.id === nextId);
    const loc = locationFromShop(shop);
    if (loc) {
      setForm((f) => (f.location.trim() ? f : { ...f, location: loc }));
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!listingId) {
      toast.error("Select a motor shop.");
      return;
    }
    if (!form.title?.trim()) {
      toast.error("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/job-postings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, listingId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Job posting created.");
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      setListingId("");
      await loadItems();
    } catch (err) {
      toast.error(err.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row) {
    setEditId(row.id);
    setEditForm(formFromJob(row));
    setEditMeta({
      slug: row.slug || "",
      shopName: row.shopName || "",
      ownerEmail: row.ownerEmail || "",
    });
    setEditOpen(true);
  }

  function closeEdit() {
    if (editSaving) return;
    setEditOpen(false);
    setEditId(null);
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editId) return;
    if (!editForm.title?.trim()) {
      toast.error("Title is required.");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/admin/job-postings/${editId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success("Job posting updated.");
      setEditOpen(false);
      setEditId(null);
      await loadItems();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(row) {
    const ok = await confirm({
      title: "Delete job posting?",
      message: `Delete “${row.title || "this posting"}” for ${row.shopName || row.ownerEmail || "this shop"}? This cannot be undone.`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: "Confirm delete",
      message: "Permanently delete this job posting?",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok2) return;
    try {
      const res = await fetch(`/api/admin/job-postings/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      toast.success("Job posting deleted.");
      if (editId === row.id) closeEdit();
      await loadItems();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        className: "w-24",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              title="Edit"
              aria-label="Edit job posting"
              onClick={() => openEdit(row)}
            >
              <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            {row.status === "open" && row.listedOnMarketingSite && row.slug ? (
              <Link
                href={`/careers/${row.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-primary hover:bg-primary/10"
                title="View on careers site"
                aria-label="View on careers site"
              >
                <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
            <button
              type="button"
              className="rounded p-1.5 text-danger hover:bg-danger/10"
              title="Delete"
              aria-label="Delete job posting"
              onClick={() => void handleDelete(row)}
            >
              <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "shopName",
        label: "Shop",
        sortable: true,
        render: (v, row) => (
          <div className="min-w-0">
            <div className="font-medium text-title">{v || "—"}</div>
            <div className="truncate text-xs text-secondary">{row.ownerEmail || ""}</div>
          </div>
        ),
      },
      {
        key: "title",
        label: "Title",
        sortable: true,
        render: (v) => <span className="font-medium text-title">{v || "—"}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => (
          <Badge variant={statusVariant(v)} className="rounded-full px-2.5 py-0.5 text-xs">
            {STATUS_LABELS[v] || v || "—"}
          </Badge>
        ),
      },
      {
        key: "employmentType",
        label: "Type",
        sortable: true,
        render: (v) => EMPLOYMENT_LABELS[v] || v || "—",
      },
      {
        key: "listedOnMarketingSite",
        label: "Careers",
        sortable: true,
        render: (v, row) =>
          v && row.status === "open" ? (
            <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
              Listed
            </Badge>
          ) : (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              Hidden
            </Badge>
          ),
      },
      {
        key: "location",
        label: "Location",
        sortable: true,
        render: (v) => v || "—",
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers stable enough for table
    [editId]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-title">Job postings</h1>
          <p className="mt-1 text-sm text-secondary">
            Post careers listings for any approved motor shop. Same fields as Dashboards → Settings → Job
            postings. The shop&apos;s listing email owns the posting.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5"
        >
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Post a job
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : (
        <Table
          columns={columns}
          data={items}
          rowKey="id"
          emptyMessage="No job postings yet. Click Post a job to create one for a listed shop."
          searchable
          dense
        />
      )}

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Post a job for a motor shop"
        size="3xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeCreate} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={CREATE_FORM_ID} variant="primary" size="sm" disabled={saving}>
              {saving ? "Posting…" : "Post job"}
            </Button>
          </>
        }
      >
        <Form id={CREATE_FORM_ID} onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Motor shop *"
            options={shopOptions}
            value={listingId}
            onChange={(e) => onShopChange(e.target.value)}
            searchable
            placeholder={shopsLoading ? "Loading shops…" : "Search by company, city, or email…"}
            disabled={shopsLoading || saving}
          />
          {selectedShop ? (
            <p className="text-xs text-secondary">
              Owner email: <span className="font-medium text-title">{selectedShop.email}</span>
              {selectedShop.urlSlug ? (
                <>
                  {" · "}
                  <Link
                    href={`/electric-motor-repair-shops-listings/${selectedShop.urlSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View listing
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}
          <JobPostingFormFields form={form} setForm={setForm} />
        </Form>
      </Modal>

      <Modal
        open={editOpen}
        onClose={closeEdit}
        title="Edit job posting"
        size="3xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeEdit} disabled={editSaving}>
              Cancel
            </Button>
            <Button type="submit" form={EDIT_FORM_ID} variant="primary" size="sm" disabled={editSaving}>
              {editSaving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id={EDIT_FORM_ID} onSubmit={handleEdit} className="space-y-4">
          <p className="text-sm text-secondary">
            Shop: <span className="font-medium text-title">{editMeta.shopName || "—"}</span>
            {editMeta.ownerEmail ? (
              <>
                {" "}
                · <span className="text-xs">{editMeta.ownerEmail}</span>
              </>
            ) : null}
            {editMeta.slug ? (
              <>
                {" · "}
                <Link
                  href={`/careers/${editMeta.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  /careers/{editMeta.slug}
                </Link>
              </>
            ) : null}
          </p>
          <JobPostingFormFields form={editForm} setForm={setEditForm} />
        </Form>
      </Modal>
    </div>
  );
}
