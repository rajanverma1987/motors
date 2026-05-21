"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import RepairFlowPreliminaryInspectionModal from "@/components/dashboard/repair-flow-preliminary-inspection-modal";
import { inspectionComponentsForMotorType } from "@/lib/repair-flow-constants";
import {
  emptyPreliminaryFindings,
  buildPreliminaryFindingsPayload,
  getPreliminaryViewEntries,
  getDetailedViewEntries,
} from "@/lib/repair-flow-preliminary-fields";
import { sortRowsClient } from "@/lib/client-table-sort";

const INITIAL_DETAILED_FINDINGS = {
  windingCondition: "",
  coreDamage: "",
  bearingFailure: "",
  shaftIssues: "",
  additionalFindings: "",
};

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

/**
 * Pre-inspection and detailed inspections for a saved work order.
 */
export default function WorkOrderInspectionsPanel({ workOrderId, motorClass = "AC", disabled = false }) {
  const toast = useToast();
  const woId = String(workOrderId || "").trim();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);

  const [inspComponent, setInspComponent] = useState("stator");
  const [detComponent, setDetComponent] = useState("stator");
  const [prelimFindings, setPrelimFindings] = useState(() => emptyPreliminaryFindings("stator"));
  const [detailedFindings, setDetailedFindings] = useState(() => ({ ...INITIAL_DETAILED_FINDINGS }));

  const [prelimModalOpen, setPrelimModalOpen] = useState(false);
  const [detailedModalOpen, setDetailedModalOpen] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [inspectionSort, setInspectionSort] = useState({ key: null, direction: "asc" });

  const componentOptions = useMemo(
    () => inspectionComponentsForMotorType(motorClass || "AC"),
    [motorClass]
  );

  const load = useCallback(async () => {
    if (!woId) {
      setInspections([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/inspections`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || "Failed to load inspections");
      setInspections(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load inspections");
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [woId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!prelimModalOpen) return;
    setPrelimFindings(emptyPreliminaryFindings(inspComponent));
  }, [inspComponent, prelimModalOpen]);

  useEffect(() => {
    if (!detailedModalOpen) return;
    setDetailedFindings({ ...INITIAL_DETAILED_FINDINGS });
  }, [detComponent, detailedModalOpen]);

  const getInspectionSortValue = useCallback(
    (row, key) => {
      if (key === "recorded") {
        const t = row?.createdAt ? new Date(row.createdAt).getTime() : NaN;
        return Number.isFinite(t) ? t : null;
      }
      if (key === "summary") return inspectionSummaryRow(row);
      if (key === "component") return componentLabel(motorClass, row.component);
      return row?.[key];
    },
    [motorClass]
  );

  const sortedInspections = useMemo(
    () => sortRowsClient(inspections, inspectionSort, getInspectionSortValue),
    [inspections, inspectionSort, getInspectionSortValue]
  );

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
            disabled={disabled}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
            aria-label="View inspection"
          >
            <FiEye className="h-4 w-4 shrink-0" />
          </button>
        ),
      },
      {
        key: "kind",
        label: "Kind",
        sortable: true,
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
        sortable: true,
        render: (_, row) => componentLabel(motorClass, row.component),
      },
      {
        key: "recorded",
        label: "Recorded",
        sortable: true,
        render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"),
      },
      {
        key: "summary",
        label: "Summary",
        sortable: true,
        render: (_, row) => <span className="text-secondary">{inspectionSummaryRow(row)}</span>,
      },
    ],
    [motorClass, disabled]
  );

  async function submitPreliminaryInspection(e) {
    e.preventDefault();
    if (!woId) return;
    setSavingInspection(true);
    try {
      const f = buildPreliminaryFindingsPayload(inspComponent, prelimFindings);
      const res = await fetch(`/api/dashboard/work-orders/${woId}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind: "preliminary", component: inspComponent, findings: f }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Pre-inspection saved.");
      setPrelimModalOpen(false);
      setPrelimFindings(emptyPreliminaryFindings(inspComponent));
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingInspection(false);
    }
  }

  async function submitDetailedInspection(e) {
    e.preventDefault();
    if (!woId) return;
    setSavingInspection(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "detailed",
          component: detComponent,
          findings: { ...detailedFindings },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Detailed inspection saved.");
      setDetailedModalOpen(false);
      setDetailedFindings({ ...INITIAL_DETAILED_FINDINGS });
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingInspection(false);
    }
  }

  if (!woId) {
    return (
      <p className="rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-secondary">
        Save the work order first to record inspections.
      </p>
    );
  }

  return (
    <section className="w-full min-w-0 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-title">Inspections</h3>
          <p className="mt-1 text-xs text-secondary">
            Pre-inspection before teardown; detailed inspection after the motor is opened.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled || savingInspection}
            onClick={() => {
              const first = componentOptions[0]?.value;
              if (first) setInspComponent(first);
              setPrelimModalOpen(true);
            }}
          >
            Add pre-inspection
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || savingInspection}
            onClick={() => {
              const first = componentOptions[0]?.value;
              if (first) setDetComponent(first);
              setDetailedModalOpen(true);
            }}
          >
            Add detailed inspection
          </Button>
        </div>
      </div>
      <Table
        columns={inspectionColumns}
        data={sortedInspections}
        rowKey="id"
        loading={loading}
        emptyMessage="No inspections yet."
        fillHeight={false}
        paginateClientSide={false}
        responsive
        onRefresh={load}
        sortState={inspectionSort}
        onSort={(key, direction) => setInspectionSort({ key, direction })}
      />

      <RepairFlowPreliminaryInspectionModal
        open={prelimModalOpen}
        onClose={() => !savingInspection && setPrelimModalOpen(false)}
        formId="wo-prelim-insp-form"
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
        onClose={() => !savingInspection && setDetailedModalOpen(false)}
        title="Add detailed inspection"
        width="min(960px, 94vw)"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetailedModalOpen(false)}
              disabled={savingInspection}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="wo-detailed-insp-form"
              variant="primary"
              size="sm"
              disabled={savingInspection}
            >
              {savingInspection ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="wo-detailed-insp-form" onSubmit={submitDetailedInspection} className="space-y-3">
          <p className="text-xs text-secondary">
            Confirmed findings after the motor is opened — one entry per component.
          </p>
          <Select
            label="Component"
            options={componentOptions}
            value={detComponent}
            onChange={(e) => setDetComponent(e.target.value)}
            searchable={false}
            disabled={savingInspection}
          />
          <Input
            label="Winding condition"
            value={detailedFindings.windingCondition}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, windingCondition: e.target.value }))}
            disabled={savingInspection}
          />
          <Input
            label="Core / lamination damage"
            value={detailedFindings.coreDamage}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, coreDamage: e.target.value }))}
            disabled={savingInspection}
          />
          <Input
            label="Bearing"
            value={detailedFindings.bearingFailure}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, bearingFailure: e.target.value }))}
            disabled={savingInspection}
          />
          <Input
            label="Shaft / mechanical"
            value={detailedFindings.shaftIssues}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, shaftIssues: e.target.value }))}
            disabled={savingInspection}
          />
          <Textarea
            label="Additional findings"
            value={detailedFindings.additionalFindings}
            onChange={(e) => setDetailedFindings((f) => ({ ...f, additionalFindings: e.target.value }))}
            rows={2}
            disabled={savingInspection}
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
                {componentLabel(motorClass, viewingInspection.component)}
              </span>
              <span className="text-secondary">
                {viewingInspection.createdAt ? new Date(viewingInspection.createdAt).toLocaleString() : ""}
              </span>
            </div>
            <dl className="space-y-3">
              {viewingInspection.kind === "detailed"
                ? getDetailedViewEntries(viewingInspection.findings).map(({ key, label, text }) => (
                    <div key={key}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
                      <dd className="mt-0.5 whitespace-pre-wrap text-title">{text}</dd>
                    </div>
                  ))
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
    </section>
  );
}
