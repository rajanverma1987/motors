"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/toast-provider";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "in-review", label: "In-review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const COLUMNS = [
  {
    key: "view",
    label: "",
    render: (_, row) => (
      <Link
        href={`/admin/listings/${row.id}`}
        className="inline-flex rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
        aria-label="View"
      >
        <FiEye className="h-4 w-4" />
      </Link>
    ),
  },
  { key: "companyName", label: "Company" },
  { key: "email", label: "Email" },
  {
    key: "location",
    label: "Location",
    render: (_, row) => [row.city, row.state].filter(Boolean).join(", ") || "—",
  },
  {
    key: "status",
    label: "Status",
    render: (val) => (
      <Badge
        variant={
          val === "approved" ? "success" : val === "rejected" ? "danger" : "warning"
        }
      >
        {val}
      </Badge>
    ),
  },
  {
    key: "isSeed",
    label: "Source",
    render: (val) => (val ? <Badge variant="default">Seed</Badge> : <span className="text-secondary">—</span>),
  },
  {
    key: "submittedAt",
    label: "Submitted",
    render: (val) => (val ? new Date(val).toLocaleDateString() : "—"),
  },
];

function matchListing(row, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  const company = (row.companyName || "").toLowerCase();
  const email = (row.email || "").toLowerCase();
  const city = (row.city || "").toLowerCase();
  const state = (row.state || "").toLowerCase();
  const status = (row.status || "").toLowerCase();
  return company.includes(s) || email.includes(s) || city.includes(s) || state.includes(s) || status.includes(s);
}

export default function AdminListingsPage() {
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filteredListings = useMemo(() => {
    return searchQuery.trim() ? listings.filter((row) => matchListing(row, searchQuery.trim())) : listings;
  }, [listings, searchQuery]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleSelectionChange = useCallback((ids) => {
    setSelectedRowIds(ids);
  }, []);

  const validListingIds = useMemo(
    () => selectedRowIds.filter((id) => typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id)),
    [selectedRowIds]
  );

  async function handleBulkApprove() {
    if (validListingIds.length === 0) {
      toast.warning(selectedRowIds.length === 0 ? "Select one or more listings." : "No valid listings selected.");
      return;
    }
    setBulkUpdating(true);
    try {
      const res = await fetch("/api/listings/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: validListingIds, status: "approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk approve failed");
      const count = data.updated ?? validListingIds.length;
      setSelectedRowIds([]);
      setTimeout(() => toast.success(`Approved ${count} listing(s).`), 0);
      let url = "/api/listings";
      if (filter) url += `?status=${filter}`;
      const listRes = await fetch(url, { credentials: "include", cache: "no-store" });
      const listData = await listRes.json();
      if (Array.isArray(listData)) setListings(listData);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Bulk approve failed");
    } finally {
      setBulkUpdating(false);
    }
  }

  function openRejectModal() {
    setRejectReason("");
    setRejectModalOpen(true);
  }

  async function handleBulkReject() {
    if (validListingIds.length === 0) {
      toast.warning(selectedRowIds.length === 0 ? "Select one or more listings." : "No valid listings selected.");
      return;
    }
    setBulkUpdating(true);
    try {
      const res = await fetch("/api/listings/bulk-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ids: validListingIds,
          status: "rejected",
          rejectionReason: rejectReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk reject failed");
      const count = data.updated ?? validListingIds.length;
      setRejectModalOpen(false);
      setRejectReason("");
      setSelectedRowIds([]);
      setTimeout(() => toast.success(`Rejected ${count} listing(s). Email sent to contact(s).`), 0);
      let url = "/api/listings";
      if (filter) url += `?status=${filter}`;
      const listRes = await fetch(url, { credentials: "include", cache: "no-store" });
      const listData = await listRes.json();
      if (Array.isArray(listData)) setListings(listData);
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Bulk reject failed");
    } finally {
      setBulkUpdating(false);
    }
  }

  const fetchListings = useCallback(() => {
    let url = "/api/listings";
    if (filter) url += `?status=${filter}`;
    return fetch(url, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setListings(data);
        else setListings([]);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchListings();
  }, [fetchListings]);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Listings</h1>
          <p className="text-sm text-secondary">Review and approve repair center submissions</p>
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={filter}
          onChange={(e) => setFilter(e.target.value ?? "")}
          placeholder="All"
          searchable={false}
          className="min-w-[140px]"
        />
      </div>

      {selectedRowIds.length > 0 && (
        <div className="mt-6 shrink-0 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-sm font-medium text-title">
            {selectedRowIds.length} selected
          </span>
          <Button
            size="sm"
            variant="primary"
            onClick={handleBulkApprove}
            disabled={bulkUpdating}
          >
            {bulkUpdating ? "Updating…" : "Approve selected"}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={openRejectModal}
            disabled={bulkUpdating}
          >
            Reject selected
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedRowIds([])}
            disabled={bulkUpdating}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={COLUMNS}
          data={filteredListings}
          rowKey="id"
          loading={loading}
          emptyMessage="No listings found."
          searchable
          onSearch={handleSearch}
          searchPlaceholder="Search company, email, location, status…"
          responsive
          selectable
          selectedRowIds={selectedRowIds}
          onSelectionChange={handleSelectionChange}
        />
      </div>

      <Modal
        open={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject selected listings"
        size="md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Reject {selectedRowIds.length} listing(s)? Optionally provide a reason to include in the email.
          </p>
          <Textarea
            label="Reason for rejection (optional)"
            placeholder="e.g. Incomplete information, outside service area"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleBulkReject}
              disabled={bulkUpdating}
            >
              {bulkUpdating ? "Rejecting…" : "Reject selected"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
