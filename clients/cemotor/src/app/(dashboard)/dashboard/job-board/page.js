import { redirect } from "next/navigation";

export const metadata = {
  title: "Shop floor job board",
  description: "Jobs by status.",
};

/** Classic path → Simple Settings shop floor board. */
export default function JobBoardPage() {
  redirect("/dashboards/settings?section=job-board");
}
