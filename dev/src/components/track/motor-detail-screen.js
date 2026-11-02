"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiEdit2,
  FiFileText,
  FiPlus,
  FiPrinter,
  FiTrash2,
} from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_CRITICALITY_LABEL,
  TRACK_CRITICALITY_VARIANT,
  TRACK_LOCATION_DISPLAY_FIELDS,
  TRACK_NAMEPLATE_DISPLAY_FIELDS,
  TRACK_STATUS_LABEL,
  TRACK_STATUS_VARIANT,
  trackMotorLocation,
  trackMotorTitle,
} from "@/lib/track-motor-fields";
import {
  TRACK_DUE_STATE_LABEL,
  TRACK_DUE_STATE_VARIANT,
  TRACK_MAINTENANCE_ACTIVITY_LABEL,
  trackDueByActivity,
  trackDueState,
  trackReadingSeries,
} from "@/lib/track-maintenance";
import {
  TRACK_RFQ_STATUS_LABEL,
  TRACK_RFQ_STATUS_VARIANT,
  trackFormatMoney,
} from "@/lib/track-rfq";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackDatasheetPanel from "./datasheet-panel";
import TrackMaintenanceModal from "./maintenance-modal";
import TrackMotorDownFlow from "./motor-down-flow";
import TrackMotorFormModal from "./motor-form-modal";
import TrackMotorQrLabel from "./motor-qr-label";
import TrackPhotoInput from "./photo-input";
import TrackReadingChart from "./reading-chart";
import TrackServiceHistoryModal from "./service-history-modal";
import { TrackCard, TrackRow, TrackScreen, trackDateLabel } from "./ui";

const WORK_TYPE_LABEL = {
  rewind: "Rewind",
  bearing_replacement: "Bearing replacement",
  mechanical: "Mechanical",
  testing: "Testing",
  field_service: "Field service",
  other: "Other",
};

/** §6.4 - motor detail, in the priority order the spec sets out. */
export default function TrackMotorDetailScreen({ motorId, onBack, onOpenRfq, onChanged }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { token } = useTrackAuth();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [downOpen, setDownOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await appFetch(`/api/track/motors/${motorId}`, { token });
      setBundle(data);
    } catch (err) {
      toast.error(err.message || "Could not load the motor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motorId, token]);

  const motor = bundle?.motor || null;
  const logs = useMemo(() => bundle?.maintenanceLogs || [], [bundle]);
  const history = useMemo(() => bundle?.serviceHistory || [], [bundle]);
  const openRfq = bundle?.openRfq || null;

  const totals = useMemo(() => {
    const cost = history.reduce((sum, entry) => sum + (Number(entry.finalCost) || 0), 0);
    return { count: history.length, cost };
  }, [history]);

  const dueRows = useMemo(() => trackDueByActivity(logs), [logs]);
  const series = useMemo(() => trackReadingSeries(logs), [logs]);

  const markDown = async () => {
    try {
      // §7.2 - the status changes immediately, even if the user abandons the flow.
      await appFetch(`/api/track/motors/${motorId}`, { token, method: "PATCH", body: { status: "down" } });
      setBundle((prev) => (prev ? { ...prev, motor: { ...prev.motor, status: "down" } } : prev));
      setDownOpen(true);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not mark the motor down.");
    }
  };

  const addDocument = async (url) => {
    if (!url) return;
    try {
      const data = await appFetch(`/api/track/motors/${motorId}/documents`, {
        token,
        method: "POST",
        body: { url },
      });
      setBundle((prev) => (prev ? { ...prev, motor: data.motor } : prev));
      toast.success("Document added.");
    } catch (err) {
      toast.error(err.message || "Could not add the document.");
    }
  };

  const removeDocument = async (doc) => {
    const ok = await confirm({
      title: "Delete document",
      message: `Delete ${doc.name || "this document"}?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const data = await appFetch(
        `/api/track/motors/${motorId}/documents?documentId=${encodeURIComponent(doc.id)}`,
        { token, method: "DELETE" }
      );
      setBundle((prev) => (prev ? { ...prev, motor: data.motor } : prev));
      toast.success("Document deleted.");
    } catch (err) {
      toast.error(err.message || "Could not delete.");
    }
  };

  const removeMaintenance = async (log) => {
    const ok = await confirm({
      title: "Delete maintenance entry",
      message: `Delete the ${TRACK_MAINTENANCE_ACTIVITY_LABEL[log.activityType] || "maintenance"} entry from ${trackDateLabel(log.performedAt)}?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch(`/api/track/maintenance/${log.id}`, { token, method: "DELETE" });
      toast.success("Entry deleted.");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not delete.");
    }
  };

  const removeHistory = async (entry) => {
    const ok = await confirm({
      title: "Delete service history entry",
      message: `Delete the ${WORK_TYPE_LABEL[entry.workType] || "service"} entry from ${trackDateLabel(entry.completedAt)}?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch(`/api/track/service-history/${entry.id}`, { token, method: "DELETE" });
      toast.success("Entry deleted.");
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not delete.");
    }
  };

  const clearReviewFlag = async () => {
    try {
      await appFetch(`/api/track/motors/${motorId}`, {
        token,
        method: "PATCH",
        body: { clearDatasheetReviewFlag: true },
      });
      await load();
    } catch (err) {
      toast.error(err.message || "Could not clear the flag.");
    }
  };

  if (loading || !motor) {
    return (
      <TrackScreen title="Motor" onBack={onBack}>
        <p className="p-4 text-sm text-secondary">{loading ? "Loading motor…" : "Motor not found."}</p>
      </TrackScreen>
    );
  }

  const photos = [motor.nameplatePhotoUrl, motor.motorPhotoUrl, ...(motor.extraPhotoUrls || [])].filter(Boolean);
  const canGoDown = !["down", "awaiting_proposals", "under_repair", "repaired"].includes(motor.status);

  return (
    <TrackScreen
      title={trackMotorTitle(motor)}
      subtitle={trackMotorLocation(motor)}
      onBack={onBack}
      actions={
        <>
          <button
            type="button"
            onClick={() => setLabelOpen(true)}
            aria-label="Print QR label"
            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
          >
            <FiPrinter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Edit motor"
            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        </>
      }
    >
      <div className="space-y-3 px-4 pb-8 pt-3">
        {/* 1. Status and criticality, with Motor Down dominant. */}
        <TrackCard>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
              {motor.powerType}
            </Badge>
            {motor.currentShopName ? (
              <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs">
                At {motor.currentShopName}
              </Badge>
            ) : null}
          </div>

          {canGoDown ? (
            <Button type="button" variant="danger" className="mt-3 w-full" onClick={markDown}>
              <FiAlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
              Motor Down
            </Button>
          ) : (
            <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-title">
              This motor is already out of service.
              {openRfq ? " Open the RFQ below to compare proposals." : " Send an RFQ to get it repaired."}
            </p>
          )}

          {motor.status === "down" && !openRfq ? (
            <Button type="button" className="mt-2 w-full" onClick={() => setDownOpen(true)}>
              Send an RFQ to shops
            </Button>
          ) : null}

          {motor.datasheetReviewFlag ? (
            <div className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-2.5">
              <p className="text-xs text-title">{motor.datasheetReviewFlag}</p>
              <button
                type="button"
                onClick={clearReviewFlag}
                className="mt-1.5 text-[11px] font-semibold text-primary"
              >
                Reviewed, clear this notice
              </button>
            </div>
          ) : null}
        </TrackCard>

        {/* 3. Open RFQ with a link to its comparison view. */}
        {openRfq ? (
          <TrackCard title="Open RFQ">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={TRACK_RFQ_STATUS_VARIANT[openRfq.status] || "default"}
                className="rounded-full px-2.5 py-0.5 text-xs"
              >
                {TRACK_RFQ_STATUS_LABEL[openRfq.status] || openRfq.status}
              </Badge>
              <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                {openRfq.proposalsReceived} of {openRfq.invitedCount} responded
              </Badge>
              {openRfq.urgency === "emergency" ? (
                <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs">
                  Emergency
                </Badge>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-3 w-full"
              onClick={() => onOpenRfq?.(openRfq.id)}
            >
              Compare proposals
            </Button>
          </TrackCard>
        ) : null}

        {/* 2. Nameplate summary and photos. */}
        <TrackCard title="Nameplate">
          {photos.length ? (
            <ul className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((url) => (
                <li key={url} className="shrink-0">
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Motor photo"
                      className="h-24 w-24 rounded-lg border border-border object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {TRACK_NAMEPLATE_DISPLAY_FIELDS.map((field) => (
            <TrackRow key={field.key} label={field.label} value={motor[field.key]} hideEmpty />
          ))}
        </TrackCard>

        <TrackCard title="Location and operation">
          {TRACK_LOCATION_DISPLAY_FIELDS.map((field) => {
            let value = motor[field.key];
            if (field.key === "criticality") value = TRACK_CRITICALITY_LABEL[motor.criticality];
            if (field.key === "status") value = TRACK_STATUS_LABEL[motor.status];
            if (field.key === "installDate") value = trackDateLabel(motor.installDate);
            return <TrackRow key={field.key} label={field.label} value={value} hideEmpty />;
          })}
          {motor.notes ? (
            <p className="mt-2 whitespace-pre-line text-xs text-secondary">{motor.notes}</p>
          ) : null}
        </TrackCard>

        {/* 4. Datasheet. */}
        <TrackDatasheetPanel motor={motor} onChanged={load} />

        {/* 5. Service history, newest first, with lifetime totals. */}
        <TrackCard
          title="Service history"
          action={
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              aria-label="Add service history"
              className="rounded-md p-1.5 text-primary hover:bg-primary/10"
            >
              <FiPlus className="h-4 w-4" />
            </button>
          }
        >
          <div className="mb-2 flex gap-2">
            <div className="flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-center">
              <p className="text-sm font-extrabold text-title">{totals.count}</p>
              <p className="text-[10px] text-secondary">Lifetime repairs</p>
            </div>
            <div className="flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-center">
              <p className="text-sm font-extrabold text-title">
                {totals.cost ? trackFormatMoney(totals.cost) : "Not provided"}
              </p>
              <p className="text-[10px] text-secondary">Total repair cost</p>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-xs text-secondary">
              No repairs recorded. Add work done outside the platform, or send an RFQ so entries arrive
              automatically.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border bg-bg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-title">
                        {WORK_TYPE_LABEL[entry.workType] || entry.workType}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {trackDateLabel(entry.completedAt) || "Date not provided"}
                        {entry.shopName ? ` · ${entry.shopName}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge
                        variant={entry.source === "iqmotorbase" ? "success" : "default"}
                        className="rounded-full px-2 py-0.5 text-[10px]"
                      >
                        {entry.source === "iqmotorbase" ? "From shop" : "Manual"}
                      </Badge>
                      {entry.source === "manual" ? (
                        <button
                          type="button"
                          onClick={() => removeHistory(entry)}
                          aria-label="Delete entry"
                          className="rounded-md p-1.5 text-danger hover:bg-danger/10"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <TrackRow label="Job number" value={entry.jobNumber} hideEmpty />
                  <TrackRow label="Invoice number" value={entry.invoiceNumber} hideEmpty />
                  <TrackRow
                    label="Final cost"
                    value={entry.finalCost === null ? "" : trackFormatMoney(entry.finalCost, entry.currency)}
                    hideEmpty
                  />
                  <TrackRow
                    label="Turnaround"
                    value={entry.turnaroundDays === null ? "" : `${entry.turnaroundDays} days`}
                    hideEmpty
                  />
                  <TrackRow label="Failure cause" value={entry.failureCause} hideEmpty />
                  <TrackRow
                    label="Warranty"
                    value={
                      entry.warrantyMonths
                        ? `${entry.warrantyMonths} months, expires ${trackDateLabel(entry.warrantyExpiresAt)}`
                        : ""
                    }
                    hideEmpty
                  />
                  {entry.description ? (
                    <p className="mt-1 whitespace-pre-line text-[11px] text-secondary">{entry.description}</p>
                  ) : null}
                  {entry.attachments?.length ? (
                    <ul className="mt-1.5 flex flex-wrap gap-2">
                      {entry.attachments.map((url) => (
                        <li key={url}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-semibold text-primary underline"
                          >
                            Test report
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TrackCard>

        {/* 6. Maintenance log and next due date. */}
        <TrackCard
          title="Maintenance"
          action={
            <button
              type="button"
              onClick={() => setMaintenanceOpen(true)}
              aria-label="Log maintenance"
              className="rounded-md p-1.5 text-primary hover:bg-primary/10"
            >
              <FiPlus className="h-4 w-4" />
            </button>
          }
        >
          {motor.nextMaintenanceDue ? (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2.5 py-2">
              <span className="text-xs text-secondary">Next due</span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-title">
                  {trackDateLabel(motor.nextMaintenanceDue)}
                </span>
                <Badge
                  variant={TRACK_DUE_STATE_VARIANT[trackDueState(motor.nextMaintenanceDue)]}
                  className="rounded-full px-2 py-0.5 text-[10px]"
                >
                  {TRACK_DUE_STATE_LABEL[trackDueState(motor.nextMaintenanceDue)]}
                </Badge>
              </span>
            </div>
          ) : null}

          {dueRows.length ? (
            <ul className="mb-3 space-y-1">
              {dueRows.map((row) => (
                <li key={row.activityType} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs text-title">{row.label}</span>
                  <Badge
                    variant={TRACK_DUE_STATE_VARIANT[row.dueState]}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {row.nextDueAt ? trackDateLabel(row.nextDueAt) : TRACK_DUE_STATE_LABEL[row.dueState]}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}

          {series.insulation.length > 1 || series.vibration.length > 1 ? (
            <div className="mb-3 space-y-3">
              <TrackReadingChart
                title="Insulation resistance"
                unit="MΩ"
                points={series.insulation}
              />
              <TrackReadingChart title="Vibration" unit="in/sec" points={series.vibration} />
            </div>
          ) : null}

          {logs.length === 0 ? (
            <p className="text-xs text-secondary">
              No maintenance logged yet. Log lubrication, vibration checks and insulation tests to track due
              dates.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {logs.slice(0, 20).map((log) => (
                <li key={log.id} className="rounded-lg border border-border bg-bg p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-title">
                        {TRACK_MAINTENANCE_ACTIVITY_LABEL[log.activityType] || log.activityType}
                      </p>
                      <p className="text-[10px] text-secondary">
                        {trackDateLabel(log.performedAt)}
                        {log.performedBy ? ` · ${log.performedBy}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaintenance(log)}
                      aria-label="Delete entry"
                      className="shrink-0 rounded-md p-1.5 text-danger hover:bg-danger/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <TrackRow
                    label="Insulation resistance"
                    value={log.insulationResistanceMohm ? `${log.insulationResistanceMohm} MΩ` : ""}
                    hideEmpty
                  />
                  <TrackRow
                    label="Vibration"
                    value={log.vibrationInPerSec ? `${log.vibrationInPerSec} in/sec` : ""}
                    hideEmpty
                  />
                  <TrackRow
                    label="Temperature"
                    value={log.temperatureF ? `${log.temperatureF} °F` : ""}
                    hideEmpty
                  />
                  <TrackRow label="Next due" value={trackDateLabel(log.nextDueAt)} hideEmpty />
                  {log.notes ? (
                    <p className="mt-1 whitespace-pre-line text-[11px] text-secondary">{log.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </TrackCard>

        {/* 7. Documents. */}
        <TrackCard title="Documents">
          {(motor.documents || []).length === 0 ? (
            <p className="mb-3 text-xs text-secondary">
              Keep test reports, warranty certificates and invoices you received here.
            </p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {motor.documents.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-bg px-2.5 py-2"
                >
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-1.5 text-xs font-semibold text-primary"
                  >
                    <FiFileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{doc.name || "Document"}</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc)}
                    aria-label="Delete document"
                    className="shrink-0 rounded-md p-1.5 text-danger hover:bg-danger/10"
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <TrackPhotoInput label="Add a document" profile="document" value="" onChange={addDocument} />
        </TrackCard>
      </div>

      <TrackMotorFormModal
        open={editOpen}
        motor={motor}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          load().catch(() => {});
          onChanged?.();
        }}
      />
      <TrackMotorDownFlow
        open={downOpen}
        motor={motor}
        onClose={() => setDownOpen(false)}
        onSent={(rfq) => {
          load().catch(() => {});
          onChanged?.();
          if (rfq?.id) onOpenRfq?.(rfq.id);
        }}
      />
      <TrackMaintenanceModal
        open={maintenanceOpen}
        motorId={motorId}
        onClose={() => setMaintenanceOpen(false)}
        onSaved={() => {
          load().catch(() => {});
          onChanged?.();
        }}
      />
      <TrackServiceHistoryModal
        open={historyOpen}
        motorId={motorId}
        onClose={() => setHistoryOpen(false)}
        onSaved={() => {
          load().catch(() => {});
          onChanged?.();
        }}
      />
      <TrackMotorQrLabel motor={motor} open={labelOpen} onClose={() => setLabelOpen(false)} />
    </TrackScreen>
  );
}
