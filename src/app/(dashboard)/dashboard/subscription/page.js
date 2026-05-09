import SubscriptionPageClient from "./subscription-page-client";

export const metadata = {
  title: "Subscription",
  description: "Your IQMotorBase subscription and billing status.",
};

export default function SubscriptionPage() {
  return <SubscriptionPageClient />;
}
