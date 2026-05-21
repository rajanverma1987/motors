"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Badge from "@/components/ui/badge";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
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
 * Read-only work order inspections on the RFQ form (reference-only; does not change scope).
 */
export default function QuoteFormRepairJobInspections({
  workOrderId = "",
  quoteMotorId,
  disabled,
}) {
  const [motorType, setMotorType] = useState("");
  const [woMotorId, setWoMotorId] = useState("");
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewingInspection, setViewingInspection] = useState(null);

  const woId = String(workOrderId || "").trim();

  const load = useCallback(async () => {
    if (!isLikelyMongoId(woId)) {
      setMotorType("");
      setWoMotorId("");
      setInspections([]);
      return;
    }
    setLoading(true);
    try {
      const [woRes, iRes] = await Promise.all([
        fetch(`/api/dashboard/work-orders/${woId}`, { credentials: "include", cache: "no-store" }),
        fetch(`/api/dashboard/work-orders/${woId}/inspections`, {
          credentials: "include",
          cache: "no-store",
        }),
      ]);
      const woData = await woRes.json().catch(() => ({}));
      const iData = await iRes.json().catch(() => []);
      if (!woRes.ok) {
        setMotorType("");
        setWoMotorId("");
        setInspections([]);
        return;
      }
      setWoMotorId(String(woData.motorId || "").trim());
      setMotorType(String(woData.motorClass || "").trim());
      setInspections(Array.isArray(iData) ? iData : []);
    } catch {
      setMotorType("");
      setWoMotorId("");
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, [woId]);

  useEffect(() => {
    load();
  }, [load]);

  const motorAligned = useMemo(() => {
    const qm = normId(quoteMotorId);
    const jm = normId(woMotorId);
    if (!qm || !jm) return null;
    return qm === jm;
  }, [quoteMotorId, woMotorId]);

  const hint = useMemo(() => {
    if (!isLikelyMongoId(woId)) {
      return "Create a work order from this RFQ to record and view inspections.";
    }
    if (loading) return "Loading inspections…";
    if (motorAligned === false) {
      return "Quote motor differs from the work order motor — inspections below are for reference.";
    }
    if (!inspections.length) {
      return "No inspections on this work order yet. Add them from Work orders.";
    }
    return "Read-only reference from the linked work order (does not change scope or parts on this RFQ).";
  }, [woId, loading, motorAligned, inspections.length]);

  const viewTitle = viewingInspection
    ? `${viewingInspection.kind === "detailed" ? "Detailed inspection" : "Pre-inspection"} · ${componentLabel(motorType, viewingInspection.component)}`
    : "Inspection";

  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Inspections (linked work order)
      </h3>
      <p className="mt-1 text-xs text-secondary">{hint}</p>
      {isLikelyMongoId(woId) && inspections.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {inspections.map((inv) => {
            const kindHint = inv.kind === "detailed" ? "Detailed inspection" : "Pre-inspection";
            return (
              <button
                key={inv.id}
                type="button"
                disabled={disabled}
                onClick={() => setViewingInspection(inv)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 text-left text-xs transition-colors hover:border-primary/40 hover:bg-card disabled:opacity-50"
              >
                <Badge
                  variant={inv.kind === "detailed" ? "warning" : "primary"}
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                >
                  {kindHint}
                </Badge>
                <span className="truncate text-title">{componentLabel(motorType, inv.component)}</span>
              </button>
            );
          })}
        </ul>
      ) : null}

      <Modal
        open={!!viewingInspection}
        onClose={() => setViewingInspection(null)}
        title={viewTitle}
        size="lg"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setViewingInspection(null)}>
            Close
          </Button>
        }
      >
        {viewingInspection ? (
          <dl className="space-y-3 text-sm">
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
        ) : null}
      </Modal>
    </div>
  );
}
