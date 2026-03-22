"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEdit2, FiPlus, FiRotateCw, FiSend } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import PoVendorAccountsSection from "@/components/dashboard/po-vendor-accounts-section";

const PO_LINE_COLUMNS = [
  { key: "description", label: "Description", width: "40%" },
  { key: "qty", label: "Qty", type: "number", width: "10%" },
  { key: "uom", label: "UOM", width: "12%" },
  { key: "unitPrice", label: "Unit price", type: "number", width: "15%" },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const q = parseFloat(row?.qty ?? "1");
      const p = parseFloat(row?.unitPrice ?? "0");
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : "";
    },
  },
];

const PO_TYPE_OPTIONS = [
  { value: "shop", label: "Shop PO" },
  { value: "job", label: "Job PO (linked to RFQ)" },
];

const PARTS_SUPPLIED_COLUMNS = [{ key: "item", label: "Part / material" }];

const INITIAL_VENDOR_FORM = {
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

function buildVendorPayload(vendorForm) {
  const f = vendorForm || {};
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

const STATUS_VARIANT = {
  Open: "default",
  "Partially Invoiced": "warning",
  "Fully Invoiced": "primary",
  "Partially Paid": "warning",
  "Fully Paid": "success",
  Closed: "success",
};

const INVOICED_STATUS_VARIANT = {
  Partial: "warning",
  Invoiced: "success",
  "—": "default",
};

const PAID_STATUS_VARIANT = {
  Partially: "warning",
  Paid: "success",
  "—": "default",
};

const DELIVERY_STATUS_VARIANT = {
  Partial: "warning",
  Delivered: "success",
};

const INITIAL_FORM = {
  vendorId: "",
  type: "shop",
  quoteId: "",
  lineItems: [],
  notes: "",
};

function buildPayload(form) {
  const f = form || {};
  return {
    vendorId: f.vendorId ?? "",
    type: f.type === "job" ? "job" : "shop",
    quoteId: f.type === "job" ? (f.quoteId ?? "") : "",
    lineItems: Array.isArray(f.lineItems) ? f.lineItems : [],
    notes: f.notes ?? "",
  };
}

function sumLineItems(lines) {
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.unitPrice ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum.toFixed(2);
}

export default function DashboardPurchaseOrdersPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPoId = searchParams.get("open");
  const confirm = useConfirm();
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingPo, setViewingPo] = useState(null);
  const [viewLoadingPoId, setViewLoadingPoId] = useState(null);
  const [savingPo, setSavingPo] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const [attachInvoiceOpen, setAttachInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    date: "",
    amount: "",
    attachmentUrl: "",
    attachmentName: "",
  });
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [uploadingInvoiceFile, setUploadingInvoiceFile] = useState(false);
  const invoiceFileInputRef = useRef(null);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", method: "", reference: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [savingVendor, setSavingVendor] = useState(false);
  const vendorFormRef = useRef(vendorForm);
  vendorFormRef.current = vendorForm;

  const [sendingVendor, setSendingVendor] = useState(false);
  const [sendingVendorId, setSendingVendorId] = useState(null);

  const vendorOptions = useMemo(
    () => vendors.map((v) => ({ value: v.id, label: v.name || v.id || "—" })),
    [vendors]
  );
  const quoteOptions = useMemo(
    () => quotes.map((q) => ({ value: q.id, label: q.rfqNumber || q.id || "—" })),
    [quotes]
  );
  const vendorNameMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => { m[v.id] = v.name || v.id || "—"; });
    return m;
  }, [vendors]);

  const loadPos = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/purchase-orders", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load purchase orders");
      setPos(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load purchase orders");
      setPos([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/vendors", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setVendors([]);
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quotes");
      setQuotes(Array.isArray(data) ? data : []);
    } catch {
      setQuotes([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadPos(), loadVendors(), loadQuotes()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadPos, loadVendors, loadQuotes]);

  useEffect(() => {
    const id = openPoId?.trim();
    if (!id) return;
    setViewLoadingPoId(id);
    setViewModalOpen(true);
    router.replace("/dashboard/purchase-orders", { scroll: false });
  }, [openPoId, router]);

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => setCreateModalOpen(false);

  const nextPoNumber = useMemo(() => {
    let maxNum = 0;
    for (const p of pos) {
      const m = (p.poNumber || "").match(/^P(\d+)$/i);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return "P" + String(maxNum + 1).padStart(5, "0");
  }, [pos]);

  const openAddVendorModal = () => {
    setVendorForm(INITIAL_VENDOR_FORM);
    setAddVendorModalOpen(true);
  };
  const closeAddVendorModal = () => {
    setAddVendorModalOpen(false);
    setVendorForm(INITIAL_VENDOR_FORM);
  };

  const handleSendToVendor = async (poFromTable) => {
    const po = poFromTable ?? viewingPo;
    const poId = po?.id;
    if (!poId) return;
    const poNum = po?.poNumber || poId;
    const confirmed = await confirm({
      title: "Send purchase order to vendor",
      message: `Send purchase order ${poNum} to the vendor? They will receive an email with a link to view, print, and update delivery status for each line item.`,
      confirmLabel: "Send",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;
    setSendingVendor(true);
    setSendingVendorId(poId);
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${poId}/send`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to send purchase order");
      toast.success(data?.message ?? "Purchase order sent to vendor.");
      loadPos();
    } catch (err) {
      toast.error(err?.message ?? "Failed to send purchase order");
    } finally {
      setSendingVendor(false);
      setSendingVendorId(null);
    }
  };

  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    setSavingVendor(true);
    try {
      const payload = buildVendorPayload(vendorFormRef.current);
      const res = await fetch("/api/dashboard/vendors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message ?? "Failed to add vendor");
        return;
      }
      if (data?.vendor?.id) {
        await loadVendors();
        setForm((f) => ({ ...f, vendorId: data.vendor.id }));
        closeAddVendorModal();
        toast.success("Vendor added and selected");
      } else {
        toast.error("Vendor saved but could not select it");
      }
    } catch (err) {
      toast.error(err?.message ?? "Failed to add vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const openViewModal = (po) => {
    if (!po?.id) {
      setViewingPo(po);
      setViewModalOpen(true);
      return;
    }
    setViewingPo(null);
    setViewLoadingPoId(po.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingPoId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${viewLoadingPoId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingPoId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingPo(data);
        setViewLoadingPoId(null);
      } catch {
        if (!cancelled) setViewLoadingPoId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingPoId]);

  const closeViewModal = () => {
    queueMicrotask(() => {
      setViewModalOpen(false);
      setViewingPo(null);
      setViewLoadingPoId(null);
      setAttachInvoiceOpen(false);
      setRecordPaymentOpen(false);
    });
  };

  const openEditModal = async (po) => {
    if (!po) return;
    let dataToUse = po;
    if (po?.id) {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${po.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {}
    }
    setForm({
      vendorId: dataToUse.vendorId ?? "",
      type: dataToUse.type ?? "shop",
      quoteId: dataToUse.quoteId ?? "",
      lineItems: Array.isArray(dataToUse.lineItems) ? dataToUse.lineItems : [],
      notes: dataToUse.notes ?? "",
    });
    setViewingPo(dataToUse);
    setEditModalOpen(true);
  };
  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingPo(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSavingPo(true);
    try {
      const res = await fetch("/api/dashboard/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create purchase order");
      toast.success("Purchase order created.");
      closeCreateModal();
      loadPos();
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingPo(true);
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...buildPayload(formRef.current),
          vendorInvoices: viewingPo.vendorInvoices ?? [],
          payments: viewingPo.payments ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update purchase order");
      toast.success("Purchase order updated.");
      setViewingPo(data.purchaseOrder);
      setPos((prev) => prev.map((p) => (p.id === viewingPo.id ? { ...p, ...data.purchaseOrder } : p)));
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  const handleInvoiceFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !viewingPo?.id) return;
    setUploadingInvoiceFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}/upload-invoice`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setInvoiceForm((f) => ({
        ...f,
        attachmentUrl: data.url ?? "",
        attachmentName: data.name ?? file.name ?? "",
      }));
    } catch (err) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingInvoiceFile(false);
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
    }
  };

  const handleAttachInvoice = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingInvoice(true);
    try {
      const newInvoice = {
        invoiceNumber: invoiceForm.invoiceNumber,
        date: invoiceForm.date,
        amount: invoiceForm.amount,
        attachmentUrl: invoiceForm.attachmentUrl ?? "",
        attachmentName: invoiceForm.attachmentName ?? "",
      };
      const newInvoices = [...(viewingPo.vendorInvoices || []), newInvoice];
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: viewingPo.vendorId,
          type: viewingPo.type,
          quoteId: viewingPo.quoteId,
          lineItems: viewingPo.lineItems ?? [],
          vendorInvoices: newInvoices,
          payments: viewingPo.payments ?? [],
          notes: viewingPo.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to attach invoice");
      toast.success("Vendor invoice attached.");
      setViewingPo(data.purchaseOrder);
      setInvoiceForm({ invoiceNumber: "", date: "", amount: "", attachmentUrl: "", attachmentName: "" });
      setAttachInvoiceOpen(false);
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
      loadPos();
    } catch (err) {
      toast.error(err.message || "Failed to attach invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingPayment(true);
    try {
      const newPayments = [...(viewingPo.payments || []), { ...paymentForm }];
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorId: viewingPo.vendorId,
          type: viewingPo.type,
          quoteId: viewingPo.quoteId,
          lineItems: viewingPo.lineItems ?? [],
          vendorInvoices: viewingPo.vendorInvoices ?? [],
          payments: newPayments,
          notes: viewingPo.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");
      toast.success("Payment recorded.");
      setViewingPo(data.purchaseOrder);
      setPaymentForm({ amount: "", date: "", method: "", reference: "" });
      setRecordPaymentOpen(false);
      loadPos();
    } catch (err) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredPos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return pos;
    return pos.filter((p) => {
      const vendor = (vendorNameMap[p.vendorId] || "").toLowerCase();
      const rfq = (p.rfqNumber || "").toLowerCase();
      const status = (p.status || "").toLowerCase();
      const deliveryStatus = (p.deliveryStatus || "").toLowerCase();
      const poNum = (p.poNumber || "").toLowerCase();
      return vendor.includes(q) || rfq.includes(q) || status.includes(q) || deliveryStatus.includes(q) || poNum.includes(q);
    });
  }, [pos, searchQuery, vendorNameMap]);

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
            <button
              type="button"
              onClick={() => handleSendToVendor(row)}
              disabled={sendingVendor}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              aria-label="Send to vendor"
              title="Send to vendor"
            >
              {sendingVendorId === row.id ? <FiRotateCw className="h-4 w-4 animate-spin" aria-hidden /> : <FiSend className="h-4 w-4" />}
            </button>
          </div>
        ),
      },
      {
        key: "poNumber",
        label: "PO #",
        render: (_, row) => row.poNumber || "—",
      },
      {
        key: "vendor",
        label: "Vendor",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {vendorNameMap[row.vendorId] || row.vendorId || "—"}
          </button>
        ),
      },
      {
        key: "type",
        label: "Type",
        render: (_, row) => (row.type === "job" ? "Job PO" : "Shop PO"),
      },
      {
        key: "rfqNumber",
        label: "RFQ#",
        render: (_, row) => (row.type === "job" ? (row.rfqNumber || "—") : "—"),
      },
      {
        key: "deliveryStatus",
        label: "Delivered",
        render: (_, row) => (
          <Badge variant={DELIVERY_STATUS_VARIANT[row.deliveryStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.deliveryStatus ?? "Partial"}
          </Badge>
        ),
      },
      {
        key: "invoicedStatus",
        label: "Invoiced",
        render: (_, row) => (
          <Badge variant={INVOICED_STATUS_VARIANT[row.invoicedStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.invoicedStatus ?? "—"}
          </Badge>
        ),
      },
      {
        key: "paidStatus",
        label: "Paid",
        render: (_, row) => (
          <Badge variant={PAID_STATUS_VARIANT[row.paidStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.paidStatus ?? "—"}
          </Badge>
        ),
      },
      {
        key: "totalOrder",
        label: "Order total",
        render: (_, row) => (row.totalOrder ? fmt(row.totalOrder) : "—"),
      },
      {
        key: "totalInvoiced",
        label: "Invoiced",
        render: (_, row) => (row.totalInvoiced ? fmt(row.totalInvoiced) : "—"),
      },
      {
        key: "totalPaid",
        label: "Paid",
        render: (_, row) => (row.totalPaid ? fmt(row.totalPaid) : "—"),
      },
    ],
    [vendorNameMap, sendingVendorId, fmt]
  );

  const todayString = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  const PO_MENU_IC = "h-4 w-4 shrink-0 text-secondary";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-title">Purchase orders</h1>
          <Button variant="primary" onClick={openCreateModal} className="shrink-0">
            Create Purchase Order
          </Button>
        </div>
        <p className="mt-1 text-sm text-secondary">
          Create PO to vendor. Attach vendor invoices, record payments. Invoiced/Paid status; Delivered when all items are Received (via logistics).
        </p>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredPos}
          rowKey="id"
          loading={loading}
          emptyMessage={pos.length === 0 ? "No purchase orders yet. Use “Create Purchase Order” to add one." : "No purchase orders match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search PO #, vendor, RFQ#, status…"
          onRefresh={async () => { setLoading(true); await loadPos(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Create PO modal */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Create Purchase Order"
        size="4xl"
        actions={
          <>
            <ModalActionsDropdown
              items={[
                {
                  key: "send",
                  label: "Send To Vendor",
                  disabled: true,
                  title: "Save the PO first to send to vendor",
                },
                {
                  key: "vendor",
                  label: "Add New Vendor",
                  icon: <FiPlus className={PO_MENU_IC} />,
                  onClick: openAddVendorModal,
                },
              ]}
            />
            <Button type="submit" form="create-po-form" variant="primary" size="sm" disabled={savingPo}>
              {savingPo ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="create-po-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Vendor & type</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="PO #" value={nextPoNumber} readOnly />
              <Select
                label="Vendor"
                options={vendorOptions}
                value={form.vendorId}
                onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value ?? "" }))}
                placeholder="Select vendor"
                searchable
                className="lg:col-span-2"
              />
              <Select
                label="Type"
                options={PO_TYPE_OPTIONS}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value ?? "shop" }))}
                searchable={false}
                className="lg:col-span-2 min-w-[200px]"
              />
              {form.type === "job" && (
                <Select
                  label="Quote (RFQ#)"
                  options={quoteOptions}
                  value={form.quoteId}
                  onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value ?? "" }))}
                  placeholder="Select quote (optional)"
                  searchable
                  className="lg:col-span-2"
                />
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Line items</h3>
            <DataTable
              columns={PO_LINE_COLUMNS}
              data={form.lineItems}
              onChange={(rows) => setForm((f) => ({ ...f, lineItems: rows }))}
              striped
            />
            <p className="mt-2 text-sm text-secondary">Order total: {fmt(parseFloat(sumLineItems(form.lineItems)) || 0)}</p>
          </div>
          <div>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
            />
          </div>
        </Form>
      </Modal>

      {/* Add Vendor modal (from Create PO) */}
      <Modal
        open={addVendorModalOpen}
        onClose={closeAddVendorModal}
        title="Add Vendor"
        size="4xl"
        actions={
          <Button type="submit" form="add-vendor-form" variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="add-vendor-form" onSubmit={handleAddVendorSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Vendor & contact</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Vendor name"
                name="name"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company or supplier name"
                required
              />
              <Input
                label="Contact name"
                name="contactName"
                value={vendorForm.contactName}
                onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Contact person"
              />
              <Input
                label="Phone"
                name="phone"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Address"
                name="address"
                value={vendorForm.address}
                onChange={(e) => setVendorForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
              />
              <Input
                label="City"
                name="city"
                value={vendorForm.city}
                onChange={(e) => setVendorForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="state"
                value={vendorForm.state}
                onChange={(e) => setVendorForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="State"
              />
              <Input
                label="ZIP"
                name="zipCode"
                value={vendorForm.zipCode}
                onChange={(e) => setVendorForm((f) => ({ ...f, zipCode: e.target.value }))}
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
                value={vendorForm.paymentTerms}
                onChange={(e) => setVendorForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="e.g. Net 30, Net 60"
              />
              <div className="w-full min-w-0">
                <div className="mb-1 text-xs font-medium text-secondary">Parts / materials this vendor supplies</div>
                <DataTable
                  columns={PARTS_SUPPLIED_COLUMNS}
                  data={vendorForm.partsSupplied}
                  onChange={(rows) => setVendorForm((f) => ({ ...f, partsSupplied: rows }))}
                  striped
                />
              </div>
            </div>
          </div>
          <div>
            <Textarea
              label="Notes"
              name="notes"
              value={vendorForm.notes}
              onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      {/* View PO modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title={viewingPo?.poNumber ? `Purchase order ${viewingPo.poNumber}` : "Purchase order"}
        size="4xl"
        actions={
          <ModalActionsDropdown
            items={[
              {
                key: "attachInv",
                label: "Attach Vendor Invoice",
                onClick: () => {
                  setInvoiceForm((f) => ({ ...f, date: todayString() }));
                  setAttachInvoiceOpen(true);
                },
              },
              {
                key: "pay",
                label: "Record Payment",
                onClick: () => {
                  setPaymentForm((f) => ({ ...f, date: todayString() }));
                  setRecordPaymentOpen(true);
                },
              },
              {
                key: "send",
                label: sendingVendor ? "Sending…" : "Send To Vendor",
                icon: sendingVendor ? (
                  <FiRotateCw className={`${PO_MENU_IC} animate-spin`} aria-hidden />
                ) : (
                  <FiSend className={PO_MENU_IC} />
                ),
                disabled: !viewingPo?.id || sendingVendor,
                onClick: () => handleSendToVendor(viewingPo),
              },
              { key: "d1", type: "divider" },
              {
                key: "edit",
                label: "Edit",
                icon: <FiEdit2 className={PO_MENU_IC} />,
                onClick: () => {
                  closeViewModal();
                  openEditModal(viewingPo);
                },
              },
            ]}
          />
        }
      >
        {viewLoadingPoId ? (
          <div className="flex justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingPo ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Vendor & type</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                {viewingPo.poNumber && (
                  <div><dt className="text-secondary">PO #</dt><dd className="text-title font-medium">{viewingPo.poNumber}</dd></div>
                )}
                <div><dt className="text-secondary">Vendor</dt><dd className="text-title font-medium">{vendorNameMap[viewingPo.vendorId] || viewingPo.vendorId || "—"}</dd></div>
                <div><dt className="text-secondary">Type</dt><dd className="text-title">{viewingPo.type === "job" ? "Job PO" : "Shop PO"}</dd></div>
                {viewingPo.type === "job" && (
                  <div><dt className="text-secondary">RFQ#</dt><dd className="text-title">{viewingPo.quoteId ? (quotes.find((q) => q.id === viewingPo.quoteId)?.rfqNumber || viewingPo.quoteId) : "—"}</dd></div>
                )}
                <div><dt className="text-secondary">Delivered</dt><dd><Badge variant={DELIVERY_STATUS_VARIANT[viewingPo.deliveryStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">{viewingPo.deliveryStatus ?? "Partial"}</Badge></dd></div>
                <div><dt className="text-secondary">Invoiced</dt><dd><Badge variant={INVOICED_STATUS_VARIANT[viewingPo.invoicedStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">{viewingPo.invoicedStatus ?? "—"}</Badge></dd></div>
                <div><dt className="text-secondary">Paid</dt><dd><Badge variant={PAID_STATUS_VARIANT[viewingPo.paidStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">{viewingPo.paidStatus ?? "—"}</Badge></dd></div>
              </dl>
            </div>
            {(accountSettings?.accountsBillingAddress || accountSettings?.accountsShippingAddress) && (
              <div className="rounded-lg border border-border bg-form-bg/50 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Your billing &amp; ship-to (shown to vendor)
                </h3>
                <PoVendorAccountsSection
                  billingAddress={accountSettings?.accountsBillingAddress}
                  shippingAddress={accountSettings?.accountsShippingAddress}
                />
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Line items</h3>
              {Array.isArray(viewingPo.lineItems) && viewingPo.lineItems.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-3 py-2 text-left text-secondary">Description</th>
                        <th className="px-3 py-2 text-right text-secondary">Qty</th>
                        <th className="px-3 py-2 text-left text-secondary">UOM</th>
                        <th className="px-3 py-2 text-right text-secondary">Unit price</th>
                        <th className="px-3 py-2 text-right text-secondary">Total</th>
                        <th className="px-3 py-2 text-left text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPo.lineItems.map((row, i) => {
                        const q = parseFloat(row?.qty ?? "1");
                        const p = parseFloat(row?.unitPrice ?? "0");
                        const total = Number.isFinite(q) && Number.isFinite(p) ? (q * p).toFixed(2) : "—";
                        const itemStatus =
                          row?.status === "Received"
                            ? "Received"
                            : row?.status === "Back Order"
                              ? "Back Order"
                              : row?.status === "Delivered" || row?.status === "Dispatch"
                                ? "Dispatch"
                                : "Ordered";
                        const itemBadgeVariant =
                          itemStatus === "Received"
                            ? "success"
                            : itemStatus === "Back Order"
                              ? "warning"
                              : itemStatus === "Dispatch"
                                ? "primary"
                                : "default";
                        return (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-title">{row?.description || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row?.qty ?? "—"}</td>
                            <td className="px-3 py-2 text-title">{row?.uom || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{row?.unitPrice ? fmt(row.unitPrice) : "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{total !== "—" ? fmt(parseFloat(total)) : "—"}</td>
                            <td className="px-3 py-2">
                              <Badge variant={itemBadgeVariant} className="rounded-full px-2 py-0.5 text-xs">
                                {itemStatus}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No line items.</p>
              )}
              <p className="mt-2 text-sm font-medium text-title">Order total: {fmt(viewingPo.totalOrder || 0)}</p>
            </div>
            {(viewingPo.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingPo.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Attach Vendor Invoice modal */}
      <Modal
        open={attachInvoiceOpen}
        onClose={() => setAttachInvoiceOpen(false)}
        title="Attach vendor invoice"
        size="2xl"
        actions={
          <Button type="submit" form="attach-invoice-form" variant="primary" size="sm" disabled={savingInvoice}>
            {savingInvoice ? "Saving…" : "Attach"}
          </Button>
        }
      >
        <Form id="attach-invoice-form" onSubmit={handleAttachInvoice} className="flex flex-col gap-4 !space-y-0">
          <Input
            label="Invoice number"
            value={invoiceForm.invoiceNumber}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
            placeholder="Vendor invoice #"
          />
          <Input
            label="Date"
            type="date"
            value={invoiceForm.date}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={invoiceForm.amount}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Invoice file (optional)</label>
            <input
              ref={invoiceFileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleInvoiceFileChange}
              disabled={uploadingInvoiceFile}
              className="block w-full text-sm text-title file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:opacity-90"
            />
            {uploadingInvoiceFile && <p className="mt-1 text-xs text-secondary">Uploading…</p>}
            {invoiceForm.attachmentName && !uploadingInvoiceFile && (
              <p className="mt-1 flex items-center gap-2 text-sm text-title">
                <span className="truncate">{invoiceForm.attachmentName}</span>
                <button
                  type="button"
                  onClick={() => setInvoiceForm((f) => ({ ...f, attachmentUrl: "", attachmentName: "" }))}
                  className="shrink-0 text-secondary hover:text-danger focus:outline-none"
                  aria-label="Remove file"
                >
                  Remove
                </button>
              </p>
            )}
          </div>
          {viewingPo && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Vendor invoices</h3>
              {Array.isArray(viewingPo.vendorInvoices) && viewingPo.vendorInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-3 py-2 text-left text-secondary">Invoice #</th>
                        <th className="px-3 py-2 text-left text-secondary">Date</th>
                        <th className="px-3 py-2 text-right text-secondary">Amount</th>
                        <th className="px-3 py-2 text-left text-secondary">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPo.vendorInvoices.map((inv, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 text-title">{inv?.invoiceNumber || "—"}</td>
                          <td className="px-3 py-2 text-secondary">{inv?.date || "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(inv?.amount || 0)}</td>
                          <td className="px-3 py-2">
                            {inv?.attachmentUrl ? (
                              <a href={inv.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {inv?.attachmentName || "View file"}
                              </a>
                            ) : (
                              <span className="text-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No vendor invoices attached yet.</p>
              )}
              <p className="mt-1 text-sm text-secondary">Total invoiced: {fmt(viewingPo.totalInvoiced || 0)}</p>
            </div>
          )}
        </Form>
      </Modal>

      {/* Record Payment modal */}
      <Modal
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        title="Record payment"
        size="2xl"
        actions={
          <Button type="submit" form="record-payment-form" variant="primary" size="sm" disabled={savingPayment}>
            {savingPayment ? "Saving…" : "Record"}
          </Button>
        }
      >
        <Form id="record-payment-form" onSubmit={handleRecordPayment} className="flex flex-col gap-4 !space-y-0">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
          <Input
            label="Date"
            type="date"
            value={paymentForm.date}
            onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Method"
            value={paymentForm.method}
            onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
            placeholder="e.g. Check, ACH, Card"
          />
          <Input
            label="Reference"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="Check #, transaction ID"
          />
          {viewingPo && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Payments</h3>
              {Array.isArray(viewingPo.payments) && viewingPo.payments.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-3 py-2 text-right text-secondary">Amount</th>
                        <th className="px-3 py-2 text-left text-secondary">Date</th>
                        <th className="px-3 py-2 text-left text-secondary">Method</th>
                        <th className="px-3 py-2 text-left text-secondary">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPo.payments.map((pay, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(pay?.amount || 0)}</td>
                          <td className="px-3 py-2 text-secondary">{pay?.date || "—"}</td>
                          <td className="px-3 py-2 text-title">{pay?.method || "—"}</td>
                          <td className="px-3 py-2 text-secondary">{pay?.reference || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No payments recorded yet.</p>
              )}
              <p className="mt-1 text-sm text-secondary">Total paid: {fmt(viewingPo.totalPaid || 0)}</p>
            </div>
          )}
        </Form>
      </Modal>

      {/* Edit PO modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit purchase order"
        size="4xl"
        actions={
          <Button type="submit" form="edit-po-form" variant="primary" size="sm" disabled={savingPo}>
            {savingPo ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-po-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Vendor & type</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Vendor"
                options={vendorOptions}
                value={form.vendorId}
                onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value ?? "" }))}
                placeholder="Select vendor"
                searchable
                className="lg:col-span-2"
              />
              <Select
                label="Type"
                options={PO_TYPE_OPTIONS}
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value ?? "shop" }))}
                searchable={false}
                className="lg:col-span-2 min-w-[200px]"
              />
              {form.type === "job" && (
                <Select
                  label="Quote (RFQ#)"
                  options={quoteOptions}
                  value={form.quoteId}
                  onChange={(e) => setForm((f) => ({ ...f, quoteId: e.target.value ?? "" }))}
                  placeholder="Select quote (optional)"
                  searchable
                  className="lg:col-span-2"
                />
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Line items</h3>
            <DataTable
              columns={PO_LINE_COLUMNS}
              data={form.lineItems}
              onChange={(rows) => setForm((f) => ({ ...f, lineItems: rows }))}
              striped
            />
            <p className="mt-2 text-sm text-secondary">Order total: {fmt(parseFloat(sumLineItems(form.lineItems)) || 0)}</p>
          </div>
          <div>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
