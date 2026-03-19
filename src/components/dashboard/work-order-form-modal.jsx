"use client";

import { useState, useEffect, useMemo, useSyncExternalStore } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Tabs from "@/components/ui/tabs";
import { Form, FormLayout, FormField } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  JOB_TYPE_OPTIONS,
} from "@/lib/work-order-fields";
import { mergeUserSettings, USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";

function QuoteReferenceNoPrices({ scopeLines = [], otherCostLines = [] }) {
  const hasScope = scopeLines.length > 0;
  const hasOther = otherCostLines.some((r) => (r.item || "").trim() || (r.qty || "").trim());
  if (!hasScope && !hasOther) return null;
  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
        From quote (no prices — for technician reference)
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {hasScope && (
          <div>
            <p className="mb-2 text-sm font-medium text-title">Scope</p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-text">
              {scopeLines.map((row, i) => (
                <li key={i} className="whitespace-pre-wrap pl-1">
                  {row.scope || "—"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {hasOther && (
          <div>
            <p className="mb-2 text-sm font-medium text-title">Other cost (items)</p>
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-form-bg">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-title">Item</th>
                    <th className="px-3 py-2 text-right font-medium text-title">Qty</th>
                    <th className="px-3 py-2 text-left font-medium text-title">UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {otherCostLines.map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-text">{row.item || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.qty || "—"}</td>
                      <td className="px-3 py-2 text-secondary">{row.uom || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function woSpecColumnCount() {
  if (typeof window === "undefined") return 3;
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 1024) return 2;
  return 3;
}

function useWoSpecColumns() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const m640 = window.matchMedia("(min-width: 640px)");
      const m1024 = window.matchMedia("(min-width: 1024px)");
      const fn = () => onStoreChange();
      m640.addEventListener("change", fn);
      m1024.addEventListener("change", fn);
      window.addEventListener("resize", fn);
      return () => {
        m640.removeEventListener("change", fn);
        m1024.removeEventListener("change", fn);
        window.removeEventListener("resize", fn);
      };
    },
    woSpecColumnCount,
    () => 3
  );
}

function SpecGrid({ fields, values, onChange, idPrefix = "wo" }) {
  const cols = useWoSpecColumns();
  return (
    <FormLayout labelWidth="minmax(7.5rem, 10.5rem)" cols={cols} className="w-full min-w-0">
      {fields.map(({ key, label }) => {
        const fid = `${idPrefix}-${key}`;
        return (
          <FormField key={key} label={label} id={fid} name={key} labelAlign="right" classNameLabel="pr-2">
            <Input
              id={fid}
              name={key}
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="min-w-0"
            />
          </FormField>
        );
      })}
    </FormLayout>
  );
}

/**
 * Work order create (draft from quote) or edit — same modal as Work orders page.
 * @param {string|null} draftQuoteId
 * @param {string|null} workOrderId
 */
export default function WorkOrderFormModal({
  open,
  onClose,
  draftQuoteId = null,
  workOrderId = null,
  onAfterSave,
  zIndex = 50,
}) {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [statusOptions, setStatusOptions] = useState(USER_SETTINGS_DEFAULTS.workOrderStatuses);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);

  const technicianOptions = useMemo(() => {
    const tech = employees.filter((e) =>
      String(e.role || "")
        .toLowerCase()
        .includes("technician")
    );
    const list = tech.length ? tech : employees;
    return list.map((e) => ({ value: e.id, label: e.name || e.email || e.id }));
  }, [employees]);

  const statusSelectOptions = statusOptions.map((s) => ({ value: s, label: s }));

  useEffect(() => {
    if (!open) {
      setEditing(null);
      setForm(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    const dq = draftQuoteId?.trim();
    const wid = workOrderId?.trim();
    if (!dq && !wid) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setEditing(null);
    setForm(null);
    (async () => {
      try {
        const [empRes, setRes] = await Promise.all([
          fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" }),
          fetch("/api/dashboard/settings", { credentials: "include", cache: "no-store" }),
        ]);
        if (cancelled) return;
        if (empRes.ok) {
          const list = await empRes.json();
          setEmployees(Array.isArray(list) ? list : []);
        }
        if (setRes.ok) {
          const d = await setRes.json();
          const st = mergeUserSettings(d.settings).workOrderStatuses;
          if (Array.isArray(st) && st.length) setStatusOptions(st);
        }

        if (wid) {
          const res = await fetch(`/api/dashboard/work-orders/${wid}`, {
            credentials: "include",
            cache: "no-store",
          });
          const d = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(d.error || "Failed to load work order");
          setEditing({ ...d, isDraft: false });
          setForm({
            date: d.date || "",
            technicianEmployeeId: d.technicianEmployeeId || "",
            jobType: d.jobType || "complete_motor",
            status: d.status || "Assigned",
            acSpecs: { ...(d.acSpecs || {}) },
            dcSpecs: { ...(d.dcSpecs || {}) },
            armatureSpecs: { ...(d.armatureSpecs || {}) },
          });
        } else if (dq) {
          const res = await fetch(
            `/api/dashboard/work-orders/draft?quoteId=${encodeURIComponent(dq)}`,
            { credentials: "include", cache: "no-store" }
          );
          const d = await res.json();
          if (cancelled) return;
          if (!res.ok) throw new Error(d.error || "Failed to open work order form");
          setEditing(d);
          setForm({
            date: d.date || "",
            technicianEmployeeId: d.technicianEmployeeId || "",
            jobType: d.jobType || "complete_motor",
            status: d.status || "Assigned",
            acSpecs: { ...(d.acSpecs || {}) },
            dcSpecs: { ...(d.dcSpecs || {}) },
            armatureSpecs: { ...(d.armatureSpecs || {}) },
          });
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e.message || "Failed to load");
          toast.error(e.message || "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, draftQuoteId, workOrderId, toast]);

  const handleClose = () => {
    setEditing(null);
    setForm(null);
    setLoadError(null);
    onClose();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editing || !form) return;
    setSaving(true);
    try {
      if (editing.isDraft && editing.draftQuoteId) {
        const postRes = await fetch("/api/dashboard/work-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            quoteId: editing.draftQuoteId,
            technicianEmployeeId: form.technicianEmployeeId,
            jobType: form.jobType,
          }),
        });
        const postData = await postRes.json();
        if (!postRes.ok) throw new Error(postData.error || "Could not create work order");
        const newId = postData.workOrder?.id;
        if (!newId) throw new Error("Create failed");
        const patchBody = {
          date: form.date,
          technicianEmployeeId: form.technicianEmployeeId,
          jobType: form.jobType,
          status: form.status,
        };
        if (editing.motorClass === "AC") patchBody.acSpecs = form.acSpecs;
        if (editing.motorClass === "DC") {
          patchBody.dcSpecs = form.dcSpecs;
          patchBody.armatureSpecs = form.armatureSpecs;
        }
        const patchRes = await fetch(`/api/dashboard/work-orders/${newId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patchBody),
        });
        const patchData = await patchRes.json();
        if (!patchRes.ok) throw new Error(patchData.error || "Saved WO but follow-up update failed");
        toast.success(`Work order ${postData.workOrder?.workOrderNumber || ""} created and saved.`);
        handleClose();
        onAfterSave?.();
        return;
      }

      if (!editing.id) return;
      const body = {
        date: form.date,
        technicianEmployeeId: form.technicianEmployeeId,
        jobType: form.jobType,
        status: form.status,
      };
      if (editing.motorClass === "AC") body.acSpecs = form.acSpecs;
      if (editing.motorClass === "DC") {
        body.dcSpecs = form.dcSpecs;
        body.armatureSpecs = form.armatureSpecs;
      }
      const res = await fetch(`/api/dashboard/work-orders/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");
      toast.success("Work order saved. Motor asset updated with spec data.");
      handleClose();
      onAfterSave?.();
    } catch (err) {
      toast.error(err.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const activeDraft = draftQuoteId?.trim();
  const activeWo = workOrderId?.trim();
  const showForm = open && form && editing && !loadError && !loading;

  return (
    <Modal
      open={open && !!(activeDraft || activeWo)}
      onClose={handleClose}
      title={
        editing?.isDraft
          ? "New work order (save to create)"
          : editing
            ? `Work order ${editing.workOrderNumber}`
            : "Work order"
      }
      width="min(1280px, 76.8vw)"
      zIndex={zIndex}
      actions={
        showForm ? (
          <Button type="submit" form="wo-form-modal" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : null
      }
    >
      {loading && open ? (
        <p className="py-8 text-center text-secondary">Loading…</p>
      ) : loadError ? (
        <p className="py-8 text-center text-danger">{loadError}</p>
      ) : showForm ? (
        <Form
          id="wo-form-modal"
          onSubmit={handleSave}
          className="flex max-h-[82vh] flex-col gap-5 overflow-y-auto pr-1 !space-y-0"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              label="Work order #"
              value={
                editing.isDraft ? `${editing.workOrderNumber} (assigned on save)` : editing.workOrderNumber
              }
              readOnly
            />
            <Input label="RFQ#" value={editing.quoteRfqNumber || "—"} readOnly />
            <Input label="Company" value={editing.customerCompany || editing.companyName || "—"} readOnly />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label="Technician"
              options={technicianOptions}
              value={form.technicianEmployeeId}
              onChange={(e) => setForm((f) => ({ ...f, technicianEmployeeId: e.target.value ?? "" }))}
              placeholder="Select technician"
              searchable
            />
            <Select
              label="Job type"
              options={JOB_TYPE_OPTIONS}
              value={form.jobType}
              onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value ?? "complete_motor" }))}
              searchable={false}
            />
            <Select
              label="Status"
              options={statusSelectOptions}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "" }))}
              searchable={false}
            />
          </div>
          <p className="text-xs text-secondary">
            Motor class: <strong className="text-title">{editing.motorClass}</strong> — fields pre-filled from
            the motor asset where available.
          </p>
          <QuoteReferenceNoPrices
            scopeLines={editing.quoteScopeForTech}
            otherCostLines={editing.quoteOtherCostForTech}
          />
          {editing.motorClass === "AC" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-title">AC motor — winding &amp; mechanical</h3>
              <SpecGrid
                idPrefix="wo-modal-ac"
                fields={AC_WORK_ORDER_FIELDS}
                values={form.acSpecs}
                onChange={(k, v) => setForm((f) => ({ ...f, acSpecs: { ...f.acSpecs, [k]: v } }))}
              />
            </div>
          )}
          {editing.motorClass === "DC" && (
            <Tabs
              defaultTab="dc"
              tabs={[
                {
                  id: "dc",
                  label: "DC motor",
                  children: (
                    <div className="pt-2">
                      <SpecGrid
                        idPrefix="wo-modal-dc"
                        fields={DC_WORK_ORDER_FIELDS}
                        values={form.dcSpecs}
                        onChange={(k, v) => setForm((f) => ({ ...f, dcSpecs: { ...f.dcSpecs, [k]: v } }))}
                      />
                    </div>
                  ),
                },
                {
                  id: "armature",
                  label: "Armature",
                  children: (
                    <div className="pt-2">
                      <SpecGrid
                        idPrefix="wo-modal-arm"
                        fields={DC_ARMATURE_FIELDS}
                        values={form.armatureSpecs}
                        onChange={(k, v) =>
                          setForm((f) => ({
                            ...f,
                            armatureSpecs: { ...f.armatureSpecs, [k]: v },
                          }))
                        }
                      />
                    </div>
                  ),
                },
              ]}
            />
          )}
        </Form>
      ) : null}
    </Modal>
  );
}
