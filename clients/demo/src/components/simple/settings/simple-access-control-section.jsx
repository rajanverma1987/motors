"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiCheck, FiEdit2, FiLock, FiShield, FiUnlock, FiX } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import Checkbox from "@/components/ui/checkbox";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS, FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useUserSettings } from "@/contexts/user-settings-context";
import { useAuth } from "@/contexts/auth-context";
import { PAGES, ACTIONS } from "@/lib/pbac";
import { sortRowsClient } from "@/lib/client-table-sort";
import {
  DEFAULT_FINANCIAL_ALLOWED_ROLES,
  STANDARD_SHOP_ROLES,
  computeEffectiveFinancialAccess,
} from "@/lib/financial-access";

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
  const { settings, refresh: refreshSettings } = useUserSettings();
  const { refreshUser } = useAuth();

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

  // Financial Access Settings state
  const [financialEnabled, setFinancialEnabled] = useState(true);
  const [allowedRoles, setAllowedRoles] = useState(DEFAULT_FINANCIAL_ALLOWED_ROLES);
  const [simulateRestricted, setSimulateRestricted] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingEmployeeId, setUpdatingEmployeeId] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  useEffect(() => {
    if (!settings) return;
    setFinancialEnabled(settings.financialAccessRestrictionEnabled !== false);
    setAllowedRoles(
      Array.isArray(settings.financialAllowedRoles) && settings.financialAllowedRoles.length > 0
        ? settings.financialAllowedRoles
        : DEFAULT_FINANCIAL_ALLOWED_ROLES
    );
    setSimulateRestricted(Boolean(settings.simulateFinancialRestriction));
  }, [settings]);

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

  const handleSaveFinancialSettings = useCallback(
    async (patch) => {
      setSavingSettings(true);
      try {
        const payload = {
          financialAccessRestrictionEnabled:
            patch.financialAccessRestrictionEnabled !== undefined
              ? patch.financialAccessRestrictionEnabled
              : financialEnabled,
          financialAllowedRoles:
            patch.financialAllowedRoles !== undefined ? patch.financialAllowedRoles : allowedRoles,
          simulateFinancialRestriction:
            patch.simulateFinancialRestriction !== undefined
              ? patch.simulateFinancialRestriction
              : simulateRestricted,
        };

        const res = await fetch("/api/dashboard/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update financial access settings");
        }
        await refreshSettings();
        await refreshUser();
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to save settings.",
          variant: "danger",
        });
      } finally {
        setSavingSettings(false);
      }
    },
    [alert, allowedRoles, financialEnabled, refreshSettings, refreshUser, simulateRestricted]
  );

  const handleToggleRole = useCallback(
    async (role) => {
      const roleStr = String(role || "").trim();
      if (!roleStr) return;
      const exists = allowedRoles.some((r) => r.toLowerCase() === roleStr.toLowerCase());
      const nextRoles = exists
        ? allowedRoles.filter((r) => r.toLowerCase() !== roleStr.toLowerCase())
        : [...allowedRoles, roleStr];
      setAllowedRoles(nextRoles);
      await handleSaveFinancialSettings({ financialAllowedRoles: nextRoles });
    },
    [allowedRoles, handleSaveFinancialSettings]
  );

  const handleUpdateEmployeeFinancialAccess = useCallback(
    async (employeeId, nextValue) => {
      if (!employeeId) return;
      setUpdatingEmployeeId(employeeId);
      try {
        const res = await fetch(`/api/dashboard/employees/${employeeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ financialAccess: nextValue }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to update employee financial access");
        setEmployees((prev) =>
          prev.map((emp) => (emp.id === employeeId ? { ...emp, financialAccess: nextValue } : emp))
        );
        await refreshUser();
      } catch (err) {
        await alert({
          title: "Update failed",
          message: err?.message || "Could not update employee access.",
          variant: "danger",
        });
      } finally {
        setUpdatingEmployeeId("");
      }
    },
    [alert, refreshUser]
  );

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
      message: `Delete policy "${policy.name}"? This cannot be undone.`,
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

  const policyColumns = useMemo(
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

  // Compute effective financial access for each employee
  const employeeFinancialRows = useMemo(() => {
    return employees.map((emp) => {
      const empPolicies = policies.filter(
        (p) => Array.isArray(p.subjectIds) && p.subjectIds.includes(String(emp.id))
      );
      const access = computeEffectiveFinancialAccess({
        isOwner: false,
        employee: emp,
        policies: empPolicies,
        userSettings: {
          financialAccessRestrictionEnabled: financialEnabled,
          financialAllowedRoles: allowedRoles,
          simulateFinancialRestriction: false,
        },
      });
      return {
        ...emp,
        effectiveAccess: access,
      };
    });
  }, [employees, policies, financialEnabled, allowedRoles]);

  const filteredEmployeeFinancialRows = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    if (!q) return employeeFinancialRows;
    return employeeFinancialRows.filter((e) => {
      const name = String(e.name || "").toLowerCase();
      const email = String(e.email || "").toLowerCase();
      const role = String(e.role || "").toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q);
    });
  }, [employeeFinancialRows, employeeSearch]);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6 pb-8">
      {/* 1. Financial Access Control Card */}
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FiShield className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="text-base font-bold text-title">
                Financial access control (costs, margins, pricing, AP / AR)
              </h2>
            </div>
            <p className="mt-1 text-xs text-secondary">
              Restrict financial numbers on screens and data so only authorized roles see job
              pricing, margins, vendor costs, AP / AR balances, and revenue.
            </p>
          </div>
          {savingSettings ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-border border-t-primary" />
              Saving...
            </span>
          ) : null}
        </div>

        {/* Global Enforcement & Simulation Toggles */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
          <div className="rounded-none border border-border bg-muted/20 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={financialEnabled}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setFinancialEnabled(val);
                  await handleSaveFinancialSettings({ financialAccessRestrictionEnabled: val });
                }}
                className="mt-0.5 h-4 w-4 rounded-none border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-title block">
                  Enforce financial restrictions on employee logins
                </span>
                <span className="text-[11px] text-secondary">
                  When enabled, employees without financial permissions will have costs, pricing,
                  margins, invoices, and payment data hidden across the shop portal.
                </span>
              </div>
            </label>
          </div>

          <div className="rounded-none border border-border bg-muted/20 p-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateRestricted}
                onChange={async (e) => {
                  const val = e.target.checked;
                  setSimulateRestricted(val);
                  await handleSaveFinancialSettings({ simulateFinancialRestriction: val });
                }}
                className="mt-0.5 h-4 w-4 rounded-none border-border text-primary focus:ring-primary"
              />
              <div>
                <span className="text-xs font-bold text-title block flex items-center gap-1.5">
                  <span>Preview shop as a restricted technician (simulation mode)</span>
                  {simulateRestricted ? (
                    <Badge variant="warning" className="rounded-full px-2 py-0.2 text-[10px]">
                      Active
                    </Badge>
                  ) : null}
                </span>
                <span className="text-[11px] text-secondary">
                  Temporarily hides all financial data on your screens so you can verify what floor
                  staff see without logging into a separate technician account.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Role-based default financial access */}
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-secondary">
            Role-based default financial access
          </h3>
          <p className="mt-0.5 text-xs text-secondary">
            Select which employee roles are permitted to view financial information by default. Roles
            left unchecked will have costs and pricing hidden unless granted by policy or individual
            override below.
          </p>

          <div className="mt-3 flex flex-wrap gap-2.5">
            {STANDARD_SHOP_ROLES.map((role) => {
              const isAllowed = allowedRoles.some((r) => r.toLowerCase() === role.toLowerCase());
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleToggleRole(role)}
                  className={`inline-flex items-center gap-1.5 rounded-none border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isAllowed
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border bg-card text-secondary hover:border-primary/40"
                  }`}
                >
                  {isAllowed ? (
                    <FiUnlock className="h-3.5 w-3.5 shrink-0 text-primary" />
                  ) : (
                    <FiLock className="h-3.5 w-3.5 shrink-0 text-secondary" />
                  )}
                  <span>{role}</span>
                  <Badge
                    variant={isAllowed ? "success" : "default"}
                    className="ml-1 rounded-full px-1.5 py-0.2 text-[10px]"
                  >
                    {isAllowed ? "Allowed" : "Restricted"}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* Employee-level Financial Permissions Table */}
        <div className="mt-5 border-t border-border pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-secondary">
                Employee financial permissions and overrides
              </h3>
              <p className="mt-0.5 text-xs text-secondary">
                View effective financial access for each employee and set explicit individual
                overrides.
              </p>
            </div>
            <input
              type="text"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Filter employees..."
              className="h-7 w-48 rounded-none border border-border bg-card px-2 text-xs text-title outline-none focus:border-primary"
            />
          </div>

          <div className="mt-3 overflow-x-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-secondary">
                <tr className="border-b border-border">
                  <th className="py-2 px-3 font-semibold">Action (Financial override)</th>
                  <th className="py-2 px-3 font-semibold">Employee</th>
                  <th className="py-2 px-3 font-semibold">Role</th>
                  <th className="py-2 px-3 font-semibold">Login access</th>
                  <th className="py-2 px-3 font-semibold">Effective status</th>
                  <th className="py-2 px-3 font-semibold">Access reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEmployeeFinancialRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-xs text-secondary">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  filteredEmployeeFinancialRows.map((emp) => {
                    const isUpdating = updatingEmployeeId === emp.id;
                    const canView = emp.effectiveAccess?.canViewFinancials;
                    return (
                      <tr key={emp.id} className="hover:bg-muted/30">
                        <td className="py-2 px-3 whitespace-nowrap">
                          <select
                            disabled={isUpdating}
                            value={emp.financialAccess || "role"}
                            onChange={(e) =>
                              handleUpdateEmployeeFinancialAccess(emp.id, e.target.value)
                            }
                            className="h-7 rounded-none border border-border bg-card px-2 text-xs font-medium text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                          >
                            <option value="role">Default by role</option>
                            <option value="allowed">Always allowed (Grant)</option>
                            <option value="restricted">Always restricted (Deny)</option>
                          </select>
                        </td>
                        <td className="py-2 px-3 font-medium text-title">
                          <div>{emp.name || "—"}</div>
                          {emp.email ? (
                            <div className="text-[11px] text-secondary font-normal">{emp.email}</div>
                          ) : null}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge variant="default" className="rounded-full px-2 py-0.5 text-[11px]">
                            {emp.role || "No role"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {emp.canLogin ? (
                            <Badge variant="success" className="rounded-full px-2 py-0.5 text-[11px]">
                              CRM Login
                            </Badge>
                          ) : emp.technicianAppAccess ? (
                            <Badge variant="primary" className="rounded-full px-2 py-0.5 text-[11px]">
                              Tech App
                            </Badge>
                          ) : (
                            <span className="text-secondary">No Login</span>
                          )}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <Badge
                            variant={canView ? "success" : "danger"}
                            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          >
                            {canView ? "Allowed" : "Restricted"}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-secondary text-[11px]">
                          {emp.effectiveAccess?.reason || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2. Custom Access Control Policies (PBAC) */}
      <FormContainer>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <FormSectionTitle as="h2">Custom access control policies</FormSectionTitle>
            <p className="mt-1 text-sm text-secondary">
              Create and manage granular policies that govern pages, financial data, and actions
              (view, create, edit, delete).
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
            Add policy
          </Button>
        </div>
      </FormContainer>

      <Table
        columns={policyColumns}
        data={sortedPolicies}
        rowKey="id"
        loading={loading}
        sortState={tableSort}
        onSort={handleTableSort}
        emptyMessage={
          policies.length === 0
            ? 'No policies yet. Use "Add policy" to define who can access which pages, financials, and actions.'
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
          <Button
            type="submit"
            form="simple-policy-form"
            variant="primary"
            size="sm"
            disabled={saving}
          >
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
                placeholder="e.g. Lead Technicians with Financials"
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
            title="Page and action permissions"
            subtitle="Choose which pages and data each employee can access and which actions (view, create, edit, delete) they can perform."
          >
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-sm">
                <thead className="bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-secondary">Resource / Page</th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a}
                        className="px-3 py-2 text-center font-medium capitalize text-secondary"
                      >
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
                  {PAGES.map((p) => {
                    const isFinancialRow = p.id === "financials";
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-border ${
                          isFinancialRow ? "bg-primary/5 font-semibold" : ""
                        }`}
                      >
                        <td className="px-3 py-2 text-title flex items-center gap-2">
                          {isFinancialRow ? (
                            <FiShield className="h-4 w-4 shrink-0 text-primary" />
                          ) : null}
                          <span>{p.label}</span>
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </FormSection>
        </Form>
      </Modal>
    </div>
  );
}
