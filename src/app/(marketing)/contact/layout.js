import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/contact",
  title: "Book a Free Demo | IQMotorBase",
  description:
    "Book a free 30-minute demo of IQMotorBase motor repair shop software. See the full platform, ask questions, and get honest guidance on whether it fits your shop.",
});

export default function ContactLayout({ children }) {
  return children;
}
