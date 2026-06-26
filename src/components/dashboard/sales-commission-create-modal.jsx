"use client";

import { useState, useEffect, useCallback } from "react";
import { FiCheck } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import SalesCommissionSalesPersonField from "@/components/dashboard/sales-commission-sales-person-field";
import { formatDateMdy } from "@/lib/format-date";

const FORM_INITIAL = {
  salesPersonId: "",
  amount: "",
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * RFQ sales commission modal — compact job summary, add commission, list + pay existing rows.
 * @param {object} presetQuote
 * @param {string} presetQuote.quoteId
 * @param {string} presetQuote.rfqNumber
 * @param {string} presetQuote.customerName
 * @param {string} presetQuote.jobStatus
 */
export default function SalesCommissionCreateModal({
  open,
  onClose,
  zIndex = 130,
  presetQuote = null,
  onCreated,
}) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INITIAL);
  const [salesPersons, setSalesPersons] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [commissionRows, setCommissionRows] = useState([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [payPaidAt, setPayPaidAt] = useState(todayIsoDate());
  const [payPendingFiles, setPayPendingFiles] = useState([]);
  const [paySaving, setPaySaving] = useState(false);
  const [payUploading, setPayUploading] = useState(false);

  const quoteId = presetQuote?.quoteId ? String(presetQuote.quoteId).trim() : "";

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
      toast.error(e.message || "Failed to load commissions");
      setCommissionRows([]);
    } finally {
      setLoadingCommissions(false);
    }
  }, [quoteId, toast]);

  const reset = useCallback(() => {
    setForm(FORM_INITIAL);
    setSaving(false);
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

    loadCommissions();

    return () => {
      cancelled = true;
    };
  }, [open, quoteId, reset, loadCommissions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!presetQuote?.quoteId) return;
    if (!form.salesPersonId) {
      toast.error("Sales person is required.");
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Amount must be a valid number.");
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

      toast.success("Commission added.");
      setForm(FORM_INITIAL);
      onCreated?.(data.commission);
      await loadCommissions();
    } catch (err) {
      toast.error(err.message || "Failed to create commission");
    } finally {
      setSaving(false);
    }
  };

  const openPayModal = (row) => {
    setPayingRow(row);
    setPayPaidAt(todayIsoDate());
    setPayPendingFiles([]);
    setPayModalOpen(true);
  };

  const closePayModal = () => {
    if (paySaving || payUploading) return;
    setPayModalOpen(false);
    setPayingRow(null);
    setPayPendingFiles([]);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    const id = payingRow?.id;
    if (!id) return;
    if (!payPaidAt.trim()) {
      toast.error("Paid date is required.");
      return;
    }

    setPaySaving(true);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid", paidAt: payPaidAt.trim() }),
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

      toast.success("Commission marked as paid.");
      closePayModal();
      await loadCommissions();
    } catch (err) {
      toast.error(err.message || "Failed to update commission");
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
            form="sales-commission-create-modal-form"
            variant="primary"
            size="sm"
            disabled={saving || loadingMeta}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        {loadingMeta ? (
          <div className="flex items-center justify-center py-12 text-sm text-secondary">Loading…</div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-border bg-form-bg/60 px-3 py-2.5 text-sm">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Job#</dt>
                  <dd className="truncate font-medium text-title">{presetQuote.rfqNumber || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Customer</dt>
                  <dd className="truncate font-medium text-title">{presetQuote.customerName || "—"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Job status</dt>
                  <dd className="truncate font-medium capitalize text-title">{presetQuote.jobStatus || "—"}</dd>
                </div>
              </dl>
            </div>

            <Form
              id="sales-commission-create-modal-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
            >
              <SalesCommissionSalesPersonField
                salesPersons={salesPersons}
                onSalesPersonsChange={setSalesPersons}
                value={form.salesPersonId}
                onChange={(id) => setForm((prev) => ({ ...prev, salesPersonId: id }))}
                quickAddZIndex={zIndex + 10}
              />
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </Form>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
                Commissions for this job
              </h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-card text-left text-xs font-medium text-title">
                    <tr>
                      <th className="w-16 px-2 py-2">Action</th>
                      <th className="px-3 py-2">Sales person</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Paid date</th>
                      <th className="px-3 py-2">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCommissions ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-secondary">
                          Loading commissions…
                        </td>
                      </tr>
                    ) : commissionRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-secondary">
                          No commissions yet. Add one above.
                        </td>
                      </tr>
                    ) : (
                      commissionRows.map((row) => {
                        const isPaid = row.status === "paid";
                        return (
                          <tr key={row.id} className="border-b border-border last:border-b-0">
                            <td className="px-2 py-2">
                              {!isPaid ? (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(row)}
                                  className="rounded p-1.5 text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success"
                                  aria-label="Pay commission"
                                  title="Pay commission"
                                >
                                  <FiCheck className="h-4 w-4 shrink-0" aria-hidden />
                                </button>
                              ) : (
                                <span className="px-1.5 text-secondary">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-title">{row.salesPersonName || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(row.amount || 0)}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={isPaid ? "success" : "warning"}
                                className="rounded-full px-2.5 py-0.5 text-xs"
                              >
                                {isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-title">{formatDateMdy(row.paidAt)}</td>
                            <td className="px-3 py-2 tabular-nums text-secondary">
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
        open={payModalOpen}
        onClose={closePayModal}
        title="Pay commission"
        size="lg"
        zIndex={zIndex + 10}
        showClose={!paySaving && !payUploading}
        actions={
          <Button
            type="submit"
            form="sales-commission-pay-form"
            variant="primary"
            size="sm"
            disabled={paySaving || payUploading}
          >
            {paySaving || payUploading ? "Saving…" : "Confirm payment"}
          </Button>
        }
      >
        <Form id="sales-commission-pay-form" onSubmit={handlePaySubmit} className="flex flex-col gap-4 !space-y-0">
          {payingRow ? (
            <p className="text-sm text-secondary">
              <span className="font-medium text-title">{payingRow.salesPersonName || "Sales person"}</span>
              {" · "}
              <span className="tabular-nums text-title">{fmt(payingRow.amount || 0)}</span>
            </p>
          ) : null}
          <Input
            label="Paid date"
            type="date"
            value={payPaidAt}
            onChange={(e) => setPayPaidAt(e.target.value)}
            required
          />
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
    </>
  );
}
