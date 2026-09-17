import Link from "next/link";
import { getDemoBookingUrl, isExternalDemoBookingUrl } from "@/lib/demo-booking-url";

/**
 * CTA link to calendar booking (or /contact when env is unset).
 * @param {{ children: import("react").ReactNode, className?: string, onClick?: function }} props
 */
export default function DemoBookingLink({ children, className = "", onClick }) {
  const href = getDemoBookingUrl();
  if (isExternalDemoBookingUrl(href)) {
    return (
      <a
        href={href}
        className={className}
        onClick={onClick}
        rel="noopener noreferrer"
        target="_blank"
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
