"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

const INITIAL_MOTOR_FORM = {
  customerId: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  hp: "",
  rpm: "",
  voltage: "",
  kw: "",
  amps: "",
  frameSize: "",
  motorType: "",
  slots: "",
  coreLength: "",
  coreDiameter: "",
  bars: "",
  notes: "",
};

function buildMotorPayload(form) {
  const f = form || {};
  return {
    customerId: f.customerId ?? "",
    serialNumber: f.serialNumber ?? "",
    manufacturer: f.manufacturer ?? "",
    model: f.model ?? "",
    hp: f.hp ?? "",
    rpm: f.rpm ?? "",
    voltage: f.voltage ?? "",
    kw: f.kw ?? "",
    amps: f.amps ?? "",
    frameSize: f.frameSize ?? "",
    motorType: f.motorType ?? "",
    slots: f.slots ?? "",
    coreLength: f.coreLength ?? "",
    coreDiameter: f.coreDiameter ?? "",
    bars: f.bars ?? "",
    motorPhotos: Array.isArray(f.motorPhotos) ? f.motorPhotos : [],
    nameplateImages: Array.isArray(f.nameplateImages) ? f.nameplateImages : [],
    notes: f.notes ?? "",
  };
}

const INITIAL_FORM = {
  companyName: "",
  primaryContactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "United States",
  shippingAddress: "",
  shippingCity: "",
  shippingState: "",
  shippingZipCode: "",
  shippingCountry: "United States",
  additionalContacts: [],
  notes: "",
};

/** Build request body with all fields explicitly so shipping is never omitted (JSON.stringify drops undefined). */
function buildCustomerPayload(form) {
  const f = form || {};
  return {
    companyName: f.companyName ?? "",
    primaryContactName: f.primaryContactName ?? "",
    phone: f.phone ?? "",
    email: f.email ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    country: f.country ?? "United States",
    shippingAddress: f.shippingAddress ?? "",
    shippingCity: f.shippingCity ?? "",
    shippingState: f.shippingState ?? "",
    shippingZipCode: f.shippingZipCode ?? "",
    shippingCountry: f.shippingCountry ?? "United States",
    additionalContacts: Array.isArray(f.additionalContacts) ? f.additionalContacts : [],
    notes: f.notes ?? "",
  };
}

export default function DashboardCustomersPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");
  const openCustomerId = searchParams.get("open");

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  /** When set, we're loading full customer for View modal; modal shows loading until fetch completes */
  const [viewLoadingCustomerId, setViewLoadingCustomerId] = useState(null);
  const [savingCustomer, setSavingCustomer] = useState(false);
  /** Index of additional contact being removed from View modal (for loading state) */
  const [removingContactIndex, setRemovingContactIndex] = useState(null);
  /** When converting from lead, if a customer with same email/company exists, show View option instead of Create */
  const [existingCustomerFromLead, setExistingCustomerFromLead] = useState(null);
  const [addMotorModalOpen, setAddMotorModalOpen] = useState(false);
  const [motorForm, setMotorForm] = useState(INITIAL_MOTOR_FORM);
  const [savingMotor, setSavingMotor] = useState(false);
  const motorFormRef = useRef(motorForm);
  motorFormRef.current = motorForm;

  const [form, setForm] = useState(INITIAL_FORM);
  /** Ref so submit always sends latest form (avoids stale closure after "Copy from billing") */
  const formRef = useRef(form);
  formRef.current = form;

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/customers", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Prefill from lead when fromLead query param is set (Create Customer from Lead)
  useEffect(() => {
    if (!fromLeadId) return;
    let cancelled = false;
    setExistingCustomerFromLead(null);
    (async () => {
      try {
        const [leadRes, customersRes] = await Promise.all([
          fetch(`/api/dashboard/leads/${fromLeadId}`, { credentials: "include" }),
          fetch("/api/dashboard/customers", { credentials: "include", cache: "no-store" }),
        ]);
        const lead = await leadRes.json();
        const customersList = await customersRes.json();
        if (cancelled || !leadRes.ok) return;
        const list = Array.isArray(customersList) ? customersList : [];
        const leadEmail = (lead.email || "").trim().toLowerCase();
        const leadCompany = (lead.company || "").trim().toLowerCase();
        const existing = list.find((c) => {
          const matchEmail = leadEmail && (c.email || "").toLowerCase() === leadEmail;
          const matchCompany = leadCompany && (c.companyName || "").trim().toLowerCase() === leadCompany;
          return matchEmail || matchCompany;
        });
        if (existing) {
          setExistingCustomerFromLead(existing);
          router.replace("/dashboard/customers", { scroll: false });
          return;
        }
        setForm({
          ...INITIAL_FORM,
          companyName: lead.company || "",
          primaryContactName: lead.name || "",
          phone: lead.phone || "",
          email: lead.email || "",
          city: lead.city || "",
          zipCode: lead.zipCode || "",
          notes: lead.message || lead.problemDescription || "",
        });
        setEnterModalOpen(true);
        router.replace("/dashboard/customers", { scroll: false });
      } catch {
        if (!cancelled) toast.error("Could not load lead.");
      }
    })();
    return () => { cancelled = true; };
  }, [fromLeadId, toast, router]);

  useEffect(() => {
    const id = openCustomerId?.trim();
    if (!id) return;
    setViewLoadingCustomerId(id);
    setViewModalOpen(true);
    router.replace("/dashboard/customers", { scroll: false });
  }, [openCustomerId, router]);

  const openEnterModal = () => {
    setForm(INITIAL_FORM);
    setEnterModalOpen(true);
  };

  const closeEnterModal = () => setEnterModalOpen(false);

  const openViewModal = (customer) => {
    if (!customer?.id) {
      setViewingCustomer(customer);
      setViewModalOpen(true);
      return;
    }
    setViewingCustomer(null);
    setViewLoadingCustomerId(customer.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingCustomerId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/customers/${viewLoadingCustomerId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingCustomerId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingCustomer(data);
        setViewLoadingCustomerId(null);
      } catch {
        if (!cancelled) setViewLoadingCustomerId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingCustomerId]);

  const closeViewModal = () => {
    // Defer state updates so we don't update during ModalStackProvider's render (e.g. when Escape triggers onClose)
    queueMicrotask(() => {
      setViewModalOpen(false);
      setViewingCustomer(null);
      setViewLoadingCustomerId(null);
      setAddMotorModalOpen(false);
    });
  };

  const openAddMotorModal = () => {
    if (!viewingCustomer?.id) return;
    setMotorForm({ ...INITIAL_MOTOR_FORM, customerId: viewingCustomer.id });
    setAddMotorModalOpen(true);
  };

  const closeAddMotorModal = () => setAddMotorModalOpen(false);

  const handleAddMotorSubmit = async (e) => {
    e.preventDefault();
    const current = motorFormRef.current;
    if (!current.customerId?.trim()) return;
    setSavingMotor(true);
    try {
      const res = await fetch("/api/dashboard/motors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildMotorPayload(current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create motor");
      toast.success("Motor asset created and linked to this customer.");
      closeAddMotorModal();
      const custRes = await fetch(`/api/dashboard/customers/${viewingCustomer.id}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        setViewingCustomer(custData);
      }
    } catch (err) {
      toast.error(err.message || "Failed to create motor");
    } finally {
      setSavingMotor(false);
    }
  };

  const openEditModal = async (customer) => {
    if (!customer) return;
    let dataToUse = customer;
    if (customer?.id) {
      try {
        const res = await fetch(`/api/dashboard/customers/${customer.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {
        // Use row data
      }
    }
    setViewingCustomer(dataToUse);
    setForm({
      companyName: dataToUse.companyName ?? "",
      primaryContactName: dataToUse.primaryContactName ?? "",
      phone: dataToUse.phone ?? "",
      email: dataToUse.email ?? "",
      address: dataToUse.address ?? "",
      city: dataToUse.city ?? "",
      state: dataToUse.state ?? "",
      zipCode: dataToUse.zipCode ?? "",
      country: dataToUse.country ?? "United States",
      shippingAddress: dataToUse.shippingAddress ?? "",
      shippingCity: dataToUse.shippingCity ?? "",
      shippingState: dataToUse.shippingState ?? "",
      shippingZipCode: dataToUse.shippingZipCode ?? "",
      shippingCountry: dataToUse.shippingCountry ?? "United States",
      additionalContacts: Array.isArray(dataToUse.additionalContacts) ? dataToUse.additionalContacts.map((ac) => ({
        contactName: ac.contactName ?? "",
        phone: ac.phone ?? "",
        email: ac.email ?? "",
      })) : [],
      notes: dataToUse.notes ?? "",
    });
    setEditModalOpen(true);
  };

  const addAdditionalContact = () => {
    setForm((f) => ({
      ...f,
      additionalContacts: [...(f.additionalContacts || []), { contactName: "", phone: "", email: "" }],
    }));
  };

  const updateAdditionalContact = (index, field, value) => {
    setForm((f) => {
      const next = [...(f.additionalContacts || [])];
      if (!next[index]) return f;
      next[index] = { ...next[index], [field]: value };
      return { ...f, additionalContacts: next };
    });
  };

  const removeAdditionalContact = (index) => {
    setForm((f) => ({
      ...f,
      additionalContacts: (f.additionalContacts || []).filter((_, i) => i !== index),
    }));
  };

  /** Remove an additional contact from the customer (View modal); PATCH and refresh. */
  const removeAdditionalContactFromView = async (contactIndex) => {
    if (!viewingCustomer?.id || !Array.isArray(viewingCustomer.additionalContacts)) return;
    const newContacts = viewingCustomer.additionalContacts.filter((_, i) => i !== contactIndex);
    setRemovingContactIndex(contactIndex);
    try {
      const payload = buildCustomerPayload({
        ...viewingCustomer,
        additionalContacts: newContacts,
      });
      const res = await fetch(`/api/dashboard/customers/${viewingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Contact removed.");
      setViewingCustomer(data.customer);
      setCustomers((prev) =>
        prev.map((c) => (c.id === viewingCustomer.id ? { ...c, ...data.customer } : c))
      );
    } catch (err) {
      toast.error(err.message || "Failed to remove contact");
    } finally {
      setRemovingContactIndex(null);
    }
  };

  const copyBillingToShipping = () => {
    setForm((f) => ({
      ...f,
      shippingAddress: f.address,
      shippingCity: f.city,
      shippingState: f.state,
      shippingZipCode: f.zipCode,
      shippingCountry: f.country,
    }));
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingCustomer(null);
  };

  const handleEnterSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!currentForm.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      if (fromLeadId) {
        try {
          await fetch(`/api/dashboard/leads/${fromLeadId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "won" }),
          });
          toast.success("Customer created. Lead marked as Won.");
        } catch {
          toast.success("Customer created.");
        }
      } else {
        toast.success("Customer created.");
      }
      closeEnterModal();
      loadCustomers();
    } catch (err) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!viewingCustomer?.id || !currentForm.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${viewingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Customer updated.");
      setCustomers((prev) =>
        prev.map((c) => (c.id === viewingCustomer.id ? { ...c, ...data.customer } : c))
      );
      setViewingCustomer(data.customer);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.companyName || "").toLowerCase().includes(q) ||
        (c.primaryContactName || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q) ||
        (c.phone || "").toLowerCase().includes(q) ||
        (c.city || "").toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

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
        key: "companyName",
        label: "Company",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.companyName || "—"}
          </button>
        ),
      },
      { key: "primaryContactName", label: "Contact" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Customers</h1>
          <p className="mt-1 text-sm text-secondary">
            Maintain customer database: company name, contacts, phone, addresses, billing. Enter new customer or create from lead.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Button variant="primary" onClick={openEnterModal} className="shrink-0">
            Enter New Customer
          </Button>
        </div>
      </div>

      {existingCustomerFromLead && (
        <div className="mt-4 shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            A customer with this email or company already exists.
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {existingCustomerFromLead.companyName}
            {existingCustomerFromLead.primaryContactName && ` · ${existingCustomerFromLead.primaryContactName}`}
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                openViewModal(existingCustomerFromLead);
                setExistingCustomerFromLead(null);
              }}
            >
              View existing customer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExistingCustomerFromLead(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredCustomers}
          rowKey="id"
          loading={loading}
          emptyMessage={customers.length === 0 ? "No customers yet. Use “Enter New Customer” to add one." : "No customers match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search company, contact, email…"
          onRefresh={() => { setLoading(true); loadCustomers(); }}
          responsive
        />
      </div>

      {/* Enter New Customer modal */}
      <Modal
        open={enterModalOpen}
        onClose={closeEnterModal}
        title="Enter New Customer"
        size="4xl"
        actions={
          <Button type="submit" form="enter-customer-form" variant="primary" size="sm" disabled={savingCustomer}>
            {savingCustomer ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="enter-customer-form" onSubmit={handleEnterSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Company & contact</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Company name"
                name="companyName"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Company or business name"
                required
              />
              <Input
                label="Primary contact name"
                name="primaryContactName"
                value={form.primaryContactName}
                onChange={(e) => setForm((f) => ({ ...f, primaryContactName: e.target.value }))}
                placeholder="Contact person name"
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
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-title">Additional contact persons</h3>
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalContact}>
                Add contact person
              </Button>
            </div>
            {(form.additionalContacts || []).length === 0 ? (
              <p className="text-sm text-secondary">No additional contacts. Click “Add contact person” to add one.</p>
            ) : (
              <div className="space-y-3">
                {(form.additionalContacts || []).map((ac, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2 rounded border border-border bg-bg/50 p-3">
                    <Input
                      label="Name"
                      value={ac.contactName}
                      onChange={(e) => updateAdditionalContact(index, "contactName", e.target.value)}
                      placeholder="Contact name"
                      className="min-w-[140px] flex-1"
                    />
                    <Input
                      label="Phone"
                      value={ac.phone}
                      onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
                      placeholder="e.g. (555) 123-4567"
                      className="min-w-[120px] flex-1"
                    />
                    <Input
                      label="Email"
                      value={ac.email}
                      onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                      placeholder="email@example.com"
                      className="min-w-[160px] flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeAdditionalContact(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Billing address</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                name="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
                className="lg:col-span-2"
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
                placeholder="State or province"
              />
              <Input
                label="Zip code"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
              <Input
                label="Country"
                name="country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-title">Shipping address</h3>
              <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
                Copy from billing
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                name="shippingAddress"
                value={form.shippingAddress}
                onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                placeholder="Street address"
                className="lg:col-span-2"
              />
              <Input
                label="City"
                name="shippingCity"
                value={form.shippingCity}
                onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="shippingState"
                value={form.shippingState}
                onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))}
                placeholder="State or province"
              />
              <Input
                label="Zip code"
                name="shippingZipCode"
                value={form.shippingZipCode}
                onChange={(e) => setForm((f) => ({ ...f, shippingZipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
              <Input
                label="Country"
                name="shippingCountry"
                value={form.shippingCountry}
                onChange={(e) => setForm((f) => ({ ...f, shippingCountry: e.target.value }))}
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Customer notes, billing details, etc."
              rows={3}
            />
          </div>

        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Customer details"
        size="4xl"
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                closeViewModal();
                openEditModal(viewingCustomer);
              }}
            >
              Edit
            </Button>
          </>
        }
      >
        {viewLoadingCustomerId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingCustomer ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Company & contact
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-secondary">Company</dt><dd className="font-medium text-title">{viewingCustomer.companyName || "—"}</dd></div>
                <div><dt className="text-secondary">Primary contact</dt><dd className="text-title">{viewingCustomer.primaryContactName || "—"}</dd></div>
                <div><dt className="text-secondary">Phone</dt><dd className="text-title">{viewingCustomer.phone || "—"}</dd></div>
                <div><dt className="text-secondary">Email</dt><dd className="text-title">{viewingCustomer.email || "—"}</dd></div>
              </dl>
            </div>
            {Array.isArray(viewingCustomer.additionalContacts) && viewingCustomer.additionalContacts.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Additional contact persons
                </h3>
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Email</th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-title">
                      {viewingCustomer.additionalContacts.map((ac, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">{ac.contactName || "—"}</td>
                          <td className="px-3 py-2">{ac.phone || "—"}</td>
                          <td className="px-3 py-2">{ac.email || "—"}</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => { closeViewModal(); openEditModal(viewingCustomer); }}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAdditionalContactFromView(i)}
                                disabled={removingContactIndex !== null}
                              >
                                {removingContactIndex === i ? "Removing…" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Billing address
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-secondary">Street</dt><dd className="text-title">{viewingCustomer.address || "—"}</dd></div>
                <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingCustomer.city || "—"}</dd></div>
                <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingCustomer.state || "—"}</dd></div>
                <div><dt className="text-secondary">Zip code</dt><dd className="text-title">{viewingCustomer.zipCode || "—"}</dd></div>
                <div><dt className="text-secondary">Country</dt><dd className="text-title">{viewingCustomer.country || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Shipping address
              </h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-secondary">Street</dt><dd className="text-title">{viewingCustomer.shippingAddress || "—"}</dd></div>
                <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingCustomer.shippingCity || "—"}</dd></div>
                <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingCustomer.shippingState || "—"}</dd></div>
                <div><dt className="text-secondary">Zip code</dt><dd className="text-title">{viewingCustomer.shippingZipCode || "—"}</dd></div>
                <div><dt className="text-secondary">Country</dt><dd className="text-title">{viewingCustomer.shippingCountry || "—"}</dd></div>
              </dl>
            </div>
            {(viewingCustomer.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingCustomer.notes}</p>
              </div>
            )}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Linked</h3>
                <Button type="button" variant="outline" size="sm" onClick={openAddMotorModal}>
                  Add new Motor Asset
                </Button>
              </div>
              {Array.isArray(viewingCustomer.linkedMotors) && viewingCustomer.linkedMotors.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Serial number</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Manufacturer</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Model</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">HP</th>
                      </tr>
                    </thead>
                    <tbody className="text-title">
                      {viewingCustomer.linkedMotors.map((m) => (
                        <tr key={m.id} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">{m.serialNumber || "—"}</td>
                          <td className="px-3 py-2">{m.manufacturer || "—"}</td>
                          <td className="px-3 py-2">{m.model || "—"}</td>
                          <td className="px-3 py-2">{m.hp || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">Motor assets: —</p>
              )}
              <p className="mt-2 text-sm text-secondary">Job history: —</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add Motor Asset modal (from Customer View) */}
      <Modal
        open={addMotorModalOpen}
        onClose={closeAddMotorModal}
        title="Add new Motor Asset"
        size="4xl"
        actions={
          <>
            <Button type="submit" form="add-motor-form" variant="primary" size="sm" disabled={savingMotor}>
              {savingMotor ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="add-motor-form" onSubmit={handleAddMotorSubmit} className="flex flex-col gap-5 !space-y-0">
          <p className="text-sm text-secondary">
            Linked to customer: <span className="font-medium text-title">{viewingCustomer?.companyName || "—"}</span>
          </p>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Identification & details</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Serial number"
                value={motorForm.serialNumber}
                onChange={(e) => setMotorForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
              />
              <Input
                label="Manufacturer"
                value={motorForm.manufacturer}
                onChange={(e) => setMotorForm((f) => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={motorForm.model}
                onChange={(e) => setMotorForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={motorForm.motorType}
                onChange={(e) => setMotorForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input
                label="HP"
                value={motorForm.hp}
                onChange={(e) => setMotorForm((f) => ({ ...f, hp: e.target.value }))}
                placeholder="e.g. 50"
              />
              <Input
                label="RPM"
                value={motorForm.rpm}
                onChange={(e) => setMotorForm((f) => ({ ...f, rpm: e.target.value }))}
                placeholder="e.g. 1800"
              />
              <Input
                label="Voltage"
                value={motorForm.voltage}
                onChange={(e) => setMotorForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Input
                label="KW"
                value={motorForm.kw}
                onChange={(e) => setMotorForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="e.g. 37"
              />
              <Input
                label="AMPs"
                value={motorForm.amps}
                onChange={(e) => setMotorForm((f) => ({ ...f, amps: e.target.value }))}
                placeholder="e.g. 45"
              />
              <Input
                label="Frame size"
                value={motorForm.frameSize}
                onChange={(e) => setMotorForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
              <Input
                label="Slots"
                value={motorForm.slots}
                onChange={(e) => setMotorForm((f) => ({ ...f, slots: e.target.value }))}
                placeholder="Slots"
              />
              <Input
                label="Core length"
                value={motorForm.coreLength}
                onChange={(e) => setMotorForm((f) => ({ ...f, coreLength: e.target.value }))}
                placeholder="Core length"
              />
              <Input
                label="Core diameter"
                value={motorForm.coreDiameter}
                onChange={(e) => setMotorForm((f) => ({ ...f, coreDiameter: e.target.value }))}
                placeholder="Core diameter"
              />
              <Input
                label="Bars"
                value={motorForm.bars}
                onChange={(e) => setMotorForm((f) => ({ ...f, bars: e.target.value }))}
                placeholder="Bars"
              />
            </div>
          </div>
          <div>
            <Textarea
              label="Notes"
              value={motorForm.notes}
              onChange={(e) => setMotorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit customer"
        size="4xl"
        actions={
          <Button type="submit" form="edit-customer-form" variant="primary" size="sm" disabled={savingCustomer}>
            {savingCustomer ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-customer-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Company & contact</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Company name"
                name="companyName"
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                placeholder="Company or business name"
                required
              />
              <Input
                label="Primary contact name"
                name="primaryContactName"
                value={form.primaryContactName}
                onChange={(e) => setForm((f) => ({ ...f, primaryContactName: e.target.value }))}
                placeholder="Contact person name"
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
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-title">Additional contact persons</h3>
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalContact}>
                Add contact person
              </Button>
            </div>
            {(form.additionalContacts || []).length === 0 ? (
              <p className="text-sm text-secondary">No additional contacts. Click “Add contact person” to add one.</p>
            ) : (
              <div className="space-y-3">
                {(form.additionalContacts || []).map((ac, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-2 rounded border border-border bg-bg/50 p-3">
                    <Input
                      label="Name"
                      value={ac.contactName}
                      onChange={(e) => updateAdditionalContact(index, "contactName", e.target.value)}
                      placeholder="Contact name"
                      className="min-w-[140px] flex-1"
                    />
                    <Input
                      label="Phone"
                      value={ac.phone}
                      onChange={(e) => updateAdditionalContact(index, "phone", e.target.value)}
                      placeholder="e.g. (555) 123-4567"
                      className="min-w-[120px] flex-1"
                    />
                    <Input
                      label="Email"
                      value={ac.email}
                      onChange={(e) => updateAdditionalContact(index, "email", e.target.value)}
                      placeholder="email@example.com"
                      className="min-w-[160px] flex-1"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => removeAdditionalContact(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Billing address</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                name="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
                className="lg:col-span-2"
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
                placeholder="State or province"
              />
              <Input
                label="Zip code"
                name="zipCode"
                value={form.zipCode}
                onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
              <Input
                label="Country"
                name="country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-title">Shipping address</h3>
              <Button type="button" variant="outline" size="sm" onClick={copyBillingToShipping}>
                Copy from billing
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Street address"
                name="shippingAddress"
                value={form.shippingAddress}
                onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                placeholder="Street address"
                className="lg:col-span-2"
              />
              <Input
                label="City"
                name="shippingCity"
                value={form.shippingCity}
                onChange={(e) => setForm((f) => ({ ...f, shippingCity: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="shippingState"
                value={form.shippingState}
                onChange={(e) => setForm((f) => ({ ...f, shippingState: e.target.value }))}
                placeholder="State or province"
              />
              <Input
                label="Zip code"
                name="shippingZipCode"
                value={form.shippingZipCode}
                onChange={(e) => setForm((f) => ({ ...f, shippingZipCode: e.target.value }))}
                placeholder="e.g. 12345"
              />
              <Input
                label="Country"
                name="shippingCountry"
                value={form.shippingCountry}
                onChange={(e) => setForm((f) => ({ ...f, shippingCountry: e.target.value }))}
                placeholder="United States"
              />
            </div>
          </div>

          <div>
            <Textarea
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Customer notes, billing details, etc."
              rows={3}
            />
          </div>

        </Form>
      </Modal>
    </div>
  );
}
