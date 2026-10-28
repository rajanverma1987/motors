import Link from "next/link";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import TalentOtpLoginForm from "@/components/talent/talent-otp-login-form";

export const metadata = marketingPageMetadata({
  path: "/talent/login",
  title: "Talent sign in | Free motor shop profile",
  description:
    "Sign in with a 6-digit email code to create or edit your free IQMotorBase talent profile. No password required.",
});

export default function TalentLoginPage() {
  return (
    <div className="mx-auto max-w-[40rem] px-4 py-12 sm:px-6">
      <Link href="/talent" className="text-sm text-secondary hover:text-primary">
        Back to talent directory
      </Link>
      <div className="mt-6 rounded-xl border border-border bg-card p-6 sm:p-8">
        <TalentOtpLoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-secondary">
        Looking for shop jobs?{" "}
        <Link href="/careers" className="font-medium text-primary hover:underline">
          Browse careers
        </Link>
      </p>
    </div>
  );
}
