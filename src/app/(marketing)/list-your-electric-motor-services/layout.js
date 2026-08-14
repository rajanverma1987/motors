import { marketingPageMetadata } from "@/lib/marketing-page-metadata";

export const metadata = marketingPageMetadata({
  path: "/list-your-electric-motor-services",
  title: "List Your Electric Motor Services",
  description:
    "Add your motor repair center to the IQMotorBase.com directory. One month free trial. Verify your email to get started.",
});

export default function ListYourCenterLayout({ children }) {
  return children;
}
