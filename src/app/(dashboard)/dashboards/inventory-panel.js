"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiEdit2, FiPlus, FiX } from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleInventoryItemModal from "@/components/simple/simple-inventory-item-modal";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";
import { useSimpleOpenParam } from "@/hooks/use-simple-open-param";
import { SIMPLE_SCREEN_TABLE_WRAP_CLASS } from "@/lib/simple-screen-ui";

const ADJUST_FORM_ID = "simple-inventory-adjust-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";

function FieldRow({ label, labelWidth = "8rem", children }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function usageStatusVariant(status) {
  if (status === "consumed") return "success";
  if (status === "active") return "warning";
  return "default";
}

function usageStatusLabel(status) {
  if (status === "consumed") return "Consumed";
  if (status === "active") return "Reserved";
  if (status === "released") return "Released";
  return String(status || "—");
}

export default function InventoryPanel() {
  const alert = useAlert();
  const confirm = useConfirm();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [usageFor, setUsageFor] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePayload, setUsagePayload] = useState(null);

  const load = useCallback(
    async ({ showError = true } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (tableSort?.key) {
          params.set("sortBy", tableSort.key);
          params.set("sortDir", tableSort.direction || "asc");
        }
        const res = await fetch(`/api/dashboard/inventory/items?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load inventory");
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalCount(Number(data.totalCount) || 0);
      } catch (e) {
        setItems([]);
        setTotalCount(0);
        if (showError) {
          await alert({
            title: "Error",
            message: e.message || "Could not load inventory",
            variant: "danger",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [alert, page, pageSize, searchQuery, tableSort]
  );

  useEffect(() => {
    void load({ showError: false });
  }, [load]);

  const displayRows = items;

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setItemModalOpen(true);
  }, []);

  const openEdit = useCallback((row) => {
    setEditingItem(row);
    setItemModalOpen(true);
  }, []);

  useSimpleOpenParam({
    ready: !loading,
    onOpen: useCallback(
      (openId) => {
        const row = items.find((r) => String(r.id) === openId);
        if (row) openEdit(row);
        return true;
      },
      [items, openEdit]
    ),
  });

  const closeUsage = useCallback(() => {
    setUsageFor(null);
    setUsagePayload(null);
    setUsageLoading(false);
  }, []);

  const openUsage = useCallback(
    async (row) => {
      setUsageFor(row);
      setUsagePayload(null);
      setUsageLoading(true);
      try {
        const res = await fetch(`/api/dashboard/inventory/items/${row.id}/usage`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load usage");
        setUsagePayload(data);
      } catch (e) {
        await alert({
          title: "Error",
          message: e.message || "Could not load usage",
          variant: "danger",
        });
        closeUsage();
      } finally {
        setUsageLoading(false);
      }
    },
    [alert, closeUsage]
  );

  const handleDelete = useCallback(
    async (row) => {
      const onHand = Number(row?.onHand) || 0;
      if (onHand > 0) {
        await alert({
          title: "Cannot delete",
          message: "Set on-hand quantity to 0 before deleting this part.",
          variant: "danger",
        });
        return;
      }
      const label = row?.name || row?.sku || "this part";
      const ok = await confirm({
        title: "Delete inventory part",
        message: `Permanently delete “${label}”? Reservations and PO links are not removed automatically.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/inventory/items/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
        await alert({ title: "Deleted", message: "Part deleted." });
        void load();
      } catch (e) {
        await alert({
          title: "Error",
          message: e.message || "Delete failed",
          variant: "danger",
        });
      }
    },
    [alert, confirm, load]
  );

  const applyAdjust = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!adjustItem) return;
      const d = parseFloat(adjustDelta);
      if (!Number.isFinite(d) || d === 0) {
        await alert({
          title: "Error",
          message: "Enter a non-zero adjustment.",
          variant: "danger",
        });
        return;
      }
      setAdjustSaving(true);
      try {
        const res = await fetch(`/api/dashboard/inventory/items/${adjustItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ onHandDelta: d }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Update failed");
        await alert({ title: "Success", message: "Stock updated." });
        setAdjustItem(null);
        setAdjustDelta("");
        void load();
      } catch (err) {
        await alert({
          title: "Error",
          message: err.message || "Failed",
          variant: "danger",
        });
      } finally {
        setAdjustSaving(false);
      }
    },
    [adjustDelta, adjustItem, alert, load]
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
        key: "name",
        label: "Part",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="max-w-[220px] truncate text-left font-medium text-primary hover:underline"
            title={v ? String(v) : ""}
            onClick={(e) => {
              e.stopPropagation();
              void openUsage(row);
            }}
          >
            {v || "—"}
          </button>
        ),
      },
      { key: "sku", label: "SKU", sortable: true },
      {
        key: "uom",
        label: "UOM",
        sortable: true,
        render: (v) => v || "ea",
      },
      {
        key: "onHand",
        label: "On hand",
        sortable: true,
        align: "right",
        render: (_, row) => (
          <span className="inline-flex items-center justify-end gap-2 tabular-nums">
            <span>{row.onHand}</span>
            <button
              type="button"
              className="rounded-none border border-border bg-card px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
              title="Adjust stock"
              aria-label="Adjust stock"
              onClick={(e) => {
                e.stopPropagation();
                setAdjustItem(row);
                setAdjustDelta("");
              }}
            >
              ±
            </button>
          </span>
        ),
      },
      {
        key: "reserved",
        label: "Reserved",
        sortable: true,
        align: "right",
        render: (v) => <span className="tabular-nums text-secondary">{v}</span>,
      },
      {
        key: "available",
        label: "Available",
        sortable: true,
        align: "right",
        render: (v, row) => {
          const avail = Number(v) || 0;
          const low = row.threshold > 0 && avail <= row.threshold;
          return (
            <span
              className={`tabular-nums font-medium ${
                low ? "text-amber-600 dark:text-amber-400" : "text-title"
              }`}
            >
              {avail}
            </span>
          );
        },
      },
      {
        key: "threshold",
        label: "Threshold",
        sortable: true,
        align: "right",
        render: (v) => <span className="tabular-nums">{v}</span>,
      },
      { key: "location", label: "Location", sortable: true },
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
              void handleDelete(row);
            }}
          >
            <FiX className="h-3.5 w-3.5" aria-hidden />
          </button>
        ),
      },
    ],
    [handleDelete, openEdit, openUsage]
  );

  return (
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
        searchPlaceholder="Search part, SKU, UOM, location, qty…"
        sortState={tableSort}
        onSort={(key, direction) => {
          setPage(1);
          setTableSort({ key, direction });
        }}
        onRefresh={load}
        toolbarBeforeSearch={
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-9 !rounded-none px-2.5"
            onClick={openCreate}
          >
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add New
          </Button>
        }
        emptyMessage={
          totalCount === 0
            ? searchQuery.trim()
              ? "No parts match your search."
              : "No parts yet. Click Add New, or receive stock on a vendor PO."
            : "No parts yet. Click Add New, or receive stock on a vendor PO."
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

      <SimpleInventoryItemModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        item={editingItem}
        onSaved={() => void load()}
      />

      <Modal
        open={!!adjustItem}
        onClose={() => {
          if (adjustSaving) return;
          setAdjustItem(null);
          setAdjustDelta("");
        }}
        title={adjustItem ? `Adjust stock — ${adjustItem.name}` : "Adjust"}
        width="min(420px, 96vw)"
        zIndex={125}
        showClose={!adjustSaving}
        closeOnOutsideClick={false}
        actions={
          <Button
            type="submit"
            form={ADJUST_FORM_ID}
            variant="primary"
            size="sm"
            disabled={adjustSaving}
          >
            {adjustSaving ? "Saving…" : "Apply"}
          </Button>
        }
      >
        <Form
          id={ADJUST_FORM_ID}
          onSubmit={applyAdjust}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <p className="text-sm text-secondary">
            Current on-hand:{" "}
            <span className="font-semibold text-title">{adjustItem?.onHand ?? "—"}</span>. Use
            positive to receive, negative to remove.
          </p>
          <FieldRow label="Adjustment">
            <input
              type="number"
              step="any"
              value={adjustDelta}
              onChange={(e) => setAdjustDelta(e.target.value)}
              className={FIELD_INPUT}
              placeholder="e.g. 5 or -2"
              disabled={adjustSaving}
              aria-label="Adjustment quantity"
            />
          </FieldRow>
        </Form>
      </Modal>

      <Modal
        open={!!usageFor}
        onClose={closeUsage}
        title={usageFor ? `Movement history — ${usageFor.name}` : "Movement history"}
        size="4xl"
        zIndex={125}
        headerClassName="min-w-0"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={closeUsage}>
            Close
          </Button>
        }
      >
        {usageLoading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : usagePayload?.rows?.length ? (
          <div className="overflow-x-auto border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left dark:bg-muted/15">
                  <th className="px-3 py-2 font-semibold text-title">Job#</th>
                  <th className="px-3 py-2 text-right font-semibold text-title">Qty</th>
                  <th className="px-3 py-2 font-semibold text-title">Status</th>
                  <th className="px-3 py-2 font-semibold text-title">Reserved</th>
                  <th className="px-3 py-2 font-semibold text-title">Used (consumed)</th>
                </tr>
              </thead>
              <tbody>
                {usagePayload.rows.map((r) => {
                  const jobLabel = String(r.jobNumber || r.workOrderNumber || r.quoteRfqNumber || "").trim();
                  return (
                    <tr key={r.reservationId} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2 text-title">
                        {r.workOrderId ? (
                          <Link
                            href={`/dashboard/work-orders?open=${encodeURIComponent(r.workOrderId)}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {jobLabel || r.workOrderId}
                          </Link>
                        ) : jobLabel ? (
                          <span className="font-medium tabular-nums text-title">{jobLabel}</span>
                        ) : (
                          <span className="text-secondary">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-title">
                        {r.qty}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={usageStatusVariant(r.status)}
                          className="rounded-full px-2.5 py-0.5 text-xs"
                        >
                          {usageStatusLabel(r.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-secondary">
                        {r.reservedAt ? new Date(r.reservedAt).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 text-secondary">
                        {r.usedAt ? new Date(r.usedAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : usagePayload ? (
          <p className="text-sm text-secondary">
            No movement history for this part yet. Add it on a Service Proposal via{" "}
            <span className="font-semibold text-title">Add From Inventory</span>, save as a{" "}
            <span className="font-semibold text-title">JOB</span> to reserve, then set Job Status to{" "}
            <span className="font-semibold text-title">Shipped</span> to consume.
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
