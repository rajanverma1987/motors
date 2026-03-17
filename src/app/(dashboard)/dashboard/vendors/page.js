"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const PARTS_SUPPLIED_COLUMNS = [{ key: "item", label: "Part / material" }];

const INITIAL_FORM = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  partsSupplied: [],
  paymentTerms: "",
  notes: "",
};

function buildVendorPayload(form) {
  const f = form || {};
  return {
    name: f.name ?? "",
    contactName: f.contactName ?? "",
    phone: f.phone ?? "",
    email: f.email ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    partsSupplied: Array.isArray(f.partsSupplied) ? f.partsSupplied : [],
    paymentTerms: f.paymentTerms ?? "",
    notes: f.notes ?? "",
  };
}

export default function DashboardVendorsPage() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingVendor, setViewingVendor] = useState(null);
  const [viewLoadingVendorId, setViewLoadingVendorId] = useState(null);
  const [savingVendor, setSavingVendor] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/vendors", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load vendors");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const openEnterModal = () => {
    setForm(INITIAL_FORM);
    setEnterModalOpen(true);
  };

  const closeEnterModal = () => setEnterModalOpen(false);

  const openViewModal = (vendor) => {
    if (!vendor?.id) {
      setViewingVendor(vendor);
      setViewModalOpen(true);
      return;
    }
    setViewingVendor(null);
    setViewLoadingVendorId(vendor.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingVendorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/vendors/${viewLoadingVendorId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingVendorId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingVendor(data);
        setViewLoadingVendorId(null);
      } catch {
        if (!cancelled) setViewLoadingVendorId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingVendorId]);

  const closeViewModal = () => {
    queueMicrotask(() => {
      setViewModalOpen(false);
      setViewingVendor(null);
      setViewLoadingVendorId(null);
    });
  };

  const openEditModal = async (vendor) => {
    if (!vendor) return;
    let dataToUse = vendor;
    if (vendor?.id) {
      try {
        const res = await fetch(`/api/dashboard/vendors/${vendor.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {
        // use row data
      }
    }
    setForm({
      name: dataToUse.name ?? "",
      contactName: dataToUse.contactName ?? "",
      phone: dataToUse.phone ?? "",
      email: dataToUse.email ?? "",
      address: dataToUse.address ?? "",
      city: dataToUse.city ?? "",
      state: dataToUse.state ?? "",
      zipCode: dataToUse.zipCode ?? "",
      partsSupplied: (Array.isArray(dataToUse.partsSupplied) ? dataToUse.partsSupplied : []).map((s) => ({
        item: typeof s === "string" ? s : s?.item ?? "",
      })),
      paymentTerms: dataToUse.paymentTerms ?? "",
      notes: dataToUse.notes ?? "",
    });
    setViewingVendor(dataToUse);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingVendor(null);
  };

  const handleEnterSubmit = async (e) => {
    e.preventDefault();
    setSavingVendor(true);
    try {
      const res = await fetch("/api/dashboard/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildVendorPayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create vendor");
      toast.success("Vendor added.");
      closeEnterModal();
      loadVendors();
    } catch (err) {
      toast.error(err.message || "Failed to create vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!viewingVendor?.id) return;
    setSavingVendor(true);
    try {
      const res = await fetch(`/api/dashboard/vendors/${viewingVendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildVendorPayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update vendor");
      toast.success("Vendor updated.");
      setVendors((prev) =>
        prev.map((v) => (v.id === viewingVendor.id ? { ...v, ...data.vendor } : v))
      );
      setViewingVendor(data.vendor);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter((v) => {
      const name = (v.name || "").toLowerCase();
      const contact = (v.contactName || "").toLowerCase();
      const email = (v.email || "").toLowerCase();
      const parts = Array.isArray(v.partsSupplied) ? v.partsSupplied.join(" ").toLowerCase() : "";
      return name.includes(q) || contact.includes(q) || email.includes(q) || parts.includes(q);
    });
  }, [vendors, searchQuery]);

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
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.name || "—"}
          </button>
        ),
      },
      { key: "contactName", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      {
        key: "partsSupplied",
        label: "Parts supplied",
        render: (_, row) => {
          const parts = Array.isArray(row.partsSupplied) ? row.partsSupplied : [];
          if (parts.length === 0) return "—";
          const labels = parts.map((p) => (typeof p === "string" ? p : p?.item ?? "")).filter(Boolean);
          if (labels.length === 0) return "—";
          const text = labels.join(", ");
          return text.length > 50 ? text.slice(0, 50) + "…" : text;
        },
      },
      {
        key: "paymentTerms",
        label: "Payment terms",
        render: (_, row) => (row.paymentTerms ? String(row.paymentTerms).slice(0, 30) + (row.paymentTerms.length > 30 ? "…" : "") : "—"),
      },
    ],
    []
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Vendors</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage parts and materials suppliers. Store vendor name, contact details, parts supplied, and payment terms.
          </p>
        </div>
        <Button variant="primary" onClick={openEnterModal} className="shrink-0">
          Add Vendor
        </Button>
      </div>

      <div className="mt-6 min-w-0">
        <Table
          columns={columns}
          data={filteredVendors}
          rowKey="id"
          loading={loading}
          emptyMessage={vendors.length === 0 ? "No vendors yet. Use “Add Vendor” to add one." : "No vendors match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search name, contact, email, parts…"
          onRefresh={async () => { setLoading(true); await loadVendors(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Add Vendor modal */}
      <Modal
        open={enterModalOpen}
        onClose={closeEnterModal}
        title="Add Vendor"
        size="4xl"
        actions={
          <Button type="submit" form="enter-vendor-form" variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="enter-vendor-form" onSubmit={handleEnterSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Vendor & contact</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Vendor name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company or supplier name"
                required
              />
              <Input
                label="Contact name"
                name="contactName"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Contact person"
              />
              <Input
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Address"
                name="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
              />
              <Input
                label="City"
                name="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="state"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="State"
              />
              <Input
                label="ZIP"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="ZIP code"
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Parts & terms</h3>
            <div className="flex flex-col gap-4">
              <Input
                label="Payment terms"
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="e.g. Net 30, Net 60"
              />
              <div className="w-full min-w-0">
                <div className="mb-1 text-xs font-medium text-secondary">Parts / materials this vendor supplies</div>
                <DataTable
                  columns={PARTS_SUPPLIED_COLUMNS}
                  data={form.partsSupplied}
                  onChange={(rows) => setForm((f) => ({ ...f, partsSupplied: rows }))}
                  striped
                />
              </div>
            </div>
          </div>
          <div>
            <Textarea
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Vendor details"
        size="4xl"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => { closeViewModal(); openEditModal(viewingVendor); }}>Edit</Button>
        }
      >
        {viewLoadingVendorId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingVendor ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Vendor & contact</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">Name</dt><dd className="text-title font-medium">{viewingVendor.name || "—"}</dd></div>
                <div><dt className="text-secondary">Contact</dt><dd className="text-title">{viewingVendor.contactName || "—"}</dd></div>
                <div><dt className="text-secondary">Phone</dt><dd className="text-title">{viewingVendor.phone || "—"}</dd></div>
                <div><dt className="text-secondary">Email</dt><dd className="text-title">{viewingVendor.email || "—"}</dd></div>
                <div className="sm:col-span-2"><dt className="text-secondary">Address</dt><dd className="text-title">{viewingVendor.address || "—"}</dd></div>
                <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingVendor.city || "—"}</dd></div>
                <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingVendor.state || "—"}</dd></div>
                <div><dt className="text-secondary">ZIP</dt><dd className="text-title">{viewingVendor.zipCode || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Parts & terms</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-secondary">Parts supplied</dt>
                  <dd className="text-title mt-0.5">
                    {Array.isArray(viewingVendor.partsSupplied) && viewingVendor.partsSupplied.length > 0 ? (
                      <ul className="list-disc list-inside space-y-0.5">
                        {viewingVendor.partsSupplied.map((p, i) => (
                          <li key={i}>{typeof p === "string" ? p.trim() : (p?.item ?? "").trim() || "—"}</li>
                        ))}
                      </ul>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2"><dt className="text-secondary">Payment terms</dt><dd className="text-title">{viewingVendor.paymentTerms || "—"}</dd></div>
              </dl>
            </div>
            {(viewingVendor.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingVendor.notes}</p>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Purchase history</h3>
              <p className="text-sm text-secondary">Purchase orders linked to this vendor will appear here when you create POs.</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit vendor"
        size="4xl"
        actions={
          <Button type="submit" form="edit-vendor-form" variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-vendor-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Vendor & contact</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Vendor name"
                name="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company or supplier name"
                required
              />
              <Input
                label="Contact name"
                name="contactName"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Contact person"
              />
              <Input
                label="Phone"
                name="phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Address"
                name="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
              />
              <Input
                label="City"
                name="city"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="state"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="State"
              />
              <Input
                label="ZIP"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="ZIP code"
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Parts & terms</h3>
            <div className="flex flex-col gap-4">
              <Input
                label="Payment terms"
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="e.g. Net 30, Net 60"
              />
              <div className="w-full min-w-0">
                <div className="mb-1 text-xs font-medium text-secondary">Parts / materials this vendor supplies</div>
                <DataTable
                  columns={PARTS_SUPPLIED_COLUMNS}
                  data={form.partsSupplied}
                  onChange={(rows) => setForm((f) => ({ ...f, partsSupplied: rows }))}
                  striped
                />
              </div>
            </div>
          </div>
          <div>
            <Textarea
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={3}
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
