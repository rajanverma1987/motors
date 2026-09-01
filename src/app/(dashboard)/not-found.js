import Link from "next/link";
import Button from "@/components/ui/button";
import { DEFAULT_PORTAL_LANDING_PATH } from "@/lib/all-jobs-tabs";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <p className="text-6xl font-bold tabular-nums text-primary/25" aria-hidden>404</p>
      <h1 className="mt-2 text-2xl font-bold text-title">Page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary">
        This dashboard page does not exist or you may not have access. Check the URL or return to your workspace.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={DEFAULT_PORTAL_LANDING_PATH}>
          <Button variant="primary" className="w-full sm:w-auto">Go to dashboard</Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">IQMotorBase home</Button>
        </Link>
      </div>
    </div>
  );
}
