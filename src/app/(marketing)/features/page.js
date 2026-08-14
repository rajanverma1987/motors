import { redirect } from "next/navigation";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/",
  title: "Features",
  description:
    "Motor repair workflow, shop parts inventory, quotes and vendor POs, lead generation, and public marketplace listings in one platform.",
  index: false,
});

export default function FeaturesPage() {
  redirect("/#features");
}
