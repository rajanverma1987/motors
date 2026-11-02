"use client";

import { useEffect, useState } from "react";
import { FiChevronRight, FiPlus, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { IQMOTORTRACK_FREE_MOTOR_LIMIT, IQMOTORTRACK_MONTHLY_USD } from "@/lib/iqmotortrack-marketing";
import {
  TRACK_CRITICALITY_LABEL,
  TRACK_CRITICALITY_VARIANT,
  TRACK_STATUS_LABEL,
  TRACK_STATUS_VARIANT,
  trackMotorLocation,
  trackMotorTitle,
} from "@/lib/track-motor-fields";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackMotorFormModal from "./motor-form-modal";
import TrackPaypalSubscribeModal from "./paypal-subscribe";
import { TrackEmpty } from "./ui";

const FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "in_service", label: "Running" },
  { value: "down", label: "Down" },
  { value: "awaiting_proposals", label: "Awaiting proposals" },
  { value: "under_repair", label: "Under repair" },
  { value: "repaired", label: "Repaired, awaiting return" },
  { value: "spare", label: "Standby" },
  { value: "retired", label: "Decommissioned" },
];

export default function TrackMotorsScreen({ onOpenMotor, refreshKey = 0, onChanged }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { token, session, refreshSession } = useTrackAuth();
  const [motors, setMotors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (status) params.set("status", status);
      if (showArchived) params.set("archived", "1");
      const qs = params.toString();
      const data = await appFetch(`/api/track/motors${qs ? `?${qs}` : ""}`, { token });
      setMotors(data.motors || []);
      await refreshSession().catch(() => {});
    } catch (err) {
      toast.error(err.message || "Could not load motors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => {});
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, search, status, showArchived, refreshKey]);

  const activeCount = session?.motorCount ?? motors.filter((m) => !m.archived).length;
  const limit = session?.motorLimit || IQMOTORTRACK_FREE_MOTOR_LIMIT;
  const atLimit = !session?.isPro && activeCount >= limit;

  const openCreate = () => {
    if (atLimit) {
      setPayOpen(true);
      return;
    }
    setFormOpen(true);
  };

  const archive = async (motor) => {
    const ok = await confirm({
      title: "Archive motor",
      message: `Archive ${trackMotorTitle(motor)}? The record stays searchable and stops counting toward your plan limit.`,
      confirmLabel: "Archive",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch(`/api/track/motors/${motor.id}`, { token, method: "DELETE" });
      toast.success("Motor archived.");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not archive.");
    }
  };

  const restore = async (motor) => {
    try {
      await appFetch(`/api/track/motors/${motor.id}`, {
        token,
        method: "PATCH",
        body: { archived: false },
      });
      toast.success("Motor restored.");
      await load();
      onChanged?.();
    } catch (err) {
      if (err.code === "MOTOR_LIMIT") setPayOpen(true);
      toast.error(err.message || "Could not restore.");
    }
  };

  return (
    <div className="space-y-3 px-4 pb-8 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-title">
            {activeCount} {activeCount === 1 ? "motor" : "motors"}
          </p>
          {session?.isPro ? (
            <Badge variant="success" className="mt-1 rounded-full px-2.5 py-0.5 text-xs">
              Pro, unlimited motors
            </Badge>
          ) : (
            <p className="text-xs text-secondary">
              Free plan: {activeCount} of {limit} used. Pro is ${IQMOTORTRACK_MONTHLY_USD} per month for
              unlimited motors.
            </p>
          )}
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Add
        </Button>
      </div>

      {atLimit ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-title">
          You have reached the free plan limit of {limit} motors. Upgrade to Pro for unlimited motors,
          unlimited RFQs and full history.
          <Button type="button" size="sm" className="mt-2 w-full" onClick={() => setPayOpen(true)}>
            Upgrade with PayPal
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        <Input
          label="Search"
          name="track-motor-search"
          placeholder="Serial, manufacturer, asset tag or location"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Select
              label="Status"
              name="track-motor-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={FILTER_OPTIONS}
            />
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`shrink-0 rounded-lg border px-2.5 py-2 text-xs font-semibold ${
              showArchived
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-secondary"
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-secondary">Loading motors…</p> : null}

      {!loading && motors.length === 0 ? (
        <TrackEmpty
          title={search || status ? "No motors match" : "No motors yet"}
          message={
            search || status
              ? "Try a different search or clear the status filter."
              : "Add your first motor. Snap the nameplate and we will keep the record, history and due dates in one place."
          }
        >
          {search || status ? null : (
            <Button type="button" onClick={openCreate}>
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add motor
            </Button>
          )}
        </TrackEmpty>
      ) : null}

      <ul className="space-y-2">
        {motors.map((motor) => (
          <li key={motor.id} className="rounded-2xl border border-border bg-card">
            <div className="flex items-stretch">
              <button
                type="button"
                onClick={() => onOpenMotor?.(motor.id)}
                className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left"
              >
                {motor.motorPhotoUrl || motor.nameplatePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={motor.motorPhotoUrl || motor.nameplatePhotoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-title">{trackMotorTitle(motor)}</span>
                  <span className="mt-0.5 block truncate text-xs text-secondary">
                    {trackMotorLocation(motor) || "No location recorded"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant={TRACK_STATUS_VARIANT[motor.status] || "default"}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {TRACK_STATUS_LABEL[motor.status] || motor.status}
                    </Badge>
                    <Badge
                      variant={TRACK_CRITICALITY_VARIANT[motor.criticality] || "default"}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {TRACK_CRITICALITY_LABEL[motor.criticality] || motor.criticality}
                    </Badge>
                    {motor.openRfq ? (
                      <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                        {motor.openRfq.proposalsReceived} of {motor.openRfq.invitedCount} responded
                      </Badge>
                    ) : null}
                    {motor.serialNumber ? (
                      <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                        S/N {motor.serialNumber}
                      </Badge>
                    ) : null}
                    {motor.archived ? (
                      <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                        Archived
                      </Badge>
                    ) : null}
                  </span>
                </span>
                <FiChevronRight className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              </button>
              <div className="flex shrink-0 items-start border-l border-border p-1.5">
                {motor.archived ? (
                  <button
                    type="button"
                    onClick={() => restore(motor)}
                    className="rounded-md px-2 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/10"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => archive(motor)}
                    aria-label="Archive motor"
                    className="rounded-md p-2 text-danger hover:bg-danger/10"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <TrackMotorFormModal
        open={formOpen}
        motor={null}
        onClose={() => setFormOpen(false)}
        onSaved={(motor, meta) => {
          if (meta?.limitReached) {
            setPayOpen(true);
            return;
          }
          load().catch(() => {});
          onChanged?.();
          if (motor?.id) onOpenMotor?.(motor.id);
        }}
      />
      <TrackPaypalSubscribeModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}
