"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import { useConfirm, useAlert } from "@/components/confirm-provider";
import { formatDateMdy } from "@/lib/format-date";
import { parseAllJobsDateRange, recordInAllJobsDateRange } from "@/lib/all-jobs-date-filter";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { formatSimpleMoney } from "@/lib/simple-service-proposal-form";
import {
  deleteSimplePurchaseOrder,
  fetchSimplePurchaseOrders,
  migrateLocalSimplePurchaseOrdersIfNeeded,
} from "@/lib/simple-portal-api";
import {
  resolveSimplePoType,
  SIMPLE_PO_TYPE_JOB,
  SIMPLE_PO_TYPE_SHOP,
  simplePoTypeLabel,
} from "@/lib/simple-purchase-order-form";

function paymentStatusBadgeVariant(status) {
  const s = String(status || "").trim().toLowerCase();
  if (s === "paid") return "success";
  if (s.includes("partial")) return "warning";
  return "default";
}

function poTypeBadgeVariant(row) {
  return resolveSimplePoType(row) === SIMPLE_PO_TYPE_JOB ? "primary" : "default";
}

export default function PurchaseOrdersPanel({ createNonce = 0 }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);

  const [rows, setRows] = useState([]);
  const [vendorById, setVendorById] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [editingPo, setEditingPo] = useState(null);

  const reload = useCallback(async () => {
    try {
      await migrateLocalSimplePurchaseOrdersIfNeeded();
      const list = await fetchSimplePurchaseOrders();
      setRows(Array.isArray(list) ? list : []);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

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

  useEffect(() => {
    if (!createNonce) return;
    setEditingPo(null);
    setModalMode("create");
    setModalOpen(true);
  }, [createNonce]);

  const enrichedRows = useMemo(
    () =>
      rows.map((row) => {
        const vendor = vendorById[String(row.vendorId || "").trim()];
        return {
          ...row,
          vendorName: String(row.vendorName || "").trim() || vendor?.name || "",
          vendorPhone: String(row.vendorPhone || "").trim() || vendor?.phone || "",
        };
      }),
    [rows, vendorById]
  );

  const rowsForDate = useMemo(
    () =>
      enrichedRows.filter((row) =>
        recordInAllJobsDateRange(
          { date: row.poCutDate || row.dueDate || row.createdAt || "" },
          dateFrom,
          dateTo
        )
      ),
    [enrichedRows, dateFrom, dateTo]
  );

  const displayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rowsForDate;
    return rowsForDate.filter((row) => {
      const haystack = [
        row.poNumber,
        row.jobNumber,
        row.vendorName,
        row.vendorPhone,
        row.paymentStatus,
        row.paymentMethod,
        row.comments,
        row.dueDate,
        row.poCutDate,
        simplePoTypeLabel(row),
        row.grandTotal != null ? String(row.grandTotal) : "",
        formatSimpleMoney(Number(row.grandTotal) || 0),
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [rowsForDate, searchQuery]);

  const openEdit = (row) => {
    setEditingPo(row);
    setModalMode("view");
    setModalOpen(true);
  };

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
        key: "actions",
        label: "",
        sortable: false,
        className: "w-20",
        render: (_, row) => (
          <div className="flex items-center gap-0.5">
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
              <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
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
        render: (v) => v || "—",
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
    ],
    [handleDelete]
  );

  const isCreate = modalMode === "create";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={displayRows}
          rowKey="id"
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search purchase orders…"
          emptyMessage={
            rows.length === 0
              ? "No purchase orders yet. Click Add New for a Shop PO, or create a Job PO from a service proposal."
              : (dateFrom || dateTo) && rowsForDate.length === 0
                ? "No purchase orders in this date range."
                : searchQuery.trim()
                  ? "No purchase orders match your search."
                  : "No purchase orders yet."
          }
          fillHeight
          responsive
          dense
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
    </div>
  );
}
