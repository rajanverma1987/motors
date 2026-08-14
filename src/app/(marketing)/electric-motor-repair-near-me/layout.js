import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/electric-motor-repair-near-me",
  title: "Electric Motor Repair Near Me | Find Local Shops",
  description: "Find electric motor repair shops near you. Browse local repair centers by state and city.",
});

export default function NearMeLayout({ children }) {
  return children;
}
