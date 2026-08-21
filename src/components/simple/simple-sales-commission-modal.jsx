"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheck, FiEye, FiUserPlus } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDate, useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { resolveQuoteInvoiceStatusDisplayLabel } from "@/lib/dropdown-catalog";
import { mergeUserSettings } from "@/lib/user-settings";

const FORM_ID = "simple-sales-commission-form";
const PAY_FORM_ID = "simple-sales-commission-pay-form";
const SP_FORM_ID = "simple-sales-person-quick-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";
const TOOLBAR_BTN = "h-7 shrink-0 rounded-none px-2.5 text-xs font-semibold";
const TH_CLASS =
  "pl-[5px] pr-1 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-secondary";
const TD_CLASS = "pl-[5px] pr-1 py-1 text-sm text-title whitespace-nowrap";
const TABLE_WRAP = "overflow-x-auto rounded-sm border border-border";
const TABLE_CLASS = "w-full min-w-[28rem] border-collapse text-sm";
const THEAD_ROW = "border-b border-border bg-primary/[0.06] dark:bg-primary/10";

const FORM_INITIAL = { salesPersonId: "", amount: "" };
const SALES_PERSON_INITIAL = { name: "", phone: "", email: "", bankDetail: "" };

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function FieldRow({ label, labelWidth = "7.5rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

/**
 * Simple portal — dense Add Commission modal (FieldRow style).
 * @param {object} presetQuote
 * @param {string} presetQuote.quoteId
 * @param {string} presetQuote.rfqNumber
 * @param {string} presetQuote.customerName
 * @param {string} [presetQuote.jobStatus]
 * @param {string} [presetQuote.statusLabel]
 */
export default function SimpleSalesCommissionModal({
  open,
  onClose,
  zIndex = 130,
  presetQuote = null,
  onCreated,
}) {
  const alert = useAlert();
  const fmt = useFormatMoney();
  const formatDate = useFormatDate();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const statusDisplay = useMemo(() => {
    if (presetQuote?.statusLabel) return presetQuote.statusLabel;
    return resolveQuoteInvoiceStatusDisplayLabel(presetQuote?.jobStatus, mergedSettings);
  }, [presetQuote?.statusLabel, presetQuote?.jobStatus, mergedSettings]);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INITIAL);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [commissionRows, setCommissionRows] = useState([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const [spOpen, setSpOpen] = useState(false);
  const [spForm, setSpForm] = useState(SALES_PERSON_INITIAL);
  const [spSaving, setSpSaving] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [payPaidAt, setPayPaidAt] = useState(todayIsoDate());
  const [payNotes, setPayNotes] = useState("");
  const [payPendingFiles, setPayPendingFiles] = useState([]);
  const [paySaving, setPaySaving] = useState(false);
  const [payUploading, setPayUploading] = useState(false);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingRow, setViewingRow] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const quoteId = presetQuote?.quoteId ? String(presetQuote.quoteId).trim() : "";

  const salesPersonOptions = useMemo(
    () =>
      (Array.isArray(salesPersons) ? salesPersons : []).map((sp) => ({
        value: sp.id,
        label: sp.name || sp.email || sp.phone || sp.id || "—",
      })),
    [salesPersons]
  );

  const loadCommissions = useCallback(async () => {
    if (!quoteId) {
      setCommissionRows([]);
      return;
    }
    setLoadingCommissions(true);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions?quoteId=${encodeURIComponent(quoteId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load commissions");
      setCommissionRows(Array.isArray(data.commissions) ? data.commissions : []);
    } catch (e) {
      await alert({
        title: "Error",
        message: e.message || "Failed to load commissions",
        variant: "danger",
      });
      setCommissionRows([]);
    } finally {
      setLoadingCommissions(false);
    }
  }, [quoteId, alert]);

  const reset = useCallback(() => {
    setForm(FORM_INITIAL);
    setSaving(false);
    setSpOpen(false);
    setSpForm(SALES_PERSON_INITIAL);
    setSpSaving(false);
    setPayModalOpen(false);
    setPayingRow(null);
    setPayPaidAt(todayIsoDate());
    setPayPendingFiles([]);
    setPaySaving(false);
    setPayUploading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      setCommissionRows([]);
      return;
    }

    setForm(FORM_INITIAL);

    let cancelled = false;
    setLoadingMeta(true);
    (async () => {
      try {
        const spRes = await fetch("/api/dashboard/sales-persons", {
          credentials: "include",
          cache: "no-store",
        });
        const spData = spRes.ok ? await spRes.json().catch(() => []) : [];
        if (!cancelled && spRes.ok) setSalesPersons(Array.isArray(spData) ? spData : []);
      } catch {
        if (!cancelled) setSalesPersons([]);
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    void loadCommissions();

    return () => {
      cancelled = true;
    };
  }, [open, quoteId, reset, loadCommissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!presetQuote?.quoteId) return;
    if (!form.salesPersonId) {
      await alert({ title: "Error", message: "Sales person is required.", variant: "danger" });
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      await alert({ title: "Error", message: "Amount must be a valid number.", variant: "danger" });
      return;
    }

    const rfqNumber = String(presetQuote.rfqNumber || "").trim();

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobNumber: rfqNumber,
          quoteId,
          rfqNumber,
          salesPersonId: form.salesPersonId,
          amount: amountNum,
          status: "unpaid",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create commission");

      setForm(FORM_INITIAL);
      onCreated?.(data.commission);
      await loadCommissions();
      await alert({ title: "Saved", message: "Commission added." });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to create commission",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSpSubmit = async (e) => {
    e.preventDefault();
    if (!String(spForm.name || "").trim()) {
      await alert({ title: "Error", message: "Name is required.", variant: "danger" });
      return;
    }
    setSpSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(spForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sales person");
      const created = data.salesPerson;
      setSalesPersons((prev) => [created, ...prev]);
      setForm((prev) => ({ ...prev, salesPersonId: created?.id || "" }));
      setSpOpen(false);
      setSpForm(SALES_PERSON_INITIAL);
      await alert({ title: "Saved", message: "Sales person added." });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to create sales person",
        variant: "danger",
      });
    } finally {
      setSpSaving(false);
    }
  };

  const openPayModal = (row) => {
    setPayingRow(row);
    setPayPaidAt(todayIsoDate());
    setPayNotes("");
    setPayPendingFiles([]);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    if (paySaving || payUploading) return;
    setPayModalOpen(false);
    setPayingRow(null);
    setPayNotes("");
    setPayPendingFiles([]);
  };

  const openViewModal = async (row) => {
    const id = row?.id;
    if (!id) return;
    setViewModalOpen(true);
    setViewingRow(row);
    setViewLoading(true);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load payment record");
      setViewingRow(data);
    } catch (err) {
      setViewModalOpen(false);
      setViewingRow(null);
      await alert({
        title: "Error",
        message: err.message || "Failed to load payment record",
        variant: "danger",
      });
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingRow(null);
    setViewLoading(false);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const id = payingRow?.id;
    if (!id) return;
    if (!payPaidAt.trim()) {
      await alert({ title: "Error", message: "Paid date is required.", variant: "danger" });
      return;
    }

    setPaySaving(true);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          status: "paid",
          paidAt: payPaidAt.trim(),
          notes: payNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark commission paid");

      if (payPendingFiles.length > 0) {
        setPayUploading(true);
        const fd = new FormData();
        for (const file of payPendingFiles) fd.append("files", file);
        const up = await fetch(`/api/dashboard/sales-commissions/${id}/upload`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || "Commission paid but document upload failed");
      }

      closePayModal();
      await loadCommissions();
      await alert({ title: "Saved", message: "Commission marked as paid." });
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to update commission",
        variant: "danger",
      });
    } finally {
      setPaySaving(false);
      setPayUploading(false);
    }
  };

  if (!presetQuote?.quoteId) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (saving) return;
          onClose?.();
        }}
        title="Add New Commission"
        size="2xl"
        zIndex={zIndex}
        showClose={!saving}
        actions={
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            size="sm"
            className={TOOLBAR_BTN}
            disabled={saving || loadingMeta}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        {loadingMeta ? (
          <div className="flex items-center justify-center py-12 text-sm text-secondary">Loading…</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-sm border border-border bg-primary/[0.04] px-2.5 py-2 dark:bg-primary/10">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Job#</dt>
                  <dd className="truncate text-sm font-medium text-title">{presetQuote.rfqNumber || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Customer</dt>
                  <dd className="truncate text-sm font-medium text-title">{presetQuote.customerName || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-secondary">Status</dt>
                  <dd className="truncate text-sm font-medium text-title">{statusDisplay}</dd>
                </div>
              </dl>
            </div>

            <Form
              id={FORM_ID}
              onSubmit={handleSubmit}
              className="flex flex-col gap-2 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
            >
              <FieldRow label="Sales person" labelWidth="6.75rem">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="min-w-0 flex-1">
                    <SimpleSelect
                      options={salesPersonOptions}
                      value={form.salesPersonId}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, salesPersonId: e.target.value ?? "" }))
                      }
                      placeholder="Select sales person"
                      searchable
                      aria-label="Sales person"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className={TOOLBAR_BTN}
                    onClick={() => {
                      setSpForm(SALES_PERSON_INITIAL);
                      setSpOpen(true);
                    }}
                  >
                    <FiUserPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Add
                  </Button>
                </div>
              </FieldRow>
              <FieldRow label="Amount" labelWidth="6.75rem">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
                  required
                  className={FIELD_INPUT}
                />
              </FieldRow>
            </Form>

            <div>
              <p className={SECTION_TITLE}>Commissions for this job</p>
              <div className={TABLE_WRAP}>
                <table className={TABLE_CLASS}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={`${TH_CLASS} w-12`}>Action</th>
                      <th className={TH_CLASS}>Sales person</th>
                      <th className={`${TH_CLASS} text-right`}>Amount</th>
                      <th className={TH_CLASS}>Status</th>
                      <th className={TH_CLASS}>Paid date</th>
                      <th className={TH_CLASS}>Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCommissions ? (
                      <tr>
                        <td colSpan={6} className={`${TD_CLASS} py-6 text-center text-secondary`}>
                          Loading commissions…
                        </td>
                      </tr>
                    ) : commissionRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`${TD_CLASS} py-6 text-center text-secondary`}>
                          No commissions yet. Add one above.
                        </td>
                      </tr>
                    ) : (
                      commissionRows.map((row) => {
                        const isPaid = row.status === "paid";
                        return (
                          <tr key={row.id} className="border-b border-border last:border-b-0">
                            <td className={TD_CLASS}>
                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(row)}
                                  className="rounded p-1 text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success"
                                  aria-label="Pay commission"
                                  title="Pay commission"
                                >
                                  <FiCheck className="h-4 w-4 shrink-0" aria-hidden />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openViewModal(row)}
                                  className="rounded p-1 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                                  aria-label="View payment"
                                  title="View payment"
                                >
                                  <FiEye className="h-4 w-4 shrink-0" aria-hidden />
                                </button>
                              )}
                            </td>
                            <td className={TD_CLASS}>{row.salesPersonName || "—"}</td>
                            <td className={`${TD_CLASS} text-right tabular-nums`}>
                              {fmt(row.amount || 0)}
                            </td>
                            <td className={TD_CLASS}>
                              <Badge
                                variant={isPaid ? "success" : "warning"}
                                className="rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            </td>
                            <td className={TD_CLASS}>{formatDate(row.paidAt)}</td>
                            <td className={`${TD_CLASS} tabular-nums text-secondary`}>
                              {Number(row.attachmentCount) > 0 ? row.attachmentCount : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={spOpen}
        onClose={() => {
          if (spSaving) return;
          setSpOpen(false);
        }}
        title="Add Sales Person"
        size="xl"
        zIndex={zIndex + 10}
        showClose={!spSaving}
        actions={
          <Button
            type="submit"
            form={SP_FORM_ID}
            variant="primary"
            size="sm"
            className={TOOLBAR_BTN}
            disabled={spSaving}
          >
            {spSaving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={SP_FORM_ID}
          onSubmit={handleSpSubmit}
          className="flex flex-col gap-2 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <FieldRow label="Name" labelWidth="6.75rem">
            <input
              type="text"
              value={spForm.name}
              onChange={(e) => setSpForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Phone" labelWidth="6.75rem">
            <input
              type="text"
              value={spForm.phone}
              onChange={(e) => setSpForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Email" labelWidth="6.75rem">
            <input
              type="email"
              value={spForm.email}
              onChange={(e) => setSpForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Bank detail" labelWidth="6.75rem" className="items-start">
            <textarea
              value={spForm.bankDetail}
              onChange={(e) => setSpForm((prev) => ({ ...prev, bankDetail: e.target.value }))}
              placeholder="Bank account / payout detail"
              rows={3}
              className={FIELD_TEXTAREA}
            />
          </FieldRow>
        </Form>
      </Modal>

      <Modal
        open={payModalOpen}
        onClose={closePayModal}
        title="Pay commission"
        size="lg"
        zIndex={zIndex + 10}
        showClose={!paySaving && !payUploading}
        actions={
          <Button
            type="submit"
            form={PAY_FORM_ID}
            variant="primary"
            size="sm"
            className={TOOLBAR_BTN}
            disabled={paySaving || payUploading}
          >
            {paySaving || payUploading ? "Saving…" : "Confirm payment"}
          </Button>
        }
      >
        <Form
          id={PAY_FORM_ID}
          onSubmit={handlePaySubmit}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          {payingRow ? (
            <p className="text-sm text-secondary">
              <span className="font-medium text-title">{payingRow.salesPersonName || "Sales person"}</span>
              {" · "}
              <span className="tabular-nums text-title">{fmt(payingRow.amount || 0)}</span>
            </p>
          ) : null}
          <FieldRow label="Paid date" labelWidth="6.75rem">
            <input
              type="date"
              value={payPaidAt}
              onChange={(e) => setPayPaidAt(e.target.value)}
              required
              className={FIELD_INPUT}
            />
          </FieldRow>
          <FieldRow label="Notes" labelWidth="6.75rem" className="items-start">
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Optional payment memo or reference"
              rows={3}
              className={FIELD_TEXTAREA}
              aria-label="Notes"
            />
          </FieldRow>
          <VendorAttachmentsPanel
            resourceLabel="sales commission"
            vendorId={null}
            attachments={[]}
            onAttachmentsChange={() => {}}
            pendingFiles={payPendingFiles}
            onPendingFilesChange={setPayPendingFiles}
            uploading={payUploading}
          />
          <p className="text-xs text-secondary">
            Documents upload when you confirm payment. You can add proof of payment or receipts here.
          </p>
        </Form>
      </Modal>

      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Payment record"
        size="lg"
        zIndex={zIndex + 10}
        showClose
      >
        {viewLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-secondary">Loading…</div>
        ) : viewingRow ? (
          <div className="flex flex-col gap-3">
            <FieldRow label="Sales person" labelWidth="6.75rem">
              <p className="text-sm text-title">{viewingRow.salesPersonName || "—"}</p>
            </FieldRow>
            <FieldRow label="Amount" labelWidth="6.75rem">
              <p className="text-sm tabular-nums text-title">{fmt(viewingRow.amount || 0)}</p>
            </FieldRow>
            <FieldRow label="Status" labelWidth="6.75rem">
              <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                Paid
              </Badge>
            </FieldRow>
            <FieldRow label="Paid date" labelWidth="6.75rem">
              <p className="text-sm text-title">{formatDate(viewingRow.paidAt) || "—"}</p>
            </FieldRow>
            <FieldRow label="Notes" labelWidth="6.75rem" className="items-start">
              <p className="whitespace-pre-wrap text-sm text-title">
                {String(viewingRow.notes || "").trim() || "—"}
              </p>
            </FieldRow>
            <VendorAttachmentsPanel
              resourceLabel="sales commission"
              resourceId={viewingRow.id || null}
              attachments={Array.isArray(viewingRow.attachments) ? viewingRow.attachments : []}
              onAttachmentsChange={() => {}}
              pendingFiles={[]}
              onPendingFilesChange={() => {}}
              readOnly
            />
          </div>
        ) : null}
      </Modal>
    </>
  );
}
