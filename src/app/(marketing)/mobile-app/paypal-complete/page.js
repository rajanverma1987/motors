"use client";

import { useSearchParams } from "next/navigation";

export default function MobileAppPaypalCompletePage() {
  const searchParams = useSearchParams();
  const status = String(searchParams.get("status") || "success");
  const ok = status !== "cancel";
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-title">{ok ? "Subscription started" : "Checkout cancelled"}</h1>
      <p className="mt-3 text-sm text-secondary">
        {ok
          ? "You can return to the IQWireCalculator app. Access updates automatically."
          : "No charge was made. You can try again from the app when you are ready."}
      </p>
      <p className="mt-6 text-xs text-secondary">You can close this window and go back to the app.</p>
    </main>
  );
}
