"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import SimpleSelect from "@/components/simple/simple-select";
import { Form } from "@/components/ui/form-layout";
import SimpleCustomerFormFields from "@/components/simple/simple-customer-form-fields";
import SimpleDatasheetModal from "@/components/simple/simple-datasheet-modal";
import SimpleServiceProposalAttachmentsModal from "@/components/simple/simple-service-proposal-attachments-modal";
import SimpleServiceProposalPrintPreviewModal from "@/components/simple/simple-service-proposal-print-preview-modal";
import SalesCommissionCreateModal from "@/components/dashboard/sales-commission-create-modal";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  buildCustomerPayload,
  INITIAL_CUSTOMER_FORM,
} from "@/lib/customer-record-form";
import {
  invoiceStatusSelectOptionsFromMerged,
  quoteStatusSelectOptionsFromMerged,
  buildCombinedQuoteInvoiceStatusOptions,
  workOrderStatusSelectOptionsFromMerged,
  resolveQuoteInvoiceStatusDisplayLabel,
} from "@/lib/dropdown-catalog";
import { buildEmployeeSelectOptions } from "@/lib/technician-select-options";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import {
  buildSimpleServiceProposalPrintBundle,
  PRINT_NOTES_CUSTOMER,
  PRINT_NOTES_INTERNAL,
} from "@/lib/simple-service-proposal-print";
import {
  createEmptyServiceProposalForm,
  emptyOtherLine,
  emptyScopeLine,
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
  cloneServiceProposalAsNewRfq,
  recordTypeDisplayTitle,
  recordTypeDocumentLabel,
  resolveRecordTypeOnSave,
  sumLinePrices,
} from "@/lib/simple-service-proposal-form";
import {
  buildAcDatasheetFromProposal,
  buildDcDatasheetFromProposal,
  datasheetHasData,
} from "@/lib/simple-datasheet-form";
import { listSimplePurchaseOrdersForJob } from "@/lib/simple-purchase-order-form";

const FORM_ID = "simple-service-proposal-form";
const ADD_CUSTOMER_FORM_ID = "simple-sp-add-customer-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 flex-1 resize-y rounded-sm border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-sm px-2.5 text-xs font-semibold";
/** Line-item cells: square corners, flush packing (matches PO form tables). */
const CELL_INPUT =
  "h-7 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-xs text-title outline-none focus:bg-primary/[0.06] focus:ring-1 focus:ring-inset focus:ring-primary dark:focus:bg-primary/10 dark:text-title";
const CELL_INPUT_MUTED = `${CELL_INPUT} !bg-muted/40`;

const MOTOR_FIELDS = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "hpKw", label: "HP/KW" },
  { key: "frameType", label: "Frame/Type" },
  { key: "modelNumber", label: "Model#" },
  { key: "volts", label: "Volts" },
  { key: "amps", label: "AMPS" },
  { key: "rpm", label: "RPM" },
  { key: "sl", label: "SL" },
  { key: "cl", label: "CL" },
  { key: "cd", label: "CD" },
  { key: "bars", label: "BARS" },
  { key: "motorPaint", label: "Motor Paint" },
];

const QUOTE_TYPE_OPTIONS = [
  { value: "Phone", label: "Phone" },
  { value: "Email", label: "Email" },
  { value: "Walk-in", label: "Walk-in" },
  { value: "Other", label: "Other" },
];

function FieldRow({ label, labelWidth = "7.5rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={`${FIELD_LABEL}`} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

function lineHasContent(line, { withUom = false } = {}) {
  return Boolean(
    String(line?.description ?? "").trim() ||
      String(line?.price ?? "").trim() ||
      (withUom && String(line?.uom ?? "").trim())
  );
}

function LineItemsTable({ title, lines, onChange, totalLabel, formatMoney }) {
  const total = sumLinePrices(lines);
  const isOther = title.toLowerCase().includes("other");
  const newEmptyLine = () => (isOther ? emptyOtherLine() : emptyScopeLine());

  const ensureTrailingEmpty = (rows) => {
    const list = Array.isArray(rows) ? [...rows] : [];
    let lastFilled = -1;
    for (let i = 0; i < list.length; i++) {
      if (lineHasContent(list[i], { withUom: isOther })) lastFilled = i;
    }
    const kept = lastFilled >= 0 ? list.slice(0, lastFilled + 1) : [];
    const trailing = list.slice(lastFilled + 1).filter((row) => !lineHasContent(row, { withUom: isOther }));
    const emptyRow = trailing[0] || newEmptyLine();
    return [...kept, emptyRow];
  };

  const updateLine = (id, patch) => {
    const next = lines.map((line) => (line.id === id ? { ...line, ...patch } : line));
    onChange(ensureTrailingEmpty(next));
  };

  const removeLine = (id) => {
    const target = lines.find((line) => line.id === id);
    if (
      target &&
      !lineHasContent(target, { withUom: isOther }) &&
      lines.filter((l) => !lineHasContent(l, { withUom: isOther })).length <= 1
    ) {
      return;
    }
    onChange(ensureTrailingEmpty(lines.filter((line) => line.id !== id)));
  };

  return (
    <div className="flex min-h-[16rem] min-w-0 flex-1 flex-col border border-border bg-card">
      <div className="mt-[10px] flex items-center gap-2 bg-transparent px-2 py-1">
        <h4 className="text-xs font-bold uppercase tracking-wide text-black dark:text-title">{title}</h4>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse border-spacing-0 text-xs">
          <thead>
            <tr className="bg-primary text-left text-xs text-white">
              <th className="border-r border-primary/30 px-1 py-1 font-semibold">Description</th>
              {isOther ? (
                <th className="w-20 border-r border-primary/30 px-1 py-1 font-semibold">UOM</th>
              ) : null}
              <th className="w-28 border-r border-primary/30 px-1 py-1 font-semibold">Price</th>
              <th className="w-7 p-0.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const isBlankTrail = !lineHasContent(line, { withUom: isOther }) && idx === lines.length - 1;
              return (
                <tr key={line.id} className="border-t border-border bg-card">
                  <td className="border-r border-border p-0">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, { description: e.target.value })}
                      className={CELL_INPUT}
                    />
                  </td>
                  {isOther ? (
                    <td className="border-r border-border p-0">
                      <input
                        type="text"
                        value={line.uom ?? ""}
                        onChange={(e) => updateLine(line.id, { uom: e.target.value })}
                        className={CELL_INPUT}
                        aria-label="UOM"
                      />
                    </td>
                  ) : null}
                  <td className="border-r border-border p-0">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={line.price}
                      onChange={(e) => updateLine(line.id, { price: e.target.value })}
                      className={`${CELL_INPUT} text-right tabular-nums`}
                    />
                  </td>
                  <td className="p-0 text-center">
                    {!isBlankTrail ? (
                      <button
                        type="button"
                        className="rounded-none p-0.5 text-danger hover:bg-danger/10"
                        title="Remove line"
                        aria-label="Remove line"
                        onClick={() => removeLine(line.id)}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border bg-muted/40 px-1 py-0.5 text-xs">
        <span className="font-bold text-title">{totalLabel}</span>
        <input
          readOnly
          value={formatMoney(total)}
          className={`${CELL_INPUT_MUTED} !h-7 !w-32 text-right font-semibold tabular-nums`}
        />
      </div>
    </div>
  );
}

/**
 * Create/edit Service Proposal modal — dense layout matching legacy screenshot.
 */
export default function ServiceProposalFormModal({
  open,
  onClose,
  onSave,
  onAttachmentsChange,
  initialForm = null,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const [form, setForm] = useState(() => createEmptyServiceProposalForm());
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [purchaseOrderOpen, setPurchaseOrderOpen] = useState(false);
  const [purchaseOrderMode, setPurchaseOrderMode] = useState("create");
  const [printOpen, setPrintOpen] = useState(false);
  const [printBundle, setPrintBundle] = useState(null);
  const [printSendMeta, setPrintSendMeta] = useState(null);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(INITIAL_CUSTOMER_FORM);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [datasheetOpen, setDatasheetOpen] = useState(false);

  const formatMoney = useCallback((n) => {
    const value = Number.isFinite(n) ? n : 0;
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  const jobStatusOptions = useMemo(
    () => workOrderStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );

  const statusOptions = useMemo(
    () => buildCombinedQuoteInvoiceStatusOptions(mergedSettings),
    [mergedSettings]
  );

  const invoiceStatusValues = useMemo(() => {
    return new Set(
      invoiceStatusSelectOptionsFromMerged(mergedSettings).map((o) => String(o.value || "").trim().toLowerCase())
    );
  }, [mergedSettings]);

  const quoteStatusValues = useMemo(() => {
    return new Set(
      quoteStatusSelectOptionsFromMerged(mergedSettings).map((o) => String(o.value || "").trim().toLowerCase())
    );
  }, [mergedSettings]);

  const customerOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.companyName || c.primaryContactName || c.id,
      })),
    [customers]
  );

  const preparedByOptions = useMemo(
    () => buildEmployeeSelectOptions(employees, form.preparedBy),
    [employees, form.preparedBy]
  );

  const approvedByOptions = useMemo(
    () => buildEmployeeSelectOptions(employees, form.proposalApprovedBy),
    [employees, form.proposalApprovedBy]
  );

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
      setCustomers(Array.isArray(list) ? list : []);
    } catch {
      void alert({ title: "Error", message: "Failed to load customers.", variant: "danger" });
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [alert]);

  const loadEmployees = useCallback(async () => {
    setLoadingEmployees(true);
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/employees");
      setEmployees(Array.isArray(list) ? list : []);
    } catch {
      void alert({ title: "Error", message: "Failed to load employees.", variant: "danger" });
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  }, [alert]);

  useEffect(() => {
    if (!open) return;
    setForm(initialForm ? { ...createEmptyServiceProposalForm(), ...initialForm } : createEmptyServiceProposalForm());
    setAttachmentsOpen(false);
    setCommissionOpen(false);
    setDatasheetOpen(false);
    loadCustomers();
    loadEmployees();
    // Only reset when opening / switching records. Do not depend on loadCustomers/loadEmployees —
    // stable callbacks keep nested modals open (e.g. after attachment delete).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key on open + record id
  }, [open, initialForm?.id]);

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleMotorTypeChange = async (nextType) => {
    const next = String(nextType || "").toUpperCase() === "DC" ? "DC" : "AC";
    if (form.motorPower === next) return;
    const otherType = next === "AC" ? "DC" : "AC";
    const otherSheet = otherType === "AC" ? form.acDatasheet : form.dcDatasheet;
    if (datasheetHasData(otherSheet, otherType)) {
      const ok = await confirm({
        title: `Switch to ${next}?`,
        message: `This will delete all ${otherType} datasheet data for this job. Do you want to continue?`,
        confirmLabel: "Continue",
        variant: "danger",
      });
      if (!ok) return;
      setForm((f) => ({
        ...f,
        motorPower: next,
        acDatasheet: otherType === "AC" ? null : f.acDatasheet,
        dcDatasheet: otherType === "DC" ? null : f.dcDatasheet,
      }));
      return;
    }
    patch("motorPower", next);
  };

  const openDatasheet = () => {
    if (form.recordType === RECORD_TYPE_RFQ) return;
    setDatasheetOpen(true);
  };

  const handleDatasheetSave = (sheet) => {
    const isDc = String(form.motorPower || "AC").toUpperCase() === "DC";
    setForm((f) => ({
      ...f,
      ...(isDc ? { dcDatasheet: { ...sheet } } : { acDatasheet: { ...sheet } }),
    }));
  };

  const handleCustomerChange = (customerId) => {
    const c = customers.find((row) => row.id === customerId);
    const taxExempt = c?.taxExempt !== false;
    setForm((f) => ({
      ...f,
      customerId,
      customerEmail: c?.email || "",
      customerPhone: c?.phone || "",
      customerTaxExempt: taxExempt,
      taxPercent: taxExempt ? "" : String(c?.taxPercent ?? ""),
    }));
  };

  const openAddCustomer = () => {
    setNewCustomerForm({ ...INITIAL_CUSTOMER_FORM });
    setAddCustomerOpen(true);
  };

  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomerForm.companyName?.trim()) {
      await alert({ title: "Error", message: "Company name is required.", variant: "danger" });
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(newCustomerForm)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      const saved = data.customer;
      const id = saved?.id;
      if (!id) throw new Error("Invalid response");
      await loadCustomers();
      setForm((f) => ({
        ...f,
        customerId: id,
        customerEmail: saved.email || "",
        customerPhone: saved.phone || "",
        customerTaxExempt: saved.taxExempt !== false,
        taxPercent: saved.taxExempt !== false ? "" : String(saved.taxPercent ?? ""),
      }));
      setAddCustomerOpen(false);
      await alert({ title: "Success", message: "Customer added and selected." });
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed to create customer", variant: "danger" });
    } finally {
      setSavingCustomer(false);
    }
  };

  const recordId = String(form.id || "").trim();
  const jobNumber = String(form.documentNumber || "").trim();
  const canAttach = Boolean(recordId);
  const canAddCommission = Boolean(recordId);
  const canCreatePurchaseOrder = Boolean(recordId && jobNumber);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form.customerId) || null,
    [customers, form.customerId]
  );

  const datasheetInitial = useMemo(() => {
    const companyName =
      selectedCustomer?.companyName || selectedCustomer?.primaryContactName || "";
    const meta = { companyName, technicianLabel: form.preparedBy || "" };
    if (String(form.motorPower || "AC").toUpperCase() === "DC") {
      return buildDcDatasheetFromProposal(form, meta);
    }
    return buildAcDatasheetFromProposal(form, meta);
  }, [form, selectedCustomer]);

  const commissionPreset = useMemo(() => {
    if (!recordId) return null;
    const rfqNumber = String(form.documentNumber || "").trim() || recordId;
    const statusValue = String(form.status || form.jobStatus || "").trim();
    return {
      quoteId: recordId,
      rfqNumber,
      customerName:
        selectedCustomer?.companyName ||
        selectedCustomer?.primaryContactName ||
        "—",
      jobStatus: statusValue || "—",
      statusLabel: resolveQuoteInvoiceStatusDisplayLabel(statusValue, mergedSettings),
    };
  }, [
    recordId,
    form.documentNumber,
    form.status,
    form.jobStatus,
    selectedCustomer,
    mergedSettings,
  ]);

  const saveForm = async (nextForm, { successMessage = "Service proposal saved." } = {}) => {
    const payload = nextForm || form;
    if (!payload.customerId) {
      await alert({ title: "Error", message: "Select a customer.", variant: "danger" });
      return null;
    }
    setSaving(true);
    try {
      const recordType = resolveRecordTypeOnSave(
        payload.recordType,
        payload.status,
        invoiceStatusValues,
        quoteStatusValues
      );
      const withType = { ...payload, recordType };
      const saved = await onSave?.(withType);
      const savedId = String(saved?.id || withType.id || "").trim();
      const merged = {
        ...withType,
        id: savedId || withType.id || "",
        documentNumber: saved?.documentNumber ?? withType.documentNumber,
        attachments: Array.isArray(saved?.attachments)
          ? saved.attachments
          : Array.isArray(withType.attachments)
            ? withType.attachments
            : [],
      };
      setForm((f) => ({
        ...f,
        ...merged,
        attachments: Array.isArray(saved?.attachments)
          ? saved.attachments
          : Array.isArray(f.attachments)
            ? f.attachments
            : merged.attachments,
      }));
      await alert({ title: "Saved", message: successMessage });
      return merged;
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Failed to save service proposal", variant: "danger" });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveForm(form);
  };

  const handleConvertRecordType = async (nextType) => {
    if (saving || copying) return;
    const next = String(nextType || "").toUpperCase();
    if (next !== RECORD_TYPE_JOB && next !== RECORD_TYPE_RFQ) return;
    if (form.recordType === next) return;
    await saveForm(
      { ...form, recordType: next },
      {
        successMessage:
          next === RECORD_TYPE_JOB
            ? "Converted to Job and saved."
            : "Converted to RFQ and saved.",
      }
    );
  };

  const handleAttached = (attachment, nextAttachments) => {
    setForm((f) => ({ ...f, attachments: nextAttachments }));
    if (recordId) onAttachmentsChange?.(recordId, nextAttachments);
  };

  const handleCopyCreateNew = async () => {
    if (!form.customerId) {
      await alert({ title: "Error", message: "Select a customer before copying.", variant: "danger" });
      return;
    }
    setCopying(true);
    try {
      const cloned = cloneServiceProposalAsNewRfq(form);
      const saved = await onSave?.(cloned, { forceNew: true });
      const savedId = String(saved?.id || "").trim();
      if (!savedId) throw new Error("Failed to create copied record");
      setForm({
        ...cloned,
        id: savedId,
        documentNumber: saved.documentNumber || "",
        recordType: RECORD_TYPE_RFQ,
        attachments: [],
      });
      setAttachmentsOpen(false);
      await alert({
        title: "Copied",
        message: `Copied as new RFQ${saved.documentNumber ? ` ${saved.documentNumber}` : ""}.`,
      });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Failed to copy record", variant: "danger" });
    } finally {
      setCopying(false);
    }
  };

  const openPrintPreview = async (notesMode) => {
    if (!form.customerId) {
      await alert({ title: "Error", message: "Select a customer before printing.", variant: "danger" });
      return;
    }
    const customer = customers.find((c) => c.id === form.customerId) || null;
    const bundle = buildSimpleServiceProposalPrintBundle({
      form,
      customer,
      employees,
      accountSettings: mergedSettings,
      user,
      notesMode,
    });
    const toEmail = String(customer?.email || form.customerEmail || "").trim();
    const toName = String(customer?.primaryContactName || customer?.companyName || "").trim();
    setPrintBundle(bundle);
    setPrintSendMeta({
      toEmail,
      toName,
      from: resolveOutboundFromPreview(mergedSettings, user?.shopName || ""),
      documentLabel: bundle.documentLabel,
      smtp: getWorkspaceSmtpDeliveryNotice(mergedSettings),
    });
    setPrintOpen(true);
  };

  const scopeTotal = sumLinePrices(form.scopeDetails);
  const otherTotal = sumLinePrices(form.otherItems);
  const totalAmount = scopeTotal + otherTotal;
  const showTax = form.customerTaxExempt === false;
  const taxPct = showTax
    ? Number.parseFloat(String(form.taxPercent ?? "").replace(/[^0-9.-]/g, ""))
    : 0;
  const taxAmount = showTax && Number.isFinite(taxPct) ? (scopeTotal * taxPct) / 100 : 0;
  const billingTotal = totalAmount + taxAmount;
  const displayTitle = recordTypeDisplayTitle(form.recordType);
  const docLabel = recordTypeDocumentLabel(form.recordType);

  const stubAction = (label) => () => void alert({ title: "Coming soon", message: `${label} — coming soon.` });

  const headerActions = (
    <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || copying}>
      {saving ? "Saving…" : "Save"}
    </Button>
  );

  return (
    <>
      <Modal
        open={open}
        onClose={() => !saving && !copying && onClose?.()}
        title={displayTitle}
        size="7xl"
        width="min(1260px, 98vw)"
        height="min(94vh, 920px)"
        showClose={!saving && !copying}
        closeOnOutsideClick={false}
        headerClassName="[&_h2]:max-w-none [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-wide sm:[&_h2]:max-w-none"
        actions={headerActions}
      >
        <div className="relative min-h-[12rem]">
          {copying ? (
            <div
              className="absolute inset-0 z-20 bg-card/80 backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="sticky top-[30%] flex flex-col items-center justify-center gap-2 py-8">
                <span
                  className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
                  aria-hidden
                />
                <span className="text-sm font-medium text-title">Copying…</span>
              </div>
            </div>
          ) : null}
          <Form
            id={FORM_ID}
            onSubmit={handleSubmit}
            className="!space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
            aria-hidden={copying || undefined}
          >
          {/* Toolbar (title lives in modal header) */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <div className="flex min-w-0 flex-wrap justify-start gap-1">
              <Button type="button" variant="primary" size="sm" className={TOOLBAR_BTN} onClick={stubAction("Calculator")}>
                Calculator
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={!canAddCommission || saving || copying}
                title={
                  canAddCommission ? "Add sales commission" : "Save the record before adding commission"
                }
                onClick={() => setCommissionOpen(true)}
              >
                Add Commission
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={saving || copying}
                onClick={handleCopyCreateNew}
              >
                {copying ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Copying…
                  </span>
                ) : (
                  "Copy & Create New"
                )}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={!canAttach}
                title={canAttach ? "Add attachments" : "Save the record before adding attachments"}
                onClick={() => setAttachmentsOpen(true)}
              >
                Add Attachments
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={saving || copying}
                onClick={() => openPrintPreview(PRINT_NOTES_INTERNAL)}
              >
                Internal Print
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={saving || copying}
                onClick={() => openPrintPreview(PRINT_NOTES_CUSTOMER)}
              >
                Customer Print
              </Button>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <Button type="button" variant="primary" size="sm" className={TOOLBAR_BTN} onClick={stubAction("Receiving")}>
                Receiving
              </Button>
              <Button type="button" variant="primary" size="sm" className={TOOLBAR_BTN} onClick={stubAction("Shipping")}>
                Shipping
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={!canCreatePurchaseOrder || saving || copying}
                title={
                  canCreatePurchaseOrder
                    ? "Create a new purchase order for this job"
                    : "Save the record (with JOB# / RFQ#) before creating a purchase order"
                }
                onClick={() => {
                  setPurchaseOrderMode("create");
                  setPurchaseOrderOpen(true);
                }}
              >
                Create New PO
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className={TOOLBAR_BTN}
                disabled={!canCreatePurchaseOrder || saving || copying}
                title={
                  canCreatePurchaseOrder
                    ? "View and edit purchase orders for this job"
                    : "Save the record (with JOB# / RFQ#) before viewing purchase orders"
                }
                onClick={async () => {
                  const list = listSimplePurchaseOrdersForJob(recordId, jobNumber);
                  if (!list.length) {
                    await alert({
                      title: "No purchase orders",
                      message: "No purchase orders yet for this job. Use Create New PO first.",
                    });
                    return;
                  }
                  setPurchaseOrderMode("view");
                  setPurchaseOrderOpen(true);
                }}
              >
                View POs
              </Button>
            </div>
          </div>

          {/* Three equal columns: customer/motor | notes | meta + status */}
          <div className="mb-2 grid grid-cols-1 gap-4 pt-3 lg:grid-cols-3">
            {/* Column 1 */}
            <div className="flex min-w-0 flex-col gap-2">
              <FieldRow label="Customer" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="min-w-0 flex-1">
                    <SimpleSelect
                      options={customerOptions}
                      value={form.customerId}
                      onChange={(e) => handleCustomerChange(e.target.value)}
                      placeholder={loadingCustomers ? "Loading…" : "Select…"}
                      disabled={loadingCustomers}
                      searchable
                      aria-label="Customer"
                    />
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-primary text-white hover:opacity-90"
                    title="Add new customer"
                    aria-label="Add new customer"
                    onClick={openAddCustomer}
                  >
                    <FiPlus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </FieldRow>
              <FieldRow label="Email" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => patch("customerEmail", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Phone" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => patch("customerPhone", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Motor Type" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" role="radiogroup" aria-label="Motor type">
                  {["AC", "DC"].map((opt) => (
                    <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                      <input
                        type="radio"
                        name="motorPower"
                        value={opt}
                        checked={form.motorPower === opt}
                        onChange={() => handleMotorTypeChange(opt)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Datasheet" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className={`${TOOLBAR_BTN} !px-3`}
                    disabled={form.recordType === RECORD_TYPE_RFQ}
                    title={
                      form.recordType === RECORD_TYPE_RFQ
                        ? "Available when RecordType is Job or Invoice"
                        : `View ${form.motorPower === "DC" ? "DC" : "AC"} datasheet`
                    }
                    onClick={openDatasheet}
                  >
                    View Datasheet
                  </Button>
                </div>
              </FieldRow>
              <FieldRow label="Mfg Name Plate" labelWidth="6.75rem" controlClassName="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" role="radiogroup" aria-label="Name plate">
                  {["Original", "EOM"].map((opt) => (
                    <label key={opt} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-title">
                      <input
                        type="radio"
                        name="namePlate"
                        value={opt}
                        checked={form.namePlate === opt}
                        onChange={() => patch("namePlate", opt)}
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </FieldRow>
              {MOTOR_FIELDS.map((field) => (
                <FieldRow
                  key={field.key}
                  label={field.label}
                  labelWidth="6.75rem"
                  controlClassName="min-w-0 flex-1"
                >
                  <input
                    type="text"
                    value={form[field.key]}
                    onChange={(e) => patch(field.key, e.target.value)}
                    className={FIELD_INPUT}
                  />
                </FieldRow>
              ))}
            </div>

            {/* Column 2 */}
            <div className="flex min-h-0 min-w-0 flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-title">Notes</span>
                <textarea
                  rows={10}
                  value={form.internalNotes}
                  onChange={(e) => patch("internalNotes", e.target.value)}
                  className={`${FIELD_TEXTAREA} min-h-[10rem] flex-1`}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1">
                <span className="text-xs font-bold text-title">Customer Notes</span>
                <textarea
                  rows={10}
                  value={form.customerNotes}
                  onChange={(e) => patch("customerNotes", e.target.value)}
                  className={`${FIELD_TEXTAREA} min-h-[10rem] flex-1`}
                />
              </div>
            </div>

            {/* Column 3 — meta + status */}
            <div className="flex min-w-0 flex-col gap-2">
              <FieldRow label="Customer PO#" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="text"
                  value={form.customerPo}
                  onChange={(e) => patch("customerPo", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="date"
                  value={form.dateCreated}
                  onChange={(e) => patch("dateCreated", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Prepared By" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <SimpleSelect
                  options={preparedByOptions}
                  value={form.preparedBy}
                  onChange={(e) => patch("preparedBy", e.target.value)}
                  placeholder={loadingEmployees ? "Loading…" : "Select…"}
                  disabled={loadingEmployees}
                  searchable
                  aria-label="Prepared By"
                />
              </FieldRow>
              <div className="flex flex-wrap justify-end gap-1">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={TOOLBAR_BTN}
                  disabled={form.recordType !== RECORD_TYPE_RFQ || saving || copying}
                  onClick={() => handleConvertRecordType(RECORD_TYPE_JOB)}
                >
                  Convert RFQ To Job
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className={TOOLBAR_BTN}
                  disabled={form.recordType !== RECORD_TYPE_JOB || saving || copying}
                  onClick={() => handleConvertRecordType(RECORD_TYPE_RFQ)}
                >
                  Convert Job To RFQ
                </Button>
              </div>
              <FieldRow label={docLabel} labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="text"
                  value={form.documentNumber}
                  onChange={(e) => patch("documentNumber", e.target.value)}
                  className={FIELD_INPUT}
                  placeholder="Assigned on save"
                />
              </FieldRow>
              <FieldRow label="Proposal Approved By" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <SimpleSelect
                  options={approvedByOptions}
                  value={form.proposalApprovedBy}
                  onChange={(e) => patch("proposalApprovedBy", e.target.value)}
                  placeholder={loadingEmployees ? "Loading…" : "Select…"}
                  disabled={loadingEmployees}
                  searchable
                  aria-label="Proposal Approved By"
                />
              </FieldRow>
              <FieldRow label="Quote Type" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <SimpleSelect
                  options={QUOTE_TYPE_OPTIONS}
                  value={form.quoteType}
                  onChange={(e) => patch("quoteType", e.target.value)}
                  placeholder="Select…"
                  aria-label="Quote Type"
                />
              </FieldRow>
              <FieldRow label="Due Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => patch("dueDate", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Proposal Submit Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="date"
                  value={form.proposalSubmitDate}
                  onChange={(e) => patch("proposalSubmitDate", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              <FieldRow label="Proposal Accepted Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                <input
                  type="date"
                  value={form.proposalAcceptedDate}
                  onChange={(e) => patch("proposalAcceptedDate", e.target.value)}
                  className={FIELD_INPUT}
                />
              </FieldRow>
              {form.recordType === RECORD_TYPE_INVOICE ? (
                <>
                  <FieldRow label="Invoice Submit Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                    <input
                      type="date"
                      value={form.invoiceSubmitDate}
                      onChange={(e) => patch("invoiceSubmitDate", e.target.value)}
                      className={FIELD_INPUT}
                    />
                  </FieldRow>
                  <FieldRow label="Invoice Paid Date" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                    <input
                      type="date"
                      value={form.invoicePaidDate}
                      onChange={(e) => patch("invoicePaidDate", e.target.value)}
                      className={FIELD_INPUT}
                    />
                  </FieldRow>
                </>
              ) : null}
              <FieldRow
                label={form.recordType === RECORD_TYPE_JOB ? "Proposal Status" : "Status"}
                labelWidth="9.5rem"
                controlClassName="min-w-0 flex-1"
              >
                <SimpleSelect
                  options={statusOptions}
                  value={form.status}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    setForm((f) => {
                      const nextType = resolveRecordTypeOnSave(
                        f.recordType,
                        nextStatus,
                        invoiceStatusValues,
                        quoteStatusValues
                      );
                      return { ...f, status: nextStatus, recordType: nextType };
                    });
                  }}
                  placeholder="Select…"
                  searchable
                  aria-label={form.recordType === RECORD_TYPE_JOB ? "Proposal Status" : "Status"}
                />
              </FieldRow>
              {form.recordType === RECORD_TYPE_JOB ? (
                <FieldRow label="Status" labelWidth="9.5rem" controlClassName="min-w-0 flex-1">
                  <SimpleSelect
                    options={jobStatusOptions}
                    value={form.jobStatus}
                    onChange={(e) => patch("jobStatus", e.target.value)}
                    placeholder="Select…"
                    searchable
                    aria-label="Status"
                  />
                </FieldRow>
              ) : null}
            </div>
          </div>

          {/* Tables + totals */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <LineItemsTable
              title="PROPOSAL BREAKDOWN (Taxed, if applicable)"
              lines={form.scopeDetails}
              onChange={(scopeDetails) => patch("scopeDetails", scopeDetails)}
              totalLabel="Total For Proposal:"
              formatMoney={formatMoney}
            />
            <div className="flex min-w-0 flex-col gap-2">
              <LineItemsTable
                title="OTHER ITEMS (Non taxable items)"
                lines={form.otherItems}
                onChange={(otherItems) => patch("otherItems", otherItems)}
                totalLabel="Total:"
                formatMoney={formatMoney}
              />
              <div className="ml-auto w-full max-w-xs space-y-1 border border-border bg-card p-2">
                <FieldRow label="Total Amount" labelWidth="8rem">
                  <input readOnly value={formatMoney(totalAmount)} className={`${FIELD_INPUT} text-right font-semibold tabular-nums`} />
                </FieldRow>
                {showTax ? (
                  <>
                    <FieldRow label="Tax%" labelWidth="8rem">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={form.taxPercent}
                        onChange={(e) => patch("taxPercent", e.target.value)}
                        className={`${FIELD_INPUT} text-right tabular-nums`}
                      />
                    </FieldRow>
                    <FieldRow label="Tax Amount" labelWidth="8rem">
                      <input readOnly value={formatMoney(taxAmount)} className={`${FIELD_INPUT} text-right tabular-nums`} />
                    </FieldRow>
                  </>
                ) : null}
                <FieldRow label="Total For Billing" labelWidth="8rem">
                  <input
                    readOnly
                    value={formatMoney(billingTotal)}
                    className={`${FIELD_INPUT} !bg-muted text-right font-bold tabular-nums dark:!bg-card`}
                  />
                </FieldRow>
              </div>
            </div>
          </div>
        </Form>
        </div>
      </Modal>

      <SalesCommissionCreateModal
        open={commissionOpen && !!commissionPreset?.quoteId}
        onClose={() => setCommissionOpen(false)}
        presetQuote={commissionPreset}
      />

      <SimplePurchaseOrderFormModal
        open={purchaseOrderOpen}
        onClose={() => setPurchaseOrderOpen(false)}
        serviceProposalId={recordId}
        jobNumber={jobNumber}
        mode={purchaseOrderMode}
      />

      <SimpleServiceProposalAttachmentsModal
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        recordId={recordId || null}
        attachments={Array.isArray(form.attachments) ? form.attachments : []}
        onAttached={handleAttached}
      />

      <SimpleServiceProposalPrintPreviewModal
        open={printOpen}
        onClose={() => {
          setPrintOpen(false);
          setPrintBundle(null);
          setPrintSendMeta(null);
        }}
        bundle={printBundle}
        sendMeta={printSendMeta}
        title={
          printBundle?.printNotesMode === PRINT_NOTES_INTERNAL
            ? "Internal print preview"
            : "Customer print preview"
        }
      />

      <Modal
        open={addCustomerOpen}
        onClose={() => !savingCustomer && setAddCustomerOpen(false)}
        title="Add new customer"
        size="6xl"
        width="min(1100px, 96vw)"
        height="min(84.6vh, 828px)"
        showClose={!savingCustomer}
        closeOnOutsideClick={false}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddCustomerOpen(false)}
              disabled={savingCustomer}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={ADD_CUSTOMER_FORM_ID}
              variant="primary"
              size="sm"
              disabled={savingCustomer}
            >
              {savingCustomer ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form
          id={ADD_CUSTOMER_FORM_ID}
          onSubmit={handleAddCustomerSubmit}
          className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <SimpleCustomerFormFields form={newCustomerForm} setForm={setNewCustomerForm} />
        </Form>
      </Modal>

      <SimpleDatasheetModal
        open={datasheetOpen}
        onClose={() => setDatasheetOpen(false)}
        onSave={handleDatasheetSave}
        motorType={form.motorPower === "DC" ? "DC" : "AC"}
        initialDatasheet={datasheetInitial}
        technicianOptions={preparedByOptions}
        recordId={recordId || null}
        attachments={Array.isArray(form.attachments) ? form.attachments : []}
        onAttached={handleAttached}
        printContext={{
          customerName:
            selectedCustomer?.companyName ||
            selectedCustomer?.primaryContactName ||
            "",
          companyName:
            selectedCustomer?.companyName ||
            selectedCustomer?.primaryContactName ||
            "",
          documentNumber: String(form.documentNumber || "").trim(),
          documentLabel: docLabel,
        }}
      />
    </>
  );
}
