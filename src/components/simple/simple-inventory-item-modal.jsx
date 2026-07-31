"use client";

import { useEffect, useMemo, useState } from "react";
import { FiPlus } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
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

/**
 * Add / edit inventory part — same API as classic Inventory.
 */
export default function SimpleInventoryItemModal({
  open,
  onClose,
  item = null,
  onSaved,
  zIndex = 120,
}) {
  const alert = useAlert();
  const { settings, refresh: refreshSettings } = useUserSettings();
  const isEdit = Boolean(item?.id);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [addLocationOpen, setAddLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const locationOptions = useMemo(() => {
    const locs = Array.isArray(settings?.inventoryLocations) ? settings.inventoryLocations : [];
    return [{ value: "", label: "—" }, ...locs.map((l) => ({ value: l, label: l }))];
  }, [settings?.inventoryLocations]);

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setAddLocationOpen(false);
      setNewLocationName("");
      setSavingLocation(false);
      return;
    }
    setForm(isEdit ? formFromItem(item) : emptyForm());
  }, [open, isEdit, item]);

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
        onSaved?.();
        return;
      }
      onSaved?.();
      onClose?.();
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

  return (
    <>
    <Modal
      open={open}
      onClose={() => {
        if (saving) return;
        onClose?.();
      }}
      title={isEdit ? "Edit inventory part" : "Add inventory part"}
      size="lg"
      width="min(520px, 96vw)"
      zIndex={zIndex}
      showClose={!saving}
      closeOnOutsideClick={false}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || savingLocation}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Save"}
        </Button>
      }
    >
      <Form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
      >
        <FieldRow label="Name">
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
        <FieldRow label="SKU">
          <input
            type="text"
            value={form.sku}
            onChange={(e) => patch("sku", e.target.value)}
            className={FIELD_INPUT}
            disabled={saving}
            aria-label="SKU"
          />
        </FieldRow>
        <FieldRow label="UOM">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FieldRow label={isEdit ? "On hand" : "Starting on-hand"} labelWidth="8rem">
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
          <FieldRow label="Threshold" labelWidth="6.5rem">
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
        </div>
        <FieldRow label="Location">
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
            For incremental changes, use <span className="font-semibold text-title">±</span> on the
            table row, or set on-hand here to an absolute quantity.
          </p>
        ) : null}
      </Form>
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
