import { redirect } from "next/navigation";

export const metadata = {
  title: "Motor tag",
  description: "Motor tag QR is printed from work orders.",
};

export default function MotorTagPage() {
  redirect("/dashboard/work-orders");
}
