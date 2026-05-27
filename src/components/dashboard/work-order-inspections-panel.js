"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { useToast } from "@/components/toast-provider";
import MotorInspectionModal from "@/components/dashboard/motor-inspection-modal";
import MotorInspectionViewContent from "@/components/dashboard/motor-inspection-view-content";
import {
  buildMotorInspectionFindingsPayload,
  emptyMotorInspectionFindings,
  getMotorInspectionViewEntries,
  mergeMotorInspectionFindings,
  motorInspectionSummary,
  usesUnifiedMotorInspectionFindings,
} from "@/lib/motor-inspection-fields";
import { inspectionComponentForSave } from "@/lib/motor-inspection-api";
import {
  getDetailedViewEntries,
  getPreliminaryViewEntries,
} from "@/lib/repair-flow-preliminary-fields";
import { sortRowsClient } from "@/lib/client-table-sort";

function kindLabel(kind) {
  if (kind === "preliminary") return "Pre-inspection";
  if (kind === "detailed") return "Detailed";
  return kind || "—";
}

/**
 * Pre-inspection and detailed inspections for a saved work order (unified motor form).
 */
export default function WorkOrderInspectionsPanel({
  workOrderId,
  disabled = false,
  secondary = false,
}) {
  const toast = useToast();
  const woId = String(workOrderId || "").trim();

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingInspection, setSavingInspection] = useState(false);

  const [findings, setFindings] = useState(() => emptyMotorInspectionFindings());
  const [modalKind, setModalKind] = useState(null);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [inspectionSort, setInspectionSort] = useState({ key: null, direction: "asc" });

  const prelimModalOpen = modalKind === "preliminary";
  const detailedModalOpen = modalKind === "detailed";

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

  const latestPreliminaryFindings = useMemo(() => {
    const pre = inspections.filter((i) => i.kind === "preliminary");
    if (!pre.length) return null;
    const sorted = [...pre].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sorted[0]?.findings;
  }, [inspections]);

  function openPrelimModal() {
    setFindings(emptyMotorInspectionFindings());
    setModalKind("preliminary");
  }

  function openDetailedModal() {
    setFindings(
      latestPreliminaryFindings
        ? mergeMotorInspectionFindings(latestPreliminaryFindings)
        : emptyMotorInspectionFindings()
    );
    setModalKind("detailed");
  }

  const getInspectionSortValue = useCallback((row, key) => {
    if (key === "recorded") {
      const t = row?.createdAt ? new Date(row.createdAt).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    if (key === "summary") return motorInspectionSummary(row.findings);
    if (key === "kind") return kindLabel(row.kind);
    return row?.[key];
  }, []);

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
            {kindLabel(row.kind)}
          </Badge>
        ),
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
        render: (_, row) => (
          <span className="text-secondary">
            {usesUnifiedMotorInspectionFindings(row.findings)
              ? motorInspectionSummary(row.findings)
              : motorInspectionSummary(row.findings) !== "—"
                ? motorInspectionSummary(row.findings)
                : "—"}
          </span>
        ),
      },
    ],
    [disabled]
  );

  async function submitInspection(e, kind) {
    e.preventDefault();
    if (!woId) return;
    setSavingInspection(true);
    try {
      const res = await fetch(`/api/dashboard/work-orders/${woId}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind,
          component: inspectionComponentForSave(),
          findings: buildMotorInspectionFindingsPayload(findings),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(kind === "detailed" ? "Detailed inspection saved." : "Pre-inspection saved.");
      setModalKind(null);
      setFindings(emptyMotorInspectionFindings());
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSavingInspection(false);
    }
  }

  function viewEntriesFor(row) {
    if (usesUnifiedMotorInspectionFindings(row.findings)) {
      return getMotorInspectionViewEntries(row.findings);
    }
    if (row.kind === "detailed") {
      return getDetailedViewEntries(row.findings);
    }
    return getPreliminaryViewEntries(row.component, row.findings);
  }

  if (!woId) {
    return (
      <p className="rounded-lg border border-border bg-card/80 px-3 py-2 text-sm text-secondary">
        Save the work order first to record inspections.
      </p>
    );
  }

  return (
    <section
      className={`w-full min-w-0 rounded-lg border border-border bg-card/70 ${
        secondary ? "p-2.5" : "p-4"
      }`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 ${secondary ? "mb-2" : "mb-3"}`}>
        <div>
          <h3
            className={
              secondary
                ? "text-xs font-semibold text-title"
                : "text-sm font-semibold uppercase tracking-wide text-title"
            }
          >
            Inspections
            {secondary ? (
              <span className="ml-1.5 font-normal text-secondary">(optional)</span>
            ) : null}
          </h3>
          <p className={`text-secondary ${secondary ? "mt-0.5 text-[10px] leading-snug" : "mt-1 text-xs"}`}>
            Pre-inspection before teardown; detailed after the motor is opened. Same fields for both.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled || savingInspection}
            onClick={openPrelimModal}
          >
            Add pre-inspection
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || savingInspection}
            onClick={openDetailedModal}
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

      <MotorInspectionModal
        open={prelimModalOpen}
        onClose={() => !savingInspection && setModalKind(null)}
        title="Add pre-inspection"
        subtitle="Record condition before teardown. Same fields as the RFQ Write-Up pre-inspection."
        formId="wo-prelim-insp-form"
        saving={savingInspection}
        values={findings}
        onFieldChange={(key, value) => setFindings((f) => ({ ...f, [key]: value }))}
        onSubmit={(e) => submitInspection(e, "preliminary")}
      />

      <MotorInspectionModal
        open={detailedModalOpen}
        onClose={() => !savingInspection && setModalKind(null)}
        title="Add detailed inspection"
        subtitle="Opens with your latest pre-inspection values when available."
        formId="wo-detailed-insp-form"
        saving={savingInspection}
        values={findings}
        onFieldChange={(key, value) => setFindings((f) => ({ ...f, [key]: value }))}
        onSubmit={(e) => submitInspection(e, "detailed")}
      />

      <Modal
        open={!!viewingInspection}
        onClose={() => setViewingInspection(null)}
        title="Inspection"
        size="lg"
        width="min(900px, 94vw)"
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
                {kindLabel(viewingInspection.kind)}
              </Badge>
              <span className="text-secondary">
                {viewingInspection.createdAt
                  ? new Date(viewingInspection.createdAt).toLocaleString()
                  : ""}
              </span>
            </div>
            {usesUnifiedMotorInspectionFindings(viewingInspection.findings) ? (
              <MotorInspectionViewContent findings={viewingInspection.findings} />
            ) : (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {viewEntriesFor(viewingInspection).map(({ key, label, text }) => (
                  <div
                    key={key}
                    className={
                      key === "finalNotes" || key === "brokenPartsNotes" || key === "otherNotes"
                        ? "sm:col-span-2"
                        : ""
                    }
                  >
                    <dt className="text-xs font-medium uppercase tracking-wide text-secondary">{label}</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-title">{text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
