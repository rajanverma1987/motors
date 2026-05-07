"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { LISTING_ONLY_UPGRADE_MESSAGE, LISTING_ONLY_MAX_CUSTOMERS } from "@/lib/listing-account-messages";
import { sortRowsClient } from "@/lib/client-table-sort";

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
  ein: "",
  creditLimit: "",
  taxExempt: true,
  taxPercent: "",
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
    ein: f.ein ?? "",
    creditLimit: f.creditLimit ?? "",
    taxExempt: !!f.taxExempt,
    taxPercent: f.taxExempt ? "" : f.taxPercent ?? "",
  };
}

export default function DashboardCustomersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const formatMoney = useFormatMoney();
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
  const [customerActivityLoading, setCustomerActivityLoading] = useState(false);
  const [customerActivity, setCustomerActivity] = useState({
    quotes: [],
    workOrders: [],
    invoices: [],
  });
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
        if (user?.listingOnlyAccount && list.length >= LISTING_ONLY_MAX_CUSTOMERS) {
          toast.error(LISTING_ONLY_UPGRADE_MESSAGE);
          router.replace("/dashboard/customers", { scroll: false });
          return;
        }
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
  }, [fromLeadId, toast, router, user?.listingOnlyAccount]);

  useEffect(() => {
    const id = openCustomerId?.trim();
    if (!id) return;
    setViewLoadingCustomerId(id);
    setViewModalOpen(true);
    router.replace("/dashboard/customers", { scroll: false });
  }, [openCustomerId, router]);

  const openEnterModal = () => {
    if (user?.listingOnlyAccount && customers.length >= LISTING_ONLY_MAX_CUSTOMERS) {
      toast.error(LISTING_ONLY_UPGRADE_MESSAGE);
      return;
    }
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
      setCustomerActivity({ quotes: [], workOrders: [], invoices: [] });
      setCustomerActivityLoading(false);
      setAddMotorModalOpen(false);
    });
  };

  useEffect(() => {
    if (!viewModalOpen || !viewingCustomer?.id || viewLoadingCustomerId) return;
    let cancelled = false;
    setCustomerActivityLoading(true);
    (async () => {
      try {
        const [quotesRes, workOrdersRes, invoicesRes] = await Promise.all([
          fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/work-orders", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }),
        ]);
        const [quotesData, workOrdersData, invoicesData] = await Promise.all([
          quotesRes.json().catch(() => []),
          workOrdersRes.json().catch(() => []),
          invoicesRes.json().catch(() => []),
        ]);
        if (cancelled) return;
        const customerId = String(viewingCustomer.id);
        const invoiceQuoteIds = new Set(
          (Array.isArray(invoicesData) ? invoicesData : [])
            .map((inv) => String(inv?.quoteId || "").trim())
            .filter(Boolean)
        );
        const visibleQuotes = (Array.isArray(quotesData) ? quotesData : []).filter(
          (q) => !invoiceQuoteIds.has(String(q?.id || "").trim())
        );
        const quoteAmountById = new Map(
          (Array.isArray(quotesData) ? quotesData : []).map((q) => [
            String(q?.id || ""),
            Number(q?.laborTotal || 0) + Number(q?.partsTotal || 0),
          ])
        );
        setCustomerActivity({
          quotes: visibleQuotes.filter((q) => String(q.customerId || "") === customerId),
          workOrders: Array.isArray(workOrdersData)
            ? workOrdersData
                .filter((w) => String(w.customerId || "") === customerId)
                .map((w) => ({
                  ...w,
                  linkedQuoteAmount: quoteAmountById.get(String(w?.quoteId || "")) || 0,
                }))
            : [],
          invoices: Array.isArray(invoicesData)
            ? invoicesData.filter((inv) => String(inv.customerId || "") === customerId)
            : [],
        });
      } finally {
        if (!cancelled) setCustomerActivityLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewModalOpen, viewingCustomer?.id, viewLoadingCustomerId]);

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
      toast.success("Customer's motor created and linked to this customer.");
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
      ein: dataToUse.ein ?? "",
      creditLimit: dataToUse.creditLimit ?? "",
      taxExempt: dataToUse.taxExempt !== false,
      taxPercent: dataToUse.taxPercent ?? "",
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

  const [tableSort, setTableSort] = useState({ key: null, direction: "asc" });
  const sortedCustomers = useMemo(
    () => sortRowsClient(filteredCustomers, tableSort),
    [filteredCustomers, tableSort]
  );
  const handleTableSort = useCallback((key, direction) => setTableSort({ key, direction }), []);

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
        sortable: true,
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
      { key: "primaryContactName", label: "Contact", sortable: true },
      { key: "phone", label: "Phone", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "ein", label: "EIN", sortable: true, render: (_, row) => row.ein || "—" },
      { key: "creditLimit", label: "Credit Limit", sortable: true, render: (_, row) => row.creditLimit || "—" },
      {
        key: "taxExempt",
        label: "Tax Exempted",
        sortable: true,
        render: (_, row) => (row.taxExempt === false ? "No" : "Yes"),
      },
      {
        key: "taxPercent",
        label: "Tax %",
        sortable: true,
        render: (_, row) => (row.taxExempt === false ? (row.taxPercent || "0") : "0"),
      },
      { key: "city", label: "City", sortable: true },
    ],
    []
  );

  const statusBadgeVariant = (status) => {
    const s = String(status || "").toLowerCase();
    if (["approved", "paid", "completed", "delivered", "closed"].includes(s)) return "success";
    if (["pending", "in progress", "assigned", "sent", "partially paid"].includes(s)) return "warning";
    if (["cancelled", "canceled", "rejected", "overdue", "void"].includes(s)) return "danger";
    if (["draft", "open"].includes(s)) return "default";
    return "primary";
  };

  const moneyLabel = (v) => {
    const n = Number.parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? formatMoney(n) : "—";
  };

  const statusAmountSummary = (rows, getAmount) => {
    const totals = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const status = String(row?.status || "draft").trim() || "draft";
      const amount = Number.parseFloat(String(getAmount(row) ?? "0"));
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      totals.set(status, (totals.get(status) || 0) + safeAmount);
    });
    return Array.from(totals.entries()).map(([status, amount]) => ({ status, amount }));
  };

  const invoiceStatusTotals = statusAmountSummary(
    customerActivity.invoices,
    (inv) => Number(inv?.laborTotal || 0) + Number(inv?.partsTotal || 0)
  );
  const quoteStatusTotals = statusAmountSummary(
    customerActivity.quotes,
    (q) => Number(q?.laborTotal || 0) + Number(q?.partsTotal || 0)
  );
  const workOrderStatusTotals = statusAmountSummary(
    customerActivity.workOrders,
    (wo) => Number(wo?.linkedQuoteAmount || 0)
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[86.4rem] flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Customers</h1>
          <p className="mt-1 text-sm text-secondary">
            Companies, contacts, billing, and addresses.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {user?.listingOnlyAccount && customers.length >= LISTING_ONLY_MAX_CUSTOMERS ? (
            <p className="max-w-[33.6rem] text-xs text-secondary">{LISTING_ONLY_UPGRADE_MESSAGE}</p>
          ) : (
            <Button variant="primary" onClick={openEnterModal} className="shrink-0">
              Enter New Customer
            </Button>
          )}
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
          data={sortedCustomers}
          rowKey="id"
          loading={loading}
          emptyMessage={customers.length === 0 ? "No customers yet. Use “Enter New Customer” to add one." : "No customers match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search company, contact, email…"
          onRefresh={() => { setLoading(true); loadCustomers(); }}
          sortState={tableSort}
          onSort={handleTableSort}
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
              <Input
                label="EIN"
                name="ein"
                value={form.ein}
                onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))}
                placeholder="Employer Identification Number"
              />
              <Input
                label="Credit limit"
                name="creditLimit"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                placeholder="e.g. 10000"
              />
              <Select
                label="Tax exempted"
                value={form.taxExempt ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    taxExempt: e.target.value !== "no",
                    taxPercent: e.target.value === "no" ? f.taxPercent : "",
                  }))
                }
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                searchable={false}
              />
              <Input
                label="Tax %"
                name="taxPercent"
                type="number"
                min="0"
                step="0.01"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
                placeholder="e.g. 8.25"
                disabled={form.taxExempt}
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
        size="7xl"
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Customer profile</p>
                    <h3 className="mt-1 text-lg font-semibold text-title">{viewingCustomer.companyName || "—"}</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {viewingCustomer.primaryContactName || "—"} · {viewingCustomer.email || "—"} · {viewingCustomer.phone || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={viewingCustomer.taxExempt === false ? "warning" : "success"} className="rounded-full px-2.5 py-0.5 text-xs">
                      Tax exempted: {viewingCustomer.taxExempt === false ? "No" : "Yes"}
                    </Badge>
                    <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                      Tax %: {viewingCustomer.taxExempt === false ? (viewingCustomer.taxPercent || "0") : "0"}
                    </Badge>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-secondary">EIN</dt><dd className="font-medium text-title">{viewingCustomer.ein || "—"}</dd></div>
                  <div><dt className="text-secondary">Credit limit</dt><dd className="font-medium text-title">{viewingCustomer.creditLimit || "—"}</dd></div>
                  <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingCustomer.city || "—"}</dd></div>
                  <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingCustomer.state || "—"}</dd></div>
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
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
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
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
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                  <p className="whitespace-pre-wrap text-sm text-title">{viewingCustomer.notes}</p>
                </div>
              )}
              {Array.isArray(viewingCustomer.additionalContacts) && viewingCustomer.additionalContacts.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Additional contacts</h3>
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
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Linked motors</h3>
                  <Button type="button" variant="outline" size="sm" onClick={openAddMotorModal}>
                    Add customer's motor
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
                  <p className="text-sm text-secondary">Customer's motors: —</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Invoices ({customerActivity.invoices.length})</h3>
                  {customerActivityLoading && <span className="text-xs text-secondary">Loading related records…</span>}
                </div>
                {invoiceStatusTotals.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {invoiceStatusTotals.map((s) => (
                      <Badge key={`inv-s-${s.status}`} variant={statusBadgeVariant(s.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                        {s.status}: {moneyLabel(s.amount)}
                      </Badge>
                    ))}
                  </div>
                )}
                {customerActivity.invoices.length === 0 ? (
                  <p className="text-sm text-secondary">No invoices found.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Invoice #</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Status</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {customerActivity.invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{inv.invoiceNumber || "—"}</td>
                            <td className="px-3 py-2">{inv.date || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={statusBadgeVariant(inv.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                                {inv.status || "—"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">{moneyLabel(Number(inv.laborTotal || 0) + Number(inv.partsTotal || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Quotes ({customerActivity.quotes.length})</h3>
                {quoteStatusTotals.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quoteStatusTotals.map((s) => (
                      <Badge key={`quote-s-${s.status}`} variant={statusBadgeVariant(s.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                        {s.status}: {moneyLabel(s.amount)}
                      </Badge>
                    ))}
                  </div>
                )}
                {customerActivity.quotes.length === 0 ? (
                  <p className="text-sm text-secondary">No quotes found.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">RFQ #</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Status</th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {customerActivity.quotes.map((q) => (
                          <tr key={q.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{q.rfqNumber || "—"}</td>
                            <td className="px-3 py-2">{q.date || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={statusBadgeVariant(q.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                                {q.status || "—"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right">{moneyLabel(Number(q.laborTotal || 0) + Number(q.partsTotal || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">Work orders ({customerActivity.workOrders.length})</h3>
                {workOrderStatusTotals.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {workOrderStatusTotals.map((s) => (
                      <Badge key={`wo-s-${s.status}`} variant={statusBadgeVariant(s.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                        {s.status}: {moneyLabel(s.amount)}
                      </Badge>
                    ))}
                  </div>
                )}
                {customerActivity.workOrders.length === 0 ? (
                  <p className="text-sm text-secondary">No work orders found.</p>
                ) : (
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">WO #</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">RFQ #</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {customerActivity.workOrders.map((wo) => (
                          <tr key={wo.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{wo.workOrderNumber || "—"}</td>
                            <td className="px-3 py-2">{wo.quoteRfqNumber || "—"}</td>
                            <td className="px-3 py-2">{wo.date || "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={statusBadgeVariant(wo.status)} className="rounded-full px-2.5 py-0.5 text-xs">
                                {wo.status || "—"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add customer's motor modal (from Customer View) */}
      <Modal
        open={addMotorModalOpen}
        onClose={closeAddMotorModal}
        title="Add customer's motor"
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
              <Input
                label="EIN"
                name="ein"
                value={form.ein}
                onChange={(e) => setForm((f) => ({ ...f, ein: e.target.value }))}
                placeholder="Employer Identification Number"
              />
              <Input
                label="Credit limit"
                name="creditLimit"
                value={form.creditLimit}
                onChange={(e) => setForm((f) => ({ ...f, creditLimit: e.target.value }))}
                placeholder="e.g. 10000"
              />
              <Select
                label="Tax exempted"
                value={form.taxExempt ? "yes" : "no"}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    taxExempt: e.target.value !== "no",
                    taxPercent: e.target.value === "no" ? f.taxPercent : "",
                  }))
                }
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                ]}
                searchable={false}
              />
              <Input
                label="Tax %"
                name="taxPercent"
                type="number"
                min="0"
                step="0.01"
                value={form.taxPercent}
                onChange={(e) => setForm((f) => ({ ...f, taxPercent: e.target.value }))}
                placeholder="e.g. 8.25"
                disabled={form.taxExempt}
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
