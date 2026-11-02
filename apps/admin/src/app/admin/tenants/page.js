"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";

/**
 * Minimal tenants list + Open shop (support handoff).
 */
export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/tenants");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Failed to load tenants");
          return;
        }
        setTenants(data.tenants || []);
      } catch {
        setError("Failed to load tenants");
      }
    })();
  }, []);

  async function openShop(slug) {
    setBusy(slug);
    setError("");
    try {
      const res = await fetch("/api/admin/tenants/open-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Open shop failed");
        return;
      }
      if (data.url) window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Open shop failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-title">Tenants</h1>
      <p className="mt-1 text-sm text-secondary">Isolated client hosts. Open shop uses a short-lived support handoff.</p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Actions</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Host</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">DNS</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.slug} className="border-t border-border">
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy === t.slug}
                    onClick={() => openShop(t.slug)}
                  >
                    Open shop
                  </Button>
                </td>
                <td className="px-3 py-2 font-medium text-title">{t.slug}</td>
                <td className="px-3 py-2">{t.host}</td>
                <td className="px-3 py-2">{t.ownerEmail}</td>
                <td className="px-3 py-2">{t.status}</td>
                <td className="px-3 py-2">{t.dnsStatus}</td>
              </tr>
            ))}
            {tenants.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-secondary" colSpan={6}>
                  No tenants yet. Run provision-client.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
