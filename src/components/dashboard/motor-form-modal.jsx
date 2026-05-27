"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import MotorSpecGrid from "@/components/dashboard/motor-spec-grid";
import {
  AC_OTHERS_FIELDS,
  DC_ARMATURE_OTHERS_FIELDS,
  DC_OTHERS_FIELDS,
} from "@/lib/work-order-fields";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  buildMotorPayload,
  isAcMotorType,
  isDcMotorType,
  motorApiToForm,
} from "@/lib/motor-record-form";

const FORM_ID = "motor-form-modal-edit";

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

export default function MotorFormModal({
  open,
  motorId,
  onClose,
  onAfterSave,
  zIndex = 135,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const formRef = useRef(form);
  formRef.current = form;
  const [customers, setCustomers] = useState([]);

  const customerOptions = useMemo(
    () =>
      [{ value: "", label: "Select customer…" }].concat(
        customers.map((c) => ({ value: c.id, label: c.companyName || c.id || "—" }))
      ),
    [customers]
  );

  const loadCustomers = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
      setCustomers(list);
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadMotor = useCallback(async () => {
    const id = String(motorId || "").trim();
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/motors/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load motor");
      setForm(motorApiToForm(data));
    } catch (e) {
      toast.error(e.message || "Failed to load motor");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [motorId, toast, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(null);
      setLoading(false);
      return;
    }
    const id = String(motorId || "").trim();
    if (!id) {
      onClose?.();
      return;
    }
    loadCustomers();
    loadMotor();
  }, [open, motorId, loadCustomers, loadMotor, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = String(motorId || "").trim();
    const current = formRef.current;
    if (!id || !current?.customerId?.trim()) {
      toast.error("Customer is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/motors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildMotorPayload(current)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update motor");
      toast.success("Motor updated.");
      onAfterSave?.(data.motor ?? data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update motor");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit motor"
      size="full"
      width="min(1600px, 96vw)"
      showClose={!saving}
      zIndex={zIndex}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || loading || !form}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      {loading || !form ? (
        <p className="py-8 text-center text-secondary">Loading…</p>
      ) : (
        <Form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="Customer"
                options={customerOptions}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value ?? "" }))}
                searchable
                className="lg:col-span-2 min-w-0"
              />
              <Input
                label="Serial number"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Motor details</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
              <Input
                label="Manufacturer"
                value={form.manufacturer}
                onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
              />
              <Input label="Model" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                searchable={false}
              />
              <Input label="HP" value={form.hp} onChange={(e) => setForm((f) => ({ ...f, hp: e.target.value }))} />
              <Input label="RPM" value={form.rpm} onChange={(e) => setForm((f) => ({ ...f, rpm: e.target.value }))} />
              <Input label="Voltage" value={form.voltage} onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))} />
              <Input label="KW" value={form.kw} onChange={(e) => setForm((f) => ({ ...f, kw: e.target.value }))} />
              <Input label="AMPs" value={form.amps} onChange={(e) => setForm((f) => ({ ...f, amps: e.target.value }))} />
              <Input label="Frame size" value={form.frameSize} onChange={(e) => setForm((f) => ({ ...f, frameSize: e.target.value }))} />
              <Input label="Slots" value={form.slots} onChange={(e) => setForm((f) => ({ ...f, slots: e.target.value }))} />
              <Input label="Core length" value={form.coreLength} onChange={(e) => setForm((f) => ({ ...f, coreLength: e.target.value }))} />
              <Input label="Core diameter" value={form.coreDiameter} onChange={(e) => setForm((f) => ({ ...f, coreDiameter: e.target.value }))} />
              <Input label="Bars" value={form.bars} onChange={(e) => setForm((f) => ({ ...f, bars: e.target.value }))} />
            </div>
          </div>
          {isAcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">AC winding</h3>
              <MotorSpecGrid
                fields={AC_OTHERS_FIELDS}
                values={form.acSpecs}
                onChange={(key, v) => setForm((f) => ({ ...f, acSpecs: { ...f.acSpecs, [key]: v } }))}
                idPrefix="motor-modal-ac"
              />
            </div>
          ) : isDcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4 space-y-8">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">DC motor</h3>
                <MotorSpecGrid
                  fields={DC_OTHERS_FIELDS}
                  values={form.dcSpecs}
                  onChange={(key, v) => setForm((f) => ({ ...f, dcSpecs: { ...f.dcSpecs, [key]: v } }))}
                  idPrefix="motor-modal-dc"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">Armature</h3>
                <MotorSpecGrid
                  fields={DC_ARMATURE_OTHERS_FIELDS}
                  values={form.dcArmatureSpecs}
                  onChange={(key, v) =>
                    setForm((f) => ({ ...f, dcArmatureSpecs: { ...f.dcArmatureSpecs, [key]: v } }))
                  }
                  idPrefix="motor-modal-arm"
                />
              </div>
            </div>
          ) : null}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            rows={3}
          />
        </Form>
      )}
    </Modal>
  );
}
