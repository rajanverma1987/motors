import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import { NEAR_ME_KEYWORDS, NEAR_ME_PATH } from "./near-me-seo-data";

export const metadata = marketingPageMetadata({
  path: NEAR_ME_PATH,
  title: { absolute: "Electric Motor Repair & Rewinding Near Me | IQMotorBase" },
  description:
    "Find certified electric motor repair and rewinding shops near you. AC motor rewinding, DC armature rewinding, stator rewinds, and emergency service. Browse by state or submit a request.",
  ogTitle: "Electric Motor Repair & Rewinding Near Me | IQMotorBase",
  ogDescription:
    "Find certified motor repair and rewinding shops near you. AC, DC, armature, stator, and emergency rewinds. Browse by state or submit a repair request.",
  keywords: NEAR_ME_KEYWORDS,
});

export default function NearMeLayout({ children }) {
  return children;
}
