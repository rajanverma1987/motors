import Link from "next/link";
import BrandLogo from "@/components/marketing/brand-logo";

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <BrandLogo
        plain
        className="h-9 w-auto max-w-[12rem] object-contain"
        wrapperClassName="justify-center"
      />
      <h1 className="mt-8 text-2xl font-bold text-title">Page not found</h1>
      <p className="mt-2 max-w-sm text-center text-sm text-secondary">
        This link is not available on your shop portal.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 py-2 text-white hover:opacity-90"
      >
        Back to sign in
      </Link>
    </div>
  );
}
