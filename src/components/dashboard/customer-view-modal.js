"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { buildCustomerPayload } from "@/lib/customer-record-form";
import { buildMotorPayload } from "@/lib/motor-record-form";
import { invoiceStatusLabel, invoiceStatusPillAppearance } from "@/lib/invoice-status";
import {
  quoteStatusSelectOptionsFromMerged,
  quoteStatusTileColorForValue,
} from "@/lib/dropdown-catalog";
import {
  resolveStatusTileProps,
  resolveWorkOrderStatusTileProps,
} from "@/lib/work-order-status-tiles";
import CustomerFormModal from "@/components/dashboard/customer-form-modal";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import QuoteQuickViewModal from "@/components/dashboard/quote-quick-view-modal";
import MotorQuickViewModal from "@/components/dashboard/motor-quick-view-modal";

const STATUS_PILL_CLASS =
  "job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-medium";

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

const INITIAL_MOTOR_FORM = {
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

function WorkOrderStatusPill({ status, mergedSettings }) {
  const label = status != null && String(status).trim() ? String(status).trim() : "—";
  if (label === "—") return <span className="text-secondary">—</span>;
  const statuses = Array.isArray(mergedSettings?.workOrderStatuses)
    ? mergedSettings.workOrderStatuses
    : [];
  const idx = statuses.findIndex((x) => String(x).trim() === label);
  const pill = resolveWorkOrderStatusTileProps(
    label,
    idx >= 0 ? idx : 0,
    mergedSettings?.workOrderStatusTileColors ?? {}
  );
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
        className="flex min-h-[7rem] items-center justify-center gap-2 rounded border border-border bg-form-bg/30 py-8"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span
          className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden
        />
        <span className="text-sm text-secondary">Loading…</span>
      </div>
    );
  }
  if (isEmpty) {
    return <p className="text-sm text-secondary">{emptyMessage}</p>;
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

/**
 * Full customer details modal — same as Customers page View (profile, activity, linked motors).
 */
export default function CustomerViewModal({
  open,
  customerId,
  onClose,
  zIndex = 100,
  onCustomerUpdated,
}) {
  const toast = useToast();
  const formatMoney = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const [loadingCustomerId, setLoadingCustomerId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activity, setActivity] = useState({ quotes: [], workOrders: [], invoices: [] });
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [removingContactIndex, setRemovingContactIndex] = useState(null);
  const [addMotorOpen, setAddMotorOpen] = useState(false);
  const [motorForm, setMotorForm] = useState(INITIAL_MOTOR_FORM);
  const [savingMotor, setSavingMotor] = useState(false);
  const motorFormRef = useRef(motorForm);
  motorFormRef.current = motorForm;

  const [openInvoiceId, setOpenInvoiceId] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [openWorkOrderId, setOpenWorkOrderId] = useState(null);
  const [openMotorId, setOpenMotorId] = useState(null);

  const openRecordBtnClass =
    "font-mono text-primary hover:underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded";

  const resolvedId = String(customerId || customer?.id || "").trim();

  const reloadCustomer = useCallback(async (id) => {
    const cid = String(id || "").trim();
    if (!cid) return null;
    const res = await fetch(`/api/dashboard/customers/${cid}`, {
      credentials: "include",
      cache: "no-store",
      headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    setCustomer(data);
    onCustomerUpdated?.(data);
    return data;
  }, [onCustomerUpdated]);

  const refreshActivity = useCallback(async (cid) => {
    const id = String(cid || "").trim();
    if (!id) return;
    setActivityLoading(true);
    try {
      const [quotesRes, workOrdersRes, invoicesRes] = await Promise.all([
        fetch("/api/dashboard/quotes", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/work-orders", { credentials: "include", cache: "no-store" }),
        fetch("/api/dashboard/invoices", { credentials: "include", cache: "no-store" }),
      ]);
      const [quotesData, workOrdersData, invoicesData] = await Promise.all([
        quotesRes.json().catch(() => []),
        workOrdersRes.json().catch(() => []),
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
      const quoteAmountById = new Map(
        (Array.isArray(quotesData) ? quotesData : []).map((q) => [
          String(q?.id || ""),
          Number(q?.laborTotal || 0) + Number(q?.partsTotal || 0),
        ])
      );
      setActivity({
        quotes: visibleQuotes.filter((q) => String(q.customerId || "") === id),
        workOrders: Array.isArray(workOrdersData)
          ? workOrdersData
              .filter((w) => String(w.customerId || "") === id)
              .map((w) => ({
                ...w,
                linkedQuoteAmount: quoteAmountById.get(String(w?.quoteId || "")) || 0,
              }))
          : [],
        invoices: Array.isArray(invoicesData)
          ? invoicesData.filter((inv) => String(inv.customerId || "") === id)
          : [],
      });
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setCustomer(null);
      setLoadingCustomerId(null);
      setActivity({ quotes: [], workOrders: [], invoices: [] });
      setActivityLoading(false);
      setAddMotorOpen(false);
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

  const invoiceStatusTotals = statusAmountSummary(
    activity.invoices,
    (inv) => Number(inv?.laborTotal || 0) + Number(inv?.partsTotal || 0)
  );
  const quoteStatusTotals = statusAmountSummary(
    activity.quotes,
    (q) => Number(q?.laborTotal || 0) + Number(q?.partsTotal || 0)
  );
  const workOrderStatusTotals = statusAmountSummary(
    activity.workOrders,
    (wo) => Number(wo?.linkedQuoteAmount || 0)
  );

  const handleClose = () => {
    queueMicrotask(() => {
      setAddMotorOpen(false);
      onClose?.();
    });
  };

  const removeAdditionalContact = async (contactIndex) => {
    if (!customer?.id || !Array.isArray(customer.additionalContacts)) return;
    const newContacts = customer.additionalContacts.filter((_, i) => i !== contactIndex);
    setRemovingContactIndex(contactIndex);
    try {
      const payload = buildCustomerPayload({
        ...customer,
        additionalContacts: newContacts,
      });
      const res = await fetch(`/api/dashboard/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Contact removed.");
      setCustomer(data.customer);
      onCustomerUpdated?.(data.customer);
    } catch (err) {
      toast.error(err.message || "Failed to remove contact");
    } finally {
      setRemovingContactIndex(null);
    }
  };

  const handleAddMotorSubmit = async (e) => {
    e.preventDefault();
    const current = motorFormRef.current;
    if (!current.customerId?.trim()) return;
    setSavingMotor(true);
    try {
      const res = await fetch("/api/dashboard/motors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildMotorPayload(current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create motor");
      toast.success("Customer's motor created and linked to this customer.");
      setAddMotorOpen(false);
      await reloadCustomer(customer?.id);
    } catch (err) {
      toast.error(err.message || "Failed to create motor");
    } finally {
      setSavingMotor(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Customer details"
        size="7xl"
        zIndex={zIndex}
        actions={
          customer ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setEditCustomerId(customer.id)}
            >
              Edit
            </Button>
          ) : null
        }
      >
        {loadingCustomerId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : customer ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)]">
            <div className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Customer profile</p>
                    <h3 className="mt-1 text-lg font-semibold text-title">{customer.companyName || "—"}</h3>
                    <p className="mt-1 text-sm text-secondary">
                      {customer.primaryContactName || "—"} · {customer.email || "—"} · {customer.phone || "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={customer.taxExempt === false ? "warning" : "success"}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      Tax exempted: {customer.taxExempt === false ? "No" : "Yes"}
                    </Badge>
                    <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                      Tax %: {customer.taxExempt === false ? customer.taxPercent || "0" : "0"}
                    </Badge>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-secondary">EIN</dt>
                    <dd className="font-medium text-title">{customer.ein || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Credit limit</dt>
                    <dd className="font-medium text-title">{customer.creditLimit || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">City</dt>
                    <dd className="text-title">{customer.city || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">State</dt>
                    <dd className="text-title">{customer.state || "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Billing address</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-secondary">Street</dt>
                    <dd className="text-title">{customer.address || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">City</dt>
                    <dd className="text-title">{customer.city || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">State</dt>
                    <dd className="text-title">{customer.state || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Zip code</dt>
                    <dd className="text-title">{customer.zipCode || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Country</dt>
                    <dd className="text-title">{customer.country || "—"}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Shipping address</h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-secondary">Street</dt>
                    <dd className="text-title">{customer.shippingAddress || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">City</dt>
                    <dd className="text-title">{customer.shippingCity || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">State</dt>
                    <dd className="text-title">{customer.shippingState || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Zip code</dt>
                    <dd className="text-title">{customer.shippingZipCode || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-secondary">Country</dt>
                    <dd className="text-title">{customer.shippingCountry || "—"}</dd>
                  </div>
                </dl>
              </div>
              {(customer.notes || "").trim() ? (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                  <p className="whitespace-pre-wrap text-sm text-title">{customer.notes}</p>
                </div>
              ) : null}
              {Array.isArray(customer.additionalContacts) && customer.additionalContacts.length > 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                    Additional contacts
                  </h3>
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Name
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Phone
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Email
                          </th>
                          <th className="w-24 px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {customer.additionalContacts.map((ac, i) => (
                          <tr key={i} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">{ac.contactName || "—"}</td>
                            <td className="px-3 py-2">{ac.phone || "—"}</td>
                            <td className="px-3 py-2">{ac.email || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditCustomerId(customer.id)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeAdditionalContact(i)}
                                  disabled={removingContactIndex !== null}
                                >
                                  {removingContactIndex === i ? "Removing…" : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Linked motors</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMotorForm({ ...INITIAL_MOTOR_FORM, customerId: customer.id });
                      setAddMotorOpen(true);
                    }}
                  >
                    Add customer&apos;s motor
                  </Button>
                </div>
                {Array.isArray(customer.linkedMotors) && customer.linkedMotors.length > 0 ? (
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Serial number
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Manufacturer
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Model
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            HP
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {customer.linkedMotors.map((m) => (
                          <tr key={m.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              {m?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() => setOpenMotorId(m.id)}
                                  title="Open motor"
                                >
                                  {m.serialNumber || "—"}
                                </button>
                              ) : (
                                m.serialNumber || "—"
                              )}
                            </td>
                            <td className="px-3 py-2">{m.manufacturer || "—"}</td>
                            <td className="px-3 py-2">{m.model || "—"}</td>
                            <td className="px-3 py-2">{m.hp || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-secondary">Customer&apos;s motors: —</p>
                )}
              </div>
            </div>

            <div className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Invoices ({activityLoading ? "…" : activity.invoices.length})
                </h3>
                {!activityLoading && invoiceStatusTotals.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {invoiceStatusTotals.map((s) => (
                      <span key={`inv-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                        <InvoiceStatusPill status={s.status} mergedSettings={mergedSettings} />
                        <span className="text-sm text-title">{moneyLabel(s.amount)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <CustomerActivityTableBody
                  loading={activityLoading}
                  isEmpty={activity.invoices.length === 0}
                  emptyMessage="No invoices found."
                >
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Invoice #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Date
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Status
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {activity.invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              {inv?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() => setOpenInvoiceId(inv.id)}
                                  title="Open invoice"
                                >
                                  {inv.invoiceNumber || "—"}
                                </button>
                              ) : (
                                inv.invoiceNumber || "—"
                              )}
                            </td>
                            <td className="px-3 py-2">{inv.date || "—"}</td>
                            <td className="px-3 py-2">
                              <InvoiceStatusPill status={inv.status} mergedSettings={mergedSettings} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              {moneyLabel(Number(inv.laborTotal || 0) + Number(inv.partsTotal || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CustomerActivityTableBody>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Quotes ({activityLoading ? "…" : activity.quotes.length})
                </h3>
                {!activityLoading && quoteStatusTotals.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {quoteStatusTotals.map((s) => (
                      <span key={`quote-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                        <QuoteStatusPill status={s.status} mergedSettings={mergedSettings} />
                        <span className="text-sm text-title">{moneyLabel(s.amount)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <CustomerActivityTableBody
                  loading={activityLoading}
                  isEmpty={activity.quotes.length === 0}
                  emptyMessage="No quotes found."
                >
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            RFQ #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Date
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Status
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wide text-secondary">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {activity.quotes.map((q) => (
                          <tr key={q.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              {q?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() => setOpenQuoteId(q.id)}
                                  title="Open RFQ"
                                >
                                  {q.rfqNumber || "—"}
                                </button>
                              ) : (
                                q.rfqNumber || "—"
                              )}
                            </td>
                            <td className="px-3 py-2">{q.date || "—"}</td>
                            <td className="px-3 py-2">
                              <QuoteStatusPill status={q.status} mergedSettings={mergedSettings} />
                            </td>
                            <td className="px-3 py-2 text-right">
                              {moneyLabel(Number(q.laborTotal || 0) + Number(q.partsTotal || 0))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CustomerActivityTableBody>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                  Work orders ({activityLoading ? "…" : activity.workOrders.length})
                </h3>
                {!activityLoading && workOrderStatusTotals.length > 0 ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {workOrderStatusTotals.map((s) => (
                      <span key={`wo-s-${s.status}`} className="inline-flex flex-wrap items-center gap-1.5">
                        <WorkOrderStatusPill status={s.status} mergedSettings={mergedSettings} />
                        <span className="text-sm text-title">{moneyLabel(s.amount)}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                <CustomerActivityTableBody
                  loading={activityLoading}
                  isEmpty={activity.workOrders.length === 0}
                  emptyMessage="No work orders found."
                >
                  <div className="overflow-x-auto rounded border border-border">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-card">
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            WO #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            RFQ #
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Date
                          </th>
                          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-secondary">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-title">
                        {activity.workOrders.map((wo) => (
                          <tr key={wo.id} className="border-b border-border last:border-b-0">
                            <td className="px-3 py-2">
                              {wo?.id ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() => setOpenWorkOrderId(wo.id)}
                                  title="Open work order"
                                >
                                  {wo.workOrderNumber || "—"}
                                </button>
                              ) : (
                                wo.workOrderNumber || "—"
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {wo?.quoteId ? (
                                <button
                                  type="button"
                                  className={openRecordBtnClass}
                                  onClick={() => setOpenQuoteId(wo.quoteId)}
                                  title="Open linked RFQ"
                                >
                                  {wo.quoteRfqNumber || "—"}
                                </button>
                              ) : (
                                wo.quoteRfqNumber || "—"
                              )}
                            </td>
                            <td className="px-3 py-2">{wo.date || "—"}</td>
                            <td className="px-3 py-2">
                              <WorkOrderStatusPill status={wo.status} mergedSettings={mergedSettings} />
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

      <CustomerFormModal
        open={!!editCustomerId}
        customerId={editCustomerId}
        onClose={() => setEditCustomerId(null)}
        zIndex={zIndex + 10}
        onAfterSave={async () => {
          setEditCustomerId(null);
          if (resolvedId) await reloadCustomer(resolvedId);
        }}
      />

      <Modal
        open={addMotorOpen}
        onClose={() => setAddMotorOpen(false)}
        title="Add customer's motor"
        size="4xl"
        zIndex={zIndex + 15}
        actions={
          <Button type="submit" form="customer-view-add-motor-form" variant="primary" size="sm" disabled={savingMotor}>
            {savingMotor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id="customer-view-add-motor-form"
          onSubmit={handleAddMotorSubmit}
          className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <FormSection title="Identification & details">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Serial number"
                value={motorForm.serialNumber}
                onChange={(e) => setMotorForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
              />
              <Input
                label="Manufacturer"
                value={motorForm.manufacturer}
                onChange={(e) => setMotorForm((f) => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={motorForm.model}
                onChange={(e) => setMotorForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={motorForm.motorType}
                onChange={(e) => setMotorForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input label="HP" value={motorForm.hp} onChange={(e) => setMotorForm((f) => ({ ...f, hp: e.target.value }))} />
              <Input label="RPM" value={motorForm.rpm} onChange={(e) => setMotorForm((f) => ({ ...f, rpm: e.target.value }))} />
              <Input
                label="Voltage"
                value={motorForm.voltage}
                onChange={(e) => setMotorForm((f) => ({ ...f, voltage: e.target.value }))}
              />
              <Input label="KW" value={motorForm.kw} onChange={(e) => setMotorForm((f) => ({ ...f, kw: e.target.value }))} />
              <Input label="AMPs" value={motorForm.amps} onChange={(e) => setMotorForm((f) => ({ ...f, amps: e.target.value }))} />
              <Input
                label="Frame size"
                value={motorForm.frameSize}
                onChange={(e) => setMotorForm((f) => ({ ...f, frameSize: e.target.value }))}
              />
              <Input label="Slots" value={motorForm.slots} onChange={(e) => setMotorForm((f) => ({ ...f, slots: e.target.value }))} />
              <Input
                label="Core length"
                value={motorForm.coreLength}
                onChange={(e) => setMotorForm((f) => ({ ...f, coreLength: e.target.value }))}
              />
              <Input
                label="Core diameter"
                value={motorForm.coreDiameter}
                onChange={(e) => setMotorForm((f) => ({ ...f, coreDiameter: e.target.value }))}
              />
              <Input label="Bars" value={motorForm.bars} onChange={(e) => setMotorForm((f) => ({ ...f, bars: e.target.value }))} />
            </div>
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              value={motorForm.notes}
              onChange={(e) => setMotorForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="[&_label]:sr-only"
            />
          </FormSection>
        </Form>
      </Modal>

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

      <QuoteQuickViewModal
        open={!!openQuoteId}
        quoteId={openQuoteId}
        onClose={() => setOpenQuoteId(null)}
        zIndex={zIndex + 25}
      />

      <WorkOrderFormModal
        open={!!openWorkOrderId}
        workOrderId={openWorkOrderId}
        onClose={() => setOpenWorkOrderId(null)}
        onAfterSave={() => {
          setOpenWorkOrderId(null);
          if (resolvedId) refreshActivity(resolvedId);
        }}
        zIndex={zIndex + 30}
      />

      <MotorQuickViewModal
        open={!!openMotorId}
        motorId={openMotorId}
        customerName={customer?.companyName || customer?.primaryContactName || ""}
        onClose={() => setOpenMotorId(null)}
        zIndex={zIndex + 35}
      />
    </>
  );
}
