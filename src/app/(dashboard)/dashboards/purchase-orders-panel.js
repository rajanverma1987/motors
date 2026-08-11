"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  FiCheckCircle,
  FiClipboard,
  FiEdit2,
  FiLayers,
  FiPlus,
  FiX,
} from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import SimpleVendorFormModal from "@/components/simple/simple-vendor-form-modal";
import { useConfirm, useAlert } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";
import {
  SIMPLE_SCREEN_FILTERS_CLASS,
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";
import { formatDateMdy } from "@/lib/format-date";
import { parseAllJobsDateRange } from "@/lib/all-jobs-date-filter";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import { formatSimpleMoney } from "@/lib/simple-service-proposal-form";
import {
  deleteSimplePurchaseOrder,
  fetchSimplePurchaseOrdersPage,
} from "@/lib/simple-portal-api";
import {
  computePoPaymentSummary,
  resolvePoStatus,
  resolveSimplePoType,
  SIMPLE_PO_TYPE_JOB,
  SIMPLE_PO_TYPE_SHOP,
  simplePoTypeLabel,
} from "@/lib/simple-purchase-order-form";
import { useSimpleOpenParam } from "@/hooks/use-simple-open-param";

const FILTER_ALL = "";
const FILTER_PAID = "Paid";
const FILTER_UNPAID = "Unpaid";
const FILTER_PARTIAL_PAID = "Partial Paid";

function normalizePaymentStatus(status) {
  const s = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
  if (s === "paid") return FILTER_PAID;
  if (s.includes("partial")) return FILTER_PARTIAL_PAID;
  if (!s || s === "unpaid") return FILTER_UNPAID;
  return String(status || "").trim() || FILTER_UNPAID;
}

function paymentStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function poStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "received") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function poTypeBadgeVariant(row) {
  return resolveSimplePoType(row) === SIMPLE_PO_TYPE_JOB ? "primary" : "default";
}

function paymentFilterIcon(label) {
  const l = String(label || "").toLowerCase();
  if (!l || l === "all") return FiLayers;
  if (l === "paid") return FiCheckCircle;
  return FiClipboard;
}

export default function PurchaseOrdersPanel({ createNonce = 0 }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendorById, setVendorById] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState(FILTER_ALL);
  const [tableSort, setTableSort] = useState({ key: "poCutDate", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);
  const [paymentBuckets, setPaymentBuckets] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [editingPo, setEditingPo] = useState(null);
  const [openVendorId, setOpenVendorId] = useState(null);
  const lastHandledCreateNonceRef = useRef(createNonce);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const pageData = await fetchSimplePurchaseOrdersPage({
        page,
        pageSize,
        q: searchQuery,
        sortBy: tableSort?.key || "poCutDate",
        sortDir: tableSort?.direction || "desc",
        paymentStatus: paymentFilter || "",
        from: dateFrom,
        to: dateTo,
      });
      setRows(Array.isArray(pageData.items) ? pageData.items : []);
      setTotalCount(Number(pageData.totalCount) || 0);
      setPaymentBuckets(Array.isArray(pageData.paymentBuckets) ? pageData.paymentBuckets : []);
    } catch {
      setRows([]);
      setTotalCount(0);
      setPaymentBuckets([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, tableSort, paymentFilter, dateFrom, dateTo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vend = await fetchAllPaginatedDashboardItems("/api/dashboard/vendors");
        if (cancelled) return;
        const map = {};
        for (const v of Array.isArray(vend) ? vend : []) {
          const id = String(v?.id || "").trim();
          if (!id) continue;
          map[id] = {
            name: String(v.name || v.companyName || "").trim(),
            phone: String(v.phone || "").trim(),
          };
        }
        setVendorById(map);
      } catch {
        if (!cancelled) setVendorById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = useCallback(() => {
    setEditingPo(null);
    setModalMode("create");
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createNonce) return;
    if (createNonce === lastHandledCreateNonceRef.current) return;
    lastHandledCreateNonceRef.current = createNonce;
    openCreate();
  }, [createNonce, openCreate]);

  const enrichedRows = useMemo(
    () =>
      rows.map((row) => {
        const vendor = vendorById[String(row.vendorId || "").trim()];
        const paySummary = computePoPaymentSummary(row.payments, row.grandTotal);
        const lastPaymentDate =
          paySummary.paymentStatus === "Unpaid"
            ? ""
            : paySummary.latestPaymentDate || String(row.poPaidDate || "").trim().slice(0, 10);
        return {
          ...row,
          vendorName: String(row.vendorName || "").trim() || vendor?.name || "",
          vendorPhone: String(row.vendorPhone || "").trim() || vendor?.phone || "",
          poStatus: resolvePoStatus(row.lineItems),
          lastPaymentDate,
          paidAmount: paySummary.amountPaid,
          unpaidAmount: paySummary.balance,
          paymentStatus: paySummary.paymentStatus || row.paymentStatus || "Unpaid",
        };
      }),
    [rows, vendorById]
  );

  const paymentSummaryCards = useMemo(() => {
    const tileFor = (index) => resolveStatusTileProps("", index);
    const bucketMap = new Map();
    for (const b of paymentBuckets) {
      const key = normalizePaymentStatus(b.paymentStatus);
      const prev = bucketMap.get(key) || { count: 0, amount: 0 };
      bucketMap.set(key, {
        count: prev.count + (Number(b.count) || 0),
        amount: prev.amount + (Number(b.amount) || 0),
      });
    }
    const allCount = [...bucketMap.values()].reduce((s, b) => s + b.count, 0);
    const allAmount = [...bucketMap.values()].reduce((s, b) => s + b.amount, 0);
    const statusCards = [
      { key: FILTER_PAID, label: "Paid", tileIndex: 2 },
      { key: FILTER_UNPAID, label: "Unpaid", tileIndex: 4 },
      { key: FILTER_PARTIAL_PAID, label: "Partial Paid", tileIndex: 3 },
    ].map(({ key, label, tileIndex }) => {
      const hit = bucketMap.get(key) || { count: 0, amount: 0 };
      return {
        key,
        label,
        count: hit.count,
        amount: hit.amount,
        tileAppearance: tileFor(tileIndex),
        icon: paymentFilterIcon(label),
      };
    });
    return [
      {
        key: FILTER_ALL,
        label: "All",
        count: allCount,
        amount: allAmount,
        tileAppearance: tileFor(0),
        icon: paymentFilterIcon("All"),
      },
      ...statusCards,
    ];
  }, [paymentBuckets]);

  const displayRows = enrichedRows;

  const openEdit = (row) => {
    setEditingPo(row);
    setModalMode("view");
    setModalOpen(true);
  };

  useSimpleOpenParam({
    ready: !loading,
    onOpen: useCallback(
      (openId) => {
        const row = rows.find((r) => String(r.id) === openId);
        if (row) openEdit(row);
        return true;
      },
      [rows]
    ),
  });

  useSimpleOpenParam({
    ready: true,
    paramKey: "openVendor",
    onOpen: useCallback((vendorId) => {
      if (vendorId) setOpenVendorId(vendorId);
      return true;
    }, []),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditingPo(null);
    setModalMode("view");
    void reload();
  };

  const handleDelete = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Delete purchase order",
        message: `Delete ${row.poNumber || "this purchase order"}? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        await deleteSimplePurchaseOrder(row.id);
        setRows((prev) => prev.filter((p) => p.id !== row.id));
        await alert({ title: "Deleted", message: "Purchase order deleted." });
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to delete purchase order.",
          variant: "danger",
        });
      }
    },
    [confirm, alert]
  );

  const columns = useMemo(
    () => [
      {
        key: "edit",
        label: "",
        sortable: false,
        className: "w-10",
        render: (_, row) => (
          <button
            type="button"
            className="rounded p-0.5 text-primary hover:bg-primary/10"
            title="Edit"
            aria-label="Edit"
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
          >
            <FiEdit2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        ),
      },
      {
        key: "poNumber",
        label: "PO#",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openEdit(row)}
          >
            {v || "—"}
          </button>
        ),
      },
      {
        key: "poType",
        label: "Type",
        sortable: true,
        render: (_, row) => (
          <Badge
            variant={poTypeBadgeVariant(row)}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {simplePoTypeLabel(row)}
          </Badge>
        ),
      },
      {
        key: "jobNumber",
        label: "Job#",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "vendorName",
        label: "Vendor Name",
        sortable: true,
        render: (v, row) => {
          const vendorId = String(row.vendorId || "").trim();
          const name = String(v || "").trim() || "—";
          if (!vendorId || name === "—") return name;
          return (
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setOpenVendorId(vendorId);
              }}
              title="Open vendor"
            >
              {name}
            </button>
          );
        },
      },
      {
        key: "vendorPhone",
        label: "Phone",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "poCutDate",
        label: "PO Date",
        sortable: true,
        render: (v) => formatDateMdy(v) || "—",
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: (v) => formatDateMdy(v) || "—",
      },
      {
        key: "poStatus",
        label: "PO Status",
        sortable: true,
        render: (v) => {
          const label = String(v || "").trim() || "—";
          if (label === "—") return label;
          return (
            <Badge
              variant={poStatusBadgeVariant(label)}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {label}
            </Badge>
          );
        },
      },
      {
        key: "paymentStatus",
        label: "Payment Status",
        sortable: true,
        render: (v) => {
          const label = String(v || "").trim() || "—";
          if (label === "—") return label;
          return (
            <Badge
              variant={paymentStatusBadgeVariant(label)}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {label}
            </Badge>
          );
        },
      },
      {
        key: "grandTotal",
        label: "Grand Total",
        sortable: true,
        align: "right",
        render: (v) => formatSimpleMoney(Number(v) || 0),
      },
      {
        key: "paidAmount",
        label: "Paid Amount",
        sortable: true,
        align: "right",
        render: (v) => formatSimpleMoney(Number(v) || 0),
      },
      {
        key: "unpaidAmount",
        label: "Unpaid Amount",
        sortable: true,
        align: "right",
        render: (v) => formatSimpleMoney(Number(v) || 0),
      },
      {
        key: "lastPaymentDate",
        label: "Last Payment Date",
        sortable: true,
        render: (v) => formatDateMdy(v) || "—",
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        className: "w-10",
        render: (_, row) => (
          <button
            type="button"
            className="rounded p-0.5 text-danger hover:bg-danger/10"
            title="Delete"
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            <FiX className="h-3.5 w-3.5" aria-hidden />
          </button>
        ),
      },
    ],
    [handleDelete]
  );

  const isCreate = modalMode === "create";

  return (
    <div className={SIMPLE_SCREEN_PANEL_CLASS}>
      <div className={`${SIMPLE_SCREEN_FILTERS_CLASS} shrink-0`}>
        {paymentSummaryCards.map((card) => (
          <StatusFilterPillButton
            key={card.key || "__all__"}
            card={card}
            active={(paymentFilter || "") === (card.key || "")}
            onClick={() => {
              setPage(1);
              setPaymentFilter(card.key || FILTER_ALL);
            }}
            formatAmount={(n) =>
              `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}`
            }
          />
        ))}
      </div>

      <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          columns={columns}
          data={displayRows}
          rowKey="id"
          loading={loading}
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search purchase orders…"
          sortState={tableSort}
          onSort={(key, direction) => {
            setPage(1);
            setTableSort({ key, direction });
          }}
          onRefresh={reload}
          toolbarBeforeSearch={
            <Button type="button" variant="primary" size="sm" className="h-9 !rounded-none px-2.5" onClick={openCreate}>
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add New
            </Button>
          }
          emptyMessage={
            totalCount === 0
              ? searchQuery.trim()
                ? "No purchase orders match your search."
                : paymentFilter
                  ? `No ${paymentFilter.toLowerCase()} purchase orders.`
                  : dateFrom || dateTo
                    ? "No purchase orders in this date range."
                    : "No purchase orders yet. Click Add New for a Shop PO, or create a Job PO from a service proposal."
              : "No purchase orders yet."
          }
          fillHeight
          responsive
          dense
          textSize="xs"
          paginateClientSide={false}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
        />
      </div>

      <SimplePurchaseOrderFormModal
        open={modalOpen && (isCreate || !!editingPo)}
        onClose={closeModal}
        serviceProposalId={String(editingPo?.serviceProposalId || "").trim()}
        jobNumber={String(editingPo?.jobNumber || "").trim()}
        mode={isCreate ? "create" : "view"}
        initialPoId={String(editingPo?.id || "").trim()}
        defaultPoType={isCreate ? SIMPLE_PO_TYPE_SHOP : SIMPLE_PO_TYPE_JOB}
        allowPoTypeChange={isCreate}
        onSaved={() => reload()}
      />

      <SimpleVendorFormModal
        open={!!openVendorId}
        vendorId={openVendorId}
        onClose={() => setOpenVendorId(null)}
        relatedPos={enrichedRows}
        zIndex={120}
        onVendorUpdated={(vendor) => {
          const vid = String(vendor?.id || openVendorId || "").trim();
          if (!vid) return;
          setVendorById((prev) => ({
            ...prev,
            [vid]: { ...(prev[vid] || {}), ...vendor, id: vid },
          }));
          const nextName = String(vendor?.name || "").trim();
          const nextPhone = String(vendor?.phone || "").trim();
          if (!nextName && !nextPhone) return;
          setRows((prev) =>
            prev.map((r) => {
              if (String(r.vendorId || "") !== vid) return r;
              return {
                ...r,
                ...(nextName ? { vendorName: nextName } : {}),
                ...(nextPhone ? { vendorPhone: nextPhone } : {}),
              };
            })
          );
        }}
        onOpenPo={(po) => {
          setOpenVendorId(null);
          openEdit(po);
        }}
      />
    </div>
  );
}
