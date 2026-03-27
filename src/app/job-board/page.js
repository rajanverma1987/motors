"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import JobBoardClient from "@/app/(dashboard)/dashboard/job-board/job-board-client";
import ThemeToggle from "@/components/theme-toggle";
import Button from "@/components/ui/button";

function ShareBoardThemeCorner() {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
      <div className="pointer-events-auto">
        <ThemeToggle />
      </div>
    </div>
  );
}

function JobBoardSharePageInner() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = searchParams.get("token") || "";
    setToken(t);
    if (!t) {
      setError("Protected page");
      setLoading(false);
    }
  }, [searchParams]);

  const load = useCallback(
    async (currentToken) => {
      if (!currentToken) {
        setError("Missing link token.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch("/api/job-board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: currentToken }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Failed to load job board");
          setLoading(false);
          return;
        }
        setData(json);
        setError(null);
        setLoading(false);
      } catch (e) {
        setError("Failed to load job board");
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!token) return;
    load(token);
  }, [token, load]);

  if (loading) {
    return (
      <div className="relative min-h-screen bg-bg flex items-center justify-center p-6">
        <ShareBoardThemeCorner />
        <p className="text-secondary">Loading job board…</p>
      </div>
    );
  }

  if (error || !data) {
    const isProtected = error === "Protected page";
    return (
      <div className="relative min-h-screen bg-bg flex items-center justify-center p-6">
        <ShareBoardThemeCorner />
        <div className="max-w-xl rounded-2xl border border-border bg-card p-6 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Protected Page</p>
          <h1 className="mt-2 text-xl font-semibold text-title">
            {isProtected ? "This job board is private to CRM users." : error || "Job board not found"}
          </h1>
          <p className="mt-3 text-sm text-secondary">
            This page shows live shop-floor work orders with status columns, customer references, and active job flow for
            a repair center. Access is restricted to shared secure links or authenticated CRM users.
          </p>
          <p className="mt-2 text-sm text-secondary">
            {isProtected
              ? "If you run a motor repair or rewinding business, request CRM access to manage leads, quotes, work orders, technician workflows, and billing in one system."
              : "This link may be invalid or expired. Ask your shop to send a new job board link."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href="/contact">
              <Button size="sm" variant="primary">Get CRM access</Button>
            </Link>
            <Link href="/">
              <Button size="sm" variant="outline">Go to home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <JobBoardClient
        initialWorkOrders={data.workOrders}
        initialStatuses={data.workOrderStatuses}
        initialBoardOrder={data.shopFloorBoardOrder}
        publicMode
        shareToken={token}
      />
    </div>
  );
}

export default function JobBoardSharePage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen bg-bg flex items-center justify-center p-6">
          <ShareBoardThemeCorner />
          <p className="text-secondary">Loading job board…</p>
        </div>
      }
    >
      <JobBoardSharePageInner />
    </Suspense>
  );
}

