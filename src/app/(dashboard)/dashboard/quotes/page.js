import { redirect } from "next/navigation";

/** Legacy route — RFQ and quotes list live at /dashboard/rfq */
export default function DashboardQuotesRedirect({ searchParams }) {
  const q = new URLSearchParams();
  if (searchParams && typeof searchParams === "object") {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        value.forEach((v) => q.append(key, String(v)));
      } else {
        q.set(key, String(value));
      }
    }
  }
  const qs = q.toString();
  redirect(qs ? `/dashboard/rfq?${qs}` : "/dashboard/rfq");
}
