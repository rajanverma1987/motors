import { redirect } from "next/navigation";

export const metadata = {
  title: "Calculators",
  description: "Quick shop calculators — power, FLA, speed, torque, belts, and bench electrical.",
};

/** Classic route — calculators live on Simple `/dashboards?tab=calculators`. */
export default function CalculatorsPage() {
  redirect("/dashboards?tab=calculators");
}
