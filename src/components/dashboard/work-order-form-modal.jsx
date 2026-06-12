"use client";

import { useState, useEffect, useMemo } from "react";
import { FiPrinter, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import WorkOrderSendEmailModal from "@/components/dashboard/work-order-send-email-modal";
import WorkOrderPrintPreview from "@/components/dashboard/work-order-print-preview";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Tabs from "@/components/ui/tabs";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  JOB_TYPE_OPTIONS,
  normalizeWorkOrderJobType,
} from "@/lib/work-order-fields";
import { mergeUserSettings, USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";
import WorkOrderInspectionsPanel from "@/components/dashboard/work-order-inspections-panel";

const sectionLabel = "text-[10px] font-semibold uppercase tracking-wide text-secondary";
/** Same height for date input and select triggers in assignment grid */
const assignmentControlSize =
  "!h-9 !min-h-9 !max-h-9 !box-border !py-1.5 !text-xs leading-normal";

const WO_HEADER_LINK_CLASS =
  "text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded";

function WorkOrderCustomerHeader({ editing, onOpenQuote, onOpenCustomer }) {
  const company = editing.customerCompany || editing.companyName || "—";
  const woNum = editing.isDraft
    ? `${editing.workOrderNumber || "—"} (assigned on save)`
    : editing.workOrderNumber || "—";
  const rfq = editing.quoteRfqNumber || "—";
  const motorType = String(editing.motorClass || "").trim() || "—";
  const quoteId = String(editing?.quoteId || editing?.draftQuoteId || "").trim();
  const customerId = String(editing?.customerId || "").trim();

  return (
    <header className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Customer</p>
      {customerId && company !== "—" && typeof onOpenCustomer === "function" ? (
        <button
          type="button"
          className={`mt-0.5 block text-left text-2xl font-bold leading-tight tracking-tight sm:text-[1.65rem] ${WO_HEADER_LINK_CLASS}`}
          onClick={() => onOpenCustomer(customerId)}
          title="Open customer"
        >
          {company}
        </button>
      ) : (
        <h2 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-title sm:text-[1.65rem]">
          {company}
        </h2>
      )}
      <p className="mt-1 text-lg font-bold leading-tight text-primary sm:text-xl">
        Motor type: {motorType}
      </p>
      <dl className="mt-2.5 flex flex-wrap gap-x-8 gap-y-1">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-secondary">RFQ#</dt>
          <dd className="mt-0.5 text-sm font-semibold tabular-nums">
            {quoteId && rfq !== "—" && typeof onOpenQuote === "function" ? (
              <button
                type="button"
                className={`text-title ${WO_HEADER_LINK_CLASS}`}
                onClick={() => onOpenQuote(quoteId)}
                title="Open RFQ"
              >
                {rfq}
              </button>
            ) : (
              <span className="text-title">{rfq}</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Work order#</dt>
          <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-primary">{woNum}</dd>
        </div>
      </dl>
    </header>
  );
}

function WorkOrderTopSection({
  editing,
  form,
  setForm,
  technicianOptions,
  jobTypeSelectOptions,
  statusSelectOptions,
  onOpenQuote,
  onOpenCustomer,
}) {
  return (
    <FormSection bodyClassName="p-0">
      <div className="flex flex-col lg:flex-row lg:items-stretch">
        <div className="min-w-0 flex-1 border-b border-border px-4 py-3 lg:border-b-0 lg:border-r lg:py-3 lg:pr-4">
          <WorkOrderCustomerHeader
            editing={editing}
            onOpenQuote={onOpenQuote}
            onOpenCustomer={onOpenCustomer}
          />
        </div>
        <div className="w-full shrink-0 px-4 py-2.5 lg:w-[min(50%,26rem)] lg:py-3 lg:pl-4">
          <AssignmentFields
            form={form}
            setForm={setForm}
            editing={editing}
            technicianOptions={technicianOptions}
            jobTypeSelectOptions={jobTypeSelectOptions}
            statusSelectOptions={statusSelectOptions}
          />
        </div>
      </div>
    </FormSection>
  );
}

function QuoteScopeBlock({ scopeLines = [], otherCostLines = [] }) {
  const hasScope = scopeLines.length > 0;
  const hasOther = otherCostLines.some((r) => (r.item || "").trim() || (r.qty || "").trim());
  if (!hasScope && !hasOther) return null;

  return (
    <FormSection title="Scope from quote">
      {hasScope ? (
        <ul className="space-y-0.5 border-l-2 border-primary/35 pl-2.5">
          {scopeLines.map((row, i) => (
            <li key={i} className="whitespace-pre-wrap text-xs leading-snug text-text">
              {row.scope || "—"}
            </li>
          ))}
        </ul>
      ) : null}
      {hasOther ? (
        <div className={hasScope ? "mt-2" : "mt-1"}>
          <p className={`${sectionLabel} mb-1`}>Other cost</p>
          <div className="overflow-hidden rounded border border-border text-xs">
            <table className="w-full">
              <thead className="border-b border-border bg-form-bg">
                <tr>
                  <th className="px-2 py-1 text-left font-medium text-title">Item</th>
                  <th className="px-2 py-1 text-right font-medium text-title">Qty</th>
                  <th className="px-2 py-1 text-left font-medium text-title">UOM</th>
                </tr>
              </thead>
              <tbody>
                {otherCostLines.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1 text-text">{row.item || "—"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{row.qty || "—"}</td>
                    <td className="px-2 py-1 text-secondary">{row.uom || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </FormSection>
  );
}

function AssignmentFields({
  form,
  setForm,
  editing,
  technicianOptions,
  jobTypeSelectOptions,
  statusSelectOptions,
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-medium text-secondary">Assignment</p>
      <div className="grid w-full grid-cols-2 gap-2 [&>div]:min-w-0 [&_label]:!mb-0.5 [&_label]:!text-xs [&_label]:!font-normal [&_label]:!text-secondary [&_span.text-title]:!mb-0.5 [&_span.text-title]:!text-xs [&_span.text-title]:!font-normal [&_span.text-title]:!text-secondary">
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="!w-full !gap-1"
          inputClassName={assignmentControlSize}
        />
        <Select
          label="Technician"
          options={technicianOptions}
          value={form.technicianEmployeeId}
          onChange={(e) => setForm((f) => ({ ...f, technicianEmployeeId: e.target.value ?? "" }))}
          placeholder="Select"
          searchable
          className="!w-full !gap-1"
          triggerClassName={assignmentControlSize}
        />
        <Select
          label="Job type"
          options={jobTypeSelectOptions}
          value={form.jobType}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              jobType: normalizeWorkOrderJobType(
                e.target.value ?? "complete_motor",
                editing.motorClass || "AC"
              ),
            }))
          }
          searchable={false}
          className="!w-full !gap-1"
          triggerClassName={assignmentControlSize}
        />
        <Select
          label="Status"
          options={statusSelectOptions}
          value={form.status}
          onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "" }))}
          searchable={false}
          className="!w-full !gap-1"
          triggerClassName={assignmentControlSize}
        />
      </div>
    </div>
  );
}

function ShopNotesBlock({ form, setForm }) {
  return (
    <FormSection title="Shop notes">
      <Textarea
        label="Shop notes"
        id="wo-modal-notes"
        name="notes"
        rows={2}
        placeholder="Floor / parts / customer notes…"
        value={form.notes ?? ""}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        maxLength={8000}
        className="!gap-0 [&_label]:sr-only"
        textareaClassName="min-h-[3.25rem] !py-2 !text-base leading-normal"
      />
    </FormSection>
  );
}

function WoSpecDenseGrid({ fields, values, onChange, idPrefix = "wo" }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
      {fields.map(({ key, label }) => {
        const fid = `${idPrefix}-${key}`;
        return (
          <div key={key} className="min-w-0">
            <label
              htmlFor={fid}
              className="mb-1 block truncate text-sm font-bold leading-tight text-title"
              title={label}
            >
              {label}
            </label>
            <Input
              id={fid}
              name={key}
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="min-w-0 !gap-0"
              inputClassName="!h-8 w-full !py-1 !px-2 !text-sm leading-snug"
            />
          </div>
        );
      })}
    </div>
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
  onOpenQuote,
  onOpenCustomer,
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
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);

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

  const jobTypeSelectOptions = useMemo(() => {
    if (editing?.motorClass === "DC") return JOB_TYPE_OPTIONS;
    return JOB_TYPE_OPTIONS.filter((o) => o.value !== "armature_only");
  }, [editing?.motorClass]);

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
            jobType: normalizeWorkOrderJobType(d.jobType || "complete_motor", d.motorClass || "AC"),
            status: d.status || "Assigned",
            notes: d.notes || "",
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
            jobType: normalizeWorkOrderJobType(d.jobType || "complete_motor", d.motorClass || "AC"),
            status: d.status || "Assigned",
            notes: "",
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
    setSendEmailOpen(false);
    setPrintOpen(false);
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
          notes: form.notes ?? "",
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
        notes: form.notes ?? "",
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
      toast.success("Work order saved. Customer's motor updated with spec data.");
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

  const modalTitle = editing?.isDraft
    ? "New work order"
    : editing
      ? `Work order ${editing.workOrderNumber || ""}`
      : "Work order";

  return (
    <Modal
      open={open && !!(activeDraft || activeWo)}
      onClose={handleClose}
      title={modalTitle}
      width="min(1280px, 96vw)"
      zIndex={zIndex}
      headerClassName="flex-wrap gap-2"
      actions={
        showForm ? (
          <>
            {!editing.isDraft && editing.id ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex shrink-0 items-center gap-1.5"
                  disabled={saving}
                  onClick={() => setPrintOpen(true)}
                >
                  <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex shrink-0 items-center gap-1.5"
                  disabled={saving}
                  onClick={() => setSendEmailOpen(true)}
                >
                  <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                  Send
                </Button>
              </>
            ) : null}
            <Button type="submit" form="wo-form-modal" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
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
          className={`${FORM_SECTIONS_STACK_CLASS} min-h-0 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <WorkOrderTopSection
            editing={editing}
            form={form}
            setForm={setForm}
            technicianOptions={technicianOptions}
            jobTypeSelectOptions={jobTypeSelectOptions}
            statusSelectOptions={statusSelectOptions}
            onOpenQuote={onOpenQuote}
            onOpenCustomer={onOpenCustomer}
          />

          <QuoteScopeBlock
            scopeLines={editing.quoteScopeForTech}
            otherCostLines={editing.quoteOtherCostForTech}
          />

          <ShopNotesBlock form={form} setForm={setForm} />

          {editing.motorClass === "AC" && (
            <FormSection
              title="AC motor — winding & mechanical"
              subtitle="Main work order data — fill these fields; saved to the customer motor on save."
              emphasis
              bodyClassName="bg-form-bg/20"
            >
              <WoSpecDenseGrid
                idPrefix="wo-modal-ac"
                fields={AC_WORK_ORDER_FIELDS}
                values={form.acSpecs}
                onChange={(k, v) => setForm((f) => ({ ...f, acSpecs: { ...f.acSpecs, [k]: v } }))}
              />
            </FormSection>
          )}

          {editing.motorClass === "DC" && form.jobType === "armature_only" && (
            <FormSection
              title="Armature"
              subtitle="Main work order data — fill these fields; saved to the customer motor on save."
              emphasis
              bodyClassName="bg-form-bg/20"
            >
              <WoSpecDenseGrid
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
            </FormSection>
          )}

          {editing.motorClass === "DC" && form.jobType !== "armature_only" && (
            <FormSection
              title="DC motor & armature"
              subtitle="Main work order data — use tabs for motor vs armature; saved to the customer motor on save."
              emphasis
              bodyClassName="bg-form-bg/20"
            >
              <Tabs
                className="[&_[role=tabpanel]]:!pt-1.5"
                listClassName="!gap-0"
                defaultTab="dc"
                tabs={[
                  {
                    id: "dc",
                    label: "DC motor",
                    children: (
                      <WoSpecDenseGrid
                        idPrefix="wo-modal-dc"
                        fields={DC_WORK_ORDER_FIELDS}
                        values={form.dcSpecs}
                        onChange={(k, v) => setForm((f) => ({ ...f, dcSpecs: { ...f.dcSpecs, [k]: v } }))}
                      />
                    ),
                  },
                  {
                    id: "armature",
                    label: "Armature",
                    children: (
                      <WoSpecDenseGrid
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
                    ),
                  },
                ]}
              />
            </FormSection>
          )}

          {!editing.isDraft && editing.id ? (
            <WorkOrderInspectionsPanel workOrderId={editing.id} disabled={saving} secondary />
          ) : null}
        </Form>
      ) : null}

      <WorkOrderSendEmailModal
        open={sendEmailOpen}
        onClose={() => setSendEmailOpen(false)}
        workOrderId={editing?.id ?? null}
        workOrderNumber={editing?.workOrderNumber ?? ""}
        defaultEmail={editing?.customerEmail ?? ""}
        zIndex={zIndex + 10}
      />

      <WorkOrderPrintPreview
        workOrderId={printOpen && editing?.id ? editing.id : null}
        open={printOpen}
        onClose={() => setPrintOpen(false)}
      />
    </Modal>
  );
}
