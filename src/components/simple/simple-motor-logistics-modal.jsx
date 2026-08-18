"use client";

import { useEffect, useState } from "react";
import { FiPrinter, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import SimpleMotorShippingPrintSheet from "@/components/simple/simple-motor-shipping-print-sheet";
import SimpleMotorShippingSendModal from "@/components/simple/simple-motor-shipping-send-modal";
import { useAlert } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
import { resolveOutboundFromPreview } from "@/lib/customer-facing-email-content";
import { getWorkspaceSmtpDeliveryNotice } from "@/lib/workspace-smtp-fields";

const FORM_ID = "simple-motor-logistics-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

const TRANSPORT_OPTIONS = [
  { value: "", label: "Select manner of transport" },
  { value: "Customer drop-off", label: "Customer drop-off" },
  { value: "UPS", label: "UPS" },
  { value: "FedEx", label: "FedEx" },
  { value: "Freight line / LTL", label: "Freight line / LTL" },
  { value: "Courier", label: "Courier" },
  { value: "Shop pickup", label: "Shop pickup" },
  { value: "Internal / dock", label: "Internal / dock" },
  { value: "Other", label: "Other" },
];

const KIND_RECEIVING = "motor_receiving";
const KIND_SHIPPING = "motor_shipping";

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function FieldRow({ label, labelWidth = "7.5rem", children }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function emptyForm(kind, defaults = {}) {
  return {
    date: todayISODate(),
    jobNumber: kind === KIND_RECEIVING ? String(defaults.jobNumber || "").trim() : "",
    invoiceNumber: kind === KIND_SHIPPING ? String(defaults.invoiceNumber || "").trim() : "",
    shippingPo: kind === KIND_SHIPPING ? String(defaults.shippingPo || "").trim() : "",
    mannerOfTransport: "",
    freight: "",
    droppedBy: "",
    pickedBy: "",
    charges: "",
    paidBy: "",
    notes: "",
  };
}

/**
 * Simple portal Motor Receiving / Motor Shipping — same API as classic Logistics.
 */
export default function SimpleMotorLogisticsModal({
  open,
  onClose,
  kind = KIND_RECEIVING,
  defaultJobNumber = "",
  defaultInvoiceNumber = "",
  defaultShippingPo = "",
  serviceProposalId = "",
  onShippingPoSaved,
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  zIndex = 130,
}) {
  const alert = useAlert();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const isReceiving = kind === KIND_RECEIVING;
  const [form, setForm] = useState(() =>
    emptyForm(kind, {
      jobNumber: defaultJobNumber,
      invoiceNumber: defaultInvoiceNumber,
      shippingPo: defaultShippingPo,
    })
  );
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const customerLabel = String(customerName || "").trim() || "Customer";
  const companyLabel = String(companyName || "").trim() || "Company";
  const paidByOptions = [
    { value: "", label: "Select paid by" },
    { value: "customer", label: customerLabel },
    { value: "company", label: companyLabel },
  ];
  const paidByLabel =
    form.paidBy === "customer" ? customerLabel : form.paidBy === "company" ? companyLabel : "";

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setPrinting(false);
      setSendOpen(false);
      return;
    }
    setForm(
      emptyForm(kind, {
        jobNumber: defaultJobNumber,
        invoiceNumber: defaultInvoiceNumber,
        shippingPo: defaultShippingPo,
      })
    );
  }, [open, kind, defaultJobNumber, defaultInvoiceNumber, defaultShippingPo]);

  const title = isReceiving ? "Motor receiving" : "Motor shipping";
  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openSendTo = () => {
    setSendOpen(true);
  };

  const shippingSendMeta = {
    toEmail: String(customerEmail || "").trim(),
    toName: String(customerName || "").trim(),
    from: resolveOutboundFromPreview(settings, companyName || user?.shopName || ""),
    documentLabel: form.invoiceNumber
      ? `Motor shipping ${form.invoiceNumber}`
      : "Motor shipping",
    customerPhone: String(customerPhone || "").trim(),
    companyName: String(companyName || user?.shopName || "").trim(),
    smtp: getWorkspaceSmtpDeliveryNotice(settings),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.date || "").trim()) {
      await alert({ title: "Error", message: "Date is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const shippingPo = isReceiving ? "" : String(form.shippingPo || "").trim();
      const payload = {
        kind: isReceiving ? KIND_RECEIVING : KIND_SHIPPING,
        date: String(form.date || "").trim(),
        jobNumber: isReceiving ? String(form.jobNumber || "").trim() : "",
        invoiceNumber: isReceiving ? "" : String(form.invoiceNumber || "").trim(),
        shippingPo,
        mannerOfTransport: String(form.mannerOfTransport || "").trim(),
        freight: String(form.freight || "").trim(),
        droppedBy: isReceiving ? String(form.droppedBy || "").trim() : "",
        pickedBy: isReceiving ? "" : String(form.pickedBy || "").trim(),
        charges: String(form.charges || "").trim(),
        paidBy: String(form.paidBy || "").trim(),
        notes: String(form.notes || "").trim(),
        serviceProposalId: isReceiving ? "" : String(serviceProposalId || "").trim(),
      };
      const res = await fetch("/api/dashboard/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save logistics entry");
      if (!isReceiving) {
        onShippingPoSaved?.(shippingPo);
      }
      await alert({
        title: "Success",
        message: isReceiving ? "Motor receiving saved." : "Motor shipping saved.",
      });
      onClose?.();
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal
      open={open && !printing}
      onClose={() => {
        if (saving || sendOpen) return;
        onClose?.();
      }}
      title={title}
      size="lg"
      width="min(560px, 96vw)"
      zIndex={zIndex}
      showClose={!saving}
      closeOnOutsideClick={false}
      actions={
        <>
          {!isReceiving ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-1.5"
                disabled={saving}
                onClick={() => setPrinting(true)}
              >
                <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-1.5"
                disabled={saving}
                onClick={openSendTo}
              >
                <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                Send to
              </Button>
            </>
          ) : null}
          <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <p className={SECTION_TITLE}>{isReceiving ? "Inbound for repair" : "Outbound / return after repair"}</p>

        {isReceiving ? (
          <FieldRow label="REF# / Job">
            <input
              type="text"
              value={form.jobNumber}
              onChange={(e) => patch("jobNumber", e.target.value)}
              className={FIELD_INPUT}
              placeholder="e.g. A00001"
              disabled={saving}
              aria-label="REF or Job number"
            />
          </FieldRow>
        ) : (
          <>
            <FieldRow label="Invoice #">
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => patch("invoiceNumber", e.target.value)}
                className={FIELD_INPUT}
                placeholder="e.g. INV-1001"
                disabled={saving}
                aria-label="Invoice number"
              />
            </FieldRow>
            <FieldRow label="PO Number">
              <input
                type="text"
                value={form.shippingPo}
                onChange={(e) => patch("shippingPo", e.target.value)}
                className={FIELD_INPUT}
                placeholder="Shipping PO"
                disabled={saving}
                aria-label="PO Number"
              />
            </FieldRow>
          </>
        )}

        <FieldRow label="Date">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => patch("date", e.target.value)}
            className={FIELD_INPUT}
            disabled={saving}
          />
        </FieldRow>

        <FieldRow label="Transport">
          <SimpleSelect
            options={TRANSPORT_OPTIONS}
            value={form.mannerOfTransport}
            onChange={(e) => patch("mannerOfTransport", e.target.value)}
            searchable={false}
            disabled={saving}
            aria-label="Manner of transport"
          />
        </FieldRow>

        <FieldRow label="Freight">
          <input
            type="text"
            value={form.freight}
            onChange={(e) => patch("freight", e.target.value)}
            className={FIELD_INPUT}
            placeholder="Carrier, account #, BOL, etc."
            disabled={saving}
          />
        </FieldRow>

        {isReceiving ? (
          <FieldRow label="Dropped by">
            <input
              type="text"
              value={form.droppedBy}
              onChange={(e) => patch("droppedBy", e.target.value)}
              className={FIELD_INPUT}
              placeholder="Who delivered / dropped off"
              disabled={saving}
            />
          </FieldRow>
        ) : (
          <FieldRow label="Picked by">
            <input
              type="text"
              value={form.pickedBy}
              onChange={(e) => patch("pickedBy", e.target.value)}
              className={FIELD_INPUT}
              placeholder="Carrier / customer who picked up"
              disabled={saving}
            />
          </FieldRow>
        )}

        <FieldRow label="Charges">
          <input
            type="text"
            value={form.charges}
            onChange={(e) => patch("charges", e.target.value)}
            className={FIELD_INPUT}
            placeholder="e.g. 125.00"
            disabled={saving}
          />
        </FieldRow>

        <FieldRow label="Paid By">
          <SimpleSelect
            options={paidByOptions}
            value={form.paidBy}
            onChange={(e) => patch("paidBy", e.target.value)}
            searchable={false}
            disabled={saving}
            aria-label="Paid by"
          />
        </FieldRow>

        <div className="flex min-w-0 flex-col gap-1.5">
          <p className={SECTION_TITLE}>Notes</p>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => patch("notes", e.target.value)}
            className={FIELD_TEXTAREA}
            placeholder="Additional details"
            disabled={saving}
            aria-label="Notes"
          />
        </div>
      </Form>
    </Modal>

    {printing && !isReceiving ? (
      <DocumentPrintOffscreenPortal
        open
        onClose={() => {
          setPrinting(false);
        }}
      >
        <SimpleMotorShippingPrintSheet
          entry={form}
          customerName={customerName}
          companyName={companyName || user?.shopName || ""}
          customerEmail={customerEmail}
          customerPhone={customerPhone}
          paidByLabel={paidByLabel}
        />
      </DocumentPrintOffscreenPortal>
    ) : null}

    {!isReceiving ? (
      <SimpleMotorShippingSendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        entry={form}
        sendMeta={shippingSendMeta}
        paidByLabel={paidByLabel}
        zIndex={zIndex + 10}
      />
    ) : null}
    </>
  );
}

export { KIND_RECEIVING, KIND_SHIPPING };
