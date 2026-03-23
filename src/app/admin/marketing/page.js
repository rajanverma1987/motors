"use client";

import { useState, useEffect, useCallback } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "contacted", label: "Contacted" },
  { value: "replied", label: "Replied" },
  { value: "listed", label: "Listed" },
  { value: "do_not_contact", label: "Do not contact" },
  { value: "unsubscribed", label: "Unsubscribed" },
];

const BATCH_SIZES = [5, 10, 15, 20, 25, 30];

function parsePastedEmails(text) {
  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const contacts = [];
  for (const line of lines) {
    const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    const withAt = parts.find((p) => p.includes("@"));
    if (withAt) {
      const email = withAt;
      const rest = parts.filter((p) => p !== email);
      contacts.push({
        email,
        name: rest[0] || "",
        companyName: rest[1] || "",
      });
    } else if (line.includes("@")) {
      contacts.push({ email: line, name: "", companyName: "" });
    }
  }
  return contacts;
}

function EditContactModal({ contact, open, onClose, onSaved }) {
  const [status, setStatus] = useState(contact?.status || "pending");
  const [notes, setNotes] = useState(contact?.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setStatus(contact?.status || "pending");
    setNotes(contact?.notes || "");
  }, [contact]);

  const handleSave = async () => {
    if (!contact?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/marketing/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      onSaved?.(data.contact);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!contact) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Update contact"
      size="md"
      actions={
        <>
          <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-secondary">{contact.email}</p>
        <Select
          label="Status"
          options={STATUS_OPTIONS.filter((o) => o.value !== "all")}
          value={status}
          onChange={(e) => setStatus(e.target.value ?? "")}
          searchable={false}
        />
        <Textarea
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Replied, listed on 3/1"
        />
      </div>
    </Modal>
  );
}

export default function AdminMarketingPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pasteText, setPasteText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editContact, setEditContact] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [templates, setTemplates] = useState({ initial: {}, followup: {} });
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSaving, setTemplatesSaving] = useState(false);
  const [initialSubject, setInitialSubject] = useState("");
  const [initialBody, setInitialBody] = useState("");
  const [followupSubject, setFollowupSubject] = useState("");
  const [followupBody, setFollowupBody] = useState("");
  const [batchSize, setBatchSize] = useState(10);
  const [sending, setSending] = useState(false);
  const [lastSendResult, setLastSendResult] = useState(null);

  const fetchContacts = useCallback(() => {
    const url = statusFilter === "all"
      ? "/api/admin/marketing/contacts"
      : `/api/admin/marketing/contacts?status=${statusFilter}`;
    return fetch(url, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    fetch("/api/admin/marketing/templates", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data);
        setInitialSubject(data.initial?.subject ?? "");
        setInitialBody(data.initial?.body ?? "");
        setFollowupSubject(data.followup?.subject ?? "");
        setFollowupBody(data.followup?.body ?? "");
      })
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleSaveTemplates = async () => {
    setTemplatesSaving(true);
    try {
      const res = await fetch("/api/admin/marketing/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          initial: { subject: initialSubject, body: initialBody },
          followup: { subject: followupSubject, body: followupBody },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setTemplates(data);
      toast.success("Templates saved.");
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setTemplatesSaving(false);
    }
  };

  const handleSendBatch = async () => {
    setSending(true);
    setLastSendResult(null);
    try {
      const res = await fetch("/api/admin/marketing/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ batchSize }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setLastSendResult(data);
      toast.success(`Sent ${data.sent} email(s).`);
      fetchContacts();
    } catch (err) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [addContactsOpen, setAddContactsOpen] = useState(false);
  const [sendBatchOpen, setSendBatchOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const openEdit = (c) => {
    setEditContact(c);
    setEditModalOpen(true);
  };

  const handleEditSaved = (updated) => {
    setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)));
  };

  const columns = [
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={async () => {
              const confirmed = await confirm({
                title: "Remove contact",
                message: `Remove ${row.email} from the list?`,
                confirmLabel: "Remove",
                cancelLabel: "Cancel",
                variant: "danger",
              });
              if (!confirmed) return;
              try {
                const res = await fetch(`/api/admin/marketing/contacts/${row.id}`, { method: "DELETE", credentials: "include" });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Delete failed");
                toast.success("Contact removed.");
                fetchContacts();
              } catch (err) {
                toast.error(err.message || "Delete failed");
              }
            }}
            className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label="Delete"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
    { key: "email", label: "Email" },
    { key: "name", label: "Name", render: (v) => v || "—" },
    { key: "companyName", label: "Company", render: (v) => v || "—" },
    {
      key: "status",
      label: "Status",
      render: (v) => (
        <Badge
          variant={
            v === "listed" ? "success" : v === "do_not_contact" || v === "unsubscribed" ? "danger" : v === "replied" ? "default" : "warning"
          }
        >
          {v}
        </Badge>
      ),
    },
    {
      key: "firstEmailSentAt",
      label: "First sent",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    {
      key: "lastEmailSentAt",
      label: "Last sent",
      render: (v) => (v ? new Date(v).toLocaleDateString() : "—"),
    },
    { key: "followUpCount", label: "Follow-ups", render: (v) => v ?? 0 },
    { key: "notes", label: "Notes", render: (v) => (v ? String(v).slice(0, 30) + (v.length > 30 ? "…" : "") : "—") },
  ];

  const tableData = contacts
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      const email = (c.email || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      const company = (c.companyName || "").toLowerCase();
      const notes = (c.notes || "").toLowerCase();
      return email.includes(q) || name.includes(q) || company.includes(q) || notes.includes(q);
    })
    .map((c) => ({ ...c }));

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Marketing emails</h1>
          <p className="text-sm text-secondary">
            Follow-ups go out 5 days after last email. Mark as &quot;Listed&quot; or &quot;Unsubscribed&quot; to stop emails.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAddContactsOpen(true)}>
            Add contacts
          </Button>
          <Button variant="outline" onClick={() => setSendBatchOpen(true)}>
            Send batch
          </Button>
          <Button variant="outline" onClick={() => setTemplatesOpen(true)}>
            Templates
          </Button>
        </div>
      </div>

      {/* Contacts table only on main page */}
      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center gap-4">
          <Input
            type="search"
            placeholder="Search email, name, company, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Select
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value ?? "all")}
            searchable={false}
            className="w-40"
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Table
            columns={columns}
            data={tableData}
            rowKey="id"
            loading={loading}
            emptyMessage="No contacts. Click Add contacts to paste emails."
            responsive
          />
        </div>
      </div>

      {/* Add contacts popup */}
      <Modal
        open={addContactsOpen}
        onClose={() => setAddContactsOpen(false)}
        title="Add contacts"
        size="md"
        actions={
          <>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={async () => {
                const list = parsePastedEmails(pasteText);
                if (list.length === 0) {
                  toast.warning("Paste one email per line.");
                  return;
                }
                setUploading(true);
                try {
                  const res = await fetch("/api/admin/marketing/contacts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ contacts: list }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Upload failed");
                  toast.success(`Added ${data.added} new contact(s). ${data.total - data.added} already existed.`);
                  setPasteText("");
                  setAddContactsOpen(false);
                  fetchContacts();
                } catch (err) {
                  toast.error(err.message || "Upload failed");
                } finally {
                  setUploading(false);
                }
              }}
              disabled={uploading || !pasteText.trim()}
            >
              {uploading ? "Adding…" : "Add"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-secondary">
          One email per line. Names and company are optional (emails only is fine).
        </p>
        <Textarea
          placeholder="shop1@example.com&#10;shop2@example.com&#10;contact@motorshop.com"
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      </Modal>

      {/* Send batch popup */}
      <Modal
        open={sendBatchOpen}
        onClose={() => setSendBatchOpen(false)}
        title="Send batch"
        size="md"
        actions={
          <Button type="button" variant="primary" size="sm" onClick={handleSendBatch} disabled={sending}>
            {sending ? "Sending…" : "Send batch"}
          </Button>
        }
      >
        <p className="mb-3 text-sm text-secondary">
          Sends new emails to pending contacts, or follow-ups to contacted ones (5+ days since last email). Listed, Do not contact, and Unsubscribed are skipped.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            label="Batch size"
            options={BATCH_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
            value={String(batchSize)}
            onChange={(e) => setBatchSize(Number(e.target.value) || 10)}
            searchable={false}
            className="w-24"
          />
        </div>
        {lastSendResult && (
          <p className="mt-4 text-sm text-secondary">
            Last run: sent {lastSendResult.sent} of {lastSendResult.total}.
            {lastSendResult.errors?.length ? ` ${lastSendResult.errors.length} failed.` : ""}
          </p>
        )}
      </Modal>

      {/* Templates popup */}
      <Modal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Email templates"
        size="4xl"
        actions={
          !templatesLoading && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={async () => {
                await handleSaveTemplates();
                setTemplatesOpen(false);
              }}
              disabled={templatesSaving}
            >
              {templatesSaving ? "Saving…" : "Save"}
            </Button>
          )
        }
      >
        <p className="mb-3 text-sm text-secondary">
          Use {"{{unsubscribe_url}}"} in body for the unsubscribe link. Preview updates as you type.
        </p>
        {!templatesLoading && (
          <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-title mb-3">Initial email</h3>
                <Input
                  label="Subject"
                  value={initialSubject}
                  onChange={(e) => setInitialSubject(e.target.value)}
                  className="mt-2"
                />
                <Textarea
                  label="Body (HTML)"
                  value={initialBody}
                  onChange={(e) => setInitialBody(e.target.value)}
                  rows={6}
                  className="mt-2 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-secondary font-medium">Preview</p>
                <div
                  className="mt-1 rounded-lg border border-border bg-card p-4 max-h-64 overflow-auto text-left"
                  dangerouslySetInnerHTML={{
                    __html: (initialBody || "")
                      .replace(/\{\{unsubscribe_url\}\}/g, "#")
                      .replace(/\{\{name\}\}/g, "")
                      .replace(/\{\{email\}\}/g, "")
                      .replace(/\{\{companyName\}\}/g, "")
                      .replace(/\{\{#name\}\}[\s\S]*?\{\{\/name\}\}/g, ""),
                  }}
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-title mb-3">Follow-up email (after 5 days)</h3>
                <Input
                  label="Subject"
                  value={followupSubject}
                  onChange={(e) => setFollowupSubject(e.target.value)}
                  className="mt-2"
                />
                <Textarea
                  label="Body (HTML)"
                  value={followupBody}
                  onChange={(e) => setFollowupBody(e.target.value)}
                  rows={6}
                  className="mt-2 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-secondary font-medium">Preview</p>
                <div
                  className="mt-1 rounded-lg border border-border bg-card p-4 max-h-64 overflow-auto text-left"
                  dangerouslySetInnerHTML={{
                    __html: (followupBody || "")
                      .replace(/\{\{unsubscribe_url\}\}/g, "#")
                      .replace(/\{\{name\}\}/g, "")
                      .replace(/\{\{email\}\}/g, "")
                      .replace(/\{\{companyName\}\}/g, "")
                      .replace(/\{\{#name\}\}[\s\S]*?\{\{\/name\}\}/g, ""),
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <EditContactModal
        contact={editContact}
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditContact(null); }}
        onSaved={handleEditSaved}
      />
    </div>
  );
}
