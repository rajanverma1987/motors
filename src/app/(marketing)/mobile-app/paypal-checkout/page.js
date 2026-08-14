import MobileAppPaypalCheckoutClient from "./paypal-checkout-client";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscribe — IQWireCalculator",
  robots: { index: false, follow: false },
};

export default async function MobileAppPaypalCheckoutPage({ searchParams }) {
  const sp = await searchParams;
  const checkoutToken = String(sp?.token || "").trim();
  const clientId = String(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "").trim();
  const calcPlan = await getMobileAppSubscriptionPlan();
  return (
    <MobileAppPaypalCheckoutClient
      clientId={clientId}
      paypalPlanId={calcPlan.paypalPlanId || ""}
      checkoutToken={checkoutToken}
    />
  );
}
