"use client";

import { useEffect, useMemo, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import { TrackCard, trackDateLabel } from "./ui";

const FORM_ID = "track-datasheet-form";

function provenanceText(entry) {
  if (!entry) return "";
  const who = entry.source === "shop" ? entry.shopName || entry.sourceLabel : `${entry.sourceLabel} (plant entered)`;
  const parts = [who];
  if (entry.jobNumber) parts.push(`Job ${entry.jobNumber}`);
  if (entry.at) parts.push(trackDateLabel(entry.at));
  const line = parts.filter(Boolean).join(", ");
  if (entry.previousValue) return `${line}, was ${entry.previousValue}`;
  return line;
}

/**
 * §6.5 - datasheet on the motor record, using the IQMotorBase field keys so
 * values round-trip losslessly. Every value shows where it came from.
 */
export default function TrackDatasheetPanel({ motor, onChanged }) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await appFetch(`/api/track/motors/${motor.id}/datasheet`, { token });
      setData(res);
    } catch (err) {
      toast.error(err.message || "Could not load the datasheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (motor?.id) load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motor?.id, token]);

  const currentValues = useMemo(() => {
    const out = {};
    for (const group of data?.latest?.groups || []) {
      for (const row of group.rows) out[row.path] = row.value;
    }
    return out;
  }, [data]);

  const openEdit = () => {
    setValues({ ...currentValues });
    setEditOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await appFetch(`/api/track/motors/${motor.id}/datasheet`, {
        token,
        method: "PATCH",
        body: { values },
      });
      toast.success(res?.changed ? "Datasheet saved as a new version." : "No changes to save.");
      setEditOpen(false);
      await load();
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const latest = data?.latest || null;
  const fields = data?.fields || [];

  return (
    <TrackCard
      title="Datasheet"
      action={
        <div className="flex items-center gap-1">
          {(data?.versions || []).length > 1 ? (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
            >
              Versions ({data.versions.length})
            </button>
          ) : null}
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit datasheet"
            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        </div>
      }
    >
      {loading ? <p className="text-xs text-secondary">Loading datasheet…</p> : null}

      {!loading && data?.reviewFlag ? (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 p-2.5 text-xs text-title">
          {data.reviewFlag}
        </div>
      ) : null}

      {!loading && !latest ? (
        <p className="text-xs text-secondary">
          No datasheet yet. Add values you already hold, or let the next shop repair fill it in. Either way it
          travels with every future RFQ.
        </p>
      ) : null}

      {!loading && latest ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-[10px]">
              {latest.powerType} · version {latest.version}
            </Badge>
            <span className="text-[11px] text-secondary">{latest.provenanceLine}</span>
          </div>
          {latest.groups.map((group) => (
            <div key={group.blockKey}>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-secondary">
                {group.blockLabel}
              </p>
              <ul className="space-y-1">
                {group.rows.map((row) => (
                  <li key={row.path} className="border-b border-border/60 pb-1 last:border-b-0">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs text-secondary">{row.label}</span>
                      <span className="text-right text-xs font-semibold text-title">{row.value}</span>
                    </div>
                    {row.provenance ? (
                      <p className="mt-0.5 text-[10px] text-secondary">{provenanceText(row.provenance)}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
              {group.notes ? (
                <p className="mt-1.5 whitespace-pre-line text-[11px] text-secondary">{group.notes}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Datasheet values"
        size="lg"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={FORM_ID} size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-secondary">
          Values you enter are recorded as plant entered. A shop can confirm or correct them later, and the old
          value stays visible in the version history.
        </p>
        <Form id={FORM_ID} onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <Input
              key={field.path}
              label={`${field.blockLabel}: ${field.label}`}
              value={values[field.path] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.path]: e.target.value }))}
            />
          ))}
        </Form>
      </Modal>

      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Datasheet versions" size="md">
        <ul className="space-y-2">
          {(data?.versions || []).map((version) => (
            <li key={version.id} className="rounded-xl border border-border bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  variant={version.sourceType === "shop" ? "success" : "primary"}
                  className="rounded-full px-2.5 py-0.5 text-[10px]"
                >
                  Version {version.version}
                </Badge>
                <span className="text-[11px] text-secondary">{trackDateLabel(version.recordedAt)}</span>
              </div>
              <p className="mt-1.5 text-xs font-semibold text-title">{version.provenanceLine}</p>
              {version.changedFields.length ? (
                <p className="mt-1 text-[11px] text-secondary">
                  {version.changedFields.length} field{version.changedFields.length === 1 ? "" : "s"} changed
                </p>
              ) : null}
              {version.note ? <p className="mt-1 text-[11px] text-warning">{version.note}</p> : null}
            </li>
          ))}
        </ul>
      </Modal>
    </TrackCard>
  );
}
