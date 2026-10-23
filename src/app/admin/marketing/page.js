"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiRotateCcw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import SimpleRichTextEditor from "@/components/admin/simple-rich-text-editor";
import { LISTING_MARKETING_TEMPLATE_META } from "@/lib/listing-marketing-constants";

const TEMPLATE_KEYS = ["initial", "followup1", "followup2", "followup3", "restart"];

function deliveryBadgeVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s === "opened" || s === "clicked" || s === "delivered") return "success";
  if (s === "bounced" || s === "complained" || s === "failed" || s === "suppressed") return "danger";
  if (s === "delayed" || s === "sent") return "warning";
  return "default";
}

function campaignBadgeVariant(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("unsubscribed")) return "danger";
  if (s.includes("completed")) return "success";
  if (s.includes("restart")) return "warning";
  if (s.includes("cycle")) return "primary";
  return "default";
}

function formatWhen(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
}

function HistoryModal({ listingId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!open || !listingId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/marketing/listings/${listingId}/history`, {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load history");
        if (!cancelled) setData(json);
      } catch (err) {
        toast.error(err.message || "Failed to load history");
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, listingId, toast]);

  return (
    <Modal open={open} onClose={onClose} title="Email history" size="3xl" showClose>
      {loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : !data ? (
        <p className="text-sm text-secondary">No history.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-semibold text-title">{data.listing?.companyName}</p>
            <p className="text-sm text-secondary">{data.listing?.email}</p>
          </div>
          {(data.emails || []).length === 0 ? (
            <p className="text-sm text-secondary">No emails sent yet.</p>
          ) : (
            <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
              {data.emails.map((email) => (
                <li key={email.id} className="rounded-md border border-border bg-bg p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                      {email.templateKey}
                    </Badge>
                    <Badge
                      variant={email.status === "failed" ? "danger" : "success"}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {email.status}
                    </Badge>
                    <span className="text-xs text-secondary">Cycle {email.cycleId}</span>
                    <span className="text-xs text-secondary">{formatWhen(email.sentAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-title">{email.subject}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ["Delivered", email.deliveredAt],
                      ["Opened", email.openedAt],
                      ["Clicked", email.clickedAt],
                      ["Bounced", email.bouncedAt],
                      ["Complained", email.complainedAt],
                      ["Failed", email.failedAt],
                      ["Delayed", email.delayedAt],
                      ["Suppressed", email.suppressedAt],
                    ]
                      .filter(([, at]) => at)
                      .map(([label, at]) => (
                        <Badge
                          key={label}
                          variant={
                            label === "Bounced" || label === "Complained" || label === "Failed"
                              ? "danger"
                              : "success"
                          }
                          className="rounded-full px-2.5 py-0.5 text-xs"
                        >
                          {label}: {formatWhen(at)}
                        </Badge>
                      ))}
                  </div>
                  {email.clickCount > 0 ? (
                    <p className="mt-1 text-xs text-secondary">Clicks: {email.clickCount}</p>
                  ) : null}
                  {email.bounceMessage ? (
                    <p className="mt-1 text-xs text-danger">{email.bounceMessage}</p>
                  ) : null}
                  {email.error ? <p className="mt-1 text-xs text-danger">{email.error}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function AdminMarketingPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [historyId, setHistoryId] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [activeTemplateKey, setActiveTemplateKey] = useState("initial");
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [testEmail, setTestEmail] = useState("contact@iqmotorbase.com");
  const [sendingTest, setSendingTest] = useState(false);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/marketing/listings?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load listings");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setSummary(data.summary || null);
    } catch (err) {
      toast.error(err.message || "Failed to load listings");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/marketing/templates", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch (err) {
      toast.error(err.message || "Failed to load templates");
    }
  }, [toast]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const activeTemplate = useMemo(
    () => templates.find((t) => t.key === activeTemplateKey) || null,
    [templates, activeTemplateKey]
  );

  const patchTemplate = (key, patch) => {
    setTemplates((prev) =>
      prev.map((t) => (t.key === key ? { ...t, ...patch } : t))
    );
  };

  const saveTemplates = async () => {
    setSavingTemplates(true);
    try {
      const res = await fetch("/api/admin/marketing/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ templates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save templates");
      setTemplates(Array.isArray(data.templates) ? data.templates : templates);
      toast.success("Templates saved.");
    } catch (err) {
      toast.error(err.message || "Failed to save templates");
    } finally {
      setSavingTemplates(false);
    }
  };

  const sendTestEmail = async () => {
    const to = String(testEmail || "").trim();
    if (!to || !to.includes("@")) {
      toast.warning("Enter a valid test email address.");
      return;
    }
    if (!activeTemplate) {
      toast.warning("Select a template first.");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/marketing/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          to,
          templateKey: activeTemplate.key,
          subject: activeTemplate.subject,
          bodyHtml: activeTemplate.bodyHtml,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test send failed");
      toast.success(`Test email sent to ${data.to || to}.`);
    } catch (err) {
      toast.error(err.message || "Test send failed");
    } finally {
      setSendingTest(false);
    }
  };

  const runBatch = async () => {
    const remaining = summary?.remainingToday ?? 0;
    const ok = await confirm({
      title: "Run marketing batch?",
      message: `Send up to ${remaining} emails (daily limit ${summary?.dailyLimit || 100}, UTC). Follow-ups due after ${summary?.followUpDays || 3} days are prioritized, then new initials, then restarts.`,
      confirmLabel: "Send batch",
      variant: "primary",
    });
    if (!ok) return;
    setSending(true);
    try {
      const res = await fetch("/api/admin/marketing/send-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch failed");
      toast.success(
        data.message ||
          `Sent ${data.sent || 0} email(s). Remaining today: ${data.remainingToday ?? "-"}.`
      );
      if (Array.isArray(data.errors) && data.errors.length) {
        toast.warning(`${data.errors.length} send error(s). Check history for details.`);
      }
      await loadListings();
    } catch (err) {
      toast.error(err.message || "Batch failed");
    } finally {
      setSending(false);
    }
  };

  const restartSelected = async (ids) => {
    const list = (ids || []).filter(Boolean);
    if (!list.length) {
      toast.warning("Select at least one listing.");
      return;
    }
    const first = await confirm({
      title: "Restart email cycle?",
      message: `Restart campaign for ${list.length} listing(s). The next batch will use the Restart template, then up to 3 follow-ups.`,
      confirmLabel: "Continue",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Confirm restart",
      message: "This clears the current cycle counters for the selected listings. Continue?",
      confirmLabel: "Restart",
      variant: "danger",
    });
    if (!second) return;
    setRestarting(true);
    try {
      const res = await fetch("/api/admin/marketing/listings/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ listingIds: list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restart failed");
      toast.success(`Restarted ${data.restarted || 0} listing(s).`);
      setSelectedIds([]);
      await loadListings();
    } catch (err) {
      toast.error(err.message || "Restart failed");
    } finally {
      setRestarting(false);
    }
  };

  const columns = [
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className="rounded p-1.5 text-primary hover:bg-primary/10"
            title="History"
            aria-label="View email history"
            onClick={() => setHistoryId(row.id)}
          >
            <FiEye className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="rounded p-1.5 text-primary hover:bg-primary/10"
            title="Restart cycle"
            aria-label="Restart email cycle"
            disabled={restarting}
            onClick={() => void restartSelected([row.id])}
          >
            <FiRotateCcw className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
    {
      key: "companyName",
      label: "Company",
      sortable: true,
      render: (v) => <span className="font-medium text-title">{v || "-"}</span>,
    },
    { key: "email", label: "Email", sortable: true },
    {
      key: "primaryContactPerson",
      label: "Contact",
      sortable: true,
      render: (v) => v || "-",
    },
    {
      key: "location",
      label: "Location",
      sortable: false,
      render: (_, row) =>
        [row.city, row.state].filter(Boolean).join(", ") || "-",
    },
    {
      key: "campaignStatus",
      label: "Campaign",
      sortable: true,
      render: (v) => (
        <Badge
          variant={campaignBadgeVariant(v)}
          className="rounded-full px-2.5 py-0.5 text-xs"
        >
          {v}
        </Badge>
      ),
    },
    {
      key: "deliveryStatus",
      label: "Last delivery",
      sortable: true,
      render: (v) => (
        <Badge
          variant={deliveryBadgeVariant(v)}
          className="rounded-full px-2.5 py-0.5 text-xs"
        >
          {v}
        </Badge>
      ),
    },
    {
      key: "lastEmailSentAt",
      label: "Last emailed",
      sortable: true,
      render: (v) => <span className="text-xs text-secondary">{formatWhen(v)}</span>,
    },
  ];

  return (
    <div className="w-full min-w-0 space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-title">Listing marketing</h1>
          <p className="mt-1 text-sm text-secondary">
            Email approved directory listings via Resend. Auto batch up to 100/day (UTC), follow-up after 3
            days, max 3 follow-ups. Every email includes an unsubscribe link.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setTemplatesOpen(true)}>
            Email templates
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={restarting || selectedIds.length === 0}
            onClick={() => void restartSelected(selectedIds)}
          >
            Restart selected
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={sending} onClick={() => void runBatch()}>
            {sending ? "Sending…" : `Run batch (${summary?.remainingToday ?? "…"} left today)`}
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Sent today (UTC)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-title">
              {summary.sentToday}/{summary.dailyLimit}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Delivered (30d)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-title">
              {summary.last30Days?.delivered ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Opened (30d)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-title">
              {summary.last30Days?.opened ?? 0}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Clicked (30d)</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-title">
              {summary.last30Days?.clicked ?? 0}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[14rem] flex-1">
          <Input
            label="Search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Company, email, contact, city…"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadListings()} disabled={loading}>
          Refresh
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage="No approved listings with email."
        rowKey="id"
        selectable
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <Modal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title="Email templates"
        size="3xl"
        showClose
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingTemplates}
            onClick={() => void saveTemplates()}
          >
            {savingTemplates ? "Saving…" : "Save templates"}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            Placeholders: {"{{companyName}}"}, {"{{name}}"}, {"{{email}}"}, {"{{unsubscribe_url}}"}.
            Unsubscribe is appended automatically if missing.
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={activeTemplateKey === key ? "primary" : "outline"}
                onClick={() => setActiveTemplateKey(key)}
              >
                {LISTING_MARKETING_TEMPLATE_META[key]?.label || key}
              </Button>
            ))}
          </div>
          {activeTemplate ? (
            <div className="space-y-3">
              <Input
                label="Subject"
                value={activeTemplate.subject || ""}
                onChange={(e) => patchTemplate(activeTemplate.key, { subject: e.target.value })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-title">Body</label>
                <SimpleRichTextEditor
                  value={activeTemplate.bodyHtml || ""}
                  onChange={(html) => patchTemplate(activeTemplate.key, { bodyHtml: html })}
                />
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
                <div className="min-w-[16rem] flex-1">
                  <Input
                    label="Send test to"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="contact@iqmotorbase.com"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sendingTest}
                  onClick={() => void sendTestEmail()}
                >
                  {sendingTest ? "Sending test…" : "Send test email"}
                </Button>
              </div>
              <p className="text-xs text-secondary">
                Sends the currently selected template (including unsaved edits). Subject is prefixed with
                [TEST]. Does not count toward the daily batch limit.
              </p>
            </div>
          ) : (
            <p className="text-sm text-secondary">Loading templates…</p>
          )}
        </div>
      </Modal>

      <HistoryModal
        listingId={historyId}
        open={Boolean(historyId)}
        onClose={() => setHistoryId("")}
      />
    </div>
  );
}
