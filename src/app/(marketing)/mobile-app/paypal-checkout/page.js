import MobileAppPaypalCheckoutClient from "./paypal-checkout-client";

export const metadata = {
  title: "Subscribe — IQWireCalculator",
  robots: { index: false, follow: false },
};

export default function MobileAppPaypalCheckoutPage() {
  const clientId = String(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID || "").trim();
  return <MobileAppPaypalCheckoutClient clientId={clientId} />;
}
