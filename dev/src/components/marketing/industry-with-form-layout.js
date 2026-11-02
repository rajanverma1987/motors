import { INDUSTRY_WITH_FORM_LAYOUT } from "@/lib/listings-directory-layout";

/** Left content column + sticky repair form on the right (desktop). Form first on mobile. */
export default function IndustryWithFormLayout({ children, sidebar }) {
  return (
    <div className={INDUSTRY_WITH_FORM_LAYOUT}>
      <div className="order-2 min-w-0 lg:order-1">{children}</div>
      <div className="order-1 min-h-0 lg:order-2">{sidebar}</div>
    </div>
  );
}
