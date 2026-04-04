"use client";

import { useState, useEffect, useMemo } from "react";
import { FiSave } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import QuoteInventoryPartsControls from "@/components/dashboard/quote-inventory-parts-controls";
import { scopeAndPartsToFlowLineItems } from "@/lib/repair-flow-quote-form-map";
import { inspectionComponentsForMotorType } from "@/lib/repair-flow-constants";
import { getPreliminaryViewEntries, getDetailedViewEntries } from "@/lib/repair-flow-preliminary-fields";

const SCOPE_COLUMNS = [
  { key: "scope", label: "Scope", width: "75%" },
  { key: "price", label: "Price", type: "number", width: "25%" },
];

const PARTS_COLUMNS = [
  { key: "item", label: "Item", width: "32%" },
  { key: "qty", label: "Qty", type: "number", width: "12%" },
  { key: "uom", label: "UOM", width: "12%" },
  { key: "price", label: "Price", type: "number", width: "14%" },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const q = parseFloat(row?.qty ?? "1");
      const p = parseFloat(row?.price ?? "0");
      return Number.isFinite(q) && Number.isFinite(p) ? q * p : "";
    },
  },
];

function sumLinePrices(lines) {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const p = parseFloat(row?.price);
    if (Number.isFinite(p)) sum += p;
  }
  return sum;
}

function sumPartsLineTotals(lines) {
  if (!Array.isArray(lines)) return 0;
  let sum = 0;
  for (const row of lines) {
    const q = parseFloat(row?.qty ?? "1");
    const p = parseFloat(row?.price ?? "0");
    if (Number.isFinite(q) && Number.isFinite(p)) sum += q * p;
  }
  return sum;
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function componentLabel(motorType, value) {
  const opts = inspectionComponentsForMotorType(motorType || "");
  return opts.find((o) => o.value === value)?.label || value || "—";
}

/**
 * Create repair-flow quote — Quotes-style customer/motor selects and scope tables,
 * Inspections are for viewing readings only; scope, other cost, and notes are entered manually. Final mode also creates a legacy CRM Quote (RFQ).
 * @param {"preliminary" | "final"} [mode]
 * @param {boolean} [allowWithoutInspection] — when true (e.g. intake phase), same reference-only inspection UI; scope is still manual.
 */
export default function RepairFlowCreateQuoteModal({
  open,
  onClose,
  jobId,
  job,
  preliminaryInspections,
  mode = "preliminary",
  allowWithoutInspection = false,
  onSuccess,
}) {
  const toast = useToast();
  const fmt = useFormatMoney();

  const [customers, setCustomers] = useState([]);
  const [motors, setMotors] = useState([]);
  const [listsLoading, setListsLoading] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [motorId, setMotorId] = useState("");

  const [scopeLines, setScopeLines] = useState([]);
  const [partsLines, setPartsLines] = useState([]);
  const [quoteNotes, setQuoteNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);

  /** Preliminary and final pipeline quotes: inspections are read-only reference; scope, parts, and notes are never auto-filled. */
  const inspectionsReferenceOnly = mode === "preliminary" || mode === "final";
  const inspectionsUiReferenceOnly = allowWithoutInspection || inspectionsReferenceOnly;

  useEffect(() => {
    if (!open) return;
    setCustomerId(String(job?.customerId || ""));
    setMotorId(String(job?.motorId || ""));
  }, [open, job?.customerId, job?.motorId]);

  useEffect(() => {
    if (!open) setViewingInspection(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setListsLoading(true);
      try {
        const [cRes, mRes] = await Promise.all([
          fetch("/api/dashboard/customers", { credentials: "include" }),
          fetch("/api/dashboard/motors", { credentials: "include" }),
        ]);
        const cData = await cRes.json();
        const mData = await mRes.json();
        if (cancelled) return;
        setCustomers(Array.isArray(cData) ? cData : []);
        setMotors(Array.isArray(mData) ? mData : []);
      } catch {
        if (!cancelled) {
          setCustomers([]);
          setMotors([]);
        }
      } finally {
        if (!cancelled) setListsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const customerOptions = useMemo(
    () =>
      [{ value: "", label: "Select customer…" }].concat(
        customers.map((c) => ({
          value: c.id,
          label: c.companyName || c.primaryContactName || c.email || c.id,
        }))
      ),
    [customers]
  );

  const motorsForCustomer = useMemo(() => {
    if (!customerId) return [];
    return motors.filter((m) => String(m.customerId) === customerId);
  }, [motors, customerId]);

  const motorOptionsForCustomer = useMemo(
    () =>
      [{ value: "", label: customerId ? "Select motor…" : "Select customer first" }].concat(
        motorsForCustomer.map((m) => ({
          value: m.id,
          label: [m.manufacturer, m.model].filter(Boolean).join(" ") || m.serialNumber || m.id,
        }))
      ),
    [motorsForCustomer, customerId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => String(c.id) === String(customerId)),
    [customers, customerId]
  );

  const selectedMotor = useMemo(
    () => motors.find((m) => String(m.id) === String(motorId)),
    [motors, motorId]
  );

  /** Preliminary inspections on this job apply to the motor stored on the job; list them once that motor is selected. */
  const inspectionsForSelectedMotor = useMemo(() => {
    const list = preliminaryInspections || [];
    const sel = String(motorId || "").trim();
    const jobMotor = String(job?.motorId || "").trim();
    if (!sel) return [];
    if (jobMotor && sel !== jobMotor) return [];
    return list;
  }, [preliminaryInspections, motorId, job?.motorId]);

  /** Empty scope, parts, and notes when the modal opens (no inspection seeding for pipeline quotes). */
  useEffect(() => {
    if (!open) return;
    if (!allowWithoutInspection && !inspectionsReferenceOnly) return;
    setScopeLines([]);
    setPartsLines([]);
    setQuoteNotes("");
    setViewingInspection(null);
  }, [open, allowWithoutInspection, inspectionsReferenceOnly]);

  const viewingInspectionEntries = useMemo(() => {
    if (!viewingInspection) return [];
    if (viewingInspection.kind === "detailed") {
      return getDetailedViewEntries(viewingInspection.findings || {});
    }
    return getPreliminaryViewEntries(viewingInspection.component, viewingInspection.findings || {});
  }, [viewingInspection]);

  const inspectionListHint = useMemo(() => {
    const sel = String(motorId || "").trim();
    const jobMotor = String(job?.motorId || "").trim();
    const total = (preliminaryInspections || []).length;
    const isFinal = mode === "final";
    const kindLabelPlural = isFinal ? "inspections" : "pre-inspections";
    const kindTitleCase = isFinal ? "Inspections" : "Pre-inspections";
    if (!sel) return `Select a customer and motor to list ${kindLabelPlural} recorded on this job.`;
    if (jobMotor && sel !== jobMotor) {
      return `${kindTitleCase} on file were recorded for another motor on this job. Select that motor, or save this motor on the job first.`;
    }
    if (inspectionsUiReferenceOnly && total > 0) {
      return `${kindTitleCase} on this job are for reference only — click a label to view readings. Scope, other cost, and notes are not auto-filled from inspections.`;
    }
    if (!total) {
      if (inspectionsUiReferenceOnly) {
        return `No ${kindLabelPlural} on file yet. Enter scope, other cost, and notes manually below.`;
      }
      return `No ${kindLabelPlural} yet. Add them on the job page.`;
    }
    return null;
  }, [motorId, job?.motorId, preliminaryInspections, mode, inspectionsUiReferenceOnly]);

  const scopeTotal = useMemo(() => sumLinePrices(scopeLines), [scopeLines]);
  const partsTotalSum = useMemo(() => sumPartsLineTotals(partsLines), [partsLines]);
  const serviceProposalTotal = scopeTotal + partsTotalSum;

  function handleClose() {
    if (saving) return;
    setViewingInspection(null);
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!jobId) return;
    if (!customerId.trim()) {
      toast.error("Customer is required.");
      return;
    }
    if (!motorId.trim()) {
      toast.error("Motor is required.");
      return;
    }
    const lineItems = scopeAndPartsToFlowLineItems(scopeLines, partsLines);
    if (!lineItems.length) {
      toast.error("Add at least one scope line or other cost line.");
      return;
    }

    setSaving(true);
    try {
      const patchRes = await fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, motorId }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) throw new Error(patchData.error || "Failed to update job");

      const quoteUrl =
        mode === "final"
          ? `/api/dashboard/repair-flow/jobs/${jobId}/generate-final-quote`
          : `/api/dashboard/repair-flow/jobs/${jobId}/generate-preliminary-quote`;
      const bodyPayload =
        mode === "final"
          ? { lineItems, quoteNotes, scopeLines, partsLines }
          : { lineItems, quoteNotes };

      const res = await fetch(quoteUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create quote");
      if (mode === "final" && data.legacyQuote?.rfqNumber) {
        toast.success(`Final quote saved. RFQ ${data.legacyQuote.rfqNumber} is on the Quotes page.`);
      } else {
        toast.success(mode === "final" ? "Final quote created." : "Quote created.");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to create quote");
    } finally {
      setSaving(false);
    }
  }

  const formDisabled = saving || listsLoading;

  const viewModalTitle = viewingInspection
    ? `${viewingInspection.kind === "detailed" ? "Detailed inspection" : "Pre-inspection"} · ${componentLabel(job?.motorType, viewingInspection.component)}`
    : "";

  const modalTitle = mode === "final" ? "Create Final Quote" : "Create Quote";
  const formId = mode === "final" ? "repair-flow-create-final-quote-form" : "repair-flow-create-quote-form";

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      title={modalTitle}
      size="full"
      width="min(1200px, 94vw)"
      showClose={!saving}
      headerClassName="flex-wrap"
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            size="sm"
            disabled={formDisabled}
            className="inline-flex items-center gap-1.5"
          >
            {saving ? (
              "Saving…"
            ) : (
              <>
                <FiSave className="h-4 w-4 shrink-0" aria-hidden />
                Save
              </>
            )}
          </Button>
        </>
      }
    >
      <Form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5 !space-y-0">
        <p className="text-sm text-secondary">
          {mode === "final" ? (
            <>
              Saving creates a draft RFQ on the Quotes page with the same scope and costs. Pick customer and motor, then
              enter Scope &amp; Other Cost and notes below — nothing is copied from pre-inspections or detailed
              inspections; use component labels only to open readings for reference.
            </>
          ) : allowWithoutInspection ? (
            <>
              From intake: pick customer and motor, then fill Scope &amp; Other Cost and notes below. Scope and notes start
              empty and are not filled from pre-inspections; use component labels only to open readings for reference.
            </>
          ) : (
            <>
              Select the customer and motor, then enter scope, other cost, and notes manually. Pre-inspection labels are for
              reference only — click one to view readings; nothing is copied into this preliminary quote automatically.
            </>
          )}
        </p>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Quote info</h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Job" value={job?.jobNumber || job?.id || "—"} readOnly />
            <Input label="Date" type="date" value={todayString()} readOnly />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer &amp; motor</h3>
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label="Customer"
              options={customerOptions}
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value ?? "");
                setMotorId("");
              }}
              placeholder="Select customer"
              searchable
              className="lg:col-span-2 min-w-0"
              disabled={formDisabled}
            />
            <Select
              label="Motor"
              options={motorOptionsForCustomer}
              value={motorId}
              onChange={(e) => setMotorId(e.target.value ?? "")}
              placeholder={customerId ? "Select motor…" : "Select customer first"}
              searchable
              className="lg:col-span-2 min-w-0"
              disabled={formDisabled || !customerId}
            />
          </div>
          {(selectedCustomer || selectedMotor) && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {selectedCustomer ? (
                <div className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="font-medium text-title">Customer</div>
                  <p className="mt-1 text-title">{selectedCustomer.companyName || "—"}</p>
                  {selectedCustomer.primaryContactName ? (
                    <p className="text-secondary">{selectedCustomer.primaryContactName}</p>
                  ) : null}
                  {selectedCustomer.phone ? <p className="text-secondary">{selectedCustomer.phone}</p> : null}
                  {selectedCustomer.email ? <p className="text-secondary">{selectedCustomer.email}</p> : null}
                  {(selectedCustomer.address || selectedCustomer.city) && (
                    <p className="text-secondary">
                      {[selectedCustomer.address, selectedCustomer.city, selectedCustomer.state, selectedCustomer.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                </div>
              ) : null}
              {selectedMotor ? (
                <div className="rounded-lg border border-border bg-card p-3 text-sm">
                  <div className="font-medium text-title">Motor</div>
                  <p className="mt-1 text-title">
                    {[selectedMotor.serialNumber, selectedMotor.manufacturer, selectedMotor.model].filter(Boolean).join(" · ") ||
                      "—"}
                  </p>
                  {(selectedMotor.hp || selectedMotor.voltage || selectedMotor.rpm) && (
                    <p className="text-secondary">
                      {[
                        selectedMotor.hp && `${selectedMotor.hp} HP`,
                        selectedMotor.voltage && `${selectedMotor.voltage}V`,
                        selectedMotor.rpm && `${selectedMotor.rpm} RPM`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {selectedMotor.motorType ? <p className="text-secondary">Type: {selectedMotor.motorType}</p> : null}
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
            {mode === "final" ? "Inspections (optional, this motor)" : "Pre-inspections (optional, this motor)"}
          </h3>
          <p className="mb-2 text-xs text-secondary">
            Inspections on this job are optional for reference — click a label to view readings. Scope, other cost, and
            notes are entered manually and are not pre-filled from inspections.
          </p>
          {inspectionListHint && inspectionsForSelectedMotor.length === 0 ? (
            <p className="rounded-md border border-border bg-form-bg/50 px-3 py-2 text-sm text-secondary">{inspectionListHint}</p>
          ) : null}
          {inspectionsForSelectedMotor.length > 0 ? (
            <>
              <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-border bg-form-bg/30 px-3 py-2 [scrollbar-width:thin]">
                {inspectionsForSelectedMotor.map((inv) => {
                  const isSel = String(viewingInspection?.id) === String(inv.id);
                  const label = componentLabel(job?.motorType, inv.component);
                  const kindHint = inv.kind === "detailed" ? "Detailed inspection" : "Pre-inspection";
                  const chipText = inv.kind === "detailed" ? `${label} · det.` : label;
                  return (
                    <button
                      key={inv.id}
                      type="button"
                      disabled={formDisabled}
                      className="inline-flex shrink-0 items-center rounded-full border-0 bg-transparent p-0 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
                      aria-label={`${label}: ${kindHint} — view readings`}
                      aria-pressed={isSel}
                      title={kindHint}
                      onClick={() => setViewingInspection(inv)}
                    >
                      <Badge
                        variant="primary"
                        className={`inline-flex h-9 min-h-9 items-center justify-center rounded-full border-0 px-3 !py-0 text-xs font-medium leading-none !text-primary !ring-1 !ring-inset cursor-pointer transition-[box-shadow,background-color] hover:!bg-primary/5 dark:hover:!bg-primary/10 ${
                          isSel
                            ? "!bg-white !ring-2 !ring-primary dark:!bg-card"
                            : "!bg-white !ring-border/80 dark:!bg-card dark:!ring-border"
                        }`}
                      >
                        {chipText}
                      </Badge>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-secondary">
                Highlighted label = inspection you are viewing (reference only).
              </p>
            </>
          ) : null}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Scope &amp; Other Cost</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <div className="mb-1 text-xs font-medium text-secondary">Scope with price</div>
              <DataTable
                columns={SCOPE_COLUMNS}
                data={scopeLines}
                onChange={(rows) => setScopeLines(rows)}
                striped
              />
            </div>
            <div className="lg:col-span-3">
              <div className="mb-1 text-xs font-medium text-secondary">Other Cost (item, Qty, UOM, price)</div>
              <QuoteInventoryPartsControls
                partsLines={partsLines}
                onChangePartsLines={(rows) => setPartsLines(rows)}
                quoteId={null}
                fmtPrice={fmt}
              />
              <DataTable
                columns={PARTS_COLUMNS}
                data={partsLines}
                onChange={(rows) => setPartsLines(rows)}
                striped
              />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-border pt-3">
            <span className="text-sm text-secondary">Scope total: {fmt(scopeTotal)}</span>
            <span className="text-sm text-secondary">Other Cost total: {fmt(partsTotalSum)}</span>
            <span className="font-semibold text-title">Service proposal total: {fmt(serviceProposalTotal)}</span>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Quote notes</h3>
          <Textarea
            label="Notes / terms"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={4}
            placeholder="Terms, technician notes, and caveats…"
          />
        </div>
      </Form>
    </Modal>

    <Modal
      open={!!viewingInspection}
      onClose={() => setViewingInspection(null)}
      title={viewModalTitle}
      size="2xl"
      width="min(640px, 92vw)"
    >
      {viewingInspection ? (
        <div className="space-y-3">
          {viewingInspection.createdAt ? (
            <p className="text-xs text-secondary">Recorded {new Date(viewingInspection.createdAt).toLocaleString()}</p>
          ) : null}
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {viewingInspectionEntries.map(({ key, label, text }) => (
              <div key={key} className="min-w-0 sm:col-span-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
                <dd className="mt-0.5 whitespace-pre-wrap break-words text-title">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </Modal>
    </>
  );
}
