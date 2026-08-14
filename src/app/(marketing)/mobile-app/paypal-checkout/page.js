import Link from "next/link";
import { getMobileAppSubscriptionPlan } from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscribe — IQWireCalculator",
  robots: { index: false, follow: false },
};

export default async function MobileAppPaypalCheckoutPage({ searchParams }) {
  const sp = await searchParams;
  const checkoutToken = String(sp?.token || "").trim();
  const calcPlan = await getMobileAppSubscriptionPlan();
  const price = Number(calcPlan.monthlyUsd);
  const priceLabel = Number.isFinite(price) ? `$${price.toFixed(2)} / month` : "Monthly subscription";

  if (!checkoutToken) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-title">Subscribe to IQWireCalculator</h1>
        <p className="mt-3 text-sm text-secondary">This checkout link is incomplete. Go back to the app and tap Subscribe again.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-title">Subscribe to IQWireCalculator</h1>
      <p className="mt-3 text-sm text-secondary">
        {priceLabel}. You will continue on PayPal’s website to approve billing. After you finish, return to the app.
      </p>
      <Link
        href={`/api/mobile-app/checkout/go?token=${encodeURIComponent(checkoutToken)}`}
        className="mt-8 inline-flex min-w-0 max-w-full items-center justify-center whitespace-nowrap rounded-md bg-primary px-6 py-3 text-base font-semibold text-white hover:opacity-90"
      >
        Continue to PayPal
      </Link>
    </main>
  );
}
