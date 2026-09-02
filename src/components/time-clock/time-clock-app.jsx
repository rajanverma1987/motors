"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import TimeClockQrScanner from "@/components/time-clock/time-clock-qr-scanner";

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err?.code === 1) {
          reject(new Error("Turn on location and be at the shop to punch in or out."));
        } else {
          reject(new Error("Could not get your location. Try again near the shop."));
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
}

async function readJson(res) {
  return res.json().catch(() => ({}));
}

function assertPasskeyOptionsMatchPage(options) {
  const rpId = String(options?.rp?.id || options?.rpId || "").toLowerCase();
  if (!rpId || typeof window === "undefined") return;
  const pageHost = String(window.location.hostname || "").toLowerCase();
  const pageIsLocal =
    pageHost === "localhost" || pageHost === "127.0.0.1" || pageHost.endsWith(".localhost");
  const rpIsLocal =
    rpId === "localhost" || rpId === "127.0.0.1" || rpId.endsWith(".localhost");
  if (rpIsLocal && !pageIsLocal) {
    throw new Error(
      "Passkey setup returned localhost instead of this website. Redeploy the server fix, then try again."
    );
  }
}

/**
 * Employee Time Clock PWA client.
 * @param {{ token: string }} props
 */
export default function TimeClockApp({ token }) {
  const [shopName, setShopName] = useState("Shop");
  const [tab, setTab] = useState("punch");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [employee, setEmployee] = useState(null);
  const [status, setStatus] = useState(null);
  const [registerEmail, setRegisterEmail] = useState("");
  const [needsRegister, setNeedsRegister] = useState(false);
  const [history, setHistory] = useState([]);
  const [hours, setHours] = useState(null);
  const [installHint, setInstallHint] = useState(false);
  const [wallScanAuthorized, setWallScanAuthorized] = useState(false);
  const [scanningQr, setScanningQr] = useState(false);
  const webauthnOk = useMemo(() => {
    try {
      return browserSupportsWebAuthn();
    } catch {
      return false;
    }
  }, []);

  const refreshWallScan = useCallback(async () => {
    const res = await fetch(`/api/time-clock/wall-scan?token=${encodeURIComponent(token)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await readJson(res);
    setWallScanAuthorized(Boolean(data.wallScanAuthorized));
    return Boolean(data.wallScanAuthorized);
  }, [token]);

  const mintWallScanFromQr = useCallback(async () => {
    const res = await fetch("/api/time-clock/wall-scan", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Could not unlock punching from QR");
    setWallScanAuthorized(true);
    return true;
  }, [token]);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/time-clock?token=${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Invalid time clock link");
    setShopName(data.shopName || "Shop");
    return data;
  }, [token]);

  const loadStatus = useCallback(async () => {
    const res = await fetch(`/api/time-clock/me?token=${encodeURIComponent(token)}&view=status`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await readJson(res);
    if (res.status === 401) {
      setEmployee(null);
      setStatus(null);
      return null;
    }
    if (!res.ok) throw new Error(data.error || "Failed to load status");
    setEmployee(data.employee || null);
    setStatus(data);
    if (typeof data.wallScanAuthorized === "boolean") {
      setWallScanAuthorized(data.wallScanAuthorized);
    }
    return data;
  }, [token]);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/time-clock/me?token=${encodeURIComponent(token)}&view=history`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to load history");
    setHistory(Array.isArray(data.items) ? data.items : []);
  }, [token]);

  const loadHours = useCallback(async () => {
    const res = await fetch(`/api/time-clock/me?token=${encodeURIComponent(token)}&view=hours`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await readJson(res);
    if (!res.ok) throw new Error(data.error || "Failed to load hours");
    setHours(data);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(window.location.search);
        const fromPwa = params.get("source") === "pwa";
        await loadMeta();
        if (cancelled) return;
        if (fromPwa) {
          // Home Screen open must not unlock punching. Clear any leftover wall cookie.
          await fetch("/api/time-clock/wall-scan", {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          }).catch(() => {});
          if (!cancelled) setWallScanAuthorized(false);
        } else {
          // Printed wall QR (or direct link without source=pwa) unlocks one punch window.
          await mintWallScanFromQr();
        }
        if (cancelled) return;
        await loadStatus();
        if (!cancelled && fromPwa) await refreshWallScan();
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMeta, loadStatus, mintWallScanFromQr, refreshWallScan, token]);

  useEffect(() => {
    if (!employee) return;
    if (tab === "history") void loadHistory().catch((e) => setError(e.message));
    if (tab === "hours") void loadHours().catch((e) => setError(e.message));
  }, [tab, employee, loadHistory, loadHours]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!webauthnOk) throw new Error("This browser does not support passkeys.");
      const optRes = await fetch("/api/time-clock/register", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: registerEmail }),
      });
      const optData = await readJson(optRes);
      if (!optRes.ok) throw new Error(optData.error || "Could not start registration");
      assertPasskeyOptionsMatchPage(optData.options);
      const attestation = await startRegistration({ optionsJSON: optData.options });
      const verifyRes = await fetch("/api/time-clock/register", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          employeeId: optData.employee.id,
          response: attestation,
          expectedChallenge: optData.options.challenge,
        }),
      });
      const verifyData = await readJson(verifyRes);
      if (!verifyRes.ok) throw new Error(verifyData.error || "Registration failed");
      setNeedsRegister(false);
      setInstallHint(true);
      setMessage("Passkey registered. You can add this app to your Home Screen.");
      await loadStatus();
    } catch (err) {
      setError(err?.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!webauthnOk) throw new Error("This browser does not support passkeys.");
      const optRes = await fetch("/api/time-clock/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const optData = await readJson(optRes);
      if (!optRes.ok) throw new Error(optData.error || "Could not start login");
      assertPasskeyOptionsMatchPage(optData.options);
      const assertion = await startAuthentication({ optionsJSON: optData.options });
      const verifyRes = await fetch("/api/time-clock/login", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          response: assertion,
          expectedChallenge: optData.options.challenge,
        }),
      });
      const verifyData = await readJson(verifyRes);
      if (!verifyRes.ok) {
        if (verifyRes.status === 404) setNeedsRegister(true);
        throw new Error(verifyData.error || "Login failed");
      }
      setMessage(`Signed in as ${verifyData.employee?.name || "employee"}`);
      await loadStatus();
    } catch (err) {
      const msg = err?.message || "Login failed";
      if (/No passkey|register/i.test(msg)) setNeedsRegister(true);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handlePunch = async () => {
    setError("");
    setMessage("");
    if (!wallScanAuthorized) {
      setScanningQr(true);
      return;
    }
    setBusy(true);
    try {
      const coords = await getPosition();
      const res = await fetch("/api/time-clock/me", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...coords }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Punch failed");
      setStatus(data);
      setWallScanAuthorized(false);
      setMessage(
        data.punch?.type === "out"
          ? "Punched out. Scan the shop QR again for your next punch."
          : data.punch?.type === "in"
            ? "Punched in. Scan the shop QR again when you punch out."
            : "Punch recorded. Scan the shop QR again for your next punch."
      );
    } catch (err) {
      setError(err?.message || "Punch failed");
      if (err?.message && /Scan the shop/i.test(err.message)) {
        setWallScanAuthorized(false);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleQrMatched = useCallback(async () => {
    setScanningQr(false);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await mintWallScanFromQr();
      const coords = await getPosition();
      const res = await fetch("/api/time-clock/me", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, ...coords }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Punch failed");
      setStatus(data);
      setWallScanAuthorized(false);
      setMessage(
        data.punch?.type === "out"
          ? "Punched out. Scan the shop QR again for your next punch."
          : data.punch?.type === "in"
            ? "Punched in. Scan the shop QR again when you punch out."
            : "Punch recorded. Scan the shop QR again for your next punch."
      );
    } catch (err) {
      setError(err?.message || "Punch failed");
      setWallScanAuthorized(false);
    } finally {
      setBusy(false);
    }
  }, [mintWallScanFromQr, token]);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f3f1ef] p-6 text-sm text-neutral-600">
        Loading time clock…
      </div>
    );
  }

  if (scanningQr) {
    return (
      <TimeClockQrScanner
        expectedToken={token}
        onMatched={() => {
          void handleQrMatched();
        }}
        onCancel={() => setScanningQr(false)}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-[#f3f1ef] text-neutral-900">
      <header className="border-b border-neutral-300 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#945c2e]">{shopName}</p>
        <h1 className="text-xl font-bold">Time Clock</h1>
        {employee ? (
          <p className="mt-1 text-sm text-neutral-600">{employee.name}</p>
        ) : (
          <p className="mt-1 text-sm text-neutral-600">Scan at the shop. Location required to punch.</p>
        )}
      </header>

      {employee ? (
        <nav className="flex border-b border-neutral-300 bg-white">
          {[
            { id: "punch", label: "Punch" },
            { id: "history", label: "History" },
            { id: "hours", label: "Hours" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 px-2 py-3 text-sm font-semibold ${
                tab === t.id ? "border-b-2 border-[#945c2e] text-[#945c2e]" : "text-neutral-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="flex flex-1 flex-col gap-4 p-4">
        {error ? (
          <div className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
        ) : null}
        {message ? (
          <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {message}
          </div>
        ) : null}
        {installHint ? (
          <div className="border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700">
            Tip: add Time Clock to your Home Screen for History and Hours. To punch, always scan the
            shop QR first, then use Face ID / fingerprint and location.
          </div>
        ) : null}

        {!employee ? (
          <div className="flex flex-col gap-4">
            {!webauthnOk ? (
              <p className="text-sm text-red-700">Passkeys are not supported in this browser.</p>
            ) : null}
            <button
              type="button"
              disabled={busy || !webauthnOk}
              onClick={handleLogin}
              className="h-14 w-full bg-[#945c2e] text-base font-bold text-white disabled:opacity-50"
            >
              {busy ? "Waiting…" : "Sign in with Face ID / fingerprint"}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-[#945c2e] underline"
              onClick={() => setNeedsRegister(true)}
            >
              First time? Register passkey
            </button>
            {needsRegister ? (
              <form onSubmit={handleRegister} className="flex flex-col gap-3 border border-neutral-300 bg-white p-3">
                <label className="text-sm font-semibold">
                  Work email
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="mt-1 h-11 w-full border border-neutral-300 px-2"
                    autoComplete="email"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 bg-neutral-900 font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Registering…" : "Register passkey"}
                </button>
              </form>
            ) : null}
          </div>
        ) : null}

        {employee && tab === "punch" ? (
          <div className="flex flex-col gap-4">
            <div className="border border-neutral-300 bg-white p-4 text-center">
              <p className="text-sm text-neutral-600">Status</p>
              <p className="mt-1 text-2xl font-bold">
                {status?.onBreak
                  ? "On break"
                  : status?.clockedIn
                    ? "Clocked in"
                    : "Clocked out"}
              </p>
              {status?.lastPunch?.punchedAt ? (
                <p className="mt-2 text-xs text-neutral-500">
                  Last: {status.lastPunch.type} at{" "}
                  {new Date(status.lastPunch.punchedAt).toLocaleString()}
                </p>
              ) : null}
            </div>
            {!wallScanAuthorized ? (
              <div className="border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950">
                <p className="font-semibold">Scan required</p>
                <p className="mt-1">
                  Tap the button below to open the camera and scan the printed shop QR, then punch.
                </p>
              </div>
            ) : (
              <div className="border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                Shop QR unlocked. Confirm location to finish this punch.
              </div>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handlePunch()}
              className="h-16 w-full bg-[#945c2e] text-lg font-bold text-white disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : wallScanAuthorized
                  ? status?.nextPunchLabel || "Punch"
                  : `Scan QR to ${status?.nextPunchLabel || "Punch"}`}
            </button>
            <p className="text-center text-xs text-neutral-600">
              Each punch opens the camera for the shop QR, then requires location inside the geofence.
            </p>
          </div>
        ) : null}

        {employee && tab === "history" ? (
          <ul className="divide-y divide-neutral-200 border border-neutral-300 bg-white">
            {history.length === 0 ? (
              <li className="px-3 py-4 text-sm text-neutral-600">No punches yet.</li>
            ) : (
              history.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 px-3 py-3 text-sm">
                  <div>
                    <p className="font-semibold uppercase">{row.type}</p>
                    <p className="text-neutral-600">
                      {row.punchedAt ? new Date(row.punchedAt).toLocaleString() : ""}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    {row.late ? <span className="text-amber-700">Late</span> : null}
                    {row.early ? <span className="text-amber-700">Early</span> : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {employee && tab === "hours" ? (
          <div className="border border-neutral-300 bg-white p-4">
            <p className="text-sm text-neutral-600">Total (period)</p>
            <p className="text-3xl font-bold">{hours?.totalHours ?? 0} h</p>
            <ul className="mt-4 divide-y divide-neutral-200">
              {(hours?.byDay || []).map((d) => (
                <li key={d.date} className="flex justify-between py-2 text-sm">
                  <span>
                    {d.date}
                    {d.late || d.early ? (
                      <span className="ml-2 text-xs text-amber-700">
                        {d.late ? "Late" : ""}
                        {d.late && d.early ? " · " : ""}
                        {d.early ? "Early out" : ""}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold">{d.hours} h</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </main>
    </div>
  );
}
