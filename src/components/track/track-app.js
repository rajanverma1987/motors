"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiCpu, FiUser } from "react-icons/fi";
import { TrackAuthProvider, useTrackAuth } from "./auth-context";
import TrackAuthScreens from "./auth-screens";
import TrackInstallBanner from "./install-banner";
import TrackMotorsScreen from "./motors-screen";
import TrackProfileScreen from "./profile-screen";

const TABS = [
  { id: "motors", label: "Motors", icon: FiCpu },
  { id: "profile", label: "Profile", icon: FiUser },
];

function PaypalReturnSync() {
  const searchParams = useSearchParams();
  const { refreshSession, isLoggedIn } = useTrackAuth();
  useEffect(() => {
    const paypal = String(searchParams.get("paypal") || "");
    if (!isLoggedIn) return;
    if (paypal === "success") refreshSession().catch(() => {});
  }, [searchParams, isLoggedIn, refreshSession]);
  return null;
}

function AppShell() {
  const { loading, isLoggedIn } = useTrackAuth();
  const [tab, setTab] = useState("motors");

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-bg">
        <p className="text-sm text-secondary">Loading IQMotorTrack…</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col bg-bg shadow-sm sm:border-x sm:border-border">
        <TrackInstallBanner />
        <TrackAuthScreens />
      </div>
    );
  }

  const title = tab === "profile" ? "Profile" : "Motor register";

  return (
    <div className="relative mx-auto flex h-[100dvh] max-w-md flex-col overflow-hidden bg-bg shadow-sm sm:border-x sm:border-border">
      <TrackInstallBanner />
      <header className="border-b border-border bg-card px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">IQMotorTrack</p>
        <h1 className="mt-0.5 text-lg font-extrabold text-title">{title}</h1>
      </header>
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={tab === "motors" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
          <TrackMotorsScreen />
        </div>
        <div className={tab === "profile" ? "min-h-0 flex-1 overflow-y-auto" : "hidden"}>
          <TrackProfileScreen />
        </div>
      </main>
      <nav className="border-t border-border bg-card pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1">
        <ul className="grid grid-cols-2">
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

export default function TrackApp() {
  return (
    <TrackAuthProvider>
      <Suspense fallback={null}>
        <PaypalReturnSync />
      </Suspense>
      <AppShell />
    </TrackAuthProvider>
  );
}
