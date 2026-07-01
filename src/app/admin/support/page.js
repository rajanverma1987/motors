"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

const CATEGORIES = [
  { value: "bug", label: "Bug" },
  { value: "question", label: "Question" },
  { value: "billing", label: "Billing" },
  { value: "feature_request", label: "Feature" },
  { value: "other", label: "Other" },
];

const STATUS_FILTER = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_customer", label: "Awaiting shop" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_SET = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting_customer", label: "Awaiting shop reply" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

export default function AdminSupportPage() {
  const toast = useToast();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [statusDraft, setStatusDraft] = useState("open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const { tableSort, handleTableSort } = useAdminTableSort("updatedAt", "desc");

  const onTableSort = useCallback(
    (key, direction) => {
      setPage(1);
      handleTableSort(key, direction);
    },
    [handleTableSort]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      appendAdminSortParams(params, tableSort);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/support/tickets?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTickets(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (e) {
      toast.error(e.message || "Could not load tickets");
      setTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, statusFilter, page, pageSize, tableSort]);

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
      const res = await fetch(`/api/admin/support/tickets/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data);
      setStatusDraft(data.status || "open");
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

  async function saveStatus() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: statusDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.ticket);
      toast.success("Status updated.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function sendAdminReply() {
    if (!selectedId || !replyText.trim()) {
      toast.error("Enter a message.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/support/tickets/${selectedId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.ticket);
      setStatusDraft(data.ticket?.status || statusDraft);
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
      { key: "ticketRef", label: "Ticket", sortable: true, clickable: true },
      { key: "shopName", label: "Shop", sortable: true, clickable: true, render: (v, row) => v || row.createdByEmail || "—" },
      { key: "createdByEmail", label: "Email", sortable: true, clickable: true },
      { key: "subject", label: "Subject", sortable: true, clickable: true },
      {
        key: "category",
        label: "Category",
        sortable: true,
        clickable: true,
        render: (v) => CATEGORIES.find((c) => c.value === v)?.label || v,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        clickable: true,
        render: (v) => STATUS_SET.find((s) => s.value === v)?.label || v,
      },
      {
        key: "updatedAt",
        label: "Updated",
        sortable: true,
        clickable: true,
        render: (v) => fmtDate(v),
      },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="flex w-full min-w-0 flex-1 flex-col min-h-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-title">Support tickets</h1>
            <p className="mt-1 text-sm text-secondary">CRM customer submissions — reply and update status.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <div className="w-48">
              <Select
                label="Filter"
                options={STATUS_FILTER}
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value ?? "all");
                }}
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <Table
            columns={columns}
            data={tickets}
            rowKey="id"
            loading={loading}
            fillHeight
            paginateClientSide={false}
            sortState={tableSort}
            onSort={onTableSort}
            emptyMessage="No tickets match this filter."
            onCellClick={(row) => openDetail(row)}
            pagination={{ page, pageSize, totalCount }}
            onPageChange={(nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            }}
          />
        </div>
      </div>

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title={detail ? `${detail.ticketRef} — ${detail.subject}` : "Ticket"}
        size="5xl"
        actions={null}
      >
        {detailLoading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : detail ? (
          <div className="flex max-h-[75vh] flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3 border-b border-border pb-3">
              <div className="min-w-[200px] flex-1">
                <Select
                  label="Status"
                  options={STATUS_SET}
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value ?? "open")}
                />
              </div>
              <Button type="button" variant="primary" size="sm" disabled={saving || statusDraft === detail.status} onClick={saveStatus}>
                Apply status
              </Button>
            </div>
            <div>
              <p className="text-xs text-secondary">
                {detail.shopName ? `${detail.shopName} · ` : ""}
                {detail.contactName ? `${detail.contactName} · ` : ""}
                {detail.createdByEmail}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-medium text-secondary">Original message</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">{detail.description}</p>
              <p className="mt-2 text-xs text-secondary">{fmtDate(detail.createdAt)}</p>
              {detail.attachments?.length ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-secondary">Photos ({detail.attachments.length})</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.attachments.map((src) => (
                      <a
                        key={src}
                        href={src}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-md border border-border bg-bg"
                      >
                        <img src={src} alt="" className="h-24 w-24 object-cover hover:opacity-90" />
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-h-0 max-h-[40vh] flex-1 space-y-3 overflow-y-auto">
              {detail.replies?.length ? (
                detail.replies.map((r) => (
                  <div
                    key={r.id || `${r.createdAt}-${r.authorEmail}`}
                    className={`rounded-lg border p-3 text-sm ${
                      r.from === "admin" ? "border-border bg-bg" : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <p className="text-xs font-medium text-secondary">
                      {r.from === "admin" ? `Admin (${r.authorEmail})` : `Shop (${r.authorEmail})`}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-text">{r.body}</p>
                    <p className="mt-1 text-xs text-secondary">{fmtDate(r.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-secondary">No thread replies yet.</p>
              )}
            </div>
            <div className="border-t border-border pt-3">
              <Textarea
                label="Admin reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Visible to the shop in their Support page…"
                rows={4}
              />
              <Button type="button" className="mt-2" variant="primary" size="sm" disabled={saving} onClick={sendAdminReply}>
                {saving ? "Sending…" : "Send reply"}
              </Button>
              <p className="mt-2 text-xs text-secondary">
                Sending a reply sets status to &quot;Awaiting shop reply&quot; when the ticket was open or in progress.
              </p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
