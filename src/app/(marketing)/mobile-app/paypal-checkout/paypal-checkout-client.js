"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaypalCheckoutInner({ clientId }) {
  const searchParams = useSearchParams();
  const sid = String(searchParams.get("sid") || "").trim();
  const hostRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) {
      setError("PayPal is not configured on the server.");
      return;
    }
    if (!sid) {
      setError("Missing checkout session. Go back to the app and tap Subscribe again.");
      return;
    }

    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&vault=true&intent=subscription&currency=USD`;
    const existing = document.querySelector(`script[src^="https://www.paypal.com/sdk/js"]`);
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }

    let cancelled = false;
    const start = () => {
      if (cancelled || !window.paypal || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "subscribe", height: 48 },
          createSubscription(_data, _actions) {
            return sid;
          },
          onApprove() {
            window.location.assign("/mobile-app/paypal-complete?status=success");
          },
          onCancel() {
            window.location.assign("/mobile-app/paypal-complete?status=cancel");
          },
          onError() {
            setError("PayPal could not start checkout. Try again from the app.");
          },
        })
        .render(hostRef.current)
        .catch(() => {
          if (!cancelled) setError("PayPal button failed to load. Check your connection and try again.");
        });
    };

    if (window.paypal) start();
    else script.addEventListener("load", start);

    return () => {
      cancelled = true;
      script.removeEventListener("load", start);
    };
  }, [clientId, sid]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-title">Subscribe to IQWireCalculator</h1>
      <p className="mt-3 text-sm text-secondary">Pay with PayPal. You can close this window after you finish and return to the app.</p>
      {error ? <p className="mt-6 text-sm text-danger">{error}</p> : null}
      <div ref={hostRef} className="mt-8 w-full max-w-sm" />
    </main>
  );
}

export default function MobileAppPaypalCheckoutClient({ clientId }) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] max-w-lg items-center justify-center px-6 py-16 text-sm text-secondary">
          Loading PayPal…
        </main>
      }
    >
      <PaypalCheckoutInner clientId={clientId} />
    </Suspense>
  );
}
