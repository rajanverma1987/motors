"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import Badge from "@/components/ui/badge";

const SOURCE_LABELS = {
  website: "Website",
  admin_assigned: "Admin-assigned",
  manual: "Manual",
};

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STATUS_BADGE_VARIANT = {
  new: "primary",
  contacted: "warning",
  quoted: "primary",
  won: "success",
  lost: "danger",
};

const FILTER_STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  ...STATUS_OPTIONS,
];

const URGENCY_OPTIONS = [
  { value: "", label: "Select urgency…" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

export default function DashboardLeadsPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openLeadId = searchParams.get("open");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingLead, setViewingLead] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [editMotorPhotoFiles, setEditMotorPhotoFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Enter Lead form state
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    city: "",
    zipCode: "",
    motorType: "",
    motorHp: "",
    voltage: "",
    problemDescription: "",
    urgencyLevel: "",
  });
  const [motorPhotoFiles, setMotorPhotoFiles] = useState([]);

  const loadLeads = async () => {
    try {
      const res = await fetch("/api/dashboard/leads", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leads");
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load leads");
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const openEnterModal = () => {
    setForm({
      name: "",
      company: "",
      phone: "",
      email: "",
      city: "",
      zipCode: "",
      motorType: "",
      motorHp: "",
      voltage: "",
      problemDescription: "",
      urgencyLevel: "",
    });
    setMotorPhotoFiles([]);
    setEnterModalOpen(true);
  };

  const closeEnterModal = () => {
    setEnterModalOpen(false);
  };

  const handleEnterLeadSubmit = async (e) => {
    e.preventDefault();
    if (!form.name?.trim() || !form.email?.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSavingLead(true);
    try {
      let motorPhotos = [];
      if (motorPhotoFiles.length > 0) {
        const fd = new FormData();
        motorPhotoFiles.forEach((f) => fd.append("files", f));
        const upRes = await fetch("/api/leads/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Photo upload failed");
        motorPhotos = upData.urls || [];
      }
      const res = await fetch("/api/dashboard/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, motorPhotos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create lead");
      toast.success("Lead created.");
      closeEnterModal();
      loadLeads();
    } catch (err) {
      toast.error(err.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  };

  const openDetail = (lead) => {
    setViewingLead(lead);
    setDetailModalOpen(true);
  };

  useEffect(() => {
    const id = openLeadId?.trim();
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/leads/${id}`, { credentials: "include" });
        const data = await res.json();
        if (cancelled || !res.ok) return;
        setViewingLead({ ...data, id: data.id || id });
        setDetailModalOpen(true);
        router.replace("/dashboard/leads", { scroll: false });
      } catch {
        if (!cancelled) toast.error("Could not open lead.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openLeadId, router, toast]);

  const closeDetail = () => {
    setDetailModalOpen(false);
    setViewingLead(null);
  };

  const openEditModal = (lead) => {
    setEditingLead(lead);
    setForm({
      name: lead.name ?? "",
      company: lead.company ?? "",
      phone: lead.phone ?? "",
      email: lead.email ?? "",
      city: lead.city ?? "",
      zipCode: lead.zipCode ?? "",
      motorType: lead.motorType ?? "",
      motorHp: lead.motorHp ?? "",
      voltage: lead.voltage ?? "",
      problemDescription: lead.problemDescription ?? "",
      urgencyLevel: lead.urgencyLevel ?? "",
      status: lead.status ?? "new",
    });
    setEditMotorPhotoFiles([]);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingLead(null);
    setEditMotorPhotoFiles([]);
  };

  const handleEditLeadSubmit = async (e) => {
    e.preventDefault();
    if (!editingLead?.id || !form.name?.trim() || !form.email?.trim()) {
      toast.error("Name and email are required.");
      return;
    }
    setSavingLead(true);
    try {
      let newUrls = [];
      if (editMotorPhotoFiles.length > 0) {
        const fd = new FormData();
        editMotorPhotoFiles.forEach((f) => fd.append("files", f));
        const upRes = await fetch("/api/leads/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Photo upload failed");
        newUrls = upData.urls || [];
      }
      const motorPhotos = [...(editingLead.motorPhotos || []), ...newUrls];
      const res = await fetch(`/api/dashboard/leads/${editingLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, motorPhotos, status: form.status || editingLead.status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update lead");
      toast.success("Lead updated.");
      setLeads((prev) => prev.map((l) => (l.id === editingLead.id ? { ...l, ...data.lead } : l)));
      if (viewingLead?.id === editingLead.id) setViewingLead(data.lead);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update lead");
    } finally {
      setSavingLead(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!viewingLead?.id) return;
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/dashboard/leads/${viewingLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setViewingLead((prev) => (prev ? { ...prev, status: newStatus } : null));
      setLeads((prev) => prev.map((l) => (l.id === viewingLead.id ? { ...l, status: newStatus } : l)));
      toast.success("Status updated.");
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setSavingStatus(false);
    }
  };

  const filteredLeads = useMemo(() => {
    let list = leads;
    if (statusFilter) {
      list = list.filter((l) => l.status === statusFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (l) =>
          (l.name || "").toLowerCase().includes(q) ||
          (l.company || "").toLowerCase().includes(q) ||
          (l.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [leads, statusFilter, searchQuery]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "name",
        label: "Name",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openDetail(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.name || "—"}
          </button>
        ),
      },
      { key: "company", label: "Company" },
      { key: "email", label: "Email" },
      {
        key: "source",
        label: "Source",
        render: (_, row) => SOURCE_LABELS[row.source] || row.source || "—",
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => {
          const status = row.status || "new";
          const variant = STATUS_BADGE_VARIANT[status] || "default";
          const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
          return (
            <Badge variant={variant} className="rounded-full px-2.5 py-0.5 text-xs">
              {label}
            </Badge>
          );
        },
      },
      {
        key: "createdAt",
        label: "Submitted",
        render: (val) => (val ? new Date(val).toLocaleString() : "—"),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Leads</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage incoming repair inquiries from the website, admin assignment, or manual entry.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Filter by status"
            options={FILTER_STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            searchable={false}
            placeholder="All statuses"
            className="w-44"
          />
          <Button variant="primary" onClick={openEnterModal} className="shrink-0">
            Enter Lead
          </Button>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredLeads}
          rowKey="id"
          loading={loading}
          emptyMessage={leads.length === 0 ? "No leads yet. Use “Enter Lead” to add one." : "No leads match the search or filter."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search name, company, email…"
          onRefresh={() => { setLoading(true); loadLeads(); }}
          responsive
        />
      </div>

      {/* Enter Lead modal */}
      <Modal
        open={enterModalOpen}
        onClose={closeEnterModal}
        title="Enter Lead"
        size="lg"
        actions={
          <Button type="submit" form="enter-lead-form" variant="primary" size="sm" disabled={savingLead}>
            {savingLead ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="enter-lead-form" onSubmit={handleEnterLeadSubmit} className="flex flex-col gap-5 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Input
              label="Your name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Contact name"
              required
            />
            <Input
              label="Company name"
              name="company"
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              placeholder="Company name"
            />
            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. (555) 123-4567"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              required
            />
            <Input
              label="City / location"
              name="city"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="City"
            />
            <Input
              label="Zip code"
              name="zipCode"
              value={form.zipCode}
              onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
              placeholder="e.g. 12345"
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
              Motor details
            </h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              <Input
                label="Motor type"
                name="motorType"
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value }))}
                placeholder="e.g. AC induction, DC"
              />
              <Input
                label="Motor HP"
                name="motorHp"
                value={form.motorHp}
                onChange={(e) => setForm((f) => ({ ...f, motorHp: e.target.value }))}
                placeholder="e.g. 50 HP"
              />
              <Input
                label="Voltage"
                name="voltage"
                value={form.voltage}
                onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Select
                label="Urgency level"
                name="urgencyLevel"
                options={URGENCY_OPTIONS}
                value={form.urgencyLevel}
                onChange={(e) => setForm((f) => ({ ...f, urgencyLevel: e.target.value }))}
                placeholder="Select urgency…"
                searchable={false}
              />
              <div className="sm:col-span-2">
                <label className="inline-flex items-center gap-1.5 text-sm text-title">
                  Motor photos (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  onChange={(e) => setMotorPhotoFiles(Array.from(e.target.files || []))}
                />
                {motorPhotoFiles.length > 0 && (
                  <p className="mt-0.5 text-xs text-secondary">{motorPhotoFiles.length} file(s) selected</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <Textarea
                  label="Problem description"
                  name="problemDescription"
                  value={form.problemDescription}
                  onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))}
                  placeholder="Describe the issue, symptoms, timeline, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </Form>
      </Modal>

      {/* Edit Lead modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit Lead"
        size="4xl"
        actions={
          editingLead && (
            <Button type="submit" form="edit-lead-form" variant="primary" size="sm" disabled={savingLead}>
              {savingLead ? "Saving…" : "Save"}
            </Button>
          )
        }
      >
        {editingLead && (
          <Form id="edit-lead-form" onSubmit={handleEditLeadSubmit} className="flex flex-col gap-5 !space-y-0">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Status"
                name="status"
                options={STATUS_OPTIONS}
                value={form.status ?? editingLead.status ?? "new"}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                placeholder="Select status…"
                searchable={false}
              />
              <Input
                label="Your name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Contact name"
                required
              />
              <Input
                label="Company name"
                name="company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                placeholder="Company name"
              />
              <Input
                label="Phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="e.g. (555) 123-4567"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@example.com"
                required
              />
              <Input
                label="City / location"
                name="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="Zip code"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Motor details</h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  label="Motor type"
                  name="motorType"
                  value={form.motorType}
                  onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value }))}
                  placeholder="e.g. AC induction, DC"
                />
                <Input
                  label="Motor HP"
                  name="motorHp"
                  value={form.motorHp}
                  onChange={(e) => setForm((f) => ({ ...f, motorHp: e.target.value }))}
                  placeholder="e.g. 50 HP"
                />
                <Input
                  label="Voltage"
                  name="voltage"
                  value={form.voltage}
                  onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))}
                  placeholder="e.g. 480V"
                />
                <Select
                  label="Urgency level"
                  name="urgencyLevel"
                  options={URGENCY_OPTIONS}
                  value={form.urgencyLevel}
                  onChange={(e) => setForm((f) => ({ ...f, urgencyLevel: e.target.value }))}
                  placeholder="Select urgency…"
                  searchable={false}
                />
                <div className="lg:col-span-2">
                  <label className="inline-flex items-center gap-1.5 text-sm text-title">Motor photos</label>
                  {(editingLead.motorPhotos || []).length > 0 && (
                    <p className="mt-0.5 text-xs text-secondary">
                      Existing: {(editingLead.motorPhotos || []).length} photo(s). Add more below.
                    </p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => setEditMotorPhotoFiles(Array.from(e.target.files || []))}
                  />
                  {editMotorPhotoFiles.length > 0 && (
                    <p className="mt-0.5 text-xs text-secondary">{editMotorPhotoFiles.length} new file(s) selected</p>
                  )}
                </div>
                <div className="lg:col-span-2">
                  <Textarea
                    label="Problem description"
                    name="problemDescription"
                    value={form.problemDescription}
                    onChange={(e) => setForm((f) => ({ ...f, problemDescription: e.target.value }))}
                    placeholder="Describe the issue, symptoms, timeline, etc."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          </Form>
        )}
      </Modal>

      {/* Lead detail modal */}
      <Modal
        open={detailModalOpen}
        onClose={closeDetail}
        title="Lead details"
        size="lg"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeDetail}>Close</Button>
            <Button type="button" variant="primary" size="sm" onClick={() => { closeDetail(); openEditModal(viewingLead); }}>Edit</Button>
          </>
        }
      >
        {viewingLead && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Lead information
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-secondary">Name</dt>
                  <dd className="font-medium text-title">{viewingLead.name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Company</dt>
                  <dd className="text-title">{viewingLead.company || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Email</dt>
                  <dd className="text-title">{viewingLead.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Phone</dt>
                  <dd className="text-title">{viewingLead.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Location</dt>
                  <dd className="text-title">
                    {[viewingLead.city, viewingLead.zipCode].filter(Boolean).join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-secondary">Source</dt>
                  <dd className="text-title">{SOURCE_LABELS[viewingLead.source] || viewingLead.source || "—"}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Motor details
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-secondary">Motor type</dt>
                  <dd className="text-title">{viewingLead.motorType || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Motor HP</dt>
                  <dd className="text-title">{viewingLead.motorHp || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Voltage</dt>
                  <dd className="text-title">{viewingLead.voltage || "—"}</dd>
                </div>
                <div>
                  <dt className="text-secondary">Urgency</dt>
                  <dd className="text-title">
                    {viewingLead.urgencyLevel
                      ? String(viewingLead.urgencyLevel).charAt(0).toUpperCase() +
                      String(viewingLead.urgencyLevel).slice(1)
                      : "—"}
                  </dd>
                </div>
              </dl>
              {(viewingLead.problemDescription || viewingLead.message) && (
                <div className="mt-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-secondary">
                    Problem description
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-title">
                    {viewingLead.problemDescription || viewingLead.message}
                  </dd>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Status
              </h3>
              <Select
                label="Update status"
                options={STATUS_OPTIONS}
                value={viewingLead.status || "new"}
                onChange={(e) => handleStatusChange(e.target.value)}
                multiple={false}
                searchable={false}
              />
              {savingStatus && (
                <span className="ml-2 text-xs text-secondary">Saving…</span>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                Actions
              </h3>
              <p className="mb-3 text-sm text-secondary">
                Create a customer, motor, or quote from this lead. You will review and save each step manually.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href={`/dashboard/customers?fromLead=${viewingLead.id}`}>
                  <Button variant="outline" size="sm">
                    Create Customer from Lead
                  </Button>
                </Link>
                <Link href={`/dashboard/motors?fromLead=${viewingLead.id}`}>
                  <Button variant="outline" size="sm">
                    Create Motor from Lead
                  </Button>
                </Link>
                <Link href={`/dashboard/quotes?fromLead=${viewingLead.id}`}>
                  <Button variant="outline" size="sm">
                    Create Quote from Lead
                  </Button>
                </Link>
              </div>
            </div>

            {viewingLead.createdAt && (
              <p className="border-t border-border pt-4 text-xs text-secondary">
                Submitted {new Date(viewingLead.createdAt).toLocaleString()}
              </p>
            )}

          </div>
        )}
      </Modal>
    </div>
  );
}
