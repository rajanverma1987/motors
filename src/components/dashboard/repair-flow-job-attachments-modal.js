"use client";

import { useState, useEffect, useRef } from "react";
import { FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";

/**
 * Upload / list / remove files on a MotorRepairJob (Job Write-Up).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.jobId
 * @param {string} [props.jobNumber]
 * @param {() => void} [props.onAfterChange] — e.g. refetch job in parent
 */
export default function RepairFlowJobAttachmentsModal({ open, onClose, jobId, jobNumber, onAfterChange }) {
  const toast = useToast();
  const loadingIdRef = useRef(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState(null);

  useEffect(() => {
    if (!open || !jobId) return;
    let cancelled = false;
    loadingIdRef.current = jobId;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled || loadingIdRef.current !== jobId) return;
        const j = data.job;
        const att = Array.isArray(j?.attachments) ? j.attachments : [];
        setList(att);
      } catch {
        if (!cancelled && loadingIdRef.current === jobId) setList([]);
      } finally {
        if (!cancelled && loadingIdRef.current === jobId) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  const handleUpload = async (e) => {
    const files = e.target?.files;
    if (!files?.length || !jobId) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append("files", files[i]);
    setUploading(true);
    try {
      const res = await fetch(`/api/dashboard/repair-flow/jobs/${jobId}/attachments/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      if (Array.isArray(data.attachments)) {
        setList(data.attachments);
        onAfterChange?.();
      }
      toast.success("Files attached.");
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (att) => {
    if (!jobId || !att?.url) return;
    setDeletingUrl(att.url);
    try {
      const nextList = list.filter((a) => a.url !== att.url);
      const res = await fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attachments: nextList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove attachment");
      setList(nextList);
      onAfterChange?.();
      toast.success("Attachment removed.");
    } catch (err) {
      toast.error(err.message || "Failed to remove attachment");
    } finally {
      setDeletingUrl(null);
    }
  };

  const title = jobNumber ? `Job attachments · ${jobNumber}` : "Job attachments";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      zIndex={100}
      actions={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Files are stored on this repair job (not on individual RFQs). They stay with the job for shop reference.
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium text-title">Select files to attach</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              multiple
              className="block w-full max-w-xs text-sm text-secondary file:mr-2 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:cursor-pointer hover:file:opacity-90"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? <span className="text-sm text-secondary">Uploading…</span> : null}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Attached documents</h3>
          {loading ? (
            <p className="text-sm text-secondary">Loading…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-secondary">No attachments yet. Select files above to add them.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-title">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-title">Link</th>
                    <th className="w-10 px-2 py-2 text-right font-medium text-title" aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((att, i) => (
                    <tr key={`${att.url}-${i}`} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-title">{att.name || att.url || "—"}</td>
                      <td className="px-3 py-2">
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:no-underline"
                        >
                          Open
                        </a>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(att)}
                          disabled={deletingUrl === att.url}
                          className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Delete attachment"
                          title="Delete"
                        >
                          <FiTrash2 className="h-4 w-4 shrink-0" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
