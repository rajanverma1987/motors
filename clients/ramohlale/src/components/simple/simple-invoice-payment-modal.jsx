"use client";

import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import SimpleSelect from "@/components/simple/simple-select";
import { Form } from "@/components/ui/form-layout";
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
const EDIT_FORM_ID = "invoice-payment-edit-form";

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

function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Remaining balance after each payment, using payments on or before that date. */
function balanceDueByPaymentId(payments, grandTotal) {
  const rows = (Array.isArray(payments) ? payments : []).map((payment, index) => ({
    payment,
    index,
  }));
  rows.sort((a, b) => {
    const left = String(a.payment?.date || "");
    const right = String(b.payment?.date || "");
    if (left !== right) return left < right ? -1 : 1;
    return a.index - b.index;
  });
  const total = roundMoney(grandTotal);
  let paid = 0;
  const byId = new Map();
  for (const row of rows) {
    paid = roundMoney(paid + parseSpMoney(row.payment?.amount));
    byId.set(String(row.payment?.id || ""), roundMoney(Math.max(0, total - paid)));
  }
  return byId;
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
  const [editing, setEditing] = useState(null);

  const paymentList = Array.isArray(payments) ? payments : [];
  const summary = useMemo(
    () => computeInvoicePaymentSummary(paymentList, grandTotal),
    [paymentList, grandTotal]
  );
  const balanceByPaymentId = useMemo(
    () => balanceDueByPaymentId(paymentList, grandTotal),
    [paymentList, grandTotal]
  );
  const historyRows = useMemo(() => {
    return paymentList
      .map((payment, index) => ({ payment, index }))
      .sort((a, b) => {
        const left = String(a.payment?.date || "");
        const right = String(b.payment?.date || "");
        if (left !== right) return left < right ? -1 : 1;
        return a.index - b.index;
      })
      .map((row) => row.payment);
  }, [paymentList]);
  const draftBalanceDue = useMemo(() => {
    const day = String(draft.date || "").trim();
    let paid = 0;
    for (const payment of paymentList) {
      const paymentDay = String(payment?.date || "").trim();
      if (!day || (paymentDay && paymentDay <= day)) paid += parseSpMoney(payment?.amount);
    }
    paid += parseSpMoney(draft.amount);
    return roundMoney(Math.max(0, roundMoney(grandTotal) - paid));
  }, [draft.amount, draft.date, grandTotal, paymentList]);

  const editBalanceDue = useMemo(() => {
    if (!editing) return 0;
    const day = String(editing.date || "").trim();
    let paid = 0;
    for (const payment of paymentList) {
      if (String(payment?.id) === String(editing.id)) continue;
      const paymentDay = String(payment?.date || "").trim();
      if (!day || (paymentDay && paymentDay <= day)) paid += parseSpMoney(payment?.amount);
    }
    paid += parseSpMoney(editing.amount);
    return roundMoney(Math.max(0, roundMoney(grandTotal) - paid));
  }, [editing, grandTotal, paymentList]);

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
    setEditing(null);
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

  const openEdit = (payment) => {
    setEditing({
      id: payment.id,
      date: String(payment.date || "").slice(0, 10),
      amount: String(payment.amount ?? ""),
      method: String(payment.method || ""),
      reference: String(payment.reference || ""),
      notes: String(payment.notes || ""),
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editing) return;
    const amount = parseSpMoney(editing.amount);
    if (!(amount > 0)) {
      await alert({
        title: "Amount required",
        message: "Enter a payment amount greater than zero.",
        variant: "danger",
      });
      return;
    }
    if (!String(editing.date || "").trim()) {
      await alert({ title: "Date required", message: "Enter the payment date.", variant: "danger" });
      return;
    }
    if (!String(editing.method || "").trim()) {
      await alert({
        title: "Payment method",
        message: "Select a payment method.",
        variant: "danger",
      });
      return;
    }
    const next = paymentList.map((payment) =>
      String(payment.id) === String(editing.id)
        ? {
            ...payment,
            date: String(editing.date || "").trim(),
            amount: String(amount),
            method: String(editing.method || "").trim(),
            reference: String(editing.reference || "").trim(),
            notes: String(editing.notes || "").trim(),
          }
        : payment
    );
    commitPayments(next);
    setEditing(null);
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
    <>
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="7xl"
      width="min(1480px, 96vw)"
      height="min(90vh, 920px)"
      bodyClassName="!overflow-hidden"
    >
      <div className="grid h-full min-h-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(22rem,0.82fr)_minmax(0,1.18fr)]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-auto pr-1">
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
          <div className="grid gap-4 sm:grid-cols-2">
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
                triggerClassName="!h-9 !min-h-9 !px-2.5"
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
            <div className="min-w-0">
              <label className={FIELD_LABEL} htmlFor="inv-pay-balance">
                Balance due
              </label>
              <input
                id="inv-pay-balance"
                type="text"
                readOnly
                value={formatMoney(draftBalanceDue)}
                className={`${FIELD_INPUT} text-right font-semibold tabular-nums`}
                aria-label="Balance due at the payment date"
                title="Balance still due on the payment date, after this amount"
              />
            </div>
            <div className="min-w-0 sm:col-span-2">
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
            <div className="min-w-0 sm:col-span-2">
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
        </div>

        <div className="flex min-h-[18rem] min-w-0 flex-col lg:min-h-0">
          <div className="min-h-0 flex-1 overflow-auto rounded-sm border border-border">
            <table className="w-full min-w-[28rem] border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-primary/[0.06] text-title dark:bg-primary/10">
                <tr className="border-b border-border">
                  <th className="w-20 border-r border-border px-2 py-2.5" />
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Date
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide">
                    Balance due
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Method
                  </th>
                  <th className="border-r border-border px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Reference #
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody>
                {paymentList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-secondary">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyRows.map((p) => (
                    <tr key={p.id} className="border-t border-border bg-card hover:bg-primary/[0.03]">
                      <td className="border-r border-border px-1 py-1.5 text-center">
                        <div className="inline-flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-danger hover:bg-danger/10"
                            title="Delete payment"
                            aria-label="Delete payment"
                            onClick={() => void handleDelete(p.id)}
                          >
                            <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded text-primary hover:bg-primary/10"
                            title="Edit payment"
                            aria-label="Edit payment"
                            onClick={() => openEdit(p)}
                          >
                            <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
                          </button>
                        </div>
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-title">
                        {p.date ? formatDate(p.date) : "-"}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-right text-base font-semibold tabular-nums text-title">
                        {formatMoney(parseSpMoney(p.amount))}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-right font-semibold tabular-nums text-title">
                        {formatMoney(balanceByPaymentId.get(String(p.id)) ?? summary.balance)}
                      </td>
                      <td className="border-r border-border px-3 py-2.5 text-title">{p.method || "-"}</td>
                      <td className="border-r border-border px-3 py-2.5 text-title">
                        {p.reference || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-title">{p.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>

    <Modal
      open={Boolean(editing)}
      onClose={() => setEditing(null)}
      title="Edit payment"
      size="lg"
      width="min(640px, 96vw)"
      showClose
      closeOnOutsideClick={false}
      actions={
        <Button type="submit" form={EDIT_FORM_ID} variant="primary" size="sm">
          Save
        </Button>
      }
    >
      {editing ? (
        <Form
          id={EDIT_FORM_ID}
          onSubmit={handleSaveEdit}
          className="grid gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none sm:grid-cols-2"
        >
          <div className="min-w-0">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-amount">
              Amount
            </label>
            <input
              id="inv-pay-edit-amount"
              type="text"
              inputMode="decimal"
              value={editing.amount}
              onChange={(e) => setEditing((row) => ({ ...row, amount: e.target.value }))}
              className={`${FIELD_INPUT} text-right tabular-nums`}
              placeholder="0.00"
            />
          </div>
          <div className="min-w-0">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-method">
              Payment method
            </label>
            <SimpleSelect
              id="inv-pay-edit-method"
              options={paymentMethodOptions}
              value={editing.method}
              onChange={(e) => setEditing((row) => ({ ...row, method: e.target.value }))}
              placeholder="Select…"
              searchable={false}
              aria-label="Payment method"
              triggerClassName="!h-9 !min-h-9 !px-2.5"
            />
          </div>
          <div className="min-w-0">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-date">
              Date
            </label>
            <input
              id="inv-pay-edit-date"
              type="date"
              value={editing.date}
              onChange={(e) => setEditing((row) => ({ ...row, date: e.target.value }))}
              className={FIELD_INPUT}
            />
          </div>
          <div className="min-w-0">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-balance">
              Balance due
            </label>
            <input
              id="inv-pay-edit-balance"
              type="text"
              readOnly
              value={formatMoney(editBalanceDue)}
              className={`${FIELD_INPUT} text-right font-semibold tabular-nums`}
              aria-label="Balance due at the payment date"
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-reference">
              Payment reference number
            </label>
            <input
              id="inv-pay-edit-reference"
              type="text"
              value={editing.reference}
              onChange={(e) => setEditing((row) => ({ ...row, reference: e.target.value }))}
              className={FIELD_INPUT}
              placeholder="Check #, ACH ref, wire confirmation…"
            />
          </div>
          <div className="min-w-0 sm:col-span-2">
            <label className={FIELD_LABEL} htmlFor="inv-pay-edit-notes">
              Notes
            </label>
            <input
              id="inv-pay-edit-notes"
              type="text"
              value={editing.notes}
              onChange={(e) => setEditing((row) => ({ ...row, notes: e.target.value }))}
              className={FIELD_INPUT}
              placeholder="Optional reference or memo"
            />
          </div>
        </Form>
      ) : null}
    </Modal>
    </>
  );
}
