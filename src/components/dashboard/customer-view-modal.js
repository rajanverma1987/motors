"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerPayload, customerApiToForm, INITIAL_CUSTOMER_FORM } from "@/lib/customer-record-form";
import { invoiceStatusLabel, invoiceStatusPillAppearance } from "@/lib/invoice-status";
import {
  invoiceStatusSelectOptionsFromMerged,
  quoteStatusSelectOptionsFromMerged,
  quoteStatusTileColorForValue,
} from "@/lib/dropdown-catalog";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import SimpleCustomerFormFields from "@/components/simple/simple-customer-form-fields";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import QuoteFormModal from "@/components/dashboard/quote-form-modal";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  formToServiceProposalListRow,
  isSimpleInvoiceRecord,
} from "@/lib/simple-service-proposal-form";
import { saveSimpleServiceProposal } from "@/lib/simple-portal-api";

const CUSTOMER_VIEW_FORM_ID = "customer-view-edit-form";

const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";
const TH_CLASS =
  "pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary";
const TD_CLASS = "pl-[5px] pr-1 py-1 text-sm text-title whitespace-nowrap";
const TABLE_WRAP = "overflow-x-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[20rem] border-collapse text-sm";
const THEAD_ROW = "border-b border-border bg-primary/[0.06] dark:bg-primary/10";

const STATUS_PILL_CLASS =
  "job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-medium";

function InvoiceStatusPill({ status, mergedSettings }) {
  const pill = invoiceStatusPillAppearance(status, mergedSettings);
  const label = invoiceStatusLabel(status, mergedSettings);
  return (
    <span className={`${STATUS_PILL_CLASS} ${pill.className}`} style={pill.style}>
      {label}
    </span>
  );
}

function QuoteStatusPill({ status, mergedSettings }) {
  const s = String(status || "draft").toLowerCase();
  const opts = quoteStatusSelectOptionsFromMerged(mergedSettings);
  const optIdx = opts.findIndex((o) => String(o.value).toLowerCase() === s);
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
    opts.find((o) => String(o.value).toLowerCase() === s)?.label ??
    (s ? s.charAt(0).toUpperCase() + s.slice(1) : "—");
  return (
    <span className={`${STATUS_PILL_CLASS} ${pill.className}`} style={pill.style}>
      {label}
    </span>
  );
}

function CustomerActivityTableBody({ loading, isEmpty, emptyMessage, children }) {
  if (loading) {
    return (
      <div
        className="flex min-h-[4.5rem] items-center justify-center gap-2 rounded-sm border border-border bg-primary/[0.03] py-5 dark:bg-primary/10"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span
          className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden
        />
        <span className="text-xs text-secondary">Loading…</span>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="text-xs text-secondary">{emptyMessage}</p>;
  }
  return children;
}

function statusAmountSummary(rows, getAmount) {
  const totals = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const status = String(row?.status || "draft").trim() || "draft";
    const amount = Number.parseFloat(String(getAmount(row) ?? "0"));
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    totals.set(status, (totals.get(status) || 0) + safeAmount);
  });
  return Array.from(totals.entries()).map(([status, amount]) => ({ status, amount }));
}

function activityRowAmount(row) {
  const direct = Number(row?.total);
  if (Number.isFinite(direct)) return direct;
  const labor = Number(row?.laborTotal || 0);
  const parts = Number(row?.partsTotal || 0);
  if (Number.isFinite(labor) || Number.isFinite(parts)) return (labor || 0) + (parts || 0);
  return 0;
}

/**
 * Full customer details modal — profile + invoices/quotes activity.
 * @param {"classic"|"simple"} [portal] — Simple opens full Service Proposal form for RFQ# / invoices.
 */
export default function CustomerViewModal({
  open,
  customerId,
  onClose,
  zIndex = 100,
  onCustomerUpdated,
  portal = "classic",
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const isSimple = portal === "simple";

  const invoiceStatusValues = useMemo(
    () => invoiceStatusSelectOptionsFromMerged(mergedSettings).map((o) => o.value),
    [mergedSettings]
  );
  const quoteStatusValues = useMemo(
    () => quoteStatusSelectOptionsFromMerged(mergedSettings).map((o) => o.value),
    [mergedSettings]
  );

  const [loadingCustomerId, setLoadingCustomerId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(INITIAL_CUSTOMER_FORM);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState({ quotes: [], invoices: [] });

  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [openSimpleRecord, setOpenSimpleRecord] = useState(null);

  const openRecordBtnClass =
    "font-mono text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

  const resolvedId = String(customerId || customer?.id || "").trim();

  const refreshActivity = useCallback(async (cid) => {
    const id = String(cid || "").trim();
    if (!id) return;
    setActivityLoading(true);
    try {
      if (isSimple) {
        const list = await fetchAllPaginatedDashboardItems("/api/dashboard/simple-service-proposals");
        const forCustomer = (Array.isArray(list) ? list : []).filter(
          (row) => String(row?.customerId || "").trim() === id
        );
        const invoices = [];
        const quotes = [];
        for (const row of forCustomer) {
          if (isSimpleInvoiceRecord(row, invoiceStatusValues, quoteStatusValues)) {
            invoices.push(row);
          } else {
            quotes.push(row);
          }
        }
        setActivity({ quotes, invoices });
        return;
      }

      const [quotesRes, invoicesRes] = await Promise.all([
        fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }),
      ]);
      const [quotesData, invoicesData] = await Promise.all([
        quotesRes.json().catch(() => []),
        invoicesRes.json().catch(() => []),
      ]);
      const invoiceQuoteIds = new Set(
        (Array.isArray(invoicesData) ? invoicesData : [])
          .map((inv) => String(inv?.quoteId || "").trim())
          .filter(Boolean)
      );
      const visibleQuotes = (Array.isArray(quotesData) ? quotesData : []).filter(
        (q) => !invoiceQuoteIds.has(String(q?.id || "").trim())
      );
      setActivity({
        quotes: visibleQuotes.filter((q) => String(q.customerId || "") === id),
        invoices: Array.isArray(invoicesData)
          ? invoicesData.filter((inv) => String(inv.customerId || "") === id)
          : [],
      });
    } finally {
      setActivityLoading(false);
    }
  }, [isSimple, invoiceStatusValues, quoteStatusValues]);

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setForm(INITIAL_CUSTOMER_FORM);
      setLoadingCustomerId(null);
      setActivity({ quotes: [], invoices: [] });
      setActivityLoading(false);
      setOpenInvoiceId(null);
      setOpenQuoteId(null);
      setOpenSimpleRecord(null);
      return;
    }
    const id = String(customerId || "").trim();
    if (!id) return;
    let cancelled = false;
    setLoadingCustomerId(id);
    setCustomer(null);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/customers/${id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          toast.error("Failed to load customer");
          onClose?.();
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setCustomer(data);
        setForm(customerApiToForm(data));
        setLoadingCustomerId(null);
      } catch {
        if (!cancelled) {
          toast.error("Failed to load customer");
          onClose?.();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customerId, toast, onClose]);

  useEffect(() => {
    if (!open || !customer?.id || loadingCustomerId) return;
    refreshActivity(customer.id);
  }, [open, customer?.id, loadingCustomerId, refreshActivity]);

  const moneyLabel = (v) => {
    const n = Number.parseFloat(String(v ?? ""));
    return Number.isFinite(n) ? formatMoney(n) : "—";
  };

  const invoiceStatusTotals = statusAmountSummary(activity.invoices, activityRowAmount);
  const quoteStatusTotals = statusAmountSummary(activity.quotes, activityRowAmount);

  const openSimpleProposal = (row) => {
    if (!row?.id) return;
    setOpenSimpleRecord(row);
  };

  const handleSimpleProposalSave = async (nextForm, options = {}) => {
    const companyName =
      String(customer?.companyName || "").trim() ||
      String(nextForm?.companyName || "").trim();
    const row = formToServiceProposalListRow(nextForm, {
      id: options.forceNew ? undefined : nextForm.id,
      companyName,
    });
    const saved = await saveSimpleServiceProposal(row, { forceNew: Boolean(options.forceNew) });
    if (resolvedId) await refreshActivity(resolvedId);
    return saved;
  };

  const handleClose = () => {
    queueMicrotask(() => {
      onClose?.();
    });
  };

  const handleCustomerSave = async (e) => {
    e.preventDefault();
    const id = String(customer?.id || resolvedId || "").trim();
    const current = formRef.current;
    if (!id || !current.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSavingCustomer(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(current)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Customer updated.");
      const updated = data.customer || data;
      setCustomer(updated);
      setForm(customerApiToForm(updated));
      onCustomerUpdated?.(updated);
    } catch (err) {
      toast.error(err.message || "Failed to update customer");
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Customer details"
        size="7xl"
        width="min(1200px, 96vw)"
        height="min(88vh, 900px)"
        zIndex={zIndex}
        actions={
          customer ? (
            <Button
              type="submit"
              form={CUSTOMER_VIEW_FORM_ID}
              variant="primary"
              size="sm"
              disabled={savingCustomer}
            >
              {savingCustomer ? "Saving…" : "Save"}
            </Button>
          ) : null
        }
      >
        {loadingCustomerId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-sm text-secondary">Loading…</span>
          </div>
        ) : customer ? (
          <div className="grid min-h-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              <Form
                id={CUSTOMER_VIEW_FORM_ID}
                onSubmit={handleCustomerSave}
                className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
              >
                <SimpleCustomerFormFields form={form} setForm={setForm} layout="stacked" />
              </Form>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <div className="flex min-w-0 flex-col gap-2">
                <p className={SECTION_TITLE}>
                  Invoices ({activityLoading ? "…" : activity.invoices.length})
                </p>
                {!activityLoading && invoiceStatusTotals.length > 0 ? (
                  <div className="mb-0.5 flex flex-wrap gap-1.5">
                    {invoiceStatusTotals.map((s) => (
                      <span key={`inv-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                        <InvoiceStatusPill status={s.status} mergedSettings={mergedSettings} />
                        <span className="text-xs font-semibold text-title">{moneyLabel(s.amount)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <CustomerActivityTableBody
                  loading={activityLoading}
                  isEmpty={activity.invoices.length === 0}
                  emptyMessage="No invoices found."
                >
                  <div className={TABLE_WRAP}>
                    <table className={TABLE_CLASS}>
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH_CLASS}>Invoice #</th>
                          <th className={TH_CLASS}>Date</th>
                          <th className={TH_CLASS}>Status</th>
                          <th className={`${TH_CLASS} text-right`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-border last:border-b-0">
                            <td className={TD_CLASS}>
                              {inv?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() =>
                                    isSimple ? openSimpleProposal(inv) : setOpenInvoiceId(inv.id)
                                  }
                                  title="Open invoice"
                                >
                                  {isSimple
                                    ? inv.documentNumber || inv.quote || inv.invoiceNumber || "—"
                                    : inv.invoiceNumber || "—"}
                                </button>
                              ) : (
                                (isSimple ? inv.documentNumber : inv.invoiceNumber) || "—"
                              )}
                            </td>
                            <td className={TD_CLASS}>
                              {inv.date || inv.dateCreated || inv.invoiceSubmitDate || "—"}
                            </td>
                            <td className={TD_CLASS}>
                              <InvoiceStatusPill status={inv.status} mergedSettings={mergedSettings} />
                            </td>
                            <td className={`${TD_CLASS} text-right`}>
                              {moneyLabel(activityRowAmount(inv))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CustomerActivityTableBody>
              </div>

              <div className="flex min-w-0 flex-col gap-2">
                <p className={SECTION_TITLE}>
                  Quotes ({activityLoading ? "…" : activity.quotes.length})
                </p>
                {!activityLoading && quoteStatusTotals.length > 0 ? (
                  <div className="mb-0.5 flex flex-wrap gap-1.5">
                    {quoteStatusTotals.map((s) => (
                      <span key={`quote-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                        <QuoteStatusPill status={s.status} mergedSettings={mergedSettings} />
                        <span className="text-xs font-semibold text-title">{moneyLabel(s.amount)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <CustomerActivityTableBody
                  loading={activityLoading}
                  isEmpty={activity.quotes.length === 0}
                  emptyMessage="No quotes found."
                >
                  <div className={TABLE_WRAP}>
                    <table className={TABLE_CLASS}>
                      <thead>
                        <tr className={THEAD_ROW}>
                          <th className={TH_CLASS}>RFQ #</th>
                          <th className={TH_CLASS}>Date</th>
                          <th className={TH_CLASS}>Status</th>
                          <th className={`${TH_CLASS} text-right`}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.quotes.map((q) => (
                          <tr key={q.id} className="border-b border-border last:border-b-0">
                            <td className={TD_CLASS}>
                              {q?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() =>
                                    isSimple ? openSimpleProposal(q) : setOpenQuoteId(q.id)
                                  }
                                  title={isSimple ? "Open service proposal" : "Open RFQ"}
                                >
                                  {isSimple
                                    ? q.documentNumber || q.quote || q.rfqNumber || "—"
                                    : q.rfqNumber || "—"}
                                </button>
                              ) : (
                                (isSimple ? q.documentNumber || q.quote : q.rfqNumber) || "—"
                              )}
                            </td>
                            <td className={TD_CLASS}>{q.date || q.dateCreated || "—"}</td>
                            <td className={TD_CLASS}>
                              <QuoteStatusPill status={q.status} mergedSettings={mergedSettings} />
                            </td>
                            <td className={`${TD_CLASS} text-right`}>
                              {moneyLabel(activityRowAmount(q))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CustomerActivityTableBody>
              </div>

            </div>
          </div>
        ) : null}
      </Modal>

      {!isSimple ? (
        <InvoiceFormModal
          open={!!openInvoiceId}
          invoiceId={openInvoiceId}
          onClose={() => setOpenInvoiceId(null)}
          onAfterSave={() => {
            setOpenInvoiceId(null);
            if (resolvedId) refreshActivity(resolvedId);
          }}
          zIndex={zIndex + 20}
        />
      ) : null}

      {!isSimple ? (
        <QuoteFormModal
          open={!!openQuoteId}
          quoteId={openQuoteId}
          onClose={() => setOpenQuoteId(null)}
          onAfterSave={() => {
            setOpenQuoteId(null);
            if (resolvedId) refreshActivity(resolvedId);
          }}
          zIndex={zIndex + 25}
        />
      ) : null}

      {isSimple ? (
        <ServiceProposalFormModal
          open={!!openSimpleRecord}
          onClose={() => setOpenSimpleRecord(null)}
          initialForm={openSimpleRecord}
          onSave={handleSimpleProposalSave}
          onAttachmentsChange={async (recordId, attachments) => {
            const id = String(recordId || "").trim();
            if (!id) return;
            const current =
              activity.quotes.find((r) => String(r.id) === id) ||
              activity.invoices.find((r) => String(r.id) === id) ||
              openSimpleRecord;
            if (!current) return;
            const nextRow = { ...current, attachments: Array.isArray(attachments) ? attachments : [] };
            await saveSimpleServiceProposal(nextRow);
            setOpenSimpleRecord((prev) =>
              prev && String(prev.id) === id ? { ...prev, attachments: nextRow.attachments } : prev
            );
            if (resolvedId) await refreshActivity(resolvedId);
          }}
        />
      ) : null}
    </>
  );
}
