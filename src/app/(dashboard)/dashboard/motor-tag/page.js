import { redirect } from "next/navigation";

export const metadata = {
  title: "Motor tag",
  description: "Print motor tag QR from a quote.",
};

/** Motor tag QR is printed from Quotes (modal toolbar). */
export default function MotorTagPage() {
  redirect("/dashboard/quotes");
}
