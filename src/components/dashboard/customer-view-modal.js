"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerPayload, customerApiToForm, INITIAL_CUSTOMER_FORM } from "@/lib/customer-record-form";
import { invoiceStatusLabel } from "@/lib/invoice-status";
import {
  OTHER_STATUS_ALL,
  invoiceStatusSelectOptionsFromMerged,
  invoiceStatusTileColorForValue,
  otherStatusTileColorForValue,
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
  "text-xs font-semibold uppercase tracking-[0.06em] text-title";
const TH_CLASS =
  "sticky top-0 z-20 border-b border-border bg-muted/40 px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.05em] text-secondary";
const TD_CLASS =
  "border-b border-border px-2 py-1.5 text-[12px] font-medium leading-snug text-title whitespace-nowrap";
const TD_MUTED_CLASS =
  "border-b border-border px-2 py-1.5 text-[11px] font-medium leading-snug text-secondary whitespace-nowrap";
const TD_STATUS_INNER =
  "block px-2 py-1.5 text-[12px] font-semibold leading-snug whitespace-nowrap";
const TABLE_WRAP = "min-h-0 flex-1 overflow-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[28rem] border-separate border-spacing-0 text-[12px]";
const THEAD_ROW = "";
const ACTIVITY_PANEL =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-border bg-card";
const ACTIVITY_PANEL_HEADER =
  "flex shrink-0 items-center justify-between gap-2 border-b border-border bg-primary/[0.04] px-3 py-1.5 dark:bg-primary/10";
const ACTIVITY_PANEL_BODY = "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-2";

/** Collapse CSV/label/slug variants so summary cards don't duplicate the same status. */
function activityStatusGroupKey(raw, mergedSettings) {
  const resolved = resolveConfiguredStatusSlug(raw, mergedSettings);
  return (
    String(resolved || raw || "draft")
      .trim()
      .toLowerCase()
      .replace(/^invoice:/, "") || "draft"
  );
}

function resolveDocStatusAppearance(kind, status, mergedSettings) {
  const bare = activityStatusGroupKey(status, mergedSettings);
  if (kind === "invoice") {
    const opts = invoiceStatusSelectOptionsFromMerged(mergedSettings);
    const idx = opts.findIndex((o) => String(o.value).toLowerCase() === bare);
    const { tileColor, tileBgColor, tileTextColor, index } = invoiceStatusTileColorForValue(
      mergedSettings,
      bare,
      idx >= 0 ? idx : 0
    );
    return {
      tileAppearance: resolveStatusTileProps(tileColor, index, {
        tileBgColor,
        tileTextColor,
        tileColor,
      }),
      label: invoiceStatusLabel(bare, mergedSettings),
    };
  }
  const opts = quoteStatusSelectOptionsFromMerged(mergedSettings);
  const optIdx = opts.findIndex((o) => String(o.value).toLowerCase() === bare);
  const { tileColor, tileBgColor, tileTextColor, index } = quoteStatusTileColorForValue(
    mergedSettings,
    bare,
    optIdx >= 0 ? optIdx : 0
  );
  const label =
    opts.find((o) => String(o.value).toLowerCase() === bare)?.label ??
    (bare ? bare.charAt(0).toUpperCase() + bare.slice(1) : "Draft");
  return {
    tileAppearance: resolveStatusTileProps(tileColor, index, {
      tileBgColor,
      tileTextColor,
      tileColor,
    }),
    label,
  };
}

function docStatusCellChrome(kind, status, mergedSettings) {
  const { tileAppearance, label } = resolveDocStatusAppearance(kind, status, mergedSettings);
  return {
    style: tileAppearance.style || null,
    className: `!p-0 ${tileAppearance.className || ""}`.trim(),
    label,
  };
}

function jobStatusCellChrome(jobStatus, mergedSettings) {
  const raw = String(jobStatus || "").trim();
  if (!raw) return { style: null, className: "!p-0", label: "-" };
  const opts = workOrderStatusSelectOptionsFromMerged(mergedSettings);
  const idx = opts.findIndex((o) => String(o.value).toLowerCase() === raw.toLowerCase());
  const pill = resolveWorkOrderStatusTileProps(
    raw,
    idx >= 0 ? idx : 0,
    mergedSettings?.workOrderStatusTileColors || {}
  );
  return {
    style: pill.style || null,
    className: `!p-0 ${pill.className || ""}`.trim(),
    label: resolveWorkOrderStatusDisplayLabel(raw, mergedSettings),
  };
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
    const prev = totals.get(status) || { amount: 0, count: 0 };
    totals.set(status, { amount: prev.amount + safeAmount, count: prev.count + 1 });
  });
  return Array.from(totals.entries()).map(([status, { amount, count }]) => ({
    status,
    amount,
    count,
  }));
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
  const [activityStatusFilter, setActivityStatusFilter] = useState(null);

  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [openSimpleRecordId, setOpenSimpleRecordId] = useState(null);

  const openRecordBtnClass =
    "font-mono text-[12px] font-medium text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

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
      setActivityStatusFilter(null);
      setOpenInvoiceId(null);
      setOpenQuoteId(null);
      setOpenSimpleRecordId(null);
      return;
    }
    const id = String(customerId || "").trim();
    if (!id) return;
    let cancelled = false;
    setLoadingCustomerId(id);
    setCustomer(null);
    setActivityStatusFilter(null);
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

  const activityRows = useMemo(() => {
    const invoiceRows = (Array.isArray(activity.invoices) ? activity.invoices : []).map((inv) => ({
      kind: "invoice",
      id: String(inv?.id || ""),
      docNumber: isSimple
        ? inv.documentNumber || inv.quote || inv.invoiceNumber || "—"
        : inv.invoiceNumber || "—",
      dateRaw: inv.date || inv.dateCreated || inv.invoiceSubmitDate,
      status: inv.status,
      jobStatus: inv.jobStatus || "",
      amount: activityRowAmount(inv),
      raw: inv,
    }));
    const quoteRows = (Array.isArray(activity.quotes) ? activity.quotes : []).map((q) => ({
      kind: "quote",
      id: String(q?.id || ""),
      docNumber: isSimple
        ? q.documentNumber || q.quote || q.rfqNumber || "—"
        : q.rfqNumber || "—",
      dateRaw: q.date || q.dateCreated,
      status: q.status,
      jobStatus: q.jobStatus || "",
      amount: activityRowAmount(q),
      raw: q,
    }));
    return [...invoiceRows, ...quoteRows].sort((a, b) => {
      const ta = Date.parse(String(a.dateRaw || "")) || 0;
      const tb = Date.parse(String(b.dateRaw || "")) || 0;
      return tb - ta;
    });
  }, [activity.invoices, activity.quotes, isSimple]);

  const combinedStatusTotals = useMemo(() => {
    const invoiceTotals = statusAmountSummary(activity.invoices, activityRowAmount, (raw) =>
      activityStatusGroupKey(raw, mergedSettings)
    ).map((t) => ({
      ...t,
      kind: "invoice",
      key: `invoice:${t.status}`,
    }));
    const quoteTotals = statusAmountSummary(activity.quotes, activityRowAmount, (raw) =>
      activityStatusGroupKey(raw, mergedSettings)
    ).map((t) => ({
      ...t,
      kind: "quote",
      key: `quote:${t.status}`,
    }));
    return [...quoteTotals, ...invoiceTotals];
  }, [activity.invoices, activity.quotes, mergedSettings]);

  const statusFilterCards = useMemo(() => {
    const allTile = otherStatusTileColorForValue(mergedSettings, OTHER_STATUS_ALL, 0);
    const cards = [
      {
        key: "",
        label: allTile.label || "All",
        tileAppearance: resolveStatusTileProps(allTile.tileColor, allTile.index, {
          tileBgColor: allTile.tileBgColor,
          tileTextColor: allTile.tileTextColor,
          tileColor: allTile.tileColor,
        }),
      },
    ];
    for (const t of combinedStatusTotals) {
      const { tileAppearance, label } = resolveDocStatusAppearance(
        t.kind,
        t.status,
        mergedSettings
      );
      cards.push({ key: t.key, label, tileAppearance });
    }
    return cards;
  }, [combinedStatusTotals, mergedSettings]);

  const filteredActivityRows = useMemo(() => {
    if (!activityStatusFilter) return activityRows;
    const sep = activityStatusFilter.indexOf(":");
    if (sep < 0) return activityRows;
    const kind = activityStatusFilter.slice(0, sep);
    const statusKey = activityStatusFilter.slice(sep + 1);
    return activityRows.filter(
      (row) =>
        row.kind === kind &&
        activityStatusGroupKey(row.status, mergedSettings) === statusKey
    );
  }, [activityRows, activityStatusFilter, mergedSettings]);

  const filteredSubtotal = useMemo(
    () =>
      filteredActivityRows.reduce((sum, row) => {
        const n = Number(row?.amount);
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0),
    [filteredActivityRows]
  );

  const openSimpleProposal = (row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    setOpenSimpleRecordId(id);
  };

  const editingSimpleRecord = useMemo(
    () => (openSimpleRecordId ? { id: openSimpleRecordId } : null),
    [openSimpleRecordId]
  );

  /** Navigate within this customer's activity list (same pattern as Master Search). */
  const clientRecordNavigation = useMemo(() => {
    if (!openSimpleRecordId || activityRows.length < 2) return null;
    const openIndex = activityRows.findIndex(
      (r) => String(r.id) === String(openSimpleRecordId)
    );
    if (openIndex < 0) return null;
    return {
      currentIndex: openIndex,
      total: activityRows.length,
      canPrevious: openIndex > 0,
      canNext: openIndex < activityRows.length - 1,
      onPrevious: () => {
        const prev = activityRows[openIndex - 1];
        const id = String(prev?.id || "").trim();
        if (id) setOpenSimpleRecordId(id);
      },
      onNext: () => {
        const next = activityRows[openIndex + 1];
        const id = String(next?.id || "").trim();
        if (id) setOpenSimpleRecordId(id);
      },
    };
  }, [openSimpleRecordId, activityRows]);

  const handleSimpleProposalSave = async (nextForm, options = {}) => {
    const companyName =
      String(customer?.companyName || "").trim() ||
      String(nextForm?.companyName || "").trim();
    const row = formToServiceProposalListRow(nextForm, {
      id: options.forceNew ? undefined : nextForm.id,
      companyName,
    });
    const saved = await saveSimpleServiceProposal(row, { forceNew: Boolean(options.forceNew) });
    const sid = String(saved?.id || nextForm?.id || "").trim();
    if (sid) setOpenSimpleRecordId(sid);
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
              <div className={`${ACTIVITY_PANEL} max-h-[min(70vh,40rem)] lg:max-h-none`}>
                <div className={ACTIVITY_PANEL_HEADER}>
                  <h3 className={SECTION_TITLE}>
                    Invoices & Quotes (
                    {activityLoading
                      ? "…"
                      : activityStatusFilter
                        ? `${filteredActivityRows.length}/${activityRows.length}`
                        : activityRows.length}
                    )
                  </h3>
                </div>
                <div className={ACTIVITY_PANEL_BODY}>
                  {!activityLoading && statusFilterCards.length > 1 ? (
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      {statusFilterCards.map((card) => {
                        const active = (activityStatusFilter || "") === (card.key || "");
                        const tile = card.tileAppearance || {};
                        return (
                          <button
                            key={card.key || "__all__"}
                            type="button"
                            aria-pressed={active}
                            onClick={() =>
                              setActivityStatusFilter(card.key ? card.key : null)
                            }
                            className={`inline-flex max-w-full items-center border px-2.5 py-1 text-left text-xs font-semibold leading-snug whitespace-normal break-words transition-[box-shadow,border-color] ${
                              active
                                ? "border-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
                                : "border-black/10 hover:border-black/25 dark:border-white/15 dark:hover:border-white/30"
                            } ${tile.className || ""}`}
                            style={tile.style || undefined}
                          >
                            {card.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <CustomerActivityTableBody
                    loading={activityLoading}
                    isEmpty={filteredActivityRows.length === 0}
                    emptyMessage={
                      activityStatusFilter
                        ? "No documents with this status."
                        : "No invoices or quotes found."
                    }
                  >
                    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                      <div className="flex shrink-0 items-baseline justify-end gap-2 px-1">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-secondary">
                          Subtotal
                        </span>
                        <span className="min-w-[5.5rem] text-right text-[12px] font-semibold tabular-nums text-title">
                          {moneyLabel(filteredSubtotal)}
                        </span>
                      </div>
                      <div className={TABLE_WRAP}>
                      <table className={TABLE_CLASS}>
                        <thead>
                          <tr className={THEAD_ROW}>
                            <th className={TH_CLASS}>Job#/Invoice#</th>
                            <th className={TH_CLASS}>Date</th>
                            <th className={TH_CLASS}>Status</th>
                            <th className={TH_CLASS}>Job Status</th>
                            <th className={`${TH_CLASS} text-right`}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredActivityRows.map((row) => {
                            const isInvoice = row.kind === "invoice";
                            const statusChrome = docStatusCellChrome(
                              row.kind,
                              row.status,
                              mergedSettings
                            );
                            const jobChrome = jobStatusCellChrome(
                              row.jobStatus,
                              mergedSettings
                            );
                            return (
                              <tr
                                key={`${row.kind}-${row.id || row.docNumber}`}
                                className="hover:bg-muted/25 last:[&>td]:border-b-0"
                              >
                                <td className={TD_CLASS}>
                                  {row.id ? (
                                    <button
                                      type="button"
                                      className={openRecordBtnClass}
                                      onClick={() => {
                                        if (isSimple) {
                                          openSimpleProposal(row.raw);
                                          return;
                                        }
                                        if (isInvoice) setOpenInvoiceId(row.id);
                                        else setOpenQuoteId(row.id);
                                      }}
                                      title={
                                        isInvoice
                                          ? "Open invoice"
                                          : isSimple
                                            ? "Open service proposal"
                                            : "Open RFQ"
                                      }
                                    >
                                      {row.docNumber}
                                    </button>
                                  ) : (
                                    <span className="font-mono text-[12px]">{row.docNumber}</span>
                                  )}
                                </td>
                                <td className={TD_MUTED_CLASS}>
                                  {formatDate(row.dateRaw) || "—"}
                                </td>
                                <td
                                  className={`border-b border-border ${statusChrome.className}`}
                                  style={statusChrome.style || undefined}
                                >
                                  <span className={TD_STATUS_INNER}>{statusChrome.label}</span>
                                </td>
                                <td
                                  className={`border-b border-border ${jobChrome.className}`}
                                  style={jobChrome.style || undefined}
                                >
                                  <span className={TD_STATUS_INNER}>{jobChrome.label}</span>
                                </td>
                                <td className={`${TD_CLASS} text-right tabular-nums`}>
                                  {moneyLabel(row.amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>
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
          open={Boolean(openSimpleRecordId)}
          onClose={() => setOpenSimpleRecordId(null)}
          initialForm={editingSimpleRecord}
          onSave={handleSimpleProposalSave}
          searchResultNavigation={clientRecordNavigation}
          onAttachmentsChange={async (recordId, attachments) => {
            const id = String(recordId || "").trim();
            if (!id) return;
            const current =
              activity.quotes.find((r) => String(r.id) === id) ||
              activity.invoices.find((r) => String(r.id) === id) ||
              { id };
            if (!current) return;
            const nextRow = { ...current, attachments: Array.isArray(attachments) ? attachments : [] };
            await saveSimpleServiceProposal(nextRow);
            if (resolvedId) await refreshActivity(resolvedId);
          }}
        />
      ) : null}
    </>
  );
}
