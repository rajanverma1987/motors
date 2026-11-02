"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import SimpleSelect from "@/components/simple/simple-select";
import { buildTechnicianSelectOptions, isShopAdminSelectValue } from "@/lib/technician-select-options";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useFormatDate, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { workOrderStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";

function formatHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function SimpleProposalJobHours({ recordId, employees = [] }) {
  const formatDate = useFormatDate();
  const { settings } = useUserSettings();
  const confirm = useConfirm();
  const alert = useAlert();
  const jobStatusOptions = useMemo(
    () => workOrderStatusSelectOptionsFromMerged(mergeUserSettings(settings)),
    [settings]
  );
  const [totalHours, setTotalHours] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordForm, setRecordForm] = useState({
    employeeId: "",
    workDate: "",
    hours: "",
    note: "",
    jobStatus: "",
  });
  const [editing, setEditing] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editJobStatus, setEditJobStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const id = String(recordId || "").trim();
    if (!id) {
      setTotalHours(0);
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/job-hours`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load recorded hours");
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalHours(Number(data.totalHours) || 0);
    } catch {
      setItems([]);
      setTotalHours(0);
    } finally {
      setLoading(false);
    }
  }, [recordId]);

  useEffect(() => {
    void load();
  }, [load]);

  const technicianOptions = useMemo(
    () =>
      buildTechnicianSelectOptions(employees).filter(
        (option) => option.value && !isShopAdminSelectValue(option.value)
      ),
    [employees]
  );

  const openRecord = useCallback(() => {
    setRecordForm({
      employeeId: technicianOptions[0]?.value || "",
      workDate: todayIso(),
      hours: "",
      note: "",
      jobStatus: "",
    });
    setRecording(true);
  }, [technicianOptions]);

  const saveRecord = useCallback(async () => {
    const id = String(recordId || "").trim();
    if (!id) return;
    if (!String(recordForm.employeeId || "").trim()) {
      await alert({ title: "Error", message: "Technician is required.", variant: "danger" });
      return;
    }
    if (!String(recordForm.jobStatus || "").trim()) {
      await alert({ title: "Error", message: "Job status is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/job-hours`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recordForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to record hours");
      setRecording(false);
      await load();
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to record hours.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  }, [alert, load, recordForm, recordId]);

  const startEdit = useCallback((row) => {
    setEditing(row);
    setEditDate(String(row.workDate || "").slice(0, 10));
    setEditHours(String(row.hours ?? ""));
    setEditJobStatus(String(row.jobStatus || "").trim());
  }, []);

  const saveEdit = useCallback(async () => {
    const id = String(recordId || "").trim();
    const entryId = String(editing?.id || "").trim();
    if (!id || !entryId) return;
    if (!String(editJobStatus || "").trim()) {
      await alert({ title: "Error", message: "Job status is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/job-hours`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: entryId,
          workDate: editDate,
          hours: editHours,
          jobStatus: editJobStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update recorded hours");
      setEditing(null);
      await load();
    } catch (err) {
      await alert({
        title: "Error",
        message: err?.message || "Failed to update recorded hours.",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  }, [alert, editDate, editHours, editJobStatus, editing, load, recordId]);

  const removeEntry = useCallback(
    async (row) => {
      const id = String(recordId || "").trim();
      const entryId = String(row?.id || "").trim();
      if (!id || !entryId) return;
      const ok = await confirm({
        title: "Delete hours",
        message: `Delete ${formatHours(row.hours)} hours recorded on ${formatDate(row.workDate)}?`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(
          `/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/job-hours?entryId=${encodeURIComponent(entryId)}`,
          { method: "DELETE", credentials: "include" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to delete recorded hours");
        await load();
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to delete recorded hours.",
          variant: "danger",
        });
      }
    },
    [alert, confirm, formatDate, load, recordId]
  );

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        sortable: false,
        render: (_, row) => (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="rounded p-1 text-primary hover:bg-primary/10"
              title="Edit"
              aria-label="Edit"
              onClick={(e) => {
                e.stopPropagation();
                startEdit(row);
              }}
            >
              <FiEdit2 className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              className="rounded p-1 text-danger hover:bg-danger/10"
              title="Delete"
              aria-label="Delete"
              onClick={(e) => {
                e.stopPropagation();
                void removeEntry(row);
              }}
            >
              <FiTrash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "employeeName",
        label: "Technician",
        render: (value, row) => value || row.employeeNumber || "-",
      },
      {
        key: "workDate",
        label: "Date",
        render: (value) => (value ? formatDate(value) : "-"),
      },
      {
        key: "hours",
        label: "Hours",
        render: (value) => formatHours(value),
      },
      {
        key: "jobStatus",
        label: "Job status",
        render: (value) =>
          value ? (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              {value}
            </Badge>
          ) : (
            "-"
          ),
      },
    ],
    [formatDate, removeEntry, startEdit]
  );

  const statusTotals = useMemo(() => {
    const totals = new Map();
    for (const row of items) {
      const status = String(row?.jobStatus || "").trim();
      totals.set(status, (totals.get(status) || 0) + (Number(row?.hours) || 0));
    }
    const rows = [];
    const seen = new Set();
    for (const option of jobStatusOptions) {
      if (!totals.has(option.value)) continue;
      seen.add(option.value);
      rows.push({
        id: option.value,
        jobStatus: option.label || option.value,
        hours: totals.get(option.value),
      });
    }
    for (const [status, hours] of totals) {
      if (seen.has(status)) continue;
      rows.push({
        id: status || "__none__",
        jobStatus: status,
        hours,
      });
    }
    return rows;
  }, [items, jobStatusOptions]);

  const statusColumns = useMemo(
    () => [
      {
        key: "jobStatus",
        label: "Job status",
        render: (value) =>
          value ? (
            <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
              {value}
            </Badge>
          ) : (
            "-"
          ),
      },
      {
        key: "hours",
        label: "Hours",
        align: "right",
        render: (value) => formatHours(value),
      },
    ],
    []
  );

  return (
    <>
      <button
        type="button"
        className="mt-auto w-full border border-border bg-card px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary/10"
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        Recorded hours: {loading ? "…" : formatHours(totalHours)}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Recorded hours"
        size="6xl"
        actions={
          <Button type="button" variant="primary" size="sm" onClick={openRecord}>
            Record Hours
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(16rem,0.7fr)]">
          <div className="min-w-0">
            <p className="mb-3 text-sm text-secondary">
              Total recorded job hours: <span className="font-semibold text-title">{formatHours(totalHours)}</span>
            </p>
            <Table
              columns={columns}
              data={items}
              rowKey="id"
              loading={loading}
              dense
              emptyMessage="No job hours recorded yet."
            />
          </div>
          <div className="min-w-0">
            <p className="mb-3 text-sm font-semibold text-title">Hours by job status</p>
            <Table
              columns={statusColumns}
              data={statusTotals}
              rowKey="id"
              loading={loading}
              dense
              paginateClientSide={false}
              emptyMessage="No job hours recorded yet."
            />
          </div>
        </div>
      </Modal>
      <Modal
        open={recording}
        onClose={() => !saving && setRecording(false)}
        title="Record Hours"
        size="sm"
        zIndex={140}
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form="proposal-job-hours-record" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id="proposal-job-hours-record"
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
          onSubmit={(e) => {
            e.preventDefault();
            void saveRecord();
          }}
        >
          <label className="block text-sm font-semibold text-title">
            Technician
            <SimpleSelect
              className="mt-1"
              options={technicianOptions}
              value={recordForm.employeeId}
              onChange={(e) => setRecordForm((form) => ({ ...form, employeeId: e.target.value }))}
              placeholder="Select…"
              searchable
              aria-label="Technician"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Job Status
            <SimpleSelect
              className="mt-1"
              options={jobStatusOptions}
              value={recordForm.jobStatus}
              onChange={(e) => setRecordForm((form) => ({ ...form, jobStatus: e.target.value }))}
              placeholder="Select…"
              searchable
              aria-label="Job Status"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Date
            <input
              type="date"
              required
              value={recordForm.workDate}
              onChange={(e) => setRecordForm((form) => ({ ...form, workDate: e.target.value }))}
              className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm font-normal text-title"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Hours
            <input
              type="number"
              required
              min="0.01"
              max="24"
              step="0.01"
              value={recordForm.hours}
              onChange={(e) => setRecordForm((form) => ({ ...form, hours: e.target.value }))}
              className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm font-normal text-title"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Note (optional)
            <textarea
              rows={2}
              maxLength={500}
              value={recordForm.note}
              onChange={(e) => setRecordForm((form) => ({ ...form, note: e.target.value }))}
              className="mt-1 w-full border border-border bg-background px-2 py-1.5 text-sm font-normal text-title"
            />
          </label>
        </Form>
      </Modal>
      <Modal
        open={Boolean(editing)}
        onClose={() => !saving && setEditing(null)}
        title="Edit hours"
        size="sm"
        zIndex={140}
        actions={
          <Button type="submit" form="proposal-job-hours-edit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <form
          id="proposal-job-hours-edit"
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void saveEdit();
          }}
        >
          <label className="block text-sm font-semibold text-title">
            Job Status
            <SimpleSelect
              className="mt-1"
              options={jobStatusOptions}
              value={editJobStatus}
              onChange={(e) => setEditJobStatus(e.target.value)}
              placeholder="Select…"
              searchable
              aria-label="Job Status"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Date
            <input
              type="date"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm font-normal text-title"
            />
          </label>
          <label className="block text-sm font-semibold text-title">
            Hours
            <input
              type="number"
              required
              min="0.01"
              max="24"
              step="0.01"
              value={editHours}
              onChange={(e) => setEditHours(e.target.value)}
              className="mt-1 h-9 w-full border border-border bg-background px-2 text-sm font-normal text-title"
            />
          </label>
        </form>
      </Modal>
    </>
  );
}
