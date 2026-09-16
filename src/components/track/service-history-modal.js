"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPhotoInput from "./photo-input";

const FORM_ID = "track-service-history-form";

const WORK_TYPE_OPTIONS = [
  { value: "rewind", label: "Rewind" },
  { value: "bearing_replacement", label: "Bearing replacement" },
  { value: "mechanical", label: "Mechanical" },
  { value: "testing", label: "Testing" },
  { value: "field_service", label: "Field service" },
  { value: "other", label: "Other" },
];

function emptyForm() {
  return {
    completedAt: new Date().toISOString().slice(0, 10),
    shopName: "",
    jobNumber: "",
    invoiceNumber: "",
    workType: "rewind",
    description: "",
    finalCost: "",
    currency: "USD",
    turnaroundDays: "",
    failureCause: "",
    warrantyMonths: "",
    attachments: [],
  };
}

/**
 * §6.7 - manual service history entry for work done outside the platform.
 * Entries created from IQMotorBase job events arrive automatically instead.
 */
export default function TrackServiceHistoryModal({ open, motorId, onClose, onSaved }) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appFetch(`/api/track/motors/${motorId}/service-history`, {
        token,
        method: "POST",
        body: form,
      });
      toast.success("Service history added.");
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
      title="Add service history"
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
        <Input
          label="Date completed"
          type="date"
          value={form.completedAt}
          onChange={setField("completedAt")}
          required
        />
        <Input
          label="Shop"
          value={form.shopName}
          onChange={setField("shopName")}
          help="Free text for shops outside IQMotorBase."
        />
        <Input label="Job number" value={form.jobNumber} onChange={setField("jobNumber")} />
        <Input label="Invoice number" value={form.invoiceNumber} onChange={setField("invoiceNumber")} />
        <Select
          label="Work type"
          value={form.workType}
          onChange={setField("workType")}
          options={WORK_TYPE_OPTIONS}
          searchable={false}
        />
        <Input label="Final cost" value={form.finalCost} onChange={setField("finalCost")} />
        <Input label="Currency" value={form.currency} onChange={setField("currency")} maxLength={3} />
        <Input
          label="Turnaround days"
          value={form.turnaroundDays}
          onChange={setField("turnaroundDays")}
        />
        <Input
          label="Warranty months"
          value={form.warrantyMonths}
          onChange={setField("warrantyMonths")}
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Description of work"
            rows={3}
            value={form.description}
            onChange={setField("description")}
          />
        </div>
        <div className="sm:col-span-2">
          <Input label="Failure cause" value={form.failureCause} onChange={setField("failureCause")} />
        </div>
        <div className="sm:col-span-2">
          <TrackPhotoInput
            label="Test report and attachments"
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
