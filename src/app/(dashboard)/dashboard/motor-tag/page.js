import { redirect } from "next/navigation";

export const metadata = {
  title: "Motor tag",
  description: "Print motor tag QR from Job Write-Up (repair job quotes).",
};

/** Motor tag QR is printed from Job Write-Up → job → Quotes table (QR action). */
export default function MotorTagPage() {
  redirect("/dashboard/repair-flow");
}
