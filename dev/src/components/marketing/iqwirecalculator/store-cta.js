import Link from "next/link";
import {
  IQWIRECALCULATOR_APP_PATH,
  IQWIRECALCULATOR_MONTHLY_USD,
  IQWIRECALCULATOR_TRIAL_DAYS,
  IQWIRECALCULATOR_YEARLY_USD,
} from "@/lib/iqwirecalculator-marketing";

export default function IqwireStoreCta({
  align = "start",
  showTrust = true,
  primaryLabel = "Open the app",
}) {
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      <div className={`flex flex-wrap items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}>
        <Link
          href={IQWIRECALCULATOR_APP_PATH}
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          {primaryLabel}
        </Link>
      </div>
      {showTrust ? (
        <p className="max-w-md text-xs leading-relaxed text-secondary">
          {IQWIRECALCULATOR_TRIAL_DAYS}-day free trial, then ${IQWIRECALCULATOR_MONTHLY_USD.toFixed(2)}/mo or $
          {IQWIRECALCULATOR_YEARLY_USD.toFixed(2)}/year via PayPal. Cancel anytime. Install from your phone browser. No
          App Store or Google Play listing.
        </p>
      ) : null}
    </div>
  );
}
