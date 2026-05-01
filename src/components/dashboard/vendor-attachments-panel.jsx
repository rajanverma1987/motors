"use client";

import { useId } from "react";
import { FiTrash2, FiExternalLink, FiUpload } from "react-icons/fi";

/**
 * @typedef {{ url: string, name: string }} VendorAttachment
 */

/**
 * @param {{
 *   title?: string,
 *   vendorId: string | null,
 *   attachments: VendorAttachment[],
 *   onAttachmentsChange: (next: VendorAttachment[]) => void,
 *   pendingFiles: File[],
 *   onPendingFilesChange: (next: File[]) => void,
 *   uploading?: boolean,
 *   onPickFilesForUpload?: (files: File[], vendorId: string | null) => void | Promise<void>,
 *   hideUpload?: boolean,
 *   onRemoveSavedRow?: (index: number, row: VendorAttachment) => void | Promise<void>,
 * }} props
 */
export default function VendorAttachmentsPanel({
  title = "Documents",
  vendorId,
  attachments,
  onAttachmentsChange,
  pendingFiles,
  onPendingFilesChange,
  uploading = false,
  onPickFilesForUpload,
  hideUpload = false,
  onRemoveSavedRow,
}) {
  const fileInputId = useId();
  const isCreate = !vendorId;

  const handleFileChange = async (e) => {
    if (hideUpload) return;
    const list = e.target.files;
    if (!list?.length) return;
    const files = Array.from(list);
    e.target.value = "";
    if (isCreate) {
      onPendingFilesChange((prev) => [...(Array.isArray(prev) ? prev : []), ...files].slice(0, 50));
      return;
    }
    if (onPickFilesForUpload && vendorId) {
      await onPickFilesForUpload(files, vendorId);
    }
  };

  const removePending = (index) => {
    onPendingFilesChange((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  };

  const removeAttachment = (index) => {
    const row = attachments[index];
    if (onRemoveSavedRow) {
      void Promise.resolve(onRemoveSavedRow(index, row));
      return;
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const viewUrl = (url) => {
    const u = String(url || "").trim();
    if (!u) return;
    if (u.startsWith("http://") || u.startsWith("https://")) window.open(u, "_blank", "noopener,noreferrer");
    else window.open(u.startsWith("/") ? u : `/${u}`, "_blank", "noopener,noreferrer");
  };

  const hasRows = attachments.length > 0 || pendingFiles.length > 0;

  return (
    <div className="w-full min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-medium text-secondary">{title}</div>
          <p className="mt-0.5 text-xs text-secondary">
            {hideUpload
              ? "View or remove documents. Removals save immediately."
              : isCreate
                ? "Select files before saving; they upload after the vendor is created."
                : "Upload files stored with this vendor. Save the form to persist removals."}
          </p>
        </div>
        {!hideUpload ? (
          <div className="flex shrink-0 items-center gap-2">
            <input
              id={fileInputId}
              type="file"
              multiple
              disabled={uploading}
              aria-label="Add files"
              className="sr-only"
              accept="*/*"
              onChange={handleFileChange}
            />
            <label
              htmlFor={fileInputId}
              className={`inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border-[0.5px] border-border bg-transparent px-3 py-1 text-sm text-text transition-opacity hover:bg-card hover:border-primary/20 ${
                uploading ? "pointer-events-none cursor-not-allowed opacity-50" : ""
              }`}
            >
              <FiUpload className="h-4 w-4 shrink-0" aria-hidden />
              {uploading ? "Uploading…" : "Add files"}
            </label>
          </div>
        ) : null}
      </div>

      {!hasRows ? (
        <p className="rounded-md border border-dashed border-border bg-card/50 px-3 py-6 text-center text-sm text-secondary">
          No documents yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-title">Name</th>
                <th className="w-28 px-3 py-2 text-right font-medium text-title">Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((row, i) => (
                <tr key={`${row.url}-${i}`} className="border-b border-border last:border-b-0">
                  <td className="max-w-[20rem] truncate px-3 py-2 text-title" title={row.name || row.url}>
                    {row.name || row.url || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="View document"
                        title="View"
                        onClick={() => viewUrl(row.url)}
                      >
                        <FiExternalLink className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-40"
                        aria-label="Remove from list"
                        title="Remove"
                        onClick={() => removeAttachment(i)}
                      >
                        <FiTrash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingFiles.map((file, i) => (
                <tr key={`pending-${file.name}-${i}`} className="border-b border-border last:border-b-0 bg-muted/10">
                  <td className="max-w-[20rem] truncate px-3 py-2 text-title" title={file.name}>
                    {file.name}
                    <span className="ml-2 text-xs text-amber-700">(pending upload)</span>
                  </td>
                  <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={uploading}
                        className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-40"
                        aria-label="Remove file"
                        onClick={() => removePending(i)}
                      >
                      <FiTrash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
