"use client";

import { useEffect, useState } from "react";
import { FiAlertTriangle, FiChevronRight, FiPlus } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { TRACK_DUE_STATE_VARIANT, TRACK_MAINTENANCE_ACTIVITY_LABEL } from "@/lib/track-maintenance";
import {
  TRACK_STATUS_LABEL,
  TRACK_STATUS_VARIANT,
  trackMotorLocation,
  trackMotorTitle,
} from "@/lib/track-motor-fields";
import { TRACK_RFQ_STATUS_LABEL, TRACK_RFQ_STATUS_VARIANT } from "@/lib/track-rfq";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import { TrackCard, TrackEmpty, TrackStat, trackDateLabel } from "./ui";

/** §6.2 - the home screen answers "what needs me right now" first. */
export default function TrackDashboardScreen({ onOpenMotor, onOpenRfq, onAddMotor, refreshKey = 0 }) {
  const toast = useToast();
  const { token, session } = useTrackAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await appFetch("/api/track/dashboard", { token });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Could not load your dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  if (loading && !data) {
    return <p className="px-4 py-6 text-sm text-secondary">Loading your motors…</p>;
  }

  const counts = data?.counts || { total: 0, running: 0, down: 0, underRepair: 0, standby: 0 };
  const attention = data?.attention || [];
  const openRfqs = data?.openRfqs || [];
  const maintenanceDue = data?.maintenanceDue || [];

  if (counts.total === 0) {
    return (
      <div className="px-4 pb-8 pt-3">
        <TrackEmpty
          title="Welcome to IQMotorTrack"
          message="Add your first motor. Snap the nameplate, record the location, and you are ready to send an RFQ the moment it goes down."
        >
          <Button type="button" onClick={onAddMotor}>
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add your first motor
          </Button>
        </TrackEmpty>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 pb-8 pt-3">
      <div className="grid grid-cols-4 gap-2">
        <TrackStat label="Running" value={counts.running} variant="success" />
        <TrackStat label="Down" value={counts.down} variant={counts.down ? "danger" : "default"} />
        <TrackStat
          label="In repair"
          value={counts.underRepair}
          variant={counts.underRepair ? "warning" : "default"}
        />
        <TrackStat label="Standby" value={counts.standby} />
      </div>

      {attention.length ? (
        <TrackCard title="Needs attention">
          <ul className="space-y-2">
            {attention.map((motor) => (
              <li key={motor.id}>
                <button
                  type="button"
                  onClick={() => onOpenMotor?.(motor.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg p-2.5 text-left"
                >
                  <FiAlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-title">
                      {trackMotorTitle(motor)}
                    </span>
                    <span className="block truncate text-[10px] text-secondary">
                      {trackMotorLocation(motor) || "No location recorded"}
                    </span>
                  </span>
                  <Badge
                    variant={TRACK_STATUS_VARIANT[motor.status] || "default"}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {TRACK_STATUS_LABEL[motor.status] || motor.status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </TrackCard>
      ) : null}

      {openRfqs.length ? (
        <TrackCard title="Open RFQs">
          <ul className="space-y-2">
            {openRfqs.map((rfq) => (
              <li key={rfq.id}>
                <button
                  type="button"
                  onClick={() => onOpenRfq?.(rfq.id)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg p-2.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-title">{rfq.motorTitle}</span>
                    <span className="block truncate text-[10px] text-secondary">
                      {rfq.proposalsReceived} of {rfq.invitedCount} shops responded
                      {rfq.reference ? ` · ${rfq.reference}` : ""}
                    </span>
                  </span>
                  <Badge
                    variant={TRACK_RFQ_STATUS_VARIANT[rfq.status] || "default"}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {TRACK_RFQ_STATUS_LABEL[rfq.status] || rfq.status}
                  </Badge>
                  <FiChevronRight className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </TrackCard>
      ) : null}

      {maintenanceDue.length ? (
        <TrackCard title="Maintenance due">
          <ul className="space-y-1.5">
            {maintenanceDue.slice(0, 12).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpenMotor?.(row.motorId)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg px-2.5 py-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-title">{row.motorTitle}</span>
                    <span className="block truncate text-[10px] text-secondary">
                      {TRACK_MAINTENANCE_ACTIVITY_LABEL[row.activityType] || row.activityType}
                    </span>
                  </span>
                  <Badge
                    variant={TRACK_DUE_STATE_VARIANT[row.dueState]}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {trackDateLabel(row.nextDueAt)}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        </TrackCard>
      ) : null}

      {!session?.isPro ? (
        <TrackCard title="Free plan">
          <p className="text-xs text-secondary">
            {session?.usageLabel || `${counts.total} motors`}. Upgrade to Pro for unlimited motors, unlimited
            shops per RFQ and full service history.
          </p>
        </TrackCard>
      ) : null}
    </div>
  );
}
