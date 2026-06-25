"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import { SERVICE_PROPOSAL_DOCUMENT_TITLE, SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER } from "@/lib/quote-document-labels";
import { formatMoney } from "@/lib/format-currency";

export default function QuoteRespondPage() {
  const params = useParams();
  const token = params?.token;
  const [quote, setQuote] = useState(null);
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
        const res = await fetch(`/api/quotes/respond?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || `${SERVICE_PROPOSAL_DOCUMENT_TITLE} not found`);
          return;
        }
        setQuote(data);
      } catch {
        if (!cancelled) setError(`Failed to load ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!quote || typeof window === "undefined") return;
    if (String(window.location.hash || "").toLowerCase() !== "#print") return;
    const t = window.setTimeout(() => {
      window.print();
      const path = window.location.pathname + window.location.search;
      window.history.replaceState(null, "", path);
    }, 450);
    return () => window.clearTimeout(t);
  }, [quote]);

  const fmt = useMemo(() => {
    const code = quote?.currency || "USD";
    return (v) => formatMoney(v, code);
  }, [quote?.currency]);

  const handleRespond = async (action) => {
    if (!token || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/quotes/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to respond");
      setResponse(data);
    } catch (err) {
      setResponse({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <p className="text-gray-600">Loading {SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}…</p>
      </div>
    );
  }
  if (error || !quote) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <p className="font-medium text-red-600">{error || `${SERVICE_PROPOSAL_DOCUMENT_TITLE} not found`}</p>
          <p className="mt-2 text-sm text-gray-600">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  if (response?.ok) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 print:hidden">
        <div className="w-full max-w-[33.6rem] rounded-lg bg-white p-8 text-center shadow">
          <h1 className="mb-2 text-xl font-semibold text-gray-900">Thank you</h1>
          <p className="text-gray-700">{response.message}</p>
        </div>
      </div>
    );
  }
  if (response?.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 print:hidden">
        <div className="w-full max-w-[33.6rem] rounded-lg bg-white p-8 text-center shadow">
          <p className="text-red-600">{response.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-[52.8rem] print:max-w-none">
        {(quote.status === "approved" || quote.status === "rejected") && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-center text-sm font-medium print:mb-4 ${
              quote.status === "approved"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
            role="status"
          >
            {quote.status === "approved"
              ? `${SERVICE_PROPOSAL_DOCUMENT_TITLE} was approved by customer`
              : `${SERVICE_PROPOSAL_DOCUMENT_TITLE} was rejected by customer`}
            {quote.respondedAt && (
              <span className="mt-1 block text-xs opacity-90">
                {new Date(quote.respondedAt).toLocaleDateString(undefined, {
                  dateStyle: "long",
                })}
              </span>
            )}
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4 print:hidden">
          <h1 className="text-xl font-bold text-gray-900">{SERVICE_PROPOSAL_DOCUMENT_TITLE}</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => handleRespond("approve")}
              disabled={submitting || quote.status === "approved" || quote.status === "rejected"}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : `Approve ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}`}
            </button>
            <button
              type="button"
              onClick={() => handleRespond("reject")}
              disabled={submitting || quote.status === "approved" || quote.status === "rejected"}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Sending…" : `Reject ${SERVICE_PROPOSAL_DOCUMENT_TITLE_LOWER}`}
            </button>
          </div>
        </div>

        <QuotePrintSheetBody quote={quote} fmt={fmt} />

        {Array.isArray(quote.attachments) && quote.attachments.length > 0 && (
          <section className="mt-4 rounded-lg border border-neutral-200 bg-white p-4 print:hidden">
            <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
              Attachments
            </h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-neutral-900">
              {quote.attachments.map((a, i) => (
                <li key={`${a.url}-${i}`}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-700 underline hover:opacity-90"
                  >
                    {a.name || "Download"}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
