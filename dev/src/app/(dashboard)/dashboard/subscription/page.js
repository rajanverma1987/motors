import SubscriptionPageClient from "./subscription-page-client";

export const metadata = {
  title: "Subscription",
  description: "Your 3PhaseFlow subscription and billing status.",
};

export default function SubscriptionPage() {
  return <SubscriptionPageClient />;
}
