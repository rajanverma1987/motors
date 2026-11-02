"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiRotateCcw, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import SimplePurchaseOrderFormModal from "@/components/simple/simple-purchase-order-form-modal";
import SimpleActivityLogPanel from "@/components/simple/simple-activity-log-panel";
import { useSimpleJobView } from "@/components/simple/simple-job-view-context";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useFormatDateTime } from "@/contexts/user-settings-context";
import { deleteSimplePurchaseOrder, deleteSimpleServiceProposal, restoreSimpleRecord } from "@/lib/simple-portal-api";

function kindVariant(kind) {
  if (kind === "invoice") return "primary";
  if (kind === "purchaseOrder") return "warning";
  return "default";
}

export default function DeletedRecordsPanel({ canViewFinancials = true }) {
  const confirm = useConfirm();
  const alert = useAlert();
  const formatDateTime = useFormatDateTime();
  const jobView = useSimpleJobView();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [poId, setPoId] = useState("");
  const [listQuery, setListQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/removed-records", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load deleted records");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setItems([]);
      await alert({ title: "Error", message: err?.message || "Failed to load deleted records.", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const visible = canViewFinancials ? items : items.filter((row) => row.kind === "proposal");
    const q = listQuery.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((row) =>
      [row.kindLabel, row.number, row.partyName, row.removedByEmail, row.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [canViewFinancials, items, listQuery]);

  const handleRestore = useCallback(
    async (row) => {
      const ok = await confirm({
        title: "Restore",
        message: `Put ${row.number || "this record"} back on its list?`,
        confirmLabel: "Restore",
      });
      if (!ok) return;
      try {
        await restoreSimpleRecord(row.kind, row.id);
        setItems((prev) => prev.filter((item) => item.id !== row.id));
        await alert({ title: "Restored", message: "The record is back on its list." });
      } catch (err) {
        await alert({ title: "Error", message: err?.message || "Failed to restore.", variant: "danger" });
      }
    },
    [alert, confirm]
  );

  const handlePermanentDelete = useCallback(
    async (row) => {
      const label = row.number || "this record";
      const first = await confirm({
        title: "Delete permanently",
        message: `Delete ${label}? This removes it from the database.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!first) return;
      const second = await confirm({
        title: "Delete permanently",
        message: `${label} will be gone. The activity log will keep the number. Delete it now?`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!second) return;
      try {
        if (row.kind === "purchaseOrder") await deleteSimplePurchaseOrder(row.id);
        else await deleteSimpleServiceProposal(row.id);
        setItems((prev) => prev.filter((item) => item.id !== row.id));
        await alert({ title: "Deleted", message: "Deleted permanently." });
      } catch (err) {
        await alert({ title: "Error", message: err?.message || "Failed to delete.", variant: "danger" });
      }
    },
    [alert, confirm]
  );

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_, row) => (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded p-1 text-primary hover:bg-primary/10"
              title="View"
              aria-label="View"
              onClick={(e) => {
                e.stopPropagation();
                if (row.kind === "purchaseOrder") setPoId(row.id);
                else jobView?.openJob?.(row.id);
              }}
            >
              <FiEye className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-1 text-primary hover:bg-primary/10"
              title="Restore"
              aria-label="Restore"
              onClick={(e) => {
                e.stopPropagation();
                void handleRestore(row);
              }}
            >
              <FiRotateCcw className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-1 text-danger hover:bg-danger/10"
              title="Delete"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                void handlePermanentDelete(row);
              }}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "kindLabel",
        label: "Type",
        render: (value, row) => (
          <Badge variant={kindVariant(row.kind)} className="rounded-full px-2.5 py-0.5 text-xs">
            {value}
          </Badge>
        ),
      },
      { key: "number", label: "Number" },
      { key: "partyName", label: "Customer or vendor" },
      {
        key: "removedAt",
        label: "Removed",
        render: (value) => formatDateTime(value) || "-",
      },
      { key: "removedByEmail", label: "Removed by" },
    ],
    [formatDateTime, handlePermanentDelete, handleRestore, jobView]
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-title">Deleted</h2>
        <p className="text-sm text-secondary">
          These records are hidden from the lists. Restore puts one back. Delete removes it from the database.
        </p>
      </div>
      <Table
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        searchable
        onSearch={setListQuery}
        searchPlaceholder="Search deleted records"
        emptyMessage="Nothing is in Deleted."
        dense
      />
      <SimpleActivityLogPanel searchable />
      <SimplePurchaseOrderFormModal
        open={Boolean(poId)}
        onClose={() => setPoId("")}
        mode="edit"
        initialPoId={poId}
        allowPoTypeChange={false}
      />
    </div>
  );
}
