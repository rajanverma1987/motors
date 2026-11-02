import { Suspense } from "react";
import CalculatorsSubscriptionPageClient from "./calculators-subscription-page-client";

const path = "/calculators-subscription";

export const metadata = {
  title: "Calculator subscription | electric motor shop tools | 3PhaseFlow.com",
  description:
    "Subscribe to 3PhaseFlow calculators: rewind cost ballpark, CM Best Match, FLA, torque, speed, and bench electrical tools for motor repair shops.",
  alternates: { canonical: path },
  openGraph: { url: path, siteName: "3PhaseFlow.com", type: "website" },
  robots: { index: true, follow: true },
};

export default function CalculatorsSubscriptionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[67.2rem] px-4 py-16 text-center text-secondary">Loading…</div>
      }
    >
      <CalculatorsSubscriptionPageClient />
    </Suspense>
  );
}
