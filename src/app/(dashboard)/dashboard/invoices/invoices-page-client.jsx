"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FiTrash2 } from "react-icons/fi";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import InvoiceFormModal from "@/components/dashboard/invoice-form-modal";
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
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import QuoteFormModal from "@/components/dashboard/quote-form-modal";
import RepairFlowJobDetailClient from "@/app/(dashboard)/dashboard/repair-flow/[id]/repair-flow-job-detail-client";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { allJobsListPath, ALL_JOBS_TAB_RFQ } from "@/lib/all-jobs-tabs";
import { parseAllJobsDateRange } from "@/lib/all-jobs-date-filter";
import { INVOICE_FILTER_TAX_COLLECTED, INVOICE_FILTER_TAX_TO_BE_COLLECTED } from "@/lib/invoice-tax-collected";

const INVOICE_RECORD_LINK_CLASS =
  "text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded";

function InvoicesInner({ embedded = false, actionsRef = null }) {
  const listPath = allJobsListPath(embedded, "invoices", "/dashboard/invoices");
  const toast = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = searchParams.get("open");
  const draftQuoteParam = searchParams.get("draftQuote");
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);
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
  const [summaryTaxCollected, setSummaryTaxCollected] = useState({
    count: 0,
    invoiceAmount: 0,
    taxCollected: 0,
  });
  const [summaryTaxToBeCollected, setSummaryTaxToBeCollected] = useState({
    count: 0,
    invoiceAmount: 0,
    taxToBeCollected: 0,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [linkedJobId, setLinkedJobId] = useState(null);
  const [linkedJobHeader, setLinkedJobHeader] = useState(null);

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
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/dashboard/invoices?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRows(Array.isArray(data?.items) ? data.items : []);
        setTotalCount(Number(data?.totalCount) || 0);
        setSummaryByStatus(data?.summaryByStatus && typeof data.summaryByStatus === "object" ? data.summaryByStatus : {});
        setSummaryTaxCollected(
          data?.summaryTaxCollected && typeof data.summaryTaxCollected === "object"
            ? data.summaryTaxCollected
            : { count: 0, invoiceAmount: 0, taxCollected: 0 }
        );
        setSummaryTaxToBeCollected(
          data?.summaryTaxToBeCollected && typeof data.summaryTaxToBeCollected === "object"
            ? data.summaryTaxToBeCollected
            : { count: 0, invoiceAmount: 0, taxToBeCollected: 0 }
        );
      } else {
        setRows([]);
        setTotalCount(0);
        setSummaryByStatus({});
        setSummaryTaxCollected({ count: 0, invoiceAmount: 0, taxCollected: 0 });
        setSummaryTaxToBeCollected({ count: 0, invoiceAmount: 0, taxToBeCollected: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, invoiceSort, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, statusFilter, searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!embedded || !actionsRef) return undefined;
    actionsRef.current = { reload: load };
    return () => {
      if (actionsRef.current?.reload === load) {
        actionsRef.current = null;
      }
    };
  }, [embedded, actionsRef, load]);

  useEffect(() => {
    const d = draftQuoteParam?.trim();
    const o = openId?.trim();
    if (d) {
      setInvoiceModal({ draftQuoteId: d });
      router.replace(listPath, { scroll: false });
      return;
    }
    if (o) {
      setInvoiceModal({ invoiceId: o });
      router.replace(listPath, { scroll: false });
    }
  }, [draftQuoteParam, openId, router, listPath]);

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

    const taxCount = Number(summaryTaxCollected?.count) || 0;
    const taxAmount = Number(summaryTaxCollected?.taxCollected) || 0;
    buttons.push({
      key: INVOICE_FILTER_TAX_COLLECTED,
      label: "Tax collected",
      count: taxCount,
      amount: taxAmount,
      subtitle: `${taxCount} · ${fmt(taxAmount)}`,
      tileAppearance: resolveStatusTileProps("", 8),
    });

    const taxToBeCount = Number(summaryTaxToBeCollected?.count) || 0;
    const taxToBeAmount = Number(summaryTaxToBeCollected?.taxToBeCollected) || 0;
    buttons.push({
      key: INVOICE_FILTER_TAX_TO_BE_COLLECTED,
      label: "Tax To Be Collected",
      count: taxToBeCount,
      amount: taxToBeAmount,
      subtitle: `${taxToBeCount} · ${fmt(taxToBeAmount)}`,
      tileAppearance: resolveStatusTileProps("", 9),
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
  }, [summaryByStatus, summaryTaxCollected, summaryTaxToBeCollected, statusSelectOptions, mergedAccountSettings, fmt]);

  const openInvoiceJobLink = useCallback((row) => {
    const jobId = String(row?.repairFlowJobId || "").trim();
    const quoteId = String(row?.quoteId || "").trim();
    if (jobId) {
      setLinkedJobHeader(null);
      setLinkedJobId(jobId);
      return;
    }
    if (quoteId) setOpenQuoteId(quoteId);
  }, []);

  const closeLinkedJobModal = useCallback(() => {
    setLinkedJobId(null);
    setLinkedJobHeader(null);
  }, []);

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

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 44,
        minWidth: 44,
        maxWidth: 52,
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCb(row);
              }}
              className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Delete invoice"
              title="Delete"
            >
              <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        ),
      },
      { key: "invoiceNumber", label: "Invoice#", clickable: true, sortable: true },
      {
        key: "rfqNumber",
        label: "Job#",
        sortable: true,
        render: (v, row) => {
          const label = v || row.rfqNumber || "—";
          const jobId = String(row.repairFlowJobId || "").trim();
          const quoteId = String(row.quoteId || "").trim();
          if (label === "—" || (!jobId && !quoteId)) return label;
          return (
            <button
              type="button"
              className={INVOICE_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                openInvoiceJobLink(row);
              }}
              title={jobId ? "Open repair job" : "Open RFQ"}
            >
              {label}
            </button>
          );
        },
      },
      {
        key: "customerPo",
        label: "Customer PO#",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (v, row) => {
          const name = v || row.customerName || "—";
          const customerId = String(row.customerId || "").trim();
          if (!customerId || name === "—") return name;
          return (
            <button
              type="button"
              className={INVOICE_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setOpenCustomerId(customerId);
              }}
              title="Open customer"
            >
              {name}
            </button>
          );
        },
      },
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
    [fmt, handleDeleteCb, mergedAccountSettings, openInvoiceJobLink]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      {!embedded ? (
        <div className="mb-4 shrink-0 border-b border-border pb-4">
          <h1 className="text-2xl font-bold text-title">Invoices</h1>
          <p className="mt-2 text-sm text-secondary">
            Bills from quotes—edit, send, print, and track payment.
          </p>
        </div>
      ) : null}

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
            totalCount === 0 && !searchQuery.trim() && !statusFilter && !dateFrom && !dateTo
              ? "No invoices yet. Create an invoice from an approved quote on the RFQ page."
              : totalCount === 0 && (dateFrom || dateTo)
                ? "No invoices in this date range."
                : statusFilter === INVOICE_FILTER_TAX_COLLECTED
                  ? "No fully paid invoices with tax collected."
                  : statusFilter === INVOICE_FILTER_TAX_TO_BE_COLLECTED
                    ? "No billed invoices with tax to be collected."
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
        onConvertedToRfq={({ quoteId }) => {
          const qid = String(quoteId || "").trim();
          if (!qid) return;
          if (embedded) {
            const params = new URLSearchParams({ tab: ALL_JOBS_TAB_RFQ, edit: qid });
            router.replace(`/dashboard/all-jobs?${params.toString()}`, { scroll: false });
            return;
          }
          router.push(`/dashboard/rfq?edit=${encodeURIComponent(qid)}`);
        }}
        zIndex={55}
      />

      <CustomerQuickViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={120}
      />

      <QuoteFormModal
        open={!!openQuoteId}
        quoteId={openQuoteId}
        onClose={() => setOpenQuoteId(null)}
        onAfterSave={load}
        zIndex={120}
      />

      <Modal
        open={!!linkedJobId}
        onClose={closeLinkedJobModal}
        title={
          linkedJobHeader?.jobNumber
            ? `${linkedJobHeader.jobNumber} · ${linkedJobHeader.customerLabel || "Customer"}`
            : "Repair job"
        }
        width="min(1200px, 94vw)"
        zIndex={115}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={closeLinkedJobModal}>
            Close
          </Button>
        }
      >
        <div className="w-full min-w-0 max-w-none">
          {linkedJobId ? (
            <RepairFlowJobDetailClient
              key={linkedJobId}
              jobId={linkedJobId}
              variant="modal"
              onClose={closeLinkedJobModal}
              onJobMeta={setLinkedJobHeader}
            />
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

export default function InvoicesPageClient({ embedded = false, actionsRef = null }) {
  return (
    <Suspense fallback={<CrmPlaceholder title="Invoices" description="Loading…" />}>
      <InvoicesInner embedded={embedded} actionsRef={actionsRef} />
    </Suspense>
  );
}
