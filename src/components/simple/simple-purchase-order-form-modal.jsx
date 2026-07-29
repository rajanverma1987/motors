"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiPrinter, FiSend, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import SimpleSelect from "@/components/simple/simple-select";
import SimplePurchaseOrderPrintPreviewModal from "@/components/simple/simple-purchase-order-print-preview-modal";
import { Form } from "@/components/ui/form-layout";
import { useAlert } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { buildEmployeeSelectOptions } from "@/lib/technician-select-options";
import { mergeUserSettings } from "@/lib/user-settings";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";
import { buildSimplePurchaseOrderPrintPayload } from "@/lib/simple-purchase-order-print";
import {
  computeNextSimplePoNumber,
  computePoFormTotals,
  computePoLineTotals,
  createEmptySimplePurchaseOrderForm,
  emptyPoLine,
  formToSimplePurchaseOrderRow,
  parsePoMoney,
  resolveSimplePoType,
  SIMPLE_PO_PAYMENT_METHOD_OPTIONS,
  SIMPLE_PO_PAYMENT_STATUS_OPTIONS,
  SIMPLE_PO_TYPE_JOB,
  SIMPLE_PO_TYPE_OPTIONS,
  SIMPLE_PO_TYPE_SHOP,
  storedPoToForm,
} from "@/lib/simple-purchase-order-form";
import {
  fetchSimplePurchaseOrders,
  fetchSimpleServiceProposals,
  listSimplePurchaseOrdersForJobApi,
  saveSimplePurchaseOrder,
} from "@/lib/simple-portal-api";

const FORM_ID = "simple-purchase-order-form";
const ADD_VENDOR_FORM_ID = "simple-po-add-vendor-form";

/** ~90% of Service Proposal modal height (`min(94vh, 920px)`). */
const PO_MODAL_HEIGHT = "min(84.6vh, 828px)";
/** Header row + ~10 body rows (h-7 cells). */
const TABLE_SCROLL_MAX_CLASS = "max-h-[calc(2.25rem+10*2rem)]";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-sm border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
/** Line-item cells: square corners, flush packing. */
const CELL_INPUT =
  "h-7 w-full min-w-0 rounded-none border-0 bg-transparent px-1 text-xs text-title outline-none focus:bg-primary/[0.06] focus:ring-1 focus:ring-inset focus:ring-primary dark:focus:bg-primary/10 dark:text-title";
const CELL_INPUT_MUTED = `${CELL_INPUT} !bg-muted/40`;

const INITIAL_VENDOR_FORM = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
};

function FieldRow({ label, labelWidth = "9.5rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
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
  return Boolean(
    String(line?.itemName ?? "").trim() ||
      String(line?.uom ?? "").trim() ||
      parsePoMoney(line?.quantity) ||
      parsePoMoney(line?.price) ||
      parsePoMoney(line?.taxPercent)
  );
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
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const isViewMode = mode === "view";

  const [form, setForm] = useState(() => createEmptySimplePurchaseOrderForm());
  const [jobPos, setJobPos] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [savingVendor, setSavingVendor] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPo, setPrintPo] = useState(null);
  const [printVendor, setPrintVendor] = useState(null);
  const [printSendMeta, setPrintSendMeta] = useState(null);

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

  const totals = useMemo(() => computePoFormTotals(form.lineItems), [form.lineItems]);

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
    if (!open) return;
    let cancelled = false;
    setAddVendorOpen(false);
    setVendorForm(INITIAL_VENDOR_FORM);
    (async () => {
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
      const next = (f.lineItems || []).map((line) =>
        line.id === lineId ? { ...line, [key]: value } : line
      );
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
    loadPoById(poId, jobPos);
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
        body: JSON.stringify({
          name: vendorForm.name,
          contactName: vendorForm.contactName,
          phone: vendorForm.phone,
          email: vendorForm.email,
        }),
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
        showClose={!saving}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="inline-flex items-center gap-1.5"
              disabled={saving || loadingMeta}
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
              disabled={saving || loadingMeta}
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
              disabled={saving || loadingMeta || (isViewMode && !form.id)}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="flex min-h-[calc(min(84.6vh,828px)-4.75rem)] flex-col gap-5 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5">
            {showTypeSelect ? (
              <FieldRow label="Type" labelWidth="2.75rem" className="w-[10.5rem] shrink-0" controlClassName="min-w-0 flex-1">
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
              <FieldRow label="Job#" labelWidth="2.75rem" className="w-[12.5rem] shrink-0" controlClassName="min-w-0 flex-1">
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
              <FieldRow label="Job" labelWidth="2.5rem" className="w-[12rem] shrink-0" controlClassName="min-w-0 flex-1">
                <div
                  className="truncate text-base font-bold tracking-wide text-primary"
                  title={form.jobNumber || jobNumber}
                >
                  {form.jobNumber || jobNumber}
                </div>
              </FieldRow>
            ) : null}
            <FieldRow label="PO#" labelWidth="2.75rem" className="w-[12.5rem] shrink-0" controlClassName="min-w-0 flex-1">
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
                  className={`${FIELD_INPUT} font-semibold ${poNumberEditable ? "" : "!bg-muted"}`}
                  disabled={saving}
                />
              )}
            </FieldRow>
            <FieldRow
              label="Vendor"
              labelWidth="3.25rem"
              className="min-w-[14rem] max-w-[16rem] flex-1 shrink"
              controlClassName="min-w-0 flex-1"
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
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border bg-primary text-white hover:opacity-90 disabled:opacity-60"
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
            <FieldRow label="PO Date" labelWidth="3.75rem" className="w-[11.25rem] shrink-0" controlClassName="min-w-0 flex-1">
              <input
                type="date"
                value={form.poCutDate}
                onChange={(e) => patch("poCutDate", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
              />
            </FieldRow>
            <FieldRow label="Due Date" labelWidth="4rem" className="w-[11.5rem] shrink-0" controlClassName="min-w-0 flex-1">
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => patch("dueDate", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
              />
            </FieldRow>
          </div>

          <div className={`shrink-0 overflow-auto border border-border ${TABLE_SCROLL_MAX_CLASS}`}>
            <table className="w-full min-w-[52rem] border-collapse border-spacing-0 text-xs">
              <thead className="sticky top-0 z-[1]">
                <tr className="bg-primary text-white">
                  <th className="w-7 border-r border-primary/30 p-0.5 text-left font-semibold" />
                  <th className="border-r border-primary/30 px-1 py-1 text-left font-semibold">Item Name</th>
                  <th className="w-20 border-r border-primary/30 px-1 py-1 text-left font-semibold">UOM</th>
                  <th className="w-20 border-r border-primary/30 px-1 py-1 text-right font-semibold">Quantity</th>
                  <th className="w-24 border-r border-primary/30 px-1 py-1 text-right font-semibold">Price</th>
                  <th className="w-24 border-r border-primary/30 px-1 py-1 text-right font-semibold">Total</th>
                  <th className="w-16 border-r border-primary/30 px-1 py-1 text-right font-semibold">Tax%</th>
                  <th className="w-24 border-r border-primary/30 px-1 py-1 text-right font-semibold">Tax Amount</th>
                  <th className="w-28 px-1 py-1 text-right font-semibold">Grand Total</th>
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
                        {canRemove ? (
                          <button
                            type="button"
                            className="rounded-none p-0.5 text-danger hover:bg-danger/10"
                            title="Remove line"
                            aria-label="Remove line"
                            onClick={() => removeLine(line.id)}
                            disabled={saving}
                          >
                            <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        ) : null}
                      </td>
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
                      <td className="p-0">
                        <input
                          type="text"
                          readOnly
                          value={formatMoney(t.grandTotal)}
                          className={`${CELL_INPUT_MUTED} text-right font-semibold tabular-nums`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_minmax(12rem,16rem)]">
              <div className="flex min-w-0 flex-col gap-2">
                <FieldRow label="PO Invoice Receive Date" labelWidth="10.5rem" controlClassName="min-w-0 flex-1">
                  <input
                    type="date"
                    value={form.poInvoiceReceiveDate}
                    onChange={(e) => patch("poInvoiceReceiveDate", e.target.value)}
                    className={FIELD_INPUT}
                    disabled={saving}
                  />
                </FieldRow>
                <FieldRow label="PO Item Receive Date" labelWidth="10.5rem" controlClassName="min-w-0 flex-1">
                  <input
                    type="date"
                    value={form.poItemReceiveDate}
                    onChange={(e) => patch("poItemReceiveDate", e.target.value)}
                    className={FIELD_INPUT}
                    disabled={saving}
                  />
                </FieldRow>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <FieldRow label="PO Paid Date" labelWidth="8.5rem" controlClassName="min-w-0 flex-1">
                  <input
                    type="date"
                    value={form.poPaidDate}
                    onChange={(e) => patch("poPaidDate", e.target.value)}
                    className={FIELD_INPUT}
                    disabled={saving}
                  />
                </FieldRow>
                <FieldRow label="Payment Method" labelWidth="8.5rem" controlClassName="min-w-0 flex-1">
                  <SimpleSelect
                    options={SIMPLE_PO_PAYMENT_METHOD_OPTIONS}
                    value={form.paymentMethod}
                    onChange={(e) => patch("paymentMethod", e.target.value)}
                    placeholder="Select…"
                    disabled={saving}
                    aria-label="Payment Method"
                  />
                </FieldRow>
                <FieldRow label="Paid By" labelWidth="8.5rem" controlClassName="min-w-0 flex-1">
                  <SimpleSelect
                    options={paidByOptions}
                    value={form.paidBy}
                    onChange={(e) => patch("paidBy", e.target.value)}
                    placeholder={loadingMeta ? "Loading…" : "Select…"}
                    disabled={loadingMeta || saving}
                    searchable
                    aria-label="Paid By"
                  />
                </FieldRow>
                <FieldRow label="Payment Status" labelWidth="8.5rem" controlClassName="min-w-0 flex-1">
                  <SimpleSelect
                    options={SIMPLE_PO_PAYMENT_STATUS_OPTIONS}
                    value={form.paymentStatus}
                    onChange={(e) => patch("paymentStatus", e.target.value)}
                    placeholder="Select…"
                    disabled={saving}
                    aria-label="Payment Status"
                  />
                </FieldRow>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
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
        </Form>
      </Modal>

      <Modal
        open={addVendorOpen}
        onClose={() => !savingVendor && setAddVendorOpen(false)}
        title="Add new vendor"
        size="md"
        showClose={!savingVendor}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddVendorOpen(false)}
              disabled={savingVendor}
            >
              Cancel
            </Button>
            <Button type="submit" form={ADD_VENDOR_FORM_ID} variant="primary" size="sm" disabled={savingVendor}>
              {savingVendor ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form
          id={ADD_VENDOR_FORM_ID}
          onSubmit={handleAddVendor}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <FieldRow label="Name" labelWidth="6rem" controlClassName="min-w-0 flex-1">
            <input
              type="text"
              value={vendorForm.name}
              onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
              className={FIELD_INPUT}
              required
              disabled={savingVendor}
            />
          </FieldRow>
          <FieldRow label="Contact" labelWidth="6rem" controlClassName="min-w-0 flex-1">
            <input
              type="text"
              value={vendorForm.contactName}
              onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))}
              className={FIELD_INPUT}
              disabled={savingVendor}
            />
          </FieldRow>
          <FieldRow label="Phone" labelWidth="6rem" controlClassName="min-w-0 flex-1">
            <input
              type="tel"
              value={vendorForm.phone}
              onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
              className={FIELD_INPUT}
              disabled={savingVendor}
            />
          </FieldRow>
          <FieldRow label="Email" labelWidth="6rem" controlClassName="min-w-0 flex-1">
            <input
              type="email"
              value={vendorForm.email}
              onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
              className={FIELD_INPUT}
              disabled={savingVendor}
            />
          </FieldRow>
        </Form>
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
