import Link from "next/link";
import Button from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-24">
      <p className="text-6xl font-bold tabular-nums text-primary/25" aria-hidden>404</p>
      <h1 className="mt-2 text-2xl font-bold text-title">Admin page not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-secondary">
        The admin route you opened is not available. Return to the admin home or sign in again.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href="/admin/listings">
          <Button variant="primary" className="w-full sm:w-auto">Admin listings</Button>
        </Link>
        <Link href="/admin/login">
          <Button variant="outline" className="w-full sm:w-auto">Admin login</Button>
        </Link>
      </div>
    </div>
  );
}
