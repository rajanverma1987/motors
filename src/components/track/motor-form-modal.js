"use client";

import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_CRITICALITY_OPTIONS,
  TRACK_ENCLOSURE_OPTIONS,
  TRACK_PHASE_OPTIONS,
  TRACK_POWER_OPTIONS,
  TRACK_STATUS_OPTIONS,
} from "@/lib/track-motor-fields";
import { appFetch } from "./api";
import { resolveMachineType } from "@/lib/machine-types";
import { useTrackAuth } from "./auth-context";
import TrackPhotoInput from "./photo-input";
import { trackDateInputValue } from "./ui";

const FORM_ID = "track-motor-form";

const STEPS = [
  { id: 1, label: "Photos" },
  { id: 2, label: "Nameplate" },
  { id: 3, label: "Location" },
];

function emptyForm() {
  return {
    nameplatePhotoUrl: "",
    motorPhotoUrl: "",
    extraPhotoUrls: [],
    manufacturer: "",
    modelNumber: "",
    serialNumber: "",
    powerType: "AC",
    motorType: "",
    hp: "",
    kw: "",
    voltage: "",
    fullLoadAmps: "",
    rpm: "",
    phase: "",
    hz: "",
    poles: "",
    frame: "",
    enclosure: "",
    insulationClass: "",
    serviceFactor: "",
    nemaDesign: "",
    kva: "",
    powerFactor: "",
    ratedFlow: "",
    ratedHead: "",
    pumpSize: "",
    bearingDE: "",
    bearingODE: "",
    facilityLocation: "",
    locationBuilding: "",
    locationArea: "",
    locationAssetTag: "",
    application: "",
    installDate: "",
    criticality: "standard",
    status: "in_service",
    notes: "",
  };
}

function fromMotor(motor) {
  const base = emptyForm();
  if (!motor) return base;
  const next = { ...base };
  for (const key of Object.keys(base)) {
    if (key === "extraPhotoUrls") {
      next.extraPhotoUrls = Array.isArray(motor.extraPhotoUrls) ? motor.extraPhotoUrls : [];
    } else if (key === "installDate") {
      next.installDate = trackDateInputValue(motor.installDate);
    } else {
      next[key] = motor[key] ?? base[key];
    }
  }
  return next;
}

/**
 * Three-step motor register flow (§6.3). Every step is skippable except the
 * required fields, which are validated when Save is pressed.
 */
export default function TrackMotorFormModal({ open, motor, onClose, onSaved }) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(fromMotor(motor));
    setStep(1);
  }, [open, motor]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const missing = useMemo(() => {
    const list = [];
    const machineType = resolveMachineType(form.powerType, "AC");
    if (!form.manufacturer.trim()) list.push("Manufacturer");
    if (machineType !== "Pump" && !form.voltage.trim()) list.push("Voltage");
    const hasPower = form.hp.trim() || form.kw.trim();
    if (machineType === "Pump") {
      if (!hasPower && !form.ratedFlow.trim()) list.push("HP, kW, or rated flow");
    } else if (machineType === "Generator") {
      if (!hasPower && !form.kva.trim()) list.push("kVA, HP, or kW");
    } else if (!hasPower) {
      list.push("HP or kW");
    }
    if (!form.facilityLocation.trim()) list.push("Facility location");
    return list;
  }, [form]);

  const submit = async (e) => {
    e.preventDefault();
    if (missing.length) {
      toast.error(`Still needed: ${missing.join(", ")}.`);
      setStep(missing.includes("Facility location") && missing.length === 1 ? 3 : 2);
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, installDate: form.installDate || null };
      const data = motor?.id
        ? await appFetch(`/api/track/motors/${motor.id}`, { token, method: "PATCH", body: payload })
        : await appFetch("/api/track/motors", { token, method: "POST", body: payload });
      toast.success(motor?.id ? "Motor updated." : "Motor added.");
      if (data?.serialNumberWarning) toast.error(data.serialNumberWarning);
      onSaved?.(data?.motor || null);
      onClose();
    } catch (err) {
      if (err.code === "MOTOR_LIMIT") {
        onClose();
        onSaved?.(null, { limitReached: true });
      }
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={motor?.id ? "Edit motor" : "Add motor"}
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
      <div className="mb-4 flex items-center gap-1.5">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(s.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold ${
              step === s.id ? "bg-primary text-white" : "bg-bg text-secondary"
            }`}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </div>

      <Form id={FORM_ID} onSubmit={submit} className="space-y-4">
        {step === 1 ? (
          <div className="space-y-4">
            <p className="text-xs text-secondary">
              Take the nameplate photo first. You can skip this step and add photos later.
            </p>
            <TrackPhotoInput
              label="Nameplate photo"
              value={form.nameplatePhotoUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, nameplatePhotoUrl: url }))}
            />
            <TrackPhotoInput
              label="Whole motor photo"
              value={form.motorPhotoUrl}
              onChange={(url) => setForm((prev) => ({ ...prev, motorPhotoUrl: url }))}
            />
            <TrackPhotoInput
              label="Other photos"
              multiple
              max={4}
              values={form.extraPhotoUrls}
              onChange={(urls) => setForm((prev) => ({ ...prev, extraPhotoUrls: urls }))}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Manufacturer" value={form.manufacturer} onChange={setField("manufacturer")} required />
            <Input label="Model number" value={form.modelNumber} onChange={setField("modelNumber")} />
            <div className="sm:col-span-2">
              <Input
                label="Serial number"
                value={form.serialNumber}
                onChange={setField("serialNumber")}
                help="Strongly recommended. It is this motor's identity across every shop."
              />
              {!form.serialNumber.trim() ? (
                <p className="mt-1 text-[11px] text-warning">
                  Without a serial number, shops cannot match this motor to their own records.
                </p>
              ) : null}
            </div>
            <Select
              label="Machine type"
              value={form.powerType}
              onChange={setField("powerType")}
              options={TRACK_POWER_OPTIONS}
              searchable={false}
              help="Decides which datasheet format applies: AC, DC, Pump, or Generator."
            />
            <Input
              label="Motor type"
              value={form.motorType}
              onChange={setField("motorType")}
              placeholder="Induction, synchronous, servo…"
            />
            <Input label="HP" value={form.hp} onChange={setField("hp")} />
            <Input label="kW" value={form.kw} onChange={setField("kw")} />
            <div className="sm:col-span-2">
              <Input
                label="Voltage"
                value={form.voltage}
                onChange={setField("voltage")}
                placeholder="460 or 230/460"
                required={resolveMachineType(form.powerType, "AC") !== "Pump"}
              />
            </div>
            <Input label="Full load amps" value={form.fullLoadAmps} onChange={setField("fullLoadAmps")} />
            <Input label="RPM" value={form.rpm} onChange={setField("rpm")} />
            <Select
              label="Phase"
              value={form.phase}
              onChange={setField("phase")}
              options={TRACK_PHASE_OPTIONS}
              searchable={false}
            />
            <Input label="Hz" value={form.hz} onChange={setField("hz")} />
            <Input label="Poles" value={form.poles} onChange={setField("poles")} />
            <Input label="Frame size" value={form.frame} onChange={setField("frame")} />
            <Select
              label="Enclosure"
              value={form.enclosure}
              onChange={setField("enclosure")}
              options={TRACK_ENCLOSURE_OPTIONS}
              searchable={false}
            />
            <Input label="Insulation class" value={form.insulationClass} onChange={setField("insulationClass")} />
            <Input label="Service factor" value={form.serviceFactor} onChange={setField("serviceFactor")} />
            <Input label="NEMA design letter" value={form.nemaDesign} onChange={setField("nemaDesign")} />
            <Input label="kVA" value={form.kva} onChange={setField("kva")} />
            <Input label="Power factor" value={form.powerFactor} onChange={setField("powerFactor")} />
            <Input label="Rated flow" value={form.ratedFlow} onChange={setField("ratedFlow")} />
            <Input label="Rated head" value={form.ratedHead} onChange={setField("ratedHead")} />
            <Input label="Pump size" value={form.pumpSize} onChange={setField("pumpSize")} />
            <Input label="Bearing DE" value={form.bearingDE} onChange={setField("bearingDE")} />
            <Input label="Bearing ODE" value={form.bearingODE} onChange={setField("bearingODE")} />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Facility location"
                value={form.facilityLocation}
                onChange={setField("facilityLocation")}
                placeholder="Building A, Line 3, Pump Station 2"
                required
              />
            </div>
            <Input label="Building" value={form.locationBuilding} onChange={setField("locationBuilding")} />
            <Input label="Area or line" value={form.locationArea} onChange={setField("locationArea")} />
            <Input label="Asset tag" value={form.locationAssetTag} onChange={setField("locationAssetTag")} />
            <Input
              label="Application"
              value={form.application}
              onChange={setField("application")}
              placeholder="Pump, compressor, fan, conveyor"
            />
            <Select
              label="Criticality"
              value={form.criticality}
              onChange={setField("criticality")}
              options={TRACK_CRITICALITY_OPTIONS}
              searchable={false}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={setField("status")}
              options={TRACK_STATUS_OPTIONS}
              searchable={false}
            />
            <Input
              label="Install date"
              type="date"
              value={form.installDate}
              onChange={setField("installDate")}
            />
            <div className="sm:col-span-2">
              <Textarea label="Notes" rows={3} value={form.notes} onChange={setField("notes")} />
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
          >
            <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Back
          </Button>
          {step < 3 ? (
            <Button type="button" size="sm" onClick={() => setStep((s) => Math.min(3, s + 1))}>
              {step === 1 ? "Skip to nameplate" : "Next"}
              <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </Button>
          ) : (
            <span className="text-[11px] text-secondary">
              {missing.length ? `Still needed: ${missing.join(", ")}` : "Ready to save"}
            </span>
          )}
        </div>
      </Form>
    </Modal>
  );
}
