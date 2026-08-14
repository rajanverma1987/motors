"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiEdit2, FiEye, FiPaperclip, FiPlus, FiPrinter, FiSend, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Tabs from "@/components/ui/tabs";
import SimpleSelect from "@/components/simple/simple-select";
import SimplePurchaseOrderPrintPreviewModal from "@/components/simple/simple-purchase-order-print-preview-modal";
import SimplePurchaseOrderAttachmentsModal from "@/components/simple/simple-purchase-order-attachments-modal";
import SimpleVendorFormFields from "@/components/simple/simple-vendor-form-fields";
import { Form } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { buildEmployeeSelectOptions } from "@/lib/technician-select-options";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { buildSimplePurchaseOrderPrintPayload } from "@/lib/simple-purchase-order-print";
import { buildVendorPayload, INITIAL_VENDOR_FORM } from "@/lib/vendor-record-form";
import {
  computeNextSimplePoNumber,
  computePoFormTotals,
  computePoLineTotals,
  computePoPaymentSummary,
  createEmptySimplePurchaseOrderForm,
  emptyPoLine,
  emptyPoPayment,
  formToSimplePurchaseOrderRow,
  parsePoMoney,
  poLineHasContent,
  resolveSimplePoType,
  sanitizePoNumericInput,
  suggestReceivingStatus,
  SIMPLE_PO_PAYMENT_METHOD_OPTIONS,
  SIMPLE_PO_RECEIVING_STATUS_OPTIONS,
  SIMPLE_PO_TYPE_JOB,
  SIMPLE_PO_TYPE_OPTIONS,
  SIMPLE_PO_TYPE_SHOP,
  storedPoToForm,
} from "@/lib/simple-purchase-order-form";
import { computeSimpleServiceProposalTotals } from "@/lib/simple-service-proposal-form";
import {
  fetchSimplePurchaseOrders,
  fetchSimpleServiceProposal,
  fetchSimpleServiceProposals,
  listSimplePurchaseOrdersForJobApi,
  saveSimplePurchaseOrder,
} from "@/lib/simple-portal-api";
import { useSimpleJobView } from "@/components/simple/simple-job-view-context";

const TAB_PO = "purchase-order";
const TAB_RECEIVING = "receiving";
const TAB_PAYMENT = "payment";

const FORM_ID = "simple-purchase-order-form";
const ADD_VENDOR_FORM_ID = "simple-po-add-vendor-form";
const EDIT_PAYMENT_FORM_ID = "simple-po-edit-payment-form";

/** ~90% of Service Proposal modal height (`min(94vh, 920px)`). */
const PO_MODAL_HEIGHT = "min(84.6vh, 828px)";
/** Header row + ~10 body rows (h-7 cells). */
const TABLE_SCROLL_MAX_CLASS = "max-h-[calc(2.25rem+10*2rem)]";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
/** Line-item cells: square corners, flush packing. */
const CELL_INPUT =
  "h-7 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-xs text-title outline-none focus:bg-primary/[0.06] focus:ring-1 focus:ring-inset focus:ring-primary dark:focus:bg-primary/10 dark:text-title";
const CELL_INPUT_MUTED = `${CELL_INPUT} !bg-muted/40`;

function FieldRow({
  label,
  labelWidth = "9.5rem",
  children,
  className = "",
  controlClassName = "",
  labelClassName = "",
}) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={`${FIELD_LABEL} ${labelClassName}`} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

function formatMoney(n) {
  const value = Number.isFinite(n) ? n : 0;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function lineHasContent(line) {
  return poLineHasContent(line);
}

function paymentStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function applyPaymentFields(formLike, payments) {
  const totals = computePoFormTotals(formLike.lineItems, formLike.shippingCharge);
  const summary = computePoPaymentSummary(payments, totals.grandTotal);
  return {
    payments,
    paymentStatus: summary.paymentStatus,
    poPaidDate: summary.paymentStatus === "Unpaid" ? "" : summary.latestPaymentDate || "",
  };
}

/**
 * Create / edit purchase order for a Simple portal job.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   serviceProposalId: string,
 *   jobNumber: string,
 *   mode?: "create" | "view",
 *   initialPoId?: string,
 *   defaultPoType?: "job" | "shop",
 *   allowPoTypeChange?: boolean,
 *   onSaved?: (row: object) => void,
 * }} props
 */
export default function SimplePurchaseOrderFormModal({
  open,
  onClose,
  serviceProposalId = "",
  jobNumber = "",
  mode = "create",
  initialPoId = "",
  defaultPoType = SIMPLE_PO_TYPE_JOB,
  allowPoTypeChange = false,
  onSaved,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const formatDate = useFormatDate();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const isViewMode = mode === "view";
  const jobView = useSimpleJobView();

  const [form, setForm] = useState(() => createEmptySimplePurchaseOrderForm());
  const [jobPos, setJobPos] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [loadingForm, setLoadingForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [savingVendor, setSavingVendor] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPo, setPrintPo] = useState(null);
  const [printVendor, setPrintVendor] = useState(null);
  const [printSendMeta, setPrintSendMeta] = useState(null);
  const [activeTab, setActiveTab] = useState(TAB_PO);
  const [paymentDraft, setPaymentDraft] = useState(() => emptyPoPayment());
  const [editPayment, setEditPayment] = useState(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [jobContext, setJobContext] = useState(null);

  const poType = resolveSimplePoType(form);
  const isShopPo = poType === SIMPLE_PO_TYPE_SHOP;
  const showTypeSelect = allowPoTypeChange && !isViewMode;
  const poNumberEditable = !isViewMode && isShopPo;

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: String(v.id || ""),
        label: v.name || v.companyName || "Vendor",
      })),
    [vendors]
  );

  const poSelectOptions = useMemo(
    () =>
      jobPos.map((p) => ({
        value: String(p.id || ""),
        label: p.poNumber || p.id || "PO",
      })),
    [jobPos]
  );

  const paidByOptions = useMemo(
    () => buildEmployeeSelectOptions(employees, form.paidBy),
    [employees, form.paidBy]
  );

  const totals = useMemo(
    () => computePoFormTotals(form.lineItems, form.shippingCharge),
    [form.lineItems, form.shippingCharge]
  );

  const linkedJobId = String(form.serviceProposalId || serviceProposalId || "").trim();
  const showJobContextRow = Boolean(linkedJobId || form.jobNumber || jobNumber) && !isShopPo;

  useEffect(() => {
    if (!open) {
      setJobContext(null);
      return;
    }
    const id = String(form.serviceProposalId || serviceProposalId || "").trim();
    if (!id) {
      setJobContext(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const doc = await fetchSimpleServiceProposal(id);
        if (cancelled || !doc) return;
        const money = computeSimpleServiceProposalTotals(doc);
        const stored = Number(doc.total);
        setJobContext({
          id: String(doc.id || id),
          companyName: String(doc.companyName || "").trim(),
          amount: Number.isFinite(stored) && stored !== 0 ? stored : money.total,
        });
      } catch {
        if (!cancelled) setJobContext(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, form.serviceProposalId, serviceProposalId]);

  const modalTitle = isViewMode
    ? isShopPo
      ? `View Shop Purchase Order${form.poNumber ? ` — ${form.poNumber}` : ""}`
      : `View Purchase Orders${
          jobNumber || form.jobNumber ? ` for Job - ${jobNumber || form.jobNumber}` : ""
        }`
    : allowPoTypeChange
      ? isShopPo
        ? "New Shop Purchase Order"
        : "New Job Purchase Order"
      : isShopPo || defaultPoType === SIMPLE_PO_TYPE_SHOP
        ? "New Shop Purchase Order"
        : `Purchase Order for Job - ${String(jobNumber || "").trim() || "—"}`;

  const loadJobOptionsFromApi = useCallback(async () => {
    try {
      const list = await fetchSimpleServiceProposals();
      const opts = [];
      const seen = new Set();
      for (const row of Array.isArray(list) ? list : []) {
        const num = String(row.documentNumber || row.quote || "").trim();
        const id = String(row.id || "").trim();
        if (!num || !id || seen.has(id)) continue;
        seen.add(id);
        opts.push({ value: id, label: num, jobNumber: num });
      }
      opts.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
      setJobOptions(opts);
      return opts;
    } catch {
      setJobOptions([]);
      return [];
    }
  }, []);

  const startCreate = useCallback(async () => {
    const type =
      defaultPoType === SIMPLE_PO_TYPE_SHOP ? SIMPLE_PO_TYPE_SHOP : SIMPLE_PO_TYPE_JOB;
    if (type === SIMPLE_PO_TYPE_SHOP) {
      setJobPos([]);
      setForm(
        createEmptySimplePurchaseOrderForm({
          poType: SIMPLE_PO_TYPE_SHOP,
          serviceProposalId: "",
          jobNumber: "",
          poNumber: "",
        })
      );
      return;
    }
    const existing = await listSimplePurchaseOrdersForJobApi(serviceProposalId, jobNumber);
    setJobPos(existing);
    const poNumber = computeNextSimplePoNumber(jobNumber, existing);
    setForm(
      createEmptySimplePurchaseOrderForm({
        poType: SIMPLE_PO_TYPE_JOB,
        serviceProposalId: String(serviceProposalId || "").trim(),
        jobNumber: String(jobNumber || "").trim(),
        poNumber,
      })
    );
  }, [serviceProposalId, jobNumber, defaultPoType]);

  const loadPoById = useCallback((poId, list) => {
    const pool = Array.isArray(list) ? list : [];
    const row = pool.find((p) => String(p.id) === String(poId));
    if (!row) return;
    setForm(storedPoToForm(row));
  }, []);

  const loadVendors = useCallback(async () => {
    const vend = await fetchAllPaginatedDashboardItems("/api/dashboard/vendors");
    setVendors(Array.isArray(vend) ? vend : []);
  }, []);

  useEffect(() => {
    if (!open) {
      setLoadingForm(false);
      return;
    }
    let cancelled = false;
    setAddVendorOpen(false);
    setVendorForm(INITIAL_VENDOR_FORM);
    setActiveTab(TAB_PO);
    setPaymentDraft(emptyPoPayment());
    setEditPayment(null);
    setAttachmentsOpen(false);
    setLoadingForm(true);
    setForm(createEmptySimplePurchaseOrderForm());
    (async () => {
      try {
        await loadJobOptionsFromApi();
        if (cancelled) return;
        if (isViewMode) {
          const sid = String(serviceProposalId || "").trim();
          const job = String(jobNumber || "").trim();
          let scoped = await listSimplePurchaseOrdersForJobApi(sid, job);
          if (cancelled) return;
          const preferred = String(initialPoId || "").trim();
          if (preferred) {
            const all = await fetchSimplePurchaseOrders();
            if (cancelled) return;
            const hit = (Array.isArray(all) ? all : []).find((p) => String(p.id) === preferred);
            if (hit) {
              scoped = await listSimplePurchaseOrdersForJobApi(hit.serviceProposalId, hit.jobNumber);
              if (!scoped.length) scoped = [hit];
            }
          }
          if (cancelled) return;
          setJobPos(scoped);
          if (scoped.length) {
            const pick =
              (preferred && scoped.find((p) => String(p.id) === preferred)) || scoped[0];
            loadPoById(pick.id, scoped);
          } else {
            setForm(createEmptySimplePurchaseOrderForm());
          }
        } else {
          await startCreate();
        }
      } finally {
        if (!cancelled) setLoadingForm(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isViewMode,
    initialPoId,
    serviceProposalId,
    jobNumber,
    startCreate,
    loadPoById,
    loadJobOptionsFromApi,
  ]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoadingMeta(true);
    (async () => {
      try {
        const [vend, emps] = await Promise.all([
          fetchAllPaginatedDashboardItems("/api/dashboard/vendors"),
          fetchAllPaginatedDashboardItems("/api/dashboard/employees"),
        ]);
        if (cancelled) return;
        setVendors(Array.isArray(vend) ? vend : []);
        setEmployees(Array.isArray(emps) ? emps : []);
      } catch {
        if (!cancelled) {
          setVendors([]);
          setEmployees([]);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const patchLine = (lineId, key, value) => {
    setForm((f) => {
      const next = (f.lineItems || []).map((line) => {
        if (line.id !== lineId) return line;
        const updated = { ...line, [key]: value };
        if (key === "receivedQty") {
          updated.receivingStatus = suggestReceivingStatus(updated.quantity, value);
        }
        return updated;
      });
      const last = next[next.length - 1];
      if (last && lineHasContent(last)) next.push(emptyPoLine());
      return { ...f, lineItems: next };
    });
  };

  const removeLine = (lineId) => {
    setForm((f) => {
      const next = (f.lineItems || []).filter((line) => line.id !== lineId);
      return { ...f, lineItems: next.length ? next : [emptyPoLine()] };
    });
  };

  const handleSelectPo = (poId) => {
    setPaymentDraft(emptyPoPayment());
    setEditPayment(null);
    loadPoById(poId, jobPos);
  };

  const handleViewJob = () => {
    const id = String(jobContext?.id || form.serviceProposalId || serviceProposalId || "").trim();
    if (!id) return;
    jobView?.openJob?.(id);
  };

  const contentLines = useMemo(
    () => (form.lineItems || []).filter((line) => lineHasContent(line)),
    [form.lineItems]
  );

  const paymentSummary = useMemo(
    () => computePoPaymentSummary(form.payments, totals.grandTotal),
    [form.payments, totals.grandTotal]
  );

  const handleAddPayment = async () => {
    const amount = parsePoMoney(paymentDraft.amount);
    if (amount <= 0) {
      await alert({ title: "Amount required", message: "Enter a payment amount greater than zero.", variant: "danger" });
      return;
    }
    if (!String(paymentDraft.date || "").trim()) {
      await alert({ title: "Date required", message: "Enter the payment date.", variant: "danger" });
      return;
    }
    setForm((f) => {
      const payments = [...(Array.isArray(f.payments) ? f.payments : []), { ...paymentDraft, id: emptyPoPayment().id, amount: String(paymentDraft.amount) }];
      return { ...f, ...applyPaymentFields(f, payments) };
    });
    setPaymentDraft(emptyPoPayment());
  };

  const openEditPayment = (payment) => {
    if (!payment?.id) return;
    setEditPayment({
      ...emptyPoPayment(),
      ...payment,
      id: payment.id,
      date: String(payment.date || "").slice(0, 10),
      amount: String(payment.amount ?? ""),
      method: String(payment.method || ""),
      paidBy: String(payment.paidBy || ""),
      notes: String(payment.notes || ""),
    });
  };

  const handleSaveEditedPayment = async (e) => {
    e.preventDefault();
    if (!editPayment?.id) return;
    const amount = parsePoMoney(editPayment.amount);
    if (amount <= 0) {
      await alert({ title: "Amount required", message: "Enter a payment amount greater than zero.", variant: "danger" });
      return;
    }
    if (!String(editPayment.date || "").trim()) {
      await alert({ title: "Date required", message: "Enter the payment date.", variant: "danger" });
      return;
    }
    setForm((f) => {
      const payments = (Array.isArray(f.payments) ? f.payments : []).map((p) =>
        p.id === editPayment.id
          ? {
              ...p,
              ...editPayment,
              id: p.id,
              amount: String(editPayment.amount),
              date: String(editPayment.date || "").trim(),
              method: String(editPayment.method || "").trim(),
              paidBy: String(editPayment.paidBy || "").trim(),
              notes: String(editPayment.notes || "").trim(),
            }
          : p
      );
      return { ...f, ...applyPaymentFields(f, payments) };
    });
    setEditPayment(null);
  };

  const handleDeletePayment = async (paymentId) => {
    const ok = await confirm({
      title: "Delete payment",
      message: "Remove this payment record? This cannot be undone until you save.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setForm((f) => {
      const payments = (Array.isArray(f.payments) ? f.payments : []).filter((p) => p.id !== paymentId);
      return { ...f, ...applyPaymentFields(f, payments) };
    });
  };

  const handleDeleteVendorDocument = async (doc) => {
    const id = String(form.id || "").trim();
    const url = String(doc?.url || "").trim();
    if (!id || !url) {
      await alert({ title: "Error", message: "Save the purchase order before deleting attachments.", variant: "danger" });
      return;
    }
    const ok = await confirm({
      title: "Delete attachment",
      message: `Delete “${doc.name || "this document"}”? The file will be removed permanently.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/simple-purchase-orders/${encodeURIComponent(id)}/attachments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setForm((f) => ({
        ...f,
        vendorDocuments: (Array.isArray(f.vendorDocuments) ? f.vendorDocuments : []).filter(
          (d) => String(d?.url || "").trim() !== url
        ),
      }));
      await alert({ title: "Success", message: "Attachment deleted." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Delete failed", variant: "danger" });
    }
  };

  const handlePoTypeChange = async (nextType) => {
    const type = nextType === SIMPLE_PO_TYPE_SHOP ? SIMPLE_PO_TYPE_SHOP : SIMPLE_PO_TYPE_JOB;
    if (type === SIMPLE_PO_TYPE_SHOP) {
      setForm((f) =>
        createEmptySimplePurchaseOrderForm({
          ...f,
          poType: SIMPLE_PO_TYPE_SHOP,
          serviceProposalId: "",
          jobNumber: "",
          poNumber: "",
        })
      );
      setJobPos([]);
      return;
    }
    const job = String(form.jobNumber || jobNumber || "").trim();
    const sid = String(form.serviceProposalId || serviceProposalId || "").trim();
    const existing = await listSimplePurchaseOrdersForJobApi(sid, job);
    setJobPos(existing);
    setForm((f) =>
      createEmptySimplePurchaseOrderForm({
        ...f,
        poType: SIMPLE_PO_TYPE_JOB,
        serviceProposalId: sid,
        jobNumber: job,
        poNumber: job ? computeNextSimplePoNumber(job, existing) : "",
      })
    );
  };

  const handleLinkedJobChange = async (proposalId) => {
    const opt = jobOptions.find((o) => String(o.value) === String(proposalId));
    const job = String(opt?.jobNumber || opt?.label || "").trim();
    const sid = String(proposalId || "").trim();
    const existing = await listSimplePurchaseOrdersForJobApi(sid, job);
    setJobPos(existing);
    setForm((f) => ({
      ...f,
      poType: SIMPLE_PO_TYPE_JOB,
      serviceProposalId: sid,
      jobNumber: job,
      poNumber: job ? computeNextSimplePoNumber(job, existing) : "",
    }));
  };

  const selectedVendor = useMemo(
    () => vendors.find((v) => String(v.id) === String(form.vendorId || "")) || null,
    [vendors, form.vendorId]
  );

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!String(vendorForm.name || "").trim()) {
      await alert({ title: "Vendor name required", message: "Enter a vendor name.", variant: "danger" });
      return;
    }
    setSavingVendor(true);
    try {
      const res = await fetch("/api/dashboard/vendors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildVendorPayload(vendorForm)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await alert({
          title: "Error",
          message: data?.error || data?.message || "Failed to add vendor.",
          variant: "danger",
        });
        return;
      }
      const newId = String(data?.vendor?.id || "").trim();
      await loadVendors();
      if (newId) patch("vendorId", newId);
      setAddVendorOpen(false);
      setVendorForm(INITIAL_VENDOR_FORM);
      await alert({ title: "Vendor added", message: "Vendor added and selected." });
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to add vendor.",
        variant: "danger",
      });
    } finally {
      setSavingVendor(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const type = resolveSimplePoType(form);
    const sid = String(form.serviceProposalId || serviceProposalId || "").trim();
    const job = String(form.jobNumber || jobNumber || "").trim();

    if (type === SIMPLE_PO_TYPE_JOB) {
      if (!sid && !isViewMode) {
        await alert({
          title: "Job required",
          message: "Select a job for this Job PO, or switch to Shop PO.",
          variant: "danger",
        });
        return;
      }
      if (!job) {
        await alert({
          title: "Missing job number",
          message: "A JOB# / RFQ# is required for a Job PO.",
          variant: "danger",
        });
        return;
      }
    }

    const poNumber = String(form.poNumber || "").trim();
    if (!poNumber) {
      await alert({
        title: "PO# required",
        message:
          type === SIMPLE_PO_TYPE_SHOP
            ? "Enter a PO number for this Shop PO."
            : "PO number is missing.",
        variant: "danger",
      });
      return;
    }

    if (!String(form.vendorId || "").trim()) {
      await alert({ title: "Vendor required", message: "Select a vendor.", variant: "danger" });
      return;
    }

    setSaving(true);
    try {
      const vendor = vendors.find((v) => String(v.id) === String(form.vendorId));
      const forJob =
        type === SIMPLE_PO_TYPE_JOB ? await listSimplePurchaseOrdersForJobApi(sid, job) : [];
      const nextPoNumber =
        type === SIMPLE_PO_TYPE_JOB && !isViewMode && !String(form.id || "").trim()
          ? poNumber || computeNextSimplePoNumber(job, forJob)
          : poNumber;
      const row = formToSimplePurchaseOrderRow(
        {
          ...form,
          poType: type,
          serviceProposalId: type === SIMPLE_PO_TYPE_JOB ? sid : "",
          jobNumber: type === SIMPLE_PO_TYPE_JOB ? job : "",
          poNumber: nextPoNumber,
        },
        {
          vendorName: vendor?.name || vendor?.companyName || "",
          vendorPhone: vendor?.phone || "",
        }
      );
      const saved = await saveSimplePurchaseOrder({
        ...row,
        id: String(form.id || "").trim() || undefined,
      });
      onSaved?.(saved);
      if (type === SIMPLE_PO_TYPE_JOB) {
        const nextList = await listSimplePurchaseOrdersForJobApi(
          saved.serviceProposalId,
          saved.jobNumber
        );
        setJobPos(nextList);
      }
      await alert({ title: "Saved", message: `Purchase order ${saved.poNumber} saved.` });
      if (!isViewMode) {
        onClose?.();
      } else {
        setForm(storedPoToForm(saved));
      }
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save purchase order.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const openPrintPreview = async () => {
    if (!String(form.vendorId || "").trim()) {
      await alert({ title: "Vendor required", message: "Select a vendor before printing.", variant: "danger" });
      return;
    }
    if (!String(form.poNumber || "").trim()) {
      await alert({ title: "PO# required", message: "Enter a PO number before printing.", variant: "danger" });
      return;
    }
    const vendor = vendors.find((v) => String(v.id) === String(form.vendorId)) || null;
    const { po, vendor: vendorPayload, documentLabel } = buildSimplePurchaseOrderPrintPayload({
      form,
      vendor,
      accountSettings: mergedSettings,
      user,
    });
    const toEmail = String(vendor?.email || "").trim();
    const toName = String(vendor?.name || vendor?.companyName || vendor?.contactName || "").trim();
    setPrintPo(po);
    setPrintVendor(vendorPayload);
    setPrintSendMeta({
      toEmail,
      toName,
      from: resolveOutboundFromPreview(mergedSettings, user?.shopName || ""),
      documentLabel,
      smtp: getWorkspaceSmtpDeliveryNotice(mergedSettings),
    });
    setPrintOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={() => !saving && onClose?.()}
        title={modalTitle}
        size="6xl"
        width="min(1200px, 98vw)"
        height={PO_MODAL_HEIGHT}
        showClose={!saving && !loadingForm}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5"
              disabled={saving || loadingForm || loadingMeta || !String(form.id || "").trim()}
              title={
                String(form.id || "").trim()
                  ? "Add vendor invoices and documents"
                  : "Save the purchase order before adding attachments"
              }
              onClick={() => setAttachmentsOpen(true)}
            >
              <FiPaperclip className="h-4 w-4 shrink-0" aria-hidden />
              Attachments
              {(form.vendorDocuments || []).length > 0 ? (
                <Badge variant="primary" className="rounded-full px-1.5 py-0 text-[10px]">
                  {(form.vendorDocuments || []).length}
                </Badge>
              ) : null}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5"
              disabled={saving || loadingForm || loadingMeta || !form.id}
              title={!form.id ? "Save the purchase order first" : undefined}
              onClick={openPrintPreview}
            >
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5"
              disabled={saving || loadingForm || loadingMeta || !form.id}
              title={!form.id ? "Save the purchase order first" : undefined}
              onClick={openPrintPreview}
            >
              <FiSend className="h-4 w-4 shrink-0" aria-hidden />
              Send To Vendor
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              variant="primary"
              size="sm"
              disabled={saving || loadingForm || loadingMeta || (isViewMode && !form.id)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="relative min-h-[calc(min(84.6vh,828px)-4.75rem)]">
          {loadingForm ? (
            <div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-card/80 backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <span
                className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
                aria-hidden
              />
              <span className="text-sm font-medium text-title">Loading…</span>
            </div>
          ) : null}
        <Form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="flex min-h-[calc(min(84.6vh,828px)-4.75rem)] flex-col gap-5 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          aria-hidden={loadingForm || undefined}
        >
          {showJobContextRow ? (
            <div className="flex w-full shrink-0 flex-wrap items-center gap-x-6 gap-y-2">
              <p className="min-w-0 text-sm text-secondary">
                Customer Name:{" "}
                <span className="font-semibold text-title" title={jobContext?.companyName || ""}>
                  {jobContext?.companyName || "—"}
                </span>
              </p>
              <p className="text-sm text-secondary">
                Proposal Amount:{" "}
                <span className="font-semibold tabular-nums text-title">
                  {jobContext && Number.isFinite(jobContext.amount)
                    ? formatMoney(jobContext.amount)
                    : "—"}
                </span>
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-7 shrink-0"
                disabled={!linkedJobId || saving}
                onClick={handleViewJob}
              >
                <FiEye className="h-3.5 w-3.5 shrink-0" aria-hidden />
                View Job
              </Button>
            </div>
          ) : null}
          <div className="flex w-full shrink-0 flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
            {showTypeSelect ? (
              <FieldRow
                label="Type"
                labelWidth="100%"
                labelClassName="!text-left"
                className="w-[8.5rem] shrink-0 flex-col items-stretch gap-1"
                controlClassName="w-full min-w-0"
              >
                <SimpleSelect
                  options={SIMPLE_PO_TYPE_OPTIONS}
                  value={poType}
                  onChange={(e) => handlePoTypeChange(e.target.value)}
                  disabled={saving}
                  aria-label="PO Type"
                />
              </FieldRow>
            ) : null}
            {showTypeSelect && !isShopPo ? (
              <FieldRow
                label="Job#"
                labelWidth="100%"
                labelClassName="!text-left"
                className="w-[11rem] shrink-0 flex-col items-stretch gap-1"
                controlClassName="w-full min-w-0"
              >
                <SimpleSelect
                  options={jobOptions}
                  value={String(form.serviceProposalId || "")}
                  onChange={(e) => handleLinkedJobChange(e.target.value)}
                  placeholder={jobOptions.length ? "Select job…" : "No jobs saved"}
                  disabled={saving || !jobOptions.length}
                  searchable
                  aria-label="Job"
                />
              </FieldRow>
            ) : null}
            {!showTypeSelect && !isShopPo && (form.jobNumber || jobNumber) ? (
              <FieldRow
                label="Job"
                labelWidth="100%"
                labelClassName="!text-left"
                className="w-[9.5rem] shrink-0 flex-col items-stretch gap-1"
                controlClassName="w-full min-w-0"
              >
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={form.jobNumber || jobNumber}
                  title={form.jobNumber || jobNumber}
                  className={`${FIELD_INPUT} font-semibold tabular-nums !bg-muted`}
                  aria-label="Job"
                />
              </FieldRow>
            ) : null}
            <FieldRow
              label="PO#"
              labelWidth="100%"
              labelClassName="!text-left"
              className="w-[10.5rem] shrink-0 flex-col items-stretch gap-1"
              controlClassName="w-full min-w-0"
            >
              {isViewMode ? (
                <SimpleSelect
                  options={poSelectOptions}
                  value={String(form.id || "")}
                  onChange={(e) => handleSelectPo(e.target.value)}
                  placeholder={poSelectOptions.length ? "Select PO…" : "No POs yet"}
                  disabled={!poSelectOptions.length || saving}
                  searchable
                  aria-label="Purchase Order"
                />
              ) : (
                <input
                  type="text"
                  readOnly={!poNumberEditable}
                  value={form.poNumber}
                  onChange={(e) => patch("poNumber", e.target.value)}
                  placeholder={isShopPo ? "Enter PO number…" : "Assigned from job"}
                  className={`${FIELD_INPUT} font-semibold tabular-nums ${poNumberEditable ? "" : "!bg-muted"}`}
                  disabled={saving}
                />
              )}
            </FieldRow>
            <FieldRow
              label="Vendor"
              labelWidth="100%"
              labelClassName="!text-left"
              className="min-w-[14rem] flex-1 flex-col items-stretch gap-1"
              controlClassName="w-full min-w-0"
            >
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SimpleSelect
                    options={vendorOptions}
                    value={form.vendorId}
                    onChange={(e) => patch("vendorId", e.target.value)}
                    placeholder={loadingMeta ? "Loading…" : "Select vendor…"}
                    disabled={loadingMeta || saving}
                    searchable
                    aria-label="Vendor"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-border bg-primary text-white hover:opacity-90 disabled:opacity-60"
                  title="Add new vendor"
                  aria-label="Add new vendor"
                  onClick={() => {
                    setVendorForm(INITIAL_VENDOR_FORM);
                    setAddVendorOpen(true);
                  }}
                  disabled={saving}
                >
                  <FiPlus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </FieldRow>
            <FieldRow
              label="PO Date"
              labelWidth="100%"
              labelClassName="!text-left"
              className="w-[10.25rem] shrink-0 flex-col items-stretch gap-1"
              controlClassName="w-full min-w-0"
            >
              <input
                type="date"
                value={form.poCutDate}
                onChange={(e) => patch("poCutDate", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
              />
            </FieldRow>
            <FieldRow
              label="Due Date"
              labelWidth="100%"
              labelClassName="!text-left"
              className="w-[10.25rem] shrink-0 flex-col items-stretch gap-1"
              controlClassName="w-full min-w-0"
            >
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => patch("dueDate", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
              />
            </FieldRow>
          </div>

          <Tabs
            value={isViewMode ? activeTab : TAB_PO}
            onChange={setActiveTab}
            className="flex min-h-0 flex-1 flex-col"
            listClassName={isViewMode ? "shrink-0" : "hidden"}
            panelClassName={`flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto ${isViewMode ? "pt-3" : ""}`}
            ariaLabel="Purchase order sections"
            tabs={[
              {
                id: TAB_PO,
                label: "Purchase Order",
                children: (
                  <>
                    <div className={`shrink-0 overflow-auto border border-border ${TABLE_SCROLL_MAX_CLASS}`}>
                      <table className="w-full min-w-[52rem] border-collapse border-spacing-0 text-xs">
                        <thead className="sticky top-0 z-[1] bg-[color-mix(in_srgb,hsl(var(--primary))_4%,hsl(var(--card)))] text-title">
                          <tr className="border-b-2 border-border">
                            <th className="border-r border-border px-1 py-1 text-left font-semibold">Item Name</th>
                            <th className="w-20 border-r border-border px-1 py-1 text-left font-semibold">UOM</th>
                            <th className="w-20 border-r border-border px-1 py-1 text-right font-semibold">Quantity</th>
                            <th className="w-24 border-r border-border px-1 py-1 text-right font-semibold">Price</th>
                            <th className="w-24 border-r border-border px-1 py-1 text-right font-semibold">Total</th>
                            <th className="w-16 border-r border-border px-1 py-1 text-right font-semibold">Tax%</th>
                            <th className="w-24 border-r border-border px-1 py-1 text-right font-semibold">Tax Amount</th>
                            <th className="w-28 border-r border-border px-1 py-1 text-right font-semibold">Grand Total</th>
                            <th className="w-7 p-0.5 text-left font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {(form.lineItems || []).map((line, idx) => {
                            const t = computePoLineTotals(line);
                            const canRemove =
                              (form.lineItems || []).length > 1 &&
                              (idx < (form.lineItems || []).length - 1 || lineHasContent(line));
                            return (
                              <tr key={line.id} className="border-t border-border bg-card">
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    value={line.itemName}
                                    onChange={(e) => patchLine(line.id, "itemName", e.target.value)}
                                    className={CELL_INPUT}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    value={line.uom}
                                    onChange={(e) => patchLine(line.id, "uom", e.target.value)}
                                    className={CELL_INPUT}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={line.quantity}
                                    onChange={(e) => patchLine(line.id, "quantity", e.target.value)}
                                    className={`${CELL_INPUT} text-right tabular-nums`}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={line.price}
                                    onChange={(e) => patchLine(line.id, "price", e.target.value)}
                                    className={`${CELL_INPUT} text-right tabular-nums`}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    readOnly
                                    value={formatMoney(t.total)}
                                    className={`${CELL_INPUT_MUTED} text-right tabular-nums`}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={line.taxPercent}
                                    onChange={(e) => patchLine(line.id, "taxPercent", e.target.value)}
                                    className={`${CELL_INPUT} text-right tabular-nums`}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    readOnly
                                    value={formatMoney(t.taxAmount)}
                                    className={`${CELL_INPUT_MUTED} text-right tabular-nums`}
                                  />
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    readOnly
                                    value={formatMoney(t.grandTotal)}
                                    className={`${CELL_INPUT_MUTED} text-right font-semibold tabular-nums`}
                                  />
                                </td>
                                <td className="p-0 text-center">
                                  {canRemove ? (
                                    <button
                                      type="button"
                                      className="rounded-none p-0.5 text-danger hover:bg-danger/10"
                                      title="Remove line"
                                      aria-label="Remove line"
                                      onClick={() => removeLine(line.id)}
                                      disabled={saving}
                                    >
                                      <FiX className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  ) : null}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border pt-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                        <div className="min-w-0 flex-1 rounded-none border border-border bg-primary/[0.04] px-3 py-2 dark:bg-primary/10">
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary">
                            Vendor
                          </p>
                          {selectedVendor ? (
                            <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                              <p className="min-w-0">
                                <span className="text-secondary">Term: </span>
                                <span className="font-semibold text-title">
                                  {selectedVendor.paymentTerms || "-"}
                                </span>
                              </p>
                              <p className="min-w-0">
                                <span className="text-secondary">Contact: </span>
                                <span className="font-semibold text-title">
                                  {selectedVendor.contactName || "-"}
                                </span>
                              </p>
                              <p className="min-w-0">
                                <span className="text-secondary">Phone: </span>
                                <span className="font-semibold text-title">
                                  {selectedVendor.phone || "-"}
                                </span>
                              </p>
                              <p className="min-w-0">
                                <span className="text-secondary">Email: </span>
                                <span className="font-semibold text-title">
                                  {selectedVendor.email || "-"}
                                </span>
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-secondary">Select a vendor to view details.</p>
                          )}
                        </div>
                        <div className="grid w-full grid-cols-1 gap-2 sm:max-w-sm sm:shrink-0">
                          <FieldRow label="Total" labelWidth="7.5rem" controlClassName="min-w-0 flex-1">
                            <input
                              type="text"
                              readOnly
                              value={formatMoney(totals.total)}
                              className={`${FIELD_INPUT} !bg-muted text-right font-semibold tabular-nums`}
                            />
                          </FieldRow>
                          <FieldRow label="Total Tax Amount" labelWidth="7.5rem" controlClassName="min-w-0 flex-1">
                            <input
                              type="text"
                              readOnly
                              value={formatMoney(totals.totalTax)}
                              className={`${FIELD_INPUT} !bg-muted text-right tabular-nums`}
                            />
                          </FieldRow>
                          <FieldRow label="Shipping Charge" labelWidth="7.5rem" controlClassName="min-w-0 flex-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={form.shippingCharge}
                              onChange={(e) => patch("shippingCharge", sanitizePoNumericInput(e.target.value))}
                              className={`${FIELD_INPUT} text-right tabular-nums`}
                              placeholder="0.00"
                              disabled={saving}
                              aria-label="Shipping Charge"
                            />
                          </FieldRow>
                          <FieldRow label="Grand Total" labelWidth="7.5rem" controlClassName="min-w-0 flex-1">
                            <input
                              type="text"
                              readOnly
                              value={formatMoney(totals.grandTotal)}
                              className={`${FIELD_INPUT} !bg-muted text-right font-bold tabular-nums`}
                            />
                          </FieldRow>
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs font-bold text-title">Comments</span>
                        <textarea
                          rows={3}
                          value={form.comments}
                          onChange={(e) => patch("comments", e.target.value)}
                          className={FIELD_TEXTAREA}
                          disabled={saving}
                        />
                      </div>
                    </div>
                  </>
                ),
              },
              {
                id: TAB_RECEIVING,
                label: "Material Receiving",
                children: (
                  <>
                    {contentLines.length === 0 ? (
                      <p className="text-sm text-secondary">Add line items on the Purchase Order tab first.</p>
                    ) : (
                      <div className={`shrink-0 overflow-auto border border-border ${TABLE_SCROLL_MAX_CLASS}`}>
                        <table className="w-full min-w-[48rem] border-collapse border-spacing-0 text-xs">
                          <thead className="sticky top-0 z-[1] bg-[color-mix(in_srgb,hsl(var(--primary))_4%,hsl(var(--card)))] text-title">
                            <tr className="border-b-2 border-border">
                              <th className="border-r border-border px-1 py-1 text-left font-semibold">Item Name</th>
                              <th className="w-20 border-r border-border px-1 py-1 text-left font-semibold">UOM</th>
                              <th className="w-24 border-r border-border px-1 py-1 text-right font-semibold">Ordered Qty</th>
                              <th className="w-24 border-r border-border px-1 py-1 text-right font-semibold">Received Qty</th>
                              <th className="w-40 border-r border-border px-1 py-1 text-left font-semibold">Receiving Status</th>
                              <th className="w-36 px-1 py-1 text-left font-semibold">Received Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contentLines.map((line) => (
                              <tr key={line.id} className="border-t border-border bg-card">
                                <td className="border-r border-border px-1 py-1 text-title">{line.itemName || "—"}</td>
                                <td className="border-r border-border px-1 py-1 text-title">{line.uom || "—"}</td>
                                <td className="border-r border-border px-1 py-1 text-right tabular-nums text-title">
                                  {line.quantity || "0"}
                                </td>
                                <td className="border-r border-border p-0">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={line.receivedQty ?? "0"}
                                    onChange={(e) => patchLine(line.id, "receivedQty", e.target.value)}
                                    className={`${CELL_INPUT} text-right tabular-nums`}
                                    disabled={saving}
                                  />
                                </td>
                                <td className="border-r border-border px-1 py-0.5">
                                  <SimpleSelect
                                    options={SIMPLE_PO_RECEIVING_STATUS_OPTIONS}
                                    value={line.receivingStatus || "Ordered"}
                                    onChange={(e) => patchLine(line.id, "receivingStatus", e.target.value)}
                                    disabled={saving}
                                    aria-label={`Receiving status for ${line.itemName || "line"}`}
                                  />
                                </td>
                                <td className="p-0">
                                  <input
                                    type="date"
                                    value={String(line.receivedDate || "").slice(0, 10)}
                                    onChange={(e) => patchLine(line.id, "receivedDate", e.target.value)}
                                    className={CELL_INPUT}
                                    disabled={saving}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ),
              },
              {
                id: TAB_PAYMENT,
                label: "Payment",
                children: (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-sm text-secondary">
                        Grand Total:{" "}
                        <span className="text-base font-bold text-title">
                          {formatMoney(paymentSummary.grandTotal)}
                        </span>
                      </div>
                      <div className="text-sm text-secondary">
                        Amount Paid:{" "}
                        <span className="text-base font-bold text-title">
                          {formatMoney(paymentSummary.amountPaid)}
                        </span>
                      </div>
                      <div className="text-sm text-secondary">
                        Balance:{" "}
                        <span className="text-base font-bold text-title">
                          {formatMoney(paymentSummary.balance)}
                        </span>
                      </div>
                      <Badge
                        variant={paymentStatusBadgeVariant(paymentSummary.paymentStatus)}
                        className="rounded-full px-3 py-1 text-sm"
                      >
                        {paymentSummary.paymentStatus}
                      </Badge>
                    </div>

                    <div className="rounded-sm border border-border p-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">Record payment</p>
                      <div className="flex flex-wrap items-end gap-2">
                        <FieldRow label="Date" labelWidth="3rem" className="w-[11rem] shrink-0" controlClassName="min-w-0 flex-1">
                          <input
                            type="date"
                            value={paymentDraft.date}
                            onChange={(e) => setPaymentDraft((d) => ({ ...d, date: e.target.value }))}
                            className={FIELD_INPUT}
                            disabled={saving}
                          />
                        </FieldRow>
                        <FieldRow label="Amount" labelWidth="3.5rem" className="w-[10rem] shrink-0" controlClassName="min-w-0 flex-1">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={paymentDraft.amount}
                            onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))}
                            className={`${FIELD_INPUT} text-right tabular-nums`}
                            disabled={saving}
                          />
                        </FieldRow>
                        <FieldRow label="Method" labelWidth="3.5rem" className="w-[11rem] shrink-0" controlClassName="min-w-0 flex-1">
                          <SimpleSelect
                            options={SIMPLE_PO_PAYMENT_METHOD_OPTIONS}
                            value={paymentDraft.method}
                            onChange={(e) => setPaymentDraft((d) => ({ ...d, method: e.target.value }))}
                            placeholder="Select…"
                            disabled={saving}
                            aria-label="Payment method"
                          />
                        </FieldRow>
                        <FieldRow label="Paid By" labelWidth="3.75rem" className="min-w-[12rem] flex-1" controlClassName="min-w-0 flex-1">
                          <SimpleSelect
                            options={paidByOptions}
                            value={paymentDraft.paidBy}
                            onChange={(e) => setPaymentDraft((d) => ({ ...d, paidBy: e.target.value }))}
                            placeholder={loadingMeta ? "Loading…" : "Select…"}
                            disabled={loadingMeta || saving}
                            searchable
                            aria-label="Paid by"
                          />
                        </FieldRow>
                        <FieldRow label="Notes" labelWidth="3rem" className="min-w-[12rem] flex-1" controlClassName="min-w-0 flex-1">
                          <input
                            type="text"
                            value={paymentDraft.notes}
                            onChange={(e) => setPaymentDraft((d) => ({ ...d, notes: e.target.value }))}
                            className={FIELD_INPUT}
                            disabled={saving}
                          />
                        </FieldRow>
                        <Button type="button" variant="primary" size="sm" onClick={handleAddPayment} disabled={saving}>
                          Add Payment Record
                        </Button>
                      </div>
                    </div>

                    <div className={`overflow-auto border border-border ${TABLE_SCROLL_MAX_CLASS}`}>
                      <table className="w-full min-w-[44rem] border-collapse text-xs">
                        <thead className="sticky top-0 z-[1] bg-[color-mix(in_srgb,hsl(var(--primary))_4%,hsl(var(--card)))] text-title">
                          <tr className="border-b-2 border-border">
                            <th className="w-12 border-r border-border px-1 py-1 text-left font-semibold">Actions</th>
                            <th className="border-r border-border px-1 py-1 text-left font-semibold">Date</th>
                            <th className="border-r border-border px-1 py-1 text-right font-semibold">Amount</th>
                            <th className="border-r border-border px-1 py-1 text-left font-semibold">Method</th>
                            <th className="border-r border-border px-1 py-1 text-left font-semibold">Paid By</th>
                            <th className="border-r border-border px-1 py-1 text-left font-semibold">Notes</th>
                            <th className="w-10 px-1 py-1 text-left font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {(form.payments || []).length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-2 py-4 text-center text-secondary">
                                No payments recorded yet.
                              </td>
                            </tr>
                          ) : (
                            (form.payments || []).map((p) => {
                              const paidByLabel =
                                paidByOptions.find((o) => o.value === p.paidBy)?.label || p.paidBy || "—";
                              return (
                                <tr key={p.id} className="border-t border-border bg-card">
                                  <td className="border-r border-border px-1 py-0.5 text-center">
                                    <button
                                      type="button"
                                      className="rounded p-0.5 text-primary hover:bg-primary/10"
                                      title="Edit payment"
                                      aria-label="Edit payment"
                                      onClick={() => openEditPayment(p)}
                                      disabled={saving}
                                    >
                                      <FiEdit2 className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </td>
                                  <td className="border-r border-border px-1 py-1 text-title">
                                    {p.date ? formatDate(p.date) : "—"}
                                  </td>
                                  <td className="border-r border-border px-1 py-1 text-right font-semibold tabular-nums text-title">
                                    {formatMoney(parsePoMoney(p.amount))}
                                  </td>
                                  <td className="border-r border-border px-1 py-1 text-title">{p.method || "—"}</td>
                                  <td className="border-r border-border px-1 py-1 text-title">{paidByLabel}</td>
                                  <td className="border-r border-border px-1 py-1 text-title">{p.notes || "—"}</td>
                                  <td className="px-1 py-0.5 text-center">
                                    <button
                                      type="button"
                                      className="rounded p-0.5 text-danger hover:bg-danger/10"
                                      title="Delete payment"
                                      aria-label="Delete payment"
                                      onClick={() => handleDeletePayment(p.id)}
                                      disabled={saving}
                                    >
                                      <FiX className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-[calc(8*2rem)] flex flex-col gap-2">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="inline-flex items-center gap-1.5"
                          disabled={!String(form.id || "").trim() || saving}
                          title={
                            String(form.id || "").trim()
                              ? "Add vendor invoices and documents"
                              : "Save the purchase order before adding attachments"
                          }
                          onClick={() => setAttachmentsOpen(true)}
                        >
                          <FiPaperclip className="h-4 w-4 shrink-0" aria-hidden />
                          Add Attachments
                        </Button>
                      </div>
                    <div className="overflow-auto border border-border">
                      <table className="w-full border-collapse text-xs">
                        <thead>
                          <tr className="border-b-2 border-border bg-primary/[0.04] text-title">
                            <th className="w-16 px-1 py-1 text-left font-semibold">Actions</th>
                            <th className="px-1 py-1 text-left font-semibold">Vendor invoices & documents</th>
                            <th className="w-10 px-1 py-1 text-left font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {(form.vendorDocuments || []).length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-2 py-3 text-center text-secondary">
                                No vendor documents yet. Use Add Attachments after saving.
                              </td>
                            </tr>
                          ) : (
                            (form.vendorDocuments || []).map((doc, i) => {
                              const href = String(doc.url || "").startsWith("http")
                                ? doc.url
                                : doc.url?.startsWith("/")
                                  ? doc.url
                                  : `/${doc.url || ""}`;
                              return (
                                <tr key={`${doc.url}-${i}`} className="border-t border-border bg-card">
                                  <td className="px-1 py-0.5">
                                    <div className="flex items-center gap-0.5">
                                      <button
                                        type="button"
                                        className="rounded p-0.5 text-primary hover:bg-primary/10"
                                        title="View"
                                        aria-label="View"
                                        onClick={() => href && window.open(href, "_blank", "noopener,noreferrer")}
                                      >
                                        <FiEye className="h-3.5 w-3.5" aria-hidden />
                                      </button>
                                      <a
                                        href={href || "#"}
                                        download={doc.name || "attachment"}
                                        className="rounded p-0.5 text-primary hover:bg-primary/10"
                                        title="Download"
                                        aria-label="Download"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <FiDownload className="h-3.5 w-3.5" aria-hidden />
                                      </a>
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 text-title">{doc.name || doc.url || "—"}</td>
                                  <td className="px-1 py-0.5 text-center">
                                    <button
                                      type="button"
                                      className="rounded p-0.5 text-danger hover:bg-danger/10"
                                      title="Delete"
                                      aria-label="Delete"
                                      disabled={saving || !form.id}
                                      onClick={() => handleDeleteVendorDocument(doc)}
                                    >
                                      <FiX className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </Form>
        </div>
      </Modal>

      <SimplePurchaseOrderAttachmentsModal
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        recordId={form.id}
        documents={form.vendorDocuments || []}
        onAttached={(_att, next) => setForm((f) => ({ ...f, vendorDocuments: next }))}
      />

      <Modal
        open={addVendorOpen}
        onClose={() => !savingVendor && setAddVendorOpen(false)}
        title="Add Vendor"
        size="4xl"
        width="min(900px, 96vw)"
        height="min(84vh, 820px)"
        showClose={!savingVendor}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form={ADD_VENDOR_FORM_ID} variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={ADD_VENDOR_FORM_ID}
          onSubmit={handleAddVendor}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <SimpleVendorFormFields form={vendorForm} setForm={setVendorForm} disabled={savingVendor} />
        </Form>
      </Modal>

      <Modal
        open={Boolean(editPayment)}
        onClose={() => setEditPayment(null)}
        title="Edit payment record"
        size="md"
        width="min(32rem, 96vw)"
        closeOnOutsideClick={false}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditPayment(null)}>
              Cancel
            </Button>
            <Button type="submit" form={EDIT_PAYMENT_FORM_ID} variant="primary" size="sm">
              Save
            </Button>
          </>
        }
      >
        {editPayment ? (
          <Form
            id={EDIT_PAYMENT_FORM_ID}
            onSubmit={handleSaveEditedPayment}
            className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          >
            <FieldRow label="Date" labelWidth="6.5rem">
              <input
                type="date"
                value={editPayment.date}
                onChange={(e) => setEditPayment((d) => ({ ...d, date: e.target.value }))}
                className={FIELD_INPUT}
              />
            </FieldRow>
            <FieldRow label="Amount" labelWidth="6.5rem">
              <input
                type="text"
                inputMode="decimal"
                value={editPayment.amount}
                onChange={(e) => setEditPayment((d) => ({ ...d, amount: e.target.value }))}
                className={`${FIELD_INPUT} text-right tabular-nums`}
              />
            </FieldRow>
            <FieldRow label="Method" labelWidth="6.5rem">
              <SimpleSelect
                options={SIMPLE_PO_PAYMENT_METHOD_OPTIONS}
                value={editPayment.method}
                onChange={(e) => setEditPayment((d) => ({ ...d, method: e.target.value }))}
                placeholder="Select…"
                aria-label="Payment method"
              />
            </FieldRow>
            <FieldRow label="Paid By" labelWidth="6.5rem">
              <SimpleSelect
                options={paidByOptions}
                value={editPayment.paidBy}
                onChange={(e) => setEditPayment((d) => ({ ...d, paidBy: e.target.value }))}
                placeholder={loadingMeta ? "Loading…" : "Select…"}
                disabled={loadingMeta}
                searchable
                aria-label="Paid by"
              />
            </FieldRow>
            <FieldRow label="Notes" labelWidth="6.5rem">
              <input
                type="text"
                value={editPayment.notes}
                onChange={(e) => setEditPayment((d) => ({ ...d, notes: e.target.value }))}
                className={FIELD_INPUT}
              />
            </FieldRow>
          </Form>
        ) : null}
      </Modal>

      <SimplePurchaseOrderPrintPreviewModal
        open={printOpen}
        onClose={() => {
          setPrintOpen(false);
          setPrintPo(null);
          setPrintVendor(null);
          setPrintSendMeta(null);
        }}
        po={printPo}
        vendor={printVendor}
        sendMeta={printSendMeta}
        title={
          printPo?.poNumber
            ? `Purchase order ${printPo.poNumber}`
            : "Purchase order print preview"
        }
      />
    </>
  );
}
