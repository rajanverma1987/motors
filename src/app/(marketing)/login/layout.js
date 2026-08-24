import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/login",
  title: "Log in",
  description: "Log in to your IQMotorBase.com center portal.",
  index: false,
  follow: false,
});

export default function LoginLayout({ children }) {
  return children;
}
