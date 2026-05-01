import { redirect } from "next/navigation";

export const metadata = {
  title: "Motor tag",
  description: "Motor tag QR opens from Job Write-Up.",
};

/** Motor tag QR is printed from Job Write-Up → job → Quotes table (QR action). */
export default function MotorTagPage() {
  redirect("/dashboard/repair-flow");
}
