"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function RepairFlowPreliminaryRespondPage() {
  const params = useParams();
  const token = params?.token;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Invalid link");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/repair-flow/preliminary-respond?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load quote");
          return;
        }
        setData(json);
      } catch {
        if (!cancelled) setError("Failed to load quote");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAction = async (action) => {
    if (!token || submitting || data?.resolved) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/repair-flow/preliminary-respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");
      setResponse(json);
    } catch (e) {
      setResponse({ error: e.message || "Failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Loading preliminary quote…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || "Not found"}</p>
          <p className="mt-2 text-sm text-gray-600">This link may be invalid or no longer active.</p>
        </div>
      </div>
    );
  }

  if (data.resolved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 print:hidden">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Preliminary quote</h1>
          <p className="text-gray-700">{data.message}</p>
          {data.jobNumber ? (
            <p className="mt-4 text-sm text-gray-500">Job {data.jobNumber}</p>
          ) : null}
        </div>
      </div>
    );
  }

  if (response?.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 print:hidden">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Thank you</h1>
          <p className="text-gray-700">{response.message}</p>
        </div>
      </div>
    );
  }

  if (response?.error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 print:hidden">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600">{response.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:py-4 print:px-0">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow print:shadow-none print:max-w-none">
        <div className="p-6 print:p-4 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4 print:border-gray-300">
            <div>
              <p className="text-sm text-gray-500">Preliminary (pre-disassembly) quote</p>
              <h1 className="text-2xl font-semibold text-gray-900">Job {data.jobNumber || "—"}</h1>
              <p className="mt-1 text-sm text-gray-600">{data.shopName}</p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 print:hidden"
            >
              Print
            </button>
          </div>

          <p className="text-sm text-gray-700">
            Review the estimate below, then choose how you would like to proceed. This is a preliminary quote; final
            pricing may change after detailed inspection.
          </p>

          {data.lineItems?.length ? (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Unit</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-700">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineItems.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-3 py-2 text-gray-900">
                        {row.description || "—"}
                        {row.subjectToTeardown ? (
                          <span className="ml-1 text-xs text-amber-700">(subject to teardown)</span>
                        ) : null}
                        {row.notes ? <div className="mt-1 text-xs text-gray-500">{row.notes}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">{row.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">${row.unitPrice}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-800">${row.lineTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-600">No line items on this preliminary quote.</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-4">
            <p className="text-lg font-semibold text-gray-900">Subtotal</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">${data.subtotal}</p>
          </div>

          {data.quoteNotes ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{data.quoteNotes}</p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/80 p-4 print:hidden">
            <p className="text-sm font-medium text-gray-900">Your preliminary decision</p>
            <p className="text-xs text-gray-600">
              Approve to authorize disassembly and repair per this estimate. Decline if you do not wish to proceed (we
              will follow up about pickup). Scrap authorizes disposition as scrap if that applies to your situation.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("approve_preliminary")}
                className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {submitting ? "Sending…" : "Approve disassembly & repair"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("reject_preliminary")}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Decline / pick up as-is
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleAction("scrap_preliminary")}
                className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
              >
                Authorize scrap
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
