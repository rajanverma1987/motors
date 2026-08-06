"use client";

import { useEffect, useId, useState } from "react";
import { FiDownload, FiEye, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useConfirm, useAlert } from "@/components/confirm-provider";

const FORM_ID = "simple-po-attachments-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

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

function resolveAttachmentHref(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("/") ? u : `/${u}`;
}

/**
 * Attach vendor invoices / documents for a saved Simple purchase order.
 */
export default function SimplePurchaseOrderAttachmentsModal({
  open,
  onClose,
  recordId,
  documents = [],
  onAttached,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const fileInputId = useId();
  const [documentName, setDocumentName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setDocumentName("");
    setFile(null);
    setUploading(false);
    setDeletingUrl("");
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = String(recordId || "").trim();
    if (!id) {
      await alert({ title: "Error", message: "Save the purchase order before adding attachments.", variant: "danger" });
      return;
    }
    if (!file) {
      await alert({ title: "Error", message: "Choose a file to attach.", variant: "danger" });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("documentName", documentName.trim() || file.name || "Attachment");
      const res = await fetch(`/api/dashboard/simple-purchase-orders/${encodeURIComponent(id)}/attachments`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const attachment = data.attachment;
      if (!attachment?.url) throw new Error("Invalid upload response");
      const next = [...(Array.isArray(documents) ? documents : []), attachment];
      onAttached?.(attachment, next);
      setDocumentName("");
      setFile(null);
      await alert({ title: "Success", message: "Attachment uploaded." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Upload failed", variant: "danger" });
    } finally {
      setUploading(false);
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

  const deleteAttachment = async (row, index) => {
    const id = String(recordId || "").trim();
    const url = String(row?.url || "").trim();
    if (!id || !url) {
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

    setDeletingUrl(url);
    try {
      const res = await fetch(`/api/dashboard/simple-purchase-orders/${encodeURIComponent(id)}/attachments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const next = (Array.isArray(documents) ? documents : []).filter((_, i) => i !== index);
      onAttached?.(row, next);
      await alert({ title: "Success", message: "Attachment deleted." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Delete failed", variant: "danger" });
    } finally {
      setDeletingUrl("");
    }
  };

  const busy = uploading || Boolean(deletingUrl);

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title="Vendor invoices & documents"
      size="md"
      showClose={!busy}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={busy || !file}>
          {uploading ? "Uploading…" : "Attach"}
        </Button>
      }
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <FieldRow label="Document name">
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className={FIELD_INPUT}
            placeholder="Vendor invoice #…"
            disabled={busy}
          />
        </FieldRow>
        <FieldRow label="File">
          <input
            id={fileInputId}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full min-w-0 text-xs text-title file:mr-2 file:rounded-sm file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:font-semibold file:text-white"
            disabled={busy}
          />
        </FieldRow>
      </Form>

      {Array.isArray(documents) && documents.length > 0 ? (
        <div className="mt-4 overflow-auto border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-border bg-primary/[0.04] text-title">
                <th className="w-16 px-1 py-1 text-left font-semibold">Actions</th>
                <th className="px-1 py-1 text-left font-semibold">Name</th>
                <th className="w-10 px-1 py-1 text-left font-semibold" />
              </tr>
            </thead>
            <tbody>
              {documents.map((row, index) => (
                <tr key={`${row.url}-${index}`} className="border-t border-border bg-card">
                  <td className="px-1 py-0.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded p-0.5 text-primary hover:bg-primary/10"
                        title="View"
                        aria-label="View"
                        onClick={() => openAttachment(row.url)}
                        disabled={busy}
                      >
                        <FiEye className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-primary hover:bg-primary/10"
                        title="Download"
                        aria-label="Download"
                        onClick={() => downloadAttachment(row)}
                        disabled={busy}
                      >
                        <FiDownload className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-0.5 text-title">{row.name || "—"}</td>
                  <td className="px-1 py-0.5 text-center">
                    <button
                      type="button"
                      className="rounded p-0.5 text-danger hover:bg-danger/10"
                      title="Delete"
                      aria-label="Delete"
                      onClick={() => deleteAttachment(row, index)}
                      disabled={busy || deletingUrl === row.url}
                    >
                      <FiX className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-xs text-secondary">No vendor documents attached yet.</p>
      )}
    </Modal>
  );
}
