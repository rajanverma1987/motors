import Link from "next/link";

const CALCULATOR_HREF = "/electric-motor-rewinding-cost-calculator";

const btnClass =
  "inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary text-white transition-opacity hover:opacity-90";

export default function CostPageCta({ compact = false }) {
  return (
    <Link
      href={CALCULATOR_HREF}
      className={`${btnClass} ${compact ? "px-3 py-1 text-sm" : "px-6 py-3 text-lg"}`}
    >
      Calculate Cost yourself
    </Link>
  );
}
