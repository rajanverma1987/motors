import { redirect } from "next/navigation";

export const metadata = {
  title: "Features – MotorsWinding.com",
  description: "Motor repair workflow, center management, and lead generation for repair centers.",
};

export default function FeaturesPage() {
  redirect("/#features");
}
