"use client";

import { useEffect, useId, useState } from "react";
import { FiDownload, FiEye, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useConfirm, useAlert } from "@/components/confirm-provider";

const FORM_ID = "simple-sp-attachments-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
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
 * Compact attach-document dialog for a saved Simple service proposal / invoice.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   recordId: string | null | undefined,
 *   attachments?: { url: string, name: string }[],
 *   onAttached?: (attachment: { url: string, name: string }, next: { url: string, name: string }[]) => void,
 * }} props
 */
export default function SimpleServiceProposalAttachmentsModal({
  open,
  onClose,
  recordId,
  attachments = [],
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
      await alert({ title: "Error", message: "Save the record before adding attachments.", variant: "danger" });
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
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/attachments`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const attachment = data.attachment;
      if (!attachment?.url) throw new Error("Invalid upload response");
      const next = [...(Array.isArray(attachments) ? attachments : []), attachment];
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
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/attachments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const next = (Array.isArray(attachments) ? attachments : []).filter((_, i) => i !== index);
      onAttached?.(row, next);
      await alert({ title: "Success", message: "Attachment deleted." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Delete failed", variant: "danger" });
    } finally {
      setDeletingUrl("");
    }
  };

  const busy = uploading || Boolean(deletingUrl);

  const headerActions = (
    <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={busy || !file || !recordId}>
      {uploading ? "Uploading…" : "Attach"}
    </Button>
  );

  const list = Array.isArray(attachments) ? attachments : [];

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose?.()}
      title="Add Attachments"
      size="md"
      width="min(520px, 96vw)"
      showClose={!busy}
      closeOnOutsideClick={false}
      actions={headerActions}
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="!space-y-3 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <FieldRow label="Document name">
          <input
            type="text"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            className={FIELD_INPUT}
            placeholder="e.g. Nameplate photo"
            disabled={busy}
            autoComplete="off"
          />
        </FieldRow>
        <FieldRow label="Attachment">
          <div className="flex min-w-0 items-center gap-2">
            <input
              id={fileInputId}
              type="file"
              className="sr-only"
              disabled={busy}
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
              className={`${FIELD_INPUT} inline-flex cursor-pointer items-center justify-center !w-auto shrink-0 px-2 ${
                busy ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Choose file…
            </label>
            <span className="min-w-0 truncate text-xs text-secondary">
              {file?.name || "No file selected"}
            </span>
          </div>
        </FieldRow>
        {!recordId ? (
          <p className="text-xs text-secondary">Save the service proposal first, then attach documents.</p>
        ) : null}
        {list.length > 0 ? (
          <div className="border-t border-border pt-2">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-title">Attached</p>
            <div className="max-h-48 overflow-auto border border-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 dark:bg-card">
                    <th className="w-28 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-title">
                      Actions
                    </th>
                    <th className="px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-title">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, index) => {
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
                              onClick={() => openAttachment(row.url)}
                            >
                              <FiEye className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Download"
                              aria-label={`Download ${row.name || "document"}`}
                              disabled={busy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10 disabled:opacity-40"
                              onClick={() => downloadAttachment(row)}
                            >
                              <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title="Delete"
                              aria-label={`Delete ${row.name || "document"}`}
                              disabled={busy}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-danger hover:bg-danger/10 disabled:opacity-40"
                              onClick={() => deleteAttachment(row, index)}
                            >
                              <FiTrash2 className={`h-4 w-4 shrink-0 ${rowBusy ? "animate-pulse" : ""}`} aria-hidden />
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
          </div>
        ) : null}
      </Form>
    </Modal>
  );
}
