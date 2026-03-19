import IntegrationsPageClient from "./integrations-page-client";

export const metadata = {
  title: "API Integrations",
  description: "Manage client API keys, webhooks, and public integration docs.",
};

export default function IntegrationsPage() {
  return <IntegrationsPageClient />;
}
