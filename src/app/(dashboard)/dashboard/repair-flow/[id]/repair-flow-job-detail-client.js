"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FiClipboard, FiEye, FiDollarSign, FiPaperclip, FiPrinter, FiRotateCw, FiSend } from "react-icons/fi";
import { LuQrCode } from "react-icons/lu";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  REPAIR_FLOW_PHASE_LABELS,
  phaseBadgeVariant,
  inspectionComponentsForMotorType,
} from "@/lib/repair-flow-constants";
import MotorNameplateFormSections from "@/components/dashboard/motor-nameplate-form-sections";
import MotorNameplateCompactView from "@/components/dashboard/motor-nameplate-compact-view";
import RepairFlowPreliminaryInspectionModal from "@/components/dashboard/repair-flow-preliminary-inspection-modal";
import RepairFlowCreateQuoteModal from "@/components/dashboard/repair-flow-create-quote-modal";
import RepairFlowQuotesTable from "@/components/dashboard/repair-flow-quotes-table";
import RepairFlowJobAttachmentsModal from "@/components/dashboard/repair-flow-job-attachments-modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import QuotePrintPreview from "@/components/dashboard/quote-print-preview";
import RepairFlowFlowQuotePrintPreview from "@/components/dashboard/repair-flow-flow-quote-print-preview";
import SalesCommissionModal from "@/components/dashboard/sales-commission-modal";
import { getRepairFlowWorkOrderToolbarState } from "@/lib/repair-flow-work-order-toolbar";
import { getRepairFlowCustomerSendEligibility } from "@/lib/repair-flow-customer-send-eligibility";
import { printQuoteMotorTagQr } from "@/lib/print-quote-motor-tag-qr";
import { emptyMotorNameplate } from "@/lib/motor-nameplate-patch";
import {
  emptyPreliminaryFindings,
  buildPreliminaryFindingsPayload,
  getPreliminaryViewEntries,
} from "@/lib/repair-flow-preliminary-fields";

async function fetchJson(url, options) {
  const res = await fetch(url, { credentials: "include", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const INITIAL_DETAILED_FINDINGS = {
  windingCondition: "",
  coreDamage: "",
  bearingFailure: "",
  shaftIssues: "",
  additionalFindings: "",
};

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

const PAGE_MENU_IC = "h-4 w-4 shrink-0 text-secondary";

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

export default function RepairFlowJobDetailClient({
  jobId: jobIdProp,
  variant = "page",
  onClose,
  onListRefresh,
  onJobMeta,
  onFlowQuotesChange,
  onCustomerSendEligibility,
  onWorkOrderToolbarContext,
  /** Modal list only: open dashboard work order form (parent owns WorkOrderFormModal). */
  onOpenWorkOrderDraft,
}) {
  const toast = useToast();
  const params = useParams();
  const id = jobIdProp ?? params?.id;
  const isModal = variant === "modal";

  const [job, setJob] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [complaint, setComplaint] = useState("");
  const [motorNameplate, setMotorNameplate] = useState(() => emptyMotorNameplate());
  const [intakeNotes, setIntakeNotes] = useState("");

  const [inspComponent, setInspComponent] = useState("stator");
  const [detComponent, setDetComponent] = useState("stator");
  const [prelimFindings, setPrelimFindings] = useState(() => emptyPreliminaryFindings("stator"));
  const [detailedFindings, setDetailedFindings] = useState(() => ({ ...INITIAL_DETAILED_FINDINGS }));

  const [prelimModalOpen, setPrelimModalOpen] = useState(false);
  const [detailedModalOpen, setDetailedModalOpen] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [createQuoteModalOpen, setCreateQuoteModalOpen] = useState(false);
  const [createFinalQuoteModalOpen, setCreateFinalQuoteModalOpen] = useState(false);

  const [savingIntake, setSavingIntake] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);
  const [busy, setBusy] = useState(false);
  const [repairFlowWoModal, setRepairFlowWoModal] = useState(null);
  const [woLookupLoading, setWoLookupLoading] = useState(false);
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [pageSendingToCustomer, setPageSendingToCustomer] = useState(false);
  const [quotePrintId, setQuotePrintId] = useState(null);
  const [flowQuotePrintOpen, setFlowQuotePrintOpen] = useState(false);
  const [flowQuotePrintPreparing, setFlowQuotePrintPreparing] = useState(false);
  const [commissionModalOpen, setCommissionModalOpen] = useState(false);

  const handlePrintMotorTagQr = useCallback(async () => {
    const code = String(job?.jobNumber ?? "").trim();
    if (!code) {
      toast.error("Job number is required to print the tag.");
      return;
    }
    const ok = await printQuoteMotorTagQr(code, {
      customerName: job?.customerLabel || "",
      motor: job?.motorNameplate && typeof job.motorNameplate === "object" ? job.motorNameplate : null,
      motorFallbackLine: job?.motorLabel || "",
    });
    if (!ok) toast.error("Allow pop-ups to print the tag, or try again.");
  }, [job, toast]);

  const loadAll = useCallback(
    async (opts = {}) => {
      const { notifyList } = opts;
      if (!id) return;
      setLoading(true);
      try {
        const [jRes, iRes, qRes] = await Promise.all([
          fetchJson(`/api/dashboard/repair-flow/jobs/${id}`),
          fetchJson(`/api/dashboard/repair-flow/jobs/${id}/inspections`),
          fetchJson(`/api/dashboard/repair-flow/jobs/${id}/flow-quotes`),
        ]);
        const j = jRes.job;
        setJob(j);
        setComplaint(j.complaint || "");
        setMotorNameplate({ ...emptyMotorNameplate(), ...(j.motorNameplate || {}) });
        setIntakeNotes(j.intakeNotes || "");
        setInspections(Array.isArray(iRes) ? iRes : []);
        const quotesList = Array.isArray(qRes) ? qRes : [];
        setQuotes(quotesList);
        onFlowQuotesChange?.(quotesList);
        if (notifyList && isModal && onListRefresh) onListRefresh();
      } catch (e) {
        toast.error(e.message || "Failed to load");
        setJob(null);
        onFlowQuotesChange?.([]);
      } finally {
        setLoading(false);
      }
    },
    [id, toast, isModal, onListRefresh, onFlowQuotesChange]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (job && typeof onJobMeta === "function") {
      onJobMeta({
        jobNumber: job.jobNumber,
        customerLabel: job.customerLabel || "",
        motorLabel: job.motorLabel || "",
        motorNameplate: job.motorNameplate && typeof job.motorNameplate === "object" ? job.motorNameplate : null,
      });
    }
  }, [job, onJobMeta]);

  const sendEligibility = useMemo(() => getRepairFlowCustomerSendEligibility(job, quotes), [job, quotes]);

  useEffect(() => {
    if (typeof onCustomerSendEligibility === "function") {
      onCustomerSendEligibility(sendEligibility);
    }
  }, [sendEligibility, onCustomerSendEligibility]);

  const componentOptions = useMemo(() => {
    const opts = inspectionComponentsForMotorType(job?.motorType || "");
    return opts.map((o) => ({ value: o.value, label: o.label }));
  }, [job?.motorType]);

  useEffect(() => {
    if (componentOptions.length) {
      if (!componentOptions.some((o) => o.value === inspComponent)) {
        setInspComponent(componentOptions[0].value);
      }
      if (!componentOptions.some((o) => o.value === detComponent)) {
        setDetComponent(componentOptions[0].value);
      }
    }
  }, [componentOptions, inspComponent, detComponent]);

  useEffect(() => {
    if (!prelimModalOpen) return;
    setPrelimFindings(emptyPreliminaryFindings(inspComponent));
  }, [inspComponent, prelimModalOpen]);

  useEffect(() => {
    if (!detailedModalOpen) return;
    setDetailedFindings({ ...INITIAL_DETAILED_FINDINGS });
  }, [detComponent, detailedModalOpen]);

  const preliminaryInspectionsForQuote = useMemo(
    () => inspections.filter((i) => i.kind === "preliminary"),
    [inspections]
  );

  const detailedInspectionsForQuote = useMemo(
    () => inspections.filter((i) => i.kind === "detailed"),
    [inspections]
  );

  /** Final quote modal: show pre-inspections and detailed inspections together (same readings pattern as preliminary quote + Quotes linked job). */
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
        render: (_, row) => componentLabel(job?.motorType, row.component),
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
    [job?.motorType]
  );

  function openPrelimModal() {
    const first = componentOptions[0]?.value;
    if (first) setInspComponent(first);
    setPrelimModalOpen(true);
  }

  function openDetailedModal() {
    const first = componentOptions[0]?.value;
    if (first) setDetComponent(first);
    setDetailedModalOpen(true);
  }

  function closePrelimModal() {
    setPrelimModalOpen(false);
  }

  function closeDetailedModal() {
    setDetailedModalOpen(false);
  }

  async function saveIntake(e) {
    e.preventDefault();
    setSavingIntake(true);
    try {
      await fetchJson(`/api/dashboard/repair-flow/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaint,
          motorUpdates: motorNameplate,
          intakeNotes,
          moveToPreInspection: job?.phase === "intake",
        }),
      });
      toast.success("Saved.");
      await loadAll({ notifyList: true });
    } catch (err) {
      toast.error(err.message || "Save failed");
    } finally {
      setSavingIntake(false);
    }
  }

  function patchMotorNameplateField(key, value) {
    setMotorNameplate((prev) => ({ ...prev, [key]: value }));
  }

  async function submitPreliminaryInspection(e) {
    e.preventDefault();
    setSavingInspection(true);
    try {
      const f = buildPreliminaryFindingsPayload(inspComponent, prelimFindings);
      await fetchJson(`/api/dashboard/repair-flow/jobs/${id}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "preliminary", component: inspComponent, findings: f }),
      });
      toast.success("Inspection saved.");
      setPrelimModalOpen(false);
      setPrelimFindings(emptyPreliminaryFindings(inspComponent));
      await loadAll({ notifyList: true });
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSavingInspection(false);
    }
  }

  async function submitDetailedInspection(e) {
    e.preventDefault();
    setSavingInspection(true);
    try {
      const f = {
        windingCondition: detailedFindings.windingCondition,
        coreDamage: detailedFindings.coreDamage,
        bearingFailure: detailedFindings.bearingFailure,
        shaftIssues: detailedFindings.shaftIssues,
        additionalFindings: detailedFindings.additionalFindings,
      };
      await fetchJson(`/api/dashboard/repair-flow/jobs/${id}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "detailed", component: detComponent, findings: f }),
      });
      toast.success("Detailed inspection saved.");
      setDetailedModalOpen(false);
      setDetailedFindings({ ...INITIAL_DETAILED_FINDINGS });
      await loadAll({ notifyList: true });
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setSavingInspection(false);
    }
  }

  async function advance(action) {
    setBusy(true);
    try {
      await fetchJson(`/api/dashboard/repair-flow/jobs/${id}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      toast.success("Updated.");
      await loadAll({ notifyList: true });
    } catch (err) {
      toast.error(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function addLinkedRfq() {
    if (!id) return;
    setBusy(true);
    try {
      const data = await fetchJson(`/api/dashboard/repair-flow/jobs/${id}/add-crm-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const rfq = data.quote?.rfqNumber;
      toast.success(rfq ? `Draft RFQ ${rfq} added — edit it on the Quotes page or via the table.` : "Draft RFQ added.");
      await loadAll({ notifyList: true });
    } catch (err) {
      toast.error(err.message || "Failed to add RFQ");
    } finally {
      setBusy(false);
    }
  }

  const woToolbarState = useMemo(() => getRepairFlowWorkOrderToolbarState(job, quotes), [job, quotes]);

  const openCommissionModal = useCallback(() => {
    if (!id) return;
    setCommissionModalOpen(true);
  }, [id]);

  useEffect(() => {
    if (!isModal || typeof onWorkOrderToolbarContext !== "function") return;
    onWorkOrderToolbarContext(woToolbarState);
  }, [isModal, woToolbarState, onWorkOrderToolbarContext]);

  const handleCreateWorkOrderFromRepairFlow = useCallback(() => {
    if (!woToolbarState.canCreateWorkOrder) {
      toast.error(
        woToolbarState.createWorkOrderDisabledTitle || "Work order cannot be created for this job yet."
      );
      return;
    }
    const cid = woToolbarState.crmQuoteId;
    if (!cid) {
      toast.error("Set a primary final RFQ on this job first.");
      return;
    }
    setRepairFlowWoModal({ draftQuoteId: cid });
  }, [
    woToolbarState.crmQuoteId,
    woToolbarState.canCreateWorkOrder,
    woToolbarState.createWorkOrderDisabledTitle,
    toast,
  ]);

  const handleViewWorkOrderFromRepairFlow = useCallback(async () => {
    const cid = woToolbarState.crmQuoteId;
    if (!cid) {
      toast.error("Set a primary final RFQ on this job first.");
      return;
    }
    setWoLookupLoading(true);
    try {
      const res = await fetch("/api/dashboard/work-orders", {
        credentials: "include",
        cache: "no-store",
      });
      const list = await res.json();
      if (!res.ok) throw new Error(list.error || "Could not load work orders");
      const matches = list.filter(
        (w) =>
          String(w.quoteId) === String(cid) ||
          (id && String(w.repairFlowJobId || "") === String(id))
      );
      if (!matches.length) {
        toast.error("No work order exists for this job yet.");
        return;
      }
      matches.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setRepairFlowWoModal({ workOrderId: matches[0].id });
    } catch (e) {
      toast.error(e.message || "Could not open work order");
    } finally {
      setWoLookupLoading(false);
    }
  }, [woToolbarState.crmQuoteId, id, toast]);

  const pageJobActionsMenuItems = useMemo(() => {
    if (isModal || !job) return [];
    const hasQuotes = Array.isArray(quotes) && quotes.length > 0;
    const cid = woToolbarState.crmQuoteId;
    const items = [
      {
        key: "send",
        label: pageSendingToCustomer ? "Sending…" : "Send to customer",
        icon: pageSendingToCustomer ? (
          <FiRotateCw className={`${PAGE_MENU_IC} animate-spin`} aria-hidden />
        ) : (
          <FiSend className={PAGE_MENU_IC} aria-hidden />
        ),
        disabled: pageSendingToCustomer,
        title: sendEligibility.sendDisabledTitle || undefined,
        onClick: async () => {
          if (!id) return;
          if (!sendEligibility.canSend) {
            toast.error(sendEligibility.sendDisabledTitle || "Send to customer is not available for this job yet.");
            return;
          }
          setPageSendingToCustomer(true);
          try {
            const res = await fetch(`/api/dashboard/repair-flow/jobs/${id}/send-to-customer`, {
              method: "POST",
              credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Send failed");
            toast.success(data.message || "Sent to customer.");
            await loadAll({ notifyList: true });
          } catch (e) {
            toast.error(e.message || "Send failed");
          } finally {
            setPageSendingToCustomer(false);
          }
        },
      },
      {
        key: "printFlow",
        label: flowQuotePrintPreparing ? "Preparing…" : "Print job quotes",
        icon: <FiPrinter className={PAGE_MENU_IC} aria-hidden />,
        disabled: flowQuotePrintPreparing,
        title: !hasQuotes ? "Add a preliminary or final quote first" : undefined,
        onClick: () => {
          if (!hasQuotes) {
            toast.error("Add a preliminary or final flow quote before printing job quotes.");
            return;
          }
          setFlowQuotePrintOpen(true);
        },
      },
      {
        key: "printRfq",
        label: "Print RFQ sheet",
        icon: <FiPrinter className={PAGE_MENU_IC} aria-hidden />,
        title: !cid ? "Set a primary final RFQ on this job first" : undefined,
        onClick: () => {
          if (!cid) {
            toast.error("Set a primary final RFQ on this job first.");
            return;
          }
          setQuotePrintId(cid);
        },
      },
      {
        key: "tagQr",
        label: "Tag QR",
        icon: <LuQrCode className={PAGE_MENU_IC} aria-hidden />,
        title: !job?.jobNumber
          ? "Job number required"
          : "Print QR motor tag (technician scans → work order)",
        onClick: handlePrintMotorTagQr,
      },
    ];
    items.push(
      { key: "div-wo", type: "divider" },
      {
        key: "createWo",
        label: "Create work order",
        icon: <FiClipboard className={PAGE_MENU_IC} aria-hidden />,
        title: woToolbarState.canCreateWorkOrder
          ? "Open work order form — saved when you click Save on that form"
          : woToolbarState.createWorkOrderDisabledTitle || undefined,
        onClick: handleCreateWorkOrderFromRepairFlow,
      },
      {
        key: "viewWo",
        label: woLookupLoading ? "Opening…" : "View work order",
        icon: woLookupLoading ? (
          <FiRotateCw className={`${PAGE_MENU_IC} animate-spin`} aria-hidden />
        ) : (
          <FiEye className={PAGE_MENU_IC} aria-hidden />
        ),
        disabled: woLookupLoading,
        onClick: handleViewWorkOrderFromRepairFlow,
      }
    );
    items.push(
      { key: "div-tail", type: "divider" },
      {
        key: "commission",
        label: "Sales Commission",
        icon: <FiDollarSign className={PAGE_MENU_IC} aria-hidden />,
        onClick: openCommissionModal,
      }
    );
    return items;
  }, [
    isModal,
    job,
    quotes,
    woToolbarState,
    pageSendingToCustomer,
    sendEligibility.canSend,
    sendEligibility.sendDisabledTitle,
    flowQuotePrintPreparing,
    woLookupLoading,
    id,
    toast,
    loadAll,
    handleCreateWorkOrderFromRepairFlow,
    handleViewWorkOrderFromRepairFlow,
    handlePrintMotorTagQr,
    openCommissionModal,
  ]);

  if (loading && !job) {
    if (isModal) {
      return <p className="text-sm text-secondary">Loading…</p>;
    }
    return (
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  if (!job) {
    if (isModal) {
      return (
        <div className="space-y-3">
          <p className="text-sm text-secondary">Job not found.</p>
          {onClose ? (
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </div>
      );
    }
    return (
      <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
        <p className="text-secondary">Job not found.</p>
        <Link href="/dashboard/repair-flow" className="mt-4 inline-block text-primary hover:underline">
          Back to list
        </Link>
      </div>
    );
  }

  const phase = job.phase;
  const canEditIntake = phase === "intake" || phase === "pre_inspection";
  const showPreliminaryForm = phase === "intake" || phase === "pre_inspection";
  const showGenPreliminary = phase === "pre_inspection" && !job.preliminaryFlowQuoteId;
  const showGenFinalFromPreInspection = phase === "pre_inspection";
  const showPreliminaryActions =
    phase === "awaiting_preliminary_approval" && !String(job.finalFlowQuoteId || "").trim();
  const showDetailedForm = ["teardown_approved", "disassembly_detailed"].includes(phase);
  const showGenFinalFromDetailed = phase === "disassembly_detailed";
  const canAddLinkedRfq =
    job.customerId &&
    job.motorId &&
    !["closed_returned", "closed_scrap", "completed"].includes(phase);
  const showFinalActions = phase === "awaiting_final_approval";
  const showCompleteFromExecution = phase === "work_execution" || phase === "testing_qa";

  return (
    <div className={isModal ? "w-full min-w-0 space-y-6" : "mx-auto w-full max-w-6xl min-w-0 px-4 py-6"}>
      {!isModal ? (
        <div className="shrink-0 border-b border-border pb-4">
          <Link href="/dashboard/repair-flow" className="text-sm text-secondary hover:text-primary">
            ← Repair flow jobs
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-title">
                {job.jobNumber}{" "}
                <span className="text-base font-normal text-secondary">· {job.customerLabel}</span>
              </h1>
              <p className="mt-1 text-sm text-secondary">{job.motorLabel}</p>
              <div className="mt-2">
                <Badge variant={phaseBadgeVariant(phase)} className="rounded-full px-2.5 py-0.5 text-xs">
                  {REPAIR_FLOW_PHASE_LABELS[phase] || phase}
                </Badge>
              </div>
            </div>
            {pageJobActionsMenuItems.length > 0 ? (
              <ModalActionsDropdown items={pageJobActionsMenuItems} align="end" className="shrink-0" />
            ) : null}
          </div>
        </div>
      ) : (
        <div className="border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={phaseBadgeVariant(phase)} className="rounded-full px-2.5 py-0.5 text-xs">
              {REPAIR_FLOW_PHASE_LABELS[phase] || phase}
            </Badge>
            <span className="text-sm text-secondary">
              {job.motorLabel}
              {job.customerLabel ? ` · ${job.customerLabel}` : ""}
            </span>
          </div>
          {typeof onOpenWorkOrderDraft === "function" ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => {
                  if (!woToolbarState.canCreateWorkOrder) {
                    toast.error(
                      woToolbarState.createWorkOrderDisabledTitle ||
                        "Work order cannot be created for this job yet."
                    );
                    return;
                  }
                  const cid = String(woToolbarState.crmQuoteId || "").trim();
                  if (!cid) {
                    toast.error("Set a primary final RFQ on this job first.");
                    return;
                  }
                  onOpenWorkOrderDraft(cid);
                }}
              >
                <FiClipboard className="h-4 w-4 shrink-0" aria-hidden />
                Create work order
              </Button>
              <span className="text-xs text-secondary">
                Job {job.jobNumber} — work order is tied to this job and the primary final RFQ.
              </span>
            </div>
          ) : null}
        </div>
      )}

      <div className={isModal ? "min-w-0 w-full space-y-6 pb-2" : "mt-6 min-w-0 w-full space-y-8 pb-8"}>
        <section
          className={`w-full min-w-0 rounded-lg border border-border bg-card ${
            canEditIntake && !isModal ? "p-5" : "p-3 sm:p-4"
          }`}
        >
          <h2
            className={`font-semibold uppercase tracking-wide text-title ${
              canEditIntake && !isModal ? "text-sm" : "text-xs"
            }`}
          >
            Intake
          </h2>
          <Form
            id="repair-intake-form"
            onSubmit={saveIntake}
            className={`mt-3 w-full min-w-0 ${canEditIntake && !isModal ? "space-y-4" : "space-y-2.5"}`}
          >
            {canEditIntake ? (
              <Textarea
                label="Complaint"
                value={complaint}
                onChange={(e) => setComplaint(e.target.value)}
                rows={isModal ? 2 : 3}
                disabled={false}
              />
            ) : (
              <div className="min-w-0">
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">Complaint</div>
                <div className="max-h-24 overflow-y-auto rounded-md border border-border bg-muted/15 px-2 py-1.5 text-xs leading-snug text-title whitespace-pre-wrap dark:bg-muted/10">
                  {(complaint || "").trim() ? complaint : "—"}
                </div>
              </div>
            )}
            <div
              className={`w-full min-w-0 space-y-1.5 rounded-md border border-border bg-form-bg/50 ${
                canEditIntake && !isModal ? "p-3 sm:p-4" : "p-2 sm:p-2.5"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-secondary">Nameplate &amp; motor</p>
              {isModal ? (
                <>
                  <MotorNameplateCompactView values={motorNameplate} compact />
                  {canEditIntake ? (
                    <p className="text-[11px] leading-snug text-secondary">
                      To edit nameplate fields, open the{" "}
                      <Link href={`/dashboard/repair-flow/${id}`} className="text-primary hover:underline">
                        full page
                      </Link>
                      .
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  {canEditIntake ? (
                    <p className="text-xs text-secondary">Nameplate and motor details are stored on the linked motor record.</p>
                  ) : null}
                  {canEditIntake ? (
                    <MotorNameplateFormSections
                      values={motorNameplate}
                      onFieldChange={patchMotorNameplateField}
                      disabled={false}
                    />
                  ) : (
                    <MotorNameplateCompactView values={motorNameplate} compact />
                  )}
                </>
              )}
            </div>
            {canEditIntake ? (
              <Textarea
                label="Intake notes"
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                rows={2}
                disabled={false}
              />
            ) : (
              <div className="min-w-0">
                <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary">Intake notes</div>
                <div className="max-h-20 overflow-y-auto rounded-md border border-border bg-muted/15 px-2 py-1.5 text-xs leading-snug text-title whitespace-pre-wrap dark:bg-muted/10">
                  {(intakeNotes || "").trim() ? intakeNotes : "—"}
                </div>
              </div>
            )}
            {canEditIntake ? (
              <Button type="submit" form="repair-intake-form" variant="primary" size="sm" disabled={savingIntake}>
                {savingIntake ? "Saving…" : "Save intake"}
              </Button>
            ) : (
              <p className="text-[11px] leading-snug text-secondary">Intake is locked after pre-inspection advances.</p>
            )}
          </Form>
          {phase === "intake" ? (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-title">Quotes from intake</h3>
              <p className="mt-1 max-w-3xl text-xs text-secondary">
                Create a preliminary or final quote without recording a pre-inspection. Choose customer and motor in the
                quote form, then enter scope and costs manually (RFQ is created for final quotes). You can still add
                pre-inspections below for reference when quoting — they do not auto-fill the quote form.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!job.preliminaryFlowQuoteId ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setCreateQuoteModalOpen(true)}
                    disabled={busy}
                  >
                    Create Preliminary Quote
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setCreateFinalQuoteModalOpen(true)}
                  disabled={busy}
                >
                  Create Final Quote
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="flex min-h-[200px] w-full min-w-0 flex-col rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Inspections</h2>
              <p className="mt-1 text-xs text-secondary">
                Pre-inspection during intake; detailed rows after disassembly. Add from the buttons below.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {showPreliminaryForm ? (
                <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={openPrelimModal}>
                  Add pre-inspection
                </Button>
              ) : null}
              {showDetailedForm ? (
                <Button type="button" variant="primary" size="sm" className="shrink-0" onClick={openDetailedModal}>
                  Add detailed inspection
                </Button>
              ) : null}
            </div>
          </div>
          <div className="min-h-0 min-w-0 w-full flex-1">
            <Table
              columns={inspectionColumns}
              data={inspections}
              rowKey="id"
              loading={loading}
              emptyMessage="No inspections yet. Use Add pre-inspection or Add detailed inspection when available."
              fillHeight={false}
              paginateClientSide={false}
              responsive
              onRefresh={loadAll}
            />
          </div>
        </section>

        {showGenPreliminary || showGenFinalFromPreInspection ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full text-xs font-medium uppercase tracking-wide text-secondary">Quotes (pre-inspection)</span>
            {showGenPreliminary ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCreateQuoteModalOpen(true)}
                disabled={busy}
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
                disabled={busy}
              >
                Create Final Quote
              </Button>
            ) : null}
            {preliminaryInspectionsForQuote.length === 0 && (showGenPreliminary || showGenFinalFromPreInspection) ? (
              <span className="self-center text-xs text-secondary">
                Pre-inspection is optional — add scope manually in the quote form, or record one first for reference when
                quoting.
              </span>
            ) : null}
          </div>
        ) : null}

        {showGenFinalFromDetailed ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setCreateFinalQuoteModalOpen(true)}
              disabled={busy}
            >
              Create Final Quote
            </Button>
            {finalQuoteInspectionsForModal.length === 0 ? (
              <span className="self-center text-xs text-secondary">
                Optional: add detailed inspections for reference, or enter scope manually in Create Final Quote.
              </span>
            ) : null}
          </div>
        ) : null}

        {showPreliminaryActions ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/10 p-4">
            <span className="w-full text-sm font-medium text-title">Preliminary decision</span>
            <p className="w-full text-xs text-secondary">
              The customer can take these actions from the link when you send them the preliminary quote from the job
              header (<span className="text-title">Actions</span> →{" "}
              <span className="text-title">Send quote to customer</span>). You can also choose an option here if the
              customer contacted you directly (phone, email, etc.).
            </p>
            <Button type="button" variant="primary" size="sm" onClick={() => advance("approve_preliminary")} disabled={busy}>
              Approve for disassembly
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => advance("reject_preliminary")} disabled={busy}>
              Reject / return
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => advance("scrap_preliminary")} disabled={busy}>
              Want to scrap
            </Button>
          </div>
        ) : null}

        {phase === "teardown_approved" ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={() => advance("start_disassembly")} disabled={busy}>
              Start disassembly / detailed inspection
            </Button>
          </div>
        ) : null}

        {showFinalActions ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/10 p-4">
            <span className="w-full text-sm font-medium text-title">Final repair decision</span>
            <Button type="button" variant="primary" size="sm" onClick={() => advance("approve_final")} disabled={busy}>
              Approve repair (lock quote, start execution)
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => advance("reject_final")} disabled={busy}>
              Reject / return
            </Button>
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-title">Quotes</h2>
              <p className="mt-1 max-w-3xl text-xs text-secondary">
                Final repair quotes are the same RFQs as on the Quotes tab — edits there appear here. Pre-inspection
                pipeline rows are separate until you add an RFQ. Use Add RFQ for an extra draft linked to this job.
                Attach photos and documents for this job using <span className="text-title">Attachments</span> (not per
                RFQ).
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-1.5"
                onClick={() => setAttachmentsModalOpen(true)}
              >
                <FiPaperclip className="h-4 w-4 shrink-0" aria-hidden />
                Attachments
                {Array.isArray(job.attachments) && job.attachments.length > 0 ? (
                  <Badge variant="default" className="rounded-full px-2 py-0 text-[10px] tabular-nums">
                    {job.attachments.length}
                  </Badge>
                ) : null}
              </Button>
              {canAddLinkedRfq ? (
                <Button type="button" variant="outline" size="sm" onClick={addLinkedRfq} disabled={busy}>
                  Add RFQ
                </Button>
              ) : null}
            </div>
          </div>
          <div className="mt-4 min-w-0">
            <RepairFlowQuotesTable quotes={quotes} loading={loading} />
          </div>
        </section>

        {showCompleteFromExecution ? (
          <div className="flex flex-wrap gap-2 rounded-lg border border-border bg-muted/10 p-4">
            <Button type="button" variant="primary" size="sm" onClick={() => advance("complete_job")} disabled={busy}>
              Complete job
            </Button>
          </div>
        ) : null}

        {["closed_returned", "closed_scrap", "completed"].includes(phase) ? (
          <p className="text-sm text-secondary">
            This job is closed or completed. Legacy quotes and work orders are unchanged; use those menus for historical
            workflow if needed.
          </p>
        ) : null}
      </div>

      <RepairFlowPreliminaryInspectionModal
        open={prelimModalOpen}
        onClose={closePrelimModal}
        formId="prelim-insp-form"
        saving={savingInspection}
        componentOptions={componentOptions}
        inspComponent={inspComponent}
        onInspComponentChange={setInspComponent}
        prelimFindings={prelimFindings}
        onPrelimFieldChange={(key, value) => setPrelimFindings((f) => ({ ...f, [key]: value }))}
        onSubmit={submitPreliminaryInspection}
      />

      <Modal
        open={detailedModalOpen}
        onClose={closeDetailedModal}
        title="Add detailed inspection"
        width="min(960px, 94vw)"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeDetailedModal}>
              Cancel
            </Button>
            <Button type="submit" form="detailed-insp-form" variant="primary" size="sm" disabled={savingInspection}>
              {savingInspection ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="detailed-insp-form" onSubmit={submitDetailedInspection} className="space-y-3">
          <p className="text-xs text-secondary">Confirmed findings after the motor is opened — one entry per component.</p>
          <Select
            label="Component"
            options={componentOptions}
            value={detComponent}
            onChange={(e) => setDetComponent(e.target.value)}
            searchable={false}
          />
          <Input
            label="Winding condition"
            value={detailedFindings.windingCondition}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, windingCondition: e.target.value }))}
          />
          <Input
            label="Core / lamination damage"
            value={detailedFindings.coreDamage}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, coreDamage: e.target.value }))}
          />
          <Input
            label="Bearing"
            value={detailedFindings.bearingFailure}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, bearingFailure: e.target.value }))}
          />
          <Input
            label="Shaft / mechanical"
            value={detailedFindings.shaftIssues}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, shaftIssues: e.target.value }))}
          />
          <Textarea
            label="Additional findings"
            value={detailedFindings.additionalFindings}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, additionalFindings: e.target.value }))}
            rows={2}
          />
        </Form>
      </Modal>

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
              <span className="text-secondary">
                {componentLabel(job?.motorType, viewingInspection.component)}
              </span>
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

      {!isModal && id ? (
        <>
          <WorkOrderFormModal
            open={!!repairFlowWoModal}
            draftQuoteId={repairFlowWoModal?.draftQuoteId ?? null}
            workOrderId={repairFlowWoModal?.workOrderId ?? null}
            onClose={() => setRepairFlowWoModal(null)}
            onAfterSave={() => loadAll({ notifyList: true })}
            zIndex={60}
          />
          <RepairFlowFlowQuotePrintPreview
            open={flowQuotePrintOpen}
            jobId={id}
            onClose={() => {
              setFlowQuotePrintOpen(false);
              setFlowQuotePrintPreparing(false);
            }}
            onPrepareStateChange={setFlowQuotePrintPreparing}
          />
          {quotePrintId ? (
            <QuotePrintPreview quoteId={quotePrintId} open onClose={() => setQuotePrintId(null)} />
          ) : null}
          <SalesCommissionModal
            open={commissionModalOpen}
            onClose={() => setCommissionModalOpen(false)}
            repairFlowJobId={id || ""}
            jobNumber={job?.jobNumber ? String(job.jobNumber) : ""}
          />
        </>
      ) : null}

      {job && id ? (
        <>
          <RepairFlowCreateQuoteModal
            open={createQuoteModalOpen}
            onClose={() => setCreateQuoteModalOpen(false)}
            jobId={id}
            job={job}
            preliminaryInspections={preliminaryInspectionsForQuote}
            allowWithoutInspection={phase === "intake"}
            onSuccess={() => loadAll({ notifyList: true })}
          />
          <RepairFlowCreateQuoteModal
            mode="final"
            open={createFinalQuoteModalOpen}
            onClose={() => setCreateFinalQuoteModalOpen(false)}
            jobId={id}
            job={job}
            preliminaryInspections={finalQuoteInspectionsForModal}
            allowWithoutInspection={phase === "intake"}
            onSuccess={() => loadAll({ notifyList: true })}
          />
          <RepairFlowJobAttachmentsModal
            open={attachmentsModalOpen}
            onClose={() => setAttachmentsModalOpen(false)}
            jobId={id}
            jobNumber={job.jobNumber}
            onAfterChange={() => loadAll({ notifyList: false })}
          />
        </>
      ) : null}
    </div>
  );
}
