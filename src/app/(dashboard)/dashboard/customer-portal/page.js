"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FiGlobe, FiCopy } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { sortRowsClient } from "@/lib/client-table-sort";

export default function CustomerPortalPage() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState(null);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/customers", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load customers");
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleCopyPortalLink = useCallback(
    async (customerId) => {
      if (!customerId) return;
      setCopyingId(customerId);
      try {
        const res = await fetch(
          `/api/dashboard/customer-portal/link?customerId=${encodeURIComponent(customerId)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to get link");
        const url = data.url;
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          toast.success("Portal link copied to clipboard.");
        } else {
          toast.success("Portal link ready.");
          window.prompt("Copy this link:", url);
        }
      } catch (err) {
        toast.error(err.message || "Failed to copy link");
      } finally {
        setCopyingId(null);
      }
    },
    [toast]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const name = (c.companyName || "").toLowerCase();
      const contact = (c.primaryContactName || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [customers, searchQuery]);

  const getPortalSortValue = useCallback((row, key) => {
    if (key === "name") return row.companyName || row.primaryContactName || "";
    return row?.[key];
  }, []);

  const [tableSort, setTableSort] = useState({ key: null, direction: "asc" });
  const sortedCustomers = useMemo(
    () => sortRowsClient(filteredCustomers, tableSort, getPortalSortValue),
    [filteredCustomers, tableSort, getPortalSortValue]
  );
  const handleTableSort = useCallback((key, direction) => setTableSort({ key, direction }), []);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Customer",
        sortable: true,
        render: (_, row) => (
          <span className="font-medium text-title">
            {row.companyName || row.primaryContactName || "—"}
          </span>
        ),
      },
      {
        key: "primaryContactName",
        label: "Contact",
        sortable: true,
        render: (_, row) => row.primaryContactName || "—",
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: (_, row) => row.email || "—",
      },
      {
        key: "portalLink",
        label: "Portal link",
        render: (_, row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyPortalLink(row.id)}
            disabled={copyingId === row.id}
            className="shrink-0"
          >
            {copyingId === row.id ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Copying…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <FiCopy className="h-4 w-4" aria-hidden />
                Copy link
              </span>
            )}
          </Button>
        ),
      },
    ],
    [copyingId, handleCopyPortalLink]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title flex items-center gap-2">
            <FiGlobe className="h-7 w-7 text-primary" aria-hidden />
            Customer portal
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Per-customer links for motors, quotes, and history—use Copy link.
          </p>
        </div>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={sortedCustomers}
          rowKey="id"
          loading={loading}
          sortState={tableSort}
          onSort={handleTableSort}
          emptyMessage={
            customers.length === 0
              ? "No customers yet. Add customers first, then use “Copy link” to share their portal."
              : "No customers match the search."
          }
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search customers…"
          onRefresh={async () => {
            setLoading(true);
            await loadCustomers();
            setLoading(false);
          }}
          responsive
        />
      </div>
    </div>
  );
}
