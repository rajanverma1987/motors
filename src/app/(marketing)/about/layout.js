import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/about",
  title: "About IQMotorBase | Motor Repair Shop Software & Directory",
  description:
    "IQMotorBase is a shop management platform and lead generation directory " +
    "built exclusively for electric motor repair and rewinding businesses. " +
    "Founded in 2025. Based in the United States.",
  ogTitle: "About IQMotorBase",
  ogDescription:
    "Shop management software and lead generation directory built exclusively " +
    "for electric motor repair and rewinding businesses.",
});

export default function AboutLayout({ children }) {
  return children;
}
