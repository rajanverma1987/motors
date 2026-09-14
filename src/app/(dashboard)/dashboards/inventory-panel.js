"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPlus, FiRotateCcw, FiTool, FiX } from "react-icons/fi";
import Table from "@/components/ui/table";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleInventoryItemModal from "@/components/simple/simple-inventory-item-modal";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";
import { useSimpleOpenParam } from "@/hooks/use-simple-open-param";
import { SIMPLE_SCREEN_TABLE_WRAP_CLASS } from "@/lib/simple-screen-ui";

const ADJUST_FORM_ID = "simple-inventory-adjust-form";
const ISSUE_FORM_ID = "simple-inventory-issue-form";
const RETURN_FORM_ID = "simple-inventory-return-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const TOOLBAR_BTN = "h-9 !rounded-none px-2.5";

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
  const [selectedIds, setSelectedIds] = useState([]);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueItems, setIssueItems] = useState([]);
  const [issueQtys, setIssueQtys] = useState({});
  const [issueReason, setIssueReason] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueSaving, setIssueSaving] = useState(false);

  const [returnOpen, setReturnOpen] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnQtys, setReturnQtys] = useState({});
  const [returnNotes, setReturnNotes] = useState("");
  const [returnSaving, setReturnSaving] = useState(false);

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

  const selectedRows = useMemo(() => {
    const set = new Set(selectedIds.map(String));
    return items.filter((r) => set.has(String(r.id)));
  }, [items, selectedIds]);

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

  const requireSelection = useCallback(
    async (minCount = 1) => {
      if (selectedRows.length < minCount) {
        await alert({
          title: "Select parts",
          message: "Select at least one part in the table first.",
          variant: "danger",
        });
        return null;
      }
      return selectedRows;
    },
    [alert, selectedRows]
  );

  const openIssue = useCallback(async () => {
    const rows = await requireSelection(1);
    if (!rows) return;
    const qtys = {};
    for (const row of rows) qtys[String(row.id)] = "";
    setIssueItems(rows);
    setIssueQtys(qtys);
    setIssueReason("");
    setIssueNotes("");
    setIssueOpen(true);
  }, [requireSelection]);

  const openReturn = useCallback(async () => {
    const rows = await requireSelection(1);
    if (!rows) return;
    const qtys = {};
    for (const row of rows) qtys[String(row.id)] = "";
    setReturnItems(rows);
    setReturnQtys(qtys);
    setReturnNotes("");
    setReturnOpen(true);
  }, [requireSelection]);

  const handleDeleteSelected = useCallback(async () => {
    const rows = await requireSelection(1);
    if (!rows) return;
    const blocked = rows.filter((r) => (Number(r.onHand) || 0) > 0);
    const deletable = rows.filter((r) => (Number(r.onHand) || 0) <= 0);
    if (deletable.length === 0) {
      await alert({
        title: "Cannot delete",
        message: "Set on-hand quantity to 0 before deleting selected parts.",
        variant: "danger",
      });
      return;
    }
    const ok = await confirm({
      title: deletable.length === 1 ? "Delete inventory part" : "Delete inventory parts",
      message:
        deletable.length === 1
          ? `Permanently delete "${deletable[0].name || deletable[0].sku || "this part"}"?${
              blocked.length
                ? ` ${blocked.length} selected part(s) with on-hand stock will be skipped.`
                : ""
            }`
          : `Permanently delete ${deletable.length} part(s)?${
              blocked.length
                ? ` ${blocked.length} selected part(s) with on-hand stock will be skipped.`
                : ""
            }`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    const errors = [];
    for (const row of deletable) {
      try {
        const res = await fetch(`/api/dashboard/inventory/items/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
      } catch (e) {
        errors.push(`${row.name || row.sku || row.id}: ${e.message || "Failed"}`);
      }
    }
    setSelectedIds([]);
    void load();
    if (errors.length) {
      await alert({
        title: "Some deletes failed",
        message: errors.join("\n"),
        variant: "danger",
      });
      return;
    }
    await alert({
      title: "Deleted",
      message: deletable.length === 1 ? "Part deleted." : `${deletable.length} parts deleted.`,
    });
  }, [alert, confirm, load, requireSelection]);

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
          body: JSON.stringify({
            onHandDelta: d,
            reason: adjustReason.trim() || "adjust",
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Update failed");
        await alert({ title: "Success", message: "Stock updated." });
        setAdjustItem(null);
        setAdjustDelta("");
        setAdjustReason("");
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
    [adjustDelta, adjustItem, adjustReason, alert, load]
  );

  const applyIssue = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!issueItems.length) return;

      const lines = [];
      for (const row of issueItems) {
        const qty = parseFloat(issueQtys[String(row.id)] ?? "");
        if (!Number.isFinite(qty) || qty <= 0) {
          await alert({
            title: "Quantity required",
            message: `Enter a quantity greater than zero for "${row.name || row.sku || "part"}".`,
            variant: "danger",
          });
          return;
        }
        lines.push({ row, qty });
      }

      setIssueSaving(true);
      const errors = [];
      try {
        for (const { row, qty } of lines) {
          try {
            const res = await fetch(`/api/dashboard/inventory/items/${row.id}/issue`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                target: "shop",
                qty,
                reason: issueReason.trim(),
                notes: issueNotes.trim(),
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Issue failed");
          } catch (err) {
            errors.push(`${row.name || row.sku || row.id}: ${err.message || "Failed"}`);
          }
        }
        if (errors.length) {
          await alert({
            title: errors.length === lines.length ? "Issue failed" : "Some issues failed",
            message: errors.join("\n"),
            variant: "danger",
          });
        } else {
          await alert({
            title: "Success",
            message: lines.length === 1 ? "Stock issued." : `${lines.length} parts issued.`,
          });
        }
        setIssueOpen(false);
        setIssueItems([]);
        setSelectedIds([]);
        void load();
      } finally {
        setIssueSaving(false);
      }
    },
    [alert, issueItems, issueNotes, issueQtys, issueReason, load]
  );

  const applyReturn = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (!returnItems.length) return;

      const lines = [];
      for (const row of returnItems) {
        const qty = parseFloat(returnQtys[String(row.id)] ?? "");
        if (!Number.isFinite(qty) || qty <= 0) {
          await alert({
            title: "Quantity required",
            message: `Enter a quantity greater than zero for "${row.name || row.sku || "part"}".`,
            variant: "danger",
          });
          return;
        }
        lines.push({ row, qty });
      }

      setReturnSaving(true);
      const errors = [];
      try {
        for (const { row, qty } of lines) {
          try {
            const res = await fetch(`/api/dashboard/inventory/items/${row.id}/return`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                qty,
                notes: returnNotes.trim(),
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Return failed");
          } catch (err) {
            errors.push(`${row.name || row.sku || row.id}: ${err.message || "Failed"}`);
          }
        }
        if (errors.length) {
          await alert({
            title: errors.length === lines.length ? "Return failed" : "Some returns failed",
            message: errors.join("\n"),
            variant: "danger",
          });
        } else {
          await alert({
            title: "Success",
            message: lines.length === 1 ? "Stock returned." : `${lines.length} parts returned.`,
          });
        }
        setReturnOpen(false);
        setReturnItems([]);
        setSelectedIds([]);
        void load();
      } finally {
        setReturnSaving(false);
      }
    },
    [alert, load, returnItems, returnNotes, returnQtys]
  );

  const columns = useMemo(
    () => [
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
              openEdit(row);
            }}
          >
            {v || "-"}
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
                setAdjustReason("");
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
    ],
    [openEdit]
  );

  const hasSelection = selectedIds.length > 0;

  return (
    <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
      <Table
        columns={columns}
        data={displayRows}
        rowKey="id"
        loading={loading}
        searchable
        selectable
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
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
        columnSettingsKey="simple-inventory"
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
        toolbarAfterRefresh={
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={TOOLBAR_BTN}
              disabled={!hasSelection}
              onClick={() => void openIssue()}
            >
              <FiTool className="h-4 w-4 shrink-0" aria-hidden />
              Issue inventory
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={TOOLBAR_BTN}
              disabled={!hasSelection}
              onClick={() => void openReturn()}
            >
              <FiRotateCcw className="h-4 w-4 shrink-0" aria-hidden />
              Return
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              className={TOOLBAR_BTN}
              disabled={!hasSelection}
              onClick={() => void handleDeleteSelected()}
            >
              <FiX className="h-4 w-4 shrink-0" aria-hidden />
              Delete
            </Button>
          </div>
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
        stickyColumns
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
        onSaved={(saved) => {
          if (saved?.id) setEditingItem((prev) => ({ ...(prev || {}), ...saved }));
          void load();
        }}
      />

      <Modal
        open={!!adjustItem}
        onClose={() => {
          if (adjustSaving) return;
          setAdjustItem(null);
          setAdjustDelta("");
          setAdjustReason("");
        }}
        title={adjustItem ? `Adjust stock: ${adjustItem.name}` : "Adjust"}
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
            <span className="font-semibold text-title">{adjustItem?.onHand ?? "-"}</span>. Use
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
          <FieldRow label="Reason">
            <input
              type="text"
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              className={FIELD_INPUT}
              placeholder="Optional note"
              disabled={adjustSaving}
              aria-label="Adjust reason"
            />
          </FieldRow>
        </Form>
      </Modal>

      <Modal
        open={issueOpen}
        onClose={() => {
          if (issueSaving) return;
          setIssueOpen(false);
          setIssueItems([]);
        }}
        title={`Issue inventory (${issueItems.length})`}
        width="min(560px, 96vw)"
        zIndex={125}
        showClose={!issueSaving}
        closeOnOutsideClick={false}
        actions={
          <Button
            type="submit"
            form={ISSUE_FORM_ID}
            variant="primary"
            size="sm"
            disabled={issueSaving}
          >
            {issueSaving ? "Issuing…" : "Issue"}
          </Button>
        }
      >
        <Form
          id={ISSUE_FORM_ID}
          onSubmit={applyIssue}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <FieldRow label="Reason">
            <input
              type="text"
              value={issueReason}
              onChange={(e) => setIssueReason(e.target.value)}
              className={FIELD_INPUT}
              placeholder="Shop use / department"
              disabled={issueSaving}
              aria-label="Issue reason"
            />
          </FieldRow>
          <FieldRow label="Notes">
            <input
              type="text"
              value={issueNotes}
              onChange={(e) => setIssueNotes(e.target.value)}
              className={FIELD_INPUT}
              disabled={issueSaving}
              aria-label="Issue notes"
            />
          </FieldRow>
          <div className="overflow-x-auto border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left dark:bg-muted/15">
                  <th className="px-2 py-1.5 font-semibold text-title">Part</th>
                  <th className="w-20 px-2 py-1.5 text-right font-semibold text-title">Avail</th>
                  <th className="w-28 px-2 py-1.5 font-semibold text-title">Qty</th>
                </tr>
              </thead>
              <tbody>
                {issueItems.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-title">{row.name || "-"}</div>
                      {row.sku ? <div className="text-xs text-secondary">SKU: {row.sku}</div> : null}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                      {row.available ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={issueQtys[String(row.id)] ?? ""}
                        onChange={(e) =>
                          setIssueQtys((prev) => ({ ...prev, [String(row.id)]: e.target.value }))
                        }
                        className={FIELD_INPUT}
                        disabled={issueSaving}
                        aria-label={`Issue qty for ${row.name || "part"}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Form>
      </Modal>

      <Modal
        open={returnOpen}
        onClose={() => {
          if (returnSaving) return;
          setReturnOpen(false);
          setReturnItems([]);
        }}
        title={`Return to stock (${returnItems.length})`}
        width="min(560px, 96vw)"
        zIndex={125}
        showClose={!returnSaving}
        closeOnOutsideClick={false}
        actions={
          <Button
            type="submit"
            form={RETURN_FORM_ID}
            variant="primary"
            size="sm"
            disabled={returnSaving}
          >
            {returnSaving ? "Returning…" : "Return"}
          </Button>
        }
      >
        <Form
          id={RETURN_FORM_ID}
          onSubmit={applyReturn}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <FieldRow label="Notes">
            <input
              type="text"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className={FIELD_INPUT}
              disabled={returnSaving}
              aria-label="Return notes"
            />
          </FieldRow>
          <div className="overflow-x-auto border border-border">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left dark:bg-muted/15">
                  <th className="px-2 py-1.5 font-semibold text-title">Part</th>
                  <th className="w-24 px-2 py-1.5 text-right font-semibold text-title">On hand</th>
                  <th className="w-28 px-2 py-1.5 font-semibold text-title">Qty</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-title">{row.name || "-"}</div>
                      {row.sku ? <div className="text-xs text-secondary">SKU: {row.sku}</div> : null}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-secondary">
                      {row.onHand ?? "-"}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={returnQtys[String(row.id)] ?? ""}
                        onChange={(e) =>
                          setReturnQtys((prev) => ({ ...prev, [String(row.id)]: e.target.value }))
                        }
                        className={FIELD_INPUT}
                        disabled={returnSaving}
                        aria-label={`Return qty for ${row.name || "part"}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
