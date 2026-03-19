import { redirect } from "next/navigation";

export const metadata = {
  title: "Features – MotorsWinding.com",
  description:
    "Motor repair workflow, shop parts inventory (on-hand, reserved, locations, low-stock), quotes and vendor POs, center management, lead generation, and public marketplace listings—all in one platform for repair centers.",
};

export default function FeaturesPage() {
  redirect("/#features");
}
