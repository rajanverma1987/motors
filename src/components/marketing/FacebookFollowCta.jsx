import { FaFacebook } from "react-icons/fa";
import { FACEBOOK_PAGE_URL } from "@/lib/social-links";

const linkBase =
  "inline-flex w-full min-w-0 max-w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:text-base";

/**
 * CTA to grow IQMotorBase Facebook page followers.
 * @param {"card"|"compact"|"inline"} [variant]
 * @param {string} [className]
 */
export default function FacebookFollowCta({ variant = "card", className = "" }) {
  if (variant === "inline") {
    return (
      <a
        href={FACEBOOK_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline ${className}`.trim()}
        aria-label="Follow IQMotorBase on Facebook (opens in a new tab)"
      >
        <FaFacebook className="h-4 w-4 shrink-0" aria-hidden />
        Follow on Facebook
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={FACEBOOK_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-title transition-colors hover:border-primary/30 hover:bg-primary/5 ${className}`.trim()}
        aria-label="Follow IQMotorBase on Facebook (opens in a new tab)"
      >
        <FaFacebook className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        Follow on Facebook
      </a>
    );
  }

  return (
    <aside
      className={`rounded-xl border border-border bg-card px-4 py-4 sm:px-5 sm:py-5 ${className}`.trim()}
      aria-labelledby="facebook-follow-heading"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FaFacebook className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="facebook-follow-heading" className="text-base font-bold text-title sm:text-lg">
            Follow IQMotorBase on Facebook
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-secondary">
            Shop tips, directory updates, and product news for motor repair teams.
          </p>
        </div>
      </div>
      <a
        href={FACEBOOK_PAGE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkBase} mt-4`}
        aria-label="Follow IQMotorBase on Facebook (opens in a new tab)"
      >
        <FaFacebook className="h-4 w-4 shrink-0" aria-hidden />
        Follow on Facebook
      </a>
    </aside>
  );
}
