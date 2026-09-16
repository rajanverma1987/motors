"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_MAINTENANCE_ACTIVITY_OPTIONS,
  TRACK_MAINTENANCE_READING_FIELDS,
} from "@/lib/track-maintenance";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPhotoInput from "./photo-input";

const FORM_ID = "track-maintenance-form";

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    activityType: "lubrication",
    performedAt: todayValue(),
    performedBy: "",
    insulationResistanceMohm: "",
    vibrationInPerSec: "",
    temperatureF: "",
    notes: "",
    nextDueAt: "",
    attachments: [],
  };
}

/** §6.8 - log a maintenance activity with readings and an optional next due date. */
export default function TrackMaintenanceModal({ open, motorId, onClose, onSaved }) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const readings = TRACK_MAINTENANCE_READING_FIELDS[form.activityType] || [];

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appFetch(`/api/track/motors/${motorId}/maintenance`, {
        token,
        method: "POST",
        body: { ...form, nextDueAt: form.nextDueAt || null },
      });
      toast.success("Maintenance logged.");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log maintenance"
      size="md"
      actions={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <Form id={FORM_ID} onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Activity"
          value={form.activityType}
          onChange={setField("activityType")}
          options={TRACK_MAINTENANCE_ACTIVITY_OPTIONS}
          searchable={false}
        />
        <Input
          label="Date performed"
          type="date"
          value={form.performedAt}
          onChange={setField("performedAt")}
          required
        />
        <Input label="Performed by" value={form.performedBy} onChange={setField("performedBy")} />
        <Input
          label="Next due"
          type="date"
          value={form.nextDueAt}
          onChange={setField("nextDueAt")}
          help="Sets the due date for this activity type on this motor."
        />

        {readings.map((field) => (
          <Input
            key={field.key}
            label={field.label}
            value={form[field.key]}
            onChange={setField(field.key)}
          />
        ))}
        {readings.length === 0 ? (
          <>
            <Input
              label="Insulation resistance (MΩ)"
              value={form.insulationResistanceMohm}
              onChange={setField("insulationResistanceMohm")}
            />
            <Input
              label="Vibration (in/sec)"
              value={form.vibrationInPerSec}
              onChange={setField("vibrationInPerSec")}
            />
          </>
        ) : null}

        <div className="sm:col-span-2">
          <Textarea label="Notes" rows={3} value={form.notes} onChange={setField("notes")} />
        </div>
        <div className="sm:col-span-2">
          <TrackPhotoInput
            label="Attachments"
            multiple
            max={4}
            profile="document"
            values={form.attachments}
            onChange={(urls) => setForm((prev) => ({ ...prev, attachments: urls }))}
          />
        </div>
      </Form>
    </Modal>
  );
}
