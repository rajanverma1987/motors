import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Shop floor job board",
  description: "Visual board of work orders by stage.",
};

export default function JobBoardPage() {
  return (
    <CrmPlaceholder
      title="Shop floor job board"
      description="Visual board by status. Generate unique URL for big screen (no login). Updates when technician scans motor tag and changes status."
    />
  );
}
