"use client";

import { useEffect, useMemo, useState } from "react";
import { FiX } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions } from "@/lib/product-dropdown-catalog";
import {
  applyInvoicePaymentFields,
  computeInvoicePaymentSummary,
  emptyInvoicePayment,
  parseSpMoney,
  SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS,
} from "@/lib/simple-service-proposal-form";

const FIELD_INPUT =
  "h-9 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-2.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-secondary";

function paymentStatusBadgeVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "paid") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function formatMoney(n) {
  const value = Number.isFinite(n) ? n : 0;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryTile({ label, value, emphasize = false }) {
  return (
    <div className="min-w-0 flex-1 rounded-sm border border-border bg-card px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">{label}</p>
      <p
        className={`mt-1 tabular-nums tracking-tight text-title ${
          emphasize ? "text-xl font-bold" : "text-lg font-semibold"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Invoice payment records modal — Amount / Method / Date + multi-payment table.
 */
export default function SimpleInvoicePaymentModal({
  open,
  onClose,
  payments = [],
  grandTotal = 0,
  customer = null,
  invoiceNumber = "",
  onChange,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const formatDate = useFormatDate();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const paymentMethodOptions = useMemo(() => {
    const fromSettings = productDropdownSelectOptions(mergedSettings, "payment_method", {
      includeEmpty: false,
    });
    return fromSettings.length ? fromSettings : SIMPLE_INVOICE_PAYMENT_METHOD_OPTIONS;
  }, [mergedSettings]);
  const [draft, setDraft] = useState(() => emptyInvoicePayment());

  const paymentList = Array.isArray(payments) ? payments : [];
  const summary = useMemo(
    () => computeInvoicePaymentSummary(paymentList, grandTotal),
    [paymentList, grandTotal]
  );

  const preferredMethod = String(customer?.preferredPaymentMethod || "").trim();
  const paymentTerms = String(customer?.paymentTerms || "").trim();
  const customerName =
    String(customer?.companyName || "").trim() ||
    String(customer?.primaryContactName || "").trim();

  useEffect(() => {
    if (!open) return;
    const preferred = preferredMethod;
    const methodHit = paymentMethodOptions.find(
      (o) => o.value.toLowerCase() === preferred.toLowerCase()
    );
    setDraft(
      emptyInvoicePayment({
        method: methodHit?.value || "",
      })
    );
  }, [open, preferredMethod, paymentMethodOptions]);

  const commitPayments = (nextPayments) => {
    const applied = applyInvoicePaymentFields({}, nextPayments, grandTotal);
    onChange?.(applied);
  };

  const handleAdd = async () => {
    const amount = parseSpMoney(draft.amount);
    if (!(amount > 0)) {
      await alert({
        title: "Amount required",
        message: "Enter a payment amount greater than zero.",
        variant: "danger",
      });
      return;
    }
    if (!String(draft.date || "").trim()) {
      await alert({ title: "Date required", message: "Enter the payment date.", variant: "danger" });
      return;
    }
    if (!String(draft.method || "").trim()) {
      await alert({
        title: "Payment method",
        message: "Select a payment method.",
        variant: "danger",
      });
      return;
    }
    const next = [
      ...paymentList,
      {
        ...emptyInvoicePayment(),
        date: String(draft.date || "").trim(),
        amount: String(amount),
        method: String(draft.method || "").trim(),
        reference: String(draft.reference || "").trim(),
        notes: String(draft.notes || "").trim(),
      },
    ];
    commitPayments(next);
    const preferred = preferredMethod;
    const methodHit = paymentMethodOptions.find(
      (o) => o.value.toLowerCase() === preferred.toLowerCase()
    );
    setDraft(emptyInvoicePayment({ method: methodHit?.value || "" }));
  };

  const handleDelete = async (paymentId) => {
    const ok = await confirm({
      title: "Delete payment",
      message: "Remove this payment record?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    commitPayments(paymentList.filter((p) => String(p.id) !== String(paymentId)));
  };

  const title = invoiceNumber
    ? `Payment records — ${invoiceNumber}`
    : "Add/Edit Payment Record";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="5xl"
      width="min(920px, 96vw)"
      height="min(82vh, 760px)"
    >
      <div className="flex min-h-0 flex-col gap-6">
        <section className="rounded-sm border border-border bg-primary/[0.03] px-4 py-3.5 dark:bg-primary/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                Customer payment preferences
              </p>
              {customerName ? (
                <p className="mt-1 truncate text-sm font-semibold text-title">{customerName}</p>
              ) : null}
            </div>
            <Badge
              variant={paymentStatusBadgeVariant(summary.paymentStatus)}
              className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold"
            >
              {summary.paymentStatus}
            </Badge>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-sm border border-border/80 bg-card px-3 py-2.5">
              <p className="text-[11px] font-medium text-secondary">Terms</p>
              <p className="mt-0.5 text-sm font-semibold text-title">{paymentTerms || "—"}</p>
            </div>
            <div className="rounded-sm border border-border/80 bg-card px-3 py-2.5">
              <p className="text-[11px] font-medium text-secondary">Preferred payment</p>
              <p className="mt-0.5 text-sm font-semibold text-title">{preferredMethod || "—"}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Invoice total" value={formatMoney(summary.grandTotal)} />
          <SummaryTile label="Amount paid" value={formatMoney(summary.amountPaid)} />
          <SummaryTile label="Balance due" value={formatMoney(summary.balance)} emphasize />
        </section>

        <section className="rounded-sm border border-border p-4">
          <p className="mb-4 text-xs font-bold uppercase tracking-wide text-secondary">
            Record payment
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="min-w-0">
              <label className={FIELD_LABEL} htmlFor="inv-pay-amount">
                Amount
              </label>
              <input
                id="inv-pay-amount"
                type="text"
                inputMode="decimal"
                value={draft.amount}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
                className={`${FIELD_INPUT} text-right tabular-nums`}
                placeholder="0.00"
              />
            </div>
            <div className="min-w-0">
              <label className={FIELD_LABEL} htmlFor="inv-pay-method">
                Payment method
              </label>
              <SimpleSelect
                id="inv-pay-method"
                options={paymentMethodOptions}
                value={draft.method}
                onChange={(e) => setDraft((d) => ({ ...d, method: e.target.value }))}
                placeholder="Select…"
                searchable={false}
                aria-label="Payment method"
              />
            </div>
            <div className="min-w-0">
              <label className={FIELD_LABEL} htmlFor="inv-pay-date">
                Date
              </label>
              <input
                id="inv-pay-date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className={FIELD_INPUT}
              />
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-2">
              <label className={FIELD_LABEL} htmlFor="inv-pay-reference">
                Payment reference number
              </label>
              <input
                id="inv-pay-reference"
                type="text"
                value={draft.reference}
                onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))}
                className={FIELD_INPUT}
                placeholder="Check #, ACH ref, wire confirmation…"
              />
            </div>
            <div className="min-w-0 sm:col-span-2 lg:col-span-3">
              <label className={FIELD_LABEL} htmlFor="inv-pay-notes">
                Notes
              </label>
              <input
                id="inv-pay-notes"
                type="text"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                className={FIELD_INPUT}
                placeholder="Optional reference or memo"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="h-9 px-4"
              onClick={() => void handleAdd()}
            >
              Add payment
            </Button>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">
              Payments ({paymentList.length})
            </p>
          </div>
          <div className="min-h-[12rem] flex-1 overflow-auto rounded-sm border border-border">
            <table className="w-full min-w-[42rem] border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-primary/[0.06] text-title dark:bg-primary/10">
                <tr className="border-b border-border">
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Date
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Method
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Reference #
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Notes
                  </th>
                  <th className="w-12 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {paymentList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-secondary">
                      No payments recorded yet. Add one above.
                    </td>
                  </tr>
                ) : (
                  paymentList.map((p) => (
                    <tr key={p.id} className="border-t border-border bg-card hover:bg-primary/[0.03]">
                      <td className="border-r border-border px-3 py-2.5 text-title">
                        {p.date ? formatDate(p.date) : "—"}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-right text-base font-semibold tabular-nums text-title">
                        {formatMoney(parseSpMoney(p.amount))}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-title">{p.method || "—"}</td>
                      <td className="border-r border-border px-3 py-2.5 text-title">
                        {p.reference || "—"}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-title">{p.notes || "—"}</td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          className="rounded p-1 text-danger hover:bg-danger/10"
                          title="Delete payment"
                          aria-label="Delete payment"
                          onClick={() => void handleDelete(p.id)}
                        >
                          <FiX className="h-4 w-4" aria-hidden />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-secondary">
            Payment status updates automatically. Invoice status is saved when you add or remove a payment.
          </p>
        </section>
      </div>
    </Modal>
  );
}
