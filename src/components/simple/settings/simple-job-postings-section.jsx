"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiArrowLeft, FiEdit2, FiPlus, FiExternalLink, FiX, FiUsers } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import { Form, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { STATUS_LABELS, EMPLOYMENT_LABELS, EXPERIENCE_LABELS } from "@/lib/job-posting-labels";
import { sortRowsClient } from "@/lib/client-table-sort";
import { useFormatDateTime } from "@/contexts/user-settings-context";
import JobPostingFormFields from "@/components/job-postings/job-posting-form-fields";

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

function statusVariant(status) {
  if (status === "open") return "success";
  if (status === "closed") return "default";
  return "warning";
}

export default function SimpleJobPostingsSection() {
  const alert = useAlert();
  const formatDateTime = useFormatDateTime();
  const confirm = useConfirm();
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

  const [applicantsJobId, setApplicantsJobId] = useState(null);
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/job-postings", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      await alert({
        title: "Error",
        message: e.message || "Failed to load job postings",
        variant: "danger",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [alert]);

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

  const getJobPostingSortValue = useCallback((row, key) => {
    if (key === "updatedAt") {
      const t = row?.updatedAt ? new Date(row.updatedAt).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    return row?.[key];
  }, []);

  const [tableSort, setTableSort] = useState({ key: null, direction: "asc" });
  const sortedFilteredRows = useMemo(
    () => sortRowsClient(filteredRows, tableSort, getJobPostingSortValue),
    [filteredRows, tableSort, getJobPostingSortValue]
  );
  const handleTableSort = useCallback((key, direction) => setTableSort({ key, direction }), []);

  useEffect(() => {
    load();
  }, [load]);

  const openApplicants = useCallback(
    async (row) => {
      const id = row?.id;
      if (!id) return;
      setApplicantsJobId(id);
      setApplicantsLoading(true);
      setApplicantsJob(null);
      setApplications([]);
      try {
        const [jobRes, appRes] = await Promise.all([
          fetch(`/api/dashboard/job-postings/${id}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/dashboard/job-postings/${id}/applications`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const jobData = await jobRes.json();
        const appData = await appRes.json();
        if (!jobRes.ok) throw new Error(jobData.error || "Failed to load");
        setApplicantsJob(jobData);
        setApplications(appRes.ok && Array.isArray(appData) ? appData : []);
      } catch (e) {
        await alert({ title: "Error", message: e.message || "Failed to load applicants", variant: "danger" });
        setApplicantsJobId(null);
      } finally {
        setApplicantsLoading(false);
      }
    },
    [alert]
  );

  const closeApplicants = () => {
    setApplicantsJobId(null);
    setApplicantsJob(null);
    setApplications([]);
  };

  const openEditModal = useCallback(
    async (row) => {
      const id = row?.id;
      if (!id) return;
      setEditId(id);
      setEditModalOpen(true);
      setEditLoading(true);
      try {
        const res = await fetch(`/api/dashboard/job-postings/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setEditForm(formFromJob(data));
        setEditMeta({
          slug: data.slug || "",
          status: data.status || "",
          listedOnMarketingSite: !!data.listedOnMarketingSite,
        });
      } catch (e) {
        await alert({ title: "Error", message: e.message || "Failed to load job", variant: "danger" });
        setEditModalOpen(false);
        setEditId(null);
      } finally {
        setEditLoading(false);
      }
    },
    [alert]
  );

  const closeEditModal = useCallback(() => {
    setEditModalOpen(false);
    setEditId(null);
    setEditForm(EMPTY_FORM);
    setEditMeta({ slug: "", status: "", listedOnMarketingSite: false });
  }, []);

  const confirmDeleteTwice = async (title) => {
    const ok1 = await confirm({
      title: title || "Delete this job posting?",
      message: "Applications for this role will also be removed. This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok1) return false;
    const ok2 = await confirm({
      title: "Confirm delete",
      message: "Are you sure? This posting and its applications will be permanently removed.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    return !!ok2;
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.title?.trim()) {
      await alert({ title: "Title required", message: "Title is required.", variant: "danger" });
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
      await alert({ title: "Saved", message: "Job posting updated." });
      setEditMeta((m) => ({
        ...m,
        ...(data.job?.slug ? { slug: data.job.slug } : {}),
        status: data.job?.status ?? m.status,
        listedOnMarketingSite: data.job?.listedOnMarketingSite ?? m.listedOnMarketingSite,
      }));
      await load();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed", variant: "danger" });
    } finally {
      setEditSaving(false);
    }
  };

  const handleEditDelete = async () => {
    if (!(await confirmDeleteTwice())) return;
    try {
      const res = await fetch(`/api/dashboard/job-postings/${editId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await alert({ title: "Deleted", message: "Job posting deleted." });
      closeEditModal();
      if (applicantsJobId === editId) closeApplicants();
      await load();
    } catch (e) {
      await alert({ title: "Error", message: e.message || "Failed to delete", variant: "danger" });
    }
  };

  const handleDeleteRow = useCallback(
    async (row) => {
      const id = row?.id;
      if (!id) return;
      if (!(await confirmDeleteTwice())) return;
      try {
        const res = await fetch(`/api/dashboard/job-postings/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        await alert({ title: "Deleted", message: "Job posting deleted." });
        if (editId === id) closeEditModal();
        if (applicantsJobId === id) closeApplicants();
        await load();
      } catch (e) {
        await alert({ title: "Error", message: e.message || "Failed to delete", variant: "danger" });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- confirmDeleteTwice uses confirm
    [alert, load, editId, closeEditModal, applicantsJobId, confirm]
  );

  const columns = useMemo(
    () => [
      {
        key: "edit",
        label: "",
        render: (_, row) => {
          const count = typeof row.applicationCount === "number" ? row.applicationCount : 0;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => openApplicants(row)}
                className="rounded p-1.5 text-primary hover:bg-primary/10"
                aria-label={`View applicants (${count})`}
                title={`Applicants (${count})`}
              >
                <FiUsers className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="rounded p-1.5 text-primary hover:bg-primary/10"
                aria-label="Edit job posting"
              >
                <FiEdit2 className="h-4 w-4" />
              </button>
            </div>
          );
        },
      },
      {
        key: "title",
        label: "Role",
        sortable: true,
        render: (val, row) => (
          <button
            type="button"
            onClick={() => openApplicants(row)}
            className="text-left font-medium text-primary hover:underline"
          >
            {val || "—"}
          </button>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => (
          <Badge variant={statusVariant(v)} className="rounded-full px-2.5 py-0.5 text-xs">
            {STATUS_LABELS[v] || v}
          </Badge>
        ),
      },
      {
        key: "location",
        label: "Location",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "listedOnMarketingSite",
        label: "On careers site",
        sortable: true,
        render: (v) =>
          v ? <span className="text-title">Yes</span> : <span className="text-secondary">No</span>,
      },
      {
        key: "applicationCount",
        label: "Applicants",
        sortable: true,
        render: (v) => (typeof v === "number" ? v : 0),
      },
      {
        key: "updatedAt",
        label: "Updated",
        sortable: true,
        render: (v) => (v ? formatDateTime(v) : "—"),
      },
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => handleDeleteRow(row)}
            className="rounded p-1.5 text-danger hover:bg-danger/10"
            aria-label="Delete job posting"
          >
            <FiX className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [openEditModal, handleDeleteRow, openApplicants, formatDateTime]
  );

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title?.trim()) {
      await alert({ title: "Title required", message: "Title is required.", variant: "danger" });
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
      await alert({ title: "Created", message: "Job posting created." });
      setCreateModalOpen(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed", variant: "danger" });
    } finally {
      setSaving(false);
    }
  }

  const getApplicantSortValue = useCallback((row, key) => {
    if (key === "createdAt") {
      const t = row?.createdAt ? new Date(row.createdAt).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    return row?.[key];
  }, []);

  const [appSort, setAppSort] = useState({ key: null, direction: "asc" });
  const sortedApplications = useMemo(
    () => sortRowsClient(applications, appSort, getApplicantSortValue),
    [applications, appSort, getApplicantSortValue]
  );
  const handleAppSort = useCallback((key, direction) => setAppSort({ key, direction }), []);

  const appColumns = useMemo(
    () => [
      {
        key: "applicantName",
        label: "Applicant",
        sortable: true,
        render: (v, row) => (
          <div>
            <div className="font-medium text-title">{v}</div>
            <a href={`mailto:${row.applicantEmail}`} className="text-sm text-primary hover:underline">
              {row.applicantEmail}
            </a>
          </div>
        ),
      },
      { key: "applicantPhone", label: "Phone", sortable: true, render: (v) => v || "—" },
      {
        key: "experienceText",
        label: "Experience",
        sortable: true,
        render: (v) => (
          <p className="line-clamp-4 max-w-[33.6rem] whitespace-pre-wrap text-sm text-secondary" title={v}>
            {v || "—"}
          </p>
        ),
      },
      {
        key: "createdAt",
        label: "Applied",
        sortable: true,
        render: (v) => (v ? formatDateTime(v) : "—"),
      },
    ],
    [formatDateTime]
  );

  if (applicantsJobId) {
    return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8">
        <FormContainer>
          <button
            type="button"
            onClick={closeApplicants}
            className="inline-flex items-center gap-1 text-sm text-secondary hover:text-primary"
          >
            <FiArrowLeft className="h-4 w-4 shrink-0" />
            Job postings
          </button>
          {applicantsLoading ? (
            <p className="mt-3 text-sm text-secondary">Loading…</p>
          ) : applicantsJob ? (
            <>
              <FormSectionTitle as="h2" className="mt-3">
                {applicantsJob.title}
              </FormSectionTitle>
              <p className="mt-1 text-sm text-secondary">Applicants for this posting.</p>
              <p className="mt-2 text-sm text-secondary">
                Careers URL:{" "}
                <a
                  href={`/careers/${applicantsJob.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  /careers/{applicantsJob.slug}
                  <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                {applicantsJob.status === "open" && applicantsJob.listedOnMarketingSite
                  ? ""
                  : " (hidden until open and listed)"}
              </p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal({ id: applicantsJobId })}
                  className="inline-flex items-center gap-1.5"
                >
                  <FiEdit2 className="h-4 w-4 shrink-0" />
                  Edit posting
                </Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-secondary">Job not found.</p>
          )}
        </FormContainer>

        {!applicantsLoading && applicantsJob ? (
          <>
            <h3 className="text-sm font-semibold text-title">
              Applicants ({applications.length})
            </h3>
            <Table
              columns={appColumns}
              data={sortedApplications}
              rowKey="id"
              loading={false}
              emptyMessage="No applications yet."
              sortState={appSort}
              onSort={handleAppSort}
              responsive
            />
          </>
        ) : null}

        <Modal
          open={editModalOpen}
          onClose={closeEditModal}
          title="Edit job posting"
          size="lg"
          actions={
            editLoading ? null : (
              <>
                <Button type="button" variant="danger" size="sm" onClick={handleEditDelete}>
                  Delete
                </Button>
                <Button
                  type="submit"
                  form="simple-job-edit-form"
                  variant="primary"
                  size="sm"
                  disabled={editSaving}
                >
                  {editSaving ? "Saving…" : "Save"}
                </Button>
              </>
            )
          }
        >
          {editLoading ? (
            <p className="py-8 text-center text-secondary">Loading…</p>
          ) : (
            <Form
              id="simple-job-edit-form"
              onSubmit={handleEditSave}
              className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto !space-y-0"
            >
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
                    <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                  {editMeta.status === "open" && editMeta.listedOnMarketingSite
                    ? ""
                    : " (hidden until open + listed on careers site)"}
                </p>
              ) : null}
              <JobPostingFormFields form={editForm} setForm={setEditForm} />
            </Form>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8">
      <FormContainer>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <FormSectionTitle as="h2">Job postings</FormSectionTitle>
            <p className="mt-1 text-sm text-secondary max-w-xl">
              Open roles; list on the public{" "}
              <a
                href="/careers"
                className="font-medium text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Careers
              </a>{" "}
              page when enabled.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            New posting
          </Button>
        </div>
      </FormContainer>

      <Table
        columns={columns}
        data={sortedFilteredRows}
        rowKey="id"
        loading={loading}
        sortState={tableSort}
        onSort={handleTableSort}
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

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="New job posting"
        size="lg"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="simple-job-create-form"
              variant="primary"
              size="sm"
              disabled={saving}
            >
              {saving ? "Saving…" : "Create"}
            </Button>
          </>
        }
      >
        <Form
          id="simple-job-create-form"
          onSubmit={handleCreate}
          className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto !space-y-0"
        >
          <JobPostingFormFields form={form} setForm={setForm} />
        </Form>
      </Modal>

      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit job posting"
        size="lg"
        actions={
          editLoading ? null : (
            <>
              <Button type="button" variant="danger" size="sm" onClick={handleEditDelete}>
                Delete
              </Button>
              <Button
                type="submit"
                form="simple-job-edit-form"
                variant="primary"
                size="sm"
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </>
          )
        }
      >
        {editLoading ? (
          <p className="py-8 text-center text-secondary">Loading…</p>
        ) : (
          <Form
            id="simple-job-edit-form"
            onSubmit={handleEditSave}
            className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto !space-y-0"
          >
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
                  <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
                {editMeta.status === "open" && editMeta.listedOnMarketingSite
                  ? ""
                  : " (hidden until open + listed on careers site)"}
              </p>
            ) : null}
            <JobPostingFormFields form={editForm} setForm={setEditForm} />
          </Form>
        )}
      </Modal>
    </div>
  );
}
