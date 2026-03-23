"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { FiEdit2, FiPlus, FiExternalLink, FiTrash2, FiUsers } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import Badge from "@/components/ui/badge";
import { STATUS_LABELS, EMPLOYMENT_LABELS, EXPERIENCE_LABELS } from "@/lib/job-posting-labels";
import JobPostingFormFields from "./job-posting-form-fields";

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
  status: "draft",
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
    listedOnMarketingSite: !!data.listedOnMarketingSite,
  };
}

export default function JobPostingsClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const openedEditFromQuery = useRef(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editMeta, setEditMeta] = useState({ slug: "", status: "", listedOnMarketingSite: false });
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/job-postings", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load job postings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const parts = [
        row.title,
        row.location,
        row.department,
        row.slug,
        STATUS_LABELS[row.status] || row.status,
        EMPLOYMENT_LABELS[row.employmentType] || row.employmentType,
        EXPERIENCE_LABELS[row.experienceLevel] || row.experienceLevel,
        row.salaryDisplay,
        row.listedOnMarketingSite ? "careers yes listed" : "no",
        String(row.applicationCount ?? ""),
      ];
      const hay = parts.filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const openEditModal = useCallback(
    async (row) => {
      const id = row?.id;
      if (!id) return;
      setEditId(id);
      setEditModalOpen(true);
      setEditLoading(true);
      try {
        const res = await fetch(`/api/dashboard/job-postings/${id}`, { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setEditForm(formFromJob(data));
        setEditMeta({
          slug: data.slug || "",
          status: data.status || "",
          listedOnMarketingSite: !!data.listedOnMarketingSite,
        });
      } catch (e) {
        toast.error(e.message || "Failed to load job");
        setEditModalOpen(false);
        setEditId(null);
      } finally {
        setEditLoading(false);
      }
    },
    [toast]
  );

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditId(null);
    setEditForm(EMPTY_FORM);
    setEditMeta({ slug: "", status: "", listedOnMarketingSite: false });
  }, []);

  /** Open edit modal when linked from applicants page: /dashboard/job-postings?edit=<id> */
  useEffect(() => {
    const q = searchParams.get("edit");
    if (!q || openedEditFromQuery.current || loading) return;
    if (!/^[a-f0-9]{24}$/i.test(q)) return;
    const row = rows.find((r) => r.id === q);
    if (!row) return;
    openedEditFromQuery.current = true;
    openEditModal(row);
    router.replace("/dashboard/job-postings", { scroll: false });
  }, [searchParams, rows, loading, openEditModal, router]);

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/dashboard/job-postings/${editId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Saved.");
      setEditMeta((m) => ({
        ...m,
        ...(data.job?.slug ? { slug: data.job.slug } : {}),
        status: data.job?.status ?? m.status,
        listedOnMarketingSite: data.job?.listedOnMarketingSite ?? m.listedOnMarketingSite,
      }));
      await load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditDelete = async () => {
    const ok = await confirm({
      title: "Delete this job posting?",
      message: "Applications for this role will also be removed. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/job-postings/${editId}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Deleted.");
      closeEditModal();
      await load();
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const handleDeleteRow = useCallback(
    async (row) => {
      const id = row?.id;
      if (!id) return;
      const ok = await confirm({
        title: "Delete this job posting?",
        message: "Applications for this role will also be removed. This cannot be undone.",
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/job-postings/${id}`, { method: "DELETE", credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        toast.success("Deleted.");
        if (editId === id) closeEditModal();
        await load();
      } catch (e) {
        toast.error(e.message || "Failed to delete");
      }
    },
    [confirm, toast, load, editId, closeEditModal]
  );

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Role",
        render: (val, row) => (
          <Link
            href={`/dashboard/job-postings/${row.id}`}
            className="font-medium text-primary hover:underline"
          >
            {val || "—"}
          </Link>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (v) => (
          <Badge variant={v === "open" ? "success" : v === "closed" ? "default" : "warning"}>
            {STATUS_LABELS[v] || v}
          </Badge>
        ),
      },
      {
        key: "location",
        label: "Location",
        render: (v) => v || "—",
      },
      {
        key: "listedOnMarketingSite",
        label: "On careers site",
        render: (v) => (v ? <span className="text-title">Yes</span> : <span className="text-secondary">No</span>),
      },
      {
        key: "updatedAt",
        label: "Updated",
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
      {
        key: "actions",
        label: "",
        render: (_, row) => {
          const count = typeof row.applicationCount === "number" ? row.applicationCount : 0;
          return (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href={`/dashboard/job-postings/${row.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs font-medium text-title hover:bg-muted/50 sm:text-sm"
              >
                <FiUsers className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                <span className="whitespace-nowrap">View applicants</span>
                <span className="rounded-full bg-primary/15 px-1.5 py-0 text-xs font-semibold text-primary tabular-nums">
                  {count}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10"
                aria-label="Edit job posting"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRow(row)}
                className="inline-flex rounded-md p-2 text-danger hover:bg-danger/10"
                aria-label="Delete job posting"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
    ],
    [openEditModal, handleDeleteRow]
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title?.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/job-postings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Job posting created.");
      setCreateModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-title">Job postings</h1>
          <p className="mt-1 text-sm text-secondary max-w-2xl mx-auto sm:mx-0">
            Create detailed roles for technicians, winders, and office staff. Open postings marked &quot;On careers
            site&quot; appear on the public{" "}
            <a href="/careers" className="text-primary font-medium hover:underline" target="_blank" rel="noreferrer">
              Careers
            </a>{" "}
            page so candidates can apply with their experience.
          </p>
        </div>
        <div className="flex w-full justify-center sm:w-auto sm:justify-end shrink-0">
          <Button
            type="button"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 whitespace-nowrap"
          >
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            New posting
          </Button>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredRows}
          rowKey="id"
          loading={loading}
          emptyMessage={
            rows.length === 0
              ? "No job postings yet. Create one to list on the careers site."
              : "No job postings match the search."
          }
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search role, location, status, applicants…"
          onRefresh={load}
          responsive
        />
      </div>

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="New job posting" size="lg">
        <Form onSubmit={handleCreate} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
          <JobPostingFormFields form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Saving…" : "Create posting"}
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal open={editModalOpen} onClose={closeEditModal} title="Edit job posting" size="lg">
        {editLoading ? (
          <p className="py-8 text-center text-secondary">Loading…</p>
        ) : (
          <Form onSubmit={handleEditSave} className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto">
            {editMeta.slug ? (
              <p className="text-sm text-secondary">
                Public URL:{" "}
                <a
                  href={`/careers/${editMeta.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  /careers/{editMeta.slug}
                  <FiExternalLink className="h-3.5 w-3.5" />
                </a>
                {editMeta.status === "open" && editMeta.listedOnMarketingSite
                  ? ""
                  : " (hidden until open + listed on careers site)"}
              </p>
            ) : null}
            <JobPostingFormFields form={editForm} setForm={setEditForm} />
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="danger" onClick={handleEditDelete} className="order-2 sm:order-1">
                <FiTrash2 className="mr-2 inline h-4 w-4" />
                Delete posting
              </Button>
              <div className="flex justify-end gap-2 order-1 sm:order-2">
                <Button type="submit" variant="primary" disabled={editSaving}>
                  {editSaving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}

