"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { useAlert } from "@/components/confirm-provider";
import { SIMPLE_PORTAL_PATH } from "@/lib/simple-portal-tabs";
import {
  SIMPLE_LIST_TABLE_PROPS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";
import SimpleEmployeesPanel from "@/components/simple/simple-employees-panel";

const TOP_TABS = [
  { id: "employees", label: "Employees" },
  { id: "floor", label: "Floor" },
  { id: "alerts", label: "Alerts" },
];

export default function EmployeesHubClient() {
  const alert = useAlert();
  const employeesPanelRef = useRef(null);
  const [tab, setTab] = useState("employees");
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/dashboard/time-clock", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setMeta(data);
    return data;
  }, []);

  const refresh = useCallback(async () => {
    if (tab === "employees") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await loadMeta();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed to load", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [alert, loadMeta, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchTab = (nextTab) => {
    if (nextTab === tab) return;
    if (nextTab === "employees") {
      setLoading(false);
    } else {
      setLoading(true);
    }
    setTab(nextTab);
  };

  const alerts = useMemo(() => {
    const list = [];
    const now = Date.now();
    for (const row of meta?.floor || []) {
      const at = row.lastPunch?.punchedAt ? new Date(row.lastPunch.punchedAt).getTime() : 0;
      if (at && now - at > 12 * 60 * 60 * 1000) {
        list.push({
          id: row.employeeId,
          name: row.name,
          message: "Still clocked in for over 12 hours. May have forgotten to punch out.",
        });
      }
    }
    return list;
  }, [meta?.floor]);

  return (
    <div className="simple-portal box-border flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden px-1 py-3">
      <div className="mb-3 flex w-full shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={SIMPLE_PORTAL_PATH}
            className="mb-3 inline-flex items-center gap-2 text-base font-semibold text-secondary transition-colors hover:text-primary sm:text-lg"
          >
            <FiArrowLeft className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" aria-hidden />
            Back to dashboard
          </Link>
          <h1 className="text-2xl font-bold text-title">Employees</h1>
          <p className="text-sm text-secondary">
            Employee records, floor status, and clock alerts. Time Clock setup is under Settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Employees sections"
            className="flex flex-wrap gap-1 border border-border bg-[hsl(var(--form-bg))] p-1 dark:bg-card/60"
          >
            {TOP_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => switchTab(t.id)}
                className={`shrink-0 px-3.5 py-2 text-sm font-bold tracking-tight ${
                  tab === t.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-primary/10 text-primary hover:bg-primary/15"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tab !== "employees" ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
              <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
              Refresh
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className={tab === "employees" ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" : "hidden"}>
        <SimpleEmployeesPanel
          ref={employeesPanelRef}
          onChanged={() => void loadMeta().catch(() => {})}
        />
      </div>

      {loading && tab !== "employees" ? (
        <div
          className="flex min-h-[16rem] flex-col items-center justify-center gap-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span
            className="inline-block h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
            aria-hidden
          />
          <p className="text-sm text-secondary">Loading…</p>
        </div>
      ) : null}

      {!loading && tab === "floor" ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-3">
          <p className="shrink-0 text-sm text-secondary">
            Currently clocked in: <strong>{meta?.floor?.length || 0}</strong>
          </p>
          <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
          <Table
            {...SIMPLE_LIST_TABLE_PROPS}
            columns={[
              { key: "name", label: "Employee" },
              {
                key: "employeeNumber",
                label: "Emp #",
                render: (v) => v || "-",
              },
              {
                key: "lastPunch",
                label: "Since",
                render: (_, row) => {
                  const at = row.lastPunch?.punchedAt;
                  if (!at) return "-";
                  return new Date(at).toLocaleString();
                },
              },
              {
                key: "status",
                label: "Status",
                render: () => (
                  <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                    In
                  </Badge>
                ),
              },
            ]}
            data={meta?.floor || []}
            rowKey="employeeId"
            emptyMessage="Nobody is clocked in."
          />
          </div>
        </div>
      ) : null}

      {!loading && tab === "alerts" ? (
        <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          {...SIMPLE_LIST_TABLE_PROPS}
          columns={[
            { key: "name", label: "Employee" },
            { key: "message", label: "Alert" },
          ]}
          data={alerts}
          rowKey="id"
          emptyMessage="No open clock alerts."
        />
        </div>
      ) : null}

      </div>
    </div>
  );
}
