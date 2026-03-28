"use client";

import { useState, useEffect, useMemo } from "react";
import { FiDownload, FiEye, FiUserPlus } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";

const MAX_ASSIGNMENTS = 3;

function csvEscape(val) {
  const s = val == null ? "" : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildLeadsCsv(leads, listingMap) {
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
    const assignNames = ids.map((id) => listingMap[id] || id).join("; ");
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
      srcId ? listingMap[srcId] || "" : "",
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
  const [leads, setLeads] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningLead, setAssigningLead] = useState(null);
  const [assignIds, setAssignIds] = useState([]);
  const [saving, setSaving] = useState(false);

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
    Promise.all([
      fetch("/api/leads", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
      fetch("/api/listings", { credentials: "include", cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([leadsData, listingsData]) => {
        setLeads(Array.isArray(leadsData) ? leadsData : []);
        setListings(Array.isArray(listingsData) ? listingsData : []);
      })
      .catch(() => {
        setLeads([]);
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, []);

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

  const handleDownloadCsv = () => {
    if (!leads.length) {
      toast.error("No leads to export.");
      return;
    }
    try {
      const csv = buildLeadsCsv(leads, listingMap);
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
        prev.map((l) => (l.id === assigningLead.id ? { ...l, assignedListingIds: assignIds } : l))
      );
      toast.success("Assignments updated.");
      closeAssignModal();
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

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
            >
              <FiUserPlus className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      {
        key: "source",
        label: "Source",
        render: (_, row) => (row.sourceListingId ? listingMap[row.sourceListingId] || row.sourceListingId : "—"),
      },
      {
        key: "assignedTo",
        label: "Assigned to",
        render: (_, row) => {
          const ids = row.assignedListingIds || [];
          const names = ids.map((id) => listingMap[id] || id).join(", ");
          return names || "—";
        },
      },
      {
        key: "createdAt",
        label: "Submitted",
        render: (val) => (val ? new Date(val).toLocaleString() : "—"),
      },
    ],
    [listingMap]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
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
                <div><dt className="text-secondary">Source listing</dt><dd className="text-title">{viewingLead.sourceListingId ? listingMap[viewingLead.sourceListingId] || viewingLead.sourceListingId : "—"}</dd></div>
                <div><dt className="text-secondary">Assigned to (max 3)</dt><dd className="text-title">{((viewingLead.assignedListingIds || []).map((id) => listingMap[id] || id).join(", ")) || "—"}</dd></div>
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
    </div>
  );
}
