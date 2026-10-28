import Link from "next/link";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/talent/unsubscribe",
  title: "Job alert preferences | Talent",
  description: "Manage IQMotorBase talent job alert email preferences.",
  index: false,
  follow: false,
});

export default async function TalentUnsubscribePage({ searchParams }) {
  const sp = typeof searchParams?.then === "function" ? await searchParams : searchParams || {};
  const ok = String(sp.ok || "") === "1";
  const error = String(sp.error || "") === "1";

  return (
    <div className="mx-auto max-w-[36rem] px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-title">Job alerts</h1>
      {ok ? (
        <p className="mt-4 text-secondary">
          You are unsubscribed from talent job alert emails. You can turn alerts back on anytime in your{" "}
          <Link href="/talent/profile" className="text-primary hover:underline">
            profile
          </Link>
          .
        </p>
      ) : error ? (
        <p className="mt-4 text-danger">
          We could not update your preference. The link may be invalid. Sign in to manage alerts in your profile.
        </p>
      ) : (
        <p className="mt-4 text-secondary">Use the unsubscribe link from a job alert email to stop alerts.</p>
      )}
      <p className="mt-8">
        <Link href="/talent" className="font-medium text-primary hover:underline">
          Back to talent
        </Link>
      </p>
    </div>
  );
}
