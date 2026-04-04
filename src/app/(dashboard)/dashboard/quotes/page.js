"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  FiEdit2,
  FiSave,
  FiSend,
  FiPrinter,
  FiTrash2,
  FiRotateCw,
  FiFileText,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { useAuth } from "@/contexts/auth-context";
import QuoteInventoryPartsControls from "@/components/dashboard/quote-inventory-parts-controls";
import QuoteFormRepairJobInspections from "@/components/dashboard/quote-form-repair-job-inspections";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";
import { scopeAndPartsToFlowLineItems } from "@/lib/repair-flow-quote-form-map";

/** Icons in modal Actions dropdown menu rows */
const MENU_IC = "h-4 w-4 shrink-0 text-secondary";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "rnr", label: "RNR (Return No Repair)" },
];

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

const ADD_MOTOR_INITIAL = {
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

function buildAddMotorPayload(form) {
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
    motorPhotos: [],
    nameplateImages: [],
    notes: f.notes ?? "",
  };
}

const SCOPE_COLUMNS = [
  { key: "scope", label: "Scope", width: "75%" },
  { key: "price", label: "Price", type: "number", width: "25%" },
];

const PARTS_COLUMNS = [
  { key: "item", label: "Item", width: "32%" },
  { key: "qty", label: "Qty", type: "number", width: "12%" },
  { key: "uom", label: "UOM", width: "12%" },
  { key: "price", label: "Price", type: "number", width: "14%" },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const q = parseFloat(row?.qty ?? "1");
      const p = parseFloat(row?.price ?? "0");
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : "";
    },
  },
];

function todayString() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

const INITIAL_FORM = {
  customerId: "",
  motorId: "",
  leadId: "",
  status: "draft",
  customerPo: "",
  date: todayString(),
  preparedBy: "",
  rfqNumber: "",
  repairScope: "",
  laborTotal: "",
  partsTotal: "",
  scopeLines: [],
  partsLines: [],
  estimatedCompletion: "",
  customerNotes: "",
  notes: "",
  /** Set when RFQ is from Job Write-Up; read-only in form, not sent on save */
  repairFlowJobId: "",
  /** Pipeline MotorRepairFlowQuote id — used to resolve job for inspections if repairFlowJobId is missing */
  motorRepairFlowQuoteId: "",
};

function sumLinePrices(lines, priceKey = "price") {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const p = parseFloat(row?.[priceKey]);
    if (Number.isFinite(p)) sum += p;
  }
  return sum;
}

function sumPartsLineTotals(lines) {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.price ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum;
}

function buildQuotePayload(form) {
  const f = form || {};
  const scopeLines = Array.isArray(f.scopeLines) ? f.scopeLines : [];
  const partsLines = Array.isArray(f.partsLines) ? f.partsLines : [];
  const laborFromLines = scopeLines.length ? sumLinePrices(scopeLines).toFixed(2) : (f.laborTotal ?? "");
  const partsFromLines = partsLines.length ? sumPartsLineTotals(partsLines).toFixed(2) : (f.partsTotal ?? "");
  return {
    customerId: f.customerId ?? "",
    motorId: f.motorId ?? "",
    leadId: f.leadId ?? "",
    status: f.status ?? "draft",
    customerPo: f.customerPo ?? "",
    date: f.date ?? "",
    preparedBy: f.preparedBy ?? "",
    repairScope: f.repairScope ?? "",
    laborTotal: laborFromLines,
    partsTotal: partsFromLines,
    scopeLines,
    partsLines,
    estimatedCompletion: f.estimatedCompletion ?? "",
    customerNotes: f.customerNotes ?? "",
    notes: f.notes ?? "",
  };
}

export default function DashboardQuotesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");
  const openQuoteId = searchParams.get("open");
  const editQuoteIdParam = searchParams.get("edit");

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [motors, setMotors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [viewLoadingQuoteId, setViewLoadingQuoteId] = useState(null);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quotePrintId, setQuotePrintId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const [addMotorModalOpen, setAddMotorModalOpen] = useState(false);
  const [addMotorForm, setAddMotorForm] = useState(ADD_MOTOR_INITIAL);
  const [savingMotor, setSavingMotor] = useState(false);

  const fmt = useFormatMoney();

  const openAddMotorModal = () => {
    const custId = form.customerId || formRef.current?.customerId;
    if (!custId) return;
    setAddMotorForm({ ...ADD_MOTOR_INITIAL, customerId: custId });
    setAddMotorModalOpen(true);
  };

  const handleMotorSelectChange = (e) => {
    const val = e.target?.value ?? "";
    if (val === "__add_motor__") {
      openAddMotorModal();
      return;
    }
    setForm((f) => ({ ...f, motorId: val }));
  };

  const handleAddMotorSubmit = async (e) => {
    e.preventDefault();
    const custId = addMotorForm.customerId?.trim();
    if (!custId) {
      toast.error("Customer is required.");
      return;
    }
    setSavingMotor(true);
    try {
      const res = await fetch("/api/dashboard/motors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildAddMotorPayload(addMotorForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create motor");
      toast.success("Motor added and linked to customer.");
      await loadMotors();
      setForm((f) => ({ ...f, motorId: data.motor?.id ?? data.id ?? "" }));
      setAddMotorModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to add motor");
    } finally {
      setSavingMotor(false);
    }
  };

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load quotes");
      setQuotes(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load quotes");
      setQuotes([]);
    }
  }, [toast]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/customers", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setCustomers([]);
    }
  }, []);

  const loadMotors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/motors", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load motors");
      setMotors(Array.isArray(data) ? data : []);
    } catch (e) {
      setMotors([]);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      setEmployees([]);
    }
  }, []);

  const defaultPreparedByEmployeeId = useMemo(() => {
    const loginEmail = String(authUser?.email || "")
      .trim()
      .toLowerCase();
    if (!loginEmail) return "";
    const emp = employees.find((e) => String(e.email || "").trim().toLowerCase() === loginEmail);
    return emp?.id ? String(emp.id) : "";
  }, [employees, authUser?.email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadQuotes(), loadCustomers(), loadMotors(), loadEmployees()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadQuotes, loadCustomers, loadMotors, loadEmployees]);

  useEffect(() => {
    if (!fromLeadId) return;
    toast.info("New RFQs are created from Job Write-Up. Open or create a repair job there to add a quote.");
    router.replace("/dashboard/quotes", { scroll: false });
  }, [fromLeadId, toast, router]);

  useEffect(() => {
    const id = openQuoteId?.trim();
    if (!id) return;
    setViewModalOpen(true);
    setViewLoadingQuoteId(id);
    router.replace("/dashboard/quotes", { scroll: false });
  }, [openQuoteId, router]);

  const openEditModal = useCallback(async (quote) => {
    if (!quote) return;
    let dataToUse = quote;
    if (quote?.id) {
      try {
        const res = await fetch(`/api/dashboard/quotes/${quote.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {
        // use row data
      }
    }
    setViewingQuote(dataToUse);
    setForm({
      customerId: dataToUse.customerId ?? "",
      motorId: dataToUse.motorId ?? "",
      leadId: dataToUse.leadId ?? "",
      status: dataToUse.status ?? "draft",
      customerPo: dataToUse.customerPo ?? "",
      date: dataToUse.date ?? todayString(),
      preparedBy: dataToUse.preparedBy ?? "",
      rfqNumber: dataToUse.rfqNumber ?? "",
      repairScope: dataToUse.repairScope ?? "",
      laborTotal: dataToUse.laborTotal ?? "",
      partsTotal: dataToUse.partsTotal ?? "",
      scopeLines: Array.isArray(dataToUse.scopeLines) ? dataToUse.scopeLines : [],
      partsLines: (Array.isArray(dataToUse.partsLines) ? dataToUse.partsLines : []).map((row) => ({ ...row, qty: row?.qty ?? "1" })),
      estimatedCompletion: dataToUse.estimatedCompletion ?? "",
      customerNotes: dataToUse.customerNotes ?? "",
      notes: dataToUse.notes ?? "",
      repairFlowJobId: dataToUse.repairFlowJobId ?? "",
      motorRepairFlowQuoteId: dataToUse.motorRepairFlowQuoteId ?? "",
    });
    setEditModalOpen(true);
  }, []);

  useEffect(() => {
    const id = editQuoteIdParam?.trim();
    if (!id) return;
    let cancelled = false;
    (async () => {
      await openEditModal({ id });
      if (!cancelled) router.replace("/dashboard/quotes", { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [editQuoteIdParam, openEditModal, router]);

  const customerOptions = useMemo(
    () =>
      [{ value: "", label: "Select customer…" }].concat(
        customers.map((c) => ({ value: c.id, label: c.companyName || c.id || "—" }))
      ),
    [customers]
  );

  const motorOptionsForCustomer = useMemo(() => {
    const custId = form.customerId || formRef.current?.customerId;
    if (!custId) return [{ value: "", label: "Select customer first" }];
    const linked = motors
      .filter((m) => m.customerId === custId)
      .map((m) => ({ value: m.id, label: [m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || m.id }));
    return [
      { value: "", label: "Select motor…" },
      ...linked,
      { value: "__add_motor__", label: "+ Add new motor (linked to this customer)" },
    ];
  }, [motors, form.customerId]);

  const customerNameMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => { m[c.id] = c.companyName || c.id || "—"; });
    return m;
  }, [customers]);

  const motorLabelMap = useMemo(() => {
    const m = {};
    motors.forEach((mtr) => {
      m[mtr.id] = [mtr.serialNumber, mtr.manufacturer, mtr.model].filter(Boolean).join(" · ") || mtr.id;
    });
    return m;
  }, [motors]);

  const openViewModal = useCallback((quote) => {
    if (!quote?.id) {
      setViewingQuote(quote);
      setViewModalOpen(true);
      return;
    }
    setViewingQuote(null);
    setViewLoadingQuoteId(quote.id);
    setViewModalOpen(true);
  }, []);

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingQuoteId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/quotes/${viewLoadingQuoteId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingQuoteId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingQuote(data);
        setViewLoadingQuoteId(null);
      } catch {
        if (!cancelled) setViewLoadingQuoteId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingQuoteId]);

  const closeViewModal = useCallback(() => {
    setViewModalOpen(false);
    setViewingQuote(null);
    setViewLoadingQuoteId(null);
  }, []);

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingQuote(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!viewingQuote?.id || !currentForm.customerId?.trim()) {
      toast.error("Customer is required.");
      return;
    }
    if (!currentForm.motorId?.trim()) {
      toast.error("Motor is required.");
      return;
    }
    const lineItems = scopeAndPartsToFlowLineItems(currentForm.scopeLines, currentForm.partsLines);
    if (!lineItems.length) {
      toast.error("Add at least one scope line or other cost line.");
      return;
    }
    setSavingQuote(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${viewingQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildQuotePayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quote");
      toast.success("Quote updated.");
      setQuotes((prev) =>
        prev.map((q) => (q.id === viewingQuote.id ? { ...q, ...data.quote } : q))
      );
      setViewingQuote(data.quote);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update quote");
    } finally {
      setSavingQuote(false);
    }
  };

  const [sendingQuoteId, setSendingQuoteId] = useState(null);
  const [deletingQuoteId, setDeletingQuoteId] = useState(null);

  async function handleDeleteQuote(row) {
    if (!row?.id) return;
    const rfq = row.rfqNumber || row.id;
    const ok = await confirm({
      title: "Delete quote",
      message: `Permanently delete quote ${rfq}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingQuoteId(row.id);
    try {
      const res = await fetch(`/api/dashboard/quotes/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete quote");
      toast.success("Quote deleted.");
      setQuotes((prev) => prev.filter((q) => q.id !== row.id));
      if (viewModalOpen && viewingQuote?.id === row.id) closeViewModal();
      else if (editModalOpen && viewingQuote?.id === row.id) closeEditModal();
      else if (viewingQuote?.id === row.id) setViewingQuote(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete quote");
    } finally {
      setDeletingQuoteId(null);
    }
  }

  const handleDeleteQuoteRef = useRef(handleDeleteQuote);
  handleDeleteQuoteRef.current = handleDeleteQuote;

  const handleSendToCustomer = useCallback(
    async (quoteFromTable) => {
      const quote = quoteFromTable?.id != null ? quoteFromTable : viewingQuote;
      const quoteId = quote?.id;
      if (!quoteId) return;
      const rfq = quote?.rfqNumber || quoteId;
      const confirmed = await confirm({
        title: "Send quote to customer",
        message: `Send quote ${rfq} to the customer? They will receive an email with a link to view and respond.`,
        confirmLabel: "Send",
        cancelLabel: "Cancel",
      });
      if (!confirmed) return;
      setSendingQuoteId(quoteId);
      try {
        const res = await fetch(`/api/dashboard/quotes/${quoteId}/send`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send quote");
        toast.success("Quote sent to customer. Status set to Sent.");
        setQuotes((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status: "sent" } : q)));
        setViewingQuote((prev) => (prev?.id === quoteId ? { ...prev, status: "sent" } : prev));
      } catch (err) {
        toast.error(err.message || "Failed to send quote");
      } finally {
        setSendingQuoteId(null);
      }
    },
    [viewingQuote, confirm, toast]
  );

  const handlePrintQuote = useCallback((quoteFromTable) => {
    const q = quoteFromTable ?? viewingQuote;
    if (!q?.id) return;
    setQuotePrintId(q.id);
  }, [viewingQuote]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const filteredQuotes = useMemo(() => {
    let list = quotes;
    if (statusFilter && statusFilter.trim()) {
      const status = statusFilter.trim().toLowerCase();
      list = list.filter((qt) => (qt.status || "draft").toLowerCase() === status);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (qt) =>
        (qt.rfqNumber || "").toLowerCase().includes(q) ||
        (customerNameMap[qt.customerId] || "").toLowerCase().includes(q) ||
        (motorLabelMap[qt.motorId] || "").toLowerCase().includes(q) ||
        (qt.status || "").toLowerCase().includes(q) ||
        (qt.repairScope || "").toLowerCase().includes(q)
    );
  }, [quotes, searchQuery, statusFilter, customerNameMap, motorLabelMap]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => {
          const isSending = sendingQuoteId === row.id;
          const isDeleting = deletingQuoteId === row.id;
          return (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleDeleteQuoteRef.current(row)}
                disabled={isDeleting}
                className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Delete quote"
                title="Delete quote"
              >
                {isDeleting ? (
                  <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                )}
              </button>
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
                onClick={() => handlePrintQuote(row)}
                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Print"
                title="Print"
              >
                <FiPrinter className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSendToCustomer(row)}
                disabled={isSending}
                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send to customer"
                title="Send to customer"
              >
                {isSending ? <FiRotateCw className="h-4 w-4 animate-spin" aria-hidden /> : <FiSend className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/invoices?draftQuote=${encodeURIComponent(row.id)}`)}
                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Create invoice"
                title="Create invoice"
              >
                <FiFileText className="h-4 w-4 shrink-0" />
              </button>
            </div>
          );
        },
      },
      {
        key: "rfqNumber",
        label: "RFQ#",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.rfqNumber || "—"}
          </button>
        ),
      },
      {
        key: "customer",
        label: "Customer",
        render: (_, row) => customerNameMap[row.customerId] || row.customerId || "—",
      },
      {
        key: "motor",
        label: "Motor",
        render: (_, row) => motorLabelMap[row.motorId] || row.motorId || "—",
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => {
          const s = (row.status || "draft").toLowerCase();
          const variantMap = { draft: "default", sent: "primary", approved: "success", rejected: "danger", rnr: "warning" };
          const variant = variantMap[s] || "default";
          const label = STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s.charAt(0).toUpperCase() + s.slice(1);
          return (
            <Badge variant={variant} className="rounded-full px-2.5 py-0.5 text-xs">
              {label}
            </Badge>
          );
        },
      },
      {
        key: "laborTotal",
        label: "Labor",
        render: (_, row) => (row.laborTotal ? fmt(row.laborTotal) : "—"),
      },
      {
        key: "partsTotal",
        label: "Other Cost",
        render: (_, row) => (row.partsTotal ? fmt(row.partsTotal) : "—"),
      },
      {
        key: "grandTotal",
        label: "Grand Total",
        render: (_, row) => {
          const labor = parseFloat(row.laborTotal || 0);
          const parts = parseFloat(row.partsTotal || 0);
          const total = labor + parts;
          return total ? fmt(total) : "—";
        },
      },
      { key: "estimatedCompletion", label: "Est. completion" },
    ],
    [
      customerNameMap,
      motorLabelMap,
      sendingQuoteId,
      deletingQuoteId,
      fmt,
      router,
      openViewModal,
      openEditModal,
      handlePrintQuote,
      handleSendToCustomer,
    ]
  );

  const employeeOptions = useMemo(
    () =>
      [{ value: "", label: "—" }].concat(
        employees.map((e) => ({ value: e.id, label: e.name || e.email || e.id || "—" }))
      ),
    [employees]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId) || null,
    [customers, form.customerId]
  );
  const selectedMotor = useMemo(
    () => motors.find((m) => m.id === form.motorId) || null,
    [motors, form.motorId]
  );

  const scopeTotal = useMemo(() => sumLinePrices(form.scopeLines), [form.scopeLines]);
  const partsTotalSum = useMemo(() => sumPartsLineTotals(form.partsLines), [form.partsLines]);
  const serviceProposalTotal = scopeTotal + partsTotalSum;

  const viewQuoteToolbarMenuItems = useMemo(() => {
    const vq = viewingQuote;
    return [
      {
        key: "edit",
        label: "Edit",
        icon: <FiEdit2 className={MENU_IC} />,
        disabled: !vq?.id,
        onClick: () => {
          closeViewModal();
          openEditModal(vq);
        },
      },
    ];
  }, [viewingQuote, closeViewModal, openEditModal]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Quotes</h1>
          <p className="mt-1 text-sm text-secondary">
            View and edit RFQs and manage status. New repair RFQs and job actions (send, print, work order, sales
            commission, Tag QR) are on Job Write-Up; create invoices from this page (row icon). Use the row icons here for
            print/send/invoice on standalone quotes. File attachments for a repair job are on Job Write-Up →
            Attachments.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value ?? "")}
            options={[
              { value: "", label: "All" },
              ...STATUS_OPTIONS,
            ]}
            searchable={false}
            placeholder="All statuses"
            className="w-44"
          />
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredQuotes}
          rowKey="id"
          loading={loading}
          emptyMessage={
            quotes.length === 0
              ? "No quotes yet. Create repair jobs and RFQs from Job Write-Up."
              : statusFilter
                ? "No quotes with this status."
                : "No quotes match the search."
          }
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search customer, motor, status…"
          onRefresh={async () => { setLoading(true); await loadQuotes(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Add Motor modal (from quote form) — same layout as customer's motors Create Motor */}
      <Modal
        open={addMotorModalOpen}
        onClose={() => setAddMotorModalOpen(false)}
        title="Add new motor"
        size="4xl"
        actions={
          <Button type="submit" form="add-motor-form" variant="primary" size="sm" disabled={savingMotor}>
            {savingMotor ? "Saving…" : <><FiSave className="mr-1.5 h-4 w-4 inline" />Save</>}
          </Button>
        }
      >
        <Form id="add-motor-form" onSubmit={handleAddMotorSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <p className="mb-3 text-sm text-secondary">
              Linked to: <span className="font-medium text-title">{selectedCustomer?.companyName || "—"}</span>
            </p>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Serial number"
                value={addMotorForm.serialNumber}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Motor details</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Manufacturer"
                value={addMotorForm.manufacturer}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={addMotorForm.model}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={addMotorForm.motorType}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input
                label="HP"
                value={addMotorForm.hp}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, hp: e.target.value }))}
                placeholder="e.g. 50"
              />
              <Input
                label="RPM"
                value={addMotorForm.rpm}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, rpm: e.target.value }))}
                placeholder="e.g. 1800"
              />
              <Input
                label="Voltage"
                value={addMotorForm.voltage}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Input
                label="KW"
                value={addMotorForm.kw}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="e.g. 37"
              />
              <Input
                label="AMPs"
                value={addMotorForm.amps}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, amps: e.target.value }))}
                placeholder="e.g. 45"
              />
              <Input
                label="Frame size"
                value={addMotorForm.frameSize}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
              <Input
                label="Slots"
                value={addMotorForm.slots}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, slots: e.target.value }))}
                placeholder="Slots"
              />
              <Input
                label="Core length"
                value={addMotorForm.coreLength}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, coreLength: e.target.value }))}
                placeholder="Core length"
              />
              <Input
                label="Core diameter"
                value={addMotorForm.coreDiameter}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, coreDiameter: e.target.value }))}
                placeholder="Core diameter"
              />
              <Input
                label="Bars"
                value={addMotorForm.bars}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, bars: e.target.value }))}
                placeholder="Bars"
              />
            </div>
          </div>
          <div>
            <Textarea
              label="Notes"
              value={addMotorForm.notes}
              onChange={(e) => setAddMotorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Quote details"
        size="full"
        width="min(1200px, 94vw)"
        headerClassName="flex-wrap"
        actions={<ModalActionsDropdown items={viewQuoteToolbarMenuItems} />}
      >
        {viewLoadingQuoteId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingQuote ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Quote info</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">RFQ#</dt><dd className="text-title font-medium">{viewingQuote.rfqNumber || "—"}</dd></div>
                <div><dt className="text-secondary">Customer PO#</dt><dd className="text-title">{viewingQuote.customerPo || "—"}</dd></div>
                <div><dt className="text-secondary">Date</dt><dd className="text-title">{viewingQuote.date || "—"}</dd></div>
                <div><dt className="text-secondary">Prepared by</dt><dd className="text-title">{employees.find((e) => e.id === viewingQuote.preparedBy)?.name || viewingQuote.preparedBy || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer &amp; motor</h3>
              <p className="text-title font-medium">{customerNameMap[viewingQuote.customerId] || viewingQuote.customerId || "—"}</p>
              <p className="mt-1 text-sm text-secondary">{motorLabelMap[viewingQuote.motorId] || viewingQuote.motorId || "—"}</p>
            </div>
            <QuoteFormRepairJobInspections
              repairFlowJobId={viewingQuote.repairFlowJobId}
              motorRepairFlowQuoteId={viewingQuote.motorRepairFlowQuoteId}
              quoteMotorId={viewingQuote.motorId}
            />
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Status & totals</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">Status</dt><dd className="text-title">{STATUS_OPTIONS.find((o) => o.value === (viewingQuote.status || ""))?.label ?? (viewingQuote.status || "—")}</dd></div>
                <div><dt className="text-secondary">Scope total</dt><dd className="text-title">{viewingQuote.laborTotal ? fmt(viewingQuote.laborTotal) : "—"}</dd></div>
                <div><dt className="text-secondary">Other Cost total</dt><dd className="text-title">{viewingQuote.partsTotal ? fmt(viewingQuote.partsTotal) : "—"}</dd></div>
                <div><dt className="text-secondary">Service proposal total</dt><dd className="font-semibold text-title">{fmt(parseFloat(viewingQuote.laborTotal || 0) + parseFloat(viewingQuote.partsTotal || 0))}</dd></div>
                <div><dt className="text-secondary">Est. completion</dt><dd className="text-title">{viewingQuote.estimatedCompletion || "—"}</dd></div>
              </dl>
            </div>
            {(Array.isArray(viewingQuote.scopeLines) && viewingQuote.scopeLines.length > 0) || (Array.isArray(viewingQuote.partsLines) && viewingQuote.partsLines.length > 0) ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {Array.isArray(viewingQuote.scopeLines) && viewingQuote.scopeLines.length > 0 && (
                  <div className="lg:col-span-2">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Scope with price</h3>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-card"><tr><th className="px-3 py-2 text-left text-xs font-medium text-title">Scope</th><th className="px-3 py-2 text-right text-xs font-medium text-title">Price</th></tr></thead>
                        <tbody>
                          {viewingQuote.scopeLines.map((row, i) => (
                            <tr key={i} className="border-b border-border last:border-b-0"><td className="px-3 py-2 text-text">{row.scope || "—"}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(row.price || 0)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {Array.isArray(viewingQuote.partsLines) && viewingQuote.partsLines.length > 0 && (
                  <div className="lg:col-span-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Other Cost (item, Qty, UOM, price)</h3>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-card"><tr><th className="px-3 py-2 text-left text-xs font-medium text-title">Item</th><th className="px-3 py-2 text-right text-xs font-medium text-title">Qty</th><th className="px-3 py-2 text-left text-xs font-medium text-title">UOM</th><th className="px-3 py-2 text-right text-xs font-medium text-title">Price</th><th className="px-3 py-2 text-right text-xs font-medium text-title">Total</th></tr></thead>
                        <tbody>
                          {viewingQuote.partsLines.map((row, i) => {
                            const q = parseFloat(row?.qty ?? "1");
                            const p = parseFloat(row?.price ?? "0");
                            const total = Number.isFinite(q) && Number.isFinite(p) ? q * p : null;
                            return (
                              <tr key={i} className="border-b border-border last:border-b-0">
                                <td className="px-3 py-2 text-text">{row.item || "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{row.qty ?? "1"}</td>
                                <td className="px-3 py-2 text-secondary">{row.uom || "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{row.price ? fmt(row.price) : "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{total != null ? fmt(total) : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : viewingQuote.repairScope ? (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Repair scope</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingQuote.repairScope}</p>
              </div>
            ) : null}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Quote notes</h3>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Notes / terms</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-title">{viewingQuote.notes || "—"}</dd>
                </div>
                {(viewingQuote.customerNotes || "").trim() ? (
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-secondary">Customer notes</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-title">{viewingQuote.customerNotes}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
            {viewingQuote.createdAt && (
              <p className="border-t border-border pt-4 text-xs text-secondary">
                Created {new Date(viewingQuote.createdAt).toLocaleString()}
              </p>
            )}
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Status history</h3>
              {Array.isArray(viewingQuote.statusLog) && (viewingQuote.statusLog ?? []).length > 0 ? (
                <ul className="space-y-1.5 text-sm">
                  {(viewingQuote.statusLog ?? []).map((entry, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-secondary">
                      <span className="font-medium text-title">{STATUS_OPTIONS.find((o) => o.value === (entry.from || "draft"))?.label ?? (entry.from || "draft")}</span>
                      <span>→</span>
                      <span className="font-medium text-title">{STATUS_OPTIONS.find((o) => o.value === (entry.to))?.label ?? (entry.to || "—")}</span>
                      {entry.at && (
                        <span className="text-xs">
                          {new Date(entry.at).toLocaleString()}
                        </span>
                      )}
                      {entry.by && (
                        <span className="text-xs">
                          by {entry.by === "customer" ? "Customer" : entry.by}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary">No status changes recorded yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit modal — layout aligned with Job Write-Up (RepairFlowCreateQuoteModal) */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit quote"
        size="full"
        width="min(1200px, 94vw)"
        showClose={!savingQuote}
        headerClassName="flex-wrap"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeEditModal} disabled={savingQuote}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="edit-quote-form"
              variant="primary"
              size="sm"
              disabled={savingQuote}
              className="inline-flex shrink-0 items-center gap-1.5"
            >
              {savingQuote ? (
                "Saving…"
              ) : (
                <>
                  <FiSave className="h-4 w-4 shrink-0" aria-hidden />
                  Save
                </>
              )}
            </Button>
          </>
        }
      >
        <Form id="edit-quote-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Quote info</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="RFQ#" value={form.rfqNumber || "—"} readOnly />
              <Input
                label="Customer PO#"
                value={form.customerPo}
                onChange={(e) => setForm((f) => ({ ...f, customerPo: e.target.value }))}
                placeholder="Customer PO number"
              />
              <Input
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <Select
                label="Prepared by"
                options={employeeOptions}
                value={form.preparedBy}
                onChange={(e) => setForm((f) => ({ ...f, preparedBy: e.target.value ?? "" }))}
                placeholder="Select employee"
                searchable
              />
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "draft" }))}
                placeholder="Status"
                searchable={false}
              />
              <Input
                label="Estimated completion"
                value={form.estimatedCompletion}
                onChange={(e) => setForm((f) => ({ ...f, estimatedCompletion: e.target.value }))}
                placeholder="e.g. 2 weeks"
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer &amp; motor</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Customer"
                options={customerOptions}
                value={form.customerId}
                onChange={(e) => {
                  const newCustomerId = e.target.value ?? "";
                  const currentMotor = motors.find((m) => m.id === form.motorId);
                  const keepMotor = currentMotor && currentMotor.customerId === newCustomerId;
                  setForm((f) => ({ ...f, customerId: newCustomerId, motorId: keepMotor ? f.motorId : "" }));
                }}
                placeholder="Select customer"
                searchable
                className="lg:col-span-2 min-w-0"
              />
              <Select
                label="Motor"
                options={motorOptionsForCustomer}
                value={form.motorId === "__add_motor__" ? "" : form.motorId}
                onChange={handleMotorSelectChange}
                placeholder={form.customerId ? "Select motor…" : "Select customer first"}
                searchable
                className="lg:col-span-2 min-w-0"
                disabled={!form.customerId}
              />
            </div>
            {(selectedCustomer || selectedMotor) && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedCustomer ? (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="font-medium text-title">Customer</div>
                    <p className="mt-1 text-title">{selectedCustomer.companyName || "—"}</p>
                    {selectedCustomer.primaryContactName ? (
                      <p className="text-secondary">{selectedCustomer.primaryContactName}</p>
                    ) : null}
                    {selectedCustomer.phone ? <p className="text-secondary">{selectedCustomer.phone}</p> : null}
                    {selectedCustomer.email ? <p className="text-secondary">{selectedCustomer.email}</p> : null}
                    {(selectedCustomer.address || selectedCustomer.city) && (
                      <p className="text-secondary">
                        {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                ) : null}
                {selectedMotor ? (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="font-medium text-title">Motor</div>
                    <p className="mt-1 text-title">
                      {[selectedMotor.serialNumber, selectedMotor.manufacturer, selectedMotor.model].filter(Boolean).join(" · ") ||
                        "—"}
                    </p>
                    {(selectedMotor.hp || selectedMotor.voltage || selectedMotor.rpm) && (
                      <p className="text-secondary">
                        {[
                          selectedMotor.hp && `${selectedMotor.hp} HP`,
                          selectedMotor.voltage && `${selectedMotor.voltage}V`,
                          selectedMotor.rpm && `${selectedMotor.rpm} RPM`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                    {selectedMotor.motorType ? <p className="text-secondary">Type: {selectedMotor.motorType}</p> : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <QuoteFormRepairJobInspections
            repairFlowJobId={form.repairFlowJobId}
            motorRepairFlowQuoteId={form.motorRepairFlowQuoteId}
            quoteMotorId={form.motorId}
            disabled={savingQuote}
          />
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Scope &amp; Other Cost</h3>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-2">
                <div className="mb-1 text-xs font-medium text-secondary">Scope with price</div>
                <DataTable
                  columns={SCOPE_COLUMNS}
                  data={form.scopeLines}
                  onChange={(rows) => setForm((f) => ({ ...f, scopeLines: rows }))}
                  striped
                />
              </div>
              <div className="lg:col-span-3">
                <div className="mb-1 text-xs font-medium text-secondary">Other Cost (item, Qty, UOM, price)</div>
                <QuoteInventoryPartsControls
                  partsLines={form.partsLines}
                  onChangePartsLines={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                  quoteId={viewingQuote?.id ?? null}
                  fmtPrice={fmt}
                />
                <DataTable
                  columns={PARTS_COLUMNS}
                  data={form.partsLines}
                  onChange={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                  striped
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
              <span className="text-sm text-secondary">Scope total: {fmt(scopeTotal)}</span>
              <span className="text-sm text-secondary">Other Cost total: {fmt(partsTotalSum)}</span>
              <span className="font-semibold text-title">Service proposal total: {fmt(serviceProposalTotal)}</span>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Quote notes</h3>
            <Textarea
              label="Notes / terms"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={4}
              placeholder="Terms, technician notes, and caveats…"
            />
          </div>
        </Form>
      </Modal>

      {quotePrintId ? (
        <QuotePrintPreview
          quoteId={quotePrintId}
          open
          onClose={() => setQuotePrintId(null)}
        />
      ) : null}
    </div>
  );
}
