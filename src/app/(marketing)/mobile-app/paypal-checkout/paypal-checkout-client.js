"use client";

import { useEffect, useRef, useState } from "react";

function PaypalCheckoutInner({ clientId, paypalPlanId, checkoutToken, legacySid }) {
  const hostRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) {
      setStatus("error");
      setError("PayPal is not configured on the server.");
      return;
    }
    if (!paypalPlanId) {
      setStatus("error");
      setError("The subscription plan is not linked to PayPal yet.");
      return;
    }
    if (!checkoutToken && !legacySid) {
      setStatus("error");
      setError("This checkout link is incomplete. Go back to the app and tap Subscribe again.");
      return;
    }

    let cancelled = false;
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&vault=true&intent=subscription&currency=USD&disable-funding=credit,paylater`;

    const renderButtons = () => {
      if (cancelled || !window.paypal || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 48 },
          createSubscription(_data, actions) {
            // Always mint a new subscription here. Passing an existing I- id opens PayPal’s
            // billing popup and it closes immediately.
            return actions.subscription.create({
              plan_id: paypalPlanId,
              custom_id: String(checkoutToken || legacySid || "").slice(0, 127),
            });
          },
          onApprove(data) {
            setStatus("saving");
            return fetch("/api/mobile-app/checkout/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: checkoutToken,
                sid: legacySid,
                subscriptionId: data.subscriptionID,
              }),
            })
              .then(async (res) => {
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || "Could not save subscription.");
                window.location.assign("/mobile-app/paypal-complete?status=success");
              })
              .catch((err) => {
                if (!cancelled) {
                  setStatus("error");
                  setError(err.message || "PayPal succeeded but we could not save it. Contact support.");
                }
              });
          },
          onCancel() {
            if (!cancelled) {
              setStatus("ready");
              setError("PayPal closed before checkout finished. Tap a button below to try again.");
            }
          },
          onError(err) {
            if (!cancelled) {
              setStatus("error");
              const detail = err?.message || err?.toString?.() || "";
              setError(
                detail
                  ? `PayPal could not start checkout: ${detail}`
                  : "PayPal could not start checkout. Try again in Safari or Chrome (not an in-app browser)."
              );
            }
          },
        })
        .render(hostRef.current)
        .then(() => {
          if (!cancelled) setStatus("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setStatus("error");
            setError("PayPal button failed to load. Check your connection and try again.");
          }
        });
    };

    let script = document.querySelector(`script[src^="https://www.paypal.com/sdk/js"]`);
    if (window.paypal) {
      renderButtons();
    } else {
      if (!script) {
        script = document.createElement("script");
        script.src = src;
        script.async = true;
        document.body.appendChild(script);
      }
      const onLoad = () => renderButtons();
      const onErr = () => {
        if (!cancelled) {
          setStatus("error");
          setError("PayPal script was blocked. Redeploy so PayPal is allowed, then try again.");
        }
      };
      script.addEventListener("load", onLoad);
      script.addEventListener("error", onErr);
      return () => {
        cancelled = true;
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onErr);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [clientId, paypalPlanId, checkoutToken, legacySid]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-title">Subscribe to IQWireCalculator</h1>
      <p className="mt-3 text-sm text-secondary">
        Pay with PayPal. You can close this window after you finish and return to the app.
      </p>
      {status === "loading" ? <p className="mt-6 text-sm text-secondary">Loading PayPal…</p> : null}
      {status === "saving" ? <p className="mt-6 text-sm text-secondary">Saving your subscription…</p> : null}
      {error ? <p className="mt-6 text-sm text-red-700">{error}</p> : null}
      <div ref={hostRef} className="mt-8 w-full max-w-sm" />
    </main>
  );
}

export default function MobileAppPaypalCheckoutClient(props) {
  return <PaypalCheckoutInner {...props} />;
}
