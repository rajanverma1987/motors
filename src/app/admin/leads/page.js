"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FiDownload, FiEye, FiMail, FiTrash2, FiUserPlus } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

const MAX_ASSIGNMENTS = 3;
const FOLLOW_UP_FORM_ID = "admin-lead-follow-up-email-form";

function csvEscape(val) {
  const s = val == null ? "" : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildLeadsCsv(leads) {
  const headers = [
    "id",
    "name",
    "email",
    "phone",
    "company",
    "city",
    "zipCode",
    "motorType",
    "motorHp",
    "voltage",
    "urgencyLevel",
    "problemDescription",
    "message",
    "sourceListingId",
    "sourceListingName",
    "assignedListingIds",
    "assignedToNames",
    "leadSource",
    "status",
    "createdAt",
  ];
  const rows = leads.map((l) => {
    const srcId = l.sourceListingId || "";
    const ids = l.assignedListingIds || [];
    const assignNames = (l.assignedToNames || []).filter(Boolean).join("; ");
    return [
      l.id,
      l.name,
      l.email,
      l.phone,
      l.company,
      l.city,
      l.zipCode,
      l.motorType,
      l.motorHp,
      l.voltage,
      l.urgencyLevel,
      l.problemDescription,
      l.message,
      srcId,
      l.sourceListingName || "",
      ids.join("; "),
      assignNames,
      l.leadSource || "",
      l.status || "",
      l.createdAt ? new Date(l.createdAt).toISOString() : "",
    ].map(csvEscape);
  });
  const body = [headers.map(csvEscape).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return `\uFEFF${body}`;
}

export default function AdminLeadsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [leads, setLeads] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [assignIds, setAssignIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailingLead, setMailingLead] = useState(null);
  const [mailDraftLoading, setMailDraftLoading] = useState(false);
  const [mailSending, setMailSending] = useState(false);
  const emptyMailForm = () => ({
    shop: { to: "", subject: "", body: "" },
    lead: { to: "", subject: "", body: "" },
  });
  const [mailForm, setMailForm] = useState(emptyMailForm);
  const { tableSort, handleTableSort } = useAdminTableSort("createdAt", "desc");

  const onTableSort = useCallback(
    (key, direction) => {
      setPage(1);
      handleTableSort(key, direction);
    },
    [handleTableSort]
  );

  const openViewModal = (lead) => {
    setViewingLead(lead);
    setViewModalOpen(true);
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingLead(null);
  };

  const listingMap = useMemo(() => {
    const m = {};
    listings.forEach((l) => {
      m[l.id] = l.companyName || l.id;
    });
    return m;
  }, [listings]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leads?${appendAdminSortParams(new URLSearchParams({ page: String(page), pageSize: String(pageSize) }), tableSort).toString()}`, { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      fetch("/api/listings?status=approved&page=1&pageSize=100", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([leadsData, listingsData]) => {
        setLeads(Array.isArray(leadsData?.items) ? leadsData.items : []);
        setTotalCount(Number(leadsData?.totalCount) || 0);
        setListings(Array.isArray(listingsData?.items) ? listingsData.items : []);
      })
      .catch(() => {
        setLeads([]);
        setTotalCount(0);
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, tableSort]);

  const openAssignModal = (lead) => {
    setAssigningLead(lead);
    setAssignIds(lead.assignedListingIds || []);
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setAssigningLead(null);
    setAssignIds([]);
  };

  const closeMailModal = () => {
    setMailModalOpen(false);
    setMailingLead(null);
    setMailDraftLoading(false);
    setMailSending(false);
    setMailForm(emptyMailForm());
  };

  const openMailModal = async (lead) => {
    if (!lead?.id) return;
    setMailingLead(lead);
    setMailModalOpen(true);
    setMailDraftLoading(true);
    setMailForm(emptyMailForm());
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(lead.id)}/follow-up-email`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not load email draft");
      }
      setMailForm({
        shop: {
          to: data.shop?.to || "",
          subject: data.shop?.subject || "",
          body: data.shop?.body || "",
        },
        lead: {
          to: data.lead?.to || "",
          subject: data.lead?.subject || "",
          body: data.lead?.body || "",
        },
      });
      if (data.warning) toast.error(data.warning);
    } catch (err) {
      toast.error(err.message || "Could not load email draft");
      setMailModalOpen(false);
      setMailingLead(null);
    } finally {
      setMailDraftLoading(false);
    }
  };

  const patchMailSection = (section, field, value) => {
    setMailForm((f) => ({
      ...f,
      [section]: { ...f[section], [field]: value },
    }));
  };

  const mailReady =
    Boolean(mailForm.shop.to.trim()) &&
    Boolean(mailForm.shop.subject.trim()) &&
    Boolean(mailForm.shop.body.trim()) &&
    Boolean(mailForm.lead.to.trim()) &&
    Boolean(mailForm.lead.subject.trim()) &&
    Boolean(mailForm.lead.body.trim());

  const handleSendFollowUpEmail = async (e) => {
    e.preventDefault();
    if (!mailingLead?.id || mailSending) return;
    if (!mailReady) {
      toast.error("Both shop and lead To, subject, and body are required.");
      return;
    }
    setMailSending(true);
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(mailingLead.id)}/follow-up-email`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop: {
            to: mailForm.shop.to.trim(),
            subject: mailForm.shop.subject.trim(),
            body: mailForm.shop.body.trim(),
          },
          lead: {
            to: mailForm.lead.to.trim(),
            subject: mailForm.lead.subject.trim(),
            body: mailForm.lead.body.trim(),
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      toast.success(data.message || "Follow-up emails sent.");
      closeMailModal();
    } catch (err) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setMailSending(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!leads.length) {
      toast.error("No leads to export.");
      return;
    }
    try {
      const csv = buildLeadsCsv(leads);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded.");
    } catch (e) {
      toast.error(e.message || "Export failed");
    }
  };

  const handleSaveAssignments = async () => {
    if (!assigningLead || assignIds.length > MAX_ASSIGNMENTS) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${assigningLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assignedListingIds: assignIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setLeads((prev) =>
        prev.map((l) =>
          l.id === assigningLead.id
            ? {
                ...l,
                assignedListingIds: assignIds,
                assignedToNames: assignIds.map((id) => listingMap[id] || ""),
              }
            : l
        )
      );
      toast.success("Assignments updated.");
      closeAssignModal();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = useCallback(
    async (lead) => {
      if (!lead?.id || deletingId) return;
      const label = [lead.name, lead.email].filter(Boolean).join(", ") || "this lead";
      const first = await confirm({
        title: "Delete lead?",
        message: `Delete ${label}? This cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!first) return;
      const second = await confirm({
        title: "Confirm permanent delete",
        message: "Are you sure? The lead and its assignment history will be permanently removed.",
        confirmLabel: "Delete permanently",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!second) return;
      setDeletingId(lead.id);
      try {
        const res = await fetch(`/api/leads/${lead.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to delete");
        setLeads((prev) => prev.filter((l) => l.id !== lead.id));
        setTotalCount((n) => Math.max(0, n - 1));
        if (viewingLead?.id === lead.id) closeViewModal();
        if (assigningLead?.id === lead.id) closeAssignModal();
        if (mailingLead?.id === lead.id) closeMailModal();
        toast.success("Lead deleted.");
      } catch (err) {
        toast.error(err.message || "Failed to delete");
      } finally {
        setDeletingId("");
      }
    },
    [assigningLead?.id, confirm, deletingId, mailingLead?.id, toast, viewingLead?.id]
  );

  const listingOptions = useMemo(
    () =>
      listings
        .filter((l) => l.status === "approved")
        .map((l) => ({ value: l.id, label: `${l.companyName} (${[l.city, l.state].filter(Boolean).join(", ") || "—"})` })),
    [listings]
  );

  const COLUMNS = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openViewModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="View"
            >
              <FiEye className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openAssignModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Assign"
              title="Assign"
            >
              <FiUserPlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openMailModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Email follow-up"
              title="Email shop and lead follow-up"
            >
              <FiMail className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteLead(row)}
              disabled={deletingId === row.id}
              className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
              aria-label="Delete"
              title="Delete"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      { key: "name", label: "Name", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "source",
        label: "Source",
        sortable: true,
        render: (_, row) => row.sourceListingName || "—",
      },
      {
        key: "assignedTo",
        label: "Assigned to",
        sortable: true,
        render: (_, row) => {
          const names = (row.assignedToNames || []).filter(Boolean);
          return names.length ? names.join(", ") : "—";
        },
      },
      {
        key: "createdAt",
        label: "Submitted",
        sortable: true,
        render: (val) => (val ? new Date(val).toLocaleString() : "—"),
      },
    ],
    [deletingId, handleDeleteLead]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-title">Leads</h1>
            <p className="mt-1 text-sm text-secondary">
              RFQs from public listing pages are tied to that listing and auto-assigned to the company. You can
              also assign each lead to up to {MAX_ASSIGNMENTS} repair companies.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={handleDownloadCsv}
            disabled={loading || leads.length === 0}
          >
            <FiDownload className="mr-1.5 h-4 w-4" aria-hidden />
            Download CSV
          </Button>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={COLUMNS}
          data={leads}
          rowKey="id"
          loading={loading}
          emptyMessage="No leads yet."
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

      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Lead details"
        size="lg"
        actions={
          <>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={!viewingLead || deletingId === viewingLead?.id}
              onClick={() => handleDeleteLead(viewingLead)}
            >
              {deletingId === viewingLead?.id ? "Deleting…" : "Delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                closeViewModal();
                openMailModal(viewingLead);
              }}
            >
              Email follow-up
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                closeViewModal();
                openAssignModal(viewingLead);
              }}
            >
              Assign
            </Button>
          </>
        }
      >
        {viewingLead && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Lead information</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-secondary">Name</dt><dd className="font-medium text-title">{viewingLead.name || "—"}</dd></div>
                <div><dt className="text-secondary">Company</dt><dd className="text-title">{viewingLead.company || "—"}</dd></div>
                <div><dt className="text-secondary">Email</dt><dd className="text-title">{viewingLead.email || "—"}</dd></div>
                <div><dt className="text-secondary">Phone</dt><dd className="text-title">{viewingLead.phone || "—"}</dd></div>
                <div><dt className="text-secondary">City / location</dt><dd className="text-title">{viewingLead.city || "—"}</dd></div>
                <div><dt className="text-secondary">Zip code</dt><dd className="text-title">{viewingLead.zipCode || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Motor details</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-secondary">Motor type</dt><dd className="text-title">{viewingLead.motorType || "—"}</dd></div>
                <div><dt className="text-secondary">Motor HP</dt><dd className="text-title">{viewingLead.motorHp || "—"}</dd></div>
                <div><dt className="text-secondary">Voltage</dt><dd className="text-title">{viewingLead.voltage || "—"}</dd></div>
                <div><dt className="text-secondary">Urgency</dt><dd className="text-title">{viewingLead.urgencyLevel ? String(viewingLead.urgencyLevel).charAt(0).toUpperCase() + String(viewingLead.urgencyLevel).slice(1) : "—"}</dd></div>
              </dl>
              {(viewingLead.problemDescription || viewingLead.message) && (
                <div className="mt-2">
                  <dt className="text-secondary text-xs font-semibold uppercase tracking-wide">Problem description</dt>
                  <dd className="mt-1 text-sm text-title whitespace-pre-wrap">{viewingLead.problemDescription || viewingLead.message}</dd>
                </div>
              )}
            </div>
            {Array.isArray(viewingLead.motorPhotos) && viewingLead.motorPhotos.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Motor photos</h3>
                <div className="flex flex-wrap gap-2">
                  {viewingLead.motorPhotos.map((url, i) => (
                    <a key={i} href={url.startsWith("http") ? url : url.startsWith("/") ? url : `/${url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      Photo {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Assignment</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-secondary">Source listing</dt><dd className="text-title">{viewingLead.sourceListingName || "—"}</dd></div>
                <div><dt className="text-secondary">Assigned to (max 3)</dt><dd className="text-title">{((viewingLead.assignedToNames || []).filter(Boolean).join(", ")) || "—"}</dd></div>
              </dl>
            </div>
            {viewingLead.createdAt && (
              <p className="border-t border-border pt-4 text-xs text-secondary">
                Submitted {new Date(viewingLead.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={assignModalOpen}
        onClose={closeAssignModal}
        title="Assign lead to companies"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveAssignments}
              disabled={saving || assignIds.length > MAX_ASSIGNMENTS}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {assigningLead && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-secondary">
              Lead from <strong>{assigningLead.name}</strong> ({assigningLead.email}). Select up to {MAX_ASSIGNMENTS} companies to send this lead to.
            </p>
            <Select
              label="Companies (max 3)"
              options={listingOptions}
              value={assignIds}
              onChange={(e) => {
                const next = e.target.value;
                const arr = Array.isArray(next) ? next : next ? [next] : [];
                setAssignIds(arr.slice(0, MAX_ASSIGNMENTS));
              }}
              multiple
              searchable
              placeholder="Select up to 3 companies"
            />
          </div>
        )}
      </Modal>

      <Modal
        open={mailModalOpen}
        onClose={() => {
          if (!mailSending && !mailDraftLoading) closeMailModal();
        }}
        title="Lead follow-up emails"
        size="4xl"
        width="min(920px, 96vw)"
        showClose={!mailSending && !mailDraftLoading}
        closeOnOutsideClick={!mailSending && !mailDraftLoading}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={mailSending || mailDraftLoading}
              onClick={closeMailModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={FOLLOW_UP_FORM_ID}
              variant="primary"
              size="sm"
              disabled={mailSending || mailDraftLoading || !mailReady}
            >
              {mailSending ? "Sending…" : "Send both emails"}
            </Button>
          </>
        }
      >
        {mailDraftLoading ? (
          <p className="text-sm text-secondary">Loading drafts…</p>
        ) : (
          <Form
            id={FOLLOW_UP_FORM_ID}
            onSubmit={handleSendFollowUpEmail}
            className="flex flex-col gap-5 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          >
            <p className="text-sm text-secondary">
              Sends two emails at once: a shop check-in on the lead, and a customer check-in on connection plus an
              IQMotorBase rating. Edit either draft before sending.
            </p>
            {mailingLead ? (
              <p className="text-xs text-secondary">
                Lead: <span className="font-medium text-title">{mailingLead.name || "—"}</span>
                {mailingLead.createdAt
                  ? ` · ${new Date(mailingLead.createdAt).toLocaleDateString()}`
                  : ""}
              </p>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold text-title">Email to shop</h3>
                <p className="text-xs text-secondary">
                  Asks if they received the lead, connected with the customer, and converted the job.
                </p>
                <Input
                  label="To"
                  name="shopFollowUpTo"
                  value={mailForm.shop.to}
                  onChange={(e) => patchMailSection("shop", "to", e.target.value)}
                  placeholder="shop@example.com"
                  help="Comma-separated shop login / notification emails."
                  required
                  disabled={mailSending}
                />
                <Input
                  label="Subject"
                  name="shopFollowUpSubject"
                  value={mailForm.shop.subject}
                  onChange={(e) => patchMailSection("shop", "subject", e.target.value)}
                  required
                  disabled={mailSending}
                />
                <Textarea
                  label="Body"
                  name="shopFollowUpBody"
                  value={mailForm.shop.body}
                  onChange={(e) => patchMailSection("shop", "body", e.target.value)}
                  rows={12}
                  required
                  disabled={mailSending}
                  textareaClassName="min-h-[14rem] font-mono text-sm"
                />
              </section>

              <section className="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-3">
                <h3 className="text-sm font-semibold text-title">Email to lead</h3>
                <p className="text-xs text-secondary">
                  Asks if the shop connected with them, and how they would rate IQMotorBase.
                </p>
                <Input
                  label="To"
                  name="leadFollowUpTo"
                  value={mailForm.lead.to}
                  onChange={(e) => patchMailSection("lead", "to", e.target.value)}
                  placeholder="customer@example.com"
                  required
                  disabled={mailSending}
                />
                <Input
                  label="Subject"
                  name="leadFollowUpSubject"
                  value={mailForm.lead.subject}
                  onChange={(e) => patchMailSection("lead", "subject", e.target.value)}
                  required
                  disabled={mailSending}
                />
                <Textarea
                  label="Body"
                  name="leadFollowUpBody"
                  value={mailForm.lead.body}
                  onChange={(e) => patchMailSection("lead", "body", e.target.value)}
                  rows={12}
                  required
                  disabled={mailSending}
                  textareaClassName="min-h-[14rem] font-mono text-sm"
                />
              </section>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
