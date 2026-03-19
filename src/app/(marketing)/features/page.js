import { redirect } from "next/navigation";

export const metadata = {
  title: "Features – MotorsWinding.com",
  description:
    "Motor repair workflow, center management, lead generation, and public marketplace listings (parts, motors, tools)—all in one platform for repair centers.",
};

export default function FeaturesPage() {
  redirect("/#features");
}
