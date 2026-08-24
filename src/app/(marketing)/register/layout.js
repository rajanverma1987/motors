import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/register",
  title: "Register your shop",
  description: "Create your IQMotorBase.com center account.",
  index: false,
  follow: false,
});

export default function RegisterLayout({ children }) {
  return children;
}
