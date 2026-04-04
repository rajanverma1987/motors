"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import { inspectionComponentsForMotorType } from "@/lib/repair-flow-constants";
import { getPreliminaryViewEntries, getDetailedViewEntries } from "@/lib/repair-flow-preliminary-fields";

function isLikelyMongoId(s) {
  return typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());
}

function normId(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

function componentLabel(motorType, value) {
  const opts = inspectionComponentsForMotorType(motorType || "");
  return opts.find((o) => o.value === value)?.label || value || "—";
}

/**
 * Read-only Job Write-Up inspections on the Quotes create/edit modal when the RFQ is linked to a repair flow job.
 * Same chip + readings modal pattern as {@link RepairFlowCreateQuoteModal} (reference-only; does not change scope).
 *
 * @param {string} [motorRepairFlowQuoteId] — pipeline quote id; used to resolve job id when repairFlowJobId is missing (e.g. list row).
 */
export default function QuoteFormRepairJobInspections({
  repairFlowJobId,
  motorRepairFlowQuoteId = "",
  quoteMotorId,
  disabled,
}) {
  const [jobMotorId, setJobMotorId] = useState("");
  const [motorType, setMotorType] = useState("");
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);
  const [resolvedJobId, setResolvedJobId] = useState("");
  const [resolveAttempted, setResolveAttempted] = useState(false);

  const directJobId = String(repairFlowJobId || "").trim();
  const flowQuoteId = String(motorRepairFlowQuoteId || "").trim();

  useEffect(() => {
    if (isLikelyMongoId(directJobId)) {
      setResolvedJobId("");
      setResolveAttempted(false);
      return;
    }
    if (!isLikelyMongoId(flowQuoteId)) {
      setResolvedJobId("");
      setResolveAttempted(false);
      return;
    }
    let cancelled = false;
    setResolveAttempted(false);
    (async () => {
      try {
        const res = await fetch(
          `/api/dashboard/repair-flow/job-id-from-flow-quote?motorRepairFlowQuoteId=${encodeURIComponent(flowQuoteId)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setResolveAttempted(true);
        const jid = typeof data.repairFlowJobId === "string" ? data.repairFlowJobId.trim() : "";
        setResolvedJobId(isLikelyMongoId(jid) ? jid : "");
      } catch {
        if (!cancelled) {
          setResolveAttempted(true);
          setResolvedJobId("");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [directJobId, flowQuoteId]);

  const jobId = useMemo(() => {
    if (isLikelyMongoId(directJobId)) return directJobId;
    const r = String(resolvedJobId || "").trim();
    return isLikelyMongoId(r) ? r : "";
  }, [directJobId, resolvedJobId]);

  const load = useCallback(async () => {
    if (!isLikelyMongoId(jobId)) {
      setJobMotorId("");
      setMotorType("");
      setInspections([]);
      return;
    }
    setJobMotorId("");
    setMotorType("");
    setInspections([]);
    setLoading(true);
    try {
      const [jRes, iRes] = await Promise.all([
        fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/dashboard/repair-flow/jobs/${jobId}/inspections`, { credentials: "include", cache: "no-store" }),
      ]);
      const jData = await jRes.json().catch(() => ({}));
      const iData = await iRes.json().catch(() => []);
      if (!jRes.ok) {
        setJobMotorId("");
        setMotorType("");
        setInspections([]);
        return;
      }
      const j = jData.job || {};
      setJobMotorId(String(j.motorId || "").trim());
      setMotorType(String(j.motorType || "").trim());
      setInspections(Array.isArray(iData) ? iData : []);
    } catch {
      setJobMotorId("");
      setMotorType("");
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const inspectionsForDisplay = inspections;

  const inspectionListHint = useMemo(() => {
    const sel = normId(quoteMotorId);
    const jm = normId(jobMotorId);
    const total = inspections.length;
    if (!jobId) return null;
    if (!sel) {
      return "Select a customer and motor on this quote to confirm alignment with the Job Write-Up motor. Inspections below are from the linked job.";
    }
    if (jm && sel !== jm) {
      return "Quote motor differs from the motor on the linked Job Write-Up job — inspections below are still shown for reference. Update the quote motor to match the job if needed.";
    }
    if (!total) {
      return "No inspections on this job yet. Add them from Job Write-Up.";
    }
    return null;
  }, [jobId, quoteMotorId, jobMotorId, inspections.length]);

  const viewingInspectionEntries = useMemo(() => {
    if (!viewingInspection) return [];
    if (viewingInspection.kind === "detailed") {
      return getDetailedViewEntries(viewingInspection.findings || {});
    }
    return getPreliminaryViewEntries(viewingInspection.component, viewingInspection.findings || {});
  }, [viewingInspection]);

  const viewModalTitle = viewingInspection
    ? `${viewingInspection.kind === "detailed" ? "Detailed inspection" : "Pre-inspection"} · ${componentLabel(motorType, viewingInspection.component)}`
    : "";

  const awaitingResolve =
    !isLikelyMongoId(directJobId) && isLikelyMongoId(flowQuoteId) && !isLikelyMongoId(jobId) && !resolveAttempted;

  if (awaitingResolve) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
          Inspections (linked Job Write-Up)
        </h3>
        <p className="text-sm text-secondary">Resolving linked job…</p>
      </div>
    );
  }

  if (!isLikelyMongoId(jobId)) {
    if (resolveAttempted && isLikelyMongoId(flowQuoteId)) {
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
            Inspections (linked Job Write-Up)
          </h3>
          <p className="text-sm text-secondary">
            This RFQ is not linked to a Job Write-Up job we could load, or the pipeline quote no longer exists. If this
            came from Job Write-Up, try closing and opening the quote again from the list.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
          Inspections (linked Job Write-Up)
        </h3>
        <p className="mb-2 text-xs text-secondary">
          Pre-inspections and detailed inspections from the repair job. Click a label to open readings (reference only —
          same as Job Write-Up quote form). This does not change scope or parts on the RFQ.
        </p>
        {loading ? (
          <p className="text-sm text-secondary">Loading inspections…</p>
        ) : (
          <>
            {inspectionListHint && inspectionsForDisplay.length === 0 ? (
              <p className="rounded-md border border-border bg-form-bg/50 px-3 py-2 text-sm text-secondary">{inspectionListHint}</p>
            ) : null}
            {inspectionListHint && inspectionsForDisplay.length > 0 ? (
              <p className="mb-2 rounded-md border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs text-secondary dark:border-amber-900/50 dark:bg-amber-950/30">
                {inspectionListHint}
              </p>
            ) : null}
            {inspectionsForDisplay.length > 0 ? (
              <>
                <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto rounded-lg border border-border bg-form-bg/30 px-3 py-2 [scrollbar-width:thin]">
                  {inspectionsForDisplay.map((inv) => {
                    const isSel = String(viewingInspection?.id) === String(inv.id);
                    const label = componentLabel(motorType, inv.component);
                    const kindHint = inv.kind === "detailed" ? "Detailed inspection" : "Pre-inspection";
                    return (
                      <button
                        key={inv.id}
                        type="button"
                        disabled={disabled}
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
                          {inv.kind === "detailed" ? `${label} · det.` : label}
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
          </>
        )}
      </div>

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
