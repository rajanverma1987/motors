"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDownload, FiEdit2, FiMail } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { TALENT_AVAILABILITY_LABELS, TALENT_STATUS } from "@/lib/talent-constants";

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function statusVariant(status) {
  if (status === "active") return "success";
  if (status === "paused") return "warning";
  if (status === "banned") return "danger";
  return "default";
}

function availabilityVariant(value) {
  if (value === "available_now") return "success";
  if (value === "open") return "primary";
  return "default";
}

export default function AdminTalentPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailHtml, setEmailHtml] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/talent?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      toast.error(err.message || "Failed to load");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const downloadCsv = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "City",
      "State",
      "Availability",
      "Score",
      "Status",
      "Alerts",
      "Slug",
      "Created",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.fullName),
          csvEscape(r.email),
          csvEscape(r.phone),
          csvEscape(r.city),
          csvEscape(r.state),
          csvEscape(r.availability),
          csvEscape(r.profileScore),
          csvEscape(r.status),
          csvEscape(r.jobAlertsEnabled ? "yes" : "no"),
          csvEscape(r.slug),
          csvEscape(r.createdAt ? new Date(r.createdAt).toISOString() : ""),
        ].join(",")
      );
    }
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `talent-profiles-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Downloaded ${rows.length} row(s).`);
  };

  const openEdit = (row) => {
    setEditForm({ ...row });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/talent/${editForm.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: editForm.phone,
          headline: editForm.headline,
          bio: editForm.bio,
          city: editForm.city,
          state: editForm.state,
          status: editForm.status,
          availability: editForm.availability,
          jobAlertsEnabled: editForm.jobAlertsEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Profile updated.");
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const banProfile = async () => {
    if (!editForm?.id) return;
    const ok1 = await confirm({
      title: "Ban this profile?",
      message: `${editForm.fullName || editForm.email} will be banned and cannot sign in or appear publicly.`,
      confirmLabel: "Continue",
      variant: "danger",
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "Confirm ban",
      message: "This is hard to reverse. Ban this seeker?",
      confirmLabel: "Ban",
      variant: "danger",
    });
    if (!ok2) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/talent/${editForm.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "banned" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ban failed");
      toast.success("Profile banned.");
      setEditOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Ban failed");
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async (e) => {
    e.preventDefault();
    if (!editForm?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/talent/${editForm.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendEmail: true,
          emailSubject,
          emailHtml: `<p>${emailHtml.replace(/\n/g, "<br/>")}</p>`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      toast.success("Email sent.");
      setEmailOpen(false);
      setEmailSubject("");
      setEmailHtml("");
    } catch (err) {
      toast.error(err.message || "Send failed");
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_, row) => (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              title="Edit"
              onClick={() => openEdit(row)}
            >
              <FiEdit2 className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              title="Email"
              onClick={() => {
                setEditForm(row);
                setEmailOpen(true);
              }}
            >
              <FiMail className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "fullName",
        label: "Name",
        sortable: true,
        render: (v, row) => (
          <div>
            <div className="font-medium text-title">{v || "-"}</div>
            {row.slug ? (
              <a
                href={`/talent/${row.slug}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                /talent/{row.slug}
              </a>
            ) : null}
          </div>
        ),
      },
      { key: "email", label: "Email", sortable: true },
      {
        key: "location",
        label: "Location",
        sortable: false,
        render: (_, row) => [row.city, row.state].filter(Boolean).join(", ") || "-",
      },
      {
        key: "availability",
        label: "Availability",
        sortable: true,
        render: (v) => (
          <Badge variant={availabilityVariant(v)} className="rounded-full px-2.5 py-0.5 text-xs">
            {TALENT_AVAILABILITY_LABELS[v] || v || "-"}
          </Badge>
        ),
      },
      {
        key: "profileScore",
        label: "Score",
        sortable: true,
        render: (v) => <span className="tabular-nums">{v ?? 0}%</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => (
          <Badge variant={statusVariant(v)} className="rounded-full px-2.5 py-0.5 text-xs">
            {v}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (v) => (v ? new Date(v).toLocaleDateString() : "-"),
      },
    ],
    []
  );

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-title">Talent profiles</h1>
          <p className="mt-1 text-sm text-secondary">
            Free job seeker profiles. Public at /talent. Ban, pause, export, or email individuals.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={!rows.length} onClick={downloadCsv}>
          <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
          Download CSV
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-2">
        <div className="min-w-[14rem] flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, city…"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-title">Status</label>
          <select
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-title"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            {TALENT_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <div className="mt-4">
        <Table
          columns={columns}
          data={rows}
          loading={loading}
          emptyMessage="No talent profiles yet."
          rowKey="id"
        />
      </div>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit talent profile"
        size="lg"
        showClose
        actions={
          <>
            <Button type="button" variant="danger" size="sm" disabled={saving} onClick={() => void banProfile()}>
              Ban
            </Button>
            <Button type="submit" form="admin-talent-edit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {editForm ? (
          <Form id="admin-talent-edit" onSubmit={saveEdit} className="space-y-3">
            <Input
              label="Full name"
              value={editForm.fullName || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <Input label="Email" value={editForm.email || ""} disabled />
            <Input
              label="Phone"
              value={editForm.phone || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Headline"
              value={editForm.headline || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, headline: e.target.value }))}
            />
            <Textarea
              label="Bio"
              value={editForm.bio || ""}
              onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="City"
                value={editForm.city || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, city: e.target.value }))}
              />
              <Input
                label="State"
                value={editForm.state || ""}
                onChange={(e) => setEditForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-title">Status</label>
                <select
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  value={editForm.status || "active"}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {TALENT_STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-title">Availability</label>
                <select
                  className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm"
                  value={editForm.availability || "open"}
                  onChange={(e) => setEditForm((f) => ({ ...f, availability: e.target.value }))}
                >
                  {Object.entries(TALENT_AVAILABILITY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-title">
              <input
                type="checkbox"
                checked={editForm.jobAlertsEnabled !== false}
                onChange={(e) => setEditForm((f) => ({ ...f, jobAlertsEnabled: e.target.checked }))}
              />
              Job alerts enabled
            </label>
          </Form>
        ) : null}
      </Modal>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title="Email seeker"
        size="md"
        showClose
        actions={
          <Button type="submit" form="admin-talent-email" variant="primary" size="sm" disabled={saving}>
            {saving ? "Sending…" : "Send"}
          </Button>
        }
      >
        <Form id="admin-talent-email" onSubmit={sendEmail} className="space-y-3">
          <p className="text-sm text-secondary">To: {editForm?.email}</p>
          <Input
            label="Subject"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            required
          />
          <Textarea
            label="Message"
            value={emailHtml}
            onChange={(e) => setEmailHtml(e.target.value)}
            rows={6}
            required
          />
        </Form>
      </Modal>
    </div>
  );
}
