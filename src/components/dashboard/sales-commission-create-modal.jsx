"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import SalesCommissionSalesPersonField from "@/components/dashboard/sales-commission-sales-person-field";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";

const FORM_INITIAL = {
  jobKey: "",
  salesPersonId: "",
  amount: "",
  status: "unpaid",
  paidAt: "",
  attachments: [],
};

/**
 * Add New Commission modal — same form as Sales commission page.
 * @param {object} [presetQuote] — when opened from a saved RFQ, locks job fields
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
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INITIAL);
  const [salesPersons, setSalesPersons] = useState([]);
  const [jobOptions, setJobOptions] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const lockedJob = presetQuote?.quoteId ? presetQuote : null;
  const presetQuoteId = lockedJob ? String(lockedJob.quoteId || "").trim() : "";

  const selectedJobMeta = useMemo(() => {
    if (lockedJob) {
      return {
        jobNumber: String(lockedJob.rfqNumber || "").trim(),
        quoteId: String(lockedJob.quoteId || "").trim(),
        rfqNumber: String(lockedJob.rfqNumber || "").trim(),
        customerName: lockedJob.customerName || "—",
        jobStatus: lockedJob.jobStatus || "—",
      };
    }
    return jobOptions.find((opt) => opt.value === form.jobKey)?.meta || null;
  }, [lockedJob, jobOptions, form.jobKey]);

  const reset = useCallback(() => {
    setForm(FORM_INITIAL);
    setPendingFiles([]);
    setSaving(false);
    setUploading(false);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (lockedJob) {
      setForm({
        ...FORM_INITIAL,
        jobKey: `rfq:${lockedJob.quoteId}`,
      });
    } else {
      setForm(FORM_INITIAL);
    }

    let cancelled = false;
    setLoadingMeta(true);
    (async () => {
      try {
        const [spRes, quoteList, invList, customerList] = await Promise.all([
          fetch("/api/dashboard/sales-persons", { credentials: "include", cache: "no-store" }),
          lockedJob ? Promise.resolve([]) : fetchAllPaginatedDashboardItems("/api/dashboard/quotes"),
          lockedJob ? Promise.resolve([]) : fetchAllPaginatedDashboardItems("/api/dashboard/invoices"),
          lockedJob ? Promise.resolve([]) : fetchAllPaginatedDashboardItems("/api/dashboard/customers"),
        ]);
        if (cancelled) return;

        const spData = spRes.ok ? await spRes.json().catch(() => []) : [];
        if (spRes.ok) setSalesPersons(Array.isArray(spData) ? spData : []);

        if (!lockedJob) {
          const customerMap = Object.fromEntries(
            (Array.isArray(customerList) ? customerList : []).map((c) => [
              String(c.id || ""),
              c.companyName || c.primaryContactName || "—",
            ])
          );
          const invoiceByQuoteId = new Map();
          for (const inv of invList) {
            const qid = String(inv.quoteId || "").trim();
            if (!qid) continue;
            const invNum = String(inv.invoiceNumber || "").trim();
            if (!invNum) continue;
            const createdMs = inv.createdAt ? new Date(inv.createdAt).getTime() : 0;
            const prev = invoiceByQuoteId.get(qid);
            if (!prev || createdMs >= prev.createdMs) {
              invoiceByQuoteId.set(qid, { invoiceNumber: invNum, createdMs });
            }
          }
          const quoteIds = new Set(quoteList.map((q) => String(q.id || "").trim()).filter(Boolean));
          const fromQuotes = quoteList
            .filter((q) => String(q.rfqNumber || "").trim())
            .map((q) => {
              const qid = String(q.id || "").trim();
              const rfq = String(q.rfqNumber || "").trim();
              const invMeta = invoiceByQuoteId.get(qid);
              const invNum = invMeta?.invoiceNumber || "";
              const label = invNum ? `${rfq} · Inv ${invNum}` : rfq;
              return {
                value: `rfq:${q.id}`,
                label,
                meta: {
                  jobNumber: invNum || rfq,
                  quoteId: qid,
                  rfqNumber: rfq,
                  customerId: String(q.customerId || "").trim(),
                  customerName: customerMap[String(q.customerId || "")] || "—",
                  jobStatus: String(q.status || "draft"),
                },
              };
            });
          const fromInvoiceOnly = invList
            .filter((inv) => {
              const invNum = String(inv.invoiceNumber || "").trim();
              const qid = String(inv.quoteId || "").trim();
              return invNum && qid && !quoteIds.has(qid);
            })
            .map((inv) => {
              const invNum = String(inv.invoiceNumber || "").trim();
              const qid = String(inv.quoteId || "").trim();
              const rfq = String(inv.rfqNumber || "").trim();
              const label = rfq ? `${rfq} · Inv ${invNum}` : invNum;
              return {
                value: `inv:${String(inv.id || "").trim()}`,
                label,
                meta: {
                  jobNumber: invNum,
                  quoteId: qid,
                  rfqNumber: rfq,
                  customerId: String(inv.customerId || "").trim(),
                  customerName: customerMap[String(inv.customerId || "")] || "—",
                  jobStatus: String(inv.status || "invoiced"),
                },
              };
            });
          setJobOptions([...fromQuotes, ...fromInvoiceOnly]);
        }
      } catch {
        if (!cancelled) {
          setSalesPersons([]);
          setJobOptions([]);
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, presetQuoteId, reset]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const meta = selectedJobMeta;
    if (!meta?.quoteId && !lockedJob) {
      toast.error("Job# is required.");
      return;
    }
    if (!form.salesPersonId) {
      toast.error("Sales person is required.");
      return;
    }
    const amountNum = Number(form.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Amount must be a valid number.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          jobNumber: meta.jobNumber,
          quoteId: meta.quoteId,
          rfqNumber: meta.rfqNumber,
          salesPersonId: form.salesPersonId,
          amount: amountNum,
          status: form.status,
          paidAt: form.paidAt,
          attachments: Array.isArray(form.attachments) ? form.attachments : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create commission");

      const newId = data.commission?.id;
      let commission = data.commission;
      if (newId && pendingFiles.length > 0) {
        const fd = new FormData();
        for (const file of pendingFiles) fd.append("files", file);
        setUploading(true);
        const up = await fetch(`/api/dashboard/sales-commissions/${newId}/upload`, {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const upData = await up.json().catch(() => ({}));
        if (up.ok && upData.commission) commission = upData.commission;
      }

      toast.success("Commission created.");
      onCreated?.(commission);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to create commission");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
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
        <Form id="sales-commission-create-modal-form" onSubmit={handleSubmit} className="flex flex-col gap-4 !space-y-0">
          {lockedJob ? (
            <Input label="Job#" value={lockedJob.rfqNumber || "—"} readOnly />
          ) : (
            <Select
              label="Job#"
              options={jobOptions}
              value={form.jobKey}
              onChange={(e) => setForm((prev) => ({ ...prev, jobKey: e.target.value ?? "" }))}
              placeholder="Select Job#"
              searchable
              required
            />
          )}
          <Input label="Customer" value={selectedJobMeta?.customerName || "—"} readOnly />
          <Input label="Selected job status" value={selectedJobMeta?.jobStatus || "—"} readOnly />
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
          <Select
            label="Status"
            options={[
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
            ]}
            value={form.status}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                status: e.target.value ?? "unpaid",
                paidAt:
                  (e.target.value ?? "unpaid") === "paid"
                    ? prev.paidAt || new Date().toISOString().slice(0, 10)
                    : "",
              }))
            }
            searchable={false}
          />
          <Input
            label="Paid date"
            type="date"
            value={form.paidAt}
            onChange={(e) => setForm((prev) => ({ ...prev, paidAt: e.target.value }))}
          />
          <VendorAttachmentsPanel
            resourceLabel="sales commission"
            vendorId={null}
            attachments={Array.isArray(form.attachments) ? form.attachments : []}
            onAttachmentsChange={(next) => setForm((prev) => ({ ...prev, attachments: next }))}
            pendingFiles={pendingFiles}
            onPendingFilesChange={setPendingFiles}
            uploading={uploading}
          />
        </Form>
      )}
    </Modal>
  );
}
