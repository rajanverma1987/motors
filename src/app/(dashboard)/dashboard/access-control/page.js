"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiEdit2, FiTrash2, FiShield } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { PAGES, ACTIONS } from "@/lib/pbac";

const INITIAL_FORM = {
  name: "",
  description: "",
  subjectIds: [],
  resources: [], // [{ page, actions: [] }]
};

function buildResourcesFromMatrix(matrix) {
  return PAGES.map((p) => ({
    page: p.id,
    actions: ACTIONS.filter((a) => matrix[p.id]?.[a]),
  })).filter((r) => r.actions.length > 0);
}

function buildMatrixFromResources(resources) {
  const matrix = {};
  PAGES.forEach((p) => {
    matrix[p.id] = {};
    ACTIONS.forEach((a) => {
      matrix[p.id][a] = false;
    });
  });
  (resources || []).forEach((r) => {
    if (matrix[r.page]) {
      (r.actions || []).forEach((a) => {
        if (ACTIONS.includes(a)) matrix[r.page][a] = true;
      });
    }
  });
  return matrix;
}

export default function AccessControlPage() {
  const toast = useToast();
  const [policies, setPolicies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [permissionMatrix, setPermissionMatrix] = useState(() => buildMatrixFromResources([]));
  const formRef = useRef({ form, permissionMatrix });
  formRef.current = { form, permissionMatrix };

  const loadPolicies = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/policies", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load policies");
      setPolicies(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load policies");
      setPolicies([]);
    }
  }, [toast]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || "Failed to load employees");
      setEmployees([]);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadPolicies(), loadEmployees()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadPolicies, loadEmployees]);

  const employeeOptions = useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.name || e.email || e.id || "—" })),
    [employees]
  );

  const openCreate = () => {
    setForm({
      name: "",
      description: "",
      subjectIds: [],
      resources: [],
    });
    setPermissionMatrix(buildMatrixFromResources([]));
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const openEdit = async (policy) => {
    if (!policy?.id) return;
    try {
      const res = await fetch(`/api/dashboard/policies/${policy.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load policy");
      const data = await res.json();
      setForm({
        name: data.name ?? "",
        description: data.description ?? "",
        subjectIds: Array.isArray(data.subjectIds) ? data.subjectIds : [],
        resources: data.resources ?? [],
      });
      setPermissionMatrix(buildMatrixFromResources(data.resources));
      setEditingPolicy(data);
      setModalOpen(true);
    } catch (e) {
      toast.error(e.message || "Failed to load policy");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingPolicy(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { form: f, permissionMatrix: m } = formRef.current;
    const resources = buildResourcesFromMatrix(m);
    if (resources.length === 0) {
      toast.error("Select at least one page with at least one action.");
      return;
    }
    if (!f.name?.trim()) {
      toast.error("Policy name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: f.name.trim(),
        description: f.description ?? "",
        subjectIds: f.subjectIds ?? [],
        resources,
      };
      if (editingPolicy?.id) {
        const res = await fetch(`/api/dashboard/policies/${editingPolicy.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update policy");
        toast.success("Policy updated.");
        setPolicies((prev) =>
          prev.map((p) => (p.id === editingPolicy.id ? { ...p, ...data.policy } : p))
        );
      } else {
        const res = await fetch("/api/dashboard/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create policy");
        toast.success("Policy created.");
        setPolicies((prev) => [...prev, data.policy]);
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    if (!policy?.id) return;
    if (!confirm(`Delete policy “${policy.name}”? This cannot be undone.`)) return;
    setDeletingId(policy.id);
    try {
      const res = await fetch(`/api/dashboard/policies/${policy.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete policy");
      }
      toast.success("Policy deleted.");
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
    } catch (err) {
      toast.error(err.message || "Failed to delete policy");
    } finally {
      setDeletingId(null);
    }
  };

  const setMatrixCell = (pageId, action, checked) => {
    setPermissionMatrix((prev) => ({
      ...prev,
      [pageId]: { ...prev[pageId], [action]: checked },
    }));
  };

  const setMatrixColumn = (action, checked) => {
    setPermissionMatrix((prev) => {
      const next = { ...prev };
      PAGES.forEach((p) => {
        next[p.id] = { ...next[p.id], [action]: checked };
      });
      return next;
    });
  };

  const isColumnAllChecked = (action) =>
    PAGES.every((p) => permissionMatrix[p.id]?.[action]);

  const [searchQuery, setSearchQuery] = useState("");
  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [policies, searchQuery]);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row)}
              disabled={deletingId === row.id}
              className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Delete"
            >
              {deletingId === row.id ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
              ) : (
                <FiTrash2 className="h-4 w-4" />
              )}
            </button>
          </div>
        ),
      },
      {
        key: "name",
        label: "Policy name",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
          >
            {row.name || "—"}
          </button>
        ),
      },
      {
        key: "description",
        label: "Description",
        render: (_, row) => (
          <span className="text-secondary text-sm max-w-xs truncate block">
            {row.description || "—"}
          </span>
        ),
      },
      {
        key: "employees",
        label: "Employees",
        render: (_, row) => {
          const count = Array.isArray(row.subjectIds) ? row.subjectIds.length : 0;
          return count ? `${count} employee${count !== 1 ? "s" : ""}` : "—";
        },
      },
      {
        key: "resources",
        label: "Permissions",
        render: (_, row) => {
          const res = Array.isArray(row.resources) ? row.resources : [];
          const pages = res.filter((r) => r.actions?.length);
          return pages.length ? `${pages.length} page${pages.length !== 1 ? "s" : ""}` : "—";
        },
      },
    ],
    [deletingId]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title flex items-center gap-2">
            <FiShield className="h-7 w-7 text-primary" aria-hidden />
            Access control
          </h1>
          <p className="mt-1 text-sm text-secondary">
            Policy-based access control (PBAC). Create policies and assign them to employees to grant page-level and action-level permissions.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="shrink-0">
          Add policy
        </Button>
      </div>

      <div className="mt-6 min-w-0">
        <Table
          columns={columns}
          data={filteredPolicies}
          rowKey="id"
          loading={loading}
          emptyMessage={
            policies.length === 0
              ? "No policies yet. Use “Add policy” to define who can access which pages and actions."
              : "No policies match the search."
          }
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search policies…"
          onRefresh={async () => {
            setLoading(true);
            await loadPolicies();
            setLoading(false);
          }}
          responsive
        />
      </div>

      {/* Add / Edit policy modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingPolicy ? "Edit policy" : "Add policy"}
        size="4xl"
        actions={
          <Button
            type="submit"
            form="policy-form"
            variant="primary"
            size="sm"
            disabled={saving}
          >
            {saving ? "Saving…" : editingPolicy ? "Update" : "Create"}
          </Button>
        }
      >
        <Form
          id="policy-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 !space-y-0"
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Input
              label="Policy name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Quote editors"
              required
            />
            <div className="sm:col-span-2">
              <Input
                label="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Short description of who this policy is for"
              />
            </div>
            <div className="sm:col-span-2">
              <Select
                label="Apply to employees"
                options={employeeOptions}
                value={form.subjectIds}
                onChange={(e) => setForm((f) => ({ ...f, subjectIds: e.target.value ?? [] }))}
                multiple
                placeholder="Select employees"
              />
              <p className="mt-1 text-xs text-secondary">
                Employees selected here will receive the permissions defined below when they log in.
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-title">
              Page & action permissions
            </h3>
            <p className="mb-3 text-xs text-secondary">
              Choose which pages each employee can access and which actions (view, create, edit, delete) they can perform.
            </p>
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left text-secondary font-medium">Page</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2 text-center text-secondary font-medium capitalize">
                        {a}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-secondary text-xs font-medium">Select all</td>
                    {ACTIONS.map((action) => (
                      <td key={action} className="px-3 py-2 text-center">
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isColumnAllChecked(action)}
                            onChange={(e) => setMatrixColumn(action, e.target.checked)}
                            aria-label={`Select all ${action}`}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PAGES.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="px-3 py-2 text-title">{p.label}</td>
                      {ACTIONS.map((action) => (
                        <td key={action} className="px-3 py-2 text-center">
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permissionMatrix[p.id]?.[action] ?? false}
                              onChange={(e) => setMatrixCell(p.id, action, e.target.checked)}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
