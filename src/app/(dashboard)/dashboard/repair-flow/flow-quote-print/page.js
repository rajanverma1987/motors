"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import RepairFlowFlowQuotePrintContent from "@/components/dashboard/repair-flow-flow-quote-print-content";

function FlowQuotePrintInner() {
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleId = "flow-quote-print-toolbar-hide";
    if (document.getElementById(styleId)) return;
    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = "@media print { .flow-quote-print-no-print { display: none !important; } }";
    document.head.appendChild(el);
  }, []);

  const [job, setJob] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setError("Job ID required");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [jobRes, qRes] = await Promise.all([
          fetch(`/api/dashboard/repair-flow/jobs/${jobId}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/dashboard/repair-flow/jobs/${jobId}/flow-quotes`, { credentials: "include", cache: "no-store" }),
        ]);
        const jobData = await jobRes.json().catch(() => ({}));
        const quotesData = await qRes.json().catch(() => []);
        if (cancelled) return;
        if (!jobRes.ok) {
          setError(jobData.error || "Job not found");
          return;
        }
        const j = jobData.job;
        setJob(j);
        const list = Array.isArray(quotesData) ? quotesData : [];
        setQuotes(list);
        if (list.length === 0) {
          setError("No repair flow quotes have been created for this job yet.");
        }
      } catch {
        if (!cancelled) setError("Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (loading || error || !quotes.length) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [loading, error, quotes]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-secondary">Loading…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-red-600">{error || "Not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 text-sm text-title print:p-4">
      <div className="flow-quote-print-no-print mb-4 flex flex-wrap justify-end gap-2 border-b border-border pb-4">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted/20"
          onClick={() => window.print()}
        >
          Print
        </button>
      </div>

      <RepairFlowFlowQuotePrintContent job={job} quotes={quotes} fmt={fmt} accountSettings={accountSettings} />
    </div>
  );
}

export default function FlowQuotePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-6">
          <p className="text-secondary">Loading…</p>
        </div>
      }
    >
      <FlowQuotePrintInner />
    </Suspense>
  );
}
