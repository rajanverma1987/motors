"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import JobBoardClient from "@/app/(dashboard)/dashboard/job-board/job-board-client";
import ThemeToggle from "@/components/theme-toggle";

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
    return (
      <div className="relative min-h-screen bg-bg flex items-center justify-center p-6">
        <ShareBoardThemeCorner />
        <div className="text-center max-w-md">
          <p className="font-medium text-danger">{error || "Job board not found"}</p>
          <p className="mt-2 text-sm text-secondary">
            This link may be invalid or expired. Ask your shop to send a new job board link.
          </p>
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

