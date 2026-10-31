import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/about",
  title: "About 3PhaseFlow | Motor Repair Shop Software & Directory",
  description:
    "3PhaseFlow is a shop management platform and lead generation directory " +
    "built exclusively for electric motor repair and rewinding businesses. " +
    "Founded in 2025. Based in the United States.",
  ogTitle: "About 3PhaseFlow",
  ogDescription:
    "Shop management software and lead generation directory built exclusively " +
    "for electric motor repair and rewinding businesses.",
});

export default function AboutLayout({ children }) {
  return children;
}
