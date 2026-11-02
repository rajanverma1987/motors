"use client";

import { createContext, useCallback, useContext, useState } from "react";
import TrialSubscriptionUpgradeModal from "@/components/dashboard/trial-subscription-upgrade-modal";

const TrialUpgradeContext = createContext(null);

export function TrialUpgradeProvider({ children }) {
  const [open, setOpen] = useState(false);
  const showTrialUpgradeModal = useCallback(() => setOpen(true), []);
  const closeTrialUpgradeModal = useCallback(() => setOpen(false), []);

  return (
    <TrialUpgradeContext.Provider value={{ showTrialUpgradeModal }}>
      {children}
      <TrialSubscriptionUpgradeModal open={open} onClose={closeTrialUpgradeModal} />
    </TrialUpgradeContext.Provider>
  );
}

export function useTrialUpgrade() {
  const ctx = useContext(TrialUpgradeContext);
  if (!ctx) {
    return { showTrialUpgradeModal: () => {} };
  }
  return ctx;
}
