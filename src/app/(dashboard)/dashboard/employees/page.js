"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const ROLE_OPTIONS = [
  { value: "", label: "Select role" },
  { value: "Technician", label: "Technician" },
  { value: "Lead", label: "Lead" },
  { value: "Office", label: "Office" },
  { value: "Supervisor", label: "Supervisor" },
  { value: "Manager", label: "Manager" },
  { value: "Other", label: "Other" },
];

const INITIAL_FORM = {
  name: "",
  email: "",
  role: "",
  phone: "",
  canLogin: false,
  password: "",
};

function buildEmployeePayload(form) {
  const f = form || {};
  return {
    name: f.name ?? "",
    email: f.email ?? "",
    role: f.role ?? "",
    phone: f.phone ?? "",
    canLogin: Boolean(f.canLogin),
    password: f.password ?? "",
  };
}

export default function DashboardEmployeesPage() {
  const toast = useToast();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enterModalOpen, setEnterModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [viewLoadingEmployeeId, setViewLoadingEmployeeId] = useState(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const roleOptions = useMemo(() => {
    const values = new Set(ROLE_OPTIONS.map((o) => o.value));
    if (form.role && form.role.trim() && !values.has(form.role.trim())) {
      return [{ value: form.role.trim(), label: form.role.trim() }, ...ROLE_OPTIONS];
    }
    return ROLE_OPTIONS;
  }, [form.role]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load employees");
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const openEnterModal = () => {
    setForm(INITIAL_FORM);
    setEnterModalOpen(true);
  };

  const closeEnterModal = () => setEnterModalOpen(false);

  const openViewModal = (employee) => {
    if (!employee?.id) {
      setViewingEmployee(employee);
      setViewModalOpen(true);
      return;
    }
    setViewingEmployee(null);
    setViewLoadingEmployeeId(employee.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingEmployeeId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/employees/${viewLoadingEmployeeId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingEmployeeId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingEmployee(data);
        setViewLoadingEmployeeId(null);
      } catch {
        if (!cancelled) setViewLoadingEmployeeId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingEmployeeId]);

  const closeViewModal = () => {
    queueMicrotask(() => {
      setViewModalOpen(false);
      setViewingEmployee(null);
      setViewLoadingEmployeeId(null);
    });
  };

  const openEditModal = async (employee) => {
    if (!employee) return;
    let dataToUse = employee;
    if (employee?.id) {
      try {
        const res = await fetch(`/api/dashboard/employees/${employee.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch {
        // use row data
      }
    }
    setForm({
      name: dataToUse.name ?? "",
      email: dataToUse.email ?? "",
      role: dataToUse.role ?? "",
      phone: dataToUse.phone ?? "",
      canLogin: Boolean(dataToUse.canLogin),
      password: "",
    });
    setViewingEmployee(dataToUse);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingEmployee(null);
  };

  const handleEnterSubmit = async (e) => {
    e.preventDefault();
    setSavingEmployee(true);
    try {
      const res = await fetch("/api/dashboard/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildEmployeePayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create employee");
      toast.success("Employee added.");
      closeEnterModal();
      loadEmployees();
    } catch (err) {
      toast.error(err.message || "Failed to create employee");
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!viewingEmployee?.id) return;
    setSavingEmployee(true);
    try {
      const res = await fetch(`/api/dashboard/employees/${viewingEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildEmployeePayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update employee");
      toast.success("Employee updated.");
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === viewingEmployee.id ? { ...emp, ...data.employee } : emp))
      );
      setViewingEmployee(data.employee);
      closeEditModal();
    } catch (err) {
      toast.error(err.message || "Failed to update employee");
    } finally {
      setSavingEmployee(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState("");
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((emp) => {
      const name = (emp.name || "").toLowerCase();
      const email = (emp.email || "").toLowerCase();
      const role = (emp.role || "").toLowerCase();
      const phone = (emp.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || phone.includes(q);
    });
  }, [employees, searchQuery]);

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
        key: "name",
        label: "Name",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openViewModal(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.name || "—"}
          </button>
        ),
      },
      { key: "role", label: "Role" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      {
        key: "canLogin",
        label: "Login status",
        render: (_, row) => (
          <Badge variant={row.canLogin ? "success" : "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.canLogin ? "Can login" : "No access"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Employees</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage technicians and staff. Add employees to assign to work orders and track workload.
          </p>
        </div>
        <Button variant="primary" onClick={openEnterModal} className="shrink-0">
          Add Employee
        </Button>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredEmployees}
          rowKey="id"
          loading={loading}
          emptyMessage={employees.length === 0 ? "No employees yet. Use “Add Employee” to add one." : "No employees match the search."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search name, role, email, phone…"
          onRefresh={async () => { setLoading(true); await loadEmployees(); setLoading(false); }}
          responsive
        />
      </div>

      {/* Add Employee modal */}
      <Modal
        open={enterModalOpen}
        onClose={closeEnterModal}
        title="Add Employee"
        size="lg"
        actions={
          <Button type="submit" form="enter-employee-form" variant="primary" size="sm" disabled={savingEmployee}>
            {savingEmployee ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="enter-employee-form" onSubmit={handleEnterSubmit} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Select
              label="Role"
              name="role"
              options={roleOptions}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Select role"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
            />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="For employee login (optional, 6–128 characters)"
              autoComplete="new-password"
            />
            <div className="sm:col-span-2">
              <Checkbox
                label="Can login to CRM"
                name="canLogin"
                checked={form.canLogin}
                onChange={(e) => setForm((f) => ({ ...f, canLogin: e.target.checked }))}
              />
              <p className="mt-1 text-xs text-secondary">When enabled, this employee can be granted access to log in and use all dashboard pages.</p>
            </div>
          </div>
        </Form>
      </Modal>

      {/* View modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title="Employee details"
        size="lg"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => { closeViewModal(); openEditModal(viewingEmployee); }}>
            Edit
          </Button>
        }
      >
        {viewLoadingEmployeeId ? (
          <div className="flex justify-center py-12">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : viewingEmployee ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-secondary">Name</dt><dd className="text-title font-medium">{viewingEmployee.name || "—"}</dd></div>
            <div><dt className="text-secondary">Role</dt><dd className="text-title">{viewingEmployee.role || "—"}</dd></div>
            <div><dt className="text-secondary">Email</dt><dd className="text-title">{viewingEmployee.email || "—"}</dd></div>
            <div><dt className="text-secondary">Phone</dt><dd className="text-title">{viewingEmployee.phone || "—"}</dd></div>
            <div className="sm:col-span-2">
              <dt className="text-secondary">Login status</dt>
              <dd className="mt-0.5">
                <Badge variant={viewingEmployee.canLogin ? "success" : "default"} className="rounded-full px-2.5 py-0.5 text-xs">
                  {viewingEmployee.canLogin ? "Can login to CRM" : "No access"}
                </Badge>
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      {/* Edit modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit employee"
        size="lg"
        actions={
          <Button type="submit" form="edit-employee-form" variant="primary" size="sm" disabled={savingEmployee}>
            {savingEmployee ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-employee-form" onSubmit={handleEditSubmit} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Select
              label="Role"
              name="role"
              options={roleOptions}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="Select role"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
            />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone"
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Leave blank to keep current (6–128 characters to change)"
              autoComplete="new-password"
            />
            <div className="sm:col-span-2">
              <Checkbox
                label="Can login to CRM"
                name="canLogin"
                checked={form.canLogin}
                onChange={(e) => setForm((f) => ({ ...f, canLogin: e.target.checked }))}
              />
              <p className="mt-1 text-xs text-secondary">When enabled, this employee can be granted access to log in and use all dashboard pages.</p>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
