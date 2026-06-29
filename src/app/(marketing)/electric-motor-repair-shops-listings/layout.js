import { LISTINGS_DIRECTORY_PATH } from "./listings-directory-seo-data";

export const metadata = {
  title: "Electric Motor Repair Shops Directory — Find Repair Centers",
  description:
    "Find electric motor repair shops and rewinding centers across the USA. Browse 1,300+ industrial and commercial electric motor repair listings, search by city or state, and request quotes.",
  keywords: [
    "electric motor repair",
    "electric motor repair shops",
    "electric motor repair near me",
    "industrial electric motor repair",
    "motor repair center",
    "electric motor rewinding",
    "AC motor repair",
    "motor repair directory",
    "electric motor repair services",
    "commercial electric motor repair",
  ],
  authors: [{ name: "IQMotorBase.com" }],
  openGraph: {
    title: "Electric Motor Repair Shops Directory | IQMotorBase.com",
    description:
      "Search electric motor repair and rewinding centers by location. Compare shops, read profiles, and request quotes.",
    url: LISTINGS_DIRECTORY_PATH,
    type: "website",
    siteName: "IQMotorBase.com",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Electric Motor Repair Shops Directory | IQMotorBase.com",
    description:
      "Browse electric motor repair shops across the USA. Search by city, state, or ZIP and request quotes.",
  },
  alternates: { canonical: LISTINGS_DIRECTORY_PATH },
  robots: { index: true, follow: true },
};

export default function ListingsDirectoryLayout({ children }) {
  return children;
}
