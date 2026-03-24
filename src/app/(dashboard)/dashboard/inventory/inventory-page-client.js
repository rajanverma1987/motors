"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import { FiRefreshCw, FiPlus } from "react-icons/fi";

export default function InventoryPageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const { settings, refresh: refreshSettings } = useUserSettings();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [saving, setSaving] = useState(false);
  const [usageFor, setUsageFor] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usagePayload, setUsagePayload] = useState(null);

  const [newName, setNewName] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newOnHand, setNewOnHand] = useState("0");
  const [newThreshold, setNewThreshold] = useState("0");
  const [newUom, setNewUom] = useState("ea");
  const [newLocation, setNewLocation] = useState("");

  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editOnHand, setEditOnHand] = useState("0");
  const [editThreshold, setEditThreshold] = useState("0");
  const [editUom, setEditUom] = useState("ea");
  const [editLocation, setEditLocation] = useState("");

  const locationOptions = useMemo(() => {
    const locs = Array.isArray(settings?.inventoryLocations) ? settings.inventoryLocations : [];
    return [{ value: "", label: "—" }, ...locs.map((l) => ({ value: l, label: l }))];
  }, [settings?.inventoryLocations]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/inventory/items", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Could not load inventory");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = [row.name, row.sku, row.uom, row.location, String(row.onHand), String(row.available)]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [items, searchQuery]);

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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load usage");
        setUsagePayload(data);
      } catch (e) {
        toast.error(e.message || "Could not load usage");
        closeUsage();
      } finally {
        setUsageLoading(false);
      }
    },
    [toast, closeUsage]
  );

  const openEdit = useCallback((row) => {
    setEditingId(row.id);
    setEditName(row.name ?? "");
    setEditSku(row.sku ?? "");
    setEditUom(row.uom ?? "ea");
    setEditOnHand(String(row.onHand ?? 0));
    setEditThreshold(String(row.threshold ?? 0));
    setEditLocation(row.location ?? "");
    setEditOpen(true);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditingId(null);
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error("Name is required.");
      return;
    }
    const uomToSave = String(newUom ?? "").trim() || "ea";
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newName.trim(),
          sku: newSku,
          onHand: parseFloat(newOnHand) || 0,
          threshold: parseFloat(newThreshold) || 0,
          uom: uomToSave,
          location: newLocation,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Part added.");
      setCreateOpen(false);
      setNewName("");
      setNewSku("");
      setNewOnHand("0");
      setNewThreshold("0");
      setNewUom("ea");
      setNewLocation("");
      load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    if (!editingId || !editName.trim()) {
      toast.error("Name is required.");
      return;
    }
    const uomToSave = String(editUom ?? "").trim() || "ea";
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/inventory/items/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: editName.trim(),
          sku: editSku,
          uom: uomToSave,
          threshold: Math.max(0, parseFloat(editThreshold) || 0),
          location: editLocation,
          setOnHand: Math.max(0, parseFloat(editOnHand) || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      toast.success("Part updated.");
      closeEdit();
      load();
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function patchItem(id, patch) {
    const res = await fetch(`/api/dashboard/inventory/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
    return data.item;
  }

  const handleDeleteRow = useCallback(
    async (row) => {
      const onHand = Number(row?.onHand) || 0;
      if (onHand > 0) {
        toast.error("Set on-hand quantity to 0 before deleting this part.");
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
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Delete failed");
        toast.success("Deleted.");
        load();
      } catch (e) {
        toast.error(e.message || "Delete failed");
      }
    },
    [confirm, toast, load]
  );

  async function applyAdjust() {
    if (!adjustItem) return;
    const d = parseFloat(adjustDelta);
    if (!Number.isFinite(d) || d === 0) {
      toast.error("Enter a non-zero adjustment.");
      return;
    }
    setSaving(true);
    try {
      await patchItem(adjustItem.id, { onHandDelta: d });
      toast.success("Stock updated.");
      setAdjustItem(null);
      setAdjustDelta("");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Part",
        render: (v, row) => (
          <button
            type="button"
            className="max-w-[220px] truncate text-left font-medium text-primary hover:underline"
            title={v ? String(v) : ""}
            onClick={(e) => {
              e.stopPropagation();
              openUsage(row);
            }}
          >
            {v || "—"}
          </button>
        ),
      },
      { key: "sku", label: "SKU" },
      { key: "uom", label: "UOM", render: (v) => v || "ea" },
      {
        key: "onHand",
        label: "On hand",
        align: "right",
        render: (_, row) => (
          <span className="inline-flex items-center justify-end gap-2 tabular-nums">
            <span>{row.onHand}</span>
            <button
              type="button"
              className="rounded border border-border bg-card px-1.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/10"
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
        align: "right",
        render: (v) => <span className="tabular-nums text-secondary">{v}</span>,
      },
      {
        key: "available",
        label: "Available",
        align: "right",
        render: (v, row) => {
          const avail = Number(v) || 0;
          const low = row.threshold > 0 && avail <= row.threshold;
          return (
            <span
              className={`tabular-nums font-medium ${low ? "text-amber-600 dark:text-amber-400" : "text-title"}`}
            >
              {avail}
            </span>
          );
        },
      },
      {
        key: "threshold",
        label: "Threshold",
        align: "right",
        render: (v) => <span className="tabular-nums">{v}</span>,
      },
      { key: "location", label: "Location" },
    ],
    [openUsage]
  );

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

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="mb-4 shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-bold text-title">Inventory</h1>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading}>
              <FiRefreshCw className={`mr-1.5 h-4 w-4 inline ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
              <FiPlus className="mr-1.5 h-4 w-4 inline" />
              Add part
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-secondary">
          On-hand and reserved quantities. Reserved parts are tied to a work order from a quote until the job is{" "}
          <strong className="text-title">Shipped</strong>. Set location labels in{" "}
          <Link href="/dashboard/settings" className="text-primary underline" onClick={() => refreshSettings()}>
            Settings → Inventory
          </Link>
          .
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredItems}
          rowKey="id"
          loading={loading}
          fillHeight
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search part, SKU, UOM, location, qty…"
          onRefresh={load}
          onEdit={(row) => openEdit(row)}
          onDelete={handleDeleteRow}
          emptyMessage={
            items.length === 0
              ? "No parts yet. Use Add part or receive on a vendor PO in Logistics."
              : "No parts match your search."
          }
        />
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add inventory part" actions={null}>
        <form id="inv-create-form" onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <Input label="SKU" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
          <Input
            id="inv-create-uom"
            name="inventory-uom"
            label="UOM"
            value={newUom}
            onChange={(e) => setNewUom(e.target.value)}
            placeholder="ea, lb, ft, box…"
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starting on-hand"
              type="number"
              min={0}
              step="any"
              value={newOnHand}
              onChange={(e) => setNewOnHand(e.target.value)}
            />
            <Input
              label="Low-stock threshold"
              type="number"
              min={0}
              step="any"
              value={newThreshold}
              onChange={(e) => setNewThreshold(e.target.value)}
            />
          </div>
          <Select
            label="Location"
            options={locationOptions}
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value ?? "")}
            placeholder="Optional"
            searchable
          />
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={closeEdit} title="Edit inventory part" actions={null}>
        <form id="inv-edit-form" onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
          <Input label="SKU" value={editSku} onChange={(e) => setEditSku(e.target.value)} />
          <Input
            id="inv-edit-uom"
            name="inventory-uom"
            label="UOM"
            value={editUom}
            onChange={(e) => setEditUom(e.target.value)}
            placeholder="ea, lb, ft, box…"
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="On hand"
              type="number"
              min={0}
              step="any"
              value={editOnHand}
              onChange={(e) => setEditOnHand(e.target.value)}
            />
            <Input
              label="Low-stock threshold"
              type="number"
              min={0}
              step="any"
              value={editThreshold}
              onChange={(e) => setEditThreshold(e.target.value)}
            />
          </div>
          <Select
            label="Location"
            options={locationOptions}
            value={editLocation}
            onChange={(e) => setEditLocation(e.target.value ?? "")}
            placeholder="Optional"
            searchable
          />
          <p className="text-xs text-secondary">
            For incremental changes (receive/shrink), use <strong className="text-title">±</strong> on the row or set
            on-hand here to an absolute quantity.
          </p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!usageFor}
        onClose={closeUsage}
        title={usageFor ? `Work order usage — ${usageFor.name}` : "Usage"}
        size="4xl"
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
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left dark:bg-muted/15">
                  <th className="px-3 py-2 font-semibold text-title">Work order</th>
                  <th className="px-3 py-2 font-semibold text-title">RFQ</th>
                  <th className="px-3 py-2 text-right font-semibold text-title">Qty</th>
                  <th className="px-3 py-2 font-semibold text-title">Status</th>
                  <th className="px-3 py-2 font-semibold text-title">Reserved</th>
                  <th className="px-3 py-2 font-semibold text-title">Used (consumed)</th>
                </tr>
              </thead>
              <tbody>
                {usagePayload.rows.map((r) => (
                  <tr key={r.reservationId} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2 text-title">
                      {r.workOrderId ? (
                        <Link
                          href={`/dashboard/work-orders?open=${encodeURIComponent(r.workOrderId)}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {r.workOrderNumber || r.workOrderId}
                        </Link>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-secondary">{r.quoteRfqNumber || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium text-title">{r.qty}</td>
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
                ))}
              </tbody>
            </table>
          </div>
        ) : usagePayload ? (
          <p className="text-sm text-secondary">
            No work order usage for this part yet. Link the part on a quote, create a work order to reserve stock, then
            mark an order <strong className="text-title">Shipped</strong> to record consumption here.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={!!adjustItem}
        onClose={() => {
          setAdjustItem(null);
          setAdjustDelta("");
        }}
        title={adjustItem ? `Adjust stock — ${adjustItem.name}` : "Adjust"}
        actions={
          <>
            <Button type="button" variant="primary" size="sm" disabled={saving} onClick={applyAdjust}>
              Apply
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-secondary">
          Current on-hand: <strong className="text-title">{adjustItem?.onHand ?? "—"}</strong>. Use positive to receive,
          negative to remove (e.g. shrink).
        </p>
        <Input
          label="Adjustment (+/− qty)"
          type="number"
          step="any"
          value={adjustDelta}
          onChange={(e) => setAdjustDelta(e.target.value)}
          placeholder="e.g. 5 or -2"
        />
      </Modal>

      <div className="shrink-0 border-t border-border pb-8 pt-4">
        <FormSectionTitle as="h2" className="text-base">
          Reports
        </FormSectionTitle>
        <p className="text-sm text-secondary">
          Open <Link href="/dashboard/reports" className="text-primary underline">Reports</Link> for period summaries
          and low-stock counts.
        </p>
      </div>
    </div>
  );
}
