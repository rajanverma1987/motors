import Image from "next/image";
import { BRAND_LOGO_HEIGHT, BRAND_LOGO_PUBLIC_PATH, BRAND_LOGO_WIDTH } from "@/lib/brand-logo";

/**
 * Site wordmark. In dark mode the charcoal metal artwork sits on a warm light
 * plate with a soft copper glow so it stays readable and “shines.”
 *
 * @param {object} props
 * @param {string} [props.className], size classes for the image (h-*, max-w-*, etc.)
 * @param {string} [props.wrapperClassName]
 * @param {boolean} [props.priority]
 * @param {string} [props.alt]
 */
export default function BrandLogo({
  className = "h-8 w-auto max-w-[min(100%,12rem)] object-contain object-left",
  wrapperClassName = "",
  priority = false,
  alt = "IQ Motorbase",
  /** No padding, gradient, or border, use in the always-light navbar. */
  plain = false,
}) {
  const frameClasses = plain
    ? ""
    : "brand-logo-frame rounded-md px-1.5 py-1 dark:bg-[linear-gradient(180deg,hsl(32_28%_96%)_0%,hsl(28_22%_90%)_100%)] dark:shadow-[0_0_0_1px_hsl(28_18%_78%),0_0_18px_-2px_hsl(var(--primary)/0.55),inset_0_1px_0_0_hsl(38_40%_98%)]";

  return (
    <span
      className={`inline-flex max-w-full items-center ${frameClasses} ${wrapperClassName}`.trim()}
    >
      <Image
        src={BRAND_LOGO_PUBLIC_PATH}
        alt={alt}
        width={BRAND_LOGO_WIDTH}
        height={BRAND_LOGO_HEIGHT}
        className={`brand-logo-img ${className}`.trim()}
        priority={priority}
      />
    </span>
  );
}
