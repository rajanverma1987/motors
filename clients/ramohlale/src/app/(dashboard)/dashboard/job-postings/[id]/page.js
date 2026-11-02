import JobPostingDetailClient from "./job-posting-detail-client";

export const metadata = {
  title: "Applicants",
  description: "Review candidates for this posting.",
};

export default function DashboardJobPostingDetailPage() {
  return <JobPostingDetailClient />;
}
