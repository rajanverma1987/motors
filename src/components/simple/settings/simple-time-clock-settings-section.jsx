"use client";

import { useCallback, useEffect, useState } from "react";
import { FiPrinter, FiRefreshCw } from "react-icons/fi";
import QRCode from "qrcode";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import SimpleSelect from "@/components/simple/simple-select";
import { useAlert } from "@/components/confirm-provider";
import {
  TIME_CLOCK_RADIUS_DEFAULT_M,
  TIME_CLOCK_RADIUS_MAX_M,
  TIME_CLOCK_RADIUS_MIN_M,
} from "@/lib/time-clock-geo";
import { windowsTimeZoneOptions } from "@/lib/windows-time-zones";

function printQrDataUrl(dataUrl, title) {
  const safeTitle = String(title || "Time Clock")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const root = document.createElement("div");
  root.id = "time-clock-print-root";
  root.setAttribute("aria-hidden", "true");
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
        <li style="margin-bottom:0;">Later punches: open Time Clock → tap <strong>Scan QR to Punch</strong> → point at this QR → allow <strong>location</strong> at the shop. Home Screen alone does not unlock punching.</li>
      </ol>
      <p style="margin:12px 0 0;font-size:12px;text-align:center;color:#444;">Location must be on and you must be at the shop to punch. History does not need location.</p>
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
      width: 100% !important;
      height: auto !important;
      min-height: 100% !important;
      opacity: 1 !important;
      pointer-events: auto !important;
      z-index: 99999 !important;
      background: #fff !important;
      color: #111 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
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

export default function SimpleTimeClockSettingsSection() {
  const alert = useAlert();
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radiusM, setRadiusM] = useState(String(TIME_CLOCK_RADIUS_DEFAULT_M));
  const [savingGeo, setSavingGeo] = useState(false);
  const [payrollEnabled, setPayrollEnabled] = useState(false);
  const [payrollEmail, setPayrollEmail] = useState("");
  const [payrollFrequency, setPayrollFrequency] = useState("daily");
  const [shopTimeZone, setShopTimeZone] = useState("");
  const timeZoneOptions = windowsTimeZoneOptions();
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [locating, setLocating] = useState(false);

  const loadMeta = useCallback(async () => {
    const res = await fetch("/api/dashboard/time-clock", { credentials: "include", cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed to load");
    setMeta(data);
    setLat(data.geofence?.lat != null ? String(data.geofence.lat) : "");
    setLng(data.geofence?.lng != null ? String(data.geofence.lng) : "");
    setRadiusM(String(data.geofence?.radiusM || TIME_CLOCK_RADIUS_DEFAULT_M));
    setPayrollEnabled(Boolean(data.payrollCommunication?.enabled));
    setPayrollEmail(String(data.payrollCommunication?.email || ""));
    setPayrollFrequency(
      data.payrollCommunication?.frequency === "weekly" ? "weekly" : "daily"
    );
    setShopTimeZone(String(data.shopTimeZone || ""));
    return data;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadMeta();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Failed to load", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [alert, loadMeta]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const useMyLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      void alert({
        title: "Unavailable",
        message: "This browser does not support location. Enter latitude and longitude manually.",
        variant: "danger",
      });
      return;
    }

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

  const savePayrollCommunication = async () => {
    setSavingPayroll(true);
    try {
      const res = await fetch("/api/dashboard/time-clock", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payrollCommunication: {
            enabled: payrollEnabled,
            email: payrollEmail,
            frequency: payrollFrequency,
            timeZone: shopTimeZone,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      await alert({
        title: "Saved",
        message: payrollEnabled
          ? "Payroll communication is on. The Excel file is emailed after the last punch-out for the period."
          : "Payroll communication is off.",
      });
      await loadMeta();
    } catch (err) {
      await alert({ title: "Error", message: err.message || "Save failed", variant: "danger" });
    } finally {
      setSavingPayroll(false);
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

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary">
          Shop QR, punch geofence, and payroll communication for Time Clock.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
          <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          Refresh
        </Button>
      </div>
      <div className="grid min-h-0 w-full min-w-0 gap-6 lg:grid-cols-2">
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
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={savingGeo}
              onClick={() => void saveGeofence()}
            >
              {savingGeo ? "Saving…" : "Save location"}
            </Button>
          </div>
        </div>
        <div className="space-y-3 border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-title">Payroll communication</h2>
          <p className="text-sm text-secondary">
            Punch times and hours on the payroll sheet use this timezone. After the last employee
            punches out at the end of the day or shop week, email an Excel file of punch in, punch
            out, clocked hours, and manual hours.
          </p>
          <div>
            <p className="mb-1 text-xs font-bold text-title">Timezone</p>
            <SimpleSelect
              name="shopTimeZone"
              searchable
              placeholder="Select time zone"
              options={timeZoneOptions}
              value={shopTimeZone}
              onChange={(e) => setShopTimeZone(e.target.value)}
            />
            <p className="mt-1 text-xs text-secondary">
              Clock in, clock out, and hours on the Excel sheet are shown in this timezone.
            </p>
          </div>
          <Input
            label="Notification email"
            type="email"
            name="payrollCommunicationEmail"
            value={payrollEmail}
            onChange={(e) => setPayrollEmail(e.target.value)}
            placeholder="payroll@example.com"
            help="Generate Payroll Sheet and automatic sends use this address."
          />
          <Checkbox
            name="payrollCommunicationEnabled"
            label="Enable payroll communication"
            checked={payrollEnabled}
            onChange={(e) => setPayrollEnabled(e.target.checked)}
          />
          {payrollEnabled ? (
            <>
              <div>
                <p className="mb-1 text-xs font-bold text-title">Send</p>
                <div className="flex flex-wrap gap-1" role="group" aria-label="Payroll send period">
                  {[
                    { id: "daily", label: "Daily" },
                    { id: "weekly", label: "Weekly" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`inline-flex h-8 shrink-0 items-center border px-2.5 text-xs font-semibold ${
                        payrollFrequency === item.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border bg-card text-title hover:border-primary/40"
                      }`}
                      aria-pressed={payrollFrequency === item.id}
                      onClick={() => setPayrollFrequency(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-secondary">
                  {payrollFrequency === "weekly"
                    ? "Sends after the last punch-out on your shop week end day."
                    : "Sends after the last punch-out each day."}
                </p>
              </div>
            </>
          ) : null}
          {meta?.payrollCommunication?.lastSentAt ? (
            <p className="text-xs text-secondary">
              Last sent: {new Date(meta.payrollCommunication.lastSentAt).toLocaleString()}
            </p>
          ) : null}
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={savingPayroll}
            onClick={() => void savePayrollCommunication()}
          >
            {savingPayroll ? "Saving…" : "Save payroll communication"}
          </Button>
        </div>
      </div>
    </div>
  );
}
