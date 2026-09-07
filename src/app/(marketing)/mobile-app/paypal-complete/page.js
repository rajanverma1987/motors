"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PaypalCompleteContent() {
  const searchParams = useSearchParams();
  const status = String(searchParams.get("status") || "success");
  const token = String(searchParams.get("token") || "").trim();
  const ok = status !== "cancel";
  const [activated, setActivated] = useState(null);

  useEffect(() => {
    if (!ok || !token) return;
    fetch("/api/mobile-app/checkout/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        setActivated(!!json.activated);
      })
      .catch(() => setActivated(false));
  }, [ok, token]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-title">{ok ? "Subscription started" : "Checkout cancelled"}</h1>
      <p className="mt-3 text-sm text-secondary">
        {ok
          ? activated === false
            ? "PayPal has not finished billing yet. Return to the app and it will refresh access shortly."
            : "You can return to IQWireCalculator. Access updates automatically."
          : "No charge was made. You can try again from the app when you are ready."}
      </p>
      <Link
        href="/iqwire"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Return to app
      </Link>
    </main>
  );
}

export default function MobileAppPaypalCompletePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
          <p className="text-sm text-secondary">Loading…</p>
        </main>
      }
    >
      <PaypalCompleteContent />
    </Suspense>
  );
}
