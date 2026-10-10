"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Table from "@/components/ui/table";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useFormatDate } from "@/contexts/user-settings-context";

function formatHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export default function SimpleProposalJobHours({ recordId }) {
  const formatDate = useFormatDate();
  const confirm = useConfirm();
  const alert = useAlert();
  const [totalHours, setTotalHours] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
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

  const startEdit = useCallback((row) => {
    setEditing(row);
    setEditDate(String(row.workDate || "").slice(0, 10));
    setEditHours(String(row.hours ?? ""));
  }, []);

  const saveEdit = useCallback(async () => {
    const id = String(recordId || "").trim();
    const entryId = String(editing?.id || "").trim();
    if (!id || !entryId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${encodeURIComponent(id)}/job-hours`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entryId, workDate: editDate, hours: editHours }),
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
  }, [alert, editDate, editHours, editing, load, recordId]);

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
        size="xl"
      >
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
