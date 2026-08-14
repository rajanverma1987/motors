import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/about",
  title: "About IQMotorBase | Motor Repair Shop Software",
  description:
    "About IQMotorBase — built for electric motor repair shops to manage jobs, leads, inventory, and billing in one place.",
});

export default function AboutLayout({ children }) {
  return children;
}
