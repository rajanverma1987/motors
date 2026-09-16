"use client";

import { useCallback, useEffect, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";

const STATUS_VARIANT = {
  delivered: "success",
  pending: "warning",
  failed: "danger",
  skipped: "default",
};

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All events" },
  { value: "rfq_sent", label: "RFQ sent" },
  { value: "rfq_updated", label: "RFQ updated" },
  { value: "rfq_cancelled", label: "RFQ cancelled" },
  { value: "lead_viewed", label: "Lead viewed" },
  { value: "converted_to_proposal", label: "Converted to proposal" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "proposal_revised", label: "Proposal revised" },
  { value: "declined_to_quote", label: "Declined to quote" },
  { value: "awarded", label: "Awarded" },
  { value: "not_selected", label: "Not selected" },
  { value: "datasheet_saved", label: "Datasheet saved" },
  { value: "job_status_changed", label: "Job status changed" },
  { value: "job_completed", label: "Job completed" },
  { value: "invoice_issued", label: "Invoice issued" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** §14.11 / §17.8 - delivery log, failures, and manual resend. */
export default function TrackIntegrationLog() {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [statusCounts, setStatusCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [eventType, setEventType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (status) params.set("status", status);
      if (eventType) params.set("eventType", eventType);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/track-integration-events?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setEvents(data.events || []);
      setStatusCounts(data.statusCounts || []);
      setTotalCount(Number(data.totalCount) || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load the integration log");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, eventType, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const resend = async (eventId) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/track-integration-events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventId ? { eventId } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Resend failed");
      const failed = (data.results || []).filter((r) => !r.ok);
      if (failed.length) toast.error(`${failed.length} delivery attempts still failed.`);
      else toast.success("Delivery retried.");
      await load();
    } catch (err) {
      toast.error(err.message || "Resend failed");
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: "resend",
      label: "",
      render: (_value, row) =>
        row.eventType === "rfq_sent" && row.status !== "delivered" ? (
          <button
            type="button"
            onClick={() => resend(row.id)}
            disabled={busy}
            aria-label="Resend"
            title="Resend"
            className="rounded p-1.5 text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        ) : null,
    },
    { key: "eventType", label: "Event" },
    {
      key: "direction",
      label: "Direction",
      render: (value) => (value === "track_to_base" ? "Track to Base" : "Base to Track"),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Badge variant={STATUS_VARIANT[value] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
          {value}
        </Badge>
      ),
    },
    { key: "attempts", label: "Attempts" },
    { key: "lastError", label: "Last error" },
    { key: "rfqRequestId", label: "RFQ" },
    { key: "listingId", label: "Listing" },
    { key: "nextAttemptAt", label: "Next attempt", render: (value) => formatDate(value) },
    { key: "deliveredAt", label: "Delivered", render: (value) => formatDate(value) },
    { key: "createdAt", label: "Created", render: (value) => formatDate(value) },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-auto">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-title">Integration log</h2>
            <p className="mt-1 text-sm text-secondary">
              Every event between IQMotorTrack and IQMotorBase. Replaying an event never creates duplicates,
              so resending a failed delivery is always safe.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {statusCounts.map((row) => (
                <Badge
                  key={row.status}
                  variant={STATUS_VARIANT[row.status] || "default"}
                  className="rounded-full px-2.5 py-0.5 text-xs"
                >
                  {row.status}: {row.count}
                </Badge>
              ))}
            </div>
          </div>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => resend("")}>
            <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
            Retry pending deliveries
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] max-w-sm flex-1">
            <Input
              label="Search"
              name="q"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="RFQ id, listing id, lead id, or error text"
            />
          </div>
          <div className="min-w-[10rem]">
            <Select
              label="Status"
              name="status"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
              options={STATUS_OPTIONS}
            />
          </div>
          <div className="min-w-[12rem]">
            <Select
              label="Event"
              name="eventType"
              value={eventType}
              onChange={(e) => {
                setPage(1);
                setEventType(e.target.value);
              }}
              options={TYPE_OPTIONS}
            />
          </div>
        </div>
      </div>
      <div className="mt-6 min-h-0">
        <Table
          columns={columns}
          data={events}
          rowKey="id"
          loading={loading}
          emptyMessage="No integration events yet."
          responsive
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
        />
      </div>
    </div>
  );
}
