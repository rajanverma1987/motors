"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiBookmark, FiUser } from "react-icons/fi";
import { LuCalculator } from "react-icons/lu";
import { IqwireAuthProvider, useIqwireAuth } from "./auth-context";
import AuthScreens from "./auth-screens";
import CalculatorScreen from "./calculator";
import SavedScreen from "./saved";
import ProfileScreen from "./profile";
import PaywallOverlay from "./paywall";
import InstallBanner from "./install-banner";

const TABS = [
  { id: "calc", label: "Calculate", icon: LuCalculator },
  { id: "saved", label: "Saved", icon: FiBookmark },
  { id: "profile", label: "Profile", icon: FiUser },
];

function PaypalReturnSync() {
  const searchParams = useSearchParams();
  const { refreshAccount, isLoggedIn } = useIqwireAuth();
  useEffect(() => {
    const paypal = String(searchParams.get("paypal") || "");
    if (!isLoggedIn) return;
    if (paypal === "success") refreshAccount().catch(() => {});
  }, [searchParams, isLoggedIn, refreshAccount]);
  return null;
}

function AppShell() {
  const { loading, isLoggedIn } = useIqwireAuth();
  const [tab, setTab] = useState("calc");
  const [pendingSaved, setPendingSaved] = useState(null);

  const openSaved = useCallback((item) => {
    setPendingSaved(item);
    setTab("calc");
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg">
        <p className="text-sm text-secondary">Loading IQWireCalculator…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-bg shadow-sm sm:border-x sm:border-border">
        <InstallBanner />
        <AuthScreens />
      </div>
    );
  }

  const title = tab === "saved" ? "Saved" : tab === "profile" ? "Profile" : "CM Best Match";

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-bg shadow-sm sm:border-x sm:border-border">
      <InstallBanner />
      <header className="border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">IQWireCalculator</p>
        <h1 className="mt-0.5 text-lg font-extrabold text-title">{title}</h1>
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={tab === "calc" ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
          <CalculatorScreen pendingSaved={pendingSaved} onConsumedSaved={() => setPendingSaved(null)} />
        </div>
        <div className={tab === "saved" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
          <SavedScreen onOpenItem={openSaved} />
        </div>
        <div className={tab === "profile" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
          <ProfileScreen />
        </div>
        {tab !== "profile" ? <PaywallOverlay /> : null}
      </main>
      <nav className="border-t border-border bg-card pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-3">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex w-full flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                    active ? "text-primary" : "text-secondary"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default function IqwireApp() {
  return (
    <IqwireAuthProvider>
      <Suspense fallback={null}>
        <PaypalReturnSync />
      </Suspense>
      <AppShell />
    </IqwireAuthProvider>
  );
}
