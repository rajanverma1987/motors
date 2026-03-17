"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FiEye, FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const INITIAL_FORM = {
  customerId: "",
  serialNumber: "",
  manufacturer: "",
  model: "",
  hp: "",
  rpm: "",
  voltage: "",
  frameSize: "",
  motorType: "",
  notes: "",
};

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
    frameSize: f.frameSize ?? "",
    motorType: f.motorType ?? "",
    motorPhotos: Array.isArray(f.motorPhotos) ? f.motorPhotos : [],
    nameplateImages: Array.isArray(f.nameplateImages) ? f.nameplateImages : [],
    notes: f.notes ?? "",
  };
}

export default function DashboardMotorsPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromLeadId = searchParams.get("fromLead");

  const [motors, setMotors] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingMotor, setViewingMotor] = useState(null);
  const [viewLoadingMotorId, setViewLoadingMotorId] = useState(null);
  const [savingMotor, setSavingMotor] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
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
      frameSize: dataToUse.frameSize ?? "",
      motorType: dataToUse.motorType ?? "",
      notes: dataToUse.notes ?? "",
    });
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingMotor(null);
  };

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
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
              onClick={() => openViewModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="View"
            >
              <FiEye className="h-4 w-4" />
            </button>
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
      { key: "serialNumber", label: "Serial" },
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
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

      <div className="mt-6 min-w-0">
        <Table
          columns={columns}
          data={filteredMotors}
          rowKey="id"
          loading={loading}
          emptyMessage={motors.length === 0 ? "No motors yet. Use “Create Motor” or create from a lead." : "No motors match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search customer, serial, manufacturer, model…"
          responsive
        />
      </div>

      {/* Create Motor modal */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Create Motor"
        size="4xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeCreateModal}>Cancel</Button>
            <Button type="submit" form="create-motor-form" variant="primary" size="sm" disabled={savingMotor}>
              {savingMotor ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="create-motor-form" onSubmit={handleCreateSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
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
              <Input
                label="Motor type"
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value }))}
                placeholder="e.g. AC induction, DC"
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
                label="Frame size"
                value={form.frameSize}
                onChange={(e) => setForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
            </div>
          </div>
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
        size="4xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => { closeViewModal(); openEditModal(viewingMotor); }}>Edit</Button>
            <Button type="button" variant="outline" size="sm" onClick={closeViewModal}>Close</Button>
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
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-secondary">Serial</dt><dd className="text-title">{viewingMotor.serialNumber || "—"}</dd></div>
                <div><dt className="text-secondary">Manufacturer</dt><dd className="text-title">{viewingMotor.manufacturer || "—"}</dd></div>
                <div><dt className="text-secondary">Model</dt><dd className="text-title">{viewingMotor.model || "—"}</dd></div>
                <div><dt className="text-secondary">Motor type</dt><dd className="text-title">{viewingMotor.motorType || "—"}</dd></div>
                <div><dt className="text-secondary">HP</dt><dd className="text-title">{viewingMotor.hp || "—"}</dd></div>
                <div><dt className="text-secondary">RPM</dt><dd className="text-title">{viewingMotor.rpm || "—"}</dd></div>
                <div><dt className="text-secondary">Voltage</dt><dd className="text-title">{viewingMotor.voltage || "—"}</dd></div>
                <div><dt className="text-secondary">Frame size</dt><dd className="text-title">{viewingMotor.frameSize || "—"}</dd></div>
              </dl>
            </div>
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
        size="4xl"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeEditModal}>Cancel</Button>
            <Button type="submit" form="edit-motor-form" variant="primary" size="sm" disabled={savingMotor}>
              {savingMotor ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <Form id="edit-motor-form" onSubmit={handleEditSubmit} className="flex flex-col gap-5 !space-y-0">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">Customer & identification</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
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
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
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
              <Input
                label="Motor type"
                value={form.motorType}
                onChange={(e) => setForm((f) => ({ ...f, motorType: e.target.value }))}
                placeholder="e.g. AC induction, DC"
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
                label="Frame size"
                value={form.frameSize}
                onChange={(e) => setForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
            </div>
          </div>
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
