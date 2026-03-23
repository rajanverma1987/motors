"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { FiX, FiImage } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";

const CATEGORIES = [
  { value: "bug", label: "Bug / something broken" },
  { value: "question", label: "Question" },
  { value: "billing", label: "Billing" },
  { value: "feature_request", label: "Feature request" },
  { value: "other", label: "Other" },
];

const MAX_TICKET_PHOTOS = 6;

const STATUS_LABEL = {
  open: "Open",
  in_progress: "In progress",
  waiting_customer: "Awaiting your reply",
  resolved: "Resolved",
  closed: "Closed",
};

/** Pill styles: solid contrast on light + dark backgrounds */
const STATUS_TAG_CLASS = {
  open:
    "shrink-0 rounded-full border border-sky-300 bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-900 dark:border-sky-700 dark:bg-sky-950/70 dark:text-sky-100",
  in_progress:
    "shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-50",
  waiting_customer:
    "shrink-0 rounded-full border border-violet-300 bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-900 dark:border-violet-700 dark:bg-violet-950/70 dark:text-violet-100",
  resolved:
    "shrink-0 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/55 dark:text-emerald-50",
  closed:
    "shrink-0 rounded-full border border-slate-300 bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100",
};

function SupportStatusTag({ status }) {
  const label = STATUS_LABEL[status] || status || "—";
  const cls = STATUS_TAG_CLASS[status] || STATUS_TAG_CLASS.closed;
  return (
    <span className={cls} role="status">
      {label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function SupportPageClient() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("bug");
  const [newDescription, setNewDescription] = useState("");
  const [newAttachments, setNewAttachments] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/support/tickets", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTickets(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Could not load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row) => {
    setSelectedId(row.id);
    setDetailOpen(true);
    setDetail(null);
    setReplyText("");
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/support/tickets/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data);
    } catch (e) {
      toast.error(e.message || "Could not load ticket");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedId(null);
    setDetail(null);
    setReplyText("");
  };

  const closeCreateModal = () => {
    setCreateOpen(false);
    setNewSubject("");
    setNewCategory("bug");
    setNewDescription("");
    setNewAttachments([]);
  };

  const handlePhotoInput = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_TICKET_PHOTOS - newAttachments.length;
    if (room <= 0) {
      toast.error(`You can attach up to ${MAX_TICKET_PHOTOS} photos.`);
      return;
    }
    const take = files.slice(0, room);
    setUploadingPhoto(true);
    try {
      for (const file of take) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/dashboard/support/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        if (data.url) setNewAttachments((prev) => [...prev, data.url]);
      }
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removeAttachment = (url) => {
    setNewAttachments((prev) => prev.filter((u) => u !== url));
  };

  async function handleCreate(e) {
    e.preventDefault();
    if (!newSubject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!newDescription.trim()) {
      toast.error("Describe the issue.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: newSubject.trim(),
          category: newCategory,
          description: newDescription.trim(),
          attachments: newAttachments,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`Ticket ${data.ticket?.ticketRef || ""} submitted.`);
      closeCreateModal();
      load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function sendReply() {
    if (!selectedId || !replyText.trim()) {
      toast.error("Enter a message.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/support/tickets/${selectedId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.ticket);
      setReplyText("");
      toast.success("Reply sent.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: "ticketRef", label: "Ticket", clickable: true },
      { key: "subject", label: "Subject", clickable: true },
      {
        key: "category",
        label: "Category",
        clickable: true,
        render: (v) => CATEGORIES.find((c) => c.value === v)?.label || v,
      },
      {
        key: "status",
        label: "Status",
        clickable: true,
        render: (v) => STATUS_LABEL[v] || v,
      },
      {
        key: "updatedAt",
        label: "Updated",
        clickable: true,
        render: (v) => fmtDate(v),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-title">Support</h1>
            <p className="mt-1 text-sm text-secondary">
              Report bugs or ask for help. Our team reads every ticket and replies here.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              New ticket
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={tickets}
          rowKey="id"
          loading={loading}
          fillHeight
          emptyMessage="No tickets yet. Use New ticket to contact support."
          onCellClick={(row) => openDetail(row)}
        />
      </div>
      <p className="mt-2 shrink-0 text-xs text-secondary">Click any cell in a row to open the conversation.</p>

      <Modal open={createOpen} onClose={closeCreateModal} title="New support ticket" size="5xl" actions={null}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input
            label="Subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Short summary"
            required
          />
          <Select
            label="Category"
            options={CATEGORIES}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value ?? "bug")}
          />
          <Textarea
            label="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="What happened? Steps to reproduce, page or feature, screenshots if helpful."
            rows={6}
            required
          />
          <div>
            <span className="mb-1 inline-flex items-center gap-1.5 text-sm text-title">
              <FiImage className="h-4 w-4 text-secondary" aria-hidden />
              Photos (optional)
            </span>
            <p className="mb-2 text-xs text-secondary">
              Up to {MAX_TICKET_PHOTOS} images (JPG, PNG, WebP, GIF), 8MB each — e.g. screenshots of an error.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
              multiple
              className="hidden"
              onChange={handlePhotoInput}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingPhoto || newAttachments.length >= MAX_TICKET_PHOTOS}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadingPhoto ? "Uploading…" : "Add photos"}
            </Button>
            {newAttachments.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {newAttachments.map((src) => (
                  <div key={src} className="relative inline-block">
                    <img src={src} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                    <button
                      type="button"
                      onClick={() => removeAttachment(src)}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-secondary shadow hover:bg-danger hover:text-white"
                      aria-label="Remove photo"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary" size="sm" disabled={saving || uploadingPhoto}>
              {saving ? "Sending…" : "Submit ticket"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title={detail ? `${detail.ticketRef}` : "Ticket"}
        size="5xl"
        actions={null}
      >
        {detailLoading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : detail ? (
          <div className="flex max-h-[70vh] flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 gap-y-2">
                <p className="min-w-0 text-sm font-medium text-title">{detail.subject}</p>
                <SupportStatusTag status={detail.status} />
              </div>
              <p className="mt-1 text-xs text-secondary">
                {CATEGORIES.find((c) => c.value === detail.category)?.label || detail.category}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-secondary">Your message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">{detail.description}</p>
              <p className="mt-2 text-xs text-secondary">{fmtDate(detail.createdAt)}</p>
              {detail.attachments?.length ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-secondary">Photos you attached</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.attachments.map((src) => (
                      <a
                        key={src}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-md border border-border"
                      >
                        <img src={src} alt="" className="h-24 w-24 object-cover hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {detail.replies?.length ? (
                detail.replies.map((r) => (
                  <div
                    key={r.id || `${r.createdAt}-${r.authorEmail}`}
                    className={`rounded-lg border p-3 text-sm ${
                      r.from === "admin" ? "border-primary/30 bg-primary/5" : "border-border bg-bg"
                    }`}
                  >
                    <p className="text-xs font-medium text-secondary">
                      {r.from === "admin" ? "Support team" : "You"} · {r.authorEmail}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-text">{r.body}</p>
                    <p className="mt-1 text-xs text-secondary">{fmtDate(r.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary">No replies yet.</p>
              )}
            </div>
            {detail.status !== "closed" ? (
              <div className="border-t border-border pt-3">
                <Textarea
                  label="Your reply"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add more detail or answer a question from support…"
                  rows={3}
                />
                <Button type="button" className="mt-2" variant="primary" size="sm" disabled={saving} onClick={sendReply}>
                  {saving ? "Sending…" : "Send reply"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-secondary">This ticket is closed.</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
