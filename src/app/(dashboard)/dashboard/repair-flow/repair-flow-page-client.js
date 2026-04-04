"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiPlus, FiEye, FiPrinter, FiTrash2, FiSend, FiClipboard, FiRotateCw } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import RepairFlowNewJobForm from "@/components/dashboard/repair-flow-new-job-form";
import RepairFlowJobDetailClient from "./[id]/repair-flow-job-detail-client";
import RepairFlowFlowQuotePrintPreview from "@/components/dashboard/repair-flow-flow-quote-print-preview";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import { REPAIR_FLOW_PHASE_LABELS, phaseBadgeVariant } from "@/lib/repair-flow-constants";
import { getRepairFlowWorkOrderToolbarState } from "@/lib/repair-flow-work-order-toolbar";

const MENU_IC = "h-4 w-4 shrink-0 text-secondary";

export default function RepairFlowPageClient() {
  const toast = useToast();
  const confirm = useConfirm();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createFormKey, setCreateFormKey] = useState(0);
  const [createWorkflowStep, setCreateWorkflowStep] = useState("create");
  const [formLoading, setFormLoading] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const formSavingRef = useRef(false);

  const onFormStatusChange = useCallback(({ loading, saving }) => {
    formSavingRef.current = saving;
    setFormLoading(loading);
    setFormSaving(saving);
  }, []);

  const modalActionsDisabled = formLoading || formSaving;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/repair-flow/jobs", { credentials: "include" });
      const data = await res.json();
      const all = Array.isArray(data) ? data : [];
      setJobs(all);
    } catch {
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const closeCreateModal = useCallback(() => {
    if (formSavingRef.current) return;
    setCreateOpen(false);
  }, []);

  const [viewJobId, setViewJobId] = useState(null);
  const [viewJobHeader, setViewJobHeader] = useState(null);
  const [viewJobHasFlowQuotes, setViewJobHasFlowQuotes] = useState(false);
  const [flowQuotePrintOpen, setFlowQuotePrintOpen] = useState(false);
  const [flowQuotePrintPreparing, setFlowQuotePrintPreparing] = useState(false);
  const [customerSend, setCustomerSend] = useState({
    canSend: false,
    mode: null,
    sendDisabledTitle: "",
  });
  const [sendingToCustomer, setSendingToCustomer] = useState(false);
  const [workOrderToolbarCtx, setWorkOrderToolbarCtx] = useState(() =>
    getRepairFlowWorkOrderToolbarState(null, [])
  );
  const [repairListWoModal, setRepairListWoModal] = useState(null);
  const [listWoLookupLoading, setListWoLookupLoading] = useState(false);

  const onWorkOrderToolbarContext = useCallback((ctx) => {
    setWorkOrderToolbarCtx(ctx);
  }, []);

  const openJobModal = useCallback((jobId) => {
    setViewJobHeader(null);
    setViewJobHasFlowQuotes(false);
    setViewJobId(jobId);
  }, []);

  const closeJobModal = useCallback(() => {
    setViewJobId(null);
    setViewJobHeader(null);
    setViewJobHasFlowQuotes(false);
    setFlowQuotePrintOpen(false);
    setFlowQuotePrintPreparing(false);
    setCustomerSend({ canSend: false, mode: null, sendDisabledTitle: "" });
    setSendingToCustomer(false);
    setWorkOrderToolbarCtx(getRepairFlowWorkOrderToolbarState(null, []));
    setRepairListWoModal(null);
    setListWoLookupLoading(false);
  }, []);

  const viewJobToolbarItems = useMemo(() => {
    const printDisabled = !viewJobHasFlowQuotes || flowQuotePrintPreparing;
    const base = [
      {
        key: "print",
        label: flowQuotePrintPreparing ? "Preparing…" : "Print quote",
        icon: <FiPrinter className={MENU_IC} aria-hidden />,
        disabled: printDisabled,
        title: !viewJobHasFlowQuotes ? "Add a preliminary or final flow quote first" : undefined,
        onClick: () => setFlowQuotePrintOpen(true),
      },
      {
        key: "send",
        label: sendingToCustomer ? "Sending…" : "Send quote to customer",
        icon: <FiSend className={MENU_IC} aria-hidden />,
        disabled: sendingToCustomer || !customerSend.canSend,
        title: customerSend.sendDisabledTitle || undefined,
        onClick: async () => {
          if (!viewJobId) return;
          setSendingToCustomer(true);
          try {
            const res = await fetch(`/api/dashboard/repair-flow/jobs/${viewJobId}/send-to-customer`, {
              method: "POST",
              credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Send failed");
            toast.success(data.message || "Sent to customer.");
          } catch (e) {
            toast.error(e.message || "Send failed");
          } finally {
            setSendingToCustomer(false);
          }
        },
      },
    ];
    if (!workOrderToolbarCtx.showWorkOrderActions) return base;
    return [
      ...base,
      { key: "div-wo", type: "divider" },
      {
        key: "createWo",
        label: "Create work order",
        icon: <FiClipboard className={MENU_IC} aria-hidden />,
        disabled: !workOrderToolbarCtx.canCreateWorkOrder,
        title: workOrderToolbarCtx.canCreateWorkOrder
          ? "Open work order form — saved when you click Save on that form"
          : workOrderToolbarCtx.createWorkOrderDisabledTitle || undefined,
        onClick: () => {
          const cid = workOrderToolbarCtx.crmQuoteId;
          if (!cid) return;
          setRepairListWoModal({ draftQuoteId: cid });
        },
      },
      {
        key: "viewWo",
        label: listWoLookupLoading ? "Opening…" : "View work order",
        icon: listWoLookupLoading ? (
          <FiRotateCw className={`${MENU_IC} animate-spin`} aria-hidden />
        ) : (
          <FiEye className={MENU_IC} aria-hidden />
        ),
        disabled: !workOrderToolbarCtx.crmQuoteId || listWoLookupLoading,
        onClick: async () => {
          const cid = workOrderToolbarCtx.crmQuoteId;
          if (!cid) return;
          setListWoLookupLoading(true);
          try {
            const res = await fetch("/api/dashboard/work-orders", {
              credentials: "include",
              cache: "no-store",
            });
            const list = await res.json();
            if (!res.ok) throw new Error(list.error || "Could not load work orders");
            const matches = list.filter((w) => String(w.quoteId) === String(cid));
            if (!matches.length) {
              toast.error("No work order exists for this quote yet.");
              return;
            }
            matches.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setRepairListWoModal({ workOrderId: matches[0].id });
          } catch (e) {
            toast.error(e.message || "Could not open work order");
          } finally {
            setListWoLookupLoading(false);
          }
        },
      },
    ];
  }, [
    viewJobHasFlowQuotes,
    flowQuotePrintPreparing,
    customerSend.canSend,
    customerSend.sendDisabledTitle,
    sendingToCustomer,
    viewJobId,
    toast,
    workOrderToolbarCtx.showWorkOrderActions,
    workOrderToolbarCtx.canCreateWorkOrder,
    workOrderToolbarCtx.createWorkOrderDisabledTitle,
    workOrderToolbarCtx.crmQuoteId,
    listWoLookupLoading,
  ]);

  const onFlowQuotesChange = useCallback((list) => {
    setViewJobHasFlowQuotes(Array.isArray(list) && list.length > 0);
  }, []);

  const closeFlowQuotePrint = useCallback(() => {
    setFlowQuotePrintOpen(false);
    setFlowQuotePrintPreparing(false);
  }, []);

  const deleteJob = useCallback(
    async (row) => {
      const label = row.jobNumber || row.id;
      const ok = await confirm({
        title: "Delete this repair job?",
        message: `Permanently delete ${label}? Inspections, flow quotes, and any linked draft RFQs for this job will be removed. This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      setDeletingId(row.id);
      try {
        const res = await fetch(`/api/dashboard/repair-flow/jobs/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Delete failed");
        toast.success("Repair job deleted.");
        if (viewJobId === row.id) closeJobModal();
        await load();
      } catch (e) {
        toast.error(e.message || "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, load, toast, viewJobId, closeJobModal]
  );

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 96,
        render: (_, row) => (
          <div className="flex flex-nowrap items-center gap-0.5">
            <button
              type="button"
              onClick={() => openJobModal(row.id)}
              className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="View job"
              title="View"
            >
              <FiEye className="h-4 w-4 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => deleteJob(row)}
              disabled={deletingId === row.id}
              className="inline-flex rounded-md p-2 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
              aria-label="Delete job"
              title="Delete"
            >
              <FiTrash2 className="h-4 w-4 shrink-0" />
            </button>
          </div>
        ),
      },
      { key: "jobNumber", label: "Job #" },
      { key: "customerLabel", label: "Customer" },
      { key: "motorLabel", label: "Motor" },
      {
        key: "phase",
        label: "Phase",
        render: (p) => (
          <Badge variant={phaseBadgeVariant(p)} className="rounded-full px-2.5 py-0.5 text-xs">
            {REPAIR_FLOW_PHASE_LABELS[p] || p}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        label: "Updated",
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
    ],
    [openJobModal, deleteJob, deletingId]
  );

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Job Write-Up</h1>
          <p className="mt-1 max-w-2xl text-sm text-secondary">
            Inspection-driven pipeline from intake through preliminary and final quotes and approval gates. After the
            final repair quote is approved, use <span className="text-title">Actions</span> →{" "}
            <span className="text-title">Create work order</span> (final flow quote must be linked to a CRM RFQ). Jobs stay
            on this list so you can keep working the write-up alongside Quotes and Work orders.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="shrink-0"
          onClick={() => {
            setCreateFormKey((k) => k + 1);
            setCreateWorkflowStep("create");
            setCreateOpen(true);
          }}
        >
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Create repair job
        </Button>
      </div>

      <div className="mt-6">
        <Table
          columns={columns}
          data={jobs}
          rowKey="id"
          loading={loading}
          emptyMessage="No jobs yet. Create one to start intake."
          onRefresh={load}
        />
      </div>

      <Modal
        open={createOpen}
        onClose={closeCreateModal}
        title={createWorkflowStep === "postCreate" ? "New job — pre-inspection" : "New repair job"}
        width="min(1200px, 94vw)"
        headerClassName="flex-wrap"
        showClose={!formSaving}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeCreateModal} disabled={formSaving}>
              Cancel
            </Button>
            {createWorkflowStep === "create" ? (
              <Button
                type="submit"
                form="repair-flow-new-job-modal"
                variant="primary"
                size="sm"
                disabled={modalActionsDisabled}
              >
                {formSaving ? "Creating…" : "Create job"}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="w-full min-w-0 max-w-none">
          <p className="mb-4 w-full text-sm text-secondary">
            Create the job first, then add pre-inspections as needed. Saved inspections appear in the table below; close
            this dialog when done or open the job from the list.
          </p>
          <RepairFlowNewJobForm
            key={createFormKey}
            formId="repair-flow-new-job-modal"
            embeddedInModal
            onFormStatusChange={onFormStatusChange}
            onWorkflowStepChange={setCreateWorkflowStep}
            onJobCreated={() => load()}
          />
        </div>
      </Modal>

      <Modal
        open={!!viewJobId}
        onClose={closeJobModal}
        title={
          viewJobHeader?.jobNumber
            ? `${viewJobHeader.jobNumber} · ${viewJobHeader.customerLabel || "Customer"}`
            : "Repair job"
        }
        width="min(1200px, 94vw)"
        headerClassName="flex-wrap"
        actions={
          <>
            {viewJobId ? <ModalActionsDropdown items={viewJobToolbarItems} /> : null}
            <Button type="button" variant="outline" size="sm" onClick={closeJobModal}>
              Close
            </Button>
          </>
        }
      >
        <div className="w-full min-w-0 max-w-none">
          {viewJobId ? (
            <RepairFlowJobDetailClient
              key={viewJobId}
              jobId={viewJobId}
              variant="modal"
              onClose={closeJobModal}
              onListRefresh={load}
              onJobMeta={setViewJobHeader}
              onFlowQuotesChange={onFlowQuotesChange}
              onCustomerSendEligibility={setCustomerSend}
              onWorkOrderToolbarContext={onWorkOrderToolbarContext}
            />
          ) : null}
        </div>
      </Modal>

      {viewJobId ? (
        <RepairFlowFlowQuotePrintPreview
          open={flowQuotePrintOpen}
          jobId={viewJobId}
          onClose={closeFlowQuotePrint}
          onPrepareStateChange={setFlowQuotePrintPreparing}
        />
      ) : null}

      <WorkOrderFormModal
        open={!!repairListWoModal}
        draftQuoteId={repairListWoModal?.draftQuoteId ?? null}
        workOrderId={repairListWoModal?.workOrderId ?? null}
        onClose={() => setRepairListWoModal(null)}
        onAfterSave={load}
        zIndex={60}
      />
    </div>
  );
}
