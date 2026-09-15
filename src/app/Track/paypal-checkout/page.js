import { connectDB } from "@/lib/db";
import TrackFacility from "@/models/TrackFacility";
import { paypalPublicClientId } from "@/lib/paypal-api";
import { IQMOTORTRACK_MONTHLY_USD } from "@/lib/iqmotortrack-marketing";
import TrackPaypalCheckoutClient from "./paypal-checkout-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscribe | IQMotorTrack",
  robots: { index: false, follow: false },
};

export default async function TrackPaypalCheckoutPage({ searchParams }) {
  const sp = await searchParams;
  const checkoutToken = String(sp?.token || "").trim();
  const priceLabel = `$${Number(IQMOTORTRACK_MONTHLY_USD).toFixed(2)} / month`;

  if (!checkoutToken) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-title">Subscribe to IQMotorTrack Pro</h1>
        <p className="mt-3 text-sm text-secondary">
          This checkout link is incomplete. Go back to the app and tap Subscribe again.
        </p>
      </main>
    );
  }

  await connectDB();
  const facility = await TrackFacility.findOne({
    paypalCheckoutToken: checkoutToken,
    paypalCheckoutTokenExpiresAt: { $gt: new Date() },
  })
    .select("paypalPlanId facilityName")
    .lean();

  if (!facility) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-title">Checkout expired</h1>
        <p className="mt-3 text-sm text-secondary">
          Open IQMotorTrack and start Subscribe again. {priceLabel} via PayPal.
        </p>
        <a href="/Track" className="mt-6 font-semibold text-primary hover:underline">
          Back to IQMotorTrack
        </a>
      </main>
    );
  }

  return (
    <TrackPaypalCheckoutClient
      clientId={paypalPublicClientId()}
      paypalPlanId={String(facility.paypalPlanId || "")}
      checkoutToken={checkoutToken}
    />
  );
}
