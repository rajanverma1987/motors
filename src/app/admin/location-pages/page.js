"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiEye, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
const LOCATION_PAGE_PATH = "/motor-repair-shop";

export default function AdminLocationPagesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    metaDescription: "",
    city: "",
    state: "",
    zip: "",
    status: "active",
  });

  const fetchPages = useCallback(() => {
    return fetch("/api/location-pages", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setPages(Array.isArray(data) ? data : []);
      })
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchPages();
  }, [fetchPages]);

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
      setForm({ slug: "", title: "", metaDescription: "", city: "", state: "", zip: "", status: "active" });
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
    { key: "slug", label: "Slug" },
    { key: "title", label: "Title" },
    {
      key: "area",
      label: "Area",
      render: (_, row) => [row.city, row.state].filter(Boolean).join(", ") || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (val) => (
        <Badge variant={val === "active" ? "success" : "warning"}>{val}</Badge>
      ),
    },
  ];

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">SEO location pages</h1>
        <p className="mt-1 text-sm text-secondary">
          Create pages like &quot;Motor repair shop in Atlanta, Georgia&quot;. They appear at /motor-repair-shop/[slug] and show listings in that area.
        </p>
      </div>

      <Form onSubmit={handleSubmit} className="mt-8 max-w-2xl shrink-0">
        <h2 className="text-lg font-semibold text-title">Add location page</h2>
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
            <label className="block text-sm font-medium text-title mb-1">Status</label>
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
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Creating…" : "Create location page"}
        </Button>
      </Form>

      <div className="mt-8 flex min-h-0 min-w-0 flex-1 flex-col">
        <h2 className="mb-3 shrink-0 text-lg font-semibold text-title">Existing pages</h2>
        <Table
          columns={columns}
          data={pages}
          rowKey="id"
          loading={loading}
          emptyMessage="No location pages yet. Create one above."
        />
      </div>
    </div>
  );
}
