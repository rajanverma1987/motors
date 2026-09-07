"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useIqwireAuth } from "./auth-context";

function paypalSdkSrc(clientId) {
  return `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&components=buttons&vault=true&intent=subscription&currency=USD&disable-funding=credit,paylater`;
}

function isIosStandalone() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent || "";
  const ios = /iphone|ipad|ipod/i.test(ua);
  return ios && Boolean(window.navigator.standalone);
}

export default function PaypalSubscribeModal({ open, onClose, billingCycle = "monthly" }) {
  const toast = useToast();
  const { token, refreshAccount } = useIqwireAuth();
  const hostRef = useRef(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    if (!open) {
      setStatus("loading");
      setError("");
      setCheckout(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await appFetch("/api/mobile-app/checkout/subscribe", {
          token,
          method: "POST",
          body: { billingCycle },
        });
        if (cancelled) return;
        setCheckout(data);
        if (isIosStandalone() || !data.paypalClientId) {
          setStatus("redirect");
          return;
        }
        setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setError(err.message || "Could not start checkout.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, token, billingCycle]);

  useEffect(() => {
    if (!open || status !== "ready" || !checkout?.paypalClientId || !checkout?.paypalPlanId) return;
    if (isIosStandalone()) return;
    let cancelled = false;
    const src = paypalSdkSrc(checkout.paypalClientId);

    const renderButtons = () => {
      if (cancelled || !window.paypal || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal", height: 48 },
          createSubscription(_data, actions) {
            return actions.subscription.create({
              plan_id: checkout.paypalPlanId,
              custom_id: String(checkout.checkoutToken || "").slice(0, 127),
            });
          },
          onApprove(data) {
            setStatus("saving");
            return fetch("/api/mobile-app/checkout/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: checkout.checkoutToken,
                subscriptionId: data.subscriptionID,
              }),
            })
              .then(async (res) => {
                const json = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(json.error || "Could not save subscription.");
                await refreshAccount().catch(() => {});
                toast.success("Subscription active.");
                onClose?.();
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
              setError("PayPal closed before checkout finished. Try again.");
            }
          },
          onError() {
            if (!cancelled) {
              setStatus("redirect");
              setError("PayPal could not start in this window. Continue on PayPal instead.");
            }
          },
        })
        .render(hostRef.current)
        .catch(() => {
          if (!cancelled) setStatus("redirect");
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
      script.addEventListener("load", onLoad);
      return () => {
        cancelled = true;
        script.removeEventListener("load", onLoad);
      };
    }
    return () => {
      cancelled = true;
    };
  }, [open, status, checkout, onClose, refreshAccount, toast]);

  const priceLabel =
    billingCycle === "yearly"
      ? `$${Number(checkout?.usd || 119).toFixed(2)} / year`
      : `$${Number(checkout?.usd || 11.99).toFixed(2)} / month`;

  const goPaypal = () => {
    if (checkout?.checkoutUrl) window.location.assign(checkout.checkoutUrl);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subscribe with PayPal"
      size="sm"
      actions={
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <p className="text-sm text-secondary">{priceLabel}. Billed through PayPal. Cancel anytime from Profile.</p>
      {status === "loading" ? <p className="mt-4 text-sm text-secondary">Preparing checkout…</p> : null}
      {status === "saving" ? <p className="mt-4 text-sm text-secondary">Saving your subscription…</p> : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      <div ref={hostRef} className="mt-4 min-h-[48px]" />
      {status === "redirect" || status === "error" || status === "ready" ? (
        <Button type="button" className="mt-4 w-full" onClick={goPaypal} disabled={!checkout?.checkoutUrl}>
          Continue on PayPal
        </Button>
      ) : null}
    </Modal>
  );
}
