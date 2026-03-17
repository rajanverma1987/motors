"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import { FiEdit2, FiSave, FiPaperclip, FiSend, FiPrinter, FiTrash2, FiRotateCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");

  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [motors, setMotors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [viewLoadingQuoteId, setViewLoadingQuoteId] = useState(null);
  const [savingQuote, setSavingQuote] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const [viewCustomerDetailOpen, setViewCustomerDetailOpen] = useState(false);
  const [viewMotorDetailOpen, setViewMotorDetailOpen] = useState(false);
  const [viewingCustomerDetail, setViewingCustomerDetail] = useState(null);
  const [viewingMotorDetail, setViewingMotorDetail] = useState(null);
  const [loadingCustomerDetailId, setLoadingCustomerDetailId] = useState(null);
  const [loadingMotorDetailId, setLoadingMotorDetailId] = useState(null);

  const [addMotorModalOpen, setAddMotorModalOpen] = useState(false);
  const [addMotorForm, setAddMotorForm] = useState(ADD_MOTOR_INITIAL);
  const [savingMotor, setSavingMotor] = useState(false);

  const [attachmentModalOpen, setAttachmentModalOpen] = useState(false);
  const [attachmentQuoteId, setAttachmentQuoteId] = useState(null);
  const [attachmentRfqNumber, setAttachmentRfqNumber] = useState("");
  const [attachmentList, setAttachmentList] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deletingAttachmentUrl, setDeletingAttachmentUrl] = useState(null);
  const attachmentFileInputRef = useRef(null);

  const attachmentLoadingQuoteIdRef = useRef(null);
  const openAttachmentModal = useCallback(async (quoteId, rfqNumber, initialAttachments) => {
    if (!quoteId) return;
    const initial = Array.isArray(initialAttachments) ? initialAttachments : [];
    setAttachmentQuoteId(quoteId);
    setAttachmentRfqNumber(rfqNumber || "");
    setAttachmentList(initial);
    setAttachmentModalOpen(true);
    setLoadingAttachments(true);
    attachmentLoadingQuoteIdRef.current = quoteId;
    try {
      const res = await fetch(`/api/dashboard/quotes/${quoteId}?t=${Date.now()}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      const data = await res.json();
      if (res.ok && attachmentLoadingQuoteIdRef.current === quoteId) {
        const list = Array.isArray(data.attachments) ? data.attachments : [];
        setAttachmentList(list);
      }
    } catch {
      if (attachmentLoadingQuoteIdRef.current === quoteId) setAttachmentList(initial);
    } finally {
      setLoadingAttachments(false);
      attachmentLoadingQuoteIdRef.current = null;
    }
  }, []);

  const closeAttachmentModal = useCallback(() => {
    setAttachmentModalOpen(false);
    setAttachmentQuoteId(null);
    setAttachmentRfqNumber("");
    setAttachmentList([]);
  }, []);

  const handleAttachmentUpload = useCallback(async (e) => {
    const files = e.target?.files;
    if (!files?.length || !attachmentQuoteId) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    setUploadingAttachments(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${attachmentQuoteId}/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (Array.isArray(data.attachments)) {
        setAttachmentList(data.attachments);
        setQuotes((prev) =>
          prev.map((q) => (q.id === attachmentQuoteId ? { ...q, attachments: data.attachments } : q))
        );
        setViewingQuote((prev) =>
          prev?.id === attachmentQuoteId ? { ...prev, attachments: data.attachments } : prev
        );
      }
      toast.success("Files attached.");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingAttachments(false);
      e.target.value = "";
    }
  }, [attachmentQuoteId, toast]);

  const handleDeleteAttachment = useCallback(
    async (att) => {
      if (!attachmentQuoteId || !att?.url) return;
      setDeletingAttachmentUrl(att.url);
      try {
        const nextList = attachmentList.filter((a) => a.url !== att.url);
        const res = await fetch(`/api/dashboard/quotes/${attachmentQuoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ attachments: nextList }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to remove attachment");
        setAttachmentList(nextList);
        setQuotes((prev) =>
          prev.map((q) => (q.id === attachmentQuoteId ? { ...q, attachments: nextList } : q))
        );
        setViewingQuote((prev) =>
          prev?.id === attachmentQuoteId ? { ...prev, attachments: nextList } : prev
        );
        toast.success("Attachment removed.");
      } catch (err) {
        toast.error(err.message || "Failed to remove attachment");
      } finally {
        setDeletingAttachmentUrl(null);
      }
    },
    [attachmentQuoteId, attachmentList, toast]
  );

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

  const openCustomerDetailModal = () => {
    const id = form.customerId || formRef.current?.customerId;
    if (!id) return;
    setViewingCustomerDetail(null);
    setLoadingCustomerDetailId(id);
    setViewCustomerDetailOpen(true);
  };

  const openMotorDetailModal = () => {
    const id = form.motorId || formRef.current?.motorId;
    if (!id) return;
    setViewingMotorDetail(null);
    setLoadingMotorDetailId(id);
    setViewMotorDetailOpen(true);
  };

  useEffect(() => {
    if (!viewCustomerDetailOpen || !loadingCustomerDetailId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/customers/${loadingCustomerDetailId}`, { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadingCustomerDetailId(null);
          return;
        }
        setViewingCustomerDetail(data);
        setLoadingCustomerDetailId(null);
      } catch {
        if (!cancelled) setLoadingCustomerDetailId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewCustomerDetailOpen, loadingCustomerDetailId]);

  useEffect(() => {
    if (!viewMotorDetailOpen || !loadingMotorDetailId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/motors/${loadingMotorDetailId}`, { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setLoadingMotorDetailId(null);
          return;
        }
        setViewingMotorDetail(data);
        setLoadingMotorDetailId(null);
      } catch {
        if (!cancelled) setLoadingMotorDetailId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewMotorDetailOpen, loadingMotorDetailId]);

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
    let cancelled = false;
    (async () => {
      try {
        const leadRes = await fetch(`/api/dashboard/leads/${fromLeadId}`, { credentials: "include" });
        const lead = await leadRes.json();
        if (cancelled || !leadRes.ok) return;
        setForm((prev) => ({
          ...prev,
          leadId: fromLeadId,
          repairScope: lead.problemDescription || prev.repairScope,
          notes: lead.message || prev.notes,
        }));
        setCreateModalOpen(true);
        router.replace("/dashboard/quotes", { scroll: false });
      } catch {
        if (!cancelled) toast.error("Could not load lead.");
      }
    })();
    return () => { cancelled = true; };
  }, [fromLeadId, toast, router]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.companyName || c.id || "—" })),
    [customers]
  );

  const motorOptionsForCustomer = useMemo(() => {
    const custId = form.customerId || formRef.current?.customerId;
    if (!custId) return [];
    const linked = motors
      .filter((m) => m.customerId === custId)
      .map((m) => ({ value: m.id, label: [m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || m.id }));
    return [...linked, { value: "__add_motor__", label: "+ Add new motor (linked to this customer)" }];
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

  const openViewModal = (quote) => {
    if (!quote?.id) {
      setViewingQuote(quote);
      setViewModalOpen(true);
      return;
    }
    setViewingQuote(null);
    setViewLoadingQuoteId(quote.id);
    setViewModalOpen(true);
  };

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

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingQuote(null);
    setViewLoadingQuoteId(null);
  };

  const openEditModal = async (quote) => {
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
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingQuote(null);
  };

  const openCreateModal = () => {
    setForm({ ...INITIAL_FORM, date: todayString() });
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => setCreateModalOpen(false);

  const handleCreateSubmit = async (e) => {
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
    setSavingQuote(true);
    try {
      const res = await fetch("/api/dashboard/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildQuotePayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create quote");
      toast.success("Quote created.");
      closeCreateModal();
      loadQuotes();
    } catch (err) {
      toast.error(err.message || "Failed to create quote");
    } finally {
      setSavingQuote(false);
    }
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
  const handleSendToCustomer = async (quoteFromTable) => {
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
    setSendingQuote(true);
    setSendingQuoteId(quoteId);
    try {
      const res = await fetch(`/api/dashboard/quotes/${quoteId}/send`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send quote");
      toast.success("Quote sent to customer. Status set to Sent.");
      setQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: "sent" } : q))
      );
      setViewingQuote((prev) => (prev?.id === quoteId ? { ...prev, status: "sent" } : prev));
    } catch (err) {
      toast.error(err.message || "Failed to send quote");
    } finally {
      setSendingQuote(false);
      setSendingQuoteId(null);
    }
  };

  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printPreviewData, setPrintPreviewData] = useState(null);
  const printPreviewRef = useRef(null);

  const handlePrintQuote = useCallback(
    async (quoteFromTable) => {
      const q = quoteFromTable ?? viewingQuote;
      if (!q?.id) return;
      let quoteToPrint = q;
      // When from table, fetch full quote so print always includes scope and parts datatables
      if (quoteFromTable) {
        try {
          const res = await fetch(`/api/dashboard/quotes/${q.id}`, { credentials: "include", cache: "no-store" });
          if (res.ok) quoteToPrint = await res.json();
        } catch {
          // use row data as-is
        }
      }
      setPrintPreviewData({
        quote: quoteToPrint,
        customerName: customerNameMap[quoteToPrint.customerId] || "",
        motorLabel: motorLabelMap[quoteToPrint.motorId] || "",
        shop: { name: "", address: "", contact: "" },
      });
      setPrintPreviewOpen(true);
    },
    [viewingQuote, customerNameMap, motorLabelMap]
  );

  const handlePrintPreviewPrint = () => {
    requestAnimationFrame(() => {
      window.print();
      closePrintPreview();
    });
  };

  const closePrintPreview = () => {
    setPrintPreviewOpen(false);
    setPrintPreviewData(null);
    setViewModalOpen(false);
    setEditModalOpen(false);
    setViewingQuote(null);
    setViewLoadingQuoteId(null);
  };

  useEffect(() => {
    if (!printPreviewOpen) return;
    const styleId = "quote-print-preview-styles";
    const existing = document.getElementById(styleId);
    if (existing) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .quote-print-preview, .quote-print-preview * { visibility: visible; }
        .quote-print-preview { position: fixed !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; background: white !important; z-index: 99999 !important; overflow: auto !important; }
        .quote-print-preview .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [printPreviewOpen]);

  // Open print dialog as soon as the preview is shown (no need to click Print again)
  useEffect(() => {
    if (!printPreviewOpen || !printPreviewData) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [printPreviewOpen, printPreviewData]);

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
          return (
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
                onClick={() => openAttachmentModal(row.id, row.rfqNumber, row.attachments)}
                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Attachments"
                title="Attachments"
              >
                <FiPaperclip className="h-4 w-4" />
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
        render: (_, row) => row.laborTotal ? `$${row.laborTotal}` : "—",
      },
      {
        key: "partsTotal",
        label: "Other Cost",
        render: (_, row) => row.partsTotal ? `$${row.partsTotal}` : "—",
      },
      {
        key: "grandTotal",
        label: "Grand Total",
        render: (_, row) => {
          const labor = parseFloat(row.laborTotal || 0);
          const parts = parseFloat(row.partsTotal || 0);
          const total = labor + parts;
          return total ? `$${total.toFixed(2)}` : "—";
        },
      },
      { key: "estimatedCompletion", label: "Est. completion" },
    ],
    [customerNameMap, motorLabelMap, sendingQuoteId]
  );

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.name || e.email || e.id || "—" })),
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

  const nextRfqNumber = useMemo(() => {
    let maxNum = 0;
    for (const q of quotes) {
      const m = (q.rfqNumber || "").match(/^A(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return "A" + String(maxNum + 1).padStart(5, "0");
  }, [quotes]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Quotes</h1>
          <p className="mt-1 text-sm text-secondary">
            Prepare repair estimates. Create quote from list or from lead. Send link or mark as approved when ready.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="shrink-0">
          Create Quote
        </Button>
      </div>

      <div className="mt-6 min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value ?? "")}
            options={[
              { value: "", label: "All" },
              ...STATUS_OPTIONS,
            ]}
            placeholder="All statuses"
          />
        </div>
        <Table
          columns={columns}
          data={filteredQuotes}
          rowKey="id"
          loading={loading}
          emptyMessage={quotes.length === 0 ? "No quotes yet. Use “Create Quote” or create from a lead." : statusFilter ? "No quotes with this status." : "No quotes match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search customer, motor, status…"
          onRefresh={async () => { setLoading(true); await loadQuotes(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Create Quote modal */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Create Quote"
        size="full"
        width="55vw"
        actions={
          <>
            <span title="Save the RFQ prior to attach documents" className="inline-block">
              <Button type="button" variant="outline" size="sm" disabled onClick={() => {}}>
                <FiPaperclip className="mr-1.5 h-4 w-4 inline" />Attachments
              </Button>
            </span>
            <span title="Save the RFQ prior to send to customer" className="inline-block">
              <Button type="button" variant="outline" size="sm" disabled onClick={() => {}}>
                <FiSend className="mr-1.5 h-4 w-4 inline" />Send to Customer
              </Button>
            </span>
            <span title="Save the RFQ prior to print" className="inline-block">
              <Button type="button" variant="outline" size="sm" disabled onClick={() => {}}>
                <FiPrinter className="mr-1.5 h-4 w-4 inline" />Print
              </Button>
            </span>
            <Button type="submit" form="create-quote-form" variant="primary" size="sm" disabled={savingQuote}>
              {savingQuote ? "Saving…" : <><FiSave className="mr-1.5 h-4 w-4 inline" />Save</>}
            </Button>
          </>
        }
      >
        <Form id="create-quote-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Quote info</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="RFQ#" value={nextRfqNumber} readOnly />
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
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & motor</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Customer"
                options={customerOptions}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value ?? "", motorId: "" }))}
                placeholder="Select customer"
                searchable
                className="lg:col-span-2 min-w-0"
              />
              <Select
                label="Motor"
                options={motorOptionsForCustomer}
                value={form.motorId === "__add_motor__" ? "" : form.motorId}
                onChange={handleMotorSelectChange}
                placeholder={form.customerId ? "Select motor or add new" : "Select customer first"}
                searchable
                className="lg:col-span-2 min-w-0"
              />
            </div>
            {(selectedCustomer || selectedMotor) && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedCustomer && (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-title">Customer</div>
                      <Button type="button" variant="outline" size="sm" onClick={openCustomerDetailModal}>View</Button>
                    </div>
                    <p className="mt-1 text-title">{selectedCustomer.companyName || "—"}</p>
                    {selectedCustomer.primaryContactName && <p className="text-secondary">{selectedCustomer.primaryContactName}</p>}
                    {selectedCustomer.phone && <p className="text-secondary">{selectedCustomer.phone}</p>}
                    {selectedCustomer.email && <p className="text-secondary">{selectedCustomer.email}</p>}
                    {(selectedCustomer.address || selectedCustomer.city) && (
                      <p className="text-secondary">
                        {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {selectedMotor && (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-title">Motor</div>
                      <Button type="button" variant="outline" size="sm" onClick={openMotorDetailModal}>View</Button>
                    </div>
                    <p className="mt-1 text-title">
                      {[selectedMotor.serialNumber, selectedMotor.manufacturer, selectedMotor.model].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {(selectedMotor.hp || selectedMotor.voltage || selectedMotor.rpm) && (
                      <p className="text-secondary">
                        {[selectedMotor.hp && `${selectedMotor.hp} HP`, selectedMotor.voltage && `${selectedMotor.voltage}V`, selectedMotor.rpm && `${selectedMotor.rpm} RPM`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {selectedMotor.motorType && <p className="text-secondary">Type: {selectedMotor.motorType}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Scope & Other Cost</h3>
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
                <DataTable
                  columns={PARTS_COLUMNS}
                  data={form.partsLines}
                  onChange={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                  striped
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
              <span className="text-sm text-secondary">Scope total: ${scopeTotal.toFixed(2)}</span>
              <span className="text-sm text-secondary">Other Cost total: ${partsTotalSum.toFixed(2)}</span>
              <span className="font-semibold text-title">Service proposal total: ${serviceProposalTotal.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Other</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "draft" }))}
                placeholder="Status"
              />
              <Input
                label="Estimated completion"
                value={form.estimatedCompletion}
                onChange={(e) => setForm((f) => ({ ...f, estimatedCompletion: e.target.value }))}
                placeholder="e.g. 2 weeks"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Textarea
                label="Customer notes"
                value={form.customerNotes}
                onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                placeholder="Shown on proposal and invoice to client"
                rows={2}
              />
              <Textarea
                label="Internal notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="For repair company reference only"
                rows={2}
              />
            </div>
          </div>
        </Form>
      </Modal>

      {/* Add Motor modal (from quote form) — same layout as motor assets Create Motor */}
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
        width="55vw"
        actions={
          <>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to attach documents" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id}
                onClick={() => openAttachmentModal(viewingQuote?.id, viewingQuote?.rfqNumber, viewingQuote?.attachments)}
              >
                <FiPaperclip className="mr-1.5 h-4 w-4 inline" />Attachments
              </Button>
            </span>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to send to customer" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id || sendingQuote}
                onClick={handleSendToCustomer}
              >
                {sendingQuote ? <><FiRotateCw className="mr-1.5 h-4 w-4 inline animate-spin" aria-hidden />Sending…</> : <><FiSend className="mr-1.5 h-4 w-4 inline" />Send to Customer</>}
              </Button>
            </span>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to print" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id}
                onClick={() => handlePrintQuote(viewingQuote)}
              >
                <FiPrinter className="mr-1.5 h-4 w-4 inline" />Print
              </Button>
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => { closeViewModal(); openEditModal(viewingQuote); }}>Edit</Button>
          </>
        }
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
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer & motor</h3>
              <p className="text-title font-medium">{customerNameMap[viewingQuote.customerId] || viewingQuote.customerId || "—"}</p>
              <p className="mt-1 text-sm text-secondary">{motorLabelMap[viewingQuote.motorId] || viewingQuote.motorId || "—"}</p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Status & totals</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">Status</dt><dd className="text-title">{STATUS_OPTIONS.find((o) => o.value === (viewingQuote.status || ""))?.label ?? (viewingQuote.status || "—")}</dd></div>
                <div><dt className="text-secondary">Scope total</dt><dd className="text-title">{viewingQuote.laborTotal ? `$${viewingQuote.laborTotal}` : "—"}</dd></div>
                <div><dt className="text-secondary">Other Cost total</dt><dd className="text-title">{viewingQuote.partsTotal ? `$${viewingQuote.partsTotal}` : "—"}</dd></div>
                <div><dt className="text-secondary">Service proposal total</dt><dd className="font-semibold text-title">${(parseFloat(viewingQuote.laborTotal || 0) + parseFloat(viewingQuote.partsTotal || 0)).toFixed(2)}</dd></div>
                <div><dt className="text-secondary">Est. completion</dt><dd className="text-title">{viewingQuote.estimatedCompletion || "—"}</dd></div>
              </dl>
            </div>
            {(Array.isArray(viewingQuote.scopeLines) && viewingQuote.scopeLines.length > 0) || (Array.isArray(viewingQuote.partsLines) && viewingQuote.partsLines.length > 0) ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                {Array.isArray(viewingQuote.scopeLines) && viewingQuote.scopeLines.length > 0 && (
                  <div className="lg:col-span-2">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Scope</h3>
                    <div className="overflow-hidden rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-card"><tr><th className="px-3 py-2 text-left text-xs font-medium text-title">Scope</th><th className="px-3 py-2 text-right text-xs font-medium text-title">Price</th></tr></thead>
                        <tbody>
                          {viewingQuote.scopeLines.map((row, i) => (
                            <tr key={i} className="border-b border-border last:border-b-0"><td className="px-3 py-2 text-text">{row.scope || "—"}</td><td className="px-3 py-2 text-right tabular-nums">${row.price || "0"}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {Array.isArray(viewingQuote.partsLines) && viewingQuote.partsLines.length > 0 && (
                  <div className="lg:col-span-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Other Cost</h3>
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
                                <td className="px-3 py-2 text-right tabular-nums">{row.price ? `$${row.price}` : "—"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{total != null ? `$${total.toFixed(2)}` : "—"}</td>
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
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingQuote.customerNotes || "—"}</p>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Internal notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingQuote.notes || "—"}</p>
              </div>
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

      {/* Edit modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit quote"
        size="full"
        width="55vw"
        actions={
          <>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to attach documents" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id}
                onClick={() => openAttachmentModal(viewingQuote?.id, viewingQuote?.rfqNumber ?? form.rfqNumber, viewingQuote?.attachments)}
              >
                <FiPaperclip className="mr-1.5 h-4 w-4 inline" />Attachments
              </Button>
            </span>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to send to customer" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id || sendingQuote}
                onClick={handleSendToCustomer}
              >
                {sendingQuote ? <><FiRotateCw className="mr-1.5 h-4 w-4 inline animate-spin" aria-hidden />Sending…</> : <><FiSend className="mr-1.5 h-4 w-4 inline" />Send to Customer</>}
              </Button>
            </span>
            <span title={!viewingQuote?.id ? "Save the RFQ prior to print" : undefined} className="inline-block">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!viewingQuote?.id}
                onClick={() => handlePrintQuote({
                  ...viewingQuote,
                  ...form,
                  scopeLines: Array.isArray(form.scopeLines) ? form.scopeLines : (viewingQuote?.scopeLines ?? []),
                  partsLines: Array.isArray(form.partsLines) ? form.partsLines : (viewingQuote?.partsLines ?? []),
                })}
              >
                <FiPrinter className="mr-1.5 h-4 w-4 inline" />Print
              </Button>
            </span>
            <Button type="submit" form="edit-quote-form" variant="primary" size="sm" disabled={savingQuote}>
              {savingQuote ? "Saving…" : <><FiSave className="mr-1.5 h-4 w-4 inline" />Save</>}
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
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & motor</h3>
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
                placeholder={form.customerId ? "Select motor or add new" : "Select customer first"}
                searchable
                className="lg:col-span-2 min-w-0"
              />
            </div>
            {(selectedCustomer || selectedMotor) && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {selectedCustomer && (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-title">Customer</div>
                      <Button type="button" variant="outline" size="sm" onClick={openCustomerDetailModal}>View</Button>
                    </div>
                    <p className="mt-1 text-title">{selectedCustomer.companyName || "—"}</p>
                    {selectedCustomer.primaryContactName && <p className="text-secondary">{selectedCustomer.primaryContactName}</p>}
                    {selectedCustomer.phone && <p className="text-secondary">{selectedCustomer.phone}</p>}
                    {selectedCustomer.email && <p className="text-secondary">{selectedCustomer.email}</p>}
                    {(selectedCustomer.address || selectedCustomer.city) && (
                      <p className="text-secondary">
                        {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {selectedMotor && (
                  <div className="rounded-lg border border-border bg-card p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-title">Motor</div>
                      <Button type="button" variant="outline" size="sm" onClick={openMotorDetailModal}>View</Button>
                    </div>
                    <p className="mt-1 text-title">
                      {[selectedMotor.serialNumber, selectedMotor.manufacturer, selectedMotor.model].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {(selectedMotor.hp || selectedMotor.voltage || selectedMotor.rpm) && (
                      <p className="text-secondary">
                        {[selectedMotor.hp && `${selectedMotor.hp} HP`, selectedMotor.voltage && `${selectedMotor.voltage}V`, selectedMotor.rpm && `${selectedMotor.rpm} RPM`].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {selectedMotor.motorType && <p className="text-secondary">Type: {selectedMotor.motorType}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Scope & Other Cost</h3>
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
                <DataTable
                  columns={PARTS_COLUMNS}
                  data={form.partsLines}
                  onChange={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                  striped
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
              <span className="text-sm text-secondary">Scope total: ${scopeTotal.toFixed(2)}</span>
              <span className="text-sm text-secondary">Other Cost total: ${partsTotalSum.toFixed(2)}</span>
              <span className="font-semibold text-title">Service proposal total: ${serviceProposalTotal.toFixed(2)}</span>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Other</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "draft" }))}
                placeholder="Status"
              />
              <Input
                label="Estimated completion"
                value={form.estimatedCompletion}
                onChange={(e) => setForm((f) => ({ ...f, estimatedCompletion: e.target.value }))}
                placeholder="e.g. 2 weeks"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Textarea
                label="Customer notes"
                value={form.customerNotes}
                onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                placeholder="Shown on proposal and invoice to client"
                rows={2}
              />
              <Textarea
                label="Internal notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="For repair company reference only"
                rows={2}
              />
            </div>
          </div>
        </Form>
      </Modal>

      {/* Attachments modal (for saved quote / RFQ) — higher z-index so it opens above Quote modal */}
      <Modal
        open={attachmentModalOpen}
        onClose={closeAttachmentModal}
        title={`Attachments — RFQ# ${attachmentRfqNumber || "—"}`}
        size="lg"
        zIndex={100}
        actions={<Button type="button" variant="outline" size="sm" onClick={closeAttachmentModal}>Close</Button>}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Select files to attach</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={attachmentFileInputRef}
                type="file"
                multiple
                className="block w-full max-w-xs text-sm text-secondary file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:cursor-pointer hover:file:opacity-90"
                onChange={handleAttachmentUpload}
                disabled={uploadingAttachments}
              />
              {uploadingAttachments && <span className="text-sm text-secondary">Uploading…</span>}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Attached documents</h3>
            {loadingAttachments ? (
              <p className="text-sm text-secondary">Loading…</p>
            ) : attachmentList.length === 0 ? (
              <p className="text-sm text-secondary">No attachments yet. Select files above to add them.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-card">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-title">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-title">Link</th>
                      <th className="w-10 px-2 py-2 text-right font-medium text-title" aria-label="Delete" />
                    </tr>
                  </thead>
                  <tbody>
                    {attachmentList.map((att, i) => (
                      <tr key={i} className="border-b border-border last:border-b-0">
                        <td className="px-3 py-2 text-title">{att.name || att.url || "—"}</td>
                        <td className="px-3 py-2">
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline hover:no-underline"
                          >
                            Open
                          </a>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(att)}
                            disabled={deletingAttachmentUrl === att.url}
                            className="rounded p-1.5 text-secondary hover:bg-card hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Delete attachment"
                            title="Delete"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Print preview (same window) — portaled to body so it's on top; only quote content is printed */}
      {printPreviewOpen && printPreviewData && typeof document !== "undefined"
        ? createPortal(
            <div
            ref={printPreviewRef}
            className="quote-print-preview fixed inset-0 bg-card overflow-auto p-6 text-title"
            style={{ zIndex: 99999 }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="no-print flex flex-wrap items-center justify-end gap-2 border-b border-border pb-4 mb-4">
                <Button type="button" variant="outline" size="sm" onClick={handlePrintPreviewPrint}>
                  <FiPrinter className="mr-1.5 h-4 w-4 inline" /> Print
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={closePrintPreview}>Close</Button>
              </div>

            {/* Motor Shop — provision for Settings */}
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Motor Shop</h2>
              <p className="font-semibold text-title">{printPreviewData.shop?.name || "—"}</p>
              <p className="text-sm text-secondary">{printPreviewData.shop?.address || "—"}</p>
              <p className="text-sm text-secondary">{printPreviewData.shop?.contact || "—"}</p>
            </div>

            {(() => {
              const q = printPreviewData.quote;
              const total = (parseFloat(q.laborTotal || 0) + parseFloat(q.partsTotal || 0)).toFixed(2);
              return (
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold">Service Proposal</h1>
                  </div>
                  <section className="mb-6">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Quote info</h2>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div><dt className="text-secondary">RFQ#</dt><dd className="font-medium">{q.rfqNumber || "—"}</dd></div>
                      <div><dt className="text-secondary">Customer PO#</dt><dd>{q.customerPo || "—"}</dd></div>
                      <div><dt className="text-secondary">Date</dt><dd>{q.date || "—"}</dd></div>
                      <div><dt className="text-secondary">Prepared by</dt><dd>{q.preparedBy || "—"}</dd></div>
                    </dl>
                  </section>
                  <section className="mb-6">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Customer & motor</h2>
                    <p className="font-medium">{printPreviewData.customerName || q.customerId || "—"}</p>
                    <p className="text-secondary">{printPreviewData.motorLabel || q.motorId || "—"}</p>
                  </section>
                  {Array.isArray(q.scopeLines) && q.scopeLines.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Scope</h2>
                      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                        <thead className="bg-card"><tr><th className="px-3 py-2 text-left font-medium">Scope</th><th className="px-3 py-2 text-right font-medium">Price</th></tr></thead>
                        <tbody>
                          {q.scopeLines.map((row, i) => (
                            <tr key={i} className="border-t border-border"><td className="px-3 py-2">{row.scope || "—"}</td><td className="px-3 py-2 text-right">{row.price ? `$${row.price}` : "—"}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </section>
                  )}
                  {Array.isArray(q.partsLines) && q.partsLines.length > 0 && (
                    <section className="mb-6">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Other Cost</h2>
                      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                        <thead className="bg-card"><tr><th className="px-3 py-2 text-left font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-left font-medium">UOM</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Total</th></tr></thead>
                        <tbody>
                          {q.partsLines.map((row, i) => {
                            const qty = parseFloat(row?.qty ?? "1");
                            const price = parseFloat(row?.price ?? "0");
                            const lineTotal = Number.isFinite(qty) && Number.isFinite(price) ? (qty * price).toFixed(2) : "—";
                            return (
                              <tr key={i} className="border-t border-border">
                                <td className="px-3 py-2">{row.item || "—"}</td>
                                <td className="px-3 py-2 text-right">{row.qty ?? "1"}</td>
                                <td className="px-3 py-2">{row.uom || "—"}</td>
                                <td className="px-3 py-2 text-right">{row.price ? `$${row.price}` : "—"}</td>
                                <td className="px-3 py-2 text-right">{lineTotal !== "—" ? `$${lineTotal}` : "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </section>
                  )}
                  <section className="mb-6">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Totals</h2>
                    <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <div><dt className="text-secondary">Scope total</dt><dd>{q.laborTotal ? `$${q.laborTotal}` : "—"}</dd></div>
                      <div><dt className="text-secondary">Other Cost total</dt><dd>{q.partsTotal ? `$${q.partsTotal}` : "—"}</dd></div>
                      <div><dt className="text-secondary">Service proposal total</dt><dd className="font-semibold">${total}</dd></div>
                      <div><dt className="text-secondary">Est. completion</dt><dd>{q.estimatedCompletion || "—"}</dd></div>
                    </dl>
                  </section>
                  {q.customerNotes && (
                    <section className="mb-6">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Customer notes</h2>
                      <p className="whitespace-pre-wrap">{q.customerNotes}</p>
                    </section>
                  )}
                </>
              );
            })()}
          </div>
        </div>,
            document.body
          )
        : null}

      {/* Customer detail modal (from quote form) */}
      <Modal
        open={viewCustomerDetailOpen}
        onClose={() => { setViewCustomerDetailOpen(false); setViewingCustomerDetail(null); setLoadingCustomerDetailId(null); }}
        title="Customer details"
        size="4xl"
        actions={<Button type="button" variant="outline" size="sm" onClick={() => { setViewCustomerDetailOpen(false); setViewingCustomerDetail(null); setLoadingCustomerDetailId(null); }}>Close</Button>}
      >
        {loadingCustomerDetailId ? (
          <div className="flex items-center justify-center py-12"><span className="text-secondary">Loading…</span></div>
        ) : viewingCustomerDetail ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Company & contact</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div><dt className="text-secondary">Company</dt><dd className="font-medium text-title">{viewingCustomerDetail.companyName || "—"}</dd></div>
                <div><dt className="text-secondary">Primary contact</dt><dd className="text-title">{viewingCustomerDetail.primaryContactName || "—"}</dd></div>
                <div><dt className="text-secondary">Phone</dt><dd className="text-title">{viewingCustomerDetail.phone || "—"}</dd></div>
                <div><dt className="text-secondary">Email</dt><dd className="text-title">{viewingCustomerDetail.email || "—"}</dd></div>
              </dl>
            </div>
            {Array.isArray(viewingCustomerDetail.additionalContacts) && viewingCustomerDetail.additionalContacts.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Additional contacts</h3>
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-border bg-card">
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Phone</th>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">Email</th>
                      </tr>
                    </thead>
                    <tbody className="text-title">
                      {viewingCustomerDetail.additionalContacts.map((ac, i) => (
                        <tr key={i} className="border-b border-border last:border-b-0">
                          <td className="px-3 py-2">{ac.contactName || "—"}</td>
                          <td className="px-3 py-2">{ac.phone || "—"}</td>
                          <td className="px-3 py-2">{ac.email || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Billing address</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-secondary">Street</dt><dd className="text-title">{viewingCustomerDetail.address || "—"}</dd></div>
                <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingCustomerDetail.city || "—"}</dd></div>
                <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingCustomerDetail.state || "—"}</dd></div>
                <div><dt className="text-secondary">Zip code</dt><dd className="text-title">{viewingCustomerDetail.zipCode || "—"}</dd></div>
                <div><dt className="text-secondary">Country</dt><dd className="text-title">{viewingCustomerDetail.country || "—"}</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Shipping address</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2"><dt className="text-secondary">Street</dt><dd className="text-title">{viewingCustomerDetail.shippingAddress || "—"}</dd></div>
                <div><dt className="text-secondary">City</dt><dd className="text-title">{viewingCustomerDetail.shippingCity || "—"}</dd></div>
                <div><dt className="text-secondary">State</dt><dd className="text-title">{viewingCustomerDetail.shippingState || "—"}</dd></div>
                <div><dt className="text-secondary">Zip code</dt><dd className="text-title">{viewingCustomerDetail.shippingZipCode || "—"}</dd></div>
                <div><dt className="text-secondary">Country</dt><dd className="text-title">{viewingCustomerDetail.shippingCountry || "—"}</dd></div>
              </dl>
            </div>
            {(viewingCustomerDetail.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingCustomerDetail.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Motor detail modal (from quote form) */}
      <Modal
        open={viewMotorDetailOpen}
        onClose={() => { setViewMotorDetailOpen(false); setViewingMotorDetail(null); setLoadingMotorDetailId(null); }}
        title="Motor details"
        size="4xl"
        actions={<Button type="button" variant="outline" size="sm" onClick={() => { setViewMotorDetailOpen(false); setViewingMotorDetail(null); setLoadingMotorDetailId(null); }}>Close</Button>}
      >
        {loadingMotorDetailId ? (
          <div className="flex items-center justify-center py-12"><span className="text-secondary">Loading…</span></div>
        ) : viewingMotorDetail ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer</h3>
              <p className="text-title font-medium">{customerNameMap[viewingMotorDetail.customerId] || viewingMotorDetail.customerId || "—"}</p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Identification & specs</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">Serial</dt><dd className="text-title">{viewingMotorDetail.serialNumber || "—"}</dd></div>
                <div><dt className="text-secondary">Manufacturer</dt><dd className="text-title">{viewingMotorDetail.manufacturer || "—"}</dd></div>
                <div><dt className="text-secondary">Model</dt><dd className="text-title">{viewingMotorDetail.model || "—"}</dd></div>
                <div><dt className="text-secondary">Motor type</dt><dd className="text-title">{viewingMotorDetail.motorType || "—"}</dd></div>
                <div><dt className="text-secondary">HP</dt><dd className="text-title">{viewingMotorDetail.hp || "—"}</dd></div>
                <div><dt className="text-secondary">RPM</dt><dd className="text-title">{viewingMotorDetail.rpm || "—"}</dd></div>
                <div><dt className="text-secondary">Voltage</dt><dd className="text-title">{viewingMotorDetail.voltage || "—"}</dd></div>
                <div><dt className="text-secondary">KW</dt><dd className="text-title">{viewingMotorDetail.kw || "—"}</dd></div>
                <div><dt className="text-secondary">AMPs</dt><dd className="text-title">{viewingMotorDetail.amps || "—"}</dd></div>
                <div><dt className="text-secondary">Frame size</dt><dd className="text-title">{viewingMotorDetail.frameSize || "—"}</dd></div>
                <div><dt className="text-secondary">Slots</dt><dd className="text-title">{viewingMotorDetail.slots || "—"}</dd></div>
                <div><dt className="text-secondary">Core length</dt><dd className="text-title">{viewingMotorDetail.coreLength || "—"}</dd></div>
                <div><dt className="text-secondary">Core diameter</dt><dd className="text-title">{viewingMotorDetail.coreDiameter || "—"}</dd></div>
                <div><dt className="text-secondary">Bars</dt><dd className="text-title">{viewingMotorDetail.bars || "—"}</dd></div>
              </dl>
            </div>
            {(viewingMotorDetail.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingMotorDetail.notes}</p>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
