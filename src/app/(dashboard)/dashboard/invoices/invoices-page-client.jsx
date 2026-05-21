"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiEdit2, FiTrash2, FiSend, FiPrinter, FiRotateCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
import InvoicePrintOffscreen from "@/components/dashboard/invoice-print-offscreen";
import CrmPlaceholder from "@/components/dashboard/crm-placeholder";
import { invoiceStatusLabel, invoiceStatusPillAppearance } from "@/lib/invoice-status";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  invoiceStatusSelectOptionsFromMerged,
  invoiceStatusTileColorForValue,
} from "@/lib/dropdown-catalog";
import { invoiceLineTotal, invoiceTaxAmount } from "@/lib/invoice-amounts";
import { normalizeTaxExempt } from "@/lib/quote-invoice-totals";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import { formatDateMdy } from "@/lib/format-date";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";

function InvoicesInner() {
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");
  const { settings: accountSettings } = useUserSettings();
  const mergedAccountSettings = useMemo(() => mergeUserSettings(accountSettings), [accountSettings]);
  const fmt = useFormatMoney();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [invoiceSort, setInvoiceSort] = useState({ key: "createdAt", direction: "desc" });
  const [summaryByStatus, setSummaryByStatus] = useState({});
  const [statusFilter, setStatusFilter] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [printPayload, setPrintPayload] = useState(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (invoiceSort?.key) {
        params.set("sortBy", invoiceSort.key);
        params.set("sortDir", invoiceSort.direction || "asc");
      }
      if (statusFilter.trim()) params.set("status", statusFilter.trim());
      const res = await fetch(`/api/dashboard/invoices?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows(Array.isArray(data?.items) ? data.items : []);
        setTotalCount(Number(data?.totalCount) || 0);
        setSummaryByStatus(data?.summaryByStatus && typeof data.summaryByStatus === "object" ? data.summaryByStatus : {});
      } else {
        setRows([]);
        setTotalCount(0);
        setSummaryByStatus({});
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, invoiceSort, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const d = draftQuoteParam?.trim();
    const o = openId?.trim();
    if (d) {
      setInvoiceModal({ draftQuoteId: d });
      router.replace("/dashboard/invoices", { scroll: false });
      return;
    }
    if (o) {
      setInvoiceModal({ invoiceId: o });
      router.replace("/dashboard/invoices", { scroll: false });
    }
  }, [draftQuoteParam, openId, router]);

  const handleInvoiceSort = useCallback((key, direction) => {
    setPage(1);
    setInvoiceSort({ key, direction });
  }, []);

  const statusSelectOptions = useMemo(
    () => invoiceStatusSelectOptionsFromMerged(mergedAccountSettings),
    [mergedAccountSettings]
  );

  const statusSummaryCards = useMemo(() => {
    const keysLower = new Set(statusSelectOptions.map((o) => o.value.toLowerCase()));
    const buttons = [];
    const tileAppearanceForKey = (statusKey, fallbackIndex) => {
      if (statusKey === "") return resolveStatusTileProps("", 0);
      if (statusKey === "__other__") return resolveStatusTileProps("", 17);
      const optIdx = statusSelectOptions.findIndex(
        (o) => o.value.toLowerCase() === String(statusKey).toLowerCase()
      );
      const { tileColor, tileBgColor, tileTextColor, index } = invoiceStatusTileColorForValue(
        mergedAccountSettings,
        statusKey,
        optIdx >= 0 ? optIdx : fallbackIndex
      );
      return resolveStatusTileProps(tileColor, index, {
        tileBgColor,
        tileTextColor,
        tileColor,
      });
    };

    statusSelectOptions.forEach((opt, optIdx) => {
      buttons.push({
        key: opt.value,
        label: opt.label,
        count: Number(summaryByStatus?.[opt.value]?.count) || 0,
        amount: Number(summaryByStatus?.[opt.value]?.amount) || 0,
        tileAppearance: tileAppearanceForKey(opt.value, optIdx),
      });
    });

    let orphanCount = 0;
    let orphanAmount = 0;
    for (const [rawKey, agg] of Object.entries(summaryByStatus || {})) {
      const norm = normalizeInvoiceStatusSlug(rawKey, mergedAccountSettings);
      if (!keysLower.has(norm)) {
        orphanCount += Number(agg?.count) || 0;
        orphanAmount += Number(agg?.amount) || 0;
      }
    }
    if (orphanCount > 0) {
      buttons.push({
        key: "__other__",
        label: "Other",
        count: orphanCount,
        amount: orphanAmount,
        tileAppearance: tileAppearanceForKey("__other__", 17),
      });
    }

    const allCount = Object.values(summaryByStatus || {}).reduce(
      (sum, agg) => sum + (Number(agg?.count) || 0),
      0
    );
    const allAmount = Object.values(summaryByStatus || {}).reduce(
      (sum, agg) => sum + (Number(agg?.amount) || 0),
      0
    );
    buttons.unshift({
      key: "",
      label: "All",
      count: allCount,
      amount: allAmount,
      tileAppearance: tileAppearanceForKey("", 0),
    });
    return buttons;
  }, [summaryByStatus, statusSelectOptions, mergedAccountSettings]);

  const handleDeleteCb = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Delete invoice",
        message: `Delete invoice #${row.invoiceNumber || row.id}? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Delete failed");
        toast.success("Invoice deleted.");
        load();
      } catch (e) {
        toast.error(e.message || "Could not delete");
      }
    },
    [confirm, toast, load]
  );

  const handleSendCb = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Send invoice to client",
        message: `Email invoice #${row.invoiceNumber || ""} to the customer on file?`,
        confirmLabel: "Send",
      });
      if (!ok) return;
      setSendingInvoiceId(row.id);
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}/send`, {
          method: "POST",
          credentials: "include",
        });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Send failed");
        toast.success(d.message || "Sent.");
        load();
      } catch (e) {
        toast.error(e.message || "Could not send");
      } finally {
        setSendingInvoiceId(null);
      }
    },
    [confirm, toast, load]
  );

  const openPrintCb = useCallback(
    async (row) => {
      try {
        const res = await fetch(`/api/dashboard/invoices/${row.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        const inv = await res.json();
        if (!res.ok) throw new Error(inv.error || "Failed to load invoice");
        setPrintPayload({
          invoice: inv,
          motorLabel: inv.motorLabel,
          fromShopName: inv.fromShopName || "",
          fromShopContact: inv.fromShopContact || "",
          fromShopLogoUrl: (inv.fromShopLogoUrl || accountSettings?.logoUrl || "").trim(),
          fromBillingAddress: inv.fromBillingAddress || "",
          fromPaymentTermsLabel:
            inv.fromPaymentTermsLabel || accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms),
          customerToName: inv.customerToName || "",
          customerBillingAddress: inv.customerBillingAddress || "",
          invoicePaymentOptions: accountSettings?.invoicePaymentOptions || "",
          invoiceThankYouNote: accountSettings?.invoiceThankYouNote || "",
        });
        setPrintOpen(true);
      } catch (e) {
        toast.error(e.message || "Could not open print view");
      }
    },
    [toast, accountSettings]
  );

  const columns = useMemo(
    () => [
      {
        key: "_actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex flex-wrap justify-start gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                setInvoiceModal({ invoiceId: row.id });
              }}
            >
              <FiEdit2 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title={sendingInvoiceId === row.id ? "Sending…" : "Send to client"}
              disabled={sendingInvoiceId != null}
              onClick={(e) => {
                e.stopPropagation();
                handleSendCb(row);
              }}
            >
              {sendingInvoiceId === row.id ? (
                <FiRotateCw className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FiSend className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              title="Print"
              onClick={(e) => {
                e.stopPropagation();
                openPrintCb(row);
              }}
            >
              <FiPrinter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-danger"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCb(row);
              }}
            >
              <FiTrash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
      { key: "invoiceNumber", label: "Invoice#", clickable: true, sortable: true },
      {
        key: "rfqNumber",
        label: "Job#",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "customerPo",
        label: "Customer PO#",
        sortable: true,
        render: (v) => v || "—",
      },
      { key: "customerName", label: "Customer", sortable: true },
      {
        key: "date",
        label: "Date",
        sortable: true,
        render: (v) => formatDateMdy(v),
      },
      {
        key: "taxAmount",
        label: "Tax",
        render: (_, row) =>
          normalizeTaxExempt(row.customerTaxExempt) ? (
            <span className="text-secondary">Exempt</span>
          ) : (
            fmt(invoiceTaxAmount(row))
          ),
      },
      {
        key: "totalAmount",
        label: "Total Amount",
        sortable: true,
        render: (_, row) => fmt(invoiceLineTotal(row)),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (v) => {
          const pill = invoiceStatusPillAppearance(v, mergedAccountSettings);
          return (
          <span
            className={`job-board-status-pill inline-flex max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs font-medium ${pill.className}`}
            style={pill.style}
          >
            {invoiceStatusLabel(v, mergedAccountSettings)}
          </span>
          );
        },
      },
    ],
    [fmt, handleDeleteCb, handleSendCb, openPrintCb, sendingInvoiceId, mergedAccountSettings]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Invoices</h1>
        <p className="mt-2 text-sm text-secondary">
          Bills from quotes—edit, send, print, and track payment.
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 flex-wrap gap-2">
          {statusSummaryCards.map((card) => (
            <StatusFilterPillButton
              key={card.key || "__all__"}
              card={card}
              active={(statusFilter || "") === (card.key || "")}
              onClick={() => {
                setPage(1);
                setStatusFilter(card.key || "");
              }}
              formatAmount={fmt}
            />
          ))}
        </div>

        <Table
          columns={columns}
          data={rows}
          rowKey="id"
          loading={loading}
          fillHeight
          sortState={invoiceSort}
          onSort={handleInvoiceSort}
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search invoice#, job#, customer PO#, customer, date, status…"
          onCellClick={(row) => setInvoiceModal({ invoiceId: row.id })}
          onRefresh={load}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
          emptyMessage={
            totalCount === 0 && !searchQuery.trim() && !statusFilter
              ? "No invoices yet. Create an invoice from an approved quote on the RFQ page."
              : statusFilter
                ? "No invoices with this status."
                : "No invoices match your search."
          }
        />
      </div>

      <InvoiceFormModal
        open={!!invoiceModal}
        draftQuoteId={invoiceModal?.draftQuoteId ?? null}
        invoiceId={invoiceModal?.invoiceId ?? null}
        onClose={() => setInvoiceModal(null)}
        onAfterSave={load}
        onSwitchToInvoice={(id) => setInvoiceModal({ invoiceId: id })}
        zIndex={55}
      />

      <InvoicePrintOffscreen
        open={printOpen}
        payload={printPayload}
        onClose={() => {
          setPrintOpen(false);
          setPrintPayload(null);
        }}
      />
    </div>
  );
}

export default function InvoicesPageClient() {
  return (
    <Suspense fallback={<CrmPlaceholder title="Invoices" description="Loading…" />}>
      <InvoicesInner />
    </Suspense>
  );
}
