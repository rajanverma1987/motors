"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerPayload, customerApiToForm, INITIAL_CUSTOMER_FORM } from "@/lib/customer-record-form";
import { invoiceStatusLabel, invoiceStatusPillAppearance } from "@/lib/invoice-status";
import {
  invoiceStatusSelectOptionsFromMerged,
  quoteStatusSelectOptionsFromMerged,
  quoteStatusTileColorForValue,
  resolveConfiguredStatusSlug,
  resolveWorkOrderStatusDisplayLabel,
  workOrderStatusSelectOptionsFromMerged,
} from "@/lib/dropdown-catalog";
import { resolveStatusTileProps, resolveWorkOrderStatusTileProps } from "@/lib/work-order-status-tiles";
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

const SECTION_TITLE =
  "text-sm font-bold uppercase tracking-wide text-title";
const TH_CLASS =
  "sticky top-0 z-20 border-b border-border pl-[5px] pr-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary bg-card";
const TD_CLASS =
  "border-b border-border pl-[5px] pr-1 py-1.5 text-sm font-semibold text-title whitespace-nowrap";
const TABLE_WRAP = "min-h-0 flex-1 overflow-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[24rem] border-separate border-spacing-0 text-sm";
const THEAD_ROW = "";
const ACTIVITY_PANEL =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-border bg-card";
const ACTIVITY_PANEL_HEADER =
  "flex shrink-0 items-center justify-between gap-2 border-b border-border bg-primary/[0.05] px-3 py-2 dark:bg-primary/10";
const ACTIVITY_PANEL_BODY = "flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden p-2.5";

const STATUS_PILL_CLASS =
  "job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold";
const STATUS_PILL_SUMMARY_CLASS =
  "job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-3 py-1 text-sm font-bold";

/** Status totals strip — click a chip to filter the table (click again to clear). */
function StatusTotalsBar({ totals, moneyLabel, renderPill, selectedStatus = null, onSelectStatus }) {
  if (!Array.isArray(totals) || totals.length === 0) return null;
  return (
    <div className="rounded-sm border border-border/70 bg-muted/25 p-2 dark:bg-primary/[0.07]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary">
          Totals by status
        </p>
        {selectedStatus ? (
          <button
            type="button"
            className="text-[10px] font-semibold text-primary hover:underline"
            onClick={() => onSelectStatus?.(null)}
          >
            Clear filter
          </button>
        ) : (
          <span className="text-[10px] text-secondary">Click to filter</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {totals.map((s) => {
          const active = selectedStatus === s.status;
          return (
            <button
              key={s.status}
              type="button"
              onClick={() => onSelectStatus?.(active ? null : s.status)}
              aria-pressed={active}
              title={active ? "Clear status filter" : `Filter table by ${s.status}`}
              className={`inline-flex items-center gap-2.5 rounded-sm border bg-card py-1.5 pl-1.5 pr-3 shadow-sm transition-[border-color,box-shadow,background-color] ${
                active
                  ? "border-primary ring-2 ring-primary/25"
                  : "border-border hover:border-primary/50 hover:bg-primary/[0.04]"
              }`}
            >
              <span className="min-w-0 shrink pointer-events-none">{renderPill(s.status)}</span>
              <span
                className="border-l border-border pl-3 text-base font-bold tabular-nums tracking-tight text-title"
                title="Status total"
              >
                {moneyLabel(s.amount)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Collapse CSV/label/slug variants so summary pills don't duplicate the same status. */
function activityStatusGroupKey(raw, mergedSettings) {
  const resolved = resolveConfiguredStatusSlug(raw, mergedSettings);
  return (
    String(resolved || raw || "draft")
      .trim()
      .toLowerCase()
      .replace(/^invoice:/, "") || "draft"
  );
}

function InvoiceStatusPill({ status, mergedSettings, large = false }) {
  const key = activityStatusGroupKey(status, mergedSettings);
  const pill = invoiceStatusPillAppearance(key, mergedSettings);
  const label = invoiceStatusLabel(key, mergedSettings);
  return (
    <span
      className={`${large ? STATUS_PILL_SUMMARY_CLASS : STATUS_PILL_CLASS} ${pill.className}`}
      style={pill.style}
    >
      {label}
    </span>
  );
}

function QuoteStatusPill({ status, mergedSettings, large = false }) {
  const s = activityStatusGroupKey(status, mergedSettings);
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
    <span
      className={`${large ? STATUS_PILL_SUMMARY_CLASS : STATUS_PILL_CLASS} ${pill.className}`}
      style={pill.style}
    >
      {label}
    </span>
  );
}

function JobStatusPill({ jobStatus, mergedSettings }) {
  const raw = String(jobStatus || "").trim();
  if (!raw) return <span className="text-secondary">—</span>;
  const opts = workOrderStatusSelectOptionsFromMerged(mergedSettings);
  const idx = opts.findIndex((o) => String(o.value).toLowerCase() === raw.toLowerCase());
  const pill = resolveWorkOrderStatusTileProps(
    raw,
    idx >= 0 ? idx : 0,
    mergedSettings?.workOrderStatusTileColors || {}
  );
  const label = resolveWorkOrderStatusDisplayLabel(raw, mergedSettings);
  return (
    <span className={`${STATUS_PILL_CLASS} ${pill.className || ""}`} style={pill.style || undefined}>
      {label}
    </span>
  );
}

function CustomerActivityTableBody({ loading, isEmpty, emptyMessage, children }) {
  if (loading) {
    return (
      <div
        className="flex min-h-[4.5rem] flex-1 items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-primary/[0.03] py-5 dark:bg-primary/10"
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
    return (
      <div className="flex min-h-[4.5rem] flex-1 items-center justify-center rounded-sm border border-dashed border-border bg-muted/20 px-3 py-5">
        <p className="text-xs font-medium text-secondary">{emptyMessage}</p>
      </div>
    );
  }
  return children;
}

function statusAmountSummary(rows, getAmount, normalizeKey) {
  const totals = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const raw = String(row?.status || "draft").trim() || "draft";
    const status = typeof normalizeKey === "function" ? normalizeKey(raw) : raw.toLowerCase();
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
  const formatDate = useFormatDate();
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
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState(null);
  const [quoteStatusFilter, setQuoteStatusFilter] = useState(null);

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
      setInvoiceStatusFilter(null);
      setQuoteStatusFilter(null);
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
    setInvoiceStatusFilter(null);
    setQuoteStatusFilter(null);
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

  const invoiceStatusTotals = statusAmountSummary(activity.invoices, activityRowAmount, (raw) =>
    activityStatusGroupKey(raw, mergedSettings)
  );
  const quoteStatusTotals = statusAmountSummary(activity.quotes, activityRowAmount, (raw) =>
    activityStatusGroupKey(raw, mergedSettings)
  );

  const filteredInvoices = useMemo(() => {
    if (!invoiceStatusFilter) return activity.invoices;
    return activity.invoices.filter(
      (row) => activityStatusGroupKey(row?.status, mergedSettings) === invoiceStatusFilter
    );
  }, [activity.invoices, invoiceStatusFilter, mergedSettings]);

  const filteredQuotes = useMemo(() => {
    if (!quoteStatusFilter) return activity.quotes;
    return activity.quotes.filter(
      (row) => activityStatusGroupKey(row?.status, mergedSettings) === quoteStatusFilter
    );
  }, [activity.quotes, quoteStatusFilter, mergedSettings]);

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
      toast.error("Customer is required.");
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
        width="min(1480px, 98vw)"
        height="min(90vh, 920px)"
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
          <div className="relative min-h-0 h-auto lg:h-full">
            {/* Tablet: one scroll (modal body). Desktop: split panes with independent scroll. */}
            <div className="flex flex-col gap-5 lg:absolute lg:inset-0 lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)] lg:grid-rows-1 lg:gap-5 lg:overflow-hidden">
            <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
              <Form
                id={CUSTOMER_VIEW_FORM_ID}
                onSubmit={handleCustomerSave}
                className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
              >
                <SimpleCustomerFormFields
                  form={form}
                  setForm={setForm}
                  layout="stacked"
                  customerId={String(customer?.id || resolvedId || "").trim()}
                />
              </Form>
            </div>

            <div className="flex min-h-0 min-w-0 flex-col gap-4 lg:overflow-hidden">
              <div className={`${ACTIVITY_PANEL} max-h-[min(42vh,22rem)] lg:max-h-none`}>
                <div className={ACTIVITY_PANEL_HEADER}>
                  <h3 className={SECTION_TITLE}>
                    Invoices (
                    {activityLoading
                      ? "…"
                      : invoiceStatusFilter
                        ? `${filteredInvoices.length}/${activity.invoices.length}`
                        : activity.invoices.length}
                    )
                  </h3>
                </div>
                <div className={ACTIVITY_PANEL_BODY}>
                  {!activityLoading ? (
                    <div className="shrink-0">
                      <StatusTotalsBar
                        totals={invoiceStatusTotals}
                        moneyLabel={moneyLabel}
                        selectedStatus={invoiceStatusFilter}
                        onSelectStatus={setInvoiceStatusFilter}
                        renderPill={(status) => (
                          <InvoiceStatusPill status={status} mergedSettings={mergedSettings} large />
                        )}
                      />
                    </div>
                  ) : null}
                  <CustomerActivityTableBody
                    loading={activityLoading}
                    isEmpty={filteredInvoices.length === 0}
                    emptyMessage={
                      invoiceStatusFilter
                        ? "No invoices with this status."
                        : "No invoices found."
                    }
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
                          {filteredInvoices.map((inv) => (
                            <tr key={inv.id} className="last:[&>td]:border-b-0">
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
                                {formatDate(
                                  inv.date || inv.dateCreated || inv.invoiceSubmitDate
                                ) || "—"}
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
              </div>

              <div className={`${ACTIVITY_PANEL} max-h-[min(42vh,22rem)] lg:max-h-none`}>
                <div className={ACTIVITY_PANEL_HEADER}>
                  <h3 className={SECTION_TITLE}>
                    Quotes (
                    {activityLoading
                      ? "…"
                      : quoteStatusFilter
                        ? `${filteredQuotes.length}/${activity.quotes.length}`
                        : activity.quotes.length}
                    )
                  </h3>
                </div>
                <div className={ACTIVITY_PANEL_BODY}>
                  {!activityLoading ? (
                    <div className="shrink-0">
                      <StatusTotalsBar
                        totals={quoteStatusTotals}
                        moneyLabel={moneyLabel}
                        selectedStatus={quoteStatusFilter}
                        onSelectStatus={setQuoteStatusFilter}
                        renderPill={(status) => (
                          <QuoteStatusPill status={status} mergedSettings={mergedSettings} large />
                        )}
                      />
                    </div>
                  ) : null}
                  <CustomerActivityTableBody
                    loading={activityLoading}
                    isEmpty={filteredQuotes.length === 0}
                    emptyMessage={
                      quoteStatusFilter ? "No quotes with this status." : "No quotes found."
                    }
                  >
                    <div className={TABLE_WRAP}>
                      <table className={TABLE_CLASS}>
                        <thead>
                          <tr className={THEAD_ROW}>
                            <th className={TH_CLASS}>RFQ #</th>
                            <th className={TH_CLASS}>Date</th>
                            <th className={TH_CLASS}>Status</th>
                            <th className={TH_CLASS}>Job Status</th>
                            <th className={`${TH_CLASS} text-right`}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQuotes.map((q) => (
                            <tr key={q.id} className="last:[&>td]:border-b-0">
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
                              <td className={TD_CLASS}>
                                {formatDate(q.date || q.dateCreated) || "—"}
                              </td>
                              <td className={TD_CLASS}>
                                <QuoteStatusPill status={q.status} mergedSettings={mergedSettings} />
                              </td>
                              <td className={TD_CLASS}>
                                <JobStatusPill
                                  jobStatus={q.jobStatus}
                                  mergedSettings={mergedSettings}
                                />
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
