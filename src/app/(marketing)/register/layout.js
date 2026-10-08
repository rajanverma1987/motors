import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/register",
  title: "Contact us",
  description: "Contact IQMotorBase.com to get your center account.",
  index: false,
  follow: false,
});

export default function RegisterLayout({ children }) {
  return children;
}
