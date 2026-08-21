"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { FiDownload, FiEye, FiPrinter, FiSend, FiTrash2, FiUpload } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import SimpleSelect from "@/components/simple/simple-select";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import SimpleMotorShippingPrintSheet from "@/components/simple/simple-motor-shipping-print-sheet";
import SimpleMotorShippingSendModal from "@/components/simple/simple-motor-shipping-send-modal";
import { useAlert, useConfirm } from "@/components/confirm-provider";
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

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

function FieldRow({ label, labelWidth = "7.25rem", children }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function resolveAttachmentHref(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("/") ? u : `/${u}`;
}

function LogisticsColumn({
  kind,
  title,
  subtitle,
  form,
  patch,
  transportOptions,
  paidByOptions,
  busy,
  savingThis,
  hasSavedData,
  onSave,
  recordId,
  documentName,
  setDocumentName,
  file,
  setFile,
  fileInputId,
  onUpload,
  onView,
  onDownload,
  onDelete,
  deletingUrl,
  headerExtra = null,
}) {
  const isReceiving = kind === KIND_RECEIVING;
  const attachments = Array.isArray(form.attachments) ? form.attachments : [];

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-md border border-border bg-card/40 p-3 dark:bg-card/20">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-title sm:text-lg">{title}</h3>
          <p className="mt-0.5 text-xs text-secondary">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {headerExtra}
          <Button type="button" variant="primary" size="sm" disabled={busy} onClick={onSave}>
            {savingThis ? "Saving…" : hasSavedData || attachments.length > 0 ? "Update" : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-2.5 overflow-y-auto pr-0.5">
        {isReceiving ? (
          <FieldRow label="REF# / Job">
            <input
              type="text"
              value={form.jobNumber}
              onChange={(e) => patch("jobNumber", e.target.value)}
              className={FIELD_INPUT}
              placeholder="e.g. A00001"
              disabled={busy}
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
                disabled={busy}
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
                disabled={busy}
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
            disabled={busy}
          />
        </FieldRow>

        <FieldRow label="Transport">
          <SimpleSelect
            options={transportOptions}
            value={form.mannerOfTransport}
            onChange={(e) => patch("mannerOfTransport", e.target.value)}
            searchable={false}
            disabled={busy}
            aria-label={`${title} manner of transport`}
          />
        </FieldRow>

        <FieldRow label="Freight">
          <input
            type="text"
            value={form.freight}
            onChange={(e) => patch("freight", e.target.value)}
            className={FIELD_INPUT}
            placeholder="Carrier, account #, BOL, etc."
            disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
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
            disabled={busy}
          />
        </FieldRow>

        <FieldRow label="Paid By">
          <SimpleSelect
            options={paidByOptions}
            value={form.paidBy}
            onChange={(e) => patch("paidBy", e.target.value)}
            searchable={false}
            disabled={busy}
            aria-label={`${title} paid by`}
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
            disabled={busy}
            aria-label={`${title} notes`}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-2 border-t border-border pt-3">
          <p className={SECTION_TITLE}>Attachments</p>
          <p className="text-xs text-secondary">
            Upload BOL, photos, or other documents. Files save immediately.
          </p>
          <div className="flex min-w-0 flex-col gap-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-title" htmlFor={`${fileInputId}-name`}>
                Document name
              </label>
              <input
                id={`${fileInputId}-name`}
                type="text"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                className={FIELD_INPUT}
                placeholder="e.g. BOL scan"
                disabled={busy || !recordId}
                autoComplete="off"
              />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <input
                id={fileInputId}
                type="file"
                className="sr-only"
                disabled={busy || !recordId}
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  setFile(next);
                  if (next && !documentName.trim()) {
                    setDocumentName(next.name.replace(/\.[^.]+$/, "") || next.name);
                  }
                }}
              />
              <label
                htmlFor={fileInputId}
                className={`${FIELD_INPUT} inline-flex cursor-pointer items-center justify-center gap-1.5 !w-auto shrink-0 px-2 ${
                  busy || !recordId ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <FiUpload className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Choose file…
              </label>
              <span className="min-w-0 flex-1 truncate text-xs text-secondary">
                {file?.name || "No file selected"}
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy || !file || !recordId}
                onClick={onUpload}
                className="shrink-0"
              >
                Upload
              </Button>
            </div>
          </div>

          {attachments.length === 0 ? (
            <p className="rounded-sm border border-dashed border-border bg-bg/60 px-3 py-4 text-center text-sm text-secondary">
              No documents yet.
            </p>
          ) : (
            <div className="max-h-44 overflow-auto border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 dark:bg-card">
                    <th className="w-24 px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-title">
                      Actions
                    </th>
                    <th className="px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wide text-title">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {attachments.map((row, index) => {
                    const rowBusy = deletingUrl === String(row.url || "");
                    return (
                      <tr key={`${row.url}-${index}`} className="border-b border-border last:border-b-0">
                        <td className="px-1.5 py-1">
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              title="View"
                              aria-label={`View ${row.name || "document"}`}
                              disabled={busy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10 disabled:opacity-40"
                              onClick={() => onView(row.url)}
                            >
                              <FiEye className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Download"
                              aria-label={`Download ${row.name || "document"}`}
                              disabled={busy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10 disabled:opacity-40"
                              onClick={() => onDownload(row)}
                            >
                              <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              aria-label={`Delete ${row.name || "document"}`}
                              disabled={busy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-danger hover:bg-danger/10 disabled:opacity-40"
                              onClick={() => onDelete(row)}
                            >
                              <FiTrash2
                                className={`h-4 w-4 shrink-0 ${rowBusy ? "animate-pulse" : ""}`}
                                aria-hidden
                              />
                            </button>
                          </div>
                        </td>
                        <td className="min-w-0 px-2 py-1">
                          <span className="block truncate text-title" title={row.name || row.url}>
                            {row.name || row.url}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Simple portal Motor Receiving + Shipping — wide two-column form on SimpleServiceProposal.
 */
export default function SimpleMotorLogisticsModal({
  open,
  onClose,
  /** @deprecated Still accepted; both columns always shown. */
  kind = KIND_RECEIVING,
  /** @deprecated Still accepted; both columns always shown. */
  initialTab: _initialTab = null,
  serviceProposalId = "",
  defaultJobNumber = "",
  defaultInvoiceNumber = "",
  defaultShippingPo = "",
  initialReceiving = null,
  initialShipping = null,
  /** @deprecated Prefer initialReceiving / initialShipping */
  initialRecord = null,
  onSave,
  /** Called after upload/delete so parent form stays in sync without a full Save. */
  onAttachmentsChange,
  customerName = "",
  companyName = "",
  customerEmail = "",
  customerPhone = "",
  zIndex = 130,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const receivingFileId = useId();
  const shippingFileId = useId();
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

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
  const [savingKind, setSavingKind] = useState("");
  const [printing, setPrinting] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [receivingDocName, setReceivingDocName] = useState("");
  const [shippingDocName, setShippingDocName] = useState("");
  const [receivingFile, setReceivingFile] = useState(null);
  const [shippingFile, setShippingFile] = useState(null);
  const [uploadingKind, setUploadingKind] = useState("");
  const [deletingKey, setDeletingKey] = useState("");

  const recordId = String(serviceProposalId || "").trim();

  const receivingTransportOptions = useMemo(
    () => productDropdownSelectOptions(mergedSettings, mannerOfTransportDropdownKey(KIND_RECEIVING)),
    [mergedSettings]
  );
  const shippingTransportOptions = useMemo(
    () => productDropdownSelectOptions(mergedSettings, mannerOfTransportDropdownKey(KIND_SHIPPING)),
    [mergedSettings]
  );

  const customerLabel = String(customerName || "").trim() || "Customer";
  const companyLabel = String(companyName || "").trim() || "Company";
  const paidByOptions = [
    { value: "", label: "Select paid by" },
    { value: "customer", label: customerLabel },
    { value: "company", label: companyLabel },
  ];
  const paidByLabel =
    shippingForm.paidBy === "customer"
      ? customerLabel
      : shippingForm.paidBy === "company"
        ? companyLabel
        : "";

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

  const hasSavedReceiving = motorLogisticsRecordHasData(receivingSeed);
  const hasSavedShipping = motorLogisticsRecordHasData(shippingSeed);

  useEffect(() => {
    if (!open) {
      setSavingKind("");
      setPrinting(false);
      setSendOpen(false);
      setReceivingDocName("");
      setShippingDocName("");
      setReceivingFile(null);
      setShippingFile(null);
      setUploadingKind("");
      setDeletingKey("");
      return;
    }

    const defaults = {
      jobNumber: defaultJobNumber,
      invoiceNumber: defaultInvoiceNumber,
      shippingPo: defaultShippingPo,
    };
    setReceivingForm(normalizeMotorLogisticsRecord(receivingSeed, KIND_RECEIVING, defaults));
    setShippingForm(normalizeMotorLogisticsRecord(shippingSeed, KIND_SHIPPING, defaults));
    setReceivingDocName("");
    setShippingDocName("");
    setReceivingFile(null);
    setShippingFile(null);
    // Seed intentionally from open-time props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when modal opens
  }, [open, defaultJobNumber, defaultInvoiceNumber, defaultShippingPo]);

  const patchReceiving = (key, value) => setReceivingForm((f) => ({ ...f, [key]: value }));
  const patchShipping = (key, value) => setShippingForm((f) => ({ ...f, [key]: value }));

  const applyAttachments = (kind, nextAttachments) => {
    const next = Array.isArray(nextAttachments) ? nextAttachments : [];
    if (kind === KIND_SHIPPING) {
      setShippingForm((f) => ({ ...f, attachments: next }));
    } else {
      setReceivingForm((f) => ({ ...f, attachments: next }));
    }
    onAttachmentsChange?.({ kind, attachments: next });
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

  const saveKind = async (kind) => {
    const form = kind === KIND_SHIPPING ? shippingForm : receivingForm;
    if (!String(form.date || "").trim()) {
      await alert({
        title: "Error",
        message: `${kind === KIND_SHIPPING ? "Shipping" : "Receiving"} date is required.`,
        variant: "danger",
      });
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
    setSavingKind(kind);
    try {
      await onSave({ kind, form });
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to save",
        variant: "danger",
      });
    } finally {
      setSavingKind("");
    }
  };

  const uploadForKind = async (kind) => {
    const file = kind === KIND_SHIPPING ? shippingFile : receivingFile;
    const documentName = kind === KIND_SHIPPING ? shippingDocName : receivingDocName;
    if (!recordId) {
      await alert({
        title: "Error",
        message: "Save the service proposal before adding attachments.",
        variant: "danger",
      });
      return;
    }
    if (!file) {
      await alert({ title: "Error", message: "Choose a file to attach.", variant: "danger" });
      return;
    }
    setUploadingKind(kind);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      body.append("documentName", documentName.trim() || file.name || "Attachment");
      const res = await fetch(
        `/api/dashboard/simple-service-proposals/${encodeURIComponent(recordId)}/logistics-attachments`,
        { method: "POST", credentials: "include", body }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      applyAttachments(kind, data.attachments);
      if (kind === KIND_SHIPPING) {
        setShippingDocName("");
        setShippingFile(null);
      } else {
        setReceivingDocName("");
        setReceivingFile(null);
      }
      await alert({ title: "Success", message: "Attachment uploaded." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Upload failed", variant: "danger" });
    } finally {
      setUploadingKind("");
    }
  };

  const openAttachment = (url) => {
    const href = resolveAttachmentHref(url);
    if (!href) {
      void alert({ title: "Error", message: "File URL is missing.", variant: "danger" });
      return;
    }
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const downloadAttachment = (row) => {
    const href = resolveAttachmentHref(row?.url);
    if (!href) {
      void alert({ title: "Error", message: "File URL is missing.", variant: "danger" });
      return;
    }
    const a = document.createElement("a");
    a.href = href;
    a.download = String(row?.name || "attachment").trim() || "attachment";
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const deleteAttachment = async (kind, row) => {
    const url = String(row?.url || "").trim();
    if (!recordId || !url) {
      await alert({ title: "Error", message: "Cannot delete this attachment.", variant: "danger" });
      return;
    }
    const ok = await confirm({
      title: "Delete attachment",
      message: `Delete “${row.name || "this document"}”? The file will be removed permanently.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingKey(`${kind}|${url}`);
    try {
      const res = await fetch(
        `/api/dashboard/simple-service-proposals/${encodeURIComponent(recordId)}/logistics-attachments`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, kind }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      applyAttachments(kind, data.attachments);
      await alert({ title: "Success", message: "Attachment deleted." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Delete failed", variant: "danger" });
    } finally {
      setDeletingKey("");
    }
  };

  const busy = Boolean(savingKind) || Boolean(uploadingKind) || Boolean(deletingKey);

  return (
    <>
      <Modal
        open={open && !printing}
        onClose={() => {
          if (busy || sendOpen) return;
          onClose?.();
        }}
        title="Receiving & Shipping"
        size="6xl"
        width="min(1120px, 98vw)"
        height="min(92vh, 900px)"
        zIndex={zIndex}
        showClose={!busy}
        closeOnOutsideClick={false}
      >
        <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
          <LogisticsColumn
            kind={KIND_RECEIVING}
            title="Receiving"
            subtitle="Inbound for repair"
            form={receivingForm}
            patch={patchReceiving}
            transportOptions={receivingTransportOptions}
            paidByOptions={paidByOptions}
            busy={busy}
            savingThis={savingKind === KIND_RECEIVING}
            hasSavedData={hasSavedReceiving}
            onSave={() => saveKind(KIND_RECEIVING)}
            recordId={recordId}
            documentName={receivingDocName}
            setDocumentName={setReceivingDocName}
            file={receivingFile}
            setFile={setReceivingFile}
            fileInputId={receivingFileId}
            onUpload={() => uploadForKind(KIND_RECEIVING)}
            onView={openAttachment}
            onDownload={downloadAttachment}
            onDelete={(row) => deleteAttachment(KIND_RECEIVING, row)}
            deletingUrl={
              deletingKey.startsWith(`${KIND_RECEIVING}|`)
                ? deletingKey.slice(`${KIND_RECEIVING}|`.length)
                : ""
            }
          />

          <div
            className="hidden w-px shrink-0 self-stretch bg-title/35 dark:bg-title/45 lg:mx-4 lg:block"
            aria-hidden
          />

          <LogisticsColumn
            kind={KIND_SHIPPING}
            title="Shipping"
            subtitle="Outbound / return after repair"
            form={shippingForm}
            patch={patchShipping}
            transportOptions={shippingTransportOptions}
            paidByOptions={paidByOptions}
            busy={busy}
            savingThis={savingKind === KIND_SHIPPING}
            hasSavedData={hasSavedShipping}
            onSave={() => saveKind(KIND_SHIPPING)}
            recordId={recordId}
            documentName={shippingDocName}
            setDocumentName={setShippingDocName}
            file={shippingFile}
            setFile={setShippingFile}
            fileInputId={shippingFileId}
            onUpload={() => uploadForKind(KIND_SHIPPING)}
            onView={openAttachment}
            onDownload={downloadAttachment}
            onDelete={(row) => deleteAttachment(KIND_SHIPPING, row)}
            deletingUrl={
              deletingKey.startsWith(`${KIND_SHIPPING}|`)
                ? deletingKey.slice(`${KIND_SHIPPING}|`.length)
                : ""
            }
            headerExtra={
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-1.5"
                  disabled={busy}
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
                  disabled={busy}
                  onClick={() => setSendOpen(true)}
                >
                  <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                  Send to
                </Button>
              </>
            }
          />
        </div>
      </Modal>

      {printing ? (
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
