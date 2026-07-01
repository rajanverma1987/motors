"use client";

import { useState, useEffect, useCallback } from "react";
import { FiEye, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
const LOCATION_PAGE_PATH = "/motor-repair-shop";
const FORM_ID = "admin-location-page-form";

const EMPTY_FORM = {
  slug: "",
  title: "",
  metaDescription: "",
  city: "",
  state: "",
  zip: "",
  status: "active",
};

export default function AdminLocationPagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const { tableSort, handleTableSort } = useAdminTableSort("slug", "asc");

  const onTableSort = useCallback(
    (key, direction) => {
      setPage(1);
      handleTableSort(key, direction);
    },
    [handleTableSort]
  );

  const fetchPages = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    appendAdminSortParams(params, tableSort);
    return fetch(`/api/location-pages?${params.toString()}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPages(Array.isArray(data?.items) ? data.items : []);
        setTotalCount(Number(data?.totalCount) || 0);
      })
      .catch(() => {
        setPages([]);
        setTotalCount(0);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, tableSort]);

  useEffect(() => {
    setLoading(true);
    fetchPages();
  }, [fetchPages]);

  function openCreateModal() {
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setForm({ ...EMPTY_FORM });
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "title" && !form.slug) {
      const slug = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setForm((prev) => ({ ...prev, slug }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/location-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Location page created.");
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
      fetchPages();
    } catch (err) {
      toast.error(err.message || "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    const confirmed = await confirm({
      title: "Delete location page",
      message: "Delete this location page? This cannot be undone.",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/location-pages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Location page deleted.");
      fetchPages();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  }

  const columns = [
    {
      key: "view",
      label: "",
      render: (_, row) => (
        <a
          href={`${baseUrl}${LOCATION_PAGE_PATH}/${row.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="View"
        >
          <FiEye className="h-4 w-4" />
        </a>
      ),
    },
    {
      key: "delete",
      label: "",
      render: (_, row) => (
        <button
          type="button"
          onClick={() => handleDelete(row.id)}
          className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
          aria-label="Delete"
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      ),
    },
    { key: "slug", label: "Slug", sortable: true },
    { key: "title", label: "Title", sortable: true },
    {
      key: "area",
      label: "Area",
      sortable: true,
      render: (_, row) => [row.city, row.state].filter(Boolean).join(", ") || "—",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (val) => (
        <Badge variant={val === "active" ? "success" : "warning"} className="rounded-full px-2.5 py-0.5 text-xs">
          {val}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-title">SEO location pages</h1>
          <p className="mt-1 text-sm text-secondary">
            Create pages like &quot;Motor repair shop in Atlanta, Georgia&quot;. They appear at /motor-repair-shop/[slug]
            and show listings in that area.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="inline-flex shrink-0 items-center gap-1.5"
        >
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Add location page
        </Button>
      </div>

      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={pages}
          rowKey="id"
          loading={loading}
          emptyMessage="No location pages yet. Click Add location page to create one."
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title="Add location page"
        size="2xl"
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <Form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4 !space-y-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Slug (URL segment)"
              name="slug"
              value={form.slug}
              onChange={handleFormChange}
              placeholder="e.g. atlanta-georgia"
              required
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-title">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleFormChange}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              >
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <Input
            label="Title (H1 and meta title)"
            name="title"
            value={form.title}
            onChange={handleFormChange}
            placeholder="e.g. Motor Repair Shops in Atlanta, Georgia"
            required
          />
          <Textarea
            label="Meta description (optional)"
            name="metaDescription"
            value={form.metaDescription}
            onChange={handleFormChange}
            placeholder="Short description for search results"
            rows={2}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              name="city"
              value={form.city}
              onChange={handleFormChange}
              placeholder="e.g. Atlanta"
            />
            <Input
              label="State"
              name="state"
              value={form.state}
              onChange={handleFormChange}
              placeholder="e.g. Georgia"
            />
            <Input
              label="ZIP (optional)"
              name="zip"
              value={form.zip}
              onChange={handleFormChange}
              placeholder="e.g. 30301"
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
