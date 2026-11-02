"use client";

import { useState } from "react";
import { FiDownload, FiEye, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import SimpleAttachmentFilePicker from "@/components/simple/simple-attachment-file-picker";
import SimpleAttachmentPreviewModal, {
  resolveAttachmentHref,
} from "@/components/simple/simple-attachment-preview-modal";
import { useAlert, useConfirm } from "@/components/confirm-provider";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

/**
 * Inline employee document attachments (same upload / preview / delete flow as Simple jobs).
 */
export default function SimpleEmployeeAttachments({
  recordId = "",
  attachments = [],
  onAttachmentsChange,
}) {
  const alert = useAlert();
  const confirm = useConfirm();
  const [documentName, setDocumentName] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState("");
  const [preview, setPreview] = useState(null);

  const id = String(recordId || "").trim();
  const list = Array.isArray(attachments) ? attachments : [];
  const busy = uploading || Boolean(deletingUrl);

  const handleAttach = async () => {
    if (!id) {
      await alert({
        title: "Error",
        message: "Save the employee before adding attachments.",
        variant: "danger",
      });
      return;
    }
    if (!file) {
      await alert({ title: "Error", message: "Choose a file to attach.", variant: "danger" });
      return;
    }
    if (!documentName.trim()) {
      await alert({ title: "Error", message: "Document name is required.", variant: "danger" });
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("documentName", documentName.trim());
      const res = await fetch(`/api/dashboard/employees/${encodeURIComponent(id)}/attachments`, {
        method: "POST",
        credentials: "include",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const next = Array.isArray(data.employee?.attachments)
        ? data.employee.attachments
        : data.attachment
          ? [...list, data.attachment]
          : list;
      onAttachmentsChange?.(next);
      setDocumentName("");
      setFile(null);
      await alert({ title: "Success", message: "Attachment uploaded." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Upload failed", variant: "danger" });
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = (row) => {
    const href = resolveAttachmentHref(row?.url);
    if (!href) {
      void alert({ title: "Error", message: "File URL is missing.", variant: "danger" });
      return;
    }
    setPreview({
      url: href,
      name: row?.name || "",
      contentType: row?.contentType || "",
    });
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
    const url = String(row?.url || "").trim();
    if (!id || !url) {
      await alert({ title: "Error", message: "Cannot delete this attachment.", variant: "danger" });
      return;
    }
    const ok = await confirm({
      title: "Delete attachment",
      message: `Delete "${row.name || "this document"}"? The file will be removed permanently.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingUrl(url);
    try {
      const res = await fetch(`/api/dashboard/employees/${encodeURIComponent(id)}/attachments`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const next = Array.isArray(data.employee?.attachments)
        ? data.employee.attachments
        : list.filter((_, i) => i !== index);
      onAttachmentsChange?.(next);
      await alert({ title: "Success", message: "Attachment deleted." });
    } catch (err) {
      await alert({ title: "Error", message: err?.message || "Delete failed", variant: "danger" });
    } finally {
      setDeletingUrl("");
    }
  };

  return (
    <>
      <p className={SECTION_TITLE}>Attachments</p>
      {!id ? (
        <p className="text-xs text-secondary">Save the employee first, then attach documents.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <label className={FIELD_LABEL} style={{ width: "6.75rem" }}>
              Document name
            </label>
            <input
              type="text"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
              className={FIELD_INPUT}
              placeholder="e.g. Driver license"
              disabled={busy}
              autoComplete="off"
            />
          </div>
          <div className="flex min-w-0 items-center gap-2.5">
            <label className={FIELD_LABEL} style={{ width: "6.75rem" }}>
              Attachment
            </label>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <SimpleAttachmentFilePicker
                disabled={busy}
                showSelectedName
                selectedName={file?.name || ""}
                onFiles={(files) => {
                  const next = files[0] || null;
                  setFile(next);
                  if (next && !documentName.trim()) {
                    setDocumentName(next.name.replace(/\.[^.]+$/, "") || next.name);
                  }
                }}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={busy || !file || !documentName.trim()}
                onClick={() => void handleAttach()}
              >
                {uploading ? "Uploading…" : "Attach"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {list.length > 0 ? (
        <div className="mt-2 max-h-40 overflow-auto border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 dark:bg-card">
                <th className="w-20 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-title">
                  Actions
                </th>
                <th className="px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-title">
                  Document
                </th>
                <th className="w-10 px-2 py-1 text-left text-xs font-bold uppercase tracking-wide text-title" />
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
                          title="Preview"
                          aria-label={`Preview ${row.name || "document"}`}
                          disabled={busy}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-primary hover:bg-primary/10 disabled:opacity-40"
                          onClick={() => openAttachment(row)}
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
                      </div>
                    </td>
                    <td className="min-w-0 px-2 py-1">
                      <span className="block truncate text-title" title={row.name || row.url}>
                        {row.name || row.url}
                      </span>
                    </td>
                    <td className="px-1.5 py-1 text-center">
                      <button
                        type="button"
                        title="Delete"
                        aria-label={`Delete ${row.name || "document"}`}
                        disabled={busy}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-danger hover:bg-danger/10 disabled:opacity-40"
                        onClick={() => void deleteAttachment(row, index)}
                      >
                        <FiX className={`h-4 w-4 shrink-0 ${rowBusy ? "animate-pulse" : ""}`} aria-hidden />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : id ? (
        <p className="mt-1 text-xs text-secondary">No documents attached.</p>
      ) : null}
      <SimpleAttachmentPreviewModal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        url={preview?.url}
        name={preview?.name}
        contentType={preview?.contentType}
      />
    </>
  );
}
