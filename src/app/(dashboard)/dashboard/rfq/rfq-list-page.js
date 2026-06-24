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
  FiEye,
  FiUserPlus,
} from "react-icons/fi";
import { LuQrCode } from "react-icons/lu";
import { printQuoteMotorTagQr } from "@/lib/print-quote-motor-tag-qr";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { quoteStatusSelectOptionsFromMerged, quoteStatusTileColorForValue } from "@/lib/dropdown-catalog";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import QuoteInventoryPartsControls from "@/components/dashboard/quote-inventory-parts-controls";
import QuoteFormRepairJobInspections from "@/components/dashboard/quote-form-repair-job-inspections";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import QuoteFormCustomerMotorCards from "@/components/dashboard/quote-form-customer-motor-cards";
import { scopeAndPartsToFlowLineItems } from "@/lib/repair-flow-quote-form-map";
import { computeTotalsFromLaborAndParts, normalizeTaxExempt, normalizeTaxPercent } from "@/lib/quote-invoice-totals";
import { quoteStatusAllowsWorkOrder } from "@/lib/quote-status-slug";
import {
  WRITE_UP_QUOTE_STATUS,
  INSPECTION_DONE_QUOTE_STATUS,
  filterQuotesForRfqList,
  isWriteUpStatus,
  isInspectionDoneStatus,
  jobNumberFieldLabel,
} from "@/lib/quote-rfq-lifecycle";
import RfqPreInspectionSection from "@/components/dashboard/rfq-pre-inspection-section";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { buildTechnicianSelectOptions } from "@/lib/technician-select-options";
import { allJobsListPath } from "@/lib/all-jobs-tabs";

/** Icons in modal Actions dropdown menu rows */
const HEADER_BTN_IC = "h-4 w-4 shrink-0";

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

const INITIAL_NEW_CUSTOMER = {
  companyName: "",
  primaryContactName: "",
  phone: "",
  email: "",
};

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
  technicianEmployeeId: "",
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
    technicianEmployeeId: f.technicianEmployeeId ?? "",
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

export default function DashboardRfqListPage({ embedded = false, actionsRef = null }) {
  const listPath = allJobsListPath(embedded, "rfq", "/dashboard/rfq");
  const toast = useToast();
  const confirm = useConfirm();
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
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [openWoPrompt, setOpenWoPrompt] = useState(null);
  const [checkingOpenWoQuoteId, setCheckingOpenWoQuoteId] = useState(null);
  const [printingTagQrQuoteId, setPrintingTagQrQuoteId] = useState(null);
  const [form, _setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  const technicianEmployeeIdRef = useRef("");
  /** Keep formRef in sync on every update so Save never reads stale state (e.g. technician just selected). */
  const setForm = useCallback((update) => {
    if (typeof update === "function") {
      _setForm((prev) => {
        const next = update(prev);
        formRef.current = next;
        return next;
      });
    } else {
      formRef.current = update;
      _setForm(update);
    }
  }, []);

  const handleTechnicianChange = useCallback((e) => {
    const v = String(e.target?.value ?? "").trim();
    technicianEmployeeIdRef.current = v;
    setForm((f) => ({ ...f, technicianEmployeeId: v }));
  }, [setForm]);

  const editFormJobIdLabel = useMemo(() => jobNumberFieldLabel(form.workOrderId), [form.workOrderId]);
  const viewJobIdLabel = useMemo(
    () => jobNumberFieldLabel(viewingQuote?.workOrderId),
    [viewingQuote?.workOrderId]
  );

  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(() => ({ ...INITIAL_NEW_CUSTOMER }));
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);
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
    if (!base.some((o) => o.value === INSPECTION_DONE_QUOTE_STATUS)) {
      const writeUpIdx = base.findIndex((o) => o.value === WRITE_UP_QUOTE_STATUS);
      const insertAt = writeUpIdx >= 0 ? writeUpIdx + 1 : 0;
      base.splice(insertAt, 0, {
        value: INSPECTION_DONE_QUOTE_STATUS,
        label: "Inspection done",
      });
    }
    return base;
  }, [statusSelectOptions]);

  const openAddCustomerModal = () => {
    setNewCustomerForm({ ...INITIAL_NEW_CUSTOMER });
    setAddCustomerModalOpen(true);
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSavingNewCustomer(true);
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCustomerForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      const id = data.customer?.id;
      if (!id) throw new Error("Invalid response");
      const saved = data.customer;
      await loadCustomers();
      setForm((f) => ({
        ...f,
        customerId: id,
        motorId: "",
        customerTaxExempt: saved?.taxExempt !== false,
        customerTaxPercent: saved?.taxExempt === false ? String(saved?.taxPercent ?? "0") : "0",
      }));
      setAddCustomerModalOpen(false);
      toast.success("Customer added and selected.");
    } catch (err) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setSavingNewCustomer(false);
    }
  };

  const openAddMotorModal = () => {
    const custId = form.customerId || formRef.current?.customerId;
    if (!custId) {
      toast.error("Select a customer first.");
      return;
    }
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
    toast.info("Create work orders from approved RFQs to record inspections on the shop floor.");
    router.replace(listPath, { scroll: false });
  }, [fromLeadId, toast, router, listPath]);

  useEffect(() => {
    const id = openQuoteId?.trim();
    if (!id) return;
    setViewModalOpen(true);
    setViewLoadingQuoteId(id);
    router.replace(listPath, { scroll: false });
  }, [openQuoteId, router, listPath]);

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
    const techId = String(dataToUse.technicianEmployeeId ?? "").trim();
    technicianEmployeeIdRef.current = techId;
    setViewingQuote(dataToUse);
    setForm({
      customerId: dataToUse.customerId ?? "",
      motorId: dataToUse.motorId ?? "",
      leadId: dataToUse.leadId ?? "",
      status: dataToUse.status ?? "draft",
      customerPo: dataToUse.customerPo ?? "",
      date: dataToUse.date ?? todayString(),
      technicianEmployeeId: techId,
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

  const handleCreateWorkOrderClick = useCallback(
    async (row) => {
      const quoteId = String(row?.id || "").trim();
      if (!quoteId) return;
      setCheckingOpenWoQuoteId(quoteId);
      try {
        const res = await fetch(
          `/api/dashboard/work-orders/open-for-quote?quoteId=${encodeURIComponent(quoteId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not check work orders");
        const open = Array.isArray(data.openWorkOrders) ? data.openWorkOrders : [];
        if (open.length > 0) {
          const primary = open[0];
          setOpenWoPrompt({
            quoteId,
            workOrderId: primary.id,
            workOrderNumber: primary.workOrderNumber || "",
          });
          return;
        }
        setWorkOrderModal({ draftQuoteId: quoteId });
      } catch (e) {
        toast.error(e.message || "Could not check work orders");
      } finally {
        setCheckingOpenWoQuoteId(null);
      }
    },
    [toast]
  );

  const openCreateRfqModal = useCallback(() => {
    setViewingQuote(null);
    technicianEmployeeIdRef.current = "";
    setForm({
      ...INITIAL_FORM,
      status: WRITE_UP_QUOTE_STATUS,
      date: todayString(),
      scopeLines: [{ scope: "", price: "" }],
      partsLines: [],
    });
    setEditModalOpen(true);
  }, [setForm]);

  useEffect(() => {
    if (!embedded || !actionsRef) return undefined;
    actionsRef.current = { openCreateRfqModal };
    return () => {
      if (actionsRef.current?.openCreateRfqModal === openCreateRfqModal) {
        actionsRef.current = null;
      }
    };
  }, [embedded, actionsRef, openCreateRfqModal]);

  useEffect(() => {
    const id = editQuoteIdParam?.trim();
    if (!id) return;
    let cancelled = false;
    (async () => {
      await openEditModal({ id });
      if (!cancelled) router.replace(listPath, { scroll: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [editQuoteIdParam, openEditModal, router, listPath]);

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

  const technicianNameMap = useMemo(() => {
    const m = {};
    employees.forEach((e) => {
      const id = String(e.id ?? "").trim();
      if (!id) return;
      m[id] = (e.name && String(e.name).trim()) || (e.email && String(e.email).trim()) || id;
    });
    return m;
  }, [employees]);

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
    const technicianEmployeeId = String(
      technicianEmployeeIdRef.current || formRef.current?.technicianEmployeeId || form.technicianEmployeeId || ""
    ).trim();
    const currentForm = {
      ...(formRef.current || form),
      technicianEmployeeId,
    };
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
        const createdId = created?.id || created?._id?.toString?.();
        if (createdId) await refreshQuoteWorkOrderLink(createdId);
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
      const savedTechId = String(data.quote?.technicianEmployeeId ?? "").trim();
      technicianEmployeeIdRef.current = savedTechId;
      toast.success("Quote updated.");
      setQuotesRaw((prev) =>
        prev.map((q) =>
          q.id === viewingQuote.id
            ? {
                ...q,
                ...data.quote,
                id: data.quote?.id ?? q.id,
                technicianEmployeeId: savedTechId,
              }
            : q
        )
      );
      setViewingQuote(data.quote);
      await refreshQuoteWorkOrderLink(viewingQuote.id);
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

  const handlePrintTagQr = useCallback(
    async (quoteFromTable) => {
      const q = quoteFromTable ?? viewingQuote;
      const quoteId = String(q?.id || "").trim();
      if (!quoteId) return;
      setPrintingTagQrQuoteId(quoteId);
      try {
        const res = await fetch(`/api/dashboard/quotes/${quoteId}/motor-tag`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load tag data");
        const customerId = String(data.customerId || q?.customerId || "").trim();
        if (!customerId) {
          toast.error("Select a customer on this RFQ before printing Tag QR.");
          return;
        }
        const ok = await printQuoteMotorTagQr({
          customerId,
          customerName: data.customerName || customerNameMap[customerId] || "",
          motor: data.motor && typeof data.motor === "object" ? data.motor : null,
          motorFallbackLine: data.motorFallbackLine || "",
          rfqNumber: data.rfqNumber || q?.rfqNumber || "",
          technicianName: data.technicianName || "",
          workOrderNumber: data.workOrderNumber || "",
          workOrderStatus: data.workOrderStatus || "",
          jobTypeLabel: data.jobTypeLabel || "",
          motorClass: data.motorClass || "",
          repairJobNumber: data.repairJobNumber || "",
          estimatedCompletion: data.estimatedCompletion || "",
          customerPo: data.customerPo || "",
          scopeBrief: data.scopeBrief || "",
        });
        if (!ok) toast.error("Could not print Tag QR.");
      } catch (e) {
        toast.error(e.message || "Could not print Tag QR");
      } finally {
        setPrintingTagQrQuoteId(null);
      }
    },
    [viewingQuote, toast, customerNameMap]
  );

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
      statusOptionsForForm.find((o) => o.value === (qt.status || "draft").toLowerCase())?.label ?? "";
    return list.filter(
      (qt) =>
        (qt.rfqNumber || "").toLowerCase().includes(q) ||
        (customerNameMap[qt.customerId] || "").toLowerCase().includes(q) ||
        (motorLabelMap[String(qt.motorId ?? "").trim()] || "").toLowerCase().includes(q) ||
        (technicianNameMap[String(qt.technicianEmployeeId ?? "").trim()] || "")
          .toLowerCase()
          .includes(q) ||
        (qt.status || "").toLowerCase().includes(q) ||
        labelFor(qt).toLowerCase().includes(q) ||
        (qt.repairScope || "").toLowerCase().includes(q)
    );
  }, [
    quotes,
    searchQuery,
    statusFilter,
    customerNameMap,
    motorLabelMap,
    technicianNameMap,
    statusOptionsForForm,
  ]);

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
        case "technician": {
          const va = String(
            technicianNameMap[String(a.technicianEmployeeId ?? "").trim()] || ""
          ).toLowerCase();
          const vb = String(
            technicianNameMap[String(b.technicianEmployeeId ?? "").trim()] || ""
          ).toLowerCase();
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
  }, [filteredQuotes, quoteSort, customerNameMap, motorLabelMap, technicianNameMap]);

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
    const keysLower = new Set(statusOptionsForForm.map((o) => o.value.toLowerCase()));
    const buttons = [];
    const tileAppearanceForKey = (statusKey, fallbackIndex) => {
      if (statusKey === "") return resolveStatusTileProps("", 0);
      if (statusKey === "__other__") return resolveStatusTileProps("", 17);
      const optIdx = statusOptionsForForm.findIndex(
        (o) => o.value.toLowerCase() === String(statusKey).toLowerCase()
      );
      const { tileColor, tileBgColor, tileTextColor, index } = quoteStatusTileColorForValue(
        mergedSettings,
        statusKey,
        optIdx >= 0 ? optIdx : fallbackIndex
      );
      return resolveStatusTileProps(tileColor, index, {
        tileBgColor,
        tileTextColor,
        tileColor,
      });
    };

    statusOptionsForForm.forEach((opt, optIdx) => {
      const v = opt.value.toLowerCase();
      const matches = (q) => (q.status || "draft").toLowerCase() === v;
      buttons.push({
        key: opt.value,
        label: opt.label,
        count: pool.filter(matches).length,
        amount: pool.filter(matches).reduce((sum, q) => sum + calcAmount(q), 0),
        tileAppearance: tileAppearanceForKey(opt.value, optIdx),
      });
    });
    const orphans = pool.filter(
      (q) =>
        !keysLower.has((q.status || "draft").toLowerCase()) &&
        !isWriteUpStatus(q.status) &&
        !isInspectionDoneStatus(q.status)
    );
    if (orphans.length) {
      buttons.push({
        key: "__other__",
        label: "Other",
        count: orphans.length,
        amount: orphans.reduce((sum, q) => sum + calcAmount(q), 0),
        tileAppearance: tileAppearanceForKey("__other__", 17),
      });
    }
    buttons.unshift({
      key: "",
      label: "All",
      count: pool.length,
      amount: pool.reduce((sum, q) => sum + calcAmount(q), 0),
      tileAppearance: tileAppearanceForKey("", 0),
    });
    return buttons;
  }, [quotes, statusOptionsForForm, mergedSettings]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => {
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
                title="Edit"
              >
                <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
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
        render: (_, row) => {
          const customerId = String(row.customerId || "").trim();
          const name = customerNameMap[customerId] || customerId || "—";
          if (!customerId || name === "—") return name;
          return (
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setOpenCustomerId(customerId);
              }}
              title="Open customer"
            >
              {name}
            </button>
          );
        },
      },
      {
        key: "technician",
        label: "Technician",
        sortable: true,
        minWidth: 120,
        render: (_, row) => {
          const techId = String(row.technicianEmployeeId ?? "").trim();
          if (!techId) return <span className="text-secondary">—</span>;
          const name = technicianNameMap[techId];
          return (
            <span className="text-title" title={name || techId}>
              {name || techId}
            </span>
          );
        },
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
          const optIdx = statusOptionsForForm.findIndex((o) => o.value.toLowerCase() === s);
          const { tileColor, tileBgColor, tileTextColor, index } = quoteStatusTileColorForValue(
            mergedSettings,
            s,
            optIdx >= 0 ? optIdx : 0
          );
          const pill = resolveStatusTileProps(tileColor, index, {
            tileBgColor,
            tileTextColor,
            tileColor,
          });
          const label =
            statusOptionsForForm.find((o) => o.value === s)?.label ??
            s.charAt(0).toUpperCase() + s.slice(1);
          return (
            <span
              className={`job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs ${pill.className}`}
              style={pill.style}
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
      technicianNameMap,
      deletingQuoteId,
      fmt,
      mergedSettings,
      statusOptionsForForm,
      openViewModal,
      openEditModal,
      jobIdLabel,
    ]
  );

  const technicianOptions = useMemo(
    () => buildTechnicianSelectOptions(employees),
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

  const viewQuoteHeaderActions = useMemo(() => {
    const vq = viewingQuote;
    if (!vq?.id) return null;
    const canCreateWorkOrder = quoteStatusAllowsWorkOrder(vq.status);
    const isSending = sendingQuoteId === vq.id;
    const isPrintingTagQr = printingTagQrQuoteId === vq.id;
    const isCheckingOpenWo = checkingOpenWoQuoteId === vq.id;
    const woDisabledTitle = canCreateWorkOrder
      ? "Create work order"
      : "Set status to approved or accepted to create a work order";
    const invoiceDisabledTitle = canCreateWorkOrder
      ? "Create invoice"
      : "Set status to approved or accepted to create an invoice";

    return (
      <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          onClick={() => {
            closeViewModal();
            openEditModal(vq);
          }}
        >
          <FiEdit2 className={HEADER_BTN_IC} aria-hidden />
          Edit
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          onClick={() => handlePrintQuote(vq)}
        >
          <FiPrinter className={HEADER_BTN_IC} aria-hidden />
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          disabled={isPrintingTagQr}
          title="Print QR motor tag (technician scans → work orders for customer)"
          onClick={() => handlePrintTagQr(vq)}
        >
          {isPrintingTagQr ? (
            <FiRotateCw className={`${HEADER_BTN_IC} animate-spin`} aria-hidden />
          ) : (
            <LuQrCode className={HEADER_BTN_IC} aria-hidden />
          )}
          QR
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          disabled={isSending}
          onClick={() => handleSendToCustomer(vq)}
        >
          {isSending ? (
            <FiRotateCw className={`${HEADER_BTN_IC} animate-spin`} aria-hidden />
          ) : (
            <FiSend className={HEADER_BTN_IC} aria-hidden />
          )}
          Send to customer
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          disabled={!canCreateWorkOrder || isCheckingOpenWo}
          title={woDisabledTitle}
          onClick={() => handleCreateWorkOrderClick(vq)}
        >
          {isCheckingOpenWo ? (
            <FiRotateCw className={`${HEADER_BTN_IC} animate-spin`} aria-hidden />
          ) : (
            <FiTool className={HEADER_BTN_IC} aria-hidden />
          )}
          Create work order
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="inline-flex shrink-0 items-center gap-1.5"
          disabled={!canCreateWorkOrder}
          title={invoiceDisabledTitle}
          onClick={() =>
            setInvoiceModal({
              draftQuoteId: vq.id,
              invoiceId: null,
              sourceQuoteId: vq.id,
            })
          }
        >
          <FiFileText className={HEADER_BTN_IC} aria-hidden />
          Create invoice
        </Button>
      </div>
    );
  }, [
    viewingQuote,
    sendingQuoteId,
    printingTagQrQuoteId,
    checkingOpenWoQuoteId,
    closeViewModal,
    openEditModal,
    handlePrintQuote,
    handlePrintTagQr,
    handleSendToCustomer,
    handleCreateWorkOrderClick,
  ]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {!embedded ? (
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
      ) : null}

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${embedded ? "" : "mt-4"}`}>
        <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
          {statusSummaryCards.map((card) => (
            <StatusFilterPillButton
              key={card.key || "__all__"}
              card={card}
              active={(statusFilter || "") === (card.key || "")}
              onClick={() => setStatusFilter(card.key || "")}
              formatAmount={fmt}
            />
          ))}
        </div>
        <Table
          columns={columns}
          data={sortedQuotes}
          rowKey="id"
          loading={loading}
          fillHeight
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
          searchPlaceholder="Search customer, technician, motor, status…"
          onRefresh={async () => { setLoading(true); await loadQuotes(); setLoading(false); }}
          responsive
        />
      </div>

      <Modal
        open={addCustomerModalOpen}
        onClose={() => !savingNewCustomer && setAddCustomerModalOpen(false)}
        title="Add new customer"
        size="lg"
        zIndex={130}
        showClose={!savingNewCustomer}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddCustomerModalOpen(false)}
              disabled={savingNewCustomer}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="rfq-add-customer-form"
              variant="primary"
              size="sm"
              disabled={savingNewCustomer}
            >
              {savingNewCustomer ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="rfq-add-customer-form" onSubmit={handleAddCustomerSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <FormSection title="Company & contact">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Input
              label="Company name"
              value={newCustomerForm.companyName}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="Company or business name"
              required
            />
            <Input
              label="Primary contact name"
              value={newCustomerForm.primaryContactName}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, primaryContactName: e.target.value }))}
              placeholder="Contact person"
            />
            <Input
              label="Phone"
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
            />
            <Input
              label="Email"
              type="email"
              value={newCustomerForm.email}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
            </div>
          </FormSection>
        </Form>
      </Modal>

      {/* Add Motor modal (from quote form) — same layout as customer's motors Create Motor */}
      <Modal
        open={addMotorModalOpen}
        onClose={() => setAddMotorModalOpen(false)}
        title="Add new motor"
        size="4xl"
        zIndex={130}
        actions={
          <Button type="submit" form="add-motor-form" variant="primary" size="sm" disabled={savingMotor}>
            {savingMotor ? "Saving…" : <><FiSave className="mr-1.5 h-4 w-4 inline" />Save</>}
          </Button>
        }
      >
        <Form id="add-motor-form" onSubmit={handleAddMotorSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <FormSection
            title="Customer & identification"
            subtitle={`Linked to: ${selectedCustomer?.companyName || "—"}`}
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Serial number"
                value={addMotorForm.serialNumber}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
              />
            </div>
          </FormSection>
          <FormSection title="Motor details">
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
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              value={addMotorForm.notes}
              onChange={(e) => setAddMotorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
              className="[&_label]:sr-only"
            />
          </FormSection>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Quote details"
        size="full"
        width="min(1200px, 94vw)"
        headerClassName="flex-wrap gap-2"
        actions={viewQuoteHeaderActions}
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
                <div>
                  <dt className="text-secondary">Technician</dt>
                  <dd className="text-title">
                    {technicianNameMap[String(viewingQuote.technicianEmployeeId ?? "").trim()] || "—"}
                  </dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer &amp; motor</h3>
              {String(viewingQuote.customerId || "").trim() ? (
                <button
                  type="button"
                  className="text-left text-title font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
                  onClick={() => setOpenCustomerId(String(viewingQuote.customerId).trim())}
                  title="Open customer"
                >
                  {customerNameMap[viewingQuote.customerId] || viewingQuote.customerId || "—"}
                </button>
              ) : (
                <p className="text-title font-medium">—</p>
              )}
              <p className="mt-1 text-sm text-secondary">
                {motorLabelMap[String(viewingQuote.motorId ?? "").trim()] || viewingQuote.motorId || "—"}
              </p>
            </div>
            <QuoteFormRepairJobInspections
              workOrderId={viewingQuote.workOrderId}
              quoteMotorId={viewingQuote.motorId}
            />
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Status & totals</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-secondary">Status</dt>
                  <dd className="text-title">
                    {statusOptionsForForm.find(
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
                        {statusOptionsForForm.find((o) => o.value === String(entry.from || "draft").toLowerCase())
                          ?.label ?? (entry.from || "draft")}
                      </span>
                      <span>→</span>
                      <span className="font-medium text-title">
                        {statusOptionsForForm.find((o) => o.value === String(entry.to || "").toLowerCase())?.label ??
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
        zIndex={120}
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
        <Form id="edit-quote-form" onSubmit={handleEditSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <input
            type="hidden"
            name="technicianEmployeeId"
            value={form.technicianEmployeeId || ""}
            readOnly
            aria-hidden
          />
          <FormSection title="Quote info">
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
                label="Technician"
                options={technicianOptions}
                value={form.technicianEmployeeId}
                onChange={handleTechnicianChange}
                placeholder="Select technician"
                searchable
              />
              {isWriteUpStatus(form?.status) ? (
                <p className="sm:col-span-2 lg:col-span-4 text-xs text-secondary">
                  Assign a technician so the RFQ appears on the mobile app as a pre-inspection assignment. Work
                  orders are not created automatically — use Create work order on the row when the quote is approved.
                </p>
              ) : null}
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
          </FormSection>
          <FormSection title="Customer & motor">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end lg:col-span-2">
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
                      customerTaxPercent:
                        nextCustomer?.taxExempt === false ? String(nextCustomer?.taxPercent ?? "0") : "0",
                    }));
                  }}
                  placeholder="Select customer"
                  searchable
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 whitespace-nowrap"
                  onClick={openAddCustomerModal}
                >
                  <FiUserPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Add New Customer
                </Button>
              </div>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end lg:col-span-2">
                <Select
                  label="Motor"
                  options={motorOptionsForCustomer}
                  value={form.motorId === "__add_motor__" ? "" : form.motorId}
                  onChange={handleMotorSelectChange}
                  placeholder={form.customerId ? "Select motor…" : "Select customer first"}
                  searchable
                  className="min-w-0 flex-1"
                  disabled={!form.customerId}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 whitespace-nowrap"
                  disabled={!form.customerId}
                  onClick={openAddMotorModal}
                >
                  <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Add New Motor
                </Button>
              </div>
            </div>
            <QuoteFormCustomerMotorCards
              customer={selectedCustomer}
              motor={selectedMotor}
              quickViewZIndex={130}
              onCustomerSaved={() => loadCustomers()}
              onMotorSaved={() => loadMotors()}
            />
          </FormSection>
          {isWriteUpStatus(form?.status) && viewingQuote?.id ? (
            <RfqPreInspectionSection
              quoteId={viewingQuote.id}
              quoteStatus={form.status}
              disabled={savingQuote}
              onStatusChange={(status) => {
                setForm((f) => ({ ...f, status }));
                setViewingQuote((v) => (v ? { ...v, status } : v));
                setQuotesRaw((prev) =>
                  prev.map((q) => (q.id === viewingQuote.id ? { ...q, status } : q))
                );
              }}
            />
          ) : (
            <QuoteFormRepairJobInspections
              workOrderId={form.workOrderId}
              quoteMotorId={form.motorId}
              disabled={savingQuote}
            />
          )}
          <FormSection title="Scope & other cost">
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
          </FormSection>
          <FormSection title="Notes">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Textarea
                id="edit-quote-internal-notes"
                name="internalNotes"
                label="Internal notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={4}
                placeholder="Terms, technician notes, and caveats…"
                textareaClassName="min-h-[7.5rem] w-full min-w-0"
              />
              <Textarea
                id="edit-quote-customer-notes"
                name="customerNotes"
                label="Customer notes"
                value={form.customerNotes}
                onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                rows={4}
                placeholder="Shown on the proposal and documents sent to the customer…"
                textareaClassName="min-h-[7.5rem] w-full min-w-0"
              />
            </div>
          </FormSection>
        </Form>
      </Modal>

      {quotePrintId ? (
        <QuotePrintPreview
          quoteId={quotePrintId}
          open
          onClose={() => setQuotePrintId(null)}
        />
      ) : null}

      <Modal
        open={!!openWoPrompt}
        onClose={() => setOpenWoPrompt(null)}
        title="Open work order"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="inline-flex shrink-0 items-center gap-1.5"
              onClick={() => {
                const wid = String(openWoPrompt?.workOrderId || "").trim();
                if (!wid) return;
                setOpenWoPrompt(null);
                setWorkOrderModal({ workOrderId: wid });
              }}
            >
              <FiEye className="h-4 w-4 shrink-0" aria-hidden />
              View
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex shrink-0 items-center gap-1.5"
              onClick={() => {
                const qid = String(openWoPrompt?.quoteId || "").trim();
                if (!qid) return;
                setOpenWoPrompt(null);
                setWorkOrderModal({ draftQuoteId: qid });
              }}
            >
              <FiTool className="h-4 w-4 shrink-0" aria-hidden />
              Create
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpenWoPrompt(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-text">
          There is an open work order
          {openWoPrompt?.workOrderNumber ? (
            <>
              {" "}
              (<span className="font-medium text-title">{openWoPrompt.workOrderNumber}</span>)
            </>
          ) : null}
          . Do you want to create one?
        </p>
      </Modal>

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

      <CustomerQuickViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={120}
      />
    </div>
  );
}
