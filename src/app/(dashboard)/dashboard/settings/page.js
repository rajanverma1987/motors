import CrmPlaceholder from "@/components/dashboard/crm-placeholder";

export const metadata = {
  title: "Settings",
  description: "Shop and CRM settings.",
};

export default function SettingsPage() {
  return (
    <CrmPlaceholder
      title="Settings"
      description="Shop settings. Configure work order status dropdown (add, edit, reorder statuses). Job board public URL. Other preferences."
    />
  );
}
