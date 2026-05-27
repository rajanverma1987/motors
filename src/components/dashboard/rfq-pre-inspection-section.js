"use client";

import { useState, useEffect, useCallback } from "react";
import { FiEye, FiPlus, FiCheckCircle } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import MotorInspectionModal from "@/components/dashboard/motor-inspection-modal";
import MotorInspectionViewContent from "@/components/dashboard/motor-inspection-view-content";
import {
  buildMotorInspectionFindingsPayload,
  emptyMotorInspectionFindings,
  motorInspectionSummary,
} from "@/lib/motor-inspection-fields";
import { inspectionComponentForSave } from "@/lib/motor-inspection-api";
import { isWriteUpStatus } from "@/lib/quote-rfq-lifecycle";
import { useToast } from "@/components/toast-provider";

/**
 * Pre-inspection on an RFQ in Write-Up status (web dashboard).
 */
export default function RfqPreInspectionSection({ quoteId, quoteStatus, disabled, onStatusChange }) {
  const toast = useToast();
  const qid = String(quoteId || "").trim();
  const show = isWriteUpStatus(quoteStatus);

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [findings, setFindings] = useState(() => emptyMotorInspectionFindings());
  const [viewing, setViewing] = useState(null);

  const load = useCallback(async () => {
    if (!qid || !show) {
      setInspections([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${qid}/inspections`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setInspections(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load pre-inspections");
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [qid, show, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    setFindings(emptyMotorInspectionFindings());
  }, [modalOpen]);

  async function handleSave(e) {
    e.preventDefault();
    if (!qid) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${qid}/inspections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "preliminary",
          component: inspectionComponentForSave(),
          findings: buildMotorInspectionFindingsPayload(findings),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success("Pre-inspection saved.");
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleInspectionDone() {
    if (!qid) return;
    setMarkingDone(true);
    try {
      const res = await fetch(`/api/dashboard/quotes/${qid}/complete-pre-inspection`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      toast.success("RFQ status set to Inspection done.");
      onStatusChange?.(data.quote?.status);
    } catch (err) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setMarkingDone(false);
    }
  }

  if (!show || !qid) return null;

  const count = inspections.length;
  const latestSummary = count ? motorInspectionSummary(inspections[0]?.findings) : "";
  const showTable = loading || count > 0;

  const columns = [
    {
      key: "actions",
      label: "",
      width: 44,
      render: (_, row) => (
        <button
          type="button"
          onClick={() => setViewing(row)}
          disabled={disabled}
          className="rounded p-1 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40"
          aria-label="View pre-inspection"
        >
          <FiEye className="h-4 w-4 shrink-0" />
        </button>
      ),
    },
    {
      key: "recorded",
      label: "Recorded",
      render: (_, row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"),
    },
    {
      key: "summary",
      label: "Summary",
      render: (_, row) => (
        <span className="text-secondary">{motorInspectionSummary(row.findings)}</span>
      ),
    },
  ];

  return (
    <section className="rounded-lg border border-border bg-card/60 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-title">Pre-inspection</h3>
          {count > 0 ? (
            <Badge variant="primary" className="rounded-full px-2 py-0.5 text-xs">
              {count}
            </Badge>
          ) : (
            <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">
              None
            </Badge>
          )}
          {latestSummary ? (
            <span className="max-w-md truncate text-xs text-secondary" title={latestSummary}>
              Latest: {latestSummary}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled || saving || markingDone}
            className="inline-flex items-center gap-1"
            onClick={() => setModalOpen(true)}
          >
            <FiPlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Add
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || saving || markingDone || count === 0}
            className="inline-flex items-center gap-1"
            title={
              count === 0
                ? "Record a pre-inspection first"
                : "Set RFQ status to Inspection done (mobile pre-inspection complete)"
            }
            onClick={handleInspectionDone}
          >
            <FiCheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {markingDone ? "…" : "Done"}
          </Button>
        </div>
      </div>

      {!showTable && !loading ? (
        <p className="mt-1.5 text-xs text-secondary">
          Assign a technician for the mobile app. Add findings here or on the technician device, then mark done.
        </p>
      ) : null}

      {showTable ? (
        <div className="mt-2">
          <Table
            columns={columns}
            data={inspections}
            rowKey="id"
            loading={loading}
            emptyMessage="No records"
            fillHeight={false}
            paginateClientSide={false}
            responsive
            onRefresh={load}
          />
        </div>
      ) : null}

      <MotorInspectionModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title="Pre-inspection"
        subtitle="Record motor condition and test results. Fields match the technician mobile form."
        formId="rfq-pre-insp-form"
        saving={saving}
        values={findings}
        onFieldChange={(key, value) => setFindings((f) => ({ ...f, [key]: value }))}
        onSubmit={handleSave}
      />

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="Pre-inspection"
        width="min(920px, 96vw)"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing ? (
          <div className="space-y-3">
            <p className="text-xs text-secondary">
              Recorded {viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : "—"}
            </p>
            <MotorInspectionViewContent findings={viewing.findings} />
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
