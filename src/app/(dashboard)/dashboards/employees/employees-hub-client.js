"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiPrinter, FiRefreshCw } from "react-icons/fi";
import QRCode from "qrcode";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";
import {
  TIME_CLOCK_RADIUS_DEFAULT_M,
  TIME_CLOCK_RADIUS_MAX_M,
  TIME_CLOCK_RADIUS_MIN_M,
} from "@/lib/time-clock-geo";
import SimpleEmployeesPanel from "@/components/simple/simple-employees-panel";

const TABS = [
  { id: "employees", label: "Employees" },
  { id: "floor", label: "Floor" },
  { id: "time-clock", label: "Time clock" },
  { id: "hours", label: "Hours" },
  { id: "punches", label: "Punches" },
  { id: "payroll", label: "Payroll" },
  { id: "alerts", label: "Alerts" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function printQrDataUrl(dataUrl, title) {
  const safeTitle = String(title || "Time Clock")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const root = document.createElement("div");
  root.id = "time-clock-print-root";
  root.setAttribute("aria-hidden", "true");
  // Same off-screen pattern as quote print: hide on screen with opacity/left;
  // @media print must override those on THIS element (opacity does not unblock children).
  root.style.cssText =
    "position:fixed;left:-100vw;top:0;width:100%;opacity:0;pointer-events:none;z-index:-1;background:#fff;color:#111;text-align:center;padding:24px;font-family:system-ui,sans-serif;";
  root.innerHTML = `<h1 style="font-size:22px;margin:0 0 8px;width:100%;text-align:center;">${safeTitle}</h1>
    <p style="margin:0 0 12px;font-size:14px;width:100%;text-align:center;">Scan this QR with your phone camera to open Time Clock.</p>
    <img src="${dataUrl}" alt="Time Clock QR" width="280" height="280" style="display:block;width:280px;height:280px;margin:0 auto 16px;" />
    <div style="width:100%;max-width:420px;margin:0 auto;text-align:left;font-size:13px;line-height:1.45;color:#111;">
      <p style="margin:0 0 8px;font-size:14px;font-weight:700;text-align:center;">Setup (one time)</p>
      <ol style="margin:0;padding-left:1.25rem;">
        <li style="margin-bottom:6px;"><strong>Scan</strong> the QR and open the link in Safari (iPhone) or Chrome (Android).</li>
        <li style="margin-bottom:6px;"><strong>Add to Home Screen</strong> so it works like an app:
          <ul style="margin:4px 0 0;padding-left:1.1rem;">
            <li><strong>iPhone:</strong> Share → Add to Home Screen</li>
            <li><strong>Android:</strong> Menu (⋮) → Install app or Add to Home screen</li>
          </ul>
        </li>
        <li style="margin-bottom:6px;">Open the Home Screen icon. Enter your <strong>work email</strong> and tap <strong>Register passkey</strong>.</li>
        <li style="margin-bottom:6px;">Confirm with Face ID / fingerprint / screen lock when asked.</li>
        <li style="margin-bottom:0;">Later punches: open the app → biometric sign-in → allow <strong>location</strong> while at the shop → Mark In / Out.</li>
      </ol>
      <p style="margin:12px 0 0;font-size:12px;text-align:center;color:#444;">Location must be on and you must be at the shop to punch. History and Hours do not need location.</p>
    </div>`;
  document.body.appendChild(root);
  const style = document.createElement("style");
  style.textContent = `@media print {
    @page { margin: 0.6in; }
    body * { visibility: hidden !important; }
    #time-clock-print-root, #time-clock-print-root * { visibility: visible !important; }
    #time-clock-print-root {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: flex-start !important;
      opacity: 1 !important;
      background: #ffffff !important;
      color: #111111 !important;
      z-index: 2147483647 !important;
      padding: 20px !important;
      text-align: center !important;
      box-sizing: border-box !important;
    }
    #time-clock-print-root img {
      display: block !important;
      margin-left: auto !important;
      margin-right: auto !important;
    }
    #time-clock-print-root ol,
    #time-clock-print-root ul {
      text-align: left !important;
    }
  }`;
  document.head.appendChild(style);
  const cleanup = () => {
    window.removeEventListener("afterprint", cleanup);
    style.remove();
    root.remove();
  };
  window.addEventListener("afterprint", cleanup);
  const img = root.querySelector("img");
  const triggerPrint = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };
  if (img && !img.complete) {
    img.addEventListener("load", triggerPrint, { once: true });
    img.addEventListener("error", triggerPrint, { once: true });
  } else {
    triggerPrint();
  }
}

export default function EmployeesHubClient() {
  const alert = useAlert();
  const confirm = useConfirm();
  const [tab, setTab] = useState("employees");
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusM, setRadiusM] = useState(String(TIME_CLOCK_RADIUS_DEFAULT_M));
  const [savingGeo, setSavingGeo] = useState(false);
  const [hoursFrom, setHoursFrom] = useState(daysAgoIso(7));
  const [hoursTo, setHoursTo] = useState(todayIso());
  const [hoursRows, setHoursRows] = useState([]);
  const [punches, setPunches] = useState([]);
  const [punchPage, setPunchPage] = useState(1);
  const [punchPageSize, setPunchPageSize] = usePreferredTablePageSize();
  const [punchTotal, setPunchTotal] = useState(0);
  const [addPunchOpen, setAddPunchOpen] = useState(false);
  const [addPunch, setAddPunch] = useState({ employeeId: "", type: "in", punchedAt: "" });

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/dashboard/time-clock", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setMeta(data);
    setLat(data.geofence?.lat != null ? String(data.geofence.lat) : "");
    setLng(data.geofence?.lng != null ? String(data.geofence.lng) : "");
    setRadiusM(String(data.geofence?.radiusM || TIME_CLOCK_RADIUS_DEFAULT_M));
    return data;
  }, []);

  const loadHours = useCallback(async () => {
    const params = new URLSearchParams({ from: hoursFrom, to: hoursTo });
    const res = await fetch(`/api/dashboard/time-clock/hours?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load hours");
    setHoursRows(Array.isArray(data.rows) ? data.rows : []);
  }, [hoursFrom, hoursTo]);

  const loadPunches = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(punchPage),
      pageSize: String(punchPageSize),
    });
    const res = await fetch(`/api/dashboard/time-clock/punches?${params}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load punches");
    setPunches(Array.isArray(data.items) ? data.items : []);
    setPunchTotal(Number(data.totalCount) || 0);
  }, [punchPage, punchPageSize]);

  const refresh = useCallback(async () => {
    if (tab === "employees") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await loadMeta();
      if (tab === "hours" || tab === "payroll") await loadHours();
      if (tab === "punches") await loadPunches();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed to load", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [alert, loadHours, loadMeta, loadPunches, tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const [locating, setLocating] = useState(false);

  const useMyLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      void alert({
        title: "Unavailable",
        message: "This browser does not support location. Enter latitude and longitude manually.",
        variant: "danger",
      });
      return;
    }

    // Must call getCurrentPosition in the same user-gesture turn or some browsers
    // will not show the permission prompt.
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        void alert({
          title: "Location set",
          message: `Latitude ${pos.coords.latitude.toFixed(6)}, longitude ${pos.coords.longitude.toFixed(6)}. Click Save location to keep it.`,
        });
      },
      (err) => {
        setLocating(false);
        const code = err?.code;
        let message =
          "Could not read your location. Enter latitude and longitude manually, or allow location for this site in the browser address bar.";
        if (code === 1) {
          message =
            "Location was blocked for this site. Open the lock icon in the address bar, set Location to Allow, reload the page, then try Use my location again.";
        } else if (code === 2) {
          message =
            "Location is unavailable right now. Check that Location Services are on for your device, then try again.";
        } else if (code === 3) {
          message = "Location request timed out. Try again, or enter coordinates manually.";
        }
        void alert({ title: "Location not available", message, variant: "danger" });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  const saveGeofence = async () => {
    setSavingGeo(true);
    try {
      const res = await fetch("/api/dashboard/time-clock", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: Number(lat),
          lng: Number(lng),
          radiusM: Number(radiusM) || TIME_CLOCK_RADIUS_DEFAULT_M,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      await alert({ title: "Saved", message: "Shop punch location updated." });
      await loadMeta();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Save failed", variant: "danger" });
    } finally {
      setSavingGeo(false);
    }
  };

  const handlePrintQr = async () => {
    if (!meta?.url) return;
    try {
      const dataUrl = await QRCode.toDataURL(meta.url, { width: 640, margin: 2 });
      printQrDataUrl(dataUrl, `${meta.shopName || "Shop"} Time Clock`);
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Could not print QR", variant: "danger" });
    }
  };

  const voidPunch = async (row) => {
    const ok1 = await confirm({
      title: "Void punch",
      message: `Void ${row.type} for ${row.employeeName || "employee"}?`,
      confirmLabel: "Void",
      variant: "danger",
    });
    if (!ok1) return;
    const ok2 = await confirm({
      title: "Confirm void",
      message: "This cannot be undone from the employee app. Continue?",
      confirmLabel: "Void punch",
      variant: "danger",
    });
    if (!ok2) return;
    const res = await fetch("/api/dashboard/time-clock/punches", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, void: true, voidReason: "Voided by manager" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({ title: "Error", message: data.error || "Void failed", variant: "danger" });
      return;
    }
    await loadPunches();
  };

  const submitAddPunch = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/dashboard/time-clock/punches", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addPunch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      await alert({ title: "Error", message: data.error || "Failed", variant: "danger" });
      return;
    }
    setAddPunchOpen(false);
    await loadPunches();
  };

  const exportPayrollCsv = () => {
    const lines = [
      ["Employee", "Emp #", "Department", "Pay type", "Hourly rate", "Hours", "Est. pay"].join(","),
    ];
    for (const row of hoursRows) {
      const rate = Number.parseFloat(String(row.hourlyRate || "").replace(/[^0-9.]/g, "")) || 0;
      const est = row.payType === "hourly" ? (rate * Number(row.totalHours || 0)).toFixed(2) : "";
      lines.push(
        [
          JSON.stringify(row.name || ""),
          JSON.stringify(row.employeeNumber || ""),
          JSON.stringify(row.department || ""),
          row.payType || "",
          row.hourlyRate || "",
          row.totalHours ?? 0,
          est,
        ].join(",")
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `payroll-${hoursFrom}-to-${hoursTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
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

  const employeeOptions = useMemo(
    () =>
      (meta?.employees || []).map((e) => ({
        value: e.id,
        label: [
          e.name || e.email || e.id,
          e.employeeNumber ? `#${e.employeeNumber}` : "",
          e.employmentStatus && e.employmentStatus !== "Active" ? `(${e.employmentStatus})` : "",
        ]
          .filter(Boolean)
          .join(" "),
      })),
    [meta?.employees]
  );

  return (
    <div className="mx-auto box-border w-full max-w-6xl px-4 py-8">
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-title">Employees</h1>
          <p className="text-sm text-secondary">
            Employee records, time clock, floor status, and attendance reports.
          </p>
        </div>
        {tab !== "employees" ? (
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          Refresh
        </Button>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Employees sections"
        className="mb-4 flex w-full flex-wrap gap-1 border border-border bg-[hsl(var(--form-bg))] p-1 dark:bg-card/60"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
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

      <div className="w-full min-w-0">
      {tab === "employees" ? (
        <SimpleEmployeesPanel onChanged={() => void loadMeta().catch(() => {})} />
      ) : null}

      {loading && !meta && tab !== "employees" ? (
        <p className="text-sm text-secondary">Loading…</p>
      ) : null}

      {tab === "floor" ? (
        <div className="w-full min-w-0 space-y-3">
          <p className="text-sm text-secondary">
            Currently clocked in: <strong>{meta?.floor?.length || 0}</strong>
          </p>
          <div className="w-full min-w-0 overflow-x-auto">
          <Table
            columns={[
              { key: "name", label: "Employee" },
              { key: "employeeNumber", label: "Emp #" },
              { key: "department", label: "Dept" },
              {
                key: "onBreak",
                label: "Status",
                render: (_, row) => (
                  <Badge
                    variant={row.onBreak ? "warning" : "success"}
                    className="rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {row.onBreak ? "On break" : "Clocked in"}
                  </Badge>
                ),
              },
              {
                key: "lastPunch",
                label: "Since",
                render: (_, row) =>
                  row.lastPunch?.punchedAt
                    ? new Date(row.lastPunch.punchedAt).toLocaleString()
                    : "—",
              },
            ]}
            data={meta?.floor || []}
            rowKey="employeeId"
            emptyMessage="Nobody is clocked in."
            responsive
          />
          </div>
        </div>
      ) : null}

      {tab === "time-clock" ? (
        <div className="grid w-full min-w-0 gap-6 lg:grid-cols-2">
          <div className="space-y-3 border border-border bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-title">Shop QR</h2>
            <p className="text-sm text-secondary">
              Print once and post at the shop. Employees scan to open Time Clock, register a passkey
              the first time, then use biometric + location to punch.
            </p>
            <p className="break-all font-mono text-xs text-title">{meta?.url}</p>
            <Button type="button" variant="primary" size="sm" onClick={() => void handlePrintQr()}>
              <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
              Print QR
            </Button>
          </div>
          <div className="space-y-3 border border-border bg-card p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-title">Geofence</h2>
            <p className="text-sm text-secondary">
              Punches are rejected without location or outside this radius (default{" "}
              {TIME_CLOCK_RADIUS_DEFAULT_M} m).
            </p>
            {!meta?.geofence?.configured ? (
              <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs">
                Not configured
              </Badge>
            ) : (
              <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                Configured
              </Badge>
            )}
            <label className="block text-xs font-bold text-title">
              Latitude
              <input
                className="mt-1 h-8 w-full border border-border bg-card px-2 text-sm"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold text-title">
              Longitude
              <input
                className="mt-1 h-8 w-full border border-border bg-card px-2 text-sm"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </label>
            <label className="block text-xs font-bold text-title">
              Radius (meters)
              <input
                type="number"
                min={TIME_CLOCK_RADIUS_MIN_M}
                max={TIME_CLOCK_RADIUS_MAX_M}
                className="mt-1 h-8 w-full border border-border bg-card px-2 text-sm"
                value={radiusM}
                onChange={(e) => setRadiusM(e.target.value)}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={locating}
                onClick={useMyLocation}
              >
                {locating ? "Getting location…" : "Use my location"}
              </Button>
              <Button type="button" variant="primary" size="sm" disabled={savingGeo} onClick={() => void saveGeofence()}>
                {savingGeo ? "Saving…" : "Save location"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "hours" || tab === "payroll" ? (
        <div className="w-full min-w-0 space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-bold text-title">
              From
              <input
                type="date"
                className="mt-1 block h-8 border border-border px-2 text-sm"
                value={hoursFrom}
                onChange={(e) => setHoursFrom(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-title">
              To
              <input
                type="date"
                className="mt-1 block h-8 border border-border px-2 text-sm"
                value={hoursTo}
                onChange={(e) => setHoursTo(e.target.value)}
              />
            </label>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadHours()}>
              Apply
            </Button>
            {tab === "payroll" ? (
              <Button type="button" size="sm" variant="primary" onClick={exportPayrollCsv}>
                Export CSV
              </Button>
            ) : null}
          </div>
          <Table
            columns={[
              { key: "name", label: "Employee" },
              { key: "employeeNumber", label: "Emp #" },
              { key: "department", label: "Dept" },
              { key: "totalHours", label: "Hours" },
              { key: "lateCount", label: "Late" },
              { key: "earlyCount", label: "Early out" },
              ...(tab === "payroll"
                ? [
                    { key: "payType", label: "Pay type" },
                    { key: "hourlyRate", label: "Rate" },
                  ]
                : []),
            ]}
            data={hoursRows}
            rowKey="employeeId"
            emptyMessage="No hours in this range."
            responsive
          />
        </div>
      ) : null}

      {tab === "punches" ? (
        <div className="w-full min-w-0 space-y-3">
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="primary" onClick={() => setAddPunchOpen(true)}>
              Add punch
            </Button>
          </div>
          <Table
            columns={[
              {
                key: "actions",
                label: "",
                render: (_, row) =>
                  row.voidedAt ? null : (
                    <button
                      type="button"
                      className="p-1.5 text-danger hover:bg-danger/10"
                      title="Void"
                      aria-label="Void punch"
                      onClick={() => void voidPunch(row)}
                    >
                      Void
                    </button>
                  ),
              },
              { key: "employeeName", label: "Employee" },
              {
                key: "type",
                label: "Type",
                render: (v) => (
                  <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs uppercase">
                    {v}
                  </Badge>
                ),
              },
              {
                key: "punchedAt",
                label: "When",
                render: (v) => (v ? new Date(v).toLocaleString() : ""),
              },
              { key: "source", label: "Source" },
              {
                key: "distanceM",
                label: "Distance m",
                render: (v) => (v != null ? Math.round(v) : "—"),
              },
            ]}
            data={punches}
            rowKey="id"
            emptyMessage="No punches yet."
            responsive
            pagination={{ page: punchPage, pageSize: punchPageSize, totalCount: punchTotal }}
            onPageChange={(p, ps) => {
              setPunchPage(p);
              setPunchPageSize(ps);
            }}
            paginateClientSide={false}
          />
        </div>
      ) : null}

      {tab === "alerts" ? (
        <div className="w-full min-w-0">
        <Table
          columns={[
            { key: "name", label: "Employee" },
            { key: "message", label: "Alert" },
          ]}
          data={alerts}
          rowKey="id"
          emptyMessage="No open clock alerts."
          responsive
        />
        </div>
      ) : null}

      </div>

      <Modal
        open={addPunchOpen}
        onClose={() => setAddPunchOpen(false)}
        title="Add punch"
        size="md"
        actions={
          <Button type="submit" form="add-punch-form" size="sm" variant="primary">
            Save
          </Button>
        }
      >
        <Form id="add-punch-form" onSubmit={submitAddPunch} className="flex flex-col gap-3 !space-y-0 !border-0 !p-0 !shadow-none">
          <label className="text-xs font-bold">
            Employee
            <select
              required
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addPunch.employeeId}
              onChange={(e) => setAddPunch((f) => ({ ...f, employeeId: e.target.value }))}
            >
              <option value="">Select…</option>
              {employeeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Type
            <select
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addPunch.type}
              onChange={(e) => setAddPunch((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="in">In</option>
              <option value="out">Out</option>
              <option value="break_start">Break start</option>
              <option value="break_end">Break end</option>
            </select>
          </label>
          <label className="text-xs font-bold">
            When (optional)
            <input
              type="datetime-local"
              className="mt-1 h-8 w-full border border-border px-2 text-sm"
              value={addPunch.punchedAt}
              onChange={(e) => setAddPunch((f) => ({ ...f, punchedAt: e.target.value }))}
            />
          </label>
        </Form>
      </Modal>
    </div>
  );
}
