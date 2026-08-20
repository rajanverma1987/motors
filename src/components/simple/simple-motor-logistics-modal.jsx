"use client";

import { useEffect, useMemo, useState } from "react";
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
import { mergeUserSettings } from "@/lib/user-settings";
import { productDropdownSelectOptions, mannerOfTransportDropdownKey } from "@/lib/product-dropdown-catalog";
import {
  KIND_RECEIVING,
  KIND_SHIPPING,
  emptyMotorLogisticsRecord,
  motorLogisticsRecordHasData,
  normalizeMotorLogisticsRecord,
} from "@/lib/simple-motor-logistics";

const FORM_ID = "simple-motor-logistics-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

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

/**
 * Simple portal Motor Receiving + Shipping — one modal, two tabs; one record each on SimpleServiceProposal.
 */
export default function SimpleMotorLogisticsModal({
  open,
  onClose,
  /** @deprecated Prefer initialTab — still accepted for callers that open one side. */
  kind = KIND_RECEIVING,
  initialTab = null,
  defaultJobNumber = "",
  defaultInvoiceNumber = "",
  defaultShippingPo = "",
  initialReceiving = null,
  initialShipping = null,
  /** @deprecated Prefer initialReceiving / initialShipping */
  initialRecord = null,
  onSave,
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  zIndex = 130,
}) {
  const alert = useAlert();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const resolvedInitialTab =
    String(initialTab || kind || KIND_RECEIVING).toUpperCase() === KIND_SHIPPING
      ? KIND_SHIPPING
      : KIND_RECEIVING;

  const [activeKind, setActiveKind] = useState(resolvedInitialTab);
  const [receivingForm, setReceivingForm] = useState(() =>
    emptyMotorLogisticsRecord(KIND_RECEIVING, {
      jobNumber: defaultJobNumber,
      invoiceNumber: defaultInvoiceNumber,
    })
  );
  const [shippingForm, setShippingForm] = useState(() =>
    emptyMotorLogisticsRecord(KIND_SHIPPING, {
      jobNumber: defaultJobNumber,
      invoiceNumber: defaultInvoiceNumber,
      shippingPo: defaultShippingPo,
    })
  );
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const isReceiving = activeKind === KIND_RECEIVING;
  const form = isReceiving ? receivingForm : shippingForm;
  const setActiveForm = isReceiving ? setReceivingForm : setShippingForm;

  const transportOptions = useMemo(
    () => productDropdownSelectOptions(mergedSettings, mannerOfTransportDropdownKey(activeKind)),
    [mergedSettings, activeKind]
  );

  const customerLabel = String(customerName || "").trim() || "Customer";
  const companyLabel = String(companyName || "").trim() || "Company";
  const paidByOptions = [
    { value: "", label: "Select paid by" },
    { value: "customer", label: customerLabel },
    { value: "company", label: companyLabel },
  ];
  const paidByLabel =
    form.paidBy === "customer" ? customerLabel : form.paidBy === "company" ? companyLabel : "";

  const receivingSeed =
    initialReceiving != null
      ? initialReceiving
      : kind === KIND_RECEIVING
        ? initialRecord
        : null;
  const shippingSeed =
    initialShipping != null
      ? initialShipping
      : kind === KIND_SHIPPING
        ? initialRecord
        : null;

  const hasSavedData = motorLogisticsRecordHasData(
    isReceiving ? receivingSeed : shippingSeed
  );

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setPrinting(false);
      setSendOpen(false);
      return;
    }

    const defaults = {
      jobNumber: defaultJobNumber,
      invoiceNumber: defaultInvoiceNumber,
      shippingPo: defaultShippingPo,
    };
    setActiveKind(resolvedInitialTab);
    setReceivingForm(normalizeMotorLogisticsRecord(receivingSeed, KIND_RECEIVING, defaults));
    setShippingForm(normalizeMotorLogisticsRecord(shippingSeed, KIND_SHIPPING, defaults));
    // Seed intentionally from open-time props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when modal opens / tab target changes
  }, [open, resolvedInitialTab, defaultJobNumber, defaultInvoiceNumber, defaultShippingPo]);

  const patch = (key, value) => setActiveForm((f) => ({ ...f, [key]: value }));

  const openSendTo = () => {
    setSendOpen(true);
  };

  const shippingSendMeta = {
    toEmail: String(customerEmail || "").trim(),
    toName: String(customerName || "").trim(),
    from: resolveOutboundFromPreview(settings, companyName || user?.shopName || ""),
    documentLabel: shippingForm.invoiceNumber
      ? `Motor shipping ${shippingForm.invoiceNumber}`
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
    if (!onSave) {
      await alert({
        title: "Error",
        message: "Unable to save — service proposal is not ready.",
        variant: "danger",
      });
      return;
    }
    setSaving(true);
    try {
      await onSave({ kind: activeKind, form });
      // Stay open so user can switch tabs; refresh “has saved” via parent form update.
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const fields = (
    <>
      <p className={SECTION_TITLE}>
        {isReceiving ? "Inbound for repair" : "Outbound / return after repair"}
      </p>

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
          options={transportOptions}
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
    </>
  );

  return (
    <>
      <Modal
        open={open && !printing}
        onClose={() => {
          if (saving || sendOpen) return;
          onClose?.();
        }}
        title="Receiving & Shipping"
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
              {saving ? "Saving…" : hasSavedData ? "Update" : "Save"}
            </Button>
          </>
        }
      >
        <Form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <div
            role="tablist"
            aria-label="Receiving or shipping"
            className="flex w-full max-w-full shrink-0 flex-wrap gap-1 rounded-lg border border-border bg-[hsl(var(--form-bg))] p-1 dark:bg-card/60"
          >
            {[
              { id: KIND_RECEIVING, label: "Receiving" },
              { id: KIND_SHIPPING, label: "Shipping" },
            ].map((tab) => {
              const isActive = activeKind === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  disabled={saving}
                  className={`relative shrink-0 cursor-pointer rounded-md px-3.5 py-2 text-sm font-bold tracking-tight transition-[color,background-color,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "bg-primary/10 text-primary hover:bg-primary/15"
                  }`}
                  onClick={() => setActiveKind(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {fields}
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
            entry={shippingForm}
            customerName={customerName}
            companyName={companyName || user?.shopName || ""}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            paidByLabel={paidByLabel}
          />
        </DocumentPrintOffscreenPortal>
      ) : null}

      <SimpleMotorShippingSendModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        entry={shippingForm}
        sendMeta={shippingSendMeta}
        paidByLabel={paidByLabel}
        zIndex={zIndex + 10}
      />
    </>
  );
}

export { KIND_RECEIVING, KIND_SHIPPING };
