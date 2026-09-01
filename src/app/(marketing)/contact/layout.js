import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/contact",
  title: "Contact IQMotorBase | Book a Demo",
  description:
    "Book a demo for IQMotorBase motor repair shop software. Contact us for pricing, onboarding, or general questions.",
});

export default function ContactLayout({ children }) {
  return children;
}
