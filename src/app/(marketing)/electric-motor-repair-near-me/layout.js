import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { NEAR_ME_KEYWORDS, NEAR_ME_PATH } from "./near-me-seo-data";

export const metadata = marketingPageMetadata({
  path: NEAR_ME_PATH,
  title: "Electric Motor Repair Near Me — Find Local Motor Repair Shops",
  description:
    "Find certified electric motor repair and rewinding shops near you. Browse by state, compare capabilities, and submit a repair request in minutes.",
  ogTitle: "Electric Motor Repair Near Me | IQMotorBase",
  ogDescription:
    "Find certified electric motor repair shops near you. Browse by state or submit a repair request.",
  keywords: NEAR_ME_KEYWORDS,
});

export default function NearMeLayout({ children }) {
  return children;
}
