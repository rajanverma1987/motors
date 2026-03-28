"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiDownload, FiEye, FiUserPlus, FiCreditCard, FiTrash2, FiCheckCircle, FiPlus } from "react-icons/fi";
import AdminFeaturedListingCreateModal from "@/components/admin/AdminFeaturedListingCreateModal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "in-review", label: "In-review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function generateTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
  let s = "";
  for (let i = 0; i < 14; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function isListingCrmClient(row) {
  const v = row?.crmUserId;
  return v != null && v !== "" && v !== false;
}

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

function csvEscape(val) {
  const s = val == null ? "" : String(val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Export rows currently shown in the table (respects status filter + search). */
function buildListingsCsv(rows) {
  const headers = [
    "id",
    "companyName",
    "email",
    "phone",
    "city",
    "state",
    "zipCode",
    "country",
    "status",
    "isSeed",
    "urlSlug",
    "crmUserId",
    "submittedAt",
    "reviewedAt",
  ];
  const lines = rows.map((r) =>
    [
      r.id,
      r.companyName,
      r.email,
      r.phone,
      r.city,
      r.state,
      r.zipCode,
      r.country,
      r.status,
      r.isSeed ? "yes" : "no",
      r.urlSlug,
      r.crmUserId != null && r.crmUserId !== "" ? String(r.crmUserId) : "",
      r.submittedAt ? new Date(r.submittedAt).toISOString() : "",
      r.reviewedAt ? new Date(r.reviewedAt).toISOString() : "",
    ].map(csvEscape)
  );
  const body = [headers.map(csvEscape).join(","), ...lines.map((l) => l.join(","))].join("\r\n");
  return `\uFEFF${body}`;
}

export default function AdminListingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardRow, setOnboardRow] = useState(null);
  const [onboardShopName, setOnboardShopName] = useState("");
  const [onboardContact, setOnboardContact] = useState("");
  const [onboardPassword, setOnboardPassword] = useState("");
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);
  const [newListingSearchOpen, setNewListingSearchOpen] = useState(false);
  const [newListingCreateOpen, setNewListingCreateOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchAttempted, setSearchAttempted] = useState(false);

  const goManageSubscription = useCallback(
    (row) => {
      const uid = row?.crmUserId ? String(row.crmUserId) : "";
      if (!uid) return;
      try {
        sessionStorage.setItem("adminOpenSubUserId", uid);
      } catch (_) {}
      router.push("/admin/clients");
    },
    [router]
  );

  const openOnboardModal = useCallback((row) => {
    setOnboardRow(row);
    setOnboardShopName(row?.companyName || "");
    setOnboardContact(row?.primaryContactPerson || "");
    setOnboardPassword("");
    setOnboardModalOpen(true);
  }, []);

  const closeOnboardModal = useCallback(() => {
    setOnboardModalOpen(false);
    setOnboardRow(null);
  }, []);

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

  const handleDeleteListing = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Delete this listing?",
        message: `Permanently remove "${row.companyName || "this listing"}" from the directory? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/listings/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || "Delete failed");
        toast.success("Listing deleted.");
        setSelectedRowIds((ids) => ids.filter((id) => id !== row.id));
        await fetchListings();
      } catch (e) {
        toast.error(e.message || "Could not delete");
      }
    },
    [confirm, toast, fetchListings]
  );

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex shrink-0 items-center gap-0.5">
            <Link
              href={`/admin/listings/${row.id}`}
              className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="View listing"
              title="View"
            >
              <FiEye className="h-4 w-4" />
            </Link>
            <button
              type="button"
              disabled={isListingCrmClient(row)}
              onClick={() => openOnboardModal(row)}
              className="inline-flex rounded-md p-2 text-emerald-700 hover:bg-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-emerald-400"
              aria-label={
                isListingCrmClient(row) ? "Already onboarded to CRM" : "Onboard to CRM"
              }
              title={
                isListingCrmClient(row)
                  ? "Already onboarded to CRM"
                  : "Onboard to CRM"
              }
            >
              <FiUserPlus className="h-4 w-4" />
            </button>
            {isListingCrmClient(row) ? (
              <button
                type="button"
                onClick={() => goManageSubscription(row)}
                className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="CRM client — subscription and access"
                title="CRM client — open subscription & access"
              >
                <FiCreditCard className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleDeleteListing(row)}
              className="inline-flex rounded-md p-2 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Delete listing"
              title="Delete listing"
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "companyName",
        label: "Company",
        render: (val, row) => (
          <div className="flex min-w-0 max-w-[280px] items-center gap-2 sm:max-w-md">
            <span className="truncate font-medium text-title" title={val}>
              {val || "—"}
            </span>
            {isListingCrmClient(row) ? (
              <span
                className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-emerald-500/50 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 dark:border-emerald-400/40 dark:bg-emerald-500/20 dark:text-emerald-100"
                title="Onboarded to CRM"
              >
                <FiCheckCircle className="h-3 w-3" aria-hidden />
                CRM
              </span>
            ) : null}
          </div>
        ),
      },
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
          <Badge variant={val === "approved" ? "success" : val === "rejected" ? "danger" : "warning"}>{val}</Badge>
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
    ],
    [goManageSubscription, openOnboardModal, handleDeleteListing]
  );

  async function handleOnboardSubmit(e) {
    e.preventDefault();
    if (!onboardRow?.id) return;
    if (!onboardPassword || onboardPassword.length < 6) {
      toast.error("Set a password (at least 6 characters) for the CRM login.");
      return;
    }
    setOnboardSubmitting(true);
    try {
      const res = await fetch(`/api/admin/listings/${onboardRow.id}/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password: onboardPassword,
          shopName: onboardShopName.trim(),
          contactName: onboardContact.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "USER_EXISTS" || data.code === "ALREADY_ONBOARDED") {
          toast.warning(data.error || "Account already exists.");
          if (data.userId) {
            try {
              sessionStorage.setItem("adminOpenSubUserId", String(data.userId));
            } catch (_) {}
            closeOnboardModal();
            router.push("/admin/clients");
          }
          return;
        }
        throw new Error(data.error || "Onboard failed");
      }
      toast.success("Client created with Free Ultimate subscription. Opening subscription tools…");
      try {
        sessionStorage.setItem("adminOpenSubUserId", data.user.id);
      } catch (_) {}
      closeOnboardModal();
      await fetchListings();
      router.push("/admin/clients");
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Onboard failed");
    } finally {
      setOnboardSubmitting(false);
    }
  }

  const filteredListings = useMemo(() => {
    return searchQuery.trim() ? listings.filter((row) => matchListing(row, searchQuery.trim())) : listings;
  }, [listings, searchQuery]);

  const handleDownloadCsv = useCallback(() => {
    if (!filteredListings.length) {
      toast.error("No listings to export.");
      return;
    }
    try {
      const csv = buildListingsCsv(filteredListings);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `listings-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded.");
    } catch (e) {
      toast.error(e.message || "Export failed");
    }
  }, [filteredListings, toast]);

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

  useEffect(() => {
    setLoading(true);
    fetchListings();
  }, [fetchListings]);

  const runListingSearch = useCallback(async () => {
    const e = searchEmail.trim();
    const p = searchPhone.trim();
    if (!e && p.replace(/\D/g, "").length < 7) {
      toast.warning("Enter an email or a phone number (at least 7 digits).");
      return;
    }
    setSearching(true);
    setSearchResult(null);
    try {
      const qs = new URLSearchParams();
      if (e) qs.set("email", e);
      if (p) qs.set("phone", p);
      const res = await fetch(`/api/admin/listings/search?${qs}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setSearchResult(data.listing || null);
      setSearchAttempted(true);
    } catch (err) {
      toast.error(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }, [searchEmail, searchPhone, toast]);

  const openNewListingFlow = useCallback(() => {
    setSearchEmail("");
    setSearchPhone("");
    setSearchResult(null);
    setSearchAttempted(false);
    setNewListingSearchOpen(true);
  }, []);

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Listings</h1>
          <p className="text-sm text-secondary">
            Review and approve submissions. Use <strong className="text-title">Onboard to CRM</strong> to create a client,
            Free Ultimate subscription, then manage plans under Registered clients.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Select
            options={STATUS_OPTIONS}
            value={filter}
            onChange={(e) => setFilter(e.target.value ?? "")}
            placeholder="All"
            searchable={false}
            className="min-w-[140px]"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadCsv}
            disabled={loading || filteredListings.length === 0}
            className="h-10 min-h-[2.5rem] shrink-0"
          >
            <FiDownload className="h-4 w-4 shrink-0" aria-hidden />
            Download CSV
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={openNewListingFlow} className="h-10 min-h-[2.5rem] shrink-0">
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            New Listing
          </Button>
        </div>
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
          columns={columns}
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

      <Modal open={onboardModalOpen} onClose={closeOnboardModal} title="Onboard to CRM" size="md">
        <form onSubmit={handleOnboardSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-secondary">
            Creates a <strong className="text-title">registered client</strong> (CRM login) using this listing’s
            email, assigns <strong className="text-title">Free Ultimate</strong> like self-registration, then you can
            attach PayPal plans or overrides under{" "}
            <Link href="/admin/clients" className="text-primary font-medium hover:underline">
              Registered clients
            </Link>
            .
          </p>
          {onboardRow && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm">
              <p>
                <span className="text-secondary">Email (login):</span>{" "}
                <span className="font-medium text-title">{onboardRow.email}</span>
              </p>
              <p className="mt-1">
                <span className="text-secondary">Listing:</span> {onboardRow.companyName}
              </p>
            </div>
          )}
          <Input
            label="Shop name (CRM)"
            value={onboardShopName}
            onChange={(e) => setOnboardShopName(e.target.value)}
            placeholder="Company / shop display name"
            required
          />
          <Input
            label="Contact name"
            value={onboardContact}
            onChange={(e) => setOnboardContact(e.target.value)}
            placeholder="Primary contact"
          />
          <div>
            <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
              <label className="text-sm font-medium text-title" htmlFor="onboard-password">
                Initial password *
              </label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setOnboardPassword(generateTempPassword())}
              >
                Generate
              </button>
            </div>
            <Input
              id="onboard-password"
              type="text"
              autoComplete="new-password"
              value={onboardPassword}
              onChange={(e) => setOnboardPassword(e.target.value)}
              placeholder="Min 6 characters — share securely with the client"
              required
            />
            <p className="mt-1 text-xs text-secondary">
              The client will use this with their email to log in. They can change it after login.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={closeOnboardModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={onboardSubmitting}>
              {onboardSubmitting ? "Creating…" : "Create client & open subscription"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={newListingSearchOpen}
        onClose={() => setNewListingSearchOpen(false)}
        title="Find existing listing"
        size="md"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setNewListingSearchOpen(false)}>
            Close
          </Button>
        }
      >
        <p className="text-sm text-secondary">
          Search by email or phone before creating a duplicate. If you already have a listing, open it to edit.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Email" type="email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} placeholder="shop@example.com" />
          <Input label="Phone" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} placeholder="Digits only" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="primary" size="sm" onClick={runListingSearch} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {searchResult ? (
          <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3 text-sm">
            <p className="font-medium text-title">{searchResult.companyName}</p>
            <p className="text-secondary">{searchResult.email}</p>
            <Link
              href={`/admin/listings/${searchResult.id}`}
              className="mt-2 inline-block text-primary hover:underline"
              onClick={() => setNewListingSearchOpen(false)}
            >
              Open listing
            </Link>
          </div>
        ) : null}
        {searchAttempted && !searching && !searchResult ? (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-sm text-secondary">No listing found for this search.</p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="mt-2"
              onClick={() => {
                setNewListingSearchOpen(false);
                setNewListingCreateOpen(true);
              }}
            >
              Create new
            </Button>
          </div>
        ) : null}
      </Modal>

      <AdminFeaturedListingCreateModal
        open={newListingCreateOpen}
        onClose={() => setNewListingCreateOpen(false)}
        generatePassword={generateTempPassword}
        prefillEmail={searchEmail}
        prefillPhone={searchPhone}
        onCreated={() => {
          fetchListings();
        }}
      />

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
