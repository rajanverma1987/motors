"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const STATUS_LABELS = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  rejected: "Rejected",
  rnr: "Return no repair",
};

export default function PortalViewPage() {
  const params = useParams();
  const token = params?.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Unable to load portal");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="font-medium text-danger">{error || "Portal not found"}</p>
          <p className="mt-2 text-sm text-secondary">
            This link may be invalid or expired. Please contact your repair shop for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { customer, motors, quotes } = data;
  const inProgressQuotes = quotes.filter(
    (q) => q.status && !["rejected", "rnr"].includes(q.status.toLowerCase())
  );
  const historyQuotes = quotes.filter(
    (q) => q.status && ["approved", "rejected", "rnr"].includes(q.status.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-title">Motor repair portal</h1>
          <p className="mt-1 text-secondary">
            Welcome, {customer.name || customer.companyName || "Customer"}
          </p>
        </header>

        {/* Motors */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">
            Your motors
          </h2>
          {motors.length === 0 ? (
            <p className="text-sm text-secondary">No motors on file yet.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Serial</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Manufacturer</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Model</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">HP</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">RPM</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Voltage</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Frame</th>
                    </tr>
                  </thead>
                  <tbody>
                    {motors.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-3 text-title">{m.serialNumber || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.manufacturer || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.model || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.hp || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.rpm || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.voltage || "—"}</td>
                        <td className="px-4 py-3 text-title">{m.frameSize || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Repair status (current quotes) */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">
            Repair status
          </h2>
          {inProgressQuotes.length === 0 ? (
            <p className="text-sm text-secondary">No repairs in progress.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-secondary font-medium">RFQ#</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Est. completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inProgressQuotes.map((q) => (
                      <tr key={q.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-title">{q.rfqNumber || "—"}</td>
                        <td className="px-4 py-3 text-title">
                          {STATUS_LABELS[q.status?.toLowerCase()] || q.status || "—"}
                        </td>
                        <td className="px-4 py-3 text-title">{q.date || "—"}</td>
                        <td className="px-4 py-3 text-title">{q.estimatedCompletion || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Repair history */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">
            Repair history
          </h2>
          {historyQuotes.length === 0 ? (
            <p className="text-sm text-secondary">No completed or closed repairs on file.</p>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-secondary font-medium">RFQ#</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-secondary font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyQuotes.map((q) => (
                      <tr key={q.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium text-title">{q.rfqNumber || "—"}</td>
                        <td className="px-4 py-3 text-title">
                          {STATUS_LABELS[q.status?.toLowerCase()] || q.status || "—"}
                        </td>
                        <td className="px-4 py-3 text-title">{q.date || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Test reports - placeholder */}
        <section className="mb-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">
            Test reports
          </h2>
          <p className="text-sm text-secondary">Test reports will appear here when available.</p>
        </section>

        {/* Invoices - placeholder */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">
            Invoices
          </h2>
          <p className="text-sm text-secondary">Invoices will appear here when available.</p>
        </section>
      </div>
    </div>
  );
}
