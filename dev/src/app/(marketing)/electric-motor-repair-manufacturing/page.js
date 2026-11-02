import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import IndustryPageView from "@/components/marketing/industry-page-view";
import { getIndustryPageBySlug } from "@/lib/industry-pages";

const SLUG = "electric-motor-repair-manufacturing";
const PAGE = getIndustryPageBySlug(SLUG);

export const metadata = marketingPageMetadata({
  path: `/${PAGE.slug}`,
  title: PAGE.title,
  description: PAGE.metaDescription,
});

export default function ElectricMotorRepairManufacturingPage() {
  return <IndustryPageView page={PAGE} />;
}
