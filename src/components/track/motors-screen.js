"use client";

import { useEffect, useState } from "react";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { IQMOTORTRACK_FREE_MOTOR_LIMIT, IQMOTORTRACK_MONTHLY_USD } from "@/lib/iqmotortrack-marketing";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPaypalSubscribeModal from "./paypal-subscribe";

const STATUS_VARIANT = {
  in_service: "success",
  down: "danger",
  under_repair: "warning",
  spare: "default",
  retired: "default",
};

const STATUS_LABEL = {
  in_service: "In service",
  down: "Down",
  under_repair: "Under repair",
  spare: "Spare",
  retired: "Retired",
};

const CRITICALITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "important", label: "Important" },
  { value: "standard", label: "Standard" },
  { value: "spare", label: "Spare" },
];

const STATUS_OPTIONS = [
  { value: "in_service", label: "In service" },
  { value: "down", label: "Down" },
  { value: "under_repair", label: "Under repair" },
  { value: "spare", label: "Spare" },
  { value: "retired", label: "Retired" },
];

const POWER_OPTIONS = [
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

const emptyForm = () => ({
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
  frame: "",
  enclosure: "",
  locationBuilding: "",
  locationArea: "",
  locationAssetTag: "",
  criticality: "standard",
  status: "in_service",
  notes: "",
});

function motorTitle(m) {
  const parts = [m.manufacturer, m.hp ? `${m.hp} HP` : m.kw ? `${m.kw} kW` : "", m.voltage].filter(Boolean);
  return parts.join(" · ") || "Motor";
}

export default function TrackMotorsScreen() {
  const confirm = useConfirm();
  const toast = useToast();
  const { token, session, refreshSession } = useTrackAuth();
  const [motors, setMotors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await appFetch("/api/track/motors", { token });
      setMotors(data.motors || []);
      await refreshSession().catch(() => {});
    } catch (err) {
      toast.error(err.message || "Could not load motors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const atLimit = !session?.isPro && motors.length >= (session?.motorLimit || IQMOTORTRACK_FREE_MOTOR_LIMIT);

  const openCreate = () => {
    if (atLimit) {
      setPayOpen(true);
      return;
    }
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({
      manufacturer: m.manufacturer || "",
      modelNumber: m.modelNumber || "",
      serialNumber: m.serialNumber || "",
      powerType: m.powerType || "AC",
      motorType: m.motorType || "",
      hp: m.hp || "",
      kw: m.kw || "",
      voltage: m.voltage || "",
      fullLoadAmps: m.fullLoadAmps || "",
      rpm: m.rpm || "",
      frame: m.frame || "",
      enclosure: m.enclosure || "",
      locationBuilding: m.locationBuilding || "",
      locationArea: m.locationArea || "",
      locationAssetTag: m.locationAssetTag || "",
      criticality: m.criticality || "standard",
      status: m.status || "in_service",
      notes: m.notes || "",
    });
    setFormOpen(true);
  };

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing?.id) {
        await appFetch(`/api/track/motors/${editing.id}`, {
          token,
          method: "PATCH",
          body: form,
        });
        toast.success("Motor updated.");
      } else {
        await appFetch("/api/track/motors", {
          token,
          method: "POST",
          body: form,
        });
        toast.success("Motor added.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      if (err.code === "MOTOR_LIMIT") {
        setFormOpen(false);
        setPayOpen(true);
      }
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m) => {
    const ok = await confirm({
      title: "Archive motor",
      message: `Archive ${motorTitle(m)}? It will no longer count toward your free limit.`,
      confirmLabel: "Archive",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch(`/api/track/motors/${m.id}`, { token, method: "DELETE" });
      toast.success("Motor archived.");
      await load();
    } catch (err) {
      toast.error(err.message || "Could not archive.");
    }
  };

  return (
    <div className="space-y-3 px-4 pb-6 pt-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm text-secondary">{session?.usageLabel || "Motors"}</p>
          {!session?.isPro ? (
            <p className="text-xs text-secondary">
              Free tier: {IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Pro ${IQMOTORTRACK_MONTHLY_USD}/mo unlimited.
            </p>
          ) : (
            <Badge variant="success" className="mt-1 rounded-full px-2.5 py-0.5 text-xs">
              Pro
            </Badge>
          )}
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
          Add
        </Button>
      </div>

      {atLimit ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-title">
          Free plan limit reached. Upgrade to Pro (${IQMOTORTRACK_MONTHLY_USD}/mo) for unlimited motors.
          <Button type="button" size="sm" className="mt-2 w-full" onClick={() => setPayOpen(true)}>
            Upgrade with PayPal
          </Button>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-secondary">Loading motors…</p> : null}
      {!loading && motors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
          <p className="font-semibold text-title">No motors yet</p>
          <p className="mt-1 text-sm text-secondary">Add your first motor to start motor maintenance and repair tracking.</p>
          <Button type="button" className="mt-4" onClick={openCreate}>
            <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
            Add motor
          </Button>
        </div>
      ) : null}

      <ul className="space-y-2">
        {motors.map((m) => (
          <li key={m.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-start gap-2">
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(m)}
                  className="rounded-md p-2 text-primary hover:bg-primary/10"
                  aria-label="Edit"
                >
                  <FiEdit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(m)}
                  className="rounded-md p-2 text-danger hover:bg-danger/10"
                  aria-label="Archive"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-title">{motorTitle(m)}</p>
                <p className="mt-0.5 text-xs text-secondary">
                  {[m.locationBuilding, m.locationArea, m.locationAssetTag].filter(Boolean).join(" · ") || "No location"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge
                    variant={STATUS_VARIANT[m.status] || "default"}
                    className="rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {STATUS_LABEL[m.status] || m.status}
                  </Badge>
                  <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                    {m.powerType}
                  </Badge>
                  {m.serialNumber ? (
                    <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                      S/N {m.serialNumber}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit motor" : "Add motor"}
        size="md"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-motor-form" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="track-motor-form" onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <Input label="Manufacturer" value={form.manufacturer} onChange={setField("manufacturer")} required />
          <Input label="Model" value={form.modelNumber} onChange={setField("modelNumber")} />
          <Input label="Serial number" value={form.serialNumber} onChange={setField("serialNumber")} />
          <Select label="Power" value={form.powerType} onChange={setField("powerType")} options={POWER_OPTIONS} />
          <Input label="HP" value={form.hp} onChange={setField("hp")} />
          <Input label="kW" value={form.kw} onChange={setField("kw")} />
          <Input label="Voltage" value={form.voltage} onChange={setField("voltage")} required />
          <Input label="FLA" value={form.fullLoadAmps} onChange={setField("fullLoadAmps")} />
          <Input label="RPM" value={form.rpm} onChange={setField("rpm")} />
          <Input label="Frame" value={form.frame} onChange={setField("frame")} />
          <Input label="Enclosure" value={form.enclosure} onChange={setField("enclosure")} />
          <Input label="Motor type" value={form.motorType} onChange={setField("motorType")} />
          <Input label="Building" value={form.locationBuilding} onChange={setField("locationBuilding")} />
          <Input label="Area" value={form.locationArea} onChange={setField("locationArea")} />
          <Input label="Asset tag" value={form.locationAssetTag} onChange={setField("locationAssetTag")} />
          <Select
            label="Criticality"
            value={form.criticality}
            onChange={setField("criticality")}
            options={CRITICALITY_OPTIONS}
          />
          <Select label="Status" value={form.status} onChange={setField("status")} options={STATUS_OPTIONS} />
          <div className="sm:col-span-2">
            <Input label="Notes" value={form.notes} onChange={setField("notes")} />
          </div>
        </Form>
      </Modal>

      <TrackPaypalSubscribeModal open={payOpen} onClose={() => setPayOpen(false)} />
    </div>
  );
}
