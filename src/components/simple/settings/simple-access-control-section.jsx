"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiEdit2, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Checkbox from "@/components/ui/checkbox";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { PAGES, ACTIONS } from "@/lib/pbac";
import { sortRowsClient } from "@/lib/client-table-sort";

const INITIAL_FORM = {
  name: "",
  description: "",
  subjectIds: [],
  resources: [],
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

export default function SimpleAccessControlSection() {
  const alert = useAlert();
  const confirm = useConfirm();
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
      await alert({ title: "Could not load", message: e.message || "Failed to load policies" });
      setPolicies([]);
    }
  }, [alert]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/employees", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load employees");
      setEmployees(Array.isArray(data) ? data : []);
    } catch (e) {
      await alert({ title: "Could not load", message: e.message || "Failed to load employees" });
      setEmployees([]);
    }
  }, [alert]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadPolicies(), loadEmployees()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
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
      await alert({ title: "Could not load", message: e.message || "Failed to load policy" });
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
      await alert({
        title: "Permissions required",
        message: "Select at least one page with at least one action.",
      });
      return;
    }
    if (!f.name?.trim()) {
      await alert({ title: "Name required", message: "Policy name is required." });
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
        await alert({ title: "Updated", message: "Policy updated." });
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
        await alert({ title: "Created", message: "Policy created." });
        setPolicies((prev) => [...prev, data.policy]);
      }
      closeModal();
    } catch (err) {
      await alert({ title: "Could not save", message: err.message || "Failed to save policy" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    if (!policy?.id) return;
    const ok1 = await confirm({
      title: "Delete policy?",
      message: `Delete policy “${policy.name}”? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "Confirm delete",
      message: "Are you sure? The policy will be permanently removed.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok2) return;

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
      await alert({ title: "Deleted", message: "Policy deleted." });
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
    } catch (err) {
      await alert({ title: "Could not delete", message: err.message || "Failed to delete policy" });
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

  const isColumnAllChecked = (action) => PAGES.every((p) => permissionMatrix[p.id]?.[action]);

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

  const getPolicySortValue = useCallback((row, key) => {
    if (key === "employees") return Array.isArray(row.subjectIds) ? row.subjectIds.length : 0;
    if (key === "resources") {
      const res = Array.isArray(row.resources) ? row.resources : [];
      return res.filter((r) => r.actions?.length).length;
    }
    return row?.[key];
  }, []);

  const [tableSort, setTableSort] = useState({ key: null, direction: "asc" });
  const sortedPolicies = useMemo(
    () => sortRowsClient(filteredPolicies, tableSort, getPolicySortValue),
    [filteredPolicies, tableSort, getPolicySortValue]
  );
  const handleTableSort = useCallback((key, direction) => setTableSort({ key, direction }), []);

  const columns = useMemo(
    () => [
      {
        key: "edit",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        ),
      },
      {
        key: "name",
        label: "Policy name",
        sortable: true,
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
          >
            {row.name || "—"}
          </button>
        ),
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        render: (_, row) => (
          <span className="block max-w-xs truncate text-sm text-secondary">
            {row.description || "—"}
          </span>
        ),
      },
      {
        key: "employees",
        label: "Employees",
        sortable: true,
        render: (_, row) => {
          const count = Array.isArray(row.subjectIds) ? row.subjectIds.length : 0;
          return count ? `${count} employee${count !== 1 ? "s" : ""}` : "—";
        },
      },
      {
        key: "resources",
        label: "Permissions",
        sortable: true,
        render: (_, row) => {
          const res = Array.isArray(row.resources) ? row.resources : [];
          const pages = res.filter((r) => r.actions?.length);
          return pages.length ? `${pages.length} page${pages.length !== 1 ? "s" : ""}` : "—";
        },
      },
      {
        key: "actions",
        label: "",
        render: (_, row) => (
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
              <FiX className="h-4 w-4" />
            )}
          </button>
        ),
      },
    ],
    [deletingId]
  );

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-8">
      <FormContainer>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <FormSectionTitle as="h2">Access controls</FormSectionTitle>
            <p className="mt-1 text-sm text-secondary">
              Policies that decide which pages and actions each employee can use.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
            Add policy
          </Button>
        </div>
      </FormContainer>

      <Table
        columns={columns}
        data={sortedPolicies}
        rowKey="id"
        loading={loading}
        sortState={tableSort}
        onSort={handleTableSort}
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

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingPolicy ? "Edit policy" : "Add policy"}
        size="4xl"
        actions={
          <Button type="submit" form="simple-policy-form" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : editingPolicy ? "Update" : "Create"}
          </Button>
        }
      >
        <Form
          id="simple-policy-form"
          onSubmit={handleSubmit}
          className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <FormSection title="Policy details">
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
          </FormSection>

          <FormSection
            title="Page & action permissions"
            subtitle="Choose which pages each employee can access and which actions (view, create, edit, delete) they can perform."
          >
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-secondary">Page</th>
                    {ACTIONS.map((a) => (
                      <th key={a} className="px-3 py-2 text-center font-medium capitalize text-secondary">
                        {a}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-t border-border">
                    <td className="px-3 py-2 text-xs font-medium text-secondary">Select all</td>
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
          </FormSection>
        </Form>
      </Modal>
    </div>
  );
}
