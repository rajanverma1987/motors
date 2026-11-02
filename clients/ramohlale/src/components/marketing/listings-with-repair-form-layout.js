import { LISTINGS_WITH_FORM_LAYOUT } from "@/lib/listings-directory-layout";

/**
 * Main listings column + sticky repair form sidebar (desktop).
 * On mobile, form stacks above listings.
 */
export default function ListingsWithRepairFormLayout({ children, sidebar }) {
  return (
    <div className={LISTINGS_WITH_FORM_LAYOUT}>
      <div className="order-2 min-w-0 lg:order-1">{children}</div>
      <div className="order-1 min-h-0 lg:order-2">{sidebar}</div>
    </div>
  );
}
