"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import PortalCustomerContent from "./portal-customer-content";

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
    return () => {
      cancelled = true;
    };
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
        <div className="text-center max-w-[33.6rem]">
          <p className="font-medium text-danger">{error || "Portal not found"}</p>
          <p className="mt-2 text-sm text-secondary">
            This link may be invalid or expired. Please contact your repair shop for a new link.
          </p>
        </div>
      </div>
    );
  }

  return <PortalCustomerContent data={data} />;
}
