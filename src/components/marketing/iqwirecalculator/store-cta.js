import Link from "next/link";
import {
  IQWIRECALCULATOR_APP_STORE_URL,
  IQWIRECALCULATOR_MONTHLY_USD,
  IQWIRECALCULATOR_PATH,
  IQWIRECALCULATOR_PLAY_STORE_URL,
  IQWIRECALCULATOR_TRIAL_DAYS,
} from "@/lib/iqwirecalculator-marketing";

function StoreBadge({ href, storeLabel, platform }) {
  const className =
    "inline-flex min-h-12 min-w-[10.5rem] items-center justify-center rounded-md bg-title px-4 py-2.5 text-center text-sm font-semibold text-white hover:opacity-90";
  const inner = (
    <span className="leading-tight">
      <span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">{storeLabel}</span>
      <span className="block">{platform}</span>
    </span>
  );
  if (href) {
    return (
      <a href={href} className={className} rel="noopener noreferrer" target="_blank">
        {inner}
      </a>
    );
  }
  return (
    <a href={`${IQWIRECALCULATOR_PATH}#pricing`} className={className}>
      {inner}
    </a>
  );
}

/**
 * App Store / Play badges. Links only when env URLs are set — never fake store listings.
 */
export default function IqwireStoreCta({
  align = "start",
  showTrust = true,
  primaryLabel = "Start free trial",
}) {
  const hasIos = Boolean(IQWIRECALCULATOR_APP_STORE_URL);
  const hasPlay = Boolean(IQWIRECALCULATOR_PLAY_STORE_URL);
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      <div className={`flex flex-wrap items-center gap-2 ${align === "center" ? "justify-center" : "justify-start"}`}>
        {hasIos || hasPlay ? (
          <>
            {hasIos ? (
              <StoreBadge href={IQWIRECALCULATOR_APP_STORE_URL} storeLabel="Download on the" platform="App Store" />
            ) : null}
            {hasPlay ? (
              <StoreBadge href={IQWIRECALCULATOR_PLAY_STORE_URL} storeLabel="Get it on" platform="Google Play" />
            ) : null}
          </>
        ) : (
          <Link
            href={`${IQWIRECALCULATOR_PATH}#pricing`}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            {primaryLabel}
          </Link>
        )}
      </div>
      {showTrust ? (
        <p className="max-w-md text-xs leading-relaxed text-secondary">
          {IQWIRECALCULATOR_TRIAL_DAYS}-day free trial, then ${IQWIRECALCULATOR_MONTHLY_USD.toFixed(2)}/mo. Cancel anytime.
          {!hasIos && !hasPlay
            ? " Create an account in the iOS or Android app to start the trial."
            : " Native iOS and Android app."}
        </p>
      ) : null}
    </div>
  );
}
