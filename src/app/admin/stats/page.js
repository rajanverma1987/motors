"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiExternalLink, FiMail, FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";

const SORT_OPTIONS = [
  { value: "visitsOverall", label: "Overall visits (high → low)" },
  { value: "visitsThisMonth", label: "This month visits (high → low)" },
];

export default function AdminListingStatsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [monthLabel, setMonthLabel] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("visitsOverall");
  const [sendingEmailId, setSendingEmailId] = useState(null);

  const sendStatsEmail = useCallback(
    async (row) => {
      if (!row?.id || sendingEmailId) return;
      setSendingEmailId(row.id);
      try {
        const res = await fetch(`/api/admin/listing-stats/${row.id}/email`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to send email");
        toast.success(`Stats email sent to ${data.email || row.companyName}.`);
      } catch (e) {
        toast.error(e.message || "Failed to send email");
      } finally {
        setSendingEmailId(null);
      }
    },
    [toast, sendingEmailId]
  );

  const loadStats = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      sort,
    });
    if (search.trim()) params.set("search", search.trim());

    fetch(`/api/admin/listing-stats?${params.toString()}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data?.items) ? data.items : []);
        setTotalCount(Number(data?.totalCount) || 0);
        setMonthLabel(data?.monthLabel || "");
      })
      .catch(() => {
        setItems([]);
        setTotalCount(0);
        setMonthLabel("");
      })
      .finally(() => setLoading(false));
  }, [page, pageSize, search, sort]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const monthHeading = monthLabel
    ? new Date(`${monthLabel}-01T12:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : "This month";

  const columns = [
    {
      key: "emailAction",
      label: "",
      render: (_, row) => {
        const busy = sendingEmailId === row.id;
        return (
          <button
            type="button"
            onClick={() => sendStatsEmail(row)}
            disabled={busy || !!sendingEmailId}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Send stats email"
            title="Send listing stats & subscription email"
          >
            <FiMail className={`h-4 w-4 shrink-0 ${busy ? "animate-pulse" : ""}`} aria-hidden />
          </button>
        );
      },
    },
    {
      key: "companyName",
      label: "Shop name",
      render: (_value, row) => (
        <span className="font-medium text-title">{row.companyName || "Repair center"}</span>
      ),
    },
    {
      key: "listingPath",
      label: "Listing page",
      render: (_value, row) =>
        row.listingPath ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm text-secondary">{row.listingPath}</span>
            <Link
              href={row.listingPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
              title="Open listing page"
              aria-label={`Open ${row.companyName} listing page`}
            >
              <FiExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          </div>
        ) : (
          <span className="text-sm text-secondary">—</span>
        ),
    },
    {
      key: "listingDate",
      label: "Listing date",
      render: (val) => (val ? new Date(val).toLocaleDateString() : "—"),
    },
    {
      key: "visitsThisMonth",
      label: `${monthHeading} visits`,
      type: "number",
      align: "right",
    },
    {
      key: "visitsOverall",
      label: "Overall visits",
      type: "number",
      align: "right",
    },
    {
      key: "quoteRequestCount",
      label: "Request quote count",
      type: "number",
      align: "right",
    },
  ];

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-title sm:text-2xl">Listing stats</h1>
            <p className="mt-1 text-sm text-secondary">
              Approved shops with at least one listing page visit. Quote request counts are shown for context.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <FiRefreshCw className={`h-4 w-4 shrink-0 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            className="flex w-full max-w-[280px] flex-col gap-2 sm:max-w-[20rem] sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <Input
              type="search"
              placeholder="Search shop name or URL…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="min-w-0 w-full"
              aria-label="Search listing stats"
            />
            <Button type="submit" variant="primary" size="sm" className="shrink-0 sm:w-auto">
              Search
            </Button>
          </form>
          <div className="w-full sm:w-56">
            <Select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              options={SORT_OPTIONS}
              aria-label="Sort listing stats"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={items}
          loading={loading}
          rowKey="id"
          responsive
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
          emptyMessage="No listings with visits yet."
        />
      </div>
    </div>
  );
}
