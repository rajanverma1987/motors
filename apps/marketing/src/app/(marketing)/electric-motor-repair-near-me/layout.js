import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { NEAR_ME_KEYWORDS, NEAR_ME_PATH } from "./near-me-seo-data";

export const metadata = marketingPageMetadata({
  path: NEAR_ME_PATH,
  title: { absolute: "Industrial Motor Repair Near Me | Plant & Facility Shops | 3PhaseFlow" },
  description:
    "Find industrial electric motor repair and rewinding shops near your facility (5+ HP plant work). AC rewinding, DC armature work, stator rewinds, and emergency service. Not for residential, pool, or spa motors.",
  ogTitle: "Industrial Motor Repair Near Me | 3PhaseFlow",
  ogDescription:
    "Industrial motor repair and rewinding shops near your plant or facility. AC, DC, armature, stator, and emergency rewinds for commercial motors 5 HP and above.",
  keywords: NEAR_ME_KEYWORDS,
});

export default function NearMeLayout({ children }) {
  return children;
}
