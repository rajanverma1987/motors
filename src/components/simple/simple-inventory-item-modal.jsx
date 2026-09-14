"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { useFormatDateTime, useUserSettings } from "@/contexts/user-settings-context";
import { normalizeInventoryLocations } from "@/lib/user-settings";

const FORM_ID = "simple-inventory-item-form";
const ADD_LOCATION_FORM_ID = "simple-inventory-add-location-form";

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

function emptyForm() {
  return {
    name: "",
    sku: "",
    uom: "ea",
    onHand: "0",
    threshold: "0",
    location: "",
  };
}

function formFromItem(item) {
  if (!item) return emptyForm();
  return {
    name: String(item.name ?? ""),
    sku: String(item.sku ?? ""),
    uom: String(item.uom ?? "ea") || "ea",
    onHand: String(item.onHand ?? 0),
    threshold: String(item.threshold ?? 0),
    location: String(item.location ?? ""),
  };
}

function reservationStatusVariant(status) {
  if (status === "consumed") return "success";
  if (status === "active") return "warning";
  return "default";
}

function reservationStatusLabel(status) {
  if (status === "consumed") return "Consumed";
  if (status === "active") return "Reserved";
  if (status === "released") return "Released";
  return String(status || "-");
}

/**
 * Add / edit inventory part. Edit mode: left fields, right movement tables (vendor-style layout).
 */
export default function SimpleInventoryItemModal({
  open,
  onClose,
  item = null,
  onSaved,
  zIndex = 120,
}) {
  const alert = useAlert();
  const formatDateTime = useFormatDateTime();
  const { settings, refresh: refreshSettings } = useUserSettings();
  const isEdit = Boolean(item?.id);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPayload, setHistoryPayload] = useState(null);

  const locationOptions = useMemo(() => {
    const locs = Array.isArray(settings?.inventoryLocations) ? settings.inventoryLocations : [];
    return [{ value: "", label: "-" }, ...locs.map((l) => ({ value: l, label: l }))];
  }, [settings?.inventoryLocations]);

  const loadMovements = useCallback(
    async (itemId, filter = "all") => {
      if (!itemId) {
        setHistoryPayload(null);
        return;
      }
      setHistoryLoading(true);
      setHistoryFilter(filter);
      try {
        const params = new URLSearchParams();
        if (filter === "purchases") params.set("type", "receive_po");
        const qs = params.toString();
        const res = await fetch(
          `/api/dashboard/inventory/items/${itemId}/movements${qs ? `?${qs}` : ""}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load history");
        setHistoryPayload(data);
      } catch (e) {
        setHistoryPayload(null);
        await alert({
          title: "Error",
          message: e.message || "Could not load movement history",
          variant: "danger",
        });
      } finally {
        setHistoryLoading(false);
      }
    },
    [alert]
  );

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setAddLocationOpen(false);
      setNewLocationName("");
      setSavingLocation(false);
      setHistoryPayload(null);
      setHistoryLoading(false);
      setHistoryFilter("all");
      return;
    }
    setForm(isEdit ? formFromItem(item) : emptyForm());
    if (isEdit && item?.id) {
      void loadMovements(item.id, "all");
    }
  }, [open, isEdit, item, loadMovements]);

  const patch = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const openAddLocation = () => {
    setNewLocationName("");
    setAddLocationOpen(true);
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    const label = String(newLocationName || "").trim().slice(0, 80);
    if (!label) {
      await alert({ title: "Error", message: "Location name is required.", variant: "danger" });
      return;
    }
    const existing = normalizeInventoryLocations(settings?.inventoryLocations);
    if (existing.includes(label)) {
      patch("location", label);
      setAddLocationOpen(false);
      setNewLocationName("");
      return;
    }
    if (existing.length >= 50) {
      await alert({
        title: "Limit reached",
        message: "You can save up to 50 inventory locations.",
        variant: "danger",
      });
      return;
    }
    const next = normalizeInventoryLocations([...existing, label]);
    setSavingLocation(true);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ inventoryLocations: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save location");
      await refreshSettings();
      patch("location", label);
      setAddLocationOpen(false);
      setNewLocationName("");
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to add location",
        variant: "danger",
      });
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      await alert({ title: "Error", message: "Name is required.", variant: "danger" });
      return;
    }
    const uomToSave = String(form.uom ?? "").trim() || "ea";
    setSaving(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/dashboard/inventory/items/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            sku: form.sku,
            uom: uomToSave,
            threshold: Math.max(0, parseFloat(form.threshold) || 0),
            location: form.location,
            setOnHand: Math.max(0, parseFloat(form.onHand) || 0),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Update failed");
        await alert({ title: "Success", message: "Part updated." });
        onSaved?.(data.item || null);
        void loadMovements(item.id, historyFilter);
      } else {
        const res = await fetch("/api/dashboard/inventory/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            sku: form.sku,
            onHand: parseFloat(form.onHand) || 0,
            threshold: parseFloat(form.threshold) || 0,
            uom: uomToSave,
            location: form.location,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to create");
        await alert({ title: "Success", message: "Part added." });
        setForm(emptyForm());
        onSaved?.(data.item || null);
        onClose?.();
        return;
      }
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const historyRows = Array.isArray(historyPayload?.rows) ? historyPayload.rows : [];
  const reservationRows = Array.isArray(historyPayload?.reservations)
    ? historyPayload.reservations
    : [];

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (saving) return;
          onClose?.();
        }}
        title={isEdit ? `Inventory: ${item?.name || form.name || "Part"}` : "Add inventory part"}
        size={isEdit ? "6xl" : "lg"}
        width={isEdit ? "min(1100px, 96vw)" : "min(520px, 96vw)"}
        height={isEdit ? "min(84vh, 820px)" : undefined}
        zIndex={zIndex}
        showClose={!saving}
        closeOnOutsideClick={false}
        headerClassName="min-w-0"
        actions={
          <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || savingLocation}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <div
          className={
            isEdit
              ? "grid min-h-0 gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)]"
              : "flex flex-col gap-5"
          }
        >
          <Form
            id={FORM_ID}
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          >
            <FieldRow label="Name" labelWidth="7rem">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => patch("name", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
                aria-label="Part name"
              />
            </FieldRow>
            <FieldRow label="SKU" labelWidth="7rem">
              <input
                type="text"
                value={form.sku}
                onChange={(e) => patch("sku", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
                aria-label="SKU"
              />
            </FieldRow>
            <FieldRow label="UOM" labelWidth="7rem">
              <input
                type="text"
                value={form.uom}
                onChange={(e) => patch("uom", e.target.value)}
                className={FIELD_INPUT}
                placeholder="ea, lb, ft, box…"
                autoComplete="off"
                disabled={saving}
                aria-label="Unit of measure"
              />
            </FieldRow>
            <FieldRow label={isEdit ? "On hand" : "Starting on-hand"} labelWidth="7rem">
              <input
                type="number"
                min={0}
                step="any"
                value={form.onHand}
                onChange={(e) => patch("onHand", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
              />
            </FieldRow>
            <FieldRow label="Threshold" labelWidth="7rem">
              <input
                type="number"
                min={0}
                step="any"
                value={form.threshold}
                onChange={(e) => patch("threshold", e.target.value)}
                className={FIELD_INPUT}
                disabled={saving}
                aria-label="Low-stock threshold"
              />
            </FieldRow>
            <FieldRow label="Location" labelWidth="7rem">
              <div className="flex min-w-0 items-center gap-1.5">
                <div className="min-w-0 flex-1">
                  <SimpleSelect
                    options={locationOptions}
                    value={form.location}
                    onChange={(e) => patch("location", e.target.value ?? "")}
                    searchable
                    disabled={saving || savingLocation}
                    aria-label="Location"
                  />
                </div>
                <button
                  type="button"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-none border border-border bg-primary text-white hover:opacity-90 disabled:opacity-50"
                  title="Add location"
                  aria-label="Add location"
                  disabled={saving || savingLocation}
                  onClick={openAddLocation}
                >
                  <FiPlus className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </FieldRow>
            {isEdit ? (
              <p className="text-xs text-secondary">
                For incremental stock changes, use <span className="font-semibold text-title">±</span>{" "}
                on the table row, or set on-hand here to an absolute quantity.
              </p>
            ) : null}
          </Form>

          {isEdit ? (
            <div className="flex min-h-0 min-w-0 flex-col gap-2">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-secondary">
                  Movement history
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={historyFilter === "all" ? "primary" : "secondary"}
                    disabled={historyLoading}
                    onClick={() => item?.id && void loadMovements(item.id, "all")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={historyFilter === "purchases" ? "primary" : "secondary"}
                    disabled={historyLoading}
                    onClick={() => item?.id && void loadMovements(item.id, "purchases")}
                  >
                    Purchases
                  </Button>
                </div>
              </div>

              {historyLoading ? (
                <p className="text-xs font-medium text-secondary">Loading…</p>
              ) : historyPayload ? (
                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  {historyRows.length ? (
                    <div className="min-h-0 flex-1 overflow-auto border border-border">
                      <table className="w-full min-w-[640px] border-collapse text-sm">
                        <thead className="sticky top-0 z-[1] bg-muted/40 dark:bg-muted/20">
                          <tr className="border-b border-border text-left">
                            <th className="px-3 py-2 font-semibold text-title">When</th>
                            <th className="px-3 py-2 font-semibold text-title">Type</th>
                            <th className="px-3 py-2 text-right font-semibold text-title">Qty</th>
                            <th className="px-3 py-2 font-semibold text-title">Reference</th>
                            <th className="px-3 py-2 text-right font-semibold text-title">Balance</th>
                            <th className="px-3 py-2 font-semibold text-title">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyRows.map((r) => {
                            const ref =
                              r.poNumber ||
                              r.documentNumber ||
                              r.vendorName ||
                              r.reason ||
                              r.workOrderId ||
                              "";
                            const poHref = r.purchaseOrderId
                              ? `/dashboards?tab=purchase-orders&open=${encodeURIComponent(
                                  r.purchaseOrderId
                                )}`
                              : "";
                            const jobHref = r.simpleServiceProposalId
                              ? `/dashboards?tab=service-proposals&open=${encodeURIComponent(
                                  r.simpleServiceProposalId
                                )}`
                              : r.workOrderId
                                ? `/dashboard/work-orders?open=${encodeURIComponent(r.workOrderId)}`
                                : "";
                            return (
                              <tr key={r.id} className="border-b border-border last:border-b-0">
                                <td className="px-3 py-2 text-secondary">
                                  {r.createdAt ? formatDateTime(r.createdAt) : "-"}
                                </td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant={r.typeVariant || "default"}
                                    className="rounded-full px-2.5 py-0.5 text-xs"
                                  >
                                    {r.typeLabel || r.type}
                                  </Badge>
                                </td>
                                <td
                                  className={`px-3 py-2 text-right tabular-nums font-medium ${
                                    Number(r.qty) < 0 ? "text-danger" : "text-title"
                                  }`}
                                >
                                  {Number(r.qty) > 0 ? `+${r.qty}` : r.qty}
                                </td>
                                <td className="px-3 py-2 text-title">
                                  {poHref && ref ? (
                                    <Link
                                      href={poHref}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {ref}
                                    </Link>
                                  ) : jobHref && ref ? (
                                    <Link
                                      href={jobHref}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {ref}
                                    </Link>
                                  ) : ref ? (
                                    <span className="font-medium">{ref}</span>
                                  ) : (
                                    <span className="text-secondary">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-secondary">
                                  {r.balanceAfter == null ? "-" : r.balanceAfter}
                                </td>
                                <td
                                  className="max-w-[160px] truncate px-3 py-2 text-secondary"
                                  title={r.notes}
                                >
                                  {r.notes || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-secondary">
                      No movements recorded yet for this part.
                    </p>
                  )}

                  {historyFilter === "all" && reservationRows.length > 0 ? (
                    <div className="shrink-0">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-secondary">
                        Reservations
                      </p>
                      <div className="max-h-[28vh] overflow-auto border border-border">
                        <table className="w-full min-w-[480px] border-collapse text-sm">
                          <thead className="sticky top-0 z-[1] bg-muted/30 dark:bg-muted/15">
                            <tr className="border-b border-border text-left">
                              <th className="px-3 py-2 font-semibold text-title">Job / Quote</th>
                              <th className="px-3 py-2 text-right font-semibold text-title">Qty</th>
                              <th className="px-3 py-2 font-semibold text-title">Status</th>
                              <th className="px-3 py-2 font-semibold text-title">Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reservationRows.map((r) => (
                              <tr
                                key={r.reservationId}
                                className="border-b border-border last:border-b-0"
                              >
                                <td className="px-3 py-2 font-medium text-title">
                                  {r.documentNumber || r.quoteId || r.workOrderId || "-"}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                                <td className="px-3 py-2">
                                  <Badge
                                    variant={reservationStatusVariant(r.status)}
                                    className="rounded-full px-2.5 py-0.5 text-xs"
                                  >
                                    {reservationStatusLabel(r.status)}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 text-secondary">
                                  {r.updatedAt ? formatDateTime(r.updatedAt) : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={addLocationOpen}
        onClose={() => {
          if (savingLocation) return;
          setAddLocationOpen(false);
          setNewLocationName("");
        }}
        title="Add location"
        width="min(400px, 96vw)"
        zIndex={zIndex + 20}
        showClose={!savingLocation}
        closeOnOutsideClick={false}
        actions={
          <Button
            type="submit"
            form={ADD_LOCATION_FORM_ID}
            variant="primary"
            size="sm"
            disabled={savingLocation}
          >
            {savingLocation ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={ADD_LOCATION_FORM_ID}
          onSubmit={handleAddLocation}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <FieldRow label="Name" labelWidth="5rem">
            <input
              type="text"
              required
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              className={FIELD_INPUT}
              placeholder="e.g. Shelf A1"
              disabled={savingLocation}
              maxLength={80}
              aria-label="Location name"
              autoFocus
            />
          </FieldRow>
        </Form>
      </Modal>
    </>
  );
}
