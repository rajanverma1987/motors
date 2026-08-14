import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/register",
  title: "Register your center",
  description: "Create your IQMotorBase.com center account.",
  index: false,
});

export default function RegisterLayout({ children }) {
  return children;
}
