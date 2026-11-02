"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function SupportHandoffInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing token");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/platform/support-handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || "Handoff failed");
          return;
        }
        router.replace("/dashboards");
      } catch {
        setError("Handoff failed");
      }
    })();
  }, [params, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-danger">{error}</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-secondary">
      Opening shop…
    </div>
  );
}

export default function SupportHandoffPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading…</div>}>
      <SupportHandoffInner />
    </Suspense>
  );
}
