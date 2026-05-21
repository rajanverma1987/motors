import { Suspense } from "react";
import CalculatorsSubscriptionPageClient from "./calculators-subscription-page-client";

const path = "/calculators-subscription";

export const metadata = {
  title: "Calculator subscription — motor shop tools | IQMotorBase.com",
  description:
    "Subscribe to IQMotorBase calculators: rewind cost ballpark, CM Best Match, FLA, torque, speed, and bench electrical tools for motor repair shops.",
  alternates: { canonical: path },
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
