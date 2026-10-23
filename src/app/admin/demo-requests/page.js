"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import { useAdminTableSort } from "@/hooks/use-admin-table-sort";
import { appendAdminSortParams } from "@/lib/admin-table-sort";

const FORM_TYPES = [
  { value: "demo", label: "Demo request" },
  { value: "pricing_general", label: "Pricing inquiry" },
  { value: "pricing_founder", label: "Founder pricing" },
];

const FORM_TYPE_FILTER = [{ value: "all", label: "All forms" }, ...FORM_TYPES];

const STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "demo_booked", label: "Demo booked" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const STATUS_FILTER = [{ value: "all", label: "All statuses" }, ...STATUSES];

const EMAIL_STATUS_FILTER = [
  { value: "all", label: "All notifications" },
  { value: "sent", label: "Notification sent" },
  { value: "failed", label: "Notification FAILED" },
  { value: "pending", label: "Notification pending" },
];

const STATUS_VARIANT = {
  new: "primary",
  contacted: "warning",
  demo_booked: "primary",
  won: "success",
  lost: "danger",
};

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "—";
  }
}

function labelFor(list, v) {
  return list.find((x) => x.value === v)?.label || v || "—";
}

export default function AdminDemoRequestsPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [formTypeFilter, setFormTypeFilter] = useState("all");
  const [emailStatusFilter, setEmailStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [failedEmailCount, setFailedEmailCount] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusDraft, setStatusDraft] = useState("new");
  const [notesDraft, setNotesDraft] = useState("");

  const { tableSort, handleTableSort } = useAdminTableSort("createdAt", "desc");

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
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      appendAdminSortParams(params, tableSort);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (formTypeFilter !== "all") params.set("formType", formTypeFilter);
      if (emailStatusFilter !== "all") params.set("emailStatus", emailStatusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/demo-requests?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
      setNewCount(Number(data?.newCount) || 0);
      setFailedEmailCount(Number(data?.failedEmailCount) || 0);
    } catch (e) {
      toast.error(e.message || "Could not load demo requests");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, tableSort, statusFilter, formTypeFilter, emailStatusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (row) => {
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/demo-requests/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data);
      setStatusDraft(data.status || "new");
      setNotesDraft(data.adminNotes || "");
    } catch (e) {
      toast.error(e.message || "Could not load request");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  async function save() {
    if (!detail) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/demo-requests/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: statusDraft, adminNotes: notesDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setDetail(data.request);
      toast.success("Saved.");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      { key: "createdAt", label: "Received", sortable: true, clickable: true, render: (v) => fmtDate(v) },
      { key: "name", label: "Name", sortable: true, clickable: true },
      { key: "businessName", label: "Shop", sortable: true, clickable: true, render: (v) => v || "—" },
      { key: "email", label: "Email", sortable: true, clickable: true },
      { key: "phone", label: "Phone", clickable: true, render: (v) => v || "—" },
      {
        key: "formType",
        label: "Form",
        sortable: true,
        clickable: true,
        render: (v) => labelFor(FORM_TYPES, v),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        clickable: true,
        render: (v) => <Badge variant={STATUS_VARIANT[v] || "primary"}>{labelFor(STATUSES, v)}</Badge>,
      },
      {
        key: "notifyEmailStatus",
        label: "Notification",
        sortable: true,
        clickable: true,
        render: (v) =>
          v === "failed" ? (
            <Badge variant="danger">Failed</Badge>
          ) : v === "sent" ? (
            <span className="text-secondary">Sent</span>
          ) : (
            <span className="text-secondary">Pending</span>
          ),
      },
    ],
    []
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="flex w-full min-w-0 flex-1 flex-col min-h-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-title">Demo requests</h1>
            <p className="mt-1 text-sm text-secondary">
              Demo and pricing submissions from the marketing site. {newCount} new.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(searchDraft.trim());
              }}
            >
              <div className="w-56">
                <Input
                  label="Search"
                  placeholder="Name, email, or shop"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
            </form>
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              Refresh
            </Button>
          </div>
        </div>

        {failedEmailCount > 0 ? (
          <div className="mb-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-title">
            <strong>{failedEmailCount}</strong>{" "}
            {failedEmailCount === 1 ? "request" : "requests"} saved but the notification email failed
            — these are only visible here, nobody was emailed. Filter by “Notification FAILED” to work
            them, and check SMTP.
          </div>
        ) : null}

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-44">
            <Select
              label="Status"
              options={STATUS_FILTER}
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value ?? "all");
              }}
            />
          </div>
          <div className="w-48">
            <Select
              label="Form"
              options={FORM_TYPE_FILTER}
              value={formTypeFilter}
              onChange={(e) => {
                setPage(1);
                setFormTypeFilter(e.target.value ?? "all");
              }}
            />
          </div>
          <div className="w-52">
            <Select
              label="Notification"
              options={EMAIL_STATUS_FILTER}
              value={emailStatusFilter}
              onChange={(e) => {
                setPage(1);
                setEmailStatusFilter(e.target.value ?? "all");
              }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <Table
            columns={columns}
            data={rows}
            rowKey="id"
            loading={loading}
            fillHeight
            paginateClientSide={false}
            sortState={tableSort}
            onSort={onTableSort}
            emptyMessage="No demo requests match these filters."
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
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
        title={detail ? `${detail.name} — ${detail.businessName || "no shop name"}` : "Demo request"}
        size="3xl"
        actions={
          detail ? (
            <Button type="button" variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : null
        }
      >
        {detailLoading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : detail ? (
          <div className="space-y-5">
            {detail.notifyEmailStatus === "failed" ? (
              <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-title">
                Notification email failed — nobody was emailed about this request.
                {detail.notifyEmailError ? (
                  <span className="mt-1 block text-xs text-secondary">{detail.notifyEmailError}</span>
                ) : null}
              </div>
            ) : null}

            <section>
              <h3 className="text-sm font-semibold text-title">Contact</h3>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Name" value={detail.name} />
                <Row
                  label="Email"
                  value={
                    <a className="text-primary hover:underline" href={`mailto:${detail.email}`}>
                      {detail.email}
                    </a>
                  }
                />
                <Row label="Phone" value={detail.phone} />
                <Row label="Received" value={fmtDate(detail.createdAt)} />
                <Row label="Form" value={labelFor(FORM_TYPES, detail.formType)} />
                <Row label="Source page" value={detail.sourcePage} />
              </dl>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-title">Business</h3>
              <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Shop" value={detail.businessName} />
                <Row label="Website" value={detail.website} />
                <Row label="City" value={detail.city} />
                <Row label="State" value={detail.state} />
                <Row label="Business type" value={detail.businessType} />
                <Row label="Team size" value={detail.teamSize} />
              </dl>
            </section>

            {detail.preferDate || detail.preferTime || detail.timezone ? (
              <section>
                <h3 className="text-sm font-semibold text-title">Preferred demo time</h3>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <Row label="Date" value={detail.preferDate} />
                  <Row label="Time" value={detail.preferTime} />
                  <Row label="Timezone" value={detail.timezone} />
                </dl>
              </section>
            ) : null}

            {detail.currentTools || detail.mainProblem ? (
              <section>
                <h3 className="text-sm font-semibold text-title">What they said</h3>
                <dl className="mt-2 space-y-2 text-sm">
                  <Row label="Current tools" value={detail.currentTools} />
                  <Row label="Main problem" value={detail.mainProblem} />
                </dl>
              </section>
            ) : null}

            <section className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-title">Follow-up</h3>
              <div className="mt-2 w-56">
                <Select
                  label="Status"
                  options={STATUSES}
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value ?? "new")}
                />
              </div>
              <div className="mt-3">
                <Textarea
                  label="Internal notes"
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Call outcome, next step, who owns it…"
                />
              </div>
            </section>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-secondary">{label}</dt>
      <dd className="mt-0.5 break-words text-title">{value || "—"}</dd>
    </div>
  );
}
