"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import Modal from "@/components/ui/modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import CompanyAccountsPrint from "@/components/dashboard/company-accounts-print";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import { FiSave, FiEdit2, FiSend, FiPrinter, FiTrash2, FiRotateCw } from "react-icons/fi";
import { INVOICE_STATUS_OPTIONS, normalizeInvoiceStatusSlug } from "@/lib/invoice-status";

const MENU_IC = "h-4 w-4 shrink-0 text-secondary";

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
  customerNotes: "",
  notes: "",
  status: "draft",
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
  const fmt = useFormatMoney();
  const formScrollRef = useRef(null);
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
          if (d.existingInvoiceId) {
            onSwitchToInvoice?.(d.existingInvoiceId);
            toast.info("Invoice already exists for this quote — opening it to edit.");
            return;
          }
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
            customerNotes: d.customerNotes || "",
            notes: d.notes || "",
            status: normalizeInvoiceStatusSlug(d.status),
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
            customerNotes: d.customerNotes || "",
            notes: d.notes || "",
            status: normalizeInvoiceStatusSlug(d.status),
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
  }, [open, draftQuoteId, invoiceId, onSwitchToInvoice, toast]);

  useEffect(() => {
    if (!printOpen) return;
    const styleId = "invoice-modal-print-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .invoice-print-preview, .invoice-print-preview * { visibility: visible; }
        .invoice-print-preview {
          position: fixed !important; left: 0 !important; top: 0 !important; right: 0 !important; bottom: 0 !important;
          width: 100% !important; height: 100% !important; background: white !important; z-index: 99999 !important;
          overflow: auto !important;
        }
        .invoice-print-preview .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, [printOpen]);

  const scrollToForm = () => {
    formScrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      setForm((f) => ({ ...f, status: "sent" }));
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

  const handleHeaderDelete = async () => {
    if (!persistedId) return;
    const ok = await confirm({
      title: "Delete invoice",
      message: `Delete invoice #${form.invoiceNumber || persistedId}? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    setHeaderBusy(true);
    try {
      const res = await fetch(`/api/dashboard/invoices/${persistedId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Delete failed");
      toast.success("Invoice deleted.");
      onAfterSave?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || "Could not delete");
    } finally {
      setHeaderBusy(false);
    }
  };

  const runPrintDialog = () => {
    requestAnimationFrame(() => {
      window.print();
      setPrintOpen(false);
      setPrintPayload(null);
    });
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
      } else {
        const res = await fetch("/api/dashboard/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (res.status === 409 && d.existingId) {
          onSwitchToInvoice?.(d.existingId);
          toast.info("Invoice already exists — opened for editing.");
          return;
        }
        if (!res.ok) throw new Error(d.error || "Save failed");
        toast.success("Invoice saved.");
        setSavedId(d.invoice?.id || null);
        if (d.invoice?.id) {
          setForm((f) => ({ ...f, ...d.invoice, customerName: f.customerName, motorLabel: f.motorLabel }));
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

  const invoiceActionsMenuItems = useMemo(() => {
    if (!canUseRecordActions) return [];
    return [
      {
        key: "scroll",
        label: "Scroll to form",
        icon: <FiEdit2 className={MENU_IC} />,
        disabled: headerDisabled,
        title: "Scroll to form",
        onClick: scrollToForm,
      },
      {
        key: "send",
        label: isSendingToClient ? "Sending…" : "Send to client",
        icon: isSendingToClient ? (
          <FiRotateCw className={`${MENU_IC} animate-spin`} aria-hidden />
        ) : (
          <FiSend className={MENU_IC} />
        ),
        disabled: headerDisabled,
        onClick: handleHeaderSend,
      },
      {
        key: "print",
        label: "Print",
        icon: <FiPrinter className={MENU_IC} />,
        disabled: headerDisabled,
        onClick: handleHeaderPrint,
      },
      { key: "d1", type: "divider" },
      {
        key: "delete",
        label: "Delete",
        icon: <FiTrash2 className={MENU_IC} />,
        disabled: headerDisabled,
        danger: true,
        title: "Delete",
        onClick: handleHeaderDelete,
      },
      { key: "d2", type: "divider" },
      {
        key: "cancel",
        label: "Cancel",
        disabled: headerDisabled,
        onClick: () => onClose?.(),
      },
    ];
  }, [
    canUseRecordActions,
    headerDisabled,
    isSendingToClient,
    scrollToForm,
    handleHeaderSend,
    handleHeaderPrint,
    handleHeaderDelete,
    onClose,
  ]);

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
          {canUseRecordActions ? (
            <ModalActionsDropdown items={invoiceActionsMenuItems} menuZIndex={zIndex + 25} />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={headerDisabled}
              onClick={onClose}
              className="inline-flex shrink-0 items-center whitespace-nowrap"
            >
              Cancel
            </Button>
          )}
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
                <FiSave className="h-4 w-4 shrink-0" />
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
        <Form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div ref={formScrollRef} className="rounded-lg border border-border bg-card/50 p-4">
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
          </div>
          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
              Company &amp; terms (print / email)
            </p>
            <p className="mb-2 text-sm font-medium text-title">{user?.shopName || "—"}</p>
            <CompanyAccountsPrint
              billingAddress={accountSettings?.accountsBillingAddress}
              paymentTermsLabel={accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms)}
            />
            <p className="mt-3 text-xs text-secondary">
              Edit in Settings → Accounts.
            </p>
          </div>
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
              options={INVOICE_STATUS_OPTIONS}
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: normalizeInvoiceStatusSlug(e.target.value) }))
              }
            />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Scope &amp; other cost</h3>
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
            <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
              <span className="text-sm text-secondary">Scope sum (lines): {fmt(scopeTotal)}</span>
              <span className="text-sm text-secondary">Other cost sum: {fmt(partsTotalSum)}</span>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Scope total (on invoice)"
                value={form.laborTotal}
                onChange={(e) => setForm((f) => ({ ...f, laborTotal: e.target.value }))}
              />
              <Input
                label="Other cost total (on invoice)"
                value={form.partsTotal}
                onChange={(e) => setForm((f) => ({ ...f, partsTotal: e.target.value }))}
              />
            </div>
          </div>
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
        </Form>
      )}
    </Modal>

    {printOpen && printPayload && typeof document !== "undefined"
      ? createPortal(
          <div
            className="invoice-print-preview fixed inset-0 overflow-auto bg-card p-6 text-title"
            style={{ zIndex: (zIndex || 50) + 20 }}
          >
            <div className="no-print mb-4 flex justify-end gap-2 border-b border-border pb-4">
              <Button type="button" variant="outline" size="sm" onClick={runPrintDialog}>
                <FiPrinter className="mr-1.5 inline h-4 w-4" />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPrintOpen(false);
                  setPrintPayload(null);
                }}
              >
                Close
              </Button>
            </div>
            <InvoicePrintPreview
              invoice={printPayload.invoice}
              motorLabel={printPayload.motorLabel}
              fromShopName={printPayload.fromShopName}
              fromShopContact={printPayload.fromShopContact}
              fromBillingAddress={printPayload.fromBillingAddress}
              fromPaymentTermsLabel={printPayload.fromPaymentTermsLabel}
              customerToName={printPayload.customerToName}
              customerBillingAddress={printPayload.customerBillingAddress}
              invoicePaymentOptions={printPayload.invoicePaymentOptions}
              invoiceThankYouNote={printPayload.invoiceThankYouNote}
            />
          </div>,
          document.body
        )
      : null}
    </>
  );
}
