"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import {
  TRIAL_MAX_CUSTOMERS,
  TRIAL_UPGRADE_BODY,
  TRIAL_UPGRADE_CONTACT_LABEL,
  TRIAL_UPGRADE_TITLE,
} from "@/lib/trial-subscription-messages";

export default function TrialSubscriptionUpgradeModal({ open, onClose }) {
  const router = useRouter();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={TRIAL_UPGRADE_TITLE}
      size="md"
      actions={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="inline-flex shrink-0 items-center gap-1.5"
            onClick={() => {
              onClose();
              router.push("/contact");
            }}
          >
            {TRIAL_UPGRADE_CONTACT_LABEL}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-secondary">
        <p>{TRIAL_UPGRADE_BODY}</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="text-title">Trial limit:</span> up to {TRIAL_MAX_CUSTOMERS} saved customers
          </li>
          <li>
            <span className="text-title">Upgrade:</span> unlimited customers and continued full CRM access
          </li>
        </ul>
        <p>
          Reach out through our{" "}
          <Link href="/contact" className="font-medium text-primary hover:underline">
            contact page
          </Link>{" "}
          and we&apos;ll help you move to a paid plan that fits your shop.
        </p>
      </div>
    </Modal>
  );
}
