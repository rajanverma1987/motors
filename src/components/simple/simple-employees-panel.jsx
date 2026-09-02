"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

function FieldRow({ label, labelWidth = "6.75rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

const ROLE_OPTIONS = [
  { value: "", label: "Select role" },
  { value: "Technician", label: "Technician" },
  { value: "Lead", label: "Lead" },
  { value: "Office", label: "Office" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Manager", label: "Manager" },
  { value: "Other", label: "Other" },
];

const INITIAL_EMPLOYEE_FORM = {
  name: "",
  email: "",
  role: "",
  phone: "",
  password: "",
  canLogin: false,
  technicianAppAccess: false,
  timeClockEnabled: true,
  employeeNumber: "",
  department: "",
  employmentStatus: "Active",
  hireDate: "",
  payType: "hourly",
  hourlyRate: "",
  scheduledStart: "",
  scheduledEnd: "",
  defaultBreakMinutes: "0",
};

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Terminated", label: "Terminated" },
];

const PAY_TYPE_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "salary", label: "Salary" },
];

const EMPLOYEE_FORM_ID = "simple-employees-form";

function buildEmployeePayload(form) {
  const f = form || {};
  return {
    name: f.name ?? "",
    email: f.email ?? "",
    role: f.role ?? "",
    phone: f.phone ?? "",
    canLogin: Boolean(f.canLogin),
    technicianAppAccess: Boolean(f.technicianAppAccess),
    password: f.password ?? "",
    timeClockEnabled: f.timeClockEnabled !== false,
    employeeNumber: f.employeeNumber ?? "",
    department: f.department ?? "",
    employmentStatus: f.employmentStatus || "Active",
    hireDate: f.hireDate ?? "",
    payType: f.payType === "salary" ? "salary" : "hourly",
    hourlyRate: f.hourlyRate ?? "",
    scheduledStart: f.scheduledStart ?? "",
    scheduledEnd: f.scheduledEnd ?? "",
    defaultBreakMinutes: Number(f.defaultBreakMinutes) || 0,
  };
}

export default function SimpleEmployeesPanel({ onChanged }) {
  const alert = useAlert();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);
  const [tableSort, setTableSort] = useState({ key: "name", direction: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_EMPLOYEE_FORM);

  const roleOptions = useMemo(() => {
    const values = new Set(ROLE_OPTIONS.map((o) => o.value));
    if (form.role && form.role.trim() && !values.has(form.role.trim())) {
      return [{ value: form.role.trim(), label: form.role.trim() }, ...ROLE_OPTIONS];
    }
    return ROLE_OPTIONS;
  }, [form.role]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const res = await fetch(`/api/dashboard/employees?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load employees");
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load employees",
        variant: "danger",
      });
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [alert, page, pageSize, searchQuery, tableSort]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_EMPLOYEE_FORM);
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    if (!row?.id) return;
    let dataToUse = row;
    try {
      const res = await fetch(`/api/dashboard/employees/${row.id}`, { credentials: "include" });
      if (res.ok) dataToUse = await res.json();
    } catch {
      // use row data
    }
    setEditingId(dataToUse.id);
    setForm({
      name: dataToUse.name ?? "",
      email: dataToUse.email ?? "",
      role: dataToUse.role ?? "",
      phone: dataToUse.phone ?? "",
      password: "",
      canLogin: Boolean(dataToUse.canLogin),
      technicianAppAccess: Boolean(dataToUse.technicianAppAccess),
      timeClockEnabled: dataToUse.timeClockEnabled !== false,
      employeeNumber: dataToUse.employeeNumber ?? "",
      department: dataToUse.department ?? "",
      employmentStatus: dataToUse.employmentStatus || "Active",
      hireDate: dataToUse.hireDate ?? "",
      payType: dataToUse.payType === "salary" ? "salary" : "hourly",
      hourlyRate: dataToUse.hourlyRate ?? "",
      scheduledStart: dataToUse.scheduledStart ?? "",
      scheduledEnd: dataToUse.scheduledEnd ?? "",
      defaultBreakMinutes: String(dataToUse.defaultBreakMinutes ?? 0),
      passkeyRegistered: Boolean(dataToUse.passkeyRegistered),
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_EMPLOYEE_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      await alert({ title: "Error", message: "Name is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editingId);
      const res = await fetch(
        isEdit ? `/api/dashboard/employees/${editingId}` : "/api/dashboard/employees",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(buildEmployeePayload(form)),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isEdit ? "Failed to update employee" : "Failed to create employee"));
      await alert({
        title: "Success",
        message: isEdit ? "Employee updated." : "Employee added.",
      });
      setModalOpen(false);
      setEditingId(null);
      setForm(INITIAL_EMPLOYEE_FORM);
      setLoading(true);
      await load();
      onChanged?.();
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save employee",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Edit"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        ),
      },
      { key: "name", label: "Name", sortable: true },
      { key: "employeeNumber", label: "Emp #", sortable: true },
      { key: "role", label: "Role", sortable: true },
      { key: "department", label: "Dept", sortable: true },
      {
        key: "employmentStatus",
        label: "Status",
        sortable: true,
        render: (_, row) => (
          <Badge
            variant={
              row.employmentStatus === "Active"
                ? "success"
                : row.employmentStatus === "Terminated"
                  ? "danger"
                  : "default"
            }
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.employmentStatus || "Active"}
          </Badge>
        ),
      },
      { key: "email", label: "Email", sortable: true },
      { key: "phone", label: "Phone", sortable: true },
      {
        key: "timeClockEnabled",
        label: "Time clock",
        sortable: true,
        render: (_, row) => (
          <Badge
            variant={row.timeClockEnabled !== false ? "primary" : "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.timeClockEnabled !== false ? "On" : "Off"}
          </Badge>
        ),
      },
      {
        key: "passkeyRegistered",
        label: "Passkey",
        render: (_, row) => (
          <Badge
            variant={row.passkeyRegistered ? "success" : "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.passkeyRegistered ? "Registered" : "None"}
          </Badge>
        ),
      },
      {
        key: "canLogin",
        label: "Shop Management System login",
        sortable: true,
        render: (_, row) => (
          <Badge variant={row.canLogin ? "success" : "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.canLogin ? "Yes" : "No"}
          </Badge>
        ),
      },
      {
        key: "technicianAppAccess",
        label: "Technician app",
        sortable: true,
        render: (_, row) => (
          <Badge
            variant={row.technicianAppAccess ? "primary" : "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.technicianAppAccess ? "Allowed" : "Off"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary">Add and edit staff records for login, shop assignments, and time clock.</p>
        <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
          Add Employee
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          rows.length === 0 ? "No employees yet. Use “Add Employee” to add one." : "No employees match the search."
        }
        searchable
        onSearch={(q) => {
          setPage(1);
          setSearchQuery(q);
        }}
        searchPlaceholder="Search name, role, email, phone…"
        onRefresh={async () => {
          setLoading(true);
          await load();
        }}
        sortState={tableSort}
        onSort={(key, direction) => {
          setPage(1);
          setTableSort({ key, direction });
        }}
        responsive
        pagination={{ page, pageSize, totalCount }}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        paginateClientSide={false}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit employee" : "Add Employee"}
        size="lg"
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form={EMPLOYEE_FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={EMPLOYEE_FORM_ID}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <p className={SECTION_TITLE}>Employee</p>
          <FieldRow label="Name">
            <input
              type="text"
              required
              disabled={saving}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Name"
            />
          </FieldRow>
          <FieldRow label="Email">
            <input
              type="email"
              disabled={saving}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Email"
              required={form.timeClockEnabled !== false}
            />
          </FieldRow>
          <FieldRow label="Emp #">
            <input
              type="text"
              disabled={saving}
              value={form.employeeNumber || ""}
              onChange={(e) => setForm((f) => ({ ...f, employeeNumber: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Employee number"
            />
          </FieldRow>
          <FieldRow label="Role">
            <SimpleSelect
              name="role"
              options={roleOptions}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Select role"
              disabled={saving}
              aria-label="Role"
            />
          </FieldRow>
          <FieldRow label="Department">
            <input
              type="text"
              disabled={saving}
              value={form.department || ""}
              onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Department"
            />
          </FieldRow>
          <FieldRow label="Status">
            <SimpleSelect
              name="employmentStatus"
              options={EMPLOYMENT_STATUS_OPTIONS}
              value={form.employmentStatus || "Active"}
              onChange={(e) => setForm((f) => ({ ...f, employmentStatus: e.target.value }))}
              disabled={saving}
              aria-label="Employment status"
            />
          </FieldRow>
          <FieldRow label="Hire date">
            <input
              type="date"
              disabled={saving}
              value={form.hireDate || ""}
              onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Hire date"
            />
          </FieldRow>
          <FieldRow label="Phone">
            <input
              type="tel"
              disabled={saving}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Phone"
            />
          </FieldRow>
          <p className={SECTION_TITLE}>Schedule and pay</p>
          <FieldRow label="Shift start">
            <input
              type="time"
              disabled={saving}
              value={form.scheduledStart || ""}
              onChange={(e) => setForm((f) => ({ ...f, scheduledStart: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Scheduled start"
            />
          </FieldRow>
          <FieldRow label="Shift end">
            <input
              type="time"
              disabled={saving}
              value={form.scheduledEnd || ""}
              onChange={(e) => setForm((f) => ({ ...f, scheduledEnd: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Scheduled end"
            />
          </FieldRow>
          <FieldRow label="Break (min)">
            <input
              type="number"
              min={0}
              max={240}
              disabled={saving}
              value={form.defaultBreakMinutes ?? "0"}
              onChange={(e) => setForm((f) => ({ ...f, defaultBreakMinutes: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Default break minutes"
            />
          </FieldRow>
          <FieldRow label="Pay type">
            <SimpleSelect
              name="payType"
              options={PAY_TYPE_OPTIONS}
              value={form.payType || "hourly"}
              onChange={(e) => setForm((f) => ({ ...f, payType: e.target.value }))}
              disabled={saving}
              aria-label="Pay type"
            />
          </FieldRow>
          <FieldRow label={form.payType === "salary" ? "Salary" : "Hourly rate"}>
            <input
              type="text"
              inputMode="decimal"
              disabled={saving}
              value={form.hourlyRate || ""}
              onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))}
              className={FIELD_INPUT}
              aria-label={form.payType === "salary" ? "Salary" : "Hourly rate"}
              placeholder={form.payType === "salary" ? "e.g. 65000" : "e.g. 28.50"}
            />
          </FieldRow>
          <FieldRow label="Password">
            <input
              type="password"
              disabled={saving}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={FIELD_INPUT}
              autoComplete="new-password"
              placeholder={editingId ? "Leave blank to keep current" : "Optional (6–128 characters)"}
              aria-label="Password"
            />
          </FieldRow>
          <FieldRow label="Access" className="items-start">
            <div className="flex flex-col gap-2 py-0.5">
              <label className="inline-flex items-center gap-2 text-sm text-title">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.timeClockEnabled !== false}
                  onChange={(e) => setForm((f) => ({ ...f, timeClockEnabled: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded-none border-border text-primary focus:ring-primary"
                />
                Time clock enabled
              </label>
              {form.passkeyRegistered ? (
                <p className="text-xs text-secondary">Time clock passkey registered on a device.</p>
              ) : (
                <p className="text-xs text-secondary">
                  Employee registers a passkey after scanning the shop Time Clock QR.
                </p>
              )}
              <label className="inline-flex items-center gap-2 text-sm text-title">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.canLogin}
                  onChange={(e) => setForm((f) => ({ ...f, canLogin: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded-none border-border text-primary focus:ring-primary"
                />
                Can login to Shop Management System
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-title">
                <input
                  type="checkbox"
                  disabled={saving}
                  checked={form.technicianAppAccess}
                  onChange={(e) => setForm((f) => ({ ...f, technicianAppAccess: e.target.checked }))}
                  className="h-3.5 w-3.5 rounded-none border-border text-primary focus:ring-primary"
                />
                Technician App access
              </label>
            </div>
          </FieldRow>
        </Form>
      </Modal>
    </div>
  );
}
