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
  FiDollarSign,
  FiTool,
  FiClipboard,
  FiPlus,
} from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { quoteStatusSelectOptionsFromMerged, quoteStatusTileColorForValue } from "@/lib/dropdown-catalog";
import { resolveTilePresetClass } from "@/lib/work-order-status-tiles";
import { useAuth } from "@/contexts/auth-context";
import QuoteInventoryPartsControls from "@/components/dashboard/quote-inventory-parts-controls";
import QuoteFormRepairJobInspections from "@/components/dashboard/quote-form-repair-job-inspections";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import { scopeAndPartsToFlowLineItems } from "@/lib/repair-flow-quote-form-map";
import { computeTotalsFromLaborAndParts, normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";
import {
  WRITE_UP_QUOTE_STATUS,
  filterQuotesForRfqList,
  isWriteUpStatus,
  jobNumberFieldLabel,
} from "@/lib/quote-rfq-lifecycle";

/** Icons in modal Actions dropdown menu rows */
const MENU_IC = "h-4 w-4 shrink-0 text-secondary";

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
  status: WRITE_UP_QUOTE_STATUS,
  customerPo: "",
  date: todayString(),
  preparedBy: "",
  rfqNumber: "",
  repairScope: "",
  laborTotal: "",
  partsTotal: "",
  customerTaxExempt: true,
  customerTaxPercent: "0",
  scopeLines: [],
  partsLines: [],
  estimatedCompletion: "",
  customerNotes: "",
  notes: "",
  /** Set when RFQ is from Job Write-Up; read-only in form, not sent on save */
  repairFlowJobId: "",
  /** Pipeline MotorRepairFlowQuote id — used to resolve job for inspections if repairFlowJobId is missing */
  motorRepairFlowQuoteId: "",
  /** CRM quote id while editing (not submitted on save) */
  quoteId: "",
  /** Linked work order — drives JOB# vs RFQ# label on the form */
  workOrderId: "",
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
    customerTaxExempt: f.customerTaxExempt !== false,
    customerTaxPercent: f.customerTaxExempt ? "0" : (f.customerTaxPercent ?? "0"),
    scopeLines,
    partsLines,
    estimatedCompletion: f.estimatedCompletion ?? "",
    customerNotes: f.customerNotes ?? "",
    notes: f.notes ?? "",
  };
}

/** Dashboard list routes return `{ items, totalCount }` when `page` / `pageSize` are sent; max pageSize is 100. */
async function fetchAllPaginatedDashboardItems(basePath) {
  const pageSize = 100;
  let page = 1;
  const all = [];
  for (; ;) {
    const sep = basePath.includes("?") ? "&" : "?";
    const res = await fetch(`${basePath}${sep}page=${page}&pageSize=${pageSize}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    const items = Array.isArray(data?.items) ? data.items : [];
    all.push(...items);
    const total = Number(data?.totalCount);
    if (items.length < pageSize || (Number.isFinite(total) && all.length >= total)) break;
    page += 1;
    if (page > 500) break;
  }
  return all;
}

export default function DashboardRfqListPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: authUser } = useAuth();
  const router = useRouter();
  const jobIdLabel = "RFQ#";
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");
  const openQuoteId = searchParams.get("open");
  const editQuoteIdParam = searchParams.get("edit");

  const [quotesRaw, setQuotesRaw] = useState([]);
  const [linkedInvoices, setLinkedInvoices] = useState([]);
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
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [workOrderModal, setWorkOrderModal] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const editFormJobIdLabel = useMemo(() => jobNumberFieldLabel(form.workOrderId), [form.workOrderId]);
  const viewJobIdLabel = useMemo(
    () => jobNumberFieldLabel(viewingQuote?.workOrderId),
    [viewingQuote?.workOrderId]
  );

  const [addMotorModalOpen, setAddMotorModalOpen] = useState(false);
  const [addMotorForm, setAddMotorForm] = useState(ADD_MOTOR_INITIAL);
  const [savingMotor, setSavingMotor] = useState(false);

  const fmt = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const quotes = useMemo(
    () => filterQuotesForRfqList(quotesRaw, linkedInvoices, mergedSettings),
    [quotesRaw, linkedInvoices, mergedSettings]
  );

  const statusSelectOptions = useMemo(
    () => quoteStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );
  const statusOptionsForForm = useMemo(() => {
    const base = [...statusSelectOptions];
    if (!base.some((o) => o.value === WRITE_UP_QUOTE_STATUS)) {
      base.unshift({ value: WRITE_UP_QUOTE_STATUS, label: "Write-Up" });
    }
    return base;
  }, [statusSelectOptions]);

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
      const [quotesList, invoicesList] = await Promise.all([
        fetchAllPaginatedDashboardItems("/api/dashboard/quotes"),
        fetchAllPaginatedDashboardItems("/api/dashboard/invoices"),
      ]);
      setQuotesRaw(quotesList);
      setLinkedInvoices(invoicesList);
    } catch (e) {
      toast.error(e.message || "Failed to load quotes");
      setQuotesRaw([]);
      setLinkedInvoices([]);
    }
  }, [toast]);

  const loadCustomers = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
      setCustomers(list);
    } catch (e) {
      setCustomers([]);
    }
  }, []);

  const loadMotors = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/motors");
      setMotors(list);
    } catch (e) {
      setMotors([]);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/employees");
      setEmployees(list);
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
    toast.info("You can also add RFQs from Job Write-Up when working on a repair job.");
    router.replace("/dashboard/rfq", { scroll: false });
  }, [fromLeadId, toast, router]);

  useEffect(() => {
    const id = openQuoteId?.trim();
    if (!id) return;
    setViewModalOpen(true);
    setViewLoadingQuoteId(id);
    router.replace("/dashboard/rfq", { scroll: false });
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
    const customerForQuote = customers.find((c) => c.id === (dataToUse.customerId ?? ""));
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
      customerTaxExempt:
        dataToUse.customerTaxExempt !== undefined ? dataToUse.customerTaxExempt !== false : customerForQuote?.taxExempt !== false,
      customerTaxPercent:
        dataToUse.customerTaxPercent ?? (customerForQuote?.taxExempt === false ? String(customerForQuote?.taxPercent ?? "0") : "0"),
      scopeLines: Array.isArray(dataToUse.scopeLines) ? dataToUse.scopeLines : [],
      partsLines: (Array.isArray(dataToUse.partsLines) ? dataToUse.partsLines : []).map((row) => ({ ...row, qty: row?.qty ?? "1" })),
      estimatedCompletion: dataToUse.estimatedCompletion ?? "",
      customerNotes: dataToUse.customerNotes ?? "",
      notes: dataToUse.notes ?? "",
      repairFlowJobId: dataToUse.repairFlowJobId ?? "",
      motorRepairFlowQuoteId: dataToUse.motorRepairFlowQuoteId ?? "",
      quoteId: dataToUse.id ?? "",
      workOrderId: dataToUse.workOrderId ?? "",
    });
    setEditModalOpen(true);
  }, [customers]);

  const refreshQuoteWorkOrderLink = useCallback(async (quoteId) => {
    const qid = String(quoteId || "").trim();
    if (!qid) return;
    try {
      const res = await fetch(`/api/dashboard/quotes/${qid}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const woId = data.workOrderId ?? "";
      setViewingQuote((prev) => (String(prev?.id || "") === qid ? { ...prev, workOrderId: woId } : prev));
      setForm((f) => (String(f.quoteId || "") === qid ? { ...f, workOrderId: woId } : f));
    } catch {
      /* keep current labels */
    }
  }, []);

  const openCreateRfqModal = useCallback(() => {
    setViewingQuote(null);
    setForm({
      ...INITIAL_FORM,
      status: WRITE_UP_QUOTE_STATUS,
      date: todayString(),
      preparedBy: defaultPreparedByEmployeeId,
      scopeLines: [{ scope: "", price: "" }],
      partsLines: [],
    });
    setEditModalOpen(true);
  }, [defaultPreparedByEmployeeId]);

  useEffect(() => {
    const id = editQuoteIdParam?.trim();
    if (!id) return;
    let cancelled = false;
    (async () => {
      await openEditModal({ id });
      if (!cancelled) router.replace("/dashboard/rfq", { scroll: false });
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
      const id = String(mtr.id ?? "").trim();
      if (!id) return;
      const parts = [mtr.serialNumber, mtr.manufacturer, mtr.model]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean);
      m[id] = parts.length ? parts.join(" · ") : "";
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

  const isNewQuoteForm = !viewingQuote?.id;

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!currentForm.customerId?.trim()) {
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
      const payload = buildQuotePayload(currentForm);
      if (isNewQuoteForm) {
        const res = await fetch("/api/dashboard/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...payload,
            status: payload.status || WRITE_UP_QUOTE_STATUS,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create RFQ");
        const created = data.quote;
        toast.success(created?.rfqNumber ? `RFQ ${created.rfqNumber} created.` : "RFQ created.");
        setQuotesRaw((prev) => [created, ...prev]);
        closeEditModal();
        return;
      }
      const res = await fetch(`/api/dashboard/quotes/${viewingQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quote");
      toast.success("Quote updated.");
      setQuotesRaw((prev) =>
        prev.map((q) => (q.id === viewingQuote.id ? { ...q, ...data.quote } : q))
      );
      setViewingQuote(data.quote);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || (isNewQuoteForm ? "Failed to create RFQ" : "Failed to update quote"));
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
      setQuotesRaw((prev) => prev.filter((q) => q.id !== row.id));
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
        setQuotesRaw((prev) => prev.map((q) => (q.id === quoteId ? { ...q, status: "sent" } : q)));
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
  const [quoteSort, setQuoteSort] = useState({ key: null, direction: "asc" });

  const filteredQuotes = useMemo(() => {
    let list = quotes;
    if (statusFilter && statusFilter.trim()) {
      const status = statusFilter.trim().toLowerCase();
      list = list.filter((qt) => (qt.status || "draft").toLowerCase() === status);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    const labelFor = (qt) =>
      statusSelectOptions.find((o) => o.value === (qt.status || "draft").toLowerCase())?.label ?? "";
    return list.filter(
      (qt) =>
        (qt.rfqNumber || "").toLowerCase().includes(q) ||
        (customerNameMap[qt.customerId] || "").toLowerCase().includes(q) ||
        (motorLabelMap[String(qt.motorId ?? "").trim()] || "").toLowerCase().includes(q) ||
        (qt.status || "").toLowerCase().includes(q) ||
        labelFor(qt).toLowerCase().includes(q) ||
        (qt.repairScope || "").toLowerCase().includes(q)
    );
  }, [quotes, searchQuery, statusFilter, customerNameMap, motorLabelMap, statusSelectOptions]);

  const sortedQuotes = useMemo(() => {
    const sortKey = quoteSort?.key;
    const dir = quoteSort?.direction === "desc" ? -1 : 1;
    if (!sortKey) return filteredQuotes;

    const quoteGrandTotal = (row) =>
      computeTotalsFromLaborAndParts({
        laborTotal: row?.laborTotal,
        partsTotal: row?.partsTotal,
        taxExempt: row?.customerTaxExempt,
        taxPercent: row?.customerTaxPercent,
      }).grandTotal ?? 0;

    const parseMoney = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : 0;
    };

    const comparePrimary = (a, b) => {
      switch (sortKey) {
        case "rfqNumber": {
          const va = String(a.rfqNumber || "").toLowerCase();
          const vb = String(b.rfqNumber || "").toLowerCase();
          return va.localeCompare(vb, undefined, { numeric: true }) * dir;
        }
        case "customer": {
          const va = String(customerNameMap[a.customerId] || a.customerId || "").toLowerCase();
          const vb = String(customerNameMap[b.customerId] || b.customerId || "").toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        case "motor": {
          const va = String(motorLabelMap[String(a.motorId ?? "").trim()] || a.motorId || "").toLowerCase();
          const vb = String(motorLabelMap[String(b.motorId ?? "").trim()] || b.motorId || "").toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        case "status": {
          const va = String(a.status || "draft").toLowerCase();
          const vb = String(b.status || "draft").toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        case "laborTotal":
          return (parseMoney(a.laborTotal) - parseMoney(b.laborTotal)) * dir;
        case "partsTotal":
          return (parseMoney(a.partsTotal) - parseMoney(b.partsTotal)) * dir;
        case "grandTotal":
          return (quoteGrandTotal(a) - quoteGrandTotal(b)) * dir;
        case "estimatedCompletion": {
          const va = String(a.estimatedCompletion || "").trim().toLowerCase();
          const vb = String(b.estimatedCompletion || "").trim().toLowerCase();
          return va.localeCompare(vb) * dir;
        }
        default:
          return 0;
      }
    };

    const list = [...filteredQuotes];
    list.sort((a, b) => {
      const primary = comparePrimary(a, b);
      if (primary !== 0) return primary;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
    return list;
  }, [filteredQuotes, quoteSort, customerNameMap, motorLabelMap]);

  const handleQuoteSort = useCallback((key, direction) => {
    setQuoteSort({ key, direction });
  }, []);

  const statusSummaryCards = useMemo(() => {
    const calcAmount = (quote) =>
      computeTotalsFromLaborAndParts({
        laborTotal: quote?.laborTotal,
        partsTotal: quote?.partsTotal,
        taxExempt: quote?.customerTaxExempt,
        taxPercent: quote?.customerTaxPercent,
      }).grandTotal ?? 0;
    const pool = quotes;
    const keysLower = new Set(statusSelectOptions.map((o) => o.value.toLowerCase()));
    const buttons = [];
    const tileClassForKey = (statusKey, fallbackIndex) => {
      if (statusKey === "") return resolveTilePresetClass("", 0);
      if (statusKey === "__other__") return resolveTilePresetClass("", 17);
      const optIdx = statusSelectOptions.findIndex(
        (o) => o.value.toLowerCase() === String(statusKey).toLowerCase()
      );
      const { tileColor, index } = quoteStatusTileColorForValue(
        mergedSettings,
        statusKey,
        optIdx >= 0 ? optIdx : fallbackIndex
      );
      return resolveTilePresetClass(tileColor, index);
    };

    statusSelectOptions.forEach((opt, optIdx) => {
      const v = opt.value.toLowerCase();
      const matches = (q) => (q.status || "draft").toLowerCase() === v;
      buttons.push({
        key: opt.value,
        label: opt.label,
        count: pool.filter(matches).length,
        amount: pool.filter(matches).reduce((sum, q) => sum + calcAmount(q), 0),
        tileClassName: tileClassForKey(opt.value, optIdx),
      });
    });
    const orphans = pool.filter((q) => !keysLower.has((q.status || "draft").toLowerCase()) && !isWriteUpStatus(q.status));
    if (orphans.length) {
      buttons.push({
        key: "__other__",
        label: "Other",
        count: orphans.length,
        amount: orphans.reduce((sum, q) => sum + calcAmount(q), 0),
        tileClassName: tileClassForKey("__other__", 17),
      });
    }
    buttons.unshift({
      key: "",
      label: "All",
      count: pool.length,
      amount: pool.reduce((sum, q) => sum + calcAmount(q), 0),
      tileClassName: tileClassForKey("", 0),
    });
    return buttons;
  }, [quotes, statusSelectOptions, mergedSettings]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => {
          const isSending = sendingQuoteId === row.id;
          const isDeleting = deletingQuoteId === row.id;
          const isApproved = (row.status || "draft").toLowerCase() === "approved";
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
                onClick={() => setWorkOrderModal({ draftQuoteId: row.id })}
                disabled={!isApproved}
                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={isApproved ? "Create work order" : "Create work order (approved quotes only)"}
                title={
                  isApproved
                    ? "Create work order"
                    : "Set status to Approved to create a work order"
                }
              >
                <FiTool className="h-4 w-4 shrink-0" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() =>
                  setInvoiceModal({
                    draftQuoteId: row.id,
                    invoiceId: null,
                    sourceQuoteId: row.id,
                  })
                }
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
        label: jobIdLabel,
        sortable: true,
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
        sortable: true,
        render: (_, row) => customerNameMap[row.customerId] || row.customerId || "—",
      },
      {
        key: "motor",
        label: "Motor",
        sortable: true,
        render: (_, row) => {
          const mid = String(row.motorId ?? "").trim();
          return motorLabelMap[mid] || mid || "—";
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (_, row) => {
          const s = (row.status || "draft").toLowerCase();
          const optIdx = statusSelectOptions.findIndex((o) => o.value.toLowerCase() === s);
          const { tileColor, index } = quoteStatusTileColorForValue(
            mergedSettings,
            s,
            optIdx >= 0 ? optIdx : 0
          );
          const pillClass = resolveTilePresetClass(tileColor, index);
          const label =
            statusSelectOptions.find((o) => o.value === s)?.label ??
            s.charAt(0).toUpperCase() + s.slice(1);
          return (
            <span
              className={`job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs ring-1 ring-inset ${pillClass}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        key: "laborTotal",
        label: "Labor",
        sortable: true,
        render: (_, row) => (row.laborTotal ? fmt(row.laborTotal) : "—"),
      },
      {
        key: "partsTotal",
        label: "Other Cost",
        sortable: true,
        render: (_, row) => (row.partsTotal ? fmt(row.partsTotal) : "—"),
      },
      {
        key: "grandTotal",
        label: "Grand Total",
        sortable: true,
        render: (_, row) => {
          const totals = computeTotalsFromLaborAndParts({
            laborTotal: row.laborTotal,
            partsTotal: row.partsTotal,
            taxExempt: row.customerTaxExempt,
            taxPercent: row.customerTaxPercent,
          });
          return totals.grandTotal ? fmt(totals.grandTotal) : "—";
        },
      },
      { key: "estimatedCompletion", label: "Est. completion", sortable: true },
    ],
    [
      customerNameMap,
      motorLabelMap,
      sendingQuoteId,
      deletingQuoteId,
      fmt,
      mergedSettings,
      statusSelectOptions,
      router,
      openViewModal,
      openEditModal,
      handlePrintQuote,
      handleSendToCustomer,
      jobIdLabel,
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
  const selectedCustomerTaxExempt = selectedCustomer?.taxExempt !== false;
  const selectedCustomerTaxPercent = selectedCustomerTaxExempt
    ? "0"
    : String(selectedCustomer?.taxPercent ?? "0");
  const formTotals = computeTotalsFromLaborAndParts({
    laborTotal: scopeTotal,
    partsTotal: partsTotalSum,
    taxExempt: selectedCustomerTaxExempt,
    taxPercent: selectedCustomerTaxPercent,
  });

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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">RFQ</h1>
          <p className="mt-1 text-sm text-secondary">
            All requests and quotes in one place—one job number through work orders and invoices.
          </p>
        </div>
        <Button type="button" variant="primary" size="sm" onClick={openCreateRfqModal}>
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Create RFQ
        </Button>
      </div>

      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 flex-wrap gap-1">
          {statusSummaryCards.map((card) => {
            const active = (statusFilter || "") === (card.key || "");
            return (
              <button
                key={card.key || "__all__"}
                type="button"
                onClick={() => setStatusFilter(card.key || "")}
                className={`job-board-status-pill rounded-md border border-border px-2 py-1 text-left ring-1 ring-inset transition-all ${card.tileClassName} ${active ? "ring-2 ring-primary/50 shadow-sm" : "hover:brightness-[0.97] dark:hover:brightness-110"
                  }`}
              >
                <span className="block whitespace-nowrap text-xs font-semibold leading-tight">{card.label}</span>
                <span className="mt-0.5 block whitespace-nowrap text-[10px] leading-none tabular-nums opacity-85">
                  {card.count} · {fmt(card.amount)}
                </span>
              </button>
            );
          })}
        </div>
        <Table
          columns={columns}
          data={sortedQuotes}
          rowKey="id"
          loading={loading}
          sortState={quoteSort}
          onSort={handleQuoteSort}
          emptyMessage={
            quotes.length === 0
              ? "No RFQs yet. Click Create RFQ to add one."
              : statusFilter
                ? "No records with this status."
                : "No records match the search."
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
                <div><dt className="text-secondary">{viewJobIdLabel}</dt><dd className="text-title font-medium">{viewingQuote.rfqNumber || "—"}</dd></div>
                <div><dt className="text-secondary">Customer PO#</dt><dd className="text-title">{viewingQuote.customerPo || "—"}</dd></div>
                <div><dt className="text-secondary">Date</dt><dd className="text-title">{viewingQuote.date || "—"}</dd></div>
                <div><dt className="text-secondary">Prepared by</dt><dd className="text-title">{employees.find((e) => e.id === viewingQuote.preparedBy)?.name || viewingQuote.preparedBy || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer &amp; motor</h3>
              <p className="text-title font-medium">{customerNameMap[viewingQuote.customerId] || viewingQuote.customerId || "—"}</p>
              <p className="mt-1 text-sm text-secondary">
                {motorLabelMap[String(viewingQuote.motorId ?? "").trim()] || viewingQuote.motorId || "—"}
              </p>
            </div>
            <QuoteFormRepairJobInspections
              repairFlowJobId={viewingQuote.repairFlowJobId}
              motorRepairFlowQuoteId={viewingQuote.motorRepairFlowQuoteId}
              quoteMotorId={viewingQuote.motorId}
            />
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Status & totals</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-secondary">Status</dt>
                  <dd className="text-title">
                    {statusSelectOptions.find(
                      (o) => o.value === (viewingQuote.status || "draft").toLowerCase()
                    )?.label ?? (viewingQuote.status || "—")}
                  </dd>
                </div>
                <div><dt className="text-secondary">Scope total</dt><dd className="text-title">{viewingQuote.laborTotal ? fmt(viewingQuote.laborTotal) : "—"}</dd></div>
                <div><dt className="text-secondary">Other Cost total</dt><dd className="text-title">{viewingQuote.partsTotal ? fmt(viewingQuote.partsTotal) : "—"}</dd></div>
                <div><dt className="text-secondary">Tax %</dt><dd className="text-title">{normalizeTaxExempt(viewingQuote.customerTaxExempt) ? "0" : normalizeTaxPercent(viewingQuote.customerTaxPercent)}</dd></div>
                <div><dt className="text-secondary">Tax amount</dt><dd className="text-title">{fmt(computeTotalsFromLaborAndParts({ laborTotal: viewingQuote.laborTotal, partsTotal: viewingQuote.partsTotal, taxExempt: viewingQuote.customerTaxExempt, taxPercent: viewingQuote.customerTaxPercent }).taxAmount)}</dd></div>
                <div><dt className="text-secondary">Service proposal total</dt><dd className="font-semibold text-title">{fmt(computeTotalsFromLaborAndParts({ laborTotal: viewingQuote.laborTotal, partsTotal: viewingQuote.partsTotal, taxExempt: viewingQuote.customerTaxExempt, taxPercent: viewingQuote.customerTaxPercent }).grandTotal)}</dd></div>
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
                      <span className="font-medium text-title">
                        {statusSelectOptions.find((o) => o.value === String(entry.from || "draft").toLowerCase())
                          ?.label ?? (entry.from || "draft")}
                      </span>
                      <span>→</span>
                      <span className="font-medium text-title">
                        {statusSelectOptions.find((o) => o.value === String(entry.to || "").toLowerCase())?.label ??
                          (entry.to || "—")}
                      </span>
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
        title={isNewQuoteForm ? "Create RFQ" : "Edit quote"}
        size="full"
        width="min(1200px, 94vw)"
        showClose={!savingQuote}
        headerClassName="flex-wrap"
        actions={
          <>
            {!isNewQuoteForm ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingQuote || !String(viewingQuote?.workOrderId || "").trim()}
                className="inline-flex shrink-0 items-center gap-1.5"
                title={
                  String(viewingQuote?.workOrderId || "").trim()
                    ? "Open work order for this quote"
                    : "Create a work order from the quote row first"
                }
                onClick={() => {
                  const wid = String(viewingQuote?.workOrderId || "").trim();
                  if (!wid) return;
                  setWorkOrderModal({ workOrderId: wid });
                }}
              >
                <FiClipboard className="h-4 w-4 shrink-0" aria-hidden />
                View Job
              </Button>
            ) : null}
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
                  {isNewQuoteForm ? "Create RFQ" : "Save"}
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
              <Input
                label={editFormJobIdLabel}
                value={form.rfqNumber || (isNewQuoteForm ? "Assigned on save" : "—")}
                readOnly
              />
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
                options={statusOptionsForForm}
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
                  const nextCustomer = customers.find((c) => c.id === newCustomerId);
                  setForm((f) => ({
                    ...f,
                    customerId: newCustomerId,
                    motorId: keepMotor ? f.motorId : "",
                    customerTaxExempt: nextCustomer?.taxExempt !== false,
                    customerTaxPercent: nextCustomer?.taxExempt === false ? String(nextCustomer?.taxPercent ?? "0") : "0",
                  }));
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
                    <p className="text-secondary">
                      Tax: {selectedCustomer.taxExempt === false ? `${selectedCustomer.taxPercent || "0"}%` : "Exempt"}
                    </p>
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
            <div className="mt-3 rounded-lg border border-border">
              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Scope total</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(scopeTotal)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Other Cost total</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(partsTotalSum)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Service proposal total</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(serviceProposalTotal)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Tax</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(formTotals.taxAmount)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-title">Grand total</td>
                    <td className="px-3 py-2 text-right font-semibold text-title">{fmt(formTotals.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor="edit-quote-internal-notes"
                  className="mb-2 block cursor-default text-sm font-semibold uppercase tracking-wide text-title"
                >
                  Internal Notes
                </label>
                <Textarea
                  id="edit-quote-internal-notes"
                  name="internalNotes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  placeholder="Terms, technician notes, and caveats…"
                  textareaClassName="min-h-[7.5rem] w-full min-w-0"
                />
              </div>
              <div className="min-w-0">
                <label
                  htmlFor="edit-quote-customer-notes"
                  className="mb-2 block cursor-default text-sm font-semibold uppercase tracking-wide text-title"
                >
                  Customer Notes
                </label>
                <Textarea
                  id="edit-quote-customer-notes"
                  name="customerNotes"
                  value={form.customerNotes}
                  onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                  rows={4}
                  placeholder="Shown on the proposal and documents sent to the customer…"
                  textareaClassName="min-h-[7.5rem] w-full min-w-0"
                />
              </div>
            </div>
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

      <WorkOrderFormModal
        open={!!workOrderModal}
        draftQuoteId={workOrderModal?.draftQuoteId ?? null}
        workOrderId={workOrderModal?.workOrderId ?? null}
        onClose={() => setWorkOrderModal(null)}
        onAfterSave={() => {
          const qid = workOrderModal?.draftQuoteId?.trim();
          if (qid) refreshQuoteWorkOrderLink(qid);
          loadQuotes();
        }}
        zIndex={60}
      />

      <InvoiceFormModal
        open={!!invoiceModal}
        draftQuoteId={invoiceModal?.draftQuoteId ?? null}
        invoiceId={invoiceModal?.invoiceId ?? null}
        onClose={() => setInvoiceModal(null)}
        onAfterSave={() => {
          loadQuotes();
        }}
        onSwitchToInvoice={(id) => {
          setInvoiceModal((prev) => ({
            draftQuoteId: null,
            invoiceId: id,
            sourceQuoteId: prev?.sourceQuoteId || "",
          }));
        }}
        zIndex={60}
      />
    </div>
  );
}
