"use client";

import { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import InvoicePrintOffscreen from "@/components/dashboard/invoice-print-offscreen";
import { FiSave, FiSend, FiPrinter, FiRotateCw, FiClipboard } from "react-icons/fi";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { mergeUserSettings } from "@/lib/user-settings";
import { invoiceStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";
import { computeTotalsFromLaborAndParts, normalizeTaxExempt } from "@/lib/quote-invoice-totals";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";

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

function sumLinePrices(lines) {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const p = parseFloat(row?.price);
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

const emptyForm = () => ({
  quoteId: "",
  customerId: "",
  motorId: "",
  invoiceNumber: "",
  customerName: "",
  motorLabel: "",
  customerPo: "",
  date: "",
  preparedBy: "",
  scopeLines: [],
  partsLines: [],
  laborTotal: "",
  partsTotal: "",
  customerTaxExempt: true,
  customerTaxPercent: "0",
  customerNotes: "",
  notes: "",
  status: "draft",
  workOrderId: null,
});

export default function InvoiceFormModal({
  open,
  draftQuoteId = null,
  invoiceId = null,
  onClose,
  onAfterSave,
  onSwitchToInvoice,
  zIndex = 50,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { settings: accountSettings } = useUserSettings();
  const mergedAccountSettings = useMemo(() => mergeUserSettings(accountSettings), [accountSettings]);
  const invoiceStatusOptions = useMemo(
    () => invoiceStatusSelectOptionsFromMerged(mergedAccountSettings),
    [mergedAccountSettings]
  );
  const fmt = useFormatMoney();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [headerBusy, setHeaderBusy] = useState(false);
  const [isSendingToClient, setIsSendingToClient] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  /** Saved invoice id (edit mode); null = new draft */
  const [savedId, setSavedId] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [invoiceWorkOrderModalId, setInvoiceWorkOrderModalId] = useState(null);

  const persistedId = invoiceId || savedId;
  const canUseRecordActions = !!persistedId && !loading;

  const employeeOptions = useMemo(() => {
    const opts = [{ value: "", label: "—" }];
    const ids = new Set();
    for (const e of employees) {
      if (e.id) {
        ids.add(e.id);
        opts.push({
          value: e.id,
          label: (e.name || "").trim() || e.email || e.id || "—",
        });
      }
    }
    const pb = String(form.preparedBy ?? "").trim();
    if (pb && !ids.has(pb)) {
      opts.push({ value: pb, label: pb });
    }
    return opts;
  }, [employees, form.preparedBy]);

  const scopeTotal = useMemo(() => sumLinePrices(form.scopeLines), [form.scopeLines]);
  const partsTotalSum = useMemo(() => sumPartsLineTotals(form.partsLines), [form.partsLines]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm());
      setSavedId(null);
      setInvoiceWorkOrderModalId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [empRes] = await Promise.all([
          fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
        ]);
        if (empRes.ok) {
          const list = await empRes.json();
          if (!cancelled) setEmployees(Array.isArray(list) ? list : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      if (draftQuoteId) {
        setLoading(true);
        try {
          const res = await fetch(
            `/api/dashboard/invoices/draft?quoteId=${encodeURIComponent(draftQuoteId)}`,
            { credentials: "include", cache: "no-store" }
          );
          const d = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(d.error || "Failed to load draft");
          setSavedId(null);
          setForm({
            quoteId: d.quoteId,
            customerId: d.customerId,
            motorId: d.motorId,
            invoiceNumber: d.invoiceNumber || "",
            customerName: d.customerName || "",
            motorLabel: d.motorLabel || "",
            customerPo: d.customerPo || "",
            date: d.date || "",
            preparedBy: d.preparedBy || "",
            scopeLines: Array.isArray(d.scopeLines) ? d.scopeLines : [],
            partsLines: Array.isArray(d.partsLines) ? d.partsLines : [],
            laborTotal: d.laborTotal || "",
            partsTotal: d.partsTotal || "",
            customerTaxExempt: normalizeTaxExempt(d.customerTaxExempt),
            customerTaxPercent: d.customerTaxPercent || "0",
            customerNotes: d.customerNotes || "",
            notes: d.notes || "",
            status: normalizeInvoiceStatusSlug(d.status, mergedAccountSettings),
            workOrderId: d.workOrderId ?? null,
          });
        } catch (e) {
          if (!cancelled) toast.error(e.message || "Could not load invoice draft");
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }
      if (invoiceId) {
        setLoading(true);
        try {
          const res = await fetch(`/api/dashboard/invoices/${invoiceId}`, {
            credentials: "include",
            cache: "no-store",
          });
          const d = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(d.error || "Failed to load invoice");
          setSavedId(invoiceId);
          setForm({
            quoteId: d.quoteId,
            customerId: d.customerId,
            motorId: d.motorId,
            invoiceNumber: d.invoiceNumber || "",
            customerName: d.customerName || "",
            motorLabel: d.motorLabel || "",
            customerPo: d.customerPo || "",
            date: d.date || "",
            preparedBy: d.preparedBy || "",
            scopeLines: Array.isArray(d.scopeLines) ? d.scopeLines : [],
            partsLines: Array.isArray(d.partsLines) ? d.partsLines : [],
            laborTotal: d.laborTotal || "",
            partsTotal: d.partsTotal || "",
            customerTaxExempt: normalizeTaxExempt(d.customerTaxExempt),
            customerTaxPercent: d.customerTaxPercent || "0",
            customerNotes: d.customerNotes || "",
            notes: d.notes || "",
            status: normalizeInvoiceStatusSlug(d.status, mergedAccountSettings),
            workOrderId: d.workOrderId ?? null,
          });
        } catch (e) {
          if (!cancelled) toast.error(e.message || "Could not load invoice");
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, draftQuoteId, invoiceId, onSwitchToInvoice, toast, mergedAccountSettings]);

  const handleHeaderSend = async () => {
    if (!persistedId) return;
    const ok = await confirm({
      title: "Send invoice to client",
      message: `Email invoice #${form.invoiceNumber || ""} to the customer on file?`,
      confirmLabel: "Send",
    });
    if (!ok) return;
    setIsSendingToClient(true);
    setHeaderBusy(true);
    try {
      const res = await fetch(`/api/dashboard/invoices/${persistedId}/send`, {
        method: "POST",
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Send failed");
      toast.success(d.message || "Sent.");
      setForm((f) => ({ ...f, status: normalizeInvoiceStatusSlug("sent", mergedAccountSettings) }));
      onAfterSave?.();
    } catch (e) {
      toast.error(e.message || "Could not send");
    } finally {
      setHeaderBusy(false);
      setIsSendingToClient(false);
    }
  };

  const handleHeaderPrint = async () => {
    if (!persistedId) return;
    setHeaderBusy(true);
    try {
      const res = await fetch(`/api/dashboard/invoices/${persistedId}`, {
        credentials: "include",
        cache: "no-store",
      });
      const inv = await res.json();
      if (!res.ok) throw new Error(inv.error || "Failed to load invoice");
      setPrintPayload({
        invoice: inv,
        motorLabel: inv.motorLabel,
        fromShopName: inv.fromShopName || "",
        fromShopContact: inv.fromShopContact || "",
        fromShopLogoUrl: (inv.fromShopLogoUrl || accountSettings?.logoUrl || "").trim(),
        fromBillingAddress: inv.fromBillingAddress || "",
        fromPaymentTermsLabel:
          inv.fromPaymentTermsLabel || accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms),
        customerToName: inv.customerToName || "",
        customerBillingAddress: inv.customerBillingAddress || "",
        invoicePaymentOptions: accountSettings?.invoicePaymentOptions || "",
        invoiceThankYouNote: accountSettings?.invoiceThankYouNote || "",
      });
      setPrintOpen(true);
    } catch (e) {
      toast.error(e.message || "Could not open print view");
    } finally {
      setHeaderBusy(false);
    }
  };

  // Keep totals in sync with the tables automatically.
  useEffect(() => {
    if (!open) return;
    const nextLabor = Number(scopeTotal).toFixed(2);
    const nextParts = Number(partsTotalSum).toFixed(2);
    setForm((prev) => {
      const curLabor = prev.laborTotal != null && prev.laborTotal !== "" ? String(prev.laborTotal) : "";
      const curParts = prev.partsTotal != null && prev.partsTotal !== "" ? String(prev.partsTotal) : "";
      if (curLabor === nextLabor && curParts === nextParts) return prev;
      return { ...prev, laborTotal: nextLabor, partsTotal: nextParts };
    });
  }, [open, scopeTotal, partsTotalSum]);

  const handleSave = async () => {
    if (!form.quoteId) {
      toast.error("Missing quote reference.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        quoteId: form.quoteId,
        customerPo: form.customerPo,
        date: form.date,
        preparedBy: form.preparedBy,
        scopeLines: form.scopeLines,
        partsLines: form.partsLines,
        laborTotal: form.laborTotal,
        partsTotal: form.partsTotal,
        customerTaxExempt: normalizeTaxExempt(form.customerTaxExempt),
        customerTaxPercent: normalizeTaxExempt(form.customerTaxExempt) ? "0" : form.customerTaxPercent,
        customerNotes: form.customerNotes,
        notes: form.notes,
        status: form.status,
      };
      if (savedId) {
        const res = await fetch(`/api/dashboard/invoices/${savedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Save failed");
        toast.success("Invoice saved.");
        setForm((f) => ({
          ...f,
          workOrderId: d.invoice?.workOrderId ?? f.workOrderId ?? null,
        }));
      } else {
        const res = await fetch("/api/dashboard/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Save failed");
        toast.success("Invoice saved.");
        setSavedId(d.invoice?.id || null);
        if (d.invoice?.id) {
          setForm((f) => ({
            ...f,
            ...d.invoice,
            customerName: f.customerName,
            motorLabel: f.motorLabel,
            workOrderId: d.invoice?.workOrderId ?? f.workOrderId ?? null,
          }));
        }
      }
      onAfterSave?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Could not save invoice");
    } finally {
      setSaving(false);
    }
  };

  const isNew = !savedId && !invoiceId;
  const title = savedId || invoiceId ? `Edit invoice #${form.invoiceNumber || "—"}` : "New invoice";
  const headerDisabled = saving || loading || headerBusy;
  const invoiceTotals = computeTotalsFromLaborAndParts({
    laborTotal: scopeTotal,
    partsTotal: partsTotalSum,
    taxExempt: form.customerTaxExempt,
    taxPercent: form.customerTaxPercent,
  });

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="full"
      width="min(1344px, 78.4vw)"
      zIndex={zIndex}
      actions={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={headerDisabled || !String(form.workOrderId || "").trim()}
            className="inline-flex shrink-0 items-center gap-1.5"
            title={
              String(form.workOrderId || "").trim()
                ? "Open work order for this quote"
                : "No work order linked to this quote’s RFQ yet"
            }
            onClick={() => {
              const wid = String(form.workOrderId || "").trim();
              if (!wid) return;
              setInvoiceWorkOrderModalId(wid);
            }}
          >
            <FiClipboard className="h-4 w-4 shrink-0" aria-hidden />
            View Job
          </Button>
          {canUseRecordActions ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={headerDisabled}
                className="inline-flex shrink-0 items-center gap-1.5"
                onClick={handleHeaderPrint}
              >
                <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={headerDisabled}
                className="inline-flex shrink-0 items-center gap-1.5"
                onClick={handleHeaderSend}
              >
                {isSendingToClient ? (
                  <FiRotateCw className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {isSendingToClient ? "Sending…" : "Send to client"}
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={headerDisabled}
            onClick={handleSave}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
          >
            {saving ? (
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
      {loading ? (
        <div className="flex justify-center py-16 text-secondary">Loading…</div>
      ) : (
        <Form className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`} onSubmit={(e) => e.preventDefault()}>
          <FormSection title="Invoice summary">
            <p className="text-sm font-medium text-title">Invoice # {form.invoiceNumber || "—"}</p>
            <p className="text-sm text-secondary">{isNew ? "Not saved until you click Save." : ""}</p>
            <p className="mt-2 text-sm">
              <span className="text-secondary">Customer: </span>
              {form.customerName || "—"}
            </p>
            <p className="text-sm">
              <span className="text-secondary">Motor: </span>
              {form.motorLabel || "—"}
            </p>
          </FormSection>
          <FormSection title="Invoice details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Customer PO#"
              value={form.customerPo}
              onChange={(e) => setForm((f) => ({ ...f, customerPo: e.target.value }))}
            />
            <Select
              label="Prepared by"
              options={employeeOptions}
              value={form.preparedBy}
              onChange={(e) => setForm((f) => ({ ...f, preparedBy: e.target.value ?? "" }))}
            />
            <Select
              label="Status"
              options={invoiceStatusOptions}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  status: normalizeInvoiceStatusSlug(e.target.value, mergedAccountSettings),
                }))
              }
            />
            <Input
              label="Tax %"
              value={form.customerTaxExempt ? "0" : form.customerTaxPercent || "0"}
              readOnly
            />
            <Input
              label="Tax exempted"
              value={form.customerTaxExempt ? "Yes" : "No"}
              readOnly
            />
            </div>
          </FormSection>
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
                <div className="mb-1 text-xs font-medium text-secondary">Other cost</div>
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
                    <td className="px-3 py-2 text-secondary">Scope sum (lines)</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(scopeTotal)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Other cost sum</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(partsTotalSum)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Invoice subtotal</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(invoiceTotals.subtotal)}</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-3 py-2 text-secondary">Tax</td>
                    <td className="px-3 py-2 text-right text-title">{fmt(invoiceTotals.taxAmount)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-semibold text-title">Grand total</td>
                    <td className="px-3 py-2 text-right font-semibold text-title">{fmt(invoiceTotals.grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FormSection>
          <FormSection title="Notes">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Textarea
                label="Customer notes"
                value={form.customerNotes}
                onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                rows={2}
              />
              <Textarea
                label="Internal notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </FormSection>
        </Form>
      )}
    </Modal>

    <WorkOrderFormModal
      open={!!invoiceWorkOrderModalId}
      draftQuoteId={null}
      workOrderId={invoiceWorkOrderModalId}
      onClose={() => setInvoiceWorkOrderModalId(null)}
      zIndex={(zIndex ?? 50) + 10}
    />

    <InvoicePrintOffscreen
      open={printOpen}
      payload={printPayload}
      onClose={() => {
        setPrintOpen(false);
        setPrintPayload(null);
      }}
    />
    </>
  );
}
