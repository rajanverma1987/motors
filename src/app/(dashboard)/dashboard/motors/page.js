"use client";

import { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiEdit2, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import ModalActionsDropdown from "@/components/ui/modal-actions-dropdown";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form, FormLayout, FormField } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  AC_WORK_ORDER_FIELDS,
  DC_WORK_ORDER_FIELDS,
  DC_ARMATURE_FIELDS,
  emptySpecsFromFields,
} from "@/lib/work-order-fields";

function mergeSpecsFromMotor(stored, fieldList) {
  const base = emptySpecsFromFields(fieldList);
  if (!stored || typeof stored !== "object") return base;
  for (const { key } of fieldList) {
    if (stored[key] != null && String(stored[key]).trim() !== "") base[key] = String(stored[key]);
  }
  return base;
}

function motorSpecColumnCount() {
  if (typeof window === "undefined") return 3;
  const w = window.innerWidth;
  if (w < 640) return 1;
  if (w < 1024) return 2;
  return 3;
}

function useMotorSpecColumns() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const m640 = window.matchMedia("(min-width: 640px)");
      const m1024 = window.matchMedia("(min-width: 1024px)");
      const fn = () => onStoreChange();
      m640.addEventListener("change", fn);
      m1024.addEventListener("change", fn);
      window.addEventListener("resize", fn);
      return () => {
        m640.removeEventListener("change", fn);
        m1024.removeEventListener("change", fn);
        window.removeEventListener("resize", fn);
      };
    },
    motorSpecColumnCount,
    () => 3
  );
}

function MotorSpecGrid({ fields, values, onChange, idPrefix = "motor" }) {
  const cols = useMotorSpecColumns();
  return (
    <FormLayout
      labelWidth="minmax(7.5rem, 10.5rem)"
      cols={cols}
      className="w-full min-w-0"
    >
      {fields.map(({ key, label }) => {
        const fid = `${idPrefix}-${key}`;
        return (
          <FormField key={key} label={label} id={fid} name={key} labelAlign="right" classNameLabel="pr-2">
            <Input
              id={fid}
              name={key}
              value={values[key] ?? ""}
              onChange={(e) => onChange(key, e.target.value)}
              className="min-w-0"
            />
          </FormField>
        );
      })}
    </FormLayout>
  );
}

function WorkOrderSpecBlock({ title, subtitle, specs, fields }) {
  if (!fields?.length) return null;
  const data = specs && typeof specs === "object" ? specs : {};
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">
        {title}
      </h3>
      {subtitle ? (
        <p className="mb-3 text-xs text-secondary">{subtitle}</p>
      ) : null}
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
        {fields.map((f) => {
          const raw = data[f.key];
          const value =
            raw != null && String(raw).trim() !== "" ? String(raw).trim() : "—";
          return (
            <div key={f.key}>
              <dt className="text-secondary">{f.label}</dt>
              <dd className="text-title break-words">{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

const MOTOR_TYPE_OPTIONS = [
  { value: "", label: "Select type" },
  { value: "AC", label: "AC" },
  { value: "DC", label: "DC" },
];

function isAcMotorType(t) {
  return String(t || "").toUpperCase() === "AC";
}
function isDcMotorType(t) {
  return String(t || "").toUpperCase() === "DC";
}

function freshMotorForm() {
  return {
    customerId: "",
    serialNumber: "",
    manufacturer: "",
    model: "",
    hp: "",
    rpm: "",
    voltage: "",
    kw: "",
    amps: "",
    frameSize: "",
    motorType: "",
    slots: "",
    coreLength: "",
    coreDiameter: "",
    bars: "",
    notes: "",
    acSpecs: emptySpecsFromFields(AC_WORK_ORDER_FIELDS),
    dcSpecs: emptySpecsFromFields(DC_WORK_ORDER_FIELDS),
    dcArmatureSpecs: emptySpecsFromFields(DC_ARMATURE_FIELDS),
  };
}

function buildMotorPayload(form) {
  const f = form || {};
  return {
    customerId: f.customerId ?? "",
    serialNumber: f.serialNumber ?? "",
    manufacturer: f.manufacturer ?? "",
    model: f.model ?? "",
    hp: f.hp ?? "",
    rpm: f.rpm ?? "",
    voltage: f.voltage ?? "",
    kw: f.kw ?? "",
    amps: f.amps ?? "",
    frameSize: f.frameSize ?? "",
    motorType: f.motorType ?? "",
    slots: f.slots ?? "",
    coreLength: f.coreLength ?? "",
    coreDiameter: f.coreDiameter ?? "",
    bars: f.bars ?? "",
    motorPhotos: Array.isArray(f.motorPhotos) ? f.motorPhotos : [],
    nameplateImages: Array.isArray(f.nameplateImages) ? f.nameplateImages : [],
    notes: f.notes ?? "",
    acSpecs: f.acSpecs && typeof f.acSpecs === "object" ? f.acSpecs : {},
    dcSpecs: f.dcSpecs && typeof f.dcSpecs === "object" ? f.dcSpecs : {},
    dcArmatureSpecs:
      f.dcArmatureSpecs && typeof f.dcArmatureSpecs === "object" ? f.dcArmatureSpecs : {},
  };
}

export default function DashboardMotorsPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");
  const openMotorId = searchParams.get("open");

  const [motors, setMotors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingMotor, setViewingMotor] = useState(null);
  const [viewLoadingMotorId, setViewLoadingMotorId] = useState(null);
  const [savingMotor, setSavingMotor] = useState(false);
  const [form, setForm] = useState(() => freshMotorForm());
  const formRef = useRef(form);
  formRef.current = form;

  const loadMotors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/motors", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load motors");
      setMotors(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load motors");
      setMotors([]);
    }
  }, [toast]);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/customers", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load customers");
      setCustomers(Array.isArray(data) ? data : []);
    } catch (e) {
      setCustomers([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadMotors(), loadCustomers()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadMotors, loadCustomers]);

  useEffect(() => {
    if (!fromLeadId) return;
    let cancelled = false;
    (async () => {
      try {
        const leadRes = await fetch(`/api/dashboard/leads/${fromLeadId}`, { credentials: "include" });
        const lead = await leadRes.json();
        if (cancelled || !leadRes.ok) return;
        setForm((prev) => ({
          ...prev,
          motorType: lead.motorType ?? prev.motorType,
          hp: lead.motorHp ?? prev.hp,
          voltage: lead.voltage ?? prev.voltage,
          notes: lead.problemDescription || lead.message || prev.notes,
        }));
        setCreateModalOpen(true);
        router.replace("/dashboard/motors", { scroll: false });
      } catch {
        if (!cancelled) toast.error("Could not load lead.");
      }
    })();
    return () => { cancelled = true; };
  }, [fromLeadId, toast, router]);

  useEffect(() => {
    const id = openMotorId?.trim();
    if (!id) return;
    setViewLoadingMotorId(id);
    setViewModalOpen(true);
    router.replace("/dashboard/motors", { scroll: false });
  }, [openMotorId, router]);

  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.id, label: c.companyName || c.id || "—" })),
    [customers]
  );

  const customerNameMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => { m[c.id] = c.companyName || c.id || "—"; });
    return m;
  }, [customers]);

  const openViewModal = (motor) => {
    if (!motor?.id) {
      setViewingMotor(motor);
      setViewModalOpen(true);
      return;
    }
    setViewingMotor(null);
    setViewLoadingMotorId(motor.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingMotorId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/motors/${viewLoadingMotorId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingMotorId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingMotor(data);
        setViewLoadingMotorId(null);
      } catch {
        if (!cancelled) setViewLoadingMotorId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingMotorId]);

  const closeViewModal = () => {
    setViewModalOpen(false);
    setViewingMotor(null);
    setViewLoadingMotorId(null);
  };

  const openEditModal = async (motor) => {
    if (!motor) return;
    let dataToUse = motor;
    if (motor?.id) {
      try {
        const res = await fetch(`/api/dashboard/motors/${motor.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {
        // use row data
      }
    }
    setViewingMotor(dataToUse);
    setForm({
      customerId: dataToUse.customerId ?? "",
      serialNumber: dataToUse.serialNumber ?? "",
      manufacturer: dataToUse.manufacturer ?? "",
      model: dataToUse.model ?? "",
      hp: dataToUse.hp ?? "",
      rpm: dataToUse.rpm ?? "",
      voltage: dataToUse.voltage ?? "",
      kw: dataToUse.kw ?? "",
      amps: dataToUse.amps ?? "",
      frameSize: dataToUse.frameSize ?? "",
      motorType: dataToUse.motorType ?? "",
      slots: dataToUse.slots ?? "",
      coreLength: dataToUse.coreLength ?? "",
      coreDiameter: dataToUse.coreDiameter ?? "",
      bars: dataToUse.bars ?? "",
      notes: dataToUse.notes ?? "",
      acSpecs: mergeSpecsFromMotor(dataToUse.acSpecs, AC_WORK_ORDER_FIELDS),
      dcSpecs: mergeSpecsFromMotor(dataToUse.dcSpecs, DC_WORK_ORDER_FIELDS),
      dcArmatureSpecs: mergeSpecsFromMotor(dataToUse.dcArmatureSpecs, DC_ARMATURE_FIELDS),
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingMotor(null);
  };

  const openCreateModal = () => {
    setForm(freshMotorForm());
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => setCreateModalOpen(false);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!currentForm.customerId?.trim()) {
      toast.error("Customer is required.");
      return;
    }
    setSavingMotor(true);
    try {
      const res = await fetch("/api/dashboard/motors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildMotorPayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create motor");
      toast.success("Motor created.");
      closeCreateModal();
      loadMotors();
    } catch (err) {
      toast.error(err.message || "Failed to create motor");
    } finally {
      setSavingMotor(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const currentForm = formRef.current;
    if (!viewingMotor?.id || !currentForm.customerId?.trim()) {
      toast.error("Customer is required.");
      return;
    }
    setSavingMotor(true);
    try {
      const res = await fetch(`/api/dashboard/motors/${viewingMotor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildMotorPayload(currentForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update motor");
      toast.success("Motor updated.");
      setMotors((prev) =>
        prev.map((m) => (m.id === viewingMotor.id ? { ...m, ...data.motor } : m))
      );
      setViewingMotor(data.motor);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update motor");
    } finally {
      setSavingMotor(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredMotors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return motors;
    return motors.filter((m) => {
      const cust = customerNameMap[m.customerId] || "";
      const serial = (m.serialNumber || "").toLowerCase();
      const manu = (m.manufacturer || "").toLowerCase();
      const model = (m.model || "").toLowerCase();
      return cust.toLowerCase().includes(q) || serial.includes(q) || manu.includes(q) || model.includes(q);
    });
  }, [motors, searchQuery, customerNameMap]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "customer",
        label: "Customer",
        render: (_, row) => customerNameMap[row.customerId] || row.customerId || "—",
      },
      {
        key: "serialNumber",
        label: "Serial",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.serialNumber || "—"}
          </button>
        ),
      },
      { key: "manufacturer", label: "Manufacturer" },
      { key: "model", label: "Model" },
      { key: "hp", label: "HP" },
      { key: "rpm", label: "RPM" },
      { key: "voltage", label: "Voltage" },
      { key: "frameSize", label: "Frame" },
    ],
    [customerNameMap]
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Motor assets</h1>
          <p className="mt-1 text-sm text-secondary">
            Digital record of motors serviced. Link to customer. Create from list or from lead.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal} className="shrink-0">
          Create Motor
        </Button>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredMotors}
          rowKey="id"
          loading={loading}
          emptyMessage={motors.length === 0 ? "No motors yet. Use “Create Motor” or create from a lead." : "No motors match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search customer, serial, manufacturer, model…"
          onRefresh={async () => { setLoading(true); await loadMotors(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Create Motor modal */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Create Motor"
        width="min(1600px, 96vw)"
        actions={
          <Button type="submit" form="create-motor-form" variant="primary" size="sm" disabled={savingMotor}>
            {savingMotor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="create-motor-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="Customer"
                options={customerOptions}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value ?? "" }))}
                placeholder="Select customer"
                searchable
                className="lg:col-span-2 min-w-0"
              />
              <Input
                label="Serial number"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
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
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input
                label="HP"
                value={form.hp}
                onChange={(e) => setForm((f) => ({ ...f, hp: e.target.value }))}
                placeholder="e.g. 50"
              />
              <Input
                label="RPM"
                value={form.rpm}
                onChange={(e) => setForm((f) => ({ ...f, rpm: e.target.value }))}
                placeholder="e.g. 1800"
              />
              <Input
                label="Voltage"
                value={form.voltage}
                onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Input
                label="KW"
                value={form.kw}
                onChange={(e) => setForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="e.g. 37"
              />
              <Input
                label="AMPs"
                value={form.amps}
                onChange={(e) => setForm((f) => ({ ...f, amps: e.target.value }))}
                placeholder="e.g. 45"
              />
              <Input
                label="Frame size"
                value={form.frameSize}
                onChange={(e) => setForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
              <Input
                label="Slots"
                value={form.slots}
                onChange={(e) => setForm((f) => ({ ...f, slots: e.target.value }))}
                placeholder="Slots"
              />
              <Input
                label="Core length"
                value={form.coreLength}
                onChange={(e) => setForm((f) => ({ ...f, coreLength: e.target.value }))}
                placeholder="Core length"
              />
              <Input
                label="Core diameter"
                value={form.coreDiameter}
                onChange={(e) => setForm((f) => ({ ...f, coreDiameter: e.target.value }))}
                placeholder="Core diameter"
              />
              <Input
                label="Bars"
                value={form.bars}
                onChange={(e) => setForm((f) => ({ ...f, bars: e.target.value }))}
                placeholder="Bars"
              />
            </div>
          </div>
          {isAcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4">
              <p className="mb-4 text-sm text-secondary">
                AC winding data on this motor. New work orders prefill from here.
              </p>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">AC winding</h3>
              <MotorSpecGrid
                fields={AC_WORK_ORDER_FIELDS}
                values={form.acSpecs}
                onChange={(key, v) =>
                  setForm((f) => ({ ...f, acSpecs: { ...f.acSpecs, [key]: v } }))
                }
                idPrefix="create-ac"
              />
            </div>
          ) : isDcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4 space-y-8">
              <p className="text-sm text-secondary">
                DC field and armature data on this motor. New work orders prefill from here.
              </p>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">DC motor</h3>
                <MotorSpecGrid
                  fields={DC_WORK_ORDER_FIELDS}
                  values={form.dcSpecs}
                  onChange={(key, v) =>
                    setForm((f) => ({ ...f, dcSpecs: { ...f.dcSpecs, [key]: v } }))
                  }
                  idPrefix="create-dc"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">Armature</h3>
                <MotorSpecGrid
                  fields={DC_ARMATURE_FIELDS}
                  values={form.dcArmatureSpecs}
                  onChange={(key, v) =>
                    setForm((f) => ({
                      ...f,
                      dcArmatureSpecs: { ...f.dcArmatureSpecs, [key]: v },
                    }))
                  }
                  idPrefix="create-arm"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary">
              Select <span className="font-medium text-title">AC</span> or{" "}
              <span className="font-medium text-title">DC</span> as motor type above to enter technical fields.
            </p>
          )}
          <div>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
            />
          </div>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Motor details"
        width="min(1600px, 96vw)"
        actions={
          <>
            <ModalActionsDropdown
              items={[
                {
                  key: "close",
                  label: "Close",
                  icon: <FiX className="h-4 w-4 shrink-0 text-secondary" />,
                  onClick: closeViewModal,
                },
              ]}
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                closeViewModal();
                openEditModal(viewingMotor);
              }}
            >
              Edit
            </Button>
          </>
        }
      >
        {viewLoadingMotorId ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingMotor ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Customer</h3>
              <p className="text-title font-medium">{customerNameMap[viewingMotor.customerId] || viewingMotor.customerId || "—"}</p>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Identification & specs</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                <div><dt className="text-secondary">Serial</dt><dd className="text-title">{viewingMotor.serialNumber || "—"}</dd></div>
                <div><dt className="text-secondary">Manufacturer</dt><dd className="text-title">{viewingMotor.manufacturer || "—"}</dd></div>
                <div><dt className="text-secondary">Model</dt><dd className="text-title">{viewingMotor.model || "—"}</dd></div>
                <div><dt className="text-secondary">Motor type</dt><dd className="text-title">{viewingMotor.motorType || "—"}</dd></div>
                <div><dt className="text-secondary">HP</dt><dd className="text-title">{viewingMotor.hp || "—"}</dd></div>
                <div><dt className="text-secondary">RPM</dt><dd className="text-title">{viewingMotor.rpm || "—"}</dd></div>
                <div><dt className="text-secondary">Voltage</dt><dd className="text-title">{viewingMotor.voltage || "—"}</dd></div>
                <div><dt className="text-secondary">KW</dt><dd className="text-title">{viewingMotor.kw || "—"}</dd></div>
                <div><dt className="text-secondary">AMPs</dt><dd className="text-title">{viewingMotor.amps || "—"}</dd></div>
                <div><dt className="text-secondary">Frame size</dt><dd className="text-title">{viewingMotor.frameSize || "—"}</dd></div>
                <div><dt className="text-secondary">Slots</dt><dd className="text-title">{viewingMotor.slots || "—"}</dd></div>
                <div><dt className="text-secondary">Core length</dt><dd className="text-title">{viewingMotor.coreLength || "—"}</dd></div>
                <div><dt className="text-secondary">Core diameter</dt><dd className="text-title">{viewingMotor.coreDiameter || "—"}</dd></div>
                <div><dt className="text-secondary">Bars</dt><dd className="text-title">{viewingMotor.bars || "—"}</dd></div>
              </dl>
            </div>
            {String(viewingMotor.motorType || "").toUpperCase() === "DC" ? (
              <>
                <WorkOrderSpecBlock
                  title="DC motor — technical (motor asset)"
                  subtitle="Stored on this motor. New work orders prefill from here; saving a work order updates these fields."
                  specs={viewingMotor.dcSpecs ?? {}}
                  fields={DC_WORK_ORDER_FIELDS}
                />
                <WorkOrderSpecBlock
                  title="Armature (motor asset)"
                  subtitle="Stored on this motor. Flows into new DC work orders."
                  specs={viewingMotor.dcArmatureSpecs ?? {}}
                  fields={DC_ARMATURE_FIELDS}
                />
              </>
            ) : (
              <WorkOrderSpecBlock
                title="AC winding & technical (motor asset)"
                subtitle="Stored on this motor. New work orders prefill from here; saving a work order updates these fields."
                specs={viewingMotor.acSpecs ?? {}}
                fields={AC_WORK_ORDER_FIELDS}
              />
            )}
            {(viewingMotor.notes || "").trim() && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
                <p className="whitespace-pre-wrap text-sm text-title">{viewingMotor.notes}</p>
              </div>
            )}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Linked</h3>
              <p className="text-sm text-secondary">Service history: —</p>
              <p className="mt-0.5 text-sm text-secondary">Test results: —</p>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit motor"
        width="min(1600px, 96vw)"
        actions={
          <Button type="submit" form="edit-motor-form" variant="primary" size="sm" disabled={savingMotor}>
            {savingMotor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-motor-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="Customer"
                options={customerOptions}
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value ?? "" }))}
                placeholder="Select customer"
                searchable
                className="lg:col-span-2 min-w-0"
              />
              <Input
                label="Serial number"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
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
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input
                label="HP"
                value={form.hp}
                onChange={(e) => setForm((f) => ({ ...f, hp: e.target.value }))}
                placeholder="e.g. 50"
              />
              <Input
                label="RPM"
                value={form.rpm}
                onChange={(e) => setForm((f) => ({ ...f, rpm: e.target.value }))}
                placeholder="e.g. 1800"
              />
              <Input
                label="Voltage"
                value={form.voltage}
                onChange={(e) => setForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Input
                label="KW"
                value={form.kw}
                onChange={(e) => setForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="e.g. 37"
              />
              <Input
                label="AMPs"
                value={form.amps}
                onChange={(e) => setForm((f) => ({ ...f, amps: e.target.value }))}
                placeholder="e.g. 45"
              />
              <Input
                label="Frame size"
                value={form.frameSize}
                onChange={(e) => setForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
              <Input
                label="Slots"
                value={form.slots}
                onChange={(e) => setForm((f) => ({ ...f, slots: e.target.value }))}
                placeholder="Slots"
              />
              <Input
                label="Core length"
                value={form.coreLength}
                onChange={(e) => setForm((f) => ({ ...f, coreLength: e.target.value }))}
                placeholder="Core length"
              />
              <Input
                label="Core diameter"
                value={form.coreDiameter}
                onChange={(e) => setForm((f) => ({ ...f, coreDiameter: e.target.value }))}
                placeholder="Core diameter"
              />
              <Input
                label="Bars"
                value={form.bars}
                onChange={(e) => setForm((f) => ({ ...f, bars: e.target.value }))}
                placeholder="Bars"
              />
            </div>
          </div>
          {isAcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4">
              <p className="mb-4 text-sm text-secondary">
                AC winding data. Pre-fills new work orders; also updates when a work order is saved.
              </p>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">AC winding</h3>
              <MotorSpecGrid
                fields={AC_WORK_ORDER_FIELDS}
                values={form.acSpecs}
                onChange={(key, v) =>
                  setForm((f) => ({ ...f, acSpecs: { ...f.acSpecs, [key]: v } }))
                }
                idPrefix="edit-ac"
              />
            </div>
          ) : isDcMotorType(form.motorType) ? (
            <div className="rounded-lg border border-border bg-form-bg/50 p-4 space-y-8">
              <p className="text-sm text-secondary">
                DC and armature data. Pre-fills new work orders; also updates when a work order is saved.
              </p>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">DC motor</h3>
                <MotorSpecGrid
                  fields={DC_WORK_ORDER_FIELDS}
                  values={form.dcSpecs}
                  onChange={(key, v) =>
                    setForm((f) => ({ ...f, dcSpecs: { ...f.dcSpecs, [key]: v } }))
                  }
                  idPrefix="edit-dc"
                />
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-title">Armature</h3>
                <MotorSpecGrid
                  fields={DC_ARMATURE_FIELDS}
                  values={form.dcArmatureSpecs}
                  onChange={(key, v) =>
                    setForm((f) => ({
                      ...f,
                      dcArmatureSpecs: { ...f.dcArmatureSpecs, [key]: v },
                    }))
                  }
                  idPrefix="edit-arm"
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary">
              Select <span className="font-medium text-title">AC</span> or{" "}
              <span className="font-medium text-title">DC</span> as motor type above to enter technical fields.
            </p>
          )}
          <div>
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
