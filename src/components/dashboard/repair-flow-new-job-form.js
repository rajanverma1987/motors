"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Select from "@/components/ui/select";
import Table from "@/components/ui/table";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import MotorNameplateFormSections from "@/components/dashboard/motor-nameplate-form-sections";
import RepairFlowPreliminaryInspectionModal from "@/components/dashboard/repair-flow-preliminary-inspection-modal";
import RepairFlowCreateQuoteModal from "@/components/dashboard/repair-flow-create-quote-modal";
import RepairFlowQuotesTable from "@/components/dashboard/repair-flow-quotes-table";
import { emptyMotorNameplate } from "@/lib/motor-nameplate-patch";
import { inspectionComponentsForMotorType } from "@/lib/repair-flow-constants";
import {
  emptyPreliminaryFindings,
  buildPreliminaryFindingsPayload,
  getPreliminaryViewEntries,
} from "@/lib/repair-flow-preliminary-fields";

const DETAILED_VIEW_LABELS = [
  ["windingCondition", "Winding condition"],
  ["coreDamage", "Core / lamination damage"],
  ["bearingFailure", "Bearing"],
  ["shaftIssues", "Shaft / mechanical"],
  ["additionalFindings", "Additional findings"],
];

function componentLabel(motorType, value) {
  const opts = inspectionComponentsForMotorType(motorType || "");
  return opts.find((o) => o.value === value)?.label || value || "—";
}

function inspectionSummaryRow(row) {
  const f = row.findings && typeof row.findings === "object" ? row.findings : {};
  const chunks = [];
  for (const [, v] of Object.entries(f)) {
    const t = String(v || "").trim();
    if (t) chunks.push(t.length > 48 ? `${t.slice(0, 48)}…` : t);
  }
  if (!chunks.length) return "—";
  const joined = chunks.slice(0, 2).join(" · ");
  return chunks.length > 2 ? `${joined}…` : joined;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const ADD_CUSTOMER_VALUE = "__add_customer__";
const ADD_MOTOR_VALUE = "__add_motor__";

const INITIAL_NEW_CUSTOMER = {
  companyName: "",
  primaryContactName: "",
  phone: "",
  email: "",
};

/**
 * Shared create form for repair flow jobs (standalone page or modal on list).
 * After the job is created, an optional pre-inspection block is enabled in the same view.
 *
 * @param {object} props
 * @param {string} [props.formId]
 * @param {(job: object) => void} [props.onFlowComplete] — e.g. standalone page “Open job” navigates to the job
 * @param {(job: object) => void} [props.onJobCreated] — right after POST create (e.g. refresh list)
 * @param {('create' | 'postCreate') => void} [props.onWorkflowStepChange] — for modal header / parent UI
 * @param {() => void} [props.onCancel]
 * @param {boolean} [props.embeddedInModal]
 * @param {(state: { loading: boolean, saving: boolean }) => void} [props.onFormStatusChange]
 */
export default function RepairFlowNewJobForm({
  formId = "repair-flow-new-job-form",
  onFlowComplete,
  onJobCreated,
  onWorkflowStepChange,
  onCancel,
  embeddedInModal = false,
  onFormStatusChange,
}) {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [motors, setMotors] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [motorId, setMotorId] = useState("");
  const [complaint, setComplaint] = useState("");
  const [motorNameplate, setMotorNameplate] = useState(() => emptyMotorNameplate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createdJob, setCreatedJob] = useState(null);
  const [inspComponent, setInspComponent] = useState("stator");
  const [prelimFindings, setPrelimFindings] = useState(() => emptyPreliminaryFindings("stator"));
  const [savingPreinspect, setSavingPreinspect] = useState(false);
  const [prelimModalOpen, setPrelimModalOpen] = useState(false);
  const [inspections, setInspections] = useState([]);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [jobDetail, setJobDetail] = useState(null);
  const [flowQuotes, setFlowQuotes] = useState([]);
  const [postCreateRefreshing, setPostCreateRefreshing] = useState(false);
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false);
  const [createFinalQuoteModalOpen, setCreateFinalQuoteModalOpen] = useState(false);

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState(() => ({ ...INITIAL_NEW_CUSTOMER }));
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  const [addMotorOpen, setAddMotorOpen] = useState(false);
  const [newMotorPlate, setNewMotorPlate] = useState(() => emptyMotorNameplate());
  const [savingNewMotor, setSavingNewMotor] = useState(false);

  const step = createdJob ? "postCreate" : "create";

  useEffect(() => {
    onWorkflowStepChange?.(step);
  }, [step, onWorkflowStepChange]);

  const busy = loading || saving || savingPreinspect;
  useEffect(() => {
    onFormStatusChange?.({ loading, saving: saving || savingPreinspect });
  }, [loading, saving, savingPreinspect, onFormStatusChange]);

  const reloadCustomerMotorLists = useCallback(async () => {
    const [cRes, mRes] = await Promise.all([
      fetch("/api/dashboard/customers", { credentials: "include" }),
      fetch("/api/dashboard/motors", { credentials: "include" }),
    ]);
    const cData = await cRes.json();
    const mData = await mRes.json();
    setCustomers(Array.isArray(cData) ? cData : []);
    setMotors(Array.isArray(mData) ? mData : []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await reloadCustomerMotorLists();
    } catch {
      setCustomers([]);
      setMotors([]);
    } finally {
      setLoading(false);
    }
  }, [reloadCustomerMotorLists]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!motorId) {
      setMotorNameplate(emptyMotorNameplate());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/motors/${motorId}`, { credentials: "include" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load motor");
        setMotorNameplate({
          ...emptyMotorNameplate(),
          serialNumber: data.serialNumber ?? "",
          manufacturer: data.manufacturer ?? "",
          model: data.model ?? "",
          motorType: data.motorType ?? "",
          hp: data.hp ?? "",
          rpm: data.rpm ?? "",
          voltage: data.voltage ?? "",
          kw: data.kw ?? "",
          amps: data.amps ?? "",
          frameSize: data.frameSize ?? "",
          slots: data.slots ?? "",
          coreLength: data.coreLength ?? "",
          coreDiameter: data.coreDiameter ?? "",
          bars: data.bars ?? "",
        });
      } catch {
        if (!cancelled) {
          toast.error("Could not load motor details for nameplate fields.");
          setMotorNameplate(emptyMotorNameplate());
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [motorId]);

  const motorsForCustomer = useMemo(() => {
    if (!customerId) return [];
    return motors.filter((m) => String(m.customerId) === customerId);
  }, [motors, customerId]);

  const createLocked = !!createdJob;

  const customerOptions = useMemo(() => {
    const placeholderLabel =
      customers.length > 0 ? "Select customer…" : "No customers yet — use Add new or pick below";
    const head = [{ value: "", label: placeholderLabel }];
    const rows = customers.map((c) => ({
      value: c.id,
      label: c.companyName || c.primaryContactName || c.email || c.id,
    }));
    const addRow =
      !createLocked && !loading ? [{ value: ADD_CUSTOMER_VALUE, label: "Add new customer…" }] : [];
    return head.concat(rows).concat(addRow);
  }, [customers, createLocked, loading]);

  const motorOptions = useMemo(() => {
    if (!customerId) {
      return [{ value: "", label: "Choose a customer first" }];
    }
    const rows = motorsForCustomer.map((m) => ({
      value: m.id,
      label: [m.manufacturer, m.model].filter(Boolean).join(" ") || m.serialNumber || m.id,
    }));
    const placeholderLabel =
      rows.length > 0 ? "Select motor…" : "No motors for this customer — use Add new";
    const head = [{ value: "", label: placeholderLabel }];
    const addRow =
      !createLocked && !loading ? [{ value: ADD_MOTOR_VALUE, label: "Add new motor…" }] : [];
    return head.concat(rows).concat(addRow);
  }, [customerId, motorsForCustomer, createLocked, loading]);

  function handleCustomerSelect(e) {
    const v = e.target.value ?? "";
    if (v === ADD_CUSTOMER_VALUE) {
      setNewCustomerForm({ ...INITIAL_NEW_CUSTOMER });
      setAddCustomerOpen(true);
      return;
    }
    setCustomerId(v);
    setMotorId("");
  }

  function handleMotorSelect(e) {
    const v = e.target.value ?? "";
    if (v === ADD_MOTOR_VALUE) {
      if (!customerId) {
        toast.error("Select a customer first.");
        return;
      }
      setNewMotorPlate(emptyMotorNameplate());
      setAddMotorOpen(true);
      return;
    }
    setMotorId(v);
  }

  async function submitNewCustomer(e) {
    e.preventDefault();
    if (!newCustomerForm.companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSavingNewCustomer(true);
    try {
      const data = await postJson("/api/dashboard/customers", { ...newCustomerForm });
      const id = data.customer?.id;
      if (!id) throw new Error("Invalid response");
      await reloadCustomerMotorLists();
      setCustomerId(id);
      setMotorId("");
      setAddCustomerOpen(false);
      toast.success("Customer added and selected.");
    } catch (err) {
      toast.error(err.message || "Failed to create customer");
    } finally {
      setSavingNewCustomer(false);
    }
  }

  async function submitNewMotor(e) {
    e.preventDefault();
    if (!customerId) return;
    setSavingNewMotor(true);
    try {
      const data = await postJson("/api/dashboard/motors", {
        customerId,
        serialNumber: newMotorPlate.serialNumber,
        manufacturer: newMotorPlate.manufacturer,
        model: newMotorPlate.model,
        hp: newMotorPlate.hp,
        rpm: newMotorPlate.rpm,
        voltage: newMotorPlate.voltage,
        kw: newMotorPlate.kw,
        amps: newMotorPlate.amps,
        frameSize: newMotorPlate.frameSize,
        motorType: newMotorPlate.motorType,
        slots: newMotorPlate.slots,
        coreLength: newMotorPlate.coreLength,
        coreDiameter: newMotorPlate.coreDiameter,
        bars: newMotorPlate.bars,
      });
      const id = data.motor?.id;
      if (!id) throw new Error("Invalid response");
      await reloadCustomerMotorLists();
      setMotorId(id);
      setAddMotorOpen(false);
      toast.success("Motor added and selected.");
    } catch (err) {
      toast.error(err.message || "Failed to create motor");
    } finally {
      setSavingNewMotor(false);
    }
  }

  function patchNewMotorField(key, value) {
    setNewMotorPlate((prev) => ({ ...prev, [key]: value }));
  }

  const componentOptions = useMemo(() => {
    const opts = inspectionComponentsForMotorType(motorNameplate.motorType || "");
    return opts.map((o) => ({ value: o.value, label: o.label }));
  }, [motorNameplate.motorType]);

  useEffect(() => {
    if (!componentOptions.length) return;
    if (!componentOptions.some((o) => o.value === inspComponent)) {
      setInspComponent(componentOptions[0].value);
    }
  }, [componentOptions, inspComponent]);

  useEffect(() => {
    if (!prelimModalOpen) return;
    setPrelimFindings(emptyPreliminaryFindings(inspComponent));
  }, [inspComponent, prelimModalOpen]);

  const refreshJobData = useCallback(async (jobId) => {
    if (!jobId) {
      setJobDetail(null);
      setFlowQuotes([]);
      setInspections([]);
      return;
    }
    setPostCreateRefreshing(true);
    try {
      const [jRes, qRes, iRes] = await Promise.all([
        fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, { credentials: "include" }),
        fetch(`/api/dashboard/repair-flow/jobs/${jobId}/flow-quotes`, { credentials: "include" }),
        fetch(`/api/dashboard/repair-flow/jobs/${jobId}/inspections`, { credentials: "include" }),
      ]);
      const jData = await jRes.json().catch(() => ({}));
      const qData = await qRes.json().catch(() => []);
      const iData = await iRes.json().catch(() => []);
      if (jData.job) setJobDetail(jData.job);
      setFlowQuotes(Array.isArray(qData) ? qData : []);
      setInspections(Array.isArray(iData) ? iData : []);
    } catch {
      setInspections([]);
    } finally {
      setPostCreateRefreshing(false);
    }
  }, []);

  const addLinkedRfq = useCallback(async () => {
    if (!createdJob?.id) return;
    setPostCreateRefreshing(true);
    try {
      const res = await fetch(`/api/dashboard/repair-flow/jobs/${createdJob.id}/add-crm-quote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add RFQ");
      toast.success(
        data.quote?.rfqNumber ? `Draft RFQ ${data.quote.rfqNumber} added.` : "Draft RFQ added."
      );
      await refreshJobData(createdJob.id);
    } catch (e) {
      toast.error(e.message || "Failed to add RFQ");
    } finally {
      setPostCreateRefreshing(false);
    }
  }, [createdJob?.id, refreshJobData, toast]);

  useEffect(() => {
    if (!createdJob?.id) {
      setJobDetail(null);
      setFlowQuotes([]);
      setInspections([]);
      return;
    }
    refreshJobData(createdJob.id);
  }, [createdJob?.id, refreshJobData]);

  const motorTypeForInspections = jobDetail?.motorType ?? motorNameplate.motorType;

  const preliminaryInspectionsForQuote = useMemo(
    () => inspections.filter((i) => i.kind === "preliminary"),
    [inspections]
  );
  const detailedInspectionsForQuote = useMemo(
    () => inspections.filter((i) => i.kind === "detailed"),
    [inspections]
  );
  const finalQuoteInspectionsForModal = useMemo(() => {
    const byTime = (a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    };
    const pre = [...preliminaryInspectionsForQuote].sort(byTime);
    const det = [...detailedInspectionsForQuote].sort(byTime);
    return [...pre, ...det];
  }, [preliminaryInspectionsForQuote, detailedInspectionsForQuote]);

  const quoteBusy = savingPreinspect || postCreateRefreshing;
  const phase = jobDetail?.phase;
  const showQuotesBlock = createdJob && jobDetail && (phase === "intake" || phase === "pre_inspection");
  const showGenPreliminary = phase === "pre_inspection" && !jobDetail?.preliminaryFlowQuoteId;
  const showGenFinalFromPreInspection = phase === "pre_inspection";
  const showIntakePrelimQuote = phase === "intake" && !jobDetail?.preliminaryFlowQuoteId;
  const showIntakeFinalQuote = phase === "intake";
  const canAddLinkedRfqModal =
    jobDetail?.customerId &&
    jobDetail?.motorId &&
    !["closed_returned", "closed_scrap", "completed"].includes(phase || "");

  const inspectionColumns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 52,
        render: (_, row) => (
          <button
            type="button"
            onClick={() => setViewingInspection(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="View inspection"
          >
            <FiEye className="h-4 w-4 shrink-0" />
          </button>
        ),
      },
      {
        key: "kind",
        label: "Kind",
        render: (_, row) => (
          <Badge
            variant={row.kind === "detailed" ? "warning" : "primary"}
            className="rounded-full px-2.5 py-0.5 text-xs capitalize"
          >
            {row.kind === "preliminary" ? "Pre-inspection" : row.kind === "detailed" ? "Detailed" : row.kind || "—"}
          </Badge>
        ),
      },
      {
        key: "component",
        label: "Component",
        render: (_, row) => componentLabel(motorTypeForInspections, row.component),
      },
      {
        key: "recorded",
        label: "Recorded",
        render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"),
      },
      {
        key: "summary",
        label: "Summary",
        render: (_, row) => <span className="text-secondary">{inspectionSummaryRow(row)}</span>,
      },
    ],
    [motorTypeForInspections]
  );

  function openPrelimModal() {
    const first = componentOptions[0]?.value;
    if (first) setInspComponent(first);
    setPrelimModalOpen(true);
  }

  function patchNameplateField(key, value) {
    setMotorNameplate((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    if (createdJob) return;
    if (!customerId || !motorId) {
      toast.error("Select a customer and a motor.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/repair-flow/jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          motorId,
          complaint,
          motorUpdates: motorNameplate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      const job = data.job;
      toast.success("Repair job created.");
      setCreatedJob(job);
      onJobCreated?.(job);
    } catch (err) {
      toast.error(err.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreinspection(e) {
    e.preventDefault();
    if (!createdJob?.id) return;
    setSavingPreinspect(true);
    try {
      await postJson(`/api/dashboard/repair-flow/jobs/${createdJob.id}/inspections`, {
        kind: "preliminary",
        component: inspComponent,
        findings: buildPreliminaryFindingsPayload(inspComponent, prelimFindings),
      });
      toast.success("Pre-inspection saved.");
      setPrelimModalOpen(false);
      setPrelimFindings(emptyPreliminaryFindings(inspComponent));
      await refreshJobData(createdJob.id);
      onJobCreated?.(createdJob);
    } catch (err) {
      toast.error(err.message || "Failed to save inspection");
    } finally {
      setSavingPreinspect(false);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-none space-y-8">
      <Form id={formId} onSubmit={handleCreateSubmit} className="w-full min-w-0 max-w-none space-y-6">
        <div className="grid grid-cols-1 gap-4 min-w-0 md:grid-cols-2 md:gap-6">
          <div className="min-w-0">
            <Select
              label="Customer"
              options={customerOptions}
              value={customerId}
              onChange={handleCustomerSelect}
              disabled={loading || createLocked}
              searchable
            />
          </div>
          <div className="min-w-0">
            <Select
              label="Motor"
              options={motorOptions}
              value={motorId}
              onChange={handleMotorSelect}
              disabled={loading || !customerId || createLocked}
              searchable
            />
          </div>
        </div>
        {motorId ? (
          <div className="w-full min-w-0 space-y-6 rounded-lg border border-border bg-form-bg/50 p-4">
            <p className="text-xs text-secondary">
              These fields update the selected motor in Customer&apos;s motors.
            </p>
            <MotorNameplateFormSections
              values={motorNameplate}
              onFieldChange={patchNameplateField}
              disabled={loading || createLocked}
            />
          </div>
        ) : null}
        <Textarea
          label="Complaint / reason for service"
          value={complaint}
          onChange={(e) => setComplaint(e.target.value)}
          rows={3}
          placeholder="What the customer reported…"
          disabled={createLocked}
        />
        {!embeddedInModal ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {!createLocked ? (
              <Button type="submit" variant="primary" disabled={saving || loading}>
                {saving ? "Creating…" : "Create job"}
              </Button>
            ) : null}
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                Cancel
              </Button>
            ) : null}
          </div>
        ) : null}
      </Form>

      <section
        className={`flex min-h-[200px] w-full min-w-0 flex-col rounded-lg border border-border bg-card p-5 ${!createdJob ? "opacity-60" : ""}`}
        aria-disabled={!createdJob}
      >
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Inspections</h2>
            <p className="mt-1 text-xs text-secondary">
              Pre-inspection during intake; detailed rows after disassembly. Add from the buttons below.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="shrink-0"
              onClick={openPrelimModal}
              disabled={!createdJob || savingPreinspect}
            >
              Add pre-inspection
            </Button>
            {createdJob && !embeddedInModal && onFlowComplete ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => onFlowComplete(createdJob)}
                disabled={savingPreinspect}
              >
                Open job
              </Button>
            ) : null}
          </div>
        </div>
        {!createdJob ? (
          <p className="text-sm text-secondary">
            Create the job first. This section will match the full job page: inspections table, quotes, and flow quotes.
          </p>
        ) : (
          <div className="min-h-0 min-w-0 w-full flex-1">
            <Table
              columns={inspectionColumns}
              data={inspections}
              rowKey="id"
              loading={postCreateRefreshing}
              emptyMessage="No inspections yet. Use Add pre-inspection or Add detailed inspection when available."
              fillHeight={false}
              paginateClientSide={false}
              responsive
              onRefresh={() => refreshJobData(createdJob.id)}
            />
          </div>
        )}
      </section>

      {showQuotesBlock ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-medium uppercase tracking-wide text-secondary">Quotes (pre-inspection)</span>
          {phase === "intake" ? (
            <>
              {showIntakePrelimQuote ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateQuoteModalOpen(true)}
                  disabled={quoteBusy}
                >
                  Create Preliminary Quote
                </Button>
              ) : null}
              {showIntakeFinalQuote ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateFinalQuoteModalOpen(true)}
                  disabled={quoteBusy}
                >
                  Create Final Quote
                </Button>
              ) : null}
              {canAddLinkedRfqModal ? (
                <Button type="button" variant="outline" size="sm" onClick={addLinkedRfq} disabled={quoteBusy}>
                  Add RFQ
                </Button>
              ) : null}
            </>
          ) : (
            <>
              {showGenPreliminary ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateQuoteModalOpen(true)}
                  disabled={quoteBusy}
                >
                  Create Preliminary Quote
                </Button>
              ) : null}
              {showGenFinalFromPreInspection ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateFinalQuoteModalOpen(true)}
                  disabled={quoteBusy}
                >
                  Create Final Quote
                </Button>
              ) : null}
              {canAddLinkedRfqModal ? (
                <Button type="button" variant="outline" size="sm" onClick={addLinkedRfq} disabled={quoteBusy}>
                  Add RFQ
                </Button>
              ) : null}
              {preliminaryInspectionsForQuote.length === 0 && (showGenPreliminary || showGenFinalFromPreInspection) ? (
                <span className="self-center text-xs text-secondary">
                  Pre-inspection is optional — add scope manually in the quote form, or record one first for reference when
                  quoting.
                </span>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {createdJob && jobDetail ? (
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Quotes</h2>
              <p className="mt-1 max-w-3xl text-xs text-secondary">
                Final RFQs are the same records as on the Quotes tab. Use the eye icon to open one for editing. Add RFQ
                attaches another draft to this job.
              </p>
            </div>
            {canAddLinkedRfqModal ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={addLinkedRfq}
                disabled={quoteBusy}
              >
                Add RFQ
              </Button>
            ) : null}
          </div>
          <div className="mt-4 min-w-0">
            <RepairFlowQuotesTable quotes={flowQuotes} loading={postCreateRefreshing} />
          </div>
        </section>
      ) : null}

      {createdJob && jobDetail ? (
        <>
          <RepairFlowCreateQuoteModal
            open={createQuoteModalOpen}
            onClose={() => setCreateQuoteModalOpen(false)}
            jobId={createdJob.id}
            job={jobDetail}
            preliminaryInspections={preliminaryInspectionsForQuote}
            allowWithoutInspection={phase === "intake"}
            onSuccess={async () => {
              await refreshJobData(createdJob.id);
              onJobCreated?.(createdJob);
            }}
          />
          <RepairFlowCreateQuoteModal
            mode="final"
            open={createFinalQuoteModalOpen}
            onClose={() => setCreateFinalQuoteModalOpen(false)}
            jobId={createdJob.id}
            job={jobDetail}
            preliminaryInspections={finalQuoteInspectionsForModal}
            allowWithoutInspection={phase === "intake"}
            onSuccess={async () => {
              await refreshJobData(createdJob.id);
              onJobCreated?.(createdJob);
            }}
          />
        </>
      ) : null}

      <RepairFlowPreliminaryInspectionModal
        open={prelimModalOpen}
        onClose={() => !savingPreinspect && setPrelimModalOpen(false)}
        formId="rf-new-job-prelim-insp-form"
        saving={savingPreinspect}
        componentOptions={componentOptions}
        inspComponent={inspComponent}
        onInspComponentChange={setInspComponent}
        prelimFindings={prelimFindings}
        onPrelimFieldChange={(key, value) => setPrelimFindings((f) => ({ ...f, [key]: value }))}
        onSubmit={handleSavePreinspection}
      />

      <Modal
        open={!!viewingInspection}
        onClose={() => setViewingInspection(null)}
        title="Inspection"
        size="lg"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setViewingInspection(null)}>
            Close
          </Button>
        }
      >
        {viewingInspection ? (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={viewingInspection.kind === "detailed" ? "warning" : "primary"}
                className="rounded-full px-2.5 py-0.5 text-xs capitalize"
              >
                {viewingInspection.kind === "preliminary"
                  ? "Pre-inspection"
                  : viewingInspection.kind === "detailed"
                    ? "Detailed"
                    : viewingInspection.kind}
              </Badge>
              <span className="text-secondary">{componentLabel(motorTypeForInspections, viewingInspection.component)}</span>
              <span className="text-secondary">
                {viewingInspection.createdAt ? new Date(viewingInspection.createdAt).toLocaleString() : ""}
              </span>
            </div>
            <dl className="space-y-3">
              {viewingInspection.kind === "detailed"
                ? DETAILED_VIEW_LABELS.map(([key, label]) => {
                    const val = viewingInspection.findings?.[key];
                    const text = val != null && String(val).trim() ? String(val) : "—";
                    return (
                      <div key={key}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-title">{text}</dd>
                      </div>
                    );
                  })
                : getPreliminaryViewEntries(viewingInspection.component, viewingInspection.findings).map(
                    ({ key, label, text }) => (
                      <div key={key}>
                        <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-title">{text}</dd>
                      </div>
                    )
                  )}
            </dl>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={addCustomerOpen}
        onClose={() => !savingNewCustomer && setAddCustomerOpen(false)}
        title="Add new customer"
        size="lg"
        showClose={!savingNewCustomer}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddCustomerOpen(false)}
              disabled={savingNewCustomer}
            >
              Cancel
            </Button>
            <Button type="submit" form="rf-new-customer-form" variant="primary" size="sm" disabled={savingNewCustomer}>
              {savingNewCustomer ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="rf-new-customer-form" onSubmit={submitNewCustomer} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <Input
              label="Company name"
              value={newCustomerForm.companyName}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, companyName: e.target.value }))}
              placeholder="Company or business name"
              required
            />
            <Input
              label="Primary contact name"
              value={newCustomerForm.primaryContactName}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, primaryContactName: e.target.value }))}
              placeholder="Contact person"
            />
            <Input
              label="Phone"
              type="tel"
              value={newCustomerForm.phone}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
            />
            <Input
              label="Email"
              type="email"
              value={newCustomerForm.email}
              onChange={(e) => setNewCustomerForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
            />
          </div>
        </Form>
      </Modal>

      <Modal
        open={addMotorOpen}
        onClose={() => !savingNewMotor && setAddMotorOpen(false)}
        title="Add new motor"
        width="min(960px, 94vw)"
        showClose={!savingNewMotor}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddMotorOpen(false)} disabled={savingNewMotor}>
              Cancel
            </Button>
            <Button type="submit" form="rf-new-motor-form" variant="primary" size="sm" disabled={savingNewMotor}>
              {savingNewMotor ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="rf-new-motor-form" onSubmit={submitNewMotor} className="flex flex-col gap-4 !space-y-0">
          <p className="text-sm text-secondary">
            Customer:{" "}
            <span className="font-medium text-title">
              {customers.find((c) => String(c.id) === String(customerId))?.companyName ||
                customers.find((c) => String(c.id) === String(customerId))?.primaryContactName ||
                "—"}
            </span>
          </p>
          <MotorNameplateFormSections
            values={newMotorPlate}
            onFieldChange={patchNewMotorField}
            disabled={savingNewMotor}
          />
        </Form>
      </Modal>
    </div>
  );
}
