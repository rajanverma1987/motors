"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  normalizeCirMillsUnit,
} from "@/lib/platform-cir-mills";
import { clearCirMillsSessionCatalogs } from "@/lib/cir-mills-session-cache";

const FORM_ID = "admin-cir-mills-form";

export default function AdminCirMillsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState(CIR_MILLS_UNIT_AWG);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [unit, setUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [size, setSize] = useState("");
  const [circularMills, setCircularMills] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/cir-mills?unit=${encodeURIComponent(normalizeCirMillsUnit(unitFilter))}`,
        { credentials: "include", cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      toast.error(e.message || "Could not load Cir Mills");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast, unitFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setUnit(unitFilter);
    setSize("");
    setCircularMills("");
    setEditOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setUnit(normalizeCirMillsUnit(row.unit));
    setSize(String(row.size || ""));
    setCircularMills(String(row.circularMills ?? ""));
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        unit: normalizeCirMillsUnit(unit),
        size: size.trim(),
        circularMills: Number(String(circularMills).replace(/,/g, "")),
      };
      const res = await fetch("/api/admin/cir-mills", {
        method: editing?.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing?.id ? { id: editing.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setEditOpen(false);
      clearCirMillsSessionCatalogs();
      await load();
      toast.success(editing?.id ? "Updated." : "Added.");
    } catch (err) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: "Delete wire size?",
      message: `Remove ${String(row.unit || "").toUpperCase()} size ${row.size} (${row.circularMills} CM) from the shared Cir Mills table?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/cir-mills?id=${encodeURIComponent(row.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      clearCirMillsSessionCatalogs();
      await load();
      toast.success("Deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete");
    }
  };

  const handleResetDefaults = async () => {
    const ok = await confirm({
      title: "Reset to defaults?",
      message:
        "This replaces both AWG and Metric Cir Mills tables with bundled defaults. Continue?",
      confirmLabel: "Reset",
      variant: "danger",
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: "Confirm reset",
      message: "This cannot be undone. Reset Cir Mills (AWG + Metric) to defaults?",
      confirmLabel: "Reset all",
      variant: "danger",
    });
    if (!ok2) return;
    try {
      const res = await fetch("/api/admin/cir-mills", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-defaults" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");
      clearCirMillsSessionCatalogs();
      await load();
      toast.success("Cir Mills reset to AWG + Metric defaults.");
    } catch (err) {
      toast.error(err.message || "Could not reset");
    }
  };

  const sizeLabel = unitFilter === CIR_MILLS_UNIT_METRIC ? "Wire size (mm)" : "Wire size (AWG)";

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1.5 text-primary hover:bg-primary/10"
              title="Edit"
              aria-label="Edit"
              onClick={() => openEdit(row)}
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-danger hover:bg-danger/10"
              title="Delete"
              aria-label="Delete"
              onClick={() => handleDelete(row)}
            >
              <FiTrash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "unit",
        label: "Unit",
        render: (val) => (
          <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs uppercase">
            {normalizeCirMillsUnit(val)}
          </Badge>
        ),
      },
      {
        key: "size",
        label: sizeLabel,
        render: (val) => <span className="font-semibold tabular-nums text-title">{val}</span>,
      },
      {
        key: "circularMills",
        label: "Cir. Mills",
        render: (val) => <span className="tabular-nums text-title">{val}</span>,
      },
      {
        key: "isActive",
        label: "Status",
        render: (val) => (
          <Badge variant={val ? "success" : "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {val ? "Active" : "Inactive"}
          </Badge>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers use latest via closures on click
    [sizeLabel]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-title">Cir Mills table</h1>
          <p className="mt-1 text-sm text-secondary">
            Shared AWG and Metric → circular mils catalogs for CM Best Match (all SaaS shops).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleResetDefaults}>
            Reset defaults
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={openCreate}>
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add size
          </Button>
        </div>
      </div>

      <div
        className="mb-4 inline-flex rounded-md border border-border bg-form-bg p-0.5"
        role="group"
        aria-label="Cir Mills unit filter"
      >
        <button
          type="button"
          onClick={() => setUnitFilter(CIR_MILLS_UNIT_AWG)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            unitFilter === CIR_MILLS_UNIT_AWG
              ? "bg-primary text-white"
              : "text-secondary hover:bg-card hover:text-title"
          }`}
          aria-pressed={unitFilter === CIR_MILLS_UNIT_AWG}
        >
          AWG
        </button>
        <button
          type="button"
          onClick={() => setUnitFilter(CIR_MILLS_UNIT_METRIC)}
          className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            unitFilter === CIR_MILLS_UNIT_METRIC
              ? "bg-primary text-white"
              : "text-secondary hover:bg-card hover:text-title"
          }`}
          aria-pressed={unitFilter === CIR_MILLS_UNIT_METRIC}
        >
          Metric
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : (
        <Table columns={columns} data={items} emptyMessage="No Cir Mills rows for this unit." />
      )}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={editing ? "Edit wire size" : "Add wire size"}
        width="min(480px, 92vw)"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id={FORM_ID} onSubmit={handleSave}>
          <Select
            label="Unit"
            value={unit}
            onChange={(e) => setUnit(normalizeCirMillsUnit(e.target.value))}
            options={[
              { value: CIR_MILLS_UNIT_AWG, label: "AWG" },
              { value: CIR_MILLS_UNIT_METRIC, label: "Metric (mm)" },
            ]}
            searchable={false}
            disabled={Boolean(editing?.id)}
          />
          <Input
            label={unit === CIR_MILLS_UNIT_METRIC ? "Wire size (mm)" : "Wire size (AWG)"}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            required
          />
          <Input
            label="Circular mils"
            value={circularMills}
            onChange={(e) => setCircularMills(e.target.value)}
            required
          />
        </Form>
      </Modal>
    </div>
  );
}
